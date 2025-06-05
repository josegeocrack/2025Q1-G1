### main.tf

provider "aws" {
  region = var.region
}

resource "aws_cognito_user_pool" "club_user_pool" {
  name = var.user_pool_name

  username_attributes = ["email"]

  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = false
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  lambda_config {
    post_confirmation = var.lambda_post_confirmation_arn
  }
}

resource "aws_cognito_user_pool_client" "club_user_pool_client" {
  name         = var.user_pool_client_name
  user_pool_id = aws_cognito_user_pool.club_user_pool.id

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_ADMIN_USER_PASSWORD_AUTH"
  ]

  generate_secret = false
}

resource "aws_cognito_user_pool_client" "user_pool_client" {
  user_pool_id = aws_cognito_user_pool.club_user_pool.id
  name         = var.user_pool_client_name

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  callback_urls                        = var.callback_urls
  logout_urls                          = var.logout_urls

  supported_identity_providers = ["COGNITO"]

  prevent_user_existence_errors = "ENABLED"
}

resource "aws_cognito_user_pool_domain" "user_pool_domain" {
  domain       = var.cognito_domain
  user_pool_id = aws_cognito_user_pool.club_user_pool.id
}

resource "aws_api_gateway_authorizer" "cognito_authorizer" {
  name             = "cognito-authorizer"
  rest_api_id      = var.api_gateway_rest_api_id
  authorizer_uri   = "arn:aws:cognito-idp:${var.region}:${var.account_id}:userpool/${aws_cognito_user_pool.club_user_pool.id}"
  type             = "COGNITO_USER_POOLS"
  identity_source  = "method.request.header.Authorization"
  provider_arns    = [aws_cognito_user_pool.club_user_pool.arn]
}
