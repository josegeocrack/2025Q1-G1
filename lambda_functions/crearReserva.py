import json
import boto3
import uuid
import os
from datetime import datetime, timedelta
from boto3.dynamodb.conditions import Key, Attr
from reminder_helper import create_reminders

def lambda_handler(event, context):
    # Headers CORS
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }

    # Manejar preflight OPTIONS
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({})
        }

    try:
        # *** DEBUGGING COMPLETO ***
        print(f"🔍 Event completo: {json.dumps(event, default=str)}")
        print(f"🔍 Request context: {event.get('requestContext', {})}")
        print(f"🔍 Authorizer info: {event.get('requestContext', {}).get('authorizer', {})}")
        print(f"🔍 Headers: {event.get('headers', {})}")
        
        # *** AUTENTICACIÓN OBLIGATORIA - SOLO COGNITO ***
        user_email = None
        user_id = None
        
        # DEBUGGING: Verificar diferentes ubicaciones del token
        request_context = event.get('requestContext', {})
        authorizer_info = request_context.get('authorizer', {})
        
        print(f"🔍 Authorizer keys: {list(authorizer_info.keys()) if authorizer_info else 'No authorizer'}")
        
        if 'requestContext' in event and 'authorizer' in event['requestContext']:
            claims = event['requestContext']['authorizer'].get('claims', {})
            print(f"🔍 Claims encontrados: {claims}")
            
            user_email = claims.get('email')
            user_id = claims.get('sub')  # Este es el USER_ID de Cognito
            print(f"🔍 Email extraído: {user_email}")
            print(f"🔍 User ID extraído: {user_id}")
            
            if user_email and user_id:
                print(f"✅ Usuario autenticado: {user_email}, ID: {user_id}")
            else:
                print(f"❌ Datos incompletos - Email: {user_email}, ID: {user_id}")
        else:
            print("❌ No se encontró requestContext.authorizer")
        
        # *** DEBUGGING ADICIONAL: Verificar otros lugares donde podría estar el token ***
        headers_received = event.get('headers', {})
        auth_header = headers_received.get('Authorization') or headers_received.get('authorization')
        print(f"🔍 Authorization header recibido: {auth_header[:50] if auth_header else 'No encontrado'}...")
        
        # *** FALLAR SI NO HAY AUTENTICACIÓN REAL ***
        if not user_id or not user_email:
            debug_response = {
                'success': False,
                'message': 'Authentication required - no valid Cognito token found',
                'debug_info': {
                    'event_keys': list(event.keys()),
                    'request_context_keys': list(request_context.keys()) if request_context else None,
                    'authorizer_keys': list(authorizer_info.keys()) if authorizer_info else None,
                    'authorizer_content': authorizer_info,
                    'claims': claims if 'claims' in locals() else None,
                    'headers': headers_received,
                    'auth_header_present': bool(auth_header),
                    'extracted_user_email': user_email,
                    'extracted_user_id': user_id
                }
            }
            print(f"🚨 Autenticación fallida: {json.dumps(debug_response, default=str)}")
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps(debug_response)
            }
        
        print(f"✅ Usuario autenticado correctamente: {user_email}, ID: {user_id}")
        
        # Parsear el body del request
        body = json.loads(event.get('body', '{}'))
        facility = body.get('facility')
        date = body.get('date')  # formato: 'YYYY-MM-DD'
        time = body.get('time')  # formato: 'HH:MM'

        # Validar parámetros requeridos
        if not all([facility, date, time]):
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'message': 'Missing required parameters: facility, date, time'
                })
            }

        # *** PASO 1: CREAR RESERVA RÁPIDAMENTE (1-5 segundos) ***
        reserva_data = crear_reserva_rapido(facility, date, time, user_id, user_email)
        
        if reserva_data.get('error'):
            # Si hay error (conflicto, etc.), devolver inmediatamente
            return {
                'statusCode': reserva_data['status_code'],
                'headers': headers,
                'body': json.dumps(reserva_data['response'])
            }
        
        # *** PASO 2: RESPONDER INMEDIATAMENTE AL USUARIO ***
        success_response = {
            'statusCode': 201,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'message': f'Reserva creada exitosamente para {facility} el {date} a las {time}',
                'reservation': {
                    'id': reserva_data['reservation_id'],
                    'facility': facility,
                    'date': date,
                    'time': time,
                    'user_email': user_email
                }
            })
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
                MessageBody=json.dumps(reserva_data)
            )
            print(f"✅ Mensaje enviado a SQS exitosamente: {response}")
            
        except Exception as sqs_error:
            # Log el error pero NO fallar la reserva
            print(f"⚠️ Error enviando a SQS (reserva sigue válida): {str(sqs_error)}")
            print(f"🔍 Tipo de error: {type(sqs_error).__name__}")
            import traceback
            print(f"🔍 Traceback: {traceback.format_exc()}")
        
        return success_response

    except Exception as e:
        print(f"💥 Error general en lambda: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'message': f'Internal server error: {str(e)}',
                'error': str(e)
            })
        }


