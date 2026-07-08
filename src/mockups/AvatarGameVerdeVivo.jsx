/*
 * i18n (ADR-050): mockup de dirección visual con copy es-CO inline.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
/**
 * AvatarGameVerdeVivo — MOCKUP del "juego final de Chagra" en tema VERDE VIVO.
 *
 * "El Espíritu de tu Finca" (Chagra-strategy/ops/AVATAR_GAME.md): la finca es
 * un ORGANISMO VIVO NAVEGABLE (ramas = mundos, hojas = especies, frutos =
 * cosechas, raíces = suelo, sol = clima) y un AVATAR de especie nativa
 * colombiana que evoluciona (semilla→adulto) reflejando la salud REAL de la
 * finca. Datos de muestra. Ruta dev: #/mockups/avatar-verde-vivo (sin gate).
 *
 * 2ª PASADA (refinamiento de dirección): la firma es "la finca late" — el
 * corazón-semilla, la savia, el resplandor de la copa y el sol comparten el
 * mismo pulso de 2,4s. El espíritu ahora SUSURRA lo que la finca más pide
 * (indicador vivo, no mascota), el avatar es tocable, y la proyección llega
 * a 10 años como manda AVATAR_GAME.md.
 */
import React, { useEffect, useMemo, useState } from 'react';
import './avatar-game-verde-vivo.css';

const AÑO_HOY = 2026;

/* ============================== DATOS DE MUESTRA ============================== */

const MUNDOS = [
  { id: 'cultivos', emoji: '🌾', titulo: 'Cultivos y semillas', lema: 'Qué sembrar, cuándo, y cómo van sus matas', zona: 'rama', nodo: [400, 214], vinculo: 'Rama madre · 24 matas vivas', chips: ['La milpa', 'Frutales', 'Semilla propia', '+17'] },
  { id: 'disenio', emoji: '🌳', titulo: 'Diseño de la finca', lema: 'Buenas vecinas, monte vivo y restauración', zona: 'rama', nodo: [237, 288], vinculo: 'Copa · 12 nativas sembradas', chips: ['Buenas vecinas', 'Restauración', '+4'] },
  { id: 'sanidad', emoji: '🐞', titulo: 'Sanidad de la mata', lema: 'Plagas, remedios caseros y los bichos que ayudan', zona: 'rama', nodo: [563, 288], vinculo: 'Hojas sanas · 0 brotes activos', chips: ['Mi mata está enferma', 'Biopreparados', '+5'] },
  { id: 'cafe', emoji: '☕', titulo: 'El café', lema: 'Variedad y roya, sombra, broca, cosecha y beneficio', zona: 'rama', nodo: [187, 438], vinculo: 'Rama en cosecha · 180 palos', chips: ['Variedad y roya', 'La broca', 'Beneficio'] },
  { id: 'cana', emoji: '🥮', titulo: 'La caña y la panela', lema: 'De la caña al bloque: corte y trapiche', zona: 'rama', nodo: [613, 438], vinculo: 'Rama dulce · corte en 2 meses', chips: ['Siembra', 'El corte', 'El trapiche'] },
  { id: 'animales', emoji: '🐔', titulo: 'Los animales', lema: 'Cría campesina: gallinas, abejas, cabras y más', zona: 'rama', nodo: [247, 552], vinculo: 'Corral vivo · 18 gallinas, 2 colmenas', chips: ['Gallinas', 'Abejas', 'Cabras', '+4'] },
  { id: 'mercado', emoji: '🧺', titulo: 'Mercado y despensa', lema: 'Venda directo, saque cuentas y transforme', zona: 'rama', nodo: [553, 552], vinculo: 'Frutos que salen · 3 ventas este mes', chips: ['Vender directo', 'Poscosecha', '+5'] },
  { id: 'clima', emoji: '⛅', titulo: 'El clima', lema: 'Lo que viene y qué hacer, del IDEAM en campesino', zona: 'sol', nodo: [615, 128], vinculo: 'Sol y lluvia · La Niña suave', chips: ['Su día en la finca', 'El clima que viene'] },
  { id: 'agua', emoji: '💧', titulo: 'El agua', lema: 'Coseche la lluvia, riegue con medida, cuide el nacimiento', zona: 'agua', nodo: [143, 690], vinculo: 'Savia de la finca · nacimiento protegido', chips: ['Cosecha de lluvia', 'Riego', 'Nacimiento'] },
  { id: 'suelo', emoji: '🌱', titulo: 'El suelo vivo', lema: 'Conozca su tierra, corríjala y aliméntela', zona: 'raiz', nodo: [280, 902], vinculo: 'Raíces · pH 5,8 y subiendo', chips: ['Cuaderno del suelo', 'Cromatografía', '+2'] },
  { id: 'abono', emoji: '🐄', titulo: 'Estiércol y compost', lema: 'Del corral a la tierra negra', zona: 'raiz', nodo: [520, 902], vinculo: 'Humus · pila № 3 madurando', chips: ['Compost paso a paso', 'Biodigestor'] },
];

const ESPECIES = [
  { id: 'chivito', emoji: '🐦', nombre: 'Chivito de páramo', cientifico: 'Oxypogon guerinii', eje: 'Páramo sano y flores nativas', habitat: 'Vive entre las flores de la copa', anclaje: [308, 342], escala: 0.95 },
  { id: 'rana', emoji: '🐸', nombre: 'Rana dorada', cientifico: 'Andinobates dorisswansonae', eje: 'Agua limpia y quebradas vivas', habitat: 'Vive junto a la quebrada', anclaje: [178, 724], escala: 0.72 },
  { id: 'abeja', emoji: '🐝', nombre: 'Abeja angelita', cientifico: 'Tetragonisca angustula', eje: 'Floración y biodiversidad', habitat: 'Vive entre las flores de la copa', anclaje: [513, 340], escala: 0.62 },
  { id: 'oso', emoji: '🐻', nombre: 'Oso de anteojos', cientifico: 'Tremarctos ornatus', eje: 'Bosque y agroforestería', habitat: 'Vive al pie del tronco', anclaje: [472, 652], escala: 1.25 },
  { id: 'lombriz', emoji: '🪱', nombre: 'Lombriz y micelio', cientifico: 'La red viva del subsuelo', eje: 'Suelo vivo y compost', habitat: 'Vive junto al corazón-semilla', anclaje: [335, 928], escala: 1.0 },
];

const SALUD_BASE = [
  { id: 'agua', emoji: '💧', nombre: 'Agua', valor: 78 },
  { id: 'suelo', emoji: '🪱', nombre: 'Suelo', valor: 64 },
  { id: 'bio', emoji: '🦜', nombre: 'Biodiversidad', valor: 82 },
  { id: 'cosechas', emoji: '🧺', nombre: 'Cosechas', valor: 71 },
  { id: 'constancia', emoji: '🔥', nombre: 'Constancia', valor: 90 },
];

const ETAPAS = [
  { id: 'semilla', nombre: 'Semilla', hito: 'Sembró su primera mata', cuando: '2024' },
  { id: 'brote', nombre: 'Brote', hito: '5 matas y su primer compost', cuando: '2025' },
  { id: 'joven', nombre: 'Joven', hito: '3 cosechas y el agua cuidada', cuando: 'hoy' },
  { id: 'adulto', nombre: 'Adulto', hito: 'Cuatro años de constancia', cuando: 'en camino' },
];

