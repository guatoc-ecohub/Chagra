import React from 'react';
import './laminas.css';

/**
 * LaminaMataEtapa — la lámina VIVA de una mata individual.
 *
 * Misma familia que `LaminaSiembra`/`LaminaAporque` (cuaderno de campo: corte de
 * suelo, trazo redondo, formas simples, colores de tinta sobre papel) pero aquí
 * el dibujo NO es fijo: cambia según la ETAPA real de la mata. Cada etapa se
 * compone distinta —
 *
 *   semilla    la semilla enterrada, con su radícula asomando          (bajo tierra)
 *   plántula   el tallito que rompe el suelo: dos cotiledones + 1 hoja  (recién nacida)
 *   juvenil    la mata que crece: varias hojas, sin flor                (creciendo)
 *   adulta     la mata hecha, con su tutor y raíz honda                 (robusta)
 *   floración  la misma mata, ahora con racimos de flor amarilla        (florece)
 *   cosecha    los racimos cargados de tomate maduro colgando           (da fruto)
 *
 * Es DECORATIVA (aria-hidden): la ficha de al lado narra el estado real. El
 * dibujo respira con las etapas — la raíz se hace honda, el tallo sube, la copa
 * se llena — para que se LEA la evolución sin leer una palabra. Sin dependencia
 * de las variables --c-* del tema: es una hoja de papel pegada encima, legible
 * al sol sobre los cuatro temas. rsvg-safe (sin <text>, sin emoji-en-SVG).
 *
 * El ancho/alto de la lámina y la animación de crecimiento al cambiar de etapa
 * viven en `laminas.css` (clases `lam-mata-svg` / `lam-mata-brota`), y son
 * reduced-motion-safe (sin animación → fotograma final digno).
 *
 * @param {Object} props
 * @param {'semilla'|'plantula'|'juvenil'|'adulto'|'floracion'|'cosecha'} props.etapa
 * @param {string} [props.className]
 */

// ── Paleta de tinta (fija, para leerse al sol; no hereda del tema) ──────────────
const C = {
  cielo: '#f4f6ea',
  sol: '#e9c33f',
  tierra: '#e7dabb',
  tierraHonda: '#d9c79c',
  surco: '#b98a2f',
  raiz: '#a9843f',
  raizHonda: '#8a6a2f',
  tallo: '#3f8f4e',
  talloHondo: '#2f6b3a',
  hoja: '#4a9b57',
  hojaTierna: '#7cba5a',
  vena: '#2f6b3a',
  cotiledon: '#9ccb6a',
  flor: '#f2c53d',
  florCentro: '#c9962c',
  frutoMaduro: '#cc4b37',
  frutoVerde: '#8aa54e',
  caliz: '#3f8f4e',
};

// Una hoja ovada con nervadura (apunta hacia arriba desde su base en 0,0).
function Hoja({ rot = 0, escala = 1, tono = C.hoja }) {
  return (
    <g transform={`rotate(${rot}) scale(${escala})`}>
      <path
        d="M0 0 C -11 -9 -10 -25 0 -33 C 10 -25 11 -9 0 0 Z"
        fill={tono}
        stroke={C.talloHondo}
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <g stroke={C.vena} strokeWidth="0.9" strokeLinecap="round" fill="none" opacity="0.55">
        <path d="M0 -2 L0 -30" />
        <path d="M0 -12 L-6 -17" />
        <path d="M0 -12 L6 -17" />
        <path d="M0 -20 L-5 -25" />
        <path d="M0 -20 L5 -25" />
      </g>
    </g>
  );
}

// Flor de tomate: cinco pétalos en estrella + centro ocre.
function Flor({ x = 0, y = 0, escala = 1 }) {
  const petalos = [0, 72, 144, 216, 288];
  return (
    <g transform={`translate(${x} ${y}) scale(${escala})`}>
      {petalos.map((a) => (
        <ellipse key={a} cx="0" cy="-6" rx="2.6" ry="5.2" fill={C.flor} stroke={C.florCentro} strokeWidth="0.5" transform={`rotate(${a})`} />
      ))}
      <circle cx="0" cy="0" r="2.4" fill={C.florCentro} />
    </g>
  );
}

// Tomate: fruto con brillo y su cáliz de estrella verde arriba.
function Tomate({ x = 0, y = 0, r = 7, maduro = true }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="0" cy="0" r={r} fill={maduro ? C.frutoMaduro : C.frutoVerde} stroke={C.raizHonda} strokeWidth="0.6" />
      <ellipse cx={-r * 0.32} cy={-r * 0.34} rx={r * 0.34} ry={r * 0.22} fill="#ffffff" opacity="0.35" />
      <g stroke={C.caliz} strokeWidth="1.4" strokeLinecap="round" fill="none">
        <path d={`M0 ${-r} l-3 -3`} />
        <path d={`M0 ${-r} l0 -4`} />
        <path d={`M0 ${-r} l3 -3`} />
      </g>
    </g>
  );
}

