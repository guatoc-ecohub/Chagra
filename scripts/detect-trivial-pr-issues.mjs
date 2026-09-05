#!/usr/bin/env node
/**
 * detect-trivial-pr-issues.mjs
 * 
 * Detecta PRs con problemas triviales de lint/formato que pueden arreglarse automáticamente.
 * 
 * Uso: node scripts/detect-trivial-pr-issues.mjs
 */

import { execSync } from 'child_process';
import fs from 'fs';

function getPrs() {
  try {
    const output = execSync('gh pr list --limit 100 --json number,title,mergeable,state,headRefName,baseRefName', { 
      encoding: 'utf-8' 
    });
    return JSON.parse(output);
  } catch (error) {
    console.error('Error al obtener PRs:', error.message);
    return [];
  }
}

function getPrChecks(prNumber) {
  try {
    const output = execSync(`gh pr checks ${prNumber} --json name,state`, { 
      encoding: 'utf-8' 
    });
    return JSON.parse(output);
  } catch (error) {
    return [];
  }
}

function detectTrivialIssues() {
  const prs = getPrs();
  console.log(`Analizando ${prs.length} PRs...\n`);
  
  const candidates = [];
  
  for (const pr of prs) {
    if (pr.mergeable !== 'MERGEABLE') continue;
    
    const checks = getPrChecks(pr.number);
    const failedChecks = checks.filter(c => c.state === 'FAILURE');
    
    // Buscar checks que sugieran problemas triviales
    const trivialIndicators = [
      'eslint',
      'lint', 
      'format',
      'prettier',
      'stylelint'
    ];
    
    const hasTrivialFailure = failedChecks.some(check => 
      trivialIndicators.some(indicator => 
        check.name.toLowerCase().includes(indicator)
      )
    );
    
    if (hasTrivialFailure) {
      candidates.push({
        number: pr.number,
        title: pr.title,
        branch: pr.headRefName,
        base: pr.baseRefName,
        failedChecks: failedChecks.map(c => c.name)
      });
    }
  }
  
  return candidates;
}

function main() {
  console.log('🔍 Buscando PRs con posibles problemas triviales de lint/formato...\n');
  
  const candidates = detectTrivialIssues();
  
  if (candidates.length === 0) {
    console.log('✅ No se encontraron PRs con problemas triviales de lint/formato.');
    console.log('\n📊 Resumen de checks fallidos en PRs MERGEABLE:');
    
    // Mostrar estadísticas generales
    const prs = getPrs();
    let totalPrs = 0;
    let totalFailed = 0;
    
    for (const pr of prs) {
      if (pr.mergeable !== 'MERGEABLE') continue;
      totalPrs++;
      
      const checks = getPrChecks(pr.number);
      const failedChecks = checks.filter(c => c.state === 'FAILURE');
      if (failedChecks.length > 0) {
        totalFailed++;
      }
    }
    
    console.log(`  - Total PRs MERGEABLE analizados: ${totalPrs}`);
    console.log(`  - PRs con checks fallidos: ${totalFailed}`);
    
    return;
  }
  
  console.log(`🎯 Se encontraron ${candidates.length} PRs con posibles problemas triviales:\n`);
  
  candidates.forEach(candidate => {
    console.log(`PR #${candidate.number}: ${candidate.title}`);
    console.log(`  Branch: ${candidate.branch} → ${candidate.base}`);
    console.log(`  Checks fallados: ${candidate.failedChecks.join(', ')}`);
    console.log('');
  });
  
  console.log('💡 Sugerencia: Revisar estos PRs manualmente para confirmar que los problemas son triviales.');
}

main();
