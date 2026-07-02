#!/usr/bin/env node
/**
 * scripts/audit-contaminacion.mjs
 *
 * AUDITOR de contaminación de datos para el catálogo (`catalog/*.json`) y el
 * grafo `chagra_kg` (Apache AGE, postgres-farm) del moat agroecológico de
 * Chagra.
 *
 * Contexto: se detectaron en producción casos concretos de contaminación
 * sobre la especie ejemplo papa (Solanum tuberosum) — plagas de arroz y
 * maíz colgadas de una especie que no las tiene, un insecto (Agrotis
 * ipsilon, "Trozador") categorizado como enfermedad en vez de plaga,
 * duplicados del mismo organismo bajo nombres distintos con datos
 * inconsistentes (p. ej. "Polilla guatemalteca" atribuida indistintamente a
 * Tecia solanivora y a Phthorimaea operculella en distintas versiones del
 * catálogo), decenas de biopreparados sobre-asociados a una sola especie, y
 * controles biológicos con etiqueta genérica no específica (p. ej.
 * "Microorganismo de control biológico (DR-MIP-1)" reutilizada para
 * organismos distintos). Este script NO corrige nada — solo detecta y
 * reporta, para servir de gate de regresión (estilo `scripts/tsc-check-gate.mjs`)
 * y de mapa de holes para investigación posterior.
 *
 * Principio de diseño: NADA de listas hardcodeadas de especies o plagas
 * concretas. La señal de "cultivo ajeno" (clase 1) y de "duplicado" (clase 3)
 * se deriva dinámicamente del propio catálogo/grafo (nombres, familias
 * botánicas, aristas) — si se agregan especies u organismos nuevos, el
 * detector los cubre solo, sin tocar este archivo. Las únicas tablas
 * hardcodeadas son léxicos de dominio agronómico generales (géneros de
 * insectos vs. patógenos para la clase 2, frases marcadoras de etiqueta
 * genérica para la clase 5) — no identifican organismos ni cultivos
 * concretos de Chagra, son vocabulario taxonómico/estructural estándar.
 *
 * Clases de contaminación detectadas
 * -----------------------------------
 *   1. cruce_cultivo        — plaga/enfermedad/biopreparado de OTRO cultivo
 *                              colgado de una especie que no lo tiene.
 *   2. miscategorizacion     — insecto en enfermedades_criticas, o patógeno/
 *                              nematodo/virus en plagas_criticas.
 *   3. duplicado             — dos entidades Pest que son el mismo organismo
 *                              bajo nombres distintos, con datos inconsistentes.
 *   4. sobre_asociacion       — especie con conteo de biopreparados/controles
 *                              muy por encima del resto del corpus (outlier
 *                              estadístico, umbral derivado del dato).
 *   5. placeholder            — etiqueta de control genérica/no específica
 *                              (reutilizada verbatim entre organismos
 *                              distintos, o con marcador estructural
 *                              genérico / código interno tipo "(DR-MIP-1)").
 *
 * Fuentes de datos
 * -----------------
 *   - Catálogo: TODOS los archivos `catalog/*.json` con forma
 *     `{species:[...]}` (seed v3.0/v3.1, graph-export, oss-subset v3.1/v3.2)
 *     y `{biopreparados:[...]}` (biopreparados-seed.json). Se descubren por
 *     glob — no hay nombres de archivo hardcodeados salvo el directorio.
 *   - Grafo `chagra_kg`: por defecto, `catalog/chagra-kg-graph-snapshot.json`
 *     (snapshot versionado con nodos Pest/BeneficialOrganism/Biopreparado +
 *     Species mínimo, y aristas AFFECTS/CONTROLS — ver el `_meta` del
 *     archivo para cómo se generó). Es opcional: si no existe, el script
 *     sigue con las clases que solo dependen del catálogo y avisa que el
 *     grafo no se auditó. Override con `--graph-snapshot FILE` o
 *     deshabilitar con `--no-graph`.
 *
 * NO modifica catálogo ni grafo — es de solo lectura/reporte.
 *
 * Uso
 * ---
 *   node scripts/audit-contaminacion.mjs                       # texto
 *   node scripts/audit-contaminacion.mjs --json                # JSON
 *   node scripts/audit-contaminacion.mjs --write-report FILE.md
 *   node scripts/audit-contaminacion.mjs --check                # gate CI:
 *       falla (exit 1) si hay hallazgos NUEVOS vs. scripts/audit-contaminacion-baseline.json
 *   node scripts/audit-contaminacion.mjs --update-baseline       # sincroniza
 *       el baseline con el estado actual (baja o sube según corresponda)
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DEFAULT_CATALOG_DIR = join(ROOT, 'catalog');
const DEFAULT_GRAPH_SNAPSHOT = join(ROOT, 'catalog', 'chagra-kg-graph-snapshot.json');
const DEFAULT_BASELINE_PATH = join(__dirname, 'audit-contaminacion-baseline.json');

// =============================================================================
// Léxicos de dominio (NO son listas de especies/plagas de Chagra — son
// vocabulario taxonómico/estructural general, ver nota de diseño arriba).
// =============================================================================

/** Géneros/formas que son ANIMALES (insectos/ácaros) — pertenecen a plagas_criticas. */
export const INSECT_GENERA = [
  'Agrotis', 'Spodoptera', 'Copitarsia', 'Feltia', 'Peridroma', 'Tecia', 'Phthorimaea',
  'Premnotrypes', 'Epitrix', 'Diabrotica', 'Liriomyza', 'Bemisia', 'Trialeurodes',
  'Aphis', 'Myzus', 'Macrosiphum', 'Toxoptera', 'Rhopalosiphum', 'Sitobion',
  'Thrips', 'Frankliniella', 'Drosophila', 'Ceratitis', 'Anastrepha', 'Dacus',
  'Hypothenemus', 'Monalonion', 'Nezara', 'Diaphania', 'Plutella', 'Tuta',
  'Helicoverpa', 'Heliothis', 'Pseudoplusia', 'Trichoplusia', 'Phyllophaga',
  'Ancognatha', 'Cyclocephala', 'Anomala', 'Naupactus', 'Compsus', 'Cosmopolites',
  'Metamasius', 'Sitophilus', 'Rhynchophorus', 'Oligonychus', 'Tetranychus',
  'Aceria', 'Polyphagotarsonemus', 'Aleurothrixus', 'Icerya', 'Planococcus',
  'Pseudococcus', 'Aonidiella', 'Saissetia',
];

