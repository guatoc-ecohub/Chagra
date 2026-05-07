#!/usr/bin/env node
/**
 * validate-cycle-content.mjs
 * ================================================================
 * Validador anti-overpromise para `/public/cycle-content/<slug>.json`
 * (ADR-032 sección 6).
 *
 * Verifica que rendimientos declarados (`cosecha_estimada_kg_por_planta`)
 * estén dentro de rangos agroecológicos colombianos documentados. Rechaza
 * overpromise hidropónico/sintético disfrazado de agroecología.
 *
 * Caps por especie (fuente: ADR-032 sec 6 + literatura institucional
 * Cenicafé/Agrosavia/UNAL/UPTC):
 *   - lechuga > 0.7 kg/planta            → warning + requiere fuente peer-review
 *   - fresa > 1.0 kg/planta acumulado     → warning + requiere fuente
 *   - tomate_chonto:
 *       campo abierto > 6 kg/planta       → ERROR
 *       invernadero > 12 kg/planta        → ERROR
 *   - cafe > 18 kg cerezas/árbol/ciclo    → warning (Cenicafé 1 = 17.6 kg)
 *   - aguacate_hass > 80 kg/árbol/año     → warning (UIS clasif. Alto >100 = excepcional)
 *
 * Uso:
 *   node scripts/validate-cycle-content.mjs              # valida todos los json en public/cycle-content/
 *   node scripts/validate-cycle-content.mjs lechuga.json # valida uno
 *
 * Exit codes:
 *   0 — OK (warnings permitidos)
 *   1 — ERROR (overpromise rechazado)
 *   2 — JSON inválido / archivo no encontrado
 *
 * Lefthook integration:
 *   pre-commit hook puede correr esto sobre archivos cycle-content modificados.
 *
 * Refs: ADR-032 sec 6, ADR-031 schema v3.3, DR-034 cierre
 * ================================================================
 */

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CONTENT_DIR = join(ROOT, 'public', 'cycle-content');

// Caps por species_slug. `error` = falla validación (exit 1). `warn` = warning solo.
// Justificación inline: ADR-032 sec 6 + fuentes literatura colombiana.
const CAPS = {
  lechuga: {
    field: 'agroecologico_promedio',
    warn_kg: 0.7,
    note: 'literatura comercial >800g requiere fuente peer-reviewed (hidroponía sintética típica). Agrosavia Sabana Bogotá: 0.3-0.6 kg/planta.',
  },
  fresa: {
    field: 'agroecologico_acumulado_12_18_meses',
    warn_kg: 1.0,
    note: 'cifras superiores son sistemas con bromuro de metilo + fertirriego sintético (Fischer et al. 2018 Agrosavia + UTEA Tesis 2024).',
  },
  tomate_chonto: {
    field: 'campo_abierto_agroecologico',
    error_kg: 6,
    field_invernadero: 'invernadero_tecnificado',
    error_invernadero_kg: 12,
    note: '>12 kg/planta solo cultivares larga vida con fertirriego hidropónico mecanizado (Agrosavia 2018 ISBN 978-958-740-120-2).',
  },
  cafe_arabica: {
    field: 'cps_kg_por_arbol_anio',
    warn_kg: 18,
    note: 'Cenicafé 1 = 17.6 kg cerezas/árbol/ciclo (Flórez et al. 2016 AT Cenicafé 469). >18 requiere validación.',
  },
  aguacate_hass: {
    field: 'kg_por_arbol_anio_madurez',
    warn_kg: 80,
    note: 'Clasificación UIS: Bajo <50 / Medio 50-100 / Alto >100. >80 ya es excepcional, requiere fuente.',
  },
};

let exitCode = 0;
const reports = [];

function getNumeric(value) {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object') {
    if (typeof value.tipico === 'number') return value.tipico;
    if (typeof value.max === 'number') return value.max;
  }
  return null;
}

