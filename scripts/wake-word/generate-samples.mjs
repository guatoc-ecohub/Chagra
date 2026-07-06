/**
 * generate-samples.mjs — genera el dataset de entrenamiento del wake-word
 * "hola chagra" (MODO CAMPO, #2088) a partir de Kokoro TTS + variaciones
 * de velocidad/tono via ffmpeg. NO usa voces reales de campesinas — es un
 * dataset SINTÉTICO usado para entrenar el modelo BASE que se shippea; la
 * calibración final con voz real la hace el operador en campo, y el
 * fallback "Enséñale tu voz" (enrollment) resuelve el resto en el navegador.
 *
 * Fuente de audio: Kokoro TTS local (kokoro-82m-onnx), alcanzable en esta
 * red vía Tailscale en http://100.117.193.102:8088/tts (mismo servicio que
 * consume ttsService.js en producción vía /api/kokoro/tts). Ver memoria
 * reference-tts-chagra-kokoro-no-piper.
 *
 * Salida: scripts/wake-word/samples/{pos,neg-otro,neg-noise}/*.wav +
 * manifest.json (lista de {file, label, holdout}). Este directorio queda
 * FUERA de git (ver .gitignore) — es un artefacto regenerable, no fuente.
 *
 * Uso:  node scripts/wake-word/generate-samples.mjs
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dir, 'samples');
const KOKORO_URL = 'http://100.117.193.102:8088/tts';

const POS_LABEL = 'hola chagra';
const NOISE_LABEL = '_background_noise_';
const OTHER_LABEL = 'otro';

// Las 4 voces curadas para español que ya usa ttsService.js (KOKORO_VOICES).
const VOICES = ['ef_dora', 'ef_aoede', 'ef_kore', 'em_alex'];

// Frases NEGATIVAS: saludos/frases de finca cotidianas + "hard negatives"
// que comparten tokens con la wake word ("hola", "chagra" sueltos) para
// que el modelo aprenda a discriminar la frase COMPLETA, no solo la
// presencia de una palabra.
const OTHER_PHRASES = [
  'hola',
  'chagra',
  'buenos días',
  'buenas tardes',
  'cómo está la finca',
  'qué más pues',
  'hasta luego',
  'gracias',
  'un momento por favor',
  'espere un momentico',
  'hola compadre',
  'buenas chagra',
];

async function fetchKokoro(text, voice) {
  const res = await fetch(KOKORO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice, format: 'wav', lang: 'es' }),
  });
  if (!res.ok) throw new Error(`Kokoro HTTP ${res.status} (${text} / ${voice})`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}

function ffmpeg(args) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
}

/** Variantes de velocidad (atempo preserva el tono) + una de tono (asetrate+atempo compensado). */
function augmentVariants(rawPath, outBase) {
  const variants = [
    { suffix: 'v100', filter: null },                       // original
    { suffix: 'v90', filter: 'atempo=0.90' },                // más lento (campo, distancia)
    { suffix: 'v112', filter: 'atempo=1.12' },               // más rápido (afán)
    // tono +~1.5 semitonos manteniendo duración (asetrate cambia velocidad+tono;
    // aresample vuelve al sample rate original; atempo compensa la duración).
    { suffix: 'pitchUp', filter: 'asetrate=44100*1.09,aresample=44100,atempo=1/1.09' },
  ];
  const files = [];
  for (const v of variants) {
    const out = `${outBase}-${v.suffix}.wav`;
    if (v.filter) {
      ffmpeg(['-i', rawPath, '-af', v.filter, '-ar', '44100', '-ac', '1', out]);
    } else {
      ffmpeg(['-i', rawPath, '-ar', '44100', '-ac', '1', out]);
    }
    files.push(out);
  }
  return files;
}

