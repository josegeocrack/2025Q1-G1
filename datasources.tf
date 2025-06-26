# Data sources para obtener información de AWS
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

# Data sources para archivar los archivos de código de las funciones Lambda
data "archive_file" "getReservas_code" {
  type        = "zip"
  source_file = "${path.module}/lambda_functions/getReservas.py"
  output_path = "${path.module}/output_lambda_functions/lambda_getReservas_src.zip"
}

data "archive_file" "registrar_usuario_code" {
  type        = "zip"
  source_file = "${path.module}/lambda_functions/registrar_usuario.py"
  output_path = "${path.module}/output_lambda_functions/registrar_usuario.zip"
}

data "archive_file" "crearReserva_code" {
  type        = "zip"
  output_path = "${path.module}/output_lambda_functions/lambda_crearReserva_src.zip"
  
  source {
    content = file("${path.module}/lambda_functions/crearReserva.py")
    filename = "crearReserva.py"
  }
  
  source {
    content = file("${path.module}/lambda_functions/reminder_helper.py")
    filename = "reminder_helper.py"
  }
}

data "archive_file" "redirectBucket_code" {
  type        = "zip"
  source_file = "${path.module}/lambda_functions/redirectBucket.py"
  output_path = "${path.module}/output_lambda_functions/lambda_redirectBucket_src.zip"
}

data "archive_file" "getUserReservas_code" {
  type        = "zip"
  source_file = "${path.module}/lambda_functions/getUserReservas.py"
  output_path = "${path.module}/output_lambda_functions/lambda_getUserReservas_src.zip"
}

data "archive_file" "cancelReserva_code" {
  type        = "zip"
  output_path = "${path.module}/output_lambda_functions/lambda_cancelReserva_src.zip"
  
  source {
    content = file("${path.module}/lambda_functions/cancelReserva.py")
    filename = "cancelReserva.py"
  }
  
  source {
    content = file("${path.module}/lambda_functions/reminder_helper.py")
    filename = "reminder_helper.py"
  }
}

data "archive_file" "crearClases_code" {
  type        = "zip"
  source_file = "${path.module}/lambda_functions/crearClases.py"
  output_path = "${path.module}/output_lambda_functions/lambda_crearClases_src.zip"
}

data "archive_file" "getClases_code" {
  type        = "zip"
  source_file = "${path.module}/lambda_functions/getClases.py"
  output_path = "${path.module}/output_lambda_functions/lambda_getClases_src.zip"
}

data "archive_file" "crearInscripcion_code" {
  type        = "zip"
  output_path = "${path.module}/output_lambda_functions/lambda_crearInscripcion_src.zip"
  
  source {
    content = file("${path.module}/lambda_functions/crearInscripcion.py")
    filename = "crearInscripcion.py"
  }
  
  source {
    content = file("${path.module}/lambda_functions/reminder_helper.py")
    filename = "reminder_helper.py"
  }
}

data "archive_file" "getInscripciones_code" {
  type        = "zip"
  source_file = "${path.module}/lambda_functions/getInscripciones.py"
  output_path = "${path.module}/output_lambda_functions/lambda_getInscripciones_src.zip"
}

data "archive_file" "cancelInscripcion_code" {
  type        = "zip"
  output_path = "${path.module}/output_lambda_functions/lambda_cancelInscripcion_src.zip"
  
  source {
    content = file("${path.module}/lambda_functions/cancelInscripcion.py")
    filename = "cancelInscripcion.py"
  }
  
  source {
    content = file("${path.module}/lambda_functions/reminder_helper.py")
    filename = "reminder_helper.py"
  }
}

data "archive_file" "crearFeedback_code" {
  type        = "zip"
  source_file = "${path.module}/lambda_functions/crearFeedback.py"
  output_path = "${path.module}/output_lambda_functions/lambda_crearFeedback_src.zip"
}

data "archive_file" "getFeedback_code" {
  type        = "zip"
  source_file = "${path.module}/lambda_functions/getFeedback.py"
  output_path = "${path.module}/output_lambda_functions/lambda_getFeedback_src.zip"
}

data "archive_file" "sendReminder_code" {
  type        = "zip"
  source_file = "${path.module}/lambda_functions/sendReminder.py"
  output_path = "${path.module}/output_lambda_functions/lambda_sendReminder_src.zip"
}

data "archive_file" "processReminders_code" {
  type        = "zip"
  output_path = "${path.module}/output_lambda_functions/lambda_processReminders_src.zip"
  
  source {
    content = file("${path.module}/lambda_functions/processReminders.py")
    filename = "processReminders.py"
  }
  
  source {
    content = file("${path.module}/lambda_functions/reminder_helper.py")
    filename = "reminder_helper.py"
  }
}

data "archive_file" "processCancelReminder_code" {
  type        = "zip"
  output_path = "${path.module}/output_lambda_functions/lambda_processCancelReminder_src.zip"
  
  source {
    content = file("${path.module}/lambda_functions/processCancelReminder.py")
    filename = "processCancelReminder.py"
  }
  
  source {
    content = file("${path.module}/lambda_functions/reminder_helper.py")
    filename = "reminder_helper.py"
  }
}

# Data source para los archivos del sitio web
locals {
  site_files = fileset("${path.module}/site", "**/*")
}