import React from 'react';
import './agent-living-scene.css';

/**
 * AgentLivingScene — "El organismo que conversa".
 * ===============================================================================
 * El fondo del chat del agente como un MUNDO VIVO que respira y REACCIONA al
 * estado del agente, distinto por tema. Reemplaza el rectángulo plano con velo
 * (`.agent-scrim`) por una escena de autor — la misma alma del home "Finca
 * Organismo" que el operador amó, ahora en la conversación.
 *
 * Cada tema es un organismo propio:
 *   · biopunk / biopunk2 → corazón-micelio nocturno (teal neón) con hifas de
 *     savia y esporas que suben.
 *   · nature             → amanecer que respira con sol-corazón cálido y polen.
 *   · verde-vivo         → dosel vivo, sol entre hojas, hojitas que caen.
 *   · minimalista        → UN solo pulso de tinta salvia sobre papel (cero motas,
 *     cero glow — el ADN minimalista: una línea que escucha).
 *
 * REACTIVIDAD (el "alma") — `state`:
 *   idle | listening | thinking | speaking → el CSS (agent-living-scene.css)
 *   cambia el gesto del organismo: respira lento / anillos que contraen hacia el
 *   corazón / doble latido rápido / ondas que emanan hacia afuera.
 *
 * Fondo OPACO (cubre la foto del body): cada tema pinta su propio gradiente
 * base. Los mensajes van sobre superficies opacas (.v3-card), legibles al sol
 * sobre cualquier escena. Todo es SVG/CSS declarativo; respeta
 * prefers-reduced-motion (estado estático digno) vía el CSS.
 *
 * @param {Object} props
 * @param {'biopunk'|'biopunk2'|'nature'|'verde-vivo'|'minimalista'} props.theme
 *   Tema EFECTIVO (ya resuelto: `auto`→nature/biopunk2 por el caller). biopunk2
 *   comparte la escena nocturna de biopunk.
 * @param {'idle'|'listening'|'thinking'|'speaking'} [props.state='idle']
 *   Estado del agente que dirige la reactividad de la escena.
 */
export default function AgentLivingScene({ theme, state = 'idle' }) {
  const t = theme === 'biopunk2' ? 'biopunk' : theme;
  const Scene =
    t === 'nature' ? NatureScene
      : t === 'verde-vivo' ? DoselScene
        : t === 'minimalista' ? MinimalScene
          : NightOrganism;
  return (
    <div className="als-root" data-state={state} data-ag-theme={t} aria-hidden="true" data-testid="agent-living-scene">
      <Scene />
    </div>
  );
}

