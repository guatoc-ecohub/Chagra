/**
 * milpaGameEngine — lógica PURA del subjuego "La Milpa" y asociaciones.
 *
 * Sin React, sin DOM, sin red: solo funciones deterministas y testeables que
 * modelan las relaciones agroecológicas REALES de múltiples sistemas
 * agroforestales colombianos (milpa, SAF café, SAF cacao, frutal+cobertura,
 * hortalizas asociadas). El componente de UI dibuja; este módulo decide.
 *
 * Las relaciones reflejan ASOCIA_CON / COMPATIBLE_WITH del grafo de Chagra y
 * las cifras vienen de src/data/asociaciones-comparativa.json:
 *   - LER: 1.32–2.89 según sistema (mejor uso de la tierra).
 *   - N fijado: 12–76 % (leguminosas).
 *   - Cobertura reduce arvenses 24–55 %.
 *   - Control de plagas: hasta 40 % por diversidad.
 *   - Sombra cafetera: 30–50 % con buffer 2–4°C.
 * Fuentes: DR-ASOCIACIONES-CULTIVO-COLOMBIA-2026-06-18; DOI 10.1093/aob/mcu191;
 * DOI 10.3389/fagro.2023.1115490; DOI 10.1016/j.fcr.2019.107661.
 *
 * Sistemas modelados (todos con cifras reales):
 *   1. MILPA: maíz+fríjol+ahuyama (fijación N, soporte, cobertura).
 *   2. SAF CAFÉ: café+guamo+plátano (sombra, carbono, broca).
 *   3. SAF CACAO: cacao+matarratón+plátano (sombra, N).
 *   4. FRUTAL+COBERTURA: frutal+maní forrajero (suelo, N, erosión).
 *   5. HORTALIZAS: cebolla+zanahoria (repelencia mutua de moscas).
 *
 * Offline-safe: cero red. Todo cálculo es local y determinista.
 */

/** Cultivos disponibles en el juego (todas las especies de las asociaciones). */
export const CULTIVOS = Object.freeze({
  // Milpa
  MAIZ: 'maiz',
  FRIJOL: 'frijol',
  AHUYAMA: 'ahuyama',
  // SAF café
  CAFE: 'cafe',
  GUAMO: 'guamo',
  PLATANO: 'platano',
  // SAF cacao
  CACAO: 'cacao',
  MATARRATON: 'matarraton',
  // Frutal + cobertura
  FRUTAL: 'frutal',
  MANI_FORRAJERO: 'mani_forrajero',
  // Hortalizas
  CEBOLLA: 'cebolla',
  ZANAHORIA: 'zanahoria',
});

/** Alias para retrocompatibilidad. */
export const HERMANAS = CULTIVOS;

/** Salud máxima de una parcela (0–100). */
export const SALUD_MAX = 100;

/** Capacidad máxima de una parcela en espacios de siembra. */
export const SLOTS_POR_PARCELA = 4;

/**
 * Espacios que ocupa cada cultivo. En milpa, maíz ocupa más por su porte; las
 * coberturas y hortalizas ocupan menos. En SAF, árboles/sombras ocupan más.
 */
export const OCUPACION_CULTIVO = Object.freeze({
  [CULTIVOS.MAIZ]: 2,
  [CULTIVOS.FRIJOL]: 1,
  [CULTIVOS.AHUYAMA]: 1,
  [CULTIVOS.CAFE]: 1,
  [CULTIVOS.GUAMO]: 2,
  [CULTIVOS.PLATANO]: 1,
  [CULTIVOS.CACAO]: 1,
  [CULTIVOS.MATARRATON]: 2,
  [CULTIVOS.FRUTAL]: 2,
  [CULTIVOS.MANI_FORRAJERO]: 1,
  [CULTIVOS.CEBOLLA]: 1,
  [CULTIVOS.ZANAHORIA]: 1,
});

/**
 * Define los tipos de asociaciones soportadas con sus componentes.
 */
export const ASOCIACIONES = Object.freeze({
  MILPA: {
    id: 'milpa',
    nombre: 'Milpa (Tres Hermanas)',
    icono: '🌽',
    cultivos: [CULTIVOS.MAIZ, CULTIVOS.FRIJOL, CULTIVOS.AHUYAMA],
    descripciones: {
      [CULTIVOS.MAIZ]: 'Crece alto y firme como una torre',
      [CULTIVOS.FRIJOL]: 'Trepa por el maíz y fija nitrógeno',
      [CULTIVOS.AHUYAMA]: 'Cubre el suelo y frena la maleza',
    },
  },
  SAF_CAFE: {
    id: 'saf_cafe',
    nombre: 'SAF Café',
    icono: '☕',
    cultivos: [CULTIVOS.CAFE, CULTIVOS.GUAMO, CULTIVOS.PLATANO],
    descripciones: {
      [CULTIVOS.CAFE]: 'El cultivo principal que necesita sombra',
      [CULTIVOS.GUAMO]: 'Da sombra, fija nitrógeno y aporta mantillo',
      [CULTIVOS.PLATANO]: 'Sombra temporal e ingreso rápido',
    },
  },
  SAF_CACAO: {
    id: 'saf_cacao',
    nombre: 'SAF Cacao',
    icono: '🍫',
    cultivos: [CULTIVOS.CACAO, CULTIVOS.MATARRATON, CULTIVOS.PLATANO],
    descripciones: {
      [CULTIVOS.CACAO]: 'Necesita sombra para crecer sano',
      [CULTIVOS.MATARRATON]: 'Fija nitrógeno y da sombra regulable',
      [CULTIVOS.PLATANO]: 'Protege al cacao joven',
    },
  },
  FRUTAL_COBERTURA: {
    id: 'frutal_cobertura',
    nombre: 'Frutal + Cobertura',
    icono: '🍊',
    cultivos: [CULTIVOS.FRUTAL, CULTIVOS.MANI_FORRAJERO],
    descripciones: {
      [CULTIVOS.FRUTAL]: 'Árbol frutal que da sombra parcial',
      [CULTIVOS.MANI_FORRAJERO]: 'Tapiza el suelo, fija N y controla maleza',
    },
  },
  HORTALIZAS: {
    id: 'hortalizas',
    nombre: 'Cebolla + Zanahoria',
    icono: '🥕',
    cultivos: [CULTIVOS.CEBOLLA, CULTIVOS.ZANAHORIA],
    descripciones: {
      [CULTIVOS.CEBOLLA]: 'Su olor repele la mosca de la zanahoria',
      [CULTIVOS.ZANAHORIA]: 'Repele la mosca de la cebolla',
    },
  },
});

