/*
 * pielHuesos — LA ZARIGÜEYA DEFINITIVA: la lámina linda, PERO EN VECTOR CON
 * HUESOS. Hermana gemela (mismo método, misma arquitectura) del jaguar de
 * huesos (`jaguarHuesos/pielHuesos.js`).
 *
 * QUÉ ES. La piel realista de `public/compai/laminas/zariguya.png` (estilo
 * grabado, 481×444: la zarigüeya ¾ ERGUIDA con el lápiz alzado, la brújula
 * contra el pecho y la cola prensil en C) REDIBUJADA a paths SVG en el MISMO
 * espacio de coordenadas de la lámina — los pivotes MEDIDOS de
 * `zariguyaLamina/anatomia.js` valen como punto de partida y se refinaron
 * contra el calco vivo — y agrupada por HUESO en `<g>` anidados con
 * jerarquía real:
 *
 *   raíz → columna (tronco erguido)
 *            ├── cuello → cabezaGiro → cabeza → { mandíbula, orejas, párpados }
 *            ├── brazoLapiz  (hombro → antebrazo → mano con el LÁPIZ)
 *            ├── brazoBrujula (hombro → antebrazo → mano con la BRÚJULA)
 *            ├── piernaCerca / piernaLejos (cadera → canilla → pie de deditos)
 *            └── colaBase → colaMedia → colaPunta (la PRENSIL: ondula y se
 *                enrosca por huesos encadenados)
 *
 * POR QUÉ EXISTE (la decapitación). `ZariguyaLaminaViva` corta el PNG en
 * capas raster: al girar la capa-cabeza el borde recortado del cuello se
 * separa del cuerpo. Aquí la piel es VECTOR DIBUJADO POR HUESO: cada
 * articulación lleva un CASQUETE REDONDO pintado en el hueso PADRE, centrado
 * exactamente en el pivote del hijo. Al rotar el hijo, el casquete circular
 * queda siempre debajo — la costura es geométricamente imposible (los
 * hombros de goma del cut-out clásico / Cuphead).
 *
 * CÓMO SE DIBUJÓ (método, honesto): las formas se calzaron contra la lámina
 * con un CALCO en vivo (vista `?vista=calco` del arnés `zariguya-demo.html`:
 * el vector al 55% encima del PNG, mismo espacio 481×444) más una grilla de
 * 40 px sobre el PNG, y se iteró con capturas GPU headed hasta cerrar
 * silueta, proporción y color.
 *
 * BONUS DEL VECTOR (lo que el raster no podía): la sonrisa dentona es BOCA
 * REAL — interior, lengua y dientes de abajo viven detrás de la mandíbula;
 * al hablar la charnela abre de verdad. Y la COLA PRENSIL es una cadena de
 * tres huesos: ondula suelta y SE ENROSCA en espiral (el gesto que la firma
 * `cola-prensil` de `zariguyaIdentidad.js` pedía y el recorte plano no daba).
 *
 * REGISTRO. Piel = REALISTA de grabado (sin ojos de goma, sin chapetas, sin
 * mitones Mickey: las manitos son manitas DE DEDITOS, como la lámina).
 * MOVIMIENTO = rubber-hose (huesos reales, piel dibujada): las curvas y
 * relojes canónicos viven en `zariguyaHuesos.css`, suaves en modo normal
 * (70%) y a fondo en modo actuando (30%, Miss Minutes). Spec:
 * `rubberhoseSpec.js` + SPEC-COMPORTAMIENTO-COMPAI-30-70.
 *
 * REGLA DE ORO: módulo PLANO — solo datos/strings (cero react, cero three).
 * Lo consumen el componente React (`ZariguyaHuesos.jsx`), cualquier host
 * HTML plano (kart, demos) y el valle 3D (billboard <Html>): UN solo asset.
 */

import {
  RH_LINE_BOIL,
} from '../rubberhoseSpec.js';

/* Paleta: los tonos MEDIDOS sobre la lámina + los tokens de la identidad
   canónica donde coinciden (zariguyaIdentidad.ZARIGUYA_PALETA: cara, trufa,
   orejaPiel, cola, luna). No se importa `zariguyaIdentidad.js` aquí porque
   ese módulo re-exporta desde `_rubberhose.jsx` (JSX) y esta piel debe poder
   cargarse en un host sin JSX; los hex compartidos citan su token. */
export const ZH_PALETA = Object.freeze({
  pelaje: '#6b5f52',        // pelaje ceniza-pardo del guardia (MEDIDO flanco)
  pelajeOscuro: '#463c31',  // dorso/grupa en penumbra de grabado
  pelajeLuz: '#8d8173',     // ≈ ZARIGUYA_PALETA.cuerpo — el flanco con luz
  grizzle: '#b5a380',       // las puntas canosas (cálidas) del pelo de guardia
  lanilla: '#cdc1a6',       // ≈ ZARIGUYA_PALETA.panza — lanilla del vientre
  pecho: '#eadfc9',         // el pecho crema profundo de la lámina
  cara: '#f3e8d2',          // = ZARIGUYA_PALETA.cara (la máscara pálida)
  antifaz: '#4a3927',       // la banda oscura de los ojos (grabado cálido)
  frente: '#857863',        // la raya gris del centro de la frente
  oreja: '#332a23',         // ≈ ZARIGUYA_PALETA.oreja — oreja desnuda oscura
  orejaPiel: '#d492a9',     // ≈ ZARIGUYA_PALETA.orejaPiel a tono lámina
  orejaBorde: '#e9d9c3',    // el ribete pálido del borde de la oreja
  trufa: '#cf7d8e',         // ≈ ZARIGUYA_PALETA.trufa a tono lámina
  cola: '#c9a091',          // = ZARIGUYA_PALETA.cola afinado — piel desnuda
  colaLuz: '#dcb6a4',
  colaAnillo: '#8f6e5e',    // el anillado de la piel de la cola
  mano: '#ece2cb',          // manitas pálidas de deditos (NO mitón)
  dedoRosa: '#d8a795',      // los deditos rosados de los pies
  lapizMadera: '#c79045',
  lapizVeta: '#8f6228',
  lapizPunta: '#3a2b1c',
  brujula: '#b98c48',       // latón del estuche
  brujulaLuz: '#e2c286',
  brujulaCara: '#efe5cd',
  aguja: '#a03b30',
  ojo: '#1d140d',           // el ojazo nocturno (globo entero oscuro)
  iris: '#5a3f28',          // el aro pardo que apenas se insinúa
  chispa: '#fffdf7',        // = RH_SPEC_CHISPA (catchlight, el más claro)
  diente: '#f6efdd',
  lengua: '#c05548',
  boca: '#4a1a14',
  contorno: '#33281d',      // borde de pelaje oscuro (grabado, NO tinta plana)
  sombraSuelo: 'rgba(40,28,16,0.35)',
  luna: '#ff9ecb',          // = ZARIGUYA_PALETA.luna (aura rosa de luna)
  rocio: '#ffd9ec',         // = ZARIGUYA_PALETA.rocio
});

/* ── LOS PIVOTES DEL ESQUELETO (px del espacio 481×444 de la lámina) ─────────
   Punto de partida: la anatomía MEDIDA (`zariguyaLamina/anatomia.js`);
   refinados contra el calco + grilla de 40 px a articulación real. El CSS
   los consume vía transform-origin. */
