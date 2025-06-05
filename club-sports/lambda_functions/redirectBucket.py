import json

def lambda_handler(event, context):
    # Headers CORS
    headers = {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
    
    # Obtener parámetros de la URL
    query_params = event.get('queryStringParameters', {}) or {}
    code = query_params.get('code')
    state = query_params.get('state', '')
    
    print(f"🔍 Redirect recibido - Código: {code}, State: {state}")
    
    if not code:
        print("❌ No se recibió código de autorización")
        return {
            'statusCode': 400,
            'headers': headers,
            'body': '<h1>Error: No authorization code received</h1>'
        }
    
    # URL de tu sitio web S3
    frontend_url = "https://club-sports-bucket-mica.s3.website-us-east-1.amazonaws.com"
    
    # Redirigir a index.html con el código (el frontend hará el intercambio)
    redirect_url = f"{frontend_url}/index.html?code={code}"
    
    # HTML que redirige automáticamente
    html_content = f'''
    <!DOCTYPE html>
    <html>
    <head>
        <title>Login Successful</title>
        <style>
            body {{ 
                font-family: Arial, sans-serif; 
                text-align: center; 
                margin-top: 100px; 
                background-color: #f5f5f5;
            }}
            .container {{ 
                background: white; 
                padding: 40px; 
                border-radius: 10px; 
                box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
                max-width: 400px; 
                margin: 0 auto;
            }}
            .spinner {{ 
                border: 4px solid #f3f3f3; 
                border-top: 4px solid #3498db; 
                border-radius: 50%; 
                width: 40px; 
                height: 40px; 
                animation: spin 1s linear infinite; 
                margin: 20px auto;
            }}
            @keyframes spin {{ 0% {{ transform: rotate(0deg); }} 100% {{ transform: rotate(360deg); }} }}
        </style>
    </head>
    <body>
        <div class="container">
            <h2>🎉 Login Successful!</h2>
            <div class="spinner"></div>
            <p>Processing authentication...</p>
            <p><small>If you're not redirected automatically, <a href="#" id="manual-link">click here</a></small></p>
        </div>
        
        <script>
            console.log("🔄 redirectBucket lambda ejecutado");
            console.log("🔍 Redirigiendo con código para intercambio en frontend");
            
            // URL de destino con código
            const indexUrl = "{redirect_url}";
            console.log("🚀 Redirigiendo a:", indexUrl);
            
            // Agregar enlace manual
            document.getElementById("manual-link").href = indexUrl;
            
            // Redirigir automáticamente después de 1 segundo
            setTimeout(function() {{
                window.location.href = indexUrl;
            }}, 1000);
        </script>
    </body>
    </html>
    '''
    
    return {
        'statusCode': 200,
        'headers': headers,
        'body': html_content
    }