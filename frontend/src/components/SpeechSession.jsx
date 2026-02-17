import { useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Loader2, MessageCircle, Send, X } from "lucide-react";
import { apiClient } from "../lib/api";

function SpeechSession({ exerciseText = "Sally sells seashells by the seashore", onComplete }) {
  const navigate = useNavigate();

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef(null);

  // Mr. Whiskers Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      content: "Hi there! 🐱 I'm Mr. Whiskers, your friendly speech therapy assistant! How can I help you today? Feel free to ask me about exercises, tips, or anything speech-related!"
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        await submitAudio(audioBlob);
      };

      recorder.start();
      setRecording(true);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err) {
      console.error(err);
      alert("Microphone access denied. Please enable microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    setRecording(false);
    setProcessing(true);
    clearInterval(timerRef.current);
    setRecordingTime(0);
  };

  const submitAudio = async (audioBlob) => {
    try {
      const response = await apiClient.submitAudio(audioBlob, exerciseText);
      setResult(response);

      // Speak feedback using browser TTS
      if (response?.data?.llm_feedback || response?.feedback) {
        speakFeedback(response?.data?.llm_feedback || response?.feedback);
      }
    } catch (err) {
      console.error(err);
      setResult({
        status: "error",
        message: "Failed to process audio. Please try again."
      });
    } finally {
      setProcessing(false);
    }
  };

  const speakFeedback = (text) => {
    const msg = new SpeechSynthesisUtterance(text);
    msg.rate = 0.9;
    msg.pitch = 1.1;
    window.speechSynthesis.speak(msg);
  };

  const handleRetry = () => {
    setResult(null);
  };

  // Mr. Whiskers Chat Functions
  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setChatLoading(true);

    try {
      const response = await apiClient.chatWithWhiskers(userMessage);
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.message }
      ]);
    } catch (err) {
      console.error(err);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Meow... 😿 I'm having trouble connecting right now. Please try again!"
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EDEBFF] to-[#FAFAFF] px-4 py-12 flex justify-center">
      <div className="w-full max-w-4xl space-y-8">
        {/* Exercise Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-white border border-[#E6E2FF] rounded-[32px] p-10 md:p-14 shadow-[0_30px_80px_rgba(124,108,255,0.18)]"
        >
          {/* Glow blobs */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-[#B6ABFF]/40 to-transparent rounded-full blur-3xl -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-[#D6CFFF]/40 to-transparent rounded-full blur-3xl -ml-20 -mb-20" />

          <div className="relative z-10 space-y-8">
            <div>
              <h2 className="text-3xl font-extrabold text-[#17153B]">
                Speech Exercise
              </h2>
              <p className="text-[#4B4A6A]">Speak clearly and naturally</p>
            </div>

            {/* Exercise Text */}
            <div className="bg-[#F7F6FF] border border-[#E6E2FF] rounded-2xl p-10 text-center text-2xl md:text-3xl font-bold text-[#17153B]">
              "{exerciseText}"
            </div>

            {/* Recording Controls */}
            {!result && (
              <div className="space-y-4">
                {recording && (
                  <p className="text-center text-red-600 font-semibold animate-pulse">
                    🎙️ Recording… {recordingTime}s
                  </p>
                )}

                {!recording && !processing && (
                  <button
                    onClick={startRecording}
                    className="group relative w-full text-left overflow-hidden rounded-2xl p-8 bg-gradient-to-br from-[#EAE6FF] to-[#E0DAFF] border border-[#B6ABFF] hover:border-[#8F7EFF] hover:shadow-[0_24px_48px_rgba(124,108,255,0.2)] transition-all duration-300"
                  >
                    <Mic className="inline mr-2" /> Start Recording
                  </button>
                )}

                {recording && (
                  <button
                    onClick={stopRecording}
                    className="w-full py-6 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-lg font-bold"
                  >
                    <Square className="inline mr-2" /> Stop Recording
                  </button>
                )}

                {processing && (
                  <div className="flex flex-col items-center justify-center py-6 gap-2">
                    <Loader2 className="animate-spin text-[#7C6CFF] w-8 h-8" />
                    <p className="text-[#4B4A6A]">Analyzing your speech...</p>
                  </div>
                )}
              </div>
            )}

            {/* Results */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {result.status === "success" && result.data && (
                    <div className="space-y-4">
                      {/* Score Display */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-[#F7F6FF] border border-[#E6E2FF] rounded-xl p-4 text-center">
                          <p className="text-xs text-[#4B4A6A]">Score</p>
                          <p className="text-2xl font-bold text-[#17153B]">
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

                      {/* Transcription */}
                      <div className="bg-[#F7F6FF] border border-[#E6E2FF] rounded-xl p-4">
                        <p className="text-sm font-semibold text-[#17153B] mb-1">
                          You said:
                        </p>
                        <p className="italic text-[#4B4A6A]">
                          "{result.data.transcription}"
                        </p>
                      </div>

                      {/* Feedback */}
                      {result.data.llm_feedback && (
                        <div className="bg-gradient-to-br from-[#EAE6FF] to-[#E0DAFF] border border-[#B6ABFF] rounded-xl p-4">
                          <p className="text-sm font-semibold text-[#17153B] mb-2">
                            🐱 Mr. Whiskers says:
                          </p>
                          <p className="text-[#4B4A6A]">{result.data.llm_feedback}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {result.status === "error" && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">
                      {result.message || "An error occurred. Please try again."}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <button
                      onClick={handleRetry}
                      className="flex-1 py-4 rounded-xl border border-[#E6E2FF] hover:bg-[#F7F6FF] transition-colors"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => onComplete ? onComplete() : navigate("/dashboard")}
                      className="flex-1 py-4 rounded-xl bg-[#7C6CFF] text-white font-bold hover:bg-[#6B5CE0] transition-colors"
                    >
                      {onComplete ? "Next Exercise" : "Back to Dashboard"}
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
  );
}

export default SpeechSession;