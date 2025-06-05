document.addEventListener("DOMContentLoaded", () => {
  // Check if user is logged in and is admin
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null")
  if (!currentUser) {
    window.location.href = "login.html"
    return
  }

  if (currentUser.role !== "admin") {
    window.location.href = "dashboard.html"
    return
  }

  // Handle tab switching
  const tabBtns = document.querySelectorAll(".tab-btn")
  const tabContents = document.querySelectorAll(".tab-content")

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabName = btn.getAttribute("data-tab")

      // Update active button
      tabBtns.forEach((b) => b.classList.remove("active"))
      btn.classList.add("active")

      // Show target tab, hide others
      tabContents.forEach((tab) => {
        if (tab.id === tabName + "-tab") {
          tab.classList.add("active")
        } else {
          tab.classList.remove("active")
        }
      })
    })
  })

  // Load admin data
  loadUsers()
  loadReservations()
  loadClasses()
  loadFeedback()
  loadStats()

  // Handle add class modal
  const addClassBtn = document.getElementById("add-class-btn")
  const addClassModal = document.getElementById("add-class-modal")
  const closeBtn = document.querySelector(".close")
  const addClassForm = document.getElementById("add-class-form")

  addClassBtn.addEventListener("click", () => {
    addClassModal.style.display = "block"
  })

  closeBtn.addEventListener("click", () => {
    addClassModal.style.display = "none"
  })

  window.addEventListener("click", (e) => {
    if (e.target === addClassModal) {
      addClassModal.style.display = "none"
    }
  })

  addClassForm.addEventListener("submit", (e) => {
    e.preventDefault()

    const className = document.getElementById("class-name").value
    const trainer = document.getElementById("class-trainer").value
    const date = document.getElementById("class-date").value
    const time = document.getElementById("class-time").value
    const capacity = document.getElementById("class-capacity").value
    const description = document.getElementById("class-description").value

    // Create new class
    const newClass = {
      id: "class-" + Date.now(),
      name: className,
      trainer: trainer,
      date: date,
      time: time,
      capacity: Number.parseInt(capacity),
      enrolled: 0,
      description: description,
    }

    // Save class
    const classes = JSON.parse(localStorage.getItem("classes") || "[]")
    classes.push(newClass)
    localStorage.setItem("classes", JSON.stringify(classes))

    // Close modal and reload classes
    addClassModal.style.display = "none"
    addClassForm.reset()
    loadClasses()
    loadStats()
  })

  // Handle logout
  document.getElementById("logout-btn").addEventListener("click", (e) => {
    e.preventDefault()
    localStorage.removeItem("currentUser")
    window.location.href = "index.html"
  })
})

function loadUsers() {
  const users = JSON.parse(localStorage.getItem("users") || "[]")
  const tbody = document.getElementById("users-tbody")

  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="no-data">No users found</td></tr>'
    return
  }

  let html = ""

  users.forEach((user) => {
    const joinDate = new Date(user.joinDate).toLocaleDateString()

    html += `
      <tr>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${user.phone || "-"}</td>
        <td>${user.role}</td>
        <td>${joinDate}</td>
        <td>
          <button class="btn btn-small btn-primary edit-user" data-id="${user.id}">Edit</button>
          ${user.role !== "admin" ? `<button class="btn btn-small btn-danger delete-user" data-id="${user.id}">Delete</button>` : ""}
        </td>
      </tr>
    `
  })

  tbody.innerHTML = html

  // Add event listeners
  document.querySelectorAll(".edit-user").forEach((btn) => {
    btn.addEventListener("click", () => {
      const userId = btn.getAttribute("data-id")
      // Implement edit user functionality
      alert("Edit user functionality would be implemented here")
    })
  })

  document.querySelectorAll(".delete-user").forEach((btn) => {
    btn.addEventListener("click", () => {
      const userId = btn.getAttribute("data-id")
      if (confirm("Are you sure you want to delete this user?")) {
        deleteUser(userId)
      }
    })
  })
}

function deleteUser(userId) {
  let users = JSON.parse(localStorage.getItem("users") || "[]")
  users = users.filter((user) => user.id !== userId)
  localStorage.setItem("users", JSON.stringify(users))

  // Also delete user's reservations, enrollments, and complaints
  let reservations = JSON.parse(localStorage.getItem("reservations") || "[]")
  reservations = reservations.filter((r) => r.userId !== userId)
  localStorage.setItem("reservations", JSON.stringify(reservations))

  let enrollments = JSON.parse(localStorage.getItem("classEnrollments") || "[]")
  enrollments = enrollments.filter((e) => e.userId !== userId)
  localStorage.setItem("classEnrollments", JSON.stringify(enrollments))

  let complaints = JSON.parse(localStorage.getItem("complaints") || "[]")
  complaints = complaints.filter((c) => c.userId !== userId)
  localStorage.setItem("complaints", JSON.stringify(complaints))

  loadUsers()
  loadReservations()
  loadStats()
}

