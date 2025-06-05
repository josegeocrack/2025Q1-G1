variable "nombre_bucket" {
  description = "Nombre único para el bucket de S3"
  type        = string
}

variable "bucket_name_tag" {
  description = "Tag Name para el bucket"
  type        = string
  default     = "TP Cloud Estatico"
}

variable "environment_tag" {
  description = "Tag de entorno para el bucket"
  type        = string
  default     = "Prod"
}

output "website_endpoint" {
  value = aws_s3_bucket_website_configuration.static_site_config.website_endpoint
}