/* Susurros del espíritu: qué pide la finca según su métrica más floja.
 * Es la voz del INDICADOR VIVO — consejo concreto, no decoración. */
const SUSURROS = {
  agua: 'El agua baja clara, pero el tanque quiere su cosecha de lluvia antes del verano.',
  suelo: 'Las raíces piden comida: la pila № 3 ya casi está lista para la huerta.',
  bio: 'Siembra más flores nativas y verás llegar abejas nuevas a la copa.',
  cosechas: 'Hay matas cargadas esperando canasto — salga a cosechar esta semana.',
  constancia: 'Volvió un día más. La finca lo siente, aunque no lo diga.',
};

/* Frutos y flores de la copa: [x, y, umbral-de-años/10, tipo] */
const FRUTOS = [
  [318, 352, 0, 'nar'], [468, 402, 0, 'cer'], [385, 300, 0.08, 'nar'], [508, 318, 0.14, 'cer'],
  [268, 408, 0.2, 'nar'], [432, 250, 0.26, 'cer'], [540, 422, 0.34, 'nar'], [352, 448, 0.4, 'cer'],
  [300, 258, 0.48, 'nar'], [492, 468, 0.55, 'cer'], [240, 350, 0.62, 'nar'], [560, 352, 0.7, 'cer'],
  [420, 480, 0.78, 'nar'], [345, 208, 0.86, 'cer'], [455, 178, 0.93, 'nar'],
];
const FLORES = [
  [297, 330, 0], [514, 356, 0], [362, 246, 0.1], [452, 292, 0.22],
  [255, 448, 0.36], [545, 460, 0.5], [400, 168, 0.66], [320, 500, 0.82],
];
/* Follaje: [cx, cy, rx, ry, tono 0-3, umbral] */
const FOLLAJE = [
  [400, 400, 172, 128, 0, 0], [292, 342, 108, 84, 1, 0], [512, 348, 104, 82, 1, 0],
  [352, 268, 92, 70, 2, 0], [462, 262, 88, 66, 2, 0], [258, 452, 84, 64, 1, 0],
  [546, 452, 84, 64, 1, 0], [402, 196, 78, 58, 3, 0],
  [222, 372, 66, 52, 2, 0.22], [582, 372, 66, 52, 2, 0.32],
  [318, 168, 60, 46, 3, 0.45], [488, 162, 60, 46, 3, 0.58],
  [400, 118, 62, 46, 3, 0.74], [198, 470, 56, 44, 1, 0.86],
];

const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/* ============================== CRIATURAS (SVG 100×100) ============================== */

function CriaturaChivito({ aura }) {
  return (
    <g className="avv-criatura avv-criatura-chivito">
      {aura && <circle cx="50" cy="48" r="44" className="avv-aura" />}
      <g className="avv-flota">
        <path d="M46 46 Q22 26 12 34 Q24 44 40 52 Z" fill="#79c98b" opacity=".9" className="avv-ala avv-ala-a" />
        <path d="M50 46 Q34 16 20 18 Q28 38 44 52 Z" fill="#9fdf9c" opacity=".85" className="avv-ala avv-ala-b" />
        <ellipse cx="52" cy="54" rx="17" ry="12" fill="url(#avv-iri)" />
        <path d="M62 46 Q78 52 66 62 Q58 66 52 62 Z" fill="#3f9a55" />
        <path d="M40 60 Q22 76 14 74 Q22 64 34 56 Z" fill="#2e7d46" />
        <circle cx="66" cy="44" r="8.5" fill="#4aa859" />
        <path d="M73 44 L96 41.5 L73 47 Z" fill="#2b3a2b" />
        <path d="M66 50 L72 66 L60 56 Z" fill="#f4fbe8" />
        <path d="M62 36 L66 28 L68 36 Z" fill="#e8f7d8" />
        <circle cx="68.5" cy="42.5" r="1.8" fill="#1c2a16" />
        <circle cx="69.2" cy="41.8" r=".6" fill="#fff" />
      </g>
    </g>
  );
}

function CriaturaRana({ aura }) {
  return (
    <g className="avv-criatura">
      {aura && <circle cx="50" cy="56" r="40" className="avv-aura" />}
      <g className="avv-respira">
        <ellipse cx="50" cy="64" rx="24" ry="17" fill="url(#avv-oro)" />
        <circle cx="50" cy="44" r="15" fill="url(#avv-oro)" />
        <circle cx="42" cy="38" r="6.5" fill="#f7d54e" />
        <circle cx="58" cy="38" r="6.5" fill="#f7d54e" />
        <circle cx="42" cy="38" r="3.4" fill="#1c2a16" />
        <circle cx="58" cy="38" r="3.4" fill="#1c2a16" />
        <circle cx="43.2" cy="36.8" r="1.1" fill="#fff" />
        <circle cx="59.2" cy="36.8" r="1.1" fill="#fff" />
        <path d="M43 50 Q50 54 57 50" stroke="#8a5a10" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <circle cx="38" cy="60" r="2.4" fill="#7a4c0e" opacity=".8" />
        <circle cx="55" cy="68" r="2.8" fill="#7a4c0e" opacity=".8" />
        <circle cx="63" cy="58" r="2" fill="#7a4c0e" opacity=".8" />
        <path d="M28 70 Q22 78 30 80 L38 76" fill="#eebc2e" />
        <path d="M72 70 Q78 78 70 80 L62 76" fill="#eebc2e" />
      </g>
    </g>
  );
}

function CriaturaAbeja({ aura }) {
  return (
    <g className="avv-criatura">
      {aura && <circle cx="50" cy="50" r="42" className="avv-aura" />}
      <g className="avv-flota">
        <ellipse cx="38" cy="34" rx="16" ry="9" fill="#dff3f7" opacity=".75" className="avv-ala avv-ala-a" />
        <ellipse cx="60" cy="32" rx="16" ry="9" fill="#eef9fb" opacity=".7" className="avv-ala avv-ala-b" />
        <ellipse cx="56" cy="56" rx="18" ry="13" fill="url(#avv-miel)" />
        <path d="M47 45 Q51 56 47 67 M56 44 Q60 56 56 68 M65 46 Q68 56 64 65" stroke="#5a3a10" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <circle cx="34" cy="52" r="10" fill="#3a2a14" />
        <circle cx="30.5" cy="49" r="2" fill="#fff" opacity=".85" />
        <path d="M28 44 Q22 36 16 34 M34 42 Q32 34 28 28" stroke="#3a2a14" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </g>
    </g>
  );
}

