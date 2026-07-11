import { AutoDibujo } from '../effects';
import {
  TINTA, TINTA_2, VERDE, VERDE_OSC, GRANO, GRANO_OSC, NARANJA, CIAN, ROJO,
} from './_kit.jsx';

/*
 * LaminaPisoTermico — el PISO TÉRMICO dibujándose solo: una montaña en corte
 * donde la ALTURA manda qué se da. De abajo hacia arriba: cálido (plátano,
 * yuca, cacao) → templado (café, cítricos, maíz; el piso de la finca) → frío
 * (papa, cebolla, arveja) → páramo (el frailejón: se cuida, no se siembra).
 *
 * PROPOSICIÓN-LOCKED: dibuja el gradiente cálido→páramo de la cordillera. No se
 * generaliza a otra columna de altura.
 *
 * SVG propio e inline. role="img" (enseña). Auto-dibujado de effects: primero
 * se traza la montaña, luego se tiñen las franjas y aparecen los cultivos.
 *
 * @param {Object} [props]
 * @param {string} [props.className] clases extra sobre el <svg> raíz.
 */
export default function LaminaPisoTermico({ className } = {}) {
  // franjas por altura (y de arriba=alto a abajo=bajo)
  const bandas = [
    { y: 26, h: 58, tint: `${CIAN}22`, msnm: '3.600 m', cy: 55 },
    { y: 84, h: 58, tint: '#8a9a8e22', msnm: '2.600 m', cy: 113 },
    { y: 142, h: 58, tint: `${GRANO}22`, msnm: '1.800 m', cy: 171 },
    { y: 200, h: 58, tint: `${NARANJA}22`, msnm: '600 m', cy: 229 },
  ];

  return (
    <svg
      className={className}
      viewBox="0 0 420 300"
      role="img"
      aria-label="Corte de una montaña por pisos térmicos: cálido con plátano y cacao abajo, templado con café y maíz, frío con papa, y páramo con frailejón arriba."
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <title>El piso térmico: la altura manda qué se da</title>

      {/* ── franjas de altura (tinte) ──────────────────────────────────── */}
      <g className="vfx-t2">
        {bandas.map((b) => (
          <AutoDibujo key={b.msnm} as="rect" fade x="52" y={b.y} width="352" height={b.h} fill={b.tint} />
        ))}
      </g>

      {/* ── eje de altura (izquierda) ──────────────────────────────────── */}
      <g className="vfx-t1">
        <AutoDibujo as="line" x1="52" y1="26" x2="52" y2="258" stroke={TINTA_2} strokeWidth="1.4" strokeLinecap="round" />
        {bandas.map((b) => (
          <g key={b.msnm}>
            <AutoDibujo as="line" x1="47" y1={b.cy} x2="52" y2={b.cy} stroke={TINTA_2} strokeWidth="1.2" />
            <text className="vfx-fade" x="45" y={b.cy + 3} textAnchor="end" fontFamily="'Georgia', serif" fontStyle="italic" fontSize="9.5" fill={TINTA_2}>{b.msnm}</text>
          </g>
        ))}
      </g>

      {/* ── silueta de la montaña ──────────────────────────────────────── */}
      <g className="vfx-t1" fill="none" stroke={TINTA} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <AutoDibujo as="path" d="M60 258 L250 34 L404 258" stroke={TINTA} strokeWidth="2.6" />
        {/* nevado en la cima */}
        <AutoDibujo as="path" fade fill={`${CIAN}55`} stroke={CIAN} strokeWidth="1.2" d="M226 62 L250 34 L274 62 L262 56 L250 64 L238 56 Z" />
      </g>
      <AutoDibujo as="line" className="vfx-t2" x1="60" y1="258" x2="404" y2="258" stroke={TINTA} strokeWidth="2.4" strokeLinecap="round" />

      {/* ── cultivos por piso ──────────────────────────────────────────── */}
      {/* PÁRAMO — frailejón */}
      <g className="vfx-t4" fill="none" stroke={VERDE_OSC} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <AutoDibujo as="line" x1="150" y1="80" x2="150" y2="58" stroke={TINTA_2} strokeWidth="2.4" />
        <AutoDibujo as="path" fade fill={`${VERDE}66`} stroke={VERDE_OSC} strokeWidth="1.2" d="M150 58 q-14 -4 -16 -12 M150 58 q14 -4 16 -12 M150 58 q-6 -12 -4 -18 M150 58 q6 -12 4 -18 M150 58 q0 -14 0 -18" />
        <AutoDibujo as="circle" fade cx="150" cy="42" r="3.5" fill={GRANO} stroke={GRANO_OSC} strokeWidth="1" />
      </g>
      {/* FRÍO — papa (mata + tubérculos) */}
      <g className="vfx-t5" fill="none" stroke={VERDE_OSC} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <AutoDibujo as="path" d="M150 128 q-10 -8 -8 -16 M150 128 q10 -8 8 -16 M150 128 q0 -10 0 -18" strokeWidth="1.6" />
        <AutoDibujo as="circle" fade cx="150" cy="112" r="2.5" fill={GRANO} />
        <AutoDibujo as="circle" fade cx="144" cy="136" r="3.4" fill={GRANO_OSC} />
        <AutoDibujo as="circle" fade cx="155" cy="138" r="3" fill={GRANO_OSC} />
      </g>
      {/* TEMPLADO — cafeto (rama con cerezas) */}
      <g className="vfx-t6" fill="none" stroke={VERDE_OSC} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <AutoDibujo as="path" d="M138 186 q14 -10 26 -6" stroke={VERDE_OSC} strokeWidth="1.8" />
        <AutoDibujo as="path" fade fill={`${VERDE}66`} stroke={VERDE_OSC} strokeWidth="1" d="M148 182 q8 -6 12 0 q-6 6 -12 0 Z" />
        <AutoDibujo as="circle" fade cx="150" cy="188" r="2.6" fill={ROJO} />
        <AutoDibujo as="circle" fade cx="158" cy="186" r="2.6" fill={ROJO} />
        <AutoDibujo as="circle" fade cx="142" cy="188" r="2.4" fill={ROJO} />
      </g>
      {/* CÁLIDO — plátano (hoja paleta) */}
      <g className="vfx-t7" fill="none" stroke={VERDE_OSC} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <AutoDibujo as="line" x1="150" y1="244" x2="150" y2="216" stroke={VERDE_OSC} strokeWidth="2" />
        <AutoDibujo as="path" fade fill={`${VERDE}66`} stroke={VERDE_OSC} strokeWidth="1.2" d="M150 220 q-20 -6 -24 -20 q18 -2 24 12 q6 -14 24 -12 q-4 14 -24 20 Z" />
        <AutoDibujo as="path" d="M150 220 q0 -14 0 -18" strokeWidth="1" />
      </g>

      {/* ── rótulos (derecha, usted colombiano) ───────────────────────── */}
      <g className="vfx-t8">
        {[
          { y: 50, c: CIAN, t: 'Páramo', s: 'frailejón · aquí se cuida, no se siembra' },
          { y: 108, c: TINTA_2, t: 'Frío', s: 'papa, cebolla, arveja' },
          { y: 166, c: GRANO_OSC, t: 'Templado — su finca', s: 'café, cítricos, maíz' },
          { y: 224, c: NARANJA, t: 'Cálido', s: 'plátano, yuca, cacao' },
        ].map((r) => (
          <g key={r.t}>
            <rect className="vfx-fade" x="250" y={r.y - 9} width="9" height="9" rx="2" fill={r.c} />
            <text className="vfx-fade" x="266" y={r.y} fontFamily="'Georgia', serif" fontStyle="italic" fontWeight="600" fontSize="12" fill={TINTA}>{r.t}</text>
            <text className="vfx-fade" x="266" y={r.y + 13} fontFamily="'Georgia', serif" fontStyle="italic" fontSize="9.5" fill={TINTA_2}>{r.s}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}
