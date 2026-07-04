/**
 * biodigestorCalculator — dimensionamiento SIMPLE y determinista de un
 * biodigestor tubular a partir del hato de la finca.
 *
 * El campesino ingresa TIPO de animal, NÚMERO de cabezas y (opcional) el PISO
 * TÉRMICO de su finca; la función estima:
 *   · estiércol fresco por día (kg)
 *   · mezcla a cargar por día (estiércol + agua, litros)
 *   · volumen del digestor (m³)
 *   · biogás por día (m³)
 *   · biol por día (litros)  ← el efluente, fertilizante líquido
 *   · equivalencia tangible (horas de fogón)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * GROUNDING (deepresearch, 2026-07):
 *   - 2026-07-03-estiercol-aprovechamiento-nacional-CO.md (§1 Biodigestores)
 *   - 2026-07-03-manure-biodigester-fertilizer-international.md
 *   - 2026-07-04-animales-finca-nacional-CO.md (§2.2 biodigestor porcícola)
 *
 * Reemplazados con cifra citada: estiércol/animal/día (cerdo, bovino), el
 * rendimiento de biogás por kg de estiércol (cerdo, bovino), la relación de
 * dilución estiércol:agua, y el TRH (tiempo de retención hidráulica) que ahora
 * varía por PISO TÉRMICO — la corrección de grounding más importante de este
 * módulo: en clima frío/páramo el TRH sube fuerte (hasta ~104 días en el
 * altiplano andino), no es un número fijo de "clima templado".
 *
 * Quedan GROUNDED-PENDIENTE (sin cifra colombiana citable encontrada):
 *   - biogás/kg de gallinaza (se usa el valor global de referencia, sin fuente
 *     específica — ver nota en PARAMS_PROCESO.BIOGAS_M3_POR_KG).
 *   - BIOGAS_M3_POR_HORA_FOGON (consumo de un fogón doméstico): ningún DR trajo
 *     una cifra citable de m³/hora de un fogón de finca.
 * La UI sigue rotulando el resultado como "estimado" (ver EstiercolScreen):
 * son relaciones estándar de ingeniería aplicadas a datos ya groundeados, no
 * un análisis de laboratorio del estiércol real de la finca.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Parámetros por especie. `estiercolKgDia` = kg de estiércol FRESCO que produce
 * un animal de referencia por día (excreta recolectable). `biogasM3PorKg` = m³
 * de biogás por kg de estiércol fresco cargado (si no trae, se usa el default
 * global de PARAMS_PROCESO.BIOGAS_M3_POR_KG).
 *
 * @type {Record<string, {id:string, nombre:string, emoji:string, estiercolKgDia:number, biogasM3PorKg?:number, nota:string, fuente:string, confianza:string}>}
 */
export const ANIMALES_BIODIGESTOR = {
  cerdo: {
    id: 'cerdo',
    nombre: 'Cerdos',
    emoji: '🐖',
    // 2,25 kg de excreta por cada 50 kg de peso vivo/día, escalado a un cerdo
    // de engorde de referencia de 60 kg: 2,25 × (60/50) = 2,7 kg/día.
    estiercolKgDia: 2.7,
    // Biodigestor tubular pequeño (finca), caso CIPAV/LRRD: 4,7 kg estiércol +
    // 4 L orina + 26 L agua/día → 97–99 L biogás/día ⇒ ≈0,0208 m³/kg estiércol.
    biogasM3PorKg: 0.021,
    nota: 'Cerdo de engorde (~60 kg vivo)',
    fuente: 'Rev. Cubana de Ingeniería (excreta/peso vivo); CIPAV/LRRD (biogás/kg, biodigestor tubular finca)',
    confianza: 'media (excreta); alta (biogás/kg, caso CIPAV Colombia)',
  },
  bovino: {
    id: 'bovino',
    nombre: 'Vacas',
    emoji: '🐄',
    // Caso de campo CIPAV/LRRD (Colombia): 26 kg de estiércol vacuno/día
    // recolectado para un digestor de 6 m³ útiles.
    estiercolKgDia: 26,
    // Mismo caso: 6 m³ útiles producen 0,18 m³ biogás/m³·día ⇒ 1,08 m³/día
    // para 26 kg estiércol/día ⇒ ≈0,0415 m³/kg.
    biogasM3PorKg: 0.0415,
    nota: 'Bovino adulto (estabulado o con recolección)',
    fuente: 'CIPAV/LRRD — adaptación de biodigestores tubulares a climas fríos (Colombia)',
    confianza: 'alta',
  },
  gallina: {
    id: 'gallina',
    nombre: 'Gallinas',
    emoji: '🐔',
    // Orden de magnitud de literatura (no institucional-CO): "pollo de
    // engorde ~0,10 kg/día". No se halló cifra específica para ponedora ni
    // para el rendimiento de biogás por kg de gallinaza fresca en los DR.
    estiercolKgDia: 0.10,
    // biogasM3PorKg: sin cifra colombiana citable → usa el default global
    // PARAMS_PROCESO.BIOGAS_M3_POR_KG (GROUNDED-PENDIENTE, ver más abajo).
    nota: 'Ponedora en piso (gallinaza recogida)',
    fuente: 'Estimado de literatura (Engormix/SciELO México, vía DR animales-finca §5.1) — NO institucional Colombia',
    confianza: 'media (estiércol/día); biogás/kg = GROUNDED-PENDIENTE',
  },
};

