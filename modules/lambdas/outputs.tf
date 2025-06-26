# Outputs genéricos y reutilizables para el módulo Lambda
output "lambda_arns" {
  description = "ARNs de todas las funciones Lambda"
  value = {
    for key, function in aws_lambda_function.functions : key => function.arn
  }
}

output "lambda_function_names" {
  description = "Nombres de todas las funciones Lambda"
  value = {
    for key, function in aws_lambda_function.functions : key => function.function_name
  }
}

output "lambda_invoke_arns" {
  description = "ARNs de invocación de todas las funciones Lambda"
  value = {
    for key, function in aws_lambda_function.functions : key => function.invoke_arn
  }
}