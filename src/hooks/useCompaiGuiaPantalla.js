/**
 * useCompaiGuiaPantalla — la explicación de la pantalla actual, SIEMPRE lista
 * para escribirse en la pizarra.
 *
 * REESCRITO 2026-09-03 (decisión del operador: el texto de explicación de la
 * pantalla SALE EN LA PIZARRA SIEMPRE; regla dura, commit 3233f7f06: la
 * pizarra es el ÚNICO aviso del compai). Este hook NACIÓ como la decisión de
 * una burbuja AUTO-POP (demora, "una vez por sesión", guardas de silencio);
 * ese comportamiento quedó PROHIBIDO y con él su maquinaria: aquí ya no hay
 * timers, ni sessionStorage de "ya vista", ni estados de burbuja. Lo que
 * queda es lo único que la pizarra necesita: la explicación vigente de la
 * pantalla actual según el manifiesto FUENTE ÚNICA `compaiExplicaPantallas`,
 * reactiva al cambio de pantalla.
 *
 * No decide CUÁNDO (eso lo decide el usuario al TOCAR el compai: la pizarra
 * es tap-triggered); solo dice QUÉ. El silencio manual no se consulta: la
 * pizarra no es un aviso que interrumpe, es la ayuda que el usuario pidió.
 *
 * @module hooks/useCompaiGuiaPantalla
 */
import { useMemo } from 'react';
import { explicacionDePantalla } from '../services/compaiExplicaPantallas.js';

/**
 * @param {string|null|undefined} pantalla — currentView del shell.
 * @returns {import('../services/compaiExplicaPantallas.js').ExplicaPantalla|null}
 *   La explicación de la pantalla (titulo/texto/funciones) o null si el
 *   manifiesto no la cubre (mejor callado que inventado).
 */
export default function useCompaiGuiaPantalla(pantalla) {
  return useMemo(() => explicacionDePantalla(pantalla), [pantalla]);
}
