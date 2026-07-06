/* i18n (ADR-050): contenido user-facing en español Colombia. Mismo criterio
 * de deuda que vidaSuelo.js y SaludSueloScreen.jsx (regla soft desactivada allí). */

/**
 * lecturaSuelo — "Léala en campo" (mundo El suelo vivo, mini-app Cuaderno del
 * Suelo → pilar de lectura SIN laboratorio = el PASO 0 del rediseño
 * agroecológico).
 *
 * Antes de gastar en un análisis, la tierra ya le habla: con la pala, el color,
 * el olor y cómo se traga el agua. Este pilar enseña a LEERLA con las manos y a
 * reconocer las señales de que está enferma (compactación, erosión, costra).
 *
 * CERO invención de cifras: las observaciones ("señales de campo") y sus
 * umbrales gruesos (palada de 20-30 cm, agua que no baja, etc.) están
 * GROUNDED al mismo consolidado que ya usa el diagnóstico interactivo:
 * src/data/soil-diagnostics.json (DR-SUELOS-1: IGAC, AGROSAVIA, CIPAV, FAO,
 * SENA, USDA-NRCS, Cenicafé, Jaramillo 2002). Aquí NO se reimplementa ese
 * motor: este pilar es la lámina didáctica photo-forward que ENLAZA a la
 * herramienta interactiva (ruta 'suelo' → SoilDiagnosticScreen).
 *
 * Las fotos son de licencia abierta (Wikimedia Commons). La atribución se
 * muestra en la UI (cumplimiento CC) y su provenance vive en
 * public/soil-life/_meta.json. Donde no hay foto honesta (el olor no se
 * fotografía), se usa ilustración o ícono: nunca una foto que engañe.
 */

/* Las cuatro lecturas con las manos. Cada una: cómo se hace (corto), qué es
 * BUENA señal y qué es señal de ALERTA. `slug` opcional = foto real en
 * public/soil-life/<slug>.jpg; sin slug se dibuja una ilustración/ícono. */
export const LECTURAS_CAMPO = [
  {
    id: 'pala',
    slug: 'palada',
    emoji: '🪏',
    icono: 'pala',
    titulo: 'La prueba de la pala',
    tecnico: 'Calicata simple / palada de diagnóstico',
    como: 'Saque una palada de unos 20 a 30 cm, entera, y ábrala como un pan. Mire cómo se desmorona, las raíces y quién vive adentro.',
    buena: 'Se rompe en terroncitos redondos (migas), las raíces bajan derecho y aparecen lombrices.',
    alerta: 'Sale en bloques duros y planos, las raíces se tuercen de lado y no hay bichos: la tierra está apretada.',
  },
  {
    id: 'color',
    emoji: '🎨',
    icono: 'color',
    titulo: 'El color',
    tecnico: 'Color del horizonte superficial',
    como: 'Con la misma palada, mire el color de la tierra de arriba, en húmedo.',
    buena: 'Oscura, café a casi negra: tiene materia orgánica y vida guardada.',
    alerta: 'Amarilla o colorada pálida = lavada; gris o azulosa con olor feo = se encharca y le falta aire.',
  },
  {
    id: 'olor',
    emoji: '👃',
    icono: 'olor',
    titulo: 'El olor',
    tecnico: 'Olor biológico del suelo',
    como: 'Coja un puñado húmedo y huélalo de una vez, recién sacado.',
    buena: 'Huele a monte, a tierra mojada de bosque: esa es la vida trabajando.',
    alerta: 'Huele a huevo podrido, a agrio o a nada: le falta aire o le sobra veneno.',
  },
  {
    id: 'infiltracion',
    emoji: '💧',
    icono: 'agua',
    titulo: 'Cómo entra el agua',
    tecnico: 'Prueba de infiltración del hoyo',
    como: 'Haga un hueco de un jeme, llénelo de agua, deje que se vacíe y llénelo otra vez. Cronometre esa segunda vez.',
    buena: 'El agua baja parejo y en un rato se va: el suelo respira y no se ahoga.',
    alerta: 'El agua se queda horas empozada: hay una capa dura abajo (pie de arado) o mucha arcilla.',
  },
];

/* Señales de que la tierra está ENFERMA. Foto real (slug) + la señal que se ve,
 * por qué pasa y el primer auxilio. Los tres males están en el consolidado
 * (soil-diagnostics.json): compactación/pie de arado, erosión y costra. */
export const SENALES_ENFERMO = [
  {
    slug: 'compactacion',
    emoji: '🧱',
    titulo: 'Compactación (pie de arado)',
    tecnico: 'Capa compactada subsuperficial',
    senal: 'La tierra suena a piedra, el palín rebota y el agua se empoza. Una varilla se frena antes de los 20 cm.',
    causa: 'Pisoteo del ganado, tractor o azadón siempre a la misma hondura: se forma un piso duro que las raíces no perforan.',
    auxilio: 'Descompactar en seco (cincel o raíces de abono verde como el nabo forrajero), no volver a arar de más y tapar el suelo.',
  },
  {
    slug: 'erosion',
    emoji: '🏔️',
    titulo: 'Erosión',
    tecnico: 'Pérdida de suelo por agua o viento',
    senal: 'Aparecen surcos y cárcavas, quedan las piedras y las raíces al aire, y la capa negra se va aguas abajo cuando llueve.',
    causa: 'Suelo desnudo en pendiente: la lluvia pega directo y arrastra lo mejor de la tierra, la capa donde vive todo.',
    auxilio: 'Tapar ya con cobertura, sembrar en curvas de nivel, barreras vivas y no dejar el suelo pelado nunca.',
  },
  {
    slug: 'costra',
    emoji: '🍪',
    titulo: 'Costra dura',
    tecnico: 'Encostramiento superficial',
    senal: 'Se forma una lámina dura y agrietada encima; la semilla no puede salir y el agua resbala en vez de entrar.',
    causa: 'Suelo desnudo golpeado por la lluvia y el sol, pobre en materia orgánica: se sella por encima.',
    auxilio: 'Cobertura muerta (hojarasca, mulch), materia orgánica y raíces vivas para que el suelo vuelva a ser esponja.',
  },
];

/* Créditos de fotos NUEVAS de este pilar — cumplimiento de licencia CC.
 * Provenance completa en public/soil-life/_meta.json. Se completan/validan con
 * los archivos reales que se descarguen; cada entrada = una foto atribuida. */
export const CREDITOS_LECTURA = [
  { slug: 'palada', autor: 'USDA-NRCS Montana', lic: 'Dominio público', url: 'https://commons.wikimedia.org/wiki/File:Soil_Survey01_(24211387577).jpg' },
  { slug: 'compactacion', autor: 'Blonder1984', lic: 'CC BY-SA 3.0', url: 'https://commons.wikimedia.org/wiki/File:Soil_compaction.JPG' },
  { slug: 'erosion', autor: 'Desmanthus4food', lic: 'CC BY-SA 3.0 US', url: 'https://commons.wikimedia.org/wiki/File:Erosion_gulleys_on_unterraced_farmland_in_Yunnan.jpg' },
  { slug: 'costra', autor: 'Ibrahim Achiri', lic: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Dry_cracked_soil_ground.jpg' },
];

export const FOTO_BASE = '/soil-life';
