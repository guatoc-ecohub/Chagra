#!/usr/bin/env node
/**
 * scripts/snapshot-grafo-crecimiento.mjs
 *
 * PASO DE CIERRE del ciclo "crecimiento del grafo" para el timeline HYTA.
 *
 * Que hace
 * --------
 * 1. Consulta el grafo AGE VIVO (`chagra_kg`) por TCP y saca los conteos
 *    ACTUALES: total de Species, especies por piso termico (calido / templado /
 *    frio / paramo via GROWS_IN), nodos Biopreparado, dosis verificadas
 *    (Biopreparado.curado), Fermento, Pest, especies con clima extendido
 *    (agroclima_batch), y el total de aristas GROWS_IN y USED_AS_BIOPREPARADO.
 * 2. Refresca el bloque `totales_actuales` de
 *    `Chagra-strategy/ops/hyta-timeline/data-crecimiento.json` con esos numeros
 *    vivos, y APPENDEA un snapshot fechado al historico `snapshots[]`
 *    (idempotente por fecha: re-correr el mismo dia sobreescribe el snapshot de
 *    ese dia, no duplica).
 * 3. Re-embebe el JSON inline en los dos `.html`
 *    (`hyta-publico-pisos.html` = variante saneada OPSEC, `hyta-socios-explainer.html`
 *    = variante completa), igual que hace `gen-data.mjs --write`.
 *
 * Lo que NO hace (por contrato):
 *   - NO re-deriva la `serie` ni los `hitos` (eso sale del git log del catalogo y
 *     lo maneja `gen-data.mjs`). Este script preserva esos bloques tal cual.
 *   - NO corre `oracle-lab-update` ni despliega nada. Solo deja los archivos
 *     actualizados; el deploy lo hace el main thread.
 *   - NO usa `new Date()` en la logica determinista. La fecha del snapshot entra
 *     por `--date YYYY-MM-DD` o `SNAPSHOT_DATE`; el default a fecha de sistema
 *     vive SOLO en el wrapper CLI (`resolveDate`).
 *
 * Conexion a AGE (verificado INFRA_FACTS 2026-06-02)
 * --------------------------------------------------
 *   - `podman exec postgres-farm psql` esta ROTO (passwd del container).
 *   - La unica via funcional es TCP: `psql -h 127.0.0.1 -p 5432 -U farmos -d chagra_kg`.
 *   - En NixOS el host no trae `psql` en PATH -> se envuelve en `nix-shell -p postgresql`.
 *   Config por env (NADA de credenciales hardcodeadas — repo publico, SOP §2):
 *   PGPASSWORD (requerido), PGHOST, PGPORT, PGUSER, PGDATABASE, PSQL_WRAP.
 *
 * Uso
 * ---
 *   node scripts/snapshot-grafo-crecimiento.mjs            # snapshot HOY, escribe
 *   node scripts/snapshot-grafo-crecimiento.mjs --date 2026-06-03
 *   node scripts/snapshot-grafo-crecimiento.mjs --dry-run  # imprime, no escribe
 *   node scripts/snapshot-grafo-crecimiento.mjs --json-only # solo data-crecimiento.json
 *   SNAPSHOT_DATE=2026-06-03 node scripts/snapshot-grafo-crecimiento.mjs
 *
 * Correr SIEMPRE como paso de cierre tras cualquier ingesta aditiva a AGE
 * (catalog-to-age.mjs, batches de species/biopreparados/clima, etc.).
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// =============================================================================
// Rutas (absolutas: el timeline vive en el repo privado Chagra-strategy)
// =============================================================================

const HYTA_DIR =
  process.env.HYTA_TIMELINE_DIR ||
  join(homedir(), 'Workspace/Chagra-strategy/ops/hyta-timeline');
const JSON_PATH = join(HYTA_DIR, 'data-crecimiento.json');
const HTML_PUBLICO = join(HYTA_DIR, 'hyta-publico-pisos.html');
const HTML_SOCIOS = join(HYTA_DIR, 'hyta-socios-explainer.html');

const GRAPH = process.env.CHAGRA_KG_GRAPH || 'chagra_kg';

// =============================================================================
// Conexion AGE por TCP
// =============================================================================

/**
 * Construye el comando psql (TCP) envuelto en nix-shell cuando psql no esta en
 * PATH. Devuelve { file, args } para execFileSync — sin pasar por un shell, asi
 * el `$$` (dollar-quoting de Cypher) y `"$user"` no los toca ningun shell.
 *
 * El SQL entra por stdin (-f -), no por args, por la misma razon.
 */
