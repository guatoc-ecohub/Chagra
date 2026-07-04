/**
 * semillaCalculator — calculadoras DETERMINISTAS de soberanía de semilla, para
 * la mini-app "Semilla" (mundo Cultivos y semillas). Tres pilares:
 *
 *   1. SELECCIONAR — nº mínimo de plantas madre por sistema reproductivo
 *      (maíz alógamo ≥100/óptimo 200; fríjol autógamo ≥10) + depuración de
 *      atípicas (roguing, 10–15 %).
 *   2. GUARDAR — la rama decisiva ORTODOXA vs RECALCITRANTE (nunca "seca y
 *      guarda" a cacao/café/aguacate) + reglas de Harrington (−1 % humedad o
 *      −5 °C ⇒ el DOBLE de vida; °F + %HR < 100) + dosis anti-gorgojo.
 *   3. GERMINAR — % de la prueba casera (rag-doll) y ajuste de densidad de
 *      siembra por viabilidad (a menos germinación, más semilla).
 *
 * Filosofía (inviolable, igual que encaladoCalculator.js / aguaCalculos.js):
 *   - La MATEMÁTICA es determinista y estándar. Se calcula, no se inventa.
 *   - Las cifras de campo salen del grounding (DR-SEMILLA 2026-07-04: Grupo
 *     Semillas / Red de Semillas Libres / SwissAid / AGROSAVIA / FAO / Seed
 *     Savers Exchange). Lo que depende de cultivo/región y aún no está anclado
 *     se marca SLOT GROUNDED-PENDIENTE, con un valor de referencia documentado.
 *   - Nada de esto reemplaza el criterio de un custodio de semillas ni un
 *     análisis ISTA: es una guía orientadora para el cuaderno de campo.
 */

/* ═══════════════════════════ 1. SELECCIONAR ═══════════════════════════════ */

/**
 * Sistema reproductivo → sensibilidad a la endogamia y regla general de
 * población mínima. Confianza alta (Grupo Semillas; Learn Seed Saving; SSE).
 */
export const SISTEMAS_REPRODUCTIVOS = {
  cruzada: {
    label: 'Polinización cruzada (alógama)',
    resumen: 'Se cruza con otras plantas (viento o insectos). Necesita MUCHAS plantas madre para no perder vigor por endogamia.',
    reglaGeneral: '≥ 100 plantas (maíz, el caso extremo, ≥ 200)',
  },
  auto: {
    label: 'Autopolinización (autógama)',
    resumen: 'Se poliniza dentro de su propia flor. Tolera la endogamia y se mantiene con pocas plantas.',
    reglaGeneral: '≥ 10 para mantener; ≥ 20 para preservar diversidad',
  },
};

/**
 * Catálogo de cultivos con su sistema reproductivo y el nº mínimo/óptimo de
 * plantas madre. Cifras del grounding (Grupo Semillas cartilla; SSE), confianza
 * alta. `min` = piso para no degradar la variedad; `optimo` = meta recomendada.
 * Nota honesta: el pepino/melón se CRUZAN, pero la cartilla colombiana los lista
 * con un mínimo de 20; se conserva esa cifra y se marca el matiz.
 */
export const CULTIVOS_SEMILLA = [
  { id: 'maiz', nombre: 'Maíz', sistema: 'cruzada', min: 100, optimo: 200, fuente: 'Grupo Semillas; Seed Savers Exchange' },
  { id: 'frijol', nombre: 'Fríjol', sistema: 'auto', min: 10, optimo: 20, fuente: 'Grupo Semillas; Learn Seed Saving' },
  { id: 'tomate', nombre: 'Tomate', sistema: 'auto', min: 20, optimo: 20, fuente: 'Grupo Semillas' },
  { id: 'pepino', nombre: 'Pepino / melón', sistema: 'cruzada', min: 20, optimo: 20, fuente: 'Grupo Semillas', nota: 'se cruza; la cartilla lista mínimo 20' },
  { id: 'zanahoria', nombre: 'Zanahoria', sistema: 'cruzada', min: 100, optimo: 100, fuente: 'Grupo Semillas' },
  { id: 'cebolla', nombre: 'Cebolla', sistema: 'cruzada', min: 50, optimo: 50, fuente: 'Grupo Semillas' },
  { id: 'cilantro', nombre: 'Cilantro', sistema: 'cruzada', min: 50, optimo: 50, fuente: 'Grupo Semillas' },
  { id: 'coles', nombre: 'Brócoli / repollo', sistema: 'cruzada', min: 50, optimo: 50, fuente: 'Grupo Semillas', nota: 'todas las coles se cruzan entre sí' },
];

