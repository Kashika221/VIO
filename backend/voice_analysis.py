import librosa
import numpy as np
from collections import Counter
import difflib
from pydub import AudioSegment
import tempfile
import os
import re
from scipy import signal
from scipy.ndimage import gaussian_filter1d

class VoiceAnalyzer:
    def __init__(self):
        # Extended phoneme categories for comprehensive analysis
        self.lisp_phonemes = {
            's': {'frequency_range': (4000, 8000), 'expected_energy': 0.3},
            'z': {'frequency_range': (3500, 7500), 'expected_energy': 0.25},
            'sh': {'frequency_range': (2500, 6000), 'expected_energy': 0.35},
            'ch': {'frequency_range': (3000, 7000), 'expected_energy': 0.3},
            'th': {'frequency_range': (6000, 10000), 'expected_energy': 0.2},
        }
        
        # Words that commonly reveal lisp issues
        self.lisp_test_words = {
            's_initial': ['snake', 'sister', 'sun', 'say', 'some', 'see', 'sit', 'swim', 'speak', 'slowly'],
            's_medial': ['beside', 'missing', 'lesson', 'passing', 'dresser', 'mississippi'],
            's_final': ['miss', 'boss', 'kiss', 'pass', 'class', 'this', 'us', 'yes', 'princess'],
            'z_words': ['zipper', 'zoo', 'zero', 'buzz', 'fizz', 'jazz', 'freeze', 'please'],
            'th_words': ['think', 'three', 'through', 'throw', 'thread', 'thing', 'thank', 'thick'],
            'sh_words': ['she', 'ship', 'shoe', 'shop', 'wish', 'fish', 'brush', 'push', 'shiny'],
            'ch_words': ['chair', 'check', 'child', 'chance', 'watch', 'catch', 'much', 'rich'],
            'blend_words': ['street', 'splash', 'string', 'square', 'school', 'scratch', 'spring']
        }
        
        # Stuttering patterns
        self.stuttering_patterns = {
            'sound_repetition': r'\b(\w)\1{2,}',  # e.g., "sssnake"
            'syllable_repetition': r'\b(\w{1,3})-\1',  # e.g., "ba-ba-ball"
            'word_repetition': r'\b(\w+)\s+\1\b',  # e.g., "the the"
            'prolongation_markers': ['um', 'uh', 'er', 'ah', 'hmm'],
            'blocking_indicators': ['...', '—', '–']
        }
        
        # Articulation reference data
        self.articulation_norms = {
            'speech_rate': {'min': 2.5, 'ideal': 4.0, 'max': 6.0},  # words per second
            'pause_ratio': {'ideal': 0.15, 'max': 0.35},
            'pitch_variation': {'min': 20, 'ideal': 50, 'max': 100}  # Hz
        }
    
    def convert_audio_format(self, audio_file):
        """Convert audio file to a format compatible with librosa"""
        try:
            audio = AudioSegment.from_file(audio_file)
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
            audio.export(temp_file.name, format="wav", parameters=["-ar", "16000", "-ac", "1"])
            return temp_file.name
        except Exception as e:
            print(f"Warning: Could not convert audio format: {e}")
            return audio_file
    
    def _normalize_text(self, text):
        """Normalize text for comparison - remove punctuation, lowercase, etc."""
        text = re.sub(r'[^\w\s]', '', text.lower())
        words = [w.strip() for w in text.split() if w.strip()]
        return words
    
    def _calculate_word_accuracy(self, actual_text, expected_text):
        """Calculate word-level accuracy using strict matching."""
        actual_words = self._normalize_text(actual_text)
        expected_words = self._normalize_text(expected_text)
        
        if not expected_words:
            return 0.0
        if not actual_words:
            return 0.0
        
        matched_words = 0
        used_actual = set()
        
        for i, expected_word in enumerate(expected_words):
            best_ratio = 0.0
            best_idx = -1
            
            for j, actual_word in enumerate(actual_words):
                if j in used_actual:
                    continue
                
                ratio = difflib.SequenceMatcher(None, expected_word, actual_word).ratio()
                position_bonus = 0.1 if abs(i - j) <= 2 else 0
                adjusted_ratio = ratio + position_bonus
                
                if adjusted_ratio > best_ratio:
                    best_ratio = adjusted_ratio
                    best_idx = j
            
            if best_ratio >= 0.7:
                matched_words += min(1.0, best_ratio)
                if best_idx >= 0:
                    used_actual.add(best_idx)
        
        accuracy = matched_words / len(expected_words)
        
        extra_words = len(actual_words) - len(expected_words)
        if extra_words > 2:
            penalty = min(0.2, extra_words * 0.05)
            accuracy = max(0, accuracy - penalty)
        
        missing_words = len(expected_words) - len(used_actual)
        if missing_words > 0:
            penalty = missing_words * 0.15
            accuracy = max(0, accuracy - penalty)
        
        return min(1.0, max(0.0, accuracy))
    
    def _detect_lisp_words_in_text(self, text):
        """Detect words that may reveal lisp issues in the transcription"""
        text_lower = text.lower()
        words = self._normalize_text(text_lower)
        
        detected = {
            's_words': [],
            'z_words': [],
            'th_words': [],
            'sh_words': [],
            'ch_words': [],
            'blend_words': []
        }
        
        for word in words:
            # Check for S sounds
            if 's' in word or word.startswith('c') and len(word) > 1 and word[1] in 'ei':
                detected['s_words'].append(word)
            # Check for Z sounds
            if 'z' in word or (word.endswith('s') and len(word) > 2):
                detected['z_words'].append(word)
            # Check for TH sounds
            if 'th' in word:
                detected['th_words'].append(word)
            # Check for SH sounds
            if 'sh' in word or 'ti' in word and word.endswith('ion'):
                detected['sh_words'].append(word)
            # Check for CH sounds
            if 'ch' in word or 'tch' in word:
                detected['ch_words'].append(word)
            # Check for blends
            for blend in ['st', 'sp', 'sk', 'sm', 'sn', 'sw', 'sl', 'str', 'spr', 'scr', 'squ']:
                if blend in word:
                    detected['blend_words'].append(word)
                    break
        
        return detected
        
    def analyze_audio(self, audio_file, transcription):
        """Comprehensive audio analysis for speech issues"""
        try:
            converted_file = self.convert_audio_format(audio_file)
            y, sr = librosa.load(converted_file, sr=16000)
            
            if converted_file != audio_file and os.path.exists(converted_file):
                os.unlink(converted_file)
            
            # Basic features
            mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
            spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
            spectral_bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)
            
            # Advanced pause analysis
            rms = librosa.feature.rms(y=y)[0]
            rms_smooth = gaussian_filter1d(rms, sigma=3)
            pause_threshold = np.mean(rms_smooth) * 0.15
            pauses = rms_smooth < pause_threshold
            pause_ratio = np.sum(pauses) / len(pauses)
            
            # Detect pause durations
            pause_durations = self._analyze_pause_patterns(rms_smooth, pause_threshold, sr)
            
            # Speech rate calculation
            words = transcription.get("words", [])
            text = transcription.get("text", "")
            
            if len(words) > 1:
                duration = words[-1].get("end", 0) - words[0].get("start", 0)
                speech_rate = len(words) / duration if duration > 0 else 0
            else:
                # Estimate from text if word timestamps unavailable
                word_count = len(self._normalize_text(text))
                audio_duration = len(y) / sr
                speech_rate = word_count / audio_duration if audio_duration > 0 else 0
            
            # Repetition analysis
            text_words = self._normalize_text(text)
            repetitions = self._count_repetitions(text_words)
            stuttering_patterns = self._detect_stuttering_patterns(text)
            
            # Lisp detection - comprehensive analysis
            lisp_analysis = self._comprehensive_lisp_analysis(y, sr, text)
            
            # Pitch analysis for speech naturalness
            pitch_analysis = self._analyze_pitch(y, sr)
            
            # Formant analysis (vowel quality)
            formant_analysis = self._analyze_formants(y, sr)
            
            # Voice quality metrics
            voice_quality = self._analyze_voice_quality(y, sr)
            
            return {
                "pause_ratio": float(pause_ratio),
                "pause_durations": pause_durations,
                "speech_rate": float(speech_rate),
                "repetitions": repetitions,
                "stuttering_patterns": stuttering_patterns,
                "lisp_analysis": lisp_analysis,
                "pitch_analysis": pitch_analysis,
                "formant_analysis": formant_analysis,
                "voice_quality": voice_quality,
                "mfcc_mean": float(np.mean(mfccs)),
                "spectral_centroid_mean": float(np.mean(spectral_centroid)),
                "spectral_bandwidth_mean": float(np.mean(spectral_bandwidth)),
                "duration": float(len(y) / sr),
                # Legacy compatibility
                "lisp_words": lisp_analysis.get('detected_words', []),
                "high_freq_energy": lisp_analysis.get('sibilant_energy', 0.5)
            }
            
        except Exception as e:
            print(f"Warning: Could not analyze audio file {audio_file}: {e}")
            return self._get_fallback_analysis(str(e))
    
    def _analyze_pause_patterns(self, rms, threshold, sr):
        """Analyze pause durations and patterns"""
        pauses = []
        in_pause = False
        pause_start = 0
        hop_length = 512
        
        for i, val in enumerate(rms):
            if val < threshold:
                if not in_pause:
                    in_pause = True
                    pause_start = i
            else:
                if in_pause:
                    pause_end = i
                    duration = (pause_end - pause_start) * hop_length / sr
                    if duration > 0.1:  # Only count pauses > 100ms
                        pauses.append({
                            'duration': round(duration, 3),
                            'position': round(pause_start * hop_length / sr, 3)
                        })
                    in_pause = False
        
        return {
            'count': len(pauses),
            'total_duration': sum(p['duration'] for p in pauses),
            'avg_duration': np.mean([p['duration'] for p in pauses]) if pauses else 0,
            'long_pauses': len([p for p in pauses if p['duration'] > 0.5])
        }
    
    def _comprehensive_lisp_analysis(self, y, sr, text):
        """Advanced lisp detection using multiple techniques"""
        result = {
            'likelihood': 0.0,
            'type': None,
            'affected_sounds': [],
            'sibilant_energy': 0.0,
            'detected_words': [],
            'recommendations': []
        }
        
        # 1. Spectral analysis for sibilants
        sibilant_analysis = self._analyze_sibilant_frequencies(y, sr)
        result['sibilant_energy'] = sibilant_analysis['overall_energy']
        
        # 2. Detect words with target sounds
        detected = self._detect_lisp_words_in_text(text)
        all_lisp_words = []
        for category, words in detected.items():
            all_lisp_words.extend(words)
        result['detected_words'] = list(set(all_lisp_words))[:10]  # Limit to 10
        
        # 3. Analyze frequency characteristics for lisp types
        lisp_indicators = {
            'frontal_lisp': 0,  # S sounds like TH
            'lateral_lisp': 0,  # Air escapes from sides
            'palatal_lisp': 0,  # Tongue too far back
            'dentalized': 0     # Tongue on teeth
        }
        
        # Analyze high-frequency characteristics
        stft = np.abs(librosa.stft(y))
        freqs = librosa.fft_frequencies(sr=sr)
        
        # S sound analysis (4-8 kHz)
        s_freq_mask = (freqs >= 4000) & (freqs <= 8000)
        s_energy = np.mean(stft[s_freq_mask]) if np.any(s_freq_mask) else 0
        
        # TH sound analysis (6-10 kHz) - frontal lisp indicator
        th_freq_mask = (freqs >= 6000) & (freqs <= 10000)
        th_energy = np.mean(stft[th_freq_mask]) if np.any(th_freq_mask) else 0
        
        # Lower frequency energy (lateral lisp indicator)
        low_freq_mask = (freqs >= 2000) & (freqs <= 4000)
        low_energy = np.mean(stft[low_freq_mask]) if np.any(low_freq_mask) else 0
        
        total_energy = np.mean(stft) + 1e-10
        
        # Check for frontal lisp (TH substitution for S)
        if s_energy < total_energy * 0.15 and th_energy > total_energy * 0.1:
            lisp_indicators['frontal_lisp'] += 1
            result['affected_sounds'].append('s→th (frontal lisp)')
        
        # Check for lateral lisp (slushy S sound)
        if low_energy > s_energy * 0.8 and s_energy < total_energy * 0.2:
            lisp_indicators['lateral_lisp'] += 1
            result['affected_sounds'].append('lateral S')
        
        # Check for dentalized S (tongue against teeth)
        mid_freq_mask = (freqs >= 3000) & (freqs <= 5000)
        mid_energy = np.mean(stft[mid_freq_mask]) if np.any(mid_freq_mask) else 0
        if mid_energy > s_energy * 1.2:
            lisp_indicators['dentalized'] += 1
            result['affected_sounds'].append('dentalized S')
        
        # 4. Calculate overall lisp likelihood
        has_target_words = len(all_lisp_words) > 0
        
        if has_target_words:
            # Spectral characteristics
            spectral_score = 0
            if sibilant_analysis['s_quality'] < 0.5:
                spectral_score += 0.3
            if sibilant_analysis['sh_quality'] < 0.5:
                spectral_score += 0.2
            if sibilant_analysis['energy_ratio'] < 0.3:
                spectral_score += 0.2
            
            # Indicator scores
            indicator_score = sum(lisp_indicators.values()) * 0.15
            
            result['likelihood'] = min(1.0, spectral_score + indicator_score)
            
            # Determine primary type
            max_indicator = max(lisp_indicators, key=lisp_indicators.get)
            if lisp_indicators[max_indicator] > 0:
                result['type'] = max_indicator
        
        # 5. Generate recommendations
        if result['likelihood'] > 0.3:
            result['recommendations'] = self._get_lisp_recommendations(result['type'], result['affected_sounds'])
        
        return result
    
    def _analyze_sibilant_frequencies(self, y, sr):
        """Detailed analysis of sibilant sounds"""
        stft = np.abs(librosa.stft(y))
        freqs = librosa.fft_frequencies(sr=sr)
        total_power = np.mean(stft) + 1e-10
        
        # S sound (4-8 kHz)
        s_mask = (freqs >= 4000) & (freqs <= 8000)
        s_power = np.mean(stft[s_mask]) if np.any(s_mask) else 0
        
        # SH sound (2.5-6 kHz)
        sh_mask = (freqs >= 2500) & (freqs <= 6000)
        sh_power = np.mean(stft[sh_mask]) if np.any(sh_mask) else 0
        
        # High frequency whistle (could indicate air escape)
        whistle_mask = (freqs >= 8000) & (freqs <= 12000)
        whistle_power = np.mean(stft[whistle_mask]) if np.any(whistle_mask) else 0
        
        return {
            'overall_energy': float(s_power / total_power),
            's_quality': float(s_power / (s_power + sh_power + 1e-10)),
            'sh_quality': float(sh_power / total_power),
            'energy_ratio': float((s_power + sh_power) / total_power),
            'whistle_indicator': float(whistle_power / total_power)
        }
    
    def _get_lisp_recommendations(self, lisp_type, affected_sounds):
        """Get specific recommendations based on lisp type"""
        recommendations = []
        
        if lisp_type == 'frontal_lisp':
            recommendations = [
                "Practice placing your tongue behind your front teeth, not between them",
                "Say 'EE' then add the S sound while keeping tongue behind teeth",
                "Use a mirror to ensure your tongue stays hidden when making S sounds",
                "Try the 'butterfly' technique: keep tongue tip down and sides up"
            ]
        elif lisp_type == 'lateral_lisp':
            recommendations = [
                "Focus on directing air over the center of your tongue",
                "Practice with a straw to channel airflow correctly",
                "Say 'T' then transition to 'S' to find correct tongue position",
                "Keep the sides of your tongue pressed against your upper molars"
            ]
        elif lisp_type == 'dentalized':
            recommendations = [
                "Pull your tongue slightly back from your teeth",
                "Practice making S sound with teeth slightly apart",
                "Use visual feedback with a mirror",
                "Try saying 'TS' to feel correct tongue position"
            ]
        else:
            recommendations = [
                "Practice S sounds in front of a mirror",
                "Record yourself and listen back for clarity",
                "Work on tongue exercises to improve control",
                "Practice minimal pairs: 'sun/thumb', 'sink/think'"
            ]
        
        return recommendations
    
    def _analyze_pitch(self, y, sr):
        """Analyze pitch characteristics for speech naturalness"""
        try:
            pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
            pitch_values = []
            
            for t in range(pitches.shape[1]):
                pitch = pitches[:, t]
                mag = magnitudes[:, t]
                if mag.max() > 0:
                    idx = mag.argmax()
                    if pitch[idx] > 50 and pitch[idx] < 500:  # Valid pitch range
                        pitch_values.append(pitch[idx])
            
            if pitch_values:
                return {
                    'mean': float(np.mean(pitch_values)),
                    'std': float(np.std(pitch_values)),
                    'range': float(max(pitch_values) - min(pitch_values)),
                    'variation_score': min(1.0, float(np.std(pitch_values) / 50))  # Normalized
                }
        except:
            pass
        
        return {'mean': 0, 'std': 0, 'range': 0, 'variation_score': 0.5}
    
    def _analyze_formants(self, y, sr):
        """Analyze formant frequencies for vowel quality assessment"""
        try:
            # Use LPC for formant estimation
            from scipy.signal import lfilter
            
            # Pre-emphasis
            y_preemph = np.append(y[0], y[1:] - 0.97 * y[:-1])
            
            # Frame the signal
            frame_length = int(0.025 * sr)
            hop_length = int(0.010 * sr)
            
            frames = librosa.util.frame(y_preemph, frame_length=frame_length, hop_length=hop_length)
            
            f1_values = []
            f2_values = []
            
            for frame in frames.T:
                # Apply window
                windowed = frame * np.hamming(len(frame))
                
                # LPC analysis (order 12 for formants)
                try:
                    lpc_coeffs = librosa.lpc(windowed, order=12)
                    roots = np.roots(lpc_coeffs)
                    roots = roots[np.imag(roots) >= 0]
                    
                    angles = np.arctan2(np.imag(roots), np.real(roots))
                    freqs = angles * (sr / (2 * np.pi))
                    freqs = sorted([f for f in freqs if f > 90 and f < 5000])
                    
                    if len(freqs) >= 2:
                        f1_values.append(freqs[0])
                        f2_values.append(freqs[1])
                except:
                    continue
            
            if f1_values and f2_values:
                return {
                    'f1_mean': float(np.mean(f1_values)),
                    'f2_mean': float(np.mean(f2_values)),
                    'f1_std': float(np.std(f1_values)),
                    'f2_std': float(np.std(f2_values)),
                    'vowel_clarity': min(1.0, 1 - (np.std(f1_values) + np.std(f2_values)) / 500)
                }
        except Exception as e:
            pass
        
        return {'f1_mean': 500, 'f2_mean': 1500, 'f1_std': 0, 'f2_std': 0, 'vowel_clarity': 0.7}
    
    def _analyze_voice_quality(self, y, sr):
        """Analyze overall voice quality metrics"""
        try:
            # Spectral flatness (breathiness indicator)
            flatness = librosa.feature.spectral_flatness(y=y)
            
            # Zero crossing rate (voice quality indicator)
            zcr = librosa.feature.zero_crossing_rate(y)
            
            # RMS energy variation
            rms = librosa.feature.rms(y=y)[0]
            
            return {
                'spectral_flatness': float(np.mean(flatness)),
                'zero_crossing_rate': float(np.mean(zcr)),
                'energy_stability': float(1 - np.std(rms) / (np.mean(rms) + 1e-10)),
                'breathiness_score': float(np.mean(flatness) * 2),  # Higher = more breathy
                'clarity_score': float(1 - np.mean(flatness))  # Higher = clearer
            }
        except:
            return {
                'spectral_flatness': 0.1,
                'zero_crossing_rate': 0.1,
                'energy_stability': 0.8,
                'breathiness_score': 0.2,
                'clarity_score': 0.8
            }
    
    def _count_repetitions(self, words):
        """Count word repetitions (stuttering indicator)"""
        reps = 0
        for i in range(len(words) - 1):
            if words[i] == words[i + 1]:
                reps += 1
        return reps
    
    def _detect_stuttering_patterns(self, text):
        """Detect various stuttering patterns in text"""
        patterns_found = {
            'word_repetitions': 0,
            'filler_words': 0,
            'prolongations': 0
        }
        
        text_lower = text.lower()
        
        # Word repetitions
        word_rep_pattern = r'\b(\w+)\s+\1\b'
        patterns_found['word_repetitions'] = len(re.findall(word_rep_pattern, text_lower))
        
        # Filler words
        fillers = ['um', 'uh', 'er', 'ah', 'hmm', 'like', 'you know']
        for filler in fillers:
            patterns_found['filler_words'] += text_lower.count(filler)
        
        # Sound prolongations (repeated letters)
        prolongation_pattern = r'(\w)\1{2,}'
        patterns_found['prolongations'] = len(re.findall(prolongation_pattern, text_lower))
        
        return patterns_found
    
    def _get_fallback_analysis(self, error_msg):
        """Return fallback analysis when audio processing fails"""
        return {
            "duration": 1.0,
            "pause_ratio": 0.2,
            "pause_durations": {'count': 0, 'total_duration': 0, 'avg_duration': 0, 'long_pauses': 0},
            "speech_rate": 2.5,
            "repetitions": 0,
            "stuttering_patterns": {'word_repetitions': 0, 'filler_words': 0, 'prolongations': 0},
            "lisp_analysis": {
                'likelihood': 0, 'type': None, 'affected_sounds': [],
                'sibilant_energy': 0.5, 'detected_words': [], 'recommendations': []
            },
            "pitch_analysis": {'mean': 0, 'std': 0, 'range': 0, 'variation_score': 0.5},
            "formant_analysis": {'f1_mean': 500, 'f2_mean': 1500, 'vowel_clarity': 0.7},
            "voice_quality": {'clarity_score': 0.8, 'breathiness_score': 0.2, 'energy_stability': 0.8},
            "mfcc_mean": 0.0,
            "spectral_centroid_mean": 2000,
            "spectral_bandwidth_mean": 1500,
            "lisp_words": [],
            "high_freq_energy": 0.5,
            "error": f"Audio analysis failed: {error_msg}"
        }
    
    def diagnose(self, analysis, transcription, expected_text=None):
        """Generate comprehensive diagnosis based on analysis"""
        issues = []
        feedback = []
        detailed_feedback = []
        
        # 1. ACCURACY ANALYSIS
        accuracy_score = 0.0
        if expected_text:
            actual = transcription.get("text", "")
            accuracy_score = self._calculate_word_accuracy(actual, expected_text)
            
            if accuracy_score < 0.3:
                issues.append("incorrect_content")
                feedback.append(f"It seems you said something quite different. "
                              f"Please try to match the exercise text exactly.")
                detailed_feedback.append({
                    'category': 'Accuracy',
                    'severity': 'high',
                    'message': f"Expected: '{expected_text}' | Heard: '{actual}'"
                })
            elif accuracy_score < 0.6:
                issues.append("unclear_speech")
                feedback.append("Some words were unclear. Try speaking more slowly.")
            elif accuracy_score < 0.85:
                feedback.append("Good attempt! A few words need more clarity.")
        else:
            accuracy_score = 0.5
        
        # 2. LISP ANALYSIS
        lisp_analysis = analysis.get("lisp_analysis", {})
        lisp_likelihood = lisp_analysis.get("likelihood", 0)
        
        if lisp_likelihood > 0.5:
            issues.append("lisp_detected")
            lisp_type = lisp_analysis.get("type", "general")
            affected = lisp_analysis.get("affected_sounds", [])
            
            if lisp_type == "frontal_lisp":
                feedback.append("I noticed a frontal lisp - your S sounds like TH. "
                              "Try keeping your tongue behind your teeth.")
            elif lisp_type == "lateral_lisp":
                feedback.append("I noticed a lateral lisp - air is escaping from the sides. "
                              "Focus on directing air over the center of your tongue.")
            elif lisp_type == "dentalized":
                feedback.append("Your S sound seems dentalized - tongue is too forward. "
                              "Pull it back slightly from your teeth.")
            else:
                feedback.append("I noticed some issues with sibilant sounds (S, Z, SH). "
                              "Practice tongue placement exercises.")
            
            detailed_feedback.append({
                'category': 'Lisp Detection',
                'severity': 'medium' if lisp_likelihood < 0.7 else 'high',
                'type': lisp_type,
                'affected_sounds': affected,
                'recommendations': lisp_analysis.get('recommendations', [])
            })
        elif lisp_likelihood > 0.3:
            issues.append("potential_lisp")
            feedback.append("Some S and Z sounds could be clearer. "
                          "Focus on tongue placement: behind your upper teeth.")
        
        # 3. STUTTERING/FLUENCY ANALYSIS
        pause_ratio = analysis.get("pause_ratio", 0)
        pause_info = analysis.get("pause_durations", {})
        stuttering = analysis.get("stuttering_patterns", {})
        repetitions = analysis.get("repetitions", 0)
        
        fluency_issues = []
        
        if pause_ratio > 0.4:
            issues.append("excessive_pauses")
            fluency_issues.append("many pauses")
        elif pause_ratio > 0.3:
            issues.append("moderate_pauses")
            fluency_issues.append("some hesitation")
        
        if pause_info.get("long_pauses", 0) > 2:
            fluency_issues.append(f"{pause_info['long_pauses']} long pauses")
        
        if repetitions > 2:
            issues.append("word_repetition")
            fluency_issues.append(f"{repetitions} repeated words")
        
        if stuttering.get("word_repetitions", 0) > 0:
            issues.append("stuttering_pattern")
            fluency_issues.append("word repetitions detected")
        
        if stuttering.get("filler_words", 0) > 2:
            issues.append("filler_words")
            fluency_issues.append(f"{stuttering['filler_words']} filler words")
        
        if fluency_issues:
            feedback.append(f"Fluency notes: {', '.join(fluency_issues)}. "
                          "Try breathing deeply and speaking at a comfortable pace.")
        
        # 4. SPEECH RATE ANALYSIS
        speech_rate = analysis.get("speech_rate", 0)
        if speech_rate < 1.5:
            issues.append("slow_speech")
            feedback.append("Your speech is quite slow. Try to speak more naturally.")
        elif speech_rate > 5.5:
            issues.append("fast_speech")
            feedback.append("You're speaking quite fast. Try slowing down for clarity.")
        
        # 5. VOICE QUALITY ANALYSIS
        voice_quality = analysis.get("voice_quality", {})
        if voice_quality.get("breathiness_score", 0) > 0.4:
            issues.append("breathy_voice")
            feedback.append("Your voice sounds breathy. Try supporting with more breath.")
        
        if voice_quality.get("clarity_score", 1) < 0.5:
            issues.append("unclear_voice")
            feedback.append("Voice clarity could be improved. Speak from your diaphragm.")
        
        # 6. PITCH ANALYSIS
        pitch_analysis = analysis.get("pitch_analysis", {})
        if pitch_analysis.get("variation_score", 0.5) < 0.2:
            issues.append("monotone")
            feedback.append("Try varying your pitch more for expressive speech.")
        
        # 7. CALCULATE FINAL SCORE
        # Weights: Accuracy (60%), Fluency (20%), Clarity (10%), Articulation (10%)
        
        accuracy_component = accuracy_score * 60
        
        # Fluency score
        fluency_penalty = min(20, 
            pause_ratio * 25 + 
            repetitions * 2 + 
            stuttering.get("word_repetitions", 0) * 3 +
            stuttering.get("filler_words", 0) * 1
        )
        fluency_component = max(0, 20 - fluency_penalty)
        
        # Clarity score
        clarity_score = voice_quality.get("clarity_score", 0.8)
        speech_rate_penalty = 0
        if speech_rate < 1.5 or speech_rate > 5.5:
            speech_rate_penalty = 3
        clarity_component = max(0, clarity_score * 10 - speech_rate_penalty)
        
        # Articulation score (lisp and pronunciation)
        articulation_component = 10
        if lisp_likelihood > 0.5:
            articulation_component -= 5
        elif lisp_likelihood > 0.3:
            articulation_component -= 2
        articulation_component = max(0, articulation_component)
        
        score = accuracy_component + fluency_component + clarity_component + articulation_component
        score = max(0, min(100, score))
        
        # 8. GENERATE FINAL FEEDBACK
        if not feedback:
            if score >= 90:
                feedback.append("Excellent! Your speech is very clear and accurate.")
            elif score >= 75:
                feedback.append("Good job! Keep practicing to improve further.")
            elif score >= 50:
                feedback.append("Getting there! Focus on the exercise text.")
            else:
                feedback.append("Keep practicing. Try speaking slowly and clearly.")
        
        return {
            "issues": issues,
            "feedback": feedback,
            "detailed_feedback": detailed_feedback,
            "score": round(score, 1),
            "accuracy": round(accuracy_score, 4),
            "component_scores": {
                "accuracy": round(accuracy_component, 1),
                "fluency": round(fluency_component, 1),
                "clarity": round(clarity_component, 1),
                "articulation": round(articulation_component, 1)
            },
            "lisp_analysis": {
                "likelihood": round(lisp_likelihood, 2),
                "type": lisp_analysis.get("type"),
                "recommendations": lisp_analysis.get("recommendations", [])
            },
            "suggestions": self._generate_suggestions(issues, accuracy_score, lisp_analysis)
        }
    
    def _generate_suggestions(self, issues, accuracy, lisp_analysis=None):
        """Generate specific improvement suggestions based on issues"""
        suggestions = []
        
        if accuracy < 0.5:
            suggestions.append("Focus on reading the exercise text carefully before speaking")
            suggestions.append("Speak slowly and pronounce each word clearly")
        
        if "stuttering_pattern" in issues or "excessive_pauses" in issues:
            suggestions.append("Practice deep breathing exercises before speaking")
            suggestions.append("Try to maintain a steady, comfortable rhythm")
            suggestions.append("Consider the 'easy onset' technique - start sounds gently")
        
        if "word_repetition" in issues or "filler_words" in issues:
            suggestions.append("Think about the full sentence before speaking")
            suggestions.append("Pause silently instead of using filler words")
        
        if "lisp_detected" in issues or "potential_lisp" in issues:
            if lisp_analysis:
                suggestions.extend(lisp_analysis.get("recommendations", [])[:3])
            else:
                suggestions.append("Practice 's' sounds by placing your tongue behind your front teeth")
                suggestions.append("Try tongue twisters with 's' and 'z' sounds")
                suggestions.append("Record yourself and compare to correct pronunciation")
        
        if "slow_speech" in issues:
            suggestions.append("Practice reading aloud at a slightly faster pace")
            suggestions.append("Focus on connecting words smoothly")
        
        if "fast_speech" in issues:
            suggestions.append("Practice with a metronome at a comfortable pace")
            suggestions.append("Add brief pauses between phrases")
        
        if "monotone" in issues:
            suggestions.append("Practice reading with emotion and expression")
            suggestions.append("Emphasize key words in sentences")
        
        if not suggestions:
            suggestions.append("Keep practicing to maintain your excellent performance!")
            suggestions.append("Try more challenging exercises to continue improving")
        
        return suggestions[:5]  # Return top 5 suggestions