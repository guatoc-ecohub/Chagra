/**
 * red/redReputation.js — el corazón "mercado → grafo + reputación".
 *
 * Lógica PURA (cero red, cero I/O, cero React) que convierte una lista de
 * TRATOS del mercado en (a) el grafo social productor–cultivo–vereda y (b) la
 * reputación GANADA de cada productor por cultivo. La reputación se ancla a
 * HECHOS verificables de los tratos (¿entregó?, ¿qué calidad calificó el
 * comprador?), NUNCA a votos ni a autopercepción.
 *
 * Todo lo derivado aquí es cache reconstruible (ADR-019: el log de tratos es la
 * fuente de verdad; grafo y reputación se recomputan cuando haga falta).
 *
 * ── Régimen del dominio (power laws) ──────────────────────────────────────
 * La actividad de mercado en un piloto rural es de COLA PESADA: unos pocos
 * productores concentran la mayoría de los tratos y muchos tienen 1–2. Por eso
 * NO optimizamos el "promedio": usamos suavizado bayesiano para que un n muy
 * chico no dispare la reputación a 1.0, y un factor de confianza por volumen
 * para el ranking. Resiliencia > exactitud puntual.
 *
 * ── Supuesto de Markov ────────────────────────────────────────────────────
 * La fiabilidad reciente de un productor se toma como predictor de su fiabilidad
 * próxima (cadena de Markov de orden 1 sobre su conducta de entrega). VIOLACIÓN
 * conocida: la conducta NO es estacionaria — cambia de tierra, de práctica o
 * enfrenta una mala cosecha climática. MITIGACIÓN: (1) decaimiento por recencia
 * (media vida configurable) para que un acierto viejo pese menos; (2) suavizado
 * + factor de confianza para que un solo dato no domine. Sin esta sección el
 * módulo sería una caja opaca.
 *
 * @module services/red/redReputation
 */

import { NIVEL_REPUTACION, ENTREGA } from './types.js';
import { filterShareable } from './redSharing.js';

// ── Parámetros del modelo (documentados y testeables) ─────────────────────

/** Prior Beta(1,1): neutral. Con n=0 la fiabilidad queda en 0.5 (desconocida). */
const PRIOR_ENTREGA = 1;
/** Constante de confianza por volumen: conf = n / (n + K). K=3 → n=3 da 0.5. */
const K_CONFIANZA = 3;
/** Media vida de recencia por default (días): un año. */
const HALF_LIFE_DIAS_DEFAULT = 365;
/** Mínimo de entregas resueltas para salir de "nuevo". */
const MIN_CONFIRMADAS = 2;
/** Umbrales del semáforo humano. */
const UMBRAL_VERDE = 0.8;
const UMBRAL_AMBAR = 0.5;
const UMBRAL_CALIDAD_VERDE = 0.6;
/** Pesos del compuesto núcleo (fiabilidad vs calidad) cuando hay calidad. */
const PESO_FIABILIDAD = 0.6;
const PESO_CALIDAD = 0.4;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Normaliza un término para agrupar/matchear (minúsculas, sin tildes). */
export function normalizeTerm(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/** Peso de entrega de un trato: entregado 1, parcial 0.5, resto 0. */
function pesoEntrega(entrega) {
  if (entrega === ENTREGA.ENTREGADO) return 1;
  if (entrega === ENTREGA.PARCIAL) return 0.5;
  return 0;
}

/**
 * Valor predominante (moda) de un campo entre una lista de tratos, con
 * desempate por el trato más reciente. Ignora vacíos.
 */
function predominant(tratos, field) {
  const counts = new Map();
  let bestRecent = { value: '', ts: -Infinity };
  for (const t of tratos) {
    const raw = t?.[field];
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (!value) continue;
    const key = normalizeTerm(value);
    const prev = counts.get(key) || { value, count: 0 };
    prev.count += 1;
    counts.set(key, prev);
    const ts = Number(t?.createdAt) || 0;
    if (ts > bestRecent.ts) bestRecent = { value, ts };
  }
  let best = null;
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) best = entry;
  }
  if (!best) return '';
  // Desempate: si hay empate de conteo, gana el del trato más reciente.
  let tied = 0;
  for (const entry of counts.values()) if (entry.count === best.count) tied += 1;
  return tied > 1 ? bestRecent.value : best.value;
}

/** Factor de recencia 0..1 por decaimiento exponencial (1 si no hay `now`). */
function factorRecencia(reciente, now, halfLifeDias) {
  if (!Number.isFinite(now)) return 1;
  const dias = Math.max(0, (now - reciente) / MS_POR_DIA);
  const hl = halfLifeDias > 0 ? halfLifeDias : HALF_LIFE_DIAS_DEFAULT;
  return Math.pow(0.5, dias / hl);
}

