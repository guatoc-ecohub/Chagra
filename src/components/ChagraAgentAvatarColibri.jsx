import React from 'react';

/**
 * ChagraAgentAvatar — colibrí libando del abutilón.
 *
 * Operator decisión 2026-05-19: el avatar anterior era una silueta plana
 * sin vida. Rediseño completo con escena botánica:
 *
 *   - Colibrí esmeralda colombiano (Amazilia tzacatl estilizada) con
 *     plumaje iridiscente turquesa→violeta y ojo brillante.
 *   - Rama de abutilón (Abutilon × hybridum, "flor farolito" en Colombia)
 *     con flor campanaforme colgante coral-naranja + pistilo amarillo
 *     asomando. Hojas peltadas verde-oliva.
 *   - Pico largo orientado al pistilo. Cuando piensa, el colibrí se
 *     acerca a libar (motion forward) mientras las alas vibran en blur.
 *
 * Referente estético: ilustración botánica del XIX × dashboard tech del
 * proyecto (slate-900 + emerald + cyan). NO mascota infantil. Personaje
 * adulto, elegante, con presencia.
 *
 * Estados:
 *   - `idle`: vuelo estacionario suave, alas batido normal (~80ms)
 *   - `thinking`: alas en blur rápido (~30ms) + colibrí avanza hacia la flor
 *     cíclicamente (sip motion) + corola del abutilón vibra suavemente
 *   - `speaking`: cuerpo bob suave, plumaje brillante pulsa
 *   - `listening`: head tilt + ondas concéntricas sutiles desde la flor
 *
 * Props:
 *   - `state`: 'idle' | 'thinking' | 'speaking' | 'listening' (default 'idle')
 *   - `size`: number en px (default 56). Mínimo recomendado 40px.
 *   - `withLabel`: muestra "Chagra IA" + sub-estado bajo el avatar
 *   - `onClick`: opcional, hace clickable
 *   - `onDoubleClick`: opcional, double-click handler (task #122). Si está
 *     presente, el wrapper button maneja también `onDoubleClick`. Operator
 *     usa para silenciar/re-reproducir TTS sin abrir AgentScreen.
 *   - `glow`: boolean (default false). Si true, el avatar pulsa con
 *     drop-shadow amber (#FFB700) anunciando "respuesta lista". Tono
 *     honesto, sin confetti.
 *   - `className`, `ariaLabel`: passthrough
 */

