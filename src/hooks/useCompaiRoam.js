/**
 * Compatibilidad con el contrato histórico del roam 2D.
 *
 * La máquina vive en useComportamientoCompai. Este adaptador conserva el API
 * que ya consumen CompaiOverlay y sus pruebas, pero hereda persistencia,
 * presencia y aparición mística del motor transversal.
 */
import useComportamientoCompai from './useComportamientoCompai.js';

export default function useCompaiRoam(ref, opciones = {}) {
  return useComportamientoCompai(ref, {
    especie: opciones.especie || 'angelita',
    activo: opciones.activo ?? true,
    pausado: opciones.pausado ?? false,
    soloX: opciones.soloX ?? true,
    contentAware: opciones.contentAware ?? true,
    superficie: opciones.superficie || 'overlay',
  });
}
