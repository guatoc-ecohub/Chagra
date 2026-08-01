/**
 * waterDiagnostic — diagnóstico y calculadora de captación de agua (DR-AGUA-1).
 *
 * Fuente: DR-AGUA-1-consolidado (3/3 DeepSeek+Gemini+Meta, 2026-06-11).
 * Referencias: IDEAM, AGROSAVIA, CIPAV, FAO, SENA, Cenicafe, CORPOICA, CIAT, UICN.
 *
 * Fórmula de captación: Vc = area × lluvia(mm) × Ce × η (η≈0.85).
 * 1mm de lluvia sobre 1m² = 1 litro.
 *
 * EXCLUIDO del módulo:
 * - Calendario lunar de riego (MITO 2-de-3 LLMs)
 * - Poliacrilato/hidrogel sintetico (NO agroecologico)
 * - Radiestesia/pendulo/varillas (PSEUDOCIENCIA)
 *
 * CERO invencion. Solo datos con fuente en el DR.
 */

import WATER_DATA from '../data/water-diagnostics.json';

/**
 * @typedef {Object} CaptacionResult
 * @property {number} area_m2 — area del techo en m2
 * @property {number} lluvia_mm — precipitacion anual en mm
 * @property {number} ce — coeficiente de escorrentia
 * @property {number} eta — eficiencia
 * @property {number} litros_anuales — volumen captado en litros/ano
 * @property {number} litros_diarios — promedio diario
 */

/**
 * Calcula el volumen de agua captable de un techo.
 * Vc = area × lluvia × Ce × η
 *
 * @param {number} area_m2 — area del techo en metros cuadrados
 * @param {number} lluvia_mm — precipitacion anual en mm (IDEAM)
 * @param {number} ce — coeficiente de escorrentia del material del techo
 * @param {number} [eta=0.85] - eficiencia (filtros, perdidas). Default 0.85
 * @returns {CaptacionResult|null}
 */
export function calcularCaptacion(area_m2, lluvia_mm, ce, eta = 0.85) {
  if (!area_m2 || area_m2 <= 0 || !lluvia_mm || lluvia_mm <= 0 || !ce || ce <= 0) return null;
  const litros_anuales = Math.round(area_m2 * lluvia_mm * ce * eta);
  return {
    area_m2,
    lluvia_mm,
    ce,
    eta,
    litros_anuales,
    litros_diarios: Math.round(litros_anuales / 365),
  };
}

/**
 * Estima la lluvia anual segun region colombiana.
 *
 * @param {string} region — clave de la region (caribe_seco, andina_cafetera, etc.)
 * @returns {{min_mm:number, max_mm:number, nombre:string}|null}
 */
export function estimarLluviaRegion(region) {
  return WATER_DATA.lluvia_region[region] || null;
}

/**
 * Busca un sistema de captacion por material del techo.
 *
 * @param {string} material — 'zinc', 'cemento', 'arcilla', 'paja', etc.
 * @returns {Object|null}
 */
export function buscarCaptacion(material) {
  return WATER_DATA.sistemas_captacion.find((s) =>
    s.id.includes(material) || s.nombre.toLowerCase().includes(material),
  ) || null;
}

/**
 * @typedef {Object} DiagnosticoAguaResult
 * @property {string[]} problemas
 * @property {Object|null} captacion — resultado de calcularCaptacion si hay datos
 * @property {Object[]} riego — sistemas de riego recomendados
 * @property {Object[]} conservacion — practicas de conservacion sugeridas
 * @property {string[]} enso — acciones ENSO si hay sequia/exceso
 * @property {string[]} advertencias — guardas activas
 * @property {boolean} sin_datos
 * @property {string} fuente
 */

/**
 * Diagnostica la situacion hidrica a partir de la descripcion del campesino.
 *
 * @param {string} descripcion
 * @param {Object} [opts]
 * @param {number} [opts.area_techo_m2]
 * @param {number} [opts.lluvia_mm]
 * @param {string} [opts.material_techo]
 * @param {string} [opts.cultivo]
 * @returns {DiagnosticoAguaResult}
 */
