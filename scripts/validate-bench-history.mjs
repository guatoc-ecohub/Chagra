/**
 * scripts/validate-bench-history.mjs — Validador de consistencia del historial de benches.
 *
 * TAREA 136: Detecta summaries en bench/history/ donde el model declarado
 * en el summary no coincide con el config del bench (ej: qwen3-vs-granite
 * corriendo con qwen2.5:14b).
 *
 * Comando: node scripts/validate-bench-history.mjs
 */
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HISTORY_DIR = join(__dirname, '..', 'bench', 'history');

function extractModelFromConfig(config) {
  // El config puede ser string (nombre de config) o objeto con model
  if (!config) return null;
  const modelMatch = typeof config === 'string'
    ? config.match(/model[:\s=]+([^\s,]+)/i)
    : null;
  return modelMatch ? modelMatch[1] : null;
}

function normalizeModel(name) {
  // Normaliza variantes menores del mismo modelo
  return (name || '').toLowerCase().replace(/[:\-_.]/g, '');
}

async function validateHistory() {
  const files = (await readdir(HISTORY_DIR)).filter(f => f.endsWith('.json'));
  const issues = [];

  for (const file of files) {
    try {
      const raw = await readFile(join(HISTORY_DIR, file), 'utf-8');
      const data = JSON.parse(raw);

      // Extraer modelo del summary vs filename/config
      const fileNameModel = file.split('__')[0];
      const summaryModel = data.summary?.model || data.model;

      if (summaryModel && fileNameModel) {
        const normFile = normalizeModel(fileNameModel);
        const normSummary = normalizeModel(summaryModel);

        if (normFile !== normSummary && !normSummary.includes(normFile) && !normFile.includes(normSummary)) {
          issues.push({
            file,
            expected: fileNameModel,
            found: summaryModel,
            severity: 'warning',
          });
        }
      }

      // Verificar que config.model coincide si existe
      const configModel = data.config?.model;
      if (configModel && summaryModel) {
        const normConfig = normalizeModel(configModel);
        const normSummaryM = normalizeModel(summaryModel);
        if (normConfig !== normSummaryM && !normSummaryM.includes(normConfig) && !normConfig.includes(normSummaryM)) {
          issues.push({
            file,
            expected: configModel,
            found: summaryModel,
            severity: 'error',
            message: 'Config model mismatch with summary model',
          });
        }
      }
    } catch (e) {
      issues.push({ file, severity: 'error', message: `Parse error: ${e.message}` });
    }
  }

  console.log(`\nBench history audit: ${files.length} files checked.`);
  if (issues.length === 0) {
    console.log('✓ All consistent.\n');
  } else {
    console.log(`✗ ${issues.length} issues found:\n`);
    for (const issue of issues) {
      const icon = issue.severity === 'error' ? '🔴' : '🟡';
      console.log(`  ${icon} ${issue.file}`);
      if (issue.message) console.log(`     ${issue.message}`);
      else console.log(`     expected: ${issue.expected}, found: ${issue.found}`);
    }
    console.log();
  }
}

validateHistory().catch(e => {
  console.error('Validation failed:', e.message);
  process.exit(1);
});
