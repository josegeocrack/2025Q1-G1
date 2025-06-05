resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id = var.vpc_id
  service_name = "com.amazonaws.us-east-1.dynamodb"
  vpc_endpoint_type = "Gateway"
  route_table_ids = var.route_table_ids
}