// import { useState, useRef, useEffect } from "react"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card"
// import { Button } from "../components/ui/button"
// import { apiClient } from "../lib/api"
// import {
//   Loader2,
//   Mic,
//   Square,
//   CheckCircle,
//   AlertCircle,
//   Volume2,
// } from "lucide-react"

// const EXERCISE_DATA = {
//   lisp: [
//     "Sally sells seashells by the seashore",
//     "Six slippery snails slid slowly seaward",
//     "The sun shines brightly in the summer sky",
//   ],
//   stuttering: [
//     "Take your time and speak slowly",
//     "Breathe deeply before each sentence",
//     "Relax your jaw and tongue",
//   ],
//   general: ["Free speech practice"],
//   custom: [],
// }

// export default function ExerciseRunner({ exerciseType, onComplete }) {
//   const [exercises, setExercises] = useState(
//     EXERCISE_DATA[exerciseType] || []
//   )
//   const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
//   const [isRecording, setIsRecording] = useState(false)
//   const [isProcessing, setIsProcessing] = useState(false)
//   const [result, setResult] = useState(null)
//   const [loadingExercises, setLoadingExercises] = useState(
//     exerciseType === "custom"
//   )
//   const [recordingTime, setRecordingTime] = useState(0)

//   const mediaRecorderRef = useRef(null)
//   const audioChunksRef = useRef([])
//   const streamRef = useRef(null)
//   const timerRef = useRef(null)

//   const currentExercise = exercises[currentExerciseIndex] || ""
//   const progress =
//     exercises.length > 0
//       ? ((currentExerciseIndex + 1) / exercises.length) * 100
//       : 0

//   /* Load custom exercises */
//   useEffect(() => {
//     if (exerciseType === "custom") {
//       const loadCustomExercises = async () => {
//         try {
//           const response = await apiClient.generateCustomExercises("general")
//           setExercises(response.exercises)
//         } catch (err) {
//           console.error(err)
//           setExercises(["Please try again"])
//         } finally {
//           setLoadingExercises(false)
//         }
//       }

//       loadCustomExercises()
//     }
//   }, [exerciseType])

//   /* Recording timer */
//   useEffect(() => {
//     if (isRecording) {
//       timerRef.current = setInterval(() => {
//         setRecordingTime((t) => t + 1)
//       }, 1000)
//     } else {
//       clearInterval(timerRef.current)
//       setRecordingTime(0)
//     }

//     return () => clearInterval(timerRef.current)
//   }, [isRecording])

//   const startRecording = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
//       streamRef.current = stream
//       audioChunksRef.current = []

//       const mediaRecorder = new MediaRecorder(stream)
//       mediaRecorderRef.current = mediaRecorder

//       mediaRecorder.ondataavailable = (e) => {
//         audioChunksRef.current.push(e.data)
//       }

//       mediaRecorder.onstop = async () => {
//         const audioBlob = new Blob(audioChunksRef.current, {
//           type: "audio/wav",
//         })
//         await submitAudio(audioBlob)
//       }

//       mediaRecorder.start()
//       setIsRecording(true)
//     } catch (err) {
//       console.error(err)
//       alert("Microphone access denied")
//     }
//   }

//   const stopRecording = () => {
//     if (!mediaRecorderRef.current) return

//     mediaRecorderRef.current.stop()
//     streamRef.current?.getTracks().forEach((t) => t.stop())
//     setIsRecording(false)
//     setIsProcessing(true)
//   }

//   const submitAudio = async (audioBlob) => {
//     try {
//       const response = await apiClient.submitAudio(
//         audioBlob,
//         currentExercise
//       )
//       setResult(response)
//     } catch (err) {
//       console.error(err)
//       setResult({
//         status: "error",
//         message: "Failed to process audio",
//       })
//     } finally {
//       setIsProcessing(false)
//     }
//   }

//   const handleNextExercise = () => {
//     if (currentExerciseIndex < exercises.length - 1) {
//       setCurrentExerciseIndex((i) => i + 1)
//       setResult(null)
//     } else {
//       onComplete()
//     }
//   }