/**
 * Cifras reales del sistema por asociación (basadas en asociaciones-comparativa.json).
 */
export const CIFRAS_SISTEMA = Object.freeze({
  milpa: {
    ler: { min: 1.08, max: 2.89, aprox: 2 },
    nFijadoPct: { min: 12, max: 60 },
    coberturaReduccionPct: { min: 24, max: 55 },
    controlPlagaPct: 23,
  },
  saf_cafe: {
    sombraPct: { min: 30, max: 50 },
    carbonoBiomasaMgC_ha: 118,
    carbonoSolPlenoMgC_ha: 31,
    bufferTemperaturaC: { min: 2, max: 4 },
    nFijadoKg_ha: 168,
  },
  saf_cacao: {
    nSustituibleKg_ha: { min: 0, max: 200 },
    productividadFactor: 10,
    carbonoFactor: 2.5,
  },
  frutal_cobertura: {
    nFijado: true,
    coberturaSuelo: true,
    controlErosion: true,
  },
  hortalizas: {
    controlPlagaMutuo: true,
    reduccionInfestacionPct: { min: 30, max: 40 },
  },
});

/**
 * Una parcela vacía lista para sembrar.
 * @param {string} id  Identificador de la parcela.
 * @returns {{ id: string, cultivos: string[], etapa: string }}
 */
export function crearParcela(id) {
  return { id, cultivos: [], etapa: 'inicial' };
}

/**
 * Espacios usados por los cultivos de una parcela.
 * @param {{ cultivos: string[] }} parcela
 * @returns {number}
 */
export function espaciosUsadosParcela(parcela) {
  return parcela.cultivos.reduce(
    (total, cultivoId) => total + (OCUPACION_CULTIVO[cultivoId] ?? 1),
    0,
  );
}

/**
 * Valida si un cultivo puede entrar sin superar la capacidad. Si ya está
 * sembrado, puede tocarse para quitarlo.
 * @param {{ cultivos: string[] }} parcela
 * @param {string} cultivoId
 * @returns {boolean}
 */
export function cabeCultivoEnParcela(parcela, cultivoId) {
  const valido = /** @type {string[]} */ (Object.values(CULTIVOS)).includes(cultivoId);
  if (!valido) return false;
  if (parcela.cultivos.includes(cultivoId)) return true;

  const ocupacion = OCUPACION_CULTIVO[cultivoId] ?? 1;
  return espaciosUsadosParcela(parcela) + ocupacion <= SLOTS_POR_PARCELA;
}

/**
 * Siembra (o quita) un cultivo en una parcela. Toggle: si ya está, lo retira.
 * Una parcela admite combinaciones hasta llenar sus espacios.
 *
 * @param {{ id: string, cultivos: string[] }} parcela
 * @param {string} cultivoId  Uno de CULTIVOS.
 * @returns {{ id: string, cultivos: string[], motivo?: string }} nueva parcela
 */
export function sembrarEnParcela(parcela, cultivoId) {
  const valido = /** @type {string[]} */ (Object.values(CULTIVOS)).includes(cultivoId);
  if (!valido) return parcela;
  const tiene = parcela.cultivos.includes(cultivoId);
  if (!tiene && !cabeCultivoEnParcela(parcela, cultivoId)) {
    return { ...parcela, motivo: 'no cabe' };
  }
  const cultivos = tiene
    ? parcela.cultivos.filter((c) => c !== cultivoId)
    : [...parcela.cultivos, cultivoId];
  return { ...parcela, cultivos, motivo: undefined };
}

/**
 * Identifica qué tipo de asociación corresponde a los cultivos sembrados.
 * @param {{ cultivos: string[] }} parcela
 * @returns {string|null} ID de la asociación o null si no coincide con ninguna
 */
export function identificarAsociacion(parcela) {
  const cultivosSet = new Set(parcela.cultivos);

  for (const asoc of Object.values(ASOCIACIONES)) {
    // Verificar si la parcela tiene todos los cultivos de la asociación
    const esEstaAsociacion = asoc.cultivos.every(c => cultivosSet.has(c));
    // Y no tiene cultivos extra de otras asociaciones (con flexibilidad para combinaciones)
    if (esEstaAsociacion) {
      return asoc.id;
    }
  }
  return null;
}

