# Create a separate S3 bucket for CloudTrail logs
resource "aws_s3_bucket" "cloudtrail_logs" {
  bucket = "${lower(var.project_name)}-cloudtrail-logs-${random_string.bucket_suffix.result}"

  tags = {
    Name        = "${var.project_name}-cloudtrail-logs"
    Environment = var.environment_tag
    Project     = var.project_name
  }
}

# Random string for unique bucket name
resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

# S3 bucket policy for CloudTrail
resource "aws_s3_bucket_policy" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect    = "Allow",
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        },
        Action    = "s3:PutObject",
        Resource  = "${aws_s3_bucket.cloudtrail_logs.arn}/AWSLogs/*"
      },
      {
        Effect    = "Allow",
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        },
        Action    = "s3:GetBucketAcl",
        Resource  = aws_s3_bucket.cloudtrail_logs.arn
      }
    ]
  })
}

# CloudTrail for security monitoring and compliance
resource "aws_cloudtrail" "main" {
  name                          = "club-sports-trail"
  s3_bucket_name               = aws_s3_bucket.cloudtrail_logs.bucket
  is_multi_region_trail        = true
  include_global_service_events = true
  enable_log_file_validation   = true

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["${module.s3_website.bucket_arn}/*"]
    }

    data_resource {
      type   = "AWS::DynamoDB::Table"
      values = [module.dynamodb.table_arn]
    }
  }

  tags = {
    ManagedBy = "Terraform"
    Project   = var.project_name
    Purpose   = "Security monitoring and compliance"
  }
}

# CloudWatch alarms for CloudTrail monitoring (using native resources)
resource "aws_cloudwatch_metric_alarm" "cloudtrail_errors" {
  alarm_name          = "cloudtrail-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "CloudTrailError"
  namespace           = "CloudTrailMetrics"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "CloudTrail configuration errors"
  alarm_actions       = []

  tags = {
    ManagedBy = "Terraform"
    Project   = var.project_name
    Purpose   = "Security monitoring"
  }
}

resource "aws_cloudwatch_metric_alarm" "unauthorized_api_calls" {
  alarm_name          = "unauthorized-api-calls"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "UnauthorizedAPICalls"
  namespace           = "CloudTrailMetrics"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "Unauthorized API calls detected"
  alarm_actions       = []

  tags = {
    ManagedBy = "Terraform"
    Project   = var.project_name
    Purpose   = "Security monitoring"
  }
}

resource "aws_cloudwatch_metric_alarm" "root_account_usage" {
  alarm_name          = "root-account-usage"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "RootAccountUsage"
  namespace           = "CloudTrailMetrics"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "Root account usage detected"
  alarm_actions       = []

  tags = {
    ManagedBy = "Terraform"
    Project   = var.project_name
    Purpose   = "Security monitoring"
  }
}

# Lambda monitoring alarms (using native resources)
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  for_each = local.lambda_functions

  alarm_name          = "lambda-errors-${each.key}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "1"
  alarm_description   = "Lambda function ${each.key} errors"
  alarm_actions       = []

  dimensions = {
    FunctionName = each.key
  }

  tags = {
    ManagedBy = "Terraform"
    Project   = var.project_name
    Function  = each.key
  }
}

# DynamoDB monitoring alarms (using native resources)
resource "aws_cloudwatch_metric_alarm" "dynamodb_throttled_requests" {
  alarm_name          = "dynamodb-throttled-requests"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ThrottledRequests"
  namespace           = "AWS/DynamoDB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "DynamoDB throttled requests"
  alarm_actions       = []

  dimensions = {
    TableName = var.dynamodb_table_name
  }

  tags = {
    ManagedBy = "Terraform"
    Project   = var.project_name
    Service   = "DynamoDB"
  }
}

resource "aws_cloudwatch_metric_alarm" "dynamodb_user_errors" {
  alarm_name          = "dynamodb-user-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "UserErrors"
  namespace           = "AWS/DynamoDB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "DynamoDB user errors"
  alarm_actions       = []

  dimensions = {
    TableName = var.dynamodb_table_name
  }

  tags = {
    ManagedBy = "Terraform"
    Project   = var.project_name
    Service   = "DynamoDB"
  }
}

# Additional useful monitoring: API Gateway alarms
resource "aws_cloudwatch_metric_alarm" "api_gateway_4xx_errors" {
  alarm_name          = "api-gateway-4xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "4XXError"
  namespace           = "AWS/ApiGateway"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "API Gateway 4XX errors"
  alarm_actions       = []

  dimensions = {
    ApiName = aws_api_gateway_rest_api.main.name
    Stage   = "prod"
  }

  tags = {
    ManagedBy = "Terraform"
    Project   = var.project_name
    Service   = "API Gateway"
  }
}

resource "aws_cloudwatch_metric_alarm" "api_gateway_5xx_errors" {
  alarm_name          = "api-gateway-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "API Gateway 5XX errors"
  alarm_actions       = []

  dimensions = {
    ApiName = aws_api_gateway_rest_api.main.name
    Stage   = "prod"
  }

  tags = {
    ManagedBy = "Terraform"
    Project   = var.project_name
    Service   = "API Gateway"
  }
}