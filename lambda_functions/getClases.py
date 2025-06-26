import json
import boto3
from datetime import datetime, timedelta
from decimal import Decimal

# ✅ AGREGAR esta función helper para convertir Decimal
def decimal_to_int(obj):
    if isinstance(obj, Decimal):
        return int(obj)
    raise TypeError

def lambda_handler(event, context):
    dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
    table = dynamodb.Table('ClubData')
    
    try:
        # Obtener todas las clases activas
        response = table.query(
            KeyConditionExpression='PK = :pk AND begins_with(SK, :sk_prefix)',
            ExpressionAttributeValues={
                ':pk': 'CLASE',
                ':sk_prefix': 'CLASE#'
            }
        )
        
        clases = []
        fecha_actual = datetime.now() - timedelta(hours=3)
        
        for item in response.get('Items', []):
            # Solo incluir clases futuras con cupo disponible
            try:
                clase_datetime = datetime.strptime(f"{item['fecha']} {item['hora']}", "%Y-%m-%d %H:%M")
                if (clase_datetime >= fecha_actual and 
                    item.get('cupoDisponible', 0) > 0 and 
                    item.get('estado', '') == 'activo'):
                    
                    clases.append({
                        'clase_id': item['clase_id'],
                        'nombre_clase': item['nombre_clase'],
                        'fecha': item['fecha'],
                        'hora': item['hora'],
                        'instructor': item.get('instructor', ''),
                        'cupoDisponible': int(item.get('cupoDisponible', 0)),  # ✅ Convertir a int
                        'cupoMaximo': int(item.get('cupoMaximo', 0)),           # ✅ Convertir a int
                        'dia_semana': item.get('dia_semana', ''),
                        'sk': item['SK']
                    })            
            except Exception as e:
                print(f"Error parsing fecha/hora: {e}")           

        
        # Agrupar por clase para facilitar el frontend
        clases_agrupadas = {}
        for clase in clases:
            nombre = clase['nombre_clase']
            if nombre not in clases_agrupadas:
                clases_agrupadas[nombre] = {
                    'nombre': nombre,
                    'horarios': []
                }
            
            clases_agrupadas[nombre]['horarios'].append({
                'clase_id': clase['clase_id'],
                'fecha': clase['fecha'],
                'hora': clase['hora'],
                'instructor': clase['instructor'],
                'cupoDisponible': clase['cupoDisponible'],
                'cupoMaximo': clase['cupoMaximo'],
                'dia_semana': clase['dia_semana']
            })
        
        # Convertir a lista
        clases_lista = list(clases_agrupadas.values())
        
        # Ordenar horarios por fecha y hora
        for clase in clases_lista:
            clase['horarios'].sort(key=lambda x: (x['fecha'], x['hora']))
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'clases': clases_lista,
                'total': len(clases)
            })
        }
        
    except Exception as e:
        print(f"❌ Error obteniendo clases: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'error': f'Error obteniendo clases: {str(e)}'
            })
        }