/* ═══════════════ biopunk / biopunk2 — CORAZÓN-MICELIO NOCTURNO ═══════════════ */
function NightOrganism() {
  return (
    <svg className="als-svg" viewBox="0 0 390 800" preserveAspectRatio="xMidYMid slice" role="img" aria-label="La finca convertida en organismo bioluminiscente que respira mientras conversas">
      <defs>
        <linearGradient id="als-nsky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#04070f" />
          <stop offset=".5" stopColor="#061321" />
          <stop offset="1" stopColor="#030509" />
        </linearGradient>
        <radialGradient id="als-nheart" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#eafff6" />
          <stop offset=".38" stopColor="#2dffc4" />
          <stop offset=".8" stopColor="#0a9f74" stopOpacity=".35" />
          <stop offset="1" stopColor="#0a9f74" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="als-nglow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#2dffc4" stopOpacity=".9" />
          <stop offset="1" stopColor="#2dffc4" stopOpacity="0" />
        </radialGradient>
        <filter id="als-nb"><feGaussianBlur stdDeviation="12" /></filter>
        <radialGradient id="als-nvig" cx=".5" cy=".9" r=".8">
          <stop offset="0" stopColor="#030509" stopOpacity="0" />
          <stop offset="1" stopColor="#020308" stopOpacity=".55" />
        </radialGradient>
      </defs>

      <rect width="390" height="800" fill="url(#als-nsky)" />

      {/* aurora de páramo: cintas finas y muy sutiles cerca del cielo (no bloques) */}
      <path className="als-fog" d="M-30,86 C90,66 190,92 300,70 C350,60 380,72 420,64 L420,96 C300,86 200,108 90,94 C40,88 5,100 -30,102 Z" fill="#2dffc4" opacity=".07" filter="url(#als-nb)" />
      <path className="als-fog" style={{ animationDelay: '-7s' }} d="M-30,54 C100,40 210,60 320,42 L420,32 L420,58 C300,48 190,70 60,56 Z" fill="#b28dff" opacity=".05" filter="url(#als-nb)" />

      {/* estrellas / cocuyos */}
      <g fill="#dfeffc">
        <circle className="als-tw" cx="40" cy="60" r="1.2" />
        <circle className="als-tw" style={{ animationDelay: '-1s' }} cx="96" cy="90" r=".9" />
        <circle className="als-tw" style={{ animationDelay: '-2.2s' }} cx="150" cy="46" r="1.1" />
        <circle className="als-tw" style={{ animationDelay: '-.6s' }} cx="300" cy="70" r="1" />
        <circle className="als-tw" style={{ animationDelay: '-1.7s' }} cx="352" cy="44" r="1.2" />
        <circle className="als-tw" style={{ animationDelay: '-2.9s' }} cx="64" cy="120" r=".8" fill="#2dffc4" />
        <circle className="als-tw" style={{ animationDelay: '-1.4s' }} cx="330" cy="120" r=".8" fill="#ff4fd8" />
      </g>

      {/* ── EL CORAZÓN (presencia) ── */}
      <circle className="als-halo" cx="195" cy="150" r="46" fill="url(#als-nglow)" opacity=".5" />
      {/* ondas al hablar */}
      <circle className="als-wave" cx="195" cy="150" r="30" fill="none" stroke="#2dffc4" strokeWidth="1.6" />
      <circle className="als-wave als-w2" cx="195" cy="150" r="30" fill="none" stroke="#7affe0" strokeWidth="1.2" />
      <circle className="als-wave als-w3" cx="195" cy="150" r="30" fill="none" stroke="#ff4fd8" strokeWidth=".9" />
      {/* anillos al escuchar */}
      <circle className="als-listenring" cx="195" cy="150" r="30" fill="none" stroke="#2dffc4" strokeWidth="1.4" />
      <circle className="als-listenring als-l2" cx="195" cy="150" r="30" fill="none" stroke="#7affe0" strokeWidth="1.1" />
      <circle className="als-listenring als-l3" cx="195" cy="150" r="30" fill="none" stroke="#9dff3f" strokeWidth=".9" />
      {/* cuerpo del corazón-semilla */}
      <g className="als-heart">
        <circle cx="195" cy="150" r="30" fill="url(#als-nheart)" />
        <path d="M195,134 C205,140 205,160 195,168 C185,160 185,140 195,134 Z" fill="#0e5a44" stroke="#2dffc4" strokeWidth="1.3" />
        <circle cx="195" cy="151" r="6.5" fill="#eafff6" />
        <circle cx="195" cy="151" r="2.6" fill="#ff8fe4" />
      </g>

      {/* ── HIFAS con savia que bajan del corazón y se abren ── */}
      <g className="als-net" fill="none" stroke="#2dffc4" strokeWidth="1.3" style={{ filter: 'drop-shadow(0 0 3px rgba(45,255,196,.5))' }}>
        <path className="als-thread" d="M195,180 C140,260 70,360 30,560" />
        <path className="als-thread als-slow" d="M195,180 C250,260 320,360 360,560" />
        <path className="als-thread als-rev" d="M195,180 C170,300 150,460 130,660" />
        <path className="als-thread als-slow als-rev" d="M195,180 C220,300 240,460 262,660" />
        <path className="als-thread" d="M195,180 C120,340 80,520 96,740" />
        <path className="als-thread als-slow" d="M195,180 C270,340 310,520 300,740" />
      </g>
      {/* bulbos de raíz al final de las hifas */}
      <g>
        {[[30, 560], [360, 560], [130, 660], [262, 660], [96, 740], [300, 740]].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="10" fill="url(#als-nglow)" opacity=".55" />
            <circle cx={x} cy={y} r="2.4" fill="#bfffe9" />
          </g>
        ))}
      </g>

      {/* viñeta baja: asienta el compositor sin tapar la escena */}
      <rect y="420" width="390" height="380" fill="url(#als-nvig)" />

      {/* esporas que suben */}
      {[[70, 620, '#9dff3f', 0], [150, 700, '#2dffc4', -3], [250, 640, '#ff8fe4', -6], [320, 720, '#4fd8ff', -2], [110, 560, '#d8ff6a', -9], [300, 500, '#2dffc4', -5]].map(([x, y, c, d], i) => (
        <circle key={i} className="als-mote" style={{ animationDelay: `${d}s`, filter: `drop-shadow(0 0 3px ${c})` }} cx={x} cy={y} r="2.2" fill={c} />
      ))}
    </svg>
  );
}

