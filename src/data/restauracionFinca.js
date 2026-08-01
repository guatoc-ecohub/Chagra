/*
 * i18n (ADR-050): este archivo es CONTENIDO/copy campesino en español Colombia
 * (bosque de alimentos, sucesión ecológica y restauración de suelo), pendiente
 * de migrar a src/config/messages.js — mismo criterio que cafeFinca.js /
 * canaFinca.js / aguaFinca.js.
 */
/**
 * restauracionFinca.js — CONTENIDO del mundo "Restauración y bosque de alimentos".
 *
 * COMPLEMENTA (no duplica) el mundo "Diseño de la finca" (disenio), que ya trae
 * reforestación / silvopastoreo / páramo. Aquí el enfoque es el BOSQUE DE
 * ALIMENTOS (food forest): los 7 estratos, la sucesión ecológica y la
 * restauración del suelo degradado — el MÉTODO — sembrado con especies REALES.
 *
 * ─── REGLA ANTI-ALUCINACIÓN (memoria feedback-restauracion-grounding-fabrica-
 *     especies) ─────────────────────────────────────────────────────────────
 * La restauración FABRICA especies si no se ancla al catálogo. Por eso TODA
 * especie de este archivo es un id REAL de public/grafo-relations.json
 * (species.<id>). El test restauracionFinca.grounding.test.js cruza cada id
 * contra el grafo y verifica además que el flag `nativo` coincide con
 * `establishment_means === 'nativo'`. Si una especie no está groundeada, NO se
 * inventa: el campo se deja como SlotPendiente ("dato en camino").
 *
 * Los PAPELES funcionales (fija nitrógeno, sombra, cobertura, dinamizadora…) y
 * los ESTRATOS son método ecológico (Robert Hart / agroforestería / AGROSAVIA),
 * puestos SOBRE especies del catálogo. No hay cifras de sitio inventadas
 * (densidades, dosis, distancias): esas se remiten al diseño del predio / al
 * agente.
 *
 * FOTOS: photo-forward REUSANDO fotos CC que ya viven en public/ (café,
 * soil-life, frutales, plátano, cacao) — aporte 0 KB al bundle (el budget está
 * apretado). Cada foto conserva su atribución real (ver CREDITOS_FOTOS_RESTAURACION).
 */

export const ESTADO_GROUNDED_PENDIENTE = 'grounded_pendiente';

/* ────────────────────────────────────────────────────────────────────────
 * FOTOS (reusadas de otros mundos — 0 KB de aporte). El `src` es una ruta
 * pública ya existente; NO se copian bytes. La atribución se conserva.
 * ──────────────────────────────────────────────────────────────────────── */
