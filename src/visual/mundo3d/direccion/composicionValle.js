/*
 * composicionValle — LA DIRECCIÓN DEL VALLE como datos puros (cero three, cero DOM).
 *
 * El valle 3D es la CASA de Chagra: lo primero que ve el campesino y desde
 * donde sale a todo. Este módulo escribe la dirección que antes estaba
 * implícita (o ausente): dónde va cada cosa y POR QUÉ, qué manda y qué
 * acompaña, por dónde camina el ojo. Valle3D lo consume como capa de
 * composición ENCIMA de valleData (que no se toca: otros frentes viven ahí).
 *
 * ── LOS TRES CRITERIOS DEL ENCUADRE ──────────────────────────────────────
 * La cámara de reposo mira desde [10.5, 9, 13.5] hacia [0, 1.6, 1.4]:
 * el frente (+z, tierra caliente) queda CERCA y abajo; la ladera trepa al
 * páramo (-z) al fondo. De ahí las tres franjas de dirección:
 *
 *   1. LO DIARIO, A LA MANO (frente, cerca de la casa): lo que el campesino
 *      toca todos los días — el corral, las eras, el semillero, la huerta.
 *      La finca real es así: el trajín vive alrededor de la casa.
 *   2. LO SEMANAL, A MEDIA LADERA: la milpa, el cafetal, el agua. Se sube
 *      a ellos; el ojo los alcanza sin estorbar el frente.
 *   3. LO CONTEMPLATIVO, AL FONDO: el monte, la veleta en el filo del
 *      páramo. Son horizonte: se miran más de lo que se tocan.
 *
 * ── EL ANCLA: LA CASA ────────────────────────────────────────────────────
 * Toda finca se organiza alrededor de su casa, y el valle no tenía una: el
 * ojo descansaba en pasto vacío. La casa campesina (encalada, zócalo pintado,
 * techo de teja, la ventana con luz cálida) va donde la mirada de reposo
 * aterriza — no es un mundo navegable, es el HOGAR: el punto de silencio
 * del cuadro. Los senderos nacen de ella: el camino dice qué se usa.
 */

/* ── 1. LA CASA (ancla de composición, no navegable) ─────────────────────
   Apenas a la izquierda del punto de mira de reposo ([0, 1.6, 1.4]) para
   componer por tercios: la casa descansa, la quebrada brilla a su derecha,
   y el faro de la alerta queda con aire propio al frente. */
export const CASA_VALLE = {
  pos: [-0.9, 2.6], // [x, z] — la y la da el terreno
  rotY: 0.42, // el corredor mira hacia la cámara de reposo (suroriente)
};

/* ── 2. DISPOSICIÓN COMPUESTA de los lugares ─────────────────────────────
   Override de posición [x, z] por id de mundo. Solo se mueven los que
   estaban puestos sin componer; los bien contados (agua sobre la quebrada,
   la veleta en el filo del páramo, el bosque trepando al frío, el cafetal
   en su piso) se quedan. Reglas duras que cumplen estas coordenadas:
     · aire mínimo ~2 u entre lugares vecinos (los rótulos ya anti-colisionan
       en pantalla; esto compone la GEOMETRÍA, no las etiquetas);
     · cada lugar respeta su piso térmico (valleData.PISOS_TERMICOS);
     · lo diario rodea la casa; las salidas (mercado) van al borde del cuadro. */
