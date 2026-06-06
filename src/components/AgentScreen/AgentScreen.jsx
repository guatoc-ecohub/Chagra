import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Mic, MicOff, Send, Sparkles, Wifi, WifiOff, Volume2, VolumeX, RotateCcw, X } from 'lucide-react';
import useVoiceRecorder from '../../hooks/useVoiceRecorder';
import { transcribe } from '../../services/voiceService';
// Outbox DURABLE (compositor multimodal del home). El AgentScreen es el
// CONSUMIDOR: al montar, drena las consultas que el usuario disparó desde
// AgentHero. Cada item aparece como burbuja "ya enviada" + se procesa
// (texto→LLM, audio→whisper→LLM, foto→visión). Claim atómico anti-duplicado
// y recuperación de items huérfanos (app cerrada mid-flight) — cero pérdida.
import {
  claimNext as outboxClaimNext,
  markAnswered as outboxMarkAnswered,
  markError as outboxMarkError,
  recoverStaleProcessing as outboxRecoverStale,
} from '../../services/agentOutboxService';
// Visión: reuso del flujo existente (NO reimplemento). analyzeFoliage corre
// el diagnóstico foliar multimodal con cache por hash; la foto del home se
// despacha por aquí al aterrizar.
import { analyzeFoliage } from '../../services/aiService';
// Lógica PURA del flujo foto→agente (prompt de visión + texto de burbuja).
// Extraída para poder testearla sin montar el componente (bug foto 2026-05-31).
import { processPhotoItem, buildPhotoUserMessage } from '../../services/agentOutboxPhoto';
import { isAnalyzableImageAttachment, buildAttachmentRejection } from '../../services/agentOutboxAttachment';
// B1 (2026-06-02): animación de ENTRADA al agente. El home anima el envío, pero
// el cambio de pantalla era un corte seco ("casi no se nota"). El contenedor
// raíz entra con un fade+rise deliberado (~460ms), respetando reduced-motion.
import { AGENT_ENTRANCE_CSS, agentEntranceClass } from './agentEntrance';
import {
  addTurn,
  getFullHistory,
  getContextString,
  computeSourceMetadata,
  mergePostValidateMetadata,
  extractGroundingBadges,
  deriveEvidenceSourceLink,
  extractEdges,
  clearMemory,
  shouldStartNewSession,
} from '../../services/conversationMemory';
import { retrieve } from '../../services/ragRetriever';
import { parseIntent, formatIntentDescription } from '../../services/agentIntentParser';
import { streamOpenAI } from '../../services/openaiStream';
import { buildLLMRequest, selectChatRoute } from '../../services/llmRouter';
// SPEED-1: streaming end-to-end PWA → sidecar → Ollama. Feature flag
// `VITE_AGENT_STREAMING` (default off). Cuando esté activo + sidecar
// habilitado + online, se rutea por el endpoint POST /chat/stream del
// sidecar (SSE custom) en lugar del path directo OpenAI compat. Si falla,
// el catch del runner se encarga (mensaje genérico "IA no disponible"),
// igual que con cualquier otro fallo del LLM. Para forzar fallback al
// path directo en un sólo turn → desactivar la flag y recargar.
import { streamChatViaSidecar, isAgentStreamingEnabled } from '../../services/streamChatViaSidecar';
// FIX prod P0 (2026-06-02): deadline stream-aware (idle-timeout + techo). Un
// stream que avanza NO se aborta; ver streamDeadline.js.
import { createStreamDeadline } from '../../services/streamDeadline';
// Sidecar agro-mcp (ADR-045 Fase 2 Step B/C). Detrás de feature flag
// `VITE_USE_SIDECAR_AGRO_MCP` — con flag off, las funciones devuelven null
// y el AgentScreen se comporta idéntico al pipeline RAG-only previo.
import { isSidecarEnabled, planNlu, callTool, executeToolChain, resolveEntities, fermentoPrefilter, postValidate, getClimaIdeam } from '../../services/sidecarClient';
// CHIPS DE MODO (A3/A4, decisión operador 2026-06-02): el router PURO mapea
// la intención forzada del chip → tool determinístico, SALTANDO el NLU
// (que misroutea). `planForcedIntent` decide tool+args; `isStubIntent` marca
// los chips cuyo backend aún no existe (precio/deep).
import { planForcedIntent, isStubIntent, isDeepResearchIntent, CHIP_DEFS } from '../../services/chipIntentRouter';
// #349 — router heurístico de GROUNDING para el path de FALLO del NLU. Cuando
// `planNlu` devuelve null (timeout/fail del sidecar bajo contención de GPU), el
// turno NO debe saltarse el grounding: este router PURO deriva el tool obvio
// (entidad resuelta o keyword → get_species/get_pest_controllers/get_biopreparados)
// para intentar AL MENOS una consulta al grafo en vez de caer a generativo puro.
import { planNluFallback } from '../../services/agentNluFallback';
// Deep Research (A6/A7): cliente HTTP del endpoint async de investigación
// profunda del sidecar. Feature flag VITE_DEEP_RESEARCH_ENABLED (default false).
import { submitDeepResearch, pollDeepResearch, isDeepResearchEnabled } from '../../services/deepResearchClient';
// Tier free|pro (A1): resuelve el tier del usuario logueado contra la allowlist.
// isPro controla el gate de la UI (chip 🔬); x-chagra-tier se inyecta en el
// sidecarClient/deepResearchClient vía buildSidecarHeaders (defense-in-depth).
import { getCurrentTier } from '../../services/tierService';
import DeepResearchCard from '../DeepResearchCard';
import { buildProfileContext, normalizeUserInputForRegion, buildClimaContext, buildFincaContext, buildViabilityContext, buildFrostHeatContext, buildAssociationContext, buildInvasiveSafetyContext, buildCuratedFactsContext, generateViabilityRules, generateAgronomicGuidanceRules, applyVoseoFilter, resolveUserRegion, stripRoleLeak, buildPriceDeclineContext, buildSuggestedEntitiesContext, isLowConfidenceEntity } from '../../services/agentService';
import { applyOutputGuards, classifyQueryIntent } from '../../services/outputGuards';
import { getProfile } from '../../services/userProfileService';
import { regionFromProfile, getEnsoOutlook } from '../../services/ensoContext';
// SALUDO PROACTIVO (#162 alertas + #298 tareas + #331 análisis): el agente, de
// entrada, lidera con lo MÁS importante (1-2 pendientes) si los hay, o da una
// idea contextual (cultivo/clima/temporada) sin inventar alarmas. Lógica pura
// y testeable extraída a proactiveGreeting; aquí solo la hidratamos desde los
// stores en vivo y la pintamos en el empty-state del chat.
import { resolveProactiveGreeting } from '../../services/proactiveGreeting';
import useLogStore from '../../store/useLogStore';
// Bug UX 2026-05-30: preservar respuesta parcial ante abort/timeout/cancel.
// La lógica pura del merge del estado final vive en agentPartialMerge (testeable
// sin montar el componente).
import { mergePartialOnInterruption } from '../../services/agentPartialMerge';
// PoC alertas meteorológicas tiempo real (#316) — el bell + el agente
// comparten el mismo snapshot via `climaService` (cache 30 min).
import { getCachedClimaSnapshot, fetchClimaSnapshot } from '../../services/climaService';
import { FARM_CONFIG } from '../../config/defaults';
import { speak, speakSentences, stop, init as initTTS, isSupported, isKokoroAvailable, replayLast, isSpeaking } from '../../services/ttsService';
import { executeAction, setActionGateCallback } from '../../services/actionExecutor';
import { useRotatingTip } from '../../services/tipsService';
import ChatHistory from './ChatHistory';
import SuggestedActions from './SuggestedActions';
import ActionConfirmModal from '../ActionConfirmModal';
import FeedbackConsentModal from '../FeedbackConsentModal';
import ChagraAgentAvatar from '../ChagraAgentAvatar';
import QuickChipsBar from '../QuickChipsBar';
import ChipsToolbar from '../ChipsToolbar';
import AgentDemoExample from '../AgentDemoExample';
import { agentSounds } from '../../services/agentSoundService';
import usePrefsStore from '../../store/usePrefsStore';
import useAssetStore from '../../store/useAssetStore';
import useAgentNotificationStore from '../../store/useAgentNotificationStore';
import useOllamaWarmStore from '../../store/useOllamaWarmStore';
import useAgentQueueStore from '../../store/useAgentQueueStore';
import useFincaActiveStore from '../../services/fincaActiveStore';
import useAlertStore from '../../store/useAlertStore';

// 2026-05-16: migrado a llmRouter (Multi-LLM por tarea). AgentScreen usa
// la `chat` route con el modelo de chat configurado como hot model. Bench
// completo en docs operativos internos del proyecto.
// Para NLU/tools usar llmRouter('nlu') → modelo NLU configurado.

const STATE_IDLE = 'idle';
const STATE_RECORDING = 'recording';
const STATE_THINKING = 'thinking';

