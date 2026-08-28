import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Volume2 } from 'lucide-react';
import ChagraAgentAvatar from './ChagraAgentAvatar';
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
import { activarEscucha } from '../services/escuchaService';
import { useCompaiClimaVivo } from '../hooks/useCompaiClimaVivo';
import { useCompaiSusurroNocturno } from '../hooks/useCompaiSusurroNocturno';
import { useCompaiAgroecologiaReal } from '../hooks/useCompaiAgroecologiaReal';
import useTtsAmplitude, { visemaFromAmplitude } from '../hooks/useTtsAmplitude.js';
import useAgentAvatarType, { AVATAR_NOMBRE, DEFAULT_AVATAR_TYPE } from '../hooks/useAgentAvatarType.js';
import { getHintForRuta } from '../config/compaiHints.js';
import AgentFabMenu from './AgentFabMenu';
import BurbujaPizarraPeek from './BurbujaPizarraPeek';
import useComportamientoCompai from '../hooks/useComportamientoCompai.js';
import useCompaiDraggable from '../hooks/useCompaiDraggable';
import './agent-fab-skin.css';

/**
 * AgentFab — el compAI elegido por el usuario, vivo, presente en TODA pantalla.
 *
 * Decisión del operador (2026-07-16): "Angelita como el agente, jubila el
 * colibrí". El FAB deja de ser un porthole con foto de colibrí: es el compAI
 * elegido (Angelita por defecto, o la planta de maíz si el usuario la
 * escogió — `useAgentAvatarType`, ver fix 2026-07-25) volando/creciendo libre
 * en la esquina — compañía, no interrupción. El colibrí (barbudito) se retira
 * del rol de asistente y queda de decoración en los mundos 3D (faunaFuncional,
 * rol polinizador).
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
 *
 * ── EL GESTO DE INTERACCIÓN (#66/#70, 2026-07-30) ──────────────────────────
 * Toque corto y pulsación larga sobre el PERSONAJE se reparten así:
 *   - TOQUE CORTO  → ASOMA el peek de pizarra (BurbujaPizarraPeek): una pizarra
 *     de colegio chiquita con el ÚLTIMO aviso escrito en tiza y, abajo, tres
 *     controles claros: Ver / Escuchar / Callar. Es un vistazo compacto que NO
 *     tapa la pantalla; "Más opciones" dentro del peek sí abre el menú compacto
 *     de siempre (hablar, foto, callar-hoy).
 *   - MANTENER PRESIONADO (1600 ms) → «Hola Chagra»: habla DIRECTO, sin menú: activa el
 *     micrófono (`activarEscucha`, el mismo trigger desacoplado que usa
 *     EscuchaFab) al soltar la vibración háptica. Walkie-talkie: se aprieta
 *     para hablar.
 *
 * RESOLUCIÓN DEL CONFLICTO gesto-largo (documentado porque el pedido original
 * pisaba el silencio #101/#103 que YA vivía en el largo): el silencio
 * persistente se MUDÓ al menú del toque corto («Que se quede callado hoy»,
 * el "hoy no" de #107) y se conserva el botón 🔔/🔕 pegado al personaje para
 * el silencio MANUAL indefinido (#101) — el largo queda libre para "hablar",
 * que es el gesto más esperable (mantener apretado = walkie-talkie) y el que
 * pedía el punto 1 explícitamente. Nadie perdió su camino: silenciar
 * indefinido sigue en el botón 🔔, "hoy no" vive en el menú, hablar es
 * ahora el largo Y la opción del menú.
 */
