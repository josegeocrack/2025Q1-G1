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
  description = "nombre del cognito domain"
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

variable "bucket_name_tag" {
  description = "Tag for the S3 bucket"
  type        = string
  default     = "Front sistema club"
}

variable "environment_tag" {
  description = "Environment tag"
  type        = string
  default     = "Prod"
}

variable "user_pool_name" {
  description = "Cognito user pool name"
  type        = string
  default     = "club_user_pool"
}

variable "club_user_pool_client_name" {
  description = "Cognito user pool client name"
  type        = string
  default     = "club_user_pool_client"
}