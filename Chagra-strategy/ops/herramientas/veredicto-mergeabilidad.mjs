#!/usr/bin/env node
// veredicto-mergeabilidad.mjs — evalúa mergeabilidad REAL de PRs abiertos en Chagra.
//
// POR QUÉ: `mergeable=MERGEABLE` de GitHub NO significa CI verde. #2913 figuraba MERGEABLE
// con tsc:check ROJO, y #2916 (DRAFT) figuraba MERGEABLE pero era UNSTABLE. Este script
// evalúa el estado REAL del CI por check-run del HEAD (no por gh pr checks) y emite un
// veredicto LISTO/NO LISTO con la razón nombrada.
//
// USO:
//   node Chagra-strategy/ops/herramientas/veredicto-mergeabilidad.mjs
//
// SALIDA:
//   - Tabla de PRs con veredicto y razón
//   - Controles: POSITIVO (PR verde real), NEGATIVO (PR con checks rojos)
//   - Sección de NO PUDE VERIFICAR

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const REPO = process.env.REPO || 'guatoc-ecohub/Chagra';
const BASE = process.env.BASE || 'dev';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

// Checks que se IGNORAN (no bloquean merge)
const CHECKS_INFORMATIVOS = new Set([
  'E2E suite completa (informativo)',
  'Playwright visual snapshots',
]);

const CHECKS_PROCESO = new Set([
  'CLAAssistant',
]);

function gh(cmd, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      const out = execSync(`gh ${cmd}`, { 
        encoding: 'utf-8', 
        maxBuffer: 50 * 1024 * 1024,
      });
      return JSON.parse(out);
    } catch (err) {
      if ((err.message.includes('502') || err.message.includes('503') || err.message.includes('504')) && i < retries - 1) {
        console.error(`Error de GitHub - Reintento ${i + 1}/${retries}...`);
        const delay = RETRY_DELAY * Math.pow(2, i);
        const start = Date.now();
        while (Date.now() - start < delay) {
          // Espera activa
        }
        continue;
      }
      
      if (err.stdout) {
        try {
          return JSON.parse(err.stdout);
        } catch {}
      }
      
      if (i === retries - 1) {
        throw err;
      }
    }
  }
  return [];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function listarPRs() {
  return gh(`pr list --repo ${REPO} --state open --limit 100 --json number,title,isDraft,baseRefName,headRefName,headRefOid,mergeable,updatedAt,additions,deletions,changedFiles`);
}

async function obtenerCheckRuns(headSha) {
  try {
    return await gh(`api "repos/${REPO}/commits/${headSha}/check-runs?per_page=100"`);
  } catch (err) {
    return [];
  }
}

function clasificarChecks(runs) {
  const requeridos = [];
  const informativos = [];
  const proceso = [];
  const skipped = [];
  
  for (const run of runs) {
    const nombre = run.name;
    const conclusion = run.conclusion;
    const status = run.status;
    
    if (status === 'skipped') {
      skipped.push(nombre);
      continue;
    }
    
    if (CHECKS_INFORMATIVOS.has(nombre)) {
      informativos.push({ nombre, conclusion });
      continue;
    }
    
    if (CHECKS_PROCESO.has(nombre)) {
      proceso.push({ nombre, conclusion });
      continue;
    }
    
    requeridos.push({ nombre, conclusion, status });
  }
  
  return { requeridos, informativos, proceso, skipped };
}

