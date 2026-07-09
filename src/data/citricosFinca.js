/*
 * i18n (ADR-050): este archivo es CONTENIDO/copy campesino en español Colombia
 * (variedades, piso térmico, siembra, plagas y cosecha de los cítricos),
 * pendiente de migrar a src/config/messages.js — mismo criterio que
 * cafeFinca.js / frutalesFinca.js / aguaFinca.js.
 */
/**
 * citricosFinca.js — CONTENIDO del mundo "Los cítricos" (profundización dedicada
 * del frutal cítrico, patrón de 5 estaciones del ciclo, como el café).
 *
 * REGLA ANTI-ALUCINACIÓN (igual que cafeFinca.js): todo lo CUALITATIVO
 * (variedades, injerto, piso térmico, prácticas, señales de plaga, biocontroles)
 * vive aquí como copy groundeado en el grafo Chagra y en fuentes colombianas
 * (AGROSAVIA, ICA). Las CIFRAS DURAS que dependen del sitio (distancia exacta por
 * patrón, dosis de fertilizante) NO se inventan: son SLOTS `grounded_pendiente`
 * o se remiten al análisis de suelo / al agente.
 *
 * GROUNDING del grafo (public/grafo-relations.json → species):
 *   - citrus_sinensis  (Naranja, Citrus × sinensis)  — introducido; compatible_with arazá.
 *   - citrus_reticulata(Mandarina, Citrus reticulata) — introducido.
 *   - citrus_latifolia (Limón Tahití/lima, Citrus × latifolia) — perennialCycles
 *     confianza ALTA: primera cosecha 3–4 años, produce todo el año con pico
 *     nov–mar, del nivel del mar hasta ~2100 msnm (AGROSAVIA).
 *   - plagas: se toman de pest_controllers (AFFECTS/CONTROLS del grafo). El
 *     `plagaGrafo` deja la trazabilidad al nodo AGE. NO se inventan enemigos
 *     naturales ni dosis químicas. Los biocontroles citados están en el grafo.
 *   - biopreparados: la lista compartida de las tres especies cítricas.
 *
 * HONESTIDAD DE FALTANTES: la gomosis (Phytophthora del tronco/raíz) es una
 * enfermedad real del cítrico, pero HOY NO está en el grafo Chagra para cítricos
 * → se declara "dato en camino", NO se inventa manejo. Igual el limón criollo
 * (Citrus × aurantiifolia): no tiene nodo propio en el grafo todavía.
 */

export const ESTADO_GROUNDED_PENDIENTE = 'grounded_pendiente';

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIONES (pestañas del mundo)
 * ──────────────────────────────────────────────────────────────────────── */
export const ESTACIONES_CITRICOS = [
  { id: 'variedades', titulo: 'Variedades e injerto', descripcion: 'Cuál escoger y por qué injertado' },
  { id: 'piso', titulo: 'El piso térmico', descripcion: 'Clima cálido: dónde SÍ y dónde NO' },
  { id: 'siembra', titulo: 'Siembra y poda', descripcion: 'Drenaje, hoyo y formación' },
  { id: 'plagas', titulo: 'Plagas y HLB', descripcion: 'Reconózcalas y manéjelas' },
  { id: 'cosecha', titulo: 'Abono y cosecha', descripcion: 'Nutrición, punto y poscosecha' },
];

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 1 · VARIEDADES E INJERTO
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Las cuatro cítricas del solar campesino. GROUNDED: naranja, mandarina y limón
 * Tahití son nodos del grafo (citrus_sinensis, citrus_reticulata,
 * citrus_latifolia). El limón criollo (aurantiifolia) es real y muy común, pero
 * NO tiene nodo propio en el grafo todavía → se marca `enGrafo:false` para ser
 * honestos (se maneja igual que el grupo cítrico).
 */
