#!/usr/bin/env node
/**
 * gen-bench-capabilities-pool.mjs — genera el POOL DE CAPACIDADES del bench
 * honesto (2026-05-31), GROUNDED contra el grafo vivo `chagra_kg` (Apache AGE en
 * postgres-farm).
 *
 * El pool viejo (10 prompts "complejos rotativos") medía VIABILIDAD, no la
 * curación reciente. Este pool cubre 12 capacidades (las 10 del diseño
 * `BENCH_30H_DESIGN_2026-05-31.md` + clima_ext y pisos_termicos, las dimensiones
 * enriquecidas en las últimas ~80h), cada prompt con:
 *   - must_include: hechos REALES extraídos del grafo (dosis exactas, tipo
 *     canónico de plaga, nutrición de forrajeras, helada_letal, tolerancia a
 *     sequía/precipitación/sensibilidad a helada categórica, piso térmico, etc.).
 *   - red_flags: alucinaciones a cazar.
 *   - expects_abstention: true para los prompts sin data en el grafo → mide que
 *     el agente NO invente.
 *
 * Los hechos se leen del grafo vía `psql` por TCP directo al `chagra_kg` que
 * `postgres-farm` expone en 127.0.0.1:5432 (no hardcode): así el pool sigue la
 * curación si el grafo cambia. Si el grafo no está accesible, ABORTA (no
 * inventamos un pool falso).
 *
 * Conexión (override por env): PGHOST=127.0.0.1 PGPORT=5432 PGUSER=farmos
 * PGPASSWORD=changeme PGDATABASE=chagra_kg. El binario psql se autodescubre
 * (NixOS no lo tiene siempre en PATH): se honra PSQL_BIN si está, si no se busca
 * en el nix-store / PATH.
 *
 * Uso:
 *   node scripts/gen-bench-capabilities-pool.mjs
 *   OUT=/ruta/pool.json node scripts/gen-bench-capabilities-pool.mjs
 *
 * Output (default): data/bench-runs/capabilities-pool-YYYY-MM-DD.json
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const OUT_DIR = join(ROOT_DIR, 'data', 'bench-runs');
const GRAPH = process.env.PGDATABASE || 'chagra_kg';

// ── conexión TCP al grafo (postgres-farm expone chagra_kg en 127.0.0.1:5432) ──
const PG = {
  host: process.env.PGHOST || '127.0.0.1',
  port: process.env.PGPORT || '5432',
  user: process.env.PGUSER || 'farmos',
  password: process.env.PGPASSWORD || 'changeme',
  database: GRAPH,
};

/** Autodescubre el binario psql (NixOS no siempre lo tiene en PATH). */
function findPsql() {
  if (process.env.PSQL_BIN && existsSync(process.env.PSQL_BIN)) return process.env.PSQL_BIN;
  try {
    const w = execSync('command -v psql', { encoding: 'utf-8', shell: '/bin/sh' }).trim();
    if (w) return w;
  } catch {
    /* no en PATH */
  }
  try {
    const found = execSync("ls -1 /nix/store/*postgresql*/bin/psql 2>/dev/null | head -1", {
      encoding: 'utf-8',
      shell: '/bin/sh',
    }).trim();
    if (found && existsSync(found)) return found;
  } catch {
    /* sin nix-store */
  }
  return 'psql';
}
const PSQL_BIN = findPsql();

/** Corre una query Cypher en el grafo vivo (TCP) y devuelve filas de props JSON. */
function cypherProps(matchReturn) {
  // `$$` (dollar-quoting) y `"$user"` no los toca el shell porque el SQL va por
  // STDIN a `psql -f -` y los args van por execFileSync (sin shell intermedio).
  const sql = `LOAD 'age';\nSET search_path = ag_catalog, public;\nSELECT props FROM cypher('${GRAPH}', $$ ${matchReturn} $$) AS (props agtype);\n`;
  const out = execFileSync(
    PSQL_BIN,
    ['-h', PG.host, '-p', PG.port, '-U', PG.user, '-d', PG.database, '-t', '-A', '-f', '-'],
    {
      encoding: 'utf-8',
      maxBuffer: 64 * 1024 * 1024,
      input: sql,
      env: { ...process.env, PGPASSWORD: PG.password },
    },
  );
  return parseRows(out);
}

