#!/usr/bin/env node
/**
 * bench-prueba-tomate.mjs — "Prueba del tomate": el CANDADO de la auditoría 2026-06-17.
 *
 * READ-ONLY contra Apache AGE (chagra_kg, capa Co). Para los cultivos que tienen plaga
 * ligada, verifica que el grafo pueda responder la consulta basica del campesino:
 *   cultivo -SUSCEPTIBLE_TO-> plaga  Y  esa plaga <-CONTROLS|TREATS- (control biologico
 *   o biopreparado).  Es decir, la cadena agronomica completa esta conectada.
 *
 * CANDADO: el script SALE con codigo !=0 si un cultivo CANONICO BASICO (tomate, papa,
 * cafe, frijol, maiz, platano) NO pasa la cadena → "el caso tomate no se le pasa a nadie".
 * Emite registro de historial estandar (bench/history) para tendencia. NO escribe en el grafo.
 *
 * Origen: auditoria del grafo 2026-06-17 + ingesta DR cross-AI (semantica AFFECTS/CONTROLS/TREATS).
 * @module scripts/bench-prueba-tomate
 */
import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDbCmd } from './lib/db-cmd.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const HISTORY_DIR = join(REPO_ROOT, 'bench', 'history');

// Cultivos canonicos basicos: si uno falla, el bench falla (candado).
const BASICOS = [
  'solanum_lycopersicum', 'solanum_tuberosum', 'coffea_arabica',
  'phaseolus_vulgaris', 'zea_mays', 'musa_paradisiaca',
];

function ageQuery(cypher, ncols) {
  const cols = Array.from({ length: ncols }, (_, i) => `c${i} agtype`).join(', ');
  const sql = `LOAD 'age'; SET search_path=ag_catalog,public; SELECT * FROM cypher('chagra_kg', $$ ${cypher} $$) as (${cols});`;
  const dbCmd = getDbCmd();
  const r = spawnSync(
    dbCmd.file,
    [...dbCmd.args, '-tAF', '\t', '-c', sql],
    { encoding: 'utf8', maxBuffer: 96 * 1024 * 1024 },
  );
  if (r.status !== 0) throw new Error('AGE no accesible: ' + String(r.stderr || r.error || '').slice(0, 200));
  return r.stdout
    .trim()
    .split('\n')
    .filter((l) => l && !/^(LOAD|SET)$/.test(l))
    .map((line) => line.split('\t').map((x) => x.replace(/^"|"$/g, '')));
}

function gitCommit() {
  const r = spawnSync('git', ['-C', REPO_ROOT, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : 'unknown';
}
const pct = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

function main() {
  // Snapshot de la capa agronomica (semantica correcta, NO TARGETS_PEST).
  const susc = ageQuery('MATCH (s:Species)-[:SUSCEPTIBLE_TO]->(p:Pest) RETURN s.id, p.id', 2); // [species, pest]
  const ctrl = ageQuery('MATCH (x)-[:CONTROLS]->(p:Pest) RETURN p.id', 1).map((r) => r[0]);
  const treat = ageQuery('MATCH (x)-[:TREATS]->(p:Pest) RETURN p.id', 1).map((r) => r[0]);

  const manejada = new Set([...ctrl, ...treat]); // plagas con controlador o biopreparado
  // cultivo -> set de plagas
  const porCultivo = new Map();
  for (const [sid, pid] of susc) {
    if (!porCultivo.has(sid)) porCultivo.set(sid, new Set());
    porCultivo.get(sid).add(pid);
  }

  // pasa = el cultivo tiene >=1 plaga ligada Y >=1 de esas plagas tiene manejo (control/biopreparado)
  const pasa = (sid) => {
    const plagas = porCultivo.get(sid);
    if (!plagas || plagas.size === 0) return false;
    for (const p of plagas) if (manejada.has(p)) return true;
    return false;
  };

  const cultivosConPlaga = [...porCultivo.keys()];
  const cultivosPass = cultivosConPlaga.filter(pasa);
  const basicosPass = BASICOS.filter(pasa);
  const basicosFail = BASICOS.filter((b) => !pasa(b));

  const metrics = {
    prueba_tomate_pct: pct(cultivosPass.length, cultivosConPlaga.length),
    basicos_pass: basicosPass.length,
    basicos_total: BASICOS.length,
    cultivos_con_plaga: cultivosConPlaga.length,
    cultivos_cadena_completa: cultivosPass.length,
    plagas_con_manejo: manejada.size,
    relaciones_susceptible_to: susc.length,
  };

  if (!existsSync(HISTORY_DIR)) mkdirSync(HISTORY_DIR, { recursive: true });
  const date = new Date().toISOString();
  const record = {
    schema: 1,
    bench: 'prueba-tomate',
    date,
    model: null,
    config: 'age-chagra_kg/co',
    commit: gitCommit(),
    metrics,
    passCount: basicosPass.length,
    failCount: basicosFail.length,
    passPct: metrics.prueba_tomate_pct,
    notes: `basicos que fallan: ${basicosFail.join(', ') || 'ninguno'}`,
    seed: false,
  };
  writeFileSync(join(HISTORY_DIR, `prueba-tomate__co-chagra_kg__${date.replace(/[:.]/g, '-')}.json`), JSON.stringify(record, null, 2) + '\n', 'utf8');

  console.log('=== PRUEBA DEL TOMATE (cadena cultivo->plaga->control/biopreparado) ===');
  console.log('metricas:', metrics);
  console.log('basicos que PASAN:', basicosPass.join(', ') || '(ninguno)');
  if (basicosFail.length) {
    console.error('CANDADO ROTO — cultivos basicos sin cadena agronomica:', basicosFail.join(', '));
    return 1; // falla la CI: un caso basico no se puede responder
  }
  console.log('OK: los 6 cultivos basicos responden la consulta basica.');
  return 0;
}

try {
  process.exit(main());
} catch (e) {
  console.error('[prueba-tomate] ' + e.message);
  process.exit(2);
}