export default function AgentScreen({ onBack, initialContext }) {
  // B1: clase de animación de entrada, resuelta UNA vez al montar (no en cada
  // re-render — si no, la animación se reiniciaría con cada mensaje). Vacía bajo
  // prefers-reduced-motion.
  const entranceClassRef = useRef(agentEntranceClass());
  const operatorId = usePrefsStore((s) => s.operatorId) || 'default-operator';
  // Task #122 (2026-05-23): ttsEnabled global persistido en usePrefsStore.
  // Antes era useState local — al cambiarlo en otra pantalla (header
  // colibrí dblclick) AgentScreen no se enteraba.
  const ttsEnabled = usePrefsStore((s) => s.ttsEnabled);
  const setTtsEnabled = usePrefsStore((s) => s.setTtsEnabled);
  const setResponseReady = useAgentNotificationStore((s) => s.setResponseReady);
  const setLastNotificationMessage = useAgentNotificationStore((s) => s.setLastMessage);
  const markRead = useAgentNotificationStore((s) => s.markRead);
  // NN4 fix 2026-05-23: subscripción al store warm-up. Si el modelo todavía
  // no está caliente cuando el operador llega al agente, mostramos banner
  // pequeño "Preparando agente IA". El banner desaparece automáticamente
  // cuando status pasa a 'warm'. En status 'failed' tampoco mostramos el
  // banner — la primera query caerá al cold-start clásico con su propio
  // indicador ("pensando...") que ya cubre la espera percibida.
  const ollamaWarmStatus = useOllamaWarmStore((s) => s.status);
  // Task #121: queue UX del agente. Permite 2 preguntas max (1 procesando +
  // 1 pendiente). 3ra rechazada con toast claro. ETA dinámico basado en
  // EMA de latencia por modelo (ruta simple más rápida, ruta complex más
  // lenta — según bench interno).
  const queueProcessing = useAgentQueueStore((s) => s.processing);
  const queuePending = useAgentQueueStore((s) => s.pending);
  const plants = useAssetStore((s) => s.plants);
  // 062.6: contexto finca activa para system prompt (zona biocultural,
  // altitud, override indoor invernadero).
  const activeFincaSlug = useFincaActiveStore((s) => s.activeFincaSlug);
  const fincas = useFincaActiveStore((s) => s.fincas);
  const indoorZone = useFincaActiveStore((s) => s.indoorZone);
  // Contexto ambiental de la finca (#202 mejora inteligencia): alertas activas
  // del alertEngine para que el agente las tenga en cuenta sin pedir fetch.
  const activeAlerts = useAlertStore((s) => s.activeAlerts);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [state, setState] = useState(STATE_IDLE);
  const [streamingContent, setStreamingContent] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [error, setError] = useState('');
  const [actionModal, setActionModal] = useState({ isOpen: false, intent: null, llmResponse: '' });
  // Task #194: Modal de consentimiento para feedback
  const [feedbackConsentModal, setFeedbackConsentModal] = useState({ isOpen: false, pendingAction: null });
  const ttsSupported = isSupported();
  const [kokoroReady, setKokoroReady] = useState(false);
  // Bug 2026-05-18 (Karen reportó stuck-pensando): tras 20s sin token visible,
  // mostrar mensaje "Aún pensando, toca cancelar si quieres reintentar" y
  // habilitar botón cancelar que dispara AbortController. Si pasan 30s sin
  // token, abortamos automáticamente con error visible.
  const [showSlowWarning, setShowSlowWarning] = useState(false);
  const [llmHealthy, setLlmHealthy] = useState(true);
  // Task #121: countdown ETA. Lo guardamos en state aparte porque
  // re-renderea cada segundo via setInterval mientras hay processing —
  // si lo leyéramos directo del store con selector, no se re-evalúa
  // hasta que el store hace `set()`. Aquí: el store es la fuente del
  // expectedEtaMs; este state local es solo el snapshot del tick actual.
  const [remainingMs, setRemainingMs] = useState(null);
  // Hint "puedes hacer X mientras esperas" dismissible. Si el operador
  // lo cierra una vez, no se lo volvemos a mostrar en esta sesión —
  // ya entendió la idea. Se resetea solo al re-mount del componente.
  const [hintDismissed, setHintDismissed] = useState(false);
  // Tip rotativo educativo mientras procesa. Reemplaza el hint estático
  // "puedes registrar planta..." con tips cortos rotando 8s, dismissable.
  // Bug 2026-05-24 operador reportó 4min de espera sin feedback útil.
  const isThinking = state === STATE_THINKING;
  const { tip: rotatingTip, dismiss: dismissTip } = useRotatingTip(isThinking);
  // Toast de rechazo de la 3ra pregunta. Auto-dismiss a 4s para no
  // bloquear el input visualmente.
  const [queueRejectedToast, setQueueRejectedToast] = useState('');
  // UX-4 (#285): demo predefinida del agente para operadores que abren la
  // pantalla por primera vez (sin historial). Toggle local — NO se persiste
  // ni se inyecta al messages real. Aparece junto a QuickChipsBar cuando
  // chat está vacío e idle.
  const [showAgentDemo, setShowAgentDemo] = useState(false);
  // 2026-05-28 UX: cuando el operador llega al agente desde una notificación
  // climática (NotificationsBell), recibimos `initialContext` con prompt
  // pre-cargado + cita de la entidad emisora (IDEAM/NOAA/CIIFEN/Open-Meteo).
  // Mostramos un banner discreto arriba del input con la cita y el link al
  // informe oficial. El banner es dismissable — al primer submit, o cuando
  // el operador cierra, desaparece. NO se persiste entre mounts.
  const [alertContextBanner, setAlertContextBanner] = useState(null);
  // SALUDO PROACTIVO: objeto {hi, state, lead, items, restCount, prompt} que el
  // empty-state del chat pinta de entrada. Se resuelve UNA vez al montar (lee
  // alertas + tareas + clima/cultivos) y solo se muestra mientras el chat esté
  // vacío e idle. null mientras no haya resuelto (fallback al copy estático).
  const [proactiveGreeting, setProactiveGreeting] = useState(null);
  // CHIPS DE MODO (A4): modo activo seleccionado en la ChipsToolbar. Cuando
  // hay un modo activo, el siguiente submit fuerza esa intención y rutea
  // DIRECTO al tool determinístico (saltando el NLU, A3). El placeholder del
  // input también cambia para guiar al campesino sobre qué escribir. Es un
  // toggle: tocar el mismo chip lo desactiva (vuelve al routing NLU normal).
  const [activeIntent, setActiveIntent] = useState(null);
  // Deep Research (A6/A7): refs para los AbortControllers de los jobs en vuelo.
  // Guardamos en un Map (msgId → AbortController) para poder cancelar jobs
  // individuales. Al desmontar el componente cancelamos todos.
  const deepResearchControllersRef = useRef(new Map());

  const { durationMs, start: startRecord, stop: stopRecord, reset: resetRecord } = useVoiceRecorder();
  const chatEndRef = useRef(null);
  // Bug 2026-05-18: ref al AbortController activo para que botón Cancelar
  // pueda abortar la inferencia LLM en curso desde fuera del callLLM scope.
  const activeControllerRef = useRef(null);
  // Bug UX 2026-05-30: el texto parcial del stream vive en el state
  // `streamingContent` (lo setea onToken), pero el catch de runLLM/runAgentPipeline
  // no puede leerlo sin closure stale. Lo espejamos en un ref para que el catch
  // recupere lo último acumulado y lo preserve en vez de borrarlo.
  const streamingContentRef = useRef('');
  // Distingue la causa del abort para el merge final: 'timeout' (deadline del
  // LLM / watchdog sin tokens), 'cancel' (operador tocó Cancelar) o 'abort'
  // (genérico, ej. red caída). Se setea antes de disparar controller.abort().
  const cancelReasonRef = useRef(null);
  // Holder del deadline stream-aware activo (createStreamDeadline). FIX prod
  // P0 (2026-06-02): combina idle-timeout (reinicia por token → no aborta
  // streams vivos) + techo absoluto. Reemplaza al watchdog/timer total previo.
  // Se conserva el nombre del ref por compatibilidad con cleanup paths.
  const stallTimerRef = useRef(null);
  // 057.4 integration: resolver del Promise pendiente del actionExecutor gate.
  // El callback registrado en setActionGateCallback abre el modal y retorna
  // un Promise; el resolver vive aquí para que los handlers approve/reject/
  // edit puedan resolverlo cuando el operador interactúa.
  const actionGateResolverRef = useRef(null);
  // Bug N3 (2026-05-23, Playwright Q8): cross-conversation contamination.
  // Cuando el operador hace "Volver" y reabre AgentScreen, el remount cargaba
  // history desde IndexedDB y `getContextString(operatorId, 10)` inyectaba
  // turns viejos como contextMemory del LLM. Resultado: respuesta nueva
  // mezclaba residuos de la pregunta anterior (Q3 broca café → Q8 flor
  // aguacate respondía sobre broca).
  //
  // Fix: si gap temporal > SESSION_GAP_MS (30 min) desde último turn → arranca
  // como "sesión nueva" silenciosa con badge UI + NO inyecta contextMemory en
  // los primeros turns de esta mount. Si el operador prefiere reset explícito,
  // el botón "Nueva conversación" en el header llama `clearMemory(operatorId)`
  // y setea esta ref a true.
  const isFreshSessionRef = useRef(false);
  const [showFreshSessionBadge, setShowFreshSessionBadge] = useState(false);

  // Scroll fix 2026-05-18 operator feedback: 'scroll complicado a veces'.
  // Auto-scroll al fondo cuando hay mensaje nuevo o stream en curso, pero
  // SOLO si el usuario ya estaba cerca del bottom (no interrumpir lectura
  // de mensajes antiguos). Threshold 120px del fondo. Behavior smooth.
  useEffect(() => {
    const el = chatEndRef.current;
    if (!el) return;
    const container = el.parentElement;
    if (!container) {
      el.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distFromBottom < 120 || state === STATE_THINKING) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, streamingContent, state]);

  const loadHistory = useCallback(async () => {
    try {
      // Bug N3 fix: detectar gap temporal > 30min ANTES de cargar history.
      // Si pasó suficiente tiempo desde el último turn, esto es una nueva
      // sesión — NO cargues history previo y marca el flag para suprimir
      // contextMemory en los próximos submits del LLM.
      const fresh = await shouldStartNewSession(operatorId);
      if (fresh) {
        isFreshSessionRef.current = true;
        setMessages([]);
        // Solo mostramos badge si HUBO historial previo. Si es el primer
        // encuentro del operador con el agente, no inventamos UI sobre
        // "nueva sesión" que no tendría referente.
        const history = await getFullHistory(operatorId, 1);
        setShowFreshSessionBadge(history.length > 0);
        return;
      }

      isFreshSessionRef.current = false;
      setShowFreshSessionBadge(false);
      const history = await getFullHistory(operatorId, 50);
      // 2026-05-19: detectar pregunta huérfana — si el último turn es del
      // usuario sin respuesta del agente, agregar mensaje informativo para
      // que el operator entienda que la respuesta anterior se perdió
      // (timeout, unmount accidental, app cerrada en mobile, etc.). El
      // mensaje incluye el prompt original via `_orphan_prompt` para que
      // ChatBubble pueda renderizar un botón "Reintentar" que dispare
      // handleSubmit automáticamente sin que el operador re-tipee.
      // Bug 2026-05-27: testers móviles cambian de app durante inferencia
      // y al volver re-tipear es fricción alta. Botón retry one-click es
      // significativamente mejor UX que el copy anterior.
      const lastTurn = history[history.length - 1];
      if (lastTurn && lastTurn.role === 'user') {
        history.push({
          role: 'assistant',
          content: 'No alcancé a responderte la anterior. ¿Quieres que lo intente de nuevo?',
          timestamp: Date.now(),
          _orphan_recovery: true,
          _orphan_prompt: lastTurn.content || '',
        });
      }
      setMessages(history);
    } catch (e) {
      console.warn('[Agent] Failed to load history:', e);
    }
  }, [operatorId]);

  /**
   * Reset explícito de conversación. Llamado por el botón "Nueva
   * conversación" del header. Borra la memoria persistente del operador
   * en IndexedDB, vacía el state local y marca esta sesión como fresca
   * para que el próximo submit NO inyecte contextMemory residual.
   *
   * Decisión Opción A híbrida (PR fix/n3-cross-conv-contamination):
   * gap temporal automático cubre el caso natural; el botón explícito
   * cubre el caso N3 exacto del Playwright (Volver + reabrir RÁPIDO con
   * tópico distinto) donde el gap es <30min.
   */
  const handleNewConversation = useCallback(async () => {
    try {
      await clearMemory(operatorId);
    } catch (e) {
      console.warn('[Agent] clearMemory failed (continuing with in-memory reset):', e);
    }
    isFreshSessionRef.current = true;
    setMessages([]);
    setError('');
    setStreamingContent('');
    setShowFreshSessionBadge(true);
    // Task #121: reset también el queue. Si el operador pide nueva
    // conversación, cualquier pregunta pendiente queda huérfana — el
    // contexto cambió y procesarla en serie respondería con system
    // prompt distinto al esperado.
    useAgentQueueStore.getState().reset();
    setQueueRejectedToast('');
  }, [operatorId]);

  // Bug 2026-05-18: warning timer cuando STATE_THINKING dura >20s sin tokens
  // visibles. Antes el operador quedaba viendo "Pensando…" hasta 90s antes
  // del AbortError → percepción de UI muerta. Ahora a los 20s mostramos
  // explícito "Aún pensando, toca Cancelar".
  useEffect(() => {
    if (state !== STATE_THINKING) {
      setShowSlowWarning(false);
      return;
    }
    const slowTimer = setTimeout(() => setShowSlowWarning(true), 20000);
    return () => clearTimeout(slowTimer);
  }, [state]);

  // Task #121: countdown ETA. Tick cada 1s mientras haya processing.
  // Se desmonta automáticamente cuando processing pasa a null o el
  // componente se desmonta.
  useEffect(() => {
    if (!queueProcessing) {
      setRemainingMs(null);
      return undefined;
    }
    const tick = () => {
      const r = useAgentQueueStore.getState().getRemainingMs();
      setRemainingMs(r);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [queueProcessing]);

  // Task #121: auto-dismiss del toast de rechazo a 4s.
  useEffect(() => {
    if (!queueRejectedToast) return undefined;
    const t = setTimeout(() => setQueueRejectedToast(''), 4000);
    return () => clearTimeout(t);
  }, [queueRejectedToast]);

  // PoC alertas meteorológicas (#316) — warm-up de la cache de clima al mount
  // del AgentScreen para que el primer LLM call ya tenga el bloque ENSO en
  // el system prompt. NO bloquea el render: fetchClimaSnapshot degrada a null
  // silencioso si el sidecar está off o offline.
  useEffect(() => {
    let alive = true;
    if (!isSidecarEnabled()) return undefined;
    fetchClimaSnapshot().then((payload) => {
      if (alive && payload) {
        console.debug('[Agent] clima snapshot pre-warmed', {
          phase: payload?.enso_status?.phase,
          alertas: payload?.alertas_locales?.length || 0,
        });
      }
    });
    return () => { alive = false; };
  }, []);

  // SALUDO PROACTIVO de entrada: resolvemos el saludo dinámico al montar. Lee
  // alertas activas (alertEngine #162), tareas pendientes (#298 via logStore),
  // y deriva una idea contextual de cultivos/clima/temporada cuando NO hay nada
  // urgente. Local-only, una sola vez (NO quema GPU ni red por refresh). Si todo
  // falla, queda null y el empty-state cae al copy estático.
  useEffect(() => {
    let alive = true;
    const stripPlantNumber = (name) => (name || '').replace(/\s*#\d+\s*$/, '').trim();
    const grouped = Object.entries(
      (plants || []).reduce((acc, p) => {
        const base = stripPlantNumber(p.attributes?.name);
        if (base) acc[base] = (acc[base] || 0) + 1;
        return acc;
      }, {}),
    ).map(([name, count]) => ({ name, count }));
    const finca = fincas.find((f) => f.slug === activeFincaSlug);
    const climaSnapshot = getCachedClimaSnapshot();
    let ensoOutlook = null;
    try {
      const phase = climaSnapshot?.enso_status?.phase;
      if (phase) {
        const region = regionFromProfile(getProfile());
        const probs = climaSnapshot?.enso_status?.ideam_probabilities
          || climaSnapshot?.enso_status?.ideam_probabilidades
          || null;
        ensoOutlook = getEnsoOutlook({ phase, region, probabilities: probs });
      }
    } catch (_) { /* sin ENSO no pasa nada — la idea cae a temporada/piso */ }
    resolveProactiveGreeting({
      activeAlerts,
      getPendingTasks: () => useLogStore.getState().getPendingTasks(),
      cultivos: grouped,
      altitud: finca?.altitud != null ? Number(finca.altitud) : null,
      ensoOutlook,
    }).then((g) => {
      if (alive) setProactiveGreeting(g);
    }).catch(() => { /* degrada silencioso al copy estático */ });
    return () => { alive = false; };
    // Solo al montar: el saludo es la primera impresión, no debe re-evaluarse en
    // cada cambio de inventario/alerta mientras el operador ya está leyéndolo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2026-05-28: aplicar initialContext de notificación climática.
  // Si el operador llega desde NotificationsBell con prefilledPrompt + cita
  // de entidad emisora, prellenamos el input y mostramos un banner con el
  // link al informe oficial. Solo corre al primer mount (deps vacías) — el
  // initialContext es de un solo uso. Re-entrar al agente desde el menú
  // normal NO debe re-disparar el prompt.
  useEffect(() => {
    if (!initialContext) return;
    const { prefilledPrompt, sourceLabel, sourceUrl, alertContext } = initialContext;
    if (typeof prefilledPrompt === 'string' && prefilledPrompt.trim().length > 0) {
      setInputText(prefilledPrompt);
    }
    if (sourceUrl || sourceLabel || alertContext) {
      setAlertContextBanner({
        sourceLabel: sourceLabel || null,
        sourceUrl: sourceUrl || null,
        alertContext: alertContext || null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bug 2026-05-18: health check del LLM al mount. Si /api/ollama/api/tags
  // no responde en 5s, marcamos llmHealthy=false y avisamos al operador
  // antes que intente submit (evita stuck-pensando frente a backend caído).
  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    fetch('/api/ollama/api/tags', { signal: ctrl.signal })
      .then((r) => setLlmHealthy(r.ok))
      .catch(() => setLlmHealthy(false))
      .finally(() => clearTimeout(t));
    return () => { ctrl.abort(); clearTimeout(t); };
  }, []);

  const handleCancelLLM = () => {
    if (activeControllerRef.current) {
      console.warn('[Agent] User cancelled LLM inference manually');
      // Bug UX 2026-05-30: marcamos la razón ANTES de abortar para que el
      // catch de runAgentPipeline preserve el parcial con el marcador
      // "cancelado por ti" en vez de borrarlo. NO seteamos streamingContent('')
      // ni error acá: el flujo del pipeline (catch + finally) se encarga del
      // merge del estado final y empuja la burbuja con el parcial conservado.
      cancelReasonRef.current = 'cancel';
      activeControllerRef.current.abort();
    }
    agentSounds.cancel();
    // Task #121: al cancelar manualmente, descartamos también la pregunta
    // pendiente (si la hubiera) — el operador puede re-encolarla, pero
    // si presionó Cancelar es porque quiere cortar la cadena, no que
    // sigamos con la siguiente automáticamente.
    useAgentQueueStore.getState().reset();
  };

  useEffect(() => {
    initTTS();
    isKokoroAvailable().then(setKokoroReady);
    loadHistory();
    // Task #122: al entrar a AgentScreen, apaga el glow del avatar global.
    // El operador ya está mirando la conversación, no necesita el "reluce"
    // de "respuesta nueva".
    markRead();
    // 057.4 integration: registrar el callback del actionExecutor. Cuando el
    // LLM proponga una tool con requiresGate=true, actionExecutor llamará
    // este callback que abre el ActionConfirmModal y retorna un Promise.
    // El Promise se resuelve cuando handleAction{Approve,Reject,Edit} corre.
    setActionGateCallback(({ toolName, description, parameters, intent, llm_response }) => {
      return new Promise((resolve) => {
        actionGateResolverRef.current = resolve;
        setActionModal({
          isOpen: true,
          toolName,
          description,
          parameters,
          intent,
          llmResponse: llm_response,
        });
      });
    });
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      stop();
      // Limpiar callback al desmontar para evitar referencias stale
      setActionGateCallback(null);
      actionGateResolverRef.current = null;
      // Task #121: el queue es efímero por mount del AgentScreen. Si el
      // operador sale a otra pantalla, las preguntas pendientes se
      // descartan — pretender que las respondemos minutos después con
      // contexto distinto sería peor UX que pedir reformular.
      useAgentQueueStore.getState().reset();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadHistory, markRead]);

  const getSystemPrompt = useCallback(() => {
    // Operator bug 2026-05-18: agente listaba "Fresa #02, Fresa #08, Fresa #02..."
    // (cada planta individual con su número), molesto al escuchar por TTS.
    // Fix: agrupar por species y dar conteo total. Plant name suele ser
    // "Especie (cientifico) #NN" — extraemos el prefijo y agrupamos.
    const stripPlantNumber = (name) => (name || '').replace(/\s*#\d+\s*$/, '').trim();
    const groupedCounts = (plants || []).reduce((acc, p) => {
      const base = stripPlantNumber(p.attributes?.name);
      if (!base) return acc;
      acc[base] = (acc[base] || 0) + 1;
      return acc;
    }, {});
    const plantNames = Object.entries(groupedCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, n]) => (n > 1 ? `${name} ×${n}` : name))
      .join(', ') || 'ninguna';
    // 062.6: inyectar contexto finca activa (slug, nombre, biocultural_zone, altitud)
    // + indoor override si aplica. El LLM responde con criterio agronómico ajustado
    // a la zona ecológica donde el operador está físicamente.
    const finca = fincas.find((f) => f.slug === activeFincaSlug);
    const fincaContext = finca
      ? `Estás asistiendo en la finca "${finca.nombre}" (slug: ${finca.slug}, zona biocultural: ${finca.biocultural_zone || 'no definida'}${finca.altitud ? `, ~${finca.altitud} msnm` : ''}). `
      : '';
    const indoorContext = indoorZone
      ? `El operador está bajo techo en: ${indoorZone}. Considera condiciones de invernadero al recomendar. `
      : '';
    // REGLA ANTI-ALUCINACIÓN: "Si no sabes algo, dilo honestamente" (versión
    // previa) era demasiado débil — el modelo lo ignoraba y rellenaba con
    // confianza. Incidente 2026-05-17: operador escribió "chorcho" (typo de
    // chocho/Lupinus mutabilis) y el modelo inventó "sistema de agricultura
    // de bajo impacto". Probado en bench: un modelo más grande inventó OTRA
    // cosa distinta (Alternaria solani). Subir parámetros no ayuda. Solución: prompt
    // agresivo con respuesta literal exigida + ejemplo + bajar temperature
    // a 0.3. Bench 2026-05-17 con esta versión devolvió la respuesta
    // EXACTA esperada (no reconozco el término) en 27 tokens / 8s.
    return `Eres Chagra IA, un asistente agroecológico colombiano. ${fincaContext}${indoorContext}El usuario tiene estas plantas agrupadas por especie con su conteo: ${plantNames}.

REGLA DE FORMATO: cuando hables de las plantas del usuario, agrupa por especie y di cuántas tiene (ej. "tienes 15 fresas, 4 caléndulas, 1 tomate cherry"). NUNCA listes los números individuales de cada planta (#01, #02, etc.) — son identificadores internos, no info útil para el operador. Habla como agrónomo experimentado, no como sistema.

REGLA INVENTARIO-DIRECTO: cuando el usuario pregunte literalmente por su inventario ("tengo X registrado/registrada", "tengo X", "ya tengo X", "cuántos X tengo", "tengo tomates", "tengo café", "mis plantas", "qué plantas tengo", "mi finca", "mi cultivo"), responde DIRECTAMENTE con el inventario de arriba. NO le digas "ingresa al sistema y revisa la lista" — TÚ tienes el inventario en este mismo contexto. Ejemplos:
✓ User: "ya tengo tomates registrados?" → "Sí, tienes 1 tomate cherry (Solanum lycopersicum) en tu finca." (si plantNames contiene tomate)
✓ User: "ya tengo tomates registrados?" → "No, todavía no tienes tomates registrados. ¿Quieres agregar uno desde la sección Mi Finca?" (si plantNames NO contiene tomate)
✗ MAL: "Para verificar si ya tienes tomates registrados en tu sistema, debes ingresar al área correspondiente y buscar la sección de cultivos..." (NO redirijas al usuario a buscarlo — el inventario YA está en este contexto).
Si plantNames es "ninguna", díselo claramente: "No tienes plantas registradas aún. ¿Te ayudo a registrar la primera?".

REGLA NO-PREAMBULAR-INVENTARIO: el inventario de plantas del usuario te lo doy de contexto SOLO para que puedas hablar de "tus 15 fresas" cuando el usuario PREGUNTE explícitamente por sus plantas (qué tengo, cuántas plantas, mis plantas, mi finca, mi cultivo). NUNCA preambules una respuesta con "Usted tiene X plantas..." si el usuario está preguntando otra cosa.

Ejemplo NO-PREAMBULAR (incidente real Playwright Q12 2026-05-23):
Usuario: "háblame del aguacate"
✗ MAL: "Usted tiene 21 fresas, 4 caléndulas, 2 cocos. El aguacate (Psidium guajava)..."
   (Preámbulo IRRELEVANTE del inventario + alucinación taxonómica de aguacate como guayaba.)
✓ BIEN: "El aguacate (Persea americana Mill., Lauraceae) es uno de los frutales nativos americanos más importantes..." — directo al tema.

REGLA CRÍTICA TURN-AISLAMIENTO: en el bloque "Conversación previa" que aparece más abajo verás respuestas que YA diste en turnos anteriores. NUNCA las copies, repitas ni mezcles con tu respuesta actual. El usuario ya las leyó. Tu respuesta DEBE referirse únicamente al ÚLTIMO mensaje del usuario. Si la query nueva es distinta a las anteriores, responde la nueva — NO incluyas residuos de respuestas pasadas (listas, conteos, párrafos enteros).

Ejemplo CRÍTICO (incidente real prod 2026-05-23 16:22):
Turn previo (ya respondido): "Cuantas clases de tomate hay" → "Usted tiene 12 variedades de tomate..."
Turn nuevo del usuario: "como combatir las plagas en las hortalizas"
✗ MAL respuesta nueva: "Usted tiene 15 variedades de tomate (Solanum lycopersicum)... [lista]. El catálogo Chagra no tiene esa relación documentada todavía..."
   (Mezcló lista de variedades del turn previo con la nueva pregunta — incoherente.)
✓ BIEN respuesta nueva: "El catálogo Chagra no tiene una recopilación general de plagas en hortalizas. ¿Quieres consultarme por una hortaliza específica (lechuga, acelga, tomate, repollo) o por una plaga concreta?"

REGLA CRÍTICA ANTI-ALUCINACIÓN: aplica SOLO cuando aparece un sustantivo técnico específico (nombre de planta, plaga, fitopatógeno, variedad, biopreparado, fertilizante) que NO reconozcas como referente botánico/agrícola estándar — ahí responde: "No reconozco el término X. ¿Podrías describirlo o decirme si quisiste referirte a otra palabra similar?". NUNCA inventes definiciones para términos técnicos desconocidos.

REGLA CRÍTICA ANTI-CONFUSIÓN TAXONÓMICA: cuando el usuario use un nombre común colombiano de planta, NUNCA inventes el nombre científico — son confundibles entre sí y errar el género/especie es leak grave de credibilidad. Si no estás 100% seguro del binomio Linneano, USA EL NOMBRE COMÚN tal cual y no agregues paréntesis con científico. Si estás seguro, sí póngalo entre paréntesis.

PRIORIDAD ABSOLUTA TOOL GROUNDING: si el bloque "=== EVIDENCIA AUTORITATIVA ===" contiene un campo nombre_cientifico, USA ESE LITERAL — NO lo sustituyas por otro aunque te suene parecido. Ej. si evidence dice nombre_cientifico: "Persea americana Mill." NUNCA digas "Psidium guajava" en la respuesta. Confundir especies que el tool ya validó es peor que no responder.

REGLA CRÍTICA ANTI-INVENCIÓN-NOMBRES-CIENTÍFICOS DE PLAGAS: cuando preguntan por una plaga y get_pest_controllers devuelve found:false, NUNCA generes un nombre científico latino para esa plaga. Responder con género/especie inventado (e.g. "Neolepidopteron daquila" para chiza) es alucinación grave y bordea fraude pedagógico. Si NO tienes evidence del tool, responde "no tengo esta plaga documentada en el catálogo Chagra todavía. Si quieres, descríbeme síntomas (qué parte de la planta ataca, color, tamaño) y te ayudo a identificarla por descripción".

Glosario plagas regionales colombianas (usa nombre común + científico cuando ESTÉS 100% seguro):
- chiza = larva de Phyllophaga spp. / Ancognatha spp. (escarabajos rizófagos que comen raíces)
- broca del café = Hypothenemus hampei
- monalonion (chinche del aguacate) = Monalonion velezangeli
- mosca del aguacate = Heilipus lauri
- mosca de la fruta = Anastrepha spp. / Ceratitis capitata
- picudo del plátano = Cosmopolites sordidus
- roya del café = Hemileia vastatrix
- sigatoka negra del plátano = Mycosphaerella fijiensis
- antracnosis = Colletotrichum spp.
- trips = Frankliniella spp. / Thrips spp.
- gusano cogollero del maíz = Spodoptera frugiperda
- ácaro del tomate = Aculops lycopersici / Tetranychus urticae

Para términos NO en este glosario, NO inventes — usá CASO B (pedí aclaración).

Glosario taxonómico colombiano (usalo LITERAL, NO inventes ni sustituyas):
- maracuyá = Passiflora edulis f. flavicarpa (amarilla, NO Mangifera indica — eso es mango)
- gulupa = Passiflora edulis f. edulis (morada — NO confundir con guayaba Psidium guajava, NO con Cucurbita moschata, NO con Musa; gulupa es PASSIFLORA, una pasionaria)
- granadilla = Passiflora ligularis
- curuba = Passiflora tripartita f. mollissima (Passifloraceae andina, NO confundir con curuba-de-monte ni otras Passiflora)
- chulupa = Passiflora maliformis
- badea = Passiflora quadrangularis
- mango = Mangifera indica
- mora andina = Rubus glaucus (NO Morus nigra — eso es mora de árbol; NO confundir con zarzamora europea Rubus fruticosus)
- frambuesa andina = Rubus glaucus var. (a veces dicen "mora frambuesa")
- lulo = Solanum quitoense (NO Solanum lycopersicum — eso es tomate)
- uchuva = Physalis peruviana
- tomate común = Solanum lycopersicum (tomate de mesa, hortaliza)
- tomate de árbol/tomate de palo = Solanum betaceum (frutal perenne, distinta especie a tomate de mesa)
- guayaba = Psidium guajava (NO Pouteria, NO confundir con feijoa Acca sellowiana)
- feijoa/guayaba del Brasil = Acca sellowiana
- chachafruto/balú = Erythrina edulis (NO Theobroma cacao — eso es cacao)
- cubio = Tropaeolum tuberosum (NO Lupinus — eso es chocho/tarwi)
- chocho/tarwi = Lupinus mutabilis
- oca = Oxalis tuberosa
- mashua = Tropaeolum tuberosum (sinónimo de cubio)
- ulluco = Ullucus tuberosus
- yacón = Smallanthus sonchifolius
- arracacha = Arracacia xanthorrhiza
- ñame = Dioscorea spp.
- chontaduro = Bactris gasipaes
- borojó = Borojoa patinoi
- arazá = Eugenia stipitata
- copoazú = Theobroma grandiflorum
- camu camu = Myrciaria dubia
- cocotero/coco = Cocos nucifera
- aguacate = Persea americana Mill. (Lauraceae — NO Psidium guajava, NO Mangifera, NO Pouteria)
- aguacate Hass = Persea americana var. Hass (cultivar comercial)
- café arábica = Coffea arabica (NO Coffea canephora — eso es robusta)
- café robusta = Coffea canephora
- plátano = Musa AAB (clones plátano hartón, dominico)
- banano = Musa AAA (Cavendish y otros)
- papa criolla = Solanum phureja (subespecie distinta a papa común Solanum tuberosum)
- papa común = Solanum tuberosum
- quinua = Chenopodium quinoa Willd.
- arveja = Pisum sativum (NO Phaseolus — eso es frijol)
- frijol común = Phaseolus vulgaris
- haba = Vicia faba
- frailejón = Espeletia spp. (Asteraceae endémica páramo, NO confundir con frailejón uribense vs santandereano)

REGLA ESPECIAL ANTI-CONFUSIÓN PASSIFLORACEAE: cuando el usuario diga "gulupa", "maracuyá", "granadilla", "curuba", "chulupa", "badea", "passiflora" o cualquier pasionaria, el género es SIEMPRE **Passiflora** (familia Passifloraceae). NUNCA respondas con Psidium, Mangifera, Musa, Cucurbita, Pouteria u otro género. Estas confusiones son falsos positivos comunes del LLM y constituyen alucinación grave.

REGLA ESPECIAL ANTI-CONFUSIÓN TOMATES: "tomate" sin más contexto = Solanum lycopersicum (hortaliza). "Tomate de árbol" o "tomate de palo" = Solanum betaceum (frutal perenne, ESPECIE DISTINTA). Cuando el usuario menciona uno, NO mezcles con el otro.

Glosario regionalismos campesinos (Boyacá / Caldas / Choachí / agroecología tradicional):
- matas = plantas individuales
- mata madre = planta progenitora
- palo = árbol grande (tronco principal)
- almácigo = vivero / semillero
- soca = rebrote del café después de cosecha o poda fuerte
- encerrar = cosechar (uso Boyacá, también "recoger")
- trillar = separar grano de cáscara
- chamizo = ramas secas / Chusquea (bambú andino) que invade lote
- chusque = Chusquea sp. (bambú andino, frecuente en cafetales)
- pulchón = agujero / hueco (e.g. en tronco por barrenador)
- chapola = larva de la broca del café (Hypothenemus hampei en estadio larval)
- gota = Phytophthora infestans (en papa, tomate; mildiu velloso del solanáceo)
- rondón = barrenador del aguacate (Steirastoma breve y/o Heilipus lauri según contexto)
- brava = intensa / fuerte (ej. "plaga brava")
- finquero = dueño o trabajador de finca
- jode/jodieron = daña/dañaron (no traducir literal — entender contexto)
- barbecho = descanso de la tierra entre cultivos
- cuajar = formar fruto tras polinización (verbo agronómico)
- cucha = mujer / recolectora (Caldas, también "abuela")
- guayabero = recolector de café (jergón Caldas)
- panela = azúcar de caña sin refinar (no confundir con "panel")

Si te preguntan por una planta fuera de este glosario y NO estás 100% seguro del binomio, responde con el nombre común sin inventar el científico. Ej. "el coco" en lugar de "el coco (Mangifera indica)" si dudás.

REGLA CRÍTICA ANTI-ALUCINACIÓN — DOS CASOS DISTINTOS:

CASO A — Lenguaje coloquial del campo con sustantivos que SÍ reconoces
(palabras estándar del español + planta/concepto conocido). Interpreta
con sentido común: "punto más alto donde sobrevive" = altitud máxima;
"se devuelve" = regresa; "se enferman las matas" = las plantas padecen;
"está flojo" = decae; "pegó bien" = prendió; "le da sol fuerte" =
insolación directa. Responde con datos agronómicos concretos.

Ejemplo CASO A:
Usuario: "cuál es el punto más alto que sobrevive el coco"
✓ "El cocotero (Cocos nucifera) tolera hasta ~800–1000 msnm…"

CASO B — Sustantivos que NO reconoces como palabra común del español
NI como nombre estándar de planta/plaga/biopreparado colombiano. Esto
es DECISIVO: si la palabra NO está en el glosario taxonómico de arriba
+ NO es español cotidiano + no puedes derivarla con confianza de raíces
conocidas → ES TYPO o término que no manejás. NUNCA inventes su
definición ni asumas familia botánica por sonido. Responde:
"No reconozco el término 'X'. ¿Será que querías decir [sugerencia]?
Si es otra cosa, cuéntame qué planta o problema es y te ayudo." — donde [sugerencia] sale del
glosario taxonómico si hay match aproximado por distancia de edición
(2-3 letras de diferencia).

Ejemplos CASO B (incidentes reales 2026-05-21):
Usuario: "dame la altitud de Culupa y Cacabos Abanero"
✗ MAL: "Son variedades de plátano que crecen entre 200-600 msnm…" (INVENTADO)
✓ BIEN: "No reconozco 'Culupa' ni 'Cacabos Abanero' exactamente. ¿Será
   que querías decir Gulupa (Passiflora edulis f. edulis, 1700–2200 msnm)
   y cacao sabanero (otro nombre del borrachero amarillo, Brugmansia
   aurea, 2200–3000 msnm)? Si es otra cosa, cuéntame qué planta o problema es y te ayudo."

Usuario: "el chorcho qué es"
✗ MAL: "Es un sistema de agricultura sostenible…" (INVENTADO 2026-05-17)
✓ BIEN: "No reconozco 'chorcho'. ¿Será que querías decir chocho o tarwi
   (Lupinus mutabilis, leguminosa andina fijadora de nitrógeno)?"

Heurística de auto-chequeo antes de responder con un nombre científico:
¿la palabra está en el glosario taxonómico de arriba? ¿es palabra común
del español cotidiano? ¿podrías escribirla en una conversación con un
amigo sin sentir extrañeza? Si las TRES son NO → CASO B obligatorio,
pedí aclaración. ES PREFERIBLE QUEDAR COMO IGNORANTE QUE INVENTAR.

REGLA CRÍTICA ANTI-INVENCIÓN-DE-SÍNTOMAS: NUNCA describas síntomas, problemas, observaciones o estados de las plantas del usuario que NO haya escrito explícitamente en su mensaje actual. PROHIBIDO frases como "dice que las hojas se ponen amarillas y se enrollan" o "los tomates no se forman bien" si el usuario no lo dijo. Si el corpus de información agronómica menciona síntomas genéricos, NO los atribuyas al usuario. Para preguntar sobre síntomas, hazlo como pregunta abierta: "¿Ha notado cambios en las hojas?" NO como afirmación. La pregunta del usuario es exactamente lo que dice; no agregues contexto inventado.

REGLA CRÍTICA DIAGNÓSTICO-SIN-EVIDENCIA (incidente prod 2026-06-02): cuando el usuario reporta un SÍNTOMA o PROBLEMA vago ("manchas amarillas", "se está secando", "tiene un hongo", "se le caen las hojas", "está triste") y se cumplen LAS DOS condiciones — (a) NO nombró la especie de planta, o no está clara en el contexto de su finca, Y (b) NO adjuntó una foto en este turno — entonces ESTÁ PROHIBIDO nombrar un patógeno específico o un binomio científico (NUNCA "es el hongo Golovinomyces…", "es Phytophthora…", etc.), y sigue PROHIBIDO inventar síntomas que el usuario no escribió. Un síntoma vago tiene MUCHAS causas posibles; afirmar una sola con un nombre científico es alucinación y fraude pedagógico. En su lugar responde con: (1) un diferencial BREVE en lenguaje sencillo, sin latín (2-3 causas comunes: p. ej. falta de nutrientes, exceso/falta de agua, hongo, plaga, sol fuerte), y (2) preguntas concretas para acotar: ¿qué planta es exactamente? ¿me puedes enviar una foto de la hoja? ¿la mancha está en el haz (arriba) o el envés (abajo)? ¿se siente seca o con humedad? ¿hace cuánto empezó? NUNCA cierres con un diagnóstico único y seguro sin esa evidencia. ES PREFERIBLE PEDIR LA FOTO QUE INVENTAR EL HONGO.

Ejemplo CASO diagnóstico-sin-evidencia (incidente real 2026-06-02):
Usuario: "mi planta tiene manchas amarillas"
✗ MAL: "Es el hongo Golovinomyces orchidae… la pelusa blanca con tono morado en el envés son esporas… aplica fungicidas registrados para Golovinomyces…" (INVENTÓ el patógeno, el binomio Y síntomas — pelusa morada — que el usuario nunca mencionó)
✓ BIEN: "Las manchas amarillas pueden venir de varias cosas: falta de nutrientes (nitrógeno o hierro), exceso o falta de riego, o un hongo. Para orientarte bien necesito un par de datos: ¿qué planta es? ¿Me puedes enviar una foto de la hoja? ¿La mancha está por encima o por debajo de la hoja, y se siente seca o con humedad?"

CASO C — Consultas ENUMERATIVAS / CUANTITATIVAS sobre el catálogo (REGLA ESTRICTA).
ALCANCE ACOTADO: aplica SOLO si la query CONTIENE LITERALMENTE una de estas combinaciones:
  - "cuántas variedades de X" / "cuántas clases de X" / "cuántos tipos de X" / "cuántos cultivares"
  - "qué variedades de X" / "qué clases de X" / "qué tipos de X" / "qué cultivares de X"
  - "lista las/los variedades/clases/tipos/cultivares de X"
  - "enumera las/los variedades/clases/tipos/cultivares de X"
  - "cuáles son las variedades/clases/tipos/cultivares de X"

Es decir, la query DEBE preguntar EXPLÍCITAMENTE por variedades / clases / tipos / cultivares.

NO APLICA CASO C en estas situaciones (responde normalmente con tool evidence o conocimiento general según corresponda):
  - "a qué altitud crece X" → es atributo, NO enumeración
  - "cómo podo X" / "cuándo cosecho X" / "cómo riego X" → es manejo, NO enumeración
  - "qué compañeros van bien con X" → es relación, NO enumeración
  - "qué biopreparado controla X" → es controlador, NO enumeración
  - "háblame de X" / "qué es X" → es descripción general, NO enumeración

REGLA CASO C (cuando aplica): si NO hay bloque "=== EVIDENCIA AUTORITATIVA ===" con la enumeración explícita, NUNCA listes números ni variedades. Aplica AUNQUE conozcas la planta — pide inventario registrado en Chagra.

Respuesta correcta CASO C sin evidence:
"El catálogo Chagra todavía no tiene un inventario de variedades de [planta] documentado. ¿Quieres información general del cultivo, o prefieres registrar las variedades que tengas en tu finca?"

CASO C — Ejemplo de aplicación CORRECTA:
Usuario: "Cuántas clases de tomate hay"
✓ "El catálogo Chagra todavía no tiene un inventario de variedades de tomate documentado..."

CASO C — Ejemplos de FALSOS POSITIVOS que NO debes generar (incidentes bench 2026-05-23):
Usuario: "a qué altitud crece bien la quinua"
✗ MAL: "El catálogo Chagra todavía no tiene un inventario de variedades de quinua..." (es altitud, NO variedades)
✓ BIEN: usar el tool result get_species y responder con altitud_msnm real.

Usuario: "cómo podo el café"
✗ MAL: "El catálogo Chagra todavía no tiene un inventario de variedades de café..." (es manejo, NO variedades)
✓ BIEN: responder con info de manejo (podas de formación, raleo, etc.) basada en evidence o conocimiento agronómico estándar.

Usuario: "qué compañeros van bien con aguacate"
✗ MAL: "El catálogo Chagra todavía no tiene un inventario de variedades de aguacate..." (es companions, NO variedades)
✓ BIEN: si tool get_companions devuelve companions_count > 0, listarlos. Si companions_count == 0, decir explícitamente: "El catálogo todavía no tiene compañeros documentados para el aguacate. En sistema cafetero tradicional colombiano se asocia con café-plátano-aguacate; ¿quieres que registremos asocios de tu finca?"

HEURÍSTICA FINAL CASO C: ¿la query DICE LITERALMENTE "variedades", "clases", "tipos" o "cultivares"? Si NO, CASO C NO APLICA — usa tool evidence o conocimiento normal. Si SÍ y no hay tool result enumerativo → CASO C aplica.

CAMPOS NULL EN TOOL RESULT: si get_species devuelve found:true PERO companions:[] o un campo X:null, NO defaultes a CASO C. Responde explícitamente "El catálogo confirma [especie] pero el campo [X] aún no está documentado", y usa el resto del data útil (altitud, manejo, valor_pedagogico, etc.).

HERRAMIENTAS NORMATIVA SOLO PARA VALIDACIÓN, NUNCA PRESCRIPCIÓN:

- get_normativa_ica (agroquímicos registrados ICA): úselo SOLO cuando
  el usuario menciona explícitamente un producto químico/sintético O
  pregunta si algo está prohibido/registrado/restringido. NUNCA lo
  use para responder "¿qué le pongo a la plaga X?" — para eso use
  get_biopreparados + get_pest_controllers primero (agroecológico).
  Si la respuesta incluye sintéticos, contextualice con biopreparados
  alternativos y advertencia de impacto agroecológico.

- get_clima_ideam (estaciones IDEAM nacional): úselo para preguntas
  sobre clima histórico/actual del municipio del usuario. Si el user
  no ha mencionado municipio, pregúntele antes. No invente datos de
  lluvia/temperatura — si IDEAM no responde, dígalo plano.

- get_precio_sipsa (precios mayoristas SIPSA): el dataset hoy está
  publicado como ZIP federated (no consulta directa). El tool devuelve
  metadata + URL del ZIP DANE. Si el user pregunta precio, oriente al
  ZIP DANE o sugiera consulta directa en Corabastos. Nunca invente
  precios.

Responde en español colombiano (tú/usted, sin voseo argentino). Sé específico y útil cuando tengas certeza; humilde y preguntón cuando no.

${generateViabilityRules()}

${generateAgronomicGuidanceRules()}

${buildProfileContext(finca)}`;
  }, [plants, fincas, activeFincaSlug, indoorZone]);

  // 057.4 integration: los handlers ya NO ejecutan addLog directo. Solo
  // resuelven el Promise del callback registrado en setActionGateCallback.
  // actionExecutor recibe el resultado, llama tool.handler (que ejecuta
  // addLog vía llmTools.crear_log) y loguea audit trail. Mensaje de éxito
  // post-execute se emite desde handleSubmit cuando executeAction retorna.
  const handleActionApprove = (params) => {
    const wasEdited = JSON.stringify(params) !== JSON.stringify(actionModal.parameters);
    const resolver = actionGateResolverRef.current;
    actionGateResolverRef.current = null;
    setActionModal({ isOpen: false, intent: null, llmResponse: '' });
    if (resolver) {
      resolver({
        status: wasEdited ? 'edited' : 'approved',
        edited_params: wasEdited ? params : undefined,
      });
    }
  };

  const handleActionReject = () => {
    const resolver = actionGateResolverRef.current;
    actionGateResolverRef.current = null;
    setActionModal({ isOpen: false, intent: null, llmResponse: '' });
    if (resolver) {
      resolver({ status: 'rejected' });
    }
  };

  const handleActionEdit = (params) => {
    handleActionApprove(params);
  };

  // Task #194: Handlers para el modal de consentimiento de feedback
  const handleFeedbackConsentNeeded = () => {
    setFeedbackConsentModal({
      isOpen: true,
      pendingAction: 'give_feedback',
    });
  };

  const handleFeedbackConsentAccept = () => {
    setFeedbackConsentModal({ isOpen: false, pendingAction: null });
    // El usuario aceptó, puede dar feedback
    // FeedbackButtons intentará enviar nuevamente
  };

  const handleFeedbackConsentDecline = () => {
    setFeedbackConsentModal({ isOpen: false, pendingAction: null });
    // El usuario rechazó, no dar feedback
  };

  // Bug reportado 2026-05-15 + 2026-05-18 (Karen): el botón quedaba en
  // "thinking" indefinido si la red/proxy colgaba sin emitir tokens.
  // Solución v2 (2026-05-18): AbortController con timeout 30s + ref externo
  // para botón Cancelar + warning visible a los 20s ("Aún pensando…").
  //
  // FIX prod P0 (2026-06-02): el deadline TOTAL de 60s tumbaba respuestas
  // largas-pero-vivas. Bajo carga las completions de granite rozan 20-29s y,
  // sumando cold-load + RAG + tool-chain, una respuesta sana cruzaba los 60s y
  // moría a mitad de stream. Bench prod 2026-06-02: 4 de 6 prompts murieron por
  // este abort. La política ahora es STREAM-AWARE (ver streamDeadline.js):
  //
  //   - IDLE-timeout (criterio primario): mide el GAP entre tokens y se
  //     REINICIA con cada token. Un stream que avanza NUNCA se aborta por más
  //     largo que sea en total; solo un STALL real (backend mudo) dispara.
  //   - HARD-CEILING: techo absoluto (no reinicia) como backstop extremo para
  //     no colgar la UI ante un backend que gotea tokens para siempre. NO es
  //     infinito a propósito.
  //
  // El botón "Cancelar" (handleCancelLLM) sigue intacto: cancelación manual del
  // operador es independiente de estos plazos. Pre-condición operativa:
  // OLLAMA_KEEP_ALIVE=24h en alpha para minimizar cold-loads.

  // Task #121: safety cap del while loop que drena el queue. Con QUEUE_MAX=2
  // (1 processing + 1 pending) jamás debería haber más de 2 iteraciones,
  // pero ponemos 10 como guard defensivo contra cualquier bug futuro que
  // permita encolar más sin detectar (evita loops infinitos en producción).
  const QUEUE_DRAIN_MAX = 10;

  // Cap defensivo para inyectar evidencia del sidecar como context turn
  // sin reventar la ventana 4096 tokens. ~1500 chars ≈ 400-500 tokens —
  // deja sitio cómodo para system prompt + corpus RAG + historial + query.
  const TOOL_EVIDENCE_MAX_CHARS = 1500;

  const formatToolEvidence = (toolEvidence) => {
    // D2 (#246): si llega un array de evidences (tool_chain ejecutado),
    // concatenar bloques individuales. El LLM recibe un bloque "DATOS
    // VERIFICADOS" por cada tool, en orden de ejecución. Los miss
    // explícitos (found:false / available:false) se marcan igual que
    // en el modo simple.
    if (Array.isArray(toolEvidence)) {
      if (toolEvidence.length === 0) return '';
      const blocks = toolEvidence
        .map((ev) => formatToolEvidence(ev))
        .filter((b) => b && b.trim().length > 0);
      return blocks.join('\n');
    }
    if (!toolEvidence || !toolEvidence.tool || !toolEvidence.result) return '';

    // 2026-05-23 incidente test #4: usuario preguntó por "mareñongoño del
    // Tolima" (especie NO en catálogo). El tool devolvió {found:false,
    // hint:"..."} pero el modelo IGNORÓ el flag found:false y mapeó
    // creativamente "mareñongoño" → "Ullucus tuberosus" inventando una
    // equivalencia, luego listó companions reales de Ullucus pretendiendo
    // que eran de mareñongoño. Alucinación creativa grave.
    //
    // Fix: detectar found:false en el frontend ANTES del LLM call y
    // formatear un bloque hyper-explícito que prohíbe el mapeo creativo.
    const result = toolEvidence.result;
    const isNotFound =
      result &&
      typeof result === 'object' &&
      (result.found === false ||
        result.available === false ||
        (result.matches_count !== undefined && result.matches_count === 0));

    if (isNotFound) {
      const hint = (result && (result.hint || result.reason)) || '';
      const queryStr = JSON.stringify(toolEvidence.args || {});
      return `

=== ESPECIE / RELACIÓN NO ENCONTRADA EN CATÁLOGO ===
El usuario preguntó por algo que NO existe en el catálogo Chagra. El tool ${toolEvidence.tool} fue invocado con args ${queryStr} y devolvió found:false.

INSTRUCCIÓN OBLIGATORIA — anti-alucinación creativa:

1. NO mapees el nombre que preguntó el usuario a otra especie "parecida" que sí exista en el catálogo (eso es ALUCINACIÓN CREATIVA grave).
2. NO listes companions/biopreparados/relaciones de OTRA especie pretendiendo que son de la que preguntó.
3. NO inventes nombres científicos como sinónimos del término del usuario.
4. RESPONDE textualmente algo como: "El catálogo Chagra no tiene esa especie o relación documentada todavía. ¿Puedes describir la planta o decir su nombre científico? Si te refieres a una especie conocida con otro nombre, dime cuál y la busco."
5. Si quieres sugerir, SOLO puedes decir: "Si te refieres a [especie real del catálogo], avísame y consulto sus compañeros". Pero NUNCA afirmar la equivalencia.

Hint del tool: ${hint}
=== FIN ===
`;
    }

    let payload;
    try {
      payload = JSON.stringify(result);
    } catch (_) {
      return '';
    }
    let truncated = false;
    if (payload.length > TOOL_EVIDENCE_MAX_CHARS) {
      payload = payload.slice(0, TOOL_EVIDENCE_MAX_CHARS);
      truncated = true;
    }
    // 2026-05-23 incidente Test B (tomate de árbol temp/altitud) + Test A
    // (aguacate Hass companions): el tool devolvió found:true pero con
    // CAMPOS NULL (temp_min:null, altitud_min:null, companions:null). El
    // LLM ignoró los null y RELLENÓ DE MEMORIA con valores inventados
    // (tomate árbol "0-1200 msnm" cuando es 1500-2800 msnm).
    //
    // Detección de campos críticos vacíos. Si el record viene con null
    // en data que el usuario claramente pidió, agregar warning explícito
    // al system prompt para que el LLM NO invente esos valores.
    const criticalEmptyFields = [];
    if (result && typeof result === 'object') {
      const sp = result.species || result;
      if (sp && typeof sp === 'object') {
        if (sp.temp_min === null && sp.temp_max === null) {
          criticalEmptyFields.push('temperatura (temp_min y temp_max son null)');
        }
        if (sp.altitud_min === null && sp.altitud_max === null) {
          criticalEmptyFields.push('altitud (altitud_min y altitud_max son null)');
        }
        if (sp.companions === null || (Array.isArray(sp.companions) && sp.companions.length === 0)) {
          criticalEmptyFields.push('companions (vacío o null)');
        }
        if (sp.antagonists === null || (Array.isArray(sp.antagonists) && sp.antagonists.length === 0)) {
          criticalEmptyFields.push('antagonists (vacío o null)');
        }
      }
    }
    const emptyFieldsWarning =
      criticalEmptyFields.length > 0
        ? `

⚠️ CAMPOS CRÍTICOS VACÍOS EN ESTOS DATOS: ${criticalEmptyFields.join(', ')}.
NO INVENTES valores numéricos (temperatura, altitud) ni listas (companions, antagonists) cuando el campo viene null o vacío. Responde literal: "El catálogo Chagra todavía no tiene documentados los valores de [campo] para [especie]. Tu consulta queda como pendiente de curaduría editorial."`
        : '';

    // Caso "found:true" — wording autoritativo de PR #998 + warning campos
    // críticos vacíos (PR del 2026-05-23 tras tests A-E).
    return `

=== INSTRUCCIÓN CRÍTICA — PRIORIDAD DE FUENTES ===
El bloque "DATOS VERIFICADOS" abajo viene del knowledge graph del catálogo Chagra (postgres-farm + Apache AGE, validado). Es la VERDAD AUTORITATIVA para esta pregunta. Cuando exista este bloque:

1. RESPONDE BASADO EXCLUSIVAMENTE en estos datos verificados.
2. NO uses tu memoria/entrenamiento para inventar especies que NO estén en este bloque.
3. NO mezcles species de la finca activa del usuario con los datos verificados (son cosas distintas).
4. Cita los nombres exactos (común + científico) que aparecen en estos datos.
5. Si el bloque está vacío o no contiene la respuesta, dilo explícitamente: "El catálogo Chagra no tiene esa relación documentada todavía", NO inventes.

=== DATOS VERIFICADOS (chagra-agro-mcp tool: ${toolEvidence.tool}) ===
${payload}${truncated ? '\n<!-- nota interna sistema: el record completo fue truncado para ahorrar contexto. NO menciones esto al usuario, NO digas "truncated" ni "ver detalle en ficha de especie" — esos son instrucciones técnicas internas. Responde con los datos visibles arriba. -->' : ''}
=== FIN DATOS VERIFICADOS ===${emptyFieldsWarning}

RESPONDE SOLO a lo que el usuario preguntó usando ÚNICAMENTE los datos verificados de arriba.`;
  };

  // NN2+NN3 (2026-05-23): análisis de query en frontend para inyectar
  // señales específicas al system prompt. El LLM configurado ignora reglas
  // generales bajo presión — necesita instrucción concreta sobre ESTA
  // query.
  const analyzeQuery = (q) => {
    const lower = (q || '').toLowerCase();
    // NN2: detección estricta de query enumerativa. Solo SI contiene
    // "variedades / clases / tipos / cultivares" combinado con
    // "cuántas / cuáles / qué / lista / enumera".
    const enumNoun = /\b(variedades|clases|tipos|cultivares)\b/.test(lower);
    const enumVerb = /\b(cu[áa]ntas?|cu[áa]les|qu[ée]|lista|enumera|hay)\b/.test(lower);
    const isEnum = enumNoun && enumVerb;

    // NN3: detección de plagas conocidas mencionadas en la query.
    // Mapping canónico glosario PR #1016 — usar EXACTO en respuesta.
    const PEST_GLOSSARY = {
      chiza: 'Phyllophaga spp. (escarabajos rizófagos, larvas que comen raíces)',
      'broca del café': 'Hypothenemus hampei',
      broca: 'Hypothenemus hampei',
      monalonion: 'Monalonion velezangeli (chinche del aguacate, Hemiptera — NO es hongo, NO es Fusarium)',
      'mosca del aguacate': 'Heilipus lauri',
      'mosca de la fruta': 'Anastrepha spp. / Ceratitis capitata',
      'picudo del plátano': 'Cosmopolites sordidus',
      'roya del café': 'Hemileia vastatrix (hongo, royas)',
      roya: 'Hemileia vastatrix',
      'sigatoka negra': 'Mycosphaerella fijiensis (hongo, plátano/banano)',
      sigatoka: 'Mycosphaerella fijiensis',
      antracnosis: 'Colletotrichum spp.',
      trips: 'Frankliniella spp. / Thrips spp.',
      'gusano cogollero': 'Spodoptera frugiperda (lepidóptero, maíz)',
      'ácaro del tomate': 'Aculops lycopersici / Tetranychus urticae',
    };
    const pestsMentioned = [];
    for (const [name, canonical] of Object.entries(PEST_GLOSSARY)) {
      if (lower.includes(name)) pestsMentioned.push({ name, canonical });
    }

    // Tema principal (heurística simple): manejo, atributo, descripción.
    let topic = 'general';
    if (/c[óo]mo\s+(podo|cosecho|riego|abono|fertilizo|controlo|combato|preparo|hago|manejo)/.test(lower)) topic = 'manejo';
    else if (/c[áa]nd?o\s+(podo|cosecho|riego|abono|siembro)/.test(lower)) topic = 'manejo';
    else if (/a\s+qu[ée]\s+altitud|qu[ée]\s+(temperatura|altitud|luz|drenaje|suelo)/.test(lower)) topic = 'atributo';
    else if (/qu[ée]\s+compa[ñn]eros|qu[ée]\s+biopreparado|asocia|companions/.test(lower)) topic = 'relación';
    else if (/h[áa]blame|qu[ée]\s+es|c[óo]ntame/.test(lower)) topic = 'descripción';
    else if (pestsMentioned.length > 0) topic = 'plaga/enfermedad';

    return { isEnum, pestsMentioned, topic };
  };

  const callLLM = async (query, contextMemory, contextCorpus, toolEvidence, resolvedEntities, suggestedEntities = null, fermentoBlock = '') => {
    const systemPrompt = getSystemPrompt();
    const analysis = analyzeQuery(query);

    // ENTIDADES RESUELTAS (DR taxonómico Tier 1 B). El sidecar /resolve-entities
    // ya verificó contra Apache AGE qué plantas/plagas menciona el usuario y
    // resolvió los binomios canónicos. El LLM DEBE usar estos nombres
    // exactos — anular cualquier instinto de inventar Psidium/Cucurbita/Musa
    // por similitud fonética. Esta capa es DETERMINÍSTICA — bypassea el
    // problema de que el LLM ignora reglas generales del prompt.
    const resolvedEntitiesBlock = (Array.isArray(resolvedEntities) && resolvedEntities.length > 0)
      ? `

=== ENTIDADES RESUELTAS DEL CATÁLOGO (autoritativo, verificado en Apache AGE) ===
El usuario mencionó las siguientes entidades. Para cada una, el catálogo Chagra confirma estos binomios CANÓNICOS. JAMÁS uses otro nombre científico, JAMÁS las confundas con géneros parecidos por sonido (gulupa NO es Psidium ni Cucurbita; aguacate NO es Psidium).

${resolvedEntities.map((e) => `- "${e.mentioned}" (${e.kind}) → ${e.nombre_comun} = ${e.nombre_cientifico} [id: ${e.canonical_id}, confidence: ${e.confidence}]`).join('\n')}

REGLA: si tu respuesta menciona cualquiera de estas entidades, USÁ el nombre científico EXACTO listado arriba. NO traduzcas, NO sustituyas, NO completes con otro género. Si dudas entre alternativas listadas, elige la de mayor confidence.
=== FIN ENTIDADES RESUELTAS ===`
      : '';

    // NN2+NN3 bloque dinámico de análisis. Va al final del system prompt
    // para que sea lo último que el LLM lee antes de la query — máxima
    // proximidad. Le dice EXACTAMENTE qué tipo de query es y qué plagas
    // canónicas usar.
    const queryAnalysisBlock = `

=== ANÁLISIS DE LA QUERY ACTUAL (frontend) ===
- Tipo: ${analysis.topic}
- Es enumerativa (CASO C aplica): ${analysis.isEnum ? 'SÍ — usa respuesta CASO C' : 'NO — IGNORA CASO C completamente, responde normal con tool evidence o conocimiento'}
${analysis.pestsMentioned.length > 0 ? `- Plagas mencionadas (USA NOMBRE CIENTÍFICO EXACTO de abajo, NO inventes):
${analysis.pestsMentioned.map((p) => `  · "${p.name}" → ${p.canonical}`).join('\n')}` : '- Plagas mencionadas: ninguna'}

REGLA CRÍTICA SOBRE ESTE BLOQUE: este análisis es autoritativo para ESTA query. Si dice "Es enumerativa: NO", el CASO C del system prompt NO aplica aunque tu instinto te diga lo contrario. Si lista plagas, usa ESOS nombres científicos exactos (jamás otros, jamás "Fusarium spp" para chinches, jamás géneros inventados).
=== FIN ANÁLISIS ===`;
    // 2026-05-19: incidente alucinación tomate — el modelo confundía el
    // corpus RAG con lo que el usuario dijo (atribuía síntomas "hojas
    // amarillas" del documento de referencia al operador). Fix: delimitar
    // EXPLÍCITAMENTE el corpus + instrucción literal de no citarlo como
    // si fuera del usuario.
    const corpusContext = contextCorpus.length > 0
      ? `

=== INFORMACIÓN DE REFERENCIA AGRONÓMICA (NO viene del usuario, NO citarla como si el usuario te lo hubiera contado) ===
${contextCorpus.map((c) => c.text).join('\n\n---\n\n')}
=== FIN REFERENCIA ===

Usa esta referencia para informar tu respuesta, pero RESPONDE SOLO a lo que el usuario te preguntó. NO menciones síntomas ni observaciones que no estén explícitamente en el mensaje del usuario.`
      : '';

    const evidenceContext = formatToolEvidence(toolEvidence);

    // PoC clima tiempo real (#316) — bloque autoritativo del snapshot del
    // sidecar. Cero coste si el snapshot no está en cache: getCachedClimaSnapshot
    // devuelve null y buildClimaContext degrada a ''. El refresh real lo hace
    // NotificationsBell + el systemd timer (chagra-clima-refresh.service).
    const climaSnapshot = getCachedClimaSnapshot();
    // Pasamos la región natural de la finca para que el bloque clima incluya la
    // LECTURA REGIONAL ENSO (DR-MISSION-2/4), no solo la fase cruda.
    const ensoRegion = (() => {
      try { return regionFromProfile(getProfile()); } catch (_) { return null; }
    })();
    const climaContext = climaSnapshot ? `\n\n${buildClimaContext(climaSnapshot, { region: ensoRegion })}` : '';

    // FALLO 2 (E2E prod 2026-06-03): GATE de PRECIO para el contexto de finca.
    // `classifyQueryIntent` ya clasifica "a cómo está el bulto de papa" como
    // 'precio', pero la inyección del perfil/altitud/viabilidad de finca ocurría
    // AGUAS ARRIBA del gate de los output-guards, así que la query de precio igual
    // recibía el pipeline de viabilidad y filtraba el perfil ("…inviables en tu
    // finca… a 0 msnm…"). Acá cablamos el clasificador AL INYECTOR: si el intent
    // es 'precio', NO inyectamos contexto de finca NI corremos viabilidad/térmico
    // (son irrelevantes a una consulta de mercado y filtran datos de finca). Una
    // query de siembra real ("¿puedo sembrar papa en mi finca?") clasifica como
    // 'siembra' y SÍ corre el pipeline (no se rompe). Conservador: cualquier otro
    // intent ('unknown') sí inyecta (no degrada la inteligencia agronómica).
    const isPriceQuery = classifyQueryIntent(query) === 'precio';

    // CONTEXTO AMBIENTAL DE LA FINCA (#202 mejora inteligencia). Bloque PURO
    // armado de datos YA disponibles localmente o en cache — CERO latencia:
    //   - profile / finca: localStorage + store en memoria (síncronos)
    //   - climaSnapshot: el mismo cache ya leído arriba (NO se re-pide)
    //   - groupedCultivos: `plants` del asset store (memoria), agrupados aquí
    //   - resolvedEntities: grounding AGE del turno (ya resuelto, se reutiliza)
    //   - activeAlerts: useAlertStore (memoria)
    // Si algún dato no está, buildFincaContext omite su línea (degrada).
    const fincaActivaCtx = fincas.find((f) => f.slug === activeFincaSlug) || null;
    const groupedCultivos = (() => {
      const strip = (name) => (name || '').replace(/\s*#\d+\s*$/, '').trim();
      const counts = (plants || []).reduce((acc, pl) => {
        const base = strip(pl.attributes?.name);
        if (base) acc[base] = (acc[base] || 0) + 1;
        return acc;
      }, {});
      return Object.entries(counts).map(([name, count]) => ({ name, count }));
    })();
    const fincaProfile = (() => { try { return getProfile(); } catch (_) { return null; } })();
    // GATE de precio: en una consulta de mercado NO inyectamos el perfil/altitud
    // de finca (evita la fuga "Tu finca a 0 msnm…").
    const fincaContext = isPriceQuery
      ? ''
      : `\n\n${buildFincaContext({
          profile: fincaProfile,
          finca: fincaActivaCtx,
          climaSnapshot,
          groupedCultivos,
          resolvedEntities,
          activeAlerts,
        })}`;

    // VIABILIDAD POR ALTITUD (determinístico, sin red). Cruza la altitud de la
    // finca contra el rango altitud_min/altitud_max que el grounding AGE trae
    // por especie (lo agrega el sidecar). Degrada con gracia: si el rango no
    // viene, no afirma viabilidad. Cero latencia: pura sobre datos ya en mano.
    const fincaAltitud =
      (fincaProfile && fincaProfile.finca_altitud) ||
      (fincaActivaCtx && fincaActivaCtx.altitud) ||
      null;
    // GATE de precio: la viabilidad por altitud es pipeline de SIEMBRA — no corre
    // en una consulta de precio (evita la cascada "X es inviable en tu finca").
    const viabilidadBlock = isPriceQuery
      ? ''
      : buildViabilityContext({ fincaAltitud, resolvedEntities });
    const viabilidadContext = viabilidadBlock ? `\n\n${viabilidadBlock}` : '';

    // RIESGO TÉRMICO POR CULTIVO (heladas/calor en vivo). Cruza temp_min/temp_max
    // de la especie resuelta × la mínima/máxima del pronóstico ya cacheado (el
    // mismo climaSnapshot — NO se re-pide). Cero latencia. Degrada si no hay
    // temp_min/temp_max o no hay forecast.
    // GATE de precio: también es pipeline de SIEMBRA → no corre en consulta de precio.
    const frostHeatBlock = isPriceQuery
      ? ''
      : buildFrostHeatContext({ resolvedEntities, climaSnapshot });
    const frostHeatContext = frostHeatBlock ? `\n\n${frostHeatBlock}` : '';

    // ASOCIACIONES / POLICULTIVO. companions/antagonists del grounding cruzados
    // con el inventario del usuario (prioriza lo que ya tiene). Cero red.
    const asociacionBlock = buildAssociationContext({ resolvedEntities, groupedCultivos });
    const asociacionContext = asociacionBlock ? `\n\n${asociacionBlock}` : '';

    // SEGURIDAD: invasoras / conservación sensible. Bloqueo determinístico de
    // recomendación de siembra. Cero red.
    const seguridadBlock = buildInvasiveSafetyContext({ resolvedEntities });
    const seguridadContext = seguridadBlock ? `\n\n${seguridadBlock}` : '';

    // HECHOS CURADOS del grafo que la capa "ENTIDADES RESUELTAS" no emite (solo
    // pasa el nombre canónico): dosis/preparación verificada de biopreparados +
    // umbral de helada letal de especies. Es el lever anti-alucinación probado
    // por bench (2026-05-31): sin esto granite inventa la dosis. Cero red, puro
    // sobre el grounding ya resuelto. Degrada con gracia si no hay hechos.
    const curatedFactsBlock = buildCuratedFactsContext({ resolvedEntities });
    const curatedFactsContext = curatedFactsBlock ? `\n\n${curatedFactsBlock}` : '';

    // P4b — POSIBLES COINCIDENCIAS (baja confianza). Va al FINAL del prompt para
    // que la regla CASO B (pedir confirmación, no afirmar) domine por recency
    // sobre cualquier dato de altitud/viabilidad que el modelo quiera afirmar.
    const suggestedBlock = buildSuggestedEntitiesContext({ suggestedEntities });

    // P1 — gating de PRECIO no-disponible. Es la regla MÁS dominante: va de
    // ÚLTIMA (recency máxima) para que, en una consulta de precio sin dato, el
    // decline + orientación DANE/SIPSA/Corabastos gane sobre el bloque de
    // entidades resueltas / viabilidad / altitud. No-op si la query no es de
    // precio o el tool de precio sí trajo dato.
    const priceDeclineBlock = buildPriceDeclineContext({ userMessage: query, toolEvidence });

    // FERMENTOS (capa 1 SAFETY-CRITICAL, chagra-pro #159 — DR-FOOD-3). El
    // sidecar /fermento-prefilter ya detectó intención-fermento y armó un
    // bloque conservador (refusal/veto + disclaimer fuerte + veto de claims de
    // salud + autoridad institucional). Llega pre-formateado desde el sidecar
    // (system_prompt_block); va de ÚLTIMO (recency máxima, como priceDecline)
    // porque es la regla de mayor prioridad de seguridad: si la query toca un
    // fermento de consumo humano, este bloque DOMINA sobre cualquier otro. ''
    // (no-op) cuando no hubo intención-fermento o el sidecar no respondió
    // (degradación graceful — no rompe el turno).
    const fermentoSafetyBlock = (typeof fermentoBlock === 'string' && fermentoBlock.trim())
      ? `\n\n${fermentoBlock}`
      : '';

    const messages = [
      { role: 'system', content: systemPrompt + corpusContext + evidenceContext + resolvedEntitiesBlock + curatedFactsContext + seguridadContext + viabilidadContext + frostHeatContext + asociacionContext + climaContext + fincaContext + queryAnalysisBlock + suggestedBlock + priceDeclineBlock + fermentoSafetyBlock },
      ...(contextMemory ? [{ role: 'user', content: contextMemory }] : []),
      { role: 'user', content: query },
    ];

    const controller = new AbortController();
    activeControllerRef.current = controller;
    cancelReasonRef.current = null;

    // Deadline STREAM-AWARE (FIX prod P0 2026-06-02). Un único controlador que
    // combina el idle-timeout (reinicia por token → no aborta streams vivos) y
    // el techo absoluto (backstop extremo). Reemplaza el deadline TOTAL de 60s
    // que tumbaba respuestas largas-pero-vivas. La lógica pura vive en
    // streamDeadline.js (testeada con fake timers).
    const deadline = createStreamDeadline({
      onTimeout: (reason) => {
        console.warn(`[Agent] LLM deadline (${reason}) — aborting`);
        // Ambas razones ('idle'/'ceiling') se reportan como 'timeout' al merge
        // de estado: para el operador es el mismo caso "se cortó, reintenta".
        cancelReasonRef.current = 'timeout';
        controller.abort();
      },
    });
    // Conservamos el ref histórico (`stallTimerRef`) como holder del deadline
    // para que handlers externos (unmount/cleanup) puedan detenerlo igual que
    // antes detenían el watchdog.
    stallTimerRef.current = deadline;

    const markToken = (fullText) => {
      // Llegó un token: el stream está vivo → reinicia el idle-timer. El techo
      // absoluto sigue corriendo intacto.
      deadline.onToken();
      // Espejo del parcial en ref para que el catch lo preserve sin closure stale.
      streamingContentRef.current = fullText;
      setStreamingContent(fullText);
    };
    deadline.start();

    try {
      // Routing dual 2026-05-23: queries complejas (plagas regionales,
      // pasifloras confundibles, planes multi-aspecto, queries largas)
      // se enrutan a `chat_complex` (modelo complex configurado por default)
      // que es más lento pero evita confusiones taxonómicas en bench
      // anti-alucinación. Resto sigue en el modelo de chat configurado
      // (hot). `selectChatRoute` emite console.debug con
      // la decisión para diagnóstico en field testing.
      const chatRoute = selectChatRoute(query);
      const { url, body } = buildLLMRequest(chatRoute, messages);

      // SPEED-1: streaming end-to-end PWA→sidecar→Ollama. Solo si flag
      // VITE_AGENT_STREAMING=true Y sidecar habilitado Y online. Sin esto,
      // mantenemos el path directo `streamOpenAI` → /api/ollama/v1/chat/completions
      // (idéntico al baseline pre-SPEED-1). El sidecar emite SSE con shape
      // typed (start/delta/done) y AbortController propaga upstream para
      // cancellation (QUICK-5).
      const useStreamSidecar = isAgentStreamingEnabled() && isSidecarEnabled() && isOnline;

      if (useStreamSidecar) {
        console.warn('[Agent] LLM call start (sidecar stream)', {
          path: '/chat/stream',
          queryLen: query.length,
          route: chatRoute,
          model: body.model,
        });
        // Cualquier fallo del sidecar (502 ollama down, network) cae al
        // catch externo del runner. NO hacemos fallback automático al path
        // directo: mezclar paths en el mismo turn complica diagnóstico y
        // telemetría. El operador apaga la flag VITE_AGENT_STREAMING si
        // quiere bajar al baseline.
        const { fullText, stats } = await streamChatViaSidecar({
          model: body.model,
          messages,
          options: {
            temperature: body.temperature,
            num_predict: body.max_tokens,
          },
          keep_alive: body.keep_alive,
          onToken: (_chunk, full) => markToken(full),
          signal: controller.signal,
        });
        console.warn('[Agent] LLM call complete (sidecar stream)', {
          responseLen: fullText?.length || 0,
          first_token_ms: stats?.first_token_ms,
          sidecar_first_token_ms: stats?.sidecar_first_token_ms,
          eval_rate: stats?.eval_rate,
        });
        return fullText;
      }

      console.warn('[Agent] LLM call start', { url, queryLen: query.length, route: chatRoute, model: body.model });
      const result = await streamOpenAI(
        url,
        body,
        (_chunk, fullText) => markToken(fullText),
        { signal: controller.signal },
      );
      console.warn('[Agent] LLM call complete', { responseLen: result?.length || 0 });
      return result;
    } catch (e) {
      if (e.name === 'AbortError') {
        // Bug UX 2026-05-30: NO aplastamos el parcial acá. Propagamos un error
        // tipado con la razón de interrupción ('timeout'/'cancel'/'abort') para
        // que runAgentPipeline corra el merge del estado final y preserve el
        // texto streamed si lo hubo. cancelReasonRef lo setea handleCancelLLM
        // (cancel) o el timer/watchdog (timeout); por defecto 'abort' genérico.
        const interruptErr = new Error('Inferencia interrumpida');
        interruptErr.interrupted = true;
        interruptErr.interruptReason = cancelReasonRef.current || 'abort';
        throw interruptErr;
      }
      const match = e.message.match(/^LLM (\d+)/);
      if (match) {
        const status = parseInt(match[1], 10);
        if (status === 401 || status === 403) {
          throw new Error('Sesion expirada, recarga la app');
        }
        if (status >= 500 && status <= 503) {
          throw new Error('IA no disponible, intenta de nuevo en un momento');
        }
        throw new Error(`Error al consultar IA (codigo: ${status})`);
      }
      throw new Error('IA no disponible, intenta de nuevo en un momento');
    } finally {
      // Detiene idle + techo del deadline stream-aware (limpia ambos timers).
      if (stallTimerRef.current && typeof stallTimerRef.current.stop === 'function') {
        stallTimerRef.current.stop();
      }
      stallTimerRef.current = null;
      activeControllerRef.current = null;
    }
  };

  // Task #121: pipeline LLM extraído de handleSubmit. Ejecuta el flow
  // completo (RAG, sidecar, LLM, TTS, action gate) para UN solo texto.
  // No toca el queue store — eso lo hace handleSubmit antes/después.
  // Tampoco hace re-entry guard porque el queue ya garantiza serialización.
  const runAgentPipeline = async (text, { suppressUserBubble = false, visionContext = null, forcedIntent = null } = {}) => {
    // Bug 2026-05-31: cuando el item viene de la outbox multimodal (foto /
    // adjunto), el caller YA pintó la burbuja de usuario REAL (con su imagen).
    // Si además pintáramos aquí una burbuja con el prompt sintético ("Analicé
    // una foto…") el usuario vería DOS burbujas y la imagen quedaría huérfana.
    // suppressUserBubble evita ese duplicado: el LLM recibe `text`, pero la UI
    // ya tiene la burbuja correcta del caller.
    if (!suppressUserBubble) {
      const userMessage = {
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);
    }
    setStreamingContent('');
    setState(STATE_THINKING);
    setError('');
    agentSounds.start();

    // Free 7→10 fix-pack #5: normalización léxica regional Cauca.
    // Si la finca activa es del Cauca andino/pacífico, reemplazamos
    // términos rurales locales ("papa runa", "rascadero", "jelao", ...)
    // por sus equivalentes estándar antes de mandar al LLM. La UI sigue
    // mostrando el texto original del usuario (userMessage.content arriba),
    // pero el LLM recibe la versión normalizada para que la respuesta sea
    // sobre el concepto correcto.
    //
    // En regiones no-Cauca o sin finca activa, esto es no-op (passthrough).
    const fincaActiva = fincas.find((f) => f.slug === activeFincaSlug);
    const textForLLM = normalizeUserInputForRegion(text, fincaActiva);

    try {
      // Bug N3 fix: en sesión fresca (gap >30min o reset explícito) NO
      // inyectamos history previo como contextMemory del LLM. Tomamos
      // snapshot del flag ANTES de addTurn para que la condición no
      // dependa del orden de writes a IndexedDB. Tras este submit, los
      // turns subsiguientes en esta mount sí incluyen contextMemory
      // (que en ese punto sólo contiene los turns nuevos de la sesión).
      const wasFreshSession = isFreshSessionRef.current;
      isFreshSessionRef.current = false;
      setShowFreshSessionBadge(false);

      await addTurn(operatorId, { role: 'user', content: text.trim() });

      const contextMemory = wasFreshSession ? '' : await getContextString(operatorId, 10);
      const contextCorpus = await retrieve(textForLLM, 3, 'agente');

      // ADR-045 Fase 2 Step B/C — sidecar NLU + MCP tool grounding.
      // Solo si flag VITE_USE_SIDECAR_AGRO_MCP=true Y estamos online.
      // Si sidecar falla / no aplica, sigue al chat con RAG-only (no
      // degrada UX). El planNlu/callTool wrappers son no-throw: devuelven
      // null en error/timeout. La evidencia se inyecta como bloque
      // delimitado en el system prompt para grounding citable.
      let toolEvidence = null;
      let resolvedEntities = null;
      // P4 (juez claude-cli 2026-06-02): las entidades de BAJA confianza (<0.7,
      // p.ej. "culupa"→Gulupa fuzzy a 0.5) NO se descartan más — se separan en
      // este bucket para presentarlas como SUGERENCIA (CASO B) en vez de
      // afirmarlas como hecho.
      let suggestedEntities = null;
      // FERMENTOS (capa 1 SAFETY-CRITICAL, chagra-pro #159 — DR-FOOD-3). Bloque
      // de instrucción ya formateado por el sidecar (/fermento-prefilter). ''
      // por default → no-op en el system prompt si no hubo intención-fermento o
      // el sidecar no respondió (degradación graceful).
      let fermentoBlock = '';
      if (isOnline && isSidecarEnabled()) {
        try {
          // PASO 1 — pre-validation AGE (DR taxonómico Tier 1 B, PR #59).
          // Resuelve entidades vegetales/plagas a binomio canónico autoritativo
          // ANTES del LLM. El LLM ya no puede inventar "gulupa = Psidium".
          // Pasamos finca_altitud (mismo request, CERO latencia) para que el
          // grounding traiga viabilidad 3-niveles + alternativas por especie.
          const reAltitud = (() => {
            try { const p = getProfile(); if (p && p.finca_altitud != null) return p.finca_altitud; } catch (_) { /* noop */ }
            return (fincaActiva && fincaActiva.altitud) || null;
          })();
          const tRE0 = performance.now();
          // SAFETY-CRITICAL en PARALELO: /fermento-prefilter corre junto a
          // /resolve-entities (mismo turno, antes del LLM) — CERO latencia
          // serial añadida. Ambos wrappers son no-throw (devuelven null en
          // error/timeout), así que Promise.all no puede rechazar por ellos.
          const [resolved, fermento] = await Promise.all([
            resolveEntities(textForLLM, { fincaAltitud: reAltitud }),
            fermentoPrefilter(textForLLM),
          ]);
          const tRE1 = performance.now();
          // FERMENTOS: si el sidecar marcó intención-fermento, inyectamos su
          // bloque conservador (refusal/veto + disclaimer + veto de claims de
          // salud) al final del system prompt (recency máxima). Si el sidecar
          // no respondió (null) o no es intención-fermento, fermentoBlock queda
          // '' → no-op, el turno sigue sin romperse (degradación graceful).
          if (fermento && fermento.is_fermento_intent && typeof fermento.system_prompt_block === 'string' && fermento.system_prompt_block.trim()) {
            fermentoBlock = fermento.system_prompt_block;
            console.debug('[sidecar] fermento-prefilter', {
              fermentoId: fermento.fermento_id,
              vetoTotal: fermento.veto_total,
              disclaimerFuerte: fermento.disclaimer_fuerte,
              fuenteAutoridad: fermento.fuente_autoridad,
              reason: fermento.reason,
            });
          }
          if (resolved && Array.isArray(resolved.entities) && resolved.entities.length > 0) {
            // P4: dos buckets. Las de confianza ALTA (>=0.7, sin flag de baja
            // confianza) van como ENTIDADES RESUELTAS canónicas y alimentan los
            // bloques de viabilidad/altitud/companions. Las de baja confianza
            // (low_confidence/suggested/fuzzy/ambiguous o confidence <0.7) NO se
            // tiran: van a `suggestedEntities` como POSIBLES COINCIDENCIAS que
            // gatillan CASO B (pedir confirmación), NUNCA como hecho.
            const canonical = resolved.entities.filter((e) => !isLowConfidenceEntity(e));
            const suggested = resolved.entities.filter((e) => isLowConfidenceEntity(e));
            if (canonical.length > 0) {
              resolvedEntities = canonical;
            }
            if (suggested.length > 0) {
              suggestedEntities = suggested;
            }
            console.debug('[sidecar] resolve-entities', {
              canonical: canonical.length,
              suggested: suggested.length,
              latencyMs: Math.round(tRE1 - tRE0),
              entities: canonical.map((e) => `${e.mentioned}→${e.canonical_id}`),
              suggestedEntities: suggested.map((e) => `${e.mentioned}→${e.canonical_id}@${e.confidence}`),
            });
          }

          // PASO 2 — routing del tool.
          //
          // CHIPS DE MODO (A3): si el usuario forzó la intención tocando un
          // chip, NO consultamos el NLU planner — su misrouting es justo lo
          // que el chip evita (incidente "papa precio"). `planForcedIntent`
          // mapea (intent, texto) → tool determinístico + args, y lo llamamos
          // directo. El municipio sale de la finca activa para el modo clima.
          // Si no hay chip activo, conservamos el flujo NLU original.
          if (forcedIntent) {
            const activeFincaClima = fincas.find((f) => f.slug === activeFincaSlug);
            const municipioClima =
              activeFincaClima?.municipio || FARM_CONFIG?.MUNICIPIO || null;
            const forcedPlan = planForcedIntent(forcedIntent, textForLLM, {
              municipio: municipioClima,
            });
            if (forcedPlan && forcedPlan.tool) {
              if (forcedPlan.stub && forcedPlan.stubResult) {
                // Modo clima sin municipio: inyectamos evidence sintética que
                // obliga al LLM a PEDIR el municipio (NO inventar datos IDEAM).
                toolEvidence = {
                  tool: forcedPlan.tool,
                  args: forcedPlan.args,
                  result: forcedPlan.stubResult,
                };
                console.debug('[sidecar] chip forzado — evidence sintética', {
                  intent: forcedIntent,
                  tool: forcedPlan.tool,
                  reason: forcedPlan.stubResult.reason,
                });
              } else {
                const tTool0 = performance.now();
                const result = await callTool(forcedPlan.tool, forcedPlan.args);
                const tTool1 = performance.now();
                if (result) {
                  toolEvidence = { tool: forcedPlan.tool, args: forcedPlan.args, result };
                  console.debug('[sidecar] chip forzado (NLU saltado)', {
                    intent: forcedIntent,
                    tool: forcedPlan.tool,
                    latencyTool: Math.round(tTool1 - tTool0),
                  });
                } else {
                  console.debug('[sidecar] chip forzado tool null', {
                    intent: forcedIntent,
                    tool: forcedPlan.tool,
                  });
                }
              }
            }
          } else {
          // PASO 2b — NLU planner + tool call (flow original, sin chip).
          const tNlu0 = performance.now();
          const plan = await planNlu(textForLLM, contextMemory);
          const tNlu1 = performance.now();
          // D2 (#246) — modo cadena: si el sidecar devolvió `tool_chain`
          // (array no vacío), ejecutamos cada paso en orden y usamos el
          // array de evidences como toolEvidence. El formatter y el
          // computeSourceMetadata ya soportan arrays.
          if (plan?.useTool && Array.isArray(plan.toolChain) && plan.toolChain.length > 0) {
            const tTool0 = performance.now();
            const chainEvidences = await executeToolChain(plan.toolChain);
            const tTool1 = performance.now();
            const useful = chainEvidences.filter((ev) => ev && ev.result != null);
            if (useful.length > 0) {
              toolEvidence = useful;
              const evidenceBytes = (() => {
                try { return JSON.stringify(useful.map((e) => e.result)).length; } catch (_) { return 0; }
              })();
              console.debug('[sidecar]', {
                chain: useful.map((e) => e.tool),
                latencyNlu: Math.round(tNlu1 - tNlu0),
                latencyChain: Math.round(tTool1 - tTool0),
                toolEvidenceBytes: evidenceBytes,
              });
            } else {
              console.debug('[sidecar] tool_chain todos null', {
                latencyNlu: Math.round(tNlu1 - tNlu0),
                latencyChain: Math.round(tTool1 - tTool0),
              });
            }
          } else if (plan?.useTool && plan.tool && plan.args) {
            const tTool0 = performance.now();
            const result = await callTool(plan.tool, plan.args);
            const tTool1 = performance.now();
            if (result) {
              toolEvidence = { tool: plan.tool, args: plan.args, result };
              const evidenceBytes = (() => {
                try { return JSON.stringify(result).length; } catch (_) { return 0; }
              })();
              console.debug('[sidecar]', {
                tool: plan.tool,
                latencyNlu: Math.round(tNlu1 - tNlu0),
                latencyTool: Math.round(tTool1 - tTool0),
                toolEvidenceBytes: evidenceBytes,
              });
            }
          } else if (plan) {
            console.debug('[sidecar]', {
              tool: null,
              latencyNlu: Math.round(tNlu1 - tNlu0),
              reason: plan.reason || 'no_tool',
            });
          }

          // #349 — DEGRADE BEST-EFFORT CON GROUNDING. Si el NLU planner MURIÓ
          // (`plan === null`: timeout/fail del sidecar bajo contención de GPU) y
          // todavía no hay evidencia de tool, NO degradamos a generativo puro:
          // derivamos un tool OBVIO (entidad ya resuelta por resolveEntities, o
          // keyword del mensaje) y lo intentamos. Así el LLM recibe el grounding
          // rico (ficha/companions/controladores) en vez de solo el binomio
          // ligero — o, en el peor caso, al menos la ficha de la especie.
          //
          // SOLO corre cuando el planner devolvió NULL (murió), NUNCA cuando el
          // planner decidió deliberadamente "no_tool" (`plan` truthy con useTool
          // false): esa es una decisión válida (ej. preguntas de inventario) que
          // no debemos pisar con un tool forzado. callTool ya es no-throw.
          if (!toolEvidence && !plan) {
            const fbPlan = planNluFallback(textForLLM, resolvedEntities);
            if (fbPlan && fbPlan.tool) {
              const tFb0 = performance.now();
              const fbResult = await callTool(fbPlan.tool, fbPlan.args);
              const tFb1 = performance.now();
              if (fbResult) {
                toolEvidence = { tool: fbPlan.tool, args: fbPlan.args, result: fbResult };
                console.debug('[sidecar] NLU muerto — grounding best-effort (#349)', {
                  tool: fbPlan.tool,
                  source: fbPlan.source,
                  latencyTool: Math.round(tFb1 - tFb0),
                });
              } else {
                console.debug('[sidecar] NLU muerto — fallback tool null (#349)', {
                  tool: fbPlan.tool,
                  source: fbPlan.source,
                });
              }
            }
          }
          }

          // PASO 3 — detección heurística frontend de intent climática
          // mientras NLU sidecar no se actualiza (TODO en nlu.ts del sidecar).
          // Si el user pregunta por clima/lluvia/temperatura → llamar
          // get_clima_ideam('monthly_avg', { municipio, metric, desde }) para
          // grounding macro. Optimista no-estricto: si falla → seguimos sin
          // clima inyectado (graceful degrade — el LLM tira de RAG y dice
          // "no tengo IDEAM" en último caso). Solo se ejecuta si NO hubo
          // tool ya invocado vía NLU para no inflar contexto. Tampoco corre
          // bajo chip forzado: el chip ya decidió el tool determinístico (el
          // modo clima tiene su propia rama), no re-inferimos por keywords.
          if (!toolEvidence && !forcedIntent) {
            const climaKeywords = /clima|lluvia|llueve|llover|temperatura|sequ[íi]a|fr[íi]o|calor|estaci[óo]n\s+meteorol[óo]gica|ideam|precipitaci[óo]n|pron[óo]stico|reporte\s+(del\s+)?tiempo/i;
            // Bug piloto 2026-05-27: FARM_CONFIG.MUNICIPIO viene de build-time
            // env (VITE_FARM_MUNICIPIO). En prod sin esa env queda null y
            // el tool jamás se llamaba → LLM respondía "no tengo acceso a
            // datos meteorológicos, consulta IDEAM". Cascade: 1) finca
            // activa, 2) FARM_CONFIG demo, 3) null + tool con flag
            // no_municipio para que el LLM PIDA el municipio al usuario.
            const activeFinca = fincas.find((f) => f.slug === activeFincaSlug);
            const municipio = activeFinca?.municipio || FARM_CONFIG?.MUNICIPIO || null;
            if (climaKeywords.test(text) && !municipio) {
              // Inyectar evidencia explícita "no_municipio" — el LLM
              // debe pedirle al user su municipio, NO redirigirlo a IDEAM
              // externo.
              toolEvidence = {
                tool: 'get_clima_ideam',
                args: { action: 'monthly_avg' },
                result: {
                  available: false,
                  reason: 'no_municipio',
                  hint: 'pedirle al usuario su municipio para consultar IDEAM',
                },
              };
              console.debug('[sidecar] clima sin municipio — evidence no_municipio inyectada');
            }
            if (climaKeywords.test(text) && municipio) {
              try {
                const tClima0 = performance.now();
                const desdeDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                  .toISOString()
                  .slice(0, 10);
                const climaResult = await getClimaIdeam('monthly_avg', {
                  municipio,
                  metric: 'precipitation',
                  desde: desdeDate,
                });
                const tClima1 = performance.now();
                if (climaResult) {
                  toolEvidence = {
                    tool: 'get_clima_ideam',
                    args: { action: 'monthly_avg', municipio, metric: 'precipitation', desde: desdeDate },
                    result: climaResult,
                  };
                  console.debug('[sidecar] clima_ideam heuristic hit', {
                    municipio,
                    latencyMs: Math.round(tClima1 - tClima0),
                  });
                } else {
                  console.debug('[sidecar] clima_ideam heuristic null', { municipio });
                }
              } catch (climaErr) {
                console.debug('[sidecar] clima_ideam fail', climaErr?.message);
              }
            }
          }
        } catch (sidecarErr) {
          // Defensa extra: planNlu/callTool/resolveEntities ya son no-throw,
          // pero si algo raro pasa NO bloqueamos el chat.
          console.debug('[sidecar] inesperado, sigo con RAG-only:', sidecarErr?.message);
        }
      }

      const rawResponse = await callLLM(textForLLM, contextMemory, contextCorpus, toolEvidence, resolvedEntities, suggestedEntities, fermentoBlock);
      // DR-LANG-1: filtro post-process anti-voseo argentino. Es la última
      // línea de defensa estructural — garantiza que el léxico rioplatense
      // (che, laburar, etc.) NUNCA llegue al usuario campesino colombiano,
      // independientemente de lo que el modelo decida emitir. La función es
      // idempotente y O(n) sobre el largo del texto.
      // C1/C2 (2026-06-02): region-aware. Pasamos la región lingüística del
      // perfil del usuario para que el voseo AUTÉNTICO se preserve donde es el
      // registro propio (paisa/pacífico/pastuso) y se aplane donde no (tú en
      // caribe, usted por defecto). Sin región conocida → default seguro.
      // BUG A fix (fuga de roles, prod 2026-05-30): defensa #2 post-proceso.
      // Trunca cualquier turno falso "Usuario:"/"Asistente:" que el modelo
      // haya inventado (el path de streaming del sidecar NO reenvía las stop
      // sequences de llmRouter, así que el filtro estructural por sí solo no
      // cubre el 100% de los casos). Va ANTES del voseo para no analizar
      // basura, y el resultado se persiste/renderea/habla ya saneado.
      const deLeaked = stripRoleLeak(rawResponse);
      const voseoSafe = applyVoseoFilter(deLeaked, { formality: 'usted', region: resolveUserRegion() });
      // GUARDAS DETERMINISTAS sobre la SALIDA (bench 10 prompts 2026-05-30: el
      // modelo TIENE los hechos en el grounding pero razona mal —invierte
      // viabilidad, INVENTA agroquímicos sintéticos, recomienda invasoras—).
      // Enforcean los hechos de resolvedEntities (viabilidad / es_invasora /
      // altitud_min/max + alternativas_viables) + la altitud de la finca sobre
      // el texto ya generado, ANTES de mostrarlo/persistirlo/hablarlo. PURAS y
      // SÍNCRONAS: CERO latencia nueva. Telemetría en localStorage
      // (chagra:output_guard_triggers). Degradan con gracia (sin entities no
      // hacen nada salvo el guard de agroquímico, que usa denylist propia).
      const guardAltitud =
        (fincaActiva && fincaActiva.altitud) ||
        (() => { try { const p = getProfile(); return (p && p.finca_altitud) || null; } catch (_) { return null; } })();
      // P0 (prod 2026-05-31): el agente FABRICABA un diagnóstico visual sin foto
      // real ("Analicé una foto, estado 95/100" + hallazgos de Mapacho del RAG
      // de tabaco). hadVision marca si ESTE turno trajo una imagen real
      // (item de foto + analyzeFoliage corrido); sin foto, el guard de visión
      // reemplaza cualquier afirmación visual por un mensaje honesto que pide la
      // foto. visionConfidence permite suavizar hallazgos si la visión no fue
      // concluyente. Para turnos de texto/voz, visionContext es null → hadVision
      // false → corrige cualquier afirmación visual inventada.
      const guardProfileName =
        (() => { try { const p = getProfile(); return (p && p.nombre) || null; } catch (_) { return null; } })();
      // HARDENING térmico (audit #23): mínima/máxima esperadas del pronóstico ya
      // cacheado (mismo snapshot que buildFrostHeatContext — NO se re-pide).
      // Habilita guardThermalViability para advertir helada/golpe de calor sobre
      // un cultivo recomendado. Degrada con gracia: sin snapshot/forecast → null
      // → el guard es no-op.
      const { forecastTempMin, forecastTempMax } = (() => {
        try {
          const snap = getCachedClimaSnapshot();
          const om = snap && typeof snap === 'object' ? snap.openmeteo : null;
          const fc = om && om.available && Array.isArray(om.forecast_7d) ? om.forecast_7d : null;
          if (!fc || fc.length === 0) return { forecastTempMin: null, forecastTempMax: null };
          let min = null;
          let max = null;
          for (const d of fc) {
            if (d && typeof d.temp_min_c === 'number' && (min == null || d.temp_min_c < min)) min = d.temp_min_c;
            if (d && typeof d.temp_max_c === 'number' && (max == null || d.temp_max_c > max)) max = d.temp_max_c;
          }
          return { forecastTempMin: min, forecastTempMax: max };
        } catch (_) {
          return { forecastTempMin: null, forecastTempMax: null };
        }
      })();
      const guarded = applyOutputGuards(voseoSafe, {
        resolvedEntities,
        fincaAltitud: guardAltitud,
        hadVision: !!(visionContext && visionContext.hadVision),
        visionConfidence: (visionContext && visionContext.visionConfidence) ?? null,
        profileName: guardProfileName,
        forecastTempMin,
        forecastTempMax,
        // A12 (cierra bug prod 2026-06-02): la pregunta CRUDA del usuario. Si es
        // de PRECIO/MERCADO ("¿a cómo está la papa?") los guards de SIEMBRA NO
        // corren —razonan sobre viabilidad de cultivo, irrelevante a un precio—,
        // evitando la cascada de "NO es viable a N msnm" por cada variedad. Los
        // guards de SAFETY (agroquímico, dosis, visión, nombre) corren igual.
        userMessage: text,
      });
      if (guarded.modified) {
        console.debug('[guards] salida corregida', { reasons: guarded.reasons });
      }
      // A24 (guard ASYNC taxonómico) se REMOVIÓ 2026-06-06: estaba muerto en
      // producción —filtraba por `res.valid===false` pero el tool real
      // `validate_taxonomy` devuelve `{found,source,canonical_*}` y nunca
      // `valid`—. La cobertura taxonómica la dan los guards síncronos de
      // applyOutputGuards (#1332 binomio benéfico + 5/5b sustitución/companion)
      // y el grounding de resolve-entities. Ver outputGuards.js.
      let response = guarded.text;
      agentSounds.chime();

      const { intent } = parseIntent(text);

      // 2026-05-23: badge de "fuente" — persistimos en metadata si el turno
      // del assistant fue grounded contra el catálogo (tool MCP devolvió
      // match) o fue solo generativo del LLM. ChatBubble lee este metadata
      // para renderizar el badge verde/amber/gris (ver computeSourceMetadata).
      let sourceMetadata = computeSourceMetadata(toolEvidence);

      // #18 + #20: surfacéa en metadata las señales del grounding curado que la
      // UX muestra como badges — `fuente_url`/`fuente` (fuente verificable
      // clickeable, Agrosavia/FAO) y `confianza` ∈ {alta,media,baja} de un
      // biopreparado/dosis (color del badge). Puro y graceful: sin entidades o
      // sin esos campos → no añade nada. #19: `auto_corrected` marca que los
      // guards deterministas modificaron la respuesta (badge "auto-corregida").
      const groundingBadges = extractGroundingBadges(resolvedEntities);
      // #356: si el grounding curado no aportó un link de fuente, derivarlo del
      // TOOL que respondió (p.ej. get_clima_ideam → "Fuente: IDEAM" clickeable a
      // ideam.gov.co). Las entidades mandan (deep-link de ficha); el tool es el
      // fallback. Graceful: sin fuente institucional → {} y no se añade badge.
      const evidenceSourceLink = groundingBadges.fuente_url
        ? {}
        : deriveEvidenceSourceLink(toolEvidence);
      sourceMetadata = {
        ...sourceMetadata,
        ...evidenceSourceLink,
        ...groundingBadges,
        auto_corrected: guarded.modified === true,
      };

      // Capa 2 anti-alucinación — cross-check de contexto (operador 2026-05-30).
      // Tras generar la respuesta, le pedimos al sidecar que correlacione cada
      // binomio Linneano CITADO en el texto con las entidades que la capa 1 ya
      // resolvió para el turno. El post-validate devuelve DOS señales:
      //   - `suspect[]`      → nombre científico que SÍ existe en el catálogo
      //     pero NO corresponde a lo preguntado (ej. "Solanum lycopersicum" para
      //     'tomate de árbol' = Solanum betaceum).
      //   - `hallucinated[]` → binomio 100% INVENTADO por el modelo, que NO
      //     existe en AGE ni en la realidad (ej. "Neolepidopteron daquila").
      // FIX 2 (2026-05-31): antes solo consumíamos `suspect` → el binomio
      // inventado se detectaba y se tiraba en silencio. Ahora `mergePostValidate
      // Metadata` surfacea AMBOS como flags de metadata para que el ChatBubble
      // muestre el badge correspondiente. NO bloquea ni reescribe la respuesta.
      // Solo corre si hubo entidades resueltas. 100% graceful: postValidate
      // devuelve null ante flag off / offline / timeout / AGE caído → sin badge.
      if (isOnline && isSidecarEnabled() && Array.isArray(resolvedEntities) && resolvedEntities.length > 0) {
        try {
          const expected = resolvedEntities
            .map((e) => e?.nombre_cientifico)
            .filter((n) => typeof n === 'string' && n.trim().length > 0);
          if (expected.length > 0) {
            const pv = await postValidate(response, expected);
            sourceMetadata = mergePostValidateMetadata(sourceMetadata, pv);
            if (sourceMetadata.hallucinated_names || sourceMetadata.suspect_names) {
              console.debug('[sidecar] post-validate flags', {
                hallucinated: sourceMetadata.hallucinated_names,
                suspect: sourceMetadata.suspect_names,
              });
            }
          }
        } catch (pvErr) {
          // post-validate jamás bloquea el chat — la respuesta ya está lista.
          console.debug('[sidecar] post-validate fail (sigo sin badge):', pvErr?.message);
        }
      }

      // A-15 (#248): extraer los edges del grafo AGE que ESTE turno usó como
      // evidencia (café→guamo COMPATIBLE_WITH, plaga→biopreparado CONTROLS,
      // etc.) para que el feedback 👍👎 los lleve al motor E3. Si el turno no
      // tocó relaciones del grafo → [] (sin regresión).
      const turnEdges = extractEdges(toolEvidence);

      const assistantMessage = {
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        metadata: sourceMetadata,
        _edges: turnEdges,
      };

      await addTurn(operatorId, {
        role: 'assistant',
        content: response,
        metadata: sourceMetadata,
      });
      setMessages((prev) => [...prev, assistantMessage]);

      // Task #122: cachear el último mensaje del agente en el store global
      // para que el doble-click del avatar (cualquier pantalla) pueda re-
      // reproducirlo via replayLast(). responseReady NO se setea acá porque
      // el usuario ESTÁ en AgentScreen — el glow se activa cuando alguien
      // sale a otra pantalla mid-stream y vuelve a recibir respuesta tarde.
      // Para cubrir ese caso, también lo seteamos pero igualmente markRead
      // se dispara al ver el componente activo (efecto cancelado al volver).
      if (response) {
        setLastNotificationMessage(response);
        setResponseReady(true);
      }

      if (ttsEnabled && response) {
        stop();
        if (kokoroReady) {
          // Free 7→10 fix-pack #4: streaming frase-por-frase reduce la
          // latencia hasta-primer-audio de "esperar respuesta entera"
          // (3-23s) a "esperar primera frase" (<2s). Internamente fallback
          // a speakKokoro/speak en caso de error en la primera frase.
          speakSentences(response, { rate: 0.9, pitch: 1.0 });
        } else {
          speak(response, { rate: 0.9, pitch: 1.0 });
        }
      }

      // 057.4 integration: en lugar de abrir el modal directo, delegamos a
      // executeAction que dispara el callback registrado (que abre el modal),
      // espera resolución del operador, ejecuta el tool.handler de llmTools
      // (que internamente llama store.addLog) y loguea audit trail.
      if (intent && intent.toolName === 'crear_log') {
        setState(STATE_IDLE); // libera UI mientras se muestra el modal
        const assetId = plants?.[0]?.id;
        const proposal = {
          tool_name: 'crear_log',
          parameters: {
            asset_id: assetId || '',
            log_type: intent.logType,
            notes: formatIntentDescription(intent),
            timestamp: new Date().toISOString(),
            ...(intent.quantity && intent.unit && { quantity: intent.quantity, unit: intent.unit }),
          },
          intent: text,
          llm_response: response,
          timestamp: new Date().toISOString(),
        };
        const result = await executeAction(proposal, operatorId);
        if (result.status === 'executed' && result.result?.success) {
          const successMsg = {
            role: 'assistant',
            content: `Listo. He registrado la ${intent.logType.replace('log--', '')} en tu bitácora.`,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, successMsg]);
        }
        return;
      }
    } catch (e) {
      console.error('[Agent] Error:', e);
      // Bug UX 2026-05-30: si la inferencia se interrumpió (abort/timeout/cancel)
      // y ya había texto parcial streamed, NO lo borramos. El merge decide:
      //   - con parcial  → conservamos el texto + marcador NO destructivo,
      //     marcamos el mensaje _incomplete con botón Reintentar, sin banner rojo.
      //   - sin parcial  → mostramos el mensaje de error completo en el banner
      //     (abort antes del primer token: comportamiento previo correcto).
      // Errores NO-interrupción (HTTP 5xx, sesión expirada, etc.) caen al banner
      // como siempre.
      if (e?.interrupted) {
        const partial = streamingContentRef.current || '';
        const merged = mergePartialOnInterruption({
          partialContent: partial,
          reason: e.interruptReason,
        });
        if (merged.preservePartial) {
          const incompleteMessage = {
            role: 'assistant',
            content: merged.content,
            timestamp: Date.now(),
            _incomplete: true,
            // Reusa el flujo orphan_recovery para que ChatBubble renderice el
            // botón "Reintentar" (re-envía el prompt original sin re-tipear) y
            // suprima 👍👎/TTS sobre una respuesta a medias.
            _orphan_recovery: true,
            _orphan_prompt: text.trim(),
          };
          setMessages((prev) => [...prev, incompleteMessage]);
          // NO persistimos el parcial+marcador en conversationMemory: el LLM no
          // debe arrastrar texto cortado como si fuera contexto válido.
          setError('');
        } else {
          setError(merged.error);
        }
      } else {
        setError(e.message || 'No pude conectarme al asistente. Intenta de nuevo.');
      }
    } finally {
      setState(STATE_IDLE);
      setStreamingContent('');
      streamingContentRef.current = '';
      cancelReasonRef.current = null;
    }
  };

  // Task #121: puerta de entrada al pipeline. Gestiona queueing (max 2),
  // ETA, hint paralelo, rechazo de 3ras. Si la pregunta entra como
  // processing, ejecuta runAgentPipeline + al terminar promueve cualquier
  // pending. Si entra como queued, solo agrega visualmente el mensaje al
  // chat (lo procesará la promoción cuando termine el actual). Si entra
  // rejected, muestra toast.
  /**
   * Retry de pregunta huérfana — botón "Reintentar" en mensaje
   * `_orphan_recovery`. Re-envía el prompt original via handleSubmit
   * sin que el operador tenga que re-tipear. Antes del retry limpia
   * los dos mensajes huérfanos (user original + orphan_recovery) para
   * que el nuevo turno quede limpio.
   *
   * Bug fix 2026-05-27: el copy anterior pedía "Vuelve a preguntarla"
   * sin acción asociada. Testers móviles cambian de app durante
   * inferencia y al volver el re-tipear es fricción alta.
   */
  const handleRetryOrphan = useCallback(async (prompt) => {
    if (typeof prompt !== 'string' || prompt.trim().length === 0) return;
    setMessages((prev) => {
      const clone = [...prev];
      // Quitar el orphan_recovery + el user message que lo originó.
      while (clone.length > 0) {
        const last = clone[clone.length - 1];
        if (last._orphan_recovery) {
          clone.pop();
          continue;
        }
        if (last.role === 'user') {
          clone.pop();
          break;
        }
        break;
      }
      return clone;
    });
    await handleSubmit(prompt);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Deep Research (A6/A7): cancela el job en vuelo del card identificado por msgId.
  const handleCancelDeepResearch = useCallback((msgId) => {
    const ctrl = deepResearchControllersRef.current.get(msgId);
    if (ctrl) {
      ctrl.abort();
      deepResearchControllersRef.current.delete(msgId);
    }
    // Marcar el card como cancelado en el historial
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m._deepResearch
          ? { ...m, _deepResearch: { ...m._deepResearch, status: 'error' } }
          : m,
      ),
    );
  }, []);

  const handleSubmit = async (text, { fromVoice = false, suppressUserBubble = false, visionContext = null, forcedIntent = null } = {}) => {
    if (!text || !text.trim()) return;
    const trimmed = text.trim();

    // DEEP RESEARCH (A6/A7): chip 🔬 con backend live. Interceptamos ANTES del
    // stub-check y del pipeline NLU. Lanzamos el job async y ponemos un card
    // de progreso en el chat que se actualiza vía polling hasta status=done.
    // Gate: VITE_DEEP_RESEARCH_ENABLED + online. Si la flag está off o no hay
    // conexión, devuelve el mensaje honesto de no disponibilidad.
    if (forcedIntent && isDeepResearchIntent(forcedIntent)) {
      const userMessage = { role: 'user', content: trimmed, timestamp: Date.now() };
      setMessages((prev) => [...prev, userMessage]);
      try {
        await addTurn(operatorId, { role: 'user', content: trimmed });
      } catch (e) {
        console.warn('[DeepResearch] addTurn user failed:', e?.message);
      }
      setActiveIntent(null);

      // Gate: feature flag + online
      if (!isDeepResearchEnabled()) {
        const notAvailMsg = {
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          _deepResearch: { status: 'disabled', steps: [], report: '', citations: [], query: trimmed },
        };
        setMessages((prev) => [...prev, notAvailMsg]);
        return;
      }
      if (!navigator.onLine) {
        const offlineMsg = {
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          _deepResearch: { status: 'offline', steps: [], report: '', citations: [], query: trimmed },
        };
        setMessages((prev) => [...prev, offlineMsg]);
        return;
      }

      // Añadir card de progreso con status 'submitting'
      const drMsgId = `dr-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const progressMsg = {
        id: drMsgId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        _deepResearch: { status: 'submitting', steps: [], report: '', citations: [], query: trimmed },
      };
      setMessages((prev) => [...prev, progressMsg]);

      // Lanzar el job async — NO esperamos el resultado para no bloquear el UI
      (async () => {
        const controller = new AbortController();
        deepResearchControllersRef.current.set(drMsgId, controller);

        try {
          const jobResult = await submitDeepResearch(trimmed);
          if (!jobResult || !jobResult.job_id) {
            // submit falló
            setMessages((prev) =>
              prev.map((m) =>
                m.id === drMsgId
                  ? { ...m, _deepResearch: { ...m._deepResearch, status: 'error' } }
                  : m,
              ),
            );
            return;
          }

          // Cambiar a 'running'
          setMessages((prev) =>
            prev.map((m) =>
              m.id === drMsgId
                ? { ...m, _deepResearch: { ...m._deepResearch, status: 'running' } }
                : m,
            ),
          );

          // Polling hasta done/error/cancel
          const finalResult = await pollDeepResearch(
            jobResult.job_id,
            (steps, status) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === drMsgId
                    ? { ...m, _deepResearch: { ...m._deepResearch, steps, status } }
                    : m,
                ),
              );
            },
            controller.signal,
          );

          if (controller.signal.aborted) return;

          if (finalResult) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === drMsgId
                  ? {
                    ...m,
                    _deepResearch: {
                      status: finalResult.status,
                      steps: finalResult.steps,
                      report: finalResult.report,
                      citations: finalResult.citations,
                      query: trimmed,
                    },
                  }
                  : m,
              ),
            );
            // Persistir el informe en la memoria de conversación
            if (finalResult.report) {
              const reportContent = `[Investigación profunda] ${trimmed}\n\n${finalResult.report}`;
              try {
                await addTurn(operatorId, { role: 'assistant', content: reportContent });
              } catch (e) {
                console.warn('[DeepResearch] addTurn report failed:', e?.message);
              }
            }
          } else {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === drMsgId
                  ? { ...m, _deepResearch: { ...m._deepResearch, status: 'error' } }
                  : m,
              ),
            );
          }
        } catch (e) {
          if (!controller.signal.aborted) {
            console.warn('[DeepResearch] job failed:', e?.message);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === drMsgId
                  ? { ...m, _deepResearch: { ...m._deepResearch, status: 'error' } }
                  : m,
              ),
            );
          }
        } finally {
          deepResearchControllersRef.current.delete(drMsgId);
        }
      })();
      return;
    }

    // CHIPS DE MODO — STUB (A3): precio no tiene backend todavía. NO
    // routeamos a un tool fantasma ni gastamos una inferencia del LLM:
    // pintamos la pregunta del usuario + una respuesta honesta "aún no
    // disponible" y salimos. Esto evita el misrouting del NLU (que mandaba
    // "papa" al tool de precio inexistente) y es transparente con el campesino.
    if (forcedIntent && isStubIntent(forcedIntent)) {
      const stubPlan = planForcedIntent(forcedIntent, trimmed);
      if (stubPlan && stubPlan.stub && stubPlan.stubMessage) {
        const userMessage = { role: 'user', content: trimmed, timestamp: Date.now() };
        const assistantMessage = {
          role: 'assistant',
          content: stubPlan.stubMessage,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, userMessage, assistantMessage]);
        try {
          await addTurn(operatorId, { role: 'user', content: trimmed });
          await addTurn(operatorId, { role: 'assistant', content: stubPlan.stubMessage });
        } catch (e) {
          console.warn('[Agent] stub addTurn failed (continuo):', e?.message);
        }
        setActiveIntent(null);
        return;
      }
    }

    // El queue ya serializa. NO replicamos el guard `state !== STATE_IDLE`
    // del flow previo — eso hacía que la 2da pregunta se perdiera sin
    // feedback. El parámetro `fromVoice` queda como hint semántico para
    // futuras políticas (e.g. voice → priority? hoy no se usa).
    void fromVoice;
    // suppressUserBubble (bug foto 2026-05-31): el caller de la outbox ya pintó
    // la burbuja de usuario REAL (con imagen / caption). Solo aplica a ESTE
    // primer texto — los items pending que se promuevan después SÍ pintan su
    // propia burbuja (son preguntas distintas del usuario).
    let suppressFirstBubble = suppressUserBubble;
    // visionContext (P0 visión-sin-foto 2026-05-31): solo el PRIMER texto del
    // caller lleva el contexto de visión real; los pending promovidos son
    // preguntas de texto nuevas → sin foto → el guard corrige afirmaciones
    // visuales fabricadas.
    let firstVisionContext = visionContext;
    // CHIPS DE MODO (A3): la intención forzada del chip aplica SOLO al primer
    // texto de este submit. Los pending promovidos son preguntas nuevas — sin
    // chip activo → rutean por el NLU normal.
    let firstForcedIntent = forcedIntent;

    const route = selectChatRoute(trimmed);
    const result = useAgentQueueStore.getState().enqueue(trimmed, route);

    if (result.status === 'rejected') {
      if (result.reason === 'queue_full') {
        setQueueRejectedToast(result.message);
        agentSounds.cancel();
      }
      return;
    }

    if (result.status === 'queued') {
      // El operador ya escribió la pregunta — mostrarla en el chat como
      // burbuja "pending" para que sienta que el sistema la escuchó. El
      // procesamiento real arrancará cuando termine la actual via
      // promoción en el finally del pipeline.
      // suppressUserBubble: si el caller (outbox foto/adjunto) ya pintó la
      // burbuja con su imagen, no la duplicamos aquí.
      if (!suppressFirstBubble) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'user',
            content: trimmed,
            timestamp: Date.now(),
            _queued: true,
          },
        ]);
      }
      return;
    }

    // status === 'started' → arrancar pipeline para este texto y luego
    // drenar el pending (si hay) en serie.
    let currentText = trimmed;
    let safety = 0;
    while (currentText && safety < QUEUE_DRAIN_MAX) {
      safety += 1;
      let pipelineFailed = false;
      try {
        await runAgentPipeline(currentText, {
          suppressUserBubble: suppressFirstBubble,
          visionContext: firstVisionContext,
          forcedIntent: firstForcedIntent,
        });
        // Solo el primer texto del caller usa la supresión / el contexto de
        // visión / la intención forzada del chip; los promovidos (pending) son
        // preguntas nuevas: pintan su propia burbuja, NO arrastran la foto ni
        // el modo del turno anterior.
        suppressFirstBubble = false;
        firstVisionContext = null;
        firstForcedIntent = null;
      } catch (pipelineErr) {
        // runAgentPipeline ya captura todo internamente; este catch es
        // defensivo (e.g. error fuera del try interno). Marcamos failed
        // explícito para no contaminar EMA con latencias de muestras
        // que no representan inferencia exitosa.
        pipelineFailed = true;
        console.warn('[Agent] pipeline outer catch (defensive):', pipelineErr?.message);
      }
      const promoted = useAgentQueueStore.getState().completeProcessing({
        failed: pipelineFailed,
      });
      if (!promoted) {
        currentText = null;
        break;
      }
      // Corregir el route del promoted con su query real (al promover
      // lo pusimos como 'chat' por default).
      const promotedRoute = selectChatRoute(promoted.prompt);
      useAgentQueueStore.getState().updateProcessingRoute(promoted.id, promotedRoute);
      currentText = promoted.prompt;
    }
  };

  const handleVoiceRecord = async () => {
    if (state === STATE_RECORDING) {
      // stopRecord retorna { blob, durationMs, mimeType } — NO el Blob directo.
      // Si pasas el wrapper a transcribe(), `blob.type.includes(...)` falla con
      // "Cannot read properties of undefined (reading 'includes')". Mismo bug
      // patrón que queue/021 ya fixeado en VoiceCapture, pero AgentScreen
      // quedó sin el destructure cuando se migró.
      const result = await stopRecord();
      if (!result || !result.blob) {
        setState(STATE_IDLE);
        setError('No se capturó audio. Intenta de nuevo.');
        return;
      }
      const { blob } = result;
      setState(STATE_THINKING);

      try {
        const text = await transcribe(blob);
        if (text) {
          // Auto-activar TTS cuando el input fue voz: si hablas, esperas
          // respuesta hablada. Si el operador silenció TTS manualmente y
          // habla, respetamos su preferencia (sólo activamos si estaba
          // ya en true por default, o si nunca lo tocó).
          if (!ttsEnabled) setTtsEnabled(true);
          // bypass del guard porque state !== IDLE (está THINKING). Sin
          // este flag, handleSubmit retorna early y la UI queda colgada.
          await handleSubmit(text, { fromVoice: true });
        } else {
          setState(STATE_IDLE);
          setError('No entendí el audio. Prueba de nuevo.');
        }
        } catch (err) {
          setState(STATE_IDLE);
          setError(`Error al transcribir audio: ${err.message || 'Habla más claro'}`);
      }
    } else {
      resetRecord();
      startRecord();
      setState(STATE_RECORDING);
      setError('');
      agentSounds.listen();
    }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    // CHIPS DE MODO (A3): si hay un modo activo, el submit lleva la intención
    // forzada → runAgentPipeline salta el NLU y rutea directo al tool.
    handleSubmit(inputText, { forcedIntent: activeIntent });
    setInputText('');
    // El modo es de un solo uso por pregunta: tras enviar volvemos al routing
    // NLU normal para el siguiente turno (igual que Gemini desactiva el chip).
    setActiveIntent(null);
    // El banner de contexto de alerta es de un solo uso — al primer submit
    // el operador ya está conversando con el agente y el banner queda
    // redundante. Se reabre solo si vuelve a entrar desde la notificación.
    setAlertContextBanner(null);
  };

  const handleSuggestion = (text) => {
    handleSubmit(text);
  };

  // CHIPS DE MODO (A4): toggle del chip. Tocar un chip activa su modo (el
  // próximo submit fuerza esa intención y salta el NLU); tocar el mismo chip
  // de nuevo lo desactiva (vuelve al routing NLU normal). El chip 'foto' no
  // se maneja acá — el flujo de foto vive en el compositor multimodal.
  const handleChipSelect = (intent) => {
    if (intent === 'foto') return; // reservado al flujo de adjuntos
    setActiveIntent((prev) => (prev === intent ? null : intent));
  };

  // ── Consumo de la OUTBOX DURABLE del compositor del home ───────────────────
  // El usuario disparó una consulta multimodal desde AgentHero; el item ya
  // está persistido en IndexedDB. Aquí la procesamos como "ya enviada":
  // aparece la burbuja de usuario + el agente arranca a procesar. NO esperamos
  // a que el operador toque "enviar" otra vez.
  //
  // Garantías de integridad (todas demostradas en agentOutboxService.test):
  //  - claimNext() es atómico → ningún item se procesa dos veces aunque el
  //    efecto corra dos veces (React StrictMode) o haya dos montajes.
  //  - recoverStaleProcessing() rescata items que quedaron 'processing' porque
  //    la app se cerró a mitad → vuelven a 'queued' y se reintentan (el LLM no
  //    confirmó respuesta, reintentar es correcto). Cero pérdida.
  const outboxDrainingRef = useRef(false);
  // Object URLs de las fotos del compositor que pintamos en las burbujas
  // (bug 2026-05-31). Los acumulamos para revocarlos al desmontar y no fugar
  // memoria. No los revocamos en cada render: la burbuja vive mientras el chat
  // esté montado.
  const photoObjectUrlsRef = useRef([]);
  useEffect(() => {
    const urls = photoObjectUrlsRef.current;
    return () => {
      for (const url of urls) {
        try { URL.revokeObjectURL(url); } catch { /* noop */ }
      }
    };
  }, []);

  // Deep Research (A6/A7): cancelar todos los jobs en vuelo al desmontar.
  useEffect(() => {
    const controllers = deepResearchControllersRef.current;
    return () => {
      for (const ctrl of controllers.values()) {
        try { ctrl.abort(); } catch { /* noop */ }
      }
      controllers.clear();
    };
  }, []);

  /**
   * Procesa UN item ya reclamado (status='processing') según su modalidad y
   * lo cierra (answered/error). Reusa el pipeline existente:
   *   - text       → handleSubmit(texto)
   *   - voice      → transcribe(blob) → handleSubmit(transcripción)
   *   - photo      → analyzeFoliage(blob) → handleSubmit(prompt con hallazgo)
   *   - attachment → handleSubmit(caption + nota del adjunto)
   * Devuelve true si se despachó algo al pipeline (para encadenar el drenado).
   */
  const processOutboxItem = useCallback(async (item) => {
    const caption = (item.text || '').trim();
    try {
      if (item.kind === 'text') {
        if (!caption) { await outboxMarkError(item.id, 'item de texto vacío'); return false; }
        await handleSubmit(caption);
        await outboxMarkAnswered(item.id);
        return true;
      }

      if (item.kind === 'voice') {
        // Mostrar de inmediato un placeholder "ya enviado" (audio) mientras se
        // transcribe — el usuario ve que su voz llegó, no una pantalla muerta.
        setMessages((prev) => [
          ...prev,
          { role: 'user', content: '🎤 Audio enviado…', timestamp: Date.now(), _outboxPending: true, _outboxId: item.id },
        ]);
        if (!ttsEnabled) setTtsEnabled(true);
        const text = item.blob ? await transcribe(item.blob) : '';
        // Sustituir el placeholder por la transcripción real (sin duplicar).
        setMessages((prev) => prev.filter((m) => m._outboxId !== item.id));
        if (text && text.trim()) {
          await handleSubmit(text.trim());
          await outboxMarkAnswered(item.id, { answeredText: text.trim() });
          return true;
        }
        setError('No entendí el audio. Prueba de nuevo desde el agente.');
        await outboxMarkError(item.id, 'transcripción vacía');
        return false;
      }

      if (item.kind === 'photo') {
        // Bug 2026-05-31: la foto NO llegaba al chat (solo el texto). Causa
        // raíz doble: (1) la burbuja se pintaba SIN la imagen — el blob se
        // pasaba a analyzeFoliage y se descartaba, y ChatBubble no sabía pintar
        // imágenes; (2) handleSubmit→runAgentPipeline pintaba OTRA burbuja con
        // el prompt sintético → duplicado y la imagen huérfana.
        //
        // Fix: processPhotoItem (pure, testeado) corre la visión + arma la
        // burbuja con `imageUrl`. La pintamos ANTES de mandar el prompt y
        // pasamos suppressUserBubble:true para no duplicarla.
        const createUrl = (blob) => {
          if (typeof URL === 'undefined' || !URL.createObjectURL) return null;
          const url = URL.createObjectURL(blob);
          photoObjectUrlsRef.current.push(url);
          return url;
        };
        // 1) Pintar la burbuja con la imagen DE INMEDIATO (antes de la visión)
        //    para que el usuario vea su foto sin esperar el diagnóstico.
        const { message } = buildPhotoUserMessage(item, createUrl);
        setMessages((prev) => [...prev, message]);
        // 2) Correr la visión y armar el prompt (degrada a "por descripción"
        //    si analyzeFoliage falla). Reusa processPhotoItem para la parte
        //    pura del prompt (sin re-pintar burbuja: createUrl ya consumido).
        const { prompt, finding } = await processPhotoItem(item, {
          analyze: analyzeFoliage,
          createUrl: null,
        });
        // 3) Despachar al pipeline con la burbuja ya pintada (no duplicar).
        //    visionContext marca que ESTE turno SÍ trajo una foto real: el guard
        //    de visión NO corrige un diagnóstico visual legítimo. La confianza
        //    (si analyzeFoliage la expone) permite suavizar hallazgos cuando la
        //    lectura no fue concluyente.
        await handleSubmit(prompt, {
          suppressUserBubble: true,
          visionContext: {
            hadVision: true,
            visionConfidence:
              finding && typeof finding.confidence === 'number' ? finding.confidence : null,
          },
        });
        await outboxMarkAnswered(item.id);
        return true;
      }

      // attachment: SIEMPRE pintamos la burbuja del usuario con su adjunto.
      // Si NO es imagen analizable, el guard de abajo responde honesto sin
      // correr el pipeline (no se fabrica diagnostico).
      setMessages((prev) => [
        ...prev,
        {
          role: 'user',
          content: caption ? `${caption}\n\n(📎 adjunto: ${item.fileName || 'archivo'})` : `📎 Adjunté un archivo: ${item.fileName || 'archivo'}`,
          timestamp: Date.now(),
          _outboxAttachment: true,
        },
      ]);
      // Guard adjunto (bug 2026-05-31, HOJA DE VIDA PDF): si el adjunto NO es
      // una imagen analizable (PDF, documento, audio...), NO corremos el
      // pipeline agronomico -el LLM, sin poder leer el archivo, FABRICABA
      // consejos de finca (alucino 'tomate fresa arandano' + un nombre
      // inventado)-. Respondemos HONESTO y corto, sin tocar el pipeline. Las
      // imagenes de verdad si bajan al flujo de vision (el guard
      // imagen-sin-planta va aparte: branch feat/guard-vision-sin-foto).
      if (!isAnalyzableImageAttachment(item)) {
        const rejection = buildAttachmentRejection(item);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: rejection, timestamp: Date.now() },
        ]);
        if (ttsEnabled) { try { speak(rejection, { rate: 0.9, pitch: 1.0 }); } catch (_) { /* noop */ } }
        await outboxMarkAnswered(item.id, { answeredText: rejection });
        return true;
      }

      const attachPrompt = caption
        ? caption
        : `Adjunté un archivo (${item.fileName || 'archivo'}). Por ahora no puedo leer archivos directamente; cuéntame qué necesitas y te ayudo.`;
      // Burbuja del adjunto ya pintada arriba → suppressUserBubble:true para no
      // duplicarla (mismo bug que la foto, 2026-05-31).
      await handleSubmit(attachPrompt, { suppressUserBubble: true });
      await outboxMarkAnswered(item.id);
      return true;
    } catch (e) {
      console.warn('[Agent] processOutboxItem falló:', e?.message);
      await outboxMarkError(item.id, e?.message || 'fallo procesando item');
      return false;
    }
  }, [ttsEnabled, setTtsEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const drainOutbox = useCallback(async () => {
    if (outboxDrainingRef.current) return;
    outboxDrainingRef.current = true;
    try {
      // Rescatar primero cualquier item huérfano en 'processing' (app cerrada
      // a mitad). Vuelven a 'queued' para reintento — no se pierden.
      await outboxRecoverStale();
      let item = await outboxClaimNext();
      let guard = 0;
      while (item && guard < 25) {
        guard += 1;
        await processOutboxItem(item);
        item = await outboxClaimNext();
      }
    } finally {
      outboxDrainingRef.current = false;
    }
  }, [processOutboxItem]);

  // Drenar la outbox al montar el AgentScreen. Corre una sola vez por montaje
  // efectivo; claimNext garantiza que StrictMode (doble efecto) no duplique.
  useEffect(() => {
    drainOutbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // CHIPS DE MODO (A4): placeholder guía según el modo activo. Sin modo →
  // placeholder genérico. Español colombiano (tú/usted), nunca voseo.
  const activePlaceholder = activeIntent
    ? (CHIP_DEFS.find((c) => c.intent === activeIntent)?.placeholder || 'Escribe tu pregunta...')
    : 'Escribe tu pregunta...';

  return (
    <div className={`h-[100dvh] flex flex-col bg-slate-950 overflow-hidden ${entranceClassRef.current}`}>
      {/* B1: animación de entrada (fade+rise) para que se perciba el cruce al
          agente. Respeta prefers-reduced-motion vía @media en el CSS. */}
      <style>{AGENT_ENTRANCE_CSS}</style>
      {/* Header con avatar colibrí Chagra IA (operator bug #920 no aplicó el avatar al header) */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 rounded-lg active:bg-slate-800"
          aria-label="Volver"
        >
          <ArrowLeft size={20} className="text-amber-400" />
        </button>
        <ChagraAgentAvatar
          state={state === STATE_RECORDING ? 'listening' : state === STATE_THINKING ? 'thinking' : 'idle'}
          size={40}
          onDoubleClick={async () => {
            // Task #122: doble-click avatar header silencia/reactiva audio.
            // Espejo del comportamiento del AgentFab global, pero acá ya
            // estamos en AgentScreen así que solo tocamos TTS.
            if (isSpeaking() || ttsEnabled) {
              stop();
              setTtsEnabled(false);
              agentSounds.cancel();
              return;
            }
            // Reactivar + replay último mensaje
            setTtsEnabled(true);
            const ok = await replayLast({ useKokoro: kokoroReady });
            if (ok) agentSounds.chime();
          }}
          ariaLabel="Avatar Chagra IA, doble click para silenciar o reactivar la voz"
        />
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-white leading-tight">Chagra IA</h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            {state === STATE_THINKING && 'pensando…'}
            {state === STATE_RECORDING && 'escuchando…'}
            {state === STATE_IDLE && 'agente agroecológico'}
          </p>
        </div>
        {/* Bug N3 fix (PR fix/n3-cross-conv-contamination 2026-05-23):
            botón explícito "Nueva conversación". Llama clearMemory(operatorId)
            + reset state + marca sesión fresca. Cubre el caso N3 exacto donde
            el operador hace Volver + reabre rápido (<30min) con tópico distinto
            y el gap temporal automático NO se dispararía. Sólo habilitado en
            STATE_IDLE para no interrumpir streaming en curso. */}
        <button
          type="button"
          onClick={handleNewConversation}
          disabled={state !== STATE_IDLE || messages.length === 0}
          className={`p-2 rounded-full transition-colors ${
            state !== STATE_IDLE || messages.length === 0
              ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 active:scale-95'
          }`}
          title="Nueva conversación (borra historial)"
          aria-label="Iniciar nueva conversación"
          data-testid="new-conversation-btn"
        >
          <RotateCcw size={16} />
        </button>
        <button
          type="button"
          disabled={!ttsSupported}
          onClick={() => {
            if (ttsEnabled) {
              stop();
            }
            setTtsEnabled(!ttsEnabled);
          }}
          className={`p-2 rounded-full transition-colors ${
            !ttsSupported
              ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
              : ttsEnabled
                ? 'bg-violet-900/40 text-violet-400'
                : 'bg-slate-800 text-slate-500'
          }`}
          title={!ttsSupported ? 'Tu navegador no soporta sintesis de voz' : ttsEnabled ? 'Silenciar voz' : 'Activar voz'}
        >
          {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] ${
          isOnline ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'
        }`}>
          {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </div>

      {/* Bug N3 fix: badge "nueva sesión" cuando reseteamos por gap temporal
          o por botón explícito. Sin esto el operador no entendería por qué su
          history desapareció. Ephemeral — se borra al primer submit. */}
      {showFreshSessionBadge && (
        <div className="px-4 py-2 mx-4 mt-2 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center gap-2">
          <Sparkles size={14} className="text-violet-400 shrink-0" />
          <p className="text-xs text-slate-300" data-testid="fresh-session-badge">
            Empezamos fresco. Tu historial sigue guardado en tu finca; este
            chat arranca limpio para que el agente se concentre en lo nuevo.
          </p>
        </div>
      )}

      {/* NN4 fix 2026-05-23: banner pequeño cuando el modelo Ollama todavía
          se está calentando (warm-up disparado en login pero aún no completó).
          Aparece solo en status 'unknown' o 'warming' — en 'warm' o 'failed'
          queda oculto. Se mostraría típicamente si el operador navega al
          agente MUY rápido tras login antes que termine el warm-up (~25-40s
          en GPU M6000). Spinner CSS con animación spin de Tailwind. */}
      {(ollamaWarmStatus === 'warming' || ollamaWarmStatus === 'unknown') && (
        <div
          className="px-4 py-2 mx-4 mt-2 rounded-lg bg-amber-900/30 border border-amber-800/50 flex items-center gap-2"
          data-testid="ollama-warming-banner"
          role="status"
          aria-live="polite"
        >
          <span
            className="w-3 h-3 rounded-full border-2 border-amber-400 border-t-transparent animate-spin shrink-0"
            aria-hidden="true"
          />
          <p className="text-xs text-amber-300">
            Preparando agente IA (~20s)…
          </p>
        </div>
      )}

      {/* Chat */}
      <ChatHistory
        messages={messages}
        streamingContent={streamingContent}
        isStreaming={state === STATE_THINKING}
        onConsentNeeded={handleFeedbackConsentNeeded}
        onRetryOrphan={handleRetryOrphan}
        onCancelDeepResearch={handleCancelDeepResearch}
        proactiveGreeting={proactiveGreeting}
        onGreetingPrompt={(prompt) => prompt && setInputText(prompt)}
        onBack={onBack}
      />

      {/* Error */}
      {error && (
        <div className="px-4 py-2 mx-4 mb-2 rounded-lg bg-red-900/30 border border-red-800/50">
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Suggestions */}
      {state === STATE_IDLE && messages.length < 3 && (
        <SuggestedActions onSelect={handleSuggestion} />
      )}

      {/* UX-5 (#286): chips de preguntas rápidas. Solo en pantalla nueva
          (chat vacío) e idle — al primer turn desaparecen para no llenar la
          UI con sugerencias mientras hay conversación visible. */}
      {state === STATE_IDLE && messages.length === 0 && (
        <QuickChipsBar onSelect={handleSuggestion} />
      )}

      {/* UX-4 (#285): botón "Ver ejemplo" para operadores nuevos sin
          historial. Monta una demo simulada (mensaje user + respuesta
          predefinida con delay 1s) sin llamar al LLM — cero costo, cero
          alucinación. Solo en pantalla nueva e idle, alineado con la
          ventana donde QuickChipsBar también vive. */}
      {state === STATE_IDLE && messages.length === 0 && !showAgentDemo && (
        <div className="px-4 pb-2 pt-1 bg-slate-900/40">
          <button
            type="button"
            onClick={() => setShowAgentDemo(true)}
            data-testid="agent-demo-trigger"
            className="w-full px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/70 active:scale-[0.99] border border-slate-700/50 text-xs text-slate-300 transition-all"
          >
            Ver ejemplo (sin foto)
          </button>
        </div>
      )}
      {state === STATE_IDLE && messages.length === 0 && showAgentDemo && (
        <AgentDemoExample onClose={() => setShowAgentDemo(false)} />
      )}

      {/* 2026-05-28 UX: banner de contexto de alerta climática. Aparece
          cuando el operador llega desde una notificación con prompt
          pre-cargado + cita de la entidad emisora (IDEAM/NOAA/CIIFEN/
          Open-Meteo). Banner discreto arriba del input — el operador ve la
          fuente del aviso antes de mandar la pregunta. Dismissable. */}
      {alertContextBanner && (
        <div
          className="mx-4 mb-2 p-3 rounded-lg bg-sky-950/40 border border-sky-800/50 flex items-start gap-3"
          data-testid="agent-alert-context-banner"
          role="status"
        >
          <div className="flex-1 min-w-0">
            {alertContextBanner.alertContext?.title && (
              <p className="text-xs font-bold text-sky-200 leading-tight">
                {alertContextBanner.alertContext.title}
              </p>
            )}
            {alertContextBanner.alertContext?.body && (
              <p className="text-[11px] text-sky-300/85 mt-0.5 leading-snug">
                {alertContextBanner.alertContext.body}
              </p>
            )}
            {(alertContextBanner.sourceLabel || alertContextBanner.sourceUrl) && (
              <p className="text-[10px] text-slate-400 mt-1.5 leading-tight">
                Fuente:{' '}
                {alertContextBanner.sourceUrl ? (
                  <a
                    href={alertContextBanner.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-300 hover:text-sky-200 underline"
                    data-testid="agent-alert-source-link"
                  >
                    {alertContextBanner.sourceLabel || 'Ver informe oficial'}
                  </a>
                ) : (
                  <span className="text-slate-300">{alertContextBanner.sourceLabel}</span>
                )}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setAlertContextBanner(null)}
            className="shrink-0 p-1 rounded-md hover:bg-white/10 text-slate-400"
            aria-label="Cerrar contexto de alerta"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* CHIPS DE MODO (A4/B4): "caja de herramientas" estilo Gemini, fila
          scrollable JUSTO sobre el input. Persistente durante toda la
          conversación. Tocar un chip fuerza la intención del próximo submit y
          rutea directo al tool (saltando el NLU, A3). El chip 📷 foto solo
          aparece si hay imagen adjunta. */}
      <ChipsToolbar
        onSelectIntent={handleChipSelect}
        activeIntent={activeIntent}
        hasAttachment={false}
        disabled={state === STATE_RECORDING}
        isPro={getCurrentTier() === 'pro'}
      />

      {/* Input */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/80 shrink-0">
        <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleVoiceRecord}
            className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              state === STATE_RECORDING
                ? 'bg-red-600 animate-pulse'
                : 'bg-violet-700 hover:bg-violet-600'
            }`}
          >
            {state === STATE_RECORDING ? (
              <MicOff size={20} className="text-white" />
            ) : (
              <Mic size={20} className="text-white" />
            )}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              queuePending.length >= 1
                ? 'Espera — ya hay una en cola'
                : queueProcessing
                  ? 'Adelanta otra pregunta (cola: 1 más)'
                  : activePlaceholder
            }
            disabled={state === STATE_RECORDING || queuePending.length >= 1}
            data-testid="agent-input"
            className="flex-1 px-4 py-3 rounded-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={
              !inputText.trim() ||
              state === STATE_RECORDING ||
              queuePending.length >= 1
            }
            data-testid="agent-submit"
            className="shrink-0 w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <Send size={18} className="text-white" />
          </button>
        </form>

        {state === STATE_RECORDING && (
          <p className="text-center text-xs text-red-400 mt-2 animate-pulse">
            Grabando... {Math.floor(durationMs / 1000)}s
          </p>
        )}

        {state === STATE_THINKING && (
          <div className="flex flex-col items-center gap-2 mt-2">
            <p
              className={`text-center text-xs ${showSlowWarning ? 'text-amber-400' : 'text-violet-400'}`}
              data-testid="eta-label"
            >
              {(() => {
                if (showSlowWarning) {
                  return 'Chagra IA sigue pensando — toca Cancelar si quieres reintentar';
                }
                // ETA visible. Si remainingMs es null o el item recién arrancó
                // sin haber medido aún, caemos a "Procesando tu pregunta…".
                if (remainingMs !== null && queueProcessing) {
                  const expected = queueProcessing.expectedEtaMs;
                  const elapsed = expected - remainingMs;
                  const overshoot = elapsed > expected * 1.5;
                  const stretching = elapsed > expected;
                  // Verde si < ema, ámbar si entre 1x-1.5x ema, rojo si > 1.5x.
                  // El color lo aplicamos a un span aparte para mantener el
                  // texto general en violeta.
                  const secsLeft = Math.max(0, Math.ceil(remainingMs / 1000));
                  if (overshoot) {
                    return `Tardando más de lo normal (${Math.floor(elapsed / 1000)}s ya)`;
                  }
                  if (stretching) {
                    return `Casi listo… (${Math.floor(elapsed / 1000)}s)`;
                  }
                  return `Procesando tu pregunta… ~${secsLeft}s`;
                }
                return 'Chagra IA está pensando…';
              })()}
            </p>
            {queuePending.length >= 1 && (
              <p
                className="text-center text-[10px] text-violet-300"
                data-testid="queue-pending-badge"
              >
                Tienes 1 pregunta en cola — te respondo después de la actual.
              </p>
            )}
            {rotatingTip && !hintDismissed && (
              <div
                className="mt-1 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-start gap-2 max-w-sm transition-opacity duration-300"
                data-testid="rotating-tip"
                key={rotatingTip.id}
              >
                <span className="text-base shrink-0 leading-none mt-0.5" aria-hidden="true">
                  {rotatingTip.icon}
                </span>
                <p className="text-[11px] text-slate-300 leading-snug flex-1">
                  <span className="text-violet-400 font-medium block mb-0.5">
                    💡 Tip mientras espero
                  </span>
                  {rotatingTip.text}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    dismissTip();
                    setHintDismissed(true);
                  }}
                  aria-label="Cerrar sugerencia"
                  className="text-[10px] text-slate-500 hover:text-slate-300 shrink-0 leading-none px-1"
                  data-testid="dismiss-tip"
                >
                  ×
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={handleCancelLLM}
              className="text-[10px] px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition-all"
            >
              Cancelar
            </button>
          </div>
        )}

        {queueRejectedToast && (
          <div
            className="mt-2 px-3 py-2 rounded-lg bg-amber-900/40 border border-amber-700/60 flex items-center gap-2"
            data-testid="queue-rejected-toast"
            role="status"
            aria-live="polite"
          >
            <p className="text-xs text-amber-300 flex-1">{queueRejectedToast}</p>
            <button
              type="button"
              onClick={() => setQueueRejectedToast('')}
              aria-label="Cerrar aviso"
              className="text-amber-400 hover:text-amber-200 text-sm leading-none"
            >
              ×
            </button>
          </div>
        )}

        {!llmHealthy && state === STATE_IDLE && (
          <p className="text-center text-xs text-amber-400 mt-2 px-3">
            IA offline o lenta — las respuestas pueden tardar más de lo normal.
          </p>
        )}
      </div>

      <div ref={chatEndRef} />

      {/* Action Confirmation Modal — alimentado por actionExecutor gate callback (057.4) */}
      <ActionConfirmModal
        isOpen={actionModal.isOpen}
        toolName={actionModal.toolName || ''}
        description={actionModal.description || ''}
        parameters={actionModal.parameters || {}}
        intent={actionModal.intent}
        llm_response={actionModal.llmResponse}
        onApprove={handleActionApprove}
        onReject={handleActionReject}
        onEdit={handleActionEdit}
      />

      {/* Task #194: Feedback Consent Modal — muestra la primera vez que el usuario intenta dar feedback */}
      <FeedbackConsentModal
        isOpen={feedbackConsentModal.isOpen}
        onAccept={handleFeedbackConsentAccept}
        onDecline={handleFeedbackConsentDecline}
      />
    </div>
  );
}