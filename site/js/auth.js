// Elite Sports Club - Authentication & Booking System
// Clean and organized JavaScript for the application

// Global configuration - will be replaced by dynamic config when available
const CONFIG = {
  userPoolId: window.CLUB_SPORTS_CONFIG?.userPoolId ,
  clientId: window.CLUB_SPORTS_CONFIG?.clientId,
  cognitoDomain: window.CLUB_SPORTS_CONFIG?.cognitoDomain,
  redirectUri: window.CLUB_SPORTS_CONFIG?.redirectUri ,
  apiBaseUrl: window.CLUB_SPORTS_CONFIG?.apiBaseUrl ,
  region: window.CLUB_SPORTS_CONFIG?.region ,
  environment: window.CLUB_SPORTS_CONFIG?.environment
};

// Global variables
let tokenInMemory = null;
let currentUser = null;
let isLoggedIn = false;

// Initialize application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("🔧 Elite Sports Club app initialized");
  initializeApp();
});

// ======================
// INITIALIZATION
// ======================

function initializeApp() {
    const isLoginPage = false;
    
    if (isLoginPage) {
        setupLoginPage();
    } else {
        setupMainPage();
        // ✅ AGREGAR MONITORING
        startTokenMonitoring();
    }
}

function setupLoginPage() {
  const cognitoButton = document.getElementById("cognito-login-btn");
  if (cognitoButton) {
    cognitoButton.addEventListener("click", (e) => {
      e.preventDefault();
      redirectToCognito();
    });
    console.log("✅ Login page configured");
  }
}

function setupMainPage() {
  // Check for authorization code in URL
  const code = getAuthCodeFromUrl();
  if (code) {
    console.log("🔍 Authorization code found, processing login...");
    handleAuthCallback();
  } else {
    // Check if user is already logged in
    checkExistingSession();
  }
  
  // Intercept all login links
  interceptLoginLinks();
  // Setup navigation between sections
  setupNavigation();
}

// ======================
// AUTHENTICATION
// ======================

function getAuthCodeFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('code');
}

// ... existing code ...
async function handleAuthCallback() {
  const code = getAuthCodeFromUrl();
  if (!code) {
    console.log("❌ No authorization code found");
    return;
  }

  try {
    const token = await exchangeCodeForToken(code);
    if (token) {
      tokenInMemory = token;
      localStorage.setItem('access_token', token);
      localStorage.setItem('userToken', token);
      processUserData(token);
      isLoggedIn = true;
      
      // ✅ NUEVO: Limpiar flag de login fresh
      localStorage.removeItem('force_fresh_login');
      
      showBookingsSection();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  } catch (error) {
    console.error("❌ Error during authentication:", error);
    alert("Authentication failed. Please try again.");
  }
}

async function exchangeCodeForToken(code) {
  const tokenUrl = `https://${CONFIG.cognitoDomain}/oauth2/token`;
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: CONFIG.clientId,
    code: code,
    redirect_uri: CONFIG.redirectUri
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  const data = await response.json();

  if (response.ok && data.id_token) {
    console.log("✅ Token obtained successfully");
    return data.id_token;
  } else {
    throw new Error('Token exchange failed');
  }
}

function processUserData(token) {
  try {
    // Decode JWT token to get user data
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const userData = JSON.parse(jsonPayload);
    console.log("👤 User data:", userData);

    // Extract a user-friendly name
    let displayName = userData.name || userData.given_name;
    
    // If no name available, use the first part of the email (before @)
    if (!displayName && userData.email) {
      displayName = userData.email.split('@')[0];
      // Capitalize first letter and remove common separators
      displayName = displayName.replace(/[._-]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    
    // Fallback to username if nothing else works
    if (!displayName) {
      displayName = userData['cognito:username'] || 'User';
    }

    // Store user data
    currentUser = {
      name: displayName,
      email: userData.email,
      id: userData.sub,
      role: 'user',
      joinDate: new Date().toISOString()
    };

    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    console.log("✅ User data saved:", currentUser);
    
  } catch (error) {
    console.error("❌ Error processing user data:", error);
  }
}

function redirectToCognito() {
  const loginUrl = `https://${CONFIG.cognitoDomain}/oauth2/authorize?` +
    `response_type=code&` +
    `client_id=${CONFIG.clientId}&` +
    `redirect_uri=${encodeURIComponent(CONFIG.redirectUri)}&` +
    `scope=openid+profile+email&` +
    `prompt=login`;

  console.log("🔗 Redirecting to Cognito login (forcing fresh login)");
  window.location.href = loginUrl;
}

function interceptLoginLinks() {
  const loginLinks = document.querySelectorAll('.login-btn');
  
  loginLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      if (isLoggedIn) {
        logout();
      } else {
        redirectToCognito();
      }
    });
  });
  
  console.log(`🔧 Intercepted ${loginLinks.length} login links`);
}

// ======================
// NAVIGATION SETUP
// ======================

