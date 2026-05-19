import React, { useState } from 'react';
import ChagraAgentAvatar from './ChagraAgentAvatar';

/**
 * AgentFab — Floating Action Button para abrir el agente Chagra IA.
 *
 * Operator 2026-05-19:
 *   - default state idle (alas batiendo suave, vuelo estacionario).
 *   - mouse over → estado `thinking` (colibri se acerca a libar la flor).
 *   - mouse down / pulsacion → estado `speaking` mas breve para sentir el feedback.
 *   - touch (mobile) → estado `thinking` mientras se mantiene el toque.
 *
 * El FAB tambien escala 1.06x al hover/active para feedback claro de boton
 * sin perder el sello visual del colibri.
 */
export default function AgentFab({ onNavigate }) {
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);

  // Estado del avatar:
  // - pressed -> 'speaking' (cuerpo bob, plumaje pulsa) durante el tap
  // - hover -> 'thinking' (sip motion hacia la flor)
  // - default -> 'idle'
  const state = pressed ? 'speaking' : hover ? 'thinking' : 'idle';

  const handleEnter = () => setHover(true);
  const handleLeave = () => { setHover(false); setPressed(false); };
  const handleDown = () => setPressed(true);
  const handleUp = () => setPressed(false);

  return (
    <button
      type="button"
      aria-label="Asistente Chagra IA"
      title="Hablar con Chagra IA"
      onClick={() => onNavigate('agente')}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onMouseDown={handleDown}
      onMouseUp={handleUp}
      onTouchStart={() => { setHover(true); setPressed(true); }}
      onTouchEnd={() => { setHover(false); setPressed(false); }}
      onFocus={handleEnter}
      onBlur={handleLeave}
      style={{
        position: 'fixed',
        bottom: 'max(90px, calc(env(safe-area-inset-bottom) + 90px))',
        right: 18,
        width: 56,
        height: 56,
        borderRadius: '50%',
        border: '2px solid rgba(16,185,129,.55)',
        background: hover
          ? 'radial-gradient(circle at 30% 25%, #1e3a2f 0%, #0a1320 70%)'
          : 'radial-gradient(circle at 30% 25%, #1e293b 0%, #0f172a 70%)',
        color: 'white',
        cursor: 'pointer',
        boxShadow: hover
          ? '0 6px 22px rgba(0,0,0,0.5), 0 0 22px rgba(16,185,129,.65), 0 0 6px rgba(6,182,212,.45) inset'
          : '0 4px 16px rgba(0,0,0,0.4), 0 0 14px rgba(16,185,129,.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 40,
        padding: 0,
        overflow: 'hidden',
        transform: pressed ? 'scale(0.95)' : hover ? 'scale(1.06)' : 'scale(1)',
        transition: 'transform .18s cubic-bezier(.34,1.56,.64,1), box-shadow .25s ease, background .25s ease',
      }}
    >
      <ChagraAgentAvatar state={state} size={48} ariaLabel="Chagra IA" />
    </button>
  );
}
