// Firebase configuration for Speech Therapy App
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';

// Firebase configuration - Replace with your own config from Firebase Console
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Auth providers
const googleProvider = new GoogleAuthProvider();

// ============ Authentication Functions ============

// Google Sign In
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Create/update user profile in Firestore
    await createUserProfile(user);
    
    return { success: true, user };
  } catch (error) {
    console.error('Google sign-in error:', error);
    return { success: false, error: error.message };
  }
};

// Email/Password Sign Up
export const signUpWithEmail = async (email, password, displayName) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;
    
    // Update display name
    await updateProfile(user, { displayName });
    
    // Create user profile in Firestore
    await createUserProfile(user);
    
    return { success: true, user };
  } catch (error) {
    console.error('Email sign-up error:', error);
    return { success: false, error: error.message };
  }
};

// Email/Password Sign In
export const signInWithEmail = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: result.user };
  } catch (error) {
    console.error('Email sign-in error:', error);
    return { success: false, error: error.message };
  }
};

// Phone Number Sign In - Setup reCAPTCHA
export const setupRecaptcha = (containerId, isInvisible = true) => {
  try {
    // Clear existing verifier if any
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }

    console.log('Setting up reCAPTCHA with container:', containerId);
    console.log('Auth object:', auth);
    
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      'size': isInvisible ? 'invisible' : 'normal',
      'callback': (response) => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
        console.log('reCAPTCHA verified');
      },
      'expired-callback': () => {
        // Response expired. Ask user to solve reCAPTCHA again.
        console.log('reCAPTCHA expired');
        if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
        }
      }
    });
    
    console.log('reCAPTCHA verifier created successfully');
    return window.recaptchaVerifier;
  } catch (error) {
    console.error('reCAPTCHA setup error:', error);
    throw error;
  }
};

// Send OTP to phone number
export const sendPhoneOTP = async (phoneNumber) => {
  try {
    const appVerifier = window.recaptchaVerifier;
    
    if (!appVerifier) {
      throw new Error('reCAPTCHA not initialized. Call setupRecaptcha first.');
    }

    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    
    // SMS sent. Store confirmation result for verification
    window.confirmationResult = confirmationResult;
    
    return { 
      success: true, 
      message: 'SMS sent. Please enter the verification code.',
      confirmationResult 
    };
  } catch (error) {
    console.error('Phone OTP error:', error);
    
    // Reset reCAPTCHA on error
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {
        console.error('Error clearing reCAPTCHA:', e);
      }
    }
    
    return { 
      success: false, 
      error: error.message || 'Failed to send SMS. Please try again.' 
    };
  }
};

// Verify OTP
export const verifyPhoneOTP = async (otp) => {
  try {
    const confirmationResult = window.confirmationResult;
    
    if (!confirmationResult) {
      throw new Error('No confirmation result found. Please request OTP first.');
    }
    
    // Confirm the verification code
    const result = await confirmationResult.confirm(otp);
    const user = result.user;
    
    // User signed in successfully.
    // Create user profile in Firestore
    await createUserProfile(user);
    
    // Clean up
    window.confirmationResult = null;
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
    
    return { success: true, user };
  } catch (error) {
    console.error('OTP verification error:', error);
    
    let errorMessage = 'Invalid verification code. Please try again.';
    
    if (error.code === 'auth/invalid-verification-code') {
      errorMessage = 'Invalid verification code. Please check and try again.';
    } else if (error.code === 'auth/code-expired') {
      errorMessage = 'Verification code expired. Please request a new code.';
    }
    
    return { 
      success: false, 
      error: errorMessage 
    };
  }
};

// Sign Out
export const logOut = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return { success: false, error: error.message };
  }
};

// Auth state listener
export const subscribeToAuth = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// ============ Firestore Functions ============

// Create/Update user profile
export const createUserProfile = async (user) => {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'User',
        photoURL: user.photoURL || null,
        phoneNumber: user.phoneNumber || null,
        createdAt: serverTimestamp(),
        totalSessions: 0,
        averageScore: 0,
        speechIssues: [],
        lastPractice: null
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Create user profile error:', error);
    return { success: false, error: error.message };
  }
};

