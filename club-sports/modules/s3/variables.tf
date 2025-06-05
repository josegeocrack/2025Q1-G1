output "bucket_name" {
  description = "El nombre del bucket S3"
  value       = aws_s3_bucket.static_site.bucket
}

output "bucket_website_endpoint" {
  description = "El endpoint del sitio web estático"
  value       = aws_s3_bucket.static_site.website_endpoint
}