export const FOTOS_RESTAURACION = {
  agroforestal: {
    src: '/cacao/agroforestal.jpg',
    autor: 'Mvfarrell',
    licencia: 'CC BY-SA 4.0',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Shade_Cacao_Plantation,_Ixcacao_Mayan_Chocolate,_Belize.JPG',
  },
  cafetal: {
    src: '/cafe/cafetal.jpg',
    autor: 'Timothy A. Gonsalves',
    licencia: 'CC BY-SA 4.0',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Coffee_Shade_Trees_Paddy_Fields_Coorg_Feb24_R16_07670.jpg',
  },
  cafeSombra: {
    src: '/platano-banano/cafe-sombra.jpg',
    autor: 'Kateregga1',
    licencia: 'CC BY-SA 4.0',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Coffee_and_banana_plantation_in_Uganda.jpg',
  },
  aguacate: {
    src: '/frutales/aguacate.jpg',
    autor: 'B.navez',
    licencia: 'CC BY-SA 3.0',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Persea_americana_fruit_2.JPG',
  },
  lulo: {
    src: '/frutales/lulo.jpg',
    autor: 'Photo by David J. Stang',
    licencia: 'CC BY-SA 4.0',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Solanum_quitoense_14zz.jpg',
  },
  mora: {
    src: '/frutales/mora.jpg',
    autor: 'Forest & Kim Starr',
    licencia: 'CC BY 3.0',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Starr_051123-5474_Rubus_glaucus.jpg',
  },
  platanera: {
    src: '/platano-banano/platanera-mata.jpg',
    autor: 'Ssemmanda will',
    licencia: 'CC BY-SA 4.0',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Banana_Plantation_01.jpg',
  },
  nodulos: {
    src: '/soil-life/nodulos.jpg',
    autor: 'Louisa Howard — Dartmouth Electron Microscope Facility',
    licencia: 'Dominio público',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Root-nodule01.jpg',
  },
  micorriza: {
    src: '/soil-life/micorriza.jpg',
    autor: 'Rajarshi Rit',
    licencia: 'CC BY 4.0',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Vesicular_Arbuscular_Mycorrhizae_40X0031_03.jpg',
  },
  micelio: {
    src: '/soil-life/micelio.jpg',
    autor: 'Rob Hille',
    licencia: 'CC BY-SA 3.0',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Mycelium_RH_(1).jpg',
  },
  humus: {
    src: '/soil-life/humus.jpg',
    autor: 'Suiseisekiryu',
    licencia: 'CC0',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Germination_and_humus.jpg',
  },
  lombriz: {
    src: '/soil-life/lombriz.jpg',
    autor: 'Jochem Kuhnen',
    licencia: 'CC BY 4.0',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Aporrectodea_rosea_(Gelderland,_Netherlands).jpg',
  },
  erosion: {
    src: '/soil-life/erosion.jpg',
    autor: 'Desmanthus4food',
    licencia: 'CC BY-SA 3.0 US',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Erosion_gulleys_on_unterraced_farmland_in_Yunnan.jpg',
  },
  costra: {
    src: '/soil-life/costra.jpg',
    autor: 'Ibrahim Achiri',
    licencia: 'CC BY-SA 4.0',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Dry_cracked_soil_ground.jpg',
  },
};

/** Créditos de fotos (cumplimiento CC) — derivados de FOTOS_RESTAURACION. */
export const CREDITOS_FOTOS_RESTAURACION = Object.entries(FOTOS_RESTAURACION).map(
  ([slug, f]) => ({ slug, autor: f.autor, licencia: f.licencia, fuenteUrl: f.fuenteUrl }),
);

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIONES (pestañas del mundo)
 * ──────────────────────────────────────────────────────────────────────── */
export const ESTACIONES_RESTAURACION = [
  { id: 'bosque', titulo: 'El bosque de alimentos', descripcion: 'Qué es y por qué imita al monte' },
  { id: 'estratos', titulo: 'Los 7 estratos', descripcion: 'Los pisos de plantas, uno sobre otro' },
  { id: 'sucesion', titulo: 'Sucesión', descripcion: 'De pioneras rústicas a bosque maduro' },
  { id: 'suelo', titulo: 'Restaurar el suelo', descripcion: 'Del suelo herido a la tierra viva' },
  { id: 'especies', titulo: 'Con qué sembrar', descripcion: 'Especies del catálogo, con su papel' },
];

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 1 · EL BOSQUE DE ALIMENTOS
 * ──────────────────────────────────────────────────────────────────────── */
export const BOSQUE_INTRO = {
  lead: 'Un bosque de alimentos es una huerta que imita al monte: muchas plantas útiles en varios pisos, viviendo juntas, que se cuidan entre ellas y dan de comer todo el año.',
  clave: 'No se siembra un solo cultivo en fila: se arma un monte comestible. El suelo nunca queda pelado y la finca se defiende sola.',
  cuerpo:
    'En el monte natural nadie abona ni riega y, sin embargo, todo crece: los árboles grandes dan sombra, las hojas caen y hacen tierra, las raíces se ayudan bajo el suelo. El bosque de alimentos copia ese arreglo, pero con matas que dan comida, leña, forraje y remedio. Se siembra en varios pisos a la vez para aprovechar toda la luz, tapar el suelo y cosechar en distintas épocas.',
};

