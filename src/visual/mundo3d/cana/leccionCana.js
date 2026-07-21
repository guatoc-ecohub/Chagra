/*
 * leccionCana — LOS CINCO PASOS del mundo de la caña, y a dónde mira cada uno.
 *
 * Vive aparte del host (`MundoCana.jsx`) a propósito: aquí no hay React ni
 * WebGL, solo datos y las funciones de geometría del mundo. Así la lección se
 * puede verificar HEADLESS — que ninguna cámara arranque metida dentro de una
 * cepa, que ninguna quede bajo tierra, y que todas caigan dentro de los límites
 * de distancia y de ángulo que OrbitControls va a imponer después. Esas cuatro
 * cosas no se pueden ver leyendo el código, y equivocarse en cualquiera arruina
 * el plano sin dar un solo error.
 *
 * El orden de los pasos es el orden en que pasan las cosas de verdad: la caña
 * en pie → el corte y la molienda → el bagazo que vuelve como leña → la hornilla
 * y sus pailas → las gaveras. Al final de ese camino, una mata de más de cuatro
 * metros terminó siendo un bloque que cabe en la mano.
 *
 * Copy en español de Colombia, en "usted".
 */
import { alturaVega, enTrapiche, pasilloCanaveral } from './floraCana.geom.js';

/* Un punto del cañaveral, a ras de suelo. */
const enElLote = (x, z) => /** @type {[number,number,number]} */ ([x, alturaVega(x, z), z]);

/*
 * El pasillo entre dos surcos por donde se mete la cámara en el primer paso.
 * 1,55 m es la altura de los ojos de una persona parada: desde ahí, y solo
 * desde ahí, se entiende que la caña le pasa por encima.
 *
 * OJO con la x: el surco ONDULA y se sesga, así que el eje de la calle CAMBIA
 * con la profundidad. Se le pide a `pasilloCanaveral(z)`, que sale de las
 * mismas constantes de la siembra — con una x fija la cámara arranca metida
 * dentro de una cepa a los pocos metros.
 */
export const OJOS = 1.55;
const Z_ENTRADA = 6.5;
const Z_FONDO = -6;
const X_ENTRADA = pasilloCanaveral(Z_ENTRADA);
const X_FONDO = pasilloCanaveral(Z_FONDO);

/* Los límites que OrbitControls impone en la escena. Se declaran aquí para que
   el chequeo headless valide contra los MISMOS números que usa la escena. */
export const LIMITES = {
  minDistancia: 5,
  maxDistancia: 34,
  minPolar: 0.28,
  maxPolar: 1.7,
};

export const PASOS = [
  {
    id: 'canaveral',
    kicker: 'Paso 1 de 5 · El cañaveral',
    texto:
      'Métase al surco y mire para arriba: la caña le pasa por encima. Una caña de trapiche madura pasa de los cuatro metros — más de dos veces usted. Fíjese en el tallo: viene por segmentos, con un nudo entre uno y otro, y en cada nudo hay una yema. De un pedazo de tallo con yemas sale la mata siguiente: la caña se siembra de caña, no de semilla.',
    foco: enElLote(pasilloCanaveral(0), 0),
    /* La mira va a 2,6 m: por encima de los ojos (la vista sube ~4°, se siente
       que uno levanta la cabeza) pero SIN quedar tan alta que la cámara caiga
       por debajo del límite polar y el encuadre se enderece solo. Con fov 52, a
       tres metros la caña ya se sale por arriba del cuadro. */
    vista: {
      pos: [X_ENTRADA, alturaVega(X_ENTRADA, Z_ENTRADA) + OJOS, Z_ENTRADA],
      mira: [X_FONDO, 2.6, Z_FONDO],
    },
  },
  {
    id: 'molienda',
    kicker: 'Paso 2 de 5 · La molienda',
    texto:
      'La caña se corta, se despunta y se arruma; y de ahí derecho al molino, porque caña cortada que se demora empieza a fermentar y daña la panela. El molino la pasa entre tres masas que la exprimen. Salen dos cosas: el JUGO, que aquí se llama guarapo, y el BAGAZO, que es la fibra que queda de tanto apretarla.',
    foco: enTrapiche(-4.2, 0, -1.2),
    vista: { pos: [1.2, 2.4, 5.8], mira: [6.3, 1.5, 0.6] },
  },
  {
    id: 'bagazo',
    kicker: 'Paso 3 de 5 · El bagazo',
    texto:
      'Aquí está lo mejor del oficio. El bagazo sale mojado del molino, se apila unas semanas a secar, y seco vuelve a la hornilla como leña. El trapiche se calienta con la misma caña que muele: no le toca comprar combustible ni bajarle un palo al monte. Mire los tres montones y va a ver el mismo bagazo en sus tres momentos.',
    foco: enTrapiche(8.2, 0, 2.0),
    vista: { pos: [22.5, 3.2, 8.0], mira: [17.2, 1.2, 1.8] },
  },
  {
    id: 'hornilla',
    kicker: 'Paso 4 de 5 · La hornilla y las pailas',
    texto:
      'Una sola candela calienta toda la fila. El fuego está en un extremo y la chimenea en el otro, así que cada paila recibe distinto calor: el guarapo entra por la más templada, donde se le retira la CACHAZA — esa espuma verdosa que se lleva la suciedad y que después sirve de abono o de comida para los animales —, y va caminando hacia el fuego mientras se evapora y se vuelve miel. La última, la de al lado de la llama, es la del punteo.',
    foco: enTrapiche(2.3, 0, -1.4),
    vista: { pos: [12.6, 2.6, 6.4], mira: [12.8, 1.5, 0.5] },
  },
  {
    id: 'gaveras',
    kicker: 'Paso 5 de 5 · Las gaveras',
    texto:
      'La miel en su punto se pasa a la batea y se bate: al batirla entra aire, aclara y empieza a granular. Ahí mismo se vacía en las GAVERAS, los moldes de madera, y se deja enfriar. Cuando cuaja se voltea el molde y sale el bloque. De una mata más alta que usted salió algo que cabe en la mano — y eso es todo lo que pasa en un trapiche.',
    foco: enTrapiche(4.3, 0, 2.6),
    vista: { pos: [11.8, 2.2, 9.4], mira: [14.8, 1.2, 4.8] },
  },
];

/* El acento del trapiche para el panel compartido: el ámbar de la miel sobre el
   pardo quemado de la hornilla. */
export const TEMA_PANEL = {
  fondo: 'rgba(30, 17, 9, 0.70)',
  borde: 'rgba(226, 160, 82, 0.30)',
  tinta: '#f6ead6',
  kicker: '#e6b877',
  acentoA: 'rgba(240, 168, 62, 0.95)',
  acentoB: 'rgba(184, 96, 30, 0.95)',
  tintaAccion: '#2a1606',
  activo: '#f0a83e',
};
