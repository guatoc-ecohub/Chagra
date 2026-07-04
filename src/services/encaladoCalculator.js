/**
 * encaladoCalculator — calculadora DETERMINISTA de encalado a partir de la
 * saturación de aluminio, para el módulo "Salud del Suelo" (Cuaderno del Suelo).
 *
 * Filosofía (inviolable, alineada con soilDiagnostic.js):
 *   - La MATEMÁTICA es determinista y estándar (Cochrane/Salinas/Sánchez 1980;
 *     Kamprath 1970). Se calcula, no se inventa.
 *   - Los FACTORES exactos que dependen de la zona/suelo/producto (densidad
 *     aparente, profundidad, PRNT de la cal, saturación objetivo) NO se
 *     inventan: son SLOTS GROUNDED-PENDIENTE con un valor por defecto documentado
 *     y una fuente pendiente de anclar por región (DR-SUELOS-ENCALADO).
 *   - Nunca se recomienda encalar si la saturación de Al no lo justifica.
 *
 * NO reemplaza un análisis de laboratorio ni la recomendación de un ingeniero
 * agrónomo: es una estimación orientadora para el cuaderno de campo.
 */

/* ─────────────────────────── SLOTS GROUNDED-PENDIENTE ───────────────────────
 * Estos factores tienen valor por defecto estándar de literatura, PERO el valor
 * exacto por REGIÓN/PRODUCTO debe anclarse a fuente (DR-SUELOS-ENCALADO). No se
 * "inventan" cifras finas; se usa el estándar y se marca la incertidumbre.
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Coeficiente de la fórmula de Cochrane, Salinas & Sánchez (1980).
 *
 * GROUNDED (corrección aplicada — grounding 2026-07): verificado carácter por
 * carácter contra el texto primario AGROSAVIA. El coeficiente de la fórmula
 * "método por saturación de aluminio" es 1,8, no 1,5 (ese 1,5 corresponde a la
 * variante distinta "método combinado Al + calidad del encalante", que además
 * multiplica por un factor F de calidad del encalante). Como esta calculadora
 * ya ajusta la dosis por el PRNT de la fuente elegida (equivalente a ese factor
 * F), se usa el coeficiente de la fórmula pura de Cochrane:
 *
 *   CaCO₃ (t/ha) = 1,8 × (Al − PSAl) × CICE / 100
 *
 * Fuente: AGROSAVIA — Boletín técnico acidez y encalado (banano, Urabá; base
 * Espinosa & Molina/INPOFOS 1999; fórmula Cochrane, Salinas & Sánchez 1980).
 * deepresearch/2026-07-03-suelo-salud-nacional-CO.md §3.3. Confianza: alta.
 */
export const COEF_COCHRANE_DEFAULT = 1.8;

/**
 * Saturación de aluminio OBJETIVO (%) tras el encalado. Se baja el Al hasta un
 * nivel tolerable por el cultivo, NO a cero (encalar de más bloquea P, Zn, B).
 * GROUNDED-PENDIENTE: no existe un umbral único verificado para "cualquier
 * cultivo". El DR (§3.2) solo verificó un umbral crop-specific citable: banano
 * 5 % (inicio de manejo) a 10 % (tope operativo), AGROSAVIA, confianza alta. El
 * umbral genérico ~60 % que circula en la web NO se pudo verificar en fuente
 * primaria (falla SSL) y el propio DR advierte no usarlo como "universal".
 * Hasta que la calculadora tenga selector de cultivo, se mantiene 25 % como
 * valor conservador de referencia general — deliberadamente pendiente por
 * cultivo (no se inventa un umbral universal).
 */
export const SATURACION_AL_OBJETIVO_DEFAULT = 25;

/**
 * Factor de conversión de cmol(+)/kg de requerimiento a toneladas/ha de CaCO₃
 * PURO, para una capa de 20 cm. Se deriva de: 1 cmol(+)/kg = 0.5 g CaCO₃/kg de
 * suelo, y una masa de suelo de ~2.4×10⁶ kg/ha (20 cm, densidad aparente
 * 1.2 g/cm³) ⇒ ~1.2 t/ha por cada cmol(+)/kg.
 * GROUNDED-PENDIENTE: la densidad aparente y la profundidad efectiva REALES de
 * la zona cambian este factor; anclar por región (andisoles ~0.9 g/cm³ dan un
 * factor menor). Rango típico 1.0–1.5.
 */
