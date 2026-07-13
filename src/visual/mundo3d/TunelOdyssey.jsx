/*
 * TunelOdyssey — cruce 3D → 2D de iris, inspirado en los portales de
 * plataforma. La máquina no conoce la escena de origen ni el plano destino:
 * el host aporta las poses de cámara y decide qué renderiza a cada lado.
 */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { ODYSSEY_IRIS_MS } from './useTunelOdyssey.js';

const CSS_IRIS = `
.tunel-odyssey__iris[data-iris='abre'] {
  animation: tunelOdysseyAbre var(--tunel-odyssey-iris-ms) cubic-bezier(0.3, 0.7, 0.4, 1) forwards;
}
.tunel-odyssey__iris[data-iris='cierra'] {
  animation: tunelOdysseyCierra var(--tunel-odyssey-iris-ms) cubic-bezier(0.6, 0, 0.7, 0.4) forwards;
}
@keyframes tunelOdysseyAbre {
  from { clip-path: circle(2.5% at 50% 52%); }
  to { clip-path: circle(142% at 50% 52%); }
}
@keyframes tunelOdysseyCierra {
  from { clip-path: circle(142% at 50% 52%); }
  to { clip-path: circle(0% at 50% 52%); }
}
`;

const suavizar = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function aplicarFov(camera, fov) {
  if (Math.abs(camera.fov - fov) < 0.01) return;
  const focal = (0.5 * camera.getFilmHeight()) / Math.tan(THREE.MathUtils.degToRad(fov) / 2);
  camera.setFocalLength(focal);
}

/** Cámara imperativa para el dolly y el FOV casi ortográfico del cruce. */
export function CamaraOdyssey({
  fase,
  poseValle,
  poseBoca,
  reducedMotion = false,
  viajeSegundos = 1.25,
  onLlegada,
}) {
  const { camera } = useThree();
  const anim = useRef({ fasePrevia: null, t: 0, avisado: false });
  const llegadaRef = useRef(onLlegada);
  const miraTemporal = useRef(new THREE.Vector3());

  useEffect(() => {
    llegadaRef.current = onLlegada;
  });

  useFrame((state, dt) => {
    const a = anim.current;
    if (a.fasePrevia !== fase) {
      a.fasePrevia = fase;
      a.t = 0;
      a.avisado = false;
    }
    const entra = fase === 'acercando';
    const sale = fase === 'saliendo';
    if (entra || sale) {
      a.t = Math.min(1, a.t + (reducedMotion ? 1 : Math.min(dt, 0.05) / viajeSegundos));
      const k = suavizar(a.t);
      const desde = entra ? poseValle : poseBoca;
      const hasta = entra ? poseBoca : poseValle;
      camera.position.lerpVectors(desde.pos, hasta.pos, k);
      miraTemporal.current.lerpVectors(desde.mira, hasta.mira, k);
      camera.lookAt(miraTemporal.current);
      const kFov = entra ? k * k : Math.sqrt(k);
      aplicarFov(camera, desde.fov + (hasta.fov - desde.fov) * kFov);
      if (a.t >= 1 && !a.avisado) {
        a.avisado = true;
        llegadaRef.current?.(fase);
      }
      return;
    }
    if (fase === 'valle3d') {
      const t = reducedMotion ? 0 : state.clock.elapsedTime;
      camera.position.set(
        poseValle.pos.x + Math.sin(t * 0.16) * 0.4,
        poseValle.pos.y + Math.sin(t * 0.11) * 0.16,
        poseValle.pos.z + Math.cos(t * 0.13) * 0.32,
      );
      camera.lookAt(poseValle.mira);
      aplicarFov(camera, poseValle.fov);
      return;
    }
    camera.position.copy(poseBoca.pos);
    camera.lookAt(poseBoca.mira);
    aplicarFov(camera, poseBoca.fov);
  });
  return null;
}

/** Capa DOM que revela o cubre el destino 2D mediante un iris circular. */
export function IrisOdyssey({ fase, irisMs = ODYSSEY_IRIS_MS, className = '', children }) {
  const iris = fase === 'iris-abre' ? 'abre' : fase === 'iris-cierra' ? 'cierra' : 'no';
  return (
    <div
      className={`tunel-odyssey__iris ${className}`.trim()}
      data-iris={iris}
      style={{ '--tunel-odyssey-iris-ms': `${irisMs}ms` }}
    >
      <style>{CSS_IRIS}</style>
      {children}
    </div>
  );
}
