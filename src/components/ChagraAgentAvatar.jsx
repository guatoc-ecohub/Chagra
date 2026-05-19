import React from 'react';

/**
 * ChagraAgentAvatar — avatar visual del agente IA de Chagra.
 *
 * Operator decisión 2026-05-18: el agente IA debe ser identificable como
 * personaje (no solo chat genérico). Animal colombiano estilizado: colibrí,
 * polinizador clave en agroecología andina, asociado a biodiversidad.
 * SVG inline + CSS animations (sin deps).
 *
 * Estados:
 * - `idle`: respiración suave + parpadeo ocasional
 * - `thinking`: alas vibrando rápido (zumbido visual)
 * - `speaking`: cuerpo oscilando suavemente + halo cyan pulsante
 * - `listening`: cabeza inclinada + ondas concéntricas verdes
 *
 * Props:
 * - `state`: 'idle' | 'thinking' | 'speaking' | 'listening' (default 'idle')
 * - `size`: number en px (default 48)
 * - `withLabel`: muestra "Chagra IA" debajo del avatar
 * - `onClick`: opcional, dispara navegación al agente
 */

const STATE_TONE = {
  idle: 'text-emerald-400',
  thinking: 'text-amber-300',
  speaking: 'text-cyan-300',
  listening: 'text-fuchsia-300',
};

const STATE_LABEL = {
  idle: 'Chagra IA',
  thinking: 'Chagra IA · pensando',
  speaking: 'Chagra IA · hablando',
  listening: 'Chagra IA · escuchando',
};

const STATE_HALO = {
  idle: 'bg-emerald-500/0',
  thinking: 'bg-amber-400/30 animate-pulse',
  speaking: 'bg-cyan-400/30 animate-pulse',
  listening: 'bg-fuchsia-400/30 motion-safe:animate-ping',
};

export default function ChagraAgentAvatar({
  state = 'idle',
  size = 48,
  withLabel = false,
  onClick,
  className = '',
  ariaLabel,
}) {
  const tone = STATE_TONE[state] || STATE_TONE.idle;
  const halo = STATE_HALO[state] || STATE_HALO.idle;
  const label = STATE_LABEL[state] || STATE_LABEL.idle;
  const interactive = typeof onClick === 'function';

  const content = (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <span
        className={`absolute inset-0 rounded-full ${halo} transition-colors duration-300`}
        aria-hidden="true"
      />
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className={`relative ${tone} chagra-agent-avatar chagra-state-${state}`}
        role="img"
        aria-label={ariaLabel || label}
      >
        <defs>
          <linearGradient id={`chagra-body-${state}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        <g className="chagra-body">
          <path
            d="M 22 36 Q 18 28 26 22 Q 36 18 44 24 Q 50 30 44 38 Q 36 44 28 42 Q 22 40 22 36 Z"
            fill={`url(#chagra-body-${state})`}
            stroke="currentColor" strokeWidth="1" opacity="0.9"
          />
          <circle cx="44" cy="24" r="6" fill="currentColor" opacity="0.85" />
          <path d="M 50 22 L 60 18 L 50 24 Z" fill="currentColor" opacity="0.95" />
          <circle cx="45" cy="23" r="1.2" fill="#0f172a" />
          <path
            className="chagra-wing chagra-wing-top"
            d="M 30 26 Q 24 14 18 22 Q 22 30 30 28 Z"
            fill="currentColor" opacity="0.75"
          />
          <path
            className="chagra-wing chagra-wing-bottom"
            d="M 30 34 Q 22 44 18 36 Q 24 30 30 32 Z"
            fill="currentColor" opacity="0.7"
          />
          <path d="M 22 36 L 12 40 L 18 38 L 14 44 Z" fill="currentColor" opacity="0.7" />
        </g>
        {state === 'listening' && (
          <g className="chagra-listening-waves" opacity="0.6">
            <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="1" className="chagra-wave-1" />
            <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="0.8" className="chagra-wave-2" />
          </g>
        )}
      </svg>

      <style>{`
        .chagra-agent-avatar { will-change: transform; }
        .chagra-state-idle .chagra-body {
          animation: chagra-breath 3s ease-in-out infinite;
          transform-origin: center;
        }
        @keyframes chagra-breath {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.025); }
        }
        .chagra-state-thinking .chagra-wing-top {
          animation: chagra-wing-vibrate-top 0.18s ease-in-out infinite;
          transform-origin: 30px 26px;
        }
        .chagra-state-thinking .chagra-wing-bottom {
          animation: chagra-wing-vibrate-bottom 0.18s ease-in-out infinite;
          transform-origin: 30px 34px;
        }
        @keyframes chagra-wing-vibrate-top {
          0%, 100% { transform: rotate(-8deg); }
          50% { transform: rotate(12deg); }
        }
        @keyframes chagra-wing-vibrate-bottom {
          0%, 100% { transform: rotate(8deg); }
          50% { transform: rotate(-12deg); }
        }
        .chagra-state-speaking .chagra-body {
          animation: chagra-speak-bob 1.2s ease-in-out infinite;
          transform-origin: center;
        }
        @keyframes chagra-speak-bob {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-1px) rotate(-1.5deg); }
          75% { transform: translateY(1px) rotate(1.5deg); }
        }
        .chagra-state-listening .chagra-body {
          transform-origin: center;
          animation: chagra-listen-tilt 2.5s ease-in-out infinite;
        }
        @keyframes chagra-listen-tilt {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
        .chagra-wave-1 {
          animation: chagra-wave-expand 2s ease-out infinite;
          transform-origin: 32px 32px;
        }
        .chagra-wave-2 {
          animation: chagra-wave-expand 2s ease-out infinite 0.6s;
          transform-origin: 32px 32px;
        }
        @keyframes chagra-wave-expand {
          0% { opacity: 0.6; transform: scale(0.5); }
          100% { opacity: 0; transform: scale(1.1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .chagra-agent-avatar .chagra-body,
          .chagra-agent-avatar .chagra-wing,
          .chagra-agent-avatar .chagra-listening-waves circle {
            animation: none !important;
          }
        }
      `}</style>
      {withLabel && (
        <span className={`absolute left-1/2 -translate-x-1/2 top-full mt-1 text-[10px] font-bold uppercase tracking-wider ${tone} whitespace-nowrap`}>
          {label}
        </span>
      )}
    </div>
  );

  if (!interactive) return content;

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all hover:scale-105"
      aria-label={ariaLabel || `Abrir ${label}`}
    >
      {content}
    </button>
  );
}
