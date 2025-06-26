resource "aws_api_gateway_model" "empty" {
  rest_api_id  = var.rest_api_id
  name         = "EmptyClubSportsProfes"
  description  = "An empty schema"
  content_type = "application/json"
  schema       = "{\n  \"$schema\": \"http://json-schema.org/draft-04/schema#\",\n  \"title\": \"Empty Schema\",\n  \"type\": \"object\"\n}"
}

resource "aws_api_gateway_deployment" "deployment" {
  rest_api_id = var.rest_api_id

  # Este bloque 'triggers' es la clave.
  # Crea un nuevo despliegue cada vez que la configuración de la API cambia.
  triggers = {
    redeployment = sha1(jsonencode({
      resources             = [for r in aws_api_gateway_resource.resource : r.id],
      methods               = [for m in aws_api_gateway_method.method : m.id],
      integrations          = [for i in aws_api_gateway_integration.integration : i.id],
      mock_integrations     = [for mi in aws_api_gateway_integration.mock : mi.id],
      options_responses     = [for or in aws_api_gateway_method_response.options : or.id],
      options_int_responses = [for oir in aws_api_gateway_integration_response.options : oir.id],
      model_id              = aws_api_gateway_model.empty.id
    }))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "stage" {
  stage_name    = var.stage_name
  rest_api_id   = var.rest_api_id
  deployment_id = aws_api_gateway_deployment.deployment.id
}