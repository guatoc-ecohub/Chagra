/**
 * FieldFeedback — botón flotante 💬 + modal para que Lili (o cualquier
 * field tester) reporte fricciones UX inline durante el test.
 *
 * - Botón fixed bottom-right, no intrusivo
 * - Click → modal con: textarea + botón 🎤 grabar + tag auto (URL + viewport)
 * - Submit → persiste en LOGS store con type='field-feedback' (reusa
 *   schema v7 sin migration). Audio blob inline en el entry (IndexedDB
 *   acepta Blob nativamente).
 * - Bulk export futuro: script `npm run export:feedback` extrae todo
 *   y crea GitHub Issues en repo Chagra
 *
 * Audio capture (Lili — voto operador 2026-05-02): grabar es más rápido
 * que tipear "hice click acá y pasó X" en el campo. Reusa useVoiceRecorder
 * (mismo hook que VoiceCapture) — sin pipeline Whisper/qwen, solo Blob
 * crudo persistido para review humano post-sesión.
 *
 * Sin dependencia de html2canvas — Lili saca screenshot iPhone manual y
 * adjunta luego si quiere. Mantiene bundle liviano.
 */
import { useState, useEffect } from 'react';
import { openDB, STORES } from '../db/dbCore';
import useVoiceRecorder from '../hooks/useVoiceRecorder';

const FAB_SIZE = 52;
const COLOR_PRIMARY = '#0E92A6';
const COLOR_ACCENT = '#4ED4E5';
// Watchdog: si IndexedDB.add() cuelga (Android Chrome bajo presión OPFS
// reportado por Miguel 2026-05-02), forzamos fallback localStorage para
// evitar el "ciclo eterno" del botón Enviar.
const SUBMIT_TIMEOUT_MS = 8000;