function setupNavigation() {
  const homeLink = document.getElementById('home-link');
  const bookingsLink = document.getElementById('bookings-link');
  const aboutLink = document.getElementById('about-link');
  const facilitiesLink = document.getElementById('facilities-link');
  const classesLink = document.getElementById('classes-link');

  if (homeLink) {
    homeLink.addEventListener('click', (e) => {
      e.preventDefault();
      showHomePage();
      updateActiveNavLink('home');
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);      
    });
  }

  if (bookingsLink) {
    bookingsLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (isLoggedIn) {
        showBookingsSection();
        updateActiveNavLink('bookings');
      }
    });
  }

  // NUEVO: Manejar navegación a About, Facilities y Classes
  [aboutLink, facilitiesLink, classesLink].forEach(link => {
    if (link) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        showHomePage();
        // Scroll suave a la sección correspondiente
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
          setTimeout(() => {
            const section = document.querySelector(href);
            if (section) section.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
        updateActiveNavLink(link.id.replace('-link', ''));
      });
    }
  });
}

function updateActiveNavLink(activeSection) {
  // Remove active class from all nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  
  // Add active class to current section
  if (activeSection === 'home') {
    document.getElementById('home-link')?.classList.add('active');
  } else if (activeSection === 'bookings') {
    document.getElementById('bookings-link')?.classList.add('active');
  }
}

// ======================
// UI CONTROL
// ======================

function showBookingsSection() {
  console.log("📋 Showing bookings section");
  
  const heroSection = document.getElementById('hero-section');
  const bookingsSection = document.getElementById('bookings-section');
  
  if (heroSection) heroSection.style.display = 'none';
  if (bookingsSection) {
    bookingsSection.style.display = 'block';
    setupSectionNavigation();
    initializeFeedback();
    setupFacilityBooking();
  }

  updateNavigationForLoggedInUser();
  updateUserWelcome();
  updateActiveNavLink('bookings');
}

function showHomePage() {
  console.log("🏠 Showing home page");
  
  const heroSection = document.getElementById('hero-section');
  const bookingsSection = document.getElementById('bookings-section');
  
  if (heroSection) heroSection.style.display = 'block';
  if (bookingsSection) bookingsSection.style.display = 'none';
  
  updateActiveNavLink('home');
}

function updateNavigationForLoggedInUser() {
  // Update login button to show "Log Out"
  const loginLinks = document.querySelectorAll('.login-btn');
  const bookingsNavItem = document.getElementById('bookings-nav-item');
  
  if (isLoggedIn && currentUser) {
    // Show logout button
    loginLinks.forEach(link => {
      link.textContent = 'Log Out';
      link.classList.add('logout-btn');
    });
    
    // Show bookings navigation
    if (bookingsNavItem) {
      bookingsNavItem.style.display = 'block';
    }
  } else {
    // Show login button
    loginLinks.forEach(link => {
      link.textContent = 'Login';
      link.classList.remove('logout-btn');
    });
    
    // Hide bookings navigation
    if (bookingsNavItem) {
      bookingsNavItem.style.display = 'none';
    }
  }
}

function updateUserWelcome() {
  const userNameDisplay = document.getElementById('user-name-display');
  if (userNameDisplay && currentUser) {
    userNameDisplay.textContent = currentUser.name;
  }
}

function logout() {
    console.log("👋 Logging out user");
    
    // Clear app data
    tokenInMemory = null;
    currentUser = null;
    isLoggedIn = false;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userToken');  // ✅ NUEVA
    localStorage.removeItem('access_token');
    localStorage.clear();
    sessionStorage.clear();
    
    // Update UI immediately
    updateNavigationForLoggedInUser();
    showHomePage();
    
    // ✅ POPUP INVISIBLE (volver a la que funcionaba)
    if (CONFIG.cognitoDomain && CONFIG.clientId) {
        const logoutUrl = `https://${CONFIG.cognitoDomain}/logout?client_id=${CONFIG.clientId}`;
        
        console.log("🔄 Clearing Cognito session silently");
        
        // Popup completamente invisible y fuera de pantalla
        const popup = window.open(
            logoutUrl, 
            'cognito_logout', 
            'width=1,height=1,left=-1000,top=-1000,toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=no,resizable=no'
        );
        
        // Cerrar después de 1.5 segundos
        setTimeout(() => {
            if (popup) popup.close();
        }, 1500);
    }
}

// ✅ TAMBIÉN AGREGAR prompt=login en redirectToCognito
function redirectToCognito() {
  const loginUrl = `https://${CONFIG.cognitoDomain}/oauth2/authorize?` +
    `response_type=code&` +
    `client_id=${CONFIG.clientId}&` +
    `redirect_uri=${encodeURIComponent(CONFIG.redirectUri)}&` +
    `scope=openid+profile+email&` +
    `prompt=select_account&` +  // ✅ SIEMPRE mostrar selector
    `max_age=0`;                // ✅ SIEMPRE forzar re-auth

  console.log("🔗 Forcing account selection");
  window.location.href = loginUrl;
}


