# main.py
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, BackgroundTasks, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, JSON, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import os
import json
import uuid
import shutil
from pathlib import Path
import asyncio
from contextlib import asynccontextmanager
import logging
import smtplib
import ssl
from email.message import EmailMessage

# Load environment variables
from dotenv import load_dotenv

# Load .env file from the backend directory or project root
env_path = Path(__file__).parent / ".env"  # backend/.env
if env_path.exists():
    load_dotenv(env_path)
else:
    # Try project root
    load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./speech_therapy.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Directory setup
AUDIO_DIR = Path("audio_samples")
AUDIO_DIR.mkdir(exist_ok=True)

# Models
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True)
    name = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True)
    user_id = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

class Exercise(Base):
    __tablename__ = "exercises"
    id = Column(Integer, primary_key=True, index=True)
    exercise_id = Column(String, unique=True, index=True)
    session_id = Column(String, index=True)
    user_id = Column(String, index=True)
    exercise_text = Column(Text)
    transcription = Column(Text)
    score = Column(Float)
    accuracy = Column(Float)
    issues = Column(JSON)
    analysis = Column(JSON)
    llm_feedback = Column(Text)
    audio_file_path = Column(String)
    duration = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)

class Progress(Base):
    __tablename__ = "progress"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    date = Column(DateTime, default=datetime.utcnow)
    total_exercises = Column(Integer, default=0)
    average_score = Column(Float, default=0.0)
    average_accuracy = Column(Float, default=0.0)
    common_issues = Column(JSON)
    improvement_rate = Column(Float, default=0.0)

# Create tables
Base.metadata.create_all(bind=engine)

# Pydantic models
class UserCreate(BaseModel):
    name: str

class UserResponse(BaseModel):
    user_id: str
    name: str
    created_at: datetime

class SessionCreate(BaseModel):
    user_id: str

class SessionResponse(BaseModel):
    session_id: str
    user_id: str
    created_at: datetime
    completed_at: Optional[datetime]

class ExerciseRequest(BaseModel):
    exercise_text: str
    duration: Optional[int] = 5

class TranscriptionResponse(BaseModel):
    text: str
    confidence: float
    words: Optional[List[Dict[str, Any]]] = None

class AnalysisResponse(BaseModel):
    pitch_mean: float
    pitch_std: float
    speech_rate: float
    pause_count: int
    volume_mean: float
    clarity_score: float

class DiagnosisResponse(BaseModel):
    score: float
    accuracy: float
    issues: List[str]
    suggestions: List[str]

class ExerciseResult(BaseModel):
    exercise_id: str
    exercise_text: str
    transcription: str
    score: float
    accuracy: float
    issues: List[str]
    analysis: Dict[str, Any]
    llm_feedback: str
    audio_url: str
    timestamp: datetime

class ProgressResponse(BaseModel):
    user_id: str
    total_exercises: int
    average_score: float
    average_accuracy: float
    improvement_rate: float
    recent_sessions: List[Dict[str, Any]]
    issue_trends: Dict[str, int]

class CustomExerciseRequest(BaseModel):
    exercise_type: str = Field(..., description="lisp, stuttering, or general")
    count: int = Field(3, ge=1, le=10)

class ContactMessage(BaseModel):
    name: Optional[str] = ""
    email: str
    message: str
    user_id: Optional[str] = None

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Speech Therapy Assistant API")
    yield
    # Shutdown
    logger.info("Shutting down Speech Therapy Assistant API")

# FastAPI app
app = FastAPI(
    title="Speech Therapy Assistant API",
    description="AI-Powered Speech Therapy Backend",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware - must be added FIRST before any routes
# Using wildcard for debugging - can be restricted later
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now to debug
    allow_credentials=False,  # Must be False when using "*" origins
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,  # Cache preflight for 24 hours
)



# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Import modules with error handling
def get_modules():
    """Lazy load modules to handle import errors gracefully"""
    try:
        import sys
        import os
        
        # Add backend directory to path if not already there
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        if backend_dir not in sys.path:
            sys.path.insert(0, backend_dir)
        
        from audio_capture import AudioCapture
        from stt_module import SpeechToText
        from voice_analysis import VoiceAnalyzer
        from tts_module import TextToSpeech
        from llm_feedback import LLMFeedbackGenerator
        
        return {
            'audio_capture': AudioCapture(),
            'stt': SpeechToText(),
            'analyzer': VoiceAnalyzer(),
            'tts': TextToSpeech(),
            'llm': LLMFeedbackGenerator()
        }
    except Exception as e:
        logger.error(f"Failed to import modules: {e}")
        raise HTTPException(status_code=500, detail=f"Module initialization failed: {str(e)}")

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "TheraFlow AI Speech Therapy API",
        "status": "running",
        "docs": "/docs"
    }

# Health check
@app.get("/health")
async def health_check():
    """Check API health status"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "cors": "enabled"
    }

# Contact Us - Send message via email
@app.post("/api/contact/send")
async def send_contact_message(payload: ContactMessage):
    """Send Contact Us message via SMTP"""
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    smtp_from = os.getenv("SMTP_FROM", smtp_user)
    contact_to = os.getenv("CONTACT_TO", "mvibhuti82@gmail.com")

    if not smtp_host or not smtp_user or not smtp_pass or not smtp_from:
        logger.error("SMTP configuration is missing")
        raise HTTPException(status_code=500, detail="Email service not configured")

    msg = EmailMessage()
    msg["Subject"] = "Contact Us Message"
    msg["From"] = smtp_from
    msg["To"] = contact_to
    msg["Reply-To"] = payload.email
    msg.set_content(
        f"Name: {payload.name}\n"
        f"Email: {payload.email}\n"
        f"User ID: {payload.user_id or 'N/A'}\n\n"
        f"Message:\n{payload.message}"
    )

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls(context=context)
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        return {"success": True}
    except Exception as e:
        logger.error(f"Failed to send contact message: {e}")
        raise HTTPException(status_code=500, detail="Failed to send message")

# ============================================================================
# ADAPTER ENDPOINTS FOR FRONTEND COMPATIBILITY
# These endpoints match what the frontend expects to call
# ============================================================================

@app.post("/api/exercise/start")
async def start_exercise(request: dict, db: Session = Depends(get_db)):
    """
    Start an exercise session - Frontend compatible endpoint
    
    Request: { "exercise_text": str, "duration": int }
    Response: { "sessionId": str, "status": str }
    """
    try:
        exercise_text = request.get("exercise_text")
        duration = request.get("duration", 5)
        
        if not exercise_text:
            raise HTTPException(status_code=400, detail="exercise_text is required")
        
        # Create a session
        session_id = str(uuid.uuid4())
        db_session = Session(session_id=session_id, user_id="anonymous")
        db.add(db_session)
        db.commit()
        
        logger.info(f"Started exercise session: {session_id}")
        return {
            "sessionId": session_id,
            "status": "started",
            "exercise": exercise_text,
            "duration": duration
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error starting exercise: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/exercise/submit")
async def submit_exercise(
    audio: UploadFile = File(...),
    exercise_text: str = Form(""),
    db: Session = Depends(get_db)
):
    """
    Submit audio for exercise and get feedback - Frontend compatible endpoint
    
    Returns: SessionResponse with feedback and score
    """
    try:
        logger.info(f"Received audio submission - filename: {audio.filename}, exercise_text: {exercise_text}")
        
        if not exercise_text:
            raise HTTPException(status_code=400, detail="exercise_text is required")
        
        logger.info("Loading modules...")
        modules = get_modules()
        logger.info("Modules loaded successfully")
        
        # Save uploaded file
        logger.info("Saving audio file...")
        file_id = str(uuid.uuid4())
        file_path = AUDIO_DIR / f"{file_id}_{audio.filename}"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)
        logger.info(f"Audio saved to: {file_path}")
        
        # Transcribe audio
        logger.info("Transcribing audio...")
        transcription = modules['stt'].transcribe(str(file_path))
        logger.info(f"Transcription result: {transcription}")
        
        if not transcription or not transcription.get("text"):
            logger.warning("Transcription failed or returned empty text")
            return {
                "status": "error",
                "message": "Could not transcribe audio. Please try again.",
                "data": None
            }
        
        # Analyze audio
        logger.info("Analyzing audio...")
        try:
            analysis = modules['analyzer'].analyze_audio(str(file_path), transcription)
            logger.info(f"Analysis complete: {list(analysis.keys())}")
            
            if "error" in analysis:
                logger.warning(f"Audio analysis had issues: {analysis['error']}")
                
        except Exception as e:
            logger.warning(f"Audio analysis failed, using fallback: {e}")
            # Use basic fallback analysis
            analysis = {
                "duration": 1.0,
                "pitch_mean": 150.0,
                "pitch_std": 20.0,
                "speech_rate": 2.5,
                "pause_count": 1,
                "clarity_score": 0.7,
                "volume_mean": 0.5,
                "volume_std": 0.1,
                "fallback": True
            }
        
        # Diagnose
        logger.info("Running diagnosis...")
        try:
            diagnosis = modules['analyzer'].diagnose(
                analysis,
                transcription,
                expected_text=exercise_text
            )
            logger.info(f"Diagnosis complete: score={diagnosis.get('score', 0)}")
        except Exception as e:
            logger.warning(f"Diagnosis failed, using basic results: {e}")
            # Basic diagnosis fallback
            diagnosis = {
                "score": 70,
                "accuracy": 0.7,
                "issues": ["Audio analysis unavailable"],
                "suggestions": ["Try recording in a quieter environment"]
            }
        
        # Generate feedback
        llm_feedback = modules['llm'].generate_feedback({
            "expected_text": exercise_text,
            "actual_text": transcription['text'],
            "accuracy_score": diagnosis.get('accuracy', 0),
            "issues": diagnosis['issues'],
            "analysis": analysis,
            "previous_scores": []
        })
        
        # Save to database
        exercise_id = str(uuid.uuid4())
        db_exercise = Exercise(
            exercise_id=exercise_id,
            session_id="anonymous_session",
            user_id="anonymous",
            exercise_text=exercise_text,
            transcription=transcription['text'],
            score=diagnosis['score'],
            accuracy=diagnosis.get('accuracy', 0),
            issues=diagnosis['issues'],
            analysis=analysis,
            llm_feedback=llm_feedback,
            audio_file_path=str(file_path),
            duration=float(duration) if (duration := analysis.get('duration')) else 0.0
        )
        
        db.add(db_exercise)
        db.commit()
        
        logger.info(f"Submitted exercise: {exercise_id}")
        
        # Prepare enhanced analysis for frontend
        enhanced_analysis = {
            **analysis,
            "component_scores": diagnosis.get("component_scores", {}),
            "lisp_analysis": diagnosis.get("lisp_analysis", {}),
            "suggestions": diagnosis.get("suggestions", [])
        }
        
        return {
            "status": "success",
            "data": {
                "timestamp": datetime.utcnow().isoformat(),
                "exercise": exercise_text,
                "transcription": transcription['text'],
                "score": diagnosis['score'],
                "accuracy": diagnosis.get('accuracy', 0),
                "issues": diagnosis['issues'],
                "analysis": enhanced_analysis,
                "llm_feedback": llm_feedback
            },
            "feedback": llm_feedback
        }
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        db.rollback()
        error_traceback = traceback.format_exc()
        logger.error(f"Error submitting exercise: {e}")
        logger.error(f"Traceback: {error_traceback}")
        raise HTTPException(status_code=500, detail=f"{str(e)}\n\nSee backend logs for full traceback")


@app.get("/api/sessions/history")
async def get_sessions_history(db: Session = Depends(get_db)):
    """
    Get session history - Frontend compatible endpoint
    
    Returns: List of ExerciseResult objects
    """
    try:
        # Get all exercises for anonymous user (or specific user if authenticated)
        exercises = db.query(Exercise).filter(
            Exercise.user_id == "anonymous"
        ).order_by(Exercise.timestamp.desc()).all()
        
        results = []
        for ex in exercises:
            results.append({
                "timestamp": ex.timestamp.isoformat(),
                "exercise": ex.exercise_text,
                "transcription": ex.transcription,
                "score": ex.score,
                "accuracy": ex.accuracy,
                "issues": ex.issues,
                "analysis": ex.analysis,
                "llm_feedback": ex.llm_feedback
            })
        
        logger.info(f"Retrieved {len(results)} session history entries")
        return results
    
    except Exception as e:
        logger.error(f"Error getting session history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/sessions/save")
async def save_sessions(db: Session = Depends(get_db)):
    """
    Save session progress to file - Frontend compatible endpoint
    
    Returns: { "status": "success", "message": str }
    """
    try:
        # Get all exercises for anonymous user
        exercises = db.query(Exercise).filter(
            Exercise.user_id == "anonymous"
        ).order_by(Exercise.timestamp.desc()).all()
        
        # Prepare export data
        export_data = [
            {
                "timestamp": ex.timestamp.isoformat(),
                "exercise": ex.exercise_text,
                "transcription": ex.transcription,
                "score": ex.score,
                "accuracy": ex.accuracy,
                "issues": ex.issues,
                "analysis": ex.analysis,
                "llm_feedback": ex.llm_feedback
            }
            for ex in exercises
        ]
        
        # Save to file
        progress_dir = Path("progress_logs")
        progress_dir.mkdir(exist_ok=True)
        
        filename = f"progress_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        filepath = progress_dir / filename
        
        with open(filepath, 'w') as f:
            json.dump(export_data, f, indent=2)
        
        logger.info(f"Saved progress to {filename}")
        
        return {
            "status": "success",
            "message": f"Progress saved to {filename}"
        }
    
    except Exception as e:
        logger.error(f"Error saving progress: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# CHAT ASSISTANT ENDPOINT
# ============================================================================

class ChatMessage(BaseModel):
    message: str

@app.post("/api/chat")
async def chat_with_assistant(chat: ChatMessage):
    """
    Chat with the AI speech therapy assistant
    Uses the same Groq API for conversational help
    """
    try:
        from groq import Groq
        
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="API key not configured")
        
        client = Groq(api_key=api_key)
        
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": """You are Whiskers, a friendly and knowledgeable AI cat assistant 🐱 specialized in speech therapy. 
You help users understand their speech concerns and guide them to the right exercises.