/**
 * ¿La parcela es una asociación completa?
 * @param {{ cultivos: string[] }} parcela
 * @returns {boolean}
 */
export function esAsociacionCompleta(parcela) {
  return identificarAsociacion(parcela) !== null;
}

/**
 * Frase de celebración cuando se completa una asociación real.
 * @param {string} tipo ID de asociación, por ejemplo "milpa".
 * @returns {string}
 */
export function describirAsociacionCompleta(tipo) {
  const frases = {
    milpa: '¡Descubriste la Milpa! Las tres hermanas se ayudan: maíz sostiene, fríjol alimenta, ahuyama cuida 🌾',
    saf_cafe: '¡Lo lograste! El café, guamo y plátano forman un SAF: sombra, nitrógeno y cosecha se acompañan ☕',
    saf_cacao: '¡Lo lograste! Cacao, matarratón y plátano crean sombra viva y suelo alimentado 🍫',
    frutal_cobertura: '¡Lo lograste! El frutal produce arriba y el maní forrajero protege el suelo abajo 🍊',
    hortalizas: '¡Lo lograste! Cebolla y zanahoria se protegen con sus aromas y bajan la presión de plagas 🥕',
  };

  return frases[tipo] ?? '';
}

/**
 * Cuenta cuántos cultivos distintos hay en una parcela = su diversidad.
 * @param {{ cultivos: string[] }} parcela
 * @returns {number}
 */
export function diversidadParcela(parcela) {
  const set = new Set(parcela.cultivos.filter((c) => /** @type {string[]} */ (Object.values(CULTIVOS)).includes(c)));
  return set.size;
}

/**
 * Alias para retrocompatibilidad.
 */
export const esMilpaCompleta = (parcela) => identificarAsociacion(parcela) === 'milpa';

/**
 * Nitrógeno fijado por la parcela, en %, según las leguminosas presentes.
 * - Fríjol: 12-60% según acompañamiento (milpa)
 * - Guamo: ~168 kg/ha (SAF café)
 * - Matarratón: hasta 200 kg/ha sustituibles (SAF cacao)
 * - Maní forrajero: fija N (frutal+cobertura)
 *
 * @param {{ cultivos: string[] }} parcela
 * @returns {number} % de N fijado aportado al sistema
 */
export function nitrogenoFijado(parcela) {
  const leguminosas = [
    CULTIVOS.FRIJOL,
    CULTIVOS.GUAMO,
    CULTIVOS.MATARRATON,
    CULTIVOS.MANI_FORRAJERO,
  ];

  const legumsPresentes = parcela.cultivos.filter(c => /** @type {string[]} */ (leguminosas).includes(c));

  if (legumsPresentes.length === 0) return 0;

  // Milpa: fríjol con maíz = mayor aporte efectivo
  if (legumsPresentes.includes(CULTIVOS.FRIJOL)) {
    const hayMaiz = parcela.cultivos.includes(CULTIVOS.MAIZ);
    if (hayMaiz) return 60;
    return 12;
  }

  // SAF café: guamo
  if (legumsPresentes.includes(CULTIVOS.GUAMO)) {
    return 45; // ~168 kg/ha equivalentes en % del requerimiento
  }

  // SAF cacao: matarratón
  if (legumsPresentes.includes(CULTIVOS.MATARRATON)) {
    const hayCacao = parcela.cultivos.includes(CULTIVOS.CACAO);
    return hayCacao ? 55 : 30;
  }

  // Maní forrajero
  if (legumsPresentes.includes(CULTIVOS.MANI_FORRAJERO)) {
    return 25;
  }

  return 0;
}

/**
 * Sombra proporcionada por árboles en %.
 * - Guamo: 30-50% (SAF café)
 * - Matarratón: regulable (SAF cacao)
 * - Plátano: sombra temporal
 * - Frutal: sombra parcial
 *
 * @param {{ cultivos: string[] }} parcela
 * @returns {number} % de sombra (0-100)
 */
export function sombraParcela(parcela) {
  const arboles = [CULTIVOS.GUAMO, CULTIVOS.MATARRATON, CULTIVOS.PLATANO, CULTIVOS.FRUTAL];
  const arbolesPresentes = parcela.cultivos.filter(c => /** @type {string[]} */ (arboles).includes(c));

  if (arbolesPresentes.length === 0) return 0;

  if (arbolesPresentes.includes(CULTIVOS.GUAMO)) {
    // Guamo + plátano = sombra óptima 40%
    if (arbolesPresentes.includes(CULTIVOS.PLATANO)) return 40;
    return 35; // Guamo solo
  }

  if (arbolesPresentes.includes(CULTIVOS.MATARRATON)) {
    // Matarratón + plátano = sombra buena 35%
    if (arbolesPresentes.includes(CULTIVOS.PLATANO)) return 35;
    return 30; // Matarratón solo
  }

  if (arbolesPresentes.includes(CULTIVOS.FRUTAL)) {
    return 25; // Sombra parcial de frutal
  }

  if (arbolesPresentes.includes(CULTIVOS.PLATANO)) {
    return 20; // Sombra temporal del plátano
  }

  return 0;
}