// Get user profile
export const getUserProfile = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return { success: true, data: userDoc.data() };
    }
    return { success: false, error: 'User not found' };
  } catch (error) {
    console.error('Get user profile error:', error);
    return { success: false, error: error.message };
  }
};

// Save exercise result
export const saveExerciseResult = async (uid, result) => {
  try {
    const resultRef = collection(db, 'users', uid, 'exerciseResults');
    await addDoc(resultRef, {
      ...result,
      timestamp: serverTimestamp()
    });
    
    // Update user stats
    await updateUserStats(uid, result);
    
    return { success: true };
  } catch (error) {
    console.error('Save exercise result error:', error);
    return { success: false, error: error.message };
  }
};

// Update user statistics
export const updateUserStats = async (uid, result) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const newTotalSessions = (userData.totalSessions || 0) + 1;
      const currentTotal = (userData.averageScore || 0) * (userData.totalSessions || 0);
      const newAverage = (currentTotal + result.score) / newTotalSessions;
      
      // Track speech issues
      const speechIssues = userData.speechIssues || [];
      if (result.exerciseType && !speechIssues.includes(result.exerciseType)) {
        speechIssues.push(result.exerciseType);
      }
      
      await setDoc(userRef, {
        ...userData,
        totalSessions: newTotalSessions,
        averageScore: Math.round(newAverage * 10) / 10,
        speechIssues,
        lastPractice: serverTimestamp()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Update user stats error:', error);
    return { success: false, error: error.message };
  }
};

// Get user exercise history
export const getExerciseHistory = async (uid, limitCount = 20) => {
  try {
    const resultsRef = collection(db, 'users', uid, 'exerciseResults');
    const q = query(resultsRef, orderBy('timestamp', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    
    const results = [];
    snapshot.forEach((doc) => {
      results.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: results };
  } catch (error) {
    console.error('Get exercise history error:', error);
    return { success: false, error: error.message };
  }
};

// Get user's weak areas for personalized exercises
export const getWeakAreas = async (uid) => {
  try {
    const resultsRef = collection(db, 'users', uid, 'exerciseResults');
    const q = query(resultsRef, orderBy('timestamp', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    
    const areaScores = {};
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const type = data.exerciseType || 'general';
      
      if (!areaScores[type]) {
        areaScores[type] = { total: 0, count: 0 };
      }
      areaScores[type].total += data.score || 0;
      areaScores[type].count += 1;
    });
    
    // Calculate averages and find weak areas (below 70%)
    const weakAreas = [];
    for (const [type, scores] of Object.entries(areaScores)) {
      const avg = scores.total / scores.count;
      if (avg < 70) {
        weakAreas.push({ type, averageScore: Math.round(avg * 10) / 10 });
      }
    }
    
    // Sort by lowest score first
    weakAreas.sort((a, b) => a.averageScore - b.averageScore);
    
    return { success: true, data: weakAreas };
  } catch (error) {
    console.error('Get weak areas error:', error);
    return { success: false, error: error.message };
  }
};

// Get progress data for charts
export const getProgressData = async (uid, days = 30) => {
  try {
    const resultsRef = collection(db, 'users', uid, 'exerciseResults');
    const q = query(resultsRef, orderBy('timestamp', 'desc'), limit(100));
    const snapshot = await getDocs(q);
    
    const dailyScores = {};
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.timestamp) {
        const date = data.timestamp.toDate().toISOString().split('T')[0];
        
        if (!dailyScores[date]) {
          dailyScores[date] = { total: 0, count: 0 };
        }
        dailyScores[date].total += data.score || 0;
        dailyScores[date].count += 1;
      }
    });
    
    // Convert to array for charts
    const progressData = Object.entries(dailyScores)
      .map(([date, scores]) => ({
        date,
        averageScore: Math.round((scores.total / scores.count) * 10) / 10,
        sessions: scores.count
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return { success: true, data: progressData };
  } catch (error) {
    console.error('Get progress data error:', error);
    return { success: false, error: error.message };
  }
};

export { auth, db };
