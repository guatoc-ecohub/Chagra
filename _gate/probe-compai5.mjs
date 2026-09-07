import { chromium } from 'playwright-core';

const EXEC = '/home/kortux/.local/bin/chromium';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:5273/tests/visual/compai-tinta5-gate-harness.html';
const COMPAIS = ['angelita', 'jaguar', 'zariguya', 'oso-baston', 'luciernaga'];

const browser = await chromium.launch({ executablePath: EXEC, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 560, height: 560 } });
const pageErrs = [];
const reqFail = [];
page.on('pageerror', (e) => pageErrs.push(String(e)));
page.on('requestfailed', (r) => reqFail.push(`${r.method()} ${r.url()} ${r.failure()?.errorText || ''}`));

for (const c of COMPAIS) {
  const url = `${BASE}?compai=${c}&estado=caminando`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector(`[data-compai="${c}"]`, { timeout: 20000 });
  await page.waitForTimeout(1200);
  const info = await page.evaluate((slug) => {
    const root = document.querySelector(`[data-compai="${slug}"]`);
    const svgs = root ? root.querySelectorAll('svg') : [];
    const s = svgs.length ? svgs[svgs.length - 1] : null;
    return {
      compai: root?.getAttribute('data-compai'),
      estado: root?.getAttribute('data-agt-estado'),
      svgCount: svgs.length,
      viewBox: s?.getAttribute('viewBox') || null,
      svgSize: s ? `${s.clientWidth}x${s.clientHeight}` : null,
      bodyText: (document.body.innerText || '').slice(0, 40),
    };
  }, c);
  console.log(JSON.stringify({ ...info, pageErrs: pageErrs.length, reqFail: reqFail.length }));
  pageErrs.length = 0;
  reqFail.length = 0;
}
await browser.close();
