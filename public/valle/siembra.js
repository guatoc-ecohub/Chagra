// ── siembra.js — CAPACIDAD DEL COMPAI: REGISTRAR SIEMBRA EN 3D ───────────────
//
// La abeja Angelita NO es adorno: es asistente + CONSTRUCTORA + enseña. Cuando
// el usuario agrega un árbol, Angelita lo SIEMBRA (no aparece por magia):
//   1. El usuario ELIGE la especie (las 50 de `flora/especies-eztree.js` —
//      silueta real por especie, generada por ez-tree: el guayacán rosado en
//      sombrilla, el cacao bajo y redondo, el aliso columna, el frailejón en
//      roseta plateada…). Selector agrupado por piso térmico (cálido→páramo).
//   2. Angelita VUELA al sitio elegido (compañero de juego que sigue y actúa:
//      la cámara la acompaña — feedback de colocación tipo Imperios).
//   3. SIEMBRA con animación: afloja la tierra (montículo + motas), suelta la
//      semilla, sale el brote y el árbol CRECE a su forma — la especie se
//      DIFERENCIA al plantarse porque la geometría ES la de ez-tree.
//   4. La mata queda REGISTRADA: hoja de vida (objeto JS con especie/fecha/
//      posición) → window.__registroMatas + localStorage. Ese es el GANCHO del
//      insertion module (`project_chagra_insertion_module_plan`): cuando se
//      cablee, este objeto se convierte en el asset real de la PWA.
//
// El compai COMENTA MIENTRAS siembra (rol builder del comentarista compai:
// habla en usted, con los datos que tiene, y no inventa cifras — las esperas
// son rangos agronómicos conocidos, no promesas).
//
// LAS 4 MIRADAS: Jackson (claro épico, hora dorada), Nolan (una imagen que se
// queda: el árbol brotando a contraluz), Nintendo (el companion que actúa, el
// juicy grow con overshoot), agro+instruccional (especie/piso/espera reales,
// rótulos en usted, la fidelidad ES el efecto especial).
//
// REUSA: la gramática visual de `abejas.js` (prado dorado, sombras de contacto,
// niebla, la angelita SVG rubber-hose = la MISMA identidad 2D↔3D) y el
// pipeline `flora/ez-tree/` + `flora/especies-eztree.js` (50 especies,
// esqueleto L-system + LOD nativo + shader de viento propio — reemplazó a
// ArbolFabrica.js/18 especies de la v1, ver BITACORA-flora-eztree.md).
// Determinista: toda geometría sale de seed sembrada (`semillaVariante`); lo
// cosmético usa mulberry32 propio.
//
// ANTI-TANGLE: archivo NUEVO y AUTÓNOMO. Único enganche con main.js = el bloque
// `// ── SIEMBRA ──`. Monta su propio canvas/renderer/loop y suprime el valle.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
// El valle no lleva el árbol RNG histórico del demo: su núcleo determinista es
// el mismo que usa la flora viva (r160). La máquina de siembra sólo cambia el
// punto de entrada; no duplica la maquinaria procedural.
import { mulberry32 } from './lib3d/core/RNG.js';
import { Tree } from './flora/ez-tree/tree.js';
import TreeOptions from './flora/ez-tree/options.js';
import { ESPECIES_EZTREE, ORDEN_PISO_TERMICO, POR_PISO_TERMICO, semillaVariante, crearPlanta } from './flora/especies-eztree.js';
// El compAI switcher: elenco canónico + persistencia (compai/elenco.js, WIP
// preservado — mismo módulo que lee el valle/onboarding). Los rigs SVG de cada
// compañero viven en window.GUIAS_ARTE (assets/guias-arte.js, ya cargado).
import { ELENCO, leerCompanero, escribirCompanero } from './compai/elenco.js';
import { leerMatas, guardarMatas } from './compai/misMatas.js';

// ── LA IDENTIDAD DE LA ANGELITA (la misma de abejas.js / avatares 2D) ────────
const ABEJA = {
  cuerpo: '#ffb54f', cabeza: '#ffd76a', hiloChumbe: '#9c3b1e',
  alaTul: '#bfeaff', alaTulClara: '#eafff6', tinta: '#2a1a0c',
};

// ── LA PALETA (Humboldt entintado a la hora dorada — heredada de abejas.js) ──
const C = {
  pasto: '#8f9c4c', pastoSol: '#b6bd5c', loma: '#7f9048', lomaLejos: '#a6b184',
  hoja: '#4f7a3a', hojaOscura: '#31532a',
  tierra: '#6a5233', tierraClara: '#8c7047', tierraFresca: '#54402a',
  madera: '#8a5a31', maderaClara: '#c99a55', maderaVieja: '#6e4a2a',
  cal: '#e9e2cf', hueso: '#efe6cc', tinta: '#2a1a0c',
  miel: '#f3a91d', cerumen: '#a9762f', cerumenClaro: '#c68f3e',
  guayacan: '#e8b23a', brote: '#8fc45e', nube: '#fdf6e6',
  cieloCenit: '#eec565', cieloHorizonte: '#f6dca0', cieloRescoldo: '#e2934a',
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mezclar = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t).getStyle();
const easeOutCubic = (u) => 1 - Math.pow(1 - u, 3);
// el "juicy grow" de Nintendo: sobrepasa un 8% y asienta (squash&stretch del árbol)
const easeOutBack = (u) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
function gauss(x, z, cx, cz, sx, sz) { const dx = x - cx, dz = z - cz; return Math.exp(-((dx * dx) / (2 * sx * sx) + (dz * dz) / (2 * sz * sz))); }
function ruido(x, z) {
  return Math.sin(x * 0.8 + z * 0.6) * 0.5 + Math.sin(x * 1.9 - z * 1.4 + 2.3) * 0.3 + Math.sin(x * 3.1 + z * 2.7 + 5.1) * 0.2;
}
// lo cosmético (motas, jitter) también va SEMBRADO: mismo cuadro en cada corrida
const rnd = mulberry32(20260802);

