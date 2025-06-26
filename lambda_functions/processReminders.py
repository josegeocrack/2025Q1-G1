import json
import boto3
import logging
from reminder_helper import create_reminders

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """
    Procesa mensajes de SQS y crea recordatorios
    """
    try:
        logger.info("🔔 Iniciando procesamiento de recordatorios desde SQS")
        
        # Procesar cada mensaje de SQS
        for record in event['Records']:
            try:
                # Parsear el mensaje
                message_body = json.loads(record['body'])
                logger.info(f"📧 Procesando mensaje: {message_body}")
                
                # Crear recordatorios usando la función existente
                result = create_reminders(message_body)
                
                if result.get('success'):
                    logger.info(f"✅ Recordatorios creados exitosamente: {result}")
                else:
                    logger.error(f"❌ Error creando recordatorios: {result}")
                
            except Exception as e:
                logger.error(f"💥 Error procesando mensaje individual: {str(e)}")
                logger.error(f"🔍 Mensaje que falló: {record}")
                # No re-lanzar la excepción para que otros mensajes se procesen
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Mensajes procesados',
                'processed_count': len(event['Records'])
            })
        }
        
    except Exception as e:
        logger.error(f"💥 Error general en lambda: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'message': f'Error processing messages: {str(e)}'
            })
        }