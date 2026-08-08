import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analizarArchivo, armarReporte } from './auditor.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dir, 'fixtures');

const ESPERADOS = {
  'arbol_viento.mjs': 'CON_MOVIMIENTO',
  'arbol_estatico.mjs': 'SIN_MOVIMIENTO',
  'solo_agua.mjs': 'SIN_ARBOLES',
  'arbol_estatico_con_agua.mjs': 'SIN_MOVIMIENTO',
  'arbol_shader_viento.mjs': 'CON_MOVIMIENTO',
  'arbol_camara_animada.mjs': 'SIN_MOVIMIENTO',
  'datos_arboles.mjs': 'NO_ES_RENDERER',
  'arbol_baker.mjs': 'BAKER',
};

let fallos = 0;

if (!existsSync(fixturesDir)) {
  console.error(`FAIL: no existe ${fixturesDir}`);
  process.exit(1);
}

for (const [nombre, esperado] of Object.entries(ESPERADOS)) {
  const ruta = join(fixturesDir, nombre);
  if (!existsSync(ruta)) {
    console.error(`FAIL: falta el fixture ${nombre}`);
    fallos++;
    continue;
  }
  let resultado;
  try {
    resultado = analizarArchivo(ruta);
  } catch (err) {
    console.error(`FAIL: ${nombre} lanzó excepción: ${err.message}`);
    fallos++;
    continue;
  }
  const ok = resultado.decision === esperado;
  if (ok) {
    console.log(`PASS: ${nombre} -> ${resultado.decision} (${resultado.confianza})`);
  } else {
    console.error(`FAIL: ${nombre} dio ${resultado.decision} (esperado ${esperado})`);
    console.error(`      confianza=${resultado.confianza}; explicación: ${resultado.explicacion}`);
    fallos++;
  }
}

const casoAgua = analizarArchivo(join(fixturesDir, 'solo_agua.mjs'));
if (casoAgua.decision !== 'SIN_ARBOLES') {
  console.error('FAIL: solo_agua.mjs no debe nunca clasificar como CON_MOVIMIENTO');
  fallos++;
}

const casoDatos = analizarArchivo(join(fixturesDir, 'datos_arboles.mjs'));
if (casoDatos.decision !== 'NO_ES_RENDERER') {
  console.error('FAIL: datos_arboles.mjs debe excluirse como NO_ES_RENDERER');
  fallos++;
}

const casoBaker = analizarArchivo(join(fixturesDir, 'arbol_baker.mjs'));
if (casoBaker.decision !== 'BAKER') {
  console.error('FAIL: arbol_baker.mjs debe clasificarse como BAKER');
  fallos++;
}

let jsonValido = true;
try {
  const reporte = armarReporte(fixturesDir);
  JSON.stringify(reporte);
  const n = reporte.resultados.length;
  const totalEsperado = Object.keys(ESPERADOS).length;
  if (n !== totalEsperado) {
    console.error(`FAIL: el reporte cubre ${n} archivos (esperado ${totalEsperado})`);
    fallos++;
  }
  if (reporte.resumen.renderers_con_arboles_quietos !== 3) {
    console.error(
      `FAIL: renderers_con_arboles_quietos=${reporte.resumen.renderers_con_arboles_quietos} (esperado 3)`
    );
    fallos++;
  }
  if (reporte.resumen.renderers_total !== 5) {
    console.error(`FAIL: renderers_total=${reporte.resumen.renderers_total} (esperado 5)`);
    fallos++;
  }
} catch (err) {
  jsonValido = false;
  console.error(`FAIL: armarReporte/JSON falló: ${err.message}`);
  fallos++;
}
if (jsonValido) console.log('PASS: armarReporte produce JSON serializable');

console.log(fallos === 0 ? '\nSELFCHECK OK (exit 0)' : `\nSELFCHECK CON ${fallos} FALLO(S)`);
process.exit(fallos === 0 ? 0 : 1);
