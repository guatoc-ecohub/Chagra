import React from 'react';

/**
 * LaminaCafeto — la lámina insignia del mundo "El café".
 *
 * SVG propio (nada de stock, nada rasterizado, sin dependencias) al estilo
 * BOTÁNICO DE CUADERNO DE CAMPO: una "hoja de papel" color crema, con tinta
 * sepia y verde, que dibuja la mata de café (Coffea arabica) y rotula sus
 * partes en español campesino —
 *
 *   raíz · tallo (tronco) · rama · hoja · flor · cereza (madura / verde)
 *
 * y, en un recuadro "por dentro de la cereza", el corte que muestra la pulpa,
 * el pergamino y el grano (la almendra) — los mismos términos que usa el
 * mundo del beneficio (despulpado → pulpa; el grano seco = café pergamino;
 * trillado = almendra).
 *
 * A diferencia de las láminas decorativas de Tubérculos, esta LLEVA rótulos
 * con significado: por eso es role="img" con <title>/<desc> (accesible) en vez
 * de aria-hidden. Va pensada para abrir la estación "Variedad y siembra" del
 * mundo del café: la mata entera antes de contar su ciclo.
 *
 * Paleta FIJA (papel crema + tinta sepia/verde): es un pliego de cuaderno
 * prendido dentro del mundo oscuro del café, así que conserva su aire de papel
 * en todos los temas a propósito. Estática, GPU-nula, sin animación.
 *
 * Grounded (Cenicafé / FNC · catálogo species.coffea_arabica):
 *   - arbusto de la familia Rubiaceae, hojas OPUESTAS, brillantes, acuminadas;
 *   - flor blanca de 5 pétalos, en racimos (glomérulos) en las axilas;
 *   - fruto en drupa ("la cereza"): verde -> rojo al madurar;
 *   - por dentro, casi siempre 2 granos cara a cara, cada uno envuelto en el
 *     pergamino (endocarpo); alrededor la pulpa (mesocarpo) y la baba (mucílago).
 */

/** Una hoja de café: elíptica, acuminada, con nervadura. Base en (0,0),
 *  la punta sale a `len` en el eje X y el grupo se rota con `rot` grados. */
function Hoja({ x, y, rot = 0, len = 30 }) {
  const w = len * 0.34;
  const cuerpo = `M0 0 Q ${0.34 * len} ${-w} ${len} 0 Q ${0.34 * len} ${w} 0 0 Z`;
  const nervios = [0.32, 0.5, 0.68].flatMap((i) => [
    `M${i * len} 0 Q ${i * len + 7} ${-w * 0.45} ${i * len + 0.14 * len} ${-w * 0.62}`,
    `M${i * len} 0 Q ${i * len + 7} ${w * 0.45} ${i * len + 0.14 * len} ${w * 0.62}`,
  ]);
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d={cuerpo} fill="#5c7a3f" stroke="#39531f" strokeWidth="1.1" strokeLinejoin="round" />
      {/* medio brillo de la lámina glossy */}
      <path d={`M0 0 Q ${0.34 * len} ${-w * 0.9} ${len} 0`} fill="none" stroke="#7f9d57" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      {/* nervadura */}
      <path d={`M0 0 L ${len} 0`} fill="none" stroke="#39531f" strokeWidth="0.9" strokeLinecap="round" />
      {nervios.map((d, k) => (
        <path key={k} d={d} fill="none" stroke="#3f5b25" strokeWidth="0.6" opacity="0.8" />
      ))}
    </g>
  );
}

/** Un botón de flor a escala de la mata (el detalle grande va en el recuadro). */
function Flor({ x, y, r = 3.6 }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="0" cy={-r} rx={r * 0.6} ry={r} transform={`rotate(${a})`} fill="#fbf6e8" stroke="#d7c592" strokeWidth="0.5" />
      ))}
      <circle cx="0" cy="0" r={r * 0.42} fill="#e7c24a" />
    </g>
  );
}