export function diagnosticarAgua(descripcion, opts = {}) {
  if (!descripcion || typeof descripcion !== 'string' || descripcion.trim().length < 3) {
    return { problemas: [], captacion: null, riego: [], conservacion: [], enso: [], advertencias: [], sin_datos: true, fuente: WATER_DATA.fuente };
  }

  const texto = descripcion.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const problemas = new Set();
  const advertencias = [];

  // 1. Senales de voz
  for (const [clave, senal] of Object.entries(WATER_DATA.senales_voz)) {
    const palabras = clave.split('_');
    if (palabras.every((p) => texto.includes(p))) {
      senal.problemas?.forEach((p) => problemas.add(p));
    }
  }

  // 2. Calcular captacion si hay datos
  let captacion = null;
  if (opts.area_techo_m2 && opts.lluvia_mm && opts.material_techo) {
    const sist = buscarCaptacion(opts.material_techo);
    if (sist) {
      captacion = calcularCaptacion(opts.area_techo_m2, opts.lluvia_mm, sist.ce);
    }
  }

  // 3. Recomendar riego
  const riego = [];
  if (opts.area_techo_m2 && opts.area_techo_m2 < 20) {
    riego.push(WATER_DATA.sistemas_riego.find((r) => r.id === 'botella_enterrada'));
  }
  if (captacion && captacion.litros_anuales > 10000) {
    riego.push(WATER_DATA.sistemas_riego.find((r) => r.id === 'goteo_cinta'));
  }
  riego.push(WATER_DATA.sistemas_riego.find((r) => r.id === 'mecha_wicking'));

  // 4. Conservacion
  const conservacion = [];
  if (problemas.has('deficit_hidrico') || problemas.has('estres_sequia') || problemas.has('sequia_prolongada')) {
    conservacion.push(WATER_DATA.practicas_conservacion.find((p) => p.id === 'mulch'));
    conservacion.push(WATER_DATA.practicas_conservacion.find((p) => p.id === 'materia_organica'));
  }
  if (problemas.has('exceso_hidrico') || problemas.has('mal_drenaje')) {
    conservacion.push(WATER_DATA.practicas_conservacion.find((p) => p.id === 'zanjas_infiltracion'));
  }

  // 5. ENSO
  const enso = [];
  if (problemas.has('sequia_prolongada') || problemas.has('fuente_agotada') || problemas.has('deficit_hidrico')) {
    enso.push(...WATER_DATA.enso_agua.el_nino.antes.slice(0, 3));
  }

  // 6. Guardas
  advertencias.push(WATER_DATA.guardas.marchitez_mediodia);
  advertencias.push(WATER_DATA.guardas.riego_manana);
  if (captacion && captacion.litros_anuales > 0) {
    advertencias.push(WATER_DATA.guardas.primer_flush);
    advertencias.push(WATER_DATA.guardas.tanque_tapa);
  }

  // 7. Mitos detectados en el texto
  if (texto.includes('luna') || texto.includes('lunar') || texto.includes('menguante') || texto.includes('creciente')) {
    const mito = WATER_DATA.mitos.find((m) => m.id === 'riego_lunar');
    advertencias.push(`MITO: ${mito.nombre} — ${mito.detalle}`);
  }
  if (texto.includes('varilla') || texto.includes('pendulo') || texto.includes('radiestesia')) {
    const mito = WATER_DATA.mitos.find((m) => m.id === 'radiestesia_varillas');
    advertencias.push(`MITO: ${mito.nombre} — ${mito.detalle}`);
  }
  if (texto.includes('hidrogel') || texto.includes('poliacrilato')) {
    const mito = WATER_DATA.mitos.find((m) => m.id === 'hidrogel_sintetico');
    advertencias.push(`NO AGROECOLOGICO: ${mito.nombre} — ${mito.detalle}`);
  }

  if (problemas.size === 0 && !captacion && advertencias.length <= 2) {
    return { problemas: [], captacion: null, riego: [], conservacion: [], enso: [], advertencias, sin_datos: true, fuente: WATER_DATA.fuente };
  }

  return {
    problemas: Array.from(problemas),
    captacion,
    riego: riego.filter(Boolean),
    conservacion: conservacion.filter(Boolean),
    enso,
    advertencias,
    sin_datos: false,
    fuente: WATER_DATA.fuente,
  };
}

/**
 * Formatea el diagnostico para inyectar al grounding del agente.
 *
 * @param {DiagnosticoAguaResult} d
 * @returns {string}
 */
export function formatearGroundingAgua(d) {
  if (!d || d.sin_datos) return '';
  const partes = [];

  if (d.captacion) {
    partes.push(`**Captacion estimada:** ${d.captacion.litros_anuales.toLocaleString()} L/año (${d.captacion.litros_diarios.toLocaleString()} L/dia) desde ${d.captacion.area_m2}m² de techo con ${d.captacion.lluvia_mm}mm de lluvia y Ce=${d.captacion.ce}.`);
  }

  if (d.problemas.length > 0) {
    partes.push(`**Problemas detectados:** ${d.problemas.join(', ')}.`);
  }

  if (d.riego.length > 0) {
    partes.push('**Sistemas de riego recomendados:**');
    d.riego.forEach((r) => partes.push(`- ${r.nombre} (eficiencia ${Math.round(r.eficiencia * 100)}%, ${r.nota})`));
  }

  if (d.conservacion.length > 0) {
    partes.push('**Practicas de conservacion:**');
    d.conservacion.forEach((c) => partes.push(`- ${c.nombre}: ${c.nota}`));
  }

  if (d.enso.length > 0) {
    partes.push('**Acciones ante sequia/ENSO:**');
    d.enso.forEach((a) => partes.push(`- ${a}`));
  }

  if (d.advertencias.length > 0) {
    partes.push('**GUARDAS:**');
    d.advertencias.forEach((a) => partes.push(`- ${a}`));
  }

  partes.push(`Fuente: ${d.fuente}`);
  return partes.join('\n\n');
}
