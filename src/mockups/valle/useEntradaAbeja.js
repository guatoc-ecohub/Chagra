/*
 * useEntradaAbeja — la COREOGRAFÍA compartida de "la abeja baja y entra".
 *
 * Contrato del framework (DR §4.4): la ESCENA posee la coreografía, la CREATURE
 * (AbejaAngelita) posee el cuerpo. Este hook centraliza el vuelo para que TODA
 * escena-mundo herede la misma entrada sin reescribirla: la abeja aparece alto y
 * lejos, y desciende con un easing suave hasta posarse junto al foco, donde
 * queda flotando con un leve vaivén. `reducedMotion` la posa de una, quieta.
 *
 * Uso:
 *   const abejaRef = useEntradaAbeja(foco, { entrando, reducedMotion });
 *   <group ref={abejaRef}><Html><AbejaAngelita/></Html></group>
 *
 * Devuelve un ref para colgar de un <group>; el hook mueve ese grupo cada frame.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** Ease-out cúbico: rápido al inicio, calmo al final (aterrizaje suave). */
function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * @param {{x:number,y:number,z:number}} foco  punto al que la abeja se acerca.
 * @param {object} [opts]
 * @param {boolean} [opts.entrando=true]     si false, la abeja no avanza la entrada.
 * @param {boolean} [opts.reducedMotion=false] posa quieta, sin vaivén.
 * @param {number}  [opts.velocidad=0.55]    qué tan rápido completa la entrada.
 * @returns {import('react').MutableRefObject} ref para un <group>.
 */
export function useEntradaAbeja(foco, opts = {}) {
  const { entrando = true, reducedMotion = false, velocidad = 0.55 } = opts;
  const ref = useRef(null);
  const progreso = useRef(0); // 0 = alto y lejos, 1 = posada junto al foco.
  const desde = useRef(new THREE.Vector3());
  const hasta = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const g = ref.current;
    if (!g) return;

    if (reducedMotion) {
      progreso.current = 1;
    } else if (entrando && progreso.current < 1) {
      progreso.current = Math.min(1, progreso.current + delta * velocidad);
    }

    const p = easeOut(progreso.current);
    const t = state.clock.elapsedTime;
    const bob = reducedMotion ? 0 : Math.sin(t * 2) * 0.12;

    // Punto de aparición: arriba y en diagonal respecto al foco.
    desde.current.set(foco.x + 2.6, foco.y + 3.4, foco.z + 2.4);
    // Punto de reposo: posada al lado del foco, flotando levemente.
    hasta.current.set(foco.x + 0.85, foco.y + 1.05 + bob, foco.z + 0.7);

    g.position.lerpVectors(desde.current, hasta.current, p);
  });

  return ref;
}

export default useEntradaAbeja;
