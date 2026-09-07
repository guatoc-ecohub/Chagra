/*
 * Catálogo real de Milpa, tomado de /es/catalogo/.
 *
 * Este archivo contiene únicamente los campos publicados por el catálogo:
 * nombre, precio, unidad y la foto correspondiente. No agrega productos,
 * precios, procedencias ni historias que la fuente no publica.
 */

export const ALTITUD_MIN = 1400;
export const ALTITUD_MAX = 3200;

const FOTO_BASE = '/mercado/fotos-webp';

export const PRODUCTOS = [
  { id: 'acelga-amarilla', nombre: 'Acelga amarilla', precio: 5000, unidad: 'atado', foto: `${FOTO_BASE}/acelga-amarilla.webp` },
  { id: 'acelga-blanca', nombre: 'Acelga blanca', precio: 5000, unidad: 'atado', foto: `${FOTO_BASE}/acelga-blanca.webp` },
  { id: 'acelga-morada', nombre: 'Acelga morada', precio: 5000, unidad: 'atado', foto: `${FOTO_BASE}/acelga-morada.webp` },
  { id: 'albahaca', nombre: 'Albahaca', precio: 4000, unidad: 'atado', foto: `${FOTO_BASE}/albahaca.webp` },
  { id: 'anis', nombre: 'Anís', precio: 4000, unidad: 'atado', foto: `${FOTO_BASE}/anis.webp` },
  { id: 'apio', nombre: 'Apio', precio: 3500, unidad: 'libra', foto: `${FOTO_BASE}/apio.webp` },
  { id: 'cebollin', nombre: 'Cebollín', precio: 3000, unidad: 'atado', foto: `${FOTO_BASE}/cebollin.webp` },
  { id: 'espinaca', nombre: 'Espinaca', precio: 4500, unidad: 'atado', foto: `${FOTO_BASE}/espinaca.webp` },
  { id: 'hinojo', nombre: 'Hinojo', precio: 4000, unidad: 'atado', foto: `${FOTO_BASE}/hinojo.webp` },
  { id: 'kale-crespo-morado', nombre: 'Kale crespo morado', precio: 5000, unidad: 'atado', foto: `${FOTO_BASE}/kale-crespo-morado.webp` },
  { id: 'kale-crespo-verde', nombre: 'Kale crespo verde', precio: 5000, unidad: 'atado', foto: `${FOTO_BASE}/kale-crespo-verde.webp` },
  { id: 'kale-toscano', nombre: 'Kale toscano', precio: 5000, unidad: 'atado', foto: `${FOTO_BASE}/kale-toscano.webp` },
  { id: 'lechuga-crespa-morada', nombre: 'Lechuga crespa morada', precio: 3500, unidad: 'unidad', foto: `${FOTO_BASE}/lechuga-crespa-morada.webp` },
  { id: 'lechuga-crespa-verde', nombre: 'Lechuga crespa verde', precio: 3500, unidad: 'unidad', foto: `${FOTO_BASE}/lechuga-crespa-verde.webp` },
  { id: 'lechuga-hoja-de-roble-morada', nombre: 'Lechuga hoja de roble morada', precio: 3500, unidad: 'unidad', foto: `${FOTO_BASE}/lechuga-hoja-de-roble-morada.webp` },
  { id: 'lechuga-hoja-de-roble-verde', nombre: 'Lechuga hoja de roble verde', precio: 3500, unidad: 'unidad', foto: `${FOTO_BASE}/lechuga-hoja-de-roble-verde.webp` },
  { id: 'lechuga-romana-verde', nombre: 'Lechuga romana verde', precio: 3500, unidad: 'unidad', foto: `${FOTO_BASE}/lechuga-romana-verde.webp` },
  { id: 'limonaria', nombre: 'Limonaria', precio: 3500, unidad: 'atado', foto: `${FOTO_BASE}/limonaria.webp` },
  { id: 'repollo-crespo-verde', nombre: 'Repollo crespo verde', precio: 5000, unidad: 'unidad', foto: `${FOTO_BASE}/repollo-crespo-verde.webp` },
  { id: 'salvia', nombre: 'Salvia', precio: 4000, unidad: 'atado', foto: `${FOTO_BASE}/salvia.webp` },
  { id: 'tomate-cherry', nombre: 'Tomate cherry', precio: 8000, unidad: 'libra', foto: `${FOTO_BASE}/tomate-cherry.webp` },
  { id: 'tomate-san-marzano', nombre: 'Tomate san marzano', precio: 7000, unidad: 'libra', foto: `${FOTO_BASE}/tomate-san-marzano.webp` },
  { id: 'brocoli', nombre: 'Brócoli', precio: 5000, unidad: 'unidad', foto: `${FOTO_BASE}/brocoli.webp` },
  { id: 'calabacin-redondo', nombre: 'Calabacín redondo', precio: 5000, unidad: 'unidad', foto: `${FOTO_BASE}/calabacin-redondo.webp` },
  { id: 'calabacin-redondo-amarillo', nombre: 'Calabacín redondo amarillo', precio: 5000, unidad: 'unidad', foto: `${FOTO_BASE}/calabacin-redondo-amarillo.webp` },
  { id: 'calabacin-redondo-verde', nombre: 'Calabacín redondo verde', precio: 5000, unidad: 'unidad', foto: `${FOTO_BASE}/calabacin-redondo-verde.webp` },
  { id: 'cebolla-cabezona-roja', nombre: 'Cebolla cabezona roja', precio: 3500, unidad: 'libra', foto: `${FOTO_BASE}/cebolla-cabezona-roja.webp` },
  { id: 'cebolla-larga', nombre: 'Cebolla larga', precio: 3000, unidad: 'atado', foto: `${FOTO_BASE}/cebolla-larga.webp` },
  { id: 'cebolla-puerro', nombre: 'Cebolla puerro', precio: 3500, unidad: 'atado', foto: `${FOTO_BASE}/cebolla-puerro.webp` },
  { id: 'coliflor', nombre: 'Coliflor', precio: 5500, unidad: 'unidad', foto: `${FOTO_BASE}/coliflor.webp` },
  { id: 'esparragos', nombre: 'Espárragos', precio: 6000, unidad: 'atado', foto: `${FOTO_BASE}/esparragos.webp` },
  { id: 'lechuga-cogollo-morado', nombre: 'Lechuga cogollo morado', precio: 4000, unidad: 'unidad', foto: `${FOTO_BASE}/lechuga-cogollo-morado.webp` },
  { id: 'perejil-crespo', nombre: 'Perejil crespo', precio: 3000, unidad: 'atado', foto: `${FOTO_BASE}/perejil-crespo.webp` },
  { id: 'perejil-liso', nombre: 'Perejil liso', precio: 3000, unidad: 'atado', foto: `${FOTO_BASE}/perejil-liso.webp` },
  { id: 'rabano', nombre: 'Rábano', precio: 3500, unidad: 'atado', foto: `${FOTO_BASE}/rabano.webp` },
  { id: 'remolacha', nombre: 'Remolacha', precio: 4500, unidad: 'libra', foto: `${FOTO_BASE}/remolacha.webp` },
  { id: 'repollo-liso-morado', nombre: 'Repollo liso morado', precio: 5000, unidad: 'unidad', foto: `${FOTO_BASE}/repollo-liso-morado.webp` },
  { id: 'rucula', nombre: 'Rúcula', precio: 4000, unidad: 'atado', foto: `${FOTO_BASE}/rucula.webp` },
  { id: 'ruda', nombre: 'Ruda', precio: 3000, unidad: 'atado', foto: `${FOTO_BASE}/ruda.webp` },
  { id: 'zucchini-amarillo', nombre: 'Zucchini amarillo', precio: 5000, unidad: 'unidad', foto: `${FOTO_BASE}/zucchini-amarillo.webp` },
  { id: 'zucchini-verde', nombre: 'Zucchini verde', precio: 5000, unidad: 'unidad', foto: `${FOTO_BASE}/zucchini-verde.webp` },
];

/* Compatibilidad con la cinta antigua: el catálogo real no publica altitud. */
export function pisoDeAltitud(altitud) {
  if (altitud >= 3000) return { slug: 'paramo', nombre: 'Páramo', hex: '#3f7f9e', rango: 'sobre 3.000 m' };
  if (altitud >= 2000) return { slug: 'frio', nombre: 'Frío', hex: '#5f8f80', rango: '2.000 a 3.000 m' };
  return { slug: 'templado', nombre: 'Templado', hex: '#c1902f', rango: '1.000 a 2.000 m' };
}

export function fincasUnicas(productos = PRODUCTOS) {
  return productos.filter((producto) => producto.finca).reduce((fincas, producto) => {
    if (!fincas.some((finca) => finca.id === producto.finca.nombre)) {
      fincas.push({
        id: producto.finca.nombre,
        productoId: producto.id,
        ...producto.finca,
      });
    }
    return fincas;
  }, []);
}

/* Formatea un precio entero en pesos colombianos: 5000 → "$ 5.000". */
export function pesos(valor) {
  const entero = Math.round(valor);
  const conMiles = String(entero).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$ ${conMiles}`;
}
