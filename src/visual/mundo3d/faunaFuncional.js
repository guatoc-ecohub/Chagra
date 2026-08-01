/*
 * faunaFuncional — la fauna de cada mundo, poblada por su ROL ECOLÓGICO.
 *
 * Antes la fauna de escena era decorativa (colibrí/mariposa/escarabajo genéricos
 * revoloteando igual en todas partes). Aquí cada mundo puebla los animalitos que
 * de verdad cumplen un ROL en ESE lugar, y el rol MANDA sobre el movimiento
 * (contrato del DR: la escena posee la coreografía, la creature posee el cuerpo):
 *
 *   · polinizador  (colibrí / mariposa / abeja) → va de FLOR EN FLOR: se posa,
 *     liba y salta en arco a la siguiente. Donde hay flor o cosecha con flor.
 *   · controlador  (mariquita / carábido / avispa parasitoide) → PATRULLA en
 *     zigzag buscando plaga. El enemigo natural que cuida la mata sin veneno.
 *   · descomponedor (lombriz / escarabajo estercolero / colémbolo) → REPTA lento
 *     a ras del suelo/hojarasca, cerrando el ciclo de la materia (abono).
 *
 * ES DATA-DRIVEN: la escena no sabe de ecología, solo pide `faunaDeMundo(id)` y
 * anima cada bicho según su `patron` (derivado del rol). La CANTIDAD se recorta
 * por device-tier (`perfilDeTier(tier).criaturas`) — menos individuos en gama
 * baja, siempre POCOS y bien puestos (vida, no enjambre). El vaivén se congela
 * con reduced-motion (eso lo gatea la escena; aquí solo se define el gesto).
 *
 * Contenido ecológico VERIFICADO por el pareo cultivo↔benéfico de la finca andina
 * (mismo criterio que las escenas de sanidad/suelo/milpa). Módulo puro (sin R3F):
 * la math de coreografía la comparten los billboards (FaunaEscena) y las mallas
 * low-poly (la mariquita de sanidad, la avispa de la milpa).
 */

import { perfilDeTier } from './deviceTier.js';

/* Los tres roles y su coreografía. `patron` es la clave que lee `coreografia()`. */
export const ROLES = {
  polinizador: { patron: 'polinizar', que: 'va de flor en flor y poliniza' },
  controlador: { patron: 'patrulla', que: 'patrulla buscando plaga (enemigo natural)' },
  descomponedor: { patron: 'reptar', que: 'repta a ras cerrando el ciclo del abono' },
};

/** El patrón de movimiento que le toca a un rol (desconocido → revoloteo suave). */
export const patronDeRol = (rol) => ROLES[rol]?.patron || 'revoloteo';

/* Onda triangular en [-1, 1], periodo 1: da vueltas con ESQUINAS (cambios de
   rumbo secos) — el zigzag del que patrulla, no la curva suave del que pasea. */
const tri = (x) => 2 * Math.abs(2 * (x - Math.floor(x + 0.5))) - 1;

/* Los puntos-flor que visita el polinizador (offsets relativos al ancla). Un
   ramillete corto: se salta entre ellos en bucle, siempre igual (determinista). */
const FLORES = [
  [0.30, 0.0, 0.12],
  [-0.26, 0.07, -0.16],
  [0.08, 0.13, 0.30],
  [-0.30, 0.02, 0.22],
];

/**
 * CoreografÍa por rol: el offset [dx, dy, dz] (unidades de escena) respecto del
 * ancla, dado el tiempo `t` y una `fase` que desincroniza a cada bicho. Pura y
 * determinista (estable en SSR/tests). Amplitudes chicas: vida, no espectáculo.
 * @param {'polinizar'|'patrulla'|'reptar'|'revoloteo'} patron
 * @param {number} t     segundos (clock.elapsedTime)
 * @param {number} [fase]
 * @returns {[number, number, number]}
 */
