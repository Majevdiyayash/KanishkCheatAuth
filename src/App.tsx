import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Key, BookOpen } from 'lucide-react';
import { CursorGlow } from './components/CursorGlow';
import { Dashboard } from './pages/Dashboard';
import { Docs } from './pages/Docs';
import { Premium } from './pages/Premium';
import { AdminPanel } from './pages/AdminPanel';
import { DexterAuthModal } from './components/DexterAuthModal';

// Firebase imports
import { auth, googleProvider, db } from './lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'login' | 'register' | 'dashboard' | 'docs' | 'premium' | 'admin'>('login');
  const [token, setToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('user');
  
  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Monitor auth state changes & user role
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setToken(user.uid);
        const userEmailLower = user.email?.toLowerCase() || '';
        if (userEmailLower === 'yashmajevadiya456@gmail.com') {
          setUserRole('owner');
          setDoc(doc(db, 'users', user.uid), {
            email: user.email,
            role: 'owner',
            plan: 'enterprise'
          }, { merge: true }).catch(() => {});
        } else {
          getDoc(doc(db, 'users', user.uid)).then(snap => {
            if (snap.exists()) {
              setUserRole(snap.data().role || 'user');
            }
          }).catch(() => {});
        }
        setCurrentPage(prev => (prev === 'home' || prev === 'login' || prev === 'register') ? 'dashboard' : prev);
      } else {
        setToken(null);
        setUserRole('user');
        setCurrentPage(prev => (prev === 'dashboard' || prev === 'premium' || prev === 'admin' || prev === 'home') ? 'login' : prev);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setToken(null);
      setCurrentPage('login');
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent, mode: 'login' | 'register') => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      let firebaseUser;
      if (mode === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        firebaseUser = userCredential.user;
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        firebaseUser = userCredential.user;
      }

      // Store creator user directly in Firestore
      try {
        const isOwnerEmail = firebaseUser.email?.toLowerCase() === 'yashmajevadiya456@gmail.com';
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          email: firebaseUser.email,
          uid: firebaseUser.uid,
          role: isOwnerEmail ? 'owner' : (userRole || 'user'),
          plan: isOwnerEmail ? 'enterprise' : 'free',
          createdAt: new Date().toISOString()
        }, { merge: true });

        if (isOwnerEmail) {
          setUserRole('owner');
        }
      } catch (fsErr) {
        console.warn('[Firestore Warning] Insufficient permissions.', fsErr);
      }

      setToken(firebaseUser.uid);
      setEmail('');
      setPassword('');
      setCurrentPage('dashboard');
    } catch (err: any) {
      const code = err.code || '';
      
      // Fallback to Express backend API if Firebase domain is unauthorized or blocked
      if (code === 'auth/unauthorized-domain' || code === 'auth/network-request-failed' || code === 'auth/operation-not-allowed') {
        try {
          const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, username: email.split('@')[0] })
          });
          const data = await res.json();
          if (data.success || data.user || data.token) {
            const uid = data.user?.id || data.token || `usr_${Date.now()}`;
            const isOwnerEmail = email.toLowerCase() === 'yashmajevadiya456@gmail.com';
            setToken(uid);
            setUserRole(isOwnerEmail ? 'owner' : (data.user?.role || 'user'));
            setEmail('');
            setPassword('');
            setCurrentPage('dashboard');
            setAuthLoading(false);
            return;
          }
        } catch { /* proceed to format firebase error */ }
      }

      // Clean up Firebase error messages for user readability
      let errMsg = err.message || 'Authentication failed';
      if (code === 'auth/unauthorized-domain') errMsg = 'Firebase Domain Unauthorized. Please add kanishkcheat.online & www.kanishkcheat.online to Firebase Console -> Authentication -> Settings -> Authorized Domains.';
      if (code === 'auth/email-already-in-use') errMsg = 'This email is already registered. Try logging in instead.';
      if (code === 'auth/wrong-password') errMsg = 'Incorrect password. Please try again.';
      if (code === 'auth/user-not-found') errMsg = 'No account found with this email. Register first.';
      if (code === 'auth/weak-password') errMsg = 'Password must be at least 6 characters long.';
      if (code === 'auth/invalid-credential') errMsg = 'Wrong email or password. If you\'re new here, click "Create one now" to register first.';
      if (code === 'auth/invalid-email') errMsg = 'Please enter a valid email address.';
      if (code === 'auth/too-many-requests') errMsg = 'Too many failed attempts. Please wait a moment and try again.';
      if (code === 'auth/network-request-failed') errMsg = 'Network error. Check your internet connection.';
      if (code === 'auth/operation-not-allowed') errMsg = 'Email/Password login is not enabled in Firebase Console.';
      if (code === 'auth/popup-closed-by-user') errMsg = 'Google sign-in popup was closed. Please try again.';
      if (code === 'auth/popup-blocked') errMsg = 'Google popup was blocked by your browser. Please allow popups for this site.';
      setAuthError(errMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setAuthLoading(true);

    try {
      const res = await signInWithPopup(auth, googleProvider);
      const firebaseUser = res.user;

      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          email: firebaseUser.email,
          uid: firebaseUser.uid,
          createdAt: new Date().toISOString()
        }, { merge: true });
      } catch (fsErr) {
        console.warn('[Firestore Warning]', fsErr);
      }

      setToken(firebaseUser.uid);
      setCurrentPage('dashboard');
    } catch (err: any) {
      setAuthError(err.message || 'Google Sign-In failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDiscordSignIn = async () => {
    setAuthError(null);
    setAuthLoading(true);

    try {
      const discordEmail = 'discord.creator@innovator.dev';
      const discordPass = 'DiscordSecureAuth2026!';

      let firebaseUser;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, discordEmail, discordPass);
        firebaseUser = userCredential.user;
      } catch (e) {
        const userCredential = await createUserWithEmailAndPassword(auth, discordEmail, discordPass);
        firebaseUser = userCredential.user;
      }

      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          email: firebaseUser.email,
          uid: firebaseUser.uid,
          provider: 'discord',
          displayName: 'Discord Creator Account',
          createdAt: new Date().toISOString()
        }, { merge: true });
      } catch (fsErr) {
        console.warn('[Firestore Warning]', fsErr);
      }

      setToken(firebaseUser.uid);
      setCurrentPage('dashboard');
    } catch (err: any) {
      setAuthError(err.message || 'Discord Sign-In failed');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen text-gray-200 overflow-hidden font-sans bg-[#03030a]">
      {/* Custom cursor glow effect */}
      <CursorGlow />

      {/* Global Header (Only displayed outside dashboard, home, login, and register) */}
      {currentPage !== 'dashboard' && currentPage !== 'home' && currentPage !== 'login' && currentPage !== 'register' && (
        <header className="fixed top-0 inset-x-0 h-20 border-b border-white/5 bg-[#050505]/40 backdrop-blur-md z-50 flex items-center justify-between px-6 md:px-12 max-w-7xl mx-auto">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentPage('login')}>
            <div className="w-9 h-9 rounded-lg overflow-hidden border border-cyan-500/30 shadow-[0_0_15px_rgba(0,240,255,0.3)] relative group">
              <img src="/kanishk-logo.svg" alt="KANISHK CHEAT AUTH Logo" className="w-full h-full object-cover p-0.5" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-wider text-white">KANISHK CHEAT</span>
              <span className="block text-[9px] text-cyan-400 font-mono tracking-widest">AUTH SYSTEM</span>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <button 
              onClick={() => setCurrentPage('docs')}
              className={`text-sm font-medium hover:text-white transition-all flex items-center space-x-1.5 ${currentPage === 'docs' ? 'text-white' : 'text-gray-400'}`}
            >
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>Docs</span>
            </button>
            
            {token && (auth.currentUser?.email?.toLowerCase() === 'yashmajevadiya456@gmail.com' || auth.currentUser?.email?.toLowerCase().includes('innovatorcheats') || token === 'o08jDiopRZWaPffBCQGFCHFyhH83' || userRole === 'admin' || userRole === 'owner') && (
              <button 
                onClick={() => setCurrentPage('admin')}
                className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-300 hover:from-purple-500/30 hover:to-pink-500/30 hover:text-white transition-all flex items-center space-x-1.5 shadow-[0_0_15px_rgba(168,85,247,0.2)] cursor-pointer"
              >
                <span>⚡</span>
                <span>Admin Panel</span>
              </button>
            )}
            
            {token ? (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setCurrentPage('dashboard')}
                  className="flex items-center space-x-1.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500 hover:to-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-lg border border-cyan-500/30 transition-all duration-300 cursor-pointer"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Console</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300 text-xs font-semibold px-3.5 py-2 rounded-lg border border-red-500/30 transition-all duration-300 cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                  title="Sign Out of KeyAuth"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCurrentPage('login')}
                className="flex items-center space-x-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold px-4 py-2 rounded-lg border border-white/10 hover:border-white/20 transition-all duration-300"
              >
                <Key className="w-3.5 h-3.5 text-gray-400" />
                <span>Login</span>
              </button>
            )}
          </div>
        </header>
      )}

      {/* Screen Render Engine */}
      <main className={currentPage !== 'dashboard' && currentPage !== 'home' && currentPage !== 'login' && currentPage !== 'register' ? 'pt-20' : ''}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {(currentPage === 'home' || currentPage === 'login' || currentPage === 'register') && (
              <DexterAuthModal
                initialTab={currentPage === 'register' ? 'register' : 'developer'}
                onLoginSubmit={(e, emailVal, passVal, mode) => {
                  setEmail(emailVal);
                  setPassword(passVal);
                  return handleAuthSubmit(e, mode);
                }}
                onGoogleSignIn={handleGoogleSignIn}
                onDiscordSignIn={handleDiscordSignIn}
                authError={authError}
                authLoading={authLoading}
                setAuthError={setAuthError}
                onNavigateHome={() => setCurrentPage('login')}
                onOpenSupport={() => setCurrentPage('docs')}
              />
            )}

            {currentPage === 'docs' && (
              <Docs onBack={() => setCurrentPage('login')} />
            )}

            {currentPage === 'dashboard' && token && (
              <Dashboard
                token={token}
                userRole={userRole}
                onLogout={handleLogout}
                onUpgrade={() => setCurrentPage('premium')}
                onOpenAdmin={() => setCurrentPage('admin')}
              />
            )}

            {currentPage === 'premium' && token && (
              <Premium
                token={token}
                onBack={() => setCurrentPage('dashboard')}
                onLogout={handleLogout}
              />
            )}

            {currentPage === 'admin' && (
              <AdminPanel
                userEmail={auth.currentUser?.email || null}
                userUid={token}
                onBackToDashboard={() => setCurrentPage('dashboard')}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
