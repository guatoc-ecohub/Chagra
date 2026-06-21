/**
 * toxicologiaInsumos.js — Deriva la ficha toxicológica de un insumo/biopreparado
 * a partir de los datos REALES del catálogo (catalog/biopreparados-seed.json,
 * cargado en runtime vía getAllBiopreparados()). NO inventa toxicidad ni dosis.
 *
 * Campos de origen en el catálogo:
 *   - precaucion_seguridad: texto libre con la advertencia (incluye "TOXICOLOGIA
 *     COBRE/AZUFRE", "EPI: guantes, careta...", "metal pesado", "Resolución ICA
 *     698/2011", etc. para los casos críticos).
 *   - dosis / dosis_aplicacion: dosis seguras de aplicación.
 *   - fuente / source_ids / confianza: trazabilidad de la fuente.
 *
 * Reglas anti-alucinación:
 *   - Si el insumo NO trae precaucion_seguridad, su nivel queda como
 *     'sin_dato' → la UI muestra "sin dato, manejar con precaución", nunca
 *     "no es tóxico".
 *   - El nivel y el EPI se DERIVAN del texto real (palabras clave), no se
 *     asignan a dedo. Si el texto no menciona un EPI, no lo afirmamos.
 */

const norm = (s) => (s || '')
  .toString()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '');

/**
 * Detecta el EPI mencionado explícitamente en el texto de seguridad.
 * Solo devuelve un EPI si el texto lo nombra (no se asume).
 */
export function detectarEPI(textoSeguridad) {
  const t = norm(textoSeguridad);
  const epi = [];
  if (/\bguantes?\b/.test(t)) epi.push({ id: 'guantes', label: 'Guantes' });
  if (/\bcareta|mascarilla|respirador|tapabocas\b/.test(t)) {
    epi.push({ id: 'careta', label: 'Careta o tapabocas' });
  }
  if (/\bgafas|antiparras|proteccion (de |para )?(los )?ojos\b/.test(t)) {
    epi.push({ id: 'gafas', label: 'Gafas de protección' });
  }
  if (/al aire libre|ventilad|ventilacion/.test(t)) {
    epi.push({ id: 'ventilacion', label: 'Trabajar al aire libre / ventilado' });
  }
  return epi;
}

/**
 * Deriva el nivel de toxicidad a partir del texto real de precaución.
 * Devuelve uno de: 'alto' | 'medio' | 'bajo' | 'sin_dato'.
 */
export function nivelToxicidad(bp) {
  const ps = bp?.precaucion_seguridad;
  if (!ps || !ps.trim()) return 'sin_dato';
  const t = norm(ps);

  // ALTO: metales pesados / azufre con EPI obligatorio / restricción legal.
  if (
    /metal pesado/.test(t)
    || /toxicologia (cobre|azufre)/.test(t)
    || /resolucion ica/.test(t)
    || /\bepi\b/.test(t)
    || (/careta/.test(t) && /irritante|corrosivo|vapores/.test(t))
  ) {
    return 'alto';
  }

  // MEDIO: riesgo sanitario, irritante, alcalino, fitotoxicidad por exceso.
  if (
    /riesgo sanitario/.test(t)
    || /irritante|corrosivo|alcalin|quema/.test(t)
    || /fitotoxic|acumulacion de cobre|sulfatos minerales/.test(t)
    || /patogen/.test(t)
  ) {
    return 'medio';
  }

  // BAJO: el texto lo dice explícitamente.
  if (/bajo riesgo/.test(t)) return 'bajo';

  // Hay texto pero no encaja en patrones → tratar como medio (conservador).
  return 'medio';
}

/** Detecta si hay una restricción legal citable (ICA) en el texto. */
export function restriccionLegal(bp) {
  const t = norm(bp?.precaucion_seguridad);
  if (/resolucion ica 698\/2011|resolucion ica 698|698\/2011/.test(t)) {
    return 'Uso restringido en certificación orgánica — Resolución ICA 698/2011 '
      + '(bioinsumos): hay un límite de cobre metálico por hectárea/año. Consulta la norma vigente.';
  }
  if (/resolucion ica/.test(t)) {
    return 'Sujeto a normativa ICA — consulta la resolución vigente para uso y límites.';
  }
  return null;
}

export const NIVEL_TOX_META = {
  alto: {
    label: 'Toxicidad alta',
    color: 'red',
    icono: '☠️',
    resumen: 'EPI obligatorio y precauciones estrictas. Puede tener restricciones legales.',
  },
  medio: {
    label: 'Toxicidad media',
    color: 'amber',
    icono: '⚠️',
    resumen: 'Manéjalo con cuidado: usa la protección indicada y respeta la dosis.',
  },
  bajo: {
    label: 'Toxicidad baja',
    color: 'emerald',
    icono: '🟢',
    resumen: 'Bajo riesgo, pero siempre con higiene básica (lavado de manos).',
  },
  sin_dato: {
    label: 'Sin dato — manejar con precaución',
    color: 'slate',
    icono: '❔',
    resumen:
      'Este insumo no tiene advertencia toxicológica registrada en el catálogo. '
      + 'No quiere decir que sea inofensivo: manéjalo con precaución y consulta a un técnico.',
  },
};

/**
 * Construye la ficha toxicológica completa de un biopreparado a partir del
 * objeto del catálogo. Todo sale del dato real; nada se inventa.
 */
export function fichaToxicologica(bp) {
  const nivel = nivelToxicidad(bp);
  const epi = detectarEPI(bp?.precaucion_seguridad);
  return {
    id: bp?.id,
    nombre: bp?.nombre || bp?.id,
    tipo: bp?.tipo || null,
    nivel,
    meta: NIVEL_TOX_META[nivel],
    epi,
    precaucion: bp?.precaucion_seguridad?.trim() || null,
    dosis: bp?.dosis_aplicacion || bp?.dosis || null,
    restriccion_legal: restriccionLegal(bp),
    fuente: bp?.fuente || null,
    source_ids: Array.isArray(bp?.source_ids) ? bp.source_ids : [],
    confianza: bp?.confianza || null,
  };
}

/** Orden de severidad para listar (alto primero, sin_dato al final tras bajo). */
const ORDEN_NIVEL = { alto: 0, medio: 1, bajo: 2, sin_dato: 3 };

/** Construye y ordena las fichas de una lista de biopreparados. */
export function fichasToxicologicas(biopreparados) {
  return (biopreparados || [])
    .filter((bp) => bp && bp.id)
    .map(fichaToxicologica)
    .sort((a, b) => (ORDEN_NIVEL[a.nivel] - ORDEN_NIVEL[b.nivel])
      || a.nombre.localeCompare(b.nombre, 'es'));
}
