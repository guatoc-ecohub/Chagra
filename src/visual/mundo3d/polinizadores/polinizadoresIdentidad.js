/*
 * polinizadoresIdentidad — LA VERDAD DEL MUNDO POLINIZADORES, COMO DATOS.
 *
 * Este mundo no dibuja "abejitas bonitas": dibuja el SERVICIO. La tesis es una
 * sola y todo el arte la sirve — SIN ESTOS BICHOS NO HAY COSECHA. Para que el
 * dibujo pueda decir la verdad, la verdad vive primero aquí, en datos puros.
 *
 * ── DE DÓNDE SALE (grounded) ────────────────────────────────────────────────
 * Del corpus maestro de polinización (121 pares de campo, teacher-polinizacion)
 * y del arte ya aprobado de Angelita. Reglas que el corpus deja firmes y que el
 * dibujo NO puede contradecir:
 *
 *   · La angelita (Tetragonisca angustula) es NATIVA y NO PICA — su aguijón
 *     está atrofiado. Es la cara de Chagra y la abeja que un niño puede mirar
 *     de cerca. La que pica es la de miel (Apis mellifera), traída de Europa y
 *     africanizada en Colombia.
 *   · Polinizador NO es sinónimo de abeja: abejorros, colibríes, murciélagos,
 *     mariposas, sírfidos (moscas disfrazadas de abeja) y escarabajos también.
 *   · SÍNDROME FLORAL: color, forma, olor, néctar y HORA DE APERTURA evolucionan
 *     juntos para llamar a cierto visitante. Flor roja tubular → colibrí (ve el
 *     rojo, se guía por vista). Flor blanca grande que huele de noche →
 *     murciélago/polilla. Flor amarilla grande y abierta → abeja de mañana.
 *   · Las abejas NO ven el rojo; ven azul, morado, amarillo y ULTRAVIOLETA —
 *     donde hay GUÍAS DE NÉCTAR que nosotros no vemos. (Ver `visionAbeja`.)
 *   · El síndrome es TENDENCIA, no ley: muchas flores abiertas son generalistas
 *     y reciben de varios. El arte lo respeta: `visita` casi nunca es una sola.
 *   · Angelita es chiquita: NO puede con la flor grande y compleja del maracuyá
 *     — esa necesita un polinizador FUERTE (abejorro). Ni la mascota de Chagra
 *     lo hace todo: por eso la red necesita VARIEDAD, no una sola especie.
 *
 * REGLA DE ORO (la de `abejaIdentidad.js`): SOLO DATOS. Cero three, cero react
 * → three-free, testeable headless y seguro en el bundle base. La GEOMETRÍA vive
 * en los `*.geom.js`; la CADENCIA en `polinizadores.css` y en los useFrame.
 */

/*
 * LA PALETA DE ANGELITA, DE LA FUENTE — no una copia "parecida".
 *
 * Angelita ya tiene cuerpo y ya tiene identidad (`creatures/abejaIdentidad.js`):
 * el ámbar de su tronco, el dorado de su cabeza, el tul de sus alas. Este mundo
 * es SUYO, así que bebe de ahí en vez de re-declarar unos colores parecidos que
 * mañana se irían separando de los del home. La angelita que vuela sobre este
 * maracuyá y la que le responde en el chat tienen que ser, a los ojos, la MISMA
 * vecina — y la única forma de garantizarlo es que salgan del mismo archivo.
 */
import { ABEJA_PALETA } from '../../creatures/abejaIdentidad.js';

export { ABEJA_PALETA, ABEJA_TINTA } from '../../creatures/abejaIdentidad.js';

/* -------------------------------------------------------------------------- */
/*  Paleta del mundo                                                           */
/* -------------------------------------------------------------------------- */

/*
 * Un mediodía de finca andina: luz alta y limpia, verde de huerta, y EL ÁMBAR
 * como color del servicio (el mismo ámbar del cuerpo de Angelita — el hilo de
 * polen es de su color, no de un color nuevo). La noche baja a un azul de luna
 * donde solo quedan encendidas las flores pálidas y el murciélago.
 */
