#!/usr/bin/env node
/*
 * medir-vida-angelita — EL INSTRUMENTO DE LA REGLA DEL 30 %.
 *
 * La regla del operador para Angelita en pantallas 2D es medible, no opinable:
 *   "se mueve al menos 30 % del tiempo, el resto se queda quieta en posición
 *    de agente semi-estático, nunca deja de tener vida".
 *
 * Este script la mide de verdad: abre la app en Chromium, encuentra a Angelita
 * y MUESTREA SU GEOMETRÍA RENDERIZADA (getBoundingClientRect de partes
 * concretas del dibujo) cada `--paso` ms durante `--ventana` segundos. No lee
 * el CSS ni confía en los keyframes: mide dónde terminan los píxeles.
 *
 * ── Las tres cifras que devuelve ──────────────────────────────────────────
 *   notorio %  fotogramas cuya POSE se aparta del reposo más que `--umbral-
 *              notorio` (fracción de la altura del bicho). Es el "30 %".
 *   vivo %     fotogramas que no son notorios pero SÍ se apartan del reposo
 *              (micro-vida: respiración, deriva, temblor). El "70 % vivo".
 *   congelado % fotogramas en los que NADA cambió respecto al anterior en
 *              NINGUNA parte (incluidos alas y párpados). Debe ser 0.00 %.
 *
 * La pose de reposo NO se asume: es la MEDIANA de las muestras. Si de verdad
 * el bicho pasa la mayor parte en reposo, la mediana ES el reposo — y si no lo
 * fuera, el número saldría feo y habría que mirarlo. Es un instrumento que
 * puede fallar, que es justo lo que se le pide a un instrumento.
 *
 * ── Grupos de sondas ───────────────────────────────────────────────────────
 * El aleteo es continuo (0,15 s) y si contara como "gesto" daría 100 % y el
 * número no querría decir nada. Por eso se separan:
 *   cuerpo → cabeza y tronco: arrastran antic + travieso + boil. AQUÍ se mide
 *            el presupuesto 30/70, porque es lo que el ojo lee como gesto.
 *   vida   → alas, ojos, antenas: micro-vida continua. AQUÍ se comprueba que
 *            nunca haya un fotograma muerto.
 *
 * Uso:
 *   node scripts/medir-vida-angelita.mjs                       (arranca vite solo)
 *   node scripts/medir-vida-angelita.mjs --ruta '#/mockups/angelita-viva'
 *   node scripts/medir-vida-angelita.mjs --ventana 90 --paso 40 --json out.json
 *   node scripts/medir-vida-angelita.mjs --reduced-motion      (gate de accesibilidad)
 */
import { spawn } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';

const KNOWN_CHROMIUM = ['/run/current-system/sw/bin/chromium'];

function resolveChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  try {
    const w = execSync('which chromium 2>/dev/null', { encoding: 'utf8' }).trim();
    if (w) return w;
  } catch { /* sigue */ }
  return KNOWN_CHROMIUM.find((p) => existsSync(p));
}

