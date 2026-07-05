/**
 * useModoCampo.js — orquestador del MODO CAMPO / MANOS LIBRES (#2088).
 *
 * Compone: motor de wake-word (wakeWordService.createWakeWordDetector),
 * Screen Wake Lock (pantalla no se apaga mientras esté activo), guard de
 * batería (avisa ≤15% sin cargador) y auto-apagado por inactividad
 * (privacidad + batería). Diseño de referencia: spikes/wake-word/modo-campo-design.js.
 *
 * FLUJO 100% MANOS LIBRES:
 *   toggle "modo campo" (opt-in) → Screen Wake Lock → wake-word activo
 *     → "hola chagra" → activarEscucha({fuente:'wakeword'}) (escuchaService)
 *     → EscuchaOverlay ya existente abre, graba, transcribe, rutea/responde
 *     → vuelve a escuchar "hola chagra" (loop)
 *
 * PRIVACIDAD:
 *   - Opt-in explícito: la UI (ModoCampoPanel) muestra el modal de
 *     explicación la primera vez antes de setActive(true).
 *   - El micrófono SOLO se toca en modo campo: al desactivar, el efecto de
 *     abajo llama detector.stop() (transfer.stopListening()), que libera el
 *     stream (getUserMedia hace track.stop() internamente en speech-commands).
 *   - Auto-apagado tras INACTIVITY_MS sin actividad (arranca al empezar a
 *     escuchar Y se reinicia con cada wake-word detectada).
 *
 * Español colombiano (tú/usted), NUNCA voseo argentino.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createWakeWordDetector } from '../services/wakeWordService';
import { activarEscucha } from '../services/escuchaService';

const INACTIVITY_MS = 10 * 60 * 1000; // 10 min sin disparos → apagar solo
const LOW_BATTERY_LEVEL = 0.15; // ~15%

/**
 * @typedef {'idle'|'loading-libs'|'loading-base'|'loading-personal'|'loading-ready'|'training'|'ready'|'listening'|'error'} ModoCampoStatus
 * @typedef {'personal'|'ready-cached'|'ready-fresh'} WakeWordSource
 */

/**
 * @returns {{
 *   active: boolean, setActive: (v:boolean)=>void,
 *   status: ModoCampoStatus,
 *   lastScore: number, errorMsg: string, source: WakeWordSource|null,
 *   lowBatteryNotice: boolean, dismissLowBattery: () => void,
 * }}
 */
export function useModoCampo() {
  const [active, setActive] = useState(false);
  /** @type {[ModoCampoStatus, (s: ModoCampoStatus) => void]} */
  const [status, setStatus] = useState(/** @type {ModoCampoStatus} */ ('idle'));
  const [lastScore, setLastScore] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  /** @type {[WakeWordSource|null, (s: WakeWordSource|null) => void]} */
  const [source, setSource] = useState(null);
  const [lowBatteryNotice, setLowBatteryNotice] = useState(false);

  const detectorRef = useRef(null);
  const inactivityRef = useRef(null);
  const cancelledRef = useRef(false);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityRef.current) clearTimeout(inactivityRef.current);
    inactivityRef.current = setTimeout(() => setActive(false), INACTIVITY_MS);
  }, []);

  const dispararEscucha = useCallback(() => {
    activarEscucha({ fuente: 'wakeword' });
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  // --- Motor de wake-word: carga/entrena/escucha mientras `active`. ---
  useEffect(() => {
    if (!active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset temprano en guard clause, no cambia durante render
      setStatus('idle');
      return undefined;
    }
    cancelledRef.current = false;
    setErrorMsg('');

    createWakeWordDetector({
      onWake: dispararEscucha,
      onScore: setLastScore,
      onProgress: (/** @type {'loading-libs'|'loading-base'|'loading-personal'|'loading-ready'|'training'|'ready'} */ phase) => {
        if (!cancelledRef.current) setStatus(phase);
      },
      onError: (e) => {
        if (cancelledRef.current) return;
        setErrorMsg(
          e?.message?.includes('MediaDevices') || e?.message?.includes('Permission')
            ? 'No pude usar el micrófono para el modo campo. Revise el permiso del navegador.'
            : (e?.message || 'No pude activar el modo campo.'),
        );
        setStatus('error');
        setActive(false);
      },
    }).then((detector) => {
      if (cancelledRef.current) {
        detector.stop().catch(() => {});
        return;
      }
      detectorRef.current = detector;
      setSource(detector.source);
      setStatus('listening');
      resetInactivityTimer();
    }).catch(() => { /* ya lo maneja onError de arriba */ });

    return () => {
      cancelledRef.current = true;
      if (detectorRef.current) {
        detectorRef.current.stop().catch(() => {});
        detectorRef.current = null;
      }
      if (inactivityRef.current) {
        clearTimeout(inactivityRef.current);
        inactivityRef.current = null;
      }
    };
  }, [active, dispararEscucha, resetInactivityTimer]);

  // --- Screen Wake Lock: pantalla encendida mientras modo campo esté activo. ---
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return undefined;
    let released = false;
    let lock = null;
    const acquire = async () => {
      try { lock = await navigator.wakeLock.request('screen'); } catch (_) { /* no soportado/denegado */ }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !released) acquire();
    };
    acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (lock) { try { lock.release(); } catch (_) { /* ya liberado/no soportado */ } }
    };
  }, [active]);

  // --- Guard de batería: avisa si queda ≤15% y no está cargando. ---
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !navigator.getBattery) return undefined;
    let battery = null;
    const check = () => {
      if (!battery) return;
      if (battery.level <= LOW_BATTERY_LEVEL && !battery.charging) setLowBatteryNotice(true);
    };
    navigator.getBattery().then((b) => {
      battery = b;
      check();
      b.addEventListener('levelchange', check);
      b.addEventListener('chargingchange', check);
    }).catch(() => {});
    return () => {
      if (battery) {
        battery.removeEventListener('levelchange', check);
        battery.removeEventListener('chargingchange', check);
      }
    };
  }, [active]);

  return {
    active,
    setActive,
    status,
    lastScore,
    errorMsg,
    source,
    lowBatteryNotice,
    dismissLowBattery: () => setLowBatteryNotice(false),
  };
}

export default useModoCampo;