export const ZH_HUESOS = Object.freeze({
  columna: [235, 300],       // = CUERPO_PIVOTE
  cuello: [222, 198],        // base del cuello sobre el pecho (recta medida)
  cabeza: [198, 152],        // atlas: donde el cráneo articula con el cuello
  mandibula: [138, 116],     // charnela (≈ MANDIBULA.pivote)
  orejaI: [114, 72],
  orejaD: [243, 58],
  brazoLapiz: [162, 242],    // hombro (= BRAZO_LAPIZ.pivote)
  codoLapiz: [114, 216],
  manoLapiz: [58, 175],      // = BRAZO_LAPIZ.guante
  brazoBrujula: [198, 232],  // hombro (= BRAZO_BRUJULA.pivote)
  codoBrujula: [176, 252],
  piernaCerca: [300, 328],   // cadera (el ancón del muslo grande)
  rodillaCerca: [314, 384],
  piernaLejos: [196, 332],
  rodillaLejos: [182, 380],
  colaBase: [352, 358],      // = COLA.pivote (nace BAJA en la grupa: firma)
  colaMedia: [448, 368],
  colaPunta: [468, 262],
});

/* Casquetes articulares: [cx, cy, r] — pintados en el hueso PADRE bajo el
   pivote del HIJO (la garantía anti-costura). */
const CASQUETES = {
  cabeza: [200, 146, 26],    // en el cuello, bajo el cráneo (oculto por él)
  cuello: [222, 198, 40],    // en el tronco, bajo el cuello
  cola: [352, 358, 14],      // en la grupa, bajo la cola
};

const P = ZH_PALETA;

/* ───────────────────────── helpers de dibujo (strings) ───────────────────── */

/** Mechón de guardia: trazo corto direccional (la caligrafía del grabado). */
function mechones(lista, color = P.grizzle, w = 1.6, op = 0.55) {
  const d = lista.map(([x, y, dx, dy]) => `M${x},${y} q${dx * 0.4},${dy * 0.55} ${dx},${dy}`).join(' ');
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`;
}

/** LCG determinista: el mismo seed dibuja el MISMO pelo en cada render. */
function lcg(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** PELAMBRE — campo de pelos de grabado: n trazos cortos curvos repartidos
    en una elipse, orientados a `ang`± jitter. Es la textura que hace LÁMINA
    a la lámina (miles de plumillas, no fills planos). Determinista por seed. */
function pelambre({ cx, cy, rx, ry, ang = 95, n = 50, seed = 7, color = '#3d332a', w = 1.1, op = 0.5, largo = 9 }) {
  const rnd = lcg(seed);
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd());
    const x = cx + Math.cos(a) * rx * r;
    const y = cy + Math.sin(a) * ry * r;
    const dir = ((ang + (rnd() - 0.5) * 26) * Math.PI) / 180;
    const L = largo * (0.55 + rnd() * 0.9);
    const dx = Math.cos(dir) * L;
    const dy = Math.sin(dir) * L;
    const bombo = (rnd() - 0.5) * L * 0.7;
    const px = dx * 0.5 - Math.sin(dir) * bombo;
    const py = dy * 0.5 + Math.cos(dir) * bombo;
    d += `M${x.toFixed(1)},${y.toFixed(1)} q${px.toFixed(1)},${py.toFixed(1)} ${dx.toFixed(1)},${dy.toFixed(1)}`;
  }
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`;
}

/** Pierna trasera: muslo→canilla→pie de deditos, cada tramo su hueso. El
    muslo lleva su MASA (elipse del ancón) además del tubo — la lámina lo
    dibuja como un muslazo peludo. */
function pierna({ clase, cadera, rodilla, tobillo, dedos, anchoAlto, anchoBajo, muslo = null, lejos = false }) {
  const [cx, cy] = cadera; const [rx, ry] = rodilla; const [tx, ty] = tobillo;
  const pelo = lejos ? '#52432f' : '#6d5c47';
  const piel = lejos ? '#c3a08d' : '#dcae9c';
  const og = (x, y) => ` style="transform-origin:${x}px ${y}px"`;
  const dAlto = `M${cx},${cy} C ${cx - 2},${cy + (ry - cy) * 0.5} ${rx - (rx - cx) * 0.2},${ry - 8} ${rx},${ry}`;
  const dBajo = `M${rx},${ry} C ${rx + (tx - rx) * 0.3},${ry + (ty - ry) * 0.55} ${tx},${ty - 7} ${tx},${ty}`;
  const masa = muslo
    ? `<ellipse cx="${muslo[0]}" cy="${muslo[1]}" rx="${muslo[2]}" ry="${muslo[3]}" fill="${pelo}" stroke="${P.contorno}" stroke-width="2.6"/>` +
      `<ellipse cx="${muslo[0]}" cy="${muslo[1]}" rx="${muslo[2]}" ry="${muslo[3]}" fill="${pelo}" filter="url(#zhGrano)" aria-hidden="true"/>` +
      `<path d="M${muslo[0] - muslo[2] * 0.7},${muslo[1] + muslo[3] * 0.5} Q ${muslo[0]},${muslo[1] + muslo[3] * 1.05} ${muslo[0] + muslo[2] * 0.75},${muslo[1] + muslo[3] * 0.45}" fill="none" stroke="#33281d" stroke-width="4" opacity=".3"/>` +
      pelambre({ cx: muslo[0], cy: muslo[1], rx: muslo[2] * 0.85, ry: muslo[3] * 0.85, ang: 100, n: 34, seed: lejos ? 41 : 37, color: lejos ? '#2e261e' : '#3d332a', w: 1.1, op: 0.55, largo: 9 }) +
      pelambre({ cx: muslo[0], cy: muslo[1] - muslo[3] * 0.2, rx: muslo[2] * 0.7, ry: muslo[3] * 0.6, ang: 96, n: 22, seed: lejos ? 43 : 47, color: lejos ? '#7a6c5a' : P.grizzle, w: 1, op: 0.5, largo: 8 })
    : '';
  /* pie: palma + 4 deditos LARGOS y separados (la manita rosada del
     marsupial, inconfundible en la lámina) */
  const deditos = dedos.map(([dx1, dy1, dx2, dy2]) =>
    `<path d="M${tx},${ty + 3} C ${tx + (dx1 - tx) * 0.5},${ty + 7} ${dx1},${dy1 - 4} ${dx2},${dy2}" fill="none" stroke="${P.contorno}" stroke-width="8" stroke-linecap="round" opacity=".55"/>` +
    `<path d="M${tx},${ty + 3} C ${tx + (dx1 - tx) * 0.5},${ty + 7} ${dx1},${dy1 - 4} ${dx2},${dy2}" fill="none" stroke="${piel}" stroke-width="6.4" stroke-linecap="round"/>`
  ).join('');
  return (
    `<g class="zh-hueso ${clase}"${og(cx, cy)}>` +
      masa +
      `<path d="${dAlto}" fill="none" stroke="${P.contorno}" stroke-width="${anchoAlto + 4}" stroke-linecap="round"/>` +
      `<path d="${dAlto}" fill="none" stroke="${pelo}" stroke-width="${anchoAlto}" stroke-linecap="round"/>` +
      `<g class="zh-hueso ${clase}Baja"${og(rx, ry)}>` +
        `<circle cx="${rx}" cy="${ry}" r="${anchoAlto * 0.5}" fill="${pelo}"/>` +
        `<path d="${dBajo}" fill="none" stroke="${P.contorno}" stroke-width="${anchoBajo + 3.5}" stroke-linecap="round"/>` +
        `<path d="${dBajo}" fill="none" stroke="${pelo}" stroke-width="${anchoBajo}" stroke-linecap="round"/>` +
        `<g class="zh-hueso ${clase}Pie"${og(tx, ty - 2)}>` +
          `<ellipse cx="${tx}" cy="${ty + 4}" rx="${anchoBajo * 0.85}" ry="6.5" fill="${piel}" stroke="${P.contorno}" stroke-width="1.6"/>` +
          deditos +
        `</g>` +
      `</g>` +
    `</g>`
  );
}

