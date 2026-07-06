/*
 * i18n (ADR-050): este archivo es CONTENIDO/copy campesino en español Colombia
 * (prácticas, pasos, señales del módulo Agua), pendiente de migrar a
 * src/config/messages.js — mismo criterio que sanidadData.js / poscosechaCalculator.js.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
/**
 * aguaFinca.js — CONTENIDO del módulo "Agua de la finca" (3 pilares).
 *
 * REGLA ANTI-ALUCINACIÓN del módulo: todo lo CUALITATIVO (prácticas, pasos,
 * señales) vive aquí como copy; toda CIFRA DURA (mm de lluvia por zona, Kc por
 * cultivo, ETo por piso térmico, dosis de potabilización, metros legales de
 * ronda) es un SLOT con `valor: null` + `estado: 'grounded_pendiente'` que el
 * pipeline de grounding (DR con fuente → catálogo/AGE) llenará. La UI pinta
 * "dato en camino" cuando el valor es null — NUNCA muestra un número
 * inventado.
 *
 * Convención del slot:
 *   { estado: 'grounded_pendiente', valor: null, fuentePrevista: '<de dónde saldrá>' }
 */

export const ESTADO_GROUNDED_PENDIENTE = 'grounded_pendiente';

/* ────────────────────────────────────────────────────────────────────────
 * PILAR 1 · COSECHAR LA LLUVIA
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Lluvia mensual típica por zona/municipio (mm/mes).
 * TODO GROUNDED-PENDIENTE: llega aparte por el pipeline de clima (dato
 * IDEAM/estación por municipio, DR en curso). Mientras tanto la calculadora
 * usa el mm que la persona digita (por ejemplo, del pluviómetro casero o de
 * lo que informa el módulo de clima de Chagra).
 */
export const LLUVIA_MENSUAL_ZONA = {
  estado: ESTADO_GROUNDED_PENDIENTE,
  valor: null,
  fuentePrevista: 'IDEAM — promedios mensuales de precipitación por municipio (pipeline clima Chagra)',
};

/** Pasos del sistema techo→tanque, en orden real de construcción. Cualitativo. */
export const PASOS_COSECHA = [
  {
    id: 'techo',
    titulo: 'El techo que ya tiene',
    detalle: 'Cualquier techo con caída sirve: casa, cocina, marranera, gallinero. Mida el piso que cubre el techo (largo × ancho): esa es el área que cosecha.',
  },
  {
    id: 'canal',
    titulo: 'Canal y bajante',
    detalle: 'Una canaleta con buena pendiente hacia el tanque, sin hojas acumuladas. Revísela antes de las temporadas de lluvia: canal tapada es cosecha perdida.',
  },
  {
    id: 'primeras-aguas',
    titulo: 'Deje ir la primera lavada',
    detalle: 'La primera lluvia después de días secos baja lavando el techo (polvo, hollín, excremento de aves). Desvíela o deséchela: al tanque solo debe entrar agua de techo ya lavado.',
  },
  {
    id: 'tanque',
    titulo: 'Tanque tapado y oscuro',
    detalle: 'Tanque con tapa y sin luz por dentro: la luz cría algas y el tanque destapado cría zancudos. Con malla en la entrada del agua no entran hojas ni animales.',
  },
];

/* ────────────────────────────────────────────────────────────────────────
 * PILAR 2 · REGAR CON MEDIDA
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * ETo de referencia por piso térmico (mm/día).
 *
 * GROUNDED (DR agua nacional §2.2): la ETo cae con la altitud según la relación
 * del IDEAM `ETo(mm/día) = 4,37·exp(−0,0002·altitud[m])`. Se evalúa esa fórmula
 * en la altitud media de cada piso térmico colombiano (cálido ~500, templado
 * ~1500, frío ~2500, páramo ~3500 msnm) y se redondea a 0,1 mm/día. Es una
 * REFERENCIA orientadora (confianza media: fórmula de escala, no medición por
 * estación): la calculadora sigue aceptando el valor exacto que la persona
 * digite de su estación o del módulo de clima.
 *
 * Fuente: IDEAM — Nota Técnica ETo (relación ETo–altitud). Confianza: media.
 */
export const ETO_POR_PISO_TERMICO = [
  // 4,37·exp(−0,0002·500)  ≈ 3,95
  { piso: 'cálido', etoMmDia: 4.0, altitudRefM: 500, estado: 'grounded', fuente: 'IDEAM (ETo≈4,37·e^(−0,0002·h))', confianza: 'media' },
  // 4,37·exp(−0,0002·1500) ≈ 3,24
  { piso: 'templado', etoMmDia: 3.2, altitudRefM: 1500, estado: 'grounded', fuente: 'IDEAM (ETo≈4,37·e^(−0,0002·h))', confianza: 'media' },
  // 4,37·exp(−0,0002·2500) ≈ 2,65
  { piso: 'frío', etoMmDia: 2.7, altitudRefM: 2500, estado: 'grounded', fuente: 'IDEAM (ETo≈4,37·e^(−0,0002·h))', confianza: 'media' },
  // 4,37·exp(−0,0002·3500) ≈ 2,17
  { piso: 'páramo', etoMmDia: 2.2, altitudRefM: 3500, estado: 'grounded', fuente: 'IDEAM (ETo≈4,37·e^(−0,0002·h))', confianza: 'media' },
];

