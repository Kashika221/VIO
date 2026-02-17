import os
from groq import Groq
from dotenv import load_dotenv

class SpeechToText:
    def __init__(self):
        load_dotenv()
        
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            print("\n" + "="*60)
            print(" GROQ_API_KEY not found!")
            print("="*60)
            print("\n📋 Setup Instructions:")
            print("1. Go to https://console.groq.com")
            print("2. Sign up for free account")
            print("3. Create an API key")
            print("4. Create a .env file in this directory")
            print("5. Add this line: GROQ_API_KEY=your_key_here")
            print("\n" + "="*60)
            raise ValueError("Missing GROQ_API_KEY in .env file")
        
        self.client = Groq(api_key=api_key)
        print(" Groq Whisper initialized!")
    
    def transcribe(self, audio_file):
        """Transcribe audio file using Groq Whisper API"""
        try:
            with open(audio_file, "rb") as file:
                transcription = self.client.audio.transcriptions.create(
                    file=(audio_file, file.read()),
                    model="whisper-large-v3-turbo",
                    response_format="verbose_json",
                    language="en",
                    temperature=0.0
                )
            
            words = []
            if hasattr(transcription, 'words') and transcription.words:
                for word in transcription.words:
                    words.append({
                        "word": word.word,
                        "start": word.start,
                        "end": word.end
                    })
            
            return {
                "text": transcription.text,
                "words": words,
                "confidence": 0.95
            }
            
        except Exception as e:
            print(f"\n Groq API Error: {e}")
            print("💡 Possible issues:")
            print("  - Check your internet connection")
            print("  - Verify API key is correct")
            print("  - Check if you've exceeded free tier limit (14,400 sec/day)")
            return {
                "text": "",
                "words": [],
                "confidence": 0
            }