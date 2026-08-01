/* eslint-disable chagra-i18n/no-hardcoded-spanish */
/**
 * cromatografiaInterpretacion.js — Motor de interpretación de cromatografía de suelo.
 *
 * Función pura que interpreta cromatogramas del método Pfeiffer/Restrepo a partir
 * de observaciones de zonas, colores y patrones. Diagnostica el estado del suelo
 * (vivo, degradado, químicalizado) con honestidad sobre la incertidumbre.
 *
 * Grounded en el contenido educativo de CromatografiaScreen (método Pfeiffer/Restrepo).
 * NO usa LLMs, solo reglas heurísticas deterministas basadas en la bibliografía.
 *
 * @module utils/cromatografiaInterpretacion
 */

/**
 * Estados posibles del suelo según la interpretación cromatográfica.
 * @typedef {'vivo' | 'degradado' | 'quimicalizado' | 'incertidumbre_alta'} EstadoSuelo
 */

/**
 * Zonas del cromatograma (método Pfeiffer).
 * @typedef {'central' | 'media' | 'externa' | 'picos'} ZonaCromatograma
 */

/**
 * Colores observables en cromatografía.
 * @typedef {'marron_oscuro' | 'blanco' | 'gris' | 'violeta' | 'rosado' | 'amarillo'} ColorCromatograma
 */

/**
 * @typedef {Object} ObservacionZona
 * @property {ZonaCromatograma} zona - Zona observada
 * @property {ColorCromatograma[]} colores - Colores presentes en la zona
 * @property {string} [descripcion] - Descripción libre de la zona
 */

/**
 * @typedef {Object} InterpretacionCromatografia
 * @property {EstadoSuelo} estado - Estado diagnosticado del suelo
 * @property {string} mensaje - Mensaje explicativo en tono usted campesino
 * @property {string[]} razones - Razones que justifican el diagnóstico
 * @property {number} confianza - Nivel de confianza (0-1)
 * @property {string} advertencia - Advertencia sobre incertidumbre si aplica
 */

/**
 * Diccionario de significados de colores por zona.
 * Basado en el contenido educativo de CromatografiaScreen.
 */
const SIGNIFICADO_COLOR = {
  marron_oscuro: {
    central: 'Minerales y sales disponibles',
    media: 'Materia orgánica y humus estable (deseable)',
    externa: 'Actividad microbiológica moderada',
    picos: 'Vida y energía del suelo',
    peso: 1, // Positivo para suelo vivo
  },
  blanco: {
    central: 'Minerales disponibles',
    media: 'Posible acumulación de sales',
    externa: 'Poca actividad biológica',
    picos: 'Poca energía',
    peso: 0, // Neutro
  },
  gris: {
    central: 'Compactación o exceso de sales',
    media: 'Materia orgánica degradada',
    externa: 'Suelo oxidado o anaerobio',
    picos: 'Poca vida microbiana',
    peso: -2, // Negativo para suelo vivo
  },
  violeta: {
    central: 'Raro, puede indicar contaminación',
    media: 'Mineralización activa',
    externa: 'Actividad enzimática fuerte (suelo vivo)',
    picos: 'Biodiversidad microbiana alta',
    peso: 2, // Muy positivo
  },
  rosado: {
    central: 'Raro, puede indicar reacción inusual',
    media: 'Bacterias beneficiosas activas',
    externa: 'Actividad biológica positiva',
    picos: 'Suelo con vida activa',
    peso: 2, // Muy positivo
  },
  amarillo: {
    central: 'Posible presencia de azufre',
    media: 'Compuestos orgánicos específicos',
    externa: 'Mineralización',
    picos: 'Energía',
    peso: 0, // Neutro, requiere contexto
  },
};

/**
 * Patrones que indican suelo vivo según Pfeiffer/Restrepo.
 * Basado en bibliografía del método.
 */
