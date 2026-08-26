import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Angelita from '../visual/agente/Angelita';
import useAgentNotificationStore from '../store/useAgentNotificationStore';
import usePrefsStore from '../store/usePrefsStore';
import { isSpeaking, stop, replayLast, isKokoroAvailable, speakSentences } from '../services/ttsService';
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
import useIdleDetection from '../hooks/useIdleDetection.js';
import BurbujaAngelita from '../visual/agente/BurbujaAngelita.jsx';
import AgentFabMenu from './AgentFabMenu';
import './agent-fab-skin.css';

function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

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
 * CONTEXTUAL POR PANTALLA: si el shell le pasa `pantalla` (currentView), el
 * menú "Enviar una foto" navega al agente con `{ desdePantalla,
 * spatialContext.pantalla, autoOpenCamera }` — AgentScreen saluda sobre ESA
 * pantalla (saludoPantalla.js) y el LLM recibe la pantalla en el pin espacial
 * (spatialAgentContext.js).
 *
 * Double-click (Task #122, sin cambios): TTS hablando → stop + mute; TTS OFF
 * con último mensaje → replay + unmute.
 *
 * ── R4 · MENÚ COMPACTO (`ops/COMPAI-MENU-DISENO-2026-08-25.md` §1.2 +
 * auditoría `ops/AUDITORIA-COMPAI-MENSAJES-2D-3D-2026-08-23.md`) ──────────
 * Tocar el FAB ya NO navega derecho al agente: abre `AgentFabMenu` (portado
 * del worktree `fix/compai-caminar-huesos-20260825`, no reinventado) con
 * cuatro opciones siempre visibles — Ver / Escuchar / Enviar una foto /
 * Callar hoy·🔔 (un solo interruptor, `useAngelitaStore.silenciar()`, con
 * rótulo e ícono que cambian según `silenciado`). "Ver" abre un panel corto
 * anclado junto al personaje con el aviso REAL vigente (o, si no hay aviso,
 * la última respuesta del chat, o una invitación genérica); "Escuchar" lee
 * EXACTAMENTE ese mismo texto por TTS — nunca una frase enlatada distinta
 * (regla dura del diseño: nada de "Estoy en {pantalla}…" tapando el aviso
 * adaptado). "Enviar una foto" dispara la cámara del agente de una.
 *
 * ── R2 · PEEK / IDLE-GATING (`AUDITORIA…` §7 P2, `COMPAI-MENU-DISENO…` §4) ──
 * Mientras el usuario USA la pantalla (mueve el mouse, toca, hace scroll o
 * escribe en cualquier campo — `useIdleDetection` + `compaiOcupado.estaOcupado()`
 * como gate universal, el mismo sensor que ya vive en el worktree para
 * `debeHablar`) el FAB se ATENÚA (opacidad + encoge un poco); dos segundos y
 * medio sin actividad → vuelve a su tamaño y brillo normal. Política v2 del
 * operador (2026-08-24, "visible 100%, nunca desaparece") sigue intacta: esto
 * SOLO atenúa, jamás oculta ni pone `pointer-events:none` — el personaje
 * siempre se puede tocar. El menú y el panel "Ver" abiertos cancelan la
 * atenuación (no tiene sentido encoger algo que el usuario está leyendo).
 */
export default function AgentFab({ onNavigate, pantalla = null }) {
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [panelAbierto, setPanelAbierto] = useState(false);

  const responseReady = useAgentNotificationStore((s) => s.responseReady);
  const lastAssistantMessage = useAgentNotificationStore((s) => s.lastAssistantMessage);
  const setResponseReady = useAgentNotificationStore((s) => s.setResponseReady);
  const setLastMessage = useAgentNotificationStore((s) => s.setLastMessage);
  const ttsEnabled = usePrefsStore((s) => s.ttsEnabled);
  const setTtsEnabled = usePrefsStore((s) => s.setTtsEnabled);
  const activeAlerts = useAlertStore((s) => s.activeAlerts);

  /* ── EL INTERRUPTOR MANUAL (R4, "Callar hoy / 🔔") ──────────────────────
     `silenciar()` ya existía en el store (auditoría 2026-07-26, #101/#103)
     pero SIN UI que lo llamara (`COMPAI-MENU-DISENO-2026-08-25.md` §1.2).
     Un solo control: silencio indefinido hasta que el usuario lo reactive —
     nada de "hoyNo" aparte, tal como pide el diseño aprobado. */
  const silenciado = useAngelitaStore((s) => s.silenciado);
  const silenciar = useAngelitaStore((s) => s.silenciar);
  const mensajeAngelita = useAngelitaStore((s) => s.mensaje);
  const tipoAngelita = useAngelitaStore((s) => s.tipo);

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
        // `ocupado` (P2/R2, diseño 2026-08-25): el motor esperaba esta señal
        // desde siempre y este effect nunca la pasaba (bug documentado en
        // `AUDITORIA-COMPAI-MENSAJES-2D-3D-2026-08-23.md` §R-C). Si el
        // campesino está escribiendo o a mitad de algo, solo pasa la
        // urgencia real — `debeHablar` ya sabe hacer esa excepción.
        const decision = useAngelitaStore.getState().evaluar({ notificaciones, ocupado: estaOcupado() });
        if (decision.interrumpe) {
          setLastMessage(decision.mensaje);
          setResponseReady(true);
        }
      })
      .catch(() => { /* degrada silencioso: sin dato real, la abeja no inventa aviso */ });
    return () => { vivo = false; };
  }, [activeAlerts, setLastMessage, setResponseReady]);

  // ── R2 · PEEK / IDLE-GATING ────────────────────────────────────────────
  // `idle` (useIdleDetection, ya existía y ya se probaba — no reinventado)
  // vuelve a `true` a los 2.5 s sin mousemove/touch/scroll/keydown/click en
  // TODA la ventana. `estaOcupado()` (compaiOcupado.js, portado del worktree)
  // suma la señal explícita que el DOM no ve (grabando voz, formulario a
  // medio llenar). El FAB se atenúa mientras cualquiera de las dos diga
  // "el usuario está usando la pantalla".
  const idleGlobal = useIdleDetection(2500);
  const usandoContenido = !idleGlobal || estaOcupado();
  const atenuado = usandoContenido && !hover && !pressed && !menuAbierto && !panelAbierto;

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

  // Contexto que el agente recibe al navegar (pantalla de origen, para el
  // saludo y el pin espacial) — lo usa "Enviar una foto".
  const contextoDePantalla = pantalla
    ? { desdePantalla: pantalla, spatialContext: { pantalla } }
    : {};

  // Tocar el FAB abre (o cierra) el menú compacto — ya NO navega derecho al
  // agente (R4). Si el panel "Ver" está abierto, un toque lo cierra primero
  // en vez de encimar el menú encima.
  const handleClick = () => {
    if (panelAbierto) { setPanelAbierto(false); return; }
    setMenuAbierto((v) => !v);
  };

  // Contenido de "Ver"/"Escuchar" — SIEMPRE el mismo texto en los dos
  // (regla dura del diseño): el aviso real vigente si lo hay; si no, la
  // última respuesta del chat; si tampoco, una invitación genérica que sí
  // nombra la pantalla (fallback, nunca tapa un aviso adaptado real).
  const contenidoPanel = useMemo(() => {
    if (mensajeAngelita) return { descripcion: mensajeAngelita, tipo: tipoAngelita || 'informativa' };
    if (lastAssistantMessage) return { descripcion: lastAssistantMessage, tipo: 'informativa' };
    const lugar = pantalla ? String(pantalla).replaceAll('_', ' ') : 'esta pantalla';
    return {
      descripcion: `Estoy con usted en ${lugar}. Toque «Enviar una foto» o pregúnteme lo que necesite.`,
      tipo: 'informativa',
    };
  }, [mensajeAngelita, tipoAngelita, lastAssistantMessage, pantalla]);

  /** Menú → "Ver": panel corto anclado junto al personaje, sin salto de pantalla. */
  const handleMenuVer = useCallback(() => {
    setMenuAbierto(false);
    setPanelAbierto(true);
  }, []);

  /** Menú → "Escuchar": lee por TTS el MISMO contenido que pinta "Ver". */
  const handleMenuEscuchar = useCallback(() => {
    setMenuAbierto(false);
    speakSentences(contenidoPanel.descripcion).catch(() => { /* degrada a solo texto */ });
  }, [contenidoPanel]);

  /** Menú → "Enviar una foto": abre el agente con la cámara ya disparada. */
  const handleMenuFoto = useCallback(() => {
    setMenuAbierto(false);
    onNavigate('agente', { ...contextoDePantalla, autoOpenCamera: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onNavigate, pantalla]);

  /** Menú → "Callar hoy" / "🔔 Reactivar": un solo toggle indefinido. */
  const handleAlternarSilencio = useCallback(() => {
    setMenuAbierto(false);
    silenciar(!silenciado);
  }, [silenciar, silenciado]);

  const handleMenuCerrar = useCallback(() => setMenuAbierto(false), []);
  const cerrarPanel = useCallback(() => setPanelAbierto(false), []);

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

  const reducedMotion = prefersReducedMotion();

  return (
    /* El puesto (costado inferior derecho) lo fija este envoltorio, NO el
       botón: así el menú y el panel "Ver" pueden anclarse con
       `position:absolute; bottom:100%` sobre el mismo `position:fixed` sin
       moverse un píxel del puesto de siempre. `pointerEvents:'none'` en el
       envoltorio para que su caja invisible no tape nada — solo el botón, el
       menú y el panel (cada uno con su propio `pointerEvents:'auto'`) reciben
       toque. */
    <div
      style={{
        position: 'fixed',
        bottom: 'max(90px, calc(env(safe-area-inset-bottom) + 90px))',
        right: 14,
        width: 84,
        height: 84,
        zIndex: 40,
        pointerEvents: 'none',
      }}
    >
      <button
        type="button"
        className={fvhSkinClass(`chagra-fab${hover ? ' is-hover' : ''}${responseReady ? ' is-ready' : ''}${silenciado ? ' is-silenciada' : ''}`)}
        aria-label={
          silenciado
            ? 'Angelita (Chagra IA), en silencio. Toque para abrir el menú'
            : responseReady
              ? 'Angelita (Chagra IA) tiene respuesta nueva. Toque para abrir el menú'
              : 'Angelita, la asistente Chagra IA. Toque para abrir el menú'
        }
        title={
          silenciado
            ? 'Angelita está en silencio hasta que usted la reactive. Doble click reactiva la voz'
            : responseReady
              ? 'Angelita tiene respuesta nueva. Doble click silencia o reactiva la voz'
              : 'Toque para ver, escuchar, enviar una foto o callar. Doble click silencia o reactiva la voz'
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
          filter: 'drop-shadow(0 3px 6px rgba(10, 15, 26, 0.45))',
          // R2: atenuado NUNCA baja de una opacidad legible ni desaparece
          // (política v2 del operador, "visible 100%") — solo se encoge y
          // se apaga un poco mientras el usuario usa el contenido.
          opacity: atenuado ? 0.5 : 1,
          transform: pressed
            ? 'scale(0.94)'
            : hover
              ? 'scale(1.08)'
              : atenuado
                ? 'scale(0.82)'
                : 'scale(1)',
          transition: reducedMotion
            ? 'none'
            : 'transform .18s cubic-bezier(.34,1.56,.64,1), filter .25s ease, opacity .22s ease',
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

      <AgentFabMenu
        abierto={menuAbierto}
        onVer={handleMenuVer}
        onEscuchar={handleMenuEscuchar}
        onFoto={handleMenuFoto}
        silenciado={silenciado}
        onAlternarSilencio={handleAlternarSilencio}
        onCerrar={handleMenuCerrar}
      />

      {panelAbierto && (
        <div
          role="dialog"
          aria-label="Mensaje de Angelita"
          style={{
            position: 'absolute',
            bottom: '100%',
            right: 0,
            marginBottom: 10,
            zIndex: 41,
            pointerEvents: 'auto',
            minWidth: 240,
            maxWidth: 288,
          }}
        >
          <div style={{ position: 'relative' }}>
            <BurbujaAngelita mensaje={contenidoPanel.descripcion} tipo={contenidoPanel.tipo} />
            <button
              type="button"
              onClick={cerrarPanel}
              aria-label="Cerrar el mensaje de Angelita"
              style={{
                position: 'absolute',
                top: -8,
                right: -8,
                width: 24,
                height: 24,
                borderRadius: '50%',
                border: 'none',
                background: 'rgb(15 23 42 / 0.92)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 14,
                lineHeight: '24px',
                padding: 0,
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
