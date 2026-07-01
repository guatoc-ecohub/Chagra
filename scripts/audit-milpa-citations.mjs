#!/usr/bin/env node
/**
 * audit-milpa-citations.mjs
 * ================================================================
 * Auditoría de citas para relaciones companion planting (milpa)
 * en el grafo AGE de Chagra.
 *
 * Identifica aristas de asociación/companion que NO tienen
 * verificado_openalex/DOI, priorizando por cultivos insignia:
 * maíz, frijol, calabaza (milpa), café, hortalizas.
 *
 * Uso:
 *   node scripts/audit-milpa-citations.mjs [catalog.json]
 *
 * Default:
 *   catalog = catalog/chagra-catalog-seed-v3.1.json
 *
 * Output:
 *   - JSON estructurado: /tmp/milpa-citations-audit-<timestamp>.json
 *   - Resumen markdown: /tmp/milpa-citations-audit-<timestamp>.md
 *
 * Exit codes:
 *   0 — OK
 *   1 — archivo no encontrado o JSON inválido
 *   2 — sin relaciones companion encontradas
 * ================================================================
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const args = process.argv.slice(2);
const catalogArg = args[0];
const CATALOG_PATH = catalogArg
  ? resolve(catalogArg)
  : join(ROOT, 'catalog/chagra-catalog-seed-v3.1.json');

// Cultivos insignia para priorizar (según task #milpa-citations-audit)
const INSIGNIA_CROPS = [
  'zea_mays',                    // Maíz (milpa)
  'phaseolus_vulgaris',          // Frijol (milpa)
  'coffea_arabica',              // Café
  // Cucurbita spp. (calabaza) no está en el OSS subset actual
];

// Hortalizas prioritarias (categoría hortalizas_*)
const HORTALIZAS_PRIORITY = [
  'allium_fistulosum',           // Cebollín
  'coriandrum_sativum',          // Cilantro
  'lactuca_sativa_capitata',     // Lechuga
  'solanum_lycopersicum_san_marzano', // Tomate
];

console.log('Chagra Milpa Citations Audit Tool');
console.log(`  input: ${CATALOG_PATH}`);

if (!existsSync(CATALOG_PATH)) {
  console.error(`Error: archivo no encontrado: ${CATALOG_PATH}`);
  process.exit(1);
}

const raw = readFileSync(CATALOG_PATH, 'utf8');
let catalog;
try {
  catalog = JSON.parse(raw);
} catch (err) {
  console.error(`Error: JSON inválido en ${CATALOG_PATH}:`, err.message);
  process.exit(1);
}

const speciesArr = catalog.species || [];
const byId = new Map(speciesArr.map((s) => [s.id, s]));

// Función auxiliar para determinar prioridad
function getPriority(speciesId) {
  if (INSIGNIA_CROPS.includes(speciesId)) {
    return 'INSIGNIA';
  }
  if (HORTALIZAS_PRIORITY.includes(speciesId)) {
    return 'HORTALIZA_PRIORITY';
  }
  const species = byId.get(speciesId);
  if (species?.category?.startsWith('hortalizas')) {
    return 'HORTALIZA';
  }
  return 'STANDARD';
}

// Función auxiliar para obtener tag de categoría
function getCategoryTag(speciesId) {
  const species = byId.get(speciesId);
  if (!species) return 'unknown';
  if (INSIGNIA_CROPS.includes(speciesId)) {
    if (speciesId === 'zea_mays') return 'milpa_maiz';
    if (speciesId === 'phaseolus_vulgaris') return 'milpa_frijol';
    if (speciesId === 'coffea_arabica') return 'cafe';
  }
  if (species.category?.startsWith('hortalizas')) {
    return `hortaliza_${species.category.replace('hortalizas_', '')}`;
  }
  return species.category || 'unknown';
}

// Extraer todas las aristas companion
const companionEdges = [];
for (const sp of speciesArr) {
  for (const coId of sp.companions || []) {
    companionEdges.push({
      from: sp.id,
      to: coId,
    });
  }
}

if (companionEdges.length === 0) {
  console.error('Error: no se encontraron relaciones companion en el catálogo');
  process.exit(2);
}

// NOTA: En el catálogo v3.1 actual, las relaciones companion NO tienen
// metadatos de citación individuales (verificado_openalex, doi, etc.).
// Por lo tanto, TODAS las relaciones necesitan citación según la auditoría.
// Este script lista todas las aristas que necesitan citación, priorizando
// por cultivos insignia según el task #milpa-citations-audit.

const edgesNeedingCitation = companionEdges.map((edge) => {
  const fromSpecies = byId.get(edge.from);
  const toSpecies = byId.get(edge.to);
  const fromPriority = getPriority(edge.from);
  const toPriority = getPriority(edge.to);
  
  // Determinar prioridad máxima de la arista
  let edgePriority = 'STANDARD';
  if (fromPriority === 'INSIGNIA' || toPriority === 'INSIGNIA') {
    edgePriority = 'INSIGNIA';
  } else if (fromPriority === 'HORTALIZA_PRIORITY' || toPriority === 'HORTALIZA_PRIORITY') {
    edgePriority = 'HORTALIZA_PRIORITY';
  } else if (fromPriority === 'HORTALIZA' || toPriority === 'HORTALIZA') {
    edgePriority = 'HORTALIZA';
  }

  return {
    from_id: edge.from,
    from_nombre: fromSpecies?.nombre_comun || edge.from,
    from_nombre_cientifico: fromSpecies?.nombre_cientifico || null,
    from_categoria: getCategoryTag(edge.from),
    to_id: edge.to,
    to_nombre: toSpecies?.nombre_comun || edge.to,
    to_nombre_cientifico: toSpecies?.nombre_cientifico || null,
    to_categoria: getCategoryTag(edge.to),
    priority: edgePriority,
    needs_citation: true, // Todas necesitan citación en v3.1
    citation_status: 'NOT_CITED', // No hay mecanismo de citación por arista
    verificado_openalex: null,
    doi: null,
  };
});

// Ordenar por prioridad
const priorityOrder = {
  'INSIGNIA': 0,
  'HORTALIZA_PRIORITY': 1,
  'HORTALIZA': 2,
  'STANDARD': 3,
};

edgesNeedingCitation.sort((a, b) => {
  const pa = priorityOrder[a.priority] ?? 3;
  const pb = priorityOrder[b.priority] ?? 3;
  if (pa !== pb) return pa - pb;
  return a.from_id.localeCompare(b.from_id);
});

// Crear directorio temporal para output
const tmpDir = mkdtempSync(join('/tmp', 'milpa-citations-audit-'));
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const jsonOutputPath = join(tmpDir, `milpa-citations-audit-${timestamp}.json`);
const mdOutputPath = join(tmpDir, `milpa-citations-audit-${timestamp}.md`);

// Estadísticas
const stats = {
  total_companion_edges: companionEdges.length,
  total_needing_citation: edgesNeedingCitation.length,
  pct_needing_citation: 100, // 100% porque no hay mecanismo de citación
  by_priority: {
    insignia: edgesNeedingCitation.filter(e => e.priority === 'INSIGNIA').length,
    hortaliza_priority: edgesNeedingCitation.filter(e => e.priority === 'HORTALIZA_PRIORITY').length,
    hortaliza: edgesNeedingCitation.filter(e => e.priority === 'HORTALIZA').length,
    standard: edgesNeedingCitation.filter(e => e.priority === 'STANDARD').length,
  },
  insignia_crops: {
    zea_mays: { nombre: 'Maíz', edges: edgesNeedingCitation.filter(e => e.from_id === 'zea_mays' || e.to_id === 'zea_mays').length },
    phaseolus_vulgaris: { nombre: 'Frijol', edges: edgesNeedingCitation.filter(e => e.from_id === 'phaseolus_vulgaris' || e.to_id === 'phaseolus_vulgaris').length },
    coffea_arabica: { nombre: 'Café', edges: edgesNeedingCitation.filter(e => e.from_id === 'coffea_arabica' || e.to_id === 'coffea_arabica').length },
  },
};

// Crear el objeto de reporte
const report = {
  _meta: {
    generated_at: new Date().toISOString(),
    task: '#milpa-citations-audit',
    catalog_path: CATALOG_PATH,
    catalog_schema: catalog.schema_version,
    species_count: speciesArr.length,
    note: 'En catálogo v3.1, las relaciones companion NO tienen metadatos de citación individuales. TODAS las aristas necesitan citación.',
  },
  statistics: stats,
  edges_needing_citation: edgesNeedingCitation,
};

// Escribir JSON
writeFileSync(jsonOutputPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

// Generar resumen markdown
const mdContent = `# Auditoría de Citaciones: Milpa/Companion Planting

**Generado:** ${new Date().toISOString()}  
**Task:** \`#milpa-citations-audit\`  
**Catálogo:** ${CATALOG_PATH}  
**Schema:** ${catalog.schema_version}

## Resumen Ejecutivo

El catálogo actual (${catalog.schema_version}) contiene **${stats.total_companion_edges}** aristas de relaciones companion planting, de las cuales **${stats.total_needing_citation}** (${stats.pct_needing_citation}%) requieren citación académica (DOI/OpenAlex).

**⚠️ Hallazgo crítico:** En el schema v3.1, las relaciones companion NO tienen metadatos de citación individuales (campos \`verificado_openalex\`, \`doi\`, etc.). Por lo tanto, **todas las aristas** necesitan citación documentada.

## Estadísticas por Prioridad

| Prioridad | Aristas sin citación | % del total |
|-----------|---------------------|-------------|
| **INSIGNIA** (maíz, frijol, café) | ${stats.by_priority.insignia} | ${((stats.by_priority.insignia / stats.total_needing_citation) * 100).toFixed(1)}% |
| **HORTALIZA_PRIORITY** | ${stats.by_priority.hortaliza_priority} | ${((stats.by_priority.hortaliza_priority / stats.total_needing_citation) * 100).toFixed(1)}% |
| **HORTALIZA** (otras hortalizas) | ${stats.by_priority.hortaliza} | ${((stats.by_priority.hortaliza / stats.total_needing_citation) * 100).toFixed(1)}% |
| **STANDARD** (otros cultivos) | ${stats.by_priority.standard} | ${((stats.by_priority.standard / stats.total_needing_citation) * 100).toFixed(1)}% |
| **TOTAL** | ${stats.total_needing_citation} | 100% |

## Cultivos Insignia (Milpa y Café)

| Cultivo | Nombre | Aristas sin citación |
|---------|--------|---------------------|
| Maíz | ${stats.insignia_crops.zea_mays.nombre} | ${stats.insignia_crops.zea_mays.edges} |
| Frijol | ${stats.insignia_crops.phaseolus_vulgaris.nombre} | ${stats.insignia_crops.phaseolus_vulgaris.edges} |
| Café | ${stats.insignia_crops.coffea_arabica.nombre} | ${stats.insignia_crops.coffea_arabica.edges} |

## Top 20 Aristas Prioritarias (INSIGNIA)

${edgesNeedingCitation.filter(e => e.priority === 'INSIGNIA').slice(0, 20).map((e, i) => 
  `${i + 1}. **${e.from_nombre}** (\`${e.from_id}\`) ↔ **${e.to_nombre}** (\`${e.to_id}\`)`
).join('\n')}

## Recomendaciones

1. **Implementar mecanismo de citación por arista:** Extender el schema para incluir campos de citación (\`verificado_openalex\`, \`doi\`, \`source_ids\`) en cada relación companion.

2. **Priorizar cultivos insignia:** Comenzar documentando las relaciones de maíz, frijol y café (cultivos de milpa y café colombiano).

3. **Deep Research:** Ejecutar una DR para buscar y documentar DOIs/OpenAlex para las ${stats.total_needing_citation} aristas identificadas en este reporte.

## Archivos de Output

- **JSON completo:** \`${jsonOutputPath}\`
- **Este reporte:** \`${mdOutputPath}\`

## Notas Técnicas

- Esta auditoría identifica aristas que **requieren** citación, pero NO inventa DOIs.
- Para añadir citas, consultar: [\`/tmp/milpa-citations-audit-${timestamp}.json\`](file://${jsonOutputPath})
- El archivo JSON contiene todos los metadatos necesarios para priorizar la búsqueda de fuentes.
`;

writeFileSync(mdOutputPath, mdContent + '\n', 'utf8');

// Imprimir resumen a stdout
console.log('');
console.log('Resumen:');
console.log(`  Total aristas companion:        ${stats.total_companion_edges}`);
console.log(`  Aristas requieren citación:     ${stats.total_needing_citation} (${stats.pct_needing_citation}%)`);
console.log('');
console.log('Por prioridad:');
console.log(`  INSIGNIA (maíz, frijol, café):      ${stats.by_priority.insignia} (${((stats.by_priority.insignia / stats.total_needing_citation) * 100).toFixed(1)}%)`);
console.log(`  HORTALIZA_PRIORITY:                 ${stats.by_priority.hortaliza_priority} (${((stats.by_priority.hortaliza_priority / stats.total_needing_citation) * 100).toFixed(1)}%)`);
console.log(`  HORTALIZA:                          ${stats.by_priority.hortaliza} (${((stats.by_priority.hortaliza / stats.total_needing_citation) * 100).toFixed(1)}%)`);
console.log(`  STANDARD:                           ${stats.by_priority.standard} (${((stats.by_priority.standard / stats.total_needing_citation) * 100).toFixed(1)}%)`);
console.log('');
console.log('Cultivos insignia:');
console.log(`  Maíz:     ${stats.insignia_crops.zea_mays.edges} aristas`);
console.log(`  Frijol:   ${stats.insignia_crops.phaseolus_vulgaris.edges} aristas`);
console.log(`  Café:     ${stats.insignia_crops.coffea_arabica.edges} aristas`);
console.log('');
console.log(`  JSON output: ${jsonOutputPath}`);
console.log(`  Markdown:    ${mdOutputPath}`);
console.log('');
console.log('✅ Auditoría completada. Revisar los archivos de output para detalles completos.');