const PATRONES_SUELO_VIVO = [
  {
    nombre: 'Humus estable',
    patron: (obs) => {
      const zonaMedia = obs.find((o) => o.zona === 'media');
      return (
        zonaMedia?.colores.includes('marron_oscuro') &&
        zonaMedia?.colores.length <= 3
      );
    },
    peso: 3,
  },
  {
    nombre: 'Actividad enzimática',
    patron: (obs) => {
      const zonaExterna = obs.find((o) => o.zona === 'externa');
      return (
        zonaExterna?.colores.includes('violeta') ||
        zonaExterna?.colores.includes('rosado')
      );
    },
    peso: 2,
  },
  {
    nombre: 'Picos definidos',
    patron: (obs) => {
      const zonaPicos = obs.find((o) => o.zona === 'picos');
      return (
        zonaPicos?.colores.some(
          (c) => c === 'violeta' || c === 'rosado' || c === 'marron_oscuro'
        )
      );
    },
    peso: 2,
  },
  {
    nombre: 'Centro claro',
    patron: (obs) => {
      const zonaCentral = obs.find((o) => o.zona === 'central');
      return zonaCentral?.colores.includes('blanco');
    },
    peso: 1,
  },
];

/**
 * Patrones que indican suelo degradado.
 */
const PATRONES_SUELO_DEGRADADO = [
  {
    nombre: 'Zona gris difusa',
    patron: (obs) => {
      return obs.some(
        (o) => o.zona === 'media' && o.colores.includes('gris')
      );
    },
    peso: -3,
  },
  {
    nombre: 'Bordes pálidos',
    patron: (obs) => {
      const zonaExterna = obs.find((o) => o.zona === 'externa');
      return (
        zonaExterna?.colores.length === 0 ||
        (zonaExterna?.colores.length === 1 &&
          zonaExterna?.colores[0] === 'blanco')
      );
    },
    peso: -2,
  },
  {
    nombre: 'Picos ausentes',
    patron: (obs) => {
      const zonaPicos = obs.find((o) => o.zona === 'picos');
      return !zonaPicos || zonaPicos.colores.length === 0;
    },
    peso: -2,
  },
  {
    nombre: 'Centro oscuro',
    patron: (obs) => {
      const zonaCentral = obs.find((o) => o.zona === 'central');
      return zonaCentral?.colores.includes('gris');
    },
    peso: -1,
  },
];

/**
 * Patrones que indican suelo químicalizado (exceso de agroquímicos).
 */
const PATRONES_SUELO_QUIMICALIZADO = [
  {
    nombre: 'Anillos blancos pronunciados',
    patron: (obs) => {
      // Blanco presente en al menos 3 zonas diferentes
      const zonasConBlanco = obs.filter((o) => o.colores.includes('blanco')).length;
      return zonasConBlanco >= 3;
    },
    peso: -2,
  },
  {
    nombre: 'Colores apagados generalizados',
    patron: (obs) => {
      const countGris = obs.reduce(
        (acc, o) => acc + o.colores.filter((c) => c === 'gris').length,
        0
      );
      return countGris >= 2;
    },
    peso: -3,
  },
];

/**
 * Calcula el puntaje de vitalidad del suelo a partir de observaciones.
 * Positivo = suelo vivo, Negativo = suelo degradado/químicalizado.
 *
 * @param {ObservacionZona[]} observaciones - Observaciones del cromatograma
 * @returns {number} -5 a +5
 */
function calcularPuntajeVitalidad(observaciones) {
  if (!Array.isArray(observaciones) || observaciones.length === 0) {
    return 0;
  }

  let puntaje = 0;

  // Sumar pesos de colores observados por zona
  for (const obs of observaciones) {
    for (const color of obs.colores) {
      const significado = SIGNIFICADO_COLOR[color];
      if (significado) {
        const pesoZona = significado[obs.zona] ? significado.peso : 0;
        puntaje += pesoZona;
      }
    }
  }

  // Aplicar patrones de suelo vivo
  for (const patron of PATRONES_SUELO_VIVO) {
    if (patron.patron(observaciones)) {
      puntaje += patron.peso;
    }
  }

  // Aplicar patrones de suelo degradado
  for (const patron of PATRONES_SUELO_DEGRADADO) {
    if (patron.patron(observaciones)) {
      puntaje += patron.peso; // pesos negativos
    }
  }

  // Aplicar patrones de suelo químicalizado
  for (const patron of PATRONES_SUELO_QUIMICALIZADO) {
    if (patron.patron(observaciones)) {
      puntaje += patron.peso; // pesos negativos
    }
  }

  // Limitar rango -5 a +5
  return Math.max(-5, Math.min(5, puntaje));
}

/**
 * Identifica patrones específicos encontrados en las observaciones.
 *
 * @param {ObservacionZona[]} observaciones - Observaciones del cromatograma
 * @returns {string[]} - Nombres de patrones encontrados
 */
