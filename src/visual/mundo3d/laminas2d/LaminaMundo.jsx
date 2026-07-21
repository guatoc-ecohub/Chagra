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
      {/* las TRES HERMANAS (opt-in): maíz-fríjol-calabaza arriba y, abajo, los
          nódulos rosados del fríjol = el nitrógeno que se ve. Misma lección 2D. */}
      {params?.milpa && <MilpaCutaway sueloY={tops[0]} />}
      <rect x="0" y="0" width="300" height="200" fill="none" stroke={acento} strokeWidth="2" opacity="0.4" />
    </g>
  );
}

/* El módulo de la milpa dibujado sobre el corte (gemelo 2D del diorama 3D). */
function MilpaCutaway({ sueloY = 26 }) {
  const gx = 132; // eje del maíz
  const nod = [
    [gx - 3, sueloY + 12], [gx + 4, sueloY + 20], [gx - 2, sueloY + 29],
    [gx + 3, sueloY + 38], [gx - 4, sueloY + 46],
  ];
  return (
    <g>
      {/* el maíz: la vara viva (tutor) */}
      <line x1={gx} y1={sueloY} x2={gx} y2="6" stroke="#6f9a45" strokeWidth="3.2" strokeLinecap="round" />
      <path d={`M${gx},18 l12,-6`} stroke="#6f9a45" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d={`M${gx},12 l-11,-5`} stroke="#6f9a45" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <ellipse cx={gx + 4} cy="16" rx="3.2" ry="5.5" fill="#ecd98f" />
      {/* el fríjol: se enreda subiendo por la caña */}
      <path
        d={`M${gx},${sueloY} C${gx - 9},${sueloY - 8} ${gx + 9},${sueloY - 16} ${gx},${sueloY - 24} C${gx - 8},${sueloY - 30} ${gx + 8},${sueloY - 38} ${gx},${sueloY - 44}`}
        stroke="#4f8a34" strokeWidth="2" fill="none" strokeLinecap="round"
      />
      {/* la calabaza: hojas rastreras + fruto ocre + flor amarilla */}
      <ellipse cx={gx + 34} cy={sueloY - 3} rx="12" ry="6" fill="#5f8a3f" />
      <ellipse cx={gx + 52} cy={sueloY - 2} rx="9" ry="5" fill="#5f8a3f" />
      <ellipse cx={gx + 44} cy={sueloY - 5} rx="7" ry="5.4" fill="#cf8f3c" />
      <circle cx={gx + 60} cy={sueloY - 6} r="3" fill="#e8c34a" />
      {/* la raíz del fríjol con sus NÓDULOS rosados (el nitrógeno visible) */}
      <path d={`M${gx},${sueloY} l0,52`} stroke="#c9a86a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d={`M${gx},${sueloY + 22} l10,10`} stroke="#c9a86a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {nod.map((n) => (
        <circle key={`${n[0]}-${n[1]}`} cx={n[0]} cy={n[1]} r="2.6" fill="#e0a3ad" stroke="#c98494" strokeWidth="0.6" />
      ))}
    </g>
  );
}

/* Un arbolito SVG (la ronda hídrica del gemelo 2D). */
function Arbolito2D({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <rect x="-1.6" y="0" width="3.2" height="7" fill="#7a5a38" />
      <path d="M0,-16 L9,2 L-9,2 Z" fill="#3f6f3a" />
      <path d="M0,-22 L6,-8 L-6,-8 Z" fill="#4d7f42" />
    </g>
  );
}

