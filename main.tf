module "s3_website" {
  source           = "./modules/s3"
  nombre_bucket    = var.nombre_bucket
  bucket_name_tag  = var.bucket_name_tag
  environment_tag  = var.environment_tag
  site_files       = local.site_files
  site_directory   = "${path.module}/site"
  depends_on       = [local_file.api_config] 
}

module "dynamodb" {
  source              = "./modules/dynamodb"
  dynamodb_table_name = var.dynamodb_table_name
  project_name        = var.project_name
  hash_key            = "PK"
  range_key           = "SK"

  attributes = [
    { name = "PK",      type = "S" },
    { name = "SK",      type = "S" },
    { name = "fecha",   type = "S" },
    { name = "user_id", type = "S" }
  ]

  global_secondary_indexes = [
    {
      name            = "user_id-fecha-index"
      hash_key        = "user_id"
      range_key       = "fecha"
      projection_type = "ALL"
    }
  ]
}

module "cognito" {
  source                  = "./modules/cognito"
  lambda_post_confirmation_arn = module.lambdas.lambda_arns["registrar_usuario"]
  user_pool_name          = var.user_pool_name
  account_id              = data.aws_caller_identity.current.account_id
  callback_urls           = ["${module.api_gateway.api_url}/redirectBucket"]
  logout_urls             = ["${module.api_gateway.api_url}/redirectBucket"]
  user_pool_client_name   = var.club_user_pool_client_name
  api_gateway_rest_api_id = aws_api_gateway_rest_api.main.id
  cognito_domain          = var.nombre_cognito
}

resource "aws_api_gateway_rest_api" "main" {
  name        = "api"
  description = "API de Terraform"
}

resource "aws_security_group" "lambda_sg" {
  name        = "lambda-sg"
  description = "Security group para lambdas"
  vpc_id      = module.vpc.vpc_id
  
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "lambda-security-group"
  }
}

module "api_gateway" {
  source                        = "./modules/apigateway_config"
  api_name                      = "api"
  api_description               = "API de Terraform"
  region                        = var.region
  rest_api_id                   = aws_api_gateway_rest_api.main.id
  rest_api_root_resource_id     = aws_api_gateway_rest_api.main.root_resource_id
  rest_api_execution_arn        = aws_api_gateway_rest_api.main.execution_arn
  cognito_authorizer_id         = module.cognito.authorizer_id
  api_resources                 = local.api_resources
  stage_name                    = "prod"

  depends_on = [module.lambdas]
}

module "vpc" {
  source  = "./modules/vpc"
  vpc_name = var.vpc_name
  vpc_cidr = var.vpc_cidr
  cant_AZ  = var.cant_AZ
  subnets  = [
    for i in range(var.cant_AZ) : {
      name              = "${var.vpc_name}-subnet-${i+1}"
      availability_zone = data.aws_availability_zones.available.names[i]
    }
  ]
}

module "dynamodb_endpoint" {
  source           = "./modules/vpc_endpoint"
  vpc_id           = module.vpc.vpc_id
  route_table_ids  = module.vpc.route_table_ids
}

resource "aws_security_group" "vpc_endpoint_sg" {
  name        = "vpc-endpoint-sg"
  description = "Security group for SQS VPC endpoint"
  vpc_id      = module.vpc.vpc_id
  
  # Permitir conexiones INGRESS desde lambdas al puerto 443
  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.lambda_sg.id]
  }
  
  tags = {
    Name = "VPC Endpoint Security Group"
  }
}

resource "aws_vpc_endpoint" "sqs" {
  vpc_id              = module.vpc.vpc_id
  service_name        = "com.amazonaws.us-east-1.sqs"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = module.vpc.subnet_ids
  security_group_ids  = [aws_security_group.vpc_endpoint_sg.id]
  
  private_dns_enabled = true
  
  policy = jsonencode({
    Statement = [
      {
        Effect = "Allow"
        Principal = "*"
        Action = [
          "sqs:*"
        ]
        Resource = "*"
      }
    ]
  })
  
  tags = {
    Name = "SQS VPC Endpoint"
  }
}

# *** SNS TOPIC PARA RECORDATORIOS ***
resource "aws_sns_topic" "club_reminders" {
  name = "club-reminders"
  
  tags = {
    Name = "Club Sports Reminders"
    Environment = "prod"
  }
}

# *** SQS QUEUE PARA RECORDATORIOS ***
resource "aws_sqs_queue" "reminders_queue" {
  name                      = "club-reminders-queue"
  delay_seconds             = 0
  max_message_size          = 2048
  message_retention_seconds = 1209600  # 14 días
  receive_wait_time_seconds = 10
  visibility_timeout_seconds = 360     # 6 minutos
  
  tags = {
    Name = "Club Reminders Queue"
    Environment = "prod"
  }
}

# *** SQS QUEUE PARA cancelar RECORDATORIOS ***
resource "aws_sqs_queue" "cancel_reminders_queue" {
  name                      = "cancel-reminders-queue"
  delay_seconds             = 0
  max_message_size          = 2048
  message_retention_seconds = 1209600  # 14 días
  receive_wait_time_seconds = 10
  visibility_timeout_seconds = 360     # 6 minutos
  
  tags = {
    Name = "Club Cancel Reminders Queue"
    Environment = "prod"
  }
}

module "lambdas" {
  source                   = "./modules/lambdas"
  lambda_role_arn          = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/LabRole"
  subnet_ids               = module.vpc.subnet_ids
  lambda_security_group_id = aws_security_group.lambda_sg.id
  lambda_functions         = local.lambda_functions
}

# En el main.tf principal, después del módulo lambdas:
resource "aws_lambda_event_source_mapping" "process_reminders" {
  event_source_arn = aws_sqs_queue.reminders_queue.arn
  function_name    = module.lambdas.lambda_arns["processReminders"]
  enabled          = true
}

resource "aws_lambda_event_source_mapping" "process_cancel_reminders" {
  event_source_arn = aws_sqs_queue.cancel_reminders_queue.arn
  function_name    = module.lambdas.lambda_arns["processCancelReminder"]
  enabled          = true
}

resource "aws_lambda_permission" "allow_cognito_invoke" {
  statement_id  = "AllowExecutionFromCognito"
  action        = "lambda:InvokeFunction"
  function_name = module.lambdas.lambda_function_names["registrar_usuario"]
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = module.cognito.cognito_pool_arn
}

# Output para obtener la URL del API
output "api_invoke_url" {
  value = module.api_gateway.api_url
}

# Configuración del archivo config.js
resource "local_file" "api_config" {
  content = <<-EOT
    window.CLUB_SPORTS_CONFIG = {
      userPoolId: "${module.cognito.user_pool_id}",
      clientId: "${module.cognito.user_pool_client_id}", 
      cognitoDomain: "${module.cognito.cognito_domain_name}",
      redirectUri: "${module.api_gateway.api_url}/redirectBucket",
      apiBaseUrl: "${module.api_gateway.api_url}",
      region: "${var.region}",
      environment: "production"
    };
    console.log("🔧 Elite Sports Club configuration loaded:", window.CLUB_SPORTS_CONFIG);
  EOT
  filename = "${path.module}/build/config.js"
}