/** Mapa id → cultivo. */
const CULTIVO_BY_ID = Object.fromEntries(CULTIVOS_SEMILLA.map((c) => [c.id, c]));

/** Resuelve un cultivo del catálogo por id (null si no existe). */
export function getCultivoSemilla(id) {
  return CULTIVO_BY_ID[id] || null;
}

/**
 * Rango de depuración de atípicas (roguing / selección negativa): quitar del
 * lote las plantas "fuera de tipo", enfermas o débiles ANTES de la floración.
 * GROUNDED: 10–15 % (AGROSAVIA maíz Simijaca). No inventado.
 */
export const ROGUING_PCT = { min: 10, max: 15 };

/**
 * Nº de plantas a depurar por roguing en una población dada.
 * @param {number} poblacion  plantas del lote candidatas a semilla
 * @returns {{ min: number, max: number }} plantas a eliminar (redondeo hacia arriba)
 */
export function roguingRango(poblacion) {
  const p = Math.max(0, Number(poblacion) || 0);
  return {
    min: Math.ceil((p * ROGUING_PCT.min) / 100),
    max: Math.ceil((p * ROGUING_PCT.max) / 100),
  };
}

/**
 * Evalúa la selección: dado el cultivo y las plantas disponibles, dice si
 * alcanzan para conservar la variedad tras depurar las atípicas.
 *
 * @param {string} cultivoId
 * @param {number} plantasDisponibles
 * @returns {null | {
 *   cultivo: object,
 *   min: number, optimo: number,
 *   roguing: { min: number, max: number },
 *   disponiblesTrasRoguing: number,
 *   suficiente: boolean,
 *   faltan: number,
 *   nivel: 'ok'|'justo'|'insuficiente',
 * }}
 */
export function evaluarSeleccion(cultivoId, plantasDisponibles) {
  const cultivo = getCultivoSemilla(cultivoId);
  if (!cultivo) return null;
  const disp = Math.max(0, Number(plantasDisponibles) || 0);
  const roguing = roguingRango(disp);
  const disponiblesTrasRoguing = Math.max(0, disp - roguing.max);
  const suficiente = disponiblesTrasRoguing >= cultivo.min;
  const alcanzaOptimo = disponiblesTrasRoguing >= cultivo.optimo;
  const faltan = suficiente ? 0 : cultivo.min - disponiblesTrasRoguing;
  const nivel = alcanzaOptimo ? 'ok' : suficiente ? 'justo' : 'insuficiente';
  return {
    cultivo,
    min: cultivo.min,
    optimo: cultivo.optimo,
    roguing,
    disponiblesTrasRoguing,
    suficiente,
    faltan,
    nivel,
  };
}

/* ═══════════════════════════ 2. GUARDAR ═══════════════════════════════════ */

/**
 * Especies RECALCITRANTES relevantes para el trópico colombiano: NO toleran el
 * secado bajo ~20–50 % de humedad; mueren si se guardan como el fríjol. Se
 * siembran frescas. GROUNDED alta (FAO cap.7; UCR Morera et al.).
 */
export const RECALCITRANTES = [
  { nombre: 'Cacao', claves: ['cacao'] },
  { nombre: 'Café', claves: ['café', 'cafe'] },
  { nombre: 'Aguacate', claves: ['aguacate', 'palta'] },
  { nombre: 'Chontaduro', claves: ['chontaduro', 'pejibaye', 'pejiballe'] },
  { nombre: 'Guanábana', claves: ['guanábana', 'guanabana'] },
  { nombre: 'Guayaba', claves: ['guayaba'] },
  { nombre: 'Cítricos', claves: ['cítrico', 'citrico', 'naranja', 'limón', 'limon', 'mandarina', 'lima'], nota: 'algunas semillas de cítricos sí son ortodoxas' },
  { nombre: 'Mango', claves: ['mango'] },
];

/**
 * Especies ORTODOXAS comunes: toleran secarse a ~5 % y guardarse en frío. Se
 * pueden banquear por años. GROUNDED alta (FAO; CPC).
 */