/**
 * Kc (coeficiente de cultivo) por especie y etapa.
 *
 * GROUNDED (DR agua nacional §2.3 — FAO-56 Cuadro 12, clima sub-húmedo). Cada
 * cultivo trae los tres Kc de etapa (inicial / media / final); `kc` es el de la
 * etapa MEDIA (el pico de consumo, el número más útil como referencia única
 * para la calculadora). Ajustar por clima local. Confianza alta (FAO-56,
 * estándar internacional).
 */
export const KC_CULTIVOS = [
  { slug: 'maiz', nombre: 'Maíz', kc: 1.2, kcInicial: 0.30, kcMedia: 1.20, kcFinal: 0.35, estado: 'grounded', fuente: 'FAO-56 Cuadro 12 (maíz grano)', confianza: 'alta' },
  { slug: 'frijol', nombre: 'Fríjol', kc: 1.15, kcInicial: 0.40, kcMedia: 1.15, kcFinal: 0.35, estado: 'grounded', fuente: 'FAO-56 Cuadro 12 (fríjol seco)', confianza: 'alta' },
  { slug: 'cafe', nombre: 'Café', kc: 1.1, kcInicial: 1.05, kcMedia: 1.10, kcFinal: 1.10, estado: 'grounded', fuente: 'FAO-56 Cuadro 12 (café con cobertura)', confianza: 'alta' },
  { slug: 'platano', nombre: 'Plátano', kc: 1.1, kcInicial: 0.50, kcMedia: 1.10, kcFinal: 1.00, estado: 'grounded', fuente: 'FAO-56 Cuadro 12 (banano/plátano año 1)', confianza: 'alta' },
  { slug: 'tomate', nombre: 'Tomate', kc: 1.15, kcInicial: 0.60, kcMedia: 1.15, kcFinal: 0.80, estado: 'grounded', fuente: 'FAO-56 Cuadro 12 (tomate)', confianza: 'alta' },
  { slug: 'papa', nombre: 'Papa', kc: 1.15, kcInicial: 0.50, kcMedia: 1.15, kcFinal: 0.75, estado: 'grounded', fuente: 'FAO-56 Cuadro 12 (papa)', confianza: 'alta' },
];

/**
 * Eficiencia por sistema de riego (fracción del agua que sí llega a la raíz).
 *
 * GROUNDED (DR agua nacional §2.1): goteo 90–95 % y aspersión 80–85 % son
 * rangos de literatura (UCLM); surco/gravedad 70–80 % es el ÚNICO valor primario
 * verificado en el DR (Manual de Métodos de Riego). Se guarda el punto medio del
 * rango en `coef`, con su `coefRango` y confianza. El orden (goteo > aspersión >
 * gravedad) no cambia.
 */
export const SISTEMAS_RIEGO = [
  {
    id: 'goteo',
    nombre: 'Goteo (o botella gota a gota)',
    pierde: 'Pierde poquito',
    coef: 0.92,
    coefRango: [0.90, 0.95],
    estado: 'grounded',
    fuente: 'Literatura de riego (UCLM) vía DR agua §2.1',
    confianza: 'media',
    detalle: 'El agua cae despacio al pie de la mata. Se puede armar casero con manguera perforada o botellas. El que más rinde cuando el agua está contada.',
  },
  {
    id: 'aspersion',
    nombre: 'Aspersión (rociador)',
    pierde: 'Pierde algo al viento y al sol',
    coef: 0.82,
    coefRango: [0.80, 0.85],
    estado: 'grounded',
    fuente: 'Literatura de riego (UCLM) vía DR agua §2.1',
    confianza: 'media',
    detalle: 'Moja también donde no hay raíz, y con sol fuerte parte se evapora antes de caer. Riegue de madrugada o al caer la tarde.',
  },
  {
    id: 'gravedad',
    nombre: 'Por surco o manguera suelta',
    pierde: 'Pierde harto por el camino',
    coef: 0.75,
    coefRango: [0.70, 0.80],
    estado: 'grounded',
    fuente: 'Manual de Métodos de Riego (surco bien operado, valor verificado) vía DR agua §2.1',
    confianza: 'media-alta',
    detalle: 'Mucha agua se infiltra o se escurre antes de llegar a la mata. Si es lo que hay, riegue por tandas cortas y con el surco bien trazado.',
  },
];

