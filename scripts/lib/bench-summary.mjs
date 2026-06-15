/**
 * bench-summary.mjs — generador de resúmenes Markdown para benches.
 *
 * Este módulo provee funciones para generar resúmenes en formato Markdown
 * con tablas, estadísticas y secciones comunes.
 *
 * @module bench-summary
 */

/**
 * Genera la sección de metadata de un summary.
 *
 * @param {object} params
 * @param {string} params.benchName  Nombre del bench
 * @param {string} params.dateStr  Fecha en formato YYYY-MM-DD
 * @param {string} params.timestamp  Timestamp ISO completo
 * @param {string[]} params.models  Lista de modelos evaluados
 * @param {number} params.promptCount  Cantidad de prompts
 * @param {number} params.totalTimeMs  Tiempo total en ms
 * @param {object} params.extra  Campos extra a incluir
 * @returns {string} Sección de metadata en Markdown
 */
export function generateMetadataSection({
  benchName,
  dateStr,
  timestamp,
  models,
  promptCount,
  totalTimeMs,
  extra = {},
}) {
  const minutes = (totalTimeMs / 1000 / 60).toFixed(2);
  const avgSeconds = (totalTimeMs / promptCount / 1000).toFixed(2);

  let extraLines = '';
  for (const [key, value] of Object.entries(extra)) {
    extraLines += `- **${key}**: ${value}\n`;
  }

  return `## Metadata
- **Timestamp**: ${timestamp}
- **Modelos**: ${models.join(', ')}
- **Prompts**: ${promptCount}
- **Tiempo total**: ${minutes}min
- **Tiempo promedio por prompt**: ${avgSeconds}s
${extraLines}`;
}

/**
 * Genera una tabla Markdown con los resultados por modelo.
 *
 * @param {object[]} modelStats  Array de estadísticas por modelo
 * @param {string[]} columns  Columnas a incluir
 * @param {function} [formatter]  Función para formatear valores (opcional)
 * @returns {string} Tabla Markdown
 */
export function generateModelTable(modelStats, columns, formatter) {
  const header = `| ${columns.join(' | ')} |`;
  const separator = `| ${columns.map(() => '---').join(' | ')} |`;

  const rows = modelStats.map(stats => {
    const values = columns.map(col => {
      const value = stats[col];
      return formatter ? formatter(col, value, stats) : value;
    });
    return `| ${values.join(' | ')} |`;
  });

  return [header, separator, ...rows].join('\n');
}

/**
 * Genera una sección de conclusión para un summary.
 *
 * @param {object} params
 * @param {string} params.bestModel  Nombre del mejor modelo
 * @param {number} params.bestWins  Victorias del mejor modelo
 * @param {number} params.totalPrompts  Total de prompts
 * @param {object} params.bestStats  Estadísticas del mejor modelo
 * @returns {string} Sección de conclusión
 */
export function generateConclusionSection({
  bestModel,
  bestWins,
  totalPrompts,
  bestStats,
}) {
  const pct = ((bestWins / totalPrompts) * 100).toFixed(1);

  let conclusion = `## Conclusión

**${bestModel}** ganó en ${bestWins} de ${totalPrompts} prompts (${pct}%).\n\n`;

  if (bestStats) {
    if (bestStats.avgLatency !== undefined) {
      conclusion += `Latencia promedio: ${bestStats.avgLatency.toFixed(0)}ms\n`;
    }
    if (bestStats.avgKeywords !== undefined) {
      conclusion += `Keywords matched: ${(bestStats.avgKeywords * 100).toFixed(1)}%\n`;
    }
  }

  return conclusion;
}

/**
 * Calcula estadísticas por categoría.
 *
 * @param {Array} results  Resultados del bench
 * @param {string} category  Categoría a filtrar
 * @param {string[]} modelKeys  Keys de modelos en los resultados
 * @returns {object} Estadísticas por modelo para la categoría
 */
export function calculateCategoryStats(results, category, modelKeys) {
  const categoryResults = results.filter(r => r.category === category);

  const stats = {};
  for (const modelKey of modelKeys) {
    const successful = categoryResults.filter(r => r[modelKey] && !r[modelKey].error);

    if (successful.length === 0) {
      stats[modelKey] = {
        avgLatency: 0,
        avgKeywords: 0,
        count: 0,
      };
      continue;
    }

    const avgLatency = successful.reduce((s, r) => s + r[modelKey].latency_ms, 0) / successful.length;
    
    let avgKeywords = 0;
    if (successful[0][modelKey].keywords_matched !== undefined) {
      avgKeywords = successful.reduce((s, r) => {
        const matched = r[modelKey].keywords_matched || 0;
        const total = r[modelKey].keywords_total || 1;
        return s + (matched / total);
      }, 0) / successful.length;
    }

    stats[modelKey] = {
      avgLatency,
      avgKeywords,
      count: successful.length,
    };
  }

  return stats;
}

/**
 * Genera una sección de resultados por categoría.
 *
 * @param {object} params
 * @param {Array} params.results  Resultados del bench
 * @param {object} params.categories  Objeto con categorías y sus labels
 * @param {string[]} params.modelKeys  Keys de modelos
 * @param {function} params.modelNameFn  Función para obtener nombre de modelo desde key
 * @returns {string} Sección de por categoría
 */
export function generateCategorySection({
  results,
  categories,
  modelKeys,
  modelNameFn,
}) {
  let section = '## Por Categoría\n\n';

  for (const [key, label] of Object.entries(categories)) {
    const stats = calculateCategoryStats(results, key, modelKeys);

    section += `### ${label}\n`;
    section += '| Modelo | Avg Latency (ms) | Avg Keywords (%) |\n';
    section += '|--------|-----------------|------------------|\n';

    for (const modelKey of modelKeys) {
      const s = stats[modelKey];
      const modelName = modelNameFn ? modelNameFn(modelKey) : modelKey;
      const latency = s.avgLatency.toFixed(0);
      const keywords = (s.avgKeywords * 100).toFixed(1);

      section += `| ${modelName} | ${latency} | ${keywords}% |\n`;
    }

    section += '\n';
  }

  return section;
}

/**
 * Guarda un summary en formato Markdown.
 *
 * @param {string} content  Contenido del summary
 * @param {string} summaryPath  Path donde guardar el archivo
 */
export function saveSummary(content, summaryPath) {
  const { dirname, existsSync, mkdirSync, writeFileSync } = require('node:fs');
  const { join } = require('node:path');

  const dir = dirname(summaryPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(summaryPath, content);
}

/**
 * Combina múltiples secciones de un summary en un documento completo.
 *
 * @param {object} params
 * @param {string} params.title  Título del documento
 * @param {string} params.metadata  Sección de metadata
 * @param {string} params.globalResults  Sección de resultados globales
 * @param {string} params.winners  Sección de ganadores
 * @param {string} [params.categoryResults]  Sección de por categoría (opcional)
 * @param {string} params.conclusion  Sección de conclusión
 * @returns {string} Documento Markdown completo
 */
export function combineSummarySections({
  title,
  metadata,
  globalResults,
  winners,
  categoryResults = '',
  conclusion,
}) {
  let doc = `# ${title}\n\n`;
  doc += `${metadata}\n\n`;
  doc += `## Resultados Globales\n\n`;
  doc += `${globalResults}\n\n`;
  doc += `## Ganadores por Prompt\n\n`;
  doc += `${winners}\n\n`;

  if (categoryResults) {
    doc += `${categoryResults}\n`;
  }

  doc += `${conclusion}\n`;

  return doc;
}
