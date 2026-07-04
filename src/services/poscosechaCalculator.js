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
 * @param {number|string} p.pesoInicial      Peso mojado del lote (misma unidad de salida). Acepta coma decimal.
 * @param {number|string} p.humedadInicial   Humedad actual del grano (% base húmeda). Acepta coma decimal.
 * @param {number|string} p.humedadObjetivo  Humedad segura de guardado (% base húmeda). Acepta coma decimal.
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
 * @param {number|string|null} materiaSecaPorc  % de materia seca medido. Acepta coma decimal.
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
