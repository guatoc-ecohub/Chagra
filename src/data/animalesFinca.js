/*
 * animalesFinca — datos del módulo ANIMALES (cría campesina) enfocados en el
 * pequeño productor colombiano.
 *
 * Aquí vive lo transversal del módulo: la base de las fotos, sus créditos de
 * licencia abierta (para cumplir CC en la UI) y el "ciclo cerrado" que amarra
 * cada animal con el mundo del abono (estiércol → compost → suelo → planta).
 *
 * Todo dato sanitario/reproductivo duro (días de gestación, razas criollas,
 * forrajeras con su tope y su guarda de toxicidad) está groundeado en
 * src/data/animal-diagnostics.json (ICA, AGROSAVIA, CIPAV, Fenavi, FAO). NO se
 * inventan dosis ni tratamientos: la guía se queda en lo general y seguro y
 * remata en "consulte al técnico / veterinario / ICA".
 */

/** Carpeta pública de las fotos del módulo (Wikimedia Commons, licencia abierta). */
export const FOTO_BASE_ANIMALES = '/animales';

/*
 * Créditos de las fotos — se muestran EN la UI (esquina de cada foto y bloque
 * de créditos) para cumplir la atribución CC BY / CC BY-SA. Provenance completa
 * (título del archivo, URL de licencia) en public/animales/_meta.json.
 */
export const CREDITOS_FOTOS_ANIMALES = [
  { slug: 'gallinas', autor: 'Acabashi', lic: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Chicken_in_the_Pleasure_Grounds_at_Parham_Park,_West_Sussex,_England_1.jpg' },
  { slug: 'pollos', autor: 'Earthdirt', lic: 'CC BY 3.0', url: 'https://commons.wikimedia.org/wiki/File:Cornish_Rock_broiler_chicks.JPG' },
  { slug: 'cerdos', autor: 'Dave Spicer', lic: 'CC BY-SA 2.0', url: 'https://commons.wikimedia.org/wiki/File:Pig_pen_alongside_footpath_on_Bower_Farm_-_geograph.org.uk_-_2591969.jpg' },
  { slug: 'conejos', autor: 'Louisejw', lic: 'CC BY-SA 3.0', url: 'https://commons.wikimedia.org/wiki/File:Large_Rabbit_Hutch.jpg' },
  { slug: 'conejo-forraje', autor: 'Diliff', lic: 'CC BY-SA 3.0', url: 'https://commons.wikimedia.org/wiki/File:European_Rabbit,_Lake_District,_UK_-_August_2011.jpg' },
  { slug: 'gazapos', autor: 'SableSteel', lic: 'CC BY-SA 3.0', url: 'https://commons.wikimedia.org/wiki/File:Chilled_and_Warm_Himalayan_rabbit_kits.JPG' },
  { slug: 'cabra', autor: 'Wilfredor', lic: 'CC0', url: 'https://commons.wikimedia.org/wiki/File:Capra_aegagrus_hircus_in_isla_Margarita.jpg' },
  { slug: 'cabras', autor: 'USDAgov', lic: 'Dominio público', url: 'https://commons.wikimedia.org/wiki/File:Goats_graze_in_a_pasture_in_Lovelock,_Nevada_on_13_September_2023_-_20230913-FPAC-KLS-0031_EDIT.jpg' },
  { slug: 'ovejas', autor: 'Dr Duncan Pepper', lic: 'CC BY-SA 2.0', url: 'https://commons.wikimedia.org/wiki/File:Grazing_pasture_with_sheep_-_geograph.org.uk_-_3805265.jpg' },
  { slug: 'vacas', autor: 'DonCamillo', lic: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Grazing_cows_-_Gillu%C3%A9,_Aragon.JPG' },
  { slug: 'abejas', autor: 'Ark. Agricultural Experiment Station', lic: 'CC BY-SA 2.0', url: 'https://commons.wikimedia.org/wiki/File:SAREC_Apiary_-_53077967569.jpg' },
];

/** Busca el nombre del autor de una foto por su slug (para el crédito en la UI). */
export const creditoFotoAnimal = (slug) =>
  CREDITOS_FOTOS_ANIMALES.find((c) => c.slug === slug)?.autor || '';

/*
 * CICLO CERRADO — el estribillo del módulo: el animal aporta su estiércol, ese
 * estiércol se composta/madura y vuelve al suelo y a la mata. Cada animal tiene
 * su abono con su nombre campesino. Groundeado contra el mundo del abono
 * (EstiercolScreen) y catalog/biopreparados-seed.json (gallinaza → bocashi).
 */
export const CICLO_POR_ANIMAL = {
  conejos: { abono: 'Conejaza', frase: 'La conejaza es un abono "frío": no quema y se puede usar casi directo o en la lombricera.' },
  caprinos: { abono: 'Caprinaza / majada', frase: 'La majada (pelotitas) se recoge seca del aprisco y va directo al compost.' },
  gallinas: { abono: 'Gallinaza', frase: 'La gallinaza madura es la base del bocashi.' },
  cerdos: { abono: 'Porquinaza', frase: 'La porquinaza alimenta el biol y el biodigestor (nunca cruda).' },
};

/** Los eslabones del ciclo, para pintar la cadena de chips en cada pantalla. */
export const CICLO_PASOS = ['Animal', 'Estiércol', 'Compost / bocashi', 'Suelo', 'Planta'];
