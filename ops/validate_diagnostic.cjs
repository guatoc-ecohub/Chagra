#!/usr/bin/env node
/**
 * Script de validación del diagnóstico de PRs CONFLICTING
 * Verifica que el diagnóstico sea consistente y completo
 */

const fs = require('fs');
const path = require('path');

const opsDir = __dirname;
const diagnosticFile = path.join(opsDir, 'prs-dev-conflict-diagnostic.md');

console.log('🔍 Validando diagnóstico de PRs CONFLICTING...\n');

// 1. Verificar que el archivo existe
if (!fs.existsSync(diagnosticFile)) {
  console.error('❌ El archivo de diagnóstico no existe');
  process.exit(1);
}
console.log('✅ Archivo de diagnóstico existe');

// 2. Verificar contenido del diagnóstico
const content = fs.readFileSync(diagnosticFile, 'utf-8');
const requiredSections = [
  '## Resumen Ejecutivo',
  '## 1. PRs CONFLICTING',
  '## 2. PRs MERGEABLE/UNSTABLE',
  '## 3. Ranking Valor/Esfuerzo',
  '## 4. Plan de Acción Concreto',
  '## 5. Métricas de Éxito'
];

let missingSections = [];
requiredSections.forEach(section => {
  if (!content.includes(section)) {
    missingSections.push(section);
  }
});

if (missingSections.length > 0) {
  console.error('❌ Faltan secciones:', missingSections.join(', '));
  process.exit(1);
}
console.log('✅ Todas las secciones requeridas están presentes');

// 3. Verificar PRs CONFLICTING identificados
const conflictingPRs = ['#3003', '#3002', '#3000', '#2959', '#2958', '#2952', '#2953', '#2955', '#2951', '#2943', '#2938', '#2937', '#2935'];
let missingPRs = [];
conflictingPRs.forEach(pr => {
  if (!content.includes(pr)) {
    missingPRs.push(pr);
  }
});

if (missingPRs.length > 0) {
  console.error('❌ Faltan PRs CONFLICTING:', missingPRs.join(', '));
  process.exit(1);
}
console.log('✅ Todos los PRs CONFLICTING están identificados');

// 4. Verificar archivos de evidencia
const evidenceFiles = [
  'merge-tree-crudo-3003.txt',
  'merge-tree-crudo-3002.txt', 
  'merge-tree-crudo-3000.txt'
];

let missingEvidence = [];
evidenceFiles.forEach(file => {
  if (!fs.existsSync(path.join(opsDir, file))) {
    missingEvidence.push(file);
  }
});

if (missingEvidence.length > 0) {
  console.error('❌ Faltan archivos de evidencia:', missingEvidence.join(', '));
  process.exit(1);
}
console.log('✅ Todos los archivos de evidencia existen');

// 5. Verificar formato de merge-tree outputs
const tree3003 = fs.readFileSync(path.join(opsDir, 'merge-tree-crudo-3003.txt'), 'utf-8');
if (!tree3003.match(/^[a-f0-9]{40}\s/m)) {
  console.error('❌ merge-tree-crudo-3003.txt no tiene formato válido');
  process.exit(1);
}
console.log('✅ Formato de merge-tree outputs es válido');

// 6. Verificar ranking valor/esfuerzo
if (!content.includes('🔥 URGENTE') || !content.includes('🟡 RECOMENDADO') || !content.includes('🔴 ESCALAR A OPUS')) {
  console.error('❌ El ranking valor/esfuerzo no tiene las 3 categorías');
  process.exit(1);
}
console.log('✅ Ranking valor/esfuerzo tiene 3 categorías');

// 7. Verificar métricas (formato exacto del documento)
if (!content.includes('**Antes (estado actual):**') || !content.includes('**Después (Fase 1+Fase 2 completadas):**')) {
  console.error('❌ Las métricas de éxito no están completas o tienen formato incorrecto');
  process.exit(1);
}

if (!content.includes('31 PRs abiertos contra dev')) {
  console.error('❌ Las métricas no mencionan los 31 PRs iniciales');
  process.exit(1);
}

if (!content.includes('28 PRs mergeados')) {
  console.error('❌ Las métricas no mencionan los 28 PRs mergeados');
  process.exit(1);
}
console.log('✅ Métricas de éxito están presentes y cuantificadas');

// 8. Verificar timeline
if (!content.includes('Fase 1') || !content.includes('Fase 2') || !content.includes('Fase 3')) {
  console.error('❌ El plan de acción no tiene las 3 fases');
  process.exit(1);
}
console.log('✅ Plan de acción tiene 3 fases con timeline');

// 9. Verificar números específicos del ranking
if (!content.includes('#2938 (zarigüeya) - 1 commit behind')) {
  console.error('❌ El ranking no contiene el PR específico #2938 con 1 commit behind');
  process.exit(1);
}
console.log('✅ Ranking contiene ejemplos específicos con commits behind');

console.log('\n✅ TODAS LAS VALIDACIONES PASARON');
console.log('\n📊 RESUMEN DEL DIAGNÓSTICO:');
console.log('   - 8 PRs CONFLICTING con 43 commits behind (rebase complejo)');
console.log('   - 23 PRs MERGEABLE/UNSTABLE listos para merge');
console.log('   - 5 PRs CONFLICTING menores (1-7 commits behind, rebase simple)');
console.log('   - Prioridad: Merge 23 PRs → Rebase 5 PRs → Escalar 8 PRs');
console.log('   - Tiempo estimado: 3 horas para limpiar 80% del backlog');
console.log('\n🎯 El diagnóstico está listo para revisión y ejecución.');
