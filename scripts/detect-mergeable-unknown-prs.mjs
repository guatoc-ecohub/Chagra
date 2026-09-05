#!/usr/bin/env node
/**
 * detect-mergeable-unknown-prs.mjs
 * 
 * Detecta y analiza PRs con estado mergeable UNKNOWN.
 * Este estado es temporal y fluctúa mientras GitHub recalcula la mergeabilidad.
 * 
 * Causas comunes de UNKNOWN:
 * 1. GitHub está recalculando la mergeabilidad (espera unos minutos)
 * 2. El PR tiene checks pendientes que afectan la mergeabilidad
 * 3. Conflictos temporales durante el cálculo de merge base
 * 
 * Uso: node scripts/detect-mergeable-unknown-prs.mjs [--detailed]
 */

import { execSync } from 'child_process';

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
    const output = execSync(`gh pr checks ${prNumber} --json name,state,conclusion`, { 
      encoding: 'utf-8' 
    });
    return JSON.parse(output);
  } catch (error) {
    return [];
  }
}

function analyzeUnknownPrs(detailed = false) {
  const prs = getPrs();
  console.log(`🔍 Analizando ${prs.length} PRs en busca de estados UNKNOWN...\n`);
  
  const unknownPrs = prs.filter(pr => pr.mergeable === 'UNKNOWN');
  
  if (unknownPrs.length === 0) {
    console.log('✅ No se encontraron PRs con estado UNKNOWN en este momento.\n');
    
    // Mostrar estadísticas generales
    const mergeable = prs.filter(pr => pr.mergeable === 'MERGEABLE').length;
    const conflicting = prs.filter(pr => pr.mergeable === 'CONFLICTING').length;
    
    console.log('📊 Distribución actual de estados:');
    console.log(`   MERGEABLE: ${mergeable} PRs`);
    console.log(`   CONFLICTING: ${conflicting} PRs`);
    console.log(`   UNKNOWN: ${unknownPrs.length} PRs`);
    console.log(`   Total: ${prs.length} PRs\n`);
    
    console.log('💡 Información sobre estado UNKNOWN:');
    console.log('   - GitHub reporta UNKNOWN temporalmente mientras recalcula mergeabilidad');
    console.log('   - Los estados fluctúan: UNKNOWN → MERGEABLE/CONFLICTING');
    console.log('   - Generalmente se resuelve solo después de unos minutos');
    console.log('   - Si persiste, puede indicar problemas con checks o conflictos complejos\n');
    
    return unknownPrs;
  }
  
  console.log(`🎯 Se encontraron ${unknownPrs.length} PRs con estado UNKNOWN:\n`);
  
  unknownPrs.forEach(pr => {
    console.log(`❓ PR #${pr.number}: ${pr.title}`);
    console.log(`   Branch: ${pr.headRefName} → ${pr.baseRefName}`);
    console.log(`   Estado: ${pr.state}, Mergeable: ${pr.mergeable}`);
    
    if (detailed) {
      const checks = getPrChecks(pr.number);
      const pending = checks.filter(c => c.state === 'PENDING');
      const failed = checks.filter(c => c.state === 'FAILURE');
      const passed = checks.filter(c => c.state === 'COMPLETED' && c.conclusion === 'SUCCESS');
      
      console.log(`   📋 Checks: ${passed.length} passed, ${failed.length} failed, ${pending.length} pending`);
      
      if (pending.length > 0) {
        console.log(`   ⏳ Checks pendientes:`);
        pending.forEach(check => {
          console.log(`      - ${check.name}`);
        });
      }
      
      if (failed.length > 0) {
        console.log(`   ❌ Checks fallados:`);
        failed.forEach(check => {
          console.log(`      - ${check.name}`);
        });
      }
    }
    
    console.log('');
  });
  
  console.log('🔍 Análisis de posibles causas:');
  console.log('   Estos PRs pueden estar en UNKNOWN por:');
  console.log('   1. Recálculo de mergeabilidad por GitHub (común)');
  console.log('   2. Checks pendientes que bloquean la decisión');
  console.log('   3. Conflictos en el cálculo de merge base');
  console.log('   4. Cambios recientes en la rama base\n');
  
  console.log('💡 Recomendaciones:');
  console.log('   - Esperar unos minutos y volver a verificar');
  console.log('   - Revisar si hay checks CI que estén fallando');
  console.log('   - Verificar si la rama base ha tenido cambios recientes');
  console.log('   - Si es un problema trivial (lint/formato), se puede arreglar fácilmente\n');
  
  return unknownPrs;
}

function main() {
  const args = process.argv.slice(2);
  const detailed = args.includes('--detailed') || args.includes('-d');
  
  console.log('🔍 Detector de PRs con estado Mergeable UNKNOWN\n');
  console.log('   Estado UNKNOWN = GitHub está recalculando la mergeabilidad');
  console.log('   Este análisis ayuda a identificar PRs que necesitan atención\n');
  
  const unknownPrs = analyzeUnknownPrs(detailed);
  
  // Exit code: 0 si no hay UNKNOWN, 1 si hay UNKNOWN que requieren atención
  process.exit(unknownPrs.length === 0 ? 0 : 1);
}

main();
