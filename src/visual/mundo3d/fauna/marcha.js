/*
 * marcha — EL MOTOR DE LOCOMOCIÓN de la fauna realista.
 *
 * El operador fue explícito: no quiere un modelo en T-pose girando, quiere que
 * CAMINEN de verdad. Este módulo es esa exigencia vuelta código. No hay
 * animaciones grabadas ni assets: la marcha se DERIVA de la biología de cada
 * animal (cuántos tiempos tiene su paso, en qué orden apoya, cuánto dura el
 * apoyo, si es plantígrado o digitígrado) y de su velocidad real.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  LA LEY ANTI-PATINAJE (lo único que de verdad hace la diferencia)
 * ─────────────────────────────────────────────────────────────────────────────
 * Un animal 3D se ve falso por UNA razón, casi siempre: los pies resbalan. Se
 * anima el ciclo a un lado y se mueve el cuerpo al otro, y como no coinciden,
 * el bicho patina sobre el suelo como muñeco de feria. La cadencia NO SE ELIGE:
 * sale de la velocidad y la zancada.
 *
 *     frecuencia (ciclos/s) = velocidad / zancada
 *
 * Y durante el APOYO, el pie tiene que quedarse quieto en el mundo: si el
 * cuerpo avanza a `v`, el pie debe correr hacia atrás EN LOCAL exactamente a
 * `v`. De ahí sale la excursión del pie (su barrido adelante-atrás):
 *
 *     zancada  = v · T             (lo que avanza el cuerpo en UN ciclo)
 *     apoyo    = fracción del ciclo con el pie en el suelo (duty factor)
 *     excursión = zancada · apoyo  ← NO es la zancada entera: es la parte del
 *                                    ciclo que el pie pasa plantado
 *
 * Con eso, la velocidad local del pie en apoyo es
 *   excursión / (apoyo · T) = (zancada · apoyo) / (apoyo · T) = zancada / T = v
 * …que cancela EXACTO el avance del cuerpo. El pie queda clavado en el suelo y
 * el cuerpo pasa por encima. Eso — y no el detalle del modelo — es "peso".
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  LO QUE DISTINGUE A UN ANIMAL DE OTRO AL CAMINAR
 * ─────────────────────────────────────────────────────────────────────────────
 *  · EL ORDEN DE APOYO. La danta (y casi todo cuadrúpedo al paso) usa el paso
 *    lateral de 4 tiempos: posterior izq → anterior izq → posterior der →
 *    anterior der. El OSO no: ambla, mueve las dos patas del MISMO lado casi
 *    juntas, y por eso se bambolea. Ese bamboleo no es un adorno de animador:
 *    es la consecuencia de su orden de apoyo. Cambiar cuatro números aquí
 *    convierte un cuadrúpedo genérico en un oso.
 *  · EL DUTY FACTOR. Más apoyo = más lento y más pesado. El acecho del felino
 *    es un paso lateral con el apoyo larguísimo: nunca pierde el suelo.
 *  · LA POSTURA DEL PIE. Plantígrado (oso: pisa con toda la planta),
 *    digitígrado (felinos: camina en los dedos, el talón siempre en el aire),
 *    ungulado (danta: pisa en la pezuña). Es lo que decide dónde va el tobillo.
 *  · QUÉ SE ESTABILIZA. El ungulado cabecea al andar; el felino al acecho
 *    ESTABILIZA la cabeza (es un depredador: los ojos no pueden bailar) y lo
 *    que sube y baja son los omóplatos. Por eso el jaguar lee a jaguar.
 *
 * FUENTE: el corpus de conservación es de CONFLICTO y CONVIVENCIA — no trae ni
 * una medida ni una cadencia (se verificó). La biomecánica de aquí es
 * conocimiento zoológico general, marcado como tal en `faunaEmblematica.js`.
 * Lo que el corpus SÍ aporta y está honrado aquí: el registro directo del
 * felino ("huellas en línea casi recta… pisando con la pata trasera casi en el
 * mismo punto donde pisó la delantera", teacher-conservacion.jsonl:78).
 *
 * Costo: aritmética escalar y un IK de dos huesos por pata. Sin esqueletos,
 * sin skinning, sin GPU. Corre en gama baja.
 */