function loadReservations() {
  const reservations = JSON.parse(localStorage.getItem("reservations") || "[]")
  const classEnrollments = JSON.parse(localStorage.getItem("classEnrollments") || "[]")
  const classes = JSON.parse(localStorage.getItem("classes") || "[]")
  const tbody = document.getElementById("admin-reservations-tbody")

  // Combine facility reservations and class enrollments
  const allReservations = []

  reservations.forEach((r) => {
    allReservations.push({
      id: r.id,
      userId: r.userId,
      userName: r.userName,
      type: "Facility",
      name: getFacilityName(r.facility),
      date: r.date,
      time: r.time,
      status: r.cancelled ? "Cancelled" : new Date(r.date) < new Date() ? "Completed" : "Active",
      isCancelled: r.cancelled,
    })
  })

  classEnrollments.forEach((e) => {
    const classInfo = classes.find((c) => c.id === e.classId)
    if (classInfo) {
      allReservations.push({
        id: e.id,
        userId: e.userId,
        userName: e.userName,
        type: "Class",
        name: classInfo.name,
        date: classInfo.date,
        time: classInfo.time,
        status: e.cancelled ? "Cancelled" : new Date(classInfo.date) < new Date() ? "Completed" : "Active",
        isCancelled: e.cancelled,
      })
    }
  })

  // Sort by date (most recent first)
  allReservations.sort((a, b) => new Date(b.date) - new Date(a.date))

  if (allReservations.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="no-data">No reservations found</td></tr>'
    return
  }

  let html = ""

  allReservations.forEach((r) => {
    const formattedDate = new Date(r.date).toLocaleDateString()

    html += `
      <tr>
        <td>${r.userName}</td>
        <td>${r.type}</td>
        <td>${r.name}</td>
        <td>${formattedDate}</td>
        <td>${r.time}</td>
        <td>
          <span class="reservation-status status-${r.status.toLowerCase()}">${r.status}</span>
        </td>
        <td>
          ${!r.isCancelled ? `<button class="btn btn-small btn-danger cancel-reservation" data-id="${r.id}" data-type="${r.type.toLowerCase()}">Cancel</button>` : ""}
        </td>
      </tr>
    `
  })

  tbody.innerHTML = html

  // Add event listeners
  document.querySelectorAll(".cancel-reservation").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id")
      const type = btn.getAttribute("data-type")
      if (confirm("Are you sure you want to cancel this reservation?")) {
        cancelReservation(id, type)
      }
    })
  })
}

function cancelReservation(id, type) {
  if (type === "facility") {
    const reservations = JSON.parse(localStorage.getItem("reservations") || "[]")
    const index = reservations.findIndex((r) => r.id === id)
    if (index !== -1) {
      reservations[index].cancelled = true
      localStorage.setItem("reservations", JSON.stringify(reservations))
    }
  } else if (type === "class") {
    const enrollments = JSON.parse(localStorage.getItem("classEnrollments") || "[]")
    const index = enrollments.findIndex((e) => e.id === id)
    if (index !== -1) {
      enrollments[index].cancelled = true
      localStorage.setItem("classEnrollments", JSON.stringify(enrollments))

      // Update class enrollment count
      const enrollment = enrollments[index]
      const classes = JSON.parse(localStorage.getItem("classes") || "[]")
      const classIndex = classes.findIndex((c) => c.id === enrollment.classId)
      if (classIndex !== -1 && classes[classIndex].enrolled > 0) {
        classes[classIndex].enrolled -= 1
        localStorage.setItem("classes", JSON.stringify(classes))
      }
    }
  }

  loadReservations()
  loadStats()
}

function loadClasses() {
  const classes = JSON.parse(localStorage.getItem("classes") || "[]")
  const tbody = document.getElementById("classes-tbody")

  if (classes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="no-data">No classes found</td></tr>'
    return
  }

  // Sort by date
  classes.sort((a, b) => new Date(a.date) - new Date(b.date))

  let html = ""

  classes.forEach((c) => {
    const formattedDate = new Date(c.date).toLocaleDateString()
    const formattedTime = formatTime(c.time)
    const isFull = c.enrolled >= c.capacity
    const isPast = new Date(`${c.date}T${c.time}`) < new Date()

    let status = "Active"
    if (isPast) status = "Completed"

    html += `
      <tr>
        <td>${c.name}</td>
        <td>${c.trainer}</td>
        <td>${formattedDate} at ${formattedTime}</td>
        <td>${c.capacity}</td>
        <td>${c.enrolled}</td>
        <td>
          <span class="reservation-status status-${status.toLowerCase()}">${status}</span>
          ${isFull ? '<span class="reservation-status status-cancelled">Full</span>' : ""}
        </td>
        <td>
          <button class="btn btn-small btn-primary edit-class" data-id="${c.id}">Edit</button>
          <button class="btn btn-small btn-danger delete-class" data-id="${c.id}">Delete</button>
        </td>
      </tr>
    `
  })

  tbody.innerHTML = html

  // Add event listeners
  document.querySelectorAll(".edit-class").forEach((btn) => {
    btn.addEventListener("click", () => {
      const classId = btn.getAttribute("data-id")
      // Implement edit class functionality
      alert("Edit class functionality would be implemented here")
    })
  })

  document.querySelectorAll(".delete-class").forEach((btn) => {
    btn.addEventListener("click", () => {
      const classId = btn.getAttribute("data-id")
      if (confirm("Are you sure you want to delete this class?")) {
        deleteClass(classId)
      }
    })
  })
}

