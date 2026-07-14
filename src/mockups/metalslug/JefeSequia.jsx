/**
 * JefeSequia — el gran enemigo del "Metal Slug del campo": la SEQUÍA.
 *
 * SOLO ARTE. Sol abrasador con cara de villano rubber-hose: corona de rayos que
 * palpitan, tierra cuarteada en la "mandíbula", ondas de calor que suben y una
 * risa malvada. No es una plaga: es la amenaza estructural (El Niño) que seca la
 * finca entera. Se puede pintar grande (set-piece) o como silueta en el cielo.
 *
 * Gama baja: gradientes + pocos nodos, animaciones apagables con reducedMotion.
 * Sin red, es-CO. Grounding: JEFES[jefe_sequia] en metalSlugCampoData.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish -- arte de juego es-CO. */
import { memo } from 'react';

const TINTA = '#5a2408';

const JefeSequia = memo(function JefeSequia({ size = 260, reducedMotion = false, title = 'Sequía' }) {
  const anim = !reducedMotion;
  return (
    <svg
      viewBox="0 0 240 240"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={anim ? 'msc-jefe-sequia msc-jefe-alive' : 'msc-jefe-sequia'}
    >
      <defs>
        <radialGradient id="jsSol" cx="0.42" cy="0.4" r="0.62">
          <stop offset="0" stopColor="#fff2b0" />
          <stop offset="0.5" stopColor="#ffb43a" />
          <stop offset="1" stopColor="#e5691a" />
        </radialGradient>
        <radialGradient id="jsHalo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffd76a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffd76a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="jsBoca" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a1c05" />
          <stop offset="1" stopColor="#3a0d02" />
        </linearGradient>
      </defs>

      {/* halo de calor */}
      <circle cx="120" cy="118" r="118" fill="url(#jsHalo)" className={anim ? 'msc-jefe-halo' : undefined} style={{ transformOrigin: '120px 118px' }} />

      {/* corona de rayos palpitantes */}
      <g className={anim ? 'msc-jefe-rayos' : undefined} style={{ transformOrigin: '120px 118px' }}>
        {Array.from({ length: 16 }).map((_, i) => {
          const a = (i / 16) * Math.PI * 2;
          const r0 = 78;
          const r1 = i % 2 === 0 ? 116 : 100;
          const x0 = 120 + Math.cos(a) * r0;
          const y0 = 118 + Math.sin(a) * r0;
          const x1 = 120 + Math.cos(a) * r1;
          const y1 = 118 + Math.sin(a) * r1;
          const w = 12;
          const px = Math.cos(a + Math.PI / 2) * w;
          const py = Math.sin(a + Math.PI / 2) * w;
          return (
            <path
              key={i}
              d={`M${x0 - px} ${y0 - py} L${x1} ${y1} L${x0 + px} ${y0 + py}Z`}
              fill={i % 2 === 0 ? '#ffb02e' : '#f58a1f'}
              stroke={TINTA}
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
          );
        })}
      </g>

      {/* disco solar */}
      <circle cx="120" cy="118" r="76" fill="url(#jsSol)" stroke={TINTA} strokeWidth="4" />

      {/* tierra cuarteada sobre la frente (rasgo de sequía) */}
      <path d="M78 82 l14 8 l-8 10 M150 78 l-12 10 l10 8 M120 66 l-4 12 l8 4"
        stroke="#b5561a" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.7" />

      {/* cejas furiosas */}
      <path d="M74 96 q18 -14 40 0" fill="none" stroke={TINTA} strokeWidth="6" strokeLinecap="round" />
      <path d="M166 96 q-18 -14 -40 0" fill="none" stroke={TINTA} strokeWidth="6" strokeLinecap="round" />

      {/* ojos ardientes */}
      <g className={anim ? 'msc-jefe-ojos' : undefined}>
        <circle cx="96" cy="108" r="15" fill="#fff8e6" stroke={TINTA} strokeWidth="3" />
        <circle cx="144" cy="108" r="15" fill="#fff8e6" stroke={TINTA} strokeWidth="3" />
        <circle cx="99" cy="110" r="6.5" fill="#c62f10" />
        <circle cx="147" cy="110" r="6.5" fill="#c62f10" />
        <circle cx="97" cy="108" r="2.4" fill="#fff" />
        <circle cx="145" cy="108" r="2.4" fill="#fff" />
      </g>

      {/* boca malvada = grieta de tierra seca con dientes */}
      <path d="M84 146 q36 40 72 0 q-36 14 -72 0Z" fill="url(#jsBoca)" stroke={TINTA} strokeWidth="3.5" />
      <path d="M92 150 l6 12 M108 155 l3 14 M124 156 l-2 14 M140 153 l-5 13 M150 149 l-7 11"
        stroke="#fff2c8" strokeWidth="3" strokeLinecap="round" />
      {/* lengua reseca */}
      <path d="M116 166 q4 12 8 0Z" fill="#8a2a10" stroke={TINTA} strokeWidth="1.5" />

      {/* ondas de calor que suben */}
      {anim && (
        <g className="msc-jefe-calor" opacity="0.5">
          <path d="M70 210 q6 -12 0 -22 q-6 -10 0 -20" stroke="#ffcaa0" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M120 214 q6 -12 0 -22 q-6 -10 0 -20" stroke="#ffd7b0" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M170 210 q6 -12 0 -22 q-6 -10 0 -20" stroke="#ffcaa0" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
});

export default JefeSequia;