import * as THREE from 'three';

/* -------------------------------------------------------------------------- */
/*  Utilidades                                                                 */
/* -------------------------------------------------------------------------- */

export const limitar = (v, a, b) => (v < a ? a : v > b ? b : v);
const frac = (v) => v - Math.floor(v);
/** smoothstep: la salida y la llegada del pie, sin tirones. */
const suave = (t) => t * t * (3 - 2 * t);

/* -------------------------------------------------------------------------- */
/*  LAS MARCHAS — cada una es un contrato de apoyos, no un "estilo"           */
/* -------------------------------------------------------------------------- */

/**
 * `desfases`: en qué momento del ciclo (0..1) PLANTA cada pata.
 * `apoyo`: duty factor — fracción del ciclo con el pie en el suelo (>0.5 = paso).
 * `alza/rodada/cabeceo`: la oscilación del cuerpo, en fracción de la alzada.
 * `levante`: cuánto despega el pie en el vuelo, en fracción de la alzada.
 */
export const MARCHAS = {
  /*
   * PASO LATERAL de 4 tiempos — la caminata de casi todo cuadrúpedo.
   * Orden real: posterior izq → anterior izq → posterior der → anterior der.
   * Siempre hay 2 o 3 patas en el suelo: por eso es la marcha de lo pesado.
   */
  pasoLateral: {
    id: 'pasoLateral',
    desfases: { traseraIzq: 0, delanteraIzq: 0.25, traseraDer: 0.5, delanteraDer: 0.75 },
    apoyo: 0.65,
    alza: 0.018,
    rodada: 0.02,
    cabeceo: 0.012,
    levante: 0.1,
    cabezaBalanceo: 0.5, // el ungulado CABECEA al andar
    hombroBomba: 0.25,
  },

  /*
   * AMBLADURA — el paso del OSO (y de todo plantígrado macizo).
   * Las dos patas del mismo lado salen casi juntas (0 y 0.1; 0.5 y 0.6): el
   * peso se tira de un costado al otro y de ahí sale EL BAMBOLEO del oso. Si
   * un oso camina en paso lateral limpio, deja de ser un oso.
   */
  ambladura: {
    id: 'ambladura',
    desfases: { traseraIzq: 0, delanteraIzq: 0.12, traseraDer: 0.5, delanteraDer: 0.62 },
    apoyo: 0.62,
    alza: 0.022,
    rodada: 0.075, // el bamboleo: casi 4x el de la danta
    cabeceo: 0.02,
    levante: 0.12,
    cabezaBalanceo: 0.85, // la cabezota que se mece con el cuerpo
    hombroBomba: 0.45, // la joroba de músculo del hombro del oso
  },

  /*
   * ACECHO FELINO — paso lateral con el apoyo larguísimo (0.78): el gato nunca
   * se queda con menos de tres patas en el suelo, porque cada paso tiene que
   * poder ABORTARSE. Cabeza estabilizada, omóplatos bombeando, registro
   * directo (la trasera pisa la huella de la delantera → la línea recta de
   * huellas que describe el corpus).
   */
  acecho: {
    id: 'acecho',
    desfases: { traseraIzq: 0, delanteraIzq: 0.25, traseraDer: 0.5, delanteraDer: 0.75 },
    apoyo: 0.78,
    alza: 0.01,
    rodada: 0.016,
    cabeceo: 0.006,
    levante: 0.07, // el pie se levanta poco y se posa sin ruido
    cabezaBalanceo: 0.08, // CASI CERO: el depredador estabiliza la mirada
    hombroBomba: 1, // los omóplatos: el gesto entero del acecho
    registroDirecto: true,
  },

  /*
   * TROTECITO CORTO — el roedor grande (borugo) y el felino chico (tigrillo)
   * cuando cruzan un claro: paso lateral rápido, apoyo corto, pasos menudos.
   */
  trotecito: {
    id: 'trotecito',
    desfases: { traseraIzq: 0, delanteraIzq: 0.28, traseraDer: 0.5, delanteraDer: 0.78 },
    apoyo: 0.56,
    alza: 0.035,
    rodada: 0.022,
    cabeceo: 0.03,
    levante: 0.16,
    cabezaBalanceo: 0.4,
    hombroBomba: 0.3,
  },

  /*
   * PASO ESPARRANCADO — el anfibio. Atelopus CAMINA (no salta: es su rareza
   * célebre). Pero camina con los codos y las rodillas ABIERTOS hacia afuera,
   * no debajo del cuerpo: la postura esparrancada del tetrápodo basal. El
   * cuerpo culebrea de lado a lado en vez de bambolearse.
   */
  esparrancado: {
    id: 'esparrancado',
    desfases: { traseraIzq: 0, delanteraIzq: 0.5, traseraDer: 0.5, delanteraDer: 0 },
    apoyo: 0.7,
    alza: 0.02,
    rodada: 0.03,
    cabeceo: 0.02,
    levante: 0.18,
    cabezaBalanceo: 0.15,
    hombroBomba: 0.1,
    culebreo: 0.09, // el eje del cuerpo ondula: el andar del anfibio
  },
};

