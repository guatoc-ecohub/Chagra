/**
 * directorioPlagas.js — orquestación de datos del Directorio de Plagas.
 *
 * Es el ESPEJO de `directorioEspecies.js`, pero del otro lado de la sanidad: en
 * vez de una especie, la ficha describe la PLAGA/ENFERMEDAD (el bicho o el
 * síndrome) para reconocerla por foto y manejarla sin veneno. Une, sin inventar
 * nada, las fuentes grounded que ya existen en el cliente:
 *
 *   - sanidadData.js (CAUSAS + SINTOMAS)            → identidad (nombre común +
 *       binomio + tipo), cómo reconocerla (síntoma folk + pista + con qué se
 *       confunde), cuándo actuar (umbral) y el manejo agroecológico por los 3
 *       pilares (biopreparado / control biológico / cultural) + prevención.
 *       Cada causa cita su fuente (AGROSAVIA, Cenicafé, SciELO, FAO/IPM).
 *   - grafo-relations.json (grafoRelations)         → a qué CULTIVOS/especies
 *       ataca (aristas AFFECTS vía `_pest_index`) y controladores biológicos
 *       extra del grafo (aristas CONTROLS de `pest_controllers`).
 *   - plaga-images.json (plagaImageResolver)        → foto CC del daño/insecto.
 *
 * Regla anti-alucinación (igual que la ficha de especie): si una fuente no trae
 * el dato, la sección queda vacía y la UI hace deflección honesta ("dato en
 * camino"). NUNCA se inventa un cultivo, un controlador, una dosis ni una foto.
 *
 * Regla anti-veneno (como en el mundo café): la ficha NO tiene campo de control
 * químico. Sólo surfacea biopreparados, controladores biológicos y prácticas
 * culturales — el manejo agroecológico curado. No hay superficie donde pueda
 * entrar un agroquímico sintético.
 */

import {
  CAUSAS, SINTOMAS, CULTIVOS, TIPO_META, CONFIANZA_META, getCausa, normalizar,
} from '../components/sanidad/sanidadData.js';
import { getSpeciesById } from '../db/catalogDB.js';
import { getRelationsForSpecies, resolvePestSynonym } from './grafoRelations.js';
import { findPlagaImage } from '../utils/plagaImageResolver.js';
import { normalizeForMatch, __TEST__ as RESOLVER_TEST } from '../utils/speciesResolver.js';

const { containsWholeWord } = RESOLVER_TEST;

/* ── Índices derivados (una vez, deterministas) ──────────────────────────────
   El árbol de SINTOMAS relaciona el síntoma folk con una o varias CAUSAS (a
   veces preguntando el cultivo). Precomputamos, para cada causa:
     · qué síntomas la nombran (para "cómo reconocerla"),
     · a qué cultivos pertenece (para "a qué le pega"),
     · con qué OTRAS causas se confunde (nombres folk polisémicos como
       "candelilla"/"viruela"/"gota" que apuntan a varias causas). */

/** Recorre un nodo del árbol (sintoma u opción) y emite {causaId, cultivo}. */
function* collectCausaPaths(node, cultivo) {
  if (!node || typeof node !== 'object') return;
  if (node.causa) yield { causaId: node.causa, cultivo: cultivo || null };
  const opciones = node.pregunta?.opciones || node.opciones;
  if (Array.isArray(opciones)) {
    for (const op of opciones) {
      const c = op.cultivo || cultivo || null;
      if (op.causa) yield { causaId: op.causa, cultivo: c };
      if (op.pregunta) yield* collectCausaPaths({ pregunta: op.pregunta }, c);
    }
  }
}

/** Si el label del síntoma nombra un cultivo entre paréntesis, lo detecta. */
function cultivoFromLabel(label) {
  const n = normalizar(label);
  for (const [id, meta] of Object.entries(CULTIVOS)) {
    if (containsWholeWord(n, normalizar(meta.label))) return id;
  }
  return null;
}

let _indices = null;
function getIndices() {
  if (_indices) return _indices;
  const causaToSintomas = new Map(); // causaId -> [{id,label,pista,nota,emoji,vineta,terminos}]
  const causaToCultivos = new Map(); // causaId -> Set<cultivoId>
  const causaToConfusiones = new Map(); // causaId -> Set<otherCausaId>

  const add = (map, key, value) => {
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(value);
  };

  for (const s of SINTOMAS) {
    const paths = [...collectCausaPaths(s, null)];
    const causasAqui = new Set(paths.map((p) => p.causaId));
    const inferido = cultivoFromLabel(s.label);

    for (const { causaId, cultivo } of paths) {
      if (!causaToSintomas.has(causaId)) causaToSintomas.set(causaId, []);
      const yaLo = causaToSintomas.get(causaId).some((x) => x.id === s.id);
      if (!yaLo) {
        causaToSintomas.get(causaId).push({
          id: s.id, label: s.label, pista: s.pista, nota: s.nota || null,
          emoji: s.emoji, vineta: s.vineta, terminos: s.terminos || [],
        });
      }
      const cul = cultivo || inferido;
      if (cul && CULTIVOS[cul]) add(causaToCultivos, causaId, cul);
    }

    // Confusión: nombre folk que apunta a varias causas, o síntoma marcado
    // polisémico/ambiguo → esas causas se pueden confundir bajo ese nombre.
    if (s.polisemica || s.ambigua || causasAqui.size > 1) {
      for (const a of causasAqui) {
        for (const b of causasAqui) {
          if (a !== b) add(causaToConfusiones, a, b);
        }
      }
    }
  }

  _indices = { causaToSintomas, causaToCultivos, causaToConfusiones };
  return _indices;
}

