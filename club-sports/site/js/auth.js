// *** AUTH.JS - SISTEMA IDÉNTICO AL PROYECTO DE REFERENCIA ***

// Variable global para almacenar el token en memoria (IGUAL que referencia)
let tokenInMemory = null;

// Configuración (usando tus datos)
const userPoolId = "41g9jru5cgeu053j0fq55v1t";
const COGNITO_DOMAIN = "https://user-pool-micapanchi.auth.us-east-1.amazoncognito.com/oauth2/token";
const REDIRECT_URL = "https://7sqblorv33.execute-api.us-east-1.amazonaws.com/prod/redirectBucket";

document.addEventListener("DOMContentLoaded", () => {
  console.log("🔧 Auth.js iniciado - sistema igual a referencia");
  configurarPaginaActual();
});

// *** FUNCIONES IDÉNTICAS AL PROYECTO DE REFERENCIA ***

// Paso 2: Obtener el código de la URL (IGUAL que referencia)
function getCodeFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('code');
}

// Paso 3: Intercambiar el código por un token (IGUAL que referencia)
async function getToken() {
    if (tokenInMemory) {
        // Si ya tenemos un token en memoria, lo retornamos inmediatamente
        return tokenInMemory;
    }

    const code = getCodeFromUrl();
    if (!code) {
        console.error('No authorization code found in the URL.');
        return null;
    }

    const clientId = userPoolId;
    const redirectUri = REDIRECT_URL;    
    const tokenUrl = COGNITO_DOMAIN;

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', clientId);
    params.append('code', code);
    params.append('redirect_uri', redirectUri);

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
    });

    const data = await response.json();

    if (response.ok) {
        const idToken = data.id_token;
        // Almacenar el token en memoria
        tokenInMemory = idToken;
        console.log("✅ Token obtenido y guardado en memoria");
        
        // Procesar datos del usuario
        procesarDatosDeUsuario(idToken);
        
        return idToken;
    } else {
        console.error('Error getting token:', data);
        return null;
    }
}

// *** FUNCIONES ESPECÍFICAS PARA TU SISTEMA ***

function configurarPaginaActual() {
  const isLoginPage = window.location.pathname.includes('login.html');
  
  if (isLoginPage) {
    configurarLoginPage();
  } else {
    configurarIndexPage();
  }
}

function configurarLoginPage() {
  const cognitoButton = document.getElementById("cognito-login-btn");
  if (cognitoButton) {
    cognitoButton.addEventListener("click", (e) => {
      e.preventDefault();
      iniciarLoginCognito();
    });
    console.log("✅ Botón de Cognito configurado");
  }
}

function configurarIndexPage() {
  // Verificar si hay código en URL
  const code = getCodeFromUrl();
  if (code) {
    console.log("🔍 Código encontrado, obteniendo token...");
    getToken().then(token => {
      if (token) {
        mostrarSeccionBookings();
      }
    });
  } else {
    // Verificar si ya hay usuario logueado
    verificarUsuarioLogueado();
  }
  
  // Interceptar links de login
  interceptarLinksDeLogin();
}

function procesarDatosDeUsuario(token) {
  try {
    // Decodificar JWT para obtener datos del usuario
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const userData = JSON.parse(jsonPayload);
    console.log("👤 Datos del usuario:", userData);

    // Guardar usuario en localStorage
    const currentUser = {
      name: userData.name || userData['cognito:username'] || userData.email,
      email: userData.email,
      id: userData.sub,
      role: 'user',
      joinDate: new Date().toISOString()
    };

    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    console.log("✅ Usuario guardado:", currentUser);
    
  } catch (error) {
    console.error("❌ Error procesando datos del usuario:", error);
  }
}

function interceptarLinksDeLogin() {
  const loginLinks = document.querySelectorAll('a[href="login.html"]');
  
  loginLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      iniciarLoginCognito();
    });
  });
  
  console.log(`🔧 Interceptados ${loginLinks.length} links de login`);
}

function iniciarLoginCognito() {
  const cognitoDomain = "user-pool-micapanchi.auth.us-east-1.amazoncognito.com";
  const clientId = userPoolId;
  const redirectUri = REDIRECT_URL;
  
  const loginUrl = `https://${cognitoDomain}/oauth2/authorize?` +
    `response_type=code&` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=openid+profile+email`;

  console.log("🔗 Redirigiendo a Cognito:", loginUrl);
  window.location.href = loginUrl;
}

function verificarUsuarioLogueado() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

  if (currentUser && tokenInMemory) {
    console.log("✅ Usuario ya logueado");
    mostrarSeccionBookings();
  } else {
    console.log("ℹ️ Usuario no logueado");
    mostrarPaginaInicial();
  }
}

function mostrarSeccionBookings() {
  console.log("📋 Mostrando sección de bookings");
  
  const heroSection = document.querySelector('.hero');
  const servicesSection = document.querySelector('.services');
  const aboutSection = document.querySelector('.about');
  const bookingsSection = document.getElementById('bookings-section');
  
  if (heroSection) heroSection.style.display = 'none';
  if (servicesSection) servicesSection.style.display = 'none';
  if (aboutSection) aboutSection.style.display = 'none';
  
  if (bookingsSection) {
    bookingsSection.style.display = 'block';
  }

  actualizarLinksDeLogin();
}

function mostrarPaginaInicial() {
  const heroSection = document.querySelector('.hero');
  const servicesSection = document.querySelector('.services');
  const aboutSection = document.querySelector('.about');
  const bookingsSection = document.getElementById('bookings-section');
  
  if (heroSection) heroSection.style.display = 'block';
  if (servicesSection) servicesSection.style.display = 'block';
  if (aboutSection) aboutSection.style.display = 'block';
  if (bookingsSection) bookingsSection.style.display = 'none';
}

function actualizarLinksDeLogin() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const loginLinks = document.querySelectorAll('a[href="login.html"]');
  
  loginLinks.forEach(link => {
    if (link.textContent === 'Login') {
      link.textContent = `Welcome, ${currentUser.name}`;
      link.onclick = (e) => {
        e.preventDefault();
        logout();
      };
    }
  });
}

function logout() {
  console.log("🚪 Cerrando sesión");
  
  localStorage.removeItem("currentUser");
  tokenInMemory = null; // Limpiar token de memoria
  
  mostrarPaginaInicial();
  
  const loginLinks = document.querySelectorAll('a[href="login.html"]');
  loginLinks.forEach(link => {
    if (link.textContent.startsWith('Welcome,')) {
      link.textContent = 'Login';
      link.onclick = null;
    }
  });
  
  alert("Logged out successfully");
  window.location.reload();
}