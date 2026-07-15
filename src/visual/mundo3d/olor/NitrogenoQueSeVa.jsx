/*
 * NitrogenoQueSeVa — el oro. La pieza que tiene que doler.
 *
 * "Ese olor fuerte es nitrógeno que se le está volando al aire, o sea plata que
 *  se le está yendo, porque ese mismo nitrógeno podría quedar en abono para la
 *  huerta."
 *
 * "Cada bocanada de amoníaco que se le vuela es menos abono para sus cultivos y
 *  más plata que tuvo que gastar en fertilizante comprado."
 *
 * ────────────────────────────────────────────────────────────────────────────
 * POR QUÉ ES DORADO Y NO VERDE
 *
 * Acá se juega la pieza entera. Si el amoníaco se pinta verde-tóxico, el
 * mensaje que llega es "hay veneno en su cochera, sáquelo". Cierto pero inútil:
 * el campesino ya sabe que huele feo y aprendió a vivir con eso, porque cree que
 * es el precio de tener marranos.
 *
 * Estas motas son del color del GRANO DE MAÍZ (`ACENTOS.maizGrano`, el mismo
 * amarillo de la mazorca en la paleta de la casa). Porque eso es lo que son: el
 * nitrógeno que el animal ya comió y que el dueño ya pagó en el bulto de
 * concentrado, subiendo y saliéndose por el caballete. No es un gas: es la
 * cosecha del año entrante evaporándose.
 *
 * Duele porque es bonito y se va.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * LA CONSERVACIÓN — por qué es UN solo sistema de partículas
 *
 * Hay UN arreglo de motas. No dos. El nitrógeno no se crea ni se destruye:
 *
 *     nitrogeno.aire + nitrogeno.cama = 1
 *
 * Cada mota tiene un número `u` fijo entre 0 y 1, y lo compara con cuánto
 * nitrógeno se está volando. Si su `u` cae del lado del aire, sube y se pierde.
 * Si cae del lado de la cama, se sienta adentro del colchón y brilla ahí, más
 * honda y más quieta — abono.
 *
 * Cuando uno echa material seco, no aparecen motas nuevas ni desaparecen las
 * viejas: LAS MISMAS MOTAS SE SIENTAN. Una por una, empiezan a caer del cielo a
 * la cama, como si la cochera se las estuviera tragando de vuelta. Ese es el
 * único momento didáctico de la pieza y no lleva una sola palabra: el oro no
 * desapareció, cambió de lugar. Estaba en el aire, ahora está en el suelo, y
 * mañana está en la huerta.
 *
 * Barato: un THREE.Points, una draw-call, textura de canvas. Corre en gama baja.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { rng } from '../bosque/entQuenua.geom.js';
import { COLORES, COCHERA } from './olor.geom.js';
import { ALTURAS, rampa } from './aireCargado.js';
import { texturaMota } from './texturasOlor.js';

/* Hasta dónde sube antes de perderse del todo. Pasa el caballete: la fuga no
   termina en el techo — termina donde uno ya no puede hacer nada. */
const CIELO = 4.6;

/**
 * El nitrógeno, como motas de oro.
 *
 * @param {{
 *   aireRef: { current: any },
 *   n?: number,
 *   camaRef?: { current: number },
 *   reducedMotion?: boolean,
 * }} props
 */