//   if (loadingExercises) {
//     return (
//       <Card className="border-0 shadow-xl">
//         <CardContent className="flex flex-col items-center py-16">
//           <Loader2 className="w-8 h-8 animate-spin text-primary" />
//           <p className="mt-4 text-muted-foreground">
//             Generating custom exercises...
//           </p>
//         </CardContent>
//       </Card>
//     )
//   }

//   return (
//     <div className="space-y-6">
//       {/* Progress */}
//       <div>
//         <div className="flex justify-between text-sm font-semibold">
//           <span>
//             Exercise {currentExerciseIndex + 1} of {exercises.length}
//           </span>
//           <span>{Math.round(progress)}%</span>
//         </div>

//         <div className="w-full bg-muted h-3 rounded-full overflow-hidden">
//           <div
//             className="h-full bg-gradient-to-r from-primary to-accent transition-all"
//             style={{ width: `${progress}%` }}
//           />
//         </div>
//       </div>

//       {/* Exercise Card */}
//       <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/80">
//         <CardHeader>
//           <div className="flex justify-between items-center">
//             <div>
//               <CardTitle className="text-2xl">
//                 Exercise {currentExerciseIndex + 1}
//               </CardTitle>
//               <CardDescription>
//                 Speak clearly and naturally
//               </CardDescription>
//             </div>
//             <Volume2 className="text-primary" />
//           </div>
//         </CardHeader>

//         <CardContent className="space-y-6">
//           <div className="rounded-xl border p-8 text-center text-2xl font-bold">
//             "{currentExercise}"
//           </div>

//           {!result && (
//             <>
//               {isRecording && (
//                 <div className="text-red-600 font-semibold text-center">
//                   Recording… {recordingTime}s
//                 </div>
//               )}

//               {!isRecording && !isProcessing && (
//                 <Button
//                   onClick={startRecording}
//                   className="w-full py-6 text-lg"
//                 >
//                   <Mic className="mr-2" /> Start Recording
//                 </Button>
//               )}

//               {isRecording && (
//                 <Button
//                   variant="destructive"
//                   onClick={stopRecording}
//                   className="w-full py-6 text-lg"
//                 >
//                   <Square className="mr-2" /> Stop Recording
//                 </Button>
//               )}

//               {isProcessing && (
//                 <div className="flex justify-center py-8">
//                   <Loader2 className="animate-spin" />
//                 </div>
//               )}
//             </>
//           )}

//           {result && (
//             <>
//               {result.status === "success" && (
//                 <ResultDisplay result={result.data} />
//               )}

//               {result.status === "error" && (
//                 <div className="flex gap-2 text-red-600">
//                   <AlertCircle /> {result.message}
//                 </div>
//               )}

//               <div className="flex gap-3">
//                 <Button variant="outline" onClick={() => setResult(null)}>
//                   Try Again
//                 </Button>
//                 <Button onClick={handleNextExercise}>
//                   Next Exercise
//                 </Button>
//               </div>
//             </>
//           )}
//         </CardContent>
//       </Card>
//     </div>
//   )
// }

// /* ---------------- Result Display ---------------- */

// function ResultDisplay({ result }) {
//   return (
//     <div className="space-y-4">
//       <div className="grid grid-cols-3 gap-4">
//         <Stat label="Score" value={result.score || 0} />
//         <Stat label="Accuracy" value={`${result.accuracy || 0}%`} />
//         <Stat label="Status" value="Complete" icon />
//       </div>

//       <div className="border rounded-xl p-4">
//         <p className="text-sm font-semibold mb-1">You said:</p>
//         <p className="italic">{result.transcription}</p>
//       </div>
//     </div>
//   )
// }

// function Stat({ label, value, icon }) {
//   return (
//     <div className="rounded-xl border p-4 text-center">
//       {icon && <CheckCircle className="mx-auto mb-1 text-green-500" />}
//       <p className="text-xs text-muted-foreground">{label}</p>
//       <p className="text-2xl font-bold">{value}</p>
//     </div>
//   )
// }


import { useState, useRef, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Mic,
  Square,
  Loader2,
  Volume2,
  VolumeX,
  MessageCircle,
  Send,
  X,
  ArrowLeft,
  Play,
} from "lucide-react"
import { apiClient } from "../lib/api"
import { useAuth } from "../lib/AuthContext"

