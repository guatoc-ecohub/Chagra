/* i18n (ADR-050): este servicio incluye copy user-facing (notas y puntos
 * críticos) en español Colombia, pendiente de migrar a src/config/messages.js.
 * Misma deuda que PoscosechaScreen; se desactiva la regla soft a nivel de archivo. */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
/**
 * poscosechaCalculator — lógica DETERMINISTA para la mini-app "Poscosecha y
 * Despensa" (mundo Mercado y despensa).
 *
 * Filosofía (inviolable, alineada con encaladoCalculator.js / soilDiagnostic.js):
 *   - La MATEMÁTICA es determinista y estándar (balance de masa de agua). Se
 *     calcula, no se inventa.
 *   - Los PARÁMETROS de referencia (humedad segura por grano, materia seca de
 *     cosecha, temperaturas/HR de curado y daño por frío) salen del deep research
 *     nacional/internacional con su fuente y nivel de confianza. Los que no están
 *     cerrados se marcan GROUNDED-PENDIENTE.
 *   - Nunca se afirma un número que no esté anclado a fuente.
 *
 * Grounding:
 *   - deepresearch/2026-07-04-poscosecha-conservacion-nacional-CO.md
 *   - deepresearch/2026-07-04-postharvest-storage-international.md
 */

/* ═══════════════════ 1. SECADO DE GRANO — balance de masa ═══════════════════
 * El campesino conoce el peso mojado del bulto y la humedad (por sensor, por el
 * comprador o por la tabla). Para guardar sin moho hay que bajar a la humedad
 * segura. La materia seca NO cambia al secar: solo se va agua. De ahí:
 *
 *   materia_seca = peso_inicial × (1 − humedad_inicial/100)   [constante]
 *   peso_final   = materia_seca / (1 − humedad_objetivo/100)
 *                = peso_inicial × (100 − humedad_inicial) / (100 − humedad_objetivo)
 *   agua_a_quitar = peso_inicial − peso_final
 *
 * Es aritmética exacta (conservación de masa), no una estimación.
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Humedad segura de almacenamiento por grano (% base húmeda). Debajo de este
 * nivel el moho (incl. micotoxinas/aflatoxina) e insectos no prosperan.
 * Confianza ALTA — múltiples fuentes FAO/Cenicafé concuerdan.
 */
export const GRANOS = {
  maiz: {
    label: 'Maíz',
    humedadSegura: 13,
    humedadSeguraRango: [13, 14],
    // FAO x5036e: humedad de moho despreciable < 13 %; 13.5 % ≈ 70 % HR a 27 °C.
    nota: 'Debajo de 13 % el moho casi no crece. Guárdelo seco y hermético.',
    fuente: 'FAO x5036e; DR nacional §4',
    confianza: 'alta',
  },
  frijol: {
    label: 'Fríjol',
    humedadSegura: 13,
    humedadSeguraRango: [12, 14],
    nota: 'A 12–14 % se limita el gorgojo y se conserva el poder de germinar.',
    fuente: 'PICS/Purdue; DR internacional §4.1',
    confianza: 'alta',
  },
  arroz: {
    label: 'Arroz',
    humedadSegura: 13,
    humedadSeguraRango: [12, 13],
    nota: 'Séquelo a 12–13 % para guardar sin que se caliente ni amarille.',
    fuente: 'DR nacional §4',
    confianza: 'media-alta',
  },
  cafe_pergamino: {
    label: 'Café pergamino',
    humedadSegura: 11,
    humedadSeguraRango: [10, 12],
    // Cenicafé: 10–12 %, SIN bajar de ~11 %; evita el hongo de la Ocratoxina A.
    nota: 'Séquelo a 10–12 %, sin pasarse de seco (no baje de ~11 %). Voltéelo al sol para evitar el hongo de la Ocratoxina A.',
    fuente: 'Cenicafé avt0461; DR nacional §5.6',
    confianza: 'media-alta',
  },
};