const formatDuration = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${s}s`;
};

export default function FieldFeedback() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Audio state — el hook gestiona MediaRecorder + permisos + hard limit 30s.
  const { isRecording, audioLevel, durationMs, error: recorderError, start, stop, reset, hardLimitMs } = useVoiceRecorder();
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioMime, setAudioMime] = useState('');
  const [audioDur, setAudioDur] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);

  // Cleanup blob URL al cerrar/desmontar (evita leak memory).
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const handleStartRecord = async () => {
    setErrorMsg('');
    try {
      await start();
    } catch (err) {
      setErrorMsg(err?.message || 'No se pudo activar el micrófono');
    }
  };

  const handleStopRecord = async () => {
    try {
      const result = await stop();
      if (result?.blob) {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        const url = URL.createObjectURL(result.blob);
        setAudioBlob(result.blob);
        setAudioMime(result.mimeType);
        setAudioDur(result.durationMs);
        setAudioUrl(url);
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Error finalizando grabación');
    }
  };

  const handleDiscardAudio = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioMime('');
    setAudioDur(0);
    setAudioUrl(null);
    reset();
  };

  const handleClose = () => {
    if (isRecording) stop();
    handleDiscardAudio();
    setOpen(false);
    setText('');
    setSubmitted(false);
    setErrorMsg('');
  };

  const persistWithTimeout = (entry) => {
    return new Promise((resolve, reject) => {
      let settled = false;
      const watchdog = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error('IndexedDB timeout (8s) — fallback'));
        }
      }, SUBMIT_TIMEOUT_MS);

      (async () => {
        try {
          const db = await openDB();
          const tx = db.transaction(STORES.LOGS, 'readwrite');
          const store = tx.objectStore(STORES.LOGS);
          await new Promise((res, rej) => {
            const req = store.add(entry);
            req.onsuccess = res;
            req.onerror = () => rej(req.error);
          });
          if (!settled) {
            settled = true;
            clearTimeout(watchdog);
            resolve();
          }
        } catch (err) {
          if (!settled) {
            settled = true;
            clearTimeout(watchdog);
            reject(err);
          }
        }
      })();
    });
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    const hasText = text.trim().length > 0;
    const hasAudio = !!audioBlob;
    if (!hasText && !hasAudio) return;
    if (submitting) return;

    setSubmitting(true);
    setErrorMsg('');
    const entry = {
      id: `field-feedback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'field-feedback',
      timestamp: new Date().toISOString(),
      notes: text.trim(),
      audio: hasAudio
        ? {
            blob: audioBlob,
            mimeType: audioMime,
            durationMs: audioDur,
            sizeBytes: audioBlob.size,
          }
        : null,
      ctx: {
        url: window.location.pathname + window.location.hash,
        viewport: `${window.innerWidth}×${window.innerHeight}`,
        ua: navigator.userAgent.slice(0, 200),
        online: navigator.onLine,
      },
    };

    try {
      await persistWithTimeout(entry);
      setSubmitted(true);
      setText('');
      handleDiscardAudio();
      // No auto-cierre: Lili reportó 2026-05-01 que el modal cerraba
      // antes de que pudiera leer "Guardado", se sentía como bug. Ahora
      // el botón vuelve a "Enviar" pero el modal persiste hasta que el
      // user cierre con × o tap fuera (permite enviar feedback en cadena).
      setTimeout(() => setSubmitted(false), 1400);
    } catch (err) {
      // Fallback: persistir text en localStorage si IndexedDB falla o cuelga.
      // Audio NO se persiste en localStorage (binario + cuota 5MB rompe).
      try {
        const stored = JSON.parse(localStorage.getItem('field_feedback_fallback') || '[]');
        stored.push({
          ts: new Date().toISOString(),
          text,
          url: window.location.pathname,
          err: String(err),
          audioLost: hasAudio,
        });
        localStorage.setItem('field_feedback_fallback', JSON.stringify(stored));
        setSubmitted(true);
        setText('');
        handleDiscardAudio();
        if (hasAudio) {
          setErrorMsg('Texto guardado en fallback. Audio se perdió (storage degradado).');
        }
        setTimeout(() => setSubmitted(false), 1400);
      } catch {
        setErrorMsg('No se pudo guardar el feedback (storage lleno?). Anotalo manual.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const submitDisabled = submitting || (!text.trim() && !audioBlob) || isRecording;
  const recordingPct = Math.min(100, (durationMs / hardLimitMs) * 100);

  return (
    <>
      {/* FAB button */}
      <button
        type="button"
        aria-label="Reportar feedback"
        title="Reportar feedback de campo"
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: 18,
          right: 18,
          width: FAB_SIZE,
          height: FAB_SIZE,
          borderRadius: '50%',
          border: `2px solid ${COLOR_ACCENT}`,
          background: `linear-gradient(135deg, ${COLOR_PRIMARY} 0%, #075f6e 100%)`,
          color: '#fff',
          fontSize: 22,
          cursor: 'pointer',
          boxShadow: `0 4px 16px rgba(0,0,0,0.4), 0 0 14px ${COLOR_ACCENT}55`,
          zIndex: 9000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
      >
        💬
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.target === e.currentTarget && handleClose()}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 9001,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: '0 0 80px 0',
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{
              width: 'min(420px, 92vw)',
              background: '#0a0e14',
              border: `1px solid ${COLOR_ACCENT}55`,
              borderRadius: 8,
              padding: '1.2rem',
              boxShadow: `0 12px 40px rgba(0,0,0,0.6), 0 0 24px ${COLOR_ACCENT}33`,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.8rem',
              fontFamily: 'inherit',
              color: '#e6edf3',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.7rem', letterSpacing: '0.22em', color: COLOR_ACCENT, textTransform: 'uppercase', fontWeight: 700 }}>
                Field feedback
              </div>
              <button
                type="button"
                onClick={handleClose}
                style={{ background: 'transparent', border: 'none', color: '#8b9cab', fontSize: 18, cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div style={{ fontSize: '0.7rem', color: '#8b9cab', letterSpacing: '0.05em', lineHeight: 1.4 }}>
              Pantalla: <span style={{ color: COLOR_ACCENT }}>{window.location.pathname || '/'}</span>
              <br />
              {window.innerWidth}×{window.innerHeight} · {navigator.onLine ? 'online' : 'offline'}
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
              placeholder="Qué pasó, qué confundió, qué cambiarías…"
              style={{
                width: '100%',
                minHeight: 90,
                padding: '0.7rem',
                background: '#111824',
                border: `1px solid #1a3a4a`,
                borderRadius: 4,
                color: '#e6edf3',
                fontFamily: 'inherit',
                fontSize: '0.85rem',
                resize: 'vertical',
                outline: 'none',
              }}
              onFocus={(e) => { e.target.style.borderColor = COLOR_ACCENT; }}
              onBlur={(e) => { e.target.style.borderColor = '#1a3a4a'; }}
            />

            {/* Audio capture row */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                padding: '0.6rem',
                background: '#0d1421',
                border: `1px solid ${isRecording ? '#ef4444' : '#1a3a4a'}`,
                borderRadius: 4,
              }}
            >
              {!audioBlob && !isRecording && (
                <button
                  type="button"
                  onClick={handleStartRecord}
                  style={{
                    background: 'transparent',
                    color: COLOR_ACCENT,
                    border: `1px dashed ${COLOR_ACCENT}66`,
                    padding: '0.6rem',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                  }}
                >
                  🎤 Grabar audio (máx {hardLimitMs / 1000}s)
                </button>
              )}

              {isRecording && (
                <>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        color: '#ef4444',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: '#ef4444',
                          boxShadow: '0 0 8px #ef4444',
                          animation: 'pulse 1s ease-in-out infinite',
                        }}
                      />
                      REC {formatDuration(durationMs)}
                    </span>
                    <button
                      type="button"
                      onClick={handleStopRecord}
                      style={{
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        padding: '0.4rem 0.8rem',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: '0.72rem',
                        letterSpacing: '0.1em',
                        fontWeight: 600,
                      }}
                    >
                      ■ DETENER
                    </button>
                  </div>
                  {/* Level meter visual */}
                  <div
                    style={{
                      height: 4,
                      background: '#1a3a4a',
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max(2, audioLevel * 100)}%`,
                        height: '100%',
                        background: '#ef4444',
                        transition: 'width 80ms linear',
                      }}
                    />
                  </div>
                  {/* Time progress */}
                  <div
                    style={{
                      height: 2,
                      background: '#1a3a4a',
                      borderRadius: 1,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${recordingPct}%`,
                        height: '100%',
                        background: COLOR_ACCENT,
                      }}
                    />
                  </div>
                </>
              )}

              {audioBlob && !isRecording && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.72rem',
                      color: '#8b9cab',
                    }}
                  >
                    <span style={{ color: '#22c55e' }}>
                      ✓ Audio · {formatDuration(audioDur)} · {(audioBlob.size / 1024).toFixed(0)}KB
                    </span>
                    <button
                      type="button"
                      onClick={handleDiscardAudio}
                      style={{
                        background: 'transparent',
                        color: '#8b9cab',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.72rem',
                        textDecoration: 'underline',
                      }}
                    >
                      descartar
                    </button>
                  </div>
                  <audio
                    controls
                    src={audioUrl}
                    style={{ width: '100%', height: 32 }}
                  />
                </div>
              )}

              {recorderError && !isRecording && (
                <p style={{ fontSize: '0.7rem', color: '#fca5a5', margin: 0 }}>
                  Mic: {recorderError}
                </p>
              )}
            </div>

            {errorMsg && (
              <p style={{ fontSize: '0.7rem', color: '#fca5a5', margin: 0 }}>
                {errorMsg}
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.62rem', color: '#4a5664', letterSpacing: '0.08em' }}>
                Tip: tomá screenshot iPhone para anexar después
              </span>
              <button
                type="submit"
                disabled={submitDisabled}
                style={{
                  background: submitted ? '#22c55e' : COLOR_PRIMARY,
                  color: '#fff',
                  border: 'none',
                  padding: '0.55rem 1rem',
                  borderRadius: 4,
                  cursor: submitDisabled ? 'not-allowed' : 'pointer',
                  fontSize: '0.75rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  opacity: submitDisabled ? 0.5 : 1,
                  transition: 'background 200ms ease',
                }}
              >
                {submitted ? '✓ Guardado' : submitting ? '…' : 'Enviar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </>
  );
}
