variable "lambda_role_arn" {
  description = "ARN del IAM Role que usarán las Lambdas"
  type        = string
}
variable "subnet_ids" {
  description = "IDs de las subnets para las funciones Lambda"
  type        = list(string)
  default     = []
}

variable "lambda_security_group_id" {
  description = "ID del security group para las funciones Lambda"
  type        = string
  default     = ""
}

variable "dynamodb_table_name" {
  description = "Nombre de la tabla DynamoDB"
  type        = string
  default     = "ClubData"
}

variable "getReservas_filename" {
  description = "Ruta del archivo ZIP de getReservas"
  type        = string
}

variable "getReservas_source_code_hash" {
  description = "Hash del código fuente de getReservas"
  type        = string
}

variable "registrar_usuario_subnet_ids" {
  type = list(string)
  description = "Subnet IDs para la lambda registrar_usuario"
}

variable "registrar_usuario_security_group_id" {
  type = string
  description = "Security Group ID para la lambda registrar_usuario"
}

variable "crearReserva_filename" {
  type = string
}

variable "crearReserva_source_code_hash" {
  type = string
}

variable "redirectBucket_filename" {
  description = "Path to the redirectBucket lambda zip file"
  type        = string
}

variable "redirectBucket_source_code_hash" {
  description = "Source code hash for redirectBucket lambda"
  type        = string
}