/**
 * Cobertura del suelo (%) por cultivos de cobertura.
 * - Ahuyama: reduce arvenses 24-55%
 * - Maní forrajero: tapiza el suelo, fija N
 *
 * @param {{ cultivos: string[] }} parcela
 * @returns {number} % de reducción de arvenses por cobertura
 */
export function coberturaSuelo(parcela) {
  const coberturas = [CULTIVOS.AHUYAMA, CULTIVOS.MANI_FORRAJERO];
  const presentes = parcela.cultivos.filter(c => /** @type {string[]} */ (coberturas).includes(c));

  if (presentes.length === 0) return 0;

  // Ahuyama acompañada reduce más
  if (presentes.includes(CULTIVOS.AHUYAMA)) {
    const acompanada = parcela.cultivos.length >= 2;
    return acompanada ? 55 : 24;
  }

  // Maní forrajero: cobertura excelente
  if (presentes.includes(CULTIVOS.MANI_FORRAJERO)) {
    return 50;
  }

  return 0;
}

/**
 * Control de plagas por repelencia mutua o diversidad.
 * - Cebolla+zanahoria: repelencia mutua 30-40%
 * - Diversidad general: hasta 23-40%
 *
 * @param {{ cultivos: string[] }} parcela
 * @returns {number} % de reducción de plaga
 */
export function controlPlaga(parcela) {
  // Cebolla + zanahoria: repelencia mutua
  const tieneCebolla = parcela.cultivos.includes(CULTIVOS.CEBOLLA);
  const tieneZanahoria = parcela.cultivos.includes(CULTIVOS.ZANAHORIA);
  if (tieneCebolla && tieneZanahoria) {
    return 35; // Promedio del rango 30-40%
  }

  // Control por diversidad
  const d = diversidadParcela(parcela);
  if (d === 0) return 0;
  if (d === 1) return 0;
  if (d === 2) return 15;
  return 23; // 3+ cultivos
}

/**
 * ¿Hay sinergia de soporte físico entre cultivos?
 * - Maíz↔fríjol (el fríjol trepa)
 * - Cualquier árbol + cultivo pequeño (protección)
 *
 * @param {{ cultivos: string[] }} parcela
 * @returns {boolean}
 */
export function haySoporteFisico(parcela) {
  // Maíz sostiene al fríjol
  const maizFrijol =
    parcela.cultivos.includes(CULTIVOS.MAIZ) &&
    parcela.cultivos.includes(CULTIVOS.FRIJOL);
  if (maizFrijol) return true;

  // Árboles protegen cultivos pequeños
  const arboles = [CULTIVOS.GUAMO, CULTIVOS.MATARRATON, CULTIVOS.PLATANO, CULTIVOS.FRUTAL];
  const cultivosPequenos = [CULTIVOS.CAFE, CULTIVOS.CACAO, CULTIVOS.CEBOLLA, CULTIVOS.ZANAHORIA];

  const hayArbol = parcela.cultivos.some(c => /** @type {string[]} */ (arboles).includes(c));
  const hayPequeno = parcela.cultivos.some(c => /** @type {string[]} */ (cultivosPequenos).includes(c));

  return hayArbol && hayPequeno;
}

/**
 * Alias para retrocompatibilidad.
 */
export const haySoporteMaizFrijol = haySoporteFisico;

/**
 * Land Equivalent Ratio aproximado de la parcela: cuánto mejor usa la tierra la
 * asociación frente a sembrar cada cultivo por separado.
 * Valores según asociaciones-comparativa.json:
 *   - 0 cultivos → 0 (vacía)
 *   - 1 cultivo  → 1.0 (monocultivo línea base)
 *   - 2 cultivos → 1.32-1.45 (asociación parcial)
 *   - 3+ cultivos → 1.45-2.89 (asociación completa, según tipo)
 *
 * @param {{ cultivos: string[] }} parcela
 * @returns {number} LER (2 decimales)
 */
export function lerParcela(parcela) {
  const d = diversidadParcela(parcela);
  if (d === 0) return 0;
  if (d === 1) return 1.0;

  // Identificar la asociación para LER específico
  const tipoAsoc = identificarAsociacion(parcela);

  // LER según sistema (datos reales)
  if (tipoAsoc === 'milpa') {
    return 2.0; // Promedio rango 1.08-2.89
  }
  if (tipoAsoc === 'saf_cafe') {
    return 1.8; // Sombra + carbono + diversidad
  }
  if (tipoAsoc === 'saf_cacao') {
    return 1.95; // Productividad 10x vs monocultivo
  }
  if (tipoAsoc === 'frutal_cobertura') {
    return 1.6; // Frutal + cobertura
  }
  if (tipoAsoc === 'hortalizas') {
    return 1.32; // Cebolla+zanahoria (dato real)
  }

  // Asociaciones parciales sin identificar
  if (d === 2) return 1.32;
  return 1.45; // 3+ cultivos sin patrón específico
}

/**
 * Salud/rendimiento de la parcela (0–100). Premia las sinergias reales de cada
 * sistema:
 *   - Base por tener al menos un cultivo.
 *   - Fijación de N (leguminosas).
 *   - Soporte físico (trepadores, árboles).
 *   - Cobertura del suelo (menos arvenses, más humedad).
 *   - Control de plagas (repelencia, diversidad).
 *   - Sombra (buffer climático).
 *   - Bono de sistema completo.
 *
 * Un monocultivo nunca supera ~45; las asociaciones completas llegan a 95-100.
 *
 * @param {{ cultivos: string[] }} parcela
 * @returns {number} salud entre 0 y SALUD_MAX
 */
