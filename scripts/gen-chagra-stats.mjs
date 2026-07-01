#!/usr/bin/env node
/**
 * scripts/gen-chagra-stats.mjs
 * ================================================================
 * FUENTE ÚNICA DE VERDAD de "qué tiene Chagra hoy" — genera
 * `public/chagra-stats.json`, el archivo estático que login, chagra.bio
 * y cualquier tablero de desarrollo deben consultar en vez de
 * hardcodear números de especies/biopreparados/MIP/verificación en
 * varios lugares distintos (el problema exacto que este script cierra).
 *
 * Qué hace
 * --------
 * 1. Lee el catálogo CANÓNICO que shipea (ver catalog/CATALOG_VERSIONS.md):
 *    `catalog/chagra-catalog-oss-subset-v3.2.json`. Cuenta especies,
 *    biopreparados (+ cuántos tienen `safety_class` poblado — trabajo de
 *    seguridad estructurada reciente) y fuentes (+ cuántas con `doi` /
 *    `tier: "A"`).
 * 2. Lee `src/data/graph-stats-snapshot.json` — un snapshot ESTÁTICO del
 *    grafo de conocimiento (nodos, aristas, aristas por tipo, aristas
 *    CONTROLS verificadas con DOI, plagas con MIP completo, cobertura por
 *    vertical). Este script NUNCA toca la base de datos — el build no tiene
 *    acceso al backend del grafo. El snapshot se refresca aparte, cuando
 *    haga falta, con el proceso de ops documentado en Chagra-strategy
 *    (privado).
 * 3. Combina ambos en un único JSON con schema fijo (ver `buildStats`) y lo
 *    escribe en `public/chagra-stats.json` — servible estático,
 *    fetcheable en runtime desde `/chagra-stats.json`.
 *
 * Por qué `catalogo.mip_plagas` sale del grafo y no del catálogo JSON
 * ---------------------------------------------------------------------
 * El catálogo (`catalog/schema-v3.1.json`) SÍ tiene un campo
 * `plagas_criticas` por especie, pero hoy es un `array` sin sub-schema
 * (schema-v3.1.json:866) y ninguna entrada shipeada trae `umbral_accion`
 * / `control_biologico` con esa granularidad — esos campos MIP completos
 * solo existen hoy en los nodos `Pest` del grafo AGE (163 de 318 con
 * tratamiento MIP completo, ver auditoría 2026-06-28). Por honestidad
 * anti-invento, este generador NO computa `mip_plagas` contando el
 * catálogo (daría 0 o un número parcial engañoso) — lo toma tal cual del
 * snapshot del grafo, que es donde vive el dato real hoy. Si en el futuro
 * el catálogo empieza a traer `umbral_accion`/`control_biologico` por
 * especie, este script debe migrar a contarlo ahí (issue documentado,
 * fuera de alcance de este cambio).
 *
 * Anti-leak (repo público, ver Chagra-strategy/ops/AI_PIPELINE_SOP.md §2)
 * ------------------------------------------------------------------------
 * `public/chagra-stats.json` es PÚBLICO. Solo contiene CONTEOS agregados
 * (números, porcentajes, nombres de tipos de arista). Prohibido agregar
 * aquí: rutas de infraestructura, hosts, IPs, ids de contenido chagra-pro,
 * o cualquier dato no agregado.
 *
 * Uso
 * ---
 *   node scripts/gen-chagra-stats.mjs                # escribe public/chagra-stats.json
 *   node scripts/gen-chagra-stats.mjs --dry-run       # imprime, no escribe
 *   node scripts/gen-chagra-stats.mjs --catalog <f>   # override del catálogo
 *   node scripts/gen-chagra-stats.mjs --graph-snapshot <f>  # override del snapshot
 *
 * npm run gen:stats   (ver package.json)
 *
 * También enganchado en `prebuild` — corre en cada `npm run build`, así
 * que un cambio en el catálogo se refleja solo en el próximo deploy sin
 * pasos manuales adicionales.
 * ================================================================
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

export const DEFAULT_CATALOG_PATH = join(ROOT, 'catalog/chagra-catalog-oss-subset-v3.2.json');
export const DEFAULT_GRAPH_SNAPSHOT_PATH = join(ROOT, 'src/data/graph-stats-snapshot.json');
export const DEFAULT_OUTPUT_PATH = join(ROOT, 'public/chagra-stats.json');

// 1.1.0 agrega el bloque `capacidades` (estado real por función del ciclo de
// vida) que consume el widget "El Ciclo Vivo". Aditivo: no rompe consumidores
// del schema 1.0.0 (WelcomeStatsHero, chagra.bio) — solo agrega una clave.
export const SCHEMA_VERSION = '1.1.0';

// =============================================================================
// Capacidades del ciclo de vida — FUENTE ÚNICA DE VERDAD del estado real de
// cada función que muestra el widget "El Ciclo Vivo" (src/components/CicloVivo).
//
// Este bloque es el "interruptor" del pedido del operador: el widget pinta cada
// chip según el `estado` que se declara AQUÍ. Cuando un artefacto que hoy está
// 'parcial' o 'proximamente' se termina, se cambia SU estado a 'activo' en esta
// tabla, se corre `npm run gen:stats` (o el prebuild), y el chip se enciende
// solo en la UI — sin tocar el componente del widget. Ese es el corazón del
// diseño: la UI es un reflejo de esta tabla, no una lista hardcodeada aparte.
//
// Estados:
//   'activo'       -> función navegable y funcional end-to-end. Chip encendido,
//                    navega a `view`.
//   'parcial'      -> existe pero con stub / dato estático / cobertura incompleta
//                    / canal en vivo tras flag. Chip atenuado con badge "parcial"
//                    (sigue navegando si trae `view`).
//   'proximamente' -> todavía no construido. Chip fantasma con "pronto", no navega.
//
// Los estados se asignaron VERIFICANDO el código (auditoría 2026-07-01), no por
// suposición — regla dura anti-invento del repo. `view` es el slug del router
// (App.jsx) al que navega el chip cuando aplica.
//
// Anti-leak: esta tabla es PÚBLICA (va a public/chagra-stats.json). Solo estados
// y notas de producto en lenguaje de usuario. Prohibido nombres de host, rutas
// de infraestructura, nombres de contenedor o de la base del grafo.
// =============================================================================
export const CAPABILITIES_STATUS = [
  // -- Fase Semilla ----------------------------------------------------------
  { id: 'que_siembro', estado: 'activo', view: 'directorio',
    nota: 'Qué sembrar según su piso térmico, desde el directorio de especies.' },
  { id: 'calendario_siembra', estado: 'activo', view: 'calendario_finca',
    nota: 'Calendario por ciclos con plantillas fenológicas.' },
  { id: 'viabilidad_semilla', estado: 'proximamente', view: null,
    nota: 'Prueba de viabilidad de semilla guiada; aún no está disponible.' },
  { id: 'saberes', estado: 'parcial', view: 'directorio',
    nota: 'Saberes de origen en la ficha; cobertura del catálogo todavía escasa.' },

  // -- Fase Germinación ------------------------------------------------------
  { id: 'semilleros', estado: 'activo', view: 'germinacion',
    nota: 'Guía y registro de semilleros por especie.' },
  { id: 'riego_agua', estado: 'parcial', view: 'agente',
    nota: 'Diagnóstico de agua y recordatorio de riego vía el agente; sin pantalla propia.' },
  { id: 'cromatografia_suelo', estado: 'activo', view: 'cromatografia',
    nota: 'Guía, registro con foto y comparación temporal; interpretación manual, sin IA.' },
  { id: 'biopreparados', estado: 'activo', view: 'biopreparados',
    nota: 'Galería de recetas con diagramas y datos de seguridad.' },

  // -- Fase Crecimiento ------------------------------------------------------
  { id: 'diagnostico_foto', estado: 'activo', view: 'agente',
    nota: 'Tómele foto y el agente diagnostica con visión y contexto del catálogo.' },
  { id: 'mip_plagas', estado: 'parcial', view: 'directorio',
    nota: 'Plagas y control biológico en la ficha; cobertura del grafo incompleta.' },
  { id: 'nutricion', estado: 'activo', view: 'ciclo_nutrientes',
    nota: 'Ciclo de nutrientes con guía por etapa.' },
  { id: 'asociaciones', estado: 'activo', view: 'asociaciones',
    nota: 'Asociaciones y antagonismos entre cultivos.' },
  { id: 'fenologia', estado: 'activo', view: 'ciclo',
    nota: 'Deriva y confirma la etapa fenológica con línea de tiempo.' },

  // -- Fase Floración --------------------------------------------------------
  { id: 'polinizacion', estado: 'activo', view: 'animales_abejas',
    nota: 'Abejas y polinización con registro de colmena.' },
  { id: 'clima', estado: 'parcial', view: 'agente',
    nota: 'Alertas de clima y heladas; el canal en vivo depende de disponibilidad.' },

  // -- Fase Fructificación ---------------------------------------------------
  { id: 'insumos', estado: 'activo', view: 'insumos',
    nota: 'Registro de insumos aplicados al cultivo.' },

  // -- Fase Cosecha ----------------------------------------------------------
  { id: 'registrar_cosecha', estado: 'activo', view: 'cosechar',
    nota: 'Registro de cosecha por planta o lote.' },
  { id: 'precio_sipsa', estado: 'parcial', view: 'mercado',
    nota: 'Precio de referencia DANE-SIPSA en foto estática; canal en vivo tras flag.' },
  { id: 'mercado', estado: 'activo', view: 'mercado',
    nota: 'Marketplace de circuitos cortos, sin precios inventados.' },

  // -- Fase Poscosecha -------------------------------------------------------
  { id: 'guardar_semilla', estado: 'proximamente', view: null,
    nota: 'Banco de semilla propia con trazabilidad; aún no está disponible.' },
  { id: 'ciclo_cerrado', estado: 'parcial', view: 'ciclo_nutrientes',
    nota: 'Devolver nutrientes al suelo; hoy educativo, sin recomendación automática.' },
  { id: 'bitacora', estado: 'activo', view: 'bitacora',
    nota: 'Bitácora de la finca; el ciclo de aprendizaje automático está en camino.' },

  // -- Motor del agente (transversal, no es un chip de fase) -----------------
  { id: 'rag_grounding', estado: 'parcial', view: 'agente',
    nota: 'El agente responde apoyado en el corpus; verificación por DOI en expansión.' },
  { id: 'action_loop', estado: 'parcial', view: 'agente',
    nota: 'Ejecuta acciones (registrar, agendar) con su confirmación; nivel 1.' },
];

const CAPABILITY_ESTADOS = new Set(['activo', 'parcial', 'proximamente']);

/**
 * Construye el mapa `capacidades` (keyed by id) que va al JSON público. Puro:
 * no toca disco. Valida que cada estado sea uno de los tres permitidos (falla
 * ruidoso ante un typo, en vez de shippear un estado que el widget no sabe
 * pintar). Devuelve un objeto en el mismo orden de declaración.
 *
 * @param {Array<{id:string, estado:string, nota:string, view?:string|null}>} [decls]
 * @returns {Record<string, {estado:string, nota:string, view:string|null}>}
 */
