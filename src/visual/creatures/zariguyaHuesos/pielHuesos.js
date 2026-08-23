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
  pelaje: '#57493a',        // pelaje pardo profundo (la lámina es sepia OSCURO)
  pelajeOscuro: '#332a20',  // dorso/grupa en penumbra de grabado
  pelajeLuz: '#7c6d59',     // el flanco con luz
  grizzle: '#a8967a',       // las puntas canosas (cálidas) del pelo de guardia
  lanilla: '#cdc1a6',       // ≈ ZARIGUYA_PALETA.panza — lanilla del vientre
  pecho: '#eadfc9',         // el pecho crema profundo de la lámina
  cara: '#f3e8d2',          // = ZARIGUYA_PALETA.cara (la máscara pálida)
  antifaz: '#3b2b19',       // la banda oscura de los ojos (grabado cálido)
  frente: '#857863',        // la raya gris del centro de la frente
  oreja: '#332a23',         // ≈ ZARIGUYA_PALETA.oreja — oreja desnuda oscura
  orejaPiel: '#d492a9',     // ≈ ZARIGUYA_PALETA.orejaPiel a tono lámina
  orejaBorde: '#e9d9c3',    // el ribete pálido del borde de la oreja
  trufa: '#cf7d8e',         // ≈ ZARIGUYA_PALETA.trufa a tono lámina
  cola: '#c39a87',          // = ZARIGUYA_PALETA.cola afinado — piel desnuda
  colaLuz: '#d8b3a0',
  colaAnillo: '#8a6a58',    // el anillado de la piel de la cola
  mano: '#ece2cb',          // manitas pálidas de deditos (NO mitón)
  dedoRosa: '#c9a08d',      // los deditos rosados de los pies
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
  contorno: '#2b2116',      // borde de pelaje oscuro (grabado, NO tinta plana)
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

/* ── EL MOTOR DE PELAMBRE DE CONTORNO ──────────────────────────────────────
   El grabado de la lámina NO es pelo salpicado: son trazos FINOS y DENSOS
   que ABRAZAN la forma (siguen la vuelta del volumen). Para eso: la silueta
   se declara como segmentos cúbicos MUESTREABLES; el pelo son filas de
   trazos tangentes sobre copias concéntricas de esa silueta (hacia adentro),
   y el borde se eriza con flecos que siguen la normal. Determinista. */

/** Punto y tangente de un cúbico en t. */
function bezPunto(p0, c1, c2, p1, t) {
  const u = 1 - t;
  const x = u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0];
  const y = u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1];
  const tx = 3 * u * u * (c1[0] - p0[0]) + 6 * u * t * (c2[0] - c1[0]) + 3 * t * t * (p1[0] - c2[0]);
  const ty = 3 * u * u * (c1[1] - p0[1]) + 6 * u * t * (c2[1] - c1[1]) + 3 * t * t * (p1[1] - c2[1]);
  const n = Math.hypot(tx, ty) || 1;
  return { x, y, tx: tx / n, ty: ty / n };
}

/** Silueta = [p0, [c1,c2,p], [c1,c2,p], …] (cúbicos encadenados, cerrada). */
function silPath(sil) {
  let d = `M${sil[0][0]},${sil[0][1]}`;
  for (let i = 1; i < sil.length; i++) {
    const [c1, c2, p] = sil[i];
    d += ` C ${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p[0]},${p[1]}`;
  }
  return d + ' Z';
}

/** Muestras {x,y,tx,ty} a lo largo de la silueta (nPorSeg por segmento). */
function silMuestras(sil, nPorSeg = 14) {
  const out = [];
  let prev = sil[0];
  for (let i = 1; i < sil.length; i++) {
    const [c1, c2, p] = sil[i];
    for (let k = 0; k < nPorSeg; k++) out.push(bezPunto(prev, c1, c2, p, k / nPorSeg));
    prev = p;
  }
  return out;
}

/** HATCHING DE CONTORNO: filas de pelos tangentes sobre copias de la silueta
    escaladas hacia `centro` (f1 exterior → f0 interior). El pelo FLUYE hacia
    abajo (se voltea si la tangente apunta arriba) — la caída del pelaje. */
