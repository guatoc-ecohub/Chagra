import { useState, useRef, useCallback, useEffect } from 'react';

const HARD_LIMIT_MS = 30000;
const AMPLITUDE_HISTORY = 60;

const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
];

const pickMimeType = (): string | null => {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const m of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return '';
};

export interface VoiceStopResult {
  blob: Blob;
  durationMs: number;
  mimeType: string;
}

export interface UseVoiceRecorderResult {
  isRecording: boolean;
  audioLevel: number;
  amplitudeHistory: number[];
  durationMs: number;
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<VoiceStopResult | null>;
  reset: () => void;
  hardLimitMs: number;
}

type LegacyWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

export default function useVoiceRecorder(): UseVoiceRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [amplitudeHistory, setAmplitudeHistory] = useState<number[]>([]);
  const [durationMs, setDurationMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const hardStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTsRef = useRef<number>(0);
  const stopResolveRef = useRef<((result: VoiceStopResult | null) => void) | null>(null);

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

  const sampleAmplitude = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buf = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const sample = buf[i] ?? 128;
      const v = (sample - 128) / 128;
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
    rafRef.current = requestAnimationFrame(sampleAmplitude);
  }, []);

  const stop = useCallback((): Promise<VoiceStopResult | null> => {
    return new Promise((resolve) => {
      const rec = recorderRef.current;
      if (!rec || rec.state === 'inactive') {
        resolve(null);
        return;
      }
      stopResolveRef.current = resolve;
      try { rec.stop(); } catch {
        resolve(null);
      }
    });
  }, []);

  const start = useCallback(async (): Promise<void> => {
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

      const legacyWindow = window as LegacyWindow;
      const AC = window.AudioContext || legacyWindow.webkitAudioContext;
      if (!AC) throw new Error('AudioContext no disponible');
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
      };
      rec.onerror = (e: Event) => {
        const mediaErr = (e as { error?: { message?: string } }).error;
        setError(mediaErr?.message || 'Error de MediaRecorder');
      };

      rec.start();
      setIsRecording(true);
      startTsRef.current = Date.now();
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
      setError((err as Error).message || 'No se pudo iniciar la grabación');
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
