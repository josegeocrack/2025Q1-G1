# Crear recurso /redirectBucket
resource "aws_api_gateway_resource" "redirect_resource" {
  rest_api_id = var.rest_api_id
  parent_id   = var.rest_api_root_resource_id # (ver nota abajo)
  path_part   = "redirectBucket"
}

# Método GET vinculado a Lambda redirect
resource "aws_api_gateway_method" "redirect_method" {
  rest_api_id   = var.rest_api_id
  resource_id   = aws_api_gateway_resource.redirect_resource.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "redirect_integration" {
  http_method             = aws_api_gateway_method.redirect_method.http_method
  resource_id             = aws_api_gateway_resource.redirect_resource.id
  rest_api_id             = var.rest_api_id
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.redirect_lambda_uri
}

resource "aws_api_gateway_deployment" "deployment" {
  rest_api_id = var.rest_api_id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.redirect_resource.id,
      aws_api_gateway_method.redirect_method.id,
      aws_api_gateway_resource.check_availability_resource.id,
      aws_api_gateway_method.getReservas_method.id,
      aws_api_gateway_integration.getReservas_integration.id,
      aws_api_gateway_method.getReservas_options_method.id,
      aws_api_gateway_integration.getReservas_options_integration.id,
      aws_api_gateway_method_response.getReservas_method_response.id,
      aws_api_gateway_integration_response.getReservas_integration_response.id,
      aws_api_gateway_resource.create_reservation_resource.id,
      aws_api_gateway_method.crearReserva_method.id,
      aws_api_gateway_integration.crearReserva_integration.id,
      aws_api_gateway_method_response.crearReserva_method_response.id,
      aws_api_gateway_integration_response.crearReserva_integration_response.id,
      aws_api_gateway_method.crearReserva_options_method.id,
      aws_api_gateway_integration.crearReserva_options_integration.id,
      aws_api_gateway_method_response.crearReserva_options_method_response.id,
      aws_api_gateway_integration_response.crearReserva_options_integration_response.id
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_integration.redirect_integration,
    aws_api_gateway_integration.getReservas_integration,
    aws_api_gateway_integration.getReservas_options_integration,
    aws_api_gateway_integration.crearReserva_integration,
    aws_api_gateway_integration.crearReserva_options_integration
  ]
}

resource "aws_api_gateway_stage" "stage" {
  rest_api_id   = var.rest_api_id
  deployment_id = aws_api_gateway_deployment.deployment.id
  stage_name    = var.stage_name
}

# Permisos de invocación Lambda para el método redirect
resource "aws_lambda_permission" "apigw_redirect_permission" {
  statement_id  = "AllowExecutionFromAPIGatewayRedirect"
  action        = "lambda:InvokeFunction"
  function_name = var.redirect_lambda_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.rest_api_execution_arn}/*/*/*"
}

# Crear recurso /check-availability
resource "aws_api_gateway_resource" "check_availability_resource" {
  rest_api_id = var.rest_api_id
  parent_id   = var.rest_api_root_resource_id
  path_part   = "check-availability"
}

# *** NUEVO RECURSO: /create-reservation ***
resource "aws_api_gateway_resource" "create_reservation_resource" {
  rest_api_id = var.rest_api_id
  parent_id   = var.rest_api_root_resource_id
  path_part   = "create-reservation"
}

# *** MÉTODO POST CON AUTENTICACIÓN ***
resource "aws_api_gateway_method" "crearReserva_method" {
  rest_api_id   = var.rest_api_id
  resource_id   = aws_api_gateway_resource.create_reservation_resource.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"  # ← CAMBIAR ESTO
  authorizer_id = var.cognito_authorizer_id  # ← DESCOMENTAR ESTO
}

# *** INTEGRACIÓN CON LAMBDA ***
resource "aws_api_gateway_integration" "crearReserva_integration" {
  rest_api_id = var.rest_api_id
  resource_id = aws_api_gateway_resource.create_reservation_resource.id
  http_method = aws_api_gateway_method.crearReserva_method.http_method
  
  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = var.crearReserva_lambda_uri
}

# *** RESPONSE Y CORS (como los otros) ***
resource "aws_api_gateway_method_response" "crearReserva_method_response" {
  rest_api_id = var.rest_api_id
  resource_id = aws_api_gateway_resource.create_reservation_resource.id
  http_method = aws_api_gateway_method.crearReserva_method.http_method
  status_code = "200"
  
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

resource "aws_api_gateway_integration_response" "crearReserva_integration_response" {
  rest_api_id = var.rest_api_id
  resource_id = aws_api_gateway_resource.create_reservation_resource.id
  http_method = aws_api_gateway_method.crearReserva_method.http_method
  status_code = aws_api_gateway_method_response.crearReserva_method_response.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'"
  }
  depends_on = [aws_api_gateway_integration.crearReserva_integration]
}