function validateFile(file) {
  const path = join(CONTENT_DIR, file);
  let data;
  try {
    data = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    reports.push({ file, level: 'ERROR', msg: `JSON inválido: ${err.message}` });
    exitCode = Math.max(exitCode, 2);
    return;
  }

  const slug = data.species_slug || basename(file, '.json');
  const cap = CAPS[slug];
  if (!cap) {
    reports.push({ file, level: 'INFO', msg: `Sin cap definido para slug "${slug}". Skip validación rendimiento.` });
    return;
  }

  const harvest = data.cosecha_estimada_kg_por_planta;
  if (!harvest) {
    reports.push({ file, level: 'WARN', msg: `Falta campo cosecha_estimada_kg_por_planta — no validable.` });
    return;
  }

  // Validación campo principal
  const fieldData = harvest[cap.field];
  if (fieldData) {
    const value = getNumeric(fieldData);
    if (value !== null) {
      if (cap.error_kg && value > cap.error_kg) {
        reports.push({ file, level: 'ERROR', msg: `${cap.field} = ${value} kg/planta excede ERROR cap ${cap.error_kg}. ${cap.note}` });
        exitCode = Math.max(exitCode, 1);
      } else if (cap.warn_kg && value > cap.warn_kg) {
        reports.push({ file, level: 'WARN', msg: `${cap.field} = ${value} kg/planta excede WARN cap ${cap.warn_kg}. ${cap.note}` });
      } else {
        reports.push({ file, level: 'OK', msg: `${cap.field} = ${value} kg/planta (cap ${cap.warn_kg ?? cap.error_kg})` });
      }
    }
  }

  // Validación campo secundario invernadero (solo tomate)
  if (cap.field_invernadero && harvest[cap.field_invernadero]) {
    const value = getNumeric(harvest[cap.field_invernadero]);
    if (value !== null && cap.error_invernadero_kg && value > cap.error_invernadero_kg) {
      reports.push({ file, level: 'ERROR', msg: `${cap.field_invernadero} = ${value} kg/planta excede ERROR cap ${cap.error_invernadero_kg}. ${cap.note}` });
      exitCode = Math.max(exitCode, 1);
    }
  }

  // Validación que existe campo anti_overpromise (transparencia)
  if (!harvest.anti_overpromise) {
    reports.push({ file, level: 'WARN', msg: `Falta campo anti_overpromise (recomendado en ADR-032 — explica por qué los rangos son conservadores).` });
  }
}

// CLI: archivo específico o todos
const args = process.argv.slice(2);
const files = args.length > 0 ? args : readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json'));

if (files.length === 0) {
  console.warn(`No JSON files found in ${CONTENT_DIR}`);
  process.exit(0);
}

console.log(`Validating ${files.length} cycle-content files...\n`);

for (const f of files) {
  validateFile(f);
}

// Reporting
const byLevel = { ERROR: [], WARN: [], OK: [], INFO: [] };
for (const r of reports) byLevel[r.level].push(r);

if (byLevel.OK.length > 0) {
  console.log(`✓ OK (${byLevel.OK.length}):`);
  for (const r of byLevel.OK) console.log(`  ${r.file}: ${r.msg}`);
}
if (byLevel.INFO.length > 0) {
  console.log(`\nℹ INFO (${byLevel.INFO.length}):`);
  for (const r of byLevel.INFO) console.log(`  ${r.file}: ${r.msg}`);
}
if (byLevel.WARN.length > 0) {
  console.log(`\n⚠ WARN (${byLevel.WARN.length}):`);
  for (const r of byLevel.WARN) console.log(`  ${r.file}: ${r.msg}`);
}
if (byLevel.ERROR.length > 0) {
  console.log(`\n✗ ERROR (${byLevel.ERROR.length}):`);
  for (const r of byLevel.ERROR) console.log(`  ${r.file}: ${r.msg}`);
}

console.log(`\nExit ${exitCode}`);
process.exit(exitCode);
