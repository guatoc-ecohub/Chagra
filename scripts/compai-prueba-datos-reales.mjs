#!/usr/bin/env node
/**
 * compai-prueba-datos-reales — LA PRUEBA DEL ARREGLO MÁS CARO DEL compAI.
 *
 * Siembra una finca REAL en IndexedDB (café, plátano, mora, aguacate), abre el
 * valle 3D y captura lo que el compAI dice. Antes de este arreglo, los dos
 * disparadores del husmeo llamaban `entrarMundo(mundo, {})` con el objeto
 * vacío, así que el personaje contestaba SIEMPRE *"todavía no me ha contado
 * qué tiene sembrado"* — aunque la finca estuviera llena.
 *
 * Corre las dos mitades del gate:
 *   1. FUNCIONAL — el store real, con los assets reales: qué frase sale.
 *      Es la prueba dura, y no depende de que la GPU dibuje.
 *   2. VISUAL — la captura de la burbuja en el valle, por CONTENIDO: si el
 *      texto real no aparece en el DOM, falla. Una captura bonita de un
 *      estado vacío no prueba nada (ver `feedback-gate-visual-dos-puntos-ciegos`).
 *
 * Uso:  node scripts/compai-prueba-datos-reales.mjs [--url http://127.0.0.1:5173]
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '..');
const args = process.argv.slice(2);
const iUrl = args.indexOf('--url');
const BASE = iUrl >= 0 ? args[iUrl + 1] : 'http://127.0.0.1:5173';
const SALIDA = resolve(RAIZ, 'capturas-compai');
const iAncho = args.indexOf('--ancho');
const ANCHO = iAncho >= 0 ? Number(args[iAncho + 1]) : 430;
const iNombre = args.indexOf('--nombre');
const NOMBRE = iNombre >= 0 ? args[iNombre + 1] : 'compai-datos-reales';

/* La finca de prueba: nombres con sufijo de instancia (#01…) como los escribe
   la app de verdad, una mata MUERTA que no debe contar, y un cultivo repetido
   con y sin tilde para probar que agrupan igual. */
const FINCA = [
  ['Café #01', 'active'], ['Café #02', 'active'], ['Café #03', 'active'],
  ['Cafe #04', 'active'], ['Café #05', 'active'], ['Café #06', 'active'],
  ['Plátano Hartón #01', 'active'], ['Plátano Hartón #02', 'active'],
  ['Mora de Castilla #01', 'active'],
  ['Aguacate Hass #01', 'dead'],
];

function chromiumDelSistema() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  try {
    const w = execSync('which chromium 2>/dev/null', { encoding: 'utf8' }).trim();
    if (w) return w;
  } catch { /* cae al bundled */ }
  return undefined;
}

