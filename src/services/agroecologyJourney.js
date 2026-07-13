/**
 * agroecologyJourney — modelo de VIAJE de transición agroecológica.
 *
 * Chagra acompaña al usuario como un agroecólogo DESDE EL INICIO, guiándolo por
 * las etapas de la transición según su contexto. Modelo de 6 etapas construido
 * sobre los 5 niveles de Gliessman + los 10 elementos FAO + la metodología de
 * Planificación Predial Participativa (CIPAV) y Campesino a Campesino (CAC).
 *
 * Fuente: deepresearch/DR-TRANSICION-AGROECOLOGICA.md (18 fuentes verificadas:
 * Gliessman, FAO, MESMIS, CIPAV, Agrosavia IPPTA, Via Campesina, Restrepo Rivera).
 *
 * DECISIONES DE PRODUCTO PENDIENTES (esperan al operador; NO se asumen aquí):
 *   - ¿1 ruta con variaciones por contexto (este modelo) o 4 rutas separadas?
 *   - ¿Marco de indicadores oficial: TAPE/MESMIS o índice propio?
 * Por eso este módulo es DECISION-AGNÓSTICO: una secuencia de 6 etapas con
 * variaciones por contexto. Que la UI muestre 1 o 4 rutas es una capa posterior.
 *
 * Funciones PURAS: sin fetch, sin IDB. Cero fabricación: el contenido viene del DR.
 * Lenguaje llano de Colombia (sin voseo).
 */

/** Contextos de finca (las 4 variaciones del DR). */
export const JOURNEY_CONTEXTS = Object.freeze([
  'hortaliza', 'finca_diversificada', 'restauracion', 'paramo',
]);

/**
 * Mapea la vocación capturada en el onboarding (OnboardingPiloto) al contexto
 * de viaje. Default conservador: finca_diversificada (la ruta más general).
 * @param {string} [vocacion]
 * @returns {'hortaliza'|'finca_diversificada'|'restauracion'|'paramo'}
 */
export function contextoDesdeVocacion(vocacion) {
  switch (vocacion) {
    case 'horticola':
    case 'invernadero':
    case 'urbana':
      return 'hortaliza';
    case 'bosque':
      return 'restauracion';
    case 'paramo':
      return 'paramo';
    case 'frutales':
    case 'mixto':
    default:
      return 'finca_diversificada';
  }
}

/**
 * Las 6 etapas del viaje. `gliessman` referencia el nivel de Gliessman
 * (0 = línea de base; 1-3 = reducción/sustitución/rediseño; 4-5 = red/política).
 * Cada etapa: objetivo, duración, acciones del usuario, capacidades de Chagra,
 * indicadores, criterio de avance y variación por contexto. Contenido = DR.
 */
