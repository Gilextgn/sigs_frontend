import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  phase: number;
  speed: number;
  driftY: number;
}

/**
 * Petit champ d'étoiles scintillantes en fond de page de connexion,
 * en canvas pour rester fluide même avec beaucoup de points. Purement
 * décoratif (aria-hidden), respecte prefers-reduced-motion.
 */
export function StarField({ density = 90 }: { density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let stars: Star[] = [];
    let width = 0;
    let height = 0;
    let animationFrame = 0;

    function resize() {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      width = canvasEl.clientWidth;
      height = canvasEl.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvasEl.width = width * dpr;
      canvasEl.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.round((width * height) / (1_000_000 / density));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.3 + 0.3,
        baseAlpha: Math.random() * 0.5 + 0.35,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.6 + 0.2,
        driftY: Math.random() * 0.015 + 0.004,
      }));
    }

    function draw(time: number) {
      ctx!.clearRect(0, 0, width, height);
      for (const star of stars) {
        const twinkle = reduceMotion ? star.baseAlpha : star.baseAlpha * (0.5 + 0.5 * Math.sin(time * 0.001 * star.speed + star.phase));
        const y = reduceMotion ? star.y : (star.y - (time * star.driftY) % (height + 20) + height + 20) % (height + 20) - 10;

        ctx!.beginPath();
        ctx!.arc(star.x, y, star.radius, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
        ctx!.fill();
      }
      animationFrame = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    animationFrame = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrame);
    };
  }, [density]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
