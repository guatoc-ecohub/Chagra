/**
 * laminaIdle — la MÁQUINA IDLE del compAI lámina-viva. Funciones PURAS y
 * DETERMINISTAS (cero `Math.random`, cero DOM, cero three): mismo `t` mismo
 * resultado, igual que el resto de la casa (`creatureIdle.js` de esta misma
 * carpeta, y su puerto `~/demos/3d/compai/idleMachine.js`).
 *
 * DE DÓNDE SALE (reuso, no invento):
 *   - El hash entero determinista y el smoothstep/backOut son el MISMO código
 *     que `creatureIdle.js` (`semillaDe`/`hashU32`/`azar01`/`ventana`).
 *   - El parpadeo (cierra rápido / queda quieto / abre más lento, con
 *     rachas de doble parpadeo por hash) es el MISMO algoritmo de
 *     `~/demos/3d/juegos/chagra-kart/js/piloto-lamina.js` sección 6
 *     («EL PARPADEO»), con los mismos números (CIERRA 0.055 / QUIETO 0.025 /
 *     ABRE 0.09, próximo blink en 1.1s y luego 0.16s el 32% de las veces —
 *     rachas de doble parpadeo — o 1.8+azar·2.4s el resto).
 *   - La respiración + el vaivén de mirada son el mismo par de senos
 *     co-primos de `idleMachine.js` (`respira`/`mira`), con los MISMOS
 *     perfiles por especie (frecuencias/amplitudes) que ese archivo ya trae
 *     para angelita/jaguar/oso/zariguya/luciérnaga/chivito-punk — no se
 *     reinventó el carácter de cada bicho, se re-cableó.
 *
 * QUÉ CAMBIA respecto a `idleMachine.js`: ese devuelve una pose 2D plana
 * (sx,sy,rot,dy) para transformar UN solo dibujo entero. Acá hay DOS capas
 * que se mueven distinto (cuerpo respira, cabeza mira+parpadea+gesticula), así
 * que el contrato de salida es más rico — ver `PoseLamina` abajo.
 *
 * @module visual/creatures/laminaViva/laminaIdle
 */

/* ── determinismo: el mismo hash entero que creatureIdle.js/idleMachine.js ── */

/** Semilla estable por slug (dos compAI nunca sincronizan su parpadeo). */
export function semillaDe(slug) {
  let h = 9;
  const s = String(slug || '');
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
  return h;
}

