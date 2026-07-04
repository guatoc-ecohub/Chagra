/**
 * SceneTrazoMinimal — la escena "UN SOLO TRAZO" del tema MINIMALISTA.
 *
 * La finca dibujada a LÍNEA sobre papel: poca tinta, mucho aire. Una loma,
 * la casa con su humo, un árbol de copa garabateada con elegancia, surcos,
 * el túnel del invernadero, una flor y el colibrí de línea con un único
 * punto dorado en la garganta. El sol es el ÚNICO plano de color.
 *
 * El alma de la escena: al entrar, el trazo SE DIBUJA SOLO (stroke-dashoffset
 * con pathLength normalizado, orquestado por etapas fvm-t1…fvm-t9); después
 * queda una vida mínima — el ave planea, el humo fluye, la flor y el colibrí
 * respiran, el halo del sol late apenas. Cero JS por frame. Prefijo `fvm-`.
 * prefers-reduced-motion = el dibujo completo, quieto (digno desde el primer
 * frame). Solo se monta con el tema minimalista (lo decide FincaVivaHero).
 *
 * @param {Object} props
 * @param {{tiene:boolean, forma:?string}} [props.estructura] estructura de
 *   cubierta declarada (#34): el túnel de línea porta el marcador
 *   fvh-estructura SOLO si fue declarada (contrato de estructura.test.jsx).
 */