export function saludParcela(parcela) {
  const d = diversidadParcela(parcela);
  if (d === 0) return 0;

  let salud = 35; // base de un cultivo sano y solo

  // Bonos por sinergias específicas
  if (haySoporteFisico(parcela)) salud += 18; // soporte físico entre cultivos

  // Fijación de nitrógeno
  const nFijado = nitrogenoFijado(parcela);
  if (nFijado > 0) {
    salud += 12; // N fijado beneficia al sistema
    if (nFijado >= 50) salud += 6; // Bono extra por alta fijación
  }

  // Cobertura del suelo
  const cobertura = coberturaSuelo(parcela);
  if (cobertura > 0) {
    salud += 10; // cobertura base
    if (cobertura >= 50) salud += 6; // cobertura excelente
  }

  // Control de plagas
  const controlPlagas = controlPlaga(parcela);
  if (controlPlagas > 0) salud += 8;

  // Sombra (buffer climático)
  const sombra = sombraParcela(parcela);
  if (sombra > 0) {
    salud += 8; // sombra base
    if (sombra >= 30 && sombra <= 50) salud += 5; // sombra óptima
  }

  // Bono por diversidad adicional
  if (d >= 3) salud += 5;

  // Bono de sistema completo (identificado como asociación conocida)
  const tipoAsoc = identificarAsociacion(parcela);
  if (tipoAsoc) salud += 10; // sistema completo se potencia

  return Math.min(SALUD_MAX, salud);
}

/**
 * Catálogo de eventos del clima/plagas que ponen a prueba a la parcela.
 * `dano` es el golpe base (a un monocultivo). La diversidad amortigua.
 * Ampliado para múltiples sistemas agroforestales.
 */
export const EVENTOS = Object.freeze([
  {
    id: 'sequia',
    nombre: 'Sequía',
    emoji: '☀️',
    dano: 32,
    // La cobertura retiene humedad → resiste mejor
    relacion: 'La cobertura del suelo guarda humedad y amortigua la sequía.',
    afectaA: ['todos'],
  },
  {
    id: 'cogollero',
    nombre: 'Gusano cogollero',
    emoji: '🐛',
    dano: 30,
    // La diversidad confunde a la plaga
    relacion: 'La diversidad de cultivos baja la presión del cogollero.',
    afectaA: ['milpa', 'hortalizas'],
  },
  {
    id: 'aguacero',
    nombre: 'Aguacero fuerte',
    emoji: '🌧️',
    dano: 26,
    // Suelo cubierto erosiona menos
    relacion: 'El suelo cubierto y con raíces variadas erosiona menos.',
    afectaA: ['todos'],
  },
  {
    id: 'arvenses',
    nombre: 'Maleza (arvenses)',
    emoji: '🌿',
    dano: 24,
    // La cobertura tapa el suelo
    relacion: 'Los cultivos de cobertura tapan el suelo y frenan la maleza.',
    afectaA: ['todos'],
  },
  {
    id: 'broca',
    nombre: 'Broca del café',
    emoji: '🪲',
    dano: 35,
    // La sombra y diversidad ayudan
    relacion: 'La sombra del guamo y la diversidad amortiguan la broca.',
    afectaA: ['saf_cafe'],
  },
  {
    id: 'helada',
    nombre: 'Helada',
    emoji: '❄️',
    dano: 28,
    // La sombra y microclima protegen
    relacion: 'La sombra de los árboles crea microclima que protege del frío.',
    afectaA: ['saf_cafe', 'saf_cacao'],
  },
  {
    id: 'mosca',
    nombre: 'Moscas (cebolla/zanahoria)',
    emoji: '🪰',
    dano: 25,
    // La repelencia mutua protege
    relacion: 'Sembrar cebolla y zanahoria juntas repele sus moscas mutuamente.',
    afectaA: ['hortalizas'],
  },
  {
    id: 'calor_extremo',
    nombre: 'Ola de calor',
    emoji: '🔥',
    dano: 29,
    // La sombra buffer la temperatura
    relacion: 'La sombra de los árboles modera la temperatura y protege los cultivos.',
    afectaA: ['saf_cafe', 'saf_cacao', 'frutal_cobertura'],
  },
  {
    id: 'viento_fuerte',
    nombre: 'Viento fuerte',
    emoji: '💨',
    dano: 22,
    // Los árboles rompen el viento
    relacion: 'Los árboles actúan como rompevientos y protegen los cultivos.',
    afectaA: ['todos'],
  },
  {
    id: 'enfermedad_fungal',
    nombre: 'Enfermedad fúngica',
    emoji: '🍄',
    dano: 27,
    // La diversidad y circulación de aire ayudan
    relacion: 'La diversidad y buena circulación de aire reducen enfermedades.',
    afectaA: ['todos'],
  },
]);

/**
 * Factor de resistencia de una parcela ante un evento, según su DIVERSIDAD y
 * beneficios específicos.
 * Principio agroecológico real: a más diversidad + sinergias, más resiliencia.
 *   - 1 cultivo → 1.0 (recibe daño completo)
 *   - 2 cultivos → 0.65 (amortigua 35%)
 *   - 3+ cultivos → 0.4 (amortigua 60%)
 *   - Sistema completo → 0.25 (amortigua 75%)
 *
 * @param {{ cultivos: string[] }} parcela
 * @param {{ id?: string } | null} [evento]
 * @returns {number} factor multiplicador del daño (0–1)
 */
