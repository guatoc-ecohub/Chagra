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
 *
 * Solo se monta con el tema biopunk (lo decide FincaVivaHero); los demás
 * temas conservan sus escenas isométricas intactas. Las clases/ids llevan
 * prefijo `fvo-` para no chocar con el resto del hero. Sus animaciones viven
 * en scene-finca-organismo.css y respetan prefers-reduced-motion con un
 * estado estático digno (misma receta que el mockup).
 *
 * @param {Object} props
 * @param {{tiene:boolean, forma:?string}} [props.estructura] estructura de
 *   cubierta declarada en el perfil (#34): si el usuario declaró invernadero,
 *   el invernadero-célula de la escena lleva el data-testid/data-forma del
 *   contrato de FincaVivaHero.estructura.test.jsx (misma semántica que
 *   SceneFinca: el marcador aparece SOLO si la estructura está declarada).
 */
export default function SceneFincaOrganismo({ estructura }) {
  const conEstructura = !!estructura?.tiene;
  return (
    <svg
      className="fvo-svg"
      viewBox="0 0 390 486"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Su finca de noche convertida en organismo bioluminiscente: un corazón-semilla late bajo la tierra y su red de micorrizas alimenta cada planta; cultivos con savia de neón, invernadero-célula que respira, campesino con su perro y colibrí de luz."
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
        <filter id="fvo-blur8"><feGaussianBlur stdDeviation="8" /></filter>
        <filter id="fvo-blur3"><feGaussianBlur stdDeviation="3" /></filter>
        <filter id="fvo-glow1" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ============ CIELO ============ */}
      <rect width="390" height="486" fill="url(#fvo-cielo)" />

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

      {/* luna bioluminiscente */}
      <g>
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

      {/* ============ MONTAÑAS ============ */}
      <path d="M0,206 C60,176 122,196 190,180 C258,166 322,192 390,174 L390,262 L0,262 Z" fill="#0a1734" />
      <path d="M0,234 C70,208 150,228 232,212 C302,200 352,220 390,208 L390,282 L0,282 Z" fill="#0d1e40" />

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

        {/* cocuyos */}
        <circle className="fvo-fly" cx="100" cy="272" r="1.7" fill="#d8ff6a" style={{ filter: 'drop-shadow(0 0 4px #d8ff6a)' }} />
        <circle className="fvo-fly fvo-f2" cx="210" cy="258" r="1.5" fill="#2dffc4" style={{ filter: 'drop-shadow(0 0 4px #2dffc4)' }} />
        <circle className="fvo-fly fvo-f3" cx="172" cy="300" r="1.4" fill="#ff4fd8" style={{ filter: 'drop-shadow(0 0 4px #ff4fd8)' }} />
        <circle className="fvo-fly fvo-f4" cx="248" cy="318" r="1.6" fill="#d8ff6a" style={{ filter: 'drop-shadow(0 0 4px #d8ff6a)' }} />
        <circle className="fvo-fly fvo-f5" cx="30" cy="290" r="1.4" fill="#4fd8ff" style={{ filter: 'drop-shadow(0 0 4px #4fd8ff)' }} />
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
      </g>

      {/* ============ CORAZÓN-SEMILLA MICORRÍZICO (la vida bajo la tierra) ============ */}
      {/* cámara de suelo: da contexto y contraste al órgano */}
      <ellipse cx="195" cy="406" rx="42" ry="36" fill="#02040c" opacity=".55" />
      <ellipse cx="195" cy="406" rx="42" ry="36" fill="none" stroke="#0f3a30" strokeWidth="1" opacity=".55" />
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

      {/* nutrientes viajando */}
      <circle className="fvo-spark fvo-p1" r="2.2" fill="#bfffe9" />
      <circle className="fvo-spark fvo-p2" r="2.2" fill="#bfffe9" />
      <circle className="fvo-spark fvo-p3" r="1.9" fill="#d8ff6a" />
      <circle className="fvo-spark fvo-p4" r="1.9" fill="#ffb54f" />
      <circle className="fvo-spark fvo-p5" r="1.9" fill="#ff9ee8" />
      <circle className="fvo-spark fvo-p6" r="2.2" fill="#bfffe9" />

      {/* hongos bioluminiscentes en el borde del corte */}
      <g>
        <g transform="translate(22,336)">
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

      {/* etiqueta viva */}
      <g fontFamily="ui-monospace,monospace" fontSize="7.5" letterSpacing="2" opacity=".65">
        <text x="195" y="452" fill="#2dffc4" textAnchor="middle">CORAZÓN DE LA FINCA · VIVO</text>
        <text x="195" y="464" fill="#5b7f93" textAnchor="middle" letterSpacing="1">la red micorrízica conecta cada planta</text>
      </g>
    </svg>
  );
}