/* ═══════════════════════════ LA PIEL, HUESO A HUESO ════════════════════════ */

const DEFS = `<defs>
  <linearGradient id="zhPelaje" x1="0" y1="180" x2="0" y2="415" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#443624"/>
    <stop offset=".38" stop-color="#67553d"/>
    <stop offset=".78" stop-color="#8a7658"/>
    <stop offset="1" stop-color="#9a866a"/>
  </linearGradient>
  <radialGradient id="zhCara" cx="200" cy="80" r="115" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${P.cara}"/>
    <stop offset=".6" stop-color="#e9dcbe"/>
    <stop offset=".88" stop-color="#cbbb9c"/>
    <stop offset="1" stop-color="#a89a82"/>
  </radialGradient>
  <linearGradient id="zhCuello" x1="215" y1="140" x2="228" y2="205" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#4e4337"/>
    <stop offset=".45" stop-color="#6b5f50"/>
    <stop offset=".78" stop-color="#b7a88c"/>
    <stop offset="1" stop-color="${P.pecho}"/>
  </linearGradient>
  <linearGradient id="zhCola" x1="360" y1="390" x2="460" y2="230" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#b08d7c"/>
    <stop offset=".45" stop-color="${P.cola}"/>
    <stop offset="1" stop-color="${P.colaLuz}"/>
  </linearGradient>
  <linearGradient id="zhBrazo" x1="0" y1="170" x2="0" y2="260" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#665441"/>
    <stop offset=".6" stop-color="#6f5e49"/>
    <stop offset="1" stop-color="#80705a"/>
  </linearGradient>
  <radialGradient id="zhAura" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="${P.luna}" stop-opacity=".34"/>
    <stop offset=".7" stop-color="${P.rocio}" stop-opacity=".12"/>
    <stop offset="1" stop-color="${P.luna}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="zhOjoHalo" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="${P.rocio}" stop-opacity=".8"/>
    <stop offset="1" stop-color="${P.rocio}" stop-opacity="0"/>
  </radialGradient>
  <filter id="zhBlur"><feGaussianBlur stdDeviation="4"/></filter>
  <filter id="zhGrano" x="-3%" y="-3%" width="106%" height="106%">
    <feTurbulence type="fractalNoise" baseFrequency="0.10 0.16" numOctaves="2" seed="11" result="ruido"/>
    <feColorMatrix in="ruido" type="matrix"
      values="0 0 0 0 0.16  0 0 0 0 0.115  0 0 0 0 0.07  0 0 0 0.55 0" result="tinte"/>
    <feComposite in="tinte" in2="SourceGraphic" operator="in"/>
  </filter>
  <filter id="zhBoilSuave" x="-6%" y="-6%" width="112%" height="112%">
    <feTurbulence type="turbulence" baseFrequency="${RH_LINE_BOIL.baseFrequency}" numOctaves="1" seed="${RH_LINE_BOIL.seeds[0]}" result="t">
      <animate attributeName="seed" values="${RH_LINE_BOIL.seeds.join(';')}" dur="${RH_LINE_BOIL.dur}" repeatCount="indefinite" calcMode="discrete"/>
    </feTurbulence>
    <feDisplacementMap in="SourceGraphic" in2="t" scale="1.5"/>
  </filter>
  <filter id="zhBoil" x="-8%" y="-8%" width="116%" height="116%">
    <feTurbulence type="turbulence" baseFrequency="${RH_LINE_BOIL.baseFrequency}" numOctaves="1" seed="${RH_LINE_BOIL.seeds[0]}" result="t">
      <animate attributeName="seed" values="${RH_LINE_BOIL.seeds.join(';')}" dur="${RH_LINE_BOIL.dur}" repeatCount="indefinite" calcMode="discrete"/>
    </feTurbulence>
    <feDisplacementMap in="SourceGraphic" in2="t" scale="${RH_LINE_BOIL.scale}"/>
  </filter>
</defs>`;

/* ── COLA PRENSIL: tres huesos encadenados. Nace BAJA en la grupa (firma),
      barre con panza hacia abajo, sube en C por la derecha y remata en el
      GANCHO enroscado. Piel desnuda anillada; la base peluda la pinta el
      tronco (casquete). ── */
const COLA = (() => {
  const seg1 = 'M346,360 C 378,390 418,398 448,372';
  const seg2 = 'M448,372 C 470,350 480,306 470,264';
  const seg3 = 'M470,264 C 462,230 440,212 416,222 C 398,230 392,248 402,260 C 410,269 424,268 431,258';
  const anillos = (d, w) =>
    `<path d="${d}" fill="none" stroke="${P.colaAnillo}" stroke-width="${w}" stroke-linecap="butt" stroke-dasharray="1.6 6.5" opacity=".4"/>` +
    /* sombreado del canto: penumbra por el borde de abajo del tubo + hilo de
       luz por el de arriba (la piel escamosa de la lámina, no un tubo plano) */
    `<path d="${d}" fill="none" stroke="#8a6552" stroke-width="${w * 0.3}" stroke-linecap="round" opacity=".38" transform="translate(1.2 2.2)"/>` +
    `<path d="${d}" fill="none" stroke="#ecd0bd" stroke-width="${w * 0.18}" stroke-linecap="round" opacity=".42" transform="translate(-1 -2.2)"/>`;
  return `<g class="zh-hueso zh-colaBase" style="transform-origin:352px 358px">
    <path d="${seg1}" fill="none" stroke="${P.contorno}" stroke-width="20" stroke-linecap="round"/>
    <path d="${seg1}" fill="none" stroke="url(#zhCola)" stroke-width="16" stroke-linecap="round"/>
    ${anillos(seg1, 16)}
    <g class="zh-hueso zh-colaMedia" style="transform-origin:448px 368px">
      <circle cx="448" cy="370" r="8" fill="url(#zhCola)"/>
      <path d="${seg2}" fill="none" stroke="${P.contorno}" stroke-width="17" stroke-linecap="round"/>
      <path d="${seg2}" fill="none" stroke="url(#zhCola)" stroke-width="13" stroke-linecap="round"/>
      ${anillos(seg2, 13)}
      <g class="zh-hueso zh-colaPunta" style="transform-origin:468px 262px">
        <circle cx="469" cy="264" r="6.5" fill="url(#zhCola)"/>
        <path d="${seg3}" fill="none" stroke="${P.contorno}" stroke-width="13" stroke-linecap="round"/>
        <path d="${seg3}" fill="none" stroke="url(#zhCola)" stroke-width="9.5" stroke-linecap="round"/>
        ${anillos(seg3, 9.5)}
        <circle cx="431" cy="258" r="4.2" fill="${P.colaLuz}" stroke="${P.contorno}" stroke-width="1.4"/>
      </g>
    </g>
  </g>`;
})();

/* ── TRONCO: la pera ERGUIDA del marsupial (masa VERTICAL — la firma
      `postura-erguida` contra el gurre horizontal). Pelaje ceniza con
      grizzle canoso, pecho crema al frente, pelo de guardia que ROMPE la
      silueta por la grupa y el lomo. ── */