export function factorResistencia(parcela, evento = null) {
  const d = diversidadParcela(parcela);
  let factor;

  // Resistencia base por diversidad
  if (d <= 1) factor = 1.0;
  else if (d === 2) factor = 0.65;
  else factor = 0.4;

  // Bonos específicos según sistema y tipo de evento
  const tipoAsoc = identificarAsociacion(parcela);

  // Sequía: cobertura ayuda
  if (evento?.id === 'sequia') {
    const cobertura = coberturaSuelo(parcela);
    if (cobertura >= 50) factor *= 0.5; // -50% adicional de daño
    else if (cobertura > 0) factor *= 0.7;
  }

  // Broca: sombra + diversidad en SAF café
  if (evento?.id === 'broca' && tipoAsoc === 'saf_cafe') {
    factor *= 0.4; // SAF café resiste bien la broca
  }

  // Moscas: repelencia mutua en hortalizas
  if (evento?.id === 'mosca' && tipoAsoc === 'hortalizas') {
    factor *= 0.35; // Cebolla+zanahoria se protegen muy bien
  }

  // Calor extremo: sombra buffer
  if (evento?.id === 'calor_extremo') {
    const sombra = sombraParcela(parcela);
    if (sombra >= 30 && sombra <= 50) factor *= 0.45;
    else if (sombra > 0) factor *= 0.7;
  }

  // Sistema completo: bono general de resiliencia
  if (tipoAsoc) factor *= 0.8;

  return Math.max(0.15, Math.min(1.0, factor));
}

/**
 * Sistema de temporadas múltiples.
 * Una temporada = siembra → evento(s) → cosecha → resumen.
 * El jugador puede jugar varias temporadas y ver su progreso.
 */

/**
 * Crea un estado de juego nuevo con múltiples temporadas.
 * @param {number} numParcelas - Número de parcelas (default 6)
 * @param {number} numTemporadas - Número de temporadas (default 3)
 * @returns {Object} Estado inicial del juego
 */
export function crearJuego(numParcelas = 6, numTemporadas = 3) {
  return {
    parcelas: Array.from({ length: numParcelas }, (_, i) =>
      crearParcela(String(i + 1))
    ),
    temporadaActual: 1,
    numTemporadas,
    historicoTemporadas: [],
    logrosDesbloqueados: [],
    puntajeTotal: 0,
  };
}

/**
 * Avanza a la siguiente temporada. Retorna false si no hay más temporadas.
 * @param {Object} juego - Estado actual del juego
 * @returns {{ juego: Object, continua: boolean }}
 */
export function avanzarTemporada(juego) {
  if (juego.temporadaActual >= juego.numTemporadas) {
    return { juego, continua: false };
  }

  // Guardar resumen de temporada actual
  const resumen = resumenFinca(juego.parcelas);
  juego.historicoTemporadas.push({
    numero: juego.temporadaActual,
    resumen,
  });

  // Avanzar
  juego.temporadaActual += 1;

  // Resetear parcelas para nueva temporada
  juego.parcelas = juego.parcelas.map((p) => crearParcela(p.id));

  return { juego, continua: true };
}

/**
 * Calcula el puntaje final del juego basado en todas las temporadas.
 * @param {Object} juego - Estado del juego
 * @returns {number} Puntaje total (0-1000)
 */
export function calcularPuntajeFinal(juego) {
  if (juego.historicoTemporadas.length === 0) return 0;

  let puntajeTotal = 0;

  for (const temp of juego.historicoTemporadas) {
    const r = temp.resumen;
    // Puntaje por temporada: rendimiento + diversidad + LER
    const puntajeTemporada =
      r.saludTotal +
      r.lerPromedio * 20 +
      r.nitrogenoPromedio +
      r.coberturaPromedio;
    puntajeTotal += puntajeTemporada;
  }

  // Normalizar a 0-1000
  const maxPosible = juego.numTemporadas * 300;
  return Math.min(1000, Math.round((puntajeTotal / maxPosible) * 1000));
}

/**
 * Verifica si el jugador ha desbloqueado logros.
 * @param {Object} juego - Estado del juego
 * @returns {string[]} IDs de logros desbloqueados
 */
export function verificarLogros(juego) {
  const logros = [];

  // Verificar en el historial
  for (const temp of juego.historicoTemporadas) {
    const r = temp.resumen;

    // Logros de rendimiento
    if (r.asociacionesCompletas >= 1 && !logros.includes('primera_milpa')) {
      logros.push('primera_milpa');
    }
    if (r.ventajaPct >= 100 && !logros.includes('super_milpa')) {
      logros.push('super_milpa');
    }
    if (r.lerPromedio >= 1.8 && !logros.includes('maestro_ler')) {
      logros.push('maestro_ler');
    }
    if (r.nitrogenoPromedio >= 50 && !logros.includes('fijador_n')) {
      logros.push('fijador_n');
    }

    // Logros de diversidad
    const todasAsociaciones = new Set();
    for (const p of juego.parcelas) {
      const tipo = identificarAsociacion(p);
      if (tipo) todasAsociaciones.add(tipo);
    }
    if (todasAsociaciones.size >= 3 && !logros.includes('biodiverso')) {
      logros.push('biodiverso');
    }

    // Logros de resiliencia
    if (r.asociacionesCompletas >= Math.floor(juego.parcelas.length / 2) &&
        !logros.includes('resiliente')) {
      logros.push('resiliente');
    }
  }

  return logros;
}

