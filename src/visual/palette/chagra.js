/*
 * palette/chagra — la PALETA CANÓNICA compartida 2D↔3D del framework de mundos.
 *
 * Los gemelos 2D (laminas2d/Corte2D, Flujo2D, Recinto2D, Estratos2D) tienen que
 * verse como el MISMO mundo que su diorama 3D — no como otra app. Para eso los
 * colores clave de cada arquetipo viven AQUÍ, una sola vez, con el MISMO valor
 * que usa la escena 3D (`escenas/EscenaCutaway.jsx`, `EscenaFlujo.jsx`,
 * `EscenaRecinto.jsx`, `EscenaEstratos.jsx`). Si un día cambia el tono de la
 * tierra o del agua, se cambia en un lugar y 2D+3D quedan sincronizados.
 *
 * NO reemplaza el `tinte` por-mundo (ese viene de `mundosFinca.js` y tiñe los
 * acentos/botones); esto fija los tonos ESTRUCTURALES del motivo (capas de
 * suelo, agua, corral, estratos) que deben ser idénticos en las dos dimensiones.
 *
 * Regla: alto contraste. Los tonos de "tinta/etiqueta" (`TINTA`, `PAPEL`) están
 * calibrados para leer AA sobre los fondos claros de cada gemelo.
 */

/* Tinta y papel de las etiquetas (contraste AA sobre fondos claros del gemelo). */
export const TINTA = '#2a2016'; // texto principal (≈ #2a2016 del mundo.css)
export const TINTA_SUAVE = '#5a4a34'; // texto secundario
export const PAPEL = '#fffdf7'; // pastilla de etiqueta

/* CORTE / cutaway — la tierra viva en corte (= EscenaCutaway). */
export const SUELO = {
  pasto: '#6f9a45', // borde de pasto sobre la superficie
  cielo: '#e7d7ba', // fondo cálido del corte
  // vida del suelo (mismos tonos que los meshes 3D)
  lombriz: '#e8b6a6',
  lombrizCuerpo: '#c0715a', // = creature Lombriz (trazo exterior)
  raiz: '#c9a86a',
  hifa: '#f2ece0', // micorriza / "internet de hongos"
  // capas por defecto si el mundo no declara `params.capas`
  capas: [
    { nombre: 'hojarasca', color: '#6b4a2e', alto: 0.5, bichos: ['lombriz'] },
    { nombre: 'suelo negro', color: '#3a2a1a', alto: 1.2, bichos: ['lombriz', 'raiz', 'hifa'] },
    { nombre: 'subsuelo', color: '#8a6a44', alto: 1.0, bichos: ['raiz'] },
  ],
};

/* FLUJO / flujo — el camino del agua (= EscenaFlujo). */
export const AGUA = {
  agua: '#3f8fb0', // la cinta de agua
  aguaClara: '#8fc7dc', // reflejo / gota clara
  cielo: '#eaf3f5', // fondo del valle húmedo
  ladera: '#7d9a5c', // la pendiente
  laderaSombra: '#5f7d44',
  tanque: '#9a8b74', // la toma / el tanque
};

/* RECINTO / recinto — el corral y su ciclo (= EscenaRecinto), vista de planta. */
export const CORRAL = {
  piso: '#a98a5c', // piso del corral
  pisoClaro: '#c2a878',
  cielo: '#f6ead2', // papel cálido del recinto
  poste: '#8a6a44', // postes de la cerca
  aro: '#7a9a3f', // el aro del ciclo cerrado (abono que vuelve)
  abono: '#5a4326', // la pila de estiércol al centro
  // tonos de los animales (mismos que params.animales del mundo)
  animales: ['#e7d9c2', '#c98a5a', '#d8c49a'],
};

/* ESTRATOS / estratos — la verticalidad del bosque comestible (= EscenaEstratos).
   7 estratos comestibles, de arriba (emergente) a abajo (raíz). */
export const ESTRATOS = {
  cielo: '#eaf2df', // fondo del bosque
  tronco: '#6b4a2e',
  suelo: '#6d5030',
  def: [
    { nombre: 'Emergente', color: '#2f5f34', forma: 'arbol' },
    { nombre: 'Dosel', color: '#3a6f3f', forma: 'arbol' },
    { nombre: 'Sub-dosel', color: '#4a7d45', forma: 'arbolito' },
    { nombre: 'Arbustivo', color: '#5f8a3f', forma: 'arbusto' },
    { nombre: 'Herbáceo', color: '#7aa24a', forma: 'mata' },
    { nombre: 'Rastrero', color: '#8fae55', forma: 'rastrera' },
    { nombre: 'Raíz', color: '#8a6a44', forma: 'raiz' },
  ],
};

/* Fallback de acento cuando un gemelo no recibe `tinte` del mundo. */
export const ACENTO_DEF = '#3f8f4e';

/** Resuelve el acento del gemelo desde el `tinte` del mundo (o el default). */
export const acentoDe = (tinte) => (Array.isArray(tinte) && tinte[0]) || ACENTO_DEF;