function evaluarMergeabilidad(pr, runs) {
  const { requeridos, informativos, proceso, skipped } = clasificarChecks(runs);
  
  if (pr.baseRefName !== BASE) {
    return {
      veredicto: 'NO LISTO',
      razon: `base=${pr.baseRefName} (requerido: ${BASE})`,
      detalles: { base: pr.baseRefName, requeridos, informativos, proceso, skipped }
    };
  }
  
  if (pr.isDraft) {
    return {
      veredicto: 'NO LISTO',
      razon: 'PR es DRAFT',
      detalles: { requeridos, informativos, proceso, skipped }
    };
  }
  
  const requeridosFallidos = requeridos.filter(r => r.conclusion !== 'success');
  
  if (requeridosFallidos.length > 0) {
    const nombresFallidos = requeridosFallidos.map(r => r.nombre).join(', ');
    return {
      veredicto: 'NO LISTO',
      razon: `checks rojos: ${nombresFallidos}`,
      detalles: { requeridosFallidos, requeridos, informativos, proceso, skipped }
    };
  }
  
  const procesoFallidos = proceso.filter(p => p.conclusion !== 'success');
  if (procesoFallidos.length > 0) {
    return {
      veredicto: 'LISTO',
      razon: `CI verde (advertencia: proceso falla: ${procesoFallidos.map(p => p.nombre).join(', ')})`,
      detalles: { requeridos, informativos, proceso, skipped, procesoFallidos }
    };
  }
  
  return {
    veredicto: 'LISTO',
    razon: 'CI verde - todos los checks requeridos pasan',
    detalles: { requeridos, informativos, proceso, skipped }
  };
}

function esPRFantasma(pr) {
  if (!pr.changedFiles) return false;
  return pr.changedFiles >= 500;
}

function generarTabla(resultados) {
  let md = '| PR | Título | Veredicto | Razón | Archivos | Base | Draft |\n';
  md += '|---|---|---|---|---|---|---|\n';
  
  for (const r of resultados) {
    const pr = r.pr;
    const eval_ = r.eval;
    const fantasma = esPRFantasma(pr) ? ' ⚠️ FANTASMA' : '';
    md += `| **#${pr.number}** | ${pr.title.substring(0, 60)}${fantasma ? '...' : ''} | **${eval_.veredicto}** | ${eval_.razon.substring(0, 50)}... | ${pr.changedFiles || '?'} | ${pr.baseRefName} | ${pr.isDraft ? 'SÍ' : 'No'} |\n`;
  }
  
  return md;
}

function generarControles(resultados) {
  let md = '\n## Controles obligatorios\n\n';
  
  const positivo = resultados.find(r => r.eval.veredicto === 'LISTO' && !r.eval.detalles.procesoFallidos);
  
  if (positivo) {
    md += '### 3.1 Control POSITIVO ✓\n\n';
    md += `PR **#${positivo.pr.number}** "${positivo.pr.title}"\n\n`;
    md += '```\n';
    const requeridos = positivo.eval.detalles.requeridos;
    if (requeridos.length === 0) {
      md += '(sin checks requeridos - solo proceso o informativos)\n';
    } else {
      for (const r of requeridos) {
        md += `${r.nombre}\t${r.conclusion}\n`;
      }
    }
    md += '```\n\n';
  } else {
    md += '### 3.1 Control POSITIVO ✗\n\n';
    md += 'No se encontró ningún PR LISTO con CI completamente verde.\n\n';
  }
  
  const negativo = resultados.find(r => r.eval.veredicto === 'NO LISTO' && r.eval.razon.includes('checks rojos'));
  
  if (negativo) {
    md += '### 3.2 Control NEGATIVO ✓\n\n';
    md += `PR **#${negativo.pr.number}** "${negativo.pr.title}"\n\n`;
    md += '```\n';
    const fallidos = negativo.eval.detalles.requeridosFallidos || negativo.eval.detalles.requeridos.filter(r => r.conclusion !== 'success');
    if (fallidos.length === 0) {
      md += '(sin checks fallidos detectados)\n';
    } else {
      for (const f of fallidos) {
        md += `${f.nombre}\t${f.conclusion}\n`;
      }
    }
    md += '```\n\n';
  } else {
    md += '### 3.2 Control NEGATIVO ✗\n\n';
    md += 'No se encontró ningún PR con checks rojos.\n\n';
  }
  
  return md;
}

