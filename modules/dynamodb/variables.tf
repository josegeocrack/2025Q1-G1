variable "dynamodb_table_name" {
  description = "Nombre de la tabla DynamoDB"
  type        = string
}

variable "project_name" {
  description = "Nombre del proyecto para los tags"
  type        = string
}

variable "billing_mode" {
  description = "Modo de facturación (PAY_PER_REQUEST o PROVISIONED)"
  type        = string
  default     = "PAY_PER_REQUEST"
}

variable "hash_key" {
  description = "El nombre del atributo de la clave de hash de la tabla"
  type        = string
}

variable "range_key" {
  description = "El nombre del atributo de la clave de rango de la tabla (opcional)"
  type        = string
  default     = null
}

variable "attributes" {
  description = "Lista de TODOS los atributos que actuarán como claves (primaria o en GSIs)"
  type = list(object({
    name = string
    type = string
  }))
  default = []
}

variable "global_secondary_indexes" {
  description = "Lista de los Índices Secundarios Globales (GSI) para la tabla"
  type = list(object({
    name            = string
    hash_key        = string
    range_key       = string
    projection_type = string
  }))
  default = []
}

variable "point_in_time_recovery_enabled" {
  description = "Habilita la recuperación a un punto en el tiempo (PITR)"
  type        = bool
  default     = true
}

variable "server_side_encryption_enabled" {
  description = "Habilita el cifrado del lado del servidor"
  type        = bool
  default     = true
}