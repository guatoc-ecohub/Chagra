/*
 * regiones — PIVOTES y REGIONES de clip de la zarigüeya trazada (px del
 * espacio 564×889 de la lámina `zariguya-parada-limpia.png`, alineada a alfa
 * en `_zar-work/zariguya-parada-alpha.png` → recortada por trazar-lamina.sh).
 * Mismo propósito que jaguarTrazado/regiones.js: módulo propio para que
 * generar-calco.mjs pueda partir el calco POR REGIÓN sin ciclo de imports.
 *
 * MEDICIÓN (2026-08-25): a diferencia del jaguar (jt-probe.mjs/jt-probe2.mjs,
 * pixel-probe real), esta es la lámina Gemini "-parada-limpia" NUEVA (pose
 * de pie, sin lápiz/brújula — distinta del zariguya.png/gemini-hero previo),
 * así que no había geometría hand-measured previa reusable. Las regiones se
 * midieron a OJO sobre una grilla de 40px (`_zar-work/verificar-regiones.mjs`
 * + overlay renderizado) y se verificaron por render, NO por pixel-probe
 * exacto — son GENEROSAS a propósito (misma convención que el jaguar: donde
 * el borde pasa por aire, recortar de más es gratis; el casquete-calco tapa
 * la costura real). Alcance de ESTE primer rig: cabeza/cuello/orejas/
 * mandíbula/cola articulan; tronco+brazos+piernas quedan en UNA región
 * estática (sin split de patas) — decisión de alcance documentada en el
 * informe de la tarea, no un pixel-probe pendiente.
 */

export const ZT_PIVOTES = Object.freeze({
  columna: [190, 480], // centro de masa del tronco erguido
  cuello: [190, 260], // base del cuello sobre el pecho
  cabeza: [190, 155], // atlas: donde el cráneo articula
  mandibula: [195, 250], // charnela/comisura baja (mentón)
  orejaI: [75, 45], // oreja IZQUIERDA del espectador
  orejaD: [290, 45], // oreja DERECHA del espectador
  colaBase: [200, 730], // raíz: el enroscado junto al tobillo (re-medido, ver fix tearing 2026-08-25)
  colaMedia: [340, 780], // donde el enroscado se endereza hacia afuera
  colaPunta: [490, 780], // el tramo final hacia la curva de la punta
});

export const ZT_REGIONES = Object.freeze({
  /* cabeza: generosa (incluye la banda de las orejas — las orejas van
     encima, layered, con su propio casquete-calco; el solape es a
     propósito, misma convención que jaguarTrazado). Ancho en x extendido
     a -30..410 para CONTENER LOS BIGOTES completos (llegan a x≈390 del lado
     derecho, x≈0 del izquierdo): así giran con la cabeza sin necesitar la
     capa overlay-sin-clip del jaguar (ahí hacía falta porque el trazo de
     bigotes se fragmentaba al cruzar el borde de una región más angosta;
     aquí el propio calco trazado los trae completos dentro de esta caja). */
  cabeza: [[-30, -15], [410, -15], [410, 305], [-30, 305]],
  orejaI: [[10, -15], [140, -15], [140, 95], [10, 95]],
  orejaD: [[225, -15], [360, -15], [360, 95], [225, 95]],
  /* mandíbula: mentón/hocico bajo — el único hueso de boca (lip-sync). */
  mandibula: [[135, 225], [255, 225], [255, 305], [135, 305]],
  /* cuello: banda de transición cabeza↔tronco; solapa ambos a propósito. */
  cuello: [[60, 220], [330, 220], [330, 330], [60, 330]],
  /* tronco: TODO lo demás (pecho/vientre/brazos/piernas) en UNA región
     estática — alcance de este primer rig (ver docstring del módulo).
     Techo en y=280 — SOLAPA (no toca) el borde inferior de `cuello` (y=330):
     el primer intento tocó los bordes exactos (335 vs 330) y dejó una
     RENDIJA de 5px sin ninguna región — el fix de un bug de doble-render
     (ver abajo) creó un agujero real, peor. 50px de solape SÍ es lo que
     hace falta (ni caja llena y=250 → doble-render notorio al girar mucho
     la cabeza, ni borde a borde → hueco); el casquete-calco de cuello/
     cabeza ya tapa la costura real por encima de este solape.
     CON MUESCA donde vive el enroscado de la cola (x125-275,y665-860):
     FIX 2026-08-25 (tearing de cola) — con el tronco como caja llena, el
     enroscado (que vive bboxwise dentro del tronco Y de colaBase) se
     reparte a AMBAS regiones; al rotar colaBase, la copia estática del
     tronco se queda atrás = la cola se "rasga" en dos mitades (visto en
     el GPU-verify a modo="actuando", cola enroscada -38°). La muesca deja
     ese parche a colaBase, que ahora lleva casquete-calco propio (ver
     casqueteCalco('colaBase') en pielTrazado.js) — SIN ese respaldo, la
     muesca sola dejaba un agujero real cuando la cola giraba lejos
     (segundo bug visto en el mismo GPU-verify). */
  troncoCuerpo: [
    [0, 280], [400, 280], [400, 850], [275, 850], [275, 665],
    [125, 665], [125, 850], [0, 850],
  ],
  /* colaBase generosa: cubre TODA la muesca del tronco (110-290×655-855) +
     el enroscado real, para que su propio casquete-calco (que SÍ rota junto
     con ella, a diferencia del tronco) nunca deje un borde sin cubrir. */
  colaBase: [[110, 655], [290, 655], [290, 855], [110, 855]],
  colaMedia: [[260, 730], [430, 730], [430, 830], [260, 830]],
  colaPunta: [[400, 730], [564, 730], [564, 889], [400, 889]],
});
