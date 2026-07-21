/* eslint-disable chagra-i18n/no-hardcoded-spanish -- mockup de diseño: texto de muestra, no cadenas de UI de producción (ADR-050) */
/**
 * MontanaMundosCampesino.jsx — MOCKUP DEV, PASADA 4 "CAMPESINA" de
 * "La Montaña de los Mundos" (#/mockups/montana-mundos-campesino, sin gate).
 *
 * Versión ELEGIDA por la auditoría visual 2026-07-10 (arrastra completo el
 * motor de cine de la pasada 3 — p3 no se mergea aparte).
 * Norte del operador: CONCRETA Y LITERAL — el campesino RECONOCE su finca
 * (sus cultivos reales, su clima, su piso térmico) SIN perder el toque
 * cinematográfico de la pasada 3. Hereda de la pasada 3 (copia fiel de su
 * motor: mismas 6 capas de cámara con parallax, profundidad de campo,
 * niebla volumétrica, viaje/llegada, vida ambiental) y encima:
 *
 *   1. SU PISO TÉRMICO RESALTADO — la finca de muestra vive en clima frío
 *      (2.600 m): en la montaña completa su piso brilla con un resalte de
 *      oro que respira ("SU FINCA ESTÁ AQUÍ") y los demás pisos se ven
 *      pero quedan levemente empolvados. La casa campesina se mudó del
 *      templado al frío — es SU casa, en SU clima.
 *   2. ENTRADA POR VOZ (mock visual, sin STT) — la píldora protagonista
 *      "🎙 Muéstrame mi montaña" corre la secuencia de cámara completa:
 *      gran plano general → regreso a la finca con el momento de llegada.
 *   3. LOS NODOS-MUNDO SON ESCENAS REALES REUSADAS — "Su finca por dentro"
 *      abre SceneFincaOrganismo (la escena biopunk del home vivo), "Su
 *      guardián" abre GuardianEspiritu y "Sus mundos" abre ArbolDeMundos,
 *      en una hoja cinematográfica sobre la montaña. Nada de cajas grises.
 *   4. DATOS CONCRETOS DE MUESTRA — los mundos de SU piso hablan con sus
 *      cosas: "Su papa pastusa · 3 surcos · 42 días", "Su corral · 12
 *      gallinas · la vaca Lucero", el mercado con precio del día, y la
 *      cabecera es la cédula de la finca (nombre, vereda, clima de hoy).
 *
 * Una sola dirección de arte ("tarde lavada después del aguacero en tierra
 * fría"): tokens propios sobre la base naturalista de la pasada 3 y la clase
 * mm4 re-tiñe la luz. Al promover a prod se PODARON las direcciones alternas
 * del mockup de cine (biopunk / verde vivo: estrellas, micelio, luciérnagas,
 * mariposas, hojas que caen) — este archivo es la única fuente del motor.
 * Se conservan pellizco/botón, deslizar/rueda, atajos Ⓐ + anotar,
 * reduced-motion digno. Español de Colombia.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import './montana-mundos-campesino.css';
// ── Escenas REALES del home vivo reusadas como nodos-mundo (regla dura:
// reusar, no reescribir). SceneFincaOrganismo no importa su propio CSS
// (en el home lo importa FincaVivaHero) — aquí lo importamos nosotros.
import SceneFincaOrganismo from '../components/dashboard/SceneFincaOrganismo';
import '../components/dashboard/scene-finca-organismo.css';
import GuardianEspiritu from '../components/dashboard/GuardianEspiritu';
import ArbolDeMundos from '../components/dashboard/ArbolDeMundos';
import { navegarDesde3D } from '../prodApp/wire3DNav.js';

// ── Geometría de la escena (unidades del viewBox 390×1440) ──────────────────
const VB_W = 390;
const VB_H = 1440;

// La finca de MUESTRA vive en clima frío (norte del operador: el campesino
// reconoce SU piso térmico). Datos ficticios — nada real, nada de terceros.
const PISOS = [
  { id: 'nevado', nombre: 'Nevado', msnm: '4.800 m', y0: 96, y1: 320 },
  { id: 'paramo', nombre: 'Páramo', msnm: '3.500 m', y0: 320, y1: 560 },
  { id: 'frio', nombre: 'Clima frío', msnm: '2.600 m', y0: 560, y1: 800, finca: true },
  { id: 'templado', nombre: 'Clima templado', msnm: '1.700 m', y0: 800, y1: 1060 },
  { id: 'calido', nombre: 'Clima cálido', msnm: '800 m', y0: 1060, y1: 1300 },
  { id: 'rio', nombre: 'El río', msnm: '400 m', y0: 1300, y1: 1440 },
];
const PISO_FINCA = PISOS.findIndex((p) => p.finca);

// Cédula de la finca de muestra: lo primero que ve el campesino es SU finca
// con nombre propio, su vereda y el clima de HOY (dato de muestra).
const FINCA = {
  nombre: 'El Recuerdo',
  vereda: 'El Roble',
  clima: 'Clima frío · 2.600 m',
  hoy: 'Hoy: 13 °C · aguacero por la tarde',
};

// Mundos tocables (anclas de la geometría validada en las pasadas 1-3).
// En SU piso los mundos hablan CONCRETO (dato de muestra bajo la etiqueta);
// los que llevan `escena` abren una ESCENA REAL del home vivo en la hoja.
const MUNDOS = [
  { id: 'heladas', x: 316, y: 96, piso: 0, etiqueta: 'Las heladas', abre: 'el calendario del campo: cuándo caen las heladas que queman la papa' },
  { id: 'glaciar', x: 195, y: 228, piso: 0, etiqueta: 'El agua que baja', abre: 'los glaciares y el agua de alta montaña' },
  { id: 'restauracion', x: 168, y: 420, piso: 1, etiqueta: 'Restaurar', abre: 'la restauración del páramo y el bosque' },
  { id: 'guardian', x: 258, y: 468, piso: 1, etiqueta: 'Su guardián', dato: 'el espíritu de su finca', escena: 'guardian', abre: 'el guardián: escoja la especie nativa que cuida su finca' },
  { id: 'mundos', x: 210, y: 610, piso: 2, etiqueta: 'Sus mundos', dato: 'el árbol con todas las entradas', escena: 'arbol', abre: 'el árbol de los mundos de su finca' },
  { id: 'papa', x: 118, y: 662, piso: 2, etiqueta: 'Su papa pastusa', dato: '3 surcos · 42 días de sembrada', abre: 'su papa pastusa: los 3 surcos que sembró hace 42 días' },
  { id: 'corral', x: 278, y: 700, piso: 2, etiqueta: 'Su corral', dato: '12 gallinas · la vaca Lucero', abre: 'sus animales: las 12 gallinas y la vaca Lucero' },
  { id: 'casa', x: 190, y: 752, piso: 2, etiqueta: 'Su finca por dentro', dato: 'véala respirar, un solo organismo', escena: 'organismo', abre: 'su finca viva por dentro, como un solo organismo' },
  { id: 'cosecha', x: 296, y: 826, piso: 3, etiqueta: 'La cosecha', abre: 'el troje: la cosecha que tiene guardada' },
  { id: 'cafe', x: 96, y: 942, piso: 3, etiqueta: 'El café de la vereda', abre: 'el mundo del café' },
  { id: 'vender', x: 300, y: 986, piso: 3, etiqueta: 'El mercado', dato: 'papa a $2.400 la libra', abre: 'el mercado del pueblo: precios y ventas' },
  { id: 'mango', x: 92, y: 1136, piso: 4, etiqueta: 'El mango', abre: 'el mundo del mango' },
  { id: 'platano', x: 292, y: 1168, piso: 4, etiqueta: 'El plátano', abre: 'el plátano y el banano' },
  { id: 'rio', x: 190, y: 1372, piso: 5, etiqueta: 'El río', abre: 'el agua, el riego y la pesca' },
];

// Las 3 escenas REALES del home vivo que la montaña abre como mundos.
const ESCENAS = {
  organismo: {
    titulo: 'Su finca por dentro',
    sub: 'La escena viva del home: su finca respirando como un solo organismo.',
  },
  guardian: {
    titulo: 'Su guardián',
    sub: 'Escoja la especie nativa que cuida su finca — se vuelve su espíritu.',
  },
  arbol: {
    titulo: 'El árbol de sus mundos',
    sub: 'Cada rama es un mundo de su finca: toque una vaina para entrar.',
  },
};

// Factores de parallax: cuánto viaja cada capa respecto a la principal.
// < 1 = lejos (se mueve menos) · > 1 = más cerca que la montaña.
const CAPAS_F = { cielo: 0.1, lejos: 0.22, medio: 0.45, principal: 1, niebla: 1.12, cerca: 1.3 };

// Chispas del momento de llegada: hacia dónde vuela cada pavesa (px del
// viewport) y con qué demora arranca. Suben desde la casa, como del fogón.
const CHISPAS = [
  { dx: -34, dy: -52, demora: 0.55 },
  { dx: 20, dy: -64, demora: 0.7 },
  { dx: 44, dy: -34, demora: 0.85 },
  { dx: -50, dy: -24, demora: 1 },
  { dx: 6, dy: -76, demora: 1.15 },
  { dx: -14, dy: -42, demora: 1.3 },
];

// La escena SANGRA 150 unidades por debajo del río (dibujadas fuera del
// viewBox con overflow visible): sin ese respiro, el piso del río quedaba
// escondido detrás de la UI inferior en full-bleed.
const VB_SANGRADO = 150;

// Transform de la cámara base (geometría de la pasada 1 + sangrado).
function calcularTransform(vp, modo, piso) {
  const escenaH = vp.w * (VB_H / VB_W);
  if (modo === 'montana') {
    // Aire arriba (cabecera) y abajo (zoom + atajos): que el rótulo del río
    // no quede detrás del botón de zoom.
    const s = Math.min((vp.h - 230) / escenaH, 1);
    return { s, tx: (vp.w - vp.w * s) / 2, ty: 72 };
  }
  const p = PISOS[piso];
  const bandaH = ((p.y1 - p.y0) / VB_H) * escenaH;
  const s = Math.max(1, Math.min((vp.h * 0.94) / bandaH, 1.35));
  const cy = (((p.y0 + p.y1) / 2) / VB_H) * escenaH;
  const sangradoPx = (VB_SANGRADO / VB_H) * escenaH * s;
  let ty = vp.h / 2 - cy * s;
  ty = Math.max(vp.h - escenaH * s - sangradoPx, Math.min(0, ty));
  const tx = (vp.w - vp.w * s) / 2;
  return { s, tx, ty };
}

// ── Piezas de la escena (SVG) ────────────────────────────────────────────────

/** Frailejón pasada 3: faldón, roseta doble, varas de flor y — textura —
 * cicatrices foliares en el tronco (los anillos de hojas viejas del
 * frailejón real, lo que le da su cuerpo peludo a distancia). */
