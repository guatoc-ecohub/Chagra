/**
 * toxicologia-suelo.js — Cuestionario de RIESGO de contaminantes edáficos.
 *
 * Complemento de la cromatografía de Pfeiffer y del diagnóstico de suelo:
 *   - La cromatografía / diagnóstico casero te muestran la VIDA del suelo
 *     (microbiología, materia orgánica, estructura).
 *   - Esta evaluación te alerta de TÓXICOS (metales pesados, residuos de
 *     plaguicidas, salinidad, aluminio tóxico). Son COMPLEMENTARIAS.
 *
 * ANTI-ALUCINACIÓN (regla inviolable de contenido sensible):
 *   Los contaminantes edáficos (Pb, Cd, Hg, As, residuos de plaguicidas)
 *   NO se miden en campo sin laboratorio. Por eso esto es un CUESTIONARIO
 *   DE RIESGO que devuelve un nivel CUALITATIVO, nunca un valor numérico de
 *   concentración. No inventamos límites: cuando hace falta un número (ej.
 *   límite de Cd en suelo) remitimos a la norma vigente y al laboratorio.
 *
 * Las preguntas pesan según factores de riesgo reconocidos en la literatura
 * agronómica y de salud ambiental (cercanía a minería/vías/industria,
 * historial de agroquímicos, aguas servidas, síntomas en plantas). El puntaje
 * agregado define un nivel cualitativo; cada nivel trae recomendación de
 * laboratorio y medidas agroecológicas reales.
 */

/* ── Preguntas del cuestionario ──────────────────────────────────────────
 * Cada pregunta:
 *   id, texto (lenguaje de campo), icono (emoji), peso (aporte al riesgo si
 *   la respuesta es "sí"), contaminantes (a qué apunta), por_que (educa al
 *   usuario sobre el factor de riesgo real).
 */
export const PREGUNTAS_RIESGO_SUELO = [
  {
    id: 'agroquimicos_intensivos',
    texto: '¿En este lote se usaron agroquímicos fuertes por años (fungicidas, herbicidas, insecticidas)?',
    icono: '🧴',
    peso: 3,
    contaminantes: ['residuos_plaguicidas', 'metales_pesados'],
    por_que:
      'El uso repetido de plaguicidas deja residuos en el suelo. Algunos fungicidas '
      + 'históricos contenían cobre, arsénico o mercurio, que se acumulan y no se degradan.',
  },
  {
    id: 'cerca_mineria',
    texto: '¿El lote está cerca de minería (oro, carbón) o de quebradas que bajan de zonas mineras?',
    icono: '⛏️',
    peso: 3,
    contaminantes: ['mercurio', 'arsenico', 'cadmio', 'plomo'],
    por_que:
      'La minería de oro libera mercurio; la de carbón y otras pueden liberar arsénico, '
      + 'cadmio y plomo. El agua de escorrentía los puede arrastrar al suelo.',
  },
  {
    id: 'cerca_via_principal',
    texto: '¿El lote está pegado a una carretera o vía con mucho tráfico?',
    icono: '🛣️',
    peso: 2,
    contaminantes: ['plomo', 'metales_pesados'],
    por_que:
      'El borde de vías muy transitadas suele tener más plomo y otros metales por '
      + 'décadas de combustibles y desgaste de vehículos. El riesgo baja con la distancia.',
  },
  {
    id: 'cerca_industria_taller',
    texto: '¿Hay cerca una industria, taller, fundición, curtiembre o botadero?',
    icono: '🏭',
    peso: 2,
    contaminantes: ['metales_pesados', 'cromo', 'plomo'],
    por_que:
      'Talleres, fundiciones, curtiembres (cromo) y botaderos pueden contaminar el suelo '
      + 'y el agua del vecindario con metales pesados y químicos.',
  },
  {
    id: 'aguas_servidas',
    texto: '¿Riega o se inunda con agua de alcantarilla, aguas servidas o un río contaminado?',
    icono: '🚱',
    peso: 3,
    contaminantes: ['metales_pesados', 'patogenos', 'cadmio'],
    por_que:
      'El agua de alcantarilla y los ríos contaminados arrastran metales pesados y '
      + 'patógenos hacia el cultivo. Es una de las vías de contaminación más serias.',
  },
  {
    id: 'lodos_no_certificados',
    texto: '¿Aplicó lodos, basuras o residuos industriales como "abono" sin saber su origen?',
    icono: '🛢️',
    peso: 2,
    contaminantes: ['metales_pesados', 'cadmio'],
    por_que:
      'Los lodos de aguas residuales o residuos industriales sin certificar pueden traer '
      + 'cadmio y otros metales. Solo se deben usar abonos de origen conocido y seguro.',
  },
  {
    id: 'sales_costra_blanca',
    texto: '¿Aparecen costras o manchas blancas en la tierra, o el agua de riego es muy salobre?',
    icono: '🧂',
    peso: 1,
    contaminantes: ['salinidad'],
    por_que:
      'Las costras blancas indican acumulación de sales. La salinidad alta quema raíces '
      + 'y reduce la cosecha; es común con riego de mala calidad o sobre-fertilización.',
  },
  {
    id: 'suelo_acido_andino',
    texto: '¿Es tierra colorada o amarilla de ladera andina, ácida, donde poco prospera?',
    icono: '🟠',
    peso: 1,
    contaminantes: ['aluminio_toxico'],
    por_que:
      'En suelos ácidos andinos el aluminio se vuelve soluble y tóxico para las raíces. '
      + 'No es contaminación externa, pero sí un tóxico natural que limita el cultivo.',
  },
  {
    id: 'sintomas_plantas',
    texto: '¿Las plantas se ven enfermas sin explicación: hojas quemadas, enanas o raíces que no crecen?',
    icono: '🥀',
    peso: 2,
    contaminantes: ['metales_pesados', 'aluminio_toxico', 'salinidad'],
    por_que:
      'Cuando varias plantas se enferman sin plaga ni hongo claro, puede haber un tóxico '
      + 'en el suelo. Es una señal para sospechar, no un diagnóstico: solo el laboratorio confirma.',
  },
];

