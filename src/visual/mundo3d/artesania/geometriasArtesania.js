/*
 * geometriasArtesania — las FORMAS del taller, listas para three.
 *
 * Fábricas PURAS de BufferGeometry (quien llama memoiza y libera, como
 * siempre en Chagra). Cada una aplica las tres reglas de la mano
 * (`tramaAndina.js`): temblor continuo, remate visible, gravedad.
 *
 *   amanar(geo)          — el bautizo: cualquier geometría de revolución
 *                          pierde su perfección de fábrica.
 *   crearCuerdaFique()   — la soga trenzada que cuelga entre dos puntos
 *                          (la pista que descubrió el navegador del grafo,
 *                          ahora con cuerpo: conector, cerca, tendedero).
 *   crearGuadua()        — el poste con sus nudos y su desplome.
 *   crearAmarra()        — la lazada cruzada que ata una unión (regla 2:
 *                          el remate se celebra, no se esconde).
 *   crearVasijaAmano()   — las siluetas andinas del 2D, torneadas y con
 *                          el temblor del torno de verdad.
 *   crearCanastoEspiral()— la cestería de rollo: pared festoneada, borde
 *                          rematado gordo.
 *
 * PRESUPUESTO (gama baja primero): todo son lathes de 7–12 segmentos y
 * tubos de 4–5 lados. Una cerca completa ≈ 1.5k triángulos; una vasija
 * ≈ 250. Nada aquí corre por frame: son fábricas de montaje.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rngArtesania, puntosSilueta, SEGMENTOS_SILUETA } from '../artesaniaAndina.js';
import { MANO, temblorMano, combaCuerda, perfilGuadua, perfilCanasto } from './tramaAndina.js';

/* ------------------------------------------------------------------ */
/* amanar — quitarle a una geometría la perfección de fábrica.         */
/* Desplaza cada vértice RADIALMENTE con el temblor continuo de la     */
/* mano (armónicos enteros en el ángulo → la costura del lathe cierra  */
/* limpia). La amplitud es proporcional al radio de la pieza: una olla */
/* grande tiembla en proporción igual que una taza.                    */
/* ------------------------------------------------------------------ */
export function amanar(geo, { seed = 7, intensidad = MANO.temblorRadial, escalaY = 1 } = {}) {
  const pos = geo.attributes.position;
  const w = temblorMano(seed);
  let rMax = 0;
  for (let i = 0; i < pos.count; i += 1) {
    const r = Math.hypot(pos.getX(i), pos.getZ(i));
    if (r > rMax) rMax = r;
  }
  const amp = rMax * intensidad;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-5) continue; // el eje no tiembla (ahí no hay pared)
    const angulo = Math.atan2(z, x);
    const f = 1 + (w(angulo, pos.getY(i) * escalaY) * amp) / r;
    pos.setX(i, x * f);
    pos.setZ(i, z * f);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/* ------------------------------------------------------------------ */
/* CUERDA DE FIQUE — la soga trenzada.                                 */
/* Dos (o tres) hebras que giran en hélice alrededor del camino de la  */
/* cuerda; cada hebra es UN TubeGeometry de 4–5 lados y todas se       */
/* funden en una sola malla (un draw call por cuerda — o por CERCA     */
/* entera vía crearCuerdasFique). El camino CUELGA: parábola hacia     */
/* abajo, porque la gravedad es la firma (regla 3). El grafo ya probó  */
/* que la trenza lee como "vínculo vivo"; esto es la misma idea con    */
/* volumen, para el mundo físico.                                      */
/* ------------------------------------------------------------------ */
export function crearCuerdaFique({
  de = [0, 0, 0],
  a = [1, 0, 0],
  comba = MANO.vencimientoCuerda,
  radio = 0.035,
  hebras = 2,
  giro = 3, // vueltas de trenza por unidad de mundo
  tramos = 20, // gama baja: 10–12 se ve digno
  radial = 5, // lados de cada hebra (4 en gama baja)
  seed = 7,
} = {}) {
  const pA = new THREE.Vector3(de[0], de[1], de[2]);
  const pB = new THREE.Vector3(a[0], a[1], a[2]);
  const dist = pA.distanceTo(pB) || 0.001;
  const r = rngArtesania(seed);
  const caida = comba * dist * (0.85 + r() * 0.3); // ninguna soga cuelga igual
  const vueltas = Math.max(2, Math.round(dist * giro));
  const rHebra = radio * (hebras >= 3 ? 0.5 : 0.62); // se tocan: trenza, no espiral

  const centro = (t, out) => {
    out.lerpVectors(pA, pB, t);
    out.y -= caida * combaCuerda(t);
    return out;
  };

  const p0 = new THREE.Vector3();
  const p1 = new THREE.Vector3();
  const tang = new THREE.Vector3();
  const n1 = new THREE.Vector3();
  const n2 = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const geos = [];
  for (let h = 0; h < hebras; h += 1) {
    const fase = (h / hebras) * Math.PI * 2;
    const pts = [];
    for (let i = 0; i <= tramos; i += 1) {
      const t = i / tramos;
      centro(t, p0);
      centro(Math.min(1, t + 0.01), p1);
      tang.subVectors(p1, p0);
      if (tang.lengthSq() < 1e-9) tang.set(1, 0, 0);
      tang.normalize();
      n1.crossVectors(tang, UP);
      if (n1.lengthSq() < 1e-6) n1.set(1, 0, 0);
      n1.normalize();
      n2.crossVectors(tang, n1).normalize();
      const angulo = fase + t * vueltas * Math.PI * 2;
      const c = Math.cos(angulo) * radio * 0.55;
      const s = Math.sin(angulo) * radio * 0.55;
      pts.push(new THREE.Vector3(
        p0.x + n1.x * c + n2.x * s,
        p0.y + n1.y * c + n2.y * s,
        p0.z + n1.z * c + n2.z * s,
      ));
    }
    geos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), tramos, rHebra, radial, false));
  }
  if (geos.length === 1) return geos[0];
  const geo = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  return geo;
}

