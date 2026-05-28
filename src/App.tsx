/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { 
  getFirestore, 
  initializeFirestore,
  collection, 
  addDoc, 
  setDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  orderBy,
  limit,
  getDocFromServer,
  deleteDoc,
  increment
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL 
} from 'firebase/storage';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { 
  Lightbulb, 
  Menu, 
  X, 
  Bell, 
  Search, 
  Heart, 
  CheckCircle, 
  Star, 
  User,
  Users,
  Video,
  Zap,
  MapPin,
  Camera,
  Mail, 
  Twitter, 
  Instagram, 
  Facebook,
  Linkedin, 
  Youtube,
  ArrowRight,
  ArrowUpDown,
  GraduationCap,
  MessageCircle,
  Clock,
  Layers,
  ShoppingBag,
  Download,
  Eye,
  EyeOff,
  Lock,
  ArrowLeft,
  Home,
  MessageSquare,
  CreditCard,
  Settings,
  LogOut,
  Plus,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Briefcase,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Info,
  Trash2,
  Globe,
  FileText,
  Image,
  Send,
  Upload,
  Paperclip,
  Smile,
  Sun,
  Moon,
  Building2,
  Wallet,
  Check, 
  CheckCheck,
  Target,
  Calendar,
  UserPlus,
  UserCheck,
  PlayCircle,
  Trophy,
  Award,
  Crown,
  Sparkles,
  Gift
} from 'lucide-react';
import { motion, AnimatePresence, useInView } from 'motion/react';

// --- Firebase Initialization ---
let db: any;
let auth: any;
let storage: any;

try {
  const app = initializeApp(firebaseConfig);
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, firebaseConfig.firestoreDatabaseId);
  auth = getAuth(app);
  storage = getStorage(app);
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

export { db, auth, storage };

const NIGERIAN_BANKS = [
  "Access Bank", "Citibank Nigeria", "Ecobank Nigeria", "Fidelity Bank", 
  "First Bank of Nigeria", "First City Monument Bank (FCMB)", "Guaranty Trust Bank (GTBank)", 
  "Heritage Bank", "Keystone Bank", "Stanbic IBTC Bank", "Standard Chartered Bank", 
  "Sterling Bank", "SunTrust Bank", "Union Bank of Nigeria", "United Bank for Africa (UBA)", 
  "Unity Bank", "Wema Bank", "Zenith Bank", "Kuda Bank", "OPay", "Palmpay"
];

const formatNGN = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0
  }).format(amount);
};

