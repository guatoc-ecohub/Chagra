/*
 * pisoFrio — las matas de tierra fría (1800-3400 msnm).
 *
 * El reparto por PISO TÉRMICO no es una ocurrencia de diseño: es la
 * organización del propio corpus maestro (`teacher-piso-frio.jsonl` /
 * `teacher-piso-calido.jsonl`) y es la primera pregunta que hace cualquier
 * campesino andino ante una mata nueva — "¿eso se da aquí?". La lámina
 * responde antes de que la pregunten.
 *
 * PROCEDENCIA DE CADA DATO — la regla de esta colección:
 *   `fuente: 'corpus'`  → sale del corpus/fichas del repo (dato verificado).
 *   `fuente: 'botanica'`→ botánica establecida, NO documentada en el corpus.
 *                         Se usa sólo para morfología (forma de hoja,
 *                         nervadura, estructura floral), porque el corpus casi
 *                         no la documenta y dibujar mal induciría al error.
 *   `sinDato: [...]`    → lo que NADIE pudo confirmar. Se declara, no se
 *                         inventa: una lámina que rellena huecos con adorno
 *                         deja de ser un documento.
 *
 * Esa distinción es la razón de ser del archivo. Un ilustrador puede inventar
 * una hoja bonita; un cuaderno de campo no puede.
 */

/* PAPA — la mata que define la tierra fría andina. */
export const papa = {
  id: 'papa',
  nombre: 'Papa',
  cientifico: 'Solanum tuberosum',
  autoridad: 'L.',
  familia: 'Solanaceae',
  regionales: ['pastusa', 'sabanera', 'carrera negra', 'argentina', 'parda'],
  notaNombre: 'Las andinas son del grupo Andigenum — no del Tuberosum europeo.',
  piso: 'frio',
  altitud: [2000, 3400],
  altitudOptima: [2500, 3000],
  climaNota: '10-17 °C. La helada la mata a −2 °C: por eso se siembra en ladera y no en la hondonada, donde el frío se empoza.',
  alturaM: 0.8,
  fuente: 'corpus',

  porte: { tipo: 'herbacea', alto: 200, nodos: 6, filo: 'alterna', grosor: 3.4 },

  hoja: {
    compuesta: 'imparipinnada',
    pares: 3,
    intercalares: true, // los foliolillos entre los pares grandes: firma de la papa
    formaFoliolo: 'ovada',
    borde: 'entero',
    nervadura: 'pinnada',
    filotaxia: 'alterna',
    esbeltez: 0.44,
    len: 86,
    fuente: 'botanica',
    nota: 'Hoja compuesta con foliolos DESIGUALES: pares grandes con foliolillos intercalados. Es lo que la separa a simple vista de cualquier otra mata del lote.',
  },

  raiz: {
    tipo: 'estolonTuberculo',
    op: { cuantos: 5, radio: 44, tuber: 11, alargado: 1.4 },
    fuente: 'corpus+botanica',
    nota: 'El tubérculo NO es raíz: es TALLO engrosado colgado de un estolón. Por eso tiene ojos, por eso rebrota y por eso se aporca. Las raíces de verdad son las fasciculadas del lado.',
  },

  flor: {
    tipo: 'solanacea',
    op: { r: 15 },
    color: ['#e8e2f0', '#b9a6cf'],
    fuente: 'botanica',
    nota: 'Corola rotácea + cono de anteras amarillo. El corpus no describe la flor: la morfología es de botánica general.',
    sinDato: 'El corpus del repo no documenta la flor de la papa.',
  },

  fruto: {
    tipo: 'tuberculo',
    op: { rx: 48, ry: 33, ojos: 5 },
    organo: 'tubérculo',
    color: { piel: '#d9b58e', pulpa: '#f0e2c0' },
    fuente: 'corpus',
    nota: 'Pastusa/Sabanera: piel rosa-crema, carne crema. Carrera Negra: piel violeta casi negra con ojos pigmentados. 40-250 g.',
  },

  ciclo: [
    { fase: 'siembra', cuando: 'día 0', nota: 'Tubérculo-semilla a 30 × 90 cm.' },
    { fase: 'tuberización', cuando: 'día 10-20', nota: 'Los días que deciden la cosecha.' },
    { fase: 'aporque', cuando: 'día 45-90', nota: 'Se arrima tierra: el estolón necesita oscuridad.' },
    { fase: 'cosecha', cuando: 'día 150-180', nota: 'Pastusa Suprema: 5-6 meses. Sabanera/Carrera Negra: 5-8.' },
    { fase: 'dormancia', cuando: '2-3 meses', nota: 'La semilla descansa antes del siguiente ciclo.' },
  ],
  cicloFuente: 'corpus',

  enfermedades: [
    {
      nombre: 'Gota (tizón tardío)',
      folk: ['gota', 'tizón'],
      agente: 'Phytophthora infestans',
      sintoma: 'gota',
      cara: 'enves',
      gravedad: 'alta',
      senal: 'Manchas húmedas oscuras de BORDE IRREGULAR; empiezan por el borde y la punta de la hoja. Con humedad, VELLOSIDAD BLANCA en el envés — mírela en la mañana.',
      cuando: 'Clima húmedo y fresco (12-18 °C).',
      alerta: 'Puede tumbar el cultivo en días. La criolla se pudre más: aguanta menos.',
      fuente: 'corpus',
    },
    {
      nombre: 'Tizón temprano',
      folk: ['mancha de diana'],
      agente: 'Alternaria solani',
      sintoma: 'alternaria',
      cara: 'haz',
      gravedad: 'media',
      senal: 'Manchitas cafés en la HOJA VIEJA, con halo amarillo y ANILLOS CONCÉNTRICOS como diana de tiro.',
      cuando: 'Clima seco y caluroso. Menos agresivo que la gota.',
      fuente: 'corpus',
    },
    {
      nombre: 'Gusano blanco / polilla guatemalteca',
      folk: ['gusano', 'polilla'],
      agente: 'Premnotrypes vorax · Tecia solanivora',
      sintoma: 'galeriaInterna',
      cara: 'organo',
      gravedad: 'alta',
      senal: 'Huecos y galerías comidas DENTRO del tubérculo. Por fuera casi no se ve: hay que partir.',
      fuente: 'corpus',
    },
  ],
};

