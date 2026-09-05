/*
 * luzSierra — la LUZ y el AIRE propios de la vista global de la Sierra.
 *
 * Por qué la Sierra no hereda `ATMOSFERA` tal cual (FABLE-SIERRA-ESTETICA-20260905):
 * la hora dorada compartida está armada para dioramas de finca a treinta metros
 * —domo dorado, ambiente cálido, sol dorado y niebla ocre—. Medida en la Sierra
 * (2026-09-05, GPU real, `paquete-fable-sierra-20260905/tabla-colores.txt`), esa
 * lámpara multiplica el canal AZUL por ≈0,57 y el ROJO por ≈0,97: 2,42 de
 * intensidad cálida contra 0,28 de fría, más niebla ocre encima. Todo lo
 * azul-gris de la tabla canónica —superpáramo, páramo, bosque de niebla, roca,
 * aire lejano y el propio mar Caribe— salía CAQUI. El síntoma medido: cuatro
 * bandas contables de siete, y el mar en rgb(56,98,73).
 *
 * Lo que la física de una hora dorada de verdad hace, y que aquí se restituye:
 *   · el SOL bajo es cálido, y sigue siéndolo (misma dirección que `SolDorado`);
 *   · el CIELO que rellena las sombras es AZUL, no dorado: sólo cerca del sol
 *     el domo se entibia. Y a cuarenta kilómetros de un macizo, en el trópico
 *     húmedo, el aire entre el ojo y la ladera es azul-gris (perspectiva
 *     aérea), no ocre;
 *   · la bruma de distancia es del color del cielo: lo lejano pierde contraste
 *     y azulea, que es como una cordillera se lee como cordillera.
 * La coherencia con los demás mundos la lleva el SOL (dirección y calidez de la
 * direccional principal), no pintar de crema el aire y el mar.
 *
 * Costo: cero. Son las constantes de luces que ya existían; nada por frame.
 * Nada de esto está certificado: son números de dirección de arte, medidos en
 * captura GPU-headed. El operador juzga.
 */
export const ATMOSFERA_SIERRA = {
  /* El horizonte: un punto más hondo que el «pálido lechoso» de la v1 (#d9e5ee),
     porque la cámara está por ENCIMA de la cumbre (6,6 u contra 5,0) y el casquete
     se ve contra la franja del horizonte, no contra el cenit: con #d9e5ee la nieve
     (239,240,239 tras la bruma) y el cielo daban ΔE 7,7 — sin silueta, medido. */
  fondo: '#bdd2e2', // cielo húmedo del trópico en el horizonte, lejos del sol
  /* (2026-09-05, del costero) El cenit se HUNDE: #9dbad6 era casi el horizonte y el
     mar, que refleja el cielo de arriba, salía lechoso. Horizonte pálido y cenit
     hondo es Rayleigh —el costero: 0xb9d4e4 / 0x2456a0—; aquí un punto menos hondo
     porque en el cuadro solo entran 17° de cielo y el casquete se lee contra él. */
  cenit: '#5f8fc6', // el cielo unos grados más arriba: azul de verdad (domo HDR + reflejo del mar)
  niebla: '#bdd2e2', // bruma de distancia = el color del horizonte, o la ladera lejana no se disuelve en él
  cielo: '#cfe0f0', // hemisferio arriba: luz de cielo azul (la que el domo dorado negaba)
  suelo: '#6e6a5c', // rebote de la ladera: gris cálido neutro (vegetación y roca), no naranja
  luz: '#ffe3b8', // el sol bajo del occidente: cálido, no naranja
  relleno: '#a8c2e0', // relleno frío del cielo abierto, por el lado opuesto al sol
  ambiente: '#f4f2ec', // un ambiente casi neutro, chico: el modelado lo dan sol y cielo
  /* (2026-09-05) hemisferio 0,7 → 0,9 y ambiente 0,16 → 0,22: con sombras
     proyectadas y crestas, la cara ESTE en sombra perdía sus bandas (medido).
     El relleno de cielo es lo que en una tarde despejada ilumina la umbría. */
  intensidad: { hemisferio: 0.9, ambiente: 0.22, sol: 1.35, relleno: 0.45 },
  /* 0,028 → 0,030: un punto más de perspectiva aérea (a 15 u, 18 % → 20 % de bruma). */
  densidadNiebla: 0.03,
};

/* La dirección del sol de la hora dorada (= la direccional principal y el disco de
   `SolDorado`): occidente, bajo, un poco hacia el mar. */
export const SOL_SIERRA = /** @type {[number, number, number]} */ ([-12, 6, -4]);
export const RELLENO_SIERRA = /** @type {[number, number, number]} */ ([8, 4, 10]);
