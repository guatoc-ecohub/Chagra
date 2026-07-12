/*
 * muralAgua — arte 2D del mural New Donk del MUNDO AGUA.
 *
 * Identidad: la quebrada que baja del nacimiento — cerros frescos de niebla,
 * la cinta de agua corriendo con destellos (es la capa que más rápido viaja),
 * piedras de río pulidas, juncos con espiga, helechos de orilla y gotas que
 * brillan. Paleta fresca dentro del tema cálido: verdes menta y aguamarinas
 * con luz blanca de páramo.
 */

/* Juncos de orilla con espigas. */
function Junco2D({ x, alto = 84 }) {
  return (
    <svg
      viewBox="0 0 44 92"
      width={44}
      height={92}
      style={{ position: 'absolute', bottom: 0, left: `${x}%`, height: alto, width: 'auto' }}
      aria-hidden="true"
    >
      <path d="M14,92 C13,60 15,38 12,20" stroke="#3f7a3c" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M23,92 C23,56 22,34 25,12" stroke="#4f9040" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M32,92 C33,62 31,44 34,28" stroke="#356b2c" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M23,74 C31,66 36,58 38,50" stroke="#4f9040" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <rect x="8.6" y="8" width="7" height="18" rx="3.5" fill="#7a5a38" />
      <rect x="21.6" y="1" width="7" height="18" rx="3.5" fill="#8a6d47" />
      <rect x="30.8" y="17" width="6" height="15" rx="3" fill="#7a5a38" />
    </svg>
  );
}