/* ═══════════════════════ nature — AMANECER QUE RESPIRA ══════════════════════ */
function NatureScene() {
  return (
    <svg className="als-svg" viewBox="0 0 390 800" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Un amanecer de finca que respira mientras conversas: sol cálido, polen y ramas de café">
      <defs>
        <radialGradient id="als-asky" cx=".68" cy=".16" r="1">
          <stop offset="0" stopColor="#ffe8c2" />
          <stop offset=".28" stopColor="#f8d9a6" />
          <stop offset=".55" stopColor="#f3c98e" />
          <stop offset="1" stopColor="#eef0db" />
        </radialGradient>
        <radialGradient id="als-sun" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#fff6df" />
          <stop offset=".5" stopColor="#f5b733" />
          <stop offset="1" stopColor="#f5b733" stopOpacity="0" />
        </radialGradient>
        <filter id="als-ab"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>

      <rect width="390" height="800" fill="url(#als-asky)" />

      {/* haces de sol */}
      <g className="als-beam" style={{ transformOrigin: '300px 130px' }}>
        <path d="M300,130 L250,420 L350,420 Z" fill="#ffd98a" opacity=".3" />
        <path d="M300,130 L200,440 L280,440 Z" fill="#ffe6b0" opacity=".22" />
      </g>

      {/* ── EL SOL-CORAZÓN (presencia) ── */}
      <circle className="als-halo" cx="300" cy="130" r="70" fill="url(#als-sun)" opacity=".5" filter="url(#als-ab)" />
      <circle className="als-wave" cx="300" cy="130" r="40" fill="none" stroke="#f5b733" strokeWidth="1.6" />
      <circle className="als-wave als-w2" cx="300" cy="130" r="40" fill="none" stroke="#f0a83a" strokeWidth="1.2" />
      <circle className="als-wave als-w3" cx="300" cy="130" r="40" fill="none" stroke="#d9742a" strokeWidth=".9" />
      <circle className="als-listenring" cx="300" cy="130" r="40" fill="none" stroke="#f5b733" strokeWidth="1.4" />
      <circle className="als-listenring als-l2" cx="300" cy="130" r="40" fill="none" stroke="#e79a2f" strokeWidth="1.1" />
      <g className="als-heart">
        <circle cx="300" cy="130" r="34" fill="url(#als-sun)" />
        <circle cx="300" cy="130" r="22" fill="#fff2d0" />
        <circle cx="300" cy="130" r="22" fill="none" stroke="#f5b733" strokeWidth="1.4" opacity=".7" />
      </g>

      {/* ramas de café desde las esquinas bajas + hojas salvia */}
      <g className="als-net" fill="none" stroke="#8a6a3c" strokeWidth="3" strokeLinecap="round" opacity=".8">
        <path className="als-thread als-slow" d="M-10,800 C40,700 30,600 70,520 C96,466 90,420 120,380" />
        <path className="als-thread als-slow als-rev" d="M400,800 C350,690 360,600 320,520 C296,470 300,430 276,392" />
      </g>
      <g fill="#7a8f4a">
        {[[70, 520], [96, 466], [120, 380], [320, 520], [296, 470], [276, 392]].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx="9" ry="4.4" transform={`rotate(${i % 2 ? 22 : -22} ${x} ${y})`} />
        ))}
      </g>
      {/* cerezas de café neón cálido */}
      <g fill="#d9742a">
        <circle cx="78" cy="528" r="2.4" /><circle cx="128" cy="386" r="2.4" /><circle cx="312" cy="528" r="2.4" /><circle cx="284" cy="398" r="2.4" />
      </g>

      {/* polen que sube */}
      {[[120, 620, 0], [200, 700, -3], [270, 640, -6], [90, 560, -8], [320, 700, -2], [180, 560, -10]].map(([x, y, d], i) => (
        <circle key={i} className="als-mote" style={{ animationDelay: `${d}s` }} cx={x} cy={y} r="2.2" fill={i % 2 ? '#f5b733' : '#e79a2f'} opacity=".8" />
      ))}
    </svg>
  );
}

