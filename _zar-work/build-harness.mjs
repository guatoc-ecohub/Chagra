import { writeFileSync, readFileSync } from 'node:fs';
import { ZARIGUYA_TRAZADO_SVG } from '../src/visual/creatures/zariguyaTrazado/pielTrazado.js';

const css = readFileSync(new URL('../src/visual/creatures/zariguyaTrazado/zariguyaHuesos.css', import.meta.url), 'utf8');

const estado = process.argv[2] || 'idle';
const modo = process.argv[3] || 'normal';
const extra = process.argv[4] || ''; // e.g. inline style overrides for extreme pose test

const html = `<!doctype html><html><head><meta charset="utf-8">
<style>
  html,body{ margin:0; background:#f4efe2; }
  .stage{ width:700px; height:1050px; display:flex; align-items:center; justify-content:center; }
  ${css}
</style></head>
<body>
<div class="stage">
  <div class="zariguyaHuesos zariguyaTrazado" data-creature="zariguya" data-agt-estado="${estado}" data-modo="${modo}" style="width:600px;height:950px;--zh-jaw:0;--zh-fase:0s;${extra}">
    ${ZARIGUYA_TRAZADO_SVG}
  </div>
</div>
</body></html>`;

writeFileSync(new URL('./harness.html', import.meta.url), html);
console.log('wrote harness.html estado=' + estado + ' modo=' + modo);
