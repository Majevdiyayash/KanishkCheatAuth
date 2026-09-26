import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  UserCheck, 
  UserPlus, 
  Eye, 
  EyeOff, 
  Check, 
  ShieldCheck, 
  MessageSquare, 
  AlertCircle, 
  RefreshCw, 
  KeyRound,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react';

interface DexterAuthModalProps {
  initialTab?: 'developer' | 'staff' | 'reseller' | 'register';
  onLoginSubmit: (e: React.FormEvent, emailVal: string, passVal: string, mode: 'login' | 'register') => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  onDiscordSignIn?: () => Promise<void>;
  authError: string | null;
  authLoading: boolean;
  setAuthError: (err: string | null) => void;
  onNavigateHome: () => void;
  onOpenSupport?: () => void;
}

// Curated high quality dark anime backgrounds/GIFs
const ANIME_BACKGROUNDS = [
  {
    id: 'sukuna-flame',
    name: 'Sukuna Fiery Aura',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3ZtNXA0Z3FvaDF4NGg5ZnhmdXhhN2E0eWR1dW5rOXBnczFicmN5YiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/kgo9KtvX2dCVudr645/giphy.gif',
    fallback: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1920&q=80'
  },
  {
    id: 'solo-leveling',
    name: 'Shadow Monarch (Solo Leveling)',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExc3J2NG1iMmlyN2pqOGZkcDZ3OHo3MXZvdjF5dTZ1Z2trNzJwbDcxZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/UgV8Y7bDxsZDCP077j/giphy.gif',
    fallback: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80'
  },
  {
    id: 'itachi-sharingan',
    name: 'Dark Uchiha / Moon',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3ZzYXVzMHhhdGkwdnRnaTVwOGFodG43c2N3bXBpZjl1c3FrcmRkMCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/12Wn7ox4g5PPUs/giphy.gif',
    fallback: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1920&q=80'
  },
  {
    id: 'cyber-city',
    name: 'Cyberpunk Anime Night',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExenN4YWFobXp4MDB3ODZoc2VvMW5odmN5bTZ3b3F1ZWh2aDFic2I3OCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xuXzcHMkuwvf2/giphy.gif',
    fallback: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1920&q=80'
  }
];

