/*
 * CamaraCruce — la CÁMARA del cruce Odyssey: el viaje que hace sentir que uno
 * se MUEVE de un lugar a otro, no que la pantalla cambió.
 *
 * Mitad 3D del lenguaje de transición (la mitad DOM es VeloOdyssey). Vive en
 * archivo propio a propósito: importa three/r3f, así que pertenece al chunk
 * vendor-three — el barrel `transiciones/index.js` NO lo re-exporta para no
 * arrastrar three al bundle base (mismo patrón que CamaraNewDonk).
 *
 * EL VIAJE (curvaCruce de velosData — la MISMA alma que el velo DOM):
 *   · ENTRANDO (hacia el umbral del mundo): la cámara primero se RECOGE un
 *     respiro hacia atrás (anticipación: k<0 — toma aire), se lanza hacia
 *     adentro con el FOV cerrándose (efecto túnel: el mundo lo absorbe a uno)
 *     y ATERRIZA pasándose un pelo del punto (overshoot) antes de asentar.
 *   · SALIENDO (de regreso a casa): sin anticipación ni rebote — la cámara
 *     EXHALA hacia afuera con el FOV reabriéndose. Volver es más suave que
 *     ir: uno ya conoce el camino.
 *   · REPOSO ('casa' | 'umbral'): respiración sutil de cámara viva (se apaga
 *     con reducedMotion — el encuadre queda quieto, presente).
 *
 * La máquina no conoce la escena: el host aporta las DOS poses y decide qué
 * renderiza a cada lado (mismo contrato que CamaraOdyssey/TunelOdyssey).
 *
 * PROPS
 *   fase           'entrando' | 'saliendo' | 'casa' | 'umbral'
 *   poseCasa       { pos, mira, fov } — el encuadre del mundo de origen
 *   poseUmbral     { pos, mira, fov } — el encuadre metido en el destino
 *   tier           'alto'|'medio'|'bajo' — bajo acorta el viaje (×0.7)
 *   reducedMotion  bool — corte: la cámara SALTA a la pose final, sin viaje
 *   viajeSegundos  duración del dolly (default asimétrico: 1.35 ir, 1.05 volver)
 *   onLlegada      (fase) => void — una vez, al asentar el dolly
 *
 * Construya poses sin tocar three con `poseDesdeArrays` (abajo).
 */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { curvaCruce, FACTOR_TIER_BAJO } from './velosData.js';

/** Pose de cámara desde arrays planos (el host no necesita importar three). */
// eslint-disable-next-line react-refresh/only-export-components -- helper puro que el host usa junto al componente, no amerita archivo aparte
export function poseDesdeArrays({ pos, mira, fov = 44 }) {
  return {
    pos: new THREE.Vector3(pos[0], pos[1], pos[2]),
    mira: new THREE.Vector3(mira[0], mira[1], mira[2]),
    fov,
  };
}

function aplicarFov(camera, fov) {
  if (Math.abs(camera.fov - fov) < 0.01) return;
  const focal = (0.5 * camera.getFilmHeight()) / Math.tan(THREE.MathUtils.degToRad(fov) / 2);
  camera.setFocalLength(focal);
}

/** Duración por defecto del dolly: ir pesa más que volver. */
const SEGUNDOS = { entrando: 1.35, saliendo: 1.05 };

export function CamaraCruce({
  fase = 'casa',
  poseCasa,
  poseUmbral,
  tier = 'alto',
  reducedMotion = false,
  viajeSegundos,
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
    const entra = fase === 'entrando';
    const sale = fase === 'saliendo';

    if (entra || sale) {
      const dur =
        (viajeSegundos ?? SEGUNDOS[entra ? 'entrando' : 'saliendo']) *
        (tier === 'bajo' ? FACTOR_TIER_BAJO : 1);
      a.t = Math.min(1, a.t + (reducedMotion ? 1 : Math.min(dt, 0.05) / dur));
      // La MISMA curva del velo DOM: anticipación (k<0) y, al entrar,
      // aterrizaje con overshoot (k>1). Volver exhala sin rebote.
      const k = curvaCruce(a.t, { descubre: entra });
      const desde = entra ? poseCasa : poseUmbral;
      const hasta = entra ? poseUmbral : poseCasa;
      camera.position.lerpVectors(desde.pos, hasta.pos, k);
      miraTemporal.current.lerpVectors(desde.mira, hasta.mira, k);
      camera.lookAt(miraTemporal.current);
      // FOV: entrar se CIERRA tarde (k²: el túnel aprieta al final); volver
      // se REABRE temprano (√k: la casa se ensancha apenas arranca).
      const kc = Math.min(1, Math.max(0, k));
      const kFov = entra ? kc * kc : Math.sqrt(kc);
      aplicarFov(camera, desde.fov + (hasta.fov - desde.fov) * kFov);
      if (a.t >= 1 && !a.avisado) {
        a.avisado = true;
        llegadaRef.current?.(fase);
      }
      return;
    }

    // Reposo: respiración de cámara viva (quieta bajo reducedMotion).
    const pose = fase === 'umbral' ? poseUmbral : poseCasa;
    const t = reducedMotion ? 0 : state.clock.elapsedTime;
    camera.position.set(
      pose.pos.x + Math.sin(t * 0.16) * 0.35,
      pose.pos.y + Math.sin(t * 0.11) * 0.14,
      pose.pos.z + Math.cos(t * 0.13) * 0.28,
    );
    camera.lookAt(pose.mira);
    aplicarFov(camera, pose.fov);
  });

  return null;
}