export const VARIEDADES_CITRICOS = [
  {
    id: 'naranja',
    nombre: 'Naranja dulce',
    cientifico: 'Citrus × sinensis',
    foto: 'naranja',
    enGrafo: true,
    nota: 'La reina del solar: Valencia (jugo), Washington/ombliga (mesa, sin pepa) y las criollas. De clima cálido a medio. La fecha de cosecha varía MUCHO por región; el grafo la marca con confianza baja.',
    fuente: 'AGROSAVIA / ICA (grafo: citrus_sinensis)',
  },
  {
    id: 'mandarina',
    nombre: 'Mandarina',
    cientifico: 'Citrus reticulata',
    foto: 'mandarina',
    enGrafo: true,
    nota: 'La de pelar con la mano: Arrayana (la criolla colombiana), Oneco, Clementina. Dulce y temprana. Su calendario exacto de cosecha aún es dato en camino en el grafo.',
    fuente: 'AGROSAVIA / ICA (grafo: citrus_reticulata)',
  },
  {
    id: 'lima',
    nombre: 'Limón Tahití (lima ácida)',
    cientifico: 'Citrus × latifolia',
    foto: 'limon',
    enGrafo: true,
    nota: 'El limón de exportación: sin pepa, jugoso, produce casi todo el año. Es el cítrico que MÁS altura aguanta (hasta ~2100 msnm). El grafo lo tiene con confianza alta.',
    fuente: 'AGROSAVIA (grafo: citrus_latifolia, confianza alta)',
  },
  {
    id: 'limon-criollo',
    nombre: 'Limón criollo / pajarito',
    cientifico: 'Citrus × aurantiifolia',
    foto: 'limon',
    enGrafo: false,
    nota: 'El limoncito de la casa, muy ácido y espinoso, de tierra caliente. Es real y muy sembrado, pero AÚN no tiene ficha propia en el grafo Chagra: se maneja igual que el grupo cítrico.',
    fuente: 'Uso campesino (nodo propio: dato en camino)',
  },
];

/**
 * Por qué el cítrico se INJERTA y no se siembra de pepa. GROUNDED en práctica
 * ICA/AGROSAVIA (viveros registrados). Los NOMBRES de patrones (Cleopatra,
 * Sunki, tolerantes a la tristeza) son cultivares reales de referencia ICA, NO
 * inventados; se presentan como guía, no como dato del grafo.
 */
export const INJERTO_CITRICOS = {
  titulo: 'El cítrico no se siembra de pepa: se injerta',
  resumen:
    'Sobre un patrón (la raíz) se pega la yema de la variedad que se quiere (la copa). El patrón manda en la sanidad de la raíz, el porte y el aguante a enfermedades; la copa da la fruta. Por eso el arbolito se compra a un vivero registrado ante el ICA, no de cualquier palo.',
  puntos: [
    'El patrón le da resistencia a enfermedades del suelo y a la tristeza de los cítricos (un virus grave que reparten los áfidos).',
    'Patrones de referencia (ICA): mandarino Cleopatra, Sunki y otros tolerantes a la tristeza. El patrón se escoge según el suelo y la zona.',
    'La yema injertada define la variedad (naranja, mandarina, limón) y hace que el árbol produzca pronto e igual a la madre.',
    'Al sembrar, el punto del injerto (el "codo") queda POR ENCIMA de la tierra: enterrarlo abre la puerta a la gomosis del tronco.',
  ],
  fuente: 'ICA / AGROSAVIA (material de vivero certificado)',
};

/** Buena vecina groundeada del grafo (compatible_with de citrus_sinensis). */
export const ASOCIACION_CITRICOS = {
  especie: 'Arazá',
  cientifico: 'Eugenia stipitata',
  nota: 'El grafo Chagra reporta a la naranja compatible con el arazá: dos frutales de clima cálido que se acompañan bien en el solar.',
  fuente: 'grafo Chagra (citrus_sinensis compatible_with eugenia_stipitata)',
};

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 2 · EL PISO TÉRMICO (el corazón del mundo)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * PISO TÉRMICO — refuerzo del grounding térmico correcto. GROUNDED: el grafo da
 * a citrus_latifolia "del nivel del mar hasta ~2100 msnm" (AGROSAVIA, confianza
 * alta); naranja y mandarina son de clima cálido a medio. El mensaje clave y
 * HONESTO: el cítrico es de tierra CALIENTE-templada; en tierra fría alta
 * (p. ej. 2500 msnm) NO prospera — cuaja mal, la fruta sale ácida y con poco
 * jugo, y sufre más enfermedad. Este es justo el error que hay que evitar: NO
 * recomendar cítrico de clima cálido para una finca de clima frío.
 */