export const FACTOR_THA_POR_CMOL_20CM_DEFAULT = 1.2;

/**
 * Catálogo de fuentes de cal con su PRNT (Poder Relativo de Neutralización
 * Total, % equivalente a CaCO₃ puro). Baja el requerimiento efectivo: si la cal
 * neutraliza menos, hay que aplicar más.
 *
 * Contexto groundeado (AGROSAVIA, DR suelo §3.4 — tabla de Equivalente Químico
 * ECC, no confundir con PRNT): calcítica 85–100 %, dolomítica 95–108 % (aporta
 * 21,6 % Ca + 13,1 % Mg), hidróxido de calcio 120–135 %, óxido de calcio (cal
 * viva) 150–175 %. El PRNT real = ECC × eficiencia granulométrica / 100 (ej.
 * verificado: ECC 90 % × EG 80 % = PRNT 72 %) — SIEMPRE menor que el ECC puro.
 * GROUNDED-PENDIENTE: el PRNT REAL depende del proveedor, el lote y la
 * granulometría; el usuario debe leerlo en la ficha del producto. Los valores
 * de abajo son de referencia típica (compatibles con el rango ECC de AGROSAVIA
 * una vez descontada la eficiencia granulométrica), no el PRNT exacto de un
 * producto concreto.
 */
export const FUENTES_CAL = {
  cal_dolomita: { label: 'Cal dolomita', prnt: 95, aporta: 'Ca + Mg', nota: 'Aporta magnesio; buena si el Mg está bajo.' },
  cal_agricola: { label: 'Cal agrícola (calcítica)', prnt: 90, aporta: 'Ca', nota: 'Solo calcio; no corrige déficit de magnesio.' },
  cal_viva:     { label: 'Cal viva (óxido)', prnt: 130, aporta: 'Ca', nota: 'Reacción fuerte y rápida; manéjela con cuidado (cáustica).' },
};

/* ────────────────────────────── DETERMINISTA ─────────────────────────────── */

/**
 * @typedef {Object} BasesSuelo
 * @property {number} al  Aluminio intercambiable (cmol(+)/kg).
 * @property {number} ca  Calcio intercambiable (cmol(+)/kg).
 * @property {number} mg  Magnesio intercambiable (cmol(+)/kg).
 * @property {number} [k] Potasio intercambiable (cmol(+)/kg). Opcional.
 */

/**
 * Capacidad de Intercambio Catiónico Efectiva (CICE) = Al + Ca + Mg + K.
 * Arithmética pura, sin factores inventados.
 * @param {BasesSuelo} b
 * @returns {number} cmol(+)/kg
 */
export function calcularCICE({ al = 0, ca = 0, mg = 0, k = 0 }) {
  return al + ca + mg + k;
}

/**
 * Saturación de aluminio (%) = Al / CICE × 100. Es el indicador clave de acidez
 * intercambiable. Arithmética pura.
 * @param {BasesSuelo} b
 * @returns {number|null} porcentaje 0–100, o null si CICE = 0
 */
export function calcularSaturacionAluminio(b) {
  const cice = calcularCICE(b);
  if (cice <= 0) return null;
  return (b.al / cice) * 100;
}

/**
 * Interpreta la saturación de Al en un nivel cualitativo honesto.
 * Umbrales de referencia general (no específicos de cultivo).
 * @param {number|null} satAl
 */
export function interpretarSaturacionAl(satAl) {
  if (satAl == null) return { nivel: 'sin_datos', label: 'Sin datos suficientes', color: 'slate' };
  if (satAl < 10) return { nivel: 'bajo', label: 'Acidez baja — la mayoría de cultivos crecen bien', color: 'emerald' };
  if (satAl < 30) return { nivel: 'moderado', label: 'Acidez moderada — algunos cultivos se afectan', color: 'lime' };
  if (satAl < 60) return { nivel: 'alto', label: 'Acidez alta — conviene corregir', color: 'amber' };
  return { nivel: 'muy_alto', label: 'Acidez muy alta — toxicidad de aluminio probable', color: 'rose' };
}

