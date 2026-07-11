/*
 * useEntradaAbeja + AbejaEscena — LA COREOGRAFÍA COMPARTIDA de Angelita.
 *
 * El DR de mundos-3D pide que "la abeja baja y entra" viva UNA sola vez y la
 * herede toda escena-mundo (§4.4). Aquí está: extraída del `CompaneroAbeja` del
 * valle (Valle3D), generalizada para cualquier arquetipo. La ESCENA solo le pasa
 * el `foco` (posición del hotspot activo o el centro del diorama); el hook mueve
 * a Angelita con `lerp` hacia él, la hace flotar según su energía, y la voltea a
 * mirar hacia donde viaja. El CUERPO siempre es `<AbejaAngelita>` (la creature
 * de la librería): la escena POSEE la coreografía, la creature POSEE el cuerpo.
 *
 * Vive dentro de escenas/ (chunk perezoso `vendor-three`): importa @react-three
 * y three, así que NUNCA se importa desde el barrel base del framework.
 */
/* eslint-disable react-refresh/only-export-components -- este módulo (hook de
   coreografía + su componente de escena) se importa SIEMPRE perezoso dentro de
   un <Canvas> vía EscenaBase3D; no es hot-reload-sensible. Van juntos a propósito:
   la creature posee el cuerpo, la escena posee la coreografía (contrato del DR). */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { AbejaAngelita } from '../../creatures/AbejaAngelita.jsx';
import { SombraContacto } from './SombraContacto.jsx';

/**
 * Devuelve `{ ref, caraRef, sombraRef }` para colgar del `<group>` de la abeja,
 * de su cara (para el volteo) y de su sombra de contacto (el blob que la sigue
 * por el piso — auditoría 3D: la abeja no debe volar "a la deriva").
 * Corre `useFrame` (debe usarse DENTRO de un `<Canvas>`).
 *
 * @param {THREE.Vector3} foco  a dónde va la abeja (hotspot activo o centro).
 * @param {object} [opts]
 * @param {boolean} [opts.entrando=true]  entrando = se posa junto al foco; si no, ronda.
 * @param {number}  [opts.energia=1]      0..1 — vivacidad del vuelo (de la salud real).
 * @param {boolean} [opts.reducedMotion=false]  congela el vaivén a un fotograma.
 * @param {number}  [opts.piso=0]  y del suelo donde se proyecta la sombra.
 */
export function useEntradaAbeja(foco, {
  entrando = true, energia = 1, reducedMotion = false, piso = 0,
} = {}) {
  const ref = useRef(null);
  const caraRef = useRef(null);
  const sombraRef = useRef(null);
  const prevX = useRef(foco.x);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const brio = 0.35 + 0.65 * energia; // la energía anima el vuelo
    const bob = reducedMotion ? 0 : Math.sin(t * (1.6 + brio)) * (0.06 + 0.12 * brio);
    // Al reposo deriva en un círculo calmo; al entrar se posa junto al lugar.
    const vagarX = reducedMotion || entrando ? 0 : Math.sin(t * 0.55) * 0.6;
    const vagarZ = reducedMotion || entrando ? 0 : Math.cos(t * 0.55) * 0.4;
    const dest = new THREE.Vector3(
      foco.x + (entrando ? 0.45 : 0.35 + vagarX),
      foco.y + (entrando ? 0.85 : 1.6) + bob,
      foco.z + (entrando ? 0.6 : 0.55 + vagarZ),
    );
    ref.current.position.lerp(dest, entrando ? 0.06 : 0.05);
    if (caraRef.current) {
      const vx = ref.current.position.x - prevX.current;
      if (Math.abs(vx) > 0.0015) caraRef.current.style.transform = `scaleX(${vx < 0 ? -1 : 1})`;
      prevX.current = ref.current.position.x;
    }
    // La sombra de contacto la sigue por el piso: más alto vuela, más ancha y
    // más tenue (peso visual sin shadow-maps). Mismo frame, cero loops extra.
    if (sombraRef.current) {
      const pos = ref.current.position;
      const h = Math.max(0, pos.y - piso);
      sombraRef.current.position.set(pos.x, piso + 0.03, pos.z);
      sombraRef.current.scale.setScalar(1 + h * 0.15);
      sombraRef.current.material.opacity = Math.max(0.06, 0.3 - h * 0.06);
    }
  });
  return { ref, caraRef, sombraRef };
}

/**
 * Angelita ya montada en una escena: usa `useEntradaAbeja` para la coreografía y
 * dibuja el cuerpo (`AbejaAngelita`) como billboard `<Html>`. Cualquier arquetipo
 * la coloca con `<AbejaEscena foco=… animo=… energia=… reducedMotion=… />`.
 */
export function AbejaEscena({
  foco, entrando = true, animo = 'sereno', energia = 1, reducedMotion = false, piso = 0,
}) {
  const { ref, caraRef, sombraRef } = useEntradaAbeja(foco, {
    entrando, energia, reducedMotion, piso,
  });
  const size = 40 + Math.round(energia * 12);
  return (
    <>
      <group ref={ref} position={[foco.x + 0.45, foco.y + 0.85, foco.z + 0.6]}>
        <Html center distanceFactor={7} zIndexRange={[40, 10]}>
          <div className="mundo-abeja" aria-hidden="true">
            <div ref={caraRef} className="mundo-abeja__cara">
              <AbejaAngelita size={size} animo={animo} energia={energia} animated={!reducedMotion} />
            </div>
          </div>
        </Html>
      </group>
      {/* Su sombra: hermana (NO hija) del group — vive en el piso, no vuela. */}
      <SombraContacto
        refExt={sombraRef}
        pos={[foco.x + 0.45, piso + 0.03, foco.z + 0.6]}
        radio={0.3}
        opacidad={0.24}
        orden={3}
      />
    </>
  );
}
