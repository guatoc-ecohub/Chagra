/*
 * muralCafe — arte 2D del mural New Donk del MUNDO CAFÉ.
 *
 * Identidad: cafetal en ladera con sombrío al amanecer — luz miel, lomas
 * brumosas, hileras de cafetos punteando la pendiente, guamos de copa ancha
 * dando sombra, cafetos cargados de cerezas rojas y una canasta de cosecha.
 * Paleta cálida: mieles, terracotas de suelo cafetero, verdes oliva.
 */

/* Un cafeto: mata de hojas oscuras brillantes con racimos de cereza roja. */
function Cafeto2D({ x, alto = 78, brillo = false }) {
  return (
    <svg
      viewBox="0 0 64 96"
      width={64}
      height={96}
      style={{ position: 'absolute', bottom: 0, left: `${x}%`, height: alto, width: 'auto' }}
      aria-hidden="true"
    >
      <path d="M32,96 C31,74 33,52 32,26" stroke="#4a3521" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M32,74 C23,70 13,69 7,73" stroke="#4a3521" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M32,60 C41,56 51,55 57,59" stroke="#4a3521" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M32,46 C24,42 16,41 11,44" stroke="#4a3521" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <ellipse cx="12" cy="70" rx="9" ry="5" fill="#2e5c2b" transform="rotate(-16 12 70)" />
      <ellipse cx="24" cy="73" rx="8" ry="4.6" fill="#3f7a36" transform="rotate(-8 24 73)" />
      <ellipse cx="52" cy="56" rx="9" ry="5" fill="#2e5c2b" transform="rotate(14 52 56)" />
      <ellipse cx="40" cy="59" rx="8" ry="4.6" fill="#3f7a36" transform="rotate(8 40 59)" />
      <ellipse cx="15" cy="42" rx="8" ry="4.4" fill="#356b2c" transform="rotate(-14 15 42)" />
      <ellipse cx="32" cy="22" rx="7" ry="9" fill="#3f7a36" />
      <ellipse cx="27" cy="28" rx="5" ry="6" fill="#2e5c2b" />
      {/* racimos de cereza pegados a las ramas, como carga real */}
      <circle cx="27" cy="68" r="3.1" fill="#d9402e" />
      <circle cx="21" cy="71" r="2.7" fill="#b32b22" />
      <circle cx="26" cy="74" r="2.5" fill="#d9402e" />
      <circle cx="38" cy="54" r="3.1" fill={brillo ? '#ff6a4d' : '#d9402e'} />
      <circle cx="44" cy="57" r="2.7" fill="#b32b22" />
      <circle cx="39" cy="60" r="2.5" fill="#d9402e" />
      {brillo && <circle cx="38" cy="52" r="4.6" fill="none" stroke="#ffd9a0" strokeWidth="1.6" opacity="0.9" />}
      <circle cx="24" cy="44" r="2.6" fill="#c9862c" />
      <circle cx="19" cy="47" r="2.3" fill="#d9402e" />
    </svg>
  );
}

/* Un guamo de sombrío: tronco esbelto y copa ancha en pisos. */
function ArbolSombrio2D({ x, alto = 140 }) {
  return (
    <svg
      viewBox="0 0 140 150"
      width={140}
      height={150}
      style={{ position: 'absolute', bottom: 0, left: `${x}%`, height: alto, width: 'auto' }}
      aria-hidden="true"
    >
      <path d="M70,150 C68,110 72,74 67,40" stroke="#5c422a" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M69,96 C82,86 94,80 104,78" stroke="#5c422a" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M70,78 C58,68 46,62 36,60" stroke="#5c422a" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <ellipse cx="46" cy="46" rx="40" ry="15" fill="#3f7a3c" />
      <ellipse cx="94" cy="38" rx="38" ry="14" fill="#4f8f45" />
      <ellipse cx="66" cy="26" rx="44" ry="15" fill="#5c9b4a" />
      <ellipse cx="104" cy="72" rx="24" ry="9" fill="#4f8f45" />
      <ellipse cx="34" cy="56" rx="22" ry="8.5" fill="#3f7a3c" />
    </svg>
  );
}

