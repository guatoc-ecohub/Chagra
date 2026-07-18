import { chromium } from 'playwright';

const OUT = '/tmp/claude-1000/-home-kortux/93695a3d-dc16-45f5-8c0e-608e6e767ffd/scratchpad';
const URL = 'http://localhost:4183/?ciclo=11#/valle3d';

async function main() {
  const browser = await chromium.launch({
    executablePath: '/run/current-system/sw/bin/chromium',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 1350, height: 900 } });
  const errors = [];
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

  await page.goto(URL, { waitUntil: 'commit' });
  await page.waitForTimeout(9000);

  // El rótulo del páramo (chip con el emoji de montaña) — buscar el botón cuyo texto/aria mencione "páramo".
  const boton = page.locator('[class*="valle-poi"]', { hasText: /p.ramo/i }).first();
  const existe = await boton.count();
  console.log('boton paramo encontrado (por texto):', existe);

  // Fallback: cualquier v3d-poi con emoji de montaña 🏔️
  const porEmoji = page.getByText('🏔️').first();
  const existeEmoji = await porEmoji.count();
  console.log('emoji montaña encontrado:', existeEmoji);

  const target = existe ? boton : porEmoji;
  await target.click({ force: true, timeout: 5000 }).catch((e) => console.log('click fallo:', e.message));
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/valle-fino-paramo-click.png` });
  console.log('screenshot tras click listo');
  console.log('ERRORS:', JSON.stringify(errors, null, 2));

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