const TRONCO_PATH =
  'M165,196 C 146,230 136,278 140,322 ' +
  'C 144,362 164,392 200,404 ' +
  'C 242,416 294,410 320,388 ' +
  'C 342,368 352,336 348,300 ' +
  'C 344,258 328,222 302,196 ' +
  'C 272,172 220,174 190,182 C 180,186 171,190 165,196 Z';

const TRONCO = `
  <path d="${TRONCO_PATH}" fill="url(#zhPelaje)" stroke="${P.contorno}" stroke-width="3"/>
  <!-- GRANO de pelaje: turbulencia recortada a la MISMA silueta (textura de
       pelo fino, estática — la lámina no es un fill plano) -->
  <path d="${TRONCO_PATH}" fill="${P.pelaje}" filter="url(#zhGrano)" aria-hidden="true"/>
  <!-- la grupa y el lomo en penumbra (la vuelta del cilindro, grabado) -->
  <path d="M302,196 C 328,222 344,258 348,300 C 352,336 342,368 320,388 C 332,356 334,310 324,266 C 316,232 310,210 302,196 Z"
    fill="${P.pelajeOscuro}" opacity=".55"/>
  <!-- PELAMBRE de plumilla: campos de pelos por zona (dirección del pelaje) -->
  ${pelambre({ cx: 168, cy: 300, rx: 30, ry: 88, ang: 105, n: 90, seed: 3, color: '#453a2b', w: 1.15, op: 0.55, largo: 12 })}
  ${pelambre({ cx: 168, cy: 296, rx: 28, ry: 82, ang: 108, n: 65, seed: 9, color: P.grizzle, w: 1, op: 0.55, largo: 10 })}
  ${pelambre({ cx: 316, cy: 292, rx: 36, ry: 92, ang: 78, n: 110, seed: 5, color: '#372c1e', w: 1.2, op: 0.6, largo: 13 })}
  ${pelambre({ cx: 312, cy: 288, rx: 34, ry: 88, ang: 80, n: 75, seed: 13, color: '#8f7f65', w: 1, op: 0.6, largo: 11 })}
  ${pelambre({ cx: 244, cy: 214, rx: 66, ry: 28, ang: 95, n: 90, seed: 17, color: '#413522', w: 1.15, op: 0.55, largo: 11 })}
  ${pelambre({ cx: 244, cy: 210, rx: 60, ry: 24, ang: 92, n: 55, seed: 23, color: P.grizzle, w: 1, op: 0.5, largo: 9 })}
  ${pelambre({ cx: 244, cy: 388, rx: 78, ry: 22, ang: 92, n: 75, seed: 29, color: '#443826', w: 1.1, op: 0.55, largo: 10 })}
  <!-- PELO DE GUARDIA que rompe TODA la silueta (mechones del contorno:
       la lámina se lee erizada, jamás una silueta lisa) -->
  <g fill="none" stroke="#473b2c" stroke-width="2.2" stroke-linecap="round" opacity=".85">
    <path d="M338,250 l10,-4 -7,8 10,-2"/>
    <path d="M348,296 l10,-2 -7,7 9,0"/>
    <path d="M342,340 l9,1 -6,6 8,2"/>
    <path d="M316,390 l8,5 -9,3 7,5"/>
    <path d="M142,296 l-9,-1 6,7 -8,2"/>
    <path d="M146,342 l-9,2 7,5 -7,4"/>
    <path d="M172,192 l-7,-6 2,9 -8,-3"/>
    <path d="M150,236 l-8,-3 5,7 -8,1"/>
    <path d="M137,268 l-8,-1 5,6 -8,2"/>
    <path d="M158,368 l-8,3 7,4 -6,4"/>
    <path d="M182,396 l-6,5 8,2 -5,5"/>
    <path d="M214,408 l-4,6 8,1 -3,5"/>
    <path d="M252,412 l-2,6 8,-1 -2,5"/>
    <path d="M288,408 l2,6 7,-3 0,6"/>
    <path d="M330,368 l8,3 -6,5 7,3"/>
    <path d="M334,224 l9,-4 -6,7 9,-1"/>
    <path d="M312,206 l8,-5 -4,8 9,-2"/>
    <path d="M282,186 l6,-7 -1,9 8,-4"/>
    <path d="M244,176 l4,-8 2,9 7,-5"/>
    <path d="M206,178 l0,-8 5,7 5,-6"/>
    <path d="M186,186 l-3,-8 6,6 3,-7"/>
  </g>
  <!-- PECHO/VIENTRE crema (la lanilla clara que baja del mentón) -->
  <path d="M195,202 C 218,194 242,198 254,212 C 266,236 268,276 260,312 C 253,346 236,370 213,375 C 194,377 179,364 172,338 C 163,302 167,254 179,224 C 183,214 189,207 195,202 Z"
    fill="${P.pecho}" opacity=".96"/>
  <path d="M198,208 C 216,201 238,203 250,214 C 238,210 218,209 202,214 Z" fill="#fdf6e6" opacity=".8"/>
  <!-- el RAYADO del pecho (la lanilla se dibuja a trazos, como el grabado) -->
  <g fill="none" stroke="#b7a683" stroke-width="1.7" stroke-linecap="round" opacity=".85">
    <path d="M196,224 C 192,248 190,276 192,304"/>
    <path d="M212,218 C 209,246 208,280 211,312"/>
    <path d="M228,216 C 227,246 227,282 229,316"/>
    <path d="M244,222 C 245,250 246,282 244,312"/>
    <path d="M203,320 C 205,338 210,354 218,364"/>
    <path d="M234,324 C 235,340 233,354 227,366"/>
    <path d="M188,236 C 184,262 183,292 186,318"/>
    <path d="M252,236 C 254,262 255,292 251,318"/>
    <path d="M220,330 C 221,346 219,358 214,368"/>
  </g>
  <g fill="none" stroke="#b3a281" stroke-width="1.3" stroke-linecap="round" opacity=".6">
    <path d="M204,230 C 201,254 200,282 202,308"/>
    <path d="M220,220 C 218,250 218,284 220,314"/>
    <path d="M236,224 C 236,252 237,284 236,312"/>
  </g>
  <!-- lanilla: el borde del pecho se DESHACE en mechoncitos (nunca un óvalo
       de sticker) — crema hacia afuera + ceniza hacia adentro -->
  <g fill="none" stroke="${P.pecho}" stroke-width="2.2" stroke-linecap="round" opacity=".9">
    <path d="M177,240 l-7,3 7,4 -7,4"/>
    <path d="M171,272 l-7,2 7,4 -7,3"/>
    <path d="M169,306 l-7,2 7,3 -6,4"/>
    <path d="M174,340 l-7,3 8,3 -6,4"/>
    <path d="M263,246 l7,2 -7,4 8,3"/>
    <path d="M268,282 l7,2 -7,3 7,4"/>
    <path d="M266,318 l7,2 -7,3 6,4"/>
    <path d="M252,352 l7,3 -7,3 6,4"/>
    <path d="M198,206 l-4,-6 8,3 -2,-7"/>
    <path d="M236,206 l3,-6 4,7 5,-6"/>
  </g>
  <g fill="none" stroke="#7d6c52" stroke-width="1.8" stroke-linecap="round" opacity=".6">
    <path d="M183,254 l-5,4 6,3"/>
    <path d="M179,300 l-5,3 6,3"/>
    <path d="M258,268 l5,3 -6,3"/>
    <path d="M254,324 l5,3 -5,3"/>
  </g>
  <!-- grizzle: la caligrafía canosa del grabado sobre el pelaje -->
  ${mechones([
    [200, 192, -8, -7], [232, 184, -6, -8], [262, 182, -4, -9], [288, 194, 2, -9],
    [308, 218, 6, -7], [322, 248, 8, -5], [330, 284, 9, -3], [332, 320, 9, -1],
    [324, 354, 8, 3], [304, 382, 6, 6], [150, 248, -8, -4], [142, 290, -9, -2],
    [146, 334, -8, 2], [162, 372, -7, 5], [188, 396, -4, 8], [232, 406, 0, 9],
    [274, 402, 4, 8],
  ])}
  ${mechones([
    [214, 222, -6, -6], [248, 218, -3, -7], [284, 234, 5, -6], [302, 266, 7, -4],
    [310, 304, 8, -2], [306, 340, 7, 2], [290, 372, 5, 5], [160, 272, -7, -3],
    [154, 314, -8, 0], [162, 352, -6, 4],
  ], '#3d332a', 1.7, 0.5)}
  <!-- casquete de la COLA: el arranque peludo en la grupa (base de respaldo) -->
  <circle cx="${CASQUETES.cola[0]}" cy="${CASQUETES.cola[1]}" r="${CASQUETES.cola[2]}" fill="${P.pelajeOscuro}"/>
  <g fill="none" stroke="${P.pelajeOscuro}" stroke-width="2.2" stroke-linecap="round" opacity=".9">
    <path d="M342,348 l10,4 -6,6"/>
    <path d="M346,366 l9,2 -5,6"/>
  </g>`;

