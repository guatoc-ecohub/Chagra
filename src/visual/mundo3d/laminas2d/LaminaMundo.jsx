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
import { BOVEDA_PISOS_DEF } from '../pisosTermicos.js';

/* Fondo SVG por motivo. Cada uno usa el `tinte` del mundo para no desentonar. */
function FondoCutaway({ params, acento }) {
  const capas = params?.capas || [];
  const vida = Math.max(0, Math.min(1, params?.vida ?? 0.6));
  // Con el módulo milpa la lámina abre CIELO: las tres hermanas necesitan aire
  // arriba (antes el maíz se dibujaba verde-sobre-verde encima de la franja del
  // pasto y quedaba invisible). Sin milpa, el corte clásico queda igual.
  const cieloH = params?.milpa ? 70 : 0;
  const pastoH = params?.milpa ? 12 : 26;
  // offsets acumulados sin reasignar (immutabilidad en render)
  const alturas = capas.map((c) => 24 + (c.alto || 0.6) * 22);
  const tops = alturas.reduce(
    (acc, h, i) => [...acc, acc[i] + h],
    [cieloH + pastoH],
  );
  const bandas = capas.map((c, i) => ({
    key: i, y: tops[i], h: alturas[i], color: c.color || '#5a3d28', bichos: c.bichos || [],
  }));
  const fondoY = tops[tops.length - 1];
  const fondoColor = bandas.length ? bandas[bandas.length - 1].color : '#5a3d28';
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
      {cieloH > 0 && (
        <g>
          <rect x="0" y="0" width="300" height={cieloH} fill="#e4f0da" />
          <circle cx="262" cy="24" r="16" fill="#f6d98a" opacity="0.4" />
          <circle cx="262" cy="24" r="10" fill="#f2cf6a" />
          <g fill="#fbfdf6" opacity="0.9">
            <ellipse cx="50" cy="20" rx="17" ry="7" />
            <ellipse cx="64" cy="16" rx="11" ry="6" />
          </g>
        </g>
      )}
      <rect x="0" y={cieloH} width="300" height={pastoH} fill="#6f9a45" />
      {bandas.map((b) => (
        <rect key={b.key} x="0" y={b.y} width="300" height={b.h} fill={b.color} />
      ))}
      {/* el corte llega al borde: la capa más honda rellena hasta abajo (antes
          quedaba una franja blanca cruda al pie de la lámina) */}
      {fondoY < 200 && (
        <rect x="0" y={fondoY} width="300" height={200 - fondoY} fill={fondoColor} />
      )}
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

/* El módulo de la milpa dibujado sobre el corte (gemelo 2D del diorama 3D):
   las TRES HERMANAS con aire y línea entintada — el maíz protagonista (caña con
   nudos, hojas cinta, espiga y mazorca), el fríjol que trepa con sus vainas y
   la calabaza rastrera de hoja grande — y bajo tierra la raíz del fríjol con
   sus NÓDULOS rosados (el nitrógeno que se ve). Antes la mata era un trazo del
   mismo verde del pasto (invisible) apretado en 26px. */
function MilpaCutaway({ sueloY = 82 }) {
  const gx = 112; // eje del maíz
  const nod = [
    [gx - 10, sueloY + 16], [gx - 2, sueloY + 25], [gx - 11, sueloY + 35],
    [gx - 3, sueloY + 44], [gx - 9, sueloY + 53],
  ];
  return (
    <g>
      {/* ── EL MAÍZ: la vara viva ── */}
      <path d={`M${gx},${sueloY} L${gx},14`} stroke="#4a7a2c" strokeWidth="4.6" strokeLinecap="round" />
      <path d={`M${gx},${sueloY - 2} L${gx},16`} stroke="#6fae3f" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d={`M${gx - 2.8},64 h5.6 M${gx - 2.8},48 h5.6 M${gx - 2.8},32 h5.6`}
        stroke="#3c6626" strokeWidth="1.3" strokeLinecap="round"
      />
      {/* hojas cinta (lámina Humboldt: arquean y vuelven) */}
      <g fill="#5f9a3c" stroke="#35601f" strokeWidth="1.1" strokeLinejoin="round">
        <path d={`M${gx},62 C${gx - 14},58 ${gx - 30},48 ${gx - 36},34 C${gx - 24},44 ${gx - 10},52 ${gx},56 Z`} />
        <path d={`M${gx},54 C${gx + 14},50 ${gx + 30},40 ${gx + 38},28 C${gx + 24},38 ${gx + 10},44 ${gx},48 Z`} />
        <path d={`M${gx},40 C${gx - 12},36 ${gx - 24},26 ${gx - 28},14 C${gx - 17},24 ${gx - 8},30 ${gx},34 Z`} />
        <path d={`M${gx},30 C${gx + 10},26 ${gx + 20},18 ${gx + 24},8 C${gx + 14},16 ${gx + 6},22 ${gx},24 Z`} />
      </g>
      {/* la espiga (flor macho) dorada */}
      <g stroke="#d9b84a" strokeLinecap="round" fill="none">
        <path d={`M${gx},14 L${gx},4`} strokeWidth="2" />
        <path d={`M${gx},12 L${gx - 8},5 M${gx},12 L${gx + 8},5`} strokeWidth="1.6" />
      </g>
      <g fill="#e8cf7a">
        <circle cx={gx} cy="4" r="1.3" />
        <circle cx={gx - 8} cy="5" r="1.2" />
        <circle cx={gx + 8} cy="5" r="1.2" />
      </g>
      {/* la mazorca con su capacho y sus barbas */}
      <g transform={`translate(${gx + 8},46) rotate(10)`}>
        <ellipse rx="5.5" ry="10" fill="#ecd98f" stroke="#b98a2f" strokeWidth="1.2" />
        <path d="M-2,-9 q-0.5,9 0,18 M2,-9 q0.5,9 0,18" stroke="#d9b84a" strokeWidth="0.8" fill="none" />
        <path d="M-4,6 C-8,2 -9,-6 -6,-10 L-3,-9 C-5,-3 -5,2 -4,6 Z" fill="#6f9a45" stroke="#35601f" strokeWidth="0.9" />
        <path d="M0,-10 q3,-6 7,-8 M1,-10 q5,-3 9,-3" stroke="#b5562f" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      </g>
      {/* ── EL FRÍJOL: se enreda subiendo por la caña ── */}
      <path
        d={`M${gx - 6},${sueloY} C${gx - 20},70 ${gx + 14},64 ${gx + 2},54 C${gx - 12},46 ${gx + 14},40 ${gx + 2},32 C${gx - 8},26 ${gx + 8},22 ${gx + 2},18`}
        stroke="#2f7a3c" strokeWidth="2.2" fill="none" strokeLinecap="round"
      />
      {[[gx - 13, 60], [gx + 9, 45], [gx - 7, 28]].map(([hx, hy]) => (
        <g key={`${hx}-${hy}`} fill="#3f8a3c" stroke="#275c28" strokeWidth="0.8">
          <circle cx={hx - 2.4} cy={hy} r="2.4" />
          <circle cx={hx + 2.4} cy={hy} r="2.4" />
          <circle cx={hx} cy={hy - 3.2} r="2.6" />
        </g>
      ))}
      {/* dos vainas colgando (la cosecha que abona) */}
      <path d={`M${gx + 7},50 q1.5,6 -1,11`} stroke="#7fae55" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d={`M${gx + 12},48 q2,6 0,11`} stroke="#7fae55" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* ── LA CALABAZA: la guía rastrera, hoja grande, fruto y flor ── */}
      <path d={`M${gx + 22},${sueloY - 2} C160,74 200,80 246,74`} stroke="#4f8a34" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {[[178, 62, 1.15, -8], [222, 57, 1.35, 6], [258, 67, 0.95, -4]].map(([hx, hy, s, r]) => (
        <g key={`${hx}-${hy}`} transform={`translate(${hx},${hy}) scale(${s}) rotate(${r})`}>
          <path
            d="M0,6 C-10,4 -13,-6 -5,-11 C3,-16 13,-10 12,-1 C11,7 6,8 0,6 Z"
            fill="#55923f" stroke="#35682a" strokeWidth="1.1" strokeLinejoin="round"
          />
          <path d="M0,4 L3,-7" stroke="#35682a" strokeWidth="0.9" fill="none" />
          <path d="M0,6 q-2,4 -6,6" stroke="#4f8a34" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </g>
      ))}
      <g transform="translate(206,74)">
        <ellipse rx="13" ry="9" fill="#cf8f3c" stroke="#9a6428" strokeWidth="1.4" />
        <path d="M-6,-8 q-2,8 0,16 M0,-9 q0,9 0,18 M6,-8 q2,8 0,16" stroke="#9a6428" strokeWidth="0.9" fill="none" opacity="0.7" />
        <path d="M0,-9 q1,-4 4,-5" stroke="#5a7a2e" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </g>
      <g transform="translate(246,58)">
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} rx="2.6" ry="4.2" cy="-4" fill="#f2c531" stroke="#cf9a2f" strokeWidth="0.7" transform={`rotate(${a})`} />
        ))}
        <circle r="2.2" fill="#e09a2f" />
      </g>
      {/* ── BAJO TIERRA: raíces y los NÓDULOS rosados (el nitrógeno visible) ── */}
      <g stroke="#c9a86a" fill="none" strokeLinecap="round">
        <path d={`M${gx},${sueloY} l-9,15 M${gx},${sueloY} l-2,18 M${gx},${sueloY} l5,16 M${gx},${sueloY} l11,12`} strokeWidth="1.5" />
        <path d={`M${gx - 6},${sueloY} C${gx - 10},${sueloY + 18} ${gx - 4},${sueloY + 34} ${gx - 8},${sueloY + 56}`} strokeWidth="2.2" />
        <path d={`M${gx - 7},${sueloY + 24} l10,9`} strokeWidth="1.4" />
        <path d="M206,83 l-3,11 M206,83 l5,9" strokeWidth="1.3" />
      </g>
      {nod.map((p) => (
        <g key={`${p[0]}-${p[1]}`} fill="#e8a9b4" stroke="#c47a8c" strokeWidth="0.8">
          <circle cx={p[0]} cy={p[1]} r="3" />
          <circle cx={p[0] + 4.2} cy={p[1] + 2.4} r="1.9" />
        </g>
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

/* ── Las siluetas del hato (gemelo 2D del corral): especie → silueta ──────── */
const TINTA_CORRAL = '#4a382a';

function Vaca2D({ color = '#e7d9c2', mancha }) {
  return (
    <g>
      <path d="M-12,6 l0,10 M-4,7 l0,10 M5,7 l0,10 M12,6 l0,10" stroke={TINTA_CORRAL} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M-17,-4 q-6,6 -4,13" stroke={TINTA_CORRAL} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <rect x="-17" y="-8" width="34" height="16" rx="8" fill={color} stroke={TINTA_CORRAL} strokeWidth="1.4" />
      {mancha && (
        <g fill={mancha}>
          <ellipse cx="-6" cy="-2" rx="6" ry="4.5" />
          <ellipse cx="7" cy="3" rx="4.5" ry="3.5" />
        </g>
      )}
      <rect x="13" y="-15" width="11" height="11" rx="4.5" fill={color} stroke={TINTA_CORRAL} strokeWidth="1.4" />
      <path d="M14,-15 l-3,-3 M23,-15 l3,-3" stroke={TINTA_CORRAL} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <circle cx="20.5" cy="-11" r="1" fill={TINTA_CORRAL} />
      <ellipse cx="18.5" cy="-5.4" rx="3.4" ry="2" fill="#d8b8a8" />
    </g>
  );
}

function Cerdo2D({ color = '#e0a89a' }) {
  return (
    <g>
      <path d="M-8,7 l0,7 M-3,8 l0,7 M4,8 l0,7 M9,7 l0,7" stroke={TINTA_CORRAL} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <ellipse cx="0" cy="0" rx="13" ry="8.5" fill={color} stroke={TINTA_CORRAL} strokeWidth="1.3" />
      <path d="M-13,-1 c-4,0 -5,-4 -1,-5" stroke={TINTA_CORRAL} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <circle cx="12" cy="-2" r="6" fill={color} stroke={TINTA_CORRAL} strokeWidth="1.3" />
      <path d="M9,-7 l2.5,-4 l3.5,2.6 Z" fill={color} stroke={TINTA_CORRAL} strokeWidth="1" strokeLinejoin="round" />
      <ellipse cx="17.5" cy="-1" rx="2.8" ry="2.2" fill="#f2cfc9" stroke={TINTA_CORRAL} strokeWidth="0.9" />
      <circle cx="16.8" cy="-1.4" r="0.6" fill={TINTA_CORRAL} />
      <circle cx="18.3" cy="-1.4" r="0.6" fill={TINTA_CORRAL} />
      <circle cx="13" cy="-4" r="0.9" fill={TINTA_CORRAL} />
    </g>
  );
}

function Gallina2D({ color = '#c98a5a' }) {
  return (
    <g>
      <path d="M-1,5 l-1,6 M3,5 l1,6" stroke="#c98a2f" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M-7,-2 q-5,-4 -4,-9 q4,2 6,6" fill={color} stroke={TINTA_CORRAL} strokeWidth="1.2" strokeLinejoin="round" />
      <ellipse cx="0" cy="0" rx="7.5" ry="5.5" fill={color} stroke={TINTA_CORRAL} strokeWidth="1.2" />
      <circle cx="7" cy="-6" r="3.4" fill={color} stroke={TINTA_CORRAL} strokeWidth="1.2" />
      <path d="M5.5,-9.5 q1,-2.2 2.1,-0.6 q1,-2.2 2.1,-0.4" stroke="#c4372a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M10.4,-6.4 l3,1 l-3,1.4 Z" fill="#e0932f" stroke={TINTA_CORRAL} strokeWidth="0.7" strokeLinejoin="round" />
      <circle cx="7.8" cy="-6.8" r="0.8" fill={TINTA_CORRAL} />
    </g>
  );
}

function Oveja2D() {
  return (
    <g>
      <path d="M-6,7 l0,8 M6,7 l0,8" stroke={TINTA_CORRAL} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <g fill="#f4efe3" stroke={TINTA_CORRAL} strokeWidth="1.2">
        <ellipse cx="0" cy="0" rx="12" ry="8" />
        <circle cx="-8" cy="-5" r="4.4" />
        <circle cx="0" cy="-6.6" r="4.6" />
        <circle cx="8" cy="-5" r="4.4" />
      </g>
      <ellipse cx="13" cy="-3" rx="4.5" ry="3.6" fill="#5a4638" />
      <ellipse cx="10.5" cy="-6" rx="2.2" ry="1.3" fill="#5a4638" />
      <circle cx="14.6" cy="-3.6" r="0.7" fill="#f4efe3" />
    </g>
  );
}

const SILUETA_HATO = { vaca: Vaca2D, cerdo: Cerdo2D, gallina: Gallina2D, oveja: Oveja2D };
/* pelaje por raza (mismo dato del registro; default digno por especie) */
const PELAJE_HATO = {
  cerdo: { zungo: '#564440', duroc: '#b06a42', landrace: '#e8b0a8', 'sanpedreño': '#8a5f4a', 'casco de mula': '#c9884a' },
  vaca: { normando: '#e7d9c2', 'cebú': '#d8d2c6' },
  gallina: { campesina: '#c98a5a', ponedora: '#f2ead8' },
};
const ESCALA_HATO = { 'pequeño': 0.62, mediano: 0.8, grande: 1 };
/* sitios deterministas dentro del corral (se pintan de atrás hacia adelante) */
const SITIOS_CORRAL = [
  [80, 96], [148, 90], [214, 96], [64, 126], [124, 120],
  [184, 124], [242, 122], [158, 152], [220, 150],
];

/* El corral leyendo el MISMO hato que el diorama 3D (params.animales): cada
   animal con su silueta por especie, su escala por tamaño y su pelaje por raza;
   los MOMENTOS se ven — el vendido queda de fantasma, el que nace brilla, el
   que murió deja su piedrita con flor. Antes eran dos manchas anónimas. */
function FondoRecinto({ params, acento }) {
  const hato = Array.isArray(params?.animales) ? params.animales : [];
  const memoria = hato.some((a) => a.estado === 'muerte');
  const visibles = hato.filter((a) => a.estado !== 'muerte').slice(0, SITIOS_CORRAL.length);
  const siluetas = visibles
    .map((a, i) => ({ a, x: SITIOS_CORRAL[i][0], y: SITIOS_CORRAL[i][1], key: `${a.nombre || 'x'}-${i}` }))
    .sort((p, q) => p.y - q.y);
  const postes = Array.from({ length: 12 }, (_, i) => {
    const ang = (i / 12) * Math.PI * 2;
    return { key: i, x: 150 + Math.cos(ang) * 112, y: 118 + Math.sin(ang) * 54, puerta: i === 3 };
  });
  return (
    <g>
      <rect x="0" y="0" width="300" height="200" fill="#f2e6cf" />
      <ellipse cx="150" cy="118" rx="120" ry="60" fill="#a98a5c" />
      <ellipse cx="150" cy="118" rx="94" ry="46" fill="none" stroke={acento} strokeWidth="3" strokeDasharray="6 5" opacity="0.55" />
      {/* la ramada al fondo del corral */}
      <g transform="translate(150,64)">
        <path d="M-20,10 l0,13 M20,10 l0,13" stroke={TINTA_CORRAL} strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <path d="M-27,11 L0,-6 L27,11 Z" fill="#8a5f3a" stroke={TINTA_CORRAL} strokeWidth="1.4" strokeLinejoin="round" />
      </g>
      {/* la cerca de palos con su puerta */}
      {postes.map((p) =>
        p.puerta ? (
          <g key={p.key} transform={`translate(${p.x},${p.y})`} stroke="#8a6038" strokeWidth="2" strokeLinecap="round" fill="none">
            <path d="M-10,-10 h20 M-10,-3 h20 M-10,-10 l20,7" />
            <path d="M-10,-12 l0,12 M10,-12 l0,12" stroke="#7a5334" strokeWidth="2.6" />
          </g>
        ) : (
          <line key={p.key} x1={p.x} y1={p.y - 11} x2={p.x} y2={p.y + 1} stroke="#7a5334" strokeWidth="3" strokeLinecap="round" />
        ),
      )}
      {/* del corral al abono: la pila que humea */}
      <g transform="translate(84,152)">
        <path d="M-13,4 a13,10 0 0 1 26,0 Z" fill="#6b4a2e" stroke={TINTA_CORRAL} strokeWidth="1.2" />
        <path d="M-3,-8 q-3,-3 0,-6 q3,-3 0,-6 M4,-6 q-2.4,-2.6 0,-5 q2.4,-2.6 0,-5" stroke="#d8cfc0" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </g>
      {/* el hato, animal por animal (especie/tamaño/raza/estado del registro) */}
      {siluetas.map(({ a, x, y, key }) => {
        const Silueta = SILUETA_HATO[a.especie];
        if (!Silueta) return null;
        const s = ESCALA_HATO[a.tamano] || 0.8;
        const color = PELAJE_HATO[a.especie]?.[a.raza];
        const nace = a.estado === 'nace';
        return (
          <g key={key} transform={`translate(${x},${y}) scale(${nace ? s * 0.72 : s})`} opacity={a.estado === 'vendido' ? 0.28 : 1}>
            <Silueta color={color} mancha={a.especie === 'vaca' && a.raza === 'normando' ? '#a5683a' : undefined} />
            {a.estado === 'preñada' && (
              <path d="M0,-14 C-3.4,-17.2 -1.6,-20.8 0,-18.6 C1.6,-20.8 3.4,-17.2 0,-14 Z" fill="#d87a8a" />
            )}
            {nace && (
              <path d="M14,-18 L15.4,-14.6 L19,-13.4 L15.4,-12.2 L14,-8.8 L12.6,-12.2 L9,-13.4 L12.6,-14.6 Z" fill="#f6d98a" />
            )}
          </g>
        );
      })}
      {/* la despedida con respeto: piedrita y flor, afuerita del corral */}
      {memoria && (
        <g transform="translate(283,178)">
          <path d="M-6,4 a6,5 0 1 1 12,0 Z" fill="#b0a898" stroke={TINTA_CORRAL} strokeWidth="1" />
          <path d="M8,4 q0.5,-6 1.5,-9" stroke="#4f8a34" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <g fill="#e8a9b4">
            <circle cx="9.5" cy="-7.4" r="1.7" />
            <circle cx="7.2" cy="-5.6" r="1.7" />
            <circle cx="11.8" cy="-5.6" r="1.7" />
          </g>
          <circle cx="9.5" cy="-5.9" r="1.1" fill="#f2cf6a" />
        </g>
      )}
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

/* Los 7 ESTRATOS del bosque comestible, de PERFIL (el gemelo 2D de `disenio`):
   emergente, copa media, arbusto, hierba, rastrera, la trepadora subiendo por
   el tronco y las raíces bajo el suelo. Los colores siguen siendo el dato
   (`params.estratos`, uno por estrato) — antes eran bandas planas sin dibujo
   y la lámina no leía nada. */
function FondoEstratos({ params, acento }) {
  if (Array.isArray(params?.pisos)) return <FondoPisos pisos={params.pisos} />;
  const defaults = ['#2f5f34', '#3a6f3f', '#4a7d45', '#5f8a3f', '#7aa24a', '#8fae55', '#8a6a44'];
  const cs = (params?.estratos || []).map((e) => e.color);
  const c = (i) => cs[i] || defaults[i];
  const sueloY = 162;
  return (
    <g>
      <rect x="0" y="0" width="300" height="200" fill="#eaf2df" />
      <circle cx="260" cy="28" r="16" fill="#f6d98a" opacity="0.4" />
      <circle cx="260" cy="28" r="10" fill="#f2cf6a" />
      {/* estrato 7: el suelo con sus raíces y tubérculos */}
      <rect x="0" y={sueloY} width="300" height={200 - sueloY} fill={c(6)} />
      <rect x="0" y={sueloY - 3} width="300" height="5" fill="#6f9a45" />
      <g stroke="#6b4a2e" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.8">
        <path d={`M50,${sueloY + 2} l-7,14 M50,${sueloY + 2} l0,17 M50,${sueloY + 2} l8,13`} />
        <path d={`M127,${sueloY + 2} l-6,12 M127,${sueloY + 2} l5,14`} />
        <path d={`M195,${sueloY + 2} l-4,10 M195,${sueloY + 2} l4,11`} />
      </g>
      <g fill="#c9a86a" stroke="#8a6038" strokeWidth="0.9">
        <ellipse cx="88" cy="182" rx="6" ry="4" />
        <ellipse cx="99" cy="187" rx="4.6" ry="3.4" />
      </g>
      <g transform="translate(238,178) rotate(12)">
        <path d="M-3,-8 C3,-8 4,2 0,9 C-4,2 -7,-7 -3,-8 Z" fill="#e0932f" stroke="#9a6428" strokeWidth="0.9" />
        <path d="M-1,-8 l-1,-4 M-1,-8 l2,-4" stroke="#4f8a34" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      </g>
      {/* estrato 1: el árbol emergente */}
      <rect x="46" y="58" width="7" height={sueloY - 58} rx="3" fill="#6b4a2e" />
      <g fill={c(0)} stroke="#24491f" strokeWidth="1.2">
        <ellipse cx="50" cy="50" rx="34" ry="26" />
        <ellipse cx="72" cy="64" rx="17" ry="12" />
      </g>
      {/* estrato 6: la trepadora que le sube por el tronco */}
      <path
        d={`M49,${sueloY} C41,146 59,138 50,124 C42,112 58,104 50,92 C44,84 56,78 50,70`}
        stroke={c(5)} strokeWidth="2.2" fill="none" strokeLinecap="round"
      />
      {[[44, 140], [56, 108], [45, 87]].map(([hx, hy]) => (
        <circle key={`${hx}-${hy}`} cx={hx} cy={hy} r="2.6" fill={c(5)} />
      ))}
      <circle cx="53" cy="126" r="1.6" fill="#f2c531" />
      <circle cx="47" cy="98" r="1.6" fill="#f2c531" />
      {/* estrato 2: el árbol de copa media, con su fruta */}
      <rect x="124" y="112" width="6" height={sueloY - 112} rx="2.5" fill="#7a5334" />
      <ellipse cx="127" cy="102" rx="26" ry="21" fill={c(1)} stroke="#2c5426" strokeWidth="1.2" />
      {[[116, 96], [132, 90], [138, 106], [122, 110]].map(([fx, fy]) => (
        <circle key={`${fx}-${fy}`} cx={fx} cy={fy} r="2.2" fill="#e0452e" />
      ))}
      {/* estrato 3: el arbusto (la mora, el lulo) */}
      <g fill={c(2)} stroke="#2c5426" strokeWidth="1.1">
        <circle cx="188" cy="144" r="14" />
        <circle cx="200" cy="150" r="10" />
      </g>
      {[[184, 140], [194, 148], [202, 146]].map(([bx, by]) => (
        <circle key={`${bx}-${by}`} cx={bx} cy={by} r="1.6" fill="#5a2a6a" />
      ))}
      {/* estrato 4: las herbáceas con su flor */}
      <g stroke={c(3)} strokeWidth="2" fill="none" strokeLinecap="round">
        <path d={`M229,${sueloY} l-4,-22 M236,${sueloY} l0,-27 M243,${sueloY} l4,-21`} />
        <path d={`M232,148 l-5,-3 M236,144 l5,-4 M245,150 l5,-2`} strokeWidth="1.4" />
      </g>
      <circle cx="225" cy="138" r="2.4" fill="#f2c531" />
      <circle cx="236" cy="133" r="2.6" fill="#f2c531" />
      <circle cx="247" cy="139" r="2.4" fill="#f2c531" />
      {/* estrato 5: la rastrera que tapa el suelo */}
      <path d={`M254,${sueloY - 2} C266,156 282,158 296,${sueloY - 4}`} stroke={c(4)} strokeWidth="2" fill="none" strokeLinecap="round" />
      {[[258, 157, 4.6], [270, 154, 5.2], [284, 156, 4.4], [294, 159, 3.6]].map(([hx, hy, r]) => (
        <circle key={`${hx}-${hy}`} cx={hx} cy={hy} r={r} fill={c(4)} />
      ))}
      <circle cx="277" cy="159" r="3.4" fill="#cf8f3c" stroke="#9a6428" strokeWidth="0.9" />
      <rect x="0" y="0" width="300" height="200" fill="none" stroke={acento} strokeWidth="2" opacity="0.35" />
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
  // 🔴 El fallback era la ÚLTIMA lista de CUATRO pisos con paleta propia que
  // quedaba viva (`#c7a24b`/`#8fae55`/`#6f9a72`/`#9fb6bf`): el gemelo 2D —el que
  // ve el equipo humilde— enseñaba cuatro bandas inventadas cada vez que le
  // faltaban `params`, mientras el 3D enseñaba siete. Ahora, con o sin params,
  // son las SIETE de la tabla canónica.
  const pisos = params?.pisos || BOVEDA_PISOS_DEF;
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

/* La RED DEL SUELO (wood-wide web) en lámina: la cámara bajo tierra. Arriba, la
   franja de superficie (árbol madre, maíz, ahuyama y los hongos); abajo, las
   raíces y la red de hifas bioluminiscente que las enlaza, con los pulsos del
   intercambio: dorado = azúcar que baja de la planta al hongo, claro = fósforo
   y agua que suben. Antes el motivo `micorrizas` NO estaba en el mapa de fondos
   y el gemelo 2D salía como una lámina vacía. */
function FondoMicorrizas({ acento }) {
  const hilos = [
    'M40,84 C70,120 110,116 148,72',
    'M62,92 C110,150 180,146 224,70',
    'M150,76 C176,110 200,104 226,72',
    'M34,88 C60,150 140,168 232,150',
    'M84,80 C104,96 128,96 146,78',
    'M120,150 C150,170 190,166 218,120',
  ];
  const ramitas = ['M96,116 l10,-8', 'M180,142 l8,-10', 'M120,104 l-8,-8', 'M204,120 l10,4', 'M70,120 l-10,2'];
  const nodos = [[40, 84], [62, 92], [84, 80], [149, 75], [225, 71], [232, 150], [120, 150]];
  const sube = [[150, 96], [153, 86], [226, 92], [223, 80]];
  const baja = [[58, 108], [66, 122], [96, 118], [174, 144]];
  return (
    <g>
      {/* la franja de superficie: el mundo de arriba que la red sostiene */}
      <rect x="0" y="0" width="300" height="34" fill="#dbe8dc" />
      <rect x="0" y="34" width="300" height="12" fill="#5f8a3f" />
      {/* el árbol madre */}
      <rect x="48" y="16" width="6" height="30" rx="2.5" fill="#6b4a2e" />
      <ellipse cx="51" cy="13" rx="20" ry="12" fill="#3f6f3a" />
      <ellipse cx="37" cy="19" rx="10" ry="7" fill="#4d7f42" />
      {/* el maíz y la ahuyama (las hermanas de la red) */}
      <g stroke="#4a7a2c" strokeWidth="2.4" fill="none" strokeLinecap="round">
        <path d="M150,46 L150,22" />
        <path d="M150,34 C142,32 136,26 134,20" />
        <path d="M150,30 C158,28 164,22 166,16" />
      </g>
      <ellipse cx="228" cy="42" rx="13" ry="6" fill="#55923f" />
      <ellipse cx="244" cy="43" rx="8" ry="4.5" fill="#55923f" />
      <ellipse cx="236" cy="38" rx="6" ry="4.6" fill="#cf8f3c" stroke="#9a6428" strokeWidth="0.9" />
      {/* los hongos que asoman (el fruto de la red) */}
      <rect x="73" y="38" width="3" height="7" rx="1.5" fill="#e8dcc4" />
      <path d="M69,39 a5.5,4.5 0 0 1 11,0 Z" fill="#b5744a" stroke="#8a5334" strokeWidth="0.8" />
      <rect x="86" y="40" width="2.4" height="5.5" rx="1.2" fill="#e8dcc4" />
      <path d="M83,41 a4.2,3.6 0 0 1 8.4,0 Z" fill="#c98a5a" stroke="#8a5334" strokeWidth="0.7" />
      {/* el subsuelo, oscuro para que la red brille */}
      <rect x="0" y="46" width="300" height="74" fill="#3a2a1c" />
      <rect x="0" y="120" width="300" height="80" fill="#2a1e12" />
      {/* las raíces que la red enlaza */}
      <g stroke="#8a6a44" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <path d="M51,46 C44,62 40,76 40,84" />
        <path d="M51,46 C56,64 60,80 62,92" />
        <path d="M51,46 C40,58 34,76 34,88" />
        <path d="M51,46 C62,58 78,72 84,80" />
      </g>
      <g stroke="#a5825a" strokeWidth="1.5" fill="none" strokeLinecap="round">
        <path d="M150,46 l-6,24 M150,46 l0,30 M150,46 l7,26" />
        <path d="M228,46 l-5,22 M228,46 l4,26" />
      </g>
      {/* la red: halo tenue + hilo vivo (bioluminiscencia sin filtros) */}
      <g fill="none" strokeLinecap="round">
        {hilos.map((d) => (
          <path key={`h-${d}`} d={d} stroke="#7fe8d4" strokeWidth="5" opacity="0.14" />
        ))}
        {hilos.map((d) => (
          <path key={`c-${d}`} d={d} stroke="#5fd4c0" strokeWidth="1.4" opacity="0.9" />
        ))}
        {ramitas.map((d) => (
          <path key={`r-${d}`} d={d} stroke="#a9ead9" strokeWidth="0.9" opacity="0.7" />
        ))}
      </g>
      {/* nodos del tejido y pulsos del trueque: dorado baja, claro sube */}
      {nodos.map(([x, y]) => (
        <circle key={`n-${x}-${y}`} cx={x} cy={y} r="1.7" fill="#8fe8d8" opacity="0.9" />
      ))}
      {sube.map(([x, y]) => (
        <circle key={`s-${x}-${y}`} cx={x} cy={y} r="1.9" fill="#e6fff6" />
      ))}
      {baja.map(([x, y]) => (
        <circle key={`b-${x}-${y}`} cx={x} cy={y} r="2.3" fill="#e8c34a" />
      ))}
      <rect x="0" y="0" width="300" height="200" fill="none" stroke={acento} strokeWidth="2" opacity="0.35" />
    </g>
  );
}

const FONDOS = {
  cutaway: FondoCutaway, flujo: FondoFlujo, recinto: FondoRecinto, estratos: FondoEstratos, boveda: FondoBoveda,
  micorrizas: FondoMicorrizas,
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