/**
 * Balance de masa del secado de grano. Todo en la misma unidad de peso (kg,
 * arrobas, bultos — el resultado sale en la misma unidad de entrada).
 *
 * @param {Object} p
 * @param {number|string} p.pesoInicial      Peso mojado del lote (misma unidad de salida);
 *   acepta string crudo de input (coma decimal incluida).
 * @param {number|string} p.humedadInicial   Humedad actual del grano (% base húmeda);
 *   acepta string crudo de input (coma decimal incluida).
 * @param {number|string} p.humedadObjetivo  Humedad segura de guardado (% base húmeda).
 * @returns {null | {
 *   pesoInicial: number,
 *   pesoFinal: number,
 *   aguaEliminada: number,
 *   materiaSeca: number,
 *   mermaPorc: number,
 * }}  null si los datos no permiten un cálculo válido.
 */
export function calcularSecadoGrano({ pesoInicial, humedadInicial, humedadObjetivo }) {
  const w = num(pesoInicial);
  const hi = num(humedadInicial);
  const hf = num(humedadObjetivo);

  // Guardas: pesos y humedades válidas (0–100), y no "secar" hacia arriba.
  if (w == null || hi == null || hf == null) return null;
  if (w <= 0) return null;
  if (hi <= 0 || hi >= 100) return null;
  if (hf < 0 || hf >= 100) return null;
  if (hf >= hi) return null; // ya está igual o más seco que el objetivo

  const materiaSeca = w * (1 - hi / 100);
  const pesoFinal = materiaSeca / (1 - hf / 100);
  const aguaEliminada = w - pesoFinal;
  const mermaPorc = (aguaEliminada / w) * 100;

  return {
    pesoInicial: redondear(w, 2),
    pesoFinal: redondear(pesoFinal, 2),
    aguaEliminada: redondear(aguaEliminada, 2),
    materiaSeca: redondear(materiaSeca, 2),
    mermaPorc: redondear(mermaPorc, 1),
  };
}

/* ═══════════════════ 2. ÍNDICE DE COSECHA — materia seca ═══════════════════
 * El aguacate Hass NO madura en la planta: se cosecha por contenido de materia
 * seca. Norma internacional ≥ 21 %; para Colombia se propone 23–24 %.
 * Confianza ALTA (AGROSAVIA, norma de exportación).
 * ────────────────────────────────────────────────────────────────────────── */

/** Umbral de materia seca del aguacate Hass (%). */
export const AGUACATE_MS_MINIMO_NORMA = 21; // norma internacional de cosecha
export const AGUACATE_MS_MINIMO_COLOMBIA = 23; // propuesto Colombia (23–24 %)

/**
 * Evalúa si un aguacate Hass está en punto de cosecha por su materia seca.
 * @param {number|string|null} materiaSecaPorc  % de materia seca medido; acepta
 *   string crudo de input (coma decimal incluida) o vacío.
 * @returns {{ nivel: string, label: string, color: string } | null}
 */
export function evaluarMateriaSecaAguacate(materiaSecaPorc) {
  const v = num(materiaSecaPorc);
  if (v == null) return null;
  if (v < AGUACATE_MS_MINIMO_NORMA) {
    return { nivel: 'verde', label: 'Aún verde: por debajo del 21 %. Si lo corta ahora, no ablanda bien y queda insípido.', color: 'amber' };
  }
  if (v < AGUACATE_MS_MINIMO_COLOMBIA) {
    return { nivel: 'norma', label: 'En punto de norma (≥ 21 %). Apto para cosechar; para exportación se prefiere 23–24 %.', color: 'lime' };
  }
  return { nivel: 'optimo', label: 'En punto óptimo (≥ 23 %). Buen sabor y aceite; coséchelo firme, ablanda después.', color: 'emerald' };
}

/* ═══════════════════ 3. CURADO — dos recetas OPUESTAS ═══════════════════════
 * El error frecuente: curar todo igual. Raíces/tubérculos = cálido + HÚMEDO;
 * cebolla/ajo = cálido + SECO. Confundirlas pudre la cosecha.
 * ────────────────────────────────────────────────────────────────────────── */