async function main() {
  mkdirSync(SALIDA, { recursive: true });
  const ejecutable = chromiumDelSistema();
  const navegador = await chromium.launch({
    executablePath: ejecutable,
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
  });
  const ctx = await navegador.newContext({ viewport: { width: ANCHO, height: 932 } });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(String(e)));

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 25_000 }).catch(() => {});

  // ── sembrar la finca en IndexedDB ────────────────────────────────────────
  const sembrado = await page.evaluate(async (finca) => {
    localStorage.setItem('chagra:active_tenant_id', 'prueba-compai');
    const db = await new Promise((ok, mal) => {
      const r = indexedDB.open('ChagraDB');
      r.onsuccess = () => ok(r.result);
      r.onerror = () => mal(r.error);
    });
    if (!db.objectStoreNames.contains('assets')) { db.close(); return { error: 'sin store assets' }; }
    const tx = db.transaction(['assets'], 'readwrite');
    const st = tx.objectStore('assets');
    st.clear();
    finca.forEach(([name, status], i) => st.put({
      id: `asset-plant-compai-${i}`,
      type: 'asset--plant',
      asset_type: 'plant',
      _tenant_id: 'prueba-compai',
      cached_at: Date.now(),
      attributes: { name, status },
    }));
    await new Promise((ok, mal) => { tx.oncomplete = ok; tx.onerror = () => mal(tx.error); });
    db.close();
    return { sembradas: finca.length };
  }, FINCA);
  console.log('siembra:', JSON.stringify(sembrado));

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 25_000 }).catch(() => {});
  await page.waitForTimeout(2500); // que hidrate el store desde IndexedDB

  // ── 1) GATE FUNCIONAL: el motor real, con los datos reales ───────────────
  const funcional = await page.evaluate(async () => {
    const [{ default: useAssetStore }, nucleo, coment] = await Promise.all([
      import('/src/store/useAssetStore.js'),
      import('/src/compai/nucleo/datosFinca.js'),
      import('/src/compai/nucleo/comentarista.js'),
    ]);
    await useAssetStore.getState().hydrate();
    const plants = useAssetStore.getState().plants || [];
    const inv = nucleo.inventarioCompai({ plants });
    const salida = { matasEnStore: plants.length, inventario: inv.cultivos, antes: {}, despues: {} };
    for (const m of ['mis_matas', 'vender', 'finca']) {
      salida.antes[m] = coment.comentarioDeMundo(m, {});                       // el `{}` de antes
      salida.despues[m] = coment.comentarioDeMundo(m, nucleo.datosDeMundo(m, inv)); // ahora
    }
    return salida;
  });

  console.log('\n── GATE FUNCIONAL ───────────────────────────────────────────');
  console.log('matas hidratadas del IndexedDB:', funcional.matasEnStore);
  console.log('inventario agrupado:', JSON.stringify(funcional.inventario));
  for (const m of Object.keys(funcional.antes)) {
    console.log(`\n  [${m}]`);
    console.log('   ANTES   →', funcional.antes[m]);
    console.log('   DESPUÉS →', funcional.despues[m]);
  }

  const cambio = Object.keys(funcional.antes)
    .filter((m) => funcional.antes[m] !== funcional.despues[m]);
  const menciona = /caf[eé]/i.test(funcional.despues.mis_matas || '');

  // ── 2) GATE VISUAL: la burbuja en el valle, verificada por CONTENIDO ─────
  /* La anti-molestia del compAI PERSISTE sus cooldowns (20 min por mundo) en
     localStorage a propósito, para que la cadencia sobreviva recargas. Para
     una prueba eso es ruido: si el husmeo ya comentó `mis_matas` durante el
     gate funcional, se calla las siguientes 20 min y la foto sale vacía por
     una razón que NO es el bug que estamos probando. Se limpia la memoria
     anti-molestia — sólo eso, no el inventario. */
  await page.evaluate(() => localStorage.removeItem('chagra:angelita:antimolestia'));
  await page.goto(`${BASE}/#/mockups/valle-3d`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

  /* El husmeo autónomo ROTA seis lugares (cultivos, animales, clima, mercado,
     aprender, diseño) cada ~13 s: capturar a ciegas a los 12 s agarra el que
     toque, no el que prueba algo. Se espera al turno de un mundo que SÍ habla
     del inventario — ese es el gate por CONTENIDO. Si en toda la ronda nunca
     nombra el cultivo real, es que el arreglo no llegó y hay que fallar. */
  /* Se lee lo que DE VERDAD SE VE (`innerText` del nodo visible), no el
     `textContent` de cualquier nodo con "burbuja" en la clase: había nodos
     de accesibilidad con el texto completo mientras en pantalla todavía no
     se había tecleado nada. La foto tiene que probar lo que ve el usuario. */
  const leerBurbujas = () => page.evaluate(() => {
    const nodos = [...document.querySelectorAll('[class*="burbuja"], [class*="Burbuja"]')];
    const visibles = nodos.filter((n) => {
      const r = n.getBoundingClientRect();
      return r.width > 40 && r.height > 12 && getComputedStyle(n).opacity !== '0';
    });
    return visibles.map((n) => (n.innerText || '').trim()).filter(Boolean).join(' | ');
  });

  const shot = resolve(SALIDA, `${NOMBRE}.png`);
  let textoBurbuja = '';
  let capturado = false;
  const limite = Date.now() + 110_000;   // más de una ronda completa de husmeo
  while (Date.now() < limite) {
    const visto = await leerBurbujas();
    /* Se dispara en cuanto la máquina de escribir ya puso bastante frase como
       para que se lea el cultivo real. Esperar a que "asiente" era peor: el
       aviso se va solo a los pocos segundos y la foto salía vacía. */
    if (/caf[eé]|pl[áa]tano|mora/i.test(visto) && visto.length > 45) {
      textoBurbuja = visto;
      /* El texto ya está TODO en el DOM: lo que va progresivo es el REVELADO
         por CSS (máquina de escribir, ~16 ms/letra). Se le dan sus letras más
         un respiro, muy por dentro de los ~9 s que el aviso permanece
         (`duracionAviso` en Valle3D) — ni tan pronto que salga a medio
         teclear, ni tan tarde que ya se haya ido. */
      /* SE DISPARA YA. Aprendido a los golpes: cada mundo tiene cooldown de
         20 min, así que hay UNA sola oportunidad por mundo y por corrida.
         Esperar a que la máquina de escribir termine quema esa oportunidad —
         bajo SwiftShader el revelado se arrastra y, cuando por fin acaba, el
         aviso ya se fue y la foto sale vacía (que además MIENTE: parecería que
         el compAI no dijo nada). Se fotografía en cuanto está en pantalla,
         aunque la frase salga a medio revelar, y se guarda además el recorte
         de la burbuja. La prueba DURA es el gate funcional de arriba. */
      /* `catch` a propósito: el canvas del valle NUNCA para de dibujar, así
         que la espera de estabilidad de Playwright a veces vence. Que falle la
         FOTO no puede tumbar el gate — el veredicto lo da el contenido. */
      await page.screenshot({ path: shot, fullPage: false, timeout: 20_000, animations: 'allow' })
        .catch((e) => console.log('  (la foto de página entera venció:', e.name, ')'));
      const caja = await page.evaluate(() => {
        const n = [...document.querySelectorAll('[class*="burbuja"], [class*="Burbuja"]')]
          .map((x) => [x, x.getBoundingClientRect()])
          .filter(([, r]) => r.width > 60 && r.height > 20)
          .sort((a, b) => b[1].width - a[1].width)[0];
        if (!n) return null;
        const r = n[1];
        return { x: Math.max(0, r.x - 14), y: Math.max(0, r.y - 14), width: Math.min(r.width + 28, 900), height: r.height + 28 };
      });
      if (caja) {
        await page.screenshot({ path: shot.replace(/\.png$/, '-burbuja.png'), clip: caja, timeout: 20_000, animations: 'allow' })
          .catch(() => {});
      }
      capturado = true;
      break;
    }
    if (visto) textoBurbuja = visto;
    await page.waitForTimeout(250);
  }
  if (!capturado) await page.screenshot({ path: shot, fullPage: false, timeout: 20_000 }).catch(() => {});

  console.log('\n── GATE VISUAL ──────────────────────────────────────────────');
  console.log('burbuja capturada:', textoBurbuja || '(vacía)');
  console.log('nombra el inventario real en pantalla:', capturado ? 'SÍ' : 'NO');
  console.log('captura:', shot);
  if (errores.length) console.log('errores de página:', errores.slice(0, 5));

  console.log('\n── VEREDICTO ────────────────────────────────────────────────');
  console.log(`  mundos cuyo comentario CAMBIÓ con datos reales: ${cambio.length}/3 (${cambio.join(', ')})`);
  console.log(`  el comentario nombra el cultivo real de la finca: ${menciona ? 'SÍ' : 'NO'}`);
  console.log(`  la burbuja EN PANTALLA lo nombra:                 ${capturado ? 'SÍ' : 'NO'}`);

  await navegador.close();
  if (!menciona || cambio.length === 0) {
    console.error('\n✗ el arreglo NO se verificó: el compAI sigue sin usar los datos de la finca.');
    process.exit(1);
  }
  if (!capturado) {
    console.error('\n✗ el motor sí habla del inventario, pero NUNCA llegó a la pantalla en una ronda entera.');
    process.exit(1);
  }
  console.log('\n✓ verificado: el compAI habla del inventario real de esta finca, y se ve.');
}

main().catch((e) => { console.error(e); process.exit(1); });