function identificarPatrones(observaciones) {
  const patronesEncontrados = [];

  const todosPatrones = [
    ...PATRONES_SUELO_VIVO,
    ...PATRONES_SUELO_DEGRADADO,
    ...PATRONES_SUELO_QUIMICALIZADO,
  ];

  for (const patron of todosPatrones) {
    if (patron.patron(observaciones)) {
      patronesEncontrados.push(patron.nombre);
    }
  }

  return patronesEncontrados;
}

/**
 * Valida que las observaciones tengan datos mínimos para interpretar.
 *
 * @param {ObservacionZona[]} observaciones - Observaciones a validar
 * @returns {{valido: boolean, mensaje: string}}
 */
function validarObservaciones(observaciones) {
  if (!Array.isArray(observaciones)) {
    return { valido: false, mensaje: 'Las observaciones deben ser un arreglo' };
  }

  if (observaciones.length === 0) {
    return { valido: false, mensaje: 'No hay observaciones para interpretar' };
  }

  const zonasValidas = ['central', 'media', 'externa', 'picos'];
  const coloresValidos = Object.keys(SIGNIFICADO_COLOR);

  for (const obs of observaciones) {
    if (!obs.zona || !zonasValidas.includes(obs.zona)) {
      return {
        valido: false,
        mensaje: `Zona inválida: ${obs.zona}. Debe ser: ${zonasValidas.join(', ')}`,
      };
    }

    if (!Array.isArray(obs.colores)) {
      return {
        valido: false,
        mensaje: `Los colores deben ser un arreglo en la zona ${obs.zona}`,
      };
    }

    for (const color of obs.colores) {
      if (!coloresValidos.includes(color)) {
        return {
          valido: false,
          mensaje: `Color inválido: ${color}. Debe ser: ${coloresValidos.join(', ')}`,
        };
      }
    }
  }

  return { valido: true, mensaje: '' };
}

/**
 * Genera un mensaje en tono usted campesino según el estado del suelo.
 *
 * @param {EstadoSuelo} estado - Estado diagnosticado
 * @param {string[]} _patrones - Patrones encontrados (no usado actualmente)
 * @returns {string} - Mensaje en tono usted campesino
 */
function generarMensajeCampesino(estado, _patrones) {
  switch (estado) {
    case 'vivo':
      return `Veo que su suelo está vivo, señor. Hay humus estable, actividad enzimática y buena energía. Las bacterias están trabajando y los minerales están disponibles para las plantas. Siga con sus prácticas de regeneración y abonos orgánicos.`;

    case 'degradado':
      return `Señor, veo que su suelo está cansado. Falta materia orgánica, la actividad biológica es baja y los minerales no están disponibles. Le recomiendo aplicar abonos orgánicos, biopreparados y evitar labores que compacten la tierra. Con tiempo y cuidado, el suelo se recupera.`;

    case 'quimicalizado':
      return `Señor, veo indicios de que el suelo ha recibido agroquímicos fuertes. Hay acumulación de sales, la materia orgánica está degradada y la vida microbiana es baja. Le sugiero aplicar biopreparados para recuperar la vida del suelo, compost de calidad y reducir los químicos. La vida microbiana necesita ayuda para volver.`;

    case 'incertidumbre_alta':
    default:
      return `Señor, este cromatograma no es claro para mí. Puede ser que las condiciones del ensayo no fueron las ideales (luz, humedad, cantidad de muestra) o que el suelo está en un estado intermedio. Le recomiendo repetir el método y comparar con otros suelos de su finca que conoce bien.`;
  }
}

/**
 * Calcula el nivel de confianza del diagnóstico.
 *
 * @param {ObservacionZona[]} observaciones - Observaciones del cromatograma
 * @param {number} puntaje - Puntaje de vitalidad
 * @returns {number} - Confianza entre 0 y 1
 */
function calcularConfianza(observaciones, puntaje) {
  // Si hay pocas observaciones, baja confianza
  if (observaciones.length < 3) {
    return 0.4;
  }

  // Si el puntaje está cerca de 0, hay ambigüedad
  if (Math.abs(puntaje) <= 1) {
    return 0.5;
  }

  // Si el puntaje es extremo (+4 o -4), más confianza
  if (Math.abs(puntaje) >= 4) {
    return 0.8;
  }

  // Confianza media para puntajes moderados
  return 0.6;
}

