/*
 * probe-aterrizaje.mjs — arnés de este carril: captura headed (GPU real, X viva)
 * del panel de aterrizaje del descenso y vuelca el TEXTO del panel + métricas.
 * No juzga la imagen (el operador la juzga): entrega la evidencia cruda del DOM.
 *
 * Uso: node probe-aterrizaje.mjs "<url>" <salida.txt>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROMIUM_WRAPPER = path.join(os.homedir(), '.local', 'bin', 'chromium');
const PLAYWRIGHT_CORE_ENTRY = '/home/kortux/Workspace/chagra/node_modules/playwright-core/index.mjs';

const { chromium } = await import(PLAYWRIGHT_CORE_ENTRY);

const SEED = process.env.SEED === '1';
const PANTALLA = process.env.SHOT || '';

/* Snapshot del contrato del sidecar, con forma realista, SOLO para el gate
   visual (igual que ?enso=/?helada=): la app no distingue entre este snapshot
   y uno que llegara de Open-Meteo con coordenadas de finca. Los valores NO son
   una lectura real de ningún día: son un estado de composición. */
function semillaSnapshot() {
  const payload = {
    fetched_at: new Date().toISOString(),
    location_context: {
      elevation: 2200,
      municipio: 'Villa de Leyva',
      departamento: 'Boyacá',
      precision: 'centroid',
    },
    openmeteo: {
      available: true,
      now: {
        temperature_2m: 6.4,
        relative_humidity_2m: 88,
        cloud_cover: 92,
        wind_speed_10m: 14,
      },
      forecast_7d: [{ temp_min: 1.9, temp_max: 11.4, precip_mm: 0.2 }],
    },
    alertas_locales: [
      { tipo: 'helada', mensaje: 'posible helada de madrugada en páramos y pisos fríos' },
    ],
    enso_status: { phase: 'el_nino', label: 'El Niño moderado', oni_value: 1.4, trend: 'estable' },
  };
  const entry = { ts: Date.now(), key: 'global', payload };
  return JSON.stringify(entry);
}
const SEMILLA = semillaSnapshot();

const [, , url, salida] = process.argv;
if (!url || !salida) {
  console.error('uso: probe-aterrizaje.mjs <url> <salida.txt>');
  process.exit(1);
}

/* Sesión X real: misma detección que shot3d (cookie de plasmashell/kwin). */
function envX() {
  for (const pat of ['plasmashell', 'kwin_x11']) {
    for (const pid of execSync(`pgrep -f ${pat}`).toString().trim().split('\n')) {
      if (!pid) continue;
      try {
        const env = readFileSync(`/proc/${pid}/environ`, 'utf8').split('\0');
        const xa = env.find((e) => e.startsWith('XAUTHORITY='))?.slice(11);
        if (xa && (() => { try { readFileSync(xa); return true; } catch { return false; } })()) {
          const dp = env.find((e) => e.startsWith('DISPLAY='))?.slice(8);
          return { XAUTHORITY: xa, DISPLAY: dp || ':0' };
        }
      } catch { /* seguir */ }
    }
  }
  return null;
}
import { execSync } from 'node:child_process';

const x = envX();
if (x) {
  process.env.XAUTHORITY = x.XAUTHORITY;
  if (!process.env.DISPLAY) process.env.DISPLAY = x.DISPLAY;
}

const gpuArgs = [
  '--no-sandbox', '--disable-dev-shm-usage', '--ignore-gpu-blocklist', '--enable-webgl',
  '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
  '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion',
  '--window-position=0,0',
];

const browser = await chromium.launch({ executablePath: CHROMIUM_WRAPPER, headless: false, args: gpuArgs });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
if (SEED) {
  await page.addInitScript((entry) => {
    try {
      localStorage.setItem('chagra:clima:snapshot-v1', entry);
    } catch { /* sin storage: el hueco es el estado sin dato */ }
  }, SEMILLA);
}
const errores = [];
const requestFailures = [];
page.on('pageerror', (e) => errores.push(String(e)));
page.on('requestfailed', (r) => requestFailures.push(`${r.method()} ${r.url()} :: ${r.failure()?.errorText}`));

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.tsm__aterrizaje', { timeout: 90000 });
  await page.waitForTimeout(3000);

  const datos = await page.evaluate(() => {
    const p = document.querySelector('.tsm__aterrizaje');
    const alt = document.querySelector('.tsm__altimetro');
    const tsm = document.querySelector('.tsm');
    return {
      escena3d: tsm?.dataset.escena3d ?? null,
      url: location.href,
      altimetro: alt ? alt.innerText.replace(/\n+/g, ' | ') : null,
      panel: p ? p.innerText : null,
      panelLineas: p ? p.innerText.split('\n').filter(Boolean) : [],
      claseAterrizaje: p ? p.className : null,
    };
  });

  const lineas = [
    `URL: ${datos.url}`,
    `escena3d=${datos.escena3d}`,
    `altimetro: ${datos.altimetro}`,
    `panel (${(datos.panelLineas || []).length} líneas):`,
    ...(datos.panelLineas || []).map((l) => `  - ${l}`),
    `pageerrors: ${errores.length}`,
    `requestFailures: ${requestFailures.length}`,
    ...errores.slice(0, 10).map((e) => `ERR: ${e}`),
    ...requestFailures.slice(0, 10).map((r) => `REQ: ${r}`),
  ];
  writeFileSync(salida, lineas.join('\n') + '\n', 'utf8');
  if (PANTALLA) await page.screenshot({ path: PANTALLA });
  console.log(`OK ${salida}: ${datos.panelLineas?.length ?? 0} líneas en el panel; pageerrors ${errores.length}`);
} finally {
  await browser.close();
}