function Frailejon({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path className="mm2-frailejon-faldon" d="M-4 4 Q-9 10 -8 18 M0 6 Q-1 12 0 20 M4 4 Q9 10 8 18" />
      <rect x="-3.6" y="-4" width="7.2" height="30" rx="3.2" className="mm2-frailejon-tronco" />
      <path
        className="mm2-frailejon-cicatriz"
        d="M-3 1 Q0 2.4 3 1 M-3 6 Q0 7.4 3 6 M-3 11 Q0 12.4 3 11 M-3 16 Q0 17.4 3 16 M-3 21 Q0 22.4 3 21"
      />
      <g className="mm2-frailejon-roseta">
        {[-84, -56, -28, 0, 28, 56, 84].map((a) => (
          <ellipse key={`e${a}`} cx="0" cy="-14" rx="3" ry="13" transform={`rotate(${a} 0 -1)`} className="mm2-frailejon-hoja" />
        ))}
        {[-34, -12, 12, 34].map((a) => (
          <ellipse key={`i${a}`} cx="0" cy="-17" rx="2.4" ry="11" transform={`rotate(${a} 0 -3)`} className="mm2-frailejon-hoja mm2-hoja-int" />
        ))}
        <path className="mm2-frailejon-tallo" d="M-2 -14 Q-6 -26 -8 -34" />
        <path className="mm2-frailejon-tallo" d="M2 -14 Q6 -28 8 -38" />
        <circle cx="-8" cy="-36" r="2.8" className="mm2-frailejon-flor" />
        <circle cx="8" cy="-40" r="3.2" className="mm2-frailejon-flor" />
      </g>
    </g>
  );
}

/** Mata de café pasada 2: tallo, pares de hojas y cerezas rojas. */
function MataCafe({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path className="mm2-cafe-tallo" d="M0 9 L0 -7" />
      {[[-1, -5, -34], [1, -4, 34], [-1, -1, -48], [1, 0, 48], [-1, 3, -60], [1, 4, 60]].map(([lado, cy, rot], i) => (
        <ellipse
          key={`h${i}`}
          cx={lado * 4.6}
          cy={cy}
          rx="4.6"
          ry="2"
          transform={`rotate(${rot} ${lado * 4.6} ${cy})`}
          className="mm2-cafe-hoja"
        />
      ))}
      <circle cx="-2.6" cy="0.5" r="1.6" className="mm2-cafe-fruto" />
      <circle cx="2.4" cy="-2.4" r="1.6" className="mm2-cafe-fruto" />
      <circle cx="1.8" cy="3.2" r="1.6" className="mm2-cafe-fruto" />
    </g>
  );
}

/** Animal del corral (silueta simple: cuerpo + cabeza + patas). El grupo
 * interior pasta — se inclina apenas hacia el suelo y vuelve (vida). */
function Animalito({ x, y, s = 1, clase = 'mm2-oveja' }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} className={clase}>
      <g className="mm2-pasta">
        <ellipse cx="0" cy="0" rx="8.4" ry="5.4" />
        <circle cx="8.2" cy="-3.2" r="3.1" />
        <rect x="-6" y="3" width="2.2" height="6" rx="1" />
        <rect x="3.6" y="3" width="2.2" height="6" rx="1" />
      </g>
    </g>
  );
}

/** Arbolito del bosque altoandino (cono doble + tronco). */
function Arbolito({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-1.4" y="4" width="2.8" height="6" className="mm2-arbolito-tronco" />
      <path d="M0 -14 L7 0 L-7 0 Z" className="mm2-arbolito" />
      <path d="M0 -7 L8.5 6 L-8.5 6 Z" className="mm2-arbolito" />
    </g>
  );
}

// ── Capa 1: CIELO (astro, god-rays, nubes altas, bandada) — f 0.10 ──────────
function CieloSvg() {
  return (
    <svg className="mm2-svg" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="mm2c-cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="mm2-stop-cielo-a" />
          <stop offset="0.5" className="mm2-stop-cielo-m" />
          <stop offset="1" className="mm2-stop-cielo-b" />
        </linearGradient>
        <radialGradient id="mm2c-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" className="mm2-stop-halo-a" />
          <stop offset="1" className="mm2-stop-halo-b" />
        </radialGradient>
        <linearGradient id="mm2c-rayo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="mm2-stop-rayo-a" />
          <stop offset="1" className="mm2-stop-rayo-b" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#mm2c-cielo)" />

      {/* God-rays: abanico de luz volumétrica desde el astro, baña la ladera */}
      <g className="mm2-rayos">
        <path className="mm2-rayo mm2-rayo-1" d="M300 106 L96 620 L168 660 Z" fill="url(#mm2c-rayo)" />
        <path className="mm2-rayo mm2-rayo-2" d="M314 118 L238 700 L306 706 Z" fill="url(#mm2c-rayo)" />
        <path className="mm2-rayo mm2-rayo-3" d="M330 108 L420 560 L354 620 Z" fill="url(#mm2c-rayo)" />
      </g>

      {/* El astro: el sol de la tarde lavada → mundo de las heladas */}
      <g className="mm2-astro">
        <circle cx="316" cy="96" r="60" fill="url(#mm2c-halo)" />
        <circle cx="316" cy="96" r="24" className="mm2-astro-disco" />
      </g>

      {/* Cirros altos, casi quietos */}
      <g className="mm2-nubes">
        <g className="mm2-nube-alta mm2-nube-1">
          <ellipse cx="90" cy="70" rx="44" ry="7" />
          <ellipse cx="120" cy="64" rx="26" ry="5" />
        </g>
        <g className="mm2-nube-alta mm2-nube-2">
          <ellipse cx="250" cy="190" rx="38" ry="6" />
        </g>
      </g>

      {/* Bandada en V que CRUZA el cielo de lado a lado: pasa una vez,
          descansa fuera de cuadro y vuelve. */}
      <g transform="translate(0 218)" className="mm2-bandada">
        <g className="mm2-bandada-vuelo">
          <path d="M0 0 q6 -6 12 0 q6 -6 12 0" />
          <path d="M-26 12 q5 -5 10 0 q5 -5 10 0" />
          <path d="M-14 24 q5 -5 10 0 q5 -5 10 0" />
          <path d="M-44 30 q4 -4 8 0 q4 -4 8 0" />
        </g>
      </g>
    </svg>
  );
}

