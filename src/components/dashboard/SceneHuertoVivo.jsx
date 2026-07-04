/**
 * SceneHuertoVivo — la escena "HUERTO EXUBERANTE" del tema VERDE VIVO.
 *
 * La huerta en su mejor mañana: eras rebosantes (tomateras en tutor, lechugas
 * que crecen a ojo, auyama con su flor), un girasol que se mece, mariposas y
 * una abeja trabajando, y el PRIMER PLANO firmado por dos hojas de bore
 * gigantes con GOTAS DE ROCÍO: perlas que brillan, una gota que se hincha,
 * cae y hace onda en la tierra. Verdes saturados, alegría vegetal.
 *
 * Mismo patrón que SceneFincaOrganismo (biopunk) pero con estética PROPIA:
 * todo animado por CSS (cero JS por frame), prefijo `fvv-`, animaciones en
 * scene-huerto-vivo.css con prefers-reduced-motion = huerto quieto digno.
 * Solo se monta con el tema verde-vivo (lo decide FincaVivaHero).
 *
 * @param {Object} props
 * @param {{tiene:boolean, forma:?string}} [props.estructura] estructura de
 *   cubierta declarada (#34): el túnel del fondo porta el marcador
 *   fvh-estructura SOLO si fue declarada (contrato de estructura.test.jsx).
 */