/**
 * Muchas cuerdas → UNA malla (cerca completa, red de conectores: 1 draw call).
 * @param {Array<object>} tendidas — opciones de crearCuerdaFique por cuerda
 * @param {object} [comunes]  opciones compartidas (radio, hebras, tramos...)
 */
export function crearCuerdasFique(tendidas, comunes = {}) {
  const geos = tendidas.map((t, i) => crearCuerdaFique({ seed: 7 + i * 13, ...comunes, ...t }));
  if (geos.length === 1) return geos[0];
  const geo = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  return geo;
}

/* ------------------------------------------------------------------ */
/* GUADUA — el poste con nombre propio.                                */
/* Lathe de 7 lados (facetado low-poly de la casa) del perfil con      */
/* nudos de tramaAndina, más el temblor suave: una guadua es recta     */
/* "a ojo de campesino", no a láser. La INCLINACIÓN del poste hincado  */
/* la pone el consumidor (rotación del mesh — ver ArtesaniaKit).       */
/* ------------------------------------------------------------------ */
export function crearGuadua({ alto = 1.6, radio = 0.05, seed = 7, segmentos = 7 } = {}) {
  const { puntos } = perfilGuadua(alto, radio, { seed });
  const pts = puntos.map(([pr, py]) => new THREE.Vector2(pr, py));
  const geo = new THREE.LatheGeometry(pts, segmentos);
  return amanar(geo, { seed, intensidad: MANO.temblorRadial * 0.6, escalaY: 2 / alto });
}

/* ------------------------------------------------------------------ */
/* AMARRA — la lazada que ata una unión (regla 2: el remate se ve).    */
/* Dos aros de fibra achatados y CRUZADOS alrededor del eje Y: la      */
/* vuelta de cabuya que amarra el poste con el travesaño. Barata       */
/* (toros de 4×10) y elocuente: una esquina con amarra dice "esto lo   */
/* ató alguien", una esquina a tope dice "esto lo extruyó una máquina".*/
/* ------------------------------------------------------------------ */
export function crearAmarra({ radio = 0.05, grosor = 0.013, cruces = 2, seed = 7 } = {}) {
  const r = rngArtesania(seed);
  const geos = [];
  for (let i = 0; i < cruces; i += 1) {
    const aro = new THREE.TorusGeometry(radio * 1.12, grosor, 4, 10);
    aro.rotateX(Math.PI / 2); // el aro abraza el eje vertical
    aro.rotateZ((i % 2 === 0 ? 1 : -1) * (0.35 + r() * 0.18)); // la vuelta cruzada
    aro.translate(0, (i - (cruces - 1) / 2) * grosor * 2.4, 0);
    geos.push(aro);
  }
  const geo = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  return geo;
}

/* ------------------------------------------------------------------ */
/* VASIJA A MANO — las siluetas andinas del 2D, torneadas.             */
/* MISMA tabla de perfiles que las láminas (`SILUETAS_ANDINAS`): la    */
/* silueta jamás diverge entre dimensiones. El lathe de pocos          */
/* segmentos ES el estilo; `amanar` le pone el pulso del torno real.   */
/* ------------------------------------------------------------------ */
/**
 * @param {keyof typeof import('../artesaniaAndina.js').SILUETAS_ANDINAS} [nombre]
 * @param {Object} [opciones]
 * @param {number} [opciones.alto]
 * @param {number} [opciones.radio]
 * @param {number} [opciones.seed]
 * @param {number} [opciones.segmentos]
 */
export function crearVasijaAmano(nombre = 'vasija', {
  alto = 1,
  radio,
  seed = 7,
  segmentos = SEGMENTOS_SILUETA,
} = {}) {
  const pts = puntosSilueta(nombre, { alto, radio }).map(([pr, py]) => new THREE.Vector2(pr, py));
  const geo = new THREE.LatheGeometry(pts, segmentos);
  return amanar(geo, { seed, intensidad: MANO.temblorPerfil, escalaY: 2 / alto });
}

/* ------------------------------------------------------------------ */
/* CANASTO EN ESPIRAL — cestería de rollo.                             */
/* El perfil festoneado de tramaAndina (cada vuelta una pancita, el    */
/* borde rematado ~8% más gordo) revolucionado a 12 lados. Con la      */
/* textura de fique encima, las vueltas + la sarga = canasto.          */
/* ------------------------------------------------------------------ */
export function crearCanastoEspiral({
  alto = 0.5,
  radio = 0.4,
  vueltas = 7,
  seed = 7,
  segmentos = 12,
} = {}) {
  const perfil = perfilCanasto({ vueltas });
  const pts = perfil.map(([pr, py]) => new THREE.Vector2(pr * radio, py * alto));
  const geo = new THREE.LatheGeometry(pts, segmentos);
  return amanar(geo, { seed, intensidad: MANO.temblorRadial, escalaY: 3 / alto });
}