/** Reinicia los índices/caches (tests). */
export function __resetPlagasCache() {
  _indices = null;
}

/** Los cultivos (con label/emoji) a los que apunta una causa. */
function cultivosDe(causaId) {
  const { causaToCultivos } = getIndices();
  const set = causaToCultivos.get(causaId);
  if (!set) return [];
  return [...set]
    .map((id) => ({ id, label: CULTIVOS[id]?.label, emoji: CULTIVOS[id]?.emoji }))
    .filter((c) => c.label);
}

/** La viñeta/emoji del primer síntoma que nombra la causa (para el Hero fallback). */
function primarioDe(causaId) {
  const { causaToSintomas } = getIndices();
  const first = (causaToSintomas.get(causaId) || [])[0];
  return { vineta: first?.vineta || 'manchaOjo', emoji: first?.emoji || '🐛' };
}

/**
 * Lista las plagas/enfermedades del catálogo de sanidad como tarjetas de
 * resumen (para la cuadrícula del directorio). Excluye las CARENCIAS
 * nutricionales (tipo 'deficiencia'): no son plaga ni enfermedad, aunque el
 * flujo de amarillamiento las use. `buildPlagaFicha` sí las construye si se
 * llega a ellas por deep-link, con su tipo honesto.
 *
 * @returns {Array<{ id, nombreComun, binomio, tipo, tipoLabel, tipoEmoji,
 *   confianza, cultivos, vineta, emoji }>}
 */
export function listPlagas() {
  return Object.entries(CAUSAS)
    .filter(([, c]) => c.tipo !== 'deficiencia')
    .map(([id, c]) => {
      const { vineta, emoji } = primarioDe(id);
      return {
        id,
        nombreComun: c.nombreComun,
        binomio: c.binomio,
        tipo: c.tipo,
        tipoLabel: TIPO_META[c.tipo]?.label || c.tipo,
        tipoEmoji: TIPO_META[c.tipo]?.emoji || '•',
        confianza: c.confianza,
        cultivos: cultivosDe(id),
        vineta,
        emoji,
      };
    })
    .sort((a, b) => a.nombreComun.localeCompare(b.nombreComun, 'es'));
}

/**
 * Busca plagas por texto libre (nombre común, binomio, tipo o término folk).
 * Determinista y tolerante (sin tildes/mayúsculas). Devuelve tarjetas de
 * resumen ranqueadas por especificidad del match.
 *
 * @param {string} query
 * @param {object} [opts]
 * @param {number} [opts.limit=24]
 * @returns {Array} tarjetas de `listPlagas` que casan.
 */
export function searchPlagas(query, opts = {}) {
  const { limit = 24 } = opts;
  const q = normalizar(query);
  if (!q || q.length < 2) return [];
  const { causaToSintomas } = getIndices();

  const scored = [];
  for (const card of listPlagas()) {
    const campos = [card.nombreComun, card.binomio, card.tipoLabel];
    const terminos = (causaToSintomas.get(card.id) || []).flatMap((s) => s.terminos);
    const todos = [...campos, ...terminos].map(normalizar).filter(Boolean);

    let score = 0;
    for (const t of todos) {
      if (t === q) score = Math.max(score, 100);
      else if (t.startsWith(q) || t.endsWith(q)) score = Math.max(score, 70);
      else if (t.includes(q)) score = Math.max(score, 55);
      else if (q.length >= 4 && q.includes(t)) score = Math.max(score, 40);
    }
    if (score > 0) scored.push({ card, score });
  }
  scored.sort((a, b) => b.score - a.score || a.card.nombreComun.localeCompare(b.card.nombreComun, 'es'));
  return scored.slice(0, limit).map((s) => s.card);
}

/** Resuelve ids de especie del grafo a etiquetas legibles del catálogo. */
async function resolveEspecies(ids) {
  const out = [];
  const seen = new Set();
  for (const id of (Array.isArray(ids) ? ids : []).slice(0, 16)) {
    if (typeof id !== 'string' || !id || seen.has(id)) continue;
    seen.add(id);
    let sp = null;
    try {
      sp = await getSpeciesById(id);
    } catch (_) {
      sp = null;
    }
    if (sp) {
      out.push({
        id,
        comun: sp.nombre_comun || sp.name_es || humanizeId(id),
        cientifico: sp.nombre_cientifico || sp.name_la || '',
        enCatalogo: true,
      });
    } else {
      out.push({ id, comun: humanizeId(id), cientifico: '', enCatalogo: false });
    }
  }
  return out;
}