export const PAL = {
  // Aire y suelo
  cieloDia: '#bfe3f2',
  cieloNoche: '#141d33',
  nieblaDia: '#d5eaf0',
  nieblaNoche: '#1b2645',
  suelo: '#6b7f47',
  sueloRico: '#55693a', // la tierra bajo el monte (materia orgánica)
  potrero: '#96a45c', // el pasto limpio: verde pobre, sin flor
  monte: '#3f5a35', // el rincón de monte: verde hondo

  // EL SERVICIO (el trueque hecho color)
  polen: '#ffc94a', // el polen que VIAJA: ámbar dorado
  polenVivo: '#ffe08a', // el polen recién cargado (brilla)
  nectar: '#f7d774', // el néctar que la flor PAGA
  /* El hilo de la red ES el ámbar del cuerpo de Angelita, literalmente. No es
     una casualidad bonita: el servicio tiene el color de quien lo hace. */
  hilo: ABEJA_PALETA.cuerpo,
  hiloPuente: '#ffe4a3', // el hilo que CUAJA (flor→flor de la misma mata): más claro
  hiloMuerto: '#6b5a4a', // el hilo cortado por el veneno: ceniza

  // La amenaza
  veneno: '#b8c7a0', // la deriva: un verde-gris enfermo, nunca rojo de alarma
  venenoSistemico: '#9db486', // el neonicotinoide DENTRO de la planta (llega al néctar)
  ceniza: '#5c5348',

  // Cuerpos (cada bicho se reconoce de un vistazo).
  // La angelita NO tiene colores propios aquí: son los de su identidad aprobada.
  angelitaCuerpo: ABEJA_PALETA.cuerpo,
  angelitaCabeza: ABEJA_PALETA.cabeza,
  angelitaChumbe: ABEJA_PALETA.hiloChumbe, // el hilo de tierra de su banda
  apisCuerpo: '#e5a13c',
  apisBanda: '#4a3524',
  abejorroPelo: '#2b2723', // negro peludo
  abejorroBanda: '#f2c33d', // franjas amarillas GRUESAS
  colibriDorso: '#2fa38a', // turquesa esmeralda (el mismo Colibri coruscans)
  colibriGorguera: '#8b5cd6', // la gorguera violeta: su firma
  sirfidoCuerpo: '#e8c14a', // se disfraza de abeja...
  sirfidoBanda: '#3a3128',
  sirfidoOjo: '#c46a4a', // ...pero el ojo GRANDE de mosca lo delata
  mariposaAla: '#e8834a',
  mariposaBorde: '#3a2b22',
  murcielagoPelo: '#4a3f4e',
  murcielagoMembrana: '#6b5a6e',
  escarabajoCaparazon: '#4d3b2a',
  escarabajoLustre: '#7a6142',
  ala: ABEJA_PALETA.alaTul, // el tul de las alas: el de Angelita, el de todas

  // Flores por síndrome (el color ES el mensaje)
  florTubular: '#e8503f', // roja tubular: el cartel del colibrí
  florTubularGarganta: '#ffb03a',
  florNocturna: '#f5f0e2', // blanca pálida: se ve en la oscuridad
  florNocturnaCorazon: '#e8dcc0',
  florCartel: '#f5c026', // amarilla grande: el cartel de la abeja
  florCartelCorazon: '#c98a1e',
  florUv: '#7a6ad8', // azul-morada
  florUvGuia: '#b9aef0', // las guías, como las vemos NOSOTROS (casi nada)
  florPlana: '#f2a3c4', // la margarita de la mariposa
  florPlanaCorazon: '#f5d44a',
  florRobusta: '#e6dcc2', // crema gruesa y olorosa: el escarabajo
  pasifloraCorona: '#6d4ba8', // la corona de filamentos del maracuyá
  pasifloraCoronaClara: '#f0eaf7',
  pasifloraPetalo: '#f5f2e8',
  melifera: '#f08a2c', // caléndula del borde
  meliferaSol: '#f5c93a', // girasol del borde

  // Plantas
  tallo: '#5f8a3a',
  hoja: '#4f7a35',
  hojaClara: '#6d9c48',
  maiz: '#8aa04a',
  maizEspiga: '#d9c078', // la espiga: polen al viento, sin néctar ni color
  maizPolen: '#e8d9a0',
  fruto: '#d9a03c',
  frutoMaracuya: '#e0a83a',
  cafeGrano: '#c94a3a',
  cafeFlor: '#f7f4ea',

  // Madera del meliponario
  cajaMadera: '#a87f4a',
  cajaMaderaTapa: '#8a6538',
  cerumen: '#c98a3a', // la cera con resina: potes y piquera
  cerumenClaro: '#e8b45e',
};