const KYCModal = ({ 
  isOpen, 
  onClose, 
  userId, 
  onVerified 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  userId: string,
  onVerified: () => void
}) => {
  const [nin, setNin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'input' | 'processing' | 'results'>('input');
  const [mockInfo, setMockInfo] = useState<any>(null);
  const [verificationSource, setVerificationSource] = useState<string>('');

  const handleVerify = async () => {
    if (nin.length !== 11) {
      setError('NIN must be exactly 11 digits');
      return;
    }
    
    setError('');
    setIsVerifying(true);
    setStep('processing');

    try {
      const response = await fetch('/api/verify-nin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nin, userId })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "NIN Verification failed");
      }

      const result = await response.json();
      
      setMockInfo({
        ...result.data,
        userId,
        verifiedAt: serverTimestamp()
      });
      setVerificationSource(result.source);
      setStep('results');
    } catch (err: any) {
      setError(err.message || "NIN Verification failed");
      setStep('input');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConfirm = async () => {
    if (!mockInfo) return;
    setIsVerifying(true);
    try {
      // 1. Save private KYC data
      await setDoc(doc(db, 'users', userId, 'private', 'kyc'), mockInfo);
      
      // 2. Update public profile status
      await setDoc(doc(db, 'users', userId), { 
        kycStatus: 'verified',
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      onVerified();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save verification");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 shadow-2xl">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-md" 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            <div className="p-8 sm:p-10">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-accent-dark dark:text-gray-100 tracking-tight">Identity Verification</h2>
                    <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em]">KYC Compliance Section</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {step === 'input' && (
                <div className="space-y-6">
                  <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800/30">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center flex-shrink-0">
                        <Info className="w-5 h-5" />
                      </div>
                      <p className="text-sm text-blue-700 dark:text-blue-300 font-medium leading-relaxed">
                        To maintain a trusted marketplace, we require innovators to verify their identity using their <span className="font-black">National Identification Number (NIN)</span>.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-accent-dark dark:text-gray-300 ml-1">11-Digit NIN Number</label>
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs tracking-widest z-10">NGN</div>
                      <input 
                        type="text" 
                        maxLength={11}
                        value={nin}
                        onChange={(e) => setNin(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full pl-16 pr-4 py-5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 rounded-3xl focus:bg-white dark:focus:bg-gray-750 focus:border-primary outline-none transition-all dark:text-gray-100 font-mono tracking-[0.3em] font-black text-lg"
                        placeholder="00000000000"
                      />
                    </div>
                    {error && (
                      <p className="text-xs text-rose-500 font-bold flex items-center gap-1.5 mt-1 ml-1">
                        <AlertCircle className="w-3 h-3" /> {error}
                      </p>
                    )}
                  </div>

                  <button 
                    onClick={handleVerify}
                    disabled={nin.length !== 11 || isVerifying}
                    className="w-full py-5 bg-accent-dark dark:bg-primary text-white font-black rounded-3xl shadow-xl shadow-accent-dark/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                  >
                    Verify Identity
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <p className="text-[10px] text-gray-400 text-center font-bold uppercase tracking-widest leading-relaxed">Your data is encrypted and handled according to NDPR guidelines.</p>
                </div>
              )}

              {step === 'processing' && (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                  <div className="relative w-24 h-24 mb-8">
                    <div className="absolute inset-0 border-4 border-primary/10 rounded-full" />
                    <motion.div 
                      className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <div className="absolute inset-4 bg-primary/5 rounded-full flex items-center justify-center">
                      <Globe className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-accent-dark dark:text-gray-100 mb-2">Polling Government Databases</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">Connecting to NIMC verification server. This usually takes 3-5 seconds...</p>
                </div>
              )}

              {step === 'results' && mockInfo && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="p-8 bg-emerald-50 dark:bg-emerald-900/20 rounded-[2rem] border-2 border-emerald-100 dark:border-emerald-800/30 text-center">
                    <div className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                      <CheckCircle className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">Record Found</h3>
                    <p className="text-sm text-emerald-600/70 dark:text-emerald-400/70 font-bold uppercase tracking-widest text-[10px]">Verification Successful via {verificationSource}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">First Name</p>
                      <p className="text-base font-black text-accent-dark dark:text-gray-100">{mockInfo.firstName}</p>
                    </div>
                    <div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Last Name</p>
                      <p className="text-base font-black text-accent-dark dark:text-gray-100">{mockInfo.lastName}</p>
                    </div>
                    <div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Date of Birth</p>
                      <p className="text-base font-black text-accent-dark dark:text-gray-100">{mockInfo.dob}</p>
                    </div>
                    <div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">NIN ID</p>
                      <p className="text-base font-black text-accent-dark dark:text-gray-100">••••••{mockInfo.nin.slice(-4)}</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => setStep('input')}
                      className="flex-1 py-5 bg-gray-100 dark:bg-gray-800 text-accent-dark dark:text-white font-black rounded-3xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                    >
                      Correction
                    </button>
                    <button 
                      onClick={handleConfirm}
                      disabled={isVerifying}
                      className="flex-[2] py-5 bg-primary text-white font-black rounded-3xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      Confirm Details
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const VerificationBanner = ({ onVerifyClick }: { onVerifyClick: () => void }) => {
  return (
    <motion.div 
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      className="bg-amber-500 text-white overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider">Email Not Verified</p>
            <p className="text-[10px] font-bold opacity-90">Please verify your email to unlock all features like publishing ideas.</p>
          </div>
        </div>
        <button 
          onClick={onVerifyClick}
          className="px-4 py-2 bg-white text-amber-600 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-100 transition-all whitespace-nowrap"
        >
          Check Status
        </button>
      </div>
    </motion.div>
  );
};

const getCategoryColor = (cat: string) => {
  switch (cat) {
    case 'Tech': return 'bg-cyan-100 text-cyan-800';
    case 'Agriculture': return 'bg-green-100 text-green-800';
    case 'Fashion': return 'bg-rose-100 text-rose-800';
    case 'Education': return 'bg-blue-100 text-blue-800';
    case 'Fintech': return 'bg-amber-100 text-amber-800';
    case 'Health': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// --- Google Maps Configuration ---
const GOOGLE_MAPS_API_KEY = (process.env.GOOGLE_MAPS_PLATFORM_KEY || '').trim();
const hasValidMapsKey = Boolean(GOOGLE_MAPS_API_KEY) && 
  GOOGLE_MAPS_API_KEY.length > 10 && 
  !GOOGLE_MAPS_API_KEY.includes('YOUR_') && 
  !GOOGLE_MAPS_API_KEY.includes('REPLACE');

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

enum NotificationType {
  INTEREST = 'interest',
  MESSAGE = 'message',
  CONNECTION = 'connection',
  MARKET = 'market',
  MENTORSHIP = 'mentorship',
}

async function createNotification({ 
  userId, 
  type, 
  title, 
  message, 
  link = '', 
  data = {} 
}: { 
  userId: string, 
  type: NotificationType, 
  title: string, 
  message: string, 
  link?: string, 
  data?: any 
}) {
  if (!userId || userId === auth.currentUser?.uid) return;
  
  try {
    // Check user preferences before creating notification
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const prefs = userData.notificationPreferences;
      
      // If preferences exist and the specific type is disabled, skip
      if (prefs && prefs[type] === false) {
        return;
      }
    }

    await addDoc(collection(db, 'notifications'), {
      userId,
      type,
      title,
      message,
      read: false,
      link,
      data,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection (moved to App component)

// --- Components ---

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onSuccess?: (email: string) => void;
}

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  key?: React.Key;
}

const ThemeToggle = ({ isDarkMode, toggleDarkMode }: { isDarkMode: boolean, toggleDarkMode: () => void }) => (
  <button 
    onClick={toggleDarkMode}
    className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-primary transition-all active:scale-95 flex items-center justify-center"
    title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
  >
    {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
  </button>
);

const Toast = ({ message, type, onClose }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-semibold text-sm min-w-[300px] ${
        type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
      }`}
    >
      {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <X className="w-5 h-5" />}
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  isLoading?: boolean;
}

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  isDanger = false,
  isLoading = false
}: ConfirmationModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
          >
            <div className="p-8 text-center">
              <div className={`w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center ${isDanger ? 'bg-rose-50 text-rose-500' : 'bg-primary/10 text-primary'}`}>
                {isDanger ? <AlertTriangle className="w-8 h-8" /> : <Info className="w-8 h-8" />}
              </div>
              <h3 className="text-2xl font-black text-accent-dark dark:text-gray-100 mb-2">{title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{message}</p>
            </div>
            <div className="flex p-4 gap-3 bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={onClose}
                className="flex-1 py-4 bg-white dark:bg-gray-800 text-gray-500 font-bold rounded-2xl hover:bg-gray-100 transition-all border border-gray-200 dark:border-gray-700"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={`flex-1 py-4 text-white font-bold rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                  isDanger ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20' : 'bg-primary hover:bg-primary-hover shadow-primary/20'
                }`}
              >
                {isLoading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const AuthModal = ({ isOpen, onClose, initialMode = 'login', onSuccess }: AuthModalProps) => {
  const [mode, setMode] = useState(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setError('');
    setSuccessMessage('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  }, [isOpen, initialMode]);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const getPasswordStrength = () => {
    if (!password) return { label: '', color: 'bg-gray-100', width: 'w-0' };
    if (password.length < 6) return { label: 'Weak', color: 'bg-rose-500', width: 'w-1/3' };
    if (password.length < 10) return { label: 'Good', color: 'bg-amber-500', width: 'w-2/3' };
    return { label: 'Strong', color: 'bg-emerald-500', width: 'w-full' };
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if profile exists
      const profileDoc = await getDoc(doc(db, 'users', user.uid));
      if (!profileDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          name: user.displayName || user.email?.split('@')[0] || 'Innovator',
          email: user.email,
          avatar: user.photoURL,
          createdAt: serverTimestamp(),
          about: 'New innovator on IdeaConnect NG',
          address: 'Nigeria'
        });
      }
      
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google");
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        onClose();
      } else if (mode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setSuccessMessage('Password reset link sent to your email!');
        // Reset email after success
        setEmail('');
      } else if (mode === 'register') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;
        
        // Send email verification
        await sendEmailVerification(newUser);
        
        // Initialize profile in Firestore
        await setDoc(doc(db, 'users', newUser.uid), {
          name: email.split('@')[0],
          email: email,
          createdAt: serverTimestamp(),
          about: 'New innovator on IdeaConnect NG',
          address: 'Nigeria'
        });

        setSuccessMessage('Account created successfully!');
        setTimeout(() => onClose(), 1500);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    switch (mode) {
      case 'forgot':
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-6">
            <button onClick={() => setMode('login')} className="flex items-center gap-2 text-primary font-bold text-sm self-start hover:underline">
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </button>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Forgot Password?</h2>
              <p className="text-gray-500 text-sm">No worries! Enter your email and we'll send you a link to reset it.</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <AnimatePresence mode="wait">
                {successMessage && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm font-medium rounded-2xl flex items-start gap-3 shadow-sm"
                  >
                    <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{successMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {!successMessage && (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-accent-dark dark:text-gray-300 ml-1">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:bg-white dark:focus:bg-gray-700 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all dark:text-gray-200"
                      />
                    </div>
                  </div>
                  <button 
                    disabled={isLoading}
                    className="w-full py-4 bg-primary text-white font-heading font-bold rounded-2xl transition-all hover:bg-primary-hover shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLoading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Send Reset Link'}
                  </button>
                </>
              )}
            </form>
          </motion.div>
        );
      
      default:
        return (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ 
              opacity: 1,
              x: isShaking ? [0, -10, 10, -10, 10, 0] : 0
            }} 
            transition={{ duration: 0.4, type: "tween" }}
            className="flex flex-col gap-6"
          >
            <div className="text-center">
              <h2 className="text-3xl font-bold text-accent-dark dark:text-gray-100 mb-2">{mode === 'login' ? 'Welcome Back' : 'Join IdeaConnect'}</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                {mode === 'login' 
                  ? 'Access your dashboard and manage your innovation portfolio.' 
                  : 'Start showcasing your skills and trading ideas with 12k+ others.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium rounded-2xl flex items-start gap-3 shadow-sm"
                  >
                    <div className="w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">!</div>
                    <span>{error}</span>
                  </motion.div>
                )}
                {successMessage && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm font-medium rounded-2xl flex items-start gap-3 shadow-sm"
                  >
                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{successMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-accent-dark dark:text-gray-200 ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-950 dark:text-white rounded-2xl focus:bg-white dark:focus:bg-gray-750 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 font-medium"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-sm font-bold text-accent-dark dark:text-gray-200">Password</label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => setMode('forgot')} className="text-xs font-bold text-primary hover:underline">
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-12 pr-12 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-950 dark:text-white rounded-2xl focus:bg-white dark:focus:bg-gray-750 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 font-medium"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-accent-dark dark:hover:text-gray-250 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {mode === 'register' && password && (
                  <div className="mt-1 px-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Security Level</span>
                      <span className={`text-[10px] font-bold ${getPasswordStrength().color.replace('bg-', 'text-')}`}>
                        {getPasswordStrength().label}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: getPasswordStrength().width }}
                        className={`h-full transition-all duration-500 ${getPasswordStrength().color}`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {mode === 'register' && (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-accent-dark dark:text-gray-200 ml-1">Confirm Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Retype your password"
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-950 dark:text-white rounded-2xl focus:bg-white dark:focus:bg-gray-750 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 font-medium"
                      />
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 dark:bg-gray-800/30 dark:border-gray-800">
                    <input type="checkbox" id="terms" required className="mt-1 w-4 h-4 accent-primary cursor-pointer" />
                    <label htmlFor="terms" className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed cursor-pointer">
                      I agree to IdeaConnect NG's <a href="#" className="text-primary font-bold hover:underline">Terms of Service</a> and confirm I am over 18 years of age.
                    </label>
                  </div>
                </>
              )}

              <button 
                disabled={isLoading}
                className="w-full py-4 bg-primary text-white font-heading font-black rounded-2xl transition-all hover:bg-primary-hover shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Log In' : 'Create Secure Account'}</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100 dark:border-gray-800"></div></div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-400"><span className="bg-white dark:bg-gray-900 px-4">Social Login</span></div>
            </div>

            <button 
              onClick={handleGoogleLogin}
              className="w-full py-3.5 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-bold text-accent-dark dark:text-gray-200 flex items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="text-center pt-2">
              <p className="text-sm text-gray-500 font-medium">
                {mode === 'login' ? "New to the platform?" : "Already have an account?"} {' '}
                <button 
                  onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                  className="text-primary font-black hover:underline underline-offset-4"
                >
                  {mode === 'login' ? 'Join Free Today' : 'Sign In Instead'}
                </button>
              </p>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-accent-dark/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl overflow-hidden transition-colors"
          >
            <button onClick={onClose} className="absolute top-8 right-8 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10 text-gray-400 hover:text-accent-dark dark:hover:text-gray-200">
              <X className="w-5 h-5" />
            </button>
            <div className="p-10 sm:p-12">
              {renderContent()}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

interface DashboardProps {
  user: { email: string; name: string; emailVerified: boolean; uid?: string };
  ideas: any[];
  onAddIdea: (idea: any) => void;
  onLogout: () => void;
  addToast: (message: string, type?: 'success' | 'error') => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const DashboardSidebar = ({ 
  activeTab, 
  setActiveTab, 
  onLogout, 
  isDarkMode, 
  toggleDarkMode, 
  profile,
  isOpen,
  setIsOpen,
  unreadCount = 0,
  notificationCount = 0
}: { 
  activeTab: string, 
  setActiveTab: (t: string) => void, 
  onLogout: () => void, 
  isDarkMode: boolean, 
  toggleDarkMode: () => void, 
  profile: any,
  isOpen: boolean,
  setIsOpen: (o: boolean) => void,
  unreadCount?: number,
  notificationCount?: number
}) => {
  const menuItems = [
    { id: 'dashboard', icon: Home, label: 'Overview' },
    { id: 'notifications', icon: Bell, label: 'Notifications', badge: notificationCount > 0 ? notificationCount : undefined },
    { id: 'profile', icon: User, label: 'My Public Profile' },
    { id: 'ideas', icon: Lightbulb, label: 'My Ideas' },
    { id: 'messages', icon: MessageSquare, label: 'Messages', badge: unreadCount > 0 ? unreadCount : undefined },
    { id: 'marketplace', icon: ShoppingBag, label: 'Marketplace' },
    { id: 'mentorship', icon: GraduationCap, label: 'Mentorship' },
    { id: 'wallet', icon: Wallet, label: 'Wallet & Payments' },
    { id: 'network', icon: Users, label: 'My Network' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[55] lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={`fixed left-0 top-0 h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col z-[60] transition-all duration-300 transform lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center">
          <div className="flex items-center gap-2 group cursor-pointer text-accent-dark dark:text-gray-100">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
              <Lightbulb className="text-white w-5 h-5" />
            </div>
            <span className="font-heading font-black text-xl tracking-tighter">IdeaConnect<span className="text-primary text-sm align-top">NG</span></span>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-1 mt-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsOpen(false);
              }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all group ${
              activeTab === item.id 
                ? 'bg-primary/5 dark:bg-primary/10 text-primary' 
                : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-accent-dark dark:hover:text-gray-200'
            }`}
          >
            <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeTab === item.id ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`} />
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ring-2 ring-white dark:ring-gray-900">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-50 dark:border-gray-800">
        <button 
          onClick={() => setActiveTab('profile')}
          className="flex items-center gap-3 w-full p-2 mb-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0 overflow-hidden border border-gray-100 dark:border-gray-700">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold text-primary">{profile.name.substring(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-bold text-accent-dark dark:text-gray-100 truncate">{profile.name}</p>
            <p className="text-[10px] text-gray-500 truncate">{profile.state || 'NG User'}</p>
          </div>
        </button>

        <div className="bg-primary/5 dark:bg-primary/10 rounded-2xl p-4 mb-4 relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 w-12 h-12 bg-primary/10 rounded-full group-hover:scale-150 transition-transform" />
          <p className="text-xs font-bold text-primary mb-1">PRO PLAN</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight mb-3">Get unlimited listings and priority verification.</p>
          <button className="w-full py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-hover transition-colors">Upgrade Now</button>
        </div>
        <button 
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors group"
        >
          <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  </>
);
};

const AnimateCheckmark = ({ checked }: { checked: boolean }) => (
  <div className={`relative w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors duration-500 overflow-hidden ${checked ? 'bg-primary border-primary' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
    <motion.div
      animate={checked ? { 
        scale: [1, 1.4, 1], 
        rotate: [0, 10, -10, 0],
        transition: { duration: 0.5, type: "tween" }
      } : { 
        scale: 1, 
        rotate: 0,
        transition: { type: "spring", stiffness: 300, damping: 20 }
      }}
    >
      <motion.svg
        viewBox="0 0 24 24"
        className="w-4 h-4 text-white"
        initial={false}
      >
        <motion.path
          d="M5 13l4 4L19 7"
          fill="transparent"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={checked ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 30, 
            delay: checked ? 0.1 : 0 
          }}
        />
      </motion.svg>
    </motion.div>
    
    {/* Burst Effect */}
    <AnimatePresence>
      {checked && (
        <>
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 bg-white/60 rounded-full"
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ 
                x: Math.cos((i * 45) * Math.PI / 180) * 20, 
                y: Math.sin((i * 45) * Math.PI / 180) * 20, 
                opacity: 0,
                scale: 0
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{ top: '50%', left: '50%', marginTop: '-3px', marginLeft: '-3px' }}
            />
          ))}
        </>
      )}
    </AnimatePresence>
  </div>
);

const TaskItem = ({ title, completed, reminder, onToggle, onReminder }: { title: string, completed: boolean, reminder?: string, onToggle: () => void | Promise<void>, onReminder: (e: React.MouseEvent) => void, key?: React.Key }) => {
  return (
    <div className="group flex flex-col gap-1">
      <motion.div 
        onClick={onToggle}
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
        className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all text-left cursor-pointer"
      >
        <AnimateCheckmark checked={completed} />
        <span className={`text-sm font-bold transition-all duration-500 flex-1 ${completed ? 'text-gray-400 line-through decoration-primary decoration-2 opacity-60' : 'text-accent-dark dark:text-gray-200'}`}>
          {title}
        </span>
        
        <div className="flex items-center gap-2">
          {!completed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReminder(e);
              }}
              className={`p-2 rounded-xl transition-all ${reminder ? 'bg-primary/10 text-primary' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-primary dark:hover:bg-gray-700'}`}
              title="Set Reminder"
            >
              <Bell className={`w-3.5 h-3.5 ${reminder ? 'fill-primary' : ''}`} />
            </button>
          )}

          <AnimatePresence>
            {completed && (
               <motion.div 
                 initial={{ opacity: 0, scale: 0.5 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.5 }}
                 className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase px-2 py-1 rounded-lg"
               >
                 Done
               </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      
      {reminder && !completed && (
        <motion.div 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="ml-14 flex items-center gap-1.5 text-[10px] text-primary font-bold"
        >
          <Clock className="w-3 h-3" />
          Reminder set: {reminder}
        </motion.div>
      )}
    </div>
  );
};

const ReminderModal = ({ isOpen, onClose, onSave, taskTitle, currentReminder }: { isOpen: boolean, onClose: () => void, onSave: (reminder: string) => void, taskTitle: string, currentReminder?: string }) => {
  const [reminder, setReminder] = useState(currentReminder || '');

  useEffect(() => {
    if (isOpen) setReminder(currentReminder || '');
  }, [isOpen, currentReminder]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white dark:bg-gray-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
          >
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary mx-auto mb-6 flex items-center justify-center">
                <Bell className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-accent-dark dark:text-gray-100 mb-2">Set Reminder</h3>
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-6 px-4">When should we remind you to complete "{taskTitle}"?</p>
              
              <div className="space-y-4 text-left">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 ml-4">Reminder Detail</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="e.g. Next Monday, 2pm"
                      value={reminder}
                      onChange={(e) => setReminder(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none focus:ring-2 focus:ring-primary text-sm font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex p-4 gap-3 bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={onClose}
                className="flex-1 py-4 bg-white dark:bg-gray-800 text-gray-500 font-bold rounded-2xl hover:bg-gray-100 transition-all border border-gray-200 dark:border-gray-700 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => { onSave(reminder); onClose(); }}
                className="flex-1 py-4 bg-primary text-white font-bold rounded-2xl transition-all shadow-lg shadow-primary/20 hover:bg-primary-hover text-sm"
              >
                Save
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const PublicProfileModal = ({ 
  user, 
  isOpen, 
  onClose, 
  onFollow, 
  isFollowing, 
  onConnect, 
  isConnectPending, 
  isConnected,
  onToggleSaveIdea,
  savedIdeaIds,
  allUsers,
  currentUserAcceptedIds
}: { 
  user: any, 
  isOpen: boolean, 
  onClose: () => void, 
  onFollow: (id: string) => void,
  isFollowing: boolean,
  onConnect: (id: string) => void,
  isConnectPending: boolean,
  isConnected: boolean,
  onToggleSaveIdea: (idea: any) => void,
  savedIdeaIds: string[],
  allUsers: any[],
  currentUserAcceptedIds: string[]
}) => {
  const [userIdeas, setUserIdeas] = useState<any[]>([]);
  const [mutualConnections, setMutualConnections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutualLoading, setIsMutualLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user?.id) {
      setIsLoading(true);
      const ideasQ = query(collection(db, 'ideas'), where('creatorId', '==', user.id), orderBy('createdAt', 'desc'), limit(10));
      getDocs(ideasQ).then(snap => {
        setUserIdeas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setIsLoading(false);
      }).catch(() => setIsLoading(false));

      // Fetch mutual connections logic
      setIsMutualLoading(true);
      const connQ1 = query(collection(db, 'connections'), where('status', '==', 'accepted'), where('fromId', '==', user.id));
      const connQ2 = query(collection(db, 'connections'), where('status', '==', 'accepted'), where('toId', '==', user.id));
      
      Promise.all([getDocs(connQ1), getDocs(connQ2)]).then(([snap1, snap2]) => {
        const userConnectionIds = [
          ...snap1.docs.map(d => d.data().toId),
          ...snap2.docs.map(d => d.data().fromId)
        ];
        
        const mutualIds = userConnectionIds.filter(id => currentUserAcceptedIds.includes(id) && id !== auth.currentUser?.uid);
        const mutuals = mutualIds.map(id => allUsers.find(u => u.id === id)).filter(Boolean);
        setMutualConnections(mutuals);
        setIsMutualLoading(false);
      }).catch(err => {
        console.error("Error fetching mutual connections:", err);
        setIsMutualLoading(false);
      });
    }
  }, [isOpen, user?.id, currentUserAcceptedIds, allUsers]);

  if (!user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-accent-dark/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="relative bg-white dark:bg-gray-900 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-y-auto custom-scrollbar border border-gray-100 dark:border-gray-800"
          >
            {/* Cover Area */}
            <div className="h-40 bg-gradient-to-r from-primary to-indigo-600 relative">
              <button 
                onClick={onClose} 
                className="absolute top-6 right-6 p-2 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/40 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-8 pb-12 -mt-20">
              <div className="flex flex-col md:flex-row items-end gap-6 mb-8">
                <div className="w-40 h-40 rounded-[2.5rem] bg-secondary overflow-hidden border-8 border-white dark:border-gray-900 shadow-2xl relative">
                  {user.avatar ? (
                    <img src={user.avatar} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl font-black text-primary bg-white dark:bg-gray-800">
                      {user.name?.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  {user.isVerified && (
                    <div className="absolute bottom-2 right-2 bg-emerald-500 text-white p-1 rounded-lg">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 pb-2">
                  <h2 className="text-3xl font-black text-accent-dark dark:text-white mb-2">{user.name}</h2>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                    <span className="flex items-center gap-1 font-medium">
                      <MapPin className="w-4 h-4 text-primary" />
                      {user.state || 'Innovator'}
                    </span>
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                    <span className="flex items-center gap-1 font-medium bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-black">
                      <Zap className="w-3.5 h-3.5" />
                      {user.isMentor ? 'Expert Mentor' : 'Visionary Innovator'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pb-2">
                  <button 
                    onClick={() => onFollow(user.id)}
                    className={`px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all ${
                      isFollowing 
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-rose-50 hover:text-rose-600' 
                        : 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20'
                    }`}
                  >
                    {isFollowing ? (
                      <>Following</>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Follow
                      </>
                    )}
                  </button>

                  {!isConnected && (
                    <button 
                      disabled={isConnectPending}
                      onClick={() => onConnect(user.id)}
                      className={`px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all border-2 ${
                        isConnectPending 
                          ? 'border-amber-100 bg-amber-50 text-amber-600'
                          : 'border-primary/20 text-primary hover:bg-primary/5'
                      }`}
                    >
                      {isConnectPending ? 'Request Sent' : 'Connect'}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-3xl p-6">
                    <h3 className="font-bold text-accent-dark dark:text-white mb-4">Bio</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {user.about || "No bio information provided yet. This innovator is busy building the next big thing!"}
                    </p>
                  </div>

                  {/* Mutual Networks section */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-3xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-accent-dark dark:text-white">Mutual Networks</h3>
                      {mutualConnections.length > 0 && (
                        <span className="text-[10px] font-black text-primary px-2 py-0.5 bg-primary/10 rounded-lg">
                          {mutualConnections.length} SHARED
                        </span>
                      )}
                    </div>
                    
                    {isMutualLoading ? (
                      <div className="flex gap-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                        ))}
                      </div>
                    ) : mutualConnections.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex -space-x-3 overflow-hidden">
                          {mutualConnections.slice(0, 5).map((mutual, idx) => (
                            <div key={mutual.id} className="inline-block h-10 w-10 rounded-full ring-2 ring-white dark:ring-gray-900 overflow-hidden bg-secondary">
                              {mutual.avatar ? (
                                <img src={mutual.avatar} alt={mutual.name} className="w-full h-full object-cover" title={mutual.name} />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary" title={mutual.name}>
                                  {mutual.name?.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                            </div>
                          ))}
                          {mutualConnections.length > 5 && (
                            <div className="inline-block h-10 w-10 rounded-full ring-2 ring-white dark:ring-gray-900 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-gray-500">+{mutualConnections.length - 5}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 leading-snug">
                          You and <span className="font-bold text-accent-dark dark:text-gray-200">{user.name}</span> have {mutualConnections.length} mutual connection{mutualConnections.length !== 1 ? 's' : ''}, including {mutualConnections[0].name}.
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-gray-400">
                        <Users className="w-5 h-5 opacity-50" />
                        <p className="text-[10px] italic">No mutual networks yet. Connect to build trust!</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-3xl p-6">
                    <h3 className="font-bold text-accent-dark dark:text-white mb-4">Social Presence</h3>
                    <div className="flex gap-3">
                      {user.twitter && (
                         <a href={`https://twitter.com/${user.twitter}`} target="_blank" rel="noreferrer" className="w-10 h-10 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center text-gray-500 hover:text-primary transition-all shadow-sm">
                           <Twitter className="w-4 h-4" />
                         </a>
                      )}
                      {user.linkedin && (
                         <a href={user.linkedin} target="_blank" rel="noreferrer" className="w-10 h-10 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center text-gray-500 hover:text-primary transition-all shadow-sm">
                           <Linkedin className="w-4 h-4" />
                         </a>
                      )}
                      {user.instagram && (
                         <a href={`https://instagram.com/${user.instagram}`} target="_blank" rel="noreferrer" className="w-10 h-10 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center text-gray-500 hover:text-primary transition-all shadow-sm">
                           <Instagram className="w-4 h-4" />
                         </a>
                      )}
                      {(!user.twitter && !user.linkedin && !user.instagram) && (
                        <p className="text-[10px] text-gray-400 italic">No social links provided.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-accent-dark dark:text-white">Active Concepts</h3>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{userIdeas.length} Concepts</span>
                  </div>

                  {isLoading ? (
                    <div className="flex justify-center py-10">
                      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    </div>
                  ) : userIdeas.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userIdeas.map(idea => (
                        <div key={idea.id} className="relative p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all group">
                          <button 
                            onClick={(e) => { e.stopPropagation(); onToggleSaveIdea(idea); }}
                            className={`absolute top-4 right-4 p-2 rounded-xl transition-all ${savedIdeaIds.includes(idea.id) ? 'bg-rose-50 text-rose-500' : 'bg-gray-50 text-gray-400 opacity-0 group-hover:opacity-100'}`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${savedIdeaIds.includes(idea.id) ? 'fill-rose-500' : ''}`} />
                          </button>
                          <div className="flex justify-between items-start mb-3">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${getCategoryColor(idea.category)}`}>
                              {idea.category}
                            </span>
                            <p className="text-[10px] font-black text-primary pr-8">₦{idea.price}</p>
                          </div>
                          <h4 className="font-bold text-accent-dark dark:text-white mb-2 group-hover:text-primary transition-colors text-sm truncate">{idea.title}</h4>
                          <p className="text-[10px] text-gray-500 line-clamp-2">{idea.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-800/30 rounded-3xl py-12 text-center border-2 border-dashed border-gray-100 dark:border-gray-800">
                      <Lightbulb className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-xs text-gray-400">No published concepts found for this innovator.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const DashboardStatCard = ({ label, value, trend, icon: Icon, color }: any) => (
  <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-2xl ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${trend > 0 ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600'}`}>
        {trend > 0 ? '+' : ''}{trend}%
      </span>
    </div>
    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{label}</p>
    <p className="text-2xl font-bold text-accent-dark dark:text-white">{value}</p>
  </div>
);

const ProfileView = ({ 
  profile, 
  completenessScore, 
  userIdeas, 
  acceptedConnections,
  addToast,
  onUpdateProfile
}: { 
  profile: any, 
  completenessScore: number, 
  userIdeas: any[], 
  acceptedConnections: any[],
  addToast: (m: string, t?: 'success' | 'error') => void,
  onUpdateProfile: (p: any) => void
}) => {
  const [profileSubTab, setProfileSubTab] = useState<'profile' | 'rewards'>('profile');

  // Load user details
  const currentClaimed = useMemo(() => profile.claimedRewards || [], [profile.claimedRewards]);
  const userXp = useMemo(() => profile.xp || 100, [profile.xp]);
  
  // Calculate level
  const levelVal = Math.floor(userXp / 500) + 1;
  const currentLevelXp = userXp % 500;
  
  const levelTitle = useMemo(() => {
    if (levelVal === 1) return 'Rising Innovator ⚡';
    if (levelVal === 2) return 'Ecosystem Catalyst 🔥';
    if (levelVal === 3) return 'Visionary Architect 🏆';
    return 'Sovereign Pioneer 👑';
  }, [levelVal]);

  // Quests/Milestones setup
  const MILESTONES = useMemo(() => [
    {
      id: 'profile_full',
      title: 'Profile Perfectionist',
      description: 'Complete 100% of your account profile details to build trust.',
      requirement: 'Reach 100% Profile Completeness',
      award: 150,
      icon: ShieldCheck,
      isMet: completenessScore >= 100,
      progress: completenessScore,
      target: 100,
      suffix: '%'
    },
    {
      id: 'first_concept',
      title: 'Prototype Pioneer',
      description: 'Publish your first innovation concept on the IdeaConnect NG hub.',
      requirement: 'Publish 1 Concept',
      award: 100,
      icon: Lightbulb,
      isMet: userIdeas.length >= 1,
      progress: userIdeas.length,
      target: 1,
      suffix: ''
    },
    {
      id: 'multi_concepts',
      title: 'Visionary Architect',
      description: 'Establish a diverse conceptual portfolio by publishing 3 ideas.',
      requirement: 'Publish 3 Concepts',
      award: 350,
      icon: Crown,
      isMet: userIdeas.length >= 3,
      progress: userIdeas.length,
      target: 3,
      suffix: ''
    },
    {
      id: 'first_connection',
      title: 'Synergy Catalyst',
      description: 'Secure your first accepted networking connection request.',
      requirement: 'Make 1 Connection',
      award: 50,
      icon: Sparkles,
      isMet: acceptedConnections.length >= 1,
      progress: acceptedConnections.length,
      target: 1,
      suffix: ''
    },
    {
      id: 'multi_connections',
      title: 'Ecosystem Builder',
      description: 'Grow your network by securing 5 or more connections.',
      requirement: 'Make 5 Connections',
      award: 250,
      icon: Users,
      isMet: acceptedConnections.length >= 5,
      progress: acceptedConnections.length,
      target: 5,
      suffix: ''
    },
    {
      id: 'kyc_verified',
      title: 'Approved Partner',
      description: 'Validate your national identity KYC status successfully.',
      requirement: 'Verify Identity via KYC',
      award: 300,
      icon: CheckCircle,
      isMet: profile.kycStatus === 'verified',
      progress: profile.kycStatus === 'verified' ? 1 : 0,
      target: 1,
      suffix: ''
    },
    {
      id: 'bank_setup',
      title: 'Remit Ready',
      description: 'Link settlement bank account credentials to accept remittances.',
      requirement: 'Configure Remittance Info',
      award: 100,
      icon: CreditCard,
      isMet: !!(profile.bank && profile.accountNumber),
      progress: (profile.bank && profile.accountNumber) ? 1 : 0,
      target: 1,
      suffix: ''
    }
  ], [completenessScore, userIdeas.length, acceptedConnections.length, profile.kycStatus, profile.bank, profile.accountNumber]);

  // Unclaimed count for notification bubbles
  const unclaimedCount = useMemo(() => {
    return MILESTONES.filter(m => m.isMet && !currentClaimed.includes(m.id)).length;
  }, [MILESTONES, currentClaimed]);

  // Daily bonus calculations
  const lastDailyBonus = profile.lastDailyBonusTime || 0;
  const cooldownPeriod = 24 * 60 * 60 * 1000;
  const [now, setNow] = useState(Date.now());
  const isDailyCheckInAvailable = useMemo(() => {
    return (now - lastDailyBonus) >= cooldownPeriod;
  }, [now, lastDailyBonus]);

  const [timeRemainingStr, setTimeRemainingStr] = useState('');

  // Tick for countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isDailyCheckInAvailable) {
      setTimeRemainingStr('');
      return;
    }
    const timeLeft = cooldownPeriod - (now - lastDailyBonus);
    if (timeLeft <= 0) {
      setTimeRemainingStr('');
    } else {
      const h = Math.floor(timeLeft / (60 * 60 * 1000));
      const m = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
      const s = Math.floor((timeLeft % (60 * 1000)) / 1000);
      setTimeRemainingStr(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }
  }, [now, lastDailyBonus, isDailyCheckInAvailable]);

  // Handle milestone claims
  const claimMilestone = async (id: string, award: number) => {
    if (!auth.currentUser) return;
    if (currentClaimed.includes(id)) return;
    
    const updatedClaimed = [...currentClaimed, id];
    const updatedXp = (profile.xp || 100) + award;
    
    const updatedProfile = {
      ...profile,
      xp: updatedXp,
      claimedRewards: updatedClaimed
    };
    
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), updatedProfile, { merge: true });
      localStorage.setItem(`profile_${auth.currentUser.email}`, JSON.stringify(updatedProfile));
      onUpdateProfile(updatedProfile);
      addToast(`Milestone claimed! Conferred +${award} XP points! 🏆`, "success");
    } catch (error) {
      console.error("Failed to claim milestone", error);
      addToast("Failed to claim award. Please try again.", "error");
    }
  };

  // Handle Daily Check-In
  const handleClaimDailyCheckIn = async () => {
    if (!isDailyCheckInAvailable || !auth.currentUser) return;
    
    const updatedXp = (profile.xp || 100) + 50;
    const updatedProfile = {
      ...profile,
      xp: updatedXp,
      lastDailyBonusTime: Date.now()
    };
    
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), updatedProfile, { merge: true });
      localStorage.setItem(`profile_${auth.currentUser.email}`, JSON.stringify(updatedProfile));
      onUpdateProfile(updatedProfile);
      addToast("Daily check-in complete! Sparked +50 XP! ⚡", "success");
    } catch (error) {
      console.error("Check-In failed:", error);
      addToast("Failed to check in. Please try again.", "error");
    }
  };

  // Badge list maps
  const BADGES = useMemo(() => [
    {
      id: 'novice_pioneer',
      title: 'Ecosystem Pioneer',
      subtitle: 'Joined the Innovators Hub',
      icon: Sparkles,
      gradient: 'from-amber-400 to-orange-500 shadow-orange-500/20',
      isUnlocked: true,
      desc: 'Granted to all certified registered users of IdeaConnect NG.'
    },
    {
      id: 'profile_full',
      title: 'Trust Architect',
      subtitle: '100% Profile Completeness',
      icon: ShieldCheck,
      gradient: 'from-emerald-400 to-teal-500 shadow-emerald-500/20',
      isUnlocked: completenessScore >= 100,
      desc: 'Verify accountability and identity transparency with detailed records.'
    },
    {
      id: 'first_concept',
      title: 'Prototype Alchemist',
      subtitle: '1 concept published',
      icon: Lightbulb,
      gradient: 'from-blue-400 to-indigo-500 shadow-blue-500/20',
      isUnlocked: userIdeas.length >= 1,
      desc: 'Catalyzed initial vision by listing a design concept in the index.'
    },
    {
      id: 'multi_concepts',
      title: 'Visionary Monarch',
      subtitle: '3+ concepts shared',
      icon: Crown,
      gradient: 'from-violet-500 to-fuchsia-500 shadow-fuchsia-500/20',
      isUnlocked: userIdeas.length >= 3,
      desc: 'Contributed multiple scalable designs to empower regional artisans.'
    },
    {
      id: 'first_connection',
      title: 'Synergy Catalyst',
      subtitle: 'First connection made',
      icon: Users,
      gradient: 'from-pink-500 to-rose-500 shadow-rose-500/20',
      isUnlocked: acceptedConnections.length >= 1,
      desc: 'Broke isolation thresholds by securing active mentor or partner bonds.'
    },
    {
      id: 'multi_connections',
      title: 'Ecosystem Architect',
      subtitle: '5+ network partners',
      icon: Trophy,
      gradient: 'from-yellow-400 to-amber-600 shadow-yellow-600/20',
      isUnlocked: acceptedConnections.length >= 5,
      desc: 'Maintained deep, trusted lines of cross-functional industrial sync.'
    },
    {
      id: 'kyc_verified',
      title: 'Vetted Innovator',
      subtitle: 'KYC verified credentials',
      icon: CheckCircle,
      gradient: 'from-teal-400 to-cyan-500 shadow-teal-500/20',
      isUnlocked: profile.kycStatus === 'verified',
      desc: 'Authenticated by government credentials to secure legal partnerships.'
    },
    {
      id: 'bank_setup',
      title: 'Capital Catalyst',
      subtitle: 'Payout details configured',
      icon: CreditCard,
      gradient: 'from-rose-500 to-purple-600 shadow-purple-600/20',
      isUnlocked: !!(profile.bank && profile.accountNumber),
      desc: 'Empowered automatic digital USSD and bank remittance pathways.'
    }
  ], [completenessScore, userIdeas.length, acceptedConnections.length, profile.kycStatus, profile.bank, profile.accountNumber]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-8 pb-12">
      
      {/* Dynamic Sub-Tab Selector for Rewards Hub */}
      <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl max-w-sm mx-auto shadow-inner">
        <button 
          onClick={() => setProfileSubTab('profile')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${profileSubTab === 'profile' ? 'bg-white dark:bg-gray-750 text-primary dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'}`}
        >
          <User className="w-4 h-4" />
          My Profile
        </button>
        <button 
          onClick={() => setProfileSubTab('rewards')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 relative ${profileSubTab === 'rewards' ? 'bg-white dark:bg-gray-750 text-amber-500 dark:text-amber-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'}`}
        >
          <Trophy className="w-4 h-4 text-amber-500" />
          Rewards & Badges
          {unclaimedCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-2 ring-white dark:ring-gray-800">
              {unclaimedCount}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {profileSubTab === 'profile' ? (
          <motion.div 
            key="profile-details"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.15 }}
            className="space-y-8"
          >
            {/* Header Profile Card */}
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8 md:p-12 shadow-sm relative overflow-hidden transition-colors">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
              
              <div className="flex flex-col md:flex-row items-center md:items-start gap-10 relative z-10">
                <div className="relative group">
                  <div className="w-40 h-40 rounded-[2rem] bg-secondary overflow-hidden border-4 border-white dark:border-gray-800 shadow-2xl">
                    {profile.avatar ? (
                      <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl font-black text-primary">
                        {profile.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {completenessScore === 100 && (
                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-xl shadow-lg ring-4 ring-white dark:ring-gray-900 animate-bounce">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center md:text-left space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-3xl md:text-4xl font-black text-accent-dark dark:text-gray-100 tracking-tight">{profile.name}</h2>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-primary" />
                        {profile.street ? `${profile.street}, ` : ''}{profile.lga}, {profile.state}
                      </span>
                      <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                      <div className="flex items-center gap-1.5">
                        <span className="flex items-center gap-1 uppercase font-black tracking-widest text-[10px] text-primary">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Verified Innovator
                        </span>
                        <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full">
                          Lvl {levelVal}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl font-medium">
                    {profile.about}
                  </p>

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <Users className="w-4 h-4 text-primary" />
                      <span className="text-sm font-black text-accent-dark dark:text-gray-200">{acceptedConnections.length} Connections</span>
                    </div>
                    {profile.twitter && (
                      <a href={`https://twitter.com/${profile.twitter}`} target="_blank" rel="noreferrer" className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
                        <Twitter className="w-5 h-5" />
                      </a>
                    )}
                    {profile.linkedin && (
                      <a href={profile.linkedin} target="_blank" rel="noreferrer" className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
                        <Linkedin className="w-5 h-5" />
                      </a>
                    )}
                    {profile.instagram && (
                      <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noreferrer" className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
                        <Instagram className="w-5 h-5" />
                      </a>
                    )}
                    {profile.facebook && (
                      <a href={profile.facebook} target="_blank" rel="noreferrer" className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
                        <Facebook className="w-5 h-5" />
                      </a>
                    )}
                    {profile.whatsapp && (
                      <a href={`https://wa.me/${profile.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all">
                        <MessageCircle className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Details */}
              <div className="space-y-8">
                {/* My Network Preview */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 transition-colors">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-black text-accent-dark dark:text-gray-100 flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-500" />
                      My Network
                    </h3>
                    <span className="text-xs font-bold text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg">
                      {acceptedConnections.length}
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    {acceptedConnections.length > 0 ? (
                      acceptedConnections.slice(0, 5).map((conn, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-transparent hover:border-primary/10 transition-all">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-700 flex items-center justify-center font-bold text-primary overflow-hidden border border-gray-100 dark:border-gray-600 shadow-sm">
                            {conn.otherUser.avatar ? (
                              <img src={conn.otherUser.avatar} className="w-full h-full object-cover" />
                            ) : (
                              conn.otherUser.name?.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-accent-dark dark:text-gray-200 text-xs truncate">{conn.otherUser.name}</p>
                            <p className="text-[10px] text-gray-500 truncate">{conn.otherUser.state || 'Innovator'}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-xs text-gray-400 italic">Network is empty yet</p>
                      </div>
                    )}
                    {acceptedConnections.length > 5 && (
                      <button 
                        className="w-full py-3 text-[10px] font-black text-primary uppercase tracking-widest hover:bg-primary/5 rounded-xl transition-all"
                      >
                        View All Connections
                      </button>
                    )}
                  </div>
                </div>

                {/* Trust Score */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 transition-colors">
                  <h4 className="font-bold text-accent-dark dark:text-gray-200 mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    Account Verification
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between text-xs font-black uppercase tracking-widest text-emerald-600">
                      <span>Profile Completeness</span>
                      <span>{completenessScore}%</span>
                    </div>
                    <div className="h-2 bg-emerald-100 dark:bg-emerald-950 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${completenessScore}%` }}
                        className="h-full bg-emerald-500 rounded-full"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed italic">
                      A 100% score indicates a trusted identity on the marketplace.
                    </p>
                  </div>
                </div>

                {/* Payment Status */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 transition-colors">
                  <h4 className="font-bold text-accent-dark dark:text-gray-200 mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-indigo-500" />
                    Remittance Info
                  </h4>
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-transparent">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Settlement Bank</p>
                      <p className="text-sm font-bold text-accent-dark dark:text-gray-200">{profile.bank || 'Not Configured'}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-transparent">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Account Number</p>
                      <p className="text-sm font-mono font-bold text-accent-dark dark:text-gray-200 tracking-[0.2em]">
                        {profile.accountNumber ? `****${profile.accountNumber.slice(-4)}` : '••••••••••'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Published Ideas */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-accent-dark dark:text-gray-100 flex items-center gap-2">
                    <Lightbulb className="w-6 h-6 text-primary" />
                    Published Innovation Concepts
                  </h3>
                  <span className="bg-primary/10 text-primary text-[10px] font-black px-3 py-1 rounded-full uppercase">
                    {userIdeas.length} Total
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {userIdeas.length > 0 ? (
                    userIdeas.map(idea => (
                      <div key={idea.id} className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 transition-all hover:shadow-xl hover:shadow-primary/5 group">
                        <div className="flex justify-between items-start mb-4">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${getCategoryColor(idea.category)}`}>
                            {idea.category}
                          </span>
                          <p className="text-xs font-black text-primary">₦{idea.price}</p>
                        </div>
                        <h4 className="font-bold text-accent-dark dark:text-gray-100 mb-2 group-hover:text-primary transition-colors line-clamp-1">{idea.title}</h4>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-4">{idea.description}</p>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          <Users className="w-3.5 h-3.5" />
                          <span>{Math.floor(Math.random() * 20)} Interested</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-20 bg-gray-50 dark:bg-gray-800/50 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center text-center px-10">
                      <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-[1.5rem] shadow-xl flex items-center justify-center mb-6">
                        <Zap className="w-8 h-8 text-primary" />
                      </div>
                      <h4 className="font-bold text-accent-dark dark:text-gray-100 text-lg mb-2">No Concepts Published Yet</h4>
                      <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
                        Start sharing your innovative ideas with the world and attract investors or collaborators.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="rewards-hub"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.15 }}
            className="space-y-8"
          >
            {/* Gamified Level Progress and Daily Bonus Hub */}
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8 md:p-10 shadow-sm relative overflow-hidden transition-colors">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
              
              <div className="flex flex-col lg:flex-row items-center justify-between gap-10 relative z-10">
                <div className="space-y-6 text-center lg:text-left flex-1 w-full">
                  <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                    <div className="p-4 bg-amber-500/10 text-amber-500 rounded-3xl shrink-0">
                      <Trophy className="w-10 h-10" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Innovator Reputation Rank</p>
                      <h3 className="text-2xl sm:text-3xl font-black text-accent-dark dark:text-gray-100 tracking-tight">{levelTitle}</h3>
                      <p className="text-xs text-gray-500 mt-1">Total Accumulated Capital XP: <span className="font-black text-primary text-sm">{userXp} XP</span></p>
                    </div>
                  </div>
                  
                  <div className="space-y-2.5 max-w-xl mx-auto lg:mx-0">
                    <div className="flex justify-between text-xs font-black uppercase tracking-wider text-gray-400">
                      <span>Progress to Level {levelVal + 1}</span>
                      <span>{currentLevelXp} / 500 XP</span>
                    </div>
                    <div className="h-4 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-full border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(currentLevelXp / 500) * 100}%` }}
                        className="h-full bg-gradient-to-r from-amber-500 via-primary to-indigo-600 rounded-full"
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold">
                      <span>Level {levelVal} ({500 * (levelVal - 1)} XP)</span>
                      <span className="italic">Earn {500 - currentLevelXp} XP to level up</span>
                      <span>Level {levelVal + 1} ({500 * levelVal} XP)</span>
                    </div>
                  </div>
                </div>

                {/* Daily Check-In Sub Card */}
                <div className="w-full lg:w-80 bg-gray-50/55 dark:bg-gray-800/40 rounded-[2rem] border border-gray-100/50 dark:border-gray-800/70 p-6 flex flex-col items-center justify-center text-center">
                  <div className="p-3 bg-rose-500/10 text-rose-500 dark:text-rose-400 rounded-2xl mb-3">
                    <Gift className="w-7 h-7 animate-pulse" />
                  </div>
                  <h4 className="font-black text-accent-dark dark:text-gray-100 text-sm mb-1">Daily Check-In Reward</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed mb-4">
                    Earn free points. Build check-in streaks daily to maximize ecosystem rewards!
                  </p>
                  
                  {isDailyCheckInAvailable ? (
                    <button
                      onClick={handleClaimDailyCheckIn}
                      className="w-full py-3 bg-gradient-to-r from-primary to-violet-600 hover:from-primary-dark hover:to-violet-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      CLAIM +50 XP
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-3 bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-xs font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <Clock className="w-4 h-4 animate-spin text-gray-400" />
                      Unlocked in {timeRemainingStr || '24h'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column (2-Span): Challenges / Quests */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-accent-dark dark:text-gray-100 flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Ecosystem Quests & Milestones
                  </h3>
                  <span className="text-xs font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full uppercase">
                    {MILESTONES.filter(m => m.isMet).length} / {MILESTONES.length} Done
                  </span>
                </div>

                <div className="space-y-4">
                  {MILESTONES.map((quest) => {
                    const isClaimed = currentClaimed.includes(quest.id);
                    const isUnlockable = quest.isMet && !isClaimed;
                    const IconComp = quest.icon;
                    
                    return (
                      <div 
                        key={quest.id}
                        className={`p-5 rounded-3xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${isClaimed ? 'bg-gray-50/50 dark:bg-gray-900/30 border-gray-100 dark:border-gray-850/35 opacity-75' : isUnlockable ? 'bg-white dark:bg-gray-900 border-amber-200 dark:border-amber-900/40 shadow-md shadow-amber-500/5 ring-2 ring-amber-500/10' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'}`}
                      >
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`p-3 rounded-2xl shrink-0 ${isClaimed ? 'bg-gray-100 dark:bg-gray-850 text-gray-400' : isUnlockable ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-500' : 'bg-slate-50 dark:bg-gray-850 text-slate-500 dark:text-gray-400'}`}>
                            <IconComp className="w-6 h-6" />
                          </div>
                          
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-accent-dark dark:text-gray-100 leading-snug">{quest.title}</h4>
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest ${isClaimed ? 'bg-gray-150 text-gray-400 dark:bg-gray-800' : 'bg-primary/10 text-primary'}`}>
                                +{quest.award} XP
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{quest.description}</p>
                            
                            {/* Mission Progress Indicator */}
                            <div className="pt-2 flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                              <span>Progress:</span>
                              <div className="w-24 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${isClaimed ? 'bg-gray-400' : isUnlockable ? 'bg-amber-500' : 'bg-primary'}`}
                                  style={{ width: `${Math.min((quest.progress / quest.target) * 100, 100)}%` }}
                                />
                              </div>
                              <span className={quest.isMet ? 'text-emerald-500 font-black' : 'text-gray-400'}>
                                {quest.progress}{quest.suffix} / {quest.target}{quest.suffix}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action claim button */}
                        <div className="w-full sm:w-auto shrink-0 flex items-center justify-end">
                          {isClaimed ? (
                            <span className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-xl uppercase tracking-wider">
                              <CheckCircle className="w-4 h-4" />
                              Claimed
                            </span>
                          ) : isUnlockable ? (
                            <button
                              onClick={() => claimMilestone(quest.id, quest.award)}
                              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs rounded-xl uppercase tracking-wider shadow hover:brightness-110 active:scale-95 transition-all text-center"
                            >
                              Claim Reward
                            </button>
                          ) : (
                            <span className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 font-bold text-xs rounded-xl uppercase tracking-wider">
                              <Lock className="w-3.5 h-3.5" />
                              Locked
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column (1-Span): Badges Showcase */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-black text-accent-dark dark:text-gray-100 flex items-center gap-2">
                    <Award className="w-5 h-5 text-emerald-500" />
                    Insignia Cabinet
                  </h3>
                  <p className="text-xs text-gray-400 font-medium leading-relaxed mt-1">
                    Your dynamic visual tokens. Unlocked by actual ecosystem contributions.
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 space-y-5 transition-colors">
                  <div className="grid grid-cols-2 gap-4">
                    {BADGES.map((badge) => {
                      const BIcon = badge.icon;
                      return (
                        <div 
                          key={badge.id}
                          className="group relative flex flex-col items-center justify-center text-center p-4 rounded-2xl bg-gray-50/50 dark:bg-gray-850 border border-transparent hover:border-primary/15 transition-all outline-none"
                          title={badge.desc}
                        >
                          {/* Round 3D Badge Frame */}
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center relative mb-2.5 transition-transform group-hover:scale-110 ${badge.isUnlocked ? `bg-gradient-to-br ${badge.gradient} text-white shadow-xl` : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600'}`}>
                            <BIcon className="w-6 h-6 relative z-10" />
                            
                            {!badge.isUnlocked && (
                              <div className="absolute inset-0 bg-gray-950/25 rounded-full flex items-center justify-center">
                                <Lock className="w-4 h-4 text-white/90" />
                              </div>
                            )}

                            {/* Inner ring */}
                            <div className="absolute inset-1 border-2 border-white/25 rounded-full" />
                          </div>

                          <span className={`text-[10px] font-extrabold truncate w-full ${badge.isUnlocked ? 'text-accent-dark dark:text-gray-100' : 'text-gray-400'}`}>
                            {badge.title}
                          </span>
                          <span className="text-[8px] text-gray-500 truncate w-full mt-0.5 leading-none">
                            {badge.isUnlocked ? badge.subtitle : 'Locked'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800 text-center">
                    <p className="text-[10px] text-gray-400 italic font-medium leading-relaxed">
                      💡 Hover over (or click) any badge to recall its unlocking requirements.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const PostConceptView = ({ 
  addToast, 
  onBack, 
  onAddIdea, 
  profileComplete,
  profile,
  user,
  setVerificationModalOpen,
  setKYCModalOpen
}: { 
  addToast: (m: string, t?: 'success' | 'error') => void, 
  onBack: () => void, 
  onAddIdea: (idea: any) => void, 
  profileComplete: boolean,
  profile: any,
  user: any,
  setVerificationModalOpen: (o: boolean) => void,
  setKYCModalOpen: (o: boolean) => void
}) => {
  const [formData, setFormData] = useState({ 
    title: '', 
    category: '', 
    description: '', 
    price: '',
    targetAudience: '',
    problemSolved: '',
    revenueModel: '',
    potentialImpact: ''
  });
  const [files, setFiles] = useState<{ name: string; type: string; size: string; preview?: string; raw?: File }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let fileList: FileList | null = null;
    
    if ('files' in e.target && e.target.files) {
      fileList = e.target.files;
    } else if ('dataTransfer' in e) {
      fileList = e.dataTransfer.files;
    }

    if (fileList) {
      const newFilesPromises = Array.from(fileList).map(async (file: File) => {
        const fileObj: any = {
          raw: file,
          name: file.name,
          type: file.type,
          size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
          preview: ''
        };

        if (file.type.startsWith('image/')) {
          fileObj.preview = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        }
        
        return fileObj;
      });

      const newFiles = await Promise.all(newFilesPromises);
      setFiles([...files, ...newFiles]);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileChange(e);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    if (!user?.emailVerified) {
      setVerificationModalOpen(true);
      addToast("Please verify your email to post ideas", "error");
      return;
    }

    if (profile.kycStatus !== 'verified') {
      setKYCModalOpen(true);
      addToast("Identity verification (KYC) required to post ideas", "error");
      return;
    }
    
    setIsSubmitting(true);
    setUploadProgress(0);
    
    try {
      // Upload images to Firebase Storage
      const uploadedImageUrls = await Promise.all(
        files
          .filter(f => f.type.startsWith('image/') && f.raw)
          .map(async (f, idx) => {
            let fileToUpload = f.raw!;
            
            // Compress if it's an image
            if (fileToUpload.type.startsWith('image/')) {
              try {
                const compressed = await compressImage(fileToUpload);
                fileToUpload = new File([compressed], f.name, { type: f.type });
              } catch (e) {
                console.error("Compression failed, using original", e);
              }
            }

            const storagePath = `ideas/${auth.currentUser!.uid}/${Date.now()}_${idx}_${f.name}`;
            const storageRef = ref(storage, storagePath);
            const uploadTask = await uploadBytesResumable(storageRef, fileToUpload);
            
            // Simple progress update (rough estimation)
            setUploadProgress(prev => Math.min(prev + (100 / files.length), 95));
            
            return await getDownloadURL(uploadTask.ref);
          })
      );

      const ideaData = {
        ...formData,
        price: formData.price || 'Free',
        creatorId: auth.currentUser.uid,
        creatorName: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Innovator',
        creatorAvatar: auth.currentUser.photoURL || null,
        createdAt: serverTimestamp(),
        status: 'published',
        images: uploadedImageUrls,
        image: uploadedImageUrls[0] || null // Keep singular 'image' for backward compatibility
      };

      const docRef = await addDoc(collection(db, 'ideas'), ideaData);
      const newIdea = { ...ideaData, id: docRef.id };
      setIsSubmitting(false);
      onAddIdea(newIdea);
      addToast("Your idea has been uploaded successfully! People will notify you if they're interested.", "success");
      onBack();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'ideas');
      setIsSubmitting(false);
      addToast("Failed to upload idea. Please try again.", "error");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <h2 className="text-2xl font-bold text-accent-dark dark:text-gray-100">New Innovation Concept</h2>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6 transition-colors">
            <div className="space-y-2">
              <label className="text-sm font-bold text-accent-dark dark:text-gray-300">Concept Title</label>
              <input 
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="e.g. AI-Powered Waste Sorting for Lagos"
                className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-2xl focus:bg-white dark:focus:bg-gray-700 focus:border-primary/20 focus:ring-4 focus:ring-primary/5 outline-none transition-all dark:text-gray-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-accent-dark dark:text-gray-300">Category</label>
                <select 
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-2xl focus:bg-white dark:focus:bg-gray-700 focus:border-primary/20 focus:ring-4 focus:ring-primary/5 outline-none transition-all appearance-none dark:text-gray-200"
                >
                  <option value="">Select Category</option>
                  <option value="Tech">Technology</option>
                  <option value="Agriculture">Agriculture</option>
                  <option value="Fashion">Fashion</option>
                  <option value="Fintech">FinTech</option>
                  <option value="Health">Health</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-accent-dark dark:text-gray-300">Asking Price (Optional)</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-gray-400">₦</span>
                  <input 
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    placeholder="e.g. 50,000"
                    className="w-full pl-12 pr-6 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-2xl focus:bg-white dark:focus:bg-gray-700 focus:border-primary/20 focus:ring-4 focus:ring-primary/5 outline-none transition-all dark:text-gray-200"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-bold text-accent-dark dark:text-gray-300">Strategic Details (The "Investor" View)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Target Audience</p>
                  <input 
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({...formData, targetAudience: e.target.value})}
                    placeholder="Who is this for?"
                    className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-gray-700 focus:border-primary/20 outline-none transition-all text-sm dark:text-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Problem Solved</p>
                  <input 
                    value={formData.problemSolved}
                    onChange={(e) => setFormData({...formData, problemSolved: e.target.value})}
                    placeholder="What pain point is addressed?"
                    className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-gray-700 focus:border-primary/20 outline-none transition-all text-sm dark:text-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Revenue Model</p>
                  <input 
                    value={formData.revenueModel}
                    onChange={(e) => setFormData({...formData, revenueModel: e.target.value})}
                    placeholder="How does it generate value?"
                    className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-gray-700 focus:border-primary/20 outline-none transition-all text-sm dark:text-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Potential Impact</p>
                  <input 
                    value={formData.potentialImpact}
                    onChange={(e) => setFormData({...formData, potentialImpact: e.target.value})}
                    placeholder="Scale or social growth?"
                    className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-gray-700 focus:border-primary/20 outline-none transition-all text-sm dark:text-gray-200"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-accent-dark dark:text-gray-300">Breakdown of the Idea</label>
              <textarea 
                required
                rows={6}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe how it works, the problem it solves, and its potential impact..."
                className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-2xl focus:bg-white dark:focus:bg-gray-700 focus:border-primary/20 focus:ring-4 focus:ring-primary/5 outline-none transition-all resize-none dark:text-gray-200"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
            <h3 className="font-bold text-accent-dark dark:text-gray-100 mb-4 flex items-center gap-2">
              <Paperclip className="w-5 h-5 text-primary" />
              Supporting Media & Files
            </h3>
            <div 
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all group cursor-pointer relative ${
                isDragging 
                  ? 'border-primary bg-primary/5 ring-4 ring-primary/5' 
                  : 'border-gray-100 dark:border-gray-800 hover:border-primary/30'
              }`}
            >
              <input 
                type="file" 
                multiple 
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all ${
                isDragging ? 'bg-primary text-white scale-110' : 'bg-primary/5 text-primary group-hover:scale-110'
              }`}>
                {isDragging ? <Upload className="w-8 h-8" /> : <Plus className="w-8 h-8" />}
              </div>
              <p className="text-accent-dark dark:text-gray-200 font-bold mb-1">
                {isDragging ? 'Drop files here' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-sm text-gray-400">PDF, PNG, JPG, or MP4 (Max 50MB)</p>
            </div>

            {files.length > 0 && (
              <div className="mt-6 space-y-3">
                {files.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl group transition-colors">
                    <div className="p-1 bg-white dark:bg-gray-700 rounded-lg shadow-sm w-12 h-12 flex items-center justify-center overflow-hidden shrink-0">
                      {file.type.includes('image') && file.preview ? (
                        <img src={file.preview} className="w-full h-full object-cover rounded" alt="Preview" />
                      ) : file.type.includes('image') ? (
                        <Image className="w-5 h-5 text-indigo-500" />
                      ) : file.type.includes('video') ? (
                        <Video className="w-5 h-5 text-rose-500" />
                      ) : (
                        <FileText className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-accent-dark dark:text-gray-100 truncate">{file.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{file.size}</p>
                    </div>
                    <button onClick={() => removeFile(idx)} className="p-2 text-gray-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all active:scale-95">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-primary/5 p-8 rounded-3xl border border-primary/10">
            <h3 className="font-bold text-primary mb-2">Publishing Tips</h3>
            <ul className="text-xs text-gray-600 space-y-3">
              <li className="flex gap-2">
                <span className="text-primary font-bold">•</span>
                Detailed descriptions get 3x more interest from collaborators.
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">•</span>
                Adding a video walkthrough increases credibility by 40%.
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold">•</span>
                Keep your initial concept concise and use attachments for deep dives.
              </li>
            </ul>
          </div>

          {!profileComplete && (
            <div className="bg-amber-50 dark:bg-amber-900/20 p-8 rounded-3xl border border-amber-200 dark:border-amber-800/50 space-y-4">
              <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-6 h-6" />
                <h3 className="font-bold">Profile Incomplete</h3>
              </div>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80 leading-relaxed font-medium">
                To maintain marketplace quality, you must complete your full profile (Bio, Address, and Bank Details) before publishing ideas.
              </p>
              <button 
                type="button"
                onClick={onBack}
                className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl text-xs hover:bg-amber-600 transition-colors"
              >
                Complete Profile Now
              </button>
            </div>
          )}

          <motion.button 
            type="submit"
            disabled={isSubmitting || !profileComplete}
            whileHover={!isSubmitting && profileComplete ? { scale: 1.01 } : {}}
            whileTap={!isSubmitting && profileComplete ? { scale: 0.99 } : {}}
            className="w-full py-5 md:py-6 bg-accent-dark text-white font-black rounded-3xl shadow-xl shadow-accent-dark/20 hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-50 text-sm md:text-base"
          >
            {isSubmitting ? (
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Globe className="w-5 h-5 flex-shrink-0" />
                <span>Publish to Marketplace</span>
              </>
            )}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
};

const PaymentGateway = ({ 
  isOpen, 
  onClose, 
  amount, 
  onSuccess, 
  addToast,
  idea
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  amount: number; 
  onSuccess: (method: 'card' | 'transfer') => void;
  addToast: (m: string, t?: 'success' | 'error') => void;
  idea?: any;
}) => {
  const [method, setMethod] = useState<'card' | 'transfer'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvv: '', pin: '' });
  const [selectedBank, setSelectedBank] = useState(NIGERIAN_BANKS[0]);

  const handleCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    // Simulate payment processing delay
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      onSuccess('card');
    }, 2500);
  };

  const handleTransferConfirmation = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      onSuccess('transfer');
    }, 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-accent-dark/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
      >
        {isSuccess ? (
          <div className="p-12 text-center flex flex-col items-center relative overflow-hidden">
            {/* Celebration elements */}
            <motion.div 
               animate={{ 
                 scale: [1, 1.2, 1],
                 rotate: [0, 10, -10, 0]
               }}
               transition={{ repeat: Infinity, duration: 4 }}
               className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20"
            >
              <div className="absolute top-10 right-10 w-4 h-4 bg-primary rounded-full" />
              <div className="absolute bottom-10 left-10 w-4 h-4 bg-secondary rounded-full" />
              <div className="absolute bottom-20 right-20 w-3 h-3 bg-primary rotate-45" />
            </motion.div>

            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 relative"
            >
              <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
              <CheckCircle className="w-12 h-12 text-green-500 relative z-10" />
            </motion.div>
            <h2 className="text-2xl font-black text-accent-dark dark:text-gray-100 mb-2 tracking-tight">Payment Successful!</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto leading-relaxed">
              Success! Your transaction of <span className="font-black text-primary">{formatNGN(amount)}</span> has been processed. Your wallet has been funded.
            </p>
            <button 
              onClick={() => {
                setIsSuccess(false);
                onClose();
              }}
              className="w-full py-5 bg-accent-dark dark:bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-[10px]"
            >
              Return to Dashboard
            </button>
          </div>
        ) : (
          <>
            <div className="p-6 border-bottom border-gray-50 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <div>
                <h2 className="font-bold text-accent-dark dark:text-gray-100">Secure Checkout</h2>
                <p className="text-xs text-gray-500">Transaction amount: <span className="text-primary font-bold">{formatNGN(amount)}</span></p>
              </div>
              <button 
                onClick={() => {
                  setMethod('card');
                  setIsProcessing(false);
                  setIsSuccess(false);
                  onClose();
                }} 
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {idea && (
              <div className="px-6 pt-6 flex gap-4 items-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-100 dark:border-gray-700 shadow-sm">
                  {idea.image || (idea.images && idea.images[0]) ? (
                    <img src={idea.image || idea.images[0]} className="w-full h-full object-cover" alt={idea.title} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary/40 bg-white dark:bg-gray-900">
                      <Lightbulb className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-black text-accent-dark dark:text-white truncate">{idea.title}</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">By {idea.creatorName}</p>
                </div>
              </div>
            )}

            <div className="p-6">
              <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6">
                <button 
                  onClick={() => setMethod('card')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${method === 'card' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <CreditCard className="w-4 h-4" />
                  Pay with Card
                </button>
                <button 
                  onClick={() => setMethod('transfer')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${method === 'transfer' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Building2 className="w-4 h-4" />
                  Bank Transfer
                </button>
              </div>

              {method === 'card' ? (
                <form onSubmit={handleCardPayment} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black text-gray-400">Card Number</label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input 
                        type="text" 
                        placeholder="0000 0000 0000 0000"
                        required
                        maxLength={19}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-primary/20 rounded-xl outline-none transition-all text-sm font-mono tracking-widest"
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, '');
                          val = val.match(/.{1,4}/g)?.join(' ') || val;
                          setCardData({...cardData, number: val});
                        }}
                        value={cardData.number}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-black text-gray-400">Expiry (MM/YY)</label>
                      <input 
                        type="text" 
                        placeholder="MM / YY" 
                        required
                        maxLength={5}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-primary/20 rounded-xl outline-none transition-all text-sm font-mono"
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, '');
                          if (val.length > 2) val = val.slice(0,2) + '/' + val.slice(2);
                          setCardData({...cardData, expiry: val});
                        }}
                        value={cardData.expiry}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-black text-gray-400">CVV</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input 
                          type="password" 
                          placeholder="***" 
                          required
                          maxLength={3}
                          className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-primary/20 rounded-xl outline-none transition-all text-sm font-mono"
                          value={cardData.cvv}
                          onChange={(e) => setCardData({...cardData, cvv: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-hover transition-all flex items-center justify-center gap-2 relative overflow-hidden"
                  >
                    {isProcessing ? (
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      />
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        Pay {formatNGN(amount)}
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-gray-400 text-center flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3" />
                    Your transaction is secured with 256-bit AES encryption
                  </p>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 bg-blue-50 dark:bg-primary/5 rounded-2xl border border-primary/10">
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                      Transfer exactly <span className="font-bold text-primary">{formatNGN(amount)}</span> to the account below. Your wallet will be funded automatically after verification.
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-[10px] text-gray-500 uppercase font-black">Bank Name</span>
                        <select 
                          value={selectedBank}
                          onChange={(e) => setSelectedBank(e.target.value)}
                          className="text-xs font-bold text-accent-dark dark:text-gray-200 bg-transparent border-none outline-none text-right"
                        >
                          {NIGERIAN_BANKS.map(b => (
                            <option key={b} value={b} className="dark:bg-gray-900">{b}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-[10px] text-gray-500 uppercase font-black">Account Number</span>
                        <span className="text-xs font-bold text-accent-dark dark:text-gray-200 font-mono">0123456789</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-[10px] text-gray-500 uppercase font-black">Account Name</span>
                        <span className="text-xs font-bold text-accent-dark dark:text-gray-200 uppercase">InnovateNG Settlement</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button 
                      onClick={handleTransferConfirmation}
                      disabled={isProcessing}
                      className="w-full py-4 bg-accent-dark text-white font-bold rounded-2xl shadow-xl shadow-accent-dark/20 hover:bg-black transition-all flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                         <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                      ) : "I have made the transfer"}
                    </button>
                    <button 
                      onClick={() => setMethod('card')}
                      className="w-full py-3 text-xs text-primary font-bold hover:bg-primary/5 rounded-xl transition-all"
                    >
                      Change payment method
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

const WithdrawModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  balance,
  profile,
  addToast 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSuccess: (amount: number, bankData: any) => void;
  balance: number;
  profile: any;
  addToast: (m: string, t?: 'success' | 'error') => void;
}) => {
  const [amount, setAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    bank: profile.bank || '',
    accountNumber: profile.accountNumber || '',
    accountName: profile.accountName || ''
  });

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const withdrawAmount = parseFloat(amount);
    
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      addToast("Please enter a valid amount", "error");
      return;
    }

    if (withdrawAmount > balance) {
      addToast("Insufficient balance", "error");
      return;
    }

    if (!bankDetails.bank || !bankDetails.accountNumber) {
      addToast("Please provide valid bank details", "error");
      return;
    }

    setIsProcessing(true);
    // Simulate withdrawal processing delay
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      onSuccess(withdrawAmount, bankDetails);
    }, 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-accent-dark/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
      >
        {isSuccess ? (
          <div className="p-12 text-center flex flex-col items-center relative overflow-hidden">
            {/* Celebration elements */}
            <motion.div 
               animate={{ 
                 scale: [1, 1.2, 1],
                 rotate: [0, 10, -10, 0]
               }}
               transition={{ repeat: Infinity, duration: 4 }}
               className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20"
            >
              <div className="absolute top-10 left-10 w-4 h-4 bg-primary rounded-full" />
              <div className="absolute bottom-10 right-10 w-4 h-4 bg-secondary rounded-full" />
              <div className="absolute top-20 right-20 w-3 h-3 bg-rose-500 rotate-45" />
            </motion.div>

            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6 relative"
            >
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
              <CheckCircle className="w-12 h-12 text-emerald-500 relative z-10" />
            </motion.div>
            <h2 className="text-2xl font-black text-accent-dark dark:text-gray-100 mb-2 tracking-tight">Withdrawal Initiated!</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto leading-relaxed">
              Success! Your withdrawal of <span className="font-black text-emerald-600 dark:text-emerald-400">{formatNGN(parseFloat(amount))}</span> is on its way to your bank account.
            </p>
            <div className="w-full bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 mb-8">
               <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-2">
                 <span>DESTINATION</span>
                 <span>ESTIMATED ARRIVAL</span>
               </div>
               <div className="flex justify-between text-xs font-black text-accent-dark dark:text-gray-200">
                 <span>{bankDetails.bank}</span>
                 <span><Clock className="w-3 h-3 inline mr-1" /> 5-15 Mins</span>
               </div>
            </div>
            <button 
              onClick={() => {
                setIsSuccess(false);
                onClose();
              }}
              className="w-full py-5 bg-accent-dark dark:bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-accent-dark/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-[10px]"
            >
              Return to Wallet
            </button>
          </div>
        ) : (
          <>
            <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <div>
                <h2 className="font-bold text-xl text-accent-dark dark:text-gray-100">Withdraw Funds</h2>
                <p className="text-xs text-gray-500">Fast & secure bank transfers</p>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-8">
              <form onSubmit={handleWithdraw} className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-end mb-1">
                    <label className="text-[10px] uppercase font-black text-gray-400">Withdrawal Amount</label>
                    <span className="text-[10px] font-bold text-primary">Balance: {formatNGN(balance)}</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">₦</span>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-10 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-primary/20 rounded-2xl outline-none transition-all text-lg font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-4 p-5 bg-gray-50 dark:bg-gray-800/50 rounded-[1.5rem] border border-gray-100 dark:border-gray-800">
                  <h4 className="text-[10px] uppercase font-black text-gray-400">Recipient Details</h4>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400">Bank Name</label>
                      <select 
                        value={bankDetails.bank}
                        onChange={(e) => setBankDetails({...bankDetails, bank: e.target.value})}
                        className="w-full px-4 py-2 text-xs font-bold dark:text-gray-200 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl outline-none"
                        required
                      >
                        <option value="">Select Bank</option>
                        {NIGERIAN_BANKS.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400">Account Number</label>
                      <input 
                        type="text" 
                        maxLength={10}
                        required
                        value={bankDetails.accountNumber}
                        onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                        className="w-full px-4 py-2 text-xs font-bold dark:text-gray-200 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl outline-none"
                        placeholder="0000000000"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400">Account Name</label>
                      <input 
                        type="text" 
                        required
                        value={bankDetails.accountName}
                        onChange={(e) => setBankDetails({...bankDetails, accountName: e.target.value.toUpperCase()})}
                        className="w-full px-4 py-2 text-xs font-bold dark:text-gray-200 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl outline-none"
                        placeholder="RECEIVER NAME"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <button 
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-4 bg-accent-dark dark:bg-primary text-white font-bold rounded-2xl shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      />
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        Withdraw Funds
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-gray-400 text-center flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" />
                    Transfers are typically completed within 15-30 minutes
                  </p>
                </div>
              </form>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const compressImage = (file: File, maxWidth = 1600, quality = 0.8): Promise<Blob | File> => {
  if (!file.type.startsWith('image/')) return Promise.resolve(file);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          else resolve(file);
        }, 'image/jpeg', quality);
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

const MessagesView = ({ addToast, currentUser, profile, initialUser, onChatStarted }: { 
  addToast: (m: string, t?: 'success' | 'error') => void, 
  currentUser: any, 
  profile: any,
  initialUser?: any,
  onChatStarted?: () => void
}) => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFilePreview, setPendingFilePreview] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showDiscover, setShowDiscover] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sendingMessages, setSendingMessages] = useState<any[]>([]);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load draft when active conversation changes
  useEffect(() => {
    if (!currentUser) return;
    if (activeConvId) {
      const savedDraft = localStorage.getItem(`chat_draft_${currentUser.uid}_${activeConvId}`);
      setMessageText(savedDraft || '');
    } else {
      setMessageText('');
    }
  }, [activeConvId, currentUser?.uid]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleMessageTextChange = (text: string) => {
    setMessageText(text);
    if (currentUser && activeConvId) {
      if (text.trim()) {
        localStorage.setItem(`chat_draft_${currentUser.uid}_${activeConvId}`, text);
      } else {
        localStorage.removeItem(`chat_draft_${currentUser.uid}_${activeConvId}`);
      }
    }
  };

  const handleFileSelect = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      addToast(`File is too large. Max size is ${MAX_FILE_SIZE / 1024 / 1024}MB`, "error");
      return;
    }

    setPendingFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPendingFilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPendingFilePreview(null);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!messageText.trim() && !pendingFile) || !activeConvId || !currentUser) return;

    const tempId = 'temp-' + Date.now();
    const text = messageText;
    let fileToUpload = pendingFile;
    const filePreview = pendingFilePreview;

    // Optimistic Update
    const optimisticMsg = {
      id: tempId,
      senderId: currentUser.uid,
      text: text.trim(),
      createdAt: { toDate: () => new Date() }, // Mock timestamp
      sending: true,
      fileUrl: filePreview,
      fileType: fileToUpload?.type.startsWith('image/') ? 'image' : 
                fileToUpload?.type.startsWith('video/') ? 'video' : 'document',
      fileName: fileToUpload?.name
    };

    setSendingMessages(prev => [...prev, optimisticMsg]);
    setMessageText('');
    if (currentUser && activeConvId) {
      localStorage.removeItem(`chat_draft_${currentUser.uid}_${activeConvId}`);
    }
    setPendingFile(null);
    setPendingFilePreview(null);
    setIsSending(true);

    let finalFileUrl = null;
    let finalFileType = null;
    let finalFileName = null;

    try {
      if (fileToUpload) {
        // Speed up images by compressing before upload
        if (fileToUpload.type.startsWith('image/')) {
          fileToUpload = await compressImage(fileToUpload as File) as File;
        }

        setUploadProgress(0);
        const storageRef = ref(storage, `conversations/${activeConvId}/${Date.now()}_${fileToUpload.name}`);
        const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

        const uploadPromise = new Promise<string>((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            }, 
            (error) => reject(error), 
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            }
          );
        });

        finalFileUrl = await uploadPromise;
        finalFileName = fileToUpload.name;
        finalFileType = optimisticMsg.fileType;
        setUploadProgress(null);
      }

      const msgRef = collection(db, `conversations/${activeConvId}/messages`);
      const messageData: any = {
        senderId: currentUser.uid,
        createdAt: serverTimestamp(),
        read: false
      };
      
      if (text.trim()) messageData.text = text;
      if (finalFileUrl) {
        messageData.fileUrl = finalFileUrl;
        messageData.fileType = finalFileType;
        messageData.fileName = finalFileName;
      }

      await addDoc(msgRef, messageData);
      
      // Remove from sending queue
      setSendingMessages(prev => prev.filter(m => m.id !== tempId));
      setIsSending(false);

      const otherParticipantId = activeConv?.participants.find((p: string) => p !== currentUser?.uid);
      if (otherParticipantId) {
        const backgroundTasks = [];
        backgroundTasks.push(createNotification({
          userId: otherParticipantId,
          type: NotificationType.MESSAGE,
          title: "New Message",
          message: text.trim() 
            ? `${profile.name || "A user"}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`
            : `${profile.name || "A user"} sent a ${finalFileType || 'file'}`,
          link: 'messages',
          data: { conversationId: activeConvId, senderId: currentUser.uid }
        }));

        backgroundTasks.push(setDoc(doc(db, 'conversations', activeConvId), {
          lastMessage: text.trim() ? text : `Sent a ${finalFileType}`,
          lastMessageAt: serverTimestamp(),
          unreadCount: { 
            [otherParticipantId]: increment(1) 
          }
        }, { merge: true }));

        Promise.all(backgroundTasks).catch(err => {
          console.error("Background message tasks failed:", err);
        });
      }
    } catch (error) {
      console.error("Failed to send message/file", error);
      addToast("Failed to send message", "error");
      setSendingMessages(prev => prev.filter(m => m.id !== tempId));
      setIsSending(false);
    } finally {
      setUploadProgress(null);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sendingMessages]);

  useEffect(() => {
    if (initialUser) {
      startChat(initialUser);
      onChatStarted?.();
    }
  }, [initialUser]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'conversations'), 
      where('participants', 'array-contains', currentUser.uid),
      orderBy('lastMessageAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setConversations(convs);
      if (!activeConvId && convs.length > 0 && !showDiscover) {
        setActiveConvId(convs[0].id);
      }
    });

    return () => unsubscribe();
  }, [currentUser, activeConvId, showDiscover]);

  useEffect(() => {
    if (!activeConvId || !currentUser) return;
    
    // Clear unread count for current user when picking a conversation
    const clearUnreads = async () => {
      try {
        await setDoc(doc(db, 'conversations', activeConvId), {
          unreadCount: { [currentUser.uid]: 0 }
        }, { merge: true });
      } catch (error) {
        console.error("Failed to clear unreads", error);
      }
    };
    clearUnreads();

    const q = query(
      collection(db, `conversations/${activeConvId}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);

      // Mark unread messages from other user as read
      const unreadFromOthers = snapshot.docs.filter(d => {
        const data = d.data();
        return data.senderId !== currentUser.uid && !data.read;
      });

      if (unreadFromOthers.length > 0) {
        unreadFromOthers.forEach(msgDoc => {
          setDoc(doc(db, `conversations/${activeConvId}/messages`, msgDoc.id), { read: true }, { merge: true })
            .catch(e => console.error("Mark message as read failed", e));
        });

        setDoc(doc(db, 'conversations', activeConvId), {
          unreadCount: { [currentUser.uid]: 0 }
        }, { merge: true }).catch(error => {
          console.error("Failed to clear unreads on message receive", error);
        });
      }
    });

    return () => unsubscribe();
  }, [activeConvId]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        const users = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(u => u.id !== currentUser?.uid);
        setAllUsers(users);
      } catch (error) {
        console.error("Discovery fetch failed", error);
      }
    };
    if (showDiscover) fetchUsers();
  }, [showDiscover, currentUser]);

  const startChat = async (otherUser: any) => {
    if (!currentUser) return;
    const conversationId = [currentUser.uid, otherUser.id].sort().join('_');
    const convRef = doc(db, 'conversations', conversationId);
    
    try {
      const convSnap = await getDoc(convRef);
      if (!convSnap.exists()) {
        await setDoc(convRef, {
          participants: [currentUser.uid, otherUser.id],
          participantsData: {
            [currentUser.uid]: { name: profile.name, avatar: profile.avatar || null },
            [otherUser.id]: { name: otherUser.name, avatar: otherUser.avatar || null }
          },
          lastMessage: "No messages yet",
          lastMessageAt: serverTimestamp(),
          unreadCount: {
            [currentUser.uid]: 0,
            [otherUser.id]: 0
          }
        });
      }
      setActiveConvId(conversationId);
      setShowDiscover(false);
    } catch (error) {
      console.error("Chat initiation failed", error);
    }
  };

  const activeConv = conversations.find(c => c.id === activeConvId);
  const otherParticipantId = activeConv?.participants.find((p: string) => p !== currentUser?.uid);
  const otherParticipant = activeConv?.participantsData?.[otherParticipantId];
  const filteredUsers = allUsers.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-[1.2rem] sm:rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm h-[calc(100dvh-4.6rem)] sm:h-[calc(100dvh-6.5rem)] md:h-[calc(100vh-12rem)] flex flex-col overflow-hidden transition-all relative">
      {/* Mobile Selector Tab bar to show all areas prominent and wide */}
      {isMobileView && (
        <div className="bg-gray-50/50 dark:bg-gray-950/30 p-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex bg-gray-100/80 dark:bg-gray-800/60 p-1  rounded-2xl border border-gray-200/50 dark:border-gray-700 justify-between gap-1 shadow-inner">
            <button 
              onClick={() => { setShowChatOnMobile(false); setShowDiscover(false); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${!showChatOnMobile && !showDiscover ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Inbox</span>
              {conversations.some(c => (c.unreadCount?.[currentUser?.uid] || 0) > 0) && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>
            <button 
              onClick={() => { setShowChatOnMobile(false); setShowDiscover(true); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${!showChatOnMobile && showDiscover ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Discover</span>
            </button>
            <button 
              disabled={!activeConvId}
              onClick={() => { setShowChatOnMobile(true); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${showChatOnMobile ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-400 disabled:opacity-45 dark:text-gray-500'}`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Active Chat</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Dual Component Panel Row */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <div className={`
          ${isMobileView ? (showChatOnMobile ? 'hidden' : 'w-full') : 'w-80'} 
          border-r border-gray-50 dark:border-gray-800 flex flex-col bg-gray-50/50 dark:bg-gray-950/20 z-10
        `}>
        <div className="p-6 border-b border-gray-50 dark:border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-accent-dark dark:text-gray-100 uppercase tracking-widest text-[10px]">Inbox</h3>
            <button 
              onClick={() => { setShowDiscover(!showDiscover); setSearchQuery(''); }}
              className={`p-2 rounded-xl transition-all ${showDiscover ? 'bg-primary text-white shadow-lg' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
              title={showDiscover ? "View active chats" : "Discover innovators"}
            >
              {showDiscover ? <X className="w-4 h-4" /> : <Users className="w-4 h-4" />}
            </button>
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
            <input 
              placeholder={showDiscover ? "Search innovators..." : "Search conversations..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border-none rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/10 transition-all dark:text-gray-200 shadow-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {showDiscover ? (
            <div className="p-4 space-y-2">
              {filteredUsers.length > 0 ? filteredUsers.map(user => (
                <motion.button 
                  key={user.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => { startChat(user); if (isMobileView) setShowChatOnMobile(true); }}
                  className="w-full p-4 flex gap-4 hover:bg-white dark:hover:bg-gray-800 rounded-3xl transition-all text-left shadow-sm hover:shadow-md border border-transparent hover:border-gray-50 dark:hover:border-gray-700"
                >
                  <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center font-bold text-primary overflow-hidden shadow-sm shrink-0">
                    {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : user.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-accent-dark dark:text-gray-100">{user.name}</p>
                    <p className="text-[10px] text-gray-500 truncate mt-0.5">{user.about || 'Innovative Mind'}</p>
                  </div>
                </motion.button>
              )) : (
                <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                  <Search className="w-10 h-10 mb-4" />
                  <p className="text-xs font-bold">No innovators found</p>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-50/50 dark:divide-gray-800/50">
              {conversations.length > 0 ? conversations.map(conv => {
                const partId = conv.participants.find((p: string) => p !== currentUser?.uid);
                const pData = conv.participantsData?.[partId];
                const isActive = activeConvId === conv.id;
                const unreadCount = conv.unreadCount?.[currentUser?.uid] || 0;
                const draftText = localStorage.getItem(`chat_draft_${currentUser?.uid}_${conv.id}`);
                return (
                  <button 
                    key={conv.id}
                    onClick={() => { setActiveConvId(conv.id); setShowDiscover(false); if (isMobileView) setShowChatOnMobile(true); }}
                    className={`w-full p-6 flex gap-4 hover:bg-white dark:hover:bg-gray-800 transition-all text-left relative group ${isActive ? 'bg-white dark:bg-gray-800' : ''}`}
                  >
                    {!isMobileView && isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                    <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center font-bold text-accent-dark overflow-hidden shadow-sm shrink-0">
                      {pData?.avatar ? <img src={pData.avatar} className="w-full h-full object-cover" /> : pData?.name?.substring(0, 2).toUpperCase() || '??'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <p className={`font-bold text-sm ${isActive ? 'text-primary' : 'text-accent-dark dark:text-gray-100'}`}>{pData?.name || 'Loading...'}</p>
                        <span className="text-[10px] text-gray-400 font-bold">{conv.lastMessageAt?.toDate ? new Date(conv.lastMessageAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs truncate font-medium ${unreadCount > 0 ? 'text-accent-dark dark:text-gray-100 font-bold' : 'text-gray-400 dark:text-gray-500'}`}>
                          {draftText ? (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              <span className="font-extrabold uppercase tracking-widest text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded mr-1.5 align-middle">Draft</span>
                              <span className="italic">{draftText}</span>
                            </span>
                          ) : (
                            conv.lastMessage
                          )}
                        </p>
                        {unreadCount > 0 && (
                          <span className="h-4 min-w-[1rem] px-1 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              }) : (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                  <MessageSquare className="w-12 h-12 mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest leading-relaxed">Your inbox is empty<br/>Start a new chat</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`
        flex-1 flex flex-col bg-white dark:bg-gray-900 
        ${isMobileView && !showChatOnMobile ? 'hidden' : 'flex'}
      `}>
        {activeConvId && !showDiscover ? (
          <>
            <div className="p-4 md:p-6 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-20">
              <div className="flex items-center gap-3 md:gap-4">
                {isMobileView && (
                  <button 
                    onClick={() => setShowChatOnMobile(false)}
                    className="p-2 -ml-2 text-gray-400 hover:text-accent-dark dark:hover:text-gray-100"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center font-bold text-accent-dark overflow-hidden shadow-sm">
                  {otherParticipant?.avatar ? <img src={otherParticipant.avatar} className="w-full h-full object-cover" /> : otherParticipant?.name?.substring(0, 2).toUpperCase() || '??'}
                </div>
                <div>
                  <p className="font-black text-accent-dark dark:text-gray-100 tracking-tight text-sm md:text-base leading-none mb-1">{otherParticipant?.name || '...'}</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <p className="text-[8px] md:text-[10px] text-emerald-500 font-black uppercase tracking-widest">Active Collaboration</p>
                  </div>
                </div>
              </div>
            </div>

            <div 
              className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto space-y-4 sm:space-y-6 custom-scrollbar bg-gray-50/10 dark:bg-gray-950/20 relative"
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileSelect(file);
              }}
            >
              {[...messages, ...sendingMessages].map((msg) => {
                const isMine = msg.senderId === currentUser?.uid;
                const isSending = msg.sending;
                const renderAttachment = () => {
                  if (!msg.fileUrl) return null;
                  
                  if (msg.fileType === 'image') {
                    return (
                      <div className="mb-2 max-w-sm rounded-[1rem] overflow-hidden border border-gray-100 dark:border-gray-700">
                        <img src={msg.fileUrl} alt={msg.fileName} className="w-full h-auto object-cover hover:scale-105 transition-transform cursor-pointer" onClick={() => !isSending && window.open(msg.fileUrl, '_blank')} />
                      </div>
                    );
                  }
                  
                  if (msg.fileType === 'video') {
                    return (
                      <div className="mb-2 max-w-sm rounded-[1rem] overflow-hidden border border-gray-100 dark:border-gray-700 bg-black">
                        <video src={msg.fileUrl} controls className="w-full h-auto" />
                      </div>
                    );
                  }

                  return (
                    <div className="mb-2 flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer" onClick={() => !isSending && window.open(msg.fileUrl, '_blank')}>
                      <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-accent-dark dark:text-gray-200 truncate">{msg.fileName}</p>
                        <p className="text-[8px] text-gray-500 uppercase tracking-widest font-black">Document</p>
                      </div>
                    </div>
                  );
                };

                return (
                  <motion.div 
                    key={msg.id} 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex gap-4 max-w-[85%] ${isMine ? 'ml-auto flex-row-reverse' : ''}`}
                  >
                    <div className={`p-4 rounded-[1.5rem] shadow-sm text-sm font-medium ${
                      isMine 
                        ? 'bg-primary text-white rounded-tr-none shadow-primary/10' 
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-200 rounded-tl-none border border-gray-50 dark:border-gray-700'
                    } ${isSending ? 'opacity-70 grayscale-[0.5]' : ''}`}>
                      {renderAttachment()}
                      {msg.text && <p className="leading-relaxed">{msg.text}</p>}
                      <div className={`flex items-center gap-1.5 mt-2 opacity-60 font-bold ${isMine ? 'justify-end' : ''}`}>
                        <span className="text-[10px]">
                          {msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                        {isMine && !isSending && (
                          msg.read ? (
                            <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-white/50" />
                          )
                        )}
                        {isSending && <div className="w-2.5 h-2.5 border border-white/30 border-t-white rounded-full animate-spin" />}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 sm:p-6 border-t border-gray-50 dark:border-gray-800">
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
              
              {uploadProgress !== null && (
                <div className="mb-4 space-y-1.5">
                  <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-primary">
                    <span>Uploading Attachment</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      className="h-full bg-primary"
                    />
                  </div>
                </div>
              )}

              <AnimatePresence>
                {pendingFile && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-primary/20 flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">Review Attachment</span>
                      <button 
                        onClick={() => { setPendingFile(null); setPendingFilePreview(null); }}
                        className="text-gray-400 hover:text-rose-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      {pendingFilePreview ? (
                        <div className="w-20 h-20 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
                          <img src={pendingFilePreview} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                          {pendingFile.type.startsWith('video/') ? <PlayCircle className="w-8 h-8" /> : <FileText className="w-8 h-8" />}
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-accent-dark dark:text-gray-200 truncate">{pendingFile.name}</p>
                        <p className="text-[10px] text-gray-500 font-bold">{(pendingFile.size / 1024 / 1024).toFixed(2)} MB • {pendingFile.type.split('/')[1]?.toUpperCase() || 'FILE'}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSendMessage} className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800 p-2 pl-4 pr-2 rounded-[2rem] border border-gray-50 dark:border-gray-700">
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 text-gray-400 hover:text-primary transition-colors hover:bg-white dark:hover:bg-gray-700 rounded-full"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input 
                  value={messageText}
                  onChange={(e) => handleMessageTextChange(e.target.value)}
                  placeholder={pendingFile ? "Add a caption..." : "Type your message..."}
                  className="flex-1 bg-transparent border-none py-3 text-sm outline-none dark:text-gray-200 font-medium"
                />
                <button 
                  disabled={(!messageText.trim() && !pendingFile)}
                  className="p-3 bg-primary text-white rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-all disabled:opacity-50 flex items-center justify-center shrink-0"
                  type="submit"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 text-center h-full">
            <div className="w-20 h-20 bg-primary/5 rounded-[2rem] flex items-center justify-center mb-6">
              <MessageSquare className="w-10 h-10 text-primary/40" />
            </div>
            <h3 className="text-xl font-bold text-accent-dark dark:text-gray-100 mb-2">No Active Chat</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-8">
              Choose an active collaboration from the Inbox or find great minds on the Discover tab.
            </p>
            {isMobileView && (
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <button 
                  onClick={() => { setShowChatOnMobile(false); setShowDiscover(false); }}
                  className="w-full py-3 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/10 hover:bg-primary-dark transition-all text-xs uppercase tracking-wider"
                >
                  Browse Inbox
                </button>
                <button 
                  onClick={() => { setShowChatOnMobile(false); setShowDiscover(true); }}
                  className="w-full py-3 bg-primary/10 text-primary font-black rounded-2xl hover:bg-primary/20 transition-all text-xs uppercase tracking-wider"
                >
                  Discover Creators
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      </div> {/* Close the Main Dual Component Panel Row */}
    </div>
  );
};

const IdeaDetailsModal = ({ 
  isOpen, 
  onClose, 
  idea, 
  onConfirm,
  currentUserId
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  idea: any, 
  onConfirm: () => void,
  currentUserId?: string | null
}) => {
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      setActiveImageIdx(0);
      setImgErrors({});
    }
  }, [isOpen, idea?.id]);

  if (!idea) return null;

  const creatorName = idea.creatorName || idea.creator?.name || 'Innovator';
  const creatorInitials = idea.creator?.initials || creatorName.substring(0, 2).toUpperCase();
  const priceValue = typeof idea.price === 'string' ? parseFloat(idea.price.replace(/[^0-9.]/g, '')) || 0 : idea.price || 0;
  const isOwner = currentUserId && (idea.creatorId === currentUserId);
  
  const galleryImages = idea.images || (idea.image ? [idea.image] : []);

  const handleImageError = (idx: number) => {
    setImgErrors(prev => ({ ...prev, [idx]: true }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row max-h-[90vh]"
          >
            {/* Left Sidebar Info */}
            <div className="w-full md:w-1/3 bg-gray-50 dark:bg-gray-800/50 border-r border-gray-100 dark:border-gray-700 flex flex-col min-h-0 overflow-y-auto no-scrollbar">
              {/* Feature Image at top of sidebar on mobile, or just top of sidebar on desktop */}
              <div className="w-full h-48 bg-gray-200 dark:bg-gray-800 shrink-0 relative group">
                {galleryImages[activeImageIdx] && !imgErrors[activeImageIdx] ? (
                  <img 
                    src={galleryImages[activeImageIdx]} 
                    className="w-full h-full object-cover" 
                    alt={idea.title} 
                    onError={() => handleImageError(activeImageIdx)}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400">
                    <div className="p-3 bg-white dark:bg-gray-900 rounded-xl shadow-sm mb-2">
                       <Lightbulb className="w-10 h-10 text-primary/40" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider opacity-50">Unavailable</span>
                  </div>
                )}
                
                {galleryImages.length > 1 && (
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent flex justify-center gap-1.5 overflow-x-auto no-scrollbar">
                    {galleryImages.map((img: string, idx: number) => (
                      <button 
                        key={idx} 
                        onClick={() => setActiveImageIdx(idx)}
                        className={`w-2 h-2 rounded-full transition-all ${idx === activeImageIdx ? 'bg-white w-4' : 'bg-white/40 hover:bg-white/60'}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-[2rem] bg-secondary flex items-center justify-center font-black text-2xl text-accent-dark mb-4 shadow-xl shadow-secondary/10 -mt-16 ring-8 ring-gray-50 dark:ring-gray-900 overflow-hidden shrink-0">
                  {idea.creatorAvatar ? (
                    <img src={idea.creatorAvatar} className="w-full h-full object-cover" alt={creatorName} />
                  ) : creatorInitials}
                </div>
                <h4 className="font-bold text-accent-dark dark:text-gray-100">{creatorName}</h4>
                <p className="text-[10px] uppercase font-black tracking-widest text-primary mb-6">Verified Owner</p>
                
                <div className="w-full space-y-4">
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Category</p>
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${getCategoryColor(idea.category)}`}>
                      {idea.category}
                    </span>
                  </div>
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Market Price</p>
                    <p className="text-lg font-black text-primary">{idea.price === "Free" ? "Free" : formatNGN(priceValue)}</p>
                  </div>
                </div>

                {/* Additional Thumbnails for Desktop */}
                {galleryImages.length > 1 && (
                  <div className="mt-8 grid grid-cols-3 gap-2 w-full">
                    {galleryImages.map((img: string, idx: number) => (
                      <button 
                        key={idx} 
                        onClick={() => setActiveImageIdx(idx)}
                        className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${idx === activeImageIdx ? 'border-primary ring-2 ring-primary/20' : 'border-transparent opacity-60 hover:opacity-100'}`}
                      >
                        {!imgErrors[idx] ? (
                          <img 
                            src={img} 
                            className="w-full h-full object-cover" 
                            alt={`Thumb ${idx}`} 
                            onError={() => handleImageError(idx)}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                            <Lightbulb className="w-4 h-4 text-primary/30" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-8">
                  <button 
                    onClick={onClose}
                    className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-accent-dark dark:hover:text-gray-200 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Close Details
                  </button>
                </div>
              </div>
            </div>

            {/* Right Detailed Info */}
            <div className="flex-1 p-8 overflow-y-auto no-scrollbar">
              <div className="mb-6">
                <h3 className="text-3xl font-black text-accent-dark dark:text-gray-100 mb-4 leading-tight">{idea.title}</h3>
                <div className="flex flex-wrap gap-2 mb-8">
                  {(idea.tags || []).map((tag: string) => (
                    <span key={tag} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-500 dark:text-gray-400 rounded-full">#{tag}</span>
                  ))}
                </div>
                
                <div className="space-y-6">
                   <div>
                     <h5 className="text-xs font-black text-accent-dark dark:text-gray-400 uppercase tracking-widest mb-3">Executive Summary</h5>
                     <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                       {idea.description}
                     </p>
                   </div>
                   
                   <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10">
                     <div className="flex items-center gap-3 mb-3">
                       <Zap className="w-4 h-4 text-primary fill-primary" />
                       <h5 className="text-xs font-black text-primary uppercase tracking-widest">Innovation Impact</h5>
                     </div>
                     <p className="text-[11px] text-gray-500 dark:text-gray-400 italic">
                       "This innovation aims to solve critical infrastructure gaps in the Nigerian {idea.category} market using scalable digital primitives."
                     </p>
                   </div>
                </div>
              </div>

              <div className="pt-8 border-t border-gray-100 dark:border-gray-800">
                <button 
                  onClick={onConfirm}
                  disabled={isOwner}
                  className={`w-full py-5 font-black rounded-3xl shadow-xl transition-all flex items-center justify-center gap-3 ${
                    isOwner 
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed shadow-none' 
                      : 'bg-accent-dark dark:bg-primary text-white shadow-accent-dark/20 hover:scale-[1.02]'
                  }`}
                >
                  {isOwner ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      This is your Idea
                    </>
                  ) : priceValue > 0 ? (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Secure Connection for {formatNGN(priceValue)}
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Express Interest (Free)
                    </>
                  )}
                </button>
                <p className="text-[10px] text-gray-400 text-center mt-4 px-8">
                  By clicking connect, you agree to our terms of data sharing. The owner will receive your contact details once the connection is secured.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const MentorshipView = ({ 
  allUsers, 
  requests, 
  profile, 
  addToast, 
  setActiveTab 
}: { 
  allUsers: any[], 
  requests: any[], 
  profile: any, 
  addToast: any, 
  setActiveTab: any
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'find' | 'requests'>('find');
  const [requestMessage, setRequestMessage] = useState('');
  const [meetingType, setMeetingType] = useState<'virtual' | 'in-person'>('virtual');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [requestingTo, setRequestingTo] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  const mentors = allUsers.filter(u => u.isMentor && u.uid !== auth.currentUser?.uid);

  const handleRequest = async () => {
    if (!requestingTo || !auth.currentUser) return;
    setIsSubmitting(true);
    try {
      const requestId = [auth.currentUser.uid, requestingTo.id || requestingTo.uid].sort().join('_m_') + '_' + Date.now();
      await setDoc(doc(db, 'mentorship_requests', requestId), {
        mentorId: requestingTo.id || requestingTo.uid,
        menteeId: auth.currentUser.uid,
        mentorName: requestingTo.name,
        menteeName: profile.name,
        mentorAvatar: requestingTo.avatar || null,
        menteeAvatar: profile.avatar || null,
        expertise: requestingTo.mentorExpertise?.[0] || 'General',
        message: requestMessage,
        meetingType,
        meetingTime,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      // Create notification for mentor
      await addDoc(collection(db, 'notifications'), {
        userId: requestingTo.id || requestingTo.uid,
        type: 'mentorship',
        title: 'New Mentorship Request',
        message: `${profile.name} has requested a ${meetingType} session.`,
        read: false,
        link: 'mentorship',
        createdAt: serverTimestamp()
      });

      addToast("Mentorship request sent safely!", "success");
      setRequestingTo(null);
      setRequestMessage('');
      setMeetingTime('');
    } catch (error) {
      console.error("Mentorship request failed", error);
      addToast("Failed to send request", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (requestId: string, newStatus: string, otherUserId: string, optionalMeetingLink?: string) => {
    setIsUpdatingStatus(requestId);
    try {
      const updateData: any = { 
        status: newStatus,
        updatedAt: serverTimestamp()
      };
      if (optionalMeetingLink) updateData.meetingLink = optionalMeetingLink;

      await setDoc(doc(db, 'mentorship_requests', requestId), updateData, { merge: true });

      // Notify the other user
      await addDoc(collection(db, 'notifications'), {
        userId: otherUserId,
        type: 'mentorship',
        title: `Mentorship ${newStatus}`,
        message: `${profile.name} has ${newStatus} your mentorship session.`,
        read: false,
        link: 'mentorship',
        createdAt: serverTimestamp()
      });

      addToast(`Mentorship session ${newStatus}`, "success");
      setMeetingLink('');
    } catch (error) {
      console.error("Update failed", error);
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-accent-dark dark:text-white tracking-tight">Mentorship Hub</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">Connect with experienced innovators to accelerate your vision.</p>
        </div>
        <div className="flex gap-2 bg-white dark:bg-gray-900 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
          <button 
            onClick={() => setActiveSubTab('find')}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${activeSubTab === 'find' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-accent-dark dark:hover:text-gray-200'}`}
          >
            Find Mentors
          </button>
          <button 
            onClick={() => setActiveSubTab('requests')}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all relative ${activeSubTab === 'requests' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-accent-dark dark:hover:text-gray-200'}`}
          >
            My Sessions
            {requests.filter(r => r.status === 'pending' && r.mentorId === auth.currentUser?.uid).length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[8px] flex items-center justify-center border-2 border-white dark:border-gray-900">
                {requests.filter(r => r.status === 'pending' && r.mentorId === auth.currentUser?.uid).length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeSubTab === 'find' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mentors.length > 0 ? mentors.map(mentor => (
            <div key={mentor.id || mentor.uid} className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-xl hover:shadow-gray-200/40 dark:hover:shadow-none transition-all group">
              <div className="flex gap-4 items-start mb-6">
                <div className="w-16 h-16 rounded-2xl bg-secondary overflow-hidden shrink-0 border border-gray-100 dark:border-gray-700">
                  {mentor.avatar ? <img src={mentor.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-primary text-xl tracking-tighter">{mentor.name.substring(0, 2).toUpperCase()}</div>}
                </div>
                <div className="min-w-0 pr-4">
                  <h4 className="font-black text-accent-dark dark:text-white truncate group-hover:text-primary transition-colors">{mentor.name}</h4>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{mentor.state || 'Global'} Expert</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {mentor.mentorExpertise?.slice(0, 3).map((exp: string) => (
                      <span key={exp} className="px-2 py-0.5 bg-gray-50 dark:bg-gray-800 text-[9px] font-black uppercase text-gray-400 rounded-md tracking-tighter">#{exp}</span>
                    )) || <span className="text-[10px] text-gray-400 italic">Generalist</span>}
                  </div>
                </div>
              </div>
              {mentor.mentorAvailability && (
                <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                  <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Availability
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {mentor.mentorAvailability.days?.map((day: string) => (
                      <span key={day} className="px-1.5 py-0.5 bg-white dark:bg-gray-800 text-[9px] font-bold text-gray-500 rounded border border-gray-100 dark:border-gray-700">{day}</span>
                    ))}
                    <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 ml-auto">{mentor.mentorAvailability.timeSlot || 'Anytime'}</span>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 mb-6 leading-relaxed font-medium">
                {mentor.mentorBio || mentor.about || "Experienced innovator ready to help you scale your digital vision."}
              </p>
              <button 
                onClick={() => setRequestingTo(mentor)}
                className="w-full py-4 bg-gray-50 dark:bg-gray-800 text-accent-dark dark:text-gray-200 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Request Mentorship
              </button>
            </div>
          )) : (
             <div className="col-span-full py-24 text-center bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 transition-colors">
               <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                 <GraduationCap className="w-10 h-10 text-gray-300" />
               </div>
               <h3 className="text-xl font-bold dark:text-white">Connecting Mentors...</h3>
               <p className="text-gray-400 max-w-xs mx-auto mt-2 text-sm">Be the first to offer guidance! Update your profile settings to become an IdeaConnect Mentor.</p>
               <button onClick={() => setActiveTab('settings')} className="mt-8 px-8 py-3 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">Become a Mentor</button>
             </div>
          )}
        </div>
      ) : (
        <div className="space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-accent-dark dark:text-white uppercase tracking-[0.2em] flex items-center gap-2 bg-white dark:bg-gray-900 w-fit px-4 py-2 rounded-full border border-gray-100 dark:border-gray-800 shadow-sm">
                 <ArrowRight className="w-4 h-4 text-primary" />
                 Sessions As Mentor
              </h3>
              <div className="space-y-4">
                {requests.filter(r => r.mentorId === auth.currentUser?.uid).length > 0 ? requests.filter(r => r.mentorId === auth.currentUser?.uid).map(req => (
                  <div key={req.id} className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between gap-4 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-secondary shrink-0 overflow-hidden border border-gray-50">
                        {req.menteeAvatar ? <img src={req.menteeAvatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-primary">{req.menteeName[0]}</div>}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm dark:text-white truncate">{req.menteeName}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                          {req.meetingTime && `${req.meetingTime} • `} 
                          {req.meetingType || 'Session'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      {req.status === 'pending' && (
                        <div className="space-y-4 w-full">
                          <input 
                            type="url"
                            placeholder="Virtual Meeting Link (optional)"
                            value={meetingLink}
                            onChange={(e) => setMeetingLink(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl text-[10px] outline-none"
                          />
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => updateStatus(req.id, 'accepted', req.menteeId, meetingLink)} className="p-3 bg-emerald-50 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm"><CheckCircle className="w-5 h-5" /></button>
                            <button onClick={() => updateStatus(req.id, 'declined', req.menteeId)} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"><X className="w-5 h-5" /></button>
                          </div>
                        </div>
                      )}
                      {req.status === 'accepted' && (
                        <div className="flex flex-col items-end gap-2">
                          {req.meetingLink && (
                            <a href={req.meetingLink} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-lg uppercase flex items-center gap-2">
                              <Video className="w-3.5 h-3.5" />
                              Join Virtual Session
                            </a>
                          )}
                          <button onClick={() => updateStatus(req.id, 'completed', req.menteeId)} className="px-5 py-2 bg-primary text-white text-[10px] font-black rounded-lg uppercase tracking-widest shadow-lg shadow-primary/20">Finish Session</button>
                        </div>
                      )}
                      {req.status === 'completed' && <span className="text-[10px] font-black text-gray-300 uppercase">Archive</span>}
                    </div>
                  </div>
                )) : (
                  <div className="bg-white dark:bg-gray-900/40 rounded-[2rem] p-10 text-center border border-dashed border-gray-100 dark:border-gray-800 transition-colors">
                    <p className="text-gray-400 text-xs italic font-medium">No mentoring requests from the community yet.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-accent-dark dark:text-white uppercase tracking-[0.2em] flex items-center gap-2 bg-white dark:bg-gray-900 w-fit px-4 py-2 rounded-full border border-gray-100 dark:border-gray-800 shadow-sm">
                 <ArrowRight className="w-4 h-4 text-primary" />
                 Sessions As Mentee
              </h3>
              <div className="space-y-4">
                {requests.filter(r => r.menteeId === auth.currentUser?.uid).length > 0 ? requests.filter(r => r.menteeId === auth.currentUser?.uid).map(req => (
                  <div key={req.id} className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between gap-4 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 shrink-0 overflow-hidden border border-gray-50">
                        {req.mentorAvatar ? <img src={req.mentorAvatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-gray-300">{req.mentorName[0]}</div>}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm dark:text-white truncate">Mentor: {req.mentorName}</p>
                        <p className="text-[10px] text-gray-400 font-medium line-clamp-1 italic">
                          {req.meetingTime && `${req.meetingTime} • `} 
                          {req.meetingType === 'virtual' ? 'Virtual' : 'In-Person'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-lg ${req.status === 'pending' ? 'bg-amber-50 text-amber-500' : req.status === 'accepted' ? 'bg-emerald-500 text-white font-bold animate-pulse' : 'bg-gray-100 text-gray-400'}`}>
                        {req.status}
                      </span>
                      {req.status === 'accepted' && req.meetingLink && (
                        <a href={req.meetingLink} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-indigo-500 text-white text-[9px] font-black rounded-lg uppercase flex items-center gap-2 shadow-lg shadow-indigo-500/20">
                          <Video className="w-3.5 h-3.5" />
                          Meeting Link
                        </a>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="bg-white dark:bg-gray-900/40 rounded-[2rem] p-10 text-center border border-dashed border-gray-100 dark:border-gray-800 transition-colors">
                    <p className="text-gray-400 text-xs italic font-medium">You haven't requested any mentorship yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Modal */}
      <AnimatePresence>
        {requestingTo && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRequestingTo(null)}
              className="absolute inset-0 bg-accent-dark/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-gray-900 w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
            >
              <div className="p-10 pb-0 flex justify-between items-start">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <GraduationCap className="w-7 h-7 text-primary" />
                </div>
                <button onClick={() => setRequestingTo(null)} className="p-2 text-gray-400 hover:text-rose-500 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-10 pt-8 space-y-8">
                <div>
                  <h3 className="text-2xl font-black text-accent-dark dark:text-white leading-tight tracking-tighter">Request Guidance</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">To: <span className="text-primary">{requestingTo.name}</span></p>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 ml-4">Meeting Type</label>
                      <div className="flex gap-2">
                        {['virtual', 'in-person'].map(t => (
                          <button
                            key={t}
                            onClick={() => setMeetingType(t as any)}
                            className={`flex-1 py-3 text-[10px] font-black uppercase rounded-2xl border transition-all ${meetingType === t ? 'bg-primary text-white border-primary border-2 shadow-lg shadow-primary/10' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 border-transparent hover:border-gray-200 dark:hover:border-gray-700'}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 ml-4">Preferred Time</label>
                      <input 
                        type="datetime-local"
                        value={meetingTime}
                        onChange={(e) => setMeetingTime(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl p-3 text-[10px] font-black uppercase focus:ring-2 focus:ring-primary/20 outline-none dark:text-gray-200"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] uppercase font-black tracking-[0.2em] text-gray-400 ml-4">The Challenge</label>
                    <textarea 
                      value={requestMessage}
                      onChange={(e) => setRequestMessage(e.target.value)}
                      placeholder="e.g. Need help with market entry or technical архитектуры..."
                      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-[2rem] p-6 text-sm min-h-[140px] focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none dark:text-gray-200 font-medium"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleRequest}
                  disabled={isSubmitting || !requestMessage.trim()}
                  className="w-full py-5 bg-primary text-white font-black rounded-[2rem] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100 uppercase tracking-widest text-[10px]"
                >
                  {isSubmitting ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> : <><Zap className="w-5 h-5" /> Send Invitation</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const NotificationsView = ({ notifications, addToast, setActiveTab }: { notifications: any[], addToast: any, setActiveTab: any }) => {
  const markAsRead = async (notifId: string) => {
    try {
      await setDoc(doc(db, 'notifications', notifId), { read: true }, { merge: true });
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  const handleNotifClick = (notif: any) => {
    markAsRead(notif.id);
    if (notif.link) {
      setActiveTab(notif.link);
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    try {
      await Promise.all(unread.map(n => 
        setDoc(doc(db, 'notifications', n.id), { read: true }, { merge: true })
      ));
      addToast("All notifications marked as read", "success");
    } catch (error) {
      console.error("Failed to mark all as read", error);
    }
  };

  const deleteNotif = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      console.error("Failed to delete notification", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-accent-dark dark:text-white tracking-tight flex items-center gap-3">
            Notifications
            <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-bold">
              {notifications.filter(n => !n.read).length} Unread
            </span>
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">Stay updated on your innovation journey.</p>
        </div>
        {notifications.some(n => !n.read) && (
          <button 
            onClick={markAllRead}
            className="text-xs font-bold text-primary hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-20 border border-gray-100 dark:border-gray-800 text-center">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bell className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-black text-accent-dark dark:text-white mb-2">No notifications yet</h3>
            <p className="text-gray-400 font-medium">Activity from other innovators will show up here.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => handleNotifClick(notif)}
              className={`group relative bg-white dark:bg-gray-900 p-6 rounded-[2rem] border transition-all cursor-pointer hover:shadow-xl hover:shadow-gray-200/40 dark:hover:shadow-none hover:-translate-y-1 ${
                notif.read ? 'border-gray-100 dark:border-gray-800 opacity-80' : 'border-primary/20 bg-primary/[0.02] shadow-lg shadow-primary/5'
              }`}
            >
              <div className="flex gap-5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  notif.type === 'message' ? 'bg-blue-50 text-blue-500' :
                  notif.type === 'interest' ? 'bg-emerald-50 text-emerald-500' :
                  notif.type === 'market' ? 'bg-amber-50 text-amber-500' :
                  'bg-gray-50 text-gray-500'
                }`}>
                  {notif.type === 'message' ? <MessageSquare className="w-6 h-6" /> :
                   notif.type === 'interest' ? <Lightbulb className="w-6 h-6" /> :
                   notif.type === 'market' ? <ShoppingBag className="w-6 h-6" /> :
                   <Bell className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0 pr-8">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`font-black text-sm truncate ${notif.read ? 'text-gray-500 dark:text-gray-400' : 'text-accent-dark dark:text-white'}`}>
                      {notif.title}
                    </h4>
                    {!notif.read && <span className="w-2 h-2 bg-primary rounded-full" />}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-medium line-clamp-2 mb-2 leading-relaxed">
                    {notif.message}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-gray-300 dark:text-gray-600 uppercase tracking-widest">
                      {notif.createdAt?.toDate ? new Date(notif.createdAt.toDate()).toLocaleString() : 'Just now'}
                    </span>
                    {notif.link && (
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1 group-hover:gap-2 transition-all">
                        View Details <ArrowRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={(e) => deleteNotif(e, notif.id)}
                  className="absolute top-6 right-6 p-2 rounded-xl opacity-0 group-hover:opacity-100 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

const KYCBanner = ({ onVerifyClick }: { onVerifyClick: () => void }) => {
  return (
    <motion.div 
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      className="bg-accent-dark text-white overflow-hidden mb-8 rounded-[2rem] shadow-xl"
    >
      <div className="px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-primary mb-1">Account Security</p>
            <h4 className="text-lg font-black tracking-tight leading-tight">Identity Verification Required</h4>
            <p className="text-[11px] font-medium opacity-70 mt-1 max-w-sm">Please complete your KYC using your NIN to unlock all platform features.</p>
          </div>
        </div>
        <button 
          onClick={onVerifyClick}
          className="w-full sm:w-auto px-8 py-4 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-lg shadow-black/20 whitespace-nowrap"
        >
          Verify with NIN
        </button>
      </div>
    </motion.div>
  );
};

const Dashboard = ({ user, ideas, onAddIdea, onLogout, addToast, isDarkMode, toggleDarkMode }: DashboardProps) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);
  const [networkSearchTerm, setNetworkSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNetworkMenu, setShowNetworkMenu] = useState(false);
  const [marketplaceSearchTerm, setMarketplaceSearchTerm] = useState('');
  const [marketplaceCategory, setMarketplaceCategory] = useState('All');
  const [marketplaceSortOption, setMarketplaceSortOption] = useState('newest');
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<any>(null);
  const [follows, setFollows] = useState<any[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [savedIdeas, setSavedIdeas] = useState<any[]>([]);
  const [savedIdeaIds, setSavedIdeaIds] = useState<string[]>([]);

  // Idea Deletion states
  const [ideaToDelete, setIdeaToDelete] = useState<any>(null);
  const [isDeletingIdea, setIsDeletingIdea] = useState(false);
  const [isKYCModalOpen, setIsKYCModalOpen] = useState(false);

  // Idea Details & Interest states
  const [viewingIdea, setViewingIdea] = useState<any>(null);
  const [pendingInterestIdea, setPendingInterestIdea] = useState<any>(null);
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [mentorshipRequests, setMentorshipRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!auth?.currentUser || !db) return;
    
    // Listen to messages for badge
    const messagesQ = query(
      collection(db, 'conversations'), 
      where('participants', 'array-contains', auth.currentUser.uid)
    );
    
    const messagesUnsub = onSnapshot(messagesQ, (snapshot) => {
      let total = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        total += (data.unreadCount?.[auth.currentUser.uid] || 0);
      });
      setTotalUnreadMessages(total);
    });

    // Listen to notifications
    const notificationsQ = query(
      collection(db, 'notifications'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const notificationsUnsub = onSnapshot(notificationsQ, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(notifs);
      setUnreadNotificationsCount(notifs.filter((n: any) => !n.read).length);
    }, (error) => {
      console.error("Notifications listener error:", error);
    });

    // Listen to Mentorship Requests
    const mentorshipQ = query(
      collection(db, 'mentorship_requests'),
      where('mentorId', '==', auth.currentUser.uid)
    );
    const mentorshipQ2 = query(
      collection(db, 'mentorship_requests'),
      where('menteeId', '==', auth.currentUser.uid)
    );

    const mentorshipUnsub = onSnapshot(mentorshipQ, (snapshot) => {
      const mentorsReqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMentorshipRequests(prev => {
        const others = prev.filter(r => (r as any).menteeId === auth.currentUser.uid);
        return [...others, ...mentorsReqs];
      });
    });

    const mentorshipUnsub2 = onSnapshot(mentorshipQ2, (snapshot) => {
      const menteeReqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMentorshipRequests(prev => {
        const others = prev.filter(r => (r as any).mentorId === auth.currentUser.uid);
        return [...others, ...menteeReqs];
      });
    });

    // Listen to saved ideas
    const savedIdeasQ = query(collection(db, 'saved_ideas'), where('userId', '==', auth.currentUser.uid));
    const savedIdeasUnsub = onSnapshot(savedIdeasQ, (snapshot) => {
      const saved = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSavedIdeas(saved);
      setSavedIdeaIds(saved.map((s: any) => s.ideaId));
    });

    // Listen to follows
    const followsQ = query(collection(db, 'follows'), where('followerId', '==', auth.currentUser.uid));
    const followsUnsub = onSnapshot(followsQ, (snapshot) => {
      const fls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFollows(fls);
      setFollowingIds(fls.map((f: any) => f.followingId));
    });

    return () => {
      messagesUnsub();
      notificationsUnsub();
      mentorshipUnsub();
      mentorshipUnsub2();
      followsUnsub();
      savedIdeasUnsub();
    };
  }, [auth?.currentUser, db]);

  const handleDeleteIdea = async () => {
    if (!ideaToDelete) return;
    setIsDeletingIdea(true);
    try {
      await deleteDoc(doc(db, 'ideas', ideaToDelete.id));
      addToast("Idea successfully deleted", "success");
      setIdeaToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `ideas/${ideaToDelete.id}`);
      addToast("Failed to delete idea. Please try again.", "error");
    } finally {
      setIsDeletingIdea(false);
    }
  };

  const handleToggleSaveIdea = async (idea: any) => {
    if (!auth?.currentUser || !db) return;
    const ideaId = typeof idea === 'string' ? idea : idea.id;
    const isSavedAlready = savedIdeaIds.includes(ideaId);
    
    try {
      if (isSavedAlready) {
        const savedDoc = savedIdeas.find((s: any) => s.ideaId === ideaId);
        if (savedDoc) {
          await deleteDoc(doc(db, 'saved_ideas', savedDoc.id));
          addToast("Removed from bookmarks", "success");
        }
      } else {
        const saveId = `${auth.currentUser.uid}_${ideaId}`;
        await setDoc(doc(db, 'saved_ideas', saveId), {
          userId: auth.currentUser.uid,
          ideaId: ideaId,
          ideaTitle: typeof idea === 'string' ? 'Idea' : idea.title,
          createdAt: serverTimestamp()
        });
        addToast("Added to bookmarks", "success");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `saved_ideas/${auth.currentUser.uid}_${ideaId}`);
      addToast("Failed to update bookmarks", "error");
    }
  };

  // Payment states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [wallet, setWallet] = useState({ balance: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [taskToRemind, setTaskToRemind] = useState<any>(null);

  // Sync Roadmap
  useEffect(() => {
    if (!auth?.currentUser || !db) return;

    const roadmapDoc = doc(db, 'roadmaps', auth.currentUser.uid);
    const unsub = onSnapshot(roadmapDoc, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setTasks(data.tasks || []);
      } else {
        const initialTasks = [
          { id: 1, title: 'Post your first innovation', completed: false },
          { id: 2, title: 'Complete bank verification', completed: false },
          { id: 3, title: 'Reach ₦100k wallet balance', completed: false },
          { id: 4, title: 'Collaborate on a project', completed: false },
        ];
        setTasks(initialTasks);
        setDoc(roadmapDoc, { userId: auth.currentUser.uid, tasks: initialTasks, updatedAt: serverTimestamp() });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `roadmaps/${auth.currentUser?.uid}`);
    });

    return unsub;
  }, [auth?.currentUser, db]);

  const toggleTask = async (id: number) => {
    if (!auth?.currentUser || !db) return;
    const newTasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTasks(newTasks);
    try {
      await setDoc(doc(db, 'roadmaps', auth.currentUser.uid), { 
        userId: auth.currentUser.uid, 
        tasks: newTasks, 
        updatedAt: serverTimestamp() 
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `roadmaps/${auth.currentUser.uid}`);
    }
  };

  const saveReminder = async (reminder: string) => {
    if (!auth?.currentUser || !taskToRemind || !db) return;
    const newTasks = tasks.map(t => t.id === taskToRemind.id ? { ...t, reminder } : t);
    setTasks(newTasks);
    try {
      await setDoc(doc(db, 'roadmaps', auth.currentUser.uid), { 
        userId: auth.currentUser.uid, 
        tasks: newTasks, 
        updatedAt: serverTimestamp() 
      }, { merge: true });
      addToast(`Reminder set for ${taskToRemind.title}`, "success");
    } catch (error) {
       handleFirestoreError(error, OperationType.WRITE, `roadmaps/${auth.currentUser.uid}`);
    }
  };

  const handleWalletFunding = (amount: number) => {
    setPaymentAmount(amount);
    setIsPaymentModalOpen(true);
  };

  const handleFollowToggle = async (targetUserId: string) => {
    if (!auth.currentUser || !db) return;
    
    const isFollowing = followingIds.includes(targetUserId);
    
    try {
      if (isFollowing) {
        // Unfollow
        const followDoc = follows.find((f: any) => f.followingId === targetUserId);
        if (followDoc) {
          await deleteDoc(doc(db, 'follows', followDoc.id));
          addToast("Unfollowed successfully", "success");
        }
      } else {
        // Follow
        const followId = `${auth.currentUser.uid}_${targetUserId}`;
        await setDoc(doc(db, 'follows', followId), {
          followerId: auth.currentUser.uid,
          followingId: targetUserId,
          createdAt: serverTimestamp()
        });

        // Add notification for the target user
        await addDoc(collection(db, 'notifications'), {
          userId: targetUserId,
          type: 'connection',
          title: 'New Follower',
          message: `${user.name} started following you. You'll receive email updates for their activities.`,
          read: false,
          createdAt: serverTimestamp(),
          link: '/network'
        });

        addToast("Following successfully", "success");
      }
    } catch (error) {
       handleFirestoreError(error, OperationType.WRITE, `follows/${auth.currentUser.uid}_${targetUserId}`);
       addToast("Failed to update follow status", "error");
    }
  };

  const handlePaymentSuccess = async (method: 'card' | 'transfer') => {
    if (!auth.currentUser) return;
    
    try {
      const txId = `TX_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const txData = {
        userId: auth.currentUser.uid,
        amount: paymentAmount,
        type: pendingInterestIdea ? 'interest_payment' : 'funding',
        method,
        status: 'success',
        reference: txId,
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'transactions', txId), txData);
      
      if (pendingInterestIdea) {
        await confirmInterest(pendingInterestIdea);
        setPendingInterestIdea(null);
      } else {
        const newBalance = wallet.balance + paymentAmount;
        await setDoc(doc(db, 'wallets', auth.currentUser.uid), {
          userId: auth.currentUser.uid,
          balance: newBalance,
          updatedAt: serverTimestamp()
        }, { merge: true });

        setWallet({ balance: newBalance });
        addToast(`${formatNGN(paymentAmount)} successfully added to your wallet`, "success");
      }
    } catch (error) {
      console.error("Payment integration error:", error);
      addToast("Transaction failed. Please contact support.", "error");
    }
  };

  const handleWithdrawalSuccess = async (amount: number, bankData: any) => {
    if (!auth.currentUser) return;
    
    try {
      const txId = `WD_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const txData = {
        userId: auth.currentUser.uid,
        amount: amount,
        type: 'withdrawal',
        method: 'bank_transfer',
        status: 'pending',
        reference: txId,
        bankData,
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'transactions', txId), txData);
      
      const newBalance = wallet.balance - amount;
      await setDoc(doc(db, 'wallets', auth.currentUser.uid), {
        userId: auth.currentUser.uid,
        balance: newBalance,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setWallet({ balance: newBalance });
      addToast(`${formatNGN(amount)} withdrawal initiated successfully`, "success");
    } catch (error) {
      console.error("Withdrawal error:", error);
      addToast("Withdrawal failed. Please contact support.", "error");
    }
  };

  // Connection Handlers
  const handleSendRequest = async (targetUserId: string) => {
    if (!auth.currentUser) return;
    try {
      const connId = [auth.currentUser.uid, targetUserId].sort().join('_');
      await setDoc(doc(db, 'connections', connId), {
        fromId: auth.currentUser.uid,
        toId: targetUserId,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Notify recipient
      await createNotification({
        userId: targetUserId,
        type: NotificationType.CONNECTION,
        title: "Collaboration Request",
        message: `${profile.name || "A user"} wants to collaborate with you!`,
        link: 'network',
        data: { senderId: auth.currentUser.uid }
      });

      addToast("Collaboration request sent", "success");
    } catch (error) {
      console.error("Error sending request:", error);
      addToast("Failed to send request", "error");
    }
  };

  const handleUpdateConnection = async (connId: string, status: 'accepted' | 'rejected') => {
    try {
      await setDoc(doc(db, 'connections', connId), {
        status,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Notify the sender if accepted
      if (status === 'accepted') {
        const connDoc = await getDoc(doc(db, 'connections', connId));
        const connData = connDoc.data();
        if (connData) {
          const senderId = connData.fromId === auth.currentUser?.uid ? connData.toId : connData.fromId;
          const targetId = connData.fromId === auth.currentUser?.uid ? connData.fromId : connData.toId; // The one who sent the request is fromId
          // Wait, if I am accepting, I am toId. The sender was fromId.
          const recipientId = connData.fromId; 
          
          await createNotification({
            userId: recipientId,
            type: NotificationType.CONNECTION,
            title: "Request Accepted!",
            message: `${profile.name || "A user"} accepted your collaboration request!`,
            link: 'network',
            data: { responderId: auth.currentUser?.uid }
          });
        }
      }

      addToast(`Request ${status}`, "success");
    } catch (error) {
      console.error("Error updating request:", error);
      addToast("Failed to update request", "error");
    }
  };
  
  const [profileLoading, setProfileLoading] = useState(true);
  const hasLoadedProfileOnce = useRef(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [profile, setProfile] = useState<any>(() => {
    // Attempt local cache for immediate display
    try {
      const cached = localStorage.getItem(`profile_${user?.email}`);
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.error("Local storage error:", e);
    }
    
    return {
      name: user?.name || 'Innovator',
      about: 'I am an innovator focused on creating sustainable tech solutions for African craftsmen.',
      address: 'Lagos, Nigeria',
      street: '',
      lga: '',
      state: 'Lagos',
      twitter: '',
      linkedin: '',
      instagram: '',
      facebook: '',
      whatsapp: '',
      latitude: 6.5244,
      longitude: 3.3792,
      bank: '',
      accountNumber: '',
      accountName: '',
      avatar: null as string | null,
      notificationPreferences: {
        interest: true,
        message: true,
        connection: true,
        market: true,
        mentorship: true
      }
    };
  });
  const [allIdeas, setAllIdeas] = useState<any[]>([]);
  const [userIdeas, setUserIdeas] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [interests, setInterests] = useState<any[]>([]);

  const completenessScore = useMemo(() => {
    const fields = ['name', 'about', 'state', 'lga', 'street', 'bank', 'accountNumber', 'accountName'];
    const completed = fields.filter(f => profile[f] && profile[f].toString().trim().length > 0);
    return Math.round((completed.length / fields.length) * 100);
  }, [profile]);

  const filteredDirectory = useMemo(() => {
    return allUsers.filter(u => 
      u.id !== auth.currentUser?.uid && 
      (u.name?.toLowerCase().includes(networkSearchTerm.toLowerCase()) || 
       u.about?.toLowerCase().includes(networkSearchTerm.toLowerCase()))
    );
  }, [allUsers, networkSearchTerm]);

  const acceptedConnections = useMemo(() => {
    return connections.filter(c => c.status === 'accepted').map(c => {
      const otherId = c.fromId === auth.currentUser?.uid ? c.toId : c.fromId;
      return { ...c, otherUser: allUsers.find(u => u.id === otherId) };
    }).filter(c => c.otherUser);
  }, [connections, allUsers]);

  const pendingIncoming = useMemo(() => {
    return connections.filter(c => c.status === 'pending' && c.toId === auth.currentUser?.uid).map(c => {
      return { ...c, otherUser: allUsers.find(u => u.id === c.fromId) };
    }).filter(c => c.otherUser);
  }, [connections, allUsers]);

  const pendingOutgoingIds = useMemo(() => {
    return connections.filter(c => c.status === 'pending' && c.fromId === auth.currentUser?.uid).map(c => c.toId);
  }, [connections]);

  const acceptedConnectionIds = useMemo(() => {
    return acceptedConnections.map(c => c.otherUser.id);
  }, [acceptedConnections]);

  useEffect(() => {
    if (!auth || !auth.currentUser || !db) return;

    setProfileLoading(true);
    // Listen to personal profile
    const profileUnsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as any;
        const updatedFromCloud = {
          ...data,
          // Ensure coordinates exist even if not in Firestore yet
          latitude: data?.latitude ?? 6.5244,
          longitude: data?.longitude ?? 3.3792,
        };

        setProfile((prev: any) => {
          // IMPORTANT: If we are on settings tab, the user might be typing.
          // Don't overwrite their local typing if we've already loaded once,
          // BUT do accept the updated avatar (which might have been auto-saved).
          if (activeTab === 'settings' && hasLoadedProfileOnce.current) {
            return {
              ...prev,
              avatar: updatedFromCloud.avatar ?? prev.avatar
            };
          }
          hasLoadedProfileOnce.current = true;
          return updatedFromCloud;
        });

        try {
          localStorage.setItem(`profile_${auth.currentUser.email}`, JSON.stringify(updatedFromCloud));
        } catch (e) {
          console.error("Local storage set error:", e);
        }
      }
      setProfileLoading(false);
    }, (error) => {
      console.error("Profile onSnapshot error:", error);
      setProfileLoading(false);
    });

    // Listen to all ideas (Marketplace)
    const ideasUnsub = onSnapshot(query(collection(db, 'ideas'), orderBy('createdAt', 'desc')), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllIdeas(docs);
      setUserIdeas(docs.filter((d: any) => d.creatorId === auth.currentUser?.uid));
    }, (error) => {
      console.error("Ideas onSnapshot error:", error);
    });

    // Listen to interests on my ideas (Notifications)
    const interestsUnsub = onSnapshot(query(collection(db, 'interests'), where('ideaOwnerId', '==', auth.currentUser.uid)), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInterests(docs);
    }, (error) => {
      console.error("Interests onSnapshot error:", error);
    });

    // Listen to all users (Networking/Directory)
    const usersUnsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllUsers(docs);
    }, (error) => {
      console.error("Users onSnapshot error:", error);
    });

    // Listen to wallet
    const walletUnsub = onSnapshot(doc(db, 'wallets', auth.currentUser.uid), (snapshot) => {
      if (snapshot.exists()) {
        setWallet(snapshot.data() as any);
      } else {
        // Initial wallet creation
        setDoc(doc(db, 'wallets', auth.currentUser.uid), {
          userId: auth.currentUser.uid,
          balance: 0,
          updatedAt: serverTimestamp()
        });
      }
    });

    // Listen to transactions
    const txUnsub = onSnapshot(query(
      collection(db, 'transactions'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    ), (snapshot) => {
      setTransactions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error("Transactions onSnapshot error:", error);
    });

    // Listen to connections
    const connectionsUnsub = onSnapshot(query(
      collection(db, 'connections'),
      where('fromId', '==', auth.currentUser.uid)
    ), (snapshot) => {
      const outgoing = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // We'll combine this with incoming in a single state
      setConnections(prev => {
        const others = prev.filter(c => c.fromId !== auth.currentUser.uid);
        return [...others, ...outgoing];
      });
    }, (error) => {
      console.error("Outgoing connections error:", error);
    });

    const incomingUnsub = onSnapshot(query(
      collection(db, 'connections'),
      where('toId', '==', auth.currentUser.uid)
    ), (snapshot) => {
      const incoming = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setConnections(prev => {
        const others = prev.filter(c => c.toId !== auth.currentUser.uid);
        return [...others, ...incoming];
      });
    }, (error) => {
      console.error("Incoming connections error:", error);
    });

    return () => {
      profileUnsub();
      ideasUnsub();
      interestsUnsub();
      usersUnsub();
      connectionsUnsub();
      incomingUnsub();
      walletUnsub();
      txUnsub();
    };
  }, [user.email, activeTab]);

  const confirmInterest = async (idea: any) => {
    if (!auth.currentUser) return;
    try {
      // Check for existing interest
      const q = query(
        collection(db, 'interests'), 
        where('ideaId', '==', idea.id), 
        where('interestedUserId', '==', auth.currentUser.uid)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        addToast("You have already expressed interest in this concept", "success");
        return;
      }

      await addDoc(collection(db, 'interests'), {
        ideaId: idea.id,
        ideaTitle: idea.title,
        interestedUserId: auth.currentUser.uid,
        interestedUserName: profile.name || auth.currentUser.displayName || 'Innovator',
        ideaOwnerId: idea.creatorId || 'sample-innovator-system',
        createdAt: serverTimestamp(),
        status: 'pending'
      });

      // Notify the idea owner
      await createNotification({
        userId: idea.creatorId || 'sample-innovator-system',
        type: NotificationType.INTEREST,
        title: "New Interest!",
        message: `${profile.name || "A user"} is interested in your concept: ${idea.title}`,
        link: 'interests', // This should link to the interests tab or view
        data: { ideaId: idea.id, interestedUserId: auth.currentUser.uid }
      });

      addToast(`Interest recorded for "${idea.title}"! Redirecting to chat...`, "success");
      
      // Auto-initiate chat context
      setSelectedChatUser({
        id: idea.creatorId || 'sample-innovator-system',
        name: idea.creatorName || idea.creator?.name || 'Innovator',
        avatar: idea.creatorAvatar || idea.creator?.avatar || null
      });
      setActiveTab('messages');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'interests');
      addToast("Failed to connect. Please try again.", "error");
    }
  };

  const handleInterest = (idea: any) => {
    if (!auth.currentUser) {
      setViewingIdea(idea);
      return;
    }
    setViewingIdea(idea);
  };

  const handleInitiateInterest = async () => {
    if (!viewingIdea || !auth.currentUser) return;
    
    const priceValue = typeof viewingIdea.price === 'string' ? parseFloat(viewingIdea.price.replace(/[^0-9.]/g, '')) || 0 : viewingIdea.price || 0;
    
    if (priceValue > 0) {
      setPendingInterestIdea(viewingIdea);
      setPaymentAmount(priceValue);
      setViewingIdea(null);
      setIsPaymentModalOpen(true);
    } else {
      await confirmInterest(viewingIdea);
      setViewingIdea(null);
    }
  };

  const handleSaveProfile = async () => {
    if (!auth.currentUser) return;
    setIsSavingProfile(true);
    setJustSaved(false);
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        ...profile,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      // Update local storage immediately after save
      localStorage.setItem(`profile_${auth.currentUser.email}`, JSON.stringify(profile));
      
      addToast("Profile updated successfully", "success");
      setJustSaved(true);
      
      setTimeout(() => {
        setJustSaved(false);
        setActiveTab('dashboard');
      }, 1000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${auth.currentUser.uid}`);
      addToast("Failed to save profile.", "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size - Firestore limit is 1MB, let's keep it safe at 800KB for base64 overhead
      if (file.size > 800 * 1024) {
        addToast("Image too large. Please use an image under 800KB.", "error");
        return;
      }

      setIsUploadingAvatar(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const avatarData = reader.result as string;
        setProfile({ ...profile, avatar: avatarData });
        
        // Auto-save the avatar specifically to avoid losing it
        if (auth.currentUser && db) {
          try {
            await setDoc(doc(db, 'users', auth.currentUser.uid), {
              avatar: avatarData,
              updatedAt: serverTimestamp()
            }, { merge: true });
            addToast("Profile picture saved", "success");
          } catch (error) {
            console.error("Avatar auto-save failed", error);
            addToast("Failed to save avatar to cloud", "error");
          }
        }
        
        setIsUploadingAvatar(false);
      };
      reader.onerror = () => {
        setIsUploadingAvatar(false);
        addToast("Failed to read image file", "error");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      addToast("Market data refreshed successfully.", "success");
    }, 1000);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'notifications':
        return <NotificationsView notifications={notifications} addToast={addToast} setActiveTab={setActiveTab} />;
      case 'mentorship':
        return <MentorshipView allUsers={allUsers} requests={mentorshipRequests} profile={profile} addToast={addToast} setActiveTab={setActiveTab} />;
      case 'settings':
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8 pb-12">
            <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 sticky top-24 z-20 shadow-sm transition-colors">
              <div>
                <h2 className="text-2xl font-bold text-accent-dark dark:text-gray-100">Profile Settings</h2>
                <p className="text-xs text-gray-500">Your information is securely stored and used for verification.</p>
              </div>
              <button 
                onClick={handleSaveProfile}
                disabled={isSavingProfile || justSaved}
                className={`px-6 py-2.5 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 ${
                  justSaved 
                  ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                  : 'bg-primary text-white shadow-primary/20 hover:bg-primary-hover shadow-xl'
                }`}
              >
                {isSavingProfile ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : justSaved ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Changes Saved!
                  </>
                ) : 'Save Changes'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Sidebar Info */}
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 text-center transition-colors">
                  <div className="relative inline-block group mb-4">
                    <div className="w-32 h-32 rounded-3xl bg-secondary overflow-hidden border-4 border-white dark:border-gray-800 shadow-xl relative">
                      {isUploadingAvatar && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-10">
                          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        </div>
                      )}
                      {profile.avatar ? (
                        <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-accent-dark">
                          {profile.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <label className="absolute bottom-2 right-2 p-2 bg-primary text-white rounded-xl shadow-lg cursor-pointer transform hover:scale-110 active:scale-95 transition-all">
                      <Camera className="w-4 h-4" />
                      <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={isUploadingAvatar} />
                    </label>
                  </div>
                  <h3 className="font-bold text-accent-dark dark:text-gray-100">{profile.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Trust Score: {completenessScore}%</p>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 space-y-4">
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-primary">
                    <span>Profile Progress</span>
                    <span>{completenessScore}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${completenessScore}%` }} />
                  </div>
                  {completenessScore < 100 ? (
                    <p className="text-[10px] text-gray-400 italic">Complete Bio, Address, and Bank info to reach 100%.</p>
                  ) : (
                    <div className="flex items-center gap-2 text-[10px] text-emerald-500 font-bold uppercase">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Profile Fully Verified
                    </div>
                  )}
                </div>

                <div className="bg-primary/5 dark:bg-primary/10 rounded-2xl p-6 border border-primary/10">
                  <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Pro Tip</h4>
                  <p className="text-xs text-primary/80 leading-relaxed font-medium">
                    Verified profiles with professional photos and linked socials are 3x more likely to secure funding.
                  </p>
                </div>
              </div>

              {/* Form Content */}
              <div className="md:col-span-2 space-y-6">
                {/* Account Verification Section */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 space-y-6 transition-colors shadow-sm">
                  <h3 className="font-bold text-accent-dark dark:text-gray-100 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                    Account Verification Status
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-5 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${user.emailVerified ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                          <Mail className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-accent-dark dark:text-gray-100">Email Address</p>
                          <p className="text-[10px] text-gray-400 font-medium">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {user.emailVerified ? (
                          <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-white text-[9px] font-black uppercase rounded-lg tracking-wider">
                            <CheckCircle className="w-3 h-3" />
                            Verified
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-rose-500 text-white text-[9px] font-black uppercase rounded-lg tracking-wider">
                            Unverified
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-5 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${profile.kycStatus === 'verified' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-accent-dark dark:text-gray-100">Identity Verification (KYC)</p>
                          <p className="text-[10px] text-gray-400 font-medium">Verify your NIN to enable all features</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {profile.kycStatus === 'verified' ? (
                          <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-white text-[9px] font-black uppercase rounded-lg tracking-wider">
                            <CheckCircle className="w-3 h-3" />
                            Verified
                          </span>
                        ) : (
                          <button 
                            onClick={() => setIsKYCModalOpen(true)}
                            className="px-4 py-2 bg-primary text-white text-[9px] font-black uppercase rounded-lg tracking-wider hover:bg-primary-hover transition-all shadow-lg shadow-primary/20"
                          >
                            Verify Now
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* About Section */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 space-y-6 transition-colors">
                  <h3 className="font-bold text-accent-dark dark:text-gray-100 flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Public Information
                  </h3>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Full Name</label>
                    <input 
                      value={profile.name}
                      onChange={(e) => setProfile({...profile, name: e.target.value})}
                      className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-gray-700 focus:border-primary/20 outline-none transition-all text-sm dark:text-gray-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">About You</label>
                    <textarea 
                      rows={4}
                      value={profile.about}
                      onChange={(e) => setProfile({...profile, about: e.target.value})}
                      className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-gray-700 focus:border-primary/20 outline-none transition-all text-sm dark:text-gray-200 resize-none"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Physical Address & Location</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">State</label>
                        <input 
                          placeholder="e.g. Lagos"
                          value={profile.state}
                          onChange={(e) => setProfile({...profile, state: e.target.value})}
                          className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-gray-700 focus:border-primary/20 outline-none transition-all text-sm dark:text-gray-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">LGA</label>
                        <input 
                          placeholder="e.g. Eti-Osa"
                          value={profile.lga}
                          onChange={(e) => setProfile({...profile, lga: e.target.value})}
                          className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-gray-700 focus:border-primary/20 outline-none transition-all text-sm dark:text-gray-200"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Street / Residential Address</label>
                      <input 
                        placeholder="e.g. 123 Innovation Way"
                        value={profile.street}
                        onChange={(e) => setProfile({...profile, street: e.target.value})}
                        className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-gray-700 focus:border-primary/20 outline-none transition-all text-sm dark:text-gray-200"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex justify-between">
                        Live Location (Click Map to Update)
                        <span className="text-primary normal-case font-medium">
                          {(profile.latitude || 0).toFixed(4)}, {(profile.longitude || 0).toFixed(4)}
                        </span>
                      </label>
                      <div className="h-64 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
                        {hasValidMapsKey ? (
                          <APIProvider apiKey={GOOGLE_MAPS_API_KEY} version="weekly">
                            <Map
                              defaultCenter={{ 
                                lat: profile.latitude || 6.5244, 
                                lng: profile.longitude || 3.3792 
                              }}
                              defaultZoom={11}
                              mapId="PROFILE_LOCATION_MAP"
                              onClick={(e) => {
                                if (e.detail.latLng) {
                                  setProfile({
                                    ...profile,
                                    latitude: e.detail.latLng.lat,
                                    longitude: e.detail.latLng.lng
                                  });
                                }
                              }}
                              className="w-full h-full"
                              gestureHandling={'greedy'}
                              disableDefaultUI={true}
                              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                            >
                              <AdvancedMarker position={{ 
                                lat: profile.latitude || 6.5244, 
                                lng: profile.longitude || 3.3792 
                              }}>
                                <Pin background="#E11D48" glyphColor="#fff" borderColor="#BE123C" />
                              </AdvancedMarker>
                            </Map>
                          </APIProvider>
                        ) : (
                          <div className="w-full h-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center p-6 text-center">
                            <div className="space-y-2">
                              <MapPin className="w-8 h-8 text-gray-300 mx-auto" />
                              <p className="text-xs text-gray-400 font-bold">Google Maps Key Required</p>
                              <p className="text-[10px] text-gray-400 max-w-[200px]">Add GOOGLE_MAPS_PLATFORM_KEY to secrets to enable live location mapping.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notification Settings */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 space-y-6 transition-colors">
                  <h3 className="font-bold text-accent-dark dark:text-gray-100 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    Notification Preferences
                  </h3>
                  <p className="text-xs text-gray-500">Manage which types of notifications you receive.</p>

                  <div className="space-y-4">
                    {[
                      { id: 'interest', label: 'Idea Interests', desc: 'When someone shows interest in your innovation' },
                      { id: 'message', label: 'Direct Messages', desc: 'When you receive a new message' },
                      { id: 'connection', label: 'Connection Requests', desc: 'When someone wants to join your network' },
                      { id: 'mentorship', label: 'Mentorship Updates', desc: 'Updates on your mentorship requests' },
                      { id: 'market', label: 'Marketplace Alerts', desc: 'New ideas or updates in the marketplace' }
                    ].map((pref) => (
                      <div key={pref.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                        <div>
                          <p className="text-sm font-bold text-accent-dark dark:text-gray-200">{pref.label}</p>
                          <p className="text-[10px] text-gray-500">{pref.desc}</p>
                        </div>
                        <button 
                          onClick={() => {
                            const newPrefs = { ...profile.notificationPreferences, [pref.id]: !profile.notificationPreferences?.[pref.id] };
                            setProfile({ ...profile, notificationPreferences: newPrefs });
                          }}
                          className={`w-12 h-6 rounded-full p-1 transition-all ${profile.notificationPreferences?.[pref.id] !== false ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full transition-all ${profile.notificationPreferences?.[pref.id] !== false ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mentorship Settings */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 space-y-6 transition-colors">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-accent-dark dark:text-gray-100 flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-indigo-500" />
                      Mentorship Program
                    </h3>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{profile.isMentor ? 'Active' : 'Inactive'}</span>
                       <button 
                        onClick={() => setProfile({...profile, isMentor: !profile.isMentor})}
                        className={`w-12 h-6 rounded-full p-1 transition-all ${profile.isMentor ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-800'}`}
                       >
                         <div className={`w-4 h-4 bg-white rounded-full transition-all ${profile.isMentor ? 'translate-x-6' : 'translate-x-0'}`} />
                       </button>
                    </div>
                  </div>

                  {profile.isMentor && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-6 overflow-hidden"
                    >
                      <p className="text-xs text-gray-400 font-medium italic">Share your expertise and guide others in the community to success.</p>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mentor Bio (Pitch your experience)</label>
                        <textarea 
                          rows={3}
                          value={profile.mentorBio || ''}
                          onChange={(e) => setProfile({...profile, mentorBio: e.target.value})}
                          placeholder="What makes you a great mentor?"
                          className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-gray-700 focus:border-primary/20 outline-none transition-all text-sm dark:text-gray-200 resize-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Expertise Tags (Comma separated)</label>
                        <input 
                           value={(profile.mentorExpertise || []).join(', ')}
                           onChange={(e) => setProfile({...profile, mentorExpertise: e.target.value.split(',').map((s: string) => s.trim()).filter((s: string) => s)}) }
                           placeholder="Strategy, Development, Marketing, UI/UX"
                           className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-gray-700 focus:border-primary/20 outline-none transition-all text-sm dark:text-gray-200"
                        />
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {(profile.mentorExpertise || []).map((tag: string) => (
                            <span key={tag} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 text-[10px] font-black rounded-md uppercase">#{tag}</span>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <h4 className="text-[10px] font-black uppercase text-accent-dark dark:text-white tracking-[0.2em] mb-4">Availability & Slots</h4>
                        
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Available Days</label>
                          <div className="flex flex-wrap gap-2">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                              <button
                                key={day}
                                onClick={() => {
                                  const current = profile.mentorAvailability?.days || [];
                                  const next = current.includes(day) ? current.filter((d: string) => d !== day) : [...current, day];
                                  setProfile({
                                    ...profile,
                                    mentorAvailability: { ...profile.mentorAvailability, days: next }
                                  });
                                }}
                                className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all border ${profile.mentorAvailability?.days?.includes(day) ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 border-transparent'}`}
                              >
                                {day}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Preferred Time (e.g. 10AM - 2PM WAT)</label>
                          <input 
                            value={profile.mentorAvailability?.timeSlot || ''}
                            onChange={(e) => setProfile({
                              ...profile, 
                              mentorAvailability: { ...profile.mentorAvailability, timeSlot: e.target.value }
                            })}
                            placeholder="e.g. Evenings after 6PM"
                            className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-gray-700 focus:border-primary/20 outline-none transition-all text-sm dark:text-gray-200"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Social Connect */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 space-y-6 transition-colors">
                  <h3 className="font-bold text-accent-dark dark:text-gray-100 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-indigo-500" />
                    Social Media Handles
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <Twitter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                      <input 
                        placeholder="Twitter Username"
                        value={profile.twitter}
                        onChange={(e) => setProfile({...profile, twitter: e.target.value})}
                        className="w-full pl-12 pr-5 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-gray-700 focus:border-primary/20 outline-none transition-all text-sm dark:text-gray-200"
                      />
                    </div>
                    <div className="relative">
                      <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-700" />
                      <input 
                        placeholder="LinkedIn Profile URL"
                        value={profile.linkedin}
                        onChange={(e) => setProfile({...profile, linkedin: e.target.value})}
                        className="w-full pl-12 pr-5 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-gray-700 focus:border-primary/20 outline-none transition-all text-sm dark:text-gray-200"
                      />
                    </div>
                    <div className="relative">
                      <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-500" />
                      <input 
                        placeholder="Instagram Handle"
                        value={profile.instagram}
                        onChange={(e) => setProfile({...profile, instagram: e.target.value})}
                        className="w-full pl-12 pr-5 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-gray-700 focus:border-primary/20 outline-none transition-all text-sm dark:text-gray-200"
                      />
                    </div>
                    <div className="relative">
                      <Facebook className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600" />
                      <input 
                        placeholder="Facebook Profile"
                        value={profile.facebook}
                        onChange={(e) => setProfile({...profile, facebook: e.target.value})}
                        className="w-full pl-12 pr-5 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-gray-700 focus:border-primary/20 outline-none transition-all text-sm dark:text-gray-200"
                      />
                    </div>
                    <div className="relative md:col-span-2">
                      <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                      <input 
                        placeholder="WhatsApp Number (e.g. +234...)"
                        value={profile.whatsapp}
                        onChange={(e) => setProfile({...profile, whatsapp: e.target.value})}
                        className="w-full pl-12 pr-5 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-gray-700 focus:border-primary/20 outline-none transition-all text-sm dark:text-gray-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Bank Details */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 space-y-6 transition-colors">
                  <h3 className="font-bold text-accent-dark dark:text-gray-100 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-emerald-500" />
                    Remittance & Bank Details
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Add your Nigerian bank details to receive payments for sold concepts.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Bank Name</label>
                      <select 
                        value={profile.bank}
                        onChange={(e) => setProfile({...profile, bank: e.target.value})}
                        className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-gray-700 focus:border-primary/20 outline-none transition-all text-sm dark:text-gray-200 appearance-none"
                      >
                        <option value="">Select Bank</option>
                        {NIGERIAN_BANKS.map(bank => (
                          <option key={bank} value={bank}>{bank}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Account Number</label>
                      <input 
                        maxLength={10}
                        value={profile.accountNumber}
                        onChange={(e) => setProfile({...profile, accountNumber: e.target.value})}
                        placeholder="0000000000"
                        className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-gray-700 focus:border-primary/20 outline-none transition-all text-sm dark:text-gray-200"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Account Holder Name</label>
                      <input 
                        value={profile.accountName}
                        onChange={(e) => setProfile({...profile, accountName: e.target.value})}
                        placeholder="John Doe"
                        className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-xl focus:bg-white dark:focus:bg-gray-700 focus:border-primary/20 outline-none transition-all text-sm dark:text-gray-200"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      case 'profile':
        return (
          <ProfileView 
            profile={profile} 
            completenessScore={completenessScore} 
            userIdeas={userIdeas} 
            acceptedConnections={acceptedConnections} 
            addToast={addToast}
            onUpdateProfile={(updatedProfile) => setProfile(updatedProfile)}
          />
        );
      case 'post-concept':
        return <PostConceptView 
          addToast={addToast} 
          onBack={() => setActiveTab('dashboard')} 
          onAddIdea={onAddIdea} 
          profileComplete={completenessScore >= 100}
          profile={profile}
          user={user}
          setVerificationModalOpen={() => { /* In this version, we redirect to VerificationScreen, but we can set a state if we change it */ }}
          setKYCModalOpen={setIsKYCModalOpen}
        />;
      case 'messages':
        return <MessagesView 
          addToast={addToast} 
          currentUser={auth.currentUser} 
          profile={profile} 
          initialUser={selectedChatUser}
          onChatStarted={() => setSelectedChatUser(null)}
        />;
      case 'network':
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-accent-dark dark:text-gray-100">Professional Network</h2>
                <p className="text-gray-500 text-sm">Manage your collaborations and connect with top-tier technical talent.</p>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Search innovators..."
                  value={networkSearchTerm}
                  onChange={(e) => setNetworkSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl outline-none focus:border-primary/30 transition-all text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {/* Active Connections */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm transition-colors">
                  <h3 className="font-bold text-accent-dark dark:text-gray-100 mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-500" />
                    My Collaborators ({acceptedConnections.length})
                  </h3>
                  <div className="space-y-6">
                    {acceptedConnections.length > 0 ? (
                      acceptedConnections.map((conn, idx) => (
                        <div key={idx} className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-800">
                          <div 
                            className="flex items-center gap-4 cursor-pointer"
                            onClick={() => setSelectedUserForProfile(conn.otherUser)}
                          >
                            <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center font-bold text-primary overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm">
                              {conn.otherUser.avatar ? <img src={conn.otherUser.avatar} className="w-full h-full object-cover" /> : (conn.otherUser.name?.split(' ').map((n: string) => n[0]).join('') || '?')}
                            </div>
                            <div>
                              <p className="font-bold text-accent-dark dark:text-gray-200">{conn.otherUser.name}</p>
                              <p className="text-xs text-gray-500">{conn.otherUser.state || 'Innovator'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={() => {
                                setSelectedChatUser(conn.otherUser);
                                setActiveTab('messages');
                              }}
                              className="px-4 py-2 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 transition-colors flex items-center gap-2"
                            >
                              <MessageSquare className="w-3 h-3" />
                              Message
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/30 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                        <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                        <p className="text-gray-400 text-sm">No confirmed collaborators yet.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Directory */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm transition-colors">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-accent-dark dark:text-gray-100 flex items-center gap-2">
                      <Globe className="w-5 h-5 text-emerald-500" />
                      Social Directory
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredDirectory.length > 0 ? (
                      filteredDirectory.slice(0, 12).map((p, idx) => {
                        const isPendingOutgoing = pendingOutgoingIds.includes(p.id);
                        const isAccepted = acceptedConnectionIds.includes(p.id);
                        
                        return (
                          <div key={idx} className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-transparent hover:border-primary/10 transition-all group">
                            <div 
                              className="flex items-center gap-3 mb-4 cursor-pointer"
                              onClick={() => setSelectedUserForProfile(p)}
                            >
                              <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-700 flex items-center justify-center font-bold text-primary overflow-hidden border border-gray-100 dark:border-gray-600 shadow-sm">
                                {p.avatar ? <img src={p.avatar} className="w-full h-full object-cover" /> : (p.name?.split(' ').map((n: string) => n[0]).join('') || '?')}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-accent-dark dark:text-gray-200 truncate text-sm">{p.name}</p>
                                <p className="text-[10px] text-gray-500 truncate">{p.state || 'Innovator'}</p>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              {isAccepted ? (
                                <button className="flex-1 py-2 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-lg cursor-default flex items-center justify-center gap-2">
                                  <CheckCircle className="w-3 h-3" />
                                  Connected
                                </button>
                              ) : isPendingOutgoing ? (
                                <button className="flex-1 py-2 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-lg cursor-default flex items-center justify-center gap-2">
                                  <Clock className="w-3 h-3" />
                                  Requested
                                </button>
                              ) : (
                                <button 
                                  onClick={() => handleSendRequest(p.id)}
                                  className="flex-1 py-2 bg-primary text-white text-[10px] font-bold rounded-lg hover:bg-primary-hover shadow-lg shadow-primary/10 transition-all flex items-center justify-center gap-2"
                                >
                                  <Plus className="w-3 h-3" />
                                  Connect
                                </button>
                              )}
                              
                              <button
                                onClick={() => handleFollowToggle(p.id)}
                                className={`px-3 py-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                                  followingIds.includes(p.id)
                                    ? 'bg-gray-200 text-gray-600'
                                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                }`}
                              >
                                {followingIds.includes(p.id) ? <UserCheck className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
                                {followingIds.includes(p.id) ? 'Following' : 'Follow'}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 col-span-full">
                        <p className="text-gray-400 text-xs italic">No innovators found matching "{networkSearchTerm}"</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Pending Requests */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                  <h3 className="font-bold text-accent-dark dark:text-gray-100 mb-4 flex items-center justify-between">
                    Pending Requests
                    {pendingIncoming.length > 0 && (
                      <span className="text-[10px] font-black bg-rose-50 text-rose-500 px-2 py-0.5 rounded-full">{pendingIncoming.length}</span>
                    )}
                  </h3>
                  <div className="space-y-4">
                    {pendingIncoming.length > 0 ? (
                      pendingIncoming.map((req, i) => (
                        <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-transparent hover:border-primary/20 transition-all">
                          <div className="flex gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-700 flex items-center justify-center font-bold text-primary overflow-hidden shadow-sm border border-gray-100 dark:border-gray-600">
                              {req.otherUser.avatar ? <img src={req.otherUser.avatar} className="w-full h-full object-cover" /> : (req.otherUser.name?.split(' ').map((n: string) => n[0]).join('') || '?')}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-accent-dark dark:text-gray-200">{req.otherUser.name}</p>
                              <p className="text-[10px] text-gray-500">{req.otherUser.state || 'Innovator'}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleUpdateConnection(req.id, 'accepted')}
                              className="flex-1 py-1.5 bg-emerald-500 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-600 transition-colors"
                            >
                              Accept
                            </button>
                            <button 
                              onClick={() => handleUpdateConnection(req.id, 'rejected')}
                              className="flex-1 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-gray-400 text-xs italic">No pending requests</div>
                    )}
                  </div>
                </div>

                {/* Stats Card */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                  <h3 className="font-bold text-accent-dark dark:text-gray-100 mb-6">Network Stats</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Active Collaborators</span>
                      <span className="font-bold text-accent-dark dark:text-white">{acceptedConnections.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Incoming Requests</span>
                      <span className="font-bold text-indigo-500">{pendingIncoming.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Sent Requests</span>
                      <span className="font-bold text-amber-500">{pendingOutgoingIds.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      case 'ideas':
        return (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-accent-dark dark:text-gray-100">My Innovation Concepts</h2>
              {userIdeas.length > 0 && (
                <button 
                  onClick={() => setActiveTab('post-concept')}
                  className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-hover transition-all"
                >
                  Post New
                </button>
              )}
            </div>
            
            {userIdeas.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userIdeas.map((idea) => (
                  <IdeaCard 
                    key={idea.id} 
                    idea={idea} 
                    onDelete={(i) => setIdeaToDelete(i)}
                    onToggleSave={handleToggleSaveIdea}
                    isSaved={savedIdeaIds.includes(idea.id)} 
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col items-center justify-center p-24 text-center">
                <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                  <Lightbulb className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-accent-dark dark:text-gray-200 mb-2">No Active Innovation Listings</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-8">You haven't published any concepts yet. Your ideas only grow when they are shared!</p>
                <button 
                  onClick={() => setActiveTab('post-concept')}
                  className="px-8 py-3 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Post Your First Idea
                </button>
              </div>
            )}
          </div>
        );
      case 'marketplace':
        const combinedIdeas = [...allIdeas, ...SAMPLE_IDEAS];
        const filteredMarketplaceIdeas = combinedIdeas.filter(idea => {
          const matchesSearch = (idea.title?.toLowerCase() || "").includes(marketplaceSearchTerm.toLowerCase()) || 
                                (idea.description?.toLowerCase() || "").includes(marketplaceSearchTerm.toLowerCase());
          
          let matchesCategory = marketplaceCategory === 'All' || idea.category === marketplaceCategory;
          if (marketplaceCategory === 'Saved') {
            matchesCategory = savedIdeaIds.includes(idea.id);
          }
          
          return matchesSearch && matchesCategory;
        }).sort((a, b) => {
          if (marketplaceSortOption === 'price-low') {
            return (a.price || 0) - (b.price || 0);
          } else if (marketplaceSortOption === 'price-high') {
            return (b.price || 0) - (a.price || 0);
          } else if (marketplaceSortOption === 'oldest') {
            const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
            return dateA - dateB;
          } else {
            // newest first (default)
            const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
            return dateB - dateA;
          }
        });

        return (
          <div className="space-y-8 pb-12">
            <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
              <div className="relative z-10 max-w-2xl">
                <h2 className="text-4xl font-bold mb-4">The Global Innovation Marketplace</h2>
                <p className="text-indigo-100 text-lg mb-8">Trade high-impact Nigerian startup ideas or hire top-tier local technical talent to scale your vision.</p>
                <div className="flex gap-4">
                  <button onClick={() => {
                    const filterBar = document.getElementById('marketplace-filters');
                    if (filterBar) filterBar.scrollIntoView({ behavior: 'smooth' });
                  }} className="px-6 py-3 bg-white text-indigo-600 font-bold rounded-2xl shadow-lg transition-transform hover:scale-105 active:scale-95">Explore Listings</button>
                  <button onClick={() => setActiveTab('post-concept')} className="px-6 py-3 border-2 border-white text-white font-bold rounded-2xl hover:bg-white/10 transition-all">List Your Idea</button>
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div id="marketplace-filters" className="sticky top-[89px] z-20 bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur-md py-4 -mx-4 px-4 border-b border-gray-100 dark:border-gray-800 transition-colors">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search by title or keyword..."
                    value={marketplaceSearchTerm}
                    onChange={(e) => setMarketplaceSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all dark:text-gray-200"
                  />
                  {marketplaceSearchTerm && (
                    <button 
                      onClick={() => setMarketplaceSearchTerm('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-hidden">
                  <div className="relative">
                    <button 
                      className="h-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl flex items-center gap-2 text-xs font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                    >
                      <ArrowUpDown className="w-4 h-4 text-primary" />
                      <select 
                        value={marketplaceSortOption}
                        onChange={(e) => setMarketplaceSortOption(e.target.value)}
                        className="bg-transparent outline-none cursor-pointer pr-4 appearance-none"
                      >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                      </select>
                      <ChevronDown className="w-3 h-3 absolute right-3 pointer-events-none" />
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0 w-full md:w-auto">
                  {['All', 'Saved', 'Tech', 'Agriculture', 'Fashion', 'Education', 'Fintech', 'Health'].map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setMarketplaceCategory(cat)}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap uppercase tracking-wider ${marketplaceCategory === cat ? 'bg-primary text-white shadow-lg' : 'bg-white dark:bg-gray-900 text-gray-500 border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'} flex items-center gap-1.5`}
                    >
                      {cat === 'Saved' && <Heart className={`w-3 h-3 ${marketplaceCategory === 'Saved' ? 'fill-white' : 'text-rose-500 fill-rose-500'}`} />}
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {filteredMarketplaceIdeas.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMarketplaceIdeas.map((idea, index) => (
                  <IdeaCard 
                    key={idea.id || index} 
                    idea={idea} 
                    onInterest={handleInterest}
                    onToggleSave={handleToggleSaveIdea}
                    isSaved={savedIdeaIds.includes(idea.id)} 
                  />
                ))}
              </div>
            ) : (
              <div className="py-24 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                  <Search className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold dark:text-white mb-2">No results found</h3>
                <p className="text-gray-500 max-w-sm">We couldn't find any ideas matching "{marketplaceSearchTerm}" in {marketplaceCategory}.</p>
                <button 
                  onClick={() => { setMarketplaceSearchTerm(''); setMarketplaceCategory('All'); }}
                  className="mt-6 text-primary font-bold hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        );
      case 'wallet':
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Main Balance Card */}
              <div className="flex-1 bg-gradient-to-br from-primary to-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-primary/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
                <div className="relative z-10 flex flex-col h-full justify-between min-h-[240px]">
                  <div>
                    <div className="flex justify-between items-center mb-8">
                      <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                        <Wallet className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full backdrop-blur-md">Secure Wallet</span>
                    </div>
                    <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Available Balance</p>
                    <h2 className="text-5xl font-black tracking-tighter">{formatNGN(wallet.balance)}</h2>
                  </div>
                  <div className="flex gap-4 mt-8">
                    <button 
                      onClick={() => handleWalletFunding(10000)}
                      className="flex-1 py-4 bg-white text-primary font-bold rounded-2xl hover:scale-[1.02] transition-all shadow-xl"
                    >
                      Add Funds
                    </button>
                    <button 
                      onClick={() => setIsWithdrawModalOpen(true)}
                      className="flex-1 py-4 bg-white/20 backdrop-blur-md text-white font-bold rounded-2xl hover:bg-white/30 transition-all"
                    >
                      Withdraw
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Info / Security */}
              <div className="w-full md:w-80 space-y-4">
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                  <h4 className="font-bold text-accent-dark dark:text-gray-100 mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Security Info
                  </h4>
                  <ul className="space-y-3">
                    <li className="flex gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed">Encrypted PCI-DSS compliant payment processing.</p>
                    </li>
                    <li className="flex gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed">Instant funding via Card or Bank Transfer.</p>
                    </li>
                  </ul>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-3xl p-6 border border-amber-100 dark:border-amber-800">
                  <p className="text-[10px] text-amber-800 dark:text-amber-400 font-bold leading-relaxed">
                    Note: Transfers may take up to 3 minutes to reflect in your wallet during peak hours.
                  </p>
                </div>
              </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
               <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
                 <h3 className="font-bold text-xl text-accent-dark dark:text-gray-100">Transaction History</h3>
                 <button className="text-xs font-bold text-primary hover:bg-primary/5 px-4 py-2 rounded-xl transition-all">Download CSV</button>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead>
                     <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                       <th className="px-8 py-4 text-[10px] uppercase font-black tracking-widest text-gray-400">Reference</th>
                       <th className="px-8 py-4 text-[10px] uppercase font-black tracking-widest text-gray-400">Method</th>
                       <th className="px-8 py-4 text-[10px] uppercase font-black tracking-widest text-gray-400">Amount</th>
                       <th className="px-8 py-4 text-[10px] uppercase font-black tracking-widest text-gray-400">Status</th>
                       <th className="px-8 py-4 text-[10px] uppercase font-black tracking-widest text-gray-400">Date</th>
                     </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {transactions.length > 0 ? (
                        transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                            <td className="px-8 py-6 text-sm font-bold text-accent-dark dark:text-gray-200">#{tx.reference.substring(0, 12)}...</td>
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                  {tx.method === 'card' ? <CreditCard className="w-3 h-3 text-primary" /> : <Building2 className="w-3 h-3 text-indigo-500" />}
                                </div>
                                <span className="text-xs font-medium text-gray-500 capitalize">{tx.method}</span>
                              </div>
                            </td>
                            <td className="px-8 py-6 text-sm font-black text-accent-dark dark:text-white">{formatNGN(tx.amount)}</td>
                            <td className="px-8 py-6">
                              <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-widest ${
                                tx.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 
                                tx.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                              }`}>
                                {tx.status}
                              </span>
                            </td>
                            <td className="px-8 py-6 text-xs text-gray-400">
                              {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString() : 'Recent'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                          <td className="px-8 py-6 text-sm font-bold text-accent-dark dark:text-gray-200">#TRX123456...</td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-2">
                               <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                 <CreditCard className="w-3 h-3 text-gray-400" />
                               </div>
                               <span className="text-xs font-medium text-gray-500">Virtual Terminal</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-sm font-black text-accent-dark dark:text-white">₦0.00</td>
                          <td className="px-8 py-6">
                             <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] font-black rounded-full uppercase tracking-widest">No History</span>
                          </td>
                          <td className="px-8 py-6 text-xs text-gray-400">May 11, 2024</td>
                        </tr>
                      )}
                    </tbody>
                 </table>
               </div>
            </div>
          </motion.div>
        );
      case 'interests':
        return (
          <div className="space-y-8 pb-12">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-6 dark:text-white">Interests Received</h2>
              <div className="space-y-4">
                {interests.length > 0 ? (
                  interests.map((interest: any) => (
                    <motion.div 
                      key={interest.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center font-bold text-primary group-hover:scale-110 transition-transform">
                          {interest.interestedUserName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold dark:text-white">{interest.interestedUserName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Interested in: <span className="text-primary font-semibold font-heading">"{interest.ideaTitle}"</span></p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setSelectedChatUser({
                              id: interest.interestedUserId,
                              name: interest.interestedUserName,
                            });
                            setActiveTab('messages');
                          }}
                          className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover transition-colors"
                        >
                          Message Back
                        </button>
                        <button 
                          onClick={() => {
                            // Update status to 'contacted'
                            setDoc(doc(db, 'interests', interest.id), { status: 'contacted' }, { merge: true });
                            addToast("Status updated to contacted", "success");
                          }}
                          className="px-4 py-2 border border-gray-100 dark:border-gray-800 text-xs font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          Mark as Contacted
                        </button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-20 text-center bg-gray-50 dark:bg-gray-800/50 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
                    <p className="text-gray-500 dark:text-gray-400">No one has shown interest in your ideas yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'dashboard':
      default:
        return (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-accent-dark dark:text-white mb-1">Welcome back, {profile.name} 👋</h1>
                <p className="text-gray-500 dark:text-gray-400">You're just starting your journey. <span className="text-primary font-bold">Post your first idea</span> to get noticed!</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleRefresh}
                  className="p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm text-gray-400 hover:text-primary transition-all active:scale-95"
                >
                  <Zap className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
                </button>
                <button 
                  onClick={() => setActiveTab('post-concept')}
                  className="px-6 py-3 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all flex items-center gap-2 active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                  Post New Concept
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm flex flex-col justify-between transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-2xl bg-primary/10 text-primary`}>
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Wallet Balance</span>
                    <h3 className="text-2xl font-black text-accent-dark dark:text-white mt-1">{formatNGN(wallet.balance)}</h3>
                  </div>
                </div>
                <button 
                  onClick={() => handleWalletFunding(5000)}
                  className="w-full py-2 bg-primary text-white text-[10px] font-bold rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-3 h-3" />
                  Fund Wallet
                </button>
              </div>
              <DashboardStatCard 
                label="Active Ideas" 
                value={userIdeas.length.toString()} 
                trend={userIdeas.length > 0 ? 100 : 0} 
                icon={Lightbulb} 
                color="bg-amber-100 text-amber-600" 
              />
              <DashboardStatCard 
                label="Networking" 
                value={connections.length.toString()} 
                trend={connections.length > 0 ? 15 : 0} 
                icon={Users} 
                color="bg-indigo-100 text-indigo-600" 
              />
              <DashboardStatCard 
                label="Marketplace Reach" 
                value={interests.length.toString()} 
                trend={interests.length > 0 ? interests.length * 5 : 0} 
                icon={TrendingUp} 
                color="bg-emerald-100 text-emerald-600" 
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Column: Active Ideas */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-colors">
                  <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
                    <h3 className="font-bold text-accent-dark dark:text-gray-100 flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-primary" />
                      My Active Listings
                    </h3>
                    <button onClick={() => setActiveTab('ideas')} className="text-xs font-bold text-primary hover:underline">View All</button>
                  </div>
                  
                  {userIdeas.length > 0 ? (
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userIdeas.slice(0, 4).map((idea) => (
                        <IdeaCard 
                          key={idea.id} 
                          idea={idea} 
                          onDelete={(i) => setIdeaToDelete(i)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="p-24 text-center flex flex-col items-center">
                      <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                        <Plus className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                      </div>
                      <h4 className="font-bold text-accent-dark dark:text-gray-200 mb-2">No Active Listings Yet</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">Stop observing, start building! Post your first innovation to see it here and start receiving offers.</p>
                      <button 
                        onClick={() => setActiveTab('post-concept')}
                        className="px-6 py-2.5 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm"
                      >
                        Post Your First Concept
                      </button>
                    </div>
                  )}
                </div>

                {/* Recent Activity Mini Feed */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 transition-colors">
                  <h3 className="font-bold text-accent-dark dark:text-gray-100 mb-6 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" />
                    Marketplace Feed
                  </h3>
                  <div className="space-y-6">
                    {[
                      { type: 'SOLD', idea: 'Solarify API', value: '₦450k', user: 'Victor T.', time: '2h ago', icon: ShoppingBag, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30' },
                      { type: 'LISTED', idea: 'Adire Digital VR', value: '₦85k', user: 'Fatima B.', time: '5h ago', icon: Lightbulb, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' },
                      { type: 'INTEREST', idea: 'MediLog Trace', user: 'Dr. Kunle', time: '8h ago', icon: Heart, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/30' },
                    ].map((item, idx) => (
                      <div key={idx} className="flex gap-4 items-start pb-4 border-b border-gray-50 dark:border-gray-800 last:border-0 last:pb-0">
                        <div className={`p-2.5 rounded-xl ${item.color}`}>
                          <item.icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <p className="text-xs font-bold text-accent-dark dark:text-gray-200">
                              <span className="text-primary">{item.user}</span> {item.type === 'SOLD' ? 'sold' : item.type === 'LISTED' ? 'just listed' : 'is interested in'} <span className="text-primary">"{item.idea}"</span>
                            </p>
                            <span className="text-[10px] text-gray-400 font-bold ml-2 whitespace-nowrap">{item.time}</span>
                          </div>
                          {item.value && <p className="text-[10px] font-black text-emerald-600 mt-1">Transaction Value: {item.value}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setActiveTab('marketplace')} className="w-full mt-6 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-[10px] font-bold text-gray-400 hover:text-primary transition-all uppercase tracking-widest">
                    View Global Activity
                  </button>
                </div>
              </div>

              {/* Side Column: Recommendations & Network */}
              <div className="space-y-8">
                <div className="bg-accent-dark rounded-3xl p-6 text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-primary/40 transition-colors" />
                  <h3 className="font-bold mb-4 relative z-10 flex items-center gap-2">
                    <Star className="w-4 h-4 text-secondary" />
                    Innovation Network
                  </h3>
                  <div className="flex -space-x-3 mb-4 relative z-10">
                    <div className="w-10 h-10 rounded-full border-2 border-accent-dark bg-secondary flex items-center justify-center text-[10px] font-bold text-accent-dark overflow-hidden">
                      {profile.avatar ? (
                        <img src={profile.avatar} alt="Me" className="w-full h-full object-cover" />
                      ) : (
                        profile.name.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="w-10 h-10 rounded-full border-2 border-accent-dark bg-white/10 flex items-center justify-center text-[10px] font-bold backdrop-blur-sm">+{ideas.length > 0 ? ideas.length * 2 : 0}</div>
                  </div>
                  <p className="text-xs text-white/60 mb-6 relative z-10 leading-relaxed">
                    {ideas.length > 0 
                      ? "Great progress! Keep sharing and connecting to reach more potential collaborators."
                      : "Start connecting with founders and engineers to grow your innovation score."}
                  </p>
                  
                  <div className="relative z-10">
                    <button 
                      onClick={() => setShowNetworkMenu(!showNetworkMenu)}
                      className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                    >
                      {showNetworkMenu ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      Expand Your Network
                    </button>
                    
                    <AnimatePresence>
                      {showNetworkMenu && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl shadow-xl overflow-hidden"
                        >
                          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 hover:bg-gray-50 text-gray-700 transition-colors">
                            <Twitter className="w-4 h-4 text-blue-400" />
                            <span className="text-xs font-bold">Twitter Connection</span>
                          </a>
                          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 hover:bg-gray-50 text-gray-700 border-t border-gray-100 transition-colors">
                            <Linkedin className="w-4 h-4 text-blue-700" />
                            <span className="text-xs font-bold">LinkedIn Business</span>
                          </a>
                          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 hover:bg-gray-50 text-gray-700 border-t border-gray-100 transition-colors">
                            <Instagram className="w-4 h-4 text-pink-500" />
                            <span className="text-xs font-bold">Instagram Showcase</span>
                          </a>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm p-8 transition-colors">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-accent-dark dark:text-white flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      Growth Roadmap
                    </h3>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{tasks.filter(t => t.completed).length}/{tasks.length} Done</span>
                  </div>
                  <div className="space-y-2">
                    {tasks.map(task => (
                      <TaskItem 
                        key={task.id} 
                        title={task.title} 
                        completed={task.completed} 
                        reminder={task.reminder}
                        onToggle={() => toggleTask(task.id)} 
                        onReminder={(e) => { e.stopPropagation(); setTaskToRemind(task); }}
                      />
                    ))}
                  </div>
                  <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold leading-relaxed">
                      Completing your roadmap tokens unlocks "Top Innovator" badge and priority listing.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                  <h3 className="font-bold text-accent-dark mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Recommended Talent
                  </h3>
                  <div className="space-y-6">
                    {SAMPLE_SKILLS.slice(0, 2).map((talent, idx) => (
                      <div key={idx} className="flex gap-4 items-center">
                        <div className={`w-12 h-12 rounded-2xl ${talent.bgColor} flex items-center justify-center font-bold ${talent.textColor}`}>
                          {talent.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-accent-dark truncate">{talent.name}</p>
                          <p className="text-xs text-gray-400">{talent.role}</p>
                        </div>
                        <button className="p-2 border border-gray-100 rounded-xl hover:text-primary transition-all">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setActiveTab('marketplace')} className="w-full mt-6 py-3 border-2 border-gray-50 text-gray-500 hover:border-primary/20 hover:text-primary hover:bg-primary/5 rounded-2xl text-xs font-bold transition-all uppercase tracking-widest">
                    Browse Talent
                  </button>
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen transition-colors duration-300">
      <DashboardSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={onLogout} 
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        profile={profile}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        unreadCount={totalUnreadMessages}
        notificationCount={unreadNotificationsCount}
      />
      
      <main className="lg:ml-64 min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-4 lg:px-8 py-4 flex items-center justify-between transition-colors">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-500" />
            </button>
            <div className="relative w-48 md:w-96 group hidden sm:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search concepts, talent, or market data..."
              value={globalSearchTerm}
              onChange={(e) => {
                setGlobalSearchTerm(e.target.value);
                setShowGlobalSearch(e.target.value.length > 0);
              }}
              onFocus={() => globalSearchTerm.length > 0 && setShowGlobalSearch(true)}
              className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-2.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none dark:text-gray-200"
            />

            <AnimatePresence>
              {showGlobalSearch && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden z-50"
                  onMouseLeave={() => setShowGlobalSearch(false)}
                >
                  <div className="p-4 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Search Results</span>
                    <button onClick={() => setShowGlobalSearch(false)} className="text-gray-400 hover:text-rose-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="max-h-[70vh] overflow-y-auto no-scrollbar py-2">
                    {/* Filter local ideas, sample ideas and some talent records */}
                    {[...userIdeas, ...SAMPLE_IDEAS, ...allIdeas]
                      .filter(idea => 
                        idea.title.toLowerCase().includes(globalSearchTerm.toLowerCase()) || 
                        idea.description.toLowerCase().includes(globalSearchTerm.toLowerCase()) ||
                        idea.category.toLowerCase().includes(globalSearchTerm.toLowerCase())
                      )
                      .slice(0, 6)
                      .map((result, idx) => (
                        <button 
                          key={idx}
                          onClick={() => {
                            setActiveTab('marketplace');
                            // We could also implement a "Jump to" feature here
                            setMarketplaceSearchTerm(result.title);
                            setGlobalSearchTerm('');
                            setShowGlobalSearch(false);
                          }}
                          className="w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-4 text-left transition-colors"
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${getCategoryColor(result.category)}`}>
                            {result.category[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-accent-dark dark:text-gray-100 truncate">{result.title}</p>
                            <p className="text-[10px] text-gray-500 truncate">{result.description}</p>
                          </div>
                        </button>
                      ))}
                    
                    {/* Sample Talent Results */}
                    {globalSearchTerm.toLowerCase().includes('dev') || globalSearchTerm.toLowerCase().includes('design') || globalSearchTerm.toLowerCase().includes('talent') ? (
                      <div className="border-t border-gray-50 dark:border-gray-800 mt-2 pt-2">
                        <div className="px-4 py-2 text-[10px] font-bold text-primary uppercase tracking-widest">Recommended Talent</div>
                        {SAMPLE_SKILLS.slice(0, 3).map((talent, idx) => (
                          <button 
                            key={idx}
                            onClick={() => {
                              setActiveTab('marketplace');
                              setGlobalSearchTerm('');
                              setShowGlobalSearch(false);
                            }}
                            className="w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-4 text-left transition-colors"
                          >
                            <div className={`w-10 h-10 rounded-xl ${talent.bgColor} flex items-center justify-center font-bold text-xs ${talent.textColor}`}>
                              {talent.initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-accent-dark dark:text-gray-100">{talent.name}</p>
                              <p className="text-[10px] text-gray-500">{talent.role} • {talent.location}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {globalSearchTerm.length > 0 && (
                      <button 
                        onClick={() => {
                          setActiveTab('marketplace');
                          setMarketplaceSearchTerm(globalSearchTerm);
                          setGlobalSearchTerm('');
                          setShowGlobalSearch(false);
                        }}
                        className="w-full py-4 mt-2 bg-primary/5 hover:bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest transition-all"
                      >
                        Explore all marketplace results for "{globalSearchTerm}"
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Market Open</span>
            </div>

            <button 
              onClick={() => setActiveTab('notifications')}
              className={`relative p-2 rounded-xl transition-all ${activeTab === 'notifications' ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-400 hover:text-accent-dark dark:hover:text-gray-200'}`}
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-primary text-white text-[8px] flex items-center justify-center rounded-full ring-2 ring-white dark:ring-gray-900 font-bold">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            <button 
              onClick={() => setActiveTab('messages')}
              className={`relative p-2 rounded-xl transition-all ${activeTab === 'messages' ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-400 hover:text-accent-dark dark:hover:text-gray-200'}`}
            >
              <MessageSquare className="w-5 h-5" />
              {totalUnreadMessages > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-emerald-500 text-white text-[8px] flex items-center justify-center rounded-full ring-2 ring-white dark:ring-gray-900 font-bold">
                  {totalUnreadMessages}
                </span>
              )}
            </button>

            <div className="h-8 w-px bg-gray-100 dark:bg-gray-800 hidden sm:block mx-2" />

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveTab('settings')}
                className="flex items-center gap-3 p-1 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center font-bold text-accent-dark ring-2 ring-white dark:ring-gray-900 overflow-hidden">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt="Me" className="w-full h-full object-cover shadow-inner" />
                  ) : (
                    profile.name.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-black text-accent-dark dark:text-white leading-none pb-1">{profile.name}</p>
                  <p className="text-[10px] font-bold text-gray-400 capitalize bg-gray-50 dark:bg-gray-800 px-1.5 py-0.5 rounded-md">Innovator</p>
                </div>
              </button>

              <button 
                onClick={onLogout}
                className="p-2.5 rounded-xl text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all group"
                title="Log Out"
              >
                <LogOut className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
              </button>
            </div>
        </div>
      </header>

        {/* Dashboard Content */}
        <div className={`${activeTab === 'messages' ? 'p-0 sm:p-4 md:p-8' : 'p-4 sm:p-8'} max-w-7xl mx-auto`}>
          {profile.kycStatus === 'verified' || activeTab === 'messages' ? null : (
            <KYCBanner onVerifyClick={() => setIsKYCModalOpen(true)} />
          )}
          {renderTabContent()}
        </div>
      </main>

      <KYCModal 
        isOpen={isKYCModalOpen}
        onClose={() => setIsKYCModalOpen(false)}
        userId={auth.currentUser?.uid || ''}
        onVerified={() => {
          addToast("Identity verified successfully!", "success");
        }}
      />

      <PaymentGateway 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        amount={paymentAmount}
        onSuccess={handlePaymentSuccess}
        addToast={addToast}
        idea={pendingInterestIdea}
      />

      <WithdrawModal 
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        onSuccess={handleWithdrawalSuccess}
        balance={wallet.balance}
        profile={profile}
        addToast={addToast}
      />

      <ConfirmationModal 
        isOpen={!!ideaToDelete}
        onClose={() => setIdeaToDelete(null)}
        onConfirm={handleDeleteIdea}
        title="Delete Idea"
        message={`Are you sure you want to delete "${ideaToDelete?.title}"? This action is permanent and cannot be undone.`}
        confirmText="Yes, Delete"
        cancelText="Keep Idea"
        isDanger={true}
        isLoading={isDeletingIdea}
      />

      <ReminderModal
        isOpen={!!taskToRemind}
        onClose={() => setTaskToRemind(null)}
        taskTitle={taskToRemind?.title || ''}
        currentReminder={taskToRemind?.reminder}
        onSave={saveReminder}
      />

      <IdeaDetailsModal 
        isOpen={!!viewingIdea}
        onClose={() => setViewingIdea(null)}
        idea={viewingIdea}
        currentUserId={auth.currentUser?.uid}
        onConfirm={handleInitiateInterest}
      />

      <PublicProfileModal
        isOpen={!!selectedUserForProfile}
        onClose={() => setSelectedUserForProfile(null)}
        user={selectedUserForProfile}
        isFollowing={followingIds.includes(selectedUserForProfile?.id || '')}
        onFollow={() => handleFollowToggle(selectedUserForProfile?.id || '')}
        onConnect={() => handleSendRequest(selectedUserForProfile?.id || '')}
        isConnected={acceptedConnectionIds.includes(selectedUserForProfile?.id || '')}
        isConnectPending={pendingOutgoingIds.includes(selectedUserForProfile?.id || '')}
        onToggleSaveIdea={handleToggleSaveIdea}
        savedIdeaIds={savedIdeaIds}
        allUsers={allUsers}
        currentUserAcceptedIds={acceptedConnectionIds}
      />
    </div>
  );
};

interface NavbarProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const Navbar = ({ onOpenAuth, isDarkMode, toggleDarkMode }: NavbarProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 w-full z-40 transition-all duration-300 ${
      isScrolled 
        ? 'py-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-md border-b dark:border-gray-800' 
        : 'py-5 bg-transparent'
    }`}>
      <div className="container mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg">
            <Lightbulb className="w-6 h-6 text-secondary" />
          </div>
          <span className={`text-xl font-heading font-extrabold ${isScrolled ? 'text-primary' : 'text-white'}`}>
            IdeaConnect <span className="text-secondary">NG</span>
          </span>
        </div>

        {/* Desktop Links */}
        <div className={`hidden md:flex items-center gap-8 font-medium ${isScrolled ? 'text-accent-dark dark:text-gray-200' : 'text-white'}`}>
          <a href="#home" className="hover:text-secondary transition-colors">Home</a>
          <a href="#explore" className="hover:text-secondary transition-colors">Explore Ideas</a>
          <a href="#skills" className="hover:text-secondary transition-colors">Skills</a>
          <a href="#marketplace" className="hover:text-secondary transition-colors">Marketplace</a>
          <a href="#community" className="hover:text-secondary transition-colors">Community</a>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <button className={`p-2 rounded-full transition-colors ${isScrolled ? 'text-accent-dark dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800' : 'text-white hover:bg-white/10'}`}>
            <Bell className="w-5 h-5" />
          </button>
          
          <button 
            onClick={() => onOpenAuth('login')}
            className={`px-5 py-2 rounded-btn font-heading font-semibold transition-all ${isScrolled ? 'border-2 border-primary text-primary hover:bg-primary hover:text-white' : 'border-2 border-white/30 text-white hover:bg-white/10'}`}
          >
            Log In
          </button>
          <button 
            onClick={() => onOpenAuth('register')}
            className="px-5 py-2 rounded-btn font-heading font-semibold bg-primary text-white hover:bg-primary-hover transition-all shadow-lg hover:shadow-primary/20"
          >
            Get Started Free
          </button>
        </div>

        {/* Mobile Toggle */}
        <div className="flex items-center gap-4 md:hidden">
          <button 
            className="p-2 text-current"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6 text-accent-dark dark:text-gray-100" /> : <Menu className={`w-6 h-6 ${isScrolled ? 'text-accent-dark dark:text-gray-100' : 'text-white'}`} />}
          </button>
        </div>
      </div>


      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden absolute top-full left-0 w-full bg-white shadow-xl border-t border-gray-100 flex flex-col p-6 gap-6 text-accent-dark font-medium"
          >
            <a href="#home" onClick={() => setMobileMenuOpen(false)}>Home</a>
            <a href="#explore" onClick={() => setMobileMenuOpen(false)}>Explore Ideas</a>
            <a href="#skills" onClick={() => setMobileMenuOpen(false)}>Skills</a>
            <a href="#marketplace" onClick={() => setMobileMenuOpen(false)}>Marketplace</a>
            <a href="#community" onClick={() => setMobileMenuOpen(false)}>Community</a>
            <div className="flex flex-col gap-3 pt-4 border-t border-gray-100">
              <button 
                onClick={() => { setMobileMenuOpen(false); onOpenAuth('login'); }}
                className="w-full py-3 rounded-btn border-2 border-primary text-primary font-heading font-semibold"
              >
                Log In
              </button>
              <button 
                onClick={() => { setMobileMenuOpen(false); onOpenAuth('register'); }}
                className="w-full py-3 rounded-btn bg-primary text-white font-heading font-semibold"
              >
                Get Started Free
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

interface AnimatedCounterProps {
  value: string;
  suffix?: string;
}

const AnimatedCounter = ({ value, suffix = "" }: AnimatedCounterProps) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      let start = 0;
      const end = parseInt(value.replace(/,/g, ''));
      const duration = 2000;
      const increment = end / (duration / 16);
      
      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setCount(end);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 16);
      return () => clearInterval(timer);
    }
  }, [isInView, value]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}{suffix}
    </span>
  );
};

interface IdeaCardProps {
  idea: any;
  onInterest?: (idea: any) => void;
  onDelete?: (idea: any) => void;
  onToggleSave?: (idea: any) => void;
  isSaved?: boolean;
  key?: React.Key;
}

const IdeaCard = ({ idea, onInterest, onDelete, onToggleSave, isSaved }: IdeaCardProps) => {
  const [imgError, setImgError] = useState(false);

  const creatorName = idea.creatorName || idea.creator?.name || 'Innovator';
  const creatorInitials = idea.creator?.initials || creatorName.substring(0, 2).toUpperCase();
  const location = idea.creator?.location || 'Nigeria';
  const verified = idea.creator?.verified || false;

  const isCommunity = !!idea.id && typeof idea.id === 'string';

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onInterest) {
      onInterest(idea);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white dark:bg-gray-900 p-6 rounded-card shadow-subtle idea-card-hover border border-gray-100 dark:border-gray-800 flex flex-col h-full transition-colors relative"
      onClick={() => onInterest && onInterest(idea)}
    >
      {onDelete && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(idea); }}
          className="absolute top-6 right-6 p-2 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all z-20 group"
        >
          <Trash2 className="w-4 h-4 transition-transform group-hover:scale-110" />
        </button>
      )}
      {isCommunity && (
        <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-primary/20 z-20">
          <Globe className="w-3 h-3" />
          Community
        </div>
      )}

      {/* Idea Image Preview */}
      <div className="relative h-48 -mx-6 -mt-6 mb-6 overflow-hidden bg-gray-100 dark:bg-gray-800 rounded-t-card group/img">
        {idea.image && !imgError ? (
          <img 
            src={idea.image} 
            alt={idea.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" 
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600 transition-colors">
            <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm mb-2">
              <Lightbulb className="w-8 h-8 text-primary/40" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider opacity-50">Image Unavailable</span>
          </div>
        )}
        
        {/* Gallery Badge */}
        {idea.images && idea.images.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1.5 z-10">
            <Image className="w-3 h-3 text-white" />
            <span className="text-[10px] font-bold text-white leading-none">{idea.images.length}</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end p-6">
           <button 
             onClick={handlePreviewClick}
             className="text-white text-xs font-bold flex items-center gap-1.5 hover:scale-105 transition-transform"
           >
             <Eye className="w-4 h-4" /> Quick Preview
           </button>
        </div>
        <div className="absolute top-4 right-4">
          <span className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider backdrop-blur-md shadow-lg ${getCategoryColor(idea.category)}`}>
            {idea.category}
          </span>
        </div>
      </div>
      
      <div className="flex-1">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-black leading-tight dark:text-white group-hover:text-primary transition-colors cursor-pointer">{idea.title}</h3>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <div className="text-primary font-black text-xs px-2 py-1 bg-primary/10 rounded-lg">
            {idea.price === "Free" ? "VIEW ACCESS" : `₦${idea.price}`}
          </div>
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest border border-gray-100 dark:border-gray-800 px-2 py-1 rounded-lg">
            {idea.tags?.[0] || 'Innovation'}
          </div>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 line-clamp-2 leading-relaxed">{idea.description}</p>
      </div>
      
      <div className="flex items-center gap-3 mb-6 pt-4 border-t border-gray-50 dark:border-gray-800">
        {idea.creatorAvatar ? (
          <img src={idea.creatorAvatar} className="w-10 h-10 rounded-full object-cover" alt={creatorName} />
        ) : (
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-accent-dark font-bold">
            {creatorInitials}
          </div>
        )}
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <h5 className="text-sm font-semibold dark:text-white">{creatorName}</h5>
            {verified && <CheckCircle className="w-3.5 h-3.5 text-blue-500 fill-blue-500 text-white" />}
          </div>
          <span className="text-xs text-gray-500">{location}, NG</span>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-6">
        {(idea.tags || []).map((tag: string) => (
          <span key={tag} className="text-[10px] text-primary font-medium tracking-wide">#{tag}</span>
        ))}
      </div>
      
      <div className="flex gap-2">
        <button 
          onClick={() => onToggleSave?.(idea)}
          className={`p-2.5 rounded-xl border transition-all ${isSaved ? 'bg-rose-50 border-rose-100 text-rose-500' : 'border-gray-100 dark:border-gray-800 text-gray-400 hover:text-rose-500'}`}
        >
          <Heart className={`w-5 h-5 ${isSaved ? 'fill-rose-500' : ''}`} />
        </button>
        {onInterest && (
          <button 
            onClick={() => onInterest(idea)}
            className="flex-1 py-3 bg-accent-dark dark:bg-gray-800 text-white font-bold rounded-xl text-sm hover:bg-black transition-all active:scale-95"
          >
            I'm Interested
          </button>
        )}
      </div>
    </motion.div>
  );
};
      
interface SkillCardProps {
  key?: React.Key;
  skill: {
    initials: string;
    name: string;
    role: string;
    location: string;
    rating: string;
    price: string;
    tags: string[];
    online: boolean;
    bgColor: string;
    textColor: string;
  };
}

const SkillCard = ({ skill }: SkillCardProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="bg-white p-6 rounded-card border border-gray-100 text-center relative group overflow-hidden"
    >
      <div className={`absolute top-4 right-4 w-2.5 h-2.5 rounded-full ring-4 ring-green-100 ${skill.online ? 'bg-green-500' : 'bg-gray-300'}`} />
      
      <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold ring-4 ring-gray-50 transition-transform duration-300 group-hover:scale-110 ${skill.bgColor} ${skill.textColor}`}>
        {skill.initials}
      </div>
      
      <h4 className="text-lg font-bold text-accent-dark">{skill.name}</h4>
      <p className="text-primary font-medium text-sm mb-1">{skill.role}</p>
      <p className="text-gray-500 text-xs mb-3">{skill.location}, NG</p>
      
      <div className="flex items-center justify-center gap-1 text-secondary mb-4">
        <Star className="w-4 h-4 fill-secondary" />
        <Star className="w-4 h-4 fill-secondary" />
        <Star className="w-4 h-4 fill-secondary" />
        <Star className="w-4 h-4 fill-secondary" />
        <Star className="w-4 h-4 fill-secondary" />
        <span className="text-accent-dark font-bold text-sm ml-1">{skill.rating}</span>
      </div>
      
      <div className="text-xs text-primary font-medium mb-4 flex gap-1 justify-center">
        {skill.tags.map(t => <span key={t}>• {t} </span>)}
      </div>
      
      <div className="pt-4 border-t border-gray-50 mb-4">
        <p className="text-xs text-gray-500">Starting from</p>
        <p className="text-lg font-bold text-accent-dark">₦{skill.price}/hr</p>
      </div>
      
      <div className="flex gap-2">
        <button className="flex-1 py-2 bg-primary text-white rounded-btn text-sm font-semibold hover:bg-primary-hover transition-colors">Hire Me</button>
        <button className="w-10 flex items-center justify-center border-2 border-primary text-primary rounded-btn hover:bg-primary hover:text-white transition-colors">
          <MessageCircle className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

// --- Data ---

const SAMPLE_IDEAS = [
  {
    id: 'sample-1',
    category: 'Agriculture',
    price: '250,000',
    title: 'FarmDirect NG — Smart Cold Chain Logistics',
    description: 'A logistics platform that provides IoT-monitored refrigerated trucks to rural farmers, ensuring zero spoilage from farm to urban markets.',
    creatorId: 'sample-innovator-system',
    creator: { initials: 'EO', name: 'Emeka O.', location: 'Anambra', verified: true },
    tags: ['agritech', 'iot', 'logistics'],
    image: 'https://images.unsplash.com/photo-1595841055318-461449830c6d?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1595841055318-461449830c6d?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1574944971675-47065961d368?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1586771107445-d3ca888129ee?auto=format&fit=crop&q=80&w=800'
    ]
  },
  {
    id: 'sample-2',
    category: 'Fashion',
    price: '18,500',
    title: 'Adire Digital — VR Textile Showcase',
    description: 'A platform for Adire artisans to showcase their patterns in 3D/VR, allowing international buyers to visualize garments before shipping.',
    creator: { initials: 'FB', name: 'Fatima B.', location: 'Kano', verified: false },
    tags: ['ecommerce', 'vr', 'artisan'],
    image: 'https://images.unsplash.com/photo-1523450001312-daa4e2e2ecf5?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1523450001312-daa4e2e2ecf5?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&q=80&w=800'
    ]
  },
  {
    id: 'sample-3',
    category: 'Education',
    price: 'Free',
    title: 'EduBridge — AI Parent-Teacher Assistant',
    description: 'A platform that uses AI to translate curriculum materials into localized dialects (Yoruba, Igbo, Hausa) for better parent engagement.',
    creator: { initials: 'TA', name: 'Tunde A.', location: 'Osun', verified: true },
    tags: ['edtech', 'ai', 'impact'],
    image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=800'
    ]
  },
  {
    id: 'sample-4',
    category: 'Fintech',
    price: '450,000',
    title: 'QuickRemit — Solana-based Cross-border Tool',
    description: 'A low-cost diaspora remittance tool utilizing stablecoins for instant settlement into Nigerian bank accounts via API.',
    creator: { initials: 'CN', name: 'Chidi n.', location: 'Abuja', verified: true },
    tags: ['blockchain', 'remittance'],
    image: 'https://images.unsplash.com/photo-1621416848440-4363065bb762?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1621416848440-4363065bb762?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1551288049-bbbda536339a?auto=format&fit=crop&q=80&w=800'
    ]
  },
  {
    id: 'sample-5',
    category: 'Health',
    price: '95,000',
    title: 'MediLog — Blockchain Verified Prescriptions',
    description: 'Eliminating counterfeit drugs by using QR codes and blockchain to track medicine from manufacturer to local pharmacy shelves.',
    creator: { initials: 'NM', name: 'Ngozi M.', location: 'Rivers', verified: false },
    tags: ['healthtech', 'security'],
    image: 'https://images.unsplash.com/photo-1576091160550-217359f42f8c?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1576091160550-217359f42f8c?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?auto=format&fit=crop&q=80&w=800'
    ]
  },
  {
    id: 'sample-10',
    category: 'Tech',
    price: '120,000',
    title: 'LagosTraffic AI — Dynamic Routing API',
    description: 'A predictive API for delivery companies that analyzes historical congestion data in Lagos to provide the fastest alternative routes.',
    creator: { initials: 'DY', name: 'Dan Y.', location: 'Lagos', verified: true },
    tags: ['ai', 'mobility', 'bigdata'],
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1506751348346-64303498875b?auto=format&fit=crop&q=80&w=800'
    ]
  },
  {
    id: 'sample-11',
    category: 'Fintech',
    price: '75,000',
    title: 'MarketSusu — Digital Contribution Club',
    description: 'A digitized Susu/Ajo savings platform for market traders with automated daily collection and credit score building features.',
    creator: { initials: 'SA', name: 'Sade A.', location: 'Ibadan', verified: true },
    tags: ['fintech', 'inclusion'],
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=800',
    images: [
      'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1559526324-4b87b5e36e10?auto=format&fit=crop&q=80&w=800'
    ]
  }
];

const SAMPLE_SKILLS = [
  { initials: 'AC', name: 'Adaeze C.', role: 'UI/UX Designer', location: 'Lagos', rating: '4.9', price: '12,000', tags: ['Figma', 'Research'], online: true, bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
  { initials: 'MH', name: 'Musa H.', role: 'Full Stack Developer', location: 'Abuja', rating: '4.7', price: '15,000', tags: ['React', 'Node'], online: false, bgColor: 'bg-rose-50', textColor: 'text-rose-600' },
  { initials: 'BO', name: 'Blessing O.', role: 'Digital Marketer', location: 'Port Harcourt', rating: '4.8', price: '7,500', tags: ['SEO', 'SEM'], online: true, bgColor: 'bg-green-50', textColor: 'text-green-600' },
  { initials: 'SA', name: 'Seun A.', role: 'Legal Consultant', location: 'Ibadan', rating: '4.6', price: '20,000', tags: ['IP Law', 'Contracts'], online: false, bgColor: 'bg-amber-50', textColor: 'text-amber-600' }
];

const VerificationScreen = ({ user, onLogout, onRefresh, addToast }: { user: any, onLogout: () => void, onRefresh: () => void, addToast: any }) => {
  const [isResending, setIsResending] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  const handleResend = async () => {
    if (!auth.currentUser) return;
    setIsResending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      addToast("Verification email resent!", "success");
    } catch (error: any) {
      addToast(error.message || "Failed to resend email.", "error");
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!auth.currentUser) return;
    setIsReloading(true);
    try {
      await auth.currentUser.reload();
      onRefresh();
      addToast("Status updated!", "success");
    } catch (error: any) {
      addToast(error.message || "Failed to refresh status.", "error");
    } finally {
      setIsReloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-off-white dark:bg-gray-950 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 shadow-2xl border border-gray-100 dark:border-gray-800 text-center"
      >
        <div className="w-20 h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Mail className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-heading font-black text-accent-dark dark:text-gray-100 mb-4">Check your email!</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          We've sent a verification link to <span className="font-bold text-accent-dark dark:text-gray-200">{user.email}</span>. 
          Please verify your email to access IdeaConnect NG.
        </p>

        <div className="space-y-4">
          <button 
            onClick={handleCheckVerification}
            disabled={isReloading}
            className="w-full py-4 bg-primary text-white font-heading font-bold rounded-2xl transition-all hover:bg-primary-hover shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group"
          >
            {isReloading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                I've verified my email
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
          
          <button 
            onClick={handleResend}
            disabled={isResending}
            className="w-full py-4 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          >
            {isResending ? "Resending..." : "Resend Verification Email"}
          </button>

          <button 
            onClick={onLogout}
            className="text-gray-400 hover:text-rose-500 text-sm font-bold transition-colors"
          >
            Sign out and try another account
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return true; // Default to dark mode on first load
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);
  const [user, setUser] = useState<{ email: string; name: string; emailVerified: boolean; uid: string } | null>(null);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsLoggedIn(false);
      setUser(null);
      addToast("Successfully logged out", "success");
    } catch (error) {
      console.error("Logout error:", error);
      addToast("Failed to logout", "error");
    }
  };

  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setIsLoggedIn(true);
        const name = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Innovator';
        setUser({ 
          email: firebaseUser.email || '', 
          name: name.charAt(0).toUpperCase() + name.slice(1),
          emailVerified: firebaseUser.emailVerified,
          uid: firebaseUser.uid
        });

        // Sync verification status to Firestore
        if (firebaseUser.emailVerified && db) {
          try {
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists() && !userSnap.data().isEmailVerified) {
              await setDoc(userRef, { isEmailVerified: true }, { merge: true });
            }
          } catch (e) {
            console.error("Failed to sync verification status:", e);
          }
        }
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Test Connection
  useEffect(() => {
    async function checkConnection() {
      if (!db) return;
      try {
        // Try a read that might fail with permission error but should connect
        await getDocFromServer(doc(db, 'test', 'connection'));
        console.log("Firestore connection test reached backend (likely permission denied, which is expected)");
      } catch (error: any) {
        if (error.message.includes('the client is offline') || error.code === 'unavailable') {
          console.error("Firestore connectivity error: The backend could not be reached. Ensure your Firebase project is fully provisioned and the Firestore API is enabled.");
        } else {
          console.log("Firestore reachability confirmed:", error.code || error.message);
        }
      }
    }
    checkConnection();
  }, []);
  const [userIdeas, setUserIdeas] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [visibleIdeas, setVisibleIdeas] = useState(6);
  const [isJoined, setIsJoined] = useState(false);
  const [authModal, setAuthModal] = useState<{ open: boolean, mode: 'login' | 'register' }>({ open: false, mode: 'login' });
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' }[]>([]);
  const [viewingIdea, setViewingIdea] = useState<any>(null);
  const [isKYCModalOpen, setIsKYCModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isSyncingVerification, setIsSyncingVerification] = useState(false);

  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const filteredIdeas = activeFilter === 'All' 
    ? SAMPLE_IDEAS 
    : SAMPLE_IDEAS.filter(idea => idea.category === activeFilter);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsJoined(true);
    addToast("Welcome to the community! Check your email for next steps.", "success");
  };

  const handleLoginSuccess = (email: string) => {
    const name = email.split('@')[0];
    if (auth.currentUser) {
      setUser({ 
        email, 
        name: name.charAt(0).toUpperCase() + name.slice(1),
        emailVerified: auth.currentUser.emailVerified,
        uid: auth.currentUser.uid
      });
      setIsLoggedIn(true);
      setAuthModal({ ...authModal, open: false });
      addToast(`Welcome back, ${email.split('@')[0]}!`, "success");
    }
  };

  const handleAddIdea = (idea: any) => {
    setUserIdeas(prev => [idea, ...prev]);
  };

  const handleResendEmail = async () => {
    if (!auth.currentUser) return;
    try {
      await sendEmailVerification(auth.currentUser);
      addToast("Verification code resent to your email!", "success");
    } catch (err: any) {
      addToast(err.message || "Failed to send email", "error");
    }
  };

  const refreshVerificationStatus = async () => {
    if (!auth.currentUser) return;
    setIsSyncingVerification(true);
    try {
      await auth.currentUser.reload();
      const updatedUser = auth.currentUser;
      if (updatedUser.emailVerified) {
        setUser(prev => prev ? { ...prev, emailVerified: true } : null);
        await setDoc(doc(db, 'users', updatedUser.uid), { isEmailVerified: true }, { merge: true });
        addToast("Email verified!", "success");
        setIsVerificationModalOpen(false);
      } else {
        addToast("Still not verified. Please check your email.", "error");
      }
    } catch (e) {
      addToast("Refresh failed", "error");
    } finally {
      setIsSyncingVerification(false);
    }
  };
  
  const handleRefreshAuth = () => {
    if (auth.currentUser) {
      const name = auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Innovator';
      setUser({ 
        email: auth.currentUser.email || '', 
        name: name.charAt(0).toUpperCase() + name.slice(1),
        emailVerified: auth.currentUser.emailVerified,
        uid: auth.currentUser.uid
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-off-white dark:bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-gray-500 font-bold animate-pulse">Initializing IdeaConnect...</p>
        </div>
      </div>
    );
  }

  if (isLoggedIn && user) {
    return (
      <>
        {!user.emailVerified ? (
          <VerificationScreen user={user} onLogout={handleLogout} onRefresh={handleRefreshAuth} addToast={addToast} />
        ) : (
          <Dashboard 
            user={user} 
            ideas={userIdeas}
            onAddIdea={handleAddIdea}
            onLogout={handleLogout} 
            addToast={addToast} 
            isDarkMode={isDarkMode}
            toggleDarkMode={toggleDarkMode}
          />
        )}
        <AnimatePresence>
          {toasts.map(toast => (
            <Toast 
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-off-white dark:bg-gray-950 transition-colors duration-300">
      <Navbar 
        onOpenAuth={(mode) => setAuthModal({ open: true, mode })} 
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      />
      <AuthModal 
        isOpen={authModal.open} 
        onClose={() => setAuthModal({ ...authModal, open: false })} 
        initialMode={authModal.mode}
        onSuccess={handleLoginSuccess}
      />

      <AnimatePresence>
        {toasts.map(toast => (
          <Toast 
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>

      <IdeaDetailsModal 
        isOpen={!!viewingIdea}
        onClose={() => setViewingIdea(null)}
        idea={viewingIdea}
        currentUserId={auth.currentUser?.uid}
        onConfirm={() => {
          setViewingIdea(null);
          setAuthModal({ open: true, mode: 'login' });
          addToast("Please login or join to express interest and secure this concept.", "success");
        }}
      />

      {/* Hero Section */}
      <section id="home" className="relative min-h-screen pt-24 pb-20 flex items-center bg-animate-gradient bg-[length:400%_400%]">
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="glass p-10 rounded-3xl"
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 tracking-tight leading-tight">
                Turn Your Ideas Into <span className="text-secondary underline decoration-secondary/30">Income</span>. Connect. Grow.
              </h1>
              <p className="text-white/90 text-lg md:text-xl mb-10 max-w-lg leading-relaxed">
                Nigeria's #1 platform for sharing innovative ideas, showcasing skills, and trading intellectual property with thousands of changemakers.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-5 mb-12">
                <button className="px-8 py-4 bg-primary text-white font-heading font-bold rounded-btn transition-all hover:scale-105 active:scale-95 shadow-xl shadow-primary/20">
                  Share Your Idea
                </button>
                <button className="px-8 py-4 border-2 border-white text-white font-heading font-bold rounded-btn transition-all hover:bg-white hover:text-primary active:scale-95">
                  Browse Ideas
                </button>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-10 border-t border-white/20">
                <div className="flex flex-col">
                  <span className="text-secondary text-2xl font-bold font-heading">
                    <AnimatedCounter value="12400" />+
                  </span>
                  <span className="text-white/70 text-sm font-medium">Ideas Shared</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-secondary text-2xl font-bold font-heading">
                    <AnimatedCounter value="8200" />+
                  </span>
                  <span className="text-white/70 text-sm font-medium">Verified Skills</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-secondary text-2xl font-bold font-heading">
                    ₦<AnimatedCounter value="480" />M+
                  </span>
                  <span className="text-white/70 text-sm font-medium">in Idea Trades</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-secondary text-2xl font-bold font-heading">
                    <AnimatedCounter value="34" />
                  </span>
                  <span className="text-white/70 text-sm font-medium">States Represented</span>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="hidden md:block"
            >
              <div className="relative">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-primary/20 rounded-full blur-3xl animate-pulse" />
                
                <div className="relative bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl idea-card-hover border border-gray-100 dark:border-gray-700 max-w-sm ml-auto">
                  <div className="flex justify-between mb-4">
                    <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400 text-xs font-bold px-3 py-1 rounded-full">Fintech</span>
                    <span className="text-primary font-bold">₦45,000</span>
                  </div>
                  <h3 className="text-xl font-bold text-accent-dark dark:text-gray-100 mb-4">QuickRemit — P2P Diaspora Remittance via USSD</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">A seamless way for Nigerians in the diaspora to send money home instantly utilizing local banking USSD endpoints.</p>
                  
                  <div className="flex items-center gap-3 pt-6 border-t border-gray-50 dark:border-gray-700">
                    <div className="w-10 h-10 rounded-full bg-accent-dark dark:bg-gray-700 text-white flex items-center justify-center font-bold">CN</div>
                    <div>
                      <h4 className="text-sm font-bold flex items-center gap-1 dark:text-gray-100">Chidi N. <CheckCircle className="w-3 h-3 text-blue-500 fill-blue-500 text-white" /></h4>
                      <p className="text-xs text-gray-400 dark:text-gray-500">Abuja, NG</p>
                    </div>
                  </div>
                </div>
                
                <div className="absolute top-20 -left-20 bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-xl flex items-center gap-4 border border-gray-50 dark:border-gray-700">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-primary"><ShoppingBag className="w-5 h-5" /></div>
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Recent Sale</p>
                    <p className="text-sm font-bold dark:text-gray-100">₦120,000</p>
                  </div>
                </div>

                <div className="absolute bottom-10 -right-4 bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-xl flex items-center gap-4 border border-gray-50 dark:border-gray-700">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600"><Users className="w-5 h-5" /></div>
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Connections</p>
                    <p className="text-sm font-bold dark:text-gray-100">12,403+</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-white dark:bg-gray-900 transition-colors duration-300">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 dark:text-gray-100">How IdeaConnect NG Works</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">Connecting creators, talent, and investors in 4 simple steps.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            <div className="hidden md:block absolute top-[30%] left-[10%] right-[10%] h-[2px] border-t-2 border-dashed border-gray-200 dark:border-gray-800 z-0" />
            
            {[
              { num: '01', title: 'Create Profile', desc: 'Sign up in minutes and verify your identity as an innovator or talent.', icon: '👤', bg: 'bg-blue-50 dark:bg-blue-900/20' },
              { num: '02', title: 'Share or Browse', desc: 'Post your groundbreaking ideas or browse thousands of curated concepts.', icon: '💡', bg: 'bg-amber-50 dark:bg-amber-900/20' },
              { num: '03', title: 'Connect', desc: 'Find co-founders, hire skilled talent, or chat directly with creators.', icon: '🤝', bg: 'bg-green-50 dark:bg-green-900/20' },
              { num: '04', title: 'Trade & Grow', desc: 'Buy, sell, or license ideas securely and build the next big thing.', icon: '🚀', bg: 'bg-rose-50 dark:bg-rose-900/20' },
            ].map((step, idx) => (
              <motion.div 
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-gray-800 p-8 rounded-card border border-gray-100 dark:border-gray-700 shadow-sm relative z-10 group"
              >
                <div className={`w-16 h-16 ${step.bg} rounded-2xl flex items-center justify-center text-3xl mb-6 transition-transform group-hover:scale-110 duration-300`}>
                  {step.icon}
                </div>
                <div className="absolute -top-4 right-8 text-4xl font-black text-gray-50 dark:text-gray-700/30 group-hover:text-gray-100 dark:group-hover:text-gray-700 transition-colors">{step.num}</div>
                <h4 className="text-xl font-bold mb-3 dark:text-gray-100">{step.title}</h4>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Ideas */}
      <section id="explore" className="py-24 bg-off-white dark:bg-gray-950 transition-colors duration-300">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-8">
            <div className="max-w-xl">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 dark:text-gray-100">🔥 Trending Ideas This Week</h2>
              <p className="text-gray-500 dark:text-gray-400">Discover groundbreaking innovations from every corner of Nigeria.</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar w-full md:w-auto">
              {['All', 'Tech', 'Agriculture', 'Fashion', 'Education', 'Fintech', 'Health'].map(cat => (
                <button 
                  key={cat}
                  onClick={() => { setActiveFilter(cat); setVisibleIdeas(6); }}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeFilter === cat ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredIdeas.slice(0, visibleIdeas).map(idea => (
              <IdeaCard 
                key={idea.id} 
                idea={idea} 
                onInterest={(i) => {
                  setViewingIdea(i);
                }}
              />
            ))}
          </div>

          {visibleIdeas < filteredIdeas.length && (
            <div className="text-center mt-16">
              <button 
                onClick={() => setVisibleIdeas(prev => prev + 3)}
                className="px-10 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-accent-dark dark:text-gray-200 font-heading font-bold rounded-btn hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm"
              >
                Load More Ideas
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Skills Marketplace */}
      <section id="skills" className="py-24 bg-accent-dark dark:bg-gray-900 text-white overflow-hidden transition-colors duration-300">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Hire Nigerian Talent. Build Something Extraordinary.</h2>
            <p className="text-white/60">Connect with pre-vetted professionals who understand the local ecosystem.</p>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-8 no-scrollbar mb-10">
            {['All Talent', 'Software Dev', 'UI/UX Design', 'Digital Marketing', 'Content Writing', 'Legal Consultation', 'Finance', 'Engineering'].map((p, i) => (
              <button 
                key={p} 
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${i === 0 ? 'bg-secondary text-accent-dark' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {SAMPLE_SKILLS.map(skill => (
              <SkillCard key={skill.name} skill={skill} />
            ))}
          </div>
        </div>
      </section>

      {/* Buy & Sell Ideas */}
      <section id="marketplace" className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">The Idea Marketplace — Buy, Sell, License</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Monetize your intellectual property through various flexible deal types.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {[
              { title: 'Full Sale', icon: '💼', desc: 'Transfer 100% intellectual property rights. The buyer owns the idea completely and you receive a one-time payout.' },
              { title: 'License', icon: '📜', desc: 'Retain ownership while granting the buyer exclusive or non-exclusive rights to use your idea for a recurring fee.' },
              { title: 'Collaboration', icon: '🤝', desc: 'Exchange equity instead of cash. Partner with developers or investors to bring your vision to life together.' },
            ].map(type => (
              <div key={type.title} className="p-8 border border-gray-100 rounded-card bg-white hover:border-primary hover:shadow-subtle transition-all cursor-default text-center">
                <div className="text-4xl mb-6">{type.icon}</div>
                <h4 className="text-xl font-bold mb-3">{type.title}</h4>
                <p className="text-gray-500 text-sm">{type.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-card shadow-subtle border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-off-white border-b border-gray-100 text-accent-dark font-heading font-semibold text-sm">
                    <th className="px-6 py-5">Idea Title</th>
                    <th className="px-6 py-5">Category</th>
                    <th className="px-6 py-5">Type</th>
                    <th className="px-6 py-5">Price</th>
                    <th className="px-6 py-5">Seller</th>
                    <th className="px-6 py-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    { title: 'PayTransit API', cat: 'Fintech', type: 'License', price: '₦500k/yr', seller: 'David E.', status: 'Open' },
                    { title: 'Agro Drone Mapping Tech', cat: 'Agriculture', type: 'Full Sale', price: '₦1.2M', seller: 'Suleiman B.', status: 'Open' },
                    { title: 'CampusEats Delivery', cat: 'Logistics', type: 'Collab', price: '20% Equity', seller: 'Chika O.', status: 'Closed' },
                    { title: 'Naija Stream Auth Tool', cat: 'Software', type: 'Full Sale', price: '₦800k', seller: 'Victor T.', status: 'Open' },
                    { title: 'Smart Meter Bypass Alert', cat: 'Hardware', type: 'License', price: '₦200k/mo', seller: 'Aisha M.', status: 'Sold' },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50/50 transition-colors text-sm">
                      <td className="px-6 py-5 font-bold text-accent-dark">{row.title}</td>
                      <td className="px-6 py-5 text-gray-500">{row.cat}</td>
                      <td className="px-6 py-5">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${row.type === 'License' ? 'bg-blue-50 text-blue-600' : row.type === 'Full Sale' ? 'bg-rose-50 text-rose-600' : 'bg-green-50 text-green-600'}`}>
                          {row.type}
                        </span>
                      </td>
                      <td className="px-6 py-5 font-semibold text-primary">{row.price}</td>
                      <td className="px-6 py-5 text-gray-500">{row.seller}</td>
                      <td className="px-6 py-5">
                        <span className={`font-bold ${row.status === 'Open' ? 'text-green-600' : row.status === 'Sold' ? 'text-amber-600' : 'text-gray-400'}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-12 text-center">
            <button className="px-8 py-4 bg-primary text-white font-heading font-bold rounded-btn hover:bg-primary-hover shadow-lg shadow-primary/20">
              List Your Idea for Sale
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="community" className="py-24 bg-off-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Stories from Our Community</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: 'Chukwuemeka I.', role: 'Lagos | Idea Seller', initials: 'CI', text: "I listed my fintech idea and got ₦120,000 in just 3 days. I honestly couldn't believe Nigerians were willing to pay for raw, well-documented ideas.", color: 'bg-blue-500' },
              { name: 'Amina D.', role: 'Kaduna | Entrepreneur', initials: 'AD', text: "Found a technical co-founder here who had the exact software skills I was missing. We collaborated, built the MVP, and just got our first client!", color: 'bg-green-500' },
              { name: 'Rotimi F.', role: 'Ekiti | Developer', initials: 'RF', text: "As a freelance developer, I've gotten 4 high-paying clients from IdeaConnect NG in 2 months. It's hands down the best platform for Nigerian talent.", color: 'bg-rose-500' },
            ].map((t, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="bg-white p-10 rounded-card shadow-subtle relative h-full flex flex-col"
              >
                <div className="text-6xl text-secondary/30 font-serif absolute top-4 right-8">"</div>
                <p className="text-gray-600 italic mb-8 relative z-10 leading-relaxed">
                  {t.text}
                </p>
                <div className="flex items-center gap-4 mt-auto">
                  <div className={`w-12 h-12 rounded-full ${t.color} text-white flex items-center justify-center font-bold`}>{t.initials}</div>
                  <div>
                    <h5 className="font-bold text-accent-dark">{t.name}</h5>
                    <p className="text-xs text-gray-500">{t.role}</p>
                    <div className="flex text-secondary gap-0.5 mt-1">
                      <Star className="w-3 h-3 fill-secondary" />
                      <Star className="w-3 h-3 fill-secondary" />
                      <Star className="w-3 h-3 fill-secondary" />
                      <Star className="w-3 h-3 fill-secondary" />
                      <Star className="w-3 h-3 fill-secondary" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Join Community CTA */}
      <section id="join" className="py-24 bg-primary relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full -translate-x-1/2 translate-y-1/2" />
        
        <div className="container mx-auto px-6 relative z-10 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6">Ready to Share Your Idea with Nigeria?</h2>
            <p className="text-white/80 text-lg mb-10">Join over 12,000 innovators already on the platform. It's completely free to start.</p>
            
            <AnimatePresence mode="wait">
              {!isJoined ? (
                <motion.form 
                  key="form"
                  exit={{ opacity: 0, scale: 0.95 }}
                  onSubmit={handleJoin}
                  className="flex flex-col sm:flex-row gap-4 mb-6"
                >
                  <input 
                    type="email" 
                    placeholder="Enter your email address..." 
                    required 
                    className="flex-1 px-6 py-4 rounded-btn border-none focus:ring-4 focus:ring-secondary/50 outline-none font-medium h-14"
                  />
                  <button className="px-10 py-4 bg-secondary text-accent-dark font-heading font-extrabold rounded-btn transition-all hover:bg-secondary/90 hover:scale-[1.02] active:scale-95 h-14">
                    Join Free
                  </button>
                </motion.form>
              ) : (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/20 backdrop-blur-md p-8 rounded-2xl border border-white/30 text-white"
                >
                  <div className="w-16 h-16 bg-white/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">You're on the list!</h3>
                  <p className="text-white/80">Welcome to IdeaConnect NG. Check your inbox for the welcome guide.</p>
                </motion.div>
              )}
            </AnimatePresence>
            
            <p className="text-white/50 text-xs mb-10">🔒 No spam. Unsubscribe anytime.</p>
            
            <div className="flex flex-wrap justify-center gap-8">
              <div className="flex items-center gap-2 text-white font-medium text-sm">
                <CheckCircle className="w-5 h-5 text-secondary" /> Free to Join
              </div>
              <div className="flex items-center gap-2 text-white font-medium text-sm">
                <CheckCircle className="w-5 h-5 text-secondary" /> Verified Profiles
              </div>
              <div className="flex items-center gap-2 text-white font-medium text-sm">
                <CheckCircle className="w-5 h-5 text-secondary" /> Secure Payments
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-accent-dark pt-20 pb-10">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-8 h-8 text-secondary" />
                <span className="text-2xl font-heading font-extrabold text-white">IdeaConnect <span className="text-secondary">NG</span></span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
                The premier platform connecting Nigerian innovators with the resources, talent, and capital they need to build the next generation of global giants.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-primary transition-colors"><Twitter className="w-5 h-5" /></a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-primary transition-colors"><Instagram className="w-5 h-5" /></a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-primary transition-colors"><Linkedin className="w-5 h-5" /></a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-primary transition-colors"><Youtube className="w-5 h-5" /></a>
              </div>
            </div>

            <div className="lg:ml-auto">
              <h4 className="text-white font-bold mb-6">Quick Links</h4>
              <ul className="flex flex-col gap-4 text-gray-400 text-sm">
                <li><a href="#explore" className="hover:text-secondary hover:translate-x-1 transition-all inline-block">Explore Ideas</a></li>
                <li><a href="#skills" className="hover:text-secondary hover:translate-x-1 transition-all inline-block">Find Talent</a></li>
                <li><a href="#marketplace" className="hover:text-secondary hover:translate-x-1 transition-all inline-block">Idea Marketplace</a></li>
                <li><a href="#" className="hover:text-secondary hover:translate-x-1 transition-all inline-block">Pricing Plans</a></li>
                <li><a href="#" className="hover:text-secondary hover:translate-x-1 transition-all inline-block">About Us</a></li>
              </ul>
            </div>

            <div className="lg:ml-auto">
              <h4 className="text-white font-bold mb-6">Categories</h4>
              <ul className="flex flex-col gap-4 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-secondary hover:translate-x-1 transition-all inline-block">Fintech Solutions</a></li>
                <li><a href="#" className="hover:text-secondary hover:translate-x-1 transition-all inline-block">Agritech Innovations</a></li>
                <li><a href="#" className="hover:text-secondary hover:translate-x-1 transition-all inline-block">EdTech Platforms</a></li>
                <li><a href="#" className="hover:text-secondary hover:translate-x-1 transition-all inline-block">HealthTech Ventures</a></li>
                <li><a href="#" className="hover:text-secondary hover:translate-x-1 transition-all inline-block">E-commerce Shops</a></li>
              </ul>
            </div>

            <div className="lg:ml-auto">
              <h4 className="text-white font-bold mb-6">Support</h4>
              <ul className="flex flex-col gap-4 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-secondary hover:translate-x-1 transition-all inline-block">Help Center</a></li>
                <li><a href="#" className="hover:text-secondary hover:translate-x-1 transition-all inline-block">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-secondary hover:translate-x-1 transition-all inline-block">Terms & Conditions</a></li>
                <li><a href="#" className="hover:text-secondary hover:translate-x-1 transition-all inline-block">Safety & Verification</a></li>
                <li><a href="mailto:hello@ideaconnect.ng" className="text-secondary font-medium">hello@ideaconnect.ng</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-10 border-t border-white/5 text-center">
            <p className="text-xs text-gray-500 mb-2 font-medium">Made with ❤️ in Nigeria 🇳🇬</p>
            <p className="text-xs text-gray-600">&copy; 2026 IdeaConnect NG. All rights reserved. Registered with CAC under RC-1240392.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
