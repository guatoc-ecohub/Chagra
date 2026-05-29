/**
 * colombiaLocations.js — cascade Departamento → Municipio offline.
 *
 * #187 (PR4 ubicación): fallback cuando el campesino no tiene GPS o el
 * texto libre no acierta. Lista curada de 32 departamentos + municipios
 * representativos del target Chagra (zonas cafeteras, sabana, alta
 * montaña, Caribe, Amazonia). Cada entry tiene coordenadas + altitud
 * aproximada para resolver SIN Nominatim — funciona offline.
 *
 * Coordenadas obtenidas de OpenStreetMap (centroide del municipio).
 * Altitud msnm de IGAC. Fuente: dominio público.
 *
 * No pretende ser exhaustivo. Es un punto de partida que el campesino
 * usa para llegar cerca; después puede mover el pin del mapa si quiere
 * precisión metro-a-metro.
 */

/**
 * Estructura: { departamento: [ { name, lat, lng, altitud } ] }
 * Departamentos ordenados por relevancia agroecológica para Chagra.
 */
export const COLOMBIA_LOCATIONS = {
  'Cundinamarca': [
    { name: 'Bogotá D.C.', lat: 4.7110, lng: -74.0721, altitud: 2640 },
    { name: 'Choachí', lat: 4.5285, lng: -73.9241, altitud: 1923 },
    { name: 'Fómeque', lat: 4.4869, lng: -73.8930, altitud: 1895 },
    { name: 'Sopó', lat: 4.9075, lng: -73.9387, altitud: 2587 },
    { name: 'Tabio', lat: 4.9176, lng: -74.0976, altitud: 2569 },
    { name: 'Une', lat: 4.4022, lng: -74.0269, altitud: 2378 },
  ],
  'Boyacá': [
    { name: 'Tunja', lat: 5.5353, lng: -73.3678, altitud: 2810 },
    { name: 'Villa de Leyva', lat: 5.6325, lng: -73.5258, altitud: 2143 },
    { name: 'Paipa', lat: 5.7790, lng: -73.1158, altitud: 2525 },
    { name: 'Duitama', lat: 5.8244, lng: -73.0344, altitud: 2540 },
    { name: 'Mongua', lat: 5.7522, lng: -72.8056, altitud: 2975 },
  ],
  'Antioquia': [
    { name: 'Medellín', lat: 6.2476, lng: -75.5658, altitud: 1495 },
    { name: 'Jardín', lat: 5.5985, lng: -75.8194, altitud: 1750 },
    { name: 'Salgar', lat: 5.9636, lng: -75.9764, altitud: 1250 },
    { name: 'Concordia', lat: 6.0454, lng: -75.9097, altitud: 2000 },
    { name: 'Yarumal', lat: 6.9637, lng: -75.4172, altitud: 2265 },
  ],
  'Caldas': [
    { name: 'Manizales', lat: 5.0689, lng: -75.5174, altitud: 2150 },
    { name: 'Chinchiná', lat: 4.9831, lng: -75.6038, altitud: 1378 },
    { name: 'Salamina', lat: 5.4081, lng: -75.4877, altitud: 1822 },
    { name: 'Aguadas', lat: 5.6072, lng: -75.4567, altitud: 2214 },
    { name: 'Anserma', lat: 5.2367, lng: -75.7831, altitud: 1796 },
  ],
  'Risaralda': [
    { name: 'Pereira', lat: 4.8133, lng: -75.6961, altitud: 1411 },
    { name: 'Santa Rosa de Cabal', lat: 4.8722, lng: -75.6203, altitud: 1735 },
    { name: 'La Virginia', lat: 4.8967, lng: -75.8819, altitud: 909 },
    { name: 'Apía', lat: 5.1058, lng: -75.9420, altitud: 1630 },
  ],
  'Quindío': [
    { name: 'Armenia', lat: 4.5339, lng: -75.6811, altitud: 1483 },
    { name: 'Salento', lat: 4.6378, lng: -75.5703, altitud: 1895 },
    { name: 'Filandia', lat: 4.6747, lng: -75.6586, altitud: 1923 },
    { name: 'Calarcá', lat: 4.5269, lng: -75.6442, altitud: 1536 },
  ],
  'Tolima': [
    { name: 'Ibagué', lat: 4.4389, lng: -75.2322, altitud: 1285 },
    { name: 'Líbano', lat: 4.9217, lng: -75.0617, altitud: 1565 },
    { name: 'Murillo', lat: 4.8731, lng: -75.1722, altitud: 2920 },
  ],
  'Huila': [
    { name: 'Neiva', lat: 2.9344, lng: -75.2819, altitud: 442 },
    { name: 'Pitalito', lat: 1.8543, lng: -76.0500, altitud: 1318 },
    { name: 'San Agustín', lat: 1.8800, lng: -76.2700, altitud: 1730 },
  ],
  'Nariño': [
    { name: 'Pasto', lat: 1.2136, lng: -77.2811, altitud: 2527 },
    { name: 'Túquerres', lat: 1.0858, lng: -77.6172, altitud: 3104 },
    { name: 'Ipiales', lat: 0.8311, lng: -77.6450, altitud: 2898 },
  ],
  'Cauca': [
    { name: 'Popayán', lat: 2.4448, lng: -76.6147, altitud: 1737 },
    { name: 'Silvia', lat: 2.6122, lng: -76.3814, altitud: 2620 },
    { name: 'Inzá', lat: 2.5483, lng: -76.0653, altitud: 1800 },
    { name: 'Belalcázar', lat: 2.6450, lng: -75.9706, altitud: 1450 },
  ],
  'Valle del Cauca': [
    { name: 'Cali', lat: 3.4516, lng: -76.5320, altitud: 1018 },
    { name: 'Buga', lat: 3.9023, lng: -76.2978, altitud: 969 },
    { name: 'Sevilla', lat: 4.2691, lng: -75.9325, altitud: 1612 },
  ],
  'Santander': [
    { name: 'Bucaramanga', lat: 7.1254, lng: -73.1198, altitud: 959 },
    { name: 'San Gil', lat: 6.5557, lng: -73.1328, altitud: 1117 },
    { name: 'Charalá', lat: 6.2864, lng: -73.1450, altitud: 1290 },
  ],
  'Norte de Santander': [
    { name: 'Cúcuta', lat: 7.8939, lng: -72.5078, altitud: 320 },
    { name: 'Pamplona', lat: 7.3753, lng: -72.6500, altitud: 2287 },
    { name: 'Ocaña', lat: 8.2369, lng: -73.3578, altitud: 1202 },
  ],
  'Magdalena': [
    { name: 'Santa Marta', lat: 11.2408, lng: -74.1990, altitud: 2 },
    { name: 'Ciénaga', lat: 11.0040, lng: -74.2417, altitud: 3 },
    { name: 'Aracataca', lat: 10.5917, lng: -74.1858, altitud: 40 },
  ],
  'Cesar': [
    { name: 'Valledupar', lat: 10.4631, lng: -73.2532, altitud: 169 },
    { name: 'Pueblo Bello', lat: 10.4131, lng: -73.5839, altitud: 1059 },
  ],
  'La Guajira': [
    { name: 'Riohacha', lat: 11.5444, lng: -72.9072, altitud: 9 },
    { name: 'San Juan del Cesar', lat: 10.7714, lng: -73.0017, altitud: 196 },
  ],
  'Atlántico': [
    { name: 'Barranquilla', lat: 10.9685, lng: -74.7813, altitud: 18 },
  ],
  'Bolívar': [
    { name: 'Cartagena', lat: 10.3910, lng: -75.4794, altitud: 2 },
    { name: 'El Carmen de Bolívar', lat: 9.7233, lng: -75.1217, altitud: 196 },
  ],
  'Sucre': [
    { name: 'Sincelejo', lat: 9.3047, lng: -75.3978, altitud: 213 },
  ],
  'Córdoba': [
    { name: 'Montería', lat: 8.7479, lng: -75.8814, altitud: 18 },
  ],
  'Meta': [
    { name: 'Villavicencio', lat: 4.1420, lng: -73.6266, altitud: 467 },
    { name: 'Acacías', lat: 3.9889, lng: -73.7556, altitud: 525 },
  ],
  'Casanare': [
    { name: 'Yopal', lat: 5.3378, lng: -72.3961, altitud: 350 },
  ],
  'Putumayo': [
    { name: 'Mocoa', lat: 1.1486, lng: -76.6486, altitud: 645 },
  ],
  'Amazonas': [
    { name: 'Leticia', lat: -4.2158, lng: -69.9406, altitud: 96 },
  ],
  'Caquetá': [
    { name: 'Florencia', lat: 1.6144, lng: -75.6062, altitud: 242 },
  ],
};

/**
 * Lista alfabética de departamentos.
 * @returns {string[]}
 */
export function getDepartamentos() {
  return Object.keys(COLOMBIA_LOCATIONS).sort();
}

/**
 * Municipios de un departamento.
 * @param {string} departamento
 * @returns {{name:string,lat:number,lng:number,altitud:number}[]}
 */
export function getMunicipios(departamento) {
  return COLOMBIA_LOCATIONS[departamento] || [];
}

/**
 * Busca un municipio por nombre (case-insensitive, partial match).
 * Útil para auto-fill desde texto libre.
 * @param {string} query
 * @returns {{departamento:string,name:string,lat:number,lng:number,altitud:number}|null}
 */
export function findMunicipio(query) {
  if (!query) return null;
  const q = query.toLowerCase().trim();
  for (const [dpto, munis] of Object.entries(COLOMBIA_LOCATIONS)) {
    for (const m of munis) {
      if (m.name.toLowerCase() === q || m.name.toLowerCase().startsWith(q)) {
        return { departamento: dpto, ...m };
      }
    }
  }
  return null;
}