const STATE_LABEL = {
  idle: 'Chagra IA',
  // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish -- string preexistente al gate i18n; migración a messages.js (ADR-050) pendiente fuera de este cambio
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

export default function ChagraAgentAvatarColibri({
  state = 'idle',
  size = 56,
  withLabel = false,
  // Default undefined explícito: son props opcionales de verdad (el JSDoc de
  // arriba las documenta como opcionales y el código guarda con `typeof`),
  // pero sin default tsc las infiere requeridas y cada caller estático
  // (p. ej. LoginScreen) suma un falso error al gate tsc:check.
  onClick = undefined,
  onDoubleClick = undefined,
  glow = false,
  className = '',
  ariaLabel = undefined,
}) {
  const tone = STATE_TONE_TEXT[state] || STATE_TONE_TEXT.idle;
  const label = STATE_LABEL[state] || STATE_LABEL.idle;
  const interactive = typeof onClick === 'function' || typeof onDoubleClick === 'function';
  // ID único por instancia para que múltiples avatares no colisionen en gradients
  const uid = React.useId();

  const content = (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className={`chagra-agent-avatar chagra-state-${state}${glow ? ' chagra-glow' : ''}`}
        role="img"
        aria-label={ariaLabel || label}
      >
        <defs>
          {/* Plumaje iridiscente del colibrí: turquesa→violeta */}
          <linearGradient id={`plumaje-${uid}`} x1="0%" y1="0%" x2="100%" y2="80%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="35%" stopColor="#10b981" />
            <stop offset="65%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          {/* Garganta brillante (gorget) — rojo carmesí del macho */}
          <radialGradient id={`gorget-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#dc2626" />
          </radialGradient>
          {/* Corola del abutilón: coral-naranja con depth radial */}
          <radialGradient id={`corola-${uid}`} cx="50%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="20%" stopColor="#fbbf24" />
            <stop offset="55%" stopColor="#f97316" />
            <stop offset="85%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#7c2d12" />
          </radialGradient>
          {/* Highlight especular del borde superior de la flor */}
          <linearGradient id={`corola-highlight-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fffbeb" stopOpacity="0.6" />
            <stop offset="60%" stopColor="#fffbeb" stopOpacity="0" />
          </linearGradient>
          {/* Hojas verdes oliva con depth */}
          <linearGradient id={`hoja-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#84cc16" />
            <stop offset="50%" stopColor="#65a30d" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
          {/* Glow sutil debajo del colibrí */}
          <radialGradient id={`glow-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </radialGradient>
          {/* Blur para alas en thinking */}
          <filter id={`wing-blur-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
          {/* 3D specular highlight para el cuerpo del colibrí — pequeño
              detalle de coquetería que sugiere volumen sin caer en kitsch.
              Operador 2026-05-28: "fina coquetería que todos amarían". */}
          <radialGradient id={`body-3d-${uid}`} cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="35%" stopColor="#ffffff" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          {/* Sombra interna del lado opuesto al highlight, sugiere
              volumen redondeado. */}
          <radialGradient id={`body-shadow-${uid}`} cx="75%" cy="80%" r="55%">
            <stop offset="0%" stopColor="#020617" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </radialGradient>
          {/* Ojo iridiscente — pupila negra brillante con catchlight blanco
              que hace que el ave parezca mirarte. */}
          <radialGradient id={`eye-${uid}`} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fefce8" />
            <stop offset="15%" stopColor="#0c0a09" />
            <stop offset="100%" stopColor="#000000" />
          </radialGradient>
          {/* Soft drop shadow general — da despegue del fondo. */}
          <filter id={`avatar-shadow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" />
            <feOffset dx="0" dy="2" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.35" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Halo de fondo, animado por estado */}
        <circle
          cx="100" cy="100" r="92"
          fill={`url(#glow-${uid})`}
          className="chagra-halo"
        />

        {/* ===== RAMA DEL ABUTILÓN (lado derecho) ===== */}
        <g className="chagra-rama">
          {/* tallo curvo con textura sutil */}
          <path
            d="M 165 18 Q 158 50 162 80 Q 165 105 158 125"
            fill="none" stroke="#3f6212" strokeWidth="3" strokeLinecap="round" opacity="0.9"
          />
          <path
            d="M 165 18 Q 158 50 162 80 Q 165 105 158 125"
            fill="none" stroke="#4d7c0f" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"
          />
          {/* hoja superior con nervaduras */}
          <g transform="translate(154 38) rotate(-35)">
            <ellipse cx="0" cy="0" rx="14" ry="7" fill={`url(#hoja-${uid})`} />
            <path d="M -14 0 L 14 0" stroke="#365314" strokeWidth="0.7" opacity="0.7" />
            <path d="M -10 -2 L -2 0" stroke="#365314" strokeWidth="0.4" opacity="0.45" />
            <path d="M -10 2 L -2 0" stroke="#365314" strokeWidth="0.4" opacity="0.45" />
            <path d="M 2 0 L 10 -2" stroke="#365314" strokeWidth="0.4" opacity="0.45" />
            <path d="M 2 0 L 10 2" stroke="#365314" strokeWidth="0.4" opacity="0.45" />
            {/* highlight sutil borde superior */}
            <path d="M -13 -1.5 Q 0 -4.5 13 -1.5" fill="none" stroke="#bef264" strokeWidth="0.8" opacity="0.5" />
          </g>
          {/* hoja media con nervaduras */}
          <g transform="translate(176 72) rotate(35)">
            <ellipse cx="0" cy="0" rx="12" ry="6" fill={`url(#hoja-${uid})`} opacity="0.95" />
            <path d="M -12 0 L 12 0" stroke="#365314" strokeWidth="0.7" opacity="0.7" />
            <path d="M -8 -1.5 L -1 0" stroke="#365314" strokeWidth="0.35" opacity="0.45" />
            <path d="M -8 1.5 L -1 0" stroke="#365314" strokeWidth="0.35" opacity="0.45" />
            <path d="M 1 0 L 8 -1.5" stroke="#365314" strokeWidth="0.35" opacity="0.45" />
            <path d="M 1 0 L 8 1.5" stroke="#365314" strokeWidth="0.35" opacity="0.45" />
            <path d="M -11 -1.2 Q 0 -3.8 11 -1.2" fill="none" stroke="#bef264" strokeWidth="0.7" opacity="0.5" />
          </g>
          {/* hoja inferior con nervaduras */}
          <g transform="translate(150 105) rotate(-25)">
            <ellipse cx="0" cy="0" rx="10" ry="5" fill={`url(#hoja-${uid})`} opacity="0.9" />
            <path d="M -10 0 L 10 0" stroke="#365314" strokeWidth="0.6" opacity="0.7" />
            <path d="M -7 -1.3 L -1 0" stroke="#365314" strokeWidth="0.35" opacity="0.45" />
            <path d="M -7 1.3 L -1 0" stroke="#365314" strokeWidth="0.35" opacity="0.45" />
            <path d="M 1 0 L 7 -1.3" stroke="#365314" strokeWidth="0.35" opacity="0.45" />
            <path d="M 1 0 L 7 1.3" stroke="#365314" strokeWidth="0.35" opacity="0.45" />
          </g>

          {/* FLOR DEL ABUTILÓN — campana colgante con pétalos individuales,
              venas marcadas, brillo especular y pistilo detallado. El Abutilon
              real tiene 5 pétalos translúcidos solapados; aproximamos con 3
              paths visibles (los laterales se ven parcialmente). */}
          <g className="chagra-flor" transform="translate(160 130)">
            {/* sépalos verdes en la base, ahora con highlight */}
            <path d="M -8 -2 Q 0 -6 8 -2 L 6 4 Q 0 6 -6 4 Z" fill="#4d7c0f" />
            <path d="M -7 -2.5 Q 0 -5 7 -2.5" fill="none" stroke="#84cc16" strokeWidth="0.6" opacity="0.7" />
            {/* pétalo lateral izquierdo (atrás) */}
            <path
              d="M -9 0
                 Q -13 12 -10 24
                 Q -7 30 -3 31
                 L -3 4 Q -6 3 -9 0 Z"
              fill={`url(#corola-${uid})`}
              opacity="0.85"
              stroke="#92400e" strokeWidth="0.4"
            />
            {/* pétalo lateral derecho (atrás) */}
            <path
              d="M 9 0
                 Q 13 12 10 24
                 Q 7 30 3 31
                 L 3 4 Q 6 3 9 0 Z"
              fill={`url(#corola-${uid})`}
              opacity="0.85"
              stroke="#92400e" strokeWidth="0.4"
            />
            {/* corola principal: forma de farolito/campana (al frente) */}
            <path
              d="M -10 0
                 Q -14 12 -10 26
                 Q -5 32 0 33
                 Q 5 32 10 26
                 Q 14 12 10 0
                 Q 5 4 0 4
                 Q -5 4 -10 0 Z"
              fill={`url(#corola-${uid})`}
              stroke="#7c2d12" strokeWidth="0.9"
              className="chagra-corola"
            />
            {/* highlight especular borde superior — capa luminosa que da
                volumen 3D a la flor sin recargar */}
            <path
              d="M -9 2 Q 0 -1 9 2 Q 11 4 9 6 Q 0 3 -9 6 Q -11 4 -9 2 Z"
              fill={`url(#corola-highlight-${uid})`}
              opacity="0.85"
            />
            {/* venas radiales de la corola — ahora más finas y más cantidad */}
            <path d="M -7 4 Q -8 18 -7 28" fill="none" stroke="#7c2d12" strokeWidth="0.45" opacity="0.55" />
            <path d="M -4 4 Q -4.5 18 -4 29" fill="none" stroke="#7c2d12" strokeWidth="0.35" opacity="0.4" />
            <path d="M 0 4 Q 0 18 0 30" fill="none" stroke="#7c2d12" strokeWidth="0.45" opacity="0.55" />
            <path d="M 4 4 Q 4.5 18 4 29" fill="none" stroke="#7c2d12" strokeWidth="0.35" opacity="0.4" />
            <path d="M 7 4 Q 8 18 7 28" fill="none" stroke="#7c2d12" strokeWidth="0.45" opacity="0.55" />
            {/* pistilo amarillo asomando con estambres detallados */}
            <line x1="0" y1="33" x2="0" y2="47" stroke="#fbbf24" strokeWidth="1.6" />
            {/* estambres adicionales */}
            <line x1="-2" y1="34" x2="-2" y2="44" stroke="#fbbf24" strokeWidth="0.8" opacity="0.75" />
            <line x1="2" y1="34" x2="2" y2="44" stroke="#fbbf24" strokeWidth="0.8" opacity="0.75" />
            {/* anteras (puntas de los estambres) */}
            <circle cx="0" cy="47.5" r="2.4" fill="#fef3c7" stroke="#f59e0b" strokeWidth="0.6" />
            <circle cx="-2" cy="44.5" r="0.9" fill="#fbbf24" />
            <circle cx="2" cy="44.5" r="0.9" fill="#fbbf24" />
            {/* polen — puntitos amarillos pálidos alrededor del estigma */}
            <circle cx="0" cy="46.5" r="0.4" fill="#fef9c3" />
            <circle cx="-1" cy="48" r="0.35" fill="#fef9c3" />
            <circle cx="1" cy="48" r="0.35" fill="#fef9c3" />
          </g>
        </g>

        {/* ===== COLIBRÍ (lado izquierdo, en vuelo hacia la flor) ===== */}
        <g className="chagra-colibri" style={{ transformOrigin: '90px 110px' }}>
          {/* Ala TRASERA (más baja) — está detrás del cuerpo */}
          <g
            className="chagra-ala chagra-ala-trasera"
            style={{ transformOrigin: '70px 105px' }}
            filter={state === 'thinking' ? `url(#wing-blur-${uid})` : undefined}
          >
            <path
              d="M 70 105
                 Q 50 95 35 110
                 Q 45 125 70 115 Z"
              fill={`url(#plumaje-${uid})`}
              opacity="0.55"
            />
          </g>

          {/* Cuerpo del colibrí — elipse curva con highlight 3D */}
          <g className="chagra-cuerpo">
            <ellipse
              cx="80" cy="110" rx="22" ry="13"
              fill={`url(#plumaje-${uid})`}
              transform="rotate(-18 80 110)"
            />
            {/* Sombra inferior del cuerpo — sugiere volumen redondeado */}
            <ellipse
              cx="80" cy="110" rx="22" ry="13"
              fill={`url(#body-shadow-${uid})`}
              transform="rotate(-18 80 110)"
            />
            {/* Highlight especular superior — toque 3D que da brillo
                sutil al plumaje iridiscente. */}
            <ellipse
              cx="80" cy="110" rx="22" ry="13"
              fill={`url(#body-3d-${uid})`}
              transform="rotate(-18 80 110)"
            />
            {/* Cola — plumas timoneras */}
            <path
              d="M 60 113 L 42 108 L 48 115 L 40 122 L 50 119 L 46 128 L 58 120 Z"
              fill={`url(#plumaje-${uid})`}
              opacity="0.85"
            />
            {/* Vientre claro */}
            <ellipse
              cx="78" cy="116" rx="14" ry="6"
              fill="#fef3c7"
              opacity="0.4"
              transform="rotate(-18 78 116)"
            />
          </g>

          {/* Cabeza */}
          <g className="chagra-cabeza">
            <circle cx="100" cy="98" r="11" fill={`url(#plumaje-${uid})`} />
            {/* Highlight 3D en la cabeza — cápsula brillante arriba-izquierda */}
            <circle cx="100" cy="98" r="11" fill={`url(#body-3d-${uid})`} />
            {/* gorget (garganta carmesí) */}
            <ellipse cx="102" cy="104" rx="6" ry="4" fill={`url(#gorget-${uid})`} opacity="0.92" />
            {/* Pico — largo y delgado, apuntando a la flor */}
            <path
              d="M 110 99 Q 130 102 145 110"
              fill="none" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round"
              className="chagra-pico"
            />
            {/* Ojo iridiscente 3D — gradient que da profundidad + catchlight
                blanco que hace que parezca mirar al usuario. */}
            <circle cx="103" cy="95" r="2.9" fill={`url(#eye-${uid})`} />
            <circle cx="102.4" cy="94.3" r="0.85" fill="#ffffff" opacity="0.95" />
            <circle cx="103.6" cy="95.2" r="0.35" fill="#ffffff" opacity="0.6" />
          </g>

          {/* Ala FRONTAL (más arriba) — sobre el cuerpo */}
          <g
            className="chagra-ala chagra-ala-frontal"
            style={{ transformOrigin: '75px 105px' }}
            filter={state === 'thinking' ? `url(#wing-blur-${uid})` : undefined}
          >
            <path
              d="M 75 105
                 Q 60 80 40 88
                 Q 55 105 78 100 Z"
              fill={`url(#plumaje-${uid})`}
              opacity="0.75"
            />
            <path
              d="M 75 105 Q 62 92 50 95"
              fill="none" stroke="#0f172a" strokeWidth="0.5" opacity="0.3"
            />
          </g>
        </g>

        {/* Ondas concéntricas en listening */}
        {state === 'listening' && (
          <g className="chagra-ondas" opacity="0.5">
            <circle cx="160" cy="160" r="20" fill="none" stroke="#a78bfa" strokeWidth="1" className="chagra-onda chagra-onda-1" />
            <circle cx="160" cy="160" r="28" fill="none" stroke="#a78bfa" strokeWidth="0.8" className="chagra-onda chagra-onda-2" />
          </g>
        )}

        <style>{`
          .chagra-agent-avatar { will-change: transform; }

          /* ===== HALO por estado ===== */
          .chagra-halo { transition: opacity .4s ease; opacity: 0; }
          .chagra-state-thinking .chagra-halo { opacity: 1; animation: chagra-halo-pulse 1.6s ease-in-out infinite; }
          .chagra-state-speaking .chagra-halo { opacity: .7; animation: chagra-halo-pulse 1s ease-in-out infinite; }
          .chagra-state-listening .chagra-halo { opacity: .6; }
          @keyframes chagra-halo-pulse {
            0%, 100% { opacity: .4; }
            50% { opacity: 1; }
          }

          /* ===== IDLE: hovering suave + alas batido normal ===== */
          .chagra-state-idle .chagra-colibri {
            animation: chagra-hover-soft 3s ease-in-out infinite;
          }
          .chagra-state-idle .chagra-ala-frontal {
            animation: chagra-ala-flap-normal .26s ease-in-out infinite;
          }
          .chagra-state-idle .chagra-ala-trasera {
            animation: chagra-ala-flap-normal-back .26s ease-in-out infinite;
          }
          @keyframes chagra-hover-soft {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
          }
          @keyframes chagra-ala-flap-normal {
            0%, 100% { transform: rotate(-18deg); }
            50% { transform: rotate(22deg); }
          }
          @keyframes chagra-ala-flap-normal-back {
            0%, 100% { transform: rotate(15deg); }
            50% { transform: rotate(-22deg); }
          }

          /* ===== THINKING: alas en blur rápido + sip motion al abutilón ===== */
          .chagra-state-thinking .chagra-colibri {
            animation: chagra-sip 1.3s ease-in-out infinite;
          }
          .chagra-state-thinking .chagra-ala-frontal {
            animation: chagra-ala-vibrate .08s linear infinite;
          }
          .chagra-state-thinking .chagra-ala-trasera {
            animation: chagra-ala-vibrate-back .08s linear infinite;
          }
          .chagra-state-thinking .chagra-corola {
            animation: chagra-flor-quiver 1.3s ease-in-out infinite;
            transform-origin: center top;
          }
          @keyframes chagra-sip {
            0%, 100% { transform: translate(0, 0); }
            45%, 55% { transform: translate(15px, 6px); }
          }
          @keyframes chagra-ala-vibrate {
            0%, 100% { transform: rotate(-25deg); }
            50% { transform: rotate(35deg); }
          }
          @keyframes chagra-ala-vibrate-back {
            0%, 100% { transform: rotate(30deg); }
            50% { transform: rotate(-30deg); }
          }
          @keyframes chagra-flor-quiver {
            0%, 100% { transform: rotate(0deg); }
            45%, 55% { transform: rotate(3deg); }
            48%, 52% { transform: rotate(-3deg); }
          }

          /* ===== SPEAKING: cuerpo bob suave + alas batido ligero ===== */
          .chagra-state-speaking .chagra-colibri {
            animation: chagra-speak-bob 1.1s ease-in-out infinite;
          }
          .chagra-state-speaking .chagra-ala-frontal {
            animation: chagra-ala-flap-normal .3s ease-in-out infinite;
          }
          .chagra-state-speaking .chagra-ala-trasera {
            animation: chagra-ala-flap-normal-back .3s ease-in-out infinite;
          }
          @keyframes chagra-speak-bob {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            25% { transform: translateY(-2px) rotate(-2deg); }
            75% { transform: translateY(2px) rotate(2deg); }
          }

          /* ===== LISTENING: head tilt + ondas desde la flor ===== */
          .chagra-state-listening .chagra-cabeza {
            transform-origin: 100px 98px;
            animation: chagra-head-tilt 2.4s ease-in-out infinite;
          }
          .chagra-state-listening .chagra-ala-frontal,
          .chagra-state-listening .chagra-ala-trasera {
            animation: chagra-ala-flap-normal .35s ease-in-out infinite;
          }
          .chagra-state-listening .chagra-onda-1 {
            animation: chagra-onda-expand 2.2s ease-out infinite;
            transform-origin: 160px 160px;
          }
          .chagra-state-listening .chagra-onda-2 {
            animation: chagra-onda-expand 2.2s ease-out infinite .7s;
            transform-origin: 160px 160px;
          }
          @keyframes chagra-head-tilt {
            0%, 100% { transform: rotate(-4deg); }
            50% { transform: rotate(4deg); }
          }
          @keyframes chagra-onda-expand {
            0% { opacity: .7; transform: scale(.4); }
            100% { opacity: 0; transform: scale(1.3); }
          }

          /* ===== GLOW (task #122): respuesta lista, brilla pulsando ====
             drop-shadow amber #FFB700 1.5s ease-in-out infinite. NO confetti,
             NO bouncing — tono honesto del avatar. Activo en TODA la app
             cuando responseReady=true en useAgentNotificationStore. */
          .chagra-agent-avatar.chagra-glow {
            animation: chagra-glow-pulse 1.5s ease-in-out infinite;
          }
          @keyframes chagra-glow-pulse {
            0%, 100% {
              filter: drop-shadow(0 0 2px rgba(255, 183, 0, .35))
                      drop-shadow(0 0 6px rgba(255, 183, 0, .25));
            }
            50% {
              filter: drop-shadow(0 0 6px rgba(255, 183, 0, .9))
                      drop-shadow(0 0 14px rgba(255, 183, 0, .55));
            }
          }

          /* ===== Reduced motion ===== */
          @media (prefers-reduced-motion: reduce) {
            .chagra-agent-avatar * {
              animation: none !important;
            }
            .chagra-agent-avatar.chagra-glow {
              animation: none !important;
              filter: drop-shadow(0 0 4px rgba(255, 183, 0, .6));
            }
          }
        `}</style>
      </svg>

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
      onDoubleClick={onDoubleClick}
      className="rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all hover:scale-105 active:scale-95"
      aria-label={ariaLabel || `Abrir ${label}`}
      title={onDoubleClick ? 'Doble click silencia o reactiva la voz' : undefined}
    >
      {content}
    </button>
  );
}
