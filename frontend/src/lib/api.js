const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000"

export const apiClient = {
  /* ---------------- Start Exercise (optional, future use) ---------------- */
  async startExercise(exerciseText, duration = 5) {
    const url = `${API_BASE_URL}/api/exercise/start`
    console.log("[API] Starting exercise at:", url)
    
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        exercise_text: exerciseText,
        duration,
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error("[API] Start exercise failed:", res.status, errorText)
      throw new Error(`Failed to start exercise: ${res.status} - ${errorText}`)
    }

    return res.json()
  },

  /* ---------------- Submit Audio (USED IN YOUR CODE) ---------------- */
  async submitAudio(audioBlob, exerciseText) {
    const formData = new FormData()
    formData.append("audio", audioBlob, "recording.wav")
    formData.append("exercise_text", exerciseText)

    const url = `${API_BASE_URL}/api/exercise/submit`
    console.log("[API] Submitting audio to:", url)

    const res = await fetch(url, {
      method: "POST",
      body: formData,
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error("[API] Audio submission failed:", res.status, errorText)
      throw new Error(`Failed to submit audio: ${res.status} - ${errorText}`)
    }

    return res.json()
  },

  /* ---------------- Generate Custom Exercises (USED) ---------------- */
  async generateCustomExercises(type, count = 5) {
    const url = `${API_BASE_URL}/api/exercises/generate?type=${type}&count=${count}`
    console.log("[API] Fetching exercises from:", url)
    
    const res = await fetch(url, {
      method: "GET",
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error("[API] Exercise generation failed:", res.status, errorText)
      throw new Error(`Failed to generate exercises: ${res.status} - ${errorText}`)
    }

    return res.json()
  },

  /* ---------------- Optional: session history ---------------- */
  async getSessionHistory() {
    const res = await fetch(`${API_BASE_URL}/api/sessions/history`)

    if (!res.ok) {
      throw new Error("Failed to fetch session history")
    }

    return res.json()
  },

  /* ---------------- Optional: save progress ---------------- */
  async saveProgress() {
    const res = await fetch(`${API_BASE_URL}/api/sessions/save`, {
      method: "POST",
    })

    if (!res.ok) {
      throw new Error("Failed to save progress")
    }

    return res.json()
  },

  /* ---------------- Contact Us (send message) ---------------- */
  async sendContactMessage(payload) {
    const res = await fetch(`${API_BASE_URL}/api/contact/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      throw new Error("Failed to send message")
    }

    return res.json()
  },

  /* ---------------- Chat with Mr. Whiskers ---------------- */
  async chatWithWhiskers(message) {
    const res = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    })

    if (!res.ok) {
      throw new Error("Failed to chat with Mr. Whiskers")
    }

    return res.json()
  },
}
