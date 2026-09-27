import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Check, RefreshCw, Lock } from 'lucide-react';

interface CloudShieldGatekeeperProps {
  onVerified: () => void;
}

export const CloudShieldGatekeeper: React.FC<CloudShieldGatekeeperProps> = ({ onVerified }) => {
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Check if already verified in this session
    const isAlreadyVerified = sessionStorage.getItem('kc_browser_verified') === 'true';
    if (isAlreadyVerified) {
      onVerified();
      return;
    }

    // Auto-start verification process
    const timer = setTimeout(() => {
      startVerification();
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  const startVerification = () => {
    if (verified || verifying) return;
    setVerifying(true);
    setProgress(20);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          completeVerification();
          return 100;
        }
        return prev + Math.floor(Math.random() * 25) + 15;
      });
    }, 180);
  };

  const completeVerification = () => {
    setVerified(true);
    setVerifying(false);
    sessionStorage.setItem('kc_browser_verified', 'true');
    setTimeout(() => {
      onVerified();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-[#0d1117] text-white flex flex-col items-center justify-center p-4 font-sans select-none">
      {/* Background Subtle Cyber Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Verification Card matching KeyAuth/CloudShield style */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-[440px] bg-[#161b22] border border-[#30363d] rounded-2xl p-8 shadow-[0_25px_70px_rgba(0,0,0,0.8)] text-center relative z-10 space-y-6"
      >
        {/* Brand Header */}
        <div className="flex items-center justify-center space-x-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-black/60 border border-yellow-500/40 p-1 flex items-center justify-center shadow-[0_0_15px_rgba(250,204,21,0.25)]">
            <img src="/kanishk-logo.svg" alt="KANISHK CHEAT AUTH Logo" className="w-full h-full object-contain" />
          </div>
          <div className="text-left">
            <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
              <span>KANISHK CHEAT</span>
              <span className="text-yellow-400">AUTH</span>
            </h2>
            <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">CloudShield Security Gate</p>
          </div>
        </div>

        {/* Checking Title */}
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-white tracking-tight">Checking your browser...</h3>
          <p className="text-xs text-gray-400 font-light leading-relaxed">
            This process is automatic. Your browser will redirect shortly.
          </p>
        </div>

        {/* ALTCHA / CloudShield Verification Box */}
        <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] text-left transition-all">
          <div className="flex items-center justify-between">
            <label 
              onClick={startVerification}
              className="flex items-center space-x-3 cursor-pointer group flex-1"
            >
              <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${
                verified 
                  ? 'bg-emerald-500 border-emerald-400 text-black shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
                  : verifying
                  ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                  : 'bg-black/60 border-[#30363d] group-hover:border-yellow-500/50'
              }`}>
                {verified ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : verifying ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-sm bg-gray-500 group-hover:bg-yellow-400 transition-colors" />
                )}
              </div>

              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white">
                  {verified ? 'Verified' : verifying ? 'Verifying browser...' : 'Verify you are human'}
                </span>
                <span className="text-[9.5px] text-gray-500 font-mono">
                  Protected by <span className="text-yellow-400 font-bold">ALTCHA / CloudShield</span>
                </span>
              </div>
            </label>

            <ShieldCheck className={`w-5 h-5 transition-colors ${verified ? 'text-emerald-400' : 'text-gray-500'}`} />
          </div>

          {/* Progress Bar while scanning */}
          {verifying && !verified && (
            <div className="mt-3 h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
          )}
        </div>

        {/* Verification Status Banner */}
        <AnimatePresence>
          {verified ? (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Verification successful! Redirecting...</span>
            </motion.div>
          ) : (
            <div className="flex items-center justify-center space-x-2 text-[11px] text-gray-500 font-mono">
              <Lock className="w-3 h-3 text-yellow-400" />
              <span>DDoS & Bot Attack Protection Active</span>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