export default function SceneTrazoMinimal({ estructura }) {
  const conEstructura = !!estructura?.tiene;
  const ink = '#414b42';
  const sage = '#6f9a85';
  const gold = '#cbb96a';
  return (
    <svg
      className="fvm-svg"
      viewBox="0 0 390 486"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Su finca dibujada en línea limpia sobre papel: una loma, la casa con su humo, un árbol, surcos, el túnel del invernadero, el sol dorado y un colibrí de línea junto a una flor."
      data-testid="fvm-escena"
    >
      <defs>
        <linearGradient id="fvm-papel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#edf0e8" />
          <stop offset=".3" stopColor="#f8f5ee" />
          <stop offset="1" stopColor="#f6f3ec" />
        </linearGradient>
      </defs>

      {/* papel */}
      <rect width="390" height="486" fill="url(#fvm-papel)" />

      {/* ── sol: el único plano de color (aparece al final del trazo) ── */}
      <g className="fvm-fade fvm-t8">
        <circle className="fvm-halo" cx="306" cy="92" r="36" fill="none" stroke={gold} strokeWidth="1" opacity=".4" />
        <circle cx="306" cy="92" r="26" fill={gold} />
      </g>

      {/* ── ave que planea (una 'm' de tinta) ── */}
      <g className="fvm-ave">
        <g className="fvm-t7">
          <path className="fvm-draw" pathLength="1" d="M84,112 q6,-7 13,0 q6,-7 13,0" fill="none" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
        </g>
      </g>

      {/* ── cordal de fondo (medio tono) ── */}
      <g className="fvm-t1">
        <path className="fvm-draw" pathLength="1" d="M-4,258 C90,236 160,254 232,240 C300,227 344,244 394,234" fill="none" stroke={sage} strokeWidth="1.3" opacity=".55" strokeLinecap="round" />
      </g>

      {/* ── la loma principal ── */}
      <g className="fvm-t2">
        <path className="fvm-draw" pathLength="1" d="M-4,320 C80,298 170,314 250,302 C310,293 352,302 394,296" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* ── surcos (tres arcos que respiran aire entre sí) ── */}
      <g className="fvm-t3" opacity=".5">
        <path className="fvm-draw" pathLength="1" d="M60,352 Q160,336 260,346" fill="none" stroke={ink} strokeWidth="1.4" strokeLinecap="round" />
        <path className="fvm-draw" pathLength="1" d="M48,372 Q170,352 286,364" fill="none" stroke={ink} strokeWidth="1.4" strokeLinecap="round" />
        <path className="fvm-draw" pathLength="1" d="M40,392 Q180,368 306,382" fill="none" stroke={ink} strokeWidth="1.4" strokeLinecap="round" />
      </g>

      {/* ── la casa (techo, muros, puerta, chimenea) ── */}
      <g className="fvm-t4">
        <path className="fvm-draw" pathLength="1" d="M78,272 L108,246 L138,272" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path className="fvm-draw" pathLength="1" d="M84,272 V302" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" />
        <path className="fvm-draw" pathLength="1" d="M132,272 V302" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" />
        <path className="fvm-draw" pathLength="1" d="M78,302 H138" fill="none" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
        <path className="fvm-draw" pathLength="1" d="M104,302 V286 q0,-5 5,-5 q5,0 5,5 V302" fill="none" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
        <path className="fvm-draw" pathLength="1" d="M125,259 V244 H132 V265" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* humo: línea que fluye siempre */}
      <g className="fvm-fade fvm-t5">
        <path className="fvm-humo" d="M128,240 q-5,-8 1,-13 q6,-5 1,-12" fill="none" stroke={sage} strokeWidth="1.6" strokeLinecap="round" />
      </g>

      {/* ── el árbol (copa en un garabato elegante) ── */}
      <g className="fvm-t5">
        <path className="fvm-draw" pathLength="1" d="M298,298 C299,272 297,252 299,236" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
        <path className="fvm-draw" pathLength="1" d="M298,262 C306,256 312,252 318,250" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
        <path className="fvm-draw" pathLength="1" d="M299,236 C282,232 272,218 280,204 C288,190 312,186 324,196 C336,206 332,224 318,230 C308,234 302,232 299,236" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
        <path className="fvm-draw" pathLength="1" d="M290,214 C296,206 308,204 314,210" fill="none" stroke={sage} strokeWidth="1.4" opacity=".7" strokeLinecap="round" />
      </g>

      {/* ── túnel del invernadero (estructura declarada #34) ── */}
      <g
        className="fvm-t6"
        {...(conEstructura
          ? { 'data-testid': 'fvh-estructura', 'data-forma': estructura.forma || 'generica' }
          : {})}
      >
        <path className="fvm-draw" pathLength="1" d="M20,306 Q20,284 44,284 Q68,284 68,306" fill="none" stroke={sage} strokeWidth="1.7" strokeLinecap="round" />
        <path className="fvm-draw" pathLength="1" d="M32,306 V290" fill="none" stroke={sage} strokeWidth="1.2" opacity=".7" strokeLinecap="round" />
        <path className="fvm-draw" pathLength="1" d="M44,306 V284.5" fill="none" stroke={sage} strokeWidth="1.2" opacity=".7" strokeLinecap="round" />
        <path className="fvm-draw" pathLength="1" d="M56,306 V290" fill="none" stroke={sage} strokeWidth="1.2" opacity=".7" strokeLinecap="round" />
        <path className="fvm-draw" pathLength="1" d="M16,306 H72" fill="none" stroke={sage} strokeWidth="1.2" opacity=".5" strokeLinecap="round" />
      </g>

      {/* ── la flor (respira con la brisa) ── */}
      <g className="fvm-flor">
        <g className="fvm-t6">
          <path className="fvm-draw" pathLength="1" d="M216,300 C214,284 213,268 211,254" fill="none" stroke={sage} strokeWidth="1.7" strokeLinecap="round" />
          <path className="fvm-draw" pathLength="1" d="M214,282 q-8,-2 -11,-8" fill="none" stroke={sage} strokeWidth="1.4" strokeLinecap="round" />
          <path className="fvm-draw" pathLength="1" d="M211,254 q-6,-2 -7,-9" fill="none" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
          <path className="fvm-draw" pathLength="1" d="M211,254 q0,-8 0,-11" fill="none" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
          <path className="fvm-draw" pathLength="1" d="M211,254 q6,-2 7,-9" fill="none" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
        </g>
      </g>

      {/* ── el colibrí de línea (un punto dorado de garganta) ── */}
      <g className="fvm-colibri">
        <g className="fvm-t7">
          <path className="fvm-draw" pathLength="1" d="M258,240 C252,231 240,230 235,237" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
          <path className="fvm-draw" pathLength="1" d="M236,240 C242,244 250,244 255,241" fill="none" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
          <path className="fvm-draw" pathLength="1" d="M233,236 L219,243" fill="none" stroke={ink} strokeWidth="1.4" strokeLinecap="round" />
          <path className="fvm-draw" pathLength="1" d="M258,240 L268,235" fill="none" stroke={ink} strokeWidth="1.4" strokeLinecap="round" />
          <path className="fvm-draw" pathLength="1" d="M258,241 L268,243" fill="none" stroke={ink} strokeWidth="1.4" strokeLinecap="round" />
          <g className="fvm-alaline">
            <path className="fvm-draw" pathLength="1" d="M244,234 C240,222 252,218 256,226" fill="none" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
          </g>
          <circle className="fvm-fade fvm-t7" cx="236" cy="234" r="1.1" fill={ink} />
          <circle className="fvm-fade fvm-t8" cx="233" cy="239" r="1.6" fill={gold} />
        </g>
      </g>

      {/* ── leyenda ── */}
      <g className="fvm-fade fvm-t9">
        <path d="M62,443 H100" stroke={sage} strokeWidth=".8" opacity=".6" />
        <path d="M290,443 H328" stroke={sage} strokeWidth=".8" opacity=".6" />
        <text
          x="195" y="446" textAnchor="middle"
          fontFamily="Nunito, ui-sans-serif, sans-serif" fontSize="8" letterSpacing="3"
          fill="#8a9489"
        >
          SU FINCA, EN UN TRAZO
        </text>
      </g>
    </svg>
  );
}