export const PISO_TERMICO = {
  titulo: 'El cítrico es de tierra caliente y templada',
  lead:
    'Antes de sembrar un cítrico, mire su ALTURA. El cítrico prospera del nivel del mar hasta la tierra templada; en tierra fría alta se enferma, no cuaja y da fruta ácida y sin jugo. Sembrar naranja o mandarina a 2500 msnm es botar la plata.',
  // Bandas de altitud, de caliente (abajo) a frío (arriba). El campo `apto`
  // manda el color/semáforo en la UI.
  bandas: [
    {
      id: 'calido',
      rango: '0 – 1200 msnm',
      clima: 'Tierra caliente',
      apto: 'optimo',
      nota: 'El piso ideal de naranja, mandarina, limón y lima. Buena cuaja, fruta dulce y jugosa. Ojo con la mosca de la fruta y el psílido del HLB, que también quieren el calor.',
    },
    {
      id: 'templado',
      rango: '1200 – 1800 msnm',
      clima: 'Tierra templada (clima medio)',
      apto: 'bien',
      nota: 'Se dan muy bien, sobre todo mandarina y naranja de mesa. La fruta madura más despacio y a veces queda más ácida; buen sabor con buen sol.',
    },
    {
      id: 'limite',
      rango: '1800 – 2100 msnm',
      clima: 'El límite',
      apto: 'limite',
      nota: 'Solo el limón Tahití (lima ácida) aguanta hasta aquí, según el grafo (AGROSAVIA). Naranja y mandarina ya rinden poco. Por encima, mejor no.',
    },
    {
      id: 'frio',
      rango: 'Más de 2100 msnm',
      clima: 'Tierra fría alta',
      apto: 'no',
      nota: 'NO es para cítricos. Frío, poca cuaja, fruta ácida y sin jugo, y más enfermedad. Aquí van otros frutales: mora, tomate de árbol, uchuva, curuba, breva.',
    },
  ],
  aguaLuz:
    'Pleno sol y, sobre todo, suelo bien DRENADO: el cítrico odia el encharcamiento (le pudre la raíz y le da gomosis). Riego parejo en la floración y el llenado del fruto; en veranos largos, riego de apoyo para que no bote la cosecha.',
  fuente: 'grafo Chagra (citrus_latifolia 0–2100 msnm, AGROSAVIA, confianza alta) + práctica ICA',
  // Redirección honesta para fincas de clima frío (no dejar al campesino sin salida).
  redireccionFrio: {
    texto: '¿Su finca es de clima frío alto? El cítrico no es lo suyo. Pregúntele al agente por frutales de frío (mora, tomate de árbol, uchuva).',
  },
};

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 3 · SIEMBRA Y PODA
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Pasos de siembra, en orden. GROUNDED cualitativo (ICA/AGROSAVIA). La DISTANCIA
 * exacta depende del patrón y del vigor de la variedad → se da un rango
 * orientador y el número fino es SLOT pendiente (no se inventa).
 */
export const PASOS_SIEMBRA = [
  {
    id: 'arbol',
    titulo: 'Árbol certificado, no de pepa',
    detalle: 'Compre el arbolito injertado a un vivero registrado ante el ICA, de la variedad y el patrón que le sirven a su zona. Ahí empieza la sanidad: material limpio no trae la tristeza ni el HLB de fábrica.',
  },
  {
    id: 'hoyo',
    titulo: 'Hoyo grande y con drenaje',
    detalle: 'Hoyo amplio, con materia orgánica bien descompuesta. En suelo pesado o zona húmeda, siembre en ALTO (camellón o montículo) para que el agua escurra: el cítrico se muere con los pies en el agua.',
  },
  {
    id: 'injerto',
    titulo: 'El injerto por encima de la tierra',
    detalle: 'Al plantar, deje el punto del injerto (el "codo") POR ENCIMA del nivel del suelo. Enterrarlo es invitar a la gomosis del tronco. Apriete la tierra y riegue.',
  },
  {
    id: 'distancia',
    titulo: 'La distancia según el porte',
    detalle: 'Rango orientador: de 5 a 7 m entre árboles. En cítrico vigoroso (naranja de porte alto) se abre más; en porte bajo se cierra. La distancia fina depende del patrón y del sistema.',
  },
];

/** Distancia exacta = dato en camino (depende del patrón y del sistema). */
export const DISTANCIA_SIEMBRA = {
  estado: ESTADO_GROUNDED_PENDIENTE,
  valor: null,
  fuentePrevista: 'AGROSAVIA — marcos de plantación por patrón/variedad y sistema, vía catálogo/AGE',
};