export const JOURNEY_STAGES = Object.freeze([
  {
    id: 'despertar',
    orden: 1,
    nombre: 'Despertar',
    emoji: '👁️',
    gliessman: 0,
    objetivo: 'Comprender el estado real de la finca y establecer la línea de base.',
    duracionMeses: [1, 3],
    accionesUsuario: Object.freeze([
      'Completar el perfil de la finca (ubicación, altitud, agua, tamaño)',
      'Hacer el mapa participativo: fotografiar los usos actuales del suelo',
      'Responder el diagnóstico: historia de agroquímicos, variedades, animales',
      'Tomar primeras fotos de suelo, cultivos y nacimientos de agua',
      'Identificar 3 problemas principales y 3 recursos que ya tiene',
    ]),
    capacidadesChagra: Object.freeze([
      'onboarding extendido (diagnóstico guiado)',
      'Perfil Inicial de Finca (resumen visual)',
      'Índice de Partida: nivel Gliessman de arranque',
      'casos similares (lógica CAC digital)',
    ]),
    indicadores: Object.freeze([
      'Perfil de finca completado ≥80%',
      'Mapa de usos del suelo elaborado',
      '3+ problemas identificados y priorizados',
      '1+ recurso natural identificado y valorado',
    ]),
    criterioAvance: Object.freeze([
      'Diagnóstico completo y validado',
      'Comprensión de qué degrada el suelo/agua',
      'Decisión consciente de iniciar la transición',
    ]),
    variaciones: Object.freeze({
      hortaliza: 'Diagnóstico de ciclos cortos: agroquímicos por ciclo, suelo del invernadero, agua de riego.',
      finca_diversificada: 'Mapeo por lotes: café con/sin sombra, variedades criollas vs mejoradas, historia de uso.',
      restauracion: 'Identificar áreas degradadas, nacimientos, cobertura existente, nativas presentes, conectividad.',
      paramo: 'Diagnóstico según Ley 1930/2018 y tipología del predio (4 tipos).',
    }),
  },
  {
    id: 'pausa_quimica',
    orden: 2,
    nombre: 'Pausa Química',
    emoji: '🛑',
    gliessman: 1,
    objetivo: 'Reducir progresivamente los agroquímicos sin colapsar la producción.',
    duracionMeses: [3, 12],
    accionesUsuario: Object.freeze([
      'Llevar registro semanal de qué aplica, cuándo y cuánto',
      'Hacer primer análisis de suelo (pH, materia orgánica)',
      'Reducir dosis de fertilizantes sintéticos 20-30% por ciclo',
      'Aplicar primeros biopreparados como complemento (no reemplazo aún)',
    ]),
    capacidadesChagra: Object.freeze([
      'Módulo de registro de insumos (qué, cuándo, cuánto, costo)',
      'Alertas de reducción gradual de dosis',
      'Catálogo de biopreparados (ya existente)',
    ]),
    indicadores: Object.freeze([
      'Uso de agroquímicos reducido ≥50% del inicial',
      '2+ biopreparados incorporados regularmente',
      'Primeras señales de recuperación del suelo (lombrices)',
    ]),
    criterioAvance: Object.freeze([
      'Agroquímicos reducidos ≥50%',
      '2+ biopreparados de uso regular',
      'Suelo con primeras señales de recuperación',
    ]),
    variaciones: Object.freeze({
      hortaliza: 'Ciclos cortos permiten reducción más rápida; usar rotación como prueba piloto.',
      finca_diversificada: 'Reducir fertilizantes del café primero; retirar fungicidas de sigatoka al final.',
      restauracion: 'Etapa muy corta: dejar de quemar y dejar de intervenir.',
      paramo: 'Prohibición de ciertos agroquímicos por Ley 1930; la app documenta cumplimiento.',
    }),
  },
  {
    id: 'tierra_viva',
    orden: 3,
    nombre: 'Tierra Viva',
    emoji: '🪱',
    gliessman: 2,
    objetivo: 'Construir la biología y estructura del suelo: base de todo el sistema.',
    duracionMeses: [6, 24],
    accionesUsuario: Object.freeze([
      'Preparar y aplicar biofertilizantes regularmente (biol, bocashi, compost)',
      'Incorporar coberturas vivas o mulch; dejar de quemar rastrojos',
      'Repetir prueba de suelo a los 6 meses para comparar',
      'Registrar lombrices por metro cuadrado (calidad del suelo)',
    ]),
    capacidadesChagra: Object.freeze([
      'Recetas de biopreparados con recursos de la finca',
      'Calendario de preparación y aplicación',
      'Módulo "Salud del Suelo": lombrices, color, compactación, olor',
      'Comparación temporal del suelo (fotos + indicadores)',
    ]),
    indicadores: Object.freeze([
      '≥5 lombrices por 30×30cm',
      'Materia orgánica ≥2% (o tendencia de mejora)',
      '3+ biopreparados en producción regular',
      'Cobertura del suelo ≥60%',
    ]),
    criterioAvance: Object.freeze([
      'Suelo con recuperación medible',
      'Sistema de biopreparados autónomo',
      'Sin colapso productivo en 2 ciclos',
    ]),
    variaciones: Object.freeze({
      hortaliza: 'Bocashi y compost críticos; trampas amarillas por el espacio confinado.',
      finca_diversificada: 'Restaurar sombra sobre el café para recuperar el microclima del suelo.',
      restauracion: 'Introducir pioneras (yarumo, balso, helecho) para activar la sucesión natural.',
      paramo: 'Recuperación lenta: evitar labranza, privilegiar restauración pasiva con cercado.',
    }),
  },
  {
    id: 'diversificacion',
    orden: 4,
    nombre: 'Diversificación',
    emoji: '🌻',
    gliessman: 3,
    objetivo: 'Rediseñar la finca de monocultivo a policultivo/agroforestal: un ecosistema.',
    duracionMeses: [12, 36],
    accionesUsuario: Object.freeze([
      'Diseñar un plan de finca por zonas (producción, conservación, cercas vivas)',
      'Sembrar especies complementarias (leguminosas, melíferas, maderables)',
      'Establecer franjas protectoras de nacimientos',
      'Empezar a guardar semillas propias (banco familiar)',
    ]),
    capacidadesChagra: Object.freeze([
      'Módulo de Diseño Predial (planificador por zonas)',
      'Catálogo de asociaciones de cultivos (compañías)',
      'Fenología: calendario local de siembras/cosechas',
      'Módulo de Semillas (inventario del banco familiar)',
    ]),
    indicadores: Object.freeze([
      '≥10 especies diferentes en la finca',
      '2+ estratos vegetales distintos',
      'Cobertura agroforestal ≥20% del área',
      '1+ leguminosa integrada al sistema',
    ]),
    criterioAvance: Object.freeze([
      'Sistema diversificado autónomo durante 1+ año',
      'Menor riesgo económico (no depende de 1 cultivo)',
      'Autoconsumo familiar garantizado',
    ]),
    variaciones: Object.freeze({
      hortaliza: 'Rotación por bancal, policultivos, flores para polinizadores, huerta exterior asociada.',
      finca_diversificada: 'Recuperar el cafetal diversificado: cacao, frutales, plátano, forestales bajo sombra.',
      restauracion: 'Sucesión secundaria (guamo, nogal, cedro), nucleación, cercas vivas.',
      paramo: 'Bajo impacto: papa nativa sin labranza, ganadería ovina de baja densidad rotacional.',
    }),
  },
  {
    id: 'equilibrio',
    orden: 5,
    nombre: 'Equilibrio',
    emoji: '⚖️',
    gliessman: 3,
    objetivo: 'Evaluar, ajustar y consolidar: la finca funciona como sistema autorregulado.',
    duracionMeses: [12, 24],
    accionesUsuario: Object.freeze([
      'Evaluación periódica con indicadores de sustentabilidad',
      'Registro de producción, costos e ingresos vs pre-transición',
      'Ajustar calendario de siembras según ENSO y clima local',
      'Registrar biodiversidad (aves, insectos benéficos) como indicador',
    ]),
    capacidadesChagra: Object.freeze([
      'Módulo de evaluación periódica (5 atributos MESMIS)',
      'Gráfica radar "Salud de la Finca" comparativa en el tiempo',
      'Alertas climáticas y ENSO integradas',
      'Módulo de costos/ingresos (viabilidad económica)',
    ]),
    indicadores: Object.freeze([
      'Los 5 atributos MESMIS mejoran o se mantienen vs base',
      'Costo de producción reducido',
      'Diversidad de especies en aumento',
      'Materia orgánica del suelo ≥3%',
    ]),
    criterioAvance: Object.freeze([
      '2+ años estables sin dependencia de agroquímicos',
      'Campesino resuelve problemas autónomamente',
      'Interés en compartir su experiencia',
    ]),
    variaciones: Object.freeze({
      hortaliza: 'Evaluación por ciclo (no anual); la rotación es el principal indicador de consolidación.',
      finca_diversificada: 'Evaluar calidad del café (mercados especiales) y nuevas fuentes de ingreso.',
      restauracion: 'Indicadores ecológicos: cobertura boscosa, aves frugívoras, regeneración sin intervención.',
      paramo: 'Cumplimiento Ley 1930 documentado; recuperación de frailejones medible.',
    }),
  },
  {
    id: 'irradiacion',
    orden: 6,
    nombre: 'Irradiación',
    emoji: '🌐',
    gliessman: 4,
    objetivo: 'Autonomía plena: el campesino es referente y se conecta a redes y mercados.',
    duracionMeses: [null, null], // permanente
    accionesUsuario: Object.freeze([
      'Actuar como promotor CAC: recibir visitas e intercambios',
      'Participar en mercados campesinos o circuitos cortos',
      'Guardar, multiplicar e intercambiar semillas criollas',
      'Participar en certificación participativa (SPG) y política local',
    ]),
    capacidadesChagra: Object.freeze([
      'Perfil de "Finca Referente" visible para otros usuarios',
      'Módulo de intercambio (excedentes, semillas, biopreparados)',
    ]),
    indicadores: Object.freeze([
      'Recibe visitas de intercambio de otros campesinos',
      'Participa en al menos 1 circuito corto de mercado',
      'Intercambia semillas criollas regularmente',
    ]),
    criterioAvance: Object.freeze([]), // etapa permanente, sin "siguiente"
    variaciones: Object.freeze({
      hortaliza: 'Referente de huerta urbana/periurbana; intercambio de semillas y plántulas.',
      finca_diversificada: 'Referente de cafetal diversificado; mercados de café especial.',
      restauracion: 'Predio escuela de restauración; conexión con corredores y cuencas.',
      paramo: 'Referente de reconversión en páramo; incidencia en consejos de cuenca.',
    }),
  },
]);

