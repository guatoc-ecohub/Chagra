/*
 * cuadernoData — el contenido de muestra de EL CUADERNO VIVO.
 *
 * Un cuaderno de finca de piso frío andino (un tablón de habas, tres
 * temporadas del mismo tablón, un aliso que crece a su paso). La voz es la
 * del saber campesino de la casa: en usted, sin postureo, sin coach. La IA
 * no aparece dando cátedra por ninguna parte: cuando el cuaderno "habla",
 * habla con las palabras que el propio campesino escribió antes.
 *
 * CONTRATO: esto es DEMO para la vista de arte. El cableo real (leer las
 * anotaciones de la finca desde logs, calcular ecos por fechas) lo hace
 * quien integre; este archivo fija el SHAPE y el TONO:
 *
 *   pagina { id, fecha, temporadasAtras, clima, miradas[], texto,
 *            tipo: 'siembra'|'observacion'|'fracaso'|'cosecha',
 *            eco?, remate? }
 *   eco    { de, cita, nota } — SIEMPRE cita textual de una página vieja.
 *
 * REGLA DURA: nada aquí felicita, puntúa ni compara con nadie. El único
 * maestro es la tierra del que anota.
 */

/* ------------------------------------------------------------------ */
/* OBSERVAR — los cuatro gestos de la mirada. La lupa del campesino    */
/* son sus ojos y sus manos; esto es método, no casualidad.            */
/* ------------------------------------------------------------------ */
export const MIRADAS = [
  {
    id: 'enves',
    titulo: 'El envés de la hoja',
    gesto: 'Voltee la hoja sin arrancarla.',
    texto:
      'Lo que pica casi nunca se para encima: se esconde por debajo. Una hoja bonita por encima puede venir cargada por el envés.',
  },
  {
    id: 'cogollo',
    titulo: 'El cogollo',
    gesto: 'Mire lo más nuevo de la mata.',
    texto:
      'Lo tierno cuenta la verdad primero: si el cogollo sale sano, la mata va bien aunque la hoja vieja se vea maluca. Si sale torcido, ahí empieza el problema.',
  },
  {
    id: 'suelo',
    titulo: 'El suelo alrededor',
    gesto: 'Agáchese y toque la tierra al pie.',
    texto:
      'La costra, la humedad, las hormigas, el olor. La mata come de ahí: media enfermedad de arriba se explica abajo.',
  },
  {
    id: 'vecina',
    titulo: 'La mata vecina',
    gesto: 'Compare la enferma con la sana de al lado.',
    texto:
      'Mismo suelo, misma agua, misma semilla: lo que cambie entre las dos es media respuesta. Comparar es el primer laboratorio.',
  },
];

/* ------------------------------------------------------------------ */
/* REGISTRAR + APRENDER — las páginas del cuaderno.                    */
/* El orden cuenta una historia real de tres años: la helada de junio  */
/* de hace dos temporadas quemó la flor abierta; quedó anotada; y esa  */
/* anotación fue la que movió la siembra de este año a febrero.        */
/* ------------------------------------------------------------------ */
export const PAGINAS = [
  {
    id: 'siembra-2026',
    fecha: '9 de febrero',
    anio: '2026',
    temporadasAtras: 0,
    clima: 'sol',
    tipo: 'siembra',
    miradas: ['suelo'],
    texto:
      'Sembré el tablón de habas de la orilla. Adelanté la siembra un mes: que la flor no coja junio abierta. La tierra venía suelta y con lombriz, buena señal.',
    eco: {
      de: '14 de junio de 2025',
      cita: 'Helada negra anoche. La flor estaba toda abierta y la quemó pareja. Se perdió el tablón.',
      nota: 'Usted lo dejó escrito. Por eso este año la siembra fue en febrero.',
    },
  },
  {
    id: 'observacion-2026',
    fecha: '28 de abril',
    anio: '2026',
    temporadasAtras: 0,
    clima: 'nube',
    tipo: 'observacion',
    miradas: ['enves', 'vecina'],
    texto:
      'Revisé el envés en diez matas: pulgón negro en las dos de la esquina de abajo, las demás limpias. La esquina es la más abrigada del viento. Les puse mano ya, antes de que suba.',
  },
  {
    id: 'fracaso-2025',
    fecha: '14 de junio',
    anio: '2025',
    temporadasAtras: 2,
    clima: 'helada',
    tipo: 'fracaso',
    miradas: [],
    texto:
      'Helada negra anoche. La flor estaba toda abierta y la quemó pareja. Se perdió el tablón. Guardé una hoja para no olvidarme de la fecha.',
    remate:
      'Una pérdida escrita no se pierde dos veces: queda de maestra.',
  },
  {
    id: 'cosecha-2026',
    fecha: '3 de julio',
    anio: '2026',
    temporadasAtras: 0,
    clima: 'lluvia',
    tipo: 'cosecha',
    miradas: ['cogollo'],
    texto:
      'Cinco bultos del tablón de la orilla. La flor pasó antes del hielo, como estaba pensado desde febrero. La helada llegó igual, el 20 de junio, pero ya encontró grano hecho.',
  },
];

