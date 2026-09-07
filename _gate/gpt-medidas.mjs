/* Medidas de píxel del gate portal-tinta (sustituye a ImageMagick: no está
   instalado en alpha). Verifica que la captura no está vacía (fondos claro y
   noche presentes, tinta dibujada) y cuantifica el lenguaje de piel:
   los Trazado = línea de tinta (paleta chica, tinta oscura sobre papel);
   OsoBaston = lámina coloreada (paleta grande, saturación). */
import sharp from 'sharp';

const dir = '/home/kortux/Workspace/chagra/.worktrees/gate-portal-tinta-20260905/_gate';
const nombres = ['portal-tinta-zariguya.png', 'portal-tinta-luciernaga.png', 'portal-tinta-chivito-punk.png', 'portal-tinta-oso-baston.png'];

function muestra({ data, width, height }, muestrear = 2) {
  const tot = { px: 0, oscuro: 0, claro: 0, color: 0 };
  const paleta = new Map();
  for (let y = 0; y < height; y += muestrear) {
    for (let x = 0; x < width; x += muestrear) {
      const i = (y * width + x) * 3;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const croma = Math.max(r, g, b) - Math.min(r, g, b);
      tot.px++;
      if (luma < 70) tot.oscuro++;
      else if (luma > 190) tot.claro++;
      if (croma > 60) tot.color++;
      const q = `${r >> 5},${g >> 5},${b >> 5}`;
      paleta.set(q, (paleta.get(q) || 0) + 1);
    }
  }
  const top = [...paleta.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([c, n]) => `#${c.split(',').map((v) => Math.min(255, Number(v) * 8 + 4).toString(16).padStart(2, '0')).join('')}(${Math.round((100 * n) / tot.px)}%)`);
  return {
    oscuroPct: Math.round((100 * tot.oscuro) / tot.px),
    claroPct: Math.round((100 * tot.claro) / tot.px),
    colorPct: Math.round((100 * tot.color) / tot.px),
    coloresTop: top,
  };
}

async function cropRaw(path, { left, top, width, height }) {
  const { data, info } = await sharp(path).extract({ left, top, width, height }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

for (const f of nombres) {
  const full = `${dir}/${f}`;
  const cropNombre = f.replace('portal-tinta-', 'juez-crop-');
  // quita la banda del rótulo (y>=430): el juez no debe LEER la etiqueta
  await sharp(full).extract({ left: 0, top: 0, width: 700, height: 426 }).png().toFile(`${dir}/${cropNombre}`);
  const statsContenido = muestra(await cropRaw(full, { left: 0, top: 0, width: 700, height: 426 }));
  const sClaro = muestra(await cropRaw(full, { left: 20, top: 18, width: 320, height: 300 }));
  const sNoche = muestra(await cropRaw(full, { left: 360, top: 18, width: 320, height: 300 }));
  console.log(`\n== ${f} ==`);
  console.log('contenido 700x426:', JSON.stringify(statsContenido));
  console.log('panel claro 320x300:', JSON.stringify(sClaro));
  console.log('panel noche 320x300:', JSON.stringify(sNoche));
  console.log(`crop juez → ${cropNombre}`);
}
