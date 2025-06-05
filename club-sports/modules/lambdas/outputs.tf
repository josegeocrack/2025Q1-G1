output "registrar_usuario_arn" {
  value = aws_lambda_function.registrar_usuario.arn
}
output "getReservas_arn" {
  value = aws_lambda_function.getReservas.arn
}

output "getReservas_invoke_arn" {
  value = aws_lambda_function.getReservas.invoke_arn
}

output "getReservas_function_name" {
  value = aws_lambda_function.getReservas.function_name
}

output "crearReserva_invoke_arn" {
  value = aws_lambda_function.crearReserva.invoke_arn
}

output "crearReserva_function_name" {
  value = aws_lambda_function.crearReserva.function_name
}

output "redirectBucket_invoke_arn" {
  value = aws_lambda_function.redirectBucket.invoke_arn
}

output "redirectBucket_function_name" {
  value = aws_lambda_function.redirectBucket.function_name
}