/** Prácticas que bajan la sed del cultivo. Cualitativas, agroecología clásica. */
export const PRACTICAS_AHORRO = [
  { id: 'cobertura', titulo: 'Tape el suelo', detalle: 'Hojarasca, pasto de corte o tamo sobre el suelo: la tierra tapada guarda la humedad y no se agrieta al sol.' },
  { id: 'materia-organica', titulo: 'Suelo con materia orgánica', detalle: 'Un suelo con compost y bocashi funciona como esponja: recibe el aguacero y lo suelta despacio.' },
  { id: 'hora', titulo: 'Riegue cuando no hay sol bravo', detalle: 'De madrugada o al atardecer el agua entra a la tierra en vez de evaporarse.' },
  { id: 'observar', titulo: 'Riegue por la planta, no por costumbre', detalle: 'Meta el dedo a la tierra: si a un jeme de hondo está húmeda, todavía no toca. La mata avisa primero con las hojas.' },
];

/* ────────────────────────────────────────────────────────────────────────
 * PILAR 3 · CUIDAR EL AGUA (calidad + nacimiento)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Dosis de potabilización casera (cloro por litro, minutos de hervor, horas
 * de SODIS al sol).
 *
 * GROUNDED (DR agua nacional §3.3, dosis verificadas contra fuente sanitaria):
 *   - Cloración: 2 gotas de hipoclorito (lejía sin aroma) al 6 % por litro,
 *     mezclar y esperar 30 minutos; DOBLAR la dosis si el agua está turbia,
 *     con color o muy fría. Fuente: EPA (español). Confianza: media.
 *   - Hervir: 1 minuto a nivel del mar, 3 minutos por encima de ~1.000 msnm
 *     (menor punto de ebullición en altura). Fuente: OMS/EPA. Confianza: alta.
 *   - SODIS (desinfección solar): botella PET transparente ≤2 L, 6 horas de sol
 *     despejado (2 días seguidos si hay mucha nube); SOLO si turbiedad <30 UNT.
 *     Fuente: EAWAG-SANDEC/Banco Mundial. Confianza: alta.
 *
 * SEGURIDAD: el cloro y el SODIS pierden eficacia con agua turbia — asentar o
 * filtrar primero. Se conserva el mensaje "si huele a químico o viene de potrero
 * fumigado, ni hervida: consígala de otra fuente".
 */
export const DOSIS_POTABILIZACION = {
  estado: 'grounded',
  cloroGotasPorLitro: 2,
  cloroConcentracionPct: 6,
  cloroEsperaMin: 30,
  cloroDobleSiTurbia: true,
  hervorMinutos: 1,
  hervorMinutosSobre1000m: 3,
  sodisHorasSol: 6,
  sodisDiasSiNublado: 2,
  sodisTurbiedadMaxUNT: 30,
  fuente: 'EPA (cloración); OMS/EPA (hervido); EAWAG-SANDEC/Banco Mundial (SODIS) — DR agua §3.3',
  confianza: 'media (cloro); alta (hervido, SODIS)',
};

/**
 * IRCA rural — Índice de Riesgo de la Calidad del Agua para consumo humano.
 *
 * GROUNDED (DR agua nacional §3.1; grafo chagra_kg agua↔riesgo↔salud): el
 * 37,4 % del agua para tomar en la zona RURAL de Colombia está en riesgo ALTO
 * o inviable sanitariamente. Es el dato que convierte "el agua puede estar
 * mala" en "a uno de cada tres vecinos le sale mala": por eso el módulo empuja
 * a tratar SIEMPRE el agua de tomar. Fuente: INCA (Informe Nacional de la
 * Calidad del Agua). Confianza: media (dato oficial agregado, varía por año).
 */
export const IRCA_RURAL = {
  estado: 'grounded',
  porcentajeRiesgo: 37.4,
  ambito: 'rural',
  fuente: 'INCA — Informe Nacional de la Calidad del Agua (MinVivienda / INS)',
  confianza: 'media',
};

/**
 * Filtro de BIOARENA (biosand filter) — cuarto método casero de potabilización.
 *
 * GROUNDED (grafo chagra_kg agua↔salud; CAWST / OMS): tanque con capas de arena
 * y grava por donde el agua pasa despacio; en la superficie de la arena se forma
 * una "biocapa" viva (schmutzdecke) que atrapa y se come los microbios. Madura
 * en 1–3 semanas de uso diario. LÍMITE SAFETY-CRITICAL: quita la mayoría de
 * bacterias, parásitos y turbiedad, pero NO quita virus ni químicos disueltos
 * (venenos, nitratos) — por eso el agua filtrada se TERMINA de asegurar con
 * cloro o sol antes de tomarla. Fuente: CAWST (manual del filtro de bioarena);
 * OMS (evaluación de tratamiento de agua en el hogar). Confianza: media.
 */