/* ── Niveles de riesgo cualitativos ───────────────────────────────────────
 * El umbral se calcula sobre el puntaje sumado de las respuestas "sí".
 * Suma máxima teórica = 19. Umbrales conservadores: ante la duda, sube el nivel.
 */
export const NIVELES_RIESGO = [
  {
    id: 'bajo',
    label: 'Riesgo bajo',
    min: 0,
    color: 'emerald',
    icono: '🟢',
    resumen:
      'No aparecen señales fuertes de contaminación. Aun así, ningún cuestionario '
      + 'reemplaza un análisis de laboratorio si va a producir alimento para vender.',
    recomendacion_lab:
      'No es urgente un análisis de metales pesados. Si más adelante quiere certificar '
      + 'o vender, un laboratorio le da tranquilidad.',
  },
  {
    id: 'medio',
    label: 'Riesgo medio',
    min: 3,
    color: 'amber',
    icono: '🟡',
    resumen:
      'Hay uno o más factores de riesgo. No quiere decir que su suelo esté contaminado, '
      + 'pero sí que vale la pena tomar precauciones y considerar un análisis.',
    recomendacion_lab:
      'Considere un análisis de laboratorio de metales pesados y/o residuos de plaguicidas, '
      + 'sobre todo si va a sembrar comestibles. Pregunte en la UMATA, el SENA o AGROSAVIA.',
  },
  {
    id: 'alto',
    label: 'Riesgo alto',
    min: 6,
    color: 'red',
    icono: '🔴',
    resumen:
      'Se juntan varios factores de riesgo serios. Hay una sospecha real de tóxicos en el '
      + 'suelo o el agua. No siembres comestibles de raíz aquí hasta descartarlo.',
    recomendacion_lab:
      'Haz un análisis de laboratorio de metales pesados (Pb, Cd, Hg, As) ANTES de sembrar '
      + 'comida. Compara los resultados con la norma vigente — los límites varían por país y '
      + 'cultivo; consúltalos con el laboratorio, la autoridad ambiental (CAR/IDEAM) o el ICA. '
      + 'No inventamos un límite aquí: el número correcto lo da la norma y el laboratorio.',
  },
];

/* ── Medidas agroecológicas (reales, no inventadas) ───────────────────────
 * Se muestran según el nivel de riesgo. Cada una con su "por qué" agronómico.
 * NO prometen "limpiar" el suelo de forma garantizada: la fitorremediación y la
 * inmovilización REDUCEN biodisponibilidad/exposición, no eliminan metales.
 */
