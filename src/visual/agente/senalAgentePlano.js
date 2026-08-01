/*
 * LA SEÑAL DEL CRUCE 3D → PLANO del agente (host → puente, sin prop-drilling).
 *
 * Parte del cruce del agente a lo plano (ver AgentePlanoTransicion.jsx). El
 * problema que resuelve: el intercambio de pantallas (hash swap bajo el
 * destello del túnel) DESMONTA al host 3D — un overlay montado por él muere
 * a mitad de vuelo. El canal es un store externo mínimo (useSyncExternalStore,
 * mismo patrón que senalSalidaAbeja.js): el host que zarpa avisa "el agente
 * cruza" y el PUENTE (AgentePlanoPuente, montado en una raíz que persiste —
 * App o la raíz de la vitrina) corre el overlay completo por encima del swap.
 *
 * El puente limpia la señal solo al terminar (onFin) — sin ese reset, el
 * próximo montaje nacería "cruzando" un cruce viejo. Módulo propio (no dentro
 * del componente) para que el archivo de componentes quede
 * fast-refresh-limpio.
 */
import { useSyncExternalStore } from 'react';

/**
 * @typedef {Object} CruceAgentePlano
 * @property {'posar'|'alzar'} sentido
 * @property {{x:number,y:number,width:number,height:number}|null} desde
 * @property {{x:number,y:number,width:number,height:number}|null} hasta
 * @property {string} [animo]
 * @property {number} [energia]
 */

/** @type {CruceAgentePlano|null} */
let cruceActual = null;
const suscriptores = new Set();

function emitir(v) {
  if (cruceActual === v) return;
  cruceActual = v;
  suscriptores.forEach((fn) => fn());
}

/** El host 3D la llama al zarpar hacia una pantalla plana (junto al túnel). */
export function posarAgente({ desde = null, hasta = null, animo = 'sereno', energia = 1 } = {}) {
  emitir({ sentido: 'posar', desde, hasta, animo, energia });
}

/** La pantalla plana la llama al devolver a la persona al mundo 3D. */
export function alzarAgente({ desde = null, hasta = null, animo = 'sereno', energia = 1 } = {}) {
  emitir({ sentido: 'alzar', desde, hasta, animo, energia });
}

/** Apaga el cruce (el puente lo hace solo en su onFin). */
export function limpiarCruceAgente() {
  emitir(null);
}

function suscribir(fn) {
  suscriptores.add(fn);
  return () => suscriptores.delete(fn);
}
const leer = () => cruceActual;

/** El cruce en curso (o null) — reactivo; cruza cualquier swap de pantallas. */
export function useCruceAgentePlano() {
  return useSyncExternalStore(suscribir, leer, leer);
}
