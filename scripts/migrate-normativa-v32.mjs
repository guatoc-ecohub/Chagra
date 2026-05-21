#!/usr/bin/env node
/**
 * migrate-normativa-v32.mjs
 *
 * Normaliza el campo `normativa_colombiana` de las species del catálogo
 * Chagra al schema v3.2 (array de objetos con discriminator `tipo`).
 *
 * Formatos legacy detectados (2026-05-21):
 *   A1) string regulatorio: "Resolución 684/2018 MADS..."
 *   A2) string etnocultural: "Patrimonio cultural inmaterial..." o
 *       "Nativa silvestre del piso cálido..."
 *   B)  array semi-estructurado: [{"norma": "...", "alcance": "..."}]
 *
 * Output canónico v3.2:
 *   [
 *     {
 *       "tipo": "regulatoria | contexto_etnocultural | estatus_conservacion",
 *       "norma": "...",        // requerido en regulatoria/estatus_conservacion
 *       "autoridad": "...",
 *       "fecha_vigor": "...",
 *       "alcance": "...",      // OBLIGATORIO
 *       "restriccion": "...",  // enum cerrado
 *       "url_oficial": "..."
 *     }
 *   ]
 *
 * Heurísticas de detección de tipo:
 *   - regulatoria  → contiene "Resolución \d+", "Ley \d+", "Decreto \d+",
 *                    "Resolución \d+/\d+ MADS", "ICA Resolución..."
 *   - contexto_etnocultural → contiene "Patrimonio", "comunidades indígenas",
 *                              "uso ritual", "pueblos", "Murui-Muinane",
 *                              "Bora", "Uitoto", "Muisca", "saber ancestral"
 *   - estatus_conservacion → contiene "Libro Rojo", "VU)", "EN)", "Vulnerable",
 *                            "En Peligro", "endémica", "categoría UICN"
 *
 * El parser strings legacy las divide por `;` y crea un entry por norma
 * detectada. Si no se puede dividir limpiamente, deja el string completo
 * en una sola entry preservando contenido.
 *
 * Usage:
 *   node scripts/migrate-normativa-v32.mjs [--dry-run] [--input path] [--output path]
 *
 * Defaults:
 *   --input  catalog/chagra-catalog-seed-v3.1.json
 *   --output catalog/chagra-catalog-seed-v3.1.json (in-place)
 *   --dry-run false (writes by default)
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

const argv = process.argv.slice(2);
const opts = {
  dryRun: argv.includes("--dry-run"),
  input: argv[argv.indexOf("--input") + 1] && !argv[argv.indexOf("--input") + 1].startsWith("--")
    ? argv[argv.indexOf("--input") + 1]
    : resolve(REPO_ROOT, "catalog/chagra-catalog-seed-v3.1.json"),
  output: argv[argv.indexOf("--output") + 1] && !argv[argv.indexOf("--output") + 1].startsWith("--")
    ? argv[argv.indexOf("--output") + 1]
    : null, // null = in-place
};

const KEYWORDS_REGULATORIA = [
  /Resoluci[óo]n\s+\d+/i,
  /Ley\s+\d+/i,
  /Decreto\s+\d+/i,
  /MADS/i,
  /ICA Resoluci[óo]n/i,
  /CAR\s+\w+/i,
  /CORPOBOYAC[ÁA]/i,
  /Protocolo\s+\w+\s+\d{4}/i,
  /Ministerio de Ambiente/i,
  /Estatuto Nacional de Estupefacientes/i,
];

const KEYWORDS_ETNOCULTURAL = [
  /Patrimonio cultural/i,
  /comunidades ind[íi]genas/i,
  /uso ritual/i,
  /pueblos\s+\w+/i,
  /Murui-?Muinane/i,
  /\bBora\b/i,
  /\bUitoto\b/i,
  /\bMuisca\b/i,
  /\bInga\b/i,
  /saber ancestral/i,
  /ceremonia/i,
  /planta sagrada/i,
  /maestros de medicina tradicional/i,
];

const KEYWORDS_CONSERVACION = [
  /Libro Rojo/i,
  /\b(VU|EN|CR|NT|LC|DD|NE)\b/, // IUCN codes
  /Vulnerable/i,
  /En Peligro/i,
  /Cr[íi]ticamente Amenazada/i,
  /endemica/i,
  /endémica/i,
  /UICN/i,
  /IUCN/i,
  /Plantas Colombia 2007/i,
];

const KEYWORDS_NO_NORMA = [
  /^No tiene marco legal/i,
  /NO incluida en listados/i,
  /^Nativa silvestre del piso/i,
  /^Especie naturalizada/i,
];

function classifyChunk(text) {
  // Returns the inferred `tipo` for a text chunk.
  for (const re of KEYWORDS_REGULATORIA) {
    if (re.test(text)) return "regulatoria";
  }
  for (const re of KEYWORDS_CONSERVACION) {
    if (re.test(text)) return "estatus_conservacion";
  }
  for (const re of KEYWORDS_ETNOCULTURAL) {
    if (re.test(text)) return "contexto_etnocultural";
  }
  // No clear signal → contexto_etnocultural (más permisivo; preserva info)
  return "contexto_etnocultural";
}

function extractNorma(text) {
  // Extract the formal norm name from a chunk.
  const patterns = [
    /(Resoluci[óo]n\s+\d+(?:\/\d+)?\s*(?:de\s+\d+\s+)?(?:MADS|ICA|MINSALUD|MINAMBIENTE)?)/i,
    /(Ley\s+\d+(?:\/\d+|\s+de\s+\d+)?)/i,
    /(Decreto\s+\d+(?:\/\d+|\s+de\s+\d+)?)/i,
    /(Libro Rojo de Plantas (?:de\s+)?Colombia(?:\s+\d{4})?)/i,
    /(IUCN Red List(?:\s+\d{4})?)/i,
    /(Protocolo\s+\w+\s+\d{4})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

function extractAutoridad(text) {
  const map = [
    [/MADS|Ministerio de Ambiente/i, "MADS"],
    [/ICA\b/i, "ICA"],
    [/Consejo Nacional de Estupefacientes/i, "Consejo Nacional de Estupefacientes"],
    [/IAvH|Humboldt/i, "IAvH"],
    [/CAR Cundinamarca/i, "CAR Cundinamarca"],
    [/CORPOBOYAC[ÁA]/i, "CORPOBOYACÁ"],
    [/Secretar[íi]a Distrital/i, "Secretaría Distrital de Ambiente Bogotá"],
    [/UICN|IUCN/i, "IUCN"],
  ];
  for (const [re, name] of map) {
    if (re.test(text)) return name;
  }
  return null;
}

function inferRestriccion(text, tipo) {
  if (tipo === "regulatoria") {
    if (/invasor|prevenci[óo]n manejo|control de invasoras/i.test(text)) return "control_obligatorio_invasoras";
    if (/p[áa]ramo/i.test(text)) return "prohibida_paramos";
    if (/cuarentena|fitosanitar/i.test(text)) return "cuarentena_fitosanitaria";
    if (/estupefaci|ritual\s+restringido|comunidades ind[íi]genas/i.test(text)) return "cultivo_restringido_indigenas";
    if (/medicinal regulada|Cannabis sativa\s+para fines/i.test(text)) return "uso_medicinal_regulado";
  }
  if (tipo === "estatus_conservacion") {
    return "conservacion_priorizada";
  }
  if (tipo === "contexto_etnocultural") {
    if (/uso ritual/i.test(text)) return "uso_ritual_protegido";
  }
  return null;
}

function parseStringLegacy(str) {
  // Split a legacy string by `;` and convert each chunk to a canonical object.
  if (!str || typeof str !== "string") return [];
  // Handle "no marco legal" sentinels: keep as single contexto_etnocultural entry
  for (const re of KEYWORDS_NO_NORMA) {
    if (re.test(str)) {
      return [{
        tipo: "contexto_etnocultural",
        alcance: str.trim(),
      }];
    }
  }
  const chunks = str.split(";").map(c => c.trim()).filter(Boolean);
  if (chunks.length === 0) return [];
  return chunks.map(chunk => {
    const tipo = classifyChunk(chunk);
    const entry = {
      tipo,
      alcance: chunk,
    };
    const norma = extractNorma(chunk);
    if (norma) entry.norma = norma;
    const autoridad = extractAutoridad(chunk);
    if (autoridad) entry.autoridad = autoridad;
    const restriccion = inferRestriccion(chunk, tipo);
    if (restriccion) entry.restriccion = restriccion;
    return entry;
  });
}

function normaliseArrayEntry(obj) {
  // Convert a legacy array entry {norma, alcance} to v3.2 canonical
  const tipo = obj.tipo
    ?? (obj.norma ? classifyChunk(obj.norma + " " + (obj.alcance ?? "")) : classifyChunk(obj.alcance ?? ""));
  const result = {
    tipo,
    alcance: obj.alcance ?? obj.norma ?? "",
  };
  if (obj.norma) result.norma = obj.norma;
  if (obj.autoridad) result.autoridad = obj.autoridad;
  else if (obj.norma || obj.alcance) {
    const aut = extractAutoridad((obj.norma ?? "") + " " + (obj.alcance ?? ""));
    if (aut) result.autoridad = aut;
  }
  if (obj.fecha_vigor) result.fecha_vigor = obj.fecha_vigor;
  if (obj.url_oficial) result.url_oficial = obj.url_oficial;
  if (obj.aplica_a_chagra !== undefined) result.aplica_a_chagra = obj.aplica_a_chagra;
  if (obj.restriccion) result.restriccion = obj.restriccion;
  else {
    const r = inferRestriccion((obj.norma ?? "") + " " + (obj.alcance ?? ""), tipo);
    if (r) result.restriccion = r;
  }
  return result;
}

function migrateSpecies(sp) {
  if (!sp.normativa_colombiana) return null;
  const raw = sp.normativa_colombiana;
  if (typeof raw === "string") {
    return parseStringLegacy(raw);
  }
  if (Array.isArray(raw)) {
    return raw.map(normaliseArrayEntry);
  }
  return null;
}

async function main() {
  const inputPath = opts.input;
  const outputPath = opts.output ?? inputPath;
  const raw = await readFile(inputPath, "utf8");
  const catalog = JSON.parse(raw);
  let migrated = 0;
  let skipped = 0;
  const samples = [];
  for (const sp of catalog.species) {
    if (!sp.normativa_colombiana) continue;
    const before = sp.normativa_colombiana;
    const after = migrateSpecies(sp);
    if (!after || after.length === 0) {
      skipped++;
      continue;
    }
    if (samples.length < 5) {
      samples.push({ id: sp.id, before, after });
    }
    sp.normativa_colombiana = after;
    migrated++;
  }
  console.log(`Migrated: ${migrated} species`);
  console.log(`Skipped: ${skipped} species`);
  console.log(`\nSamples (first 5):`);
  for (const s of samples) {
    console.log(`\n--- ${s.id} ---`);
    console.log(`BEFORE: ${typeof s.before === "string" ? s.before.slice(0, 100) + "..." : JSON.stringify(s.before).slice(0, 100) + "..."}`);
    console.log(`AFTER: ${JSON.stringify(s.after, null, 2).slice(0, 400)}`);
  }
  if (opts.dryRun) {
    console.log("\n(--dry-run: no file written)");
    return;
  }
  await writeFile(outputPath, JSON.stringify(catalog, null, 2) + "\n", "utf8");
  console.log(`\nWritten: ${outputPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
