/**
 * aprenderInfografiaFlag.js — feature flag del INFOGRÁFICO POR LECCIÓN (Aprende).
 *
 * El audit triple señaló el hueco de UX más grande del producto: "cero gráficos
 * en todo el producto; los módulos educativos son un muro de texto". Para el
 * campesino de baja alfabetización digital eso ES el problema (una field tester
 * pidió un infográfico tipo Duolingo). El componente `LessonInfographic`
 * re-expresa visualmente el contenido YA verificado de una lección como pasos
 * numerados con íconos, sin inventar nada.
 *
 * Se shippa "dark" a producción: con la flag APAGADA (default/prod) la lección
 * conserva su presentación de bloques de texto actual. En dev se enciende para
 * evaluar el PoC. Mismo criterio y parseo que `registroUnificadoActivo()`
 * (registroUnificadoFlag.js) y `colibriRealActivo()` (colibriFlag.js) para
 * mantener la convención del repo.
 *
 * CÓMO ACTIVARLO (dev): poner en el `.env` (o `.env.local`) del frontend:
 *
 *     VITE_APRENDER_INFOGRAFIA=true
 *
 * Acepta 'true' / '1' (case-insensitive, con espacios).
 *
 * Español colombiano (tú/usted), NUNCA voseo argentino.
 *
 * @module aprenderInfografiaFlag
 */

const FLAG_KEY = 'VITE_APRENDER_INFOGRAFIA';

/**
 * ¿Está activo el infográfico por lección en el hub Aprende?
 *
 * @returns {boolean} true si la flag está encendida; false (default) en
 *   cualquier otro caso, incluido error de acceso a import.meta.env.
 */
export function aprenderInfografiaActivo() {
  try {
    const raw = import.meta.env?.[FLAG_KEY];
    if (raw === true) return true;
    if (typeof raw === 'string') {
      const v = raw.trim().toLowerCase();
      return v === 'true' || v === '1';
    }
    return false;
  } catch (_) {
    return false;
  }
}

export default aprenderInfografiaActivo;
