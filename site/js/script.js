// Mobile menu toggle
document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.querySelector(".hamburger")
  const navMenu = document.querySelector(".nav-menu")

  if (hamburger && navMenu) {
    hamburger.addEventListener("click", () => {
      hamburger.classList.toggle("active")
      navMenu.classList.toggle("active")
    })
  }

  // Close mobile menu when clicking on a link
  document.querySelectorAll(".nav-link").forEach((n) =>
    n.addEventListener("click", () => {
      if (hamburger && navMenu) {
        hamburger.classList.remove("active")
        navMenu.classList.remove("active")
      }
    }),
  )

  // Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault()
    const href = this.getAttribute("href")
    const target = document.querySelector(href)
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }
  })
})

  // Initialize demo data if not exists
  initializeDemoData()
})

function initializeDemoData() {
  // Create admin user if not exists
  const users = JSON.parse(localStorage.getItem("users") || "[]")
  const adminExists = users.some((user) => user.email === "admin@elitesportsclub.com")

  if (!adminExists) {
    const adminUser = {
      id: "admin-" + Date.now(),
      name: "Admin User",
      email: "admin@elitesportsclub.com",
      password: "admin123",
      phone: "(555) 123-4567",
      role: "admin",
      joinDate: new Date().toISOString(),
    }
    users.push(adminUser)
    localStorage.setItem("users", JSON.stringify(users))
  }

  // Initialize sample classes if not exists
  const classes = JSON.parse(localStorage.getItem("classes") || "[]")
  if (classes.length === 0) {
    const sampleClasses = [
      {
        id: "class-1",
        name: "Morning Yoga",
        trainer: "Sarah Johnson",
        date: getNextWeekday(1), // Monday
        time: "07:00",
        capacity: 20,
        enrolled: 12,
        description: "Start your week with energizing yoga session",
      },
      {
        id: "class-2",
        name: "CrossFit Training",
        trainer: "Mike Wilson",
        date: getNextWeekday(2), // Tuesday
        time: "18:00",
        capacity: 15,
        enrolled: 8,
        description: "High-intensity functional fitness workout",
      },
      {
        id: "class-3",
        name: "Swimming Lessons",
        trainer: "Emma Davis",
        date: getNextWeekday(6), // Saturday
        time: "10:00",
        capacity: 10,
        enrolled: 10,
        description: "Learn proper swimming techniques",
      },
      {
        id: "class-4",
        name: "Pilates",
        trainer: "Lisa Chen",
        date: getNextWeekday(3), // Wednesday
        time: "19:00",
        capacity: 12,
        enrolled: 5,
        description: "Core strengthening and flexibility",
      },
    ]
    localStorage.setItem("classes", JSON.stringify(sampleClasses))
  }

  // Initialize trainers list
  const trainers = JSON.parse(localStorage.getItem("trainers") || "[]")
  if (trainers.length === 0) {
    const sampleTrainers = [
      { id: "trainer-1", name: "Sarah Johnson", specialty: "Yoga" },
      { id: "trainer-2", name: "Mike Wilson", specialty: "CrossFit" },
      { id: "trainer-3", name: "Emma Davis", specialty: "Swimming" },
      { id: "trainer-4", name: "Lisa Chen", specialty: "Pilates" },
      { id: "trainer-5", name: "John Smith", specialty: "Personal Training" },
      { id: "trainer-6", name: "Maria Garcia", specialty: "Zumba" },
    ]
    localStorage.setItem("trainers", JSON.stringify(sampleTrainers))
  }
}

function getNextWeekday(dayOfWeek) {
  const today = new Date()
  const daysUntilTarget = (dayOfWeek - today.getDay() + 7) % 7
  const targetDate = new Date(today)
  targetDate.setDate(today.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget))
  return targetDate.toISOString().split("T")[0]
}

// ===============================================
// CLASS ENROLLMENT SYSTEM
// ===============================================

let availableClasses = [];
let selectedClassData = null;

