import React, { useState, useCallback } from 'react';
import ChagraAgentAvatar from './ChagraAgentAvatar';
import useAgentNotificationStore from '../store/useAgentNotificationStore';
import usePrefsStore from '../store/usePrefsStore';
import { isSpeaking, stop, replayLast, isKokoroAvailable } from '../services/ttsService';
import { agentSounds } from '../services/agentSoundService';
import { fvhSkinClass } from '../config/fvhSkin';
import { colibriRealActivo } from '../config/colibriFlag';
import { BarbuditoPosado } from './colibri/Barbudito';
import './agent-fab-skin.css';

// ¿Avatar del FAB = colibrí REAL (barbudito posado)? Gateado por VITE_COLIBRI
// (dev-only). Con la flag OFF (prod) el FAB conserva su avatar actual
// (ChagraAgentAvatar). Se evalúa una sola vez (flag de build).
const COLIBRI_REAL = colibriRealActivo();

/**
 * AgentFab — Floating Action Button para abrir el agente Chagra IA.
 *
 * Operator 2026-05-19:
 *   - default state idle (alas batiendo suave, vuelo estacionario).
 *   - mouse over → estado `thinking` (colibri se acerca a libar la flor).
 *   - mouse down / pulsacion → estado `speaking` mas breve para sentir el feedback.
 *   - touch (mobile) → estado `thinking` mientras se mantiene el toque.
 *
 * Task #122 (2026-05-23): el FAB ahora es el avatar global. Lee de
 * `useAgentNotificationStore`:
 *   - `responseReady` → glow drop-shadow amber para anunciar "respuesta lista"
 *     mientras el operador está en otra pantalla.
 * Double-click handler:
 *   - Si TTS está reproduciendo → stop() inmediato + ttsEnabled=false.
 *   - Si TTS OFF y hay último mensaje → replayLast() + ttsEnabled=true.
 *   - Si no hay nada que reproducir, no-op (sin error visible).
 * Single click → abrir AgentScreen (comportamiento previo).
 *
 * El FAB tambien escala 1.06x al hover/active para feedback claro de boton
 * sin perder el sello visual del colibri.
 */
export default function AgentFab({ onNavigate }) {
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);

  const responseReady = useAgentNotificationStore((s) => s.responseReady);
  const lastAssistantMessage = useAgentNotificationStore((s) => s.lastAssistantMessage);
  const ttsEnabled = usePrefsStore((s) => s.ttsEnabled);
  const setTtsEnabled = usePrefsStore((s) => s.setTtsEnabled);

  // Estado del avatar:
  // - pressed -> 'speaking' (cuerpo bob, plumaje pulsa) durante el tap
  // - hover -> 'thinking' (sip motion hacia la flor)
  // - default -> 'idle'
  const state = pressed ? 'speaking' : hover ? 'thinking' : 'idle';

  const handleEnter = () => setHover(true);
  const handleLeave = () => { setHover(false); setPressed(false); };
  const handleDown = () => setPressed(true);
  const handleUp = () => setPressed(false);

  const handleClick = () => {
    onNavigate('agente');
  };

  // Task #122: double-click toggle silencia/reactiva audio global.
  // - Si está hablando (Kokoro o Web Speech) → stop() + ttsEnabled OFF.
  // - Si silenciado y hay last message → replayLast() + ttsEnabled ON.
  // - Sin último mensaje: feedback sutil (cancel sound) y no-op de TTS.
  const handleDoubleClick = useCallback(async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (isSpeaking() || ttsEnabled) {
      // Cualquier playback activo OR estado "enabled" lo apagamos
      stop();
      setTtsEnabled(false);
      agentSounds.cancel();
      return;
    }
    // TTS OFF: reactivar + replay si hay algo cacheado
    if (lastAssistantMessage) {
      setTtsEnabled(true);
      const kokoroReady = await isKokoroAvailable();
      await replayLast({ useKokoro: kokoroReady });
      agentSounds.chime();
    } else {
      // No hay nada que reproducir. Reactivamos el toggle igual para que
      // futuras respuestas suenen, pero sin chime engañoso.
      setTtsEnabled(true);
    }
  }, [ttsEnabled, lastAssistantMessage, setTtsEnabled]);

  return (
    <button
      type="button"
      className={fvhSkinClass(`chagra-fab${hover ? ' is-hover' : ''}${responseReady ? ' is-ready' : ''}`)}
      aria-label={responseReady ? 'Chagra IA tiene respuesta nueva' : 'Asistente Chagra IA'}
      title={
        responseReady
          ? 'Chagra IA tiene respuesta nueva. Doble click silencia o reactiva la voz'
          : 'Hablar con Chagra IA. Doble click silencia o reactiva la voz'
      }
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
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
        border: responseReady
          ? '2px solid rgba(255,183,0,.7)'
          : '2px solid rgba(16,185,129,.55)',
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
        transition: 'transform .18s cubic-bezier(.34,1.56,.64,1), box-shadow .25s ease, background .25s ease, border-color .25s ease',
      }}
    >
      {COLIBRI_REAL ? (
        // Colibrí REAL (barbudito POSADO recortado), con un leve flotar. El
        // botón ya es circular y recorta (overflow:hidden).
        <BarbuditoPosado size={46} ariaLabel="Chagra IA" />
      ) : (
        <ChagraAgentAvatar state={state} size={48} ariaLabel="Chagra IA" glow={responseReady} />
      )}
    </button>
  );
}
