import { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  subscribeToAuth, 
  signInWithGoogle, 
  signInWithEmail, 
  signUpWithEmail, 
  sendPhoneOTP, 
  verifyPhoneOTP, 
  setupRecaptcha,
  logOut,
  getUserProfile,
  saveExerciseResult,
  getExerciseHistory,
  getWeakAreas,
  getProgressData
} from './firebase';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Fetch user profile from Firestore
        const profileResult = await getUserProfile(firebaseUser.uid);
        if (profileResult.success) {
          setUserProfile(profileResult.data);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Google Sign In
  const loginWithGoogle = async () => {
    setError(null);
    const result = await signInWithGoogle();
    if (!result.success) {
      setError(result.error);
    }
    return result;
  };

  // Email/Password Sign Up
  const signUpEmail = async (email, password, displayName) => {
    setError(null);
    const result = await signUpWithEmail(email, password, displayName);
    if (!result.success) {
      setError(result.error);
    }
    return result;
  };

  // Email/Password Sign In
  const loginWithEmail = async (email, password) => {
    setError(null);
    const result = await signInWithEmail(email, password);
    if (!result.success) {
      setError(result.error);
    }
    return result;
  };

  // Phone OTP - Setup
  const initPhoneAuth = (containerId, isInvisible = true) => {
    return setupRecaptcha(containerId, isInvisible);
  };

  // Phone OTP - Send Code
  const sendOTP = async (phoneNumber) => {
    setError(null);
    const result = await sendPhoneOTP(phoneNumber);
    if (!result.success) {
      setError(result.error);
    }
    return result;
  };

  // Phone OTP - Verify
  const verifyOTP = async (otp) => {
    setError(null);
    const result = await verifyPhoneOTP(otp);
    if (!result.success) {
      setError(result.error);
    }
    return result;
  };

  // Sign Out
  const logout = async () => {
    const result = await logOut();
    if (result.success) {
      setUser(null);
      setUserProfile(null);
    }
    return result;
  };

  // Save exercise result
  const saveResult = async (result) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    return await saveExerciseResult(user.uid, result);
  };

  // Get exercise history
  const getHistory = async (limitCount = 20) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    return await getExerciseHistory(user.uid, limitCount);
  };

  // Get weak areas for personalized practice
  const getUserWeakAreas = async () => {
    if (!user) return { success: false, error: 'Not authenticated' };
    return await getWeakAreas(user.uid);
  };

  // Get progress data
  const getProgress = async (days = 30) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    return await getProgressData(user.uid, days);
  };

  // Refresh user profile
  const refreshProfile = async () => {
    if (!user) return;
    const profileResult = await getUserProfile(user.uid);
    if (profileResult.success) {
      setUserProfile(profileResult.data);
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    error,
    isAuthenticated: !!user,
    loginWithGoogle,
    signUpEmail,
    loginWithEmail,
    initPhoneAuth,
    sendOTP,
    verifyOTP,
    logout,
    saveResult,
    getHistory,
    getUserWeakAreas,
    getProgress,
    refreshProfile,
    clearError: () => setError(null)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
