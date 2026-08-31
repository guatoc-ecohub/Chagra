#!/usr/bin/env node
/* global process, console */
/**
 * Scout adversario: califica un conjunto de capturas y deja que el peor frame
 * decida el gate. Las poses/horas se generan y capturan con el harness actual;
 * aquí se reutiliza medir-imagen-valle para conservar la misma cocina visual.
 *
 * Umbrales: punto de partida, calibrar contra build-roto-conocido.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const REPO = resolve(import.meta.dirname, '..');
const MEDIDOR = join(REPO, 'scripts', 'diag', 'medir-imagen-valle.mjs');
const UMBRALES = {
  alto: { saturacionMin: 0.25, saturacionMax: 0.55, negros: 0.02, blancos: 0.02, rango: 0.35, entropia: 5, colores: 200 },
  medio: { saturacionMin: 0.25, saturacionMax: 0.55, negros: 0.02, blancos: 0.02, rango: 0.32, entropia: 5, colores: 200 },
  bajo: { saturacionMin: 0.22, saturacionMax: 0.55, negros: 0.03, blancos: 0.03, rango: 0.28, entropia: 5, colores: 160 },
};

function ayuda() {
  return `Uso: node scripts/qa-worst-frame-scout.mjs (--frames PNG[,PNG...] | --dir DIRECTORIO) [opciones]

Puntúa luminancia, saturación, negros, paleta y verde dominante usando
scripts/diag/medir-imagen-valle.mjs. El peor frame es el veredicto del set.

Opciones:
  --tier alto|medio|bajo  Bajo usa la banda móvil (Mali-G78)
  --frames PNG[,PNG...]   Capturas de poses/horas/climas, se puede repetir
  --dir DIRECTORIO        Lee todos los PNG ordenados del directorio
  --report-only           Reporta sin salir non-zero si el peor frame falla
  --help                  Muestra esta ayuda

Umbrales: punto de partida, calibrar contra build-roto-conocido.`;
}

function args(argv) {
  const out = { tier: 'alto', frames: [], dir: null, reportOnly: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--tier') out.tier = argv[++i];
    else if (a === '--frames') out.frames.push(...String(argv[++i] || '').split(',').filter(Boolean));
    else if (a === '--dir') out.dir = argv[++i];
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
  if (!todas.length) throw new Error('Indique capturas con --frames o --dir.');
  for (const ruta of todas) if (!existsSync(ruta)) throw new Error(`No existe: ${ruta}`);
  return todas;
}

function verdeDominante(metrica) {
  return ['medio', 'bajo'].every((tercio) => {
    const rgb = metrica.terciosVerticales?.[tercio]?.rgbMedia;
    return rgb && rgb.g >= rgb.r && rgb.g >= rgb.b;
  });
}

function excesoArriba(valor, maximo) { return Math.max(0, valor / maximo - 1); }
function excesoAbajo(valor, minimo) { return Math.max(0, minimo / Math.max(valor, 1e-9) - 1); }

function calificar(metrica, u) {
  const fallos = [];
  let puntaje = 0;
  const sat = metrica.saturacion.media;
  if (sat < u.saturacionMin || sat > u.saturacionMax) {
    fallos.push('saturacion');
    puntaje += sat < u.saturacionMin ? excesoAbajo(sat, u.saturacionMin) : excesoArriba(sat, u.saturacionMax);
  }
  const lum = metrica.luminancia;
  for (const [clave, limite] of [['negrosRecortados', u.negros], ['blancosRecortados', u.blancos]]) {
    if (lum[clave] >= limite) { fallos.push(clave); puntaje += excesoArriba(lum[clave], limite); }
  }
  if (lum.rangoP05P95 <= u.rango) { fallos.push('rangoP05P95'); puntaje += excesoAbajo(lum.rangoP05P95, u.rango); }
  if (lum.entropiaBits <= u.entropia) { fallos.push('entropiaBits'); puntaje += excesoAbajo(lum.entropiaBits, u.entropia); }
  if (metrica.coloresCuantizados12bit <= u.colores) { fallos.push('coloresCuantizados12bit'); puntaje += excesoAbajo(metrica.coloresCuantizados12bit, u.colores); }
  if (!verdeDominante(metrica)) { fallos.push('verdeDominante'); puntaje += 1; }
  return { ...metrica, fallos, puntaje: Number(puntaje.toFixed(4)), verdeDominante: verdeDominante(metrica) };
}

function main() {
  const opts = args(process.argv.slice(2));
  if (opts.help) { console.log(ayuda()); return; }
  const frames = rutas(opts);
  const raw = execFileSync(process.execPath, [MEDIDOR, ...frames], { cwd: REPO, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  const resultados = JSON.parse(raw).resultados.map((m) => calificar(m, UMBRALES[opts.tier]));
  const ranking = [...resultados].sort((a, b) => b.puntaje - a.puntaje || a.archivo.localeCompare(b.archivo));
  const peor = ranking[0];
  const reporte = {
    herramienta: 'qa-worst-frame-scout',
    notaUmbrales: 'Punto de partida, calibrar contra build-roto-conocido.',
    tier: opts.tier,
    umbrales: UMBRALES[opts.tier],
    capturas: resultados.length,
    peorFrame: peor,
    ranking: ranking.map(({ archivo, puntaje, fallos, verdeDominante }) => ({ archivo, puntaje, fallos, verdeDominante })),
    ok: peor.fallos.length === 0,
  };
  console.log(JSON.stringify(reporte, null, 2));
  if (!reporte.ok && !opts.reportOnly) process.exitCode = 1;
}

try { main(); } catch (error) { console.error(`qa-worst-frame-scout: ${error.message}`); process.exitCode = 2; }
