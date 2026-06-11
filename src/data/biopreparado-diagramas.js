// biopreparado-diagramas.js — Capa de PRESENTACIÓN para los diagramas
// visuales paso a paso de biopreparados (TIER 2 #4).
//
// REGLA DURA — CERO FABRICACIÓN DE RECETAS:
// Toda cantidad, proporción, tiempo y dilución de este archivo proviene
// TEXTUALMENTE de catalog/biopreparados-seed.json (campos `proceso_resumen`,
// `dosis_aplicacion`, `ingredientes`, `tiempo_elaboracion_dias`). Acá NO se
// inventan dosis: solo se RE-EXPRESA en pasos discretos + íconos el mismo
// contenido validado por Restrepo Rivera / Agrosavia / ICA que ya vive en el
// catálogo, para que un campesino de baja alfabetización pueda prepararlo
// mirando el dibujo. La fuente real se cita desde el objeto del catálogo
// (`biopreparado.fuente`), no desde acá.
//
// Cobertura: 15 biopreparados con receta COMPLETA en el catálogo
// (proceso_resumen + ingredientes + dosis + tiempo). Caen al texto los que NO
// traen receta campesina completa en el seed; hoy solo `biofertilizante_algas`
// (extracto hidrolizado industrial, sin cantidades de preparación en el seed →
// reproducirlo exigiría inventar, y eso está prohibido).
// Para los biopreparados sin entrada acá, el componente devuelve null y la UI
// cae con elegancia al `proceso_resumen` en texto (sin diagrama).

/**
 * Mapa palabra-clave → emoji concreto para los ingredientes. El emoji es
 * ILUSTRATIVO (no es una afirmación de dosis), elegido por concreción visual
 * para baja alfabetización. Se evalúa por `includes` sobre el nombre en
 * minúsculas; el primer match gana, de ahí el orden (más específico primero).
 * @type {Array<[string, string]>}
 */
const ICONOS_INGREDIENTE = [
  // Microbiano (cepa propagada) — más específico primero.
  ['cepa', '🦠'],
  ['sulfato de cobre', '🔷'],
  ['cobre', '🔷'],
  // 'sulfato' genérico (sulfatos minerales del supermagro) DESPUÉS de los de cobre.
  ['sulfato', '🧪'],
  ['azufre', '🟡'],
  ['cal', '⚪'],
  ['gallinaza', '🐔'],
  ['estiércol', '🐄'],
  ['estiercol', '🐄'],
  ['leche', '🥛'],
  ['suero', '🥛'],
  ['melaza', '🍯'],
  ['ceniza', '🌫️'],
  ['cascarilla de arroz', '🌾'],
  ['afrecho', '🌾'],
  ['carbón', '⚫'],
  ['carbon', '⚫'],
  ['humus', '🪱'],
  ['lombriz', '🪱'],
  ['compost', '🟤'],
  ['tierra', '🟤'],
  ['capote', '🟤'],
  ['fruta', '🍎'],
  ['ortiga', '🌿'],
  ['levadura', '🫧'],
  ['roca fosfórica', '🪨'],
  ['roca fosforica', '🪨'],
  ['apatita', '🪨'],
  ['camg', '⚪'],
  ['agua', '💧'],
];

/**
 * Devuelve el emoji ilustrativo de un ingrediente por nombre.
 * @param {string} nombre
 * @returns {string}
 */
export function iconoIngrediente(nombre) {
  const n = String(nombre || '').toLowerCase();
  for (const [clave, emoji] of ICONOS_INGREDIENTE) {
    if (n.includes(clave)) return emoji;
  }
  return '🌿';
}

/**
 * Overlay visual por `biopreparado.id`. Cada paso:
 *   - n:        número de orden (1-based)
 *   - icon:     emoji concreto del paso (ilustrativo)
 *   - titulo:   acción corta en imperativo (español de Colombia)
 *   - detalle:  cantidades/condiciones — TEXTUALES del catálogo
 *   - cantidad: (opcional) etiqueta de cantidad destacada
 *   - alerta:   (opcional) marca el paso como crítico (banda ámbar)
 *
 * @type {Record<string, { rinde?: string, pasos: Array<{
 *   n:number, icon:string, titulo:string, detalle:string,
 *   cantidad?:string, alerta?:boolean }> }>}
 */
