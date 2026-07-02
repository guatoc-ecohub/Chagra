/**
 * chivitoFlag.js — feature flag del CHIVITO DE PÁRAMO vivo (Oxypogon guerinii,
 * "barbudito paramuno"), dibujado 100% en SVG/CSS (cero assets, cero red,
 * offline-first, gama baja).
 *
 * Reemplaza, bajo la flag, al colibrí del A/B anterior (VITE_COLIBRI) en las
 * TRES piezas donde vive el ave insignia:
 *   1. HOME  → el chivito tomando néctar de la flor amarilla del frailejón
 *      (escena SVG animada, `ChivitoEscena`).
 *   2. BOTÓN → el chivito ES el botón de enviar / hablar del input del agente
 *      (`ChivitoBoton`, en el compositor del home, en AgentScreen y en el FAB).
 *   3. TRANSICIÓN home→agente → el chivito cruza aleteando (`ChivitoCruza`).
 *
 * DOS MOCKUPS (dos niveles de detalle) para decidir en chagra-dev:
 *   - Mockup A → simple / estilizado: vectorial limpio, colores planos, al
 *     estilo ilustrado de la escena Finca Viva.
 *   - Mockup B → detallado / rico: gradientes, barba iridiscente verde→violeta
 *     con brillo animado, plumas, texturas del frailejón, sombras.
 *
 * CÓMO ACTIVARLO (dev): en el `.env` (o `.env.local`) del frontend:
 *
 *     VITE_CHIVITO=ab     → A/B lado a lado en el home (A izq, B der, con
 *                           etiquetas). Botón del home = A; botones del agente
 *                           y FAB = B; transición = A y B cruzando en paralelo.
 *     VITE_CHIVITO=a      → mockup A coherente en las 3 piezas.
 *     VITE_CHIVITO=b      → mockup B coherente en las 3 piezas.
 *
 * También acepta 'true' / '1' (= 'ab'). Con la flag APAGADA (default, prod)
 * cada sitio conserva su presentación actual (colibrí SVG / avatar / video),
 * igual que con VITE_COLIBRI apagada. Si ambas flags están prendidas, el
 * chivito tiene precedencia (es el reemplazo del A/B del colibrí).
 *
 * Mismo criterio de parseo que `colibriRealActivo()` (colibriFlag.js) para
 * mantener la convención del repo. Español colombiano (usted), NUNCA voseo.
 *
 * @module chivitoFlag
 */

const FLAG_KEY = 'VITE_CHIVITO';

/**
 * ¿Qué mockup del chivito está activo?
 *
 * @returns {'a'|'b'|'ab'|null} 'a' | 'b' | 'ab' según la flag; null (default)
 *   si está apagada, con valor no reconocido o si import.meta.env falla.
 */
export function chivitoMockup() {
  try {
    const raw = import.meta.env?.[FLAG_KEY];
    if (raw === true) return 'ab';
    if (typeof raw !== 'string') return null;
    const v = raw.trim().toLowerCase();
    if (v === 'a' || v === 'b' || v === 'ab') return v;
    if (v === 'true' || v === '1') return 'ab';
    return null;
  } catch (_) {
    return null;
  }
}
