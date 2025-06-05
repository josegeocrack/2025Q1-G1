const API_BASE_URL = "https://7sqblorv33.execute-api.us-east-1.amazonaws.com/prod"

// *** SISTEMA DE TOKEN EN MEMORIA (COMO PROYECTO REFERENCIA) ***
let tokenInMemory = null;

// Configuración de Cognito
const userPoolId = "41g9jru5cgeu053j0fq55v1t";
const COGNITO_DOMAIN = "https://user-pool-micapanchi.auth.us-east-1.amazoncognito.com/oauth2/token";
const REDIRECT_URL = "https://7sqblorv33.execute-api.us-east-1.amazonaws.com/prod/redirectBucket";

// Función para obtener código de la URL
function getCodeFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('code');
}

// Función para intercambiar código por token
async function getToken() {
    if (tokenInMemory) {
        return tokenInMemory;
    }

    const storedToken = sessionStorage.getItem("cognitoToken");
    if (storedToken) {
        tokenInMemory = storedToken;
        console.log("✅ Token recuperado de sessionStorage");
        return tokenInMemory;
    }

    const code = getCodeFromUrl();
    if (!code) {
        console.log('No authorization code found in the URL.');
        return null;
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', userPoolId);
    params.append('code', code);
    params.append('redirect_uri', REDIRECT_URL);

    try {
        const response = await fetch(COGNITO_DOMAIN, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });

        const data = await response.json();

        if (response.ok) {
            tokenInMemory = data.id_token;
            console.log("✅ Token obtenido y guardado en memoria");
            return tokenInMemory;
        } else {
            console.error('Error getting token:', data);
            return null;
        }
    } catch (error) {
        console.error('Error en getToken:', error);
        return null;
    }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("🔧 Sistema tokenInMemory activado")
  
  // *** DEBUGGING: Verificar URL actual ***
  console.log("🔍 URL actual:", window.location.href);
  console.log("🔍 URL search params:", window.location.search);
  
  const code = getCodeFromUrl();
  console.log("🔍 Código en URL:", code);
  
  if (code) {
    console.log("✅ Hay código, intentando obtener token...");
    getToken().then(token => {
      console.log("🎯 Token obtenido:", token ? "SÍ" : "NO");
    });
  } else {
    console.log("❌ No hay código en URL - usuario debe hacer login");
  }

  // Handle section navigation
  const sectionBtns = document.querySelectorAll(".section-btn")
  const bookingSections = document.querySelectorAll(".booking-section")

  sectionBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetSection = btn.getAttribute("data-section")

      // Update active button
      sectionBtns.forEach((b) => b.classList.remove("active"))
      btn.classList.add("active")

      // Show target section, hide others
      bookingSections.forEach((section) => {
        if (section.id === targetSection) {
          section.classList.add("active")
        } else {
          section.classList.remove("active")
        }
      })
    })
  })

  // Initialize facility booking form
  initFacilityBooking()

  // Load available classes - TEMPORALMENTE DESHABILITADO
  // loadAvailableClasses()

  // Initialize complaint form - TEMPORALMENTE DESHABILITADO
  // initComplaintForm()

  // Handle logout
  document.getElementById("logout-btn").addEventListener("click", (e) => {
    e.preventDefault()
    tokenInMemory = null; // Limpiar token de memoria
    localStorage.removeItem("currentUser") // Por compatibilidad
    window.location.href = "index.html"
  })

  // Mobile menu toggle
  const hamburger = document.querySelector(".hamburger")
  const navMenu = document.querySelector(".nav-menu")

  if (hamburger && navMenu) {
    hamburger.addEventListener("click", () => {
      hamburger.classList.toggle("active")
      navMenu.classList.toggle("active")
    })
  }

  // Handle direct navigation to specific sections via URL hash
  if (window.location.hash) {
    const targetSection = window.location.hash.substring(1)
    const targetBtn = document.querySelector(`.section-btn[data-section="${targetSection}"]`)
    if (targetBtn) {
      targetBtn.click()
    }
  }
})

// *** FUNCIÓN PARA MAPEAR NOMBRES DE INSTALACIONES ***
function mapFacilityName(frontendName) {
  const facilityMap = {
    'gym': 'Modern Gym',
    'pool': 'Swimming Pool', 
    'tennis': 'Tennis Court',
    'basketball': 'Basketball Court',
    'yoga-room': 'Yoga Room',
    'squash': 'Squash Court'
  }
  
  return facilityMap[frontendName] || frontendName
}

