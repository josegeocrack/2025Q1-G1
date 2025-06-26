import boto3
import json
import logging
from datetime import datetime, timedelta, timezone

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """
    Lambda que envía recordatorios por email usando SNS
    Se ejecuta cuando EventBridge dispara una regla programada
    """
    try:
        logger.info(f"🔔 Iniciando envío de recordatorio: {json.dumps(event, indent=2)}")
        
        # Extraer datos del evento
        reminder_type = event.get('reminder_type')
        user_email = event.get('user_email')
        user_topic_arn = event.get('user_topic_arn')
        activity_name = event.get('activity_name')
        date = event.get('date')
        time = event.get('time')
        rule_name = event.get('rule_name')
        
        # Validar que tenemos todos los datos necesarios
        if not all([user_topic_arn, user_email, activity_name, date, time]):
            raise ValueError("Faltan datos requeridos en el evento")
        
        # NUEVO: Validar si realmente es momento de enviar el recordatorio
        activity_datetime = datetime.strptime(f"{date} {time}", "%Y-%m-%d %H:%M")
        
        # Tiempo actual UTC
        now_utc = datetime.now(timezone.utc)
        # Convertir a hora Argentina (sin timezone)
        now_argentina = (now_utc - timedelta(hours=3)).replace(tzinfo=None)
        
        # Tiempo hasta la actividad (en minutos)
        time_diff = activity_datetime - now_argentina 
        minutes_until = time_diff.total_seconds() / 60
        
        logger.info(f"🕒 Hora actual Argentina: {now_argentina}")
        logger.info(f"🕒 Hora de actividad: {activity_datetime}")
        logger.info(f"⏱️ Minutos hasta actividad: {minutes_until:.1f}")
        
        # Solo enviar si falta entre 45-75 minutos (con margen de error)
        if minutes_until < 45 or minutes_until > 75:
            logger.warning(f"⚠️ No es momento de enviar recordatorio. Faltan {minutes_until:.0f} minutos para la actividad")
            # NO deshabilitar la regla cuando es demasiado pronto
            # Pero sí deshabilitar si ya pasó el momento (para evitar recordatorios tardíos)
            if minutes_until < 45 and rule_name:
                eventbridge = boto3.client('events', region_name='us-east-1')
                eventbridge.disable_rule(Name=rule_name)
                logger.info(f"🔒 Regla {rule_name} deshabilitada por estar en el pasado")
            
            return {
                "statusCode": 200,
                "body": json.dumps({
                    "message": "Recordatorio no enviado - no es el momento adecuado",
                    "minutes_until": round(minutes_until, 1)
                })
            }
        
        logger.info(f"📧 Enviando recordatorio a {user_email} para {activity_name}")
        
        # Configurar cliente SNS
        sns = boto3.client('sns', region_name='us-east-1')
        
        # Crear mensaje personalizado según el tipo de recordatorio
        if reminder_type == "hour_before":
            subject = f"🔔 Recordatorio: Tu reserva es en 1 hora"
            message_body = f"""¡Hola!

Este es un recordatorio de que tu reserva está programada para dentro de 1 hora:

📅 Actividad: {activity_name}
📅 Fecha: {date}
🕐 Hora: {time}

¡No olvides llegar a tiempo!

Saludos,
Club Sports"""
        
        elif reminder_type == "day_before":
            subject = f"🔔 Recordatorio: Tu reserva es mañana"
            message_body = f"""¡Hola!

Este es un recordatorio de que tienes una reserva programada para mañana:

📅 Actividad: {activity_name}
📅 Fecha: {date}
🕐 Hora: {time}

¡Te esperamos!

Saludos,
Club Sports"""
        
        else:
            # Recordatorio genérico
            subject = f"🔔 Recordatorio: {activity_name}"
            message_body = f"""¡Hola!

Recordatorio de tu reserva:

📅 Actividad: {activity_name}
📅 Fecha: {date}
🕐 Hora: {time}

Saludos,
Club Sports"""
        
        logger.info(f"📝 Asunto: {subject}")
        logger.info(f"📝 Mensaje: {message_body[:100]}...")
        
        # Enviar mensaje al tópico específico del usuario
        response = sns.publish(
            TopicArn=user_topic_arn,
            Subject=subject,
            Message=message_body
        )
        
        logger.info(f"✅ Email enviado exitosamente. MessageId: {response.get('MessageId')}")
        
        # Deshabilitar la regla para que no se ejecute de nuevo
        if rule_name:
            try:
                eventbridge = boto3.client('events', region_name='us-east-1')
                eventbridge.disable_rule(Name=rule_name)
                logger.info(f"🔒 Regla {rule_name} deshabilitada para evitar ejecuciones repetidas")
            except Exception as disable_error:
                logger.warning(f"⚠️ No se pudo deshabilitar regla {rule_name}: {str(disable_error)}")
        
        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "Recordatorio enviado exitosamente",
                "user_email": user_email,
                "activity_name": activity_name,
                "message_id": response.get('MessageId')
            })
        }
        
    except Exception as e:
        logger.error(f"❌ Error enviando recordatorio: {str(e)}")
        import traceback
        logger.error(f"🔍 Traceback completo: {traceback.format_exc()}")
        
        return {
            "statusCode": 500,
            "body": json.dumps({
                "error": "Error enviando recordatorio",
                "details": str(e)
            })
        }