/** Poda del cítrico (formación + sanitaria + destetar chupones del patrón). */
export const PODA_CITRICOS = {
  titulo: 'Poda: formar, airear y destetar',
  puntos: [
    'Formación los primeros años: un tronco limpio y 3–4 ramas madre bien repartidas, para un árbol fuerte y fácil de cosechar.',
    'Poda sanitaria: saque ramas secas, enfermas o que se cruzan. Deje entrar luz y aire al centro del árbol — así se defiende mejor de hongos y cochinillas.',
    'Destete los chupones: los brotes que salen POR DEBAJO del injerto son del patrón (no dan la fruta buena) y le roban fuerza. Quítelos apenas asomen.',
    'Herramienta limpia y desinfectada entre árbol y árbol: la tijera sucia reparte enfermedades (incluida la tristeza y el HLB).',
  ],
  fuente: 'ICA / AGROSAVIA (manejo de cítricos)',
};

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 4 · PLAGAS Y ENFERMEDADES (grounded del grafo — AFFECTS/CONTROLS)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Plagas y enfermedades del cítrico. GROUNDED: cada `plagaGrafo` es un nodo del
 * grafo que AFFECTS a los cítricos; los `biocontrol` son sus `controladores`
 * (CONTROLS) en el grafo, en lenguaje campesino. NO se inventan enemigos
 * naturales ni dosis químicas.
 */
