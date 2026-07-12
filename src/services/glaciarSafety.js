/**
 * glaciarSafety.js — lógica PURA y testeable del estado de seguridad de un
 * punto glaciar a partir de un reporte de campo (v2 "escala creíble").
 *
 * Reglas de OVERRIDE JERÁRQUICO: el peor disparador gana. El orden de
 * evaluación es: modo observación → 🔴 peligro → 🟡 precaución → 🟢 estable.
 *
 *   🔵 OBSERVACIÓN — si `pisoGlaciar === false` (modo borde, no se pisó el
 *      hielo): se registra estado y retroceso, NO se emite juicio de tránsito.
 *
 *   🔴 PELIGRO:
 *      - hielo podrido (tipo de superficie de cualquier capa O peligro) SIEMPRE.
 *      - séracs SI la ruta pasa por debajo (rutaBajoSeracs).
 *      - grietas con puente de nieve Y (dureza superficie ≤ 4F  O  hora > mediodía
 *        O  nieve reciente en 24h).
 *      - riesgo de avalancha con nieve fresca en pendiente.
 *      - penitentes densos.
 *
 *   🟡 PRECAUCIÓN:
 *      - hielo de glaciar azul con dureza H2.
 *      - grietas con puente de nieve en mañana fría (hora < 10:00) y
 *        superficie ≥ 1F (puente más firme, pero ojo).
 *      - hielo cubierto de detritos.
 *      - agua de deshielo superficial.
 *      - dureza F/4F sobre glaciar (superficie muy blanda).
 *      - cualquier otro peligro observado no crítico.
 *
 *   🟢 ESTABLE:
 *      - firn/névé con dureza 1F–P sin peligros, mañana fría.
 *      - hielo de glaciar azul con dureza H1 sin grietas/séracs/agua.
 *
 * La función es pura: mismo reporte → mismo estado. Sin red, sin Date.now()
 * (la hora se pasa explícita). Apta para tests deterministas y para correr
 * offline en campo.
 *
 * Sobre la dureza por CAPAS: la capa SUPERIOR (la más somera) manda el
 * tránsito. Si el reporte trae `capas`, usamos la dureza/superficie de la
 * primera capa como "superficie". Una `lecturaPuntual` (superficie + dureza
 * sueltas) sirve de respaldo si no hay capas.
 *
 * @module services/glaciarSafety
 */

/**
 * @typedef {Object} EstadoSeguridad
 * @property {'estable'|'precaucion'|'peligro'|'observacion'} nivel
 * @property {string} emoji
 * @property {string} label
 * @property {string} desc
 * @property {string} color
 */

import {
  ESTADOS_SEGURIDAD,
  DUREZAS_BLANDAS,
  ordenDureza,
} from '../data/glaciar-schema.js';

/** @type {Readonly<{estable: EstadoSeguridad, precaucion: EstadoSeguridad, peligro: EstadoSeguridad, observacion: EstadoSeguridad}>} */
const EST = ESTADOS_SEGURIDAD;

/** Tipos de superficie que, por sí solos (en cualquier capa), fuerzan 🔴. */
export const SUPERFICIES_CRITICAS = Object.freeze(['hielo_podrido']);

/** Peligros que fuerzan 🔴 de forma incondicional. */
export const PELIGROS_CRITICOS_SIEMPRE = Object.freeze(['hielo_podrido']);

/** Orden de la dureza "4F" — umbral de superficie blanda para puentes. */
const ORDEN_4F = ordenDureza('4F'); // 2
/** Orden de la dureza "1F" — superficie ya firme para puente en mañana fría. */
const ORDEN_1F = ordenDureza('1F'); // 3

/** Mediodía y "mañana fría" como horas locales (0–23.999). */
const HORA_MEDIODIA = 12;
const HORA_MANANA_FRIA = 10;

/**
 * Normaliza la "superficie de tránsito" del reporte: capa superior si hay
 * perfil por capas, si no la lectura puntual / campos sueltos.
 *
 * @param {Object} reporte
 * @returns {{tipoSuperficie: string|null, dureza: string|null,
 *   tiposTodos: string[]}} superficie de tránsito + todos los tipos vistos.
 */
function superficieDeTransito(reporte) {
  const capas = Array.isArray(reporte.capas) ? reporte.capas.filter(Boolean) : [];
  const tiposTodos = [];

  let tipoSuperficie = null;
  let dureza = null;

  if (capas.length > 0) {
    // La primera capa es la más somera (superficie) → manda el tránsito.
    tipoSuperficie = capas[0].tipoSuperficie || null;
    dureza = capas[0].dureza || null;
    for (const c of capas) if (c.tipoSuperficie) tiposTodos.push(c.tipoSuperficie);
  }

  // Lectura puntual / campos sueltos como respaldo o complemento.
  if (!tipoSuperficie && reporte.tipoSuperficie) tipoSuperficie = reporte.tipoSuperficie;
  if (!dureza && reporte.dureza) dureza = reporte.dureza;
  if (reporte.tipoSuperficie) tiposTodos.push(reporte.tipoSuperficie);

  return { tipoSuperficie, dureza, tiposTodos };
}