export const BIOARENA = {
  estado: 'grounded',
  biocapaSemanasMin: 1,
  biocapaSemanasMax: 3,
  segundaBarrera: true,
  quita: 'la mayoría de bacterias, parásitos y la turbiedad',
  noQuita: 'virus ni químicos disueltos (venenos, nitratos)',
  fuente: 'CAWST (filtro de bioarena); OMS (tratamiento de agua en el hogar)',
  confianza: 'media',
};

/**
 * Los cuatro métodos caseros para potabilizar, en formato paso-a-paso con foto.
 *
 * Regla del módulo: los NÚMEROS salen de las constantes ya groundeadas
 * (DOSIS_POTABILIZACION, BIOARENA) — aquí NO se inventa ninguna cifra, solo se
 * teje el copy campesino alrededor. `foto` = slug del archivo en
 * public/agua-salud/<foto>.jpg (null = ilustración SVG propia, sin foto de
 * marca). `quita` / `noQuita` comunican honestamente el alcance y el límite de
 * cada método (parte del guard de salud: no vender un método como si lo hiciera
 * todo). `tono` mapea al acento visual del componente.
 */
export const METODOS_POTABILIZACION = [
  {
    id: 'hervir',
    foto: 'hervir',
    icono: 'hervir',
    tono: 'sky',
    titulo: 'Hervir',
    gancho: 'El más completo: no le queda bicho vivo.',
    pasos: [
      'Si está turbia, deje asentar y pásela por una tela limpia.',
      `Póngala a hervir a borbotón fuerte: ${DOSIS_POTABILIZACION.hervorMinutos} minuto a nivel del mar, ${DOSIS_POTABILIZACION.hervorMinutosSobre1000m} minutos por encima de los 1.000 metros (en tierra fría el agua hierve más frío).`,
      'Tápela y déjela enfriar en el mismo recipiente limpio. Sírvala con un cucharón, sin meter la mano.',
    ],
    quita: 'Mata bacterias, virus y parásitos.',
    noQuita: 'No quita venenos ni nitratos, y gasta leña.',
    fuente: 'OMS / EPA',
  },
  {
    id: 'cloro',
    foto: null,
    icono: 'cloro',
    tono: 'cyan',
    titulo: 'Cloro (lejía)',
    gancho: 'Rápido, barato y deja el agua protegida un rato.',
    pasos: [
      'Deje asentar y cuele: el cloro pierde fuerza en agua turbia.',
      `Eche ${DOSIS_POTABILIZACION.cloroGotasPorLitro} gotas de cloro doméstico —lejía SIN aroma, al ${DOSIS_POTABILIZACION.cloroConcentracionPct} %— por cada litro de agua.`,
      `Revuelva y espere ${DOSIS_POTABILIZACION.cloroEsperaMin} minutos antes de tomar. Doble la dosis si está turbia, con color o muy fría.`,
    ],
    quita: 'Mata bacterias y virus, y protege el agua guardada.',
    noQuita: 'Flojo contra el parásito Cryptosporidium; no quita químicos.',
    fuente: 'EPA',
  },
  {
    id: 'sodis',
    foto: 'sodis',
    icono: 'sodis',
    tono: 'amber',
    titulo: 'Sol (SODIS)',
    gancho: 'Gratis: solo pide sol y botellas.',
    pasos: [
      'Llene botellas plásticas transparentes de máximo 2 litros con agua CLARA (si está turbia, cuélela y déjela asentar primero).',
      'Tápelas y acuéstelas sobre el techo de zinc o una lámina, bien expuestas.',
      `Déjelas al sol despejado ${DOSIS_POTABILIZACION.sodisHorasSol} horas seguidas (${DOSIS_POTABILIZACION.sodisDiasSiNublado} días si está muy nublado).`,
    ],
    quita: 'El sol (rayos UV) mata bacterias, virus y parásitos.',
    noQuita: 'Solo sirve con agua clara; no quita químicos ni turbiedad.',
    fuente: 'EAWAG-SANDEC / Banco Mundial',
  },
  {
    id: 'bioarena',
    foto: 'bioarena',
    icono: 'bioarena',
    tono: 'lime',
    titulo: 'Filtro de bioarena',
    gancho: 'Un filtro casero de arena que trabaja solo.',
    pasos: [
      'Arme el filtro: capas de grava y arena fina dentro de un tanque; el agua entra por arriba y sale limpia por un tubo.',
      `Úselo a diario: sobre la arena se forma una nata viva (biocapa) que se come los microbios. Tarda de ${BIOARENA.biocapaSemanasMin} a ${BIOARENA.biocapaSemanasMax} semanas en madurar.`,
      'Para tomar, termine el agua filtrada con cloro o sol: el filtro no quita virus ni químicos.',
    ],
    quita: `Quita ${BIOARENA.quita}.`,
    noQuita: `No quita ${BIOARENA.noQuita}.`,
    fuente: 'CAWST / OMS',
  },
];

