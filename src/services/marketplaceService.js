/**
 * marketplaceService.js — lógica PURA del marketplace agroecológico.
 *
 * Separa la lógica de negocio (filtrar, validar, formatear precio, construir el
 * link de contacto, resolver el precio de referencia citado) del componente de
 * UI (MercadosScreen). Todo aquí es puro y testeable sin DOM.
 *
 * Principio anti-alucinación (regla dura del operador): el marketplace NO
 * inventa precios. El precio de una oferta es el que escribió el productor; el
 * precio de REFERENCIA mayorista solo se muestra si hay fuente verificable
 * (precioReferencia.js, hoy vacío a la espera del DR de comercialización). Sin
 * dato → deflección honesta, nunca un número fabricado.
 *
 * @module services/marketplaceService
 */

import { getPrecioReferencia } from '../data/precioReferencia';
import { classifySource } from './institutionalSources';

/**
 * Formatea un precio en pesos colombianos. Devuelve null-safe: si el precio no
 * es un número finito > 0, devuelve null (el llamador muestra "precio a
 * convenir" en vez de "$0").
 *
 * @param {number|null|undefined} valor — monto en COP.
 * @returns {string|null} p.ej. "$2.400" — o null si no hay precio válido.
 */
export function formatearCOP(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0) return null;
  // Separador de miles con punto (convención COP). Sin decimales: los precios
  // de finca son enteros en pesos.
  return `$${Math.round(n).toLocaleString('es-CO')}`;
}

/**
 * Normaliza un teléfono colombiano a dígitos para un link de WhatsApp/llamada.
 * Quita espacios, guiones y paréntesis. Si el número no trae indicativo de país
 * y parece un celular nacional de 10 dígitos, antepone 57 (Colombia).
 *
 * @param {string} tel
 * @returns {string} solo dígitos (con indicativo si se pudo inferir), o '' .
 */
export function normalizarTelefono(tel) {
  if (typeof tel !== 'string') return '';
  let d = tel.replace(/[^0-9]/g, '');
  if (!d) return '';
  // 10 dígitos que empiezan en 3 → celular colombiano sin indicativo → +57.
  if (d.length === 10 && d.startsWith('3')) d = `57${d}`;
  return d;
}

/**
 * Construye el enlace de contacto al vendedor. Patrón del resto de la app:
 * contacto DIRECTO (WhatsApp si hay teléfono), sin transacción dentro de la
 * app. Devuelve null si no hay teléfono utilizable — la UI entonces muestra una
 * deflección honesta ("este vendedor no dejó un contacto directo").
 *
 * El mensaje pre-llenado cita el producto para que el comprador no tenga que
 * escribirlo. NO incluye datos sensibles.
 *
 * @param {object} oferta — registro de oferta.
 * @returns {{ href:string, tel:string }|null}
 */
export function construirContacto(oferta) {
  const tel = normalizarTelefono(oferta?.contactoTel || '');
  if (!tel) return null;
  const producto = (oferta?.producto || 'su producto').trim();
  const saludo = `Hola, vi su oferta de "${producto}" en el mercado de Chagra. ¿Sigue disponible?`;
  const href = `https://wa.me/${tel}?text=${encodeURIComponent(saludo)}`;
  return { href, tel };
}

/**
 * Resuelve el precio de referencia mayorista CITADO para un producto.
 * Devuelve `{ disponible:false }` cuando no hay dato verificable — la UI debe
 * deflectar honestamente ("sin precio de referencia todavía"), NUNCA inventar.
 *
 * Cuando hay dato (lo poblará el DR de comercialización en cola), incluye la
 * banda de precios, la plaza, y la cita resuelta a deep-link (SIPSA/DANE).
 *
 * @param {string} producto — nombre del producto.
 * @returns {{ disponible:boolean, producto?:string, banda?:string, mercado?:string,
 *   fuente?:string, fuenteUrl?:string, boletinFecha?:string }}
 */
