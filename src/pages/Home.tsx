import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Cpu, Activity, ArrowRight, BookOpen } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';

interface HomeProps {
  onLaunch: () => void;
  onViewDocs: () => void;
}

export const Home: React.FC<HomeProps> = ({ onLaunch, onViewDocs }) => {
  // Stagger configurations for letter reveals
  const titleContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const letterAnimation = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100 } },
  };

  const line1 = "Secure Your Software.";
  const line2 = "Control Every License.";
  const line3 = "Build Without Limits.";

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 py-20 z-10 overflow-hidden">
      {/* Dynamic light refraction highlights in the background */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[120px] animate-pulse-soft pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-purple-500/5 blur-[150px] animate-pulse-soft pointer-events-none" style={{ animationDelay: '3s' }} />

      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        {/* Left Side: Cinematic Typography */}
        <div className="lg:col-span-7 flex flex-col text-left space-y-8">
          {/* Tagline label */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 w-fit shadow-[0_0_15px_rgba(0,240,255,0.05)]"
          >
            <Shield className="w-4 h-4 text-glow-cyan" />
            <span className="text-sm font-medium tracking-wide text-cyan-400">NEXT GENERATION SECURITY API</span>
          </motion.div>

          {/* Staggered text headers */}
          <motion.h1
            variants={titleContainer}
            initial="hidden"
            animate="show"
            className="text-5xl md:text-6xl xl:text-7xl font-extrabold tracking-tight text-white flex flex-col gap-2"
          >
            <span className="block text-white leading-tight">
              {line1.split("").map((char, index) => (
                <motion.span key={index} variants={letterAnimation} className="inline-block">
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              ))}
            </span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 leading-tight">
              {line2.split("").map((char, index) => (
                <motion.span key={index} variants={letterAnimation} className="inline-block">
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              ))}
            </span>
            <span className="block text-white/90 leading-tight">
              {line3.split("").map((char, index) => (
                <motion.span key={index} variants={letterAnimation} className="inline-block">
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              ))}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.2 }}
            className="text-lg text-gray-400 max-w-xl font-light leading-relaxed"
          >
            A high-performance, developer-first cryptographic licensing platform. Integrate bulletproof authorization, instant HWID locks, and SDK generators in seconds. Built for scale.
          </motion.p>

          {/* Premium buttons with liquid borders */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.5 }}
            className="flex flex-wrap gap-4 pt-4"
          >
            <button
              onClick={onLaunch}
              className="btn-glow-cyan group flex items-center space-x-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500 hover:to-blue-600 text-white font-semibold px-8 py-4 rounded-xl border border-cyan-500/30 transition-all duration-300"
            >
              <span>Launch Platform</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={onViewDocs}
              className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 text-white font-medium px-8 py-4 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300"
            >
              <BookOpen className="w-5 h-5 text-gray-400" />
              <span>View Documentation</span>
            </button>
          </motion.div>
        </div>

        {/* Right Side: Interactive 3D perspective GlassCard showing SDK code */}
        <div className="lg:col-span-5 flex justify-center items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotateY: 15 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1.2, delay: 0.5 }}
            className="w-full max-w-md"
          >
            <GlassCard className="p-6 relative group" glowColor="cyan" intensity={18}>
              {/* Soft neon core inside card */}
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-cyan-500/20 blur-[50px] group-hover:bg-cyan-500/30 transition-all" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-purple-500/10 blur-[50px]" />

              {/* Title bar */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <span className="text-xs text-gray-500 font-mono tracking-wider">api_config.cs</span>
                </div>
                <span className="text-xs text-cyan-400 font-mono bg-cyan-950/45 px-2.5 py-0.5 rounded border border-cyan-800/30">C# SDK</span>
              </div>

              {/* Code display inside 3D card */}
              <pre className="text-left text-xs font-mono leading-relaxed text-gray-300 overflow-x-auto select-none">
                <code>
                  <span className="text-blue-400">public static</span> <span className="text-cyan-400">api</span> <span className="text-purple-400">Kanishk CheatCheatsAuth</span> = <span className="text-blue-400">new</span> <span className="text-cyan-400">api</span>(<br />
                  &nbsp;&nbsp;name: <span className="text-green-400">"EnterpriseShield"</span>,<br />
                  &nbsp;&nbsp;ownerid: <span className="text-green-400">"INV_79A2"</span>,<br />
                  &nbsp;&nbsp;secret: <span className="text-green-400">"f7b9c9d0a92e17"</span>,<br />
                  &nbsp;&nbsp;version: <span className="text-green-400">"1.0"</span><br />
                  );<br />
                  <br />
                  <span className="text-blue-400">void</span> <span className="text-yellow-400">Main</span>()<br />
                  {`{`}<br />
                  &nbsp;&nbsp;Kanishk CheatCheatsAuth.<span className="text-yellow-400">init</span>();<br />
                  &nbsp;&nbsp;<span className="text-blue-400">if</span> (Kanishk CheatCheatsAuth.response.success)<br />
                  &nbsp;&nbsp;{`{`}<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;Kanishk CheatCheatsAuth.<span className="text-yellow-400">license</span>(userInputKey);<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-400">if</span> (Kanishk CheatCheatsAuth.check())<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-cyan-400">Console</span>.<span className="text-yellow-400">WriteLine</span>(<span className="text-green-400">"Authorized!"</span>);<br />
                  &nbsp;&nbsp;{`}`}<br />
                  {`}`}
                </code>
              </pre>

              {/* Holographic specs grid */}
              <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-white/5 text-center text-[10px] text-gray-500 font-mono">
                <div className="flex flex-col items-center p-2 rounded bg-white/2 border border-white/5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400 mb-1" />
                  <span>HWID LOCK</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded bg-white/2 border border-white/5">
                  <Activity className="w-3.5 h-3.5 text-purple-400 mb-1" />
                  <span>ANTI-REPLAY</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded bg-white/2 border border-white/5">
                  <Shield className="w-3.5 h-3.5 text-blue-400 mb-1" />
                  <span>256-AES</span>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

