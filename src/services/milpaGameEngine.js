/**
 * milpaGameEngine — lógica PURA del subjuego "La Milpa" (las tres hermanas).
 *
 * Sin React, sin DOM, sin red: solo funciones deterministas y testeables que
 * modelan las relaciones agroecológicas REALES de la milpa colombiana (maíz +
 * fríjol + ahuyama/calabaza). El componente de UI dibuja; este módulo decide.
 *
 * Las relaciones reflejan ASOCIA_CON / COMPATIBLE_WITH del grafo de Chagra y
 * las cifras vienen de src/data/asociaciones-comparativa.json (milpa real):
 *   - LER aprox. 2 (1.08–2.89): la milpa usa mejor la tierra.
 *   - N fijado por el fríjol 12–60 %.
 *   - Cobertura de la ahuyama reduce arvenses 24–55 %.
 *   - Diversidad baja la presión de plaga (control_plaga ~23 %).
 * Fuentes: DR-ASOCIACIONES-CULTIVO-COLOMBIA-2026-06-18; DOI 10.1093/aob/mcu191;
 * DOI 10.3389/fagro.2023.1115490.
 *
 * Las tres relaciones de las hermanas (agronómicamente correctas):
 *   1. El fríjol (leguminosa) FIJA NITRÓGENO con sus rizobios → alimenta al maíz.
 *   2. El maíz da SOPORTE vertical → el fríjol trepa por la caña.
 *   3. La ahuyama CUBRE EL SUELO → sombra, menos arvenses, retiene humedad.
 *
 * Offline-safe: cero red. Todo cálculo es local y determinista (sin Math.random
 * en la lógica de puntaje; los eventos reciben su resultado por parámetro para
 * ser 100 % testeables).
 */

/** Identificadores estables de las tres hermanas. */
export const HERMANAS = Object.freeze({
  MAIZ: 'maiz',
  FRIJOL: 'frijol',
  AHUYAMA: 'ahuyama',
});

/** Salud máxima de una parcela (0–100). */
export const SALUD_MAX = 100;

/**
 * Una parcela vacía lista para sembrar.
 * @param {string} id  Identificador de la parcela.
 * @returns {{ id: string, cultivos: string[] }}
 */
export function crearParcela(id) {
  return { id, cultivos: [] };
}

/**
 * Siembra (o quita) un cultivo en una parcela. Toggle: si ya está, lo retira.
 * Una parcela admite a lo sumo las tres hermanas, una vez cada una.
 *
 * @param {{ id: string, cultivos: string[] }} parcela
 * @param {string} cultivoId  Una de HERMANAS.
 * @returns {{ id: string, cultivos: string[] }} nueva parcela (inmutable)
 */
export function sembrarEnParcela(parcela, cultivoId) {
  const valido = Object.values(HERMANAS).includes(cultivoId);
  if (!valido) return parcela;
  const tiene = parcela.cultivos.includes(cultivoId);
  const cultivos = tiene
    ? parcela.cultivos.filter((c) => c !== cultivoId)
    : [...parcela.cultivos, cultivoId];
  return { ...parcela, cultivos };
}

/**
 * ¿La parcela es una milpa completa (las tres hermanas juntas)?
 * @param {{ cultivos: string[] }} parcela
 * @returns {boolean}
 */
export function esMilpaCompleta(parcela) {
  const c = parcela.cultivos;
  return (
    c.includes(HERMANAS.MAIZ) &&
    c.includes(HERMANAS.FRIJOL) &&
    c.includes(HERMANAS.AHUYAMA)
  );
}

/**
 * Cuenta cuántas hermanas distintas hay en una parcela (0–3) = su diversidad.
 * @param {{ cultivos: string[] }} parcela
 * @returns {number}
 */
export function diversidadParcela(parcela) {
  const set = new Set(parcela.cultivos.filter((c) => Object.values(HERMANAS).includes(c)));
  return set.size;
}

/**
 * Nitrógeno fijado por la parcela, en %, según el principio real:
 * solo el FRÍJOL fija N (rizobios). El maíz y la ahuyama no fijan.
 * Rango grounded: 0 sin fríjol; ~12 % fríjol solo; hasta ~60 % cuando el fríjol
 * convive con el maíz que demanda y aprovecha ese N (milpa).
 *
 * @param {{ cultivos: string[] }} parcela
 * @returns {number} % de N fijado aportado al sistema (0, 12 o 60)
 */
