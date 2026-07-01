/**
 * precioReferencia.js — precios de referencia GROUNDEADOS para el marketplace.
 *
 * Regla dura (anti-alucinación): Chagra NO inventa precios. Una oferta del
 * marketplace muestra el precio que el productor escribió; el precio de
 * REFERENCIA mayorista es un dato externo que solo se cita si existe una
 * fuente verificable. Cuando no hay dato → deflección honesta ("sin precio de
 * referencia todavía"), nunca un número fabricado.
 *
 * Estado actual (2026-07): tabla poblada con una FOTO puntual de precios
 * mayoristas SIPSA/DANE — NO es una consulta en vivo. Los dos Deep Research de
 * Chagra-strategy/deepresearch/DR-FANOUT/ que investigaron el acceso a SIPSA
 * ("fuente-consultable-de-precios-mayoristas-sipsa-actuales...",
 * "precios-mayoristas-sipsa-colombia-endpoint-consultable...") NO traen
 * ninguna cifra de precio citada: solo describen el mecanismo de acceso
 * (dataset Socrata en datos.gov.co) y una tabla de mapeo producto→especie. El
 * `resource_id` que documentan (`ugru-ez98`) respondió 404 ("dataset.missing")
 * al verificarlo empíricamente — confirma, para esta tabla, el hallazgo del
 * audit triple ("Precio SIPSA = humo",
 * Chagra-strategy/audit/2026-06-28-triple-auditoria-mano-3ejes.md).
 *
 * Para no dejar el stub vacío indefinidamente, las entradas de abajo NO salen
 * del DR sino del boletín diario OFICIAL de DANE-SIPSA (fuente pública
 * primaria, verificada directamente): "Boletín diario — Precios mayoristas",
 * 9 de junio de 2026 —
 * https://www.dane.gov.co/files/operaciones/SIPSA/bol-SIPSADiario-09jun2026.pdf
 * Cada precio es el cotizado ESE día en la(s) plaza(s) mayorista(s) listada(s)
 * en `mercado` (no un promedio nacional). Es una referencia FECHADA para que
 * el productor calibre su oferta, no un precio "vigente ahora": no
 * sobrevender esta tabla como feed en vivo. El pipeline de consulta SIPSA en
 * vivo para el marketplace sigue en cola (DR de comercialización); refrescar
 * esta foto hoy requiere repetir la extracción de un boletín reciente.
 *
 * (Nota: Chagra sí tiene un canal SIPSA EN VIVO separado — el tool de agente
 * `get_precio_sipsa` vía sidecarClient.js/agentService.js, PR #1894/#1897 — que
 * lee la tabla `chagra.sipsa_precios` poblada por el feed diario DANE. Ese
 * canal alimenta la respuesta del agente y la alerta de cosecha
 * (cropAlertEngine.js); esta tabla es la referencia ESTÁTICA y citada del
 * formulario de publicación del marketplace, un consumidor distinto.)
 *
 * Forma de un registro de referencia:
 *   {
 *     producto: 'tomate',          // clave normalizada (lowercase, sin tildes)
 *     unidad: 'kg',                // unidad del precio de referencia
 *     precioMin: 1800,             // COP — banda baja del boletín
 *     precioMax: 2600,             // COP — banda alta del boletín
 *     mercado: 'Corabastos',       // plaza(s) mayorista(s) de referencia
 *     fuente: 'SIPSA',             // etiqueta institucional (cita SIPSA/DANE)
 *     boletinFecha: '2026-06-09',  // fecha del boletín citado (trazabilidad)
 *   }
 *
 * La `fuente` se resuelve a un deep-link con classifySource()
 * (institutionalSources.js) — 'SIPSA' linkea a la sección de precios del DANE.
 *
 * Nota de matching: 'tomate' y 'tomate de árbol' conviven en la tabla porque
 * SIPSA los cotiza como productos distintos (hortaliza vs. fruta), y "tomate"
 * es literalmente un substring de "tomate de árbol". Esto expuso un caso real
 * en getPrecioReferencia(): con el matcher original (inclusión + "gana la
 * clave más larga"), una consulta literal "tomate" desempataba hacia "tomate
 * de árbol" por ser la clave más específica/larga — precio de la fruta
 * equivocada para quien vende la hortaliza. Se agregó una prioridad de match
 * EXACTO (mismo texto normalizado gana siempre, antes de mirar inclusiones)
 * para resolver este caso sin tocar la forma de PRECIOS_REFERENCIA ni la
 * firma pública del módulo. Ver el test correspondiente en
 * src/data/__tests__/precioReferencia.test.js.
 *
 * @module data/precioReferencia
 */

/**
 * Tabla de precios de referencia citados. Foto puntual del boletín diario
 * DANE-SIPSA del 9 de junio de 2026 (ver cabecera del módulo para la URL y las
 * salvedades) — NO un feed en vivo. Cuando llegue el pipeline de consulta
 * SIPSA en vivo para el marketplace (DR de comercialización en cola), esta
 * tabla se reemplaza por datos frescos. NO agregar cifras a mano sin fuente —
 * rompería el contrato anti-alucinación del marketplace.
 *
 * @type {ReadonlyArray<{producto:string, unidad:string, precioMin:number,
 *   precioMax:number, mercado:string, fuente:string, boletinFecha:string}>}
 */