export default function NitrogenoQueSeVa({ aireRef, n = 420, camaRef, reducedMotion = false }) {
  const puntos = useRef(null);
  const tex = useMemo(() => texturaMota(), []);

  /*
   * Las motas. Cada una nace con:
   *   u     — su lugar en la fila. Decide si se va o se queda. NUNCA cambia:
   *           lo que cambia es el umbral, o sea el manejo de la cochera.
   *   x,z   — dónde vive en la cama. Sesgadas hacia el charco del bebedero y la
   *           zona donde se echa el cerdo: el nitrógeno tiene domicilio.
   *   vel   — qué tan rápido sube (las hay livianas y pesadas).
   *   fase  — para que no suban todas en fila india.
   */
  const motas = useMemo(() => {
    const r = rng(303);
    const u = new Float32Array(n);
    const bx = new Float32Array(n);
    const bz = new Float32Array(n);
    const vel = new Float32Array(n);
    const fase = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      u[i] = r();
      /* Reparto en la huella de la cama, con un sesgo hacia el bebedero. */
      const haciaCharco = r() < 0.3;
      if (haciaCharco) {
        const ang = r() * Math.PI * 2;
        const rad = Math.sqrt(r()) * 1.05;
        bx[i] = -1.5 + Math.cos(ang) * rad;
        bz[i] = 1.15 + Math.sin(ang) * rad;
      } else {
        bx[i] = (r() - 0.5) * (COCHERA.ancho - 0.7);
        bz[i] = (r() - 0.5) * (COCHERA.fondo - 0.6);
      }
      vel[i] = 0.16 + r() * 0.26;
      fase[i] = r();
    }
    return { u, bx, bz, vel, fase };
  }, [n]);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    /* La caja de recorte a mano: las motas se mueven solas y three no puede
       adivinar el bulto. Sin esto parpadean al salir del frustum calculado. */
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, CIELO / 2, 0), 12);
    return g;
  }, [n]);

  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.055,
        map: tex,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        sizeAttenuation: true,
        /* NormalBlending y no additive: el cielo del valle es claro y el
           additive se lavaría justo cuando el oro tiene que verse. Además el
           oro no es luz, es MATERIA — grano, abono. Debe pesar. */
        blending: THREE.NormalBlending,
        fog: false,
      }),
    [tex],
  );

  /* Los tres colores del viaje del oro. */
  const cCama = useMemo(() => new THREE.Color(COLORES.nitrogenoCama), []);
  const cAire = useMemo(() => new THREE.Color(COLORES.nitrogeno), []);
  const cFuga = useMemo(() => new THREE.Color(COLORES.nitrogenoFuga), []);
  const tmp = useMemo(() => new THREE.Color(), []);

  useLayoutEffect(
    () => () => {
      tex.dispose();
      geo.dispose();
      mat.dispose();
    },
    [tex, geo, mat],
  );

  useFrame((state) => {
    const p = puntos.current;
    const a = aireRef.current;
    if (!p || !a) return;

    const t = reducedMotion ? 8 : state.clock.elapsedTime;
    const pos = geo.attributes.position.array;
    const col = geo.attributes.color.array;
    /* La cama sube de espesor con el carbono: el oro sedimentado se sienta
       ENCIMA del colchón que lo está agarrando, no flotando sobre el piso. */
    const yCama = camaRef ? camaRef.current : 0.05;

    for (let i = 0; i < n; i++) {
      /*
       * ¿Esta mota se va o se queda? Compara su lugar en la fila con cuánto
       * nitrógeno se está volando. La rampa de ±0.05 es lo que hace que las
       * motas cambien de bando UNA POR UNA y no todas de golpe: al echar
       * aserrín uno ve el oro sentándose de a poco, como nieve al revés.
       */
      const fuga = rampa(motas.u[i] - 0.05, motas.u[i] + 0.05, a.nitrogeno.aire);

      /* — La que se queda: sentada en la cama, quieta, honda — */
      const xQ = motas.bx[i];
      const zQ = motas.bz[i];
      const yQ = yCama * (0.35 + (motas.fase[i] % 0.5)) + 0.012;

      /* — La que se va: sube desde la cama, se ladea y se pierde arriba — */
      const sube = ((t * motas.vel[i] + motas.fase[i] * 7) % CIELO) / CIELO; // 0..1
      const yV = sube * CIELO + 0.03;
      /*
       * Al subir se abre: el aire caliente sale por el caballete y arrastra.
       * El ladeo crece con la altura — abajo el gas está quieto sobre la cama,
       * arriba ya va de salida. Y se ladea hacia +x, que es donde está el alero
       * alto (y detrás, la cerca del vecino). El oro no se va derecho al cielo:
       * se va PARA LA CASA DE AL LADO.
       */
      const abre = sube * sube;
      const xV = motas.bx[i] + Math.sin(t * 0.5 + motas.fase[i] * 9) * 0.12 * abre + abre * 1.5;
      const zV = motas.bz[i] + Math.cos(t * 0.4 + motas.fase[i] * 6) * 0.1 * abre + abre * 0.9;

      /* Mezcla de los dos destinos: eso hace la transición continua. */
      const j = i * 3;
      pos[j] = xQ + (xV - xQ) * fuga;
      pos[j + 1] = yQ + (yV - yQ) * fuga;
      pos[j + 2] = zQ + (zV - zQ) * fuga;

      /*
       * El color cuenta el viaje: ámbar hondo mientras es abono, oro de mazorca
       * al soltarse, y lavado hacia la niebla al perderse allá arriba. La mota
       * que se va no se apaga de golpe: se DILUYE. Se sigue viendo un rato,
       * como una deuda.
       */
      tmp.copy(cCama).lerp(cAire, fuga);
      if (fuga > 0.5) tmp.lerp(cFuga, sube * 0.85 * ((fuga - 0.5) * 2));
      /* Titileo tenue del oro sentado: la cama fermentando, viva. */
      const brillo = fuga > 0.5 ? 1 : 0.86 + Math.sin(t * 0.8 + motas.fase[i] * 12) * 0.14;
      col[j] = tmp.r * brillo;
      col[j + 1] = tmp.g * brillo;
      col[j + 2] = tmp.b * brillo;
    }

    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;

    /* Las motas del aire se desvanecen al llegar arriba; las de la cama no.
       Un solo material, así que la opacidad global se mueve con la fuga. */
    mat.size = 0.04 + a.nitrogeno.aire * 0.022;
  });

  return <points ref={puntos} geometry={geo} material={mat} frustumCulled={false} />;
}

/* Altura de referencia del caballete, para quien quiera encuadrar la fuga. */
export const ALTURA_FUGA = ALTURAS.caballete;