/* ══════════════════════ verde-vivo — DOSEL VIVO ═════════════════════════════ */
function DoselScene() {
  return (
    <svg className="als-svg" viewBox="0 0 390 800" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Un dosel de finca viva que respira mientras conversas: sol entre las hojas y hojitas que caen">
      <defs>
        <linearGradient id="als-dsky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dfeecb" />
          <stop offset=".4" stopColor="#eef3e2" />
          <stop offset="1" stopColor="#e6efd4" />
        </linearGradient>
        <radialGradient id="als-dsun" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#fff6df" />
          <stop offset=".5" stopColor="#f2b441" />
          <stop offset="1" stopColor="#f2b441" stopOpacity="0" />
        </radialGradient>
        <filter id="als-db"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>

      <rect width="390" height="800" fill="url(#als-dsky)" />

      {/* dosel: masas de hojas oscuras arriba */}
      <g fill="#3a6b2b" opacity=".9">
        <path d="M-20,-10 C40,50 90,30 130,70 C90,80 40,60 -20,90 Z" />
        <path d="M410,-10 C350,60 300,30 250,74 C300,84 360,64 410,96 Z" />
        <path d="M120,-10 C160,44 220,40 270,-10 Z" />
      </g>
      <g fill="#4c8536" opacity=".7">
        <path d="M-20,60 C30,96 70,80 100,110 C60,118 20,104 -20,130 Z" />
        <path d="M410,60 C360,100 320,84 288,114 C330,122 370,110 410,134 Z" />
      </g>

      {/* haz de sol entre las hojas */}
      <g className="als-beam" style={{ transformOrigin: '195px 60px' }}>
        <path d="M195,60 L150,440 L240,440 Z" fill="#fff0c0" opacity=".3" />
      </g>

      {/* ── EL SOL-CORAZÓN entre el dosel ── */}
      <circle className="als-halo" cx="195" cy="150" r="64" fill="url(#als-dsun)" opacity=".5" filter="url(#als-db)" />
      <circle className="als-wave" cx="195" cy="150" r="36" fill="none" stroke="#f2b441" strokeWidth="1.6" />
      <circle className="als-wave als-w2" cx="195" cy="150" r="36" fill="none" stroke="#2e8b3d" strokeWidth="1.2" />
      <circle className="als-wave als-w3" cx="195" cy="150" r="36" fill="none" stroke="#e0922e" strokeWidth=".9" />
      <circle className="als-listenring" cx="195" cy="150" r="36" fill="none" stroke="#f2b441" strokeWidth="1.4" />
      <circle className="als-listenring als-l2" cx="195" cy="150" r="36" fill="none" stroke="#2e8b3d" strokeWidth="1.1" />
      <g className="als-heart">
        <circle cx="195" cy="150" r="30" fill="url(#als-dsun)" />
        <circle cx="195" cy="150" r="19" fill="#fff4cf" />
        <circle cx="195" cy="150" r="19" fill="none" stroke="#e0922e" strokeWidth="1.3" opacity=".7" />
      </g>

      {/* enredaderas que bajan (savia) */}
      <g className="als-net" fill="none" stroke="#3a6b2b" strokeWidth="2.4" strokeLinecap="round" opacity=".7">
        <path className="als-thread als-slow" d="M50,120 C40,300 70,500 40,760" />
        <path className="als-thread als-slow als-rev" d="M340,120 C350,300 320,500 352,760" />
      </g>

      {/* hojitas que CAEN meciéndose */}
      {[[70, 240, 0], [150, 200, -4], [250, 260, -7], [320, 220, -2], [110, 300, -9], [290, 320, -5]].map(([x, y, d], i) => (
        <g key={i} className="als-mote als-fall" style={{ animationDelay: `${d}s` }}>
          <ellipse cx={x} cy={y} rx="6" ry="3" fill={i % 2 ? '#5aa83a' : '#7ab84a'} transform={`rotate(${i % 2 ? 20 : -18} ${x} ${y})`} />
        </g>
      ))}
    </svg>
  );
}

/* ════════════════════ minimalista — UN SOLO PULSO ══════════════════════════ */
function MinimalScene() {
  return (
    <svg className="als-svg" viewBox="0 0 390 800" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Una sola línea de tinta que escucha mientras conversas">
      <rect width="390" height="800" fill="#f6f3ec" />

      {/* horizonte: una hairline */}
      <line x1="0" y1="600" x2="390" y2="600" stroke="#e3ddd0" strokeWidth="1" />

      {/* UN solo pulso (tinta salvia) alrededor de un punto-corazón */}
      <circle className="als-pulse" cx="195" cy="200" r="26" fill="none" stroke="#2f6e5a" strokeWidth="1" opacity=".4" />
      <circle className="als-wave" cx="195" cy="200" r="20" fill="none" stroke="#2f6e5a" strokeWidth=".9" />
      <circle className="als-wave als-w2" cx="195" cy="200" r="20" fill="none" stroke="#5a7d6e" strokeWidth=".7" />
      <circle className="als-listenring" cx="195" cy="200" r="20" fill="none" stroke="#2f6e5a" strokeWidth=".9" />
      <circle className="als-listenring als-l2" cx="195" cy="200" r="20" fill="none" stroke="#5a7d6e" strokeWidth=".7" />
      <g className="als-heart">
        <circle cx="195" cy="200" r="6" fill="none" stroke="#2f6e5a" strokeWidth="1.4" />
        <circle cx="195" cy="200" r="1.8" fill="#2f6e5a" />
      </g>
    </svg>
  );
}