function setupSectionNavigation() {
    console.log("🔧 Setting up section navigation"); // ← AGREGAR ESTA LÍNEA
    
    const sectionButtons = document.querySelectorAll('.section-btn');
    const sections = document.querySelectorAll('.booking-section');
    
    console.log("🔍 Found buttons:", sectionButtons.length, "sections:", sections.length); // ← AGREGAR ESTA LÍNEA
    
    sectionButtons.forEach(button => {
        console.log("🔘 Adding listener to button:", button.getAttribute('data-section')); // ← AGREGAR ESTA LÍNEA
        
        button.addEventListener('click', () => {
            const targetSection = button.getAttribute('data-section');
            console.log("🔘 Section button clicked:", targetSection);
            
            // Remove active class from all buttons and sections
            sectionButtons.forEach(btn => btn.classList.remove('active'));
            sections.forEach(section => section.classList.remove('active'));
            
            // Add active class to clicked button and corresponding section
            button.classList.add('active');
            const targetElement = document.getElementById(targetSection);
            if (targetElement) {
                targetElement.classList.add('active');
                
                if (targetSection === 'my-reservations') {
                    loadUserReservations();
                } else if (targetSection === 'my-inscriptions') {
                    loadUserInscriptions();
                } else if (targetSection === 'feedback-form') {
                    setTimeout(() => initializeFeedback(), 100);
                } else if (targetSection === 'my-feedback') {
                    console.log("🚀 About to call loadUserFeedback()");
                    loadUserFeedback();
                }
            } else {
                console.log("❌ Target element not found:", targetSection); // ← AGREGAR ESTA LÍNEA
            }
        });
    });
}

