/**
 * soilDiagnostic — diagnóstico de suelo sin laboratorio (DR-SUELOS-1).
 *
 * Fuente: DR-SUELOS-1-consolidado (3/3 DeepSeek+Gemini+Meta, 2026-06-11).
 * Datos: src/data/soil-diagnostics.json
 *
 * Árbol de decisión: escuchar → visual → bio-indicadores → textura →
 * pH → estructura → recomendar enmienda con guarda.
 *
 * Guardas de seguridad:
 * - Vinagre/bicarbonato NO sirve para decidir cal (MITO).
 * - NO sobre-encalar (pH>7 bloquea Fe/Zn).
 * - Ceniza JAMÁS en suelo alcalino.
 * - Cal NO con urea/estiércol fresco.
 * - Recomendación de cal SOLO si pH<5.5 confirmado.
 * - Aguacate: si mal drenaje → ALERTA CRÍTICA.
 *
 * CERO invención. Solo datos con fuente en el consolidado.
 */

import SOIL_DATA from '../data/soil-diagnostics.json';

/**
 * @typedef {Object} DiagnosticoResult
 * @property {string[]} problemas — lista de problemas detectados
 * @property {Object[]} pruebas — pruebas caseras sugeridas
 * @property {Object[]} enmiendas — enmiendas recomendadas con guarda
 * @property {Object|null} suelo — tipo de suelo estimado (si aplica)
 * @property {string[]} advertencias — guardas activas
 * @property {boolean} sin_datos — true si no hay suficiente información
 * @property {string} fuente — referencia al DR
 */

/**
 * Mapea la descripción del campesino a problemas de suelo.
 * Usa las señales de voz del DR.
 *
 * @param {string} descripcion — texto del campesino describiendo su suelo
 * @returns {DiagnosticoResult}
 */
