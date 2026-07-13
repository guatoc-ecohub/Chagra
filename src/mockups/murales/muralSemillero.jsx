/*
 * muralSemillero — arte 2D del mural New Donk del MUNDO SEMILLERO.
 *
 * Identidad: las camas de germinación al mediodía tierno — colinas suaves con
 * domos de invernadero al fondo, hilera de brotes recién nacidos, camas de
 * madera con surcos sembrados, bandejas de germinación en mesa, la regadera
 * y un brote grande que brilla de puro nuevo. Paleta cálida y tierna: verdes
 * limón, maderas claras, sustrato oscuro y rico.
 */

/* Cama de germinación: cajón de madera con surcos y brotecitos en fila. */
function CamaGerminacion2D({ x, alto = 68 }) {
  return (
    <svg
      viewBox="0 0 120 74"
      width={120}
      height={74}
      style={{ position: 'absolute', bottom: 0, left: `${x}%`, height: alto, width: 'auto' }}
      aria-hidden="true"
    >
      <rect x="10" y="66" width="8" height="8" fill="#7a5a38" />
      <rect x="102" y="66" width="8" height="8" fill="#7a5a38" />
      <rect x="6" y="42" width="108" height="26" rx="3" fill="#8a6d47" stroke="#5c422a" strokeWidth="2.4" />
      <rect x="11" y="46" width="98" height="10" rx="2" fill="#4a3521" />
      <path d="M16,51 H104" stroke="#2e2014" strokeWidth="1.6" opacity="0.6" strokeDasharray="6 8" />
      {[22, 40, 58, 76, 94].map((cx) => (
        <g key={cx}>
          <path d={`M${cx},46 C${cx - 1},40 ${cx - 1},36 ${cx},32`} stroke="#4f9040" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <ellipse cx={cx - 5} cy="33" rx="5.5" ry="3" fill="#7cc258" transform={`rotate(-24 ${cx - 5} 33)`} />
          <ellipse cx={cx + 5} cy="33" rx="5.5" ry="3" fill="#61a548" transform={`rotate(24 ${cx + 5} 33)`} />
        </g>
      ))}
    </svg>
  );
}

/* Bandeja de germinación sobre mesita de trabajo. */
function BandejaAlta2D({ x, alto = 78 }) {
  return (
    <svg
      viewBox="0 0 96 84"
      width={96}
      height={84}
      style={{ position: 'absolute', bottom: 0, left: `${x}%`, height: alto, width: 'auto' }}
      aria-hidden="true"
    >
      <path d="M18,84 L22,46 M78,84 L74,46 M14,68 L82,68" stroke="#7a5a38" strokeWidth="4" strokeLinecap="round" />
      <rect x="10" y="38" width="76" height="12" rx="2.5" fill="#a58757" stroke="#5c422a" strokeWidth="2" />
      {[20, 34, 48, 62, 76].map((cx) => (
        <path key={cx} d={`M${cx},40 V48`} stroke="#5c422a" strokeWidth="1.4" opacity="0.6" />
      ))}
      {[16, 30, 44, 58, 72].map((cx, i) => (
        <g key={cx}>
          <path d={`M${cx + 6},38 C${cx + 5.5},33 ${cx + 6},30 ${cx + 6},27`} stroke="#4f9040" strokeWidth="2" fill="none" strokeLinecap="round" />
          <ellipse cx={cx + 2.5} cy={27 - (i % 2) * 2} rx="4.4" ry="2.4" fill="#7cc258" transform={`rotate(-22 ${cx + 2.5} ${27 - (i % 2) * 2})`} />
          <ellipse cx={cx + 9.5} cy={27 - (i % 2) * 2} rx="4.4" ry="2.4" fill="#61a548" transform={`rotate(22 ${cx + 9.5} ${27 - (i % 2) * 2})`} />
        </g>
      ))}
    </svg>
  );
}

/* La regadera de lata, con su arco de gotas frescas. */
function Regadera2D({ x, alto = 46 }) {
  return (
    <svg
      viewBox="0 0 84 60"
      width={84}
      height={60}
      style={{ position: 'absolute', bottom: 0, left: `${x}%`, height: alto, width: 'auto' }}
      aria-hidden="true"
    >
      <rect x="26" y="24" width="34" height="32" rx="6" fill="#6f8577" stroke="#4c5f4a" strokeWidth="2.4" />
      <path d="M40,24 C40,15 47,12 52,14" stroke="#4c5f4a" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M28,34 L10,22" stroke="#6f8577" strokeWidth="5.5" strokeLinecap="round" />
      <ellipse cx="9" cy="21" rx="4.6" ry="3.6" fill="#8a9c8e" stroke="#4c5f4a" strokeWidth="1.6" />
      <circle cx="4" cy="12" r="2" fill="#9fdcd2" />
      <circle cx="9" cy="8" r="2.2" fill="#8fd8d0" />
      <circle cx="15" cy="11" r="1.8" fill="#9fdcd2" />
    </svg>
  );
}

