/*
 * biopreparadosFichas.js — Capa de PRESENTACIÓN de las fichas photo-forward de
 * biopreparados (mundo Sanidad → "Biopreparados").
 *
 * REGLA DURA — CERO FABRICACIÓN:
 * Igual que src/data/biopreparado-diagramas.js, este archivo NO inventa dosis
 * ni plagas. Solo RE-EXPRESA en lenguaje campesino lo que ya vive, textual, en
 * catalog/biopreparados-seed.json (campos `proposito`, `uso`, `dosis`,
 * `precaucion_seguridad`, `metodo`, `frecuencia`, `safety_class`,
 * `ppe_required`, `do_not_use_when`, `reentry_interval_dias`, `fuente`).
 *   · Las cifras y las plagas concretas salen del catálogo en tiempo de
 *     ejecución (getAllBiopreparados) — este archivo NO las duplica.
 *   · `paraQueSirve` es una glosa breve; los objetivos concretos que menciona
 *     (pulgón, hongos, ácaros, Botrytis…) aparecen LITERALMENTE en el `uso`/
 *     `dosis` del mismo catálogo. Donde el catálogo no nombra un objetivo, la
 *     glosa NO lo inventa (p. ej. el bordelés se describe como preventivo).
 *
 * Las fotos son reales, de Wikimedia Commons, con licencia abierta y crédito
 * verificado por la API de Commons (no fabricado). El componente cae con
 * elegancia a un ícono cuando un biopreparado no tiene foto (patrón FotoAgua).
 */

/** Prefijo público donde viven los .jpg (public/biopreparados/<slug>.jpg). */
export const FOTO_BASE_BIOPREPARADOS = '/biopreparados';

/**
 * Categorías pedagógicas — se derivan del campo `tipo` del catálogo (no de una
 * lista de ids), así el mundo absorbe solas las adiciones futuras al catálogo.
 * @type {Array<{tipo:string,label:string,desc:string,emoji:string}>}
 */
export const CATEGORIAS_BIOPREPARADO = [
  { tipo: 'caldo', label: 'Caldos minerales', desc: 'Cobre y azufre contra hongos', emoji: '⚗️' },
  { tipo: 'fermentado', label: 'Purines y biofermentos', desc: 'Abonos vivos que fermentan', emoji: '🫧' },
  { tipo: 'extracto', label: 'Extractos y tés', desc: 'Se cuelan y se asperjan', emoji: '🧉' },
  { tipo: 'mineral', label: 'Minerales y enmiendas', desc: 'Corrigen y nutren el suelo', emoji: '🪨' },
  { tipo: 'microbiano', label: 'Microbianos', desc: 'Hongos y bacterias amigas', emoji: '🦠' },
];

const TIPO_A_CATEGORIA = Object.fromEntries(
  CATEGORIAS_BIOPREPARADO.map((c) => [c.tipo, c]),
);

/** Resuelve la categoría pedagógica de un biopreparado por su `tipo`. */
export function categoriaDeBiopreparado(bp) {
  return TIPO_A_CATEGORIA[bp?.tipo] || null;
}

/**
 * Glosa de cada código de `proposito` del catálogo → pastilla legible.
 * `k` agrupa el tono/ícono (nutre / vida / repele / previene / cura / enmienda).
 * @type {Record<string,{label:string,k:string}>}
 */
export const PROPOSITO_LABEL = {
  fertilizacion: { label: 'Nutre y abona', k: 'nutre' },
  estimulante_microbiano: { label: 'Despierta la vida del suelo', k: 'vida' },
  repelente_insectos: { label: 'Repele insectos', k: 'repele' },
  fitosanitario_preventivo: { label: 'Previene enfermedades', k: 'previene' },
  fitosanitario_curativo: { label: 'Ataca la enfermedad', k: 'cura' },
  enmienda_ph: { label: 'Corrige la acidez', k: 'enmienda' },
  enmienda_ca: { label: 'Aporta calcio', k: 'enmienda' },
  enmienda_p: { label: 'Aporta fósforo', k: 'enmienda' },
};

/** Equipo de protección (EPP) del campo `ppe_required` → etiqueta campesina. */
export const PPE_LABEL = {
  guantes: 'Guantes',
  careta: 'Careta para vapores',
  gafas: 'Gafas',
  tapabocas: 'Tapabocas',
};

