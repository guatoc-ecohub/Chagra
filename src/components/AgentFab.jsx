import React, { useState, useCallback, useEffect, useRef } from 'react';
import Angelita from '../visual/agente/Angelita';
import useAgentNotificationStore from '../store/useAgentNotificationStore';
import usePrefsStore from '../store/usePrefsStore';
import { isSpeaking, stop, replayLast, isKokoroAvailable } from '../services/ttsService';
import { agentSounds } from '../services/agentSoundService';
import { fvhSkinClass } from '../config/fvhSkin';
/* EL CEREBRO DE ANGELITA (auditoría 2026-07-18: construido y DESCONECTADO).
   El FAB vive en TODA pantalla — es el lugar correcto para que
   `notificacionesInteligentes()` (qué atender hoy, con datos REALES) llegue
   como aviso de la abeja sin esperar a que el operador abra el chat. */
import useAngelitaStore from '../store/useAngelitaStore';
import useAlertStore from '../store/useAlertStore';
import useLogStore from '../store/useLogStore';
import { notificacionesInteligentes } from '../services/angelitaInteligencia';
import { estaOcupado } from '../services/compaiOcupado.js';
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

  /* ── EL INTERRUPTOR (auditoría 2026-07-26, ítems #101 y #103) ─────────────
     `silenciar()` existía en el store desde el principio y NO TENÍA UN SOLO
     BOTÓN que lo llamara: la función estaba ahí y nadie podía usarla. Un
     personaje omnipresente sin interruptor visible es una decisión de
     producto agresiva — y es, además, el permiso que compra todo lo demás
     (subir la presencia al 35% sin válvula de escape es cómo nació Clippy).
     Dos caminos al mismo flag, porque molesta AHORA y tres pantallas hasta un
     switch equivale a no tenerlo:
       · un botón visible pegado al personaje (accesible, con foco propio),
       · mantener presionado sobre el personaje mismo (600 ms). */
  const silenciado = useAngelitaStore((s) => s.silenciado);
  const silenciar = useAngelitaStore((s) => s.silenciar);
  const timerLargo = useRef(null);
  const fueLargo = useRef(false);

  const alternarSilencio = useCallback(() => {
    silenciar(!useAngelitaStore.getState().silenciado);
  }, [silenciar]);

  const iniciarPulsacionLarga = useCallback(() => {
    fueLargo.current = false;
    if (timerLargo.current) clearTimeout(timerLargo.current);
    timerLargo.current = setTimeout(() => {
      fueLargo.current = true;
      alternarSilencio();
      // Aviso háptico: en el campo, con guantes, el dedo confirma antes que el ojo.
      try { navigator.vibrate?.(silenciado ? [12, 40, 12] : 22); } catch { /* sin motor */ }
    }, 600);
  }, [alternarSilencio, silenciado]);

  const soltarPulsacionLarga = useCallback(() => {
    if (timerLargo.current) { clearTimeout(timerLargo.current); timerLargo.current = null; }
  }, []);

  useEffect(() => () => { if (timerLargo.current) clearTimeout(timerLargo.current); }, []);

  const responseReady = useAgentNotificationStore((s) => s.responseReady);
  const lastAssistantMessage = useAgentNotificationStore((s) => s.lastAssistantMessage);
  const setResponseReady = useAgentNotificationStore((s) => s.setResponseReady);
  const setLastMessage = useAgentNotificationStore((s) => s.setLastMessage);
  const ttsEnabled = usePrefsStore((s) => s.ttsEnabled);
  const setTtsEnabled = usePrefsStore((s) => s.setTtsEnabled);
  const activeAlerts = useAlertStore((s) => s.activeAlerts);

  // ── EL CEREBRO, CABLEADO (auditoría 2026-07-18): notificacionesInteligentes
  //    decide QUÉ atender hoy con datos REALES (alertas activas + tareas
  //    vencidas de useLogStore) — antes nadie la llamaba. Si de verdad hay
  //    algo Y la anti-molestia del propio store lo deja pasar (cooldown,
  //    nunca a mitad de un husmeo que la abeja del valle ya esté mostrando),
  //    el FAB brilla con el MISMO aviso — cero dato inventado, cero glow
  //    porque sí. Re-evalúa cuando cambian las alertas reales.
  useEffect(() => {
    let vivo = true;
    useLogStore.getState().getPendingTasks()
      .then((pendingTasks) => {
        if (!vivo) return;
        const notificaciones = notificacionesInteligentes({ activeAlerts, pendingTasks });
        if (!notificaciones.hay) return; // nada real que avisar: no tocar el store compartido
        if (useAngelitaStore.getState().estado === 'husmea') return; // no le quita el turno a un husmeo en curso
        // `ocupado`: la señal que el motor esperaba desde siempre y ninguna
        // pantalla 2D alimentaba (auditoría 2026-07-26, ítem #28). Si el
        // campesino está escribiendo o grabando, sólo pasa la urgencia real
        // — `debeHablar` ya sabe hacer esa excepción.
        const decision = useAngelitaStore.getState().evaluar({ notificaciones, ocupado: estaOcupado() });
        if (decision.interrumpe) {
          setLastMessage(decision.mensaje);
          setResponseReady(true);
        }
      })
      .catch(() => { /* degrada silencioso: sin dato real, la abeja no inventa aviso */ });
    return () => { vivo = false; };
  }, [activeAlerts, setLastMessage, setResponseReady]);

  // Estado de Angelita: el tacto manda sobre el aviso, y el aviso sobre el idle.
  const estado = pressed
    ? 'contenta'
    : hover
      ? 'escuchando'
      : responseReady
        ? 'invita'
        : 'acompana';

  const handleEnter = () => setHover(true);
  const handleLeave = () => { setHover(false); setPressed(false); soltarPulsacionLarga(); };
  const handleDown = () => { setPressed(true); iniciarPulsacionLarga(); };
  const handleUp = () => { setPressed(false); soltarPulsacionLarga(); };

  const handleClick = () => {
    // Si la pulsación larga ya silenció, el dedo NO debe además abrir el
    // agente: el gesto fue "cállese", no "hábleme".
    if (fueLargo.current) { fueLargo.current = false; return; }
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
    /* El puesto (costado inferior derecho, SPEC) lo fija ahora este envoltorio,
       no el botón: así el interruptor de silencio puede ser un botón HERMANO
       de verdad — enfocable, con su propio nombre accesible — en vez de un
       `<button>` anidado (HTML inválido) o un `div` con `onClick` (invisible
       para el teclado y el lector de pantalla). El puesto no se movió ni un
       píxel: las mismas coordenadas de siempre. */
    <div
      style={{
        position: 'fixed',
        bottom: 'max(90px, calc(env(safe-area-inset-bottom) + 90px))',
        right: 14,
        width: 84,
        height: 84,
        zIndex: 40,
        pointerEvents: 'none', // sólo los hijos reciben toque: el hueco no tapa nada
      }}
    >
      <button
        type="button"
        className={fvhSkinClass(`chagra-fab${hover ? ' is-hover' : ''}${responseReady ? ' is-ready' : ''}${silenciado ? ' is-silenciada' : ''}`)}
        aria-label={
          silenciado
            ? 'Angelita, la asistente Chagra IA (en silencio). Tocar para hablarle'
            : responseReady
              ? 'Angelita (Chagra IA) tiene respuesta nueva'
              : 'Angelita, la asistente Chagra IA'
        }
        title={
          silenciado
            ? 'Angelita está en silencio: no le avisa nada hasta que usted la vuelva a prender. Tocar para hablarle igual'
            : responseReady
              ? 'Angelita tiene respuesta nueva. Mantener presionado para que se quede callada'
              : 'Hablar con Angelita. Mantener presionado para que se quede callada'
        }
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onMouseDown={handleDown}
        onMouseUp={handleUp}
        onTouchStart={() => { setHover(true); setPressed(true); iniciarPulsacionLarga(); }}
        onTouchEnd={() => { setHover(false); setPressed(false); soltarPulsacionLarga(); }}
        onTouchCancel={() => { setHover(false); setPressed(false); soltarPulsacionLarga(); }}
        onFocus={handleEnter}
        onBlur={handleLeave}
        style={{
          position: 'absolute',
          inset: 0,
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
          padding: 0,
          overflow: 'visible',
          pointerEvents: 'auto',
          // En silencio se atenúa y se desatura: el personaje SE VE apagado, no
          // desaparece. Que se note que está ahí, callado porque usted lo pidió.
          filter: silenciado
            ? 'drop-shadow(0 3px 6px rgba(10, 15, 26, 0.35)) grayscale(0.72) opacity(0.55)'
            : 'drop-shadow(0 3px 6px rgba(10, 15, 26, 0.45))',
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

      {/* EL INTERRUPTOR VISIBLE. Pegado al personaje, no enterrado en ajustes:
          cuando molesta, molesta AHORA. 30 px de diana táctil, contraste
          propio para que se lea sobre cualquier fondo del valle, y
          `aria-pressed` para que un lector de pantalla diga si está activo. */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); alternarSilencio(); }}
        aria-pressed={silenciado}
        aria-label={silenciado ? 'Volver a oír a Angelita' : 'Que Angelita se quede callada'}
        title={silenciado ? 'Volver a oír a Angelita' : 'Que Angelita se quede callada'}
        style={{
          position: 'absolute',
          top: -2,
          left: -6,
          width: 30,
          height: 30,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.35)',
          background: silenciado ? 'rgba(184, 78, 62, 0.92)' : 'rgba(18, 26, 22, 0.62)',
          color: '#fff',
          fontSize: 14,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
          pointerEvents: 'auto',
          boxShadow: '0 2px 5px rgba(10,15,26,0.45)',
          transition: 'background .2s ease, transform .18s cubic-bezier(.34,1.56,.64,1)',
        }}
      >
        <span aria-hidden="true">{silenciado ? '🔕' : '🔔'}</span>
      </button>
    </div>
  );
}
