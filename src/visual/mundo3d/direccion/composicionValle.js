/*
 * composicionValle — LA DIRECCIÓN DEL VALLE como datos puros (cero three, cero DOM).
 *
 * El valle 3D es la CASA de Chagra: lo primero que ve el campesino y desde
 * donde sale a todo. Este módulo escribe la dirección que antes estaba
 * implícita (o ausente): dónde va cada cosa y POR QUÉ, qué manda y qué
 * acompaña, por dónde camina el ojo. Valle3D lo consume como capa de
 * composición ENCIMA de valleData (que no se toca: otros frentes viven ahí).
 *
 * ── REDISEÑO 2026-07 (feedback del operador) ─────────────────────────────
 * "Todo muy pegado; aprovechar mejor el espacio; los animales más regados
 * pero más lejos; nada se vea monocultivo; la casa no se ve como la entrada
 * a los mundos." De ahí las cuatro leyes nuevas de esta composición:
 *
 *   1. EL VALLE RESPIRA: terreno jugable 48×48 (antes 34×34), aire mínimo
 *      ~3 u entre lugares vecinos (antes ~2), cámara de reposo más lejos.
 *   2. LA CASA ES LA PUERTA: deja de ser solo ancla — su puerta iluminada
 *      ABRE el mapa de los mundos (los 6 portales). El corazón Y la boca.
 *   3. SEIS PORTALES LEGIBLES: mis matas · mis animales · el tiempo ·
 *      vender · aprender · toda mi finca — cada uno con su pórtico de
 *      madera, su patio de tierra y su sendero desde la casa.
 *   4. LA FINCA ES POLICULTIVO: potrero con cercas vivas, biofábrica con su
 *      pila (el ciclo estiércol→abono legible), invernadero como micro-mundo,
 *      milpa como parcela viva estilo "granja de Age of Empires".
 *
 * ── LOS TRES CRITERIOS DEL ENCUADRE ──────────────────────────────────────
 * La cámara de reposo mira desde [14.6, 12.2, 18.8] hacia [0, 2.0, 2.0]:
 * el frente (+z, tierra caliente) queda CERCA y abajo; la ladera trepa al
 * páramo (-z) al fondo. De ahí las tres franjas de dirección:
 *
 *   1. LO DIARIO, A LA MANO (frente, cerca de la casa): lo que el campesino
 *      toca todos los días — las eras, el invernadero, la huerta.
 *   2. LO SEMANAL, A MEDIA LADERA: la milpa, el cafetal, el agua, y el
 *      potrero de los animales (más lejos, con su propio aire).
 *   3. LO CONTEMPLATIVO, AL FONDO: el monte, la veleta en el filo del
 *      páramo. Son horizonte: se miran más de lo que se tocan.
 */

/* ── 1. LA CASA (el corazón Y la puerta de los mundos) ───────────────────
   Apenas a la izquierda del punto de mira de reposo ([0, 2.0, 2.0]) para
   componer por tercios: la casa descansa, la quebrada brilla a su derecha.
   Ya NO es solo ancla: su puerta iluminada es NAVEGABLE — tocarla abre el
   mapa de los 6 portales. `escala` la agranda a la medida del valle nuevo. */
export const CASA_VALLE = {
  pos: [-1.4, 3.0], // [x, z] — la y la da el terreno
  rotY: 0.42, // el corredor mira hacia la cámara de reposo (suroriente)
  escala: 1.3, // la casa creció con el valle: sigue mandando el cuadro
};

/* ── 2. DISPOSICIÓN COMPUESTA de los lugares ─────────────────────────────
   Override de posición [x, z] por id de mundo — EL MAPA COMPLETO del valle
   grande. Reglas duras que cumplen estas coordenadas:
     · aire mínimo ~3 u entre lugares vecinos (el valle regado que pidió el
       operador — antes era ~2 u y todo se leía apeñuscado);
     · cada lugar respeta su piso térmico (valleData.PISOS_TERMICOS, ya
       escalados al terreno 48×48);
     · lo diario rodea la casa; el potrero va lejos con su propio llano; las
       salidas (mercado) van al borde del cuadro; el páramo manda arriba. */