/* ------------------------------------------------------------------ */
/* COMPARAR AÑOS — la misma era, tres temporadas. Aquí se ve el        */
/* aprendizaje de verdad: no lo dijo nadie, lo dijo el cuaderno.       */
/* ------------------------------------------------------------------ */
export const TEMPORADAS = [
  {
    anio: '2024',
    temporadasAtras: 2,
    siembra: 'Sembrado el 12 de marzo',
    hitos: [
      { clima: 'lluvia', texto: 'Abril llovido, buena flor' },
      { clima: 'helada', texto: 'Helada suave el 18 de junio' },
    ],
    cosecha: 'Tres bultos',
    tono: 'regular',
  },
  {
    anio: '2025',
    temporadasAtras: 1,
    siembra: 'Sembrado el 15 de marzo',
    hitos: [
      { clima: 'sol', texto: 'Mayo seco, flor tardía' },
      { clima: 'helada', texto: 'Helada negra el 14 de junio, flor abierta' },
    ],
    cosecha: 'Se perdió',
    tono: 'fracaso',
  },
  {
    anio: '2026',
    temporadasAtras: 0,
    siembra: 'Sembrado el 9 de febrero',
    hitos: [
      { clima: 'nube', texto: 'Pulgón en la esquina, atajado a tiempo' },
      { clima: 'helada', texto: 'Helada el 20 de junio, grano ya hecho' },
    ],
    cosecha: 'Cinco bultos',
    tono: 'aprendida',
  },
];

export const LECCION_TEMPORADAS =
  'Tres años del mismo tablón dicen una sola cosa: por aquí, la helada de junio no perdona flor abierta. Sembrando en febrero, la flor pasa antes del hielo. Eso no lo trajo nadie de afuera: estaba en estas páginas.';

/* ------------------------------------------------------------------ */
/* LA PACIENCIA — lo que se mide en años y vale la espera. Sin barra,  */
/* sin porcentaje: renglones de tinta que se va asentando.             */
/* ------------------------------------------------------------------ */
export const PACIENCIA = {
  titulo: 'El aliso de la orilla',
  renglones: [
    { anio: '2023', temporadasAtras: 3, nota: 'Sembrado de un palmo, con tierra del pie del aliso viejo.' },
    { anio: '2024', temporadasAtras: 2, nota: 'Me llega a la rodilla. Le dejé el pasto alto alrededor, que lo abrigue.' },
    { anio: '2025', temporadasAtras: 1, nota: 'Primera sombra de verdad. Ya se le paran los pájaros.' },
    { anio: '2026', temporadasAtras: 0, nota: 'La hoja caída ya se siente en el suelo: la tierra de abajo está más negra.' },
  ],
  remate: 'El aliso no corre. Va.',
};

/* ------------------------------------------------------------------ */
/* El cuaderno completo, en una sola pieza para la vista.              */
/* ------------------------------------------------------------------ */
export const DEMO_CUADERNO = {
  titulo: 'El cuaderno de la finca',
  era: 'El tablón de habas de la orilla',
  paginas: PAGINAS,
  temporadas: TEMPORADAS,
  leccion: LECCION_TEMPORADAS,
  paciencia: PACIENCIA,
  miradas: MIRADAS,
};
