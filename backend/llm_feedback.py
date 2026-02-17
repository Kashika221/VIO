import os
from groq import Groq
from dotenv import load_dotenv
import json

class LLMFeedbackGenerator:
    def __init__(self):
        load_dotenv()
        api_key = os.getenv("GROQ_API_KEY")
        
        if not api_key:
            raise ValueError("Missing GROQ_API_KEY")
        
        self.client = Groq(api_key=api_key)
        self.model = "llama-3.3-70b-versatile" 
        print(" LLM Feedback Generator initialized!")
    
    def generate_feedback(self, exercise_data):
        """
        Generate personalized feedback using LLM
        
        Args:
            exercise_data: dict with keys:
                - expected_text: what they should say
                - actual_text: what they said
                - accuracy_score: 0-100
                - issues: list of detected issues
                - analysis: dict with pause_ratio, speech_rate, etc.
                - previous_scores: list of past scores (optional)
        """
        
        prompt = self._build_prompt(exercise_data)
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": """You are an encouraging, professional speech therapist assistant. 
Your job is to provide constructive, positive feedback to help people improve their speech.

Guidelines:
- Be warm, supportive, and encouraging
- Focus on specific, actionable advice
- Celebrate improvements, even small ones
- Use simple language
- Keep feedback concise (2-4 sentences)
- Address the most important issue first
- End with encouragement or next steps
- Never be discouraging or harsh"""
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=200
            )
            
            feedback = response.choices[0].message.content.strip()
            return feedback
            
        except Exception as e:
            print(f" LLM Error: {e}")
            return self._fallback_feedback(exercise_data)
    
    def _build_prompt(self, data):
        """Build the prompt for the LLM"""
        
        expected = data.get("expected_text", "")
        actual = data.get("actual_text", "")
        accuracy = data.get("accuracy_score", 0)
        issues = data.get("issues", [])
        analysis = data.get("analysis", {})
        previous_scores = data.get("previous_scores", [])
        
        prompt = f"""Provide speech therapy feedback for this practice session:

EXERCISE: "{expected}"
WHAT THEY SAID: "{actual}"
ACCURACY: {accuracy:.1f}%

ANALYSIS:
- Pause ratio: {analysis.get('pause_ratio', 0):.2f} (higher = more pauses)
- Speech rate: {analysis.get('speech_rate', 0):.1f} words/second
- Repetitions: {analysis.get('repetitions', 0)}
- Issues detected: {', '.join(issues) if issues else 'None'}
"""
        
        if previous_scores:
            avg_previous = sum(previous_scores[-5:]) / len(previous_scores[-5:])
            prompt += f"\nPREVIOUS AVERAGE SCORE: {avg_previous:.1f}%"
            
            if accuracy > avg_previous:
                prompt += " (IMPROVED!)"
            elif accuracy < avg_previous - 10:
                prompt += " (declined)"
        
        prompt += "\n\nProvide encouraging, specific feedback in 2-4 sentences."
        
        return prompt
    
    def _fallback_feedback(self, data):
        """Simple rule-based fallback if LLM fails"""
        accuracy = data.get("accuracy_score", 0)
        issues = data.get("issues", [])
        
        if accuracy > 90:
            return "Excellent work! Your pronunciation is very clear. Keep practicing to maintain this level."
        elif accuracy > 75:
            return "Good job! Your speech is mostly clear. Focus on enunciating each word a bit more."
        elif "unclear_speech" in issues:
            return "I had some trouble understanding you. Try speaking a bit slower and articulating each sound carefully."
        else:
            return "Keep practicing! Focus on speaking clearly and taking your time with each word."
    
    def generate_exercise_prompt(self, issue_type, difficulty="beginner", count=3):
        """Generate custom exercise suggestions using LLM"""
        
        prompts = {
            "lisp": "exercises for practicing 's' and 'z' sounds for someone with a lisp",
            "stuttering": "exercises for reducing stuttering and improving fluency",
            "general": "general speech clarity exercises",
            "custom": "personalized speech clarity and articulation exercises"
        }
        
        prompt_type = prompts.get(issue_type, prompts["general"])
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": """You are a professional speech therapist. Generate practical, effective speech exercises.
                        
Guidelines:
- Create realistic, pronounceable phrases
- Each phrase should be 5-15 words long
- Focus on the specific speech issue
- Use varied vocabulary
- Make exercises progressively challenging
- Return ONLY the exercise phrases, one per line
- Do NOT include numbers, bullets, or explanations"""
                    },
                    {
                        "role": "user",
                        "content": f"Generate {count} {difficulty}-level {prompt_type}. Return only the phrases, one per line, no numbering or bullets."
                    }
                ],
                temperature=0.8,
                max_tokens=300
            )
            
            exercises = response.choices[0].message.content.strip().split('\n')
            # Clean up any numbering or bullets that might slip through
            exercises = [e.strip('0123456789.-) ').strip() for e in exercises if e.strip()]
            # Filter out empty lines and return requested count
            exercises = [e for e in exercises if len(e) > 10]  # Ensure meaningful phrases
            return exercises[:count]
            
        except Exception as e:
            print(f" Exercise generation failed: {e}")
            return [
                "The quick brown fox jumps over the lazy dog",
                "She sells seashells by the seashore",
                "Peter Piper picked a peck of pickled peppers"
            ]