import React, { useEffect, useRef, useState } from 'react';

export const ParticlesBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem('particle_theme') || 'all';
  });

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('particle_theme', newTheme);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animId: number;
    let frame = 0;
    const mouse = { x: -9999, y: -9999, vx: 0, vy: 0 };
    let lastMouse = { x: -9999, y: -9999 };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();

    // ========================================================================
    // ENGINE 1: CYBER MATRIX & 3D HEXAGONS
    // ========================================================================
    const matrixCols = Math.floor(window.innerWidth / 20);
    const matrixDrops: number[] = new Array(matrixCols).fill(1);
    const matrixChars = "01010101XYZKEYAUTHINNOVATORPROXYHEXCYBER987654321";
    
    interface Hexagon3D {
      x: number; y: number; z: number;
      size: number;
      rx: number; ry: number; rz: number;
      drx: number; dry: number; drz: number;
      color: string;
    }
    const hexagons: Hexagon3D[] = [];
    for (let i = 0; i < 15; i++) {
      hexagons.push({
        x: (Math.random() - 0.5) * window.innerWidth * 1.2,
        y: (Math.random() - 0.5) * window.innerHeight * 1.2,
        z: Math.random() * 600 - 200,
        size: 30 + Math.random() * 50,
        rx: Math.random() * Math.PI, ry: Math.random() * Math.PI, rz: Math.random() * Math.PI,
        drx: (Math.random() - 0.5) * 0.02, dry: (Math.random() - 0.5) * 0.02, drz: (Math.random() - 0.5) * 0.02,
        color: Math.random() > 0.5 ? '#00f0ff' : '#00ff66'
      });
    }

    interface CyberRipple { x: number; y: number; radius: number; alpha: number; color: string; }
    const ripples: CyberRipple[] = [];

    const drawMatrixEngine = () => {
      ctx.fillStyle = 'rgba(3, 3, 10, 0.18)';
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      // 1. Matrix Data Rain
      ctx.font = '12px monospace';
      for (let i = 0; i < matrixDrops.length; i++) {
        const text = matrixChars.charAt(Math.floor(Math.random() * matrixChars.length));
        const x = i * 20;
        const y = matrixDrops[i] * 20;

        ctx.fillStyle = Math.random() > 0.8 ? '#ffffff' : '#00ff66';
        ctx.fillText(text, x, y);

        if (y > window.innerHeight && Math.random() > 0.975) {
          matrixDrops[i] = 0;
        }
        matrixDrops[i]++;
      }

      // 2. 3D Rotating Wireframe Hexagons
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const fov = 400;

      hexagons.forEach(h => {
        h.rx += h.drx; h.ry += h.dry; h.rz += h.drz;
        h.z -= 0.8;
        if (h.z < -300) h.z = 600;

        const scale = fov / (fov + h.z);
        const px = cx + h.x * scale;
        const py = cy + h.y * scale;

        if (px < -100 || px > window.innerWidth + 100 || py < -100 || py > window.innerHeight + 100) return;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(h.rz);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const hx = Math.cos(angle) * h.size * scale * Math.cos(h.ry);
          const hy = Math.sin(angle) * h.size * scale * Math.cos(h.rx);
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.strokeStyle = h.color;
        ctx.lineWidth = 1.5 * scale;
        ctx.shadowColor = h.color;
        ctx.shadowBlur = 15 * scale;
        ctx.stroke();
        ctx.restore();
      });

      // 3. Mouse Cyber Ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += 3.5;
        r.alpha -= 0.02;
        if (r.alpha <= 0) { ripples.splice(i, 1); continue; }

        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 240, 255, ${r.alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    // ========================================================================
    // ENGINE 2: GALAXY NEBULA & 3D ORBITING VORTEX
    // ========================================================================
    interface OrbitStar {
      angle: number; radius: number; z: number;
      speed: number; size: number; color: string;
    }
    const orbitStars: OrbitStar[] = [];
    const nebulaColors = ['#8b00ff', '#ff007f', '#00f0ff', '#ffffff'];
    for (let i = 0; i < 150; i++) {
      orbitStars.push({
        angle: Math.random() * Math.PI * 2,
        radius: 40 + Math.random() * (Math.max(window.innerWidth, window.innerHeight) * 0.7),
        z: (Math.random() - 0.5) * 500,
        speed: 0.001 + Math.random() * 0.003,
        size: 1 + Math.random() * 2.5,
        color: nebulaColors[Math.floor(Math.random() * nebulaColors.length)]
      });
    }

    interface Meteor { x: number; y: number; vx: number; vy: number; tail: {x:number; y:number}[]; life: number; color: string; }
    const meteors: Meteor[] = [];

    const drawNebulaEngine = () => {
      ctx.fillStyle = '#03020a';
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      // 1. Draw Nebula Glowing Clouds
      const time = Date.now() * 0.0008;
      const g1 = ctx.createRadialGradient(
        window.innerWidth * 0.3 + Math.sin(time) * 150, window.innerHeight * 0.4 + Math.cos(time) * 100, 0,
        window.innerWidth * 0.3, window.innerHeight * 0.4, 500
      );
      g1.addColorStop(0, 'rgba(139, 0, 255, 0.15)');
      g1.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      const g2 = ctx.createRadialGradient(
        window.innerWidth * 0.7 + Math.cos(time * 0.8) * 180, window.innerHeight * 0.6 + Math.sin(time * 0.8) * 120, 0,
        window.innerWidth * 0.7, window.innerHeight * 0.6, 500
      );
      g2.addColorStop(0, 'rgba(255, 0, 128, 0.12)');
      g2.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      // 2. 3D Orbiting Star Vortex
      const cx = window.innerWidth / 2 + (mouse.x > 0 ? (mouse.x - window.innerWidth / 2) * 0.08 : 0);
      const cy = window.innerHeight / 2 + (mouse.y > 0 ? (mouse.y - window.innerHeight / 2) * 0.08 : 0);
      const fov = 450;

      orbitStars.forEach(s => {
        s.angle += s.speed;
        const x3d = Math.cos(s.angle) * s.radius;
        const y3d = Math.sin(s.angle) * s.radius * 0.45;
        const z3d = s.z + Math.sin(s.angle * 2) * 50;

        const scale = fov / (fov + z3d + 250);
        const px = cx + x3d * scale;
        const py = cy + y3d * scale;

        ctx.beginPath();
        ctx.arc(px, py, s.size * scale, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 8 * scale;
        ctx.fill();
      });

      // 3. Meteors
      if (frame % 90 === 0 && Math.random() > 0.3) {
        meteors.push({
          x: Math.random() * window.innerWidth,
          y: 0,
          vx: 5 + Math.random() * 5,
          vy: 5 + Math.random() * 5,
          tail: [],
          life: 60,
          color: Math.random() > 0.5 ? '#00f0ff' : '#ff007f'
        });
      }

      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.tail.unshift({ x: m.x, y: m.y });
        if (m.tail.length > 15) m.tail.pop();
        m.x += m.vx; m.y += m.vy; m.life--;
        if (m.life <= 0) { meteors.splice(i, 1); continue; }

        for (let j = 1; j < m.tail.length; j++) {
          const a = (1 - j / m.tail.length) * 0.5;
          ctx.strokeStyle = `${m.color}${Math.floor(a * 255).toString(16).padStart(2, '0')}`;
          ctx.lineWidth = (1 - j / m.tail.length) * 2;
          ctx.beginPath();
          ctx.moveTo(m.tail[j - 1].x, m.tail[j - 1].y);
          ctx.lineTo(m.tail[j].x, m.tail[j].y);
          ctx.stroke();
        }
      }
    };

    // ========================================================================
    // ENGINE 3: QUANTUM PLEXUS & 3D NEURAL LATTICE
    // ========================================================================
    interface PlexusNode {
      x: number; y: number; z: number;
      vx: number; vy: number; vz: number;
      color: string;
    }
    const plexusNodes: PlexusNode[] = [];
    const plexusColors = ['#00f0ff', '#ffd700', '#007aff', '#ffffff'];
    for (let i = 0; i < 75; i++) {
      plexusNodes.push({
        x: (Math.random() - 0.5) * window.innerWidth * 1.5,
        y: (Math.random() - 0.5) * window.innerHeight * 1.5,
        z: (Math.random() - 0.5) * 600,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        vz: (Math.random() - 0.5) * 1.2,
        color: plexusColors[Math.floor(Math.random() * plexusColors.length)]
      });
    }

    const drawPlexusEngine = () => {
      ctx.fillStyle = '#04050d';
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const fov = 500;

      const projected: { x: number; y: number; scale: number; color: string; z: number }[] = [];

      plexusNodes.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.z += p.vz;
        if (p.x < -window.innerWidth) p.vx *= -1; if (p.x > window.innerWidth) p.vx *= -1;
        if (p.y < -window.innerHeight) p.vy *= -1; if (p.y > window.innerHeight) p.vy *= -1;
        if (p.z < -400 || p.z > 400) p.vz *= -1;

        const scale = fov / (fov + p.z + 400);
        const px = cx + p.x * scale;
        const py = cy + p.y * scale;

        projected.push({ x: px, y: py, scale, color: p.color, z: p.z });

        ctx.beginPath();
        ctx.arc(px, py, 2.5 * scale, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10 * scale;
        ctx.fill();
      });

      ctx.lineWidth = 0.6;
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const p1 = projected[i];
          const p2 = projected[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < 130 * 130) {
            const alpha = (1 - Math.sqrt(distSq) / 130) * 0.35;
            ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        if (mouse.x > 0) {
          const mdx = projected[i].x - mouse.x;
          const mdy = projected[i].y - mouse.y;
          const mDistSq = mdx * mdx + mdy * mdy;
          if (mDistSq < 180 * 180) {
            const alpha = (1 - Math.sqrt(mDistSq) / 180) * 0.6;
            ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(projected[i].x, projected[i].y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }
    };

    // ========================================================================
    // ENGINE 4: SYNTHWAVE LASER GRID & 3D CYBER CITY
    // ========================================================================
    let gridOffset = 0;
    interface Diamond3D {
      x: number; y: number; z: number;
      size: number; angle: number; speed: number; color: string;
    }
    const diamonds: Diamond3D[] = [];
    for (let i = 0; i < 10; i++) {
      diamonds.push({
        x: (Math.random() - 0.5) * window.innerWidth * 0.8,
        y: -50 - Math.random() * 150,
        z: 50 + Math.random() * 300,
        size: 20 + Math.random() * 25,
        angle: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.03,
        color: Math.random() > 0.5 ? '#ff007f' : '#ff6600'
      });
    }

    const drawSynthwaveEngine = () => {
      ctx.fillStyle = '#080114';
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      const horizonY = window.innerHeight * 0.48;
      const cx = window.innerWidth / 2;

      const sunRadius = Math.min(window.innerWidth, window.innerHeight) * 0.22;
      const sunG = ctx.createLinearGradient(cx, horizonY - sunRadius * 2, cx, horizonY);
      sunG.addColorStop(0, '#ffd700');
      sunG.addColorStop(0.5, '#ff007f');
      sunG.addColorStop(1, '#6600ff');

      ctx.beginPath();
      ctx.arc(cx, horizonY - sunRadius * 0.4, sunRadius, Math.PI, Math.PI * 2);
      ctx.fillStyle = sunG;
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 40;
      ctx.fill();

      ctx.fillStyle = '#080114';
      for (let i = 0; i < 6; i++) {
        const barY = horizonY - i * 18 - 10;
        const barH = 2 + i * 1.5;
        ctx.fillRect(cx - sunRadius - 10, barY, (sunRadius + 10) * 2, barH);
      }

      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255, 0, 128, 0.45)';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      for (let x = -window.innerWidth * 2; x <= window.innerWidth * 3; x += 80) {
        ctx.moveTo(cx, horizonY);
        ctx.lineTo(x, window.innerHeight);
      }
      ctx.stroke();

      gridOffset = (gridOffset + 1.2) % 40;
      ctx.beginPath();
      for (let y = horizonY + 5; y <= window.innerHeight; y += Math.pow((y - horizonY) * 0.08, 1.4) + 10) {
        const drawY = y + (gridOffset * ((y - horizonY) / window.innerHeight));
        if (drawY > window.innerHeight || drawY < horizonY) continue;
        ctx.moveTo(0, drawY);
        ctx.lineTo(window.innerWidth, drawY);
      }
      ctx.stroke();

      const fov = 350;
      diamonds.forEach(d => {
        d.angle += d.speed;
        const scale = fov / (fov + d.z);
        const px = cx + d.x * scale;
        const py = horizonY + d.y * scale + Math.sin(d.angle) * 15;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(d.angle);
        ctx.beginPath();
        ctx.moveTo(0, -d.size * scale);
        ctx.lineTo(d.size * scale * 0.7, 0);
        ctx.lineTo(0, d.size * scale);
        ctx.lineTo(-d.size * scale * 0.7, 0);
        ctx.closePath();
        ctx.strokeStyle = d.color;
        ctx.lineWidth = 2 * scale;
        ctx.shadowColor = d.color;
        ctx.shadowBlur = 15 * scale;
        ctx.stroke();
        ctx.restore();
      });
    };

    // ========================================================================
    // ENGINE 5: ALL COMBINED (ULTIMATE HYBRID MODE)
    // ========================================================================
    const drawAllCombinedEngine = () => {
      ctx.fillStyle = '#03020a';
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;

      // 1. Nebula Clouds
      const time = Date.now() * 0.0008;
      const g1 = ctx.createRadialGradient(
        window.innerWidth * 0.3 + Math.sin(time) * 150, window.innerHeight * 0.4 + Math.cos(time) * 100, 0,
        window.innerWidth * 0.3, window.innerHeight * 0.4, 500
      );
      g1.addColorStop(0, 'rgba(139, 0, 255, 0.12)');
      g1.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      // 2. Synthwave Floor Grid (Subtle)
      const horizonY = window.innerHeight * 0.55;
      ctx.strokeStyle = 'rgba(255, 0, 128, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = -window.innerWidth; x <= window.innerWidth * 2; x += 120) {
        ctx.moveTo(cx, horizonY);
        ctx.lineTo(x, window.innerHeight);
      }
      gridOffset = (gridOffset + 1) % 40;
      for (let y = horizonY + 10; y <= window.innerHeight; y += Math.pow((y - horizonY) * 0.08, 1.4) + 15) {
        const drawY = y + (gridOffset * ((y - horizonY) / window.innerHeight));
        if (drawY > window.innerHeight || drawY < horizonY) continue;
        ctx.moveTo(0, drawY);
        ctx.lineTo(window.innerWidth, drawY);
      }
      ctx.stroke();

      // 3. Orbiting Nebula Stars
      const fov = 450;
      orbitStars.forEach(s => {
        s.angle += s.speed;
        const x3d = Math.cos(s.angle) * s.radius;
        const y3d = Math.sin(s.angle) * s.radius * 0.45;
        const z3d = s.z + Math.sin(s.angle * 2) * 50;
        const scale = fov / (fov + z3d + 250);
        const px = cx + x3d * scale;
        const py = cy + y3d * scale;
        ctx.beginPath();
        ctx.arc(px, py, s.size * scale, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.fill();
      });

      // 4. Matrix Data Rain (Subtle)
      ctx.font = '11px monospace';
      for (let i = 0; i < matrixDrops.length; i += 2) {
        const text = matrixChars.charAt(Math.floor(Math.random() * matrixChars.length));
        const x = i * 20;
        const y = matrixDrops[i] * 20;
        ctx.fillStyle = Math.random() > 0.8 ? '#ffffff' : 'rgba(0, 255, 102, 0.4)';
        ctx.fillText(text, x, y);
        if (y > window.innerHeight && Math.random() > 0.98) matrixDrops[i] = 0;
        matrixDrops[i]++;
      }

      // 5. 3D Rotating Hexagons
      hexagons.forEach(h => {
        h.rx += h.drx; h.ry += h.dry; h.rz += h.drz;
        h.z -= 0.8; if (h.z < -300) h.z = 600;
        const scale = fov / (fov + h.z);
        const px = cx + h.x * scale;
        const py = cy + h.y * scale;
        if (px < -100 || px > window.innerWidth + 100 || py < -100 || py > window.innerHeight + 100) return;
        ctx.save();
        ctx.translate(px, py); ctx.rotate(h.rz);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const hx = Math.cos(angle) * h.size * scale * Math.cos(h.ry);
          const hy = Math.sin(angle) * h.size * scale * Math.cos(h.rx);
          if (i === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.strokeStyle = h.color; ctx.lineWidth = 1.2 * scale; ctx.stroke();
        ctx.restore();
      });

      // 6. Quantum Plexus Connections
      const projected: { x: number; y: number; scale: number; color: string; z: number }[] = [];
      plexusNodes.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.z += p.vz;
        if (p.x < -window.innerWidth) p.vx *= -1; if (p.x > window.innerWidth) p.vx *= -1;
        if (p.y < -window.innerHeight) p.vy *= -1; if (p.y > window.innerHeight) p.vy *= -1;
        if (p.z < -400 || p.z > 400) p.vz *= -1;
        const scale = 500 / (500 + p.z + 400);
        const px = cx + p.x * scale;
        const py = cy + p.y * scale;
        projected.push({ x: px, y: py, scale, color: p.color, z: p.z });
        ctx.beginPath(); ctx.arc(px, py, 2 * scale, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill();
      });
      ctx.lineWidth = 0.5;
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const dx = projected[i].x - projected[j].x;
          const dy = projected[i].y - projected[j].y;
          const distSq = dx * dx + dy * dy;
          if (distSq < 110 * 110) {
            const alpha = (1 - Math.sqrt(distSq) / 110) * 0.25;
            ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
            ctx.beginPath(); ctx.moveTo(projected[i].x, projected[i].y); ctx.lineTo(projected[j].x, projected[j].y); ctx.stroke();
          }
        }
      }
    };

    // ========================================================================
    // MAIN RENDER LOOP
    // ========================================================================
    const render = () => {
      if (theme === 'all') drawAllCombinedEngine();
      else if (theme === 'matrix') drawMatrixEngine();
      else if (theme === 'nebula') drawNebulaEngine();
      else if (theme === 'plexus') drawPlexusEngine();
      else if (theme === 'synthwave') drawSynthwaveEngine();
      else drawAllCombinedEngine();

      frame++;
      animId = requestAnimationFrame(render);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.vx = e.clientX - lastMouse.x;
      mouse.vy = e.clientY - lastMouse.y;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      lastMouse.x = e.clientX;
      lastMouse.y = e.clientY;

      if ((theme === 'matrix' || theme === 'all') && Math.random() > 0.65) {
        ripples.push({ x: e.clientX, y: e.clientY, radius: 2, alpha: 0.8, color: '#00f0ff' });
      }
    };

    const handleMouseLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [theme]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-500"
        style={{ background: '#03030a' }}
      />
      
      {/* Floating 3D Theme Switcher Bar */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-[#090214]/85 backdrop-blur-xl border border-cyan-500/30 px-4 py-2.5 rounded-full shadow-[0_0_35px_rgba(0,240,255,0.25)] flex items-center space-x-2 pointer-events-auto transition-all hover:border-cyan-500/60 overflow-x-auto max-w-[95vw]">
        <span className="text-[11px] font-extrabold text-gray-300 mr-1 hidden lg:inline-flex items-center tracking-wider shrink-0">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping mr-2 inline-block"></span>
          3D ENGINE:
        </span>
        <button
          onClick={() => handleThemeChange('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
            theme === 'all'
              ? 'bg-gradient-to-r from-amber-500 via-pink-500 to-cyan-400 text-black shadow-[0_0_20px_rgba(255,0,128,0.6)] scale-105 font-extrabold animate-pulse'
              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
          }`}
        >
          <span>🔥</span>
          <span>All Combined</span>
        </button>
        <button
          onClick={() => handleThemeChange('matrix')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
            theme === 'matrix'
              ? 'bg-gradient-to-r from-cyan-500 to-emerald-400 text-black shadow-[0_0_15px_rgba(0,255,102,0.5)] scale-105'
              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
          }`}
        >
          <span>⚡</span>
          <span>Cyber Matrix</span>
        </button>
        <button
          onClick={() => handleThemeChange('nebula')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
            theme === 'nebula'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-[0_0_15px_rgba(255,0,128,0.5)] scale-105'
              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
          }`}
        >
          <span>🌌</span>
          <span>Galaxy Nebula</span>
        </button>
        <button
          onClick={() => handleThemeChange('plexus')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
            theme === 'plexus'
              ? 'bg-gradient-to-r from-cyan-400 to-amber-300 text-black shadow-[0_0_15px_rgba(255,215,0,0.5)] scale-105'
              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
          }`}
        >
          <span>🧠</span>
          <span>Quantum Plexus</span>
        </button>
        <button
          onClick={() => handleThemeChange('synthwave')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
            theme === 'synthwave'
              ? 'bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow-[0_0_15px_rgba(255,102,0,0.5)] scale-105'
              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
          }`}
        >
          <span>🌆</span>
          <span>Synthwave Grid</span>
        </button>
      </div>
    </>
  );
};