/* Canasta de cosecha tejida, con cerezas recién cogidas. */
function Canasta2D({ x }) {
  return (
    <svg
      viewBox="0 0 48 36"
      width={48}
      height={36}
      style={{ position: 'absolute', bottom: 0, left: `${x}%`, height: 34, width: 'auto' }}
      aria-hidden="true"
    >
      <path d="M6,14 L42,14 L37,34 L11,34 Z" fill="#8a6d47" stroke="#5c422a" strokeWidth="2" />
      <path d="M9,20 L39,20 M11,27 L37,27" stroke="#5c422a" strokeWidth="1.4" opacity="0.7" />
      <circle cx="17" cy="12" r="3.4" fill="#d9402e" />
      <circle cx="25" cy="10" r="3.4" fill="#b32b22" />
      <circle cx="32" cy="12" r="3.4" fill="#d9402e" />
      <circle cx="21" cy="8" r="3" fill="#c9862c" />
    </svg>
  );
}

/* La franja de flora cercana (una copia; el mural la pone dos veces). */
function FloraCafe() {
  return (
    <>
      <ArbolSombrio2D x={2} alto={150} />
      <Cafeto2D x={17} alto={80} />
      <Cafeto2D x={28} alto={64} />
      <Canasta2D x={39} />
      <Cafeto2D x={48} alto={86} brillo />
      <ArbolSombrio2D x={59} alto={132} />
      <Cafeto2D x={76} alto={72} />
      <Cafeto2D x={88} alto={60} brillo />
    </>
  );
}

export const MURAL_CAFE = {
  id: 'cafe',
  nombre: 'Café',
  placa: 'Mundo Café — cafetal con sombrío',
  placaFondo: 'rgba(84, 52, 26, 0.8)',
  marcoCss: 'linear-gradient(160deg, #6b4a2a, #46301b 70%)',
  marcoSombra: '0 0 0 3px rgba(58, 38, 20, 0.55), 0 14px 34px rgba(46, 30, 14, 0.35)',
  /* amanecer cafetero: sol miel arriba a la derecha, bruma dorada */
  lienzo:
    'radial-gradient(30% 26% at 78% 18%, rgba(255, 214, 140, 0.95) 0 30%, rgba(255, 214, 140, 0) 70%), '
    + 'linear-gradient(#fbe8bd 0%, #ecd99e 40%, #cfd98f 60%)',
  capas: [
    /* lomas brumosas del fondo */
    {
      height: '60%',
      fondo: 'radial-gradient(60% 115% at 50% 106%, #b3cf8e 0 62%, rgba(0,0,0,0) 63%)',
      tam: '300px 172px',
      dur: 55,
      ancho: '-300px',
      opacidad: 0.8,
    },
    /* la ladera media, verde oliva */
    {
      height: '44%',
      fondo: 'radial-gradient(56% 110% at 50% 108%, #85ac5c 0 62%, rgba(0,0,0,0) 63%)',
      tam: '196px 120px',
      dur: 27,
      ancho: '-196px',
    },
    /* hilera lejana de cafetos punteando la pendiente */
    {
      height: '11%',
      bottom: '15%',
      fondo: 'radial-gradient(circle at 50% 62%, #4c7c3a 0 34%, rgba(0,0,0,0) 37%)',
      tam: '46px 40px',
      dur: 19,
      ancho: '-46px',
      opacidad: 0.9,
    },
  ],
  /* suelo de cafetal: tierra terracota con raizales */
  suelo: {
    height: '17%',
    fondo:
      'repeating-linear-gradient(90deg, rgba(94, 60, 32, 0.35) 0 8px, rgba(0,0,0,0) 8px 52px), '
      + 'linear-gradient(#b5854f, #96683c 55%, #7d5530)',
    tam: '640px 100%, 100% 100%',
    dur: 9,
    ancho: '-640px',
    bordeArriba: '3px solid rgba(74, 46, 22, 0.55)',
  },
  flora: { Copia: FloraCafe, dur: 16, bottom: '15%', height: '56%' },
  angelita: { left: '30%', animo: 'sereno', animoCelebra: 'pleno' },
  /* la valla física en el 3D, en maderas de beneficiadero */
  marco3d: { frente: '#5c422a', techo: '#8a6d47', postes: '#7a5a38' },
};
