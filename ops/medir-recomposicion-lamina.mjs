#!/usr/bin/env node
/*
 * Medición común del lote lámina-viva.
 *
 * Uso:
 *   node ops/medir-recomposicion-lamina.mjs \
 *     --creature oso --worktree /ruta/al/worktree
 *   node ops/medir-recomposicion-lamina.mjs \
 *     --creature oso --worktree /ruta/al/worktree --control self
 *   node ops/medir-recomposicion-lamina.mjs \
 *     --creature oso --worktree /ruta/al/worktree --control drop --drop cabeza
 *
 * La misma función de métricas se usa para los cinco sujetos y para los dos
 * controles. Las capas se expresan como alfa ideal antes del redondeo del
 * canvas, pero también se mide el resultado redondeado a 8 bits.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const args = process.argv.slice(2).reduce((out, value, index, values) => {
  if (!value.startsWith('--')) return out;
  out[value.slice(2)] = values[index + 1] && !values[index + 1].startsWith('--')
    ? values[index + 1]
    : true;
  return out;
}, {});

const CREATURES = {
  jaguar: { dir: 'jaguarLamina', anatomy: 'anatomia.js', image: 'jaguar-natural.png' },
  oso: { dir: 'osoLamina', anatomy: 'anatomia.js', image: 'oso.png' },
  zariguya: { dir: 'zariguyaLamina', anatomy: 'anatomia.js', image: 'zariguya.png' },
  luciernaga: { dir: 'luciernagaLamina', anatomy: 'anatomia.js', image: 'luciernaga.png' },
  chivito: { dir: 'chivitoLamina', anatomy: 'anatomia.js', image: 'chivito-punk.png' },
};

const creature = String(args.creature || '');
const root = path.resolve(String(args.worktree || process.cwd()));
if (!CREATURES[creature]) throw new Error(`--creature inválido: ${creature}`);
const spec = CREATURES[creature];
const base = path.join(root, 'src', 'visual', 'creatures', spec.dir);
const publicImage = path.join(root, 'public', 'compai', 'laminas', spec.image);
const anatomy = (await import(pathToFileURL(path.join(base, spec.anatomy)).href)).default
  || await import(pathToFileURL(path.join(base, spec.anatomy)).href);

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ss = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const fxBox = (x, { x0, x1, xFade }) => ss(x0, x0 + xFade, x) * (1 - ss(x1 - xFade, x1, x));
const lerp = (a, b, t) => a + (b - a) * t;
const interp = (points, value) => {
  if (value <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i += 1) {
    if (value <= points[i][0]) {
      return lerp(points[i - 1][1], points[i][1], (value - points[i - 1][0]) / (points[i][0] - points[i - 1][0]));
    }
  }
  return points[points.length - 1][1];
};

const rgba = async (file) => sharp(file).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
const alphaFromFile = async (file, width, height) => {
  const { data, info } = await rgba(file);
  if (info.width !== width || info.height !== height) {
    throw new Error(`dimensiones inesperadas en ${file}: ${info.width}x${info.height}, esperaba ${width}x${height}`);
  }
  const alpha = new Float32Array(width * height);
  for (let p = 0; p < alpha.length; p += 1) alpha[p] = data[p * 4 + 3] / 255;
  return alpha;
};

const maskLayers = async (source, width, height, definitions) => {
  const layers = {};
  for (const [name, mask] of Object.entries(definitions)) {
    const alpha = new Float32Array(width * height);
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      const p = y * width + x;
      alpha[p] = source[p] * clamp(mask(x, y), 0, 1);
    }
    layers[name] = alpha;
  }
  return layers;
};

function osoDefinitions() {
  const { CABEZA, OREJA_IZQ, OREJA_DER, MANDIBULA, CORONA } = anatomy;
  const interpolarY = (points, x) => interp(points, x);
  const mascaraCabeza = (x, y, subir = 0) => {
    const yCorte = interpolarY(CABEZA.cuello.puntos, x) - subir;
    return fxBox(x, CABEZA.box) * (1 - ss(yCorte - CABEZA.cuello.fade, yCorte + CABEZA.cuello.fade, y));
  };
  const oreja = (x, y, { box, base }) => fxBox(x, box) * (1 - ss(base.y0, base.y1, y));
  const orejaSub = (x, y, { box, baseSub }) => fxBox(x, box) * (1 - ss(baseSub.y0, baseSub.y1, y));
  const mandibula = (x, y) => fxBox(x, MANDIBULA.box)
    * ss(interpolarY(MANDIBULA.labio.puntos, x) - MANDIBULA.labio.fade, interpolarY(MANDIBULA.labio.puntos, x) + MANDIBULA.labio.fade, y)
    * (1 - ss(MANDIBULA.menton.y0, MANDIBULA.menton.y1, y));
  const corona = (x, y) => fxBox(x, CORONA.box) * (1 - ss(CORONA.base.y0, CORONA.base.y1, y));
  const coronaSub = (x, y) => fxBox(x, CORONA.box) * (1 - ss(CORONA.baseSub.y0, CORONA.baseSub.y1, y));
  const hard = (m) => 1 - ss(0.93, 1, m);
  const head = (x, y) => mascaraCabeza(x, y);
  return {
    cuerpo: (x, y) => hard(mascaraCabeza(x, y, CABEZA.cuelloSub)) * hard(coronaSub(x, y)),
    corona: (x, y) => corona(x, y) * (1 - head(x, y)),
    cabeza: (x, y) => head(x, y) * (1 - orejaSub(x, y, OREJA_IZQ)) * (1 - orejaSub(x, y, OREJA_DER))
      * (1 - mandibula(x, y) * head(x, y)),
    mandibula: (x, y) => mandibula(x, y) * head(x, y),
    orejaIzq: (x, y) => oreja(x, y, OREJA_IZQ) * head(x, y),
    orejaDer: (x, y) => oreja(x, y, OREJA_DER) * head(x, y),
  };
}

function zariguyaDefinitions() {
  const { mascaras } = anatomy.__capas;
  return mascaras();
}

function luciernagaDefinitions() {
  const { CABEZA, ANTENA_IZQ, ANTENA_DER, MANDIBULA, MANO_LAPIZ, LINTERNA, PIERNA_IZQ, PIERNA_DER } = anatomy;
  const cabeza = (x, y) => fxBox(x, CABEZA.box) * (1 - ss(CABEZA.cuello.y0, CABEZA.cuello.y1, y));
  const antena = (x, y, a) => fxBox(x, a.box) * (1 - ss(a.base.y0, a.base.y1, y));
  const antenaSub = (x, y, a) => fxBox(x, a.box) * (1 - ss(a.baseSub.y0, a.baseSub.y1, y));
  const mandibula = (x, y) => fxBox(x, MANDIBULA.box) * ss(MANDIBULA.labio.y0, MANDIBULA.labio.y1, y)
    * (1 - ss(MANDIBULA.menton.y0, MANDIBULA.menton.y1, y)) * cabeza(x, y);
  const cabezaRender = (x, y) => cabeza(x, y) * (1 - antenaSub(x, y, ANTENA_IZQ))
    * (1 - antenaSub(x, y, ANTENA_DER)) * (1 - mandibula(x, y));
  const mano = (x, y) => fxBox(x, MANO_LAPIZ.box) * ss(MANO_LAPIZ.techo.y0, MANO_LAPIZ.techo.y1, y)
    * (1 - ss(MANO_LAPIZ.muneca.y0, MANO_LAPIZ.muneca.y1, y)) * (1 - cabeza(x, y));
  const bandaPierna = (x, y, p) => {
    const dx = p.x1 - p.x0; const dy = p.y1 - p.y0;
    const t = clamp(((x - p.x0) * dx + (y - p.y0) * dy) / (dx * dx + dy * dy), 0, 1);
    const d = Math.hypot(x - (p.x0 + t * dx), y - (p.y0 + t * dy));
    return 1 - ss(p.medio, p.medio + 6, d);
  };
  const linterna = (x, y) => {
    const nx = (x - LINTERNA.cx) / LINTERNA.rx; const ny = (y - LINTERNA.cy) / LINTERNA.ry;
    return (1 - ss(0.85, 1.03, Math.hypot(nx, ny)))
      * (1 - bandaPierna(x, y, PIERNA_IZQ)) * (1 - bandaPierna(x, y, PIERNA_DER));
  };
  const hard = (m) => 1 - ss(0.93, 1, m);
  return {
    cuerpo: (x, y) => hard(cabeza(x, y)) * hard(antena(x, y, ANTENA_IZQ)) * hard(antena(x, y, ANTENA_DER))
      * hard(mano(x, y)) * hard(linterna(x, y)),
    cabeza: cabezaRender,
    mandibula,
    antenaIzq: (x, y) => antena(x, y, ANTENA_IZQ),
    antenaDer: (x, y) => antena(x, y, ANTENA_DER),
    manoLapiz: mano,
    linterna,
  };
}

function chivitoDefinitions() {
  const { CABEZA, MANDIBULA, MANO_LAPIZ } = anatomy;
  const cabeza = (x, y) => fxBox(x, CABEZA.box) * (1 - ss(CABEZA.cuello.y0, CABEZA.cuello.y1, y));
  const mandibula = (x, y) => fxBox(x, MANDIBULA.box) * ss(MANDIBULA.labio.y0, MANDIBULA.labio.y1, y)
    * (1 - ss(MANDIBULA.menton.y0, MANDIBULA.menton.y1, y)) * cabeza(x, y);
  const cabezaRender = (x, y) => cabeza(x, y) * (1 - mandibula(x, y));
  const mano = (x, y) => {
    const { box, techo, muneca } = MANO_LAPIZ;
    const xN = clamp(x, 0, box.x1) / box.x1;
    const borde = muneca.y0 + muneca.caidaIzq * (1 - xN);
    return fxBox(x, box) * ss(techo.y0, techo.y1, y) * (1 - ss(borde, borde + muneca.alto, y))
      * (1 - cabeza(x, y));
  };
  const hard = (m) => 1 - ss(0.93, 1, m);
  return { cuerpo: (x, y) => hard(cabeza(x, y)) * hard(mano(x, y)), cabeza: cabezaRender, mandibula, manoLapiz: mano };
}

async function definitionsFor(name, source, width, height) {
  if (name === 'oso') return maskLayers(source, width, height, osoDefinitions());
  if (name === 'luciernaga') return maskLayers(source, width, height, luciernagaDefinitions());
  if (name === 'chivito') return maskLayers(source, width, height, chivitoDefinitions());
  if (name === 'zariguya') {
    const modulePath = path.join(base, 'capas.js');
    const layerModule = await import(pathToFileURL(modulePath).href);
    anatomy.__capas = layerModule;
    const all = zariguyaDefinitions();
    const order = ['mCola', 'mCuerpo', 'mBrazoBrujula', 'mBrazoLapiz', 'mCabezaRender', 'mMandibula', 'mOrejaIzq', 'mOrejaDer'];
    const layers = await maskLayers(source, width, height, Object.fromEntries(order.map((key) => [key, all[key]])));
    const { x0, x1, y0, y1, dx, dy, umbral } = anatomy.INPAINT_PECHO;
    const body = layers.mCuerpo;
    for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) {
      const m = all.mBrazoBrujula(x, y);
      if (m <= umbral) continue;
      const sourceX = clamp(x + dx, 0, width - 1);
      const sourceY = clamp(y + dy, 0, height - 1);
      const sourceAlpha = source[sourceY * width + sourceX] * ss(umbral, umbral + 0.25, m);
      const p = y * width + x;
      body[p] = body[p] + sourceAlpha * (1 - body[p]);
    }
    return layers;
  }
  if (name === 'jaguar') return jaguarLayers(source, width, height);
  throw new Error(`sin definición para ${name}`);
}

async function jaguarLayers(source, width, height) {
  const { CABEZA, PATAS_DEL, OREJA_IZQ, OREJA_DER, MANDIBULA, CORTE_PATAS_DEL, RIG_MARCHA } = anatomy;
  const head = (x, y) => {
    const u = CABEZA.cuello.nx * (x - CABEZA.cuello.px) + CABEZA.cuello.ny * (y - CABEZA.cuello.py);
    return (1 - ss(CABEZA.cuello.u0, CABEZA.cuello.u1, u)) * (1 - ss(CABEZA.fadeMandibula.y0, CABEZA.fadeMandibula.y1, y));
  };
  const appendage = (x, y, { box, joint }) => fxBox(x, box) * ss(joint.y0, joint.y1, y);
  const orange = (x, y) => {
    const u = CORTE_PATAS_DEL.nx * (x - CORTE_PATAS_DEL.px) + CORTE_PATAS_DEL.ny * (y - CORTE_PATAS_DEL.py);
    return appendage(x, y, PATAS_DEL) * ss(CORTE_PATAS_DEL.u0, CORTE_PATAS_DEL.u1, u) * (1 - head(x, y));
  };
  const points = [[200, 545], [206, 547], [212, 550], [218, 553], [224, 555], [230, 558], [236, 562], [242, 565], [248, 569], [254, 574], [260, 578], [266, 584], [272, 592], [278, 600], [284, 612], [290, 631]];
  const xTail = (y) => (y > 292 ? 700 : interp(points, y));
  const tailWindow = (x, y) => {
    const noTail = 1 - ss(xTail(y) - 6, xTail(y) - 1, x);
    const xSliv = interp([[210, 545], [232, 540], [254, 522]], y);
    const sliver = ss(498, 504, x) * (1 - ss(xSliv - 3, xSliv + 2, x)) * ss(208, 215, y) * (1 - ss(246, 254, y)) * noTail;
    const xStr = interp([[250, 556], [270, 547], [290, 536]], y);
    const strip = ss(xStr - 3, xStr + 3, x) * (1 - ss(586, 592, x)) * ss(246, 254, y) * (1 - ss(288, 296, y)) * noTail;
    const libre = ss(514, 520, x) * (1 - ss(592, 598, x)) * ss(288, 296, y) * (1 - ss(372, 378, y));
    return Math.max(sliver, Math.max(strip, libre));
  };
  const cola = (x, y) => ss(-20, 20, x - 465) * (1 - head(x, y))
    * (1 - ss(228, 258, y) * ss(455, 470, x) * (1 - ss(575, 590, x))) * (1 - tailWindow(x, y));
  const oreja = (x, y, a) => fxBox(x, a.box) * (1 - ss(a.base.y0, a.base.y1, y));
  const orejaSub = (x, y, a) => fxBox(x, a.box) * (1 - ss(a.baseSub.y0, a.baseSub.y1, y));
  const mandibula = (x, y) => fxBox(x, MANDIBULA.box) * ss(MANDIBULA.labio.y0, MANDIBULA.labio.y1, y)
    * (1 - ss(MANDIBULA.menton.y0, MANDIBULA.menton.y1, y));
  const split = (alpha, cut) => {
    const out = {};
    for (const [part, range] of [['sup', [10, 8]], ['inf', [-14, 6]]]) {
      const arr = new Float32Array(width * height);
      for (let y = 0; y < height; y += 1) {
        const mask = part === 'sup'
          ? 1 - ss(cut + range[0] - range[1], cut + range[0], y)
          : ss(cut + range[0], cut + range[0] + range[1], y);
        for (let x = 0; x < width; x += 1) arr[y * width + x] = alpha[y * width + x] * mask;
      }
      out[part] = arr;
    }
    return out;
  };
  const layers = {};
  for (const [name, file] of Object.entries({
    cuerpo: 'cuerpo-inpaint.png', delLejana: 'pata-del-lejana.png', trasCercana: 'pata-tras-cercana.png', trasLejana: 'pata-tras-lejana.png',
  })) {
    const alpha = await alphaFromFile(path.join(root, 'public', 'compai', 'laminas', 'jaguar-rig', file), width, height);
    if (name === 'cuerpo') layers[name] = alpha;
    else {
      const rig = RIG_MARCHA[name];
      const halves = split(alpha, rig.rodillaCorte);
      layers[`${name}-sup`] = halves.sup;
      layers[`${name}-inf`] = halves.inf;
    }
  }
  const masked = await maskLayers(source, width, height, {
    delCercana: orange,
    cola,
    cabeza: (x, y) => head(x, y) * (1 - orejaSub(x, y, OREJA_IZQ)) * (1 - orejaSub(x, y, OREJA_DER)) * (1 - mandibula(x, y) * head(x, y)),
    orejaIzq: (x, y) => oreja(x, y, OREJA_IZQ) * head(x, y),
    orejaDer: (x, y) => oreja(x, y, OREJA_DER) * head(x, y),
    mandibula: (x, y) => mandibula(x, y) * head(x, y),
  });
  const orangeHalves = split(masked.delCercana, RIG_MARCHA.delCercana.rodillaCorte);
  layers['delCercana-sup'] = orangeHalves.sup;
  layers['delCercana-inf'] = orangeHalves.inf;
  for (const [name, alpha] of Object.entries(masked)) if (name !== 'delCercana') layers[name] = alpha;
  return layers;
}

async function buildLayers() {
  const { data, info } = await rgba(publicImage);
  const source = new Float64Array(info.width * info.height);
  for (let p = 0; p < source.length; p += 1) source[p] = data[p * 4 + 3] / 255;
  return { source, layers: await definitionsFor(creature, source, info.width, info.height), width: info.width, height: info.height };
}

function metrics(source, layers, width, height) {
  let visible = 0; let transparent = 0; let deficit = 0; let maxDeficit = 0; let mismatch8 = 0;
  for (let p = 0; p < source.length; p += 1) {
    const original = source[p];
    if (original <= 0) continue;
    visible += 1;
    let over = 0;
    for (const alpha of Object.values(layers)) {
      over = alpha[p] + over * (1 - alpha[p]);
    }
    if (over === 0) transparent += 1;
    const d255 = Math.max(0, (original - over) * 255);
    if (d255 > 0.5) deficit += 1;
    if (d255 > maxDeficit) maxDeficit = d255;
    if (Math.round(original * 255) !== Math.round(over * 255)) mismatch8 += 1;
  }
  return {
    visible,
    transparent,
    transparentPct: (100 * transparent) / visible,
    deficit,
    deficitPct: (100 * deficit) / visible,
    maxDeficit255: maxDeficit,
    mismatch8,
  };
}

const result = await buildLayers();
let { source, layers, width, height } = result;
const control = args.control ? String(args.control) : '';
if (control === 'self') {
  layers = { self: source };
} else if (control === 'drop') {
  const drop = String(args.drop || '');
  if (!layers[drop]) throw new Error(`--drop no existe: ${drop}; capas: ${Object.keys(layers).join(', ')}`);
  const { [drop]: _removed, ...kept } = layers;
  layers = kept;
}
if (control && !['self', 'drop'].includes(control)) throw new Error(`--control inválido: ${control}`);

const resultMetrics = metrics(source, layers, width, height);
console.log(JSON.stringify({ creature, worktree: root, control: control || 'none', drop: args.drop || null, width, height, layers: Object.keys(layers), metrics: resultMetrics }, null, 2));