export function buildPsqlInvocation(env = process.env) {
  const host = env.PGHOST || '127.0.0.1';
  const port = env.PGPORT || '5432';
  const user = env.PGUSER || 'farmos';
  const db = env.PGDATABASE || GRAPH;
  // -t (tuples only) -A (unaligned) -F'|' (separador) -f - (SQL por stdin)
  const psqlArgs = [
    '-h', host, '-p', port, '-U', user, '-d', db,
    '-t', '-A', '-F', '|', '-f', '-',
  ];
  // Permite forzar psql directo (PSQL_WRAP=none) si ya esta en PATH.
  if (env.PSQL_WRAP === 'none') {
    return { file: 'psql', args: psqlArgs };
  }
  // Default NixOS: nix-shell -p postgresql --run "psql ...". nix-shell no acepta
  // pasar argv directo al binario, asi que serializamos el comando en --run.
  // Los args de psql son fijos (no input externo) -> seguro de inlinear.
  const inner = ['psql', ...psqlArgs.map((a) => (a === '|' ? "'|'" : a))].join(' ');
  return { file: 'nix-shell', args: ['-p', 'postgresql', '--run', inner] };
}

/**
 * Corre un SQL contra el grafo y devuelve las lineas crudas (stdout).
 * El SQL siempre va por stdin para no exponer `$$` al shell.
 */
export function runSql(sql, env = process.env) {
  const { file, args } = buildPsqlInvocation(env);
  const childEnv = { ...env };
  // Sin credenciales hardcodeadas (repo publico, SOP §2). La password entra por
  // PGPASSWORD del entorno; el runbook/cron la exporta antes de invocar.
  if (!childEnv.PGPASSWORD) {
    throw new Error(
      'falta PGPASSWORD en el entorno. Exportala antes de correr el snapshot ' +
        '(p.ej. `PGPASSWORD=… node scripts/snapshot-grafo-crecimiento.mjs`).',
    );
  }
  const out = execFileSync(file, args, {
    input: sql,
    encoding: 'utf-8',
    maxBuffer: 64 * 1024 * 1024,
    env: childEnv,
  });
  return out;
}

const PREAMBLE = "LOAD 'age';\nSET search_path = ag_catalog, public;\n";

/** Cuenta filas de un MATCH ... RETURN. Devuelve un entero. */
function cypherCount(matchReturn, env) {
  const sql =
    PREAMBLE +
    `SELECT count(*) FROM cypher('${GRAPH}', $$ ${matchReturn} $$) AS (v agtype);\n`;
  const out = runSql(sql, env);
  // La unica linea numerica de la salida (ignora LOAD/SET/vacias).
  const line = out
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^\d+$/.test(l))
    .pop();
  if (line === undefined) {
    throw new Error(`cypherCount: sin resultado numerico para: ${matchReturn}\n--- salida ---\n${out}`);
  }
  return Number(line);
}

/**
 * Devuelve un mapa { pisoId: nEspeciesDistintas } via GROWS_IN.
 * Una especie puede estar en varios pisos -> la suma supera el total.
 */
function cypherPisos(env) {
  const sql =
    PREAMBLE +
    `SELECT piso, count(DISTINCT sid) FROM cypher('${GRAPH}', $$
       MATCH (s:Species)-[:GROWS_IN]->(p:PisoTermico)
       RETURN s.id AS sid, p.id AS piso
     $$) AS (sid agtype, piso agtype)
     GROUP BY piso ORDER BY piso;\n`;
  const out = runSql(sql, env);
  const pisos = {};
  for (const raw of out.split('\n')) {
    const line = raw.trim();
    const m = line.match(/^"?([a-z]+)"?\|(\d+)$/i);
    if (m) pisos[m[1]] = Number(m[2]);
  }
  return pisos;
}