export function resolverPrecioReferencia(producto) {
  const ref = getPrecioReferencia(producto);
  if (!ref) return { disponible: false };
  const min = formatearCOP(ref.precioMin);
  const max = formatearCOP(ref.precioMax);
  const banda = min && max ? `${min}–${max} / ${ref.unidad}` : (min || max || null);
  const cita = classifySource(ref.fuente, { concept: producto });
  return {
    disponible: true,
    producto: ref.producto,
    banda,
    mercado: ref.mercado,
    fuente: cita.fuente || ref.fuente,
    fuenteUrl: cita.fuente_url || null,
    boletinFecha: ref.boletinFecha,
  };
}

/**
 * Construye una respuesta humana de precio de referencia para el chip Precio.
 * Usa la misma base groundeada que el marketplace: resolverPrecioReferencia().
 * Si no hay dato verificable, devuelve una declinacion honesta.
 *
 * @param {string} producto
 * @returns {string|null}
 */
export function buildPriceReferenceAnswer(producto) {
  const query = String(producto || '').trim();
  if (!query) return null;

  const ref = resolverPrecioReferencia(query);
  if (!ref.disponible) {
    return `No encontré una referencia SIPSA para "${query}". Si quiere, escriba el producto exacto y lo reviso de nuevo.`;
  }

  const fecha = ref.boletinFecha
    ? new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${ref.boletinFecha}T00:00:00Z`))
    : null;

  const productoCanonico = ref.producto || query;
  let msg = `💰 ${productoCanonico} está entre ${ref.banda} en ${ref.mercado}.`;
  msg += ` (Fuente: ${ref.fuente}${fecha ? `, ${fecha}` : ''}.)`;
  msg += ' Es precio mayorista en central de abastos; en plaza local puede variar.';
  return msg;
}

/**
 * Valida el formulario de publicación. Devuelve `{ ok, errors }` donde `errors`
 * es un mapa campo→mensaje (vacío si todo bien). Reglas mínimas para una oferta
 * útil sin fricción: producto + cantidad > 0 + unidad. El precio es OPCIONAL
 * (se admite "a convenir"): así no forzamos a inventar un número.
 *
 * @param {object} form
 * @returns {{ ok:boolean, errors:Record<string,string> }}
 */
export function validarOferta(form) {
  const errors = {};
  if (!form || typeof form !== 'object') {
    return { ok: false, errors: { producto: 'Datos inválidos' } };
  }
  if (!String(form.producto || '').trim()) {
    errors.producto = 'Escribe qué producto vendes';
  }
  const cantidad = Number(form.cantidad);
  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    errors.cantidad = 'Indica una cantidad mayor que cero';
  }
  if (!String(form.unidad || '').trim()) {
    errors.unidad = 'Elige una unidad (kg, arroba, bulto…)';
  }
  // Precio opcional, pero si lo escriben debe ser positivo.
  if (form.precio !== '' && form.precio != null) {
    const p = Number(form.precio);
    if (!Number.isFinite(p) || p < 0) {
      errors.precio = 'El precio debe ser un número válido';
    }
  }
  return { ok: Object.keys(errors).length === 0, errors: /** @type {Record<string,string>} */ (/** @type {unknown} */ (errors)) };
}

/**
 * Filtra una lista de ofertas por categoría y/o texto de ubicación/producto.
 * Búsqueda case-insensitive sobre producto, finca, vereda y municipio.
 *
 * @param {object[]} ofertas
 * @param {{ categoria?:string, texto?:string }} [filtro]
 * @returns {object[]}
 */
export function filtrarOfertas(ofertas, { categoria = '', texto = '' } = {}) {
  const lista = Array.isArray(ofertas) ? ofertas : [];
  const q = String(texto || '').trim().toLowerCase();
  return lista.filter((o) => {
    if (categoria && o.categoria !== categoria) return false;
    if (!q) return true;
    const blob = [o.producto, o.finca, o.vereda, o.municipio, o.nota]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return blob.includes(q);
  });
}