/* -------------------------------------------------------------------------- */
/*  EL PASO DE UNA PATA                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Dónde está el pie de UNA pata en este instante del ciclo, en coordenadas
 * LOCALES a la cadera/hombro (z+ = adelante, y+ = arriba).
 *
 * @param {number} t        fase del ciclo (0..1), la misma para todo el animal
 * @param {number} desfase  cuándo planta esta pata (de `marcha.desfases`)
 * @param {object} marcha   una de MARCHAS
 * @param {number} zancada  lo que avanza el cuerpo en un ciclo (v · T)
 * @param {number} levante  altura del despegue, en metros
 * @returns {{ apoyada: boolean, z: number, y: number, carga: number, s: number }}
 *          `carga` = cuánto peso lleva esta pata ahora (0..1) — con eso se
 *          bombea el omóplato y se hunde el hombro: la carga se VE.
 *          `s` = progreso dentro de la fase actual (0..1), para el rodar del pie.
 */
export function pasoDePata(t, desfase, marcha, zancada, levante) {
  const p = frac(t - desfase); // 0 = el instante en que planta
  const d = marcha.apoyo;
  /* La excursión: SOLO la parte de la zancada que el pie pasa plantado. Esta
     línea es la ley anti-patinaje (ver cabecera). */
  const excursion = zancada * d;

  if (p < d) {
    /* APOYO: el pie va de adelante hacia atrás a exactamente -v. Queda clavado
       en el mundo; el cuerpo le pasa por encima. */
    const s = p / d;
    return {
      apoyada: true,
      z: excursion * (0.5 - s),
      y: 0,
      carga: Math.sin(Math.PI * s), // entra, aguanta, sale
      s,
    };
  }

  /* VUELO: el pie vuelve adelante. Despega rápido y ATERRIZA SUAVE — por eso
     la altura pica temprano (u^0.8) mientras el avance va con smoothstep. */
  const u = (p - d) / (1 - d);
  return {
    apoyada: false,
    z: excursion * (suave(u) - 0.5),
    y: levante * Math.sin(Math.PI * Math.pow(u, 0.8)),
    carga: 0,
    s: u,
  };
}

/* -------------------------------------------------------------------------- */
/*  LA OSCILACIÓN DEL CUERPO                                                  */
/* -------------------------------------------------------------------------- */

/**
 * El cuerpo no viaja en riel: sube y baja DOS veces por ciclo (una por cada
 * par de apoyos) y rueda UNA vez (una por cada costado). Ese 2:1 es lo que
 * hace que la caminata se lea como caminata y no como deslizamiento.
 *
 * @param {number} t       fase del ciclo (0..1)
 * @param {object} marcha  una de MARCHAS
 * @param {number} alzada  la alzada a la cruz en metros (la escala del animal)
 */
