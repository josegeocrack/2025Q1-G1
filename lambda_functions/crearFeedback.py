import json
import boto3
import os
from datetime import datetime
from botocore.exceptions import ClientError

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
        body = json.loads(event.get('body', '{}'))
        feedback_type = body.get('type')  # 'clase', 'instalacion', 'profesor'
        target_id = body.get('target_id')  # ID del elemento específico
        target_name = body.get('target_name')  # Nombre del elemento
        title = body.get('title', '').strip()
        description = body.get('description', '').strip()
        priority = body.get('priority', 'medium')  # low, medium, high, urgent
        
        # Validaciones
        if not feedback_type or feedback_type not in ['clase', 'instalacion', 'profesor']:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'error': 'Invalid feedback type. Must be: clase, instalacion, or profesor'
                })
            }
        
        if not target_id or not target_name:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'error': 'Missing target_id or target_name'
                })
            }
        
        if not title or not description:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'error': 'Title and description are required'
                })
            }
        
        if priority not in ['low', 'medium', 'high', 'urgent']:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'error': 'Invalid priority. Must be: low, medium, high, or urgent'
                })
            }
        
        # Generar ID único para el feedback
        feedback_timestamp = datetime.utcnow().isoformat()
        feedback_id = f"{int(datetime.utcnow().timestamp())}"
        
        # Convertir tipo a mayúsculas para consistencia
        feedback_type_upper = feedback_type.upper()
        
        print(f"🔍 Creating feedback:")
        print(f"   Type: {feedback_type_upper}")
        print(f"   Target: {target_name} ({target_id})")
        print(f"   Priority: {priority}")
        print(f"   User: {user_email}")
        
        # Crear registro desde perspectiva del usuario
        usuario_sk = f'USUARIO#{user_id}#{feedback_type_upper}#{target_id}#{feedback_id}'
        feedback_usuario = {
            'PK': 'QUEJA',
            'SK': usuario_sk,
            'feedback_id': feedback_id,
            'user_id': user_id,
            'user_email': user_email,
            'type': feedback_type_upper,
            'target_id': target_id,
            'target_name': target_name,
            'title': title,
            'description': description,
            'priority': priority,
            'estado': 'pendiente',  # pendiente, en_revision, resuelto
            'created_at': feedback_timestamp
        }
        
        # Crear registro desde perspectiva del elemento (clase/instalación/profesor)
        elemento_sk = f'{feedback_type_upper}#{target_id}#USUARIO#{user_id}#{feedback_id}'
        feedback_elemento = {
            'PK': 'QUEJA',
            'SK': elemento_sk,
            'feedback_id': feedback_id,
            'user_id': user_id,
            'user_email': user_email,
            'type': feedback_type_upper,
            'target_id': target_id,
            'target_name': target_name,
            'title': title,
            'description': description,
            'priority': priority,
            'estado': 'pendiente',
            'created_at': feedback_timestamp
        }
        
        # Guardar ambos registros en DynamoDB
        try:
            table.put_item(Item=feedback_usuario)
            table.put_item(Item=feedback_elemento)
            
            print(f"✅ Feedback created successfully - ID: {feedback_id}")
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'message': 'Feedback submitted successfully',
                    'feedback': {
                        'id': feedback_id,
                        'type': feedback_type_upper,
                        'target': target_name,
                        'title': title,
                        'priority': priority,
                        'status': 'pendiente',
                        'created_at': feedback_timestamp
                    }
                })
            }
            
        except ClientError as e:
            print(f"❌ Error saving feedback: {str(e)}")
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({
                    'error': 'Failed to save feedback',
                    'details': str(e)
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
        print(f"❌ Unexpected error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'Internal server error',
                'details': str(e)
            })
        }