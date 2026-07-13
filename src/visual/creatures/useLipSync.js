/*
 * useLipSync — HOOK de lip-sync 2D para las creatures.
 *
 * Engancha `ttsService.onSpeakingChange` (¿está hablando el agente?) + un
 * `AudioContext.createAnalyser()` sobre el <audio> activo (`getActiveAudio`) para
 * derivar VISEMAS de la energía RMS en tiempo real
 * (ficha DR animación rubber-hose §2). La lógica pura (umbral RMS →
 * visema, debounce anti-castañeteo, boca de relleno) vive en `lipSyncCore.js`
 * (testeada sin navegador); acá solo está el cableado del audio + rAF.
 *
 * Species-agnostic: devuelve un `data-visema` ('V1'..'V4') que CUALQUIER creature
 * pone en su nodo raíz; el SVG dibuja las 4 bocas a su manera.
 *
 * FALLBACK DIGNO (contrato): si no hay WebAudio, o el audio es Web-Speech (sin
 * elemento), o el navegador no deja intervenir el <audio>, la boca aletea igual
 * con `visemaFallback` mientras el agente hable. Nunca se queda muda-abierta.
 *
 * GPU/gama-baja: un solo AudioContext compartido, un solo rAF activo solo
 * mientras habla, y respeta `prefers-reduced-motion` (boca cerrada, sin rAF).
 */

import { useEffect, useRef, useState } from 'react';
import ttsService from '../../services/ttsService.js';
import {
  VISEMA,
  visemaDesdeRMS,
  rmsDeMuestras,
  crearDebounceVisema,
  visemaFallback,
  DEBOUNCE_MS,
} from './lipSyncCore.js';

/* Un AudioContext por pestaña (crearlos es caro y hay un tope del navegador).
   MediaElementSource: solo UNO por elemento — cacheamos por WeakMap para no
   volver a intentar (createMediaElementSource dos veces tira). */
let ctxCompartido = null;
const fuentesPorAudio = new WeakMap();

function obtenerContexto() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctxCompartido) {
    try { ctxCompartido = new AC(); } catch { return null; }
  }
  return ctxCompartido;
}

function prefiereMenosMovimiento() {
  try {
    return typeof window !== 'undefined'
      && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch { return false; }
}

/**
 * @param {object} [opts]
 * @param {boolean} [opts.activo=true]  permite apagar el hook (p.ej. tier bajo).
 * @param {number}  [opts.debounceMs=DEBOUNCE_MS]
 * @returns {{ visema: string, hablando: boolean }}
 */
export function useLipSync({ activo = true, debounceMs = DEBOUNCE_MS } = {}) {
  const [visema, setVisema] = useState(VISEMA.CERRADA);
  const [hablando, setHablando] = useState(false);

  // Refs mutables que el loop lee sin re-suscribirse.
  const hablandoRef = useRef(false);
  const rafRef = useRef(0);
  const analyserRef = useRef(null);
  const bufRef = useRef(null);
  const audioRef = useRef(null);
  const debounceRef = useRef(crearDebounceVisema({ ms: debounceMs }));
  const inicioFallbackRef = useRef(0);

  useEffect(() => {
    debounceRef.current = crearDebounceVisema({ ms: debounceMs });
  }, [debounceMs]);

  useEffect(() => {
    if (!activo || prefiereMenosMovimiento()) {
      setVisema(VISEMA.CERRADA);
      return undefined;
    }

    const ahora = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

    // Intenta colgar un analyser sobre el <audio> activo. Devuelve true si lo
    // logró (hay señal real); false → usaremos la boca de relleno.
    const intentarAnalizarReal = () => {
      const el = ttsService.getActiveAudio?.();
      if (!el) return false;
      if (audioRef.current === el && analyserRef.current) return true; // ya cableado
      const ctx = obtenerContexto();
      if (!ctx) return false;
      try {
        if (ctx.state === 'suspended') ctx.resume?.();
        let fuente = fuentesPorAudio.get(el);
        if (!fuente) {
          fuente = ctx.createMediaElementSource(el);
          fuente.connect(ctx.destination); // sin esto el audio se silencia
          fuentesPorAudio.set(el, fuente);
        }
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;              // barato; suficiente para RMS
        analyser.smoothingTimeConstant = 0.4;
        fuente.connect(analyser);
        analyserRef.current = analyser;
        bufRef.current = new Uint8Array(analyser.fftSize);
        audioRef.current = el;
        return true;
      } catch {
        // createMediaElementSource ya usado / bloqueado → relleno.
        analyserRef.current = null;
        audioRef.current = null;
        return false;
      }
    };

    const loop = () => {
      if (!hablandoRef.current) return; // se apaga en el listener
      let crudo;
      if (analyserRef.current && bufRef.current) {
        analyserRef.current.getByteTimeDomainData(bufRef.current);
        crudo = visemaDesdeRMS(rmsDeMuestras(bufRef.current));
      } else if (intentarAnalizarReal()) {
        crudo = VISEMA.CERRADA; // primer frame recién cableado
      } else {
        crudo = visemaFallback(ahora() - inicioFallbackRef.current);
      }
      const estable = debounceRef.current(crudo, ahora());
      setVisema((prev) => (prev === estable ? prev : estable));
      rafRef.current = requestAnimationFrame(loop);
    };

    const onSpeaking = (spk) => {
      setHablando(spk);
      hablandoRef.current = spk;
      if (spk) {
        inicioFallbackRef.current = ahora();
        debounceRef.current = crearDebounceVisema({ ms: debounceMs });
        intentarAnalizarReal(); // por si ya hay elemento
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(loop);
      } else {
        cancelAnimationFrame(rafRef.current);
        // suelta el analyser del elemento anterior (la fuente se cachea aparte)
        analyserRef.current = null;
        audioRef.current = null;
        bufRef.current = null;
        setVisema(VISEMA.CERRADA);
      }
    };

    // Estado inicial (por si ya estaba hablando al montar).
    if (ttsService.isAudioPlaying?.()) onSpeaking(true);

    const desuscribir = ttsService.onSpeakingChange(onSpeaking);
    return () => {
      desuscribir?.();
      cancelAnimationFrame(rafRef.current);
      analyserRef.current = null;
      audioRef.current = null;
      bufRef.current = null;
    };
  }, [activo, debounceMs]);

  return { visema, hablando };
}

export default useLipSync;