/* -------------------------------------------------------------------------- */
/*  Los SÍNDROMES FLORALES: la flor y su visitante, como pareja                */
/* -------------------------------------------------------------------------- */

/*
 * Cada síndrome es un CARTEL dirigido a alguien. El dibujo tiene que dejar leer
 * POR QUÉ: el color que ese visitante ve, la forma que su cuerpo necesita, la
 * hora en que abre. Si el jugador entiende por qué la roja tubular llama al
 * colibrí y la blanca nocturna al murciélago, este mundo ya hizo su trabajo.
 *
 *   forma        → cómo la dibuja `floresSindrome.geom.js`
 *   abre         → 'dia' | 'noche' | 'manana' (la hora TAMBIÉN es el cartel)
 *   plataforma   → ¿tiene dónde pararse? Las de colibrí NO: él se cierne y no
 *                  necesita pista de aterrizaje. Detalle real que se ve.
 *   nectar/olor  → 0..1 (el colibrí paga en néctar; la nocturna grita con olor)
 *   uv           → ¿tiene guías de néctar ultravioleta? (ver `visionAbeja`)
 *   visita       → quiénes la visitan DE VERDAD (el primero es el titular).
 *                  Casi nunca es uno solo: el síndrome es tendencia, no ley.
 */
export const SINDROMES = {
  tubular_rojo: {
    id: 'tubular_rojo',
    nombre: 'Flor roja tubular',
    porque: 'Roja y tubular: el colibrí ve muy bien el rojo y su pico largo llega al fondo. Casi no huele, porque él se guía por la vista.',
    forma: 'tubo',
    color: PAL.florTubular,
    colorInterno: PAL.florTubularGarganta,
    abre: 'dia',
    plataforma: false, // el colibrí se cierne: no necesita dónde pararse
    nectar: 1,
    olor: 0.1,
    uv: false,
    altura: 'alta', // el colibrí suele trabajar a media altura y arriba
    visita: ['colibri'],
  },
  nocturna_pale: {
    id: 'nocturna_pale',
    nombre: 'Flor blanca de noche',
    porque: 'Grande, pálida y con olor fuerte de noche: el murciélago se guía por el olfato en la oscuridad, y el blanco es lo único que refleja la poca luz.',
    forma: 'brocha', // el guamo: una brocha de estambres pálidos
    color: PAL.florNocturna,
    colorInterno: PAL.florNocturnaCorazon,
    abre: 'noche',
    plataforma: false,
    nectar: 0.9,
    olor: 1,
    uv: false,
    altura: 'alta', // en el árbol (guamo, sombrío del café)
    visita: ['murcielago'],
  },
  cartel_amarillo: {
    id: 'cartel_amarillo',
    nombre: 'Flor amarilla de cucurbitácea',
    porque: 'Amarilla, grande y abierta temprano: un cartel visible a distancia justo cuando las abejas salen a trabajar.',
    forma: 'campana',
    color: PAL.florCartel,
    colorInterno: PAL.florCartelCorazon,
    abre: 'manana',
    plataforma: true,
    nectar: 0.7,
    olor: 0.4,
    uv: true,
    altura: 'baja', // ahuyama y calabaza: rastreras
    visita: ['apis', 'angelita', 'abejorro'],
  },
  guia_uv: {
    id: 'guia_uv',
    nombre: 'Flor morada con guías de néctar',
    porque: 'Morada con pista de aterrizaje: las abejas ven azul, morado y ULTRAVIOLETA, y esas guías las llevan derecho al néctar.',
    forma: 'plato',
    color: PAL.florUv,
    colorInterno: PAL.florUvGuia,
    abre: 'dia',
    plataforma: true,
    nectar: 0.6,
    olor: 0.5,
    uv: true,
    altura: 'baja',
    visita: ['angelita', 'apis', 'abejorro', 'sirfido'],
  },
  plana_racimo: {
    id: 'plana_racimo',
    nombre: 'Flor plana en racimo',
    porque: 'Plana y agrupada: la mariposa se para cómoda y toma néctar con la trompa sin acrobacias.',
    forma: 'margarita',
    color: PAL.florPlana,
    colorInterno: PAL.florPlanaCorazon,
    abre: 'dia',
    plataforma: true,
    nectar: 0.5,
    olor: 0.3,
    uv: true,
    altura: 'media',
    visita: ['mariposa', 'sirfido', 'angelita', 'apis'],
  },
  robusta_olor: {
    id: 'robusta_olor',
    nombre: 'Flor gruesa y olorosa',
    porque: 'Grande, carnosa y de olor fuerte de día: aguanta que un escarabajo se le meta encima y la maltrate un rato.',
    forma: 'copa',
    color: PAL.florRobusta,
    colorInterno: PAL.florCartelCorazon,
    abre: 'dia',
    plataforma: true,
    nectar: 0.4,
    olor: 0.9,
    uv: false,
    altura: 'baja',
    visita: ['escarabajo', 'apis'],
  },
  pasiflora: {
    id: 'pasiflora',
    nombre: 'Flor de pasiflora',
    porque: 'Grande y complicada, con su corona de filamentos: solo un polinizador FUERTE, como el abejorro, entra bien y mueve el polen. La angelita es muy chiquita para esta.',
    forma: 'corona',
    color: PAL.pasifloraPetalo,
    colorInterno: PAL.pasifloraCorona,
    abre: 'dia',
    plataforma: true,
    nectar: 0.8,
    olor: 0.6,
    uv: true,
    altura: 'media', // en la guía del emparrado
    visita: ['abejorro'], // el titular; la angelita NO alcanza
  },
  melifera_borde: {
    id: 'melifera_borde',
    nombre: 'Flor atractora del borde',
    porque: 'Caléndula, girasol, capuchina: flor rápida y abierta que le da de comer a TODO el mundo cuando el cultivo no está florecido.',
    forma: 'margarita',
    color: PAL.melifera,
    colorInterno: PAL.meliferaSol,
    abre: 'dia',
    plataforma: true,
    nectar: 0.7,
    olor: 0.5,
    uv: true,
    altura: 'media',
    visita: ['angelita', 'apis', 'abejorro', 'mariposa', 'sirfido'],
  },
};