export function nitrogenoFijado(parcela) {
  const hayFrijol = parcela.cultivos.includes(HERMANAS.FRIJOL);
  if (!hayFrijol) return 0;
  const hayMaiz = parcela.cultivos.includes(HERMANAS.MAIZ);
  // Con maíz que aprovecha el N, el aporte efectivo al sistema es mayor.
  return hayMaiz ? 60 : 12;
}

/**
 * Cobertura del suelo (%), por la ahuyama (calabaza) que tapa el suelo.
 * Sin ahuyama no hay cobertura; con ahuyama reduce arvenses 24–55 %, mejor aún
 * si convive con maíz/fríjol que cierran el dosel.
 *
 * @param {{ cultivos: string[] }} parcela
 * @returns {number} % de reducción de arvenses por cobertura (0, 24 o 55)
 */
export function coberturaSuelo(parcela) {
  const hayAhuyama = parcela.cultivos.includes(HERMANAS.AHUYAMA);
  if (!hayAhuyama) return 0;
  const acompanada = parcela.cultivos.length >= 2;
  return acompanada ? 55 : 24;
}

/**
 * ¿El maíz le da soporte al fríjol? (el fríjol trepa por la caña del maíz).
 * Verdadero solo si conviven maíz Y fríjol en la parcela.
 *
 * @param {{ cultivos: string[] }} parcela
 * @returns {boolean}
 */
export function haySoporteMaizFrijol(parcela) {
  return (
    parcela.cultivos.includes(HERMANAS.MAIZ) &&
    parcela.cultivos.includes(HERMANAS.FRIJOL)
  );
}

/**
 * Land Equivalent Ratio aproximado de la parcela: cuánto mejor usa la tierra la
 * asociación frente a sembrar cada cultivo por separado.
 *   - 1 hermana  → 1.0  (es un monocultivo, línea base).
 *   - 2 hermanas → 1.45 (asociación parcial).
 *   - 3 hermanas → 2.0  (milpa completa; valor central del rango 1.08–2.89).
 *   - 0          → 0    (parcela vacía).
 *
 * @param {{ cultivos: string[] }} parcela
 * @returns {number} LER (1 decimal)
 */
export function lerParcela(parcela) {
  const d = diversidadParcela(parcela);
  if (d === 0) return 0;
  if (d === 1) return 1;
  if (d === 2) return 1.45;
  return 2;
}

/**
 * Salud/rendimiento de la parcela (0–100). Premia las sinergias reales:
 *   - base por tener al menos un cultivo,
 *   - fijación de N (fríjol → maíz),
 *   - soporte físico (maíz → fríjol),
 *   - cobertura del suelo (ahuyama → menos arvenses, más humedad).
 * Un monocultivo nunca supera ~45; la milpa completa llega cerca de 100.
 *
 * @param {{ cultivos: string[] }} parcela
 * @returns {number} salud entre 0 y SALUD_MAX
 */
export function saludParcela(parcela) {
  const d = diversidadParcela(parcela);
  if (d === 0) return 0;

  let salud = 35; // base de un cultivo sano y solo
  // El fríjol fija N que el maíz necesita.
  if (haySoporteMaizFrijol(parcela)) salud += 22; // soporte físico
  if (parcela.cultivos.includes(HERMANAS.FRIJOL) && parcela.cultivos.includes(HERMANAS.MAIZ)) {
    salud += 18; // N fijado aprovechado por el maíz
  }
  // La ahuyama cubre el suelo: humedad + menos arvenses que compiten.
  if (parcela.cultivos.includes(HERMANAS.AHUYAMA) && d >= 2) salud += 20;
  // Bono de sistema completo (las tres hermanas se potencian).
  if (esMilpaCompleta(parcela)) salud += 5;

  return Math.min(SALUD_MAX, salud);
}

/**
 * Catálogo de eventos del clima/plagas que ponen a prueba a la parcela.
 * `dano` es el golpe base (a un monocultivo). La diversidad amortigua.
 */
