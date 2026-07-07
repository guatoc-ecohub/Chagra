/**
 * platanoBananoData — datos GROUNDED y lógica DETERMINISTA de la mini-app
 * "Plátano y banano" (mundo Cultivos y semillas).
 *
 * El plátano y el banano son el pancoger clave del campesino colombiano. Este
 * módulo NO reimplementa el motor de sanidad ni el de ciclo: se apoya en lo que
 * ya vive groundeado en el catálogo/grafo y lo pone en una pantalla foto-forward
 * al estilo de AguaScreen / AlmacenamientoScreen.
 *
 * FILOSOFÍA (inviolable, igual que almacenamientoCalculator.js):
 *   - La MATEMÁTICA es determinista y estándar (aquí: densidad de siembra =
 *     10.000 m² ÷ (distancia × distancia)). Se calcula, no se inventa.
 *   - Los DATOS agronómicos salen del catálogo/grafo con su fuente. Lo que no
 *     tiene respaldo (dosis exactas de un químico, un número NPK puntual) NO se
 *     inventa: va como "Dato en camino" honesto o simplemente no se afirma.
 *   - Amenazas (sigatoka, picudo): reconocerlas + manejo AGROECOLÓGICO. Cero
 *     recetas químicas con dosis inventadas.
 *
 * Grounding (fuentes reales ya en el repo):
 *   - public/cycle-content/musa_paradisiaca.json  → variedades, anatomía clonal,
 *     distancias 3x3–4x4, deshije madre-hijo-nieto, demanda de K y MO, asocio
 *     cafetero, plan de alimentación. Fuentes tier A: PoWO Kew, GBIF, Agrosavia
 *     (Manual frutales tropicales), Cenicafé (Manual cafetero 2013).
 *   - public/grafo-relations.json (species.musa_paradisiaca) → compañeras
 *     (café, yuca, fríjol, maíz) y controladores biológicos de sigatoka/picudo.
 *   - src/components/sanidad/sanidadData.js → vietas de sigatoka negra
 *     (Mycosphaerella fijiensis, SciELO Colombia) y moko (Ralstonia).
 */

/* ── El gancho: por qué el plátano es una mata distinta a todo. ───────────── */
export const GANCHO_PLATANO = {
  titulo: 'La mata que nunca se acaba',
  cuerpo:
    'El plátano no es un árbol: es la hierba más alta del mundo. Ese "tronco" es un '
    + 'pseudotallo, hojas enrolladas muy apretadas. Y una sola siembra le da cosecha '
    + 'para siempre: la mata madre pare un hijo, el hijo un nieto, y así la mata se '
    + 'renueva sola en el mismo sitio, año tras año.',
  fuente: 'Agrosavia · PoWO (Kew) · GBIF',
  confianza: 'alta',
};

/* ── Tres verdades de la mata, legibles de un vistazo. ────────────────────── */
export const TRES_VERDADES = [
  {
    icon: 'sprout',
    titulo: 'Hierba gigante',
    sub: 'No es árbol: el "tronco" es pseudotallo, puras hojas enrolladas. Mide 4 a 8 metros.',
    accent: 'lime',
  },
  {
    icon: 'copy',
    titulo: 'Todas clones',
    sub: 'Se siembra por hijo, no por semilla. Toda la platanera es la misma mata repetida.',
    accent: 'emerald',
  },
  {
    icon: 'refresh',
    titulo: 'Madre, hijo, nieto',
    sub: 'La madre cosecha una vez y se corta; el hijo sigue. Cosecha continua sin resembrar.',
    accent: 'amber',
  },
];

/* ═══════════════════════ 1. Variedades ═══════════════════════
 * Grounded a cycle-content (valor_pedagogico + nombres_comunes) y al uso
 * campesino. Describimos región y uso — sin inventar cifras de rendimiento. */
