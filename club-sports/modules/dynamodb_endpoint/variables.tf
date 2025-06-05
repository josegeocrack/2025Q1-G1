variable "vpc_id" {
  type        = string
  description = "ID de la VPC"
}

variable "route_table_ids" {
  type        = list(string)
  description = "IDs de las tablas de rutas"
}