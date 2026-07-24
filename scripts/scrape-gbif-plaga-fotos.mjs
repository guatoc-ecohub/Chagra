#!/usr/bin/env node
/**
 * scrape-gbif-plaga-fotos.mjs
 *
 * Descarga 2-3 fotos CC por plaga desde GBIF (api.gbif.org/v1/occurrence/search)
 * SIN filtrar por país. Redimensiona a max 1200px, JPEG calidad 82.
 * Actualiza public/plaga-images.json y catalog/fotos/fotos-atribucion.json.
 *
 * Uso:
 *   node scripts/scrape-gbif-plaga-fotos.mjs          # dry-run (default)
 *   node scripts/scrape-gbif-plaga-fotos.mjs --go     # real download
 *   node scripts/scrape-gbif-plaga-fotos.mjs --go --resume  # reanudar
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

// Rutas
const GRAFO_PATH = path.join(REPO_ROOT, 'public', 'grafo-relations.json');
const MANIFEST_PATH = path.join(REPO_ROOT, 'public', 'plaga-images.json');
const PLAGA_IMAGES_DIR = path.join(REPO_ROOT, 'public', 'plaga-images');
const ATRIBUCION_PATH = path.join(REPO_ROOT, 'catalog', 'fotos', 'fotos-atribucion.json');
const LOG_PATH = path.join(REPO_ROOT, 'scripts', 'gbif-plaga-fotos-log.jsonl');

// Config
const GBIF_API_BASE = 'https://api.gbif.org/v1/occurrence/search';
const MAX_IMAGES_PER_PEST = 3;
const MIN_IMAGES_PER_PEST = 2;
const IMAGE_MAX_WIDTH = 1200;
const JPEG_QUALITY = 82;
const REQUEST_DELAY_MS = 1500; // cortés con GBIF

// Licencias aceptadas (CC0, CC-BY, CC-BY-SA, CC-BY-NC)
const ACCEPTED_LICENSES = new Set([
  'http://creativecommons.org/publicdomain/zero/1.0/',
  'http://creativecommons.org/publicdomain/zero/1.0/legalcode',
  'http://creativecommons.org/licenses/by/4.0/',
  'http://creativecommons.org/licenses/by/4.0/legalcode',
  'http://creativecommons.org/licenses/by/3.0/',
  'http://creativecommons.org/licenses/by/3.0/us/',
  'http://creativecommons.org/licenses/by/2.0/',
  'http://creativecommons.org/licenses/by-sa/4.0/',
  'http://creativecommons.org/licenses/by-sa/4.0/legalcode',
  'http://creativecommons.org/licenses/by-sa/3.0/',
  'http://creativecommons.org/licenses/by-sa/3.0/us/',
  'http://creativecommons.org/licenses/by-sa/2.0/',
  'https://creativecommons.org/licenses/by/4.0/',
  'https://creativecommons.org/licenses/by/3.0/',
  'https://creativecommons.org/licenses/by-sa/4.0/',
  'https://creativecommons.org/licenses/by-sa/3.0/',
  'https://creativecommons.org/licenses/by-sa/2.0/',
  'https://creativecommons.org/publicdomain/zero/1.0/',
  'https://creativecommons.org/publicdomain/zero/1.0/legalcode',
  'cc_0',
  'cc_by',
  'cc_by_sa',
  'cc_by_nc',
]);

// ---- Helpers ----

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function fetchJson(url, maxRetries = 3) {
  return new Promise((resolve, reject) => {
    const attempt = (remaining) => {
      const req = https.get(url, { headers: { 'User-Agent': 'Chagra/1.0 (pest-photo-scraper; +https://github.com/guatoc-ecohub/Chagra)' }, timeout: 20000 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error(`JSON parse error for ${url}: ${e.message}`)); }
        });
      });
      req.on('timeout', () => { req.destroy(); if (remaining > 0) { setTimeout(() => attempt(remaining - 1), 3000); } else reject(new Error(`Timeout for ${url}`)); });
      req.on('error', (err) => { if (remaining > 0) { setTimeout(() => attempt(remaining - 1), 3000); } else reject(err); });
    };
    attempt(maxRetries);
  });
}

function downloadFile(url, destPath, maxRetries = 2) {
  return new Promise((resolve, reject) => {
    const attempt = (remaining) => {
      const proto = url.startsWith('https') ? https : url.startsWith('http') ? http : https;
      if (typeof proto.get !== 'function') {
        reject(new Error(`No handler for protocol: ${url.substring(0, 10)}`));
        return;
      }
      const file = fs.createWriteStream(destPath);
      const req = proto.get(url, { headers: { 'User-Agent': 'Chagra/1.0 (pest-photo-scraper; +https://github.com/guatoc-ecohub/Chagra)' }, timeout: 30000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = res.headers.location.startsWith('http') ? res.headers.location : `${new URL(url).origin}${res.headers.location}`;
          file.close();
          fs.unlinkSync?.(destPath);
          if (remaining > 0) {
            url = redirectUrl;
            attempt(remaining - 1);
          } else {
            reject(new Error(`Too many redirects for ${url}`));
          }
          return;
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlinkSync?.(destPath);
          if (remaining > 0 && (res.statusCode >= 500 || res.statusCode === 429)) {
            setTimeout(() => attempt(remaining - 1), 3000);
          } else {
            reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          }
          return;
        }
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve(destPath)));
      });
      req.on('timeout', () => { req.destroy(); file.close(); fs.unlinkSync?.(destPath); if (remaining > 0) setTimeout(() => attempt(remaining - 1), 3000); else reject(new Error(`Timeout for ${url}`)); });
      req.on('error', (err) => { file.close(); fs.unlinkSync?.(destPath); if (remaining > 0) setTimeout(() => attempt(remaining - 1), 3000); else reject(err); });
    };
    attempt(maxRetries);
  });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function isAcceptedLicense(license) {
  if (!license || typeof license !== 'string') return false;
  const key = license.toLowerCase().trim();
  // CC0
  if (key.includes('creativecommons.org/publicdomain/')) return true;
  if (key === 'cc_0' || key === 'public domain' || key === 'cc0') return true;
  // Cualquier CC que no sea "all rights reserved" o "undetermined"
  if (key.includes('creativecommons.org/licenses/by/')) return true;
  if (key.includes('creativecommons.org/licenses/by-sa/')) return true;
  if (key.includes('creativecommons.org/licenses/by-nc/')) return true;
  if (key.includes('creativecommons.org/licenses/by-nc-sa/')) return true;
  if (key.includes('creativecommons.org/licenses/by-nd/')) return true;
  if (key === 'cc_by' || key === 'cc_by_sa' || key === 'cc_by_nc') return true;
  return false;
}

// ---- Cargar mapping pest -> binomio ----

function loadPestMapping() {
  const gf = JSON.parse(fs.readFileSync(GRAFO_PATH, 'utf-8'));
  const pestIndex = gf._pest_index || {};
  const pestSynonyms = gf._pest_synonyms || {};

  // Mapa inverso de sinónimos
  const synToCanon = {};
  for (const [alias, canonical] of Object.entries(pestSynonyms)) {
    synToCanon[alias.toLowerCase().trim()] = canonical;
  }

  // Mapa de nombres canónicos en AGE (hardcodeado del grafo)
  const ageMap = {
    "Trips de la cebolla": "Thrips tabaci",
    "Mosca de alas manchadas": "Drosophila suzukii",
    "Minador de la hoja en papa y hortalizas": "Liriomyza spp.",
    "Mildiu velloso de la cebolla": "Peronospora destructor",
    "Minador de la hoja (mosca minadora)": "Liriomyza huidobrensis",
    "Tizon tardio / gota (papa y tomate)": "Phytophthora infestans",
    "Mancha de hierro o cercospora del café": "Cercospora coffeicola",
    "Hernia de las cruciferas (clubroot)": "Plasmodiophora brassicae",
    "Ácaro verde de la yuca": "Mononychellus tanajoa",
    "Barrenador del fruto del aguacate": "Stenoma catenifer",
    "Gusano blanco de la papa": "Premnotrypes vorax",
    "Mildeo polvoso de las cucurbitáceas": "Podosphaera xanthii",
    "Ojo de gallo del café": "Mycena citricolor",
    "Cochinilla harinosa de la raíz del café": "Dysmicoccus brevipes",
    "Sarna polvorienta de la papa": "Spongospora subterranea",
    "Gusano cogollero del maíz (y otras hortalizas)": "Spodoptera frugiperda",
    "Piojo harinoso de la yuca": "Phenacoccus herreni",
    "Antracnosis de frutales": "Colletotrichum gloeosporioides",
    "Polilla de la papa": "Phthorimaea operculella",
    "Mosca del Mediterráneo": "Ceratitis capitata",
    "Polilla guatemalteca de la papa": "Tecia solanivora",
    "Huanglongbing (HLB) / dragón amarillo de los cítricos": "Candidatus Liberibacter asiaticus",
    "Gusano perforador de cucurbitaceas": "Diaphania spp.",
    "Mildeo velloso en cucurbitáceas": "Pseudoperonospora cubensis",
    "Mosca del aguacate": "Heilipus lauri",
    "Pudrición radicular del aguacate": "Phytophthora cinnamomi",
    "Mosca del boton floral de la granadilla": "Dasiops inedulis",
    "moniliasis del cacao": "Moniliophthora roreri",
    "Antracnosis": "Colletotrichum spp.",
    "pulgón del algodón": "Aphis gossypii",
    "Pasador del fruto de tomate y berenjena": "Neoleucinodes elegantalis",
    "Nematodo agallador": "Meloidogyne incognita",
    "Nematodo barrenador del banano": "Radopholus similis",
    "Psílido asiático de los cítricos": "Diaphorina citri",
    "Mosca blanca (complejo)": "Bemisia tabaci",
    "Gusano cachón de la yuca": "Erinnyis ello",
    "Podredumbre gris (Botrytis)": "Botrytis cinerea",
    "Picudo negro del plátano y banano": "Cosmopolites sordidus",
    "Arana roja / acaro de dos manchas (polifago: tomate, frijol, etc.)": "Tetranychus urticae",
    "Roya del café": "Hemileia vastatrix",
    "Sigatoka negra": "Mycosphaerella fijiensis",
    "Mal de Panamá (Fusarium del banano)": "Fusarium oxysporum",
    "Mal de Panamá (Fusarium f.sp. cubense)": "Fusarium oxysporum f.sp. cubense",
    "Pudrición blanda por Erwinia": "Pectobacterium carotovorum",
    "Pudrición de la mazorca del maíz por Fusarium": "Fusarium verticillioides",
    "Pudrición del cogollo de la palma de aceite": "Phytophthora palmivora",
    "Roya del fríjol": "Uromyces appendiculatus",
    "Secadera o dormidera del maracuyá": "Fusarium solani f.sp. passiflorae",
    "Tizón de la vaina del arroz": "Rhizoctonia solani",
    "Tizón foliar del maíz por Helmintosporium": "Exserohilum turcicum",
    "Bacteriosis de la yuca (añublo bacteriano)": "Xanthomonas phaseoli pv. manihotis",
    "Lorito verde (chicharrita) del fríjol y yuca": "Empoasca kraemeri",
    "Moko del plátano y banano": "Ralstonia solanacearum",
    "Antracnosis del fríjol": "Colletotrichum lindemuthianum",
    "Antracnosis del tomate de árbol": "Colletotrichum acutatum",
    "Falso medidor del repollo y hortalizas": "Trichoplusia ni",
    "Broca del café": "Hypothenemus hampei",
    "Mancha angular del fríjol": "Pseudocercospora griseola",
    "Mancha púrpura de la cebolla y ajo": "Alternaria porri",
    "Marchitez bacteriana o dormidera de la papa": "Ralstonia solanacearum",
    "Pulguilla negra de la papa": "Epitrix cucumeris",
    "Gusano blanco del maíz (gallina ciega)": "Phyllophaga spp.",
    "Ácaro del aguacate": "Oligonychus perseae",
    "Escoba de bruja cacao": "Moniliophthora perniciosa",
    "Pulgón del algodón": "Aphis gossypii",
    "Gusano de la mazorca": "Helicoverpa zea",
    "Polilla dorso diamante": "Plutella xylostella",
    "Cucarroncito de las hojas": "Diabrotica balteata",
    "Mosca blanca de la yuca": "Aleurotrachelus socialis",
    "Bemisia_tabaci": "Bemisia tabaci",
    "Hemileia_vastatrix_roya": "Hemileia vastatrix",
    "Hypothenemus_hampei_broca": "Hypothenemus hampei",
    "Spodoptera_frugiperda_cogollero": "Spodoptera frugiperda",
    "Phytophthora_capsici": "Phytophthora capsici",
    "Pieris_rapae": "Pieris rapae",
    "Sclerotium_cepivorum": "Sclerotium cepivorum",
    "Brevicoryne_brassicae": "Brevicoryne brassicae",
    "Fusarium_oxysporum_fsp_cepae": "Fusarium oxysporum f.sp. cepae",
    "cucarroncito de las hojas": "Diabrotica balteata",
    "gusano de la mazorca": "Helicoverpa zea",
    "polilla dorso diamante": "Plutella xylostella",
    "heliothis": "Helicoverpa zea",
    "pulgones": "Aphididae",
    "scolytidae": "Scolytinae",
    "diabrotica balteata": "Diabrotica balteata",
    "helicoverpa zea": "Helicoverpa zea",
    "plutella xylostella": "Plutella xylostella",
  };

  const result = {};
  for (const [pestKey, pestData] of Object.entries(pestIndex)) {
    const pkLower = pestKey.toLowerCase().trim();
    let sci = null;

    // Direct match
    if (ageMap[pestKey]) sci = ageMap[pestKey];

    // Via synonyms
    if (!sci && synToCanon[pkLower]) {
      const canonical = synToCanon[pkLower];
      sci = ageMap[canonical] || null;
      if (!sci) {
        for (const [k, v] of Object.entries(ageMap)) {
          if (k.toLowerCase().trim() === canonical.toLowerCase().trim()) {
            sci = v; break;
          }
        }
      }
    }

    // Key itself looks like a scientific name
    if (!sci) {
      const m = pestKey.match(/^([a-z]+)_([a-z]+)/);
      if (m) {
        const possible = `${m[1]} ${m[2]}`;
        for (const v of Object.values(ageMap)) {
          if (v.toLowerCase().includes(possible.toLowerCase())) {
            sci = v; break;
          }
        }
        if (!sci) sci = possible;
      }
    }

    if (sci) {
      // Extract genus + species only for search
      const parts = sci.split(/\s+/);
      const searchBinomio = parts.length >= 2 ? `${parts[0]} ${parts[1]}` : sci;
      const id = slugify(searchBinomio.replace(/[^a-zA-Z0-9 ]/g, ''));
      result[pestKey] = { binomial: searchBinomio, full: sci, id };
    }
  }

  return result;
}

// ---- GBIF Query ----

async function queryGbif(binomial, options = {}) {
  const { limit = 50 } = options;
  const url = `${GBIF_API_BASE}?mediaType=StillImage&scientificName=${encodeURIComponent(binomial)}&limit=${limit}`;

  const data = await fetchJson(url);
  if (!data || !Array.isArray(data.results)) {
    return { count: 0, results: [] };
  }

  // Filtrar solo fotos con licencia aceptada y URL de imagen
  const validResults = data.results.filter(r => {
    if (!isAcceptedLicense(r.license)) return false;
    const media = r.media || [];
    return media.some(m => m.type === 'StillImage' && m.identifier && isAcceptedLicense(m.license || r.license));
  });

  return {
    count: data.count || 0,
    totalResults: data.results.length,
    results: validResults,
  };
}

// ---- Procesar y descargar ----

async function processPest(pestKey, mapping, manifest, logEntries, dryRun, resume) {
  const { binomial, id } = mapping;

  // Check if we already have enough photos for this pest
  const existing = manifest.images.filter(i => i.id === id || i.binomio?.toLowerCase().includes(binomial.toLowerCase()));
  if (existing.length >= MAX_IMAGES_PER_PEST) {
    console.log(`  [SKIP] ${id}: ya tiene ${existing.length} fotos`);
    return [];
  }

  const needed = MAX_IMAGES_PER_PEST - existing.length;
  const alreadyHave = existing.length;

  console.log(`  [QUERY] ${id} (${binomial}) — buscando hasta ${needed} fotos...`);

  if (dryRun) {
    console.log(`  [DRY-RUN] consultaría GBIF para ${binomial}`);
    return [];
  }

  await sleep(REQUEST_DELAY_MS);

  let gbifResponse;
  try {
    gbifResponse = await queryGbif(binomial, { limit: 50 });
  } catch (err) {
    console.error(`  [ERROR] GBIF query failed for ${binomial}: ${err.message}`);
    return [];
  }

  if (gbifResponse.count === 0 || gbifResponse.results.length === 0) {
    console.log(`  [EMPTY] ${binomial}: 0 resultados en GBIF`);
    logEntries.push({ pest: pestKey, binomial, id, status: 'no_results', gbifCount: gbifResponse.count });
    return [];
  }

  console.log(`  [GBIF] ${gbifResponse.count} occurrences, ${gbifResponse.results.length} con foto CC`);

  const downloaded = [];
  for (const occ of gbifResponse.results) {
    if (downloaded.length + alreadyHave >= MAX_IMAGES_PER_PEST) break;

    const mediaItems = (occ.media || []).filter(m =>
      m.type === 'StillImage' && m.identifier &&
      isAcceptedLicense(m.license || occ.license)
    );

    for (const media of mediaItems) {
      if (downloaded.length + alreadyHave >= MAX_IMAGES_PER_PEST) break;

      const imgUrl = media.identifier;
      const license = media.license || occ.license;
      const creator = media.creator || occ.recordedBy || occ.rightsHolder || 'Desconocido';
      const rightsHolder = occ.rightsHolder || creator;
      const occurrenceID = occ.occurrenceID || `https://www.gbif.org/occurrence/${occ.key}`;

      // Skip if we already have this exact URL
      if (manifest.images.some(i => i.sourceUrl === occurrenceID || i.sourceUrl === imgUrl)) continue;
      if (downloaded.some(d => d.sourceUrl === occurrenceID || d.sourceUrl === imgUrl)) continue;

      // Download
      const ext = path.extname(new URL(imgUrl).pathname) || '.jpg';
      const fileName = `${id}${downloaded.length > 0 ? `_${downloaded.length + 1}` : ''}${ext}`;
      const filePath = path.join(PLAGA_IMAGES_DIR, fileName);
      const finalFileName = `${id}${downloaded.length > 0 ? `_${downloaded.length + 1}` : ''}.jpg`;
      const finalPath = path.join(PLAGA_IMAGES_DIR, finalFileName);

      console.log(`    [DL] ${fileName} ← ${imgUrl.substring(0, 80)}...`);

      try {
        await downloadFile(imgUrl, filePath);

        // Resize with sharp
        const metadata = await sharp(filePath).metadata();
        let resized = sharp(filePath);
        if ((metadata.width || 0) > IMAGE_MAX_WIDTH) {
          resized = resized.resize({ width: IMAGE_MAX_WIDTH, withoutEnlargement: true });
        }
        const resizedBuf = await resized.jpeg({ quality: JPEG_QUALITY }).toBuffer();
        await fs.promises.writeFile(finalPath, resizedBuf);

        // Remove original if extension differs
        if (filePath !== finalPath) fs.unlinkSync(filePath);

        const stats = fs.statSync(finalPath);

        const entry = {
          id,
          file: `/plaga-images/${finalFileName}`,
          binomio: binomial,
          license: license.replace(/^http:/, 'https:'),
          licenseUrl: license.match(/^https?:\/\//) ? license.replace(/^http:/, 'https:') : null,
          attribution: creator,
          rightsHolder: rightsHolder,
          source: 'GBIF',
          sourceUrl: occurrenceID,
          gbifUrl: `https://www.gbif.org/occurrence/${occ.key}`,
          bytes: stats.size,
          width: Math.min(metadata.width || 1200, IMAGE_MAX_WIDTH),
          height: metadata.height || 0,
        };

        downloaded.push(entry);
        manifest.images.push(entry);

        // Log
        logEntries.push({
          pest: pestKey, binomial, id, status: 'downloaded',
          file: finalFileName, license, creator, occurrenceID,
        });

        console.log(`    [OK] ${finalFileName} (${(stats.size / 1024).toFixed(1)} KB, ${entry.width}x${entry.height})`);
      } catch (err) {
        console.error(`    [FAIL] ${fileName}: ${err.message}`);
        // Clean up failed download
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
      }

      // One media item per occurrence is enough
      break;
    }
  }

  if (downloaded.length === 0) {
    console.log(`  [EMPTY] ${id}: no se pudo descargar ninguna foto`);
    logEntries.push({ pest: pestKey, binomial, id, status: 'download_failed' });
  } else {
    console.log(`  [OK] ${id}: +${downloaded.length} fotos (total: ${alreadyHave + downloaded.length})`);
  }

  return downloaded;
}

// ---- Main ----

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--go');
  const resume = args.includes('--resume');

  console.log(`\n=== scrape-gbif-plaga-fotos.mjs ===`);
  console.log(`Modo: ${dryRun ? 'DRY-RUN (pase --go para ejecutar)' : 'REAL'}`);
  console.log(`Resume: ${resume ? 'sí' : 'no'}\n`);

  // Load existing manifest
  ensureDir(path.dirname(MANIFEST_PATH));
  ensureDir(PLAGA_IMAGES_DIR);
  ensureDir(path.dirname(ATRIBUCION_PATH));

  const manifest = fs.existsSync(MANIFEST_PATH)
    ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'))
    : { generated_at: new Date().toISOString(), source: 'GBIF occurrence media (StillImage, CC0/CC-BY/CC-BY-SA/CC-BY-NC only)', count: 0, images: [] };

  // Load attribution
  const atribucion = fs.existsSync(ATRIBUCION_PATH)
    ? JSON.parse(fs.readFileSync(ATRIBUCION_PATH, 'utf-8'))
    : { generated_at: new Date().toISOString(), source: 'GBIF occurrence media', photos: [] };

  // Load existing download log for resume
  const logEntries = [];

  if (resume && fs.existsSync(LOG_PATH)) {
    const lines = fs.readFileSync(LOG_PATH, 'utf-8').trim().split('\n').filter(Boolean);
    for (const line of lines) {
      try { logEntries.push(JSON.parse(line)); } catch {}
    }
    console.log(`Cargados ${logEntries.length} log entries previos (resume).\n`);
  }

  // Build pest mapping
  console.log('Cargando mapping pest → binomio...');
  const pestMapping = loadPestMapping();
  console.log(`Mapping: ${Object.keys(pestMapping).length} plagas\n`);

  // Determine which pests to process
  const existingIds = new Set(manifest.images.map(i => i.id));
  const toProcess = Object.entries(pestMapping).filter(([, m]) => !existingIds.has(m.id));

  // Also include the existing 18 IDs to avoid re-processing
  // But we need to find which CAUSAS entries are missing
  // Let me check specifically for the 8 CAUSAS entries without photos
  const causasMissing = [
    'colletotrichum_mora', 'mancha_asfalto', 'marchitez_vascular',
    'mildeo_velloso', 'moniliophthora_roreri', 'oidio_erysiphales',
    'pseudocercospora_griseola', 'ralstonia_moko',
  ];

  // Check if these exist in the manifest already
  for (const cid of causasMissing) {
    if (!existingIds.has(cid) && !toProcess.some(([, m]) => m.id === cid)) {
      // Add these manually — they need special binomio handling
      const specialBinomios = {
        'colletotrichum_mora': { binomial: 'Colletotrichum', id: 'colletotrichum_mora' },
        'mancha_asfalto': { binomial: 'Phyllachora maydis', id: 'mancha_asfalto' },
        'marchitez_vascular': { binomial: 'Fusarium oxysporum', id: 'marchitez_vascular' },
        'mildeo_velloso': { binomial: 'Peronospora', id: 'mildeo_velloso' },
        'moniliophthora_roreri': { binomial: 'Moniliophthora roreri', id: 'moniliophthora_roreri' },
        'oidio_erysiphales': { binomial: 'Erysiphe', id: 'oidio_erysiphales' },
        'pseudocercospora_griseola': { binomial: 'Pseudocercospora griseola', id: 'pseudocercospora_griseola' },
        'ralstonia_moko': { binomial: 'Ralstonia solanacearum', id: 'ralstonia_moko' },
      };
      if (specialBinomios[cid]) {
        toProcess.push([cid, specialBinomios[cid]]);
      }
    }
  }

  console.log(`A procesar: ${toProcess.length} plagas sin foto\n`);

  if (dryRun) {
    console.log('=== DRY-RUN: plagas a consultar ===');
    for (const [key, m] of toProcess.sort((a, b) => a[1].id.localeCompare(b[1].id))) {
      console.log(`  ${m.id.padEnd(40)} ${m.binomial.padEnd(30)} ← ${key.substring(0, 40)}`);
    }
    console.log(`\nTotal: ${toProcess.length} plagas nuevas`);
    console.log(`Total en manifest después: ${manifest.images.length + toProcess.length}\n`);
    return;
  }

  // Real execution
  let successCount = 0;
  let emptyCount = 0;
  let errorCount = 0;

  for (const [pestKey, mapping] of toProcess.sort((a, b) => a[1].id.localeCompare(b[1].id))) {
    try {
      const downloaded = await processPest(pestKey, mapping, manifest, logEntries, false, resume);
      if (downloaded.length > 0) successCount++;
      else emptyCount++;
    } catch (err) {
      console.error(`  [ERROR] ${pestKey}: ${err.message}`);
      errorCount++;
    }

    // Save progress periodically
    if ((successCount + emptyCount + errorCount) % 10 === 0) {
      manifest.count = manifest.images.length;
      manifest.generated_at = new Date().toISOString();
      fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
      fs.writeFileSync(LOG_PATH, logEntries.map(e => JSON.stringify(e)).join('\n') + '\n');
    }
  }

  // Final save
  manifest.count = manifest.images.length;
  manifest.generated_at = new Date().toISOString();
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  // Build attribution file (ensure photos array exists)
  if (!Array.isArray(atribucion.photos)) atribucion.photos = [];
  const seenUrls = new Set(atribucion.photos.map(p => p.sourceUrl).filter(Boolean));
  for (const img of manifest.images) {
    if (!img.sourceUrl || seenUrls.has(img.sourceUrl)) continue;
    seenUrls.add(img.sourceUrl);
    atribucion.photos.push({
      id: img.id,
      file: img.file,
      binomio: img.binomio,
      creator: img.attribution || 'Desconocido',
      rightsHolder: img.rightsHolder || img.attribution || 'Desconocido',
      license: img.license || '',
      licenseUrl: img.licenseUrl || null,
      occurrenceID: img.sourceUrl || img.gbifUrl || null,
      source: img.source || 'GBIF',
      sourceUrl: img.sourceUrl || null,
    });
  }
  atribucion.generated_at = new Date().toISOString();
  atribucion.count = atribucion.photos.length;
  fs.writeFileSync(ATRIBUCION_PATH, JSON.stringify(atribucion, null, 2));

  // Log
  fs.writeFileSync(LOG_PATH, logEntries.map(e => JSON.stringify(e)).join('\n') + '\n');

  console.log(`\n=== RESUMEN ===`);
  console.log(`Plagas con foto nueva: ${successCount}`);
  console.log(`Plagas sin resultados: ${emptyCount}`);
  console.log(`Errores: ${errorCount}`);
  console.log(`Total imágenes en manifest: ${manifest.images.length}`);
  console.log(`Fotos en atribución: ${atribucion.photos.length}`);
  console.log(`\nLog: ${LOG_PATH}`);
  console.log(`Manifest: ${MANIFEST_PATH}`);
  console.log(`Atribución: ${ATRIBUCION_PATH}`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
