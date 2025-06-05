terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  required_version = ">= 1.3.0"
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_dynamodb_table" "clubdata" {
  name           = var.dynamodb_table_name
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "PK"
  range_key      = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "fecha"
    type = "S"
  }

  attribute {
    name = "tipo"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "claseId"
    type = "S"
  }

  attribute {
    name = "estado"
    type = "S"
  }

  global_secondary_index {
    name               = "GSI_Fecha_Tipo"
    hash_key           = "fecha"
    range_key          = "tipo"
    projection_type    = "ALL"
  }

  global_secondary_index {
    name               = "GSI_UserId_Tipo"
    hash_key           = "userId"
    range_key          = "tipo"
    projection_type    = "ALL"
  }

  global_secondary_index {
    name               = "GSI_ClaseId_Fecha"
    hash_key           = "claseId"
    range_key          = "fecha"
    projection_type    = "ALL"
  }

  global_secondary_index {
    name               = "GSI_Estado_Tipo"
    hash_key           = "estado"
    range_key          = "tipo"
    projection_type    = "ALL"
  }

  tags = {
    Project = var.project_name
  }
}