export const COMPOSICION_LUGARES = {
  // El corral cierra la esquina izquierda del frente: lo diario, con aire.
  animales: [-5.4, 5.8],
  // El semillero entre el corral y las eras, un paso adelante (se cría cerca).
  semillero: [-3.5, 6.5],
  // Las eras al frente-izquierda de la casa: donde el faro del día se lee solo.
  suelo: [-1.6, 5.0],
  // La huerta ES "la huerta de la casa" (su propia narración): pegada a ella.
  sanidad: [3.4, 4.4],
  // El mercado es LA SALIDA a la plaza: borde derecho-frontal, el camino que
  // se va del cuadro. Antes tapaba el centro-bajo del encuadre.
  mercado: [4.9, 6.3],
  // Los hongos en el corazón cultivado, con aire de la casa y de la milpa.
  micorrizas: [-3.2, 3.7],
  // La milpa cede un paso a la izquierda para darle aire a los hongos.
  cultivos: [-5.2, 2.2],
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

/* ── 3. LOS SENDEROS (la mano del campesino sobre el terreno) ────────────
   Caminos de tierra pisada que NACEN de la casa: el rastro honesto del uso
   diario. No son UI — son el valle contando qué se camina. Waypoints [x, z];
   la y la posa el terreno. `frugal: true` = también en gama media/baja
   (los principales); el resto solo donde sobra GPU. */
export const SENDEROS_VALLE = [
  {
    id: 'trajin', // casa → eras → semillero → corral: el circuito de la mañana
    puntos: [[-0.9, 3.0], [-1.6, 4.6], [-3.3, 6.1], [-5.0, 5.9]],
    frugal: true,
  },
  {
    id: 'plaza', // casa → huerta → mercado → y SALE del cuadro (a la vereda)
    puntos: [[-0.4, 2.9], [1.4, 4.0], [3.2, 4.7], [4.8, 6.2], [6.6, 7.8]],
    frugal: true,
  },
  {
    id: 'milpa', // casa → los hongos → la milpa (la subida del lote)
    puntos: [[-1.3, 2.5], [-3.0, 3.4], [-5.0, 2.4]],
    frugal: false,
  },
  {
    id: 'agua', // casa → la toma de la quebrada (el viaje del balde)
    puntos: [[-0.5, 2.2], [0.5, 1.0], [1.3, 0.1]],
    frugal: false,
  },
];

/* ── 4. LOS PATIOS (tierra pisada bajo cada lugar navegable) ─────────────
   El suelo desnudo donde se trabaja: la señal diegética de "aquí se llega"
   — el sendero desemboca en un patio, el patio sostiene el lugar. Afordancia
   sin UI: se entiende sin leer nada. */
export const PATIO = {
  radioBase: 0.92, // × escala del lugar
  color: '#96703f', // tierra pisada: más clara que el pasto, más viva que el barro
  opacidad: 0.42,
};

/* ── 5. JERARQUÍA DE PERSONAJES (la ley, en números) ─────────────────────
   ANGELITA GUÍA. Es la cara de la IA y la compañera de viaje: vuela en
   primer plano, la cámara la sigue (DirectorValle.follow) y es la única con
   luz propia. Pero el valle NO es solo suyo — feedback del operador
   (2026-07-14): "los personajes como el oso y demás aparecen como
   secundarias a la abejita". Los demás son VECINOS con casa propia: cada uno
   vive en su rincón del valle con presencia digna (escala real, no garnish
   de 30px), y la puesta en escena — no el tamaño de Angelita — dice quién
   guía. Ninguno captura toques: presencia, no interfaz. */
export const JERARQUIA_PERSONAJES = {
  /** La guía del valle: la única con follow de cámara y luz propia. */
  protagonista: 'abeja-angelita',
  /** Tamaño vivo de Angelita (px del billboard; crece con su energía). */
  protagonistaPx: [44, 58],
  /** La luz cálida que la sigue: SOLO ella ilumina (perfil.luzBeacon). */
  luzProtagonista: { color: '#ffdda6', intensidad: 0.85, alcance: 3.6 },
  /** Techo de un vecino (px): puede igualar el piso de Angelita (el oso es
      el mayor de los vecinos), nunca su tamaño pleno ni su primer plano. */
  vecinoMaxPx: 44,
  /** Los vecinos viven en SUS lugares (monte, quebrada, matorral), nunca en
      el centro del encuadre (radio en unidades de mundo alrededor de la mira). */
  radioSagradoCentro: 3.2,
  /** Los vecinos jamás capturan toques ni voz: presencia, no interfaz. */
  interactivos: false,
};

/* ── 6. LOS VECINOS DEL VALLE (la puesta en escena de los personajes) ─────
   Personajes rubber-hose, cada uno EN SU CASA del valle: el oso en el borde
   del monte, la rana en la quebrada, el perezoso en la arboleda. Data-driven
   contra CREATURES: un slug ausente no monta nada (las ramas de personajes
   mejoran el dibujo al mergear y este mapa ni se entera).

   `franjas` = cuándo sale (null = siempre): el borugo es crepuscular y el
   jaguar es un aparecido del amanecer, el atardecer y la niebla — verlo es
   un premio, no un mueble. Eso también es jerarquía: la frecuencia cuenta.

   Ubicaciones verificadas contra la cámara de reposo ([10.5,9,13.5] →
   [0,1.6,1.4], fov 40): todas a la vista, ninguna detrás de la cordillera
   (los picos viven en z≤-15) ni tapada por un lugar compuesto (aire ≥2u del
   mapa COMPOSICION_LUGARES). El precedente de la sierra (3 de 4 árboles
   ocultos tras el macizo) no se repite acá. */
export const VECINOS_VALLE = [
  {
    slug: 'oso-andino',
    punto: [5.4, -1.2], // el borde del monte, junto al bosque que trepa al frío
    px: 44, // el mayor de los vecinos: presencia de verdad, no miniatura
    factor: 9, // presencia del mayor: casi el factor de Angelita (9)
    dy: 0.3,
    franjas: null, // el oso ronda a toda hora
  },
  {
    slug: 'perezoso',
    punto: [3.1, -2.2], // colgado a la falda de la arboleda, detrás del oso
    px: 30,
    factor: 8,
    dy: 1.5, // vive arriba, en las ramas
    franjas: null,
  },
  {
    slug: 'ardilla',
    punto: [3.2, -1.2], // entre el cafetal y el monte, siempre de paso
    px: 26,
    factor: 7.5,
    dy: 0.25,
    franjas: null,
  },
  {
    slug: 'rana-andina',
    punto: [2.4, 2.8], // la orilla baja de la quebrada (el agua es su casa)
    px: 22,
    factor: 6.5,
    dy: 0.18,
    franjas: null,
  },
  {
    slug: 'morrocoy',
    punto: [3.2, 6.8], // la tierra caliente del frente, a paso lento
    px: 26,
    factor: 7,
    dy: 0.2,
    franjas: null,
  },
  {
    slug: 'borugo',
    punto: [-6.4, 0.4], // el matorral del borde izquierdo, a media ladera
    px: 34,
    factor: 8.5,
    dy: 0.25,
    franjas: ['atardecer', 'dorada', 'noche', 'amanecer'], // crepuscular real
  },
  {
    slug: 'jaguar',
    punto: [-5.8, -4.6], // el filo del páramo, lejos, del lado de la veleta: el místico
    px: 40,
    factor: 10, // lejos pero con silueta: verlo tiene que sentirse
    dy: 0.3,
    franjas: ['amanecer', 'atardecer', 'niebla'], // aparecido, no mueble
  },
];