export function computeCapabilities(decls = CAPABILITIES_STATUS) {
  const out = {};
  for (const c of decls) {
    if (!c || !c.id) throw new Error('[capacidades] declaración sin id');
    if (!CAPABILITY_ESTADOS.has(c.estado)) {
      throw new Error(`[capacidades] estado inválido "${c.estado}" en "${c.id}"`);
    }
    if (out[c.id]) throw new Error(`[capacidades] id duplicado "${c.id}"`);
    out[c.id] = { estado: c.estado, nota: c.nota || '', view: c.view || null };
  }
  return out;
}

// =============================================================================
// Helpers puros
// =============================================================================

/** Redondea a 1 decimal. Devuelve 0 si el denominador es 0 (evita NaN). */
function pct(numerador, denominador) {
  if (!denominador) return 0;
  return Math.round((numerador / denominador) * 1000) / 10;
}

// =============================================================================
// Cálculo desde el catálogo (species / biopreparados / sources)
// =============================================================================

/**
 * Computa las métricas de `catalogo` a partir del JSON del catálogo
 * canónico shipeado (species[], sources[], biopreparados[] inline —
 * ver catalog/CATALOG_VERSIONS.md). Puro: no toca disco.
 *
 * @param {object} catalog - JSON parseado del catálogo v3.2
 * @param {{mipPlagas?: {con_mip:number, total:number}}} [opts] - mip_plagas
 *   viene del snapshot del grafo (ver header del módulo), no del catálogo.
 * @returns {object}
 */
