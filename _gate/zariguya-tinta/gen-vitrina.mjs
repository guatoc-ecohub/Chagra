// Hornea vitrina.html: 5 estados del rig ZariguyaTrazado con la CSS canónica.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const AQUI = dirname(fileURLToPath(import.meta.url));
const RIG = join(AQUI, '../../src/visual/creatures/zariguyaTrazado');
const { ZARIGUYA_TRAZADO_SVG } = await import(join(RIG, 'pielTrazado.js'));
const css = readFileSync(join(RIG, 'zariguyaHuesos.css'), 'utf8');
const estados = [
  ['idle', 'normal', 0],
  ['thinking', 'normal', 0],
  ['speaking', 'normal', 0.55],
  ['listening', 'normal', 0],
  ['caminando', 'normal', 0],
];
const celdas = estados.map(([e, m, jaw], i) => `
  <figure>
    <div class="zariguyaHuesos zariguyaTrazado" data-creature="zariguya" data-agt-estado="${e}"
         data-modo="${m}" style="--zh-jaw:${jaw};--zh-fase:${(-i * 1.7).toFixed(2)}s;width:430px;height:430px;display:inline-flex;align-items:center;justify-content:center;line-height:0">
      ${ZARIGUYA_TRAZADO_SVG}
    </div>
    <figcaption>${e}${jaw ? ` (jaw ${jaw})` : ''}</figcaption>
  </figure>`).join('\n');
const html = `<!doctype html><html><head><meta charset="utf-8"><title>zarigüeya tinta — 5 estados</title>
<style>
${css}
body { margin: 0; background: #f2ecdd; font-family: monospace; }
main { display: flex; gap: 6px; padding: 10px; }
figure { margin: 0; text-align: center; }
figcaption { font-size: 15px; color: #3a2f22; padding-top: 2px; }
</style></head><body><main>
${celdas}
</main></body></html>`;
writeFileSync(join(AQUI, 'vitrina.html'), html);
console.log('vitrina.html OK,', Math.round(html.length / 1024), 'KB');