/* Brote grande recién nacido; con brillo = aura de vida nueva. */
function BroteGrande2D({ x, alto = 58, brillo = false }) {
  return (
    <svg
      viewBox="0 0 52 70"
      width={52}
      height={70}
      style={{ position: 'absolute', bottom: 0, left: `${x}%`, height: alto, width: 'auto' }}
      aria-hidden="true"
    >
      {brillo && <ellipse cx="26" cy="26" rx="22" ry="24" fill="#eaffd0" opacity="0.6" />}
      <path d="M26,70 C25,52 27,40 26,26" stroke="#4f9040" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M26,42 C15,38 8,30 8,20 C19,22 25,31 26,40 Z" fill="#7cc258" />
      <path d="M26,34 C37,30 44,22 44,12 C33,14 27,23 26,32 Z" fill="#61a548" />
      <ellipse cx="26" cy="20" rx="6" ry="7.5" fill={brillo ? '#c9ff96' : '#8cc95e'} />
      {brillo && <circle cx="26" cy="18" r="2.8" fill="#f4ffd9" />}
      <path d="M20,66 C22,64 30,64 32,66" stroke="#4a3521" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/* La franja del semillero (una copia; el mural la pone dos veces). */
function FloraSemillero() {
  return (
    <>
      <CamaGerminacion2D x={2} alto={70} />
      <BroteGrande2D x={20} alto={54} />
      <BandejaAlta2D x={30} alto={80} />
      <Regadera2D x={46} />
      <CamaGerminacion2D x={56} alto={64} />
      <BroteGrande2D x={74} alto={62} brillo />
      <BandejaAlta2D x={84} alto={74} />
    </>
  );
}

export const MURAL_SEMILLERO = {
  id: 'semillero',
  nombre: 'Semillero',
  placa: 'Mundo Semillero — camas de germinación',
  placaFondo: 'rgba(74, 84, 28, 0.82)',
  marcoCss: 'linear-gradient(160deg, #7c8a3a, #55611f 70%)',
  marcoSombra: '0 0 0 3px rgba(62, 70, 24, 0.55), 0 14px 34px rgba(48, 56, 18, 0.35)',
  /* mediodía tierno: sol alto y cielo limón */
  lienzo:
    'radial-gradient(30% 26% at 70% 16%, rgba(255, 250, 205, 0.95) 0 32%, rgba(255, 250, 205, 0) 70%), '
    + 'linear-gradient(#f4fadd 0%, #e2f2bb 42%, #cde8a2 60%)',
  capas: [
    /* colinas suaves con domos de invernadero asomando */
    {
      height: '58%',
      fondo:
        'radial-gradient(46% 76% at 50% 102%, rgba(250, 255, 250, 0.7) 0 58%, rgba(0,0,0,0) 61%), '
        + 'radial-gradient(60% 115% at 50% 106%, #b9dc95 0 62%, rgba(0,0,0,0) 63%)',
      tam: '300px 132px, 300px 168px',
      dur: 56,
      ancho: '-300px',
      opacidad: 0.85,
    },
    /* el lomo verde tierno del vivero */
    {
      height: '42%',
      fondo: 'radial-gradient(58% 112% at 50% 106%, #94c470 0 62%, rgba(0,0,0,0) 63%)',
      tam: '198px 122px',
      dur: 26,
      ancho: '-198px',
    },
    /* hilera de brotecitos recién germinados sobre el surco */
    {
      height: '8%',
      bottom: '15%',
      fondo:
        'radial-gradient(circle at 50% 26%, #7cc258 0 24%, rgba(0,0,0,0) 28%), '
        + 'linear-gradient(rgba(0,0,0,0) 55%, rgba(90, 62, 34, 0.55) 55%)',
      tam: '26px 100%, 26px 100%',
      dur: 13,
      ancho: '-26px',
    },
  ],
  /* sustrato oscuro y rico, recién regado */
  suelo: {
    height: '17%',
    fondo:
      'repeating-linear-gradient(90deg, rgba(46, 30, 14, 0.42) 0 7px, rgba(0,0,0,0) 7px 46px), '
      + 'linear-gradient(#8a6a44, #6d4f30 55%, #573d24)',
    tam: '640px 100%, 100% 100%',
    dur: 9,
    ancho: '-640px',
    bordeArriba: '3px solid rgba(52, 34, 16, 0.55)',
  },
  flora: { Copia: FloraSemillero, dur: 15, bottom: '15%', height: '46%' },
  angelita: { left: '38%', animo: 'atento', animoCelebra: 'pleno' },
  /* la valla física en el 3D, madera clara de vivero */
  marco3d: { frente: '#8a6d47', techo: '#a58757', postes: '#96784f' },
};
