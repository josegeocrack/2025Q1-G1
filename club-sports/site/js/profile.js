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

  // Load profile data
  loadProfileData()
  loadMembershipStats()
  loadRecentBookings()

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

function loadProfileData() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"))

  // Set avatar initials
  const initials = currentUser.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
  document.getElementById("avatar-initials").textContent = initials

  // Set profile information
  document.getElementById("profile-name").textContent = currentUser.name
  document.getElementById("profile-email").textContent = currentUser.email
  document.getElementById("profile-phone").textContent = currentUser.phone || "Not provided"

  const joinDate = new Date(currentUser.joinDate)
  document.getElementById("profile-join-date").textContent = joinDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function loadMembershipStats() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"))
  const reservations = JSON.parse(localStorage.getItem("reservations") || "[]")
  const classEnrollments = JSON.parse(localStorage.getItem("classEnrollments") || "[]")
  const complaints = JSON.parse(localStorage.getItem("complaints") || "[]")

  const userReservations = reservations.filter((r) => r.userId === currentUser.id)
  const userEnrollments = classEnrollments.filter((e) => e.userId === currentUser.id)
  const userComplaints = complaints.filter((c) => c.userId === currentUser.id)

  // Calculate favorite facility
  const facilityCount = {}
  userReservations.forEach((r) => {
    facilityCount[r.facility] = (facilityCount[r.facility] || 0) + 1
  })

  let favoriteFacility = "-"
  let maxCount = 0
  for (const [facility, count] of Object.entries(facilityCount)) {
    if (count > maxCount) {
      maxCount = count
      favoriteFacility = getFacilityName(facility)
    }
  }

  // Update stats
  document.getElementById("total-facility-bookings").textContent = userReservations.length
  document.getElementById("total-class-enrollments").textContent = userEnrollments.length
  document.getElementById("total-complaints").textContent = userComplaints.length
  document.getElementById("favorite-facility").textContent = favoriteFacility
}

function loadRecentBookings() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"))
  const reservations = JSON.parse(localStorage.getItem("reservations") || "[]")
  const classEnrollments = JSON.parse(localStorage.getItem("classEnrollments") || "[]")
  const classes = JSON.parse(localStorage.getItem("classes") || "[]")

  const userReservations = reservations.filter((r) => r.userId === currentUser.id)
  const userEnrollments = classEnrollments.filter((e) => e.userId === currentUser.id)

  // Combine and sort bookings
  const allBookings = []

  userReservations.forEach((r) => {
    allBookings.push({
      type: "Facility",
      name: getFacilityName(r.facility),
      date: new Date(r.date),
      time: r.time,
      status: getBookingStatus(r),
      sortDate: new Date(r.createdAt || r.date),
    })
  })

  userEnrollments.forEach((e) => {
    const classInfo = classes.find((c) => c.id === e.classId)
    if (classInfo) {
      allBookings.push({
        type: "Class",
        name: classInfo.name,
        date: new Date(e.classDate),
        time: classInfo.time,
        status: getBookingStatus(e),
        sortDate: new Date(e.enrolledAt),
      })
    }
  })

  // Sort by creation date (most recent first)
  allBookings.sort((a, b) => b.sortDate - a.sortDate)

  const container = document.getElementById("recent-bookings-list")

  if (allBookings.length === 0) {
    container.innerHTML = '<div class="no-data">No recent bookings</div>'
    return
  }

  const recentBookings = allBookings.slice(0, 10) // Show last 10 bookings

  const html = recentBookings
    .map(
      (booking) => `
        <div class="booking-item">
            <div class="booking-info">
                <h5>${booking.name}</h5>
                <p>${booking.type} • ${formatDate(booking.date.toISOString())} at ${booking.time}</p>
            </div>
            <span class="reservation-status ${booking.status.class}">${booking.status.text}</span>
        </div>
    `,
    )
    .join("")

  container.innerHTML = html
}

function getBookingStatus(booking) {
  const bookingDate = new Date(booking.date || booking.classDate)
  const today = new Date()

  if (booking.cancelled) {
    return { class: "status-cancelled", text: "Cancelled" }
  } else if (bookingDate < today) {
    return { class: "status-completed", text: "Completed" }
  } else {
    return { class: "status-active", text: "Active" }
  }
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
