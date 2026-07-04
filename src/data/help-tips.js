// Tips dinámicos rotantes para HelpManual (HelpTipCard).
// Fuente: extracto de PlantCemeteryModal.jsx + ciclo contenido DR-034.
// Categoría: errores (cementerio), observacion, riego, sustrato, plagas, paciencia.
//
// Overhaul 2026-07 (ayuda visual): cada tip ganó `title` (frase corta y
// escaneable — para quien lee poco, el título ya es el consejo) y el texto se
// pasó a HABLA CAMPESINA: fuera "humedad edáfica", "impacto cinético",
// "manejo arquitectónico" — el dato agronómico es el mismo, dicho como se
// dice en la vereda. Los ids/categorías/sources NO cambian (compat).

/** Metadatos visuales por categoría (ícono grande + etiqueta del chip). */
export const TIP_CATEGORIES = Object.freeze({
  riego: { label: 'Riego', emoji: '💧' },
  plagas: { label: 'Plagas', emoji: '🐛' },
  sustrato: { label: 'Tierra', emoji: '🪱' },
  observacion: { label: 'Observar', emoji: '👀' },
  paciencia: { label: 'Paciencia', emoji: '🌱' },
});

export const HELP_TIPS = [
  {
    id: 'cemetery-overwatering',
    category: 'riego',
    title: 'El dedo antes que la regadera',
    text: 'Antes de regar, meta el dedo 3 cm en la tierra. Si sale húmedo, espere. La mayoría de matas que se mueren ahogadas se salvan con esta regla.',
    source: 'cemetery_reason:overwatering'
  },
  {
    id: 'cemetery-underwatering',
    category: 'riego',
    title: 'La mata avisa antes de secarse',
    text: 'Bordes de hoja secos y flores que se caen son el primer aviso de sed. Mire la planta antes de regar por costumbre: en tierra caliente pide más seguido que en tierra fría.',
    source: 'cemetery_reason:underwatering'
  },
  {
    id: 'cemetery-pest-disease',
    category: 'plagas',
    title: 'La plaga da unos días de ventaja',
    text: 'Toda plaga tiene una ventana de 3 a 7 días en la que todavía se controla con biopreparados (sulfocálcico, ajo-ají, microorganismos). Darle una vuelta al cultivo cada semana es la mejor prevención.',
    source: 'cemetery_reason:pest_disease'
  },
  {
    id: 'cemetery-wrong-soil',
    category: 'sustrato',
    title: 'Tierra apretada, raíz ahogada',
    text: 'La tierra pisada le quita el aire a la raíz en un par de semanas. Prueba casera: riegue un poco de agua; si tarda más de 30 segundos en entrar, meta compost y afloje con horca, sin voltear.',
    source: 'cemetery_reason:wrong_soil'
  },
  {
    id: 'cemetery-temperature',
    category: 'observacion',
    title: 'La helada no perdona',
    text: 'Sepa qué frío aguanta su especie. Cuando anuncien helada, proteja con mulch (cobertura de hojarasca o paja) y tela antihelada: una noche bajo cero quema las hojas.',
    source: 'cemetery_reason:temperature'
  },
  {
    id: 'cemetery-light',
    category: 'observacion',
    title: 'Cada mata pide su sol',
    text: 'Una planta de pleno sol puesta en sombra crece pálida, larguirucha y débil. Una de sombra puesta al rayo del sol se quema. Respete la luz que pide cada especie desde la siembra.',
    source: 'cemetery_reason:light'
  },
  {
    id: 'cemetery-transplant',
    category: 'observacion',
    title: 'Trasplante al caer la tarde',
    text: 'Trasplante al atardecer, con la tierra húmeda y sin desbaratar el pan de tierra de la raíz. Riegue bien el primer día y dele sombra 3 días para que no sufra el cambio.',
    source: 'cemetery_reason:transplant_shock'
  },
  {
    id: 'cemetery-unknown',
    category: 'paciencia',
    title: 'No saber la causa también es dato',
    text: 'Si una mata se murió y no sabe por qué, guarde una foto de cómo quedó y anote lo que vio. Aprender a cultivar toma meses, no días — y cada pérdida anotada enseña.',
    source: 'cemetery_reason:unknown'
  },
  {
    id: 'lechuga-lesson',
    category: 'observacion',
    title: 'La lechuga es el cultivo escuela',
    text: 'En 60 a 90 días le muestra todo: germinar, trasplantar, crecer, plagas y cosecha. Enseña a manejar el agua con cuidado y a moverse al ritmo del cultivo. Ideal para empezar.',
    source: 'species_lesson:lechuga'
  },
  {
    id: 'lechuga-watering',
    category: 'riego',
    title: 'A la semilla, agua en rocío',
    text: 'Mientras germina, riegue la lechuga con llovizna finita (rocío), no con gotas gruesas que golpean y desentierran la semilla. Le va mejor con clima fresco, de 18 a 20 °C.',
    source: 'species_lesson:lechuga'
  },
  {
    id: 'lechuga-transplant-tip',
    category: 'observacion',
    title: 'Lechuga: trasplante sin ahorcar el cuello',
    text: 'Trasplante al atardecer. Moje la bandeja 2 horas antes. El hueco, del tamaño del pan de raíces, sin enterrar el cuello de la mata. Riegue de una y dele media sombra 2 días.',
    source: 'species_lesson:lechuga'
  },
  {
    id: 'lechuga-harvest',
    category: 'paciencia',
    title: 'Coseche temprano, con cuchillo limpio',
    text: 'Corte la lechuga de raíz con cuchillo limpio, temprano en la mañana. Pásela de una a una caja dura para que no se magulle. Coseche cuando llegue al tamaño de venta, antes de que se espigue (eche tallo de flor).',
    source: 'species_lesson:lechuga'
  },
  {
    id: 'lechuga-companions',
    category: 'plagas',
    title: 'Cebolla y rábano, guardianes de la lechuga',
    text: 'Siembre cebolla, zanahoria o rábano al lado de la lechuga. El olor azufrado de la cebolla espanta a los que se la comen, y el rábano se cosecha antes de que la lechuga acogolle.',
    source: 'species_lesson:lechuga'
  },
  {
    id: 'lechuga-biolog',
    category: 'plagas',
    title: 'Biol cada 10 días',
    text: 'Aplique biol al 5 % (medio litro por cada 10 litros de agua) cada 10 días, desde el día 10 después del trasplante. La mata crece más pareja y aguanta mejor las plagas.',
    source: 'species_lesson:lechuga'
  },
  {
    id: 'lechuga-mulch',
    category: 'sustrato',
    title: 'Mulch: la cobija de la tierra',
    text: 'Cubra la tierra con hojarasca o paja (mulch): guarda la humedad pareja y previene el quemado de bordes de la hoja y el mildeo velloso.',
    source: 'species_lesson:lechuga'
  },
  {
    id: 'fresa-lesson',
    category: 'observacion',
    title: 'La fresa enseña a sacar hijos',
    text: 'La fresa saca estolones: bejucos con matas hijas idénticas a la madre. Es la escuela para aprender a multiplicar sin semilla — el paso antes de injertar café o aguacate.',
    source: 'species_lesson:fresa'
  },
  {
    id: 'fresa-mulch-obligatorio',
    category: 'sustrato',
    title: 'Fresa sin mulch se pudre',
    text: 'En fresa el mulch es OBLIGATORIO: separa el fruto del suelo y evita la pudrición del fruto (moho gris, Botrytis). Sirve plástico negro, cisco de café o paja.',
    source: 'species_lesson:fresa'
  },
  {
    id: 'fresa-propagacion',
    category: 'paciencia',
    title: 'Renueve la fresa cada 2 años',
    text: 'Cada 2 años renueve el cultivo con los estolones de sus propias matas. Así la fresera se mantiene vigorosa y productiva sin comprar planta.',
    source: 'species_lesson:fresa'
  },
  {
    id: 'fresa-riego-goteo',
    category: 'riego',
    title: 'A la fresa, agua al pie',
    text: 'Riegue la fresa por goteo o al pie de la mata, nunca en lluvia por encima: mojar flores y frutos le abre la puerta al moho gris (Botrytis).',
    source: 'species_lesson:fresa'
  },
  {
    id: 'fresa-higiene',
    category: 'observacion',
    title: 'Fresera limpia, fruta sana',
    text: 'Mantenga limpio el pie de las freseras: saque hojas secas y frutos dañados apenas los vea. Menos material podrido alrededor = menos enfermedad.',
    source: 'species_lesson:fresa'
  },
  {
    id: 'tomate-lesson',
    category: 'observacion',
    title: 'El tomate enseña a podar',
    text: 'El tomate chonto es la escuela de darle forma a la planta: amarrarla a un tutor, quitarle los chupones cada semana y despuntarla cuando llega a 1,80 m.',
    source: 'species_lesson:tomate_chonto'
  },
  {
    id: 'tomate-tutorado',
    category: 'observacion',
    title: 'Tutor al día 15',
    text: 'A los 15 días del trasplante, párele el tutor al tomate: estaca de 1,80 a 2 m con hilo en V o malla, para que suba derecho y el fruto no toque el suelo.',
    source: 'species_lesson:tomate_chonto'
  },
  {
    id: 'tomate-deschupone',
    category: 'plagas',
    title: 'Chupones fuera, cada semana',
    text: 'Quítele al tomate chonto los chupones (brotes que salen entre el tallo y la hoja) una vez por semana, para que la fuerza se vaya al fruto y no al monte.',
    source: 'species_lesson:tomate_chonto'
  },
  {
    id: 'tomate-copa-baja',
    category: 'observacion',
    title: 'Tomate de copa baja',
    text: 'No deje pasar el tomate chonto de 1,80 m: despúntelo ahí. Así cosecha sin escalera, corre más aire entre las matas y hay menos hongos.',
    source: 'species_lesson:tomate_chonto'
  },
  {
    id: 'tomate-trichoderma-pre',
    category: 'plagas',
    title: 'Trichoderma antes de trasplantar',
    text: 'Antes del trasplante, moje bien las camas con Trichoderma (hongo bueno). Se le adelanta a los hongos que pudren la raíz del tomate (Fusarium y Rhizoctonia).',
    source: 'species_lesson:tomate_chonto'
  },
  {
    id: 'tomate-rotacion-leguminosa',
    category: 'sustrato',
    title: 'No repita tomate en el mismo lote',
    text: 'Después de tomate, siembre fríjol (u otra leguminosa) o maíz al menos 2 ciclos antes de volver a meter tomate ahí. Así los males del suelo no se enseñan al lote.',
    source: 'species_lesson:tomate_chonto'
  },
  {
    id: 'tomate-espaldera-colombiana',
    category: 'observacion',
    title: 'La espaldera colombiana rinde',
    text: 'Para el tomate: poste cada 4 metros, un alambre arriba y un hilo por mata colgando del alambre. Barata, rápida de armar y aguanta toda la cosecha.',
    source: 'species_lesson:tomate_chonto'
  },
  {
    id: 'tomate-polinizacion-abejorro',
    category: 'observacion',
    title: 'En clima frío, cuide al abejorro',
    text: 'En tierra fría el tomate bota la flor si la noche baja de 10 °C y nadie la poliniza. Cuide y atraiga al abejorro nativo (Bombus atratus) dejando flores silvestres cerca: es el mejor polinizador del tomate.',
    source: 'species_lesson:tomate_chonto'
  },
  {
    id: 'observacion-humedad-raices',
    category: 'observacion',
    title: 'Lea las hojas antes de regar',
    text: 'Hoja caída y floja: falta agua. Hoja amarilla pareja: puede ser exceso. Mire sus matas todos los días un momento — regar por costumbre mata más que la sequía.',
    source: 'general:observacion'
  },
  {
    id: 'sustrato-compost-maduro',
    category: 'sustrato',
    title: 'Compost maduro, nunca caliente',
    text: 'Use siempre compost maduro (oscuro, con olor a tierra de monte). El compost fresco todavía está "caliente": quema la raíz y le roba nitrógeno a la mata mientras termina de descomponerse.',
    source: 'general:sustrato'
  },
  {
    id: 'plagas-prevencion-semanal',
    category: 'plagas',
    title: '10 minutos que valen la cosecha',
    text: 'Una vez por semana, voltee hojas y mire el envés y los tallos buscando bichos o manchas. Agarrar la plaga chiquita es la diferencia entre un biopreparado y perder el cultivo.',
    source: 'general:plagas'
  },
  {
    id: 'paciencia-cosecha-escalonada',
    category: 'paciencia',
    title: 'Siembre por tandas',
    text: 'Cada 2 o 3 semanas siembre una tanda nueva en vez de todo de una. Así cosecha seguido todo el tiempo, en lugar de un montón que no alcanza a comerse ni a vender.',
    source: 'general:paciencia'
  },
  {
    id: 'error-aprender-del-fracaso',
    category: 'observacion',
    title: 'Cada mata perdida es un maestro',
    text: 'Cuando una planta no prospere, anote qué hizo distinto esa vez y cámbielo en el siguiente intento. Equivocarse hace parte del oficio — lo grave es no anotarlo.',
    source: 'general:mentalidad'
  }
];

// Nota: ampliación pendiente según roadmap queue/040 fase 2.
// Actualmente hay 33 tips cubriendo errores comunes, observación, riego,
// tierra, plagas y paciencia. Próximo objetivo: 30-50 tips con curaduría
// humana basada en Cementerio de Plantas + lecciones de especies clave.