// ═══════════════════ EL CATÁLOGO DE SIEMBRA (50 especies · ez-tree) ═══════
// Especie = la clave EXACTA de ESPECIES_EZTREE en flora/especies-eztree.js
// (la silueta real la genera ez-tree, ver crearArbolMesh). Esperas = rangos
// agronómicos conocidos (el comentarista no inventa cifras). Reemplaza el
// catálogo anterior de 11 especies de ArbolFabrica — ez-tree escala mejor a
// muchas especies (ver BRIEF-angelita-v2, mejora 3).
const CATALOGO = {
  cacao: { comun: 'Cacao', cientifico: 'Theobroma cacao', piso: 'cálido', emoji: '🍫',
    frase: 'Sembramos cacao — piso cálido, bajito y de copa redonda; pide sombra. En 3 o 4 años le da mazorcas para chocolate.' },
  cafe: { comun: 'Café', cientifico: 'Coffea arabica', piso: 'templado', emoji: '☕',
    frase: 'Sembramos café — piso templado. A los 2 o 3 años coge su primera cosecha.' },
  aguacate: { comun: 'Aguacate', cientifico: 'Persea americana', piso: 'cálido/templado', emoji: '🥑',
    frase: 'Sembramos aguacate — piso templado, copa ancha. Deme unos 3 a 5 años y esta mata le da sus primeros aguacates.' },
  guayacan_rosado: { comun: 'Guayacán rosado', cientifico: 'Tabebuia rosea', piso: 'cálido a frío', emoji: '🌸',
    frase: 'Sembramos guayacán rosado — sombrilla de flor rosada, madera fina. Esto se siembra para los nietos: florece cada año y la madera es de décadas.' },
  aliso_andino: { comun: 'Aliso', cientifico: 'Alnus acuminata', piso: 'frío', emoji: '🌿',
    frase: 'Sembramos aliso — el árbol del agua fría: columna esbelta, amarra la orilla y fija nitrógeno. En pocos años ya protege el nacimiento.' },
  palma_coco: { comun: 'Palma de coco', cientifico: 'Cocos nucifera', piso: 'cálido', emoji: '🥥',
    frase: 'Sembramos palma de coco — piso cálido costero. Tarda, pero da cocos por 60 años o más: siembra de largo aliento.' },
  mango: { comun: 'Mango', cientifico: 'Mangifera indica', piso: 'cálido', emoji: '🥭',
    frase: 'Sembramos mango — piso cálido, copa grande y redonda. En 4 a 6 años ya está cargando fruta dulce.' },
  ceiba: { comun: 'Ceiba algodón', cientifico: 'Ceiba pentandra', piso: 'cálido', emoji: '🌳',
    frase: 'Sembramos ceiba — la gigante del monte, sombra de generaciones. Crece rápido de joven; en 30 años ya es un coloso.' },
  samán: { comun: 'Samán', cientifico: 'Samanea saman', piso: 'cálido/templado', emoji: '🌳',
    frase: 'Sembramos samán — la sombrilla clásica del potrero. Sombra abundante desde joven, madera noble a largo plazo.' },
  papaya: { comun: 'Papaya', cientifico: 'Carica papaya', piso: 'cálido/templado', emoji: '🍈',
    frase: 'Sembramos papaya — piso cálido, crece rapidísimo. En 8 a 10 meses ya está dando fruta.' },
  banano: { comun: 'Banano', cientifico: 'Musa acuminata', piso: 'cálido/templado', emoji: '🍌',
    frase: 'Sembramos banano — piso cálido, casi sin esperar: en 9 a 12 meses sale el primer racimo.' },
  guamo: { comun: 'Guamo', cientifico: 'Inga edulis', piso: 'cálido/templado', emoji: '🌰',
    frase: 'Sembramos guamo — la sombra clásica del cafetal. En 2 o 3 años ya da sombra y guamas, y de paso le abona el suelo.' },
  zapote: { comun: 'Zapote', cientifico: 'Pouteria sapota', piso: 'cálido', emoji: '🍠',
    frase: 'Sembramos zapote — árbol alto de fruta cremosa. Espere unos 6 a 8 años para la primera cosecha; después da por décadas.' },
  palma_vino: { comun: 'Palma de vino', cientifico: 'Attalea butyracea', piso: 'cálido/templado', emoji: '🌴',
    frase: 'Sembramos palma de vino — imponente y de crecimiento lento. Es siembra de paciencia larga, pero dura toda una vida.' },
  nogal_cafetero: { comun: 'Nogal cafetero', cientifico: 'Cordia alliodora', piso: 'cálido/templado', emoji: '🪵',
    frase: 'Sembramos nogal cafetero — fuste recto, madera fina. Sombra pronto; la madera, en 15 a 20 años.' },
  guayacan_amarillo: { comun: 'Guayacán amarillo', cientifico: 'Tabebuia chrysantha', piso: 'cálido/templado', emoji: '🌼',
    frase: 'Sembramos guayacán amarillo — cuando florece se viste entero de oro. Madera noble, sombra buena, paciencia larga.' },
  limon: { comun: 'Limón criollo', cientifico: 'Citrus aurantiifolia', piso: 'cálido/templado', emoji: '🍋',
    frase: 'Sembramos limón — arbolito pequeño y agradecido. En 2 a 3 años ya está dando limones todo el año.' },
  yarumo: { comun: 'Yarumo', cientifico: 'Cecropia telealba', piso: 'cálido/templado', emoji: '🍃',
    frase: 'Sembramos yarumo — el pionero que abre camino al bosque. Crece rápido, hoja plateada; en pocos años ya da sombra alta.' },
  yuca: { comun: 'Yuca dulce', cientifico: 'Manihot esculenta', piso: 'cálido/templado', emoji: '🥔',
    frase: 'Sembramos yuca — de las más agradecidas: en 8 a 10 meses ya se puede cosechar la raíz.' },
  ceiba_tolua: { comun: 'Ceiba tolúa', cientifico: 'Bombacopsis quinata', piso: 'cálido', emoji: '🌲',
    frase: 'Sembramos ceiba tolúa — maderable fino de dosel alto. Va para largo: 20 años o más hasta madera útil.' },
  lulo: { comun: 'Lulo', cientifico: 'Solanum quitoense', piso: 'templado/frío', emoji: '🍈',
    frase: 'Sembramos lulo — arbusto bajo de piso frío. En 8 a 10 meses ya está dando su primera cosecha ácida.' },
  tomate_arbol: { comun: 'Tomate de árbol', cientifico: 'Solanum betaceum', piso: 'templado/frío', emoji: '🍅',
    frase: 'Sembramos tomate de árbol — clima frío, de las que menos esperan: al año y medio ya está cargando.' },
  curuba: { comun: 'Curuba', cientifico: 'Passiflora tarminiana', piso: 'templado', emoji: '🍈',
    frase: 'Sembramos curuba — trepadora de clima templado. En 8 a 12 meses, con buena guía, ya está produciendo.' },
  chirimoya: { comun: 'Chirimoya', cientifico: 'Annona cherimola', piso: 'templado/frío', emoji: '🍏',
    frase: 'Sembramos chirimoya — fruta cremosa de clima frío-templado. Espere 3 a 4 años para la primera cosecha.' },
  cedro_real: { comun: 'Cedro real', cientifico: 'Cedrela odorata', piso: 'cálido/templado', emoji: '🌲',
    frase: 'Sembramos cedro — maderable noble, alto y de copa abierta. Va para largo: unos 20 años. Herencia pura.' },
  mora: { comun: 'Mora de Castilla', cientifico: 'Rubus glaucus', piso: 'templado/frío', emoji: '🫐',
    frase: 'Sembramos mora — arbusto arqueado de clima frío. En 8 a 10 meses ya da su primera cosecha, y sigue produciendo por años.' },
  uchuva: { comun: 'Uchuva', cientifico: 'Physalis peruviana', piso: 'templado/frío', emoji: '🍒',
    frase: 'Sembramos uchuva — arbusto bajo de piso frío. En 5 a 6 meses ya está cargando su fruta dorada.' },
  fresa: { comun: 'Fresa', cientifico: 'Fragaria vesca', piso: 'frío/templado', emoji: '🍓',
    frase: 'Sembramos fresa — rastrera pequeñita de piso frío. En pocos meses ya está dando fruta, y se propaga sola.' },
  feijoa: { comun: 'Feijoa', cientifico: 'Acca sellowiana', piso: 'frío/templado', emoji: '🍐',
    frase: 'Sembramos feijoa — arbusto de hoja plateada, clima frío. Espere 2 a 3 años para su primera cosecha aromática.' },
  arracacha: { comun: 'Arracacha', cientifico: 'Arracacia xanthorrhiza', piso: 'templado/frío', emoji: '🥕',
    frase: 'Sembramos arracacha — tubérculo andino de roseta baja. En 10 a 12 meses ya se cosecha la raíz.' },
  roble_negro: { comun: 'Roble negro', cientifico: 'Quercus humboldtii', piso: 'frío', emoji: '🌳',
    frase: 'Sembramos roble negro — el árbol emblema del bosque andino. Crece despacio, pero vive siglos: siembra para el territorio.' },
  encenillo: { comun: 'Encenillo', cientifico: 'Weinmannia tomentosa', piso: 'frío', emoji: '🍂',
    frase: 'Sembramos encenillo — bosque altoandino, hoja rojiza al brotar. Restaura suelo de páramo alto en pocos años.' },
  chachafruto: { comun: 'Chachafruto / Balú', cientifico: 'Erythrina edulis', piso: 'frío/templado', emoji: '🫘',
    frase: 'Sembramos chachafruto — el balú andino: fija nitrógeno, da sombra al café y su semilla es pura proteína. En 2 a 3 años ya florece rojo y carga vainas.' },
  coacha: { comun: 'Coacha', cientifico: 'Hieronyma duquei', piso: 'frío', emoji: '🌳',
    frase: 'Sembramos coacha — árbol grande del bosque altoandino, copa amplia verde oscuro. Crece despacio pero llega a dosel: siembra para el bosque, no para el año.' },
  tuno: { comun: 'Tuno esmeraldo', cientifico: 'Miconia squamulosa', piso: 'frío', emoji: '🌿',
    frase: 'Sembramos tuno esmeraldo — pariente verde del siete cueros, del borde de bosque frío. Copa densa, buena para restaurar y para los pájaros.' },
  arrayan_popayan: { comun: 'Arrayán de Popayán', cientifico: 'Myrcia popayanensis', piso: 'templado', emoji: '🌳',
    frase: 'Sembramos arrayán de Popayán — arbolito de sombra, hoja menuda aromática y copa redonda densa. Madera fina y buen refugio para la fauna.' },
  nogal_andino: { comun: 'Nogal andino', cientifico: 'Juglans neotropica', piso: 'templado/frío', emoji: '🌰',
    frase: 'Sembramos nogal andino — maderable alto de clima frío. Va para largo: 20 a 25 años hasta madera útil.' },
  papa: { comun: 'Papa criolla', cientifico: 'Solanum tuberosum', piso: 'frío/páramo', emoji: '🥔',
    frase: 'Sembramos papa — el sustento de la finca fría. En 5 a 6 meses ya se cosecha.' },
  oca: { comun: 'Oca', cientifico: 'Oxalis tuberosa', piso: 'frío', emoji: '🍠',
    frase: 'Sembramos oca — tubérculo andino muy bajo. En 6 a 8 meses ya está lista para sacar.' },
  ulluco: { comun: 'Ulluco', cientifico: 'Ullucus tuberosus', piso: 'frío', emoji: '🥔',
    frase: 'Sembramos ulluco — rastrero de piso frío, hoja carnosa brillante. Cosecha en 6 a 7 meses.' },
  mortino: { comun: 'Mortino / Agraz', cientifico: 'Vaccinium meridionale', piso: 'frío', emoji: '🫐',
    frase: 'Sembramos mortino — arbusto de borde de bosque altoandino. En 2 a 3 años ya da su fruto morado silvestre.' },
  quinua: { comun: 'Quinua', cientifico: 'Chenopodium quinoa', piso: 'templado/frío', emoji: '🌾',
    frase: 'Sembramos quinua — grano andino de tallo erguido. En 5 a 7 meses ya está lista la panícula para cosechar.' },
  arveja: { comun: 'Arveja', cientifico: 'Pisum sativum', piso: 'frío', emoji: '🫛',
    frase: 'Sembramos arveja — trepadora baja de clima frío. En 3 a 4 meses ya está dando vainas.' },
  romero: { comun: 'Romero', cientifico: 'Rosmarinus officinalis', piso: 'templado/frío', emoji: '🌿',
    frase: 'Sembramos romero — aromática que cuida el huerto. En pocos meses ya perfuma y ahuyenta plagas.' },
  ruda: { comun: 'Ruda', cientifico: 'Ruta graveolens', piso: 'templado/frío', emoji: '🌿',
    frase: 'Sembramos ruda — matojo pequeño de hoja azulada. Crece rápido y protege las matas vecinas.' },
  cilantro: { comun: 'Cilantro', cientifico: 'Coriandrum sativum', piso: 'templado/frío', emoji: '🌿',
    frase: 'Sembramos cilantro — de las más rápidas: en 6 a 8 semanas ya se está cosechando para la olla.' },
  manzanilla: { comun: 'Manzanilla', cientifico: 'Matricaria chamomilla', piso: 'templado/frío', emoji: '🌼',
    frase: 'Sembramos manzanilla — florece rápido, en 2 a 3 meses. Buena para el té y para atraer polinizadores.' },
  agraz_paramo: { comun: 'Agraz de páramo', cientifico: 'Vaccinium floribundum', piso: 'frío/páramo', emoji: '🫐',
    frase: 'Sembramos agraz de páramo — arbusto achaparrado del límite del bosque. Paciencia de años, pero es fruta nativa pura.' },
  romero_paramo: { comun: 'Romero de páramo', cientifico: 'Diplostephium revolutum', piso: 'frío/páramo', emoji: '🌫️',
    frase: 'Sembramos romero de páramo — plateado, resiste el frío intenso. Crece despacio, propio del ecosistema de altura.' },
  laurel_paramo: { comun: 'Laurel de páramo', cientifico: 'Clethra kalbreyeri', piso: 'páramo', emoji: '🌲',
    frase: 'Sembramos laurel de páramo — de los pocos árboles que aguantan la altura extrema. Restaura el borde del páramo.' },
  frailejon_mayor: { comun: 'Frailejón mayor', cientifico: 'Espeletia grandiflora', piso: 'páramo', emoji: '🌟',
    frase: 'Sembramos frailejón — el guardián del páramo, el que junta el agua de la niebla. Crece apenas 1 cm al año: esto NO es para usted, es para sus tataranietos.' },
  frailejon_plateado: { comun: 'Frailejón plateado', cientifico: 'Espeletia argentea', piso: 'páramo', emoji: '✨',
    frase: 'Sembramos frailejón plateado — hoja aún más blanca que el mayor. Mismo ritmo lentísimo: siembra de siglos, no de años.' },
  pajonal_paramo: { comun: 'Pajonal de páramo', cientifico: 'Festuca sp.', piso: 'páramo', emoji: '🌾',
    frase: 'Sembramos pajonal — el pasto que sostiene el páramo entero y guarda el agua en su raíz. Se establece en 1 a 2 años.' },
};
// Ficha que el compai narra al cerrar la siembra: piso, porte de copa y
// primera cosecha. La silueta sigue saliendo de especies-eztree.js.
const FICHAS_SIEMBRA = {
  cacao: ['bajita, redonda y de sombra', '3 a 4 años'], cafe: ['compacta y densa', '2 a 3 años'],
  aguacate: ['ancha y redonda', '3 a 5 años'], mango: ['grande y redonda', '4 a 6 años'],
  guayacan_rosado: ['sombrilla de flor', 'no es de cosecha; florece en pocos años'],
  aliso_andino: ['estrecha y vertical', 'no es frutal; protege el nacimiento'],
  feijoa: ['arbustiva y plateada', '2 a 3 años'], papa: ['porte bajo, de mata', '5 a 6 meses'],
  mora: ['arbustiva y arqueada', '8 a 10 meses'], quinua: ['porte bajo y erguido', '5 a 7 meses'],
  cilantro: ['bajita y de hojas finas', '6 a 8 semanas'],
  frailejon_mayor: ['roseta de hojas plateadas', 'no es de cosecha; crece cerca de 1 cm al año'],
};
function fichaSiembra(especie) {
  const c = CATALOGO[especie] || {};
  const def = ESPECIES_EZTREE[especie] || {};
  const porte = def.arquetipo === 'roseta' ? 'roseta' : def.arquetipo === 'hierba' ? 'mata baja' : def.arquetipo === 'pajonal' ? 'macolla' : 'copa de árbol';
  return { piso: c.piso || 'piso no definido', copa: FICHAS_SIEMBRA[especie]?.[0] || porte, cosecha: FICHAS_SIEMBRA[especie]?.[1] || 'según variedad y manejo' };
}
// Selector agrupado por piso térmico (cálido → páramo) — reusa el agrupado
// ya calculado en especies-eztree.js para no duplicar la lógica de piso.
const GRUPOS_SEL = [
  { piso: 'calido', titulo: 'Piso cálido', claves: POR_PISO_TERMICO.calido },
  { piso: 'templado', titulo: 'Piso templado', claves: POR_PISO_TERMICO.templado },
  { piso: 'frio', titulo: 'Piso frío', claves: POR_PISO_TERMICO.frio },
  { piso: 'paramo', titulo: 'Páramo', claves: POR_PISO_TERMICO.paramo },
];
const ORDEN_SEL = ORDEN_PISO_TERMICO;

// Escala fábrica→prado: un aguacate de ~10 u de fábrica queda de ~3,4 u — árbol
// de verdad al lado de la caja de la angelita (~1 u), sin tapar el cuadro.
const ESC_ARBOL = 0.34;

// MEJORA 1 (Angelita protagonista): tamaño base del billboard SVG de la abeja
// en píxeles CSS, antes de escalar por distancia a cámara (ver proyectar()).
// Era 56 — MUY pequeña, se perdía en el prado. 140 ≈ 2.5× para que se lea
// bien su rubber-hose (aleteo, squash&stretch) sin tapar el lote al sembrar.
const PX_BASE_ABEJA = 140;

