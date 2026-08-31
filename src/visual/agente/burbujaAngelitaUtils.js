/**
 * burbujaAngelitaUtils.js — la geometría y el recorte de texto de
 * <BurbujaAngelita>, puros y sin React.
 *
 * Separado de BurbujaAngelita.jsx (2026-07-30) porque react-refresh exige
 * que un archivo de componente sólo exporte componentes — mezclar estas dos
 * funciones puras con el default export rompía el fast-refresh y el lint
 * (`react-refresh/only-export-components`). Cero cambio de comportamiento:
 * mismo código, nuevo domicilio.
 */

/** Aire mínimo entre la burbuja y el borde de la pantalla (px). */
const MARGEN_PANTALLA = 10;

/**
 * Cuánto hay que correr la burbuja para que quepa entera en la pantalla.
 *
 * EL BUG QUE ARREGLA (visto en captura, 430 px de ancho): la burbuja va
 * anclada al personaje con `<Html center>` — o sea CENTRADA en su posición de
 * pantalla. Cuando el compAI anda cerca de un borde, media burbuja se sale y
 * el aviso queda cortado. En un teléfono modesto —que es el aparato del
 * usuario— eso significa que el tip sencillamente no se puede leer.
 *
 * Es la misma regla que ya aplica `useAngelitaGuia.calcularPuestoGuia` para
 * las paradas de la guía: nunca tapar, nunca salirse. Pura y testeable — no
 * toca el DOM, sólo calcula.
 *
 * @param {{left:number,right:number}} caja — rect de la burbuja.
 * @param {number} anchoPantalla
 * @param {number} [margen]
 * @returns {number} px a sumar en X (negativo = correr a la izquierda).
 */
export function correccionEnPantalla(caja, anchoPantalla, margen = MARGEN_PANTALLA) {
  if (!caja || !Number.isFinite(anchoPantalla) || anchoPantalla <= 0) return 0;
  const sobraDerecha = caja.right - (anchoPantalla - margen);
  const faltaIzquierda = margen - caja.left;
  // Si se sale por los DOS lados es que no cabe: se pega a la izquierda y el
  // `max-width` del CSS se encarga del resto. Peor sería centrarla y perder
  // texto por ambos bordes.
  if (sobraDerecha > 0 && faltaIzquierda > 0) return faltaIzquierda;
  if (sobraDerecha > 0) return -sobraDerecha;
  if (faltaIzquierda > 0) return faltaIzquierda;
  return 0;
}

/* Un aviso que no se lee de un vistazo no sirve (feedback del operador: "los
   avisos son muy largos y entre más largos más difíciles de leer"). Se corta
   en la primera frontera de frase que quepa; si no hay ninguna, en la última
   palabra completa. Además evita que la máquina de escribir reserve un cajón
   enorme y vacío mientras arranca. */
const TOPE_AVISO = 105;
export function recortarAviso(texto, tope = TOPE_AVISO) {
  const t = String(texto || '').trim();
  if (t.length <= tope) return t;
  const cabe = t.slice(0, tope);
  const frase = Math.max(cabe.lastIndexOf('. '), cabe.lastIndexOf('? '), cabe.lastIndexOf('! '));
  if (frase > tope * 0.45) return t.slice(0, frase + 1).trim();
  const palabra = cabe.lastIndexOf(' ');
  return `${(palabra > 0 ? cabe.slice(0, palabra) : cabe).trim()}…`;
}
