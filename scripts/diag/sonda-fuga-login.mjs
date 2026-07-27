#!/usr/bin/env node
/*
 * sonda-fuga-login — prueba la puerta de `chagra.app` como lo haría alguien de AFUERA.
 *
 * Abre el bundle de la app (index.html → src/App.jsx, el que deploy.yml manda a
 * chagra.app) en un navegador SIN sesión y entra por la raíz y por rutas directas.
 * Para cada parada anota QUÉ PANTALLA quedó montada — no si el test pasa, sino qué
 * se ve. Un test verde no prueba que la puerta esté cerrada; una captura sí.
 *
 * Uso:
 *   node scripts/diag/sonda-fuga-login.mjs --out ops/capturas/<dir> [--sesion] [--base URL]
 *
 *   --sesion   siembra un token válido en IndexedDB (localforage) para probar la
 *              REGRESIÓN: que el campesino con sesión sigue entrando a todo.
 *   --base     origen servido (default http://127.0.0.1:4173)
 *
 * Salida: <out>/<caso>.png por parada + <out>/veredicto.json con el resumen.
 */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const getFlag = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i === -1 ? d : args[i + 1];
};
const conSesion = args.includes('--sesion');
const base = getFlag('base', 'http://127.0.0.1:4173');
const outDir = resolve(getFlag('out', 'ops/capturas/fuga-login'));
const wait = Number(getFlag('wait', 6500));

mkdirSync(outDir, { recursive: true });

// Las paradas: la raíz + rutas REALES (pantallas con datos de finca) + las
// vitrinas que SÍ deben seguir abiertas + la puerta del valle.
const PARADAS = [
  { caso: '01-raiz', hash: '', que: 'la raíz — sin sesión debe caer en LOGIN, no en el valle' },
  { caso: '02-dashboard', hash: '#dashboard', que: 'el home real' },
  { caso: '03-agente', hash: '#agente', que: 'el agente (pantalla real)' },
  { caso: '04-inventario', hash: '#inventario', que: 'inventario de la finca (datos reales)' },
  { caso: '05-perfil', hash: '#perfil', que: 'perfil del usuario' },
  { caso: '06-informes', hash: '#informes', que: 'informes de la finca' },
  { caso: '07-valle3d', hash: '#valle3d', que: 'el valle de la app — es el PRIVADO, va tras login' },
  { caso: '08-vitrina-entrada-3d', hash: '#/mockups/entrada-3d', que: 'vitrina pública — DEBE seguir abierta' },
  { caso: '09-vitrina-mercado', hash: '#/mockups/mercado', que: 'vitrina pública del mercado — DEBE seguir abierta' },
  { caso: '10-vitrina-paramo', hash: '#/mockups/paramo-definitivo', que: 'vitrina 3D pública — DEBE seguir abierta' },
  { caso: '11-login', hash: '#login', que: 'el login mismo — siempre alcanzable' },
  // LA PUERTA. `navigate` está publicado en el bus de eventos de la app
  // ('chagraNavigate' / 'chagra:nav') y es el mismo que el valle recibía entero
  // como `onNavigate`. Empujar el evento desde afuera es exactamente lo que
  // hace un hotspot del valle al tocarlo — sin depender de acertarle a un
  // canvas 3D. Si esto abre una pantalla real sin sesión, la puerta está abierta.
  {
    caso: '12-puerta-evento-inventario',
    hash: '',
    evento: 'activos',
    que: 'la PUERTA: pedirle al bus de la app una pantalla real, sin sesión',
  },
  {
    caso: '13-puerta-evento-dashboard',
    hash: '',
    evento: 'dashboard',
    que: 'la PUERTA: el home real por el bus, sin sesión',
  },
];

const chromiumPath = execSync('which chromium', { encoding: 'utf8' }).trim();

const browser = await chromium.launch({
  executablePath: chromiumPath,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
});

/** Huella de la pantalla montada: texto visible + canvas + la vista que la app declara. */
async function huella(page) {
  return page.evaluate(() => {
    const txt = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
    const inputs = [...document.querySelectorAll('input')].map((i) => i.placeholder || i.type);
    return {
      vista: window.__CHAGRA_VIEW__ ?? null,
      titulo: document.title,
      texto: txt.slice(0, 220),
      inputs: inputs.slice(0, 6),
      canvas: document.querySelectorAll('canvas').length,
    };
  });
}

/** ¿La pantalla montada es el login? Por la vista declarada, con respaldo en el DOM. */
function esLogin(h) {
  if (h.vista) return h.vista === 'login';
  return h.inputs.some((p) => /usuario|contrase/i.test(String(p)));
}

const resultados = [];

for (const parada of PARADAS) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 860 },
    locale: 'es-CO',
  });

  if (conSesion) {
    // Mismo sembrado que scripts/diag/shot3d-ruta.mjs: isAuthenticated() lee
    // localforage (IndexedDB); token + expiry futuro bastan, no hay red de por medio.
    await ctx.addInitScript(() => {
      const sembrar = (db, store) =>
        new Promise((res) => {
          const req = indexedDB.open(db, 2);
          req.onupgradeneeded = () => {
            try { req.result.createObjectStore(store); } catch { /* ya existe */ }
          };
          req.onsuccess = () => {
            try {
              const tx = req.result.transaction(store, 'readwrite');
              const st = tx.objectStore(store);
              st.put('sonda-token-diagnostico', 'farmos_access_token');
              st.put(Date.now() + 86400000, 'farmos_token_expiry');
              tx.oncomplete = () => res(undefined);
              tx.onerror = () => res(undefined);
            } catch { res(undefined); }
          };
          req.onerror = () => res(undefined);
        });
      sembrar('localforage', 'keyvaluepairs');
      sembrar('Chagra', 'syncQueue');
    });
  }

  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(`[pageerror] ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errores.push(`[console] ${m.text().slice(0, 160)}`); });

  const url = `${base}/${parada.hash}`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(wait);
  } catch (e) {
    errores.push(`[goto] ${e.message}`);
  }

  // Las paradas con `evento` empujan el bus de navegación de la app (lo mismo
  // que hace una puerta del valle) y esperan a ver qué queda montado.
  if (parada.evento) {
    await page.evaluate((vista) => {
      window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: vista } }));
    }, parada.evento).catch(() => {});
    await page.waitForTimeout(4000);
  }

  const h = await huella(page).catch(() => ({ vista: null, titulo: '?', texto: '(no se pudo leer)', inputs: [], canvas: 0 }));
  const archivo = resolve(outDir, `${parada.caso}.png`);
  await page.screenshot({ path: archivo, animations: 'disabled', timeout: 120000 }).catch(() => {});

  const fila = {
    ...parada,
    url,
    hashFinal: await page.evaluate(() => window.location.hash).catch(() => '?'),
    ...h,
    login: esLogin(h),
    errores: errores.slice(0, 4),
    captura: `${parada.caso}.png`,
  };
  resultados.push(fila);
  console.log(
    `${conSesion ? '🔓' : '🔒'} ${parada.caso.padEnd(24)} vista=${String(fila.vista).padEnd(22)} login=${fila.login ? 'SÍ' : 'no '} canvas=${fila.canvas} · ${fila.texto.slice(0, 70)}`,
  );

  await ctx.close();
}

writeFileSync(
  resolve(outDir, 'veredicto.json'),
  JSON.stringify({ base, conSesion, generado: new Date().toISOString(), resultados }, null, 2) + '\n',
);
console.log(`\n[sonda] ${resultados.length} paradas → ${outDir}`);

await browser.close();
