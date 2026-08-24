/*
 * Sonda precisa sobre la página viva: por tarjeta, activar «caminando» y
 * preguntar al DOM qué animaciones CORREN de verdad en el panel ANTES
 * (rubber-hose): data-pose del svg, y animationName computado de patas y
 * cuerpo. No adivina con píxeles — pregunta.
 */
import { chromium } from 'playwright';

const URL_VIVA = process.env.GATE_URL || 'http://127.0.0.1:8800/compai-antes-despues.html';
const browser = await chromium.launch({ headless: false, executablePath: '/home/kortux/.local/bin/chromium' });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.goto(URL_VIVA, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

const info = await page.evaluate(() => {
  const out = [];
  for (const par of document.querySelectorAll('section.par')) {
    const titulo = par.querySelector('h3').textContent.trim();
    const btn = [...par.querySelectorAll('.ctrl .grupo button')].find((b) => b.textContent.trim() === 'caminando');
    if (btn) btn.click();
    out.push(titulo);
  }
  return out;
});
await page.waitForTimeout(800);

const res = await page.evaluate(() => {
  const anims = (root) => {
    const vistos = {};
    for (const el of root.querySelectorAll('*')) {
      const a = getComputedStyle(el).animationName;
      if (a && a !== 'none') {
        const k = el.getAttribute('class') || el.tagName;
        vistos[`${k}`] = a;
      }
    }
    return vistos;
  };
  const out = [];
  for (const par of document.querySelectorAll('section.par')) {
    const titulo = par.querySelector('h3').textContent.trim();
    const antes = par.querySelectorAll('.panel')[0];
    const svg = antes.querySelector('svg');
    out.push({
      titulo,
      dataPose: svg?.getAttribute('data-pose') || svg?.getAttribute('data-estado') || null,
      dataCreature: svg?.getAttribute('data-creature') || null,
      animaciones: svg ? anims(svg) : 'SIN SVG',
    });
  }
  return out;
});
console.log(JSON.stringify(res, null, 2));
await browser.close();
