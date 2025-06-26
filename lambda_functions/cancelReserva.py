import json
import boto3
import os
from datetime import datetime, timedelta, timezone

# Inicializar el cliente de DynamoDB
dynamodb = boto3.resource('dynamodb')
table_name = os.environ.get('DYNAMODB_TABLE_NAME', 'ClubData')
table = dynamodb.Table(table_name)

def lambda_handler(event, context):
    try:
        # Configurar headers CORS
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
        user_id = None
        user_email = None
        if 'requestContext' in event and 'authorizer' in event['requestContext']:
            claims = event['requestContext']['authorizer'].get('claims', {})
            user_id = claims.get('sub')
            user_email = claims.get('email')
            print(f"Usuario autenticado - ID: {user_id}, Email: {user_email}")
        
        if not user_id:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({
                    'error': 'Usuario no autenticado'
                })
            }

        # Parsear el body del request
        body = json.loads(event.get('body', '{}'))
        reservation_id = body.get('reservation_id')  # Formato: "USUARIO#{user_id}#RESERVA#{date}#{time}#INSTALACION#{facility}"
        
        if not reservation_id:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'error': 'Missing reservation_id parameter'
                })
            }

        # Parsear reservation_id para extraer información
# Parsear reservation_id para extraer información
        try:
            print(f"🔍 DEBUG - Raw reservation_id: '{reservation_id}'")
            
            # Ahora reservation_id es simplemente el UUID de la reserva
            # Necesitamos buscar la reserva por este ID
            
            # Buscar la reserva del usuario usando el reservation_id
            from boto3.dynamodb.conditions import Key, Attr
            
            response = table.query(
                KeyConditionExpression=Key('PK').eq('RESERVA') & Key('SK').begins_with(f'USUARIO#{user_id}#'),
                FilterExpression=Attr('reserva_id').eq(reservation_id)
            )
            
            if not response.get('Items'):
                raise ValueError("Reservation not found")
            
            user_reservation = response['Items'][0]
            
            # Extraer información de la reserva encontrada
            reservation_user_id = user_reservation.get('user_id')
            reservation_date = user_reservation.get('fecha')
            reservation_time = user_reservation.get('hora')
            facility = user_reservation.get('instalacion')
            
            print(f"Found reservation - User: {reservation_user_id}, Date: {reservation_date}, Time: {reservation_time}, Facility: {facility}")
            
            print(f"🔍 DEBUG - Extracted facility: '{facility}'")
            print(f"Parsed reservation - User: {reservation_user_id}, Date: {reservation_date}, Time: {reservation_time}, Facility: {facility}")
            
        except Exception as e:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'error': 'Invalid reservation_id format',
                    'message': str(e)
                })
            }

        # Verificar que el usuario es el dueño de la reserva
        if reservation_user_id != user_id:
            return {
                'statusCode': 403,
                'headers': headers,
                'body': json.dumps({
                    'error': 'You can only cancel your own reservations'
                })
            }

        # Verificar regla de 24 horas
        try:
            # Combinar fecha y hora de la reserva
            reservation_datetime = datetime.strptime(f"{reservation_date} {reservation_time}", "%Y-%m-%d %H:%M")
            
            # Usar timezone UTC para consistencia
            reservation_datetime = reservation_datetime.replace(tzinfo=timezone.utc)
            current_datetime = datetime.now(timezone.utc)
            
            # Calcular diferencia
            time_until_reservation = reservation_datetime - current_datetime
            hours_until_reservation = time_until_reservation.total_seconds() / 3600
            
            print(f"Hours until reservation: {hours_until_reservation}")
            
            if hours_until_reservation < 27:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({
                        'error': 'Cannot cancel reservation less than 24 hours before the scheduled time',
                        'hours_remaining': round(hours_until_reservation, 1)
                    })
                }
                
        except Exception as e:
            print(f"Error checking 24-hour rule: {e}")
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'error': 'Invalid date/time format in reservation',
                    'message': str(e)
                })
            }

        # Buscar y cancelar la reserva del usuario
        print(f"🔍 DEBUG - Found reservation: {user_reservation}")

        if not user_reservation:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({
                    'error': 'Reservation not found. It may have already been cancelled.'
                })
            }

        if user_reservation.get('estado') == 'cancelado':
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'error': 'Reservation is already cancelled'
                })
            }
        # Cancelar la reserva (actualizar estado en ambos registros)
        current_timestamp = datetime.utcnow().isoformat()
        
        try:
            # 1. Actualizar registro del usuario (vista usuario)
            facility_normalized = facility.replace(" ", "_").upper()
            usuario_sk = f'USUARIO#{user_id}#INSTALACION#{facility_normalized}#{reservation_id}'

            table.update_item(
                Key={
                    'PK': 'RESERVA',
                    'SK': usuario_sk
                },
                UpdateExpression='SET #estado = :cancelled, cancelled_at = :timestamp',
                ExpressionAttributeNames={
                    '#estado': 'estado'
                },
                ExpressionAttributeValues={
                    ':cancelled': 'cancelado',
                    ':timestamp': current_timestamp
                }
            )

            # 2. Actualizar registro de instalación (vista instalación)
            instalacion_sk = f'INSTALACION#{facility_normalized}#USUARIO#{user_id}#{reservation_id}'

            table.update_item(
                Key={
                    'PK': 'RESERVA',
                    'SK': instalacion_sk
                },
                UpdateExpression='SET #estado = :cancelled, cancelled_at = :timestamp',
                ExpressionAttributeNames={
                    '#estado': 'estado'
                },
                ExpressionAttributeValues={
                    ':cancelled': 'cancelado',
                    ':timestamp': current_timestamp
                }
            )
            
            print(f"✅ Reservation cancelled successfully for user {user_id}")

            sqs = boto3.client('sqs')
            queue_url = os.environ['CANCEL_REMINDERS_QUEUE_URL']
            sqs.send_message(
                QueueUrl=queue_url,
                MessageBody=json.dumps({
                    "reservation_id": reservation_id  # el UUID de la reserva
                })
            )

            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Reservation cancelled successfully',
                    'reservation_details': {
                        'facility': format_facility_name(facility),
                        'date': reservation_date,
                        'time': reservation_time,
                        'cancelled_at': current_timestamp
                    }
                })
            }
            
        except Exception as e:
            print(f"Error cancelling reservation: {e}")
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({
                    'error': 'Error cancelling reservation',
                    'message': str(e)
                })
            }

    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({
                'error': 'Invalid JSON in request body'
            })
        }
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }

def format_facility_name(facility_code):
    """Convierte códigos de instalación a nombres legibles"""
    facility_map = {
        'GYM': 'Modern Gym',
        'POOL': 'Swimming Pool',
        'TENNIS': 'Tennis Court',
        'BASKETBALL': 'Basketball Court',
        'YOGA_ROOM': 'Yoga Room',
        'SQUASH': 'Squash Court'
    }
    return facility_map.get(facility_code, facility_code.replace('_', ' ').title())