export const CURADO = {
  raices: {
    label: 'Raíces y tubérculos',
    ejemplos: 'yuca, papa, batata, ñame',
    receta: 'cálido y HÚMEDO',
    detalle: [
      { cultivo: 'Yuca', cond: '4–7 días a ~30–35 °C, 80–85 % de humedad', ojo: 'Se "raya" (deterioro fisiológico) en 2–3 días si no se cura, parafina o congela.', fuente: 'DR nacional §3.5', confianza: 'media-alta' },
      { cultivo: 'Papa', cond: '15–20 °C, 85–90 % HR, 5–10 días', ojo: 'Después: bodega fresca, oscura y ventilada.', fuente: 'DR nacional §3.5', confianza: 'media' },
      { cultivo: 'Batata/camote', cond: 'periodo corto cálido y húmedo', ojo: 'Cicatriza, endurece la piel y la vuelve más dulce (almidón → azúcar). No la enfríe por debajo de ~12,5 °C.', fuente: 'DR internacional §3.2', confianza: 'alta' },
    ],
    porque: 'La humedad y el calor hacen cicatrizar las heridas y engrosar la piel; así la raíz aguanta semanas en vez de días.',
  },
  bulbos: {
    label: 'Cebolla y ajo',
    ejemplos: 'cebolla de bulbo, ajo',
    receta: 'cálido y SECO',
    detalle: [
      { cultivo: 'Ajo', cond: '10–14 días con calor, buena ventilación y HR baja', ojo: 'Listo cuando la piel está apergaminada y el cuello duro. Luego guárdelo fresco y seco.', fuente: 'DR internacional §3.2', confianza: 'alta' },
      { cultivo: 'Cebolla', cond: 'secar cuello y capas externas con calor y aire seco', ojo: 'Guárdela con HR baja (~65–70 %); la humedad la pudre.', fuente: 'DR internacional §3.2', confianza: 'alta' },
    ],
    porque: 'Aquí el objetivo es lo contrario: SECAR el cuello y las capas de afuera. Si las cura húmedas, se pudren.',
  },
};

/**
 * Daño por frío en tropicales: NO refrigerar por debajo de su umbral o se
 * manchan y no maduran. Confianza ALTA/MEDIA (FAO/WFLO).
 */
export const DANIO_POR_FRIO = [
  { producto: 'Plátano verde', minC: 12, nota: 'Por debajo de ~12–13 °C se mancha y no madura.' },
  { producto: 'Mango', minC: 10, nota: 'Guárdelo a 7–12 °C, no más frío.' },
  { producto: 'Aguacate', minC: 7, nota: 'Rango 7–12 °C; el frío extremo lo daña.' },
  { producto: 'Batata/camote', minC: 12.5, nota: 'No la meta a la nevera: se daña por frío.' },
];

/* ═══════════════════ 4. TRANSFORMACIÓN — punto crítico de inocuidad ═════════
 * Cada línea conserva el excedente, pero cada una tiene UN punto crítico que
 * casi siempre es calor + limpieza + empaque sellado.
 * ────────────────────────────────────────────────────────────────────────── */

