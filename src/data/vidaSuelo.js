/* i18n (ADR-050): contenido user-facing en español Colombia. Mismo criterio
 * de deuda que SaludSueloScreen.jsx (regla soft desactivada allí). */

/**
 * vidaSuelo — datos didácticos de "La vida del suelo" (mundo El suelo vivo,
 * mini-app Cuaderno del Suelo → 4º pilar).
 *
 * Objetivo: mostrar la vida invisible del suelo con FOTOS REALES de licencia
 * abierta (Wikimedia Commons, CC0/CC BY/CC BY-SA — provenance en
 * public/soil-life/_meta.json) + lenguaje campesino y científico a la vez.
 *
 * CERO invención de cifras: el copy es descripción de función biológica y
 * "señales de campo" observables. Los números finos de nutrición (N-P-K por
 * cultivo, umbrales) viven en el análisis (pilar 1) y el grafo/agente; aquí se
 * ENLAZAN, no se reinventan. La atribución de cada foto se muestra en la UI
 * (cumplimiento de licencia CC) y se conserva en _meta.json.
 */

/* Perfil del suelo — horizontes, de arriba (hojarasca) hacia abajo (roca).
 * Foto real: public/soil-life/perfil.jpg (perfil 0–125 cm). El perfil EXACTO
 * cambia en cada finca; esto es la lectura general, honesta. */
export const HORIZONTES = [
  {
    sigla: 'O',
    nombre: 'La hojarasca',
    tecnico: 'Horizonte O — mantillo',
    desc: 'Las hojas, ramitas y boñiga que se están pudriendo encima de la tierra. La cobija del suelo.',
    color: '#6b5a3e',
  },
  {
    sigla: 'A',
    nombre: 'La capa negra viva',
    tecnico: 'Horizonte A — suelo superficial',
    desc: 'La tierra oscura donde está casi toda la vida y las raíces. Aquí se hace y se guarda el humus.',
    color: '#4b3a2a',
  },
  {
    sigla: 'B',
    nombre: 'El subsuelo',
    tecnico: 'Horizonte B — subsuelo',
    desc: 'Más clara y apretada. Guarda minerales y agua; las raíces hondas bajan a buscarlos.',
    color: '#7a5a3c',
  },
  {
    sigla: 'C',
    nombre: 'La roca madre',
    tecnico: 'Horizonte C — material de origen',
    desc: 'La piedra que, con los siglos, se desmenuza y le da los minerales de fondo a todo el suelo.',
    color: '#8a6f52',
  },
];

/* Fauna y microvida — cada una con foto real (slug = archivo en
 * public/soil-life/<slug>.jpg) + su papel + la "señal" que el campesino ve. */
export const HABITANTES = [
  {
    slug: 'lombriz',
    emoji: '🪱',
    nombre: 'La lombriz de tierra',
    tecnico: 'Lombrices (Oligochaeta)',
    lema: 'El arado de Dios, sin gasolina',
    papel: 'Se comen la hojarasca y la tierra; su caca es humus, el mejor abono. Sus túneles airean el suelo y dejan entrar el agua.',
    senal: 'Voltee una palada: si ve lombrices gordas y rosadas, su tierra está viva.',
    tono: 'lombriz',
  },
  {
    slug: 'micorriza',
    emoji: '🕸️',
    nombre: 'Las micorrizas',
    tecnico: 'Hongos micorrízicos arbusculares (al microscopio)',
    lema: 'El internet del suelo',
    papel: 'Hongos que se pegan a la raíz y le prestan un hilero para buscar agua y fósforo lejos. La planta les paga con azúcar.',
    senal: 'No se ven a simple vista. Se cuidan con menos arado y menos veneno.',
    tono: 'micorriza',
  },
  {
    slug: 'micelio',
    emoji: '🍄',
    nombre: 'El micelio de los hongos',
    tecnico: 'Micelio de hongos del suelo',
    lema: 'Los hilos blancos que reparten comida',
    papel: 'Deshacen los palos y las hojas más duras. Sus hilos conectan plantas y les mueven agua y nutrientes.',
    senal: 'Los hilos blancos bajo la hojarasca son vida, no enfermedad.',
    tono: 'micelio',
  },
  {
    slug: 'nodulos',
    emoji: '🫘',
    nombre: 'Las bacterias del fríjol',
    tecnico: 'Rizobios en nódulos de leguminosas',
    lema: 'Abono sacado del aire',
    papel: 'Viven en bolitas en la raíz del fríjol, la habichuela o el guamo. Cogen el nitrógeno del aire y se lo regalan a la planta.',
    senal: 'Arranque una mata de fríjol sana: las bolitas rosadas por dentro son abono gratis.',
    tono: 'nodulos',
  },
  {
    slug: 'colembolo',
    emoji: '⚡',
    nombre: 'Los colémbolos',
    tecnico: 'Colémbolos (Collembola)',
    lema: 'Los saltarines que muelen la hoja',
    papel: 'Bichitos diminutos que muelen la hojarasca y controlan hongos malos. Son la base de la cadena de vida del suelo.',
    senal: 'Motitas que saltan cuando levanta hojas húmedas: buena señal.',
    tono: 'colembolo',
  },
  {
    slug: 'escarabajo',
    emoji: '🪲',
    nombre: 'El escarabajo estercolero',
    tecnico: 'Escarabajos estercoleros (Scarabaeidae)',
    lema: 'El reciclador del potrero',
    papel: 'Entierran el estiércol y lo llevan hondo al suelo. Limpian el potrero y siembran abono donde llegan las raíces.',
    senal: 'Boñigas que desaparecen rápido y bolitas enterradas: potrero sano.',
    tono: 'escarabajo',
  },
  {
    slug: 'ciempies',
    emoji: '🐛',
    nombre: 'Ciempiés y otros bichos',
    tecnico: 'Ciempiés y artrópodos del suelo',
    lema: 'Los cazadores que guardan el equilibrio',
    papel: 'Cazan plagas del suelo y mezclan la tierra al moverse. Parte del control natural que trabaja gratis.',
    senal: 'Corren cuando destapa la hojarasca. Verlos es señal de suelo sano.',
    tono: 'ciempies',
  },
  {
    slug: 'humus',
    emoji: '🤎',
    nombre: 'El humus',
    tecnico: 'Humus — materia orgánica estable',
    lema: 'La despensa del suelo',
    papel: 'El producto final de toda esta vida: tierra negra y esponjosa que guarda agua y suelta nutrientes despacio, cuando la mata los pide.',
    senal: 'Color oscuro, olor a monte y se desmorona blandita en la mano.',
    tono: 'humus',
  },
];