export const SINDROMES_IDS = Object.keys(SINDROMES);

/* -------------------------------------------------------------------------- */
/*  Los POLINIZADORES: quiénes hacen el trabajo                                */
/* -------------------------------------------------------------------------- */

/*
 * Cada uno con: su nombre de verdad, si es nativo, si pica (importa: el miedo a
 * la picadura es lo que frena a la gente a sembrar flores), a qué síndromes va
 * (`visita`) y su CARÁCTER de vuelo — que es lo que lo hace reconocible sin
 * leer una etiqueta:
 *
 *   vel        → velocidad de crucero (u/s)
 *   agilidad   → qué tan rápido corrige rumbo (steering)
 *   bob        → cuánto cabecea al volar (amplitud, u)
 *   bobHz      → cadencia del cabeceo
 *   erratico   → cuánto se desvía sin razón (la mariposa manda aquí)
 *   cierne     → se queda clavado en el aire antes de entrar (colibrí, sírfido)
 *   dardea     → cambia de dirección de golpe, con overshoot (colibrí)
 *   vibra      → POLINIZACIÓN POR VIBRACIÓN: zumba contra la flor para que
 *                suelte el polen de adentro (abejorro — tomate, mortiño)
 *   nocturno   → solo sale de noche (murciélago)
 *   escala     → tamaño relativo del cuerpo (la angelita es DIMINUTA: eso se ve)
 *   carga      → cuánto polen carga por visita (la mariposa carga poquito)
 */
