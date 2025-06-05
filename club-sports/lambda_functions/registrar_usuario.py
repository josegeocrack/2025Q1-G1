import boto3 # type: ignore
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
tabla = dynamodb.Table('ClubData')  # Tu tabla real

def lambda_handler(event, context):
    user_id = event['request']['userAttributes']['sub']
    email = event['request']['userAttributes']['email']

    item = {
        'PK': f'USUARIO#{user_id}',
        'SK': 'PROFILE',
        'email': email,
        'creado': datetime.utcnow().isoformat()
    }

    try:
        tabla.put_item(Item=item)
        print("Usuario registrado correctamente.")
        return event
    except Exception as e:
        print("Error al insertar en DynamoDB:", e)
        raise
