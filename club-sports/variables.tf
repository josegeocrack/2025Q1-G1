variable "nombre_bucket" {
  description = "Nombre único para el bucket de S3"
  type        = string
}
variable "dynamodb_table_name" {
  description = "Nombre de la tabla DynamoDB"
  type        = string
  default     = "ClubData"
}
variable "project_name" {
  description = "Nombre del proyecto para etiquetado"
  type        = string
  default     = "ClubBarrio"
}

variable "region" {
  default = "us-east-1"
}

variable "nombre_cognito" {
  description = "nombre del cognito user pool"
  type = string
}

variable "rest_api_id" {
  description = "ID del API Gateway existente"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
}

variable "vpc_name" {
  description = "Name of the VPC"
  type        = string
}

variable "cant_AZ" {
  description = "The number of availability zones"
  type        = number
}