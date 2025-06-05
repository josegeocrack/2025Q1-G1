module "s3" {
  source           = "./modules/s3"  # Ruta hacia el módulo
  nombre_bucket    = var.nombre_bucket   # Variable que ya debería estar definida
  bucket_name_tag  = "Front sistema vecinos" # Puedes cambiar estos valores si necesitas
  environment_tag  = "Prod"
}
module "dynamodb" {
  source               = "./modules/dynamodb"
  aws_region           = "us-east-1"
  dynamodb_table_name  = var.dynamodb_table_name
  project_name         = var.project_name
}

module "cognito" {
  source                    = "./modules/cognito"
  lambda_post_confirmation_arn = module.lambdas.registrar_usuario_arn
  region                    = var.region
  user_pool_name            = "club_user_pool"
  account_id = data.aws_caller_identity.current.account_id
  callback_urls           = ["${module.api_gateway.api_url}/redirectBucket"]
  logout_urls             = ["${module.api_gateway.api_url}/redirectBucket"]
  user_pool_client_name     = "club_user_pool_client"
  api_gateway_rest_api_id   = aws_api_gateway_rest_api.main.id
  cognito_domain="user-pool-micapanchi"

}

resource "aws_api_gateway_rest_api" "main" {
  name        = "api"
  description = "API de Terraform para quejas de vecinos"
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

resource "aws_security_group" "registrar_usuario_sg" {
  name        = "registrar-usuario-sg"
  description = "Security group for registrar_usuario lambda"
  vpc_id      = module.vpc.vpc_id
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "registrar-usuario-sg"
  }
}

module "api_gateway" {
  source                        = "./modules/apigateway"
  api_name                      = "api"
  api_description               = "API de Terraform"
  region = var.region
  rest_api_id                   = aws_api_gateway_rest_api.main.id
  rest_api_root_resource_id = aws_api_gateway_rest_api.main.root_resource_id
  rest_api_execution_arn = aws_api_gateway_rest_api.main.execution_arn
  cognito_authorizer_id         = module.cognito.authorizer_id
  redirect_lambda_uri           = aws_lambda_function.redirect.invoke_arn
  redirect_lambda_function_name = aws_lambda_function.redirect.function_name
  getReservas_lambda_uri        = module.lambdas.getReservas_invoke_arn
  getReservas_lambda_function_name = module.lambdas.getReservas_function_name
  crearReserva_lambda_uri        = module.lambdas.crearReserva_invoke_arn
  crearReserva_lambda_function_name = module.lambdas.crearReserva_function_name
  redirectBucket_lambda_uri = module.lambdas.redirectBucket_invoke_arn
  redirectBucket_lambda_function_name = module.lambdas.redirectBucket_function_name
  stage_name                    = "prod"
}

resource "aws_lambda_function" "redirect" {
  function_name = "redirect"
  role          = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/LabRole"
  handler       = "redirect.lambda_handler"
  runtime       = "python3.11"
  timeout       = 60
  memory_size   = 128
  filename = "output_lambda_functions/lambda_redirect_src.zip"
  source_code_hash = data.archive_file.redirect_code.output_base64sha256
  depends_on = [module.s3]
  environment {
    variables = {
      REDIRECT_URL = module.s3.website_endpoint
    }
  }
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
  source           = "./modules/dynamodb_endpoint"
  vpc_id           = module.vpc.vpc_id
  route_table_ids  = module.vpc.route_table_ids
}

module "lambdas" {
  source = "./modules/lambdas"
  lambda_role_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/LabRole"
  # *** AGREGAR ESTAS LÍNEAS ***
  subnet_ids = module.vpc.subnet_ids
  lambda_security_group_id = aws_security_group.lambda_sg.id
  dynamodb_table_name = var.dynamodb_table_name
  getReservas_filename = data.archive_file.getReservas_code.output_path
  getReservas_source_code_hash = data.archive_file.getReservas_code.output_base64sha256
  registrar_usuario_subnet_ids = module.vpc.subnet_ids
  registrar_usuario_security_group_id = aws_security_group.registrar_usuario_sg.id
  crearReserva_filename = data.archive_file.crearReserva_code.output_path
  crearReserva_source_code_hash = data.archive_file.crearReserva_code.output_base64sha256
  redirectBucket_filename = data.archive_file.redirectBucket_code.output_path
  redirectBucket_source_code_hash = data.archive_file.redirectBucket_code.output_base64sha256
}

resource "aws_lambda_permission" "allow_cognito_invoke" {
  statement_id  = "AllowExecutionFromCognito"
  action        = "lambda:InvokeFunction"
  function_name = module.lambdas.registrar_usuario_arn
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = module.cognito.cognito_pool_arn
}