function CriaturaOso({ aura }) {
  return (
    <g className="avv-criatura">
      {aura && <circle cx="50" cy="54" r="46" className="avv-aura" />}
      <g className="avv-respira">
        <ellipse cx="50" cy="68" rx="26" ry="22" fill="#3b2f28" />
        <ellipse cx="50" cy="76" rx="14" ry="12" fill="#4d3d33" />
        <circle cx="50" cy="36" r="18" fill="#3b2f28" />
        <circle cx="37" cy="24" r="6" fill="#3b2f28" />
        <circle cx="63" cy="24" r="6" fill="#3b2f28" />
        <circle cx="37" cy="24" r="2.6" fill="#6b564a" />
        <circle cx="63" cy="24" r="2.6" fill="#6b564a" />
        <path d="M43 32 a6.5 6.5 0 1 0 0 .1 M57 32 a6.5 6.5 0 1 0 0 .1" fill="none" stroke="#efe0c2" strokeWidth="3.4" />
        <path d="M44 42 Q50 54 56 42 Q54 50 50 52 Q46 50 44 42" fill="#efe0c2" />
        <circle cx="43" cy="32" r="2.6" fill="#14100c" />
        <circle cx="57" cy="32" r="2.6" fill="#14100c" />
        <ellipse cx="50" cy="44" rx="7" ry="5.4" fill="#8a7360" />
        <ellipse cx="50" cy="42.6" rx="3" ry="2.2" fill="#14100c" />
        <ellipse cx="34" cy="86" rx="7" ry="4" fill="#2e2620" />
        <ellipse cx="66" cy="86" rx="7" ry="4" fill="#2e2620" />
      </g>
    </g>
  );
}

function CriaturaLombriz({ aura }) {
  return (
    <g className="avv-criatura">
      {aura && <circle cx="50" cy="52" r="44" className="avv-aura" />}
      <g className="avv-micelio-red">
        <path d="M20 78 Q10 66 14 52 M28 82 Q26 64 36 54 M76 80 Q88 70 86 54 M70 84 Q76 66 66 56" stroke="#f0e0b0" strokeWidth="1.4" fill="none" opacity=".9" />
        <circle cx="14" cy="52" r="2" fill="#f6ecc8" /><circle cx="36" cy="54" r="1.6" fill="#f6ecc8" />
        <circle cx="86" cy="54" r="2" fill="#f6ecc8" /><circle cx="66" cy="56" r="1.6" fill="#f6ecc8" />
      </g>
      <g className="avv-respira">
        <path d="M22 72 Q20 52 36 46 Q54 40 58 54 Q60 64 48 66 Q40 67 40 60" fill="none" stroke="url(#avv-lombriz)" strokeWidth="13" strokeLinecap="round" />
        <path d="M30 64 L36 62 M32 54 L38 55 M42 48 L44 54 M52 48 L52 54" stroke="#b56a52" strokeWidth="1.6" opacity=".7" />
        <circle cx="24" cy="68" r="2" fill="#1c2a16" />
        <circle cx="24.8" cy="67.2" r=".7" fill="#fff" />
        <path d="M58 54 Q70 50 74 40" stroke="#f0e0b0" strokeWidth="1.6" fill="none" />
        <circle cx="74" cy="40" r="2.4" fill="#f6ecc8" className="avv-brilla" />
      </g>
    </g>
  );
}

const CRIATURAS = {
  chivito: CriaturaChivito,
  rana: CriaturaRana,
  abeja: CriaturaAbeja,
  oso: CriaturaOso,
  lombriz: CriaturaLombriz,
};

/** Retrato de criatura para paneles y selector. */
function RetratoEspiritu({ especieId, aura = false, className = '' }) {
  const Criatura = CRIATURAS[especieId] || CriaturaChivito;
  return (
    <svg viewBox="0 0 100 100" className={`avv-retrato ${className}`} aria-hidden="true">
      <Criatura aura={aura} />
    </svg>
  );
}

/* Gradientes compartidos de las criaturas (se declaran una vez por <svg>). */
function DefsCriaturas() {
  return (
    <defs>
      <linearGradient id="avv-iri" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#7cc95d" />
        <stop offset=".55" stopColor="#3f9a55" />
        <stop offset="1" stopColor="#2b7d68" />
      </linearGradient>
      <radialGradient id="avv-oro" cx=".38" cy=".32" r="1">
        <stop offset="0" stopColor="#ffe98a" />
        <stop offset=".6" stopColor="#f2c23a" />
        <stop offset="1" stopColor="#cf9718" />
      </radialGradient>
      <radialGradient id="avv-miel" cx=".38" cy=".32" r="1">
        <stop offset="0" stopColor="#ffd98c" />
        <stop offset="1" stopColor="#d98f2b" />
      </radialGradient>
      <linearGradient id="avv-lombriz" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#d98a72" />
        <stop offset="1" stopColor="#b3543c" />
      </linearGradient>
    </defs>
  );
}

/* ============================== NODO DE MUNDO ============================== */

function NodoMundo({ mundo, seleccionado, onSelect, r = 26 }) {
  const [x, y] = mundo.nodo;
  return (
    <g
      className={`avv-nodo ${seleccionado ? 'avv-nodo-sel' : ''}`}
      transform={`translate(${x},${y})`}
      role="button"
      tabIndex={0}
      aria-label={`Mundo ${mundo.titulo}: ${mundo.lema}`}
      onClick={() => onSelect(mundo.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(mundo.id); } }}
    >
      <circle className="avv-nodo-halo" r={r + 9} />
      {/* núcleo separado del halo: el hover lo escala con resorte sin mover el halo */}
      <g className="avv-nodo-nucleo">
        <circle className="avv-nodo-cuerpo" r={r} />
        <circle className="avv-nodo-borde" r={r} />
        <text className="avv-nodo-emoji" y={r * 0.28} fontSize={r * 1.05} textAnchor="middle">{mundo.emoji}</text>
      </g>
      <g className="avv-nodo-tag" transform={`translate(0,${r + 17})`}>
        <text textAnchor="middle" className="avv-nodo-label">{mundo.titulo}</text>
      </g>
    </g>
  );
}

/* Mariposa sencilla: dos alas que baten (scaleX) y un cuerpo. La deriva por
 * la escena la pone el CSS; el transform del <g> exterior es el reposo para
 * prefers-reduced-motion. */
function Mariposa({ clase, reposo, tonoA, tonoB }) {
  return (
    <g className={`avv-mariposa ${clase}`} transform={reposo} aria-hidden="true">
      <ellipse className="avv-ala-mari avv-ala-mari-a" cx="-5" cy="-1.5" rx="5.6" ry="3.8" fill={tonoA} />
      <ellipse className="avv-ala-mari avv-ala-mari-b" cx="5" cy="-1.5" rx="5.6" ry="3.8" fill={tonoB} />
      <ellipse cx="0" cy="0" rx="1.3" ry="4.4" fill="#4a3320" />
    </g>
  );
}

/* ============================== ESCENA ============================== */

