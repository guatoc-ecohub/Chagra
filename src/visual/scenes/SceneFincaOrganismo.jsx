/**
 * SceneFincaOrganismo — la escena "FINCA ORGANISMO" del tema BIOPUNK
 * (port fiel del mockup aprobado escena-home-biopunk-v2: la finca campesina
 * de noche convertida en organismo bioluminiscente).
 *
 * Qué dibuja (todo animado por CSS, cero JS por frame):
 *   · CORAZÓN-SEMILLA germinando bajo tierra que LATE (doble pulso cardíaco);
 *     de él nacen los cuellos de raíz y la RED MICORRÍZICA (hifas con flujo de
 *     savia + nutrientes viajando por motion-path hasta cada planta).
 *   · INVERNADERO-CÉLULA que respira: cúpula-membrana con paneles geodésicos
 *     que laten, lámpara-reactor, organelas flotando y camas de plántulas.
 *   · MILPA de savia neón (maíz + frijol + auyama), cafetales con cerezas
 *     neón, casita campesina con fogón (brasas), campesino con ruana +
 *     farol + perro criollo, frailejones que exhalan luz, luna verde
 *     bioluminiscente, cocuyos, aurora de páramo, niebla y hongos con esporas.
 *   · QUEBRADA bioluminiscente que baja de la montaña por las terrazas y
 *     remansa en un pocito que se filtra hacia la red micorrízica; platanera
 *     con racimo neón junto a la casita; polillas rondando el farol y una
 *     cordillera lejana + rayo del astro que dan profundidad de capas.
 *   · POTRERO con VACA bioluminiscente (respira, pasta y espanta con la
 *     cola) + 3 GALLINAS que picotean: es la ENTRADA VIVA al mundo de los
 *     animales — si `onAnimales` llega, el grupo es un botón (tap/Enter)
 *     que navega al módulo; sin handler queda como arte decorativo (el
 *     MISMO gate por perfil que esconde el mundo Animales en el home).
 *
 * Solo se monta con el tema biopunk (lo decide FincaVivaHero); los demás
 * temas conservan sus escenas isométricas intactas. Las clases/ids llevan
 * prefijo `fvo-` para no chocar con el resto del hero. Sus animaciones viven
 * en scene-finca-organismo.css y respetan prefers-reduced-motion con un
 * estado estático digno (misma receta que el mockup).
 *
 * @param {Object} props
 * @param {{tiene:boolean, forma?:?string}} [props.estructura] estructura de
 *   cubierta declarada en el perfil (#34): si el usuario declaró invernadero,
 *   el invernadero-célula de la escena lleva el data-testid/data-forma del
 *   contrato de FincaVivaHero.estructura.test.jsx (misma semántica que
 *   SceneFinca: el marcador aparece SOLO si la estructura está declarada).
 * @param {?() => void} [props.onAnimales] al tocar el potrero (vaca +
 *   gallinas) navega al mundo de los animales. `null`/ausente = el perfil no
 *   ve ese mundo (gate `mostrarAnimales` del home) y el potrero queda
 *   decorativo, sin rol ni foco.
 * @param {?() => void} [props.onPregunte] al tocar el CORAZÓN-SEMILLA abre el
 *   agente ("Pregunte"): la metáfora central de la escena deja de ser
 *   decoración y se vuelve LA acción principal (usabilidad campesina #4).
 *   Sin handler, el corazón queda como arte (sin rol ni foco).
 */
