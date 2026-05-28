import React, { useEffect, useState } from 'react';

/**
 * Confetti — micro-animación de celebración sin dependencias.
 *
 * Quick-win UX 2026-05-28 demo Diana: cuando el usuario registra su primera
 * planta (count 0 → 1), aparecen partículas verdes/lima que caen 2.5s y
 * desaparecen. Sensación de "cosecha" / "logro". Sin libs externas.
 *
 * Listener global de CustomEvent('chagra:celebrate'):
 *   { detail: { reason?: string, durationMs?: number } }
 * Emisor (en useAssetStore.addAsset) dispara cuando plants pasa de 0 → 1.
 *
 * Implementación: 32 spans posicionados absolute con animación CSS keyframes
 * (fall + spin). Cada uno tiene delay/duración/color randomized en JS, pero
 * la animación es 100% GPU (transform + opacity). No bloquea main thread.
 *
 * Reducción de movimiento: respeta prefers-reduced-motion (no anima si user
 * tiene OS preference set).
 */

const PARTICLE_COUNT = 36;
const COLORS = ['#84cc16', '#22c55e', '#10b981', '#06b6d4', '#facc15', '#f97316'];

function buildParticles(count) {
  const arr = [];
  for (let i = 0; i < count; i += 1) {
    arr.push({
      id: i,
      left: Math.random() * 100, // %
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 400, // ms
      duration: 1800 + Math.random() * 1500, // ms
      size: 6 + Math.random() * 8, // px
      drift: (Math.random() - 0.5) * 80, // px lateral drift
      rotate: Math.random() * 720 - 360, // deg final rotation
    });
  }
  return arr;
}

export default function Confetti() {
  const [active, setActive] = useState(false);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    let timer;
    const handler = (event) => {
      // Respect reduced-motion: no confetti for users with prefers-reduced-motion.
      const reduce = typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;
      if (reduce) return;
      const duration = event?.detail?.durationMs || 2500;
      setParticles(buildParticles(PARTICLE_COUNT));
      setActive(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setActive(false), duration);
    };
    window.addEventListener('chagra:celebrate', handler);
    return () => {
      window.removeEventListener('chagra:celebrate', handler);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!active) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[200] pointer-events-none overflow-hidden"
    >
      <style>{`
        @keyframes chagra-confetti-fall {
          0% {
            transform: translate3d(0, -20vh, 0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate3d(var(--cf-drift, 0px), 110vh, 0) rotate(var(--cf-rotate, 360deg));
            opacity: 0;
          }
        }
        .chagra-confetti-particle {
          position: absolute;
          top: -20px;
          border-radius: 2px;
          will-change: transform, opacity;
          animation-name: chagra-confetti-fall;
          animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
          animation-fill-mode: forwards;
        }
      `}</style>
      {particles.map((p) => (
        <span
          key={p.id}
          className="chagra-confetti-particle"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size * 1.4}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}ms`,
            animationDuration: `${p.duration}ms`,
            '--cf-drift': `${p.drift}px`,
            '--cf-rotate': `${p.rotate}deg`,
          }}
        />
      ))}
    </div>
  );
}
