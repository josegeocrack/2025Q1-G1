variable "nombre_bucket" {
  description = "Nombre del bucket S3"
  type        = string
}

variable "bucket_name_tag" {
  description = "Tag para el nombre del bucket"
  type        = string
}

variable "environment_tag" {
  description = "Tag para el ambiente"
  type        = string
}

variable "site_files" {
  description = "Set of files to upload to S3"
  type        = set(string)
  default     = []
}

variable "site_directory" {
  description = "Path to the site directory"
  type        = string
  default     = ""
}