/** Una cereza de café (drupa). `verde`=true la pinta sin madurar. */
function Cereza({ x, y, r = 5, verde = false }) {
  const relleno = verde ? '#93a84f' : '#b8402f';
  const borde = verde ? '#6c8236' : '#8f2f22';
  const brillo = verde ? '#c3d488' : '#e29079';
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="0" cy="0" r={r} fill={relleno} stroke={borde} strokeWidth="0.9" />
      <ellipse cx={-r * 0.34} cy={-r * 0.36} rx={r * 0.34} ry={r * 0.24} fill={brillo} opacity="0.85" />
      {/* corona / ombligo del cáliz */}
      <circle cx="0" cy={-r * 0.92} r="0.9" fill={borde} />
    </g>
  );
}

/** Rótulo con guía: una línea fina sepia con puntico en la parte señalada. */
function Rotulo({ tx, ty, anchor = 'start', texto, nota, guia }) {
  return (
    <g>
      {guia && <path d={guia.d} fill="none" stroke="#9a8355" strokeWidth="0.9" />}
      {guia && <circle cx={guia.px} cy={guia.py} r="1.6" fill="#7a6540" />}
      <text x={tx} y={ty} textAnchor={anchor} fontSize="11" fontWeight="700" fill="#4f3a20" letterSpacing="0.02em">
        {texto}
      </text>
      {nota && (
        <text x={tx} y={ty + 11} textAnchor={anchor} fontSize="8.5" fontStyle="italic" fill="#8a7350">
          {nota}
        </text>
      )}
    </g>
  );
}