def crear_reserva_rapido(facility, date, time, user_id, user_email):
    """
    Crea la reserva rápidamente sin recordatorios.
    Retorna los datos de la reserva o error si hay conflicto.
    """
    try:
        # Configurar DynamoDB
        dynamodb = boto3.resource('dynamodb')
        table_name = 'ClubData'
        table = dynamodb.Table(table_name)
        # Buscar si ya existe una reserva para ese usuario en esa fecha
        response = table.query(
            IndexName='user_id-fecha-index',  # Usá el índice adecuado si lo tenés
            KeyConditionExpression=Key('user_id').eq(user_id) & Key('fecha').eq(date),
            FilterExpression=Attr('type').eq('RESERVA_USUARIO') & Attr('estado').eq('activo')
        )
        if response['Items']:
            return {
                'error': True,
                'status_code': 400,
                'response': {
                    'success': False,
                    'message': 'Ya tenés una reserva para este día.'
                }
            }
    except Exception as e:
        print(f"💥 Error al verificar reservas existentes: {str(e)}")
        return {
            'error': True,
            'status_code': 500,
            'response': {
                'success': False,
                'message': f'Error checking existing reservations: {str(e)}',
                'error': str(e)
            }
        }
    try:
        # Configurar DynamoDB
        dynamodb = boto3.resource('dynamodb')
        table_name = 'ClubData'
        table = dynamodb.Table(table_name)
        
        # Crear las claves
        facility_normalized = facility.replace(" ", "_").upper()
        
        print(f"🔍 Verificando disponibilidad para {facility} en {date} a las {time}")

        # *** VERIFICAR CONFLICTOS DE INSTALACIÓN ***
        response = table.query(
            KeyConditionExpression=Key('PK').eq('RESERVA'),
            FilterExpression=Attr('fecha').eq(date) & 
                            Attr('hora').eq(time) & 
                            Attr('instalacion').eq(facility) &
                            Attr('estado').eq('activo')
        )
        
        if response.get('Items'):
            existing_items = response['Items']
            print(f"❌ CONFLICTO - Instalación no disponible: {existing_items}")
            return {
                'error': True,
                'status_code': 409,
                'response': {
                    'success': False,
                    'message': f'CONFLICT: Facility {facility} is not available on {date} at {time}',
                    'debug': {
                        'existing_reservations': existing_items,
                        'search_criteria': {
                            'facility': facility,
                            'date': date,
                            'time': time
                        }
                    }
                }
            }
        
        # *** VERIFICAR CONFLICTOS DE USUARIO - RESERVAS ***
        print(f"🔍 Verificando conflictos de horario para usuario {user_id}")
        
        reservas_response = table.query(
            KeyConditionExpression=Key('PK').eq('RESERVA') & Key('SK').begins_with(f'USUARIO#{user_id}#'),
            FilterExpression=Attr('fecha').eq(date) & 
                            Attr('hora').eq(time) & 
                            Attr('estado').eq('activo')
        )
        
        if reservas_response.get('Items'):
            conflicting_reserva = reservas_response['Items'][0]
            print(f"❌ CONFLICTO DE RESERVA - Usuario ya tiene reserva")
            return {
                'error': True,
                'status_code': 409,
                'response': {
                    'success': False,
                    'message': f'Ya tienes una reserva en {conflicting_reserva.get("instalacion")} el {date} a las {time}. No puedes reservar en dos lugares al mismo tiempo.',
                    'conflict_type': 'reservation',
                    'conflict_details': {
                        'existing_facility': conflicting_reserva.get('instalacion'),
                        'date': date,
                        'time': time
                    }
                }
            }
        
        # *** VERIFICAR CONFLICTOS DE USUARIO - CLASES ***
        inscripciones_response = table.query(
            KeyConditionExpression=Key('PK').eq('INSCRIPCION') & Key('SK').begins_with(f'USUARIO#{user_id}#'),
            FilterExpression=Attr('fecha').eq(date) & 
                            Attr('hora').eq(time) & 
                            Attr('estado').eq('activo')
        )
        
        if inscripciones_response.get('Items'):
            conflicting_class = inscripciones_response['Items'][0]
            print(f"❌ CONFLICTO DE CLASE - Usuario ya tiene clase")
            return {
                'error': True,
                'status_code': 409,
                'response': {
                    'success': False,
                    'message': f'Ya tienes inscripción en la clase "{conflicting_class.get("nombre_clase")}" el {date} a las {time}. No puedes reservar una instalación al mismo tiempo.',
                    'conflict_type': 'class',
                    'conflict_details': {
                        'existing_class': conflicting_class.get('nombre_clase'),
                        'date': date,
                        'time': time
                    }
                }
            }
        
        print("✅ NO HAY CONFLICTOS - Procediendo a crear reserva")

        # *** VALIDAR FECHA Y HORA ***
        try:
            reserva_datetime = datetime.strptime(f"{date} {time}", "%Y-%m-%d %H:%M")
            now = datetime.now() - timedelta(hours=3)
            if reserva_datetime < now:
                raise ValueError("No se puede reservar en una hora pasada.")
        except Exception as e:
            print(f"❌ Error en validación de fecha/hora: {str(e)}")
            raise Exception("Reserva inválida: fecha y hora deben ser futuras.")

        
        # *** CREAR LA RESERVA ***
        reservation_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()
        
        # Item 1: Vista desde la instalación
        instalacion_item = {
            'PK': 'RESERVA',
            'SK': f'INSTALACION#{facility_normalized}#USUARIO#{user_id}#{reservation_id}',
            'fecha': date,
            'hora': time,
            'estado': 'activo',
            'user_email': user_email,
            'user_id': user_id,
            'instalacion': facility,
            'reserva_id': reservation_id,
            'created_at': timestamp,
            'type': 'RESERVA_INSTALACION'
        }
        
        # Item 2: Vista desde el usuario
        usuario_item = {
            'PK': 'RESERVA',
            'SK': f'USUARIO#{user_id}#INSTALACION#{facility_normalized}#{reservation_id}',
            'fecha': date,
            'hora': time,
            'estado': 'activo',
            'user_email': user_email,
            'user_id': user_id,
            'instalacion': facility,
            'reserva_id': reservation_id,
            'created_at': timestamp,
            'type': 'RESERVA_USUARIO'
        }
        
        # *** GUARDAR EN DYNAMODB ***
        print("💾 Guardando en DynamoDB...")
        table.put_item(Item=instalacion_item)
        table.put_item(Item=usuario_item)
        print("✅ Reserva guardada exitosamente en DynamoDB")
        
        # *** RETORNAR DATOS PARA RECORDATORIOS ***
        return {
            'error': False,
            'type': 'reserva',
            'reservation_id': reservation_id,
            'facility': facility,
            'date': date, 
            'time': time,
            'user_email': user_email,
            'user_id': user_id,
            'created_at': timestamp,
            'facility_normalized': facility_normalized,
            'instalacion_item': instalacion_item,
            'usuario_item': usuario_item
        }
        
    except Exception as e:
        print(f"💥 Error en crear_reserva_rapido: {str(e)}")
        return {
            'error': True,
            'status_code': 500,
            'response': {
                'success': False,
                'message': f'Error saving to database: {str(e)}',
                'error': str(e)
            }
        }