/** Géneros que son HONGOS/OOMICETOS/BACTERIAS — pertenecen a enfermedades_criticas. */
export const PATHOGEN_GENERA = [
  'Phytophthora', 'Alternaria', 'Rhizoctonia', 'Fusarium', 'Sclerotinia', 'Sclerotium',
  'Botrytis', 'Colletotrichum', 'Cercospora', 'Septoria', 'Puccinia', 'Uromyces',
  'Hemileia', 'Pyricularia', 'Peronospora', 'Pythium', 'Verticillium', 'Mycosphaerella',
  'Erysiphe', 'Oidium', 'Venturia', 'Monilinia', 'Rosellinia', 'Corynespora',
  'Xanthomonas', 'Pseudomonas', 'Erwinia', 'Ralstonia', 'Pectobacterium', 'Dickeya',
  'Clavibacter', 'Agrobacterium', 'Candidatus', 'Moniliophthora', 'Ceratocystis',
  'Guignardia', 'Elsinoe', 'Cladosporium', 'Curvularia', 'Bipolaris', 'Helminthosporium',
  'Diaporthe', 'Lasiodiplodia', 'Armillaria', 'Ganoderma',
];

/** Géneros de nematodos — conteo agronómico convencional: van en plagas_criticas. */
export const NEMATODE_GENERA = [
  'Globodera', 'Meloidogyne', 'Nacobbus', 'Pratylenchus', 'Radopholus', 'Ditylenchus',
  'Xiphinema', 'Heterodera', 'Rotylenchulus', 'Helicotylenchus',
];

/** Marcador de virus (van en enfermedades_criticas: nombre "virus" o acrónimo tipo TYLCV/PVY). */
const VIRUS_RE = /\bvirus\b/i;
const VIRUS_ACRONYM_RE = /\b[A-Z]{2,6}V\b/;

function isVirusText(text) {
  return VIRUS_RE.test(text) || VIRUS_ACRONYM_RE.test(text);
}

function genusHitRe(genera) {
  // Une los géneros en una sola alternancia con límites de palabra.
  return new RegExp(`\\b(${genera.join('|')})\\b`);
}
const INSECT_RE = genusHitRe(INSECT_GENERA);
const PATHOGEN_RE = genusHitRe(PATHOGEN_GENERA);
const NEMATODE_RE = genusHitRe(NEMATODE_GENERA);

/**
 * Frases marcadoras de etiqueta GENÉRICA de control biológico (clase 5).
 * Vocabulario estructural, no nombres de organismos concretos — análogo a
 * los léxicos de género de arriba.
 */
const GENERIC_LABEL_MARKERS = ['control biologico', 'antagonista del suelo'];
/** Código interno de pipeline dejado como si fuera nombre (p. ej. "(DR-MIP-1)"). */
const CODE_PLACEHOLDER_RE = /\((?:DR|MIP|BATCH|TMP|WIP)[-_][A-Z0-9-]+\)/i;

/** Palabras descriptivas que NO identifican un cultivo (para el léxico dinámico). */
const CROP_TOKEN_STOPWORDS = new Set([
  'comun', 'comuna', 'criolla', 'criollo', 'silvestre', 'dulce', 'amargo', 'amarga',
  'negro', 'negra', 'blanco', 'blanca', 'rojo', 'roja', 'verde', 'amarillo', 'amarilla',
  'morado', 'morada', 'andina', 'andino', 'nativa', 'nativo', 'tradicional', 'cultivada',
  'cultivado', 'gigante', 'enano', 'enana', 'real', 'falso', 'falsa', 'tipo', 'variedad',
  'especie', 'planta', 'arbol', 'arbusto', 'hierba', 'yerba', 'comercial', 'montana',
  'paramo', 'grande', 'pequena', 'pequeno', 'agria', 'agrio', 'temprana', 'tardia',
  'precoz', 'mejorada', 'hibrida', 'hibrido', 'regional', 'local', 'salvaje', 'domestica',
  'domestico', 'sabanera', 'pastusa', 'unica', 'diacol', 'capiro', 'colombiana',
  'colombiano', 'americana', 'americano',
  // Conectores/descriptores genéricos que aparecen dentro de nombres regionales
  // compuestos (p. ej. "jaul (algunas zonas)") — no identifican cultivo alguno.
  'algunas', 'algunos', 'zonas', 'zona', 'region', 'regiones', 'area', 'areas',
  'parte', 'partes', 'tambien', 'radical', 'radicular',
  // Partes de planta genéricas: aparecen como cabeza de algún nombre común
  // coloquial (p. ej. "Botón de oro") pero también como vocabulario
  // anatómico genérico en descripciones de plaga/enfermedad de OTRAS
  // especies ("Mosca del botón floral" en pitahaya) — demasiado ambiguas
  // para servir de identificador de cultivo.
  'boton', 'cogollo', 'flor', 'fruto', 'hoja', 'tallo', 'raiz', 'semilla',
  'vaina', 'espiga', 'racimo', 'panoja',
]);

// =============================================================================
// Normalización de texto (puro)
// =============================================================================

/** Minúsculas + sin tildes, para comparar tokens/etiquetas sin ruido diacrítico. */
export function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function tokenize(text) {
  return normalizeText(text)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4 && !CROP_TOKEN_STOPWORDS.has(t));
}

/**
 * Tokeniza un NOMBRE de especie (común/regional) — a diferencia de
 * `tokenize`, descarta el contenido entre paréntesis, porque en nombres
 * suele traer aclaraciones ("jaul (algunas zonas)") que no son parte del
 * nombre. NO se usa para texto libre de plaga/enfermedad (ahí el contenido
 * entre paréntesis SÍ suele traer la mención de cultivo relevante, p. ej.
 * "Pyricularia oryzae (quema del arroz)").
 */
function tokenizeName(text) {
  return tokenize(String(text || '').replace(/\([^)]*\)/g, ' '));
}

// =============================================================================
// Carga de catálogo (puro salvo I/O de fs)
// =============================================================================

/**
 * Descubre y carga todos los archivos `catalog/*.json` con forma
 * `{species:[...]}`. NO hay nombres de archivo hardcodeados: cualquier
 * archivo nuevo con esa forma se incluye automáticamente.
 *
 * @param {string} dir
 * @returns {Array<{file:string, species:Array<object>}>}
 */
