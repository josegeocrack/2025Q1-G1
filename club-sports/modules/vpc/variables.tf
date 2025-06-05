#Voy a tener las variables que le voy a pasar al module 
#Estas despues las voy a definir en terraform.tfvars

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
}

variable "vpc_name" {
  description = "Name of the VPC"
  type        = string
}

#A las subnets les paso la cantidad de AZs que quiero
variable "cant_AZ" {
  description = "The number of availability zones to use"
  type        = number
}

# Variable para generar subnets dinámicamente
variable "subnets" {
  description = "List of subnets to create"
  type = list(object({
    name              = string
    availability_zone = string
  }))
}

variable "region" {
  description = "The AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}