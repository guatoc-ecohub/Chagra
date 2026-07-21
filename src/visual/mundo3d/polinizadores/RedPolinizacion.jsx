/*
 * RedPolinizacion — EL SERVICIO, HECHO VISIBLE.
 *
 * Este es el componente que justifica el mundo entero. Todo lo demás (las flores,
 * los bichos, las cajas) existe para que ESTO se pueda ver: la maraña de hilos de
 * polen que se va tejiendo sobre la finca mientras los bichos trabajan.
 *
 * Nadie ve nunca la polinización. Se ve la abeja, se ve la flor, se ve la fruta —
 * pero el TRABAJO, el viaje del polen de una flor a otra, es invisible. Y como es
 * invisible, es gratis, y como es gratis, no se cuida. Este componente hace lo
 * único que hay que hacer: dibujarlo.
 *
 * Cada hilo es un viaje de polen que de verdad pasó:
 *   · nace con un PULSO que lo recorre — el polen llegando. Se ve el trabajo
 *     ocurrir, no el resultado.
 *   · si CUAJÓ (cruzó entre dos flores de la misma mata) queda más claro y dura
 *     más: dejó fruta.
 *   · se cansa y se apaga. La red no es un monumento: hay que rehacerla todos los
 *     días. Si el enjambre se va, la maraña se deshace sola y la finca queda
 *     desnuda. Nadie tiene que decirlo.
 *   · si el veneno lo alcanza, no desaparece: se queda colgando en CENIZA unos
 *     segundos antes de irse. Un tejido roto se ve peor que un tejido ausente.
 *
 * ── TIER-SAFE ───────────────────────────────────────────────────────────────
 * TODA la red es UN LineSegments con un pool fijo preasignado: una sola
 * draw-call, cero asignaciones por frame, cero GC. Se dibuja solo lo vivo
 * (`drawRange`). En gama baja hay menos hilos y menos puntos por hilo — la red
 * se ve más rala, pero se ve. Nunca se apaga: si se apagara, se perdería la
 * única cosa que este mundo tiene para decir.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PAL, tierDe } from './polinizadoresIdentidad.js';

const _col = new THREE.Color(PAL.hilo);
const _colPuente = new THREE.Color(PAL.hiloPuente);
const _colMuerto = new THREE.Color(PAL.hiloMuerto);
const _p = new THREE.Vector3();

/** Punto sobre la Bézier cuadrática del hilo (a → mid → b). */
function bezier(a, c, b, t, out) {
  const u = 1 - t;
  const w0 = u * u;
  const w1 = 2 * u * t;
  const w2 = t * t;
  return out.set(
    w0 * a.x + w1 * c.x + w2 * b.x,
    w0 * a.y + w1 * c.y + w2 * b.y,
    w0 * a.z + w1 * c.z + w2 * b.z,
  );
}

/*
 * LA CURVA DE VIDA DE UN HILO (0..1 → opacidad). Tres tiempos, y cada uno dice
 * algo: entra fuerte (acaba de pasar algo), se asienta (el trabajo quedó hecho),
 * se va despacio (nada dura sin que lo repongan).
 */
function opacidadDeVida(t, puente) {
  if (t < 0.06) return (t / 0.06) * (puente ? 1 : 0.85); // el destello del viaje
  if (t < 0.55) {
    const k = (t - 0.06) / 0.49;
    return (puente ? 1 : 0.85) - k * (puente ? 0.25 : 0.32); // se asienta
  }
  const k = (t - 0.55) / 0.45;
  return (puente ? 0.75 : 0.53) * (1 - k * k); // se apaga (cuadrática: se demora)
}

/**
 * La red de polinización sobre la finca. Montar dentro del <Canvas>.
 * @param {Object} props
 * @param {Object} props.telar  el telar del mundo (`crearTelar`)
 * @param {'alto'|'medio'|'bajo'} [props.tier]
 * @param {boolean} [props.reducedMotion]
 * @param {boolean} [props.comoAbeja]  en visión de abeja el ámbar se aviva:
 *   el polen y el néctar son justamente lo que ELLA mejor ve.
 */
