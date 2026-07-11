// Mockup "El onboarding es SEMBRAR su finca" (moonshot #7) — datos de muestra.
//
// Tesis: el primer uso del campesino no es un formulario frío, es una SIEMBRA.
// Una sola escena SVG persistente que evoluciona con cada respuesta:
//
//   1. LA TIERRA  — el croquis de la finca se dibuja solo, a tinta sobre papel
//                   (técnica de auto-dibujado de SceneTrazoMinimal: pathLength
//                   normalizado + stroke-dashoffset por etapas os-t1…os-t7).
//                   El único dato: cómo le decimos. El letrero se rotula en vivo.
//   2. SU CLIMA   — elige qué tan arriba queda su tierra (páramo / fría /
//                   templada / caliente, lenguaje campesino real) y EL COLOR
//                   LLEGA: la escena se tiñe con el grade de luz de su piso
//                   térmico (paleta por piso del mockup Montaña de los Mundos).
//   3. LA SIEMBRA — escoge hasta dos maticas propias de su piso; la semilla
//                   cae al surco y la mata brota con sobrepaso (receta
//                   fv-grow-in de FincaWorldScene).
//   4. FINCA VIVA — la escena respira (vida ambiental: colibrí, mariposas,
//                   humo, sol que late) y lo saluda: "Lista su finca, don…".
//
// Reglas de la casa que se respetan: solo transform/opacity animados, SVG
// rsvg-safe (sin emoji en <text>), transform de posición en <g> externo y
// animación en <g> interno, prefers-reduced-motion = fotograma final digno,
// un dato por paso, copy usted-cordial colombiano.
//
// Ruta #/mockups/onboarding-siembra — sin gate ni sesión. NO escribe datos.
import React, { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import './onboarding-siembra.css';

// ── Datos de muestra (mockup): pisos térmicos en lenguaje campesino ─────────
const PISOS = [
  {
    id: 'paramo',
    nombre: 'Tierra fría de páramo',
    detalle: 'Bien arriba, donde llega la niebla y crecen los frailejones.',
  },
  {
    id: 'frio',
    nombre: 'Tierra fría',
    detalle: 'Clima de ruana: por ahí entre los 2.000 y 3.000 metros.',
  },
  {
    id: 'templado',
    nombre: 'Tierra templada',
    detalle: 'Ni frío ni calor: tierra de café, entre 1.000 y 2.000 metros.',
  },
  {
    id: 'calido',
    nombre: 'Tierra caliente',
    detalle: 'Abajo, hacia el valle y el río: plátano, yuca y buen sol.',
  },
];

// Emoji fuera del SVG (regla rsvg-safe): solo en los chips HTML.
const CULTIVOS = {
  papa: { nombre: 'Papa', emoji: '🥔' },
  haba: { nombre: 'Haba', emoji: '🫛' },
  cebolla: { nombre: 'Cebolla junca', emoji: '🧅' },
  maiz: { nombre: 'Maíz', emoji: '🌽' },
  fresa: { nombre: 'Fresa', emoji: '🍓' },
  cafe: { nombre: 'Café', emoji: '☕' },
  frijol: { nombre: 'Frijol', emoji: '🫘' },
  platano: { nombre: 'Plátano', emoji: '🍌' },
  yuca: { nombre: 'Yuca', emoji: '🍠' },
};

// Qué se da bien en cada piso (muestra didáctica, no catálogo exhaustivo).
const CULTIVOS_POR_PISO = {
  paramo: ['papa', 'haba', 'cebolla'],
  frio: ['papa', 'maiz', 'fresa'],
  templado: ['cafe', 'frijol', 'maiz'],
  calido: ['platano', 'yuca', 'maiz'],
};

const PASOS = ['tierra', 'clima', 'siembra', 'viva'];

// ── Maticas SVG (trazo de cuaderno + un plano de color) ─────────────────────
// Cada mata vive en un viewBox local ~60×70 con la base en y=70 (el surco).
// El <g> externo posiciona; el interno (os-mata) anima el brote.
function MataSvg({ tipo }) {
  switch (tipo) {
    case 'papa':
      return (
        <g>
          <path className="os-hoja" d="M30 70 C28 56 26 46 24 38 M30 70 C31 54 33 46 36 36 M30 70 C30 58 30 50 30 42" />
          <ellipse className="os-follaje" cx="23" cy="36" rx="7" ry="5" />
          <ellipse className="os-follaje" cx="37" cy="34" rx="7" ry="5" />
          <ellipse className="os-follaje" cx="30" cy="40" rx="8" ry="6" />
          <circle className="os-flor" cx="24" cy="30" r="2.4" />
          <circle className="os-flor" cx="36" cy="28" r="2.4" />
        </g>
      );
    case 'haba':
      return (
        <g>
          <path className="os-hoja" d="M30 70 C30 55 30 44 30 32" />
          <path className="os-hoja" d="M30 52 C24 50 20 46 19 42 M30 44 C36 42 40 38 41 34" />
          <ellipse className="os-follaje" cx="19" cy="41" rx="5" ry="3.6" />
          <ellipse className="os-follaje" cx="41" cy="33" rx="5" ry="3.6" />
          <ellipse className="os-follaje" cx="30" cy="29" rx="5.5" ry="4" />
          <path className="os-vaina" d="M26 58 C24 62 25 66 28 67 M35 55 C37 59 36 63 33 64" />
        </g>
      );
    case 'cebolla':
      return (
        <g>
          <path className="os-hoja" d="M30 70 C27 54 24 44 21 34 M30 70 C29 52 28 42 27 30 M30 70 C31 52 32 42 33 30 M30 70 C33 54 36 44 39 34" />
          <path className="os-brote-tinta" d="M25 68 C27 70 33 70 35 68" />
        </g>
      );
    case 'maiz':
      return (
        <g>
          <path className="os-hoja" d="M30 70 C30 50 30 32 30 16" />
          <path className="os-hoja" d="M30 56 C22 52 16 46 14 40 M30 48 C38 44 44 38 46 32 M30 38 C24 34 20 30 18 24" />
          <path className="os-espiga" d="M30 16 C28 10 27 6 26 3 M30 16 C30 9 30 6 30 2 M30 16 C32 10 33 6 34 3" />
          <ellipse className="os-mazorca" cx="36" cy="46" rx="3.4" ry="7" transform="rotate(14 36 46)" />
        </g>
      );
    case 'fresa':
      return (
        <g>
          <path className="os-hoja" d="M30 70 C26 64 22 60 18 58 M30 70 C34 64 38 60 42 58 M30 70 C30 62 30 56 30 52" />
          <ellipse className="os-follaje" cx="18" cy="56" rx="6" ry="4" />
          <ellipse className="os-follaje" cx="42" cy="56" rx="6" ry="4" />
          <ellipse className="os-follaje" cx="30" cy="50" rx="6.5" ry="4.5" />
          <path className="os-fruto" d="M25 62 C25 66 27 69 29 69 C31 69 33 66 33 62 C33 60 31 59 29 59 C27 59 25 60 25 62 Z" />
        </g>
      );
    case 'cafe':
      return (
        <g>
          <path className="os-hoja" d="M30 70 C30 56 30 44 30 34" />
          <path className="os-hoja" d="M30 60 C23 58 18 54 16 50 M30 52 C37 50 42 46 44 42 M30 44 C25 42 21 39 19 35" />
          <ellipse className="os-follaje os-follaje-oscuro" cx="16" cy="49" rx="6" ry="4" />
          <ellipse className="os-follaje os-follaje-oscuro" cx="44" cy="41" rx="6" ry="4" />
          <ellipse className="os-follaje os-follaje-oscuro" cx="20" cy="34" rx="5.5" ry="4" />
          <ellipse className="os-follaje os-follaje-oscuro" cx="30" cy="29" rx="6" ry="4.5" />
          <circle className="os-fruto" cx="26" cy="56" r="2.2" />
          <circle className="os-fruto" cx="33" cy="49" r="2.2" />
          <circle className="os-fruto" cx="29" cy="52" r="2.2" />
        </g>
      );
    case 'frijol':
      return (
        <g>
          {/* La vara (tutor) y la enredadera que le da vuelta */}
          <path className="os-vara" d="M30 70 L30 18" />
          <path className="os-hoja" d="M30 68 C22 62 38 56 30 50 C22 44 38 38 30 32 C26 28 32 26 30 22" />
          <ellipse className="os-follaje" cx="22" cy="58" rx="5" ry="3.8" />
          <ellipse className="os-follaje" cx="38" cy="46" rx="5" ry="3.8" />
          <ellipse className="os-follaje" cx="24" cy="34" rx="5" ry="3.8" />
          <path className="os-vaina" d="M34 58 C36 62 35 66 32 67" />
        </g>
      );
    case 'platano':
      return (
        <g>
          <path className="os-tronco" d="M28 70 C28 56 28 44 29 34 M33 70 C33 56 33 44 32 34" />
          <path className="os-hoja-grande" d="M30 34 C18 28 8 30 4 38 C14 38 24 36 30 34 Z" />
          <path className="os-hoja-grande" d="M30 34 C42 28 52 30 56 38 C46 38 36 36 30 34 Z" />
          <path className="os-hoja-grande" d="M30 34 C24 24 22 16 26 8 C32 16 32 26 30 34 Z" />
          <path className="os-hoja-grande" d="M30 34 C38 26 44 20 44 12 C36 18 32 26 30 34 Z" />
        </g>
      );
    case 'yuca':
      return (
        <g>
          <path className="os-hoja" d="M30 70 C29 56 28 44 27 34 M30 70 C32 56 34 44 36 36" />
          <path className="os-hoja" d="M27 34 C22 30 18 27 15 26 M27 34 C26 28 26 24 26 20 M27 34 C31 29 34 26 37 24 M36 36 C40 32 44 30 47 29 M36 36 C37 30 38 26 39 23" />
          <ellipse className="os-follaje" cx="15" cy="25" rx="4" ry="2.6" transform="rotate(-24 15 25)" />
          <ellipse className="os-follaje" cx="26" cy="19" rx="4" ry="2.6" transform="rotate(-80 26 19)" />
          <ellipse className="os-follaje" cx="38" cy="23" rx="4" ry="2.6" transform="rotate(28 38 23)" />
          <ellipse className="os-follaje" cx="47" cy="28" rx="4" ry="2.6" transform="rotate(40 47 28)" />
          <ellipse className="os-follaje" cx="39" cy="22" rx="4" ry="2.6" transform="rotate(60 39 22)" />
        </g>
      );
    default:
      return null;
  }
}

// Una mata sembrada en su surco: la semilla cae y la mata brota.
function MataSembrada({ tipo, x, y, escala = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${escala})`}>
      <circle className="os-semilla" cx="30" cy="0" r="3" />
      <g className="os-mata" transform="translate(-30 -70)">
        <MataSvg tipo={tipo} />
      </g>
    </g>
  );
}

// ── Progreso: cuatro semillitas que van germinando (nada de "paso 1 de 4") ──
function SemillaProgreso({ estado }) {
  // estado: 'pendiente' | 'actual' | 'hecha'
  return (
    <svg className={`os-prog-semilla os-prog-${estado}`} viewBox="0 0 24 24" aria-hidden="true">
      <circle className="os-prog-grano" cx="12" cy="16" r="4" />
      {estado !== 'pendiente' && (
        <path className="os-prog-brote" pathLength="1" d="M12 14 C12 10 12 8 12 6 M12 9 C10 8 8.5 7 8 5.5 M12 7.5 C14 6.5 15.5 5.5 16 4" />
      )}
    </svg>
  );
}

// ── La escena: UNA finca que se dibuja, se tiñe, brota y vive ────────────────
// El tinte por piso lo maneja `data-piso` en el root (variables CSS), así que
// la escena solo necesita saber el paso, el letrero y lo sembrado.
function EscenaFinca({ paso, nombreLetrero, sembrados }) {
  // Dos surcos delanteros para hasta dos maticas.
  const puestos = [
    { x: 150, y: 372, escala: 1.05 },
    { x: 258, y: 388, escala: 1.15 },
  ];
  return (
    <svg
      className="os-escena"
      viewBox="0 0 390 430"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Croquis de su finca que se va sembrando paso a paso"
    >
      {/* ── Capa de color: llega cuando el campesino elige su clima ── */}
      <g className="os-color">
        <rect className="os-cielo" x="0" y="0" width="390" height="430" />
        {/* Sol (en páramo queda velado por la niebla) */}
        <g transform="translate(316 78)">
          <g className="os-sol">
            <circle className="os-sol-halo" r="34" />
            <circle className="os-sol-disco" r="21" />
          </g>
        </g>
        {/* Lomas del fondo (perspectiva aérea: más pálidas) */}
        <path className="os-loma-fondo" d="M0 258 C60 232 120 240 180 226 C250 210 320 228 390 214 L390 430 L0 430 Z" />
        {/* La loma principal */}
        <path className="os-loma" d="M0 312 C70 284 140 296 205 276 C275 254 330 272 390 258 L390 430 L0 430 Z" />
        {/* Techo y pared de la casa */}
        <path className="os-techo" d="M236 208 L268 184 L300 208 Z" />
        <rect className="os-pared" x="243" y="208" width="50" height="34" />
        {/* Copa del árbol */}
        <ellipse className="os-copa" cx="64" cy="196" rx="34" ry="26" />
        {/* Franja de tierra preparada (las eras) */}
        <path className="os-tierra-era" d="M40 356 C120 344 270 344 358 356 L358 412 C270 424 120 424 40 412 Z" />
        {/* Niebla de páramo (solo se ve en ese piso) */}
        <g className="os-niebla">
          <ellipse className="os-niebla-banco" cx="110" cy="250" rx="130" ry="22" />
          <ellipse className="os-niebla-banco os-niebla-2" cx="300" cy="216" rx="120" ry="18" />
        </g>
        {/* Frailejones (firma del páramo) */}
        <g className="os-frailejones">
          <g transform="translate(340 292)">
            <path className="os-frailejon-tronco" d="M0 0 L0 -18" />
            <path className="os-frailejon-hojas" d="M0 -18 C-8 -22 -12 -28 -12 -32 M0 -18 C-3 -26 -4 -32 -3 -36 M0 -18 C3 -26 4 -32 3 -36 M0 -18 C8 -22 12 -28 12 -32" />
          </g>
          <g transform="translate(368 306) scale(0.8)">
            <path className="os-frailejon-tronco" d="M0 0 L0 -18" />
            <path className="os-frailejon-hojas" d="M0 -18 C-8 -22 -12 -28 -12 -32 M0 -18 C-3 -26 -4 -32 -3 -36 M0 -18 C3 -26 4 -32 3 -36 M0 -18 C8 -22 12 -28 12 -32" />
          </g>
        </g>
      </g>

      {/* ── Capa de tinta: el croquis que se dibuja solo (paso 1) ── */}
      <g className="os-tinta">
        {/* t1 — el horizonte: la loma de la finca */}
        <path className="os-trazo os-t1" pathLength="1" d="M0 312 C70 284 140 296 205 276 C275 254 330 272 390 258" />
        {/* t2 — las lomas del fondo */}
        <path className="os-trazo os-t2" pathLength="1" d="M0 258 C60 232 120 240 180 226 C250 210 320 228 390 214" />
        {/* t3 — la casa campesina: techo, pared, puerta, ventana y chimenea */}
        <g className="os-trazo os-t3-g">
          <path className="os-trazo os-t3" pathLength="1" d="M232 210 L268 182 L304 210 M243 208 L243 242 L293 242 L293 208" />
          <path className="os-trazo os-t3b" pathLength="1" d="M262 242 L262 224 L276 224 L276 242 M250 218 L258 218 M284 190 L284 176 L290 176 L290 196" />
        </g>
        {/* t4 — el árbol de garabato */}
        <g className="os-trazo os-t4-g">
          <path className="os-trazo os-t4" pathLength="1" d="M62 242 C62 230 60 222 60 214 M60 214 C44 216 32 206 36 194 C26 188 34 172 48 174 C50 162 72 158 82 168 C96 166 102 182 92 190 C100 200 86 212 74 208 C72 212 66 214 60 214" />
        </g>
        {/* t5 — la cerca de palos */}
        <path className="os-trazo os-t5" pathLength="1" d="M18 330 L18 300 M58 326 L58 296 M98 322 L98 294 M14 310 C42 304 72 302 102 300 M14 322 C42 316 72 314 102 312" />
        {/* t6 — el camino que baja de la casa */}
        <path className="os-trazo os-t6" pathLength="1" d="M262 244 C240 268 218 284 206 306 C196 324 198 336 194 352 M276 244 C262 272 246 292 234 314 C226 330 228 340 226 352" />
        {/* t7 — las eras: surcos listos para sembrar */}
        <path className="os-trazo os-t7" pathLength="1" d="M52 368 C130 356 262 356 346 368 M46 388 C130 374 266 374 352 388 M52 408 C134 394 262 394 348 408" />
        {/* El letrero: se clava cuando el campesino dice su nombre */}
        <g transform="translate(60 344)">
          <g className={`os-letrero ${nombreLetrero ? 'os-letrero-visible' : ''}`}>
            <path className="os-trazo-fino" d="M0 22 L0 -2" />
            <rect className="os-letrero-tabla" x="-42" y="-30" width="84" height="26" rx="4" />
            <text className="os-letrero-texto" x="0" y="-12" textAnchor="middle">
              {nombreLetrero || ''}
            </text>
          </g>
        </g>
      </g>

      {/* ── Las maticas sembradas (paso 3) ── */}
      <g className="os-siembra">
        {sembrados.map((tipo, i) => (
          <MataSembrada key={tipo} tipo={tipo} x={puestos[i].x} y={puestos[i].y} escala={puestos[i].escala} />
        ))}
      </g>

      {/* ── Vida ambiental: solo cuando la finca ya está viva (paso 4) ── */}
      {paso === 'viva' && (
        <g className="os-vida">
          {/* Humo de la chimenea */}
          <g transform="translate(287 172)">
            <circle className="os-humo os-humo-1" r="3" />
            <circle className="os-humo os-humo-2" r="4" />
            <circle className="os-humo os-humo-3" r="5" />
          </g>
          {/* El colibrí de trazo, con su punto dorado en la garganta */}
          <g transform="translate(120 200)">
            <g className="os-colibri">
              <path className="os-colibri-cuerpo" d="M0 0 C6 -4 14 -4 18 0 C14 4 8 5 2 3 C-4 6 -10 6 -14 3 C-10 1 -5 0 0 0 M18 0 L26 -2" />
              <path className="os-colibri-ala" d="M4 -2 C0 -12 8 -18 14 -14 C12 -8 8 -4 4 -2 Z" />
              <circle className="os-colibri-garganta" cx="16" cy="0" r="2" />
            </g>
          </g>
          {/* Dos mariposas que derivan */}
          <g transform="translate(90 300)">
            <g className="os-mariposa os-mariposa-1">
              <path className="os-mariposa-alas" d="M0 0 C-5 -6 -10 -4 -8 1 C-10 6 -5 8 0 2 C5 8 10 6 8 1 C10 -4 5 -6 0 0 Z" />
            </g>
          </g>
          <g transform="translate(310 340)">
            <g className="os-mariposa os-mariposa-2">
              <path className="os-mariposa-alas" d="M0 0 C-5 -6 -10 -4 -8 1 C-10 6 -5 8 0 2 C5 8 10 6 8 1 C10 -4 5 -6 0 0 Z" />
            </g>
          </g>
        </g>
      )}
    </svg>
  );
}

// ── El flujo: cuatro momentos de siembra, un dato a la vez ──────────────────
export default function OnboardingSiembra({ onBack }) {
  const [pasoIdx, setPasoIdx] = useState(0);
  const [trato, setTrato] = useState('don');
  const [nombre, setNombre] = useState('');
  const [piso, setPiso] = useState(null);
  const [sembrados, setSembrados] = useState([]);

  const paso = PASOS[pasoIdx];
  const nombreLimpio = nombre.trim();
  const tratoMayus = trato === 'dona' ? 'Doña' : 'Don';
  const nombreLetrero = nombreLimpio ? `${tratoMayus} ${nombreLimpio}` : '';

  const opcionesCultivo = useMemo(
    () => (piso ? CULTIVOS_POR_PISO[piso] : []),
    [piso]
  );

  const toggleCultivo = (id) => {
    setSembrados((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length >= 2) return prev; // máximo dos maticas en el mockup
      return [...prev, id];
    });
  };

  const nombresSembrados = sembrados.map((id) => CULTIVOS[id].nombre.toLowerCase());
  const fraseSembrados =
    nombresSembrados.length === 2
      ? `Su ${nombresSembrados[0]} y su ${nombresSembrados[1]} ya están en la tierra.`
      : nombresSembrados.length === 1
        ? `Su ${nombresSembrados[0]} ya está en la tierra.`
        : '';

  const avanzar = () => setPasoIdx((i) => Math.min(i + 1, PASOS.length - 1));
  const retroceder = () => {
    if (pasoIdx === 0) {
      if (onBack) onBack();
      return;
    }
    setPasoIdx((i) => i - 1);
  };

  return (
    <div className="os-root" data-paso={paso} data-piso={piso || 'ninguno'}>
      <header className="os-topbar">
        <button type="button" className="os-atras" onClick={retroceder} aria-label="Volver">
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <div className="os-progreso" aria-label={`Va en el paso ${pasoIdx + 1} de 4`}>
          {PASOS.map((p, i) => (
            <SemillaProgreso
              key={p}
              estado={i < pasoIdx ? 'hecha' : i === pasoIdx ? 'actual' : 'pendiente'}
            />
          ))}
        </div>
        <span className="os-badge">Mockup · datos de muestra</span>
      </header>

      <div className="os-escenario">
        <EscenaFinca paso={paso} nombreLetrero={nombreLetrero} sembrados={sembrados} />
      </div>

      {/* La tarjeta de cuaderno: una sola pregunta a la vez */}
      <section className="os-tarjeta" key={paso}>
        {paso === 'tierra' && (
          <>
            <p className="os-kicker">Primero, la tierra</p>
            <h1 className="os-pregunta">Mire: su tierra ya se está dibujando. ¿Cómo le decimos a usted?</h1>
            <div className="os-trato" role="group" aria-label="Cómo le decimos">
              <button
                type="button"
                className={`os-trato-btn ${trato === 'don' ? 'os-activo' : ''}`}
                onClick={() => setTrato('don')}
              >
                Don
              </button>
              <button
                type="button"
                className={`os-trato-btn ${trato === 'dona' ? 'os-activo' : ''}`}
                onClick={() => setTrato('dona')}
              >
                Doña
              </button>
            </div>
            <input
              className="os-input"
              type="text"
              inputMode="text"
              autoComplete="off"
              maxLength={24}
              placeholder="Su nombre, por ejemplo: Aurelio"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              aria-label="Su nombre"
            />
            <button type="button" className="os-boton" disabled={!nombreLimpio} onClick={avanzar}>
              Esta es mi tierra
            </button>
          </>
        )}

        {paso === 'clima' && (
          <>
            <p className="os-kicker">Ahora, su clima</p>
            <h1 className="os-pregunta">¿Qué tan arriba queda su tierra, {tratoMayus.toLowerCase()} {nombreLimpio}?</h1>
            <div className="os-pisos" role="group" aria-label="Su piso térmico">
              {PISOS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`os-piso-btn ${piso === p.id ? 'os-activo' : ''}`}
                  onClick={() => {
                    setPiso(p.id);
                    setSembrados([]); // si cambia de clima, la siembra empieza de nuevo
                  }}
                >
                  <span className="os-piso-nombre">{p.nombre}</span>
                  <span className="os-piso-detalle">{p.detalle}</span>
                </button>
              ))}
            </div>
            <button type="button" className="os-boton" disabled={!piso} onClick={avanzar}>
              Así es mi clima
            </button>
          </>
        )}

        {paso === 'siembra' && (
          <>
            <p className="os-kicker">La siembra</p>
            <h1 className="os-pregunta">¿Qué quiere sembrar primero? Escoja una o dos maticas.</h1>
            <div className="os-cultivos" role="group" aria-label="Maticas para sembrar">
              {opcionesCultivo.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`os-cultivo-chip ${sembrados.includes(id) ? 'os-activo' : ''}`}
                  onClick={() => toggleCultivo(id)}
                  disabled={!sembrados.includes(id) && sembrados.length >= 2}
                >
                  <span className="os-cultivo-emoji" aria-hidden="true">{CULTIVOS[id].emoji}</span>
                  {CULTIVOS[id].nombre}
                </button>
              ))}
            </div>
            <p className="os-nota">Toque una matica y mire cómo brota en su era.</p>
            <button type="button" className="os-boton" disabled={sembrados.length === 0} onClick={avanzar}>
              Ya sembré
            </button>
          </>
        )}

        {paso === 'viva' && (
          <>
            <p className="os-kicker">Su finca está viva</p>
            <h1 className="os-pregunta os-saludo">
              Lista su finca, {tratoMayus.toLowerCase()} {nombreLimpio}.
            </h1>
            <p className="os-nota os-nota-final">
              {fraseSembrados} De ahora en adelante la cuidamos juntos: usted pone la mano, nosotros la memoria.
            </p>
            <button type="button" className="os-boton" onClick={onBack}>
              Entrar a mi finca
            </button>
          </>
        )}
      </section>
    </div>
  );
}
