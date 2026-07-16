/*
 * saludoPantalla — el saludo CONTEXTUAL de Angelita según la pantalla.
 *
 * Cuando el campesino toca a Angelita (AgentFab) estando en una pantalla,
 * ella no saluda genérico: pregunta por LO QUE ESTÁ VIENDO. En #semilla
 * ofrece ayuda con la germinación; en el mundo del café, con el café; en la
 * sierra, con lo que se da a su altura. Compañía que entiende dónde está.
 *
 * SOLO datos + un resolver puro (testeable, cero react). El shell prod pasa
 * `currentView` al FAB; el FAB lo manda como `initialContext.desdePantalla`;
 * AgentScreen resuelve aquí el saludo y lo pinta como greeting de entrada.
 * Pantalla no mapeada → null → el flujo de saludo de siempre (pendientes /
 * idea contextual) queda intacto.
 *
 * TONO (regla de la casa): español de Colombia, USTED, campesino, corto y
 * en pregunta — invita a hablar, no sermonea. Nunca voseo.
 */

/* Mundos de cultivo: comparten plantilla — cambia la mata. */
const CULTIVOS = {
  cafe: 'el café',
  cacao: 'el cacao',
  platano: 'el plátano y el banano',
  aguacate: 'el aguacate',
  citricos: 'los cítricos',
  cana: 'la caña',
  mango: 'el mango',
  uchuva: 'la uchuva',
  frutales: 'los frutales',
  hortalizas: 'las hortalizas',
  tuberculos: 'los tubérculos',
  aromaticas: 'las aromáticas',
  botica: 'las plantas de botica',
  fique: 'el fique',
  quinua: 'la quinua',
  milpa_cultivo: 'la milpa',
};