export default function SceneFincaOrganismo({ estructura, onAnimales, onPregunte }) {
  const conEstructura = !!estructura?.tiene;
  const conAnimales = typeof onAnimales === 'function';
  const conPregunte = typeof onPregunte === 'function';
  const ariaEscena =
    'Su finca convertida en organismo bioluminiscente, con el sol o la luna según la hora y el cielo real de su vereda: un corazón-semilla late bajo la tierra y su red de micorrizas conecta las raíces de cada planta, con lombrices y bichitos trabajando el suelo; una quebrada baja de la montaña, cultivos con savia de neón, invernadero-célula que respira, potrero con vaca y gallinas, campesino con su perro y colibrí de luz.';
  return (
    <svg
      className="fvo-svg"
      viewBox="0 0 390 486"
      preserveAspectRatio="xMidYMid slice"
      /* con el potrero y/o el corazón tappables el SVG deja de ser imagen
         plana: role="img" volvería PRESENTACIONALES a sus hijos y los botones
         (animales y "Pregunte") no existirían para lectores de pantalla. */
      role={conAnimales || conPregunte ? 'group' : 'img'}
      aria-label={ariaEscena}
      data-testid="fvo-escena"
    >
      <defs>
        <linearGradient id="fvo-cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#020412" />
          <stop offset=".55" stopColor="#071030" />
          <stop offset="1" stopColor="#0d1e44" />
        </linearGradient>
        <linearGradient id="fvo-suelo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0c1026" />
          <stop offset="1" stopColor="#04060f" />
        </linearGradient>
        <radialGradient id="fvo-luna" cx=".38" cy=".35" r="1">
          <stop offset="0" stopColor="#eafff6" />
          <stop offset=".7" stopColor="#a8e8d4" />
          <stop offset="1" stopColor="#6fc4b0" />
        </radialGradient>
        {/* sol bioluminiscente + velos de cielo diurno/crepuscular (la escena
            sigue la atmósfera REAL: data-luz/data-clima en .fvh, ver CSS) */}
        <radialGradient id="fvo-sol" cx=".42" cy=".4" r="1">
          <stop offset="0" stopColor="#fff9e0" />
          <stop offset=".55" stopColor="#ffd76a" />
          <stop offset="1" stopColor="#ff9d3f" />
        </radialGradient>
        <linearGradient id="fvo-cielo-dia-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#11506b" />
          <stop offset=".55" stopColor="#177082" />
          <stop offset="1" stopColor="#1a7a6a" />
        </linearGradient>
        <linearGradient id="fvo-cielo-crep-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#241338" />
          <stop offset=".6" stopColor="#4a1e4e" />
          <stop offset="1" stopColor="#8a4a2c" />
        </linearGradient>
        <radialGradient id="fvo-bulbo" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#2dffc4" stopOpacity=".9" />
          <stop offset=".55" stopColor="#2dffc4" stopOpacity=".25" />
          <stop offset="1" stopColor="#2dffc4" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="fvo-corazon" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#eafff6" />
          <stop offset=".35" stopColor="#2dffc4" />
          <stop offset=".8" stopColor="#0a9f74" stopOpacity=".4" />
          <stop offset="1" stopColor="#0a9f74" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="fvo-membrana" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2dffc4" stopOpacity=".22" />
          <stop offset="1" stopColor="#4fd8ff" stopOpacity=".05" />
        </linearGradient>
        <linearGradient id="fvo-tallo" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#0f8f6c" />
          <stop offset="1" stopColor="#9dff3f" />
        </linearGradient>
        {/* agua de la quebrada: azul profundo que se enciende hacia el remanso */}
        <linearGradient id="fvo-agua-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a2b4a" />
          <stop offset="1" stopColor="#12466e" />
        </linearGradient>
        {/* rayo del astro: cae en diagonal sobre la finca y se disuelve */}
        <linearGradient id="fvo-rayo-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eafff6" stopOpacity=".14" />
          <stop offset="1" stopColor="#eafff6" stopOpacity="0" />
        </linearGradient>
        <filter id="fvo-blur8"><feGaussianBlur stdDeviation="8" /></filter>
        <filter id="fvo-blur3"><feGaussianBlur stdDeviation="3" /></filter>
        <filter id="fvo-glow1" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ============ CIELO ============ */}
      <rect width="390" height="486" fill="url(#fvo-cielo)" />
      {/* velos atmosféricos: se encienden por data-luz (día / amanecer-atardecer).
          Van bajo montañas y terrazas — solo aclaran el cielo, no la finca. */}
      <rect className="fvo-cielo-dia" width="390" height="486" fill="url(#fvo-cielo-dia-grad)" />
      <rect className="fvo-cielo-crep" width="390" height="486" fill="url(#fvo-cielo-crep-grad)" />

      {/* aurora de páramo */}
      <path
        className="fvo-aurora"
        d="M-10,150 C70,110 150,140 230,105 C300,78 350,110 400,88 L400,160 C310,140 240,168 150,152 C80,140 30,166 -10,158 Z"
        fill="#2dffc4" opacity=".14" filter="url(#fvo-blur8)"
      />
      <path
        className="fvo-aurora" style={{ animationDelay: '-7s' }}
        d="M-10,120 C90,95 170,125 260,92 L400,70 L400,120 C300,105 200,138 90,124 Z"
        fill="#b28dff" opacity=".08" filter="url(#fvo-blur8)"
      />

      {/* estrellas */}
      <g fill="#dfeffc">
        <circle className="fvo-tw" cx="30" cy="34" r="1.2" />
        <circle className="fvo-tw" style={{ animationDelay: '-1s' }} cx="74" cy="60" r=".9" />
        <circle className="fvo-tw" style={{ animationDelay: '-2.2s' }} cx="120" cy="28" r="1.1" />
        <circle className="fvo-tw" style={{ animationDelay: '-.6s' }} cx="168" cy="52" r=".8" />
        <circle className="fvo-tw" style={{ animationDelay: '-1.7s' }} cx="212" cy="24" r="1.2" />
        <circle className="fvo-tw" style={{ animationDelay: '-2.9s' }} cx="252" cy="58" r=".9" />
        <circle className="fvo-tw" style={{ animationDelay: '-.3s' }} cx="356" cy="30" r="1.1" />
        <circle className="fvo-tw" style={{ animationDelay: '-1.4s' }} cx="146" cy="86" r=".8" />
        <circle className="fvo-tw" style={{ animationDelay: '-2.5s' }} cx="52" cy="104" r="1" />
        <circle className="fvo-tw" style={{ animationDelay: '-.9s' }} cx="238" cy="96" r=".8" />
        <circle className="fvo-tw" style={{ animationDelay: '-1.9s' }} cx="330" cy="72" r=".9" fill="#2dffc4" />
        <circle className="fvo-tw" style={{ animationDelay: '-3.1s' }} cx="96" cy="42" r=".7" fill="#ff4fd8" />
        <circle className="fvo-tw" style={{ animationDelay: '-2s' }} cx="288" cy="40" r=".8" fill="#9dff3f" />
      </g>

      {/* luna bioluminiscente (solo de noche — data-luz la gobierna en CSS) */}
      <g className="fvo-astro fvo-luna-g">
        <circle cx="318" cy="64" r="54" fill="#2dffc4" opacity=".045" filter="url(#fvo-blur8)" />
        <circle cx="318" cy="64" r="40" fill="#a8e8d4" opacity=".08" filter="url(#fvo-blur8)" />
        <circle className="fvo-halo" cx="318" cy="64" r="34" fill="none" stroke="#2dffc4" strokeWidth="1" opacity=".45" />
        <circle cx="318" cy="64" r="21" fill="url(#fvo-luna)" />
        <circle cx="318" cy="64" r="21" fill="none" stroke="#eafff6" strokeWidth=".7" opacity=".45" />
        <circle cx="326" cy="58" r="19.2" fill="#061027" opacity=".94" />
        <circle cx="309" cy="71" r="2.3" fill="#5fb89e" opacity=".4" />
        <circle cx="305" cy="63" r="1.4" fill="#5fb89e" opacity=".35" />
        <circle cx="312.5" cy="76" r="1" fill="#5fb89e" opacity=".3" />
      </g>

      {/* sol bioluminiscente (día / amanecer / atardecer — mismo lugar del
          cielo que la luna; el CSS muestra UNO según la atmósfera real) */}
      <g className="fvo-astro fvo-sol-g">
        <circle cx="318" cy="64" r="54" fill="#ffb54f" opacity=".07" filter="url(#fvo-blur8)" />
        <circle cx="318" cy="64" r="40" fill="#ffd76a" opacity=".1" filter="url(#fvo-blur8)" />
        <circle className="fvo-halo" cx="318" cy="64" r="34" fill="none" stroke="#ffb54f" strokeWidth="1" opacity=".5" />
        <circle cx="318" cy="64" r="21" fill="url(#fvo-sol)" />
        <circle cx="318" cy="64" r="21" fill="none" stroke="#fff3c9" strokeWidth=".7" opacity=".6" />
        {/* corona de rayos que respira */}
        <g className="fvo-corona" stroke="#ffd76a" strokeWidth="1.4" strokeLinecap="round" fill="none">
          <path d="M318,34 L318,26" /><path d="M318,94 L318,102" />
          <path d="M288,64 L280,64" /><path d="M348,64 L356,64" />
          <path d="M297,43 L291,37" /><path d="M339,85 L345,91" />
          <path d="M339,43 L345,37" /><path d="M297,85 L291,91" />
        </g>
      </g>

      {/* nubes de clima: aparecen con nublado/lluvia/niebla (data-clima) y
          velan el astro — el cielo de la escena cuenta el clima REAL */}
      <g className="fvo-nubes">
        <g className="fvo-fog">
          <ellipse cx="310" cy="58" rx="46" ry="12" fill="#8fa8bd" opacity=".38" filter="url(#fvo-blur8)" />
          <ellipse cx="286" cy="72" rx="34" ry="10" fill="#7d95ab" opacity=".3" filter="url(#fvo-blur8)" />
        </g>
        <g className="fvo-fog fvo-g2">
          <ellipse cx="120" cy="66" rx="52" ry="12" fill="#8fa8bd" opacity=".3" filter="url(#fvo-blur8)" />
          <ellipse cx="152" cy="78" rx="36" ry="9" fill="#7d95ab" opacity=".24" filter="url(#fvo-blur8)" />
        </g>
      </g>

      {/* estrella fugaz + aves lejanas */}
      <g className="fvo-shoot">
        <line x1="60" y1="40" x2="45" y2="33.5" stroke="#eafff6" strokeWidth="1.3" strokeLinecap="round" opacity=".85" />
        <circle cx="61" cy="40.5" r="1.4" fill="#eafff6" style={{ filter: 'drop-shadow(0 0 4px #bfffe9)' }} />
      </g>
      <g className="fvo-vbird" fill="none" stroke="#7f9db0" strokeWidth="1" strokeLinecap="round" opacity=".5">
        <path className="fvo-flap" d="M150,92 l4,-2.6 4,2.6" />
        <path className="fvo-flap" style={{ animationDelay: '-.4s' }} d="M161,87 l3.4,-2 3.4,2" />
        <path className="fvo-flap" style={{ animationDelay: '-.8s' }} d="M143,97 l3,-1.8 3,1.8" />
      </g>

      {/* ============ COLIBRÍ DE LUZ (ser de luz, protagonista alado) ============ */}
      <g className="fvo-colibri">
        <circle className="fvo-estela" r="5" fill="#2dffc4" opacity=".5" filter="url(#fvo-blur3)" />
        <circle className="fvo-estela fvo-e2" r="4" fill="#ff4fd8" opacity=".4" filter="url(#fvo-blur3)" />
        <circle className="fvo-estela fvo-e3" r="3" fill="#4fd8ff" opacity=".4" filter="url(#fvo-blur3)" />
        <g filter="url(#fvo-glow1)">
          {/* cola bifurcada */}
          <path d="M-4,-.4 L-12,-3.2 L-8.5,0 L-12,3 Z" fill="#1f9f86" />
          {/* cuerpo */}
          <path d="M-4.5,0 C0,-4.6 7,-4.2 10,-1 C12.2,.7 12.2,2.2 10,3.3 C6,5.8 0,5.4 -4.5,1 Z" fill="#2dffc4" />
          {/* vientre claro */}
          <path d="M-2.5,2.2 C2,3.8 7,3.6 10,1.8 C7,4.9 1,5.1 -3.4,1.6 Z" fill="#bfffe9" opacity=".7" />
          {/* gorguera iridiscente */}
          <path d="M6.6,1.4 C8.6,.2 10.8,1.2 11.4,2.6 C10,3.7 7.6,3.3 6.4,2.1 Z" fill="#ff4fd8" />
          {/* cabeza */}
          <circle cx="9" cy="-1.6" r="2.9" fill="#9dff3f" />
          {/* cresta */}
          <path d="M8,-3.9 L9.1,-6.4 L10.4,-3.6 Z" fill="#4fd8ff" />
          {/* ojo */}
          <circle cx="9.7" cy="-2" r=".85" fill="#04160f" />
          <circle cx="10" cy="-2.3" r=".3" fill="#eafff6" />
          {/* pico largo curvo */}
          <path d="M11.6,-1.1 C15,-1.5 18,-2 20.8,-3.1" stroke="#eafff6" strokeWidth="1" fill="none" strokeLinecap="round" />
          {/* ala superior (bate) */}
          <path className="fvo-ala" d="M3,-1 C-3,-11.5 7.5,-16.5 12.5,-10 C10.4,-4 6,-1 3,-1 Z" fill="#ff4fd8" opacity=".85" />
          {/* ala inferior (bate, desfasada) */}
          <path className="fvo-ala" style={{ animationDelay: '-.06s' }} d="M4,1.2 C0,9.5 9.5,12.5 12.5,7 C10.2,3 7,1.2 4,1.2 Z" fill="#b28dff" opacity=".5" />
        </g>
      </g>

      {/* ============ MONTAÑAS (3 capas = profundidad) ============ */}
      {/* cordillera LEJANA: la capa nueva de atrás, casi cielo — con la niebla
          que deriva entre capas la escena gana paralaje sin mover montañas */}
      <path d="M0,196 C55,162 130,186 210,164 C285,146 340,172 390,152 L390,262 L0,262 Z" fill="#071126" />
      <ellipse className="fvo-fog fvo-g3" cx="180" cy="196" rx="170" ry="13" fill="#9fd4ff" opacity=".05" filter="url(#fvo-blur8)" />
      <path d="M0,206 C60,176 122,196 190,180 C258,166 322,192 390,174 L390,262 L0,262 Z" fill="#0a1734" />
      <path d="M0,234 C70,208 150,228 232,212 C302,200 352,220 390,208 L390,282 L0,282 Z" fill="#0d1e40" />

      {/* rayo del astro: la luz de la luna/el sol cae en diagonal sobre la
          finca (respira suave; da volumen de iluminación a toda la escena) */}
      <path className="fvo-rayo" d="M292,88 L188,336 L390,336 L346,86 Z" fill="url(#fvo-rayo-grad)" />

      {/* frailejones que exhalan luz (páramo) */}
      <g className="fvo-frailejon" strokeLinecap="round">
        <rect x="44" y="212" width="3" height="12" rx="1.5" fill="#123024" />
        <g stroke="#9dff3f" strokeWidth="1.6" opacity=".9">
          <path d="M45.5,212 L38,202" /><path d="M45.5,212 L42,200" /><path d="M45.5,212 L46,199" />
          <path d="M45.5,212 L50,200" /><path d="M45.5,212 L53,203" />
        </g>
        <circle cx="38" cy="201" r="1.4" fill="#d8ff6a" /><circle cx="46" cy="198" r="1.4" fill="#d8ff6a" />
        <circle cx="53" cy="202" r="1.4" fill="#d8ff6a" />
      </g>
      <g className="fvo-frailejon fvo-fr2" strokeLinecap="round">
        <rect x="76" y="220" width="2.6" height="9" rx="1.3" fill="#123024" />
        <g stroke="#9dff3f" strokeWidth="1.4" opacity=".85">
          <path d="M77,220 L71,212" /><path d="M77,220 L76,210" /><path d="M77,220 L82,212" />
        </g>
        <circle cx="71" cy="211" r="1.2" fill="#d8ff6a" /><circle cx="82" cy="211" r="1.2" fill="#d8ff6a" />
      </g>
      <g className="fvo-frailejon" style={{ animationDelay: '-1.8s' }} strokeLinecap="round">
        <rect x="364" y="206" width="2.6" height="10" rx="1.3" fill="#123024" />
        <g stroke="#9dff3f" strokeWidth="1.4" opacity=".85">
          <path d="M365,206 L359,198" /><path d="M365,206 L364,196" /><path d="M365,206 L370,198" />
        </g>
        <circle cx="364" cy="195" r="1.2" fill="#d8ff6a" /><circle cx="370" cy="197" r="1.2" fill="#d8ff6a" />
      </g>

      {/* ============ FINCA (respira) ============ */}
      <g className="fvo-breathe">
        {/* terrazas: curvas de nivel bioluminiscentes */}
        <path d="M0,258 C80,246 180,256 262,246 C320,240 360,248 390,242 L390,296 L0,296 Z" fill="#102a48" />
        <path d="M0,258 C80,246 180,256 262,246 C320,240 360,248 390,242" fill="none" stroke="#2dffc4" strokeWidth="1.2" opacity=".4" />
        <path d="M0,296 C90,286 190,296 280,288 C330,284 364,290 390,284 L390,336 L0,336 Z" fill="#123354" />
        <path d="M0,296 C90,286 190,296 280,288 C330,284 364,290 390,284" fill="none" stroke="#2dffc4" strokeWidth="1.2" opacity=".5" />

        {/* ============ QUEBRADA BIOLUMINISCENTE (el agua de la finca) ============
            Baja de la montaña por el costado izquierdo, salta las terrazas en
            dos cascaditas y remansa en un pocito al pie de la milpa. El flujo
            es el mismo truco de las hifas (dash que corre); el remanso ondea. */}
        <g aria-hidden="true">
          {/* cauce (lecho oscuro + agua) */}
          <path d="M14,232 C6,248 24,262 14,278 C4,294 22,308 12,320 C9,326 5,331 2,334" fill="none" stroke="#0a2b4a" strokeWidth="9" strokeLinecap="round" />
          <path d="M14,232 C6,248 24,262 14,278 C4,294 22,308 12,320 C9,326 5,331 2,334" fill="none" stroke="#123f66" strokeWidth="6" strokeLinecap="round" />
          {/* corriente neón (dos hilos desfasados) */}
          <path className="fvo-agua" d="M14,232 C6,248 24,262 14,278 C4,294 22,308 12,320 C9,326 5,331 2,334" fill="none" stroke="#4fd8ff" strokeWidth="1.8" strokeLinecap="round" opacity=".8" style={{ filter: 'drop-shadow(0 0 3px rgba(79,216,255,.6))' }} />
          <path className="fvo-agua fvo-a2" d="M16,234 C9,249 25,263 16,279 C7,294 23,308 14,320" fill="none" stroke="#bfeaff" strokeWidth=".9" strokeLinecap="round" opacity=".6" />
          {/* cascaditas donde el agua salta cada terraza */}
          <line className="fvo-destello" x1="15" y1="256" x2="14" y2="262" stroke="#bfeaff" strokeWidth="2.2" strokeLinecap="round" opacity=".8" />
          <line className="fvo-destello" style={{ animationDelay: '-1.3s' }} x1="13" y1="294" x2="12" y2="300" stroke="#bfeaff" strokeWidth="2" strokeLinecap="round" opacity=".75" />
          {/* pocito / remanso (refleja la luz del cielo y ondea) */}
          <ellipse cx="18" cy="331" rx="19" ry="4.4" fill="url(#fvo-agua-grad)" />
          <ellipse cx="18" cy="331" rx="19" ry="4.4" fill="none" stroke="#4fd8ff" strokeWidth=".9" opacity=".7" />
          <ellipse className="fvo-reflejo" cx="12" cy="330.4" rx="6.5" ry="1.3" fill="#bfeaff" opacity=".45" />
          <ellipse className="fvo-onda" cx="18" cy="331" rx="6" ry="1.6" fill="none" stroke="#4fd8ff" strokeWidth=".8" />
          <ellipse className="fvo-onda fvo-on2" cx="18" cy="331" rx="6" ry="1.6" fill="none" stroke="#bfeaff" strokeWidth=".6" />
          {/* juncos de la orilla + luciérnaga de agua */}
          <g stroke="#0f8f6c" strokeWidth="1.2" strokeLinecap="round" fill="none">
            <path className="fvo-sap fvo-s3" d="M33,330 C33,324 34,320 33,316" />
            <path className="fvo-sap fvo-s5" d="M36,331 C36,326 37,323 36.5,319" />
          </g>
          <circle cx="33" cy="315" r="1.2" fill="#d8ff6a" style={{ filter: 'drop-shadow(0 0 3px #9dff3f)' }} />
          <circle className="fvo-fly fvo-f5" cx="26" cy="320" r="1.2" fill="#4fd8ff" style={{ filter: 'drop-shadow(0 0 4px #4fd8ff)' }} />
        </g>

        {/* casita campesina con fogón */}
        <g>
          <rect x="52" y="250" width="26" height="17" rx="1.5" fill="#160f2e" />
          <path d="M49,251 L65,238 L81,251 Z" fill="#1e1440" />
          <path d="M49,251 L65,238 L81,251" fill="none" stroke="#ff4fd8" strokeWidth="1" opacity=".55" />
          <rect className="fvo-ventana" x="59" y="255" width="5.5" height="7" rx="1" fill="#ffb54f" style={{ filter: 'drop-shadow(0 0 5px #ff9d3f)' }} />
          <rect x="69" y="256" width="4.5" height="11" rx="1" fill="#0b0820" />
          <rect x="72.5" y="240" width="3.5" height="9" fill="#160f2e" />
          <circle className="fvo-brasa" cx="74" cy="238" r="1.5" fill="#ff7a3d" />
          <circle className="fvo-brasa fvo-br2" cx="75.5" cy="238" r="1.1" fill="#ffb54f" />
          <circle className="fvo-brasa fvo-br3" cx="73" cy="238" r=".9" fill="#ff4fd8" />
          {/* la puerta abierta derrama luz cálida al patio */}
          <ellipse className="fvo-ventana" cx="71.5" cy="268.5" rx="6.5" ry="1.8" fill="#ffb54f" opacity=".16" />
        </g>

        {/* platanera del patio: hojas que arquean con venas de savia y un
            racimo con su bellota neón (queda medio detrás del cafetal — capa) */}
        <g aria-hidden="true">
          <path d="M92,296 C92,284 91,274 92,266" fill="none" stroke="#14503c" strokeWidth="3" strokeLinecap="round" />
          <path className="fvo-sap fvo-s2" d="M92,294 C92,284 91.4,274 92,267" fill="none" stroke="#2dffc4" strokeWidth=".8" opacity=".6" strokeLinecap="round" />
          <path d="M92,266 C83,264 76,257.5 74,250 C80.5,250 89,255.5 92,262 Z" fill="#14503c" stroke="#2dffc4" strokeWidth=".5" strokeOpacity=".35" />
          <path d="M92,266 C101,264 108,257.5 110,250 C103.5,250 95,255.5 92,262 Z" fill="#14503c" stroke="#2dffc4" strokeWidth=".5" strokeOpacity=".35" />
          <path d="M92,264 C86,258 84,250 86.5,243 C90.5,247.5 93,256 92.4,262 Z" fill="#186047" stroke="#2dffc4" strokeWidth=".5" strokeOpacity=".35" />
          <path d="M92,264 C98,258 100,250 97.5,243 C93.5,247.5 91,256 91.6,262 Z" fill="#186047" stroke="#2dffc4" strokeWidth=".5" strokeOpacity=".35" />
          {/* venas de las hojas (laten con la savia) */}
          <g className="fvo-sap fvo-s4" fill="none" stroke="#9dff3f" strokeWidth=".6" opacity=".65" strokeLinecap="round">
            <path d="M92,264 C86,260 81,255 78,251" />
            <path d="M92,264 C98,260 103,255 106,251" />
            <path d="M91.6,262 C90,255 88.6,250 87.6,246" />
            <path d="M92.4,262 C94,255 95.4,250 96.4,246" />
          </g>
          {/* racimo + bellota (flor) colgando */}
          <path d="M92,268 C89.6,269.5 88.4,271.5 88.6,274" fill="none" stroke="#0f8f6c" strokeWidth="1" />
          <circle className="fvo-berry fvo-b2" cx="89.6" cy="269.6" r="1.3" fill="#ffd76a" style={{ filter: 'drop-shadow(0 0 3px #ffb54f)' }} />
          <circle className="fvo-berry fvo-b4" cx="88" cy="271.6" r="1.3" fill="#ffd76a" style={{ filter: 'drop-shadow(0 0 3px #ffb54f)' }} />
          <path d="M88.6,274 L87.4,277.6 L90,277.2 Z" fill="#ff4fd8" style={{ filter: 'drop-shadow(0 0 3px #ff4fd8)' }} />
        </g>

        {/* cafetales con cerezas neón (terraza alta) */}
        <g>
          <g transform="translate(108,252)">
            <path d="M0,14 L0,4" stroke="#0f8f6c" strokeWidth="2" />
            <circle cx="0" cy="2" r="7" fill="#14402f" stroke="#2dffc4" strokeWidth=".5" strokeOpacity=".35" />
            <circle cx="-5" cy="6" r="5" fill="#14402f" stroke="#2dffc4" strokeWidth=".5" strokeOpacity=".35" />
            <circle cx="5" cy="6" r="5" fill="#14402f" stroke="#2dffc4" strokeWidth=".5" strokeOpacity=".35" />
            <circle className="fvo-berry" cx="-4" cy="2" r="1.6" fill="#ff4fd8" style={{ filter: 'drop-shadow(0 0 3px #ff4fd8)' }} />
            <circle className="fvo-berry fvo-b2" cx="3" cy="-1" r="1.6" fill="#ff4fd8" style={{ filter: 'drop-shadow(0 0 3px #ff4fd8)' }} />
            <circle className="fvo-berry fvo-b3" cx="6" cy="5" r="1.4" fill="#ff9d3f" style={{ filter: 'drop-shadow(0 0 3px #ff9d3f)' }} />
          </g>
          <g transform="translate(146,250)">
            <path d="M0,14 L0,4" stroke="#0f8f6c" strokeWidth="2" />
            <circle cx="0" cy="2" r="6" fill="#14402f" stroke="#2dffc4" strokeWidth=".5" strokeOpacity=".35" />
            <circle cx="-4" cy="6" r="4.5" fill="#14402f" stroke="#2dffc4" strokeWidth=".5" strokeOpacity=".35" />
            <circle cx="4.5" cy="5.5" r="4.5" fill="#14402f" stroke="#2dffc4" strokeWidth=".5" strokeOpacity=".35" />
            <circle className="fvo-berry fvo-b4" cx="-3" cy="1" r="1.5" fill="#ff4fd8" style={{ filter: 'drop-shadow(0 0 3px #ff4fd8)' }} />
            <circle className="fvo-berry fvo-b2" cx="4" cy="3" r="1.5" fill="#ff4fd8" style={{ filter: 'drop-shadow(0 0 3px #ff4fd8)' }} />
          </g>
          <g transform="translate(182,249)">
            <path d="M0,13 L0,4" stroke="#0f8f6c" strokeWidth="2" />
            <circle cx="0" cy="1" r="6" fill="#14402f" stroke="#2dffc4" strokeWidth=".5" strokeOpacity=".35" />
            <circle cx="-4.5" cy="5" r="4.5" fill="#14402f" stroke="#2dffc4" strokeWidth=".5" strokeOpacity=".35" />
            <circle cx="4.5" cy="5" r="4.5" fill="#14402f" stroke="#2dffc4" strokeWidth=".5" strokeOpacity=".35" />
            <circle className="fvo-berry fvo-b3" cx="2" cy="-2" r="1.5" fill="#ff4fd8" style={{ filter: 'drop-shadow(0 0 3px #ff4fd8)' }} />
            <circle className="fvo-berry" cx="-4" cy="4" r="1.4" fill="#ff9d3f" style={{ filter: 'drop-shadow(0 0 3px #ff9d3f)' }} />
          </g>
        </g>

        {/* ============ INVERNADERO-CÉLULA (bio-cúpula viva, protagónico) ============
            Si el perfil declaró estructura de cubierta (#34), este grupo lleva el
            marcador del contrato de tests (fvh-estructura + data-forma). */}
        <g
          className="fvo-dome"
          {...(conEstructura
            ? { 'data-testid': 'fvh-estructura', 'data-forma': estructura.forma || 'generica' }
            : {})}
        >
          {/* halo de vida */}
          <ellipse cx="298" cy="292" rx="66" ry="58" fill="#2dffc4" opacity=".10" filter="url(#fvo-blur8)" />
          {/* membrana / vidrio vivo */}
          <path d="M248,330 C248,282 266,244 298,244 C330,244 348,282 348,330 Z" fill="url(#fvo-membrana)" />
          {/* paneles geodésicos (latido) */}
          <g fill="none" stroke="#2dffc4" strokeLinecap="round">
            <g className="fvo-panel" strokeWidth="1.5" opacity=".7" style={{ filter: 'drop-shadow(0 0 4px rgba(45,255,196,.55))' }}>
              <path d="M298,244 L298,330" />
              <path d="M298,244 C280,272 270,300 264,330" />
              <path d="M298,244 C316,272 326,300 332,330" />
            </g>
            <g className="fvo-panel fvo-pa2" strokeWidth="1.3" opacity=".55" style={{ filter: 'drop-shadow(0 0 3px rgba(45,255,196,.5))' }}>
              <path d="M298,244 C288,272 282,302 278,330" />
              <path d="M298,244 C308,272 314,302 318,330" />
            </g>
            <g className="fvo-panel fvo-pa3" strokeWidth="1.2" opacity=".5" stroke="#4fd8ff">
              <path d="M267,266 Q298,257 329,266" />
              <path d="M256,294 Q298,285 340,294" />
              <path d="M250,318 Q298,309 346,318" />
            </g>
          </g>
          {/* contorno brillante */}
          <path
            d="M248,330 C248,282 266,244 298,244 C330,244 348,282 348,330" fill="none"
            stroke="#2dffc4" strokeWidth="1.8" opacity=".9"
            style={{ filter: 'drop-shadow(0 0 6px rgba(45,255,196,.7))' }}
          />

          {/* caballete / venteo del techo + antenas-cilio */}
          <g className="fvo-vent" stroke="#9dff3f" strokeWidth="1.3" strokeLinecap="round" fill="none">
            <path d="M290,246 L288,239 L300,236" />
            <path d="M298,240 L298,231" /><path d="M306,242 L311,235" />
          </g>
          <circle className="fvo-vent" cx="298" cy="230" r="1.6" fill="#d8ff6a" style={{ filter: 'drop-shadow(0 0 4px #9dff3f)' }} />
          <circle className="fvo-vent" cx="311" cy="234" r="1.2" fill="#d8ff6a" style={{ filter: 'drop-shadow(0 0 3px #9dff3f)' }} />

          {/* lámpara-reactor colgada del ápice (grow-light que late) */}
          <path className="fvo-lamplight" d="M298,276 L280,330 L316,330 Z" fill="#2dffc4" opacity=".22" />
          <line x1="298" y1="250" x2="298" y2="268" stroke="#2dffc4" strokeWidth="1" opacity=".6" />
          <circle cx="298" cy="276" r="18" fill="#2dffc4" opacity=".16" filter="url(#fvo-blur3)" />
          <circle className="fvo-reactor" cx="298" cy="276" r="10" fill="#bfffe9" style={{ filter: 'drop-shadow(0 0 10px #2dffc4)' }} />
          <circle className="fvo-reactor" cx="298" cy="276" r="3.2" fill="#ff8fe4" />

          {/* pólenes / organelas flotando */}
          <circle className="fvo-organela" cx="268" cy="290" r="2.6" fill="#9dff3f" opacity=".7" />
          <circle className="fvo-organela fvo-o2" cx="330" cy="298" r="2.2" fill="#4fd8ff" opacity=".7" />
          <circle className="fvo-organela fvo-o3" cx="284" cy="262" r="1.8" fill="#ff8fe4" opacity=".6" />
          <circle className="fvo-organela fvo-o2" cx="316" cy="266" r="1.8" fill="#2dffc4" opacity=".5" />

          {/* camas de siembra + plántulas en hilera (dentro) */}
          <path d="M254,324 L288,324 M308,324 L342,324" stroke="#0e3324" strokeWidth="3.4" strokeLinecap="round" />
          <g stroke="url(#fvo-tallo)" strokeWidth="1.5" strokeLinecap="round" fill="none">
            <path className="fvo-sap" d="M260,323 C260,318 258,315 257,312" />
            <path className="fvo-sap fvo-s2" d="M268,323 C268,317 270,314 271,311" />
            <path className="fvo-sap fvo-s3" d="M277,323 C277,318 275,315 274,312" />
            <path className="fvo-sap fvo-s4" d="M319,323 C319,317 321,314 322,311" />
            <path className="fvo-sap fvo-s2" d="M328,323 C328,318 326,315 325,312" />
            <path className="fvo-sap fvo-s3" d="M337,323 C337,318 339,315 340,312" />
          </g>
          <circle cx="257" cy="311" r="1.5" fill="#d8ff6a" /><circle cx="271" cy="310" r="1.5" fill="#d8ff6a" />
          <circle cx="274" cy="311" r="1.5" fill="#d8ff6a" /><circle cx="322" cy="310" r="1.5" fill="#d8ff6a" />
          <circle cx="325" cy="311" r="1.5" fill="#d8ff6a" /><circle cx="340" cy="311" r="1.5" fill="#d8ff6a" />

          {/* puerta / entrada con luz cálida */}
          <path d="M289,330 L289,309 Q298,301 307,309 L307,330 Z" fill="#0a2018" />
          <path d="M289,330 L289,309 Q298,301 307,309 L307,330" fill="none" stroke="#2dffc4" strokeWidth="1.2" opacity=".8" />
          <path className="fvo-ventana" d="M292,330 L292,311 Q298,305 304,311 L304,330 Z" fill="#9dff3f" opacity=".5" style={{ filter: 'drop-shadow(0 0 5px #9dff3f)' }} />
          {/* base / cimiento luminoso */}
          <rect x="247" y="328" width="102" height="5" rx="2.5" fill="#0c2a20" />
          <rect x="247" y="328" width="102" height="1.6" rx="1" fill="#2dffc4" opacity=".7" />
        </g>

        {/* ============ POTRERO: VACA + 3 GALLINAS = ENTRADA AL MUNDO ANIMALES ============
            El grupo entero es la puerta viva al módulo de animales: con
            `onAnimales` es un botón (tap / Enter / Espacio) con halo-invitación
            y etiqueta; sin handler (gate por perfil) queda como arte. La vaca
            respira, pasta y espanta con la cola; las gallinas picotean. */}
        <g
          className="fvo-animales"
          data-testid="fvo-animales"
          {...(conAnimales
            ? {
                role: 'button',
                tabIndex: 0,
                'data-tap': '1',
                'aria-label': 'Los animales de su finca: la vaca y las gallinas. Toque para entrar al mundo de los animales.',
                onClick: () => onAnimales(),
                onKeyDown: (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onAnimales();
                  }
                },
              }
            : { 'aria-hidden': true })}
        >
          {/* pasto del potrero */}
          <ellipse cx="222" cy="278" rx="31" ry="5.5" fill="#16405a" opacity=".5" />
          <g stroke="#9dff3f" strokeWidth=".8" strokeLinecap="round" opacity=".6" fill="none">
            <path d="M197,278 L196,274.4" /><path d="M199.5,278.4 L199.5,275" />
            <path d="M246,276 L245,272.6" /><path d="M248.5,276.4 L249,273.2" />
            <path d="M215,282 L214.4,279" /><path d="M231,282.4 L231.6,279.4" />
          </g>

          {/* cerca viva del potrero (madera oscura + hilos neón) */}
          <g>
            <g fill="#241c3e">
              <rect x="194.2" y="244.5" width="1.8" height="10.5" rx=".9" />
              <rect x="208.2" y="243.8" width="1.8" height="10.5" rx=".9" />
              <rect x="222.2" y="243.5" width="1.8" height="10.5" rx=".9" />
              <rect x="236.2" y="243.8" width="1.8" height="10.5" rx=".9" />
              <rect x="250.2" y="244.5" width="1.8" height="10.5" rx=".9" />
            </g>
            <path d="M194,247.4 C208,246.2 238,246.2 252,247.4" fill="none" stroke="#b28dff" strokeWidth=".9" opacity=".55" />
            <path d="M194,251.4 C208,250.2 238,250.2 252,251.4" fill="none" stroke="#2dffc4" strokeWidth=".9" opacity=".5" />
            <circle className="fvo-nodo" cx="223.1" cy="243.2" r="1" fill="#d8ff6a" style={{ filter: 'drop-shadow(0 0 3px #9dff3f)' }} />
          </g>

          {/* VACA bioluminiscente (mira hacia la casa; el organismo la abraza:
              sus manchas laten con el MISMO pulso de la red micorrízica) */}
          <g className="fvo-vaca">
            <ellipse cx="221" cy="280" rx="18" ry="3" fill="#000" opacity=".35" />
            {/* cola (espanta de a ratos) + borla-cocuyo */}
            <g className="fvo-vaca-cola">
              <path d="M236.5,258 C240.5,262 241.5,268 239.5,274" fill="none" stroke="#241c3e" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="239.5" cy="275" r="1.9" fill="#2dffc4" style={{ filter: 'drop-shadow(0 0 4px #2dffc4)' }} />
            </g>
            {/* patas con pezuñas de luz */}
            <g stroke="#241c3e" strokeWidth="3" strokeLinecap="round">
              <path d="M210,271 L209.4,279" /><path d="M215.5,272.5 L215.5,279.6" />
              <path d="M228.5,272.5 L228.5,279.6" /><path d="M234,271 L234.6,279" />
            </g>
            <g fill="#b28dff" opacity=".8">
              <circle cx="209.4" cy="279.6" r=".9" /><circle cx="215.5" cy="280.2" r=".9" />
              <circle cx="228.5" cy="280.2" r=".9" /><circle cx="234.6" cy="279.6" r=".9" />
            </g>
            {/* cuerpo (respira) con manchas que laten al pulso del corazón */}
            <g className="fvo-vaca-cuerpo">
              <ellipse cx="222" cy="264" rx="16" ry="9.5" fill="#241c3e" stroke="#b28dff" strokeWidth=".8" strokeOpacity=".45" />
              <path className="fvo-mancha" d="M210,259 C215,255.5 221,256 223.5,260 C221,264.5 213.5,265.5 209.5,262.5 Z" fill="#2dffc4" style={{ filter: 'drop-shadow(0 0 4px rgba(45,255,196,.7))' }} />
              <path className="fvo-mancha fvo-m2" d="M229,266 C233.5,264 237,266 236,269.5 C233,271.5 228.5,270.5 227.5,268 Z" fill="#4fd8ff" style={{ filter: 'drop-shadow(0 0 3px rgba(79,216,255,.7))' }} />
              <circle className="fvo-mancha fvo-m3" cx="216" cy="269" r="2.4" fill="#ff8fe4" style={{ filter: 'drop-shadow(0 0 3px rgba(255,143,228,.7))' }} />
              {/* ubre con su lucecita (la leche también es vida) */}
              <path d="M226.5,272.5 a3.2,2.6 0 0 0 6.2,0 Z" fill="#ff9ee8" opacity=".85" />
            </g>
            {/* cabeza: pasta y se alza a mirar; orejas que espantan */}
            <g className="fvo-vaca-cabeza">
              <path d="M209,258 L213,260" stroke="#241c3e" strokeWidth="5" strokeLinecap="round" />
              <ellipse cx="204.5" cy="257" rx="6.2" ry="5" fill="#241c3e" stroke="#b28dff" strokeWidth=".7" strokeOpacity=".4" />
              {/* cachos de luna */}
              <g fill="none" stroke="#e8dcff" strokeWidth="1.2" strokeLinecap="round">
                <path d="M201.5,252.6 C200,250 200.8,248.4 202.8,247.8" />
                <path d="M207.5,252.4 C209,250 208.4,248.2 206.4,247.8" />
              </g>
              <path className="fvo-vaca-oreja" d="M209.5,254 Q212.5,251.5 213.5,253.5 Q212,256 209.8,256 Z" fill="#3a2f52" />
              {/* hocico + ollar */}
              <ellipse cx="200" cy="259.5" rx="3.4" ry="2.5" fill="#3a2f52" />
              <circle cx="198.8" cy="259.3" r=".5" fill="#0a0618" />
              {/* ojo de cocuyo */}
              <circle cx="206" cy="255.8" r="1.05" fill="#2dffc4" style={{ filter: 'drop-shadow(0 0 3px #2dffc4)' }} />
              <circle cx="206.35" cy="255.45" r=".35" fill="#eafff6" />
              {/* mancha de la frente */}
              <path className="fvo-mancha fvo-m2" d="M203,253.6 C204.6,252.6 206.4,253 206.8,254.4 C205.6,255.6 203.6,255.4 203,253.6 Z" fill="#2dffc4" opacity=".7" />
            </g>
          </g>

          {/* 3 GALLINAS que picotean (cada una con su color y su ritmo) */}
          <GallinaLuz x={205} y={281} cuerpo="#ffb54f" cola="#ff9d3f" clase="" />
          <GallinaLuz x={220.5} y={283.5} cuerpo="#ff8fe4" cola="#d86ac0" clase="fvo-ga2" espejo />
          <GallinaLuz x={237} y={281} cuerpo="#8fc8ef" cola="#5a9fd4" clase="fvo-ga3" />

          {/* halo-invitación + etiqueta (solo cuando el potrero es la puerta
              al módulo; el anillo de foco lo enciende :focus-visible) */}
          {conAnimales && (
            <g>
              <ellipse className="fvo-cta-halo" cx="222" cy="264" rx="34" ry="22" fill="none" stroke="#ffb54f" strokeWidth="1" />
              <ellipse className="fvo-cta-anillo" cx="222" cy="264" rx="34" ry="22" fill="none" stroke="#ffd76a" strokeWidth="1.4" opacity="0" />
              <text
                className="fvo-cta-tag"
                x="222"
                y="238"
                fill="#ffb54f"
                fontFamily="ui-monospace,monospace"
                fontSize="7"
                letterSpacing="1.5"
                textAnchor="middle"
              >
                LOS ANIMALES ▸
              </text>
              {/* zona de tap generosa (invisible) sobre todo el potrero.
                  OJO: sin <title> a propósito — un <title> en el subárbol
                  aporta un rect degenerado en el origen del SVG y Chromium
                  infla el boundingClientRect del botón hasta cubrir media
                  escena (el aria-label del grupo ya cubre accesibilidad). */}
              <rect x="190" y="230" width="66" height="58" fill="#000" opacity="0" style={{ pointerEvents: 'all' }} />
            </g>
          )}
        </g>

        {/* ============ MILPA FRONTAL: maíz de savia neón ============ */}
        <g strokeLinecap="round" fill="none">
          <g className="fvo-sap">
            <path d="M40,336 C40,318 38,306 40,294" stroke="url(#fvo-tallo)" strokeWidth="2.4" />
            <path d="M40,318 C33,314 28,308 27,300" stroke="#9dff3f" strokeWidth="1.6" opacity=".9" />
            <path d="M40,310 C47,306 52,300 53,293" stroke="#9dff3f" strokeWidth="1.6" opacity=".9" />
            <ellipse cx="40" cy="291" rx="3" ry="5" fill="#d8ff6a" style={{ filter: 'drop-shadow(0 0 5px #9dff3f)' }} />
          </g>
          <g className="fvo-sap fvo-s2">
            <path d="M78,338 C78,318 80,304 78,292" stroke="url(#fvo-tallo)" strokeWidth="2.6" />
            <path d="M78,320 C70,316 65,309 64,301" stroke="#9dff3f" strokeWidth="1.7" opacity=".9" />
            <path d="M78,312 C86,308 91,302 92,294" stroke="#9dff3f" strokeWidth="1.7" opacity=".9" />
            <ellipse cx="78" cy="289" rx="3.2" ry="5.4" fill="#d8ff6a" style={{ filter: 'drop-shadow(0 0 5px #9dff3f)' }} />
          </g>
          <g className="fvo-sap fvo-s3">
            <path d="M118,337 C118,316 116,304 118,290" stroke="url(#fvo-tallo)" strokeWidth="2.6" />
            <path d="M118,318 C110,314 105,307 104,299" stroke="#9dff3f" strokeWidth="1.7" opacity=".9" />
            <path d="M118,309 C126,305 131,299 132,291" stroke="#9dff3f" strokeWidth="1.7" opacity=".9" />
            <ellipse cx="118" cy="287" rx="3.2" ry="5.4" fill="#d8ff6a" style={{ filter: 'drop-shadow(0 0 5px #9dff3f)' }} />
          </g>
          <g className="fvo-sap fvo-s4">
            <path d="M156,338 C156,320 158,308 156,296" stroke="url(#fvo-tallo)" strokeWidth="2.4" />
            <path d="M156,320 C149,316 144,310 143,302" stroke="#9dff3f" strokeWidth="1.6" opacity=".9" />
            <path d="M156,313 C163,309 168,303 169,296" stroke="#9dff3f" strokeWidth="1.6" opacity=".9" />
            <ellipse cx="156" cy="293" rx="3" ry="5" fill="#d8ff6a" style={{ filter: 'drop-shadow(0 0 5px #9dff3f)' }} />
          </g>
          {/* frijol enredado (milpa) */}
          <path className="fvo-sap fvo-s5" d="M92,336 C88,328 96,324 92,316 C88,308 96,304 93,297" stroke="#4fd8ff" strokeWidth="1.4" opacity=".85" />
          <circle cx="93" cy="296" r="1.6" fill="#4fd8ff" style={{ filter: 'drop-shadow(0 0 3px #4fd8ff)' }} />
          {/* auyama que late */}
          <g className="fvo-sap fvo-s2">
            <path d="M196,336 C202,330 212,330 218,334" stroke="#0f8f6c" strokeWidth="1.6" />
            <ellipse cx="210" cy="331" rx="7" ry="5.4" fill="#132c1e" stroke="#ffb54f" strokeWidth="1.2" style={{ filter: 'drop-shadow(0 0 5px rgba(255,181,79,.7))' }} />
            <path d="M210,326 C210,323 212,322 213,321" stroke="#9dff3f" strokeWidth="1.2" />
          </g>
        </g>

        {/* penachos (flor del maíz) que laten */}
        <g stroke="#d8ff6a" strokeWidth="1" strokeLinecap="round" fill="none" opacity=".9">
          <g className="fvo-sap"><path d="M40,286 L36,280" /><path d="M40,286 L40,279" /><path d="M40,286 L44,281" /></g>
          <g className="fvo-sap fvo-s2"><path d="M78,284 L74,278" /><path d="M78,284 L78,277" /><path d="M78,284 L82,279" /></g>
          <g className="fvo-sap fvo-s3"><path d="M118,282 L114,276" /><path d="M118,282 L118,275" /><path d="M118,282 L122,277" /></g>
          <g className="fvo-sap fvo-s4"><path d="M156,288 L152,282" /><path d="M156,288 L156,281" /><path d="M156,288 L160,283" /></g>
        </g>
        <circle className="fvo-berry" cx="40" cy="279" r="1.1" fill="#eafff6" style={{ filter: 'drop-shadow(0 0 3px #d8ff6a)' }} />
        <circle className="fvo-berry fvo-b3" cx="78" cy="277" r="1.1" fill="#eafff6" style={{ filter: 'drop-shadow(0 0 3px #d8ff6a)' }} />
        <circle className="fvo-berry fvo-b2" cx="118" cy="275" r="1.1" fill="#eafff6" style={{ filter: 'drop-shadow(0 0 3px #d8ff6a)' }} />

        {/* ============ PERSONAJES: campesino con su perro criollo ============ */}
        {/* pool de luz del farol */}
        <ellipse className="fvo-lantpool" cx="240" cy="335" rx="17" ry="4.4" fill="#2dffc4" opacity=".4" filter="url(#fvo-blur3)" />

        <g className="fvo-campesino">
          <ellipse cx="222" cy="336" rx="12" ry="2.6" fill="#000" opacity=".35" />
          {/* botas */}
          <path d="M217,325 L216,335" stroke="#0f1424" strokeWidth="4" strokeLinecap="round" />
          <path d="M226,325 L227,335" stroke="#0f1424" strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="214.5" cy="335" rx="3" ry="1.5" fill="#0f1424" />
          <ellipse cx="228.5" cy="335" rx="3" ry="1.5" fill="#0f1424" />
          {/* brazo trasero */}
          <path d="M219,312 C214,316 213,320 215,324" stroke="#7a3a24" strokeWidth="3" strokeLinecap="round" fill="none" />
          {/* ruana / poncho */}
          <path d="M222,305 L209,328 L235,328 Z" fill="#a85a34" />
          <path d="M222,305 L209,328 L235,328 Z" fill="none" stroke="#2dffc4" strokeWidth=".6" opacity=".4" />
          <path d="M214,322 L230,322" stroke="#ffb54f" strokeWidth="1.3" opacity=".85" />
          <path d="M216,318 L228,318" stroke="#2dffc4" strokeWidth="1" opacity=".7" />
          <path d="M218,314 L226,314" stroke="#ff8fe4" strokeWidth=".8" opacity=".6" />
          {/* fleco */}
          <g stroke="#8a4a2c" strokeWidth=".7" opacity=".9">
            <path d="M211,328 L210,331" /><path d="M216,328 L216,331.5" /><path d="M222,328 L222,332" />
            <path d="M228,328 L228,331.5" /><path d="M233,328 L234,331" />
          </g>
          {/* cuello */}
          <rect x="219.4" y="302" width="5.2" height="6" rx="2.2" fill="#7a3a24" />
          {/* cabeza */}
          <g className="fvo-head-c">
            <circle cx="222" cy="302" r="4.2" fill="#d99a6c" />
            <path d="M220.2,303.4 Q222,305 223.8,303.4" stroke="#7a3a24" strokeWidth=".7" fill="none" strokeLinecap="round" />
            <circle cx="220.4" cy="301.4" r=".55" fill="#3a2416" /><circle cx="223.6" cy="301.4" r=".55" fill="#3a2416" />
            {/* sombrero aguadeño */}
            <path d="M217,298.5 Q222,290.5 227,298.5 Z" fill="#cdb87a" />
            <path d="M217.6,297.6 L226.4,297.6" stroke="#a8935a" strokeWidth=".9" />
            <ellipse cx="222" cy="299" rx="9.5" ry="2.7" fill="#d8c48a" />
            <ellipse cx="222" cy="299" rx="9.5" ry="2.7" fill="none" stroke="#2dffc4" strokeWidth=".5" opacity=".45" />
            <ellipse cx="222" cy="298.4" rx="9.5" ry="2.4" fill="#e2d199" opacity=".5" />
          </g>
          {/* brazo delantero con el farol (se mece) */}
          <g className="fvo-lantern">
            <path d="M224,309 C230,309 235,311 237,314" stroke="#7a3a24" strokeWidth="3" strokeLinecap="round" fill="none" />
            <line x1="237.5" y1="312.5" x2="238" y2="321" stroke="#5a3020" strokeWidth="1" />
            <path d="M234,325 A4.2,4.2 0 0 1 242,325" fill="none" stroke="#0e3324" strokeWidth=".7" />
            <circle className="fvo-lantorb" cx="238" cy="325.5" r="4.4" fill="#bfffe9" style={{ filter: 'drop-shadow(0 0 9px #2dffc4)' }} />
            <circle cx="238" cy="325.5" r="1.9" fill="#eafff6" />
            <line x1="238" y1="321" x2="238" y2="330" stroke="#0e3324" strokeWidth=".55" opacity=".8" />
          </g>
        </g>

        {/* perro criollo */}
        <g className="fvo-dog">
          <ellipse cx="248" cy="336" rx="8" ry="1.8" fill="#000" opacity=".3" />
          <path d="M244,331 L244,335.5" stroke="#8a5a34" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M251,331 L251,335.5" stroke="#8a5a34" strokeWidth="1.7" strokeLinecap="round" />
          <path className="fvo-tail" d="M241,329 C236,327 235,330.5 237,332.5" stroke="#a56b3c" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <ellipse cx="246" cy="330" rx="6.2" ry="3.3" fill="#a56b3c" />
          <circle cx="252.5" cy="327.5" r="3.1" fill="#b5763f" />
          <path className="fvo-earw" d="M251,325 Q249,321.5 251.2,320.6 Q253,323 252,326 Z" fill="#7f5230" />
          <path d="M254.5,328 L258,328.6 L254.5,330.2 Z" fill="#7f5230" />
          <circle cx="257.4" cy="328.7" r=".8" fill="#2dffc4" style={{ filter: 'drop-shadow(0 0 2px #2dffc4)' }} />
          <circle cx="253.4" cy="326.8" r=".55" fill="#2a1a10" />
          <path d="M250,329.5 Q252.5,331.4 255,329.4" stroke="#2dffc4" strokeWidth=".8" fill="none" opacity=".8" />
        </g>

        {/* polillas rondando el farol (la luz siempre convoca su corte) */}
        <circle className="fvo-polilla" cx="233" cy="318" r="1" fill="#eafff6" opacity=".8" />
        <circle className="fvo-polilla fvo-po2" cx="244" cy="321" r=".8" fill="#ffe6c9" opacity=".75" />

        {/* cocuyos */}
        <circle className="fvo-fly" cx="100" cy="272" r="1.7" fill="#d8ff6a" style={{ filter: 'drop-shadow(0 0 4px #d8ff6a)' }} />
        <circle className="fvo-fly fvo-f2" cx="210" cy="258" r="1.5" fill="#2dffc4" style={{ filter: 'drop-shadow(0 0 4px #2dffc4)' }} />
        <circle className="fvo-fly fvo-f3" cx="172" cy="300" r="1.4" fill="#ff4fd8" style={{ filter: 'drop-shadow(0 0 4px #ff4fd8)' }} />
        <circle className="fvo-fly fvo-f4" cx="248" cy="318" r="1.6" fill="#d8ff6a" style={{ filter: 'drop-shadow(0 0 4px #d8ff6a)' }} />
        <circle className="fvo-fly fvo-f5" cx="30" cy="290" r="1.4" fill="#4fd8ff" style={{ filter: 'drop-shadow(0 0 4px #4fd8ff)' }} />
        <circle className="fvo-fly fvo-f2" style={{ animationDelay: '-6s, -1.8s', filter: 'drop-shadow(0 0 4px #d8ff6a)' }} cx="140" cy="264" r="1.3" fill="#d8ff6a" />
        <circle className="fvo-fly fvo-f3" style={{ animationDelay: '-2.4s, -1.1s', filter: 'drop-shadow(0 0 4px #ff8fe4)' }} cx="356" cy="304" r="1.4" fill="#ff8fe4" />
      </g>

      {/* niebla de páramo */}
      <g>
        <ellipse className="fvo-fog" cx="90" cy="250" rx="120" ry="16" fill="#9fd4ff" opacity=".07" filter="url(#fvo-blur8)" />
        <ellipse className="fvo-fog fvo-g2" cx="270" cy="240" rx="140" ry="14" fill="#b28dff" opacity=".06" filter="url(#fvo-blur8)" />
        <ellipse className="fvo-fog fvo-g3" cx="180" cy="262" rx="150" ry="12" fill="#eafff6" opacity=".05" filter="url(#fvo-blur8)" />
      </g>

      {/* ============ CORTE DE SUELO: LA RED VIVA ============ */}
      <rect y="336" width="390" height="150" fill="url(#fvo-suelo)" />
      {/* borde del suelo: interfase viva */}
      <path d="M0,336 L390,336" stroke="#2dffc4" strokeWidth="1.4" opacity=".55" />
      <path d="M0,338.5 L390,338.5" stroke="#ff4fd8" strokeWidth=".7" opacity=".25" />

      {/* piedras */}
      <ellipse cx="60" cy="392" rx="13" ry="8" fill="#0d1226" />
      <ellipse cx="330" cy="380" rx="10" ry="6.5" fill="#0d1226" />
      <ellipse cx="140" cy="440" rx="15" ry="9" fill="#0b0f20" />
      <ellipse cx="285" cy="448" rx="11" ry="7" fill="#0b0f20" />

      <g className="fvo-net">
        {/* hifas principales (desde el corazón) */}
        <g fill="none" stroke="#2dffc4" strokeWidth="1.5" opacity=".8" style={{ filter: 'drop-shadow(0 0 3px rgba(45,255,196,.5))' }}>
          <path className="fvo-hypha" d="M195,405 C160,392 120,380 78,352" />
          <path className="fvo-hypha fvo-slow" d="M195,405 C230,388 268,375 300,350" />
          <path className="fvo-hypha" d="M195,405 C185,378 172,360 150,344" />
          <path className="fvo-hypha fvo-slow fvo-rev" d="M195,405 C205,382 220,362 240,348" />
          <path className="fvo-hypha fvo-rev" d="M195,405 C240,420 300,432 368,424" />
          <path className="fvo-hypha fvo-slow" d="M195,405 C150,428 90,440 24,430" />
          <path className="fvo-hypha" d="M195,405 C196,432 190,455 178,474" />
        </g>
        {/* hifas secundarias */}
        <g fill="none" stroke="#4fd8ff" strokeWidth=".9" opacity=".5">
          <path className="fvo-hypha fvo-slow" d="M78,352 C60,348 45,342 38,338" />
          <path className="fvo-hypha fvo-slow fvo-rev" d="M78,352 C86,346 100,342 116,340" />
          <path className="fvo-hypha fvo-slow" d="M300,350 C315,344 330,340 344,338" />
          <path className="fvo-hypha fvo-slow fvo-rev" d="M300,350 C290,344 278,341 264,339" />
          <path className="fvo-hypha fvo-slow" d="M240,348 C246,344 252,341 258,339" />
          <path className="fvo-hypha fvo-slow fvo-rev" d="M150,344 C140,341 130,339 120,338" />
          <path className="fvo-hypha fvo-slow" d="M368,424 C376,418 382,410 386,400" />
          <path className="fvo-hypha fvo-slow fvo-rev" d="M24,430 C18,422 14,412 12,402" />
        </g>
        {/* hifas profundas magenta */}
        <g fill="none" stroke="#ff4fd8" strokeWidth=".8" opacity=".4">
          <path className="fvo-hypha fvo-slow fvo-rev" d="M178,474 C150,468 120,466 92,470" />
          <path className="fvo-hypha fvo-slow" d="M178,474 C210,468 250,466 286,470" />
          <path className="fvo-hypha fvo-slow" d="M195,440 C160,450 130,452 104,448" />
          <path className="fvo-hypha fvo-slow fvo-rev" d="M195,440 C235,450 270,452 300,446" />
        </g>

        {/* micelio FINO: la trama dendrítica de verdad — hifas delgadas que se
            ramifican en Y desde las troncales y tejen el suelo entero (así se
            ve una red micorrízica real, no solo cables gruesos) */}
        <g className="fvo-micelio" fill="none" stroke="#2dffc4" strokeWidth=".6" opacity=".38" strokeLinecap="round">
          <path d="M160,392 C150,388 142,382 138,374 M138,374 C134,368 128,364 120,362 M138,374 C142,366 140,358 136,352" />
          <path d="M230,390 C242,384 250,376 254,366 M254,366 C258,358 266,354 274,352 M254,366 C250,356 252,348 258,342" />
          <path d="M195,428 C186,434 176,438 164,440 M164,440 C154,442 146,448 142,456 M164,440 C160,448 162,456 168,462" />
          <path d="M195,428 C206,434 216,438 228,440 M228,440 C240,442 248,448 252,456 M228,440 C234,448 232,456 226,462" />
          <path d="M120,404 C108,400 98,400 88,404 M88,404 C78,408 70,406 62,400 M88,404 C84,412 78,416 70,418" />
          <path d="M270,406 C282,402 292,402 302,406 M302,406 C312,410 320,408 328,402 M302,406 C306,414 312,418 320,420" />
          <path d="M78,352 C74,362 68,370 60,376 M60,376 C54,380 50,386 48,394" />
          <path d="M300,350 C304,360 310,368 318,374 M318,374 C324,378 328,384 330,392" />
          <path d="M156,350 C152,358 146,364 138,368 M138,368 C132,371 128,376 126,382" />
          <path d="M240,348 C244,356 250,362 258,366 M258,366 C264,369 268,374 270,380" />
          <path d="M40,348 C38,358 34,366 28,372" />
          <path d="M118,349 C120,358 124,366 130,372" />
        </g>

        {/* bulbos de raíz (bajo cada planta) */}
        <g>
          <circle cx="40" cy="348" r="9" fill="url(#fvo-bulbo)" /><circle cx="40" cy="348" r="2.2" fill="#bfffe9" />
          <circle cx="78" cy="352" r="10" fill="url(#fvo-bulbo)" /><circle cx="78" cy="352" r="2.4" fill="#bfffe9" />
          <circle cx="118" cy="349" r="9" fill="url(#fvo-bulbo)" /><circle cx="118" cy="349" r="2.2" fill="#bfffe9" />
          <circle cx="156" cy="350" r="8" fill="url(#fvo-bulbo)" /><circle cx="156" cy="350" r="2" fill="#bfffe9" />
          <circle cx="240" cy="348" r="8" fill="url(#fvo-bulbo)" /><circle cx="240" cy="348" r="2" fill="#bfffe9" />
          <circle cx="300" cy="350" r="11" fill="url(#fvo-bulbo)" /><circle cx="300" cy="350" r="2.6" fill="#bfffe9" />
        </g>
        {/* raíces cortas planta→bulbo */}
        <g stroke="#2dffc4" strokeWidth="1" opacity=".55" fill="none">
          <path d="M40,336 L40,346" /><path d="M78,338 L78,350" /><path d="M118,337 L118,347" />
          <path d="M156,338 L156,348" /><path d="M210,336 C214,340 222,344 240,347" />
          <path d="M298,332 C298,338 299,344 300,348" />
        </g>
        {/* raíces LATERALES de cada planta: el bulbo no flota — la raíz se
            ramifica y la hifa la encuentra en la punta (micorriza real) */}
        <g stroke="#9dff3f" strokeWidth=".8" opacity=".5" fill="none" strokeLinecap="round">
          <path d="M40,346 C36,352 32,356 26,358 M40,346 C44,352 48,355 54,356" />
          <path d="M78,350 C72,356 66,360 58,362 M78,350 C84,356 90,359 98,360" />
          <path d="M118,347 C112,353 106,357 98,359 M118,347 C124,353 130,356 138,357" />
          <path d="M156,348 C151,354 146,357 140,359 M156,348 C161,354 166,357 172,358" />
          <path d="M240,347 C235,353 230,356 224,358 M240,347 C245,353 250,356 256,357" />
          <path d="M300,348 C294,355 287,359 278,361 M300,348 C306,355 313,359 322,361" />
        </g>
        {/* nodos micorrízicos: el punto donde la hifa abraza la punta de la
            raíz e intercambia azúcar por nutrientes (titilan suave) */}
        <g fill="#bfffe9">
          <circle className="fvo-nodo" cx="26" cy="358" r="1" />
          <circle className="fvo-nodo fvo-n2" cx="58" cy="362" r="1.1" />
          <circle className="fvo-nodo fvo-n3" cx="98" cy="359.5" r="1" />
          <circle className="fvo-nodo" cx="140" cy="359" r="1" />
          <circle className="fvo-nodo fvo-n2" cx="224" cy="358" r="1" />
          <circle className="fvo-nodo fvo-n3" cx="278" cy="361" r="1.1" />
          <circle className="fvo-nodo fvo-n2" cx="322" cy="361" r="1.1" />
        </g>
      </g>

      {/* ============ LA VIDA DEL SUELO: lombrices y bichitos ============ */}
      {/* lombriz de tierra (rosada, segmentada, con clitelo) que avanza */}
      <g className="fvo-lombriz">
        <path d="M96,432 C104,428 112,432 118,428 C124,424 130,427 134,432" fill="none" stroke="#ff8fb0" strokeWidth="3.4" strokeLinecap="round" opacity=".85" />
        <path d="M96,432 C104,428 112,432 118,428 C124,424 130,427 134,432" fill="none" stroke="#ffd0dc" strokeWidth="1" strokeLinecap="round" opacity=".5" />
        {/* segmentos */}
        <g stroke="#e06a8e" strokeWidth=".7" opacity=".6">
          <path d="M102,428.6 L102.6,431.6" /><path d="M108,429 L108,432" /><path d="M122,426.4 L122.6,429.2" /><path d="M128,426.6 L128,429.6" />
        </g>
        {/* clitelo (el anillo grueso) */}
        <path d="M112,430.4 L116,429" stroke="#ff6f8a" strokeWidth="3.8" strokeLinecap="round" />
      </g>
      <g className="fvo-lombriz fvo-l2">
        <path d="M330,472 C324,468 318,471 312,468 C306,465 300,468 296,472" fill="none" stroke="#ff8fb0" strokeWidth="3" strokeLinecap="round" opacity=".8" />
        <path d="M314,469.4 L310,468.4" stroke="#ff6f8a" strokeWidth="3.4" strokeLinecap="round" />
        <g stroke="#e06a8e" strokeWidth=".6" opacity=".55">
          <path d="M324,469 L324,471.6" /><path d="M304,467 L304,469.6" />
        </g>
      </g>

      {/* escarabajo del suelo (camina despacio entre las piedras) */}
      <g className="fvo-bicho">
        <ellipse cx="66" cy="416" rx="3.4" ry="2.3" fill="#4fd8ff" opacity=".75" />
        <circle cx="70" cy="415.4" r="1.3" fill="#2f9fc4" />
        <path d="M63,414.6 Q66,413.2 69,414.4" stroke="#bfeaff" strokeWidth=".5" fill="none" opacity=".7" />
        <g stroke="#4fd8ff" strokeWidth=".6" opacity=".7" fill="none">
          <path d="M64,418 L62,420" /><path d="M66,418.4 L65,421" /><path d="M68,418 L69,420.6" />
        </g>
      </g>
      {/* colémbolo (bichito saltarín, descompone la hojarasca) */}
      <g className="fvo-bicho fvo-bi2">
        <ellipse cx="330" cy="446" rx="2.6" ry="1.7" fill="#d8ff6a" opacity=".8" />
        <circle cx="332.6" cy="445.4" r=".9" fill="#9dff3f" />
        <path d="M327.6,445.4 Q326,444 325.2,442.6" stroke="#d8ff6a" strokeWidth=".7" fill="none" opacity=".8" />
      </g>

      {/* ============ CORAZÓN-SEMILLA MICORRÍZICO (la vida bajo la tierra) ============
          Con `onPregunte` el corazón entero es un BOTÓN (tap / Enter / Espacio)
          que abre el agente — el mismo patrón del potrero→animales: la metáfora
          central deja de ser decoración y pasa a ser LA acción de preguntar.
          Sin handler queda como arte (aria-hidden, sin foco). */}
      <g
        className={`fvo-corazon-grupo${conPregunte ? ' fvo-corazon-tap' : ''}`}
        data-testid="fvo-corazon"
        {...(conPregunte
          ? {
              role: 'button',
              tabIndex: 0,
              'aria-label': 'El corazón de su finca: toque y pregúntele a Chagra con su voz.',
              onClick: () => onPregunte(),
              onKeyDown: (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onPregunte();
                }
              },
            }
          : { 'aria-hidden': true })}
      >
      {/* cámara de suelo: da contexto y contraste al órgano */}
      <ellipse cx="195" cy="406" rx="42" ry="36" fill="#02040c" opacity=".55" />
      <ellipse cx="195" cy="406" rx="42" ry="36" fill="none" stroke="#0f3a30" strokeWidth="1" opacity=".55" />
      {/* halo-invitación del tap (solo cuando el corazón es botón) */}
      {conPregunte && (
        <circle className="fvo-corazon-halo" cx="195" cy="406" r="32" fill="none" stroke="#2dffc4" strokeWidth="1.2" opacity=".5" />
      )}
      {/* ondas de latido */}
      <circle className="fvo-heart-wave" cx="195" cy="406" r="24" fill="none" stroke="#2dffc4" strokeWidth="1.6" />
      <circle className="fvo-heart-wave" style={{ animationDelay: '.6s' }} cx="195" cy="406" r="24" fill="none" stroke="#ff4fd8" strokeWidth="1" />
      {/* resplandor contenido */}
      <circle className="fvo-heart" cx="195" cy="406" r="15" fill="url(#fvo-corazon)" />

      {/* cuellos de raíz gruesos: las micorrizas nacen visiblemente de la semilla */}
      <g className="fvo-net" stroke="#2dffc4" strokeLinecap="round" fill="none" style={{ filter: 'drop-shadow(0 0 4px rgba(45,255,196,.6))' }}>
        <path strokeWidth="3" d="M195,406 L182,399" />
        <path strokeWidth="3" d="M195,406 L208,399" />
        <path strokeWidth="2.6" d="M195,406 L187,395" />
        <path strokeWidth="2.6" d="M195,406 L204,395" />
        <path strokeWidth="2.6" d="M195,406 L210,407" />
        <path strokeWidth="2.6" d="M195,406 L180,408" />
        <path strokeWidth="2.6" d="M195,406 L192,420" />
      </g>

      {/* SEMILLA que germina: forma reconocible = origen de la vida */}
      {/* radícula (taproot) hacia abajo */}
      <path d="M195,423 C195,431 193,437 189,443" stroke="#2dffc4" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity=".85" style={{ filter: 'drop-shadow(0 0 3px #2dffc4)' }} />
      <path d="M195,428 C197,431 200,432 203,432" stroke="#2dffc4" strokeWidth="1" fill="none" strokeLinecap="round" opacity=".7" />
      {/* brote hacia la superficie */}
      <path d="M195,390 C195,383 193,379 189,376" stroke="#9dff3f" strokeWidth="1.7" fill="none" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 3px #9dff3f)' }} />
      <path d="M195,384 C198,381 201,380 204,381" stroke="#9dff3f" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <circle cx="188.6" cy="375.6" r="1.5" fill="#d8ff6a" style={{ filter: 'drop-shadow(0 0 3px #9dff3f)' }} />
      <circle cx="204.3" cy="380.6" r="1.3" fill="#d8ff6a" style={{ filter: 'drop-shadow(0 0 3px #9dff3f)' }} />
      {/* cuerpo de la semilla (late) */}
      <g className="fvo-heart">
        <path d="M195,390 C206,396 206,416 195,424 C184,416 184,396 195,390 Z" fill="#0e5a44" stroke="#2dffc4" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 0 6px rgba(45,255,196,.55))' }} />
        <path d="M195,392 L195,422" stroke="#2dffc4" strokeWidth=".8" opacity=".55" />
        <circle cx="195" cy="407" r="9.5" fill="#bfffe9" opacity=".3" />
        <circle cx="195" cy="407" r="5.2" fill="#eafff6" />
        <circle cx="195" cy="407" r="2.2" fill="#ff8fe4" />
      </g>
      {/* cierre del grupo tappable del corazón (la etiqueta va aparte, abajo) */}
      </g>

      {/* nutrientes viajando */}
      <circle className="fvo-spark fvo-p1" r="2.2" fill="#bfffe9" />
      <circle className="fvo-spark fvo-p2" r="2.2" fill="#bfffe9" />
      <circle className="fvo-spark fvo-p3" r="1.9" fill="#d8ff6a" />
      <circle className="fvo-spark fvo-p4" r="1.9" fill="#ffb54f" />
      <circle className="fvo-spark fvo-p5" r="1.9" fill="#ff9ee8" />
      <circle className="fvo-spark fvo-p6" r="2.2" fill="#bfffe9" />

      {/* el pocito se FILTRA: el agua alimenta la red micorrízica (gotea al
          bulbo más cercano — la quebrada también es parte del organismo) */}
      <g aria-hidden="true">
        <path className="fvo-hypha fvo-slow" d="M20,336 C26,342 32,346 38,348" fill="none" stroke="#4fd8ff" strokeWidth=".9" opacity=".5" />
        <g stroke="#4fd8ff" strokeWidth=".8" strokeLinecap="round" opacity=".35">
          <path d="M10,338 L9,344" /><path d="M18,339 L17.4,346" /><path d="M27,338 L26.4,343" />
        </g>
      </g>

      {/* hongos bioluminiscentes en el borde del corte */}
      <g>
        <g transform="translate(58,336)">
          <path d="M0,0 L0,-7" stroke="#9fd4ff" strokeWidth="2" strokeLinecap="round" opacity=".8" />
          <path className="fvo-cap" d="M-7,-6 A7,4.6 0 0 1 7,-6 Z" fill="#4fd8ff" style={{ filter: 'drop-shadow(0 0 6px #4fd8ff)' }} />
          <path d="M4,0 L4,-5" stroke="#9fd4ff" strokeWidth="1.6" strokeLinecap="round" opacity=".7" />
          <path className="fvo-cap fvo-c2" d="M-.5,-4.4 A4.5,3 0 0 1 8.5,-4.4 Z" fill="#b28dff" style={{ filter: 'drop-shadow(0 0 5px #b28dff)' }} />
          <circle className="fvo-spore" cx="0" cy="-10" r="1" fill="#bfeaff" />
          <circle className="fvo-spore fvo-sp2" cx="4" cy="-9" r=".8" fill="#dcc9ff" />
          <circle className="fvo-spore fvo-sp3" cx="-3" cy="-9" r=".8" fill="#bfeaff" />
        </g>
        <g transform="translate(356,336)">
          <path d="M0,0 L0,-8" stroke="#ff9ee8" strokeWidth="2" strokeLinecap="round" opacity=".8" />
          <path className="fvo-cap fvo-c2" d="M-8,-7 A8,5 0 0 1 8,-7 Z" fill="#ff4fd8" style={{ filter: 'drop-shadow(0 0 6px #ff4fd8)' }} />
          <path d="M-5,0 L-5,-5" stroke="#ff9ee8" strokeWidth="1.5" strokeLinecap="round" opacity=".7" />
          <path className="fvo-cap" d="M-9,-4.4 A4.4,3 0 0 1 -.6,-4.4 Z" fill="#ffb54f" style={{ filter: 'drop-shadow(0 0 5px #ffb54f)' }} />
          <circle className="fvo-spore fvo-sp2" cx="0" cy="-11" r="1" fill="#ffd9f4" />
          <circle className="fvo-spore" cx="-5" cy="-9" r=".8" fill="#ffe6c9" />
          <circle className="fvo-spore fvo-sp3" cx="3" cy="-10" r=".8" fill="#ffd9f4" />
        </g>
      </g>

      {/* etiqueta viva — con el corazón tappable invita a la acción (y deja
          la jerga de laboratorio: "micorrízica" no es palabra del campo) */}
      <g fontFamily="ui-monospace,monospace" fontSize="7.5" letterSpacing="2" opacity=".65" aria-hidden="true">
        <text x="195" y="452" fill="#2dffc4" textAnchor="middle">CORAZÓN DE LA FINCA · VIVO</text>
        <text x="195" y="464" fill="#5b7f93" textAnchor="middle" letterSpacing="1">
          {conPregunte ? 'toque el corazón y pregúntele a Chagra' : 'las raíces de su finca están conectadas'}
        </text>
      </g>
    </svg>
  );
}

