/**
 * FieldFeedback — botón flotante 💬 + modal para que Lili (o cualquier
 * field tester) reporte fricciones UX inline durante el test.
 *
 * - Botón fixed bottom-right, no intrusivo
 * - Click → modal con: textarea + tag auto (URL actual + viewport)
 * - Submit → persiste en LOGS store con type='field-feedback' (reusa
 *   schema v7 sin migration)
 * - Bulk export futuro: script `npm run export:feedback` extrae todo
 *   y crea GitHub Issues en repo Chagra
 *
 * Sin dependencia de html2canvas — Lili saca screenshot iPhone manual y
 * adjunta luego si quiere. Mantiene bundle liviano.
 */
import { useState } from 'react';
import { openDB, STORES } from '../db/dbCore';

const FAB_SIZE = 52;
const COLOR_PRIMARY = '#0E92A6';
const COLOR_ACCENT = '#4ED4E5';

export default function FieldFeedback() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const db = await openDB();
      const tx = db.transaction(STORES.LOGS, 'readwrite');
      const store = tx.objectStore(STORES.LOGS);
      const entry = {
        id: `field-feedback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: 'field-feedback',
        timestamp: new Date().toISOString(),
        notes: text.trim(),
        ctx: {
          url: window.location.pathname + window.location.hash,
          viewport: `${window.innerWidth}×${window.innerHeight}`,
          ua: navigator.userAgent.slice(0, 200),
          online: navigator.onLine,
        },
      };
      await new Promise((resolve, reject) => {
        const req = store.add(entry);
        req.onsuccess = resolve;
        req.onerror = () => reject(req.error);
      });
      setSubmitted(true);
      setText('');
      setTimeout(() => {
        setSubmitted(false);
        setOpen(false);
      }, 1400);
    } catch (err) {
      // Fallback: persistir en localStorage si IndexedDB falla
      try {
        const stored = JSON.parse(localStorage.getItem('field_feedback_fallback') || '[]');
        stored.push({
          ts: new Date().toISOString(),
          text,
          url: window.location.pathname,
          err: String(err),
        });
        localStorage.setItem('field_feedback_fallback', JSON.stringify(stored));
        setSubmitted(true);
        setText('');
        setTimeout(() => { setSubmitted(false); setOpen(false); }, 1400);
      } catch {
        alert('No se pudo guardar el feedback (storage lleno?). Anotalo manual y reportá.');
      }
    } finally {
      setSubmitting(false);
    }
  };

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
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
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
                onClick={() => setOpen(false)}
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
                minHeight: 110,
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

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.62rem', color: '#4a5664', letterSpacing: '0.08em' }}>
                Tip: tomá screenshot iPhone para anexar después
              </span>
              <button
                type="submit"
                disabled={submitting || !text.trim()}
                style={{
                  background: submitted ? '#22c55e' : COLOR_PRIMARY,
                  color: '#fff',
                  border: 'none',
                  padding: '0.55rem 1rem',
                  borderRadius: 4,
                  cursor: submitting || !text.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '0.75rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  opacity: !text.trim() ? 0.5 : 1,
                  transition: 'background 200ms ease',
                }}
              >
                {submitted ? '✓ Guardado' : submitting ? '…' : 'Enviar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
