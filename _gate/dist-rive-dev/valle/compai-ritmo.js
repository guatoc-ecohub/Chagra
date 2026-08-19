// ── compai-ritmo.js — EL 30/70: cuánto actúa y cuánto está quieto ───────────
//
// Encargo del operador (2026-08-07, `ops/SPEC-COMPORTAMIENTO-COMPAI-30-70.md`):
//   «visualmente estén ACTUANDO EL 30% DEL TIEMPO, ya sea explicando o
//    husmeando cosas o sacando mensajes, pero también EL RESTO QUIETOS SIN QUE
//    DEJEN DE SER IMPORTANTES, en las pantallas 2D y 3D.»
//
// Lo difícil es el 70, no el 30. Por eso este módulo no programa "gestos":
// programa **dos estados que se alternan** y deja el 70 en manos de la VIDA DE
// BASE del rig (respirar, parpadear, la cola que no se muere). Un poste que
// espera turno rompe la ilusión más que una animación mala.
//
// ── POR QUÉ EL INTERVALO QUIETO SE CALCULA Y NO SE ESCRIBE A MANO ──────────
// El valle de hoy hace `proxGesto = 7 + rnd*9` con gestos de `2.2 + rnd*1.8`:
// eso da ~21% de actuando, y nadie lo sabía porque nadie lo medía. El número
// salió de la intuición de quien escribió la línea. Aquí el 30% es el
// PARÁMETRO y la pausa es la CONSECUENCIA:
//
//     quieto = actuando · (1 − objetivo) / objetivo
//
// con 0,30 → la pausa dura 2,33 veces el gesto. Y encima va un lazo cerrado
// que mira el acumulado real y estira o acorta la próxima pausa para volver a
// la banda. Sin el lazo, el jitter deriva; con él, una sesión larga aterriza
// en el objetivo aunque cada momento dure lo que quiera.
//
// ── POR QUÉ VIVE AQUÍ Y NO EN `compai/` ────────────────────────────────────
// `compai/` es el NÚCLEO PORTABLE y **el valle nunca es su fuente de verdad**
// (`compai/MANIFIESTO.md`): se copia desde `chagra/src/compai/nucleo/` con
// `scripts/sync-compai-nucleo.mjs`, y un archivo nuevo puesto de este lado
// quedaría huérfano al primer sync. Este módulo es código DEL VALLE que
// CONSUME el núcleo (`./compai/gestos.js`) — misma relación que `portales.js`
// o `marco.js`. El día que se decida subirlo al núcleo, se copia tal cual a
// `chagra/src/compai/nucleo/ritmo.js`: no tiene una sola dependencia fuera de
// `./compai/`, que es justo el invariante que el sync verifica.
//
// Cero DOM, cero three, cero timers propios: se le pide `proximo()` y se le
// entrega el tiempo transcurrido con `avanzar(dt)`. Así el mismo objeto sirve
// al rAF del valle 3D y a un `setTimeout` de una pantalla 2D — que es
// literalmente lo que el spec pide («el mismo núcleo de movimiento en 2D y 3D»).

import { MOMENTOS_IDLE, elegirSinRepetir, duracionDeMomento } from './compai/gestos.js';

/** La proporción que pidió el operador. */
export const OBJETIVO_ACTUANDO = 0.30;

/** La banda que el gate acepta. Fuera de aquí: 60% cansa, 5% está muerto. */
export const BANDA_ACTUANDO = [0.22, 0.38];

/** Cuánto dura un momento de actuar cuando el rig no declara su duración. */
export const DUR_ACTUANDO_S = [2.0, 3.8];

/* El lazo no corrige de golpe: 0 = ignora el error, 1 = lo cancela en una
   pausa (y se ve el tirón). 0,55 lo devuelve a la banda en dos o tres
   momentos sin que se note el volante. */
const GANANCIA = 0.55;
/* Techos duros: ni una pausa eterna ni un tartamudeo. */
const QUIETO_MIN_S = 1.6;
const QUIETO_MAX_S = 26;

/**
 * El medidor. Es la mitad que faltaba: sin número, «30%» es una opinión.
 * Acumula segundos en cada estado y dicta veredicto contra la banda.
 * @param {{banda?:[number,number]}} [opts]
 */
export function crearMedidor({ banda = BANDA_ACTUANDO } = {}) {
  let actuandoS = 0;
  let quietoS = 0;
  return {
    /** @param {boolean} actuando @param {number} dt segundos */
    marcar(actuando, dt) {
      if (!(dt > 0)) return;
      if (actuando) actuandoS += dt; else quietoS += dt;
    },
    reiniciar() { actuandoS = 0; quietoS = 0; },
    get total() { return actuandoS + quietoS; },
    /** @returns {{actuandoS:number,quietoS:number,totalS:number,pct:number,veredicto:'corto'|'en banda'|'largo'|'sin datos'}} */
    resumen() {
      const totalS = actuandoS + quietoS;
      /* Menos de 6 s no dicen nada: un solo gesto ya sesga el porcentaje.
         Decirlo es más honesto que devolver un número que no aguanta. */
      if (totalS < 6) {
        return { actuandoS, quietoS, totalS, pct: totalS ? actuandoS / totalS : 0, veredicto: 'sin datos' };
      }
      const pct = actuandoS / totalS;
      const veredicto = pct < banda[0] ? 'corto' : pct > banda[1] ? 'largo' : 'en banda';
      return { actuandoS, quietoS, totalS, pct, veredicto };
    },
  };
}