/**
 * Calcula la dosis de cal por el método de Cochrane, Salinas & Sánchez (1980):
 *
 *   Requerimiento (cmol/kg) = coef × [ Al − (RAS/100) × CICE ]
 *
 * donde RAS = saturación de Al objetivo. Si el corchete ≤ 0, no se requiere cal.
 * Luego convierte a t/ha de CaCO₃ puro y ajusta por el PRNT de la fuente elegida.
 *
 * @param {BasesSuelo} bases
 * @param {Object} [opts]
 * @param {number} [opts.coef]              Coeficiente de Cochrane (GROUNDED-PENDIENTE).
 * @param {number} [opts.saturacionObjetivo] % de Al objetivo (GROUNDED-PENDIENTE).
 * @param {number} [opts.factorTha]         t/ha por cmol/kg (GROUNDED-PENDIENTE, densidad/prof).
 * @param {keyof typeof FUENTES_CAL} [opts.fuente] Fuente de cal (define el PRNT).
 * @returns {{
 *   requerimientoCmol: number,
 *   dosisCaCO3Tha: number,
 *   dosisRealTha: number,
 *   fuente: string,
 *   prnt: number,
 *   necesitaCal: boolean,
 *   supuestos: Object,
 * }}
 */
export function calcularDosisCal(bases, opts = {}) {
  const {
    coef = COEF_COCHRANE_DEFAULT,
    saturacionObjetivo = SATURACION_AL_OBJETIVO_DEFAULT,
    factorTha = FACTOR_THA_POR_CMOL_20CM_DEFAULT,
    fuente = 'cal_dolomita',
  } = opts;

  const cice = calcularCICE(bases);
  const fuenteInfo = FUENTES_CAL[fuente] || FUENTES_CAL.cal_dolomita;
  const prnt = fuenteInfo.prnt;

  // Corchete de Cochrane: exceso de Al sobre el objetivo tolerable.
  const excesoAl = bases.al - (saturacionObjetivo / 100) * cice;
  const requerimientoCmol = Math.max(0, coef * excesoAl);

  const dosisCaCO3Tha = requerimientoCmol * factorTha;
  // Ajuste por calidad de la cal: menos PRNT ⇒ más producto físico.
  const dosisRealTha = prnt > 0 ? dosisCaCO3Tha / (prnt / 100) : dosisCaCO3Tha;

  return {
    requerimientoCmol: redondear(requerimientoCmol, 2),
    dosisCaCO3Tha: redondear(dosisCaCO3Tha, 2),
    dosisRealTha: redondear(dosisRealTha, 2),
    fuente: fuenteInfo.label,
    prnt,
    necesitaCal: requerimientoCmol > 0,
    supuestos: {
      coef,
      saturacionObjetivo,
      factorTha,
      profundidadCm: 20,
      groundedPendiente: [
        'coef (poder tampón por tipo de suelo)',
        'saturacionObjetivo (umbral crítico por cultivo)',
        'factorTha (densidad aparente y profundidad reales de la zona)',
        'prnt (poder de neutralización real del producto/lote)',
      ],
    },
  };
}

/** Redondeo estable a n decimales. */
function redondear(x, n) {
  const f = 10 ** n;
  return Math.round(x * f) / f;
}

/**
 * Guardas de seguridad para la recomendación de encalado (alineadas con las de
 * soilDiagnostic.js). Devuelve advertencias según el contexto.
 * @param {BasesSuelo} bases
 * @param {number|null} satAl
 * @returns {string[]}
 */
export function guardasEncalado(bases, satAl) {
  const avisos = [];
  if (satAl != null && satAl < 10) {
    avisos.push('La saturación de aluminio es baja: encalar aquí puede hacer más mal que bien (bloquea fósforo, zinc y boro). Confirme con un análisis antes de aplicar cal.');
  }
  if (bases.mg != null && bases.ca != null && bases.mg > 0 && bases.ca / bases.mg > 5) {
    avisos.push('El calcio está muy por encima del magnesio: prefiera cal dolomita para no desbalancear aún más el magnesio.');
  }
  avisos.push('No mezcle la cal con urea ni estiércol fresco en la misma aplicación: se pierde nitrógeno como amoníaco. Deje pasar 2–4 semanas.');
  avisos.push('Aplique en dos pasadas si la dosis es alta (> 2 t/ha) e incorpore bien: la cal se mueve muy poco en el suelo.');
  return avisos;
}