// =============================================================================
// Snapshot del grafo vivo
// =============================================================================

const PISO_IDS = ['calido', 'templado', 'frio', 'paramo'];

/**
 * Consulta el grafo y devuelve los conteos vivos en la forma exacta que el
 * timeline (`totales_actuales` + `snapshots[]`) espera.
 *
 * Definiciones (anti-invento, alineadas con catalog-to-age.mjs y el bench):
 *   - especies            = nodos Species
 *   - pisos.<id>          = especies DISTINCT con GROWS_IN -> PisoTermico(id)
 *   - biopreparados       = nodos Biopreparado
 *   - dosis_verificadas   = Biopreparado con curado IS NOT NULL (= dosis_aplicacion
 *                           + fuente; mismo filtro que usa el pool del bench)
 *   - fermentos           = nodos Fermento
 *   - plagas              = nodos Pest
 *   - clima_extendido     = Species con agroclima_batch (= _agroclima_batch del catalogo)
 *   - conexiones          = aristas GROWS_IN (especie -> piso)
 *   - used_as_biopreparado= aristas USED_AS_BIOPREPARADO
 */
export function snapshotGrafo(env = process.env) {
  const pisosLive = cypherPisos(env);
  const pisos = {};
  for (const id of PISO_IDS) pisos[id] = pisosLive[id] || 0;

  return {
    especies: cypherCount('MATCH (s:Species) RETURN s', env),
    pisos,
    biopreparados: cypherCount('MATCH (b:Biopreparado) RETURN b', env),
    dosis_verificadas: cypherCount(
      'MATCH (b:Biopreparado) WHERE b.curado IS NOT NULL RETURN b',
      env,
    ),
    fermentos: cypherCount('MATCH (f:Fermento) RETURN f', env),
    plagas: cypherCount('MATCH (p:Pest) RETURN p', env),
    clima_extendido: cypherCount(
      'MATCH (s:Species) WHERE s.agroclima_batch IS NOT NULL RETURN s',
      env,
    ),
    conexiones: cypherCount('MATCH ()-[r:GROWS_IN]->() RETURN r', env),
    used_as_biopreparado: cypherCount(
      'MATCH ()-[r:USED_AS_BIOPREPARADO]->() RETURN r',
      env,
    ),
  };
}

// =============================================================================
// Merge en data-crecimiento.json (idempotente por fecha)
// =============================================================================

/**
 * Toma el JSON existente y los conteos vivos y devuelve el JSON nuevo.
 * - Refresca `totales_actuales` con los conteos vivos (preserva campos no
 *   derivables del grafo como `prs`, `horas`, `punto_partida_especies`).
 * - Appendea/actualiza el snapshot de `date` en `snapshots[]` (idempotente).
 * - Preserva serie, hitos, pisos, capas, crecimiento_nocturno y commits_catalogo.
 * - `_meta.generado` y `_meta.snapshot_grafo` se setean a `date`.
 *
 * Determinista: no llama a Date() ni lee el reloj. `date` entra por argumento.
 *
 * @param {object} prev      JSON actual (data-crecimiento.json parseado)
 * @param {object} live      salida de snapshotGrafo()
 * @param {string} date      'YYYY-MM-DD'
 */