// ═══════════════════ SOMBRA DE CONTACTO (grammar de abejas/cafetal) ══════════
let _texSombra = null;
function texSombra() {
  if (_texSombra) return _texSombra;
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  grad.addColorStop(0, 'rgba(28,20,12,0.52)');
  grad.addColorStop(0.55, 'rgba(28,20,12,0.24)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  _texSombra = new THREE.CanvasTexture(cv);
  return _texSombra;
}
let _matSombra = null, _geoSombra = null;
function matSombra() {
  if (!_matSombra) _matSombra = new THREE.MeshBasicMaterial({ map: texSombra(), transparent: true, depthWrite: false, opacity: 0.92 });
  return _matSombra;
}
function geoSombra() { if (!_geoSombra) { _geoSombra = new THREE.PlaneGeometry(1, 1); _geoSombra.rotateX(-Math.PI / 2); } return _geoSombra; }
function sombra(raiz, x, z, radio, opts = {}) {
  const m = new THREE.Mesh(geoSombra(), matSombra());
  m.scale.set(radio * 2 * (opts.ex || 1), 1, radio * 2);
  m.position.set(x + (opts.dx || 0.12) * radio, alturaPrado(x, z) + (opts.y || 0.045), z + (opts.dz || 0.06) * radio);
  raiz.add(m); return m;
}

// ═══════════════════ NIEBLA EN CAPAS (profundidad) ═══════════════════
let _texNiebla = null;
function texNiebla() {
  if (_texNiebla) return _texNiebla;
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(128, 70, 6, 128, 70, 128);
  grad.addColorStop(0, 'rgba(253,247,232,0.92)');
  grad.addColorStop(0.5, 'rgba(250,236,205,0.42)');
  grad.addColorStop(1, 'rgba(250,236,205,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 128);
  _texNiebla = new THREE.CanvasTexture(cv);
  return _texNiebla;
}
const NIEBLA = [
  [-8.5, 3.4, -13.5, 18, 5.6, 0.5, 3.4],
  [7.5, 3.1, -14.5, 17, 5.0, 0.46, 4.2],
  [0.0, 2.6, -16.5, 24, 6.2, 0.56, 2.8],
  [-3.0, 1.2, -8.5, 15, 3.0, 0.28, 5.0],
  [4.5, 1.0, -6.5, 12, 2.6, 0.24, 5.6],
];
function montarNiebla(raiz) {
  const cards = [];
  NIEBLA.forEach((n, i) => {
    const mat = new THREE.MeshBasicMaterial({ map: texNiebla(), transparent: true, opacity: n[5], depthWrite: false, fog: false });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(n[3], n[4]), mat);
    m.position.set(n[0], n[1], n[2]);
    raiz.add(m);
    cards.push({ m, x0: n[0], ph: i * 1.7, dr: n[6] });
  });
  return cards;
}

// ═══════════════════ LA GEOGRAFÍA DEL CLARO DE SIEMBRA ═══════════════════
// Explanada amplia al centro (ahí se siembra) y lomas al fondo que cierran el
// cuadro. El delantal plano es más ancho que el de abejas: es el LOTE.
const ANCHO = 36, FONDO = 32;
function alturaPrado(x, z) {
  let h = ruido(x * 0.42, z * 0.42) * 0.16;
  h += gauss(x, z, -12, -11, 5.6, 4.2) * 2.4;
  h += gauss(x, z, 12, -12, 6.4, 4.6) * 2.8;
  h += gauss(x, z, 0.5, -15, 9, 3.8) * 2.3;
  h += gauss(x, z, -14, 6, 5.2, 5.2) * 0.9;
  const plano = clamp(gauss(x, z, 0.4, 1.2, 7.6, 6.4) * 1.4, 0, 1); // el lote
  return h * (1 - plano);
}

function construirPrado() {
  const seg = 120, nx = seg + 1;
  const pos = new Float32Array(nx * nx * 3);
  const col = new Float32Array(nx * nx * 3);
  const cPasto = new THREE.Color(C.pasto), cSol = new THREE.Color(C.pastoSol);
  const cTierra = new THREE.Color(C.tierra), cLoma = new THREE.Color(C.loma), cLejos = new THREE.Color(C.lomaLejos);
  const cSombra = new THREE.Color(C.hojaOscura);
  const cKiss = new THREE.Color(C.guayacan);
  const c = new THREE.Color();
  let p = 0;
  for (let iz = 0; iz < nx; iz++) {
    const z = -FONDO / 2 + (FONDO * iz) / seg;
    for (let ix = 0; ix < nx; ix++) {
      const x = -ANCHO / 2 + (ANCHO * ix) / seg;
      const y = alturaPrado(x, z);
      pos[p] = x; pos[p + 1] = y; pos[p + 2] = z;
      c.lerpColors(cPasto, cSol, smoothstep(-0.35, 1.0, ruido(x + 3, z - 2)));
      const dap = ruido(x * 0.95 + 11, z * 0.95 - 7);
      c.lerp(cSombra, clamp(-dap * 0.16, 0, 0.2));
      c.lerp(cSol, clamp(dap * 0.14, 0, 0.18));
      // el SURCO del lote: una franja de tierra vista donde se está sembrando
      const surco = gauss(x, z, 1.2, 1.6, 4.8, 1.1);
      c.lerp(cTierra, clamp(surco * 0.8, 0, 0.7));
      c.lerp(cLoma, clamp(y * 0.32, 0, 0.6));
      c.lerp(cKiss, clamp((y - 1.4) * 0.12, 0, 0.14));
      c.lerp(cLejos, smoothstep(-7, -14, z) * 0.55);
      col[p] = c.r; col[p + 1] = c.g; col[p + 2] = c.b;
      p += 3;
    }
  }
  const idx = [];
  for (let iz = 0; iz < seg; iz++) for (let ix = 0; ix < seg; ix++) {
    const a = iz * nx + ix, b = a + 1, d = a + nx, e = d + 1;
    idx.push(a, d, b, b, d, e);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function construirBoveda() {
  const geo = new THREE.SphereGeometry(120, 28, 18);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const cCenit = new THREE.Color(C.cieloCenit);
  const cHor = new THREE.Color(C.cieloHorizonte);
  const cResc = new THREE.Color(C.cieloRescoldo);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 120;
    c.copy(cHor).lerp(cCenit, smoothstep(-0.08, 0.8, y));
    if (y < 0.14) c.lerp(cResc, smoothstep(0.14, -0.28, y) * 0.7);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

// Nubes del atardecer, lejos y quietas.
const NUBES = [[-15, 7.2, -30, 3.0], [5.5, 8.4, -32, 2.6], [15, 6.4, -28, 2.8], [-6.5, 9.0, -27, 2.0]];
function montarNubes(raiz) {
  NUBES.forEach((n) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 9, 7), new THREE.MeshBasicMaterial({ color: C.nube, transparent: true, opacity: 0.82, depthWrite: false, fog: false }));
    m.position.set(n[0], n[1], n[2]); m.scale.set(n[3], n[3] * 0.3, n[3] * 0.6);
    raiz.add(m);
  });
}

// Macollas y arbustos a los FLANCOS (el lote del centro queda libre de estorbos).
const MACOLLAS = [[-5.6, 6.2], [-3.2, 6.8], [2.6, 6.9], [5.2, 6.1], [-7.4, 4.4], [7.6, 4.2], [-8.2, -0.6], [8.4, -1.2], [-7.8, 2.0], [8.0, 1.4]];
const ARBUSTOS = [[-8.8, -3.4, 0.95], [-9.6, 0.4, 0.8], [8.8, -4.0, 1.0], [9.4, 0.8, 0.85], [-7.2, 6.4, 0.7], [7.6, 6.2, 0.8]];
function montarSotobosque(raiz) {
  const hojaM = new THREE.MeshLambertMaterial({ color: C.hoja, flatShading: true });
  const pastoM = new THREE.MeshLambertMaterial({ color: C.pastoSol, flatShading: true });
  const hojaOM = new THREE.MeshLambertMaterial({ color: C.hojaOscura, flatShading: true });
  MACOLLAS.forEach(([x, z], i) => {
    const g = new THREE.Group(); g.position.set(x, alturaPrado(x, z), z); g.rotation.y = i * 1.1;
    for (let j = 0; j < 5; j++) {
      const a = j * 1.257 + i;
      const h = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.46 + (j % 3) * 0.09, 4), j % 2 ? hojaM : pastoM);
      h.position.set(Math.cos(a) * 0.12, 0.22, Math.sin(a) * 0.12);
      h.rotation.set(Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3);
      g.add(h);
    }
    raiz.add(g);
  });
  ARBUSTOS.forEach(([x, z, esc]) => {
    sombra(raiz, x, z, 0.42 * esc, { y: 0.045 });
    const g = new THREE.Group(); g.position.set(x, alturaPrado(x, z), z); g.scale.setScalar(esc);
    [[0, 0.3, 0, 0.44], [0.32, 0.22, 0.12, 0.32], [-0.28, 0.24, -0.1, 0.35]].forEach((b, j) => {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(b[3]), j % 2 ? hojaOM : hojaM);
      m.position.set(b[0], b[1], b[2]); m.scale.set(1, 0.8, 1); g.add(m);
    });
    raiz.add(g);
  });
}

// ═══════════════════ LA CAJA DE ANGELITA (su casa; de aquí despega) ══════════
const CAJA_POS = new THREE.Vector3(-3.8, 0, 2.0);
const CAJA_ESC = 1.0;
const BOCA = new THREE.Vector3(CAJA_POS.x, 0, CAJA_POS.z); // se completa al montar
function montarCaja(raiz) {
  sombra(raiz, CAJA_POS.x, CAJA_POS.z, 0.95 * CAJA_ESC, { y: 0.05, ex: 1.2 });
  const g = new THREE.Group();
  const ySuelo = alturaPrado(CAJA_POS.x, CAJA_POS.z);
  g.position.set(CAJA_POS.x, ySuelo, CAJA_POS.z); g.scale.setScalar(CAJA_ESC);
  const M = (color) => new THREE.MeshLambertMaterial({ color });
  const banco = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.82, 0.18, 8), M(C.tierraClara)); banco.position.y = 0.09; g.add(banco);
  const cajon = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.72, 0.86), M(C.maderaClara)); cajon.position.y = 0.55; g.add(cajon);
  const tapa = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.09, 0.9), M(C.madera)); tapa.position.set(0, 0.98, 0); g.add(tapa);
  // la piquera de TUBO abocinada, mirando al lote (por ahí sale a trabajar)
  const anillo = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.06, 6, 14), M(C.cerumen)); anillo.position.set(0, 0.62, 0.44); anillo.rotation.x = Math.PI / 2; g.add(anillo);
  const tubo = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.3, 10), M(C.cerumenClaro)); tubo.position.set(0, 0.62, 0.58); tubo.rotation.x = Math.PI / 2; g.add(tubo);
  const hueco = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.05, 10), new THREE.MeshBasicMaterial({ color: '#24170f' })); hueco.position.set(0, 0.62, 0.72); hueco.rotation.x = Math.PI / 2; g.add(hueco);
  raiz.add(g);
  BOCA.set(CAJA_POS.x, ySuelo + 0.62 * CAJA_ESC, CAJA_POS.z + 0.8 * CAJA_ESC);
}