export const TRANSFORMACIONES = [
  {
    id: 'deshidratados',
    titulo: 'Deshidratados / secado solar',
    resumen: 'Quitar el agua frena hongos y bacterias. Vida de anaquel de meses a temperatura ambiente.',
    puntoCritico: 'Secar bien (humedad residual baja) y empacar sellado. El secador solar tapa del polvo y los insectos.',
    dato: 'En un estudio colombiano de secado solar: tomate ~106 días, mango ~109 días, zanahoria ~174 días de vida útil.',
    fuente: 'DR nacional §5.1',
    confianza: 'media',
  },
  {
    id: 'mermeladas',
    titulo: 'Mermeladas y conservas',
    resumen: 'Azúcar + acidez + cocción + envase esterilizado conservan la fruta por meses.',
    puntoCritico: 'Envase y tapa esterilizados, sellado en caliente y buena acidez. Frasco mal sellado = riesgo.',
    dato: 'Ruta accesible para el excedente frutícola y negocio rural viable.',
    fuente: 'DR nacional §5.2; FAO x5029s',
    confianza: 'media',
  },
  {
    id: 'harinas',
    titulo: 'Harinas (yuca, plátano, maíz)',
    resumen: 'Deshidratar y moler rescata raíces que se perderían en 2–3 días y les da larga vida.',
    puntoCritico: 'Secado completo antes de moler y empaque seco y sellado; si queda humedad, se enmohece.',
    dato: 'Producto de larga vida y mayor valor que la raíz fresca.',
    fuente: 'DR nacional §5.3',
    confianza: 'media',
  },
  {
    id: 'panela',
    titulo: 'Panela',
    resumen: 'Producto insignia campesino andino. Hornillas ecoeficientes tipo CIMPA mejoran combustión y calidad.',
    puntoCritico: 'Agua potable en el trapiche, tanque tapado y limpio, buenas prácticas. Ley 2005 de 2019 prohíbe adulterantes.',
    dato: 'Tecnología propia de AGROSAVIA (CIMPA).',
    fuente: 'DR nacional §5.4',
    confianza: 'media-alta',
  },
  {
    id: 'queso',
    titulo: 'Quesos',
    resumen: 'Valor agregado alto, pero SENSIBLE en inocuidad. El queso de leche cruda es de alto riesgo.',
    // Único mensaje en tono firme, no opcional (DR §5.5 / hallazgo 9).
    puntoCritico: 'PASTEURICE la leche sí o sí: 63 °C por 30 minutos (o 72 °C por 15 segundos). Manos, utensilios y agua limpios.',
    dato: 'Reduce E. coli y otros patógenos. Decreto 616 de 2006.',
    fuente: 'DR nacional §5.5',
    confianza: 'alta',
    critico: true,
  },
  {
    id: 'cafe',
    titulo: 'Café',
    resumen: 'Antes de tostar, el secado del pergamino manda: 10–12 % de humedad, sin pasarse de seco.',
    puntoCritico: 'Voltear al sol para evitar el hongo de la Ocratoxina A. Guardar < 20 °C, HR < 75 %, protegido de la luz.',
    dato: 'Así conserva calidad hasta ~10 meses.',
    fuente: 'DR nacional §5.6',
    confianza: 'media-alta',
  },
];

/* ═══════════════════ 4b. ÍNDICES DE MADUREZ — cuándo cosechar ═══════════════
 * El índice de cosecha dice CUÁNDO recolectar para máxima vida útil y calidad.
 * Se lee con los ojos (color), la mano (firmeza) y el calendario (días desde la
 * flor); con equipo, con Brix o materia seca. Verde de más = sin sabor; maduro
 * de más = poca vida y golpe en el transporte. Grounded al DR nacional §2.
 * `foto` = slug en /public/poscosecha (ver creditos.json).
 * ────────────────────────────────────────────────────────────────────────── */
export const INDICES_MADUREZ = [
  {
    id: 'aguacate',
    cultivo: 'Aguacate Hass',
    foto: 'cosecha-aguacate',
    sena: 'Materia seca, no color',
    texto: 'No madura en la planta: se cosecha fisiológicamente maduro (firme) y ablanda después. La seña es el contenido de materia seca.',
    dato: 'Norma internacional ≥ 21 %; para Colombia se propone 23–24 % como punto de cosecha.',
    fuente: 'AGROSAVIA; norma de exportación',
    confianza: 'alta',
  },
  {
    id: 'uchuva',
    cultivo: 'Uchuva',
    foto: 'cosecha-uchuva',
    sena: 'Color del capacho y del fruto',
    texto: 'El punto se lee por el color del capacho (cáliz) y del fruto. La variedad andina llega a ~14,5 °Brix, buenos para consumo y guardado.',
    dato: 'Cáliz que vira de verde a dorado = fruto en su punto.',
    fuente: 'AGROSAVIA',
    confianza: 'media-alta',
  },
  {
    id: 'climatericos',
    cultivo: 'Banano, plátano, mango, tomate, papaya',
    foto: 'cosecha-platano',
    sena: 'Firmes; maduran después',
    texto: 'Se cosechan fisiológicamente maduros pero FIRMES y maduran en poscosecha. Para consumo local puede esperar más color; para transporte largo, coséchelos más verdes.',
    dato: 'Cosechar más verde = más días de viaje sin golpearse.',
    fuente: 'FAO',
    confianza: 'alta',
  },
];