export function balanceoDelCuerpo(t, marcha, alzada) {
  const w = 2 * Math.PI * t;
  return {
    alza: marcha.alza * alzada * Math.sin(2 * w), // 2 por ciclo
    rodada: marcha.rodada * Math.sin(w), // 1 por ciclo: el costado que carga
    cabeceo: marcha.cabeceo * Math.sin(2 * w + Math.PI / 3),
    culebreo: (marcha.culebreo || 0) * Math.sin(w),
  };
}

/* -------------------------------------------------------------------------- */
/*  EL TOBILLO SEGÚN LA POSTURA — plantígrado / digitígrado / ungulado        */
/* -------------------------------------------------------------------------- */

/**
 * Dado el punto de CONTACTO del pie con el suelo, ¿dónde va el tobillo?
 * Esta función es toda la diferencia entre un oso y un jaguar caminando, y no
 * se nota conscientemente: se nota como "ese no es un oso".
 *
 *  · plantígrado — el oso apoya TODA la planta, del talón a los dedos. El
 *    tobillo queda BAJO y ATRÁS (sobre el talón), casi rozando el suelo.
 *  · digitígrado — el felino camina en los dedos: el metatarso va parado y el
 *    talón vive ARRIBA, en el aire. Por eso el gato parece de puntillas.
 *  · ungulado — la danta pisa en la pezuña: el tobillo va alto y casi vertical
 *    sobre el punto de apoyo.
 *
 * El `ancla` NO se elige aquí: viene de `ANCLA_PIE` (anatomiaFauna.geom), que es
 * dónde está de verdad la suela dentro de la geometría del pie. Que el motor y
 * la malla lean el MISMO número es lo que evita el error mudo de todo rig — el
 * animal hundido dos centímetros en el suelo, o flotando encima. Un solo lugar
 * lo dice; los dos lo obedecen.
 *
 * @param {{ y: number, z: number }} ancla  offset del tobillo sobre el contacto,
 *        en fracciones del largo del pie (de ANCLA_PIE[postura])
 * @param {number} pie  largo del pie/metatarso en metros
 * @param {THREE.Vector3} contacto  el punto donde el pie toca (local al cuerpo)
 * @param {THREE.Vector3} salida
 */
export function tobilloDeLaPostura(ancla, pie, contacto, salida) {
  return salida.set(contacto.x, contacto.y + pie * ancla.y, contacto.z + pie * ancla.z);
}

/* -------------------------------------------------------------------------- */
/*  IK DE DOS HUESOS                                                          */
/* -------------------------------------------------------------------------- */

const _eje = new THREE.Vector3();
const _lat = new THREE.Vector3();
const _polo = new THREE.Vector3();

/**
 * Resuelve el codo/rodilla entre `raiz` (hombro/cadera) y `meta` (muñeca/
 * tobillo), con la articulación flexionando hacia `polo`.
 *
 * EL DETALLE ANATÓMICO QUE CASI TODOS LOS RIGS SE COMEN: en un cuadrúpedo, el
 * CODO de la pata delantera apunta hacia ATRÁS y la RODILLA de la trasera
 * apunta hacia ADELANTE. No es simetría: son huesos distintos. Por eso la pata
 * trasera hace su zigzag (rodilla adelante, corvejón atrás) y la delantera no.
 * Aquí eso es un solo signo en `polo` — y es la diferencia entre un cuadrúpedo
 * y una mesa que camina.
 *
 * @param {THREE.Vector3} raiz
 * @param {THREE.Vector3} meta
 * @param {number} largoA   hueso de arriba (fémur / húmero)
 * @param {number} largoB   hueso de abajo (tibia / radio)
 * @param {THREE.Vector3} polo  hacia dónde flexiona (se ortogonaliza solo)
 * @param {THREE.Vector3} salida  la articulación resuelta
 * @param {THREE.Vector3} [metaAjustada]  si se pasa, recibe la meta CLAMPEADA
 *        (cuando la pata no alcanza, para que el hueso no se estire feo)
 */