export default function LaminaCafeto() {
  return (
    <svg
      viewBox="0 0 420 300"
      role="img"
      aria-labelledby="lamcaf-t lamcaf-d"
      className="w-full h-auto select-none"
      data-testid="lamina-cafeto"
      style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
    >
      <title id="lamcaf-t">La mata de café (Coffea arabica) con sus partes rotuladas</title>
      <desc id="lamcaf-d">
        Lámina de cuaderno de campo: un cafeto dibujado a mano en tinta sepia y verde con la raíz,
        el tallo o tronco, las ramas, las hojas opuestas y brillantes, la flor blanca de cinco pétalos
        y las cerezas verdes y maduras. Un recuadro muestra el corte de la cereza por dentro: la pulpa,
        el pergamino y el grano o almendra.
      </desc>

      {/* -- el pliego de papel del cuaderno -- */}
      <rect x="2" y="2" width="416" height="296" rx="10" fill="#f4ead2" stroke="#d8c39a" strokeWidth="2" />
      <rect x="8" y="8" width="404" height="284" rx="7" fill="none" stroke="#e0d0a8" strokeWidth="1" />
      {/* esquina doblada (abajo-derecha) */}
      <path d="M412 274 L392 292 L412 292 Z" fill="#e6d6ae" stroke="#d0bb8a" strokeWidth="0.8" />

      {/* -- encabezado -- */}
      <text x="16" y="24" fontSize="17" fontWeight="800" fill="#3f2d17">El cafeto</text>
      <text x="97" y="24" fontSize="12.5" fontStyle="italic" fill="#6b4f2f" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
        Coffea arabica
      </text>
      <text x="404" y="16" textAnchor="end" fontSize="9" fontStyle="italic" fill="#9a8355">cuaderno de campo</text>
      <text x="404" y="27" textAnchor="end" fontSize="9" fill="#8a7350">Fam. Rubiaceae</text>
      <line x1="14" y1="32" x2="406" y2="32" stroke="#d8c39a" strokeWidth="1" />

      {/* -----------------  LA MATA  ----------------- */}

      {/* línea del suelo */}
      <line x1="56" y1="234" x2="248" y2="234" stroke="#9a8355" strokeWidth="1.3" strokeDasharray="5 4" strokeLinecap="round" />

      {/* raíz: pivotante + raicillas, bajo el suelo */}
      <g stroke="#7a5836" fill="none" strokeLinecap="round">
        <path d="M150 234 C 151 252 149 266 150 288" strokeWidth="3.4" />
        <path d="M150 240 C 138 246 130 256 120 264" strokeWidth="2" />
        <path d="M150 244 C 162 250 172 258 182 266" strokeWidth="2" />
        <path d="M150 236 C 140 240 132 244 124 250" strokeWidth="1.5" />
        <path d="M150 238 C 160 242 168 246 176 252" strokeWidth="1.5" />
        <path d="M120 264 c -4 3 -6 5 -7 9 M182 266 c 4 3 6 5 7 9 M150 288 c -3 3 -4 5 -4 8" strokeWidth="1.1" />
      </g>

      {/* tallo / tronco leñoso */}
      <path d="M150 234 C 149 190 152 150 149 110 C 148 96 147 86 146 78" fill="none" stroke="#6b4a2a" strokeWidth="6" strokeLinecap="round" />
      <path d="M150 232 C 149 190 152 150 149 112 C 148 98 147 88 146 80" fill="none" stroke="#835d34" strokeWidth="2" strokeLinecap="round" opacity="0.7" />

      {/* ramas plagiotrópicas (3 pisos) */}
      <g fill="none" stroke="#6b4a2a" strokeWidth="3" strokeLinecap="round">
        <path d="M148 104 C 120 100 100 96 86 92" />
        <path d="M148 102 C 176 100 196 98 210 96" />
        <path d="M149 150 C 118 148 96 152 82 158" />
        <path d="M149 148 C 180 148 200 152 214 158" />
        <path d="M150 194 C 116 194 96 200 84 208" />
        <path d="M150 192 C 182 194 202 200 214 208" />
      </g>

      {/* hojas opuestas, brillantes */}
      <Hoja x={146} y={78} rot={248} len={22} />
      <Hoja x={146} y={78} rot={292} len={22} />
      <Hoja x={104} y={96} rot={202} len={30} />
      <Hoja x={112} y={90} rot={150} len={25} />
      <Hoja x={86} y={92} rot={186} len={28} />
      <Hoja x={100} y={152} rot={206} len={30} />
      <Hoja x={86} y={158} rot={185} len={27} />
      <Hoja x={102} y={200} rot={210} len={30} />
      <Hoja x={86} y={208} rot={190} len={26} />
      <Hoja x={204} y={152} rot={346} len={27} />
      <Hoja x={208} y={202} rot={350} len={27} />
      <Hoja x={206} y={96} rot={16} len={22} />

      {/* flores en racimo (rama alta derecha) */}
      <Flor x={170} y={102} />
      <Flor x={182} y={99} />
      <Flor x={194} y={98} />
      <Flor x={205} y={97} />
      <Flor x={200} y={105} />

      {/* cerezas (rama media y baja derecha): maduras rojas + un par verdes */}
      <Cereza x={186} y={150} />
      <Cereza x={194} y={146} />
      <Cereza x={202} y={153} verde />
      <Cereza x={210} y={158} />
      <Cereza x={176} y={155} verde />
      <Cereza x={188} y={196} />
      <Cereza x={199} y={201} />
      <Cereza x={209} y={206} />

      {/* -- conector: el detalle de la flor "es" esa flor de la mata -- */}
      <path d="M322 60 C 288 74 250 88 210 96" fill="none" stroke="#b9a06a" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.8" />

      {/* -- rótulos de la mata -- */}
      <Rotulo texto="hoja" nota="opuestas, brillantes" tx="12" ty="150"
        guia={{ d: 'M40 150 C 60 150 78 152 92 152', px: 92, py: 152 }} />
      <Rotulo texto="rama" tx="12" ty="196"
        guia={{ d: 'M40 196 C 62 196 78 198 96 199', px: 96, py: 199 }} />
      <Rotulo texto="tallo" nota="(tronco)" tx="12" ty="248"
        guia={{ d: 'M40 246 C 80 244 116 224 148 210', px: 148, py: 210 }} />
      <Rotulo texto="raíz" nota="pivotante + raicillas" tx="12" ty="278"
        guia={{ d: 'M40 276 C 80 278 112 274 149 268', px: 149, py: 268 }} />

      <Rotulo anchor="end" texto="cereza madura" nota="roja, lista pa' coger" tx="280" ty="140"
        guia={{ d: 'M232 140 C 222 142 216 146 210 152', px: 210, py: 152 }} />
      <Rotulo anchor="end" texto="cereza verde" nota="todavía biche" tx="280" ty="182"
        guia={{ d: 'M232 176 C 222 168 214 160 204 154', px: 204, py: 154 }} />

      {/* -----------  DETALLE 1 . la flor  ----------- */}
      <circle cx="348" cy="60" r="27" fill="#faf3e0" stroke="#c9b483" strokeWidth="1.2" />
      <g transform="translate(348 60)">
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="0" cy="-15" rx="6.5" ry="15" transform={`rotate(${a})`} fill="#fbf7ec" stroke="#d7c592" strokeWidth="0.8" />
        ))}
        <circle cx="0" cy="0" r="6" fill="#eaca57" />
        {[30, 100, 170, 240, 310].map((a) => (
          <circle key={a} cx={5 * Math.cos((a * Math.PI) / 180)} cy={5 * Math.sin((a * Math.PI) / 180)} r="1.1" fill="#b98d2f" />
        ))}
      </g>
      <text x="348" y="100" textAnchor="middle" fontSize="11" fontWeight="700" fill="#4f3a20">flor</text>
      <text x="348" y="110" textAnchor="middle" fontSize="8.5" fontStyle="italic" fill="#8a7350">blanca · 5 pétalos · huele dulce</text>

      {/* -----------  DETALLE 2 . por dentro de la cereza  ----------- */}
      <rect x="286" y="118" width="124" height="170" rx="8" fill="#efe3c6" stroke="#d5c193" strokeWidth="1" />
      <text x="348" y="134" textAnchor="middle" fontSize="10" fontWeight="800" fill="#5a3f22" letterSpacing="0.04em">POR DENTRO DE LA CEREZA</text>

      {/* corte de la cereza: pulpa -> pergamino -> grano */}
      <g transform="translate(340 205)">
        {/* pulpa (piel + mesocarpo) */}
        <circle cx="0" cy="0" r="40" fill="#bb4130" stroke="#8f2f22" strokeWidth="1.4" />
        <circle cx="0" cy="0" r="40" fill="none" stroke="#e08a79" strokeWidth="1" opacity="0.5" />
        {/* baba / mucílago: aro traslúcido */}
        <circle cx="0" cy="0" r="33" fill="#e7b48f" opacity="0.55" />
        {/* pergamino que envuelve los dos granos */}
        <circle cx="0" cy="0" r="30" fill="#eaddba" stroke="#cbb684" strokeWidth="1.1" />
        {/* dos granos cara a cara (almendra) */}
        <path d="M-2 -28 A 28 28 0 0 0 -2 28 Q -14 0 -2 -28 Z" fill="#cdb98a" stroke="#a08a5b" strokeWidth="1" />
        <path d="M2 -28 A 28 28 0 0 1 2 28 Q 14 0 2 -28 Z" fill="#c8b482" stroke="#a08a5b" strokeWidth="1" />
        {/* surco central de cada grano */}
        <path d="M-2 -22 Q -12 0 -2 22" fill="none" stroke="#9c855a" strokeWidth="1" />
        <path d="M2 -22 Q 12 0 2 22" fill="none" stroke="#9c855a" strokeWidth="1" />
      </g>

      {/* rótulos del corte */}
      <g stroke="#9a8355" strokeWidth="0.8" fill="none">
        <path d="M300 158 C 308 168 314 174 322 182" />
        <path d="M398 200 C 384 202 376 204 370 205" />
        <path d="M340 262 L340 240" />
      </g>
      <circle cx="322" cy="182" r="1.5" fill="#7a6540" />
      <circle cx="370" cy="205" r="1.5" fill="#7a6540" />
      <circle cx="340" cy="240" r="1.5" fill="#7a6540" />
      <text x="298" y="156" textAnchor="end" fontSize="9.5" fontWeight="700" fill="#7a2c1e">pulpa</text>
      <text x="298" y="166" textAnchor="end" fontSize="8" fontStyle="italic" fill="#8a7350">&#8594; abono</text>
      <text x="400" y="203" fontSize="9.5" fontWeight="700" fill="#8a6a2f">pergamino</text>
      <text x="400" y="213" fontSize="8" fontStyle="italic" fill="#8a7350">se seca así</text>
      <text x="340" y="277" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#6a5424">grano · almendra</text>

      {/* firma de pie */}
      <text x="16" y="288" fontSize="8.5" fontStyle="italic" fill="#9a8355">
        Cenicafé / FNC · arbusto de sombrío, 2-3 m
      </text>
    </svg>
  );
}