/* Fotos del módulo (salud) — reales, licencia abierta. slug = archivo en
 * public/agua-salud/<slug>.jpg. Provenance completa en public/agua-salud/_meta.json.
 * La atribución se muestra en la UI (Créditos de las fotos) por cumplimiento CC. */
export const FOTO_BASE_AGUA = '/agua-salud';
export const CREDITOS_FOTOS_AGUA = [
  { slug: 'lluvia', autor: 'SuSanA Secretariat', lic: 'CC BY 2.0', url: 'https://commons.wikimedia.org/wiki/File:Rainwater_harvesting_system_(3441562258).jpg' },
  { slug: 'turbia', autor: 'Albert Bridge', lic: 'CC BY-SA 2.0', url: 'https://commons.wikimedia.org/wiki/File:Muddy_water,_Belfast_-_geograph.org.uk_-_953830.jpg' },
  { slug: 'hervir', autor: 'Debske', lic: 'CC0', url: 'https://commons.wikimedia.org/wiki/File:Community_Health_Education_-_Boiling_water_so_it_is_safe_to_use.jpg' },
  { slug: 'sodis', autor: 'SODIS Eawag', lic: 'CC BY 3.0', url: 'https://commons.wikimedia.org/wiki/File:Indonesia-sodis-gross.jpg' },
  { slug: 'bioarena', autor: 'Nora.jeanine530', lic: 'CC BY-SA 3.0', url: 'https://commons.wikimedia.org/wiki/File:Biosand_Filters_in_Guatemala.JPG' },
  { slug: 'nacimiento', autor: 'USDA', lic: 'Dominio público', url: 'https://commons.wikimedia.org/wiki/File:Riparian_buffer_augusta_county_va.jpg' },
];

/** Escalera de calidad: para qué sirve cada agua de la finca. Cualitativo. */
export const USOS_DEL_AGUA = [
  { id: 'lluvia-directa', agua: 'Lluvia recién cosechada (tanque tapado)', sirve: 'Riego, animales, lavar, aseo de la casa', ojo: 'Para tomar o cocinar, trátela primero (hierva o desinfecte).' },
  { id: 'quebrada', agua: 'Quebrada o acequia', sirve: 'Riego', ojo: 'Aguas abajo de potreros o viviendas puede traer microbios: no la tome sin tratar.' },
  { id: 'nacimiento', agua: 'Nacimiento protegido', sirve: 'La reserva más valiosa de la finca', ojo: 'Aun así, para consumo humano lo seguro es hervir o desinfectar.' },
];

/** Señales de alarma en el agua — cuándo NO usarla ni para riego de hortaliza. */
export const SENALES_ALERTA_AGUA = [
  'Cambia de color o huele a podrido después de un aguacero.',
  'Espuma que no se deshace (jabones o agroquímicos aguas arriba).',
  'Peces o renacuajos muertos en el cauce.',
  'Nata aceitosa en la superficie.',
];

/**
 * Franja legal de protección alrededor de nacimientos y cauces (metros).
 *
 * GROUNDED (DR agua nacional §4.1, verificado contra norma): son MÍNIMOS
 * obligatorios de conservación forestal que recaen sobre el propietario rural.
 *   - Nacimientos: 100 m a la redonda (mínimo).
 *   - Cauces (ríos/quebradas/arroyos, permanentes o no): 30 m a cada lado.
 * Fuente: Decreto 1449 de 1977, Art. 3 (hoy compilado en el Decreto 1076 de
 * 2015). Confianza: alta. No confundir con la "ronda hídrica" del Art. 83 del
 * Decreto 2811/1974, que es un MÁXIMO de acotamiento (hasta 30 m) que fija la
 * CAR; los metros de aquí son mínimos que aplican con o sin acotamiento.
 */
export const RONDA_PROTECCION = {
  estado: 'grounded',
  metrosNacimiento: 100,
  metrosCauce: 30,
  fuente: 'Decreto 1449/1977 Art. 3 (compilado en Decreto 1076/2015) — DR agua §4.1',
  confianza: 'alta',
};

/* ────────────────────────────────────────────────────────────────────────
 * PILAR 3b · RIESGOS DE CONTAMINACIÓN + SALUD
 * (qué le echa veneno al agua, qué enferma, y a qué distancia se previene)
 *
 * REGLA REFORZADA (mismo patrón que el veto de botulismo del módulo de
 * fermentos): todo lo SAFETY-CRITICAL —nitratos que enferman a los bebés,
 * intoxicación por plaguicidas, diarrea— se respalda con AUTORIDAD
 * INSTITUCIONAL citada (OMS, MinSalud/INS vía Res. 2115/2007, ICA), NUNCA con
 * la opinión de una persona. Las CIFRAS de distancia y de límite salen del DR
 * agua nacional (2026-07-03, verificadas contra la norma). Lo que no tenga
 * fuente firme se deja como "dato en camino" (SlotPendiente), no se inventa.
 * ──────────────────────────────────────────────────────────────────────── */

