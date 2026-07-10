/*
 * Datos de MUESTRA del mockup mercado.chagra.bio (galería de diseño, público,
 * sin auth). Fincas, veredas y productores son FICTICIOS y genéricos — no
 * corresponden a personas ni predios reales. El copy final migraría a
 * src/config/messages.js igual que el resto de la galería. Español Colombia,
 * usted.
 *
 * El diferencial del mercado es la PROCEDENCIA: cada producto se ubica en la
 * montaña por su ALTITUD (metros s. n. m.) y su PISO TÉRMICO, con la cara de
 * quien lo sembró, su finca y su vereda.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish -- seed de datos de MUESTRA
   del mockup (galería): el copy final migraría a src/config/messages.js, mismo
   criterio que src/data/marketplaceSeed.js y el resto de seeds. */

/* Rango del eje de altitud del mockup (metros s. n. m.). Encima de la montaña
   dibujada; las fincas caen dentro de este rango. */
export const ALTITUD_MIN = 1400;
export const ALTITUD_MAX = 3200;

/* Pisos térmicos presentes en el mercado. `slug` engancha con el grade de luz
   de la librería de efectos (vfx-grade--<slug>); `hex` es el acento funcional
   para los chips (espectro frío→cálido). Orden: de más alto a más templado. */
export const PISOS = {
  paramo: { slug: 'paramo', nombre: 'Páramo', hex: '#3f7f9e', rango: 'sobre 3.000 m' },
  frio: { slug: 'frio', nombre: 'Frío', hex: '#5f8f80', rango: '2.000 a 3.000 m' },
  templado: { slug: 'templado', nombre: 'Templado', hex: '#c1902f', rango: '1.000 a 2.000 m' },
};

/* Clasifica una altitud (m s. n. m.) en su piso térmico. */
export function pisoDeAltitud(altitud) {
  if (altitud >= 3000) return PISOS.paramo;
  if (altitud >= 2000) return PISOS.frio;
  return PISOS.templado;
}

/*
 * Catálogo de muestra. Cada producto trae su finca (procedencia), precio en
 * pesos colombianos, sellos de confianza y la trazabilidad de la cosecha.
 *
 * - `ilustracion`: clave del dibujo SVG propio (ProductoIlustracion).
 * - `rostro`: semilla del avatar del productor (Rostro) — cara ilustrada, no
 *   foto; genérica y ficticia.
 * - `precio`/`unidad`: se muestran como "$ 4.800 / libra".
 * - `sellos`: sellos de confianza cortos (rótulo de estampa).
 * - `trazabilidad`: hitos de la cosecha, en orden.
 */
