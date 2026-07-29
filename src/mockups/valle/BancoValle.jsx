/*
 * BancoValle — el InstancedMesh compartido de los lotes densos del valle.
 *
 * Un banco de UNA especie: una geometría, un material, N instancias con
 * posición, rotación, ladeo (tiltX/tiltZ) y color por instancia. Es EL patrón
 * tier-safe de todo el valle (una draw-call por banco por más matas que haya;
 * mismo patrón que FloraParamo.Especie). Los tres lotes (bosque, cafetal,
 * páramo) lo consumen con los items que produce `sembrarLote` en siembraValle.js.
 */
import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';

export function Banco({ geo, mat, items, castShadow = false }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh || !items.length) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const col = new THREE.Color();
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      p.set(it.pos[0], it.pos[1], it.pos[2]);
      e.set(it.tiltX || 0, it.rotY, it.tiltZ || 0);
      q.setFromEuler(e);
      s.setScalar(it.escala);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      col.setRGB(it.tint[0], it.tint[1], it.tint[2]);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [items]);
  if (!geo || !items.length) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geo, mat, items.length]}
      frustumCulled={false}
      castShadow={castShadow}
    />
  );
}

export default Banco;
