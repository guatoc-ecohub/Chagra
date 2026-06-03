/**
 * bench-pool-gen.mjs — utilidades PURAS para generar el POOL DE CAPACIDADES del
 * bench A-vs-C, grounded contra el grafo vivo `chagra_kg` (Apache AGE en
 * postgres-farm).
 *
 * Se extrae de `gen-bench-capabilities-pool.mjs` para poder testear sin GPU ni
 * grafo. Dos piezas que el runbook nocturno 2026-06-02/03 (P1/T1) pidió arreglar:
 *
 *   1) CONEXIÓN AL GRAFO — `buildPsqlCommand`: el script viejo usaba
 *      `sudo podman exec postgres-farm psql …`, que está **ROTO** en alpha
 *      (`unable to find user root: no matching entries in passwd file`, el OS
 *      passwd del container está corrupto — INFRA_FACTS 2026-06-02). La única vía
 *      funcional es TCP `127.0.0.1:5432`. En NixOS el host no trae `psql` en PATH
 *      → se envuelve en `nix-shell -p postgresql --run`. Esta función arma ese
 *      comando, con overrides por env para tests/portabilidad.
 *
 *   2) CALIBRACIÓN DE `must_include` — `doseMustInclude`: el re-bench encontró
 *      que pedir el nombre de la FUENTE institucional VERBATIM ("FAO",
 *      "Agrosavia", "Restrepo Rivera") como token obligatorio estaba mal
 *      calibrado: hundía falsamente a config A (granite crudo da la dosis
 *      correcta pero NO cita el repositorio exacto) y no mide alucinación, mide
 *      memorización de un nombre propio. El `must_include` graph-faithful debe
 *      exigir SOLO hechos cuantitativos verificables del grafo (el nombre
 *      canónico del biopreparado + un fragmento atómico de la dosis verificada).
 *      La fuente pasa a metadato (`source_hint`), no a token obligatorio.
 *
 * Módulo PURO, sin efectos secundarios (no abre conexiones, no lee env al
 * importar) → importable por el script y por el test unitario.
 *
 * @module bench-pool-gen
 */

/**
 * Construye el comando shell para correr SQL contra el cluster postgres-farm por
 * TCP. NUNCA usa `podman exec` (roto en alpha). El SQL se pasa por STDIN al
 * `psql -f -` para que el shell no interprete el dollar-quoting (`$$`) de Cypher.
 *
 * Defaults verificados (INFRA_FACTS 2026-06-02):
 *   host=127.0.0.1 port=5432 user=farmos db=chagra_kg password=changeme
 *
 * En NixOS el host no trae psql en PATH → por defecto se envuelve en
 * `nix-shell -p postgresql --run`. `PSQL_WRAPPER=''` (env) lo desactiva si el
 * binario ya está disponible (CI, contenedores con psql instalado).
 *
 * La password se inyecta vía `PGPASSWORD` en el ENTORNO del proceso hijo (campo
 * `env` del retorno), NUNCA en la línea de comando (no aparece en `ps`/logs).
 *
 * @param {{
 *   host?:string, port?:string|number, user?:string, db?:string,
 *   password?:string, wrapper?:string|null, psqlBin?:string,
 * }} [opts]
 * @returns {{ cmd:string, env:Record<string,string> }} comando shell + env extra
 */
export function buildPsqlCommand({
  host = '127.0.0.1',
  port = 5432,
  user = 'farmos',
  db = 'chagra_kg',
  password = 'changeme',
  // wrapper === null → usar default nix-shell; wrapper === '' → sin wrapper.
  wrapper,
  psqlBin = 'psql',
} = {}) {
  const psql = `${psqlBin} -h ${host} -p ${port} -U ${user} -d ${db} -t -A -f -`;
  const useWrapper = wrapper == null ? 'nix-shell -p postgresql --run' : wrapper;
  const cmd = useWrapper ? `${useWrapper} ${JSON.stringify(psql)}` : psql;
  return { cmd, env: { PGPASSWORD: String(password) } };
}

/**
 * Resuelve los overrides de conexión desde un objeto env (process.env). Mapea:
 *   PGHOST_KG / PGPORT_KG / PGUSER_KG / PGDATABASE_KG / PGPASSWORD_KG
 *   PSQL_WRAPPER (string; '' = sin wrapper) / PSQL_BIN
 * Solo aplica los que estén definidos; el resto cae en los defaults de
 * `buildPsqlCommand`. Mantiene la lectura de env FUERA de la función pura.
 *
 * @param {Record<string,string|undefined>} [env]
 * @returns {object} opts para buildPsqlCommand
 */