/**
 * TRH (tiempo de retención hidráulica, días) por PISO TÉRMICO. Corrección de
 * grounding clave: el TRH NO es fijo — depende fuertemente de la temperatura
 * ambiente del digestor (más frío ⇒ bacterias más lentas ⇒ más días de
 * retención para el mismo biogás).
 *
 *   - cálido / templado: 30 días. Biodigestor tubular de polietileno tipo
 *     Colombia/Vietnam, ambiente ~25–27 °C. Fuente: LRRD 11(1) (DR
 *     internacional biodigestor/estiércol). Confianza alta.
 *   - frío: 35 días (punto medio del rango 30–40 días citado para régimen
 *     "psicrofílico" sin calefacción). Fuente: Engormix (DR internacional
 *     §1.1). Confianza media — es un régimen general, no un caso colombiano
 *     específico para este piso.
 *   - páramo: 104 días. Caso real de un tubular en el altiplano andino
 *     (3.900–4.100 msnm, ambiente ~10,5 °C). Fuente: CIPAV/LRRD — adaptación
 *     de biodigestores tubulares a climas fríos. Confianza alta.
 */
export const TRH_DIAS_POR_PISO = {
  calido: { dias: 30, fuente: 'LRRD 11(1) — tubular polietileno tropical (~25–27 °C)', confianza: 'alta' },
  templado: { dias: 30, fuente: 'LRRD 11(1) — tubular polietileno tropical (~25–27 °C)', confianza: 'alta' },
  frio: { dias: 35, fuente: 'Engormix — régimen psicrofílico (30–40 días), punto medio', confianza: 'media' },
  paramo: { dias: 104, fuente: 'CIPAV/LRRD — altiplano andino 3.900–4.100 msnm, ~10,5 °C', confianza: 'alta' },
};

/** Lista para poblar selectores de piso térmico en la UI. */
export const PISOS_TERMICOS_BIODIGESTOR = [
  { id: 'calido', nombre: 'Cálido', emoji: '🌴', ...TRH_DIAS_POR_PISO.calido },
  { id: 'templado', nombre: 'Templado', emoji: '🍃', ...TRH_DIAS_POR_PISO.templado },
  { id: 'frio', nombre: 'Frío', emoji: '🧥', ...TRH_DIAS_POR_PISO.frio },
  { id: 'paramo', nombre: 'Páramo', emoji: '🥶', ...TRH_DIAS_POR_PISO.paramo },
];

/**
 * Parámetros del proceso de biodigestión anaerobia.
 */
