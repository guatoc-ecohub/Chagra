#!/usr/bin/env node
/**
 * detector-confusion-taxonomica.mjs
 * ================================================================
 * Detector de confusión taxonómica en logs de la aplicación.
 *
 * Uso:
 *   node scripts/detector-confusion-taxonomica.mjs <archivo-logs.jsonl> [--json]
 *
 * Descripción:
 *   Lee logs de la app (texto libre + nombre_comun + nombre_cientifico cuando
 *   exista) y detecta pares donde el nombre común y el científico NO corresponden
 *   según el catálogo canónico catalog/chagra-catalog-oss-subset-v3.2.json.
 *
 *   Reporta:
 *   - archivo:linea
 *   - par sospechoso (nombre_comun → nombre_cientifico)
 *   - candidato correcto (según catálogo)
 *   - confianza (alta/media/baja)
 *
 * Casos canónicos que detecta:
 *   - gulupa (Passiflora edulis f. edulis) mapeada a guayaba (Psidium guajava)
 *   - aguacate (Persea americana) mapeado a guayaba
 *   - variantes de grafía/acento (curuba/curubo, uchuva/uvilla)
 * ================================================================
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const logFile = args.find((a) => !a.startsWith('--'));

if (!logFile) {
  console.error('Uso: node scripts/detector-confusion-taxonomica.mjs <archivo-logs.jsonl> [--json]');
  process.exit(1);
}

const LOG_PATH = resolve(logFile);
const CATALOG_PATH = join(ROOT, 'catalog/chagra-catalog-oss-subset-v3.2.json');

function die(msg) {
  console.error(`\x1b[31m✗ ${msg}\x1b[0m`);
  process.exit(1);
}

function loadJSON(path) {
  if (!existsSync(path)) die(`Archivo no encontrado: ${path}`);
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    die(`JSON inválido en ${path}: ${e.message}`);
  }
}

// Normalizar texto para comparación flexible (acentos, mayúsculas, espacios)
function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // Remove diacritics
    .trim();
}

// Palabras comunes que NO son nombres de especies
const STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'en', 'a',
  'con', 'por', 'para', 'que', 'es', 'son', 'está', 'tienen', 'tiene',
  'cual', 'cómo', 'qué', 'donde', 'cuando', 'como', 'mas', 'menos',
  'entre', 'sobre', 'tras', 'hasta', 'desde', 'hacia', 'mediante',
  'sin', 'so', 'bajo', 'durante', 'excepto', 'salvo', 'versus',
  '¿qué', '¿cómo', '¿cuál', '¿dónde', '¿cuándo', '¿por', 'cada',
  'otro', 'otra', 'otros', 'otras', 'mismo', 'misma', 'mismos',
  'propio', 'propia', 'propios', 'propias', 'cierto', 'cierta',
  'tales', 'tal', 'tanto', 'tanta', 'tantos', 'tantas', 'al',
  'del', 'ni', 'o', 'y', 'pero', 'aunque', 'porque', 'pues',
  'asi', 'esta', 'este', 'estos', 'estas', 'esa', 'eso', 'esos',
  'esas', 'aquel', 'aquella', 'aquellos', 'aquellas', 'mi',
  'mis', 'tu', 'tus', 'su', 'sus', 'nuestro', 'nuestra', 'nuestros',
  'nuestras', 'vuestro', 'vuestra', 'vuestros', 'vuestras', 'le',
  'les', 'me', 'te', 'se', 'nos', 'os', 'lo', 'la', 'los',
  'nombre', 'comun', 'cientifico', 'especie', 'especies', 'cultivo',
  '¿qué', 'cual', 'cuales'
]);

// Extraer pares nombre_comun + nombre_cientifico de texto libre
// Patrones soportados:
//   - "Nombre común (Nombre científico)"
//   - "Nombre científico (Nombre común)"
function extractSpeciesPairs(text) {
  const pairs = [];

  // Patrón 1: Nombre común (Nombre científico)
  // Mejorado para evitar capturar palabras comunes y verbos
  // Permite mayúscula o minúscula al inicio para capturar más casos
  const pattern1 = /([a-zA-ZÁáÉéÍíÓóÚúÑñ][a-záéíóúñ]+(?:\s+[a-zA-ZÁáÉéÍíÓóÚúÑñ][a-záéíóúñ]+)*)\s*\(([A-Z][A-Za-zÁáÉéÍíÓóÚúÑñ\s\.]+?)\)/g;
  let match;
  while ((match = pattern1.exec(text)) !== null) {
    const [, common, scientific] = match;
    let commonClean = common.trim();
    const scientificClean = scientific.trim();

    // Eliminar artículos del nombre común (el/la/los/las/un/una/unos/unas)
    commonClean = commonClean.replace(/^(el|la|los|las|un|una|unos|unas)\s+/i, '');

    // Filtrar stopwords y palabras muy cortas
    if (commonClean.length < 3 || STOPWORDS.has(commonClean.toLowerCase())) {
      continue;
    }

    // Validar que el nombre científico parece válido (debe tener al menos dos palabras, primera mayúscula)
    if (!/^[A-Z][a-z]/.test(scientificClean)) {
      continue;
    }

    pairs.push({ common: commonClean, scientific: scientificClean });
  }

  // Patrón 2: Nombre científico (Nombre común) - orden inverso
  const pattern2 = /\(([A-Z][A-Za-zÁáÉéÍíÓóÚúÑñ\s\.]+?)\)\s+([a-zA-ZÁáÉéÍíÓóÚúÑñ][a-záéíóúñ]+(?:\s+[a-zA-ZÁáÉéÍíÓóÚúÑñ][a-záéíóúñ]+)*)\b/g;
  while ((match = pattern2.exec(text)) !== null) {
    const [, scientific, common] = match;
    let commonClean = common.trim();
    const scientificClean = scientific.trim();

    // Eliminar artículos del nombre común
    commonClean = commonClean.replace(/^(el|la|los|las|un|una|unos|unas)\s+/i, '');

    // Validar nombre científico
    if (!/^[A-Z][a-z]/.test(scientificClean)) {
      continue;
    }

    // Filtrar stopwords
    if (commonClean.length < 3 || STOPWORDS.has(commonClean.toLowerCase())) {
      continue;
    }

    pairs.push({ common: commonClean, scientific: scientificClean });
  }

  return pairs;
}

// Buscar especie en catálogo por nombre común o científico
function findSpeciesInCatalog(catalog, searchTerm) {
  const normalized = normalize(searchTerm);
  const species = catalog.species || [];
  
  // Búsqueda exacta primero
  const exactMatch = species.find(s => 
    normalize(s.nombre_comun) === normalized ||
    normalize(s.nombre_cientifico) === normalized ||
    s.id === normalized
  );
  
  if (exactMatch) return exactMatch;
  
  // Búsqueda por substring (para variantes de grafía)
  const substringMatch = species.find(s => 
    normalize(s.nombre_comun).includes(normalized) ||
    normalized.includes(normalize(s.nombre_comun)) ||
    normalize(s.nombre_cientifico).includes(normalized) ||
    normalized.includes(normalize(s.nombre_cientifico))
  );
  
  return substringMatch;
}

// Calcular confianza de la detección
function calculateConfidence(common, scientific, correctSpecies) {
  if (!correctSpecies) return 'baja';
  
  const commonNormalized = normalize(common);
  const scientificNormalized = normalize(scientific);
  const correctScientificNormalized = normalize(correctSpecies.nombre_cientifico);
  
  // Alta: ambos nombres completamente diferentes
  if (commonNormalized !== normalize(correctSpecies.nombre_comun) &&
      scientificNormalized !== correctScientificNormalized) {
    return 'alta';
  }
  
  // Media: uno coincide parcialmente
  if (commonNormalized.includes(normalize(correctSpecies.nombre_comun)) ||
      scientificNormalized.includes(correctScientificNormalized)) {
    return 'media';
  }
  
  return 'baja';
}

// Detectar confusión taxonómica en una línea de log
function detectConfusionInLine(catalog, line, lineNumber) {
  const issues = [];
  
  // Extraer texto libre de diferentes tipos de log
  let textFields = [];
  
  if (line.prompt && Array.isArray(line.prompt)) {
    const userMsg = line.prompt.find(m => m.role === 'user');
    if (userMsg) textFields.push(userMsg.content);
  }
  
  if (line.chosen && Array.isArray(line.chosen)) {
    const assistantMsg = line.chosen.find(m => m.role === 'assistant');
    if (assistantMsg) textFields.push(assistantMsg.content);
  }
  
  if (line.rejected && Array.isArray(line.rejected)) {
    const assistantMsg = line.rejected.find(m => m.role === 'assistant');
    if (assistantMsg) textFields.push(assistantMsg.content);
  }
  
  if (line.text) textFields.push(line.text);
  if (line.content) textFields.push(line.content);
  if (line.message) textFields.push(line.message);
  
  // Buscar pares de especies en cada campo de texto
  for (const text of textFields) {
    const pairs = extractSpeciesPairs(text);
    
    for (const pair of pairs) {
      const commonSpecies = findSpeciesInCatalog(catalog, pair.common);
      const scientificSpecies = findSpeciesInCatalog(catalog, pair.scientific);
      
      // Si ambos existen pero son diferentes especies → confusión
      if (commonSpecies && scientificSpecies && commonSpecies.id !== scientificSpecies.id) {
        issues.push({
          lineNumber,
          pair: {
            common: pair.common,
            scientific: pair.scientific,
          },
          correctPair: {
            common: commonSpecies.nombre_comun,
            scientific: commonSpecies.nombre_cientifico,
            id: commonSpecies.id,
          },
          confidence: calculateConfidence(pair.common, pair.scientific, commonSpecies),
        });
      }
      
      // Si el nombre común existe pero el científico no corresponde
      if (commonSpecies && !scientificSpecies) {
        // Verificar si el nombre científico dado corresponde a otra especie
        const otherSpecies = findSpeciesInCatalog(catalog, pair.scientific);
        if (otherSpecies && otherSpecies.id !== commonSpecies.id) {
          issues.push({
            lineNumber,
            pair: {
              common: pair.common,
              scientific: pair.scientific,
            },
            correctPair: {
              common: commonSpecies.nombre_comun,
              scientific: commonSpecies.nombre_cientifico,
              id: commonSpecies.id,
            },
            confidence: calculateConfidence(pair.common, pair.scientific, commonSpecies),
          });
        }
      }
    }
  }
  
  return issues;
}

// Formatear salida
function formatOutput(issues, logFile) {
  if (jsonOutput) {
    return JSON.stringify({ logFile, issues }, null, 2);
  }
  
  if (issues.length === 0) {
    return `✓ No se detectaron confusiones taxonómicas en ${logFile}`;
  }
  
  let output = `\n🔍 Confusiones taxonómicas detectadas en ${logFile}:\n\n`;
  
  for (const issue of issues) {
    const confidenceIcon = {
      alta: '🔴',
      media: '🟡',
      baja: '🟢',
    }[issue.confidence];
    
    output += `${confidenceIcon} Línea ${issue.lineNumber} [${issue.confidence.toUpperCase()}]\n`;
    output += `   Par sospechoso: "${issue.pair.common}" → "${issue.pair.scientific}"\n`;
    output += `   Correcto según catálogo: "${issue.correctPair.common}" → "${issue.correctPair.scientific}" (ID: ${issue.correctPair.id})\n\n`;
  }
  
  output += `Total: ${issues.length} posible${issues.length > 1 ? 's' : ''} confusión${issues.length > 1 ? 'es' : ''} detectada${issues.length > 1 ? 's' : ''}`;
  
  return output;
}

// Main
function main() {
  const catalog = loadJSON(CATALOG_PATH);
  const logContent = readFileSync(LOG_PATH, 'utf8');
  const lines = logContent.trim().split('\n');
  
  const issues = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    let lineData;
    try {
      lineData = JSON.parse(line);
    } catch (e) {
      continue; // Skip invalid JSON lines
    }
    
    const lineIssues = detectConfusionInLine(catalog, lineData, i + 1);
    issues.push(...lineIssues);
  }
  
  console.log(formatOutput(issues, LOG_PATH));
  
  // Exit code 1 si hay problemas de alta confianza
  const highConfidenceIssues = issues.filter(i => i.confidence === 'alta');
  if (highConfidenceIssues.length > 0) {
    process.exit(1);
  }
}

main();