// Class type icons mapping
const classIcons = {
  'YOGA': '🧘‍♀️',
  'PILATES': '🤸‍♀️',
  'ZUMBA': '💃',
  'SPINNING': '🚴‍♀️',
  'CROSSFIT': '🏋️‍♀️'
};

// Initialize class enrollment when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initializeClassEnrollment();
  initializeFeedback(); 
});

function initializeClassEnrollment() {
  // Load classes when class enrollment tab is clicked
  document.querySelector('[data-section="class-enrollment"]')?.addEventListener('click', function() {
    loadAvailableClasses();
  });

  // Handle form submission
  const classForm = document.getElementById('class-enrollment-form');
  if (classForm) {
    classForm.addEventListener('submit', handleClassEnrollment);
  }

  // Handle dropdown changes
  document.getElementById('class-type')?.addEventListener('change', handleClassTypeChange);
  document.getElementById('class-date')?.addEventListener('change', handleClassDateChange);
  document.getElementById('class-time')?.addEventListener('change', handleClassTimeChange);
}

async function loadAvailableClasses() {
  try {
    // Show loading state
    showLoadingMessage('Loading available classes...');
    
    const token = tokenInMemory;
    if (!token) {
      showEnrollmentMessage('Please log in to view classes', 'error');
      return;
    }

    const response = await fetch(`${window.CLUB_SPORTS_CONFIG.apiBaseUrl}/clases`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      availableClasses = data.clases || [];
      populateClassTypes();
      hideLoadingMessage();
      
      // ✅ CORREGIR ESTA LÍNEA:
      if (availableClasses.length === 0) {  // Era: availableClases
        showEnrollmentMessage('No classes available at the moment. Please check back later!', 'warning');
      }
    } else if (response.status === 401) {
      showEnrollmentMessage('Please log in to access classes', 'error');
      // ✅ QUITAR LA REDIRECCIÓN como ya habíamos discutido
    } else {
      throw new Error('Failed to load classes');
    }
  } catch (error) {
    console.error('Error loading classes:', error);
    showEnrollmentMessage('Error loading classes. Please try again.', 'error');
    hideLoadingMessage();
  }
}

function populateClassTypes() {
  const classTypeSelect = document.getElementById('class-type');
  if (!classTypeSelect) return;

  // Clear existing options except the placeholder
  classTypeSelect.innerHTML = '<option value="">Select a class</option>';

  // Add class options
  availableClasses.forEach(clase => {
    const option = document.createElement('option');
    option.value = clase.nombre;
    option.textContent = `${classIcons[clase.nombre] || '🏃‍♀️'} ${clase.nombre}`;
    classTypeSelect.appendChild(option);
  });

  // Reset dependent dropdowns
  resetDateSelect();
  resetTimeSelect();
  hideClassInfo();
}

function handleClassTypeChange(event) {
  const selectedClass = event.target.value;
  
  if (selectedClass) {
    populateClassDates(selectedClass);
  } else {
    resetDateSelect();
    resetTimeSelect();
    hideClassInfo();
  }
}

function populateClassDates(className) {
  const selectedClass = availableClasses.find(clase => clase.nombre === className);
  if (!selectedClass) return;

  const dateSelect = document.getElementById('class-date');
  if (!dateSelect) return;

  // Clear existing options
  dateSelect.innerHTML = '<option value="">Select a date</option>';

  // Group schedules by date
  const dateGroups = {};
  selectedClass.horarios.forEach(horario => {
    const fecha = horario.fecha;
    if (!dateGroups[fecha]) {
      dateGroups[fecha] = [];
    }
    dateGroups[fecha].push(horario);
  });

  // Add date options
  Object.keys(dateGroups).sort().forEach(fecha => {
    const option = document.createElement('option');
    option.value = fecha;
    
    const fechaObj = new Date(fecha + 'T00:00:00');
    const diaSemana = fechaObj.toLocaleDateString('es-ES', { weekday: 'long' });
    const fechaFormateada = fechaObj.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
    
    option.textContent = `${diaSemana}, ${fechaFormateada}`;
    dateSelect.appendChild(option);
  });

  // Enable date select
  dateSelect.disabled = false;
  
  // Reset time select
  resetTimeSelect();
  hideClassInfo();
}