// Raíces: pivotante honda + laterales. `hondura` en px marca cuánto baja.
function Raices({ hondura = 40 }) {
  const lat = Math.min(1, hondura / 80);
  return (
    <g stroke={C.raiz} fill="none" strokeLinecap="round">
      <path d={`M0 0 q 4 ${hondura * 0.4} -2 ${hondura}`} strokeWidth="2.4" stroke={C.raizHonda} />
      <path d={`M0 6 q -${18 * lat} 8 -${24 * lat} ${28 * lat}`} strokeWidth="1.6" />
      <path d={`M0 12 q ${18 * lat} 8 ${26 * lat} ${30 * lat}`} strokeWidth="1.6" />
      <path d={`M-2 ${hondura * 0.45} q -${10 * lat} 6 -${14 * lat} ${18 * lat}`} strokeWidth="1.2" />
      <path d={`M0 ${hondura * 0.6} q ${10 * lat} 6 ${13 * lat} ${16 * lat}`} strokeWidth="1.2" />
    </g>
  );
}

// El tutor (estaca) con sus amarres, para la mata ya hecha.
function Tutor() {
  return (
    <g>
      <line x1="24" y1="2" x2="24" y2="-112" stroke={C.surco} strokeWidth="4" strokeLinecap="round" />
      <g stroke={C.raizHonda} strokeWidth="1.4" strokeLinecap="round">
        <path d="M24 -30 q -12 -3 -22 -1" fill="none" />
        <path d="M24 -66 q -14 -3 -24 -2" fill="none" />
        <path d="M24 -96 q -12 -2 -20 -2" fill="none" />
      </g>
    </g>
  );
}

// ── Cada etapa dibuja su propia mata (arte por etapa) ───────────────────────────
function MataPorEtapa({ etapa }) {
  switch (etapa) {
    case 'semilla':
      return (
        <g>
          <Raices hondura={30} />
          {/* la semilla enterrada, inclinada */}
          <g transform="rotate(-18)">
            <ellipse cx="0" cy="16" rx="12" ry="8" fill={C.tierraHonda} stroke={C.raiz} strokeWidth="1.2" />
            <path d="M-7 16 q 7 -4 14 0" fill="none" stroke={C.raizHonda} strokeWidth="0.9" />
          </g>
          {/* radícula que empieza a bajar */}
          <path d="M0 22 q 3 12 -2 24" fill="none" stroke={C.raizHonda} strokeWidth="1.8" strokeLinecap="round" />
          {/* el ganchito del brote que va a asomar */}
          <path d="M0 8 q -2 -8 2 -13" fill="none" stroke={C.hojaTierna} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      );
    case 'plantula':
      return (
        <g>
          <Raices hondura={40} />
          {/* tallito */}
          <path d="M0 0 q -2 -22 0 -46" fill="none" stroke={C.tallo} strokeWidth="3" strokeLinecap="round" />
          {/* dos cotiledones opuestos */}
          <ellipse cx="-11" cy="-44" rx="10" ry="4.6" fill={C.cotiledon} stroke={C.talloHondo} strokeWidth="0.7" transform="rotate(-18 -11 -44)" />
          <ellipse cx="11" cy="-44" rx="10" ry="4.6" fill={C.cotiledon} stroke={C.talloHondo} strokeWidth="0.7" transform="rotate(18 11 -44)" />
          {/* la primera hoja verdadera, tiernita */}
          <g transform="translate(0 -48)"><Hoja rot={0} escala={0.7} tono={C.hojaTierna} /></g>
        </g>
      );
    case 'juvenil':
      return (
        <g>
          <Raices hondura={58} />
          <path d="M0 0 q -3 -40 1 -82" fill="none" stroke={C.tallo} strokeWidth="4" strokeLinecap="round" />
          {/* hojas alternas subiendo */}
          <g transform="translate(-2 -22)"><Hoja rot={-58} escala={0.9} /></g>
          <g transform="translate(1 -40)"><Hoja rot={62} escala={0.95} /></g>
          <g transform="translate(-1 -58)"><Hoja rot={-52} escala={0.9} /></g>
          <g transform="translate(1 -72)"><Hoja rot={54} escala={0.85} /></g>
          <g transform="translate(0 -82)"><Hoja rot={0} escala={0.8} /></g>
        </g>
      );
    case 'adulto':
      return (
        <g>
          <Raices hondura={78} />
          <Tutor />
          <path d="M0 0 q -4 -54 2 -108" fill="none" stroke={C.talloHondo} strokeWidth="5" strokeLinecap="round" />
          <g transform="translate(-3 -24)"><Hoja rot={-62} escala={1.1} /></g>
          <g transform="translate(2 -40)"><Hoja rot={64} escala={1.15} /></g>
          <g transform="translate(-2 -58)"><Hoja rot={-58} escala={1.1} /></g>
          <g transform="translate(3 -74)"><Hoja rot={60} escala={1.05} /></g>
          <g transform="translate(-2 -90)"><Hoja rot={-54} escala={1} /></g>
          <g transform="translate(2 -102)"><Hoja rot={40} escala={0.9} /></g>
          <g transform="translate(0 -108)"><Hoja rot={0} escala={0.85} /></g>
        </g>
      );
    case 'floracion':
      return (
        <g>
          <Raices hondura={80} />
          <Tutor />
          <path d="M0 0 q -4 -54 2 -108" fill="none" stroke={C.talloHondo} strokeWidth="5" strokeLinecap="round" />
          <g transform="translate(-3 -26)"><Hoja rot={-62} escala={1.1} /></g>
          <g transform="translate(2 -44)"><Hoja rot={64} escala={1.1} /></g>
          <g transform="translate(-2 -64)"><Hoja rot={-58} escala={1.05} /></g>
          <g transform="translate(3 -82)"><Hoja rot={58} escala={1} /></g>
          <g transform="translate(0 -100)"><Hoja rot={0} escala={0.85} /></g>
          {/* racimos de flor amarilla colgando de los nudos */}
          <path d="M-6 -38 q -10 4 -14 12" fill="none" stroke={C.talloHondo} strokeWidth="1.4" />
          <Flor x={-16} y={-26} escala={0.85} />
          <Flor x={-24} y={-22} escala={0.75} />
          <path d="M8 -70 q 12 3 16 12" fill="none" stroke={C.talloHondo} strokeWidth="1.4" />
          <Flor x={20} y={-56} escala={0.9} />
          <Flor x={27} y={-50} escala={0.75} />
          <Flor x={14} y={-52} escala={0.7} />
        </g>
      );
    case 'cosecha':
      return (
        <g>
          <Raices hondura={82} />
          <Tutor />
          <path d="M0 0 q -4 -54 2 -108" fill="none" stroke={C.talloHondo} strokeWidth="5" strokeLinecap="round" />
          <g transform="translate(-3 -26)"><Hoja rot={-62} escala={1.05} /></g>
          <g transform="translate(2 -46)"><Hoja rot={64} escala={1.05} /></g>
          <g transform="translate(-2 -66)"><Hoja rot={-58} escala={1} /></g>
          <g transform="translate(3 -84)"><Hoja rot={58} escala={0.95} /></g>
          <g transform="translate(0 -100)"><Hoja rot={0} escala={0.8} /></g>
          {/* racimo cargado a la izquierda: maduros + uno verde */}
          <path d="M-6 -40 q -12 6 -16 16" fill="none" stroke={C.talloHondo} strokeWidth="1.6" />
          <Tomate x={-22} y={-22} r={7} maduro />
          <Tomate x={-12} y={-16} r={6.5} maduro />
          <Tomate x={-26} y={-33} r={5.5} maduro={false} />
          {/* racimo a la derecha */}
          <path d="M8 -72 q 14 6 18 16" fill="none" stroke={C.talloHondo} strokeWidth="1.6" />
          <Tomate x={26} y={-52} r={7} maduro />
          <Tomate x={16} y={-46} r={6} maduro />
          <Tomate x={30} y={-63} r={5.5} maduro={false} />
        </g>
      );
    default:
      return null;
  }
}