export const PRODUCTOS = [
  {
    id: 'tomate-chonto',
    nombre: 'Tomate chonto',
    variedad: 'de rama, madurado en la mata',
    ilustracion: 'tomate',
    precio: 4800,
    unidad: 'libra',
    finca: {
      nombre: 'Finca El Rocío',
      vereda: 'La Esperanza',
      altitud: 2180,
      productor: 'Doña Emilia',
      rostro: { piel: '#c98a5e', pelo: '#3a2a1c', tocado: 'panuelo', tocadoColor: '#b8452e' },
    },
    sellos: ['Sembrado sin químicos', 'Cosechado el 8 de julio'],
    historia:
      'En El Rocío el tomate se deja madurar en la mata, no en la bodega. Doña Emilia lo abona con el compost de sus propias camas y lo riega con el agua de la quebrada que baja del alto. Por eso llega blando, oloroso y con el color parejo del que maduró al sol.',
    trazabilidad: [
      { hito: 'Sembrado', fecha: '3 de abril' },
      { hito: 'Abonado con compost de la finca', fecha: '2 de mayo' },
      { hito: 'Deshierbado a mano', fecha: '10 de junio' },
      { hito: 'Cosechado', fecha: '8 de julio' },
    ],
  },
  {
    id: 'mora-castilla',
    nombre: 'Mora de Castilla',
    variedad: 'recogida madura, una por una',
    ilustracion: 'mora',
    precio: 6500,
    unidad: 'libra',
    finca: {
      nombre: 'Finca La Cabaña',
      vereda: 'El Retiro',
      altitud: 2640,
      productor: 'Don Aurelio',
      rostro: { piel: '#8a5a38', pelo: '#20140c', tocado: 'sombrero', tocadoColor: '#c9a26a' },
    },
    sellos: ['Recolección a mano', 'Cosechada el 9 de julio'],
    historia:
      'La mora de La Cabaña crece en el filo, donde el frío la pone dulce y firme. Don Aurelio la recoge una por una, solo la que ya está negra pareja, para que no llegue verde ni magullada. Nada de madurar en camino: la corta en la mañana y baja el mismo día.',
    trazabilidad: [
      { hito: 'Podada la mata', fecha: '15 de marzo' },
      { hito: 'Abonada con gallinaza compostada', fecha: '20 de abril' },
      { hito: 'Primera recolección', fecha: '28 de junio' },
      { hito: 'Cosechada', fecha: '9 de julio' },
    ],
  },
  {
    id: 'papa-criolla',
    nombre: 'Papa criolla',
    variedad: 'amarilla, de tierra de páramo',
    ilustracion: 'papa',
    precio: 3900,
    unidad: 'libra',
    finca: {
      nombre: 'Finca Los Helechos',
      vereda: 'Peñas Blancas',
      altitud: 3050,
      productor: 'La familia Rueda',
      rostro: { piel: '#b57a4c', pelo: '#2b1d12', tocado: 'ruana', tocadoColor: '#7a4a2c' },
    },
    sellos: ['Sin agroquímicos', 'Sacada el 7 de julio'],
    historia:
      'Arriba, en Peñas Blancas, la tierra negra del páramo le da a la papa criolla ese amarillo intenso por dentro. La familia Rueda la siembra en rotación con habas para no cansar el suelo, y la saca con azadón el mismo día que la despacha, con la tierra todavía fresca encima.',
    trazabilidad: [
      { hito: 'Sembrada', fecha: '10 de febrero' },
      { hito: 'Aporcada', fecha: '25 de abril' },
      { hito: 'Rotación con habas', fecha: 'ciclo anterior' },
      { hito: 'Sacada', fecha: '7 de julio' },
    ],
  },
  {
    id: 'cafe-pergamino',
    nombre: 'Café pergamino',
    variedad: 'lavado, secado al sol',
    ilustracion: 'cafe',
    precio: 22000,
    unidad: 'libra',
    finca: {
      nombre: 'Finca La Aurora',
      vereda: 'El Silencio',
      altitud: 1650,
      productor: 'Don Fermín',
      rostro: { piel: '#d29a68', pelo: '#4a3520', tocado: 'sombrero', tocadoColor: '#d8b878' },
    },
    sellos: ['Recogido grano rojo', 'Secado al sol'],
    historia:
      'En La Aurora solo se recoge el grano bien rojo, el que ya está de punto. Don Fermín lo despulpa el mismo día, lo lava con agua de nacimiento y lo seca al sol en marquesina, volteándolo a mano. Por eso el pergamino queda parejo y sin ese sabor a fermento apurado.',
    trazabilidad: [
      { hito: 'Floración', fecha: 'enero' },
      { hito: 'Recolección selectiva', fecha: 'junio a julio' },
      { hito: 'Lavado y despulpado', fecha: 'el mismo día' },
      { hito: 'Secado al sol', fecha: 'julio' },
    ],
  },
  {
    id: 'miel-angelita',
    nombre: 'Miel de angelita',
    variedad: 'abeja nativa sin aguijón',
    ilustracion: 'miel',
    precio: 34000,
    unidad: 'frasco de 250 g',
    finca: {
      nombre: 'Finca El Colibrí',
      vereda: 'Aguas Claras',
      altitud: 1950,
      productor: 'Doña Rosalba',
      rostro: { piel: '#a86a42', pelo: '#1c130b', tocado: 'panuelo', tocadoColor: '#3f7f5a' },
    },
    sellos: ['Meliponicultura nativa', 'Cosecha que no daña el nido'],
    historia:
      'La miel de El Colibrí la hacen abejas angelita, nativas y sin aguijón, que Doña Rosalba cría en cajones de madera bajo los árboles. Se cosecha poquito y con cuidado, sin destruir el nido, por eso rinde tan poco y sabe distinto: más ácida, casi como fruta.',
    trazabilidad: [
      { hito: 'División de colmenas', fecha: 'marzo' },
      { hito: 'Floración del monte', fecha: 'abril a junio' },
      { hito: 'Cosecha de potes', fecha: '2 de julio' },
      { hito: 'Envasada a mano', fecha: '3 de julio' },
    ],
  },
  {
    id: 'aguacate-hass',
    nombre: 'Aguacate Hass',
    variedad: 'cortado de punto, no verde',
    ilustracion: 'aguacate',
    precio: 2500,
    unidad: 'unidad',
    finca: {
      nombre: 'Finca La Palma',
      vereda: 'El Progreso',
      altitud: 1780,
      productor: 'Don Isidro',
      rostro: { piel: '#c98a5e', pelo: '#6b6b6b', tocado: 'sombrero', tocadoColor: '#c9a26a' },
    },
    sellos: ['Sin madurantes', 'Cortado el 6 de julio'],
    historia:
      'Don Isidro no tumba el aguacate al piso: lo corta con gancho cuando ya tiene el aceite hecho, ni antes ni después. En La Palma los árboles conviven con plátano y guamo que les dan sombra, así la fruta no se estresa y madura pareja en la casa, sin cámaras ni químicos.',
    trazabilidad: [
      { hito: 'Cuajado del fruto', fecha: 'febrero' },
      { hito: 'Sombra con guamo y plátano', fecha: 'todo el ciclo' },
      { hito: 'Prueba de aceite', fecha: 'inicio de julio' },
      { hito: 'Cortado con gancho', fecha: '6 de julio' },
    ],
  },
];

/* Formatea un precio entero en pesos colombianos: 4800 → "$ 4.800". Punto de
   miles a la colombiana, sin decimales. */
export function pesos(valor) {
  const entero = Math.round(valor);
  const conMiles = String(entero).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$ ${conMiles}`;
}