export const EVENTOS = Object.freeze([
  {
    id: 'sequia',
    nombre: 'Sequía',
    emoji: '☀️',
    dano: 30,
    // La ahuyama cubre el suelo y retiene humedad → resiste mejor la sequía.
    relacion: 'La cobertura de la ahuyama guarda humedad en el suelo.',
  },
  {
    id: 'cogollero',
    nombre: 'Gusano cogollero',
    emoji: '🐛',
    dano: 28,
    // La diversidad confunde a la plaga y aloja enemigos naturales.
    relacion: 'La diversidad de la milpa baja la presión del cogollero.',
  },
  {
    id: 'aguacero',
    nombre: 'Aguacero fuerte',
    emoji: '🌧️',
    dano: 24,
    // Suelo cubierto y con raíces variadas erosiona menos.
    relacion: 'El suelo cubierto de la milpa erosiona menos con la lluvia.',
  },
  {
    id: 'arvenses',
    nombre: 'Maleza (arvenses)',
    emoji: '🌿',
    dano: 22,
    // La ahuyama tapa el suelo y las arvenses casi no germinan.
    relacion: 'La ahuyama tapa el suelo y deja poco espacio a las arvenses.',
  },
]);

/**
 * Factor de resistencia de una parcela ante un evento, según su DIVERSIDAD.
 * Principio agroecológico real: a más diversidad, más resiliencia.
 *   - 1 hermana  → 1.0  (recibe el daño completo).
 *   - 2 hermanas → 0.6  (amortigua 40 %).
 *   - 3 hermanas → 0.35 (amortigua 65 %).
 *
 * @param {{ cultivos: string[] }} parcela
 * @returns {number} factor multiplicador del daño (0–1)
 */
export function factorResistencia(parcela) {
  const d = diversidadParcela(parcela);
  if (d <= 1) return 1;
  if (d === 2) return 0.6;
  return 0.35;
}

/**
 * Aplica un evento a una parcela y devuelve la salud resultante. La milpa
 * (3 hermanas) pierde MUCHA menos salud que el monocultivo ante el mismo golpe.
 *
 * @param {{ cultivos: string[] }} parcela
 * @param {{ dano: number }} evento
 * @returns {{ saludAntes: number, saludDespues: number, danoAplicado: number }}
 */
export function aplicarEvento(parcela, evento) {
  const saludAntes = saludParcela(parcela);
  const danoBase = evento?.dano ?? 0;
  const danoAplicado = Math.round(danoBase * factorResistencia(parcela));
  const saludDespues = Math.max(0, saludAntes - danoAplicado);
  return { saludAntes, saludDespues, danoAplicado };
}

/**
 * Resumen de la finca completa (todas las parcelas) para el HUD y el cierre de
 * temporada. Calcula el rendimiento total y lo compara honestamente contra el
 * mismo número de parcelas sembradas en MONOCULTIVO (un solo cultivo por
 * parcela), para que el jugador VEA el beneficio de asociar.
 *
 * @param {Array<{ id: string, cultivos: string[] }>} parcelas
 * @returns {{
 *   parcelasSembradas: number,
 *   milpasCompletas: number,
 *   saludTotal: number,
 *   saludPromedio: number,
 *   rendimientoMono: number,
 *   ventajaPct: number,
 *   nitrogenoPromedio: number,
 *   coberturaPromedio: number,
 *   lerPromedio: number,
 * }}
 */
export function resumenFinca(parcelas) {
  const sembradas = parcelas.filter((p) => diversidadParcela(p) > 0);
  const n = sembradas.length;
  if (n === 0) {
    return {
      parcelasSembradas: 0,
      milpasCompletas: 0,
      saludTotal: 0,
      saludPromedio: 0,
      rendimientoMono: 0,
      ventajaPct: 0,
      nitrogenoPromedio: 0,
      coberturaPromedio: 0,
      lerPromedio: 0,
    };
  }

  const saludTotal = sembradas.reduce((acc, p) => acc + saludParcela(p), 0);
  const milpasCompletas = sembradas.filter(esMilpaCompleta).length;
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
  const lerPromedio = Number(
    (sembradas.reduce((acc, p) => acc + lerParcela(p), 0) / n).toFixed(2),
  );

  return {
    parcelasSembradas: n,
    milpasCompletas,
    saludTotal,
    saludPromedio: Math.round(saludTotal / n),
    rendimientoMono,
    ventajaPct,
    nitrogenoPromedio,
    coberturaPromedio,
    lerPromedio,
  };
}