// ── Capa 2: CORDILLERA LEJANA (perspectiva atmosférica) — f 0.22 ────────────
function CordilleraLejosSvg() {
  return (
    <svg className="mm2-svg" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <path
        className="mm2-lejos-a"
        d="M-2 1442 L-2 460 Q40 380 84 410 Q130 445 186 385 Q244 325 300 390 Q348 440 392 405 L392 1442 Z"
      />
      <path
        className="mm2-lejos-b"
        d="M-2 1442 L-2 640 Q56 560 124 596 Q200 636 268 570 Q330 512 392 570 L392 1442 Z"
      />
      {/* banda de bruma que funde la cordillera con el cielo */}
      <rect className="mm2-bruma-banda" x="-2" y="560" width="394" height="120" opacity="0.55" />
    </svg>
  );
}

// ── Capa 3: CORDILLERA MEDIA (+ aves y nubes de media altura) — f 0.45 ──────
function CordilleraMediaSvg() {
  return (
    <svg className="mm2-svg" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <path
        className="mm2-medio-a"
        d="M-2 1442 L-2 700 Q48 590 100 480 Q126 424 158 468 Q192 540 210 640 L210 1442 Z"
      />
      <path
        className="mm2-medio-b"
        d="M392 1442 L392 680 Q344 572 302 486 Q278 436 252 482 Q224 548 208 650 L208 1442 Z"
      />
      <g className="mm2-nubes">
        <g className="mm2-nube mm2-nube-3">
          <ellipse cx="86" cy="560" rx="40" ry="10" />
          <ellipse cx="112" cy="552" rx="24" ry="8" />
        </g>
      </g>
      <g className="mm2-aves">
        <g className="mm2-ave-1">
          <path d="M96 336 q6 -6 12 0 q6 -6 12 0" />
          <path d="M130 358 q5 -5 10 0 q5 -5 10 0" />
        </g>
        <path d="M270 430 q5 -5 10 0 q5 -5 10 0" />
      </g>
      {/* bruma al pie de la cordillera media */}
      <rect className="mm2-bruma-banda" x="-2" y="640" width="394" height="90" opacity="0.4" />
    </svg>
  );
}