function initFacilityBooking() {
  const facilityForm = document.getElementById("facility-booking-form")
  const facilityType = document.getElementById("facility-type")
  const bookingDate = document.getElementById("booking-date")
  const bookingTime = document.getElementById("booking-time")
  const availabilityStatus = document.getElementById("availability-status")

  // Set min date to today
  const today = new Date().toISOString().split("T")[0]
  bookingDate.min = today

  // *** FUNCIÓN DE VERIFICACIÓN DE DISPONIBILIDAD ***
  const checkAvailability = async () => {
    const facility = facilityType.value
    const date = bookingDate.value
    const time = bookingTime.value

    if (facility && date && time) {
      try {
        const payload = {
          facility: mapFacilityName(facility),
          date: date,
          time: time
        };
        
        console.log('Enviando a API:', payload);
        
        const response = await fetch(`${API_BASE_URL}/check-availability`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Respuesta de API:', result);
        
        availabilityStatus.style.display = "block"
        
        if (result.available) {
          availabilityStatus.className = "availability-check available"
          availabilityStatus.querySelector(".availability-message").textContent = result.message
        } else {
          availabilityStatus.className = "availability-check unavailable"
          availabilityStatus.querySelector(".availability-message").textContent = result.message
        }

      } catch (error) {
        console.error('Error checking availability with API:', error)
        
        // *** FALLBACK A MENSAJE SIMPLE ***
        availabilityStatus.style.display = "block"
        availabilityStatus.className = "availability-check available"
        availabilityStatus.querySelector(".availability-message").textContent = "Unable to check availability. Please try booking."
      }
    } else {
      availabilityStatus.style.display = "none"
    }
  }

  facilityType.addEventListener("change", checkAvailability)
  bookingDate.addEventListener("change", checkAvailability)
  bookingTime.addEventListener("change", checkAvailability)

  // *** FORM SUBMIT CON SISTEMA tokenInMemory ***
  facilityForm.addEventListener("submit", async (e) => {
    e.preventDefault()

    // *** USAR getToken() EN LUGAR DE currentUser ***
    const token = await getToken();
    console.log("🔍 Token obtenido:", token ? "✅ Sí" : "❌ No");

    if (!token) {
      alert("Please log in to make a reservation. You will be redirected to login.");
      window.location.href = "login.html";
      return;
    }

    const facility = facilityType.value
    const date = bookingDate.value
    const time = bookingTime.value

    if (!facility || !date || !time) {
      alert("Please fill in all fields")
      return
    }

    try {
      console.log("🚀 Enviando reserva con token...");
      
      const response = await fetch(`${API_BASE_URL}/create-reservation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`  // ← AGREGAR "Bearer "
        },
        body: JSON.stringify({
          facility: mapFacilityName(facility),
          date: date,
          time: time
        })
      })

      console.log("📡 Response status:", response.status);
      const result = await response.json()
      console.log("📦 Response data:", result);

      if (response.ok) {
        alert(`✅ ${result.message}\nReservation ID: ${result.reservation.id}`)
        facilityForm.reset()
        const availabilityStatus = document.getElementById("availability-status")
        if (availabilityStatus) {
          availabilityStatus.style.display = "none"
        }
      } else {
        alert(`❌ ${result.message}`)
      }

    } catch (error) {
      console.error('Error creating reservation:', error)
      alert('Error creating reservation. Please try again.')
    }
  })
}

// *** FUNCIONES SIMPLIFICADAS (SIN localStorage currentUser) ***

function populateFacilities(selectElement) {
  const facilities = [
    { id: "gym", name: "Modern Gym" },
    { id: "pool", name: "Swimming Pool" },
    { id: "tennis", name: "Tennis Court" },
    { id: "basketball", name: "Basketball Court" },
    { id: "yoga-room", name: "Yoga Room" },
    { id: "squash", name: "Squash Court" },
  ]

  let options = '<option value="">Please select a facility</option>'
  facilities.forEach((facility) => {
    options += `<option value="${facility.id}">${facility.name}</option>`
  })

  selectElement.innerHTML = options
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatTime(timeString) {
  const [hours, minutes] = timeString.split(":")
  const hour = Number.parseInt(hours)
  const ampm = hour >= 12 ? "PM" : "AM"
  const hour12 = hour % 12 || 12

  return `${hour12}:${minutes} ${ampm}`
}

// *** FUNCIONES TEMPORALMENTE DESHABILITADAS ***
// (Las reactivaremos cuando adaptemos el sistema completo)

/*
function loadAvailableClasses() {
  // Pendiente: adaptar para tokenInMemory
}

function enrollInClass(classId) {
  // Pendiente: adaptar para tokenInMemory
}

function initComplaintForm() {
  // Pendiente: adaptar para tokenInMemory
}
*/