/**
 * Deriva el nivel (semáforo humano) + motivo a partir de los hechos.
 * @returns {{ nivel: string, motivo: string }}
 */
function derivarNivel({ nConfirmadas, fiabilidad, calidadNorm }) {
  if (nConfirmadas < MIN_CONFIRMADAS) {
    return { nivel: NIVEL_REPUTACION.NUEVO, motivo: 'sin_historial_suficiente' };
  }
  const calidadOk = calidadNorm == null || calidadNorm >= UMBRAL_CALIDAD_VERDE;
  if (fiabilidad >= UMBRAL_VERDE && calidadOk) {
    return { nivel: NIVEL_REPUTACION.VERDE, motivo: 'entrega_pareja' };
  }
  if (fiabilidad >= UMBRAL_AMBAR) {
    const motivo = calidadNorm != null && calidadNorm < UMBRAL_CALIDAD_VERDE
      ? 'calidad_dispareja'
      : 'entrega_parcial';
    return { nivel: NIVEL_REPUTACION.AMBAR, motivo };
  }
  return { nivel: NIVEL_REPUTACION.ROJO, motivo: 'fallas_de_entrega' };
}

/**
 * Computa la reputación de UN productor para UN producto a partir de sus
 * tratos (ya filtrados por productor+producto, o se filtra aquí por los campos
 * dados). Función pura y total: input basura → reputación "nueva" honesta.
 *
 * @param {Array<Object>} tratos — tratos del grupo (mismos productorHash+producto).
 * @param {Object} [opts]
 * @param {number} [opts.now] — epoch ms para el factor de recencia (opcional).
 * @param {number} [opts.halfLifeDias]
 * @returns {import('./types.js').Reputacion}
 */
export function computeReputacion(tratos, opts = {}) {
  const lista = Array.isArray(tratos) ? tratos.filter((t) => t && typeof t === 'object') : [];
  const { now = NaN, halfLifeDias = HALF_LIFE_DIAS_DEFAULT } = opts;

  const productorHash = lista[0]?.productorHash || '';
  const producto = lista[0]?.producto || '';

  const confirmadas = lista.filter((t) => t.entrega && t.entrega !== ENTREGA.PENDIENTE);
  const nConfirmadas = confirmadas.length;
  let nEntregados = 0;
  let sumaPeso = 0;
  for (const t of confirmadas) {
    const w = pesoEntrega(t.entrega);
    sumaPeso += w;
    if (w >= 1) nEntregados += 1;
  }

  // Fiabilidad: media bayesiana con prior neutral (n bajo tiende a 0.5).
  const fiabilidad = (sumaPeso + PRIOR_ENTREGA) / (nConfirmadas + 2 * PRIOR_ENTREGA);

  // Calidad: promedio de las calificaciones 1..5 presentes.
  const ratings = lista
    .map((t) => Number(t.calidad))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 5);
  const calidadPromedio = ratings.length
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : null;
  const calidadNorm = calidadPromedio == null ? null : (calidadPromedio - 1) / 4;

  const reciente = lista.reduce((mx, t) => Math.max(mx, Number(t.createdAt) || 0), 0);

  const confianza = nConfirmadas / (nConfirmadas + K_CONFIANZA);
  const recencia = factorRecencia(reciente, now, halfLifeDias);
  const core = calidadNorm != null
    ? PESO_FIABILIDAD * fiabilidad + PESO_CALIDAD * calidadNorm
    : fiabilidad;
  const score = Math.max(0, Math.min(1, core * (0.5 + 0.5 * confianza) * recencia));

  const { nivel, motivo } = derivarNivel({ nConfirmadas, fiabilidad, calidadNorm });

  return {
    productorHash,
    producto,
    productoNorm: normalizeTerm(producto),
    vereda: predominant(lista, 'vereda'),
    municipio: predominant(lista, 'municipio'),
    nTransacciones: lista.length,
    nConfirmadas,
    nEntregados,
    fiabilidad,
    calidadPromedio,
    calidadNorm,
    reciente,
    score,
    nivel,
    motivo,
  };
}

/**
 * Agrupa una lista de tratos por (productorHash + producto normalizado). Solo
 * considera los COMPARTIBLES (pasa la compuerta anti-extractiva). Devuelve un
 * Map keyed por `"<productorHash>::<productoNorm>"`.
 *
 * @param {Array<Object>} tratos
 * @param {{ minLevel?: number }} [opts]
 * @returns {Map<string, Array<Object>>}
 */
