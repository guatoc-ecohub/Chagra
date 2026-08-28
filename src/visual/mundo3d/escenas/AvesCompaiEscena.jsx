/*
 * Coreografía 3D compartida de las aves compai.
 *
 * El motor de presencia es común. Este módulo solo conecta el arte aprobado
 * de cada ave al mismo vuelo, entrada visible, lip-sync y cambio místico de
 * rumbo. No usa el billboard decorativo de fauna ni crea un arte alterno.
 */
import { useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GuacamayaCompai } from '../../creatures/GuacamayaCompai.jsx';
import { ChivitoPunk } from '../../creatures/ChivitoPunk.jsx';
import { GUACAMAYA_PRESENCIA } from '../../creatures/guacamayaIdentidad.js';
import { CHIVITO_PRESENCIA } from '../../creatures/chivitoIdentidad.js';
import { useLipSync } from '../../creatures/useLipSync.js';
import { idleDeCreature, IDLE_PERFILES } from '../../creatures/creatureIdle.js';

const VELOCIDAD = 0.42;
const _destino = new THREE.Vector3();

function useVueloAve(foco, {
  especie,
  reducedMotion = false,
  entrando = true,
  saliendo = false,
  hora = 'dorada',
  tier = 'alto',
} = {}) {
  const ref = useRef(null);
  const caraRef = useRef(null);
  const idleRef = useRef(null);
  const nacioEn = useRef(null);
  const salioEn = useRef(null);
  const prevX = useRef(foco.x);
  const signo = useRef(0);
  const fadeEn = useRef(null);
  const ultimaOpacidad = useRef('');

  useFrame((state, delta) => {
    if (!ref.current || reducedMotion) return;
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta || 0.016, 0.05);
    if (nacioEn.current === null) nacioEn.current = t;
    const idle = idleDeCreature(t, { especie, hora, reducedMotion, tier });
    if (saliendo && salioEn.current === null) salioEn.current = t;
    const destino = _destino.set(
      foco.x + (saliendo ? -2.5 : entrando ? 0.5 : 0.35 + Math.sin(t * 0.23) * 0.9),
      foco.y + (saliendo ? 0.72 : entrando ? 0.9 : 1.25 + Math.sin(t * 0.31) * 0.18)
        + idle.dy - idle.posada * 0.22,
      foco.z + (saliendo ? 0.55 : entrando ? 0.55 : 0.55 + Math.cos(t * 0.23) * 0.55),
    );
    ref.current.position.lerp(destino, VELOCIDAD * dt);

    const dx = ref.current.position.x - prevX.current;
    if (Math.abs(dx) > 0.001) {
      const nuevoSigno = dx < 0 ? -1 : 1;
      if (signo.current && nuevoSigno !== signo.current && fadeEn.current === null) {
        fadeEn.current = t;
      }
      signo.current = nuevoSigno;
    }
    prevX.current = ref.current.position.x;

    const entrada = entrando && !saliendo
      ? Math.min(1, (t - nacioEn.current) / 0.52)
      : 1;
    const salida = salioEn.current === null
      ? 1
      : Math.max(0, 1 - ((t - salioEn.current) / 0.52));
    let opacidad = entrada * salida;
    if (fadeEn.current !== null) {
      const fase = (t - fadeEn.current) / 0.52;
      opacidad *= fase < 1 ? Math.abs(Math.cos(fase * Math.PI)) : 1;
      if (fase >= 1) fadeEn.current = null;
    }
    if (caraRef.current) {
      const valor = opacidad.toFixed(2);
      if (valor !== ultimaOpacidad.current) {
        ultimaOpacidad.current = valor;
        caraRef.current.style.opacity = valor;
      }
    }
    if (idleRef.current) {
      idleRef.current.style.transform = `rotate(${idle.rot.toFixed(1)}deg) scale(${idle.sx.toFixed(3)},${idle.sy.toFixed(3)})`;
      if (idleRef.current.dataset.pose !== idle.pose) idleRef.current.dataset.pose = idle.pose;
    }
    state.invalidate();
  });

  return { ref, caraRef, idleRef };
}

function AveCompai({
  tipo,
  foco,
  entrando,
  saliendo = false,
  reducedMotion,
  hablando,
  energia = 1,
  tier = 'alto',
  hora = 'dorada',
}) {
  const esGuacamaya = tipo === 'guacamaya';
  const presencia = esGuacamaya ? GUACAMAYA_PRESENCIA : CHIVITO_PRESENCIA;
  const { ref, caraRef, idleRef } = useVueloAve(foco, {
    especie: tipo, entrando, saliendo, reducedMotion, hora, tier,
  });
  const { visema } = useLipSync({ activo: !reducedMotion });
  const size = presencia.billboardBase + Math.round(energia * presencia.billboardPorEnergia);
  const state = hablando && !reducedMotion ? 'speaking' : 'idle';
  const origen = useMemo(() => [
    foco.x + presencia.percha.x,
    foco.y + presencia.percha.y,
    foco.z + presencia.percha.z,
  ], [foco, presencia]);

  return (
    <group ref={ref} position={origen}>
      <Html center distanceFactor={presencia.distancia} zIndexRange={[40, 10]}>
        <div ref={caraRef} className="mundo-abeja" aria-hidden="true" data-creature={tipo}>
          <div ref={idleRef} data-pose={IDLE_PERFILES[tipo]?.poseBase || 'vuela'}>
            {esGuacamaya ? (
              <GuacamayaCompai
                state={state}
                visema={reducedMotion ? null : visema}
                size={size}
                animated={!reducedMotion}
                tier={tier}
                title="Guacamaya"
              />
            ) : (
              <ChivitoPunk
                state={state}
                size={size}
                title="Chivito"
              />
            )}
          </div>
        </div>
      </Html>
    </group>
  );
}

export function GuacamayaCompaiEscena(props) {
  return <AveCompai tipo="guacamaya" {...props} />;
}

export function ChivitoCompaiEscena(props) {
  return <AveCompai tipo="chivito-punk" {...props} />;
}
