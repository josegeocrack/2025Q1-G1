variable "lambda_role_arn" {
  description = "ARN del rol de IAM para las funciones Lambda"
  type        = string
}

variable "subnet_ids" {
  description = "IDs de las subnets para las funciones Lambda"
  type        = list(string)
}

variable "lambda_security_group_id" {
  description = "ID del security group para las funciones Lambda"
  type        = string
}

variable "lambda_functions" {
  description = "Configuración de las funciones Lambda"
  type = map(object({
    filename         = string
    source_code_hash = string
    handler          = string
    runtime          = string
    timeout          = optional(number, 60)
    memory_size      = optional(number, 128)
    attach_vpc       = optional(bool, true)
    env_vars         = optional(map(string), {})
  }))
}