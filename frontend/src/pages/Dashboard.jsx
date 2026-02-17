import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Volume2, Brain, Zap, Sparkles, Send, X, Loader2, TrendingUp, Target, Award, ArrowLeft, LogOut } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import ExerciseCardPremium from "../components/Exercise-card-premium"
import { apiClient } from "../lib/api"
import { useAuth } from "../lib/AuthContext"

export default function Dashboard({ onStartExercise }) {
  const navigate = useNavigate()
  const { userProfile, getUserWeakAreas, getProgress, isAuthenticated, logout } = useAuth()

  // User stats state
  const [weakAreas, setWeakAreas] = useState([])
  const [recentProgress, setRecentProgress] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)

  // Mr. Whiskers Chat State
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      content: "Hi there! 🐱 I'm Mr. Whiskers, your friendly speech therapy assistant! How can I help you today? Feel free to ask me about exercises, tips, or anything speech-related!"
    }
  ])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)

  // Load user stats on mount
  useEffect(() => {
    const loadUserStats = async () => {
      if (!isAuthenticated) {
        setLoadingStats(false)
        return
      }

      try {
        const [weakAreasResult, progressResult] = await Promise.all([
          getUserWeakAreas(),
          getProgress(7)
        ])

        if (weakAreasResult.success) {
          setWeakAreas(weakAreasResult.data)
        }
        if (progressResult.success && progressResult.data.length > 0) {
          // Calculate recent improvement
          const data = progressResult.data
          const lastScore = data[data.length - 1]?.averageScore || 0
          const firstScore = data[0]?.averageScore || 0
          const improvement = lastScore - firstScore
          setRecentProgress({
            totalSessions: data.reduce((sum, d) => sum + d.sessions, 0),
            averageScore: Math.round(data.reduce((sum, d) => sum + d.averageScore, 0) / data.length),
            improvement: Math.round(improvement * 10) / 10
          })
        }
      } catch (err) {
        console.error("Failed to load user stats:", err)
      } finally {
        setLoadingStats(false)
      }
    }

    loadUserStats()
  }, [isAuthenticated, getUserWeakAreas, getProgress])

  // Mr. Whiskers Chat Functions
  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return

    const userMessage = chatInput.trim()
    setChatInput("")
    setChatMessages(prev => [...prev, { role: "user", content: userMessage }])
    setChatLoading(true)

    try {
      const response = await apiClient.chatWithWhiskers(userMessage)
      setChatMessages(prev => [
        ...prev,
        { role: "assistant", content: response.message }
      ])
    } catch {
      setChatMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "Meow... 😿 I'm having trouble connecting right now. Please try again!"
        }
      ])
    } finally {
      setChatLoading(false)
    }
  }

  const exercises = [
    {
      id: "lisp",
      title: "Lisp Mastery",
      description: "Perfect your S/Z sounds with precision exercises",
      icon: Volume2,
    },
    {
      id: "stuttering",
      title: "Fluent Speaking",
      description: "Build confidence with paced speech techniques",
      icon: Brain,
    },
    {
      id: "general",
      title: "Voice Clarity",
      description: "Enhance articulation and overall clarity",
      icon: Zap,
    },
    {
      id: "custom",
      title: "AI Personalized",
      description: "Custom exercises tailored to your needs",
      icon: Sparkles,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EDEBFF] to-[#FAFAFF] px-4 py-10">
      
      {/* Header with Back Button and Logout */}
      <div className="mx-auto max-w-6xl mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 hover:bg-white border border-[#E6E2FF] text-[#17153B] font-medium transition-all hover:shadow-md"
        >
          <ArrowLeft size={18} />
          Back to Home
        </button>
        
        <button
          onClick={async () => {
            await logout();
            navigate('/');
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-medium transition-all hover:shadow-md"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>

      {/* Welcome / Hero */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="
          relative mx-auto max-w-6xl
          overflow-hidden rounded-[32px]
          bg-white
          border border-[#E6E2FF]
          p-10 md:p-14
          shadow-[0_30px_80px_rgba(124,108,255,0.15)]
        "
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#B6ABFF]/40 to-transparent rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-[#D6CFFF]/40 to-transparent rounded-full blur-3xl -ml-20 -mb-20" />

        <div className="relative z-10 flex items-start justify-between">
          <div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-[#17153B] mb-4">
              {userProfile?.displayName ? `Welcome back, ${userProfile.displayName.split(' ')[0]}!` : 'Welcome to Your Speech Journey'}
            </h2>
            <p className="text-base md:text-lg text-[#4B4A6A] max-w-2xl">
              Personalized speech therapy powered by AI.  
              Choose an exercise to begin, or chat with Mr. Whiskers for tips! 🐱
            </p>
          </div>
        </div>
      </motion.div>

      {/* User Stats Section - Only show for authenticated users with history */}
      {isAuthenticated && (userProfile?.totalSessions > 0 || recentProgress) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-8 mx-auto max-w-6xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Sessions */}
            <div className="bg-white/70 backdrop-blur-md border border-[#E6E2FF] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#7C6CFF]/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-[#7C6CFF]" />
                </div>
                <p className="text-sm text-[#4B4A6A]">Total Sessions</p>
              </div>
              <p className="text-3xl font-bold text-[#17153B]">
                {userProfile?.totalSessions || recentProgress?.totalSessions || 0}
              </p>
            </div>

            {/* Average Score */}
            <div className="bg-white/70 backdrop-blur-md border border-[#E6E2FF] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Award className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-sm text-[#4B4A6A]">Average Score</p>
              </div>
              <p className="text-3xl font-bold text-[#17153B]">
                {userProfile?.averageScore || recentProgress?.averageScore || 0}%
              </p>
            </div>

            {/* Recent Progress */}
            <div className="bg-white/70 backdrop-blur-md border border-[#E6E2FF] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  (recentProgress?.improvement || 0) >= 0 ? 'bg-green-500/10' : 'bg-orange-500/10'
                }`}>
                  <TrendingUp className={`w-5 h-5 ${
                    (recentProgress?.improvement || 0) >= 0 ? 'text-green-500' : 'text-orange-500'
                  }`} />
                </div>
                <p className="text-sm text-[#4B4A6A]">Weekly Progress</p>
              </div>
              <p className={`text-3xl font-bold ${
                (recentProgress?.improvement || 0) >= 0 ? 'text-green-600' : 'text-orange-600'
              }`}>
                {(recentProgress?.improvement || 0) >= 0 ? '+' : ''}{recentProgress?.improvement || 0}%
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Personalized Recommendations - Show weak areas */}
      {isAuthenticated && weakAreas.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 mx-auto max-w-6xl"
        >
          <div className="bg-gradient-to-br from-[#7C6CFF]/10 to-[#B6ABFF]/10 border border-[#B6ABFF]/30 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🎯</span>
              <h3 className="text-lg font-bold text-[#17153B]">Recommended for You</h3>
            </div>
            <p className="text-sm text-[#4B4A6A] mb-4">
              Based on your practice history, Mr. Whiskers suggests focusing on these areas:
            </p>
            <div className="flex flex-wrap gap-2">
              {weakAreas.map((area, idx) => (
                <button
                  key={idx}
                  onClick={() => navigate(`/exercise/${area.type}`)}
                  className="px-4 py-2 bg-white border border-[#E6E2FF] rounded-xl text-sm font-medium text-[#17153B] hover:border-[#7C6CFF] hover:bg-[#F7F6FF] transition-all"
                >
                  {area.type.charAt(0).toUpperCase() + area.type.slice(1)} 
                  <span className="text-orange-500 ml-2">({area.averageScore}%)</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Exercise Section */}
      <div className="mt-16 mx-auto max-w-6xl">
        <h3 className="text-2xl md:text-3xl font-bold mb-8 text-[#17153B]">
          Select Your Exercise
        </h3>

        <div className="
          rounded-3xl
          bg-white/70 backdrop-blur-md
          border border-[#E6E2FF]
          p-6 md:p-8
        ">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {exercises.map((exercise, idx) => (
              <ExerciseCardPremium
                    key={exercise.id}
                    {...exercise}
                    delay={idx}
                    onClick={() => navigate(`/exercise/${exercise.id}`)}
                />
            ))}
          </div>
        </div>
      </div>

      {/* Mr. Whiskers Chat Widget */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="mb-4 w-80 bg-white rounded-2xl shadow-2xl border border-[#E6E2FF] overflow-hidden"
            >
              {/* Chat Header */}
              <div className="bg-gradient-to-r from-[#7C6CFF] to-[#B6ABFF] p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🐱</span>
                  <div>
                    <p className="font-bold text-white">Mr. Whiskers</p>
                    <p className="text-xs text-white/80">Speech Therapy Assistant</p>
                  </div>
                </div>
                <button
                  onClick={() => setChatOpen(false)}
                  className="text-white/80 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="h-64 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        msg.role === "user"
                          ? "bg-[#7C6CFF] text-white"
                          : "bg-[#F7F6FF] text-[#17153B] border border-[#E6E2FF]"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-[#F7F6FF] text-[#17153B] border border-[#E6E2FF] rounded-2xl px-4 py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-3 border-t border-[#E6E2FF]">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendChatMessage()}
                    placeholder="Ask Mr. Whiskers..."
                    className="flex-1 px-4 py-2 rounded-xl border border-[#E6E2FF] focus:outline-none focus:border-[#7C6CFF]"
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={chatLoading}
                    className="p-2 rounded-xl bg-[#7C6CFF] text-white hover:bg-[#6B5CE0] disabled:opacity-50"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Toggle Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setChatOpen(!chatOpen)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-[#7C6CFF] to-[#B6ABFF] text-white shadow-lg flex items-center justify-center text-2xl"
        >
          {chatOpen ? <X /> : "🐱"}
        </motion.button>
      </div>
    </div>
  )
}