export default function AgentFab({ onNavigate, pantalla = null }) {
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [peekAbierto, setPeekAbierto] = useState(false);
  // Panel "Ver" (R4): lectura del mensaje/hint en detalle. Declarado ACÁ ARRIBA
  // (no más abajo) para que `pausado` del roam lo pueda leer sin caer en TDZ.
  const [panelAbierto, setPanelAbierto] = useState(false);
  const { level: ttsLevel } = useTtsAmplitude();

  // Hook de arrastre y persistencia de posición
  const {
    compaiRef,
    position: _savedPosition,
    isDragging,
    positionStyle,
    dragHandlers,
  } = useCompaiDraggable({ enabled: true });

  /* ── EL INTERRUPTOR MANUAL (auditoría 2026-07-26, ítems #101 y #103) ──────
     `silenciar()` — silencio INDEFINIDO, hasta que el usuario lo vuelva a
     prender. Vive en el botón 🔔/🔕 pegado al personaje (accesible, con foco
     propio). Distinto del "hoy no" (#107, en el menú del gesto): ese se
     vence solo a medianoche, este no. */
  const silenciado = useAngelitaStore((s) => s.silenciado);
  const silenciar = useAngelitaStore((s) => s.silenciar);
  const marcarHoyNo = useAngelitaStore((s) => s.marcarHoyNo);
  const registrarSenalMolestia = useAngelitaStore((s) => s.registrarSenalMolestia);
  const timerLargo = useRef(null);
  const fueLargo = useRef(false);

  const alternarSilencio = useCallback(() => {
    silenciar(!useAngelitaStore.getState().silenciado);
  }, [silenciar]);

  /** Mantener presionado el personaje: habla DIRECTO, sin menú (#66/#70).
   *  Hablarle es la señal de ATENCIÓN más fuerte que hay (#102/#106): baja
   *  el contador de molestia y acelera la cadencia. */
  const hablarDirecto = useCallback(() => {
    activarEscucha({ fuente: 'compai_largo' });
    registrarSenalMolestia('hablarle');
    try { navigator.vibrate?.(22); } catch { /* sin motor */ }
  }, [registrarSenalMolestia]);

  const iniciarPulsacionLarga = useCallback(() => {
    fueLargo.current = false;
    if (timerLargo.current) clearTimeout(timerLargo.current);
    // 1600 ms = «Hola Chagra» escuchando (decisión operador 2026-08-27): un
    // pelín más largo que el toque para que asomar el peek no dispare la voz
    // por error. El toque corto (< 1600 ms) asoma el peek; el largo, la escucha.
    timerLargo.current = setTimeout(() => {
      fueLargo.current = true;
      hablarDirecto();
    }, 1600);
  }, [hablarDirecto]);

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

  // #111 "Vive el clima real": reacciona al MISMO snapshot de clima que ya
  // consume el husmeo (climaService, cero red aquí) — pre-lluvia avisa/se
  // emociona, helada se abriga, sequía pide agua. Pasa por la misma
  // anti-molestia que cualquier otro aviso (ver useCompaiClimaVivo).
  useCompaiClimaVivo({
    onMensaje: (mensaje) => { setLastMessage(mensaje); setResponseReady(true); },
  });

  // #108 "Susurro nocturno": de noche baja voz + brillo, comenta la fase
  // lunar real + el clima de mañana, invita a descansar. CANDADO CIENTÍFICO:
  // susurroDeNoche() jamás menciona sembrar por luna (ver
  // compai/nucleo/susurroNocturno.js) — sólo dice el hecho astronómico.
  useCompaiSusurroNocturno({
    onSusurro: (mensaje, { rate }) => {
      setLastMessage(mensaje);
      setResponseReady(true);
      if (ttsEnabled) speakSentences(mensaje, { rate }).catch(() => { /* degrada a solo texto */ });
    },
  });

  // #80/#81 "agroecología según SU finca real": el compañero comenta con lo
  // que el catálogo Chagra sabe de SU cultivo puntual (rol en el gremio,
  // temperatura de helada real) — no un inventario genérico. Sin match en
  // el catálogo, no dice nada nuevo (el husmeo de siempre sigue igual).
  useCompaiAgroecologiaReal({
    onMensaje: (mensaje) => { setLastMessage(mensaje); setResponseReady(true); },
  });

  // ── POLÍTICA DURA DEL COMPAI (POLITICA-COMPAI-COMPORTAMIENTO-2D-3D.md) ─────
  //   R1 — Nunca estorba: este FAB está ANCLADO por construcción (position:
  //        fixed abajo-derecha); jamás flota en el medio. Reemplaza al
  //        CompaiOverlay que deambulaba y tapaba tarjetas (unificación
  //        2026-08-23).
  //   R2 — Se quita al interactuar: cuando el usuario USA la pantalla
  //        (interactuando), el compai se OCULTA; reaparece en idle.
  //   R3/R5 — LA PIZARRA ES EL ÚNICO AVISO (regla dura del operador,
  //        2026-09-03, feedback_pizarra_unico_aviso_compai): las burbujas
  //        AUTO-POP de "enseñanza en idle" (R3, per-ruta) y de "aviso rico"
  //        (R5, clima vivo/susurro/agroecología/respuesta lista) que se
  //        pintaban solas encima del FAB SE RETIRARON — eran un segundo/tercer
  //        elemento de aviso compitiendo con la pizarra. Nada de información
  //        se perdió: `contenidoPanel` (abajo) ya prioriza mensajeAngelita →
  //        lastAssistantMessage → hint por ruta, y es EXACTAMENTE lo que
  //        `BurbujaPizarraPeek` muestra al tocar el compai. La única señal de
  //        "algo nuevo" que queda es el propio avatar: `estado='invita'` +
  //        `.agt-avatar-glow` (ver más abajo) cuando `responseReady` — el
  //        personaje mismo invita, no un cartel aparte.
  //   R4 — Al tocarlo: ASOMA el peek de pizarra (BurbujaPizarraPeek) con el
  //        último aviso (texto ESTÁTICO, NO typewriter: el texto en movimiento
  //        le daba mareo al operador) y Ver / Escuchar / Callar. "Más opciones"
  //        abre el menú compacto de siempre.
  const [avatarType] = useAgentAvatarType();
  const nombreCompai = AVATAR_NOMBRE[avatarType] || AVATAR_NOMBRE[DEFAULT_AVATAR_TYPE];
  // El ARRASTRE lo dueña useCompaiDraggable (bottom/right, persistente). Mientras
  // se arrastra, la excursión del compai cede (`pausado`) y vuelve a su puesto —
  // así NO hay dos sistemas de posición peleando y el compai se queda DONDE lo
  // dejaron. Ver feedback_compai_politica_v2_visible_roam_natural.
  const comportamiento = useComportamientoCompai(compaiRef, {
    especie: avatarType,
    superficie: pantalla || 'global',
    contentAware: true,
    pausado: isDragging,
    // CERO-MAREO (auditoría 3-roles 2026-08-27): con un asomo/menú/panel abierto
    // el compai se CONGELA donde está — el peek vive DENTRO de este mismo div, y
    // sin esto la excursión del roam lo arrastraba 24-42px bajo la vista. Se usa
    // `congelado` (freeze in-place) y NO `pausado`: `pausado` devuelve el
    // transform al puesto {0,0}, que si el peek se abre a mitad de excursión es
    // una deriva de varios segundos igual de mareante (medido). Ver el hook.
    congelado: peekAbierto || menuAbierto || panelAbierto,
  });
  const hint = useMemo(() => getHintForRuta(pantalla, nombreCompai), [pantalla, nombreCompai]);

  const estadoAngelita = useAngelitaStore((s) => s.estado);
  const visualEstadoAngelita = useAngelitaStore((s) => s.visualEstado);
  const mensajeAngelita = useAngelitaStore((s) => s.mensaje);

  const [lastPantalla, setLastPantalla] = useState(pantalla);
  if (lastPantalla !== pantalla) {
    setLastPantalla(pantalla);
    setPanelAbierto(false);
    setPeekAbierto(false);
  }

  // POLÍTICA COMPAI v2 (operador 2026-08-24): el compai es VISIBLE 100% del
  // tiempo, NUNCA desaparece. La ocultación anterior (`oculto = interactuando
  // && !hover` → visibility:hidden) hacía justo lo contrario y era el bug de
  // "al onmouseover desaparece / ahora no sale ninguno". Al interactuar el
  // usuario, el compai vuelve a su posición natural (por ahora su puesto), NO
  // se oculta. Ver feedback_compai_politica_v2_visible_roam_natural.
  const oculto = false;

  const cerrarPanel = useCallback(() => setPanelAbierto(false), []);
  const leerEnVoz = useCallback((titulo, descripcion) => {
    speakSentences(`${titulo}. ${descripcion}`).catch(() => { /* degrada a solo texto */ });
    registrarSenalMolestia('escuchar');
  }, [registrarSenalMolestia]);

  // Contenido del panel "Ver" y del PEEK: el aviso vivo / último mensaje si lo
  // hay, si no el hint de la ruta, y como último recurso una línea amable — así
  // el peek nunca queda sin qué decir ni revienta al leer `.descripcion`.
  const contenidoPanel = useMemo(() => {
    if (mensajeAngelita) return { titulo: `${nombreCompai}: un aviso para usted`, descripcion: mensajeAngelita };
    if (lastAssistantMessage) return { titulo: `${nombreCompai}: un aviso para usted`, descripcion: lastAssistantMessage };
    if (hint) return hint;
    return { titulo: nombreCompai, descripcion: 'Estoy con usted. Tóqueme cuando quiera algo.' };
  }, [mensajeAngelita, lastAssistantMessage, hint, nombreCompai]);

  // Estado del compai: el tacto manda; luego el ánimo rico del store; luego
  // la respuesta del chat y, al final, el idle.
  const estadoBase = pressed
    ? 'contenta'
    : hover
      ? 'escuchando'
      : estadoAngelita !== 'calma'
        ? visualEstadoAngelita
      : responseReady
        ? 'invita'
        : 'acompana';
  // La locomoción solo pisa el idle. Una conversación, alerta o interacción
  // conserva prioridad. El resolver por especie traduce `caminando` a marcha
  // terrestre o vuelo, según el cuerpo elegido.
  const estado = comportamiento.caminando && estadoBase === 'acompana'
    ? 'caminando'
    : estadoBase;

  const handleEnter = () => setHover(true);
  const handleLeave = () => { setHover(false); setPressed(false); soltarPulsacionLarga(); };
  const handleDown = () => { setPressed(true); iniciarPulsacionLarga(); };
  const handleUp = () => { setPressed(false); soltarPulsacionLarga(); };

  // Contexto que el agente recibe al navegar (pantalla de origen, para el
  // saludo y el pin espacial) — lo comparten "Hablar" y "Enviar foto".
  const contextoDePantalla = pantalla
    ? { desdePantalla: pantalla, spatialContext: { pantalla } }
    : {};

  const handleClick = () => {
    // Si la pulsación larga ya disparó "hablar directo", el dedo NO debe
    // además asomar el peek: un solo gesto, una sola acción.
    if (fueLargo.current) { fueLargo.current = false; return; }
    // Tocar el FAB con una respuesta esperándolo es "abrir el tip" (#102/
    // #106): atención positiva, el contador de molestia baja.
    if (responseReady) registrarSenalMolestia('abrirTip');
    // TAP = PEEK (decisión operador 2026-08-27): asoma el último aviso con
    // Ver / Escuchar / Callar. El menú compacto queda tras "Más opciones".
    setPeekAbierto(true);
  };

  /** Peek → "Ver": abre el panel de lectura con el mensaje completo. */
  const handlePeekVer = useCallback(() => {
    setPeekAbierto(false);
    setPanelAbierto(true);
    registrarSenalMolestia('abrirTip');
  }, [registrarSenalMolestia]);

  /** Peek → "Escuchar": lee EN VOZ el aviso REAL (contenidoPanel), no enlatado. */
  const handlePeekEscuchar = useCallback(() => {
    speakSentences(`${contenidoPanel.titulo}. ${contenidoPanel.descripcion}`).catch(() => {});
    registrarSenalMolestia('escuchar');
  }, [contenidoPanel, registrarSenalMolestia]);

  /** Peek → "Callar": silencio indefinido (useAngelitaStore.silenciar()). */
  const handlePeekCallar = useCallback(() => {
    setPeekAbierto(false);
    silenciar(true);
  }, [silenciar]);

  /** Peek → "Más opciones": abre el menú compacto de siempre. */
  const handlePeekMas = useCallback(() => {
    setPeekAbierto(false);
    setMenuAbierto(true);
  }, []);

  /** El peek se cerró sin elegir nada: señal de molestia leve (abrió y cerró). */
  const handlePeekCerrar = useCallback(() => {
    setPeekAbierto(false);
    registrarSenalMolestia('cerrarTipSinLeer');
  }, [registrarSenalMolestia]);

  /** Menú → "Hablar": activa el micrófono, igual que el gesto largo. */
  const handleMenuHablar = useCallback(() => {
    setMenuAbierto(false);
    activarEscucha({ fuente: 'compai_menu' });
    registrarSenalMolestia('hablarle');
  }, [registrarSenalMolestia]);

  /** Menú → "Ver" (R4): abre el panel con el mensaje/hint para LEERLO. */
  const handleMenuVer = useCallback(() => {
    setMenuAbierto(false);
    setPanelAbierto(true);
    registrarSenalMolestia('abrirTip');
  }, [registrarSenalMolestia]);

  /** Menú → "Escuchar": lee EN VOZ el aviso REAL (contenidoPanel), nunca una
   *  frase enlatada distinta de lo que "Ver" muestra (decisión operador). */
  const handleMenuEscuchar = useCallback(() => {
    setMenuAbierto(false);
    speakSentences(`${contenidoPanel.titulo}. ${contenidoPanel.descripcion}`).catch(() => {});
    registrarSenalMolestia('escuchar');
  }, [contenidoPanel, registrarSenalMolestia]);

  /** Menú → "Enviar foto": abre el agente con la cámara ya disparada. */
  const handleMenuFoto = useCallback(() => {
    setMenuAbierto(false);
    onNavigate('agente', { ...contextoDePantalla, autoOpenCamera: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onNavigate, pantalla]);

  /** Menú → "Ver fotos": abre únicamente fotos locales disponibles. */
  const handleMenuFotos = useCallback(() => {
    setMenuAbierto(false);
    window.dispatchEvent(new CustomEvent('chagra:compai-fotos', { detail: { pantalla } }));
  }, [pantalla]);

  /** Menú → "Que se quede callado hoy": #107, se resetea a medianoche. */
  const handleMenuHoyNo = useCallback(() => {
    setMenuAbierto(false);
    marcarHoyNo();
  }, [marcarHoyNo]);

  /** El menú se cerró SIN elegir nada: cuenta como señal de molestia — el
   *  usuario lo abrió y lo cerró sin usarlo (#102/#106). */
  const handleMenuCerrar = useCallback(() => {
    setMenuAbierto(false);
    registrarSenalMolestia('cerrarTipSinLeer');
  }, [registrarSenalMolestia]);

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
       para el teclado y el lector de pantalla). El puesto ahora es ARRASTRABLE
       y PERSISTENTE (useCompaiDraggable). */
    <div
      ref={compaiRef}
      data-compai-surface={pantalla || 'global'}
      data-compai-draggable="true"
      onPointerEnter={comportamiento.handlers.onPointerEnter}
      onPointerLeave={comportamiento.handlers.onPointerLeave}
      onPointerDown={comportamiento.handlers.onPointerDown}
      onMouseDown={dragHandlers.onMouseDown}
      onTouchStart={dragHandlers.onTouchStart}
      aria-hidden={oculto}
      style={{
        position: 'fixed',
        bottom: positionStyle.bottom,
        right: positionStyle.right,
        width: 84,
        height: 84,
        zIndex: 40,
        pointerEvents: 'none', // sólo los hijos reciben toque: el hueco no tapa nada
        visibility: 'visible',
        opacity: 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: isDragging ? 'none' : 'bottom 0.3s ease, right 0.3s ease',
        userSelect: 'none',
      }}
    >
      <button
        type="button"
        className={fvhSkinClass(`chagra-fab${hover ? ' is-hover' : ''}${responseReady ? ' is-ready' : ''}${silenciado ? ' is-silenciada' : ''}`)}
        aria-label={
          silenciado
            ? 'Chagra IA (en silencio). Tocar para abrir el menú'
            : responseReady
              ? 'Angelita (Chagra IA) tiene respuesta nueva'
              : 'Angelita, la asistente Chagra IA'
        }
        title={
          silenciado
            ? 'Su compañero está en silencio: no le avisa nada hasta que usted lo vuelva a prender. Tocar para abrir el menú igual'
            : responseReady
              ? 'Chagra IA tiene respuesta nueva. Mantener presionado para hablarle directo'
              : 'Tocar para el menú (hablar, enviar foto). Mantener presionado para hablarle directo'
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
          // R2 "se quita al interactuar": la ocultación vive en el envoltorio
          // para sacar de la pantalla al compai completo y no solo encogerlo.
          filter: silenciado
            ? 'drop-shadow(0 0 3px var(--chagra-fab-rim, rgba(255, 255, 255, 0.72))) drop-shadow(0 3px 6px rgba(10, 15, 26, 0.35)) grayscale(0.72) opacity(0.55)'
            : 'drop-shadow(0 0 3px var(--chagra-fab-rim, rgba(255, 255, 255, 0.72))) drop-shadow(0 3px 6px rgba(10, 15, 26, 0.45))',
          transform: pressed
            ? 'scale(0.94)'
            : hover
              ? 'scale(1.08)'
              : 'scale(1)',
          transition: 'transform .22s cubic-bezier(.34,1.56,.64,1), filter .28s ease, opacity .28s ease',
        }}
      >
        {/* pointer-events:none — CRÍTICO: el click debe caer en el BOTÓN, nunca
            en el SVG. Angelita se REMONTA al cambiar de estado (key=estado en su
            .agt-vuelo) y hover/pressed cambian el estado: si el mousedown cae en
            un nodo del dibujo que se desconecta antes del mouseup, el navegador
            se traga el click (verificado con playwright 2026-07-16). */}
        <span style={{ pointerEvents: 'none', display: 'flex' }} aria-hidden="true">
          <ChagraAgentAvatar
            // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish -- estado visual canónico del agente
            estado={ttsLevel > 0.035 ? 'respondiendo' : estado}
            size={82}
            visema={visemaFromAmplitude(ttsLevel)}
            direccion={comportamiento.direccion}
            className={responseReady ? 'agt-avatar-glow' : undefined}
            title="Chagra IA"
            ariaLabel="Chagra IA"
            reaccionaPresencia
          />
        </span>
      </button>

      {/* EL INTERRUPTOR VISIBLE. Pegado al personaje, no enterrado en ajustes:
          cuando molesta, molesta AHORA. 30 px de diana táctil, contraste
          propio para que se lea sobre cualquier fondo del valle, y
          `aria-pressed` para que un lector de pantalla diga si está activo. */}
      <button
        type="button"
        data-compai-no-drag="true"
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
          // Sólo queda oculto en reposo: se revela al acercarse, enfocar,
          // tocar el personaje, abrir el menú o recibir una notificación.
          display: (comportamiento.notificacionVisible || hover || pressed || menuAbierto) ? 'flex' : 'none',
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

      {/* R3/R5 RETIRADAS (2026-09-03, la pizarra es el único aviso): las dos
          burbujas AUTO-POP que vivían aquí (aviso rico + enseñanza en idle)
          se quitaron. Su contenido sigue disponible al tocar el compai — ver
          `contenidoPanel` y el peek de pizarra más abajo. */}

      {/* R4 — PANEL "Ver": leer el mensaje/hint en detalle + Escuchar. Se abre
          desde el menú (opción "Ver") o tocando una burbuja. */}
      {panelAbierto && (
        <div
          style={panelStyle}
          data-testid="compai-fab-panel"
          role="dialog"
          aria-label={contenidoPanel.titulo}
        >
          <div style={panelHeaderStyle}>
            <h2 style={panelTituloStyle}>{contenidoPanel.titulo}</h2>
            <button
              type="button"
              onClick={cerrarPanel}
              style={panelCerrarStyle}
              aria-label="Cerrar"
              title="Cerrar"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <p style={panelTextoStyle}>{contenidoPanel.descripcion}</p>
          <button
            type="button"
            onClick={() => leerEnVoz(contenidoPanel.titulo, contenidoPanel.descripcion)}
            style={panelEscucharStyle}
            aria-label="Escuchar esta guía en voz alta"
          >
            <Volume2 size={16} aria-hidden="true" />
            <span>Escuchar</span>
          </button>
        </div>
      )}

      {/* PEEK DEL TOQUE (rediseño operador 2026-08-27): pizarra de colegio
          compacta con el último aviso (texto ESTÁTICO, no typewriter) +
          Ver / Escuchar / Callar. NO tapa la pantalla; "Más opciones" abre el
          menú compacto de abajo. */}
      {peekAbierto && (
        <BurbujaPizarraPeek
          mensaje={contenidoPanel.descripcion}
          nombre={nombreCompai}
          silenciado={silenciado}
          onVer={handlePeekVer}
          onEscuchar={handlePeekEscuchar}
          onCallar={handlePeekCallar}
          onMas={handlePeekMas}
          onCerrar={handlePeekCerrar}
        />
      )}

      {/* MENÚ COMPACTO (tras "Más opciones" del peek): "Ver" / "Escuchar" / "Hablar" /
          "Enviar foto" / "Ver fotos" / "Que se quede callado hoy". Se ancla al
          mismo puesto que el personaje. */}
      <AgentFabMenu
        abierto={menuAbierto}
        onVer={handleMenuVer}
        onEscuchar={handleMenuEscuchar}
        onHablar={handleMenuHablar}
        onFoto={handleMenuFoto}
        onFotos={handleMenuFotos}
        onHoyNo={handleMenuHoyNo}
        onCerrar={handleMenuCerrar}
      />
    </div>
  );
}