Your personality:
- Warm, encouraging, and supportive
- Use occasional cat-related expressions (meow, purr-fect, etc.) but don't overdo it
- Keep responses concise (2-4 sentences usually)
- Be empathetic about speech difficulties
- Provide practical, actionable advice

You can help with:
- Explaining different speech conditions (lisp, stuttering, articulation issues)
- Recommending which exercises to try
- Providing tips for speech improvement
- Answering questions about speech therapy
- Motivating and encouraging users

Always remind users that while you can provide guidance, consulting with a professional speech therapist is important for personalized treatment."""
                },
                {
                    "role": "user",
                    "content": chat.message
                }
            ],
            temperature=0.7,
            max_tokens=300
        )
        
        return {
            "message": response.choices[0].message.content.strip(),
            "suggestions": ["Try an exercise", "Learn more", "Track progress"]
        }
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return {
            "message": "Meow... 😿 I'm having a bit of trouble right now. Please try again in a moment!",
            "suggestions": []
        }

# ============================================================================
# USER & SESSION ENDPOINTS
# ============================================================================

# User endpoints
@app.post("/api/users", response_model=UserResponse)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """Create a new user"""
    try:
        user_id = str(uuid.uuid4())
        db_user = User(user_id=user_id, name=user.name)
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        logger.info(f"Created user: {user_id}")
        return UserResponse(
            user_id=db_user.user_id,
            name=db_user.name,
            created_at=db_user.created_at
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, db: Session = Depends(get_db)):
    """Get user by ID"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        user_id=user.user_id,
        name=user.name,
        created_at=user.created_at
    )

