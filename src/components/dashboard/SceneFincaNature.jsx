/**
 * SceneFincaNature — la escena "EL ÁRBOL DE LA VIDA" del tema NATURE.
 *
 * La finca campesina en una MAÑANA DORADA de tierra caliente: un gran árbol
 * de la vida preside la finca — su copa se mece con el viento y sus RAÍCES
 * cruzan el corte de suelo criando la tierra (el eco cálido y orgánico del
 * corazón-semilla biopunk, pero de día y en clave tierra). Alrededor: sol que
 * respira, bandada que cruza el cielo, casita de tapia con humo, cafetal con
 * cerezas, milpa, turpial en la rama, colibrí libando una flor colgante,
 * mariposas amarillas y polen dorado flotando en el rayo de luz.
 *
 * Mismo patrón que SceneFincaOrganismo (biopunk) pero con estética PROPIA:
 * todo animado por CSS (cero JS por frame), prefijo `fvn-`, animaciones en
 * scene-finca-nature.css con prefers-reduced-motion = mañana quieta digna.
 * Solo se monta con el tema nature (lo decide FincaVivaHero).
 *
 * @param {Object} props
 * @param {{tiene:boolean, forma:?string}} [props.estructura] estructura de
 *   cubierta declarada en el perfil (#34): el invernadero de túnel de la
 *   escena porta el marcador fvh-estructura SOLO si fue declarada (mismo
 *   contrato de FincaVivaHero.estructura.test.jsx que SceneFincaOrganismo).
 */
