import { useId } from 'react';
import { AutoDibujo } from '../../visual/effects';
import {
  Rotulo, TINTA, TINTA_2, VERDE, VERDE_OSC, VERDE_CLARO,
  GRANO, GRANO_OSC, NARANJA, TIERRA_CLARA, ROJO,
} from './_kit.jsx';

/*
 * LaminaMilpa — la MILPA (las "tres hermanas") dibujándose sola: el maíz que
 * hace de tutor, el frijol que trepa y fija el nitrógeno, y la calabaza que
 * tapa el suelo. Enseña la ASOCIACIÓN de cultivos.
 *
 * SVG propio e inline (sin imágenes ni deps nuevas). role="img" porque enseña:
 * lleva rótulos que son contenido. Colores fijos (tinta sobre papel crema). El
 * dibujo se traza solo con el auto-dibujado de effects (clases vfx-draw); en
 * reduced-motion aparece completo y quieto (lo garantiza effects.css).
 */
export default function LaminaMilpa({ className = '' } = {}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const suelo = 258; // línea del suelo

  return (
    <svg
      className={className}
      viewBox="0 0 400 320"
      role="img"
      aria-label="La milpa: el maíz sirve de tutor al frijol, que fija el nitrógeno, mientras la calabaza tapa el suelo."
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <title>La milpa: las tres hermanas</title>

      {/* ── suelo en corte ─────────────────────────────────────────────── */}
      <g className="vfx-t1">
        <AutoDibujo as="line" x1="18" y1={suelo} x2="382" y2={suelo} stroke={TINTA} strokeWidth="2.4" strokeLinecap="round" />
        <AutoDibujo as="path" fade fill={`${TIERRA_CLARA}22`} d={`M18 ${suelo} H382 V300 H18 Z`} stroke="none" />
      </g>

      {/* ── 1. MAÍZ (el tutor): caña central, hojas, penacho, mazorca ──── */}
      <g fill="none" stroke={VERDE_OSC} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <g className="vfx-t2">
          {/* caña */}
          <AutoDibujo as="path" d={`M200 ${suelo} C198 210 202 150 200 70`} stroke={VERDE_OSC} strokeWidth="3" />
          {/* nudos */}
          <AutoDibujo as="line" x1="194" y1="210" x2="206" y2="210" strokeWidth="2" />
          <AutoDibujo as="line" x1="195" y1="160" x2="205" y2="160" strokeWidth="2" />
        </g>
        <g className="vfx-t3">
          {/* hojas del maíz (arqueadas) */}
          <AutoDibujo as="path" d="M200 150 C168 138 150 152 132 176" stroke={VERDE} strokeWidth="3" />
          <AutoDibujo as="path" d="M200 118 C232 108 252 124 268 150" stroke={VERDE} strokeWidth="3" />
          <AutoDibujo as="path" d="M200 200 C172 196 156 210 142 232" stroke={VERDE} strokeWidth="3" />
          {/* penacho (flor macho) */}
          <AutoDibujo as="path" d="M200 70 C196 56 200 48 200 40" stroke={GRANO_OSC} strokeWidth="2" />
          <AutoDibujo as="path" d="M200 62 C206 52 210 48 214 42" stroke={GRANO_OSC} strokeWidth="2" />
          <AutoDibujo as="path" d="M200 60 C194 50 190 46 186 40" stroke={GRANO_OSC} strokeWidth="2" />
        </g>
        {/* mazorca */}
        <g className="vfx-t4">
          <AutoDibujo as="path" fade fill={GRANO} stroke={GRANO_OSC} strokeWidth="1.6"
            d="M214 150 q16 4 18 26 q-10 12 -20 4 q-8 -18 2 -30 Z" />
          <AutoDibujo as="path" d="M232 150 q6 -8 12 -8" stroke={ROJO} strokeWidth="1.6" /> {/* barbas */}
        </g>
      </g>

      {/* ── 2. FRIJOL (fija N): guía que trepa por la caña + nódulos ────── */}
      <g fill="none" stroke={VERDE_CLARO} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <g className="vfx-t5">
          {/* enredadera espiralando la caña */}
          <AutoDibujo as="path"
            d={`M188 ${suelo} C176 236 214 224 210 204 C206 184 176 178 184 156 C190 138 218 138 208 116 C202 100 184 100 190 84`} />
          {/* hojas trifoliadas simplificadas */}
          <AutoDibujo as="path" fade fill={`${VERDE_CLARO}66`} stroke={VERDE} strokeWidth="1.2" d="M184 156 q-14 -6 -18 6 q10 8 18 -6 Z" />
          <AutoDibujo as="path" fade fill={`${VERDE_CLARO}66`} stroke={VERDE} strokeWidth="1.2" d="M208 116 q14 -6 18 6 q-10 8 -18 -6 Z" />
          <AutoDibujo as="path" fade fill={`${VERDE_CLARO}66`} stroke={VERDE} strokeWidth="1.2" d="M210 204 q14 -6 18 6 q-10 8 -18 -6 Z" />
          {/* flor de frijol */}
          <AutoDibujo as="circle" fade cx="190" cy="84" r="4" fill={ROJO} stroke={ROJO} strokeWidth="0.5" />
        </g>
        {/* nódulos que fijan nitrógeno (raíz del frijol) */}
        <g className="vfx-t6">
          <AutoDibujo as="path" d={`M188 ${suelo} C180 274 172 280 164 288`} stroke={TINTA_2} strokeWidth="1.6" />
          <AutoDibujo as="circle" fade cx="176" cy="276" r="3.2" fill={ROJO} />
          <AutoDibujo as="circle" fade cx="167" cy="285" r="3" fill={ROJO} />
          <AutoDibujo as="circle" fade cx="182" cy="284" r="2.6" fill={ROJO} />
          {/* N del aire → nódulos */}
          <AutoDibujo as="path" fade d="M150 300 q6 -10 14 -12" stroke={TINTA_2} strokeWidth="1" markerEnd={`url(#flechaN-${uid})`} />
        </g>
        <text className="vfx-t6 vfx-fade" x="138" y="304" fontFamily="'Georgia', serif" fontStyle="italic" fontSize="10" fill={TINTA_2}>N₂ del aire</text>
      </g>

      {/* ── 3. CALABAZA (tapa el suelo): hojas anchas + fruto + flor ────── */}
      <g fill="none" stroke={VERDE_OSC} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <g className="vfx-t5">
          {/* guía rastrera */}
          <AutoDibujo as="path" d={`M212 ${suelo} C250 252 300 250 344 246`} stroke={VERDE} strokeWidth="2.2" />
          {/* hojas anchas */}
          <AutoDibujo as="path" fade fill={`${VERDE}55`} stroke={VERDE_OSC} strokeWidth="1.4" d="M272 248 q-16 -18 2 -30 q22 4 20 24 q-10 12 -22 6 Z" />
          <AutoDibujo as="path" fade fill={`${VERDE}55`} stroke={VERDE_OSC} strokeWidth="1.4" d="M322 244 q-14 -16 4 -26 q20 4 18 22 q-10 10 -22 4 Z" />
        </g>
        <g className="vfx-t7">
          {/* fruto de calabaza sobre el suelo */}
          <AutoDibujo as="path" fade fill={NARANJA} stroke={GRANO_OSC} strokeWidth="1.6"
            d="M300 250 q22 -6 30 8 q4 14 -16 16 q-22 0 -22 -12 q0 -8 8 -12 Z" />
          <AutoDibujo as="path" d="M314 244 q0 20 0 22" stroke={GRANO_OSC} strokeWidth="1" />
          {/* flor amarilla */}
          <AutoDibujo as="circle" fade cx="352" cy="242" r="5" fill={GRANO} stroke={GRANO_OSC} strokeWidth="1" />
        </g>
      </g>

      {/* ── rótulos que enseñan (usted colombiano) ─────────────────────── */}
      <Rotulo stage={7} x="252" y="96" tx="204" ty="112" texto="El maíz: el tutor" sub="sube derecho, da la vara" />
      <Rotulo stage={8} x="26" y="150" tx="186" ty="172" texto="El frijol trepa" sub="y fija el nitrógeno en la raíz" anchor="start" />
      <Rotulo stage={9} x="250" y="296" tx="300" ty="264" texto="La calabaza tapa el suelo" sub="guarda humedad, ahoga la maleza" />

      <defs>
        <marker id={`flechaN-${uid}`} markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
          <path d="M0 0 L6 3 L0 6 Z" fill={TINTA_2} />
        </marker>
      </defs>
    </svg>
  );
}