export function coreografia(patron, t, fase = 0) {
  if (patron === 'reptar') {
    // descomponedor: anda a ras, avance lento en x con un cabeceo mínimo.
    return [Math.sin(t * 0.4 + fase) * 0.09, Math.abs(Math.sin(t * 1.1 + fase)) * 0.02, 0];
  }

  if (patron === 'patrulla') {
    // controlador: barrido lateral con reversas secas (zigzag) + un vaivén en
    // profundidad desfasado = recorrido en diente de sierra sobre el cultivo,
    // zumbando bajito y alerta (el enemigo natural rastreando la plaga).
    const u = t * 0.22 + fase;
    return [
      tri(u) * 0.34,
      0.03 + Math.abs(Math.sin(t * 4 + fase)) * 0.03,
      tri(u + 0.5) * 0.14,
    ];
  }

  if (patron === 'polinizar') {
    // polinizador: se posa y liba en una flor, luego SALTA en arco a la siguiente.
    const period = 2.4; // segundos por flor (posa + salto)
    const salto = 0.42; // fracción final del ciclo que dura el salto
    const u = t * 0.5 + fase * 0.7;
    const seg = Math.floor(u / period);
    const f = (u % period) / period; // 0..1 dentro del segmento
    let e; // avance hacia la próxima flor: 0 mientras liba, ease al saltar
    if (f < 1 - salto) {
      e = 0;
    } else {
      const g = (f - (1 - salto)) / salto;
      e = g * g * (3 - 2 * g); // easeInOut
    }
    const a = FLORES[seg % FLORES.length];
    const b = FLORES[(seg + 1) % FLORES.length];
    const arco = Math.sin(e * Math.PI) * 0.14; // sube al despegar, baja al posarse
    return [
      a[0] + (b[0] - a[0]) * e,
      a[1] + (b[1] - a[1]) * e + arco + Math.sin(t * 3 + fase) * 0.015,
      a[2] + (b[2] - a[2]) * e,
    ];
  }

  // revoloteo genérico (compat): vuelo suspendido, sube/baja y deriva apenas.
  return [
    Math.sin(t * 0.9 + fase) * 0.12,
    Math.sin(t * 1.7 + fase) * 0.1,
    Math.cos(t * 0.8 + fase) * 0.09,
  ];
}

/*
 * FAUNA FUNCIONAL POR MUNDO. Una entrada por mundo (clave = id de MUNDO); cada
 * bicho declara su ROL (que fija el patrón) y su ancla en coordenadas de escena.
 * Ordenados por PRIORIDAD ecológica (el rol insignia primero): así el recorte por
 * device-tier deja siempre lo que mejor cuenta la lección de ese mundo.
 *
 * Los mundos de arquetipo `cutaway` (suelo · abono · milpa) NO se listan aquí:
 * su fauna funcional la realiza EscenaCutaway de forma procedural y ya es
 * correcta por rol — DESCOMPONEDORES (lombriz de tierra que asoma por el corte +
 * escarabajo estercolero que anda la hojarasca) y, en la milpa, un POLINIZADOR
 * (mariposa en la flor de la calabaza) más un CONTROLADOR (avispa parasitoide
 * que patrulla sobre el maíz cazando el cogollero). Ver ese archivo.
 */
