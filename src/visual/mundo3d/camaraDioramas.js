/*
 * camaraDioramas — ENCUADRES DE DIORAMA por mundo (FASE 4, fotografía).
 *
 * Cada mundo del framework merece su propio "establishing shot": el valle se
 * lee desde arriba como maqueta querida; el café se camina entre surcos a la
 * altura del grano; el mercado se llega a pie, a altura de ojos; el clima se
 * contempla con lente abierto mirando la bóveda. Este módulo es SOLO DATOS
 * (cero three, cero react): la coreografía vive en `CamaraDioramas.jsx`.
 *
 * ── Forma de un encuadre ──────────────────────────────────────────────────
 *   posicion  [x,y,z]  pose FINAL de la cámara (unidades de mundo; las
 *                      escenas viven en escala zoom≈6.5 de EscenaBase3D).
 *   target    [x,y,z]  a dónde mira la cámara en reposo (y el OrbitControls
 *                      hermano, si el host le pasa su ref al componente).
 *   fov       número   ángulo final del lente. Corto (36-40) = tele íntimo,
 *                      abre (46-52) = gran angular de plaza o de cielo.
 *   beat      objeto   el gesto de ENTRADA (un solo beat, cozy, jamás
 *                      montaña rusa):
 *     retiro    factor de retroceso del arranque sobre el eje cámara→target
 *               (1.4 → arranca 40% más lejos y hace dolly-in).
 *     arcoY     radianes de giro alrededor de Y en el arranque: el dolly
 *               dibuja un ARCO lateral, no una recta. Signo = lado.
 *     grua      fracción de la distancia que la cámara arranca MÁS ALTA
 *               (grúa que baja). Negativa = arranca baja y sube (semillero).
 *     lente     factor de apertura inicial del lente (1.12 → ~12% más
 *               abierto al arrancar; se asienta al fov final). 1 = sin gesto.
 *     lambda    velocidad del damp exponencial (THREE.MathUtils.damp):
 *               ~1.6 = llegada larga y contemplativa, ~3 = resuelta.
 *
 * Los siete mundos con fotografía propia están curados abajo; el resto cae a
 * ENCUADRE_DEFECTO (la pose clásica del framework). `resolverEncuadre`
 * entrega siempre un encuadre COMPLETO y ya ajustado por tier.
 *
 * ── Cableo (lo hace Opus, este módulo no toca nada existente) ─────────────
 *   import { resolverEncuadre } from '../camaraDioramas';
 *   import CamaraDioramas from '../CamaraDioramas';
 *   // dentro del <Canvas> de la escena, junto a los OrbitControls:
 *   <CamaraDioramas mundoId={mundoId} tier={tier}
 *     reducedMotion={reducedMotion} controls={controlsRef} />
 *   Nota: CamaraDioramas y CamaraDirector conducen la MISMA cámara — montar
 *   uno u otro por escena, no ambos (este es el sucesor por-mundo de aquel).
 */

/** Beat neutro del framework: dolly-in corto con arco sutil y lente que se asienta. */
export const BEAT_DEFECTO = Object.freeze({
  retiro: 1.4,
  arcoY: -0.12,
  grua: 0.1,
  lente: 1.1,
  lambda: 2.1,
});

/** La pose clásica de EscenaBase3D (zoom 6.5), para mundos sin fotografía propia. */
export const ENCUADRE_DEFECTO = Object.freeze({
  posicion: [3.6, 3.25, 6.5],
  target: [0, 0.7, 0],
  fov: 42,
  beat: BEAT_DEFECTO,
});

/**
 * Encuadres curados por mundoId (los ids son las claves de MUNDO en
 * mundoData.js). Cada uno con su intención fotográfica anotada.
 */
