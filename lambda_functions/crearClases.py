import json
import boto3
from datetime import datetime, timedelta
import uuid

def lambda_handler(event, context):
    dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
    table = dynamodb.Table('ClubData')
    
    # 🏋️‍♀️ CONFIGURACIÓN DE CLASES
    clases_config = {
        'YOGA': {
            'dias': [0, 2, 4],  # Lunes, Miércoles, Viernes
            'horas': ['08:00', '15:00'],
            'cupo_maximo': 15,
            'instructor': 'Maria González'
        },
        'PILATES': {
            'dias': [0, 2],  # Lunes, Miércoles
            'horas': ['19:00'],
            'cupo_maximo': 12,
            'instructor': 'Ana López'
        },
        'ZUMBA': {
            'dias': [1, 3],  # Martes, Jueves  
            'horas': ['20:00'],
            'cupo_maximo': 20,
            'instructor': 'Carlos Ruiz'
        },
        'SPINNING': {
            'dias': [0, 2, 4],  # Lunes, Miércoles, Viernes
            'horas': ['07:00', '19:00'],
            'cupo_maximo': 18,
            'instructor': 'Pedro Martín'
        },
        'CROSSFIT': {
            'dias': [1, 3, 5],  # Martes, Jueves, Sábado
            'horas': ['09:00', '18:00'],
            'cupo_maximo': 10,
            'instructor': 'Laura Fernández'
        }
    }
    
    try:
        print("🏃‍♀️ Iniciando creación de clases...")
        
        # 📅 CALCULAR SEMANA SIGUIENTE
        hoy = datetime.now()
        print(f"📅 Fecha actual: {hoy.strftime('%A %d %B %Y')}")
        
        # Calcular días hasta el próximo lunes
        dias_hasta_lunes = (7 - hoy.weekday()) % 7
        if dias_hasta_lunes == 0:  # Si hoy es lunes
            dias_hasta_lunes = 7   # Crear para el PRÓXIMO lunes
        
        inicio_semana = hoy + timedelta(days=dias_hasta_lunes)
        fin_semana = inicio_semana + timedelta(days=6)
        
        print(f"📅 Creando clases para: {inicio_semana.strftime('%A %d %B %Y')} - {fin_semana.strftime('%A %d %B %Y')}")
        
        clases_creadas = []
        clases_duplicadas = []
        
        # 🔄 CREAR CLASES PARA TODA LA SEMANA
        for nombre_clase, config in clases_config.items():
            print(f"\n🏋️‍♀️ Procesando clase: {nombre_clase}")
            
            for dia_semana in config['dias']:
                fecha_clase = inicio_semana + timedelta(days=dia_semana)
                fecha_str = fecha_clase.strftime('%Y-%m-%d')
                dia_nombre = fecha_clase.strftime('%A')
                
                for hora in config['horas']:
                    # 🔍 VERIFICAR SI YA EXISTE
                    clase_sk = f'CLASE#{nombre_clase}#{fecha_str}#{hora}'
                    
                    try:
                        existing = table.get_item(
                            Key={
                                'PK': 'CLASE',
                                'SK': clase_sk
                            }
                        )
                        
                        if 'Item' in existing:
                            print(f"⚠️  Ya existe: {nombre_clase} {dia_nombre} {fecha_str} {hora}")
                            clases_duplicadas.append({
                                'clase': nombre_clase,
                                'fecha': fecha_str,
                                'hora': hora,
                                'dia': dia_nombre
                            })
                            continue
                            
                    except Exception as e:
                        print(f"❌ Error verificando clase existente: {str(e)}")
                        continue
                    
                    # 🆕 CREAR NUEVA CLASE
                    clase_id = str(uuid.uuid4())
                    
                    item = {
                        'PK': 'CLASE',
                        'SK': clase_sk,
                        'clase_id': clase_id,
                        'nombre_clase': nombre_clase,
                        'fecha': fecha_str,
                        'hora': hora,
                        'instructor': config['instructor'],
                        'cupoDisponible': config['cupo_maximo'],
                        'cupoMaximo': config['cupo_maximo'],
                        'dia_semana': dia_nombre,
                        'estado': 'activo',
                        'created_at': datetime.now().isoformat()
                    }
                    
                    table.put_item(Item=item)
                    
                    print(f"✅ Creada: {nombre_clase} {dia_nombre} {fecha_str} {hora} (ID: {clase_id[:8]}...)")
                    
                    clases_creadas.append({
                        'clase': nombre_clase,
                        'fecha': fecha_str,
                        'hora': hora,
                        'instructor': config['instructor'],
                        'dia': dia_nombre,
                        'cupo': config['cupo_maximo'],
                        'clase_id': clase_id
                    })
        
        # 📊 RESUMEN
        total_creadas = len(clases_creadas)
        total_duplicadas = len(clases_duplicadas)
        
        print(f"\n📊 RESUMEN:")
        print(f"   ✅ Clases creadas: {total_creadas}")
        print(f"   ⚠️  Clases duplicadas: {total_duplicadas}")
        print(f"   📅 Semana: {inicio_semana.strftime('%d/%m/%Y')} - {fin_semana.strftime('%d/%m/%Y')}")
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'message': f'🎉 Proceso completado exitosamente',
                'resumen': {
                    'clases_creadas': total_creadas,
                    'clases_duplicadas': total_duplicadas,
                    'semana_inicio': inicio_semana.strftime('%Y-%m-%d'),
                    'semana_fin': fin_semana.strftime('%Y-%m-%d')
                },
                'clases_nuevas': clases_creadas,
                'clases_duplicadas': clases_duplicadas
            })
        }
        
    except Exception as e:
        print(f"❌ ERROR CRÍTICO: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'error': f'Error creando clases: {str(e)}'
            })
        }