export const DIAGRAMAS_BIOPREPARADO = {
  // Fuente: catalog/biopreparados-seed.json → caldo_bordeles.dosis_aplicacion
  // (1% para 10 L: 100 g sulfato + 100 g cal; cobre SOBRE la cal; prueba del
  // clavo; foliar haz y envés, sin diluir, el mismo día).
  caldo_bordeles: {
    rinde: 'Rinde 10 litros',
    pasos: [
      {
        n: 1,
        icon: '🔷',
        titulo: 'Disuelva el cobre',
        detalle: '100 g de sulfato de cobre en agua tibia. Use un recipiente que NO sea de metal.',
        cantidad: '100 g',
      },
      {
        n: 2,
        icon: '⚪',
        titulo: 'Prepare la cal aparte',
        detalle: '100 g de cal en otra parte del agua, en un balde distinto.',
        cantidad: '100 g',
      },
      {
        n: 3,
        icon: '🔄',
        titulo: 'Junte cobre sobre cal',
        detalle: 'Vierta el cobre SOBRE la cal (nunca al revés). Complete hasta los 10 litros.',
        alerta: true,
      },
      {
        n: 4,
        icon: '🔩',
        titulo: 'Prueba del clavo',
        detalle: 'Meta un clavo de hierro: NO debe ponerse cobrizo. Esa es la señal de que ya está neutro.',
      },
      {
        n: 5,
        icon: '🌿',
        titulo: 'Asperje el mismo día',
        detalle: 'Foliar, cubriendo el haz y el envés de la hoja. Se aplica sin diluir y el mismo día.',
      },
    ],
  },

  // Fuente: catalog/biopreparados-seed.json → bocashi.proceso_resumen +
  // dosis_aplicacion (fermentación aeróbica 15-21 días, volteo diario, <40-50 °C,
  // prueba de puño; aplicar maduro y frío).
  bocashi: {
    rinde: 'Abono sólido para el suelo',
    pasos: [
      {
        n: 1,
        icon: '🌾',
        titulo: 'Mezcle los secos',
        detalle: 'Gallinaza, cascarilla de arroz, tierra de capote, carbón triturado y afrecho. Revuelva todo.',
      },
      {
        n: 2,
        icon: '🍯',
        titulo: 'Riegue con melaza',
        detalle: 'Disuelva la melaza y la levadura en agua. Riegue sobre la mezcla mientras revuelve.',
      },
      {
        n: 3,
        icon: '✊',
        titulo: 'Prueba de puño',
        detalle: 'Apriete un puñado: el agua no debe gotear, pero la mano queda húmeda. Esa es la humedad justa.',
      },
      {
        n: 4,
        icon: '🔄',
        titulo: 'Voltee cada día',
        detalle: 'Voltee la pila todos los días. Mantenga la temperatura por debajo de 50 °C.',
      },
      {
        n: 5,
        icon: '✅',
        titulo: 'Listo a los 15-21 días',
        detalle: 'Cuando se enfría (menos de 40 °C) ya está maduro. Aplíquelo FRÍO: caliente quema la raíz.',
        alerta: true,
      },
    ],
  },

  // Fuente: catalog/biopreparados-seed.json → biol.proceso_resumen +
  // dosis_aplicacion (digestión anaeróbica 30-45 días en caneca con sello de
  // agua; filtrar; foliar 1-2 L de biol por 10 L de agua).
  biol: {
    rinde: 'Abono líquido foliar',
    pasos: [
      {
        n: 1,
        icon: '🐄',
        titulo: 'Cargue la caneca',
        detalle: 'Estiércol fresco con agua. Agregue leche o suero, melaza y ceniza.',
      },
      {
        n: 2,
        icon: '🛢️',
        titulo: 'Selle con válvula',
        detalle: 'Tape la caneca con sello de agua (válvula de gases). No debe entrar aire.',
        alerta: true,
      },
      {
        n: 3,
        icon: '⏳',
        titulo: 'Espere 30-45 días',
        detalle: 'Fermenta sin aire. No destape hasta que deje de borbotear.',
      },
      {
        n: 4,
        icon: '🫗',
        titulo: 'Cuele el líquido',
        detalle: 'Filtre. El líquido colado es el biol.',
      },
      {
        n: 5,
        icon: '🌿',
        titulo: 'Diluya y aplique',
        detalle: '1 a 2 litros de biol por cada 10 litros de agua. Foliar, al amanecer.',
      },
    ],
  },

  // Fuente: catalog/biopreparados-seed.json → purin_ortiga.dosis_aplicacion
  // (1 kg ortiga fresca / 10 L agua, fermentar 7-14 días removiendo a diario
  // hasta que deje de espumar; foliar diluido 1:10; macerado corto 24-72 h 1:5).
  purin_ortiga: {
    rinde: 'Abono y repelente foliar',
    pasos: [
      {
        n: 1,
        icon: '🌿',
        titulo: 'Recoja la ortiga',
        detalle: '1 kg de ortiga fresca por cada 10 litros de agua. Use guantes: la ortiga urtica.',
        cantidad: '1 kg',
        alerta: true,
      },
      {
        n: 2,
        icon: '🛢️',
        titulo: 'Macere tapado',
        detalle: 'Ponga la ortiga en el agua, en un recipiente tapado. Fermenta sin aire.',
      },
      {
        n: 3,
        icon: '🔄',
        titulo: 'Remueva 7-14 días',
        detalle: 'Remueva todos los días. Está listo cuando deja de espumar.',
        cantidad: '7-14 días',
      },
      {
        n: 4,
        icon: '💧',
        titulo: 'Diluya y asperje',
        detalle: 'Cuele. Diluya 1:10 (medio a 1 litro de purín por cada 10 litros de agua). Foliar.',
        cantidad: '1:10',
      },
      {
        n: 5,
        icon: '🐛',
        titulo: 'Contra plagas (macerado)',
        detalle: 'Macerado corto de 24-72 h sin fermentar, diluido 1:5, repele insectos chupadores.',
        cantidad: '24-72 h',
      },
    ],
  },

  // Fuente: catalog/biopreparados-seed.json → caldo_sulfocalcico.dosis_aplicacion
  // (2 partes azufre + 1 parte cal en 10 partes agua, hervir 45-60 min hasta
  // color vino tinto; foliar 1:100 preventivo / 1:20 curativo; CÁUSTICO).
  caldo_sulfocalcico: {
    rinde: 'Fungicida y acaricida foliar',
    pasos: [
      {
        n: 1,
        icon: '⚖️',
        titulo: 'Mida azufre y cal 2:1',
        detalle: '2 partes de azufre + 1 parte de cal viva (ejemplo: 2 kg azufre + 1 kg cal) en 10 litros de agua.',
        cantidad: '2:1',
      },
      {
        n: 2,
        icon: '🔥',
        titulo: 'Hierva 45-60 min',
        detalle: 'Cocine al aire libre revolviendo hasta que tome color vino tinto o caoba.',
        cantidad: '45-60 min',
        alerta: true,
      },
      {
        n: 3,
        icon: '🥽',
        titulo: 'Use protección',
        detalle: 'El azufre caliente irrita ojos, nariz y piel. Guantes, careta y gafas. Cocine SIEMPRE al aire libre.',
        alerta: true,
      },
      {
        n: 4,
        icon: '🏺',
        titulo: 'Guarde en barro o acero',
        detalle: 'Es corrosivo para los metales. Use recipiente de barro o acero inoxidable, nunca de hierro.',
        alerta: true,
      },
      {
        n: 5,
        icon: '💧',
        titulo: 'Diluya antes de aplicar',
        detalle: 'NUNCA aplique el caldo madre puro. Preventivo 1:100 (10 ml por litro); curativo 1:20 (50 ml por litro). Foliar al atardecer.',
        cantidad: '1:100',
        alerta: true,
      },
      {
        n: 6,
        icon: '⛔',
        titulo: 'No mezclar con bordelés',
        detalle: 'No mezcle ni alterne con caldo bordelés en menos de 20 días. No aplique en frutales durante la floración.',
        alerta: true,
      },
    ],
  },

  // Fuente: catalog/biopreparados-seed.json → te_compost.dosis_aplicacion
  // (1 kg compost / 10 L agua sin cloro + melaza; airear 24-36 h con bomba;
  // usar dentro de 4 h tras cortar la aireación; foliar 1:5, drench 1:10).
  te_compost: {
    rinde: 'Extracto microbiano foliar',
    pasos: [
      {
        n: 1,
        icon: '🟤',
        titulo: 'Sumerja el compost',
        detalle: '1 kg de compost maduro en un saco, dentro de 10 litros de agua SIN cloro. Agregue 2 cucharadas de melaza.',
        cantidad: '1 kg',
      },
      {
        n: 2,
        icon: '🫧',
        titulo: 'Airee 24-36 h',
        detalle: 'Conecte una bomba de pecera para darle aire al agua durante 24 a 36 horas.',
        cantidad: '24-36 h',
      },
      {
        n: 3,
        icon: '⏱️',
        titulo: 'Úselo en 4 horas',
        detalle: 'Cuele. Use el té dentro de las 4 horas después de apagar la bomba, o pierde los microbios vivos.',
        cantidad: '4 h',
        alerta: true,
      },
      {
        n: 4,
        icon: '💧',
        titulo: 'Diluya y aplique',
        detalle: 'Foliar 1:5 (un balde de té por cinco de agua). Riego al pie 1:10.',
        cantidad: '1:5',
      },
    ],
  },

  // Fuente: catalog/biopreparados-seed.json → humus_liquido.proceso_resumen +
  // dosis_aplicacion (1 kg humus / 5 L agua, percolar 24 h; foliar 1:10, drench 1:5).
  humus_liquido: {
    rinde: 'Abono líquido de lombriz',
    pasos: [
      {
        n: 1,
        icon: '🪱',
        titulo: 'Empape el humus',
        detalle: '1 kg de humus de lombriz en 5 litros de agua sin cloro.',
        cantidad: '1 kg',
      },
      {
        n: 2,
        icon: '⏳',
        titulo: 'Deje percolar 24 h',
        detalle: 'Deje escurrir durante 24 horas. El líquido que sale es el humus líquido.',
        cantidad: '24 h',
      },
      {
        n: 3,
        icon: '💧',
        titulo: 'Diluya y aplique',
        detalle: 'Foliar 1:10 (100 ml por litro de agua). Riego al pie 1:5.',
        cantidad: '1:10',
      },
    ],
  },

  // Fuente: catalog/biopreparados-seed.json → lixiviado_frutas.proceso_resumen
  // (cáscaras y pulpas de frutas maduras + melaza + agua; fermentación aeróbica
  // 20-30 días con revolver semanal; foliar 1:20 en fase reproductiva).
  lixiviado_frutas: {
    rinde: 'Abono líquido rico en potasio',
    pasos: [
      {
        n: 1,
        icon: '🍎',
        titulo: 'Junte las frutas',
        detalle: 'Cáscaras y pulpas de frutas maduras con melaza y agua en un recipiente.',
      },
      {
        n: 2,
        icon: '🔄',
        titulo: 'Revuelva cada semana',
        detalle: 'Fermenta con aire. Revuelva una vez por semana.',
      },
      {
        n: 3,
        icon: '⏳',
        titulo: 'Espere 20-30 días',
        detalle: 'A los 20 a 30 días está listo. Es rico en potasio y micronutrientes.',
        cantidad: '20-30 días',
      },
      {
        n: 4,
        icon: '💧',
        titulo: 'Diluya 1:20',
        detalle: 'Foliar 1:20, sobre todo en floración y formación de fruto (fase reproductiva).',
        cantidad: '1:20',
      },
    ],
  },

  // Fuente: catalog/biopreparados-seed.json → supermagro.proceso_resumen +
  // dosis_aplicacion (fermentación anaeróbica 90 días con sulfatos cada 7 días;
  // foliar del 2% al 7%; tope de seguridad 10% por el cobre/zinc).
  supermagro: {
    rinde: 'Biofertilizante de micronutrientes',
    pasos: [
      {
        n: 1,
        icon: '🐄',
        titulo: 'Cargue la caneca',
        detalle: 'Estiércol fresco de vaca, leche y melaza con agua en una caneca con sello de agua (sin aire).',
      },
      {
        n: 2,
        icon: '🧪',
        titulo: 'Sulfatos cada 7 días',
        detalle: 'Añada los sulfatos minerales (Mg, Zn, Mn, Cu, Fe, B, Co) poco a poco, una porción cada 7 días.',
        cantidad: 'cada 7 días',
      },
      {
        n: 3,
        icon: '⏳',
        titulo: 'Fermente 90 días',
        detalle: 'Tape sin aire. Fermenta alrededor de 90 días.',
        cantidad: '90 días',
      },
      {
        n: 4,
        icon: '💧',
        titulo: 'Diluya del 2% al 7%',
        detalle: 'Cuele. Foliar del 2% al 7% (200 a 700 cc por cada 10 litros de agua). Empiece bajo y suba.',
        cantidad: '2% al 7%',
      },
      {
        n: 5,
        icon: '⛔',
        titulo: 'Nunca pase del 10%',
        detalle: 'No aplique concentrado: más del 10% quema la hoja por exceso de cobre y zinc.',
        cantidad: '10%',
        alerta: true,
      },
    ],
  },

  // Fuente: catalog/biopreparados-seed.json → ceniza_madera.dosis_aplicacion
  // (VARIANTE caldo de ceniza: ~1 kg ceniza cernida + 100-200 g jabón potásico o
  // de coco en 5 L agua, hervir 20-30 min, diluir 1:4 a 1:5; o al suelo 100-200 g/planta).
  ceniza_madera: {
    rinde: 'Caldo de ceniza (potasio) y enmienda',
    pasos: [
      {
        n: 1,
        icon: '⚪',
        titulo: 'Cierna la ceniza',
        detalle: '1 kg de ceniza de madera cernida (madera dura, sin tratar).',
        cantidad: '1 kg',
      },
      {
        n: 2,
        icon: '🧼',
        titulo: 'Agregue jabón',
        detalle: '100-200 g de jabón potásico o de coco en 5 litros de agua. NO use detergente ni jabón de barra (sódico): quema la planta.',
        cantidad: '100-200 g',
        alerta: true,
      },
      {
        n: 3,
        icon: '🔥',
        titulo: 'Hierva 20-30 min',
        detalle: 'Cocine 20 a 30 minutos. Deje decantar y use solo el líquido claro.',
        cantidad: '20-30 min',
      },
      {
        n: 4,
        icon: '💧',
        titulo: 'Diluya 1:4 a 1:5',
        detalle: 'Diluya el líquido 1:4 a 1:5 (4-5 litros de caldo madre aforados a 20 litros). Foliar: repele y aporta potasio.',
        cantidad: '1:4 a 1:5',
      },
      {
        n: 5,
        icon: '🌱',
        titulo: 'O úsela al suelo',
        detalle: 'También al pie: 100-200 g por planta al año. NO en suelos con pH mayor a 6.5 ni en arándano o té.',
        cantidad: '100-200 g',
      },
    ],
  },

  // Fuente: catalog/biopreparados-seed.json → trichoderma_harzianum_suelo.proceso_resumen
  // (1 kg/ha mezclado con compost maduro, incorporado en los primeros 10 cm del suelo).
  trichoderma_harzianum_suelo: {
    rinde: 'Hongo benéfico para el suelo',
    pasos: [
      {
        n: 1,
        icon: '🦠',
        titulo: 'Mezcle con compost',
        detalle: 'Mezcle la cepa de Trichoderma (propagada en arroz o afrecho) con compost maduro.',
      },
      {
        n: 2,
        icon: '🌱',
        titulo: 'Aplique 1 kg/ha',
        detalle: 'Use 1 kg por hectárea, repartido sobre el suelo.',
        cantidad: '1 kg/ha',
      },
      {
        n: 3,
        icon: '🪏',
        titulo: 'Incorpore en 10 cm',
        detalle: 'Mezcle con los primeros 10 cm de suelo. Controla hongos del suelo (Rhizoctonia, Fusarium, Sclerotinia).',
        cantidad: '10 cm',
      },
    ],
  },

  // Fuente: catalog/biopreparados-seed.json → bacillus_subtilis_foliar.proceso_resumen
  // (foliar 1 L/ha cada 7-10 días; controla Botrytis, Alternaria, Monilia).
  bacillus_subtilis_foliar: {
    rinde: 'Bacteria benéfica foliar',
    pasos: [
      {
        n: 1,
        icon: '🦠',
        titulo: 'Prepare la suspensión',
        detalle: 'Cepa de Bacillus subtilis en suspensión. Compatible con caldos minerales.',
      },
      {
        n: 2,
        icon: '🌿',
        titulo: 'Asperje 1 L/ha',
        detalle: 'Foliar, 1 litro por hectárea, cubriendo bien la hoja.',
        cantidad: '1 L/ha',
      },
      {
        n: 3,
        icon: '🔁',
        titulo: 'Repita cada 7-10 días',
        detalle: 'Repita cada 7 a 10 días. Controla Botrytis, Alternaria y Monilia.',
        cantidad: '7-10 días',
      },
    ],
  },

  // Fuente: catalog/biopreparados-seed.json → cal_dolomita.proceso_resumen
  // (aplicación directa al suelo antes de siembra, 500-2000 kg/ha para subir pH ~0.5).
  cal_dolomita: {
    rinde: 'Enmienda que sube el pH',
    pasos: [
      {
        n: 1,
        icon: '🧪',
        titulo: 'Mire el pH del suelo',
        detalle: 'La dosis va según el análisis de suelo. Sirve para subir el pH (suelo menos ácido).',
      },
      {
        n: 2,
        icon: '⚪',
        titulo: 'Aplique antes de sembrar',
        detalle: 'Esparza la cal dolomítica directamente sobre el suelo antes de la siembra.',
      },
      {
        n: 3,
        icon: '⚖️',
        titulo: 'Use 500-2000 kg/ha',
        detalle: 'Entre 500 y 2000 kg por hectárea suben el pH cerca de 0.5 puntos. Incorpórela al suelo.',
        cantidad: '500-2000 kg/ha',
      },
    ],
  },

  // Fuente: catalog/biopreparados-seed.json → roca_fosforica.proceso_resumen
  // (aplicación pre-siembra 500-1000 kg/ha; libera fósforo lento; necesita suelo ácido pH<5.5).
  roca_fosforica: {
    rinde: 'Fósforo de liberación lenta',
    pasos: [
      {
        n: 1,
        icon: '🪨',
        titulo: 'Aplique antes de sembrar',
        detalle: 'Esparza la roca fosfórica molida sobre el suelo antes de la siembra.',
      },
      {
        n: 2,
        icon: '⚖️',
        titulo: 'Use 500-1000 kg/ha',
        detalle: 'Entre 500 y 1000 kg por hectárea. Libera el fósforo lentamente.',
        cantidad: '500-1000 kg/ha',
      },
      {
        n: 3,
        icon: '🍋',
        titulo: 'Funciona en suelo ácido',
        detalle: 'Solo se disuelve en suelos ácidos (pH menor a 5.5). Si su suelo no es ácido, compóstela antes con materia orgánica.',
      },
    ],
  },

  // Fuente: catalog/biopreparados-seed.json → compost_maduro.proceso_resumen
  // (pila aeróbica, volteos cada 7 días durante 90-120 días; maduro cuando se
  // enfría, color oscuro y olor a tierra fresca).
  compost_maduro: {
    rinde: 'Abono sólido para el suelo',
    pasos: [
      {
        n: 1,
        icon: '🌱',
        titulo: 'Arme la pila',
        detalle: 'Apile residuos vegetales, estiércol maduro, ceniza y tierra de bosque.',
      },
      {
        n: 2,
        icon: '🔄',
        titulo: 'Voltee cada 7 días',
        detalle: 'Voltee la pila cada 7 días para darle aire.',
        cantidad: 'cada 7 días',
      },
      {
        n: 3,
        icon: '⏳',
        titulo: 'Espere 90-120 días',
        detalle: 'Tarda entre 90 y 120 días en madurar.',
        cantidad: '90-120 días',
      },
      {
        n: 4,
        icon: '✅',
        titulo: 'Está maduro cuando...',
        detalle: 'Se enfría (queda a temperatura ambiente), toma color oscuro y huele a tierra fresca.',
      },
    ],
  },
};

/**
 * Devuelve el overlay de diagrama para un id de biopreparado, o null si no
 * hay diagrama curado (la UI cae al texto `proceso_resumen`).
 * @param {string} id
 * @returns {{ rinde?: string, pasos: Array<object> } | null}
 */
export function getDiagramaBiopreparado(id) {
  if (!id) return null;
  return DIAGRAMAS_BIOPREPARADO[id] || null;
}

/**
 * ¿Existe un diagrama paso a paso para este id?
 * @param {string} id
 * @returns {boolean}
 */
export function tieneDiagrama(id) {
  return Boolean(id && DIAGRAMAS_BIOPREPARADO[id]);
}