/* ── BRAZO DEL LÁPIZ (alzado, lado izquierdo): hombro→antebrazo→mano de
      deditos con el LÁPIZ. Dos huesos + la mano (que ESCRIBE al pensar). ── */
const BRAZO_LAPIZ = (() => {
  const H0 = ZH_HUESOS.brazoLapiz; const C0 = ZH_HUESOS.codoLapiz; const M0 = ZH_HUESOS.manoLapiz;
  const dAlto = `M${H0[0]},${H0[1]} C 142,232 126,226 ${C0[0]},${C0[1]}`;
  const dBajo = `M${C0[0]},${C0[1]} C 96,206 78,192 ${M0[0] + 6},${M0[1] + 6}`;
  return `<g class="zh-hueso zh-brazoLapiz" style="transform-origin:${H0[0]}px ${H0[1]}px">
    <path d="${dAlto}" fill="none" stroke="${P.contorno}" stroke-width="23" stroke-linecap="round"/>
    <path d="${dAlto}" fill="none" stroke="url(#zhBrazo)" stroke-width="19" stroke-linecap="round"/>
    ${mechones([[150, 232, -5, 6], [132, 226, -5, 6]], '#3d332a', 1.5, 0.5)}
    ${pelambre({ cx: 138, cy: 228, rx: 24, ry: 12, ang: 140, n: 18, seed: 63, color: '#40352a', w: 1, op: 0.55, largo: 7 })}
    <g class="zh-hueso zh-brazoLapizAnte" style="transform-origin:${C0[0]}px ${C0[1]}px">
      <circle cx="${C0[0]}" cy="${C0[1]}" r="9.5" fill="url(#zhBrazo)"/>
      <path d="${dBajo}" fill="none" stroke="${P.contorno}" stroke-width="18" stroke-linecap="round"/>
      <path d="${dBajo}" fill="none" stroke="url(#zhBrazo)" stroke-width="14" stroke-linecap="round"/>
      <g class="zh-hueso zh-manoLapiz" style="transform-origin:${M0[0] + 8}px ${M0[1] + 8}px">
        <!-- el LÁPIZ (eje medido (14,228)→(84,132)): debajo de los deditos -->
        <g>
          <path d="M22,218 L78,141" stroke="${P.lapizMadera}" stroke-width="7.5" stroke-linecap="butt"/>
          <path d="M24.5,219.5 L80.5,142.5" stroke="${P.lapizVeta}" stroke-width="2" opacity=".7"/>
          <path d="M78,141 L84,132 L86,141 Z" fill="#d8b98a" stroke="${P.lapizVeta}" stroke-width="1"/>
          <path d="M22,218 L14,229 L19,231 Z" fill="#e8d0a8" stroke="${P.lapizVeta}" stroke-width="1"/>
          <path d="M14,229 L16.5,225.5 L19,231 Z" fill="${P.lapizPunta}"/>
        </g>
        <!-- la MANO pálida de deditos que agarra (nunca mitón) -->
        <ellipse cx="${M0[0]}" cy="${M0[1]}" rx="14" ry="13" fill="${P.mano}" stroke="${P.contorno}" stroke-width="1.8"/>
        <g fill="none" stroke="${P.mano}" stroke-width="5.5" stroke-linecap="round">
          <path d="M50,166 C 44,170 41,176 43,182"/>
          <path d="M57,164 C 52,169 50,176 52,183"/>
          <path d="M65,166 C 61,172 60,178 62,184"/>
        </g>
        <g fill="none" stroke="${P.contorno}" stroke-width="1" stroke-linecap="round" opacity=".5">
          <path d="M50,166 C 44,170 41,176 43,182"/>
          <path d="M57,164 C 52,169 50,176 52,183"/>
          <path d="M65,166 C 61,172 60,178 62,184"/>
        </g>
        <path d="M46,184 C 50,188 58,189 64,186" fill="none" stroke="${P.contorno}" stroke-width="1.2" opacity=".45"/>
      </g>
    </g>
  </g>`;
})();

/* ── BRAZO DE LA BRÚJULA (contra el pecho): hombro→antebrazo corto→mano
      sobre el disco de latón. La brújula viaja con la mano. ── */
const BRAZO_BRUJULA = (() => {
  const H0 = ZH_HUESOS.brazoBrujula; const C0 = ZH_HUESOS.codoBrujula;
  const dAlto = `M${H0[0]},${H0[1]} C 190,240 184,247 ${C0[0]},${C0[1]}`;
  const dBajo = `M${C0[0]},${C0[1]} C 168,258 161,262 154,263`;
  return `<g class="zh-hueso zh-brazoBrujula" style="transform-origin:${H0[0]}px ${H0[1]}px">
    <path d="${dAlto}" fill="none" stroke="${P.contorno}" stroke-width="21" stroke-linecap="round"/>
    <path d="${dAlto}" fill="none" stroke="url(#zhBrazo)" stroke-width="17" stroke-linecap="round"/>
    <g class="zh-hueso zh-brazoBrujulaAnte" style="transform-origin:${C0[0]}px ${C0[1]}px">
      <circle cx="${C0[0]}" cy="${C0[1]}" r="8.5" fill="url(#zhBrazo)"/>
      <path d="${dBajo}" fill="none" stroke="${P.contorno}" stroke-width="16" stroke-linecap="round"/>
      <path d="${dBajo}" fill="none" stroke="url(#zhBrazo)" stroke-width="12.5" stroke-linecap="round"/>
      <!-- la BRÚJULA de latón (disco medido (112,262) r31, con su coronita) -->
      <g>
        <circle cx="138" cy="243" r="5" fill="${P.brujula}" stroke="${P.contorno}" stroke-width="1.4"/>
        <rect x="135" y="236" width="6" height="5" rx="2" fill="${P.brujulaLuz}" stroke="${P.contorno}" stroke-width="1"/>
        <circle cx="112" cy="262" r="29" fill="${P.brujula}" stroke="${P.contorno}" stroke-width="2.2"/>
        <circle cx="112" cy="262" r="22.5" fill="${P.brujulaCara}" stroke="${P.lapizVeta}" stroke-width="1.4"/>
        <g stroke="${P.lapizVeta}" stroke-width="1.3" opacity=".75">
          <path d="M112,242.5 L112,247"/><path d="M112,277 L112,281.5"/>
          <path d="M92.5,262 L97,262"/><path d="M127,262 L131.5,262"/>
        </g>
        <path d="M103,273 L117,254 L121,251 L118,257 Z" fill="${P.aguja}"/>
        <path d="M103,273 L110,263 L114,260 L107,270 Z" fill="#5a4534"/>
        <circle cx="112" cy="262" r="2.6" fill="${P.brujula}" stroke="${P.contorno}" stroke-width="1"/>
        <path d="M96,250 A 21,21 0 0 1 116,242" fill="none" stroke="#fdf6e6" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>
      </g>
      <!-- la manita de deditos sobre el borde del disco -->
      <ellipse cx="148" cy="262" rx="13" ry="13.5" fill="${P.mano}" stroke="${P.contorno}" stroke-width="1.8"/>
      <g fill="none" stroke="${P.mano}" stroke-width="5.2" stroke-linecap="round">
        <path d="M143,252 C 136,251 131,254 129,259"/>
        <path d="M143,260 C 136,260 131,263 129,267"/>
        <path d="M144,268 C 138,270 134,273 132,277"/>
      </g>
      <g fill="none" stroke="${P.contorno}" stroke-width="1" stroke-linecap="round" opacity=".5">
        <path d="M143,252 C 136,251 131,254 129,259"/>
        <path d="M143,260 C 136,260 131,263 129,267"/>
        <path d="M144,268 C 138,270 134,273 132,277"/>
      </g>
    </g>
  </g>`;
})();