export function computeCatalogStats(catalog, opts = {}) {
  const species = Array.isArray(catalog.species) ? catalog.species : [];
  const biopreparados = Array.isArray(catalog.biopreparados) ? catalog.biopreparados : [];
  const sources = Array.isArray(catalog.sources) ? catalog.sources : [];

  const biopreparadosConSeguridad = biopreparados.filter((b) => !!b.safety_class).length;
  const fuentesDoi = sources.filter((s) => !!s.doi).length;
  const fuentesTierA = sources.filter((s) => s.tier === 'A').length;

  const mipPlagas = opts.mipPlagas || { con_mip: 0, total: 0 };

  return {
    especies: species.length,
    biopreparados: biopreparados.length,
    biopreparados_con_seguridad: biopreparadosConSeguridad,
    mip_plagas: {
      con_mip: mipPlagas.con_mip || 0,
      total: mipPlagas.total || 0,
      pct: pct(mipPlagas.con_mip || 0, mipPlagas.total || 0),
    },
    fuentes: sources.length,
    fuentes_doi: fuentesDoi,
    fuentes_tier_a: fuentesTierA,
  };
}

// =============================================================================
// Cálculo desde el snapshot del grafo (pass-through + agregados)
// =============================================================================

/**
 * Computa las métricas de `grafo` a partir del snapshot estático
 * (src/data/graph-stats-snapshot.json). Puro: no toca disco ni la DB —
 * ese snapshot ya es el resultado del proceso de ops documentado en
 * Chagra-strategy (privado).
 *
 * @param {object} snapshot - JSON parseado del snapshot del grafo
 * @returns {object}
 */
