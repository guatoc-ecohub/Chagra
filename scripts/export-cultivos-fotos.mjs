#!/usr/bin/env node
/**
 * export-cultivos-fotos.mjs — descarga UNA foto real de licencia abierta por
 * cultivo insignia desde Wikimedia Commons a public/crop-photos/<slug>.jpg
 * (offline-first) + escribe public/crop-photos/_meta.json con la atribución
 * (autor + licencia + fuente) para el cumplimiento CC y los créditos en la UI.
 *
 * Mismo patrón que public/soil-life: usa el thumbnail de Commons
 * (iiurlwidth=640) → ya viene redimensionado, sin necesidad de convert/sharp.
 * Solo licencias abiertas (CC0 / PD / CC BY / CC BY-SA).
 *
 * Uso:  node scripts/export-cultivos-fotos.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public', 'crop-photos');
fs.mkdirSync(OUT_DIR, { recursive: true });

const UA = 'ChagraAgroecology/1.0 (https://chagra.bio; agro@chagra.bio)';
const WIDTH = 640;

// Candidatos por cultivo: archivos concretos de Commons (recognizable, buena
// foto). Se prueban en orden; el primero con licencia abierta gana.
const CROPS = [
  { slug: 'maiz', files: ['Cornfield in South Africa2.jpg', 'Corncobs.jpg', 'Zea mays fraise.jpg'] },
  { slug: 'frijol', files: ['Hopi Black Beans (Phaseolus vulgaris) (b2453f34-155d-451f-6722-3fb18b788d3c).JPG', 'Phaseolus vulgaris MHNT.BOT.2016.24.73.jpg', 'Stangenbohnen sehr früh-Pfalz-7-Mai-Josef Schlaghecken.jpg'] },
  { slug: 'ahuyama', files: ['Cucurbita moschata Butternut 2012 G1.jpg', 'Calabaza.jpg', 'Cucurbita moschata.jpg'] },
  { slug: 'papa', files: ['Patates.jpg', 'Solanum tuberosum Foliage 2400px.jpg', 'Potato plants.jpg'] },
  { slug: 'cafe', files: ['Coffea arabica - Köhler–s Medizinal-Pflanzen-189.jpg', 'Roasted coffee beans.jpg', 'Coffea arabica 2012.jpg', 'Café en grano.jpg'] },
  { slug: 'aguacate', files: ['Persea americana fruit 2.JPG', 'Avocado Hass - single and halved.jpg', 'Aguacate Hass.jpg'] },
  { slug: 'tomate', files: ['Bright red tomato and cross section02.jpg', 'Tomato je.jpg', 'Solanum lycopersicum - tomato plant.jpg'] },
  { slug: 'platano', files: ['Bananas white background DS.jpg', 'Musa paradisiaca - flower and fruit.jpg', 'Banana plantation.jpg'] },
  { slug: 'cacao', files: ['Cacao-pod-k4636-14.jpg', 'Theobroma cacao - fruit.jpg', 'Cocoa Pods.JPG'] },
  { slug: 'cana', files: ['Sugar cane.jpg', 'Saccharum officinarum - Köhler–s Medizinal-Pflanzen-126.jpg', 'Sugarcane field.jpg'] },
  { slug: 'cebolla', files: ['Onions.jpg', 'Red Onion on White.JPG', 'Allium cepa in Kew.jpg'] },
  { slug: 'zanahoria', files: ['Carrots of many colors.jpg', 'Daucus carota - carrot.jpg', 'Carrot field.jpg'] },
];

const OK_LICENSES = /(cc0|cc-zero|public domain|publicdomain|^pd|cc-by|cc by)/i;

async function imageInfo(file) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('format', 'json');
  url.searchParams.set('prop', 'imageinfo');
  url.searchParams.set('titles', `File:${file}`);
  url.searchParams.set('iiprop', 'url|extmetadata');
  url.searchParams.set('iiurlwidth', String(WIDTH));
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) return null;
  const j = await r.json();
  const pages = j?.query?.pages || {};
  const page = Object.values(pages)[0];
  const ii = page?.imageinfo?.[0];
  if (!ii) return null;
  const meta = ii.extmetadata || {};
  const license = (meta.LicenseShortName?.value || meta.License?.value || '').replace(/<[^>]+>/g, '').trim();
  const artist = (meta.Artist?.value || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const licenseUrl = meta.LicenseUrl?.value || '';
  return {
    file,
    thumb: ii.thumburl,
    descriptionurl: ii.descriptionurl,
    license,
    licenseUrl,
    artist: artist || 'Wikimedia Commons',
  };
}

async function download(u, dest) {
  const r = await fetch(u, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const manifest = {
  _note:
    'Fotos de cultivos insignia — Wikimedia Commons, licencia abierta (CC0 / dominio público / CC BY / CC BY-SA). Thumbnails a 640 px. Atribución embebida en la UI (CultivosInsigniaScreen → créditos) y aquí para auditoría de licencias.',
};

for (const crop of CROPS) {
  let got = null;
  for (const file of crop.files) {
    try {
      const info = await imageInfo(file);
      await sleep(700);
      if (!info || !info.thumb) continue;
      if (!OK_LICENSES.test(info.license)) {
        console.error(`  · ${crop.slug}: «${file}» licencia no abierta (${info.license}), sigo`);
        continue;
      }
      const bytes = await download(info.thumb, path.join(OUT_DIR, `${crop.slug}.jpg`));
      got = { ...info, bytes };
      break;
    } catch (e) {
      console.error(`  · ${crop.slug}: «${file}» falló (${e.message}), sigo`);
    }
    await sleep(400);
  }
  if (!got) {
    console.error(`  ⚠ ${crop.slug}: NINGÚN candidato sirvió`);
    continue;
  }
  manifest[crop.slug] = {
    file: `File:${got.file}`,
    license: got.license,
    license_url: got.licenseUrl,
    artist: got.artist,
    source: got.descriptionurl,
  };
  console.error(`  ✓ ${crop.slug.padEnd(10)} ${(got.bytes / 1024).toFixed(0)} KB · ${got.license} · ${got.artist.slice(0, 40)}`);
  await sleep(500);
}

fs.writeFileSync(path.join(OUT_DIR, '_meta.json'), JSON.stringify(manifest, null, 2) + '\n');
console.error(`\n✓ _meta.json → ${path.relative(process.cwd(), path.join(OUT_DIR, '_meta.json'))}`);
