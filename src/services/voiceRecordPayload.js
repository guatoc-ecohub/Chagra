/**
 * voiceRecordPayload — Construye el payload FarmOS estructurado a partir de un
 * registro de voz CONFIRMADO (#23). Cada intención mapea a su entidad FarmOS,
 * espejando la forma EXACTA que ya usan las pantallas manuales (verify-first,
 * no reinventar el contrato):
 *
 *   registrar_planta        → asset--plant   (AssetsDashboard: intrinsic_geometry, plant_type)
 *   registrar_siembra       → log--seeding   (VoiceCapture: planta inline + quantity)
 *   registrar_cosecha       → log--harvest   (HarvestLog: quantity measure=weight)
 *   registrar_insumo        → log--input     (InputLog: category material + quantity)
 *   registrar_mantenimiento → log--task      (labor realizada)
 *   registrar_observacion   → log--observation (ObservationScreen: severity)
 *   reportar_plaga          → log--observation (InvasiveObservationLog: geometry + notas)
 *
 * Geofield (verificado en código): los ASSETS llevan la geometría en
 * `attributes.intrinsic_geometry.value` (WKT); los LOGS en `attributes.geometry`
 * (WKT). El builder respeta esa diferencia.
 *
 * Devuelve { saveType, payload } para `payloadService.savePayload(saveType, payload)`.
 * Es PURO: no toca red ni IndexedDB; el caller decide cuándo persistir.
 */

import { INTENTS, INTENT_META } from './voiceFieldExtractor';

/** ISO-8601 con offset, igual que las pantallas manuales. */
const isoTs = (ms) => new Date(Number.isFinite(ms) ? ms : Date.now()).toISOString().split('.')[0] + '+00:00';

const primarySpecies = (record) => (Array.isArray(record.species) && record.species[0]) || null;

/** Nombre legible del sujeto: catálogo > hint del LLM > texto crudo. */
function subjectName(record) {
  const sp = primarySpecies(record);
  if (sp?.common) return sp.common;
  if (record.speciesHint) return record.speciesHint;
  const raw = sp?.raw;
  if (raw) return raw.charAt(0).toUpperCase() + raw.slice(1);
  return 'Planta';
}

/** Resumen humano de los campos extraídos, para las notas del registro. */
function buildNotes(record) {
  const lines = [`Registrado por voz: "${record.transcription}".`];
  const m = record.measures || {};
  const bits = [];
  if (m.altura_m != null) bits.push(`alto ${m.altura_m} m`);
  if (m.ancho_m != null) bits.push(`ancho ${m.ancho_m} m`);
  if (m.cantidad != null) bits.push(`cantidad ${m.cantidad}${m.unidad ? ` ${m.unidad}` : ''}${m.kg_aprox ? ` (~${m.kg_aprox} kg)` : ''}`);
  if (bits.length) lines.push(`Medidas: ${bits.join(', ')}.`);
  const phen = (record.phenology || []).map((p) => p.canon).join(', ');
  if (phen) lines.push(`Fenología: ${phen}.`);
  if (record.symptoms?.length) lines.push(`Síntomas: ${record.symptoms.join('; ')}.`);
  if (record.pest) lines.push(`Plaga: ${record.pest}.`);
  if (record.labors?.length) lines.push(`Labores: ${record.labors.join(', ')}.`);
  if (record.input) lines.push(`Insumo: ${record.input}.`);
  if (record.species?.length > 1) {
    lines.push(`Cultivos: ${record.species.map((s) => s.common || s.raw).join(', ')}.`);
  }
  if (record.position?.raw) lines.push(`Lugar: ${record.position.raw}.`);
  return lines.join('\n');
}

/** Relationship de ubicación (land) si el usuario seleccionó una zona. */
const locationRel = (ctx) =>
  ctx.locationAssetId ? { data: [{ type: 'asset--land', id: ctx.locationAssetId }] } : null;

/** plant_type: OBLIGATORIO en FarmOS para asset--plant (evita 422). */
function plantTypeRel(record, ctx) {
  if (ctx.plantTypeTermId) {
    return { data: [{ type: 'taxonomy_term--plant_type', id: ctx.plantTypeTermId }] };
  }
  return { data: [{ type: 'taxonomy_term--plant_type', attributes: { name: subjectName(record) } }] };
}

function buildPlantAsset(record, ctx, notes) {
  const sp = primarySpecies(record);
  const attributes = {
    name: subjectName(record),
    status: 'active',
    notes: { value: notes },
    _createdAt: record.timestampMs || Date.now(),
  };
  if (sp?.slug) attributes._speciesSlug = sp.slug;
  if (ctx.wkt) attributes.intrinsic_geometry = { value: ctx.wkt };
  const meta = {};
  if (record.measures?.altura_m != null) meta.altura_m = record.measures.altura_m;
  if (record.measures?.ancho_m != null) meta.ancho_m = record.measures.ancho_m;
  if (record.phenology?.length) meta.fenologia = record.phenology[0].canon;
  if (Object.keys(meta).length) attributes._chagra_plant_meta = meta;

  const relationships = { plant_type: plantTypeRel(record, ctx) };
  const loc = locationRel(ctx);
  if (loc) relationships.location = loc;

  return { saveType: 'plant_asset', payload: { data: { type: 'asset--plant', attributes, relationships } } };
}