/** Vetos del campo `do_not_use_when` → explicación campesina del porqué. */
export const DO_NOT_USE_LABEL = {
  floracion: 'No aplicar en floración: daña la cuaja y espanta a los polinizadores.',
  proximo_a_cosecha: 'No aplicar cerca de la cosecha (respete el tiempo de reingreso).',
  suelo_ph_mayor_6_5: 'No usar en suelos poco ácidos (pH mayor a 6,5) ni en arándano o té.',
};

/**
 * Clasificación de seguridad (`safety_class` del catálogo) → color + etiqueta.
 * `revisar` se pinta honesto como "sin clasificar" (dato en camino), no verde.
 * @type {Record<string,{label:string,tone:'bajo'|'medio'|'alto'|'revisar'}>}
 */
export const SAFETY_LABEL = {
  bajo: { label: 'Riesgo bajo', tone: 'bajo' },
  medio: { label: 'Riesgo medio', tone: 'medio' },
  alto: { label: 'Riesgo alto', tone: 'alto' },
  revisar: { label: 'Sin clasificar', tone: 'revisar' },
};

/**
 * Metadatos de PRESENTACIÓN por id de biopreparado. Solo dos campos:
 *   · foto: slug del .jpg real en public/biopreparados/ (omitido = ícono).
 *   · paraQueSirve: glosa breve. Los objetivos concretos que nombra están,
 *     TEXTUALES, en el `uso`/`dosis` del catálogo (ver comentario de cada uno).
 * Todo lo demás (ingredientes, dosis, tiempo, precauciones, fuente) sale del
 * catálogo en runtime — no se copia aquí.
 * @type {Record<string,{foto?:string,paraQueSirve:string}>}
 */
// Auditoría de visión 2026-07-09 (ver Chagra-strategy/ops): 8 fotos NO mostraban
// el biopreparado sino el INGREDIENTE crudo o algo ajeno (biol=planta industrial
// de biogás; bocashi=compostera de jardín; caldo_bordeles=cristal de sulfato de
// cobre; humus_liquido=cámara de desechos; lixiviado_frutas=naranjas enteras;
// supermagro=montón de estiércol; purin_ortiga=jardín botánico con letreros en
// inglés; compost_maduro=estiércol fresco en barro). Se retiró la `foto` de cada
// una — mejor sin foto (cae al ícono, patrón FotoAgua) que con desinformación.
// Solo conservan foto verificada por visión: te_compost (brewer aireado real) y
// roca_fosforica (fosforita real, fuente Commons confirmada). Huecos documentados
// para conseguir fotos CC del preparado artesanal real más adelante.
export const FICHA_META = {
  // proposito: fertilizacion + estimulante_microbiano
  bocashi: {
    paraQueSirve: 'Abono sólido fermentado que se mezcla con la tierra: nutre la mata y despierta la vida del suelo.',
  },
  // proposito: fertilizacion + estimulante_microbiano
  biol: {
    paraQueSirve: 'Abono líquido foliar de estiércol fermentado sin aire: nutre la hoja y empuja el crecimiento.',
  },
  // dosis (catálogo): «curativo contra pulgón»; proposito: repelente_insectos
  purin_ortiga: {
    paraQueSirve: 'Nutre y, sobre todo, repele plagas chupadoras: en curativo se usa contra el pulgón.',
  },
  // uso (catálogo): «activo contra hongos y ácaros»; dosis: «escamas, chancros»
  // SIN foto a propósito: la que había mostraba un ESPÉCIMEN MINERAL (barita +
  // azufre), no el caldo sulfocálcico (líquido ámbar-rojizo de azufre + cal). Se
  // retiró — mejor sin foto que con desinformación. Falta una foto CC del caldo
  // real; cae con elegancia al ícono (patrón FotoAgua) mientras se consigue.
  caldo_sulfocalcico: {
    paraQueSirve: 'Fungicida y acaricida foliar: previene y ataca hongos y ácaros; en invierno trata escamas y chancros del tronco.',
  },
  // proposito: fitosanitario_preventivo; uso: aplicar ANTES, en alta humedad
  caldo_bordeles: {
    paraQueSirve: 'Fungicida de cobre de uso preventivo: se asperja antes de que llegue la enfermedad, en épocas de mucha humedad.',
  },
  // proposito: fertilizacion + estimulante_microbiano + fitosanitario_preventivo
  te_compost: {
    foto: 'te_compost',
    paraQueSirve: 'Extracto microbiano vivo: nutre la hoja, despierta microbios buenos y ayuda a prevenir enfermedades.',
  },
  // proposito: fertilizacion + estimulante_microbiano
  humus_liquido: {
    paraQueSirve: 'Abono líquido de lombriz: nutre la planta y ayuda a que agarre raíz.',
  },
  // uso (catálogo): «aporte de potasio y micronutrientes» en fase reproductiva
  lixiviado_frutas: {
    paraQueSirve: 'Abono líquido rico en potasio para la floración y el llenado del fruto.',
  },
  // uso (catálogo): corrige deficiencias — «clorosis intervenal, brotes deformes»
  supermagro: {
    paraQueSirve: 'Biofertilizante foliar de micronutrientes: corrige deficiencias (hojas amarillas entre las venas, brotes deformes).',
  },
  // uso (catálogo): «contra Rhizoctonia, Fusarium y Sclerotinia»
  trichoderma_harzianum_suelo: {
    paraQueSirve: 'Hongo benéfico que se echa al suelo: controla hongos de la raíz (Rhizoctonia, Fusarium, Sclerotinia).',
  },
  // uso (catálogo): «contra Botrytis, Alternaria y Monilia»
  bacillus_subtilis_foliar: {
    paraQueSirve: 'Bacteria benéfica foliar: controla Botrytis, Alternaria y Monilia.',
  },
  // proposito: enmienda_ph + enmienda_ca
  cal_dolomita: {
    paraQueSirve: 'Enmienda que sube el pH (suelo menos ácido) y aporta calcio y magnesio.',
  },
  // proposito: enmienda_p + fertilizacion; uso: suelos ácidos
  roca_fosforica: {
    foto: 'roca_fosforica',
    paraQueSirve: 'Fósforo de liberación lenta para suelos ácidos.',
  },
  // uso (catálogo): potasio + calcio, corrige acidez, «repelente físico de babosas»
  ceniza_madera: {
    paraQueSirve: 'Aporta potasio y calcio, corrige la acidez suave y, en cordón, repele babosas.',
  },
  // proposito: fertilizacion + estimulante_microbiano
  compost_maduro: {
    paraQueSirve: 'Abono sólido maduro: enmienda orgánica que nutre el suelo y despierta su vida.',
  },
  // proceso (catálogo): estimulante de enraizamiento (citoquininas, auxinas)
  biofertilizante_algas: {
    paraQueSirve: 'Extracto de algas: estimulante de enraizamiento (citoquininas, auxinas, oligoelementos).',
  },
};