function pelambreSil({ sil, centro, filas = 5, f0 = 0.35, f1 = 0.98, nPorSeg = 16,
                       seed = 7, color = '#3d332a', w = 0.9, op = 0.5, largo = 9,
                       salto = 0, desvio = 0 }) {
  const rnd = lcg(seed);
  const base = silMuestras(sil, nPorSeg);
  const [cx, cy] = centro;
  const rad = (desvio * Math.PI) / 180;
  const cosD = Math.cos(rad); const sinD = Math.sin(rad);
  let d = '';
  for (let i = 0; i < filas; i++) {
    const f = filas === 1 ? f1 : f0 + ((f1 - f0) * i) / (filas - 1);
    for (const m of base) {
      if (salto && rnd() < salto) continue;
      const x = cx + (m.x - cx) * f + (rnd() - 0.5) * 3;
      const y = cy + (m.y - cy) * f + (rnd() - 0.5) * 3;
      let tx = m.tx; let ty = m.ty;
      if (ty < 0) { tx = -tx; ty = -ty; }         // el pelo cae, nunca sube
      const dx0 = tx * cosD - ty * sinD; const dy0 = tx * sinD + ty * cosD;
      const L = largo * (0.6 + rnd() * 0.8);
      const bombo = L * 0.22 * (rnd() - 0.3);
      const px = dx0 * L * 0.5 - dy0 * bombo;
      const py = dy0 * L * 0.5 + dx0 * bombo;
      d += `M${x.toFixed(1)},${y.toFixed(1)} q${px.toFixed(1)},${py.toFixed(1)} ${(dx0 * L).toFixed(1)},${(dy0 * L).toFixed(1)}`;
    }
  }
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`;
}

/** FLECOS: mechoncitos cortos sobre el borde MISMO, hacia afuera-abajo —
    la silueta erizada del grabado (jamás un borde liso de sticker). */
function flecosSil({ sil, nPorSeg = 18, seed = 5, color = '#2f2517', w = 1.3,
                     op = 0.85, largo = 5.5, caida = 0.55, salto = 0.25 }) {
  const rnd = lcg(seed);
  let d = '';
  for (const m of silMuestras(sil, nPorSeg)) {
    if (rnd() < salto) continue;
    let nx = -m.ty; let ny = m.tx;               // normal exterior (silueta CCW)
    ny += caida;                                  // el mechón cuelga un poco
    const n = Math.hypot(nx, ny) || 1; nx /= n; ny /= n;
    const L = largo * (0.55 + rnd() * 0.9);
    const bombo = L * 0.3 * (rnd() - 0.5);
    const px = nx * L * 0.5 - ny * bombo;
    const py = ny * L * 0.5 + nx * bombo;
    d += `M${m.x.toFixed(1)},${m.y.toFixed(1)} q${px.toFixed(1)},${py.toFixed(1)} ${(nx * L).toFixed(1)},${(ny * L).toFixed(1)}`;
  }
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`;
}

/** Silueta cúbica de una elipse (kappa .5523) — para pelambrar masas. */
function elipseSil(cx, cy, rx, ry) {
  const k = 0.5523;
  return [
    [cx, cy - ry],
    [[cx + rx * k, cy - ry], [cx + rx, cy - ry * k], [cx + rx, cy]],
    [[cx + rx, cy + ry * k], [cx + rx * k, cy + ry], [cx, cy + ry]],
    [[cx - rx * k, cy + ry], [cx - rx, cy + ry * k], [cx - rx, cy]],
    [[cx - rx, cy - ry * k], [cx - rx * k, cy - ry], [cx, cy - ry]],
  ];
}

/** Pierna trasera: muslo→canilla→pie de deditos, cada tramo su hueso. El
    muslo lleva su MASA (elipse del ancón) además del tubo — la lámina lo
    dibuja como un muslazo peludo. */