// ── Capa 4: MONTAÑA PRINCIPAL (pisos térmicos + todos los mundos) — f 1 ─────
function MontanaPrincipalSvg() {
  return (
    <svg className="mm2-svg" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="mm2p-rio" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="mm2-stop-rio-a" />
          <stop offset="1" className="mm2-stop-rio-b" />
        </linearGradient>
        <linearGradient id="mm2p-reflejo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="mm2-stop-reflejo-a" />
          <stop offset="0.6" className="mm2-stop-reflejo-b" />
        </linearGradient>
        {/* Luz direccional: el astro está arriba a la derecha — la cara
            derecha del cono recibe luz, la izquierda cae en sombra. */}
        <linearGradient id="mm2p-ladera" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" className="mm2-stop-ladera-sombra" />
          <stop offset="0.48" className="mm2-stop-transparente" />
          <stop offset="1" className="mm2-stop-ladera-luz" />
        </linearGradient>
        <clipPath id="mm2p-clip-montana">
          {/* El recorte baja hasta el sangrado (1590): el valle sigue vivo
              debajo del viewBox para que la cámara pueda centrar el río. */}
          <path d="M-2 1590 L-2 760 Q56 706 96 596 Q136 486 160 366 Q178 268 195 176 Q212 268 230 366 Q254 486 294 596 Q334 706 392 760 L392 1590 Z" />
        </clipPath>
      </defs>

      {/* ── Cuerpo de la montaña: pisos térmicos apilados ── */}
      <g clipPath="url(#mm2p-clip-montana)">
        <rect x="-2" y="170" width="394" height="1272" className="mm2-piso-paramo" />
        <path className="mm2-piso-frio" d="M-2 574 Q46 556 94 566 Q152 578 200 564 Q258 550 306 564 Q350 576 392 562 L392 1442 L-2 1442 Z" />
        <path className="mm2-piso-templado" d="M-2 816 Q50 798 104 808 Q160 820 212 806 Q266 792 316 806 Q356 816 392 804 L392 1442 L-2 1442 Z" />
        <path className="mm2-piso-calido" d="M-2 1076 Q54 1058 110 1068 Q166 1080 222 1066 Q276 1052 330 1066 Q364 1074 392 1062 L392 1442 L-2 1442 Z" />
        <path className="mm2-piso-valle" d="M-2 1316 Q60 1300 130 1310 Q210 1322 280 1308 Q340 1298 392 1308 L392 1442 L-2 1442 Z" />

        {/* Curvas de nivel: escala real de montaña, sutiles */}
        <path className="mm2-contorno" d="M60 640 Q140 620 250 640" />
        <path className="mm2-contorno" d="M40 730 Q150 706 300 730" />
        <path className="mm2-contorno" d="M30 900 Q170 876 340 900" />
        <path className="mm2-contorno" d="M24 1000 Q180 976 360 1000" />
        <path className="mm2-contorno" d="M30 1160 Q190 1136 358 1160" />
        <path className="mm2-contorno" d="M40 1250 Q200 1228 350 1250" />

        {/* Nevado: casquete con ruana dentada, cara de sombra y grietas */}
        <path className="mm2-nieve" d="M195 140 Q168 220 138 320 L154 306 L166 324 L182 306 L196 330 L212 306 L226 322 L240 304 L254 318 Q222 220 195 140 Z" />
        <path className="mm2-nieve-sombra" d="M195 140 Q180 196 162 268 Q178 246 190 252 Q196 208 195 140 Z" />
        <path className="mm2-grieta" d="M180 260 q8 4 16 2" />
        <path className="mm2-grieta" d="M198 292 q7 3 13 1" />
        <path className="mm2-nieve" d="M196 330 Q192 358 184 382 Q178 360 182 336 Z" opacity="0.9" />
        <path className="mm2-grieta" d="M186 348 q4 3 8 2" opacity="0.7" />

        {/* Destellos sobre la nieve: el hielo titila con la luz */}
        <g className="mm2-destellos">
          <path className="mm2-destello" d="M186 206 l1.8 3.4 -1.8 3.4 -1.8 -3.4 Z" />
          <path className="mm2-destello" d="M208 252 l1.6 3 -1.6 3 -1.6 -3 Z" />
          <path className="mm2-destello" d="M176 288 l1.5 2.8 -1.5 2.8 -1.5 -2.8 Z" />
          <path className="mm2-destello" d="M222 296 l1.4 2.6 -1.4 2.6 -1.4 -2.6 Z" />
        </g>

        {/* Bordes de piso: la rima de luz entre climas */}
        <path className="mm2-borde-piso" d="M-2 574 Q46 556 94 566 Q152 578 200 564 Q258 550 306 564 Q350 576 392 562" />
        <path className="mm2-borde-piso" d="M-2 816 Q50 798 104 808 Q160 820 212 806 Q266 792 316 806 Q356 816 392 804" />
        <path className="mm2-borde-piso" d="M-2 1076 Q54 1058 110 1068 Q166 1080 222 1066 Q276 1052 330 1066 Q364 1074 392 1062" />
        <path className="mm2-borde-piso" d="M-2 1316 Q60 1300 130 1310 Q210 1322 280 1308 Q340 1298 392 1308" />

        {/* ── PÁRAMO: laguna con reflejo, pajonal, frailejones ── */}
        <ellipse className="mm2-laguna" cx="222" cy="512" rx="34" ry="9" />
        <ellipse cx="222" cy="512" rx="34" ry="9" fill="url(#mm2p-reflejo)" />
        <path className="mm2-laguna-brillo" d="M198 510 Q222 504 246 510" />
        <g className="mm2-pajonal">
          <path d="M196 452 q-3 -10 -7 -13 M196 452 q0 -12 1 -15 M196 452 q4 -9 8 -12" />
          <path d="M216 436 q-3 -9 -6 -11 M216 436 q0 -10 1 -13 M216 436 q3 -8 7 -10" />
          <path d="M160 508 q-3 -9 -6 -11 M160 508 q0 -10 1 -13 M160 508 q3 -8 7 -10" />
          <path d="M186 528 q-3 -8 -6 -10 M186 528 q0 -9 1 -12 M186 528 q3 -7 6 -9" />
          <path d="M250 486 q-3 -9 -6 -11 M250 486 q0 -10 1 -13 M250 486 q3 -8 7 -10" />
          <path d="M232 540 q-3 -8 -6 -10 M232 540 q0 -9 1 -12 M232 540 q3 -7 6 -9" />
        </g>
        <ellipse className="mm2-piedra" cx="150" cy="532" rx="9" ry="5" />
        <ellipse className="mm2-piedra" cx="228" cy="456" rx="6" ry="3.6" />

        {/* Textura de roca: afloramientos con vetas al pie del nevado,
            y el pedrisco que suelta el deshielo */}
        <g className="mm2-rocas">
          <path className="mm2-roca" d="M146 398 q9 -13 21 -9 q7 9 -1 17 q-14 6 -20 -8 Z" />
          <path className="mm2-roca-veta" d="M150 398 q9 -6 15 -4 M152 405 q7 -4 11 -3" />
          <path className="mm2-roca" d="M238 410 q11 -11 20 -5 q4 11 -5 16 q-12 3 -15 -11 Z" />
          <path className="mm2-roca-veta" d="M242 410 q8 -5 13 -3 M244 417 q6 -3 9 -2" />
          <path className="mm2-roca" d="M196 380 q7 -9 14 -6 q4 8 -2 13 q-9 3 -12 -7 Z" />
          <path className="mm2-roca-veta" d="M199 380 q6 -4 10 -3" />
        </g>
        <g className="mm2-pedrisco">
          {[[160, 416], [172, 424], [230, 430], [244, 434], [206, 396], [186, 410]].map(([cx, cy], i) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={i % 2 ? 1.6 : 2.2} />
          ))}
        </g>

        <Frailejon x={168} y={438} s={1.25} />
        <Frailejon x={204} y={472} s={0.95} />
        <Frailejon x={150} y={488} s={0.8} />
        <Frailejon x={240} y={530} s={0.7} />

        {/* ── FRÍO: surcos de papa, corral, bosque altoandino ── */}
        <g className="mm2-surcos">
          <path d="M70 636 Q118 626 166 636" />
          <path d="M62 656 Q118 644 174 656" />
          <path d="M56 676 Q118 662 180 676" />
          <path d="M52 696 Q118 682 184 696" />
        </g>
        <g className="mm2-matas-papa">
          {[[80, 632], [112, 628], [144, 632], [72, 652], [108, 646], [148, 652],
            [66, 672], [106, 664], [152, 672], [62, 692], [104, 684], [156, 692]].map(([cx, cy]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" />
            ))}
        </g>
        <Arbolito x={210} y={618} s={1} />
        <Arbolito x={190} y={640} s={0.8} />
        <Arbolito x={330} y={640} s={0.9} />
        <g className="mm2-corral">
          {[236, 258, 280, 302, 318].map((x) => (
            <rect key={x} x={x} y={694} width="3.2" height="16" rx="1.4" className="mm2-cerca-poste" />
          ))}
          <rect x="234" y="697" width="88" height="2.6" rx="1.3" className="mm2-cerca-riel" />
          <rect x="234" y="704" width="88" height="2.6" rx="1.3" className="mm2-cerca-riel" />
          <Animalito x={258} y={688} s={0.9} clase="mm2-oveja" />
          <Animalito x={296} y={690} s={1.05} clase="mm2-vaca" />
        </g>

        {/* ── LA CASA (pasada 4): se mudó del templado al CLIMA FRÍO — la
            finca de muestra vive a 2.600 m, entre los surcos de papa y el
            corral. Mismo dibujo validado de la pasada 3, reubicado y
            apenas reducido (la escala del frío): el transform lleva el
            centro de la casa de (196, 878) a (190, 750) a escala 0.88. ── */}
        <g className="mm2-casa" transform="translate(190 750) scale(0.88) translate(-196 -878)">
          <g className="mm2-humo">
            <circle className="mm2-humo-1" cx="212" cy="854" r="3.4" />
            <circle className="mm2-humo-2" cx="214" cy="846" r="4.4" />
            <circle className="mm2-humo-3" cx="217" cy="836" r="5.4" />
          </g>
          <rect x="206" y="854" width="7" height="16" rx="1.5" className="mm2-casa-chimenea" />
          {/* cuerpo + corredor campesino (zócalo, columnas) */}
          <rect x="166" y="874" width="60" height="34" rx="2.5" className="mm2-casa-muro" />
          <rect x="162" y="905" width="68" height="4" rx="2" className="mm2-casa-zocalo" />
          <rect x="169" y="884" width="2.6" height="21" className="mm2-casa-columna" />
          <rect x="221" y="884" width="2.6" height="21" className="mm2-casa-columna" />
          {/* techo a dos aguas con canales de teja */}
          <path d="M158 878 L196 848 L234 878 Z" className="mm2-casa-techo" />
          <path className="mm2-casa-teja" d="M186 856 L176 876 M196 851 L196 876 M206 856 L216 876" />
          {/* ventana con marco (encendida: alguien está en casa) */}
          <rect x="176" y="886" width="12" height="11" rx="2" className="mm2-casa-ventana" />
          <rect x="181" y="886" width="1.6" height="11" className="mm2-casa-marco" />
          <rect x="200" y="883" width="14" height="25" rx="2.5" className="mm2-casa-puerta" />
          {/* materas con geranios en el corredor */}
          <rect x="163" y="899" width="5.6" height="6" rx="1" className="mm2-matera" />
          <circle cx="165.8" cy="897" r="2.6" className="mm2-geranio" />
          <rect x="227" y="899" width="5.6" height="6" rx="1" className="mm2-matera" />
          <circle cx="229.8" cy="897" r="2.6" className="mm2-geranio" />
          <path d="M150 908 Q196 916 244 908" className="mm2-casa-camino" />
        </g>

        {/* Colibrí (heredado de la pasada 3): ronda los geranios del
            corredor — se mudó con la casa al clima frío */}
        <g transform="translate(232 762)" className="mm2-colibri">
          <g className="mm2-colibri-ronda">
            <path className="mm2-colibri-cola" d="M-3.6 0.6 L-8.6 3.6 L-7.2 -0.4 Z" />
            <ellipse cx="0" cy="0" rx="4" ry="2.2" className="mm2-colibri-torso" />
            <circle cx="4.4" cy="-1.6" r="1.8" className="mm2-colibri-torso" />
            <path className="mm2-colibri-pico" d="M6 -1.9 L10.6 -3" />
            <path className="mm2-colibri-ala" d="M-0.6 -1 Q-3.4 -8 -8.6 -9.4 Q-4 -4 -1.6 0.4 Z" />
          </g>
        </g>
        {/* ── TEMPLADO: la vereda de abajo — troje, cafetal, mercado ── */}
        <g className="mm2-troje">
          <rect x="282" y="856" width="4" height="16" className="mm2-troje-pata" />
          <rect x="306" y="856" width="4" height="16" className="mm2-troje-pata" />
          <rect x="276" y="836" width="40" height="22" rx="3" className="mm2-troje-cuerpo" />
          <path d="M272 838 L296 822 L320 838 Z" className="mm2-troje-techo" />
          <circle cx="290" cy="847" r="3" className="mm2-troje-grano" />
          <circle cx="298" cy="849" r="3" className="mm2-troje-grano" />
          <circle cx="304" cy="846" r="3" className="mm2-troje-grano" />
        </g>
        {/* Cafetal a la sombra de los guamos, en hileras */}
        <g className="mm2-sombrio">
          <path d="M52 940 Q50 924 54 912" />
          <path d="M146 936 Q144 920 148 908" />
        </g>
        <ellipse className="mm2-sombrio-copa" cx="54" cy="904" rx="18" ry="9" />
        <ellipse className="mm2-sombrio-copa" cx="148" cy="900" rx="20" ry="10" />
        <g className="mm2-cafetal">
          <MataCafe x={72} y={936} s={1.1} />
          <MataCafe x={98} y={928} s={1} />
          <MataCafe x={124} y={938} s={1.15} />
          <MataCafe x={84} y={958} s={0.95} />
          <MataCafe x={112} y={956} s={1.05} />
          <MataCafe x={58} y={952} s={0.85} />
        </g>
        <g className="mm2-mercado">
          <rect x="278" y="988" width="46" height="20" rx="2.5" className="mm2-mercado-meson" />
          {[278, 289.5, 301, 312.5].map((x, i) => (
            <rect key={x} x={x} y={974} width="11.5" height="10" rx="1.5" className={i % 2 ? 'mm2-toldo-b' : 'mm2-toldo-a'} />
          ))}
          <rect x="276" y="982" width="50" height="4" rx="2" className="mm2-mercado-tabla" />
          <circle cx="288" cy="994" r="3.4" className="mm2-mercado-fruta-a" />
          <circle cx="298" cy="994" r="3.4" className="mm2-mercado-fruta-b" />
          <circle cx="308" cy="994" r="3.4" className="mm2-mercado-fruta-a" />
        </g>

        {/* ── CÁLIDO: mango con frutos colgando, platanera, cañaduzal ── */}
        <g className="mm2-arbol-mango">
          <path d="M90 1172 Q86 1152 82 1140 M90 1172 Q92 1150 98 1136" className="mm2-mango-tronco" />
          <circle cx="92" cy="1122" r="25" className="mm2-mango-copa-sombra" />
          <circle cx="80" cy="1128" r="18" className="mm2-mango-copa" />
          <circle cx="104" cy="1122" r="16" className="mm2-mango-copa" />
          <circle cx="92" cy="1108" r="15" className="mm2-mango-copa" />
          {[[76, 1142], [98, 1138], [108, 1130]].map(([cx, cy]) => (
            <g key={`${cx}-${cy}`}>
              <path className="mm2-mango-pezon" d={`M${cx} ${cy - 9} L${cx} ${cy - 3}`} />
              <ellipse cx={cx} cy={cy} rx="3" ry="3.8" className="mm2-mango-fruto" />
            </g>
          ))}
        </g>
        <g className="mm2-platanera">
          {[-58, -30, 0, 30, 58].map((a) => (
            <g key={a} transform={`translate(292 1180) rotate(${a} 0 0)`}>
              <path d="M0 0 Q5 -20 1.5 -38 L0 -30 L-1.5 -38 Q-5 -20 0 0" className="mm2-platano-hoja" />
              <path d="M0 -4 L0 -30" className="mm2-platano-nervio" />
            </g>
          ))}
          <rect x="289" y="1180" width="6" height="18" rx="2.6" className="mm2-platano-tallo" />
          <g className="mm2-racimo">
            {[[284, 1168], [281, 1174], [284, 1180]].map(([cx, cy]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" />
            ))}
            <ellipse cx="281" cy="1188" rx="2.6" ry="3.6" className="mm2-bellota" />
          </g>
        </g>
        <g className="mm2-cana">
          {[176, 188, 200, 212].map((x, i) => (
            <g key={x}>
              <path d={`M${x} 1252 Q${x + (i % 2 ? 5 : -5)} 1222 ${x + (i % 2 ? 2 : -2)} 1200`} className="mm2-cana-tallo" />
              <path d={`M${x + (i % 2 ? 2 : -2)} 1204 q-6 -6 -10 -7 M${x + (i % 2 ? 2 : -2)} 1204 q6 -7 10 -8`} className="mm2-cana-hoja" />
            </g>
          ))}
        </g>

        {/* ── RÍO: orillas, reflejo del cielo, cascada entre pisos, flujo ── */}
        <path
          className="mm2-rio-orilla"
          d="M236 1004 Q248 1050 232 1096 Q214 1146 228 1196 Q244 1250 214 1300 Q186 1350 196 1400 L204 1442 L146 1442 Q136 1390 158 1338 Q182 1290 168 1240 Q152 1186 172 1136 Q192 1090 208 1052 Q218 1024 224 1004 Z"
          fill="none"
        />
        <path
          className="mm2-rio"
          d="M236 1004 Q248 1050 232 1096 Q214 1146 228 1196 Q244 1250 214 1300 Q186 1350 196 1400 L204 1442 L146 1442 Q136 1390 158 1338 Q182 1290 168 1240 Q152 1186 172 1136 Q192 1090 208 1052 Q218 1024 224 1004 Z"
          fill="url(#mm2p-rio)"
        />
        {/* reflejo del cielo sobre el agua */}
        <path
          d="M236 1004 Q248 1050 232 1096 Q214 1146 228 1196 Q244 1250 214 1300 Q186 1350 196 1400 L204 1442 L146 1442 Q136 1390 158 1338 Q182 1290 168 1240 Q152 1186 172 1136 Q192 1090 208 1052 Q218 1024 224 1004 Z"
          fill="url(#mm2p-reflejo)"
        />
        {/* cascada: el río salta el borde templado→cálido */}
        <g className="mm2-cascada">
          <path className="mm2-cascada-caida" d="M222 1062 L234 1062 L236 1082 L219 1082 Z" />
          <circle className="mm2-espuma" cx="222" cy="1084" r="2.6" />
          <circle className="mm2-espuma" cx="229" cy="1086" r="3" />
          <circle className="mm2-espuma" cx="235" cy="1084" r="2.2" />
        </g>
        <g className="mm2-flujo">
          <path d="M226 1030 Q234 1072 222 1112 Q206 1158 218 1204" />
          <path d="M228 1230 Q238 1272 210 1318 Q188 1356 194 1404" />
          <path d="M212 1080 Q200 1130 212 1178" />
        </g>
        <ellipse className="mm2-piedra" cx="182" cy="1368" rx="8" ry="5" />
        <ellipse className="mm2-piedra" cx="222" cy="1322" rx="6" ry="4" />

        {/* Sangrado del valle: el paisaje continúa bajo el viewBox */}
        <rect x="-2" y="1436" width="394" height="156" className="mm2-piso-valle" />
        <path
          d="M146 1436 L204 1436 L212 1548 Q186 1572 152 1548 Z"
          fill="url(#mm2p-rio)"
        />
        <ellipse className="mm2-piedra" cx="240" cy="1478" rx="9" ry="5" />
        <ellipse className="mm2-piedra" cx="132" cy="1508" rx="7" ry="4" />
        <g className="mm2-pajonal">
          <path d="M110 1490 q-3 -10 -7 -13 M110 1490 q0 -12 1 -15 M110 1490 q4 -9 8 -12" />
          <path d="M266 1500 q-3 -9 -6 -11 M266 1500 q0 -10 1 -13 M266 1500 q3 -8 7 -10" />
        </g>

        {/* Luz direccional de ladera (el astro a la derecha) */}
        <rect x="-2" y="120" width="394" height="1470" fill="url(#mm2p-ladera)" pointerEvents="none" />
      </g>

    </svg>
  );
}