/* Saludos por ruta exacta (rutasProdChagraApp.js — rutas #sin-barra). */
const SALUDOS = {
  // ── El valle (home) y las vistas 3D ──
  valle3d: '¿Qué quiere revisar de su finca hoy? Cuénteme qué vio.',
  valle3d_noche: '¿Pendiente de la finca a esta hora? Cuénteme qué necesita.',
  valle3d_lluvia: '¿Lo cogió la lluvia? Si quiere miramos qué le conviene al cultivo con esta agua.',
  ventana_valle: '¿Qué quiere revisar de su finca hoy? Cuénteme qué vio.',
  sierra_global: '¿Le cuento qué se da bien a la altura de su finca?',
  bosque_vivo: '¿Hablamos del bosque? Le puedo contar cómo se recupera un rastrojo.',
  montana_mundos: '¿Para cuál mundo va? Si duda, dígame qué cultiva y le señalo el camino.',
  mundo_cultivos: '¿De cuál cultivo quiere hablar? Dígame cuál tiene sembrado.',

  // ── Semillas, siembra y ciclos ──
  semilla: '¿Le ayudo con sus semillas? Germinación, selección o cómo guardarlas.',
  germinacion: '¿Cómo van sus germinados? Si algo no le nace, miramos por qué.',
  sembrar: '¿Qué está pensando sembrar? Le ayudo a escoger el momento y el lugar.',
  ciclo: '¿Le explico el ciclo de la mata? Pregúnteme por la etapa que quiera.',
  ciclo_vivo: '¿Le explico el ciclo de la mata? Pregúnteme por la etapa que quiera.',
  ciclo_nutrientes: '¿Hablamos de cómo circulan los nutrientes en su finca?',
  calendario_finca: '¿Miramos qué le toca hacer en la finca por estas fechas?',
  ano_finca: '¿Miramos cómo va el año de su finca? Le cuento qué viene.',
  almanaque: '¿Consultamos el almanaque? Luna, siembra y cosecha por estas fechas.',

  // ── Cosecha y venta ──
  cosechar: '¿Cómo le fue con la cosecha? Si quiere la registramos juntos.',
  mi_cosecha: '¿Revisamos su cosecha? Le ayudo a sacarle cuentas.',
  poscosecha: '¿Le ayudo con el manejo después de la cosecha, para que no se le dañe?',
  almacenamiento: '¿Hablamos de cómo guardar bien lo cosechado?',
  momento_venta: '¿Le ayudo con la venta? Precios, presentación o a quién ofrecerle.',
  mercado: '¿Le ayudo con el mercado? Qué llevar, cómo presentarlo, a cómo venderlo.',
  mercados: '¿Buscando dónde vender? Miramos juntos las opciones.',

  // ── Agua, suelo y abonos ──
  agua: '¿Le ayudo con el agua de su finca? Riego, reservorios o la lluvia que viene.',
  diorama_agua: '¿Le cuento cómo camina el agua por su finca?',
  suelo: '¿Hablamos de su suelo? Cuénteme cómo lo ve, o qué le preocupa.',
  salud_suelo: '¿Revisamos la salud de su suelo? Dígame qué síntomas le ve.',
  diorama_suelo: '¿Le cuento qué vive dentro de su suelo?',
  cromatografia: '¿Le explico qué dice la cromatografía de su suelo?',
  subsuelo: '¿Hablamos de la vida de abajo? Lombrices, hongos y raíces.',
  diorama_microfauna: '¿Le presento los bichitos que le trabajan el suelo gratis?',
  compost: '¿Cómo va su compostera? Si huele feo o no calienta, lo revisamos.',
  diorama_compost: '¿Le explico cómo se cocina un buen compost?',
  estiercol: '¿Le ayudo a aprovechar el estiércol de sus animales?',
  biopreparados: '¿Preparamos algo? Dígame qué quiere controlar o nutrir y le doy la receta.',
  fermentos: '¿Le ayudo con sus fermentos? Dosis, tiempos o cómo saber si quedó bueno.',
  diorama_fermentos: '¿Le explico cómo trabajan los fermentos? Pregunte sin pena.',
  nutricion: '¿Hablamos de la comida de sus matas? Abonos, deficiencias y remedios.',

  // ── Animales ──
  animales: '¿Hablamos de sus animales? Cuénteme cómo los ve.',
  animales_gallinas: '¿Algo de sus gallinas? Postura, alimento o salud.',
  diorama_gallinero: '¿Le ayudo con el gallinero? Manejo, postura o sanidad.',
  animales_abejas: '¿Hablamos de abejas? De eso sí le sé — soy una angelita.',
  diorama_abejas: '¿Hablamos de abejas? De eso sí le sé — soy una angelita.',
  animales_vacas: '¿Algo de su ganado? Pastos, ordeño o sanidad.',
  animales_conejos: '¿Algo de sus conejos? Manejo, cría o alimento.',
  animales_caprinos: '¿Algo de sus cabras? Manejo, leche o sanidad.',

  // ── Sanidad y clima ──
  sanidad_sintoma: '¿Vio algo raro en una mata? Descríbamelo y miramos qué puede ser.',
  reportar_invasora: '¿Vio una planta que no cuadra? Le ayudo a identificarla.',
  toxicologia: '¿Duda con algún producto? Miramos si es seguro y cómo se usa.',
  clima_boletin: '¿Le explico el boletín del clima y qué significa para su finca?',

  // ── Páramo, bosque y biodiversidad ──
  glaciar: '¿Le cuento cómo va el páramo y por qué importa para su agua?',
  glaciar_historial: '¿Miramos cómo ha cambiado el glaciar con los años?',
  diorama_paramo: '¿Le cuento del páramo? De allá baja el agua de su finca.',
  restauracion: '¿Hablamos de restaurar? Le cuento por dónde se empieza.',
  biodiversidad: '¿Le cuento qué aliados viven en su finca sin cobrarle?',
  asociaciones: '¿Le ayudo a escoger qué sembrar junto a qué? Hay matas que se cuidan entre ellas.',
  aliados_finca: '¿Le presento los aliados de su finca? Cada uno le trabaja gratis.',

  // ── Registro y seguimiento ──
  bitacora: '¿Le ayudo a apuntar lo que vio hoy en la finca?',
  observacion: '¿Qué observó? Cuéntemelo y lo dejamos anotado.',
  registro_unificado: '¿Qué quiere registrar? Yo le ayudo a dejarlo bien apuntado.',
  hoy_finca: '¿Repasamos lo de hoy en su finca? Le cuento qué hay pendiente.',
  seguimiento: '¿Miramos cómo va su proceso? Le ayudo con el paso que sigue.',
  procesos: '¿Le ayudo con alguno de sus procesos? Dígame cuál.',
  activos: '¿Buscamos algo de sus matas o animales? Dígame cuál.',
  bodega: '¿Revisamos su bodega? Insumos, herramientas o lo cosechado.',
  insumos: '¿Le ayudo con los insumos? Qué le falta o qué puede preparar usted mismo.',
  mantenimiento: '¿Qué toca mantener? Le ayudo a organizar la tarea.',

  // ── Aprender y acompañamiento ──
  aprende: '¿Qué quiere aprender hoy? Pregúnteme sin pena.',
  curso: '¿Le ayudo con el curso? Si algo no quedó claro, lo repasamos.',
  faq: '¿No encuentra la respuesta? Pregúnteme directo, para eso estoy.',
  extensionista: '¿Le ayudo con sus casos de campo? Dígame cuál lo tiene pensando.',
  casos: '¿Revisamos sus casos? Le ayudo a priorizar.',
  dashboard: '¿Miramos cómo va su finca? Le cuento qué veo en los números.',
  evolucion: '¿Le cuento cómo ha evolucionado su finca? Los números hablan.',
  informes: '¿Le ayudo a leer sus informes? Le traduzco los números a decisiones.',
  mapa: '¿Miramos el mapa? Le ayudo a ubicar lotes, aguas o siembras.',
};

/**
 * Saludo contextual de Angelita para una pantalla dada.
 *
 * @param {string|null|undefined} pantalla — currentView del shell (ruta #sin-barra).
 * @returns {string|null} el saludo en usted, o null si la pantalla no tiene
 *   saludo propio (el greeting de siempre sigue mandando).
 */
export function saludoDePantalla(pantalla) {
  if (!pantalla || typeof pantalla !== 'string') return null;
  const p = pantalla.trim().toLowerCase();
  if (!p) return null;
  if (SALUDOS[p]) return SALUDOS[p];
  // Mundos de cultivo: misma plantilla, cambia la mata.
  if (CULTIVOS[p]) return `¿Algo sobre ${CULTIVOS[p]}? Siembra, plagas, cosecha — lo que necesite.`;
  // Seguimientos paramétricos (seguimiento_reforestacion, …) — genérico de proceso.
  if (p.startsWith('seguimiento')) return SALUDOS.seguimiento;
  // Mundo genérico (ruta 'mundo' con data) — ofrezca el cultivo en general.
  if (p === 'mundo') return SALUDOS.mundo_cultivos;
  return null;
}

export default saludoDePantalla;
