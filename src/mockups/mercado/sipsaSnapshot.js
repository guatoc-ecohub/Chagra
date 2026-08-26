/*
 * sipsaSnapshot.js — precios de referencia SIPSA/DANE para el mercado montaña.
 *
 * REGLA DURA (misma que src/data/precioReferencia.js): Chagra NO inventa
 * precios. Este archivo NO fabrica ni una cifra: es una foto puntual, citada
 * y fechada, extraída DIRECTAMENTE de la tabla en vivo `chagra.sipsa_precios`
 * (postgres `chagra_kg`, feed diario DANE-SIPSA — 306 productos, 6 plazas
 * mayoristas). Consulta ejecutada el 2026-08-25, fecha del boletín 2026-08-24:
 *
 *   SELECT producto_id, fecha, avg(precio_promedio_cop_kg), min(precio_min),
 *          max(precio_max), plazas
 *   FROM chagra.sipsa_precios
 *   WHERE producto_id IN (...) AND fecha = (SELECT max(fecha) FROM ...)
 *   GROUP BY producto_id;
 *
 * Decisión del operador (2026-08-25): la referencia SIPSA se publica en TODO
 * producto que SIPSA cubra, sin bloquear por diferencia de unidad — para los
 * que se venden por LIBRA se usa la conversión física ×0.5 (1 libra = 0.5 kg
 * EXACTO, no es una suposición: es la definición de la unidad). Para
 * 'atado'/'unidad' NO hay conversión física definida a kg — esos quedan
 * fuera a propósito (inventar un peso-por-atado SÍ sería fabricar un dato).
 *
 * Nota de variedad (transparencia): donde el nombre del producto del mercado
 * no especifica variedad, se usó la variedad de referencia MÁS GENÉRICA/COMÚN
 * del boletín SIPSA (no la más cara ni la más barata) — documentado en cada
 * entrada. `chagra.sipsa_precios` también alimenta el tool de agente
 * `get_precio_sipsa` (sidecarClient.js/agentService.js) — mismo dato de
 * origen, dos consumidores distintos.
 */

/** @type {ReadonlyArray<{nombre:string, producto_id:string, precioKg:number, precioMin:number, precioMax:number, fecha:string, plazas:string, nPlazas:number}>} */
export const SIPSA_MERCADO_SNAPSHOT = Object.freeze([
  {
    nombre: 'cebolla',
    producto_id: 'cebolla_cabezona_blanca', // cebolla de bulbo común; "Cebolla verde" es otro producto (junca)
    precioKg: 3167,
    precioMin: 2800,
    precioMax: 3500,
    fecha: '2026-08-24',
    plazas: 'Barranquilla (Barranquillita) / Bogotá (Corabastos) / Cartagena (Bazurto) / Medellín (Central Mayorista de Antioquia)',
    nPlazas: 4,
  },
  {
    nombre: 'cebolla roja',
    producto_id: 'cebolla_cabezona_roja',
    precioKg: 1997,
    precioMin: 1778,
    precioMax: 2200,
    fecha: '2026-08-24',
    plazas: 'Bogotá (Corabastos) / Cartagena (Bazurto)',
    nPlazas: 2,
  },
  {
    nombre: 'papa',
    producto_id: 'papa_parda_pastusa', // papa de mesa por defecto en el altiplano cundiboyacense
    precioKg: 2300,
    precioMin: 2000,
    precioMax: 2600,
    fecha: '2026-08-24',
    plazas: 'Bogotá (Corabastos) / Cali (Cavasa)',
    nPlazas: 2,
  },
  {
    nombre: 'remolacha',
    producto_id: 'remolacha',
    precioKg: 2081,
    precioMin: 1667,
    precioMax: 2500,
    fecha: '2026-08-24',
    plazas: 'Barranquilla (Barranquillita) / Bogotá (Corabastos) / Cartagena (Bazurto) / Medellín (Central Mayorista de Antioquia)',
    nPlazas: 4,
  },
  {
    nombre: 'papa criolla',
    producto_id: 'papa_criolla_limpia',
    precioKg: 6298,
    precioMin: 5000,
    precioMax: 7111,
    fecha: '2026-08-24',
    plazas: 'Barranquilla (Barranquillita) / Bogotá (Corabastos) / Cali (Cavasa) / Cartagena (Bazurto) / Medellín (Central Mayorista de Antioquia)',
    nPlazas: 5,
  },
  {
    nombre: 'mora de castilla',
    producto_id: 'mora_de_castilla',
    precioKg: 6009,
    precioMin: 5200,
    precioMax: 8000,
    fecha: '2026-08-24',
    plazas: 'Barranquilla (Barranquillita) / Bogotá (Corabastos) / Cali (Cavasa) / Cartagena (Bazurto)',
    nPlazas: 4,
  },
]);

/* Unidades del mercado con conversión FÍSICA exacta a kg — no un invento. */
const FACTOR_A_KG = { kg: 1, libra: 0.5 };

const fold = (s) =>
  (s || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/**
 * Busca el precio de referencia SIPSA para un producto por NOMBRE EXACTO
 * (normalizado), convertido a la UNIDAD de venta del mercado (kg o libra —
 * las únicas con equivalencia física exacta y verificable a kg). Para
 * 'atado'/'unidad' devuelve null a propósito: no existe una conversión real,
 * inventarla sería fabricar un dato — el llamador debe mostrar "precio a
 * confirmar", nunca un $0 ni un número inventado.
 *
 * @param {string} nombre
 * @param {string} unidad — 'kg' | 'libra' | cualquier otra (no soportada)
 * @returns {{precio:number, unidad:string, precioMin:number, precioMax:number, fecha:string, plazas:string}|null}
 */
export function getSipsaMercado(nombre, unidad) {
  const factor = FACTOR_A_KG[unidad];
  if (!factor) return null;
  const key = fold(nombre);
  const hit = SIPSA_MERCADO_SNAPSHOT.find((s) => fold(s.nombre) === key);
  if (!hit) return null;
  return {
    precio: Math.round(hit.precioKg * factor),
    unidad,
    precioMin: Math.round(hit.precioMin * factor),
    precioMax: Math.round(hit.precioMax * factor),
    fecha: hit.fecha,
    plazas: hit.plazas,
  };
}
