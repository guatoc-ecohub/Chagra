/**
 * fincaVivaHomeFlag.js — feature flag del HOME isométrico "Finca Viva" por
 * perfil + vista institucional (mockup F2). Kill-switch global.
 *
 * Con la flag APAGADA (default), el home conserva su comportamiento actual: la
 * escena 2D existente de MiFincaVivaHomeCard, gateada por `plantsCount > 0`, sin
 * la variante por perfil ni la vista institucional. Esto hace la feature SEGURA
 * de mergear (se shippa "dark" a producción) y se prueba en dev encendiéndola.
 *
 * CÓMO ACTIVARLA (dev): poner en el `.env` (o `.env.local`) del frontend:
 *
 *     VITE_FINCA_VIVA_HOME_PERFIL=true
 *
 * Acepta 'true' / '1' (case-insensitive, con espacios). Mismo criterio de
 * parseo que `featureExtensionistaActivo()` (extensionistaAccess.js) e
 * `isSidecarEnabled()` (sidecarClient.js) para mantener la convención del repo.
 *
 * Español colombiano (tú/usted), NUNCA voseo argentino.
 *
 * @module fincaVivaHomeFlag
 */

const FLAG_KEY = 'VITE_FINCA_VIVA_HOME_PERFIL';

/**
 * ¿Está activo el HOME "Finca Viva" por perfil + vista institucional?
 *
 * @returns {boolean} true si la flag está encendida; false (default) en
 *   cualquier otro caso, incluido error de acceso a import.meta.env.
 */
export function fincaVivaHomePerfilActivo() {
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
