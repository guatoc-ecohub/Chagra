/*
 * LA SEÑAL DE SALIDA de Angelita (host → mesh, sin prop-drilling).
 *
 * Parte del CRUCE 2D↔3D (ver AbejaTransicion.jsx, sección "CABLEADO EN EL
 * HOST"). Mundo.jsx y EscenaBase3D no se tocan para este cruce, y el `<Canvas>`
 * de r3f es OTRO reconciler (un Context de React no lo atraviesa). El canal es
 * un store externo mínimo (useSyncExternalStore): el host avisa "la abeja
 * sale" al iniciar la vuelta al valle y el mesh (AbejaEscena, dentro del
 * canvas) lo escucha donde esté — vuela al punto de suelta y se apaga en
 * CRUCE_SUELTA_MS, donde el overlay 'volver' la retoma.
 *
 * Se resetea solo al montar la siguiente escena (AbejaEscena lo hace en su
 * mount/unmount) — sin ese reset, la próxima abeja nacería ya "saliendo" y no
 * aparecería nunca. Módulo propio (no dentro de AbejaTransicion.jsx) para que
 * el archivo de componentes quede fast-refresh-limpio.
 */
import { useSyncExternalStore } from 'react';

let salidaSaliendo = false;
const salidaSubs = new Set();

function emitirSalida(v) {
  if (salidaSaliendo === v) return;
  salidaSaliendo = v;
  salidaSubs.forEach((fn) => fn());
}

/** El host la llama al iniciar la vuelta al valle (fase 'regresando'). */
export function avisarSalidaAbeja() {
  emitirSalida(true);
}

/** Limpia la señal (AbejaEscena lo hace sola al montar/desmontar). */
export function resetSalidaAbeja() {
  emitirSalida(false);
}

function suscribirSalida(fn) {
  salidaSubs.add(fn);
  return () => salidaSubs.delete(fn);
}
const leerSalida = () => salidaSaliendo;

/** ¿La abeja del mundo está saliendo? (reactivo; cruza el reconciler de r3f). */
export function useSalidaAbeja() {
  return useSyncExternalStore(suscribirSalida, leerSalida, leerSalida);
}
