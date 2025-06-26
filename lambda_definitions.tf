locals {
  s3_website_url = "http://${var.nombre_bucket}.s3-website-${var.region}.amazonaws.com"
  sendReminder_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:function:sendReminder"

  lambda_functions = {
    getReservas = {
      filename         = data.archive_file.getReservas_code.output_path
      source_code_hash = data.archive_file.getReservas_code.output_base64sha256
      handler          = "getReservas.lambda_handler"
      runtime          = "python3.11"
      env_vars         = { DYNAMODB_TABLE_NAME = var.dynamodb_table_name }
    }
    registrar_usuario = {
      filename         = data.archive_file.registrar_usuario_code.output_path
      source_code_hash = data.archive_file.registrar_usuario_code.output_base64sha256
      handler          = "registrar_usuario.lambda_handler"
      runtime          = "python3.12"
    }
    crearReserva = {
      filename         = data.archive_file.crearReserva_code.output_path
      source_code_hash = data.archive_file.crearReserva_code.output_base64sha256
      handler          = "crearReserva.lambda_handler"
      runtime          = "python3.11"
      timeout          = 900
      env_vars = {
        DYNAMODB_TABLE_NAME     = var.dynamodb_table_name
        SENDREMINDER_LAMBDA_ARN = local.sendReminder_arn
        SNS_TOPIC_ARN           = aws_sns_topic.club_reminders.arn
        SQS_QUEUE_URL           = aws_sqs_queue.reminders_queue.url
      }
    }
    redirectBucket = {
      filename         = data.archive_file.redirectBucket_code.output_path
      source_code_hash = data.archive_file.redirectBucket_code.output_base64sha256
      handler          = "redirectBucket.lambda_handler"
      runtime          = "python3.9"
      attach_vpc       = false
      env_vars         = { FRONTEND_URL = local.s3_website_url }
    }
    getUserReservas = {
      filename         = data.archive_file.getUserReservas_code.output_path
      source_code_hash = data.archive_file.getUserReservas_code.output_base64sha256
      handler          = "getUserReservas.lambda_handler"
      runtime          = "python3.11"
      env_vars         = { DYNAMODB_TABLE_NAME = var.dynamodb_table_name }
    }
    cancelReserva = {
      filename         = data.archive_file.cancelReserva_code.output_path
      source_code_hash = data.archive_file.cancelReserva_code.output_base64sha256
      handler          = "cancelReserva.lambda_handler"
      runtime          = "python3.11"
      timeout          = 900
      env_vars = {
        DYNAMODB_TABLE_NAME        = var.dynamodb_table_name
        CANCEL_REMINDERS_QUEUE_URL = aws_sqs_queue.cancel_reminders_queue.url
      }
    }
    crearClases = {
      filename         = data.archive_file.crearClases_code.output_path
      source_code_hash = data.archive_file.crearClases_code.output_base64sha256
      handler          = "crearClases.lambda_handler"
      runtime          = "python3.11"
      timeout          = 300
      memory_size      = 256
      env_vars         = { DYNAMODB_TABLE_NAME = var.dynamodb_table_name }
    }
    getClases = {
      filename         = data.archive_file.getClases_code.output_path
      source_code_hash = data.archive_file.getClases_code.output_base64sha256
      handler          = "getClases.lambda_handler"
      runtime          = "python3.11"
      env_vars         = { DYNAMODB_TABLE_NAME = var.dynamodb_table_name }
    }
    crearInscripcion = {
      filename         = data.archive_file.crearInscripcion_code.output_path
      source_code_hash = data.archive_file.crearInscripcion_code.output_base64sha256
      handler          = "crearInscripcion.lambda_handler"
      runtime          = "python3.11"
      timeout          = 900
      env_vars = {
        DYNAMODB_TABLE_NAME     = var.dynamodb_table_name
        SENDREMINDER_LAMBDA_ARN = local.sendReminder_arn
        SNS_TOPIC_ARN           = aws_sns_topic.club_reminders.arn
        SQS_QUEUE_URL           = aws_sqs_queue.reminders_queue.url
      }
    }
    getInscripciones = {
      filename         = data.archive_file.getInscripciones_code.output_path
      source_code_hash = data.archive_file.getInscripciones_code.output_base64sha256
      handler          = "getInscripciones.lambda_handler"
      runtime          = "python3.11"
      env_vars         = { DYNAMODB_TABLE_NAME = var.dynamodb_table_name }
    }
    cancelInscripcion = {
      filename         = data.archive_file.cancelInscripcion_code.output_path
      source_code_hash = data.archive_file.cancelInscripcion_code.output_base64sha256
      handler          = "cancelInscripcion.lambda_handler"
      runtime          = "python3.11"
      env_vars = {
        DYNAMODB_TABLE_NAME        = var.dynamodb_table_name
        CANCEL_REMINDERS_QUEUE_URL = aws_sqs_queue.cancel_reminders_queue.url
      }
    }
    crearFeedback = {
      filename         = data.archive_file.crearFeedback_code.output_path
      source_code_hash = data.archive_file.crearFeedback_code.output_base64sha256
      handler          = "crearFeedback.lambda_handler"
      runtime          = "python3.11"
      env_vars         = { DYNAMODB_TABLE_NAME = var.dynamodb_table_name }
    }
    getFeedback = {
      filename         = data.archive_file.getFeedback_code.output_path
      source_code_hash = data.archive_file.getFeedback_code.output_base64sha256
      handler          = "getFeedback.lambda_handler"
      runtime          = "python3.11"
      env_vars         = { DYNAMODB_TABLE_NAME = var.dynamodb_table_name }
    }
    sendReminder = {
      filename         = data.archive_file.sendReminder_code.output_path
      source_code_hash = data.archive_file.sendReminder_code.output_base64sha256
      handler          = "sendReminder.lambda_handler"
      runtime          = "python3.11"
      attach_vpc       = false
      env_vars         = { SNS_TOPIC_ARN = aws_sns_topic.club_reminders.arn }
    }
    processReminders = {
      filename             = data.archive_file.processReminders_code.output_path
      source_code_hash     = data.archive_file.processReminders_code.output_base64sha256
      handler              = "processReminders.lambda_handler"
      runtime              = "python3.11"
      attach_vpc           = false
      #event_source_sqs_arn = aws_sqs_queue.reminders_queue.arn
    }
    processCancelReminder = {
      filename             = data.archive_file.processCancelReminder_code.output_path
      source_code_hash     = data.archive_file.processCancelReminder_code.output_base64sha256
      handler              = "processCancelReminder.lambda_handler"
      runtime              = "python3.11"
      attach_vpc           = false
      #event_source_sqs_arn = aws_sqs_queue.cancel_reminders_queue.arn
    }
  }
} 