function handleClassDateChange(event) {
  const selectedDate = event.target.value;
  const selectedClass = document.getElementById('class-type').value;
  
  if (selectedDate && selectedClass) {
    populateClassTimes(selectedClass, selectedDate);
  } else {
    resetTimeSelect();
    hideClassInfo();
  }
}

function populateClassTimes(className, fecha) {
  const selectedClass = availableClasses.find(clase => clase.nombre === className);
  if (!selectedClass) return;

  const timeSelect = document.getElementById('class-time');
  if (!timeSelect) return;

  // Clear existing options
  timeSelect.innerHTML = '<option value="">Select a time</option>';

  // Find schedules for the selected date
  const horariosDelDia = selectedClass.horarios.filter(horario => horario.fecha === fecha);

  // Add time options
  horariosDelDia.forEach(horario => {
    const option = document.createElement('option');
    option.value = horario.hora;
    option.textContent = `${horario.hora} - ${horario.instructor} (${horario.cupoDisponible} cupos disponibles)`;
    option.dataset.horarioData = JSON.stringify(horario);
    
    // Disable if no spots available
    if (horario.cupoDisponible <= 0) {
      option.disabled = true;
      option.textContent += ' - LLENO';
    }
    
    timeSelect.appendChild(option);
  });

  // Enable time select
  timeSelect.disabled = false;
  hideClassInfo();
}

function handleClassTimeChange(event) {
  const selectedTime = event.target.value;
  const selectedOption = event.target.selectedOptions[0];
  
  if (selectedTime && selectedOption.dataset.horarioData) {
    const horarioData = JSON.parse(selectedOption.dataset.horarioData);
    selectedClassData = {
      nombre: document.getElementById('class-type').value,
      fecha: document.getElementById('class-date').value,
      hora: selectedTime,
      ...horarioData
    };
    
    showClassInfo(selectedClassData);
  } else {
    hideClassInfo();
    selectedClassData = null;
  }
}

