output "bucket_name" {
  description = "El nombre del bucket S3"
  value       = aws_s3_bucket.static_site.bucket
}

output "bucket_arn" {
  description = "ARN del bucket S3"
  value       = aws_s3_bucket.static_site.arn
}

output "website_endpoint" {
  description = "Website endpoint for redirect lambda"
  value       = aws_s3_bucket_website_configuration.static_site_config.website_endpoint
}

output "hosted_zone_id" {
  description = "Hosted zone ID for the S3 website"
  value       = aws_s3_bucket.static_site.hosted_zone_id
}