export function mergeSnapshot(prev, live, date) {
  const next = JSON.parse(JSON.stringify(prev));

  // 1) totales_actuales: live counts encima, campos no-grafo preservados.
  const preservados = {
    prs: prev.totales_actuales?.prs,
    horas: prev.totales_actuales?.horas,
    punto_partida_especies: prev.totales_actuales?.punto_partida_especies,
  };
  next.totales_actuales = {
    especies: live.especies,
    pisos: { ...live.pisos },
    biopreparados: live.biopreparados,
    dosis_verificadas: live.dosis_verificadas,
    fermentos: live.fermentos,
    plagas: live.plagas,
    conexiones: live.conexiones,
    used_as_biopreparado: live.used_as_biopreparado,
    clima_extendido: live.clima_extendido,
  };
  for (const [k, v] of Object.entries(preservados)) {
    if (v !== undefined) next.totales_actuales[k] = v;
  }

  // 2) snapshots[]: historico de conteos vivos, idempotente por fecha.
  const snapEntry = {
    fecha: date,
    especies: live.especies,
    pisos: { ...live.pisos },
    biopreparados: live.biopreparados,
    dosis_verificadas: live.dosis_verificadas,
    fermentos: live.fermentos,
    plagas: live.plagas,
    conexiones: live.conexiones,
    used_as_biopreparado: live.used_as_biopreparado,
    clima_extendido: live.clima_extendido,
  };
  const snaps = Array.isArray(prev.snapshots) ? prev.snapshots.slice() : [];
  const idx = snaps.findIndex((s) => s.fecha === date);
  if (idx >= 0) snaps[idx] = snapEntry;
  else snaps.push(snapEntry);
  snaps.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  next.snapshots = snaps;

  // 3) _meta: sello de fecha del snapshot (no toca el resto de _meta).
  next._meta = {
    ...next._meta,
    generado: date,
    snapshot_grafo: date,
    fuente_totales:
      'Conteos VIVOS del grafo AGE chagra_kg leidos por TCP via scripts/snapshot-grafo-crecimiento.mjs (paso de cierre). totales_actuales y snapshots[] reflejan el grafo del dia del snapshot.',
  };

  return next;
}

// =============================================================================
// Variante PUBLICA (OPSEC) — espejo de gen-data.mjs::sanitizeForPublic
// =============================================================================

/**
 * Saneo OPSEC para la pagina publica: quita aristas internas, procedencia git
 * (commits/PRs) y la mencion de la tecnologia del grafo. Mantiene el mismo
 * contrato que gen-data.mjs para que ambos generadores produzcan paginas
 * publicas consistentes. Incluye los `snapshots[]` saneados (sin used_as_*).
 */
