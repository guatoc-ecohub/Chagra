/**
 * PlagasSprites — bestiario ARTÍSTICO del "Metal Slug del campo".
 *
 * SOLO ARTE. Sprites SVG expresivos (rubber-hose "villano": ceños, ojos
 * saltones, dientes, patas que se menean) para las plagas reales del juego.
 * Cada plaga es RECONOCIBLE (biología real: la broca perfora la cereza roja,
 * la hormiga arriera carga su hoja, el mojojoy es una C blanca gorda) pero con
 * personalidad de enemigo de arcade. Gama baja: pocos nodos, corre en celular.
 *
 * Consumo: <PlagaSprite enemigoId reducedMotion /> — data-driven por id. Cubre
 * todos los ENEMIGOS de metalSlugCampoData + extras nombrados (chiza/mojojoy,
 * trozador, hormiga arriera, gota/tizón) listos para cuando Opus los cablee.
 *
 * Sin red, sin deps externas, es-CO. Las animaciones se apagan con reducedMotion
 * (clase se omite) y con @media prefers-reduced-motion en la hoja del juego.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish -- title/aria de sprites de
   juego servido solo en es-CO, mismo criterio que MetalSlugCampo/data. */
import { memo } from 'react';

const TINTA = '#2c1e12';

/* Ojos saltones reutilizables (el sello "villano" del bestiario). */
function OjosMalvados({ cx1, cx2, cy, r = 4.4, mira = 1, enojo = true }) {
  const pupOff = 1.1 * mira;
  return (
    <g>
      <circle cx={cx1} cy={cy} r={r} fill="#fff" stroke={TINTA} strokeWidth="1.6" />
      <circle cx={cx2} cy={cy} r={r} fill="#fff" stroke={TINTA} strokeWidth="1.6" />
      <circle cx={cx1 + pupOff} cy={cy + 0.6} r={r * 0.42} fill={TINTA} />
      <circle cx={cx2 + pupOff} cy={cy + 0.6} r={r * 0.42} fill={TINTA} />
      {enojo && (
        <>
          <path d={`M${cx1 - r} ${cy - r - 1.5} L${cx1 + r * 0.7} ${cy - r * 0.2}`} stroke={TINTA} strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d={`M${cx2 + r} ${cy - r - 1.5} L${cx2 - r * 0.7} ${cy - r * 0.2}`} stroke={TINTA} strokeWidth="2" strokeLinecap="round" fill="none" />
        </>
      )}
    </g>
  );
}

