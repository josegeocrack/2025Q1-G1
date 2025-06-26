#Quiero que la AZ este disponible 
data "aws_availability_zones" "available" {
  state = "available"
}