export function diagnosticarSuelo(descripcion) {
  if (!descripcion || typeof descripcion !== 'string' || descripcion.trim().length < 3) {
    return {
      problemas: [],
      pruebas: [],
      enmiendas: [],
      suelo: null,
      advertencias: [],
      sin_datos: true,
      fuente: SOIL_DATA.fuente,
    };
  }

  const texto = descripcion.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const problemas = new Set();
  const pruebasIds = new Set();
  const advertencias = [];

  // 1. Mapear señales de voz a problemas + pruebas
  for (const [clave, senal] of Object.entries(SOIL_DATA.senales_voz)) {
    const palabras = clave.split('_');
    if (palabras.every((p) => texto.includes(p) || texto.includes(p.replace('a', '')))) {
      senal.problemas.forEach((p) => problemas.add(p));
      if (senal.prueba) pruebasIds.add(senal.prueba);
    }
  }

  // 2. Bio-indicadores mencionados
  for (const bio of SOIL_DATA.bioindicadores) {
    const nombreNorm = bio.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // Match más flexible: cada palabra significativa del nombre del bio
    // debe aparecer en el texto (ignoramos conectores /, (), etc.)
    const palabrasBio = nombreNorm
      .replace(/[/()[\],.]/g, ' ')
      .split(/\s+/)
      .filter((p) => p.length > 3);
    const matchBio = palabrasBio.some((p) => texto.includes(p));

    if (matchBio) {
      if (bio.confiabilidad === 'mito') {
        advertencias.push(`MITO: ${bio.nombre} — ${bio.detalle}`);
      } else if (bio.indica && bio.indica !== 'mito') {
        problemas.add(bio.indica);
        if (bio.indica === 'acidez') pruebasIds.add('ph_tiras');
        if (bio.indica === 'suelo_vivo') pruebasIds.add('test_mostaza');
        if (bio.indica.includes('compactacion')) pruebasIds.add('varilla_penetracion');
        if (bio.indica.includes('encharcamiento')) pruebasIds.add('infiltracion_hoyo');
        if (bio.indica.includes('fertilidad')) pruebasIds.add('test_mostaza');
        if (bio.indica === 'degradacion') pruebasIds.add('terron_agua');
      }
    }
  }

  // 2b. Advertencias de mitos si se menciona vinagre/bicarbonato (sin necesidad de bio-indicador)
  if (texto.includes('vinagre') || texto.includes('bicarbonato')) {
    advertencias.push(
      'MITO: Vinagre/bicarbonato NO sirve para decidir dosis de cal. El vinagre solo reacciona con carbonatos masivos (pH>7.5, rarísimo en suelos andinos). No detecta acidez intercambiable (Al³⁺) que es la que daña los cultivos. Use tiras de pH.',
    );
  }

  // 3. Detectar cultivo mencionado para alertas específicas
  const cultivo = detectarCultivo(texto);

  // 4. Si no hay datos, no inventar
  if (problemas.size === 0 && advertencias.length === 0) {
    return {
      problemas: [],
      pruebas: [],
      enmiendas: [],
      suelo: null,
      advertencias: [],
      sin_datos: true,
      fuente: SOIL_DATA.fuente,
    };
  }

  // 5. Buscar pruebas sugeridas
  const pruebas = [];
  for (const id of pruebasIds) {
    const indicador = SOIL_DATA.indicadores.find((i) => i.id === id);
    if (indicador) {
      pruebas.push({
        id: indicador.id,
        nombre: indicador.nombre,
        confiabilidad: indicador.confiabilidad,
        como_se_hace: indicador.como_se_hace,
        advertencia: indicador.advertencia || null,
      });
    }
  }

  // 6. Recomendar enmiendas con guardas
  const enmiendas = [];
  const tieneAcidez = problemas.has('acidez') || problemas.has('acidez_potencial') || problemas.has('acidez_leve');
  if (tieneAcidez) {
    enmiendas.push(buscarEnmienda('cal_dolomitica'));
    advertencias.push(
      'GUARDA: NO sobre-encalar. pH>7 bloquea hierro y zinc. Cal DOLOMITICA (Ca+Mg), no cal viva.',
      'GUARDA: NO aplicar cal con urea o estiércol fresco — pérdida de nitrógeno por volatilización.',
      'GUARDA: Solo encalar si pH<5.5 confirmado (tiras o helecho marranero).',
    );
    // Ceniza SOLO si no hay señal de alcalinidad
    if (!problemas.has('alcalino') && !problemas.has('sodico')) {
      enmiendas.push(buscarEnmienda('ceniza_madera'));
    }
  }
  if (tieneAcidez || problemas.has('deficit_fosforo_acido')) {
    enmiendas.push(buscarEnmienda('roca_fosforica'));
    advertencias.push(
      'GUARDA: Roca fosfórica SOLO funciona en pH<5.5 con microorganismos. No usar DAP en Andisoles (la trampa del P lo vuelve insoluble).',
    );
  }
  if (problemas.has('baja_materia_organica') || problemas.has('deficit_nutrientes') || problemas.has('agotamiento')) {
    enmiendas.push(buscarEnmienda('compost_bocashi'));
  }
  if (problemas.has('compactacion') || problemas.has('compactacion_fisica') || problemas.has('compactacion_encharcamiento')) {
    enmiendas.push(buscarEnmienda('abonos_verdes'));
  }
  if (problemas.has('mal_drenaje') || problemas.has('encharcamiento')) {
    enmiendas.push(buscarEnmienda('camellones_drenaje'));
  }
  if (problemas.has('erosion')) {
    enmiendas.push(buscarEnmienda('barreras_vivas'));
  }
  if (problemas.has('arcilla_pesada') || problemas.has('sodico')) {
    enmiendas.push(buscarEnmienda('yeso_agricola'));
  }

  // 7. Alerta de aguacate si se menciona y hay mal drenaje
  if (cultivo === 'aguacate' && (problemas.has('mal_drenaje') || problemas.has('arcilla') || problemas.has('arcilla_pesada') || problemas.has('encharcamiento'))) {
    advertencias.push(
      'ALERTA CRÍTICA: Aguacate con mal drenaje = muerte segura por Phytophthora cinnamomi. Camellones altos (≥60cm) o zanjas de drenaje OBLIGATORIOS. NUNCA sembrar en plano.',
    );
  }

  // 8. Advertencias de mitos si se mencionan

  // 9. Estimar tipo de suelo
  const suelo = estimarTipoSuelo(problemas, texto);

  return {
    problemas: Array.from(problemas),
    pruebas,
    enmiendas: enmiendas.filter(Boolean),
    suelo,
    advertencias,
    sin_datos: false,
    fuente: SOIL_DATA.fuente,
  };
}