export function resolverDosHuesos(raiz, meta, largoA, largoB, polo, salida, metaAjustada) {
  _eje.subVectors(meta, raiz);
  let d = _eje.length();
  if (d < 1e-5) {
    salida.copy(raiz).y -= largoA;
    if (metaAjustada) metaAjustada.copy(meta);
    return salida;
  }
  _eje.divideScalar(d);
  /* la pata nunca se estira del todo ni se dobla sobre sí misma */
  d = limitar(d, Math.abs(largoA - largoB) + 1e-4, (largoA + largoB) * 0.999);
  if (metaAjustada) metaAjustada.copy(raiz).addScaledVector(_eje, d);

  /* ley de cosenos: el ángulo en la raíz */
  const cos = limitar((largoA * largoA + d * d - largoB * largoB) / (2 * largoA * d), -1, 1);
  const ang = Math.acos(cos);

  /* el plano de flexión: el polo ortogonalizado contra el eje (Gram-Schmidt) */
  _polo.copy(polo);
  _lat.copy(_polo).addScaledVector(_eje, -_polo.dot(_eje));
  if (_lat.lengthSq() < 1e-8) {
    /* polo paralelo al eje (pata estirada justo hacia el polo): sacamos
       cualquier perpendicular estable en vez de dividir por cero */
    _lat.set(-_eje.y, _eje.x, 0);
    if (_lat.lengthSq() < 1e-8) _lat.set(1, 0, 0);
  }
  _lat.normalize();

  return salida
    .copy(raiz)
    .addScaledVector(_eje, Math.cos(ang) * largoA)
    .addScaledVector(_lat, Math.sin(ang) * largoA);
}

/* -------------------------------------------------------------------------- */
/*  DIBUJAR UN HUESO ENTRE DOS PUNTOS                                          */
/* -------------------------------------------------------------------------- */

const _dir = new THREE.Vector3();
const _abajo = new THREE.Vector3(0, -1, 0);

/**
 * Posa una malla-hueso para que vaya de `desde` a `hasta`.
 *
 * La geometría del hueso se construye colgando del origen hacia -Y con largo
 * `largoBase` (ver `anatomiaFauna.geom.js`); aquí se la orienta y se la estira
 * en Y hasta la distancia REAL. Que el hueso se estire solo es a propósito: la
 * articulación nunca abre un hueco, pase lo que pase con el IK. En un rig que
 * nadie va a poder mirar cuadro a cuadro, lo que se arma bien POR CONSTRUCCIÓN
 * vale más que lo que se ajusta a ojo.
 *
 * @param {THREE.Object3D} malla
 * @param {THREE.Vector3} desde
 * @param {THREE.Vector3} hasta
 * @param {number} largoBase  el largo con que se construyó la geometría
 * @param {number} [grosor]   escala lateral (para afinar/engrosar el hueso)
 */
export function posarHueso(malla, desde, hasta, largoBase, grosor = 1) {
  if (!malla) return;
  malla.position.copy(desde);
  _dir.subVectors(hasta, desde);
  const largo = _dir.length();
  if (largo < 1e-5) return;
  _dir.divideScalar(largo);
  malla.quaternion.setFromUnitVectors(_abajo, _dir);
  malla.scale.set(grosor, largo / largoBase, grosor);
}

/* -------------------------------------------------------------------------- */
/*  LA COLA — movimiento secundario de verdad                                 */
/* -------------------------------------------------------------------------- */

/**
 * Una cadena que PERSIGUE al ancla con retardo. La cola de un felino no se
 * anima con un seno: se arrastra. Cada nodo va hacia donde estaba el anterior
 * y llega tarde — de ahí salen el peso y el latigazo del final, gratis.
 *
 * Uso: crear con `crearCola(n, largo)`, y por frame `moverCola(cola, ancla,
 * dirBase, dt)`, que devuelve los nodos en el espacio del ancla.
 */