/**
 * Extrae la hora local (0–23.999) del reporte. Acepta `horaLocal` numérica
 * (horas), o `fechaISO` (de la que se toma la hora local del Date). Null si no
 * se puede determinar.
 *
 * @param {Object} reporte
 * @returns {number|null}
 */
function horaDelReporte(reporte) {
  if (typeof reporte.horaLocal === 'number' && Number.isFinite(reporte.horaLocal)) {
    return reporte.horaLocal;
  }
  if (typeof reporte.fechaISO === 'string') {
    const d = new Date(reporte.fechaISO);
    if (!Number.isNaN(d.getTime())) return d.getHours() + d.getMinutes() / 60;
  }
  return null;
}

/**
 * Evalúa el estado de seguridad de un punto glaciar.
 *
 * @param {Object} reporte
 * @param {Array<{tipoSuperficie?:string, dureza?:string}>} [reporte.capas]
 *   Perfil por capas (la [0] es la superficie). Manda el tránsito.
 * @param {string} [reporte.tipoSuperficie] - lectura puntual de superficie.
 * @param {string} [reporte.dureza] - código de dureza (F..H2) puntual.
 * @param {string[]} [reporte.peligros] - keys de PELIGROS.
 * @param {boolean} [reporte.pisoGlaciar] - false → modo observación (borde).
 * @param {boolean} [reporte.rutaBajoSeracs] - la ruta pasa bajo séracs.
 * @param {boolean} [reporte.penitentesDensos] - penitentes densos/altos.
 * @param {boolean} [reporte.pendientePronunciada] - pendiente pronunciada.
 * @param {boolean} [reporte.nieveReciente24h] - nieve fresca en 24h.
 * @param {number} [reporte.horaLocal] - hora local (0–23.999) del reporte.
 * @param {string} [reporte.fechaISO] - alternativa para derivar la hora.
 * @returns {{nivel: 'estable'|'precaucion'|'peligro'|'observacion',
 *   emoji: string, label: string, desc: string, color: string,
 *   razones: string[]}}
 */