export const VARIEDADES = [
  {
    id: 'harton',
    nombre: 'Hartón',
    grupo: 'Plátano para cocinar',
    donde: 'Caribe y Pacífico, tierra caliente.',
    como: 'Dedos grandes y gruesos, pocos por racimo. El del patacón, el tajado y el maduro frito.',
    foto: 'racimo-verde',
  },
  {
    id: 'dominico-harton',
    nombre: 'Dominico hartón',
    grupo: 'Plátano para cocinar',
    donde: 'Eje cafetero y zona templada.',
    como: 'Dedos medianos, racimo más largo. Es el plátano clásico del cafetal, a la sombra del café.',
    foto: 'cafe-sombra',
  },
  {
    id: 'cachaco',
    nombre: 'Cachaco / popocho',
    grupo: 'Plátano rústico',
    donde: 'Antioquia y clima templado.',
    como: 'Aguantador y de mata gruesa. Para sopas, sancocho y cocido; menos delicado con la plaga.',
    foto: 'platanera-mata',
  },
  {
    id: 'topocho',
    nombre: 'Topocho',
    grupo: 'Plátano rústico',
    donde: 'Tierra caliente húmeda.',
    como: 'Muy rústico y resistente. Racimos de muchos dedos cortos; comida segura de la casa.',
    foto: 'platanera-mata',
  },
  {
    id: 'banano-criollo',
    nombre: 'Banano / guineo criollo',
    grupo: 'Banano de postre',
    donde: 'De tierra caliente a templada.',
    como: 'Musa acuminata: dulce, para comer maduro. Guineo, murrapo o banano de la finca.',
    foto: 'banano-maduro',
  },
  {
    id: 'manzano',
    nombre: 'Manzano',
    grupo: 'Banano de postre',
    donde: 'Clima cálido.',
    como: 'Banano pequeño con dejo a manzana. De la mata para la casa, muy apreciado fresco.',
    foto: 'banano-maduro',
  },
];

/* ═══════════════════════ 2. La mata como sistema ═══════════════════════
 * La sucesión madre-hijo-nieto y el deshije. Grounded a cycle-content:
 * "deshije a 1 planta + 1 hijo + 1 nieto (cosecha continua)". */
export const SUCESION = [
  {
    rol: 'Madre',
    emoji: '🌴',
    desc: 'La planta grande que ya botó el racimo. Da UNA cosecha en su vida; después se corta al ras.',
  },
  {
    rol: 'Hijo',
    emoji: '🌱',
    desc: 'El colino más vigoroso que dejó la madre. Toma el relevo y será la próxima en cosechar.',
  },
  {
    rol: 'Nieto',
    emoji: '🌾',
    desc: 'El siguiente hijo, más pequeño. Espera su turno para que la mata nunca pare.',
  },
];

export const DESHIJE = {
  regla: 'Una madre, un hijo, un nieto',
  cuerpo:
    'La mata echa muchos hijos, pero si los deja todos se estorban, no engordan el racimo y '
    + 'crían plaga y enfermedad. El deshije es escoger: se deja la madre, el hijo mejor ubicado '
    + 'y un nieto; los demás se cortan. Así la platanera respira, entra luz y la cosecha se '
    + 'reparte en el tiempo.',
  pasos: [
    'Deje el hijo que salga del lado opuesto al racimo de la madre, para que no se caiga.',
    'Corte los hijos sobrantes al ras y en bisel para que no rebroten.',
    'Elija hijos "de espada" (hoja angosta), que son los más vigorosos, no los de hoja ancha.',
  ],
  fuente: 'Agrosavia — Manual de plátano · Cenicafé (asocio café-plátano)',
  confianza: 'alta',
};

/* ═══════════════════════ 3. Siembra ═══════════════════════
 * Colino/cormo, hoyo y distancias. Grounded a cycle-content
 * (feeding_plan D+0 "Hoyo 40x40x40 cm", distancias "3x3 m a 4x4 m"). */