export const POLINIZADORES = {
  angelita: {
    id: 'angelita',
    nombre: 'Abeja angelita',
    cientifico: 'Tetragonisca angustula',
    nativa: true,
    pica: false, // su aguijón está atrofiado: NO PICA. Por eso es la de Chagra.
    social: true,
    anida: 'meliponario',
    dice: 'Nativa, mansa y sin aguijón. La cara de Chagra: hasta un niño se le arrima.',
    visita: ['guia_uv', 'plana_racimo', 'melifera_borde', 'cartel_amarillo'],
    escala: 0.55, // la más chiquita de todas
    caracter: { vel: 1.5, agilidad: 3.4, bob: 0.05, bobHz: 3.2, erratico: 0.25, cierne: 0.15, dardea: 0, vibra: false, nocturno: false, carga: 0.7 },
  },
  apis: {
    id: 'apis',
    nombre: 'Abeja de miel',
    cientifico: 'Apis mellifera',
    nativa: false, // traída de Europa hace siglos; en Colombia, africanizada
    pica: true,
    social: true,
    anida: 'colmena',
    dice: 'Traída de Europa, africanizada aquí: da más miel y SÍ pica. Trabaja duro.',
    visita: ['cartel_amarillo', 'melifera_borde', 'plana_racimo', 'guia_uv', 'robusta_olor'],
    escala: 0.85,
    caracter: { vel: 2.0, agilidad: 3.0, bob: 0.06, bobHz: 2.8, erratico: 0.2, cierne: 0.1, dardea: 0, vibra: false, nocturno: false, carga: 1 },
  },
  abejorro: {
    id: 'abejorro',
    nombre: 'Abejorro',
    cientifico: 'Bombus',
    nativa: true,
    pica: true,
    social: true,
    anida: 'suelo', // anida en el suelo y en la vegetación baja: la quema lo mata
    dice: 'Grande y peludo. Zumba contra la flor para sacarle el polen: eso NADIE más lo hace igual. Sin él, el maracuyá no cuaja.',
    visita: ['pasiflora', 'guia_uv', 'cartel_amarillo', 'melifera_borde'],
    escala: 1.35, // el más grande de los insectos de aquí
    caracter: { vel: 1.6, agilidad: 2.0, bob: 0.11, bobHz: 1.9, erratico: 0.3, cierne: 0.25, dardea: 0, vibra: true, nocturno: false, carga: 1.3 },
  },
  colibri: {
    id: 'colibri',
    nombre: 'Colibrí',
    cientifico: 'Colibri coruscans',
    nativa: true,
    pica: false,
    social: false,
    anida: 'monte',
    dice: 'Mientras toma néctar, carga polen en el pico y la cabeza. Ve el rojo; por eso su flor es roja.',
    visita: ['tubular_rojo'],
    escala: 2.6, // es un ave: al lado de la angelita es un gigante
    caracter: { vel: 5.5, agilidad: 6.0, bob: 0.03, bobHz: 6, erratico: 0.1, cierne: 1, dardea: 1, vibra: false, nocturno: false, carga: 1.1 },
  },
  sirfido: {
    id: 'sirfido',
    nombre: 'Sírfido',
    cientifico: 'Syrphidae',
    nativa: true,
    pica: false, // es una MOSCA disfrazada de abeja: no tiene con qué
    social: false,
    anida: 'monte',
    dice: 'Mosca disfrazada de abeja para que no la molesten. Poliniza de adulta y su larva se come los pulgones: doble favor.',
    visita: ['plana_racimo', 'melifera_borde', 'guia_uv'],
    escala: 0.8,
    caracter: { vel: 2.6, agilidad: 5.0, bob: 0.02, bobHz: 5, erratico: 0.15, cierne: 1, dardea: 0.7, vibra: false, nocturno: false, carga: 0.5 },
  },
  mariposa: {
    id: 'mariposa',
    nombre: 'Mariposa',
    cientifico: 'Lepidoptera',
    nativa: true,
    pica: false,
    social: false,
    anida: 'monte',
    dice: 'Carga menos polen que una abeja, pero si anda tranquila por su finca es buena señal: hay flor y no hay veneno.',
    visita: ['plana_racimo', 'melifera_borde'],
    escala: 1.5,
    caracter: { vel: 1.2, agilidad: 1.4, bob: 0.22, bobHz: 1.5, erratico: 1, cierne: 0.2, dardea: 0, vibra: false, nocturno: false, carga: 0.35 },
  },
  escarabajo: {
    id: 'escarabajo',
    nombre: 'Escarabajo',
    cientifico: 'Coleoptera',
    nativa: true,
    pica: false,
    social: false,
    anida: 'suelo',
    dice: 'Unos dañan hoja, otros polinizan flor grande y olorosa. No todo escarabajo es plaga.',
    visita: ['robusta_olor'],
    escala: 1.1,
    caracter: { vel: 0.8, agilidad: 1.2, bob: 0.04, bobHz: 1.2, erratico: 0.4, cierne: 0, dardea: 0, vibra: false, nocturno: false, carga: 0.6 },
  },
  murcielago: {
    id: 'murcielago',
    nombre: 'Murciélago',
    cientifico: 'Phyllostomidae (nectarívoro)',
    nativa: true,
    pica: false,
    social: true,
    anida: 'monte',
    dice: 'La mayoría NO toca sangre: los nectarívoros trabajan de noche, en las flores grandes y pálidas que huelen fuerte.',
    visita: ['nocturna_pale'],
    escala: 4.2, // el más grande del elenco
    caracter: { vel: 4.2, agilidad: 2.2, bob: 0.3, bobHz: 1.1, erratico: 0.35, cierne: 0.1, dardea: 0, vibra: false, nocturno: true, carga: 1.4 },
  },
};