/* ═══════════════════ 4c. PLAGAS DE ALMACÉN — control físico sin veneno ═══════
 * Gorgojos, polillas y escarabajos (más roedores y aves) atacan el grano
 * guardado. En bodega abierta la pérdida puede pasar del 5 % anual; con buen
 * manejo físico se reduce casi a cero, SIN químico de síntesis. DR nacional §4,
 * DR internacional §4.2.
 * ────────────────────────────────────────────────────────────────────────── */
export const PLAGAS_ALMACEN = [
  {
    id: 'limpieza',
    titulo: 'Limpie la bodega antes de llenarla',
    texto: 'Saque los residuos y el grano viejo de la cosecha pasada: ahí se esconde el foco de gorgojo. Recipiente y bodega limpios y secos.',
    tag: 'gratis',
  },
  {
    id: 'hermetico',
    titulo: 'Hermético: mata el gorgojo sin veneno',
    texto: 'Grano seco en silo metálico o bolsa hermética bien cerrada: el aire se acaba, sube el CO₂ y las plagas mueren solas. La bolsa hermética aguanta grano algo húmedo (~21 % por unos 21 días) mientras seca, pero para guardar largo hay que secar a 13–14 % primero.',
    tag: 'sin químico',
  },
  {
    id: 'diatomeas',
    titulo: 'Tierra de diatomeas: polvo que reseca al insecto',
    foto: 'diatomeas',
    texto: 'Es un polvo mineral (conchas fósiles molidas). Al espolvorearlo con el grano raspa y deseca al gorgojo hasta matarlo; es barrera física, no veneno de síntesis. Mézclelo seco y use tapabocas al aplicarlo.',
    tag: 'físico',
  },
  {
    id: 'frio-calor',
    titulo: 'Frío y calor como arma',
    texto: 'El frío frena a los insectos; el sol y el calor del secado matan huevos y larvas. Vigile los "focos calientes" en el montón: calor donde no debe = insecto activo comiendo.',
    tag: 'físico',
  },
];

/* ═══════════════════ 4d. MICOTOXINAS — el peligro invisible (SALUD) ══════════
 * Venenos que producen ciertos hongos en el grano/fruto mal secado o guardado
 * húmedo. NO se ven a simple vista, NO se quitan lavando y RESISTEN la cocción.
 * Riesgo real de salud (hígado, riñón). La defensa #1 es SECAR y guardar seco;
 * el grano con moho se DESCARTA, no se lava ni se cocina. DR internacional §4.1
 * (aflatoxina/Aspergillus flavus), DR nacional §4/§5.6 (ocratoxina/café).
 * ────────────────────────────────────────────────────────────────────────── */

/** Mensaje transversal de salud — el mismo para todas las micotoxinas. */
export const MICOTOXINAS_ADVERTENCIA =
  'Las micotoxinas no se ven, no se sienten en el sabor, no se quitan lavando y resisten la cocción. El grano o la mazorca con moho se descartan; no se lavan ni se dan a los animales.';

export const MICOTOXINAS = [
  {
    id: 'aflatoxina',
    nombre: 'Aflatoxina',
    foto: 'moho-maiz',
    hongo: 'Aspergillus flavus',
    donde: 'Maíz, maní y granos guardados húmedos o mohosos.',
    peligro: 'Es de las más tóxicas: daña el hígado y es cancerígena. Peligrosa para la familia y para los animales de la finca.',
    prevencion: 'Secar a menos de 13 % ANTES de guardar y mantener seco y hermético. Por debajo de 13 % el moho casi no crece.',
    fuente: 'FAO; DR internacional §4.1',
    confianza: 'alta',
  },
  {
    id: 'ocratoxina',
    nombre: 'Ocratoxina A',
    hongo: 'Aspergillus / Penicillium',
    donde: 'Café mal secado y granos guardados húmedos.',
    peligro: 'Daña el riñón. En el café castiga la calidad y la salud.',
    prevencion: 'Secar el café a 10–12 %, voltearlo al sol para que seque parejo, y guardar por debajo de 20 °C, con humedad ambiente baja (< 75 %) y sin luz.',
    fuente: 'Cenicafé; DR nacional §5.6',
    confianza: 'media-alta',
  },
  {
    id: 'fumonisina',
    nombre: 'Fumonisina',
    hongo: 'Fusarium verticillioides',
    donde: 'Maíz con pudrición de la mazorca (grano rosado/rojizo).',
    peligro: 'Se asocia a daños en salud humana y animal; es otro riesgo del maíz mal manejado.',
    prevencion: 'Cosechar sano, secar rápido, descartar mazorcas podridas y guardar seco. No mezclar mazorca dañada con la sana.',
    fuente: 'FAO; DR internacional §4.1',
    confianza: 'media',
  },
];