/**
 * GallinaLuz — gallina criolla bioluminiscente del potrero. Picotea con el
 * ritmo de su clase (`fvo-gallina` + variante) — la animación vive en
 * scene-finca-organismo.css. Coordenadas locales: el (0,0) es el piso bajo
 * el cuerpo; mira a la DERECHA salvo `espejo` (que también invierte el
 * sentido del picoteo vía la clase `fvo-ga-esp`).
 *
 * @param {Object} props
 * @param {number} props.x posición (viewBox) del piso bajo la gallina.
 * @param {number} props.y ídem.
 * @param {string} props.cuerpo color del plumaje.
 * @param {string} props.cola color de la cola/ala (más oscuro).
 * @param {string} [props.clase] variante de ritmo (fvo-ga2 / fvo-ga3).
 * @param {boolean} [props.espejo] mirar a la izquierda.
 */
function GallinaLuz({ x, y, cuerpo, cola, clase = '', espejo = false }) {
  return (
    /* el translate vive en su PROPIO <g>: la animación CSS (transform) del
       picoteo PISARÍA el atributo transform si compartieran elemento y la
       gallina se iría al origen del SVG (bug real de la 1.ª pasada). */
    <g transform={`translate(${x},${y})`} aria-hidden="true">
      <ellipse cx="0" cy=".6" rx="4.2" ry="1" fill="#000" opacity=".3" />
      <g className={`fvo-gallina ${clase}${espejo ? ' fvo-ga-esp' : ''}`.trim()}>
        <g transform={espejo ? 'scale(-1,1)' : undefined}>
          {/* patas */}
          <g stroke="#d8ff6a" strokeWidth=".9" strokeLinecap="round" opacity=".9">
            <path d="M-1.2,-2.2 L-1.4,0" /><path d="M1.4,-2.2 L1.6,0" />
          </g>
          {/* cola */}
          <path d="M-4.2,-6.5 Q-7.6,-9.5 -6.6,-12 Q-3.6,-10 -3.2,-7 Z" fill={cola} />
          {/* cuerpo */}
          <path
            d="M-4.8,-5.5 C-4.6,-8.6 -1.6,-10.2 1.2,-9.6 C4.4,-9 5.6,-6.4 4.4,-4 C3.2,-1.8 -1.2,-1.4 -3.4,-3 C-4.4,-3.8 -4.9,-4.5 -4.8,-5.5 Z"
            fill={cuerpo}
            stroke="#eafff6"
            strokeWidth=".4"
            strokeOpacity=".3"
          />
          {/* ala */}
          <path d="M-2.8,-6 Q-.4,-8 2,-6.2 Q-.2,-4.6 -2.8,-6 Z" fill={cola} opacity=".85" />
          {/* cabeza con cresta neón */}
          <circle cx="4.6" cy="-10.6" r="2.2" fill={cuerpo} />
          <path d="M3.6,-12.6 Q3.9,-14.4 5.2,-14 Q5.6,-12.6 4.9,-12.2 Z" fill="#ff4fd8" style={{ filter: 'drop-shadow(0 0 2px #ff4fd8)' }} />
          <path d="M6.7,-10.8 L9,-10 L6.7,-9.4 Z" fill="#ffd76a" />
          <circle cx="5.9" cy="-9" r=".7" fill="#ff4fd8" opacity=".8" />
          <circle cx="5.2" cy="-11" r=".55" fill="#0a0618" />
          <circle cx="5.4" cy="-11.2" r=".2" fill="#eafff6" />
        </g>
      </g>
    </g>
  );
}