function buscarEnmienda(id) {
  const e = SOIL_DATA.enmiendas.find((enm) => enm.id === id);
  return e ? { id: e.id, nombre: e.nombre, problema_que_corrige: e.problema_que_corrige, dosis_orientativa: e.dosis_orientativa, precaucion: e.precaucion, fuente: e.fuente } : null;
}

function detectarCultivo(texto) {
  for (const cultivo of Object.keys(SOIL_DATA.cultivo_suelo)) {
    if (texto.includes(cultivo)) return cultivo;
  }
  return null;
}

function estimarTipoSuelo(problemas, texto) {
  // Heurística simple basada en pisos térmicos y problemas
  if (texto.includes('paramo') || texto.includes('volcan') || texto.includes('ceniza')) {
    return SOIL_DATA.tipos_suelo.find((t) => t.id === 'andisol');
  }
  if (texto.includes('llano') || texto.includes('amazonia') || texto.includes('selva') || texto.includes('tierra roja')) {
    if (problemas.has('acidez')) return SOIL_DATA.tipos_suelo.find((t) => t.id === 'oxisol_ultisol');
  }
  if (texto.includes('ladera') || texto.includes('pendiente') || texto.includes('loma') && problemas.has('erosion')) {
    return SOIL_DATA.tipos_suelo.find((t) => t.id === 'inceptisol');
  }
  if (problemas.has('arcilla_pesada') && !problemas.has('acidez')) {
    return SOIL_DATA.tipos_suelo.find((t) => t.id === 'vertisol');
  }
  return null;
}

/**
 * Retorna solo las guardas activas para los problemas detectados.
 * Útil para inyectar al grounding del agente como bloque de seguridad.
 *
 * @param {DiagnosticoResult} diagnostico
 * @returns {string}
 */
export function formatearGroundingSuelo(diagnostico) {
  if (!diagnostico || diagnostico.sin_datos) return '';

  const partes = [];

  if (diagnostico.suelo) {
    partes.push(`**Tipo de suelo estimado:** ${diagnostico.suelo.nombre} (pH ${diagnostico.suelo.ph_rango}). ${diagnostico.suelo.recomendacion}`);
  }

  if (diagnostico.problemas.length > 0) {
    partes.push(`**Problemas detectados:** ${diagnostico.problemas.join(', ')}.`);
  }

  if (diagnostico.pruebas.length > 0) {
    const confiables = diagnostico.pruebas.filter((p) => p.confiabilidad === 'alta' || p.confiabilidad === 'media_alta');
    if (confiables.length > 0) {
      partes.push('**Pruebas caseras recomendadas:**');
      confiables.forEach((p) => {
        partes.push(`- ${p.nombre} (confiabilidad: ${p.confiabilidad}). ${p.como_se_hace[0]}`);
      });
    }
  }

  if (diagnostico.enmiendas.length > 0) {
    partes.push('**Enmiendas sugeridas:**');
    diagnostico.enmiendas.forEach((e) => {
      partes.push(`- ${e.nombre}: ${e.dosis_orientativa}. ${e.precaucion}`);
    });
  }

  if (diagnostico.advertencias.length > 0) {
    partes.push('**GUARDAS DE SEGURIDAD:**');
    diagnostico.advertencias.forEach((a) => partes.push(`- ${a}`));
  }

  partes.push(`Fuente: ${diagnostico.fuente}`);
  return partes.join('\n\n');
}