export const COMPOSICION_LUGARES = {
  // La milpa-parcela (portal MIS MATAS): media ladera izquierda, clima medio.
  cultivos: [-8.4, 0.8],
  // El potrero (portal MIS ANIMALES): el llano frontal-izquierdo, LEJOS y
  // ancho — los animales regados en sus apartos de cerca viva.
  animales: [-8.6, 8.6],
  // La biofábrica (pila de compost): CERCA del potrero pero DIFERENCIADA —
  // el viaje del estiércol a la pila se lee en un sendero corto.
  abono: [-4.9, 9.6],
  // Las eras al frente-izquierda de la casa: donde el faro del día se lee solo.
  suelo: [-3.6, 6.8],
  // El invernadero (micro-mundo del semillero): entre las eras y el potrero,
  // a la mano de la casa — la matica se cría cerca y el túnel SE VE (corrido
  // del frente de la píldora de la alerta, que le tapaba los arcos).
  semillero: [-6.8, 6.6],
  // Los hongos en el corazón cultivado, con aire de la casa y de la milpa.
  micorrizas: [-5.2, 1.6],
  // La huerta ES "la huerta de la casa": pegada a ella, del lado del sol.
  sanidad: [2.8, 5.6],
  // El mercado (portal VENDER) es LA SALIDA a la plaza: borde derecho-frontal,
  // el camino que se va del cuadro.
  mercado: [8.6, 9.0],
  // El kiosco del saber (portal APRENDER): a la vera del camino de la plaza —
  // el tablero bajo el árbol donde se aprende y se juega.
  aprender: [7.4, 4.2],
  // El cafetal con sombrío: clima medio, subiendo hacia el monte.
  cafe: [6.0, 0.6],
  // El monte (portal TODA MI FINCA): la arboleda trepando al clima frío.
  disenio: [7.2, -4.4],
  // La toma de agua sobre la quebrada, donde el cauce cruza el clima frío.
  agua: [1.0, -2.0],
  // La veleta (portal EL TIEMPO): arriba en el filo del páramo, donde se lee
  // el cielo. Sola, con el horizonte entero para ella.
  clima: [-5.0, -9.4],
};

/**
 * Aplica la disposición compuesta a una lista de mundos del valle
 * (valleData.MUNDOS_VALLE o equivalente). CUALQUIER vista del valle — la
 * escena 3D, el gemelo 2D, el fallback dibujado — debe pasar por aquí para
 * que el mapa sea EL MISMO lugar en todas partes.
 * @template {{ id: string, pos: number[] }} M
 * @param {M[]} mundos
 * @returns {M[]}
 */
export function componerMundos(mundos) {
  return mundos.map((m) => {
    const pos = COMPOSICION_LUGARES[m.id];
    return pos ? { ...m, pos: [pos[0], 0, pos[1]] } : m;
  });
}

/* ── 3. LOS 6 PORTALES (las puertas de la finca) ─────────────────────────
   La promesa del valle en seis puertas legibles: cada portal es un LUGAR
   con pórtico de madera (dos pies derechos + dintel + farolito), su patio
   de tierra pisada y su sendero desde la casa. La puerta de la casa abre
   este mismo mapa como panel. `id` = el mundo del valle que surte el portal. */
export const PORTALES_VALLE = [
  { id: 'cultivos', nombre: 'Mis matas', emoji: '🌱' },
  { id: 'animales', nombre: 'Mis animales', emoji: '🐄' },
  { id: 'clima', nombre: 'El tiempo', emoji: '⛅' },
  { id: 'mercado', nombre: 'Vender', emoji: '🧺' },
  { id: 'aprender', nombre: 'Aprender', emoji: '📖' },
  { id: 'disenio', nombre: 'Toda mi finca', emoji: '🌳' },
];

/* ── 4. LOS SENDEROS (la mano del campesino sobre el terreno) ────────────
   Caminos de tierra pisada que NACEN de la casa: el rastro honesto del uso
   diario. Cada PORTAL tiene su sendero (la puerta se camina, no se adivina);
   el ramal potrero→pila cuenta el ciclo estiércol→abono. Waypoints [x, z];
   la y la posa el terreno. `frugal: true` = también en gama media/baja
   (los seis del portal + el ciclo del abono); el resto solo donde sobra GPU. */
export const SENDEROS_VALLE = [
  {
    id: 'trajin', // casa → eras → invernadero → potrero: el circuito de la mañana
    puntos: [[-1.4, 3.4], [-3.4, 6.4], [-6.2, 6.4], [-7.8, 7.6], [-8.4, 8.4]],
    frugal: true,
  },
  {
    id: 'abono', // potrero → la pila: el viaje del estiércol al abono
    puntos: [[-7.4, 9.0], [-6.2, 9.5], [-5.2, 9.6]],
    frugal: true,
  },
  {
    id: 'plaza', // casa → huerta → el kiosco → mercado → y SALE del cuadro
    puntos: [[-0.9, 3.3], [1.2, 4.4], [2.8, 5.2], [5.2, 4.8], [7.3, 5.4], [8.4, 8.6], [9.6, 11.8]],
    frugal: true,
  },
  {
    id: 'milpa', // casa → los hongos → la milpa (la subida del lote)
    puntos: [[-1.9, 2.9], [-4.6, 1.8], [-6.8, 1.0], [-8.2, 0.8]],
    frugal: true,
  },
  {
    id: 'monte', // casa → cafetal → el monte (toda mi finca)
    puntos: [[-1.0, 2.4], [2.0, 1.4], [5.4, 0.6], [6.8, -2.2], [7.2, -4.2]],
    frugal: true,
  },
  {
    id: 'paramo', // casa → la veleta: la subida al filo donde se lee el cielo
    puntos: [[-1.8, 2.4], [-3.0, -1.0], [-3.8, -4.6], [-4.6, -7.6], [-5.0, -9.2]],
    frugal: true,
  },
  {
    id: 'agua', // casa → la toma de la quebrada (el viaje del balde)
    puntos: [[-0.8, 2.2], [0.2, 0.4], [0.9, -1.6]],
    frugal: false,
  },
];