export const DexterAuthModal: React.FC<DexterAuthModalProps> = ({
  initialTab = 'developer',
  onLoginSubmit,
  onGoogleSignIn,
  onDiscordSignIn,
  authError,
  authLoading,
  setAuthError,
  onNavigateHome,
  onOpenSupport
}) => {
  const [activeTab, setActiveTab] = useState<'developer' | 'staff' | 'reseller' | 'register'>(initialTab);
  
  // Form input state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [staySignedIn, setStaySignedIn] = useState(true);
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [captchaStatus, setCaptchaStatus] = useState<'unverified' | 'verifying' | 'verified'>('unverified');
  const [captchaError, setCaptchaError] = useState(false);
  const [supportBubbleOpen, setSupportBubbleOpen] = useState(false);
  const [selectedBgIndex, setSelectedBgIndex] = useState(0);
  const [showBgSelector, setShowBgSelector] = useState(false);
  const [bgLoaded, setBgLoaded] = useState(false);

  useEffect(() => {
    setBgLoaded(false);
  }, [selectedBgIndex]);

  const handleTabChange = (tab: 'developer' | 'staff' | 'reseller' | 'register') => {
    setActiveTab(tab);
    setAuthError(null);
    setCaptchaError(false);
    if (tab === 'staff') {
      setPassword('1'); // Default demo password for staff
    } else if (tab === 'reseller') {
      setPassword('');
    } else {
      setPassword('');
    }
  };

  const handleCaptchaClick = () => {
    if (captchaStatus === 'verified') return;
    setCaptchaStatus('verifying');
    setCaptchaError(false);
    setTimeout(() => {
      setCaptchaStatus('verified');
    }, 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (captchaStatus !== 'verified') {
      setCaptchaError(true);
      return;
    }
    const mode = activeTab === 'register' ? 'register' : 'login';
    onLoginSubmit(e, email, password, mode);
  };

  const currentBg = ANIME_BACKGROUNDS[selectedBgIndex];

  return (
    <div className="min-h-screen w-full flex flex-col justify-between text-gray-200 relative selection:bg-orange-500/40 selection:text-white overflow-x-hidden">
      
      {/* ========================================================================= */}
      {/* ANIME GIF / LIVE WALLPAPER BACKGROUND WITH CINEMATIC VIGNETTE OVERLAY     */}
      {/* ========================================================================= */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Background Image / GIF */}
        <img
          src={currentBg.url}
          alt="Anime Background"
          onLoad={() => setBgLoaded(true)}
          className={`w-full h-full object-cover object-center transform scale-105 filter transition-all duration-1000 ${
            bgLoaded ? 'opacity-40 brightness-75 contrast-125' : 'opacity-20 blur-sm'
          }`}
        />
        
        {/* Dark Vignette and Gradient Grids for Readability & High Contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-[#050508]/80 to-[#050508]/70" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#050508]/60 to-[#020204]" />
        
        {/* Soft Fiery Ember Atmosphere */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-orange-600/15 rounded-full blur-[140px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
      </div>

      {/* ========================================================================= */}
      {/* TOP NAVIGATION HEADER (DexterAuth Style with KANISHK CHEAT Branding)     */}
      {/* ========================================================================= */}
      <header className="w-full h-20 bg-[#050508]/70 border-b border-white/10 backdrop-blur-xl sticky top-0 z-40 px-4 sm:px-8 md:px-12 flex items-center justify-between">
        {/* Logo and Brand Name */}
        <div 
          className="flex items-center space-x-3 cursor-pointer group"
          onClick={onNavigateHome}
        >
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-orange-500/40 shadow-[0_0_20px_rgba(255,102,0,0.35)] relative flex items-center justify-center bg-black/60 p-1 group-hover:scale-105 transition-transform">
            <img src="/kc-logo.svg" alt="KANISHK CHEAT Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-1">
              <span className="font-extrabold text-base md:text-lg tracking-tight text-white group-hover:text-orange-400 transition-colors">
                Kanishk<span className="text-orange-500">Cheat</span>
              </span>
            </div>
            <span className="text-[9px] text-gray-400 font-mono tracking-widest uppercase">
              AUTHENTICATION SUITE
            </span>
          </div>
        </div>

        {/* Right Action Nav Items */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Background switcher quick button */}
          <button
            type="button"
            onClick={() => setShowBgSelector(!showBgSelector)}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-black/50 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-medium transition-all"
            title="Switch Anime Wallpaper"
          >
            <ImageIcon className="w-3.5 h-3.5 text-orange-400" />
            <span>Anime BG</span>
          </button>

          <button 
            type="button"
            onClick={() => handleTabChange('developer')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab !== 'register' 
                ? 'bg-white/10 border border-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' 
                : 'bg-black/40 border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-orange-400" />
            <span>Sign In</span>
          </button>
          
          <button 
            type="button"
            onClick={() => handleTabChange('register')}
            className="px-4 sm:px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-500 shadow-[0_0_20px_rgba(255,102,0,0.4)] hover:shadow-[0_0_30px_rgba(255,102,0,0.6)] transition-all transform active:scale-95 cursor-pointer"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* ANIME WALLPAPER PICKER DRAWER / POPOVER                                   */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showBgSelector && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-24 right-4 sm:right-12 z-50 bg-[#0c0d14]/95 border border-orange-500/30 rounded-2xl p-4 shadow-[0_15px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl w-72 sm:w-80"
          >
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-bold text-white">Select Anime Wallpaper</span>
              </div>
              <button 
                onClick={() => setShowBgSelector(false)}
                className="text-gray-400 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-2">
              {ANIME_BACKGROUNDS.map((bg, idx) => (
                <button
                  key={bg.id}
                  onClick={() => {
                    setSelectedBgIndex(idx);
                    setShowBgSelector(false);
                  }}
                  className={`w-full p-2 rounded-xl flex items-center space-x-3 transition-all text-left text-xs ${
                    selectedBgIndex === idx
                      ? 'bg-orange-500/20 border border-orange-500/50 text-white font-semibold'
                      : 'bg-black/40 border border-white/5 text-gray-400 hover:bg-white/5 hover:text-gray-200'
                  }`}
                >
                  <img src={bg.url} alt={bg.name} className="w-10 h-7 rounded object-cover border border-white/10" />
                  <span className="truncate flex-1">{bg.name}</span>
                  {selectedBgIndex === idx && <Check className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MAIN SPLIT AUTH CARD (EXACT DEXTER AUTH LAYOUT & STYLING)                */}
      {/* ========================================================================= */}
      <main className="flex-1 flex items-center justify-center p-3 sm:p-6 md:p-8 z-10 my-4 md:my-8 w-full max-w-7xl mx-auto">
        <div className="w-full max-w-4xl lg:max-w-5xl bg-[#090a10]/85 border border-white/10 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.85)] backdrop-blur-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative">
          
          {/* Subtle Ambient Radial Glows inside the Card */}
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* --------------------------------------------------------------------- */}
          {/* LEFT COLUMN: Portals & Login Credentials Form (7/12 cols)            */}
          {/* --------------------------------------------------------------------- */}
          <div className="lg:col-span-7 p-5 sm:p-8 md:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10 relative z-10">
            <div>
              {/* Top Portals Pill Navigation Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 bg-black/60 border border-white/10 rounded-2xl mb-7">
                {/* 1. Developer Tab */}
                <button
                  type="button"
                  onClick={() => handleTabChange('developer')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center space-x-1.5 cursor-pointer ${
                    activeTab === 'developer'
                      ? 'bg-[#ff5500] text-white shadow-[0_0_15px_rgba(255,85,0,0.5)] border border-orange-400/50'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">Developer</span>
                </button>

                {/* 2. Staff Portal Tab */}
                <button
                  type="button"
                  onClick={() => handleTabChange('staff')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center space-x-1.5 cursor-pointer ${
                    activeTab === 'staff'
                      ? 'bg-[#ff5500] text-white shadow-[0_0_15px_rgba(255,85,0,0.5)] border border-orange-400/50'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">Staff Portal</span>
                </button>

                {/* 3. Reseller Portal Tab */}
                <button
                  type="button"
                  onClick={() => handleTabChange('reseller')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center space-x-1.5 cursor-pointer ${
                    activeTab === 'reseller'
                      ? 'bg-[#ff5500] text-white shadow-[0_0_15px_rgba(255,85,0,0.5)] border border-orange-400/50'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">Reseller Portal</span>
                </button>

                {/* 4. Register Tab */}
                <button
                  type="button"
                  onClick={() => handleTabChange('register')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center space-x-1.5 cursor-pointer ${
                    activeTab === 'register'
                      ? 'bg-[#ff5500] text-white shadow-[0_0_15px_rgba(255,85,0,0.5)] border border-orange-400/50'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">Register</span>
                </button>
              </div>

              {/* Sub-badge Header */}
              <div className="flex items-center space-x-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden border border-orange-500/30 p-0.5 bg-black/60 shadow-[0_0_10px_rgba(255,102,0,0.2)]">
                  <img src="/kc-logo.svg" alt="KC" className="w-full h-full object-contain" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-orange-950/40 border border-orange-500/30 text-orange-400 uppercase">
                    KANISHK CLOUD AUTH
                  </span>
                </div>
              </div>

              {/* Dynamic Title and Subtitle */}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {activeTab === 'developer' && 'Developer Sign In'}
                {activeTab === 'staff' && 'Staff Portal Sign In'}
                {activeTab === 'reseller' && 'Reseller Portal Sign In'}
                {activeTab === 'register' && 'Developer Registration'}
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-1 mb-6">
                {activeTab === 'developer' && 'Sign in with your master developer account'}
                {activeTab === 'staff' && 'Sign in with your staff credentials to manage licenses'}
                {activeTab === 'reseller' && 'Sign in with your reseller credentials & key distributor portal'}
                {activeTab === 'register' && 'Create your developer account to protect your applications'}
              </p>

              {/* Credentials Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {activeTab === 'register' && (
                  <div>
                    <label className="text-xs text-gray-300 font-medium block mb-1.5">Username</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. kanishk_dev"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-black/60 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/40 transition-all"
                    />
                  </div>
                )}

                {/* Email or Username Input */}
                <div>
                  <label className="text-xs text-gray-300 font-medium block mb-1.5">
                    {activeTab === 'register' ? 'Email Address' : 'Email or username'}
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/60 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/40 transition-all"
                  />
                </div>

                {/* Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-gray-300 font-medium">Password</label>
                    {activeTab === 'staff' ? (
                      <button
                        type="button"
                        onClick={() => setPassword('1')}
                        className="text-[11px] font-semibold text-orange-400 bg-orange-950/40 border border-orange-500/30 px-2 py-0.5 rounded-md hover:bg-orange-900/40 transition-all"
                      >
                        Fill Default "1"
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onOpenSupport}
                        className="text-[11px] text-orange-400 hover:text-orange-300 transition-colors"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-black/60 border border-neutral-800 rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/40 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Stay signed in checkbox */}
                <div className="flex items-center space-x-2 pt-0.5">
                  <input
                    type="checkbox"
                    id="staySignedIn"
                    checked={staySignedIn}
                    onChange={(e) => setStaySignedIn(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-700 bg-black/60 text-orange-500 focus:ring-orange-500/30 accent-orange-500 cursor-pointer"
                  />
                  <label htmlFor="staySignedIn" className="text-xs text-gray-400 cursor-pointer select-none">
                    Stay signed in for 30 days
                  </label>
                </div>

                {/* CloudShield Captcha Widget */}
                <div 
                  onClick={handleCaptchaClick}
                  className={`w-full p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer select-none ${
                    captchaStatus === 'verified' 
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400'
                      : captchaError 
                        ? 'bg-red-950/20 border-red-500/40 text-red-400' 
                        : 'bg-black/50 border-neutral-800 hover:border-orange-500/40 text-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                      captchaStatus === 'verified' 
                        ? 'bg-emerald-500 border-emerald-400 text-black' 
                        : captchaStatus === 'verifying'
                          ? 'border-orange-400 bg-orange-500/10'
                          : 'border-neutral-700 bg-black/60'
                    }`}>
                      {captchaStatus === 'verifying' && (
                        <RefreshCw className="w-3 h-3 animate-spin text-orange-400" />
                      )}
                      {captchaStatus === 'verified' && (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      )}
                    </div>
                    <span className="text-xs font-medium">
                      {captchaStatus === 'verified' 
                        ? 'Human verified ✓' 
                        : captchaStatus === 'verifying'
                          ? 'Verifying security signature...'
                          : 'Verify you are human'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 text-[11px] font-mono text-orange-400/90">
                    <ShieldCheck className="w-4 h-4 text-orange-400" />
                    <span>CloudShield</span>
                  </div>
                </div>

                {/* Auth Error Banner */}
                {authError && (
                  <div className="p-3 bg-red-950/30 border border-red-900/40 rounded-xl flex items-start space-x-2 text-xs text-red-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{authError}</span>
                  </div>
                )}

                {/* Main CTA Submit Button (Vibrant Orange Dexter Style) */}
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full mt-2 py-3.5 px-6 rounded-xl font-bold text-xs sm:text-sm tracking-wide text-white bg-gradient-to-r from-orange-500 via-[#ff5e00] to-amber-600 hover:from-orange-600 hover:to-amber-500 shadow-[0_0_25px_rgba(255,94,0,0.45)] hover:shadow-[0_0_35px_rgba(255,94,0,0.6)] transition-all flex items-center justify-center space-x-2 disabled:opacity-50 transform active:scale-98 cursor-pointer"
                >
                  {authLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <>
                      <span>
                        {activeTab === 'developer' && 'Sign In as Developer →'}
                        {activeTab === 'staff' && 'Sign In as Staff →'}
                        {activeTab === 'reseller' && 'Sign In as Reseller →'}
                        {activeTab === 'register' && 'Create Developer Account →'}
                      </span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Bottom Footer Helper Links */}
            <div className="pt-6 mt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-2">
              <div>
                {activeTab === 'register' ? (
                  <span>
                    Already have an account?{' '}
                    <button onClick={() => handleTabChange('developer')} className="text-orange-400 hover:underline font-semibold">
                      Sign In
                    </button>
                  </span>
                ) : (
                  <span>
                    Don't have an account?{' '}
                    <button onClick={() => handleTabChange('register')} className="text-orange-400 hover:underline font-semibold">
                      Create one
                    </button>
                  </span>
                )}
              </div>

              <div>
                <span>Need support? </span>
                <button 
                  onClick={onOpenSupport || (() => window.open('https://discord.gg', '_blank'))}
                  className="text-orange-400 hover:underline font-semibold"
                >
                  Contact Support
                </button>
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* RIGHT COLUMN: Quick Social Auth (5/12 cols)                           */}
          {/* --------------------------------------------------------------------- */}
          <div className="lg:col-span-5 p-6 sm:p-8 md:p-10 bg-gradient-to-br from-white/[0.02] to-transparent flex flex-col justify-center items-center text-center relative">
            
            {/* Center Glowing Logo Avatar */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-black/60 border-2 border-orange-500/40 shadow-[0_0_30px_rgba(255,102,0,0.3)] flex items-center justify-center mb-4 p-2 relative group">
              <img src="/kc-logo.svg" alt="KANISHK Logo" className="w-full h-full object-contain" />
              <div className="absolute inset-0 rounded-2xl bg-orange-500/10 blur-md pointer-events-none" />
            </div>

            {/* Quick Social Auth Title & Description */}
            <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              Quick Social Auth
            </h3>
            <p className="text-xs text-gray-400 mt-1 mb-6 max-w-xs leading-relaxed">
              Authorize instantly using your developer identity.
            </p>

            {/* Social Buttons Stack */}
            <div className="w-full max-w-xs space-y-3">
              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={onGoogleSignIn}
                disabled={authLoading}
                className="w-full py-3 px-4 rounded-xl bg-black/60 hover:bg-white/10 border border-neutral-800 hover:border-orange-500/40 text-white text-xs sm:text-sm font-semibold flex items-center justify-center space-x-3 shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all disabled:opacity-50 transform active:scale-98 cursor-pointer"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.35 1 3.37 3.65 1.43 7.5l3.85 2.99c.92-2.76 3.5-4.45 6.72-4.45z"/>
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.28 1.48-1.12 2.74-2.38 3.58l3.7 2.87c2.16-1.99 3.41-4.92 3.41-8.6z"/>
                  <path fill="#FBBC05" d="M5.28 10.49c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29L1.43 2.92C.52 4.75 0 6.81 0 9s.52 4.25 1.43 6.08l3.85-3.09z"/>
                  <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.7-2.87c-1.03.69-2.35 1.1-3.96 1.1-3.22 0-5.8-2.19-6.72-4.95L1.73 16.3c1.94 3.85 5.92 6.5 10.57 6.5z"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Discord OAuth Button */}
              <button
                type="button"
                onClick={onDiscordSignIn}
                disabled={authLoading}
                className="w-full py-3 px-4 rounded-xl bg-black/60 hover:bg-white/10 border border-neutral-800 hover:border-orange-500/40 text-white text-xs sm:text-sm font-semibold flex items-center justify-center space-x-3 shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all disabled:opacity-50 transform active:scale-98 cursor-pointer"
              >
                <svg className="w-4 h-4 flex-shrink-0 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                <span>Continue with Discord</span>
              </button>
            </div>

            {/* Subtle Encryption Guarantee */}
            <div className="mt-8 flex items-center space-x-1.5 text-[11px] text-gray-500">
              <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
              <span>256-Bit Cryptographic Hardware Lock</span>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* VERTICAL FIXED SUPPORT TAB ON RIGHT EDGE (Matches Screenshot)             */}
      {/* ========================================================================= */}
      <div 
        onClick={() => {
          if (onOpenSupport) onOpenSupport();
          setSupportBubbleOpen(!supportBubbleOpen);
        }}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-[#ff3b30] hover:bg-[#ff5500] text-white font-extrabold text-[10px] tracking-widest py-3 px-1.5 rounded-l-lg shadow-[0_0_20px_rgba(255,59,48,0.5)] cursor-pointer select-none [writing-mode:vertical-rl] flex items-center justify-center space-y-1 transition-all transform hover:-translate-x-1"
        title="Open Support"
      >
        <span className="rotate-180 uppercase font-mono">SUPPORT</span>
      </div>

      {/* ========================================================================= */}
      {/* FLOATING SUPPORT CHAT BUBBLE & LAUNCHER (Bottom Right)                     */}
      {/* ========================================================================= */}
      <div className="fixed bottom-5 right-5 z-50 flex items-end flex-col space-y-3">
        {supportBubbleOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="w-72 sm:w-80 bg-[#0c0d14]/95 border border-orange-500/40 rounded-2xl p-4 shadow-[0_15px_40px_rgba(255,102,0,0.3)] backdrop-blur-xl relative"
          >
            <button
              onClick={() => setSupportBubbleOpen(false)}
              className="absolute top-2.5 right-2.5 text-gray-400 hover:text-white text-xs p-1"
            >
              ✕
            </button>
            <div className="flex items-center space-x-3 mb-2.5">
              <div className="relative">
                <img src="/kc-logo.svg" alt="Support" className="w-8 h-8 rounded-xl object-contain border border-orange-500/40 p-0.5 bg-black" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#0c0d14] rounded-full" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">KANISHK CHEAT Support</div>
                <div className="text-[10px] text-orange-400 font-mono">24/7 Live Assistance</div>
              </div>
            </div>
            <p className="text-[11.5px] text-gray-300 leading-relaxed">
              Need assistance with your developer account, API keys or license integration?
            </p>
            <button
              type="button"
              onClick={() => {
                if (onOpenSupport) onOpenSupport();
                setSupportBubbleOpen(false);
              }}
              className="w-full mt-3 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(255,102,0,0.3)] transition-all text-center"
            >
              Open Live Help & Documentation →
            </button>
          </motion.div>
        )}

        <button
          type="button"
          onClick={() => setSupportBubbleOpen(!supportBubbleOpen)}
          className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-[#ff3b30] hover:bg-[#ff5500] border-2 border-white/20 shadow-[0_0_25px_rgba(255,59,48,0.6)] flex items-center justify-center text-white transition-all transform hover:scale-105 active:scale-95 relative cursor-pointer"
          title="Open KANISHK Support"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-[#ff3b30] text-[10px] font-black rounded-full flex items-center justify-center shadow">
            1
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM SUBTLE FOOTER                                                      */}
      {/* ========================================================================= */}
      <footer className="w-full py-4 text-center text-[11px] text-gray-500 border-t border-white/5 bg-[#050508]/60 backdrop-blur-md z-20">
        <span>© 2026 KANISHK CHEAT AUTH SYSTEM • All Rights Reserved</span>
      </footer>
    </div>
  );
};
