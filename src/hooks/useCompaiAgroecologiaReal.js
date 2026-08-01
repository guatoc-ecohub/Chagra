/**
 * useCompaiAgroecologiaReal — el compAI comenta CON el catálogo real de SU
 * cultivo (#80/#81), no un inventario en abstracto.
 *
 * El hueco que cierra: `useInventarioCompai`/`comentarista.js` ya sabían
 * decir "tiene maíz registrado" (auditoría #38/#78), pero nunca un dato
 * AGROECOLÓGICO de esa especie puntual — el compañero hablaba de "sus
 * matas" en general, nunca de SU maíz con lo que el catálogo Chagra sabe de
 * Zea mays de verdad (rol en el gremio, temperatura de helada real…).
 *
 * Cablea: el cultivo más numeroso del inventario real (`useInventarioCompai`)
 * → `speciesResolver.resolveSpecies` (catálogo vivo, IndexedDB/SQLite ya
 * cacheado por App.jsx, exact-match primero) → `compai/nucleo/agroecologia.
 * datoAgroecologicoReal` (puro, anti-fabricación) → `useAngelitaStore.
 * entrarMundo('mis_matas', …)` — la MISMA anti-molestia y el MISMO cooldown
 * por mundo que cualquier otro husmeo.
 *
 * Anti-fabricación: sin cultivo real, o sin match de catálogo, o sin campo
 * agroecológico usable, este hook simplemente NO tiene nada nuevo que decir
 * — el husmeo de siempre (inventario) sigue funcionando exactamente igual.
 *
 * Local-first salvo por el propio catalogDB (SQLite ya empaquetado con el
 * build, cero red en runtime — mismo contrato que speciesResolver.js).
 */
import { useEffect, useRef } from 'react';
import useAngelitaStore from '../store/useAngelitaStore';
import { useInventarioCompai } from './useInventarioCompai';
import { resolveSpecies } from '../services/speciesResolver';
import { datoAgroecologicoReal } from '../compai/nucleo/agroecologia.js';
import { estaOcupado } from '../services/compaiOcupado.js';

/** Cada cuánto se reintenta (el cultivo top casi no cambia entre visitas). */
const INTERVALO_MS = 15 * 60 * 1000;

/**
 * @param {Object} [opts]
 * @param {boolean} [opts.activo=true]
 * @param {(mensaje:string) => void} [opts.onMensaje] callback opcional con
 *   el mensaje que surgió (mismo contrato que useCompaiClimaVivo).
 */
export function useCompaiAgroecologiaReal({ activo = true, onMensaje } = {}) {
  const inventario = useInventarioCompai();
  const cultivoTopNombre = inventario?.cultivos?.[0]?.name || null;
  const yaResueltoPara = useRef(null); // nombre del último cultivo ya intentado (éxito o no)

  useEffect(() => {
    if (!activo || !cultivoTopNombre) return undefined;
    if (yaResueltoPara.current === cultivoTopNombre) return undefined;
    let vivo = true;

    const intentar = async () => {
      // No le quita el turno a un husmeo/aviso en curso, ni compite si ya
      // no está en calma cuando la promesa resuelve.
      if (useAngelitaStore.getState().estado !== 'calma') return;
      let resuelto = null;
      try {
        resuelto = await resolveSpecies(cultivoTopNombre);
      } catch {
        // catálogo no listo / RAG falló: se skippea silencioso, como en
        // cualquier otro caller de resolveSpecies — nunca inventa.
        resuelto = null;
      }
      if (!vivo) return;
      yaResueltoPara.current = cultivoTopNombre;
      const agro = datoAgroecologicoReal(cultivoTopNombre, resuelto?.species || null);
      if (!agro) return; // sin dato real, el husmeo normal (inventario) sigue igual
      if (useAngelitaStore.getState().estado !== 'calma') return;
      const decision = useAngelitaStore.getState().entrarMundo(
        'mis_matas',
        { cultivos: inventario.cultivos, agro },
        { ocupado: estaOcupado() },
      );
      if (decision.interrumpe && typeof onMensaje === 'function') onMensaje(decision.mensaje);
    };

    intentar();
    const id = window.setInterval(() => {
      // Sólo reintenta si el cultivo top cambió (se limpia el marcador).
      if (yaResueltoPara.current !== cultivoTopNombre) intentar();
    }, INTERVALO_MS);
    return () => { vivo = false; window.clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, cultivoTopNombre]);
}

export default useCompaiAgroecologiaReal;
