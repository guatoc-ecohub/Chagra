/*
 * LA SEÑAL DE LOS PERROS GUARDIANES (host DOM → mesh r3f, sin prop-drilling).
 *
 * Parte del cruce 3D↔2D de Dante y Oliver (ver PerroTransicion.jsx). El
 * `<Canvas>` de r3f es OTRO reconciler — un Context de React no lo atraviesa —
 * así que el canal es el mismo store externo mínimo de la abeja
 * (senalSalidaAbeja.js): el overlay DOM avisa "este perro pasó a su forma
 * héroe" y HatoMovil (dentro del canvas) lo escucha donde esté.
 *
 * Modos por perro (clave = raza, porque en el valle hay UN perro por raza):
 *   'normal' — el perro 3D vive su vida (orbita el rebaño, trota, jadea).
 *   'alerta' — AVISA: se planta mirando al monte y ladra (fase 'alerta' de la
 *              escena). Sigue siendo 3D: es la anticipación corporal del cruce.
 *   'oculto' — su forma héroe 2D está activa: el mesh 3D se apaga SECO y el
 *              perro queda CONGELADO donde se transformó — al volver renace en
 *              el mismo punto (continuidad de una sola criatura).
 *
 * Quién escribe: PerroTransicion dispara el swap ('oculto' al nacer el héroe,
 * 'normal' al renacer el perrito) con SU timer — una sola fuente de tiempo.
 * MomentoGuardianes pone/quita 'alerta' y resetea al terminar la escena.
 * Quién lee: HatoMovil vía usePerrosGuardianes() (useSyncExternalStore).
 */
import { useSyncExternalStore } from 'react';

export const RAZAS_GUARDIANES = ['dalmata', 'beagle'];
const MODOS = new Set(['normal', 'alerta', 'oculto']);

const REPOSO = Object.freeze({ dalmata: 'normal', beagle: 'normal', hacia: null });

let estado = REPOSO;
const subs = new Set();

function emitir(sig) {
  estado = Object.freeze(sig);
  subs.forEach((fn) => fn());
}

/** Cambia el modo de UN perro ('dalmata' | 'beagle'). Modo inválido → no-op. */
export function setModoPerro(raza, modo) {
  if (!RAZAS_GUARDIANES.includes(raza) || !MODOS.has(modo)) return;
  if (estado[raza] === modo) return;
  emitir({ ...estado, [raza]: modo });
}

/** Punto [x, z] en coords MUNDO hacia donde miran/ladran en 'alerta'
    (el borde del monte por donde asoma el jaguar/oso). null = no girar. */
export function setAlertaHacia(punto) {
  const hacia = Array.isArray(punto) && punto.length === 2 ? [punto[0], punto[1]] : null;
  emitir({ ...estado, hacia });
}

/** Todo a reposo (fin de la escena, o desmonte del overlay). */
export function resetPerrosGuardianes() {
  if (estado === REPOSO) return;
  emitir(REPOSO);
}

function suscribir(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}
const leer = () => estado;

/** Snapshot reactivo { dalmata, beagle, hacia } — cruza el reconciler de r3f. */
export function usePerrosGuardianes() {
  return useSyncExternalStore(suscribir, leer, leer);
}