/* PAPA CRIOLLA — la chaucha. Otra mata, no una variedad más. */
export const papaCriolla = {
  ...papa,
  id: 'papa-criolla',
  nombre: 'Papa criolla',
  cientifico: 'Solanum phureja',
  autoridad: 'Juz. & Bukasov',
  regionales: ['chaucha', 'yema de huevo', 'criolla'],
  notaNombre: 'El grafo del repo confirma "chaucha" como sinónimo.',
  altitud: [1500, 3500],
  altitudOptima: [2500, 3200],
  alturaM: 0.7,
  fruto: {
    tipo: 'tuberculo',
    op: { rx: 34, ry: 30, ojos: 4 },
    organo: 'tubérculo',
    color: { piel: '#e0b653', pulpa: '#e8c766' },
    fuente: 'corpus',
    nota: 'Redonda, chica, amarilla por dentro y por fuera. SIN DORMANCIA: rebrota apenas sale, así que hay que renovar semilla cada ciclo.',
  },
  ciclo: [
    { fase: 'siembra', cuando: 'día 0', nota: 'Tubérculo-semilla; hay que renovarla cada ciclo.' },
    { fase: 'crecimiento', cuando: 'día 20-60', nota: '' },
    { fase: 'floración', cuando: 'día 60-80', nota: '' },
    { fase: 'cosecha', cuando: 'día 90-120', nota: 'Ciclo CORTO: la mitad que la comercial.' },
  ],
  enfermedades: [
    {
      ...papa.enfermedades[0],
      alerta: 'Menos resistente que la comercial: "la criolla se pudre más" — el corpus es explícito.',
    },
    papa.enfermedades[2],
  ],
  sinDato: ['El corpus no documenta hoja ni flor de S. phureja por separado.'],
};