export function crearCola(nodos, largoSegmento) {
  return {
    largo: largoSegmento,
    puntos: Array.from({ length: nodos + 1 }, () => new THREE.Vector3()),
    iniciada: false,
  };
}

const _meta = new THREE.Vector3();

/**
 * @param {object} cola      de `crearCola`
 * @param {THREE.Vector3} ancla   la raíz de la cola (local al cuerpo)
 * @param {THREE.Vector3} reposo  hacia dónde cuelga en reposo (unitario)
 * @param {number} dt        delta de tiempo en segundos
 * @param {number} [rigidez] 0 = trapo, 1 = varilla
 */
export function moverCola(cola, ancla, reposo, dt, rigidez = 0.5) {
  const pts = cola.puntos;
  if (!cola.iniciada) {
    /* el primer frame: la cola nace estirada en reposo, no colapsada en un
       punto (si no, el primer cuadro muestra un nudo y después se despliega) */
    for (let i = 0; i < pts.length; i++) {
      pts[i].copy(ancla).addScaledVector(reposo, cola.largo * i);
    }
    cola.iniciada = true;
    return pts;
  }
  pts[0].copy(ancla);
  /* el retardo, independiente del framerate */
  const k = 1 - Math.exp(-(6 + rigidez * 22) * dt);
  for (let i = 1; i < pts.length; i++) {
    _meta.copy(pts[i - 1]).addScaledVector(reposo, cola.largo);
    pts[i].lerp(_meta, k);
    /* y el segmento no se estira: es hueso, no chicle */
    _dir.subVectors(pts[i], pts[i - 1]);
    const l = _dir.length();
    if (l > 1e-5) pts[i].copy(pts[i - 1]).addScaledVector(_dir.divideScalar(l), cola.largo);
  }
  return pts;
}

/* -------------------------------------------------------------------------- */
/*  RECORRER UN CAMINO                                                        */
/* -------------------------------------------------------------------------- */

/** @typedef {THREE.Vector3[] & { _largos?: number[], _total?: number }} SendaConCache
 *  Polilínea con los largos de tramo cacheados en el propio array (ver abajo). */

/**
 * El animal no camina en el vacío: recorre una SENDA. Esto devuelve dónde está
 * y hacia dónde mira, dada la distancia recorrida.
 *
 * `puntos` es una polilínea cerrada (el animal da la vuelta y sigue: el monte
 * no se acaba en el borde del encuadre).
 *
 * @param {SendaConCache} puntosArg
 * @param {number} distancia  metros recorridos desde el arranque
 * @param {THREE.Vector3} posSalida
 * @param {THREE.Vector3} dirSalida
 */
export function andarCamino(puntosArg, distancia, posSalida, dirSalida) {
  const puntos = /** @type {SendaConCache} */ (puntosArg);
  const n = puntos.length;
  /* los largos de cada tramo, cacheados en el propio array (se calcula una vez) */
  if (!puntos._largos) {
    const largos = [];
    let total = 0;
    for (let i = 0; i < n; i++) {
      const l = puntos[(i + 1) % n].distanceTo(puntos[i]);
      largos.push(l);
      total += l;
    }
    Object.defineProperty(puntos, '_largos', { value: largos, enumerable: false });
    Object.defineProperty(puntos, '_total', { value: total, enumerable: false });
  }
  let d = distancia % puntos._total;
  if (d < 0) d += puntos._total;
  let i = 0;
  while (d > puntos._largos[i]) {
    d -= puntos._largos[i];
    i = (i + 1) % n;
  }
  const a = puntos[i];
  const b = puntos[(i + 1) % n];
  const l = puntos._largos[i] || 1;
  posSalida.copy(a).lerp(b, d / l);
  dirSalida.subVectors(b, a).normalize();
  return posSalida;
}
