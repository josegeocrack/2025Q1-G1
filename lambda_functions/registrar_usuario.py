import boto3 # type: ignore
import json
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
tabla = dynamodb.Table('ClubData')  # Tu tabla real

def lambda_handler(event, context):
    print(f"🔍 Post-confirmation trigger evento: {json.dumps(event)}")
    
    try:
        # Extraer datos de Cognito
        user_attributes = event['request']['userAttributes']
        user_id = user_attributes['sub']
        email = user_attributes['email']
        
        # Extraer nombre (si está disponible)
        name = user_attributes.get('name', '')
        given_name = user_attributes.get('given_name', '')
        family_name = user_attributes.get('family_name', '')
        
        # Construir nombre display
        if name:
            display_name = name
        elif given_name or family_name:
            display_name = f"{given_name} {family_name}".strip()
        else:
            # Fallback: usar parte del email
            display_name = email.split('@')[0].replace('.', ' ').replace('_', ' ').title()
        
        # ✅ NUEVA ESTRUCTURA CONSISTENTE
        item = {
            'PK': 'USUARIO',
            'SK': f'USUARIO#{user_id}',
            'user_id': user_id,
            'email': email,
            'name': display_name,
            'given_name': given_name,
            'family_name': family_name,
            'estado': 'activo',
            'membership_type': 'standard',  # Valor por defecto
            'created_at': datetime.utcnow().isoformat(),
            'last_login': datetime.utcnow().isoformat(),
            'phone': user_attributes.get('phone_number', ''),
            'email_verified': user_attributes.get('email_verified', 'false'),
            'cognito_username': user_attributes.get('cognito:username', ''),
            'registration_source': 'cognito_post_confirmation'
        }
        
        print(f"💾 Guardando usuario: {item}")
        
        tabla.put_item(Item=item)
        print(f"✅ Usuario {email} registrado correctamente en DynamoDB")
        
        return event
        
    except Exception as e:
        print(f"❌ Error al registrar usuario: {str(e)}")
        print(f"📋 Event completo: {json.dumps(event)}")
        # No hacer raise para evitar bloquear el registro en Cognito
        return event