export default function RedPolinizacion({ telar, tier = 'alto', reducedMotion = false, comoAbeja = false }) {
  const conf = tierDe(tier);
  const K = conf.hiloPuntos; // puntos por hilo (el arco se lee con pocos)
  const cap = telar?.capacidad ?? conf.hilos;

  /* Pool preasignado: posiciones + color RGBA (la opacidad vive en el alfa de
     cada vértice, así cada hilo se apaga a su ritmo con UN solo material). */
  const { geo, pos, col, segsPorHilo } = useMemo(() => {
    const segs = K - 1;
    const vertices = cap * segs * 2;
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(vertices * 3);
    const c = new Float32Array(vertices * 4);
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('color', new THREE.BufferAttribute(c, 4)); // RGBA: alfa por vértice
    g.setDrawRange(0, 0);
    return { geo: g, pos: p, col: c, segsPorHilo: segs };
  }, [cap, K]);

  const mat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false, // los hilos se cruzan: que no se tapen entre ellos
        fog: true,
        blending: THREE.AdditiveBlending, // el polen es LUZ, no pintura
      }),
    [],
  );

  const ref = useRef(null);

  useLayoutEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );

  useFrame((_, dtCrudo) => {
    if (!telar) return;
    // dt acotado: si la pestaña estuvo dormida, que la red no dé un salto feo.
    const dt = Math.min(dtCrudo, 0.05);
    telar.paso(dt);

    let v = 0; // vértices escritos
    const hilos = telar.hilos;

    for (let i = 0; i < hilos.length; i++) {
      const h = hilos[i];
      if (!h.activo) continue;

      const t = h.edad / h.vida;
      let opac = opacidadDeVida(t, h.puente);

      // El color del hilo. En visión de abeja el ámbar se enciende: el polen y
      // el néctar son exactamente lo que ella mejor ve — su mundo es ESTE.
      let base = h.muerto ? _colMuerto : h.puente ? _colPuente : _col;
      let r = base.r;
      let g = base.g;
      let b = base.b;
      if (comoAbeja && !h.muerto) {
        r *= 1.15; g *= 1.15; b *= 0.75;
      }
      if (h.muerto) {
        // La agonía: parpadea sucio y se va. No es un fade elegante.
        opac *= 0.5 + 0.5 * Math.abs(Math.sin(h.edad * 9));
        opac *= 0.55;
      }

      /* EL PULSO: durante el primer segundo, un bulto de luz recorre el hilo de
         la flor de origen a la de destino. Es el polen llegando — el trabajo
         ocurriendo, no el resultado. Después el hilo se queda como memoria. */
      const viaje = Math.min(1, h.edad / 0.85);
      const conPulso = !reducedMotion && !h.muerto && viaje < 1;

      for (let k = 0; k < segsPorHilo; k++) {
        const t0 = k / segsPorHilo;
        const t1 = (k + 1) / segsPorHilo;

        for (const tt of [t0, t1]) {
          bezier(h.a, h.mid, h.b, tt, _p);
          pos[v * 3] = _p.x;
          pos[v * 3 + 1] = _p.y;
          pos[v * 3 + 2] = _p.z;

          let a = opac;
          if (conPulso) {
            // Antes del frente de onda no hay hilo todavía: se está DIBUJANDO.
            if (tt > viaje) a = 0;
            else {
              const d = Math.abs(tt - viaje);
              a *= 1 + Math.exp(-(d * d) / 0.006) * 1.9; // el bulto de luz
            }
          }
          col[v * 4] = r;
          col[v * 4 + 1] = g;
          col[v * 4 + 2] = b;
          col[v * 4 + 3] = a;
          v++;
        }
      }
    }

    geo.setDrawRange(0, v);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    // La red no se mueve del sitio: nunca hay que recalcular su bounding.
    if (!geo.boundingSphere) geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 12);
  });

  return <lineSegments ref={ref} geometry={geo} material={mat} frustumCulled={false} renderOrder={2} />;
}
