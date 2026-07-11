/*
 * decidirRender — el GATE de device-tiering del framework de mundos-3D.
 *
 * El campesino promedio trae un teléfono de gama baja-media (DR §2, filtro nº2).
 * El 3D es ASPIRACIONAL: solo se enciende cuando el equipo lo aguanta; si no,
 * cae a la lámina 2D digna (nunca a un error). Este módulo decide, con señales
 * baratas del navegador, si un mundo se pinta en 3D y con qué frugalidad.
 *
 *   tier 'alto'  → 3D pleno (sombras suaves permitidas en el valle-hero).
 *   tier 'medio' → 3D frugal (sin sombras, sin post-proceso, DPR≤1.5, Lambert).
 *   tier 'bajo'  → NADA de 3D → lámina 2D (misma que sin WebGL).
 *
 * Señales (DR §3.1 / §4.4): WebGL como requisito duro + degradación por
 * `deviceMemory ≤ 3`, `hardwareConcurrency ≤ 4`, `saveData`, `reduced-motion`.
 */

/** ¿El equipo soporta WebGL? (línea base dura del render 3D). */
export function soportaWebGL() {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

/** ¿El usuario pidió menos movimiento? (accesibilidad + señal de equipo débil). */
export function prefiereMenosMovimiento() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Clasifica el equipo en un tier a partir de señales del navegador. No mide FPS
 * (caro y tardío): usa proxies de hardware conocidos por ser buenos indicadores
 * en gama baja. Conservador por diseño — ante la duda, baja el tier.
 *
 * @returns {'alto'|'medio'|'bajo'}
 */
export function decidirTier() {
  if (typeof navigator === 'undefined') return 'medio';
  // `deviceMemory` y `connection` no están en la lib.dom estándar (son extensiones
  // de navegadores móviles). Se declaran opcionales para leerlas sin romper tipos.
  /** @type {Navigator & { deviceMemory?: number, connection?: { saveData?: boolean } }} */
  const nav = navigator;
  const mem = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null;
  const nucleos =
    typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null;
  const ahorroDatos = !!(nav.connection && nav.connection.saveData);

  // Señales de equipo humilde → 3D no vale la pena: mejor la lámina.
  if (ahorroDatos) return 'bajo';
  if (mem !== null && mem <= 3) return 'bajo';
  if (nucleos !== null && nucleos <= 4) return 'bajo';

  // Gama media declarada: 3D frugal.
  if ((mem !== null && mem <= 6) || (nucleos !== null && nucleos <= 6)) return 'medio';

  // Sin señales negativas → asumimos gama alta (pero el AdaptiveDpr protege).
  return 'alto';
}

/**
 * Decide, de una, cómo montar un mundo: en 3D o en su lámina 2D. Es el único
 * punto que consulta el navegador; el resto del framework solo lee este objeto.
 *
 * @returns {{
 *   webgl:boolean, tier:'alto'|'medio'|'bajo', reducedMotion:boolean,
 *   render3d:boolean,
 * }}
 */
export function decidirRender() {
  const webgl = soportaWebGL();
  const reducedMotion = prefiereMenosMovimiento();
  const tier = webgl ? decidirTier() : 'bajo';
  // 3D solo si hay WebGL Y el tier lo aguanta. 'bajo' o sin-WebGL → lámina 2D.
  const render3d = webgl && tier !== 'bajo';
  return { webgl, tier, reducedMotion, render3d };
}
