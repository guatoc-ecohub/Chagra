/*
 * VeloQuePesa — el amoníaco. El problema entero de esta pieza, en un archivo.
 *
 * EL RETO: dibujar un gas incoloro sin caer en el humito verde de caricatura.
 *
 * Lo que NO se hizo, y por qué:
 *   · Humito verde saliendo en volutas → mentira dos veces. El amoníaco es
 *     incoloro, y el verde-tóxico le dice al campesino "eso es veneno ajeno,
 *     sáquelo de acá", cuando lo que hay que decirle es "eso es SUYO".
 *   · Nube que sube en columna → una chimenea es un evento, algo que pasa. El
 *     amoníaco no pasa: ESTÁ. Todo el día, quieto, encima de los animales.
 *   · Partículas verdes flotando → convierte el aire en un efecto de videojuego.
 *     Lo que se busca es incomodidad, no VFX.
 *
 * Lo que SÍ: EL VELO SE ACUESTA.
 *
 * El amoníaco de esta escena es un ESTRATO — una lámina de aire sucio que se
 * echa sobre la cama y tiene un BORDE horizontal. No sube: pesa. No se mueve
 * de un lado a otro: se queda. Y su color no es tóxico sino turbio, un
 * amarillo de orina vieja que no pertenece a ninguna hora del día (`COLORES.velo`,
 * derivado de la niebla dorada de la casa revolcada en pajonal y apagada contra
 * el zinc). Lo desagradable no está en el tono: está en que ese velo SE COME EL
 * COLOR de todo lo que queda detrás. La cama, el cerdo, el muro — todo lo que
 * está adentro del estrato se ve enfermo. El aire ensucia lo que toca.
 *
 * Y el borde es el argumento. Porque el borde deja a la gallina ADENTRO (cabeza
 * a 0.26 m) y al dueño AFUERA (nariz a 1.58 m). Los dos en el mismo cuarto:
 *
 *   "Si a usted le arden los ojos al entrar al gallinero, la gallina lleva
 *    horas así."
 *
 * Esa frase es esto: una línea de flotación. El humano tiene la cabeza fuera del
 * agua y cree que no es para tanto. La gallina vive en el fondo.
 *
 * TÉCNICA: estratos horizontales (planos, NO billboards — un billboard giraría
 * hacia la cámara y volvería el gas una "cosa"; el plano horizontal se ve como
 * lo que es, aire acostado). Cada estrato lleva su opacidad de
 * `densidadEnAltura`, se desplaza lentísimo (el aire quieto no está quieto:
 * ronda) y ondula sin cambiar de altura. MeshBasic + textura de ruido en canvas:
 * cero assets, corre en gama baja.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COLORES, COCHERA } from './olor.geom.js';
import { densidadEnAltura } from './aireCargado.js';
import { texturaAire } from './texturasOlor.js';

/* ------------------------------------------------------------------ */

/**
 * El estrato de amoníaco sobre la cama.
 *
 * @param {{
 *   aireRef: { current: ReturnType<typeof import('./aireCargado.js').aire> },
 *   n?: number,
 *   reducedMotion?: boolean,
 * }} props
 */
export default function VeloQuePesa({ aireRef, n = 7, reducedMotion = false }) {
  const grupo = useRef(null);

  const tex = useMemo(() => texturaAire(11), []);

  /*
   * La geometría: un plano ancho, más grande que la cochera (el aire no respeta
   * los muros bajos: se derrama por encima de ellos y por eso el vecino existe).
   * Subdividido para poder ondularlo sin que se note la grilla.
   */
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(COCHERA.ancho + 3.4, COCHERA.fondo + 2.6, 14, 10);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  /* Un material POR estrato: cada lámina lleva SU opacidad y SU color, porque
     el de abajo está más sucio que el de arriba. Se crean una vez. */
  const mats = useMemo(
    () =>
      Array.from(
        { length: n },
        () =>
          new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            opacity: 0,
            depthWrite: false, // el gas no tapa: vela
            side: THREE.DoubleSide, // se mira desde arriba y desde abajo
            fog: false,
            blending: THREE.NormalBlending, // NO additive: el gas ENSUCIA, no ilumina
          }),
      ),
    [tex, n],
  );

  /*
   * Las alturas de los estratos. Repartidos con sesgo HACIA ABAJO (potencia
   * 1.6): la mitad de las láminas viven en el primer palmo, porque ahí es donde
   * pasa todo — es la franja de la gallina y del cerdo. Arriba quedan pocas y
   * ralas: el resto que le llega a la nariz del dueño.
   */
  const estratos = useMemo(() => {
    const arr = [];
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1);
      arr.push({
        alturaRel: Math.pow(t, 1.6), // 0..1 relativo al techo del velo
        fase: i * 1.7,
        deriva: 0.4 + (i % 3) * 0.25,
        col: new THREE.Color(),
      });
    }
    return arr;
  }, [n]);

  const colHondo = useMemo(() => new THREE.Color(COLORES.veloHondo), []);
  const colAlto = useMemo(() => new THREE.Color(COLORES.velo), []);

  useLayoutEffect(
    () => () => {
      tex.dispose();
      geo.dispose();
      mats.forEach((m) => m.dispose());
    },
    [tex, geo, mats],
  );

  useFrame((state) => {
    const g = grupo.current;
    const a = aireRef.current;
    if (!g || !a) return;

    /* Sin amoníaco no hay velo: el grupo entero se apaga y deja de costar. */
    g.visible = a.amoniaco > 0.012;
    if (!g.visible) return;

    const t = reducedMotion ? 0 : state.clock.elapsedTime;

    for (let i = 0; i < g.children.length; i++) {
      const lam = /** @type {THREE.Mesh & { material: THREE.MeshBasicMaterial }} */ (g.children[i]);
      const e = estratos[i];

      /* La altura REAL de esta lámina: el techo del velo lo manda el aire. */
      const y = 0.015 + e.alturaRel * a.alturaVelo * 1.25;
      const dens = densidadEnAltura(y, a.alturaVelo);

      /*
       * La opacidad: densidad × cuánto amoníaco hay. El techo de 0.5 por lámina
       * es a propósito — ninguna capa sola tapa nada. Lo que ciega es la SUMA
       * de siete láminas, igual que en la cochera de verdad: no hay una nube,
       * hay aire, y el aire junto no deja ver.
       */
      lam.material.opacity = dens * a.amoniaco * 0.5 * (0.82 + Math.sin(t * 0.13 + e.fase) * 0.18);

      /* El color: sucio abajo, más lavado arriba. */
      e.col.copy(colHondo).lerp(colAlto, Math.min(1, e.alturaRel * 1.3));
      lam.material.color.copy(e.col);

      lam.position.y = y;

      if (!reducedMotion) {
        /*
         * La deriva: el estrato RONDA, no vuela. Centímetros por segundo, sin
         * rumbo. Es lo que hace que el aire se sienta pesado — si esto se
         * moviera rápido, sería viento, y el viento sería una buena noticia.
         */
        lam.position.x = Math.sin(t * 0.055 + e.fase) * e.deriva;
        lam.position.z = Math.cos(t * 0.041 + e.fase * 0.7) * e.deriva * 0.7;
        /* Un giro imperceptible: mata la grilla de planos paralelos. */
        lam.rotation.y = Math.sin(t * 0.03 + e.fase) * 0.09;
      }
    }
  });

  return (
    <group ref={grupo}>
      {estratos.map((e, i) => (
        <mesh key={i} geometry={geo} material={mats[i]} position={[0, 0.02, 0]} renderOrder={2 + i} />
      ))}
    </group>
  );
}
