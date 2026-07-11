/*
 * hotspotFeedbackConfig — la RECETA del game-feel de los hotspots 3D.
 *
 * Fuente única de tintes, tiempos y presupuestos del kit <HotspotFeedback>
 * (ver HotspotFeedback.jsx). Vive separada del componente por la misma razón
 * que atmosferaMadre vive separada de las escenas: si mañana el toque debe
 * sentirse más rápido o más ámbar, se ajusta AQUÍ y todos los hotspots del
 * juego cambian juntos — el ojo lee "mismo lugar".
 *
 * Tintes: heredan de la PALETA canónica (atmosferaMadre). El acento de señal
 * del juego es el ámbar (nunca rojo catástrofe); la chispa lo aclara hacia
 * blanco para el destello y la onda lo enfría apenas hacia cal para que el
 * anillo no compita con el halo.
 *
 * Presupuestos por tier: mismo contrato que perfilDeTier (deviceTier.js) —
 * desconocido cae a 'medio' (frugal), nunca al caro. 'bajo' normalmente ni
 * monta 3D; si algo lo fuerza, este perfil lo deja digno (solo halo + una
 * onda, cero particulas).
 */
import { PALETA, mezclar } from './atmosferaMadre.js';

/* Los tres tintes del feedback (hex listos para materiales). */
export const TINTE_FEEDBACK = {
  halo: PALETA.ambar, // el aro que respira mientras el hotspot esta activo
  onda: mezclar(PALETA.ambar, PALETA.cal, 0.25), // ripple de expansion
  chispa: mezclar(PALETA.ambar, '#ffffff', 0.4), // destello de confirmacion
};

/* Tiempos del gesto (segundos, salvo indicado). Afinados para leerse como
   "confirmado" sin estorbar: todo el estallido cabe bajo un segundo. */
export const TIEMPOS_FEEDBACK = {
  onda: 0.9, // vida de cada anillo de expansion
  ondaEscalon: 0.14, // desfase entre anillos consecutivos
  chispa: 0.75, // vida del estallido de particulas
  destello: 0.35, // brillo extra del halo justo al tocar (decae exponencial)
  pulsoHz: 0.42, // respiracion del halo activo (ciclos por segundo)
  pulsoAmplitud: 0.06, // cuanto crece/encoge el halo al respirar (fraccion)
};

/* Squash & stretch del pop (envolvente <HotspotPop>): resorte amortiguado
   e^(-k·t)·sin(w·t). Primero aplasta, luego estira con overshoot, y asienta. */
export const POP_FEEDBACK = {
  amplitud: 0.26, // deformacion maxima (fraccion de la escala)
  amortiguacion: 5.5, // k: que tan rapido se calma el resorte
  frecuencia: 17, // w (rad/s): que tan "cartoon" rebota
  duracion: 0.85, // tras esto la escala queda clavada en 1
  ejeCruzado: 0.55, // conservacion de volumen: cuanto compensan X/Z frente a Y
};

/*
 * Presupuesto por device-tier. Claves:
 *   ondas     → anillos del ripple por toque
 *   chispas   → particulas del estallido (0 = sin puntos montados)
 *   segmentos → resolucion de aros/discos (geometria estatica, se paga 1 vez)
 *   aditivo   → blending aditivo (glow); en bajo se apaga (fill-rate minimo)
 */
const PERFIL_FEEDBACK = {
  alto: { ondas: 3, chispas: 18, segmentos: 48, aditivo: true },
  medio: { ondas: 2, chispas: 10, segmentos: 32, aditivo: true },
  bajo: { ondas: 1, chispas: 0, segmentos: 24, aditivo: false },
};

/** El presupuesto de feedback del tier (desconocido → frugal, nunca el caro). */
export const perfilFeedback = (tier) => PERFIL_FEEDBACK[tier] || PERFIL_FEEDBACK.medio;

/*
 * TICK sonoro 0-KB (WebAudio puro, sin asset): una quinta justa ascendente
 * C5→G5 en triangulo con sombra de segunda armonica. Suena a "listo" calido,
 * pariente de la campana/burbuja de useAudioMundo (mismo motor de sintesis,
 * cero muestras). Ganancias bajas a proposito: confirma, no interrumpe.
 */
export const TICK_FEEDBACK = {
  desde: 523.25, // C5
  hasta: 783.99, // G5 (quinta justa: resolucion amable)
  dur: 0.16, // vida total del blip (s)
  ataque: 0.006, // subida del gain (s)
  ganancia: 0.11, // pico del fundamental
  brillo: 0.035, // pico de la 2a armonica (shimmer)
};

/*
 * Motor del tick — vive aqui (modulo plano) y no en el .jsx porque el archivo
 * de componentes solo puede exportar componentes (react-refresh). Un solo
 * AudioContext perezoso para todos los hotspots de la app; se crea recien en
 * el primer toque (que ES un gesto del usuario, asi que la autoplay-policy
 * queda satisfecha). Todo bajo try/catch: si el audio falla, el feedback
 * visual sigue como si nada.
 */
let ctxTick = null;

/** Toca el blip de confirmacion (quinta justa ascendente, ~160 ms). */
export function tocarTickHotspot() {
  try {
    if (typeof window === 'undefined') return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!ctxTick) ctxTick = new AC();
    if (ctxTick.state === 'suspended') ctxTick.resume();

    const { desde, hasta, dur, ataque, ganancia, brillo } = TICK_FEEDBACK;
    const t = ctxTick.currentTime;

    /* Fundamental: triangulo con glide exponencial C5→G5. */
    const osc = ctxTick.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(desde, t);
    osc.frequency.exponentialRampToValueAtTime(hasta, t + dur * 0.6);

    const gan = ctxTick.createGain();
    gan.gain.setValueAtTime(0.0001, t);
    gan.gain.exponentialRampToValueAtTime(ganancia, t + ataque);
    gan.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    /* Sombra de 2a armonica: el shimmer que lo vuelve "campanita", no "beep". */
    const osc2 = ctxTick.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(desde * 2, t);
    osc2.frequency.exponentialRampToValueAtTime(hasta * 2, t + dur * 0.6);

    const gan2 = ctxTick.createGain();
    gan2.gain.setValueAtTime(0.0001, t);
    gan2.gain.exponentialRampToValueAtTime(brillo, t + ataque);
    gan2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.8);

    osc.connect(gan).connect(ctxTick.destination);
    osc2.connect(gan2).connect(ctxTick.destination);
    osc.start(t);
    osc2.start(t);
    osc.stop(t + dur + 0.05);
    osc2.stop(t + dur + 0.05);
  } catch {
    /* silencio digno: el visual confirma solo */
  }
}