export const ORTODOXAS = [
  { nombre: 'Maíz', claves: ['maíz', 'maiz'] },
  { nombre: 'Fríjol', claves: ['fríjol', 'frijol', 'frijoles'] },
  { nombre: 'Arroz', claves: ['arroz'] },
  { nombre: 'Tomate', claves: ['tomate'] },
  { nombre: 'Ají / pimentón', claves: ['ají', 'aji', 'pimentón', 'pimenton', 'chile'] },
  { nombre: 'Zapallo / calabaza', claves: ['zapallo', 'calabaza', 'ahuyama', 'auyama'] },
  { nombre: 'Cebolla', claves: ['cebolla'] },
  { nombre: 'Zanahoria', claves: ['zanahoria'] },
  { nombre: 'Lechuga', claves: ['lechuga'] },
  { nombre: 'Coles', claves: ['brócoli', 'brocoli', 'repollo', 'coliflor', 'col'] },
  { nombre: 'Cilantro', claves: ['cilantro'] },
  { nombre: 'Arveja', claves: ['arveja', 'chícharo', 'chicharo'] },
];

/** Normaliza para comparar sin tildes ni mayúsculas. */
function normalizar(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/**
 * Clasifica el comportamiento de conservación de una semilla por su nombre.
 * La RAMA DECISIVA del guardado: al recalcitrante NO se le dice "seca y guarda".
 *
 * @param {string} nombre  nombre común de la especie
 * @returns {{ tipo: 'recalcitrante'|'ortodoxa'|'desconocida', nombre: string|null, nota?: string }}
 */
export function clasificarConservacion(nombre) {
  const q = normalizar(nombre);
  if (!q) return { tipo: 'desconocida', nombre: null };
  for (const r of RECALCITRANTES) {
    if (r.claves.some((k) => q.includes(normalizar(k)))) {
      return { tipo: 'recalcitrante', nombre: r.nombre, nota: r.nota };
    }
  }
  for (const o of ORTODOXAS) {
    if (o.claves.some((k) => q.includes(normalizar(k)))) {
      return { tipo: 'ortodoxa', nombre: o.nombre };
    }
  }
  return { tipo: 'desconocida', nombre: null };
}

/**
 * Rango válido de las reglas de duplicación de Harrington. Fuera de aquí la
 * regla deja de cumplirse (sobre-secar < ~4–5 % daña la semilla). FAO cap.7.
 */
export const HARRINGTON_RANGO = {
  humedad: { min: 5, max: 14 }, // % contenido de humedad
  temp: { min: 0, max: 50 }, // °C
};

/**
 * Factor de longevidad de Harrington entre dos condiciones de almacenamiento:
 * la vida se DUPLICA por cada −1 % de humedad y por cada −5 °C. Los efectos son
 * independientes y se multiplican. GROUNDED alta (FAO cap.7; Roberts).
 *
 * @param {Object} p
 * @param {number} p.humedadDesde  % humedad de la condición de partida
 * @param {number} p.humedadHasta  % humedad de la condición mejorada
 * @param {number} p.tempDesde     °C de la condición de partida
 * @param {number} p.tempHasta     °C de la condición mejorada
 * @returns {{ factor: number, factorHumedad: number, factorTemp: number, enRango: boolean, avisos: string[] }}
 */
export function factorVidaHarrington({ humedadDesde, humedadHasta, tempDesde, tempHasta }) {
  const hD = Number(humedadDesde);
  const hH = Number(humedadHasta);
  const tD = Number(tempDesde);
  const tH = Number(tempHasta);
  const factorHumedad = 2 ** (hD - hH);
  const factorTemp = 2 ** ((tD - tH) / 5);
  const factor = factorHumedad * factorTemp;

  const avisos = [];
  const dentro = (v, r) => v >= r.min && v <= r.max;
  const enRango =
    dentro(hD, HARRINGTON_RANGO.humedad) && dentro(hH, HARRINGTON_RANGO.humedad) &&
    dentro(tD, HARRINGTON_RANGO.temp) && dentro(tH, HARRINGTON_RANGO.temp);
  if (hH < HARRINGTON_RANGO.humedad.min || hD < HARRINGTON_RANGO.humedad.min) {
    avisos.push('Cuidado con sobre-secar por debajo de ~5 % de humedad: la regla deja de cumplirse y la semilla se puede dañar.');
  }
  if (!enRango) {
    avisos.push('Alguna condición está fuera del rango donde la regla es válida (humedad 5–14 %, temperatura 0–50 °C). Tome el resultado solo como orientación.');
  }
  return {
    factor: redondear(factor, 2),
    factorHumedad: redondear(factorHumedad, 2),
    factorTemp: redondear(factorTemp, 2),
    enRango,
    avisos,
  };
}

/**
 * Regla clásica de Harrington: la suma de temperatura (°F) + humedad relativa
 * (%) del sitio de guardado no debe pasar de 100. GROUNDED alta (FAO cap.7).
 *
 * @param {number} tempC  temperatura del sitio, °C
 * @param {number} humedadRelativa  % humedad relativa del sitio
 * @returns {{ tempF: number, suma: number, cumple: boolean }}
 */
export function reglaSumaHarrington(tempC, humedadRelativa) {
  const tempF = Number(tempC) * (9 / 5) + 32;
  const suma = tempF + Number(humedadRelativa);
  return { tempF: redondear(tempF, 1), suma: redondear(suma, 1), cumple: suma < 100 };
}

/**
 * Dosis de aceite vegetal para proteger grano guardado del gorgojo, sin
 * químicos. GROUNDED alta (FAO poscosecha): 2–7 ml por kg de grano; protege
 * 4–5 meses.
 * @param {number} kgGrano
 * @returns {{ min: number, max: number, meses: string }} ml de aceite
 */
export function aceiteAntigorgojo(kgGrano) {
  const kg = Math.max(0, Number(kgGrano) || 0);
  return { min: redondear(kg * 2, 1), max: redondear(kg * 7, 1), meses: '4–5' };
}

/* ═══════════════════════════ 3. GERMINAR ══════════════════════════════════ */

/**
 * Umbrales de la prueba de germinación casera (rag-doll). GROUNDED alta
 * (Grupo Semillas pág.30 ≥70 % bueno; AGROSAVIA/FAO calidad; COMO Seed Library).
 */
export const UMBRAL_GERMINACION = { buena: 70, descartar: 50 };

/**
 * % de germinación de la prueba casera.
 * @param {number} germinadas  semillas que germinaron
 * @param {number} total  semillas puestas a prueba (típico 100 ó 10)
 * @returns {number|null} porcentaje 0–100, o null si total ≤ 0
 */
export function porcentajeGerminacion(germinadas, total) {
  const g = Math.max(0, Number(germinadas) || 0);
  const t = Number(total) || 0;
  if (t <= 0) return null;
  return redondear(Math.min(g, t) / t * 100, 0);
}

/**
 * Interpreta el % de germinación en una decisión de campo honesta.
 * ≥70 % buena (siembra normal) · 50–<70 % usar más semilla · <50 % descartar.
 * @param {number|null} pct
 * @returns {{ nivel: 'buena'|'tupido'|'descartar'|'sin_datos', label: string, accion: string, color: string }}
 */
export function interpretarGerminacion(pct) {
  if (pct == null || Number.isNaN(pct)) {
    return { nivel: 'sin_datos', label: 'Sin datos', accion: 'Haga la prueba con 100 semillas.', color: 'slate' };
  }
  if (pct >= UMBRAL_GERMINACION.buena) {
    return { nivel: 'buena', label: 'Semilla buena', accion: 'Siembre con su densidad normal.', color: 'emerald' };
  }
  if (pct >= UMBRAL_GERMINACION.descartar) {
    return { nivel: 'tupido', label: 'Sirve, pero floja', accion: 'Siembre más tupido para compensar las que no nacen.', color: 'amber' };
  }
  return { nivel: 'descartar', label: 'Muy baja', accion: 'Descarte el lote o consiga semilla nueva: no rinde.', color: 'rose' };
}

/**
 * Ajuste de densidad de siembra por viabilidad (relación INVERSA: a menos
 * germinación, más semilla). Basado en el "valor cultural" = pureza × poder
 * germinativo / 100 (infoagro; FAO x8234s). El factor multiplica la densidad
 * de referencia para compensar la semilla que no nace.
 *
 * @param {number} germinacionPct  % de germinación (0–100)
 * @param {number} [purezaPct=100]  % de pureza física del lote
 * @returns {null | { valorCultural: number, factor: number }}
 */
export function ajusteDensidad(germinacionPct, purezaPct = 100) {
  const g = Number(germinacionPct);
  const p = Number(purezaPct);
  if (!(g > 0) || !(p > 0)) return null;
  const valorCultural = (p * g) / 100;
  if (valorCultural <= 0) return null;
  const factor = 100 / valorCultural;
  return { valorCultural: redondear(valorCultural, 1), factor: redondear(factor, 2) };
}

/* ─────────────────────────────── util ────────────────────────────────────── */

/** Redondeo estable a n decimales. */
function redondear(x, n) {
  const f = 10 ** n;
  return Math.round(x * f) / f;
}
