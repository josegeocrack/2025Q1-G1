import boto3
import json
from datetime import datetime, timedelta
import logging
import os

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def get_account_id():
    """Obtener Account ID dinámicamente"""
    try:
        sts = boto3.client('sts')
        return sts.get_caller_identity()['Account']
    except:
        return "830822993936"  # Tu account ID real

def create_reminder_events(reservation_data):
    """
    Crea eventos de EventBridge para recordatorios
    """
    try:
        logger.info(f"🔍 Datos recibidos en create_reminder_events: {reservation_data}")
        
        sns = boto3.client('sns', region_name='us-east-1')
        eventbridge = boto3.client('events', region_name='us-east-1')
        
        # Validar que tenemos todos los campos necesarios
        required_fields = ['date', 'time', 'user_email', 'id', 'type', 'activity_name']
        for field in required_fields:
            if field not in reservation_data:
                raise ValueError(f"Campo requerido faltante: {field}")
        
        # *** CREAR TÓPICO SNS ESPECÍFICO PARA ESTE USUARIO ***
        user_email = reservation_data['user_email']
        email_safe = user_email.replace('@', '-at-').replace('.', '-dot-')
        topic_name = f"club-user-{email_safe}"
        
        # Antes de crear el tópico, verificar si ya existe
        try:
            # Lista los tópicos existentes
            topics = sns.list_topics()
            topic_exists = False
            user_topic_arn = None
            
            # Buscar si ya existe un tópico para este usuario
            for topic in topics.get('Topics', []):
                if topic_name in topic.get('TopicArn', ''):
                    topic_exists = True
                    user_topic_arn = topic.get('TopicArn')
                    logger.info(f"✅ Usando tópico existente: {user_topic_arn}")
                    break
            
            # Si no existe, crear uno nuevo
            if not topic_exists:
                logger.info(f"🔍 Creando tópico específico: {topic_name}")
                topic_response = sns.create_topic(Name=topic_name)
                user_topic_arn = topic_response['TopicArn']
                logger.info(f"✅ Tópico creado: {user_topic_arn}")
                
                # Sólo suscribir si es un tópico nuevo
                subscription_response = sns.subscribe(
                    TopicArn=user_topic_arn,
                    Protocol='email',
                    Endpoint=user_email
                )
                subscription_arn = subscription_response['SubscriptionArn']
                logger.info(f"✅ Usuario suscrito a su tópico: {subscription_arn}")
            else:
                # Si ya existe, no es necesario suscribir de nuevo
                logger.info(f"✅ Usuario ya suscrito anteriormente, no requiere confirmación")
                subscription_arn = "already_subscribed"
                
        except Exception as e:
            logger.error(f"❌ Error manejando tópico SNS: {str(e)}")
            # Crear nuevo tópico como fallback
            topic_response = sns.create_topic(Name=topic_name)
            user_topic_arn = topic_response['TopicArn']
            
            subscription_response = sns.subscribe(
                TopicArn=user_topic_arn,
                Protocol='email',
                Endpoint=user_email
            )
            subscription_arn = subscription_response['SubscriptionArn']
        
        # *** CALCULAR CUÁNDO ENVIAR RECORDATORIOS ***
        activity_datetime = datetime.strptime(f"{reservation_data['date']} {reservation_data['time']}", "%Y-%m-%d %H:%M")
        logger.info(f"🔍 Activity datetime Argentina: {activity_datetime}")
        
        # Recordatorio 1 hora antes (en hora Argentina)
        hour_before_reminder = activity_datetime - timedelta(hours=1)
        logger.info(f"🔍 Hour before reminder (Argentina): {hour_before_reminder}")
        
        # Solo crear si es futuro
        from datetime import timezone
        now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
        logger.info(f"🔍 Tiempo actual UTC: {now_utc}")
        
        # Convertir a hora Argentina para comparación
        now_argentina = now_utc - timedelta(hours=3)
        logger.info(f"🔍 Tiempo actual Argentina: {now_argentina}")
        
        rules_created = []
        
        # *** RECORDATORIO 1 HORA ANTES ***
        if hour_before_reminder > now_argentina:
            logger.info("🔍 Creando recordatorio de 1 hora antes...")
            rule_name_hour = f"reminder-{reservation_data['id']}-1hour-before"
            create_single_rule(
                eventbridge=eventbridge,
                rule_name=rule_name_hour,
                reminder_datetime=hour_before_reminder,
                data=reservation_data,
                reminder_type="hour_before",
                user_topic_arn=user_topic_arn
            )
            rules_created.append(rule_name_hour)
            logger.info(f"✅ Regla 1 hora antes creada: {rule_name_hour}")
        else:
            logger.info("⏭️ Saltando recordatorio 1 hora antes (muy cerca o pasado)")
        
        logger.info(f"✅ Recordatorios creados exitosamente: {rules_created}")
        return {
            "success": True, 
            "rules_created": rules_created,
            "user_topic_arn": user_topic_arn,
            "subscription_arn": subscription_arn
        }
        
    except Exception as e:
        logger.error(f"❌ Error creando recordatorios: {str(e)}")
        import traceback
        logger.error(f"🔍 Traceback completo: {traceback.format_exc()}")
        return {"success": False, "error": str(e)}
    