/* El ciclo — cómo la vida convierte el resto en fertilidad y vuelve a empezar.
 * Enlaza con el N-P-K del análisis (pilar 1) sin inventar cifras. */
export const CICLO_ETAPAS = [
  {
    n: 1,
    icono: 'hojarasca',
    titulo: 'Cae el resto',
    texto: 'Hojas, tallos, raíces viejas y estiércol llegan al suelo. Es la comida de todo lo que sigue.',
  },
  {
    n: 2,
    icono: 'descomponen',
    titulo: 'La vida lo deshace',
    texto: 'Lombrices, hongos, colémbolos y bacterias muelen y digieren ese resto poco a poco.',
  },
  {
    n: 3,
    icono: 'humus',
    titulo: 'Se vuelve humus',
    texto: 'Queda tierra negra y estable: la esponja que guarda agua y nutrientes sin lavarse con la lluvia.',
  },
  {
    n: 4,
    icono: 'nutrientes',
    titulo: 'Suelta el alimento',
    texto: 'De ahí salen el nitrógeno (N), el fósforo (P) y el potasio (K) que la planta puede tomar por la raíz.',
  },
  {
    n: 5,
    icono: 'planta',
    titulo: 'Alimenta la mata',
    texto: 'La planta crece, da cosecha… y devuelve hojas y raíces al suelo. El ciclo arranca otra vez.',
  },
];

/* Cómo proteger esta vida — acciones claras, sin dosis (van al agente/grafo). */
export const CUIDADOS_VIDA = [
  { icono: 'fuego', titulo: 'No queme', texto: 'La quema mata en minutos la vida que tardó años en formarse.' },
  { icono: 'veneno', titulo: 'Menos veneno', texto: 'Los venenos fuertes también matan lombrices, hongos buenos y colémbolos.' },
  { icono: 'cobertura', titulo: 'Tape el suelo', texto: 'Hojarasca o plantas de cobertura: sombra, humedad y comida para la vida.' },
  { icono: 'alimento', titulo: 'Déle de comer', texto: 'Compost, humus de lombriz, abonos verdes y los residuos de la cosecha.' },
];

/* Créditos de fotos — cumplimiento de licencia CC. Provenance en _meta.json. */
export const CREDITOS_FOTOS = [
  { slug: 'perfil', autor: 'Mclund', lic: 'CC BY 4.0', url: 'https://commons.wikimedia.org/wiki/File:Soil_profile_0-125cm.jpg' },
  { slug: 'lombriz', autor: 'Jochem Kühnen', lic: 'CC BY 4.0', url: 'https://commons.wikimedia.org/wiki/File:Aporrectodea_rosea_(Gelderland,_Netherlands).jpg' },
  { slug: 'micorriza', autor: 'Rajarshi Rit', lic: 'CC BY 4.0', url: 'https://commons.wikimedia.org/wiki/File:Vesicular_Arbuscular_Mycorrhizae_40X0031_03.jpg' },
  { slug: 'micelio', autor: 'Rob Hille', lic: 'CC BY-SA 3.0', url: 'https://commons.wikimedia.org/wiki/File:Mycelium_RH_(1).jpg' },
  { slug: 'nodulos', autor: 'Louisa Howard (Dartmouth EM Facility)', lic: 'Dominio público', url: 'https://commons.wikimedia.org/wiki/File:Root-nodule01.jpg' },
  { slug: 'colembolo', autor: 'Lewis Fausak', lic: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Springtail_(Collembola_Symphypleona)_on_soil.jpg' },
  { slug: 'escarabajo', autor: 'Charles J. Sharp', lic: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Dung_beetle_(Deltochilum_mexicanum)_3.jpg' },
  { slug: 'ciempies', autor: 'Katja Schulz', lic: 'CC BY 2.0', url: 'https://commons.wikimedia.org/wiki/File:Soil_Centipede_(46872079534).jpg' },
  { slug: 'humus', autor: 'Suiseisekiryu', lic: 'CC0', url: 'https://commons.wikimedia.org/wiki/File:Germination_and_humus.jpg' },
];

export const FOTO_BASE = '/soil-life';
