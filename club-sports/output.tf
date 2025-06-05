# Output para obtener la URL del sitio web estático
output "website_url" {
  value       = module.s3.website_endpoint
  description = "URL del sitio web estático"
}
output "dynamodb_table_name" {
  description = "Nombre de la tabla DynamoDB creada"
  value       = module.dynamodb.dynamodb_table_name
}

output "dynamodb_table_arn" {
  description = "ARN de la tabla DynamoDB"
  value       = module.dynamodb.dynamodb_table_arn
}
#Output para obtener la URL del Hosted UI de Cognito
output "cognito_hosted_ui_url" {
  value = "https://${module.cognito.user_pool_domain}.auth.us-east-1.amazoncognito.com/login?client_id=${module.cognito.user_pool_client_id}&response_type=code&scope=openid&redirect_uri=${module.api_gateway.api_url}/redirectBucket"
  description = "Hosted UI URL for Cognito"
}

#Output id user pool
output "user_pool_id" {
  value = module.cognito.user_pool_client_id
  description = "user pool id"
}

output "cognito_domain" {
    value = module.cognito.user_pool_domain
}