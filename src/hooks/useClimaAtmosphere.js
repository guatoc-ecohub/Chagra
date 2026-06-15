import { useEffect } from 'react';
import {
  deriveAtmosphere,
  applyAtmosphere,
  initAtmosphereCalibration,
  isAtmosphereEnabled,
} from '../services/atmosphereService.js';
import { getCachedClimaSnapshot, resolveClimaLocation, CLIMA_UPDATED_EVENT } from '../services/climaService.js';

/**
 * useClimaAtmosphere — conecta el clima real con la atmósfera visual del tema.
 * ============================================================================
 * Montar UNA vez en App (junto a useTheme). Consume la señal que climaService
 * ya expone (cache localStorage + evento 'chagra:clima:updated' que dispara
 * fetchClimaSnapshot cuando ClimaStrip/NotificationsBell refrescan) y la
 * traduce a atributos `data-clima/data-luz/data-enso` en <html>; el CSS de
 * src/styles/clima-atmosfera.css hace el resto.
 *
 * NO dispara fetches propios: offline-first y cero requests extra. Si nunca
 * llegó un snapshot, solo modula la LUZ (amanecer/día/atardecer/noche), que
 * sale del reloj + efemérides locales.
 *
 * Re-evalúa cada 10 min (mismo ritmo que el auto-switching de useTheme) para
 * seguir el paso del sol sin escuchar el reloj a cada render.
 */
const REEVAL_MS = 10 * 60 * 1000;

export function useClimaAtmosphere() {
  useEffect(() => {
    if (!isAtmosphereEnabled()) return undefined;

    initAtmosphereCalibration();

    const update = (snapshot) => {
      const location = resolveClimaLocation();
      const snap = snapshot ?? getCachedClimaSnapshot();
      applyAtmosphere(deriveAtmosphere({ snapshot: snap, now: new Date(), location }));
    };

    update(null);

    const onClima = (e) => update(e?.detail || null);
    window.addEventListener(CLIMA_UPDATED_EVENT, onClima);
    const id = setInterval(() => update(null), REEVAL_MS);

    return () => {
      window.removeEventListener(CLIMA_UPDATED_EVENT, onClima);
      clearInterval(id);
    };
  }, []);
}

export default useClimaAtmosphere;