/**
 * Función principal de interpretación de cromatografía de suelo.
 *
 * @param {ObservacionZona[]} observaciones - Observaciones del cromatograma
 * @returns {InterpretacionCromatografia} - Interpretación completa
 */
export function interpretarCromatografia(observaciones) {
  // Validar entradas
  const validacion = validarObservaciones(observaciones);
  if (!validacion.valido) {
    return {
      estado: 'incertidumbre_alta',
      mensaje: `No puedo interpretar este cromatograma: ${validacion.mensaje}`,
      razones: [validacion.mensaje],
      confianza: 0,
      advertencia: 'Revise que las zonas y colores estén correctamente registrados.',
    };
  }

  // Calcular puntaje de vitalidad
  const puntaje = calcularPuntajeVitalidad(observaciones);

  // Identificar patrones encontrados
  const patrones = identificarPatrones(observaciones);

  // Determinar estado según puntaje
  let estado;
  if (puntaje >= 3) {
    estado = 'vivo';
  } else if (puntaje <= -3) {
    // Evaluar patrones de químicalizado vs degradado
    const patronesQuimicosActivos = PATRONES_SUELO_QUIMICALIZADO.filter((p) =>
      p.patron(observaciones)
    );
    const patronesDegradadoActivos = PATRONES_SUELO_DEGRADADO.filter((p) =>
      p.patron(observaciones)
    );

    // Si tiene "Anillos blancos pronunciados" (patrón muy específico de químicalizado), es químicalizado
    const tieneAnillosBlancos = patronesQuimicosActivos.some(
      (p) => p.nombre === 'Anillos blancos pronunciados'
    );

    if (tieneAnillosBlancos) {
      estado = 'quimicalizado';
    }
    // Si tiene 2 o más patrones químicos, es químicalizado
    else if (patronesQuimicosActivos.length >= 2) {
      estado = 'quimicalizado';
    }
    // Si tiene 1 patrón químico y menos degradado que químico, es químicalizado
    else if (
      patronesQuimicosActivos.length === 1 &&
      patronesQuimicosActivos.length > patronesDegradadoActivos.length
    ) {
      estado = 'quimicalizado';
    }
    // Si no, es degradado (priorizar por defecto)
    else {
      estado = 'degradado';
    }
  } else {
    estado = 'incertidumbre_alta';
  }

  // Generar mensaje
  const mensaje = generarMensajeCampesino(/** @type {EstadoSuelo} */ (estado), patrones);

  // Calcular confianza
  const confianza = calcularConfianza(observaciones, puntaje);

  // Generar razones
  const razones = patrones.length > 0 ? patrones : ['Pocos patrones claros identificados'];

  // Generar advertencia si hay baja confianza
  const advertencia =
    confianza < 0.6
      ? 'Esta interpretación tiene baja confianza. La cromatografía es cualitativa y depende de las condiciones del ensayo. Compare con otros suelos de su finca para mejor juicio.'
      : '';

  return /** @type {any} */ ({
    estado,
    mensaje,
    razones,
    confianza,
    advertencia,
  });
}

/**
 * Normaliza nombres de colores desde input humano a identificadores internos.
 * Útil para procesar input de usuario en español.
 *
 * @param {string} colorNombre - Nombre del color en español
 * @returns {ColorCromatograma | null} - Identificador normalizado o null
 */
export function normalizarColor(colorNombre) {
  if (!colorNombre || typeof colorNombre !== 'string') {
    return null;
  }

  const normalizado = colorNombre.toLowerCase().trim();

  const mapa = {
    'marrón oscuro': 'marron_oscuro',
    marron: 'marron_oscuro',
    café: 'marron_oscuro',
    'café oscuro': 'marron_oscuro',
    blanco: 'blanco',
    crema: 'blanco',
    gris: 'gris',
    plomizo: 'gris',
    violeta: 'violeta',
    lila: 'violeta',
    rosado: 'rosado',
    rosa: 'rosado',
    amarillo: 'amarillo',
    dorado: 'amarillo',
  };

  return mapa[normalizado] || null;
}

/**
 * Normaliza nombres de zonas desde input humano.
 *
 * @param {string} zonaNombre - Nombre de la zona en español
 * @returns {ZonaCromatograma | null} - Identificador normalizado o null
 */
