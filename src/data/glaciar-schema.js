/**
 * glaciar-schema.js — esquema del Reporte de Punto Glaciar (v2 "escala creíble").
 *
 * Módulo para guías de glaciar (validación en campo, p. ej. Cocuy, Ruiz,
 * Cordillera Blanca). Todos los enums viven acá para que sean fáciles de
 * mantener. NO hardcodear estos valores en la pantalla: importar desde acá.
 *
 * Español Colombia (usted/tú, SIN voseo). Tono de campo, claro y corto.
 *
 * FUENTES de la refinación (no citadas en UI, pero guían el diseño):
 *   - Clasificación de dureza por dureza de mano (hand hardness test) +
 *     extensión a hielo con piolet — ICSSG / UNESCO-IACS "International
 *     Classification for Seasonal Snow on the Ground".
 *   - Tipos de superficie y peligros — WGMS, IDEAM (monitoreo glaciares
 *     Colombia), práctica de montañismo técnico (UIAGM/UIAA).
 *
 * NOTA sobre precisión: la prueba de dureza de mano (fuerza estándar 10–15 N)
 * y la ramsonda NO se convierten entre sí. Guardamos método + valor cualitativo,
 * NO inventamos un número de penetración en N. La capa SUPERIOR suele mandar el
 * tránsito; las capas inferiores cuentan la historia del glaciar.
 *
 * @module data/glaciar-schema
 */

/* ── Escala de dureza HÍBRIDA mano → piolet ─────────────────────────────
 *
 * Continuo de menos a más duro. Los 5 primeros grados son la prueba clásica
 * de dureza de mano sobre nieve/firn (qué entra con fuerza moderada); los 2
 * últimos (H1/H2) extienden la escala al hielo, donde la mano ya no entra y
 * se prueba con la punta del piolet. El código (`F`, `4F`, …, `H2`) es el
 * identificador estable que se guarda en el reporte.
 */
export const ESCALA_DUREZA = [
  {
    codigo: 'F',
    orden: 1,
    label: 'Puño',
    medio: 'mano',
    heuristica: 'Entra el puño con poca resistencia.',
    desc: 'Nieve blanda / fresca. El puño penetra fácil.',
    color: 'sky',
  },
  {
    codigo: '4F',
    orden: 2,
    label: '4 dedos',
    medio: 'mano',
    heuristica: 'Entran cuatro dedos juntos.',
    desc: 'Nieve asentada. Cuatro dedos penetran con fuerza moderada.',
    color: 'cyan',
  },
  {
    codigo: '1F',
    orden: 3,
    label: '1 dedo',
    medio: 'mano',
    heuristica: 'Entra un solo dedo.',
    desc: 'Firn / nieve compacta. Un dedo penetra con fuerza moderada.',
    color: 'teal',
  },
  {
    codigo: 'P',
    orden: 4,
    label: 'Lápiz',
    medio: 'mano',
    heuristica: 'Solo entra la punta de un lápiz.',
    desc: 'Firn duro / nieve muy compacta. Solo la punta de un lápiz penetra.',
    color: 'amber',
  },
  {
    codigo: 'K',
    orden: 5,
    label: 'Cuchillo',
    medio: 'mano',
    heuristica: 'Solo entra la hoja de un cuchillo.',
    desc: 'Capa muy dura, borde de hielo. Solo la hoja de un cuchillo penetra.',
    color: 'orange',
  },
  {
    codigo: 'H1',
    orden: 6,
    label: 'Hielo blando',
    medio: 'piolet',
    heuristica: 'La mano NO entra; la punta del piolet penetra con un golpe firme y deja huella; el crampón patea fácil.',
    desc: 'Hielo de glaciar trabajable. El piolet clava con un golpe; el crampón entra bien.',
    color: 'blue',
  },
  {
    codigo: 'H2',
    orden: 7,
    label: 'Hielo duro / azul',
    medio: 'piolet',
    heuristica: 'El piolet rebota o penetra poco y salta esquirla; al crampón le cuesta entrar.',
    desc: 'Hielo azul frío y compacto. El piolet rebota; cuesta clavar crampón.',
    color: 'indigo',
  },
];

/** Códigos de dureza "blanda" (la mano todavía entra). Útil para reglas. */
export const DUREZAS_BLANDAS = Object.freeze(['F', '4F']);

