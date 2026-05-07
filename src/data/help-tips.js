// Tips dinámicos rotantes para HelpManual
// Fuente: extracto de PlantCemeteryModal.jsx + ciclo contenido DR-034
// Categoría: errores (cementerio), observacion, riego, sustrato, plagas, paciencia
export const HELP_TIPS = [
  {
    id: 'cemetery-overwatering',
    category: 'riego',
    text: 'Antes de regar, meta el dedo 3 cm en el sustrato. Si está húmedo, espera. La mayoría de plantas que mueren por riego excesivo se salvan con esta regla.',
    source: 'cemetery_reason:overwatering'
  },
  {
    id: 'cemetery-underwatering',
    category: 'riego',
    text: 'Hojas secas en bordes y caída de flores son señales tempranas. Observe la planta antes de programar riego; ajuste frecuencia según piso térmico y tipo de sustrato.',
    source: 'cemetery_reason:underwatering'
  },
  {
    id: 'cemetery-pest-disease',
    category: 'plagas',
    text: 'Toda plaga tiene una ventana de 3-7 días donde es controlable con biopreparados (sulfocálcico, ajo-ají, microorganismos). La observación semanal es prevención.',
    source: 'cemetery_reason:pest_disease'
  },
  {
    id: 'cemetery-wrong-soil',
    category: 'sustrato',
    text: 'Cada especie tolera un rango de pH y textura. Compactación bloquea oxígeno radicular en 2 semanas. Test casero: si el agua tarda más de 30s en infiltrar, incorpore compost + rompa con horca.',
    source: 'cemetery_reason:wrong_soil'
  },
  {
    id: 'cemetery-temperature',
    category: 'observacion',
    text: 'Conozca el rango de temperatura de su especie y proteja con mulch + tela antihelada cuando el pronóstico lo exija. Helada nocturna mata hojas bajo 0°C.',
    source: 'cemetery_reason:temperature'
  },
  {
    id: 'cemetery-light',
    category: 'observacion',
    text: 'Plantas de sol pleno en sombra se estilan y mueren débiles. Sombra obligatoria en pleno sol queman las hojas. Respete la radiación óptima por especie desde la siembra.',
    source: 'cemetery_reason:light'
  },
  {
    id: 'cemetery-transplant',
    category: 'observacion',
    text: 'Trasplante al atardecer, con sustrato húmedo, sin romper el cepellón. Riegue abundante el primer día y sombree 3 días para evitar shock de trasplante.',
    source: 'cemetery_reason:transplant_shock'
  },
  {
    id: 'cemetery-unknown',
    category: 'paciencia',
    text: 'No saber la causa también es dato. Guarde foto del estado final y anote síntomas observados para referencia futura. La curva de aprendizaje agroecológica es de meses, no días.',
    source: 'cemetery_reason:unknown'
  },
  {
    id: 'lechuga-lesson',
    category: 'observacion',
    text: 'Es el cultivo escuela por excelencia. Ciclo corto (60-90 días) permite observar germinación, trasplante, desarrollo, plagas y cosecha en una temporada. Enseña gestión milimétrica de humedad edáfica y velocidad de ciclo.',
    source: 'species_lesson:lechuga'
  },
  {
    id: 'lechuga-watering',
    category: 'riego',
    text: 'Gestione humedad superficial fina durante germinación (nebulización) y evite impacto cinético de gotas grandes. Temperatura óptima 18-20°C.',
    source: 'species_lesson:lechuga'
  },
  {
    id: 'lechuga-transplant-tip',
    category: 'observacion',
    text: 'Trasplante al atardecer. Hidrate bandeja 2h antes. Hueco profundidad equivalente al cepellón sin enterrar el cuello. Riego inmediato + sombreado parcial 48h.',
    source: 'species_lesson:lechuga'
  },
  {
    id: 'lechuga-harvest',
    category: 'paciencia',
    text: 'Corte basal limpio con cuchillo temprano en la mañana. Empaque inmediato en contenedores rígidos para evitar magulladuras. Coseche cuando diámetro comercial se alcance antes del espigado.',
    source: 'species_lesson:lechuga'
  },
  {
    id: 'lechuga-companions',
    category: 'plagas',
    text: 'Plante cebolla, zanahoria o rábano cerca de su lechuga. Los compuestos azufrados de la cebolla disuaden herbívoros y el rábano se cosecha antes del acogollado.',
    source: 'species_lesson:lechuga'
  },
  {
    id: 'lechuga-biolog',
    category: 'plagas',
    text: 'Aplique biol al 5% cada 10 días desde día 10 post-trasplante para mejorar crecimiento y resistencia a plagas.',
    source: 'species_lesson:lechuga'
  },
  {
    id: 'lechuga-mulch',
    category: 'sustrato',
    text: 'Use mulch para estabilizar humedad del sustrato y prevenir enfermedades como tip burn y mildiu velloso.',
    source: 'species_lesson:lechuga'
  }
];

// TODO: ampliar a 30-50 con curaduría humana en queue/040 fase 2