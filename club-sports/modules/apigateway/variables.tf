variable "api_name" {
  description = "Nombre del API Gateway"
  type        = string
}

variable "api_description" {
  description = "Descripción del API Gateway"
  type        = string
}

variable "rest_api_id" {
  description = "ID del API Gateway existente"
  type        = string
}

variable "cognito_authorizer_id" {
  description = "ID del autorizador de Cognito"
  type        = string
}

variable "rest_api_execution_arn" {
  description = "Execution ARN del API Gateway"
  type        = string
}

variable "rest_api_root_resource_id" {
  description = "ID del recurso raíz del API Gateway"
  type        = string
}

variable "stage_name" {
  description = "Nombre del stage para el despliegue de API Gateway"
  type        = string
}

variable "redirect_lambda_uri" {
  description = "URI de la función Lambda para el método redirect"
  type        = string
}
variable "redirect_lambda_function_name" {
  description = "Nombre de la función Lambda para el método redirect"
  type        = string
}

variable "region" {
  description = "Región AWS"
  type        = string
}
variable "getReservas_lambda_uri" {
  type        = string
  description = "URI de la función Lambda para getReservas"
}

variable "getReservas_lambda_function_name" {
  type        = string
  description = "Nombre de la función Lambda para getReservas"
}

variable "crearReserva_lambda_uri" {
  description = "URI de la función Lambda para crearReserva"
  type        = string
}

variable "crearReserva_lambda_function_name" {
  description = "Nombre de la función Lambda para crearReserva"
  type        = string
}

variable "redirectBucket_lambda_uri" {
  description = "URI de la función Lambda para redirectBucket"
  type        = string
}

variable "redirectBucket_lambda_function_name" {
  description = "Nombre de la función Lambda para redirectBucket"
  type        = string
}