/*
 * kit/atmosfera — la ATMÓSFERA RESUELTA de un mundo, lista para cualquier Canvas.
 *
 * `EscenaBase3D` ya heredaba la hora del valle (ciclo diurno vivo + mezcla 60%
 * hacia la madre) para toda la familia de DIORAMAS. Pero las escenas de "mundo
 * vivo" (bosque, cacao, cafetal, papa, sierra) montan su PROPIO `<Canvas>` y por
 * eso quedaban fuera: cada una clavaba un cielo estático (el páramo gris del
 * bosque, el templado del cafetal) que ni cambia con la hora ni conversa con el
 * valle — entrar a esos mundos se siente como abrir otra app.
 *
 * Este módulo saca la RECETA de EscenaBase3D a una función pura y un hook para
 * que CUALQUIER escena la reciba sin depender del andamiaje de dioramas:
 *
 *   const atm = useAtmosferaMundo({ familia: 'sotobosque', reducedMotion });
 *   // atm.fondo, atm.niebla, atm.cielo, atm.suelo, atm.luz, atm.relleno,
 *   // atm.solPos, atm.intensidad, atm.estrellas, atm.sombra, atm.alfombra
 *
 * Y `<AtmosferaMundo>` (kit/AtmosferaMundo.jsx) lo pinta como los `<color>`,
 * `<fog>` y luces que EscenaBase3D ya usa — mismos multiplicadores, mismo look.
 *
 * `familia` es una de las de `CIELOS` (atmosferaMadre): neutro | agua | tierra |
 * corral | plaza | huerta | sotobosque | ladera | alba. Es el 40% de identidad
 * propia del mundo; el 60% restante lo pone la hora madre del valle.
 */
import { useMemo } from 'react';
import { CIELOS, mezclarCielo } from '../atmosferaMadre.js';
import { presetDeHora } from '../cielosHoraData.js';
import useCicloDia from '../useCicloDia.js';

/**
 * @typedef {object} AtmosferaMundo
 * @property {string} fondo       scene.background.
 * @property {string} cielo       hemisphereLight (bóveda).
 * @property {string} suelo       hemisphereLight (rebote de tierra).
 * @property {string} niebla      color del fog.
 * @property {string} alfombra    tinte de la alfombra de suelo (sombra ancha).
 * @property {string} luz         color del sol/luna (direccional principal + ambiente).
 * @property {string} relleno     color del relleno frío opuesto.
 * @property {string} sombra      tinte de las sombras de contacto.
 * @property {[number,number,number]} solPos  posición del sol (el arco del día).
 * @property {number} intensidad  multiplicador global de la hora (la noche baja todo).
 * @property {number} estrellas   fracción 0..1 del presupuesto de estrellas del tier.
 * @property {string} franja      la franja del día que produjo esta atmósfera.
 */

/**
 * Resuelve la atmósfera de un mundo para una FRANJA dada del día: el cielo propio
 * de la `familia` mezclado 60% hacia la hora madre del valle (la misma receta,
 * `mezclarCielo`, que usa EscenaBase3D) + los campos de LUZ de la hora (sol,
 * relleno, posición, estrellas). Pura salvo el `THREE.Color` interno de
 * `mezclarCielo`; memoícela en quien llama (el hook ya lo hace).
 *
 * @param {string} familia  clave de CIELOS (atmosferaMadre).
 * @param {string} franja   'amanecer'|'manana'|'mediodia'|'tarde'|'atardecer'|'noche'.
 * @returns {AtmosferaMundo}
 */
export function atmosferaDeFamilia(familia, franja) {
  const madre = presetDeHora(franja);
  const c = mezclarCielo(CIELOS[familia], madre);
  return {
    fondo: c.fondo,
    cielo: c.cielo,
    suelo: c.suelo,
    niebla: c.niebla,
    alfombra: c.alfombra,
    intensidad: c.intensidad,
    luz: madre.luz,
    relleno: madre.relleno,
    sombra: madre.sombra,
    solPos: /** @type {[number, number, number]} */ (madre.solPos),
    estrellas: madre.estrellas,
    franja,
  };
}

/**
 * Hook: la atmósfera VIVA de un mundo. Envuelve el reloj del ciclo diurno
 * (`useCicloDia`) y memoíza la resolución por franja — la franja cambia unas
 * pocas veces al día (en `?ciclo=demo`, cada pocos segundos), así que el costo
 * es nulo por frame. El mundo amanece, atardece y anochece CON el valle.
 *
 * @param {object} o
 * @param {string} [o.familia='neutro']  clave de CIELOS.
 * @param {boolean} [o.reducedMotion=false]  apaga el día acelerado del modo demo.
 * @returns {AtmosferaMundo}
 */
export function useAtmosferaMundo({ familia = 'neutro', reducedMotion = false } = {}) {
  const { franja } = useCicloDia({ reducedMotion });
  return useMemo(() => atmosferaDeFamilia(familia, franja), [familia, franja]);
}
