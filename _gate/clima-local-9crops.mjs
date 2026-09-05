import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:5199';
const headed = process.env.HEADED !== '0';

const browser = await chromium.launch({
  headless: !headed,
  executablePath: process.env.CHROME_BIN || undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleLogs = [];
const pageErrors = [];
page.on('console', (msg) => {
  const t = msg.text();
  if (/\[sidecar\]|\[DB\]|\[Migration\]|\[AlertEngine\]|\[SQLite|Error|error|failed/i.test(t)) consoleLogs.push(`[${msg.type()}] ${t}`);
});
page.on('pageerror', (err) => pageErrors.push(String(err)));

await page.goto(`${BASE}/#/mockups/mundo3d-clima`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(5000);

const seedResult = await page.evaluate(async () => {
  const out = [];
  const addOne = async (id, name, slug) => {
    try {
      const { default: useAssetStore } = await import('/src/store/useAssetStore.js');
      await useAssetStore.getState().addAsset('plant', {
        id,
        type: 'asset--plant',
        attributes: {
          name,
          status: 'active',
          notes: { value: 'Planta de verificación radar clima (finca control).', format: 'plain_text' },
          _demo: true,
          _chagra_plant_meta: { especie_slug: slug, variedad: null, cantidad: 1, fenologia: 'growth' },
        },
        relationships: {
          plant_type: { data: { type: 'taxonomy_term--plant_type', id: slug } },
          location: { data: [] },
        },
      });
      out.push(`ok ${name}`);
    } catch (e) {
      out.push(`ERR ${name} :: ${String(e).slice(0, 300)}`);
    }
  };
  const crops = [
    ['verif-fresa', 'Fresa', 'fresa'],
    ['verif-granadilla', 'Granadilla', 'granadilla'],
    ['verif-tomate', 'Tomate', 'tomate'],
    ['verif-tomate-cherry', 'Tomate cherry', 'tomate_cherry'],
    ['verif-espinaca', 'Espinaca', 'espinaca'],
    ['verif-gulupa', 'Gulupa', 'gulupa'],
    ['verif-limon', 'Limón', 'limon'],
    ['verif-guayaba', 'Guayaba', 'guayaba'],
    ['verif-cacao', 'Cacao', 'cacao'],
    ['verif-cilantro', 'Cilantro', 'cilantro'],
  ];
  for (const c of crops) await addOne(...c);
  return out;
});

await page.waitForTimeout(2500);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);

const shot = process.argv[2] || '_gate/capturas-clima/local-mundo3d-clima-9crops.png';
await page.screenshot({ path: shot, fullPage: true });

const result = await page.evaluate(() => {
  const txt = (sel) => Array.from(document.querySelectorAll(sel)).map((e) => e.innerText.trim());
  const cards = Array.from(document.querySelectorAll('[data-testid^="clima-sugerencia-"]')).map((e) => ({
    testid: e.getAttribute('data-testid'),
    head: e.querySelector('h3')?.innerText || '',
    sub: e.querySelector('.m3dc__crop-card-topline p')?.innerText || '',
    text: (e.querySelector('.m3dc__crop-text')?.innerText || '').slice(0, 220),
    sources: e.querySelector('.m3dc__crop-source')?.innerText || '',
  }));
  const metrics = Array.from(document.querySelectorAll('[data-testid^="clima-metrica-"]')).map((e) => {
    const strong = e.querySelector('strong')?.innerText || '';
    return `${e.querySelector('span')?.innerText || ''}=${strong}`;
  });
  const conSenal = txt('.m3dc__crop-count');
  const hudTitle = txt('.m3dc__hudmain h2, .m3dc__hudsub, .m3dc__signal + span, .m3dc__hudsource');
  const estadoLectura = txt('.m3dc__readout b');
  return {
    totalCards: cards.length,
    cards,
    metrics,
    conSenal,
    hudTitle,
    estadoLectura,
    radarPresent: !!document.querySelector('[data-testid="clima-sugerencias"]'),
    bodyHasFichaPendiente: document.body.innerText.includes('Ficha pendiente'),
    bodyHasSenalPendiente: document.body.innerText.includes('Señal pendiente'),
  };
});

console.log(JSON.stringify({ seedResult, consoleLogs: consoleLogs.slice(0, 30), pageErrors: pageErrors.slice(0, 10), dom: result }, null, 2));
await browser.close();
