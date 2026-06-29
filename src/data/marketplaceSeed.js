/* i18n (ADR-050): este archivo es DATA (ofertas de ejemplo del marketplace) con
 * nombres de finca/producto/vereda en español Colombia — contenido, no UI
 * traducible. La regla chagra-i18n es soft (warn); se desactiva a nivel de
 * archivo como en otros data files. Los errores reales siguen activos. */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
/**
 * marketplaceSeed.js — ofertas de EJEMPLO del marketplace agroecológico.
 *
 * Encuadre (circuitos cortos / agroferias / mercados campesinos): el mercado de
 * Chagra conecta fincas vecinas de forma directa, sin intermediarios. Para que
 * la pantalla "Explorar" no aparezca vacía en el primer arranque (y para
 * mostrar el patrón de una oferta bien hecha), sembramos un puñado de ofertas
 * de DEMOSTRACIÓN de otras fincas.
 *
 * Estos registros son ILUSTRATIVOS — `demo:true` los marca como tal y la UI los
 * rotula "ejemplo". NO son fincas reales ni contactos reales: los teléfonos son
 * de relleno (no enrutables) y las veredas son genéricas. El precio que trae
 * cada oferta es el que "pondría el productor", NO un precio de referencia
 * mayorista (ese se cita aparte, solo si hay fuente — ver precioReferencia.js).
 *
 * Cuando el productor publica su primera oferta real, conviven con estas; puede
 * ocultar los ejemplos desde la pantalla.
 *
 * @module data/marketplaceSeed
 */

/**
 * Categorías agroecológicas del marketplace. Sirven para filtrar en "Explorar"
 * y para clasificar al publicar.
 * @type {ReadonlyArray<{id:string, label:string, icon:string}>}
 */
export const CATEGORIAS = Object.freeze([
  { id: 'hortaliza', label: 'Hortalizas', icon: '🥬' },
  { id: 'fruta', label: 'Frutas', icon: '🍓' },
  { id: 'tuberculo', label: 'Tubérculos', icon: '🥔' },
  { id: 'grano', label: 'Granos y cereales', icon: '🌽' },
  { id: 'aromatica', label: 'Aromáticas y medicinales', icon: '🌿' },
  { id: 'cafe', label: 'Café y cacao', icon: '☕' },
  { id: 'miel', label: 'Miel y derivados', icon: '🍯' },
  { id: 'huevo', label: 'Huevos y aves', icon: '🥚' },
  { id: 'procesado', label: 'Procesados de finca', icon: '🫙' },
  { id: 'semilla', label: 'Semillas nativas', icon: '🌱' },
  { id: 'otro', label: 'Otro', icon: '📦' },
]);

/** Unidades de venta admitidas al publicar. */
export const UNIDADES = Object.freeze([
  'kg', 'libra', 'arroba', 'bulto', 'canasta', 'manojo', 'docena', 'unidad', 'litro',
]);

/**
 * Ofertas de ejemplo (demo). El id lleva prefijo `seed-` para distinguirlas de
 * las publicadas por el usuario y para que la UI pueda ocultarlas en bloque.
 *
 * @type {ReadonlyArray<object>}
 */
export const OFERTAS_SEED = Object.freeze([
  {
    id: 'seed-1',
    demo: true,
    producto: 'Tomate chonto agroecológico',
    categoria: 'hortaliza',
    cantidad: 80,
    unidad: 'kg',
    precio: 2400,
    moneda: 'COP',
    finca: 'Finca La Esperanza',
    vereda: 'Vereda El Roble',
    municipio: 'Cundinamarca',
    contactoTel: '',
    nota: 'Cosecha sin químicos de síntesis. Disponible los viernes para mercado campesino.',
    createdAt: 0,
  },
  {
    id: 'seed-2',
    demo: true,
    producto: 'Mora de Castilla',
    categoria: 'fruta',
    cantidad: 25,
    unidad: 'kg',
    precio: 5000,
    moneda: 'COP',
    finca: 'Finca El Mirador',
    vereda: 'Vereda Aguas Claras',
    municipio: 'Boyacá',
    contactoTel: '',
    nota: 'Recolección del día. Entrega en agrofería del domingo.',
    createdAt: 0,
  },
  {
    id: 'seed-3',
    demo: true,
    producto: 'Miel de abejas multifloral',
    categoria: 'miel',
    cantidad: 12,
    unidad: 'litro',
    precio: 38000,
    moneda: 'COP',
    finca: 'Apiario Las Flores',
    vereda: 'Vereda La Cumbre',
    municipio: 'Santander',
    contactoTel: '',
    nota: 'Cosecha de temporada seca. Envase de vidrio reutilizable.',
    createdAt: 0,
  },
  {
    id: 'seed-4',
    demo: true,
    producto: 'Papa criolla',
    categoria: 'tuberculo',
    cantidad: 3,
    unidad: 'bulto',
    precio: 95000,
    moneda: 'COP',
    finca: 'Finca Buenavista',
    vereda: 'Vereda El Páramo',
    municipio: 'Cundinamarca',
    contactoTel: '',
    nota: 'Semilla propia, suelo descansado. Bulto de 50 kg.',
    createdAt: 0,
  },
  {
    id: 'seed-5',
    demo: true,
    producto: 'Café pergamino seco',
    categoria: 'cafe',
    cantidad: 2,
    unidad: 'arroba',
    precio: 130000,
    moneda: 'COP',
    finca: 'Finca El Cafetal',
    vereda: 'Vereda Las Brisas',
    municipio: 'Huila',
    contactoTel: '',
    nota: 'Beneficio lavado, secado al sol. Trazabilidad de lote disponible.',
    createdAt: 0,
  },
  {
    id: 'seed-6',
    demo: true,
    producto: 'Huevos campesinos de gallina feliz',
    categoria: 'huevo',
    cantidad: 30,
    unidad: 'docena',
    precio: 9000,
    moneda: 'COP',
    finca: 'Granja La Pradera',
    vereda: 'Vereda San José',
    municipio: 'Cundinamarca',
    contactoTel: '',
    nota: 'Gallinas en pastoreo con cama profunda. Recolección diaria.',
    createdAt: 0,
  },
]);