/** Por qué el bosque de alimentos le gana al monocultivo (comparación honesta). */
export const BOSQUE_VS_MONO = [
  { id: 'suelo', bosque: 'El suelo siempre tapado: hojarasca y raíces vivas', mono: 'Suelo desnudo entre surcos: se lava y se seca' },
  { id: 'cosecha', bosque: 'Cosecha escalonada todo el año, de varios pisos', mono: 'Una sola cosecha; el resto del año, nada' },
  { id: 'plagas', bosque: 'La mezcla confunde a las plagas y aloja a sus enemigos', mono: 'Una plaga encuentra su comida servida en todo el lote' },
  { id: 'agua', bosque: 'La sombra guarda humedad; menos riego', mono: 'El sol pega directo; más sed y más riego' },
];

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 2 · LOS 7 ESTRATOS
 * Cada estrato = un PISO del bosque, sembrado con especies REALES del catálogo.
 * `nativo` refleja establishment_means del grafo (lo verifica el test).
 * ──────────────────────────────────────────────────────────────────────── */
export const ESTRATOS = [
  {
    id: 'dosel',
    n: 1,
    titulo: 'Dosel alto',
    subtitulo: 'El techo del monte: los árboles grandes',
    foto: 'cafeSombra',
    papel: 'Dan la sombra madre, cortan el viento y sus hojas caídas alimentan a todo lo de abajo.',
    especies: [
      { id: 'samanea_saman', comun: 'Samán', cientifico: 'Samanea saman', nativo: true },
      { id: 'quercus_humboldtii', comun: 'Roble negro andino', cientifico: 'Quercus humboldtii', nativo: true },
      { id: 'cordia_alliodora', comun: 'Nogal cafetero', cientifico: 'Cordia alliodora', nativo: true },
      { id: 'tabebuia_rosea', comun: 'Guayacán rosado', cientifico: 'Tabebuia rosea', nativo: true },
      { id: 'enterolobium_cyclocarpum', comun: 'Orejero', cientifico: 'Enterolobium cyclocarpum', nativo: true },
      { id: 'euterpe_oleracea', comun: 'Asaí', cientifico: 'Euterpe oleracea', nativo: true },
    ],
  },
  {
    id: 'arboles_bajos',
    n: 2,
    titulo: 'Árboles bajos y frutales',
    subtitulo: 'Debajo del techo, a media altura',
    foto: 'aguacate',
    papel: 'Los frutales de la casa y los árboles de servicio que viven a la sombra suave del dosel.',
    especies: [
      { id: 'persea_americana', comun: 'Aguacate', cientifico: 'Persea americana', nativo: false },
      { id: 'mangifera_indica', comun: 'Mango', cientifico: 'Mangifera indica', nativo: false },
      { id: 'inga_edulis', comun: 'Guamo', cientifico: 'Inga edulis', nativo: false },
      { id: 'erythrina_edulis', comun: 'Chachafruto / Balú', cientifico: 'Erythrina edulis', nativo: false },
      { id: 'theobroma_cacao', comun: 'Cacao', cientifico: 'Theobroma cacao', nativo: false },
      { id: 'psidium_guajava', comun: 'Guayaba', cientifico: 'Psidium guajava', nativo: false },
      { id: 'eriobotrya_japonica', comun: 'Níspero', cientifico: 'Eriobotrya japonica', nativo: false },
    ],
  },
  {
    id: 'arbustos',
    n: 3,
    titulo: 'Arbustos',
    subtitulo: 'Matas leñosas a la altura de la mano',
    foto: 'lulo',
    papel: 'La cosecha del día a día: café, frutas ácidas y arbustos que llenan el piso medio.',
    especies: [
      { id: 'coffea_arabica', comun: 'Café', cientifico: 'Coffea arabica', nativo: false },
      { id: 'solanum_quitoense', comun: 'Lulo', cientifico: 'Solanum quitoense', nativo: false },
      { id: 'solanum_betaceum', comun: 'Tomate de árbol', cientifico: 'Solanum betaceum', nativo: false },
      { id: 'vaccinium_meridionale', comun: 'Mortino / Agraz', cientifico: 'Vaccinium meridionale', nativo: true },
      { id: 'physalis_peruviana', comun: 'Uchuva', cientifico: 'Physalis peruviana', nativo: false },
      { id: 'rubus_glaucus', comun: 'Mora', cientifico: 'Rubus glaucus', nativo: false },
      { id: 'lupinus_mutabilis', comun: 'Tarwi / Chocho', cientifico: 'Lupinus mutabilis', nativo: false },
    ],
  },
  {
    id: 'herbaceas',
    n: 4,
    titulo: 'Herbáceas',
    subtitulo: 'Matas de tallo blando',
    foto: 'platanera',
    papel: 'Las matas que dan rápido y se renuevan cada ciclo: pancoger y granos.',
    especies: [
      { id: 'musa_paradisiaca', comun: 'Plátano', cientifico: 'Musa × paradisiaca', nativo: false },
      { id: 'zea_mays', comun: 'Maíz', cientifico: 'Zea mays', nativo: false },
      { id: 'chenopodium_quinoa', comun: 'Quinua', cientifico: 'Chenopodium quinoa', nativo: false },
      { id: 'amaranthus_caudatus', comun: 'Amaranto', cientifico: 'Amaranthus caudatus', nativo: false },
      { id: 'phaseolus_vulgaris', comun: 'Fríjol', cientifico: 'Phaseolus vulgaris', nativo: false },
      { id: 'vicia_faba', comun: 'Haba', cientifico: 'Vicia faba', nativo: false },
    ],
  },
  {
    id: 'cobertura',
    n: 5,
    titulo: 'Cobertura',
    subtitulo: 'Las rastreras que tapan el suelo',
    foto: 'humus',
    papel: 'La manta viva del suelo: rastreras que lo tapan para que no se lave ni se seque.',
    especies: [
      { id: 'ipomoea_batatas', comun: 'Batata / Camote', cientifico: 'Ipomoea batatas', nativo: false },
      { id: 'cucurbita_maxima', comun: 'Calabaza / Auyama', cientifico: 'Cucurbita maxima', nativo: false },
      { id: 'fragaria_vesca', comun: 'Fresa silvestre andina', cientifico: 'Fragaria vesca', nativo: false },
      { id: 'tropaeolum_majus', comun: 'Capuchina', cientifico: 'Tropaeolum majus', nativo: false },
      { id: 'mucuna_pruriens', comun: 'Fríjol terciopelo', cientifico: 'Mucuna pruriens', nativo: false },
    ],
  },
  {
    id: 'raices',
    n: 6,
    titulo: 'Raíces y subsuelo',
    subtitulo: 'Lo que crece bajo tierra',
    foto: null,
    papel: 'El piso invisible: raíces y tubérculos que aran el suelo por dentro y guardan comida.',
    especies: [
      { id: 'arracacia_xanthorrhiza', comun: 'Arracacha', cientifico: 'Arracacia xanthorrhiza', nativo: false },
      { id: 'manihot_esculenta', comun: 'Yuca', cientifico: 'Manihot esculenta', nativo: false },
      { id: 'oxalis_tuberosa', comun: 'Oca', cientifico: 'Oxalis tuberosa', nativo: false },
      { id: 'tropaeolum_tuberosum', comun: 'Cubio / Mashua', cientifico: 'Tropaeolum tuberosum', nativo: true },
      { id: 'ullucus_tuberosus', comun: 'Ulluco / Chugua', cientifico: 'Ullucus tuberosus', nativo: false },
      { id: 'smallanthus_sonchifolius', comun: 'Yacón', cientifico: 'Smallanthus sonchifolius', nativo: true },
    ],
  },
  {
    id: 'trepadoras',
    n: 7,
    titulo: 'Trepadoras',
    subtitulo: 'Las que suben por los troncos',
    foto: 'mora',
    papel: 'Aprovechan el aire: suben por los árboles y cargan fruta donde no cabría otra mata.',
    especies: [
      { id: 'passiflora_ligularis', comun: 'Granadilla', cientifico: 'Passiflora ligularis', nativo: false },
      { id: 'passiflora_edulis_flavicarpa', comun: 'Maracuyá', cientifico: 'Passiflora edulis f. flavicarpa', nativo: false },
      { id: 'passiflora_tripartita_mollissima', comun: 'Curuba', cientifico: 'Passiflora tripartita var. mollissima', nativo: false },
      { id: 'passiflora_edulis_morada', comun: 'Gulupa', cientifico: 'Passiflora edulis f. edulis', nativo: false },
      { id: 'dioscorea_alata', comun: 'Ñame', cientifico: 'Dioscorea alata', nativo: false },
    ],
  },
];

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 3 · SUCESIÓN ECOLÓGICA
 * El monte se arma solo, por etapas. En restauración se imita esa fila:
 * pioneras rústicas primero (arreglan luz, sombra y suelo) → luego las de
 * dosel/clímax. Todo groundeado (leguminosas fijadoras + aliso actinorrizo).
 * ──────────────────────────────────────────────────────────────────────── */
