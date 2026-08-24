// Métricas del gate sobre las capturas del harness (viewport 1400x1000,
// escena 1000px, size=840 centrado → lamina(x,y) = pantalla(80+1.7464x,
// 112.3+1.7464y)). Blanco-guante = L>205 ∧ R-B≥28 ∧ R≥236 (separa el
// blanco-papel del fondo #e9e4d6 y de la carne 210,180,152).
import sharp from 'sharp';
const S = 840 / 481, OX = 80, OY = 112.3;
const MANOS = [
  { nombre: 'lapiz', cx: 60, cy: 180, rx: 52, ry: 50, guarda: null },
  { nombre: 'brujula', cx: 152, cy: 262, rx: 44, ry: 40,
    guarda: (lx, ly) => (ly < 266 && lx < 133 ? 0 : 1) },
];
async function blancos(archivo) {
  const { data, info } = await sharp(archivo).raw().toBuffer({ resolveWithObject: true });
  const { width: W, channels: C } = info;
  const res = {};
  for (const m of MANOS) {
    let n = 0;
    const scx = OX + S * m.cx, scy = OY + S * m.cy, srx = S * m.rx + 10, sry = S * m.ry + 10;
    for (let y = Math.floor(scy - sry); y <= scy + sry; y++) {
      for (let x = Math.floor(scx - srx); x <= scx + srx; x++) {
        if (Math.hypot((x - scx) / srx, (y - scy) / sry) > 1) continue;
        const lx = (x - OX) / S, ly = (y - OY) / S;
        if (m.guarda && !m.guarda(lx, ly)) continue;
        const i = (y * W + x) * C;
        const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
        const L = 0.299 * r + 0.587 * g + 0.114 * b;
        if (L > 205 && r - b >= 28 && r >= 236) n++;
      }
    }
    res[m.nombre] = n;
  }
  return res;
}
async function diff(a, b) {
  const A = await sharp(a).raw().toBuffer({ resolveWithObject: true });
  const B = await sharp(b).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = A.info;
  let n = 0;
  for (let y = 0; y < 950; y++) {           // escena sin el rótulo (bottom 50px)
    for (let x = 0; x < 1000; x++) {         // solo la escena, no el panel
      const i = (y * W + x) * C;
      if (Math.abs(A.data[i] - B.data[i]) > 20 || Math.abs(A.data[i + 1] - B.data[i + 1]) > 20
        || Math.abs(A.data[i + 2] - B.data[i + 2]) > 20) n++;
    }
  }
  return n;
}
const G = '_gate/zariguya-lamina';
console.log('blancos-guante CRUDO (control +):', await blancos(`${G}/gate-crudo-guantes.png`));
console.log('blancos-guante IDLE  (desguante):', await blancos(`${G}/gate-idle-manos.png`));
console.log('diff anda A vs A2 (piso de ruido):', await diff(`${G}/gate-anda-A.png`, `${G}/gate-anda-A2.png`));
console.log('diff anda A vs B (medio ciclo paso):', await diff(`${G}/gate-anda-A.png`, `${G}/gate-anda-B.png`));
console.log('diff sway A vs B (medio período peso):', await diff(`${G}/gate-sway-A.png`, `${G}/gate-sway-B.png`));