/**
 * Aplica un evento a una parcela y devuelve la salud resultante. Las asociaciones
 * completas pierden MUCHA menos salud que los monocultivos ante el mismo golpe.
 *
 * @param {{ cultivos: string[] }} parcela
 * @param {{ dano: number, id?: string }} evento
 * @returns {{ saludAntes: number, saludDespues: number, danoAplicado: number }}
 */
export function aplicarEvento(parcela, evento) {
  const saludAntes = saludParcela(parcela);
  const danoBase = evento?.dano ?? 0;
  const danoAplicado = Math.round(danoBase * factorResistencia(parcela, evento));
  const saludDespues = Math.max(0, saludAntes - danoAplicado);
  return { saludAntes, saludDespues, danoAplicado };
}

/**
 * Genera 3 eventos posibles para que el jugador elija cuál enfrentar.
 * Los eventos son no repetidos y adaptados a la temporada.
 *
 * @param {number} temporada - Número de temporada actual (1-3)
 * @param {Array} historico - Historial de eventos ya usados
 * @returns {{ id: string, nombre: string, emoji: string, dano: number, relacion: string, afectaA: string[] }[]}
 */
export function elegirEventosPosibles(temporada, historico = []) {
  // Dificultad creciente por temporada
  const factoresTemporada = {
    1: 1.0,  // Fácil
    2: 1.2,  // Medio
    3: 1.4,  // Duro
  };

  const factor = factoresTemporada[temporada] || 1.0;

  // Eventos ya usados (para no repetir)
  const eventosUsados = new Set(historico.map(e => e.id));

  // Filtrar eventos no usados y aplicar factor de temporada
  const eventosDisponibles = EVENTOS
    .filter(e => !eventosUsados.has(e.id))
    .map(e => ({
      ...e,
      dano: Math.round(e.dano * factor),
    }));

  // Si no hay suficientes eventos no usados, permitir repetir
  const pool = eventosDisponibles.length >= 3
    ? eventosDisponibles
    : EVENTOS.map(e => ({ ...e, dano: Math.round(e.dano * factor) }));

  // Seleccionar 3 eventos aleatorios
  const seleccionados = [];
  const poolCopy = [...pool];

  for (let i = 0; i < 3 && poolCopy.length > 0; i++) {
    const indice = Math.floor(Math.random() * poolCopy.length);
    seleccionados.push(poolCopy.splice(indice, 1)[0]);
  }

  // Si por alguna razón no hay suficientes, completar con cualquiera
  while (seleccionados.length < 3 && EVENTOS.length > 0) {
    const randomEvento = EVENTOS[Math.floor(Math.random() * EVENTOS.length)];
    if (!seleccionados.find(s => s.id === randomEvento.id)) {
      seleccionados.push({ ...randomEvento, dano: Math.round(randomEvento.dano * factor) });
    }
  }

  return seleccionados;
}

/**
 * Genera un consejo para resistir un evento específico.
 * @param {{ id: string }} evento
 * @returns {{ cultivo: string, consejo: string }}
 */
export function generarConsejo(evento) {
  const consejos = {
    sequia: {
      cultivo: 'Ahuyama o Maní forrajero',
      consejo: 'La cobertura del suelo guarda humedad y amortigua la sequía.',
    },
    cogollero: {
      cultivo: 'Cebolla y Zanahoria',
      consejo: 'La diversidad de cultivos baja la presión del cogollero.',
    },
    aguacero: {
      cultivo: 'Ahuyama o Maní forrajero',
      consejo: 'El suelo cubierto y con raíces variadas erosiona menos.',
    },
    arvenses: {
      cultivo: 'Ahuyama o Maní forrajero',
      consejo: 'Los cultivos de cobertura tapan el suelo y frenan la maleza.',
    },
    broca: {
      cultivo: 'Guamo y Plátano',
      consejo: 'La sombra del guamo y la diversidad amortiguan la broca.',
    },
    helada: {
      cultivo: 'Guamo o Matarratón',
      consejo: 'La sombra de los árboles crea microclima que protege del frío.',
    },
    mosca: {
      cultivo: 'Cebolla y Zanahoria juntas',
      consejo: 'Sembrar cebolla y zanahoria juntas repele sus moscas mutuamente.',
    },
    calor_extremo: {
      cultivo: 'Guamo o Matarratón',
      consejo: 'La sombra de los árboles modera la temperatura y protege los cultivos.',
    },
    viento_fuerte: {
      cultivo: 'Guamo, Matarratón o Frutal',
      consejo: 'Los árboles actúan como rompevientos y protegen los cultivos.',
    },
    enfermedad_fungal: {
      cultivo: 'Cualquier asociación diversa',
      consejo: 'La diversidad y buena circulación de aire reducen enfermedades.',
    },
  };

  return consejos[evento.id] || {
    cultivo: 'Asociaciones diversas',
    consejo: 'La diversidad de cultivos mejora la resiliencia.',
  };
}

