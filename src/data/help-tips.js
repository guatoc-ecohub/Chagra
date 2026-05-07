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
  },
  {
    id: 'fresa-lesson',
    category: 'observacion',
    text: 'Cultivo puente entre agricultura sexual (lechuga) y asexual (café/aguacate por injerto). Enseña propagación vegetativa por estolón — clonación natural visible y manejable.',
    source: 'species_lesson:fresa'
  },
  {
    id: 'fresa-mulch-obligatorio',
    category: 'sustrato',
    text: 'El mulch es OBLIGATORIO para fresas — aisla el fruto del suelo y previene Botrytis. Use plástico negro o vegetal como cisco de café o paja.',
    source: 'species_lesson:fresa'
  },
  {
    id: 'fresa-propagacion',
    category: 'paciencia',
    text: 'Renueve su cultivo de fresas cada 2 años con estolones propios. Esto mantiene vigor y productividad en su parcela.',
    source: 'species_lesson:fresa'
  },
  {
    id: 'fresa-riego-goteo',
    category: 'riego',
    text: 'Riegue fresas por goteo, nunca por aspersión. La aspersión favorece el desarrollo de Botrytis cinerea en frutos y flores.',
    source: 'species_lesson:fresa'
  },
  {
    id: 'fresa-higiene',
    category: 'observacion',
    text: 'Mantenga rigurosa higiene del microclima edáfico alrededor de sus fresas. Elimina hojas secas y frutos dañados para prevenir enfermedades.',
    source: 'species_lesson:fresa'
  },
  {
    id: 'tomate-lesson',
    category: 'observacion',
    text: 'El tomate chonto es un cultivo aprendiz de poda — enseña manejo arquitectónico de la planta: tutorado, deschuponada semanal, descopado al alcanzar 1.8m.',
    source: 'species_lesson:tomate_chonto'
  },
  {
    id: 'tomate-tutorado',
    category: 'observacion',
    text: 'Inicie el tutorado de tomate chonto el día 15 post-trasplante. Use estaca de 1.8-2m con hilo en V o malla para apoyar el crecimiento vertical.',
    source: 'species_lesson:tomate_chonto'
  },
  {
    id: 'tomate-deschupone',
    category: 'plagas',
    text: 'Realice deschuponada semanal en tomate chonto: elimine los chupones que aparecen en las axilas de las hojas para dirigir energía al fruto principal.',
    source: 'species_lesson:tomate_chonto'
  },
  {
    id: 'tomate-copa-baja',
    category: 'observacion',
    text: 'Mantenga una copa baja en su tomate chonto (máx 1.8m de altura). Esto facilita la cosecha, mejora la circulación de aire y reduce enfermedades fúngicas.',
    source: 'species_lesson:tomate_chonto'
  },
  {
    id: 'tomate-trichoderma-pre',
    category: 'plagas',
    text: 'Antes del trasplante, inocule masivamente las camas con Trichoderma spp. Esto destruye hifas de Fusarium y Rhizoctonia que causan pudrición de raíces.',
    source: 'species_lesson:tomate_chonto'
  },
  {
    id: 'tomate-rotacion-leguminosa',
    category: 'sustrato',
    text: 'Practique rotación crítica con leguminosas o maíz mínimo 2 ciclos antes de retornar tomate al mismo lote. Esto reduce presión de patógenos del suelo.',
    source: 'species_lesson:tomate_chonto'
  },
  {
    id: 'tomate-espaldera-colombiana',
    category: 'observacion',
    text: 'Use la espaldera colombiana para su tomate: poste cada 4m + alambre superior + hilo individual por planta. Esta estructura es económica y efectiva.',
    source: 'species_lesson:tomate_chonto'
  },
  {
    id: 'tomate-polinizacion-abejorro',
    category: 'observacion',
    text: 'En climas fríos, introduzca abejorros nativos Bombus atratus para polinizar su tomate chonto. Esto evita aborto floral por temperaturas <10°C nocturnas.',
    source: 'species_lesson:tomate_chonto'
  },
  {
    id: 'observacion-humedad-raices',
    category: 'observacion',
    text: 'Aprenda a leer las señales de su planta: hojas flojas indican falta de agua; hojas amarillentas pueden indicar exceso. Observe diariamente, no solo riegue por hábito.',
    source: 'general:observacion'
  },
  {
    id: 'sustrato-compost-maduro',
    category: 'sustrato',
    text: 'Siempre use compost maduro en su sustrato. El compost fresco puede quemar las raíces y competir por nitrógeno durante su descomposición.',
    source: 'general:sustrato'
  },
  {
    id: 'plagas-prevencion-semanal',
    category: 'plagas',
    text: 'La prevención es su mejor aliada contra plagas. Dedique 10 minutos cada semana a inspeccionar el envés de las hojas y tallos en busca de insectos o hongos.',
    source: 'general:plagas'
  },
  {
    id: 'paciencia-cosecha-escalonada',
    category: 'paciencia',
    text: 'Siembre en escalonado: cada 2-3 semanas una nueva tanda de semillas. Así tendrá cosecha continua en lugar de un exceso que se pierde.',
    source: 'general:paciencia'
  },
  {
    id: 'error-aprender-del-fracaso',
    category: 'observacion',
    text: 'Cada planta que no prospera es un maestro. Anote qué hizo diferente esa vez y ajuste su próximo intento. El fracaso es parte del currículo agroecológico.',
    source: 'general:mentalidad'
  }
];

// TODO: ampliar a 30-50 con curaduría humana en queue/040 fase 2