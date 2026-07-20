/*
 * AuditoriaValle — el PUNTO DE ESCUCHA de diagnóstico del valle 3D.
 *
 * Expone { gl, scene, camera } en `window.__VALLE_AUDITORIA__` para que las
 * sondas de `scripts/diag/` (auditar-valle-runtime, encuadre-mundo) midan el
 * grafo Three.js realmente montado: instancias, triángulos, vecino más
 * cercano por banco. Es la misma instrumentación que la auditoría visual
 * aplicó a mano en su copia de trabajo; aquí queda cableada de forma
 * permanente pero DORMIDA: solo despierta con `?auditar=1` en la query
 * (antes del hash de ruta). Sin ese parámetro no toca `window` ni cuesta
 * nada: cero cambio de arte, cero cambio de comportamiento.
 *
 * Se monta dentro del <Canvas> del valle (lo hace BosqueDensoValle, que
 * siempre está en la escena). NO toca la escena: solo la lee.
 */
import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';

export default function AuditoriaValle() {
  const { gl, scene, camera } = useThree();
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!new URLSearchParams(window.location.search).has('auditar')) return undefined;
    window.__VALLE_AUDITORIA__ = { gl, scene, camera };
    return () => {
      delete window.__VALLE_AUDITORIA__;
    };
  }, [gl, scene, camera]);
  return null;
}
