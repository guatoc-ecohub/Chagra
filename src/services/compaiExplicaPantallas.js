/*
 * i18n (ADR-050): compaiExplicaPantallas.js contiene copy user-facing en
 * español Colombia (explicaciones de pantalla) pendiente de migrar a
 * src/config/messages.js. Misma regla que CompaiOverlay.jsx.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
/**
 * compaiExplicaPantallas — FUENTE ÚNICA de qué dice el compAI al entrar a cada
 * pantalla (contrato "explica las funciones de cada pantalla").
 *
 * El compAI ELEGIDO recibe `pantalla` (currentView del shell) y, al entrar,
 * presenta UNA explicación corta: qué hay en esa pantalla y qué puede hacer
 * ahí. Nada se inventa: si una pantalla no está en el manifiesto, el compAI
 * no explica nada (mejor callado que describir una pantalla que no conoce).
 *
 * REGLA "UNO SOLO POR PANTALLA": el manifiesto es el único lugar que describe
 * funciones por pantalla. Una pantalla que registra sus propias paradas de
 * guía (`compaiParadasPorPantalla`) se explica sola — el hook global cede
 * (ver `useCompaiGuiaPantalla`). Nunca dos voces explicando la misma pantalla.
 *
 * TONO (regla de la casa): español de Colombia, USTED, campesino, corto y
 * accionable. Sin voseo argentino, sin em dashes.
 *
 * @module services/compaiExplicaPantallas
 */

/**
 * @typedef {Object} ExplicaPantalla
 * @property {string} titulo — encabezado corto de la explicación.
 * @property {string} texto — UNA frase para la burbuja y para la voz (la
 *   burbuja corta el texto que no cabe — mantenerlo en una sola idea).
 * @property {string[]} funciones — qué se puede hacer ahí (labels cortos).
 */

/**
 * Las pantallas 2D mapeadas. Las rutas son los `currentView` del shell
 * (mismos ids que HASH_VIEW_ROUTES / saludoPantalla).
 * @type {Record<string, ExplicaPantalla>}
 */
