#!/usr/bin/env node
/**
 * integrate-corpus-batch2.mjs
 *
 * Integra al seed v3.1 el batch 2 del corpus (Claude DR v2 corregido
 * con auditoría modo Restrepo Rivera 2026-05-21):
 *   - 22 species candidatas
 *   - 16 biopreparados
 *   - 31 sources_nuevas
 *
 * Fuente: ../Chagra-strategy/deepresearch/dr-corpus-expansion-claude-v2-2026-05-21.json
 *
 * Operaciones:
 *   1) Normaliza roles_in_guild narrativos (es) → enum schema (en).
 *   2) Normaliza propagation.methods al enum schema.
 *   3) Agrega estrato cuando la categoría lo requiere.
 *   4) Skip species/biopreparados/sources que ya existen en seed (dedup).
 *   5) Fix retroactivo caldo_sulfocalcico seed: "ámbar" → "vino tinto/teja
 *      (28-32° Baumé)" — corrección de auditoría Restrepo.
 *
 * Usage:
 *   node scripts/integrate-corpus-batch2.mjs [--dry-run]
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const SEED_PATH = resolve(REPO_ROOT, "catalog/chagra-catalog-seed-v3.1.json");
const DRV2_PATH = resolve(
  REPO_ROOT,
  "../Chagra-strategy/deepresearch/dr-corpus-expansion-claude-v2-2026-05-21.json"
);

const DRY_RUN = process.argv.includes("--dry-run");

// Mapeo roles_in_guild narrativos (Claude DR v2 es) → enum schema (en).
// Cuando un narrativo no tiene contraparte 1:1, se mapea al más cercano.
const ROLE_MAPPING = {
  dominante_sombra_cafe: ["nurse_plant", "biomass_producer"],
  dominante_sombra_cacao: ["nurse_plant"],
  dominante_sombra: ["nurse_plant"],
  fijadora_nitrogeno: ["nitrogen_fixer"],
  fruto_comestible: ["crop"],
  ribereña: ["ground_cover"],
  dominante_tuberculo_andino: ["crop"],
  fructooligosacaridos: ["crop"],
  dominante_frutal_amazonico: ["crop"],
  atractor_fauna: ["pollinator_attractor"],
  dominante_medicinal: ["pest_repellent"],
  repelente_alelopatica: ["pest_repellent"],
  dominante_palma_aceitera: ["crop"],
  bosque_galeria: ["ground_cover"],
  dominante_legumbre: ["crop", "nitrogen_fixer"],
  abono_verde: ["biomass_producer"],
  invasora_critica: ["invasive"],
  pirofila: ["invasive"],
  alelopatica: ["pest_repellent"],
  competidora_pastos_nativos: ["invasive"],
  forrajera_naturalizada: ["biomass_producer"],
  trepadora: ["crop"],
  fruto_relleno: ["crop"],
  trepadora_perenne: ["crop"],
  fruto_aromatico: ["crop"],
  dominante_cucurbitacea: ["crop"],
  cobertura_suelo: ["ground_cover"],
  dominante_cucurbitacea_altura: ["crop"],
  dominante_palma_fibra: ["crop", "biomass_producer"],
  dominante_arbol_oleaginoso: ["crop"],
  madera_pesada: ["biomass_producer"],
  dominante_tuberculo_amazonico: ["crop"],
  dominante_medicinal_aromatica: ["crop"],
  atractor_polinizadores: ["pollinator_attractor"],
  dominante_palma_alimenticia: ["crop"],
  agroforestal: ["nurse_plant"],
};

// propagation method strings → enum schema (semilla|esqueje|acodo|injerto|
// rizoma|tuberculo|estolon|division_mata|bulbo|espora|micropropagacion|pseudobulbo).
const PROPAGATION_MAPPING = {
  semilla: "semilla",
  estaca: "esqueje",
  estaquilla: "esqueje",
  esqueje: "esqueje",
  rizoma: "rizoma",
  "tubérculo": "tuberculo",
  tuberculo: "tuberculo",
  hijuelo: "division_mata",
  propagulo_asexual: "division_mata",
  "estolón": "estolon",
  estolon: "estolon",
  esporas: "espora",
  espora: "espora",
  injerto: "injerto",
  acodo: "acodo",
  bulbo: "bulbo",
};

// Estrato por id (categoría requiere estrato: frutales_perennes, arboles_sombra,
// abonos_verdes_coberturas, cercas_vivas).
const ESTRATO_BY_ID = {
  inga_densiflora: "alto",
  inga_punctata: "alto",
  inga_vera: "alto",
  pourouma_cecropiifolia: "medio",
  oenocarpus_bataua: "emergente",
  sicana_odorifera: "alto",
  astrocaryum_chambira: "emergente",
  caryocar_amygdaliferum: "emergente",
  bactris_gasipaes_pacifico_chocoana: "alto",
};

function normaliseSpecies(sp) {
  const out = { ...sp };

  // 1) roles_in_guild narrativo → enum
  const mapped = [];
  for (const r of sp.roles_in_guild || []) {
    const enums = ROLE_MAPPING[r];
    if (enums) for (const m of enums) if (!mapped.includes(m)) mapped.push(m);
  }
  if (mapped.length === 0) mapped.push("crop");
  out.roles_in_guild = mapped;

  // 2) propagation.methods normalisation
  if (sp.propagation && Array.isArray(sp.propagation.methods)) {
    const methods = sp.propagation.methods
      .map((m) => PROPAGATION_MAPPING[m] || null)
      .filter(Boolean);
    out.propagation = { methods: [...new Set(methods)] };
  }

  // 3) estrato si la categoría lo requiere
  const needsEstrato = [
    "frutales_perennes",
    "arboles_sombra",
    "abonos_verdes_coberturas",
    "cercas_vivas",
  ].includes(sp.category);
  if (needsEstrato && !sp.estrato) {
    out.estrato = ESTRATO_BY_ID[sp.id] || "alto";
  }

  // 4) Strip legacy validation_level si no está en schema (lo dejamos en _curation_status)
  // El campo "validation_level" del Claude DR v2 no está en el schema base — lo movemos
  // a una nota interna para no violar additionalProperties (aunque el schema raíz species
  // tiene additionalProperties:true, lo conservamos como tag de tracking)

  return out;
}

async function main() {
  const [seedRaw, drv2Raw] = await Promise.all([
    readFile(SEED_PATH, "utf8"),
    readFile(DRV2_PATH, "utf8"),
  ]);
  const seed = JSON.parse(seedRaw);
  const drv2 = JSON.parse(drv2Raw);

  const seedSpeciesIds = new Set(seed.species.map((s) => s.id));
  const seedBioIds = new Set(seed.biopreparados.map((b) => b.id));
  const seedSourceIds = new Set(seed.sources.map((s) => s.id));

  // -------- Species --------
  const newSpecies = [];
  const dupSpecies = [];
  for (const sp of drv2.species || []) {
    if (seedSpeciesIds.has(sp.id)) {
      dupSpecies.push(sp.id);
      continue;
    }
    newSpecies.push(normaliseSpecies(sp));
  }

  // -------- Biopreparados --------
  const newBio = [];
  const dupBio = [];
  for (const bp of drv2.biopreparados || []) {
    if (seedBioIds.has(bp.id)) {
      dupBio.push(bp.id);
      continue;
    }
    newBio.push(bp);
  }

  // -------- Sources --------
  const newSources = [];
  const dupSources = [];
  for (const src of drv2.sources_nuevas || []) {
    if (seedSourceIds.has(src.id)) {
      dupSources.push(src.id);
      continue;
    }
    newSources.push(src);
  }

  // -------- Fix retroactivo caldo_sulfocalcico (auditoría Restrepo) --------
  let sulfoFixed = false;
  const sulfo = seed.biopreparados.find((b) => b.id === "caldo_sulfocalcico");
  if (sulfo && sulfo.proceso_resumen && sulfo.proceso_resumen.includes("color ámbar")) {
    sulfo.proceso_resumen = sulfo.proceso_resumen.replace(
      "color ámbar",
      "color vino tinto/teja (28-32° Baumé)"
    );
    sulfoFixed = true;
  }

  // -------- Mutación seed --------
  seed.species.push(...newSpecies);
  seed.biopreparados.push(...newBio);
  seed.sources.push(...newSources);

  // -------- Report --------
  console.log("=== Integration Report — batch 2 (Claude DR v2, auditado Restrepo) ===");
  console.log("");
  console.log(`Species:`);
  console.log(`  + nuevas:     ${newSpecies.length}`);
  console.log(`  · duplicadas: ${dupSpecies.length}  (${dupSpecies.join(", ")})`);
  console.log(`  = total post: ${seed.species.length}`);
  console.log("");
  console.log(`Biopreparados:`);
  console.log(`  + nuevos:     ${newBio.length}`);
  console.log(`  · duplicados: ${dupBio.length}  (${dupBio.join(", ")})`);
  console.log(`  = total post: ${seed.biopreparados.length}`);
  console.log("");
  console.log(`Sources:`);
  console.log(`  + nuevas:     ${newSources.length}`);
  console.log(`  · duplicadas: ${dupSources.length}  (${dupSources.join(", ")})`);
  console.log(`  = total post: ${seed.sources.length}`);
  console.log("");
  console.log(`Fix sulfocalcico ámbar→vino tinto: ${sulfoFixed ? "✅ aplicado" : "⚠️  NO encontrado o ya corregido"}`);
  console.log("");
  if (newSpecies.length > 0) {
    console.log("Sample first new species (normalised):");
    console.log(JSON.stringify(newSpecies[0], null, 2).slice(0, 800));
    console.log("...");
  }

  if (DRY_RUN) {
    console.log("\n(--dry-run: no se escribió el archivo)");
    return;
  }

  await writeFile(SEED_PATH, JSON.stringify(seed, null, 2) + "\n", "utf8");
  console.log(`\n✅ Escrito: ${SEED_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