export function sanitizeForPublic(d) {
  const pub = JSON.parse(JSON.stringify(d));
  pub._meta = {
    titulo: 'Crecimiento del conocimiento agroecologico de Chagra',
    descripcion:
      'Serie temporal del crecimiento del conocimiento por piso termico. Conteos verificados.',
    nota_pisos: d._meta.nota_pisos,
    generado: d._meta.generado,
  };
  if (pub.totales_actuales) {
    delete pub.totales_actuales.used_as_biopreparado;
    delete pub.totales_actuales.prs;
    delete pub.totales_actuales.horas;
  }
  if (pub.crecimiento_nocturno) {
    pub.crecimiento_nocturno = {
      ...pub.crecimiento_nocturno,
      deltas: pub.crecimiento_nocturno.deltas.filter((x) => x.id !== 'used'),
    };
  }
  if (Array.isArray(pub.snapshots)) {
    pub.snapshots = pub.snapshots.map(({ used_as_biopreparado, ...rest }) => rest);
  }
  if (Array.isArray(pub.serie)) {
    pub.serie = pub.serie.map(({ commit, pr, ...rest }) => rest);
  }
  if (Array.isArray(pub.hitos)) {
    pub.hitos = pub.hitos.map((h) => ({
      ...h,
      detalle: h.detalle
        .replace(/\s*grafo AGE/gi, ' grafo de conocimiento')
        .replace(/\s*PR\s*#[\d\-#\s]+\.?/gi, '')
        .replace(/\s*\d+\s*PRs?,?\s*~?\s*\d+\s*horas?\.?/gi, '')
        .replace(/\s+\./g, '.')
        .trim(),
    }));
  }
  return pub;
}

// =============================================================================
// Re-embebido inline en los .html
// =============================================================================

/**
 * Reemplaza el contenido del bloque <script id="chagra-data"> de `html` por
 * `data` (string JSON). Devuelve el html nuevo, o null si no encuentra el bloque.
 */
export function embedData(html, data) {
  const re = /(<script id="chagra-data" type="application\/json">)([\s\S]*?)(<\/script>)/;
  if (!re.test(html)) return null;
  return html.replace(re, `$1\n${data}\n$3`);
}

// =============================================================================
// CLI
// =============================================================================

/** Resuelve la fecha del snapshot. Unico punto donde se permite el reloj. */
export function resolveDate(argv = process.argv.slice(2), env = process.env) {
  const flagIdx = argv.indexOf('--date');
  if (flagIdx >= 0 && argv[flagIdx + 1]) return argv[flagIdx + 1];
  if (env.SNAPSHOT_DATE) return env.SNAPSHOT_DATE;
  return new Date().toISOString().slice(0, 10); // default solo en el wrapper CLI
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const dryRun = argv.includes('--dry-run');
  const jsonOnly = argv.includes('--json-only');
  const date = resolveDate(argv, env);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`fecha invalida (esperado YYYY-MM-DD): ${date}`);
  }
  console.error(`[snapshot] leyendo grafo vivo ${GRAPH} por TCP…`);
  const live = snapshotGrafo(env);

  // Reporte legible de los conteos vivos.
  console.error(`[snapshot] fecha=${date} conteos vivos:`);
  console.error(`  especies            ${live.especies}`);
  console.error(
    `  pisos               calido ${live.pisos.calido} · templado ${live.pisos.templado} · frio ${live.pisos.frio} · paramo ${live.pisos.paramo}` +
      ` (suma ${PISO_IDS.reduce((a, id) => a + (live.pisos[id] || 0), 0)})`,
  );
  console.error(`  biopreparados       ${live.biopreparados} (${live.dosis_verificadas} con dosis verificada)`);
  console.error(`  fermentos           ${live.fermentos}`);
  console.error(`  plagas (Pest)       ${live.plagas}`);
  console.error(`  clima_extendido     ${live.clima_extendido}`);
  console.error(`  GROWS_IN edges      ${live.conexiones}`);
  console.error(`  USED_AS_BIOPREPARADO ${live.used_as_biopreparado}`);

  // Sanity: la suma de pisos debe igualar las aristas GROWS_IN.
  const sumaPisos = PISO_IDS.reduce((a, id) => a + (live.pisos[id] || 0), 0);
  if (sumaPisos !== live.conexiones) {
    console.error(
      `[snapshot] AVISO: suma pisos (${sumaPisos}) != aristas GROWS_IN (${live.conexiones}).` +
        ` Puede haber GROWS_IN a un PisoTermico fuera de [${PISO_IDS.join(', ')}].`,
    );
  }

  // Leer-y-manejar en vez de existsSync()+readFileSync (evita el TOCTOU
  // js/file-system-race CodeQL HIGH): si el archivo no existe, ENOENT →
  // mismo mensaje amistoso, sin ventana entre el check y el uso.
  let prev;
  try {
    prev = JSON.parse(readFileSync(JSON_PATH, 'utf-8'));
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`no existe ${JSON_PATH} — corre gen-data.mjs --write primero`);
    }
    throw err;
  }
  const next = mergeSnapshot(prev, live, date);
  const json = JSON.stringify(next, null, 2);
  const jsonPublic = JSON.stringify(sanitizeForPublic(next), null, 2);

  if (dryRun) {
    console.error('[snapshot] --dry-run: no se escribe nada. JSON resultante por stdout.');
    process.stdout.write(json + '\n');
    return { date, live, wrote: [] };
  }

  const wrote = [];
  writeFileSync(JSON_PATH, json + '\n');
  wrote.push(JSON_PATH);
  console.error(`[snapshot] escrito ${JSON_PATH}`);

  if (!jsonOnly) {
    const targets = [
      { f: HTML_PUBLICO, data: jsonPublic, label: 'publico (saneado)' },
      { f: HTML_SOCIOS, data: json, label: 'socios (completo)' },
    ];
    for (const { f, data, label } of targets) {
      const html = readFileSync(f, 'utf-8');
      const updated = embedData(html, data);
      if (updated === null) {
        console.error(`[snapshot] NO encontrado el bloque chagra-data en ${f} — omitido`);
        continue;
      }
      writeFileSync(f, updated);
      wrote.push(f);
      console.error(`[snapshot] reembebido en ${f} (${label})`);
    }
  }

  return { date, live, wrote };
}

// ESM entry-point check.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('snapshot-grafo-crecimiento failed:', err.message || err);
    process.exit(1);
  });
}