export default function LaminaMataEtapa({ etapa = 'semilla', className = '' }) {
  return (
    <svg
      viewBox="0 0 320 300"
      role="img"
      aria-hidden="true"
      className={['lam-mata-svg', className].filter(Boolean).join(' ')}
      data-testid="lamina-mata-etapa"
      data-etapa={etapa}
    >
      {/* cielo tenue */}
      <rect x="0" y="0" width="320" height="198" fill={C.cielo} />
      {/* sol de cuaderno, arriba a la derecha */}
      <g opacity="0.7">
        <circle cx="272" cy="40" r="15" fill={C.sol} />
        <g stroke={C.sol} strokeWidth="2.2" strokeLinecap="round">
          <line x1="272" y1="14" x2="272" y2="6" />
          <line x1="296" y1="40" x2="304" y2="40" />
          <line x1="290" y1="22" x2="296" y2="16" />
          <line x1="290" y1="58" x2="296" y2="64" />
        </g>
      </g>

      {/* corte de suelo: superficie ondulada + cuerpo de tierra */}
      <path d="M0 198 Q 80 192 160 197 T 320 195 L320 300 L0 300 Z" fill={C.tierra} />
      <path d="M0 198 Q 80 192 160 197 T 320 195" fill="none" stroke={C.surco} strokeWidth="2.2" strokeLinecap="round" opacity="0.6" />
      {/* motas de tierra (rsvg-safe, sin filtros) */}
      <g fill={C.surco} opacity="0.32">
        <circle cx="46" cy="232" r="2.1" />
        <circle cx="92" cy="262" r="1.6" />
        <circle cx="128" cy="240" r="1.9" />
        <circle cx="214" cy="230" r="2" />
        <circle cx="250" cy="264" r="1.7" />
        <circle cx="286" cy="238" r="2.1" />
        <circle cx="70" cy="284" r="1.5" />
        <circle cx="190" cy="278" r="1.8" />
      </g>

      {/* la mata, re-montada por etapa para que reanime su crecimiento */}
      <g key={etapa} transform="translate(160 197)" className="lam-mata-brota">
        <MataPorEtapa etapa={etapa} />
      </g>
    </svg>
  );
}