export function psqlOptsFromEnv(env = {}) {
  const opts = {};
  if (env.PGHOST_KG) opts.host = env.PGHOST_KG;
  if (env.PGPORT_KG) opts.port = env.PGPORT_KG;
  if (env.PGUSER_KG) opts.user = env.PGUSER_KG;
  if (env.PGDATABASE_KG) opts.db = env.PGDATABASE_KG;
  if (env.PGPASSWORD_KG) opts.password = env.PGPASSWORD_KG;
  if (env.PSQL_BIN) opts.psqlBin = env.PSQL_BIN;
  // PSQL_WRAPPER definido (incluido vacío) overridea el default nix-shell.
  if (env.PSQL_WRAPPER !== undefined) opts.wrapper = env.PSQL_WRAPPER;
  return opts;
}

/**
 * Envuelve un MATCH/RETURN de Cypher en el SQL completo de AGE para psql.
 * @param {string} graph
 * @param {string} matchReturn  ej. "MATCH (b:Biopreparado) RETURN properties(b)"
 * @returns {string} SQL listo para `psql -f -`
 */
export function buildCypherSql(graph, matchReturn) {
  return (
    `LOAD 'age';\n` +
    `SET search_path = ag_catalog, public;\n` +
    `SELECT props FROM cypher('${graph}', $$ ${matchReturn} $$) AS (props agtype);\n`
  );
}

/**
 * Extrae filas de properties JSON de la salida cruda de `psql -t -A`. AGE devuelve
 * `agtype` que para `properties(n)` es JSON parseable. Ignora líneas de ruido
 * (LOAD/SET/blank) y filas no-JSON.
 *
 * @param {string} out  stdout de psql
 * @returns {object[]} filas parseadas
 */
export function parsePsqlRows(out) {
  return String(out || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('{'))
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * doseFact — primer fragmento ATÓMICO de la dosis verificada del grafo. Toma el
 * primer segmento (antes del primer ';') para que el must_include sea un HECHO
 * cuantitativo evaluable por fondo, no un párrafo entero. Trunca a ~70 chars en
 * frontera de palabra.
 *
 * @param {{dosis_aplicacion?:string}} bio
 * @returns {string}
 */
export function doseFact(bio) {
  const raw = (bio?.dosis_aplicacion || '').trim();
  let frag = raw.split(';')[0].trim();
  if (frag.length > 70) frag = frag.slice(0, 70).replace(/[\s,]+\S*$/, '');
  return frag;
}

/**
 * sourceHint — pista de fuente para metadato (NO must_include). Toma el primer
 * tramo de `fuente` antes de un separador de cita (/ o —) y lo recorta. Se guarda
 * como contexto humano, jamás como token obligatorio del scorer.
 *
 * @param {{fuente?:string}} bio
 * @returns {string}
 */
export function sourceHint(bio) {
  const raw = (bio?.fuente || '').trim();
  if (!raw) return '';
  let frag = raw.split(/\s*[/—]\s*/)[0].trim();
  if (frag.length > 60) frag = frag.slice(0, 60).replace(/[\s,]+\S*$/, '');
  return frag;
}

/**
 * doseMustInclude — el `must_include` graph-faithful para un prompt de dosis de
 * biopreparado. **CAMBIO CLAVE (runbook P1/T1):** SOLO hechos cuantitativos
 * verificables del grafo:
 *   - el nombre canónico del biopreparado (b.nombre), y
 *   - un fragmento atómico de la dosis verificada (doseFact).
 * La FUENTE institucional ya NO es token obligatorio (era un nombre-propio
 * memorizable que hundía falsamente a config A y no mide alucinación). Se devuelve
 * aparte como `source_hint` para trazabilidad.
 *
 * @param {{nombre?:string, dosis_aplicacion?:string, fuente?:string}} bio
 * @returns {{ must_include:string[], source_hint:string }}
 */
export function doseMustInclude(bio) {
  const must = [bio?.nombre, doseFact(bio)].filter(Boolean);
  return { must_include: must, source_hint: sourceHint(bio) };
}

/**
 * doseRedFlags — red_flags graph-faithful para un prompt de dosis. Caza la
 * invención de un número distinto al verificado o el salto a un agroquímico de
 * marca. No referencia la fuente (ya no es token).
 *
 * @returns {string[]}
 */
export function doseRedFlags() {
  return [
    'dosis numérica distinta a la verificada',
    'agroquímico de marca con dosis inventada',
  ];
}
