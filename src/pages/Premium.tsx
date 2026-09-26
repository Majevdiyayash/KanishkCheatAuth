import React from "react";
import { Crown, ArrowLeft, CheckCircle2, ShieldCheck, Zap } from "lucide-react";

interface PremiumProps {
  token: string;
  onBack: () => void;
  onLogout?: () => void;
}

export const Premium: React.FC<PremiumProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-[#03030a] text-white py-12 px-6 max-w-6xl mx-auto">
      {/* Top Header Row */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-3 py-1.5 rounded-full">
          <Crown className="w-3.5 h-3.5 text-cyan-400" />
          <span>PLATFORM ACCESS: 100% FREE UNLIMITED</span>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-bold mb-4 shadow-[0_0_20px_rgba(0,240,255,0.2)]">
          <Zap className="w-4 h-4 text-cyan-400" />
          <span>ZERO FEES • UNLIMITED POWER</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          🎉 100% Free Unlimited Platform Access Enabled!
        </h1>
        <p className="text-sm text-gray-400 mt-2 max-w-xl mx-auto">
          All subscription restrictions and paid plan tiers have been completely removed. Enjoy unlimited applications, unlimited license key generation, and enterprise features free of cost!
        </p>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="p-6 rounded-2xl bg-[#0e0e14] border border-cyan-500/30 shadow-[0_0_30px_rgba(0,240,255,0.1)]">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">Unlimited Applications</h3>
          <p className="text-xs text-gray-400">
            Create as many software application slots as you need with hardware locks & anti-tamper security.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#0e0e14] border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">Unlimited License Keys</h3>
          <p className="text-xs text-gray-400">
            Generate single or bulk license keys with custom expiry, HWID bindings, and custom variable values.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#0e0e14] border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.1)]">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">Pro Features Unlocked</h3>
          <p className="text-xs text-gray-400">
            Discord Webhooks, Reseller Portal, Staff Management, Cloud Variables & Firewall rules included.
          </p>
        </div>
      </div>
    </div>
  );
};