export const POLINIZADORES_IDS = Object.keys(POLINIZADORES);

/** ¿Este bicho visita este síndrome? (la afinidad ES la enseñanza). */
export const visitaSindrome = (bichoId, sindromeId) =>
  !!POLINIZADORES[bichoId]?.visita.includes(sindromeId);

/** Los bichos que trabajan a esta hora ('dia' | 'noche'). */
export const bichosDe = (momento) =>
  POLINIZADORES_IDS.filter((id) =>
    momento === 'noche' ? POLINIZADORES[id].caracter.nocturno : !POLINIZADORES[id].caracter.nocturno,
  );

/** ¿Esta flor está abierta a esta hora? (la hora es parte del cartel). */
export const florAbierta = (sindromeId, momento) => {
  const s = SINDROMES[sindromeId];
  if (!s) return false;
  return momento === 'noche' ? s.abre === 'noche' : s.abre !== 'noche';
};

/* -------------------------------------------------------------------------- */
/*  Los CULTIVOS: el contraste que enseña                                      */
/* -------------------------------------------------------------------------- */

/*
 * Aquí está la lección entera del mundo, en una tabla. `dependencia` no es un
 * número inventado: es la CATEGORÍA que el corpus sostiene con seguridad.
 *
 *   'alta'      → sin polinizador, la flor se cae sin cuajar (maracuyá, ahuyama)
 *   'mejora'    → se poliniza solo, pero con visita CUAJA MÁS (café)
 *   'beneficia' → mayormente solo; la visita ayuda (mora)
 *   'vibracion' → necesita que lo VIBREN (tomate: abejorro)
 *   'viento'    → no depende de bicho: anemófilo (maíz, trigo, cebada)
 *   'ninguna'   → lo que comemos no sale de la flor (papa: es tubérculo)
 *
 * El maíz es el CONTRAPESO honesto: sobre él NUNCA se teje un hilo, y su polen
 * viaja al viento. Sin ese contraste, "sin abejas se acaba la comida" sería una
 * mentira bonita — y el corpus la matiza expresamente: el maíz, el arroz, el
 * trigo y la papa seguirían dándose. Lo que se pierde es la VARIEDAD.
 */