export default function SceneFincaNature({ estructura }) {
  const conEstructura = !!estructura?.tiene;
  return (
    <svg
      className="fvn-svg"
      viewBox="0 0 390 486"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Su finca en una mañana dorada bajo el árbol de la vida: sol cálido, aves cruzando, cafetal con cerezas, milpa, casita con humo y un colibrí libando; bajo la tierra, las raíces del árbol crían el suelo vivo."
      data-testid="fvn-escena"
    >
      <defs>
        <linearGradient id="fvn-cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#efd8a4" />
          <stop offset=".45" stopColor="#f8ecc8" />
          <stop offset=".8" stopColor="#fdf6e4" />
        </linearGradient>
        <radialGradient id="fvn-sol" cx=".42" cy=".4" r=".8">
          <stop offset="0" stopColor="#fff6d8" />
          <stop offset=".6" stopColor="#ffdf94" />
          <stop offset="1" stopColor="#f2a94e" />
        </radialGradient>
        <linearGradient id="fvn-rayo" x1="0" y1="0" x2=".6" y2="1">
          <stop offset="0" stopColor="#ffe8ae" stopOpacity=".55" />
          <stop offset="1" stopColor="#ffe8ae" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="fvn-campo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#93b05c" />
          <stop offset="1" stopColor="#6e8c44" />
        </linearGradient>
        <linearGradient id="fvn-suelo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a5230" />
          <stop offset="1" stopColor="#2c1b0d" />
        </linearGradient>
        <filter id="fvn-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      {/* ============ CIELO DE MAÑANA ============ */}
      <rect width="390" height="486" fill="url(#fvn-cielo)" />

      {/* sol que respira (doble halo) */}
      <g>
        <circle className="fvn-halo" cx="82" cy="86" r="52" fill="#ffdf94" opacity=".28" filter="url(#fvn-soft)" />
        <circle className="fvn-halo fvn-h2" cx="82" cy="86" r="34" fill="#ffe8ae" opacity=".42" />
        <circle cx="82" cy="86" r="22" fill="url(#fvn-sol)" />
      </g>

      {/* rayo de luz hacia el árbol (baña la escena) */}
      <path className="fvn-rayo" d="M82,86 L262,300 L118,336 Z" fill="url(#fvn-rayo)" opacity=".5" />

      {/* nubes cremosas a la deriva */}
      <g className="fvn-nube" fill="#fff8e8" opacity=".85">
        <ellipse cx="222" cy="56" rx="26" ry="11" />
        <ellipse cx="246" cy="51" rx="17" ry="10" />
        <ellipse cx="203" cy="51" rx="13" ry="8" />
      </g>
      <g className="fvn-nube fvn-n2" fill="#fff8e8" opacity=".6">
        <ellipse cx="316" cy="112" rx="19" ry="8" />
        <ellipse cx="332" cy="108" rx="12" ry="7" />
      </g>

      {/* bandada que cruza el cielo */}
      <g className="fvn-bandada" stroke="#7a5c38" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".7">
        <path d="M412,64 q5,-6 10,0 q5,-6 10,0" />
        <path d="M444,78 q4,-5 8,0 q4,-5 8,0" />
        <path d="M424,94 q4,-5 8,0 q4,-5 8,0" />
        <path d="M456,58 q3,-4 6,0 q3,-4 6,0" />
      </g>

      {/* ============ CORDILLERA Y LOMAS ============ */}
      <path d="M0,232 Q70,196 140,218 T280,208 T390,214 V300 H0 Z" fill="#cbb083" opacity=".6" />
      <path d="M0,252 Q90,222 190,240 T390,236 V310 H0 Z" fill="#b09c66" opacity=".55" />
      <ellipse className="fvn-bruma" cx="180" cy="252" rx="210" ry="14" fill="#fff" opacity=".3" filter="url(#fvn-soft)" />

      <path d="M0,282 Q100,248 210,272 T390,264 V340 H0 Z" fill="#9db06a" />
      <path d="M0,304 Q120,272 260,296 T390,290 V352 H0 Z" fill="#7d9a52" />
      {/* arbolitos-silueta en la loma */}
      <g fill="#5c7a40" opacity=".85">
        <path d="M58,284 q4,-12 8,0 l-2,0 v5 h-4 v-5 Z" />
        <path d="M330,280 q4,-11 8,0 l-2,0 v5 h-4 v-5 Z" />
        <path d="M144,268 q3,-9 6,0 l-1.5,0 v4 h-3 v-4 Z" />
      </g>

      {/* ============ CAMPO ============ */}
      <path d="M0,328 Q130,300 240,318 T390,310 V400 H0 Z" fill="url(#fvn-campo)" />
      <g stroke="#5d7a3a" strokeWidth="1.4" fill="none" opacity=".5" strokeLinecap="round">
        <path d="M40,350 Q195,330 350,342" />
        <path d="M30,362 Q195,340 360,352" />
        <path d="M22,374 Q195,352 368,362" />
      </g>

      {/* casita de tapia con humo */}
      <g transform="translate(46,316)">
        <path className="fvn-humo" d="M18,-24 q-4,-6 1,-10 q5,-4 1,-9" stroke="#efe3cd" strokeWidth="2.6" fill="none" strokeLinecap="round" opacity=".8" />
        <path className="fvn-humo fvn-hu2" d="M20,-26 q-3,-5 2,-8" stroke="#efe3cd" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".6" />
        <rect x="14" y="-26" width="6" height="9" fill="#8a5a38" />
        <polygon points="-2,-16 16,-30 34,-16" fill="#c2562f" />
        <polygon points="1,-16 31,-16 31,6 1,6" fill="#f8f1de" />
        <rect x="12" y="-6" width="8" height="12" fill="#7a5230" />
        <rect x="4" y="-11" width="6" height="6" fill="#9fc9d8" />
        <rect x="23" y="-11" width="6" height="6" fill="#9fc9d8" />
      </g>

      {/* milpa (maíz + auyama) al frente izquierdo */}
      <g strokeLinecap="round">
        <g className="fvn-mata">
          <path d="M84,352 V330" stroke="#4c7a34" strokeWidth="2.6" fill="none" />
          <path d="M84,340 q-8,-3 -11,-9" stroke="#5d8f3e" strokeWidth="2.2" fill="none" />
          <path d="M84,336 q8,-3 11,-8" stroke="#5d8f3e" strokeWidth="2.2" fill="none" />
          <circle cx="84" cy="328" r="2.6" fill="#e8b23f" />
        </g>
        <g className="fvn-mata fvn-m2">
          <path d="M112,360 V336" stroke="#4c7a34" strokeWidth="2.8" fill="none" />
          <path d="M112,348 q-9,-3 -12,-10" stroke="#5d8f3e" strokeWidth="2.2" fill="none" />
          <path d="M112,343 q9,-3 12,-9" stroke="#5d8f3e" strokeWidth="2.2" fill="none" />
          <circle cx="112" cy="334" r="2.8" fill="#e8b23f" />
        </g>
        <g className="fvn-mata fvn-m3">
          <path d="M60,362 V342" stroke="#4c7a34" strokeWidth="2.4" fill="none" />
          <path d="M60,352 q-7,-3 -10,-8" stroke="#5d8f3e" strokeWidth="2" fill="none" />
          <circle cx="60" cy="340" r="2.4" fill="#e8b23f" />
        </g>
        <g>
          <path d="M128,372 q8,-6 18,-2" stroke="#4c7a34" strokeWidth="2" fill="none" />
          <ellipse cx="146" cy="372" rx="9" ry="6.5" fill="#e0913c" />
          <path d="M146,366 q0,-4 3,-5" stroke="#4c7a34" strokeWidth="1.6" fill="none" />
        </g>
      </g>

      {/* cafetal con cerezas */}
      <g>
        <g transform="translate(262,344)">
          <path d="M0,12 V2" stroke="#4a3a22" strokeWidth="2" strokeLinecap="round" />
          <circle cx="0" cy="-2" r="9" fill="#3f6b34" /><circle cx="-6" cy="3" r="6" fill="#3f6b34" />
          <circle cx="6" cy="3" r="6" fill="#3f6b34" /><circle cx="-2" cy="-4" r="4" fill="#74a656" />
          <circle className="fvn-cereza" cx="-5" cy="-2" r="1.8" fill="#d94f30" />
          <circle className="fvn-cereza fvn-c2" cx="4" cy="1" r="1.8" fill="#d94f30" />
          <circle className="fvn-cereza fvn-c3" cx="0" cy="4" r="1.6" fill="#e8963f" />
        </g>
        <g transform="translate(294,354)">
          <path d="M0,11 V2" stroke="#4a3a22" strokeWidth="2" strokeLinecap="round" />
          <circle cx="0" cy="-2" r="8" fill="#3f6b34" /><circle cx="-5" cy="3" r="5.5" fill="#3f6b34" />
          <circle cx="5" cy="3" r="5.5" fill="#3f6b34" /><circle cx="2" cy="-4" r="3.5" fill="#74a656" />
          <circle className="fvn-cereza fvn-c2" cx="-4" cy="0" r="1.7" fill="#d94f30" />
          <circle className="fvn-cereza" cx="4" cy="-1" r="1.6" fill="#d94f30" />
        </g>
      </g>

      {/* invernadero de túnel (estructura declarada #34: marcador condicional) */}
      <g
        transform="translate(336,338)"
        {...(conEstructura
          ? { 'data-testid': 'fvh-estructura', 'data-forma': estructura.forma || 'generica' }
          : {})}
      >
        <ellipse cx="0" cy="11" rx="28" ry="5" fill="#2c1b0d" opacity=".14" />
        <path d="M-26,10 Q-26,-13 0,-14 Q26,-13 26,10 Z" fill="#f2ecd4" opacity=".82" stroke="#cbb98e" strokeWidth="1.4" />
        <g fill="#5d8f3e" opacity=".5">
          <circle cx="-12" cy="4" r="3.6" /><circle cx="0" cy="5" r="3.2" /><circle cx="12" cy="4" r="3.6" />
        </g>
        <g stroke="#e4d9b8" strokeWidth="1.2" opacity=".85">
          <line x1="-14" y1="10" x2="-14" y2="-11" />
          <line x1="0" y1="10" x2="0" y2="-14" />
          <line x1="14" y1="10" x2="14" y2="-11" />
        </g>
        <path d="M-22,-6 Q0,-16 20,-9" stroke="#fbf7ea" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity=".8" />
      </g>

      {/* flores silvestres del potrero */}
      <g>
        <g fill="#e8b23f"><circle cx="228" cy="352" r="2" /><circle cx="234" cy="355" r="1.6" /></g>
        <g fill="#d94f30"><circle cx="180" cy="366" r="1.8" /><circle cx="186" cy="369" r="1.4" /></g>
        <g fill="#f6e9c8"><circle cx="318" cy="370" r="1.7" /><circle cx="312" cy="373" r="1.3" /></g>
      </g>

      {/* ============ EL ÁRBOL DE LA VIDA ============ */}
      {/* sombra fresca al pie */}
      <ellipse cx="195" cy="388" rx="86" ry="12" fill="#3e5526" opacity=".28" filter="url(#fvn-soft)" />
      {/* tronco + ramas + raíces de superficie */}
      <g fill="none" strokeLinecap="round">
        <path d="M186,392 Q190,320 191,268 L201,268 Q202,320 208,392 Q197,386 186,392 Z" fill="#6b4726" stroke="none" />
        <path d="M199,268 Q201,320 205,388" stroke="#543619" strokeWidth="3" opacity=".6" />
        <path d="M193,300 Q170,282 150,274" stroke="#6b4726" strokeWidth="7" />
        <path d="M198,292 Q225,272 244,264" stroke="#6b4726" strokeWidth="6" />
        <path d="M195,282 Q195,262 195,248" stroke="#6b4726" strokeWidth="6" />
        <path d="M187,390 Q176,397 162,400" stroke="#5d3c1f" strokeWidth="6" />
        <path d="M206,390 Q218,397 232,400" stroke="#5d3c1f" strokeWidth="6" />
      </g>

      {/* copa que mece el viento */}
      <g className="fvn-copa">
        <circle cx="195" cy="200" r="60" fill="#456f36" />
        <circle cx="146" cy="222" r="40" fill="#456f36" />
        <circle cx="246" cy="220" r="42" fill="#456f36" />
        <circle cx="168" cy="192" r="44" fill="#5c8a44" />
        <circle cx="228" cy="196" r="44" fill="#5c8a44" />
        <circle cx="195" cy="232" r="48" fill="#5c8a44" />
        <circle cx="182" cy="172" r="34" fill="#74a656" />
        <circle cx="232" cy="180" r="28" fill="#74a656" />
        <circle cx="150" cy="206" r="24" fill="#74a656" />
        <circle cx="170" cy="160" r="14" fill="#8fc06a" />
        <circle cx="216" cy="166" r="12" fill="#8fc06a" />
        <circle cx="250" cy="204" r="12" fill="#8fc06a" />
        <circle cx="128" cy="218" r="10" fill="#8fc06a" />
        {/* frutos y flores de la copa */}
        <circle className="fvn-fruto" cx="160" cy="238" r="4" fill="#e8963f" />
        <circle className="fvn-fruto fvn-f2" cx="236" cy="232" r="4" fill="#e8963f" />
        <circle className="fvn-fruto fvn-f3" cx="200" cy="252" r="3.6" fill="#e8963f" />
        <circle cx="140" cy="206" r="3" fill="#d94f30" />
        <circle cx="258" cy="196" r="3" fill="#d94f30" />
        <circle cx="190" cy="160" r="3" fill="#d94f30" />
        <circle cx="218" cy="214" r="2.5" fill="#fdf3d8" />
        <circle cx="164" cy="182" r="2.5" fill="#fdf3d8" />
        {/* flor colgante para el colibrí */}
        <path d="M134,228 Q124,238 121,248" stroke="#4c7a34" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M121,248 l-4,7 h8 Z" fill="#d94f30" />
      </g>

      {/* hojas que caen (el árbol vive) */}
      <path className="fvn-hoja-cae" d="M258,242 q6,-4 10,0 q-4,6 -10,0 Z" fill="#8fc06a" opacity=".9" />
      <path className="fvn-hoja-cae fvn-hc2" d="M148,252 q5,-4 9,0 q-4,5 -9,0 Z" fill="#74a656" opacity=".85" />

      {/* turpial en la rama. OJO: la clase animada va en un <g> INTERNO sin
          atributo transform — una animación CSS de transform PISA el atributo
          transform del mismo elemento y el dibujo saltaría al origen. */}
      <g transform="translate(248,258)">
        <g className="fvn-pajaro">
        <path d="M-6,4 L6,4" stroke="#4a3a22" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M4,-9 l6,-3 -4,5 Z" fill="#2f2820" />
        <ellipse cx="0" cy="-4" rx="5.4" ry="3.8" fill="#e8963f" />
        <circle cx="4" cy="-8" r="2.8" fill="#2f2820" />
        <circle cx="4.8" cy="-8.5" r=".7" fill="#fdf3d8" />
        <path d="M6.8,-8 l3.4,.8 -3.4,1 Z" fill="#4a3a22" />
        <line x1="-1" y1="-1" x2="-1" y2="3.6" stroke="#4a3a22" strokeWidth="1" />
        <line x1="2" y1="-1" x2="2" y2="3.6" stroke="#4a3a22" strokeWidth="1" />
        </g>
      </g>

      {/* colibrí libando la flor colgante (misma regla: transform afuera,
          animación adentro) */}
      <g transform="translate(94,244)">
        <g className="fvn-colibri">
        <path d="M-8,0 L-15,-3 L-11,0 L-15,3 Z" fill="#2e9c6a" opacity=".9" />
        <g className="fvn-ala">
          <path d="M0,-1 C-6,-11 4,-15 9,-9 C7,-4 3,-1 0,-1 Z" fill="#57b98a" opacity=".8" />
        </g>
        <ellipse cx="1" cy="1" rx="8" ry="4.6" fill="#2e9c6a" transform="rotate(-14 1 1)" />
        <ellipse cx="0" cy="3" rx="5" ry="2" fill="#fdf3d8" opacity=".55" transform="rotate(-14 0 3)" />
        <circle cx="9" cy="-1.6" r="3.6" fill="#237a54" />
        <ellipse cx="9.6" cy="1" rx="2.2" ry="1.4" fill="#e8963f" />
        <circle cx="10" cy="-2.4" r=".8" fill="#26201b" />
        <path d="M12.4,-1 Q19,0 23,3" fill="none" stroke="#26201b" strokeWidth="1.2" strokeLinecap="round" />
        <g className="fvn-ala fvn-a2">
          <path d="M1,2 C-3,9 6,12 9,6 C7,3 4,2 1,2 Z" fill="#57b98a" opacity=".55" />
        </g>
        </g>
      </g>

      {/* mariposas amarillas (vuelan alrededor del árbol) */}
      <g className="fvn-mariposa">
        <g className="fvn-aleteo">
          <path d="M0,0 q-7,-8 -11,-2 q-2,5 6,6 Z" fill="#f2c94c" />
          <path d="M0,0 q7,-8 11,-2 q2,5 -6,6 Z" fill="#e8b23f" />
          <path d="M0,-2 V6" stroke="#5a4329" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      </g>
      <g className="fvn-mariposa fvn-mp2">
        <g className="fvn-aleteo" style={{ animationDelay: '-.2s' }}>
          <path d="M0,0 q-5,-6 -8,-1.5 q-1.5,4 4.5,4.5 Z" fill="#f6e9c8" />
          <path d="M0,0 q5,-6 8,-1.5 q1.5,4 -4.5,4.5 Z" fill="#f2c94c" />
          <path d="M0,-1.5 V4.5" stroke="#5a4329" strokeWidth="1" strokeLinecap="round" />
        </g>
      </g>

      {/* polen dorado flotando en el rayo de luz */}
      <g fill="#ffd98a">
        <circle className="fvn-mota" cx="128" cy="300" r="1.6" />
        <circle className="fvn-mota fvn-mo2" cx="160" cy="264" r="1.3" />
        <circle className="fvn-mota fvn-mo3" cx="196" cy="308" r="1.5" />
        <circle className="fvn-mota fvn-mo4" cx="226" cy="282" r="1.2" />
        <circle className="fvn-mota fvn-mo2" cx="146" cy="330" r="1.2" />
        <circle className="fvn-mota fvn-mo3" cx="110" cy="272" r="1.1" />
      </g>

      {/* ============ CORTE DE SUELO: LAS RAÍCES CRÍAN LA TIERRA ============ */}
      <rect y="388" width="390" height="98" fill="url(#fvn-suelo)" />
      <path d="M0,388 L390,388" stroke="#d8b277" strokeWidth="1.4" opacity=".5" />
      <path d="M0,390.5 L390,390.5" stroke="#8a5a32" strokeWidth=".8" opacity=".5" />

      {/* piedras y mica */}
      <ellipse cx="330" cy="456" rx="10" ry="6" fill="#4a2f18" />
      <ellipse cx="44" cy="430" rx="8" ry="5" fill="#4a2f18" />
      <ellipse cx="218" cy="466" rx="7" ry="4.5" fill="#3e2712" />
      <g fill="#a8763e" opacity=".6">
        <circle cx="96" cy="412" r="1" /><circle cx="286" cy="408" r="1" />
        <circle cx="170" cy="428" r="1" /><circle cx="248" cy="436" r="1" />
      </g>

      {/* raíces principales (laten despacio: la savia baja) */}
      <g className="fvn-raiz" fill="none" stroke="#8a5a32" strokeLinecap="round">
        <path strokeWidth="3" d="M195,392 C168,406 130,414 88,418" />
        <path strokeWidth="3" d="M195,392 C222,408 262,416 306,420" />
        <path strokeWidth="2.4" d="M195,392 C186,420 172,438 150,452" />
        <path strokeWidth="2.4" d="M195,392 C208,422 224,442 248,456" />
        <path strokeWidth="2" d="M195,392 C196,424 192,442 188,456" />
      </g>
      <g className="fvn-raiz fvn-r2" fill="none" stroke="#a8763e" strokeWidth="1.4" strokeLinecap="round" opacity=".8">
        <path d="M130,414 C112,420 98,428 90,436" />
        <path d="M262,416 C280,422 292,430 298,440" />
        <path d="M172,438 C160,444 152,452 148,460" />
        <path d="M224,442 C234,450 240,458 242,464" />
      </g>
      {/* puntas de raíz (nudos de vida) */}
      <g fill="#caa066">
        <circle cx="88" cy="418" r="2.2" /><circle cx="306" cy="420" r="2.2" />
        <circle cx="150" cy="452" r="2" /><circle cx="248" cy="456" r="2" />
        <circle cx="188" cy="456" r="1.8" />
      </g>

      {/* semillas germinando en la tierra criada */}
      <g transform="translate(120,442)">
        <g className="fvn-semilla">
          <ellipse cx="0" cy="0" rx="4" ry="5.4" fill="#d8b277" stroke="#a8763e" strokeWidth="1" />
          <path d="M0,-5 C0,-10 -2,-13 -5,-15" stroke="#9db06a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <circle cx="-5.4" cy="-15.4" r="1.4" fill="#c8d96a" />
        </g>
      </g>
      <g transform="translate(272,448)">
        <g className="fvn-semilla fvn-s2">
          <ellipse cx="0" cy="0" rx="3.6" ry="5" fill="#d8b277" stroke="#a8763e" strokeWidth="1" />
          <path d="M0,-4.6 C0,-9 2,-12 5,-14" stroke="#9db06a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <circle cx="5.4" cy="-14.4" r="1.3" fill="#c8d96a" />
        </g>
      </g>

      {/* lombriz (la tierra está viva) */}
      <g transform="translate(58,462)">
        <g className="fvn-lombriz">
          <path d="M0,0 q6,-6 12,0 q6,6 12,0" stroke="#d98a8a" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="24.5" cy="-.5" r="1" fill="#b06a6a" />
        </g>
      </g>

      {/* etiqueta viva (familia de la del biopunk, en clave tierra) */}
      <g fontFamily="ui-monospace,monospace" fontSize="7.5" letterSpacing="2" opacity=".7">
        <text x="195" y="471" fill="#d8b277" textAnchor="middle">EL ÁRBOL DE LA VIDA · SUELO VIVO</text>
        <text x="195" y="481" fill="#b09c66" textAnchor="middle" letterSpacing="1" fontSize="6.8">sus raíces crían la tierra que lo cría</text>
      </g>
    </svg>
  );
}