/* ULLUCO — el tubérculo de colores del altiplano muisca. */
export const ulluco = {
  id: 'ulluco',
  nombre: 'Ulluco',
  cientifico: 'Ullucus tuberosus',
  autoridad: 'Caldas',
  familia: 'Basellaceae',
  regionales: ['melloco', 'ruba', 'chugua', 'chigua', 'olluco'],
  piso: 'frio',
  altitud: [1800, 3400],
  altitudOptima: [2200, 3000],
  alturaM: 0.5,
  fuente: 'corpus',

  porte: { tipo: 'herbacea', alto: 160, nodos: 7, filo: 'alterna', grosor: 2.8 },
  hoja: {
    forma: 'acorazonada',
    borde: 'entero',
    nervadura: 'palmada',
    filotaxia: 'alterna',
    esbeltez: 0.86,
    len: 52,
    carnosa: true,
    fuente: 'botanica',
    nota: 'Hoja CARNOSA y brillante, acorazonada — se nota gruesa al tacto. Las hojas también se comen cocidas (eso sí está en el corpus).',
  },
  raiz: {
    tipo: 'estolonTuberculo',
    op: { cuantos: 5, radio: 34, tuber: 8, alargado: 1.75 },
    fuente: 'corpus+botanica',
    nota: 'Tubérculo sobre estolón, igual que la papa: es TALLO, no raíz.',
  },
  flor: {
    tipo: 'solanacea',
    op: { r: 8, reflexo: true },
    color: ['#d8c250', '#c2a83e'],
    fuente: 'botanica',
    sinDato: 'El corpus no documenta la flor del ulluco.',
  },
  fruto: {
    tipo: 'tuberculo',
    op: { rx: 30, ry: 22, ojos: 3 },
    organo: 'tubérculo',
    color: { piel: '#e2a24b', pulpa: '#f3e6bd' },
    multicolor: true,
    fuente: 'corpus',
    nota: 'Variedades de colores vibrantes: amarillo, rosado, moteado. Piel lisa y cerosa — no se pela, se lava.',
  },
  ciclo: [
    { fase: 'siembra', cuando: 'mes 0', nota: 'Tubérculo-semilla.' },
    { fase: 'crecimiento', cuando: 'mes 1-4', nota: '' },
    { fase: 'cosecha', cuando: 'mes 6-8', nota: '' },
  ],
  cicloFuente: 'corpus',
  enfermedades: [
    {
      nombre: 'Gorgojo del ulluco',
      folk: ['gorgojo'],
      agente: 'no identificado en el corpus',
      sintoma: 'galeriaInterna',
      cara: 'organo',
      gravedad: 'media',
      senal: 'Galerías comidas dentro del tubérculo.',
      fuente: 'corpus-parcial',
      sinDato: 'El corpus lo NOMBRA pero no describe la lesión. El dibujo del daño es genérico de gorgojo, no específico de esta especie.',
    },
  ],
  sinDato: ['"Mildiu" aparece nombrado en la ficha sin descripción visual: no se dibuja lo que no se sabe.'],
};

/* HABA — la leguminosa que aguanta la helada. */
export const haba = {
  id: 'haba',
  nombre: 'Haba',
  cientifico: 'Vicia faba',
  autoridad: 'L.',
  familia: 'Fabaceae',
  regionales: [],
  piso: 'frio',
  altitud: [1800, 3400],
  altitudOptima: [2200, 3000],
  alturaM: 1.1,
  fuente: 'corpus',

  porte: { tipo: 'herbacea', alto: 220, nodos: 6, filo: 'alterna', grosor: 4.2 },
  tallloNota: 'Tallo CUADRANGULAR y hueco, erecto — se reconoce girándolo entre los dedos.',
  hoja: {
    compuesta: 'paripinnada',
    pares: 2,
    zarcillo: false, // el haba NO tiene zarcillo: por eso no trepa
    formaFoliolo: 'eliptica',
    borde: 'entero',
    nervadura: 'pinnada',
    filotaxia: 'alterna',
    esbeltez: 0.52,
    len: 76,
    estipulas: true,
    fuente: 'botanica',
    nota: 'Paripinnada de 2-3 pares, foliolos carnosos y SIN ZARCILLO — el haba se para sola. Estípulas grandes con mancha oscura en la base.',
  },
  raiz: {
    tipo: 'pivotante',
    op: { hondo: 96, grosor: 3.4, nodulos: true },
    fuente: 'corpus',
    nota: 'Fija 120-180 kg N/ha con Rhizobium leguminosarum. Los nódulos ROSADOS por dentro = está fijando; grises = no sirve. Rájelos con la uña.',
  },
  flor: {
    tipo: 'papilionacea',
    op: { r: 13, mancha: true },
    color: ['#fbf6e8', '#241a10'],
    fuente: 'botanica',
    nota: 'Flor blanca con MANCHA NEGRA en el ala: se reconoce el habal en flor desde el otro lado del lote.',
  },
  fruto: {
    tipo: 'vaina',
    op: { largo: 96, ancho: 15, granos: 4, curva: 0.05, gordo: true },
    organo: 'vaina',
    color: { piel: '#8aa34e', pulpa: '#e6dcb4' },
    fuente: 'corpus',
    nota: 'Vaina gruesa y ERECTA (no colgante), con forro esponjoso adentro que abraza el grano.',
  },
  ciclo: [
    { fase: 'siembra', cuando: 'mes 0', nota: 'Directa, 5-8 cm de hondo.' },
    { fase: 'floración', cuando: 'mes 2-3', nota: '' },
    { fase: 'cosecha', cuando: 'mes 5-7', nota: 'Grano seco.' },
  ],
  cicloFuente: 'corpus',
  climaNota: 'Aguanta helada moderada hasta −2 °C: más que la papa y más que el ulluco. Por eso va en la rotación haba → papa → cebada.',
  enfermedades: [
    {
      nombre: 'Pulgón negro',
      folk: ['pulgón'],
      agente: 'Aphis fabae',
      sintoma: 'cochinilla',
      cara: 'organo',
      gravedad: 'media',
      senal: 'Colonias negras apiñadas en el cogollo y el envés de la hoja nueva.',
      manejo: 'Purín de ortiga + caldo sulfocálcico.',
      fuente: 'corpus-parcial',
      sinDato: 'El corpus lo nombra como objetivo de manejo pero no describe la lesión: el dibujo es de colonia de chupador, no específico.',
    },
  ],
  sinDato: ['Ninguna enfermedad fúngica del haba trae descripción visual en el corpus.'],
};

