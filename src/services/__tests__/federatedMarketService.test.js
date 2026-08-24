import { describe, expect, it } from 'vitest';
import {
  compareCatalogs,
  normalizeApiPayload,
} from '../federatedMarketService';
import { DAVID_MARKET_PRODUCTS } from '../../data/davidMarketReference';

describe('federatedMarketService', () => {
  it('normaliza la estructura del endpoint sin inventar campos ausentes', () => {
    const [product] = normalizeApiPayload({ productos: [{
      id: 7,
      slug: 'papa-criolla',
      mercado: 'veredas',
      mercado_nombre: 'Veredas de la montaña',
      nombre: 'Papa criolla',
      precio_cop: 3900,
      unidad_venta: 'libra',
      imagenes: { fotos: [{ url: '/fotos/papa.webp' }] },
      procedencia: { finca: { productor: 'La familia de El Alto' } },
    }] });

    expect(product).toMatchObject({
      nombre: 'Papa criolla',
      precioCop: 3900,
      unidad: 'libra',
      foto: '/fotos/papa.webp',
      productor: 'La familia de El Alto',
      tags: [],
    });
  });

  it('marca la discrepancia actual entre la referencia pública y el feed', () => {
    const result = compareCatalogs(DAVID_MARKET_PRODUCTS, [{
      nombre: 'Tomate San Marzano',
      precioCop: 9000,
    }]);

    expect(result.ok).toBe(false);
    expect(result.referenceCount).toBe(8);
    expect(result.importedCount).toBe(1);
    expect(result.missing).toHaveLength(8);
    expect(result.unexpected).toHaveLength(1);
  });

  it('acepta una coincidencia exacta de nombres y precios', () => {
    const imported = DAVID_MARKET_PRODUCTS.map(({ nombre, precioCop }) => ({ nombre, precioCop }));
    expect(compareCatalogs(DAVID_MARKET_PRODUCTS, imported).ok).toBe(true);
  });
});
