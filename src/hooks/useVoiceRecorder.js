import { useState, useRef, useCallback, useEffect } from 'react';
import { recordEvent } from '../services/voiceTelemetryService.js';

const HARD_LIMIT_MS = 30000;
const AMPLITUDE_HISTORY = 60;

const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
];

const pickMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const m of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return '';
};

/**
 * Hook que gestiona el ciclo de vida de MediaRecorder para grabación de voz.
 * Negocia el tipo MIME soportado, analiza la amplitud en tiempo real mediante
 * AnalyserNode y detiene automáticamente la grabación a los 30 segundos.
 *
 * @returns {{
 *   isRecording: boolean,
 *   audioLevel: number,
 *   amplitudeHistory: number[],
 *   durationMs: number,
 *   error: (string|null),
 *   start: Function,
 *   stop: Function,
 *   reset: Function,
 *   hardLimitMs: number
 * }} Estado y controles de la grabadora de voz.
 */
export default function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [amplitudeHistory, setAmplitudeHistory] = useState([]);
  const [durationMs, setDurationMs] = useState(0);
  const [error, setError] = useState(null);

  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const hardStopTimerRef = useRef(null);
  const durationTimerRef = useRef(null);
  const startTsRef = useRef(0);
  const stopResolveRef = useRef(null);

  const cleanup = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (hardStopTimerRef.current) { clearTimeout(hardStopTimerRef.current); hardStopTimerRef.current = null; }
    if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null; }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const sampleAmplitude = useCallback(function sample() {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buf = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / buf.length);
    const level = Math.min(1, rms * 2.5);
    setAudioLevel(level);
    setAmplitudeHistory((prev) => {
      const next = prev.length >= AMPLITUDE_HISTORY ? prev.slice(1) : prev.slice();
      next.push(level);
      return next;
    });
    rafRef.current = requestAnimationFrame(sample);
  }, []);

  const stop = useCallback(() => {
    return new Promise((resolve) => {
      const rec = recorderRef.current;
      if (!rec || rec.state === 'inactive') {
        resolve(null);
        return;
      }
      stopResolveRef.current = resolve;
      try { rec.stop(); } catch (_) { resolve(null); }
    });
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setAudioLevel(0);
    setAmplitudeHistory([]);
    setDurationMs(0);
    chunksRef.current = [];

    if (!navigator.mediaDevices?.getUserMedia) {
      const err = new Error('MediaDevices no disponible en este navegador');
      setError(err.message);
      throw err;
    }

    const mimeType = pickMimeType();
    if (mimeType === null) {
      const err = new Error('MediaRecorder no soportado');
      setError(err.message);
      throw err;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AC = (window.AudioContext || window.webkitAudioContext);
      const ctx = new AC();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      analyserRef.current = analyser;

      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = rec;

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const finalMime = mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: finalMime });
        const dur = Date.now() - startTsRef.current;
        setIsRecording(false);
        cleanup();
        if (stopResolveRef.current) {
          stopResolveRef.current({ blob, durationMs: dur, mimeType: finalMime });
          stopResolveRef.current = null;
        }
        recordEvent({
          event_type: 'voice_capture_complete',
          flujo: 'voice_recorder',
          duration_ms: dur,
          accepted: null,
          edits: null,
          connectivity: navigator.onLine ? 'online' : 'offline',
        }).catch(() => {});
      };
      rec.onerror = (e) => {
        setError(e.error?.message || 'Error de MediaRecorder');
        recordEvent({
          event_type: 'voice_capture_abort',
          flujo: 'voice_recorder',
          duration_ms: null,
          accepted: null,
          edits: null,
          connectivity: navigator.onLine ? 'online' : 'offline',
        }).catch(() => {});
      };

      // timeslice 250ms: fuerza `dataavailable` periódico. Sin él, algunos
      // navegadores móviles entregan un único chunk al stop() que puede salir
      // vacío/truncado → webm con header EBML inválido → Whisper HTTP 500
      // "Failed to load audio: End of file". Con timeslice los chunks se
      // acumulan y el Blob final siempre tiene contenedor válido.
      rec.start(250);
      setIsRecording(true);
      startTsRef.current = Date.now();

      recordEvent({
        event_type: 'voice_capture_start',
        flujo: 'voice_recorder',
        duration_ms: null,
        accepted: null,
        edits: null,
        connectivity: navigator.onLine ? 'online' : 'offline',
      }).catch(() => {});
      rafRef.current = requestAnimationFrame(sampleAmplitude);
      durationTimerRef.current = setInterval(() => {
        setDurationMs(Date.now() - startTsRef.current);
      }, 100);
      hardStopTimerRef.current = setTimeout(() => {
        if (recorderRef.current && recorderRef.current.state === 'recording') {
          recorderRef.current.stop();
        }
      }, HARD_LIMIT_MS);
    } catch (err) {
      setError(err.message || 'No se pudo iniciar la grabación');
      cleanup();
      setIsRecording(false);
      throw err;
    }
  }, [cleanup, sampleAmplitude]);

  const reset = useCallback(() => {
    cleanup();
    setIsRecording(false);
    setAudioLevel(0);
    setAmplitudeHistory([]);
    setDurationMs(0);
    setError(null);
  }, [cleanup]);

  return {
    isRecording,
    audioLevel,
    amplitudeHistory,
    durationMs,
    error,
    start,
    stop,
    reset,
    hardLimitMs: HARD_LIMIT_MS,
  };
}