export const ENCUADRES = Object.freeze({
  /* VALLE — plano maestro aéreo 3/4: la finca como maqueta querida. Tele
     suave (38) comprime los planos del valle; la llegada es la más larga de
     todas: se llega al valle, no se aparece en él. */
  valle: {
    posicion: [4.4, 4.8, 8.2],
    target: [0, 0.9, 0],
    fov: 38,
    beat: { retiro: 1.55, arcoY: -0.16, grua: 0.14, lente: 1.12, lambda: 1.6 },
  },

  /* CAFÉ — la LADERA cafetera desde el camino de llegada: se entra subiendo.
     ⚠️ Este encuadre ERA [3.1, 1.9, 5.4] / fov 36 — "cámara baja, a la altura
     del grano". La intención era buena y el resultado, medible y malo: la
     cámara quedaba DENTRO del cafetal, con la copa de un guamo a UN METRO del
     ojo, 0,5% de cielo (cuadro tapiado), el tercio alto 32,8% contra el 0,6%
     del papal —o sea mirando de frente contra la loma— y el cafeto
     protagonista FUERA DE CUADRO. Es el reclamo "la cámara está tan metida
     entre las copas que la de arriba a la izquierda corta la vista".
     Ahora se retira y se levanta: el ojo pasa POR DEBAJO del techo de sombra
     en vez de entre las copas, la ladera se lee entera con sus surcos a curva
     de nivel y el cafeto protagonista entra en cuadro.
     Verificable: `node scripts/diag/encuadre-mundo.mjs cafe --pos 4.2,6.2,13.2
     --mira -1.4,3,-2.5 --fov 40`. */
  cafe: {
    posicion: [4.2, 6.2, 13.2],
    target: [-1.4, 3.0, -2.5],
    fov: 40,
    beat: { retiro: 1.35, arcoY: 0.18, grua: 0.1, lente: 1.1, lambda: 2.0 },
  },

  /* SANIDAD — mirada de inspección: frontal elevada, sobria, sin arco casi.
     Llegada resuelta (lambda alto): aquí se viene a revisar, no a pasear. */
  sanidad: {
    posicion: [2.3, 2.9, 5.6],
    target: [0, 0.8, 0],
    fov: 44,
    beat: { retiro: 1.25, arcoY: -0.06, grua: 0.12, lente: 1.06, lambda: 3.0 },
  },

  /* MERCADO — llegar a la plaza a pie: altura de ojos, gran angular de
     bullicio, grúa casi nula (se entra caminando, no volando). */
  mercado: {
    posicion: [3.5, 1.6, 6.0],
    target: [0, 1.0, 0.2],
    fov: 48,
    beat: { retiro: 1.5, arcoY: -0.18, grua: 0.02, lente: 1.08, lambda: 2.2 },
  },

  /* ANIMALES — al borde del corral: cámara baja y cálida, arco amplio que
     RODEA el recinto antes de asentarse. */
  animales: {
    posicion: [4.1, 1.5, 5.2],
    target: [0, 0.6, 0],
    fov: 42,
    beat: { retiro: 1.4, arcoY: 0.26, grua: 0.06, lente: 1.1, lambda: 1.9 },
  },

  /* SEMILLERO — ternura macro: cerca y en picado suave sobre las bandejas.
     Grúa NEGATIVA: la cámara arranca abajo y SUBE a asomarse, como quien se
     inclina sobre lo recién germinado. */
  semillero: {
    posicion: [2.0, 2.5, 3.6],
    target: [0, 0.4, 0],
    fov: 38,
    beat: { retiro: 1.3, arcoY: -0.1, grua: -0.08, lente: 1.12, lambda: 2.4 },
  },

  /* CLIMA — contemplar la bóveda: lejos y bajo, target alto (se mira el
     cielo), el lente más abierto del set y la llegada más lenta: las nubes
     no corren. Escala pareada con EscenaBoveda ([4.6, 3.1, 8.6]). */
  clima: {
    posicion: [4.6, 2.6, 8.6],
    target: [0, 2.2, 0],
    fov: 50,
    beat: { retiro: 1.35, arcoY: -0.1, grua: -0.05, lente: 1.14, lambda: 1.5 },
  },
});

/** Ids con fotografía curada (útil para tests y para el host). */
export const ENCUADRE_IDS = Object.freeze(Object.keys(ENCUADRES));

/*
 * Ajuste por tier de equipo (deviceTier.js: 'alto' | 'medio' | 'bajo'):
 *  - alto  → el beat completo tal como está curado.
 *  - medio → llegada más corta (lambda +60%) y sin gesto de lente (el cambio
 *            de fov re-proyecta cada frame; en equipos medios no vale el
 *            costo). El encuadre FINAL es idéntico: cero regresión de pose.
 *  - bajo  → sin beat (lambda 0 = señal de "clavar la pose"): normalmente el
 *            host ni monta 3D en bajo (permite3D), pero si llega, respeto.
 */
const AJUSTE_TIER = Object.freeze({
  alto: (beat) => beat,
  medio: (beat) => ({ ...beat, lambda: beat.lambda * 1.6, lente: 1 }),
  bajo: (beat) => ({ ...beat, lambda: 0, lente: 1 }),
});

/**
 * Encuadre completo (posición/target/fov/beat) para un mundo y un tier.
 * Siempre devuelve objeto NUEVO y completo: mundos sin curaduría caen al
 * defecto, beats parciales se completan con BEAT_DEFECTO.
 *
 * @param {string} mundoId  clave de MUNDO (mundoData.js), p. ej. 'cafe'.
 * @param {'alto'|'medio'|'bajo'} [tier]
 * @returns {{ posicion: number[], target: number[], fov: number,
 *             beat: { retiro:number, arcoY:number, grua:number,
 *                     lente:number, lambda:number } }}
 */
export function resolverEncuadre(mundoId, tier = 'alto') {
  const base = ENCUADRES[mundoId] || ENCUADRE_DEFECTO;
  const ajustar = AJUSTE_TIER[tier] || AJUSTE_TIER.alto;
  return {
    posicion: [...base.posicion],
    target: [...base.target],
    fov: base.fov,
    beat: ajustar({ ...BEAT_DEFECTO, ...base.beat }),
  };
}
