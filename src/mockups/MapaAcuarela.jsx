// Mockup dev "El croquis de la finca como acuarela viva" — MOONSHOT #5.
//
// Reemplaza la idea de mapa "de ingeniero" (cuadrículas frías, tiles, capas
// GIS) por el croquis que un campesino dibujaría en su cuaderno de campo:
// lavados de acuarela sobre papel kraft, tinta sepia encima, el lindero
// cosido con la puntada de la marca (LA COSTURA, §6 del catálogo) y los
// lotes que LATEN suavecito según su salud:
//
//   verde vivo  → sana        → late tranquilo (5.2s, el pulso de la casa
//                               --fvo-beat de SceneFincaOrganismo)
//   ocre        → pide cuidado → late corto y superficial
//   punto rojo  → alerta      → pulso rápido + anillos que se expanden
//
// Técnica acuarela SIN costo por frame (regla de la casa: blur/filtros
// ESTÁTICOS, solo transform/opacity animados):
//   - feTurbulence + feDisplacementMap por forma → borde irregular de
//     pincel. El filtro rasteriza UNA vez.
//   - El latido anima opacity/scale del <g> PADRE de la forma filtrada
//     (compositing barato, el filtro no se re-evalúa).
//   - Sangrado (bleed) = la misma silueta con stroke gordo translúcido y
//     desplazamiento más bravo; charco de borde = stroke fino más oscuro.
//
// Datos 100% de muestra (finca fría de muestra, sin gate ni sesión).
// Ruta: #/mockups/mapa-acuarela. Reusa del catálogo 2026-07-10: pulso
// compartido, costura, velo de hora dorada + viñeta, vida ambiental
// (mariposa, humo), reduced-motion = fotograma digno, hit-areas generosas.

import React, { useState } from 'react';
import './mapa-acuarela.css';

// ---------------------------------------------------------------------------
// Datos de muestra: qué cuenta cada sitio cuando se toca.
// Formato campesino: "Lote 2 · Maíz y frijol · 65 días · Pide agua".
// ---------------------------------------------------------------------------
const SITIOS = {
  l1: {
    titulo: 'Lote 1 · Papa pastusa',
    meta: '42 días de sembrada',
    estado: 'Va bien',
    salud: 'sana',
    nota: 'El follaje va parejo y sin señas de gota. Siga con el riego como viene.',
  },
  l2: {
    titulo: 'Lote 2 · Maíz y frijol',
    meta: '65 días de sembrada',
    estado: 'Pide agua',
    salud: 'estres',
    nota: 'La milpa lleva 8 días sin lluvia. Riegue esta semana, antes de que abra flor.',
  },
  l3: {
    titulo: 'Lote 3 · Huerta casera',
    meta: '20 días de sembrada',
    estado: 'Va bien',
    salud: 'sana',
    nota: 'Cilantro y cebolla emparejados. En unos días toca un deshierbe suave.',
  },
  l4: {
    titulo: 'Lote 4 · Café con plátano',
    meta: '3 años de sembrado',
    estado: 'Necesita su visita',
    salud: 'alerta',
    nota: 'Se observó broca en la esquina de la quebrada. Recoja los frutos del suelo y revise las trampas.',
  },
  l5: {
    titulo: 'Lote 5 · Potrero en descanso',
    meta: '90 días descansando',
    estado: 'Va bien',
    salud: 'sana',
    nota: 'El pasto se está recuperando. En unas dos semanas puede volver a rotar la vaca.',
  },
  agua: {
    titulo: 'Nacimiento de agua',
    meta: 'Protegido con bosque',
    estado: 'Vivo',
    salud: 'sana',
    nota: 'El bosquecito que lo rodea lo mantiene fresco. De aquí baja la quebrada que riega la finca.',
  },
  casa: {
    titulo: 'La casa',
    meta: 'El corazón de la finca',
    estado: 'En orden',
    salud: 'sana',
    nota: 'Desde el corredor se ve todo el croquis. Aquí llega la cosecha y se toman las decisiones.',
  },
};

const ESTADO_LABEL = {
  sana: 'Va bien',
  estres: 'Pide cuidado',
  alerta: 'Necesita su visita',
};

