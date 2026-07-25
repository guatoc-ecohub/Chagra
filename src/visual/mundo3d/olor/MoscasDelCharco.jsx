/*
 * MoscasDelCharco — las moscas. Y de dónde salen DE VERDAD.
 *
 * "Las moscas no vienen atraídas por el olor en sí, sino por el mismo material
 *  húmedo, blando y rico en materia orgánica donde ese olor se produce: ahí
 *  ponen sus huevos y las larvas se desarrollan en pocos días. (...) Si tiene
 *  mucho olor, casi con seguridad también tiene mucha mosca; son la misma causa."
 *
 * EL DETALLE QUE HACE HONESTA ESTA ESCENA: acá las moscas cuelgan de
 * `aire.saturacion` —el material empapado—, NO de `aire.amoniaco`. Se ve en la
 * primera línea del useFrame y es la diferencia entre enseñar y decorar.
 *
 * Si colgaran del olor, la escena diría "las moscas vienen por la peste" — que
 * es lo que todo el mundo cree, y es falso. Vienen por el material húmedo y
 * blando donde ponen los huevos. El olor y la mosca son PRIMOS, no padre e hijo:
 * comparten mamá, que es el agua de más.
 *
 * Y de ahí sale todo lo demás sin necesidad de explicarlo:
 *   · Por qué fumigar no sirve — "mata las moscas adultas de ese momento, pero
 *     si no cambia el manejo del estiércol, en pocos días vuelve a haber otra
 *     generación". Se mata a las de hoy; la cama sigue siendo criadero.
 *   · Por qué el mismo puñado de aserrín apaga el olor Y la mosca de un solo
 *     golpe: les quita a las dos la mamá.
 *
 * Nacen en el charco del bebedero, que es donde el maestro dice que nacen
 * ("aunque el resto de la cama esté seca"), y no repartidas parejo por la
 * escena como confeti.
 *
 * El movimiento es RÁPIDO y quebrado, a propósito: es lo único nervioso de una
 * pieza donde todo lo demás pesa y se arrastra. El velo agobia; la mosca
 * exaspera. Son las dos formas de la misma incomodidad.
 *
 * Barato: un THREE.Points negro, sin textura, y `setDrawRange` para que se
 * vayan yendo de a una.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { rng } from '../bosque/entQuenua.geom.js';
import { COLORES, BEBEDERO } from './olor.geom.js';

/**
 * @param {{ aireRef: { current: any }, n?: number, reducedMotion?: boolean }} props
 */
export default function MoscasDelCharco({ aireRef, n = 26, reducedMotion = false }) {
  const puntos = useRef(null);

  /*
   * Cada mosca ronda un punto propio cerca del charco, con tres frecuencias
   * primas entre sí. Eso es lo que da el vuelo quebrado: nunca repite el mismo
   * lazo, y el ojo no le encuentra el patrón (que es exactamente lo que
   * enloquece de una mosca de verdad).
   */
  const moscas = useMemo(() => {
    const r = rng(707);
    const cx = new Float32Array(n);
    const cy = new Float32Array(n);
    const cz = new Float32Array(n);
    const radio = new Float32Array(n);
    const f1 = new Float32Array(n);
    const f2 = new Float32Array(n);
    const f3 = new Float32Array(n);
    const fase = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      /* Racimo apretado sobre el charco, con unas pocas dispersas. */
      const lejos = r() < 0.22;
      const ang = r() * Math.PI * 2;
      const rad = (lejos ? 1.3 + r() * 1.9 : Math.sqrt(r()) * 0.95);
      cx[i] = BEBEDERO.x + Math.cos(ang) * rad;
      cz[i] = BEBEDERO.z + Math.sin(ang) * rad;
      cy[i] = 0.09 + r() * 0.5;
      radio[i] = 0.09 + r() * 0.22;
      f1[i] = 2.2 + r() * 3.1;
      f2[i] = 1.7 + r() * 2.6;
      f3[i] = 3.1 + r() * 4.2;
      fase[i] = r() * 100;
    }
    return { cx, cy, cz, radio, f1, f2, f3, fase };
  }, [n]);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(BEBEDERO.x, 0.5, BEBEDERO.z), 5);
    return g;
  }, [n]);

  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.032,
        color: COLORES.mosca, // tinta: negro cálido de la casa, nunca negro puro
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        sizeAttenuation: true,
        fog: false,
      }),
    [],
  );

  useLayoutEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );

  useFrame((state) => {
    const p = puntos.current;
    const a = aireRef.current;
    if (!p || !a) return;

    /*
     * LA LÍNEA. Las moscas siguen al AGUA, no al olor. Cambiar
     * `a.moscas` (que sale de la saturación) por `a.amoniaco` acá sería repetir
     * la creencia que esta pieza vino a corregir.
     */
    const cuantas = Math.round(n * a.moscas);
    geo.setDrawRange(0, cuantas);
    p.visible = cuantas > 0;
    if (!p.visible) return;

    /* Con movimiento reducido: la nube se queda quieta, pero sigue estando.
       El problema no es la animación — es la cantidad. */
    const t = reducedMotion ? 3.2 : state.clock.elapsedTime;
    const pos = geo.attributes.position.array;

    for (let i = 0; i < cuantas; i++) {
      const j = i * 3;
      const ph = moscas.fase[i];
      /* Tres senos desalineados: el lazo que nunca cierra. */
      pos[j] = moscas.cx[i] + Math.sin(t * moscas.f1[i] + ph) * moscas.radio[i];
      pos[j + 1] =
        moscas.cy[i] + Math.sin(t * moscas.f3[i] + ph * 1.7) * moscas.radio[i] * 0.55;
      pos[j + 2] = moscas.cz[i] + Math.cos(t * moscas.f2[i] + ph * 0.6) * moscas.radio[i];
    }
    geo.attributes.position.needsUpdate = true;
  });

  return <points ref={puntos} geometry={geo} material={mat} frustumCulled={false} />;
}
