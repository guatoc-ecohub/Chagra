/*
 * Valle2DFallback — la degradación LIMPIA cuando el equipo es humilde (sin
 * WebGL, poca RAM/CPU, ahorro de datos o "menos movimiento"). No es una pantalla
 * de error: es una entrada digna en SVG+CSS (el músculo que Chagra ya domina,
 * DR §0) con los MISMOS sí-o-sí — un valle pintado, la cosa del día que brilla,
 * los mundos como lugares tocables, el clima que tiñe la escena, y Angelita (la
 * abeja) como avatar-compañero. Al tocar un mundo, la lámina se ACERCA y la
 * abeja VUELA hasta el lugar: el mismo "entrar al mundo" del 3D, dibujado.
 * "Wow" 3D se pierde; el PROPÓSITO no.
 */
import { MUNDOS_VALLE, indexarMundosValle, COSA_DEL_DIA, CLIMAS } from './valleData';
import { AbejaAngelita } from '../../visual/creatures/AbejaAngelita.jsx';

/* Proyección isométrica plana de las coordenadas del valle a la lámina SVG. */
function iso(x, z) {
  const cx = 200 + (x - z) * 30;
  const cy = 150 + (x + z) * 15;
  return { cx, cy };
}

/* Posición en % dentro de la lámina (para posicionar botones/abeja en CSS). */
function pct(x, z) {
  const { cx, cy } = iso(x, z);
  return { left: (cx / 400) * 100, top: (cy / 340) * 100 };
}

export default function Valle2DFallback({
  clima,
  focoId,
  animo = 'sereno',
  energia = 1,
  reducedMotion = false,
  onEntrar,
  onAlerta,
  webglBloqueado = false,
  /* LOS LUGARES DE SU VALLE (valle dinámico): la lista sembrada del perfil de
     la finca, que el host (EntradaValle3D) construye con
     construirMundosValle(perfil). Default = el valle completo de siempre: sin
     perfil, esta lámina se ve exactamente como antes. */
  mundos = MUNDOS_VALLE,
}) {
  const c = CLIMAS[clima];
  const lugares = Array.isArray(mundos) && mundos.length > 0 ? mundos : MUNDOS_VALLE;
  const ancla = lugares.find((m) => m.id === COSA_DEL_DIA.anclaMundo);
  // Mundos ordenados de atrás hacia adelante para que se solapen bien.
  const orden = [...lugares].sort((a, b) => a.pos[0] + a.pos[2] - (b.pos[0] + b.pos[2]));

  // "Entrar al mundo": la lámina se acerca hacia el lugar tocado y la abeja
  // vuela hasta él. Sin foco, la abeja ronda el centro del valle.
  const foco = focoId ? indexarMundosValle(lugares)[focoId] : null;
  const camPos = foco ? pct(foco.pos[0], foco.pos[2]) : { left: 50, top: 50 };
  const abejaPos = foco ? pct(foco.pos[0], foco.pos[2]) : { left: 52, top: 46 };

  return (
    <div className="valle2d" data-clima={clima} data-entrando={foco ? 'si' : 'no'}>
      {/* Aviso cuando el 3D está BLOQUEADO por el navegador (WebGL off — Brave
          shield, aceleración por hardware apagada): explica el porqué y da la
          salida, en vez de dejar al usuario sin saber por qué no ve el 3D. */}
      {webglBloqueado && (
        <p
          role="status"
          style={{
            position: 'absolute', top: 8, left: 8, right: 8, zIndex: 20, margin: 0,
            padding: '8px 12px', borderRadius: 12, background: 'rgba(22,32,26,0.86)',
            color: '#f0ead8', fontSize: 13, lineHeight: 1.35, textAlign: 'center',
          }}
        >
          Su navegador tiene el 3D bloqueado (WebGL). Active la aceleración por
          hardware o el escudo del navegador (Brave y otros lo apagan) para verlo.
          Mientras, aquí tiene el valle dibujado.
        </p>
      )}
      {/* cámara-lámina: se acerca al lugar tocado (transform-origin en el POI) */}
      <div
        className="valle2d__cam"
        style={{
          transformOrigin: `${camPos.left}% ${camPos.top}%`,
          transform: foco ? 'scale(1.32)' : 'scale(1)',
        }}
      >
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
            const p = pct(m.pos[0], m.pos[2]);
            const activo = focoId === m.id;
            return (
              <button key={m.id} type="button"
                className={`valle2d__poi${activo ? ' valle2d__poi--activo' : ''}`}
                style={{ left: `${p.left}%`, top: `${p.top}%`, '--poi-tinte': m.tinte[0] }}
                onClick={() => onEntrar(m.id)}
                aria-label={`Viajar al mundo ${m.titulo}. ${m.lema}`}>
                <span className="valle2d__emoji" aria-hidden="true">{m.emoji}</span>
                <span className="valle2d__nombre">{m.titulo}</span>
              </button>
            );
          })}

          {/* la cosa del día: un solo destello, anclado a su lugar */}
          {ancla && (() => {
            const p = pct(ancla.pos[0], ancla.pos[2]);
            return (
              <button type="button" className="valle2d__alerta"
                style={{ left: `${p.left}%`, top: `${p.top - 12}%` }}
                onClick={onAlerta}
                aria-label={`Alerta del día: ${COSA_DEL_DIA.titulo}. ${COSA_DEL_DIA.detalle}`}>
                <span aria-hidden="true">⚠️</span> {COSA_DEL_DIA.titulo}
              </button>
            );
          })()}

          {/* Angelita: el avatar-compañero. Vuela hacia el lugar al entrar. */}
          <div
            className={`valle2d__abeja${foco ? ' valle2d__abeja--entrando' : ''}`}
            style={{ left: `${abejaPos.left}%`, top: `${abejaPos.top}%` }}
            aria-hidden="true"
          >
            <AbejaAngelita size={foco ? 40 : 46} animo={animo} energia={energia} animated={!reducedMotion} />
          </div>
        </div>
      </div>

      {/* el clima tiñe la escena: grade de luz de la librería de efectos */}
      <div className={`valle2d__grade vfx-grade ${c.grade}`} aria-hidden="true" />
    </div>
  );
}
