import { useId } from 'react';
import { AutoDibujo } from '../effects';
import {
  TINTA, TINTA_2, VERDE, VERDE_OSC, VERDE_CLARO,
  GRANO_OSC, NARANJA, TIERRA_CLARA, ROJO,
} from './_kit.jsx';

/*
 * LaminaRotacion — la ROTACIÓN de cultivos como una rueda de cuatro eras que se
 * dibuja sola: hoja → fruto → raíz → leguminosa → y vuelve a empezar. Cada
 * familia le pide y le devuelve algo distinto al suelo; la leguminosa repone el
 * nitrógeno que la de hoja gastó.
 *
 * PROPOSICIÓN-LOCKED: dibuja la rueda hoja→fruto→raíz→leguminosa. No se
 * generaliza a otra secuencia de rotación.
 *
 * SVG propio e inline. role="img" (enseña). Auto-dibujado de effects; las
 * flechas del ciclo se trazan en orden con las etapas escalonadas.
 *
 * @param {Object} [props]
 * @param {string} [props.className] clases extra sobre el <svg> raíz.
 */

// Nodo de una era: disco de tierra + número + rótulo con lo que hace al suelo.
// Declarado a nivel de módulo (no dentro del render) para no re-crear el
// componente en cada dibujo.
function Era({ cx, cy, num, titulo, familia, efecto, stage, children }) {
  return (
    <g className={`vfx-t${stage}`}>
      <AutoDibujo as="ellipse" fade cx={cx} cy={cy + 26} rx="34" ry="9" fill={`${TIERRA_CLARA}33`} />
      <AutoDibujo as="line" x1={cx - 30} y1={cy + 26} x2={cx + 30} y2={cy + 26} stroke={TINTA} strokeWidth="1.6" strokeLinecap="round" />
      {children}
      <circle className="vfx-fade" cx={cx - 40} cy={cy - 22} r="10" fill="#f3ead4" stroke={TINTA} strokeWidth="1.4" />
      <text className="vfx-fade" x={cx - 40} y={cy - 18} textAnchor="middle" fontFamily="'Georgia', serif" fontWeight="700" fontSize="12" fill={TINTA}>{num}</text>
      <text className="vfx-fade" x={cx} y={cy + 44} textAnchor="middle" fontFamily="'Georgia', serif" fontStyle="italic" fontWeight="600" fontSize="12" fill={TINTA}>{titulo}</text>
      <text className="vfx-fade" x={cx} y={cy + 57} textAnchor="middle" fontFamily="'Georgia', serif" fontStyle="italic" fontSize="9.5" fill={TINTA_2}>{familia}</text>
      <text className="vfx-fade" x={cx} y={cy + 70} textAnchor="middle" fontFamily="'Georgia', serif" fontStyle="italic" fontSize="9.5" fill={efecto.color}>{efecto.txt}</text>
    </g>
  );
}

