import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'yellow' | 'gold' | 'amber' | 'orange' | 'cyan' | 'blue' | 'purple' | 'none';
  intensity?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  glowColor = 'yellow'
}) => {
  // Determine glow accent border
  const glowShadows: Record<string, string> = {
    yellow: 'hover:shadow-[0_0_30px_rgba(250,204,21,0.25)] hover:border-yellow-400/50',
    gold: 'hover:shadow-[0_0_30px_rgba(245,158,11,0.25)] hover:border-amber-400/50',
    amber: 'hover:shadow-[0_0_30px_rgba(245,158,11,0.22)] hover:border-amber-500/40',
    orange: 'hover:shadow-[0_0_30px_rgba(255,94,0,0.22)] hover:border-orange-500/40',
    cyan: 'hover:shadow-[0_0_25px_rgba(0,240,255,0.15)] hover:border-cyan-500/40',
    blue: 'hover:shadow-[0_0_25px_rgba(0,102,255,0.15)] hover:border-blue-500/40',
    purple: 'hover:shadow-[0_0_25px_rgba(189,0,255,0.15)] hover:border-purple-500/40',
    none: 'hover:border-white/20'
  };

  return (
    <div
      className={`glass-panel rounded-2xl transition-all duration-300 border border-white/10 overflow-hidden ${glowShadows[glowColor] || glowShadows.yellow} ${className}`}
    >
      <div>
        {children}
      </div>
    </div>
  );
};