/** Ruido sintético: varios "colores" + un par de bandas filtradas (viento/hiss). */
function generateNoiseClips(dir) {
  const specs = [
    { name: 'white', filter: 'anoisesrc=color=white:amplitude=0.35:duration=1.2' },
    { name: 'pink', filter: 'anoisesrc=color=pink:amplitude=0.4:duration=1.2' },
    { name: 'brown', filter: 'anoisesrc=color=brown:amplitude=0.5:duration=1.2' },
    // "viento de páramo": ruido pasado por band-pass grave.
    { name: 'wind', filter: 'anoisesrc=color=brown:amplitude=0.6:duration=1.4,highpass=f=120,lowpass=f=700' },
    // "hiss" de fondo (hojas/insectos): pasa-altos suave sobre ruido blanco.
    { name: 'hiss', filter: 'anoisesrc=color=white:amplitude=0.15:duration=1.2,highpass=f=1500' },
  ];
  const files = [];
  for (const s of specs) {
    const out = join(dir, `noise-${s.name}.wav`);
    ffmpeg(['-f', 'lavfi', '-i', s.filter, '-ar', '44100', '-ac', '1', out]);
    files.push(out);
  }
  // "Silencio" de cuarto (2 clips): ruido blanco MUY bajo, NO silencio digital
  // puro. anullsrc (todo ceros) hace que collectExample() del recognizer se
  // cuelgue buscando un "key frame" de energía que nunca aparece — de-riskeado
  // en train-model.mjs (TIMEOUT 20s en la muestra de silencio puro). El mic en
  // reposo real SIEMPRE trae algo de piso de ruido; esto lo imita sin colgar
  // el pipeline de entrenamiento.
  for (let i = 0; i < 2; i++) {
    const out = join(dir, `silence-${i}.wav`);
    ffmpeg(['-f', 'lavfi', '-i', 'anoisesrc=color=white:amplitude=0.02:duration=1.2', out]);
    files.push(out);
  }
  return files;
}

async function main() {
  const posDir = join(OUT_DIR, 'pos');
  const otherDir = join(OUT_DIR, 'neg-otro');
  const noiseDir = join(OUT_DIR, 'neg-noise');
  const rawDir = join(OUT_DIR, '_raw');
  for (const d of [posDir, otherDir, noiseDir, rawDir]) mkdirSync(d, { recursive: true });

  const manifest = [];

  console.log(`[1/3] positivos "${POS_LABEL}" — ${VOICES.length} voces x 4 variantes…`);
  for (const voice of VOICES) {
    const raw = join(rawDir, `pos-${voice}.wav`);
    if (!existsSync(raw)) {
      const buf = await fetchKokoro(POS_LABEL, voice);
      writeFileSync(raw, buf);
    }
    const variants = augmentVariants(raw, join(posDir, voice));
    variants.forEach((f) => manifest.push({ file: f, label: POS_LABEL, voice }));
  }

  console.log(`[2/3] negativos "otro" — ${OTHER_PHRASES.length} frases x 2 voces…`);
  const otherVoices = ['ef_dora', 'em_alex'];
  for (const phrase of OTHER_PHRASES) {
    for (const voice of otherVoices) {
      const safe = phrase.replace(/[^a-z0-9]+/gi, '-').slice(0, 24);
      const raw = join(rawDir, `otro-${safe}-${voice}.wav`);
      if (!existsSync(raw)) {
        const buf = await fetchKokoro(phrase, voice);
        writeFileSync(raw, buf);
      }
      const out = join(otherDir, `${safe}-${voice}.wav`);
      ffmpeg(['-i', raw, '-ar', '44100', '-ac', '1', out]);
      manifest.push({ file: out, label: OTHER_LABEL, voice, phrase });
    }
  }

  console.log('[3/3] ruido de fondo sintético…');
  const noiseFiles = generateNoiseClips(noiseDir);
  noiseFiles.forEach((f) => manifest.push({ file: f, label: NOISE_LABEL }));

  // Split held-out ~20% ESTRATIFICADO por clase (para medir precisión honesta
  // sobre muestras NO vistas durante collectExample/train).
  const byLabel = {};
  manifest.forEach((m) => { (byLabel[m.label] ||= []).push(m); });
  for (const label of Object.keys(byLabel)) {
    const items = byLabel[label];
    const holdoutCount = Math.max(1, Math.round(items.length * 0.2));
    // Determinista: toma cada 5to elemento en vez de random, reproducible.
    let taken = 0;
    for (let i = items.length - 1; i >= 0 && taken < holdoutCount; i -= 5) {
      items[i].holdout = true;
      taken++;
    }
  }

  const relManifest = manifest.map((m) => ({ ...m, file: m.file.replace(OUT_DIR + '/', '') }));
  writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify(relManifest, null, 2));

  const counts = {};
  manifest.forEach((m) => { counts[m.label] = (counts[m.label] || 0) + 1; });
  const holdoutCounts = {};
  manifest.filter((m) => m.holdout).forEach((m) => { holdoutCounts[m.label] = (holdoutCounts[m.label] || 0) + 1; });
  console.log('Listo. Conteo por clase:', counts, '— held-out:', holdoutCounts);
  console.log(`Manifest: ${join(OUT_DIR, 'manifest.json')}`);
}

main().catch((e) => { console.error('ERROR generate-samples:', e); process.exit(1); });