/** Nivel de peligro para el semáforo (alto = rojo, medio = ámbar). */
export const NIVEL_PELIGRO = Object.freeze({ ALTO: 'alto', MEDIO: 'medio' });

/**
 * Qué contamina el agua de la finca (fuentes) y por dónde llega:
 *   · escorrentía  = corre por encima del suelo con el aguacero,
 *   · lixiviación  = se filtra hacia abajo hasta el agua del subsuelo.
 * Cualitativo (agroecología + saneamiento básico). Las cifras de distancia
 * para prevenir viven aparte, groundeadas, en DISTANCIAS_SEGURIDAD.
 * `icono` es una clave que el componente mapea a un ícono de riesgo.
 */
export const RIESGOS_CONTAMINACION = [
  {
    id: 'plaguicidas',
    icono: 'veneno',
    fuente: 'Venenos y plaguicidas',
    via: 'Escorrentía y lixiviación',
    aporta: 'Residuos de agroquímicos que corren con el aguacero o se filtran al subsuelo hasta el nacimiento y el pozo.',
    nivel: 'alto',
    prevenir: 'No fumigue ni lave la bomba cerca del agua; respete la franja de seguridad (ver distancias). Los envases NO se enjuagan en la quebrada.',
  },
  {
    id: 'cochera',
    icono: 'cochera',
    fuente: 'Cocheras y corrales mal manejados',
    via: 'Escorrentía y lixiviación',
    aporta: 'El estiércol sin manejo suelta coliformes y E. coli (microbios de la caca) y nitratos que bajan al agua.',
    nivel: 'alto',
    prevenir: 'Cochera con piso, techo y cuneta que NO drene al cauce; el estiércol va a compost o biodigestor. Siempre lejos y aguas abajo del pozo.',
  },
  {
    id: 'letrina',
    icono: 'letrina',
    fuente: 'Letrinas y pozos sépticos mal ubicados',
    via: 'Lixiviación',
    aporta: 'Coliformes/E. coli y nitratos que se filtran cuando la letrina queda cerca o loma arriba del pozo de agua.',
    nivel: 'alto',
    prevenir: 'Letrina o pozo séptico siempre aguas abajo y a la distancia mínima del pozo de agua (ver distancias).',
  },
  {
    id: 'agroquimicos',
    icono: 'agroquimico',
    fuente: 'Fertilizantes en exceso',
    via: 'Lixiviación',
    aporta: 'El sobrante de urea y abonos nitrogenados se filtra como nitratos: el mismo veneno silencioso que enferma a los bebés.',
    nivel: 'alto',
    prevenir: 'Abone lo que la mata necesita, no de más; un suelo tapado y con materia orgánica retiene el nitrógeno en vez de soltarlo al agua.',
  },
  {
    id: 'combustibles',
    icono: 'combustible',
    fuente: 'Combustibles y aceites',
    via: 'Escorrentía',
    aporta: 'Gasolina, ACPM y aceite quemado dejan una nata de hidrocarburos que el agua no bota ni hirviendo.',
    nivel: 'medio',
    prevenir: 'Guarde y cambie aceites lejos del agua, sobre piso firme; el aceite usado se recoge, no se riega ni se quema al lado del cauce.',
  },
  {
    id: 'matadero',
    icono: 'matadero',
    fuente: 'Sacrificio casero (mataderos)',
    via: 'Escorrentía directa',
    aporta: 'Sangre, vísceras y lavazas cargan materia orgánica y microbios directo a la quebrada si se botan ahí.',
    nivel: 'medio',
    prevenir: 'Sacrifique lejos del agua; los desechos van a compost o fosa, nunca al cauce.',
  },
  {
    id: 'basura',
    icono: 'basura',
    fuente: 'Basura y botaderos',
    via: 'Lixiviación',
    aporta: 'La basura amontonada suelta lixiviados (el jugo negro) que bajan al suelo y al agua.',
    nivel: 'medio',
    prevenir: 'Nada de botaderos al lado del cauce; separe, composte lo orgánico y saque el resto de la ronda del agua.',
  },
];

/**
 * Distancia específica de un corral/porqueriza a la fuente de agua: no hay una
 * cifra única citable en norma nacional (las Buenas Prácticas Porcícolas del
 * ICA dan criterios de ubicación, no un metraje universal). Se deja honesta
 * como "dato en camino" y en la práctica se manda "lejos y aguas abajo".
 */
