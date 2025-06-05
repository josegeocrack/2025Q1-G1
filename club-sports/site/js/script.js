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
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault()
      const target = document.querySelector(this.getAttribute("href"))
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
