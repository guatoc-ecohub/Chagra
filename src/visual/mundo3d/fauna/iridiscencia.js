/*
 * iridiscencia — el color que NO es pintura.
 *
 * El encargo lo pidió con esas palabras: "la iridiscencia real (no pintura:
 * estructura)". Y la distinción no es poética, es física:
 *
 * La gorguera de un colibrí no tiene pigmento verde ni azul. Tiene bárbulas con
 * capas de melanina de un grosor del orden de la longitud de onda de la luz, y
 * lo que hace es INTERFERENCIA DE PELÍCULA DELGADA: cancela unos colores y
 * refuerza otros según el CAMINO ÓPTICO — que depende del ángulo con que la
 * mirás. Por eso el mismo colibrí, sin moverse ni cambiar de luz, pasa de verde
 * a violeta cuando vos girás la cabeza. Un colibrí pintado de verde es un
 * colibrí muerto: le falta lo único que lo hacía brillar.
 *
 * Y la física tiene DIRECCIÓN, que es lo que hace que esto no sea un truco: a
 * mayor ángulo de incidencia, el camino óptico dentro de la película se acorta
 * y el reflejo se corre hacia el AZUL (blue-shift). Nunca al revés. Por eso la
 * rampa de `pelajes.COLIBRI.barbaRampa` va verde → azul → índigo y no en
 * cualquier orden: de frente verde, oblicuo el azul del agua, rasante el índigo
 * del mortiño.
 *
 * CÓMO, EN GAMA BAJA: nada de shaders. Un producto punto entre la normal de la
 * pluma y la dirección a la cámara, un lerp en una rampa de tres colores, y se
 * escribe `material.color`. Un puñado de operaciones por frame para el efecto
 * más caro de conseguir de toda la fauna. La estructura sale gratis cuando se
 * entiende de dónde viene el color.
 */
import * as THREE from 'three';

const limitar = (v, a, b) => (v < a ? a : v > b ? b : v);

/** Compila una rampa de hex a THREE.Color (una vez, no por frame). */
export function crearRampa(hexes) {
  return hexes.map((h) => new THREE.Color(h));
}

/**
 * El color de la rampa en `t` (0..1), con lerp entre las paradas.
 * @param {THREE.Color[]} rampa
 * @param {number} t
 * @param {THREE.Color} salida
 */
export function colorEnRampa(rampa, t, salida) {
  const n = rampa.length - 1;
  if (n <= 0) return salida.copy(rampa[0]);
  const x = limitar(t, 0, 1) * n;
  const i = Math.min(n - 1, Math.floor(x));
  return salida.copy(rampa[i]).lerp(rampa[i + 1], x - i);
}

/* temporales de módulo: esto corre por frame y no puede tirarle basura al GC */
const _normal = new THREE.Vector3();
const _aCamara = new THREE.Vector3();
const _q = new THREE.Quaternion();

/**
 * El `t` de la rampa según el ángulo REAL entre la pluma y el ojo que mira.
 *
 * 0 = de frente (la pluma te apunta: el color base, el más saturado)
 * 1 = rasante (la ves de canto: el corrimiento al azul/violeta)
 *
 * @param {THREE.Object3D} pluma   la malla de la gorguera/barba (su +Z es la
 *        normal de la pluma: así se construye en ColibriGuardian)
 * @param {THREE.Camera} camara
 * @returns {number} t para `colorEnRampa`
 */
export function anguloIridiscente(pluma, camara) {
  /* la normal de la pluma en el mundo: la +Z local, girada por la malla */
  _normal.set(0, 0, 1).applyQuaternion(pluma.getWorldQuaternion(_q));
  pluma.getWorldPosition(_aCamara);
  _aCamara.subVectors(camara.position, _aCamara).normalize();
  const c = limitar(Math.abs(_normal.dot(_aCamara)), 0, 1);
  /*
   * `1 - c` sería lineal, pero el destello real NO es lineal: el verde vive en
   * una ventana ANGOSTA alrededor del frente y se pierde apenas girás. Por eso
   * la curva — es lo que hace que el bicho DESTELLE en vez de degradarse como
   * un gradiente de fondo de pantalla. El destello es un evento, no un estado.
   */
  return 1 - Math.pow(c, 2.6);
}

/**
 * El brillo del destello: pica CERCA del frente y se apaga rápido. Sirve para
 * subir el `emissive` justo cuando la gorguera te encara — el chispazo que en
 * el campo dura un cuarto de segundo y no se olvida más.
 * @returns {number} 0..1
 */
export function fuerzaDelDestello(t) {
  const cerca = 1 - limitar(t, 0, 1);
  return Math.pow(cerca, 3.5);
}
