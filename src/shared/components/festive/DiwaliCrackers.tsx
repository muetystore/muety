import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  decay: number;
  size: number;
  gravity: number;
  drag: number;
  flicker: boolean;
  history: { x: number; y: number; alpha: number }[];
}

interface Rocket {
  x: number;
  y: number;
  targetY: number;
  vx: number;
  vy: number;
  color: string;
  trailColor: string;
  type: 'willow' | 'chrysanthemum' | 'sparkler' | 'crackle' | 'ring' | 'palm';
  history: { x: number; y: number }[];
}

interface FountainSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  decay: number;
  size: number;
}

export const DiwaliCrackers: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
  className = '',
  style = {}
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    const particles: Particle[] = [];
    const rockets: Rocket[] = [];
    const fountainSparks: FountainSpark[] = [];

    const PALETTES = [
      ['#ffffff', '#fff275', '#ffd700', '#ffae19', '#ff7800'],
      ['#ffffff', '#ff6b8b', '#ff1e56', '#e00543', '#ff9999', '#ffd700'],
      ['#ffffff', '#69f0ae', '#00e676', '#00c853', '#b9f6ca', '#ffd700'],
      ['#ffffff', '#e0aaff', '#c77dff', '#9d4edd', '#ffd700', '#ff9e00'],
      ['#ffd700', '#ff2a5f', '#00f5d4', '#fee440', '#9b5de5', '#ffffff'],
      ['#ffffff', '#fff8e7', '#ffd166', '#ffb703', '#fb8500', '#e63946']
    ];

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = parent.clientWidth;
      height = parent.clientHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const createExplosion = (x: number, y: number, colorPalette: string[], type: Rocket['type']) => {
      let particleCount = 75;
      if (type === 'willow') particleCount = 100;
      if (type === 'palm') particleCount = 60;
      if (type === 'ring') particleCount = 70;

      if (type === 'ring') {
        const baseSpeed = Math.random() * 2.5 + 3.2;
        for (let i = 0; i < particleCount; i++) {
          const angle = (i / particleCount) * Math.PI * 2;
          const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
          particles.push({
            x,
            y,
            vx: Math.cos(angle) * baseSpeed,
            vy: Math.sin(angle) * baseSpeed,
            color,
            alpha: 1,
            decay: Math.random() * 0.015 + 0.012,
            size: Math.random() * 2.2 + 1.2,
            gravity: 0.04,
            drag: 0.965,
            flicker: Math.random() > 0.4,
            history: []
          });
        }
        return;
      }

      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 6.0 + 1.8;
        let gravity = 0.05;
        let drag = 0.96;
        let decay = Math.random() * 0.016 + 0.011;
        let size = Math.random() * 2.4 + 1.2;

        if (type === 'willow') {
          speed = Math.random() * 4.8 + 1.2;
          gravity = 0.07;
          drag = 0.978;
          decay = Math.random() * 0.008 + 0.005;
          size = Math.random() * 2.2 + 1.0;
        } else if (type === 'palm') {
          speed = Math.random() * 5.5 + 2.5;
          gravity = 0.055;
          drag = 0.97;
          decay = Math.random() * 0.012 + 0.008;
          size = Math.random() * 2.8 + 1.5;
        }

        const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];

        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color,
          alpha: 1,
          decay,
          size,
          gravity,
          drag,
          flicker: Math.random() > 0.35,
          history: []
        });
      }
    };

    const launchRocket = (targetX?: number, targetYPos?: number) => {
      if (rockets.length >= 6) return;

      const startX = targetX !== undefined 
        ? targetX 
        : (width * 0.05 + Math.random() * (width * 0.90));
      
      const targetY = targetYPos !== undefined 
        ? targetYPos 
        : (height * 0.08 + Math.random() * (height * 0.42));

      const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
      const mainColor = palette[Math.floor(Math.random() * palette.length)];

      const types: Rocket['type'][] = ['willow', 'chrysanthemum', 'sparkler', 'crackle', 'ring', 'palm'];
      const type = types[Math.floor(Math.random() * types.length)];

      rockets.push({
        x: startX,
        y: height + 10,
        targetY,
        vx: (Math.random() - 0.5) * 2.2,
        vy: -(Math.random() * 3.5 + 8.5),
        color: mainColor,
        trailColor: '#ffb703',
        type,
        history: []
      });
    };

    const emitFountainSparks = () => {
      const fountains = [
        { x: width * 0.06, y: height * 0.94 },
        { x: width * 0.38, y: height * 0.94 },
        { x: width * 0.68, y: height * 0.94 },
        { x: width * 0.94, y: height * 0.94 }
      ];

      fountains.forEach(f => {
        if (f.x <= 0 || f.y <= 0) return;
        for (let i = 0; i < 2; i++) {
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.65;
          const speed = Math.random() * 4.5 + 2.8;
          const goldHues = ['#ffffff', '#fff3b0', '#ffd166', '#ffb703', '#fb8500', '#ffd700'];

          fountainSparks.push({
            x: f.x + (Math.random() - 0.5) * 8,
            y: f.y,
            vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 0.8,
            vy: Math.sin(angle) * speed,
            color: goldHues[Math.floor(Math.random() * goldHues.length)],
            alpha: 1,
            decay: Math.random() * 0.035 + 0.022,
            size: Math.random() * 2.2 + 1.0
          });
        }
      });
    };

    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
      const types: Rocket['type'][] = ['willow', 'chrysanthemum', 'sparkler', 'crackle', 'ring', 'palm'];
      const type = types[Math.floor(Math.random() * types.length)];
      createExplosion(clickX, clickY, palette, type);
    };

    canvas.addEventListener('click', handleCanvasClick);

    let lastRocketTime = 0;
    let lastAnaarTime = 0;

    setTimeout(() => {
      launchRocket(width * 0.25, height * 0.2);
      setTimeout(() => launchRocket(width * 0.75, height * 0.22), 250);
      setTimeout(() => launchRocket(width * 0.50, height * 0.16), 550);
    }, 150);

    const render = (time: number) => {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = 'lighter';

      if (time - lastRocketTime > 850 + Math.random() * 950) {
        launchRocket();
        lastRocketTime = time;
      }

      if (time - lastAnaarTime > 35) {
        emitFountainSparks();
        lastAnaarTime = time;
      }

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.history.push({ x: r.x, y: r.y });
        if (r.history.length > 8) r.history.shift();

        r.x += r.vx;
        r.y += r.vy;
        r.vy += 0.045;

        ctx.beginPath();
        ctx.strokeStyle = r.trailColor;
        ctx.lineWidth = 2.4;
        if (r.history.length > 1) {
          ctx.moveTo(r.history[0].x, r.history[0].y);
          for (let h = 1; h < r.history.length; h++) {
            ctx.lineTo(r.history[h].x, r.history[h].y);
          }
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(r.x, r.y, 2.8, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        if (r.y <= r.targetY || r.vy >= -0.4) {
          const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
          createExplosion(r.x, r.y, palette, r.type);
          rockets.splice(i, 1);
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        p.history.push({ x: p.x, y: p.y, alpha: p.alpha });
        if (p.history.length > 5) p.history.shift();

        p.vx *= p.drag;
        p.vy *= p.drag;
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        if (p.history.length > 1) {
          ctx.beginPath();
          ctx.moveTo(p.history[0].x, p.history[0].y);
          for (let h = 1; h < p.history.length; h++) {
            ctx.lineTo(p.history[h].x, p.history[h].y);
          }
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = p.alpha * 0.75;
          ctx.lineWidth = p.size;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        const currentAlpha = p.flicker && Math.random() > 0.4 ? p.alpha * 0.45 : p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = currentAlpha;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = currentAlpha;
        ctx.fill();
      }

      for (let i = fountainSparks.length - 1; i >= 0; i--) {
        const s = fountainSparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.12;
        s.alpha -= s.decay;

        if (s.alpha <= 0 || s.y > height) {
          fountainSparks.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.alpha;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('click', handleCanvasClick);
    };
  }, []);

  return (
    <div
      className={`diwali-realtime-crackers-canvas-wrap ${className}`}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 2,
        ...style
      }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
    </div>
  );
};
