/*
 * GATE de la ZANCADA rubber-hose (corrección post-veredicto Cuphead): en
 * «caminando», los 7 rigs muestran una MARCHA legible — pata levantada del
 * suelo en cada medio ciclo y peso del cuerpo que se desplaza. Pruebas:
 *  1. las animaciones ESPERADAS corren (computedStyle.animationName);
 *  2. el transform de la pata testigo CAMBIA entre dos muestras libres;
 *  3. capturas DETERMINISTAS en dos fases opuestas del ciclo (28% y 78%),
 *     congeladas con Web Animations API (anim.pause() + currentTime) — que
 *     PRESERVA los delays entre patas, a diferencia del animation-delay
 *     global !important del truco ?congela (aplastaría el 4 tiempos del
 *     jaguar y el -T/2 de la pata contraria);
 *  4. diff de píxeles A↔B por tarjeta con sharp canal a canal (d>20), el
 *     mismo número que los auditores midieron (jaguar 1%, oso 2%).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const out = new URL('./capturas-zancada/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const URL_PAGINA = process.env.GATE_URL || 'http://127.0.0.1:5391/comparador-vivo.html';

const ESPERADAS = {
  jaguar: ['jaguar-paso-lado', 'jaguar-tronco-lado'],
  zariguya: ['zari-zancada', 'zari-camina-cuerpo'],
  luciernaga: ['luci-zancada-i', 'luci-zancada-d', 'luci-suelo-bob'],
  oso: ['osb-zancada', 'osb-camina-cuerpo'],
  chivito: ['chp-zancada', 'chp-suelo-bob'],
  angelita: ['ang-zancada', 'ang-camina-cuerpo'],
  guacamaya: ['gcp-zancada', 'gcp-suelo-bob'],
};
/* selector de UNA pata cuyo transform debe cambiar en el tiempo */
const PATA_TESTIGO = {
  jaguar: '.jaguar-lado-dc',
  zariguya: '.zari-pierna-i',
  luciernaga: '.luci-pata-ti',
  oso: '.osb-pierna-i',
  chivito: '.chp-pata-i',
  angelita: '.ang-pierna-i',
  guacamaya: '.gcp-pata-i',
};
/* T del ciclo de marcha por rig (s) — para congelar fases comparables */
const CICLO_S = {
  jaguar: 1.05, zariguya: 1.15, luciernaga: 0.95, oso: 1.3,
  chivito: 0.9, angelita: 1.0, guacamaya: 1.1,
};