// ── Estilos del panel "Ver" (único elemento propio que le queda al FAB;
// el aviso en sí lo pinta `BurbujaPizarraPeek`, ver burbuja-pizarra-peek.css).
// Anclado al puesto del FAB, crece HACIA ARRIBA (bottom:100%) para no tapar
// el centro (R1). `maxWidth` lo mantiene dentro del viewport en móvil.
const panelStyle = {
  position: 'absolute',
  bottom: '100%',
  right: 0,
  marginBottom: 12,
  width: 300,
  maxWidth: 'calc(100vw - 28px)',
  pointerEvents: 'auto',
  zIndex: 42,
  background: 'rgb(15 23 42 / 0.97)',
  border: '1px solid rgb(51 65 85 / 0.8)',
  borderRadius: 16,
  padding: 14,
  boxShadow: '0 12px 30px rgb(0 0 0 / 0.5)',
  backdropFilter: 'blur(4px)',
};
const panelHeaderStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 12,
  marginBottom: 8,
};
const panelTituloStyle = {
  fontSize: 15,
  fontWeight: 700,
  color: '#f1f5f9',
  lineHeight: 1.3,
  margin: 0,
};
const panelTextoStyle = {
  fontSize: 13,
  color: '#cbd5e1',
  lineHeight: 1.5,
  margin: '0 0 12px',
};
const panelCerrarStyle = {
  flexShrink: 0,
  width: 26,
  height: 26,
  borderRadius: 8,
  border: 'none',
  background: 'transparent',
  color: '#94a3b8',
  fontSize: 18,
  lineHeight: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
};
const panelEscucharStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  width: '100%',
  padding: '9px 12px',
  borderRadius: 10,
  border: 'none',
  background: '#059669',
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
};