/* ── CUELLO: cuña de pelaje del pecho a la nuca — se pinta con los MISMOS
      tonos del tronco para fundirse (sin collar). Pinta el casquete del
      ATLAS bajo el cráneo (el fix de la decapitación). ── */
const CUELLO = `
  <path d="M170,174 C 192,156 238,148 268,156 C 276,168 277,184 271,196 C 250,206 208,208 186,202 C 172,195 166,184 170,174 Z"
    fill="url(#zhCuello)"/>
  <circle cx="${CASQUETES.cabeza[0]}" cy="${CASQUETES.cabeza[1]}" r="${CASQUETES.cabeza[2]}" fill="url(#zhCuello)"/>
  <!-- mechones que funden el cuello con el lomo y el pecho (sin costura) -->
  ${mechones([
    [176, 192, -6, 6], [262, 168, 7, 4], [268, 188, 6, 5], [200, 188, -4, 7], [244, 174, 4, 6],
    [222, 182, 0, 7], [206, 208, -2, 7], [242, 206, 3, 7],
  ], '#3d332a', 1.6, 0.4)}
  ${mechones([
    [190, 198, -4, 6], [230, 194, 2, 7], [256, 196, 5, 6],
  ], P.grizzle, 1.5, 0.5)}
  ${pelambre({ cx: 222, cy: 182, rx: 44, ry: 22, ang: 100, n: 30, seed: 67, color: '#40352a', w: 1, op: 0.5, largo: 8 })}`;

/* ── CABEZA: el retrato ¾ de la lámina — cara pálida, antifaz + raya de la
      frente, hocico en cuña con la sonrisa dentona ABIERTA (jaw=0 = la
      lámina) y los ojazos nocturnos. Cubre el casquete del atlas. ── */