// Helper de accesibilidad: cada sitio del croquis se comporta como botón
// (tap con dedo embarrado + Enter/Espacio con teclado). Hit-area = la
// silueta completa del lote (>>48px, regla de la casa).
function sitioProps(id, sel, setSel) {
  return {
    role: 'button',
    tabIndex: 0,
    'aria-label': `${SITIOS[id].titulo}. ${SITIOS[id].meta}. ${SITIOS[id].estado}.`,
    'aria-pressed': sel === id,
    onClick: () => setSel((prev) => (prev === id ? null : id)),
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setSel((prev) => (prev === id ? null : id));
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Siluetas orgánicas de los lotes (béziers suaves; el feDisplacementMap les
// pone el temblor de pincel, así que los paths se mantienen simples).
// ---------------------------------------------------------------------------
const FORMA = {
  l1: 'M48,80 C70,52 150,48 178,70 C196,86 192,140 176,160 C150,182 78,180 56,162 C38,146 36,100 48,80 Z',
  l2: 'M46,215 C70,195 152,193 174,212 C190,228 188,290 172,306 C148,324 72,322 54,306 C38,290 36,236 46,215 Z',
  l3: 'M212,98 C232,80 282,78 296,96 C308,112 306,160 292,176 C272,192 228,190 214,174 C202,158 202,116 212,98 Z',
  l4: 'M46,362 C72,342 150,340 170,360 C186,376 184,462 168,478 C144,494 72,492 54,476 C40,460 38,384 46,362 Z',
  l5: 'M248,358 C270,340 316,340 330,358 C342,374 340,462 326,476 C306,490 262,488 250,474 C238,458 238,378 248,358 Z',
  patio: 'M186,222 C200,210 246,210 258,224 C266,236 264,288 254,298 C240,308 200,306 190,296 C180,284 178,236 186,222 Z',
  pozo: 'M306,60 C314,52 336,52 342,62 C348,72 346,86 338,92 C328,98 310,96 304,88 C298,80 300,66 306,60 Z',
};

// Un lote acuarela completo: sangrado + cuerpo + charco de borde + velo de
// vida que late. El grupo exterior posiciona/recibe el tap; la animación
// vive en grupos internos (regla de la casa: transform externo, animación
// interna — si no, la animación pisa el transform y el dibujo salta).
function LoteAcuarela({ id, salud, grad, sel, setSel, children }) {
  return (
    <g
      className={`acq-lote${sel === id ? ' es-sel' : ''}`}
      data-salud={salud}
      {...sitioProps(id, sel, setSel)}
    >
      {/* Sangrado: la aguada se sale del trazo (borde deshilachado). */}
      <path className="acq-sangrado" d={FORMA[id]} filter="url(#acq-borde-bravo)" style={{ stroke: `var(--acq-${grad}-claro)` }} />
      {/* Cuerpo del lavado. */}
      <path className="acq-cuerpo" d={FORMA[id]} fill={`url(#acq-g-${grad})`} filter="url(#acq-borde)" />
      {/* Charco: el pigmento se acumula en el borde al secar. */}
      <path className="acq-charco" d={FORMA[id]} filter="url(#acq-borde)" style={{ stroke: `var(--acq-${grad}-hondo)` }} />
      {/* Velo de vida: ESTE es el que late (opacity/scale del <g>). */}
      <g className="acq-vida-late">
        <path className="acq-vida" d={FORMA[id]} filter="url(#acq-borde)" />
      </g>
      {/* Marcas de tinta del cultivo + rótulo (encima del lavado). */}
      {children}
    </g>
  );
}

// Rótulo de cuaderno: numerito en circulito de tinta + nombre corto.
function Rotulo({ x, y, n, texto }) {
  return (
    <g className="acq-rotulo" aria-hidden="true">
      <circle cx={x} cy={y} r="9" className="acq-rotulo-aro" />
      <text x={x} y={y + 4} textAnchor="middle" className="acq-rotulo-n">{n}</text>
      <text x={x + 14} y={y + 4} className="acq-rotulo-txt">{texto}</text>
    </g>
  );
}

// Arbolito de tinta con copa acuarela (se riega por el croquis).
function Arbolito({ x, y, s = 1, tono = 'verde' }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} aria-hidden="true">
      <path className="acq-copa" d="M0,-14 C-11,-14 -15,-4 -9,1 C-13,7 -4,12 1,9 C8,13 15,6 11,0 C16,-7 9,-15 0,-14 Z" fill={`url(#acq-g-${tono})`} filter="url(#acq-borde)" />
      <path className="acq-tinta" d="M0,10 L0,-2 M0,2 L-4,-3 M0,4 L4,-1" />
    </g>
  );
}

// Vaquita de tinta (potrero) — dos trazos, cuaderno puro.
function Vaquita({ x, y }) {
  return (
    <g className="acq-tinta" transform={`translate(${x} ${y})`} aria-hidden="true">
      <path d="M0,0 C2,-6 16,-6 18,0 C18,4 16,7 14,7 L14,11 M4,7 L4,11 M9,7 L9,11 M16,7 L16,11 M0,0 C-3,-1 -4,2 -2,4 M18,-2 C21,-4 24,-2 23,1 C22,3 20,3 19,2" />
      <path d="M23,1 C24,2 24,3 23,3" />
    </g>
  );
}

export default function MapaAcuarela({ onBack }) {
  const [sel, setSel] = useState(null);
  const ficha = sel ? SITIOS[sel] : null;

  return (
    <div className="acq" data-sel={sel || 'ninguno'}>
      {/* ---------- Cabecera de cuaderno ---------- */}
      <header className="acq-cabecera">
        <button type="button" className="acq-volver" onClick={onBack} aria-label="Volver al inicio">←</button>
        <div>
          <p className="acq-ceja">Cuaderno de campo · datos de muestra</p>
          <h1 className="acq-titulo">El croquis de su finca</h1>
          <p className="acq-sub">Finca de muestra · Vereda San Isidro · 2.650 msnm</p>
        </div>
      </header>

      {/* ---------- La hoja del croquis ---------- */}
      <div className="acq-hoja">
        <svg
          className="acq-svg"
          viewBox="0 0 390 540"
          role="img"
          aria-label="Croquis en acuarela de la finca de muestra: cinco lotes, la casa, el nacimiento de agua y la quebrada. Cada lote se puede tocar."
        >
          <defs>
            {/* Bordes de pincel: turbulencia + desplazamiento, ESTÁTICOS. */}
            <filter id="acq-borde" x="-12%" y="-12%" width="124%" height="124%">
              <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="7" result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale="9" />
            </filter>
            <filter id="acq-borde-bravo" x="-18%" y="-18%" width="136%" height="136%">
              <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="3" seed="31" result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale="18" />
            </filter>
            <filter id="acq-tiembla" x="-8%" y="-8%" width="116%" height="116%">
              <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="11" result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" />
            </filter>
            {/* Grano del papel (una pasada, opacidad bajita). */}
            <filter id="acq-grano">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="g" />
              <feColorMatrix in="g" type="matrix" values="0 0 0 0 0.42  0 0 0 0 0.35  0 0 0 0 0.24  0 0 0 0.5 0" />
              <feComposite operator="in" in2="SourceGraphic" />
            </filter>
            {/* Aguadas: más pigmento al centro, agua en el borde. */}
            <radialGradient id="acq-g-verde" cx="42%" cy="38%" r="75%">
              <stop offset="0%" stopColor="#a9cf86" />
              <stop offset="70%" stopColor="#7fae62" />
              <stop offset="100%" stopColor="#63955a" />
            </radialGradient>
            <radialGradient id="acq-g-pasto" cx="45%" cy="40%" r="75%">
              <stop offset="0%" stopColor="#c3d795" />
              <stop offset="100%" stopColor="#8fab63" />
            </radialGradient>
            <radialGradient id="acq-g-ocre" cx="45%" cy="38%" r="75%">
              <stop offset="0%" stopColor="#e3b56e" />
              <stop offset="100%" stopColor="#b9824a" />
            </radialGradient>
            <radialGradient id="acq-g-cafe" cx="45%" cy="40%" r="78%">
              <stop offset="0%" stopColor="#96bd74" />
              <stop offset="100%" stopColor="#5f8b4f" />
            </radialGradient>
            <radialGradient id="acq-g-agua" cx="45%" cy="40%" r="75%">
              <stop offset="0%" stopColor="#b8d9e4" />
              <stop offset="100%" stopColor="#79b0c5" />
            </radialGradient>
            <radialGradient id="acq-g-patio" cx="48%" cy="42%" r="75%">
              <stop offset="0%" stopColor="#ecd6ae" />
              <stop offset="100%" stopColor="#d6b988" />
            </radialGradient>
          </defs>

          {/* Grano de papel sobre toda la hoja. */}
          <rect x="0" y="0" width="390" height="540" className="acq-grano" filter="url(#acq-grano)" />

          {/* Lindero: la finca va COSIDA al papel (puntada de la marca). */}
          <path
            className="acq-lindero"
            d="M30,44 C110,26 288,28 360,42 C372,120 374,420 358,506 C270,524 112,522 32,508 C18,420 16,128 30,44 Z"
            filter="url(#acq-tiembla)"
          />

          {/* Norte de mano alzada. */}
          <g className="acq-tinta acq-norte" transform="translate(46 68)" aria-hidden="true">
            <path d="M0,10 L0,-8 M0,-8 L-4,-1 M0,-8 L4,-1" />
            <text x="0" y="24" textAnchor="middle" className="acq-rotulo-txt">N</text>
          </g>

          {/* Quebrada: baja del nacimiento por el costado derecho. */}
          <g className="acq-quebrada" aria-hidden="true">
            <path id="acq-q" className="acq-quebrada-agua" d="M322,86 C332,130 314,190 326,240 C338,290 318,360 334,420 C342,458 348,490 344,524" filter="url(#acq-borde)" />
            <path className="acq-quebrada-flujo" d="M322,86 C332,130 314,190 326,240 C338,290 318,360 334,420 C342,458 348,490 344,524" />
          </g>

          {/* Camino de tierra: de la casa al portón. */}
          <path className="acq-camino" d="M216,298 C208,340 228,380 214,420 C202,456 214,494 206,534" filter="url(#acq-borde)" aria-hidden="true" />
          <path className="acq-camino-huella" d="M216,298 C208,340 228,380 214,420 C202,456 214,494 206,534" aria-hidden="true" />
          {/* Portón: dos postes de tinta. */}
          <g className="acq-tinta" aria-hidden="true">
            <path d="M192,522 L192,534 M222,522 L222,534" />
          </g>

          {/* ---------- Lote 1 · papa (sana) ---------- */}
          <LoteAcuarela id="l1" salud="sana" grad="verde" sel={sel} setSel={setSel}>
            <g className="acq-tinta" aria-hidden="true">
              <path d="M66,96 C96,88 140,88 164,96 M62,118 C96,109 142,109 168,118 M62,140 C96,131 142,131 168,140 M70,160 C98,153 136,153 158,160" />
            </g>
            <Rotulo x={78} y={76} n="1" texto="Papa" />
          </LoteAcuarela>

          {/* ---------- Lote 3 · huerta (sana) ---------- */}
          <LoteAcuarela id="l3" salud="sana" grad="pasto" sel={sel} setSel={setSel}>
            <g className="acq-tinta" aria-hidden="true">
              <path d="M222,116 L286,116 M222,134 L286,134 M222,152 L286,152 M226,168 L280,168" strokeDasharray="1.5 6" />
            </g>
            <Rotulo x={232} y={98} n="3" texto="Huerta" />
          </LoteAcuarela>

          {/* ---------- Lote 2 · milpa (estrés hídrico → ocre) ---------- */}
          <LoteAcuarela id="l2" salud="estres" grad="ocre" sel={sel} setSel={setSel}>
            <g className="acq-tinta" aria-hidden="true">
              {/* Matas de maíz: tallo + hojas en V, la milpa entera. */}
              <path d="M70,290 L70,260 M70,272 L61,263 M70,268 L79,260 M70,281 L62,275" />
              <path d="M104,292 L104,258 M104,272 L94,262 M104,266 L114,258 M104,282 L96,275" />
              <path d="M138,290 L138,260 M138,273 L129,264 M138,268 L147,260 M138,281 L146,275" />
              <path d="M87,246 L87,222 M87,232 L80,225 M87,229 L94,222" />
              <path d="M121,246 L121,220 M121,231 L113,224 M121,228 L129,221" />
              <path d="M155,244 L155,222 M155,232 L148,226 M155,229 L162,223" />
            </g>
            <Rotulo x={64} y={210} n="2" texto="Maíz y frijol" />
          </LoteAcuarela>

          {/* ---------- Lote 4 · café con plátano (alerta) ---------- */}
          <LoteAcuarela id="l4" salud="alerta" grad="cafe" sel={sel} setSel={setSel}>
            <g className="acq-tinta" aria-hidden="true">
              {/* Matas de café: garabato redondo con palito. */}
              <path d="M70,412 C64,404 72,396 80,400 C88,394 96,402 90,410 C96,416 86,424 79,419 C71,424 64,418 70,412 Z M79,424 L79,432" />
              <path d="M118,438 C112,430 120,422 128,426 C136,420 144,428 138,436 C144,442 134,450 127,445 C119,450 112,444 118,438 Z M127,450 L127,458" />
              <path d="M74,458 C68,450 76,442 84,446 C92,440 100,448 94,456 C100,462 90,470 83,465 C75,470 68,464 74,458 Z M83,470 L83,477" />
              {/* Plátano: pencas largas. */}
              <path d="M142,392 C136,378 142,364 152,358 M152,394 C152,378 156,364 152,358 M160,392 C166,380 160,366 152,358 M152,394 L152,404" />
            </g>
            {/* Punto de alerta: late + anillos que se expanden. */}
            <g className="acq-alerta" transform="translate(146 424)" aria-hidden="true">
              <circle className="acq-alerta-anillo" r="6" />
              <circle className="acq-alerta-anillo a2" r="6" />
              <circle className="acq-alerta-punto" r="5" />
            </g>
            <Rotulo x={66} y={378} n="4" texto="Café" />
          </LoteAcuarela>

          {/* ---------- Lote 5 · potrero (sana) ---------- */}
          <LoteAcuarela id="l5" salud="sana" grad="pasto" sel={sel} setSel={setSel}>
            <g className="acq-tinta" aria-hidden="true">
              {/* Matas de pasto. */}
              <path d="M262,392 L258,384 M262,392 L262,382 M262,392 L266,384" />
              <path d="M306,378 L302,370 M306,378 L306,368 M306,378 L310,370" />
              <path d="M270,452 L266,444 M270,452 L270,442 M270,452 L274,444" />
              <path d="M316,460 L312,452 M316,460 L316,450 M316,460 L320,452" />
            </g>
            <Vaquita x={280} y={414} />
            <Arbolito x={318} y={418} s={0.9} tono="verde" />
            <Rotulo x={266} y={362} n="5" texto="Potrero" />
          </LoteAcuarela>

          {/* ---------- Nacimiento de agua + bosquecito ---------- */}
          <g className={`acq-lote acq-agua${sel === 'agua' ? ' es-sel' : ''}`} data-salud="sana" {...sitioProps('agua', sel, setSel)}>
            {/* Hit-area generosa: el pozo dibujado es chiquito. */}
            <circle cx="322" cy="72" r="34" className="acq-hit" />
            <Arbolito x={300} y={46} s={0.8} />
            <Arbolito x={344} y={52} s={0.7} />
            <path className="acq-cuerpo" d={FORMA.pozo} fill="url(#acq-g-agua)" filter="url(#acq-borde)" />
            <g className="acq-vida-late">
              <path className="acq-vida" d={FORMA.pozo} filter="url(#acq-borde)" />
            </g>
            {/* Juncos. */}
            <g className="acq-tinta" aria-hidden="true">
              <path d="M310,86 L308,74 M314,88 L314,76 M318,88 L321,77" />
            </g>
            <text x="322" y="112" textAnchor="middle" className="acq-rotulo-txt acq-rotulo-centro">Nacimiento</text>
          </g>

          {/* ---------- La casa (patio + casita con humo) ---------- */}
          <g className={`acq-lote acq-casa${sel === 'casa' ? ' es-sel' : ''}`} data-salud="sana" {...sitioProps('casa', sel, setSel)}>
            <path className="acq-cuerpo" d={FORMA.patio} fill="url(#acq-g-patio)" filter="url(#acq-borde)" />
            <g className="acq-vida-late">
              <path className="acq-vida" d={FORMA.patio} filter="url(#acq-borde)" />
            </g>
            {/* Casita: teja acuarela + muros de tinta + ventana encendida. */}
            <path d="M192,254 L221,230 L250,254 Z" className="acq-teja" filter="url(#acq-tiembla)" aria-hidden="true" />
            <g className="acq-tinta" aria-hidden="true">
              <path d="M192,254 L221,230 L250,254 M198,254 L198,290 L244,254 L244,290 M198,290 L244,290" />
              <path d="M216,290 L216,272 L228,272 L228,290" />
            </g>
            <rect x="203" y="262" width="9" height="9" rx="1.5" className="acq-ventana" aria-hidden="true" />
            {/* Humo del fogón: sube y se deshace (posición en <g> externo,
                animación en el interno — regla de la casa). */}
            <g transform="translate(246 226)" aria-hidden="true">
              <g className="acq-humo"><path d="M0,0 C4,-6 -2,-10 2,-16" /></g>
              <g className="acq-humo h2"><path d="M2,-2 C6,-8 0,-12 4,-18" /></g>
            </g>
            <text x="221" y="312" textAnchor="middle" className="acq-rotulo-txt acq-rotulo-centro">La casa</text>
          </g>

          {/* Árboles de lindero, sueltos. */}
          <Arbolito x={368} y={250} s={0.75} />
          <Arbolito x={26} y={340} s={0.7} tono="cafe" />

          {/* Mariposa: vida ambiental, cruza el croquis cada tanto. */}
          <g className="acq-mariposa-vuelo" aria-hidden="true">
            <g className="acq-mariposa">
              <path className="acq-ala" d="M0,0 C-6,-7 -12,-3 -8,2 C-12,6 -5,9 0,3 Z" />
              <path className="acq-ala a2" d="M0,0 C6,-7 12,-3 8,2 C12,6 5,9 0,3 Z" />
            </g>
          </g>
        </svg>

        {/* Velo de hora dorada + viñeta (velos del catálogo, §13.5). */}
        <div className="acq-velo" aria-hidden="true" />
      </div>

      {/* ---------- Ficha del lote tocado (nota al margen) ---------- */}
      <section className="acq-ficha" aria-live="polite">
        {ficha ? (
          <div className="acq-ficha-nota" data-salud={ficha.salud} key={sel}>
            <div className="acq-ficha-linea">
              <h2 className="acq-ficha-titulo">{ficha.titulo}</h2>
              <button type="button" className="acq-ficha-cerrar" onClick={() => setSel(null)} aria-label="Cerrar la nota">×</button>
            </div>
            <p className="acq-ficha-meta">
              {ficha.meta} · <strong className="acq-ficha-estado">{ficha.estado}</strong>
            </p>
            <p className="acq-ficha-nota-txt">{ficha.nota}</p>
          </div>
        ) : (
          <p className="acq-ficha-pista">Toque un lote, la casa o el agua para ver cómo va.</p>
        )}
      </section>

      {/* ---------- Leyenda cálida ---------- */}
      <footer className="acq-leyenda">
        <p className="acq-leyenda-titulo">El croquis late con la salud de su finca</p>
        <ul className="acq-leyenda-lista">
          <li><span className="acq-muestra sana" aria-hidden="true" /> Verde vivo: {ESTADO_LABEL.sana.toLowerCase()}, late tranquilo</li>
          <li><span className="acq-muestra estres" aria-hidden="true" /> Ocre: {ESTADO_LABEL.estres.toLowerCase()}, late corto</li>
          <li><span className="acq-muestra alerta" aria-hidden="true" /> Punto rojo: {ESTADO_LABEL.alerta.toLowerCase()}</li>
        </ul>
      </footer>
    </div>
  );
}
