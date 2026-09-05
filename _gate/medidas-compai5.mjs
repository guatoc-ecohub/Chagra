import sharp from 'sharp';

const DIR = '/home/kortux/Workspace/chagra/_gate';
const FILES = ['avatar-tinta5-angelita.png', 'avatar-tinta5-jaguar.png', 'avatar-tinta5-zariguya.png', 'avatar-tinta5-oso-baston.png', 'avatar-tinta5-luciernaga.png'];

for (const f of FILES) {
  const slug = f.replace('avatar-tinta5-', '').replace('.png', '');
  const { data, info } = await sharp(`${DIR}/${f}`).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const n = info.width * info.height;
  let bg = 0, ink = 0, colorful = 0, mid = 0;
  const nonBg = new Map();
  for (let i = 0; i < n; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    const distPaper = Math.abs(r - 244) + Math.abs(g - 239) + Math.abs(b - 226);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (distPaper < 45) { bg++; continue; }
    const l = max / 255;
    const chroma = max === 0 ? 0 : (max - min) / max;
    if (l < 0.38 && chroma < 0.3) { ink++; }
    else if (chroma > 0.25) { colorful++; }
    else { mid++; }
    const rgbKey = `${(Math.round(r / 32) * 32)},${(Math.round(g / 32) * 32)},${(Math.round(b / 32) * 32)}`;
    nonBg.set(rgbKey, (nonBg.get(rgbKey) || 0) + 1);
  }
  const total = n;
  const pct = (x) => ((x / total) * 100).toFixed(1);
  const topCol = [...nonBg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log(`== ${slug} ==`);
  console.log(`  papel ${pct(bg)}% · tinta oscura ${pct(ink)}% · color fuerte ${pct(colorful)}% · tono medio ${pct(mid)}%`);
  console.log(`  top colores (no papel): ${topCol.map(([k, x]) => `${k}(${x}px)`).join('  ')}`);
}