function showClassInfo(classData) {
  const classInfoDiv = document.getElementById('class-info');
  const classDetailsDiv = document.getElementById('class-details-content');
  
  if (!classInfoDiv || !classDetailsDiv) return;

  const fechaObj = new Date(classData.fecha + 'T00:00:00');
  const diaSemana = fechaObj.toLocaleDateString('es-ES', { weekday: 'long' });
  const fechaFormateada = fechaObj.toLocaleDateString('es-ES', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  // Determine cupo badge class
  let cupoBadgeClass = 'cupo-disponible';
  if (classData.cupoDisponible <= 3) {
    cupoBadgeClass = 'cupo-bajo';
  }
  if (classData.cupoDisponible <= 0) {
    cupoBadgeClass = 'cupo-lleno';
  }

  classDetailsDiv.innerHTML = `
    <div class="class-details-grid">
      <div class="detail-item">
        <span class="detail-label">Clase</span>
        <span class="detail-value">
          <span class="class-type-icon">${classIcons[classData.nombre] || '🏃‍♀️'}</span>
          ${classData.nombre}
        </span>
      </div>
      
      <div class="detail-item">
        <span class="detail-label">Fecha</span>
        <span class="detail-value">${diaSemana}, ${fechaFormateada}</span>
      </div>
      
      <div class="detail-item">
        <span class="detail-label">Hora</span>
        <span class="detail-value">${classData.hora}</span>
      </div>
      
      <div class="detail-item">
        <span class="detail-label">Instructor</span>
        <span class="detail-value">
          <div class="instructor-info">
            <div class="instructor-icon">👨‍🏫</div>
            ${classData.instructor}
          </div>
        </span>
      </div>
      
      <div class="detail-item">
        <span class="detail-label">Disponibilidad</span>
        <span class="detail-value">
          <div class="cupo-indicator">
            <span class="cupo-badge ${cupoBadgeClass}">
              ${classData.cupoDisponible} / ${classData.cupoMaximo} cupos
            </span>
          </div>
        </span>
      </div>
    </div>
  `;

  classInfoDiv.style.display = 'block';
}

function hideClassInfo() {
  const classInfoDiv = document.getElementById('class-info');
  if (classInfoDiv) {
    classInfoDiv.style.display = 'none';
  }
}

async function handleClassEnrollment(event) {
  event.preventDefault();
  
  if (!selectedClassData) {
    showEnrollmentMessage('Please select a class, date, and time first.', 'error');
    return;
  }

  const submitBtn = event.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  
  try {
    // Update button state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enrolling...';
    
    // ✅ CAMBIAR ESTA LÍNEA: usar tokenInMemory en lugar de localStorage
    const token = tokenInMemory; // Era: localStorage.getItem('access_token');
    if (!token) {
      showEnrollmentMessage('Please log in to enroll in classes', 'error');
      return;
    }

    const enrollmentData = {
      nombre_clase: selectedClassData.nombre,
      fecha: selectedClassData.fecha,
      hora: selectedClassData.hora
    };

    const response = await fetch(`${window.CLUB_SPORTS_CONFIG.apiBaseUrl}/inscripcion`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(enrollmentData)
    });

    const data = await response.json();

    if (response.ok) {
      showEnrollmentMessage(data.message || 'Successfully enrolled in class!', 'success');
      
      // Reset form
      document.getElementById('class-enrollment-form').reset();
      resetDateSelect();
      resetTimeSelect();
      hideClassInfo();
      selectedClassData = null;
      
      // Reload classes to update availability
      setTimeout(() => {
        loadAvailableClasses();
      }, 2000);
      
    } else {
      showEnrollmentMessage(data.error || data.message || 'Failed to enroll in class', 'error');    }

  } catch (error) {
    console.error('Error enrolling in class:', error);
    showEnrollmentMessage('Network error. Please try again.', 'error');
  } finally {
    // Reset button state
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// Helper functions
function resetDateSelect() {
  const dateSelect = document.getElementById('class-date');
  if (dateSelect) {
    dateSelect.innerHTML = '<option value="">First select a class</option>';
    dateSelect.disabled = true;
  }
}

function resetTimeSelect() {
  const timeSelect = document.getElementById('class-time');
  if (timeSelect) {
    timeSelect.innerHTML = '<option value="">First select a date</option>';
    timeSelect.disabled = true;
  }
}

function showEnrollmentMessage(message, type = 'info') {
  // Remove existing message
  const existingMessage = document.querySelector('.enrollment-message');
  if (existingMessage) {
    existingMessage.remove();
  }

  // Create new message
  const messageDiv = document.createElement('div');
  messageDiv.className = `enrollment-message ${type}`;
  messageDiv.textContent = message;

  // Insert before form
  const form = document.getElementById('class-enrollment-form');
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

function showLoadingMessage(message) {
  const classTypeSelect = document.getElementById('class-type');
  if (classTypeSelect) {
    classTypeSelect.innerHTML = `<option value="">${message}</option>`;
    classTypeSelect.disabled = true;
  }
}

function hideLoadingMessage() {
  const classTypeSelect = document.getElementById('class-type');
  if (classTypeSelect) {
    classTypeSelect.disabled = false;
  }
}

// Agregar al final del archivo js/script.js:

// Feedback functionality
function initializeFeedback() {
    console.log("🔧 Initializing feedback system"); // ← AGREGAR ESTA LÍNEA
    
    const feedbackTypeSelect = document.getElementById('feedback-type');
    const targetGroup = document.getElementById('feedback-target-group');
    const targetSelect = document.getElementById('feedback-target');
    const targetLabel = document.getElementById('feedback-target-label');
    const feedbackForm = document.getElementById('feedback-submission-form');
    const resultDiv = document.getElementById('feedback-result');

    console.log("Elements found:", { // ← AGREGAR ESTAS LÍNEAS
        feedbackTypeSelect: !!feedbackTypeSelect,
        targetGroup: !!targetGroup,
        targetSelect: !!targetSelect,
        feedbackForm: !!feedbackForm
    });

  // Opciones hardcodeadas
  const feedbackOptions = {
      instalacion: [
          { id: 'TENNIS', name: 'Tennis Court' },
          { id: 'SWIMMING_POOL', name: 'Swimming Pool' },
          { id: 'GYM', name: 'Modern Gym' },
          { id: 'BASKETBALL', name: 'Basketball Court' },
          { id: 'YOGA', name: 'Yoga Room' },
          { id: 'SQUASH', name: 'Squash Court' }
      ],
      profesor: [
          { id: 'ANA_LOPEZ', name: 'Ana López' },
          { id: 'CARLOS_RUIZ', name: 'Carlos Ruiz' },
          { id: 'MARIA_LOPEZ', name: 'María González' },
          { id: 'PEDRO_MARTIN', name: 'Pedro Martín' },
          { id: 'LAURA_FERNANDEZ', name: 'Laura Fernández' }
      ]
  };

    if (feedbackTypeSelect) {
        feedbackTypeSelect.addEventListener('change', function() {
            console.log("🔄 Feedback type changed to:", this.value); // ← AGREGAR ESTA LÍNEA
            const selectedType = this.value;
            
            if (selectedType) {
                console.log("📝 Showing target group"); // ← AGREGAR ESTA LÍNEA
                targetGroup.style.display = 'block';
              
              const labels = {
                  clase: 'Select class:',
                  instalacion: 'Select facility:',
                  profesor: 'Select instructor:'
              };
              targetLabel.textContent = labels[selectedType];
              
              targetSelect.innerHTML = '<option value="">Select an option</option>';
              
              feedbackOptions[selectedType].forEach(option => {
                  const optionElement = document.createElement('option');
                  optionElement.value = option.id;
                  optionElement.textContent = option.name;
                  targetSelect.appendChild(optionElement);
              });
              
              targetSelect.required = true;
          } else {
              targetGroup.style.display = 'none';
              targetSelect.required = false;
          }
      });
  }

    if (feedbackForm && !feedbackForm.dataset.listenerAttached) {
        feedbackForm.dataset.listenerAttached = "true";
        feedbackForm.addEventListener('submit', async function(e) {
          e.preventDefault();
          
          const submitBtn = feedbackForm.querySelector('.btn-primary');
          const originalText = submitBtn.textContent;
          submitBtn.textContent = 'Submitting...';
          submitBtn.disabled = true;

          try {
              const formData = new FormData(feedbackForm);
              const feedbackData = {
                  type: formData.get('type'),
                  target_id: formData.get('target'),
                  target_name: getTargetName(formData.get('type'), formData.get('target')),
                  title: formData.get('title'),
                  description: formData.get('description'),
                  priority: formData.get('priority')
              };

              console.log('Sending feedback:', feedbackData);

              const response = await fetch(`${CONFIG.apiBaseUrl}/feedback`, {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${tokenInMemory}`
                  },
                  body: JSON.stringify(feedbackData)
              });

              const result = await response.json();
              console.log('Feedback Response:', result);

              if (response.ok) {
                  showFeedbackResult('success', '✅ Feedback submitted successfully! Thank you for your input.');
                  feedbackForm.reset();
                  targetGroup.style.display = 'none';
              } else {
                  throw new Error(result.message || 'Error submitting feedback');
              }

          } catch (error) {
              console.error('Error submitting feedback:', error);
              showFeedbackResult('error', `❌ Error: ${error.message}`);
          } finally {
              submitBtn.textContent = originalText;
              submitBtn.disabled = false;
          }
      });
  }

  function getTargetName(type, targetId) {
      if (!type || !targetId) return '';
      
      const option = feedbackOptions[type].find(opt => opt.id === targetId);
      return option ? option.name : targetId;
  }

  function showFeedbackResult(type, message) {
      if (resultDiv) {
          resultDiv.className = `result-message ${type}`;
          resultDiv.textContent = message;
          resultDiv.style.display = 'block';
          
          // Auto-hide after 5 seconds
          setTimeout(() => {
              resultDiv.style.display = 'none';
          }, 5000);
      }
  }
}