function pierna({ clase, cadera, rodilla, tobillo, dedos, anchoAlto, anchoBajo, muslo = null, lejos = false }) {
  const [cx, cy] = cadera; const [rx, ry] = rodilla; const [tx, ty] = tobillo;
  const pelo = lejos ? '#453824' : '#6a5741';
  const piel = lejos ? '#b5947f' : '#c9a08d';
  const og = (x, y) => ` style="transform-origin:${x}px ${y}px"`;
  const dAlto = `M${cx},${cy} C ${cx - 2},${cy + (ry - cy) * 0.5} ${rx - (rx - cx) * 0.2},${ry - 8} ${rx},${ry}`;
  const dBajo = `M${rx},${ry} C ${rx + (tx - rx) * 0.3},${ry + (ty - ry) * 0.55} ${tx},${ty - 7} ${tx},${ty}`;
  const musloSil = muslo ? elipseSil(muslo[0], muslo[1], muslo[2], muslo[3]) : null;
  const masa = muslo
    ? `<ellipse cx="${muslo[0]}" cy="${muslo[1]}" rx="${muslo[2]}" ry="${muslo[3]}" fill="${pelo}" stroke="${P.contorno}" stroke-width="2.6"/>` +
      `<path d="M${muslo[0] - muslo[2] * 0.7},${muslo[1] + muslo[3] * 0.5} Q ${muslo[0]},${muslo[1] + muslo[3] * 1.05} ${muslo[0] + muslo[2] * 0.75},${muslo[1] + muslo[3] * 0.45}" fill="none" stroke="#241b10" stroke-width="4" opacity=".35"/>` +
      /* la LUZ redonda del ancón: arcos de grabado por la cara alta del muslo */
      `<path d="M${muslo[0] - muslo[2] * 0.78},${muslo[1] - muslo[3] * 0.1} Q ${muslo[0] - muslo[2] * 0.1},${muslo[1] - muslo[3] * 0.95} ${muslo[0] + muslo[2] * 0.72},${muslo[1] - muslo[3] * 0.24}" fill="none" stroke="${lejos ? '#7a6a52' : '#b7a184'}" stroke-width="1.5" opacity=".55"/>` +
      `<path d="M${muslo[0] - muslo[2] * 0.6},${muslo[1] + muslo[3] * 0.12} Q ${muslo[0]},${muslo[1] - muslo[3] * 0.55} ${muslo[0] + muslo[2] * 0.58},${muslo[1] - muslo[3] * 0.02}" fill="none" stroke="${lejos ? '#6a5b45' : '#a8916c'}" stroke-width="1.3" opacity=".5"/>` +
      pelambreSil({ sil: musloSil, centro: [muslo[0], muslo[1]], filas: 5, f0: 0.35, f1: 0.95, nPorSeg: 9, seed: lejos ? 41 : 37, color: lejos ? '#1d150c' : '#241b10', w: 0.85, op: 0.5, largo: 8, salto: 0.15 }) +
      pelambreSil({ sil: musloSil, centro: [muslo[0], muslo[1]], filas: 4, f0: 0.35, f1: 0.8, nPorSeg: 8, seed: lejos ? 43 : 47, color: lejos ? '#6a5b45' : '#b7a184', w: 0.75, op: 0.5, largo: 8, salto: 0.3 }) +
      flecosSil({ sil: musloSil, nPorSeg: 9, seed: lejos ? 53 : 49, color: '#2f2517', w: 1.1, op: 0.8, largo: 4.5, salto: 0.35 })
    : '';
  /* pie: palma + 4 deditos LARGOS, finos y con GARRITA (la manita del
     marsupial, inconfundible en la lámina — nunca salchichas rosadas) */
  const deditos = dedos.map(([dx1, dy1, dx2, dy2]) =>
    `<path d="M${tx},${ty + 3} C ${tx + (dx1 - tx) * 0.5},${ty + 7} ${dx1},${dy1 - 4} ${dx2},${dy2}" fill="none" stroke="${P.contorno}" stroke-width="6.2" stroke-linecap="round" opacity=".6"/>` +
    `<path d="M${tx},${ty + 3} C ${tx + (dx1 - tx) * 0.5},${ty + 7} ${dx1},${dy1 - 4} ${dx2},${dy2}" fill="none" stroke="${piel}" stroke-width="4.6" stroke-linecap="round"/>` +
    `<path d="M${dx2},${dy2} l${(dx2 - dx1) * 0.4 - 1},${Math.max(2, (dy2 - dy1) * 0.5)}" fill="none" stroke="#3a2c1c" stroke-width="1.6" stroke-linecap="round" opacity=".85"/>`
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
    <stop offset="0" stop-color="#3a2f20"/>
    <stop offset=".38" stop-color="#55462f"/>
    <stop offset=".78" stop-color="#6f5e44"/>
    <stop offset="1" stop-color="#7f6d52"/>
  </linearGradient>
  <radialGradient id="zhVolumen" cx="238" cy="286" r="130" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#8a7758" stop-opacity=".5"/>
    <stop offset=".55" stop-color="#6f5e44" stop-opacity=".18"/>
    <stop offset=".85" stop-color="#33291b" stop-opacity=".28"/>
    <stop offset="1" stop-color="#241c11" stop-opacity=".5"/>
  </radialGradient>
  <radialGradient id="zhCara" cx="200" cy="80" r="115" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${P.cara}"/>
    <stop offset=".6" stop-color="#e9dcbe"/>
    <stop offset=".88" stop-color="#cbbb9c"/>
    <stop offset="1" stop-color="#a89a82"/>
  </radialGradient>
  <linearGradient id="zhCuello" x1="215" y1="140" x2="228" y2="205" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#3f3527"/>
    <stop offset=".45" stop-color="#5c4f3d"/>
    <stop offset=".78" stop-color="#b0a184"/>
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
    `<path d="${d}" fill="none" stroke="${P.colaAnillo}" stroke-width="${w}" stroke-linecap="butt" stroke-dasharray="1.1 4.6" opacity=".45"/>` +
    /* sombreado del canto: penumbra por el borde de abajo del tubo + hilo de
       luz por el de arriba (la piel escamosa de la lámina, no un tubo plano) */
    `<path d="${d}" fill="none" stroke="#7d5a48" stroke-width="${w * 0.32}" stroke-linecap="round" opacity=".42" transform="translate(1.2 2)"/>` +
    `<path d="${d}" fill="none" stroke="#ecd0bd" stroke-width="${w * 0.2}" stroke-linecap="round" opacity=".45" transform="translate(-1 -2)"/>`;
  return `<g class="zh-hueso zh-colaBase" style="transform-origin:352px 358px">
    <path d="${seg1}" fill="none" stroke="${P.contorno}" stroke-width="16.5" stroke-linecap="round"/>
    <path d="${seg1}" fill="none" stroke="url(#zhCola)" stroke-width="13" stroke-linecap="round"/>
    ${anillos(seg1, 13)}
    <g class="zh-hueso zh-colaMedia" style="transform-origin:448px 368px">
      <circle cx="448" cy="370" r="6.5" fill="url(#zhCola)"/>
      <path d="${seg2}" fill="none" stroke="${P.contorno}" stroke-width="13.5" stroke-linecap="round"/>
      <path d="${seg2}" fill="none" stroke="url(#zhCola)" stroke-width="10.2" stroke-linecap="round"/>
      ${anillos(seg2, 10.2)}
      <g class="zh-hueso zh-colaPunta" style="transform-origin:468px 262px">
        <circle cx="469" cy="264" r="5.2" fill="url(#zhCola)"/>
        <path d="${seg3}" fill="none" stroke="${P.contorno}" stroke-width="9.6" stroke-linecap="round"/>
        <path d="${seg3}" fill="none" stroke="url(#zhCola)" stroke-width="6.8" stroke-linecap="round"/>
        ${anillos(seg3, 6.8)}
        <circle cx="431" cy="258" r="3" fill="${P.colaLuz}" stroke="${P.contorno}" stroke-width="1.2"/>
      </g>
    </g>
  </g>`;
})();

