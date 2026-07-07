import React, { useRef, useState } from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'cyan' | 'blue' | 'purple' | 'none';
  intensity?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  glowColor = 'cyan', 
  intensity = 15 
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    
    // Calculate cursor positions relative to the center of the card
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;

    // Convert positions to rotational degrees
    const rX = -(mouseY / (height / 2)) * intensity;
    const rY = (mouseX / (width / 2)) * intensity;

    setCoords({ x: rX, y: rY });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setCoords({ x: 0, y: 0 });
  };

  // Determine glow accent border
  const glowShadows = {
    cyan: 'hover:shadow-[0_0_30px_rgba(0,240,255,0.15)] hover:border-cyan-500/30',
    blue: 'hover:shadow-[0_0_30px_rgba(0,102,255,0.15)] hover:border-blue-500/30',
    purple: 'hover:shadow-[0_0_30px_rgba(189,0,255,0.15)] hover:border-purple-500/30',
    none: 'hover:border-white/20'
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`glass-panel rounded-2xl transition-all duration-300 ease-out border border-white/5 overflow-hidden ${glowShadows[glowColor]} ${className}`}
      style={{
        transformStyle: 'preserve-3d',
        transform: isHovered 
          ? `perspective(1000px) rotateX(${coords.x}deg) rotateY(${coords.y}deg) scale3d(1.02, 1.02, 1.02)` 
          : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      }}
    >
      {/* Light Reflection overlay that moves with mouse */}
      {isHovered && (
        <div 
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 bg-radial from-white/10 to-transparent"
          style={{
            transform: 'translateZ(10px)',
          }}
        />
      )}
      
      <div style={{ transform: 'translateZ(20px)', transformStyle: 'preserve-3d' }}>
        {children}
      </div>
    </div>
  );
};
