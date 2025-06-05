#Lo que quiero que la gente pueda acceder mediante las instancias de mi module

output "vpc_id" {
  value = aws_vpc.example.id
}

output "vpc_info" {
  value = {
    cidr_block = aws_vpc.example.cidr_block
    id         = aws_vpc.example.id
    tags       = aws_vpc.example.tags
  }
}

output "subnet_ids" {
  description = "The IDs of the subnets"
  value       = [for subnet in aws_subnet.example : subnet.id]
}

#Output para los ids de la tabla de ruteo
#output "route_table_ids" {
#  description = "The IDs of the route tables"
#  value       = [aws_route_table.example.id]
#}

output "route_table_ids" {
  value = aws_route_table.example.*.id
}