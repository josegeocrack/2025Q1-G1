### variables.tf

variable "region" {
  default = "us-east-1"
}

variable "user_pool_name" {
  default = "club_user_pool"
}

variable "user_pool_client_name" {
  default = "club_user_pool_client"
}

variable "api_gateway_rest_api_id" {
  description = "ID de la API Gateway para el authorizer de Cognito"
  type        = string
}

variable "cognito_domain" {
  description = "Dominio de Cognito único"
  type        = string
}

variable "callback_urls" {
  description = "Lista de URLs de callback permitidas"
  type        = list(string)
}

variable "logout_urls" {
  description = "Lista de URLs de logout permitidas"
  type        = list(string)
}

variable "account_id" {
  description = "ID de la cuenta de AWS"
  type        = string
}

variable "lambda_post_confirmation_arn" {
  type = string
}