// ═══════════════════ ÁRBOLES ez-tree (la silueta ES la especie, 50 sp.) ══════
// Cada especie es un TreeOptions completo en flora/especies-eztree.js: sale
// un THREE.Group con DOS meshes (branchesMesh, leavesMesh — 2 draw calls,
// mismo presupuesto que la fábrica anterior). `tree.update(t)` anima su
// propio shader de viento (ez-tree trae el suyo, no comparte uniformesViento
// con ArbolFabrica). La escala del GRUPO sigue siendo la que anima el
// crecimiento (origen = base del tronco → crece desde el suelo).
// `arbolesVivos` registra cada instancia para que el loop llame `.update(t)`.
const arbolesVivos = [];
const _cacheOptions = new Map(); // TreeOptions por especie, evita reconstruir el objeto cada siembra
function crearArbolMesh(especie, semilla, _ctx) {
  const def = ESPECIES_EZTREE[especie];
  if (!def) { console.warn('especie sin ez-tree:', especie); return { g: new THREE.Group(), altura: 1, radio: 0.4 }; }
  // Ruteo por arquetipo (fix flora 2026-08-03): árbol → ez-tree; hierba/roseta/
  // pajonal → builders de plantas-bajas.js. Antes se forzaba TODO por ez-tree,
  // así que papa/fresa/frailejón/pajonal salían como "arbolito-bollo". crearPlanta
  // enruta según def.arquetipo. Para 'arbol' aplicamos la variante determinista
  // por instancia clonando las options con la semilla propia + la de siembra.
  let planta;
  const esArbol = (def.arquetipo || 'arbol') === 'arbol';
  if (esArbol) {
    let base = _cacheOptions.get(especie);
    if (!base) { base = def.options; _cacheOptions.set(especie, base); }
    const options = new TreeOptions();
    options.copy(base);
    // variante determinista por instancia (misma especie, sitios distintos → no
    // clones idénticos) derivada de la semilla propia de la especie + `semilla`
    // de siembra (posición/orden), ambas siempre enteras y reproducibles.
    options.seed = semillaVariante(base.seed, semilla >>> 0);
    const tree = new Tree(options);
    tree.generate();
    planta = tree;
    // ez-tree trae su propio shader de viento — solo estas instancias reciben
    // `.update(t)` en el loop (los builders bajos no lo exponen).
    if (typeof tree.update === 'function') arbolesVivos.push(tree);
  } else {
    // hierba/roseta/pajonal — silueta real de porte bajo (crearPlanta enruta).
    planta = crearPlanta(especie, { Tree, TreeOptions });
  }
  planta.name = `siembra_${especie}`;
  const box = new THREE.Box3().setFromObject(planta);
  const size = new THREE.Vector3(); box.getSize(size);
  const altura = Math.max(0.2, size.y);
  const radio = Math.max(0.15, Math.max(size.x, size.z) / 2);
  return { g: planta, altura, radio };
}
function hashSeed(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

// ═══════════════════ MOTAS (tierra que salta · polen dorado) ═════════════════
// Ring-buffer de Points, 1 draw call por sistema (grammar del rastro de abejas).
function crearMotas(raiz, color, size, subida) {
  const MAX = 70;
  const pos = new Float32Array(MAX * 3);
  const col = new Float32Array(MAX * 3);
  const vel = new Float32Array(MAX * 3);
  const vida = new Float32Array(MAX);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, blending: subida ? THREE.AdditiveBlending : THREE.NormalBlending, sizeAttenuation: true, fog: false });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  raiz.add(pts);
  const base = new THREE.Color(color);
  let cursor = 0;
  return {
    emitir(x, y, z, fuerza = 1) {
      const i = cursor;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      const a = rnd() * Math.PI * 2;
      vel[i * 3] = Math.cos(a) * (0.3 + rnd() * 0.5) * fuerza;
      vel[i * 3 + 1] = subida ? 0.5 + rnd() * 0.5 : (0.9 + rnd() * 0.9) * fuerza;
      vel[i * 3 + 2] = Math.sin(a) * (0.3 + rnd() * 0.5) * fuerza;
      vida[i] = 1;
      cursor = (cursor + 1) % MAX;
    },
    update(dt) {
      for (let i = 0; i < MAX; i++) {
        // los muertos se PARQUEAN bajo tierra: PointsMaterial no tiene alfa por
        // punto, y un punto "apagado a negro" en blending normal es un mosco
        // negro flotando en pleno cielo (visto en el gate local de 8,6 s)
        if (vida[i] <= 0) { pos[i * 3 + 1] = -999; continue; }
        vida[i] = Math.max(0, vida[i] - dt * (subida ? 0.7 : 1.3));
        pos[i * 3] += vel[i * 3] * dt;
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        if (!subida) vel[i * 3 + 1] -= dt * 3.2; // la tierra CAE; el polen sube
        // aditivo (polen): apagar a negro = desvanecer. Normal (tierra): el tono
        // se queda en tierra y lo que remata es el parqueo de arriba.
        const v = subida ? vida[i] * vida[i] : 0.45 + 0.55 * vida[i];
        col[i * 3] = base.r * v; col[i * 3 + 1] = base.g * v; col[i * 3 + 2] = base.b * v;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}

// ═══════════════════ LA ANGELITA (billboard SVG rubber-hose) ═════════════════
function svgAngelita() {
  const A = ABEJA;
  return `
  <svg viewBox="-15 -15 32 30" class="smbBee" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse r="6.4" fill="${A.cuerpo}" opacity="0.28"/>
    <ellipse class="smbWing" cx="-1.8" cy="-7" rx="6" ry="3.6" fill="${A.alaTul}" opacity="0.62" stroke="rgba(42,26,12,0.4)" stroke-width="0.5"/>
    <ellipse class="smbWing smbWing2" cx="2.2" cy="-6.4" rx="4.6" ry="2.8" fill="${A.alaTulClara}" opacity="0.5" stroke="rgba(42,26,12,0.35)" stroke-width="0.5"/>
    <path d="M-2.6,4.4 C-3.2,6.6 -3.4,8 -3.0,9.2" stroke="${A.tinta}" stroke-width="1.9" fill="none" stroke-linecap="round"/>
    <circle cx="-3.0" cy="9.4" r="1.1" fill="${A.cabeza}" stroke="${A.tinta}" stroke-width="0.6"/>
    <path d="M1.8,4.7 C1.4,6.8 1.3,8.2 1.8,9.4" stroke="${A.tinta}" stroke-width="1.9" fill="none" stroke-linecap="round"/>
    <circle cx="1.8" cy="9.6" r="1.1" fill="${A.cabeza}" stroke="${A.tinta}" stroke-width="0.6"/>
    <ellipse cx="0" cy="0" rx="8.6" ry="5.4" fill="${A.cuerpo}" stroke="${A.tinta}" stroke-width="1.3"/>
    <path d="M-3.6,-4.7 L-3.6,4.7" stroke="${A.tinta}" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M-3.6,-4.1 L-3.6,4.1" stroke="${A.hiloChumbe}" stroke-width="0.7" stroke-linecap="round"/>
    <path d="M0.4,-5.0 L0.4,5.0" stroke="${A.tinta}" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M0.4,-4.4 L0.4,4.4" stroke="${A.hiloChumbe}" stroke-width="0.7" stroke-linecap="round"/>
    <path d="M4.0,-4.0 L4.0,4.0" stroke="${A.tinta}" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M-6.2,1.4 C-8.2,2.4 -9.0,4.1 -8.4,5.9" stroke="${A.tinta}" stroke-width="2.1" fill="none" stroke-linecap="round"/>
    <circle cx="-8.5" cy="6.2" r="1.55" fill="${A.cabeza}" stroke="${A.tinta}" stroke-width="0.6"/>
    <path d="M5.4,3.0 C6.9,4.2 7.5,5.9 7.0,7.5" stroke="${A.tinta}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <circle cx="7.0" cy="7.8" r="1.6" fill="${A.cabeza}" stroke="${A.tinta}" stroke-width="0.6"/>
    <circle cx="8.6" cy="-1.0" r="4.4" fill="${A.cabeza}" stroke="${A.tinta}" stroke-width="1.2"/>
    <circle cx="10.4" cy="0.7" r="1.15" fill="#e8896b" opacity="0.55"/>
    <path d="M7.5,1.4 Q8.9,2.5 10.3,1.4" stroke="${A.tinta}" stroke-width="0.9" fill="none" stroke-linecap="round"/>
    <circle cx="10.1" cy="-1.9" r="1.95" fill="#fff" stroke="${A.tinta}" stroke-width="0.7"/>
    <circle cx="10.5" cy="-1.6" r="1.0" fill="${A.tinta}"/>
    <circle cx="10.9" cy="-2.0" r="0.35" fill="#fff"/>
    <circle cx="7.4" cy="-2.2" r="1.45" fill="#fff" stroke="${A.tinta}" stroke-width="0.7"/>
    <circle cx="7.7" cy="-2.0" r="0.72" fill="${A.tinta}"/>
    <path d="M7.7,-4.7 C6.7,-7.3 7.0,-9.3 8.3,-10.1" stroke="${A.tinta}" stroke-width="0.9" fill="none" stroke-linecap="round"/>
    <circle cx="8.3" cy="-10.3" r="0.95" fill="${A.tinta}"/>
    <path d="M9.7,-4.6 C11.0,-6.7 11.3,-8.7 10.5,-10.3" stroke="${A.tinta}" stroke-width="0.9" fill="none" stroke-linecap="round"/>
    <circle cx="10.5" cy="-10.5" r="0.95" fill="${A.tinta}"/>
    <circle class="smbSemilla" cx="-1" cy="6.2" r="2.1" fill="#7a4a1e" stroke="${A.tinta}" stroke-width="0.8" style="display:none"/>
    <!-- PALA de Angelita (gesto humano con herramienta): agarrada por la patica
         de abajo-izquierda; oculta salvo en la fase de cavar (clase smbCavar). -->
    <g class="smbPala" style="display:none" transform="translate(-8.5,6.2) rotate(28)">
      <rect x="-0.5" y="-0.6" width="1.0" height="9.5" rx="0.4" fill="#9c6b32" stroke="${A.tinta}" stroke-width="0.5"/>
      <path d="M-2.0,8.6 h4.0 v2.2 a2.0 2.0 0 0 1 -4.0 0 z" fill="#c7ccd1" stroke="${A.tinta}" stroke-width="0.6"/>
      <path d="M-1.2,-0.6 h2.4" stroke="${A.tinta}" stroke-width="0.7" stroke-linecap="round"/>
    </g>
  </svg>`;
}

// ═══════════════ EL COMPAI: quién siembra (switch en vivo) ═══════════════
// El compañero NO es fijo: el usuario cambia entre los distintos compAI del
// ELENCO canónico (compai/elenco.js — angelita, oso, jaguar, guacamaya,
// zariguya, chivito, luciérnaga). Angelita conserva su rig animado propio
// (aleteo + semilla que suelta); los demás usan su rig SVG de GUIAS_ARTE
// (assets/guias-arte.js, el mismo arte que el valle/onboarding proyectan). La
// elección se guarda con escribirCompanero → cruza a la PWA y al valle 3D.
const COMPAI_HUD = {
  angelita:   { nombre: 'Angelita', ico: '🐝', dice: 'Angelita dice', gerundio: 'siembra' },
  oso:        { nombre: 'Oso andino', ico: '🐻', dice: 'El oso dice', gerundio: 'siembra' },
  jaguar:     { nombre: 'Jaguar', ico: '🐆', dice: 'El jaguar dice', gerundio: 'siembra' },
  guacamaya:  { nombre: 'Guacamaya', ico: '🦜', dice: 'La guacamaya dice', gerundio: 'siembra' },
  zariguya:   { nombre: 'Zarigüeya', ico: '🐀', dice: 'La zarigüeya dice', gerundio: 'siembra' },
  chivito:    { nombre: 'Chivito', ico: '🐦', dice: 'El chivito dice', gerundio: 'siembra' },
  luciernaga: { nombre: 'Luciérnaga', ico: '🔆', dice: 'La luciérnaga dice', gerundio: 'siembra' },
};
// Estado de reposo del rig (mismo criterio del valle/onboarding): idle salvo
// los que solo tienen ciclo de marcha/dispersión.
const COMPAI_ESTADO = {
  oso: 'camina', jaguar: 'camina', guacamaya: 'dispersar',
  angelita: 'idle', chivito: 'idle', luciernaga: 'idle', zariguya: 'idle',
};
// El GESTO DE SIEMBRA es propio del personaje (pedido operador 2026-08-03): el
// cómo se abre el hueco cambia según quién siembra. NO es un rig 3D nuevo (eso
// reinventaría contra la arquitectura de billboards SVG de este mundo) — es la
// gramática de animación del billboard (dips squash&stretch + partículas + un
// prop dibujado) especializada por gesto:
//   'pala'   → Angelita (humana constructora): pala en la mano, estocada de
//              cavar; el prop pala se dibuja en su billboard y baja con ella.
//   'patas'  → jaguar/oso (felino/plantígrado): ESCARBAN con las patas
//              delanteras — se agachan al frente, rasguñan rápido (más picadas,
//              más frecuencia) y avientan MÁS tierra; arcos de rasguño al frente.
//   'pico'   → guacamaya/chivito (aves): picotean el suelo, estocadas cortas y
//              secas de pico.
//   'hocico' → zarigüeya: hoza con el hocico, cabeza abajo rastrillando.
//   'luz'    → luciérnaga: no cava con fuerza; marca el sitio con pulsos de luz.
const COMPAI_GESTO = {
  angelita: 'pala', oso: 'patas', jaguar: 'patas',
  guacamaya: 'pico', chivito: 'pico', zariguya: 'hocico', luciernaga: 'luz',
};
const COMPAI_NUCLEO = { guacamaya: 'guaca' }; // id del <g> núcleo para encuadre
// El elenco que se ofrece = los del ELENCO que tienen arte en GUIAS_ARTE, en un
// orden agradable (Angelita primero: es la anfitriona de este mundo).
function elencoDisponible() {
  const arte = window.GUIAS_ARTE || {};
  const orden = ['angelita', 'oso', 'jaguar', 'guacamaya', 'zariguya', 'chivito', 'luciernaga'];
  return orden.filter((id) => ELENCO[id] && arte[id]);
}

// Monta el rig SVG de un compañero (no-angelita) en un shadow DOM y lo encuadra
// por getBBox — patrón calcado de onboarding.js/portales.js (montaGuia). El host
// es el <div> billboard; devolvemos el propio host. Para chips del switcher, se
// reusa con `mini=true` (encaje más apretado).
function montarRigCompai(host, id, mini = false) {
  const arte = window.GUIAS_ARTE && window.GUIAS_ARTE[id];
  if (!arte) { host.textContent = '·'; return; }
  const root = host.shadowRoot || host.attachShadow({ mode: 'open' });
  host.setAttribute('data-estado', COMPAI_ESTADO[id] || 'idle');
  root.innerHTML =
    '<style>:host{display:block;overflow:hidden}' + arte.css +
    'svg{width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;display:block;overflow:visible}</style>' +
    '<svg viewBox="0 0 900 1150" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">' +
    arte.defs + arte.svg + '</svg>';
  encuadrarCompai(root, COMPAI_NUCLEO[id] || id, mini ? 26 : 44);
  return host;
}
function encuadrarCompai(root, nucleoId, M, intento = 0) {
  let b = null;
  try { const n = root.getElementById(nucleoId) || root.querySelector('svg > g'); b = n && n.getBBox(); }
  catch (e) { b = null; }
  const svg = root.querySelector('svg');
  if (b && b.width > 1 && b.height > 1 && svg) {
    svg.setAttribute('viewBox',
      `${(b.x - M).toFixed(0)} ${(b.y - M).toFixed(0)} ${(b.width + 2 * M).toFixed(0)} ${(b.height + 2 * M).toFixed(0)}`);
    return;
  }
  if (intento < 100) setTimeout(() => encuadrarCompai(root, nucleoId, M, intento + 1), 60);
}

// ── CSS del overlay (bee + burbuja + rótulos + selector + registro) ─────────
const CSS = `
#smbOverlay{position:fixed;inset:0;z-index:21;pointer-events:none;overflow:hidden;font-family:Georgia,'Times New Roman',serif}
#smbOverlay .smbBB{position:absolute;left:0;top:0;will-change:transform;transform-origin:50% 55%}
#smbOverlay .smbBee{display:block;filter:drop-shadow(0 2px 3px rgba(71,49,20,0.35))}
@keyframes smbWingBeat{0%,100%{transform:scaleY(1) rotate(0deg)}50%{transform:scaleY(0.55) rotate(-8deg)}}
#smbOverlay .smbWing{transform-origin:0% 100%;animation:smbWingBeat .12s linear infinite}
#smbOverlay .smbWing2{animation-delay:-.06s}
/* la pala de Angelita: escondida salvo cuando cava (smbCavar), y con estocada */
@keyframes smbPalaEstocada{0%,100%{transform:translate(-8.5px,6.2px) rotate(28deg)}50%{transform:translate(-9.2px,8.6px) rotate(46deg)}}
#smbOverlay .smbBee.smbCavar .smbPala{display:block!important;transform-box:fill-box;
  transform-origin:0% 0%;animation:smbPalaEstocada .32s ease-in-out infinite}
/* rasguño de patas / picotazo: pulso rápido de rascado mientras cava */
@keyframes smbClawRasca{0%,100%{transform:translateY(-2px) scaleY(.9);opacity:.55}50%{transform:translateY(3px) scaleY(1.12);opacity:1}}
#smbOverlay .smbClaw{transform-origin:50% 50%;animation:smbClawRasca .18s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){#smbOverlay .smbBee.smbCavar .smbPala{animation:none}#smbOverlay .smbClaw{animation:none}}
@media (prefers-reduced-motion:reduce){#smbOverlay .smbWing{animation:none}}
#smbOverlay .smbChip{position:absolute;left:0;top:0;transform:translate(-50%,-100%);
  background:rgba(253,247,232,0.94);border:2px solid #7a5a2a;border-radius:9px;padding:5px 9px;
  box-shadow:3px 4px 0 rgba(42,26,12,0.18);color:#2a1a0c;max-width:180px;text-align:left;line-height:1.25}
#smbOverlay .smbChip b{display:block;font-size:12px;font-weight:700}
#smbOverlay .smbChip i{display:block;font-size:10px;color:#6a4a1e}
#smbOverlay .smbChip span{display:block;font-size:10px;color:#3a2c18;margin-top:1px}
/* MEJORA 2 (avisos legibles): la burbuja de diálogo YA NO es un billboard 3D
   pegado a la abeja (temblaba con cada aleteo/vuelo/picada — ilegible). Ahora
   es un panel HUD FIJO en pantalla: no rota con la cámara, no sigue beePos,
   fondo sólido opaco. Vive fuera de #smbOverlay (que es solo para lo que SÍ
   se proyecta desde 3D) para dejar clarísimo que es 2D puro. */
#smbHud{position:fixed;left:16px;bottom:140px;z-index:24;max-width:min(86vw,420px);
  display:flex;align-items:flex-start;gap:9px;pointer-events:none;
  opacity:0;transform:translateY(6px);transition:opacity .3s,transform .3s}
#smbHud.on{opacity:1;transform:translateY(0)}
#smbHud .smbHudIco{flex:0 0 auto;width:34px;height:34px;border-radius:50%;
  background:${ABEJA.cuerpo};border:2.5px solid #2a1a0c;display:grid;place-items:center;
  font-size:17px;box-shadow:2px 3px 0 rgba(42,26,12,0.25)}
#smbHud .smbHudBox{background:rgba(255,252,242,0.98);border:2.5px solid #2a1a0c;border-radius:13px;
  padding:9px 13px;box-shadow:4px 5px 0 rgba(42,26,12,0.22);color:#2a1a0c;font-size:13px;
  line-height:1.38;font-style:italic}
#smbHud .smbHudBox b{display:block;font-style:normal;font-size:9.5px;letter-spacing:.12em;
  text-transform:uppercase;color:#7a5a20;margin-bottom:2px}
#smbLamina{position:fixed;left:20px;top:16px;z-index:22;pointer-events:none;max-width:min(70vw,560px)}
#smbLamina .smbKicker{font:600 12px/1 system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#7a5a20}
#smbLamina h1{margin:2px 0 0;font-size:clamp(24px,4.2vw,42px);font-style:italic;font-weight:700;color:#4a3208;text-shadow:0 2px 0 rgba(255,255,255,.45);line-height:1.02}
#smbLamina .smbSub{margin-top:3px;font-size:12.5px;color:#5a4014;font-style:italic}
#smbReg{position:fixed;right:14px;top:14px;z-index:22;pointer-events:none;background:rgba(253,247,232,0.93);
  border:2px solid #7a5a2a;border-radius:10px;padding:8px 12px;max-width:240px;font-family:Georgia,serif;
  box-shadow:3px 4px 0 rgba(42,26,12,0.15)}
#smbReg .smbRegT{font:600 10px/1 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#7a5a20}
#smbReg .smbRegItem{font-size:11.5px;color:#2a1a0c;margin-top:4px;line-height:1.3}
#smbReg .smbRegItem i{color:#6a4a1e;font-size:10px;display:block}
#smbReg .smbRegVacio{font-size:11px;color:#6a4a1e;font-style:italic;margin-top:4px}
/* MEJORA 3 (50 especies): selector agrupado por piso térmico. #smbSelWrap
   apila las PESTAÑAS (#smbTabs, una por piso: cálido/templado/frío/páramo)
   sobre el scroller horizontal de cartas (#smbSel) — sin esto, 50 cartas en
   una sola fila sería un scroll interminable e ilegible. */
#smbSelWrap{position:fixed;left:50%;bottom:0;transform:translateX(-50%);z-index:23;
  display:flex;flex-direction:column;align-items:center;gap:6px;padding-bottom:12px;pointer-events:none}
#smbTabs{display:flex;gap:6px;pointer-events:auto}
.smbTab{background:rgba(42,26,12,0.72);color:#f6ecd4;border:2px solid rgba(246,236,212,0.35);
  border-radius:8px;padding:4px 11px;font:600 11px/1.2 Georgia,serif;cursor:pointer;user-select:none;
  transition:background .15s,border-color .15s}
.smbTab:hover{background:rgba(42,26,12,0.88)}
.smbTab.on{background:#2e7d32;border-color:#eef7e2;color:#fff}
#smbSel{display:flex;gap:8px;overflow-x:auto;max-width:96vw;padding:6px 8px;pointer-events:auto;scrollbar-width:thin}
.smbCard{flex:0 0 auto;width:88px;background:rgba(253,247,232,0.95);border:2px solid #7a5a2a;border-radius:12px;
  padding:7px 6px;text-align:center;cursor:pointer;font-family:Georgia,serif;box-shadow:3px 4px 0 rgba(42,26,12,0.18);
  transition:transform .15s,border-color .15s;user-select:none}
.smbCard:hover{transform:translateY(-3px)}
.smbCard.sel{border-color:#2e7d32;background:#eef7e2;transform:translateY(-4px)}
.smbCard .e{font-size:21px;line-height:1.1}
.smbCard b{display:block;font-size:10.5px;color:#2a1a0c;line-height:1.15;margin-top:2px}
.smbCard i{display:block;font-size:8.5px;color:#6a4a1e;margin-top:1px}
#smbSel.ocupado{opacity:.45;pointer-events:none}
#smbTabs.ocupado{opacity:.45;pointer-events:none}
#smbHint{position:fixed;left:50%;bottom:112px;transform:translateX(-50%);z-index:23;pointer-events:none;
  background:rgba(42,26,12,0.85);color:#f6ecd4;border-radius:9px;padding:6px 14px;font:italic 13px Georgia,serif;
  opacity:0;transition:opacity .3s}
#smbHint.on{opacity:1}
/* ── EL SWITCHER DE COMPAI (cambiar de compañero en vivo) ──────────────────
   Fila de fichas-avatar arriba al centro. Cada una es un compañero del ELENCO
   canónico (compai/elenco.js) con arte en GUIAS_ARTE. Al tocar una, el rig del
   billboard se cambia EN VIVO y la elección se guarda (cruza a la PWA/valle). */
/* centrado y BAJO el título/hoja-de-vida (título arriba-izq, registro arriba-der) */
#smbCompai{position:fixed;left:50%;top:88px;transform:translateX(-50%);z-index:24;
  display:flex;align-items:center;gap:7px;padding:6px 10px;pointer-events:auto;
  background:rgba(42,26,12,0.62);border:2px solid rgba(246,236,212,0.32);border-radius:14px;
  box-shadow:3px 4px 0 rgba(42,26,12,0.22);backdrop-filter:blur(2px)}
#smbCompai .smbCompaiT{font:600 9.5px/1.1 system-ui,sans-serif;letter-spacing:.1em;
  text-transform:uppercase;color:#f6ecd4;opacity:.82;margin-right:2px;max-width:64px}
.smbCompaiChip{flex:0 0 auto;width:46px;height:52px;border-radius:11px;cursor:pointer;
  background:rgba(253,247,232,0.9);border:2px solid #7a5a2a;overflow:hidden;
  display:flex;flex-direction:column;align-items:center;justify-content:flex-end;
  transition:transform .15s,border-color .15s,box-shadow .15s;user-select:none;position:relative}
.smbCompaiChip:hover{transform:translateY(-2px)}
.smbCompaiChip.sel{border-color:#2e7d32;box-shadow:0 0 0 1px #2e7d32,0 6px 14px rgba(0,0,0,.35)}
.smbCompaiChip .smbCompaiRig{width:100%;height:38px;display:block;overflow:hidden;pointer-events:none}
.smbCompaiChip .smbCompaiN{font:600 7px/1 Georgia,serif;color:#2a1a0c;padding:1px 0 2px;
  width:100%;text-align:center;background:rgba(253,247,232,0.85);white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis}
#smbCompai.ocupado{opacity:.45;pointer-events:none}
@media (max-width:700px){#smbCompai{top:auto;bottom:206px;gap:5px;padding:5px 7px}
  #smbCompai .smbCompaiT{display:none}.smbCompaiChip{width:40px;height:46px}
  #smbReg{max-width:170px;font-size:10px}#smbLamina h1{font-size:22px}}
`;

function montarDOM() {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const lamina = document.createElement('div'); lamina.id = 'smbLamina';
  lamina.innerHTML = '<div class="smbKicker">Valle vivo · capacidad del compai</div><h1>Registrar siembra en 3D</h1>'
    + '<div class="smbSub">Elija por piso térmico, toque el suelo — el compai la siembra y la registra.</div>';
  document.body.appendChild(lamina);
  const reg = document.createElement('div'); reg.id = 'smbReg';
  reg.innerHTML = '<div class="smbRegT">🌱 Hoja de vida · mis matas</div><div class="smbRegVacio">Sin matas todavía — Angelita está lista.</div>';
  document.body.appendChild(reg);
  const overlay = document.createElement('div'); overlay.id = 'smbOverlay';
  document.body.appendChild(overlay);
  const hint = document.createElement('div'); hint.id = 'smbHint'; document.body.appendChild(hint);
  // MEJORA 2: panel HUD fijo para lo que Angelita dice — NO vive en #smbOverlay
  // (no se proyecta desde 3D, no tiembla, no rota con la cámara).
  const hud = document.createElement('div'); hud.id = 'smbHud';
  hud.innerHTML = '<div class="smbHudIco">🐝</div><div class="smbHudBox"><b>El compai dice</b><span class="smbHudTxt"></span></div>';
  document.body.appendChild(hud);
  return { overlay, reg, hint, hud };
}

// ═══════════════════ EL MONTAJE ═══════════════════
export function initSiembra() {
  const q = new URLSearchParams(location.search);

  // ── suprimir el valle (main.js corre detrás; lo apagamos — patrón abejas) ──
  const sup = document.createElement('style');
  sup.textContent =
    'body.mundoSiembra #c,body.mundoSiembra #onb,body.mundoSiembra #load,' +
    'body.mundoSiembra #hud,body.mundoSiembra #capaLugares,body.mundoSiembra #barraMover,' +
    'body.mundoSiembra #guiaSel,body.mundoSiembra #guiaV,body.mundoSiembra #ventanaM,' +
    'body.mundoSiembra #minimapaWrap,body.mundoSiembra #compaiFotoBtn' +
    '{display:none!important}body.mundoSiembra{background:#0a0a0f}';
  document.head.appendChild(sup);
  document.body.classList.add('mundoSiembra');
  // OJO (bug latente en el patrón de abejas.js): main.js publica SU renderer en
  // window.__r y nosotros lo PISAMOS más abajo — si los reintentos de apagado
  // leyeran window.__r en diferido, a los 300 ms matarían NUESTRO loop. Por eso
  // el renderer del valle se captura AHORA, por valor, antes de pisar el hook.
  const rendererValle = window.__r || null;
  const pararValle = () => { try { if (rendererValle) rendererValle.setAnimationLoop(null); } catch (e) { /* aún no */ } };
  pararValle(); setTimeout(pararValle, 400); setTimeout(pararValle, 1500);

  // ── canvas + renderer propios ──────────────────────────────────────────────
  const canvas = document.createElement('canvas'); canvas.id = 'cSiembra';
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;display:block;z-index:20;touch-action:none';
  document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  window.__rSiembra = renderer; window.__r = renderer; // hooks del gate

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(new THREE.Color(C.cieloHorizonte).getHex(), 0.016);
  const camera = new THREE.PerspectiveCamera(44, innerWidth / innerHeight, 0.1, 400);
  // encuadre HERO: bajo, el lote al centro, la caja a la izquierda, monte al fondo
  const HERO = new THREE.Vector3(3.2, 3.4, 12.8);
  const MIRA = new THREE.Vector3(0.2, 1.5, 0.6);
  camera.position.copy(HERO); camera.lookAt(MIRA);
  window.__camSiembra = camera; window.__cam = camera; window.__scene = scene;

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(MIRA);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 5; controls.maxDistance = 26;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.minPolarAngle = 0.2;
  controls.enablePan = false;
  controls.update();
  // el companion NO pelea con la mano del usuario: si arrastra, la cámara es suya
  let manoLibreHasta = 0;
  controls.addEventListener('start', () => { manoLibreHasta = reloj.getElapsedTime() + 7; });

  // ── luz de hora dorada ─────────────────────────────────────────────────────
  scene.add(new THREE.HemisphereLight(0xffe7c0, 0x5a5030, 0.9));
  const sol = new THREE.DirectionalLight(0xffdf9c, 2.4);
  sol.position.set(-14, 12, -8); scene.add(sol);
  const relleno = new THREE.DirectionalLight(0xbcd0e6, 0.45);
  relleno.position.set(12, 8, 10); scene.add(relleno);

  const raiz = new THREE.Group(); scene.add(raiz);
  const boveda = new THREE.Mesh(construirBoveda(), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false, fog: false }));
  boveda.scale.set(1, 0.7, 1); boveda.position.y = -8; scene.add(boveda);
  const solG = new THREE.Group();
  const dirSol = new THREE.Vector3(-14, 12, -8).normalize();
  solG.position.set(dirSol.x * 70, Math.max(16, dirSol.y * 60), dirSol.z * 74);
  solG.add(new THREE.Mesh(new THREE.SphereGeometry(3.2, 20, 16), new THREE.MeshBasicMaterial({ color: '#fff3d2', fog: false })));
  solG.add(new THREE.Mesh(new THREE.SphereGeometry(5.4, 20, 16), new THREE.MeshBasicMaterial({ color: '#ffdf9c', transparent: true, opacity: 0.42, depthWrite: false, fog: false })));
  scene.add(solG);

  const prado = new THREE.Mesh(construirPrado(), new THREE.MeshLambertMaterial({ vertexColors: true }));
  raiz.add(prado);
  montarNubes(raiz);
  montarSotobosque(raiz);
  montarCaja(raiz);
  const niebla = montarNiebla(raiz);
  const motasTierra = crearMotas(raiz, C.tierraFresca, 0.11, false);
  const motasPolen = crearMotas(raiz, C.miel, 0.13, true);

  const ctx = { renderer };

  // ── DOM: overlay + selector + registro ─────────────────────────────────────
  const { overlay, reg, hint, hud } = montarDOM();
  const hudTxt = hud.querySelector('.smbHudTxt');
  function billboard(html) { const d = document.createElement('div'); d.className = 'smbBB'; d.innerHTML = html; overlay.appendChild(d); return d; }
  function chip(titulo, latin, texto) {
    const d = document.createElement('div'); d.className = 'smbChip';
    d.innerHTML = `<b>${titulo}</b><i>${latin}</i>${texto ? `<span>${texto}</span>` : ''}`;
    overlay.appendChild(d); return d;
  }
  const chips = []; // { el, pos } — rótulos anclados a puntos del mundo
  function chipEn(pos, titulo, latin, texto) { const el = chip(titulo, latin, texto); chips.push({ el, pos }); return el; }

  chipEn(new THREE.Vector3(CAJA_POS.x, alturaPrado(CAJA_POS.x, CAJA_POS.z) + 1.45, CAJA_POS.z),
    'La caja de Angelita', 'Tetragonisca angustula', 'de aquí sale a sembrar');

  // ── el MONTE del fondo y los ya ESTABLECIDOS: árboles REALES de la fábrica ──
  // (coherencia: acá no hay bombones dodecaedro — todo árbol es su especie)
  const ESTABLECIDOS = [
    ['nogal_cafetero', -10.5, -10.5, 1.0], ['cedro_real', -4.5, -12.5, 0.95], ['guamo', 4.0, -12.0, 1.0],
    ['aliso_andino', 9.5, -10.0, 1.0], ['cedro_real', 13.0, -8.0, 0.9], ['nogal_cafetero', -14.0, -6.5, 0.9],
    // los dos del mediocampo ENSEÑAN el contraste de siluetas junto al lote:
    ['guayacan_rosado', -6.8, -5.2, 1.0], ['cacao', 6.8, -4.2, 1.0],
  ];
  ESTABLECIDOS.forEach(([esp, x, z, s], i) => {
    const { g, radio } = crearArbolMesh(esp, hashSeed(esp) ^ Math.imul(i + 1, 0x9e3779b1), ctx);
    const e = ESC_ARBOL * s;
    g.position.set(x, alturaPrado(x, z) - 0.06, z);
    g.scale.setScalar(e);
    g.rotation.y = i * 1.37;
    raiz.add(g);
    sombra(raiz, x, z, Math.max(0.5, radio * e * 0.85), { y: 0.05, ex: 1.15 });
  });
  // rótulos solo en los dos del mediocampo (la lección del contraste)
  chipEn(new THREE.Vector3(-6.8, alturaPrado(-6.8, -5.2) + 13 * ESC_ARBOL * 0.78, -5.2), '🌸 Guayacán rosado', 'Tabebuia rosea', null);
  chipEn(new THREE.Vector3(6.8, alturaPrado(6.8, -4.2) + 6.4 * ESC_ARBOL * 1.05, -4.2), '🍫 Cacao', 'Theobroma cacao', null);

  // ── EL COMPAI (quién siembra) — switchable en vivo ──────────────────────────
  // El billboard `beeEl` es el contenedor; su CONTENIDO cambia según el compañero
  // elegido. Angelita usa su SVG animado propio (aleteo + semilla que suelta);
  // los demás usan su rig de GUIAS_ARTE en shadow DOM. `beeSvg`/`semillaDot` se
  // re-consultan en cada swap (existen solo para Angelita; para los otros son
  // null y las fases de la obra ya los tocan con guardas).
  const beeEl = billboard('');
  // `?compai=<id>` preselecciona el compañero (gate determinista); si no, se lee
  // la elección guardada (cruza desde el valle/PWA); default Angelita.
  let compaiActual = (q.get('compai') || leerCompanero() || 'angelita');
  if (!COMPAI_HUD[compaiActual] || !(window.GUIAS_ARTE || {})[compaiActual]) compaiActual = 'angelita';
  let beeSvg = null, semillaDot = null, palaEl = null;
  const hudIco = hud.querySelector('.smbHudIco');
  const hudDice = hud.querySelector('.smbHudBox b');
  function montarCompaiEnBillboard(id) {
    beeEl.innerHTML = '';
    // el host viejo con shadow se descarta al vaciar innerHTML; creamos uno nuevo
    if (id === 'angelita') {
      beeEl.innerHTML = svgAngelita();
      beeSvg = beeEl.firstElementChild;
      semillaDot = beeSvg ? beeSvg.querySelector('.smbSemilla') : null;
      palaEl = beeSvg ? beeSvg.querySelector('.smbPala') : null; // pala (gesto humano)
    } else {
      const host = document.createElement('div');
      host.className = 'smbCompaiBB';
      host.style.cssText = 'display:block;width:130px;height:auto';
      beeEl.appendChild(host);
      montarRigCompai(host, id, false);
      beeSvg = null; semillaDot = null; palaEl = null; // otros rigs: gesto por billboard
    }
  }
  function refrescarHudCompai(id) {
    const h = COMPAI_HUD[id] || COMPAI_HUD.angelita;
    if (hudIco) hudIco.textContent = h.ico;
    if (hudDice) hudDice.textContent = h.dice;
  }
  montarCompaiEnBillboard(compaiActual);
  refrescarHudCompai(compaiActual);

  // ── FX del gesto de cavar (marcas de rasguño de PATAS / picotazo) ──────────
  // Billboard 2D anclado al sitio de siembra; solo se muestra en la fase 'cava'
  // y solo para los gestos que no dibujan un prop propio (patas/pico/hocico).
  // Da lectura clara de "está escarbando con las patas" en el billboard (arcos
  // de garra + polvo) sin un rig 3D nuevo.
  const gestoFX = billboard('');
  gestoFX.style.display = 'none';
  const gestoSvg = {
    patas: '<svg viewBox="-20 -20 40 40" style="width:74px;height:auto">'
      + '<g class="smbClaw" fill="none" stroke="#5a3a1c" stroke-width="2.6" stroke-linecap="round" opacity="0.9">'
      + '<path d="M-9,-8 Q-4,-1 -8,7"/><path d="M-1,-10 Q1,-2 -1,8"/><path d="M7,-8 Q4,-1 8,7"/></g>'
      + '<g fill="#7a5230"><circle cx="-11" cy="9" r="1.6"/><circle cx="0" cy="11" r="1.7"/><circle cx="11" cy="9" r="1.6"/></g></svg>',
    pico: '<svg viewBox="-20 -20 40 40" style="width:58px;height:auto">'
      + '<path class="smbClaw" d="M0,-11 L2.6,2 L-2.6,2 Z" fill="#caa24a" stroke="#5a3a1c" stroke-width="1.4"/>'
      + '<g fill="#7a5230"><circle cx="-6" cy="8" r="1.4"/><circle cx="6" cy="8" r="1.4"/></g></svg>',
    hocico: '<svg viewBox="-20 -20 40 40" style="width:60px;height:auto">'
      + '<ellipse class="smbClaw" cx="0" cy="0" rx="7" ry="4.6" fill="#caa88a" stroke="#5a3a1c" stroke-width="1.4"/>'
      + '<circle cx="-2.4" cy="0" r="1.1" fill="#3a2617"/><circle cx="2.4" cy="0" r="1.1" fill="#3a2617"/>'
      + '<g fill="#7a5230"><circle cx="-8" cy="8" r="1.3"/><circle cx="8" cy="8" r="1.3"/></g></svg>',
    luz: '<svg viewBox="-20 -20 40 40" style="width:64px;height:auto">'
      + '<circle class="smbClaw" cx="0" cy="0" r="8" fill="#fff2a8" opacity="0.55"/>'
      + '<circle cx="0" cy="0" r="3.4" fill="#ffe066"/></svg>',
  };
  function mostrarGestoFX(gesto) {
    const html = gestoSvg[gesto];
    if (!html) { gestoFX.style.display = 'none'; gestoFX.innerHTML = ''; return; }
    gestoFX.innerHTML = html;
    gestoFX.style.display = 'block';
  }
  function ocultarGestoFX() { gestoFX.style.display = 'none'; gestoFX.innerHTML = ''; }

  const beePos = BOCA.clone().add(new THREE.Vector3(0, 0.3, 0.4));
  // MEJORA 2 (avisos legibles): "lo que dice" vive en el HUD fijo (hud/hudTxt,
  // montado por montarDOM) — YA NO es un billboard 3D pegado a beePos, así que
  // no tiembla con el vuelo/aleteo/picada. decir() solo escribe texto + abre
  // una ventana de tiempo; actualizarBurbujaHUD() (en el loop) hace fade in/out.
  let burbujaHasta = 0;
  function decir(texto, dur = 4.5) {
    hudTxt.textContent = texto;
    burbujaHasta = reloj.getElapsedTime() + dur;
  }
  function actualizarBurbujaHUD() {
    hud.classList.toggle('on', reloj.getElapsedTime() < burbujaHasta);
  }

  const _v = new THREE.Vector3();
  const _v2fx = new THREE.Vector3(); // reusado para anclar el FX de gesto al sitio
  function proyectar(el, v3, pxBase, dirX, sx = 1, sy = 1) {
    _v.copy(v3).project(camera);
    if (_v.z > 1) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    const x = (_v.x * 0.5 + 0.5) * innerWidth;
    const y = (-_v.y * 0.5 + 0.5) * innerHeight;
    const dist = camera.position.distanceTo(v3);
    const px = clamp(pxBase * (8 / dist), pxBase * 0.4, pxBase * 2.2);
    const inner = el.firstElementChild;
    if (inner) {
      const tag = inner.tagName.toLowerCase();
      // Angelita = <svg> directo; los otros compai = un <div> host con shadow rig.
      // En ambos casos fijamos el ancho en px (la altura la resuelve el rig).
      if (tag === 'svg') { inner.style.width = px + 'px'; inner.style.height = 'auto'; }
      else { inner.style.width = (px * 1.15) + 'px'; inner.style.height = (px * 1.5) + 'px'; }
    }
    el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-55%) scale(${(dirX * sx).toFixed(3)},${sy.toFixed(3)})`;
    el.style.zIndex = Math.round((1 - _v.z) * 1000);
  }
  function proyectarChip(el, v3, dy = -100) {
    _v.copy(v3).project(camera);
    if (_v.z > 1) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    const x = (_v.x * 0.5 + 0.5) * innerWidth;
    const y = (-_v.y * 0.5 + 0.5) * innerHeight;
    el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,${dy}%)`;
  }

  // ═══════════════ EL REGISTRO (la hoja de vida por mata) ═══════════════
  // GANCHO DEL INSERTION MODULE: cada mata sembrada es un objeto con especie/
  // fecha/posición/estado. Cuando se cablee el módulo real, esto se convierte
  // en el asset de farmOS/PWA (una moneda, tres caras: 3D = dato = seguimiento).
  const registro = [];
  window.__registroMatas = registro;
  const alRegistrar = [];   // callbacks del futuro insertion module
  function pintarRegistro() {
    const items = registro.map((m) => {
      const c = CATALOGO[m.especie] || {};
      const f = fichaSiembra(m.especie);
      return `<div class="smbRegItem">${c.emoji || '🌱'} <b>#${m.id} ${c.comun || m.especie}</b>`
        + `<i>${m.fechaLegible} · ${f.piso} · copa ${f.copa} · cosecha ${f.cosecha}</i></div>`;
    }).join('');
    reg.innerHTML = '<div class="smbRegT">🌱 Hoja de vida · mis matas</div>'
      + (items || '<div class="smbRegVacio">Sin matas todavía — Angelita está lista.</div>');
  }
  function registrar(especie, x, z) {
    const c = CATALOGO[especie];
    const f = fichaSiembra(especie);
    const mata = {
      id: registro.length + 1,
      especie,
      comun: c.comun, cientifico: c.cientifico, piso: f.piso, copa: f.copa, cosecha: f.cosecha,
      sembrada: new Date().toISOString(),
      fechaLegible: new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }),
      posicion: { x: +x.toFixed(2), z: +z.toFixed(2) },
      sembradaPor: compaiActual,
      estado: 'sembrada',
      eventos: [{ tipo: 'siembra', fecha: new Date().toISOString() }], // ← la hoja de vida arranca aquí
    };
    registro.push(mata);
    guardarMatas(registro);
    pintarRegistro();
    alRegistrar.forEach((cb) => { try { cb(mata); } catch (e) { /* gancho ajeno */ } });
    return mata;
  }
  pintarRegistro();

  // ═══════════════ LAS MATAS PLANTADAS (y su re-siembra desde storage) ════════
  const ocupados = [ { x: CAJA_POS.x, z: CAJA_POS.z, r: 1.6 } ];
  ESTABLECIDOS.forEach(([, x, z]) => ocupados.push({ x, z, r: 1.8 }));
  function libre(x, z) {
    if (Math.abs(x) > 7.6 || z < -3.6 || z > 6.8) return false;
    return ocupados.every((o) => (x - o.x) * (x - o.x) + (z - o.z) * (z - o.z) > o.r * o.r);
  }
  function plantarMata(especie, x, z, semilla, conChip = true) {
    const { g, altura, radio } = crearArbolMesh(especie, semilla, ctx);
    g.position.set(x, alturaPrado(x, z) - 0.05, z);
    g.rotation.y = (semilla % 628) / 100;
    raiz.add(g);
    const somb = sombra(raiz, x, z, Math.max(0.4, radio * ESC_ARBOL * 0.85), { y: 0.055, ex: 1.15 });
    somb.scale.multiplyScalar(0.001);
    ocupados.push({ x, z, r: Math.max(1.1, radio * ESC_ARBOL) });
    return { g, altura, radio, somb };
  }
  // lo ya registrado en visitas anteriores REAPARECE crecido: el registro es real
  try {
    const prev = leerMatas();
    prev.forEach((m) => {
      if (!CATALOGO[m.especie] || !m.posicion) return;
      registro.push(m);
      const mata = plantarMata(m.especie, m.posicion.x, m.posicion.z, hashSeed(m.especie + m.id));
      mata.g.scale.setScalar(ESC_ARBOL);
      mata.somb.scale.set(Math.max(0.4, mata.radio * ESC_ARBOL * 0.85) * 2 * 1.15, 1, Math.max(0.4, mata.radio * ESC_ARBOL * 0.85) * 2);
      const c = CATALOGO[m.especie];
      chipEn(new THREE.Vector3(m.posicion.x, alturaPrado(m.posicion.x, m.posicion.z) + mata.altura * ESC_ARBOL + 0.3, m.posicion.z),
        `${c.emoji} ${c.comun}`, c.cientifico, `sembrada ${m.fechaLegible || ''}`);
    });
    if (registro.length) pintarRegistro();
  } catch (e) { /* storage limpio */ }

  // ═══════════════ EL SWITCHER DE COMPAI (cambiar de compañero en vivo) ═══════
  // La barra de arriba: una ficha por compañero del ELENCO con arte. Tocar una
  // cambia el rig del billboard EN VIVO y guarda la elección (escribirCompanero
  // → cruza a la PWA y al valle 3D). Se deshabilita durante una obra (una
  // siembra a la vez; no cambiamos de jinete a media siembra).
  const compaiBar = document.createElement('div'); compaiBar.id = 'smbCompai';
  const compaiT = document.createElement('span'); compaiT.className = 'smbCompaiT';
  compaiT.textContent = 'Compai'; compaiBar.appendChild(compaiT);
  const chipsCompai = new Map();
  function cambiarCompai(id) {
    if (obra) return;                         // no se cambia de jinete a media siembra
    if (!COMPAI_HUD[id] || !(window.GUIAS_ARTE || {})[id]) return;
    compaiActual = id;
    montarCompaiEnBillboard(id);
    refrescarHudCompai(id);
    escribirCompanero(id);                    // canónica + heredadas → cruza la app
    chipsCompai.forEach((chip, k) => chip.classList.toggle('sel', k === id));
    const h = COMPAI_HUD[id];
    decir(`Ahora lo acompaña ${h.nombre}. ${h.nombre} siembra con usted — elija una especie.`, 4.5);
  }
  elencoDisponible().forEach((id) => {
    const h = COMPAI_HUD[id] || { nombre: id };
    const chip = document.createElement('div'); chip.className = 'smbCompaiChip'; chip.dataset.id = id;
    chip.title = h.nombre;
    const rig = document.createElement('div'); rig.className = 'smbCompaiRig';
    const nm = document.createElement('div'); nm.className = 'smbCompaiN'; nm.textContent = h.nombre;
    chip.appendChild(rig); chip.appendChild(nm); compaiBar.appendChild(chip);
    montarRigCompai(rig, id, true);
    chip.addEventListener('click', () => cambiarCompai(id));
    chipsCompai.set(id, chip);
    chip.classList.toggle('sel', id === compaiActual);
  });
  document.body.appendChild(compaiBar);

  // ═══════════════ EL SELECTOR DE ESPECIE (50, agrupadas por piso) ═══════════
  // MEJORA 3: con 50 especies una sola fila-scroll sería ilegible — pestañas
  // por piso térmico (cálido/templado/frío/páramo, POR_PISO_TERMICO) filtran
  // qué fila de cartas se ve; el scroll horizontal queda corto (13-19 cartas
  // por piso en vez de 50).
  const selWrap = document.createElement('div'); selWrap.id = 'smbSelWrap'; document.body.appendChild(selWrap);
  const tabs = document.createElement('div'); tabs.id = 'smbTabs'; selWrap.appendChild(tabs);
  const sel = document.createElement('div'); sel.id = 'smbSel'; selWrap.appendChild(sel);
  let seleccion = null;
  let pisoActivo = 'templado'; // arranca en templado: café/cacao/aguacate, lo más reconocible

  function pintarCartas() {
    sel.innerHTML = '';
    GRUPOS_SEL.find((gr) => gr.piso === pisoActivo).claves.forEach((k) => {
      const c = CATALOGO[k];
      const card = document.createElement('div'); card.className = 'smbCard'; card.dataset.especie = k;
      card.innerHTML = `<div class="e">${c.emoji}</div><b>${c.comun}</b><i>${c.piso}</i>`;
      card.addEventListener('click', () => {
        if (obra) return;
        autoCancelado = true;             // la mano del usuario manda sobre el demo
        seleccion = k;
        sel.querySelectorAll('.smbCard').forEach((el) => el.classList.toggle('sel', el === card));
        hint.textContent = `Ahora toque el suelo del lote — Angelita siembra su ${c.comun.toLowerCase()}.`;
        hint.classList.add('on');
        decir(`¡${c.comun}! Buena elección. Muéstreme dónde la quiere.`, 5);
      });
      sel.appendChild(card);
    });
  }
  GRUPOS_SEL.forEach((gr) => {
    const tab = document.createElement('div'); tab.className = 'smbTab'; tab.textContent = gr.titulo;
    tab.dataset.piso = gr.piso;
    tab.addEventListener('click', () => {
      if (obra || pisoActivo === gr.piso) return;
      pisoActivo = gr.piso;
      tabs.querySelectorAll('.smbTab').forEach((el) => el.classList.toggle('on', el === tab));
      pintarCartas();
    });
    tab.classList.toggle('on', gr.piso === pisoActivo);
    tabs.appendChild(tab);
  });
  pintarCartas();

  // el marcador de sitio (anillo que sigue el puntero cuando hay especie elegida)
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.56, 28),
    new THREE.MeshBasicMaterial({ color: '#2e7d32', transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })
  );
  marker.rotation.x = -Math.PI / 2; marker.visible = false; raiz.add(marker);
  const ray = new THREE.Raycaster();
  const puntero = new THREE.Vector2();
  let markerOk = false;
  function bajoPuntero(ev) {
    puntero.set((ev.clientX / innerWidth) * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(puntero, camera);
    const hit = ray.intersectObject(prado, false)[0];
    return hit ? hit.point : null;
  }
  canvas.addEventListener('pointermove', (ev) => {
    if (!seleccion || obra) { marker.visible = false; return; }
    const p = bajoPuntero(ev);
    if (!p) { marker.visible = false; return; }
    markerOk = libre(p.x, p.z);
    marker.visible = true;
    marker.position.set(p.x, alturaPrado(p.x, p.z) + 0.06, p.z);
    marker.material.color.set(markerOk ? '#2e7d32' : '#9c3b1e');
  });
  canvas.addEventListener('pointerdown', (ev) => {
    if (!seleccion || obra) return;
    const p = bajoPuntero(ev);
    if (!p || !libre(p.x, p.z)) return;
    sembrar(seleccion, p.x, p.z);
  });

  // ═══════════════ LA OBRA DE SIEMBRA (máquina de fases) ═══════════════
  // vuelo → cava → suelta → crece → celebra → vuelta. La cámara ACOMPAÑA
  // (companion de Imperios): el target se desliza al sitio mientras ella actúa.
  let obra = null;
  const focoCam = MIRA.clone();

  function sembrar(especie, x, z) {
    const c = CATALOGO[especie];
    if (!c || obra || !libre(x, z)) return;   // una obra a la vez, y en sitio libre
    seleccion = null; marker.visible = false;
    sel.classList.add('ocupado'); tabs.classList.add('ocupado'); compaiBar.classList.add('ocupado');
    sel.querySelectorAll('.smbCard').forEach((el) => el.classList.remove('sel'));
    hint.classList.remove('on');
    const y = alturaPrado(x, z);
    const sitio = new THREE.Vector3(x, y, z);
    // el montículo de tierra fresca (aparece al cavar)
    const monticulo = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.22, 9), new THREE.MeshLambertMaterial({ color: C.tierraFresca, flatShading: true }));
    monticulo.position.set(x, y + 0.02, z); monticulo.scale.setScalar(0.001); raiz.add(monticulo);
    // el brote (tallito + dos hojitas): el intermedio semilla→árbol
    const brote = new THREE.Group(); brote.position.set(x, y + 0.05, z); brote.scale.setScalar(0.001); raiz.add(brote);
    const tallito = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.42, 6), new THREE.MeshLambertMaterial({ color: C.brote }));
    tallito.position.y = 0.21; brote.add(tallito);
    [[0.4, 1], [-0.5, -1]].forEach(([rot, s]) => {
      const hoja = new THREE.Mesh(new THREE.CircleGeometry(0.13, 7), new THREE.MeshLambertMaterial({ color: C.brote, side: THREE.DoubleSide }));
      hoja.position.set(0.09 * s, 0.38, 0); hoja.rotation.set(-0.9, 0, rot);
      brote.add(hoja);
    });
    // el árbol REAL de la fábrica, listo pero en escala 0 (crece en su fase)
    const mata = plantarMata(especie, x, z, hashSeed(especie + (registro.length + 1)));
    mata.g.scale.setScalar(0.001);
    const t = reloj.getElapsedTime();
    obra = {
      especie, sitio, monticulo, brote, mata,
      fase: 'vuelo', t0: t,
      desde: beePos.clone(),
      durVuelo: Math.max(1.2, beePos.distanceTo(sitio) / 3.2),
      chipFinal: null,
    };
    if (semillaDot) semillaDot.style.display = 'block';
    decir(`¡Ya voy! Llevo la semilla de ${c.comun.toLowerCase()}.`, 3.5);
  }

  // fases de la obra, cada una con su gesto y su comentario (builder que enseña)
  const DUR = { cava: 2.6, suelta: 1.5, crece: 3.2, celebra: 2.4 };
  function actualizarObra(t, dt) {
    if (!obra) return { sx: 1, sy: 1, dirX: 1 };
    const o = obra;
    const c = CATALOGO[o.especie];
    const u = (dur) => clamp((t - o.t0) / dur, 0, 1);
    const alto = o.sitio.y + 0.85;
    let sx = 1, sy = 1, dirX = o.sitio.x >= o.desde.x ? 1 : -1;

    if (o.fase === 'vuelo') {
      const k = u(o.durVuelo);
      const s = k * k * (3 - 2 * k);
      beePos.lerpVectors(o.desde, new THREE.Vector3(o.sitio.x, alto, o.sitio.z), s);
      beePos.y += Math.sin(s * Math.PI) * (0.7 + o.durVuelo * 0.22);
      // stretch en vuelo (rubber-hose): estirada en el arranque, asienta al llegar
      sy = 1 + Math.sin(s * Math.PI) * 0.14; sx = 1 - Math.sin(s * Math.PI) * 0.1;
      if (k >= 1) {
        o.fase = 'cava'; o.t0 = t;
        // gesto de cavar PROPIO del personaje (pala / patas / pico / hocico / luz)
        o.gesto = COMPAI_GESTO[compaiActual] || 'pala';
        if (o.gesto === 'pala' && beeSvg) beeSvg.classList.add('smbCavar'); // saca la pala
        if (o.gesto !== 'pala') mostrarGestoFX(o.gesto);                    // FX de garra/pico/hocico
        const dice = o.gesto === 'patas' ? 'Aquí mismo — escarbo con las patas para abrir el hueco…'
          : o.gesto === 'pico' ? 'Aquí mismo — picoteo el suelo para abrirlo…'
          : o.gesto === 'hocico' ? 'Aquí mismo — hozo con el hocico y aflojo la tierra…'
          : o.gesto === 'luz' ? 'Aquí mismo — marco el sitio y aflojo la tierrita…'
          : 'Aquí mismo. Primero aflojamos la tierra con la pala…';
        decir(dice, DUR.cava + 0.5);
      }
    } else if (o.fase === 'cava') {
      const k = u(DUR.cava);
      // El GESTO cambia según quién siembra (billboard + partículas + prop):
      if (o.gesto === 'patas') {
        // ESCARBAR CON LAS PATAS (jaguar/oso): agachado al frente, rasguño rápido
        // (5 pasadas), más tierra volando hacia el frente. La bestia se inclina y
        // rebaja (squash ancho), no da estocada vertical de herramienta.
        const rasca = Math.abs(Math.sin(k * Math.PI * 5));
        beePos.set(o.sitio.x, lerp(alto - 0.18, o.sitio.y + 0.16, 0.55 + rasca * 0.45), o.sitio.z);
        sx = 1 + rasca * 0.34; sy = 1 - rasca * 0.30;   // achatado al escarbar
        if (rasca > 0.85) motasTierra.emitir(o.sitio.x, o.sitio.y + 0.1, o.sitio.z + 0.15, 1.4); // más tierra, al frente
      } else if (o.gesto === 'pico' || o.gesto === 'hocico') {
        // PICOTAZO / HOZAR (aves / zarigüeya): estocadas cortas y secas de cabeza.
        const golpe = Math.abs(Math.sin(k * Math.PI * 4));
        beePos.set(o.sitio.x, lerp(alto, o.sitio.y + 0.26, golpe), o.sitio.z);
        sx = 1 + golpe * 0.20; sy = 1 - golpe * 0.18;
        if (golpe > 0.9) motasTierra.emitir(o.sitio.x, o.sitio.y + 0.12, o.sitio.z, 0.7);
      } else if (o.gesto === 'luz') {
        // LUCIÉRNAGA: casi no cava — pulsa sobre el sitio, la tierra se afloja sola.
        const pulso = Math.sin(k * Math.PI * 6) * 0.5 + 0.5;
        beePos.set(o.sitio.x, o.sitio.y + 0.5 + pulso * 0.2, o.sitio.z);
        sy = 1 + pulso * 0.08;
        if (pulso > 0.92) motasTierra.emitir(o.sitio.x, o.sitio.y + 0.12, o.sitio.z, 0.4);
      } else {
        // PALA (Angelita, humana): 3 estocadas verticales con la herramienta.
        const abajo = Math.abs(Math.sin(k * Math.PI * 3));
        beePos.set(o.sitio.x, lerp(alto, o.sitio.y + 0.22, abajo), o.sitio.z);
        sx = 1 + abajo * 0.28; sy = 1 - abajo * 0.26;
        if (abajo > 0.92) motasTierra.emitir(o.sitio.x, o.sitio.y + 0.12, o.sitio.z, 0.8);
      }
      o.monticulo.scale.setScalar(Math.max(0.001, easeOutCubic(k)));
      if (k >= 1) {
        o.fase = 'suelta'; o.t0 = t;
        if (beeSvg) beeSvg.classList.remove('smbCavar'); // guarda la pala
        ocultarGestoFX();
        decir(`La semilla va con cariño — ${c.comun.toLowerCase()}, ${c.cientifico}.`, DUR.suelta + 0.6);
      }
    } else if (o.fase === 'suelta') {
      const k = u(DUR.suelta);
      beePos.set(o.sitio.x, lerp(o.sitio.y + 0.32, alto * 0.94, easeOutCubic(k)), o.sitio.z);
      if (semillaDot && k > 0.25) semillaDot.style.display = 'none';   // la soltó
      o.brote.scale.setScalar(Math.max(0.001, easeOutBack(clamp((k - 0.3) / 0.7, 0, 1)) * 0.9));
      if (k >= 1) {
        o.fase = 'crece'; o.t0 = t;
        const f = fichaSiembra(o.especie);
        decir(`${c.frase} Ficha: ${f.piso}; copa ${f.copa}; primera cosecha ${f.cosecha}.`, DUR.crece + 3.5);
      }
    } else if (o.fase === 'crece') {
      const k = u(DUR.crece);
      // el brote cede…
      o.brote.scale.setScalar(Math.max(0.001, 0.9 * (1 - easeOutCubic(clamp(k / 0.3, 0, 1)))));
      // …y el árbol CRECE A SU FORMA: overshoot vertical primero (stretch), el
      // ancho asienta después — squash&stretch del propio árbol (Nintendo juicy)
      const g = clamp((k - 0.12) / 0.88, 0, 1);
      const syA = easeOutBack(g);
      const sxA = easeOutCubic(clamp(g * 1.12, 0, 1));
      o.mata.g.scale.set(Math.max(0.001, sxA * ESC_ARBOL), Math.max(0.001, syA * ESC_ARBOL), Math.max(0.001, sxA * ESC_ARBOL));
      const rS = Math.max(0.4, o.mata.radio * ESC_ARBOL * 0.85) * sxA;
      o.mata.somb.scale.set(Math.max(0.001, rS * 2 * 1.15), 1, Math.max(0.001, rS * 2));
      // Angelita revolotea alrededor mientras crece + polen dorado
      const aa = t * 3.1;
      const rr = 0.5 + o.mata.radio * ESC_ARBOL * 0.6;
      beePos.set(o.sitio.x + Math.cos(aa) * rr, o.sitio.y + 0.5 + syA * o.mata.altura * ESC_ARBOL * 0.75, o.sitio.z + Math.sin(aa) * rr);
      dirX = Math.cos(aa + Math.PI / 2) >= 0 ? 1 : -1;
      if (rnd() < dt * 9) motasPolen.emitir(o.sitio.x + (rnd() - 0.5) * 1.2, o.sitio.y + 0.4 + rnd() * syA * 2.2, o.sitio.z + (rnd() - 0.5) * 1.2);
      if (k >= 1) {
        o.fase = 'celebra'; o.t0 = t;
        const mataReg = registrar(o.especie, o.sitio.x, o.sitio.z);
        o.chipFinal = chipEn(
          new THREE.Vector3(o.sitio.x, o.sitio.y + o.mata.altura * ESC_ARBOL + 0.3, o.sitio.z),
          `${c.emoji} ${c.comun}`, c.cientifico, `sembrada hoy · mata #${mataReg.id}`);
        decir(`📋 Quedó en su hoja de vida: mata #${mataReg.id}. Yo le sigo el rastro.`, DUR.celebra + 1.4);
      }
    } else if (o.fase === 'celebra') {
      const k = u(DUR.celebra);
      // rulo de celebración alrededor de la copa nueva
      const aa = k * Math.PI * 4;
      const rr = 0.4 + o.mata.radio * ESC_ARBOL * 0.7;
      const hh = o.sitio.y + o.mata.altura * ESC_ARBOL * (0.55 + 0.35 * Math.sin(k * Math.PI));
      beePos.set(o.sitio.x + Math.cos(aa) * rr, hh, o.sitio.z + Math.sin(aa) * rr);
      dirX = Math.cos(aa + Math.PI / 2) >= 0 ? 1 : -1;
      sy = 1 + Math.sin(k * Math.PI * 4) * 0.08;
      if (k >= 1) { o.fase = 'vuelta'; o.t0 = t; o.desde = beePos.clone(); o.durVuelo = Math.max(1.1, beePos.distanceTo(BOCA) / 3.6); }
    } else if (o.fase === 'vuelta') {
      const k = u(o.durVuelo);
      const s = k * k * (3 - 2 * k);
      beePos.lerpVectors(o.desde, new THREE.Vector3(BOCA.x, BOCA.y + 0.3, BOCA.z + 0.4), s);
      beePos.y += Math.sin(s * Math.PI) * 0.9;
      dirX = BOCA.x >= o.desde.x ? 1 : -1;
      if (k >= 1) { obra = null; sel.classList.remove('ocupado'); tabs.classList.remove('ocupado'); compaiBar.classList.remove('ocupado'); }
    }
    return { sx, sy, dirX };
  }

  // ═══════════════ AUTO-DEMO (el gate en 0 clicks) ═══════════════
  // `?auto=1` (la portada del prototipo redirige con él): a los ~1,5 s Angelita
  // siembra sola la especie de `?sembrar=` (aguacate por defecto) en un punto
  // fijo del lote — determinista: la captura del gate siempre ve lo mismo.
  const especieAuto = CATALOGO[q.get('sembrar')] ? q.get('sembrar') : 'aguacate';
  const autoOn = q.get('auto') !== '0';
  let autoHecho = false, autoCancelado = false;
  function sitioAuto() {
    const cands = [[1.7, 1.6], [0.4, 2.6], [3.0, 0.6], [-1.2, 0.2], [2.2, 3.4], [-0.6, 4.0]];
    for (const [x, z] of cands) if (libre(x, z)) return [x, z];
    return null;
  }

  // hooks del gate y del insertion module
  window.__siembra = { sembrar, registro, alRegistrar, enCurso: () => (obra ? obra.fase : null) };

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  });
  const loadEl = document.getElementById('load');
  if (loadEl) loadEl.remove();

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.4, 0.75, 0.83));
  composer.addPass(new OutputPass());

  // saludo de arranque (según quién acompaña — se puede cambiar arriba)
  const reloj = new THREE.Clock();
  {
    const h = COMPAI_HUD[compaiActual] || COMPAI_HUD.angelita;
    const saludo = compaiActual === 'angelita'
      ? 'Quiubo — soy Angelita, y hoy sembramos. Elija una especie abajo, o déjeme mostrarle.'
      : `Quiubo — hoy lo acompaña ${h.nombre}, y sembramos juntos. Elija una especie abajo, o cambie de compañero arriba.`;
    decir(saludo, 5.5);
  }

  const reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;
  let last = 0;
  renderer.setAnimationLoop(() => {
    const t = reloj.getElapsedTime();
    const dt = Math.min(0.05, t - last); last = t;
    controls.update();
    for (let i = 0; i < arbolesVivos.length; i++) arbolesVivos[i].update(t); // viento propio de ez-tree (50 especies)

    // auto-demo
    if (autoOn && !autoHecho && !autoCancelado && !obra && t > 1.5) {
      autoHecho = true;
      const s = sitioAuto();
      if (s) sembrar(especieAuto, s[0], s[1]);
    }

    // la obra (o el idle en la caja)
    let pose = { sx: 1, sy: 1, dirX: 1 };
    if (obra) pose = actualizarObra(t, dt);
    else {
      // idle: suspendida frente a su piquera, tanteando (respira)
      beePos.set(
        BOCA.x + Math.sin(t * 1.4) * 0.1,
        BOCA.y + 0.3 + Math.sin(t * 2.1) * 0.07,
        BOCA.z + 0.4 + Math.cos(t * 1.1) * 0.06
      );
      pose.dirX = 1;
    }
    if (reduced) { pose.sx = 1; pose.sy = 1; }
    // MEJORA 1: Angelita protagonista — pxBase subió de 56 a 140 (2.5×) para
    // que se lea su rubber-hose de lejos y no quede un puntico en el prado.
    proyectar(beeEl, beePos, PX_BASE_ABEJA, pose.dirX, pose.sx, pose.sy);
    // el FX de gesto (rasguño de patas / picotazo / hocico / luz) va anclado al
    // SITIO de siembra, solo durante la fase de cavar (los demás casos ocultos).
    if (obra && obra.fase === 'cava' && gestoFX.style.display !== 'none') {
      proyectar(gestoFX, _v2fx.set(obra.sitio.x, obra.sitio.y + 0.28, obra.sitio.z), 70, 1, 1, 1);
    }
    // MEJORA 2: la burbuja YA NO seguía el mundo 3D de beePos cuadro a cuadro
    // (temblaba con cada aleteo/vuelo) — ahora es HUD fijo en pantalla.
    actualizarBurbujaHUD();

    // la cámara ACOMPAÑA la obra (si el usuario no está arrastrando)
    if (t > manoLibreHasta) {
      const meta = obra && obra.fase !== 'vuelta'
        ? _v.set(obra.sitio.x, obra.sitio.y + 1.3, obra.sitio.z)
        : _v.copy(MIRA);
      focoCam.lerp(meta, 1 - Math.exp(-2.0 * dt));
      controls.target.copy(focoCam);
    } else focoCam.copy(controls.target);

    // rótulos anclados
    for (const ch of chips) proyectarChip(ch.el, ch.pos);
    // marcador pulsando
    if (marker.visible) marker.scale.setScalar(1 + Math.sin(t * 5) * 0.08);
    // niebla que respira
    if (!reduced) for (const n of niebla) n.m.position.x = n.x0 + Math.sin(t * 0.05 + n.ph) * n.dr;
    motasTierra.update(dt);
    motasPolen.update(dt);
    composer.render();
  });

  return { renderer, scene, camera };
}