const CABEZA = (() => {
  return `
  <!-- OREJAS redondas y desnudas (firma): interior crema con estrías,
       ribete oscuro. DETRÁS del cráneo, articuladas en su base -->
  <g class="zh-hueso zh-orejaI" style="transform-origin:116px 50px">
    <path d="M89,42 C 84,19 100,3 124,2 C 143,2 151,15 147,31 C 143,46 129,55 113,55 C 102,55 93,51 89,42 Z"
      fill="#e8d0ac" stroke="${P.contorno}" stroke-width="3.2"/>
    <path d="M97,39 C 95,25 106,13 122,11 M105,43 C 104,31 113,20 125,18 M114,46 C 114,35 121,26 131,25"
      fill="none" stroke="#a8895f" stroke-width="1.8" opacity=".65"/>
    <path d="M90,44 C 86,23 100,6 122,4" fill="none" stroke="#4a3a28" stroke-width="2.6" stroke-linecap="round" opacity=".8"/>
  </g>
  <g class="zh-hueso zh-orejaD" style="transform-origin:254px 46px">
    <path d="M232,38 C 229,17 243,3 263,4 C 279,5 286,19 282,34 C 278,47 266,54 252,52 C 242,50 235,46 232,38 Z"
      fill="#e8d0ac" stroke="${P.contorno}" stroke-width="3.2"/>
    <path d="M240,36 C 240,24 249,15 261,14 M248,41 C 248,30 256,22 266,21"
      fill="none" stroke="#a8895f" stroke-width="1.8" opacity=".65"/>
    <path d="M233,40 C 230,20 244,5 262,5" fill="none" stroke="#4a3a28" stroke-width="2.6" stroke-linecap="round" opacity=".8"/>
  </g>
  <!-- el CRÁNEO ¾ COMPLETO (incluye hocico y mentón, como la lámina):
       ancho en las orejas, AFILÁNDOSE hacia la trufa (la cara puntuda) -->
  <path d="M122,60 C 118,36 128,16 152,10 C 178,4 210,4 233,10 C 251,16 260,30 263,46 C 264,60 259,74 252,86 C 250,96 249,106 251,114 C 250,124 245,134 237,144 C 227,156 213,163 198,163 C 182,162 166,156 154,146 C 143,136 132,120 126,104 C 122,90 123,74 122,60 Z"
    fill="url(#zhCara)" stroke="${P.contorno}" stroke-width="2.8"/>
  <!-- GRANO del cráneo (la misma silueta, moteado fino de plumilla) -->
  <path d="M122,60 C 118,36 128,16 152,10 C 178,4 210,4 233,10 C 251,16 260,30 263,46 C 264,60 259,74 252,86 C 250,96 249,106 251,114 C 250,124 245,134 237,144 C 227,156 213,163 198,163 C 182,162 166,156 154,146 C 143,136 132,120 126,104 C 122,90 123,74 122,60 Z"
    fill="#d8c9a8" filter="url(#zhGrano)" aria-hidden="true" opacity=".5"/>
  <!-- LAS DOS BANDAS OSCURAS: LARGAS, de la base de cada oreja, POR el ojo,
       convergiendo hacia el hocico (el patrón real del Didelphis: blaze
       claro al centro, máscaras diagonales a los lados) -->
  <path d="M134,44 C 142,32 153,24 166,22 C 182,20 196,28 199,44 C 200,58 195,74 184,86 C 172,96 152,100 142,94 C 134,86 131,74 131,62 C 131,55 132,49 134,44 Z"
    fill="#54402a" opacity=".85"/>
  <path d="M214,86 C 208,70 210,52 221,40 C 230,31 243,28 252,33 C 260,38 262,48 259,60 C 256,74 249,85 239,90 C 230,94 220,93 214,86 Z"
    fill="#54402a" opacity=".85"/>
  <!-- la ÓRBITA honda alrededor de cada ojo (el ojo se asienta en oscuro) -->
  <ellipse cx="177" cy="71" rx="19" ry="18" fill="#3a2a18" opacity=".8"/>
  <ellipse cx="239" cy="67" rx="17" ry="16.5" fill="#3a2a18" opacity=".8"/>
  <!-- la CEJA clara sobre la órbita (la expresión pícara-amable de la lámina) -->
  <path d="M160,54 C 168,48 182,46 192,50" fill="none" stroke="#e8dabb" stroke-width="2.6" stroke-linecap="round" opacity=".8"/>
  <path d="M226,50 C 234,45 246,44 254,48" fill="none" stroke="#e8dabb" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>
  ${pelambre({ cx: 168, cy: 58, rx: 24, ry: 28, ang: 115, n: 26, seed: 51, color: '#3c2c1a', w: 1, op: 0.38, largo: 7 })}
  ${pelambre({ cx: 237, cy: 58, rx: 18, ry: 22, ang: 75, n: 20, seed: 53, color: '#3c2c1a', w: 1, op: 0.38, largo: 6 })}
  <!-- las máscaras se deshilachan en pelo (borde vivo, no sticker) -->
  ${mechones([
    [140, 100, -6, 5], [134, 84, -7, 2], [136, 64, -6, -3], [146, 44, -4, -6],
    [216, 86, -3, 5], [214, 68, -4, 1], [222, 44, -2, -5],
  ], '#3c2e1f', 1.7, 0.7)}
  <!-- el BLAZE claro de la frente (de la coronilla al hocico) con su pelito -->
  <path d="M178,10 C 190,7 204,8 214,12 C 212,36 209,62 207,82 C 202,92 192,94 186,86 C 182,64 179,36 178,10 Z"
    fill="#f6ecd6" opacity=".95"/>
  ${mechones([
    [190, 20, 1, 8], [196, 40, 1, 8], [199, 62, 0, 8],
  ], '#d9c9a8', 1.6, 0.7)}
  <!-- coronilla y sienes: caligrafía de pelo corto del grabado -->
  ${mechones([
    [140, 26, -4, -6], [160, 16, -2, -7], [214, 14, 2, -7], [236, 22, 4, -6],
    [252, 38, 5, -4], [108, 70, -6, -2], [258, 66, 6, 0], [118, 94, -6, 3],
  ], '#5d5145', 1.5, 0.55)}
  ${pelambre({ cx: 190, cy: 24, rx: 52, ry: 15, ang: 98, n: 36, seed: 57, color: '#6d6152', w: 1, op: 0.5, largo: 7 })}
  ${pelambre({ cx: 136, cy: 108, rx: 16, ry: 22, ang: 118, n: 20, seed: 59, color: '#c9b795', w: 1, op: 0.55, largo: 7 })}
  ${pelambre({ cx: 190, cy: 148, rx: 34, ry: 14, ang: 95, n: 22, seed: 61, color: '#cbbc9c', w: 1, op: 0.5, largo: 6 })}
  <!-- mejilla/quijada con pelo claro (la cara se funde al cuello por pelo) -->
  ${mechones([
    [128, 122, -5, 5], [138, 136, -4, 6], [152, 148, -3, 6], [168, 158, -2, 6],
    [246, 120, 4, 5], [240, 134, 3, 5],
  ], '#c9b795', 1.5, 0.6)}
  <!-- el HOCICO claro que baja del blaze y ENVUELVE la trufa -->
  <path d="M158,104 C 170,92 190,84 210,86 C 228,89 242,97 250,108 C 252,118 246,127 234,132 C 210,139 176,134 162,126 C 154,120 154,110 158,104 Z"
    fill="#f2e6cc"/>
  <path d="M162,126 C 176,134 210,139 234,132 C 246,127 252,118 250,108" fill="none" stroke="#c3b294" stroke-width="2.4" opacity=".75"/>
  <!-- pecas de vibrisas entre hocico y labio -->
  <g fill="${P.antifaz}" opacity=".6">
    <circle cx="200" cy="114" r="1.3"/><circle cx="210" cy="118" r="1.2"/><circle cx="204" cy="124" r="1.2"/>
    <circle cx="216" cy="112" r="1.2"/><circle cx="220" cy="122" r="1.1"/><circle cx="194" cy="122" r="1.1"/>
  </g>
  <!-- la TRUFA rosada protagónica al final de la cuña (firma) -->
  <path d="M226,105 C 230,98 243,96 249,102 C 254,108 254,119 248,125 C 241,131 230,130 225,123 C 222,117 222,110 226,105 Z"
    fill="#d18a92" stroke="${P.contorno}" stroke-width="1.8"/>
  <path d="M233,111 Q 235,107 239,108 M245,112 Q 244,108 239,108" fill="none" stroke="#8f4a58" stroke-width="1.5" stroke-linecap="round"/>
  <ellipse cx="233" cy="104" rx="3.6" ry="2.1" fill="#eab9bd" opacity=".9"/>
  <path d="M228,120 C 233,124 241,125 246,122" fill="none" stroke="#a05a64" stroke-width="1.4" opacity=".6"/>
  <!-- penumbra fina que asienta el labio sobre la cuña (solo un hilo) -->
  <path d="M156,116 C 178,127 204,131 229,124" fill="none" stroke="#b7a582" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>
  <!-- FAUCES (detrás de la mandíbula): interior HONDO + lengua — la lámina
       sonríe ENTREABIERTA; al hablar la charnela la abre de verdad -->
  <g class="zh-fauces">
    <path d="M154,120 C 178,133 206,138 232,130 C 230,148 216,159 196,160 C 176,160 160,144 154,120 Z" fill="#42130e"/>
    <path d="M164,138 C 180,147 202,149 218,142 C 212,155 200,159 188,158 C 177,157 168,148 164,138 Z" fill="#c05548"/>
  </g>
  <!-- DIENTES DE ARRIBA: fila de dientecitos TRIANGULARES individuales
       colgando del labio (grabado), y el COLMILLOTE bajo la trufa -->
  <g fill="${P.diente}" stroke="#6b5a42" stroke-width=".6">
    <path d="M158,122 L 163,131 L 168,124 Z"/>
    <path d="M170,125 L 175,135 L 180,127 Z"/>
    <path d="M182,128 L 187,138 L 192,130 Z"/>
    <path d="M194,130 L 199,140 L 204,131 Z"/>
    <path d="M206,131 L 210,140 L 215,131 Z"/>
    <path d="M217,131 L 220,139 L 225,130 Z"/>
    <path d="M227,128 L 233,152 L 240,127 Z" stroke-width="1"/>
  </g>
  <!-- MANDÍBULA (hueso): mentón chico sombreado + dientecitos de abajo -->
  <g class="zh-hueso zh-mandibula" style="transform-origin:138px 116px">
    <path d="M158,140 C 178,151 200,154 222,148 C 221,156 212,162 199,163 C 183,164 168,157 161,148 C 159,145 158,142 158,140 Z"
      fill="#d4c4a0" stroke="${P.contorno}" stroke-width="2.2"/>
    <g fill="${P.diente}" stroke="#6b5a42" stroke-width=".6">
      <path d="M164,146 L 168,139 L 172,147 Z"/>
      <path d="M175,149 L 179,141 L 183,150 Z"/>
      <path d="M186,151 L 190,143 L 194,151 Z"/>
      <path d="M197,151 L 201,144 L 205,151 Z"/>
      <path d="M208,150 L 212,143 L 216,149 Z"/>
    </g>
    <path d="M166,156 C 180,162 198,164 212,159" fill="none" stroke="#a8946e" stroke-width="2" opacity=".55"/>
  </g>
  <!-- el pliegue de la sonrisa (la comisura que sube a la mejilla) -->
  <path d="M154,120 C 148,116 143,111 140,105" fill="none" stroke="${P.contorno}" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>
  <!-- BIGOTES (vibrisas): el marsupial lee el mundo con ellas -->
  <g class="zh-bigotes zh-bigotesI" style="transform-origin:148px 104px">
    <g fill="none" stroke="#ece2cc" stroke-width="1.3" stroke-linecap="round" opacity=".9">
      <path d="M150,96 C 124,86 98,80 70,80"/>
      <path d="M148,102 C 124,96 100,93 76,94"/>
      <path d="M148,108 C 122,106 96,108 68,114"/>
      <path d="M150,116 C 128,122 106,132 84,144"/>
      <path d="M152,122 C 134,132 118,144 104,158"/>
    </g>
  </g>
  <g class="zh-bigotes zh-bigotesD" style="transform-origin:246px 96px">
    <g fill="none" stroke="#4a3b2c" stroke-width="1.2" stroke-linecap="round" opacity=".8">
      <path d="M248,92 C 268,82 288,74 310,70"/>
      <path d="M250,97 C 272,91 294,88 316,88"/>
      <path d="M250,103 C 272,100 294,100 316,103"/>
      <path d="M248,110 C 268,114 286,120 304,128"/>
      <path d="M246,116 C 264,124 280,134 294,146"/>
    </g>
  </g>
  <!-- LOS OJAZOS NOCTURNOS de grabado: globo oscuro + creciente de luz
       abajo (la luz del ojo antiguo) + chispa arriba. Cejitas de pelo. -->
  <g class="zh-ojoGrupo">
    <circle class="zh-ojoHalo" cx="177" cy="72" r="18" fill="url(#zhOjoHalo)"/>
    <circle class="zh-ojoHalo" cx="240" cy="69" r="16" fill="url(#zhOjoHalo)"/>
    <g class="zh-ojo">
      <circle cx="177" cy="72" r="17.4" fill="none" stroke="#e2d3b2" stroke-width="2.8" opacity=".9"/>
      <circle cx="177" cy="72" r="16" fill="${P.ojo}" stroke="${P.contorno}" stroke-width="1.6"/>
      <path d="M164,78 A 14.5,14.5 0 0 0 185,85" fill="none" stroke="#efe4cc" stroke-width="2" stroke-linecap="round" opacity=".75"/>
      <g class="zh-pupila">
        <circle cx="182.5" cy="65" r="5.4" fill="${P.chispa}"/>
        <circle cx="186" cy="72" r="1.8" fill="${P.chispa}" opacity=".8"/>
        <path d="M168,66 A 10,10 0 0 0 169,79" fill="none" stroke="${P.chispa}" stroke-width="2.2" stroke-linecap="round" opacity=".85"/>
      </g>
      <path class="zh-parpado" style="transform-origin:177px 58px" d="M163,60 C 170,54 186,54 191,61 C 193,68 192,77 188,82 C 181,86 171,85 166,80 C 162,74 161,66 163,60 Z" fill="#4f3f2d"/>
    </g>
    <g class="zh-ojo">
      <ellipse cx="240" cy="69" rx="14.6" ry="15.6" fill="none" stroke="#e2d3b2" stroke-width="2.6" opacity=".9"/>
      <ellipse cx="240" cy="69" rx="13.2" ry="14.2" fill="${P.ojo}" stroke="${P.contorno}" stroke-width="1.6"/>
      <path d="M229,74 A 12,13 0 0 0 246,81" fill="none" stroke="#efe4cc" stroke-width="1.8" stroke-linecap="round" opacity=".75"/>
      <g class="zh-pupila">
        <circle cx="244.5" cy="62" r="5" fill="${P.chispa}"/>
        <circle cx="247" cy="69" r="1.6" fill="${P.chispa}" opacity=".8"/>
        <path d="M232,63 A 9,9 0 0 0 233,75" fill="none" stroke="${P.chispa}" stroke-width="2" stroke-linecap="round" opacity=".85"/>
      </g>
      <path class="zh-parpado" style="transform-origin:240px 55px" d="M228,58 C 234,52 248,52 252,59 C 254,66 253,74 249,79 C 243,83 233,82 229,77 C 226,71 226,63 228,58 Z" fill="#4f3f2d"/>
    </g>
    <!-- cejitas: ticks de pelo sobre el blaze -->
    ${mechones([[184, 52, 5, -4], [192, 50, 5, -3], [225, 48, 4, -4]], '#3c2e1f', 1.4, 0.7)}
  </g>`;
})();

