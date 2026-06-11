import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Mic, MicOff, Send, Sparkles, Wifi, WifiOff, Volume2, VolumeX, RotateCcw, X, Home, Camera, Square } from 'lucide-react';
import useVoiceRecorder from '../../hooks/useVoiceRecorder';
import { transcribe, queueForRetry } from '../../services/voiceService';
import VoiceStatusStrip from './VoiceStatusStrip';
import {
  claimNext as outboxClaimNext,
  markAnswered as outboxMarkAnswered,
  markError as outboxMarkError,
  recoverStaleProcessing as outboxRecoverStale,
} from '../../services/agentOutboxService';
import { analyzeFoliage } from '../../services/aiService';
import { captureAndCompress } from '../../services/photoService';
import { processPhotoItem, buildPhotoUserMessage } from '../../services/agentOutboxPhoto';
import { isAnalyzableImageAttachment, buildAttachmentRejection } from '../../services/agentOutboxAttachment';
import { AGENT_ENTRANCE_CSS, AGENT_COMPOSITOR_CSS, agentEntranceClass } from './agentEntrance';
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
import { planKnowledgeIntent, hasSoilDiagnosticIntent } from '../../services/knowledgeIntentRouter';
// Deep Research (A6/A7): cliente HTTP del endpoint async de investigación
// profunda del sidecar. Feature flag VITE_DEEP_RESEARCH_ENABLED (default false).
import { submitDeepResearch, pollDeepResearch, isDeepResearchEnabled } from '../../services/deepResearchClient';
// Tier free|pro (A1): resuelve el tier del usuario logueado contra la allowlist.
// isPro controla el gate de la UI (chip 🔬); x-chagra-tier se inyecta en el
// sidecarClient/deepResearchClient vía buildSidecarHeaders (defense-in-depth).
import { getCurrentTier } from '../../services/tierService';
import DeepResearchCard from '../DeepResearchCard';
import { normalizeUserInputForRegion, buildClimaContext, buildFincaContext, buildViabilityContext, buildFrostHeatContext, buildAssociationContext, buildInvasiveSafetyContext, buildCuratedFactsContext, applyVoseoFilter, resolveUserRegion, stripRoleLeak, buildPriceDeclineContext, buildSuggestedEntitiesContext, isLowConfidenceEntity, buildFallbackResponse, pisoTermicoFromAltitud } from '../../services/agentService';
import { buildBasePrompt, analyzeQuery, buildQueryAnalysisBlock, buildCorpusVariants, buildResolvedEntitiesBlock, formatToolEvidence } from '../../services/agentPromptBase';
import { assembleSystemContent } from '../../services/promptAssembler';
import { applyOutputGuards, classifyQueryIntent } from '../../services/outputGuards';
import { createStreamGuard } from '../../services/streamGuards';
import { getProfile } from '../../services/userProfileService';
import { captureExchange } from '../../services/conversationCaptureService';
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
import { getCachedClimaSnapshot, fetchClimaSnapshot, resolveClimaLocation } from '../../services/climaService';
import { FARM_CONFIG } from '../../config/defaults';
import { speak, speakSentences, stop, init as initTTS, isSupported, isKokoroAvailable, replayLast, isSpeaking, onSpeakingChange, isAudioPlaying, getLastSpoken } from '../../services/ttsService';
import { executeAction, setActionGateCallback } from '../../services/actionExecutor';
import { getToolsForLLM } from '../../services/llmTools';
import { useRotatingTip } from '../../services/tipsService';
import ChatHistory from './ChatHistory';
import SuggestedActions from './SuggestedActions';
import ActionConfirmModal from '../ActionConfirmModal';
import FeedbackConsentModal from '../FeedbackConsentModal';
import ChagraAgentAvatar from '../ChagraAgentAvatar';
import ChagraAgentAvatarColibriPhoto from '../ChagraAgentAvatarColibriPhoto';
import QuickChipsBar from '../QuickChipsBar';
import ChipsToolbar from '../ChipsToolbar';
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
  // Compositor inline (foto adjuntada directamente en AgentScreen, sin outbox).
  // Independiente de la outbox — el operador ya está en la pantalla del agente.
  const cameraInputAgentRef = useRef(null);
  const [agentAttachment, setAgentAttachment] = useState(null); // {blob,mime,previewUrl,fileName}
  const [agentPickError, setAgentPickError] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [error, setError] = useState('');
  const [actionModal, setActionModal] = useState({ isOpen: false, intent: null, llmResponse: '' });
  // Task #194: Modal de consentimiento para feedback
  const [feedbackConsentModal, setFeedbackConsentModal] = useState({ isOpen: false, pendingAction: null });
  const ttsSupported = isSupported();
  const [kokoroReady, setKokoroReady] = useState(false);
  // TIER 2 #5 (voz punta-a-punta): estado "hablando" observable. ttsService
  // notifica true/false cuando arranca/termina audio (Kokoro single, cadena
  // frase-por-frase, Web Speech). Alimenta el VoiceStatusStrip y el sub-
  // título del header — el campesino VE cuándo Chagra habla, no lo adivina.
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  // Aviso amable de degradación de voz (STT/TTS caído): NUNCA error mudo y
  // NUNCA banner rojo de error — el flujo cae a texto sin romper.
  const [voiceNotice, setVoiceNotice] = useState('');
  useEffect(() => onSpeakingChange(setIsVoicePlaying), []);
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
  // Hoja de capacidades (paridad AgentHero Ⓐ).
  const [sheetOpen, setSheetOpen] = useState(false);
  // Fase del compositor para la animación shimmer/lift al enviar.
  const [composerPhase, setComposerPhase] = useState('idle'); // 'idle' | 'sending'
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
  const llmStatsRef = useRef(null);
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

  const getSystemPrompt = useCallback(({ query = '', contextMemory = '', isEnum = false } = {}) => {
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
    const MAX_SPECIES_CONTEXT = 50;
    const plantNamesSlice = Object.entries(groupedCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_SPECIES_CONTEXT);
    const totalSpecies = Object.keys(groupedCounts).length;
    const plantNames = plantNamesSlice
      .map(([name, n]) => (n > 1 ? `${name} ×${n}` : name))
      .join(', ');
    const plantContext = totalSpecies > MAX_SPECIES_CONTEXT
      ? `${plantNames} y ${totalSpecies - MAX_SPECIES_CONTEXT} especies más`
      : (plantNames || 'ninguna');
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
    // El texto base (reglas + glosarios condicionales + CASO A/B/C) vive en
    // agentPromptBase.buildBasePrompt — extraído para que sea medible y
    // testeable fuera de React (re-arquitectura GR-10 2026-06-10). Recibe la
    // query / historial / isEnum para inyectar SOLO los glosarios y reglas que
    // la conversación menciona (el resto se omite → cabe el grounding).
    return buildBasePrompt({ plantContext, fincaContext, indoorContext, finca, query, contextMemory, isEnum });
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

  // formatToolEvidence y analyzeQuery viven en agentPromptBase (funciones
  // puras, testeables y medibles fuera de React).

  const callLLM = async (query, contextMemory, contextCorpus, toolEvidence, resolvedEntities, suggestedEntities = null, fermentoBlock = '', subgrafoBloque = '') => {
    const analysis = analyzeQuery(query);
    // El base recibe query/historial/isEnum para inyectar SOLO los glosarios
    // y reglas condicionales que la conversación toca (re-arquitectura GR-10).
    const systemPrompt = getSystemPrompt({ query, contextMemory, isEnum: analysis.isEnum });

    // ENTIDADES RESUELTAS (DR taxonómico Tier 1 B) + análisis NN2/NN3 +
    // corpus RAG delimitado — builders puros en agentPromptBase.
    const resolvedEntitiesBlock = buildResolvedEntitiesBlock(resolvedEntities);
    const queryAnalysisBlock = buildQueryAnalysisBlock(analysis);
    const corpusVariants = buildCorpusVariants(contextCorpus);

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
    // Ciclo(s) productivo(s) activo(s) (FarmProcess) → aterriza la respuesta en
    // lo sembrado AHORA (etapa fenológica, días, riesgo de plaga dominante).
    // Datos factuales del usuario; degrada limpio si no hay ciclos o falla.
    const activeCycles = isPriceQuery ? [] : await (async () => {
      try {
        const { listFarmProcesses } = await import('../../db/farmProcessCache');
        const { getPestRisksByStage } = await import('../../services/climateCycleService');
        const STAGE_LBL = { sowing: 'Siembra', emergence: 'Brotó', vegetative: 'Creciendo', flowering: 'Floración', fruiting: 'Frutos', harvest_window: 'Cosecha', closed: 'Terminado' };
        const cycles = (await listFarmProcesses({ status: 'active' })) || [];
        return cycles.slice(0, 5).map((c) => {
          const at = c.attributes || {};
          const base = String(at.current_stage || '').replace(/_confirmed$/, '');
          const days = at.created_at ? Math.max(0, Math.round((Date.now() - at.created_at) / 86400000)) : null;
          const risks = (() => { try { return getPestRisksByStage(at.current_stage, at.subject_slug) || []; } catch { return []; } })();
          const top = risks.find((r) => r.risk === 'crítico' || r.risk === 'alto');
          return { label: at.subject_label, stage: STAGE_LBL[base] || base, days, topRisk: top ? `${top.pest} (${top.risk})` : null };
        });
      } catch { return []; }
    })();
    const fincaContext = isPriceQuery
      ? ''
      : `\n\n${buildFincaContext({
          profile: fincaProfile,
          finca: fincaActivaCtx,
          climaSnapshot,
          groupedCultivos,
          resolvedEntities,
          activeAlerts,
          activeCycles,
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

    // MEMORIA EPISÓDICA de la finca (TIER 2 #6): lo que la finca YA VIVIÓ con
    // lo que el usuario pregunta este turno (siembras/etapas/manejos de plaga
    // del event store FarmProcess en IndexedDB) + máx. 2 señales de
    // anticipación (transición de etapa inminente por fenología desde la fecha
    // de siembra REAL, recurrencia estacional de manejo de plagas). CERO
    // invención: solo eventos registrados; sin historial relevante o con IDB
    // caído → '' (no-op silencioso). GATE de precio: igual que finca/viabilidad,
    // no aplica a consultas de mercado. Entra al promptAssembler como
    // 'memoria' (prioridad media, sacrificable — nunca desplaza guardas ni
    // evidencia).
    const memoriaBlock = isPriceQuery
      ? ''
      : await (async () => {
          try {
            const { buildEpisodicMemoryContext } = await import('../../services/episodicMemoryService');
            return await buildEpisodicMemoryContext({ query, resolvedEntities, fincaAltitud });
          } catch {
            return '';
          }
        })();
    const memoriaContext = memoriaBlock ? `\n\n${memoriaBlock}` : '';

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

    // GraphRAG: bloque "=== CADENA DE RELACIONES (grafo) ===" (multi-hop AGE)
    // para queries relacionales. Ya viene formateado del sidecar; '' = no-op.
    const relacionalContext = (typeof subgrafoBloque === 'string' && subgrafoBloque.trim())
      ? `\n\n${subgrafoBloque}`
      : '';

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

    // Re-arquitectura GR-10: ensamblado con PRESUPUESTO de tokens y prioridad
    // por relevancia (promptAssembler). El grounding (evidencia / entidades /
    // hechos curados / cadena) va al FINAL del system — donde la truncación de
    // ollama no lo alcanza y la recency lo hace dominar. Si el total supera el
    // presupuesto, se degradan SOLO corpus RAG (por chunks) y contexto
    // ambiental; base, guardas y grounding son intocables.
    const assembled = assembleSystemContent({
      base: systemPrompt,
      // Contexto AMBIENTAL sacrificable: si el prompt se pasa de presupuesto,
      // ENSO/alertas, asociaciones, riesgo térmico y el marco de finca ceden
      // ANTES que el grounding duro (variant a ''). La altitud de la finca la
      // cita igual el bloque de viabilidad, así que no se pierde la guarda.
      clima: { variants: [climaContext, ''] },
      finca: { variants: [fincaContext, ''] },
      asociacion: { variants: [asociacionContext, ''] },
      memoria: { variants: [memoriaContext, ''] },
      corpus: { variants: corpusVariants },
      frostHeat: { variants: [frostHeatContext, ''] },
      viabilidad: viabilidadContext,
      seguridad: seguridadContext,
      evidence: evidenceContext,
      resolvedEntities: resolvedEntitiesBlock,
      curatedFacts: curatedFactsContext,
      relacional: relacionalContext,
      queryAnalysis: queryAnalysisBlock,
      suggested: suggestedBlock,
      priceDecline: priceDeclineBlock,
      fermento: fermentoSafetyBlock,
    });

    const messages = [
      { role: 'system', content: assembled.content },
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

    // SEC-001 (DR-CHAGRA-AUDIT-IA-001): guard del canal de STREAMING. El guard
    // final (applyOutputGuards sobre el texto completo) NO cambia — esto es una
    // capa ADICIONAL sobre el display EN VIVO: el sniff local (mismos guards de
    // peligro de outputGuards, cero latencia, throttle incremental + latch)
    // retiene el parcial con un placeholder si un patrón peligroso dispara
    // (sintético+dosis, mezcla incompatible, tóxico en comida…). Las respuestas
    // seguras y las dosis orgánicas legítimas fluyen token a token sin cambio.
    const streamGuard = createStreamGuard({ userMessage: query });

    const markToken = (fullText) => {
      // Llegó un token: el stream está vivo → reinicia el idle-timer. El techo
      // absoluto sigue corriendo intacto.
      deadline.onToken();
      // SEC-001: lo que se pinta (y lo que el catch preserva ante una
      // interrupción) es SIEMPRE la versión segura del parcial — si el sniff
      // latcheó peligro, es el placeholder; el final guardado reemplaza limpio.
      // En streams seguros safeDisplay === fullText (passthrough idéntico).
      const safeDisplay = streamGuard.check(fullText);
      // Espejo del parcial en ref para que el catch lo preserve sin closure stale.
      streamingContentRef.current = safeDisplay;
      setStreamingContent(safeDisplay);
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

      // 057.4 — tools de function calling. Si hay herramientas registradas,
      // las inyectamos en el body para que el LLM pueda emitir tool_calls.
      const toolsList = getToolsForLLM();
      if (toolsList.length > 0) {
        body.tools = toolsList;
      }

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
        llmStatsRef.current = {
          first_token_ms: stats?.first_token_ms || null,
          sidecar_first_token_ms: stats?.sidecar_first_token_ms || null,
          eval_rate: stats?.eval_rate || null,
          response_len: fullText?.length || 0,
        };
        console.warn('[Agent] LLM call complete (sidecar stream)', {
          responseLen: fullText?.length || 0,
          first_token_ms: stats?.first_token_ms,
          sidecar_first_token_ms: stats?.sidecar_first_token_ms,
          eval_rate: stats?.eval_rate,
        });
        return fullText;
      }

      const callLLMOnce = async (msgs, extraBody) => {
        const mergedBody = { ...body, messages: msgs, ...extraBody };
        console.warn('[Agent] LLM call start', { url, queryLen: query.length, route: chatRoute, model: body.model, hasTools: !!mergedBody.tools });
        const res = await streamOpenAI(
          url,
          mergedBody,
          (_chunk, fullText) => markToken(fullText),
          { signal: controller.signal },
        );
        console.warn('[Agent] LLM call complete', { responseLen: res.fullText?.length || 0, toolCalls: res.toolCalls?.length || 0 });
        return res;
      };

      let result = await callLLMOnce(messages, {});

      // 057.4 — si el LLM respondió con tool_calls, ejecutamos el action loop.
      if (result.toolCalls && result.toolCalls.length > 0) {
        const toolResults = [];
        for (const tc of result.toolCalls) {
          const actionResult = await executeAction({
            tool_name: tc.function.name,
            parameters: tc.function.arguments,
            intent: query,
            llm_response: result.fullText,
            timestamp: new Date().toISOString(),
          }, operatorId);
          toolResults.push({ toolCallId: tc.id, result: actionResult });
        }

        const assistantMsg = {
          role: 'assistant',
          content: null,
          tool_calls: result.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.function.name, arguments: typeof tc.function.arguments === 'object' ? JSON.stringify(tc.function.arguments) : tc.function.arguments },
          })),
        };

        const toolMessages = toolResults.map((tr) => ({
          role: 'tool',
          tool_call_id: tr.toolCallId,
          content: JSON.stringify(tr.result),
        }));

        // Segunda llamada: pasar resultado del tool al LLM para respuesta NL
        deadline.onToken();
        streamingContentRef.current = '';
        setStreamingContent('');
        const secondResult = await callLLMOnce(
          [...messages, assistantMsg, ...toolMessages],
          { tools: undefined },
        );
        return secondResult.fullText || '';
      }

      return result.fullText;
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
    const pipelineStartedAt = performance.now();
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
      let nluRoute = forcedIntent ? `chip:${forcedIntent}` : null;
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
      // GraphRAG multi-hop (#1 intelligence-first): bloque "CADENA DE RELACIONES"
      // del grafo AGE para queries relacionales (plaga+cultivo). '' = no-op.
      let subgrafoBloque = '';
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

          // GraphRAG multi-hop: si hay plaga y/o cultivo resueltos, traemos del
          // grafo AGE la CADENA de relaciones (cultivo→plaga→controladores/
          // biopreparados + asocios) e inyectamos el bloque al grounding.
          // Tambien invocamos get_multihop_companions (AIA-008): cadenas de N
          // saltos de asociacion ecologica (companeras que controlan plagas).
          // Ambas tools son sub-segundo y no-throw; si no hay dato, no-op.
          const pestEnt = (resolvedEntities || []).find((e) => e.kind === 'pest' || e.kind === 'plaga');
          const cropEnt = (resolvedEntities || []).find((e) => ['cultivo', 'especie', 'species', 'planta'].includes(e.kind));
          const relArgs = {};
          if (pestEnt) relArgs.pest = pestEnt.canonical_id || pestEnt.mentioned;
          if (cropEnt) relArgs.cultivo = cropEnt.canonical_id || cropEnt.mentioned;

          if (relArgs.pest || relArgs.cultivo) {
            // Capa 1: subgrafo estructural (todas las relaciones del grafo)
            try {
              const sub = await callTool('get_subgrafo_relacional', relArgs);
              if (sub && sub.found && typeof sub.bloque === 'string' && sub.bloque.trim()) {
                subgrafoBloque = sub.bloque;
                console.debug('[sidecar] subgrafo-relacional', {
                  nodes: sub.nodes?.length, rels: sub.relaciones?.length,
                });
              }
            } catch (_) { /* graceful */ }

            // Capa 2 (AIA-008): multihop funcional (cadenas de control biologico
            // a N saltos — NO redundante con el subgrafo: el subgrafo da
            // adyacencia estructural, multihop da cadenas ecologicas funcionales)
            try {
              const mh = await callTool('get_multihop_companions', relArgs);
              if (mh && mh.found && typeof mh.bloque === 'string' && mh.bloque.trim()) {
                subgrafoBloque = [subgrafoBloque, mh.bloque].filter(Boolean).join('\n\n');
                console.debug('[sidecar] multihop-companions', {
                  hops: mh.hops, chains: mh.cadenas?.length,
                });
              }
            } catch (_) { /* graceful: sin multihop sigue funcionando */ }
          }

          // PASO 2-pre — routing determinístico de CONOCIMIENTO del grafo
          // (usos tradicionales / toxicidad / variedades / suelo). Igual que el
          // chip forzado, salta el planner NLU cuando la intención es inequívoca
          // y hay una especie ya resuelta: "¿la yuca brava es tóxica?",
          // "¿para qué sirve la ruda?", "¿qué variedades de café hay?",
          // "¿qué pH necesita la papa?". El resultado entra como toolEvidence →
          // bloque de grounding del system prompt (promptAssembler, intocable).
          // found:false TAMBIÉN es evidencia útil: trae la nota anti-invención
          // y el agente responde neutral en vez de fabricar. No corre bajo chip
          // forzado (el chip ya decidió el tool determinístico).
          if (!forcedIntent) {
            try {
              const kPlan = planKnowledgeIntent(textForLLM, resolvedEntities);
              if (kPlan && kPlan.tool) {
                const tK0 = performance.now();
                const kResult = await callTool(kPlan.tool, kPlan.args);
                const tK1 = performance.now();
                // available:false = grafo caído → NO inyectamos (dejamos que el
                // planner NLU / fallback decidan); null = error de red, ídem.
                if (kResult && kResult.available !== false) {
                  toolEvidence = { tool: kPlan.tool, args: kPlan.args, result: kResult };
                  nluRoute = `conocimiento:${kPlan.tool}`;
                  console.debug('[sidecar] conocimiento del grafo (NLU saltado)', {
                    tool: kPlan.tool,
                    source: kPlan.source,
                    found: kResult.found,
                    latencyTool: Math.round(tK1 - tK0),
                  });
                }
              }
            } catch (_) { /* graceful: sigue el flujo NLU normal */ }

            // Suelo-diagnostico: si el campesino describe su terreno, injectamos
            // diagnosticarSuelo() al grounding. Es cliente-side (sin sidecar),
            // usa los datos del DR-SUELOS-1. Las guardas anti-mito (vinagre/bicarbonato,
            // no sobre-encalar) afloran en la respuesta del agente.
            if (!toolEvidence && hasSoilDiagnosticIntent(textForLLM)) {
              try {
                const { diagnosticarSuelo, formatearGroundingSuelo } = await import('../../services/soilDiagnostic');
                const diag = diagnosticarSuelo(textForLLM);
                if (diag && !diag.sin_datos) {
                  const bloque = formatearGroundingSuelo(diag);
                  if (bloque) {
                    toolEvidence = {
                      tool: 'soil_diagnostic',
                      args: { query: textForLLM },
                      result: { found: true, bloque },
                    };
                    nluRoute = 'suelo:diagnostico';
                  }
                }
              } catch (_) { /* graceful: sin diagnosticar no rompe */ }
            }
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
            // Altura + piso térmico para los chips de diseño (restauración,
            // silvopastoreo, páramo). El chip salta el NLU, así que el contexto
            // de altura lo aporta el perfil/finca aquí. Silvopastoreo EXIGE
            // altura: sin ella el router devuelve un stub que pide la altura.
            const fincaAltitudChip = (() => {
              try {
                const p = getProfile();
                if (p && p.finca_altitud != null && p.finca_altitud !== '') return p.finca_altitud;
              } catch (_) { /* noop */ }
              return activeFincaClima?.altitud ?? null;
            })();
            const pisoTermicoChip = (() => {
              try {
                const p = getProfile();
                if (p && p.piso_termico) return p.piso_termico;
              } catch (_) { /* noop */ }
              return pisoTermicoFromAltitud(fincaAltitudChip);
            })();
            const forcedPlan = planForcedIntent(forcedIntent, textForLLM, {
              municipio: municipioClima,
              altitud: fincaAltitudChip,
              pisoTermico: pisoTermicoChip,
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
                nluRoute = `chip:${forcedIntent}:${forcedPlan.tool}`;
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
                  nluRoute = `chip:${forcedIntent}:${forcedPlan.tool}`;
                } else {
                  // DEGRADACIÓN AMABLE: el tool no respondió (sin red / sidecar
                  // caído / timeout). En vez de un error mudo, inyectamos
                  // evidence sintética available:false para que el agente
                  // responda con un mensaje amable y NO invente datos.
                  toolEvidence = {
                    tool: forcedPlan.tool,
                    args: forcedPlan.args,
                    result: {
                      available: false,
                      reason: 'sin_respuesta',
                      hint: 'la herramienta no respondió — pedirle al usuario revisar su conexión e intentar de nuevo, sin inventar datos',
                    },
                  };
                  nluRoute = `chip:${forcedIntent}:${forcedPlan.tool}:sin_respuesta`;
                  console.debug('[sidecar] chip forzado tool null — degradación amable', {
                    intent: forcedIntent,
                    tool: forcedPlan.tool,
                  });
                }
              }
            }
          } else if (!toolEvidence) {
          // PASO 2b — NLU planner + tool call (flow original, sin chip y sin
          // evidencia ya resuelta por el routing de conocimiento del PASO 2-pre).
          const tNlu0 = performance.now();
          const plan = await planNlu(textForLLM, contextMemory);
          if (plan?.tool) nluRoute = `nlu:${plan.tool}`;
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
              nluRoute = `nlu:chain:${useful.map((e) => e.tool).join('>')}`;
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
              nluRoute = `nlu:${plan.tool}`;
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
                nluRoute = `fallback:${fbPlan.tool}`;
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
            const climaLocation = resolveClimaLocation({ municipio: activeFinca?.municipio });
            const profileForClima = getProfile();
            const municipio = activeFinca?.municipio
              || climaLocation?.municipio
              || profileForClima?.municipio
              || FARM_CONFIG?.MUNICIPIO
              || null;
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
              nluRoute = 'heuristic:get_clima_ideam:no_municipio';
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
                  lat: climaLocation?.lat,
                  lng: climaLocation?.lng,
                  elevation: climaLocation?.elevation,
                  vereda: climaLocation?.vereda,
                  location_source: climaLocation?.source,
                });
                const tClima1 = performance.now();
                if (climaResult) {
                  toolEvidence = {
                    tool: 'get_clima_ideam',
                    args: {
                      action: 'monthly_avg',
                      municipio,
                      metric: 'precipitation',
                      desde: desdeDate,
                      lat: climaLocation?.lat,
                      lng: climaLocation?.lng,
                      elevation: climaLocation?.elevation,
                      vereda: climaLocation?.vereda,
                      location_source: climaLocation?.source,
                    },
                    result: climaResult,
                  };
                  nluRoute = 'heuristic:get_clima_ideam';
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

      const rawResponse = await callLLM(textForLLM, contextMemory, contextCorpus, toolEvidence, resolvedEntities, suggestedEntities, fermentoBlock, subgrafoBloque);
      // Fallback estructurado (Item 9): si el LLM retornó vacío (timeout, OOM,
      // modelo caído), construimos una respuesta útil con lo que sabemos
      // (toolEvidence, entidades) en vez de un silencio o banner rojo.
      const fallbackContent = buildFallbackResponse(rawResponse, toolEvidence, resolvedEntities);
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
      const deLeaked = stripRoleLeak(fallbackContent);
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
      const profileForCapture = (() => {
        try { return getProfile(); } catch (_) { return {}; }
      })();
      const currentLlmStats = llmStatsRef.current;
      captureExchange({
        userText: text.trim(),
        agentText: response,
        identity: {
          user_id: operatorId,
          user_name: profileForCapture?.nombre || null,
          finca_slug: activeFincaSlug || null,
          finca_nombre: fincaActiva?.nombre || fincaActiva?.name || null,
        },
        meta: {
          session_id: `${operatorId}:${activeFincaSlug || 'sin-finca'}`,
          nlu_route: nluRoute,
          entities_grounded: Array.isArray(resolvedEntities)
            ? resolvedEntities.map((e) => e?.canonical_id || e?.id || e?.mentioned).filter(Boolean)
            : [],
          guards_fired: guarded.modified ? guarded.reasons || [] : [],
          grounded_status: sourceMetadata?.source || sourceMetadata?.grounded_status || null,
          latency_ms: Math.round(performance.now() - pipelineStartedAt),
          model: selectChatRoute(textForLLM),
          eval_rate: currentLlmStats?.eval_rate ?? null,
          first_token_ms: currentLlmStats?.first_token_ms ?? null,
          response_len: currentLlmStats?.response_len ?? null,
        },
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
        // TIER 2 #5: degradación amable. Si TODO el stack de voz falla
        // (Kokoro caído + Web Speech ausente), avisamos en el strip — la
        // respuesta YA está escrita arriba, nada se rompe ni queda mudo.
        // Damos 1.2s de gracia porque Web Speech puede demorar el onstart.
        const warnIfMute = () => {
          setTimeout(() => {
            if (!isAudioPlaying() && !isSpeaking()) {
              setVoiceNotice('Ahora no puedo hablarte — te dejé la respuesta escrita aquí arriba.');
            }
          }, 1200);
        };
        if (kokoroReady) {
          // Free 7→10 fix-pack #4: streaming frase-por-frase reduce la
          // latencia hasta-primer-audio de "esperar respuesta entera"
          // (3-23s) a "esperar primera frase" (<2s). Internamente fallback
          // a speakKokoro/speak en caso de error en la primera frase.
          speakSentences(response, { rate: 0.9, pitch: 1.0 })
            .then((ok) => { if (!ok) warnIfMute(); })
            .catch(() => warnIfMute());
        } else {
          const utterance = speak(response, { rate: 0.9, pitch: 1.0 });
          if (!utterance) warnIfMute();
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
          setVoiceNotice('No te entendí bien. Intenta de nuevo, o escribe tu pregunta aquí abajo.');
        }
      } catch (err) {
        // TIER 2 #5 degradación: Whisper caído NO rompe el flujo ni grita en
        // rojo. (1) Guardamos el audio para reintento cuando vuelva el
        // servicio (pending_voice_recordings), (2) avisamos amable y dejamos
        // el teclado como camino. Nunca error mudo.
        setState(STATE_IDLE);
        queueForRetry(blob, {
          reason: err?.message || 'whisper failed',
          durationMs: result.durationMs || 0,
        }).catch(() => {});
        setVoiceNotice('No pude escucharte esta vez — guardé tu audio para reintentarlo. Mientras tanto puedes escribir tu pregunta aquí abajo.');
      }
    } else {
      resetRecord();
      // Permiso de micrófono denegado / sin MediaRecorder → degradar a texto
      // con aviso amable (antes: unhandled rejection silenciosa).
      startRecord().catch((err) => {
        console.warn('[Agent] no se pudo iniciar grabación:', err?.message);
        setState(STATE_IDLE);
        setVoiceNotice('No pude usar el micrófono. Revisa el permiso del navegador, o escribe tu pregunta aquí abajo.');
      });
      setState(STATE_RECORDING);
      setError('');
      setVoiceNotice('');
      agentSounds.listen();
    }
  };

  // Handler legado conservado (sin uso actual). El prefijo _ lo exime del linter.
  const _handleTextSubmit = (e) => {
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

  // ── Foto inline desde el compositor del AgentScreen ───────────────────────
  // Independiente del outbox: el operador ya está en la pantalla del agente,
  // así que la foto se procesa directamente (captureAndCompress → preview).
  // Al enviar: processPhotoItem inline → handleSubmit(prompt, suppressUserBubble).
  const handleAgentPhotoPick = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const looksLikeImage =
      (file.type && file.type.startsWith('image/')) ||
      isAnalyzableImageAttachment({ mime: file.type, fileName: file.name });
    if (!looksLikeImage) {
      setAgentPickError('Por ahora solo puedo ver fotos. Mándame una foto de tu planta o cultivo.');
      return;
    }
    setAgentPickError('');
    try {
      const { blob, mime } = await captureAndCompress(file);
      const previewUrl = URL.createObjectURL(blob);
      photoObjectUrlsRef.current.push(previewUrl);
      setAgentAttachment({ blob, mime, previewUrl, fileName: file.name || 'foto.jpg', kind: 'photo' });
    } catch (err) {
      console.error('[AgentScreen] no se pudo procesar la foto:', err);
      setAgentPickError('No pude procesar esa foto. Inténtalo de nuevo.');
    }
  };

  const clearAgentAttachment = () => {
    if (agentAttachment?.previewUrl) URL.revokeObjectURL(agentAttachment.previewUrl);
    setAgentAttachment(null);
    setAgentPickError('');
  };

  const handleAgentSend = async () => {
    if (state === STATE_RECORDING) return;
    // Shimmer/lift animation al enviar (paridad AgentHero).
    setComposerPhase('sending');
    setTimeout(() => setComposerPhase('idle'), 560);
    if (agentAttachment) {
      // Foto inline: armar burbuja + correr visión + handleSubmit
      const item = {
        kind: 'photo',
        blob: agentAttachment.blob,
        mime: agentAttachment.mime,
        text: inputText.trim(),
      };
      // Pintar burbuja con la imagen DE INMEDIATO
      const createUrl = (blob) => {
        if (typeof URL === 'undefined' || !URL.createObjectURL) return null;
        const url = URL.createObjectURL(blob);
        photoObjectUrlsRef.current.push(url);
        return url;
      };
      const { message } = buildPhotoUserMessage(item, createUrl);
      setMessages((prev) => [...prev, message]);
      // Correr visión y armar prompt
      const { prompt, finding } = await processPhotoItem(item, {
        analyze: analyzeFoliage,
        createUrl: null,
      });
      setInputText('');
      clearAgentAttachment();
      setActiveIntent(null);
      setAlertContextBanner(null);
      await handleSubmit(prompt, {
        suppressUserBubble: true,
        visionContext: {
          hadVision: true,
          visionConfidence:
            finding && typeof finding.confidence === 'number' ? finding.confidence : null,
        },
      });
      return;
    }
    if (!inputText.trim()) return;
    handleSubmit(inputText, { forcedIntent: activeIntent });
    setInputText('');
    setActiveIntent(null);
    setAlertContextBanner(null);
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
        let text = '';
        try {
          text = item.blob ? await transcribe(item.blob) : '';
        } catch (sttErr) {
          // TIER 2 #5 degradación: Whisper caído NO rompe el flujo. Guardamos
          // el audio para reintento + aviso amable (sin banner rojo).
          setMessages((prev) => prev.filter((m) => m._outboxId !== item.id));
          if (item.blob) queueForRetry(item.blob, { reason: sttErr?.message || 'whisper failed' }).catch(() => {});
          setVoiceNotice('No pude escuchar tu audio esta vez — lo guardé para reintentarlo. Mientras tanto puedes escribir tu pregunta.');
          await outboxMarkError(item.id, sttErr?.message || 'transcripción falló');
          return false;
        }
        // Sustituir el placeholder por la transcripción real (sin duplicar).
        setMessages((prev) => prev.filter((m) => m._outboxId !== item.id));
        if (text && text.trim()) {
          await handleSubmit(text.trim());
          await outboxMarkAnswered(item.id, { answeredText: text.trim() });
          return true;
        }
        setVoiceNotice('No te entendí bien. Intenta de nuevo, o escribe tu pregunta aquí abajo.');
        await outboxMarkError(item.id, 'transcripción vacía');
        return false;
      }

      if (item.kind === 'photo') {
        // Bug fix 2026-06-08: IDB puede serializar el Blob perdiendo su MIME type.
        // Si item.blob.type está vacío pero item.mime existe, reconstruimos el Blob.
        if (item.blob && !item.blob.type && item.mime) {
          try {
            item = { ...item, blob: new Blob([item.blob], { type: item.mime }) };
          } catch (_) { /* noop: degradamos a prompt sin imagen */ }
        }
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
    <div className={`h-[100dvh] flex flex-col overflow-hidden relative text-white ${entranceClassRef.current}`}>
      {/* Scrim semitransparente: deja ver --app-bg-image del body */}
      <div className="absolute inset-0 bg-slate-950/82 backdrop-blur-sm pointer-events-none" aria-hidden="true" />
      {/* B1: animación de entrada (fade+rise). Respeta prefers-reduced-motion. */}
      <style>{AGENT_ENTRANCE_CSS}{AGENT_COMPOSITOR_CSS}</style>

      {/* ── Header estilo ScreenShell (2026-06-08): scrim + blur + acciones globales ── */}
      <header className="px-4 py-3 flex items-center gap-2 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md shrink-0">
        {/* Back */}
        <button
          type="button"
          onClick={onBack}
          className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          aria-label="Volver"
        >
          <ArrowLeft size={20} className="text-slate-300" />
        </button>
        {/* Home */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('chagra:nav', { detail: 'dashboard' }))}
          className="p-3 rounded-full bg-slate-800 hover:bg-emerald-700/40 hover:text-emerald-200 active:bg-emerald-700/60 transition-all text-emerald-400 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          aria-label="Volver al inicio"
          title="Inicio"
        >
          <Home size={20} />
        </button>
        {/* Avatar + título */}
        <ChagraAgentAvatarColibriPhoto
          state={state === STATE_RECORDING ? 'listening' : (state === STATE_THINKING || isVoicePlaying) ? 'thinking' : 'idle'}
          size={36}
          onDoubleClick={async () => {
            if (isSpeaking() || ttsEnabled) {
              stop(); setTtsEnabled(false); agentSounds.cancel(); return;
            }
            setTtsEnabled(true);
            const ok = await replayLast({ useKokoro: kokoroReady });
            if (ok) agentSounds.chime();
          }}
          ariaLabel="Chagra IA — doble click silencia/reactiva voz"
        />
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-white leading-tight truncate">Chagra IA</h1>
          {/* Theme-aware (2026-06-10): clases Tailwind (van por --c-*) en vez
              de hex inline que ignoraba los temas. + estado "hablando". */}
          <p className={`text-[10px] font-semibold uppercase tracking-wider leading-tight ${
            state === STATE_THINKING ? 'text-amber-500'
              : state === STATE_RECORDING ? 'text-violet-400'
              : isVoicePlaying ? 'text-emerald-400'
              : 'text-emerald-300'
          }`}>
            {state === STATE_THINKING && 'pensando…'}
            {state === STATE_RECORDING && 'escuchando…'}
            {state === STATE_IDLE && (isVoicePlaying ? 'hablando…' : 'agente agroecológico')}
          </p>
        </div>
        {/* Acciones: nueva conversación + TTS + online badge */}
        <button
          type="button"
          onClick={handleNewConversation}
          disabled={state !== STATE_IDLE || messages.length === 0}
          className={`p-2.5 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center transition-all ${
            state !== STATE_IDLE || messages.length === 0
              ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 active:scale-95'
          }`}
          title="Nueva conversación"
          aria-label="Iniciar nueva conversación"
          data-testid="new-conversation-btn"
        >
          <RotateCcw size={15} />
        </button>
        <button
          type="button"
          disabled={!ttsSupported}
          onClick={() => { if (ttsEnabled) stop(); setTtsEnabled(!ttsEnabled); }}
          className={`p-2.5 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center transition-all ${
            !ttsSupported ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
              : ttsEnabled ? 'bg-violet-900/40 text-violet-400'
              : 'bg-slate-800 text-slate-500'
          }`}
          title={ttsEnabled ? 'Silenciar voz' : 'Activar voz'}
        >
          {ttsEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
        </button>
        <div className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-full text-[10px] ${
          isOnline ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'
        }`}>
          {isOnline ? <Wifi size={11} /> : <WifiOff size={11} />}
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </header>

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

      {/* ── Chips (modo) — fila scrollable unificada.
          Oculta en pantalla vacía donde QuickChipsBar ya muestra ejemplos
          (issue #5 duplicación resuelta 2026-06-08). ── */}
      {(state !== STATE_IDLE || messages.length > 0) && (
        <ChipsToolbar
          onSelectIntent={handleChipSelect}
          activeIntent={activeIntent}
          hasAttachment={false}
          disabled={state === STATE_RECORDING}
          isPro={getCurrentTier() === 'pro'}
        />
      )}

      {/* ── Compositor pill — paridad completa AgentHero (2026-06-08) ── */}
      <div className="relative z-10 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] pt-2 border-t border-slate-800/60 bg-slate-900/70 backdrop-blur-md shrink-0">

        {/* Preview de foto adjunta (outbox) */}
        {agentAttachment && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <img
              src={agentAttachment.previewUrl}
              alt="Foto adjunta"
              className="w-14 h-14 rounded-lg object-cover border border-slate-700"
            />
            <p className="text-xs text-slate-400 flex-1 leading-snug">
              📷 Foto lista — añade una nota opcional
            </p>
            <button
              type="button"
              onClick={clearAgentAttachment}
              className="p-1.5 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300"
              aria-label="Quitar foto"
            >
              <X size={13} />
            </button>
          </div>
        )}
        {agentPickError && (
          <p className="text-xs text-red-400 mb-2 px-1">{agentPickError}</p>
        )}

        {/* TIER 2 #5 — estado de VOZ evidente para baja alfabetización:
            "Chagra te escucha / está pensando / está hablando" con ícono+
            animación, botón Parar mientras habla, botón GRANDE "Volver a oír"
            cuando ya hay una respuesta hablada, y aviso amable si el oído
            (Whisper) o la voz (Kokoro/Web Speech) se degradan. */}
        <VoiceStatusStrip
          phase={
            state === STATE_RECORDING ? 'listening'
              : state === STATE_THINKING ? 'thinking'
              : isVoicePlaying ? 'speaking'
              : 'idle'
          }
          canRepeat={Boolean(getLastSpoken())}
          notice={voiceNotice}
          onRepeat={async () => {
            setVoiceNotice('');
            const ok = await replayLast({ useKokoro: kokoroReady });
            if (!ok) {
              setVoiceNotice('No pude repetir la respuesta — la tienes escrita aquí arriba.');
            }
          }}
          onStopSpeaking={() => { stop(); agentSounds.cancel(); }}
          onDismissNotice={() => setVoiceNotice('')}
        />

        {/* Pill — unified with AgentHero (as-bar CSS tokens) */}
        <div
          className={[
            'as-bar',
            state === STATE_RECORDING ? 'is-recording' : '',
            composerPhase === 'sending' ? 'as-shimmer as-sending' : '',
          ].join(' ')}
        >
          {/* Fila 1: textarea o waveform de grabación */}
          {state === STATE_RECORDING ? (
            <div className="flex items-center gap-3 px-3 py-3 min-h-[52px]">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
              </span>
              <span className="flex-1 text-sm text-rose-400 font-medium tabular-nums">
                Grabando… {Math.floor(durationMs / 1000)}s
                <span className="block text-[11px] text-rose-300/80 font-normal">
                  Habla tranquilo. Toca el botón rojo cuando termines.
                </span>
              </span>
            </div>
          ) : (
            <textarea
              rows={1}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAgentSend();
                }
              }}
              placeholder={
                queuePending.length >= 1
                  ? 'Espera — ya hay una en cola…'
                  : queueProcessing
                    ? 'Adelanta otra pregunta (máx 1 en cola)'
                    : agentAttachment
                      ? 'Añade una nota a tu foto (opcional)…'
                      : activePlaceholder
              }
              disabled={queuePending.length >= 1}
              data-testid="agent-input"
              className="w-full bg-transparent resize-none px-3 py-3 text-sm text-white placeholder-slate-500 focus:outline-none leading-snug"
              style={{ minHeight: '44px', maxHeight: '140px' }}
            />
          )}

          {/* Fila 2: Ⓐ | 📷 | spacer | 🎤 | Enviar */}
          <div className="flex items-center gap-2 px-1 pb-1 pt-0.5">
            {/* Botón Ⓐ — abre hoja de capacidades */}
            <button
              type="button"
              onClick={() => setSheetOpen((o) => !o)}
              disabled={state === STATE_RECORDING}
              aria-label="Ver todo lo que puede hacer Chagra"
              aria-expanded={sheetOpen}
              className={['as-iconbtn as-tool', sheetOpen ? 'is-open' : ''].join(' ')}
            >
              <Sparkles size={18} strokeWidth={2} aria-hidden="true" />
            </button>

            {/* Cámara — sin `capture`, abre galería+cámara igual que AgentHero */}
            <button
              type="button"
              onClick={() => cameraInputAgentRef.current?.click()}
              disabled={state === STATE_RECORDING || queuePending.length >= 1}
              aria-label="Tomar o elegir foto"
              className="as-iconbtn"
            >
              <Camera size={19} strokeWidth={2} aria-hidden="true" />
            </button>

            <div className="flex-1" />

            {/* Micrófono (toggle) — GRANDE (TIER 2 #5): el camino principal
                del campesino que casi no lee es HABLAR, no escribir. 54px
                con anillo de acento; en grabación se vuelve el botón rojo
                de "detener y enviar". */}
            <button
              type="button"
              onClick={handleVoiceRecord}
              disabled={queuePending.length >= 1}
              aria-label={state === STATE_RECORDING ? 'Detener y enviar audio' : 'Hablar con Chagra'}
              aria-pressed={state === STATE_RECORDING}
              data-testid="agent-mic-btn"
              className={['as-iconbtn as-mic-big', state === STATE_RECORDING ? 'as-mic-on' : ''].join(' ')}
            >
              {state === STATE_RECORDING
                ? <Square size={20} strokeWidth={2.5} />
                : <Mic size={24} strokeWidth={2} />}
            </button>

            {/* Enviar — ChagraAgentAvatar idéntico al Home */}
            <button
              type="button"
              onClick={handleAgentSend}
              disabled={
                (!inputText.trim() && !agentAttachment) ||
                state === STATE_RECORDING ||
                queuePending.length >= 1
              }
              data-testid="agent-submit"
              aria-label="Enviar al agente"
              className="as-send"
              style={{
                background:
                  (!inputText.trim() && !agentAttachment) || state === STATE_RECORDING || queuePending.length >= 1
                    ? 'rgba(51,65,85,0.8)'
                    : 'linear-gradient(135deg,#10b981 0%,#0891b2 100%)',
                boxShadow:
                  (!inputText.trim() && !agentAttachment) || state === STATE_RECORDING || queuePending.length >= 1
                    ? 'none'
                    : '0 0 18px rgba(16,185,129,0.5)',
              }}
            >
              <ChagraAgentAvatar
                size={38}
                state={state === STATE_THINKING ? 'thinking' : 'idle'}
                ariaLabel="Enviar al agente"
              />
            </button>
          </div>
        </div>

        {/* Hint educativo bajo el pill */}
        {state !== STATE_RECORDING && !agentAttachment && (
          <p className="mt-1 text-center text-[11px] text-slate-500 leading-tight">
            Toca <b className="text-emerald-400">✦</b> para ver todo lo que sé hacer
          </p>
        )}

        {/* Input oculto de foto */}
        <input
          ref={cameraInputAgentRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={handleAgentPhotoPick}
        />


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

      {/* Hoja de capacidades (Ⓐ) — misma UX que AgentHero */}
      {sheetOpen && (
        <>
          <div className="as-sheet-scrim" onClick={() => setSheetOpen(false)} aria-hidden="true" />
          <section
            className="as-sheet"
            role="dialog"
            aria-modal
            aria-label="Capacidades de Chagra"
          >
            <div className="as-sheet-grab" aria-hidden="true" />
            <div className="px-5 pb-2 pt-1 text-center">
              <p className="text-lg font-bold text-white">¿En qué te ayudo?</p>
              <p className="text-sm text-slate-400 mt-1">Toca una opción para empezar. Toda respuesta viene con su fuente.</p>
            </div>
            <div className="px-4 pb-4 overflow-y-auto flex flex-col gap-3">
              {CHIP_DEFS.map((chip) => (
                <button
                  key={chip.intent}
                  type="button"
                  className="as-cap"
                  onClick={() => {
                    handleChipSelect(chip.intent);
                    setSheetOpen(false);
                  }}
                >
                  <span className="as-cap-ico" aria-hidden="true">{chip.emoji}</span>
                  <span className="flex-1 min-w-0 text-left">
                    <span className="font-bold text-white block">{chip.label}</span>
                    <span className="text-sm text-slate-400 block mt-0.5">{chip.placeholder}</span>
                  </span>
                  <span className="text-emerald-400 text-lg self-center" aria-hidden="true">›</span>
                </button>
              ))}
            </div>
            <p className="px-5 pb-5 text-center text-xs text-slate-500">
              Chagra responde con información de <b className="text-emerald-400">AGROSAVIA</b>, <b className="text-emerald-400">ICA</b> e <b className="text-emerald-400">IDEAM</b>.
            </p>
          </section>
        </>
      )}

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
