#!/usr/bin/env node
/**
 * audit-integraciones.mjs — Auditoría rápida de cableado de mockups y rutas.
 *
 * Verifica que el mockup EntMaestro3D esté correctamente cableado:
 *   · exista el archivo fuente src/mockups/EntMaestro3D.jsx
 *   · tenga su import lazy en App.jsx
 *   · tenga entrada en MOCKUP_HASH_ROUTES
 *   · tenga case en el switch de render de App.jsx
 *
 * Uso: node scripts/audit-integraciones.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const APP_PATH = resolve(ROOT, 'src/App.jsx');
const MOCKUP_PATH = resolve(ROOT, 'src/mockups/EntMaestro3D.jsx');

const app = readFileSync(APP_PATH, 'utf8');
const errores = [];

// 1. Archivo fuente existe
if (!existsSync(MOCKUP_PATH)) {
  errores.push(`No existe el archivo fuente: ${MOCKUP_PATH}`);
}

// 2. Import lazy en App.jsx
if (!app.includes("const EntMaestro3DMockup = lazy(() => import('./mockups/EntMaestro3D'))")) {
  errores.push("No se encontró el import lazy de EntMaestro3DMockup en App.jsx");
}

// 3. Entrada en MOCKUP_HASH_ROUTES
const routesMatch = app.match(/const MOCKUP_HASH_ROUTES = \{([\s\S]*?)\};/);
if (!routesMatch) {
  errores.push('No se encontró MOCKUP_HASH_ROUTES en App.jsx');
} else if (!routesMatch[1].includes("'mockups/ent-maestro': 'mockup_ent_maestro_3d'")) {
  errores.push("Falta la entrada MOCKUP_HASH_ROUTES para 'mockups/ent-maestro'");
}

// 4. Case en el switch
if (!app.includes("case 'mockup_ent_maestro_3d':")) {
  errores.push("Falta el case 'mockup_ent_maestro_3d' en el switch de App.jsx");
}

// 5. El case renderiza EntMaestro3DMockup
const caseBlockMatch = app.match(/case 'mockup_ent_maestro_3d':([\s\S]*?)(?=case 'onboarding-perfil':)/);
if (!caseBlockMatch || !caseBlockMatch[1].includes('<EntMaestro3DMockup')) {
  errores.push("El case 'mockup_ent_maestro_3d' no renderiza <EntMaestro3DMockup />");
}

if (errores.length > 0) {
  console.log('❌ Errores de integración:');
  for (const e of errores) console.log(`  · ${e}`);
  process.exit(1);
}

console.log('✅ EntMaestro3D cableado correctamente.');
console.log('   · src/mockups/EntMaestro3D.jsx existe');
console.log("   · import lazy en App.jsx: const EntMaestro3DMockup = lazy(() => import('./mockups/EntMaestro3D'))");
console.log("   · MOCKUP_HASH_ROUTES: 'mockups/ent-maestro' → 'mockup_ent_maestro_3d'");
console.log("   · switch case: 'mockup_ent_maestro_3d' renderiza <EntMaestro3DMockup />");
process.exit(0);