export function groupTratos(tratos, opts = {}) {
  const compartibles = filterShareable(tratos, opts);
  const grupos = new Map();
  for (const t of compartibles) {
    const hash = t.productorHash || '';
    if (!hash) continue;
    const key = `${hash}::${normalizeTerm(t.producto)}`;
    const bucket = grupos.get(key);
    if (bucket) bucket.push(t);
    else grupos.set(key, [t]);
  }
  return grupos;
}

/**
 * Computa TODAS las reputaciones (una por productor×producto) desde la lista
 * cruda de tratos. Aplica la compuerta anti-extractiva internamente.
 *
 * @param {Array<Object>} tratos
 * @param {Object} [opts] — { now, halfLifeDias, minLevel }
 * @returns {Array<import('./types.js').Reputacion>}
 */
export function computeAllReputaciones(tratos, opts = {}) {
  const grupos = groupTratos(tratos, opts);
  const out = [];
  for (const bucket of grupos.values()) {
    out.push(computeReputacion(bucket, opts));
  }
  // Orden estable útil para UI/tests: mejor score primero.
  out.sort((a, b) => b.score - a.score || b.reciente - a.reciente);
  return out;
}

/**
 * Construye el grafo social (nodos + aristas agregadas) desde los tratos
 * compartibles. CULTIVA (productor→cultivo), EN (productor→vereda), ENTREGO_A
 * (productor→comprador).
 *
 * @param {Array<Object>} tratos
 * @param {{ minLevel?: number }} [opts]
 * @returns {import('./types.js').SocialGraph}
 */
export function buildSocialGraph(tratos, opts = {}) {
  const total = Array.isArray(tratos) ? tratos.length : 0;
  const compartibles = filterShareable(tratos, opts);

  const productores = new Set();
  const cultivos = new Set();
  const veredas = new Set();
  const cultivaMap = new Map(); // hash::productoNorm -> arista
  const ubicadoMap = new Map(); // hash::veredaNorm -> arista
  const entregoMap = new Map(); // hash::comprador -> arista

  for (const t of compartibles) {
    const hash = t.productorHash || '';
    if (!hash) continue;
    productores.add(hash);

    const producto = t.producto || '';
    const pNorm = normalizeTerm(producto);
    if (pNorm) {
      cultivos.add(pNorm);
      const key = `${hash}::${pNorm}`;
      const arista = cultivaMap.get(key) || {
        productorHash: hash,
        producto,
        cultivoId: t.cultivoId ?? null,
        count: 0,
        entregados: 0,
        reciente: 0,
      };
      arista.count += 1;
      if (pesoEntrega(t.entrega) >= 1) arista.entregados += 1;
      arista.reciente = Math.max(arista.reciente, Number(t.createdAt) || 0);
      if (!arista.cultivoId && t.cultivoId) arista.cultivoId = t.cultivoId;
      cultivaMap.set(key, arista);
    }

    const vereda = (t.vereda || '').trim();
    if (vereda) {
      const vNorm = normalizeTerm(vereda);
      veredas.add(vNorm);
      const key = `${hash}::${vNorm}`;
      const arista = ubicadoMap.get(key) || {
        productorHash: hash,
        vereda,
        municipio: t.municipio || '',
        count: 0,
      };
      arista.count += 1;
      ubicadoMap.set(key, arista);
    }

    const comprador = t.compradorHash || '';
    if (comprador) {
      const key = `${hash}::${comprador}`;
      const arista = entregoMap.get(key) || {
        productorHash: hash,
        compradorHash: comprador,
        count: 0,
      };
      arista.count += 1;
      entregoMap.set(key, arista);
    }
  }

  return {
    nodos: {
      productores: [...productores],
      cultivos: [...cultivos],
      veredas: [...veredas],
    },
    cultiva: [...cultivaMap.values()],
    ubicadoEn: [...ubicadoMap.values()],
    entregoA: [...entregoMap.values()],
    meta: {
      tratos: total,
      compartidos: compartibles.length,
      minShareLevel: opts.minLevel ?? 2,
    },
  };
}

/** Constantes del modelo expuestas para test/telemetría (no reflectar closures). */
export const __MODEL__ = Object.freeze({
  PRIOR_ENTREGA,
  K_CONFIANZA,
  HALF_LIFE_DIAS_DEFAULT,
  MIN_CONFIRMADAS,
  UMBRAL_VERDE,
  UMBRAL_AMBAR,
  UMBRAL_CALIDAD_VERDE,
  PESO_FIABILIDAD,
  PESO_CALIDAD,
});
