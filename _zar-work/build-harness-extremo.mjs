import { writeFileSync, readFileSync } from 'node:fs';
import { ZARIGUYA_TRAZADO_SVG } from '../src/visual/creatures/zariguyaTrazado/pielTrazado.js';

const css = readFileSync(new URL('../src/visual/creatures/zariguyaTrazado/zariguyaHuesos.css', import.meta.url), 'utf8');

// Override extremo: fuerza rotación grande en cabezaGiro/cuello/orejas para
// estresar el casquete anti-costura MÁS ALLÁ de lo que producción usa nunca.
const overrideCss = `
.zariguyaHuesos .zh-cabezaGiro{ animation:none !important; transform: rotate(-28deg) !important; }
.zariguyaHuesos .zh-cuello{ animation:none !important; transform: rotate(-16deg) !important; }
.zariguyaHuesos .zh-orejaI{ animation:none !important; transform: rotate(18deg) !important; }
.zariguyaHuesos .zh-orejaD{ animation:none !important; transform: rotate(-16deg) !important; }
`;

const html = `<!doctype html><html><head><meta charset="utf-8">
<style>
  html,body{ margin:0; background:#f4efe2; }
  .stage{ width:700px; height:1050px; display:flex; align-items:center; justify-content:center; }
  ${css}
  ${overrideCss}
</style></head>
<body>
<div class="stage">
  <div class="zariguyaHuesos zariguyaTrazado" data-creature="zariguya" data-agt-estado="idle" data-modo="normal" style="width:600px;height:950px;--zh-jaw:0;--zh-fase:0s;">
    ${ZARIGUYA_TRAZADO_SVG}
  </div>
</div>
</body></html>`;

writeFileSync(new URL('./harness.html', import.meta.url), html);
console.log('wrote harness.html (extremo)');