# *** MÉTODO OPTIONS PARA create-reservation ***
resource "aws_api_gateway_method" "crearReserva_options_method" {
  rest_api_id   = var.rest_api_id
  resource_id   = aws_api_gateway_resource.create_reservation_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# *** INTEGRACIÓN OPTIONS PARA create-reservation ***
resource "aws_api_gateway_integration" "crearReserva_options_integration" {
  http_method = aws_api_gateway_method.crearReserva_options_method.http_method
  resource_id = aws_api_gateway_resource.create_reservation_resource.id
  rest_api_id = var.rest_api_id
  type        = "MOCK"
  
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

# *** METHOD RESPONSE OPTIONS ***
resource "aws_api_gateway_method_response" "crearReserva_options_method_response" {
  rest_api_id = var.rest_api_id
  resource_id = aws_api_gateway_resource.create_reservation_resource.id
  http_method = aws_api_gateway_method.crearReserva_options_method.http_method
  status_code = "200"
  
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

# *** INTEGRATION RESPONSE OPTIONS ***
resource "aws_api_gateway_integration_response" "crearReserva_options_integration_response" {
  rest_api_id = var.rest_api_id
  resource_id = aws_api_gateway_resource.create_reservation_resource.id
  http_method = aws_api_gateway_method.crearReserva_options_method.http_method
  status_code = aws_api_gateway_method_response.crearReserva_options_method_response.status_code
  
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'",
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'",
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
  }
  
  depends_on = [aws_api_gateway_integration.crearReserva_options_integration]
}

# *** PERMISO LAMBDA ***
resource "aws_lambda_permission" "apigw_crearReserva_permission" {
  statement_id  = "AllowExecutionFromAPIGatewayCrearReserva"
  action        = "lambda:InvokeFunction"
  function_name = var.crearReserva_lambda_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.rest_api_execution_arn}/*/POST/create-reservation"
}


# Método POST con autenticación Cognito
resource "aws_api_gateway_method" "getReservas_method" {
  rest_api_id   = var.rest_api_id
  resource_id   = aws_api_gateway_resource.check_availability_resource.id
  http_method   = "POST"
  authorization = "NONE"
  authorizer_id = var.cognito_authorizer_id
}

# Método OPTIONS para CORS
resource "aws_api_gateway_method" "getReservas_options_method" {
  rest_api_id   = var.rest_api_id
  resource_id   = aws_api_gateway_resource.check_availability_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Integración POST con Lambda
resource "aws_api_gateway_integration" "getReservas_integration" {
  http_method             = aws_api_gateway_method.getReservas_method.http_method
  resource_id             = aws_api_gateway_resource.check_availability_resource.id
  rest_api_id             = var.rest_api_id
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.getReservas_lambda_uri
}

# Integración OPTIONS para CORS
resource "aws_api_gateway_integration" "getReservas_options_integration" {
  http_method = aws_api_gateway_method.getReservas_options_method.http_method
  resource_id = aws_api_gateway_resource.check_availability_resource.id
  rest_api_id = var.rest_api_id
  type        = "MOCK"
  
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

# Method Response para POST
resource "aws_api_gateway_method_response" "getReservas_method_response" {
  rest_api_id = var.rest_api_id
  resource_id = aws_api_gateway_resource.check_availability_resource.id
  http_method = aws_api_gateway_method.getReservas_method.http_method
  status_code = "200"
  
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

# Method Response para OPTIONS
resource "aws_api_gateway_method_response" "getReservas_options_method_response" {
  rest_api_id = var.rest_api_id
  resource_id = aws_api_gateway_resource.check_availability_resource.id
  http_method = aws_api_gateway_method.getReservas_options_method.http_method
  status_code = "200"
  
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
  }
}

# Integration Response para POST
resource "aws_api_gateway_integration_response" "getReservas_integration_response" {
  rest_api_id = var.rest_api_id
  resource_id = aws_api_gateway_resource.check_availability_resource.id
  http_method = aws_api_gateway_method.getReservas_method.http_method
  status_code = aws_api_gateway_method_response.getReservas_method_response.status_code
  
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'"
  }
  
  depends_on = [aws_api_gateway_integration.getReservas_integration]
}

# Integration Response para OPTIONS
resource "aws_api_gateway_integration_response" "getReservas_options_integration_response" {
  rest_api_id = var.rest_api_id
  resource_id = aws_api_gateway_resource.check_availability_resource.id
  http_method = aws_api_gateway_method.getReservas_options_method.http_method
  status_code = aws_api_gateway_method_response.getReservas_options_method_response.status_code
  
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'",
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'",
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
  }
  
  depends_on = [aws_api_gateway_integration.getReservas_options_integration]
}

# Permisos de invocación Lambda para getReservas
resource "aws_lambda_permission" "apigw_getReservas_permission" {
  statement_id  = "AllowExecutionFromAPIGatewayGetReservas"
  action        = "lambda:InvokeFunction"
  function_name = var.getReservas_lambda_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.rest_api_execution_arn}/*/POST/check-availability"
}