/**
 * colibriFlag.js — feature flag del colibrí REAL (barbudito de páramo).
 *
 * El operador aprobó un colibrí REAL (sprite-sheet del barbudito de páramo,
 * recortado del video del operador) y rechazó el modelo 3D inflado anterior
 * (Three.js / R3F). Este sprite animado por CSS reemplaza, bajo la flag, al
 * colibrí 2D SVG del home, el avatar del botón del agente (FAB) y la transición
 * home→agente.
 *
 * Gateado dev-only, igual que `VITE_FINCA_VIVA_HOME_PERFIL`, para que NO llegue
 * a producción sin el visto bueno del operador. Con la flag APAGADA (default,
 * prod) cada sitio conserva su presentación 2D actual (SVG / avatar / video):
 *   - Home  → colibrí SVG 2D (`ColibriVuela`) de siempre.
 *   - FAB   → avatar actual (`ChagraAgentAvatar`).
 *   - Transición → overlay actual con `colibri-transition.webm`.
 *
 * El sprite es liviano (PNG + CSS `steps()`), funciona en TODO navegador
 * (incluido iOS Safari, donde el VP9-alpha del webm NO sirve) y NO arrastra
 * Three.js / WebGL.
 *
 * CÓMO ACTIVARLO (dev): poner en el `.env` (o `.env.local`) del frontend:
 *
 *     VITE_COLIBRI=true
 *
 * Acepta 'true' / '1' (case-insensitive, con espacios). Mismo criterio de
 * parseo que `fincaVivaHomePerfilActivo()` (fincaVivaHomeFlag.js) e
 * `isSidecarEnabled()` (sidecarClient.js) para mantener la convención del repo.
 *
 * Español colombiano (tú/usted), NUNCA voseo argentino.
 *
 * @module colibriFlag
 */

const FLAG_KEY = 'VITE_COLIBRI';

/**
 * ¿Está activo el colibrí real (barbudito) por sprite?
 *
 * @returns {boolean} true si la flag está encendida; false (default) en
 *   cualquier otro caso, incluido error de acceso a import.meta.env.
 */
export function colibriRealActivo() {
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