function FondoFlujo({ params, acento }) {
  const hitos = params?.hitos;
  return (
    <g>
      <rect x="0" y="0" width="300" height="200" fill="#eaf3f5" />
      <path d="M0,150 L120,150 L300,70 L300,200 L0,200 Z" fill="#8ba56a" />
      {/* la ronda que protege el nacimiento (misma data que el diorama 3D) */}
      {hitos?.ronda && (
        <g>
          <ellipse cx="52" cy="52" rx="46" ry="30" fill="#4d7f42" opacity="0.18" />
          {Array.from({ length: hitos.ronda.arboles || 5 }, (_, i) => (
            <Arbolito2D key={i} x={22 + i * 16} y={38 + (i % 2) * 18} s={0.8 + (i % 3) * 0.2} />
          ))}
        </g>
      )}
      {/* el nacimiento y la quebrada que baja */}
      <circle cx="40" cy="40" r="16" fill={acento} opacity="0.85" />
      <path d="M40,52 C80,90 140,110 200,150 C230,168 250,175 270,178" stroke={acento} strokeWidth="7" fill="none" strokeLinecap="round" opacity="0.8" />
      {/* el punto de CUIDADO: barril y señal ámbar, didáctico — no catástrofe */}
      {hitos?.riesgo && (
        <g>
          <rect x="128" y="88" width="12" height="14" rx="2" fill="#8b8b8b" />
          <line x1="148" y1="102" x2="148" y2="80" stroke="#7a5a38" strokeWidth="2" />
          <rect x="148" y="78" width="16" height="10" rx="1.5" fill="#d9a13b" />
        </g>
      )}
      {/* la bocatoma sobre la quebrada */}
      {hitos?.bocatoma && (
        <g>
          <rect x="188" y="134" width="18" height="14" rx="2" fill="#a8a094" />
          <rect x="190" y="134" width="14" height="4" fill={acento} opacity="0.8" />
        </g>
      )}
      {/* el tanque que recibe el agua */}
      <rect x="245" y="150" width="44" height="34" rx="4" fill="#9a8b74" />
      <rect x="249" y="150" width="36" height="8" fill={acento} opacity="0.8" />
      {/* la huerta regada: surcos + canalito desde el tanque (el final feliz) */}
      {hitos?.cultivo && (
        <g>
          <line x1="245" y1="172" x2="212" y2="182" stroke={acento} strokeWidth="3" opacity="0.75" strokeLinecap="round" />
          <rect x="160" y="172" width="54" height="24" rx="3" fill="#6b4a2e" />
          {Array.from({ length: hitos.cultivo.surcos || 4 }, (_, i) => (
            <rect key={i} x="164" y={175 + i * 5.4} width="46" height="3" rx="1.5" fill="#5f8a3f" />
          ))}
        </g>
      )}
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

/* La LADERA ANDINA en 2D (mundo `pisos`): las mismas 4 bandas térmicas del
   diorama 3D, del páramo (arriba) al cálido (abajo), con su rótulo de altura,
   la niebla del páramo y la flecha ámbar de que los pisos suben (termofilización,
   señal sutil — nunca alarma). Mismo dato del registro; piso digno garantizado. */
function FondoPisos({ pisos }) {
  const n = pisos.length || 1;
  const bandH = 200 / n;
  // arriba = el piso más alto (páramo); el array viene de bajo (cálido) a alto.
  const orden = [...pisos].reverse();
  return (
    <g>
      <rect x="0" y="0" width="300" height="200" fill="#e7f0ee" />
      {orden.map((p, i) => {
        const y = i * bandH;
        return (
          <g key={p.id || i}>
            <rect x="0" y={y} width="300" height={bandH} fill={p.color} opacity="0.94" />
            <text x="12" y={y + bandH / 2 - 2} fontSize="12" fontWeight="700" fill="#1f2a24">{p.nombre}</text>
            <text x="12" y={y + bandH / 2 + 13} fontSize="10" fill="#33413a">{p.rango}</text>
          </g>
        );
      })}
      {/* niebla del páramo (banda de arriba): capta agua */}
      {orden[0]?.niebla && (
        <g fill="#f4f9f8" opacity="0.75">
          <ellipse cx="210" cy={bandH * 0.4} rx="34" ry="10" />
          <ellipse cx="255" cy={bandH * 0.62} rx="26" ry="8" />
          <ellipse cx="180" cy={bandH * 0.66} rx="22" ry="7" />
        </g>
      )}
      {/* los pisos suben: flecha ámbar tenue al costado (cuidado, no catástrofe) */}
      <g stroke="#d9a13b" strokeWidth="3" fill="none" opacity="0.6" strokeLinecap="round">
        <line x1="284" y1="176" x2="284" y2="34" />
        <path d="M278,44 L284,30 L290,44" strokeLinejoin="round" />
      </g>
    </g>
  );
}

function FondoEstratos({ params, acento }) {
  if (Array.isArray(params?.pisos)) return <FondoPisos pisos={params.pisos} />;
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

/* El espejo 2D de la BÓVEDA: el cielo de la finca con su sol, una nube (y
   lluvia en temporada), y la montaña de pisos térmicos con su casquete y la
   línea ámbar del hielo que fue (cuidado, no alarma). Lee los mismos `params`
   que el diorama 3D. */
function FondoBoveda({ params, acento }) {
  const temporada = params?.temporada ?? 'lluvia';
  const niebla = Math.max(0, Math.min(1, params?.niebla ?? 0.6));
  const pisos = params?.pisos || [
    { color: '#c7a24b' }, { color: '#8fae55' }, { color: '#6f9a72' }, { color: '#9fb6bf' },
  ];
  // pico central: bandas de piso apiladas como un triángulo escalonado
  const bandas = pisos.map((p, i) => {
    const n = pisos.length;
    const yTop = 176 - ((i + 1) / n) * 120;
    const yBot = 176 - (i / n) * 120;
    const half = 96 * (1 - i / n) + 10;
    return { key: i, color: p.color, yTop, yBot, half };
  });
  return (
    <g>
      {/* cielo con gradiente sencillo día andino */}
      <defs>
        <linearGradient id="mb-cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6f9cc9" />
          <stop offset="100%" stopColor="#dcecf5" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="300" height="200" fill="url(#mb-cielo)" />
      {/* el sol con su resplandor */}
      <circle cx="228" cy="48" r="26" fill="#ffd27a" opacity="0.35" />
      <circle cx="228" cy="48" r="15" fill="#ffe6a3" />
      {/* la luna, quieta en su rincón */}
      <circle cx="58" cy="40" r="9" fill="#eef1f6" opacity="0.85" />
      {/* la montaña de pisos térmicos */}
      {bandas.map((b) => (
        <polygon
          key={b.key}
          points={`${150 - b.half},${b.yBot} ${150 + b.half},${b.yBot} ${150 + b.half * 0.72},${b.yTop} ${150 - b.half * 0.72},${b.yTop}`}
          fill={b.color}
        />
      ))}
      {/* casquete de hielo + línea ámbar de hasta dónde llegaba (retroceso) */}
      <polygon points="140,60 160,60 150,44" fill="#eef4f7" />
      <path d="M126,64 Q150,58 174,64" stroke="#d9a13b" strokeWidth="2" fill="none" strokeDasharray="4 3" opacity="0.8" />
      {/* niebla del páramo (el frailejón peina el agua de la nube) */}
      {niebla > 0.2 && (
        <ellipse cx="150" cy="74" rx={26 + niebla * 16} ry="7" fill="#eef4f6" opacity="0.5" />
      )}
      {/* una nube; en lluvia, aguacero suave debajo */}
      <g>
        <ellipse cx="86" cy="70" rx="26" ry="13" fill={temporada === 'lluvia' ? '#cfd6dd' : '#f7fbff'} />
        <ellipse cx="104" cy="66" rx="18" ry="12" fill={temporada === 'lluvia' ? '#cfd6dd' : '#f7fbff'} />
        {temporada === 'lluvia' &&
          [0, 1, 2, 3].map((i) => (
            <line key={i} x1={72 + i * 12} y1="84" x2={69 + i * 12} y2="98" stroke="#bcd6e6" strokeWidth="2" opacity="0.75" strokeLinecap="round" />
          ))}
      </g>
      <rect x="0" y="0" width="300" height="200" fill="none" stroke={acento} strokeWidth="2" opacity="0.35" />
    </g>
  );
}

const FONDOS = {
  cutaway: FondoCutaway, flujo: FondoFlujo, recinto: FondoRecinto, estratos: FondoEstratos, boveda: FondoBoveda,
};

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