export const SUCESION_INTRO = {
  lead: 'El monte no nace maduro: primero llegan las plantas rústicas que aguantan el sol y el suelo pobre, y solo cuando ellas hacen sombra y tierra aparecen las de bosque grande.',
  clave: 'En restauración se siembra imitando esa fila: pioneras que fijan nitrógeno y hacen sombra primero; las maderables y de clímax, debajo, para el largo plazo.',
};

export const SUCESION_ETAPAS = [
  {
    id: 'pioneras',
    titulo: 'Pioneras (los primeros años)',
    detalle: 'Rústicas, rápidas y casi todas leguminosas: fijan nitrógeno del aire, hacen sombra en poco tiempo y se podan para tapar el suelo (poda-y-tira).',
    especies: [
      { id: 'gliricidia_sepium', comun: 'Matarratón', cientifico: 'Gliricidia sepium', nativo: false, rol: 'Fija N · cerca viva · poda-y-tira' },
      { id: 'inga_edulis', comun: 'Guamo', cientifico: 'Inga edulis', nativo: false, rol: 'Fija N · sombra · fruto' },
      { id: 'erythrina_edulis', comun: 'Chachafruto', cientifico: 'Erythrina edulis', nativo: false, rol: 'Fija N · comida' },
      { id: 'alnus_acuminata', comun: 'Aliso andino', cientifico: 'Alnus acuminata', nativo: true, rol: 'Fija N (Frankia) · restaura laderas' },
      { id: 'lupinus_mutabilis', comun: 'Tarwi / Chocho', cientifico: 'Lupinus mutabilis', nativo: false, rol: 'Fija N · abono verde de altura' },
      { id: 'mucuna_pruriens', comun: 'Fríjol terciopelo', cientifico: 'Mucuna pruriens', nativo: false, rol: 'Fija N · abono verde de choque' },
    ],
  },
  {
    id: 'climax',
    titulo: 'Bosque maduro (para el largo plazo)',
    detalle: 'Crecen despacio pero llegan lejos: se siembran bajo la sombra que hicieron las pioneras y son el bosque que queda — madera, dosel y refugio de fauna.',
    especies: [
      { id: 'cordia_alliodora', comun: 'Nogal cafetero', cientifico: 'Cordia alliodora', nativo: true, rol: 'Madera fina · dosel' },
      { id: 'quercus_humboldtii', comun: 'Roble negro andino', cientifico: 'Quercus humboldtii', nativo: true, rol: 'Clímax andino · protegido' },
      { id: 'weinmannia_tomentosa', comun: 'Encenillo', cientifico: 'Weinmannia tomentosa', nativo: true, rol: 'Bosque altoandino · borde de páramo' },
      { id: 'tabebuia_rosea', comun: 'Guayacán rosado', cientifico: 'Tabebuia rosea', nativo: true, rol: 'Dosel · flor para polinizadores' },
    ],
  },
];

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 4 · RESTAURAR EL SUELO
 * Suelo herido (erosión, costra, compactación) → tierra viva. Método, sin
 * cifras inventadas. Enlaza a los mundos hermanos (suelo, abono).
 * ──────────────────────────────────────────────────────────────────────── */
