import React, { useState } from 'react';

/**
 * ChagraAgentAvatarColibriPhoto — avatar foto-realista del colibrí Chagra.
 *
 * Reemplaza el R3F (ChagraAgentAvatarColibri3D) que el operador rechazó
 * 2026-05-28 ("no me gusta nada y desatina con todo lo que ya está").
 * Usa las fotos biopunk de Lili como base + overlay CSS para los estados.
 *
 * Estrategia visual:
 *   - Asset hero estático: `colibri-hero-still.jpg` (foto #2 de Lili,
 *     pose alas-extendidas dentro del orbe verde con red neuronal).
 *   - Cuando el WebM transición metal→vivo esté disponible
 *     (`colibri-transition.webm` generado con Runway/Kling desde foto #4
 *     anchor metálico → foto #5 anchor orgánico), el flag
 *     `HAS_TRANSITION_VIDEO` lo activa sin tocar más nada.
 *   - Estados (idle/thinking/speaking/listening) por overlay UI:
 *     ring de color animado + waves en listening + glow amber en `glow`.
 *
 * Drop-in compatible con ChagraAgentAvatarColibri (SVG 2D) y con la API
 * del wrapper ChagraAgentAvatar. Mismas props.
 */

// 2026-05-29: video transición Kling vía Magnific entregado por Lili.
// Generado image-to-image-to-video (transición metal→orgánico del colibrí).
// WebM VP9 480x480 30fps ~930KB en
// /public/avatar/colibri-transition.webm. Si el navegador no soporta WebM
// o el fetch falla, onError dispara fallback al still hero (foto#2 pose
// icónica) sin breaking change visual.
const HAS_TRANSITION_VIDEO = true;

const STATE_RING = {
  idle:      { color: '#10b981', shadow: 'rgba(16,185,129,0.45)', speed: '3s' },
  thinking:  { color: '#f59e0b', shadow: 'rgba(245,158,11,0.6)',  speed: '1.4s' },
  speaking:  { color: '#06b6d4', shadow: 'rgba(6,182,212,0.6)',   speed: '0.9s' },
  listening: { color: '#a78bfa', shadow: 'rgba(167,139,250,0.6)', speed: '2.2s' },
};

const STATE_LABEL = {
  idle: 'Chagra IA',
  // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish -- label preexistente marcado al re-tocar el archivo; migracion a messages.js (ADR-050) fuera del alcance de este fix
  thinking: 'Chagra IA · pensando',
  speaking: 'Chagra IA · hablando',
  listening: 'Chagra IA · escuchando',
};

const STATE_TONE_TEXT = {
  idle: 'text-emerald-300',
  thinking: 'text-amber-200',
  speaking: 'text-cyan-200',
  listening: 'text-fuchsia-200',
};

