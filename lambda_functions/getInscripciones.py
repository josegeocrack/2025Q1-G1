import json
import boto3
import os

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
        
        # Query para obtener inscripciones del usuario
        # PK: INSCRIPCION, SK: USUARIO#{user_id}#CLASE#{nombre_clase}#{clase_id}
        usuario_pk = 'INSCRIPCION'
        sk_prefix = f'USUARIO#{user_id}#'

        response = table.query(
            KeyConditionExpression='PK = :pk AND begins_with(SK, :sk_prefix)',
            FilterExpression='#estado <> :cancelled',
            ExpressionAttributeNames={
                '#estado': 'estado'
            },
            ExpressionAttributeValues={
                ':pk': usuario_pk,
                ':sk_prefix': sk_prefix,
                ':cancelled': 'cancelado'
            }
        )
        
        inscripciones = response.get('Items', [])
        print(f"Encontradas {len(inscripciones)} inscripciones")

        # ✅ AGREGAR FILTRO POR FECHA
        from datetime import datetime, timedelta
        cutoff_date = (datetime.now() - timedelta(hours=3)).strftime('%Y-%m-%d %H:%M')

        inscripciones_filtradas = []
        for inscripcion in inscripciones:
            inscripcion_fecha = inscripcion.get('fecha', '')
            if inscripcion_fecha >= cutoff_date:  # Solo últimos 30 días hacia el futuro
                inscripciones_filtradas.append(inscripcion)
        inscripciones = inscripciones_filtradas

        # Formatear las inscripciones para el frontend
        inscripciones_formateadas = []
        for inscripcion in inscripciones:
            # Extraer información del SK: USUARIO#{user_id}#CLASE#{nombre_clase}#{clase_id}
            sk_parts = inscripcion.get('SK', '').split('#')
            print(f"Procesando SK: {inscripcion.get('SK', '')}")
            
            if len(sk_parts) >= 5 and sk_parts[0] == 'USUARIO' and sk_parts[2] == 'CLASE':
                nombre_clase = sk_parts[3]  # ✅ CORREGIR: sk_parts[3] no sk_parts[2]
                clase_id = sk_parts[4] if len(sk_parts) > 4 else ''
                
                inscripcion_formateada = {
                    'id': f"{inscripcion.get('PK')}#{inscripcion.get('SK')}",
                    'clase': nombre_clase,
                    'instructor': inscripcion.get('instructor', 'TBD'),
                    'fecha': inscripcion.get('fecha', ''),
                    'hora': inscripcion.get('hora', ''),
                    'estado': inscripcion.get('estado', 'activo'),
                    'created_at': inscripcion.get('created_at', ''),  # ✅ PROBAR fecha_inscripcion primero
                    'clase_id': clase_id,
                    'user_name': user_email.split('@')[0] if user_email else 'User'
                }
                inscripciones_formateadas.append(inscripcion_formateada)
                print(f"🔍 DEBUG - SK: {inscripcion.get('SK')}")
                print(f"🔍 DEBUG - nombre_clase extraído: '{nombre_clase}'")
                print(f"🔍 DEBUG - Inscripción formateada: {inscripcion_formateada}")
        
        # Ordenar por fecha y hora (más recientes primero)
        inscripciones_formateadas.sort(key=lambda x: f"{x['fecha']} {x['hora']}", reverse=True)
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'inscripciones': inscripciones_formateadas,
                'total': len(inscripciones_formateadas)
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