/* ARVEJA — la que trepa. */
export const arveja = {
  id: 'arveja',
  nombre: 'Arveja',
  cientifico: 'Pisum sativum',
  autoridad: 'L.',
  familia: 'Fabaceae',
  regionales: [],
  piso: 'frio',
  altitud: [1800, 3200],
  altitudOptima: [2200, 2800],
  alturaM: 1.4,
  fuente: 'corpus',

  porte: { tipo: 'trepadora', alto: 240, vueltas: 3.4, nodos: 7, filo: 'alterna', tutorAncho: 26 },
  porteNota: 'Trepa o semitrepa: SIEMPRE pide tutor — varas, malla, ramas de aliso o la propia cerca de maíz.',
  hoja: {
    compuesta: 'paripinnada',
    pares: 2,
    zarcillo: true, // LA diferencia con el haba
    formaFoliolo: 'obovada',
    borde: 'entero',
    nervadura: 'pinnada',
    filotaxia: 'alterna',
    esbeltez: 0.62,
    len: 70,
    estipulas: true,
    fuente: 'botanica',
    nota: 'La hoja NO termina en foliolo: termina en ZARCILLO ramificado — ése es su modo de trepar y su diferencia con el haba. Las estípulas son MÁS GRANDES que los propios foliolos.',
  },
  raiz: {
    tipo: 'pivotante',
    op: { hondo: 78, grosor: 2.6, nodulos: true },
    fuente: 'corpus',
    nota: 'Fija 80-120 kg N/ha. Por eso entra en rotación antes de la papa, que es glotona de nitrógeno.',
  },
  flor: {
    tipo: 'papilionacea',
    op: { r: 12, mancha: false },
    color: ['#fbf6e8', '#c9b8d8'],
    fuente: 'botanica',
  },
  fruto: {
    tipo: 'vaina',
    op: { largo: 84, ancho: 12, granos: 6, curva: 0.12 },
    organo: 'vaina',
    color: { piel: '#7ba03f', pulpa: '#c9d68a' },
    fuente: 'corpus',
    nota: 'Doble propósito: vaina verde o grano seco.',
  },
  ciclo: [
    { fase: 'siembra', cuando: 'mes 0', nota: 'A chorrillo, 3-5 cm.' },
    { fase: 'floración', cuando: 'mes 2-3', nota: 'Aquí la helada duele más.' },
    { fase: 'vaina verde', cuando: 'mes 4-6', nota: '' },
    { fase: 'grano seco', cuando: 'mes 6-7', nota: '' },
  ],
  cicloFuente: 'corpus',
  climaNota: 'Sensible a helada fuerte, sobre todo en floración y llenado de vaina — algo más tolerante que el follaje tierno de la papa.',
  enfermedades: [
    {
      nombre: 'Trips',
      folk: ['trips'],
      agente: 'Thysanoptera',
      sintoma: 'trips',
      cara: 'haz',
      gravedad: 'media',
      senal: 'Hoja PLATEADA y rasposa al tacto, SIN bicho visible a simple vista. Con lupa aparece en el envés y en los pliegues de la hoja nueva.',
      fuente: 'corpus',
    },
  ],
  sinDato: ['Ninguna enfermedad fúngica de la arveja trae descripción visual en el corpus.'],
};

