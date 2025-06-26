variable "api_name" {
  description = "Nombre de la API Gateway"
  type        = string
}

variable "api_description" {
  description = "Descripción de la API Gateway"
  type        = string
}

variable "region" {
  description = "Región de AWS"
  type        = string
}

variable "rest_api_id" {
  description = "ID del REST API"
  type        = string
}

variable "rest_api_root_resource_id" {
  description = "ID del recurso raíz del REST API"
  type        = string
}

variable "rest_api_execution_arn" {
  description = "ARN de ejecución del REST API"
  type        = string
}

variable "cognito_authorizer_id" {
  description = "ID del autorizador de Cognito"
  type        = string
}

variable "stage_name" {
  description = "Nombre del stage"
  type        = string
}

variable "api_resources" {
  description = "Configuración de recursos y métodos de la API"
  type = map(object({
    path_part = string
    methods = map(object({
      integration_type     = string
      lambda_function_name = optional(string)
      lambda_uri           = optional(string)
      http_method          = string
      authorization        = string
    }))
  }))
} 