export const CULTIVOS = {
  maracuya: {
    id: 'maracuya',
    nombre: 'Maracuyá',
    dependencia: 'alta',
    sindrome: 'pasiflora',
    porte: 'guia', // emparrado
    dice: 'Su flor grande necesita un polinizador fuerte. Es el que más sufre si se le van los abejorros.',
    frutoColor: PAL.frutoMaracuya,
  },
  ahuyama: {
    id: 'ahuyama',
    nombre: 'Ahuyama',
    dependencia: 'alta',
    sindrome: 'cartel_amarillo',
    porte: 'rastrera',
    sexos: true, // flor MACHO y flor HEMBRA separadas: alguien tiene que cruzar
    dice: 'Tiene flor macho y flor hembra aparte. Si nadie lleva el polen de una a otra, no hay ahuyama.',
    frutoColor: '#d98a2c',
  },
  cafe: {
    id: 'cafe',
    nombre: 'Café',
    dependencia: 'mejora',
    sindrome: 'guia_uv',
    porte: 'arbusto',
    dice: 'Se poliniza solo, pero cuando hay abejas visitando la floración, cuaja mejor.',
    frutoColor: PAL.cafeGrano,
  },
  maiz: {
    id: 'maiz',
    nombre: 'Maíz',
    dependencia: 'viento',
    sindrome: null, // no tiene flor de cartel: no le ofrece nada a nadie
    porte: 'caña',
    dice: 'No necesita abeja: es de VIENTO. El polen cae de la espiga a la mazorca. Por eso se siembra en bloque.',
    frutoColor: '#e0c060',
  },
};

export const CULTIVOS_IDS = Object.keys(CULTIVOS);

/** ¿Sobre este cultivo se puede tejer red? (el maíz jamás: es de viento). */
export const cultivoNecesitaRed = (id) =>
  ['alta', 'mejora', 'beneficia', 'vibracion'].includes(CULTIVOS[id]?.dependencia);

/*
 * CUAJE: qué fracción de la flor llega a fruto según cuántas visitas recibió
 * (0..1). No es una curva de laboratorio; es la forma de la verdad del corpus:
 * el que depende ARRANCA EN CASI CERO sin visita y sube fuerte con ella; el que
 * mejora arranca alto y sube un poco; el de viento es PLANO — la abeja no lo
 * mueve ni para arriba ni para abajo.
 */
export const CUAJE_BASE = { alta: 0.06, vibracion: 0.15, mejora: 0.68, beneficia: 0.72, viento: 0.9, ninguna: 1 };
export const CUAJE_TECHO = { alta: 0.95, vibracion: 0.92, mejora: 0.9, beneficia: 0.86, viento: 0.9, ninguna: 1 };

/**
 * El cuaje de un cultivo dado el servicio recibido (0..1 = qué tan tejida está
 * su red). El de viento ignora el servicio: su línea es horizontal, y ESE es el
 * punto pedagógico.
 * @param {string} cultivoId
 * @param {number} servicio 0..1
 * @returns {number} 0..1
 */
export function cuajeDe(cultivoId, servicio) {
  const c = CULTIVOS[cultivoId];
  if (!c) return 0;
  const base = CUAJE_BASE[c.dependencia] ?? 0.5;
  const techo = CUAJE_TECHO[c.dependencia] ?? 1;
  if (c.dependencia === 'viento' || c.dependencia === 'ninguna') return base;
  const s = Math.min(1, Math.max(0, servicio));
  // Sube rápido con las primeras visitas y se satura: más abejas de las que la
  // flor necesita no dan más fruta.
  return base + (techo - base) * (1 - Math.exp(-2.6 * s));
}

/* -------------------------------------------------------------------------- */
/*  LA AMENAZA                                                                 */
/* -------------------------------------------------------------------------- */

/*
 * QUÉ FRACCIÓN DEL ENJAMBRE ALCANZA UNA FUMIGADA, SEGÚN LA HORA.
 *
 * El dato más accionable de todo el corpus, y por eso vive en los datos y no
 * enterrado en un componente: la peor hora es la de mayor actividad —la media
 * mañana, con todo el mundo afuera en plena floración—; al atardecer y de noche
 * las colonias están recogidas y el golpe es mucho menor.
 *
 * NO es cero de noche, y esa honestidad importa: el residuo del producto queda
 * en la flor y las alcanza al otro día. Fumigar de noche no es inocuo — es MENOS
 * malo. Prometer inocuidad sería regalarle una licencia a quien igual va a
 * fumigar.
 */
export const DANO_POR_HORA = { dia: 0.82, noche: 0.18 };

/* -------------------------------------------------------------------------- */
/*  VISIÓN DE ABEJA (el modo que lo explica todo de un golpe)                  */
/* -------------------------------------------------------------------------- */