def create_single_rule(eventbridge, rule_name, reminder_datetime, data, reminder_type, user_topic_arn):
    """Crea una regla específica de EventBridge usando cron()"""
    try:
        logger.info(f"🔍 Creando regla: {rule_name} para {reminder_datetime}")
        
        # Verificar que la fecha sea futuro
        from datetime import timezone
        now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
        # CAMBIO AQUÍ: Convertir now_utc a hora Argentina para comparación consistente
        now_argentina = now_utc - timedelta(hours=3)
        logger.info(f"🔍 Tiempo actual Argentina en create_single_rule: {now_argentina}")
        
        # reminder_datetime ya está en hora Argentina, no necesita conversión
        argentina_datetime = reminder_datetime.replace(tzinfo=None)
        
        # CAMBIO AQUÍ: Comparar ambos en hora Argentina
        if argentina_datetime <= now_argentina:
            logger.warning(f"⚠️ Fecha {argentina_datetime} está en el pasado. Saltando.")
            return
        
        # CAMBIAR A ESTO: Convertir de Argentina a UTC para cron
        utc_datetime = argentina_datetime + timedelta(hours=3)
        minutos = utc_datetime.minute
        horas = utc_datetime.hour
        dia = utc_datetime.day
        mes = utc_datetime.month
        anio = utc_datetime.year
        
        # Crear expresión cron
        # El "?" es para día de semana (cualquiera)
        cron_expression = f"cron({minutos} {horas} {dia} {mes} ? {anio})"
        
        logger.info(f"🔍 Schedule cron expression: {cron_expression}")
        
        # Crear la regla
        eventbridge.put_rule(
            Name=rule_name,
            ScheduleExpression=cron_expression,
            Description=f"Recordatorio {reminder_type} para {data['type']} {data['id']}",
            State='ENABLED'
        )
        logger.info(f"✅ Regla EventBridge creada con cron: {rule_name}")
        
        # Obtener ARN de sendReminder Lambda
        account_id = get_account_id()
        sendreminder_arn = f'arn:aws:lambda:us-east-1:{account_id}:function:sendReminder'
        
        # Configurar target
        target_input = {
            'reminder_type': reminder_type,
            'user_email': data['user_email'],
            'user_topic_arn': user_topic_arn,
            'activity_type': data['type'],
            'activity_name': data['activity_name'],
            'date': data['date'],
            'time': data['time'],
            'rule_name': rule_name
        }
        
        eventbridge.put_targets(
            Rule=rule_name,
            Targets=[{
                'Id': '1',
                'Arn': sendreminder_arn,
                'Input': json.dumps(target_input)
            }]
        )
        logger.info(f"✅ Target configurado para regla: {rule_name}")
        
    except Exception as e:
        logger.error(f"❌ Error creando regla {rule_name}: {str(e)}")
        import traceback
        logger.error(f"🔍 Traceback create_single_rule: {traceback.format_exc()}")
        raise e
    

def delete_reminder_events(reservation_id, region='us-east-1'):
    """Elimina evento de recordatorio asociado a una reserva específica"""
    try:
        rule_name = f"reminder-{reservation_id}-1hour-before"
        eventbridge = boto3.client('events', region_name='us-east-1')

        eventbridge.remove_targets(Rule=rule_name, Ids=['1'])
        eventbridge.delete_rule(Name=rule_name)

        logger.info(f"✅ Recordatorio eliminado: {rule_name}")
        return {"success": True, "rules_deleted": [rule_name]}

    except Exception as e:
        logger.warning(f"❌ No se pudo eliminar regla {rule_name}: {str(e)}")
        return {"success": False, "error": str(e)}


def create_reminders(reserva_data):
    """
    Función wrapper que adapta los datos de crearReserva 
    al formato esperado por create_reminder_events
    """
    if reserva_data['type']== 'reserva':
        try:
            # Transformar datos al formato correcto
            reminder_data = {
                'type': 'reserva',
                'id': reserva_data['reservation_id'],
                'user_email': reserva_data['user_email'],
                'date': reserva_data['date'],
                'time': reserva_data['time'],
                'activity_name': reserva_data['facility']  # Para reservas, el nombre es la instalación
            }
            
            # Llamar a la función real
            return create_reminder_events(reminder_data)
            
        except Exception as e:
            logger.error(f"❌ Error en create_reminders wrapper: {str(e)}")
            return {"success": False, "error": str(e)}
    else:
        try:
            # Transformar datos al formato correcto
            reminder_data = {
                'type': 'inscripcion',
                'id': reserva_data['inscripcion_id'],
                'user_email': reserva_data['user_email'],
                'date': reserva_data['date'],
                'time': reserva_data['time'],
                'activity_name': reserva_data['clase']  # Para reservas, el nombre es la instalación
            }
            
            # Llamar a la función real
            return create_reminder_events(reminder_data)
            
        except Exception as e:
            logger.error(f"❌ Error en create_reminders wrapper: {str(e)}")
            return {"success": False, "error": str(e)}