export const MEDIDAS_AGROECOLOGICAS = [
  {
    id: 'no_comestibles_raiz',
    nivel_minimo: 'medio',
    titulo: 'No sembrar comestibles de raíz en suelo sospechoso',
    detalle:
      'Tubérculos y raíces (papa, yuca, zanahoria, remolacha) y las hojas concentran más '
      + 'metales pesados. Si sospechas, evita comerlos de este lote. Frutales y maderables '
      + 'son menos riesgosos, pero la decisión final la da el laboratorio.',
    icono: '🥕',
  },
  {
    id: 'materia_organica',
    nivel_minimo: 'medio',
    titulo: 'Subir la materia orgánica (compost, bocashi, abono verde)',
    detalle:
      'La materia orgánica bien madura ayuda a inmovilizar metales pesados: los "amarra" y '
      + 'los hace menos disponibles para la planta. No los elimina, pero reduce la exposición. '
      + 'Es la primera medida agroecológica sensata.',
    icono: '🍂',
  },
  {
    id: 'corregir_acidez',
    nivel_minimo: 'medio',
    titulo: 'Corregir la acidez con cal (solo con prueba de pH)',
    detalle:
      'En suelos ácidos, subir el pH con cal reduce la disponibilidad del aluminio tóxico y '
      + 'de varios metales pesados. OJO: encalar a ciegas daña la tierra. Haz primero la prueba '
      + 'de pH en el módulo "Mi suelo".',
    icono: '🪨',
  },
  {
    id: 'fitorremediacion',
    nivel_minimo: 'alto',
    titulo: 'Fitorremediación con especies acumuladoras',
    detalle:
      'Algunas plantas (como girasol o ciertos pastos) absorben metales del suelo. Se siembran '
      + 'NO para comer, se cosechan y se retiran del lote. Reduce gradualmente la carga, pero es '
      + 'lento y debe guiarlo un técnico. La biomasa contaminada NO se composta ni se da a animales.',
    icono: '🌻',
  },
  {
    id: 'agua_limpia',
    nivel_minimo: 'medio',
    titulo: 'Cambiar la fuente de agua de riego',
    detalle:
      'Si riegas con agua de alcantarilla o río contaminado, esa es la vía principal de entrada. '
      + 'Buscar agua limpia (lluvia, pozo analizado, acueducto) corta el ingreso continuo de tóxicos.',
    icono: '💧',
  },
  {
    id: 'barrera_viva',
    nivel_minimo: 'medio',
    titulo: 'Barreras vivas y distancia a la fuente',
    detalle:
      'Si el riesgo viene de una vía o industria, una barrera viva (setos, árboles) y dejar una '
      + 'franja sin cultivo comestible en el borde reduce la exposición de la parte productiva.',
    icono: '🌳',
  },
  {
    id: 'lavado_sales',
    nivel_minimo: 'medio',
    titulo: 'Para salinidad: lavado con buen drenaje + materia orgánica',
    detalle:
      'Si el problema es salinidad (costras blancas), un riego abundante con buen drenaje ayuda a '
      + 'lavar las sales, junto con materia orgánica. Evita seguir sobre-fertilizando.',
    icono: '🧂',
  },
];

/* ── Etiquetas legibles de contaminantes (para mostrar a qué apunta cada sí) */
export const CONTAMINANTE_LABEL = {
  metales_pesados: 'metales pesados',
  plomo: 'plomo (Pb)',
  cadmio: 'cadmio (Cd)',
  mercurio: 'mercurio (Hg)',
  arsenico: 'arsénico (As)',
  cromo: 'cromo (Cr)',
  residuos_plaguicidas: 'residuos de plaguicidas',
  salinidad: 'salinidad',
  aluminio_toxico: 'aluminio tóxico',
  patogenos: 'patógenos',
};

/**
 * Calcula el nivel de riesgo cualitativo a partir del set de ids de preguntas
 * respondidas "sí". Devuelve el nivel + los contaminantes implicados + el puntaje.
 * @param {Set<string>|string[]} respuestasSi — ids de preguntas marcadas "sí"
 */
export function evaluarRiesgoSuelo(respuestasSi) {
  const set = respuestasSi instanceof Set ? respuestasSi : new Set(respuestasSi || []);
  const seleccionadas = PREGUNTAS_RIESGO_SUELO.filter((p) => set.has(p.id));
  const puntaje = seleccionadas.reduce((acc, p) => acc + p.peso, 0);

  // Elige el nivel más alto cuyo umbral 'min' no supere el puntaje.
  const nivel = [...NIVELES_RIESGO]
    .sort((a, b) => b.min - a.min)
    .find((n) => puntaje >= n.min) || NIVELES_RIESGO[0];

  const contaminantes = Array.from(
    new Set(seleccionadas.flatMap((p) => p.contaminantes)),
  );

  const medidas = MEDIDAS_AGROECOLOGICAS.filter((m) => {
    if (m.nivel_minimo === 'medio') return nivel.id !== 'bajo';
    if (m.nivel_minimo === 'alto') return nivel.id === 'alto';
    return true;
  });

  return {
    puntaje,
    nivel,
    contaminantes,
    medidas,
    factores: seleccionadas,
  };
}

/* ── Fuentes citables (anti-alucinación: instituciones reales) ──────────── */
export const FUENTES_TOX_SUELO = {
  fuente:
    'Cuestionario de riesgo cualitativo. Factores de riesgo basados en literatura de '
    + 'salud ambiental y agronomía; NO sustituye análisis de laboratorio.',
  referencias: [
    'FAO — manejo de suelos contaminados',
    'OMS/WHO — metales pesados y salud',
    'ICA — bioinsumos y fertilizantes (Resolución ICA 698/2011)',
    'IDEAM / CAR — autoridad ambiental para normas locales',
    'AGROSAVIA / SENA — extensión agroecológica',
    'Restrepo Rivera, J. — agricultura orgánica andina',
  ],
  nota_limites:
    'Los límites numéricos de metales en suelo (ej. Cd, Pb) varían por norma y cultivo. '
    + 'No los fijamos aquí: consulte la norma vigente con el laboratorio o la autoridad ambiental.',
};