function deleteClass(classId) {
  let classes = JSON.parse(localStorage.getItem("classes") || "[]")
  classes = classes.filter((c) => c.id !== classId)
  localStorage.setItem("classes", JSON.stringify(classes))

  // Also delete enrollments for this class
  let enrollments = JSON.parse(localStorage.getItem("classEnrollments") || "[]")
  enrollments = enrollments.filter((e) => e.classId !== classId)
  localStorage.setItem("classEnrollments", JSON.stringify(enrollments))

  loadClasses()
  loadStats()
}

function loadFeedback() {
  const complaints = JSON.parse(localStorage.getItem("complaints") || "[]")
  const tbody = document.getElementById("feedback-tbody")

  if (complaints.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="no-data">No feedback found</td></tr>'
    return
  }

  // Sort by date (most recent first)
  complaints.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))

  let html = ""

  complaints.forEach((c) => {
    const formattedDate = new Date(c.submittedAt).toLocaleDateString()

    html += `
      <tr>
        <td>${c.userName}</td>
        <td>${c.type}</td>
        <td>${c.subject}</td>
        <td><span class="priority-${c.priority}">${c.priority}</span></td>
        <td>${formattedDate}</td>
        <td>
          <span class="reservation-status status-${c.status === "resolved" ? "completed" : "active"}">${c.status}</span>
        </td>
        <td>
          ${c.status !== "resolved" ? `<button class="btn btn-small btn-primary resolve-feedback" data-id="${c.id}">Resolve</button>` : ""}
          <button class="btn btn-small btn-primary view-feedback" data-id="${c.id}">View</button>
        </td>
      </tr>
    `
  })

  tbody.innerHTML = html

  // Add event listeners
  document.querySelectorAll(".resolve-feedback").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id")
      if (confirm("Mark this feedback as resolved?")) {
        resolveFeedback(id)
      }
    })
  })

  document.querySelectorAll(".view-feedback").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id")
      viewFeedback(id)
    })
  })
}

function resolveFeedback(id) {
  const complaints = JSON.parse(localStorage.getItem("complaints") || "[]")
  const index = complaints.findIndex((c) => c.id === id)
  if (index !== -1) {
    complaints[index].status = "resolved"
    localStorage.setItem("complaints", JSON.stringify(complaints))
  }

  loadFeedback()
  loadStats()
}

function viewFeedback(id) {
  const complaints = JSON.parse(localStorage.getItem("complaints") || "[]")
  const complaint = complaints.find((c) => c.id === id)

  if (complaint) {
    alert(`
      Subject: ${complaint.subject}
      Type: ${complaint.type}
      ${complaint.specificItem ? `Specific Item: ${complaint.specificItem}` : ""}
      Priority: ${complaint.priority}
      Description: ${complaint.description}
      Submitted by: ${complaint.userName}
      Date: ${new Date(complaint.submittedAt).toLocaleString()}
    `)
  }
}

function loadStats() {
  const users = JSON.parse(localStorage.getItem("users") || "[]")
  const reservations = JSON.parse(localStorage.getItem("reservations") || "[]")
  const classes = JSON.parse(localStorage.getItem("classes") || "[]")
  const complaints = JSON.parse(localStorage.getItem("complaints") || "[]")

  // Count active users (excluding admin)
  const activeUsers = users.filter((u) => u.role !== "admin").length

  // Count active reservations
  const today = new Date()
  const activeReservations = reservations.filter((r) => {
    const reservationDate = new Date(r.date)
    return reservationDate >= today && !r.cancelled
  }).length

  // Count active classes
  const activeClasses = classes.filter((c) => {
    const classDate = new Date(c.date)
    return classDate >= today
  }).length

  // Count pending feedback
  const pendingFeedback = complaints.filter((c) => c.status !== "resolved").length

  // Find most popular facility
  const facilityCounts = {}
  reservations.forEach((r) => {
    if (!r.cancelled) {
      facilityCounts[r.facility] = (facilityCounts[r.facility] || 0) + 1
    }
  })

  let popularFacility = "-"
  let maxCount = 0
  for (const [facility, count] of Object.entries(facilityCounts)) {
    if (count > maxCount) {
      maxCount = count
      popularFacility = getFacilityName(facility)
    }
  }

  // Update stats
  document.getElementById("total-users").textContent = activeUsers
  document.getElementById("total-admin-reservations").textContent = reservations.length
  document.getElementById("active-classes").textContent = activeClasses
  document.getElementById("pending-feedback").textContent = pendingFeedback
  document.getElementById("popular-facility").textContent = popularFacility
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

function formatTime(timeString) {
  // Convert 24-hour time to 12-hour format
  const [hours, minutes] = timeString.split(":")
  const hour = Number.parseInt(hours)
  const ampm = hour >= 12 ? "PM" : "AM"
  const hour12 = hour % 12 || 12

  return `${hour12}:${minutes} ${ampm}`
}
