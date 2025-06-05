# En el main defino los recursos que va a crear mi módulo
resource "aws_vpc" "example" {
    cidr_block = var.vpc_cidr
    tags = {
        Name = var.vpc_name
    }
}

#Usando la funcion cidr subnet creo las subnets
resource "aws_subnet" "example" {
  # Convierto la lista de subnets en un mapa usando el nombre de la subnet como clave
  for_each = { for subnet in var.subnets : subnet.name => subnet }
  vpc_id            = aws_vpc.example.id
  availability_zone = each.value.availability_zone
  
  # Generar el CIDR de cada subnet usando la función cidrsubnet
  cidr_block = cidrsubnet(var.vpc_cidr, 8, index(var.subnets, each.value))

  tags = {
    Name = each.value.name
  }
}

# Crear una tabla de ruteo para la VPC
resource "aws_route_table" "example" {
  vpc_id = aws_vpc.example.id

  tags = {
    Name = "${var.vpc_name}-route-table"
  }
}

# Asociar la tabla de ruteo con las subnets
resource "aws_route_table_association" "example" {
  for_each = aws_subnet.example
  subnet_id      = each.value.id
  route_table_id = aws_route_table.example.id
}