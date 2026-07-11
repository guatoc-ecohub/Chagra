/*
 * LaminaMundo — el ESPEJO 2D de los arquetipos 3D (dim '2d').
 *
 * Cuando el equipo es humilde (tier bajo/sin-WebGL) o el mundo se pide en 2D, el
 * diorama 3D cae AQUÍ: una lámina SVG dibujada del mismo motivo (corte de suelo,
 * camino del agua, corral, estratos), con los MISMOS hotspots como botones
 * reales. Es el "piso digno" del DR (§4.4): nunca una pantalla de error. Lee los
 * MISMOS `params` que el arquetipo 3D (capas/curva/animales/estratos) + los
 * hotspots, así que sumar el espejo de un mundo no cuesta datos nuevos.
 */

/* Fondo SVG por motivo. Cada uno usa el `tinte` del mundo para no desentonar. */
function FondoCutaway({ params, acento }) {
  const capas = params?.capas || [];
  const vida = Math.max(0, Math.min(1, params?.vida ?? 0.6));
  // offsets acumulados sin reasignar (immutabilidad en render)
  const alturas = capas.map((c) => 24 + (c.alto || 0.6) * 22);
  const tops = alturas.reduce(
    (acc, h, i) => [...acc, acc[i] + h],
    [26],
  );
  const bandas = capas.map((c, i) => ({
    key: i, y: tops[i], h: alturas[i], color: c.color || '#5a3d28', bichos: c.bichos || [],
  }));
  const n = Math.round(vida * 4);
  const bichos = bandas.flatMap((b, bi) =>
    Array.from({ length: n }, (_, i) => ({
      key: `${bi}-${i}`,
      tipo: b.bichos[i % Math.max(1, b.bichos.length)] || 'raiz',
      bx: 30 + ((i * 47 + bi * 23) % 240),
      by: b.y + 8 + ((i * 13) % Math.max(6, b.h - 12)),
    })),
  );
  return (
    <g>
      <rect x="0" y="0" width="300" height="26" fill="#6f9a45" />
      {bandas.map((b) => (
        <rect key={b.key} x="0" y={b.y} width="300" height={b.h} fill={b.color} />
      ))}
      {bichos.map((v) =>
        v.tipo === 'lombriz' ? (
          <path key={v.key} d={`M${v.bx},${v.by} q6,-5 12,0 q6,5 12,0`} stroke="#e8b6a6" strokeWidth="3" fill="none" strokeLinecap="round" />
        ) : v.tipo === 'hifa' ? (
          <line key={v.key} x1={v.bx} y1={v.by} x2={v.bx + 10} y2={v.by + 12} stroke="#f2ece0" strokeWidth="1" />
        ) : (
          <path key={v.key} d={`M${v.bx},${v.by} l3,14 l-2,10`} stroke="#c9a86a" strokeWidth="2" fill="none" strokeLinecap="round" />
        ),
      )}
      <rect x="0" y="0" width="300" height="200" fill="none" stroke={acento} strokeWidth="2" opacity="0.4" />
    </g>
  );
}

function FondoFlujo({ acento }) {
  return (
    <g>
      <rect x="0" y="0" width="300" height="200" fill="#eaf3f5" />
      <path d="M0,150 L120,150 L300,70 L300,200 L0,200 Z" fill="#8ba56a" />
      <circle cx="40" cy="40" r="16" fill={acento} opacity="0.85" />
      <path d="M40,52 C80,90 140,110 200,150 C230,168 250,175 270,178" stroke={acento} strokeWidth="7" fill="none" strokeLinecap="round" opacity="0.8" />
      <rect x="245" y="150" width="44" height="34" rx="4" fill="#9a8b74" />
      <rect x="249" y="150" width="36" height="8" fill={acento} opacity="0.8" />
    </g>
  );
}

function FondoRecinto({ acento }) {
  return (
    <g>
      <rect x="0" y="0" width="300" height="200" fill="#f2e6cf" />
      <ellipse cx="150" cy="120" rx="120" ry="60" fill="#a98a5c" />
      <ellipse cx="150" cy="120" rx="90" ry="44" fill="none" stroke={acento} strokeWidth="3" strokeDasharray="6 5" opacity="0.7" />
      <path d="M135,120 l30,0 l-15,-18 Z" fill="#5a4326" />
      <ellipse cx="110" cy="118" rx="16" ry="11" fill="#e7d9c2" />
      <ellipse cx="188" cy="126" rx="15" ry="10" fill="#c98a5a" />
    </g>
  );
}

function FondoEstratos({ params, acento }) {
  const estratos = params?.estratos || [
    { color: '#2f5f34' }, { color: '#3a6f3f' }, { color: '#4a7d45' }, { color: '#5f8a3f' },
    { color: '#7aa24a' }, { color: '#8fae55' }, { color: '#8a6a44' },
  ];
  const n = estratos.length;
  return (
    <g>
      <rect x="0" y="0" width="300" height="200" fill="#eaf2df" />
      {estratos.map((e, i) => {
        const bandH = 200 / n;
        const y = i * bandH;
        return <rect key={i} x="0" y={y} width="300" height={bandH} fill={e.color} opacity={0.9 - i * 0.02} />;
      })}
      <line x1="150" y1="0" x2="150" y2="200" stroke={acento} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.5" />
    </g>
  );
}

const FONDOS = { cutaway: FondoCutaway, flujo: FondoFlujo, recinto: FondoRecinto, estratos: FondoEstratos };

export default function LaminaMundo({ params, hotspots = [], tinte, onHotspot, motivo = 'cutaway', titulo }) {
  const acento = (tinte && tinte[0]) || '#3f8f4e';
  const Fondo = FONDOS[motivo] || FondoCutaway;
  return (
    <div className="mundo2d" style={{ '--m2d-tinte': acento }}>
      <div className="mundo2d__lienzo">
        <svg viewBox="0 0 300 200" className="mundo2d__svg" role="img"
          aria-label={titulo || `Lámina del mundo (${motivo})`}>
          <Fondo params={params} acento={acento} />
        </svg>
        <div className="mundo2d__hotspots">
          {hotspots.map((h) => (
            <button
              key={h.id}
              type="button"
              className="mundo2d__hotspot"
              style={{ '--hs-tinte': acento }}
              onClick={() => onHotspot?.(h.view, h.data)}
              aria-label={h.label}
            >
              <span className="mundo2d__emoji" aria-hidden="true">{h.emoji}</span>
              <span className="mundo2d__txt">{h.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
