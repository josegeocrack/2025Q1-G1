resource "aws_s3_bucket" "static_site" {
  bucket = var.nombre_bucket

  tags = {
    Name        = var.bucket_name_tag
    Environment = var.environment_tag
  }
}

resource "aws_s3_bucket_website_configuration" "static_site_config" {
  bucket = aws_s3_bucket.static_site.bucket

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "404.html"
  }
}

resource "aws_s3_bucket_public_access_block" "allow_public_policy" {
  bucket                  = aws_s3_bucket.static_site.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "static_site_policy" {
  bucket = aws_s3_bucket.static_site.id
  depends_on = [aws_s3_bucket_public_access_block.allow_public_policy]
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect    = "Allow",
        Principal = "*",
        Action    = "s3:GetObject",
        Resource  = "${aws_s3_bucket.static_site.arn}/*"
      }
    ]
  })
}

resource "aws_s3_object" "site_files" {
  for_each = var.site_files

  bucket = aws_s3_bucket.static_site.bucket
  key    = each.value
  source = "${var.site_directory}/${each.value}"
  
  # MÉTODO SIMPLE Y CONFIABLE para content_type
  content_type = (
    can(regex("\\.html$", each.value)) ? "text/html" :
    can(regex("\\.css$", each.value)) ? "text/css" :
    can(regex("\\.js$", each.value)) ? "application/javascript" :
    can(regex("\\.json$", each.value)) ? "application/json" :
    can(regex("\\.png$", each.value)) ? "image/png" :
    can(regex("\\.(jpg|jpeg)$", each.value)) ? "image/jpeg" :
    can(regex("\\.gif$", each.value)) ? "image/gif" :
    can(regex("\\.svg$", each.value)) ? "image/svg+xml" :
    can(regex("\\.ico$", each.value)) ? "image/x-icon" :
    can(regex("\\.txt$", each.value)) ? "text/plain" :
    "application/octet-stream"
  )
  
  cache_control = "max-age=86400"
  etag = filemd5("${var.site_directory}/${each.value}")
}

resource "aws_s3_object" "config_file" {
  bucket = aws_s3_bucket.static_site.bucket
  key    = "config.js"
  source = "${dirname(var.site_directory)}/build/config.js"
  
  content_type = "application/javascript"
  cache_control = "max-age=3600"
  }