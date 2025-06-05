import json
import os
url = os.environ['REDIRECT_URL']

def lambda_handler(event, context):
    code = event['queryStringParameters'].get('code')
    
    if code:
        redirect_url = f"http://{url}?code={code}"
    else:
        redirect_url = f"http://{url}"
    
    response = {
        "statusCode": 301,
        "headers": {
            "Location": redirect_url
        }
    }
    
    return response