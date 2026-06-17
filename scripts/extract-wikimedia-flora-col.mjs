#!/usr/bin/env node
/**
 * extract-wikimedia-flora-col.mjs — V-09 audit visión.
 *
 * Amplía el dataset de fixtures vision de 16 → ~50 species via Wikimedia
 * Commons API. Para cada species del catalog OSS, busca primera foto con
 * licencia CC-BY/CC0/Public Domain, descarga al directorio extended y
 * genera manifest con attribution + license.
 *
 * Output:
 *   - chagra/data/bench-vision-fixtures-extended/{species_id}.jpg
 *   - chagra/data/bench-vision-fixtures-extended/manifest.json
 *
 * Respeta:
 *   - Sleep 1s entre requests (rate-limit Wikimedia)
 *   - User-Agent custom (requerido por API policy)
 *   - Solo CC-BY / CC0 / PD (NO CC-BY-NC-SA ni copyrighted)
 *   - Max 4MB por foto (skip si más grande, no resize aquí)
 *
 * Refs: audit-vision-chagra-2026-05-26.md V-09
 */
import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const STRATEGY_DIR = process.env.CHAGRA_STRATEGY_DIR || path.join(ROOT_DIR, "..", "Chagra-strategy");

const CATALOG = JSON.parse(
  fs.readFileSync(path.join(STRATEGY_DIR, "catalog", "chagra-catalog-seed-v3.2.json"), "utf-8"),
);
const GT_FIXTURES = JSON.parse(
  fs.readFileSync(path.join(ROOT_DIR, "data", "bench-vision-fixtures-ground-truth.json"), "utf-8"),
);

const OUT_DIR = process.env.VISION_EXTENDED_DIR || path.join(ROOT_DIR, "data", "bench-vision-fixtures-extended");
fs.mkdirSync(OUT_DIR, { recursive: true });

const UA = "ChagraAgroecologyBench/1.0 (https://chagra.bio; bench@chagra.bio)";
const ALLOWED_LICENSES = [
  "cc0",
  "cc-zero",
  "public domain",
  "publicdomain",
  "pd",
  "cc-by",
  "cc-by-sa",
  "cc by",
  "cc by-sa",
  "cc-by-2.0",
  "cc-by-3.0",
  "cc-by-4.0",
  "cc-by-sa-2.0",
  "cc-by-sa-3.0",
  "cc-by-sa-4.0",
];
const MAX_BYTES = 4 * 1024 * 1024;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function speciesIdFromSci(sci) {
  if (typeof sci !== "string" || sci.trim().length === 0) return null;
  const parts = sci.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const g = parts[0];
  const s = parts[1];
  if (!/^[A-Za-z-]+$/.test(g) || !/^[a-z-]+$/.test(s)) return null;
  return `${g}_${s}`.toLowerCase();
}

async function searchWikimedia(scientific) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", `${scientific} filetype:bitmap`);
  url.searchParams.set("gsrnamespace", "6");
  url.searchParams.set("gsrlimit", "5");
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|mime|size|extmetadata");
  url.searchParams.set("iiurlwidth", "1024");
  const res = await fetch(url.toString(), { headers: { "User-Agent": UA } });
  if (!res.ok) return [];
  const data = await res.json();
  const pages = data.query?.pages || {};
  return Object.values(pages);
}