// ── Capa 5: NIEBLA VOLUMÉTRICA entre pisos (la del valle SUBE) — f 1.12 ─────
function NieblaSvg() {
  return (
    <svg className="mm2-svg" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="mm2n-nucleo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" className="mm2-stop-niebla-a" />
          <stop offset="1" className="mm2-stop-niebla-b" />
        </radialGradient>
      </defs>
      {/* banco páramo/frío */}
      <g className="mm2-banco-1">
        <ellipse cx="110" cy="562" rx="150" ry="24" fill="url(#mm2n-nucleo)" />
        <ellipse cx="280" cy="578" rx="120" ry="19" fill="url(#mm2n-nucleo)" />
      </g>
      {/* banco frío/templado */}
      <g className="mm2-banco-2">
        <ellipse cx="290" cy="808" rx="150" ry="24" fill="url(#mm2n-nucleo)" />
        <ellipse cx="90" cy="822" rx="110" ry="18" fill="url(#mm2n-nucleo)" />
      </g>
      {/* banco templado/cálido */}
      <g className="mm2-banco-3">
        <ellipse cx="110" cy="1070" rx="140" ry="22" fill="url(#mm2n-nucleo)" />
        <ellipse cx="300" cy="1082" rx="100" ry="16" fill="url(#mm2n-nucleo)" />
      </g>
      {/* niebla de valle: nace sobre el río, sube y se disipa */}
      <g className="mm2-banco-valle">
        <ellipse cx="190" cy="1350" rx="190" ry="34" fill="url(#mm2n-nucleo)" />
        <ellipse cx="90" cy="1382" rx="120" ry="24" fill="url(#mm2n-nucleo)" />
      </g>
      <g className="mm2-banco-valle-2">
        <ellipse cx="290" cy="1400" rx="150" ry="28" fill="url(#mm2n-nucleo)" />
      </g>
      {/* Jirones: hilachas finas de niebla que derivan en contra de los
          bancos grandes — la textura deshilachada de la niebla real */}
      <g className="mm2-jirones">
        <ellipse cx="60" cy="588" rx="52" ry="7" fill="url(#mm2n-nucleo)" />
        <ellipse cx="248" cy="598" rx="38" ry="5" fill="url(#mm2n-nucleo)" />
        <ellipse cx="330" cy="828" rx="58" ry="8" fill="url(#mm2n-nucleo)" />
        <ellipse cx="70" cy="842" rx="42" ry="6" fill="url(#mm2n-nucleo)" />
        <ellipse cx="186" cy="1094" rx="66" ry="9" fill="url(#mm2n-nucleo)" />
        <ellipse cx="300" cy="1342" rx="54" ry="8" fill="url(#mm2n-nucleo)" />
      </g>
    </svg>
  );
}

