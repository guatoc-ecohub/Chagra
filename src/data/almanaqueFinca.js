/**
 * almanaqueFinca — datos del "Almanaque de la finca": el calendario agrícola y
 * lunar campesino, contado a lo grande (patrón photo-forward de Café/Agua).
 *
 * Es la vista HERMANA de CalendarioFincaScreen: mientras aquel arma el
 * calendario GROUNDED, mata por mata, de la finca del usuario, este enseña el
 * año campesino colombiano a nivel país — las temporadas de aguas y secas, qué
 * da cada piso térmico, y el saber lunar tradicional — para orientar antes de
 * entrar al detalle. Uno NO reemplaza al otro; se complementan y se enlazan.
 *
 * GROUNDING (anti-alucinación, crítico):
 *   - Las ventanas de cosecha de los perennes salen de `perennialCycles.js`
 *     (Agrosavia/Cenicafé/Fedecacao). NO se inventan meses: si el ciclo dice
 *     `regime: 'unknown'` o no lista meses, aquí sale "dato en camino".
 *   - Las temporadas de aguas/secas y los hitos folk (cabañuelas, veranillo de
 *     San Juan, mitaca, cordonazo de San Francisco, San Isidro) vienen del
 *     léxico etnolingüístico Chagra (public/lexico-campesino.json), que a su vez
 *     viene de DR calendario-folk-lunar-agricola-colombia.
 *   - Los pisos térmicos son la clasificación de Caldas (estándar IGAC): rangos
 *     de altitud y temperatura verificables, no opinión.
 *
 * SABER LUNAR — encuadre honesto (misma política que MundoCultivosHub):
 *   Se presenta como CULTURA, no como receta agronómica. Se dice explícito que
 *   "no promete más cosecha". Ataca el hueco etnolingüístico (que el usuario y
 *   el agente entiendan "sembrar en luna tierna") SIN venderlo como ciencia
 *   dura. Nada de porcentajes de rendimiento ni promesas causales.
 */

import { PERENNIAL_CYCLES, monthShortName } from './perennialCycles';

/* ── Fotos reales reutilizadas (Wikimedia Commons, licencia abierta) ────────
 * Para no engordar el bundle (presupuesto apretado), el almanaque REUTILIZA
 * fotos que ya viven en /public de otros mundos, con su crédito original. No
 * agrega megas nuevos. Cada entrada trae su ruta absoluta y su crédito. */
export const FOTOS_ALMANAQUE = {
  siembra_lluvia: {
    src: '/milpa/siembra.jpg',
    autor: 'Anna Juchnowicz',
    licencia: 'CC BY-SA 4.0',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Three_Sisters_companion_planting_technique.jpg',
  },
  maiz_seco: {
    src: '/milpa/maiz.jpg',
    autor: 'Shixart1985',
    licencia: 'CC BY 2.0',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Corn_cobs_drying_on_a_wall_in_a_rustic_setting.jpg',
  },
  milpa_viva: {
    src: '/milpa/milpaviva.jpg',
    autor: 'Feria de Productores',
    licencia: 'CC BY 2.0',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Milpa_llena_de_vida.jpg',
  },
  montana_cafe: {
    src: '/cafe/cafetal.jpg',
    autor: 'Timothy A. Gonsalves',
    licencia: 'CC BY-SA 4.0',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Coffee_Shade_Trees_Paddy_Fields_Coorg_Feb24_R16_07670.jpg',
  },
  platano_racimo: {
    src: '/platano-banano/racimo-verde.jpg',
    autor: 'NiferO',
    licencia: 'CC BY-SA 4.0',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Freshly_Harvested_Green_Bananas.jpg',
  },
  cacao_mazorca: {
    src: '/cacao/mazorca.jpg',
    autor: 'Pkraemer',
    licencia: 'CC BY-SA 4.0',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Cocoa_pod.jpg',
  },
  huerta_lechuga: {
    src: '/hortalizas/lechuga.jpg',
    autor: 'Basile Morin',
    licencia: 'CC BY-SA 4.0',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Green_lettuce_in_a_kitchen_garden.jpg',
  },
  zanahoria_cosecha: {
    src: '/hortalizas/zanahoria.jpg',
    autor: 'woodleywonderworks',
    licencia: 'CC BY 2.0',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Carrot_harvest.jpg',
  },
};