function generarNoVerificados(resultados) {
  let md = '\n## NO PUDE VERIFICAR\n\n';
  
  const sinChecks = resultados.filter(r => 
    r.eval.detalles.requeridos.length === 0 && 
    r.eval.detalles.informativos.length === 0 && 
    r.eval.detalles.proceso.length === 0
  );
  
  if (sinChecks.length > 0) {
    md += 'Los siguientes PRs no tienen check-runs disponibles (solo CLA o sin CI):\n\n';
    for (const r of sinChecks) {
      md += `- **#${r.pr.number}**: ${r.pr.title}\n`;
    }
    md += '\n';
  }
  
  const fantasmas = resultados.filter(r => esPRFantasma(r.pr));
  if (fantasmas.length > 0) {
    md += `**${fantasmas.length} PRs FANTASMA** (≥500 archivos por base desalineada):\n\n`;
    for (const r of fantasmas) {
      md += `- **#${r.pr.number}**: ${r.pr.title} (${r.pr.changedFiles} archivos, base=${r.pr.baseRefName})\n`;
    }
    md += '\n';
  }
  
  return md;
}

async function main() {
  console.error(`Veredicto de mergeabilidad para ${REPO} (base=${BASE})...`);
  
  let prs;
  try {
    prs = await listarPRs();
  } catch (err) {
    console.error(`Error listando PRs: ${err.message}`);
    const md = `# Informe de veredicto de mergeabilidad - ERROR

**Fecha:** ${new Date().toISOString()}
**Repositorio:** ${REPO}
**Base objetivo:** ${BASE}

## ERROR: No se pudo obtener datos de GitHub

${err.message}

El script incluye reintentos automáticos para errores 502/503/504. Ejecutar nuevamente cuando la API esté disponible.
`;
    console.log(md);
    const ruta = `Chagra-strategy/ops/INFORME-VEREDICTO-MERGEABILIDAD.md`;
    writeFileSync(ruta, md);
    console.error(`Informe parcial guardado en: ${ruta}`);
    return;
  }
  
  console.error(`Encontrados ${prs.length} PRs abiertos`);
  
  const resultados = [];
  
  for (const pr of prs) {
    console.error(`Evaluando #${pr.number}...`);
    const runs = await obtenerCheckRuns(pr.headRefOid);
    const eval_ = evaluarMergeabilidad(pr, runs);
    resultados.push({ pr, eval: eval_ });
    await sleep(100);
  }
  
  let md = `# Informe de veredicto de mergeabilidad\n\n`;
  md += `**Fecha:** ${new Date().toISOString()}\n`;
  md += `**Repositorio:** ${REPO}\n`;
  md += `**Base objetivo:** ${BASE}\n`;
  md += `**Total PRs evaluados:** ${resultados.length}\n\n`;
  
  const listos = resultados.filter(r => r.eval.veredicto === 'LISTO').length;
  const noListos = resultados.filter(r => r.eval.veredicto === 'NO LISTO').length;
  
  md += `## Resumen\n\n`;
  md += `- **LISTOS:** ${listos}\n`;
  md += `- **NO LISTOS:** ${noListos}\n\n`;
  
  md += generarTabla(resultados);
  md += generarControles(resultados);
  md += generarNoVerificados(resultados);
  
  md += `\n## Salida cruda de controles\n\n`;
  md += `\`\`\`json\n${JSON.stringify(resultados.map(r => ({
    pr: r.pr.number,
    veredicto: r.eval.veredicto,
    razon: r.eval.razon,
    checks: {
      requeridos: r.eval.detalles.requeridos.length,
      informativos: r.eval.detalles.informativos.length,
      proceso: r.eval.detalles.proceso.length,
      skipped: r.eval.detalles.skipped.length
    }
  })), null, 2)}\n\`\`\`\n`;
  
  console.log(md);
  
  const ruta = `Chagra-strategy/ops/INFORME-VEREDICTO-MERGEABILIDAD.md`;
  writeFileSync(ruta, md);
  console.error(`\nInforme guardado en: ${ruta}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