export const EXPLICA_PANTALLAS = Object.freeze({
  // ── Registro y seguimiento ──
  activos: {
    titulo: 'Su inventario',
    texto: 'Aquí está todo lo que tiene sembrado y sus animales, contado uno por uno.',
    funciones: ['Buscar una mata', 'Registrar una planta', 'Revisar su cosecha'],
  },
  bodega: {
    titulo: 'Su bodega',
    texto: 'Aquí caben los insumos, las herramientas y lo que ya cosechó.',
    funciones: ['Anotar insumos', 'Llevar cuentas', 'Revisar existencias'],
  },
  task_log: {
    titulo: 'Sus tareas',
    texto: 'Las labores pendientes y hechas de la finca, todas en un solo cuaderno.',
    funciones: ['Crear una tarea', 'Marcar como hecha', 'Ver el día de hoy'],
  },
  auditoria_inventario: {
    titulo: 'Auditoría del inventario',
    texto: 'Aquí se compara lo anotado con lo que hay, para que las cuentas no mientan.',
    funciones: ['Revisar discrepancias', 'Ajustar existencias'],
  },
  hoy_finca: {
    titulo: 'El día en su finca',
    texto: 'Lo que toca hoy: alertas, tareas de la etapa real de sus cultivos y accesos rápidos.',
    funciones: ['Ver alertas', 'Revisar labores', 'Registrar por voz'],
  },
  evolucion: {
    titulo: 'La evolución de su finca',
    texto: 'Aquí se ve cómo ha cambiado su finca con el tiempo: números que hablan.',
    funciones: ['Ver tendencias', 'Comparar meses'],
  },
  informes: {
    titulo: 'Sus informes',
    texto: 'Los números de la finca traducidos en algo que se entienda.',
    funciones: ['Leer un informe', 'Revisar lo sembrado'],
  },

  // ── Siembra y ciclo ──
  calendario_finca: {
    titulo: 'Calendario de la finca',
    texto: 'Lo que le toca hacer por estas fechas, para que nada se le pase.',
    funciones: ['Ver el mes', 'Agendar labores', 'Preguntar cuándo sembrar'],
  },
  almanaque: {
    titulo: 'Almanaque campesino',
    texto: 'Luna, siembra y cosecha por estas fechas, como el almanaque de la casa.',
    funciones: ['Ver la fase de luna', 'Mirar épocas de siembra'],
  },
  ano_finca: {
    titulo: 'El año de su finca',
    texto: 'Aquí se mira cómo va el año completo de la finca y qué viene.',
    funciones: ['Revisar el avance', 'Ver lo que viene'],
  },
  semilla: {
    titulo: 'Sus semillas',
    texto: 'Germinación, selección y cómo guardar bien su semilla para que no pierda fuerza.',
    funciones: ['Probar si sirve la semilla', 'Aprender a guardarla'],
  },
  germinacion: {
    titulo: 'Prueba de germinación',
    texto: 'La prueba casera que le dice si su semilla está viva antes de sembrarla.',
    funciones: ['Hacer la prueba', 'Leer el resultado'],
  },
  ciclo_vivo: {
    titulo: 'Ciclo de la mata',
    texto: 'Las etapas de su cultivo, de la semilla a la cosecha, con su momento exacto.',
    funciones: ['Ver la etapa actual', 'Preguntar por cuidados'],
  },
  ciclo_nutrientes: {
    titulo: 'Ciclo de nutrientes',
    texto: 'Cómo caminan los nutrientes por su finca y por qué importa para sus matas.',
    funciones: ['Entender el ciclo', 'Ver qué le falta al suelo'],
  },

  // ── Suelo, agua y abonos ──
  suelo: {
    titulo: 'Su suelo',
    texto: 'La tierra no se adivina: aquí se diagnostica con pruebas caseras honestas.',
    funciones: ['Hacer una prueba', 'Ver qué le falta'],
  },
  cromatografia: {
    titulo: 'Cromatografía',
    texto: 'La imagen que le cuenta cómo está de viva su tierra.',
    funciones: ['Subir una cromatografía', 'Leer su resultado'],
  },
  agua: {
    titulo: 'El agua de su finca',
    texto: 'Riego, reservorios y la lluvia que viene, para que el agua no le falte.',
    funciones: ['Ver el clima', 'Preguntar por riego'],
  },
  compost: {
    titulo: 'Su compost',
    texto: 'La compostera bien hecha le devuelve a la tierra lo que la cosecha le quitó.',
    funciones: ['Seguir la receta', 'Revisar su compostera'],
  },
  estiercol: {
    titulo: 'Del corral al abono',
    texto: 'El estiércol de sus animales convertido en abono, sin que se pierda nada.',
    funciones: ['Aprender a abonar', 'Revisar su pila'],
  },

  // ── Sanidad y clima ──
  toxicologia: {
    titulo: 'Toxicología',
    texto: 'Antes de echar algo a la mata, mire aquí si es seguro y cómo se usa.',
    funciones: ['Consultar un producto', 'Ver alternativas'],
  },
  biopreparados: {
    titulo: 'Biopreparados',
    texto: 'Recetas caseras para nutrir y cuidar sus matas, sin veneno.',
    funciones: ['Ver recetas', 'Preguntar por una plaga'],
  },
  fermentos: {
    titulo: 'Sus fermentos',
    texto: 'Dosis, tiempos y cómo saber si un fermento quedó bueno.',
    funciones: ['Seguir una receta', 'Revisar un fermento'],
  },

  // ── Animales ──
  animales: {
    titulo: 'Sus animales',
    texto: 'Gallinas, abejas, vacas y demás, con su registro al día.',
    funciones: ['Ver cada animal', 'Anotar una observación'],
  },
  animales_gallinas: {
    titulo: 'Sus gallinas',
    texto: 'Postura, alimento y salud de sus gallinas, para que no le falte el huevo.',
    funciones: ['Registrar postura', 'Revisar sanidad'],
  },
  animales_abejas: {
    titulo: 'Sus abejas',
    texto: 'De abejas sí le sé: aquí se lleva el registro de sus colmenas.',
    funciones: ['Revisar una colmena', 'Anotar revisión'],
  },
  animales_vacas: {
    titulo: 'Su ganado',
    texto: 'Pastos, ordeño y sanidad de su ganado, anotados en orden.',
    funciones: ['Registrar ordeño', 'Revisar sanidad'],
  },
  animales_conejos: {
    titulo: 'Sus conejos',
    texto: 'Manejo, cría y alimento de sus conejos, todo en un solo lugar.',
    funciones: ['Anotar una camada', 'Revisar manejo'],
  },
  animales_caprinos: {
    titulo: 'Sus cabras',
    texto: 'Manejo, leche y sanidad de sus cabras y ovejas.',
    funciones: ['Registrar leche', 'Revisar sanidad'],
  },

  // ── Mercado y venta ──
  mercado: {
    titulo: 'Mercado y venta',
    texto: 'Qué llevar, cómo presentarlo y a cómo venderlo, para que su cosecha pague.',
    funciones: ['Ver precios', 'Publicar una cosecha'],
  },

  // ── Aprender y acompañamiento ──
  casos: {
    titulo: 'Casos de campo',
    texto: 'Los casos reales de la región y cómo se resolvieron, para aprender de ellos.',
    funciones: ['Leer un caso', 'Buscar por cultivo'],
  },
  faq: {
    titulo: 'Preguntas frecuentes',
    texto: 'Las respuestas que más busca la gente de la región, reunidas aquí.',
    funciones: ['Buscar una respuesta', 'Preguntarme directo'],
  },
  ayuda: {
    titulo: 'Ayuda',
    texto: 'Todo lo que Chagra puede hacer por usted, explicado paso a paso.',
    funciones: ['Ver funciones', 'Abrir una función'],
  },
  perfil: {
    titulo: 'Su perfil',
    texto: 'Su ubicación, su finca y sus preferencias, para acompañarlo mejor.',
    funciones: ['Actualizar ubicación', 'Cambiar su compai'],
  },

  // ── Mundo natural ──
  biodiversidad: {
    titulo: 'Biodiversidad',
    texto: 'Los aliados que viven en su finca sin cobrarle, contados uno por uno.',
    funciones: ['Ver aliados', 'Buscar un bicho'],
  },
  mapa: {
    titulo: 'El mapa',
    texto: 'Su finca en el mapa, con sus lotes, aguas y siembras ubicados.',
    funciones: ['Ubicar un lote', 'Ver el piso térmico'],
  },
  restauracion: {
    titulo: 'Restauración',
    texto: 'Por dónde se empieza a recuperar un terreno, paso a paso.',
    funciones: ['Ver el plan', 'Preguntar por nativas'],
  },
  glaciar: {
    titulo: 'El páramo',
    texto: 'El páramo y el glaciar, de donde baja el agua de su finca.',
    funciones: ['Ver el estado del glaciar', 'Entender por qué importa'],
  },
});

/**
 * Explicación para una pantalla dada, o null si no está mapeada (el compAI
 * no describe pantallas que no conoce — mejor callado que inventado).
 * @param {string|null|undefined} pantalla — currentView del shell.
 * @returns {ExplicaPantalla|null}
 */
export function explicacionDePantalla(pantalla) {
  if (!pantalla || typeof pantalla !== 'string') return null;
  const p = pantalla.trim().toLowerCase();
  return EXPLICA_PANTALLAS[p] || null;
}

/**
 * ¿El manifiesto explica esta pantalla?
 * @param {string|null|undefined} pantalla
 * @returns {boolean}
 */
export function tieneExplicacion(pantalla) {
  return explicacionDePantalla(pantalla) !== null;
}

export default {
  EXPLICA_PANTALLAS,
  explicacionDePantalla,
  tieneExplicacion,
};