export const SUELO_HERIDO = [
  { id: 'erosion', foto: 'erosion', titulo: 'Erosión', detalle: 'El agua se lleva la capa fértil por las cárcavas cuando el suelo queda desnudo en pendiente.' },
  { id: 'costra', foto: 'costra', titulo: 'Costra y resquebrajado', detalle: 'Sin cobertura, el sol reseca y endurece la superficie: el agua ya no entra, resbala.' },
];

export const SUELO_METODO = [
  {
    id: 'tapar',
    titulo: 'Nunca dejar el suelo pelado',
    detalle: 'Cobertura viva (rastreras) y hojarasca encima. Tapado, el suelo guarda humedad, no se lava y se llena de vida.',
  },
  {
    id: 'materia',
    titulo: 'Meterle materia orgánica',
    detalle: 'La poda-y-tira de las fijadoras (matarratón, guamo) y el compost devuelven al suelo lo que la cosecha se lleva.',
  },
  {
    id: 'vida',
    titulo: 'Cuidar la vida del suelo',
    detalle: 'Lombrices, hongos y micorrizas hacen el trabajo. No quemar, arar poco: el fuego y el arado de más matan esa vida.',
    fotos: ['lombriz', 'micorriza', 'micelio'],
  },
  {
    id: 'nitrogeno',
    titulo: 'Fijadoras de nitrógeno',
    detalle: 'Las leguminosas y el aliso guardan nitrógeno del aire en sus raíces (los nódulos) y se lo pasan al suelo — abono sin bolsa.',
    fotos: ['nodulos'],
  },
];