export const PARAMS_PROCESO = {
  /**
   * Partes de agua por parte de estiércol en la carga.
   * GROUNDED: la mayoría de usuarios carga en relación estiércol:agua 1:1 (el
   * rango documentado sube hasta 1:1,5 o 1:2 según el contenido de sólidos).
   * Fuente: CIPAV/LRRD; Engormix (DR nacional estiércol §1.4). Confianza alta.
   */
  DILUCION_AGUA: 1,
  /** Rango documentado de la relación estiércol:agua (1:1 a 1:2 según sólidos). */
  DILUCION_AGUA_RANGO: { min: 1, max: 2 },
  /**
   * Tiempo de retención hidráulica en días, DEFAULT cuando no se conoce el
   * piso térmico de la finca. Usa el valor de clima cálido/templado (el más
   * común y el de mayor confianza citada — ver TRH_DIAS_POR_PISO). Cuando se
   * conoce el piso, `estimarBiodigestor` usa TRH_DIAS_POR_PISO en su lugar.
   */
  TRH_DIAS: TRH_DIAS_POR_PISO.calido.dias,
  /**
   * m³ de biogás por kg de estiércol fresco — DEFAULT global, usado solo para
   * especies sin `biogasM3PorKg` propio (hoy: gallina).
   * GROUNDED-PENDIENTE: no se halló una cifra colombiana citable de biogás/kg
   * de gallinaza fresca en los DR (nacional ni internacional); no se inventa.
   */
  BIOGAS_M3_POR_KG: 0.06,
  /** Fracción de la mezcla que sale como biol (efluente). */
  BIOL_FRACCION: 0.9,
  /** Holgura de diseño sobre el volumen líquido (cámara de gas + seguridad). */
  FACTOR_SEGURIDAD: 1.15,
  /** Densidad aprox. del estiércol/mezcla (kg/L) para pasar masa↔volumen. */
  DENSIDAD_KG_L: 1.0,
  /**
   * Consumo de un fogón doméstico de biogás (m³/hora).
   * GROUNDED-PENDIENTE: ningún DR trajo una cifra citable de consumo horario
   * de un fogón/hornilla de finca; se mantiene como referencia de ingeniería.
   */
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
 * @property {string|null} pisoTermico        Piso térmico usado para el TRH (o null si se usó el default).
 * @property {number}  trhDias               Tiempo de retención hidráulica usado (días).
 * @property {number}  estiercolKgDia     Estiércol fresco total por día (kg).
 * @property {number}  aguaLitrosDia      Agua de dilución por día (L).
 * @property {number}  mezclaLitrosDia    Mezcla a cargar por día (L).
 * @property {number}  volumenDigestorM3  Volumen recomendado del digestor (m³).
 * @property {number}  biogasM3Dia        Biogás estimado por día (m³).
 * @property {number}  biolLitrosDia      Biol (efluente fertilizante) por día (L).
 * @property {number}  horasFogonDia      Equivalencia: horas de fogón por día.
 * @property {boolean} groundedPendiente  true: algunos coeficientes (gallina/biogás, fogón) siguen sin cifra citable.
 */

/**
 * Estima el dimensionamiento del biodigestor. Función PURA y determinista.
 *
 * @param {{ tipoAnimal?: string, numAnimales?: number, pisoTermico?: string|null }} params
 * @returns {EstimacionBiodigestor}
 */
export function estimarBiodigestor({ tipoAnimal = 'cerdo', numAnimales = 0, pisoTermico = null } = {}) {
  const animal = ANIMALES_BIODIGESTOR[tipoAnimal] || ANIMALES_BIODIGESTOR.cerdo;
  const n = Math.max(0, Math.floor(Number(numAnimales) || 0));
  const P = PARAMS_PROCESO;

  const pisoInfo = pisoTermico ? TRH_DIAS_POR_PISO[pisoTermico] : null;
  const trhDias = pisoInfo ? pisoInfo.dias : P.TRH_DIAS;
  const biogasM3PorKg = Number.isFinite(animal.biogasM3PorKg) ? animal.biogasM3PorKg : P.BIOGAS_M3_POR_KG;

  const estiercolKgDia = n * animal.estiercolKgDia;
  const estiercolLitrosDia = estiercolKgDia / P.DENSIDAD_KG_L;
  const aguaLitrosDia = estiercolLitrosDia * P.DILUCION_AGUA;
  const mezclaLitrosDia = estiercolLitrosDia + aguaLitrosDia;
  const mezclaM3Dia = mezclaLitrosDia / 1000;

  const volumenDigestorM3 = mezclaM3Dia * trhDias * P.FACTOR_SEGURIDAD;
  const biogasM3Dia = estiercolKgDia * biogasM3PorKg;
  const biolLitrosDia = mezclaLitrosDia * P.BIOL_FRACCION;
  const horasFogonDia = biogasM3Dia / P.BIOGAS_M3_POR_HORA_FOGON;

  return {
    tipoAnimal: animal.id,
    numAnimales: n,
    pisoTermico: pisoInfo ? pisoTermico : null,
    trhDias,
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