export const SIEMBRA = {
  material: [
    {
      id: 'colino',
      titulo: 'Colino (hijo de espada)',
      desc: 'El hijo joven con hoja angosta que se saca de una mata sana. Es el material más común y prende parejo.',
    },
    {
      id: 'cormo',
      titulo: 'Cormo o semilla-cormo',
      desc: 'El rizoma (la "cepa") partido en pedazos con una yema buena. Rinde más material de una sola mata madre.',
    },
  ],
  hoyo: 'Hoyo de 40 x 40 x 40 cm. Al fondo, materia orgánica (bocashi o compost). El colino va con la yema hacia arriba.',
  sanidad:
    'Escoja el colino de una mata SANA y despoje el cormo de tierra y raíces viejas antes de sembrar. '
    + 'Ahí empieza el control del picudo y del moko: colino sucio = plaga sembrada.',
  fuente: 'Agrosavia — Manual de plátano',
  confianza: 'alta',
};

/* Distancias de referencia grounded (cycle-content: "distancias 3x3 m a 4x4 m
 * según variedad"). El cálculo de densidad es geometría exacta. */
export const DISTANCIAS_REFERENCIA = [
  { etiqueta: '3 × 3 m', entrePlantas: 3, entreSurcos: 3, nota: 'Denso: variedades pequeñas o monocultivo tecnificado.' },
  { etiqueta: '3,5 × 3,5 m', entrePlantas: 3.5, entreSurcos: 3.5, nota: 'Intermedio, muy usado en el Eje cafetero.' },
  { etiqueta: '4 × 4 m', entrePlantas: 4, entreSurcos: 4, nota: 'Amplio: variedades grandes (hartón) o asocio con café/cacao.' },
];

/**
 * Densidad de siembra: cuántas matas caben por hectárea.
 * Geometría EXACTA: 10.000 m² ÷ (distancia entre plantas × distancia entre surcos).
 * @param {string|number} entrePlantas distancia en metros entre matas de la misma hilera
 * @param {string|number} entreSurcos  distancia en metros entre hileras
 * @returns {{ matasPorHa: number, area: string } | null}
 */
export function calcularDensidadSiembra(entrePlantas, entreSurcos) {
  const dp = parseFloat(String(entrePlantas).replace(',', '.'));
  const ds = parseFloat(String(entreSurcos).replace(',', '.'));
  if (!Number.isFinite(dp) || !Number.isFinite(ds) || dp <= 0 || ds <= 0) return null;
  const areaMata = dp * ds;
  const matasPorHa = Math.round(10000 / areaMata);
  return { matasPorHa, area: areaMata.toFixed(2) };
}

/* ═══════════════════════ 4. Sombra y asociación ═══════════════════════
 * Grounded a grafo compatible_with (coffea_arabica, manihot_esculenta,
 * phaseolus_vulgaris, zea_mays) y a cycle-content (sombrío con guamo en cafetal,
 * asocio multiestrato cafetero). El plátano es el "paraguas" del sistema. */
export const ASOCIACION = {
  intro:
    'El plátano es el paraguas de la finca: su hoja grande da sombra fresca y sube la humedad. '
    + 'Por eso acompaña tan bien al café y al cacao, que necesitan sombrío para producir sin estresarse.',
  companeras: [
    { nombre: 'Café', emoji: '☕', desc: 'Sombra temporal mientras crece el café; el dominico hartón es el compañero clásico del cafetal.' },
    { nombre: 'Cacao', emoji: '🍫', desc: 'Sombra de establecimiento: protege el cacao joven del sol fuerte los primeros años.' },
    { nombre: 'Guamo', emoji: '🌳', desc: 'Sombra alta y fijadora de nitrógeno; con el plátano arma el multiestrato del cafetal.' },
    { nombre: 'Yuca, fríjol, maíz', emoji: '🌽', desc: 'Pancoger de piso bajo mientras la platanera se establece: comida temprana en el mismo lote.' },
  ],
  fuente: 'Cenicafé — Manual cafetero (2013) · Agrosavia',
  confianza: 'alta',
};

