import json
import boto3
import os
from datetime import datetime, timedelta
from decimal import Decimal

# Inicializar el cliente de DynamoDB
dynamodb = boto3.resource('dynamodb')
table_name = os.environ.get('DYNAMODB_TABLE_NAME', 'ClubData')
table = dynamodb.Table(table_name)

def lambda_handler(event, context):
    try:
        # Headers CORS
        headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'POST, OPTIONS'
        }
        
        print(f"Event received: {json.dumps(event)}")
        
        # Manejar preflight OPTIONS request
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'message': 'CORS preflight'})
            }
        
        # Obtener información del usuario desde Cognito
        user_email = None
        user_id = None
        
        if 'requestContext' in event and 'authorizer' in event['requestContext']:
            claims = event['requestContext']['authorizer'].get('claims', {})
            user_email = claims.get('email')
            user_id = claims.get('sub')
            print(f"Usuario autenticado: {user_email}, ID: {user_id}")
        
            if not user_id or not user_email:
                return {
                    'statusCode': 401,
                    'headers': headers,
                    'body': json.dumps({
                        'error': 'Authentication required'
                    })
                }

            # Parsear el body del request
            print(f"🔍 DEBUG - Full event: {json.dumps(event)}")
            print(f"🔍 DEBUG - Event body: {event.get('body')}")
            print(f"🔍 DEBUG - Event body type: {type(event.get('body'))}")

            body = json.loads(event.get('body', '{}'))
            print(f"🔍 DEBUG - Parsed body: {body}")
            print(f"🔍 DEBUG - Body keys: {list(body.keys()) if body else 'No keys'}")

            inscripcion_id = body.get('inscripcion_id')
            print(f"🔍 DEBUG - inscription_id found: {inscripcion_id}")
            print(f"🔍 DEBUG - inscription_id type: {type(inscripcion_id)}")

            if not inscripcion_id:
                print(f"❌ DEBUG - No inscription_id found in body: {body}")
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({
                        'error': 'Missing inscripcion_id parameter',
                        'debug': {
                            'received_body': str(event.get('body')),
                            'parsed_body': body,
                            'body_keys': list(body.keys()) if body else []
                        }
                    })
                }
        
        print(f"🔍 Attempting to cancel inscription: {inscripcion_id}")
        
        # Parsear el inscription_id: INSCRIPCION#USUARIO#{user_id}#CLASE#{nombre_clase}#{clase_id}
        inscription_parts = inscripcion_id.split('#')
        if len(inscription_parts) < 6:  
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'error': 'Invalid inscripcion_id format'
                })
            }

        # Extraer información
        inscription_user_id = inscription_parts[2]
        nombre_clase = inscription_parts[4]        
        clase_id = inscription_parts[5] 
        inscripcion_clase_id = inscription_parts[6] 
        
        # Verificar que el usuario puede cancelar esta inscripción
        if inscription_user_id != user_id:
            return {
                'statusCode': 403,
                'headers': headers,
                'body': json.dumps({
                    'error': 'You can only cancel your own inscriptions'
                })
            }
        
        # Buscar la inscripción específica
        usuario_pk = 'INSCRIPCION'
        usuario_sk = f'USUARIO#{user_id}#CLASE#{nombre_clase}#{clase_id}#{inscripcion_clase_id}'
        
        print(f"🔍 Looking for inscription: PK={usuario_pk}, SK={usuario_sk}")
        
        try:
            user_inscription_response = table.get_item(
                Key={
                    'PK': usuario_pk,
                    'SK': usuario_sk
                }
            )
            
            user_inscription = user_inscription_response.get('Item')
            
            if not user_inscription:
                return {
                    'statusCode': 404,
                    'headers': headers,
                    'body': json.dumps({
                        'error': 'Inscription not found or already cancelled'
                    })
                }
            
            if user_inscription.get('estado') == 'cancelado':
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({
                        'error': 'Inscription is already cancelled'
                    })
                }
            
            # Verificar la regla de 24 horas
            inscription_date = user_inscription.get('fecha')
            inscription_time = user_inscription.get('hora')
            
            if not can_cancel_inscription(inscription_date, inscription_time):
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({
                        'error': 'Cannot cancel inscription less than 24 hours before the class'
                    })
                }
            
            # Buscar la clase para devolver el cupo
            clase_pk = 'CLASE'
            clase_sk = f'CLASE#{nombre_clase}#{inscription_date}#{inscription_time}'
            
            print(f"🔍 Looking for class: PK={clase_pk}, SK={clase_sk}")
            
            class_response = table.get_item(
                Key={
                    'PK': clase_pk,
                    'SK': clase_sk
                }
            )
            
            clase_item = class_response.get('Item')
            if not clase_item:
                return {
                    'statusCode': 404,
                    'headers': headers,
                    'body': json.dumps({
                        'error': 'Class not found'
                    })
                }
            
            # Preparar las transacciones
            current_timestamp = datetime.utcnow().isoformat()
            
            # Transacción para cancelar inscripción y devolver cupo
            with table.batch_writer() as batch:
                # 1. Marcar inscripción como cancelada
                table.update_item(
                    Key={
                        'PK': usuario_pk,
                        'SK': usuario_sk
                    },
                    UpdateExpression='SET #estado = :estado, cancelled_at = :timestamp',
                    ExpressionAttributeNames={
                        '#estado': 'estado'
                    },
                    ExpressionAttributeValues={
                        ':estado': 'cancelado',
                        ':timestamp': current_timestamp
                    }
                )
                
                inscripcion_clase_sk = f'CLASE#{nombre_clase}#{clase_id}#USUARIO#{user_id}#{inscripcion_clase_id}'
                table.update_item(
                    Key={
                        'PK': 'INSCRIPCION',
                        'SK': inscripcion_clase_sk
                    },
                    UpdateExpression='SET #estado = :estado, cancelled_at = :timestamp',
                    ExpressionAttributeNames={
                        '#estado': 'estado'
                    },
                    ExpressionAttributeValues={
                        ':estado': 'cancelado',
                        ':timestamp': current_timestamp
                    }
                )
                print(f"✅ También cancelado registro bidireccional: {inscripcion_clase_sk}")

                # 2. Devolver cupo a la clase
                current_cupo = int(clase_item.get('cupoDisponible', 0))
                new_cupo = current_cupo + 1
                
                table.update_item(
                    Key={
                        'PK': clase_pk,
                        'SK': clase_sk
                    },
                    UpdateExpression='SET cupoDisponible = :new_cupo',
                    ExpressionAttributeValues={
                        ':new_cupo': new_cupo
                    }
                )
                
                print(f"✅ Cupo devuelto: {current_cupo} → {new_cupo}")
            
            sqs = boto3.client('sqs')
            queue_url = os.environ['CANCEL_REMINDERS_QUEUE_URL']
            sqs.send_message(
                QueueUrl=queue_url,
                MessageBody=json.dumps({
                    "reservation_id": clase_id  # el UUID de la reserva
                })
            )


            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Inscription cancelled successfully',
                    'inscription_details': {
                        'clase': nombre_clase,
                        'fecha': inscription_date,
                        'hora': inscription_time,
                        'instructor': user_inscription.get('instructor', 'TBD')
                    },
                    'cupo_returned': True,
                    'new_available_spots': new_cupo
                })
            }
            
        except Exception as e:
            print(f"❌ Error during cancellation: {str(e)}")
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({
                    'error': 'Failed to cancel inscription',
                    'details': str(e)
                })
            }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'Internal server error',
                'details': str(e)
            })
        }

def can_cancel_inscription(date_str, time_str):
    """
    Verificar si se puede cancelar la inscripción (>24 horas antes)
    """
    try:
        if not date_str or not time_str:
            return False
        
        # Parsear fecha y hora de la clase
        class_datetime_str = f"{date_str} {time_str}"
        class_datetime = datetime.strptime(class_datetime_str, "%Y-%m-%d %H:%M")
        
        # Calcular 24 horas antes
        cutoff_time = class_datetime - timedelta(hours=21)
        current_time = datetime.utcnow()
        
        print(f"🕒 Class time: {class_datetime}")
        print(f"🕒 Cutoff time: {cutoff_time}")  
        print(f"🕒 Current time: {current_time}")
        print(f"🕒 Can cancel: {current_time < cutoff_time}")
        
        return current_time < cutoff_time
        
    except Exception as e:
        print(f"Error checking cancellation time: {str(e)}")
        return False