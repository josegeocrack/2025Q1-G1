import json
import boto3
from botocore.exceptions import ClientError
from decimal import Decimal
import os
import uuid
from datetime import datetime,timedelta

def lambda_handler(event, context):
    dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
    table = dynamodb.Table('ClubData')

    try:
        # Obtener datos del evento
        body = json.loads(event['body'])
        nombre_clase = body['nombre_clase']
        fecha = body['fecha']
        hora = body['hora']
        
        # ✅ OBTENER user_id DESDE COGNITO (método seguro)
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
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'error': 'Usuario no autenticado'
                })
            }
        
        print(f"🔍 DEBUG - Inscripción solicitada:")
        print(f"   Usuario: {user_id}")
        print(f"   Clase: {nombre_clase}")
        print(f"   Fecha: {fecha}")
        print(f"   Hora: {hora}")

        # 1. Buscar la clase
        clase_sk = f'CLASE#{nombre_clase}#{fecha}#{hora}'
        print(f"🔍 DEBUG - Buscando clase con SK: {clase_sk}")
        
        response = table.get_item(
            Key={
                'PK': 'CLASE',
                'SK': clase_sk
            }
        )
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'error': 'Clase no encontrada'
                })
            }
        
        clase = response['Item']
        print(f"🔍 DEBUG - Clase encontrada. Cupo disponible: {clase.get('cupoDisponible', 0)}")

        try:
            utc_now = datetime.utcnow()
            argentina_now = utc_now - timedelta(hours=3)  # Argentina = UTC-3
            
            class_datetime = datetime.strptime(f"{fecha} {hora}", "%Y-%m-%d %H:%M")
            
            print(f"🕐 Hora actual Argentina: {argentina_now.strftime('%Y-%m-%d %H:%M')}")
            print(f"🎯 Hora de clase: {class_datetime.strftime('%Y-%m-%d %H:%M')}")
            print(f"🔍 Fecha actual Argentina: {argentina_now.date()}")
            print(f"🔍 Fecha de clase: {class_datetime.date()}")
            
            if class_datetime <= argentina_now:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json'
                    },
                    'body': json.dumps({
                        'error': f'No puedes inscribirte a una clase que ya pasó. Hora actual Argentina: {argentina_now.strftime("%Y-%m-%d %H:%M")}, clase: {class_datetime.strftime("%Y-%m-%d %H:%M")}',
                        'error_type': 'past_time',
                        'current_time_argentina': argentina_now.strftime("%Y-%m-%d %H:%M"),
                        'class_time': class_datetime.strftime("%Y-%m-%d %H:%M")
                    })
                }
            
            print("✅ Clase en horario válido")
            
        except Exception as time_error:
            print(f"⚠️ Error validando tiempo de clase: {str(time_error)}")

        # 2. Verificar cupo disponible
        if clase.get('cupoDisponible', 0) <= 0:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'error': 'No hay cupo disponible para esta clase'
                })
            }
        inscripcion_id = str(uuid.uuid4())
        # 3. Verificar si el usuario ya está inscrito
        inscripcion_usuario_sk = f'USUARIO#{user_id}#CLASE#{nombre_clase}#{clase["clase_id"]}#{inscripcion_id}'
        response_check = table.get_item(
            Key={
                'PK': 'INSCRIPCION',
                'SK': inscripcion_usuario_sk
            }
        )

        # ✅ SOLO BLOQUEAR SI EXISTE Y ESTÁ ACTIVA
        if 'Item' in response_check and response_check['Item'].get('estado') == 'activo':
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'error': 'Ya estás inscrito en esta clase'
                })
            }

        # *** ✅ NUEVA VALIDACIÓN: VERIFICAR CONFLICTOS DE HORARIO DEL USUARIO ***
        print(f"🔍 Verificando conflictos de horario para usuario {user_id} en {fecha} a las {hora}")
        
        # Buscar reservas del usuario en esa fecha/hora
        from boto3.dynamodb.conditions import Key, Attr
        
        reservas_response = table.query(
            KeyConditionExpression=Key('PK').eq('RESERVA') & Key('SK').begins_with(f'USUARIO#{user_id}#'),
            FilterExpression=Attr('fecha').eq(fecha) & 
                            Attr('hora').eq(hora) & 
                            Attr('estado').eq('activo')
        )
        
        if reservas_response.get('Items'):
            conflicting_reserva = reservas_response['Items'][0]
            print(f"❌ CONFLICTO DE RESERVA - Usuario ya tiene reserva en {conflicting_reserva.get('instalacion')} a las {hora}")
            return {
                'statusCode': 409,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'error': f'Ya tienes una reserva en {conflicting_reserva.get("instalacion")} el {fecha} a las {hora}. No puedes inscribirte en una clase al mismo tiempo.',
                    'conflict_type': 'reservation',
                    'conflict_details': {
                        'existing_facility': conflicting_reserva.get('instalacion'),
                        'date': fecha,
                        'time': hora
                    }
                })
            }
        
        # Buscar otras inscripciones del usuario en esa fecha/hora
        inscripciones_response = table.query(
            KeyConditionExpression=Key('PK').eq('INSCRIPCION') & Key('SK').begins_with(f'USUARIO#{user_id}#'),
            FilterExpression=Attr('fecha').eq(fecha) & 
                            Attr('hora').eq(hora) & 
                            Attr('estado').eq('activo')
        )
        
        if inscripciones_response.get('Items'):
            conflicting_class = inscripciones_response['Items'][0]
            print(f"❌ CONFLICTO DE CLASE - Usuario ya tiene clase {conflicting_class.get('nombre_clase')} a las {hora}")
            return {
                'statusCode': 409,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'error': f'Ya tienes inscripción en la clase "{conflicting_class.get("nombre_clase")}" el {fecha} a las {hora}. No puedes inscribirte en dos clases al mismo tiempo.',
                    'conflict_type': 'class',
                    'conflict_details': {
                        'existing_class': conflicting_class.get('nombre_clase'),
                        'date': fecha,
                        'time': hora
                    }
                })
            }
        
        print("✅ No hay conflictos de horario - procediendo con la inscripción")
        
        try:
            # Convertir fecha a formato YYYY-MM-DD
            fecha = datetime.strptime(fecha, '%Y-%m-%d').date().isoformat()
            response = table.query(
            IndexName='user_id-fecha-index',  # Usá el índice adecuado si lo tenés
            KeyConditionExpression=Key('user_id').eq(user_id) & Key('fecha').eq(fecha),
            FilterExpression=Attr('type').eq('INSCRIPCION_USUARIO') & Attr('estado').eq('activo')
            )

            if response['Items']:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json'
                    },
                    'body': json.dumps({
                        'success': False,
                        'message': 'Ya tenés una inscripcion para este día.'
                    })
                }
        except ValueError as ve:
            print(f"⚠️ Error al convertir fecha: {str(ve)}")
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'error': f'Formato de fecha inválido: {str(ve)}'
                })
            }    
        

        # 4. Realizar la inscripción (transacción)
        try:
            # Actualizar cupo disponible
            table.update_item(
                Key={
                    'PK': 'CLASE',
                    'SK': clase_sk
                },
                UpdateExpression='SET cupoDisponible = cupoDisponible - :decrement',
                ExpressionAttributeValues={
                    ':decrement': 1,
                    ':min_cupo': 0
                },
                ConditionExpression='cupoDisponible > :min_cupo'
            )
            
            # Crear registro de inscripción del usuario
            inscripcion_usuario = {
                'PK': 'INSCRIPCION',
                'SK': inscripcion_usuario_sk,
                'user_id': user_id,
                'user_email': user_email,
                'clase_id': clase['clase_id'],
                'nombre_clase': nombre_clase,
                'fecha': fecha,
                'hora': hora,
                'instructor': clase.get('instructor', ''),
                'estado': 'activo',
                'created_at': datetime.now().isoformat(),
                'type': 'INSCRIPCION_USUARIO'  # Actualizar cupo disponible
            }
            table.put_item(Item=inscripcion_usuario)
            
            # Crear registro de inscripción de la clase
            inscripcion_clase_sk = f'CLASE#{nombre_clase}#{clase["clase_id"]}#USUARIO#{user_id}#{inscripcion_id}'
            inscripcion_clase = {
                'PK': 'INSCRIPCION',
                'SK': inscripcion_clase_sk,
                'user_id': user_id,
                'user_email': user_email,
                'clase_id': clase['clase_id'],
                'nombre_clase': nombre_clase,
                'fecha': fecha,
                'hora': hora,
                'instructor': clase.get('instructor', ''),
                'estado': 'activo',
                'created_at': datetime.now().isoformat(),
                'type': 'INSCRIPCION_CLASE'  
            }
            table.put_item(Item=inscripcion_clase)
            
            print(f"✅ Inscripción exitosa - Usuario: {user_id}, Clase: {nombre_clase}")
            
            inscripcion_data = {
                'error': False,
                'type': 'inscripcion',
                'inscripcion_id': clase['clase_id'],
                'clase': nombre_clase,
                'date': fecha, 
                'time': hora,
                'user_email': user_email,
                'user_id': user_id,
                'created_at': datetime.now().isoformat(),
                }
            # *** PASO 3: ENVIAR A SQS CON TIMEOUT ESPECÍFICO ***
            try:
                print("📨 Enviando mensaje a SQS para recordatorios...")
                print(f"🔍 SQS_QUEUE_URL: {os.environ.get('SQS_QUEUE_URL')}")
                
                # Cliente SQS con timeout específico
                sqs = boto3.client(
                    'sqs', 
                    region_name='us-east-1',
                    config=boto3.session.Config(
                        connect_timeout=10,  # 10 segundos para conectar
                        read_timeout=10      # 10 segundos para leer
                    )
                )
                
                print("🔗 Cliente SQS creado, enviando mensaje...")
                response = sqs.send_message(
                    QueueUrl=os.environ.get('SQS_QUEUE_URL'),
                    MessageBody=json.dumps(inscripcion_data)
                )
                print(f"✅ Mensaje enviado a SQS exitosamente: {response}")
                
            except Exception as sqs_error:
                # Log el error pero NO fallar la reserva
                print(f"⚠️ Error enviando a SQS (reserva sigue válida): {str(sqs_error)}")
                print(f"🔍 Tipo de error: {type(sqs_error).__name__}")
                import traceback
                print(f"🔍 Traceback: {traceback.format_exc()}")

            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'message': f'✅ Te has inscrito exitosamente a {nombre_clase}',
                    'clase': {
                        'nombre': nombre_clase,
                        'fecha': fecha,
                        'hora': hora,
                        'instructor': clase.get('instructor', ''),
                    'cupo_restante': int(clase.get('cupoDisponible', 0)) - 1  
                    },
                    'inscripcion': {
                        'inscripcion_id': inscripcion_usuario_sk,
                        'fecha_inscripcion': datetime.now().isoformat()
                    }
                })
            }
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
                return {
                    'statusCode': 400,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json'
                    },
                    'body': json.dumps({
                        'error': 'No hay cupo disponible (clase llena)'
                    })
                }
            else:
                raise e
                
    except Exception as e:
        print(f"❌ Error en inscripción: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'error': f'Error interno: {str(e)}'
            })
        }