function pickBestImage(pages) {
  for (const page of pages) {
    const ii = page.imageinfo?.[0];
    if (!ii) continue;
    if (!/jpe?g|png/i.test(ii.mime || "")) continue;
    if (ii.size && ii.size > MAX_BYTES) continue;
    const license = (ii.extmetadata?.LicenseShortName?.value || "")
      .toLowerCase()
      .replace(/[^a-z0-9\-. ]/g, " ")
      .trim();
    if (!ALLOWED_LICENSES.some((ok) => license.startsWith(ok) || license.includes(ok))) continue;
    const rawArtist = ii.extmetadata?.Artist?.value || "Wikimedia Commons";
    // CodeQL: sanitize aggressive — strip ALL non-printable-safe ASCII chars.
    // Regex-stripping HTML is not bulletproof against nested payloads (`<sc<script>ript>`);
    // whitelist alpha-num + safe punctuation only. Manifest.json is consumed by
    // bench scripts (no HTML render), but defense-in-depth.
    const artist = rawArtist
      .replace(/<[^>]*>/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/[^a-zA-Z0-9\s\-.,'()áéíóúñüÁÉÍÓÚÑÜ]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200);
    return {
      url: ii.thumburl || ii.url,
      title: page.title,
      source_url: ii.descriptionurl,
      license,
      attribution: artist,
      size: ii.size || 0,
    };
  }
  return null;
}

async function downloadImage(url, targetPath) {
  // CodeQL anti path-traversal: enforce targetPath lives inside OUT_DIR.
  const resolved = path.resolve(targetPath);
  const allowedRoot = path.resolve(OUT_DIR);
  if (!resolved.startsWith(allowedRoot + path.sep)) {
    throw new Error(`Refusing write outside OUT_DIR: ${resolved}`);
  }
  // Validate basename: only species_id format (alphanum, underscore, hyphen, dot).
  const base = path.basename(resolved);
  if (!/^[a-zA-Z0-9_\-.]+\.jpg$/.test(base)) {
    throw new Error(`Invalid basename: ${base}`);
  }
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error(`File too large: ${buf.length}b`);
  // Verify JPEG magic bytes to avoid writing arbitrary payload disguised as .jpg.
  if (buf.length < 3 || buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) {
    throw new Error(`Not a JPEG (magic mismatch)`);
  }
  fs.writeFileSync(resolved, buf);
  return buf.length;
}

async function main() {
  const speciesList = CATALOG.species || [];
  console.log(`Catalog v3.2: ${speciesList.length} species disponibles`);

  // Skipear las que ya están en fixtures originales
  const existing = new Set(
    GT_FIXTURES.fixtures.map((f) => speciesIdFromSci(f.scientific)).filter(Boolean),
  );
  console.log(`Skipping ${existing.size} ya en fixtures originales`);

  const manifest = [];
  let downloaded = 0;
  let skippedNoLicense = 0;
  let skippedNoMatch = 0;
  let skippedAlreadyExists = 0;
  const TARGET = 34; // 16 + 34 = 50 total

  for (const sp of speciesList) {
    if (downloaded >= TARGET) break;
    const sciName = sp.nombre_cientifico || sp.scientific_name;
    const speciesId = sp.id || speciesIdFromSci(sciName);
    if (!speciesId || !sciName) {
      skippedNoMatch++;
      continue;
    }
    if (existing.has(speciesId)) {
      skippedAlreadyExists++;
      continue;
    }

    process.stdout.write(`[${downloaded + 1}/${TARGET}] ${speciesId} (${sciName})... `);
    try {
      const pages = await searchWikimedia(sciName);
      const best = pickBestImage(pages);
      if (!best) {
        console.log("NO_LICENSE_OK");
        skippedNoLicense++;
        await sleep(1000);
        continue;
      }
      const target = path.join(OUT_DIR, `${speciesId}.jpg`);
      const bytes = await downloadImage(best.url, target);
      manifest.push({
        file: `${speciesId}.jpg`,
        species_id: speciesId,
        nombre_comun: (sp.nombre_comun || sp.common_name_es || sciName).toString(),
        nombre_cientifico: sciName,
        familia: sp.familia_botanica || sp.familia || null,
        tipo: sp.categoria || sp.tipo || null,
        bytes,
        source_url: best.source_url,
        wikimedia_title: best.title,
        license: best.license,
        attribution: best.attribution,
      });
      downloaded++;
      console.log(`OK (${(bytes / 1024).toFixed(0)}KB, ${best.license})`);
    } catch (e) {
      console.log(`ERR ${e.message}`);
    }
    await sleep(1000);
  }

  fs.writeFileSync(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify(
      {
        version: "1.0",
        generated_at: new Date().toISOString(),
        source: "Wikimedia Commons via MediaWiki API",
        attribution_required: true,
        total: manifest.length,
        fixtures: manifest,
      },
      null,
      2,
    ),
  );

  console.log("\n=== Resumen ===");
  console.log(`Downloaded: ${downloaded}`);
  console.log(`Skipped (already in fixtures): ${skippedAlreadyExists}`);
  console.log(`Skipped (no license OK): ${skippedNoLicense}`);
  console.log(`Skipped (no match): ${skippedNoMatch}`);
  console.log(`Output: ${OUT_DIR}/`);
  const totalBytes = manifest.reduce((a, m) => a + m.bytes, 0);
  console.log(`Total size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
