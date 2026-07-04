/**
 * biodigestorCalculator — dimensionamiento SIMPLE y determinista de un
 * biodigestor tubular a partir del hato de la finca.
 *
 * El campesino ingresa TIPO de animal y NÚMERO de cabezas; la función estima:
 *   · estiércol fresco por día (kg)
 *   · mezcla a cargar por día (estiércol + agua, litros)
 *   · volumen del digestor (m³)
 *   · biogás por día (m³)
 *   · biol por día (litros)  ← el efluente, fertilizante líquido
 *   · equivalencia tangible (horas de fogón)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️  GROUNDED-PENDIENTE — LEER ANTES DE TOMAR ESTAS CIFRAS COMO DATO DURO
 * ─────────────────────────────────────────────────────────────────────────
 * Los coeficientes de abajo (PARAMS_ANIMAL + PARAMS_PROCESO) son RANGOS DE
 * REFERENCIA de ingeniería agrícola, NO datos groundeados del catálogo/DR.
 * Sirven para que la calculadora dé un orden de magnitud razonable y
 * pedagógico. Las DOS investigaciones (nacional Colombia + internacional) que
 * llegan aparte deben REEMPLAZAR cada constante marcada `@grounded-pendiente`
 * por su valor citado, afinado por región térmica, raza y dieta.
 *
 * Puntos exactos a groundear (buscar el tag GROUNDED-PENDIENTE):
 *   1. estiercolKgDia por especie (producción de estiércol fresco/animal/día).
 *   2. BIOGAS_M3_POR_KG (rendimiento de biogás por kg de estiércol fresco).
 *   3. TRH_DIAS (tiempo de retención hidráulica según clima/piso térmico).
 *   4. DILUCION_AGUA (relación estiércol:agua de carga).
 *   5. BIOGAS_M3_POR_HORA_FOGON (consumo de un fogón doméstico).
 * Nada aquí se presenta al usuario como cifra citada mientras siga siendo
 * placeholder: la UI rotula estos resultados como "estimado" (ver
 * EstiercolScreen).
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Parámetros por especie. `estiercolKgDia` = kg de estiércol FRESCO que produce
 * un animal por día (excreta recolectable).
 *
 * GROUNDED-PENDIENTE #1 — valores de referencia; afinar por raza/peso/dieta.
 * @type {Record<string, {id:string, nombre:string, emoji:string, estiercolKgDia:number, nota:string}>}
 */
export const ANIMALES_BIODIGESTOR = {
  cerdo: {
    id: 'cerdo',
    nombre: 'Cerdos',
    emoji: '🐖',
    estiercolKgDia: 4.0, // @grounded-pendiente
    nota: 'Cerdo de engorde (~60 kg vivo)',
  },
  bovino: {
    id: 'bovino',
    nombre: 'Vacas',
    emoji: '🐄',
    estiercolKgDia: 10.0, // @grounded-pendiente
    nota: 'Bovino adulto (estabulado o con recolección)',
  },
  gallina: {
    id: 'gallina',
    nombre: 'Gallinas',
    emoji: '🐔',
    estiercolKgDia: 0.12, // @grounded-pendiente
    nota: 'Ponedora en piso (gallinaza recogida)',
  },
};

/**
 * Parámetros del proceso de biodigestión anaerobia (régimen mesofílico tibio).
 * GROUNDED-PENDIENTE #2–#5.
 */
export const PARAMS_PROCESO = {
  /** Partes de agua por parte de estiércol en la carga (mezcla 1:3). @grounded-pendiente #4 */
  DILUCION_AGUA: 3,
  /** Tiempo de retención hidráulica en días (clima templado). @grounded-pendiente #3 */
  TRH_DIAS: 30,
  /** m³ de biogás por kg de estiércol fresco. @grounded-pendiente #2 */
  BIOGAS_M3_POR_KG: 0.06,
  /** Fracción de la mezcla que sale como biol (efluente). */
  BIOL_FRACCION: 0.9,
  /** Holgura de diseño sobre el volumen líquido (cámara de gas + seguridad). */
  FACTOR_SEGURIDAD: 1.15,
  /** Densidad aprox. del estiércol/mezcla (kg/L) para pasar masa↔volumen. */
  DENSIDAD_KG_L: 1.0,
  /** Consumo de un fogón doméstico de biogás (m³/hora). @grounded-pendiente #5 */
  BIOGAS_M3_POR_HORA_FOGON: 0.35,
};

/** Redondea a `dec` decimales devolviendo Number (evita el "-0"). */
function round(n, dec = 1) {
  const f = 10 ** dec;
  return Math.round((n + Number.EPSILON) * f) / f || 0;
}

/**
 * @typedef {Object} EstimacionBiodigestor
 * @property {string}  tipoAnimal
 * @property {number}  numAnimales
 * @property {number}  estiercolKgDia     Estiércol fresco total por día (kg).
 * @property {number}  aguaLitrosDia      Agua de dilución por día (L).
 * @property {number}  mezclaLitrosDia    Mezcla a cargar por día (L).
 * @property {number}  volumenDigestorM3  Volumen recomendado del digestor (m³).
 * @property {number}  biogasM3Dia        Biogás estimado por día (m³).
 * @property {number}  biolLitrosDia      Biol (efluente fertilizante) por día (L).
 * @property {number}  horasFogonDia      Equivalencia: horas de fogón por día.
 * @property {boolean} groundedPendiente  Siempre true: cifras estimadas, sin citar.
 */

/**
 * Estima el dimensionamiento del biodigestor. Función PURA y determinista.
 *
 * @param {{ tipoAnimal?: string, numAnimales?: number }} params
 * @returns {EstimacionBiodigestor}
 */
export function estimarBiodigestor({ tipoAnimal = 'cerdo', numAnimales = 0 } = {}) {
  const animal = ANIMALES_BIODIGESTOR[tipoAnimal] || ANIMALES_BIODIGESTOR.cerdo;
  const n = Math.max(0, Math.floor(Number(numAnimales) || 0));
  const P = PARAMS_PROCESO;

  const estiercolKgDia = n * animal.estiercolKgDia;
  const estiercolLitrosDia = estiercolKgDia / P.DENSIDAD_KG_L;
  const aguaLitrosDia = estiercolLitrosDia * P.DILUCION_AGUA;
  const mezclaLitrosDia = estiercolLitrosDia + aguaLitrosDia;
  const mezclaM3Dia = mezclaLitrosDia / 1000;

  const volumenDigestorM3 = mezclaM3Dia * P.TRH_DIAS * P.FACTOR_SEGURIDAD;
  const biogasM3Dia = estiercolKgDia * P.BIOGAS_M3_POR_KG;
  const biolLitrosDia = mezclaLitrosDia * P.BIOL_FRACCION;
  const horasFogonDia = biogasM3Dia / P.BIOGAS_M3_POR_HORA_FOGON;

  return {
    tipoAnimal: animal.id,
    numAnimales: n,
    estiercolKgDia: round(estiercolKgDia, 1),
    aguaLitrosDia: round(aguaLitrosDia, 0),
    mezclaLitrosDia: round(mezclaLitrosDia, 0),
    volumenDigestorM3: round(volumenDigestorM3, 1),
    biogasM3Dia: round(biogasM3Dia, 1),
    biolLitrosDia: round(biolLitrosDia, 0),
    horasFogonDia: round(horasFogonDia, 1),
    groundedPendiente: true,
  };
}