/**
 * El planificador. Alterna QUIETO ↔ ACTUANDO y elige qué pose actuar del
 * repertorio que el propio rig declara — el azar de la casa (`elegirSinRepetir`
 * del núcleo), que nunca repite el anterior.
 *
 * @param {object} opts
 * @param {string[]} opts.actuando  poses de ACTUAR que el rig sí tiene.
 * @param {string|null} [opts.quieto]  la pose de reposo digno (null = el rig
 *   se queda en la que ya tiene y su vida de base hace el 70%).
 * @param {number} [opts.objetivo]  proporción de actuando (0..1).
 * @param {() => number} [opts.rand]  fuente de azar inyectable (→ testeable).
 * @param {[number,number]} [opts.durActuando]  segundos, cuando el nombre de
 *   la pose no está en `MOMENTOS_IDLE` del núcleo.
 */
export function crearRitmo({
  actuando = [],
  quieto = null,
  objetivo = OBJETIVO_ACTUANDO,
  rand = Math.random,
  durActuando = DUR_ACTUANDO_S,
} = {}) {
  const obj = Math.min(0.9, Math.max(0.02, objetivo));
  const medidor = crearMedidor();
  let previa = null;
  let estado = 'quieto';
  let restante = 0.9 + rand() * 1.4;   // no arranca actuando: primero se le ve estar
  let pose = quieto;
  /* La duración del gesto EN CURSO. Sin guardarla, la pausa se calculaba con
     `base = 0` y el único freno quedaba en manos del lazo amortiguado, que por
     construcción no llega a cero: el ciclo se estabilizaba en ~40 % en vez de
     30 %. Se vio en el medidor de la página antes de que nadie lo supusiera. */
  let duraEnCurso = 0;

  /** Duración de un momento: la del núcleo si el nombre coincide, si no la de casa. */
  function duracionDe(nombre) {
    if (MOMENTOS_IDLE[nombre]) return duracionDeMomento(nombre, rand) / 1000;
    return durActuando[0] + rand() * (durActuando[1] - durActuando[0]);
  }

  /**
   * La pausa que hace que el acumulado apunte al objetivo. `base` es la
   * fórmula seca; el lazo la corrige con lo que YA pasó en esta sesión.
   */
  function pausaTras(duraGesto) {
    const base = duraGesto * (1 - obj) / obj;
    const r = medidor.resumen();
    let ajuste = 0;
    if (r.totalS >= 6) {
      /* Si vamos actuando de más, la pausa se estira; si de menos, se acorta.
         El error se expresa en segundos de quieto que faltan/sobran para que
         el acumulado (incluyendo este gesto) dé exactamente el objetivo. */
      const actuandoTotal = r.actuandoS + duraGesto;
      const quietoIdeal = actuandoTotal * (1 - obj) / obj;
      ajuste = (quietoIdeal - r.quietoS - base) * GANANCIA;
    }
    const jitter = 0.82 + rand() * 0.36;   // el reloj de una criatura no es de cuarzo
    return Math.min(QUIETO_MAX_S, Math.max(QUIETO_MIN_S, (base + ajuste) * jitter));
  }

  return {
    medidor,
    get estado() { return estado; },
    get pose() { return pose; },
    get actuando() { return estado === 'actuando'; },

    /**
     * Avanza el reloj. Devuelve `null` si no hubo cambio, o el nuevo tramo
     * `{estado, pose, dura}` cuando toca cambiar — el que llama sólo tiene que
     * poner `data-estado` (2D) o disparar la animación del rig (3D).
     * @param {number} dt segundos
     */
    avanzar(dt) {
      medidor.marcar(estado === 'actuando', dt);
      restante -= dt;
      if (restante > 0) return null;
      if (estado === 'actuando') {
        /* La pausa se calcula con la duración REAL del gesto que acaba de
           terminar: ese es el término que fija el 70 %. El lazo solo corrige
           la deriva acumulada, y el medidor ya contabilizó el gesto, así que
           no se cuenta dos veces (ver la cuenta en `pausaTras`). */
        const pausa = pausaTras(duraEnCurso);
        estado = 'quieto'; pose = quieto; restante = pausa; duraEnCurso = 0;
        return { estado, pose, dura: pausa };
      }
      const elegida = elegirSinRepetir(actuando, previa, rand);
      if (!elegida) {
        /* Un rig sin poses de actuar (la zarigüeya trae las suyas horneadas en
           el SVG) no se queda colgado: sigue quieto y lo dice. */
        restante = 3 + rand() * 3;
        return null;
      }
      previa = elegida;
      const dura = duracionDe(elegida);
      estado = 'actuando'; pose = elegida; restante = dura; duraEnCurso = dura;
      return { estado, pose, dura };
    },

    /** Fuerza un momento de actuar ya (un clic, una burbuja, una lección). */
    disparar(nombre) {
      const elegida = nombre || elegirSinRepetir(actuando, previa, rand);
      if (!elegida) return null;
      previa = elegida;
      const dura = duracionDe(elegida);
      estado = 'actuando'; pose = elegida; restante = dura; duraEnCurso = dura;
      return { estado, pose, dura };
    },
  };
}

export default { crearRitmo, crearMedidor, OBJETIVO_ACTUANDO, BANDA_ACTUANDO };
