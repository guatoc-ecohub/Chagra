/*
 * Snapshot verificable de la sección #productos de Milpa Choachí.
 *
 * La página fuente es HTML renderizado por Astro. No expone una API pública ni
 * informa unidad, productor por producto o tags. Esas ausencias se conservan
 * como null/[] para que el nodo no complete datos por inferencia.
 */
export const DAVID_MARKET_SOURCE = 'https://milpa-test.milpachoachi.co/es/#productos';
export const DAVID_MARKET_CAPTURED_AT = '2026-08-24';

const PHOTO_BASE = 'https://milpa-test.milpachoachi.co';

const reference = [
  ['rucula', 'Rúcula', 4000, 'foto.gtdiRTsF.jpg', 'Toque picante, fresca de la huerta.'],
  ['brocoli', 'Brócoli', 5000, 'foto.B4hd-rJM.jpg', 'Cosechado fresco de nuestro invernadero.'],
  ['calabacin-redondo', 'Calabacín redondo', 5000, 'foto.BXfj2SGw.jpg', 'Fresco de la huerta, versátil en la cocina.'],
  ['calabacin-redondo-amarillo', 'Calabacín redondo amarillo', 5000, 'foto.Dvzqi6bN.jpg', 'Pulpa suave y dulce, ideal al horno o a la plancha.'],
  ['calabacin-redondo-verde', 'Calabacín redondo verde', 5000, 'foto.CsG-QMft.jpg', 'Textura firme y sabor suave, perfecto salteado.'],
  ['cebolla-cabezona-roja', 'Cebolla cabezona roja', 3500, 'foto.Bti17C21.jpg', 'Sabor intenso, base de nuestras preparaciones.'],
  ['cebolla-larga', 'Cebolla larga', 3000, 'foto.CYFFeOv-.jpg', 'Fresca y aromática, infaltable en la cocina diaria.'],
  ['cebolla-puerro', 'Cebolla puerro', 3500, 'foto.DBCWk8hg.jpg', 'Sabor suave y dulce, ideal para caldos y cremas.'],
].map(([slug, nombre, precioCop, photo, descripcion]) => ({
  id: `milpa-david:${slug}`,
  slug,
  nombre,
  precioCop,
  unidad: null,
  foto: `${PHOTO_BASE}/_astro/${photo}`,
  productor: null,
  tags: [],
  descripcion,
  nodeId: 'milpa-david',
  nodeName: 'MILPA',
  source: {
    url: DAVID_MARKET_SOURCE,
    section: 'productos',
    capturedAt: DAVID_MARKET_CAPTURED_AT,
  },
}));

export const DAVID_MARKET_PRODUCTS = Object.freeze(reference);