/* ── Orugas (cogollero, elotero, trozador, barrenador). ─────────────────────── */
function Oruga({ tono = '#8fbf55', tonoAlt = '#a7d06a', cabeza = '#6f9a3e', rayas = false, anim }) {
  const segs = [12, 24, 36, 48, 58];
  return (
    <svg viewBox="0 0 72 48" width="100%" height="100%" className={anim} preserveAspectRatio="xMidYMax meet">
      <defs>
        <linearGradient id="orugaG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={tonoAlt} />
          <stop offset="1" stopColor={tono} />
        </linearGradient>
      </defs>
      {/* patitas que se menean */}
      {[16, 28, 40].map((x, i) => (
        <line key={x} x1={x} y1="38" x2={x - 3} y2="46" stroke={TINTA} strokeWidth="2.4" strokeLinecap="round" className={anim ? `msc-leg msc-leg--${i}` : undefined} />
      ))}
      <g>
        {segs.map((cx, i) => (
          <g key={cx}>
            <circle cx={cx} cy={30 - (i % 2) * 2.5} r={i === 0 ? 9 : 10.5} fill="url(#orugaG)" stroke={TINTA} strokeWidth="2.4" />
            {rayas && <path d={`M${cx} ${20 - (i % 2) * 2.5} q3 5 0 10`} stroke={cabeza} strokeWidth="2.4" fill="none" opacity="0.6" />}
          </g>
        ))}
        {/* cabeza malvada */}
        <circle cx="60" cy="27" r="11" fill={cabeza} stroke={TINTA} strokeWidth="2.6" />
        <OjosMalvados cx1={56} cx2={64} cy={25} r={3.6} mira={1} />
        {/* boca mordelona */}
        <path d="M55 33 q6 5 11 0" fill="#7a1f14" stroke={TINTA} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M57 33 l1.5 3 M60.5 34 l0 3 M64 33 l-1.5 3" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
        {/* antenitas */}
        <path d="M62 17 q3 -6 7 -4 M66 18 q4 -4 8 -1" stroke={TINTA} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/* ── Áfido / pulgón: pera verde con cornículos y gotita de mielada. ─────────── */
function Afido({ tono = '#9ccf5e', anim, oscuro = false }) {
  const c = oscuro ? '#5f8a3a' : tono;
  const cAlt = oscuro ? '#78a84a' : '#b7dd78';
  return (
    <svg viewBox="0 0 58 52" width="100%" height="100%" className={anim} preserveAspectRatio="xMidYMax meet">
      <defs>
        <radialGradient id="afidoG" cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor={cAlt} />
          <stop offset="1" stopColor={c} />
        </radialGradient>
      </defs>
      {/* patas */}
      {[[14, 40], [24, 44], [34, 42]].map(([x, y], i) => (
        <line key={x} x1={x} y1="34" x2={x - 4} y2={y + 4} stroke={TINTA} strokeWidth="2.2" strokeLinecap="round" className={anim ? `msc-leg msc-leg--${i}` : undefined} />
      ))}
      {/* cuerpo pera */}
      <path d="M26 12 q16 2 15 20 q-1 16 -16 16 q-16 0 -16 -16 q0 -18 17 -20Z" fill="url(#afidoG)" stroke={TINTA} strokeWidth="2.6" />
      {/* cornículos (los "tubitos" del pulgón: rasgo diagnóstico) */}
      <path d="M36 18 q6 -4 8 -10 M40 22 q7 -2 10 -7" stroke={TINTA} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <OjosMalvados cx1={16} cx2={26} cy={26} r={4} mira={-1} />
      <path d="M15 36 q6 4 12 1" fill="none" stroke={TINTA} strokeWidth="2" strokeLinecap="round" />
      {/* gotita de mielada pegajosa */}
      <path d="M40 40 q3 5 0 7 q-3 -2 0 -7Z" fill="#ffe27a" stroke={TINTA} strokeWidth="1.2" className={anim ? 'msc-drip' : undefined} />
    </svg>
  );
}

/* ── Mosca blanca: polvorienta, alas de talco, revoloteando. ────────────────── */
function MoscaBlanca({ anim }) {
  return (
    <svg viewBox="0 0 62 54" width="100%" height="100%" className={anim} preserveAspectRatio="xMidYMax meet">
      <g className={anim ? 'msc-flutter' : undefined} style={{ transformOrigin: '31px 30px' }}>
        <ellipse cx="21" cy="20" rx="17" ry="10" fill="#fbfbf5" stroke={TINTA} strokeWidth="2.2" opacity="0.95" transform="rotate(-16 21 20)" />
        <ellipse cx="41" cy="20" rx="17" ry="10" fill="#eef0e6" stroke={TINTA} strokeWidth="2.2" opacity="0.95" transform="rotate(16 41 20)" />
        {/* polvillo de cera */}
        <circle cx="14" cy="16" r="1.6" fill="#fff" /><circle cx="48" cy="15" r="1.6" fill="#fff" /><circle cx="30" cy="8" r="1.4" fill="#fff" />
      </g>
      <ellipse cx="31" cy="35" rx="14" ry="12.5" fill="#f2eddd" stroke={TINTA} strokeWidth="2.6" />
      <OjosMalvados cx1={26} cx2={36} cy={33} r={4.2} mira={1} enojo />
      <path d="M25 42 q6 4 12 0" fill="none" stroke={TINTA} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/* ── Broca del café: escarabajito taladrando la cereza roja. ────────────────── */
function Broca({ anim }) {
  return (
    <svg viewBox="0 0 66 58" width="100%" height="100%" className={anim} preserveAspectRatio="xMidYMax meet">
      <defs>
        <radialGradient id="cerezaG" cx="0.38" cy="0.32" r="0.85">
          <stop offset="0" stopColor="#ff6a55" />
          <stop offset="1" stopColor="#c62f22" />
        </radialGradient>
        <linearGradient id="brocaG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a4636" />
          <stop offset="1" stopColor="#2e2018" />
        </linearGradient>
      </defs>
      {/* cereza de café perforada */}
      <circle cx="24" cy="34" r="19" fill="url(#cerezaG)" stroke={TINTA} strokeWidth="2.6" />
      <path d="M24 15 q3 -5 8 -4" stroke="#4d7a34" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <ellipse cx="18" cy="27" rx="5" ry="3.5" fill="#fff" opacity="0.35" />
      {/* agujero de entrada */}
      <circle cx="36" cy="38" r="5.5" fill="#2a0d08" stroke={TINTA} strokeWidth="1.6" />
      {/* escarabajo asomando y taladrando */}
      <g className={anim ? 'msc-drill' : undefined} style={{ transformOrigin: '48px 40px' }}>
        <ellipse cx="50" cy="40" rx="13" ry="9" fill="url(#brocaG)" stroke={TINTA} strokeWidth="2.4" />
        <path d="M43 34 l16 0 M43 40 l16 0 M43 46 l16 0" stroke={TINTA} strokeWidth="1.2" opacity="0.5" />
        <OjosMalvados cx1={54} cx2={60} cy={37} r={3} mira={1} />
        {/* trompa taladradora */}
        <path d="M39 40 l-7 0" stroke={TINTA} strokeWidth="3" strokeLinecap="round" />
        <path d="M50 32 q4 -7 9 -6 M55 31 q4 -6 9 -3" stroke={TINTA} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </g>
      {/* aserrín */}
      <circle cx="34" cy="48" r="1.4" fill="#c9a66b" /><circle cx="30" cy="52" r="1.2" fill="#c9a66b" />
    </svg>
  );
}

/* ── Hormiga arriera: cabezona con su hoja al hombro. ───────────────────────── */
function HormigaArriera({ anim }) {
  return (
    <svg viewBox="0 0 70 54" width="100%" height="100%" className={anim} preserveAspectRatio="xMidYMax meet">
      <defs>
        <linearGradient id="hormG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a4a26" />
          <stop offset="1" stopColor="#5c2f16" />
        </linearGradient>
      </defs>
      {/* pedazo de hoja que carga (rasgo icónico) */}
      <g className={anim ? 'msc-carga' : undefined} style={{ transformOrigin: '34px 14px' }}>
        <path d="M20 16 q14 -14 30 -6 q-4 16 -22 16 q-10 -2 -8 -10Z" fill="#5fae43" stroke={TINTA} strokeWidth="2.2" />
        <path d="M24 14 q10 2 20 -2" stroke="#2f6b22" strokeWidth="1.6" fill="none" />
      </g>
      {/* patas */}
      {[[26, 44], [34, 48], [42, 44]].map(([x, y], i) => (
        <g key={x}>
          <line x1={x} y1="36" x2={x - 5} y2={y} stroke={TINTA} strokeWidth="2.4" strokeLinecap="round" className={anim ? `msc-leg msc-leg--${i}` : undefined} />
          <line x1={x + 8} y1="36" x2={x + 13} y2={y} stroke={TINTA} strokeWidth="2.4" strokeLinecap="round" className={anim ? `msc-leg msc-leg--${i}` : undefined} />
        </g>
      ))}
      {/* tres segmentos */}
      <ellipse cx="48" cy="36" rx="12" ry="9" fill="url(#hormG)" stroke={TINTA} strokeWidth="2.4" />
      <circle cx="34" cy="36" r="7" fill="url(#hormG)" stroke={TINTA} strokeWidth="2.2" />
      {/* cabezota */}
      <circle cx="20" cy="34" r="11" fill="url(#hormG)" stroke={TINTA} strokeWidth="2.6" />
      <OjosMalvados cx1={15} cx2={24} cy={31} r={3.4} mira={-1} />
      {/* mandíbulas */}
      <path d="M10 38 q-6 2 -4 7 M12 40 q-4 4 -1 8" stroke={TINTA} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M14 22 q-2 -6 3 -9 M20 21 q0 -7 5 -9" stroke={TINTA} strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/* ── Chiza / mojojoy: la C blanca gorda con cabeza café. ────────────────────── */
function Chiza({ anim }) {
  return (
    <svg viewBox="0 0 62 56" width="100%" height="100%" className={anim} preserveAspectRatio="xMidYMax meet">
      <defs>
        <linearGradient id="chizaG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbf4e4" />
          <stop offset="1" stopColor="#e6d7b8" />
        </linearGradient>
      </defs>
      {/* cuerpo en C, segmentado */}
      <path d="M40 8 q-26 0 -26 22 q0 22 24 22 q10 0 14 -6 q-16 4 -20 -6 q14 3 16 -8 q-14 4 -16 -8 q12 0 8 -8Z"
        fill="url(#chizaG)" stroke={TINTA} strokeWidth="2.6" strokeLinejoin="round" className={anim ? 'msc-curl' : undefined} style={{ transformOrigin: '30px 30px' }} />
      {/* pliegues */}
      <path d="M22 20 q6 2 10 -2 M18 30 q8 2 12 -2 M20 40 q7 2 11 -2" stroke="#c9b58a" strokeWidth="1.6" fill="none" />
      {/* cabeza café con patitas */}
      <circle cx="42" cy="14" r="10" fill="#a5602f" stroke={TINTA} strokeWidth="2.6" />
      <OjosMalvados cx1={38} cx2={46} cy={12} r={3.2} mira={1} />
      <path d="M40 19 q4 3 7 0" fill="none" stroke={TINTA} strokeWidth="1.8" strokeLinecap="round" />
      {[[46, 26], [50, 22], [48, 30]].map(([x, y], i) => (
        <line key={x} x1="42" y1={y - 2} x2={x + 6} y2={y} stroke={TINTA} strokeWidth="2.2" strokeLinecap="round" className={anim ? `msc-leg msc-leg--${i}` : undefined} />
      ))}
    </svg>
  );
}

/* ── Chicharrita / saltamontes: cuña verde con patas de resorte. ────────────── */
function Saltamontes({ anim, chica = false }) {
  const s = chica ? 0.82 : 1;
  return (
    <svg viewBox="0 0 72 52" width="100%" height="100%" className={anim} preserveAspectRatio="xMidYMax meet">
      <defs>
        <linearGradient id="saltG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fca4e" />
          <stop offset="1" stopColor="#5f962f" />
        </linearGradient>
      </defs>
      <g transform={`translate(36 30) scale(${s}) translate(-36 -30)`}>
        {/* pata trasera de resorte (icónica) */}
        <g className={anim ? 'msc-spring' : undefined} style={{ transformOrigin: '40px 34px' }}>
          <path d="M40 30 l14 -4 l-8 12 l12 4" fill="none" stroke={TINTA} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M40 30 l14 -4 l-8 12" fill="#4f8027" stroke={TINTA} strokeWidth="2" opacity="0.5" />
        </g>
        {/* patas delanteras */}
        <line x1="26" y1="32" x2="20" y2="44" stroke={TINTA} strokeWidth="2.6" strokeLinecap="round" className={anim ? 'msc-leg msc-leg--0' : undefined} />
        <line x1="32" y1="34" x2="28" y2="46" stroke={TINTA} strokeWidth="2.6" strokeLinecap="round" className={anim ? 'msc-leg msc-leg--1' : undefined} />
        {/* cuerpo alargado */}
        <path d="M14 28 q10 -10 34 -6 q10 2 8 8 q-4 6 -20 6 q-18 0 -22 -8Z" fill="url(#saltG)" stroke={TINTA} strokeWidth="2.6" />
        {/* ala plegada */}
        <path d="M24 24 q14 -4 22 0 q-2 6 -12 6 q-8 0 -10 -6Z" fill="#6fa63a" stroke={TINTA} strokeWidth="1.6" opacity="0.7" />
        {/* cabeza + mandíbula */}
        <circle cx="16" cy="27" r="9" fill="#6fa63a" stroke={TINTA} strokeWidth="2.4" />
        <OjosMalvados cx1={12} cx2={20} cy={25} r={3.4} mira={-1} />
        <path d="M8 31 q4 4 9 2" fill="none" stroke={TINTA} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 18 q-3 -7 2 -10 M18 18 q0 -8 5 -9" stroke={TINTA} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/* ── Araña roja (ácaro): esfera roja con 8 patas y telita. ──────────────────── */
function AranaRoja({ anim }) {
  return (
    <svg viewBox="0 0 60 56" width="100%" height="100%" className={anim} preserveAspectRatio="xMidYMax meet">
      <defs>
        <radialGradient id="aranaG" cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#ff6d5a" />
          <stop offset="1" stopColor="#b52a1e" />
        </radialGradient>
      </defs>
      {/* telaraña de fondo */}
      <path d="M2 6 q14 8 8 22 M58 4 q-14 10 -6 24" stroke="#d8d2c0" strokeWidth="1.2" fill="none" opacity="0.7" />
      {/* 8 patas */}
      <g className={anim ? 'msc-legs8' : undefined} style={{ transformOrigin: '30px 32px' }}>
        {[-52, -34, -16, 0].map((a, i) => (
          <g key={a}>
            <path d={`M30 32 q${-12 - i * 2} ${a / 6} ${-20 - i * 3} ${a / 3 + 14}`} stroke={TINTA} strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <path d={`M30 32 q${12 + i * 2} ${a / 6} ${20 + i * 3} ${a / 3 + 14}`} stroke={TINTA} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          </g>
        ))}
      </g>
      <circle cx="30" cy="32" r="15" fill="url(#aranaG)" stroke={TINTA} strokeWidth="2.6" />
      <circle cx="25" cy="26" r="4" fill="#fff" opacity="0.3" />
      <OjosMalvados cx1={25} cx2={35} cy={30} r={3.6} mira={1} />
      <path d="M25 39 q5 4 10 0" fill="none" stroke={TINTA} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/* ── Cochinilla harinosa: mota algodonosa con filamentos de cera. ───────────── */
function Cochinilla({ anim }) {
  return (
    <svg viewBox="0 0 60 52" width="100%" height="100%" className={anim} preserveAspectRatio="xMidYMax meet">
      {/* filamentos cerosos (rayos blancos) */}
      {Array.from({ length: 11 }).map((_, i) => {
        const a = (i / 11) * Math.PI * 2;
        return <line key={i} x1={30 + Math.cos(a) * 14} y1={30 + Math.sin(a) * 12} x2={30 + Math.cos(a) * 24} y2={30 + Math.sin(a) * 20} stroke="#f3efe2" strokeWidth="2.6" strokeLinecap="round" />;
      })}
      {/* cuerpo con segmentos (aspecto harinoso) */}
      <ellipse cx="30" cy="30" rx="16" ry="13" fill="#f7f1e0" stroke={TINTA} strokeWidth="2.4" />
      {[-8, 0, 8].map((dx) => (
        <path key={dx} d={`M${30 + dx} 18 q3 12 0 24`} stroke="#d9cfb2" strokeWidth="2" fill="none" />
      ))}
      <OjosMalvados cx1={25} cx2={35} cy={28} r={3.6} mira={1} />
      <path d="M25 37 q5 3 10 0" fill="none" stroke={TINTA} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* ── Trips: astillita alargada con flequitos, muy chica. ────────────────────── */
function Trips({ anim }) {
  return (
    <svg viewBox="0 0 66 40" width="100%" height="100%" className={anim} preserveAspectRatio="xMidYMax meet">
      {/* alas con flecos (rasgo del orden Thysanoptera) */}
      <g className={anim ? 'msc-flutter' : undefined} style={{ transformOrigin: '40px 16px' }}>
        <path d="M30 18 q18 -8 30 -2 q-12 4 -30 2Z" fill="#e8dcae" stroke={TINTA} strokeWidth="1.6" opacity="0.85" />
        {[44, 50, 56].map((x) => <line key={x} x1={x} y1="16" x2={x + 3} y2="10" stroke={TINTA} strokeWidth="1" />)}
      </g>
      {/* cuerpo delgado ambarino */}
      <path d="M8 22 q4 -6 22 -4 q14 2 12 6 q-2 5 -14 5 q-18 1 -20 -7Z" fill="#c99a3c" stroke={TINTA} strokeWidth="2.2" />
      <circle cx="12" cy="22" r="6.5" fill="#b5872e" stroke={TINTA} strokeWidth="2" />
      <OjosMalvados cx1={9} cx2={15} cy={20} r={2.6} mira={-1} />
      {[[16, 30], [24, 32], [30, 30]].map(([x, y], i) => (
        <line key={x} x1={x} y1="26" x2={x - 3} y2={y + 2} stroke={TINTA} strokeWidth="1.8" strokeLinecap="round" className={anim ? `msc-leg msc-leg--${i}` : undefined} />
      ))}
    </svg>
  );
}

/* ── Minador: polillita plateada con estela serpenteante de galería. ────────── */
function Minador({ anim }) {
  return (
    <svg viewBox="0 0 66 46" width="100%" height="100%" className={anim} preserveAspectRatio="xMidYMax meet">
      {/* galería serpenteante en la hoja */}
      <path d="M4 40 q10 -6 6 -14 q-4 -8 8 -10 q10 -1 8 -8" stroke="#9c7a3f" strokeWidth="3.2" fill="none" strokeLinecap="round" opacity="0.55" />
      <g className={anim ? 'msc-flutter' : undefined} style={{ transformOrigin: '44px 22px' }}>
        <path d="M34 22 q12 -10 24 -6 q-8 8 -24 6Z" fill="#e9e6db" stroke={TINTA} strokeWidth="1.8" />
        <path d="M40 20 q6 -3 12 -1" stroke="#b7b2a0" strokeWidth="1.2" fill="none" />
      </g>
      <ellipse cx="34" cy="26" rx="12" ry="6.5" fill="#d8d2c2" stroke={TINTA} strokeWidth="2.2" />
      <circle cx="26" cy="25" r="6" fill="#c4bda8" stroke={TINTA} strokeWidth="2" />
      <OjosMalvados cx1={23} cx2={29} cy={23} r={2.8} mira={-1} />
      <path d="M22 15 q-2 -6 3 -8 M28 15 q0 -6 4 -8" stroke={TINTA} strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/* ── Gota / tizón (enfermedad): nube de esporas con esporangios y baba. ─────── */
function GotaTizon({ anim }) {
  return (
    <svg viewBox="0 0 64 58" width="100%" height="100%" className={anim} preserveAspectRatio="xMidYMax meet">
      <defs>
        <radialGradient id="tizonG" cx="0.45" cy="0.4" r="0.75">
          <stop offset="0" stopColor="#8b6b93" />
          <stop offset="1" stopColor="#4a3a55" />
        </radialGradient>
      </defs>
      {/* nubarrón de moho, borde lobulado */}
      <path d="M14 34 q-8 -2 -6 -12 q2 -8 12 -6 q2 -12 16 -8 q8 -10 18 -2 q10 -2 8 10 q8 4 2 14 q4 10 -8 12 q-4 8 -16 4 q-8 8 -18 0 q-10 4 -8 -8 q-6 -2 -2 -6Z"
        fill="url(#tizonG)" stroke={TINTA} strokeWidth="2.4" className={anim ? 'msc-morph' : undefined} style={{ transformOrigin: '32px 30px' }} />
      {/* esporangios */}
      {[[20, 22], [44, 20], [30, 40], [46, 38]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="3.2" fill="#c9b6d0" stroke={TINTA} strokeWidth="1.2" opacity="0.8" />
      ))}
      {/* cara fantasmal enferma */}
      <OjosMalvados cx1={26} cx2={38} cy={28} r={4.4} mira={1} enojo />
      <path d="M24 40 q8 6 16 0 q-8 -2 -16 0Z" fill="#2a1832" stroke={TINTA} strokeWidth="1.8" />
      {/* goteo de tizón */}
      <path d="M22 50 q2 6 0 8 q-3 -2 0 -8Z M42 50 q2 5 0 7 q-3 -2 0 -7Z" fill="#5a4763" stroke={TINTA} strokeWidth="1.2" className={anim ? 'msc-drip' : undefined} />
    </svg>
  );
}

/* ── Selector data-driven. ──────────────────────────────────────────────────── */
const PlagaSprite = memo(function PlagaSprite(/** @type {any} */ { enemigoId, reducedMotion }) {
  const anim = reducedMotion ? undefined : 'msc-alive';
  switch (enemigoId) {
    case 'cogollero':
      return <Oruga tono="#8fbf55" tonoAlt="#a7d06a" cabeza="#c9922e" anim={anim} />;
    case 'gusano_mazorca':
      return <Oruga tono="#c9a24e" tonoAlt="#e0c070" cabeza="#7a3f1e" rayas anim={anim} />;
    case 'barrenador':
      return <Oruga tono="#e8ddc2" tonoAlt="#f5eeda" cabeza="#5a3a20" anim={anim} />;
    case 'trozador':
      return <Oruga tono="#4a4a55" tonoAlt="#66667a" cabeza="#2e2e38" anim={anim} />;
    case 'pulgon':
      return <Afido tono="#9ccf5e" anim={anim} />;
    case 'afido':
      return <Afido oscuro anim={anim} />;
    case 'moscablanca':
      return <MoscaBlanca anim={anim} />;
    case 'broca':
      return <Broca anim={anim} />;
    case 'hormiga_arriera':
    case 'arriera':
      return <HormigaArriera anim={anim} />;
    case 'chiza':
    case 'mojojoy':
      return <Chiza anim={anim} />;
    case 'chicharrita':
      return <Saltamontes chica anim={anim} />;
    case 'saltamontes':
      return <Saltamontes anim={anim} />;
    case 'aranita':
      return <AranaRoja anim={anim} />;
    case 'cochinilla':
      return <Cochinilla anim={anim} />;
    case 'trips':
      return <Trips anim={anim} />;
    case 'minador':
      return <Minador anim={anim} />;
    case 'gota':
    case 'tizon':
      return <GotaTizon anim={anim} />;
    default:
      // fallback genérico: bicho redondo malencarado
      return <Afido tono="#8bbf6a" anim={anim} />;
  }
});

export default PlagaSprite;
export {
  Oruga,
  Afido,
  MoscaBlanca,
  Broca,
  HormigaArriera,
  Chiza,
  Saltamontes,
  AranaRoja,
  Cochinilla,
  Trips,
  Minador,
  GotaTizon,
};