/** "solanum_tuberosum" → "Solanum tuberosum" (fallback legible). */
function humanizeId(id) {
  return String(id || '')
    .split('_')
    .filter(Boolean)
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/**
 * Controladores biológicos (aristas CONTROLS del grafo) para una plaga: recorre
 * las especies que la plaga afecta y une los `controladores` de la arista cuya
 * `plaga` coincide con la etiqueta canónica resuelta. Filtra los disputados.
 */
async function grafoControladores(plaga, especiesAfectadas) {
  const key = normalizeForMatch(plaga);
  if (!key) return [];
  const set = new Set();
  for (const spId of (especiesAfectadas || []).slice(0, 12)) {
    let rel = null;
    try {
      rel = await getRelationsForSpecies(spId);
    } catch (_) {
      rel = null;
    }
    for (const pc of rel?.pest_controllers || []) {
      if (!pc || pc.disputed || !pc.plaga || !Array.isArray(pc.controladores)) continue;
      const pk = normalizeForMatch(pc.plaga);
      if (pk === key || containsWholeWord(pk, key) || containsWholeWord(key, pk)) {
        for (const c of pc.controladores) if (c) set.add(c);
      }
    }
  }
  return [...set];
}

/**
 * Construye la FICHA completa y grounded de una plaga/enfermedad por su id
 * (clave de `CAUSAS`). Une el contenido curado de sanidad con las aristas del
 * grafo (cultivos que ataca + controladores biológicos) y la foto CC. NUNCA
 * lanza: cualquier fuente caída degrada esa sección a vacía.
 *
 * @param {string} causaId
 * @returns {Promise<null | object>} null si la causa no existe.
 */
export async function buildPlagaFicha(causaId) {
  const c = getCausa(causaId);
  if (!c) return null;

  const { causaToSintomas, causaToConfusiones } = getIndices();
  const sintomas = causaToSintomas.get(causaId) || [];

  // --- Cómo reconocerla: síntoma folk + pista + con qué se confunde ---
  const pistas = sintomas.map((s) => ({
    sintoma: s.label, pista: s.pista, nota: s.nota, emoji: s.emoji, vineta: s.vineta,
  }));
  const confusiones = [...(causaToConfusiones.get(causaId) || [])]
    .map((oid) => getCausa(oid)?.nombreComun)
    .filter(Boolean);

  // --- A qué le pega: cultivos curados + especies del grafo (AFFECTS) ---
  const cultivos = cultivosDe(causaId);

  let plagaGrafo = null;
  let especiesIds = [];
  let controladoresGrafo = [];
  try {
    // Resolver la etiqueta canónica del grafo probando binomio → nombre común →
    // términos folk del síntoma (el primero que exista en el grafo gana).
    const terminos = [c.binomio, c.nombreComun, ...sintomas.flatMap((s) => s.terminos)];
    for (const t of terminos) {
      const r = await resolvePestSynonym(t);
      if (r && r.plaga) {
        plagaGrafo = r.plaga;
        especiesIds = Array.isArray(r.especiesAfectadas) ? r.especiesAfectadas : [];
        break;
      }
    }
    if (plagaGrafo) controladoresGrafo = await grafoControladores(plagaGrafo, especiesIds);
  } catch (_) {
    /* sin grafo → cultivos del grafo y controladores extra quedan vacíos */
  }
  const especiesAfectadas = await resolveEspecies(especiesIds);

  // --- Foto CC (o null → la UI cae a la viñeta de sanidad) ---
  let imagen = null;
  try {
    imagen = await findPlagaImage(causaId);
  } catch (_) {
    imagen = null;
  }

  const { vineta, emoji } = primarioDe(causaId);

  return {
    id: causaId,
    nombreComun: c.nombreComun,
    binomio: c.binomio,
    tipo: c.tipo,
    tipoLabel: TIPO_META[c.tipo]?.label || c.tipo,
    tipoEmoji: TIPO_META[c.tipo]?.emoji || '•',
    confianza: c.confianza,
    confianzaLabel: (CONFIANZA_META[c.confianza] || CONFIANZA_META.media).label,
    vineta,
    emoji,
    imagen, // { url, license, licenseUrl, rightsHolder, source, sourceUrl } | null
    reconocer: { pistas, confusiones },
    cultivos, // [{ id, label, emoji }] — curado
    especiesAfectadas, // [{ id, comun, cientifico, enCatalogo }] — grafo AFFECTS
    ciclo: {
      umbral: c.umbral || null,
    },
    manejo: {
      biopreparado: c.manejo?.biopreparado || null,
      biologico: c.manejo?.biologico || null,
      controladores: controladoresGrafo, // aristas CONTROLS del grafo (extra)
      cultural: c.manejo?.cultural || null,
      prevencion: c.prevencion || null,
    },
    notaSuave: c.notaSuave || null,
    dosisPendiente: !!c.dosisPendiente,
    fuente: c.fuente || null,
    plagaGrafo, // etiqueta canónica del grafo (o null) — trazabilidad
  };
}