# Session endpoints
@app.post("/api/sessions", response_model=SessionResponse)
async def create_session(session: SessionCreate, db: Session = Depends(get_db)):
    """Create a new therapy session"""
    try:
        # Verify user exists
        user = db.query(User).filter(User.user_id == session.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        session_id = str(uuid.uuid4())
        db_session = Session(session_id=session_id, user_id=session.user_id)
        db.add(db_session)
        db.commit()
        db.refresh(db_session)
        
        logger.info(f"Created session: {session_id} for user: {session.user_id}")
        return SessionResponse(
            session_id=db_session.session_id,
            user_id=db_session.user_id,
            created_at=db_session.created_at,
            completed_at=db_session.completed_at
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/sessions/{session_id}/complete")
async def complete_session(session_id: str, db: Session = Depends(get_db)):
    """Mark a session as completed"""
    session = db.query(Session).filter(Session.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.completed_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Session completed", "session_id": session_id}

@app.get("/api/sessions/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str, db: Session = Depends(get_db)):
    """Get session details"""
    session = db.query(Session).filter(Session.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return SessionResponse(
        session_id=session.session_id,
        user_id=session.user_id,
        created_at=session.created_at,
        completed_at=session.completed_at
    )

# Exercise endpoints
@app.post("/api/exercises/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Transcribe uploaded audio file"""
    try:
        modules = get_modules()
        
        # Save uploaded file
        file_id = str(uuid.uuid4())
        file_path = AUDIO_DIR / f"{file_id}_{audio.filename}"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)
        
        # Transcribe
        transcription = modules['stt'].transcribe(str(file_path))
        
        if not transcription or not transcription.get("text"):
            raise HTTPException(status_code=400, detail="Could not transcribe audio")
        
        return TranscriptionResponse(
            text=transcription["text"],
            confidence=transcription.get("confidence", 0.0),
            words=transcription.get("words", [])
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@app.post("/api/exercises/analyze")
async def analyze_audio(
    audio: UploadFile = File(...),
    exercise_text: str = "",
    db: Session = Depends(get_db)
):
    """Analyze audio and provide feedback"""
    try:
        modules = get_modules()
        
        # Save uploaded file
        file_id = str(uuid.uuid4())
        file_path = AUDIO_DIR / f"{file_id}_{audio.filename}"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)
        
        # Transcribe
        transcription = modules['stt'].transcribe(str(file_path))
        if not transcription or not transcription.get("text"):
            raise HTTPException(status_code=400, detail="Could not transcribe audio")
        
        # Analyze
        analysis = modules['analyzer'].analyze_audio(str(file_path), transcription)
        
        # Diagnose
        diagnosis = modules['analyzer'].diagnose(
            analysis,
            transcription,
            expected_text=exercise_text
        )
        
        # Generate feedback
        llm_feedback = modules['llm'].generate_feedback({
            "expected_text": exercise_text,
            "actual_text": transcription['text'],
            "accuracy_score": diagnosis.get('accuracy', 0),
            "issues": diagnosis['issues'],
            "analysis": analysis,
            "previous_scores": []
        })
        
        return {
            "transcription": TranscriptionResponse(
                text=transcription["text"],
                confidence=transcription.get("confidence", 0.0),
                words=transcription.get("words", [])
            ),
            "analysis": analysis,
            "diagnosis": DiagnosisResponse(
                score=diagnosis['score'],
                accuracy=diagnosis.get('accuracy', 0),
                issues=diagnosis['issues'],
                suggestions=diagnosis.get('suggestions', [])
            ),
            "feedback": llm_feedback,
            "audio_path": str(file_path)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/api/exercises", response_model=ExerciseResult)
async def create_exercise(
    session_id: str,
    exercise_text: str,
    audio: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Process and save exercise result"""
    try:
        # Verify session exists
        session = db.query(Session).filter(Session.session_id == session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        modules = get_modules()
        
        # Save uploaded file
        exercise_id = str(uuid.uuid4())
        file_path = AUDIO_DIR / f"{exercise_id}_{audio.filename}"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)
        
        # Transcribe
        transcription = modules['stt'].transcribe(str(file_path))
        if not transcription or not transcription.get("text"):
            raise HTTPException(status_code=400, detail="Could not transcribe audio")
        
        # Analyze
        analysis = modules['analyzer'].analyze_audio(str(file_path), transcription)
        
        # Diagnose
        diagnosis = modules['analyzer'].diagnose(
            analysis,
            transcription,
            expected_text=exercise_text
        )
        
        # Get previous scores for this user
        previous_exercises = db.query(Exercise).filter(
            Exercise.user_id == session.user_id
        ).order_by(Exercise.timestamp.desc()).limit(10).all()
        previous_scores = [ex.score for ex in previous_exercises]
        
        # Generate feedback
        llm_feedback = modules['llm'].generate_feedback({
            "expected_text": exercise_text,
            "actual_text": transcription['text'],
            "accuracy_score": diagnosis.get('accuracy', 0),
            "issues": diagnosis['issues'],
            "analysis": analysis,
            "previous_scores": previous_scores
        })
        
        # Save to database
        db_exercise = Exercise(
            exercise_id=exercise_id,
            session_id=session_id,
            user_id=session.user_id,
            exercise_text=exercise_text,
            transcription=transcription['text'],
            score=diagnosis['score'],
            accuracy=diagnosis.get('accuracy', 0),
            issues=diagnosis['issues'],
            analysis=analysis,
            llm_feedback=llm_feedback,
            audio_file_path=str(file_path),
            duration=analysis.get('duration', 0)
        )
        
        db.add(db_exercise)
        db.commit()
        db.refresh(db_exercise)
        
        logger.info(f"Created exercise: {exercise_id}")
        
        return ExerciseResult(
            exercise_id=db_exercise.exercise_id,
            exercise_text=db_exercise.exercise_text,
            transcription=db_exercise.transcription,
            score=db_exercise.score,
            accuracy=db_exercise.accuracy,
            issues=db_exercise.issues,
            analysis=db_exercise.analysis,
            llm_feedback=db_exercise.llm_feedback,
            audio_url=f"/api/audio/{exercise_id}",
            timestamp=db_exercise.timestamp
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating exercise: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# IMPORTANT: Specific routes must come BEFORE generic path parameter routes
# Generate exercises endpoints (must be before /api/exercises/{exercise_id})
@app.get("/api/exercises/generate")
async def generate_exercises(type: str = "general", count: int = 3, difficulty: str = "beginner"):
    """
    Generate custom exercises using AI - Frontend compatible GET endpoint
    
    Query parameters:
    - type: lisp|stuttering|general|custom
    - count: number of exercises to generate (default 3)
    - difficulty: beginner|intermediate|advanced (default beginner)
    """
    try:
        logger.info(f"Generating {count} {difficulty} exercises for type: {type}")
        modules = get_modules()
        
        # Generate exercises dynamically using Groq LLM
        exercises = modules['llm'].generate_exercise_prompt(
            issue_type=type,
            difficulty=difficulty,
            count=count
        )
        
        # Validate we got exercises
        if not exercises or len(exercises) == 0:
            logger.warning(f"No exercises generated, using fallback")
            # Fallback to simple exercise
            exercises = ["Please try again - the AI is having trouble generating exercises."]
        
        logger.info(f"Generated {len(exercises)} exercises of type: {type}")
        return {"exercises": exercises, "type": type, "difficulty": difficulty}
    except Exception as e:
        logger.error(f"Error generating exercises: {e}")
        raise HTTPException(status_code=500, detail=f"Exercise generation failed: {str(e)}")

# POST endpoint for custom exercise generation (optional - for API flexibility)
@app.post("/api/exercises/generate")
async def generate_exercises_post(request: CustomExerciseRequest):
    """Generate custom exercises using AI - POST endpoint"""
    try:
        modules = get_modules()
        exercises = modules['llm'].generate_exercise_prompt(
            issue_type=request.exercise_type,
            difficulty="beginner",
            count=request.count
        )
        return {"exercises": exercises, "type": request.exercise_type}
    except Exception as e:
        logger.error(f"Error generating exercises: {e}")
        raise HTTPException(status_code=500, detail=f"Exercise generation failed: {str(e)}")

# Generic exercise retrieval by ID (MUST come after specific routes above)
@app.get("/api/exercises/{exercise_id}", response_model=ExerciseResult)
async def get_exercise(exercise_id: str, db: Session = Depends(get_db)):
    """Get exercise details"""
    exercise = db.query(Exercise).filter(Exercise.exercise_id == exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    
    return ExerciseResult(
        exercise_id=exercise.exercise_id,
        exercise_text=exercise.exercise_text,
        transcription=exercise.transcription,
        score=exercise.score,
        accuracy=exercise.accuracy,
        issues=exercise.issues,
        analysis=exercise.analysis,
        llm_feedback=exercise.llm_feedback,
        audio_url=f"/api/audio/{exercise_id}",
        timestamp=exercise.timestamp
    )

@app.get("/api/audio/{exercise_id}")
async def get_audio(exercise_id: str, db: Session = Depends(get_db)):
    """Download audio file for exercise"""
    exercise = db.query(Exercise).filter(Exercise.exercise_id == exercise_id).first()
    if not exercise or not exercise.audio_file_path:
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    file_path = Path(exercise.audio_file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found on disk")
    
    return FileResponse(
        path=file_path,
        media_type="audio/wav",
        filename=f"exercise_{exercise_id}.wav"
    )

# Progress endpoints
@app.get("/api/progress/{user_id}", response_model=ProgressResponse)
async def get_progress(user_id: str, days: int = 30, db: Session = Depends(get_db)):
    """Get user progress statistics"""
    try:
        # Verify user exists
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get exercises from last N days
        start_date = datetime.utcnow() - timedelta(days=days)
        exercises = db.query(Exercise).filter(
            Exercise.user_id == user_id,
            Exercise.timestamp >= start_date
        ).order_by(Exercise.timestamp.desc()).all()
        
        if not exercises:
            return ProgressResponse(
                user_id=user_id,
                total_exercises=0,
                average_score=0.0,
                average_accuracy=0.0,
                improvement_rate=0.0,
                recent_sessions=[],
                issue_trends={}
            )
        
        # Calculate statistics
        total_exercises = len(exercises)
        average_score = sum(ex.score for ex in exercises) / total_exercises
        average_accuracy = sum(ex.accuracy for ex in exercises) / total_exercises
        
        # Calculate improvement rate (compare first half vs second half)
        if total_exercises >= 4:
            mid_point = total_exercises // 2
            first_half_avg = sum(ex.score for ex in exercises[mid_point:]) / mid_point
            second_half_avg = sum(ex.score for ex in exercises[:mid_point]) / mid_point
            improvement_rate = ((second_half_avg - first_half_avg) / first_half_avg) * 100 if first_half_avg > 0 else 0.0
        else:
            improvement_rate = 0.0
        
        # Get recent sessions
        recent_sessions_data = db.query(Session).filter(
            Session.user_id == user_id
        ).order_by(Session.created_at.desc()).limit(10).all()
        
        recent_sessions = []
        for session in recent_sessions_data:
            session_exercises = [ex for ex in exercises if ex.session_id == session.session_id]
            if session_exercises:
                recent_sessions.append({
                    "session_id": session.session_id,
                    "date": session.created_at.isoformat(),
                    "exercises_count": len(session_exercises),
                    "average_score": sum(ex.score for ex in session_exercises) / len(session_exercises)
                })
        
        # Issue trends
        issue_trends = {}
        for exercise in exercises:
            for issue in exercise.issues:
                issue_trends[issue] = issue_trends.get(issue, 0) + 1
        
        return ProgressResponse(
            user_id=user_id,
            total_exercises=total_exercises,
            average_score=round(average_score, 2),
            average_accuracy=round(average_accuracy, 2),
            improvement_rate=round(improvement_rate, 2),
            recent_sessions=recent_sessions,
            issue_trends=issue_trends
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting progress: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Text-to-speech endpoint
@app.post("/api/tts")
async def text_to_speech(text: str, background_tasks: BackgroundTasks):
    """Convert text to speech"""
    try:
        modules = get_modules()
        
        # Generate unique filename
        audio_id = str(uuid.uuid4())
        output_path = AUDIO_DIR / f"tts_{audio_id}.wav"
        
        # Generate speech (assuming TTS module can save to file)
        # If TTS module only speaks, you'll need to modify it to return audio data
        modules['tts'].speak(text)
        
        # Note: This is a placeholder. You'll need to implement actual file generation
        # based on your TTS module's capabilities
        
        return {
            "message": "Text-to-speech generated",
            "text": text,
            "audio_url": f"/api/audio/tts/{audio_id}"
        }
    except Exception as e:
        logger.error(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")

# Statistics endpoint
@app.get("/api/stats/global")
async def get_global_stats(db: Session = Depends(get_db)):
    """Get global platform statistics"""
    try:
        total_users = db.query(User).count()
        total_sessions = db.query(Session).count()
        total_exercises = db.query(Exercise).count()
        
        # Calculate average scores
        exercises = db.query(Exercise).all()
        avg_score = sum(ex.score for ex in exercises) / len(exercises) if exercises else 0
        avg_accuracy = sum(ex.accuracy for ex in exercises) / len(exercises) if exercises else 0
        
        return {
            "total_users": total_users,
            "total_sessions": total_sessions,
            "total_exercises": total_exercises,
            "average_score": round(avg_score, 2),
            "average_accuracy": round(avg_accuracy, 2)
        }
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Export data
@app.get("/api/export/{user_id}")
async def export_user_data(user_id: str, db: Session = Depends(get_db)):
    """Export all user data as JSON"""
    try:
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        exercises = db.query(Exercise).filter(Exercise.user_id == user_id).all()
        sessions = db.query(Session).filter(Session.user_id == user_id).all()
        
        export_data = {
            "user": {
                "user_id": user.user_id,
                "name": user.name,
                "created_at": user.created_at.isoformat()
            },
            "sessions": [
                {
                    "session_id": s.session_id,
                    "created_at": s.created_at.isoformat(),
                    "completed_at": s.completed_at.isoformat() if s.completed_at else None
                }
                for s in sessions
            ],
            "exercises": [
                {
                    "exercise_id": ex.exercise_id,
                    "session_id": ex.session_id,
                    "exercise_text": ex.exercise_text,
                    "transcription": ex.transcription,
                    "score": ex.score,
                    "accuracy": ex.accuracy,
                    "issues": ex.issues,
                    "analysis": ex.analysis,
                    "llm_feedback": ex.llm_feedback,
                    "timestamp": ex.timestamp.isoformat()
                }
                for ex in exercises
            ]
        }
        
        return export_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)