/* ── Tipo de superficie del hielo/nieve (7) ──────────────────────────────
 * Cada tipo trae una implicación de seguridad corta (qué significa para el
 * tránsito), no solo el nombre.
 */
export const TIPOS_SUPERFICIE = [
  {
    key: 'nieve_fresca',
    icon: '❄️',
    label: 'Nieve fresca',
    desc: 'Nieve recién caída, sin asentar.',
    seguridad: 'Oculta grietas y carga pendientes: ojo con avalancha y puentes débiles.',
  },
  {
    key: 'firn_neve',
    icon: '🌨️',
    label: 'Firn / nieve vieja',
    desc: 'Nieve vieja recristalizada (firn/névé), de varias temporadas.',
    seguridad: 'Suele dar buen agarre en mañana fría; se ablanda con el sol.',
  },
  {
    key: 'hielo_glaciar_azul',
    icon: '🧊',
    label: 'Hielo de glaciar (azul)',
    desc: 'Hielo compacto, denso, a menudo azulado.',
    seguridad: 'Firme pero duro: exige crampón y técnica; si es muy duro, resbala.',
  },
  {
    key: 'hielo_podrido',
    icon: '💧',
    label: 'Hielo podrido (candle)',
    desc: 'Hielo derretido, hueco, en columnas o panal (rotten/candle ice).',
    seguridad: 'PELIGRO: no sostiene peso, colapsa sin aviso. Evitar.',
  },
  {
    key: 'penitentes',
    icon: '🗻',
    label: 'Penitentes',
    desc: 'Hojas/cuchillas de nieve-hielo formadas por el sol.',
    seguridad: 'Tránsito lento y agotador; rompe el paso y esconde huecos.',
  },
  {
    key: 'hielo_cubierto_detritos',
    icon: '🪨',
    label: 'Hielo cubierto (detritos)',
    desc: 'Hielo bajo una capa de piedra/morrena.',
    seguridad: 'Engaña: parece roca pero es hielo; roca suelta y huecos ocultos.',
  },
  {
    key: 'hielo_sobreimpuesto',
    icon: '🪟',
    label: 'Hielo sobreimpuesto',
    desc: 'Capa de hielo formada por agua de deshielo recongelada (superimposed ice).',
    seguridad: 'Vidrioso y resbaladizo; agarre traicionero sobre la nieve.',
  },
];

/* ── Peligros observados (multi-select) ──────────────────────────────────
 * Cada peligro trae un campo `critico` (dispara 🔴 por sí solo o bajo
 * condición) usado por la documentación; la lógica fina vive en
 * services/glaciarSafety.js.
 */
export const PELIGROS = [
  { key: 'grietas_abiertas', icon: '⚠️', label: 'Grietas abiertas' },
  { key: 'grietas_con_puente_nieve', icon: '🌉', label: 'Grietas con puente de nieve' },
  { key: 'seracs', icon: '🏔️', label: 'Séracs' },
  { key: 'rimaya_bergschrund', icon: '🧗', label: 'Rimaya (bergschrund)' },
  { key: 'puente_nieve_debil', icon: '🕳️', label: 'Puente de nieve débil' },
  { key: 'agua_deshielo_superficial', icon: '💦', label: 'Agua de deshielo superficial' },
  { key: 'hielo_podrido', icon: '💧', label: 'Hielo podrido' },
  { key: 'penitentes', icon: '🗻', label: 'Penitentes' },
  { key: 'riesgo_avalancha', icon: '🏂', label: 'Riesgo de avalancha' },
  { key: 'roca_suelta_sobre_hielo', icon: '🪨', label: 'Roca suelta sobre el hielo' },
  { key: 'pendiente_pronunciada', icon: '⛰️', label: 'Pendiente pronunciada' },
  { key: 'ninguno_evidente', icon: '✅', label: 'Ninguno evidente' },
];

/* ── Condiciones del entorno (selects cortos) ───────────────────────────── */
export const CIELO = [
  { key: 'despejado', label: 'Despejado' },
  { key: 'parcial', label: 'Parcialmente nublado' },
  { key: 'nublado', label: 'Nublado' },
  { key: 'niebla', label: 'Niebla' },
  { key: 'precipitacion', label: 'Precipitación' },
];

export const VIENTO = [
  { key: 'calma', label: 'Calma' },
  { key: 'moderado', label: 'Moderado' },
  { key: 'fuerte', label: 'Fuerte' },
];

