// src/pages/Physiotherapy.jsx
import { useEffect, useRef, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const PHYSIO_HTTP_BASE = "https://raiselegexercise.onrender.com";
const PHYSIO_WS_BASE = "wss://raiselegexercise.onrender.com/ws";

export default function Physiotherapy() {
  const { user, isAuthenticated, loginWithRedirect } = useAuth0();
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const streamingRef = useRef(false);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);

  const [streaming, setStreaming] = useState(false);
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [message, setMessage] = useState(
    "When you start, we’ll use your camera to guide your leg raise form."
  );

  const authUserId = isAuthenticated ? user.sub : null;

  const ensureLogin = async () => {
    if (!isAuthenticated) {
      await loginWithRedirect();
      return false;
    }
    return true;
  };

  // Send one frame to the WebSocket (called in onopen and then via onmessage loop)
  const sendFrame = () => {
    if (
      !streamingRef.current ||
      !wsRef.current ||
      wsRef.current.readyState !== WebSocket.OPEN ||
      !videoRef.current ||
      !canvasRef.current ||
      videoRef.current.videoWidth === 0 ||
      videoRef.current.videoHeight === 0
    ) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataURL = canvas.toDataURL("image/jpeg", 0.6); // quality 0.6
    wsRef.current.send(dataURL);
  };

  // Connect camera + open WebSocket
  const connectCameraAndSocket = async () => {
    const ok = await ensureLogin();
    if (!ok) return;

    try {
      // 1) Get webcam
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playError) {
          console.error("Error playing video:", playError);
          setMessage("Error starting video playback. Please try again.");
          return;
        }
      }

      // 2) Open WebSocket
      wsRef.current = new WebSocket(
        `${PHYSIO_WS_BASE}/${encodeURIComponent(authUserId)}`
      );

      wsRef.current.onopen = () => {
        console.log("WS opened");
        setWsStatus("connected");
        streamingRef.current = true;
        setStreaming(true);
        setMessage("Connected! AI processing active.");
        sendFrame(); // start first frame
      };

      wsRef.current.onmessage = (event) => {
        // processed frame from server
        const imgEl = document.getElementById("physio-output-img");
        if (imgEl) {
          imgEl.src = event.data;
          imgEl.classList.add("streaming-active");
        }
        // schedule next frame AFTER we got response
        if (streamingRef.current) {
          requestAnimationFrame(sendFrame);
        }
      };

      wsRef.current.onerror = (e) => {
        console.log("WS error:", e);
        setWsStatus("error");
        setStreaming(false);
        setMessage("WebSocket error. Please try again.");
      };

      wsRef.current.onclose = () => {
        console.log("WS closed");
        setWsStatus("disconnected");
        setStreaming(false);
        setMessage("Connection closed.");
      };
    } catch (err) {
      console.error("Error accessing webcam or WS:", err);
      setMessage("Error accessing webcam or WebSocket. Check permissions.");
    }
  };

  // Start physio session (tell backend to start counting)
  const handleStartSession = async () => {
    const ok = await ensureLogin();
    if (!ok) return;

    try {
      // if not connected yet, connect WS + camera
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        await connectCameraAndSocket();
      }

      const res = await axios.post(
        `${PHYSIO_HTTP_BASE}/start`,
        {},
        { params: { user_id: authUserId } }
      );
      console.log("START response:", res.data);
      setMessage(res.data.message || "Session started.");
    } catch (err) {
      console.error("Error starting session:", err);
      setMessage("Could not start session. Try again.");
    }
  };

  // Stop session & save to MongoDB
  const handleStopSession = async () => {
    try {
      const res = await axios.post(
        `${PHYSIO_HTTP_BASE}/stop`,
        {},
        { params: { user_id: authUserId } }
      );
      console.log("STOP response:", res.data);
      setMessage(res.data.message || "Session stopped.");
      
      streamingRef.current = false;
      setStreaming(false);

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
    } catch (err) {
      console.error("Error stopping session:", err);
      setMessage("Could not stop session. Try again.");
    }
  };

  useEffect(() => {
    return () => {
      // cleanup on unmount
      streamingRef.current = false;
      if (wsRef.current) wsRef.current.close();
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8E7FF] to-[#C9D4FF] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl rounded-[32px] shadow-2xl bg-white/80 backdrop-blur-md border border-[#E6E2FF] px-6 py-8 md:px-10 md:py-10 grid md:grid-cols-[1.3fr_1fr] gap-10">
        {/* Left side */}
        <div className="flex flex-col justify-center gap-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-[#4B3BCB] shadow-sm w-fit">
            Live Physiotherapy
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#17153B]">
              Raise Leg Exercise with AI‑guided form
            </h1>
            <p className="text-sm md:text-base text-slate-700 max-w-md">
              Position yourself so your full body is visible. When you start, our
              AI will analyze your movement in real time and help you keep proper form.
            </p>
          </div>

          <div className="rounded-2xl bg-[#17153B] text-white/90 px-4 py-3 text-sm">
            {message}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleStartSession}
              className="inline-flex items-center justify-center rounded-full px-7 py-3 text-sm font-medium bg-[#17153B] hover:bg-[#26235A] text-white transition-colors"
            >
              Start Physiotherapy Session
            </button>

            <button
              onClick={handleStopSession}
              className="inline-flex items-center justify-center rounded-full px-7 py-3 text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
            >
              Stop & Save Session
            </button>

            <button
              onClick={() => navigate("/physio-progress")}
              className="inline-flex items-center justify-center rounded-full border border-[#4B3BCB40] text-[#17153B] bg-white/70 hover:bg-white text-sm px-5 py-2 font-medium transition-colors"
            >
              View Physiotherapy Progress
            </button>

            <p className="text-xs text-slate-500">
              Your Auth0 id is used as <code>user_id</code> for the physio model.
            </p>
          </div>
        </div>

        {/* Right side: video + processed image */}
        <div className="relative h-64 md:h-full flex items-center justify-center">
          <div className="relative w-full max-w-sm h-64 md:h-72 rounded-[28px] bg-gradient-to-br from-[#7C6CFF] via-[#B78BFF] to-[#FFE6FF] shadow-2xl overflow-hidden flex items-center justify-center">
            <video
              ref={videoRef}
              className="w-full h-full object-cover rounded-[28px]"
              autoPlay
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />
            <img
              id="physio-output-img"
              alt="AI processed"
              className="absolute inset-0 w-full h-full object-cover rounded-[28px] border border-white/20 shadow-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
}