export const PLAGAS_CITRICOS = [
  {
    id: 'minador',
    nombre: 'Minador de la hoja',
    tipo: 'plaga',
    plagaGrafo: 'Minador de la hoja de cítricos',
    senal: 'Caminitos plateados y retorcidos DENTRO de las hojas nuevas; la hoja se enrolla y se deforma. Pega duro en los arbolitos y en los brotes tiernos. Las heridas que deja abren la puerta a la cancrosis.',
    biocontrol: ['Avispitas parasitoides (parasitoide del grafo)', 'Caldo ceniza-jabón sobre el brote tierno', 'Aceite de nim en los flujos de brotación'],
  },
  {
    id: 'mosca-fruta',
    nombre: 'Mosca de la fruta',
    tipo: 'plaga',
    plagaGrafo: 'Mosca de la fruta (Anastrepha spp.)',
    senal: 'La mosca pica el fruto y pone el huevo; adentro salen gusanos y la fruta se pudre y se cae. Incluye la mosca del Mediterráneo y la sudamericana. Es la plaga que más castiga la fruta en el mercado.',
    biocontrol: ['Avispitas parasitoides', 'Hongo Beauveria', 'Recoja y entierre la fruta picada (corta el ciclo)', 'Trampas caseras con cebo de melaza'],
  },
  {
    id: 'psilido',
    nombre: 'Psílido asiático (el que reparte el HLB)',
    tipo: 'plaga',
    foto: 'psilido',
    plagaGrafo: 'Psílido asiático de los cítricos',
    senal: 'Un insectico chupador que se para "de pico abajo" en los brotes tiernos, casi a 45°. Suelta una melaza que ensucia la hoja. Es peligroso NO por lo que chupa, sino porque reparte el HLB (dragón amarillo) de árbol en árbol.',
    biocontrol: ['Mariquita roja (depredador del grafo)', 'Hongos entomopatógenos (Beauveria, Isaria/Cordyceps, Paecilomyces)', 'Avispitas parasitoides', 'Vigilar los brotes tiernos, que es donde se cría'],
  },
  {
    id: 'afido-tristeza',
    nombre: 'Áfido pardo (vector de la tristeza)',
    tipo: 'plaga',
    plagaGrafo: 'Áfido pardo de los cítricos (vector de la tristeza)',
    senal: 'Pulgones pardos en cogollos y envés de la hoja nueva; encogen y enrollan el brote. Su peligro es que reparten la TRISTEZA de los cítricos, un virus que decae y mata al árbol si el patrón no es tolerante.',
    biocontrol: ['Mariquita roja', 'Avispitas parasitoides', 'Hongo Beauveria', 'Patrón tolerante a la tristeza (la defensa de fondo)'],
  },
  {
    id: 'cochinillas',
    nombre: 'Cochinillas y escamas',
    tipo: 'plaga',
    plagaGrafo: 'Cochinilla harinosa de los cítricos',
    senal: 'Motas blancas algodonosas (cochinilla harinosa) o costritas pegadas al tallo, la hoja y el fruto (escamas). Luego sale la fumagina (un tizne negro pegajoso) que ensucia la hoja y le quita el sol.',
    biocontrol: ['Mariquitas destructoras de cochinillas', 'Avispitas parasitoides', 'Hongo Beauveria', 'Aceite mineral/vegetal + jabón sobre la colonia'],
  },
  {
    id: 'acaros',
    nombre: 'Ácaros (rojo, tostador, blanco)',
    tipo: 'plaga',
    plagaGrafo: 'Ácaro tostador de los cítricos',
    senal: 'Bichitos diminutos que raspan el fruto y la hoja: el ácaro tostador deja la cáscara bronceada/"tostada"; el rojo puntea la hoja de amarillo. La fruta se ve fea aunque por dentro sirva.',
    biocontrol: ['Ácaros depredadores (neoseiulus)', 'Otros depredadores de control biológico', 'Hongo Beauveria', 'Azufre solo si de verdad hace falta'],
  },
  {
    id: 'picudo',
    nombre: 'Picudo / barrenador',
    tipo: 'plaga',
    plagaGrafo: 'Picudo de los cítricos / barrenador',
    senal: 'Larvas que barrenan tronco y raíces; el árbol decae, se abre la corteza y por ahí entra la gomosis. Los adultos comen los bordes de la hoja dejándolos como recortados con tijera.',
    biocontrol: ['Nematodos entomopatógenos (Steinernema, Heterorhabditis) al suelo', 'Recoger y eliminar adultos', 'Mantener el árbol vigoroso y sin heridas'],
  },
  {
    id: 'antracnosis',
    nombre: 'Antracnosis',
    tipo: 'enfermedad',
    plagaGrafo: 'Antracnosis de frutales',
    senal: 'Manchas hundidas y oscuras en fruto, hoja y ramitas; con humedad se pudre el fruto y se secan las puntas de las ramas. Empuja fuerte en tiempo lluvioso y con árbol mal aireado.',
    biocontrol: ['Trichoderma', 'Bacterias antagonistas (biofungicida)', 'Poda para airear y sacar lo enfermo', 'Caldo bordelés como protector'],
  },
  {
    id: 'mancha-negra',
    nombre: 'Mancha negra y alternaria del fruto',
    tipo: 'enfermedad',
    plagaGrafo: 'Mancha negra de los cítricos',
    senal: 'Manchas negras redondas y hundidas en la cáscara (mancha negra) o pardas en fruto y hoja (alternaria). Dañan la presentación de la fruta y son de control cuarentenario en exportación.',
    biocontrol: ['Microorganismos de control biológico (biofungicida del grafo)', 'Recoger hojarasca y fruta caída', 'Poda para airear', 'Caldo bordelés protector'],
  },
];

/**
 * HLB / dragón amarillo — la enfermedad más grave del cítrico. Aviso de
 * cuarentena de reporte obligatorio al ICA. GROUNDED: nodo del grafo
 * (Huanglongbing) con su vector (Psílido asiático) y el único "controlador"
 * reportado (mariquita roja, sobre el vector). El manejo REAL es prevenir.
 */
export const HLB_CUARENTENA = {
  titulo: 'HLB / dragón amarillo — enfermedad de REPORTE al ICA',
  plagaGrafo: 'Huanglongbing (HLB) / dragón amarillo de los cítricos',
  foto: 'hlb',
  detalle:
    'El Huanglongbing (HLB o dragón amarillo) es la enfermedad más grave del cítrico: NO tiene cura y mata el árbol. La reparte el psílido asiático (un insecto chupador). No se cura con veneno: se PREVIENE.',
  senales: [
    'Ramas y hojas amarillas de forma DESPAREJA (moteado asimétrico), distinto a la amarilla pareja de la falta de abono.',
    'Fruta pequeña, deforme y torcida, verde por un lado y con la semilla abortada; sabe amarga.',
    'El árbol decae por partes y termina muriéndose.',
  ],
  manejo: [
    'Compre SIEMPRE árboles certificados ICA (sin HLB de fábrica).',
    'Controle el psílido (su vector): mariquita roja y hongos entomopatógenos, vigilando los brotes tiernos.',
    'REPORTE al ICA si ve los síntomas: es de reporte obligatorio. Un árbol enfermo confirmado se elimina para no contagiar el resto.',
  ],
  fuente: 'ICA (plaga cuarentenaria) · grafo Chagra (HLB + psílido vector)',
};