export const VISIBILIDAD = [
  { key: 'buena', label: 'Buena' },
  { key: 'media', label: 'Media' },
  { key: 'mala', label: 'Mala' },
];

/* ── Montañas (selector) ─────────────────────────────────────────────────
 * Colombia + Perú (Cordillera Blanca) + campo libre. `noPisar:true` marca los
 * macizos donde está prohibido pisar el hielo (p. ej. PNN El Cocuy): el reporte
 * por defecto va en "modo borde" (observación, no juicio de tránsito).
 */
export const MONTANAS = [
  // Colombia
  { key: 'cocuy_ritacuba', label: 'Cocuy / Ritacuba', pais: 'Colombia', noPisar: true },
  { key: 'ruiz', label: 'Nevado del Ruiz', pais: 'Colombia' },
  { key: 'tolima', label: 'Nevado del Tolima', pais: 'Colombia' },
  { key: 'huila', label: 'Nevado del Huila', pais: 'Colombia' },
  { key: 'santa_isabel', label: 'Santa Isabel', pais: 'Colombia' },
  { key: 'sierra_nevada_santa_marta', label: 'Sierra Nevada de Santa Marta', pais: 'Colombia' },
  // Perú — Cordillera Blanca
  { key: 'yanapaccha', label: 'Yanapaccha', pais: 'Perú' },
  { key: 'huascaran', label: 'Huascarán', pais: 'Perú' },
  { key: 'pisco', label: 'Pisco', pais: 'Perú' },
  { key: 'chopicalqui', label: 'Chopicalqui', pais: 'Perú' },
  { key: 'tocllaraju', label: 'Tocllaraju', pais: 'Perú' },
  { key: 'vallunaraju', label: 'Vallunaraju', pais: 'Perú' },
  // Campo libre
  { key: 'otra', label: 'Otra montaña…', pais: null, libre: true },
];

/* ── Estado de seguridad derivado (lógica en evaluarSeguridadGlaciar) ──── */
export const ESTADOS_SEGURIDAD = {
  estable: {
    nivel: 'estable',
    emoji: '🟢',
    label: 'Estable',
    desc: 'Hielo firme sin peligros visibles. Avance con las precauciones normales.',
    color: 'emerald',
  },
  precaucion: {
    nivel: 'precaucion',
    emoji: '🟡',
    label: 'Precaución',
    desc: 'Hay señales de cuidado. Evalúe la ruta y use protección.',
    color: 'amber',
  },
  peligro: {
    nivel: 'peligro',
    emoji: '🔴',
    label: 'Peligro',
    desc: 'Condiciones inseguras. Considere no avanzar o buscar otra ruta.',
    color: 'red',
  },
  observacion: {
    nivel: 'observacion',
    emoji: '🔵',
    label: 'Observación',
    desc: 'Reporte de borde sin pisar el hielo. Registro de estado y retroceso, no juicio de tránsito.',
    color: 'sky',
  },
};

/** Disclaimer fijo de la UI (apoyo a la decisión, no la reemplaza). */
export const DISCLAIMER =
  'El semáforo es un apoyo a la decisión, no la reemplaza: prevalece el juicio del guía certificado.';

/** Micro-texto de propósito (educativo / trazabilidad). */
export const PROPOSITO =
  'Cada punto fijo en el tiempo es un dato. El glaciar Conejeras (Santa Isabel) se extinguió en 2024 tras 18 años de monitoreo: el reporte de un guía es exactamente ese tipo de registro.';

/* Mapas key→meta para mostrar etiquetas en la lista/trazabilidad. */
export const SUPERFICIE_BY_KEY = Object.fromEntries(TIPOS_SUPERFICIE.map((t) => [t.key, t]));
export const PELIGRO_BY_KEY = Object.fromEntries(PELIGROS.map((p) => [p.key, p]));
export const DUREZA_BY_CODIGO = Object.fromEntries(ESCALA_DUREZA.map((d) => [d.codigo, d]));
export const MONTANA_BY_KEY = Object.fromEntries(MONTANAS.map((m) => [m.key, m]));

/* Helper: orden numérico de una dureza por su código (para comparaciones). */
export function ordenDureza(codigo) {
  return DUREZA_BY_CODIGO[codigo]?.orden ?? null;
}