function EscenaOrganismo({ tn, especie, etapaIdx, mundoSel, onMundo, onAvatar }) {
  const s = 0.84 + 0.34 * tn; // crecimiento del organismo aéreo
  const Criatura = CRIATURAS[especie.id];
  const [ax, ay] = especie.anclaje;
  const kAvatar = especie.escala * (0.78 + 0.3 * tn);
  const aura = etapaIdx >= 3;
  const mundosRama = MUNDOS.filter((m) => m.zona === 'rama');
  const mundoClima = MUNDOS.find((m) => m.zona === 'sol');
  const mundoAgua = MUNDOS.find((m) => m.zona === 'agua');
  const mundosRaiz = MUNDOS.filter((m) => m.zona === 'raiz');
  const avatarAereo = especie.id === 'chivito' || especie.id === 'abeja';

  // En pantallas anchas (tablet/desktop) el anclaje YMax dejaba ver casi solo
  // subsuelo; centramos el encuadre para que el organismo completo respire.
  const [apaisada, setApaisada] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-aspect-ratio: 9/10)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-aspect-ratio: 9/10)');
    const onChange = (e) => setApaisada(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <svg
      className={`avv-escena ${mundoSel ? 'avv-escena-consel' : ''}`}
      viewBox="0 0 800 1160"
      preserveAspectRatio={apaisada ? 'xMidYMid slice' : 'xMidYMax slice'}
      aria-label={`Su finca convertida en organismo vivo a plena luz del día: un árbol frondoso cuyas ramas son los mundos, con frutos por cada cosecha, raíces doradas y un corazón-semilla latiendo bajo la tierra. Su espíritu guardián, ${especie.nombre.toLowerCase()}, vive en él.`}
    >
      <defs>
        <linearGradient id="avv-cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fd4c0" />
          <stop offset=".5" stopColor="#c5e9cd" />
          <stop offset="1" stopColor="#f2f8d9" />
        </linearGradient>
        <radialGradient id="avv-sol-g" cx=".42" cy=".4" r="1">
          <stop offset="0" stopColor="#fffbe6" />
          <stop offset=".55" stopColor="#ffe98a" />
          <stop offset="1" stopColor="#ffc84d" />
        </radialGradient>
        <radialGradient id="avv-sol-halo" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#fff3c0" stopOpacity=".9" />
          <stop offset="1" stopColor="#fff3c0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="avv-lomas" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fd05a" />
          <stop offset="1" stopColor="#57a453" />
        </linearGradient>
        <linearGradient id="avv-tierra" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6e4a2c" />
          <stop offset=".4" stopColor="#54371f" />
          <stop offset="1" stopColor="#33210f" />
        </linearGradient>
        <linearGradient id="avv-tronco" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#5c3d24" />
          <stop offset="1" stopColor="#7a5230" />
        </linearGradient>
        <radialGradient id="avv-corazon" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#fff8d8" />
          <stop offset=".4" stopColor="#ffe07a" stopOpacity=".85" />
          <stop offset="1" stopColor="#e8c87a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="avv-agua-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9adfe4" />
          <stop offset="1" stopColor="#5db9cb" />
        </linearGradient>
        <linearGradient id="avv-rayo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3c0" stopOpacity=".5" />
          <stop offset="1" stopColor="#fff3c0" stopOpacity="0" />
        </linearGradient>
        {/* follaje con volumen: luz desde el sol (arriba-derecha) */}
        <radialGradient id="avv-hoja-g0" cx=".62" cy=".28" r="1">
          <stop offset="0" stopColor="#5fbd60" /><stop offset="1" stopColor="#3b9146" />
        </radialGradient>
        <radialGradient id="avv-hoja-g1" cx=".62" cy=".28" r="1">
          <stop offset="0" stopColor="#70c76c" /><stop offset="1" stopColor="#489f4e" />
        </radialGradient>
        <radialGradient id="avv-hoja-g2" cx=".62" cy=".28" r="1">
          <stop offset="0" stopColor="#93d76a" /><stop offset="1" stopColor="#63b556" />
        </radialGradient>
        <radialGradient id="avv-hoja-g3" cx=".62" cy=".28" r="1">
          <stop offset="0" stopColor="#c0e981" /><stop offset="1" stopColor="#8ecd62" />
        </radialGradient>
        <filter id="avv-blur6"><feGaussianBlur stdDeviation="6" /></filter>
        <DefsCriaturas />
      </defs>

      {/* CIELO */}
      <rect width="800" height="760" fill="url(#avv-cielo)" />

      {/* SOL = mundo clima */}
      <g className="avv-sol-grupo">
        <circle cx="615" cy="128" r="118" fill="url(#avv-sol-halo)" />
        <g className="avv-sol-rayos">
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i * 30 * Math.PI) / 180;
            return (
              <line
                key={i}
                x1={615 + Math.cos(a) * 62} y1={128 + Math.sin(a) * 62}
                x2={615 + Math.cos(a) * (i % 2 ? 78 : 88)} y2={128 + Math.sin(a) * (i % 2 ? 78 : 88)}
                stroke="#ffdf7e" strokeWidth="5" strokeLinecap="round" opacity=".8"
              />
            );
          })}
        </g>
        <circle cx="615" cy="128" r="48" fill="url(#avv-sol-g)" className="avv-sol-nucleo" />
      </g>

      {/* HACES DE LUZ de la tarde: respiran al mismo pulso de la finca */}
      <g aria-hidden="true">
        <path d="M615,128 L282,700 L468,700 Z" fill="url(#avv-rayo)" className="avv-rayo-a" />
        <path d="M615,128 L500,720 L648,720 Z" fill="url(#avv-rayo)" className="avv-rayo-b" />
      </g>

      {/* NUBES */}
      <g className="avv-nube avv-nube-1" fill="#ffffff" opacity=".9">
        <ellipse cx="150" cy="108" rx="58" ry="20" />
        <ellipse cx="192" cy="94" rx="40" ry="16" />
        <ellipse cx="112" cy="96" rx="32" ry="13" />
      </g>
      <g className="avv-nube avv-nube-2" fill="#ffffff" opacity=".75">
        <ellipse cx="430" cy="70" rx="46" ry="15" />
        <ellipse cx="464" cy="59" rx="30" ry="12" />
      </g>
      <g className="avv-nube avv-nube-3" fill="#ffffff" opacity=".6">
        <ellipse cx="300" cy="170" rx="36" ry="11" />
        <ellipse cx="326" cy="162" rx="24" ry="9" />
      </g>

      {/* PÁJAROS */}
      <g className="avv-pajaros" stroke="#3f7a52" strokeWidth="2.4" fill="none" strokeLinecap="round">
        <path d="M210 210 q6 -7 12 0 q6 -7 12 0" />
        <path d="M252 190 q5 -6 10 0 q5 -6 10 0" opacity=".7" />
      </g>

      {/* CORDILLERA */}
      <path d="M0,505 Q130,432 258,472 Q360,502 470,458 Q600,408 800,488 L800,760 L0,760 Z" fill="#a8d8b4" opacity=".85" />
      {/* bruma cálida de media tarde entre cordilleras */}
      <rect x="-20" y="452" width="840" height="120" fill="#f2f8d9" opacity=".3" filter="url(#avv-blur6)" />
      <path d="M0,568 Q160,498 320,538 Q470,572 620,522 Q710,494 800,540 L800,760 L0,760 Z" fill="#7cbd7f" opacity=".95" />
      {/* frailejones del páramo lejano */}
      <g fill="#5a9a5e" opacity=".9">
        {[[92, 546], [130, 536], [560, 528], [610, 520], [672, 528]].map(([fx, fy], i) => (
          <g key={i} transform={`translate(${fx},${fy})`}>
            <rect x="-2.4" y="0" width="4.8" height="15" rx="2" fill="#7a6a3a" />
            <path d="M0,-3 L-9,3 L-3,4 L-11,10 L0,7 L11,10 L3,4 L9,3 Z" fill="#8fb96a" />
          </g>
        ))}
      </g>

      {/* LOMA CERCANA con retazos de cultivos */}
      <path d="M0,648 C130,600 260,580 400,580 C540,580 670,600 800,650 L800,790 L0,790 Z" fill="url(#avv-lomas)" />
      <g opacity=".55">
        <path d="M588,614 L648,606 L662,632 L600,642 Z" fill="#b9e678" />
        <path d="M652,606 L706,600 L724,626 L666,632 Z" fill="#e0c46a" />
        <path d="M604,644 L666,634 L678,660 L614,670 Z" fill="#79c26a" />
        <path d="M120,630 L180,622 L190,648 L128,657 Z" fill="#a5d95f" />
        <path d="M184,621 L238,615 L250,640 L194,647 Z" fill="#8fce8a" />
      </g>

      {/* CASA CAMPESINA */}
      <g transform="translate(636,560)">
        <rect x="0" y="18" width="58" height="36" rx="2" fill="#fbf6e8" stroke="#d8c9a8" strokeWidth="1.4" />
        <path d="M-7,20 L29,-4 L65,20 Z" fill="#c25b38" />
        <rect x="10" y="30" width="12" height="24" rx="1.4" fill="#8a5a38" />
        <rect x="34" y="30" width="13" height="12" rx="1.4" fill="#bfe3ee" stroke="#8a5a38" strokeWidth="1.2" />
        <path className="avv-humo" d="M48 -6 q-5 -8 1 -14 q5 -6 0 -13" stroke="#eef4e0" strokeWidth="4" fill="none" strokeLinecap="round" opacity=".8" />
      </g>

      {/* QUEBRADA (mundo agua) */}
      <g>
        <path d="M96,636 C110,668 118,690 128,712 C140,738 152,752 168,764 L120,776 C104,748 92,716 84,684 C80,666 82,650 96,636 Z" fill="url(#avv-agua-g)" opacity=".92" />
        <path className="avv-agua-brillo" d="M100,650 C112,684 124,716 146,752" stroke="#eafcff" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeDasharray="10 16" />
        <path className="avv-agua-brillo avv-agua-brillo-2" d="M112,662 C122,692 134,722 156,754" stroke="#eafcff" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="6 18" opacity=".7" />
      </g>
      {/* juncos a la orilla de la quebrada */}
      <g transform="translate(70,700)" aria-hidden="true">
        <g className="avv-mece-a">
          <path d="M2,0 Q0,-16 4,-30 M9,2 Q9,-14 6,-26 M15,0 Q18,-12 16,-24" stroke="#3f8f46" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <ellipse cx="4.6" cy="-31" rx="2.6" ry="6" fill="#7a5230" />
          <ellipse cx="16" cy="-25" rx="2.2" ry="5" fill="#8a5a38" />
        </g>
      </g>


      {/* ============ EL ORGANISMO (crece con el tiempo) ============ */}
      <g transform={`translate(400,712) scale(${s}) translate(-400,-712)`}>
        {/* sombra fresca bajo la copa (crece con el árbol) */}
        <ellipse cx="400" cy="708" rx="164" ry="22" fill="#1d5c2a" opacity=".14" />
        {/* ramas */}
        <g stroke="#6b4526" fill="none" strokeLinecap="round">
          <path d="M400,540 C400,470 400,330 400,262" strokeWidth="20" />
          <path d="M398,470 C340,430 286,368 248,314" strokeWidth="15" />
          <path d="M402,470 C460,430 514,368 552,314" strokeWidth="15" />
          <path d="M396,540 C320,516 246,480 202,450" strokeWidth="13" />
          <path d="M404,540 C480,516 554,480 598,450" strokeWidth="13" />
          <path d="M394,590 C330,586 280,572 254,562" strokeWidth="11" />
          <path d="M406,590 C470,586 520,572 546,562" strokeWidth="11" />
        </g>
        {/* tronco */}
        <path d="M378,716 C380,640 372,560 366,470 C388,486 412,486 434,470 C428,560 420,640 422,716 Q400,726 378,716 Z" fill="url(#avv-tronco)" />
        <path d="M398,700 C390,646 408,592 393,540 C387,516 399,494 396,478" className="avv-savia" stroke="#d3f296" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeDasharray="5 13" opacity=".55" />
        <path d="M366,470 C388,486 412,486 434,470" fill="none" stroke="#4a2f1a" strokeWidth="2" opacity=".4" />
        {/* vetas y musgo del tronco */}
        <path d="M386,690 C384,630 383,570 386,510 M414,688 C416,634 417,576 414,516" stroke="#4a2f1a" strokeWidth="1.6" fill="none" opacity=".35" />
        <ellipse cx="382" cy="664" rx="9" ry="16" fill="#57a453" opacity=".5" />

        {/* copa */}
        <g className="avv-copa">
          {FOLLAJE.filter((f) => tn >= f[5]).map(([cx, cy, rx, ry, tono], i) => (
            <ellipse
              key={i}
              className={`avv-hoja avv-hoja-t${tono} ${i % 2 ? 'avv-mece-b' : 'avv-mece-a'}`}
              cx={cx} cy={cy}
              rx={rx * (0.86 + 0.2 * tn)} ry={ry * (0.86 + 0.2 * tn)}
            />
          ))}
          {/* penumbra bajo la copa: volumen */}
          <g fill="#2e7a3c" opacity=".24">
            <ellipse cx="330" cy="472" rx="92" ry="34" className="avv-mece-a" />
            <ellipse cx="472" cy="468" rx="88" ry="32" className="avv-mece-b" />
          </g>
          {/* brillos de luz sobre el follaje (lado del sol) */}
          <g fill="#d3f296" opacity=".55">
            {[[338, 296], [478, 274], [292, 386], [528, 394], [412, 214], [368, 426]].map(([bx, by], i) => (
              <ellipse key={i} cx={bx} cy={by} rx="26" ry="10" className={i % 2 ? 'avv-mece-a' : 'avv-mece-b'} />
            ))}
          </g>
          {/* resplandor que late al pulso del corazón-semilla */}
          <ellipse cx="400" cy="368" rx="158" ry="112" fill="#d3f296" className="avv-copa-latido" />
        </g>

        {/* enredaderas colgando de la copa */}
        <g stroke="#57a453" strokeWidth="2" fill="none" aria-hidden="true">
          <g transform="translate(238,468)">
            <g className="avv-cuelga">
              <path d="M0,0 Q4,16 0,30 Q-3,42 2,54" />
              <ellipse cx="3" cy="14" rx="4.6" ry="2.6" fill="#7cc95d" stroke="none" transform="rotate(28 3 14)" />
              <ellipse cx="-2" cy="34" rx="4.2" ry="2.4" fill="#57b45f" stroke="none" transform="rotate(-24 -2 34)" />
              <ellipse cx="3" cy="52" rx="3.8" ry="2.2" fill="#7cc95d" stroke="none" transform="rotate(20 3 52)" />
            </g>
          </g>
          <g transform="translate(566,462)">
            <g className="avv-cuelga avv-cuelga-b">
              <path d="M0,0 Q-4,14 0,28 Q3,40 -2,50" />
              <ellipse cx="-3" cy="12" rx="4.4" ry="2.5" fill="#a9e070" stroke="none" transform="rotate(-26 -3 12)" />
              <ellipse cx="2" cy="32" rx="4" ry="2.3" fill="#57b45f" stroke="none" transform="rotate(22 2 32)" />
            </g>
          </g>
        </g>

        {/* flores */}
        {FLORES.filter((f) => tn >= f[2]).map(([fx, fy], i) => (
          <g key={i} transform={`translate(${fx},${fy})`} className="avv-flor">
            {[0, 72, 144, 216, 288].map((rot) => (
              <ellipse key={rot} cx="0" cy="-6.5" rx="3.4" ry="6" fill="#fdf1f7" transform={`rotate(${rot})`} />
            ))}
            <circle r="3.4" fill="#f2b93c" />
          </g>
        ))}

        {/* frutos = cosechas: naranjas y pepas de café maduras */}
        {FRUTOS.filter((f) => tn >= f[2]).map(([fx, fy, , tipo], i) => (
          <g key={i} transform={`translate(${fx},${fy})`} className="avv-fruto" style={{ animationDelay: `${(i % 5) * 0.07}s` }}>
            {tipo === 'nar' ? (
              <>
                <circle r="9" fill="#f09c2e" />
                <circle r="9" fill="#fff" opacity=".22" cx="-2.6" cy="-2.8" />
                <path d="M0,-8 Q3,-13 7,-13" stroke="#3f7a3f" strokeWidth="2" fill="none" />
                <ellipse cx="5" cy="-11" rx="3.4" ry="1.8" fill="#57a453" transform="rotate(26 5 -11)" />
              </>
            ) : (
              <>
                <path d="M-3,-7 Q0,-12 4,-9" stroke="#3f7a3f" strokeWidth="1.8" fill="none" />
                <circle cx="-3.2" cy="0.4" r="5.4" fill="#d9482e" />
                <circle cx="3.8" cy="1.8" r="4.9" fill="#c22f22" />
                <circle cx="-4.6" cy="-1.4" r="1.7" fill="#fff" opacity=".45" />
                <circle cx="2.6" cy="0.2" r="1.3" fill="#fff" opacity=".35" />
              </>
            )}
          </g>
        ))}

        {/* nodos de mundos en las ramas */}
        {mundosRama.map((m) => (
          <NodoMundo key={m.id} mundo={m} seleccionado={mundoSel === m.id} onSelect={onMundo} r={m.id === 'cultivos' ? 30 : 25} />
        ))}
      </g>

      {/* polen / motas de luz (tamaños variados) */}
      <g fill="#fdf6c8">
        {[[240, 560, 0, 3], [340, 500, 1, 2.2], [470, 530, 2, 3.4], [560, 590, 3, 2.4], [300, 620, 4, 3], [520, 480, 5, 2], [420, 640, 6, 2.8], [200, 500, 7, 2.2], [610, 540, 8, 2.6]].map(([px, py, d, rr]) => (
          <circle key={d} cx={px} cy={py} r={rr} className="avv-mota" style={{ animationDelay: `${Number(d) * -1.7}s` }} />
        ))}
      </g>

      {/* MARIPOSAS rondando la copa y el pasto */}
      <Mariposa clase="avv-mariposa-1" reposo="translate(238,520)" tonoA="#f2a33c" tonoB="#f6bd58" />
      <Mariposa clase="avv-mariposa-2" reposo="translate(562,500)" tonoA="#fdf1f7" tonoB="#f7dceb" />

      {/* ============ EL SUBSUELO ============ */}
      <path d="M0,790 C140,752 260,712 400,712 C540,712 660,752 800,790 L800,1160 L0,1160 Z" fill="url(#avv-tierra)" />
      <path d="M0,790 C140,752 260,712 400,712 C540,712 660,752 800,790" fill="none" stroke="#2e6b34" strokeWidth="9" />
      <path d="M0,790 C140,752 260,712 400,712 C540,712 660,752 800,790" fill="none" stroke="#8fd05a" strokeWidth="3" opacity=".8" />

      {/* pasto y flores silvestres sobre el filo de la tierra */}
      <g aria-hidden="true">
        {[[58, 776], [148, 753], [236, 726], [318, 711], [482, 712], [566, 728], [654, 750], [744, 774]].map(([gx, gy], i) => (
          <g key={i} transform={`translate(${gx},${gy})`}>
            <g className={i % 2 ? 'avv-mece-b' : 'avv-mece-a'}>
              <path d="M0,0 Q-6,-9 -9,-17 M0,0 Q-1,-11 2,-19 M0,0 Q5,-8 9,-15" stroke={i % 3 ? '#3f8f46' : '#57a453'} strokeWidth="2.4" fill="none" strokeLinecap="round" />
              {i % 3 === 0 && (
                <g transform="translate(6,-17)">
                  <circle r="3" fill="#fdf1f7" />
                  <circle r="1.3" fill="#f2b93c" />
                </g>
              )}
            </g>
          </g>
        ))}
      </g>

      {/* raíces doradas */}
      <g stroke="#c9a35e" fill="none" strokeLinecap="round" opacity=".95">
        <path d="M388,724 C360,790 344,850 358,912" strokeWidth="9" />
        <path d="M412,724 C440,790 458,844 448,908" strokeWidth="9" />
        <path d="M400,730 C400,800 398,860 400,916" strokeWidth="7" />
        <path d="M378,760 C320,800 284,842 272,884" strokeWidth="6" />
        <path d="M422,760 C480,800 518,842 530,884" strokeWidth="6" />
        <path d="M360,850 C320,872 296,896 288,920" strokeWidth="4" />
        <path d="M446,856 C490,878 512,900 518,922" strokeWidth="4" />
      </g>

      {/* red de micelio */}
      <g className="avv-micelio" stroke="#f0e0b0" strokeWidth="1.6" fill="none" opacity=".8">
        <path d="M356,914 C300,940 220,952 140,944" strokeDasharray="5 9" />
        <path d="M448,910 C520,942 600,954 680,942" strokeDasharray="5 9" />
        <path d="M400,918 C380,980 330,1020 250,1036" strokeDasharray="5 9" />
        <path d="M402,920 C430,986 490,1024 570,1038" strokeDasharray="5 9" />
        <path d="M288,922 C260,970 220,1000 160,1012" strokeDasharray="4 10" opacity=".7" />
        <path d="M518,924 C548,972 590,1002 648,1014" strokeDasharray="4 10" opacity=".7" />
      </g>
      <g fill="#f6ecc8">
        {[[140, 944], [680, 942], [250, 1036], [570, 1038], [160, 1012], [648, 1014]].map(([mx, my], i) => (
          <circle key={i} cx={mx} cy={my} r="3" className="avv-brilla" style={{ animationDelay: `${i * -1.3}s` }} />
        ))}
      </g>

      {/* corazón-semilla */}
      <g transform="translate(400,930)">
        <circle r="64" fill="url(#avv-corazon)" className="avv-late-halo" />
        <g className="avv-late">
          <path d="M0,-26 C16,-14 18,8 6,22 Q0,28 -6,22 C-18,8 -16,-14 0,-26 Z" fill="#ffe07a" stroke="#e8b93c" strokeWidth="2.4" />
          <path d="M0,-18 C0,-4 0,10 0,20" stroke="#c98f1e" strokeWidth="2" opacity=".7" />
          <path d="M0,-26 C-4,-38 -14,-44 -24,-44 M0,-26 C4,-38 14,-44 24,-44" stroke="#8fd05a" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        </g>
        {/* chispas orbitando el corazón */}
        <g className="avv-orbita" aria-hidden="true">
          <circle cx="0" cy="-48" r="2.6" fill="#fff3c0" />
          <circle cx="34" cy="30" r="1.8" fill="#ffe98a" />
        </g>
        <g className="avv-orbita avv-orbita-inv" aria-hidden="true">
          <circle cx="0" cy="42" r="2" fill="#fff3c0" />
        </g>
      </g>

      {/* bichitos del suelo */}
      <g opacity=".9">
        <circle cx="212" cy="860" r="3.4" fill="#caa15e" />
        <circle cx="222" cy="864" r="3" fill="#caa15e" />
        <circle cx="596" cy="984" r="3.2" fill="#caa15e" />
        <path d="M640,868 q10,-6 20,0 q-10,6 -20,0" fill="#b56a52" />
      </g>
      <g fill="#4a3320" opacity=".8">
        {[[160, 850], [330, 1000], [470, 1060], [620, 920], [90, 1000], [710, 1060], [260, 1090]].map(([rx, ry], i) => (
          <ellipse key={i} cx={rx} cy={ry} rx="9" ry="5" />
        ))}
      </g>

      {/* nodos de mundos: sol, agua y raíces */}
      {mundoClima && <NodoMundo mundo={mundoClima} seleccionado={mundoSel === mundoClima.id} onSelect={onMundo} r={24} />}
      {mundoAgua && <NodoMundo mundo={mundoAgua} seleccionado={mundoSel === mundoAgua.id} onSelect={onMundo} r={24} />}
      {mundosRaiz.map((m) => (
        <NodoMundo key={m.id} mundo={m} seleccionado={mundoSel === m.id} onSelect={onMundo} r={24} />
      ))}

      {/* ============ EL ESPÍRITU (avatar) ============ */}
      <g
        key={especie.id}
        className={`avv-avatar ${avatarAereo ? 'avv-avatar-aereo' : ''}`}
        transform={`translate(${ax - 50 * kAvatar},${ay - 50 * kAvatar}) scale(${kAvatar})`}
        role="button"
        tabIndex={0}
        aria-label={`Tu espíritu, ${especie.nombre}. Tócalo para ver su salud.`}
        onClick={onAvatar}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAvatar(); } }}
      >
        {!avatarAereo && especie.id !== 'lombriz' && (
          <ellipse cx="50" cy="94" rx="27" ry="6" fill="#1d5c2a" opacity=".2" />
        )}
        <Criatura aura={aura} />
      </g>

      {/* velo de luz frontal */}
      <path d="M560,0 L800,0 L800,240 Z" fill="#fff8d0" opacity=".18" filter="url(#avv-blur6)" />
    </svg>
  );
}

