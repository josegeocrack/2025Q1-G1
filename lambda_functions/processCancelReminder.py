import json
from reminder_helper import delete_reminder_events

def lambda_handler(event, context):
    for record in event['Records']:
        body = json.loads(record['body'])
        reservation_id = body['reservation_id']
        print(f"🗑️ Eliminando recordatorio para reserva: {reservation_id}")
        result = delete_reminder_events(reservation_id)
        print(f"Resultado eliminación: {result}")