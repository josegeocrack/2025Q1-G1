import json
import boto3
import os

# Inicializar el cliente de DynamoDB
dynamodb = boto3.resource('dynamodb')
table_name = os.environ.get('DYNAMODB_TABLE_NAME', 'ClubData')
table = dynamodb.Table(table_name)

def lambda_handler(event, context):
    try:
        # *** CONFIGURAR HEADERS CORS INMEDIATAMENTE ***
        headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'POST, OPTIONS'
        }
        
        print(f"Event received: {json.dumps(event)}")  # ← AGREGAR LOG
        
        # Manejar preflight OPTIONS request
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'message': 'CORS preflight'})
            }
        
        # Obtener información del usuario desde Cognito (si está disponible)
        user_email = None
        if 'requestContext' in event and 'authorizer' in event['requestContext']:
            claims = event['requestContext']['authorizer'].get('claims', {})
            user_email = claims.get('email')
            print(f"Usuario autenticado: {user_email}")
        
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
                    'available': False,
                    'message': 'Missing required parameters: facility, date, time'
                })
            }

        # Crear las claves para buscar en DynamoDB
        # PK: INSTALACION#{facility}, SK: RESERVA#{date}#{time}
        facility_normalized = facility.replace(" ", "_").upper()
        pk = f"INSTALACION#{facility_normalized}"
        sk = f"RESERVA#{date}#{time}"

        print(f"Checking availability for PK: {pk}, SK: {sk}")

        # Buscar si existe una reserva activa para esta instalación, fecha y hora
        response = table.get_item(
            Key={
                'PK': pk,
                'SK': sk
            }
        )

        item = response.get('Item')
        
        # Si no existe el item, la instalación está disponible
        if not item:
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'available': True,
                    'message': 'Facility is available for booking!'
                })
            }
        
        # Si existe el item, verificar si está cancelado o activo
        is_cancelled = item.get('estado') == 'cancelado'
        
        if is_cancelled:
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'available': True,
                    'message': 'Facility is available for booking!'
                })
            }
        else:
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'available': False,
                    'message': 'This facility is already booked for the selected time.'
                })
            }

    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({
                'available': False,
                'message': 'Invalid JSON in request body'
            })
        }
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'available': False,
                'message': 'Internal server error'
            })
        }