/**
 * decidirRender — device-tiering REAL del mundo 3D (mockup «hola, Chagra»).
 *
 * Decide el nivel de render UNA vez al montar. Gama baja no recibe un valle
 * roto ni un spinner eterno: recibe la versión dibujada (SVG+CSS) con la
 * MISMA coreografía. Vive en su propio módulo (sin componentes) para no
 * romper react-refresh en los archivos de escena.
 *
 *   '3d' → hay WebGL y el equipo tiene aire (memoria/núcleos reportados).
 *   '2d' → sin WebGL, o equipo humilde (≤2 GB reportados o ≤2 núcleos).
 *
 * @returns {'3d'|'2d'}
 */
export function decidirRender() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return '2d';
  let gl = null;
  try {
    const canvas = document.createElement('canvas');
    gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  } catch {
    return '2d';
  }
  if (!gl) return '2d';
  const nav = /** @type {any} */ (typeof navigator !== 'undefined' ? navigator : null);
  const memoria = nav && typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null;
  const nucleos = nav && typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null;
  if (memoria !== null && memoria <= 2) return '2d';
  if (nucleos !== null && nucleos <= 2) return '2d';
  return '3d';
}
