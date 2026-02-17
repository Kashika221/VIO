import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  Lock, 
  User, 
  Phone, 
  Eye, 
  EyeOff, 
  ArrowRight,
  MessageCircle,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { 
    isAuthenticated, 
    loading: authLoading,
    error: authError,
    loginWithGoogle, 
    loginWithEmail, 
    signUpEmail,
    initPhoneAuth,
    sendOTP,
    verifyOTP,
    clearError
  } = useAuth();

  const [mode, setMode] = useState('login'); // 'login', 'signup', 'phone'
  const [phoneStep, setPhoneStep] = useState('number'); // 'number', 'otp'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    phoneNumber: '',
    otp: ''
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Initialize reCAPTCHA for phone auth
  useEffect(() => {
    if (mode === 'phone' && phoneStep === 'number') {
      // Longer delay to ensure DOM element exists after animation
      const timer = setTimeout(() => {
        try {
          // Check if container exists
          const container = document.getElementById('recaptcha-container');
          if (!container) {
            console.error('reCAPTCHA container not found in DOM');
            setError('Phone authentication setup failed. Please try a different sign-in method.');
            return;
          }

          // Clear existing verifier if any
          if (window.recaptchaVerifier) {
            try {
              window.recaptchaVerifier.clear();
            } catch (e) {
              console.log('No existing verifier to clear');
            }
          }
          
          // Initialize with invisible reCAPTCHA
          initPhoneAuth('recaptcha-container', true);
          console.log('reCAPTCHA initialized successfully');
        } catch (err) {
          console.error('reCAPTCHA init error:', err);
          setError('Unable to initialize phone authentication. Please use email or Google sign-in.');
        }
      }, 300); // Increased delay for animation

      return () => {
        clearTimeout(timer);
      };
    }
    
    // Cleanup when leaving phone mode
    if (mode !== 'phone' && window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      } catch (e) {
        console.error('Error clearing reCAPTCHA:', e);
      }
    }
  }, [mode, phoneStep, initPhoneAuth]);

  // Handle auth errors
  useEffect(() => {
    if (authError) {
      setError(authError);
      clearError();
    }
  }, [authError, clearError]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const result = await loginWithGoogle();
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Google sign-in failed');
    }
    setLoading(false);
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (mode === 'signup') {
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }
      if (!formData.displayName.trim()) {
        setError('Please enter your name');
        setLoading(false);
        return;
      }

      const result = await signUpEmail(formData.email, formData.password, formData.displayName);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Sign up failed');
      }
    } else {
      const result = await loginWithEmail(formData.email, formData.password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Login failed');
      }
    }
    setLoading(false);
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let phone = formData.phoneNumber.trim();
      
      // Validate phone number format
      if (!phone) {
        setError('Please enter a phone number');
        setLoading(false);
        return;
      }

      // Add country code if not present
      if (!phone.startsWith('+')) {
        phone = '+91' + phone; // Default to India
      }

      // Validate phone number (basic check)
      if (phone.length < 10) {
        setError('Please enter a valid phone number');
        setLoading(false);
        return;
      }

      const result = await sendOTP(phone);
      
      if (result.success) {
        setPhoneStep('otp');
        // Optional: Show success message
        console.log('OTP sent successfully to', phone);
      } else {
        setError(result.error || 'Failed to send OTP. Please try again.');
        // Reset reCAPTCHA is handled in firebase.js
      }
    } catch (err) {
      console.error('Send OTP error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const otp = formData.otp.trim();
      
      // Validate OTP
      if (!otp || otp.length !== 6) {
        setError('Please enter a valid 6-digit OTP');
        setLoading(false);
        return;
      }

      const result = await verifyOTP(otp);
      
      if (result.success) {
        // User signed in successfully
        navigate('/dashboard');
      } else {
        setError(result.error || 'Invalid OTP. Please try again.');
      }
    } catch (err) {
      console.error('Verify OTP error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setPhoneStep('number');
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      displayName: '',
      phoneNumber: '',
      otp: ''
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1343] to-[#17153B] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1343] to-[#17153B] flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl mb-4"
          >
            <MessageCircle className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">Speech Therapy</h1>
          <p className="text-slate-400">Your personal speech improvement companion</p>
        </div>

        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl">
          {/* Tabs */}
          <div className="flex bg-white/5 rounded-xl p-1 mb-6">
            {['login', 'signup', 'phone'].map((tab) => (
              <button
                key={tab}
                onClick={() => switchMode(tab)}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  mode === tab
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {tab === 'login' ? 'Login' : tab === 'signup' ? 'Sign Up' : 'Phone'}
              </button>
            ))}
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {/* Email Login/Signup Form */}
            {(mode === 'login' || mode === 'signup') && (
              <motion.form
                key={mode}
                initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === 'login' ? 20 : -20 }}
                onSubmit={handleEmailSubmit}
                className="space-y-4"
              >
                {mode === 'signup' && (
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      name="displayName"
                      placeholder="Your Name"
                      value={formData.displayName}
                      onChange={handleInputChange}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                      required
                    />
                  </div>
                )}

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    required
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-11 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {mode === 'signup' && (
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      placeholder="Confirm Password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                      required
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <>
                      {mode === 'login' ? 'Sign In' : 'Create Account'}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </motion.form>
            )}

            {/* Phone Auth Form */}
            {mode === 'phone' && (
              <motion.div
                key="phone"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {phoneStep === 'number' ? (
                  <form onSubmit={handleSendOTP} className="space-y-4">
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="tel"
                        name="phoneNumber"
                        placeholder="+91 9876543210"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                        required
                      />
                    </div>
                    <p className="text-slate-400 text-sm">
                      Enter your phone number with country code. We'll send you an OTP.
                    </p>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      ) : (
                        <>
                          Send OTP
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOTP} className="space-y-4">
                    <button
                      type="button"
                      onClick={() => setPhoneStep('number')}
                      className="flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Change Number
                    </button>
                    
                    <div className="relative">
                      <input
                        type="text"
                        name="otp"
                        placeholder="Enter 6-digit OTP"
                        value={formData.otp}
                        onChange={handleInputChange}
                        maxLength={6}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-center text-2xl tracking-widest placeholder-slate-400 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                        required
                      />
                    </div>
                    <p className="text-slate-400 text-sm text-center">
                      OTP sent to {formData.phoneNumber}
                    </p>
                    <button
                      type="submit"
                      disabled={loading || formData.otp.length !== 6}
                      className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      ) : (
                        <>
                          Verify OTP
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hidden reCAPTCHA container - Always present for phone auth */}
          {mode === 'phone' && <div id="recaptcha-container" className="h-0 overflow-hidden"></div>}

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-white/10"></div>
            <span className="text-slate-400 text-sm">or continue with</span>
            <div className="flex-1 h-px bg-white/10"></div>
          </div>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white hover:bg-slate-100 text-slate-800 font-medium py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-400 text-sm mt-6">
          By continuing, you agree to our{' '}
          <a href="#" className="text-purple-400 hover:underline">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="text-purple-400 hover:underline">Privacy Policy</a>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