/**
 * Gomosis / Phytophthora — HONESTIDAD DE FALTANTE. Es una enfermedad real y
 * grave del cítrico (pudrición del tronco/raíz por Phytophthora), pero HOY NO
 * está en el grafo Chagra para cítricos. Se declara "dato en camino": NO se
 * inventa un manejo con dosis. Sí se da el consejo PREVENTIVO groundeado en
 * práctica (drenaje + injerto por encima de la tierra) que ya aparece arriba.
 */
export const GOMOSIS_PENDIENTE = {
  titulo: 'La gomosis del tronco (Phytophthora)',
  estado: ESTADO_GROUNDED_PENDIENTE,
  texto:
    'La gomosis —una pudrición del tronco y la raíz que suelta goma— es real y grave en cítricos, pero todavía NO está en el grafo Chagra: por eso no le damos aquí un manejo con dosis (sería inventarlo). Lo que SÍ sirve y está probado es prevenir: drenaje, injerto por encima de la tierra y patrón resistente. Para su caso, el agente o el técnico del ICA.',
};

/** Biopreparados de apoyo (grounded: lista compartida de las 3 especies cítricas). */
export const BIOPREPARADOS_CITRICOS = [
  'Aceite/emulsión de nim (neem)',
  'Aceite mineral/vegetal + jabón (anti-cochinilla y escamas)',
  'Caldo ceniza-jabón concentrado (anti-minador/cochinilla)',
  'Lechada de cal (encalado de troncos)',
  'Trampa de melaza (cebo atrayente)',
  'Sal de Epsom foliar (magnesio)',
];

/** Guard anti-receta del mundo (mismo criterio que café/frutales). */
export const NOTA_SIN_QUIMICOS =
  'Aquí no encontrará dosis de veneno: el manejo es agroecológico e integrado (poda, control biológico, trampas y biopreparados). Para el caso puntual de su finca, hable con su técnico del ICA o con el agente.';

/* ────────────────────────────────────────────────────────────────────────
 * ESTACIÓN 5 · ABONO, COSECHA Y POSCOSECHA
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Fertilización. GROUNDED-PENDIENTE a propósito: las dosis dependen del análisis
 * de suelo, la edad y la variedad. Lo cualitativo (el cítrico es ávido de N y
 * sensible a faltas de magnesio/micronutrientes) sí se dice; la dosis NO.
 * El magnesio foliar (sal de Epsom) es biopreparado del grafo.
 */
export const FERTILIZACION_CITRICOS = {
  titulo: 'Abonar con cuenta, no de oído',
  puntos: [
    'El cítrico es comelón: pide nitrógeno para la brotación y potasio para llenar y endulzar el fruto. Con buena materia orgánica (compost, gallinaza madura) el suelo responde mejor.',
    'Las hojas amarillas ENTRE las venas (que quedan verdes) suelen ser falta de magnesio o de micronutrientes; la sal de Epsom foliar ayuda con el magnesio.',
    'La cantidad exacta de abono y cal depende del análisis de su lote y de la edad del árbol. No hay una dosis única — no se la invente.',
  ],
  slot: {
    estado: ESTADO_GROUNDED_PENDIENTE,
    texto: 'Las dosis de fertilización dependen del análisis de suelo de su lote, la edad y la variedad del árbol',
  },
  fuente: 'AGROSAVIA (nutrición de cítricos) + análisis de suelo',
};

/**
 * Cosecha y poscosecha. GROUNDED del grafo (perennialCycles):
 *   - limón Tahití (citrus_latifolia): primera cosecha 3–4 años, produce todo el
 *     año con pico nov–mar (confianza alta).
 *   - naranja (citrus_sinensis): 3–5 años; calendario muy variable (confianza baja).
 *   - mandarina (citrus_reticulata): sin ciclo en el grafo → cosecha "dato en camino".
 * Dato clave y honesto: el cítrico NO es climatérico (no madura después de
 * cogido) → se coge en el punto.
 */
