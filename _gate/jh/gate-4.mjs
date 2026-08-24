/*
 * gate-4.mjs — los CUATRO gates de cierre del jaguar Humboldt vectorial.
 *  1. CAMINA   — animaciones de marcha corriendo + pata testigo que cambia +
 *                fases A/B congeladas con WAAPI (preserva delays) que difieren
 *                en píxeles (sharp canal a canal, d>20).
 *  2. CABEZA   — mirausted mueve la testa (transform computado + diff píxel),
 *                recortes 4x del cuello para el juez VL, y CONTROL POSITIVO:
 *                una decapitación forzada que el juez DEBE reprobar (si no,
 *                el instrumento está muerto). También acecho congelado.
 *  3/4.        — capturas para los jueces Humboldt (lámina de perfil) y
 *                Cuphead (retrato vivo) + prueba de vida por diff entre dos
 *                fases congeladas del boil (squash&stretch se LEE).
 * Los veredictos VL los emite judge-vl por fuera; aquí solo instrumento.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const BASE = process.env.GATE_URL || 'http://127.0.0.1:7437/jaguar-humboldt-gate.html';
const out = new URL('./evidencia/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: false, executablePath: '/home/kortux/.local/bin/chromium' });
const page = await browser.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 });
const errores = [];
page.on('pageerror', (e) => errores.push(`pageerror: ${e}`));
page.on('requestfailed', (r) => errores.push(`requestfailed: ${r.url()}`));

const informe = {};
const svgEl = () => page.$('svg[data-creature="jaguar"]');
async function abrir(query) {
  await page.goto(`${BASE}${query}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('body[data-listo="1"]', { timeout: 10000 });
  await page.waitForTimeout(200);
}
async function congela(t) {
  await page.evaluate((tt) => {
    for (const a of document.getAnimations({ subtree: true })) {
      a.pause();
      a.currentTime = /blink|parpad|guin|ojo/i.test(a.animationName || '') ? 10 : tt * 1000;
    }
  }, t);
  await page.waitForTimeout(150);
}
async function shot(nombre) {
  const s = await svgEl();
  const b = await s.boundingBox();
  await page.screenshot({
    path: join(out, nombre),
    clip: { x: b.x - 10, y: b.y - 10, width: b.width + 95, height: b.height + 20 },
  });
  return join(out, nombre);
}
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
/* recorte del CUELLO con CONTEXTO: cabeza y pecho COMPLETOS en cuadro (si la
   cabeza queda fuera del encuadre, el juez alucina "unida" — el control
   decapitado lo demostro). ~3x de zoom, suficiente y con contexto. */
async function recorteCuello(png, nombre) {
  await sharp(png).extract({ left: 130, top: 55, width: 290, height: 300 })
    .resize(870).toFile(join(out, nombre));
  return join(out, nombre);
}

/* ═══ GATE 1 — CAMINA ═══ */
await abrir('?pose=camina');
const T = 1.05;
informe.camina = await page.evaluate(() => {
  const corren = new Set();
  for (const el of document.querySelectorAll('svg *')) {
    const a = getComputedStyle(el).animationName;
    if (a && a !== 'none') a.split(',').forEach((x) => corren.add(x.trim()));
  }
  const esperadas = ['jaguar-paso-lado', 'jaguar-tronco-lado', 'jaguar-hombro-lado', 'jaguar-cola-lado', 'jaguar-cabeza-lado'];
  return { faltan: esperadas.filter((x) => !corren.has(x)) };
});
await congela((20 + 0.28) * T);
informe.camina.tA = await page.$eval('.jaguar-lado-dc', (n) => getComputedStyle(n).transform);
const faseA = await shot('camina-fase-a.png');
await congela((20 + 0.78) * T);
informe.camina.tB = await page.$eval('.jaguar-lado-dc', (n) => getComputedStyle(n).transform);
const faseB = await shot('camina-fase-b.png');
informe.camina.testigoSeMueve = informe.camina.tA !== informe.camina.tB;
informe.camina.diffAB = await diffPct(faseA, faseB);

/* ═══ GATE 2 — CABEZA (mirausted + acecho + control decapitado) ═══ */
await abrir('');
const basePng = await shot('cabeza-base.png');
informe.cabeza = {};
informe.cabeza.transformBase = await page.$eval('.jaguar-cabeza-mira', (n) => getComputedStyle(n).transform);
await page.evaluate(() => {
  const s = document.querySelector('svg[data-creature="jaguar"]');
  s.style.setProperty('--rh-mx', '0.55px');
  s.style.setProperty('--rh-my', '-0.2px');
  s.setAttribute('data-rh-mira', 'usted');
});
await page.waitForTimeout(550);
informe.cabeza.transformMira = await page.$eval('.jaguar-cabeza-mira', (n) => getComputedStyle(n).transform);
const miraPng = await shot('cabeza-mira.png');
informe.cabeza.testaSeMueve = informe.cabeza.transformBase !== informe.cabeza.transformMira;
informe.cabeza.diffBaseMira = await diffPct(basePng, miraPng);
await recorteCuello(miraPng, 'cabeza-mira-cuello-4x.png');
/* control POSITIVO del instrumento: decapitación forzada (el juez debe decir NO) */
await page.evaluate(() => {
  const m = document.querySelector('.jaguar-cabeza-mira');
  m.style.transition = 'none';
  m.style.transform = 'translate(5px, -4px)';
});
await page.waitForTimeout(250);
const decapPng = await shot('cabeza-control-decapitada.png');
await recorteCuello(decapPng, 'cabeza-control-decapitada-4x.png');
/* control DURO para el instrumento de conectividad (sharp): decapitacion
   franca sin contacto posible — el analisis de componentes conexas DEBE
   verla separada o el instrumento esta muerto. */
await page.evaluate(() => {
  const m = document.querySelector('.jaguar-cabeza-mira');
  m.style.transform = 'translate(12px, -9px)';
});
await page.waitForTimeout(250);
await shot('cabeza-control-decapitada-dura.png');
/* acecho congelado con la testa ABAJO (fase 50% de 3.2s) */
await abrir('?acecha=1');
await congela(1.6);
const acechaPng = await shot('cabeza-acecha.png');
await recorteCuello(acechaPng, 'cabeza-acecha-cuello-4x.png');

/* ═══ GATE 3 — lámina Humboldt (captura limpia congelada para el juez) ═══ */
await abrir('?pose=camina');
await congela((20 + 0.28) * T);
await shot('humboldt-lamina.png');

/* ═══ GATE 4 — Cuphead vivo: el squash&stretch SE LEE entre fases del boil ═══ */
await abrir('');
await congela(30.25);
const boilA = await shot('cuphead-boil-a.png');
await congela(30.95);
const boilB = await shot('cuphead-boil-b.png');
informe.cuphead = { diffBoil: await diffPct(boilA, boilB) };

await browser.close();
informe.errores = errores;
writeFileSync(join(out, 'informe.json'), JSON.stringify(informe, null, 2));
console.log(JSON.stringify(informe, null, 2));
process.exit(errores.length ? 1 : 0);