export const SUELO_NOTA_SIN_CIFRAS =
  'Aquí no encontrará kilos por hectárea ni dosis: cuánta cobertura, cuánto compost y qué corregir dependen de SU suelo. Eso se mira en el cuaderno del suelo o con el agente, no se inventa.';

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 5 · CON QUÉ SEMBRAR (especies multipropósito para restaurar)
 * Curaduría groundeada: nativas primero, con su papel funcional real. Solo ids
 * del catálogo. Lo que no está groundeado = "dato en camino".
 * ──────────────────────────────────────────────────────────────────────── */
export const ESPECIES_RESTAURACION = [
  { id: 'alnus_acuminata', comun: 'Aliso andino', cientifico: 'Alnus acuminata', nativo: true, papeles: ['Fija N', 'Madera', 'Restaura laderas'], nota: 'La pionera andina por excelencia: fija nitrógeno con Frankia y arma suelo rápido en tierra herida.' },
  { id: 'quercus_humboldtii', comun: 'Roble negro andino', cientifico: 'Quercus humboldtii', nativo: true, papeles: ['Dosel', 'Clímax', 'Fauna'], nota: 'Árbol protegido y clave del bosque andino: se siembra para el largo plazo, bajo sombra ya hecha.' },
  { id: 'weinmannia_tomentosa', comun: 'Encenillo', cientifico: 'Weinmannia tomentosa', nativo: true, papeles: ['Bosque altoandino', 'Borde de páramo'], nota: 'Nativa del frío alto: restaura los bordes de bosque y páramo donde poco más prende.' },
  { id: 'inga_edulis', comun: 'Guamo', cientifico: 'Inga edulis', nativo: false, papeles: ['Fija N', 'Sombra', 'Fruto'], nota: 'Sombra de café y guama para comer; sus hojas caídas hacen mantillo espeso.' },
  { id: 'erythrina_edulis', comun: 'Chachafruto / Balú', cientifico: 'Erythrina edulis', nativo: false, papeles: ['Fija N', 'Comida', 'Cerca viva'], nota: 'Fija nitrógeno y da un fruto proteico; sirve de cerca viva y de sombra.' },
  { id: 'gliricidia_sepium', comun: 'Matarratón', cientifico: 'Gliricidia sepium', nativo: false, papeles: ['Fija N', 'Cerca viva', 'Poda-y-tira', 'Forraje'], nota: 'Prende de estaca: cerca viva que se poda seguido para tapar el suelo y alimentar animales.' },
  { id: 'samanea_saman', comun: 'Samán', cientifico: 'Samanea saman', nativo: true, papeles: ['Dosel amplio', 'Fija N', 'Sombra'], nota: 'Copa enorme para sombra de potrero; leguminosa que enriquece el suelo debajo.' },
  // NOTA DE TRAZABILIDAD (audit AUDIT-RESTAURACION-GROUNDING-2026-07-09.md,
  // hallazgo #6): el id `albizia_guachapele` es historico y ENGAÑA por nombre
  // — guarda el binomio real *Albizia niopoides* (Iguá hoja menuda), NO
  // *Pseudosamanea guachapele* (el guachapele verdadero, que vive aparte bajo
  // el id `pseudosamanea_guachapele` en el catálogo). Ambas son especies
  // nativas reales y el binomio mostrado aquí (Albizia niopoides) es
  // correcto — el defecto es solo el NOMBRE del slug, no el dato. No se
  // renombra en este PR (tocaría catalog/*.json + public/rag-embeddings.json
  // + public/cycle-content/, generados por el pipeline AGE, fuera de
  // alcance); queda documentado para quien lo traiga junto con esos exports.
  { id: 'albizia_guachapele', comun: 'Iguá', cientifico: 'Albizia niopoides', nativo: true, papeles: ['Fija N', 'Madera'], nota: 'Nativa maderable que fija nitrógeno: buena para enriquecer y dar sombra alta.' },
  { id: 'cordia_alliodora', comun: 'Nogal cafetero', cientifico: 'Cordia alliodora', nativo: true, papeles: ['Madera fina', 'Dosel'], nota: 'Madera valiosa que convive con el café; se autopoda y deja pasar luz.' },
  { id: 'tabebuia_rosea', comun: 'Guayacán rosado', cientifico: 'Tabebuia rosea', nativo: true, papeles: ['Dosel', 'Flor / néctar', 'Madera'], nota: 'Florece en rosado y alimenta polinizadores; madera y sombra alta.' },
  { id: 'vaccinium_meridionale', comun: 'Mortino / Agraz', cientifico: 'Vaccinium meridionale', nativo: true, papeles: ['Arbusto nativo', 'Fruto silvestre'], nota: 'Arbusto altoandino nativo para restaurar y cosechar fruto silvestre.' },
  { id: 'mucuna_pruriens', comun: 'Fríjol terciopelo', cientifico: 'Mucuna pruriens', nativo: false, papeles: ['Abono verde', 'Fija N', 'Cobertura'], nota: 'Abono verde de choque: tapa el suelo rápido, ahoga la maleza y fija nitrógeno.' },
  { id: 'urtica_dioica', comun: 'Ortiga', cientifico: 'Urtica dioica', nativo: false, papeles: ['Dinamizadora', 'Biomasa', 'Purín'], nota: 'Acumula minerales en su hoja: se corta para mantillo o purín que dinamiza el suelo.' },
];

export const NOTA_GROUNDING =
  'Todas estas especies existen en el catálogo Chagra. Si busca una que no aparece, no se la inventamos: pregúntele al agente o quedará como "dato en camino" hasta groundearla.';
