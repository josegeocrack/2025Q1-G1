document.addEventListener("DOMContentLoaded", () => {
  // Check if user is logged in
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null")
  if (!currentUser) {
    window.location.href = "login.html"
    return
  }

  // Show admin nav if user is admin
  if (currentUser.role === "admin") {
    document.getElementById("admin-nav").style.display = "block"
  }

  // Display user name
  document.getElementById("user-name").textContent = currentUser.name

  // Load dashboard data
  loadDashboardStats()
  loadUpcomingReservations()
  loadRecentActivity()

  // Handle logout
  document.getElementById("logout-btn").addEventListener("click", (e) => {
    e.preventDefault()
    localStorage.removeItem("currentUser")
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
})

function loadDashboardStats() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"))
  const reservations = JSON.parse(localStorage.getItem("reservations") || "[]")
  const classEnrollments = JSON.parse(localStorage.getItem("classEnrollments") || "[]")

  const userReservations = reservations.filter((r) => r.userId === currentUser.id)
  const userEnrollments = classEnrollments.filter((e) => e.userId === currentUser.id)

  const today = new Date()
  const upcomingReservations = userReservations.filter((r) => {
    const reservationDate = new Date(r.date)
    return reservationDate >= today && !r.cancelled
  })

  const upcomingClasses = userEnrollments.filter((e) => {
    const classDate = new Date(e.classDate)
    return classDate >= today && !e.cancelled
  })

  const totalUpcoming = upcomingReservations.length + upcomingClasses.length
  const totalBookings = userReservations.length + userEnrollments.length
  const memberSince = new Date(currentUser.joinDate).getFullYear()

  document.getElementById("upcoming-count").textContent = totalUpcoming
  document.getElementById("total-bookings").textContent = totalBookings
  document.getElementById("classes-enrolled").textContent = userEnrollments.length
  document.getElementById("member-since").textContent = memberSince
}

function loadUpcomingReservations() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"))
  const reservations = JSON.parse(localStorage.getItem("reservations") || "[]")
  const classEnrollments = JSON.parse(localStorage.getItem("classEnrollments") || "[]")
  const classes = JSON.parse(localStorage.getItem("classes") || "[]")

  const userReservations = reservations.filter((r) => r.userId === currentUser.id)
  const userEnrollments = classEnrollments.filter((e) => e.userId === currentUser.id)

  const today = new Date()
  const upcomingReservations = userReservations.filter((r) => {
    const reservationDate = new Date(r.date)
    return reservationDate >= today && !r.cancelled
  })

  const upcomingClasses = userEnrollments.filter((e) => {
    const classDate = new Date(e.classDate)
    return classDate >= today && !e.cancelled
  })

  const container = document.getElementById("upcoming-reservations")

  if (upcomingReservations.length === 0 && upcomingClasses.length === 0) {
    container.innerHTML = '<div class="no-data">No upcoming reservations</div>'
    return
  }

  let html = ""

  // Add facility reservations
  upcomingReservations.forEach((reservation) => {
    html += `
            <div class="reservation-card">
                <h4>${getFacilityName(reservation.facility)}</h4>
                <p><strong>Date:</strong> ${formatDate(reservation.date)}</p>
                <p><strong>Time:</strong> ${reservation.time}</p>
                <p><strong>Duration:</strong> ${reservation.duration || 1} hour(s)</p>
                <span class="reservation-status status-active">Active</span>
            </div>
        `
  })

  // Add class enrollments
  upcomingClasses.forEach((enrollment) => {
    const classInfo = classes.find((c) => c.id === enrollment.classId)
    if (classInfo) {
      html += `
                <div class="reservation-card">
                    <h4>${classInfo.name}</h4>
                    <p><strong>Date:</strong> ${formatDate(enrollment.classDate)}</p>
                    <p><strong>Time:</strong> ${classInfo.time}</p>
                    <p><strong>Trainer:</strong> ${classInfo.trainer}</p>
                    <span class="reservation-status status-active">Enrolled</span>
                </div>
            `
    }
  })

  container.innerHTML = html
}

function loadRecentActivity() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"))
  const reservations = JSON.parse(localStorage.getItem("reservations") || "[]")
  const classEnrollments = JSON.parse(localStorage.getItem("classEnrollments") || "[]")
  const complaints = JSON.parse(localStorage.getItem("complaints") || "[]")

  const userReservations = reservations.filter((r) => r.userId === currentUser.id)
  const userEnrollments = classEnrollments.filter((e) => e.userId === currentUser.id)
  const userComplaints = complaints.filter((c) => c.userId === currentUser.id)

  // Combine all activities
  const activities = []

  userReservations.forEach((r) => {
    activities.push({
      type: "facility",
      title: `Booked ${getFacilityName(r.facility)}`,
      description: `${formatDate(r.date)} at ${r.time}`,
      date: new Date(r.createdAt || r.date),
      icon: "🏢",
    })
  })

  userEnrollments.forEach((e) => {
    activities.push({
      type: "class",
      title: `Enrolled in class`,
      description: `${e.className} on ${formatDate(e.classDate)}`,
      date: new Date(e.enrolledAt),
      icon: "🏃‍♂️",
    })
  })

  userComplaints.forEach((c) => {
    activities.push({
      type: "feedback",
      title: "Submitted feedback",
      description: c.subject,
      date: new Date(c.submittedAt),
      icon: "📝",
    })
  })

  // Sort by date (most recent first)
  activities.sort((a, b) => b.date - a.date)

  const container = document.getElementById("recent-activity")

  if (activities.length === 0) {
    container.innerHTML = '<div class="no-data">No recent activity</div>'
    return
  }

  const recentActivities = activities.slice(0, 5) // Show only last 5 activities

  const html = recentActivities
    .map(
      (activity) => `
        <div class="activity-item">
            <div class="activity-icon">${activity.icon}</div>
            <div class="activity-content">
                <h5>${activity.title}</h5>
                <p>${activity.description}</p>
            </div>
        </div>
    `,
    )
    .join("")

  container.innerHTML = html
}

function getFacilityName(facility) {
  const facilityNames = {
    gym: "Modern Gym",
    pool: "Swimming Pool",
    tennis: "Tennis Court",
    basketball: "Basketball Court",
    "yoga-room": "Yoga Room",
    squash: "Squash Court",
  }
  return facilityNames[facility] || facility
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