/* Piedras de río pulidas, con brillo húmedo. */
function PiedrasRio2D({ x }) {
  return (
    <svg
      viewBox="0 0 64 32"
      width={64}
      height={32}
      style={{ position: 'absolute', bottom: 0, left: `${x}%`, height: 30, width: 'auto' }}
      aria-hidden="true"
    >
      <ellipse cx="18" cy="22" rx="16" ry="10" fill="#8fa3a0" />
      <ellipse cx="44" cy="24" rx="14" ry="8" fill="#7b908d" />
      <ellipse cx="33" cy="14" rx="11" ry="7" fill="#a3b5b0" />
      <path d="M26,10 C29,8.5 34,8.5 37,10" stroke="#e7f2ee" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.85" />
      <path d="M8,18 C11,16.5 15,16.5 18,18" stroke="#dcE9e4" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

/* Helecho de orilla: frondas que se arquean. */
function Helecho2D({ x, alto = 62 }) {
  return (
    <svg
      viewBox="0 0 60 70"
      width={60}
      height={70}
      style={{ position: 'absolute', bottom: 0, left: `${x}%`, height: alto, width: 'auto' }}
      aria-hidden="true"
    >
      <path d="M30,70 C28,52 18,40 8,36" stroke="#3f8a3d" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M30,70 C31,50 40,36 52,32" stroke="#4f9040" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M30,70 C30,50 29,36 30,24" stroke="#356b2c" strokeWidth="3" fill="none" strokeLinecap="round" />
      {[[12, 40], [18, 46], [24, 54]].map(([cx, cy], i) => (
        <ellipse key={`a${i}`} cx={cx} cy={cy} rx="5.5" ry="2.6" fill="#61a548" transform={`rotate(-38 ${cx} ${cy})`} />
      ))}
      {[[47, 36], [41, 42], [35, 50]].map(([cx, cy], i) => (
        <ellipse key={`b${i}`} cx={cx} cy={cy} rx="5.5" ry="2.6" fill="#4f9040" transform={`rotate(38 ${cx} ${cy})`} />
      ))}
      <ellipse cx="30" cy="28" rx="2.8" ry="5" fill="#61a548" />
    </svg>
  );
}

/* Gota-destello: el agua viva saludando desde la orilla. */
function GotaBrillo2D({ x, alto = 36 }) {
  return (
    <svg
      viewBox="0 0 30 40"
      width={30}
      height={40}
      style={{ position: 'absolute', bottom: 4, left: `${x}%`, height: alto, width: 'auto' }}
      aria-hidden="true"
    >
      <ellipse cx="15" cy="26" rx="11" ry="12" fill="#eafffb" opacity="0.55" />
      <path d="M15,6 C20,15 24,20 24,27 A9,9 0 1 1 6,27 C6,20 10,15 15,6 Z" fill="#9fdcd4" stroke="#5fb8b4" strokeWidth="1.6" />
      <circle cx="11.5" cy="26" r="2.4" fill="#f0fffb" />
    </svg>
  );
}

/* La franja de orilla (una copia; el mural la pone dos veces). */
function FloraAgua() {
  return (
    <>
      <Helecho2D x={3} alto={64} />
      <PiedrasRio2D x={14} />
      <Junco2D x={25} alto={86} />
      <GotaBrillo2D x={38} />
      <Junco2D x={48} alto={70} />
      <PiedrasRio2D x={60} />
      <Helecho2D x={70} alto={56} />
      <Junco2D x={82} alto={80} />
      <GotaBrillo2D x={93} alto={30} />
    </>
  );
}

export const MURAL_AGUA = {
  id: 'agua',
  nombre: 'Agua',
  placa: 'Mundo Agua — la quebrada del nacimiento',
  placaFondo: 'rgba(32, 84, 78, 0.8)',
  marcoCss: 'linear-gradient(160deg, #2f6b5e, #1e4a41 70%)',
  marcoSombra: '0 0 0 3px rgba(20, 54, 46, 0.55), 0 14px 34px rgba(14, 44, 38, 0.35)',
  /* luz blanca de páramo con cielo menta */
  lienzo:
    'radial-gradient(32% 28% at 72% 16%, rgba(240, 255, 250, 0.92) 0 30%, rgba(240, 255, 250, 0) 70%), '
    + 'linear-gradient(#e7f7ee 0%, #cfeedd 44%, #b7e3c6 60%)',
  capas: [
    /* cerros del nacimiento, fríos y con niebla */
    {
      height: '58%',
      fondo: 'radial-gradient(60% 115% at 50% 106%, #9ecfae 0 62%, rgba(0,0,0,0) 63%)',
      tam: '290px 168px',
      dur: 58,
      ancho: '-290px',
      opacidad: 0.85,
    },
    /* la ribera media, verde húmedo */
    {
      height: '42%',
      fondo: 'radial-gradient(58% 112% at 50% 106%, #7dbb84 0 62%, rgba(0,0,0,0) 63%)',
      tam: '204px 124px',
      dur: 27,
      ancho: '-204px',
    },
    /* LA QUEBRADA: cinta de agua con destellos — la capa más veloz del mural */
    {
      height: '13%',
      bottom: '15%',
      fondo:
        'repeating-linear-gradient(100deg, rgba(255, 255, 255, 0.28) 0 7px, rgba(0,0,0,0) 7px 46px, rgba(234, 255, 251, 0.18) 46px 52px, rgba(0,0,0,0) 52px 92px), '
        + 'linear-gradient(#8fd8d0, #5fb8b4 60%, #4aa3a3)',
      tam: '368px 100%, 100% 100%',
      dur: 4.5,
      ancho: '-320px',
      bordeArriba: '2px solid rgba(234, 255, 251, 0.75)',
      bordeAbajo: '2px solid rgba(42, 96, 90, 0.5)',
    },
  ],
  /* la orilla por donde camina Angelita: pasto ribereño con guijarros */
  suelo: {
    height: '17%',
    fondo:
      'repeating-linear-gradient(90deg, rgba(58, 94, 88, 0.28) 0 6px, rgba(0,0,0,0) 6px 42px), '
      + 'linear-gradient(#7fbf80, #5da268 55%, #4b8a56)',
    tam: '640px 100%, 100% 100%',
    dur: 9,
    ancho: '-640px',
    bordeArriba: '3px solid rgba(38, 70, 56, 0.5)',
  },
  flora: { Copia: FloraAgua, dur: 15, bottom: '15%', height: '46%' },
  angelita: { left: '32%', animo: 'sereno', animoCelebra: 'pleno' },
  /* la valla física en el 3D, madera curada por la humedad */
  marco3d: { frente: '#4c5f4a', techo: '#74806a', postes: '#5f7058' },
};
