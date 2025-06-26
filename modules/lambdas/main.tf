# Crear funciones Lambda dinámicamente basadas en la configuración
resource "aws_lambda_function" "functions" {
  for_each = var.lambda_functions

  function_name = each.key
  filename      = each.value.filename
  source_code_hash = each.value.source_code_hash
  handler       = each.value.handler
  runtime       = each.value.runtime
  role          = var.lambda_role_arn
  timeout       = lookup(each.value, "timeout", 60)
  memory_size   = lookup(each.value, "memory_size", 128)

  # Configuración de VPC solo si no se especifica attach_vpc = false
  dynamic "vpc_config" {
    for_each = lookup(each.value, "attach_vpc", true) ? [1] : []
    content {
      subnet_ids         = var.subnet_ids
      security_group_ids = [var.lambda_security_group_id]
    }
  }

  # Variables de entorno
  dynamic "environment" {
    for_each = lookup(each.value, "env_vars", {}) != {} ? [1] : []
    content {
      variables = each.value.env_vars
    }
  }
}

# Permisos para EventBridge (sendReminder)
resource "aws_lambda_permission" "eventbridge_permissions" {
  for_each = {
    for key, config in var.lambda_functions : key => config
    if key == "sendReminder"
  }

  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.functions[each.key].function_name
  principal     = "events.amazonaws.com"
  source_arn    = "arn:aws:events:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:rule/*"
}

# Data sources para obtener información de la cuenta y región
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}