function hashU32(a, b, c) {
  let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Pseudoazar determinista en [0,1) — mismo contrato que el resto de la casa. */
export function azar01(semilla, id, k) {
  return hashU32(semilla >>> 0, id, k) / 4294967296;
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const clamp01 = (x) => clamp(x, 0, 1);

/* ── perfiles por compAI: frecuencia/amplitud de respiración y mirada — los
   mismos números que `~/demos/3d/compai/idleMachine.js` (IDLE_PERFILES),
   recableados a los 6 slugs con lámina real de este módulo. */
export const PERFILES_LAMINA = {
  angelita: { respira: { freq: 2.0, amp: 0.036, vaiven: 0.31 }, mira: { freq: 0.55, amp: 7 } },
  jaguar: { respira: { freq: 0.85, amp: 0.032, vaiven: 0.21 }, mira: { freq: 0.22, amp: 5 } },
  'oso-baston': { respira: { freq: 1.0, amp: 0.045, vaiven: 0.23 }, mira: { freq: 0.28, amp: 6 } },
  zariguya: { respira: { freq: 1.4, amp: 0.04, vaiven: 0.28 }, mira: { freq: 0.62, amp: 8 } },
  luciernaga: { respira: { freq: 2.3, amp: 0.03, vaiven: 0.4 }, mira: { freq: 0.7, amp: 6 } },
  'chivito-punk': { respira: { freq: 1.55, amp: 0.038, vaiven: 0.33 }, mira: { freq: 0.66, amp: 9 } },
};

const PERFIL_DEFECTO = { respira: { freq: 1.3, amp: 0.038, vaiven: 0.3 }, mira: { freq: 0.5, amp: 7 } };

/** Pose neutra (reduced-motion o sin datos): quieta, digna, en su lugar. */
export const POSE_NEUTRA = Object.freeze({
  sxCuerpo: 1, syCuerpo: 1, rotCabeza: 0, dxCabeza: 0, dyCabeza: 0, blink: 0, energia: 0,
});

/**
 * Vocabulario ancho: los adaptadores `ChagraAgentAvatar*` (contrato viejo
 * 'idle'|'thinking'|'speaking'|'listening') Y los call-sites ricos de
 * Angelita (`acompana`/'escuchando'/'pensando'/'respondiendo'/'contenta'/
 * 'invita'/etc., ver `angelitaEstados.js`) tienen que caer en la MISMA
 * pose-base aquí — CompaiLamina no reimplementa la burbuja/gota/chispas de
 * Angelita.jsx (son overlays SVG dibujados aparte, no parte de la lámina),
 * solo la reacción de cuerpo/cabeza/mirada que SÍ puede expresar.
 */
const CANON_ESTADO = {
  idle: 'base', acompana: 'base', reposo: 'base',
  listening: 'atenta', escuchando: 'atenta',
  thinking: 'pensativa', pensando: 'pensativa', husmea: 'pensativa', 'no-se': 'pensativa',
  speaking: 'animada', respondiendo: 'animada', contenta: 'animada', invita: 'animada', senala: 'animada',
  preocupada: 'atenta',
};

/** Normaliza cualquier token de estado conocido a las 4 familias de reacción. */
export function canonizarEstado(estado) {
  return CANON_ESTADO[estado] || 'base';
}

/**
 * LA MÁQUINA: pose del instante `t` para el compAI `perfil` en la familia de
 * reacción `familia` ('base'|'atenta'|'pensativa'|'animada', ver
 * `canonizarEstado`). Pura y determinista.
 *
 * @param {number} t  segundos de reloj (performance.now()/1000).
 * @param {Object} [opts]
 * @param {string} [opts.perfil='angelita']  slug de PERFILES_LAMINA.
 * @param {number} [opts.semilla]  override (default semillaDe(perfil)).
 * @param {string} [opts.familia='base']
 * @param {boolean} [opts.reducedMotion=false]
 * @returns {{sxCuerpo:number,syCuerpo:number,rotCabeza:number,dxCabeza:number,dyCabeza:number,blink:number,energia:number}}
 */
export function poseDeLamina(t, {
  perfil = 'angelita', semilla, familia = 'base', reducedMotion = false,
} = {}) {
  if (reducedMotion) return POSE_NEUTRA;
  const p = PERFILES_LAMINA[perfil] || PERFIL_DEFECTO;
  const s = (semilla ?? semillaDe(perfil)) >>> 0;

  // RESPIRA — dos ondas que nunca comparten compás (mismo patrón que toda la
  // casa): la escala del CUERPO, siempre activa.
  const resp = Math.sin(t * p.respira.freq) * (1 + 0.35 * Math.sin(t * p.respira.vaiven));
  const sxCuerpo = 1 + p.respira.amp * resp;
  const syCuerpo = 1 - p.respira.amp * 1.3 * resp;

  // MIRA — vaivén continuo de la CABEZA (dos senos co-primos, igual que
  // `miraDeCompai` de idleMachine.js): sin esto, entre gestos, la cabeza
  // queda mirando fijo, como un cartel.
  const miraBase = p.mira.amp * (
    0.65 * Math.sin(t * p.mira.freq + (s % 7))
    + 0.35 * Math.sin(t * p.mira.freq * 0.41 + (s % 11) * 0.7)
  );

  // La familia de reacción gradúa la energía del gesto de cabeza y el sesgo
  // de la mirada — no cambia el MÉTODO (sigue siendo respira+mira+parpadeo),
  // solo la intensidad, igual que el resto del repertorio de la casa.
  let rotCabeza = miraBase;
  let dyCabeza = 0;
  let energia = 0.35; // amplitud del gesto de cabeza que se monta encima de `mira`
  if (familia === 'atenta') {
    // se posa erguida y atenta: ladea un poco hacia el punto de atención,
    // mirada más sostenida (amplitud de vaivén recortada).
    rotCabeza = miraBase * 0.5 + 3.2;
    dyCabeza = -0.012;
    energia = 0.2;
  } else if (familia === 'pensativa') {
    // cabeza ladeada, mirada baja — "repasando" — parpadeo más lento (ver
    // parpadeoDeLamina, cadencia propia por familia).
    rotCabeza = miraBase * 0.6 - 5.5;
    dyCabeza = 0.01;
    energia = 0.22;
  } else if (familia === 'animada') {
    // el gesto más expresivo (celebra/gesticula): bote + cabeceo con
    // overshoot, la reacción-firma del resto del elenco (Zariguya=celebra,
    // Jaguar=celebra, etc.) traducida a lo que la cabeza-lámina puede dar.
    const gesto = Math.sin(t * 3.1 + (s % 5));
    rotCabeza = miraBase * 0.7 + gesto * 9;
    dyCabeza = -0.03 - Math.abs(Math.sin(t * 3.1 + (s % 5) + 0.4)) * 0.02;
    energia = 0.7;
  }

  const dxCabeza = energia * 0.15 * Math.sin(t * 0.9 + (s % 13));

  return {
    sxCuerpo, syCuerpo, rotCabeza, dxCabeza, dyCabeza,
    blink: parpadeoDeLamina(t, { semilla: s, familia }),
    energia,
  };
}

/* ── parpadeo — estado con memoria (no es una función pura de t sola: el
   próximo parpadeo depende de cuándo pasó el último), igual que
   piloto-lamina.js. Se expone como una fábrica que guarda su propio estado
   por instancia — `crearParpadeo()` — así CompaiLamina no reimplementa el
   temporizador y dos instancias del mismo compAI no laten sincronizadas
   (cada una arranca su reloj en su propio primer frame). */

const CIERRA = 0.055;
const QUIETO = 0.025;
const ABRE = 0.09;

/**
 * Fábrica de un temporizador de parpadeo determinista (hash por ciclo, igual
 * que piloto-lamina.js sección 6). Cadencia algo más lenta en familia
 * 'pensativa' (quien repasa memoria parpadea menos) — mismo criterio que
 * `angelitaEstados.js`/`Angelita.jsx` V3 ("pensando entrecierra... escuchando
 * parpadea MENOS").
 * @param {number} semilla
 * @returns {(t:number, familia:string)=>number} devuelve 0..1 (1=cerrado)
 */
export function crearParpadeo(semilla) {
  let tProx = -1;
  let tParp = -1;
  let nParp = 0;
  const hash = (n) => azar01(semilla, 99, n);
  return function parpadeo(t, familia = 'base') {
    const factorEspera = familia === 'pensativa' ? 1.6 : familia === 'atenta' ? 1.3 : 1;
    if (tProx < 0) tProx = t + 1.1;
    if (tParp < 0 && t >= tProx) { tParp = t; nParp += 1; }
    if (tParp < 0) return 0;
    const dp = t - tParp;
    let k;
    if (dp < CIERRA) k = dp / CIERRA;
    else if (dp < CIERRA + QUIETO) k = 1;
    else if (dp < CIERRA + QUIETO + ABRE) k = 1 - (dp - CIERRA - QUIETO) / ABRE;
    else {
      k = 0;
      tParp = -1;
      const h = hash(nParp);
      // uno de cada tres es doble (racha), igual que piloto-lamina.js.
      tProx = t + (h < 0.32 ? 0.16 : (1.8 + h * 2.4) * factorEspera);
    }
    return clamp01(k);
  };
}

/** Standalone sin estado propio — para pruebas puras (misma fórmula, pero
 * recibe el temporizador ya resuelto en vez de guardarlo). Úsese
 * `crearParpadeo()` en producción; esto es solo para tests deterministas de
 * un instante concreto. */
export function parpadeoDeLamina(t, { semilla = 0, familia = 'base' } = {}) {
  // Aproximación pura sin memoria: fase determinista de `t` contra el
  // período esperado — sirve para smoke tests (¿el valor cae en [0,1]?) sin
  // reproducir la máquina de estados completa, que SÍ vive en
  // `crearParpadeo()` (con memoria) para el uso real en CompaiLamina.
  const periodo = familia === 'pensativa' ? 3.4 : familia === 'atenta' ? 3.0 : 2.3;
  const fase = ((t + semilla % 7) % periodo) / periodo;
  if (fase < 0.02) return clamp01(fase / 0.02);
  if (fase < 0.03) return 1;
  if (fase < 0.055) return clamp01(1 - (fase - 0.03) / 0.025);
  return 0;
}

export default {
  semillaDe, azar01, poseDeLamina, crearParpadeo, parpadeoDeLamina, canonizarEstado,
  PERFILES_LAMINA, POSE_NEUTRA,
};