export function computeGraphStats(snapshot) {
  const controls = snapshot.controls || { con_doi: 0, total: 0 };
  return {
    nodos: snapshot.nodos || 0,
    aristas: snapshot.aristas || 0,
    aristas_por_tipo: snapshot.aristas_por_tipo || {},
    controls_con_doi: controls.con_doi || 0,
    controls_total: controls.total || 0,
    cobertura_por_vertical: snapshot.cobertura_por_vertical || {},
  };
}

// =============================================================================
// Ensamblado final — el schema que consumen login / chagra.bio / dev
// =============================================================================

/**
 * Ensambla el JSON final de `public/chagra-stats.json`. Puro — recibe los
 * JSON ya parseados y una fecha explícita (nunca llama a `Date()` aquí; ese
 * es el único punto permitido en `main()`, igual que el resto de
 * generadores del repo — ver scripts/snapshot-grafo-crecimiento.mjs).
 *
 * @param {{catalog: object, graphSnapshot: object, generatedAt: string}} args
 * @returns {object}
 */
export function buildStats({ catalog, graphSnapshot, generatedAt }) {
  const grafo = computeGraphStats(graphSnapshot);
  const catalogo = computeCatalogStats(catalog, {
    mipPlagas: graphSnapshot.mip_plagas,
  });

  return {
    generated_at: generatedAt,
    schema_version: SCHEMA_VERSION,
    catalogo,
    grafo,
    // Estado real por función del ciclo de vida — lo consume el widget
    // "El Ciclo Vivo" para encender/atenuar/apagar cada chip. Ver
    // CAPABILITIES_STATUS arriba (único lugar donde se cambia un estado).
    capacidades: computeCapabilities(),
    verificacion: {
      // Moat del producto: % de aristas CONTROLS (biopreparado -> plaga)
      // corroboradas contra OpenAlex con DOI real. Ver auditoría 2026-06-28.
      doi_pct: pct(grafo.controls_con_doi, grafo.controls_total),
    },
    _fuente:
      'Generado por scripts/gen-chagra-stats.mjs. catalogo <- catalog/chagra-catalog-oss-subset-v3.2.json ' +
      '(canónico shipeado, ver catalog/CATALOG_VERSIONS.md). grafo <- src/data/graph-stats-snapshot.json ' +
      '(snapshot estático del grafo de conocimiento; se refresca con el proceso de ops documentado en ' +
      'Chagra-strategy, repo privado). ' +
      'Este JSON es la ÚNICA FUENTE DE VERDAD de estos números para login, chagra.bio y desarrollo — ' +
      'no hardcodear estos valores en ningún consumidor, siempre hacer fetch(\'/chagra-stats.json\').',
  };
}

