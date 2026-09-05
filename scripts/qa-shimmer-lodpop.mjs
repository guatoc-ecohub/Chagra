#!/usr/bin/env node
/* global process, console, Buffer */
/**
 * QA temporal del valle: shimmer, flicker y LOD-pop sobre una serie de PNG.
 *
 * Las capturas las produce el harness existente (shot3d --serie o el gate
 * headed). Este script no abre Chromium propio: conserva el renderer y la pose
 * que ya verificó el harness y mide la pila resultante.
 *
 * Uso:
 *   node scripts/qa-shimmer-lodpop.mjs --frames /tmp/valle-1.png,/tmp/valle-2.png --tier bajo
 *   node scripts/qa-shimmer-lodpop.mjs --dir /tmp/frames-dolly --tier alto --heatmap /tmp/shimmer.png
 *
 * Umbrales: punto de partida, calibrar contra build-roto-conocido.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import sharp from 'sharp';

const REPO = resolve(import.meta.dirname, '..');
const MEDIDOR = join(REPO, 'scripts', 'diag', 'medir-imagen-valle.mjs');
const UMBRALES = {
  alto: { sigmaMax: 0.004, pctHirviendo: 0.003, popRatio: 3, saturacionMin: 0.25, saturacionMax: 0.55, negros: 0.02, blancos: 0.02, rango: 0.35 },
  medio: { sigmaMax: 0.006, pctHirviendo: 0.008, popRatio: 4, saturacionMin: 0.25, saturacionMax: 0.55, negros: 0.02, blancos: 0.02, rango: 0.32 },
  bajo: { sigmaMax: 0.010, pctHirviendo: 0.015, popRatio: 5, saturacionMin: 0.22, saturacionMax: 0.55, negros: 0.03, blancos: 0.03, rango: 0.28 },
};

function ayuda() {
  return `Uso: node scripts/qa-shimmer-lodpop.mjs (--frames PNG[,PNG...] | --dir DIRECTORIO) [opciones]

Compara frames consecutivos capturados por shot3d/gate-real-gpu. Para cámara fija,
sigma detecta píxeles que hierven; para dolly, popRatio detecta picos de delta.

Opciones:
  --tier alto|medio|bajo  Perfil visual (bajo = Mali-G78, más tolerante)
  --frames PNG[,PNG...]   Lista ordenada de capturas, se puede repetir
  --dir DIRECTORIO        Lee todos los PNG ordenados del directorio
  --heatmap ARCHIVO.png   Escribe mapa de calor de sigma temporal
  --report-only           Reporta sin salir non-zero si un umbral falla
  --help                  Muestra esta ayuda

Umbrales: punto de partida, calibrar contra build-roto-conocido.`;
}

function args(argv) {
  const out = { tier: 'alto', frames: [], dir: null, heatmap: null, reportOnly: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--tier') out.tier = argv[++i];
    else if (a === '--frames') out.frames.push(...String(argv[++i] || '').split(',').filter(Boolean));
    else if (a === '--dir') out.dir = argv[++i];
    else if (a === '--heatmap') out.heatmap = argv[++i];
    else if (a === '--report-only') out.reportOnly = true;
    else throw new Error(`Argumento desconocido: ${a}`);
  }
  if (!UMBRALES[out.tier]) throw new Error(`Tier inválido: ${out.tier}. Use alto, medio o bajo.`);
  return out;
}

function rutas(opts) {
  const deDir = opts.dir
    ? readdirSync(resolve(opts.dir)).filter((f) => /\.png$/i.test(f)).sort().map((f) => join(resolve(opts.dir), f))
    : [];
  const todas = [...opts.frames.map((ruta) => resolve(ruta)), ...deDir];
  if (todas.length < 2) throw new Error('Indique al menos dos PNG consecutivos con --frames o --dir.');
  for (const ruta of todas) if (!existsSync(ruta)) throw new Error(`No existe: ${ruta}`);
  return todas;
}

function mediana(nums) {
  const a = [...nums].sort((x, y) => x - y);
  if (!a.length) return 0;
  const mitad = Math.floor(a.length / 2);
  return a.length % 2 ? a[mitad] : (a[mitad - 1] + a[mitad]) / 2;
}

function luma(data, i) {
  return (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
}

function medirImagenes(frames) {
  const raw = execFileSync(process.execPath, [MEDIDOR, ...frames], { cwd: REPO, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  return JSON.parse(raw).resultados;
}

function verdeDominante(metrica) {
  return ['medio', 'bajo'].every((tercio) => {
    const rgb = metrica.terciosVerticales?.[tercio]?.rgbMedia;
    return rgb && rgb.g >= rgb.r && rgb.g >= rgb.b;
  });
}

function fallosImagen(metrica, u) {
  const fallos = [];
  if (metrica.saturacion.media < u.saturacionMin || metrica.saturacion.media > u.saturacionMax) fallos.push('saturacion');
  if (metrica.luminancia.negrosRecortados >= u.negros) fallos.push('negrosRecortados');
  if (metrica.luminancia.blancosRecortados >= u.blancos) fallos.push('blancosRecortados');
  if (metrica.luminancia.rangoP05P95 <= u.rango) fallos.push('rangoP05P95');
  if (!verdeDominante(metrica)) fallos.push('verdeDominante');
  return fallos;
}

async function temporal(frames, threshold, heatmap) {
  const imagenes = await Promise.all(frames.map(async (ruta) => sharp(ruta).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
  const { width, height } = imagenes[0].info;
  if (imagenes.some(({ info }) => info.width !== width || info.height !== height || info.channels !== 4)) {
    throw new Error('Todos los frames deben tener las mismas dimensiones y canales RGBA.');
  }
  // Misma ventana de medir-imagen-valle: sin HUD superior/inferior ni minimapa.
  const x1 = Math.round(width * 0.84);
  const y0 = Math.round(height * 0.08);
  const y1 = Math.round(height * 0.92);
  const count = x1 * (y1 - y0);
  const media = new Float32Array(count);
  const m2 = new Float32Array(count);
  const deltas = [];
  let previo = null;
  for (let f = 0; f < imagenes.length; f++) {
    const data = imagenes[f].data;
    let sumaDelta = 0;
    let p = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = 0; x < x1; x++, p++) {
        const i = (y * width + x) * 4;
        const valor = luma(data, i);
        const delta = valor - media[p];
        media[p] += delta / (f + 1);
        m2[p] += delta * (valor - media[p]);
        if (previo) sumaDelta += Math.abs(valor - luma(previo, i));
      }
    }
    if (previo) deltas.push(sumaDelta / count);
    previo = data;
  }
  let sigmaMax = 0;
  let hirviendo = 0;
  const mapa = heatmap ? Buffer.alloc(count * 4) : null;
  for (let i = 0; i < count; i++) {
    const sigma = Math.sqrt(m2[i] / imagenes.length);
    sigmaMax = Math.max(sigmaMax, sigma);
    if (sigma >= threshold) hirviendo++;
    if (mapa) {
      const v = Math.min(255, Math.round((sigma / threshold) * 255));
      mapa[i * 4] = v; mapa[i * 4 + 1] = Math.round(v * 0.08); mapa[i * 4 + 2] = 0; mapa[i * 4 + 3] = 255;
    }
  }
  if (mapa) await sharp(mapa, { raw: { width: x1, height: y1 - y0, channels: 4 } }).png().toFile(resolve(heatmap));
  const medianaDelta = mediana(deltas);
  return {
    recorteAnalizado: [0, y0, x1, y1],
    sigmaMax,
    pctPixelesHirviendo: hirviendo / count,
    deltaMedioPorFrame: deltas,
    popRatio: medianaDelta === 0 ? (Math.max(...deltas, 0) === 0 ? 1 : null) : Math.max(...deltas) / medianaDelta,
  };
}

async function main() {
  const opts = args(process.argv.slice(2));
  if (opts.help) { console.log(ayuda()); return; }
  const frames = rutas(opts);
  const umbral = UMBRALES[opts.tier];
  const [movimiento, metricas] = await Promise.all([temporal(frames, umbral.sigmaMax, opts.heatmap), Promise.resolve(medirImagenes(frames))]);
  const fallos = [];
  if (movimiento.sigmaMax >= umbral.sigmaMax) fallos.push('sigmaMax');
  if (movimiento.pctPixelesHirviendo >= umbral.pctHirviendo) fallos.push('pctPixelesHirviendo');
  if (movimiento.popRatio == null || movimiento.popRatio >= umbral.popRatio) fallos.push('popRatio');
  const imagenes = metricas.map((m) => ({ archivo: m.archivo, fallos: fallosImagen(m, umbral) }));
  if (imagenes.some((m) => m.fallos.length)) fallos.push('gateVisualVerdeDominante');
  const reporte = {
    herramienta: 'qa-shimmer-lodpop',
    notaUmbrales: 'Punto de partida, calibrar contra build-roto-conocido.',
    tier: opts.tier,
    frames: frames.length,
    umbrales: umbral,
    movimiento,
    imagenes,
    heatmap: opts.heatmap ? resolve(opts.heatmap) : null,
    ok: fallos.length === 0,
    fallos,
  };
  console.log(JSON.stringify(reporte, null, 2));
  if (!reporte.ok && !opts.reportOnly) process.exitCode = 1;
}

main().catch((error) => { console.error(`qa-shimmer-lodpop: ${error.message}`); process.exitCode = 2; });