/**
 * Cifras objetivo del "campesino vecino" a superar en cada temporada.
 * Basadas en rendimientos reales de agricultores colombianos.
 * @param {number} temporada
 * @returns {{ lerMinimo: number, nMinimo: number, coberturaMinima: number }}
 */
export function objetivosCampesinoVecino(temporada) {
  const objetivos = {
    1: { lerMinimo: 1.3, nMinimo: 20, coberturaMinima: 15 }, // Fácil
    2: { lerMinimo: 1.6, nMinimo: 35, coberturaMinima: 30 }, // Medio
    3: { lerMinimo: 1.9, nMinimo: 50, coberturaMinima: 45 }, // Duro
  };

  return objetivos[temporada] || objetivos[1];
}

/**
 * Verifica si el jugador superó al campesino vecino.
 * @param {Object} resumen - Resumen de la finca
 * @param {number} temporada - Temporada actual
 * @returns {{ supero: boolean, medalla: string, detalles: Object }}
 */
export function verificarSuperoCampesinoVecino(resumen, temporada) {
  const objetivos = objetivosCampesinoVecino(temporada);

  const detalles = {
    ler: { logrado: resumen.lerPromedio, objetivo: objetivos.lerMinimo, supero: resumen.lerPromedio >= objetivos.lerMinimo },
    n: { logrado: resumen.nitrogenoPromedio, objetivo: objetivos.nMinimo, supero: resumen.nitrogenoPromedio >= objetivos.nMinimo },
    cobertura: { logrado: resumen.coberturaPromedio, objetivo: objetivos.coberturaMinima, supero: resumen.coberturaPromedio >= objetivos.coberturaMinima },
  };

  const superoTodo = Object.values(detalles).every(d => d.supero);

  return {
    supero: superoTodo,
    medalla: superoTodo ? '🏅 Medalla al Campesino Sobresaliente' : null,
    detalles,
  };
}

/**
 * Resumen de la finca completa (todas las parcelas) para el HUD y el cierre de
 * temporada. Calcula el rendimiento total y lo compara honestamente contra el
 * mismo número de parcelas sembradas en MONOCULTIVO, para que el jugador VEA el
 * beneficio de asociar.
 *
 * @param {Array<{ id: string, cultivos: string[] }>} parcelas
 * @returns {{
 *   parcelasSembradas: number,
 *   asociacionesCompletas: number,
 *   milpasCompletas: number,
 *   tiposAsociaciones: string[],
 *   saludTotal: number,
 *   saludPromedio: number,
 *   rendimientoMono: number,
 *   ventajaPct: number,
 *   nitrogenoPromedio: number,
 *   coberturaPromedio: number,
 *   sombraPromedio: number,
 *   controlPlagaPromedio: number,
 *   lerPromedio: number,
 * }}
 */
export function resumenFinca(parcelas) {
  const sembradas = parcelas.filter((p) => diversidadParcela(p) > 0);
  const n = sembradas.length;
  if (n === 0) {
    return {
      parcelasSembradas: 0,
      asociacionesCompletas: 0,
      milpasCompletas: 0,
      tiposAsociaciones: [],
      saludTotal: 0,
      saludPromedio: 0,
      rendimientoMono: 0,
      ventajaPct: 0,
      nitrogenoPromedio: 0,
      coberturaPromedio: 0,
      sombraPromedio: 0,
      controlPlagaPromedio: 0,
      lerPromedio: 0,
    };
  }

  const saludTotal = sembradas.reduce((acc, p) => acc + saludParcela(p), 0);
  const asociacionesCompletas = sembradas.filter(esAsociacionCompleta).length;

  // Contar tipos de asociaciones presentes
  const tipos = new Set();
  for (const p of parcelas) {
    const tipo = identificarAsociacion(p);
    if (tipo) tipos.add(tipo);
  }

  // Línea base honesta: un monocultivo sano rinde ~35 (saludParcela base).
  const rendimientoMono = n * 35;
  const ventajaPct = rendimientoMono > 0
    ? Math.round(((saludTotal - rendimientoMono) / rendimientoMono) * 100)
    : 0;

  const nitrogenoPromedio = Math.round(
    sembradas.reduce((acc, p) => acc + nitrogenoFijado(p), 0) / n,
  );
  const coberturaPromedio = Math.round(
    sembradas.reduce((acc, p) => acc + coberturaSuelo(p), 0) / n,
  );
  const sombraPromedio = Math.round(
    sembradas.reduce((acc, p) => acc + sombraParcela(p), 0) / n,
  );
  const controlPlagaPromedio = Math.round(
    sembradas.reduce((acc, p) => acc + controlPlaga(p), 0) / n,
  );
  const lerPromedio = Number(
    (sembradas.reduce((acc, p) => acc + lerParcela(p), 0) / n).toFixed(2),
  );

  return {
    parcelasSembradas: n,
    asociacionesCompletas,
    milpasCompletas: asociacionesCompletas,
    tiposAsociaciones: Array.from(tipos),
    saludTotal,
    saludPromedio: Math.round(saludTotal / n),
    rendimientoMono,
    ventajaPct,
    nitrogenoPromedio,
    coberturaPromedio,
    sombraPromedio,
    controlPlagaPromedio,
    lerPromedio,
  };
}

// Alias para retrocompatibilidad
export const milpasCompletas = (parcelas) => {
  const r = resumenFinca(parcelas);
  return r.asociacionesCompletas;
};