export const PRECIOS_REFERENCIA = Object.freeze([
  {
    producto: 'cebolla cabezona blanca',
    unidad: 'kg',
    precioMin: 3325,
    precioMax: 3850,
    mercado: 'Tunja (Complejo de Servicios del Sur) / Ibagué (Plaza La 21)',
    fuente: 'SIPSA',
    boletinFecha: '2026-06-09',
  },
  {
    producto: 'pepino cohombro',
    unidad: 'kg',
    precioMin: 1667,
    precioMax: 1925,
    mercado: 'Armenia (Mercar) / Medellín (Central Mayorista de Antioquia)',
    fuente: 'SIPSA',
    boletinFecha: '2026-06-09',
  },
  {
    producto: 'tomate',
    unidad: 'kg',
    precioMin: 4318,
    precioMax: 4833,
    mercado: 'Manizales (Centro Galerías) / Pereira (La 41-Impala)',
    fuente: 'SIPSA',
    boletinFecha: '2026-06-09',
  },
  {
    producto: 'cebolla junca',
    unidad: 'kg',
    precioMin: 2005,
    precioMax: 2422,
    mercado: 'Cúcuta (Cenabastos) / Bucaramanga (Centroabastos)',
    fuente: 'SIPSA',
    boletinFecha: '2026-06-09',
  },
  {
    producto: 'fríjol verde',
    unidad: 'kg',
    precioMin: 5475,
    precioMax: 6067,
    mercado: 'Bogotá (Corabastos) / Cali (Santa Elena)',
    fuente: 'SIPSA',
    boletinFecha: '2026-06-09',
  },
  {
    producto: 'piña',
    unidad: 'kg',
    precioMin: 2700,
    precioMax: 3933,
    mercado: 'Armenia (Mercar) / Pereira (La 41-Impala)',
    fuente: 'SIPSA',
    boletinFecha: '2026-06-09',
  },
  {
    producto: 'tomate de árbol',
    unidad: 'kg',
    precioMin: 5200,
    precioMax: 6627,
    mercado: 'Neiva (Surabastos) / Armenia (Mercar)',
    fuente: 'SIPSA',
    boletinFecha: '2026-06-09',
  },
  {
    producto: 'papaya maradol',
    unidad: 'kg',
    precioMin: 2100,
    precioMax: 2100,
    mercado: 'Pereira (La 41-Impala)',
    fuente: 'SIPSA',
    boletinFecha: '2026-06-09',
  },
  {
    producto: 'maracuyá',
    unidad: 'kg',
    precioMin: 4575,
    precioMax: 4825,
    mercado: 'Medellín (Central Mayorista de Antioquia) / Bogotá (Corabastos)',
    fuente: 'SIPSA',
    boletinFecha: '2026-06-09',
  },
  {
    producto: 'guayaba',
    unidad: 'kg',
    precioMin: 2433,
    precioMax: 3525,
    mercado: 'Armenia (Mercar) / Medellín (Central Mayorista de Antioquia)',
    fuente: 'SIPSA',
    boletinFecha: '2026-06-09',
  },
  {
    producto: 'banano',
    unidad: 'kg',
    precioMin: 1667,
    precioMax: 2000,
    mercado: 'Neiva (Surabastos) / Ibagué (Plaza La 21)',
    fuente: 'SIPSA',
    boletinFecha: '2026-06-09',
  },
  {
    producto: 'plátano hartón verde',
    unidad: 'kg',
    precioMin: 1833,
    precioMax: 2500,
    mercado: 'Armenia (Mercar) / Cúcuta (Cenabastos)',
    fuente: 'SIPSA',
    boletinFecha: '2026-06-09',
  },
  {
    producto: 'papa criolla',
    unidad: 'kg',
    precioMin: 5467,
    precioMax: 7444,
    mercado: 'Tunja (Complejo de Servicios del Sur) / Bogotá (Corabastos)',
    fuente: 'SIPSA',
    boletinFecha: '2026-06-09',
  },
  {
    producto: 'arracacha',
    unidad: 'kg',
    precioMin: 5760,
    precioMax: 5760,
    mercado: 'Ibagué (Plaza La 21)',
    fuente: 'SIPSA',
    boletinFecha: '2026-06-09',
  },
  {
    producto: 'papa negra',
    unidad: 'kg',
    precioMin: 2300,
    precioMax: 2300,
    mercado: 'Bogotá (Corabastos)',
    fuente: 'SIPSA',
    boletinFecha: '2026-06-09',
  },
  {
    producto: 'plátano guineo',
    unidad: 'kg',
    precioMin: 1125,
    precioMax: 1125,
    mercado: 'Medellín (Central Mayorista de Antioquia)',
    fuente: 'SIPSA',
    boletinFecha: '2026-06-09',
  },
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
 * usuario casa con "tomate" de la tabla, y viceversa. Un match EXACTO (mismo
 * texto normalizado) siempre gana primero — es, por definición, el candidato
 * más específico posible. Sin match exacto, gana el de clave más larga (más
 * específica) entre los candidatos por inclusión.
 *
 * Esta prioridad importa en la práctica: la tabla puede tener a la vez
 * "tomate" y "tomate de árbol" (productos SIPSA distintos, ver cabecera del
 * módulo). Sin la prioridad de match exacto, una consulta literal "tomate"
 * calzaría por inclusión con AMBAS entradas (la más larga, "tomate de árbol",
 * también la contiene) y el criterio de "clave más larga" devolvería el
 * precio equivocado. Con la prioridad de match exacto, "tomate" resuelve
 * primero contra la entrada "tomate".
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
    if (q === k) return ref; // match exacto: gana siempre, sin ambigüedad posible.
    if (q.includes(k) || k.includes(q)) {
      if (!mejor || k.length > normalizarProducto(mejor.producto).length) {
        mejor = ref;
      }
    }
  }
  return mejor;
}