/* ── 5. LOS PATIOS (tierra pisada bajo cada lugar navegable) ─────────────
   El suelo desnudo donde se trabaja: la señal diegética de "aquí se llega"
   — el sendero desemboca en un patio, el patio sostiene el lugar. Afordancia
   sin UI: se entiende sin leer nada. */
export const PATIO = {
  radioBase: 1.0, // × escala del lugar (creció con el valle)
  color: '#96703f', // tierra pisada: más clara que el pasto, más viva que el barro
  opacidad: 0.42,
};

/* ── 6. JERARQUÍA DE PERSONAJES (la ley, en números) ─────────────────────
   ANGELITA GUÍA — y es UNA SOLA (feedback 2026-07-16: se veían tres
   abejitas; las laterales las quita el dueño del dashboard). La del valle
   es la central: MÁS GRANDE que antes (se veía diminuta), en POSICIÓN DE
   CALMA sobre el corredor de la casa (no husmeando errática), con su luz
   propia que invita a tocarla. Los demás son VECINOS con casa propia: cada
   uno vive en su rincón del valle con presencia digna, y la puesta en
   escena — no el tamaño de Angelita — dice quién guía. */
export const JERARQUIA_PERSONAJES = {
  /** La guía del valle: la única con follow de cámara y luz propia. */
  protagonista: 'abeja-angelita',
  /** Tamaño vivo de Angelita (px del billboard; crece con su energía).
      Subido de [44,58]: en el valle grande se leía diminuta. */
  protagonistaPx: [58, 76],
  /** La luz cálida que la sigue: SOLO ella ilumina (perfil.luzBeacon). */
  luzProtagonista: { color: '#ffdda6', intensidad: 1.0, alcance: 4.2 },
  /** Techo de un vecino (px): nunca el tamaño pleno ni el primer plano
      de Angelita. */
  vecinoMaxPx: 44,
  /** Los vecinos viven en SUS lugares (monte, quebrada, matorral), nunca en
      el centro del encuadre (radio en unidades de mundo alrededor de la mira). */
  radioSagradoCentro: 4.0,
  /** Los vecinos jamás capturan toques ni voz: presencia, no interfaz.
      (Angelita SÍ: tocarla es hablarle a la finca — ella es la interfaz.) */
  interactivos: false,
};

/* ── 7. LOS VECINOS DEL VALLE (la puesta en escena de los personajes) ─────
   Personajes rubber-hose, cada uno EN SU CASA del valle: la rana en la
   quebrada, el perezoso en la arboleda, el jaguar en el filo. Data-driven
   contra CREATURES: un slug ausente no monta nada (las ramas de personajes
   mejoran el dibujo al mergear y este mapa ni se entera).

   `franjas` = cuándo sale (null = siempre): el jaguar es un aparecido del
   amanecer, el atardecer y la niebla — verlo es un premio, no un mueble.

   Ubicaciones al día con el VALLE GRANDE (cámara de reposo [14.6,12.2,18.8]
   → [0,2,2], fov 40): todas a la vista, ninguna detrás de la cordillera
   (los picos viven en z≤-21) ni pisando un lugar compuesto (aire ≥3 u del
   mapa COMPOSICION_LUGARES). */
export const VECINOS_VALLE = [
  // NOTA (rediseño 2026-07): el oso rubber-hose café se RETIRÓ del valle por
  // decisión del operador. Este slot de ancla ([7.8, -2.0], px≈44) queda
  // reservado para el CÓNDOR (Vultur gryphus, en curso en el pase de arte):
  // planea alto sobre el filo — presencia diurna del páramo.
  {
    slug: 'perezoso',
    punto: [4.8, -3.2], // colgado a la falda de la arboleda del monte
    px: 30,
    factor: 8,
    dy: 1.5, // vive arriba, en las ramas
    franjas: null,
  },
  {
    slug: 'ardilla',
    punto: [4.4, -1.4], // entre el cafetal y el monte, siempre de paso
    px: 26,
    factor: 7.5,
    dy: 0.25,
    franjas: null,
  },
  {
    slug: 'rana-andina',
    punto: [3.4, 3.0], // la orilla baja de la quebrada (el agua es su casa)
    px: 22,
    factor: 6.5,
    dy: 0.18,
    franjas: null,
  },
  {
    slug: 'morrocoy',
    punto: [4.8, 8.2], // la tierra caliente del frente, a paso lento
    px: 26,
    factor: 7,
    dy: 0.2,
    franjas: null,
  },
  {
    slug: 'jaguar',
    punto: [-8.6, -7.2], // el filo del páramo, lejos, del lado de la veleta: el místico
    px: 40,
    factor: 10, // lejos pero con silueta: verlo tiene que sentirse
    dy: 0.3,
    franjas: ['amanecer', 'atardecer', 'niebla'], // aparecido, no mueble
  },
];