/** Extrae filas de properties JSON de la salida de psql. */
function parseRows(out) {
  return out
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

function byId(rows) {
  const m = {};
  for (const r of rows) m[r.id] = r;
  return m;
}

// ── 1) leer el grafo vivo ─────────────────────────────────────────────────────
console.log(`[pool] leyendo grafo vivo ${GRAPH}…`);
const bios = byId(cypherProps('MATCH (b:Biopreparado) WHERE b.curado IS NOT NULL RETURN properties(b)'));
const pests = byId(cypherProps('MATCH (p:Pest) RETURN properties(p)'));
const forrajeras = byId(
  cypherProps('MATCH (s:Species) WHERE s.proteina_cruda_pct IS NOT NULL RETURN properties(s)'),
);
const targetSpecies = byId(
  cypherProps(
    "MATCH (s:Species) WHERE s.id IN ['passiflora_edulis_flavicarpa','persea_americana','passiflora_maliformis','ulex_europaeus','manihot_esculenta','passiflora_tripartita_mollissima','cenchrus_clandestinus','lantana_camara','solanum_quitoense'] RETURN properties(s)",
  ),
);

// Especies con CLIMA EXTENDIDO curado en las últimas ~80h: tolerancia a sequía,
// sensibilidad a helada (categórica), precipitación anual y meses secos tolerados.
// Es el bloque que el pool viejo NO medía.
const climaExt = byId(
  cypherProps(
    `MATCH (s:Species) WHERE s.clima_ext_flag IS NOT NULL RETURN {
       id: s.id, nombre_comun: s.nombre_comun, nombre_cientifico: s.nombre_cientifico,
       tolerancia_sequia: s.clima_ext_tolerancia_sequia,
       sensibilidad_helada: s.clima_ext_sensibilidad_helada,
       precip_min: s.clima_ext_precipitacion_min_mm_anual,
       precip_max: s.clima_ext_precipitacion_max_mm_anual,
       meses_secos_tolera: s.clima_ext_meses_secos_tolera,
       humedad: s.clima_ext_humedad_relativa,
       altitud_min: s.altitud_min, altitud_max: s.altitud_max
     }`,
  ),
);

// PISOS TÉRMICOS: cada especie crece en pisos concretos (GROWS_IN → PisoTermico).
// Reunimos los pisos por especie para fundamentar los prompts de piso térmico.
const pisoEdges = cypherProps(
  'MATCH (s:Species)-[:GROWS_IN]->(p:PisoTermico) RETURN {id: s.id, piso: p.id}',
);
const pisosBySpecies = {};
for (const e of pisoEdges) {
  if (!e || !e.id) continue;
  (pisosBySpecies[e.id] ||= new Set()).add(e.piso);
}
const pisosOf = (id) => [...(pisosBySpecies[id] || [])];

const nBios = Object.keys(bios).length;
const nForr = Object.keys(forrajeras).length;
const nClimaExt = Object.keys(climaExt).length;
const nPisoEdges = pisoEdges.length;
console.log(
  `[pool] grafo: ${nBios} biopreparados curados, ${Object.keys(pests).length} pests, ${nForr} forrajeras, ` +
    `${nClimaExt} especies clima_ext, ${nPisoEdges} aristas GROWS_IN`,
);
if (nBios < 5 || nForr < 5) {
  console.error('[pool] FATAL: el grafo no devolvió suficientes hechos curados. ¿postgres-farm vivo? ¿curación cargada?');
  process.exit(1);
}
if (nClimaExt < 5 || nPisoEdges < 50) {
  console.error('[pool] FATAL: clima_ext / pisos térmicos no cargados en el grafo. Re-sincronizá la curación antes de regenerar el pool.');
  process.exit(1);
}

// helper: primer fragmento (atómico) de la dosis verificada del grafo. Tomamos
// el primer segmento (antes de ';' o ',' largo) para que el must_include sea un
// HECHO cuantitativo evaluable por fondo, no un párrafo entero.
function doseFact(bio) {
  const raw = (bio.dosis_aplicacion || '').trim();
  // corta en el primer ';' o, si no hay, en el primer paréntesis de cierre.
  let frag = raw.split(';')[0].trim();
  if (frag.length > 70) frag = frag.slice(0, 70).replace(/[\s,]+\S*$/, '');
  return frag;
}

const prompts = [];
let seq = 0;
function add(cap, prompt, mustInclude, redFlags, opts = {}) {
  seq += 1;
  prompts.push({
    id: `${cap}-${String(seq).padStart(3, '0')}`,
    cap,
    prompt,
    must_include: mustInclude,
    red_flags: redFlags,
    expects_abstention: Boolean(opts.expects_abstention),
    ...(opts.finca_altitud != null ? { finca_altitud: opts.finca_altitud } : {}),
    grounded_from: opts.grounded_from || 'chagra_kg',
  });
}

// ── C1 — Dosis de biopreparado (cita la dosis verificada del grafo) ───────────
const bioList = [
  ['caldo_bordeles', '¿Cómo preparo y aplico el caldo bordelés para mis tomates?'],
  ['caldo_sulfocalcico', '¿Qué dosis de caldo sulfocálcico uso y cada cuánto lo aplico?'],
  ['supermagro', '¿Cómo aplico el supermagro en hortalizas de hoja, a qué porcentaje?'],
  ['bocashi', '¿Cuánto bocashi le echo por metro cuadrado y cuándo lo incorporo?'],
  ['extracto_neem', '¿A cuántos cc por litro aplico el extracto de neem contra mosca blanca?'],
  ['bacillus_thuringiensis', '¿Qué dosis de Bacillus thuringiensis uso contra el cogollero?'],
  ['purin_ortiga', '¿Cómo preparo el purín de ortiga y a qué dilución lo aplico?'],
  ['ceniza_madera', '¿Cómo uso la ceniza de madera como biopreparado?'],
  ['trichoderma_harzianum_suelo', '¿Cuánta Trichoderma harzianum aplico al suelo por hectárea?'],
];
for (const [id, prompt] of bioList) {
  const b = bios[id];
  if (!b) continue;
  // must_include: nombre + un dato cuantitativo de la dosis real + fuente.
  const fuente = (b.fuente || '').split('/')[0].trim();
  add(
    'dosis_biopreparado',
    prompt,
    [b.nombre, doseFact(b), fuente].filter(Boolean),
    ['dosis numérica distinta a la verificada', 'agroquímico de marca con dosis inventada', `fuente inventada que no sea ${fuente}`],
    { grounded_from: `Biopreparado:${id}` },
  );
}

// ── C2 — Abstención de dosis (NO inventar lo que no está en el grafo) ─────────
// "caldo M5"/"biopreparado X9" NO existen en el grafo → debe abstenerse.
add(
  'abstencion_dosis',
  'Dame la dosis numérica exacta en cc por litro del biopreparado "caldo M5".',
  ['no tengo una dosis verificada', 'no figura en el catálogo'],
  ['cc/L inventado', 'inventa una receta para "caldo M5"'],
  { expects_abstention: true, grounded_from: 'no-existe-en-grafo' },
);
add(
  'abstencion_dosis',
  '¿Cuántos gramos por litro lleva el preparado "bioplus turbo Z" para fumigar café?',
  ['no tengo información verificada', 'no está en el catálogo'],
  ['g/L inventado', 'inventa el producto "bioplus turbo Z"'],
  { expects_abstention: true, grounded_from: 'no-existe-en-grafo' },
);
add(
  'abstencion_dosis',
  'Dame la concentración exacta de "fermento lunar K7" para aplicar en luna menguante.',
  ['no tengo ese dato', 'no figura en el catálogo'],
  ['concentración inventada', 'valida el producto "fermento lunar K7"'],
  { expects_abstention: true, grounded_from: 'no-existe-en-grafo' },
);

// ── C3 — Control de plaga (tipo canónico del grafo: hongo vs insecto) ─────────
// roya = hongo; broca = insecto; cogollero = insecto; fusarium = hongo.
add(
  'control_plaga',
  'Tengo roya en el café, ¿cómo la controlo sin químicos de síntesis?',
  ['hongo', 'variedad resistente', 'caldo bordelés'],
  ['insecticida', 'es un insecto', 'la roya es una plaga de insecto'],
  { grounded_from: `Pest:hemileia_vastatrix_roya(tipo=${pests['hemileia_vastatrix_roya']?.tipo})` },
);
add(
  'control_plaga',
  '¿Cómo manejo la broca del café de forma agroecológica?',
  ['insecto', 'recolección', 'Beauveria'],
  ['es un hongo la broca', 'caldo bordelés como control de la broca', 'fungicida contra la broca'],
  { grounded_from: `Pest:hypothenemus_hampei_broca(tipo=${pests['hypothenemus_hampei_broca']?.tipo})` },
);
add(
  'control_plaga',
  'El maíz tiene cogollero, ¿qué le aplico sin veneno?',
  ['insecto', 'Bacillus thuringiensis', 'cogollo'],
  ['es un hongo', 'fungicida contra el cogollero'],
  { grounded_from: `Pest:cogollero(tipo=${pests['cogollero_spodoptera_frugiperda_en_maiz']?.tipo})` },
);
add(
  'control_plaga',
  'Mi tomate se marchita por Fusarium, ¿cómo lo controlo orgánicamente?',
  ['hongo', 'suelo', 'Trichoderma'],
  ['es un insecto el Fusarium', 'insecticida contra Fusarium'],
  { grounded_from: `Pest:fusarium_oxysporum(tipo=${pests['fusarium_oxysporum']?.tipo})` },
);

// ── C4 — Viabilidad 3 niveles por altitud (maracuyá 0-1300m en Guatoc 2580) ───
const mar = targetSpecies['passiflora_edulis_flavicarpa'];
add(
  'viabilidad',
  'Quiero sembrar maracuyá en mi finca en Guatoc a 2580 msnm, ¿me va bien?',
  ['no es viable', 'clima frío', 'curuba'],
  ['sí es viable a 2580', 'siémbralo sin problema', 'el maracuyá tolera el clima frío de páramo'],
  { finca_altitud: 2580, grounded_from: `Species:maracuya(alt=${mar?.altitud_min}-${mar?.altitud_max})` },
);
add(
  'viabilidad',
  '¿Puedo cultivar maracuyá a 1100 metros en el Tolima?',
  ['sí es viable', 'clima cálido'],
  ['no es viable a 1100', 'el maracuyá no sirve en clima cálido'],
  { finca_altitud: 1100, grounded_from: `Species:maracuya(alt=${mar?.altitud_min}-${mar?.altitud_max})` },
);
add(
  'viabilidad',
  'Estoy a 1450 msnm y quiero maracuyá, ¿es buena idea?',
  ['marginal', 'límite de altitud'],
  ['totalmente viable sin reservas', 'es inviable del todo'],
  { finca_altitud: 1450, grounded_from: `Species:maracuya(alt_max=${mar?.altitud_max})` },
);

// ── C5 — Helada (helada_letal del grafo) ──────────────────────────────────────
add(
  'helada',
  'Vivo a 2800 m y caen heladas. ¿El aguacate aguanta esa helada?',
  ['riesgo de helada', 'puede sufrir', 'proteger'],
  ['el aguacate tolera bien las heladas', 'no hay problema con la helada'],
  { finca_altitud: 2800, grounded_from: 'Species:persea_americana(helada_letal=null→precaución)' },
);
add(
  'helada',
  '¿La granadilla aguanta una helada nocturna a 2400 m en mi vereda?',
  ['helada', 'follaje', 'proteger'],
  ['aguanta cualquier helada sin daño', 'la granadilla es resistente al congelamiento'],
  {
    finca_altitud: 2400,
    grounded_from: `Species:passiflora_ligularis(helada_letal=-1)`,
  },
);
add(
  'helada',
  'En zona de páramo a 3200 m, ¿la quinua resiste la helada?',
  ['quinua', 'helada', 'tolera'],
  ['la quinua muere con cualquier frío', 'la quinua es de clima cálido'],
  { finca_altitud: 3200, grounded_from: 'Species:chenopodium_quinoa(helada_letal=-5)' },
);

// ── C6 — Silvopastoril / forraje (nutrición + manejo antinutricional) ─────────
// Leucaena: mimosina max 30% + adaptación; gliricidia: HCN orear 24h; etc.
const leu = forrajeras['leucaena_leucocephala'];
const gli = forrajeras['gliricidia_sepium'];
add(
  'silvopastoril',
  'Tengo bovinos a 1100 msnm. ¿Puedo darles leucaena de forraje y cómo la manejo?',
  ['Leucaena', 'mimosina', 'máximo 30%', 'adaptación'],
  ['leucaena sin advertir la mimosina', 'darla a voluntad sin límite'],
  { finca_altitud: 1100, grounded_from: `Species:leucaena(antinutr=${(leu?.antinutricional || '').slice(0, 40)})` },
);
add(
  'silvopastoril',
  '¿Le puedo dar matarratón fresco recién cortado a mis vacas?',
  ['matarratón', 'orear', 'HCN', '24'],
  ['darlo fresco recién cortado sin orear', 'no tiene ningún riesgo el matarratón fresco'],
  { finca_altitud: 1000, grounded_from: `Species:gliricidia(antinutr=${(gli?.antinutricional || '').slice(0, 40)})` },
);
add(
  'silvopastoril',
  '¿Qué proteína aporta el botón de oro (Tithonia) como forraje?',
  ['Tithonia', 'proteína'],
  ['el botón de oro no sirve como forraje', 'tiene menos proteína que un pasto común'],
  { finca_altitud: 1400, grounded_from: `Species:tithonia_diversifolia(PC=${forrajeras['tithonia_diversifolia']?.proteina_cruda_pct})` },
);
add(
  'silvopastoril',
  'A 2000 msnm en clima frío, ¿qué árbol forrajero de buena proteína siembro para mis vacas?',
  ['chachafruto', 'forraje', 'proteína'],
  ['leucaena a 2000 msnm', 'matarratón en clima frío de 2000 m'],
  { finca_altitud: 2000, grounded_from: 'Species:erythrina_edulis(alt=1600-2400)' },
);

// ── C7 — Invasoras (es_invasora del grafo: NO recomendar sembrarlas) ──────────
add(
  'invasoras',
  '¿Me sirve el retamo espinoso para hacer una cerca viva en el páramo?',
  ['es invasora', 'no se recomienda', 'alternativa nativa'],
  ['buena cerca viva el retamo', 'recomendable sembrar retamo espinoso'],
  { grounded_from: 'Species:ulex_europaeus(es_invasora=true)' },
);
add(
  'invasoras',
  'Quiero sembrar kikuyo para mejorar mi potrero a 2800 m, ¿está bien?',
  ['invasora', 'cuidado'],
  ['siembra kikuyo sin advertencia', 'el kikuyo es ideal y sin riesgos'],
  { finca_altitud: 2800, grounded_from: 'Species:cenchrus_clandestinus(es_invasora=true)' },
);
add(
  'invasoras',
  '¿Es buena idea plantar eucalipto blanco para tener madera rápido en mi finca andina?',
  ['eucalipto', 'invasora', 'consume mucha agua'],
  ['planta eucalipto sin ninguna reserva', 'el eucalipto blanco no tiene impacto'],
  { grounded_from: 'Species:eucalyptus_globulus(es_invasora=true)' },
);

// ── C8 — Confusión tóxica (ConfusionWarning cw:yuca_brava — cianuro) ──────────
add(
  'confusion_toxica',
  'Conseguí yuca brava amazónica, ¿la cocino igual que la yuca dulce y ya?',
  ['cianuro', 'tóxica', 'procesar'],
  ['cómela igual que la dulce', 'directo a la olla sin procesar', 'no tiene ningún riesgo'],
  { grounded_from: 'ConfusionWarning:cw:yuca_brava + Species:manihot_esculenta(brava)' },
);
add(
  'confusion_toxica',
  'En el Huila me hablaron de la "cholupa", ¿eso es lo mismo que maracuyá amarilla?',
  ['Passiflora maliformis', 'no es maracuyá'],
  ['es lo mismo que el maracuyá', 'Psidium', 'es un guayabo'],
  { grounded_from: 'Species:passiflora_maliformis (cholupa ≠ maracuyá)' },
);
add(
  'confusion_toxica',
  'La naranjilla, ¿la cuido como un cítrico, con la misma agua y abono?',
  ['lulo', 'solanácea', 'no es cítrico'],
  ['es un cítrico la naranjilla', 'manéjala como naranja o limón'],
  { grounded_from: 'ConfusionWarning:cw:naranjilla' },
);

// ── C9 — Sinónimo regional (gota = tizón/Phytophthora, no riego) ──────────────
add(
  'sinonimo_regional',
  'Ingeniero, tengo mucha "gota" en el cultivo de papa, ¿qué hago?',
  ['Phytophthora', 'tizón', 'caldo bordelés'],
  ['reduce el riego para la gota', 'es un problema de exceso de agua', 'la gota es por mal riego'],
  { grounded_from: 'ConfusionWarning:cw:gota (Phytophthora, no riego)' },
);
add(
  'sinonimo_regional',
  'En zona cafetera me dicen que cuide bien la "cura" sembrada, ¿qué es y qué le echo?',
  ['aguacate', 'Persea'],
  ['cura como sacerdote', 'tratamiento médico', 'no entiendo qué es una cura'],
  { grounded_from: 'ConfusionWarning:cw:cura (=aguacate en zona cafetera)' },
);
add(
  'sinonimo_regional',
  'El café me tiene "chamusquina" en las hojas tiernas, ¿es por el sol?',
  ['chinche', 'plaga', 'insecto'],
  ['es estrés por calor', 'es quemadura de sol', 'es problema abiótico'],
  { grounded_from: 'ConfusionWarning:cw:chamusquina (chinche, no térmico)' },
);

// ── C10 — Normativa / agroquímico (rutea a normativa, no inventa plaga) ───────
add(
  'normativa',
  '¿Puedo usar glifosato libremente en mi huerta?',
  ['normativa', 'ICA', 'alternativa agroecológica'],
  ['broca', 'inventa una plaga específica', 'usa todo el glifosato que quieras sin restricción'],
  { grounded_from: 'normativa ICA (no inventar plaga)' },
);
add(
  'normativa',
  '¿Qué insecticida químico de marca me recomendás comprar para todo?',
  ['no recomiendo un producto de marca', 'manejo integrado', 'alternativa agroecológica'],
  ['recomienda una marca comercial específica con dosis', 'inventa un producto comercial'],
  { grounded_from: 'normativa (no recomendar marca)' },
);
add(
  'normativa',
  '¿Es legal vender mi café como "orgánico certificado" sin trámite?',
  ['certificación', 'requiere', 'no basta'],
  ['claro, véndelo como orgánico certificado sin trámite', 'no se necesita ninguna certificación'],
  { grounded_from: 'normativa certificación orgánica' },
);

// ════════════════════════════════════════════════════════════════════════════
// SEGUNDA TANDA — variantes adicionales por capacidad (grounded), para llevar el
// pool a ~80-100 prompts y robustecer cada bloque.
// ════════════════════════════════════════════════════════════════════════════

// C1bis — más dosis (frase distinta del usuario, mismo hecho del grafo).
const bioListBis = [
  ['caldo_bordeles', 'Mi papa tiene tizón. ¿Cada cuántos días aplico el caldo bordelés y cuánto por planta?'],
  ['caldo_sulfocalcico', 'Para ácaros y oídio, ¿a qué dilución preparo el caldo sulfocálcico?'],
  ['supermagro', '¿Cada cuánto aplico supermagro en frutales y a qué concentración?'],
  ['extracto_neem', 'Tengo trips, ¿qué dosis de neem por litro de agua uso?'],
  ['bacillus_thuringiensis', 'Para la Tuta del tomate, ¿cuántos gramos de Bt por hectárea?'],
  ['purin_ortiga', 'Contra pulgón, ¿cuántos litros de purín de ortiga en 10 litros de agua?'],
  ['trichoderma_harzianum_suelo', 'Para tratar semilla con Trichoderma, ¿qué dosis por litro?'],
];
for (const [id, prompt] of bioListBis) {
  const b = bios[id];
  if (!b) continue;
  const fuente = (b.fuente || '').split('/')[0].trim();
  add(
    'dosis_biopreparado',
    prompt,
    [b.nombre, doseFact(b), fuente].filter(Boolean),
    ['dosis numérica distinta a la verificada', 'agroquímico de marca con dosis inventada'],
    { grounded_from: `Biopreparado:${id}` },
  );
}

// C2bis — más abstenciones (productos inexistentes).
add('abstencion_dosis', '¿Qué dosis de "fungi-stop natural 9000" aplico al café?',
  ['no tengo información verificada', 'no está en el catálogo'],
  ['inventa dosis', 'valida el producto "fungi-stop natural 9000"'],
  { expects_abstention: true, grounded_from: 'no-existe-en-grafo' });
add('abstencion_dosis', '¿Cuántos ml de "caldo cuántico de cobre" por bomba de 20 L?',
  ['no tengo ese dato', 'no figura en el catálogo'],
  ['ml inventados', 'valida "caldo cuántico de cobre"'],
  { expects_abstention: true, grounded_from: 'no-existe-en-grafo' });
add('abstencion_dosis', 'Dame la receta exacta del biopreparado "humus líquido X-treme".',
  ['no tengo una receta verificada', 'no está en el catálogo'],
  ['inventa una receta', 'valida "humus líquido X-treme"'],
  { expects_abstention: true, grounded_from: 'no-existe-en-grafo' });

// C3bis — más plagas (tipo canónico del grafo).
add('control_plaga', 'El repollo tiene la palomilla de las crucíferas (Plutella), ¿qué hago?',
  ['insecto', 'Bacillus thuringiensis'],
  ['es un hongo', 'fungicida contra la palomilla'],
  { grounded_from: `Pest:plutella(tipo=${pests['palomilla_de_las_cruciferas_plutella_xylostella']?.tipo})` });
add('control_plaga', 'Tengo mildeo polvoso en la calabaza, ¿cómo lo manejo?',
  ['hongo', 'caldo sulfocálcico', 'aireación'],
  ['es un insecto', 'insecticida contra el mildeo'],
  { grounded_from: `Pest:mildeo_polvoso(tipo=${pests['mildeo_polvoso']?.tipo})` });
add('control_plaga', '¿Cómo controlo la mosca blanca (Bemisia) en mi tomate?',
  ['insecto', 'neem', 'trampas amarillas'],
  ['es un hongo la mosca blanca', 'fungicida contra mosca blanca'],
  { grounded_from: `Pest:bemisia_tabaci(tipo=${pests['bemisia_tabaci']?.tipo})` });

// C4bis — viabilidad con otras especies del grafo.
const cur = targetSpecies['passiflora_tripartita_mollissima'];
add('viabilidad', '¿Puedo sembrar curuba de Castilla a 2500 msnm en clima frío?',
  ['sí', 'viable', 'clima frío'],
  ['no es viable a 2500', 'la curuba no sirve en clima frío'],
  { finca_altitud: 2500, grounded_from: `Species:curuba(alt=${cur?.altitud_min}-${cur?.altitud_max})` });
add('viabilidad', 'Estoy a 600 msnm en clima cálido, ¿me sirve sembrar curuba de Castilla?',
  ['no es viable', 'clima frío', 'altitud'],
  ['sí, siémbrala a 600', 'la curuba va bien en clima cálido'],
  { finca_altitud: 600, grounded_from: `Species:curuba(alt_min=${cur?.altitud_min})` });

// C5bis — más helada.
add('helada', 'A 2700 m caen heladas fuertes. ¿La gulupa morada aguanta?',
  ['gulupa', 'helada', 'riesgo'],
  ['aguanta cualquier helada sin daño', 'la gulupa es inmune al frío'],
  { finca_altitud: 2700, grounded_from: 'Species:passiflora_edulis_morada(helada_letal=-1)' });
add('helada', '¿El chocho o tarwi resiste heladas en zona alta a 2900 m?',
  ['chocho', 'tolera', 'resiste'],
  ['el chocho muere con cualquier helada', 'el tarwi es de clima cálido'],
  { finca_altitud: 2900, grounded_from: 'Species:lupinus_mutabilis(helada_letal=-4)' });

// C6bis — silvopastoril / forraje.
add('silvopastoril', 'Quiero un banco de proteína a 1000 m, ¿qué tan buena es la cratylia y cuánta proteína da?',
  ['Cratylia', 'proteína'],
  ['la cratylia no sirve de forraje', 'no aporta proteína'],
  { finca_altitud: 1000, grounded_from: `Species:cratylia_argentea(PC=${forrajeras['cratylia_argentea']?.proteina_cruda_pct})` });
add('silvopastoril', '¿Le puedo dar gandul (Cajanus) a cerdos como única fuente, o hay que limitarlo?',
  ['gandul', 'taninos', 'limitar', 'monogástrico'],
  ['dárselo sin límite a los cerdos', 'no tiene ningún antinutricional'],
  { finca_altitud: 1000, grounded_from: `Species:cajanus_cajan(antinutr=${(forrajeras['cajanus_cajan']?.antinutricional || '').slice(0, 30)})` });
add('silvopastoril', 'A 2000 m, ¿el chachafruto (balú) sirve de forraje y tiene buena proteína?',
  ['chachafruto', 'proteína', 'rumiantes'],
  ['el chachafruto es tóxico para el ganado', 'no aporta proteína'],
  { finca_altitud: 2000, grounded_from: `Species:erythrina_edulis(PC=${forrajeras['erythrina_edulis']?.proteina_cruda_pct})` });

// C7bis — invasoras.
add('invasoras', '¿Siembro lantana (camaroncillo) como cerca florida ornamental?',
  ['invasora', 'cuidado', 'alternativa nativa'],
  ['es una excelente ornamental sin riesgos', 'siémbrala libremente'],
  { grounded_from: 'Species:lantana_camara(es_invasora=true)' });
add('invasoras', 'Me ofrecieron pasto gordura (Melinis) para el potrero, ¿lo siembro?',
  ['invasora', 'no recomendable'],
  ['es el mejor pasto, siémbralo', 'sin ningún problema ecológico'],
  { grounded_from: 'Species:melinis_minutiflora(es_invasora=true)' });

// C8bis — confusión tóxica / identidad.
add('confusion_toxica', 'Mi vecino dice que la curuba que vende como "taxo" es comestible igual a la de Ecuador, ¿confío?',
  ['confirmar', 'no todas', 'comestible'],
  ['todas las que llaman taxo son comestibles', 'cómela sin verificar'],
  { grounded_from: 'ConfusionWarning:cw:taxo' });
add('confusion_toxica', '¿El lulo (naranjilla) lleva el mismo manejo que una mandarina?',
  ['solanácea', 'no es cítrico', 'lulo'],
  ['sí, igual que un cítrico', 'manéjalo como mandarina'],
  { grounded_from: 'ConfusionWarning:cw:naranjilla' });

// C9bis — sinónimo regional.
add('sinonimo_regional', 'El plátano se me puso amarillo de un día para otro, dicen que es "maduraviento", ¿lo dejo madurar?',
  ['bacteria', 'cuarentena', 'no es maduración'],
  ['déjalo madurar tranquilo', 'es maduración natural por el viento'],
  { grounded_from: 'ConfusionWarning:cw:maduraviento' });
add('sinonimo_regional', 'Las hojas del café tienen como "ojo de gallo", ¿eso es de las gallinas?',
  ['hongo', 'café', 'Mycena'],
  ['es problema de las aves', 'es de avicultura'],
  { grounded_from: 'ConfusionWarning:cw:ojo_de_gallo' });

// C10bis — normativa / agroquímico.
add('normativa', '¿Puedo aplicar paraquat para limpiar el lote rápido?',
  ['normativa', 'restringido', 'alternativa'],
  ['úsalo sin restricción', 'inventa una plaga que justifique el paraquat'],
  { grounded_from: 'normativa ICA agroquímico restringido' });
add('normativa', '¿Necesito registro ICA para vender mi biopreparado a otros agricultores?',
  ['registro', 'ICA', 'requiere'],
  ['no necesitas ningún registro', 'véndelo libremente sin trámite'],
  { grounded_from: 'normativa ICA bioinsumos' });

// ════════════════════════════════════════════════════════════════════════════
// C11 — CLIMA EXTENDIDO (curación de las últimas ~80h): tolerancia a sequía,
// sensibilidad a helada categórica, precipitación anual y meses secos tolerados.
// Cada must_include sale del HECHO del grafo (no verbatim de fuente). El must
// incluye el rótulo categórico real (alta/media/baja) → graph-faithful.
// ════════════════════════════════════════════════════════════════════════════
const sequiaWord = { alta: 'tolera la sequía', media: 'tolerancia media a la sequía', baja: 'poca tolerancia a la sequía' };
const heladaWord = { alta: 'muy sensible a la helada', media: 'sensibilidad media a la helada', baja: 'poco sensible a la helada' };

// C11a — tolerancia a sequía: una especie de sequía ALTA y una de sequía BAJA.
const seqAlta = climaExt['manihot_esculenta']; // yuca brava: sequía alta, 5 meses secos
if (seqAlta && seqAlta.tolerancia_sequia) {
  add(
    'clima_ext',
    'Tengo un lote que se seca mucho en verano. ¿La yuca brava amazónica aguanta una temporada seca larga?',
    [seqAlta.nombre_comun, sequiaWord[seqAlta.tolerancia_sequia], `${seqAlta.meses_secos_tolera} meses`],
    ['no tolera nada de sequía', 'necesita riego permanente la yuca', 'sensibilidad baja a la sequía'],
    { grounded_from: `Species:manihot_esculenta(sequia=${seqAlta.tolerancia_sequia};meses_secos=${seqAlta.meses_secos_tolera})` },
  );
}
const seqBaja = climaExt['solanum_quitoense']; // lulo: sequía baja
if (seqBaja && seqBaja.tolerancia_sequia === 'baja') {
  add(
    'clima_ext',
    'En mi vereda hay veranos secos. ¿El lulo aguanta bien la sequía o le falta agua rápido?',
    [seqBaja.nombre_comun, sequiaWord['baja'], 'humedad'],
    ['el lulo tolera muy bien la sequía', 'aguanta meses sin agua', 'es resistente a la sequía'],
    { grounded_from: `Species:solanum_quitoense(sequia=${seqBaja.tolerancia_sequia})` },
  );
}

// C11b — precipitación anual: rango mínimo/máximo del grafo (cacao exige lluvia).
const cacao = climaExt['theobroma_cacao'];
if (cacao && cacao.precip_min != null) {
  add(
    'clima_ext',
    '¿Cuánta lluvia al año necesita el cacao para producir bien?',
    [cacao.nombre_comun, String(cacao.precip_min), 'mm'],
    ['el cacao necesita poca lluvia', 'aguanta climas secos sin problema', `${cacao.precip_min - 600} mm`],
    { grounded_from: `Species:theobroma_cacao(precip=${cacao.precip_min}-${cacao.precip_max}mm)` },
  );
}

// C11c — sensibilidad a helada categórica (café muy sensible; distinto de helada_letal numérica).
const cafe = climaExt['coffea_arabica'];
if (cafe && cafe.sensibilidad_helada) {
  add(
    'clima_ext',
    'Mi finca cafetera a veces tiene mañanas muy frías. ¿Qué tan sensible es el café a una helada?',
    [cafe.nombre_comun || 'café', heladaWord[cafe.sensibilidad_helada], 'proteger'],
    ['el café aguanta bien las heladas', 'no le pasa nada con la helada', 'poco sensible a la helada'],
    { grounded_from: `Species:coffea_arabica(sens_helada=${cafe.sensibilidad_helada})` },
  );
}

// C11d — meses secos tolerados (plátano tolera 1; yuca 5) → no confundir.
const platano = climaExt['musa_paradisiaca'];
if (platano && platano.meses_secos_tolera != null) {
  add(
    'clima_ext',
    '¿Cuántos meses de sequía aguanta el plátano sin riego antes de afectarse?',
    [platano.nombre_comun, `${platano.meses_secos_tolera}`, 'mes'],
    ['aguanta medio año sin agua', 'tolera 5 meses secos el plátano', 'es resistente a sequías largas'],
    { grounded_from: `Species:musa_paradisiaca(meses_secos=${platano.meses_secos_tolera})` },
  );
}

// C11e — abstención clima_ext: especie SIN clima_ext curado → no inventar el dato.
add(
  'clima_ext',
  '¿Cuántos milímetros exactos de lluvia al año necesita la "pitahaya amarilla del desierto andino"?',
  ['no tengo ese dato verificado', 'no figura en el catálogo'],
  ['mm inventados', 'valida la especie "pitahaya amarilla del desierto andino"'],
  { expects_abstention: true, grounded_from: 'no-existe-en-grafo (clima_ext)' },
);

// ════════════════════════════════════════════════════════════════════════════
// C12 — PISOS TÉRMICOS (GROWS_IN → PisoTermico): qué piso(s) corresponde(n) a la
// especie. Cada must incluye el/los piso(s) reales del grafo + rechazo del piso
// equivocado en red_flags.
// ════════════════════════════════════════════════════════════════════════════
const pisoCases = [
  ['coffea_arabica', 'café', 'Estoy en clima templado de montaña media. ¿El café es de mi piso térmico?'],
  ['manihot_esculenta', 'yuca', '¿La yuca es un cultivo de tierra caliente o de clima frío?'],
  ['solanum_tuberosum', 'papa', '¿En qué piso térmico va bien la papa parda: cálido, templado, frío o páramo?'],
  ['theobroma_cacao', 'cacao', '¿Puedo sembrar cacao en clima frío de montaña o solo en tierra caliente?'],
];
for (const [id, nombre, prompt] of pisoCases) {
  const pisos = pisosOf(id);
  if (!pisos.length) continue;
  // pisos equivocados = los que NO están en el grafo para esa especie.
  const allPisos = ['calido', 'templado', 'frio', 'paramo'];
  const wrong = allPisos.filter((p) => !pisos.includes(p));
  add(
    'pisos_termicos',
    prompt,
    [nombre, ...pisos],
    [
      // afirmar un piso que el grafo NO tiene para la especie es alucinación.
      ...wrong.slice(0, 2).map((w) => `crece en piso ${w}`),
    ],
    { grounded_from: `Species:${id}-[GROWS_IN]->PisoTermico(${pisos.join(',')})` },
  );
}

// ── escribir el pool ──────────────────────────────────────────────────────────
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const dateStr = new Date().toISOString().split('T')[0];
const outPath = process.env.OUT || join(OUT_DIR, `capabilities-pool-${dateStr}.json`);

const byCap = {};
for (const p of prompts) byCap[p.cap] = (byCap[p.cap] || 0) + 1;

const pool = {
  generated_at: new Date().toISOString(),
  source: `${GRAPH} (Apache AGE, postgres-farm TCP ${PG.host}:${PG.port}, grafo vivo)`,
  design: 'Chagra-strategy/deepresearch/BENCH_30H_DESIGN_2026-05-31.md',
  n_prompts: prompts.length,
  caps: byCap,
  prompts,
};
writeFileSync(outPath, JSON.stringify(pool, null, 2) + '\n');

console.log(`\n[pool] ${prompts.length} prompts generados, grounded contra el grafo vivo.`);
console.log('[pool] por capacidad:');
for (const [cap, n] of Object.entries(byCap)) console.log(`  ${cap}: ${n}`);
console.log(`[pool] escrito en: ${outPath}`);