const browser = await chromium.launch({ headless: false, executablePath: '/home/kortux/.local/bin/chromium' });
const page = await browser.newPage({ viewport: { width: 1240, height: 980 }, deviceScaleFactor: 1 });
const erroresPagina = [];
page.on('pageerror', (e) => erroresPagina.push(String(e)));
await page.goto(URL_PAGINA, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

/* activar «caminando» en todas las tarjetas */
await page.evaluate(() => {
  for (const par of document.querySelectorAll('section.par')) {
    const btn = [...par.querySelectorAll('.ctrl .grupo button')].find((b) => b.textContent.trim() === 'caminando');
    if (btn) btn.click();
  }
});
await page.waitForTimeout(900);

/* 1: animaciones esperadas corriendo en el panel ANTES */
const dictamen = await page.evaluate(({ ESPERADAS, PATA_TESTIGO }) => {
  const out = [];
  for (const par of document.querySelectorAll('section.par')) {
    const slug = par.querySelector('h3 code').textContent.trim();
    const antes = par.querySelectorAll('.panel')[0];
    const corren = new Set();
    for (const el of antes.querySelectorAll('*')) {
      const a = getComputedStyle(el).animationName;
      if (a && a !== 'none') a.split(',').forEach((n) => corren.add(n.trim()));
    }
    const esperadas = ESPERADAS[slug] || [];
    const faltan = esperadas.filter((n) => !corren.has(n));
    const testigo = antes.querySelector(PATA_TESTIGO[slug]);
    out.push({ slug, faltan, testigoExiste: !!testigo });
  }
  return out;
}, { ESPERADAS, PATA_TESTIGO });

/* 3: capturas congeladas en dos fases OPUESTAS del ciclo. En 28% la pata «d»
   (corre a -T/2) va en pleno VUELO; en 78% vuela la «i». Web Animations API:
   pausar TODO el subtree de la tarjeta y clavar currentTime — los delays
   relativos se preservan porque currentTime es tiempo de línea, no de efecto.
   El parpadeo se clava aparte al arranque de su ciclo (ojos ABIERTOS): a un
   ciclo de ~7s la fase que caiga puede dejar el fotograma con ojos cerrados
   (la memoria del párpado del jaguar). El transform de la pata testigo se
   compara ENTRE fases congeladas (2): el muestreo con la marcha corriendo
   libre resultó flaky — con la ventana ocluida el compositor no actualiza el
   estilo y las dos muestras salen idénticas aunque la marcha corra. */
async function congelar(tarjeta, faseS) {
  await tarjeta.evaluate((nodo, t) => {
    for (const a of nodo.getAnimations({ subtree: true })) {
      a.pause();
      a.currentTime = /blink|parpad|guin|ojo/i.test(a.animationName || '') ? 10 : t * 1000;
    }
  }, faseS);
}
async function descongelar(tarjeta) {
  await tarjeta.evaluate((nodo) => {
    for (const a of nodo.getAnimations({ subtree: true })) a.play();
  });
}

const tarjetas = await page.$$('section.par');
const testigos = {};
for (const tarjeta of tarjetas) {
  const slug = (await tarjeta.$eval('h3 code', (n) => n.textContent)).trim();
  const T = CICLO_S[slug] || 1;
  const selTestigo = PATA_TESTIGO[slug];
  await tarjeta.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  /* +20T de colchón: con delays negativos el tiempo efectivo queda positivo */
  await congelar(tarjeta, (20 + 0.28) * T);
  await page.waitForTimeout(120);
  const tA = await tarjeta.evaluate((nodo, sel) => {
    const el = nodo.querySelector(sel);
    return el ? getComputedStyle(el).transform : null;
  }, selTestigo);
  await tarjeta.screenshot({ path: join(out, `${slug}-fase-a.png`) });
  await congelar(tarjeta, (20 + 0.78) * T);
  await page.waitForTimeout(120);
  const tB = await tarjeta.evaluate((nodo, sel) => {
    const el = nodo.querySelector(sel);
    return el ? getComputedStyle(el).transform : null;
  }, selTestigo);
  await tarjeta.screenshot({ path: join(out, `${slug}-fase-b.png`) });
  await descongelar(tarjeta);
  testigos[slug] = { tA, tB };
}

/* 4: diff de píxeles canal a canal (d>20 = visible) entre fase A y B */
async function diffPct(pngA, pngB) {
  const a = await sharp(pngA).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const b = await sharp(pngB).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) return { error: 'tamaños distintos' };
  const n = a.info.width * a.info.height;
  let distintos = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (Math.abs(a.data[o] - b.data[o]) > 20
      || Math.abs(a.data[o + 1] - b.data[o + 1]) > 20
      || Math.abs(a.data[o + 2] - b.data[o + 2]) > 20) distintos++;
  }
  return { distintos, total: n, pct: +(100 * distintos / n).toFixed(2) };
}

const resumen = [];
for (const d of dictamen) {
  const t = testigos[d.slug] || {};
  const diff = await diffPct(join(out, `${d.slug}-fase-a.png`), join(out, `${d.slug}-fase-b.png`));
  resumen.push({
    slug: d.slug,
    animacionesEsperadas: d.faltan.length === 0 ? 'CORREN TODAS' : `FALTAN: ${d.faltan.join(', ')}`,
    pataTestigo: d.testigoExiste
      ? (t.tA && t.tA !== t.tB ? 'SE MUEVE (pose distinta en A y B)' : `CLAVADA (${t.tA})`)
      : 'NO EXISTE',
    diffAB: diff,
  });
}

const informe = { erroresPagina, resumen };
console.log(JSON.stringify(informe, null, 2));
writeFileSync(join(out, 'informe.json'), JSON.stringify(informe, null, 2));
await browser.close();