export const FAUNA_MUNDO = {
  // 🐞 SANIDAD — la huerta-clínica: CONTROLADORES que patrullan (el carábido
  //    depredador a ras) + POLINIZADORES en el borde de flores aromáticas. (Las
  //    mariquitas insignia las patrulla EscenaSanidad como malla low-poly.)
  sanidad: [
    { tipo: 'escarabajo', rol: 'controlador', base: [0.28, 0.16, -0.52], size: 28, fase: 2.4, nombre: 'Carábido patrullando' },
    { tipo: 'mariposa', rol: 'polinizador', base: [1.05, 0.66, 0.78], size: 28, fase: 0.4, nombre: 'Mariposa polinizando el borde' },
    { tipo: 'colibri', rol: 'polinizador', base: [-0.85, 1.12, 0.42], size: 30, fase: 1.6, nombre: 'Colibrí polinizador' },
  ],

  // 💧 AGUA — la ribera viva: POLINIZADORES en las flores del monte de ronda y en
  //    la huerta que se riega (el agua sostiene la floración, la flor al benéfico).
  agua: [
    { tipo: 'colibri', rol: 'polinizador', base: [-1.35, 1.75, 0.7], size: 30, fase: 0.4, nombre: 'Colibrí en flores de ribera' },
    { tipo: 'mariposa', rol: 'polinizador', base: [-0.15, 0.98, 0.72], size: 30, fase: 1.6, nombre: 'Mariposa sobre la quebrada' },
    { tipo: 'mariposa', rol: 'polinizador', base: [2.1, 0.35, -0.15], size: 28, fase: 3.0, nombre: 'Mariposa en la huerta regada' },
  ],

  // 🌳 DISEÑO — el bosque comestible por estratos: POLINIZADORES arriba (colibrí
  //    del dosel, mariposa del sotobosque) y un DESCOMPONEDOR en la hojarasca de
  //    la base (el escarabajo que recicla la materia caída). La verticalidad manda.
  disenio: [
    { tipo: 'colibri', rol: 'polinizador', base: [0.6, 3.0, 0.4], size: 28, fase: 0.5, nombre: 'Colibrí del dosel' },
    { tipo: 'mariposa', rol: 'polinizador', base: [-0.9, 1.35, 0.6], size: 30, fase: 2.0, nombre: 'Mariposa del sotobosque' },
    { tipo: 'escarabajo', rol: 'descomponedor', base: [0.8, 0.14, 1.0], size: 30, fase: 1.2, nombre: 'Escarabajo de la hojarasca' },
  ],

  // 🌡️ PISOS — la ladera altitudinal: POLINIZADORES en el aire templado/frío
  //    (donde de veras vuelan). Bases pre-calculadas de pisoY(i)/pisoZ(i) de la
  //    escena: piso 1 (templado) y piso 2 (frío). El páramo va SIN fauna (honestidad).
  pisos: [
    { tipo: 'mariposa', rol: 'polinizador', base: [-0.7, 1.9, 0.4], size: 30, fase: 1.4, nombre: 'Mariposa del piso templado' },
    { tipo: 'colibri', rol: 'polinizador', base: [0.7, 3.05, -0.4], size: 28, fase: 0.6, nombre: 'Colibrí del piso frío' },
  ],

  // ⛅ CLIMA — la bóveda de día: POLINIZADORES cerca de la ladera. De noche no se
  //    siembra fauna (la escena lo gatea con `esDia`).
  clima: [
    { tipo: 'colibri', rol: 'polinizador', base: [2.2, 1.5, 1.4], size: 28, fase: 0.6, nombre: 'Colibrí de la mañana' },
    { tipo: 'mariposa', rol: 'polinizador', base: [-1.7, 0.9, 1.6], size: 30, fase: 2.2, nombre: 'Mariposa de la ladera' },
  ],

  // 🧺 MERCADO — la feria: POLINIZADORES entre las flores del puesto y la cosecha
  //    (recordatorio de que sin polinizador no hay cosecha que vender).
  mercado: [
    { tipo: 'mariposa', rol: 'polinizador', base: [-1.15, 0.7, 0.55], size: 28, fase: 0.5, nombre: 'Mariposa entre las flores del puesto' },
    { tipo: 'colibri', rol: 'polinizador', base: [1.2, 1.15, 0.3], size: 30, fase: 1.8, nombre: 'Colibrí sobre la plaza' },
  ],

  // 🐔 ANIMALES — el corral y su ciclo del abono: un DESCOMPONEDOR insignia (el
  //    escarabajo estercolero que procesa el estiércol, cierra el anillo) +
  //    POLINIZADORES por la cerca (las flores del borde del corral).
  animales: [
    { tipo: 'escarabajo', rol: 'descomponedor', base: [0.36, 0.18, 0.42], size: 30, fase: 0.5, nombre: 'Escarabajo estercolero' },
    { tipo: 'colibri', rol: 'polinizador', base: [-0.7, 1.15, 0.5], size: 30, fase: 1.2, nombre: 'Colibrí del borde' },
    { tipo: 'mariposa', rol: 'polinizador', base: [1.0, 0.62, 0.85], size: 28, fase: 2.6, nombre: 'Mariposa de la cerca' },
  ],
};

/**
 * La fauna funcional de un mundo, con el `patron` de cada bicho ya resuelto desde
 * su rol y la lista RECORTADA al cupo del device-tier (menos individuos en gama
 * baja; gama baja ni monta 3D, así que en la práctica el 3D solo poda en 'medio'
 * si algún mundo trajera más bichos que su presupuesto). Orden = prioridad
 * ecológica, así el recorte deja siempre el rol insignia.
 * @param {string} mundoId  id de MUNDO (p.ej. 'sanidad', 'agua').
 * @param {{ tier?: 'alto'|'medio'|'bajo', cupo?: number }} [opts]
 * @returns {Array<object>} items listos para `<Fauna items=…>` (con `patron`).
 */
export function faunaDeMundo(mundoId, { tier, cupo } = {}) {
  const lista = FAUNA_MUNDO[mundoId] || [];
  const tope = typeof cupo === 'number' ? cupo : perfilDeTier(tier).criaturas;
  const recortada = tope >= lista.length ? lista : lista.slice(0, Math.max(0, tope));
  return recortada.map((f) => ({ ...f, patron: f.patron || patronDeRol(f.rol) }));
}