/* ============================== PANEL DEL ESPÍRITU ============================== */

function PanelEspiritu({ especie, etapaIdx, salud, saludGlobal, estado, anillos, años, susurro, onCambiar, onCerrar }) {
  const circunferencia = 2 * Math.PI * 27;
  return (
    <aside className="avv-panel" aria-label="Panel del espíritu de la finca">
      <button type="button" className="avv-panel-cerrar" onClick={onCerrar} aria-label="Cerrar panel del espíritu">✕</button>
      <header className="avv-panel-head">
        <div className="avv-panel-retrato">
          <RetratoEspiritu especieId={especie.id} aura={etapaIdx >= 3} />
        </div>
        <div>
          <p className="avv-panel-eyebrow">Tu espíritu guardián</p>
          <h2 className="avv-panel-nombre">{especie.nombre}</h2>
          <p className="avv-panel-etapa">
            Etapa: <strong>{ETAPAS[etapaIdx].nombre}</strong>
            {años > 0 && <span className="avv-proy-chip"> proyección +{años.toFixed(0)} años</span>}
          </p>
        </div>
      </header>

      <div className="avv-salud-global">
        <div className="avv-salud-gauge" data-estado={estado.toLowerCase()}>
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r="27" className="avv-gauge-pista" />
            <circle
              cx="32" cy="32" r="27"
              className="avv-gauge-arco"
              strokeDasharray={`${(saludGlobal / 100) * circunferencia} ${circunferencia}`}
            />
          </svg>
          <span className="avv-salud-num">{saludGlobal}</span>
        </div>
        <div>
          <p className="avv-salud-estado">🌿 {estado}</p>
          <p className="avv-salud-nota">La salud del espíritu es la salud real de tu finca</p>
        </div>
      </div>

      <div className="avv-susurro">
        <span className="avv-susurro-icono" aria-hidden="true">🌬️</span>
        <p><strong>El espíritu susurra: </strong>{susurro}</p>
      </div>

      <section aria-label="Salud de la finca">
        <h3 className="avv-panel-sub">Lo que lo alimenta</h3>
        <ul className="avv-metros">
          {salud.map((m) => (
            <li key={m.id} className="avv-metro">
              <span className="avv-metro-icono" aria-hidden="true">{m.emoji}</span>
              <span className="avv-metro-nombre">{m.nombre}</span>
              <span className="avv-metro-barra">
                <span className="avv-metro-lleno" style={{ width: `${m.proyectado}%` }} />
                {m.proyectado > m.valor && (
                  <span className="avv-metro-base" style={{ left: `${m.valor}%` }} />
                )}
              </span>
              <span className="avv-metro-valor">
                {m.proyectado}
                {m.proyectado > m.valor && <em className="avv-metro-delta">+{m.proyectado - m.valor}</em>}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Evolución del espíritu">
        <h3 className="avv-panel-sub">Su evolución</h3>
        <ol className="avv-etapas">
          {ETAPAS.map((e, i) => (
            <li key={e.id} className={`avv-etapa ${i < etapaIdx ? 'avv-etapa-hecha' : ''} ${i === etapaIdx ? 'avv-etapa-actual' : ''}`}>
              <span className="avv-etapa-punto" aria-hidden="true">{i < etapaIdx ? '✓' : i === etapaIdx ? '●' : ''}</span>
              <span className="avv-etapa-texto">
                <strong>{e.nombre}</strong> — {e.hito}
                <em>{i === etapaIdx ? (años > 0 ? `proyectado ${AÑO_HOY + Math.ceil(años)}` : 'hoy') : e.cuando}</em>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="avv-anillos-sec" aria-label="Anillos del frailejón">
        <svg viewBox="0 0 84 84" className="avv-anillos" aria-hidden="true">
          {Array.from({ length: anillos }, (_, i) => (
            <circle key={i} cx="42" cy="42" r={6 + i * (32 / Math.max(anillos, 8))} fill="none" stroke={i % 2 ? '#8fd05a' : '#57a453'} strokeWidth="2.2" opacity={Math.max(0.25, 0.9 - i * 0.045)} />
          ))}
          <circle cx="42" cy="42" r="3.4" fill="#e8b93c" />
        </svg>
        <p><strong>{anillos} anillos del frailejón</strong><br />Un anillo por cada temporada cuidando esta tierra.</p>
      </section>

      <button type="button" className="avv-btn avv-btn-suave" onClick={onCambiar}>
        Cambiar de espíritu
      </button>
    </aside>
  );
}

/* ============================== SELECTOR DE ESPECIE ============================== */

function SelectorEspecie({ actual, onElegir, onCerrar }) {
  return (
    <div className="avv-modal-fondo" role="dialog" aria-modal="true" aria-label="Elegir el espíritu de tu finca">
      <div className="avv-modal">
        <button type="button" className="avv-panel-cerrar" onClick={onCerrar} aria-label="Cerrar selector">✕</button>
        <p className="avv-panel-eyebrow">Especies nativas de Colombia</p>
        <h2 className="avv-modal-titulo">¿Quién guarda tu finca?</h2>
        <p className="avv-modal-sub">
          Elige tu espíritu. Cada especie cuenta una parte de la salud de tu tierra —
          y crece contigo, de semilla a adulto.
        </p>
        <ul className="avv-especies">
          {ESPECIES.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                className={`avv-especie ${actual === e.id ? 'avv-especie-sel' : ''}`}
                onClick={() => onElegir(e.id)}
              >
                <span className="avv-especie-retrato"><RetratoEspiritu especieId={e.id} /></span>
                <span className="avv-especie-info">
                  <strong>{e.nombre}</strong>
                  <i>{e.cientifico}</i>
                  <span className="avv-especie-eje">{e.emoji} {e.eje}</span>
                  <span className="avv-especie-habitat">{e.habitat}</span>
                </span>
                {actual === e.id && <span className="avv-especie-check" aria-hidden="true">✓</span>}
              </button>
            </li>
          ))}
        </ul>
        <p className="avv-modal-nota">Puedes cambiar de espíritu cuando quieras: su progreso se conserva.</p>
      </div>
    </div>
  );
}

/* ============================== TARJETA DE MUNDO ============================== */

function TarjetaMundo({ mundo, onCerrar }) {
  return (
    <div className="avv-mundo-card" role="dialog" aria-label={`Mundo ${mundo.titulo}`}>
      <button type="button" className="avv-panel-cerrar" onClick={onCerrar} aria-label="Cerrar tarjeta de mundo">✕</button>
      <div className="avv-mundo-head">
        <span className="avv-mundo-emoji" aria-hidden="true">{mundo.emoji}</span>
        <div>
          <h3>{mundo.titulo}</h3>
          <p className="avv-mundo-vinculo">{mundo.vinculo}</p>
        </div>
      </div>
      <p className="avv-mundo-lema">{mundo.lema}</p>
      <div className="avv-mundo-chips">
        {mundo.chips.map((c) => <span key={c} className="avv-chip">{c}</span>)}
      </div>
      <button type="button" className="avv-btn avv-btn-fuerte">Entrar al mundo →</button>
    </div>
  );
}

/* ============================== PANTALLA ============================== */

/**
 * @param {{ onBack?: () => void }} props
 */
export default function AvatarGameVerdeVivo({ onBack }) {
  const [años, setAños] = useState(0);
  const [especieId, setEspecieId] = useState('chivito');
  const [mundoSel, setMundoSel] = useState(/** @type {string|null} */(null));
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [panelAbierto, setPanelAbierto] = useState(true);

  // Mientras el mockup vive, el espíritu REEMPLAZA al colibrí: ocultamos el
  // FAB del agente para que no flote encima de la escena.
  useEffect(() => {
    document.body.classList.add('avv-mockup-abierto');
    return () => document.body.classList.remove('avv-mockup-abierto');
  }, []);

  const tn = clamp01(años / 10);
  const especie = ESPECIES.find((e) => e.id === especieId) || ESPECIES[0];
  const etapaIdx = años >= 4 ? 3 : 2;
  const anillos = 4 + Math.round(años * 1.2);
  const salud = useMemo(
    () => SALUD_BASE.map((m) => ({ ...m, proyectado: Math.min(97, Math.round(lerp(m.valor, 96, 0.62 * tn))) })),
    [tn],
  );
  const saludGlobal = Math.round(salud.reduce((acc, m) => acc + m.proyectado, 0) / salud.length);
  const estado = saludGlobal >= 85 ? 'Exuberante' : saludGlobal >= 70 ? 'Floreciendo' : saludGlobal >= 50 ? 'Despertando' : 'Marchito';
  // El susurro del espíritu: lo que la finca más pide (su métrica más floja).
  const metricaFloja = salud.reduce((min, m) => (m.proyectado < min.proyectado ? m : min), salud[0]);
  const susurro = SUSURROS[metricaFloja.id];
  const mundo = MUNDOS.find((m) => m.id === mundoSel) || null;
  const volver = onBack || (() => { window.location.hash = ''; });

  return (
    <div className="avv-root" data-mockup="avatar-verde-vivo">
      <EscenaOrganismo
        tn={tn}
        especie={especie}
        etapaIdx={etapaIdx}
        mundoSel={mundoSel}
        onMundo={(id) => setMundoSel((prev) => (prev === id ? null : id))}
        onAvatar={() => setPanelAbierto(true)}
      />

      {/* Velo dorado del futuro: crece con la proyección (solo opacity, GPU) */}
      <div className="avv-velo-futuro" style={{ opacity: tn * 0.26 }} aria-hidden="true" />

      {/* CABEZOTE */}
      <header className="avv-cabezote">
        <button type="button" className="avv-volver" onClick={volver} aria-label="Volver al inicio">←</button>
        <div>
          <p className="avv-eyebrow">Mockup · Verde vivo · 2ª pasada</p>
          <h1 className="avv-titulo">El espíritu de tu finca</h1>
          <p className="avv-subtitulo">Finca La Esperanza · Choachí, 2.650 msnm</p>
        </div>
        <div className="avv-cabezote-chips">
          <span className="avv-chip avv-chip-vivo">🌿 {estado} · {saludGlobal}</span>
          <span className="avv-chip">☀️ 19° · Día despejado</span>
        </div>
      </header>

      {/* TARJETA DE MUNDO SELECCIONADO */}
      {mundo && <TarjetaMundo mundo={mundo} onCerrar={() => setMundoSel(null)} />}

      {/* PANEL DEL ESPÍRITU */}
      {panelAbierto && (
        <PanelEspiritu
          especie={especie}
          etapaIdx={etapaIdx}
          salud={salud}
          saludGlobal={saludGlobal}
          estado={estado}
          anillos={anillos}
          años={años}
          susurro={susurro}
          onCambiar={() => setSelectorAbierto(true)}
          onCerrar={() => setPanelAbierto(false)}
        />
      )}

      {/* MUELLE INFERIOR: el tiempo de la finca */}
      <footer className="avv-muelle">
        {!panelAbierto && !mundo && (
          <button type="button" className="avv-btn avv-btn-suave avv-btn-panel" onClick={() => setPanelAbierto(true)}>
            {especie.emoji} Mi espíritu
          </button>
        )}
        <div className="avv-tiempo">
          <div className="avv-tiempo-head">
            <span className="avv-tiempo-titulo">El tiempo de tu finca</span>
            <span className="avv-tiempo-lectura">
              {años < 0.1 ? `Hoy · ${AÑO_HOY}` : `Así se verá en ${AÑO_HOY + Math.round(años)} si la sigues cuidando`}
            </span>
          </div>
          <input
            type="range"
            min="0" max="10" step="0.1"
            value={años}
            onChange={(e) => setAños(Number(e.target.value))}
            className="avv-tiempo-slider"
            aria-label="Ver la finca crecer hasta 10 años en el futuro"
            style={{ '--avv-t': `${tn * 100}%` }}
          />
          <div className="avv-tiempo-marcas" aria-hidden="true">
            <span>Hoy</span><span>+5 años</span><span>+10 años</span>
          </div>
        </div>
      </footer>

      {/* SELECTOR DE ESPECIE */}
      {selectorAbierto && (
        <SelectorEspecie
          actual={especieId}
          onElegir={(id) => { setEspecieId(id); setSelectorAbierto(false); }}
          onCerrar={() => setSelectorAbierto(false)}
        />
      )}
    </div>
  );
}