export function evaluarSeguridadGlaciar(reporte = {}) {
  const peligros = Array.isArray(reporte.peligros) ? reporte.peligros : [];
  const has = (k) => peligros.includes(k);
  const { tipoSuperficie, dureza, tiposTodos } = superficieDeTransito(reporte);
  const hora = horaDelReporte(reporte);
  const nieveReciente = reporte.nieveReciente24h === true;
  const ordenSup = dureza ? ordenDureza(dureza) : null;

  // ── 🔵 OBSERVACIÓN: no se pisó el hielo (modo borde) ──
  if (reporte.pisoGlaciar === false) {
    return {
      ...EST.observacion,
      razones: ['No se pisó el hielo: registro de borde para trazabilidad, sin juicio de tránsito.'],
    };
  }

  const razonesPeligro = [];

  // ── 🔴 hielo podrido SIEMPRE (en cualquier capa o como peligro) ──
  const hayPodrido =
    tiposTodos.some((t) => SUPERFICIES_CRITICAS.includes(t)) ||
    peligros.some((p) => PELIGROS_CRITICOS_SIEMPRE.includes(p));
  if (hayPodrido) razonesPeligro.push('Hielo podrido: no sostiene peso, puede colapsar.');

  // ── 🔴 séracs SI la ruta pasa por debajo ──
  if (has('seracs') && reporte.rutaBajoSeracs === true) {
    razonesPeligro.push('Séracs sobre la ruta: riesgo de colapso por encima.');
  }

  // ── 🔴 grietas con puente de nieve Y (sup ≤ 4F  O  hora > mediodía  O  nieve 24h) ──
  if (has('grietas_con_puente_nieve')) {
    const supBlanda = ordenSup != null && ordenSup <= ORDEN_4F;
    const tarde = hora != null && hora > HORA_MEDIODIA;
    if (supBlanda || tarde || nieveReciente) {
      const causa = supBlanda
        ? 'superficie blanda'
        : tarde
          ? 'pasado el mediodía (puentes se ablandan)'
          : 'nieve reciente (24h)';
      razonesPeligro.push(`Puente de nieve sobre grieta con ${causa}.`);
    }
  }

  // ── 🔴 riesgo de avalancha con nieve fresca en pendiente ──
  if (has('riesgo_avalancha')) {
    const hayNieveFresca = nieveReciente || tiposTodos.includes('nieve_fresca');
    const enPendiente = reporte.pendientePronunciada === true || has('pendiente_pronunciada');
    if (hayNieveFresca && enPendiente) {
      razonesPeligro.push('Riesgo de avalancha: nieve fresca sobre pendiente pronunciada.');
    }
  }

  // ── 🔴 penitentes densos ──
  if (reporte.penitentesDensos === true && (has('penitentes') || tiposTodos.includes('penitentes'))) {
    razonesPeligro.push('Penitentes densos: tránsito inseguro y agotador.');
  }

  if (razonesPeligro.length > 0) {
    return { ...EST.peligro, razones: razonesPeligro };
  }

  // A partir de acá NO hay disparadores 🔴.
  const razonesPrecaucion = [];

  // ── 🟡 hielo azul con dureza H2 ──
  if (tipoSuperficie === 'hielo_glaciar_azul' && dureza === 'H2') {
    razonesPrecaucion.push('Hielo azul muy duro (H2): cuesta clavar, resbala.');
  }

  // ── 🟡 grietas con puente de nieve en mañana fría (<10:00) y sup ≥ 1F ──
  if (has('grietas_con_puente_nieve')) {
    const mananaFria = hora != null && hora < HORA_MANANA_FRIA;
    const supFirme = ordenSup != null && ordenSup >= ORDEN_1F;
    if (mananaFria && supFirme) {
      razonesPrecaucion.push('Puente de nieve sobre grieta en mañana fría: firme, pero vigile.');
    }
  }

  // ── 🟡 hielo cubierto de detritos ──
  if (tiposTodos.includes('hielo_cubierto_detritos')) {
    razonesPrecaucion.push('Hielo cubierto de detritos: huecos y roca suelta ocultos.');
  }

  // ── 🟡 agua de deshielo superficial ──
  if (has('agua_deshielo_superficial')) {
    razonesPrecaucion.push('Agua de deshielo en superficie: hielo debilitándose.');
  }

  // ── 🟡 dureza F/4F sobre glaciar (superficie muy blanda) ──
  if (dureza && DUREZAS_BLANDAS.includes(dureza)) {
    razonesPrecaucion.push('Superficie muy blanda (la mano entra): cuidado con puentes y carga.');
  }

  // ── 🟡 otros peligros observados no contemplados arriba ──
  for (const p of peligros) {
    if (p === 'ninguno_evidente') continue;
    if (
      p === 'grietas_con_puente_nieve' || // ya manejado
      p === 'hielo_podrido' || // ya 🔴
      p === 'agua_deshielo_superficial' // ya manejado
    ) continue;
    razonesPrecaucion.push(peligroLabel(p));
  }

  if (razonesPrecaucion.length > 0) {
    // De-duplicar conservando orden.
    const razones = [...new Set(razonesPrecaucion)];
    return { ...EST.precaucion, razones };
  }

  // ── 🟢 ESTABLE: condiciones limpias ──
  const mananaFria = hora == null || hora < HORA_MANANA_FRIA;

  // firn/névé con dureza 1F–P sin peligros, mañana fría.
  const firnFirme =
    tipoSuperficie === 'firn_neve' &&
    ordenSup != null &&
    ordenSup >= ORDEN_1F &&
    ordenSup <= ordenDureza('P');
  if (firnFirme && mananaFria) {
    return {
      ...EST.estable,
      razones: ['Firn firme en mañana fría, sin peligros: buen agarre.'],
    };
  }

  // hielo de glaciar azul con H1 sin grietas/séracs/agua.
  if (tipoSuperficie === 'hielo_glaciar_azul' && dureza === 'H1') {
    return {
      ...EST.estable,
      razones: ['Hielo trabajable (H1) sin peligros: clava bien el crampón.'],
    };
  }

  // Sin dureza registrada → no podemos afirmar estabilidad.
  if (!dureza) {
    return {
      ...EST.precaucion,
      razones: ['Falta medir la dureza del hielo para confirmar el estado.'],
    };
  }

  // Caso limpio genérico (con dureza, sin peligros ni disparadores).
  return {
    ...EST.estable,
    razones: ['Superficie medida y sin peligros observados.'],
  };
}

const PELIGRO_LABELS = {
  grietas_abiertas: 'Grietas abiertas.',
  grietas_con_puente_nieve: 'Grietas con puente de nieve.',
  seracs: 'Séracs cerca.',
  rimaya_bergschrund: 'Rimaya (bergschrund).',
  puente_nieve_debil: 'Puente de nieve débil.',
  agua_deshielo_superficial: 'Agua de deshielo superficial.',
  hielo_podrido: 'Hielo podrido.',
  penitentes: 'Penitentes.',
  riesgo_avalancha: 'Riesgo de avalancha.',
  roca_suelta_sobre_hielo: 'Roca suelta sobre el hielo.',
  pendiente_pronunciada: 'Pendiente pronunciada.',
};

function peligroLabel(key) {
  return PELIGRO_LABELS[key] || key.replace(/_/g, ' ');
}