/* CURUBA — la trepadora del frío, polinizada por colibrí. */
export const curuba = {
  id: 'curuba',
  nombre: 'Curuba',
  cientifico: 'Passiflora tripartita',
  autoridad: 'var. mollissima (Kunth) Holm-Niels. & P.Jørg.',
  familia: 'Passifloraceae',
  regionales: ['tacso', 'taxo', 'curuba de Castilla'],
  piso: 'frio',
  altitud: [1800, 3200],
  altitudOptima: [2200, 2800],
  alturaM: 4,
  fuente: 'corpus',

  porte: { tipo: 'trepadora', alto: 280, vueltas: 2.6, nodos: 6, filo: 'alterna', tutorAncho: 30 },
  porteNota: 'Trepadora de emparrado. Poda de formación cada 3-4 meses o se enmaraña y no carga. Se asocia con aliso (Alnus acuminata): le sirve de tutor y le fija nitrógeno.',
  hoja: {
    forma: 'palmatilobada',
    lobulos: 3, // *tripartita*: el nombre lo dice
    abertura: 118,
    seno: 0.26,
    anchoLobulo: 0.5,
    borde: 'aserrado',
    nervadura: 'palmada',
    filotaxia: 'alterna',
    esbeltez: 0.8,
    len: 60,
    pubescente: true, // *mollissima* = "muy suave"
    fuente: 'botanica',
    nota: 'TRIPARTITA: tres lóbulos — el epíteto es la descripción. Y MOLLISSIMA: "muy suave", aterciopelada al tacto. El nombre científico es la clave de campo.',
  },
  raiz: { tipo: 'fasciculada', op: { cuantas: 12, largo: 60, grosor: 1.5 }, fuente: 'botanica', sinDato: 'El corpus no documenta la raíz de la curuba.' },
  flor: {
    tipo: 'pasiflora',
    op: { r: 14, tubo: 46 },
    color: ['#e46b9b', '#c9527f'],
    fuente: 'botanica',
    nota: 'Colgante, rosada, con TUBO LARGO: la poliniza el colibrí. La forma cuenta quién la visita — sin colibrí no hay curuba.',
  },
  fruto: {
    tipo: 'baya',
    op: { rx: 24, ry: 42, loculos: 1, semillasPorLoculo: 18, ovoide: true },
    organo: 'baya oblonga',
    color: { piel: '#e2b04c', pulpa: '#f2c33a' },
    fuente: 'corpus',
    nota: 'Ácida, con semillas en arilo jugoso. La base del sorbete. Rica en vitaminas A y C.',
  },
  ciclo: [
    { fase: 'siembra', cuando: 'mes 0', nota: 'Por semilla.' },
    { fase: 'formación', cuando: 'mes 3-8', nota: 'Poda cada 3-4 meses.' },
    { fase: 'cosecha', cuando: 'mes 12-18', nota: 'Ciclo productivo.' },
  ],
  cicloFuente: 'corpus',
  enfermedades: [
    {
      nombre: 'Antracnosis',
      folk: ['antracnosis'],
      agente: 'Colletotrichum spp.',
      sintoma: 'antracnosis',
      cara: 'organo',
      gravedad: 'media',
      senal: 'Mancha hundida en el fruto. OJO: para la curuba el corpus sólo la NOMBRA — el dibujo sigue el patrón de la mora y el tomate de árbol, que sí está descrito.',
      cuando: 'Períodos de alta neblina.',
      fuente: 'corpus-parcial',
      sinDato: 'La lesión específica de la curuba no está descrita en el corpus: esto es analogía declarada, no dato.',
    },
  ],
};

export const PISO_FRIO = [papa, papaCriolla, ulluco, haba, arveja, curuba];