/** Créditos deduplicados para el pie de fotos (cumplimiento licencia abierta). */
export const CREDITOS_FOTOS_ALMANAQUE = Object.entries(FOTOS_ALMANAQUE).map(
  ([slug, f]) => ({ slug, autor: f.autor, licencia: f.licencia, fuenteUrl: f.fuenteUrl }),
);

/* ── El año campesino: aguas y secas + hitos folk ──────────────────────────
 * Colombia no tiene cuatro estaciones: tiene picos de lluvia (aguas) y periodos
 * secos (secas). El campesino siembra al ENTRAR las aguas. Estos hitos vienen
 * del léxico etnolingüístico (public/lexico-campesino.json, categoría
 * "calendario"); se citan como saber folk, no como pronóstico oficial. */
export const TEMPORADAS_ANIO = [
  {
    id: 'aguas1',
    nombre: 'Primeras aguas',
    meses: 'abril – mayo',
    tono: 'lluvia',
    que: 'La ventana grande de siembra en zona andina bimodal. Entra la humedad buena y el maíz, el fríjol y la huerta nacen parejo.',
  },
  {
    id: 'veranillo',
    nombre: 'Veranillo de San Juan',
    meses: '~24 de junio',
    tono: 'seca',
    que: 'Pausa seca corta en plena temporada de lluvias. El campesino la aprovecha para deshierbar, abonar y no sembrar lo que se ahogue.',
  },
  {
    id: 'secas1',
    nombre: 'Secas grandes',
    meses: 'junio – agosto',
    tono: 'seca',
    que: 'Menos lluvia. Es tiempo de cosecha de lo sembrado en las primeras aguas, de secar grano y guardar semilla, y de preparar la tierra.',
  },
  {
    id: 'aguas2',
    nombre: 'Segundas aguas',
    meses: 'octubre – noviembre',
    tono: 'lluvia',
    que: 'La segunda ventana de siembra del año en zona bimodal. Vuelve la humedad y se repite el ciclo con los cultivos de ciclo corto.',
  },
  {
    id: 'cordonazo',
    nombre: 'Cordonazo de San Francisco',
    meses: '~4 de octubre',
    tono: 'lluvia',
    que: 'Aguaceros y vientos fuertes que marcan el cierre de la seca. Creencia: si no llega a tiempo, el invierno viene corrido.',
  },
  {
    id: 'secas2',
    nombre: 'Secas de fin de año',
    meses: 'diciembre – febrero',
    tono: 'seca',
    que: 'La seca larga. Buen tiempo para cosechar, secar café y grano, podar y planear la siembra de las primeras aguas.',
  },
];

/** Dos saberes folk de pronóstico que el campesino lee para planear el año. */
export const HITOS_PRONOSTICO = [
  {
    id: 'cabanuelas',
    termino: 'Cabañuelas',
    que: 'Los primeros días de enero se leen como espejo de los doce meses del año: el 1 pronostica enero, el 2 febrero, y así. Método folk para planear las siembras.',
  },
  {
    id: 'san-isidro',
    termino: 'San Isidro Labrador',
    que: 'El 15 de mayo, patrón de los agricultores. Marca el inicio del buen tiempo; en muchos pueblos se bendicen las semillas antes de sembrar.',
  },
  {
    id: 'mitaca',
    termino: 'La mitaca',
    que: 'La cosecha menor o de "traviesa", sobre todo en café y frutales — la segunda del año, más pequeña que la principal. En la región central cae hacia abril–junio.',
  },
];

/* ── Pisos térmicos (clasificación de Caldas, estándar IGAC) ────────────────
 * Rangos de altitud/temperatura verificables. Los cultivos de cada piso salen
 * del catálogo (rangos de altitud de perennialCycles.region_note) y de la
 * milpa; las ventanas de cosecha de los perennes se derivan abajo, GROUNDED. */