// ── Capa 6: PRIMER PLANO botánico (enmarca el plano; sale al alejar) — f 1.3 ─
// Cada grupo vive a la altura que le corresponde según el piso encuadrado
// (con f=1.3 el pie de pantalla cae más abajo en el viewBox — por eso las
// formas del cálido/río se dibujan pasado 1440; overflow visible del SVG).
function PrimerPlanoSvg() {
  return (
    <svg className="mm2-svg" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      {/* nevado: filo de roca */}
      <path className="mm2-cerca-forma-suave" d="M-4 640 Q40 596 96 608 Q60 626 44 648 L-4 664 Z" />
      {/* páramo: silueta de frailejón grande a la izquierda */}
      <g className="mm2-cerca-forma">
        <rect x="18" y="742" width="9" height="52" rx="4" />
        {[-64, -32, 0, 32, 64].map((a) => (
          <ellipse key={a} cx="22.5" cy="726" rx="4.4" ry="18" transform={`rotate(${a} 22.5 740)`} />
        ))}
      </g>
      {/* frío: rama de arbusto por la derecha */}
      <g className="mm2-cerca-forma-suave">
        <path d="M394 1046 Q340 1030 300 1044 Q336 1052 360 1066 L394 1078 Z" />
        <path d="M394 1084 Q352 1076 326 1088 Q356 1094 372 1104 L394 1112 Z" />
      </g>
      {/* templado: hojas grandes de cafetal por ambas esquinas */}
      <g className="mm2-cerca-forma">
        <path d="M-4 1408 Q28 1354 78 1338 Q42 1382 34 1428 L-4 1442 Z" />
        <path d="M394 1400 Q356 1352 310 1340 Q348 1384 356 1430 L394 1442 Z" />
      </g>
      {/* cálido/río: hoja de plátano gigante + juncos (bajo el viewBox) */}
      <g className="mm2-cerca-forma">
        <path d="M-4 1700 Q40 1600 120 1570 Q64 1636 48 1706 L-4 1730 Z" />
        <path d="M394 1690 Q348 1610 280 1584 Q330 1646 344 1712 L394 1734 Z" />
      </g>
      <g className="mm2-cerca-forma-suave">
        <path d="M150 1740 q-3 -44 -8 -56 M170 1742 q0 -50 -2 -62 M190 1740 q3 -46 8 -58" />
        <path d="M240 1744 q-2 -40 -6 -50 M258 1744 q1 -44 3 -54" />
      </g>
    </svg>
  );
}