const STAGE_BY_ID = new Map(JOURNEY_STAGES.map((s) => [s.id, s]));

/** Devuelve la etapa por id, o null. */
export function getStage(stageId) {
  return STAGE_BY_ID.get(stageId) || null;
}

/** Id de la etapa siguiente, o null si es la última (Irradiación es permanente). */
export function nextStageId(stageId) {
  const s = STAGE_BY_ID.get(stageId);
  if (!s) return null;
  const next = JOURNEY_STAGES.find((x) => x.orden === s.orden + 1);
  return next ? next.id : null;
}

/**
 * Motor de "siguiente paso" (guía proactiva). Dado dónde está el usuario y qué
 * acciones ya hizo, devuelve el próximo paso recomendado para SU contexto y si
 * ya cumple el criterio para avanzar. PURO, decision-agnóstico.
 *
 * @param {object} estado
 * @param {string} estado.stageId           etapa actual del usuario
 * @param {string[]} [estado.accionesHechas] acciones ya completadas (por texto exacto)
 * @param {string} [contexto] uno de JOURNEY_CONTEXTS (default finca_diversificada)
 * @returns {{
 *   etapa: object|null,
 *   variacion: string|null,
 *   siguientesAcciones: string[],
 *   listoParaAvanzar: boolean,
 *   siguienteEtapaId: string|null,
 * }}
 */
export function siguientePaso(opts = /** @type {any} */ ({}), contexto = 'finca_diversificada') {
  const { stageId, accionesHechas = [] } = opts;
  const etapa = getStage(stageId);
  if (!etapa) {
    return { etapa: null, variacion: null, siguientesAcciones: [], listoParaAvanzar: false, siguienteEtapaId: null };
  }
  const ctx = JOURNEY_CONTEXTS.includes(contexto) ? contexto : 'finca_diversificada';
  const hechas = new Set(accionesHechas);
  const pendientes = etapa.accionesUsuario.filter((a) => !hechas.has(a));
  // "Listo para avanzar" = completó todas las acciones del usuario de la etapa.
  const listoParaAvanzar = pendientes.length === 0;
  return {
    etapa,
    variacion: etapa.variaciones[ctx] || null,
    siguientesAcciones: pendientes.slice(0, 3),
    listoParaAvanzar,
    siguienteEtapaId: listoParaAvanzar ? nextStageId(stageId) : null,
  };
}