export default function ChagraAgentAvatarColibriPhoto({
  state = 'idle',
  size = 56,
  withLabel = false,
  onClick = undefined,
  onDoubleClick,
  glow = false,
  className = '',
  ariaLabel,
}) {
  const [videoFailed, setVideoFailed] = useState(false);

  const ring = STATE_RING[state] || STATE_RING.idle;
  const label = STATE_LABEL[state] || STATE_LABEL.idle;
  const tone = STATE_TONE_TEXT[state] || STATE_TONE_TEXT.idle;
  const interactive = typeof onClick === 'function' || typeof onDoubleClick === 'function';

  const useVideo = HAS_TRANSITION_VIDEO && !videoFailed;

  const content = (
    <div
      className={`chagra-photo-avatar chagra-photo-state-${state}${glow ? ' chagra-photo-glow' : ''} ${className}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        // CSS vars consumidas por las animaciones más abajo — permiten que
        // el <style> sea estático y solo cambien colores por estado.
        '--chagra-ring-color': ring.color,
        '--chagra-ring-shadow': ring.shadow,
        '--chagra-ring-speed': ring.speed,
      }}
      role="img"
      aria-label={ariaLabel || label}
    >
      {/* Asset principal — circular, foto Lili o video transición */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          overflow: 'hidden',
          background: '#0f172a',
        }}
      >
        {useVideo ? (
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onError={() => setVideoFailed(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 45%',
              display: 'block',
            }}
            aria-hidden="true"
          >
            <source src="/avatar/colibri-transition.webm" type="video/webm" />
          </video>
        ) : (
          <img
            src="/avatar/colibri-hero-still.jpg"
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              // foto #2 tiene al colibrí ligeramente arriba del centro;
              // ajuste fino para que la cabeza+orbe queden visibles en
              // crops pequeños (40, 56 px) sin recortar el pico.
              objectPosition: 'center 42%',
              display: 'block',
            }}
            draggable={false}
          />
        )}
      </div>

      {/* Ring de estado — capa exterior pulsante */}
      <span className="chagra-photo-ring" aria-hidden="true" />

      {/* Waves cuando escucha — 2 anillos expandiéndose */}
      {state === 'listening' && (
        <>
          <span className="chagra-photo-wave chagra-photo-wave-1" aria-hidden="true" />
          <span className="chagra-photo-wave chagra-photo-wave-2" aria-hidden="true" />
        </>
      )}

      <style>{`
        .chagra-photo-avatar { will-change: transform; }

        .chagra-photo-ring {
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          pointer-events: none;
          box-shadow:
            0 0 0 2px var(--chagra-ring-color, #10b981),
            0 0 12px var(--chagra-ring-shadow, rgba(16,185,129,0.45));
          animation: chagra-photo-ring-pulse var(--chagra-ring-speed, 3s) ease-in-out infinite;
        }
        @keyframes chagra-photo-ring-pulse {
          0%, 100% { opacity: 0.65; transform: scale(1); }
          50%      { opacity: 1.0;  transform: scale(1.04); }
        }

        .chagra-photo-wave {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid var(--chagra-ring-color, #a78bfa);
          opacity: 0;
          pointer-events: none;
          animation: chagra-photo-wave-expand 2s ease-out infinite;
        }
        .chagra-photo-wave-2 { animation-delay: 1s; }
        @keyframes chagra-photo-wave-expand {
          0%   { opacity: 0.7; transform: scale(1); }
          100% { opacity: 0;   transform: scale(1.5); }
        }

        /* Task #122 — respuesta lista, glow amber #FFB700. Mismo tono que
           el SVG 2D para coherencia cross-avatar. */
        .chagra-photo-avatar.chagra-photo-glow {
          animation: chagra-photo-glow-pulse 1.5s ease-in-out infinite;
        }
        @keyframes chagra-photo-glow-pulse {
          0%, 100% {
            filter: drop-shadow(0 0 2px rgba(255, 183, 0, .35))
                    drop-shadow(0 0 6px rgba(255, 183, 0, .25));
          }
          50% {
            filter: drop-shadow(0 0 6px rgba(255, 183, 0, .9))
                    drop-shadow(0 0 14px rgba(255, 183, 0, .55));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .chagra-photo-avatar *,
          .chagra-photo-avatar.chagra-photo-glow {
            animation: none !important;
          }
          .chagra-photo-ring {
            opacity: 0.8;
            transform: none;
          }
        }
      `}</style>

      {withLabel && (
        <span
          className={`${tone}`}
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            top: '100%',
            marginTop: 4,
            fontSize: 10,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            whiteSpace: 'nowrap',
          }}
        >
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
      onDoubleClick={onDoubleClick}
      className="rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all hover:scale-105 active:scale-95"
      aria-label={ariaLabel || `Abrir ${label}`}
      title={onDoubleClick ? 'Doble click silencia o reactiva la voz' : undefined}
      style={{ background: 'transparent', border: 'none', padding: 0 }}
    >
      {content}
    </button>
  );
}
