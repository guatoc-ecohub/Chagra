export const PRIMARY_MODELS = [
  'gemma4:e4b',
  'ministral-3:latest',
  'ministral-3:14b',
  'granite3.3:8b',
  'gemma3:12b',
  'qwen3.5:9b',
  'gemma3:4b',
];

export const SMOKE_ONLY_MODELS = [
  'qwen3.5:4b',
  'mistral-nemo:12b',
  'phi4:14b',
  'qwen3:14b',
  'deepseek-r1:14b',
  'qwen3:30b',
];

export const BENCH_SCENARIOS = [
  {
    id: 'voice_draft_tomate',
    smoke: true,
    title: 'Voz a borrador de siembra',
    capabilities: ['voice_extraction', 'farm_process', 'species_identity'],
    format: 'json',
    prompt:
      'Actúa como la Araña de Chagra. Transcripción de voz: "sembré 20 tomates chonto en lote norte hoy". ' +
      'Devuelve SOLO JSON con este schema exacto: ' +
      '{"intent":"process.create_from_sowing","species_slug":"","variety":"","quantity":0,"unit":"","tracking_mode":"","location_ref":{"land_name":""},"missing_fields":[],"confirmation_summary":""}. ' +
      'No inventes sincronización.',
    jsonExpectations: [
      { path: 'intent', equals: 'process.create_from_sowing' },
      { path: 'species_slug', includes: 'solanum' },
      { path: 'variety', includes: 'chonto' },
      { path: 'quantity', equals: 20 },
      { path: 'unit', includes: 'plant' },
      { path: 'location_ref.land_name', includes: 'lote norte' },
      { path: 'missing_fields', equalsLength: 0 },
      { path: 'confirmation_summary', includes: '20' },
    ],
    forbiddenPhrases: ['sincronizado', 'guardado en la nube'],
  },
  {
    id: 'phenology_estimation_cafe',
    smoke: true,
    title: 'Fenología estimada vs observada',
    capabilities: ['phenology'],
    format: 'text',
    prompt:
      'Para un proceso de café castillo a 1900 msnm con siembra confirmada hace 7 meses, lluvia irregular y sin confirmación campesina de floración, ' +
      'explica la etapa actual distinguiendo claramente estimación y observación. Responde en 4 frases.',
    requiredPhrases: ['estimad', 'observ', 'confianza', 'no confirm'],
    forbiddenPhrases: ['confirmado sin observación', 'seguro que ya floreció'],
  },
  {
    id: 'farm_process_aggregate_restoration',
    title: 'Agregado FarmProcess de restauración',
    capabilities: ['farm_process', 'reforestation'],
    format: 'text',
    prompt:
      'Define un FarmProcess para restauración con 200 robles andinos en un lote de ladera. ' +
      'Incluye objetivo, responsables, evidencias, tareas y trazabilidad sin convertirlo en un asset FarmOS nuevo.',
    requiredPhrases: ['proceso', 'responsable', 'evidencia', 'trazabilidad', 'no es un asset'],
    forbiddenPhrases: ['bundle farmos obligatorio ahora'],
  },
  {
    id: 'species_identity_cafe_population',
    title: 'Identidad especie cultivo población individuo',
    capabilities: ['species_identity'],
    format: 'text',
    prompt:
      'Explica la diferencia entre especie, cultivo, población y planta individual en un caso de 3000 cafés castillo. ' +
      'Debe quedar claro cuándo existe población sin materializar 3000 assets desde el día 1.',
    requiredPhrases: ['especie', 'población', 'individual', '3000', 'no materializar'],
    forbiddenPhrases: ['cada especie es un individuo'],
  },
  {
    id: 'voice_correction_200_to_20',
    title: 'Corrección antes de confirmar',
    capabilities: ['voice_extraction', 'correction_confirmation'],
    format: 'json',
    prompt:
      'Tienes un borrador con cantidad 200 para papa pastusa. El usuario dice: "no fueron 200, fueron 20". ' +
      'Devuelve SOLO JSON con: {"draft_status":"","updated_fields":{"quantity":0},"message_to_user":""}. ' +
      'Debe corregir el borrador sin ejecutar todavía.',
    jsonExpectations: [
      { path: 'draft_status', includes: 'awaiting_confirmation' },
      { path: 'updated_fields.quantity', equals: 20 },
      { path: 'message_to_user', includes: '20' },
    ],
    forbiddenPhrases: ['ya quedó guardado', 'ya ejecuté'],
  },
  {
    id: 'confirmation_honest_pending_sync',
    title: 'Confirmación honesta con persistencia local',
    capabilities: ['correction_confirmation'],
    format: 'text',
    prompt:
      'La acción se escribió en IndexedDB local pero no se sincronizó. Redacta el mensaje final al campesino en una frase corta y honesta.',
    requiredPhrases: ['dispositivo', 'falta sincronizar'],
    forbiddenPhrases: ['sincronizado', 'guardado en el servidor'],
  },
  {
    id: 'phenology_correction_not_flowering',
    title: 'Corrección fenológica explícita',
    capabilities: ['phenology', 'correction_confirmation'],
    format: 'text',
    prompt:
      'El sistema estimó floración, pero la campesina corrige: "todavía está vegetativo". ' +
      'Explica qué evento debe quedar y cómo cambia el estado sin borrar el historial.',
    requiredPhrases: ['evento', 'corrección', 'historial', 'observad'],
    forbiddenPhrases: ['sobrescribir sin rastro'],
  },
  {
    id: 'enso_preventive_task_papa',
    title: 'ENSO y tarea preventiva',
    capabilities: ['enso', 'phenology'],
    format: 'text',
    prompt:
      'Hay alerta de El Niño para un proceso de papa en ventana de tuberización. Sugiere una tarea preventiva explicando el porqué sin afirmar certeza climática absoluta.',
    requiredPhrases: ['el niño', 'preventiva', 'explica', 'si se confirma'],
    forbiddenPhrases: ['garantizado', 'seguro que ocurrirá'],
  },
  {
    id: 'reforestation_process_quercus',
    title: 'Proceso de reforestación',
    capabilities: ['reforestation', 'farm_process'],
    format: 'text',
    prompt:
      'Resume un ciclo de reforestación para quercus humboldtii con establecimiento, monitoreo de supervivencia y reposición de bajas. ' +
      'Debe sonar a proceso durable, no a simple registro suelto.',
    requiredPhrases: ['supervivencia', 'reposición', 'monitoreo', 'proceso'],
    forbiddenPhrases: ['solo una nota aislada'],
  },
  {
    id: 'silvopasture_process_leucaena',
    title: 'Proceso silvopastoril',
    capabilities: ['silvopasture'],
    format: 'text',
    prompt:
      'Diseña un proceso silvopastoril con leucaena, pasto y ganado. Debe incluir manejo por etapas, evidencia y tareas sin dependencia existencial de una zona única.',
    requiredPhrases: ['leucaena', 'ganado', 'tareas', 'evidencia', 'zona'],
    forbiddenPhrases: ['si se elimina la zona se eliminan los animales'],
  },
];

export function getScenarioById(id) {
  return BENCH_SCENARIOS.find((scenario) => scenario.id === id) || null;
}

export function getSmokeScenarios() {
  return BENCH_SCENARIOS.filter((scenario) => scenario.smoke);
}

export function getFullScenarios() {
  return [...BENCH_SCENARIOS];
}

export function getDefaultModels(mode = 'full') {
  if (mode === 'smoke') {
    return [...new Set([...PRIMARY_MODELS, ...SMOKE_ONLY_MODELS])];
  }
  return [...PRIMARY_MODELS];
}
