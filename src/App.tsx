import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Key, BookOpen, AlertCircle, RefreshCw } from 'lucide-react';
import { ParticlesBackground } from './components/ParticlesBackground';
import { CursorGlow } from './components/CursorGlow';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { Docs } from './pages/Docs';
import { Premium } from './pages/Premium';
import { GlassCard } from './components/GlassCard';

// Firebase imports
import { auth, googleProvider, db } from './lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  OAuthProvider
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'login' | 'register' | 'dashboard' | 'docs' | 'premium'>('home');
  const [token, setToken] = useState<string | null>(null);
  
  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Monitor auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setToken(user.uid);
        if (currentPage === 'home' || currentPage === 'login' || currentPage === 'register') {
          setCurrentPage('dashboard');
        }
      } else {
        setToken(null);
        if (currentPage === 'dashboard' || currentPage === 'premium') {
          setCurrentPage('home');
        }
      }
    });
    return () => unsubscribe();
  }, [currentPage]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setToken(null);
      setCurrentPage('home');
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
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          email: firebaseUser.email,
          uid: firebaseUser.uid,
          createdAt: new Date().toISOString()
        }, { merge: true });
      } catch (fsErr) {
        console.warn('[Firestore Warning] Insufficient permissions. Configure Firestore security rules to allow writes.', fsErr);
      }

      setToken(firebaseUser.uid);
      setEmail('');
      setPassword('');
      setCurrentPage('dashboard');
    } catch (err: any) {
      // Clean up Firebase error messages for user readability
      let errMsg = err.message || 'Authentication failed';
      const code = err.code || '';
      if (code === 'auth/email-already-in-use') errMsg = 'This email is already registered. Try logging in instead.';
      if (code === 'auth/wrong-password') errMsg = 'Incorrect password. Please try again.';
      if (code === 'auth/user-not-found') errMsg = 'No account found with this email. Register first.';
      if (code === 'auth/weak-password') errMsg = 'Password must be at least 6 characters long.';
      if (code === 'auth/invalid-credential') errMsg = 'Wrong email or password. If you\'re new here, click "Create one now" to register first.';
      if (code === 'auth/invalid-email') errMsg = 'Please enter a valid email address.';
      if (code === 'auth/too-many-requests') errMsg = 'Too many failed attempts. Please wait a moment and try again.';
      if (code === 'auth/network-request-failed') errMsg = 'Network error. Check your internet connection.';
      if (code === 'auth/operation-not-allowed') errMsg = 'Email/Password login is not enabled. Go to Firebase Console → Authentication → Sign-in providers and enable Email/Password.';
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

      // Store directly in Firestore
      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          email: firebaseUser.email,
          uid: firebaseUser.uid,
          createdAt: new Date().toISOString()
        }, { merge: true });
      } catch (fsErr) {
        console.warn('[Firestore Warning] Insufficient permissions. Configure Firestore security rules.', fsErr);
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
      const discordProvider = new OAuthProvider('oidc.discord');
      const res = await signInWithPopup(auth, discordProvider);
      const firebaseUser = res.user;

      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          email: firebaseUser.email || `${firebaseUser.displayName || 'user'}@discord.auth`,
          uid: firebaseUser.uid,
          provider: 'discord',
          createdAt: new Date().toISOString()
        }, { merge: true });
      } catch (fsErr) {
        console.warn('[Firestore Warning] Insufficient permissions.', fsErr);
      }

      setToken(firebaseUser.uid);
      setCurrentPage('dashboard');
    } catch (err: any) {
      let errMsg = err.message || 'Discord Sign-In failed';
      if (err.code === 'auth/operation-not-allowed') {
        errMsg = 'Discord Login is not enabled in Firebase Console → Authentication → Sign-in providers. Add OpenID Connect (OIDC) provider for Discord.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        errMsg = 'Discord login popup was closed. Please try again.';
      }
      setAuthError(errMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen text-gray-200 overflow-hidden font-sans">
      {/* Interactive Canvas Particles in the background */}
      <ParticlesBackground />

      {/* Custom cursor glow effect (KeyAuth-style blue glow) */}
      <CursorGlow />

      {/* Global Header (Only displayed outside the dashboard) */}
      {currentPage !== 'dashboard' && (
        <header className="fixed top-0 inset-x-0 h-20 border-b border-white/5 bg-[#050505]/40 backdrop-blur-md z-50 flex items-center justify-between px-6 md:px-12 max-w-7xl mx-auto">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentPage('home')}>
            <div className="w-9 h-9 rounded-lg overflow-hidden border border-cyan-500/30 shadow-[0_0_15px_rgba(0,240,255,0.2)] relative group">
              <img src="/hero-pic.webp" alt="INNOVATOR CHEATS Logo" className="w-full h-full object-cover group-hover:opacity-0 transition-opacity duration-300" />
              <video src="/hero-video.mp4" autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-wider text-white">INNOVATOR CHEATS</span>
              <span className="block text-[9px] text-cyan-400 font-mono tracking-widest">KEY AUTH SYSTEM</span>
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
      <main className={currentPage !== 'dashboard' ? 'pt-20' : ''}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {currentPage === 'home' && (
              <Home 
                onLaunch={() => token ? setCurrentPage('dashboard') : setCurrentPage('login')} 
                onViewDocs={() => setCurrentPage('docs')}
              />
            )}

            {currentPage === 'docs' && (
              <Docs onBack={() => setCurrentPage('home')} />
            )}

            {(currentPage === 'login' || currentPage === 'register') && (
              <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-6">
                <GlassCard className="max-w-md w-full p-8 text-left" glowColor="cyan" intensity={10}>
                  <div className="flex justify-center mb-6">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden border border-cyan-500/30 shadow-[0_0_20px_rgba(0,240,255,0.25)] relative group cursor-pointer">
                      <img src="/hero-pic.webp" alt="INNOVATOR CHEATS Card Logo" className="w-full h-full object-cover group-hover:opacity-0 transition-opacity duration-300" />
                      <video src="/hero-video.mp4" autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  </div>
                  
                  <h2 className="text-2xl font-bold text-white text-center">
                    {currentPage === 'login' ? 'Access Creator Panel' : 'Create Your Account'}
                  </h2>
                  <p className="text-xs text-gray-500 text-center font-light mt-1.5 mb-8">
                    {currentPage === 'login' ? 'Enter credentials to authorize access to INNOVATOR CHEATS.' : 'Sign up to create and manage secure license apps.'}
                  </p>

                  <form onSubmit={(e) => handleAuthSubmit(e, currentPage)} className="space-y-4">
                    <div>
                      <label className="text-xs text-gray-400 font-mono block mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="you@innovatorcheats.dev"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 font-mono block mb-1">Password</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>

                    {authError && (
                      <div className="p-3 bg-red-950/30 border border-red-900/40 rounded-xl flex items-start space-x-2 text-xs text-red-400 font-light">
                        <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
                        <span>{authError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="btn-glow-cyan w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-white font-semibold py-3.5 rounded-xl border border-cyan-500/30 transition-all disabled:opacity-50"
                    >
                      {authLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                      ) : (
                        <span>{currentPage === 'login' ? 'Authorize Identity' : 'Register Account'}</span>
                      )}
                    </button>

                    <div className="relative my-4 flex items-center justify-center">
                      <div className="border-t border-white/5 w-full"></div>
                      <span className="absolute bg-[#090214] px-3 text-[10px] text-gray-500 font-mono">OR</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={authLoading}
                      className="w-full flex items-center justify-center space-x-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold py-3.5 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                        <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.35 1 3.37 3.65 1.43 7.5l3.85 2.99c.92-2.76 3.5-4.45 6.72-4.45z"/>
                        <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.28 1.48-1.12 2.74-2.38 3.58l3.7 2.87c2.16-1.99 3.41-4.92 3.41-8.6z"/>
                        <path fill="#FBBC05" d="M5.28 10.49c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29L1.43 2.92C.52 4.75 0 6.81 0 9s.52 4.25 1.43 6.08l3.85-3.09z"/>
                        <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.7-2.87c-1.03.69-2.35 1.1-3.96 1.1-3.22 0-5.8-2.19-6.72-4.95L1.73 16.3c1.94 3.85 5.92 6.5 10.57 6.5z"/>
                      </svg>
                      <span>Continue with Google</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDiscordSignIn}
                      disabled={authLoading}
                      className="w-full mt-3 flex items-center justify-center space-x-2 bg-[#5865F2]/15 hover:bg-[#5865F2]/25 border border-[#5865F2]/40 text-white text-xs font-semibold py-3.5 rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_20px_rgba(88,101,242,0.15)]"
                    >
                      <svg className="w-4 h-4 mr-2 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z"/>
                      </svg>
                      <span>Continue with Discord</span>
                    </button>
                  </form>

                  <div className="mt-6 text-center text-xs text-gray-500">
                    {currentPage === 'login' ? (
                      <span>
                        Need an account?{' '}
                        <button onClick={() => { setCurrentPage('register'); setAuthError(null); }} className="text-cyan-400 hover:underline">
                          Create one now
                        </button>
                      </span>
                    ) : (
                      <span>
                        Already registered?{' '}
                        <button onClick={() => { setCurrentPage('login'); setAuthError(null); }} className="text-cyan-400 hover:underline">
                          Log in
                        </button>
                      </span>
                    )}
                  </div>
                </GlassCard>
              </div>
            )}

            {currentPage === 'dashboard' && token && (
              <Dashboard
                token={token}
                onLogout={handleLogout}
                onUpgrade={() => setCurrentPage('premium')}
              />
            )}

            {currentPage === 'premium' && token && (
              <Premium
                token={token}
                onBack={() => setCurrentPage('dashboard')}
                onLogout={handleLogout}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