export const DISTANCIA_CORRAL_AGUA = {
  estado: ESTADO_GROUNDED_PENDIENTE,
  valor: null,
  fuentePrevista: 'ICA — Buenas Prácticas Porcícolas/Ganaderas (retiro de corrales a fuentes de agua)',
};

/**
 * Qué ENFERMA cuando esa contaminación llega al agua que se toma.
 *
 * SAFETY-CRITICAL: cada enfermedad se respalda con la AUTORIDAD que fija el
 * límite o el diagnóstico (OMS, MinSalud/INS vía Res. 2115/2007, ICA), NUNCA
 * con una persona. La metahemoglobinemia (bebés) es la más grave y silenciosa:
 * va marcada `critico: true`. `icono` = clave que el componente mapea.
 */
export const ENFERMEDADES_AGUA = [
  {
    id: 'diarrea',
    icono: 'diarrea',
    nombre: 'Diarrea e infecciones del estómago',
    critico: false,
    causa: 'Coliformes y E. coli de cocheras, letrinas y heces que llegan al agua.',
    senal: 'Diarrea, vómito, cólico y deshidratación — más peligrosa en niños y ancianos.',
    masRiesgo: 'Niños pequeños y adultos mayores.',
    autoridad: 'El agua para tomar no admite NINGUNA E. coli (0 UFC/100 mL). En Colombia, el 37,4 % del agua rural está en riesgo ALTO.',
    fuente: 'Resolución 2115/2007 (MinSalud/MinVivienda); INCA 2023 (MinVivienda/INS)',
  },
  {
    id: 'metahemoglobinemia',
    icono: 'bebe',
    nombre: 'Metahemoglobinemia — el «bebé azul»',
    critico: true,
    causa: 'Nitratos en el agua (de estiércol, letrinas y abonos) usada para preparar el tetero.',
    senal: 'El nitrato se vuelve nitrito en la barriga del bebé y le quita el oxígeno a la sangre: la piel se pone azulada alrededor de la boca y los ojos. Puede ser mortal.',
    masRiesgo: 'Bebés menores de 6 meses, sobre todo con leche de fórmula preparada con esa agua.',
    autoridad: 'La OMS fija el nitrato en máximo 50 mg/L justamente para evitar esta enfermedad en lactantes; Colombia exige máximo 10 mg/L de nitratos y 0,1 mg/L de nitritos en el agua de tomar. Si un bebé se pone azulado: al médico YA.',
    fuente: 'OMS — Guías para la calidad del agua de consumo humano (valor guía nitrato 50 mg/L); Resolución 2115/2007 (MinSalud): nitratos 10 mg/L, nitritos 0,1 mg/L',
  },
  {
    id: 'intoxicacion',
    icono: 'intoxicacion',
    nombre: 'Intoxicación por plaguicidas',
    critico: true,
    causa: 'Residuos de venenos agrícolas que la lluvia arrastra al agua, o envases lavados en el cauce.',
    senal: 'Dolor de cabeza, náuseas, mareo, visión borrosa; en casos fuertes, urgencia médica.',
    masRiesgo: 'Toda la familia; el veneno no se ve ni se quita hirviendo el agua.',
    autoridad: 'El agua de tomar admite como máximo 0,1 mg/L de plaguicidas en total. El registro y control de plaguicidas es del ICA, que mantiene la lista de los prohibidos. Si el agua huele a químico o viene de potrero fumigado, NO se toma — ni hervida.',
    fuente: 'Resolución 2115/2007 (MinSalud): plaguicidas ≤ 0,1 mg/L; ICA (registro y control de plaguicidas)',
  },
];

/**
 * La REGLA DE LAS DISTANCIAS: a qué retiro del agua debe quedar cada foco de
 * contaminación y qué franja de monte hay que dejar. Cifras GROUNDED contra
 * norma (DR agua nacional §4.1). `tipo`: 'proteger' (dejar monte) vs 'alejar'
 * (retirar la fuente de riesgo). El componente ilustra estos metros.
 */