/* ═══════════════════════ 5. Nutrición: el hambre de potasio ═══════════════════════
 * Grounded a cycle-content: "gran demandante de K y MO", "K y Mg críticos para
 * llenado de racimo", "ceniza_madera al pie". NO se afirma un número NPK puntual. */
export const NUTRICION_K = {
  titulo: 'El plátano tiene hambre de potasio',
  cuerpo:
    'De todos los nutrientes, el que más pide el plátano es el POTASIO (K). El potasio es el que '
    + 'llena el racimo: engruesa los dedos y les da peso. Junto con el potasio pide mucha materia '
    + 'orgánica y magnesio (Mg).',
  fuentesAgro: [
    { nombre: 'Ceniza de leña', desc: 'La fuente campesina de potasio más a la mano. Un puño al pie de la mata.' },
    { nombre: 'Bocashi y compost', desc: 'Materia orgánica que alimenta y suelta la tierra; al hoyo y en corona.' },
    { nombre: 'El propio pseudotallo', desc: 'La mata cosechada, picada y devuelta al pie, regresa su potasio al suelo. El ciclo se cierra solo.' },
  ],
  nota:
    'Las dosis exactas dependen de su análisis de suelo. Este módulo no inventa un número de bulto: '
    + 'la idea es alimentar con potasio y materia orgánica, y devolver el pseudotallo.',
  fuente: 'Agrosavia · Cenicafé',
  confianza: 'alta',
};

/* ═══════════════════════ 6. Amenazas: sigatoka y picudo ═══════════════════════
 * Reconocer + manejo AGROECOLÓGICO. Grounded a sanidadData (sigatoka:
 * Mycosphaerella fijiensis, sombra ≥20% baja severidad, deshoje/despunte, buen
 * drenaje; SciELO Colombia) y grafo (controladores biológicos). Cero dosis
 * químicas inventadas. */
export const SIGATOKA = {
  id: 'sigatoka',
  nombre: 'Sigatoka negra',
  cientifico: 'Mycosphaerella fijiensis',
  tipo: 'Hongo de la hoja',
  foto: 'sigatoka-hoja',
  reconocer: [
    'Rayitas finas cafés o negras que corren a lo largo de la hoja, siguiendo las venas.',
    'Las rayas se juntan en manchas grandes; la hoja se seca desde la punta y el borde.',
    'Empieza por las hojas de abajo (las más viejas) y sube. Si seca muchas hojas, el racimo no llena.',
  ],
  manejo: [
    { titulo: 'Deshoje sanitario', desc: 'Corte y saque del lote las hojas más rayadas. Menos hoja enferma = menos hongo regándose.' },
    { titulo: 'Buen drenaje y aireación', desc: 'Zanjas para que no se encharque, y deshije para que entre luz y aire: el hongo odia la mata ventilada.' },
    { titulo: 'Algo de sombra', desc: 'Una sombra moderada baja la fuerza de la enfermedad, sin ahogar la mata.' },
  ],
  biocontrol:
    'En el grafo hay controladores biológicos asociados (bacteria y hongo antagonista). Como '
    + 'preventivo tradicional se usa el caldo bordelés en época de lluvias; la concentración y '
    + 'frecuencia dependen del lote — pregúntele al agente antes de aplicar.',
  fuente: 'SciELO Colombia · Agrosavia',
  confianza: 'alta',
};