/**
 * Créditos de las fotos — cada campo (autor, licencia, url del archivo) fue
 * leído de la API de Wikimedia Commons (extmetadata), NO inventado. Solo
 * aparecen aquí los slugs que tienen .jpg real descargado en public/.
 * @type {Array<{slug:string,autor:string,lic:string,url:string}>}
 */
export const CREDITOS_FOTOS_BIOPREPARADOS = [
  { slug: 'roca_fosforica', autor: 'James St. John', lic: 'CC BY 2.0', url: 'https://commons.wikimedia.org/wiki/File:Black_concretionary_phosphorite_(Morris_Member,_Phosphoria_Formation,_mid-Permian;_Waterloo_Mine,_Bear_Lake_County,_Idaho,_USA)_(34327234316).jpg' },
  { slug: 'te_compost', autor: 'Pratiti Dutta', lic: 'CC0', url: 'https://commons.wikimedia.org/wiki/File:WORM_TEA_BREWER.jpg' },
];

const CREDITO_BY_SLUG = Object.fromEntries(
  CREDITOS_FOTOS_BIOPREPARADOS.map((c) => [c.slug, c]),
);

/** Devuelve el autor de la foto de un slug (o '' si no tiene foto). */
export const creditoFotoBiopreparado = (slug) => CREDITO_BY_SLUG[slug]?.autor || '';

/** ¿Ese slug tiene foto real descargada? */
export const tieneFotoBiopreparado = (slug) => Boolean(slug && CREDITO_BY_SLUG[slug]);

/** Fallback tipado para ids sin metadata (evita inferencia `{}` en tsc). */
const FICHA_VACIA = /** @type {{foto?:string, paraQueSirve?:string}} */ ({});

/**
 * Devuelve la metadata de presentación de un biopreparado (o un objeto vacío
 * seguro): { foto?, paraQueSirve? }.
 * @param {string} id
 * @returns {{foto?:string, paraQueSirve?:string}}
 */
export function fichaMeta(id) {
  return FICHA_META[id] || FICHA_VACIA;
}
