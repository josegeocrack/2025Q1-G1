output "api_url" {
  value = "https://${var.rest_api_id}.execute-api.${var.region}.amazonaws.com/${var.stage_name}"
}