export const PICUDO = {
  id: 'picudo',
  nombre: 'Picudo negro del plátano',
  cientifico: 'Cosmopolites sordidus',
  tipo: 'Gorgojo (cucarrón) del cormo',
  foto: 'picudo-cosmopolites',
  reconocer: [
    'Un cucarrón negro, duro, del tamaño de un fríjol, que se esconde en la base de la mata y bajo la hojarasca.',
    'El daño real lo hace la larva: hace galerías (túneles) dentro del cormo y debilita la mata.',
    'La mata picada crece torcida, se afloja y se cae con el viento o con el peso del racimo.',
  ],
  manejo: [
    { titulo: 'Colino sano, siempre', desc: 'Siembre solo colinos de matas limpias y despoje el cormo de tierra y raíces viejas. Es la defensa #1.' },
    { titulo: 'Trampas de pseudotallo', desc: 'Corte trozos de pseudotallo (tipo cuña o disco) y déjelos boca abajo: el picudo se refugia ahí y usted lo recoge y elimina.' },
    { titulo: 'Aporque y aseo', desc: 'Tape bien la base de la mata con tierra y no deje cepas viejas ni cormos podridos: son cría de picudo.' },
  ],
  biocontrol:
    'El grafo asocia al picudo el hongo entomopatógeno Beauveria bassiana, que enferma al '
    + 'cucarrón. La dosis y el modo de aplicarlo dependen del producto — ese dato puntual va en '
    + 'camino; consúltelo antes de usarlo.',
  biocontrolPendiente:
    'Dosis y frecuencia de Beauveria bassiana para picudo: falta el dato de etiqueta groundeado. No lo inventamos.',
  fuente: 'Manejo integrado Agrosavia / ICA · grafo Chagra',
  confianza: 'media',
};

/* ═══════════════════════ 7. Cosecha ═══════════════════════
 * Grounded a la plantilla de fenología (musa_paradisiaca.v1): cosecha cuando los
 * dedos están llenos y angulosos, 80-100 días post-floración, una por planta. */
export const COSECHA = {
  titulo: 'El punto de corte',
  senales: [
    'Los dedos están llenos y "engordados", pero todavía con sus aristas (angulosos), no del todo redondos.',
    'Se corta 80 a 100 días después de que salió la bellota (la flor). Una sola cosecha por mata.',
    'Para vender lejos, córtelo más "tres cuartos"; para la casa, déjelo llenar un poco más.',
  ],
  tras:
    'Cortado el racimo, la planta madre ya cumplió: se corta el pseudotallo al ras y el hijo toma el relevo. '
    + 'Nada se bota — ese pseudotallo es abono.',
  fuente: 'ICA — Guía de plátano · Agrosavia',
  confianza: 'alta',
};

/* ═══════════════════════ 8. Aprovechamiento del pseudotallo y la hoja ═══════════════════════
 * El puente al mundo del estiércol/compost. Grounded a la práctica agroecológica
 * de devolver el pseudotallo (rico en K) al suelo. */
export const APROVECHAMIENTO = [
  {
    id: 'abono',
    titulo: 'Pseudotallo picado = abono',
    desc: 'Pique el pseudotallo de la madre cosechada y déjelo al pie, o llévelo a la compostera. Es agua y '
      + 'potasio que vuelven a la tierra: cierra el ciclo del nutriente que la mata más pide.',
    icon: 'recycle',
  },
  {
    id: 'empaque',
    titulo: 'La hoja: empaque y plato',
    desc: 'La hoja de plátano envuelve el bocadillo, el tamal, el bagre; sirve de plato y de mantel. Empaque '
      + 'natural que no deja basura.',
    icon: 'leaf',
  },
  {
    id: 'cobertura',
    titulo: 'Hojarasca de cobertura',
    desc: 'Las hojas viejas y la "pinocha" del plátano, tendidas en el suelo, guardan humedad y frenan la maleza. '
      + 'Mantillo gratis para el cafetal.',
    icon: 'sprout',
  },
];

/* Créditos de foto: fuente única en JS (espejo de
 * /public/platano-banano/creditos.json). Requisito CC-BY: autor + licencia +
 * enlace, siempre visibles. Se completa desde creditos.json tras verificar. */
export const FOTO_BASE_PLATANO = '/platano-banano';
