import { getPrecioSipsa } from './sidecarClient.js';

const CYCLE_SPECIES_TO_SIPSA_PRODUCT = Object.freeze({
  maiz: 'maiz',
  papa: 'papa',
  fresa: 'fresa',
  frijol: 'frijol',
});

export function resolveSipsaProductForCycleSpecies(speciesKey) {
  if (typeof speciesKey !== 'string' || !speciesKey.trim()) return null;
  return CYCLE_SPECIES_TO_SIPSA_PRODUCT[speciesKey.trim()] || null;
}

export function formatCop(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return `$${Math.round(value).toLocaleString('es-CO')}`;
}

export async function fetchLatestSipsaPrice(producto) {
  if (typeof producto !== 'string' || !producto.trim()) return null;
  return getPrecioSipsa('latest_price', { producto: producto.trim() });
}

export function describeSipsaPrice(result, productoLabel = '') {
  const productName = typeof productoLabel === 'string' ? productoLabel.trim() : '';
  const price = result?.price?.precio_promedio_cop_kg;
  const fresh = result?.available === true
    && result?.frescura?.desactualizado === false
    && typeof price === 'number'
    && Number.isFinite(price);

  if (!fresh) {
    const reason = !productName
      ? 'Sin producto SIPSA'
      : `Sin dato SIPSA para ${productName}`;
    return {
      live: false,
      label: 'Sin dato',
      sublabel: reason,
      priceLabel: null,
      central: null,
      precioCopKg: null,
      fechaDato: result?.price?.fecha || result?.frescura?.fecha_dato || null,
      producto: result?.price?.producto || productName || null,
    };
  }

  const priceLabel = `${formatCop(price)} COP/kg`;
  const producto = result?.price?.producto || productName || null;
  const central = result?.central_abastos || result?.price?.plaza || null;
  const fechaDato = result?.price?.fecha || result?.frescura?.fecha_dato || null;
  const parts = ['SIPSA'];
  if (producto) parts.push(producto);
  if (central) parts.push(central);

  return {
    live: true,
    label: priceLabel,
    sublabel: parts.join(' · '),
    priceLabel,
    central,
    precioCopKg: Math.round(price),
    fechaDato,
    producto,
  };
}

