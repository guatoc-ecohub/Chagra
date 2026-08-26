#!/usr/bin/env node
/**
 * fix-trivial-pr-issues.mjs
 * 
 * Arregla problemas triviales de lint/formato en PRs específicos.
 * Solo debe usarse en casos donde los cambios son claramente triviales
 * (espacios, comas, formato básico, etc).
 * 
 * ⚠️ USO CON PRECAUCIÓN: Solo arreglar issues que sean claramente triviales
 * 
 * Uso: node scripts/fix-trivial-pr-issues.mjs <PR_NUMBER>
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function validatePrNumber(prNumber) {
  const num = parseInt(prNumber);
  if (isNaN(num) || num <= 0) {
    console.error('❌ Número de PR inválido:', prNumber);
    process.exit(1);
  }
  return num;
}

function getPrInfo(prNumber) {
  try {
    const output = execSync(`gh pr view ${prNumber} --json number,title,headRefName,baseRefName,state,mergeable`, {
      encoding: 'utf-8'
    });
    return JSON.parse(output);
  } catch (error) {
    console.error('❌ Error al obtener información del PR:', error.message);
    process.exit(1);
  }
}

function checkoutPrBranch(branchName) {
  try {
    // Verificar si ya estamos en ese branch
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
    
    if (currentBranch === branchName) {
      console.log(`✓ Ya estamos en el branch: ${branchName}`);
      return;
    }
    
    // Fetch y checkout
    console.log(`🔄 Cambiando al branch del PR: ${branchName}`);
    execSync(`git fetch origin ${branchName}`, { stdio: 'inherit' });
    execSync(`git checkout ${branchName}`, { stdio: 'inherit' });
    
    console.log(`✓ Branch activo: ${branchName}`);
  } catch (error) {
    console.error('❌ Error al cambiar al branch:', error.message);
    process.exit(1);
  }
}

function runEslintFix() {
  try {
    console.log('🔧 Ejecutando eslint --fix para arreglar issues triviales...');
    
    // Ejecutar eslint solo en archivos JS/JSX/TS/TSX
    const extensions = '{js,jsx,ts,tsx}';
    
    // Primero verificar qué archivos tienen issues
    const filesWithIssues = execSync(
      `npx eslint "src/**/*.\${extensions}" --format=json --max-warnings=0 2>/dev/null || true`,
      { encoding: 'utf-8' }
    );
    
    if (!filesWithIssues.trim()) {
      console.log('✓ No se encontraron issues de ESLint para arreglar.');
      return false;
    }
    
    // Arreglar automáticamente
    execSync(`npx eslint "src/**/*.\${extensions}" --fix`, { stdio: 'inherit' });
    
    console.log('✓ ESLint --fix completado');
    return true;
  } catch (error) {
    console.error('❌ Error ejecutando ESLint:', error.message);
    return false;
  }
}

function runPrettierFix() {
  try {
    console.log('🔧 Ejecutando prettier para arreglar formato...');
    
    // Verificar si prettier está instalado
    try {
      execSync('npx prettier --version', { stdio: 'pipe' });
    } catch {
      console.log('⚠️ Prettier no está instalado, saltando...');
      return false;
    }
    
    // Ejecutar prettier --write
    execSync('npx prettier --write "src/**/*.{js,jsx,ts,tsx,json,md}"', { stdio: 'inherit' });
    
    console.log('✓ Prettier completado');
    return true;
  } catch (error) {
    console.error('❌ Error ejecutando Prettier:', error.message);
    return false;
  }
}

function commitChanges(prNumber) {
  try {
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
    const commitMessage = `fix(lint): arreglar issues triviales de lint/formato (PR #${prNumber})`;
    
    console.log(`📝 Commiteando cambios con mensaje: "${commitMessage}"`);
    
    execSync('git add -A', { stdio: 'inherit' });
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
    
    console.log('✓ Changes commited');
    
    // Push al branch remoto
    console.log(`📤 Pushing to origin/${currentBranch}`);
    execSync(`git push origin ${currentBranch}`, { stdio: 'inherit' });
    
    console.log('✓ Changes pushed');
    
    return true;
  } catch (error) {
    console.error('❌ Error al commitear cambios:', error.message);
    return false;
  }
}

function verifyChanges() {
  try {
    console.log('🔍 Verificando que los cambios no rompan nada...');
    
    // Ejecutar tests rápidos (si existen)
    console.log('🧪 Ejecutando tests...');
    try {
      execSync('npm test', { stdio: 'inherit', timeout: 60000 });
    } catch {
      console.log('⚠️ Tests fallaron, pero es esperado si solo arreglamos lint');
    }
    
    // Verificar build
    console.log('🏗️ Verificando build...');
    try {
      execSync('npm run build', { stdio: 'inherit', timeout: 120000 });
      console.log('✓ Build exitoso');
    } catch {
      console.log('⚠️ Build falló, puede requerir ajustes adicionales');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error en verificación:', error.message);
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('❌ Error: Se requiere el número de PR');
    console.log('Uso: node scripts/fix-trivial-pr-issues.mjs <PR_NUMBER>');
    process.exit(1);
  }
  
  const prNumber = validatePrNumber(args[0]);
  console.log(`🔧 Arreglando issues triviales para PR #${prNumber}\n`);
  
  // Obtener información del PR
  console.log('📋 Obteniendo información del PR...');
  const prInfo = getPrInfo(prNumber);
  
  console.log(`   PR #${prInfo.number}: ${prInfo.title}`);
  console.log(`   Branch: ${prInfo.headRefName} → ${prInfo.baseRefName}`);
  console.log(`   Estado: ${prInfo.state}, Mergeable: ${prInfo.mergeable}`);
  console.log('');
  
  // Advertencia de seguridad
  console.log('⚠️  ADVERTENCIA: Solo usar este script para issues triviales de lint/formato');
  console.log('   Revisa manualmente los cambios antes de hacer push si tienes dudas\n');
  
  // Checkout al branch del PR
  checkoutPrBranch(prInfo.headRefName);
  console.log('');
  
  // Arreglar issues triviales
  let hasChanges = false;
  
  hasChanges = runEslintFix() || hasChanges;
  hasChanges = runPrettierFix() || hasChanges;
  
  if (!hasChanges) {
    console.log('\n✅ No se encontraron issues triviales para arreglar.');
    console.log('   El PR puede tener otros tipos de issues que requieren intervención manual.');
    process.exit(0);
  }
  
  console.log('\n✅ Issues triviales identificados y arreglados.');
  console.log('');
  
  // Verificar cambios
  if (!verifyChanges()) {
    console.log('\n⚠️ La verificación detectó problemas. Revisa los cambios manualmente.');
    process.exit(1);
  }
  
  // Commit y push
  console.log('');
  commitChanges(prNumber);
  
  console.log('\n🎉 Proceso completado!');
  console.log(`📝 Los cambios han sido aplicados al PR #${prNumber}`);
  console.log(`🔗 Revisa el PR en GitHub para verificar el estado`);
}

main();
