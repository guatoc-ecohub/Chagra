/*
 * olor/ — EL OLOR VISIBLE. Hacer ver lo que solo se huele.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * LA IDEA QUE ORDENA TODO
 *
 *   El olor no es "normal": es nitrógeno perdiéndose. O sea, plata volándose.
 *
 * El campesino cree que el olor es el precio de tener marranos. No lo es: es un
 * recurso mal manejado escapándose al aire. Todo este módulo existe para hacer
 * ver eso, y para hacerlo SIN REGAÑAR — él no tiene la culpa de que su cochera
 * huela; nadie le explicó.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * LAS TRES DECISIONES DE ARTE
 *
 * 1. EL AMONÍACO ES DORADO, NO VERDE. Un humito verde tóxico es mentira dos
 *    veces: el amoníaco es incoloro, y "verde veneno" dice "sáquelo de acá"
 *    cuando hay que decir "eso es SUYO, no lo deje ir". Las motas son del color
 *    del grano de maíz, porque eso son: el abono que ya pagó, saliéndose por el
 *    techo. Duele porque es bonito y se va.
 *
 * 2. EL NITRÓGENO SE CONSERVA, Y ES UN SOLO SISTEMA DE PARTÍCULAS.
 *    `nitrogeno.aire + nitrogeno.cama = 1`. Las mismas motas que se fugaban se
 *    SIENTAN en el colchón cuando uno echa material seco. El oro no desaparece:
 *    cambia de lugar. Ese es el argumento entero, y no lleva una sola palabra.
 *
 * 3. EL VELO SE ACUESTA, Y TIENE UN BORDE. El gas no sube en volutas: es un
 *    estrato que pesa sobre la cama. Y ese borde deja a la gallina adentro
 *    (cabeza a 0.26 m) y al dueño afuera (nariz a 1.58 m) —
 *
 *      "Si a usted le arden los ojos al entrar al gallinero, la gallina lleva
 *       horas así."
 *
 *    — que es la frase madre del corpus, convertida en una línea de flotación.
 *
 * Y la física opuesta enseña sola: el amoníaco SUBE, es dorado, ronda y AVISA
 * con ardor; el sulfhídrico BAJA, es pardo muerto, está inmóvil y CALLA. Uno le
 * roba; el otro lo mata.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * TODO CUELGA DE UN NÚMERO
 *
 * `aire(carbono)` — cuánto material seco hay en la cama. De ahí salen el velo,
 * el oro, las moscas, el charco, la nube del vecino, el pozo, el fog y el
 * espesor del colchón. No hay un estado "sucio" y otro "limpio" pintados a
 * mano: hay una cantidad de aserrín y sus consecuencias, calculadas. Es la
 * regla del carbono hecha interfaz — y el antes/después es la MISMA cochera,
 * que es lo que lo vuelve una promesa y no la finca de otro señor.
 *
 * SIN CIFRAS. El corpus del maestro (56 pares sobre olores) no da ni una: no
 * hay ppm, ni C:N, ni centímetros de cama. Da señales del cuerpo —la prueba del
 * puño, el ardor de ojos, la nube de mosca— porque el puño está siempre y el
 * laboratorio queda a cuatro horas. Esta pieza respeta eso: no hay HUD.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * LA PUERTA
 *
 *   import OlorVisible from '.../olor';
 *   <OlorVisible />                      // decide tier solo, arranca en cero
 *
 * `OlorVisible` es el anfitrión: monta la escena 3D (lazy — la gama baja jamás
 * descarga three) o el corte de perfil, y abajo la palada de material seco.
 *
 * Complementa a `../estiercol/` (el biodigestor y la compostera): allá está la
 * SOLUCIÓN, acá el PROBLEMA. Este módulo termina justo donde aquel empieza —
 * en la cama que sale como abono semicompostado.
 */
export { default } from './OlorVisible.jsx';
export { default as OlorVisible } from './OlorVisible.jsx';

/* La pieza por partes (para galerías, previews o montaje propio). */
export { default as CocheraEnCorte } from './CocheraEnCorte.jsx';
export { default as PaladaDeSeco } from './PaladaDeSeco.jsx';

/* El modelo: la función madre y sus consecuencias. Puro, sin three. */
export { aire, densidadEnAltura, olorDeTier, rampa, ALTURAS } from './aireCargado.js';

/* Las señales del cuerpo — el HUD que esta pieza NO tiene. */
export {
  PARADAS,
  paradaDe,
  senalesDe,
  senalPuno,
  senalOjos,
  senalMosca,
  senalVecino,
  senalPozo,
} from './senalesDelCuerpo.js';

/* Los colores y las medidas de la cochera. */
export { COLORES, COCHERA, BEBEDERO } from './olor.geom.js';

/*
 * EscenaOlorVisible NO se re-exporta acá a propósito: importa three y
 * @react-three, y este índice lo consume gente que no quiere ese peso. Se monta
 * perezosa desde OlorVisible.jsx y en ningún otro lado.
 */