export const PISOS_TERMICOS = [
  {
    id: 'calido',
    nombre: 'Tierra caliente',
    rango: '0 – 1000 msnm',
    temp: 'más de 24 °C',
    emoji: '🌴',
    foto: 'platano_racimo',
    color: '#c2681f',
    lema: 'Plátano, cacao, cítricos y frutas de calor',
    cultivos: [
      { nombre: 'Plátano y banano', slug: 'musa_paradisiaca', nota: 'Pancoger de la casa; produce escalonado todo el año.' },
      { nombre: 'Cacao', slug: 'theobroma_cacao', nota: 'Bajo sombra, por debajo de 1250 msnm.' },
      { nombre: 'Maracuyá', slug: 'passiflora_edulis_flavicarpa', nota: 'Clima cálido hasta ~1000 msnm.' },
      { nombre: 'Piña', slug: 'ananas_comosus', nota: 'Según manejo e inducción de floración.' },
      { nombre: 'Lima Tahití', slug: 'citrus_latifolia', nota: 'Del nivel del mar hasta ~2100 msnm.' },
    ],
  },
  {
    id: 'templado',
    nombre: 'Tierra templada',
    rango: '1000 – 2000 msnm',
    temp: '17 – 24 °C',
    emoji: '☕',
    foto: 'montana_cafe',
    color: '#7a4a24',
    lema: 'El piso del café, el aguacate y la mora',
    cultivos: [
      { nombre: 'Café', slug: 'coffea_arabica', nota: 'El cultivo bandera; entre 1200 y 2200 msnm.' },
      { nombre: 'Aguacate', slug: 'persea_americana', nota: 'Óptimo 1800–2000 msnm.' },
      { nombre: 'Mora de Castilla', slug: 'rubus_glaucus', nota: 'Amplio: 1200–3200 msnm.' },
      { nombre: 'Lulo', slug: 'solanum_quitoense', nota: 'Estudiado entre 1800 y 2600 msnm.' },
      { nombre: 'Granadilla', slug: 'passiflora_ligularis', nota: '1700–2100 msnm.' },
    ],
  },
  {
    id: 'frio',
    nombre: 'Tierra fría',
    rango: '2000 – 3000 msnm',
    temp: '12 – 17 °C',
    emoji: '🥬',
    foto: 'huerta_lechuga',
    color: '#3f7a4e',
    lema: 'La huerta, la papa y las frutas frías',
    cultivos: [
      { nombre: 'Hortalizas de hoja', slug: null, nota: 'Lechuga, repollo, acelga: ciclo corto, siembra escalonada.' },
      { nombre: 'Raíces de la huerta', slug: null, nota: 'Zanahoria, remolacha, cebolla: cultivos de clima frío.' },
      { nombre: 'Tomate de árbol', slug: 'solanum_betaceum', nota: 'Frío moderado andino (16–20 °C).' },
      { nombre: 'Uchuva', slug: 'physalis_peruviana', nota: 'Se adapta entre 1800 y 2800 msnm.' },
      { nombre: 'Feijoa', slug: 'acca_sellowiana', nota: 'Óptimo 2100–2600 msnm.' },
      { nombre: 'Curuba', slug: 'passiflora_tripartita_mollissima', nota: 'Alturas frías, 1800–3500 msnm.' },
    ],
  },
  {
    id: 'paramo',
    nombre: 'Páramo',
    rango: 'más de 3000 msnm',
    temp: 'menos de 12 °C',
    emoji: '🏔️',
    foto: null,
    color: '#4b6b7a',
    lema: 'Zona de agua: casi no se cultiva',
    cultivos: [],
    nota: 'Por encima de los 3000 msnm casi no se cultiva: es la fábrica de agua de la finca y del país. Se cuida el frailejón y la cobertura nativa, no se ara. Algunos cultivos frescos (arándano, agraz) llegan hasta el borde inferior con manejo.',
  },
];

/**
 * Ventana de cosecha GROUNDED de un perenne, derivada de perennialCycles.
 * Devuelve un texto corto de meses (p. ej. "abr · may · jun · sep · oct...") o
 * null si el ciclo no lista meses (regime 'unknown' o continuo sin picos).
 * Nunca inventa.
 * @param {string} slug
 * @returns {string|null}
 */
export function ventanaCosecha(slug) {
  const cy = slug ? PERENNIAL_CYCLES[slug] : null;
  if (!cy || !Array.isArray(cy.harvest_months) || cy.harvest_months.length === 0) {
    return null;
  }
  const meses = [...cy.harvest_months].sort((a, b) => a - b);
  return meses.map((m) => monthShortName(m)).join(' · ');
}

/**
 * Etiqueta honesta del régimen de un perenne para la UI.
 * @param {string} slug
 * @returns {{ label: string, tone: 'ok'|'pendiente' }}
 */