/* ═══════════════════════════ EL SVG COMPLETO ═══════════════════════════════ */

const H = ZH_HUESOS;
const origin = (nombre) => ` style="transform-origin:${H[nombre][0]}px ${H[nombre][1]}px"`;

/**
 * El markup de la zarigüeya de huesos. Autocontenido: defs + huesos + piel.
 * El host le pone los atributos de estado (data-agt-estado / data-modo /
 * data-vida) en su raíz y el CSS (`zariguyaHuesos.css`) hace el resto.
 */
export const ZARIGUYA_HUESOS_SVG = `<svg class="zariguyaHuesos" viewBox="-30 -25 545 500" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Zarigüeya">
${DEFS}
<g class="zh-pj">
  <ellipse class="zh-aura" cx="240" cy="230" rx="290" ry="265" fill="url(#zhAura)"/>
  <g class="zh-masa">
    <g class="zh-antic"${origin('columna')}>
      <ellipse class="zh-sombraSuelo" cx="245" cy="434" rx="175" ry="14" fill="${P.sombraSuelo}" filter="url(#zhBlur)"/>
      <g class="zh-hueso zh-cuerpo"${origin('columna')}>
        ${pierna({ clase: 'zh-piernaLejos', cadera: H.piernaLejos, rodilla: H.rodillaLejos, tobillo: [172, 396], dedos: [[146, 404, 138, 407], [151, 410, 143, 414], [160, 415, 153, 420], [173, 415, 170, 421]], anchoAlto: 30, anchoBajo: 16, muslo: [198, 352, 26, 36], lejos: true })}
        ${COLA}
        ${TRONCO}
        ${pierna({ clase: 'zh-piernaCerca', cadera: H.piernaCerca, rodilla: H.rodillaCerca, tobillo: [302, 414], dedos: [[277, 429, 268, 436], [288, 434, 281, 442], [301, 436, 296, 445], [315, 433, 313, 442]], anchoAlto: 34, anchoBajo: 18, muslo: [308, 352, 40, 46] })}
        ${BRAZO_BRUJULA}
        ${BRAZO_LAPIZ}
        <circle cx="${CASQUETES.cuello[0]}" cy="${CASQUETES.cuello[1]}" r="${CASQUETES.cuello[2]}" fill="url(#zhCuello)"/>
        <g class="zh-hueso zh-cuello"${origin('cuello')}>
          ${CUELLO}
          <!-- cabezaGiro: envoltorio para COMPONER el giro periódico (reloj
               largo) con el ladeo/nivel del hueso cabeza (reloj corto) sin
               que un transform pise al otro. Mismo pivote: el atlas. -->
          <g class="zh-hueso zh-cabezaGiro"${origin('cabeza')}>
            <g class="zh-hueso zh-cabeza"${origin('cabeza')}>
              <!-- ladeo BASE de la lámina: la testa va cocada +4° de fábrica,
                   el hocico cae hacia la brújula (pose, no animación) -->
              <g transform="rotate(4 198 152)">
              ${CABEZA}
              </g>
            </g>
          </g>
        </g>
      </g>
    </g>
  </g>
</g>
</svg>`;

export default ZARIGUYA_HUESOS_SVG;