export default function LaminaRotacion({ className } = {}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const flecha = `flechaRot-${uid}`;

  return (
    <svg
      className={className}
      viewBox="0 0 400 350"
      role="img"
      aria-label="Rueda de rotación de cultivos: primero hoja, luego fruto, luego raíz, luego leguminosa que repone el nitrógeno, y se vuelve a empezar."
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <title>La rotación: cambie de familia cada era</title>

      {/* ── flechas del ciclo (horario) ────────────────────────────────── */}
      <g fill="none" stroke={TINTA_2} strokeWidth="2" strokeLinecap="round">
        <g className="vfx-t2"><AutoDibujo as="path" d="M250 70 A120 120 0 0 1 320 130" markerEnd={`url(#${flecha})`} /></g>
        <g className="vfx-t4"><AutoDibujo as="path" d="M320 214 A120 120 0 0 1 250 276" markerEnd={`url(#${flecha})`} /></g>
        <g className="vfx-t6"><AutoDibujo as="path" d="M150 276 A120 120 0 0 1 80 214" markerEnd={`url(#${flecha})`} /></g>
        <g className="vfx-t8"><AutoDibujo as="path" d="M80 130 A120 120 0 0 1 150 70" markerEnd={`url(#${flecha})`} /></g>
      </g>

      {/* ── centro ─────────────────────────────────────────────────────── */}
      <g className="vfx-t1">
        <AutoDibujo as="circle" fade cx="200" cy="173" r="30" fill="#f3ead4" stroke={TINTA_2} strokeWidth="1.2" strokeDasharray="3 4" />
        <text className="vfx-fade" x="200" y="168" textAnchor="middle" fontFamily="'Georgia', serif" fontStyle="italic" fontWeight="700" fontSize="12" fill={TINTA}>La era</text>
        <text className="vfx-fade" x="200" y="184" textAnchor="middle" fontFamily="'Georgia', serif" fontStyle="italic" fontSize="10" fill={TINTA_2}>descansa</text>
        <text className="vfx-fade" x="200" y="196" textAnchor="middle" fontFamily="'Georgia', serif" fontStyle="italic" fontSize="10" fill={TINTA_2}>cambiando</text>
      </g>

      {/* ── 1. HOJA (arriba) — lechuga: gasta nitrógeno ────────────────── */}
      <Era cx={200} cy={44} num="1" titulo="Hoja" familia="lechuga, repollo" efecto={{ txt: 'gasta nitrógeno', color: ROJO }} stage={3}>
        <g fill="none" stroke={VERDE_OSC} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <AutoDibujo as="path" fade fill={`${VERDE}55`} stroke={VERDE_OSC} strokeWidth="1.4" d="M200 66 q-22 -2 -20 -18 q20 -6 22 10 q2 -16 22 -10 q2 16 -20 18 Z" />
          <AutoDibujo as="path" d="M200 66 q0 -14 0 -22" strokeWidth="1.4" />
        </g>
      </Era>

      {/* ── 2. FRUTO (derecha) — tomate: pide suelo fértil ─────────────── */}
      <Era cx={310} cy={148} num="2" titulo="Fruto" familia="tomate, ají" efecto={{ txt: 'pide suelo rico', color: TINTA_2 }} stage={5}>
        <g fill="none" stroke={VERDE_OSC} strokeWidth="1.8" strokeLinecap="round">
          <AutoDibujo as="path" d="M310 174 C308 162 312 156 310 148" strokeWidth="2" />
          <AutoDibujo as="circle" fade cx="302" cy="160" r="4.5" fill={ROJO} />
          <AutoDibujo as="circle" fade cx="318" cy="166" r="4" fill={ROJO} />
          <AutoDibujo as="path" fade fill={`${VERDE}55`} stroke={VERDE_OSC} strokeWidth="1.2" d="M310 152 q10 -4 12 4 q-8 4 -12 -4 Z" />
        </g>
      </Era>

      {/* ── 3. RAÍZ (abajo) — zanahoria: afloja hondo ──────────────────── */}
      <Era cx={200} cy={252} num="3" titulo="Raíz" familia="zanahoria, remolacha" efecto={{ txt: 'afloja hondo', color: TINTA_2 }} stage={7}>
        <g fill="none" stroke={GRANO_OSC} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <AutoDibujo as="path" fade fill={NARANJA} stroke={GRANO_OSC} strokeWidth="1.4" d="M192 278 L208 278 L200 300 Z" />
          <AutoDibujo as="path" d="M200 278 q-8 -10 -6 -16" stroke={VERDE_OSC} strokeWidth="1.4" />
          <AutoDibujo as="path" d="M200 278 q8 -10 6 -16" stroke={VERDE_OSC} strokeWidth="1.4" />
          <AutoDibujo as="path" d="M200 278 q0 -12 0 -16" stroke={VERDE_OSC} strokeWidth="1.4" />
        </g>
      </Era>

      {/* ── 4. LEGUMINOSA (izquierda) — fríjol/haba: repone nitrógeno ──── */}
      <Era cx={90} cy={148} num="4" titulo="Leguminosa" familia="fríjol, haba, arveja" efecto={{ txt: 'repone nitrógeno', color: VERDE_OSC }} stage={9}>
        <g fill="none" stroke={VERDE_CLARO} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <AutoDibujo as="path" d="M90 174 C88 162 92 156 90 148" strokeWidth="2" stroke={VERDE_OSC} />
          {/* vaina */}
          <AutoDibujo as="path" fade fill={`${VERDE_CLARO}88`} stroke={VERDE_OSC} strokeWidth="1.2" d="M96 152 q14 2 16 12 q-14 2 -16 -12 Z" />
          {/* nódulos */}
          <AutoDibujo as="circle" fade cx="84" cy="176" r="2.6" fill={ROJO} />
          <AutoDibujo as="circle" fade cx="92" cy="178" r="2.2" fill={ROJO} />
        </g>
      </Era>

      <defs>
        <marker id={flecha} markerWidth="7" markerHeight="7" refX="4.5" refY="3.5" orient="auto">
          <path d="M0 0 L7 3.5 L0 7 Z" fill={TINTA_2} />
        </marker>
      </defs>
    </svg>
  );
}
