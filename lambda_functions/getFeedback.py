import json
import boto3
import os
from datetime import datetime, timedelta
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
        
        print(f"🔍 Getting feedback for user: {user_email}")
        
        # Query para obtener feedback del usuario
        try:
            response = table.query(
                KeyConditionExpression='PK = :pk AND begins_with(SK, :sk_prefix)',
                ExpressionAttributeValues={
                    ':pk': 'QUEJA',
                    ':sk_prefix': f'USUARIO#{user_id}#'
                }
            )
            
            feedback_items = response.get('Items', [])
            print(f"📋 Found {len(feedback_items)} feedback items")
            
            # Procesar y filtrar feedback
            processed_feedback = []
            cutoff_date = datetime.utcnow() - timedelta(days=30)
            
            for item in feedback_items:
                try:
                    # Parsear fecha
                    created_at_str = item.get('created_at', '')
                    if created_at_str:
                        created_at = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
                    else:
                        continue  # Saltar si no hay fecha
                    
                    # Filtrar por fecha (últimos 30 días hacia adelante)
                    if created_at < cutoff_date:
                        continue
                    
                    # Determinar estado basado en la fecha
                    status = item.get('estado', 'pendiente')
                    if created_at < datetime.utcnow() - timedelta(days=1):
                        display_status = 'completado' if status == 'resuelto' else status
                    else:
                        display_status = status
                    
                    feedback_data = {
                        'feedback_id': item.get('feedback_id'),
                        'type': item.get('type'),
                        'target_id': item.get('target_id'),
                        'target_name': item.get('target_name'),
                        'title': item.get('title'),
                        'description': item.get('description'),
                        'priority': item.get('priority', 'medium'),
                        'estado': display_status,
                        'created_at': created_at_str,
                        'user_email': item.get('user_email')
                    }
                    
                    processed_feedback.append(feedback_data)
                    
                except Exception as e:
                    print(f"⚠️ Error processing feedback item: {str(e)}")
                    continue
            
            # Ordenar por fecha (más reciente primero)
            processed_feedback.sort(key=lambda x: x['created_at'], reverse=True)
            
            print(f"✅ Returning {len(processed_feedback)} feedback items")
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'feedback': processed_feedback,
                    'total': len(processed_feedback)
                })
            }
            
        except ClientError as e:
            print(f"❌ Error querying feedback: {str(e)}")
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({
                    'error': 'Failed to retrieve feedback',
                    'details': str(e)
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