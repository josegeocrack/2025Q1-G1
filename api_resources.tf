locals {
  api_resources = {
    checkAvailability = {
      path_part = "check-availability"
      methods = {
        POST = {
          integration_type     = "AWS_PROXY"
          lambda_function_name = module.lambdas.lambda_function_names["getReservas"]
          lambda_uri           = module.lambdas.lambda_invoke_arns["getReservas"]
          http_method          = "POST"
          authorization        = "COGNITO_USER_POOLS"
        }
        OPTIONS = {
          integration_type = "MOCK"
          http_method      = "OPTIONS"
          authorization    = "NONE"
        }
      }
    }
    createReservation = {
      path_part = "create-reservation"
      methods = {
        POST = {
          integration_type     = "AWS_PROXY"
          lambda_function_name = module.lambdas.lambda_function_names["crearReserva"]
          lambda_uri           = module.lambdas.lambda_invoke_arns["crearReserva"]
          http_method          = "POST"
          authorization        = "COGNITO_USER_POOLS"
        }
        OPTIONS = {
          integration_type = "MOCK"
          http_method      = "OPTIONS"
          authorization    = "NONE"
        }
      }
    }
    myReservations = {
      path_part = "my-reservations"
      methods = {
        GET = {
          integration_type     = "AWS_PROXY"
          lambda_function_name = module.lambdas.lambda_function_names["getUserReservas"]
          lambda_uri           = module.lambdas.lambda_invoke_arns["getUserReservas"]
          http_method          = "GET"
          authorization        = "COGNITO_USER_POOLS"
        }
        OPTIONS = {
          integration_type = "MOCK"
          http_method      = "OPTIONS"
          authorization    = "NONE"
        }
      }
    }
    cancelReservation = {
      path_part = "cancel-reservation"
      methods = {
        POST = {
          integration_type     = "AWS_PROXY"
          lambda_function_name = module.lambdas.lambda_function_names["cancelReserva"]
          lambda_uri           = module.lambdas.lambda_invoke_arns["cancelReserva"]
          http_method          = "POST"
          authorization        = "COGNITO_USER_POOLS"
        }
        OPTIONS = {
          integration_type = "MOCK"
          http_method      = "OPTIONS"
          authorization    = "NONE"
        }
      }
    }
    clases = {
      path_part = "clases"
      methods = {
        GET = {
          integration_type     = "AWS_PROXY"
          lambda_function_name = module.lambdas.lambda_function_names["getClases"]
          lambda_uri           = module.lambdas.lambda_invoke_arns["getClases"]
          http_method          = "GET"
          authorization        = "COGNITO_USER_POOLS"
        }
        OPTIONS = {
          integration_type = "MOCK"
          http_method      = "OPTIONS"
          authorization    = "NONE"
        }
      }
    }
    inscripcion = {
      path_part = "inscripcion"
      methods = {
        POST = {
          integration_type     = "AWS_PROXY"
          lambda_function_name = module.lambdas.lambda_function_names["crearInscripcion"]
          lambda_uri           = module.lambdas.lambda_invoke_arns["crearInscripcion"]
          http_method          = "POST"
          authorization        = "COGNITO_USER_POOLS"
        }
        OPTIONS = {
          integration_type = "MOCK"
          http_method      = "OPTIONS"
          authorization    = "NONE"
        }
      }
    }
    myInscriptions = {
      path_part = "my-inscriptions"
      methods = {
        GET = {
          integration_type     = "AWS_PROXY"
          lambda_function_name = module.lambdas.lambda_function_names["getInscripciones"]
          lambda_uri           = module.lambdas.lambda_invoke_arns["getInscripciones"]
          http_method          = "GET"
          authorization        = "COGNITO_USER_POOLS"
        }
        OPTIONS = {
          integration_type = "MOCK"
          http_method      = "OPTIONS"
          authorization    = "NONE"
        }
      }
    }
    cancelInscription = {
      path_part = "cancel-inscription"
      methods = {
        POST = {
          integration_type     = "AWS_PROXY"
          lambda_function_name = module.lambdas.lambda_function_names["cancelInscripcion"]
          lambda_uri           = module.lambdas.lambda_invoke_arns["cancelInscripcion"]
          http_method          = "POST"
          authorization        = "COGNITO_USER_POOLS"
        }
        OPTIONS = {
          integration_type = "MOCK"
          http_method      = "OPTIONS"
          authorization    = "NONE"
        }
      }
    }
    feedback = {
      path_part = "feedback"
      methods = {
        POST = {
          integration_type     = "AWS_PROXY"
          lambda_function_name = module.lambdas.lambda_function_names["crearFeedback"]
          lambda_uri           = module.lambdas.lambda_invoke_arns["crearFeedback"]
          http_method          = "POST"
          authorization        = "COGNITO_USER_POOLS"
        }
        GET = {
          integration_type     = "AWS_PROXY"
          lambda_function_name = module.lambdas.lambda_function_names["getFeedback"]
          lambda_uri           = module.lambdas.lambda_invoke_arns["getFeedback"]
          http_method          = "GET"
          authorization        = "COGNITO_USER_POOLS"
        }
        OPTIONS = {
          integration_type = "MOCK"
          http_method      = "OPTIONS"
          authorization    = "NONE"
        }
      }
    }
    redirectBucket = {
      path_part = "redirectBucket"
      methods = {
        GET = {
          integration_type     = "AWS_PROXY"
          lambda_function_name = module.lambdas.lambda_function_names["redirectBucket"]
          lambda_uri           = module.lambdas.lambda_invoke_arns["redirectBucket"]
          http_method          = "GET"
          authorization        = "NONE"
        }
      }
    }
  }
} 