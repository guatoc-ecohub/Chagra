/**
 * precioReferencia.js — precios de referencia GROUNDEADOS para el marketplace.
 *
 * Regla dura (anti-alucinación): Chagra NO inventa precios. Una oferta del
 * marketplace muestra el precio que el productor escribió; el precio de
 * REFERENCIA mayorista es un dato externo que solo se cita si existe una
 * fuente verificable. Cuando no hay dato → deflección honesta ("sin precio de
 * referencia todavía"), nunca un número fabricado.
 *
 * Estado actual (2026-06): la consulta de precios SIPSA/DANE en vivo todavía
 * NO está disponible en Chagra (la capacidad `precio` del manifiesto es un stub
 * honesto, status 'soon'). Mientras llega el pipeline de comercialización (un
 * Deep Research de mercados/circuitos cortos está EN COLA y alimentará esta
 * tabla con boletines SIPSA fechados por producto), esta tabla queda
 * deliberadamente VACÍA salvo el andamiaje de la estructura. Así el marketplace
 * deflecta con honestidad en vez de mostrar cifras sin respaldo.
 *
 * Forma de un registro de referencia (cuando se pueble desde el DR):
 *   {
 *     producto: 'tomate',          // clave normalizada (lowercase, sin tildes)
 *     unidad: 'kg',                // unidad del precio de referencia
 *     precioMin: 1800,             // COP — banda baja del boletín
 *     precioMax: 2600,             // COP — banda alta del boletín
 *     mercado: 'Corabastos',       // plaza mayorista de referencia
 *     fuente: 'SIPSA',             // etiqueta institucional (cita SIPSA/DANE)
 *     boletinFecha: '2026-05-30',  // fecha del boletín citado (trazabilidad)
 *   }
 *
 * La `fuente` se resuelve a un deep-link con mapSourceToCitation()
 * (institutionalSources.js) — 'SIPSA' linkea a la sección de precios del DANE.
 *
 * @module data/precioReferencia
 */

/**
 * Tabla de precios de referencia citados. VACÍA por ahora (sin dato verificable
 * = sin entrada). El DR de comercialización en cola la poblará con boletines
 * SIPSA fechados. NO agregar cifras a mano sin fuente — rompería el contrato
 * anti-alucinación del marketplace.
 *
 * @type {ReadonlyArray<{producto:string, unidad:string, precioMin:number,
 *   precioMax:number, mercado:string, fuente:string, boletinFecha:string}>}
 */
export const PRECIOS_REFERENCIA = Object.freeze([
  // (intencionalmente vacío — ver cabecera del módulo: gancho para el DR de
  //  comercialización en cola. Sin dato verificable, el marketplace deflecta.)
]);

/**
 * Normaliza un nombre de producto para comparar contra la tabla: minúsculas,
 * sin tildes, sin espacios sobrantes. Mismo criterio que usará el ingest del DR.
 *
 * @param {string} nombre
 * @returns {string}
 */
export function normalizarProducto(nombre) {
  if (typeof nombre !== 'string') return '';
  return nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Busca el precio de referencia citado para un producto. Devuelve null si no
 * hay dato verificable — el llamador debe deflectar honestamente (NO inventar).
 *
 * El match es por inclusión normalizada en ambos sentidos: "tomate chonto" del
 * usuario casa con "tomate" de la tabla, y viceversa. Si hay varios candidatos,
 * gana el de clave más larga (más específica).
 *
 * @param {string} producto — nombre del producto (texto libre del usuario).
 * @returns {{producto:string, unidad:string, precioMin:number, precioMax:number,
 *   mercado:string, fuente:string, boletinFecha:string}|null}
 */
export function getPrecioReferencia(producto) {
  const q = normalizarProducto(producto);
  if (!q) return null;
  let mejor = null;
  for (const ref of PRECIOS_REFERENCIA) {
    const k = normalizarProducto(ref.producto);
    if (!k) continue;
    if (q.includes(k) || k.includes(q)) {
      if (!mejor || k.length > normalizarProducto(mejor.producto).length) {
        mejor = ref;
      }
    }
  }
  return mejor;
}