function buildSeeding(record, ctx, notes) {
  const sp = primarySpecies(record);
  const qty = record.measures?.cantidad || 1;
  const loc = locationRel(ctx);
  const inlinePlant = {
    type: 'asset--plant',
    _speciesSlug: sp?.slug || null,
    attributes: { name: subjectName(record), status: 'active', notes: { value: notes } },
    relationships: { plant_type: plantTypeRel(record, ctx), ...(loc ? { location: loc } : {}) },
    _createdAt: record.timestampMs || Date.now(),
  };
  const attributes = {
    name: `Siembra: ${subjectName(record)} (x${qty}) [voz]`,
    timestamp: isoTs(record.timestampMs),
    status: 'done',
    notes: { value: notes },
  };
  if (ctx.wkt) attributes.geometry = ctx.wkt;
  const relationships = {
    asset: { data: [inlinePlant] },
    quantity: { data: [{ type: 'quantity--standard', attributes: { measure: 'count', value: { decimal: String(qty) }, label: 'Plántulas' } }] },
  };
  if (loc) relationships.location = loc;
  return { saveType: 'seeding', payload: { data: { type: 'log--seeding', attributes, relationships } } };
}

function buildHarvest(record, ctx, notes) {
  const m = record.measures || {};
  const value = m.kg_aprox != null ? m.kg_aprox : (m.cantidad != null ? m.cantidad : 1);
  const label = m.unidad === 'arroba' ? 'kg (de arrobas)' : (m.unidad || 'kg');
  const attributes = {
    name: `Cosecha de ${subjectName(record)}`,
    timestamp: isoTs(record.timestampMs),
    status: 'done',
    notes: { value: notes },
  };
  if (ctx.wkt) attributes.geometry = ctx.wkt;
  const relationships = {
    quantity: { data: [{ type: 'quantity--standard', attributes: { measure: 'weight', value: { decimal: String(value) }, label } }] },
  };
  const loc = locationRel(ctx);
  if (loc) relationships.location = loc;
  return { saveType: 'harvest', payload: { data: { type: 'log--harvest', attributes, relationships } } };
}

function buildInput(record, ctx, notes) {
  const material = record.input || 'insumo';
  const attributes = {
    name: `Aplicación de ${material}`,
    timestamp: isoTs(record.timestampMs),
    status: 'done',
    notes: { value: notes },
  };
  if (ctx.wkt) attributes.geometry = ctx.wkt;
  const relationships = {
    category: { data: [{ type: 'taxonomy_term--material', attributes: { name: material } }] },
  };
  const loc = locationRel(ctx);
  if (loc) relationships.location = loc;
  if (record.measures?.cantidad != null) {
    relationships.quantity = {
      data: [{ type: 'quantity--standard', attributes: { measure: 'weight', value: { decimal: String(record.measures.cantidad) }, label: record.measures.unidad || 'dosis' } }],
    };
  }
  return { saveType: 'input', payload: { data: { type: 'log--input', attributes, relationships } } };
}

function buildMaintenance(record, ctx, notes) {
  const labor = record.labors?.length ? record.labors.join(' + ') : 'labor';
  const attributes = {
    name: `Mantenimiento: ${labor}`,
    timestamp: isoTs(record.timestampMs),
    status: 'done',
    notes: { value: notes },
  };
  const relationships = {};
  const loc = locationRel(ctx);
  if (loc) relationships.location = loc;
  return { saveType: 'task', payload: { data: { type: 'log--task', attributes, relationships } } };
}

function buildObservation(record, ctx, notes) {
  const isPest = record.intent === INTENTS.PLAGA;
  const subject = isPest ? (record.pest || 'plaga/invasora') : subjectName(record);
  const attributes = {
    name: isPest ? `Reporte: ${subject}` : `Observación: ${subject}`,
    timestamp: isoTs(record.timestampMs),
    status: isPest ? 'reported' : 'done',
    notes: { value: notes, format: 'plain_text' },
    severity: isPest ? 'high' : 'medium',
  };
  if (ctx.wkt) attributes.geometry = ctx.wkt;
  const relationships = {};
  const loc = locationRel(ctx);
  if (loc) relationships.location = loc;
  return { saveType: 'observation', payload: { data: { type: 'log--observation', attributes, relationships } } };
}

const BUILDERS = {
  [INTENTS.PLANTA]: buildPlantAsset,
  [INTENTS.SIEMBRA]: buildSeeding,
  [INTENTS.COSECHA]: buildHarvest,
  [INTENTS.INSUMO]: buildInput,
  [INTENTS.MANTENIMIENTO]: buildMaintenance,
  [INTENTS.OBSERVACION]: buildObservation,
  [INTENTS.PLAGA]: buildObservation,
};

/**
 * Construye { saveType, payload } para un registro de voz confirmado.
 *
 * @param {object} record — registro unificado (posiblemente editado en confirm).
 * @param {object} [ctx]
 * @param {string} [ctx.locationAssetId] — UUID de asset--land seleccionado.
 * @param {string} [ctx.wkt] — geometría WKT 'POINT(lon lat)' capturada por GPS.
 * @param {string} [ctx.plantTypeTermId] — UUID de taxonomy_term--plant_type si ya existe.
 * @returns {{saveType: string, payload: object}}
 */
export function buildVoicePayload(record, ctx = {}) {
  const builder = BUILDERS[record.intent] || buildObservation;
  const notes = buildNotes(record);
  return builder(record, ctx, notes);
}

/** Metadatos de la intención (label/icon/saveType) — re-export por conveniencia. */
export { INTENT_META, INTENTS };

export default buildVoicePayload;
