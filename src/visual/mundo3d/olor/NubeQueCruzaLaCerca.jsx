/*
 * NubeQueCruzaLaCerca — el vecino. El olor no es un asunto privado.
 *
 * "El olor no es solo un capricho del vecino, es una señal de que algo en el
 *  manejo se puede mejorar."
 *
 * "Muchas veces el conflicto crece más por sentirse ignorado que por el olor
 *  mismo; resolverlo a tiempo con buen manejo es más barato que un conflicto de
 *  vecinos o una queja ante la autoridad ambiental."
 *
 * ────────────────────────────────────────────────────────────────────────────
 * El aire no sabe dónde termina el lote.
 *
 * La cerca está dibujada con precisión —once postes, tres alambres— y no sirve
 * para nada. Ese es el chiste amargo de este archivo: el lindero existe en el
 * papel del POT, en la cabeza del dueño y en el alambre de púa. En el aire no
 * existe. La nube pasa por encima de los tres alambres sin enterarse y llega a
 * la ventana de la casa de al lado, donde hay gente.
 *
 * Por eso la nube va DERECHO A LA CASA y no en cualquier dirección: si derivara
 * al azar sería clima. Yendo a la ventana es un vecino.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * SIN SERMÓN — la regla más difícil de esta pieza.
 *
 * Lo que NO hay acá: ningún vecino con cara de asco, ninguna manito tapándose
 * la nariz, ningún globo de diálogo, ninguna marca roja sobre la casa. Habría
 * sido facilísimo y habría arruinado la pieza entera, porque convierte un
 * problema técnico en una acusación moral — y el campesino no tiene la culpa de
 * que su cochera huela: nadie le explicó.
 *
 * Lo único que hay es una nube que llega hasta una ventana. El que mira saca su
 * propia conclusión, que es la única que sirve.
 *
 * Y el detalle que lo cierra: la nube tarda en irse. Cuando uno echa el aserrín,
 * el velo de adentro se apaga rápido pero las cartas que ya cruzaron TERMINAN SU
 * VIAJE — siguen andando hacia la casa y se disuelven allá. Es fiel al dato y es
 * lo más honesto que tiene la escena:
 *
 *   "Esos cambios reducen el olor de forma progresiva a medida que la cama nueva
 *    reemplaza la vieja (...), no de un día para otro con un producto mágico.
 *    Mostrarle que ya empezó a actuar (aunque el resultado tarde unas semanas)
 *    suele calmar más al vecino que una promesa vaga."
 *
 * Uno arregla el manejo hoy y el vecino sigue oliendo lo de ayer un rato más.
 * Eso no es un bug de la animación: es la parte que hay que aguantarse.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COLORES } from './olor.geom.js';
import { texturaAire } from './texturasOlor.js';

/* De la cochera a la ventana del vecino. */
const SALIDA = 1.6; // z donde arranca (borde de la cochera)
const LLEGADA = 8.6; // z de la casa
const VIAJE = LLEGADA - SALIDA;

/**
 * @param {{ aireRef: { current: any }, n?: number, reducedMotion?: boolean }} props
 */
export default function NubeQueCruzaLaCerca({ aireRef, n = 5, reducedMotion = false }) {
  const grupo = useRef(null);
  const tex = useMemo(() => texturaAire(29), []);

  /* Cartas anchas y bajas: la nube va acostada, como todo el gas de esta pieza. */
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(4.6, 3.2, 8, 6);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  const mats = useMemo(
    () =>
      Array.from(
        { length: n },
        () =>
          new THREE.MeshBasicMaterial({
            map: tex,
            color: COLORES.velo,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            side: THREE.DoubleSide,
            fog: false,
          }),
      ),
    [tex, n],
  );

  const cartas = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => ({
        fase: i / n, // escalonadas: la nube es un rosario, no un bloque
        x: -1.4 + (i % 3) * 1.5,
        alto: 0.75 + (i % 2) * 0.5,
        vel: 0.055 + (i % 3) * 0.012,
      })),
    [n],
  );

  /*
   * La memoria de la nube. Sube rápido con el olor y BAJA LENTO (una décima
   * parte de rápido): es la inercia del conflicto. El aire que ya cruzó no se
   * devuelve porque uno se haya arrepentido.
   */
  const memoria = useRef(0);

  useLayoutEffect(
    () => () => {
      tex.dispose();
      geo.dispose();
      mats.forEach((m) => m.dispose());
    },
    [tex, geo, mats],
  );

  useFrame((state, dt) => {
    const g = grupo.current;
    const a = aireRef.current;
    if (!g || !a) return;

    /* Persigue al olor de adentro: rápido para empeorar, lento para sanar. */
    const objetivo = a.vecino;
    const paso = objetivo > memoria.current ? 0.9 : 0.09;
    memoria.current += (objetivo - memoria.current) * Math.min(1, dt * paso * 3);
    const m = memoria.current;

    g.visible = m > 0.015;
    if (!g.visible) return;

    const t = reducedMotion ? 0.35 : state.clock.elapsedTime;

    for (let i = 0; i < g.children.length; i++) {
      const carta = /** @type {THREE.Mesh & { material: THREE.MeshBasicMaterial }} */ (g.children[i]);
      const c = cartas[i];

      /* Cuánto lleva andado, 0..1. En bucle: el olor sale todo el día. */
      const avance = reducedMotion ? c.fase : (t * c.vel + c.fase) % 1;

      carta.position.z = SALIDA + avance * VIAJE;
      carta.position.x = c.x + Math.sin(avance * 3.1 + c.fase * 6) * 0.7;
      /* Va bajando: el aire cargado se enfría y se acuesta sobre el patio del
         vecino. Llega a la altura de una ventana, que es donde duele. */
      carta.position.y = c.alto + (1 - avance) * 0.5;

      /*
       * Entra difuminada, se ve entera a mitad de camino y se disuelve contra
       * la casa. Nunca alcanza a "chocar" con la pared: se deshace un poco
       * antes, porque el olor tampoco golpea — llega.
       */
      const entrada = Math.min(1, avance * 4);
      const salida = 1 - Math.max(0, (avance - 0.62) / 0.38);
      carta.material.opacity = m * entrada * salida * 0.3;
      carta.rotation.y = Math.sin(avance * 2 + c.fase * 4) * 0.2;
    }
  });

  return (
    <group ref={grupo}>
      {cartas.map((c, i) => (
        <mesh key={i} geometry={geo} material={mats[i]} renderOrder={12 + i} />
      ))}
    </group>
  );
}
