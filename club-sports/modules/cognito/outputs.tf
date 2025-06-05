### outputs.tf

output "user_pool_id" {
  value = aws_cognito_user_pool.club_user_pool.id
}

output "user_pool_client_id" {
  value = aws_cognito_user_pool_client.club_user_pool_client.id
}

output "user_pool_arn" {
  description = "arn del pool de usuarios de Cognito"
  value       = aws_cognito_user_pool.club_user_pool.arn
}

output "user_pool_domain" {
  description = "Dominio del pool de usuarios de Cognito"
  value       = aws_cognito_user_pool_domain.user_pool_domain.domain
}

output "authorizer_id" {
  description = "ID del authorizer de API Gateway"
  value       = aws_api_gateway_authorizer.cognito_authorizer.id
}

output "cognito_pool_arn" {
  value = aws_cognito_user_pool.club_user_pool.arn
}
