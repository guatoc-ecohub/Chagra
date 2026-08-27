import { writeFileSync } from 'node:fs';
import { ZARIGUYA_TRAZADO_SVG } from '../src/visual/creatures/zariguyaTrazado/pielTrazado.js';
writeFileSync(new URL('./rig-reposo.svg', import.meta.url), ZARIGUYA_TRAZADO_SVG);
console.log('wrote rig-reposo.svg, len', ZARIGUYA_TRAZADO_SVG.length);
