resource "aws_lambda_function" "registrar_usuario" {
  function_name     = "registrar_usuario"
  filename          = "${path.module}/../../output_lambda_functions/registrar_usuario.zip"
  source_code_hash  = filebase64sha256("${path.module}/../../output_lambda_functions/registrar_usuario.zip")
  handler           = "registrar_usuario.lambda_handler"
  runtime           = "python3.12"
  role              = var.lambda_role_arn
  timeout           = 10

  # *** AGREGAR VPC CONFIG CON SU PROPIO SECURITY GROUP ***
  vpc_config {
    subnet_ids         = var.registrar_usuario_subnet_ids
    security_group_ids = [var.registrar_usuario_security_group_id]
  }
}

resource "aws_lambda_function" "getReservas" {
  function_name     = "getReservas"
  filename          = var.getReservas_filename
  source_code_hash  = var.getReservas_source_code_hash
  handler           = "getReservas.lambda_handler"
  runtime           = "python3.11"
  role              = var.lambda_role_arn
  timeout           = 60
  memory_size       = 128
  
  # VPC CONFIGURATION
  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = [var.lambda_security_group_id]
  }
  
  environment {
    variables = {
      DYNAMODB_TABLE_NAME = var.dynamodb_table_name
    }
  }
}

resource "aws_lambda_function" "crearReserva" {
  function_name     = "crearReserva"
  filename          = var.crearReserva_filename
  source_code_hash  = var.crearReserva_source_code_hash
  handler           = "crearReserva.lambda_handler"
  runtime           = "python3.11"
  role              = var.lambda_role_arn
  timeout           = 60
  memory_size       = 128
  
  # VPC CONFIGURATION (igual que getReservas)
  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = [var.lambda_security_group_id]
  }
  
  environment {
    variables = {
      DYNAMODB_TABLE_NAME = var.dynamodb_table_name
    }
  }
}

resource "aws_lambda_function" "redirectBucket" {
  function_name     = "redirectBucket"
  filename          = var.redirectBucket_filename
  source_code_hash  = var.redirectBucket_source_code_hash
  handler           = "redirectBucket.lambda_handler"
  runtime           = "python3.9"
  role              = var.lambda_role_arn  # ← CAMBIAR ESTA LÍNEA
  timeout           = 60
}