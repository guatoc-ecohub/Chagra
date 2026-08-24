/*
 * GATE de la marcha rubber-hose: en «caminando», los 7 (jaguar + 6) mueven
 * las patas en ciclo real. Tres pruebas por tarjeta, ninguna adivina:
 *  1. las animaciones ESPERADAS corren (computedStyle.animationName);
 *  2. el transform de una pata CAMBIA entre dos muestras (no está pausado);
 *  3. captura de la tarjeta completa en dos fases del ciclo (cuerpo entero,
 *     prueba visual para el operador).
 * El jaguar lámina-viva se muestrea aparte (sigue siendo gait por hueso).
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const out = new URL('./capturas/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const URL_PAGINA = process.env.GATE_URL || 'http://127.0.0.1:5391/comparador-vivo.html';

const ESPERADAS = {
  jaguar: ['jaguar-paso-lado'],
  zariguya: ['zari-paso-i', 'zari-paso-d', 'zari-camina-cuerpo'],
  luciernaga: ['luci-paso-i', 'luci-paso-d', 'luci-suelo-bob'],
  oso: ['osb-paso-i', 'osb-paso-d', 'osb-camina-cuerpo'],
  chivito: ['chp-paso-i', 'chp-paso-d', 'chp-suelo-bob'],
  angelita: ['ang-paso-i', 'ang-paso-d', 'ang-camina-cuerpo'],
  guacamaya: ['gcp-paso-i', 'gcp-paso-d', 'gcp-suelo-bob'],
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
    out.push({
      slug,
      faltan,
      testigoExiste: !!testigo,
      t0: testigo ? getComputedStyle(testigo).transform : null,
    });
  }
  return out;
}, { ESPERADAS, PATA_TESTIGO });

await page.waitForTimeout(340);

const t1s = await page.evaluate((PATA_TESTIGO) => {
  const out = {};
  for (const par of document.querySelectorAll('section.par')) {
    const slug = par.querySelector('h3 code').textContent.trim();
    const antes = par.querySelectorAll('.panel')[0];
    const testigo = antes.querySelector(PATA_TESTIGO[slug]);
    out[slug] = testigo ? getComputedStyle(testigo).transform : null;
  }
  /* jaguar lámina viva: la pata del gait por hueso, en el panel DESPUÉS */
  const parJaguar = [...document.querySelectorAll('section.par')].find((p) => p.querySelector('h3 code').textContent.trim() === 'jaguar');
  const despues = parJaguar?.querySelectorAll('.panel')[1];
  const pataLv = despues?.querySelector('.jlv-pataPivote');
  out.__jaguarLv = pataLv ? (getComputedStyle(pataLv).transform) : 'NO ENCONTRADA';
  return out;
}, PATA_TESTIGO);

await page.waitForTimeout(340);
const t2Lv = await page.evaluate(() => {
  const parJaguar = [...document.querySelectorAll('section.par')].find((p) => p.querySelector('h3 code').textContent.trim() === 'jaguar');
  const despues = parJaguar?.querySelectorAll('.panel')[1];
  const pataLv = despues?.querySelector('.jlv-pataPivote');
  return pataLv ? (getComputedStyle(pataLv).transform) : 'NO ENCONTRADA';
});

const resumen = [];
for (const d of dictamen) {
  const t1 = t1s[d.slug];
  resumen.push({
    slug: d.slug,
    animacionesEsperadas: d.faltan.length === 0 ? 'CORREN TODAS' : `FALTAN: ${d.faltan.join(', ')}`,
    pataTestigo: d.testigoExiste ? (d.t0 !== t1 ? 'SE MUEVE' : `CLAVADA (${d.t0})`) : 'NO EXISTE',
  });
}
resumen.push({ slug: 'jaguar-lamina-viva', pataTestigo: t1s.__jaguarLv !== t2Lv ? 'SE MUEVE (gait por hueso)' : `CLAVADA (${t1s.__jaguarLv})` });

/* capturas: tarjeta completa en dos fases del ciclo */
const tarjetas = await page.$$('section.par');
for (const tarjeta of tarjetas) {
  const slug = (await tarjeta.$eval('h3 code', (n) => n.textContent)).trim();
  await tarjeta.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  await tarjeta.screenshot({ path: join(out, `${slug}-fase-a.png`) });
  await page.waitForTimeout(430);
  await tarjeta.screenshot({ path: join(out, `${slug}-fase-b.png`) });
}

console.log(JSON.stringify({ erroresPagina, resumen }, null, 2));
await browser.close();
