import React, { useEffect, useRef } from 'react';

export const CursorGlow: React.FC = () => {
  const dotRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const glow = glowRef.current;
    if (!dot || !glow) return;

    let mouseX = -200;
    let mouseY = -200;
    let currentX = -200;
    let currentY = -200;
    let rafId: number;
    let isMoving = false;

    // Track mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      isMoving = true;
    };

    // GPU-accelerated animation loop using translate3d
    const animate = () => {
      if (isMoving) {
        // Smooth lerp for the outer glow blob only
        currentX += (mouseX - currentX) * 0.15;
        currentY += (mouseY - currentY) * 0.15;

        // Instant position for the inner dot to prevent desync / DPI lag
        if (dot) {
          dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
        }

        if (glow) {
          glow.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
        }
        
        // Stop animating if outer glow caught up with mouse to save CPU cycles
        if (Math.abs(mouseX - currentX) < 0.1 && Math.abs(mouseY - currentY) < 0.1) {
          isMoving = false;
        }
      }

      rafId = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    rafId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      {/* Outer slow glow blob — GPU accelerated, low opacity */}
      <div
        ref={glowRef}
        className="fixed pointer-events-none z-[9998] left-0 top-0"
        style={{
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 170, 255, 0.12) 0%, rgba(0, 100, 255, 0.05) 50%, transparent 75%)',
          filter: 'blur(8px)',
          willChange: 'transform',
          mixBlendMode: 'screen',
        }}
      />

      {/* Inner sharp cursor dot — instant alignment, GPU accelerated */}
      <div
        ref={dotRef}
        className="fixed pointer-events-none z-[9999] left-0 top-0"
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: 'rgba(0, 200, 255, 0.95)',
          boxShadow: '0 0 6px 2px rgba(0, 180, 255, 0.5)',
          willChange: 'transform',
        }}
      />
    </>
  );
};