function setupFacilityBooking() {
  const facilityForm = document.getElementById("facility-booking-form");
  const facilityType = document.getElementById("facility-type");
  const bookingDate = document.getElementById("booking-date");
  const bookingTime = document.getElementById("booking-time");
  const availabilityStatus = document.getElementById("availability-status");

  if (!facilityForm) return;

  // Set minimum date to today
  const today = new Date();
  
  // Ajustar a zona horaria Argentina (UTC-3)
  const argentinaOffset = -3 * 60; // -3 horas en minutos
  const localOffset = today.getTimezoneOffset(); // minutos
  const argentinaTime = new Date(today.getTime() + (localOffset + argentinaOffset) * 60000);
  
  const todayArgentina = argentinaTime.toISOString().split("T")[0];
  bookingDate.min = todayArgentina;

  // ✅ FUNCIÓN AVAILABILITY CHECK CORREGIDA
  const checkAvailability = async () => {
    console.log("🔍 checkAvailability TRIGGERED");
    const facility = facilityType.value;
    const date = bookingDate.value;
    const time = bookingTime.value;
    
    console.log("📊 Values:", { facility, date, time });
    console.log("🗺️ Mapped facility:", mapFacilityName(facility));
    console.log("🔑 Token exists:", !!tokenInMemory);
    console.log("🌐 API URL:", CONFIG.apiBaseUrl);

    if (facility && date && time) {
      try {
        const payload = {
          facility: mapFacilityName(facility),
          date: date,
          time: time
        };
        
        console.log("🔄 Sending availability request:", payload);
        
        const response = await fetch(`${CONFIG.apiBaseUrl}/check-availability`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenInMemory}`
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const result = await response.json();
          console.log("✅ Availability response:", result);
          showAvailabilityStatus(result, availabilityStatus);
        } else {
          console.error("❌ Availability check failed:", response.status);
          throw new Error('Availability check failed');
        }

      } catch (error) {
        console.error('❌ Error checking availability:', error);
        showAvailabilityStatus(
          { available: true, message: "Unable to check availability. Please try booking." }, 
          availabilityStatus
        );
      }
    } else {
      availabilityStatus.style.display = "none";
    }
  };

  // ✅ EVENT LISTENERS CORREGIDOS
  facilityType.addEventListener("change", checkAvailability);
  bookingDate.addEventListener("change", checkAvailability);
  bookingTime.addEventListener("change", checkAvailability);

  // ✅ FORM SUBMISSION CORREGIDO
  facilityForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    console.log("📝 Form submitted");
    
    // Prevenir doble envío
    if (window.isSubmittingBooking) {
      console.log("⚠️ Already submitting booking, ignoring");
      return;
    }
    
    // Validar campos
    const facility = facilityType.value;
    const date = bookingDate.value;
    const time = bookingTime.value;
    
    if (!facility || !date || !time) {
      alert('Please fill in all fields');
      return;
    }
    
    // Llamar función de booking
    await submitBooking(facility, date, time, facilityForm, availabilityStatus);
  });
}

function showAvailabilityStatus(result, statusElement) {
  statusElement.style.display = "block";
  
  if (result.available) {
    statusElement.className = "availability-check available";
  } else {
    statusElement.className = "availability-check unavailable";
  }
  
  statusElement.querySelector(".availability-message").textContent = result.message;
}

// ✅ VARIABLE GLOBAL PARA PREVENIR DOBLE ENVÍO
window.isSubmittingBooking = false;

// ✅ FUNCIÓN SUBMITBOOKING CORREGIDA
async function submitBooking(facility, date, time, form, statusElement) {
    console.log("🚀 submitBooking called with:", { facility, date, time });
    
    // Prevenir doble envío
    if (window.isSubmittingBooking) {
        console.log("⚠️ Booking already in progress, ignoring duplicate request");
        return;
    }

    window.isSubmittingBooking = true;
    
    // Deshabilitar botón de submit
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = "Booking...";

    try {
        console.log("🔄 Submitting booking request...");
        
        const payload = {
          facility: mapFacilityName(facility),
          date: date,
          time: time
        };
        
        console.log("📦 Booking payload:", payload);
        
        const response = await fetch(`${CONFIG.apiBaseUrl}/create-reservation`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${tokenInMemory}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("📥 Booking response:", data);

        if (response.ok) {
            console.log("✅ Booking successful:", data);
            
            // ✅ USAR EL MISMO ESTILO QUE INSCRIPCIONES
            showBookingMessage(data.message || '✅ Booking confirmed! Your reservation has been created successfully.', 'success');
            
            // Limpiar formulario
            form.reset();
            // Ocultar status de availability
            statusElement.style.display = 'none';
            
        } else {
            console.error("❌ Booking failed:", data);
            
            // ✅ USAR EL MISMO ESTILO QUE INSCRIPCIONES  
            showBookingMessage(data.message || '❌ Booking failed. Unable to create reservation. Please try again.', 'error');
        }

    } catch (error) {
        console.error("❌ Network error during booking:", error);
        showBookingMessage('❌ Network error. Please check your connection and try again.', 'error');
    } finally {
        // Siempre rehabilitar botón y resetear flag
        window.isSubmittingBooking = false;
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    }
}

function mapFacilityName(frontendName) {
  const facilityMap = {
    'gym': 'GYM',
    'pool': 'POOL',
    'tennis': 'TENNIS',           
    'basketball': 'BASKETBALL',   
    'yoga-room': 'YOGA_ROOM',
    'squash': 'SQUASH'
  };
  return facilityMap[frontendName] || frontendName.toUpperCase();
}

// ======================
// MY RESERVATIONS FUNCTIONALITY
// ======================

// REEMPLAZAR la función loadUserReservations
async function loadUserReservations() {
    console.log("🔄 Loading user reservations...");
    
    // ✅ VERIFICAR TOKEN ANTES DE LA PETICIÓN
    if (!isLoggedIn || !tokenInMemory || isTokenExpired(tokenInMemory)) {
        console.log("❌ User not logged in or token expired");
        showReservationsError("Please log in to view your reservations");
        // Opcional: redirigir a login automáticamente
        setTimeout(() => {
            logout();
        }, 2000);
        return;
    }

    // Show loading state
    showReservationsLoading();

    try {
        const response = await fetch(`${CONFIG.apiBaseUrl}/my-reservations`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${tokenInMemory}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok) {
            console.log("✅ Reservations loaded:", data);
            displayReservations(data.reservas || []);
        } else if (response.status === 401 || response.status === 403) {
            // ✅ TOKEN EXPIRADO - LOGOUT AUTOMÁTICO
            console.log("❌ Token expired (401/403), logging out...");
            showReservationsError("Session expired. Please log in again.");
            setTimeout(() => {
                logout();
            }, 2000);
        } else {
            console.error("❌ Error loading reservations:", data);
            showReservationsError(data.error || "Failed to load reservations");
        }

    } catch (error) {
        console.error("❌ Network error loading reservations:", error);
        showReservationsError("Network error. Please check your connection.");
    }
}

function displayReservations(reservas) {
    console.log("🔍 displayReservations executing - NO DETAILS BUTTON VERSION"); // ✅ AGREGAR ESTA LÍNEA
    
    const container = document.getElementById('reservations-list');
    const emptyState = document.getElementById('reservations-empty');
    
    hideReservationsLoading();
    
    if (!reservas || reservas.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    
    // Debug: Log the reservation IDs being generated
    reservas.forEach(reserva => {
        console.log(`🔍 DEBUG - Reservation ID: ${reserva.id}, Facility: ${reserva.instalacion}, Date: ${reserva.fecha}`);
    });
    
    container.innerHTML = reservas.map(reserva => `
        <div class="reservation-card status-${reserva.estado}">
            <div class="reservation-header">
                <div class="reservation-facility">${reserva.instalacion}</div>
                <div class="reservation-status status-${reserva.estado}">${reserva.estado}</div>
            </div>
            
            <div class="reservation-details">
                <div class="reservation-detail">
                    <span class="detail-label">Date:</span>
                    <span class="detail-value">${formatDate(reserva.fecha)}</span>
                </div>
                <div class="reservation-detail">
                    <span class="detail-label">Time:</span>
                    <span class="detail-value">${formatTime(reserva.hora)}</span>
                </div>
                <div class="reservation-detail">
                    <span class="detail-label">Booked:</span>
                    <span class="detail-value">${formatDateTime(reserva.created_at)}</span>
                </div>
            </div>
            
            <div class="reservation-actions">
                ${reserva.estado === 'activo' ? `
                    <button class="btn btn-small btn-secondary cancel-btn ${!canCancelReservation(reserva.fecha, reserva.hora) ? 'btn-disabled' : ''}" 
                            onclick="cancelReservation('${reserva.id}')"
                            data-reservation-date="${reserva.fecha}"
                            data-reservation-time="${reserva.hora}"
                            ${!canCancelReservation(reserva.fecha, reserva.hora) ? 'title="Cannot cancel less than 24 hours before reservation"' : ''}>
                        Cancel
                    </button>
                ` : reserva.estado === 'cancelado' ? `
                    <span class="status-text">Cancelled</span>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function showReservationsLoading() {
    document.getElementById('reservations-loading').style.display = 'block';
    document.getElementById('reservations-error').style.display = 'none';
    document.getElementById('reservations-container').style.display = 'none';
}

function hideReservationsLoading() {
    document.getElementById('reservations-loading').style.display = 'none';
    document.getElementById('reservations-error').style.display = 'none';
    document.getElementById('reservations-container').style.display = 'block';
}

function showReservationsError(message) {
    document.getElementById('reservations-loading').style.display = 'none';
    document.getElementById('reservations-error').style.display = 'block';
    document.getElementById('reservations-container').style.display = 'none';
    
    const errorElement = document.getElementById('reservations-error');
    errorElement.querySelector('p').textContent = message;
}

// Utility functions for formatting
function formatDate(dateString) {
    try {
        // Parsear fecha como local, no como UTC
        const [year, month, day] = dateString.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return dateString;
    }
}

function formatTime(timeString) {
    try {
        const [hours, minutes] = timeString.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    } catch {
        return timeString;
    }
}

function formatDateTime(dateTimeString) {
    try {
        const date = new Date(dateTimeString);
        // Restar 3 horas (en milisegundos)
        date.setHours(date.getHours() - 3);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    } catch {
        return 'Recently';
    }
}

// Placeholder functions for future functionality
// REEMPLAZAR la función cancelReservation existente:
async function cancelReservation(reservationId) {
    console.log("🚫 Cancel reservation:", reservationId);
    console.log("🔍 DEBUG - Full reservation_id being sent:", reservationId);
    
    // Verificar autenticación
    if (!isLoggedIn || !tokenInMemory || isTokenExpired(tokenInMemory)) {
        alert("Please log in to cancel your reservation.");
        logout();
        return;
    }

    // Confirmación antes de cancelar
    const confirmCancel = confirm(
        "Are you sure you want to cancel this reservation?\n\n" +
        "Note: You can only cancel reservations that are more than 24 hours away.\n" +
        "This action cannot be undone."
    );
    
    if (!confirmCancel) {
        console.log("❌ Cancellation cancelled by user");
        return;
    }

    // Mostrar estado de loading
    const cancelButton = event.target;
    const originalButtonText = cancelButton.textContent;
    cancelButton.disabled = true;
    cancelButton.textContent = "Cancelling...";

    try {
        console.log("🔄 Sending cancellation request...");
        
        const response = await fetch(`${CONFIG.apiBaseUrl}/cancel-reservation`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${tokenInMemory}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reservation_id: reservationId
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log("✅ Reservation cancelled successfully:", data);
            
            // Mostrar mensaje de éxito
            showCancellationSuccess(data);
            
            // Recargar la lista de reservas
            setTimeout(() => {
                loadUserReservations();
            }, 1500);
            
        } else {
            console.error("❌ Cancellation failed:", data);
            handleCancellationError(response.status, data);
        }

    } catch (error) {
        console.error("❌ Network error during cancellation:", error);
        alert("Network error. Please check your connection and try again.");
    } finally {
        // Restaurar botón (si aún existe)
        if (cancelButton) {
            cancelButton.disabled = false;
            cancelButton.textContent = originalButtonText;
        }
    }
}

// Función para mostrar éxito en cancelación
function showCancellationSuccess(data) {
    const message = data.reservation_details ? 
        `Reservation cancelled successfully!\n\n` +
        `Facility: ${data.reservation_details.facility}\n` +
        `Date: ${formatDate(data.reservation_details.date)}\n` +
        `Time: ${formatTime(data.reservation_details.time)}` :
        "Reservation cancelled successfully!";
        
    alert(message);
}

// Función para manejar errores de cancelación
function handleCancellationError(status, data) {
    let errorMessage = "Failed to cancel reservation.";
    
    switch (status) {
        case 400:
            if (data.hours_remaining !== undefined) {
                errorMessage = `Cannot cancel reservation. You need to cancel at least 24 hours in advance.\n\n` 
            } else {
                errorMessage = data.error || "Invalid cancellation request.";
            }
            break;
            
        case 401:
        case 403:
            errorMessage = "Authentication error. Please log in again.";
            setTimeout(() => logout(), 2000);
            break;
            
        case 404:
            errorMessage = "Reservation not found. It may have already been cancelled.";
            break;
            
        case 409:
            errorMessage = "Reservation is already cancelled.";
            break;
            
        default:
            errorMessage = data.error || data.message || "An unexpected error occurred.";
    }
    
    alert(errorMessage);
}

// Función para verificar si puede cancelar (solo visual, la validación real está en backend)
function canCancelReservation(dateString, timeString) {
  try {
      // Parsear fecha y hora como local
      const [year, month, day] = dateString.split('-');
      const [hours, minutes] = timeString.split(':');
      const reservationDateTime = new Date(
          parseInt(year), 
          parseInt(month) - 1, 
          parseInt(day),
          parseInt(hours),
          parseInt(minutes)
      );
      
      const now = new Date();
      const hoursUntilReservation = (reservationDateTime - now) / (1000 * 60 * 60);
      
      return hoursUntilReservation >= 24;
  } catch {
      return true; // Si hay error, permitir intento (el backend validará)
  }
}

// Agregar esta función NUEVA después de las funciones existentes
function isTokenExpired(token) {
    if (!token) return true;
    
    try {
        // Decode JWT token
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const decoded = JSON.parse(jsonPayload);
        const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
        
        // Check if token is expired (add 5 minute buffer)
        return decoded.exp < (currentTime + 300);
    } catch (error) {
        console.error("Error checking token expiration:", error);
        return true;
    }
}

function checkExistingSession() {
  // ✅ CRÍTICO: No restaurar si acabamos de hacer logout
  const forceFresh = localStorage.getItem('force_fresh_login');
  if (forceFresh === 'true') {
    console.log("🚫 Force fresh login active, skipping session restore");
    showHomePage();
    return;
  }

  const savedUser = JSON.parse(localStorage.getItem("currentUser") || "null");
  const savedToken = localStorage.getItem('userToken'); // ✅ RESTAURAR TOKEN
  
  if (savedUser && savedToken && !isTokenExpired(savedToken)) {
    console.log("✅ Existing session and valid token found");
    currentUser = savedUser;
    tokenInMemory = savedToken; // ✅ RESTAURAR TOKEN EN MEMORIA
    isLoggedIn = true;
    showHomePage();
    updateNavigationForLoggedInUser();
  } else {
    console.log("ℹ️ No valid session or token expired");
    // ✅ LIMPIAR SI TOKEN EXPIRADO
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userToken');
    showHomePage();
  }
}

function startTokenMonitoring() {
    // Verificar token cada 5 minutos
    setInterval(() => {
        if (isLoggedIn && tokenInMemory && isTokenExpired(tokenInMemory)) {
            console.log("⏰ Token expired - auto logout");
            logout();
        }
    }, 5 * 60 * 1000); // 5 minutos
}

// ✅ AGREGAR AL FINAL DEL ARCHIVO auth.js (después de línea ~1000):

// ======================
// MY INSCRIPTIONS FUNCTIONALITY  
// ======================

async function loadUserInscriptions() {
    console.log("🔄 Loading user inscriptions...");
    
    // Verificar token antes de la petición
    if (!isLoggedIn || !tokenInMemory || isTokenExpired(tokenInMemory)) {
        console.log("❌ User not logged in or token expired");
        showInscriptionsError("Please log in to view your inscriptions");
        setTimeout(() => {
            logout();
        }, 2000);
        return;
    }

    // Show loading state
    showInscriptionsLoading();

    try {
        const response = await fetch(`${CONFIG.apiBaseUrl}/my-inscriptions`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${tokenInMemory}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok) {
            console.log("✅ Inscriptions loaded:", data);
            displayInscriptions(data.inscripciones || []);
        } else if (response.status === 401 || response.status === 403) {
            console.log("❌ Token expired (401/403), logging out...");
            showInscriptionsError("Session expired. Please log in again.");
            setTimeout(() => {
                logout();
            }, 2000);
        } else {
            console.error("❌ Error loading inscriptions:", data);
            showInscriptionsError(data.error || "Failed to load inscriptions");
        }

    } catch (error) {
        console.error("❌ Network error loading inscriptions:", error);
        showInscriptionsError("Network error. Please check your connection.");
    }
}

function displayInscriptions(inscriptions) {
    console.log("🔍 displayInscriptions executing");
    
    const container = document.getElementById('inscriptions-list');
    const emptyState = document.getElementById('inscriptions-empty');
    
    hideInscriptionsLoading();
    
    if (!inscriptions || inscriptions.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    
    container.innerHTML = inscriptions.map(inscription => `
        <div class="reservation-card status-${inscription.estado}">
            <div class="reservation-header">
                <div class="reservation-facility">${inscription.clase}</div>
                <div class="reservation-status status-${inscription.estado}">${inscription.estado}</div>
            </div>
            
            <div class="reservation-details">
                <div class="reservation-detail">
                    <span class="detail-label">Date:</span>
                    <span class="detail-value">${formatDate(inscription.fecha)}</span>
                </div>
                <div class="reservation-detail">
                    <span class="detail-label">Time:</span>
                    <span class="detail-value">${formatTime(inscription.hora)}</span>
                </div>
                <div class="reservation-detail">
                    <span class="detail-label">Instructor:</span>
                    <span class="detail-value">${inscription.instructor || 'TBA'}</span>
                </div>
                <div class="reservation-detail">
                    <span class="detail-label">Enrolled:</span>
                    <span class="detail-value">${formatDateTime(inscription.created_at)}</span>
                </div>
            </div>
            
            <div class="reservation-actions">
                ${inscription.estado === 'activo' ? `
                    <button class="btn btn-small btn-secondary cancel-btn ${!canCancelInscription(inscription.fecha, inscription.hora) ? 'btn-disabled' : ''}" 
                            onclick="cancelInscription('${inscription.id}')"
                            data-inscription-date="${inscription.fecha}"
                            data-inscription-time="${inscription.hora}"
                            ${!canCancelInscription(inscription.fecha, inscription.hora) ? 'title="Cannot cancel less than 24 hours before class"' : ''}>
                        Cancel
                    </button>
                ` : inscription.estado === 'cancelado' ? `
                    <span class="status-text">Cancelled</span>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Funciones auxiliares para inscripciones
function showInscriptionsLoading() {
    document.getElementById('inscriptions-loading').style.display = 'block';
    document.getElementById('inscriptions-error').style.display = 'none';
    document.getElementById('inscriptions-container').style.display = 'none';
}

function hideInscriptionsLoading() {
    document.getElementById('inscriptions-loading').style.display = 'none';
    document.getElementById('inscriptions-error').style.display = 'none';
    document.getElementById('inscriptions-container').style.display = 'block';
}

function showInscriptionsError(message) {
    const errorElement = document.getElementById('inscriptions-error');
    const errorText = errorElement.querySelector('p');
    if (errorText) {
        errorText.textContent = message;
    }
    
    document.getElementById('inscriptions-loading').style.display = 'none';
    document.getElementById('inscriptions-error').style.display = 'block';
    document.getElementById('inscriptions-container').style.display = 'none';
}

// Función para cancelar inscripción
async function cancelInscription(inscriptionId) {
    console.log("🚫 Cancel inscription:", inscriptionId);
    
    // Verificar autenticación
    if (!isLoggedIn || !tokenInMemory || isTokenExpired(tokenInMemory)) {
        alert("Please log in to cancel your inscription.");
        logout();
        return;
    }

    // Confirmación antes de cancelar
    const confirmCancel = confirm(
        "Are you sure you want to cancel this class inscription?\n\n" +
        "Note: You can only cancel classes that are more than 24 hours away.\n" +
        "This action cannot be undone."
    );
    
    if (!confirmCancel) {
        console.log("❌ Cancellation cancelled by user");
        return;
    }

    // Mostrar estado de loading
    const cancelButton = event.target;
    const originalButtonText = cancelButton.textContent;
    cancelButton.disabled = true;
    cancelButton.textContent = "Cancelling...";

    try {
        console.log("🔄 Sending cancellation request...");
        
        const response = await fetch(`${CONFIG.apiBaseUrl}/cancel-inscription`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${tokenInMemory}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inscripcion_id: inscriptionId  
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log("✅ Inscription cancelled successfully:", data);
            
            // Mostrar mensaje de éxito
            showInscriptionCancellationSuccess(data);
            
            // Recargar la lista de inscripciones
            setTimeout(() => {
                loadUserInscriptions();
            }, 1500);
            
        } else {
            console.error("❌ Cancellation failed:", data);
            handleInscriptionCancellationError(response.status, data);
        }

    } catch (error) {
        console.error("❌ Network error during cancellation:", error);
        alert("Network error. Please check your connection and try again.");
    } finally {
        // Restaurar botón (si aún existe)
        if (cancelButton) {
            cancelButton.disabled = false;
            cancelButton.textContent = originalButtonText;
        }
    }
}

// Función para mostrar éxito en cancelación de inscripción
function showInscriptionCancellationSuccess(data) {
    const message = data.class_details ? 
        `Class inscription cancelled successfully!\n\n` +
        `Class: ${data.class_details.class}\n` +
        `Date: ${formatDate(data.class_details.date)}\n` +
        `Time: ${formatTime(data.class_details.time)}` :
        "Class inscription cancelled successfully!";
        
    alert(message);
}

// Función para manejar errores de cancelación de inscripción
function handleInscriptionCancellationError(status, data) {
    let errorMessage = "Failed to cancel inscription.";
    
    switch (status) {
        case 400:
            if (data.hours_remaining !== undefined) {
                errorMessage = `Cannot cancel inscription. You need to cancel at least 24 hours in advance.\n\n` 
            } else {
                errorMessage = data.error || "Invalid cancellation request.";
            }
            break;
            
        case 401:
        case 403:
            errorMessage = "Authentication error. Please log in again.";
            setTimeout(() => logout(), 2000);
            break;
            
        case 404:
            errorMessage = "Inscription not found. It may have already been cancelled.";
            break;
            
        case 409:
            errorMessage = "Inscription is already cancelled.";
            break;
            
        default:
            errorMessage = data.error || data.message || "An unexpected error occurred.";
    }
    
    alert(errorMessage);
}

// Función para verificar si puede cancelar inscripción (solo visual, la validación real está en backend)
function canCancelInscription(dateString, timeString) {
    try {
        // Parsear fecha y hora como local
        const [year, month, day] = dateString.split('-');
        const [hours, minutes] = timeString.split(':');
        const classDateTime = new Date(
            parseInt(year), 
            parseInt(month) - 1, 
            parseInt(day),
            parseInt(hours),
            parseInt(minutes)
        );
        
        const now = new Date();
        const hoursUntilClass = (classDateTime - now) / (1000 * 60 * 60);
        
        return hoursUntilClass >= 24;
    } catch {
        return true; // Si hay error, permitir intento (el backend validará)
    }
}

// Función para cargar feedback del usuario
async function loadUserFeedback() {
    console.log("📋 Loading user feedback...");
    
    if (!isLoggedIn || !tokenInMemory || isTokenExpired(tokenInMemory)) {
        showFeedbackError("Please log in to view your feedback.");
        logout();
        return;
    }

    showFeedbackLoading();

    try {
        const response = await fetch(`${CONFIG.apiBaseUrl}/feedback`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${tokenInMemory}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log("✅ Feedback loaded:", data);
            
            hideFeedbackLoading();
            displayFeedback(data.feedback || []);
            
        } else if (response.status === 401) {
            hideFeedbackLoading();
            showFeedbackError("Session expired. Please log in again.");
            logout();
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to load feedback');
        }

    } catch (error) {
        console.error("❌ Error loading feedback:", error);
        hideFeedbackLoading();
        showFeedbackError(error.message);
    }
}

function displayFeedback(feedbackList) {
    const container = document.getElementById('feedback-container');
    const emptyState = document.getElementById('feedback-empty');
    const feedbackListElement = document.getElementById('feedback-list');
    
    if (!container || !emptyState || !feedbackListElement) return;

    if (feedbackList.length === 0) {
        emptyState.style.display = 'block';
        feedbackListElement.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    feedbackListElement.style.display = 'grid';
    feedbackListElement.innerHTML = '';

    feedbackList.forEach(feedback => {
        const feedbackCard = createFeedbackCard(feedback);
        feedbackListElement.appendChild(feedbackCard);
    });
}

function createFeedbackCard(feedback) {
    const card = document.createElement('div');
    card.className = 'reservation-card';
    
    const statusClass = feedback.estado === 'resuelto' ? 'status-completed' :
                       feedback.estado === 'pendiente' ? 'status-active' : 'status-active';
    
    const priorityClass = `priority-${feedback.priority}`;
    
    card.innerHTML = `
        <div class="reservation-header">
            <h4>${feedback.title}</h4>
            <span class="reservation-status ${statusClass}">${feedback.estado}</span>
        </div>
        <div class="reservation-details">
            <p><strong>Type:</strong> ${feedback.type}</p>
            <p><strong>Target:</strong> ${feedback.target_name}</p>
            <p><strong>Priority:</strong> <span class="${priorityClass}">${feedback.priority}</span></p>
            <p><strong>Description:</strong> ${feedback.description}</p>
            <p><strong>Date:</strong> ${formatDateTime(feedback.created_at)}</p>
        </div>
    `;
    
    return card;
}

function showFeedbackLoading() {
    document.getElementById('feedback-loading').style.display = 'block';
    document.getElementById('feedback-error').style.display = 'none';
    document.getElementById('feedback-container').style.display = 'none';
}

function hideFeedbackLoading() {
    document.getElementById('feedback-loading').style.display = 'none';
    document.getElementById('feedback-error').style.display = 'none';
    document.getElementById('feedback-container').style.display = 'block';
}

function showFeedbackError(message) {
    document.getElementById('feedback-loading').style.display = 'none';
    document.getElementById('feedback-container').style.display = 'none';
    const errorElement = document.getElementById('feedback-error');
    errorElement.style.display = 'block';
    errorElement.querySelector('p').textContent = message;
}

// ✅ FUNCIÓN PARA MOSTRAR MENSAJES DE BOOKING (IGUAL QUE ENROLLMENT)
function showBookingMessage(message, type = 'info') {
  // Remove existing message
  const existingMessage = document.querySelector('.booking-message');
  if (existingMessage) {
    existingMessage.remove();
  }

  // Create new message
  const messageDiv = document.createElement('div');
  messageDiv.className = `booking-message enrollment-message ${type}`;
  messageDiv.textContent = message;

  // Insert before form
  const form = document.getElementById('facility-booking-form');
  if (form) {
    form.parentNode.insertBefore(messageDiv, form);
    
    // Auto-remove success/error messages after 5 seconds
    if (type === 'success' || type === 'error') {
      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.remove();
        }
      }, 5000);
    }
  }
}