/*
 * "Ver como la abeja": la escena cambia a como lo ve ELLA. Las abejas no ven el
 * rojo — la flor del colibrí se les apaga a un gris pardo, y eso demuestra, sin
 * una sola palabra, por qué esa flor NO es para ellas. En cambio el azul, el
 * morado y el amarillo se encienden, y aparecen las GUÍAS DE NÉCTAR
 * ultravioleta: la pista de aterrizaje que nosotros no vemos.
 *
 * Se implementa gratis: cada flor hornea DOS juegos de color de vértice (el
 * humano y el de abeja) y el modo solo cambia el atributo `color` activo. Cero
 * shaders, cero rebuild, cero costo en gama baja.
 */
export const UV_GUIA = '#f2f4ff'; // la guía como la ve la abeja: casi luz
export const UV_FONDO_ROJO = '#4a4038'; // el rojo, para ella: un pardo apagado

/**
 * Traduce un color humano a "ojo de abeja" (aproximación honesta, no física):
 * el rojo se apaga (no tiene receptor para él), el azul/morado se aviva y el
 * amarillo se sostiene brillante.
 * @param {{r:number,g:number,b:number}} c color lineal 0..1
 * @returns {{r:number,g:number,b:number}}
 */
export function ojoDeAbeja(c) {
  const { r, g, b } = c;
  // Cuánto de este color es rojo puro (lo que ella NO ve).
  const rojez = Math.max(0, r - Math.max(g, b));
  // Lo que sí ve: azul y verde-amarillo, subidos.
  const azul = Math.min(1, b * 1.35);
  const verde = Math.min(1, g * 1.15);
  // El rojo se convierte en oscuridad, no en otro color: se le apaga.
  const rojo = Math.max(0, r - rojez * 0.85) * 0.9;
  const apagon = 1 - rojez * 0.55;
  return { r: rojo * apagon, g: verde * apagon, b: azul * apagon + rojez * 0.06 };
}

/* -------------------------------------------------------------------------- */
/*  Presupuesto por tier                                                       */
/* -------------------------------------------------------------------------- */

/*
 * El ENJAMBRE es instanciado: cada especie es UN InstancedMesh, así que estos
 * números son instancias, no draw-calls. En 'bajo' el mundo NO se apaga: se
 * queda con lo mínimo para que la tesis AÚN se lea — unas cuantas abejas, sus
 * flores, la red y el contraste del maíz. Degradación digna, nunca escena muda.
 */
export const TIER = {
  alto: {
    angelita: 26, apis: 10, abejorro: 7, colibri: 2, sirfido: 5, mariposa: 4, escarabajo: 3, murcielago: 2,
    flores: 78, hilos: 110, hiloPuntos: 12, cajas: 3, polenMotas: 60,
  },
  medio: {
    angelita: 14, apis: 6, abejorro: 4, colibri: 1, sirfido: 3, mariposa: 2, escarabajo: 2, murcielago: 1,
    flores: 44, hilos: 56, hiloPuntos: 8, cajas: 2, polenMotas: 24,
  },
  bajo: {
    angelita: 6, apis: 3, abejorro: 2, colibri: 1, sirfido: 1, mariposa: 1, escarabajo: 0, murcielago: 1,
    flores: 22, hilos: 24, hiloPuntos: 5, cajas: 1, polenMotas: 0,
  },
};

/** El presupuesto del tier (desconocido → frugal, nunca el más caro). */
export const tierDe = (tier) => TIER[tier] || TIER.medio;

/* Factor de detalle geométrico por tier (menos vértices por cuerpo/flor). */
export const CALIDAD = { alto: 1, medio: 0.6, bajo: 0.4 };
export const calidadDe = (tier) => CALIDAD[tier] ?? CALIDAD.medio;

/* -------------------------------------------------------------------------- */
/*  PRNG determinista (misma finca en cada carga; nada de Math.random)         */
/* -------------------------------------------------------------------------- */

/*
 * Propio a este mundo a propósito: `micorrizas.geom.js` y `entQuenua.geom.js`
 * exportan el suyo idéntico, pero acoplarnos a archivos con ramas activas nos
 * ataría a sus refactors. Son ocho líneas: mejor libres.
 */
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