export function loadCatalogSpeciesFiles(dir = DEFAULT_CATALOG_DIR) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    let data;
    try {
      data = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    } catch {
      continue;
    }
    if (Array.isArray(data.species)) out.push({ file, species: data.species });
  }
  return out;
}

/**
 * Descubre y carga todos los archivos `catalog/*.json` con forma
 * `{biopreparados:[...]}`.
 *
 * @param {string} dir
 * @returns {Array<{file:string, biopreparados:Array<object>}>}
 */
export function loadCatalogBiopreparadoFiles(dir = DEFAULT_CATALOG_DIR) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    let data;
    try {
      data = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    } catch {
      continue;
    }
    if (Array.isArray(data.biopreparados)) out.push({ file, biopreparados: data.biopreparados });
  }
  return out;
}

export function loadGraphSnapshot(path = DEFAULT_GRAPH_SNAPSHOT) {
  if (!path || !existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

const PEST_FIELDS = ['plagas_criticas', 'enfermedades_criticas'];

// =============================================================================
// Clase 1 — cruce de cultivo
// =============================================================================

/**
 * Construye dinámicamente un léxico token → familia_botanica a partir de los
 * nombres (común + regionales) de TODAS las especies del catálogo. Solo se
 * conservan tokens que:
 *   (a) identifican una única familia en todo el corpus (si un token aparece
 *       en especies de 2+ familias distintas, es ambiguo y se descarta),
 *   (b) no son ruido (aparecen en <=15 especies distintas), y
 *   (c) son la PRIMERA palabra (cabeza del nombre) del `nombre_comun` de
 *       alguna especie — p. ej. en "Lechuga cogollo morada" la cabeza es
 *       "lechuga"; en "Café caturra / Castillo / Cenicafé 1" es "cafe". Las
 *       palabras que van DESPUÉS de la cabeza suelen ser adjetivos/
 *       descriptores de variedad ("cogollo", "tropical", "boton") — no
 *       identifican el cultivo y quedan afuera del léxico aunque coincidan
 *       en familia. Esto reduce falsos positivos sin ninguna lista
 *       hardcodeada de cultivos: la señal sigue siendo 100% derivada del
 *       propio catálogo.
 *
 * @param {Array<object>} allSpecies
 * @returns {Map<string, string>}
 */
export function buildCropLexicon(allSpecies) {
  const tokenFamilies = new Map(); // token -> Map(familia -> Set(speciesId))
  const headTokens = new Set(); // primera palabra del nombre_comun (alta confianza)
  for (const sp of allSpecies) {
    if (!sp.familia_botanica) continue;
    const head = tokenizeName(String(sp.nombre_comun || '').split('/')[0])[0];
    if (head) headTokens.add(head);
    const names = [sp.nombre_comun, ...(sp.nombre_comunes_regionales || [])].filter(Boolean);
    const tokens = new Set(names.flatMap((n) => tokenizeName(n)));
    for (const tok of tokens) {
      if (!tokenFamilies.has(tok)) tokenFamilies.set(tok, new Map());
      const byFamilia = tokenFamilies.get(tok);
      if (!byFamilia.has(sp.familia_botanica)) byFamilia.set(sp.familia_botanica, new Set());
      byFamilia.get(sp.familia_botanica).add(sp.id);
    }
  }
  const lexicon = new Map();
  for (const [tok, byFamilia] of tokenFamilies) {
    if (!headTokens.has(tok)) continue; // no es cabeza de ningun nombre_comun: descartar
    if (byFamilia.size !== 1) continue; // ambiguo entre familias: descartar
    const [familia, speciesIds] = [...byFamilia.entries()][0];
    if (speciesIds.size > 15) continue; // demasiado genérico (ruido)
    lexicon.set(tok, familia);
  }
  return lexicon;
}

function selfTokensOf(species) {
  const names = [species.nombre_comun, species.nombre_cientifico, ...(species.nombre_comunes_regionales || [])].filter(Boolean);
  return new Set(names.flatMap((n) => tokenizeName(n)));
}

/**
 * Clase 1a: para cada especie, busca en sus campos plagas_criticas/
 * enfermedades_criticas menciones de un token de cultivo que pertenece a una
 * familia botánica DISTINTA a la propia.
 *
 * @param {Array<{file:string, species:Array<object>}>} catalogFiles
 * @param {Map<string,string>} cropLexicon
 * @returns {Array<object>} findings
 */
export function detectCruceCultivoPorToken(catalogFiles, cropLexicon) {
  const findings = [];
  for (const { file, species } of catalogFiles) {
    for (const sp of species) {
      if (!sp.familia_botanica) continue;
      const selfTokens = selfTokensOf(sp);
      for (const campo of PEST_FIELDS) {
        for (const entry of sp[campo] || []) {
          if (typeof entry !== 'string') continue;
          for (const tok of tokenize(entry)) {
            if (selfTokens.has(tok)) continue;
            const familiaToken = cropLexicon.get(tok);
            if (!familiaToken || familiaToken === sp.familia_botanica) continue;
            findings.push({
              clase: 'cruce_cultivo',
              tipo: 'token_cultivo_ajeno',
              file,
              speciesId: sp.id,
              speciesNombre: sp.nombre_comun,
              familiaEspecie: sp.familia_botanica,
              campo,
              entry,
              cropToken: tok,
              familiaCultivoMencionado: familiaToken,
            });
          }
        }
      }
    }
  }
  return findings;
}

/**
 * Clase 1b: agrupa menciones de organismo (nombre científico extraído) por
 * especie, y detecta cuando un organismo está ligado mayoritariamente a
 * especies de una familia y aparece también, en minoría, ligado a una
 * especie de familia distinta — la especie minoritaria es candidata a
 * contaminación cruzada.
 *
 * Limitación conocida: organismos genuinamente polífagos (p. ej. Botrytis
 * cinerea, Colletotrichum spp., Frankliniella spp. — atacan decenas de
 * familias distintas en la vida real) pueden generar hallazgos de baja
 * confianza cuando el catálogo solo tiene 2-3 especies de esas familias
 * representadas. El campo `soporteEsperado` en el hallazgo indica cuántas
 * especies respaldan la familia "mayoritaria" — soporte bajo (2) amerita
 * revisión humana antes de tratarlo como bug real; por eso quedan como
 * hallazgos de catálogo (revisables), no como aserciones automáticas.
 *
 * @param {Array<{file:string, species:Array<object>}>} catalogFiles
 * @returns {Array<object>} findings
 */
export function detectCruceCultivoPorOrganismo(catalogFiles) {
  /** @type {Map<string, Map<string, {familia:string, nombre:string, files:Set<string>}>>} */
  const organismIndex = new Map();
  for (const { file, species } of catalogFiles) {
    for (const sp of species) {
      if (!sp.familia_botanica) continue;
      for (const campo of PEST_FIELDS) {
        for (const entry of sp[campo] || []) {
          if (typeof entry !== 'string') continue;
          for (const { scientific } of extractOrganismMentions(entry)) {
            const key = normalizeText(scientific);
            if (!organismIndex.has(key)) organismIndex.set(key, new Map());
            const bySpecies = organismIndex.get(key);
            if (!bySpecies.has(sp.id)) {
              bySpecies.set(sp.id, { familia: sp.familia_botanica, nombre: sp.nombre_comun, files: new Set() });
            }
            bySpecies.get(sp.id).files.add(file);
          }
        }
      }
    }
  }

  const findings = [];
  for (const [organismo, bySpecies] of organismIndex) {
    if (bySpecies.size < 2) continue;
    const countByFamilia = new Map();
    for (const { familia } of bySpecies.values()) {
      countByFamilia.set(familia, (countByFamilia.get(familia) || 0) + 1);
    }
    if (countByFamilia.size < 2) continue; // una sola familia: consistente
    const [familiaMayoritaria] = [...countByFamilia.entries()].sort((a, b) => b[1] - a[1])[0];
    const majorityCount = countByFamilia.get(familiaMayoritaria);
    // Exige mayoria real (>=2 especies de acuerdo) antes de senalar outliers.
    // Sin este piso, un pathogeno generalista ligado a 4-5 familias distintas
    // con soporte 1 cada una produce un "ganador" arbitrario por orden de
    // sort y falsos positivos contra especies perfectamente legitimas.
    if (majorityCount < 2) continue;
    for (const [speciesId, info] of bySpecies) {
      if (info.familia === familiaMayoritaria) continue;
      if (countByFamilia.get(info.familia) >= majorityCount) continue; // empate: no hay mayoría clara
      findings.push({
        clase: 'cruce_cultivo',
        tipo: 'organismo_familia_atipica',
        organismo,
        speciesId,
        speciesNombre: info.nombre,
        familiaEncontrada: info.familia,
        familiaEsperada: familiaMayoritaria,
        soporteEsperado: majorityCount,
        files: [...info.files],
      });
    }
  }
  return findings;
}

/**
 * Clase 1c (grafo): usa las propiedades `cultivos_afectados` de los nodos
 * Pest y las aristas Pest-AFFECTS->Species reales del grafo para detectar
 * inconsistencias entre lo que el Pest DICE afectar y a qué Species está
 * realmente ligado.
 *
 * @param {object|null} graphSnapshot
 * @param {Map<string,string>} cropLexicon
 * @returns {Array<object>} findings
 */
export function detectCruceCultivoGrafo(graphSnapshot, cropLexicon) {
  if (!graphSnapshot) return [];
  const speciesById = new Map(
    (graphSnapshot.nodes || [])
      .filter((n) => (n.labels || []).includes('Species'))
      .map((n) => [n.id, n.properties || {}]),
  );
  const pestAffectsSpecies = new Map(); // pestId -> Set(speciesId)
  for (const e of graphSnapshot.edges || []) {
    if (e.label !== 'AFFECTS') continue;
    if (!pestAffectsSpecies.has(e.source)) pestAffectsSpecies.set(e.source, new Set());
    pestAffectsSpecies.get(e.source).add(e.target);
  }

  const findings = [];
  for (const node of graphSnapshot.nodes || []) {
    if (!(node.labels || []).includes('Pest')) continue;
    const props = node.properties || {};
    if (!props.cultivos_afectados) continue;
    const affectedFamilias = new Set(
      [...(pestAffectsSpecies.get(node.id) || [])]
        .map((sid) => speciesById.get(sid)?.familia_botanica)
        .filter(Boolean),
    );
    if (affectedFamilias.size === 0) continue; // sin aristas reales: no hay con qué contrastar
    for (const tok of tokenize(props.cultivos_afectados)) {
      const familiaToken = cropLexicon.get(tok);
      if (!familiaToken) continue;
      if (affectedFamilias.has(familiaToken)) continue;
      findings.push({
        clase: 'cruce_cultivo',
        tipo: 'grafo_cultivos_afectados_vs_aristas',
        pestId: node.id,
        pestNombre: props.nombre_comun || props.nombre || props.id,
        cropToken: tok,
        familiaCultivoMencionado: familiaToken,
        familiasLigadasEnGrafo: [...affectedFamilias],
      });
    }
  }
  return findings;
}

// =============================================================================
// Clase 2 — miscategorización (insecto en enfermedad, patógeno en plaga)
// =============================================================================

/**
 * @param {Array<{file:string, species:Array<object>}>} catalogFiles
 * @returns {Array<object>} findings
 */
export function detectMiscategorizacion(catalogFiles) {
  const findings = [];
  for (const { file, species } of catalogFiles) {
    for (const sp of species) {
      for (const entry of sp.enfermedades_criticas || []) {
        if (typeof entry !== 'string') continue;
        const isPathogen = PATHOGEN_RE.test(entry) || isVirusText(entry);
        const isInsectOrNematode = INSECT_RE.test(entry) || NEMATODE_RE.test(entry);
        if (isInsectOrNematode && !isPathogen) {
          findings.push({
            clase: 'miscategorizacion', tipo: 'insecto_en_enfermedades',
            file, speciesId: sp.id, speciesNombre: sp.nombre_comun, campo: 'enfermedades_criticas', entry,
          });
        }
      }
      for (const entry of sp.plagas_criticas || []) {
        if (typeof entry !== 'string') continue;
        const isPathogen = PATHOGEN_RE.test(entry) || isVirusText(entry);
        const isInsectOrNematode = INSECT_RE.test(entry) || NEMATODE_RE.test(entry);
        if (isPathogen && !isInsectOrNematode) {
          findings.push({
            clase: 'miscategorizacion', tipo: 'patogeno_en_plagas',
            file, speciesId: sp.id, speciesNombre: sp.nombre_comun, campo: 'plagas_criticas', entry,
          });
        }
      }
    }
  }
  return findings;
}

// =============================================================================
// Clase 3 — duplicados (mismo organismo, nombres/datos distintos)
// =============================================================================

/**
 * Extrae menciones de organismo desde un string de catálogo. Heurística
 * best-effort: reconoce "Genus species (nombre común)", "Nombre común
 * (Genus species)" y binomios con "/" (varias especies del mismo género
 * comparten common name). No pretende ser un parser NLP completo — casos no
 * cubiertos simplemente no producen mención (fail-safe, no fail-open).
 *
 * @param {string} text
 * @returns {Array<{scientific:string, common:string|null}>}
 */
export function extractOrganismMentions(text) {
  if (!text || typeof text !== 'string') return [];
  const m = text.match(/^([^(]+?)\s*(?:\(([^)]*)\))?\s*(?:[—-]\s*.*)?$/);
  if (!m) return [];
  const lead = m[1].trim();
  const paren = m[2] ? m[2].trim() : null;
  if (BINOMIAL_RE.test(lead)) {
    return lead.split('/').map((s) => ({ scientific: s.trim(), common: paren }));
  }
  if (paren && BINOMIAL_RE.test(paren)) {
    return paren.split('/').map((s) => ({ scientific: s.trim(), common: lead }));
  }
  return [];
}
const BINOMIAL_RE = /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+(?:spp\.?|[a-záéíóúñ.]+)(?:\s*\/\s*[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+(?:spp\.?|[a-záéíóúñ.]+))*$/;

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[n];
}

/**
 * @param {Array<{file:string, species:Array<object>}>} catalogFiles
 * @returns {Array<object>} findings
 */
export function detectDuplicados(catalogFiles) {
  const sciToCommon = new Map(); // sciNorm -> Map(commonNorm -> {common, files:Set, speciesIds:Set})
  const commonToSci = new Map(); // commonNorm -> Map(sciNorm -> {sci, files:Set, speciesIds:Set})

  for (const { file, species } of catalogFiles) {
    for (const sp of species) {
      for (const campo of PEST_FIELDS) {
        for (const entry of sp[campo] || []) {
          if (typeof entry !== 'string') continue;
          for (const { scientific, common } of extractOrganismMentions(entry)) {
            if (!common) continue;
            const sciNorm = normalizeText(scientific);
            const commonNorm = normalizeText(common);
            if (!sciToCommon.has(sciNorm)) sciToCommon.set(sciNorm, new Map());
            const cMap = sciToCommon.get(sciNorm);
            if (!cMap.has(commonNorm)) cMap.set(commonNorm, { common, files: new Set(), speciesIds: new Set() });
            cMap.get(commonNorm).files.add(file);
            cMap.get(commonNorm).speciesIds.add(sp.id);

            if (!commonToSci.has(commonNorm)) commonToSci.set(commonNorm, new Map());
            const sMap = commonToSci.get(commonNorm);
            if (!sMap.has(sciNorm)) sMap.set(sciNorm, { scientific, files: new Set(), speciesIds: new Set() });
            sMap.get(sciNorm).files.add(file);
            sMap.get(sciNorm).speciesIds.add(sp.id);
          }
        }
      }
    }
  }

  const findings = [];

  // (a) mismo nombre común -> 2+ nombres científicos distintos.
  for (const [commonNorm, sMap] of commonToSci) {
    if (sMap.size < 2) continue;
    findings.push({
      clase: 'duplicado', tipo: 'nombre_comun_ambiguo',
      nombreComun: commonNorm,
      cientificos: [...sMap.entries()].map(([sci, info]) => ({
        cientifico: info.scientific, files: [...info.files], speciesIds: [...info.speciesIds],
      })),
    });
  }

  // (b) mismo nombre científico -> 2+ nombres comunes distintos (posible inconsistencia).
  for (const [sciNorm, cMap] of sciToCommon) {
    if (cMap.size < 2) continue;
    findings.push({
      clase: 'duplicado', tipo: 'nombre_cientifico_con_comunes_inconsistentes',
      cientifico: sciNorm,
      comunes: [...cMap.entries()].map(([common, info]) => ({
        comun: info.common, files: [...info.files], speciesIds: [...info.speciesIds],
      })),
    });
  }

  // (c) nombres científicos casi idénticos (posible typo/duplicado tipográfico).
  const allSci = [...sciToCommon.keys()];
  for (let i = 0; i < allSci.length; i++) {
    for (let j = i + 1; j < allSci.length; j++) {
      const a = allSci[i];
      const b = allSci[j];
      if (a === b) continue;
      const genusA = a.split(' ')[0];
      const genusB = b.split(' ')[0];
      if (genusA !== genusB) continue; // solo compara dentro del mismo género
      const dist = levenshtein(a, b);
      const maxLen = Math.max(a.length, b.length);
      if (dist > 0 && dist <= 2 && maxLen >= 10) {
        findings.push({
          clase: 'duplicado', tipo: 'nombre_cientifico_tipografico',
          a, b, distancia: dist,
        });
      }
    }
  }

  return findings;
}

// =============================================================================
// Clase 4 — sobre-asociación (outlier estadístico, umbral derivado del dato)
// =============================================================================

/** Cerca superior de Tukey (Q3 + 1.5*IQR) — outlier "razonable" derivado del propio corpus. */
export function tukeyUpperFence(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n < 4) return Infinity; // corpus insuficiente para inferir un umbral confiable
  const q = (p) => {
    const idx = (n - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  };
  const q1 = q(0.25);
  const q3 = q(0.75);
  const iqr = q3 - q1;
  if (iqr === 0) return Math.max(q3 * 2, 12); // sin varianza: usa piso razonable documentado
  return q3 + 1.5 * iqr;
}

/**
 * Clase 4a (catálogo): cuenta biofertilizer_slug distintos en
 * feeding_plan_template.primary_steps por especie y marca outliers vs. el
 * resto del corpus (cerca de Tukey).
 *
 * @param {Array<{file:string, species:Array<object>}>} catalogFiles
 * @returns {Array<object>} findings
 */
export function detectSobreAsociacionCatalogo(catalogFiles) {
  const records = [];
  for (const { file, species } of catalogFiles) {
    for (const sp of species) {
      const steps = sp.feeding_plan_template?.primary_steps;
      if (!Array.isArray(steps) || steps.length === 0) continue;
      const slugs = new Set(steps.map((s) => s.biofertilizer_slug).filter(Boolean));
      records.push({ file, speciesId: sp.id, speciesNombre: sp.nombre_comun, count: slugs.size });
    }
  }
  const fence = tukeyUpperFence(records.map((r) => r.count));
  return records
    .filter((r) => r.count > fence)
    .map((r) => ({
      clase: 'sobre_asociacion', tipo: 'biopreparados_feeding_plan_outlier',
      file: r.file, speciesId: r.speciesId, speciesNombre: r.speciesNombre,
      count: r.count, umbral: Math.round(fence * 10) / 10,
    }));
}

/**
 * Clase 4b (grafo): cuenta, por especie, cuántos organismos de control
 * (BeneficialOrganism + Biopreparado, vía CONTROLS -> Pest -> AFFECTS ->
 * Species) están asociados transitivamente, y marca outliers.
 *
 * @param {object|null} graphSnapshot
 * @returns {Array<object>} findings
 */
export function detectSobreAsociacionGrafo(graphSnapshot) {
  if (!graphSnapshot) return [];
  const pestBySpecies = new Map(); // speciesId -> Set(pestId)
  const controllersByPest = new Map(); // pestId -> Set(controllerId)
  for (const e of graphSnapshot.edges || []) {
    if (e.label === 'AFFECTS') {
      if (!pestBySpecies.has(e.target)) pestBySpecies.set(e.target, new Set());
      pestBySpecies.get(e.target).add(e.source);
    } else if (e.label === 'CONTROLS') {
      if (!controllersByPest.has(e.target)) controllersByPest.set(e.target, new Set());
      controllersByPest.get(e.target).add(e.source);
    }
  }
  const speciesNames = new Map(
    (graphSnapshot.nodes || [])
      .filter((n) => (n.labels || []).includes('Species'))
      .map((n) => [n.id, n.properties?.nombre_comun]),
  );

  const records = [];
  for (const [speciesId, pestIds] of pestBySpecies) {
    const controllers = new Set();
    for (const pid of pestIds) {
      for (const cid of controllersByPest.get(pid) || []) controllers.add(cid);
    }
    records.push({ speciesId, speciesNombre: speciesNames.get(speciesId), pestCount: pestIds.size, controlCount: controllers.size });
  }
  const fence = tukeyUpperFence(records.map((r) => r.controlCount));
  return records
    .filter((r) => r.controlCount > fence)
    .map((r) => ({
      clase: 'sobre_asociacion', tipo: 'controles_grafo_outlier',
      speciesId: r.speciesId, speciesNombre: r.speciesNombre,
      pestCount: r.pestCount, controlCount: r.controlCount, umbral: Math.round(fence * 10) / 10,
    }));
}

// =============================================================================
// Clase 5 — placeholders (etiquetas genéricas no específicas)
// =============================================================================

/**
 * Detecta etiquetas genéricas dentro de una lista homogénea de entidades
 * `{id, label}` (organismos benéficos, biopreparados, controles). Señal
 * primaria (dinámica): la MISMA etiqueta se reutiliza verbatim para 2+ ids
 * distintos — eso ya prueba que no es específica, sin necesidad de lista
 * alguna. Señal secundaria (léxico chico, ver GENERIC_LABEL_MARKERS arriba):
 * la etiqueta contiene una frase marcadora genérica, o un código interno de
 * pipeline entre paréntesis (p. ej. "(DR-MIP-1)") en vez de un calificador
 * específico.
 *
 * @param {Array<{id:string, label:string|null|undefined}>} entities
 * @param {{source:string}} opts
 * @returns {Array<object>} findings
 */
export function detectPlaceholders(entities, opts = {}) {
  const source = opts.source || 'desconocido';
  const findings = [];
  const byLabel = new Map(); // labelNorm -> {label, ids:Set}
  for (const e of entities) {
    if (!e.label) continue;
    const norm = normalizeText(e.label);
    if (!byLabel.has(norm)) byLabel.set(norm, { label: e.label, ids: new Set() });
    byLabel.get(norm).ids.add(e.id);
  }

  for (const [norm, info] of byLabel) {
    const reused = info.ids.size >= 2;
    const hasMarker = GENERIC_LABEL_MARKERS.some((marker) => norm.includes(marker));
    const hasCode = CODE_PLACEHOLDER_RE.test(info.label);
    if (!reused && !hasMarker && !hasCode) continue;
    findings.push({
      clase: 'placeholder',
      tipo: hasCode ? 'etiqueta_con_codigo_interno' : reused ? 'etiqueta_generica_reutilizada' : 'etiqueta_generica_estructural',
      source,
      label: info.label,
      idsAfectados: [...info.ids],
      countIdsAfectados: info.ids.size,
    });
  }
  return findings;
}

// =============================================================================
// Orquestación + reporte
// =============================================================================

/**
 * Corre las 5 clases de detección sobre catálogo (+ grafo si hay snapshot
 * disponible) y arma un reporte agregado.
 *
 * @param {{catalogDir?:string, graphSnapshotPath?:string|null}} [opts]
 */
export function runAudit(opts = {}) {
  const catalogDir = opts.catalogDir || DEFAULT_CATALOG_DIR;
  const graphSnapshotPath = opts.graphSnapshotPath === null ? null : (opts.graphSnapshotPath || DEFAULT_GRAPH_SNAPSHOT);

  const catalogFiles = loadCatalogSpeciesFiles(catalogDir);
  const biopFiles = loadCatalogBiopreparadoFiles(catalogDir);
  const allSpecies = catalogFiles.flatMap((f) => f.species);
  const cropLexicon = buildCropLexicon(allSpecies);

  const findings = [
    ...detectCruceCultivoPorToken(catalogFiles, cropLexicon),
    ...detectCruceCultivoPorOrganismo(catalogFiles),
    ...detectMiscategorizacion(catalogFiles),
    ...detectDuplicados(catalogFiles),
    ...detectSobreAsociacionCatalogo(catalogFiles),
  ];
  for (const { file, biopreparados } of biopFiles) {
    findings.push(...detectPlaceholders(
      biopreparados.map((b) => ({ id: b.id, label: b.nombre })),
      { source: `catalogo:${file}` },
    ));
  }

  const graphSnapshot = loadGraphSnapshot(graphSnapshotPath);
  if (graphSnapshot) {
    findings.push(...detectCruceCultivoGrafo(graphSnapshot, cropLexicon));
    findings.push(...detectSobreAsociacionGrafo(graphSnapshot));
    const benOrgEntities = (graphSnapshot.nodes || [])
      .filter((n) => (n.labels || []).includes('BeneficialOrganism'))
      .map((n) => ({ id: n.id, label: n.properties?.nombre_comun }));
    findings.push(...detectPlaceholders(benOrgEntities, { source: 'grafo:BeneficialOrganism' }));
    const biopEntities = (graphSnapshot.nodes || [])
      .filter((n) => (n.labels || []).includes('Biopreparado'))
      .map((n) => ({ id: n.id, label: n.properties?.nombre }));
    findings.push(...detectPlaceholders(biopEntities, { source: 'grafo:Biopreparado' }));
  }

  return buildReport(findings, {
    catalogDir, graphSnapshotPath, graphAuditado: Boolean(graphSnapshot),
    filesAuditados: catalogFiles.map((f) => f.file),
  });
}

const CLASES = ['cruce_cultivo', 'miscategorizacion', 'duplicado', 'sobre_asociacion', 'placeholder'];

/** Identificador estable por hallazgo, para el gate de regresión (baseline). */
export function fingerprintOf(finding) {
  switch (finding.clase) {
    case 'cruce_cultivo':
      if (finding.tipo === 'token_cultivo_ajeno') return `cruce_cultivo:token:${finding.speciesId}:${finding.campo}:${normalizeText(finding.entry)}`;
      if (finding.tipo === 'organismo_familia_atipica') return `cruce_cultivo:organismo:${finding.organismo}:${finding.speciesId}`;
      return `cruce_cultivo:grafo:${finding.pestId}:${finding.cropToken}`;
    case 'miscategorizacion':
      return `miscategorizacion:${finding.tipo}:${finding.speciesId}:${normalizeText(finding.entry)}`;
    case 'duplicado':
      if (finding.tipo === 'nombre_comun_ambiguo') return `duplicado:comun:${finding.nombreComun}`;
      if (finding.tipo === 'nombre_cientifico_con_comunes_inconsistentes') return `duplicado:cientifico:${finding.cientifico}`;
      return `duplicado:tipografico:${finding.a}:${finding.b}`;
    case 'sobre_asociacion':
      return `sobre_asociacion:${finding.tipo}:${finding.speciesId}`;
    case 'placeholder':
      return `placeholder:${finding.source}:${normalizeText(finding.label)}`;
    default:
      return JSON.stringify(finding);
  }
}

/**
 * @param {Array<object>} findings
 * @param {object} [meta]
 */
export function buildReport(findings, meta = {}) {
  const porClase = {};
  const especiesAfectadasPorClase = {};
  for (const clase of CLASES) porClase[clase] = 0;

  for (const f of findings) {
    porClase[f.clase] = (porClase[f.clase] || 0) + 1;
    const speciesIds = f.speciesId ? [f.speciesId]
      : f.speciesIds || (f.cientificos ? f.cientificos.flatMap((c) => c.speciesIds) : [])
      || (f.comunes ? f.comunes.flatMap((c) => c.speciesIds) : []);
    if (!especiesAfectadasPorClase[f.clase]) especiesAfectadasPorClase[f.clase] = new Set();
    for (const id of speciesIds) especiesAfectadasPorClase[f.clase].add(id);
  }

  const especiesAfectadasCount = {};
  for (const clase of CLASES) especiesAfectadasCount[clase] = (especiesAfectadasPorClase[clase] || new Set()).size;

  return {
    generatedAt: new Date().toISOString(),
    meta,
    total: findings.length,
    porClase,
    especiesAfectadasPorClase: especiesAfectadasCount,
    findings: findings.map((f) => ({ ...f, fingerprint: fingerprintOf(f) })),
  };
}

const CLASE_LABELS = {
  cruce_cultivo: 'Cruce de cultivo (plaga/enfermedad/biopreparado de otro cultivo)',
  miscategorizacion: 'Miscategorización (insecto/patógeno en el campo equivocado)',
  duplicado: 'Duplicados (mismo organismo, nombres/datos distintos)',
  sobre_asociacion: 'Sobre-asociación (outlier de biopreparados/controles)',
  placeholder: 'Placeholders (etiqueta de control genérica)',
};

export function formatReportText(report) {
  const lines = [];
  lines.push('Auditoria de contaminacion de datos — catalogo + grafo chagra_kg');
  lines.push(`Generado: ${report.generatedAt}`);
  lines.push(`Archivos de catalogo auditados: ${(report.meta.filesAuditados || []).join(', ') || '(ninguno)'}`);
  lines.push(`Grafo chagra_kg auditado: ${report.meta.graphAuditado ? 'si' : 'no (snapshot no encontrado)'}`);
  lines.push(`Total de hallazgos: ${report.total}`);
  lines.push('');
  for (const clase of CLASES) {
    lines.push(`${CLASE_LABELS[clase]}: ${report.porClase[clase]} hallazgos, ${report.especiesAfectadasPorClase[clase]} especies afectadas`);
  }
  lines.push('');
  lines.push('Ejemplos (hasta 5 por clase):');
  for (const clase of CLASES) {
    const ejemplos = report.findings.filter((f) => f.clase === clase).slice(0, 5);
    if (ejemplos.length === 0) continue;
    lines.push(`  [${clase}]`);
    for (const e of ejemplos) {
      lines.push(`    - ${JSON.stringify(e)}`);
    }
  }
  return lines.join('\n');
}

export function formatReportMarkdown(report) {
  const lines = [];
  lines.push('# Auditoría de contaminación de datos — catálogo + grafo chagra_kg');
  lines.push('');
  lines.push(`Generado: ${report.generatedAt}`);
  lines.push('');
  lines.push('Script: `scripts/audit-contaminacion.mjs`. NO modifica catálogo ni grafo — es de solo lectura/reporte. Ejecutar con `node scripts/audit-contaminacion.mjs --json` para el detalle completo o `--write-report` para regenerar este archivo.');
  lines.push('');
  lines.push(`- Archivos de catálogo auditados: ${(report.meta.filesAuditados || []).join(', ') || '(ninguno)'}`);
  lines.push(`- Grafo \`chagra_kg\` auditado: ${report.meta.graphAuditado ? 'sí (snapshot versionado)' : 'no (snapshot no encontrado)'}`);
  lines.push(`- Total de hallazgos: **${report.total}**`);
  lines.push('');
  lines.push('## Resumen cuantificado por clase');
  lines.push('');
  lines.push('| Clase | Hallazgos | Especies/organismos afectados |');
  lines.push('|---|---|---|');
  for (const clase of CLASES) {
    lines.push(`| ${CLASE_LABELS[clase]} | ${report.porClase[clase]} | ${report.especiesAfectadasPorClase[clase]} |`);
  }
  lines.push('');
  for (const clase of CLASES) {
    const ejemplos = report.findings.filter((f) => f.clase === clase);
    lines.push(`## ${CLASE_LABELS[clase]} (${ejemplos.length})`);
    lines.push('');
    if (ejemplos.length === 0) {
      lines.push('Sin hallazgos en esta corrida.');
      lines.push('');
      continue;
    }
    for (const e of ejemplos.slice(0, 25)) {
      lines.push(`- \`${JSON.stringify(e)}\``);
    }
    if (ejemplos.length > 25) lines.push(`- ... y ${ejemplos.length - 25} más (ver \`--json\` para el listado completo).`);
    lines.push('');
  }
  lines.push('## Gate de regresión');
  lines.push('');
  lines.push('Los hallazgos de esta corrida quedan congelados como baseline en `scripts/audit-contaminacion-baseline.json`. `npm test` corre `scripts/__tests__/audit-contaminacion.test.mjs`, que falla si aparecen hallazgos NUEVOS (fingerprint no presente en el baseline) sobre el catálogo/grafo versionado. Bajar el baseline (arreglar datos) es siempre bienvenido: `node scripts/audit-contaminacion.mjs --update-baseline`.');
  lines.push('');
  return lines.join('\n');
}

// =============================================================================
// Baseline (gate estilo scripts/tsc-check-gate.mjs, pero por fingerprint de
// hallazgo en vez de conteo por archivo — semántica más precisa para "fallar
// ante hallazgos NUEVOS" sin que un fix y una regresión simultáneos se
// cancelen en el conteo total).
// =============================================================================

export function loadBaseline(path = DEFAULT_BASELINE_PATH) {
  if (!existsSync(path)) return { generatedAt: null, fingerprints: [] };
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return { generatedAt: null, fingerprints: [] };
  }
}

export function saveBaseline(report, path = DEFAULT_BASELINE_PATH) {
  const baseline = {
    generatedAt: report.generatedAt,
    total: report.total,
    porClase: report.porClase,
    fingerprints: [...new Set(report.findings.map((f) => f.fingerprint))].sort(),
  };
  writeFileSync(path, JSON.stringify(baseline, null, 2) + '\n');
  return baseline;
}

/**
 * Compara el reporte actual contra el baseline y devuelve los hallazgos
 * NUEVOS (fingerprint no presente en baseline). Vacío = gate en verde.
 *
 * @param {ReturnType<typeof buildReport>} report
 * @param {{fingerprints:string[]}} baseline
 */
export function diffAgainstBaseline(report, baseline) {
  const known = new Set(baseline.fingerprints || []);
  return report.findings.filter((f) => !known.has(f.fingerprint));
}

// =============================================================================
// CLI
// =============================================================================

export function parseArgs(argv) {
  const opts = {
    json: false, check: false, updateBaseline: false, force: false,
    writeReport: null, catalogDir: null, graphSnapshotPath: undefined, help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') opts.json = true;
    else if (a === '--check') opts.check = true;
    else if (a === '--update-baseline') opts.updateBaseline = true;
    else if (a === '--force') opts.force = true;
    else if (a === '--write-report') opts.writeReport = argv[++i];
    else if (a === '--catalog-dir') opts.catalogDir = argv[++i];
    else if (a === '--graph-snapshot') opts.graphSnapshotPath = argv[++i];
    else if (a === '--no-graph') opts.graphSnapshotPath = null;
    else if (a === '--help' || a === '-h') opts.help = true;
  }
  return opts;
}

export function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.help) {
    console.log(
      'Uso: node scripts/audit-contaminacion.mjs [--json] [--check] [--update-baseline]\n'
      + '     [--force] [--write-report FILE.md] [--catalog-dir DIR] [--graph-snapshot FILE|--no-graph]\n\n'
      + '  --check            Gate CI: exit 1 si hay hallazgos nuevos vs. el baseline.\n'
      + '  --update-baseline  Sincroniza scripts/audit-contaminacion-baseline.json con el estado actual.\n'
      + '  --write-report F   Escribe el reporte en markdown en la ruta F.\n',
    );
    return 0;
  }

  const report = runAudit({
    catalogDir: opts.catalogDir || undefined,
    graphSnapshotPath: opts.graphSnapshotPath,
  });

  if (opts.writeReport) {
    writeFileSync(opts.writeReport, formatReportMarkdown(report));
    console.log(`Reporte escrito en ${opts.writeReport}`);
  }

  if (opts.updateBaseline) {
    const previous = loadBaseline();
    if (!opts.force && previous.total !== undefined && report.total > previous.total) {
      console.error(
        `El baseline actual tiene ${report.total} hallazgos, mas que el vigente (${previous.total}). `
        + 'Use --force si es un aumento consciente (p. ej. datos nuevos ingeridos que aun no se limpiaron).',
      );
      return 2;
    }
    const saved = saveBaseline(report);
    console.log(`Baseline actualizado: ${saved.fingerprints.length} hallazgos congelados en ${DEFAULT_BASELINE_PATH}`);
    return 0;
  }

  if (opts.check) {
    const baseline = loadBaseline();
    const nuevos = diffAgainstBaseline(report, baseline);
    if (nuevos.length > 0) {
      console.error(`Gate de contaminacion FALLIDO: ${nuevos.length} hallazgos NUEVOS vs. el baseline.`);
      for (const f of nuevos.slice(0, 20)) console.error(`  - ${JSON.stringify(f)}`);
      return 1;
    }
    console.log(`Gate de contaminacion OK: sin hallazgos nuevos (baseline: ${baseline.fingerprints.length}, actual: ${report.findings.length}).`);
    return 0;
  }

  if (opts.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatReportText(report));
  }
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.exitCode = main();
  } catch (e) {
    console.error('[audit-contaminacion] ' + e.message);
    process.exitCode = 2;
  }
}
