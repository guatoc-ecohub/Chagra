import React, { useState, useCallback } from 'react';
import Angelita from '../visual/agente/Angelita';
import useAgentNotificationStore from '../store/useAgentNotificationStore';
import usePrefsStore from '../store/usePrefsStore';
import { isSpeaking, stop, replayLast, isKokoroAvailable } from '../services/ttsService';
import { agentSounds } from '../services/agentSoundService';
import { fvhSkinClass } from '../config/fvhSkin';
import './agent-fab-skin.css';

/**
 * AgentFab — Angelita, el agente vivo presente en TODA pantalla.
 *
 * Decisión del operador (2026-07-16): "Angelita como el agente, jubila el
 * colibrí". El FAB deja de ser un porthole con foto de colibrí: es Angelita
 * volando libre en la esquina — compañía, no interrupción. El colibrí
 * (barbudito) se retira del rol de asistente y queda de decoración en los
 * mundos 3D (faunaFuncional, rol polinizador).
 *
 * Sus tres momentos (rubber-hose, angelitaEstados.js):
 *   - default        → 'acompana': idle-cerebro vivo (flota, se acicala, se
 *                      posa a descansar) — presente sin hablar sola.
 *   - hover / focus  → 'escuchando': se posa y ladea la cabeza hacia usted.
 *   - tap / pressed  → 'contenta': brinquito de celebración al tocarla.
 *   - respuesta lista→ 'invita' + glow ámbar: "venga, le tengo algo".
 *
 * CONTEXTUAL POR PANTALLA: si el shell le pasa `pantalla` (currentView), al
 * tocarla navega al agente con `{ desdePantalla, spatialContext.pantalla }` —
 * AgentScreen saluda sobre ESA pantalla (saludoPantalla.js) y el LLM recibe
 * la pantalla en el pin espacial (spatialAgentContext.js).
 *
 * Double-click (Task #122, sin cambios): TTS hablando → stop + mute; TTS OFF
 * con último mensaje → replay + unmute.
 */
export default function AgentFab({ onNavigate, pantalla = null }) {
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);

  const responseReady = useAgentNotificationStore((s) => s.responseReady);
  const lastAssistantMessage = useAgentNotificationStore((s) => s.lastAssistantMessage);
  const ttsEnabled = usePrefsStore((s) => s.ttsEnabled);
  const setTtsEnabled = usePrefsStore((s) => s.setTtsEnabled);

  // Estado de Angelita: el tacto manda sobre el aviso, y el aviso sobre el idle.
  const estado = pressed
    ? 'contenta'
    : hover
      ? 'escuchando'
      : responseReady
        ? 'invita'
        : 'acompana';

  const handleEnter = () => setHover(true);
  const handleLeave = () => { setHover(false); setPressed(false); };
  const handleDown = () => setPressed(true);
  const handleUp = () => setPressed(false);

  const handleClick = () => {
    // El shell prod pasa `pantalla` (currentView): viaja como initialContext
    // para que el saludo y el pin espacial sean sobre la pantalla de origen.
    onNavigate('agente', pantalla
      ? { desdePantalla: pantalla, spatialContext: { pantalla } }
      : undefined);
  };

  // Task #122: double-click toggle silencia/reactiva audio global.
  const handleDoubleClick = useCallback(async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (isSpeaking() || ttsEnabled) {
      stop();
      setTtsEnabled(false);
      agentSounds.cancel();
      return;
    }
    if (lastAssistantMessage) {
      setTtsEnabled(true);
      const kokoroReady = await isKokoroAvailable();
      await replayLast({ useKokoro: kokoroReady });
      agentSounds.chime();
    } else {
      setTtsEnabled(true);
    }
  }, [ttsEnabled, lastAssistantMessage, setTtsEnabled]);

  return (
    <button
      type="button"
      className={fvhSkinClass(`chagra-fab${hover ? ' is-hover' : ''}${responseReady ? ' is-ready' : ''}`)}
      aria-label={responseReady ? 'Angelita (Chagra IA) tiene respuesta nueva' : 'Angelita, la asistente Chagra IA'}
      title={
        responseReady
          ? 'Angelita tiene respuesta nueva. Doble click silencia o reactiva la voz'
          : 'Hablar con Angelita. Doble click silencia o reactiva la voz'
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
        right: 14,
        width: 84,
        height: 84,
        borderRadius: '50%',
        // Angelita vuela LIBRE: sin plinto ni borde — una abeja en la esquina,
        // no un icono enfrascado. La legibilidad sobre cualquier fondo la pone
        // el drop-shadow de tinta; el aviso "respuesta lista", el glow ámbar
        // (.agt-avatar-glow via Angelita className + anillo .is-ready de
        // motion.css sobre el círculo táctil).
        border: 'none',
        background: 'transparent',
        color: 'white',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 40,
        padding: 0,
        overflow: 'visible',
        filter: 'drop-shadow(0 3px 6px rgba(10, 15, 26, 0.45))',
        transform: pressed ? 'scale(0.94)' : hover ? 'scale(1.08)' : 'scale(1)',
        transition: 'transform .18s cubic-bezier(.34,1.56,.64,1), filter .25s ease',
      }}
    >
      {/* pointer-events:none — CRÍTICO: el click debe caer en el BOTÓN, nunca
          en el SVG. Angelita se REMONTA al cambiar de estado (key=estado en su
          .agt-vuelo) y hover/pressed cambian el estado: si el mousedown cae en
          un nodo del dibujo que se desconecta antes del mouseup, el navegador
          se traga el click (verificado con playwright 2026-07-16). */}
      <span style={{ pointerEvents: 'none', display: 'flex' }} aria-hidden="true">
        <Angelita
          estado={estado}
          size={82}
          direccion="izquierda"
          className={responseReady ? 'agt-avatar-glow' : undefined}
          title="Angelita, la asistente de Chagra"
        />
      </span>
    </button>
  );
}