export default function SceneHuertoVivo({ estructura }) {
  const conEstructura = !!estructura?.tiene;
  return (
    <svg
      className="fvv-svg"
      viewBox="0 0 390 486"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Su huerto exuberante y brillante: eras con tomates, lechugas y auyama, un girasol meciéndose, mariposas y abejas, y hojas grandes con gotas de rocío que caen."
      data-testid="fvv-escena"
    >
      <defs>
        <linearGradient id="fvv-cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#83ccb8" />
          <stop offset=".28" stopColor="#b8e6c2" />
          <stop offset=".42" stopColor="#ddf3c8" />
        </linearGradient>
        <radialGradient id="fvv-sol" cx=".42" cy=".4" r=".8">
          <stop offset="0" stopColor="#fff8cf" />
          <stop offset=".62" stopColor="#ffe27a" />
          <stop offset="1" stopColor="#f2b441" />
        </radialGradient>
        <radialGradient id="fvv-gota-g" cx=".35" cy=".28" r=".9">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".45" stopColor="#dff8ff" />
          <stop offset="1" stopColor="#8fd2ec" />
        </radialGradient>
        <linearGradient id="fvv-tierra" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a5c34" />
          <stop offset="1" stopColor="#5e3e22" />
        </linearGradient>
        <filter id="fvv-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>

      {/* ============ CIELO FRESCO ============ */}
      <rect width="390" height="486" fill="url(#fvv-cielo)" />

      {/* sol alegre con rayos que giran despacio */}
      <g>
        <circle className="fvv-halo" cx="318" cy="62" r="40" fill="#ffe27a" opacity=".32" filter="url(#fvv-soft)" />
        <g className="fvv-rayos" stroke="#ffe27a" strokeWidth="2.6" strokeLinecap="round" opacity=".8">
          <line x1="318" y1="30" x2="318" y2="22" /><line x1="318" y1="94" x2="318" y2="102" />
          <line x1="286" y1="62" x2="278" y2="62" /><line x1="350" y1="62" x2="358" y2="62" />
          <line x1="295" y1="39" x2="289" y2="33" /><line x1="341" y1="85" x2="347" y2="91" />
          <line x1="341" y1="39" x2="347" y2="33" /><line x1="295" y1="85" x2="289" y2="91" />
        </g>
        <circle cx="318" cy="62" r="20" fill="url(#fvv-sol)" />
      </g>

      {/* destellos de mañana */}
      <g fill="#fffbe8">
        <path className="fvv-brillo" d="M140,118 l1.4,3.8 3.8,1.4 -3.8,1.4 -1.4,3.8 -1.4,-3.8 -3.8,-1.4 3.8,-1.4 Z" />
        <path className="fvv-brillo fvv-b2" d="M250,88 l1.2,3.2 3.2,1.2 -3.2,1.2 -1.2,3.2 -1.2,-3.2 -3.2,-1.2 3.2,-1.2 Z" />
        <path className="fvv-brillo fvv-b3" d="M84,146 l1,2.8 2.8,1 -2.8,1 -1,2.8 -1,-2.8 -2.8,-1 2.8,-1 Z" />
        <path className="fvv-brillo fvv-b2" d="M354,132 l1,2.8 2.8,1 -2.8,1 -1,2.8 -1,-2.8 -2.8,-1 2.8,-1 Z" />
      </g>

      {/* ============ LOMAS VIVAS ============ */}
      <path d="M0,166 Q140,132 260,158 T390,148 V220 H0 Z" fill="#7cc25c" opacity=".85" />
      <path d="M0,182 Q90,150 200,172 T390,162 V250 H0 Z" fill="#58b04a" />
      {/* frutalitos de la loma */}
      <g>
        <g transform="translate(150,168)">
          <rect x="-1.5" y="0" width="3" height="8" fill="#6e4a2a" />
          <circle cx="0" cy="-4" r="7" fill="#3f8f3a" /><circle cx="-2" cy="-6" r="3" fill="#5cc24a" />
          <circle cx="3" cy="-3" r="1.6" fill="#ff5d44" /><circle cx="-4" cy="-1" r="1.4" fill="#ff5d44" />
        </g>
        <g transform="translate(228,172)">
          <rect x="-1.5" y="0" width="3" height="7" fill="#6e4a2a" />
          <circle cx="0" cy="-4" r="6" fill="#3f8f3a" /><circle cx="2" cy="-6" r="2.6" fill="#5cc24a" />
          <circle cx="-3" cy="-3" r="1.4" fill="#ffd24d" />
        </g>
      </g>

      {/* invernadero de túnel al fondo (estructura declarada #34) */}
      <g
        transform="translate(64,176)"
        {...(conEstructura
          ? { 'data-testid': 'fvh-estructura', 'data-forma': estructura.forma || 'generica' }
          : {})}
      >
        <ellipse cx="0" cy="12" rx="30" ry="5" fill="#1f3a16" opacity=".18" />
        <path d="M-28,11 Q-28,-14 0,-15 Q28,-14 28,11 Z" fill="#eafbf3" opacity=".85" stroke="#9fd8c0" strokeWidth="1.5" />
        <g fill="#5cc24a" opacity=".55">
          <circle cx="-13" cy="4" r="4" /><circle cx="0" cy="5" r="3.6" /><circle cx="13" cy="4" r="4" />
        </g>
        <g stroke="#d2f0e2" strokeWidth="1.2" opacity=".9">
          <line x1="-15" y1="11" x2="-15" y2="-12" />
          <line x1="0" y1="11" x2="0" y2="-15" />
          <line x1="15" y1="11" x2="15" y2="-12" />
        </g>
        <path d="M-24,-6 Q0,-18 22,-9" stroke="#ffffff" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity=".85" />
      </g>

      {/* ============ ERAS DE LA HUERTA ============ */}
      {/* era 1: tomateras en tutor */}
      <polygon points="20,208 370,208 378,246 12,246" fill="url(#fvv-tierra)" />
      <path d="M20,208 L370,208" stroke="#a8794a" strokeWidth="2" opacity=".7" />
      <g>
        {[
          { x: 62, d: '' },
          { x: 132, d: 'fvv-p2' },
          { x: 202, d: 'fvv-p3' },
          { x: 272, d: 'fvv-p2' },
          { x: 336, d: 'fvv-p3' },
        ].map((t) => (
          <g key={t.x} transform={`translate(${t.x},242)`}>
            <line x1="0" y1="0" x2="0" y2="-38" stroke="#8a6038" strokeWidth="2.2" strokeLinecap="round" />
            <g className={`fvv-planta ${t.d}`}>
              <path d="M0,-4 C-8,-10 -7,-20 -2,-26 C-9,-28 -8,-36 -1,-38" stroke="#2e8b3e" strokeWidth="2.2" fill="none" strokeLinecap="round" />
              <path d="M0,-8 q-7,-2 -10,-7" stroke="#3f9c46" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              <path d="M-2,-22 q7,-2 10,-7" stroke="#3f9c46" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              <circle cx="-6" cy="-14" r="4" fill="#ff5d44" /><circle cx="-7.4" cy="-15.4" r="1.1" fill="#fff" opacity=".85" />
              <circle cx="4" cy="-28" r="3.4" fill="#ff5d44" /><circle cx="2.8" cy="-29.2" r="1" fill="#fff" opacity=".85" />
              <circle cx="3" cy="-10" r="3" fill="#ffd24d" /><circle cx="2" cy="-11" r=".9" fill="#fff" opacity=".9" />
            </g>
          </g>
        ))}
      </g>

      {/* camino entre eras */}
      <polygon points="12,246 378,246 380,260 10,260" fill="#c9a36a" />
      <g fill="#a8794a" opacity=".7">
        <ellipse cx="80" cy="253" rx="4" ry="1.6" /><ellipse cx="190" cy="255" rx="5" ry="1.8" />
        <ellipse cx="300" cy="253" rx="4" ry="1.6" />
      </g>

      {/* era 2: lechugas + acelga (crecen a ojo) */}
      <polygon points="8,260 382,260 388,314 2,314" fill="url(#fvv-tierra)" />
      <path d="M8,260 L382,260" stroke="#a8794a" strokeWidth="2" opacity=".7" />
      <g>
        {/* OJO: la clase animada va en un <g> INTERNO sin atributo transform —
            una animación CSS de transform PISA el atributo transform del mismo
            elemento y las matas saltarían al origen del SVG. */}
        {[
          { x: 50, d: '' },
          { x: 122, d: 'fvv-p2' },
          { x: 268, d: 'fvv-p3' },
          { x: 340, d: 'fvv-p2' },
        ].map((l) => (
          <g key={l.x} transform={`translate(${l.x},296)`}>
            <g className={`fvv-crece ${l.d}`}>
              <circle cx="0" cy="0" r="12" fill="#4ca35c" />
              <path d="M-11,-3 q-4,-6 2,-9 M11,-3 q4,-6 -2,-9 M-6,-10 q0,-6 6,-6 q6,0 6,6" stroke="#4ca35c" strokeWidth="3.4" fill="none" strokeLinecap="round" />
              <circle cx="0" cy="-1" r="8.6" fill="#7ed957" />
              <circle cx="0" cy="-2" r="5.6" fill="#a7e17a" />
              <circle cx="0" cy="-3" r="3" fill="#d4f79a" />
            </g>
          </g>
        ))}
        {/* acelga de penca roja (el toque saturado) */}
        <g transform="translate(195,300)">
          <g className="fvv-planta fvv-p2">
          <g stroke="#e0532f" strokeWidth="2.6" strokeLinecap="round" fill="none">
            <path d="M0,0 L0,-14" /><path d="M-6,0 L-9,-12" /><path d="M6,0 L9,-12" />
          </g>
          <path d="M0,-14 C-8,-22 -4,-32 1,-33 C8,-30 9,-20 0,-14 Z" fill="#2e8b3e" />
          <path d="M-9,-12 C-16,-18 -14,-27 -9,-29 C-3,-26 -3,-17 -9,-12 Z" fill="#3f9c46" />
          <path d="M9,-12 C16,-18 14,-27 9,-29 C3,-26 3,-17 9,-12 Z" fill="#3f9c46" />
          <path d="M0,-15 L1,-30" stroke="#e0532f" strokeWidth="1.2" opacity=".8" />
          </g>
        </g>
      </g>

      {/* camino 2 */}
      <polygon points="2,314 388,314 390,328 0,328" fill="#c9a36a" />

      {/* era 3 (frente): auyama + zanahorias */}
      <polygon points="0,328 390,328 390,486 0,486" fill="#6e462a" />
      <path d="M0,328 L390,328" stroke="#a8794a" strokeWidth="2" opacity=".7" />
      {/* guía de auyama */}
      <g>
        <path d="M36,364 C90,352 150,376 210,368 C232,365 246,372 252,378" stroke="#3f8f4e" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M92,362 q-2,-10 6,-14 q10,-4 14,4 q4,10 -6,13 q-10,2 -14,-3 Z" fill="#2e8b3e" />
        <path d="M156,376 q-2,-9 5,-13 q9,-4 13,3 q4,9 -5,12 q-9,2 -13,-2 Z" fill="#3f9c46" />
        {/* auyama gorda con costillas */}
        <g className="fvv-auyama">
          <ellipse cx="188" cy="394" rx="27" ry="20" fill="#ff9d3c" />
          <path d="M172,380 q-6,14 0,28 M188,375 q-3,19 0,38 M204,380 q6,14 0,28" stroke="#e07f24" strokeWidth="2" fill="none" opacity=".8" />
          <path d="M188,374 q0,-6 5,-8" stroke="#3f8f4e" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <ellipse cx="178" cy="386" rx="6" ry="4" fill="#ffc27a" opacity=".65" />
        </g>
        {/* flor de auyama (trompeta) */}
        <g className="fvv-flor">
          <path d="M252,378 q2,-8 8,-10" stroke="#3f8f4e" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M260,368 l-5,-9 6,3 2,-8 3,8 6,-3 -5,9 Z" fill="#ffd24d" />
          <circle cx="263" cy="366" r="2.4" fill="#f2b441" />
        </g>
      </g>
      {/* zanahorias (penachos) — en el claro derecho, a la vista */}
      <g stroke="#5cc24a" strokeWidth="1.8" fill="none" strokeLinecap="round">
        <g className="fvv-planta"><path d="M246,398 q-4,-10 -8,-13 M246,398 q0,-12 0,-16 M246,398 q4,-10 8,-13" /></g>
        <g className="fvv-planta fvv-p2"><path d="M276,410 q-4,-9 -7,-12 M276,410 q0,-11 0,-15 M276,410 q4,-9 7,-12" /></g>
        <g className="fvv-planta fvv-p3"><path d="M258,426 q-4,-9 -7,-12 M258,426 q0,-11 0,-15 M258,426 q4,-9 7,-12" /></g>
      </g>
      {/* fresas del claro izquierdo (fruta roja que alegra la tierra) */}
      <g>
        <g className="fvv-planta fvv-p3" transform="translate(0,0)">
          <path d="M122,410 q-6,-3 -8,-9 M122,410 q0,-8 2,-11 M122,410 q6,-3 8,-8" stroke="#3f9c46" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M122,410 q-2,7 2,9" stroke="#3f9c46" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M124,421 q-4,2 -3,6 q3,4 6,0 q1,-5 -3,-6 Z" fill="#ff5d44" />
          <circle cx="125" cy="424.5" r=".7" fill="#ffd24d" /><circle cx="127.5" cy="423" r=".7" fill="#ffd24d" />
        </g>
        <g className="fvv-planta" transform="translate(0,0)">
          <path d="M148,434 q-6,-3 -8,-9 M148,434 q0,-8 2,-11 M148,434 q6,-3 8,-8" stroke="#3f9c46" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M150,444 q-4,2 -3,6 q3,4 6,0 q1,-5 -3,-6 Z" fill="#ff5d44" />
        </g>
      </g>

      {/* ============ GIRASOL que se mece ============ */}
      <g className="fvv-girasol">
        <path d="M322,382 C320,330 318,280 316,224" stroke="#3f8f4e" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M320,330 q-14,-4 -18,-14" stroke="#3f8f4e" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <path d="M318,296 q14,-4 18,-14" stroke="#3f8f4e" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <g transform="translate(316,204)">
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a) => (
            <ellipse key={a} cx="0" cy="-19" rx="6" ry="12" fill="#ffd24d" transform={`rotate(${a})`} />
          ))}
          <circle cx="0" cy="0" r="13" fill="#8a5a2a" />
          <g fill="#6e451f">
            <circle cx="-4" cy="-3" r="1.4" /><circle cx="4" cy="-3" r="1.4" /><circle cx="0" cy="3" r="1.4" />
            <circle cx="-6" cy="4" r="1.2" /><circle cx="6" cy="4" r="1.2" /><circle cx="0" cy="-7" r="1.2" />
          </g>
        </g>
      </g>

      {/* abeja trabajando cerca del girasol */}
      <g className="fvv-abeja">
        <ellipse cx="0" cy="0" rx="4.6" ry="3.2" fill="#ffd24d" />
        <path d="M-2,-3 V3 M1,-3.2 V3.2" stroke="#3a2a10" strokeWidth="1.4" />
        <circle cx="4.6" cy="-.6" r="1.8" fill="#3a2a10" />
        <ellipse className="fvv-ala-abeja" cx="-1" cy="-4" rx="3.4" ry="2" fill="#ffffff" opacity=".8" />
      </g>

      {/* mariposas del huerto */}
      <g className="fvv-mariposa">
        <g className="fvv-aleteo">
          <path d="M0,0 q-8,-9 -12,-2 q-2,6 7,6 Z" fill="#ff9ec4" />
          <path d="M0,0 q8,-9 12,-2 q2,6 -7,6 Z" fill="#ffffff" />
          <path d="M0,-2 V6" stroke="#5a4329" strokeWidth="1.3" strokeLinecap="round" />
        </g>
      </g>
      <g className="fvv-mariposa fvv-mp2">
        <g className="fvv-aleteo" style={{ animationDelay: '-.25s' }}>
          <path d="M0,0 q-6,-7 -9,-1.5 q-1.5,4.5 5,5 Z" fill="#f2b441" />
          <path d="M0,0 q6,-7 9,-1.5 q1.5,4.5 -5,5 Z" fill="#ffd24d" />
          <path d="M0,-1.5 V5" stroke="#5a4329" strokeWidth="1.1" strokeLinecap="round" />
        </g>
      </g>

      {/* ============ PRIMER PLANO: HOJAS DE BORE CON ROCÍO ============ */}
      {/* hoja izquierda */}
      <g className="fvv-hoja">
        <path d="M-10,486 C-6,400 40,356 98,352 C74,392 88,438 134,462 C96,486 40,492 -10,486 Z" fill="#2e8b3e" />
        <g stroke="#a7e17a" strokeWidth="1.6" fill="none" opacity=".8" strokeLinecap="round">
          <path d="M6,470 C24,432 52,396 92,360" />
          <path d="M6,470 C36,452 66,436 106,428" />
          <path d="M6,470 C18,448 26,420 36,392" />
        </g>
        <path d="M98,352 C74,392 88,438 134,462" stroke="#1f6b2e" strokeWidth="2" fill="none" opacity=".6" />
        {/* perlas de rocío */}
        <circle className="fvv-perla" cx="52" cy="430" r="3" fill="url(#fvv-gota-g)" />
        <circle className="fvv-perla fvv-pe2" cx="84" cy="404" r="2.4" fill="url(#fvv-gota-g)" />
        {/* caracol curioso */}
        <g transform="translate(58,456)">
          <path d="M-6,0 q6,-7 14,-2" stroke="#e8c88a" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          <circle cx="2" cy="-3" r="5" fill="#d8a05c" />
          <path d="M2,-3 m3,0 a3,3 0 1 1 -6,0 a2,2 0 1 1 4,0" stroke="#a8763e" strokeWidth="1.1" fill="none" />
          <path d="M8,-4 l2,-4 M9.4,-3 l3.4,-2.6" stroke="#e8c88a" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      </g>

      {/* hoja derecha (la de la gota firmada) */}
      <g className="fvv-hoja fvv-h2">
        <path d="M400,486 C396,392 340,352 280,350 C306,392 292,440 248,466 C290,490 350,494 400,486 Z" fill="#3f9c46" />
        <g stroke="#b4e88a" strokeWidth="1.6" fill="none" opacity=".8" strokeLinecap="round">
          <path d="M382,472 C362,432 334,396 288,358" />
          <path d="M382,472 C352,454 322,438 282,430" />
          <path d="M382,472 C372,450 364,422 354,394" />
        </g>
        <path d="M280,350 C306,392 292,440 248,466" stroke="#2a7a34" strokeWidth="2" fill="none" opacity=".6" />
        {/* LA GOTA: se hincha en el borde de la hoja */}
        <g className="fvv-gota">
          <ellipse cx="300" cy="408" rx="7" ry="8.6" fill="url(#fvv-gota-g)" />
          <ellipse cx="297.4" cy="404.6" rx="2.2" ry="3" fill="#ffffff" opacity=".95" />
        </g>
        <circle className="fvv-perla fvv-pe3" cx="336" cy="382" r="2.6" fill="url(#fvv-gota-g)" />
        <circle className="fvv-perla" cx="272" cy="440" r="2.2" fill="url(#fvv-gota-g)" />
      </g>

      {/* gota que cae + onda en la tierra (fuera del grupo para no heredar el vaivén) */}
      <circle className="fvv-goteo" cx="300" cy="420" r="3" fill="#bfeaf8" />
      <ellipse className="fvv-onda" cx="300" cy="474" rx="6" ry="2" fill="none" stroke="#bfeaf8" strokeWidth="1.4" />

      {/* etiqueta viva */}
      <g fontFamily="ui-monospace,monospace" fontSize="7.5" letterSpacing="2" opacity=".6">
        <text x="192" y="478" fill="#d4f79a" textAnchor="middle">HUERTO VIVO · CADA GOTA CUENTA</text>
      </g>
    </svg>
  );
}
