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
// Cobertura inicial (prueba TIER 2 #4): caldo bordelés + bocashi + biol.
// Para los demás biopreparados sin entrada acá, el componente devuelve null y
// la UI cae con elegancia al `proceso_resumen` en texto (sin diagrama).

/**
 * Mapa palabra-clave → emoji concreto para los ingredientes. El emoji es
 * ILUSTRATIVO (no es una afirmación de dosis), elegido por concreción visual
 * para baja alfabetización. Se evalúa por `includes` sobre el nombre en
 * minúsculas; el primer match gana, de ahí el orden (más específico primero).
 * @type {Array<[string, string]>}
 */
const ICONOS_INGREDIENTE = [
  ['sulfato de cobre', '🔷'],
  ['cobre', '🔷'],
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
  ['tierra', '🟤'],
  ['capote', '🟤'],
  ['levadura', '🫧'],
  ['roca fosfórica', '🪨'],
  ['roca fosforica', '🪨'],
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
