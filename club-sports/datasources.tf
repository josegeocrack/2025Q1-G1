data "aws_caller_identity" "current" {}

data "archive_file" "redirect_code" {
    type = "zip"
    source_file = "lambda_functions/redirect.py"
    output_path = "output_lambda_functions/lambda_redirect_src.zip"
}

data "aws_availability_zones" "available" {
  state = "available"
}

data "archive_file" "registrar_usuario_code" {
  type        = "zip"
  source_file = "lambda_functions/registrar_usuario.py"
  output_path = "output_lambda_functions/registrar_usuario.zip"
}

data "archive_file" "getReservas_code" {
    type = "zip"
    source_file = "lambda_functions/getReservas.py"
    output_path = "output_lambda_functions/lambda_getReservas_src.zip"
}

data "archive_file" "crearReserva_code" {
    type = "zip"
    source_file = "lambda_functions/crearReserva.py"
    output_path = "output_lambda_functions/lambda_crearReserva_src.zip"
}

data "archive_file" "redirectBucket_code" {
  type        = "zip"
  source_file = "lambda_functions/redirectBucket.py"
  output_path = "output_lambda_functions/lambda_redirectBucket_src.zip"
}
