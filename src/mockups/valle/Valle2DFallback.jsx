/*
 * Valle2DFallback — la degradación LIMPIA cuando no hay WebGL (o el equipo es
 * humilde). No es una pantalla de error: es una entrada digna en SVG+CSS (el
 * músculo que Chagra ya domina, DR §0) con los MISMOS 4 sí-o-sí — un valle
 * pintado, la cosa del día que brilla, los mundos como lugares tocables, y el
 * clima que tiñe la escena vía las grades de effects. "Wow" se pierde; el
 * PROPÓSITO no.
 */
import { MUNDOS_VALLE, COSA_DEL_DIA, CLIMAS } from './valleData';

/* Proyección isométrica plana de las coordenadas del valle a la lámina SVG. */
function iso(x, z) {
  const cx = 200 + (x - z) * 30;
  const cy = 150 + (x + z) * 15;
  return { cx, cy };
}

export default function Valle2DFallback({ clima, onEntrar, onAlerta }) {
  const c = CLIMAS[clima];
  const ancla = MUNDOS_VALLE.find((m) => m.id === COSA_DEL_DIA.anclaMundo);
  // Mundos ordenados de atrás hacia adelante para que se solapen bien.
  const orden = [...MUNDOS_VALLE].sort((a, b) => a.pos[0] + a.pos[2] - (b.pos[0] + b.pos[2]));

  return (
    <div className="valle2d" data-clima={clima}>
      <svg viewBox="0 0 400 340" className="valle2d__svg" role="img"
        aria-label="El valle de su finca, dibujado. Toque un lugar para entrar.">
        <defs>
          <linearGradient id="v2d-cielo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={c.cielo[0]} />
            <stop offset="1" stopColor={c.cielo[1]} />
          </linearGradient>
          <radialGradient id="v2d-suelo" cx="0.5" cy="0.35" r="0.9">
            <stop offset="0" stopColor={clima === 'noche' ? '#2c4a34' : '#6a9a52'} />
            <stop offset="1" stopColor={clima === 'noche' ? '#1a3324' : '#4b7a3c'} />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="400" height="340" fill="url(#v2d-cielo)" />
        {/* cordillera */}
        <path d="M0,150 L70,80 L140,140 L210,70 L290,140 L360,90 L400,150 Z"
          fill={clima === 'noche' ? '#33435c' : c.niebla} opacity="0.85" />
        {/* piso del valle */}
        <ellipse cx="200" cy="220" rx="230" ry="130" fill="url(#v2d-suelo)" />
        {/* quebrada */}
        <path d="M120,150 C160,180 180,210 200,250 C215,280 240,300 280,320"
          stroke={clima === 'noche' ? '#2a4a6a' : '#5fb2c9'} strokeWidth="10"
          fill="none" strokeLinecap="round" opacity="0.8" />
      </svg>

      {/* mundos como lugares tocables, posicionados sobre la lámina */}
      <div className="valle2d__mundos">
        {orden.map((m) => {
          const { cx, cy } = iso(m.pos[0], m.pos[2]);
          return (
            <button key={m.id} type="button"
              className="valle2d__poi"
              style={{ left: `${(cx / 400) * 100}%`, top: `${(cy / 340) * 100}%`, '--poi-tinte': m.tinte[0] }}
              onClick={() => onEntrar(m.id)}
              aria-label={`Viajar al mundo ${m.titulo}. ${m.lema}`}>
              <span className="valle2d__emoji" aria-hidden="true">{m.emoji}</span>
              <span className="valle2d__nombre">{m.titulo}</span>
            </button>
          );
        })}

        {/* la cosa del día: un solo destello, anclado a su lugar */}
        {ancla && (() => {
          const { cx, cy } = iso(ancla.pos[0], ancla.pos[2]);
          return (
            <button type="button" className="valle2d__alerta"
              style={{ left: `${(cx / 400) * 100}%`, top: `${((cy - 40) / 340) * 100}%` }}
              onClick={onAlerta}
              aria-label={`Alerta del día: ${COSA_DEL_DIA.titulo}. ${COSA_DEL_DIA.detalle}`}>
              <span aria-hidden="true">⚠️</span> {COSA_DEL_DIA.titulo}
            </button>
          );
        })()}
      </div>

      {/* el clima tiñe la escena: grade de luz de la librería de efectos */}
      <div className={`valle2d__grade vfx-grade ${c.grade}`} aria-hidden="true" />
    </div>
  );
}