export function regimenCultivo(slug) {
  const cy = slug ? PERENNIAL_CYCLES[slug] : null;
  if (!cy) return { label: 'Ciclo por confirmar', tone: 'pendiente' };
  if (cy.regime === 'unknown') return { label: 'Calendario variable por zona', tone: 'pendiente' };
  if (cy.regime === 'bimodal') return { label: 'Dos cosechas al año', tone: 'ok' };
  if (cy.regime === 'seasonal') return { label: 'Una cosecha al año', tone: 'ok' };
  return { label: 'Produce casi todo el año', tone: 'ok' };
}

/* ── La luna: saber campesino (cultura, no receta) ──────────────────────────
 * Encuadre honesto idéntico al de MundoCultivosHub: se presenta como CULTURA,
 * con el aviso explícito de que "no promete más cosecha". Su valor aquí es
 * DOBLE: (1) respeta y ordena el saber tradicional; (2) cierra el hueco
 * etnolingüístico — que el usuario y el agente entiendan expresiones como
 * "sembrar en luna tierna" o "cortar en menguante". Los significados vienen del
 * léxico etnolingüístico (public/lexico-campesino.json). */
export const LUNA_FASES = [
  {
    id: 'creciente',
    fase: 'Luna creciente',
    icono: 'creciente',
    folk: 'La savia sube',
    dice: 'Se dice que la savia asciende a tallos y ramas.',
    labores: 'Ventana folk para lo de HOJA y de PORTE ALTO: lechuga, espinaca, coles, maíz, injertos y trasplantes.',
    grupo: 'hoja',
  },
  {
    id: 'llena',
    fase: 'Luna llena',
    icono: 'llena',
    folk: 'Todo arriba',
    dice: 'La savia acumulada en tallos y hojas, según el saber.',
    labores: 'Ventana folk para COSECHA de frutos jugosos y corte de madera; también se usa para bioestimular.',
    grupo: 'fruto',
  },
  {
    id: 'menguante',
    fase: 'Luna menguante',
    icono: 'menguante',
    folk: 'La savia baja',
    dice: 'Se dice que la savia desciende y se concentra en las raíces.',
    labores: 'Ventana folk para lo de RAÍZ: zanahoria, papa, cebolla, remolacha, yuca; también podas.',
    grupo: 'raiz',
  },
  {
    id: 'nueva',
    fase: 'Luna nueva (tierna)',
    icono: 'nueva',
    folk: 'Reposo',
    dice: 'Llamada "luna tierna": periodo de reposo, poco crecimiento.',
    labores: 'Se recomienda descansar la tierra; algunos siembran raíces o hacen poda de raíz y trasplante.',
    grupo: 'raiz',
  },
];

/** Los tres grupos folk de cultivo por la parte que se aprovecha. */
export const LUNA_GRUPOS = [
  { id: 'hoja', titulo: 'De hoja', ejemplos: 'lechuga, espinaca, coles, cilantro', luna: 'creciente' },
  { id: 'fruto', titulo: 'De fruto', ejemplos: 'tomate, fríjol, calabaza, frutales', luna: 'creciente / llena' },
  { id: 'raiz', titulo: 'De raíz', ejemplos: 'zanahoria, papa, cebolla, yuca', luna: 'menguante' },
];

/** Aviso honesto obligatorio del bloque lunar (encuadre "cultura, no receta"). */
export const LUNA_CAVEAT =
  'El calendario lunar es saber campesino que sirve para organizar las labores y transmitir la costumbre. No promete más cosecha: es cultura, no receta. Lo agronómico firme —qué da su piso térmico y cuándo cosecha cada mata— está en el resto del almanaque y en el Calendario de la finca.';

export const LUNA_FUENTE =
  'Léxico etnolingüístico campesino Chagra (calendario folk-lunar agrícola de Colombia); registro etnográfico, no recomendación agronómica.';

/** Fuentes globales del almanaque, para el pie de página. */
export const ALMANAQUE_FUENTES =
  'Ciclos y ventanas de cosecha: Agrosavia, Cenicafé, Fedecacao, ICA y Universidad Nacional (catálogo Chagra). Temporadas y saber folk: léxico etnolingüístico campesino de Colombia. Pisos térmicos: clasificación de Caldas (IGAC).';
