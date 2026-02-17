import time
import logging

logger = logging.getLogger(__name__)

class TextToSpeech:
    def __init__(self):
        self.engine = None
        try:
            import pyttsx3
            self.engine = pyttsx3.init()
            
            voices = self.engine.getProperty('voices')
            for voice in voices:
                if "female" in voice.name.lower() or "zira" in voice.name.lower():
                    self.engine.setProperty('voice', voice.id)
                    break
            
            self.engine.setProperty('rate', 150)
            logger.info("TTS engine initialized successfully")
        except Exception as e:
            logger.warning(f"TTS engine not available (expected on Linux/Railway): {e}")
            self.engine = None
        
    def speak(self, text):
        """Convert text to speech and play"""
        print(f"🔊 Assistant: {text}")
        if self.engine:
            try:
                self.engine.say(text)
                self.engine.runAndWait()
                
                word_count = len(text.split())
                estimated_duration = word_count / 2.5
                time.sleep(max(1, estimated_duration * 0.3))
            except Exception as e:
                logger.warning(f"TTS playback failed: {e}")
        else:
            # TTS not available, just log
            logger.info(f"TTS (disabled): {text}")