// =============================================================================
// IO + CLI
// =============================================================================

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

export function parseArgs(argv) {
  const opts = {
    catalogPath: DEFAULT_CATALOG_PATH,
    graphSnapshotPath: DEFAULT_GRAPH_SNAPSHOT_PATH,
    outputPath: DEFAULT_OUTPUT_PATH,
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--catalog') opts.catalogPath = resolve(argv[++i]);
    else if (a === '--graph-snapshot') opts.graphSnapshotPath = resolve(argv[++i]);
    else if (a === '--out') opts.outputPath = resolve(argv[++i]);
    else if (a === '--dry-run') opts.dryRun = true;
  }
  return opts;
}

export function main(argv = process.argv.slice(2), env = process.env) {
  const opts = parseArgs(argv);

  const catalog = loadJson(opts.catalogPath);
  const graphSnapshot = loadJson(opts.graphSnapshotPath);
  const generatedAt = env.CHAGRA_STATS_GENERATED_AT || new Date().toISOString();

  const stats = buildStats({ catalog, graphSnapshot, generatedAt });
  const json = JSON.stringify(stats, null, 2) + '\n';

  console.error(
    `[gen-chagra-stats] especies=${stats.catalogo.especies} biopreparados=${stats.catalogo.biopreparados} ` +
      `(${stats.catalogo.biopreparados_con_seguridad} con safety_class) fuentes=${stats.catalogo.fuentes} ` +
      `(${stats.catalogo.fuentes_doi} con DOI, ${stats.catalogo.fuentes_tier_a} tier A) | ` +
      `grafo nodos=${stats.grafo.nodos} aristas=${stats.grafo.aristas} ` +
      `CONTROLS=${stats.grafo.controls_con_doi}/${stats.grafo.controls_total} (${stats.verificacion.doi_pct}% DOI) ` +
      `mip=${stats.catalogo.mip_plagas.con_mip}/${stats.catalogo.mip_plagas.total}`,
  );

  if (opts.dryRun) {
    console.error(`[gen-chagra-stats] --dry-run: no se escribe ${opts.outputPath}`);
    console.log(json);
    return { stats, wrote: false };
  }

  writeFileSync(opts.outputPath, json);
  console.error(`[gen-chagra-stats] escrito ${opts.outputPath}`);
  return { stats, wrote: true };
}

// ESM entry-point check.
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (err) {
    console.error('[gen-chagra-stats] failed:', err?.message || err);
    process.exitCode = 1;
  }
}
