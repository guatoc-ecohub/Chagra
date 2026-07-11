/*
 * LaminaCutaway — la degradación 2D DIGNA del arquetipo `cutaway` (DR §4.4/§5).
 *
 * Cuando el equipo no aguanta 3D (tier bajo / sin WebGL / reduced-motion), el
 * corte de tierra se pinta en SVG+CSS — el músculo que Chagra ya domina — con
 * las MISMAS capas, la MISMA vida (que se puebla/despuebla con `vida01`) y los
 * MISMOS hotspots como botones posicionados. No es "modo degradado feo": es la
 * misma lección sin el peso. "Wow" se pierde; el PROPÓSITO no.
 */

const V_W = 400;
const V_H = 300;
const SUELO_TOP = 96; // y donde empieza la tierra (arriba = cielo)

/** RNG determinista → posiciones estables de la vida dibujada. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function LaminaCutaway({ hotspots = [], tinte = ['#8a5a38', '#f0e2c8'], vida01 = 0.5, onHotspot }) {
  const v = Math.max(0, Math.min(1, vida01));

  // Bandas de tierra (mismo orden que el 3D: hojarasca / suelo negro / subsuelo).
  const bandas = [
    { color: '#6b4a2e', y0: SUELO_TOP, y1: SUELO_TOP + 46 },
    { color: '#3a2a1a', y0: SUELO_TOP + 46, y1: SUELO_TOP + 138 },
    { color: '#8a6a44', y0: SUELO_TOP + 138, y1: V_H },
  ];

  // Vida determinista, recortada por `v`.
  const r = rng(20260710);
  const lombrices = Array.from({ length: 8 }, () => ({
    x: 30 + r() * (V_W - 60),
    y: SUELO_TOP + 30 + r() * 120,
    rot: (r() - 0.5) * 50,
  })).slice(0, Math.round(8 * v));
  const raices = Array.from({ length: 6 }, () => ({
    x: 40 + r() * (V_W - 80),
    largo: 40 + r() * 90,
  })).slice(0, Math.round(6 * Math.max(v, 0.14)));
  const hifas = Array.from({ length: 10 }, () => ({
    x1: 30 + r() * (V_W - 60),
    y1: SUELO_TOP + 60 + r() * 70,
    dx: (r() - 0.5) * 60,
    dy: (r() - 0.5) * 40,
  })).slice(0, Math.round(10 * v));
  const pasto = Array.from({ length: 14 }, () => ({ x: 20 + r() * (V_W - 40), alto: 8 + r() * 12 })).slice(
    0,
    Math.round(14 * v),
  );

  return (
    <div className="mundo3d-lamina" style={{ '--m-tinte': tinte[0] }}>
      <svg
        viewBox={`0 0 ${V_W} ${V_H}`}
        className="mundo3d-lamina__svg"
        role="img"
        aria-label="Un corte de su suelo, dibujado: las capas y la vida que hay bajo la tierra. Toque un punto para entrar."
      >
        <defs>
          <linearGradient id="mc-cielo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#bfe3f0" />
            <stop offset="1" stopColor="#e8f3d9" />
          </linearGradient>
        </defs>

        {/* cielo sobre la superficie */}
        <rect x="0" y="0" width={V_W} height={SUELO_TOP} fill="url(#mc-cielo)" />

        {/* las capas de tierra */}
        {bandas.map((b) => (
          <rect key={b.color} x="0" y={b.y0} width={V_W} height={b.y1 - b.y0} fill={b.color} />
        ))}

        {/* pasto en la superficie (crece con la vida) */}
        {pasto.map((p, i) => (
          <line
            key={`g${i}`}
            x1={p.x}
            y1={SUELO_TOP}
            x2={p.x + (i % 2 ? 3 : -3)}
            y2={SUELO_TOP - p.alto}
            stroke="#5f9a45"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        ))}

        {/* raíces que bajan */}
        {raices.map((rz, i) => (
          <line
            key={`r${i}`}
            x1={rz.x}
            y1={SUELO_TOP + 8}
            x2={rz.x + (i % 2 ? 10 : -10)}
            y2={SUELO_TOP + 8 + rz.largo}
            stroke="#c9a36a"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        ))}

        {/* hifas: la red fina de hongos */}
        {hifas.map((h, i) => (
          <line
            key={`h${i}`}
            x1={h.x1}
            y1={h.y1}
            x2={h.x1 + h.dx}
            y2={h.y1 + h.dy}
            stroke="#eae3cf"
            strokeWidth="1"
            opacity="0.7"
          />
        ))}

        {/* lombrices: cápsulas curvas */}
        {lombrices.map((l, i) => (
          <g key={`l${i}`} transform={`translate(${l.x} ${l.y}) rotate(${l.rot})`}>
            <path d="M-9,0 q9,-7 18,0" fill="none" stroke="#d98a86" strokeWidth="5" strokeLinecap="round" />
          </g>
        ))}
      </svg>

      {/* hotspots como botones posicionados (mismos `view` que el 3D) */}
      <div className="mundo3d-lamina__hotspots">
        {hotspots.map((h) => {
          const leftPct = 50 + (h.pos[0] / 1.7) * 30;
          const topPct = 70 - h.pos[1] * 14;
          return (
            <button
              key={h.id}
              type="button"
              className="mundo3d-hotspot mundo3d-hotspot--2d"
              style={{ left: `${leftPct}%`, top: `${topPct}%` }}
              onClick={() => onHotspot?.(h.view, h.data)}
              aria-label={h.label}
            >
              <span className="mundo3d-hotspot__emoji" aria-hidden="true">{h.emoji}</span>
              <span className="mundo3d-hotspot__txt">{h.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default LaminaCutaway;
