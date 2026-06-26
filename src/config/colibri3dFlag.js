/**
 * colibri3dFlag.js — feature flag de PRUEBA del colibrí 3D (Three.js / R3F).
 *
 * Es una PRUEBA visual para el operador: monta un colibrí 3D pulido en el home
 * "Finca Viva" y sobre el botón del agente (FAB). Gateado dev-only, igual que
 * `VITE_FINCA_VIVA_HOME_PERFIL`, para que NO llegue a producción sin el visto
 * bueno del operador.
 *
 * Con la flag APAGADA (default, prod) el colibrí del home y del FAB conservan su
 * presentación 2D actual (SVG / avatar foto). Con la flag ENCENDIDA (dev) se
 * sustituyen por el modelo 3D, que carga de forma perezosa (lazy) para no
 * engordar el bundle principal. Si Three.js / WebGL fallaran, el 3D cae a su
 * fallback 2D vía Suspense sin romper la pantalla.
 *
 * CÓMO ACTIVARLA (dev): poner en el `.env` (o `.env.local`) del frontend:
 *
 *     VITE_COLIBRI_3D=true
 *
 * Acepta 'true' / '1' (case-insensitive, con espacios). Mismo criterio de
 * parseo que `fincaVivaHomePerfilActivo()` (fincaVivaHomeFlag.js) e
 * `isSidecarEnabled()` (sidecarClient.js) para mantener la convención del repo.
 *
 * Español colombiano (tú/usted), NUNCA voseo argentino.
 *
 * @module colibri3dFlag
 */

const FLAG_KEY = 'VITE_COLIBRI_3D';

/**
 * ¿Está activa la PRUEBA del colibrí 3D?
 *
 * @returns {boolean} true si la flag está encendida; false (default) en
 *   cualquier otro caso, incluido error de acceso a import.meta.env.
 */
export function colibri3dActivo() {
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
