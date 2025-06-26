import json
import boto3
import os
from boto3.dynamodb.conditions import Key
from datetime import datetime

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
            'Access-Control-Allow-Methods': 'GET, OPTIONS'
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
            user_id = claims.get('sub')  # Este es el user_id único
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

        # Buscar todas las reservas del usuario usando su PK
        usuario_pk = f"USUARIO#{user_id}"
        print(f"Buscando reservas para PK: {usuario_pk}")
        
        response = table.query(
            KeyConditionExpression=Key('PK').eq('RESERVA') & Key('SK').begins_with(f'USUARIO#{user_id}#'),
            FilterExpression='#estado <> :cancelled',
            ExpressionAttributeNames={
                '#estado': 'estado'
            },
            ExpressionAttributeValues={
                ':cancelled': 'cancelado'
            }
        )
        
        reservas = response.get('Items', [])
        print(f"Encontradas {len(reservas)} reservas")

        # ✅ AGREGAR FILTRO POR FECHA
        from datetime import datetime, timedelta
        cutoff_date = (datetime.now() - timedelta(hours=3)).strftime('%Y-%m-%d %H:%M')
        current_date = datetime.now().strftime('%Y-%m-%d')

        

        reservas_filtradas = []
        for reserva in reservas:
            reserva_fecha = reserva.get('fecha', '')
            if reserva_fecha >= cutoff_date:  # Solo últimos 30 días hacia el futuro
                reservas_filtradas.append(reserva)

        reservas = reservas_filtradas

        # Formatear las reservas para el frontend
        reservas_formateadas = []
        for reserva in reservas:
            # Extraer información del SK: RESERVA#2024-01-15#14:00#INSTALACION#GYM
            sk_parts = reserva.get('SK', '').split('#')
            print(f"Procesando SK: {reserva.get('SK', '')}")

            if len(sk_parts) >= 4 and sk_parts[0] == 'USUARIO':
                # Usar los campos directos en lugar del SK
                fecha = reserva.get('fecha', '')
                hora = reserva.get('hora', '')
                instalacion = reserva.get('instalacion', 'Unknown')
                
                reserva_formateada = {
                    'id': reserva.get('reserva_id', f"{reserva.get('PK')}#{reserva.get('SK')}"),
                    'instalacion': format_facility_name(instalacion),
                    'fecha': fecha,
                    'hora': hora,
                    'estado': reserva.get('estado', 'activo'),
                    'created_at': reserva.get('created_at', ''),
                    'user_name': user_email.split('@')[0] if user_email else 'User',
                    'facility_original': reserva.get('FACILITY', instalacion)
                }
                reservas_formateadas.append(reserva_formateada)
                print(f"Reserva formateada: {reserva_formateada}")
        
        # Ordenar por fecha y hora (más recientes primero)
        reservas_formateadas.sort(key=lambda x: f"{x['fecha']} {x['hora']}", reverse=True)
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'reservas': reservas_formateadas,
                'count': len(reservas_formateadas),
                'debug': {
                    'user_id': user_id,
                    'user_email': user_email,
                    'pk_searched': usuario_pk,
                    'items_found': len(reservas)
                }
            })
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'Error interno del servidor',
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