export function normalizarZona(zonaNombre) {
  if (!zonaNombre || typeof zonaNombre !== 'string') {
    return null;
  }

  const normalizado = zonaNombre.toLowerCase().trim();

  const mapa = {
    central: 'central',
    'zona central': 'central',
    centro: 'central',
    media: 'media',
    'zona media': 'media',
    proteica: 'media',
    humica: 'media',
    externa: 'externa',
    'zona externa': 'externa',
    enzimatica: 'externa',
    picos: 'picos',
    'picos bordes': 'picos',
    radiaciones: 'picos',
    borde: 'picos',
  };

  return mapa[normalizado] || null;
}

/**
 * Crea una estructura de observación desde datos crudos de usuario.
 * Útil para procesar formularios.
 *
 * @param {Object} rawData - Datos crudos con 'zona' y 'colores' (arreglo de strings)
 * @returns {ObservacionZona | null} - Observación normalizada o null
 */
export function crearObservacionDesdeRaw(rawData) {
  if (!rawData || typeof rawData !== 'object') {
    return null;
  }

  const zonaNormalizada = normalizarZona(rawData.zona);
  if (!zonaNormalizada) {
    return null;
  }

  const coloresNormalizados = [];
  if (Array.isArray(rawData.colores)) {
    for (const color of rawData.colores) {
      const colorNorm = normalizarColor(color);
      if (colorNorm && !coloresNormalizados.includes(colorNorm)) {
        coloresNormalizados.push(colorNorm);
      }
    }
  }

  return /** @type {any} */ ({
    zona: zonaNormalizada,
    colores: coloresNormalizados,
    descripcion: rawData.descripcion || '',
  });
}

/**
 * Valida si una interpretación indica suelo vivo.
 *
 * @param {Partial<InterpretacionCromatografia> | null | undefined} interpretacion - Interpretación a verificar
 * @returns {boolean} - true si el suelo está vivo
 */
export function esSueloVivo(interpretacion) {
  return interpretacion?.estado === 'vivo' && interpretacion?.confianza >= 0.5;
}

/**
 * Valida si una interpretación indica suelo degradado.
 *
 * @param {Partial<InterpretacionCromatografia> | null | undefined} interpretacion - Interpretación a verificar
 * @returns {boolean} - true si el suelo está degradado
 */
export function esSueloDegradado(interpretacion) {
  return (
    interpretacion?.estado === 'degradado' && interpretacion?.confianza >= 0.5
  );
}

/**
 * Valida si una interpretación indica suelo químicalizado.
 *
 * @param {Partial<InterpretacionCromatografia> | null | undefined} interpretacion - Interpretación a verificar
 * @returns {boolean} - true si el suelo está químicalizado
 */
export function esSueloQuimicalizado(interpretacion) {
  return (
    interpretacion?.estado === 'quimicalizado' && interpretacion?.confianza >= 0.5
  );
}

/**
 * Obtiene recomendaciones según el estado del suelo.
 *
 * @param {EstadoSuelo} estado - Estado del suelo
 * @returns {string[]} - Recomendaciones específicas
 */
export function obtenerRecomendaciones(estado) {
  switch (estado) {
    case 'vivo':
      return [
        'Continuar con prácticas orgánicas y biopreparados',
        'Mantener cobertura vegetal permanente',
        'Rotar cultivos para diversificar raíces',
        'Evitar labranza profunda que perturbe la vida microbiana',
      ];

    case 'degradado':
      return [
        'Aplicar abonos orgánicos (compost, bocashi) para recuperar materia orgánica',
        'Usar biopreparados microbiológicos para activar la vida del suelo',
        'Implementar cultivos de cobertura y abonos verdes',
        'Reducir labranza y evitar compactación del suelo',
        'Evitar quemas y exposición solar directa del suelo descubierto',
      ];

    case 'quimicalizado':
      return [
        'Aplicar biopreparados para recuperar microbiota benéfica',
        'Incorporar compost de calidad para neutralizar residuos químicos',
        'Realizar enjuagues con agua y biopreparados',
        'Reducir gradualmente agroquímicos sintéticos',
        'Monitorear con cromatografías secuenciales para ver recuperación',
      ];

    case 'incertidumbre_alta':
    default:
      return [
        'Repetir el método de cromatografía con condiciones estandarizadas',
        'Comparar con suelos de referencia de la misma finca',
        'Registrar observaciones de campo (cultivos, rendimientos, malezas)',
        'Considerar análisis de laboratorio complementario',
      ];
  }
}