/* ═══════════════════ 4e. CADENA DE FRÍO CASERA — enfriar sin nevera ══════════
 * Enfriar rápido tras la cosecha y mantenerlo frío alarga mucho la vida de
 * frutas y hortalizas. Sin cuarto frío hay opciones de bajo costo. DR nacional
 * §3.4, DR internacional §4.3 (cámara evaporativa / ZECC).
 * ────────────────────────────────────────────────────────────────────────── */
export const CADENA_FRIO = [
  {
    id: 'preenfriado',
    titulo: 'Coseche fresco y quite el calor de campo',
    texto: 'Recolecte en las horas frescas (mañana), saque del sol de inmediato y acopie en sombra ventilada. El calor del campo es el primer enemigo: cada hora al sol le quita días de vida.',
    tag: 'gratis',
  },
  {
    id: 'aire',
    titulo: 'Aire forzado con ventilador',
    texto: 'Un ventilador moviendo aire en la bodega baja la temperatura del producto de forma barata. Para hortalizas de hoja, humedezca un poco el ambiente para que no se marchiten.',
    tag: 'barato',
  },
  {
    id: 'evaporativa',
    titulo: 'Cámara evaporativa (olla de barro / muro de arena húmeda)',
    foto: 'frio-olla',
    texto: 'Sin electricidad, solo con agua y barro o arena húmeda, se logran ~15–18 °C y 90–95 % de humedad por evaporación. Una olla de barro con arena mojada alrededor, o un doble muro de ladrillo con arena húmeda en medio, funcionan como nevera de pobre.',
    tag: 'sin luz',
  },
];

/**
 * Extensión de vida útil en cámara evaporativa vs. ambiente (estudio único,
 * depende de clima y variedad). Sirve en clima seco-caliente y es para guardar
 * POCOS días, no meses. DR internacional §4.3 (ZECC).
 */
export const CAMARA_EVAPORATIVA_VIDA = [
  { producto: 'Tomate', conCamara: 21, ambiente: 6 },
  { producto: 'Zanahoria', conCamara: 28, ambiente: 8 },
  { producto: 'Banano', conCamara: 17, ambiente: 5 },
  { producto: 'Mango', conCamara: 14, ambiente: 5 },
];
export const CAMARA_EVAPORATIVA_NOTA =
  'Rinde mejor en clima seco y caliente (en aire húmedo enfría poco) y es para guardar unos días, no para almacenar meses.';
export const CAMARA_EVAPORATIVA_FUENTE = 'DR internacional §4.3 (Zero-Energy Cool Chamber) · confianza media';

/* ═══════════════════ 5. MAGNITUD DEL PROBLEMA (gancho) ══════════════════════ */

/** Cifras de pérdida país (DNP, año base 2016). Confianza ALTA por triangulación. */
export const PERDIDA_PAIS = {
  toneladasMt: 9.76,
  porcentajeOferta: 34,
  porcentajePoscosecha: 19.8, // eslabón poscosecha y almacenamiento
  frutasHortalizasPorc: 62,
  raicesTuberculosPorc: 25,
  fuente: 'DNP (año base 2016); DR nacional §1',
  confianza: 'alta',
};

/* ────────────────────────────── utilidades ──────────────────────────────── */

/** Convierte a número aceptando coma decimal; null si no es finito. */
function num(s) {
  if (s === '' || s == null) return null;
  const n = Number.parseFloat(String(s).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Redondeo estable a n decimales. */
function redondear(x, n) {
  const f = 10 ** n;
  return Math.round(x * f) / f;
}
