import {
  DAVID_MARKET_PRODUCTS,
  DAVID_MARKET_SOURCE,
} from '../data/davidMarketReference';

const DEFAULT_PRODUCTS_PATH = '/api/productos';

export function getMarketProductsPath() {
  const configured = import.meta.env.VITE_MARKET_PRODUCTS_PATH;
  return typeof configured === 'string' && configured.trim()
    ? configured.trim()
    : DEFAULT_PRODUCTS_PATH;
}

function parsePrice(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const digits = value.replace(/[^0-9]/g, '');
  return digits ? Number(digits) : null;
}

function firstPhoto(product) {
  const photos = product?.imagenes?.fotos;
  if (Array.isArray(photos) && typeof photos[0]?.url === 'string') return photos[0].url;
  if (typeof product?.foto === 'string') return product.foto;
  if (typeof product?.imagen === 'string') return product.imagen;
  return null;
}

function asTags(product) {
  const tags = product?.tags || product?.etiquetas;
  return Array.isArray(tags) ? tags.filter((tag) => typeof tag === 'string' && tag.trim()) : [];
}

export function normalizeApiProduct(product, index = 0) {
  const source = product?.procedencia?.finca || {};
  const nodeId = String(product?.mercado || 'nodo-sin-identificar');
  const slug = String(product?.slug || product?.id || `producto-${index + 1}`);
  return {
    id: `${nodeId}:${slug}`,
    slug,
    nombre: typeof product?.nombre === 'string' ? product.nombre.trim() : '',
    precioCop: parsePrice(product?.precio_cop ?? product?.precio ?? product?.precio_texto),
    unidad: typeof product?.unidad_venta === 'string'
      ? product.unidad_venta
      : (typeof product?.precio_por === 'string' ? product.precio_por : null),
    foto: firstPhoto(product),
    productor: typeof source.productor === 'string'
      ? source.productor
      : (typeof product?.productor === 'string' ? product.productor : null),
    tags: asTags(product),
    descripcion: typeof product?.descripcion === 'string' ? product.descripcion : null,
    nodeId,
    nodeName: product?.mercado_nombre || nodeId,
    disponible: product?.disponible !== false,
    stock: typeof product?.stock_disponible === 'number' ? product.stock_disponible : null,
    source: {
      url: getMarketProductsPath(),
      sourceId: product?.id ?? null,
    },
  };
}

export function normalizeApiPayload(payload) {
  const products = Array.isArray(payload) ? payload : payload?.productos;
  if (!Array.isArray(products)) {
    throw new Error('La respuesta del mercado no contiene un arreglo productos.');
  }
  return products.map(normalizeApiProduct).filter((product) => product.nombre);
}

export async function fetchFederatedProducts({
  endpoint = getMarketProductsPath(),
  mercado,
  signal,
  fetchImpl = fetch,
} = {}) {
  const baseUrl = globalThis.location?.origin || 'https://market.invalid';
  const url = new URL(endpoint, baseUrl);
  if (mercado) url.searchParams.set('mercado', mercado);
  const response = await fetchImpl(url.toString(), { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`El catálogo respondió ${response.status}.`);
  return normalizeApiPayload(await response.json());
}

function keyFor(product) {
  return String(product?.nombre || '').trim().toLocaleLowerCase('es-CO');
}

export function compareCatalogs(referenceProducts, importedProducts) {
  const referenceByName = new Map(referenceProducts.map((product) => [keyFor(product), product]));
  const importedByName = new Map(importedProducts.map((product) => [keyFor(product), product]));
  const missing = referenceProducts.filter((product) => !importedByName.has(keyFor(product)));
  const unexpected = importedProducts.filter((product) => !referenceByName.has(keyFor(product)));
  const priceMismatches = referenceProducts
    .filter((product) => importedByName.has(keyFor(product)))
    .map((product) => ({
      nombre: product.nombre,
      esperado: product.precioCop,
      importado: importedByName.get(keyFor(product)).precioCop,
    }))
    .filter(({ esperado, importado }) => esperado !== importado);
  return {
    ok: missing.length === 0 && unexpected.length === 0 && priceMismatches.length === 0,
    referenceCount: referenceProducts.length,
    importedCount: importedProducts.length,
    missing,
    unexpected,
    priceMismatches,
  };
}

export function getDavidReferenceProducts() {
  return DAVID_MARKET_PRODUCTS.map((product) => ({ ...product, source: { ...product.source } }));
}

export async function loadFederatedMarket({
  nodeId = import.meta.env.VITE_MARKET_NODE_ID || 'central',
  endpoint,
  signal,
  fetchImpl,
} = {}) {
  if (nodeId === 'milpa' || nodeId === 'milpa-david') {
    let apiProducts = [];
    let apiError = null;
    try {
      apiProducts = await fetchFederatedProducts({ endpoint, mercado: 'milpa', signal, fetchImpl });
    } catch (error) {
      apiError = error;
    }
    const comparison = compareCatalogs(DAVID_MARKET_PRODUCTS, apiProducts);
    return {
      products: getDavidReferenceProducts(),
      nodes: [{ id: 'milpa-david', name: 'MILPA', count: DAVID_MARKET_PRODUCTS.length }],
      source: 'david-reference',
      sourceUrl: DAVID_MARKET_SOURCE,
      comparison,
      apiError,
    };
  }

  const apiProducts = await fetchFederatedProducts({ endpoint, signal, fetchImpl });
  const milpaApiProducts = apiProducts.filter((product) => product.nodeId === 'milpa');
  const comparison = compareCatalogs(DAVID_MARKET_PRODUCTS, milpaApiProducts);
  const verifiedProducts = comparison.ok
    ? apiProducts
    : [
      ...getDavidReferenceProducts(),
      ...apiProducts.filter((product) => product.nodeId !== 'milpa'),
    ];
  const nodeCounts = new Map();
  verifiedProducts.forEach((product) => {
    const key = product.nodeId;
    nodeCounts.set(key, (nodeCounts.get(key) || 0) + 1);
  });
  return {
    products: verifiedProducts,
    nodes: Array.from(nodeCounts, ([id, count]) => ({ id, name: id === 'milpa-david' ? 'MILPA' : id, count })),
    source: 'federated-api',
    sourceUrl: endpoint || getMarketProductsPath(),
    comparison,
    apiError: null,
  };
}