/* ── TRONCO: la pera ERGUIDA del marsupial (masa VERTICAL — la firma
      `postura-erguida` contra el gurre horizontal), un punto más ESBELTA
      que antes (la lámina es digna, no rechoncha). La silueta vive como
      segmentos cúbicos MUESTREABLES: de ella salen el fill, el pelambre
      de contorno (el grabado que abraza la forma) y los flecos del borde. ── */
const TRONCO_SIL = [
  [168, 196],
  [[150, 232], [143, 274], [146, 314]],
  [[150, 352], [168, 386], [202, 400]],
  [[240, 412], [292, 408], [318, 386]],
  [[340, 366], [350, 334], [346, 298]],
  [[342, 254], [326, 220], [300, 194]],
  [[272, 170], [222, 172], [192, 180]],
  [[182, 184], [173, 188], [168, 196]],
];
const TRONCO_PATH = silPath(TRONCO_SIL);
const TRONCO_CENTRO = [240, 296];

const TRONCO = `
  <path d="${TRONCO_PATH}" fill="url(#zhPelaje)" stroke="${P.contorno}" stroke-width="3"/>
  <!-- la VUELTA del volumen: luz en la panza, penumbra hacia todo el borde -->
  <path d="${TRONCO_PATH}" fill="url(#zhVolumen)"/>
  <!-- la grupa y el lomo en penumbra (la vuelta del cilindro, grabado) -->
  <path d="M300,194 C 326,220 342,254 346,298 C 350,334 340,366 318,386 C 330,354 332,310 322,266 C 314,232 308,208 300,194 Z"
    fill="${P.pelajeOscuro}" opacity=".6"/>
  <!-- el LOMO alto tras el cuello también va en penumbra (la lámina carga
       el oscuro arriba del hombro) -->
  <ellipse cx="290" cy="220" rx="42" ry="26" transform="rotate(34 290 220)" fill="#2e2517" opacity=".5"/>
  <!-- PELAMBRE DE CONTORNO: filas densas de trazos finos que SIGUEN la
       silueta (la caligrafía del grabado: tupida y direccional, jamás
       garabatos salpicados). Capas: sombra honda → medio → grizzle de luz. -->
  ${pelambreSil({ sil: TRONCO_SIL, centro: TRONCO_CENTRO, filas: 7, f0: 0.62, f1: 1.0, nPorSeg: 18, seed: 3, color: '#1c140b', w: 0.9, op: 0.6, largo: 11, salto: 0.12 })}
  ${pelambreSil({ sil: TRONCO_SIL, centro: TRONCO_CENTRO, filas: 5, f0: 0.3, f1: 0.56, nPorSeg: 15, seed: 11, color: '#291f11', w: 0.85, op: 0.5, largo: 10, salto: 0.2 })}
  ${pelambreSil({ sil: TRONCO_SIL, centro: TRONCO_CENTRO, filas: 5, f0: 0.48, f1: 0.9, nPorSeg: 15, seed: 19, color: P.grizzle, w: 0.8, op: 0.6, largo: 11, salto: 0.3, desvio: 6 })}
  ${pelambreSil({ sil: TRONCO_SIL, centro: TRONCO_CENTRO, filas: 3, f0: 0.66, f1: 0.82, nPorSeg: 12, seed: 29, color: '#8f7c60', w: 0.75, op: 0.5, largo: 9, salto: 0.4, desvio: -5 })}
  ${pelambreSil({ sil: TRONCO_SIL, centro: TRONCO_CENTRO, filas: 3, f0: 0.9, f1: 1.0, nPorSeg: 20, seed: 23, color: '#171008', w: 0.95, op: 0.65, largo: 8, salto: 0.15, desvio: -8 })}
  <!-- FLECOS: la silueta entera se eriza con mechoncitos hacia afuera -->
  ${flecosSil({ sil: TRONCO_SIL, nPorSeg: 22, seed: 5, color: '#2f2517', w: 1.25, op: 0.9, largo: 5.5 })}
  ${flecosSil({ sil: TRONCO_SIL, nPorSeg: 16, seed: 31, color: '#4a3d2a', w: 1.05, op: 0.7, largo: 8, caida: 0.4, salto: 0.45 })}
  <!-- PECHO/VIENTRE crema (la lanilla clara que baja del mentón) -->
  <path d="M195,202 C 218,194 240,198 252,212 C 263,236 265,274 258,310 C 251,344 235,368 213,373 C 195,375 181,362 174,336 C 166,300 169,254 181,224 C 185,214 190,207 195,202 Z"
    fill="#e6d6ba" opacity=".97"/>
  <path d="M198,208 C 216,201 236,203 248,214 C 236,210 218,209 202,214 Z" fill="#fdf6e6" opacity=".8"/>
  <!-- la sombra del mentón/cuello asienta el pecho (no una losa plana) -->
  <path d="M195,202 C 218,194 240,198 252,212 C 251,221 245,227 235,229 C 216,233 198,227 188,215 C 190,210 192,206 195,202 Z"
    fill="#ab9571" opacity=".45"/>
  <!-- la lanilla del pecho se dibuja con trazos CURVOS que giran con el
       volumen del vientre (grabado), no rayas de barril -->
  <g fill="none" stroke="#a8916a" stroke-width="1.5" stroke-linecap="round" opacity=".85">
    <path d="M196,226 C 191,252 189,282 193,310"/>
    <path d="M209,219 C 204,248 203,284 208,316"/>
    <path d="M224,216 C 221,248 221,286 225,320"/>
    <path d="M239,220 C 239,250 240,284 237,314"/>
    <path d="M250,230 C 253,256 254,288 249,318"/>
    <path d="M199,322 C 202,342 208,357 217,366"/>
    <path d="M232,326 C 233,344 230,357 224,367"/>
    <path d="M186,240 C 181,266 180,296 184,322"/>
  </g>
  <g fill="none" stroke="#9c8560" stroke-width="1.1" stroke-linecap="round" opacity=".6">
    <path d="M202,232 C 198,256 197,284 200,310"/>
    <path d="M216,222 C 213,252 213,286 216,316"/>
    <path d="M231,221 C 229,250 229,284 231,314"/>
    <path d="M245,226 C 246,254 247,286 244,314"/>
    <path d="M208,326 C 210,344 214,357 220,365"/>
  </g>
  <!-- lanilla: el borde del pecho se DESHACE en mechoncitos (nunca un óvalo
       de sticker) — crema hacia afuera + ceniza hacia adentro -->
  <g fill="none" stroke="${P.pecho}" stroke-width="2" stroke-linecap="round" opacity=".9">
    <path d="M179,240 l-6,3 6,4 -6,4"/>
    <path d="M173,272 l-6,2 6,4 -6,3"/>
    <path d="M171,306 l-6,2 6,3 -5,4"/>
    <path d="M176,340 l-6,3 7,3 -5,4"/>
    <path d="M261,246 l6,2 -6,4 7,3"/>
    <path d="M265,282 l6,2 -6,3 6,4"/>
    <path d="M263,318 l6,2 -6,3 5,4"/>
    <path d="M250,350 l6,3 -6,3 5,4"/>
    <path d="M198,206 l-4,-6 8,3 -2,-7"/>
    <path d="M234,206 l3,-6 4,7 5,-6"/>
  </g>
  <g fill="none" stroke="#7d6c52" stroke-width="1.6" stroke-linecap="round" opacity=".6">
    <path d="M185,254 l-5,4 6,3"/>
    <path d="M181,300 l-5,3 6,3"/>
    <path d="M256,268 l5,3 -6,3"/>
    <path d="M252,324 l5,3 -5,3"/>
  </g>
  <!-- el pelaje del cuerpo MUERDE el borde del pecho (transición de pelo,
       no un babero recortado): mechones ceniza entrando desde los lados -->
  ${mechones([
    [176, 236, 7, 6], [172, 262, 7, 5], [170, 292, 7, 5], [172, 322, 7, 5],
    [178, 348, 7, 5], [190, 366, 6, 5],
    [260, 240, -7, 6], [264, 268, -7, 5], [266, 298, -7, 5], [263, 326, -7, 5],
    [254, 350, -6, 5], [240, 366, -5, 5],
  ], '#4a3d2a', 1.7, 0.65)}
  ${mechones([
    [180, 246, 6, 5], [175, 276, 6, 5], [174, 308, 6, 5], [178, 336, 6, 5],
    [258, 254, -6, 5], [263, 284, -6, 5], [261, 314, -6, 5], [250, 342, -5, 5],
  ], '#332a1c', 1.3, 0.5)}
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
    ${pelambre({ cx: 138, cy: 229, rx: 26, ry: 11, ang: 207, n: 30, seed: 63, color: '#241b10', w: 0.85, op: 0.55, largo: 7 })}
    ${pelambre({ cx: 140, cy: 226, rx: 22, ry: 9, ang: 205, n: 16, seed: 69, color: P.grizzle, w: 0.75, op: 0.5, largo: 6 })}
    <g class="zh-hueso zh-brazoLapizAnte" style="transform-origin:${C0[0]}px ${C0[1]}px">
      <circle cx="${C0[0]}" cy="${C0[1]}" r="9.5" fill="url(#zhBrazo)"/>
      <path d="${dBajo}" fill="none" stroke="${P.contorno}" stroke-width="18" stroke-linecap="round"/>
      <path d="${dBajo}" fill="none" stroke="url(#zhBrazo)" stroke-width="14" stroke-linecap="round"/>
      ${pelambre({ cx: 90, cy: 199, rx: 22, ry: 9, ang: 215, n: 24, seed: 73, color: '#241b10', w: 0.8, op: 0.55, largo: 6 })}
      ${pelambre({ cx: 93, cy: 196, rx: 18, ry: 8, ang: 213, n: 13, seed: 77, color: P.grizzle, w: 0.7, op: 0.5, largo: 5 })}
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
    ${pelambre({ cx: 187, cy: 243, rx: 13, ry: 13, ang: 138, n: 16, seed: 81, color: '#241b10', w: 0.8, op: 0.55, largo: 6 })}
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
  ${pelambre({ cx: 222, cy: 182, rx: 44, ry: 22, ang: 100, n: 44, seed: 67, color: '#3a2f20', w: 0.9, op: 0.6, largo: 9 })}
  ${pelambre({ cx: 224, cy: 192, rx: 40, ry: 14, ang: 96, n: 24, seed: 71, color: '#8f7c60', w: 0.8, op: 0.5, largo: 7 })}`;

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
  <!-- el CASQUETE GRIS de la coronilla (la lámina no es calva: entre las
       orejas el pelo es ceniza, y el blaze crema lo parte al medio) -->
  <path d="M122,60 C 118,36 130,15 154,9 C 180,3 212,3 234,10 C 252,16 261,30 263,45 C 246,36 226,32 206,33 C 184,34 158,41 141,51 C 131,56 124,58 122,60 Z"
    fill="#6b5c48" opacity=".8"/>
  ${pelambre({ cx: 190, cy: 26, rx: 58, ry: 16, ang: 96, n: 44, seed: 91, color: '#4a3d2b', w: 0.85, op: 0.6, largo: 7 })}
  ${mechones([
    [146, 48, -3, 6], [162, 42, -2, 6], [180, 38, -1, 6], [200, 36, 0, 6],
    [220, 36, 1, 6], [238, 40, 2, 6], [252, 46, 3, 5],
  ], '#5d4e3a', 1.4, 0.7)}
  <!-- LAS DOS MÁSCARAS: de la base de CADA oreja bajan y ENVUELVEN el ojo
       hasta el pómulo (el ojo vive DENTRO del oscuro; solo la chispa gana).
       Pardo de grabado con borde que se DESHACE en pelo — jamás un parche
       negro duro. -->
  <path d="M138,38 C 150,25 166,22 178,31 C 189,41 195,56 194,73 C 193,90 184,102 171,104 C 157,105 144,95 139,79 C 135,65 134,50 138,38 Z"
    fill="#46341f" opacity=".9"/>
  <path d="M226,32 C 237,25 250,27 257,38 C 263,50 262,67 256,82 C 250,96 240,103 230,99 C 221,94 217,81 218,66 C 220,52 222,41 226,32 Z"
    fill="#46341f" opacity=".9"/>
  <!-- la ÓRBITA honda: el ojo se asienta en lo MÁS oscuro de la máscara -->
  <ellipse cx="177" cy="71" rx="17" ry="16" fill="#231708" opacity=".9"/>
  <ellipse cx="239" cy="67" rx="15" ry="14.5" fill="#231708" opacity=".9"/>
  <!-- el borde de la máscara se DESVANECE: pelo crema que entra de afuera -->
  ${mechones([
    [146, 34, 4, 7], [138, 52, 5, 5], [136, 70, 5, 4], [142, 88, 5, 3],
    [154, 100, 4, 4], [186, 40, -4, 6], [192, 58, -4, 5], [192, 80, -4, 4],
    [230, 36, 3, 6], [220, 56, 4, 5], [220, 74, 4, 4], [228, 94, 3, 4],
    [254, 44, -4, 5], [258, 62, -4, 4], [254, 80, -4, 4],
  ], '#e8dabb', 1.3, 0.55)}
  <!-- la CEJA clara sobre la máscara (la expresión pícara-amable) -->
  <path d="M159,50 C 168,44 182,42 193,46" fill="none" stroke="#eddfbe" stroke-width="2.8" stroke-linecap="round" opacity=".95"/>
  <path d="M224,46 C 233,41 246,40 256,44" fill="none" stroke="#eddfbe" stroke-width="2.6" stroke-linecap="round" opacity=".95"/>
  <!-- el pelo de las máscaras SIGUE su caída (grabado fino, no mancha) -->
  ${pelambre({ cx: 160, cy: 56, rx: 26, ry: 20, ang: 52, n: 34, seed: 51, color: '#1c1206', w: 0.8, op: 0.55, largo: 7 })}
  ${pelambre({ cx: 166, cy: 94, rx: 20, ry: 12, ang: 60, n: 18, seed: 52, color: '#1c1206', w: 0.8, op: 0.5, largo: 6 })}
  ${pelambre({ cx: 242, cy: 52, rx: 17, ry: 18, ang: 105, n: 24, seed: 53, color: '#1c1206', w: 0.8, op: 0.55, largo: 6 })}
  ${pelambre({ cx: 234, cy: 88, rx: 14, ry: 12, ang: 112, n: 14, seed: 54, color: '#1c1206', w: 0.8, op: 0.5, largo: 6 })}
  <!-- las máscaras se deshilachan en pelo (borde vivo, no sticker) -->
  ${mechones([
    [140, 100, -6, 5], [132, 82, -7, 2], [131, 60, -6, -3], [140, 38, -4, -6],
    [152, 28, -2, -6], [176, 100, 4, 6], [188, 92, 4, 5],
    [226, 98, -2, 6], [222, 38, -2, -5], [254, 88, 4, 4], [261, 62, 6, 0],
    [262, 44, 5, -3],
  ], '#241708', 1.5, 0.8)}
  <!-- el BLAZE claro de la frente (de la coronilla BAJA hasta el hocico,
       partiendo las dos máscaras) con su pelito -->
  <path d="M186,8 C 196,5 208,6 215,10 C 213,42 210,76 208,98 C 205,107 197,109 192,101 C 189,74 187,40 186,8 Z"
    fill="#f6ecd6" opacity=".97"/>
  ${mechones([
    [194, 20, 1, 8], [199, 44, 1, 8], [202, 68, 0, 8], [203, 88, 0, 7],
  ], '#d9c9a8', 1.5, 0.7)}
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
  <!-- MEJILLAS: el pómulo bajo la máscara se dibuja con trazos finos que
       giran con el cachete (grabado — la cara no es un fill liso) -->
  ${pelambre({ cx: 148, cy: 116, rx: 16, ry: 18, ang: 108, n: 16, seed: 93, color: '#b7a583', w: 0.75, op: 0.45, largo: 5 })}
  ${pelambre({ cx: 244, cy: 96, rx: 12, ry: 12, ang: 82, n: 12, seed: 97, color: '#b7a583', w: 0.8, op: 0.55, largo: 5 })}
  <!-- el HOCICO: una CUÑA fina que baja del blaze, se AFILA y SOBRESALE de
       la silueta de la cara hasta la trufa (el perfil puntudo del
       marsupial — la nariz vive en la PUNTA, no flotando en la cara) -->
  <path d="M160,106 C 174,94 196,88 216,90 C 234,92 248,100 254,110 C 256,116 252,122 244,125 C 224,131 194,131 174,125 C 163,121 157,113 160,106 Z"
    fill="#f2e6cc"/>
  <!-- definición SOLO en la punta que sobresale (nada de gafas arriba) -->
  <path d="M236,92 C 245,96 252,102 254,110" fill="none" stroke="${P.contorno}" stroke-width="1.8" stroke-linecap="round" opacity=".6"/>
  <path d="M174,125 C 194,131 224,131 244,125 C 252,122 256,116 254,110" fill="none" stroke="#c3b294" stroke-width="2" opacity=".7"/>
  <!-- pecas de vibrisas sobre el labio -->
  <g fill="${P.antifaz}" opacity=".6">
    <circle cx="200" cy="116" r="1.2"/><circle cx="210" cy="119" r="1.1"/><circle cx="205" cy="124" r="1.1"/>
    <circle cx="217" cy="114" r="1.1"/><circle cx="221" cy="122" r="1"/><circle cx="195" cy="123" r="1"/>
  </g>
  <!-- FAUCES (detrás de la mandíbula): interior HONDO + lengua ABAJO y al
       fondo (casi oculta) — la lámina sonríe ENTREABIERTA; al hablar la
       charnela la abre de verdad -->
  <g class="zh-fauces">
    <path d="M152,121 C 172,135 198,143 220,141 C 232,139 241,131 246,122 C 247,131 242,142 233,149 C 213,160 180,156 165,144 C 158,138 153,130 152,121 Z" fill="#380f0a"/>
    <path d="M180,146 C 192,151 206,151 217,144 C 212,153 200,156 191,154 C 185,152 182,150 180,146 Z" fill="#b34d42"/>
  </g>
  <!-- DIENTES DE ARRIBA: banda FINA y APRETADA colgando del labio (dientes
       menuditos de grabado separados por festones, no triángulos sueltos),
       más el colmillito de la comisura y el COLMILLO bajo la trufa -->
  <g>
    <path d="M153,121 C 172,134 196,142 218,139 C 231,137 240,130 245,122 L 245,127 C 240,134 230,141 218,144 C 196,147 171,139 153,126 Z"
      fill="#fbf5e4"/>
    <g stroke="#6b5a42" stroke-width=".9" opacity=".8">
      <path d="M163,129 l1,5"/><path d="M172,133 l1,5"/><path d="M181,137 l1,5"/>
      <path d="M190,139 l.5,5"/><path d="M199,141 l0,5"/><path d="M208,142 l0,4.5"/>
      <path d="M216,141 l0,4.5"/><path d="M224,139 l-.5,4.5"/><path d="M232,135 l-1,4"/>
    </g>
    <path d="M154,123 L 159,135 L 164,127 Z" fill="#fbf5e4" stroke="#6b5a42" stroke-width=".7"/>
    <path d="M234,125 L 239,143 L 244,124 Z" fill="#fbf5e4" stroke="#6b5a42" stroke-width=".9"/>
    <!-- la RANURA oscura entre filas (la boca entreabierta se LEE) + la
         sombra del labio sobre los dientes (contraste de grabado) -->
    <path d="M156,128 C 174,141 198,148 220,145 C 231,143 239,136 244,128" fill="none" stroke="#2b1108" stroke-width="2.6" stroke-linecap="round" opacity=".85"/>
    <path d="M155,124 C 173,137 197,144 219,141 C 231,139 239,132 244,124" fill="none" stroke="#7a6647" stroke-width="1.2" stroke-linecap="round" opacity=".6"/>
  </g>
  <!-- MANDÍBULA (hueso): mentón fino sombreado + su banda de dientecitos.
       En reposo casi CIERRA (solo una ranura oscura entre filas — la
       sonrisa entreabierta de la lámina); al hablar la charnela abre. -->
  <g class="zh-hueso zh-mandibula" style="transform-origin:138px 116px">
    <path d="M158,136 C 178,149 204,152 228,145 C 226,155 215,161 200,162 C 183,162 168,155 161,146 C 159,142 158,139 158,136 Z"
      fill="#d4c4a0" stroke="${P.contorno}" stroke-width="2.2"/>
    <path d="M160,137 C 180,149 204,151 226,145 L 225,142 C 204,148 181,145 162,134 Z" fill="${P.diente}"/>
    <g stroke="#6b5a42" stroke-width=".8" opacity=".75">
      <path d="M168,139 l.5,4"/><path d="M177,143 l.5,4"/><path d="M186,145 l0,4"/>
      <path d="M195,146 l0,4"/><path d="M204,146 l0,4"/><path d="M213,145 l-.5,4"/>
      <path d="M221,143 l-.5,4"/>
    </g>
    <path d="M166,153 C 180,159 198,160 213,156" fill="none" stroke="#a8946e" stroke-width="1.8" opacity=".55"/>
  </g>
  <!-- el LABIO de la sonrisa: una sola curva SEGURA de comisura a trufa
       (el trazo que manda en la cara, como el grabado) + el pliegue que
       sube a la mejilla -->
  <path d="M150,119 C 172,134 198,142 220,140 C 232,138 241,130 246,121" fill="none" stroke="${P.contorno}" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M150,119 C 145,114 141,108 139,101" fill="none" stroke="${P.contorno}" stroke-width="1.8" stroke-linecap="round" opacity=".6"/>
  <path d="M152,124 C 158,131 166,137 175,141" fill="none" stroke="#8a7452" stroke-width="1.4" stroke-linecap="round" opacity=".5"/>
  <!-- la TRUFA rosada protagónica en la PUNTA de la cuña (firma) -->
  <path d="M236,106 C 241,99 253,98 258,104 C 263,110 262,121 256,126 C 249,132 239,130 235,123 C 233,118 233,111 236,106 Z"
    fill="#d18a92" stroke="${P.contorno}" stroke-width="1.8"/>
  <path d="M243,112 Q 245,108 249,109 M254,113 Q 253,109 249,109" fill="none" stroke="#8f4a58" stroke-width="1.4" stroke-linecap="round"/>
  <ellipse cx="242" cy="105" rx="3.4" ry="2" fill="#eab9bd" opacity=".9"/>
  <path d="M238,121 C 243,125 250,126 255,122" fill="none" stroke="#a05a64" stroke-width="1.3" opacity=".6"/>
  <!-- BIGOTES (vibrisas): el marsupial lee el mundo con ellas -->
  <g class="zh-bigotes zh-bigotesI" style="transform-origin:148px 104px">
    <g fill="none" stroke="#e6d9bd" stroke-width="1" stroke-linecap="round" opacity=".75">
      <path d="M152,98 C 126,88 100,82 72,82"/>
      <path d="M150,105 C 124,100 98,98 72,100"/>
      <path d="M150,112 C 126,114 102,120 80,130"/>
      <path d="M152,119 C 132,128 114,140 98,154"/>
    </g>
  </g>
  <g class="zh-bigotes zh-bigotesD" style="transform-origin:246px 96px">
    <g fill="none" stroke="#6e5a40" stroke-width=".9" stroke-linecap="round" opacity=".6">
      <path d="M250,94 C 270,85 290,79 312,76"/>
      <path d="M251,101 C 273,97 295,96 316,98"/>
      <path d="M249,108 C 269,112 288,118 306,127"/>
      <path d="M247,114 C 264,122 279,132 292,144"/>
    </g>
  </g>
  <!-- LOS OJAZOS NOCTURNOS de grabado: globo oscuro + creciente de luz
       abajo (la luz del ojo antiguo) + chispa arriba. Cejitas de pelo. -->
  <g class="zh-ojoGrupo">
    <circle class="zh-ojoHalo" cx="177" cy="72" r="18" fill="url(#zhOjoHalo)"/>
    <circle class="zh-ojoHalo" cx="240" cy="69" r="16" fill="url(#zhOjoHalo)"/>
    <g class="zh-ojo">
      <circle cx="177" cy="72" r="14.2" fill="${P.ojo}" stroke="${P.contorno}" stroke-width="1.6"/>
      <path d="M166,80 A 13,13 0 0 0 187,82" fill="none" stroke="#7a5632" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>
      <path d="M165,77 A 13,13 0 0 0 184,83" fill="none" stroke="#efe4cc" stroke-width="1.5" stroke-linecap="round" opacity=".75"/>
      <g class="zh-pupila">
        <circle cx="182" cy="66.5" r="5.6" fill="${P.chispa}"/>
        <circle cx="186" cy="74" r="1.7" fill="${P.chispa}" opacity=".85"/>
      </g>
      <path d="M163,64 A 15,15 0 0 1 190,64.5" fill="none" stroke="#1c1206" stroke-width="3" stroke-linecap="round"/>
      <path class="zh-parpado" style="transform-origin:177px 58px" d="M163,60 C 170,54 186,54 191,61 C 193,68 192,77 188,82 C 181,86 171,85 166,80 C 162,74 161,66 163,60 Z" fill="#4f3f2d"/>
    </g>
    <g class="zh-ojo">
      <ellipse cx="240" cy="69" rx="11.8" ry="12.8" fill="${P.ojo}" stroke="${P.contorno}" stroke-width="1.6"/>
      <path d="M231,76 A 10.5,11.5 0 0 0 248,77" fill="none" stroke="#7a5632" stroke-width="2.2" stroke-linecap="round" opacity=".8"/>
      <path d="M230,73 A 10.5,11.5 0 0 0 245,79" fill="none" stroke="#efe4cc" stroke-width="1.4" stroke-linecap="round" opacity=".75"/>
      <g class="zh-pupila">
        <circle cx="244" cy="63.5" r="5" fill="${P.chispa}"/>
        <circle cx="247" cy="70" r="1.5" fill="${P.chispa}" opacity=".85"/>
      </g>
      <path d="M229,60 A 13,13 0 0 1 252,60" fill="none" stroke="#1c1206" stroke-width="2.8" stroke-linecap="round"/>
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
                   el hocico cae hacia la brújula (pose, no animación) + un
                   6% menos de testa (proporción digna contra el cuerpo) -->
              <g transform="rotate(4 198 152) translate(198 152) scale(.94) translate(-198 -152)">
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
