import wave
import numpy as np
import struct
import time
import logging

logger = logging.getLogger(__name__)

# PyAudio is optional - only works on systems with audio hardware
try:
    import pyaudio
    PYAUDIO_AVAILABLE = True
except ImportError:
    logger.warning("PyAudio not available - audio capture disabled (expected on Railway)")
    PYAUDIO_AVAILABLE = False
    pyaudio = None

class AudioCapture:
    def __init__(self, rate=16000, chunk=320, channels=1):
        self.rate = rate
        self.chunk = chunk
        self.channels = channels
        self.format = pyaudio.paInt16 if PYAUDIO_AVAILABLE else None
        
    def record_audio(self, duration=5, output_file="recording.wav"):
        """Record audio from microphone"""
        if not PYAUDIO_AVAILABLE:
            logger.warning("Audio capture not available - PyAudio not installed")
            return None
            
        p = pyaudio.PyAudio()
        
        stream = p.open(
            format=self.format,
            channels=self.channels,
            rate=self.rate,
            input=True,
            frames_per_buffer=self.chunk
        )
        
        print("🎤 Recording... Speak now!")
        frames = []
        
        # Record for specified duration
        num_frames = int(self.rate / self.chunk * duration)
        
        for i in range(num_frames):
            data = stream.read(self.chunk, exception_on_overflow=False)
            frames.append(data)
            print("🟢", end="", flush=True)
        
        print("\n Recording complete!")
        
        stream.stop_stream()
        stream.close()
        p.terminate()
        
        wf = wave.open(output_file, 'wb')
        wf.setnchannels(self.channels)
        wf.setsampwidth(p.get_sample_size(self.format))
        wf.setframerate(self.rate)
        wf.writeframes(b''.join(frames))
        wf.close()
        
        speech_ratio = len(speech_frames) / len(frames) if frames else 0
        
        return output_file, speech_ratio
    
    def get_audio_array(self, filename):
        """Convert wav file to numpy array"""
        with wave.open(filename, 'rb') as wf:
            data = wf.readframes(wf.getnframes())
            audio = np.frombuffer(data, dtype=np.int16)
            return audio.astype(np.float32) / 32768.0
