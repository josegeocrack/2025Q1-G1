# README

# **Proyecto Club Sports - Infraestructura como Código (Terraform)**

Este proyecto define y despliega la infraestructura completa para la aplicación web "Club Sports" utilizando Terraform. La arquitectura es serverless, modular y está diseñada para ser escalable y mantenible, todo gestionado como código.

## **Estructura del Proyecto**

El repositorio está organizado para separar la configuración, la lógica de la aplicación y los componentes reutilizables (módulos).

club-sports10 - Copy/
│
├── lambda_functions/         # Código fuente de todas las funciones Lambda en Python.
│
├── modules/                  # Módulos de Terraform reutilizables para los componentes de AWS.
│   ├── apigateway_config/    # Configura los recursos, métodos e integraciones de API Gateway.
│   ├── cognito/              # Configura el User Pool y el cliente de aplicación de Cognito.
│   ├── dynamodb/             # Define la tabla de DynamoDB con sus índices y atributos.
│   ├── lambdas/              # Crea y empaqueta todas las funciones Lambda.
│   ├── s3/                   # Crea el bucket S3 para el sitio web estático.
│   ├── vpc/                  # Configura la VPC, subnets y tablas de enrutamiento.
│   └── vpc_endpoint/         # Configura los VPC Endpoints para servicios de AWS.
│
├── site/                     # Archivos del frontend (HTML, CSS, JS).
│
├── api_resources.tf          # Define TODOS los endpoints de API Gateway usando un mapa local.
├── lambda_definitions.tf     # Define TODAS las funciones Lambda usando un mapa local.
├── log_management.tf         # Crea CloudTrail y alarmas de CloudWatch para monitoreo.
├── [main.tf](http://main.tf/)                   # Archivo principal que une todos los módulos y recursos.
├── [variables.tf](http://variables.tf/)              # Variables de entrada para la configuración (región, nombres, etc.).
├── [output.tf](http://output.tf/)                 # Salidas del stack de Terraform (ej. URL del sitio).
├── [providers.tf](http://providers.tf/)              # Define el proveedor de AWS y su configuración.
├── terraform.tfvars          # Asigna valores a las variables definidas en [variables.tf](http://variables.tf/).
└── .terraform/               # Directorio de trabajo de Terraform (se crea con `terraform init`).

## **Componentes Principales**

**1. Archivos Raíz de Terraform**

- main.tf: Es el orquestador principal. Llama a los módulos definidos en modules/ y les pasa las configuraciones necesarias desde los archivos de definiciones (lambda_definitions.tf y api_resources.tf).
- variables.tf: Declara todas las variables de entrada que el proyecto necesita. Esto permite parametrizar el despliegue (por ejemplo, cambiar el nombre del proyecto o la cantidad de zonas de disponibilidad).
- providers.tf: Especifica que estamos usando AWS como proveedor de nube y permite configurar la región por defecto.

**2. Definiciones Centralizadas (locals)**

Para hacer el proyecto escalable, en lugar de definir cada Lambda y cada endpoint de API uno por uno, utilizamos mapas centralizados.

- lambda_definitions.tf: Contiene un locals con un mapa llamado lambda_functions. Cada elemento del mapa representa una función Lambda con sus propiedades (handler, runtime, memoria, etc.). El módulo de Lambdas itera sobre este mapa para crear todos los recursos de forma automática.
- api_resources.tf: Similar al anterior, define un locals con un mapa api_resources. Este mapa describe la estructura completa de la API (rutas, métodos HTTP, qué Lambda se integra, si requiere autorización). El módulo de API Gateway usa este mapa para construir toda la API.

**3. Módulos Reutilizables (Directorio modules/)**

Estos son los bloques de construcción de nuestra infraestructura. Cada módulo es una pieza autónoma y reutilizable.

- lambdas: Un módulo genérico que recibe el mapa local.lambda_functions y, usando un bucle for_each, crea un recurso aws_lambda_function para cada función definida. También gestiona los permisos y el empaquetado del código.
- apigateway_config: Recibe el mapa local.api_resources y, mediante bucles anidados for_each, crea dinámicamente todos los aws_api_gateway_resource, aws_api_gateway_method y aws_api_gateway_integration.
- dynamodb: Un módulo flexible que crea una tabla de DynamoDB. Sus atributos y índices secundarios globales (GSI) se definen mediante variables, lo que permite reutilizarlo para otras tablas con diferentes esquemas.
- s3: Crea el bucket para alojar el sitio web estático, configura el acceso público y sube los archivos desde el directorio site/.
- cognito: Configura el pool de usuarios para la autenticación y autorización de usuarios.
- vpc y vpc_endpoint: Crean el entorno de red aislado para que las Lambdas se ejecuten de forma segura y puedan acceder a servicios de AWS sin salir a internet público.

**4. Gestión de Logs y Monitoreo (log_management.tf)**

Este archivo es un ejemplo de cómo añadir una funcionalidad transversal (en este caso, monitoreo y seguridad) sin usar un módulo externo complejo.

- **Recurso Nativo aws_cloudtrail**: En lugar de un módulo, se usa el recurso nativo de Terraform para crear un "Trail" que registra todas las llamadas a la API en tu cuenta de AWS, guardando los logs en un bucket S3 dedicado y seguro.
- **Recursos Nativos aws_cloudwatch_metric_alarm**: Se crean múltiples alarmas que vigilan la salud y seguridad de la infraestructura:
- **Seguridad**: Alertas por uso de la cuenta root o intentos de acceso no autorizados.
- **Rendimiento de DynamoDB**: Alertas si la base de datos empieza a rechazar peticiones por exceso de carga.
- **Errores en API Gateway y Lambdas**: Alertas si la API o las funciones empiezan a fallar.

## **Conceptos Clave de Terraform Utilizados**

**Meta-Argumentos**

- for_each: Es la clave de la escalabilidad de este proyecto. Se usa en los módulos lambdas y apigateway_config para iterar sobre los mapas de locals y crear recursos dinámicamente. También se usa en log_management.tf para crear una alarma por cada función Lambda.
- depends_on: Se utiliza para definir dependencias explícitas. Por ejemplo, la API Gateway (aws_api_gateway_deployment) depende_de las integraciones de las Lambdas para asegurar que se despliegue solo después de que las Lambdas estén listas.
- dynamic: Se usa en el módulo dynamodb para crear bloques de configuración de forma dinámica. Por ejemplo, crea un bloque attribute por cada atributo y un bloque global_secondary_index por cada GSI que se le pase como variable.

**Funciones y Expresiones**

- local: Se usan para definir valores y mapas complejos que se reutilizan en toda la configuración, haciendo el código más limpio y fácil de mantener.
- jsonencode: Se usa para construir las políticas de IAM y S3 en formato JSON directamente desde la sintaxis de Terraform.
- lower(): Usada para convertir nombres a minúsculas, asegurando que los nombres de los buckets S3 sean válidos.

## **Cómo Desplegar el Proyecto**

1. **Configurar Credenciales de AWS**: Asegúrate de tener tus credenciales de AWS configuradas en tu terminal.
2. **Inicializar Terraform:**
    
    `terraform init`
    
3. **Planificar los Cambios**:
    
    `terraform plan`
    
4. **Aplicar los Cambios**:
    
    `terraform apply`