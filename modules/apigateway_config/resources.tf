resource "aws_api_gateway_resource" "resource" {
  for_each    = var.api_resources
  rest_api_id = var.rest_api_id
  parent_id   = var.rest_api_root_resource_id
  path_part   = each.value.path_part
}

locals {
  api_method_map = {
    for item in flatten([
      for res_key, res in var.api_resources : [
        for method_key, method in res.methods : {
          key                  = "${res_key}_${method_key}"
          res_key              = res_key
          method_key           = method_key
          http_method          = method.http_method
          authorization        = method.authorization
          integration_type     = method.integration_type
          lambda_uri           = try(method.lambda_uri, null)
          lambda_function_name = try(method.lambda_function_name, null)
          path_part            = res.path_part
        }
      ]
    ]) : item.key => item
  }
}

resource "aws_api_gateway_method" "method" {
  for_each      = local.api_method_map
  rest_api_id   = var.rest_api_id
  resource_id   = aws_api_gateway_resource.resource[each.value.res_key].id
  http_method   = each.value.http_method
  authorization = each.value.authorization
  authorizer_id = each.value.authorization == "COGNITO_USER_POOLS" ? var.cognito_authorizer_id : null
}

resource "aws_api_gateway_integration" "integration" {
  for_each = {
    for k, v in local.api_method_map : k => v
    if v.integration_type == "AWS_PROXY"
  }
  rest_api_id             = var.rest_api_id
  resource_id             = aws_api_gateway_resource.resource[each.value.res_key].id
  http_method             = each.value.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = each.value.lambda_uri

  depends_on = [aws_api_gateway_method.method]
}

resource "aws_api_gateway_integration" "mock" {
  for_each = {
    for k, v in local.api_method_map : k => v
    if v.integration_type == "MOCK"
  }
  rest_api_id       = var.rest_api_id
  resource_id       = aws_api_gateway_resource.resource[each.value.res_key].id
  http_method       = each.value.http_method
  type              = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }

  depends_on = [aws_api_gateway_method.method]
}

resource "aws_lambda_permission" "permission" {
  for_each = {
    for k, v in local.api_method_map : k => v
    if v.integration_type == "AWS_PROXY"
  }
  statement_id  = "AllowExecutionFromAPIGateway${each.key}"
  action        = "lambda:InvokeFunction"
  function_name = each.value.lambda_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.rest_api_execution_arn}/*/${each.value.http_method}/${each.value.path_part}"
}

resource "aws_api_gateway_method_response" "options" {
  for_each = {
    for k, v in local.api_method_map : k => v
    if v.http_method == "OPTIONS"
  }
  rest_api_id = var.rest_api_id
  resource_id = aws_api_gateway_resource.resource[each.value.res_key].id
  http_method = "OPTIONS"
  status_code = "200"

  response_models = {
    "application/json" = "Empty"
  }

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true
    "method.response.header.Access-Control-Allow-Methods"     = true
    "method.response.header.Access-Control-Allow-Origin"      = true
    "method.response.header.Access-Control-Allow-Credentials" = true
  }

  depends_on = [aws_api_gateway_method.method]
}

resource "aws_api_gateway_integration_response" "options" {
  for_each = {
    for k, v in local.api_method_map : k => v
    if v.http_method == "OPTIONS"
  }
  rest_api_id = var.rest_api_id
  resource_id = aws_api_gateway_resource.resource[each.value.res_key].id
  http_method = "OPTIONS"
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods"     = "'GET,POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"      = "'*'"
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }

  depends_on = [
    aws_api_gateway_method_response.options,
    aws_api_gateway_integration.mock
  ]
}