export const DISTANCIAS_SEGURIDAD = [
  {
    id: 'nacimiento',
    icono: 'nacimiento',
    que: 'Monte alrededor del nacimiento',
    metros: 100,
    detalle: 'Franja de bosque a la redonda del ojo de agua. Es obligación del dueño del predio.',
    norma: 'Decreto 1449/1977 Art. 3 (hoy Decreto 1076/2015)',
    tipo: 'proteger',
    estado: 'grounded',
    confianza: 'alta',
  },
  {
    id: 'cauce',
    icono: 'cauce',
    que: 'Monte a lado y lado de ríos y quebradas',
    metros: 30,
    detalle: 'Franja de bosque a cada orilla del cauce, sea permanente o no.',
    norma: 'Decreto 1449/1977 Art. 3 (hoy Decreto 1076/2015)',
    tipo: 'proteger',
    estado: 'grounded',
    confianza: 'alta',
  },
  {
    id: 'septico',
    icono: 'letrina',
    que: 'Letrina o pozo séptico, lejos y aguas abajo del pozo de agua',
    metros: 30,
    detalle: 'Retiro mínimo de la letrina o pozo séptico al pozo/aljibe de agua para tomar, y SIEMPRE ladera abajo de él.',
    norma: 'RAS — Reglamento de Agua Potable y Saneamiento Básico, Título E (MinVivienda)',
    tipo: 'alejar',
    estado: 'grounded',
    confianza: 'media',
  },
  {
    id: 'fumigacion-terrestre',
    icono: 'fumigar',
    que: 'No fumigar con bomba de espalda junto al agua',
    metros: 10,
    detalle: 'Franja de seguridad mínima entre la fumigación terrestre y cualquier cuerpo de agua.',
    norma: 'Decreto 1843/1991 Art. 87',
    tipo: 'alejar',
    estado: 'grounded',
    confianza: 'alta',
  },
  {
    id: 'fumigacion-aerea',
    icono: 'fumigar',
    que: 'No fumigar con avioneta sobre el agua',
    metros: 100,
    detalle: 'Franja de seguridad mínima para aspersión aérea sobre cuerpos de agua.',
    norma: 'Decreto 1843/1991 Art. 87',
    tipo: 'alejar',
    estado: 'grounded',
    confianza: 'alta',
  },
];

/**
 * CASO INSIGNIA · "Se me seca el nacimiento en verano".
 * Plan cualitativo por tiempos: qué hacer YA en verano, qué sembrar/cercar en
 * invierno, y cómo leer el clima que viene (conecta con el módulo de clima y
 * el ciclo ENSO que Chagra ya sigue — no se re-implementa aquí).
 */
export const CASO_NACIMIENTO = {
  id: 'nacimiento-seco-verano',
  titulo: 'Se me seca el nacimiento en verano',
  resumen: 'Un nacimiento no se seca de un día para otro: se va quedando solo. Casi siempre es la suma de potrero hasta el borde, árboles tumbados arriba y todo el mundo sacando agua a la vez en la época seca.',
  enVerano: [
    { id: 'no-secar-del-todo', titulo: 'No lo ordeñe hasta el fondo', detalle: 'Si entre todos sacan hasta la última gota, el ojo de agua pierde su hilo y tarda más en volver. Racionen por horas y dejen siempre un remanente corriendo.' },
    { id: 'lluvia-alivia', titulo: 'Use la lluvia guardada primero', detalle: 'Cada caneca de lluvia cosechada en invierno es agua que en verano NO se le saca al nacimiento. Por eso este módulo empieza por el techo.' },
    { id: 'sombra-de-emergencia', titulo: 'No despeje más monte alrededor', detalle: 'En plena sequía ni socole ni queme cerca del ojo de agua: esa sombra es lo que le queda de humedad.' },
  ],
  enInvierno: [
    { id: 'cercar', titulo: 'Cierre el paso del ganado', detalle: 'Una cerca sencilla alrededor del nacimiento evita el pisoteo que compacta el suelo y ensucia el agua. Deje un bebedero afuera para los animales.' },
    { id: 'sembrar-nativas', titulo: 'Siembre monte nativo alrededor', detalle: 'Árboles y matorral nativo de su piso térmico alrededor del ojo de agua y aguas arriba: sus raíces son las que guardan el agua del invierno para soltarla en verano.' },
    { id: 'zanjas', titulo: 'Ayude a que el aguacero entre a la tierra', detalle: 'Zanjas de infiltración a nivel, terrazas y suelo tapado ladera arriba: el agua que corre se pierde; la que se infiltra es la que el nacimiento le devuelve en verano.' },
  ],
  comunidad: [
    { id: 'vecinos', titulo: 'El agua es de la vereda', detalle: 'Si el nacimiento abastece a varios, siéntense a acordar turnos y a cuidar juntos la parte alta. Un solo vecino cuidando no alcanza.' },
    { id: 'clima', titulo: 'Léale el paso al clima', detalle: 'Chagra ya sigue el ciclo del Niño y la Niña en su módulo de clima: cuando viene un Niño (más seco), guarde más lluvia desde antes y raciónese temprano.' },
  ],
};

/** Los 3 pilares del módulo — estructura de navegación. */
export const PILARES_AGUA = [
  { id: 'lluvia', titulo: 'Cosechar la lluvia', corto: 'Lluvia', descripcion: 'Del techo al tanque: cuánta agua le cae gratis y cómo guardarla.' },
  { id: 'riego', titulo: 'Regar con medida', corto: 'Riego', descripcion: 'Cuánta agua necesita de verdad su cultivo y cómo no botarla.' },
  { id: 'cuidar', titulo: 'Cuidar el agua', corto: 'Cuidar', descripcion: 'Agua sana para la casa y un nacimiento que no se seque.' },
];