// `onBack` con default: los tests montan el mockup sin prop (gate tsc checkJs).
export default function MontanaMundosCampesino({ onBack = null }) {
  const [modo, setModo] = useState('finca'); // 'finca' | 'montana'
  const [piso, setPiso] = useState(PISO_FINCA);
  const [aviso, setAviso] = useState(null);
  // Hoja de escena real: null | 'organismo' | 'guardian' | 'arbol'.
  const [escena, setEscena] = useState(null);
  // Píldora de voz (mock visual, sin STT): mientras "escucha", la cámara
  // corre sola la secuencia gran plano general → regreso a la finca.
  const [vozActiva, setVozActiva] = useState(false);
  const vozTimers = useRef([]);
  const avisoTimer = useRef(null);
  const viewportRef = useRef(null);
  const [vp, setVp] = useState({ w: 390, h: 700 });

  // ── Pasada 3: la cámara sabe cuándo VIAJA y cuándo LLEGA a la finca ──
  // viaje: mientras el plano se mueve, la niebla se abre y las etiquetas
  // se retiran. llegada: al arribar al piso de la finca se dispara el
  // momento de bienvenida — bloom, anillos, chispas. Ambos se marcan en
  // los manejadores de gesto (no en un efecto) y un timer los apaga.
  // La app abre centrada en la finca: la llegada corre desde el arranque.
  const [viaje, setViaje] = useState(false);
  const [llegada, setLlegada] = useState(true);
  const viajeTimer = useRef(null);
  const llegadaTimer = useRef(null);
  const marcarCine = (nuevoModo, nuevoPiso) => {
    setViaje(true);
    if (viajeTimer.current) clearTimeout(viajeTimer.current);
    // El zoom a la montaña completa viaja más lento que el paso de piso.
    // 2000ms cubre la capa más lenta del zoom-out (cielo: 1.9s) — la niebla
    // no se cierra antes de que la cámara asiente.
    viajeTimer.current = setTimeout(() => setViaje(false), nuevoModo === 'montana' ? 2000 : 1050);
    if (nuevoModo === 'finca' && nuevoPiso === PISO_FINCA) {
      setLlegada(true);
      if (llegadaTimer.current) clearTimeout(llegadaTimer.current);
      llegadaTimer.current = setTimeout(() => setLlegada(false), 3600);
    }
  };
  useEffect(() => {
    // Apaga el momento de llegada inicial y limpia los timers al salir.
    llegadaTimer.current = setTimeout(() => setLlegada(false), 3600);
    return () => {
      if (viajeTimer.current) clearTimeout(viajeTimer.current);
      if (llegadaTimer.current) clearTimeout(llegadaTimer.current);
    };
  }, []);

  useEffect(() => {
    const medir = () => {
      const el = viewportRef.current;
      if (el) setVp({ w: el.clientWidth, h: el.clientHeight });
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);

  const t = useMemo(() => calcularTransform(vp, modo, piso), [vp, modo, piso]);
  const escenaH = vp.w * (VB_H / VB_W);

  // Transform por capa: la cámara base viaja completa (f=1); las capas
  // lejanas la siguen amortiguadas y las cercanas la adelantan — parallax.
  const transformCapa = (f) => `translate3d(${t.tx}px, ${t.ty * f}px, 0) scale(${t.s})`;

  const avisar = (texto) => {
    setAviso(texto);
    if (avisoTimer.current) clearTimeout(avisoTimer.current);
    avisoTimer.current = setTimeout(() => setAviso(null), 2600);
  };
  useEffect(() => () => { if (avisoTimer.current) clearTimeout(avisoTimer.current); }, []);

  // Gestos: pellizco (2 dedos) alterna finca ↔ montaña; deslizar vertical
  // (1 dedo) camina de piso; la rueda del mouse también camina la montaña.
  const pinchRef = useRef(null);
  const swipeRef = useRef(null);
  const ruedaRef = useRef({ acumulado: 0, bloqueadaHasta: 0 });
  const distancia = (touches) =>
    Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      pinchRef.current = distancia(e.touches);
      swipeRef.current = null;
    } else if (e.touches.length === 1) {
      swipeRef.current = e.touches[0].clientY;
    }
  };
  // Todo movimiento de cámara pasa por aquí: cambia el estado Y marca el
  // viaje (y la llegada si el destino es la finca) para el pulido de cine.
  const caminarA = (nuevoPiso) => { setPiso(nuevoPiso); marcarCine('finca', nuevoPiso); };
  const cambiarModo = (nuevoModo) => {
    if (nuevoModo === modo) return;
    setModo(nuevoModo);
    marcarCine(nuevoModo, piso);
  };
  const onTouchMove = (e) => {
    if (e.touches.length === 2 && pinchRef.current != null) {
      const razon = distancia(e.touches) / pinchRef.current;
      if (razon < 0.78) { cambiarModo('montana'); pinchRef.current = null; }
      if (razon > 1.28) { cambiarModo('finca'); pinchRef.current = null; }
    }
  };
  const onTouchEnd = (e) => {
    if (pinchRef.current == null && swipeRef.current != null && modo === 'finca' && e.changedTouches.length === 1) {
      const delta = e.changedTouches[0].clientY - swipeRef.current;
      if (delta < -72 && piso < PISOS.length - 1) caminarA(piso + 1); // desliza arriba → baja la montaña
      if (delta > 72 && piso > 0) caminarA(piso - 1); // desliza abajo → sube la montaña
    }
    if (e.touches.length < 2) pinchRef.current = null;
    if (e.touches.length === 0) swipeRef.current = null;
  };
  const onWheel = (e) => {
    if (modo !== 'finca') return;
    const ahora = e.timeStamp; // reloj del evento (ms): estable y sin impurezas en render
    const rueda = ruedaRef.current;
    if (ahora < rueda.bloqueadaHasta) return;
    rueda.acumulado += e.deltaY;
    if (rueda.acumulado > 140 && piso < PISOS.length - 1) {
      caminarA(piso + 1); // rueda abajo → baja la montaña
      rueda.acumulado = 0;
      rueda.bloqueadaHasta = ahora + 700;
    } else if (rueda.acumulado < -140 && piso > 0) {
      caminarA(piso - 1); // rueda arriba → sube la montaña
      rueda.acumulado = 0;
      rueda.bloqueadaHasta = ahora + 700;
    }
  };

  const alternarZoom = () => cambiarModo(modo === 'finca' ? 'montana' : 'finca');
  const irAPiso = (i) => { setPiso(i); setModo('finca'); marcarCine('finca', i); };
  const pisoActual = PISOS[piso];
  const pisoFinca = PISOS[PISO_FINCA];

  // ── Entrada por voz (mock): la montaña "escucha" y la cámara viaja sola —
  // gran plano general, respiro, y regreso a la finca con la llegada. ──
  const escucharVoz = () => {
    if (vozActiva) return;
    setVozActiva(true);
    avisar('La montaña lo escuchó: mírela completa…');
    cambiarModo('montana');
    vozTimers.current.push(setTimeout(() => {
      irAPiso(PISO_FINCA);
      avisar('…y de vuelta a su finca. Así funcionará con su voz.');
    }, 2600));
    vozTimers.current.push(setTimeout(() => setVozActiva(false), 4600));
  };
  useEffect(() => () => { vozTimers.current.forEach(clearTimeout); }, []);

  const pct = (v, total) => `${(v / total) * 100}%`;

  return (
    <div
      /* mm4 sobre la base mm2: hereda TODO el cine de la pasada 3 y la piel
         campesina re-tiñe encima (una sola dirección de arte: bandada, aves
         y colibrí viven en la base). --mm2-esc publica la escala de cámara:
         los rótulos de piso la compensan (1/s) para leerse a tamaño real
         también en la montaña completa. */
      className="mm2 mm4"
      style={{ '--mm2-esc': t.s }}
      data-modo={modo}
      data-piso={pisoActual.id}
      data-viaje={viaje ? 'true' : undefined}
      data-llegada={llegada ? 'true' : undefined}
      data-voz={vozActiva ? 'true' : undefined}
    >
      <div
        className="mm2-viewport"
        ref={viewportRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onWheel={onWheel}
        data-testid="mm2-viewport"
      >
        {/* ── Las 6 capas de la cámara (lejos → cerca) ── */}
        <div className="mm2-capa mm2-capa-cielo" style={{ height: `${escenaH}px`, transform: transformCapa(CAPAS_F.cielo) }}>
          <CieloSvg />
        </div>
        <div className="mm2-capa mm2-capa-lejos" style={{ height: `${escenaH}px`, transform: transformCapa(CAPAS_F.lejos) }}>
          <CordilleraLejosSvg />
        </div>
        <div className="mm2-capa mm2-capa-medio" style={{ height: `${escenaH}px`, transform: transformCapa(CAPAS_F.medio) }}>
          <CordilleraMediaSvg />
        </div>

        {/* Capa principal: la montaña con sus pisos y mundos tocables */}
        <div
          className="mm2-capa mm2-capa-principal"
          style={{ height: `${escenaH}px`, transform: transformCapa(CAPAS_F.principal) }}
        >
          <MontanaPrincipalSvg />

          {/* Velos: en modo finca, los pisos no activos quedan tenues */}
          <div className="mm2-velo mm2-velo-arriba" style={{ height: pct(pisoActual.y0, VB_H) }} aria-hidden="true" />
          <div className="mm2-velo mm2-velo-abajo" style={{ top: pct(pisoActual.y1, VB_H) }} aria-hidden="true" />

          {/* SU PISO RESALTADO (idea 1): en la montaña completa, el piso de
              la finca brilla con un resalte de oro que respira y los demás
              pisos quedan levemente empolvados — se ven, pero el suyo llama. */}
          <div className="mm4-empolvado" style={{ top: 0, height: pct(pisoFinca.y0, VB_H) }} aria-hidden="true" />
          <div
            className="mm4-resalte"
            style={{ top: pct(pisoFinca.y0, VB_H), height: pct(pisoFinca.y1 - pisoFinca.y0, VB_H) }}
            data-testid="mm4-resalte"
            aria-hidden="true"
          />
          <div className="mm4-empolvado" style={{ top: pct(pisoFinca.y1, VB_H), bottom: 0 }} aria-hidden="true" />

          {/* Marcador de la finca: con nombre propio — se reconoce de una */}
          <div className="mm2-finca-pin" style={{ left: pct(190, VB_W), top: pct(700, VB_H) }} aria-hidden="true">
            ⭐ Finca {FINCA.nombre}
          </div>

          {/* Momento de LLEGADA a la finca (heredado de la pasada 3): bloom
              de hora dorada sobre la casa —ahora en el clima frío—, anillos,
              chispas del fogón, y NUEVO: la cinta de reconocimiento. */}
          {llegada && (
            <div
              className="mm2-llegada"
              style={{ left: pct(190, VB_W), top: pct(748, VB_H) }}
              data-testid="mm2-llegada"
              aria-hidden="true"
            >
              <span className="mm2-llegada-bloom" />
              <span className="mm2-llegada-anillo" />
              <span className="mm2-llegada-anillo mm2-anillo-2" />
              {CHISPAS.map((c) => (
                <span
                  key={`${c.dx}-${c.dy}`}
                  className="mm2-chispa"
                  style={{ '--mm2-cdx': `${c.dx}px`, '--mm2-cdy': `${c.dy}px`, '--mm2-cd': `${c.demora}s` }}
                />
              ))}
              <span className="mm4-cinta">La montaña reconoce su finca</span>
            </div>
          )}

          {/* Mundos tocables: halo que pulsa + etiqueta. En SU piso hablan
              concreto (dato de muestra) y los que llevan `escena` abren una
              ESCENA REAL del home vivo (idea 3) — nada de cajas genéricas. */}
          {MUNDOS.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`mm2-mundo${modo === 'finca' && m.piso !== piso ? ' es-tenue' : ''}${m.escena ? ' mm4-abre-escena' : ''}`}
              style={{ left: pct(m.x, VB_W), top: pct(m.y, VB_H) }}
              data-testid={`mm2-mundo-${m.id}`}
              aria-label={`${m.etiqueta}: abre ${m.abre}`}
              onClick={() => {
                if (m.escena) { setEscena(m.escena); return; }
                avisar(`Aquí se abre ${m.abre}.`);
                // Navegar a la ruta 2D correspondiente (wire nav 3D→2D)
                setTimeout(() => navegarDesde3D(m.id), 600);
              }}
            >
              <span className="mm2-mundo-halo" aria-hidden="true" />
              <span className="mm2-mundo-etiqueta">
                {m.etiqueta}
                {m.dato && <span className="mm4-mundo-dato">{m.dato}</span>}
              </span>
            </button>
          ))}

          {/* Franjas de piso: en la montaña completa, tocar un piso lo acerca.
              La franja de SU piso lo dice sin rodeos: SU FINCA ESTÁ AQUÍ. */}
          {PISOS.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={`mm2-franja${p.finca ? ' mm4-es-suya' : ''}`}
              style={{ top: pct(p.y0, VB_H), height: pct(p.y1 - p.y0, VB_H) }}
              data-testid={`mm2-franja-${p.id}`}
              tabIndex={modo === 'montana' ? 0 : -1}
              aria-label={p.finca
                ? `Su finca está aquí: ${p.nombre}, ${p.msnm}. Acercarse`
                : `Acercarse a ${p.nombre}, ${p.msnm}`}
              onClick={() => irAPiso(i)}
            >
              {/* El mensaje-bandera va corto: a tamaño real (rotulo con 1/s)
                  el texto largo no cabe en el ancho del teléfono; el piso y
                  la altura completos viven en el aria-label. */}
              <span className="mm2-franja-rotulo">
                {p.finca ? '⭐ SU FINCA ESTÁ AQUÍ' : `${p.nombre} · ${p.msnm}`}
              </span>
            </button>
          ))}
        </div>

        <div className="mm2-capa mm2-capa-niebla" style={{ height: `${escenaH}px`, transform: transformCapa(CAPAS_F.niebla) }}>
          <NieblaSvg />
        </div>
        <div className="mm2-capa mm2-capa-cerca" style={{ height: `${escenaH}px`, transform: transformCapa(CAPAS_F.cerca) }}>
          <PrimerPlanoSvg />
        </div>

        {/* ── Luz de cine fija al encuadre ── */}
        <div className="mm2-grades" aria-hidden="true">
          {PISOS.map((p) => (
            <div key={p.id} className={`mm2-grade mm2-grade-${p.id}${p.id === pisoActual.id ? ' es-activo' : ''}`} />
          ))}
        </div>
        <div className="mm2-vineta" aria-hidden="true" />
        <div className="mm2-scrim-arriba" aria-hidden="true" />
        <div className="mm2-scrim-abajo" aria-hidden="true" />

        {/* Indicador del piso + pasos para caminar la montaña */}
        <div className="mm2-brujula" data-testid="mm2-brujula">
          <span className="mm2-brujula-piso">
            {pisoActual.nombre} · {pisoActual.msnm}{pisoActual.finca ? ' — aquí está su finca ⭐' : ''}
          </span>
        </div>
        {modo === 'finca' && piso > 0 && (
          <button type="button" className="mm2-paso mm2-paso-arriba" data-testid="mm2-paso-arriba" onClick={() => caminarA(piso - 1)}>
            ▲ Subir a {PISOS[piso - 1].nombre}
          </button>
        )}
        {modo === 'finca' && piso < PISOS.length - 1 && (
          <button type="button" className="mm2-paso mm2-paso-abajo" data-testid="mm2-paso-abajo" onClick={() => caminarA(piso + 1)}>
            ▼ Bajar a {PISOS[piso + 1].nombre}
          </button>
        )}

        {/* ── ENTRADA POR VOZ (idea 2, mock visual): la puerta grande de la
            pasada 4. Tocarla corre la secuencia de cámara completa — la
            montaña "lo escucha" y lo lleva. Sin STT: solo el gesto. ── */}
        <button
          type="button"
          className="mm4-voz"
          data-testid="mm4-voz"
          aria-label="Entrada por voz, de muestra: diga muéstrame mi montaña"
          onClick={escucharVoz}
        >
          <span className="mm4-voz-mic" aria-hidden="true">🎙</span>
          {vozActiva ? 'Lo está escuchando…' : 'Diga: «muéstrame mi montaña»'}
        </button>

        {/* Alternador de zoom: sigue vivo, pero cede el protagonismo a la voz */}
        <button type="button" className="mm2-zoom" data-testid="mm2-zoom-toggle" onClick={alternarZoom}>
          {modo === 'finca' ? '🏔 Ver toda la montaña' : '🏡 Volver a mi finca'}
        </button>

        {/* ── Cabecera del mockup: la CÉDULA DE LA FINCA (concreto, suyo) ── */}
        <header className="mm2-cabecera">
          <div className="mm2-mockbar">
            <button type="button" className="mm2-volver" onClick={() => onBack && onBack()}>← Volver</button>
            <span className="mm2-mockbar-titulo">Mockup · pasada 4 · campesina</span>
          </div>
          <h1 className="mm2-titulo">La Montaña de los Mundos</h1>
          <div className="mm4-cedula" data-testid="mm4-cedula">
            <span className="mm4-cedula-nombre">⭐ Finca {FINCA.nombre} — vereda {FINCA.vereda}</span>
            <span className="mm4-cedula-dato">{FINCA.clima} · {FINCA.hoy}</span>
          </div>
        </header>

        {/* ── Atajos permanentes: nada queda detrás de escalar la montaña ── */}
        <nav className="mm2-atajos" aria-label="Atajos permanentes">
          <button
            type="button"
            className="mm2-atajo-anotar"
            data-testid="mm2-atajo-anotar"
            onClick={() => avisar('Aquí se anota lo que hizo hoy en su finca.')}
          >
            📝 Anotar mi día
          </button>
          <button
            type="button"
            className="mm2-atajo-agente"
            data-testid="mm2-atajo-agente"
            aria-label="Hablar con Chagra, el agente"
            onClick={() => avisar('Aquí se abre el agente: pregunte con su voz.')}
          >
            Ⓐ
          </button>
        </nav>
      </div>

      {/* ── HOJA DE ESCENA REAL (idea 3): el nodo-mundo no abre una caja —
          abre la escena de verdad del home vivo, sobre la montaña, con
          noche de cine detrás. SceneFincaOrganismo llega con datos de
          muestra; GuardianEspiritu y ArbolDeMundos son los componentes
          reales tal cual viven en el dashboard. ── */}
      {escena && (
        <div className="mm4-hoja" role="dialog" aria-modal="true" aria-label={ESCENAS[escena].titulo} data-testid="mm4-hoja">
          <button
            type="button"
            className="mm4-hoja-fondo"
            aria-label="Cerrar la escena"
            onClick={() => setEscena(null)}
          />
          <div className="mm4-hoja-panel">
            <header className="mm4-hoja-cabeza">
              <div>
                <h2 className="mm4-hoja-titulo">{ESCENAS[escena].titulo}</h2>
                <p className="mm4-hoja-sub">{ESCENAS[escena].sub}</p>
              </div>
              <button
                type="button"
                className="mm4-hoja-cerrar"
                data-testid="mm4-hoja-cerrar"
                onClick={() => setEscena(null)}
              >
                ✕ Cerrar
              </button>
            </header>
            <div className="mm4-hoja-cuerpo">
              {escena === 'organismo' && (
                <div className="mm4-escena-fvo">
                  <SceneFincaOrganismo
                    estructura={{ tiene: true, forma: 'invernadero' }}
                    onAnimales={() => avisar('Aquí se abre el mundo de sus animales.')}
                    onPregunte={() => avisar('Aquí se abre el agente: pregunte con su voz.')}
                  />
                </div>
              )}
              {escena === 'guardian' && (
                <GuardianEspiritu
                  onChange={(id, especie) => avisar(`Su guardián ahora es ${especie?.nombre || 'otra especie'}.`)}
                />
              )}
              {escena === 'arbol' && (
                <ArbolDeMundos
                  onNavigate={() => avisar('Aquí se entra a ese mundo de su finca.')}
                  mostrarAnimales
                  plantsCount={34}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {aviso && (
        <output className="mm2-aviso" data-testid="mm2-aviso">{aviso}</output>
      )}
    </div>
  );
}