export default function ExerciseRunner() {
  const { id: exerciseType } = useParams()
  const navigate = useNavigate()
  const { saveResult, isAuthenticated } = useAuth()
  
  // Setup state - show exercise count selector before starting
  const [setupComplete, setSetupComplete] = useState(false)
  const [exerciseCount, setExerciseCount] = useState(5)
  
  const [exercises, setExercises] = useState([])
  const [index, setIndex] = useState(0)
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [time, setTime] = useState(0)
  
  // Voice/Audio state
  const [isMuted, setIsMuted] = useState(false)
  const [availableVoices, setAvailableVoices] = useState([])

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

  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const timerRef = useRef(null)

  const exercise = exercises[index]
  const progress = exercises.length
    ? ((index + 1) / exercises.length) * 100
    : 0

  /* Load exercises dynamically using Groq - only after setup is complete */
  useEffect(() => {
    if (!setupComplete) return
    
    const loadExercises = async () => {
      setLoading(true)
      console.log("[ExerciseRunner] Loading exercises for type:", exerciseType, "count:", exerciseCount)
      try {
        const res = await apiClient.generateCustomExercises(exerciseType || "general", exerciseCount)
        console.log("[ExerciseRunner] Received exercises:", res)
        if (res.exercises && res.exercises.length > 0) {
          setExercises(res.exercises)
        } else {
          console.warn("[ExerciseRunner] No exercises returned, using fallback")
          setExercises(["Please say anything to test your speech clarity"])
        }
      } catch (err) {
        console.error("[ExerciseRunner] Failed to load exercises:", err.message)
        setExercises(["Please say anything to test your speech clarity"])
      } finally {
        setLoading(false)
      }
    }

    loadExercises()
  }, [exerciseType, setupComplete, exerciseCount])

  /* Load available voices for better TTS */
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      setAvailableVoices(voices)
    }
    
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null
    }
  }, [])

  /* Recording timer */
  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => setTime(t => t + 1), 1000)
    } else {
      clearInterval(timerRef.current)
      setTime(0)
    }
    return () => clearInterval(timerRef.current)
  }, [recording])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []

      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder

      recorder.ondataavailable = e => chunksRef.current.push(e.data)
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/wav" })
        await submit(blob)
      }

      recorder.start()
      setRecording(true)
    } catch {
      alert("Microphone permission denied")
    }
  }

  const stopRecording = () => {
    recorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    setRecording(false)
    setProcessing(true)
  }

  const submit = async (blob) => {
    try {
      const res = await apiClient.submitAudio(blob, exercise)
      setResult(res)
      
      // Save result to Firebase if authenticated
      if (isAuthenticated && res?.data) {
        await saveResult({
          exerciseType: exerciseType || 'general',
          exerciseText: exercise,
          transcription: res.data.transcription || '',
          score: res.data.score || 0,
          accuracy: (res.data.accuracy || 0) * 100,
          feedback: res.data.llm_feedback || res.feedback || ''
        })
      }
      
      // Speak feedback using browser TTS
      if (res?.data?.llm_feedback || res?.feedback) {
        speakFeedback(res?.data?.llm_feedback || res?.feedback)
      }
    } catch {
      setResult({ status: "error", message: "Failed to process audio" })
    } finally {
      setProcessing(false)
    }
  }

  const speakFeedback = (text) => {
    if (isMuted) return
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel()
    
    const msg = new SpeechSynthesisUtterance(text)
    
    // Try to find a nice, natural-sounding voice
    const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices()
    
    // Prefer these voices in order (natural sounding female voices)
    const preferredVoices = [
      'Google UK English Female',
      'Google US English',
      'Microsoft Zira',
      'Samantha',
      'Karen',
      'Moira',
      'Tessa',
      'Microsoft Jenny Online (Natural)',
      'Microsoft Aria Online (Natural)',
      'en-US-Neural2-F',
      'en-GB-Neural2-A'
    ]
    
    let selectedVoice = null
    
    // Try to find a preferred voice
    for (const prefName of preferredVoices) {
      selectedVoice = voices.find(v => 
        v.name.includes(prefName) || v.name.toLowerCase().includes(prefName.toLowerCase())
      )
      if (selectedVoice) break
    }
    
    // Fallback: find any English female voice
    if (!selectedVoice) {
      selectedVoice = voices.find(v => 
        v.lang.startsWith('en') && 
        (v.name.toLowerCase().includes('female') || 
         v.name.includes('Zira') || 
         v.name.includes('Samantha') ||
         v.name.includes('Karen'))
      )
    }
    
    // Final fallback: any English voice
    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.lang.startsWith('en'))
    }
    
    if (selectedVoice) {
      msg.voice = selectedVoice
    }
    
    // Natural speech settings
    msg.rate = 0.95  // Slightly slower for clarity
    msg.pitch = 1.05 // Slightly higher for warmth
    msg.volume = 1.0
    
    window.speechSynthesis.speak(msg)
  }
  
  const stopSpeaking = () => {
    window.speechSynthesis.cancel()
  }
  
  const toggleMute = () => {
    if (!isMuted) {
      stopSpeaking()
    }
    setIsMuted(!isMuted)
  }

  const next = () => {
    if (index < exercises.length - 1) {
      setIndex(i => i + 1)
      setResult(null)
    } else {
      navigate("/dashboard")
    }
  }

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

  // Exercise type display names
  const exerciseTypeNames = {
    lisp: "Lisp Mastery",
    stuttering: "Fluent Speaking",
    general: "Voice Clarity",
    custom: "AI Personalized"
  }

  // Setup Screen - Choose number of exercises
  if (!setupComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#EDEBFF] to-[#FAFAFF] px-4 py-12 flex justify-center">
        <div className="w-full max-w-2xl">
          {/* Back Button */}
          <button
            onClick={() => navigate('/dashboard')}
            className="mb-6 flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 hover:bg-white border border-[#E6E2FF] text-[#17153B] font-medium transition-all hover:shadow-md"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="
              relative overflow-hidden
              bg-white
              border border-[#E6E2FF]
              rounded-[32px]
              p-10 md:p-14
              shadow-[0_30px_80px_rgba(124,108,255,0.18)]
            "
          >
            {/* Glow blobs */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-[#B6ABFF]/40 to-transparent rounded-full blur-3xl -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-[#D6CFFF]/40 to-transparent rounded-full blur-3xl -ml-20 -mb-20" />

            <div className="relative z-10 space-y-8">
              <div className="text-center">
                <div className="text-6xl mb-4">🐱</div>
                <h2 className="text-3xl font-extrabold text-[#17153B]">
                  {exerciseTypeNames[exerciseType] || "Speech Exercise"}
                </h2>
                <p className="text-[#4B4A6A] mt-2">
                  Mr. Whiskers will generate unique exercises just for you!
                </p>
              </div>

              <div className="space-y-4">
                <label className="block text-center text-lg font-semibold text-[#17153B]">
                  How many exercises would you like?
                </label>
                
                <div className="grid grid-cols-4 gap-3">
                  {[3, 5, 7, 10].map((count) => (
                    <button
                      key={count}
                      onClick={() => setExerciseCount(count)}
                      className={`
                        py-4 rounded-xl text-lg font-bold transition-all
                        ${exerciseCount === count
                          ? 'bg-gradient-to-r from-[#7C6CFF] to-[#B6ABFF] text-white shadow-lg scale-105'
                          : 'bg-[#F7F6FF] border border-[#E6E2FF] text-[#17153B] hover:border-[#7C6CFF]'
                        }
                      `}
                    >
                      {count}
                    </button>
                  ))}
                </div>

                <p className="text-center text-sm text-[#4B4A6A]">
                  Each session generates fresh, AI-powered exercises tailored to your needs
                </p>
              </div>

              <button
                onClick={() => setSetupComplete(true)}
                className="
                  w-full py-5 rounded-2xl
                  bg-gradient-to-r from-[#7C6CFF] to-[#B6ABFF]
                  hover:from-[#6B5CE0] hover:to-[#A599FF]
                  text-white text-lg font-bold
                  shadow-lg hover:shadow-xl
                  transition-all
                  flex items-center justify-center gap-2
                "
              >
                <Play size={24} />
                Start {exerciseCount} Exercises
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#EDEBFF] to-[#FAFAFF] gap-4">
        <div className="text-6xl animate-bounce">🐱</div>
        <Loader2 className="w-10 h-10 animate-spin text-[#7C6CFF]" />
        <p className="text-[#4B4A6A] font-medium">Mr. Whiskers is generating {exerciseCount} exercises for you...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EDEBFF] to-[#FAFAFF] px-4 py-12 flex justify-center">

      <div className="w-full max-w-4xl space-y-10">

        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 hover:bg-white border border-[#E6E2FF] text-[#17153B] font-medium transition-all hover:shadow-md"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        {/* Progress */}
        <div className="bg-white/70 backdrop-blur-md border border-[#E6E2FF] rounded-2xl p-4">
          <div className="flex justify-between text-sm font-semibold text-[#17153B] mb-2">
            <span>Exercise {index + 1} of {exercises.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-[#E6E2FF] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#7C6CFF] to-[#B6ABFF]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="
            relative overflow-hidden
            bg-white
            border border-[#E6E2FF]
            rounded-[32px]
            p-10 md:p-14
            shadow-[0_30px_80px_rgba(124,108,255,0.18)]
          "
        >
          {/* Glow blobs */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-[#B6ABFF]/40 to-transparent rounded-full blur-3xl -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-[#D6CFFF]/40 to-transparent rounded-full blur-3xl -ml-20 -mb-20" />

          <div className="relative z-10 space-y-8">

            <div className="flex justify-between">
              <div>
                <h2 className="text-3xl font-extrabold text-[#17153B]">
                  Exercise {index + 1}
                </h2>
                <p className="text-[#4B4A6A]">Speak clearly and naturally</p>
              </div>
              <Volume2 className="text-[#7C6CFF]" />
            </div>

            <div className="
              bg-[#F7F6FF]
              border border-[#E6E2FF]
              rounded-2xl p-10 text-center
              text-2xl md:text-3xl font-bold text-[#17153B]
            ">
              “{exercise}”
            </div>

            {/* Controls */}
            {!result && (
              <div className="space-y-4">
                {recording && (
                  <p className="text-center text-red-600 font-semibold animate-pulse">
                    Recording… {time}s
                  </p>
                )}

                {!recording && !processing && (
                  <button
                    onClick={startRecording}
                    className="
                      group relative w-full text-left overflow-hidden
        rounded-2xl p-8
        bg-gradient-to-br from-[#EAE6FF] to-[#E0DAFF]
        border border-[#B6ABFF]
        hover:border-[#8F7EFF]
        hover:shadow-[0_24px_48px_rgba(124,108,255,0.2)]
        transition-all duration-300
                    "
                  >
                    
                    <Mic className="inline mr-2 " /> Start Recording
                  </button>
                )}

                {recording && (
                  <button
                    onClick={stopRecording}
                    className="
                      w-full py-6 rounded-2xl
                      bg-red-500 hover:bg-red-600
                      text-white text-lg font-bold
                    "
                  >
                    <Square className="inline mr-2" /> Stop Recording
                  </button>
                )}

                {processing && (
                  <div className="flex justify-center py-6">
                    <Loader2 className="animate-spin text-[#7C6CFF]" />
                  </div>
                )}
              </div>
            )}

            {/* Result */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Score Display */}
                  {result.status === "success" && result.data && (
                    <div className="space-y-4">
                      {/* Main Scores */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className={`rounded-xl p-4 text-center ${
                          (result.data.score || 0) >= 80 ? 'bg-green-50 border border-green-200' :
                          (result.data.score || 0) >= 60 ? 'bg-yellow-50 border border-yellow-200' :
                          'bg-red-50 border border-red-200'
                        }`}>
                          <p className="text-xs text-gray-600">Score</p>
                          <p className={`text-2xl font-bold ${
                            (result.data.score || 0) >= 80 ? 'text-green-700' :
                            (result.data.score || 0) >= 60 ? 'text-yellow-700' :
                            'text-red-700'
                          }`}>
                            {Math.round(result.data.score || 0)}
                          </p>
                        </div>
                        <div className="bg-[#F7F6FF] border border-[#E6E2FF] rounded-xl p-4 text-center">
                          <p className="text-xs text-[#4B4A6A]">Accuracy</p>
                          <p className="text-2xl font-bold text-[#17153B]">
                            {Math.round((result.data.accuracy || 0) * 100)}%
                          </p>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                          <p className="text-xs text-green-600">Status</p>
                          <p className="text-2xl font-bold text-green-700">✓</p>
                        </div>
                      </div>

                      {/* Component Scores (if available) */}
                      {result.data.analysis?.component_scores && (
                        <div className="grid grid-cols-4 gap-2">
                          {Object.entries(result.data.analysis.component_scores).map(([key, value]) => (
                            <div key={key} className="bg-white border border-[#E6E2FF] rounded-lg p-2 text-center">
                              <p className="text-xs text-gray-500 capitalize">{key}</p>
                              <p className="text-sm font-semibold text-[#17153B]">{Math.round(value)}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Transcription */}
                      <div className="bg-[#F7F6FF] border border-[#E6E2FF] rounded-xl p-4">
                        <p className="text-sm font-semibold text-[#17153B] mb-1">You said:</p>
                        <p className="italic text-[#4B4A6A]">"{result.data.transcription}"</p>
                      </div>

                      {/* Lisp Analysis (if detected) */}
                      {result.data.analysis?.lisp_analysis?.likelihood > 0.3 && (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">🗣️</span>
                            <p className="text-sm font-semibold text-orange-800">
                              Lisp Detection ({Math.round(result.data.analysis.lisp_analysis.likelihood * 100)}% likelihood)
                            </p>
                          </div>
                          {result.data.analysis.lisp_analysis.type && (
                            <p className="text-sm text-orange-700 mb-2">
                              Type: <span className="font-medium capitalize">{result.data.analysis.lisp_analysis.type.replace('_', ' ')}</span>
                            </p>
                          )}
                          {result.data.analysis.lisp_analysis.recommendations?.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-orange-800 mb-1">Recommendations:</p>
                              <ul className="text-xs text-orange-700 list-disc list-inside space-y-1">
                                {result.data.analysis.lisp_analysis.recommendations.slice(0, 2).map((rec, idx) => (
                                  <li key={idx}>{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Issues Detected */}
                      {result.data.issues?.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                          <p className="text-sm font-semibold text-blue-800 mb-2">📋 Areas to Improve:</p>
                          <div className="flex flex-wrap gap-2">
                            {result.data.issues.map((issue, idx) => (
                              <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full capitalize">
                                {issue.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Feedback from Mr. Whiskers */}
                      {(result.data.llm_feedback || result.feedback) && (
                        <div className="bg-gradient-to-br from-[#EAE6FF] to-[#E0DAFF] border border-[#B6ABFF] rounded-xl p-4">
                          <p className="text-sm font-semibold text-[#17153B] mb-2">
                            🐱 Mr. Whiskers says:
                          </p>
                          <p className="text-[#4B4A6A]">{result.data.llm_feedback || result.feedback}</p>
                        </div>
                      )}

                      {/* Suggestions */}
                      {result.data.analysis?.suggestions?.length > 0 && (
                        <div className="bg-[#F0FFF4] border border-green-200 rounded-xl p-4">
                          <p className="text-sm font-semibold text-green-800 mb-2">💡 Tips for Improvement:</p>
                          <ul className="text-sm text-green-700 space-y-1">
                            {result.data.analysis.suggestions.slice(0, 3).map((suggestion, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-green-500">•</span>
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {result.status === "error" && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">
                      {result.message || "An error occurred. Please try again."}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setResult(null)}
                      className="flex-1 py-4 rounded-xl border border-[#E6E2FF] hover:bg-[#F7F6FF] transition-colors"
                    >
                      Try Again
                    </button>

                    <button
                      onClick={toggleMute}
                      className={`px-4 py-4 rounded-xl border transition-colors flex items-center justify-center ${
                        isMuted 
                          ? 'border-red-300 bg-red-50 text-red-500 hover:bg-red-100' 
                          : 'border-[#E6E2FF] bg-[#F7F6FF] text-[#7C6CFF] hover:bg-[#EAE6FF]'
                      }`}
                      title={isMuted ? "Unmute voice feedback" : "Mute voice feedback"}
                    >
                      {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>

                    <button
                      onClick={() => {
                        stopSpeaking()
                        next()
                      }}
                      className="flex-1 py-4 rounded-xl bg-[#7C6CFF] text-white font-bold hover:bg-[#6B5CE0] transition-colors"
                    >
                      {index < exercises.length - 1 ? "Next Exercise" : "Finish"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </motion.div>
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