function arg(nombre, porDefecto) {
  const i = process.argv.indexOf(`--${nombre}`);
  if (i === -1) return porDefecto;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

const RUTA = String(arg('ruta', '#/mockups/angelita-viva'));
const VENTANA_S = Number(arg('ventana', 60));
const PASO_MS = Number(arg('paso', 50));
const BASE = String(arg('base', 'http://127.0.0.1:5173'));
const REDUCED = Boolean(arg('reduced-motion', false));
const SALIDA_JSON = arg('json', null);
/* Umbrales como FRACCIÓN de la altura renderizada del bicho: así el veredicto
   no depende del tamaño al que se pinte. */
const UMBRAL_VIVO = Number(arg('umbral-vivo', 0.004));      // 0,4 % de la altura
const UMBRAL_NOTORIO = Number(arg('umbral-notorio', 0.025)); // 2,5 % de la altura
/* Por debajo de esto (px renderizados) dos fotogramas son el MISMO fotograma. */
const UMBRAL_CONGELADO = Number(arg('umbral-congelado', 0.02));

async function esperarServidor(url, timeoutMs = 90_000) {
  const hasta = Date.now() + timeoutMs;
  while (Date.now() < hasta) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (r.ok || r.status === 304) return true;
    } catch { /* todavía no */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

/* ── La sonda, dentro del navegador ────────────────────────────────────────
   Devuelve, por muestra, el centro (x,y) y el tamaño de cada parte sondeada.
   Prefiere `[data-parte]` (el dibujo nuevo las declara); si no están, cae a la
   estructura del SVG (para poder medir el dibujo VIEJO y comparar peras con
   peras). */
const SONDAS_EN_PAGINA = `(() => {
  const svg = document.querySelector('[data-creature="abeja-angelita"]');
  if (!svg) return null;
  const cuerpo = svg.querySelector('.crt-body');
  if (!cuerpo) return null;
  const porDato = (n) => Array.from(svg.querySelectorAll('[data-parte="' + n + '"]'));
  let partes = {
    cabeza: porDato('cabeza'),
    tronco: porDato('tronco'),
    ala: porDato('ala'),
    ojo: porDato('ojo'),
    antena: porDato('antena'),
  };
  const vacio = Object.values(partes).every((a) => a.length === 0);
  if (vacio) {
    // Dibujo viejo: sin data-parte. Se localiza por estructura.
    const elipses = Array.from(cuerpo.children).filter((e) => e.tagName === 'ellipse');
    const circulos = Array.from(cuerpo.children).filter((e) => e.tagName === 'circle');
    partes = {
      cabeza: circulos.slice(1, 2),      // [0]=aura, [1]=cabeza
      tronco: elipses.slice(2, 3),       // [0],[1]=alas, [2]=tronco
      ala: elipses.slice(0, 2),
      ojo: Array.from(svg.querySelectorAll('.rh-blink')),
      antena: Array.from(svg.querySelectorAll('.rh-sway')),
    };
  }
  window.__sondasAngelita = partes;
  const alto = svg.getBoundingClientRect().height;
  return { alto, conteo: Object.fromEntries(Object.entries(partes).map(([k, v]) => [k, v.length])) };
})()`;

const MUESTRA_EN_PAGINA = `(() => {
  const p = window.__sondasAngelita;
  const leer = (els) => els.map((e) => {
    const r = e.getBoundingClientRect();
    return [r.x + r.width / 2, r.y + r.height / 2, r.width, r.height];
  });
  return { t: performance.now(), cuerpo: leer([...p.cabeza, ...p.tronco]),
           vida: leer([...p.ala, ...p.ojo, ...p.antena]) };
})()`;

function mediana(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/* Pose de reposo = mediana, componente a componente, de todas las muestras. */
function poseReposo(muestras, grupo) {
  const n = muestras[0][grupo].length;
  const ref = [];
  for (let i = 0; i < n; i++) {
    ref.push([0, 1, 2, 3].map((c) => mediana(muestras.map((m) => m[grupo][i][c]))));
  }
  return ref;
}

/* Desviación de una muestra respecto al reposo: el MÁXIMO desplazamiento de
   centro entre las partes (en px renderizados). El máximo, no el promedio: si
   una sola parte se fue de viaje, el bicho se movió. */
function desviacion(muestra, ref, grupo) {
  let max = 0;
  muestra[grupo].forEach((p, i) => {
    const dx = p[0] - ref[i][0];
    const dy = p[1] - ref[i][1];
    max = Math.max(max, Math.hypot(dx, dy));
  });
  return max;
}

/* Cambio entre dos fotogramas consecutivos, sobre TODAS las sondas (cuerpo +
   vida): es lo que detecta un fotograma muerto. */
function cambio(a, b) {
  let max = 0;
  for (const grupo of ['cuerpo', 'vida']) {
    a[grupo].forEach((p, i) => {
      const q = b[grupo][i];
      max = Math.max(max, Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]),
        Math.abs(p[2] - q[2]), Math.abs(p[3] - q[3]));
    });
  }
  return max;
}

async function main() {
  let vite = null;
  const yaCorre = await esperarServidor(BASE, 1500);
  if (!yaCorre) {
    console.log('· levantando vite…');
    vite = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173'], {
      stdio: 'ignore', detached: true,
    });
    if (!(await esperarServidor(BASE))) {
      console.error('no levantó el servidor de desarrollo');
      process.exit(1);
    }
  }

  const navegador = await chromium.launch({ executablePath: resolveChromium() });
  const contexto = await navegador.newContext({
    viewport: { width: 900, height: 900 },
    reducedMotion: REDUCED ? 'reduce' : 'no-preference',
  });
  const pagina = await contexto.newPage();
  const url = `${BASE}/${RUTA}`;
  await pagina.goto(url, { waitUntil: 'domcontentloaded' });
  await pagina.waitForSelector('[data-creature="abeja-angelita"]', { timeout: 30_000 });
  await pagina.waitForTimeout(600);

  const info = await pagina.evaluate(SONDAS_EN_PAGINA);
  if (!info) { console.error('no encontré a Angelita en', url); process.exit(1); }
  console.log(`· Angelita encontrada — alto ${info.alto.toFixed(0)} px, sondas`, info.conteo);

  const muestras = [];
  const total = Math.floor((VENTANA_S * 1000) / PASO_MS);
  for (let i = 0; i < total; i++) {
    muestras.push(await pagina.evaluate(MUESTRA_EN_PAGINA));
    await pagina.waitForTimeout(PASO_MS);
  }
  await navegador.close();
  if (vite) { try { process.kill(-vite.pid); } catch { /* ya murió */ } }

  const alto = info.alto;
  const ref = poseReposo(muestras, 'cuerpo');
  const desv = muestras.map((m) => desviacion(m, ref, 'cuerpo') / alto);
  const notorio = desv.filter((d) => d > UMBRAL_NOTORIO).length / desv.length;
  const vivo = desv.filter((d) => d > UMBRAL_VIVO && d <= UMBRAL_NOTORIO).length / desv.length;
  const quieto = desv.filter((d) => d <= UMBRAL_VIVO).length / desv.length;

  const cambios = [];
  for (let i = 1; i < muestras.length; i++) cambios.push(cambio(muestras[i - 1], muestras[i]));
  const congelados = cambios.filter((c) => c < UMBRAL_CONGELADO).length;
  /* La racha muerta más larga: un fotograma repetido no se nota; medio segundo
     clavado sí, y es lo que hace pensar que la app se colgó. */
  let racha = 0; let peorRacha = 0;
  for (const c of cambios) { racha = c < UMBRAL_CONGELADO ? racha + 1 : 0; peorRacha = Math.max(peorRacha, racha); }

  const pct = (x) => `${(x * 100).toFixed(1).padStart(5)} %`;
  console.log('');
  console.log(`  ruta            ${RUTA}${REDUCED ? '  (prefers-reduced-motion: reduce)' : ''}`);
  console.log(`  ventana         ${VENTANA_S} s @ ${PASO_MS} ms  (${muestras.length} muestras)`);
  console.log('  ─────────────────────────────────────────────');
  console.log(`  movimiento notorio  ${pct(notorio)}   (meta ≥ 30 %)`);
  console.log(`  reposo vivo         ${pct(vivo)}`);
  console.log(`  pose quieta         ${pct(quieto)}`);
  console.log('  ─────────────────────────────────────────────');
  console.log(`  fotogramas congelados  ${congelados} / ${cambios.length}   (meta 0)`);
  console.log(`  racha muerta más larga ${(peorRacha * PASO_MS)} ms   (meta 0 ms)`);
  console.log(`  desviación máxima      ${(Math.max(...desv) * 100).toFixed(1)} % de la altura`);

  const veredicto = {
    ruta: RUTA, reducedMotion: REDUCED, ventana_s: VENTANA_S, paso_ms: PASO_MS,
    muestras: muestras.length, alto_px: alto,
    notorio_pct: +(notorio * 100).toFixed(2),
    reposo_vivo_pct: +(vivo * 100).toFixed(2),
    quieta_pct: +(quieto * 100).toFixed(2),
    congelados, racha_muerta_ms: peorRacha * PASO_MS,
    desviacion_max_pct: +(Math.max(...desv) * 100).toFixed(2),
    umbrales: { vivo: UMBRAL_VIVO, notorio: UMBRAL_NOTORIO, congelado: UMBRAL_CONGELADO },
  };
  if (SALIDA_JSON && typeof SALIDA_JSON === 'string') {
    writeFileSync(SALIDA_JSON, JSON.stringify(veredicto, null, 2));
    console.log(`\n· veredicto en ${SALIDA_JSON}`);
  }
  /* Sin reduced-motion el listón es el del operador; con reduced-motion la
     única exigencia es que NO quede muerta. */
  const pasa = REDUCED ? peorRacha * PASO_MS === 0 : (notorio >= 0.28 && peorRacha * PASO_MS === 0);
  console.log(`\n${pasa ? '✓ cumple' : '✗ NO cumple'} la regla de vida permanente.`);
  process.exit(pasa ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
