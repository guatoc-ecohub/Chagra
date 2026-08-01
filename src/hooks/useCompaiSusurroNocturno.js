/**
 * useCompaiSusurroNocturno — de noche, el compAI baja la voz y comenta la
 * luna real + el clima de mañana antes de invitar a descansar (#108).
 *
 * Cablea:
 *   - `esDeNoche` (compai/nucleo/susurroNocturno) contra la hora local real.
 *   - `lunarPhase` (utils/skyEphemeris) — astronomía real, cero librería
 *     externa (algoritmo estándar del ciclo sinódico), YA existe en el repo
 *     con su propio candado (ADR-033: no recomienda labores por fase lunar).
 *   - `reaccionAlClima` (compai/nucleo/climaVivo, #111) — MISMO dato de
 *     clima de mañana que usa la reacción de clima, para no inventar un
 *     segundo pronóstico ni duplicar el mensaje si ya hay uno urgente.
 *
 * Pasa por `useAngelitaStore.evaluar()` — la misma anti-molestia de siempre
 * — así que respeta silencio/hoy-no/cooldown. Severidad SIEMPRE 'baja': el
 * susurro nocturno nunca compite con una helada real (#111 ya la reporta
 * con severidad alta y gana el arbitraje de prioridad).
 *
 * VOZ MÁS SUAVE: cuando el susurro de verdad habla (`speakSentences`), usa un
 * `rate` más lento que el preferido del usuario (dentro del rango válido de
 * Kokoro) — el mismo efecto de "bajar el tono" sin tocar la preferencia
 * persistida del usuario (que sigue intacta de día).
 *
 * ⚠️ CANDADO CIENTÍFICO (#108): este hook NUNCA llama a
 * `mensajeSaberLunarCampesino` — sólo usa `susurroDeNoche`, que jamás
 * menciona la siembra por luna. Ver `compai/nucleo/susurroNocturno.js`.
 */
import { useEffect, useRef } from 'react';
import useAngelitaStore from '../store/useAngelitaStore';
import { getCachedClimaSnapshot } from '../services/climaService';
import { lunarPhase } from '../utils/skyEphemeris';
import { reaccionAlClima } from '../compai/nucleo/climaVivo';
import { esDeNoche, susurroDeNoche } from '../compai/nucleo/susurroNocturno';
import { estaOcupado } from '../services/compaiOcupado.js';
import { getPreferredRate, KOKORO_RATE_MIN } from '../services/ttsService';

/** Cuánto más lento habla de noche, relativo a su rate preferido de día. */
const FACTOR_RATE_NOCTURNO = 0.9;

/**
 * @param {Object} [opts]
 * @param {boolean} [opts.activo=true]
 * @param {(m:string, voz:{rate:number}) => void} [opts.onSusurro]  callback con el
 *   mensaje y el rate sugerido — el host decide si lo habla (speakSentences)
 *   y cómo lo muestra (burbuja atenuada).
 */
export function useCompaiSusurroNocturno({ activo = true, onSusurro } = {}) {
  const yaSusurroEstaNoche = useRef(null); // fecha (YYYY-MM-DD) de la última vez que susurró

  useEffect(() => {
    if (!activo) return undefined;
    let vivo = true;

    const evaluar = () => {
      if (!vivo) return;
      const ahora = new Date();
      if (!esDeNoche(ahora)) return;
      // Una sola vez por noche (fecha local; la madrugada cuenta como la
      // noche del día calendario en que empezó — se compara contra el día
      // en que se disparó, no contra "hoy" que ya cambió a la medianoche).
      const fechaHoy = `${ahora.getFullYear()}-${ahora.getMonth()}-${ahora.getDate()}`;
      if (yaSusurroEstaNoche.current === fechaHoy) return;
      if (useAngelitaStore.getState().estado !== 'calma') return;

      const fase = lunarPhase(ahora);
      const snapshot = getCachedClimaSnapshot();
      const forecast7d = snapshot?.openmeteo?.available ? snapshot.openmeteo.forecast_7d : null;
      const reaccionClima = reaccionAlClima({ forecast7d: forecast7d || [] });
      const susurro = susurroDeNoche({ fase, reaccionClima });
      if (!susurro) return;

      const notificaciones = {
        hay: true,
        estado: 'aviso',
        severidad: /** @type {const} */ ('baja'),
        lead: susurro.mensaje,
        prompt: null,
        prioridad: 45, // PRIORIDAD.aviso_baja — nunca le gana a una helada real
      };
      const decision = useAngelitaStore.getState().evaluar({ notificaciones, ocupado: estaOcupado() });
      if (decision.interrumpe) {
        yaSusurroEstaNoche.current = fechaHoy;
        if (typeof onSusurro === 'function') {
          const rateNocturno = Math.max(KOKORO_RATE_MIN, getPreferredRate() * FACTOR_RATE_NOCTURNO);
          onSusurro(decision.mensaje, { rate: rateNocturno });
        }
      }
    };

    evaluar();
    const id = window.setInterval(evaluar, 10 * 60 * 1000);
    return () => { vivo = false; window.clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo]);
}

export default useCompaiSusurroNocturno;