export const COSECHA_CITRICOS = {
  primeraCosecha: [
    { id: 'lima', nombre: 'Limón Tahití', valor: '3–4 años', grounded: true, nota: 'Produce casi todo el año, con pico nov–mar (grafo, confianza alta).' },
    { id: 'naranja', nombre: 'Naranja', valor: '3–5 años', grounded: true, nota: 'El calendario varía mucho por región (grafo, confianza baja).' },
    { id: 'mandarina', nombre: 'Mandarina', valor: 'dato en camino', grounded: false, nota: 'El ciclo de la mandarina aún no está en el grafo Chagra.' },
  ],
  noClimaterico:
    'El cítrico NO madura después de cogido: hay que cogerlo EN EL PUNTO. Cogido verde, se queda ácido y sin jugo para siempre. La naranja y la mandarina se prueban; el limón Tahití se coge verde-lustroso, el criollo pintón, según el mercado.',
  poscosecha: [
    'Corte con tijera dejando un cabito corto: arrancar el fruto abre una herida por donde entran los hongos.',
    'Manéjelo con cuidado — el golpe se pudre. Guárdelo fresco, ventilado y a la sombra.',
    'El limón dura más si se coge sin el sol fuerte del mediodía. La fruta con hongo se aparta para que no contagie el resto.',
  ],
  fuente: 'AGROSAVIA / ICA (grafo: perennialCycles citrus_latifolia y citrus_sinensis)',
};

/* ────────────────────────────────────────────────────────────────────────
 * FOTOS — créditos de licencia abierta (espejo de /public/citricos/creditos.json)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Créditos de las fotos del mundo cítricos — FUENTE ÚNICA en el componente,
 * espejo de /public/citricos/creditos.json. Las fotos de fruta (naranja, limón,
 * mandarina, injerto) se REUSAN de /public/frutales (no se duplican bytes): el
 * campo `src` apunta a la ruta real. Las fotos nuevas (naranjal, hlb, psilido)
 * viven en /public/citricos. Requisito de las licencias CC-BY/CC-BY-SA:
 * atribución visible. Si una foto no carga, la tarjeta cae con gracia a un ícono.
 * @type {{slug:string,src:string,autor:string,licencia:string,licenciaUrl:string,fuenteUrl:string}[]}
 */
export const CREDITOS_FOTOS_CITRICOS = [
  { slug: 'naranjal', src: '/citricos/naranjal.jpg', autor: 'Tyk', licencia: 'CC BY-SA 3.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/3.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Orange_groves_Guaro.jpg' },
  { slug: 'hlb', src: '/citricos/hlb.jpg', autor: 'USDA APHIS', licencia: 'Dominio público', licenciaUrl: 'https://commons.wikimedia.org/wiki/Help:Public_domain', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Citrus_Greening_(20120201-APHIS-DB-0059).jpg' },
  { slug: 'psilido', src: '/citricos/psilido.jpg', autor: 'Jeffrey W. Lotz, Florida Dept. of Agriculture', licencia: 'Dominio público', licenciaUrl: 'https://commons.wikimedia.org/wiki/Help:Public_domain', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Asian_citrus_psyllid_D._citri_adult.jpg' },
  { slug: 'naranja', src: '/frutales/citricos.jpg', autor: 'Zeynel Cebeci', licencia: 'CC BY-SA 3.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/3.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Local_Orange_Variety_of_Kozan_-_Kozan_Yerli_Portakal_04.jpg' },
  { slug: 'limon', src: '/frutales/limon.jpg', autor: 'Jeevan Jose, Kerala, India', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Citrus_aurantiifolia_at_Kadavoor.jpg' },
  { slug: 'mandarina', src: '/frutales/mandarina.jpg', autor: '4028mdk09', licencia: 'CC BY-SA 3.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/3.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Citrus_reticulata_April_2013_Nordbaden.JPG' },
  { slug: 'injerto', src: '/frutales/injerto.jpg', autor: 'Sorruno', licencia: 'CC BY-SA 4.0', licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Injerto_de_yema.JPG' },
];

/** Ruta de una foto por slug (resuelve reuso /frutales vs nuevas /citricos). */
export const fotoSrc = (slug) => CREDITOS_FOTOS_CITRICOS.find((c) => c.slug === slug)?.src || '';
