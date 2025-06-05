import json
import boto3
import uuid
import os
from datetime import datetime

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
        # *** DEBUGGING COMPLETO - AGREGAR ESTO ***
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

        # *** MISMA LÓGICA QUE getReservas PARA VERIFICAR ***
        dynamodb = boto3.resource('dynamodb')
        table_name = 'ClubData'
        table = dynamodb.Table(table_name)
        
        # Crear las claves (IGUAL que getReservas)
        facility_normalized = facility.replace(" ", "_").upper()
        pk = f"INSTALACION#{facility_normalized}"
        sk = f"RESERVA#{date}#{time}"
        
        print(f"Verificando disponibilidad: PK={pk}, SK={sk}")
        
        print(f"🔍 Verificando disponibilidad para PK={pk}, SK={sk}")
        response = table.get_item(
            Key={
                'PK': pk,
                'SK': sk
            }
        )
        print(f"🔍 Respuesta de get_item: {response}")
        
        # Si existe y está activa, no está disponible
        if 'Item' in response:
            existing_item = response['Item']
            print(f"⚠️ Item existente encontrado: {existing_item}")
            if existing_item.get('estado') == 'activo':
                print("❌ CONFLICTO - Instalación no disponible")
                return {
                    'statusCode': 409,  # Conflict
                    'headers': headers,
                    'body': json.dumps({
                        'success': False,
                        'message': f'CONFLICT: Facility {facility} is not available on {date} at {time}',
                        'debug': {
                            'existing_item': existing_item,
                            'pk': pk,
                            'sk': sk
                        }
                    })
                }
        
        # *** AGREGAR ESTE LOG NUEVO ***
        print("✅ NO HAY CONFLICTO - Procediendo a crear reserva")
        
        # *** SI ESTÁ DISPONIBLE, CREAR LA RESERVA ***
        debug_info = []
        debug_info.append("✅ NO HAY CONFLICTO - Procediendo a crear reserva")
        
        reservation_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()
        debug_info.append(f"🆔 Reservation ID generado: {reservation_id}")
        
        # *** ITEM 1: VISTA DESDE LA INSTALACIÓN (COMO ANTES) ***
        instalacion_item = {
            'PK': pk,
            'SK': sk,
            'USER_ID': user_id,
            'USER_EMAIL': user_email,
            'FACILITY': facility,
            'DATE': date,
            'TIME': time,
            'RESERVATION_ID': reservation_id,
            'estado': 'activo',
            'created_at': timestamp,
            'tipo': 'instalacion_reserva'
        }
        debug_info.append(f"💾 Item instalación creado: {instalacion_item}")
        
        # *** ITEM 2: VISTA DESDE EL USUARIO (NUEVO) ***
        usuario_pk = f"USUARIO#{user_id}"
        usuario_sk = f"RESERVA#{date}#{time}#INSTALACION#{facility_normalized}"
        
        usuario_item = {
            'PK': usuario_pk,
            'SK': usuario_sk,
            'USER_ID': user_id,
            'USER_EMAIL': user_email,
            'FACILITY': facility,
            'DATE': date,
            'TIME': time,
            'RESERVATION_ID': reservation_id,
            'estado': 'activo',
            'created_at': timestamp,
            'tipo': 'usuario_reserva',
            # Datos adicionales para el usuario
            'instalacion_pk': pk,
            'instalacion_sk': sk
        }
        debug_info.append(f"💾 Item usuario creado: {usuario_item}")
        
        # *** INSERTAR AMBOS ITEMS CON MANEJO DE ERRORES ***
        put_response_instalacion = None
        put_response_usuario = None
        
        try:
            # Insertar vista desde instalación
            debug_info.append("💾 Ejecutando put_item para instalación...")
            put_response_instalacion = table.put_item(Item=instalacion_item)
            debug_info.append(f"💾 Respuesta put_item instalación: {put_response_instalacion}")
            
            # Insertar vista desde usuario
            debug_info.append("💾 Ejecutando put_item para usuario...")
            put_response_usuario = table.put_item(Item=usuario_item)
            debug_info.append(f"💾 Respuesta put_item usuario: {put_response_usuario}")
            
            debug_info.append("✅ AMBOS PUT_ITEMS COMPLETADOS EXITOSAMENTE")
            
        except Exception as e:
            debug_info.append(f"💥 ERROR EN PUT_ITEM: {str(e)}")
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'message': f'Error saving to database: {str(e)}',
                    'debug_info': debug_info,
                    'error_details': {
                        'error': str(e),
                        'instalacion_item': instalacion_item,
                        'usuario_item': usuario_item
                    }
                })
            }
        
        debug_info.append(f"🎉 Proceso completado - Reserva: {reservation_id}")
        
        return {
            'statusCode': 201,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'message': f'Reservation created successfully for {facility} on {date} at {time}',
                'debug_info': debug_info,
                'technical_details': {
                    'table_name': table_name,
                    'instalacion_pk': pk,
                    'instalacion_sk': sk,
                    'usuario_pk': usuario_pk,
                    'usuario_sk': usuario_sk,
                    'put_responses': {
                        'instalacion': put_response_instalacion,
                        'usuario': put_response_usuario
                    },
                    'reservation_id': reservation_id
                },
                'reservation': {
                    'id': reservation_id,
                    'facility': facility,
                    'date': date,
                    'time': time,
                    'user_email': user_email
                }
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'message': f'Internal server error: {str(e)}',
                'error': str(e)
            })
        }