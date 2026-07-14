#!/usr/bin/env node
/**
 * bench-rutas.mjs — Prueba de carga simple para prod.chagra.app.
 *
 * Mide tiempo hasta interactivo para un conjunto de rutas.
 * Sin dependencias externas — solo fetch + timing.
 *
 * Uso: node scripts/bench-rutas.mjs [base_url]
 */
const BASE = process.argv[2] || 'http://127.0.0.1:4500';
const RUTAS = [
  '/',
  '/#valle3d',
  '/#agente',
  '/#directorio',
  '/#animales',
  '/#cafe',
  '/#cacao',
  '/#agua',
  '/#suelo',
  '/#perfil',
];

async function medirRuta(url) {
  const inicio = Date.now();
  try {
    const res = await fetch(url, { method: 'HEAD' });
    const tiempo = Date.now() - inicio;
    return { url, status: res.status, tiempo_ms: tiempo };
  } catch (e) {
    return { url, status: 0, tiempo_ms: Date.now() - inicio, error: e.message };
  }
}

console.log(`Bench de rutas — ${BASE}`);
console.log('='.repeat(50));

let total = 0;
let ok = 0;
for (const ruta of RUTAS) {
  const result = await medirRuta(BASE + ruta);
  const icon = result.status === 200 ? '✅' : '❌';
  console.log(`${icon} ${ruta.padEnd(25)} ${result.tiempo_ms}ms`);
  total++;
  if (result.status === 200) ok++;
}

console.log('='.repeat(50));
console.log(`Resultado: ${ok}/${total} OK (${(ok/total*100).toFixed(0)}%)`);
