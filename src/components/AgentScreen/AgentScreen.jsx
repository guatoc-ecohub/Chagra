import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ArrowLeft, Mic, MicOff, Send, Sparkles, Wifi, WifiOff, Volume2, VolumeX, RotateCcw, X, Home, Camera, Square, Sprout, HelpCircle } from 'lucide-react';
import useVoiceRecorder from '../../hooks/useVoiceRecorder';
import { mensajeErrorCampesino } from '../../utils/mensajeErrorCampesino';
import { transcribe, queueForRetry } from '../../services/voiceService';
import VoiceStatusStrip from './VoiceStatusStrip';
import ChipsToolbar from '../ChipsToolbar';
import ContextTip from '../ContextTip';
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
import { AGENT_ENTRANCE_CSS, AGENT_COMPOSITOR_CSS, AGENT_V3_CSS, agentEntranceClass } from './agentEntrance';
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
import { isSidecarEnabled, planNlu, callTool, executeToolChain, resolveEntities, fermentoPrefilter, biopreparadoGrounding, pisoTermicoGuard, confusionEspecieGuard, pestVsDiseaseGuard, companionSpeciesGuard, postValidate, getClimaIdeam, isToolAllowed } from '../../services/sidecarClient';
// CHIPS DE MODO (A3/A4, decisión operador 2026-06-02): el router PURO mapea
// la intención forzada del chip → tool determinístico, SALTANDO el NLU
// (que misroutea). `planForcedIntent` decide tool+args; `isStubIntent` marca
// el chip cuyo backend aún no existe (deep).
import { planForcedIntent, isStubIntent, isDeepResearchIntent, CHIP_DEFS } from '../../services/chipIntentRouter';
// Fases visibles del "pensando" (MSG.agente.fases) — perceived performance:
// la espera larga muestra en qué va el pipeline, no un "Pensando" opaco.
import { MSG } from '../../config/messages';
// «Chagra enseña a usar Chagra» (ayuda groundeada): detecta preguntas META
// («¿cómo uso X?», «¿qué puede hacer Chagra?», «¿dónde veo los precios?») y
// responde DESDE el manifiesto (ayudaFunciones) — sin LLM, nunca inventa una
// función que no existe, y evita el misroute meta→get_species.
import { detectMetaAyudaIntent } from '../../services/metaAyudaIntent';
import { buildAyudaResponse } from '../../services/ayudaAgentResponder';
// #349 — router heurístico de GROUNDING para el path de FALLO del NLU. Cuando
// `planNlu` devuelve null (timeout/fail del sidecar bajo contención de GPU), el
// turno NO debe saltarse el grounding: este router PURO deriva el tool obvio
// (entidad resuelta o keyword → get_species/get_pest_controllers/get_biopreparados)
// para intentar AL MENOS una consulta al grafo en vez de caer a generativo puro.
import { planNluFallback, esSaludoPuro } from '../../services/agentNluFallback';
import { planKnowledgeIntent, hasSoilDiagnosticIntent } from '../../services/knowledgeIntentRouter';
// Fix misroute "papa precio" (2026-07-05): router PURO que detecta intención
// de PRECIO/MERCADO ANTES de planKnowledgeIntent/planNlu — garantiza que
// "a cómo está la papa" SIEMPRE llame get_precio_sipsa (dato vivo), nunca
// termine en ficha/viabilidad/variedades. Ver cabecera de marketIntentRouter.js.
import { planMarketIntent } from '../../services/marketIntentRouter';
// Grounding OFFLINE del grafo (#49): cuando NO hay red, el bloque de relaciones
// (plaga→controlador / compatibles / antagonistas / biopreparados / vernáculos)
// se arma desde el export precacheado del grafo AGE (grafo-relations.json), en
// vez de quedarse sin grounding relacional. resolveSpecies mapea el query a un
// id del catálogo SIN red (catalogDB + BM25 local).
import { buildOfflineGroundingBlock, getPestIndex, getPestSynonyms } from '../../services/grafoRelations';
// AFFECTS-GATE (anti-contaminación cruzada de cultivo): el sello "Catálogo
// verificado" NO debe pintarse cuando la evidencia surfacea un organismo que no
// afecta al cultivo en foco (arista AFFECTS ausente). Ver affectsGate.js.
import {
  extractAffectsFromEvidence,
  resolvePestAffects,
  scanTextForPestAffects,
  detectCrossCropContamination,
  gateSourceMetadataByAffects,
} from '../../services/affectsGate';
import { resolveSpecies } from '../../services/speciesResolver';
// Deep Research (A6/A7): cliente HTTP del endpoint async de investigación
// profunda del sidecar. Feature flag VITE_DEEP_RESEARCH_ENABLED (default false).
import { submitDeepResearch, pollDeepResearch, isDeepResearchEnabled } from '../../services/deepResearchClient';
// Tier free|pro (A1): resuelve el tier del usuario logueado contra la allowlist.
// isPro controla el gate de la UI (chip 🔬); x-chagra-tier se inyecta en el
// sidecarClient/deepResearchClient vía buildSidecarHeaders (defense-in-depth).
import { getCurrentTier } from '../../services/tierService';
import DeepResearchCard from '../DeepResearchCard';
import { normalizeUserInputForRegion, buildClimaContext, buildFincaContext, buildViabilityContext, buildFrostHeatContext, buildAssociationContext, buildInvasiveSafetyContext, buildCuratedFactsContext, applyVoseoFilter, resolveUserRegion, stripRoleLeak, buildPriceDeclineContext, buildPriceAnswer, buildSuggestedEntitiesContext, isLowConfidenceEntity, buildFallbackResponse, pisoTermicoFromAltitud, groupAndLimitCultivos } from '../../services/agentService';
import { buildPriceReferenceAnswer } from '../../services/marketplaceService';
import { buildBasePrompt, analyzeQuery, buildQueryAnalysisBlock, buildCorpusVariants, buildResolvedEntitiesBlock, formatToolEvidence, truncateEdgesBlock } from '../../services/agentPromptBase';
import { appendScientificFooter } from '../../services/semaforoConfianza';
// Nubosidad real para el grounding (fix Choachí 2026-06) — solo lee caches.
import { summarizeSkyForGrounding } from '../../services/skyConditionService';
import { assembleSystemContent, TOP_N_RAG } from '../../services/promptAssembler';
import { buildSpatialContextPin } from '../../services/spatialAgentContext';
import { applyOutputGuards, classifyQueryIntent } from '../../services/outputGuards';
import { createStreamGuard } from '../../services/streamGuards';
import { getProfile, getModuleVisibility } from '../../services/userProfileService';
import { selectChipDefs } from '../../services/profileChipSelector';
import { tieneAccesoGlaciarActual, esOperadorActual } from '../../config/glaciarAccess';
import { captureExchange } from '../../services/conversationCaptureService';
import { regionFromProfile, getEnsoOutlook } from '../../services/ensoContext';
import { prependCorrectionBlock } from './responseGuards';
// SALUDO PROACTIVO (#162 alertas + #298 tareas + #331 análisis): el agente, de
// entrada, lidera con lo MÁS importante (1-2 pendientes) si los hay, o da una
// idea contextual (cultivo/clima/temporada) sin inventar alarmas. Lógica pura
// y testeable extraída a proactiveGreeting; aquí solo la hidratamos desde los
// stores en vivo y la pintamos en el empty-state del chat.
import { resolveProactiveGreeting, saludoPorHora } from '../../services/proactiveGreeting';
import { saludoDePantalla } from '../../services/saludoPantalla';
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
// REINVENCIÓN 2026-07 — "El organismo que conversa": el fondo del chat deja de
// ser un rectángulo plano con velo y pasa a ser un MUNDO VIVO por tema que
// respira y REACCIONA al estado del agente (idle/escuchando/pensando/hablando),
// la misma alma del home "Finca Organismo". Reemplaza al `.agent-scrim`.
import AgentLivingScene from './AgentLivingScene';
import ActionConfirmModal from '../ActionConfirmModal';
import FeedbackConsentModal from '../FeedbackConsentModal';
import ChagraAgentAvatar from '../ChagraAgentAvatar';
import { AgentManoOverlay } from '../agent/AgentShell';
import { mapCapabilityPick } from '../agent/capabilityRouting';
import { agentSounds } from '../../services/agentSoundService';
import ManoChagraGlyph from '../dashboard/ManoChagraGlyph';
// Ícono del TEMA para el botón Ⓐ del compositor (paridad con home/TopBar y
// AgentHero): el acceso a capacidades entra por el ícono del tema, no por la
// mano (operador 2026-06-18). Misma fuente que TopBar.jsx / AgentHero.jsx.
import { useTheme, resolveAutoTheme } from '../../hooks/useTheme';
import { iconForTheme } from '../dashboard/themeIcon';
import { fincaVivaHomePerfilActivo } from '../../config/fincaVivaHomeFlag';
// Agente guiado: selección PURA de un insight verificado proactivo a partir del
// texto del turno (cultivo detectado → dato con fuente que el usuario no vio).
// El hook useInsightProactivo exporta estas funciones puras; aquí las usamos
// imperativamente al cerrar cada turno para ofrecer el insight DENTRO del chat.
import { detectarSlugEnTexto, elegirInsight } from '../../hooks/useInsightProactivo';
import usePrefsStore from '../../store/usePrefsStore';
import useAssetStore from '../../store/useAssetStore';
import useAgentNotificationStore from '../../store/useAgentNotificationStore';
import useOllamaWarmStore from '../../store/useOllamaWarmStore';
import useAgentQueueStore from '../../store/useAgentQueueStore';
import useFincaActiveStore from '../../services/fincaActiveStore';
import useAlertStore from '../../store/useAlertStore';
// #5 (2026-06-13) — COLA DURABLE de requests al agente. El queue Zustand
// (useAgentQueueStore) es EFÍMERO (se pierde al recargar). Esta cola persiste
// en IndexedDB ANTES de llamar al LLM, captura telemetría rica (latencia +
// grounding + tokens) al cerrar el turno, y reanuda sola los requests que
// quedaron 'queued'/'offline' de sesiones previas — para que NUNCA se pierda
// una pregunta y NUNCA mostremos "Tiempo agotado. Toca de nuevo".
import {
  enqueueRequest as durableEnqueue,
  finalizeRequest as durableFinalize,
  failRequest as durableFail,
  resumePending as durableResumePending,
  drainPending as durableDrainPending,
} from '../../services/agentRequestQueue';
import { createAgentRequestSender } from '../../services/agentRequestSender';

// 2026-05-16: migrado a llmRouter (Multi-LLM por tarea). AgentScreen usa
// la `chat` route con el modelo de chat configurado como hot model. Bench
// completo en docs operativos internos del proyecto.
// Para NLU/tools usar llmRouter('nlu') → modelo NLU configurado.

const STATE_IDLE = 'idle';
const STATE_RECORDING = 'recording';
const STATE_THINKING = 'thinking';

export default function AgentScreen({ onBack, onNavigate, initialContext }) {
  // B1: clase de animación de entrada, resuelta UNA vez al montar (no en cada
  // re-render — si no, la animación se reiniciaría con cada mensaje). Vacía bajo
  // prefers-reduced-motion.
  const entranceClassRef = useRef(agentEntranceClass());
  // Tema activo → ícono del botón Ⓐ del compositor (igual que home/TopBar).
  const { theme } = useTheme();
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
  const startOllamaWarmup = useOllamaWarmStore((s) => s.startWarmup);
  // Bug visual Vi1 (auditoría IA 2026-07-08): el banner "Preparando agente
  // IA" quedaba pegado PARA SIEMPRE si el status nunca salía de 'unknown'
  // (rutas de entrada que no pasan por login/dashboard no disparaban el
  // warm-up → nadie resolvía el estado). Kick idempotente al montar: si
  // nadie calentó todavía, lo intentamos aquí y el status transiciona a
  // warming → warm/failed, y el banner se va solo.
  useEffect(() => {
    if (useOllamaWarmStore.getState().status === 'unknown') {
      startOllamaWarmup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
  // El valle 3D entrega un pin de turno 0 al abrir el chat. No se mezcla con
  // el texto del usuario ni se persiste en memoria conversacional: permanece
  // como sistema durante esta sesión y el flujo del chat sigue intacto.
  const spatialContextPin = useMemo(
    () => buildSpatialContextPin(initialContext?.spatialContext),
    [initialContext],
  );

  const [messages, setMessages] = useState([]);
  // Agente guiado: ids de insights ya ofrecidos/vistos en esta sesión de chat,
  // para no repetir el mismo dato en turnos sucesivos. Ref (no state): solo lo
  // lee/escribe la lógica de cierre de turno; no debe re-renderizar.
  const insightsVistosRef = useRef([]);
  const [inputText, setInputText] = useState('');
  const [state, setState] = useState(STATE_IDLE);
  // Compositor inline (foto adjuntada directamente en AgentScreen, sin outbox).
  // Independiente de la outbox — el operador ya está en la pantalla del agente.
  const cameraInputAgentRef = useRef(null);
  // Ancla de la MANO: el botón Ⓐ del compositor ES la raíz geométrica de la red
  // (paridad con el home — una sola Ⓐ, la red nace de ese botón real).
  const aButtonRef = useRef(null);
  const [agentAttachment, setAgentAttachment] = useState(null); // {blob,mime,previewUrl,fileName}
  const [agentPickError, setAgentPickError] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  // Fase visible del pipeline mientras state === STATE_THINKING (perceived
  // performance): 'transcribiendo' | 'entendiendo' | 'consultando' |
  // 'escribiendo' | null. Cada entrada al pipeline la setea fresca, así que
  // no hace falta limpiarla al salir de THINKING (solo se renderiza ahí).
  const [thinkingPhase, setThinkingPhase] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [error, setError] = useState('');
  const [actionModal, setActionModal] = useState({ isOpen: false, intent: null, llmResponse: '', toolName: '', description: '', parameters: {} });
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
  // CHIPS DE MODO (A4): modo activo seleccionado en la mano de Chagra. Cuando
  // hay un modo activo, el siguiente submit fuerza esa intención y rutea
  // DIRECTO al tool determinístico (saltando el NLU, A3). El placeholder del
  // input también cambia para guiar al campesino sobre qué escribir. Es un
  // toggle: tocar el mismo chip lo desactiva (vuelve al routing NLU normal).
  const [activeIntent, setActiveIntent] = useState(null);
  // CHIPS ADAPTATIVOS POR PERFIL: la "caja de herramientas" despliega los chips
  // MÁS APROPIADOS para esta persona (campesino→cultivo, restaurador→páramo/
  // silvopastoreo, guía glaciar→clima/páramo, ganadero→silvopastoreo...). La
  // SELECCIÓN/lógica vive en profileChipSelector (puro, testeado); aquí solo
  // leemos el perfil + módulos visibles + acceso glaciar y le pasamos la lista
  // ya filtrada a la mano de Chagra. NO tocamos su CSS (otro stream lleva estilo).
  // Memoizado al montar: el perfil rara vez cambia dentro de la sesión del chat
  // (mismo criterio que los otros getProfile() de este componente).
  const profileChipDefs = useMemo(() => {
    try {
      const profile = getProfile();
      return selectChipDefs(profile, {
        // El operador ve el catálogo COMPLETO de chips vivos (bypass del gating).
        esOperador: esOperadorActual(),
        esGuiaGlaciar: tieneAccesoGlaciarActual(),
        moduleVisibility: getModuleVisibility(),
      });
    } catch (_) {
      // Si algo falla, null → la mano cae a su catálogo completo (default).
      return null;
    }
  }, []);
  const isPro = useMemo(() => getCurrentTier() === 'pro', []);
  // La MANO de Chagra (AgentRedMenu) — MISMA red que el home, no menús de texto.
  // sheetOpen monta/desmonta el overlay de la mano (AgentManoOverlay).
  const [sheetOpen, setSheetOpen] = useState(false);
  // V3 (fable) — LA MOCHILA de modos. La bandeja de ~11-13 chips (ChipsToolbar)
  // ya NO vive inline sobre el input (se comía media pantalla en móvil y
  // ahorcaba el chat — el operador la rechazó 3 veces): se colapsa en UN
  // disparador del compositor que abre un bottom-sheet con scroll. Solo estado
  // de presentación; el ruteo sigue intacto (ChipsToolbar → onSelectIntent →
  // setActiveIntent).
  const [mochilaOpen, setMochilaOpen] = useState(false);
  // Fase del compositor para la animación shimmer/lift al enviar.
  const [composerPhase, setComposerPhase] = useState('idle'); // 'idle' | 'sending'
  // Deep Research (A6/A7): refs para los AbortControllers de los jobs en vuelo.
  // Guardamos en un Map (msgId → AbortController) para poder cancelar jobs
  // individuales. Al desmontar el componente cancelamos todos.
  const deepResearchControllersRef = useRef(new Map());
  const { durationMs, start: startRecord, stop: stopRecord, reset: resetRecord } = useVoiceRecorder();
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
  // #5 cola durable: id del registro IndexedDB del turno EN CURSO. enqueueRequest
  // lo crea ANTES de llamar al LLM (persistencia previa = cero pérdida); al
  // terminar, finalizeRequest/failRequest cierran ese mismo id con telemetría.
  const durableRequestIdRef = useRef(null);
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

  // Scroll fix tarea #58: el auto-scroll al fondo del chat lo maneja
  // ÚNICAMENTE ChatHistory, que tiene su `bottomRef` DENTRO del contenedor
  // scrollable real (`.h-full.overflow-y-auto`). El efecto previo de aquí
  // operaba sobre `chatEndRef`, un <div> que vivía FUERA de ese contenedor
  // (hermano de ChatHistory, hijo del root `overflow-hidden`): su
  // `scrollIntoView` no movía el chat y peleaba con el de ChatHistory →
  // "scroll trabado / que salta" reportado por el operador. Una sola fuente
  // de verdad para el auto-scroll evita el conflicto.

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
    // SALUDO CONTEXTUAL POR PANTALLA (2026-07-16): si el operador tocó a
    // Angelita desde una pantalla mapeada (AgentFab pasa `desdePantalla`),
    // ella saluda sobre ESO — "¿le ayudo con la germinación?" en #semilla.
    // Los pendientes URGENTES siguen mandando (una alerta de plaga le gana
    // a la cortesía); el saludo de pantalla solo reemplaza la idea genérica.
    const saludoPantalla = saludoDePantalla(initialContext?.desdePantalla);
    const greetingDePantalla = (hi) => ({
      state: 'idea',
      hi: hi || saludoPorHora(),
      lead: saludoPantalla,
      items: [],
      restCount: 0,
    });
    resolveProactiveGreeting({
      activeAlerts,
      getPendingTasks: () => useLogStore.getState().getPendingTasks(),
      cultivos: grouped,
      altitud: finca?.altitud != null ? Number(finca.altitud) : null,
      ensoOutlook,
    }).then((g) => {
      if (!alive) return;
      if (saludoPantalla && (!g || g.state !== 'pending')) {
        setProactiveGreeting(greetingDePantalla(g?.hi));
      } else {
        setProactiveGreeting(g);
      }
    }).catch(() => {
      // Degrada silencioso: con saludo de pantalla lo usamos igual; sin él,
      // cae al copy estático de siempre.
      if (alive && saludoPantalla) setProactiveGreeting(greetingDePantalla());
    });
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
    const { prefilledPrompt, prompt, sourceLabel, sourceUrl, alertContext, autoSend, fromVoice } = initialContext;
    let autoSendTimer = null;
    // Alias defensivo: varias pantallas de mundo pasaban la clave `prompt`
    // (SemillaScreen, PlatanoBanano, Poscosecha, Almacenamiento, Compost,
    // SaludSuelo…) creyendo que prellenaban el input, pero solo se leía
    // `prefilledPrompt` → el prompt se descartaba. Aceptar ambas repara el hueco.
    const seed = prefilledPrompt ?? prompt;
    if (typeof seed === 'string' && seed.trim().length > 0) {
      if (autoSend) {
        // 2026-07-05: widget "Chagra está escuchando" (escucha manos libres,
        // caso guantes/manos embarradas). La pregunta llega YA transcrita por
        // Whisper → se envía sola sin tocar la pantalla, y si vino por voz
        // activamos TTS para que la respuesta se HABLE por Kokoro.
        if (fromVoice && !ttsEnabled) setTtsEnabled(true);
        autoSendTimer = setTimeout(() => {
          handleSubmit(seed, { fromVoice: Boolean(fromVoice) });
        }, 250);
      } else {
        setInputText(seed);
      }
    }
    if (sourceUrl || sourceLabel || alertContext) {
      setAlertContextBanner({
        sourceLabel: sourceLabel || null,
        sourceUrl: sourceUrl || null,
        alertContext: alertContext || null,
      });
    }
    return () => { if (autoSendTimer) clearTimeout(autoSendTimer); };
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

  // #5 COLA DURABLE — recuperación de requests que sobrevivieron una recarga /
  // sesión anterior. Reanuda los 'offline' (resumePending) y luego drena los
  // 'queued' (drainPending) con un sender HEADLESS (corre el LLM sin React). El
  // resultado de cada recuperado se pinta como burbuja del agente etiquetada,
  // para que el campesino VEA la respuesta de la pregunta que creía perdida.
  // Guard de re-entrada para que dos disparos (mount + 'online') no se pisen.
  const durableRecoveringRef = useRef(false);
  const recoverDurableRequests = useCallback(async () => {
    if (durableRecoveringRef.current) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    durableRecoveringRef.current = true;
    try {
      await durableResumePending(); // 'offline' → 'queued'
      const sender = createAgentRequestSender();
      // Envolvemos el sender para CAPTURAR la respuesta recuperada y pintarla.
      const surfacingSender = async (req) => {
        const result = await sender(req);
        if (result?.response) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'user',
              content: req.prompt,
              timestamp: Date.now(),
              _recovered: true,
            },
            {
              role: 'assistant',
              content: result.response,
              timestamp: Date.now(),
              _recovered: true,
            },
          ]);
        }
        return result;
      };
      const summary = await durableDrainPending({ sender: surfacingSender });
      if (summary && (summary.processed > 0 || summary.failed > 0)) {
        console.debug('[Agent] cola durable recuperada', summary);
      }
    } catch (err) {
      console.debug('[Agent] recoverDurableRequests error (no crítico):', err?.message);
    } finally {
      durableRecoveringRef.current = false;
    }
  }, []);

  useEffect(() => {
    initTTS();
    isKokoroAvailable().then(setKokoroReady);
    loadHistory();
    // #5: al montar, recuperar preguntas pendientes de sesiones previas (no
    // bloquea el render — corre en background y pinta las respuestas cuando
    // lleguen). Cero pérdida tras recarga / cierre de app a mitad de inferencia.
    recoverDurableRequests();
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
    const handleOnline = () => {
      setIsOnline(true);
      // #5: al volver la conexión, reanudar las preguntas que quedaron
      // 'queued'/'offline' (las que el operador hizo sin señal en el campo).
      recoverDurableRequests();
    };
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
  }, [loadHistory, markRead, recoverDurableRequests]);

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
    setActionModal({ isOpen: false, intent: null, llmResponse: '', toolName: '', description: '', parameters: {} });
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
    setActionModal({ isOpen: false, intent: null, llmResponse: '', toolName: '', description: '', parameters: {} });
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

  const callLLM = async (query, contextMemory, contextCorpus, toolEvidence, resolvedEntities, suggestedEntities = null, fermentoBlock = '', subgrafoBloque = '', biopreparadoBlock = '', pisoTermicoBlock = '', confusionEspecieBlock = '', pestVsDiseaseBlock = '', groundingPolicyBlock = '') => {
    // Fase 3 del "pensando" visible: generación en el LLM. Cuando llega el
    // primer token, la UI pasa sola al parcial streaming (streamingContent).
    setThinkingPhase('escribiendo');
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
    // Nubosidad real de HOY (cache que llenan AgentHero/ClimaStrip en el home):
    // el agente cita la condición honesta del cielo (corrección orográfica
    // andina incluida) o no menciona nubosidad — nunca la inventa.
    const skyToday = climaSnapshot ? summarizeSkyForGrounding(climaSnapshot) : null;
    const climaContext = climaSnapshot ? `\n\n${buildClimaContext(climaSnapshot, { region: ensoRegion, sky: skyToday })}` : '';

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
    // Limitar a top-N especies más frecuentes para evitar inflar contexto (fix queue 056.3)
    const groupedCultivos = groupAndLimitCultivos(plants || []);
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
        const { getActiveDiseaseForCycle } = await import('../../services/diseaseObservationService');
        const STAGE_LBL = { sowing: 'Siembra', emergence: 'Brotó', vegetative: 'Creciendo', flowering: 'Floración', fruiting: 'Frutos', harvest_window: 'Cosecha', closed: 'Terminado' };
        const cycles = (await listFarmProcesses({ status: 'active' })) || [];
        return await Promise.all(cycles.slice(0, 5).map(async (/** @type {any} */ c) => {
          const at = c.attributes || {};
          const id = c.process_id || c.id;
          const base = String(at.current_stage || '').replace(/_confirmed$/, '');
          const days = at.created_at ? Math.max(0, Math.round((Date.now() - at.created_at) / 86400000)) : null;
          const risks = (() => { try { return getPestRisksByStage(at.current_stage, at.subject_slug) || []; } catch { return []; } })();
          const top = risks.find((r) => r.risk === 'crítico' || r.risk === 'alto');
          // Enfermedad observada en la BITÁCORA del ciclo (dato factual del usuario).
          // El agente debe conocerla SIN que el usuario la repita en su pregunta.
          const disease = await (async () => {
            try {
              const d = await getActiveDiseaseForCycle(id, at.subject_slug);
              if (!d || !d.isDisease) return null;
              return d.pathogen || 'síntoma de enfermedad sin identificar';
            } catch { return null; }
          })();
          return { label: at.subject_label, stage: STAGE_LBL[base] || base, days, topRisk: top ? `${top.pest} (${top.risk})` : null, disease };
        }));
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

    // BIOPREPARADOS (capa 1 GROUNDING, chagra-pro #248). El sidecar
    // /biopreparado-grounding ya resolvió contra el catálogo MCP si la query
    // toca un biopreparado real (caldo bordelés, etc.) y armó el bloque con su
    // composición/uso curados + la regla anti-negación ("NUNCA digas que este
    // insumo no existe") — FAIL-SAFE: si el MCP está caído NO fabrica datos.
    // Llega pre-formateado (system_prompt_block) y va de ÚLTIMO (recency máxima,
    // junto a fermento) para dominar la respuesta y evitar que el agente niegue
    // insumos que sí existen. '' (no-op) cuando no hubo intención-biopreparado o
    // el sidecar no respondió (degradación graceful — no rompe el turno).
    const biopreparadoSafetyBlock = (typeof biopreparadoBlock === 'string' && biopreparadoBlock.trim())
      ? `\n\n${biopreparadoBlock}`
      : '';

    // GUARDA PISO TÉRMICO (chagra-pro #288, driver #1 de contaminación
    // cross-domain, sonda `cross_thermal` de bench-contaminacion.mjs, ~86.7%
    // medida 2026-07). El sidecar /piso-termico-guard ya cruzó el piso térmico
    // del usuario (finca georreferenciada > perfil > texto libre) contra el
    // rango altitudinal real de la especie (mismo motor de viabilidad AGE de
    // /resolve-entities) y armó un bloque de SUPRESIÓN-Y-REEMPLAZO cuando hay
    // desajuste (marginal/inviable). Va de ÚLTIMO (recency máxima, después de
    // fermento/biopreparado) porque, igual que esas guardas, debe dominar
    // sobre el consejo de siembra genérico. '' (no-op) cuando el piso
    // coincide, no hubo señal de piso del usuario, o el sidecar no respondió
    // (degradación graceful — no rompe el turno, nunca inventa un rango).
    const pisoTermicoSafetyBlock = (typeof pisoTermicoBlock === 'string' && pisoTermicoBlock.trim())
      ? `\n\n${pisoTermicoBlock}`
      : '';

    // GUARDA CONFUSIÓN DE ESPECIE (chagra-pro #292, segundo driver de
    // contaminación cross-domain tras cross_thermal, sonda `confusion_especie`
    // de bench-contaminacion.mjs, ~20% medida 2026-07). El sidecar
    // /confusion-especie-guard ya detectó si la especie mencionada trae
    // advertencia `_anti_confusion` curada o un look-alike de familia botánica
    // distinta, y armó el bloque de SUPRESIÓN-Y-REEMPLAZO. Va de máxima
    // recency (mismo criterio que fermento/biopreparado/pisoTermico). ''
    // (no-op) cuando no hay riesgo detectado o el sidecar no respondió
    // (degradación graceful — no rompe el turno, nunca inventa un look-alike).
    const confusionEspecieSafetyBlock = (typeof confusionEspecieBlock === 'string' && confusionEspecieBlock.trim())
      ? `\n\n${confusionEspecieBlock}`
      : '';

    // GUARDA PLAGA VS ENFERMEDAD (chagra-pro #293, tercer driver de
    // contaminación cross-domain, sonda `pest_vs_disease` de
    // bench-contaminacion.mjs). El sidecar /pest-vs-disease-guard ya cruzó el
    // término mencionado (plaga/enfermedad) contra el catálogo Y la heurística
    // léxica/taxonómica, y armó el bloque de SUPRESIÓN-Y-REEMPLAZO cuando
    // ambas coinciden. '' (no-op) cuando no hubo término mencionado, hay
    // desacuerdo catálogo↔heurística (fail-safe a propósito), o el sidecar no
    // respondió (degradación graceful).
    const pestVsDiseaseSafetyBlock = (typeof pestVsDiseaseBlock === 'string' && pestVsDiseaseBlock.trim())
      ? `\n\n${pestVsDiseaseBlock}`
      : '';

    // MODO CIENTÍFICO (#17) — bloque answer/hedge/abstain ya formateado por
    // el sidecar (WIRING real de grounding-policy.ts/grounding-prompt-
    // formatter.ts). Va DENTRO del cluster de grounding (después de la cadena
    // relacional): cuando la política es "abstain" el LLM recibe la
    // instrucción explícita de NO inventar; "hedge" pide matizar; "answer" no
    // agrega instrucción (el grounding ya alcanza). '' (no-op) si el sidecar
    // no respondió — degradación graceful.
    const groundingPolicyContext = (typeof groundingPolicyBlock === 'string' && groundingPolicyBlock.trim())
      ? `\n\n${groundingPolicyBlock}`
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
      groundingPolicy: groundingPolicyContext,
      queryAnalysis: queryAnalysisBlock,
      suggested: suggestedBlock,
      priceDecline: priceDeclineBlock,
      fermento: fermentoSafetyBlock,
      biopreparado: biopreparadoSafetyBlock,
      pisoTermico: pisoTermicoSafetyBlock,
      confusionEspecie: confusionEspecieSafetyBlock,
      pestVsDisease: pestVsDiseaseSafetyBlock,
    });

    const messages = [
      { role: 'system', content: assembled.content },
      ...(spatialContextPin ? [{ role: 'system', content: spatialContextPin }] : []),
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
        const interruptErr = /** @type {Error & {interrupted: boolean, interruptReason: string}} */ (new Error('Inferencia interrumpida'));
        interruptErr.interrupted = true;
        interruptErr.interruptReason = cancelReasonRef.current || 'abort';
        throw interruptErr;
      }
      const match = e.message.match(/^LLM (\d+)/);
      if (match) {
        const status = parseInt(match[1], 10);
        if (status === 401 || status === 403) {
          throw new Error('La sesión se venció. Recarga la app para seguir.');
        }
        if (status >= 500 && status <= 503) {
          throw new Error('Chagra no puede responder ahora mismo. Intenta de nuevo en un momento.');
        }
        throw new Error(`Chagra no pudo responder (código ${status}). Intenta de nuevo.`);
      }
      throw new Error('Chagra no puede responder ahora mismo. Intenta de nuevo en un momento.');
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
    // Fase 1 del "pensando" visible: contexto + RAG + resolución de entidades.
    setThinkingPhase('entendiendo');
    setError('');
    agentSounds.start();

    // #5 COLA DURABLE — persistir el request ANTES de tocar el LLM. Si la app se
    // recarga / cierra a mitad de inferencia, el prompt queda 'queued' en
    // IndexedDB y se reanuda solo al reabrir (resumePending + drainPending). El
    // id se cierra al final del turno con finalizeRequest (telemetría) o
    // failRequest. enqueueRequest es no-throw: si IDB falla, devuelve null y el
    // pipeline sigue idéntico (degradación graceful, nunca bloquea la pregunta).
    const durableRoute = selectChatRoute(text.trim());
    durableRequestIdRef.current = await durableEnqueue({
      prompt: text.trim(),
      route: durableRoute,
      model: durableRoute,
    });

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
      const contextCorpus = await retrieve(textForLLM, TOP_N_RAG, 'agente');

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
      // BIOPREPARADOS (capa 1 GROUNDING, chagra-pro #248). Bloque de instrucción
      // ya formateado por el sidecar (/biopreparado-grounding) con la composición/
      // uso del catálogo + regla anti-negación. '' por default → no-op en el
      // system prompt si no hubo intención-biopreparado o el sidecar no respondió
      // (degradación graceful — FAIL-SAFE, no fabrica datos).
      let biopreparadoBlock = '';
      // GUARDA PISO TÉRMICO (chagra-pro #288, driver #1 de contaminación
      // cross-domain — sonda `cross_thermal` de bench-contaminacion.mjs, ~86.7%
      // medida 2026-07). Bloque de SUPRESIÓN-Y-REEMPLAZO ya formateado por el
      // sidecar (/piso-termico-guard) cuando la especie mencionada resulta
      // marginal/inviable para el piso térmico del usuario. '' por default →
      // no-op en el system prompt si el piso coincide, no hubo señal de piso
      // del usuario, o el sidecar no respondió (degradación graceful).
      let pisoTermicoBlock = '';
      // GUARDA CONFUSIÓN DE ESPECIE (chagra-pro #292, segundo driver de
      // contaminación cross-domain — sonda `confusion_especie` de
      // bench-contaminacion.mjs, ~20% medida 2026-07). Bloque de
      // SUPRESIÓN-Y-REEMPLAZO ya formateado por el sidecar
      // (/confusion-especie-guard) cuando la especie mencionada trae
      // advertencia curada o un look-alike de familia botánica distinta. ''
      // por default → no-op si no hay riesgo detectado o el sidecar no
      // respondió (degradación graceful).
      let confusionEspecieBlock = '';
      // GUARDA PLAGA VS ENFERMEDAD (chagra-pro #293, tercer driver de
      // contaminación cross-domain — sonda `pest_vs_disease` de
      // bench-contaminacion.mjs). Bloque de SUPRESIÓN-Y-REEMPLAZO ya
      // formateado por el sidecar (/pest-vs-disease-guard) cuando el término
      // mencionado tiene categoría confirmada (catálogo + heurística
      // coinciden). '' por default → no-op (degradación graceful, incluye el
      // caso de desacuerdo catálogo↔heurística — fail-safe a propósito).
      let pestVsDiseaseBlock = '';
      // MODO CIENTÍFICO (#17) — WIRING real de grounding-policy.ts/grounding-
      // prompt-formatter.ts (audit 2026-07-04-optimizacion-grounding-
      // velocidad-inteligencia.md win #4). El sidecar decide answer/hedge/
      // abstain sobre las entidades del turno (incluye CERO entidades →
      // abstain) y devuelve un bloque ya formateado + el semáforo verde/
      // ámbar/rojo. '' / null por default → no-op (degradación graceful, el
      // turno sigue sin este gate si el sidecar no respondió).
      let groundingPolicyBlock = '';
      let groundingDecisionMeta = null;
      // GraphRAG multi-hop (#1 intelligence-first): bloque "CADENA DE RELACIONES"
      // del grafo AGE para queries relacionales (plaga+cultivo). '' = no-op.
      let subgrafoBloque = '';
      if (isOnline && isSidecarEnabled()) {
        // Fase 2 del "pensando" visible: grounding real contra el sidecar
        // (entidades, guards, grafo, tools). Es el tramo más largo antes de
        // generar — mostrarlo evita la sensación de "se colgó".
        setThinkingPhase('consultando');
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
          // Piso térmico EXPLÍCITO del perfil (si el usuario lo declaró en su
          // ficha) — segunda prioridad del guard, detrás de finca_altitud
          // numérica. Sin esto, el guard igual funciona vía texto libre del
          // mensaje (degradación por diseño del sidecar).
          const rePisoTermico = (() => {
            try { const p = getProfile(); if (p && p.piso_termico) return p.piso_termico; } catch (_) { /* noop */ }
            return null;
          })();
          const tRE0 = performance.now();
          // SAFETY-CRITICAL en PARALELO: /fermento-prefilter,
          // /biopreparado-grounding, /piso-termico-guard,
          // /confusion-especie-guard y /pest-vs-disease-guard corren junto a
          // /resolve-entities (mismo turno, antes del LLM) — CERO latencia
          // serial añadida. Los seis wrappers son no-throw (devuelven null en
          // error/timeout), así que Promise.all no puede rechazar por ellos.
          const [resolved, fermento, biopreparado, pisoTermico, confusionEspecie, pestVsDisease] = await Promise.all([
            resolveEntities(textForLLM, { fincaAltitud: reAltitud, context: contextMemory }),
            fermentoPrefilter(textForLLM),
            biopreparadoGrounding(textForLLM),
            pisoTermicoGuard(textForLLM, { fincaAltitud: reAltitud, pisoTermico: rePisoTermico }),
            confusionEspecieGuard(textForLLM),
            pestVsDiseaseGuard(textForLLM),
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
          // BIOPREPARADOS: si el sidecar resolvió un biopreparado real contra el
          // catálogo MCP, inyectamos su bloque (composición/uso + anti-negación)
          // al final del system prompt (recency máxima). Si el sidecar no
          // respondió (null) o no hay biopreparado, biopreparadoBlock queda '' →
          // no-op, el turno sigue sin romperse (degradación graceful, FAIL-SAFE).
          if (biopreparado && biopreparado.has_biopreparado && typeof biopreparado.system_prompt_block === 'string' && biopreparado.system_prompt_block.trim()) {
            biopreparadoBlock = biopreparado.system_prompt_block;
            console.debug('[sidecar] biopreparado-grounding', {
              biopreparadoId: biopreparado.biopreparado_id,
              reason: biopreparado.reason,
            });
          }
          // PISO TÉRMICO: si el sidecar detectó un desajuste (especie
          // marginal/inviable para el piso del usuario), inyectamos su bloque
          // de SUPRESIÓN-Y-REEMPLAZO al final del system prompt (recency
          // máxima). Si el sidecar no respondió (null) o el piso coincide,
          // pisoTermicoBlock queda '' → no-op, el turno sigue sin romperse
          // (degradación graceful, FAIL-SAFE — nunca inventa un rango).
          if (pisoTermico && pisoTermico.has_mismatch && typeof pisoTermico.system_prompt_block === 'string' && pisoTermico.system_prompt_block.trim()) {
            pisoTermicoBlock = pisoTermico.system_prompt_block;
            console.debug('[sidecar] piso-termico-guard', {
              speciesId: pisoTermico.species_id,
              userPiso: pisoTermico.user_piso_termico,
              userPisoOrigen: pisoTermico.user_piso_origen,
              viabilidad: pisoTermico.viabilidad,
              reason: pisoTermico.reason,
            });
          }
          // CONFUSIÓN DE ESPECIE: si el sidecar detectó riesgo real (curado o
          // algorítmico) de confundir la familia botánica de la especie
          // mencionada, inyectamos su bloque de SUPRESIÓN-Y-REEMPLAZO al
          // final del system prompt (recency máxima). Si el sidecar no
          // respondió (null) o no hay riesgo, confusionEspecieBlock queda ''
          // → no-op, el turno sigue sin romperse (degradación graceful).
          if (confusionEspecie && confusionEspecie.has_confusion && typeof confusionEspecie.system_prompt_block === 'string' && confusionEspecie.system_prompt_block.trim()) {
            confusionEspecieBlock = confusionEspecie.system_prompt_block;
            console.debug('[sidecar] confusion-especie-guard', {
              speciesId: confusionEspecie.species_id,
              speciesMentioned: confusionEspecie.species_mentioned,
              confusionSource: confusionEspecie.confusion_source,
              lookalike: confusionEspecie.lookalike_nombre_comun,
              reason: confusionEspecie.reason,
            });
          }
          // PLAGA VS ENFERMEDAD: si el sidecar confirmó la categoría real
          // (catálogo + heurística coinciden) del término mencionado,
          // inyectamos su bloque de SUPRESIÓN-Y-REEMPLAZO al final del
          // system prompt (recency máxima). Si el sidecar no respondió
          // (null), no hubo término mencionado, o hay desacuerdo
          // catálogo↔heurística (fail-safe a propósito), pestVsDiseaseBlock
          // queda '' → no-op, el turno sigue sin romperse.
          if (pestVsDisease && pestVsDisease.has_classification && typeof pestVsDisease.system_prompt_block === 'string' && pestVsDisease.system_prompt_block.trim()) {
            pestVsDiseaseBlock = pestVsDisease.system_prompt_block;
            console.debug('[sidecar] pest-vs-disease-guard', {
              speciesId: pestVsDisease.species_id,
              termMentioned: pestVsDisease.term_mentioned,
              termCategoria: pestVsDisease.term_categoria,
              manejoEquivocadoDetectado: pestVsDisease.manejo_equivocado_detectado,
              reason: pestVsDisease.reason,
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

          // MODO CIENTÍFICO (#17) — semáforo de confianza + política real
          // answer/hedge/abstain. Gate INDEPENDIENTE del bloque de arriba (no
          // anidado en `resolved.entities.length > 0`): el caso de CERO
          // entidades es exactamente el que debe producir `abstain`/rojo. El
          // sidecar ya corrió `decideGroundingPolicy`/`formatGroundingBlock`
          // de verdad (grounding-wire.ts) — aquí solo consumimos el bloque
          // pre-formateado, igual que fermento/biopreparado.
          if (resolved && resolved.grounding && typeof resolved.grounding.block === 'string' && resolved.grounding.block.trim()) {
            groundingPolicyBlock = resolved.grounding.block;
            groundingDecisionMeta = resolved.grounding;
            console.debug('[sidecar] grounding-policy', {
              policy: resolved.grounding.policy,
              semaphore: resolved.grounding.semaphore,
              resolvedEntities: resolved.grounding.resolved_entities,
              minConfidence: resolved.grounding.min_confidence,
            });
          }

          // GraphRAG multi-hop: si hay plaga y/o cultivo resueltos, traemos del
          // grafo AGE la CADENA de relaciones (cultivo→plaga→controladores/
          // biopreparados + asocios) e inyectamos el bloque al grounding.
          // Tambien invocamos get_multihop_companions (AIA-008): cadenas de N
          // saltos de asociacion ecologica (companeras que controlan plagas).
          // Ambas tools son sub-segundo y no-throw; si no hay dato, no-op.
          const pestEnt = (resolvedEntities || []).find((e) => ['pest', 'plaga'].includes(e.kind));
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
            // PASO 2-pre0 — routing determinístico de PRECIO/MERCADO (fix
            // misroute "papa precio", 2026-07-05). MÁXIMA PRIORIDAD: corre
            // ANTES de planKnowledgeIntent (que podría atrapar "variedad"/
            // "cultivar" en el mismo mensaje) y antes del planner NLU del
            // sidecar (LLM chico, misroutea a ficha/viabilidad — bug
            // histórico documentado en chipIntentRouter.js). Garantiza que
            // TODA consulta de precio ejecute get_precio_sipsa (dato vivo de
            // la tabla chagra.sipsa_precios, NUNCA la tabla estática
            // precioReferencia.js). Se inyecta available:false SINTÉTICO si
            // el tool no respondió (sidecar caído): el turno sigue siendo de
            // precio, nunca cae a viabilidad/variedades por accidente.
            // Aguas abajo, buildPriceAnswer (available:true) o
            // buildPriceDeclineContext (available:false) deciden la
            // respuesta — ambos ya groundeados y anti-alucinación.
            try {
              const mPlan = planMarketIntent(textForLLM, resolvedEntities);
              if (mPlan && mPlan.tool) {
                const tM0 = performance.now();
                const mResult = await callTool(mPlan.tool, mPlan.args);
                const tM1 = performance.now();
                toolEvidence = {
                  tool: mPlan.tool,
                  args: mPlan.args,
                  result: mResult || {
                    available: false,
                    reason: 'sin_respuesta',
                    hint: 'la herramienta de precios no respondió — declinar honesto (SIPSA/DANE/Corabastos), NO inventar un precio',
                  },
                };
                nluRoute = `precio:${mPlan.source}`;
                console.debug('[sidecar] precio/mercado (NLU saltado)', {
                  tool: mPlan.tool,
                  producto: mPlan.args.producto,
                  source: mPlan.source,
                  available: mResult ? mResult.available : false,
                  latencyTool: Math.round(tM1 - tM0),
                });
              }
            } catch (_) { /* graceful: sigue el flujo de conocimiento/NLU normal */ }

            if (!toolEvidence) try {
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
            // Modulos DR dormidos (Task 4, audit ministerio): wirear suelo,
            // agua, animal, restauracion + carbono/PSA al grounding. Cada modulo
            // es cliente-side, usa datos del DR consolidado, y sus guardas
            // anti-mito afloran en la respuesta del agente.
            if (!toolEvidence) {
              const modules = /** @type {Array<[Function, () => Promise<any>, string, string]>} */ ([
                [hasSoilDiagnosticIntent, () => import('../../services/soilDiagnostic'), 'soil_diagnostic', 'suelo'],
              ]);
              // Agua, animal, restauracion, riesgo-incendio si el intent matcher existe
              try {
                const { hasWaterDiagnosticIntent, hasAnimalDiagnosticIntent, hasRestauracionDiagnosticIntent, hasIncendioRiskIntent } = await import('../../services/knowledgeIntentRouter');
                if (hasWaterDiagnosticIntent) modules.push([hasWaterDiagnosticIntent, async () => { const m = await import('../../services/waterDiagnostic'); return { diagnosticar: m.diagnosticarAgua, formatear: m.formatearGroundingAgua }; }, 'water_diagnostic', 'agua']);
                if (hasAnimalDiagnosticIntent) modules.push([hasAnimalDiagnosticIntent, async () => { const m = await import('../../services/animalDiagnostic'); return { diagnosticar: m.diagnosticarAnimal, formatear: m.formatearGroundingAnimal }; }, 'animal_diagnostic', 'animal']);
                if (hasRestauracionDiagnosticIntent) modules.push([hasRestauracionDiagnosticIntent, async () => { const m = await import('../../services/restauracionDiagnostic'); return { diagnosticar: m.diagnosticarRestauracion, formatear: m.formatearGroundingRestauracion }; }, 'restauracion_diagnostic', 'restauracion']);
                // Riesgo de incendio (estimación ENSO + temporada seca; cero
                // fabricación, NO alerta oficial). El servicio deriva la región
                // del perfil y usa la altitud para corregir piso (Galeras/Nariño).
                if (hasIncendioRiskIntent) modules.push([hasIncendioRiskIntent, async () => { const m = await import('../../services/incendioRiskService'); return { diagnosticar: (_t, o) => ({ ...m.evaluarRiesgoIncendio({ altitud: o?.altitud ?? null }), sin_datos: false }), formatear: (d) => m.formatIncendioContext(d) }; }, 'incendio_riesgo', 'incendio']);
              } catch (_) { /* graceful */ }
              // Carbono/PSA (Task 3): detectarAlertaCarbono
              modules.push([
                (text) => /\b(bonos?\s+carbono|pagar\s+por\s+sembrar|carbono\b.*\bpagar|PSA|Decreto\s+1007)\b/i.test(text),
                async () => { const c = await import('../../services/carbonoAlerta'); return { diagnosticar: (t) => c.detectarAlertaCarbono(t), formatear: (d) => d ? `ALERTA BONOS DE CARBONO: ${d.alerta}\n\nTrampas:\n${d.trampas.map((t) => `- ${t.nombre}: ${t.riesgo}`).join('\n')}\n\nRecomendacion: ${d.recomendacion}` : '' }; },
                'carbono_alerta', 'carbono',
              ]);
              // Altitud del perfil de finca activa → el grounding de restauración
              // elige especies nativas REALES del piso térmico (anti-fabricación).
              const restAltitud = fincas?.find((f) => f.slug === activeFincaSlug)?.altitud ?? null;
              for (const [hasIntent, loadMod, tool, label] of modules) {
                if (hasIntent(textForLLM)) {
                  try {
                    const mod = /** @type {{diagnosticar: Function, formatear: Function}} */ (await loadMod());
                    const diag = mod.diagnosticar(textForLLM, { altitud: restAltitud });
                    if (diag && (diag.sin_datos === false || diag.alerta)) {
                      const bloque = mod.formatear(diag);
                      if (bloque) {
                        toolEvidence = { tool, args: { query: textForLLM }, result: { found: true, bloque } };
                        nluRoute = `${label}:diagnostico`;
                      }
                    }
                  } catch (_) { /* graceful */ }
                  break;
                }
              }
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
            if (forcedPlan && forcedPlan.localGrounding === 'precio_referencia') {
              const priceMsg = buildPriceReferenceAnswer(forcedPlan.args?.producto || textForLLM);
              if (priceMsg) {
                const userMessage = { role: 'user', content: text.trim(), timestamp: Date.now() };
                const assistantMessage = {
                  role: 'assistant',
                  content: priceMsg,
                  timestamp: Date.now(),
                };
                setMessages((prev) => [...prev, userMessage, assistantMessage]);
                try {
                  await addTurn(operatorId, { role: 'user', content: text.trim() });
                  await addTurn(operatorId, { role: 'assistant', content: priceMsg });
                } catch (e) {
                  console.warn('[Agent] precio addTurn failed (continuo):', e?.message);
                }
                setActiveIntent(null);
                return;
              }
            } else if (forcedPlan && forcedPlan.localGrounding === 'incendio') {
              // Riesgo de incendio: estimación client-side (NO tool sidecar, NO
              // API de alerta en tiempo real). Calculamos el bloque honesto y lo
              // inyectamos como evidence; el LLM lo presenta como estimación.
              try {
                const m = await import('../../services/incendioRiskService');
                const r = m.evaluarRiesgoIncendio({ altitud: forcedPlan.args?.altitud ?? fincaAltitudChip ?? null });
                const bloque = m.formatIncendioContext(r);
                toolEvidence = { tool: 'riesgo_incendio', args: forcedPlan.args || {}, result: { found: true, bloque, nivel: r.nivel, es_estimacion: true } };
                nluRoute = `chip:${forcedIntent}:riesgo_incendio`;
              } catch (_) { /* graceful: cae al flujo generativo con RAG */ }
            } else if (forcedPlan && forcedPlan.tool) {
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
          } else if (plan?.useTool && plan.tool && plan.args && !isToolAllowed(plan.tool)) {
            // GUARD ALLOW-LIST + DEFLECCIÓN HONESTA (fix grounding P0 2026-06-25,
            // amplía #1848). El NLU planner conoce 41 tools; el cliente expone un
            // subconjunto (ver ALLOWED_TOOLS en sidecarClient). Si el planner
            // rutea a una NO expuesta, `callTool` la rechazaría con
            // `{_error, reason:'not_allowed'}`, indistinguible de un fallo
            // transitorio de red — y el turno degradaba a RAG SIN grounding y SIN
            // avisar al usuario (degradación SILENCIOSA).
            //
            // Las tools que QUEDAN fuera del allow-list son las que el NLU no
            // puede rellenar desde una frase de chat (exigen credenciales farmOS,
            // coords de dispositivo o NIT DIAN: add_planta_finca, get_finca_overview,
            // get_sensor_finca, get_weather_data, get_clima_finca,
            // get_documento_soporte_dian, get_ubicacion_actual) o cuyo arg
            // obligatorio el planner no conoce (altitud de la finca para
            // get_cultivos_viables / get_diseno_finca; fecha de siembra para
            // get_grado_dia; biopreparado_id/pest_id para get_dosis_biopreparado).
            //
            // En vez de degradar callado a RAG, inyectamos una DEFLECCIÓN HONESTA
            // (lección "deflección honesta": el agente dice claro que esa consulta
            // todavía NO está disponible, found:false explícito, NO inventa). El
            // bloque lo materializa formatToolEvidence (rama available:false).
            nluRoute = `nlu:not_allowed:${plan.tool}`;
            toolEvidence = {
              tool: plan.tool,
              args: plan.args,
              result: {
                available: false,
                reason: 'tool_no_disponible_en_cliente',
                hint:
                  'Esta consulta específica todavía NO está disponible en Chagra. ' +
                  'NO inventes datos: dilo con honestidad ("esa información todavía no la tengo disponible") ' +
                  'y, si puedes, orienta con lo que SÍ está a la mano (chips de siembra, plaga, ' +
                  'biopreparado, clima, calendario) o pide el dato que falte.',
              },
            };
            console.warn('[sidecar] NLU ruteó a tool NO expuesta por el cliente — deflección honesta (sin callTool)', {
              tool: plan.tool,
              latencyNlu: Math.round(tNlu1 - tNlu0),
              reason: 'tool_not_in_client_allowlist',
            });
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
      } else {
        // GROUNDING OFFLINE del grafo (#49). Sin red el bloque online de arriba
        // no corre y el agente perdía TODAS las relaciones del grafo (el "87%
        // invisible offline"). Aquí resolvemos la especie del query SIN red
        // (resolveSpecies = catalogDB + BM25 local) y armamos el bloque de
        // relaciones desde el export precacheado (grafo-relations.json).
        // Best-effort y no-throw: si no resuelve o no hay datos, '' → no-op.
        try {
          const off = await resolveSpecies(textForLLM);
          if (off && off.slug) {
            const bloque = await buildOfflineGroundingBlock(off.slug);
            if (bloque) {
              subgrafoBloque = [subgrafoBloque, bloque].filter(Boolean).join('\n\n');
              nluRoute = 'offline:grafo-relations';
              console.debug('[grafo] grounding offline inyectado', {
                slug: off.slug, match: off.match,
              });
            }
          }
        } catch (offErr) {
          console.debug('[grafo] grounding offline falló (sigo RAG-only):', offErr?.message);
        }
      }

      // TOP_N_EDGES: truncar aristas del grafo a las 12 más relevantes
      // (el sidecar las ordena por relevancia). No-op si el bloque no excede.
      const edgesTruncated = truncateEdgesBlock(subgrafoBloque);

      // ESCENA DE PRECIO (demo campesino): si la consulta es de PRECIO y
      // get_precio_sipsa devolvió un dato REAL (available:true, leído de la
      // tabla `chagra.sipsa_precios` que llena el feed diario DANE/SIPSA), el
      // agente CANTA el número de forma DETERMINISTA en vez de delegar en el LLM
      // —que lo entierra en agronomía genérica o lo razona mal—. Anti-alucinación:
      // buildPriceAnswer SOLO emite con un precio numérico real; sin dato →
      // null → caemos al LLM (que recibe el decline block honesto). El texto
      // sigue pasando por voseo/guards/badges/persistencia/TTS como cualquier
      // respuesta, por lo que la UX (badge de fuente, voz) no cambia.
      const deterministicPrice = buildPriceAnswer({ userMessage: text, toolEvidence });
      const rawResponse = deterministicPrice != null
        ? deterministicPrice
        : await callLLM(textForLLM, contextMemory, contextCorpus, toolEvidence, resolvedEntities, suggestedEntities, fermentoBlock, edgesTruncated, biopreparadoBlock, pisoTermicoBlock, confusionEspecieBlock, pestVsDiseaseBlock, groundingPolicyBlock);
      if (deterministicPrice != null) {
        console.debug('[precio] respuesta determinista SIPSA (sin LLM)', { route: nluRoute });
      }
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
      let responseBody = guarded.text;
      let responseAutoCorrected = guarded.modified === true;
      // GUARDA POST-LLM de companion species: valida la respuesta ya generada
      // contra el catalogo. Si dispara, anteponemos el bloque de correccion al
      // turno final sin romper el flujo si el sidecar falla.
      if (isOnline && isSidecarEnabled()) {
        try {
          const companionSpecies = await companionSpeciesGuard(responseBody);
          if (companionSpecies && typeof companionSpecies.system_prompt_block === 'string' && companionSpecies.system_prompt_block.trim()) {
            responseBody = prependCorrectionBlock(responseBody, companionSpecies.system_prompt_block);
            responseAutoCorrected = true;
            console.debug('[sidecar] companion-species-guard', {
              hasCompanionSpecies: companionSpecies.has_companion_species,
              reason: companionSpecies.reason,
            });
          }
        } catch (companionErr) {
          console.debug('[sidecar] companion-species-guard fail (sigo sin bloque):', companionErr?.message);
        }
      }
      agentSounds.chime();

      const { intent } = parseIntent(text);

      // 2026-05-23: badge de "fuente" — persistimos en metadata si el turno
      // del assistant fue grounded contra el catálogo (tool MCP devolvió
      // match) o fue solo generativo del LLM. ChatBubble lee este metadata
      // para renderizar el badge verde/amber/gris (ver computeSourceMetadata).
      /** @type {any} */
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
      // MODO CIENTÍFICO (#17) — semáforo verde/ámbar/rojo + política real del
      // turno (WIRING de grounding-policy.ts vía el sidecar), expuesto en la
      // metadata del mensaje para que una futura UI (badge de confianza) lo
      // pinte SIN volver a calcularlo — el semáforo es 1:1 con lo que el
      // agente ya decidió. Graceful: sin decisión del sidecar → no añade nada
      // (no contamina sourceMetadata con null).
      //
      // Bug A6 (auditoría IA 2026-07-08): un saludo puro ("hola chagra")
      // salía con semáforo ROJO "Sin verificar — se lo decimos de frente".
      // Es correcto que el sidecar diga abstain (cero entidades), pero un
      // turno puramente conversacional NO es un dato que verificar: marcarlo
      // rojo igual que un dato dudoso vacía de significado el semáforo. Para
      // saludos/smalltalk (mismo criterio esSaludoPuro de la deflección NLU)
      // NO adjuntamos la metadata del semáforo → la UI no pinta semáforo
      // (estado neutro), igual que un turno sin señal de grounding.
      const groundingSemaphoreMeta = groundingDecisionMeta && !esSaludoPuro(text)
        ? {
            grounding_semaphore: groundingDecisionMeta.semaphore,
            grounding_policy: groundingDecisionMeta.policy,
            grounding_reason: groundingDecisionMeta.reason,
            // PANEL DE PROCEDENCIA (lever moat anti-alucinación visible):
            // la procedencia POR-AFIRMACIÓN [{entity_id, confidence, source,
            // validation_level}] que el sidecar ya computa viaja completa en
            // la metadata del turno — el ChatBubble la pinta como semáforo de
            // confianza + panel expandible (SemaforoConfianza.jsx) sin volver
            // a pedir nada. Serializable (JSON plano) → persiste en historial.
            grounding_provenance: Array.isArray(groundingDecisionMeta.provenance)
              ? groundingDecisionMeta.provenance
              : [],
          }
        : {};
      sourceMetadata = /** @type {any} */ ({
        ...sourceMetadata,
        ...evidenceSourceLink,
        ...groundingBadges,
        ...groundingSemaphoreMeta,
        auto_corrected: responseAutoCorrected,
      });
      const profileMode = (() => {
        try {
          return getProfile()?.nivel_respuestas || '';
        } catch (_) {
          return '';
        }
      })();
      const response = appendScientificFooter(responseBody, {
        mode: profileMode,
        metadata: sourceMetadata,
      });

      // AFFECTS-GATE (auditoría anti-contaminación cruzada de cultivo, 2026-07):
      // el sello "Catálogo verificado" NO debe pintarse cuando la evidencia
      // surfacea un organismo (plaga) que NO afecta al cultivo EN FOCO. Caso
      // confirmado: BROCA (plaga de CAFÉ, Hypothenemus hampei) mostrada como
      // "Dato verificado" en una conversación de CACAO — verificado ≠ relevante.
      // La arista AFFECTS ya viaja en la evidencia (get_pest_controllers →
      // target_species) y en el índice offline del grafo (_pest_index); esto es
      // SOLO la comprobación (wiring), no grounding nuevo. Suppress-and-replace
      // del SELLO: grounded→false + marca explícita cross_crop (el ChatBubble
      // pinta "Dato de otro cultivo · verifica"). Solo corre sobre turnos que
      // IBAN a salir verificados. Graceful: cualquier fallo deja el sello
      // intacto (jamás degrada por error).
      if (sourceMetadata && sourceMetadata.grounded === true) {
        try {
          const cropInFocusIds = Array.from(new Set(
            (resolvedEntities || [])
              .filter((e) => e && ['cultivo', 'especie', 'species', 'planta'].includes(e.kind))
              .map((e) => e.canonical_id)
              .filter((id) => typeof id === 'string' && id.trim().length > 0)
          ));
          if (cropInFocusIds.length > 0) {
            const [pestIndex, pestSynonyms] = await Promise.all([getPestIndex(), getPestSynonyms()]);
            const maps = { pestIndex, pestSynonyms };
            const pestAffectsList = [
              ...extractAffectsFromEvidence(toolEvidence),
              ...(resolvedEntities || [])
                .filter((e) => e && (['pest', 'plaga'].includes(e.kind)))
                .map((e) => resolvePestAffects(e.canonical_id || e.mentioned, maps))
                .filter(Boolean),
              ...scanTextForPestAffects(responseBody, maps),
            ];
            const gateResult = detectCrossCropContamination({ cropInFocusIds, pestAffectsList });
            if (gateResult.crossCrop) {
              sourceMetadata = gateSourceMetadataByAffects(sourceMetadata, gateResult, { cropInFocusIds });
              console.debug('[affects-gate] cross-crop → sello degradado', {
                cropInFocusIds,
                organismos: gateResult.offending.map((o) => o.pest),
              });
            }
          }
        } catch (gErr) {
          // El gate jamás bloquea el chat: si algo falla, el sello queda como estaba.
          console.debug('[affects-gate] no aplicado (sigo con el sello original):', gErr?.message);
        }
      }

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
            const pv = await postValidate(responseBody, expected);
            sourceMetadata = /** @type {any} */ (mergePostValidateMetadata(sourceMetadata, pv));
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

      // AGENTE GUIADO (auditoría UX §7.4 P3): ofrecer un insight verificado
      // proactivo DENTRO de la conversación. Detectamos el cultivo en el texto
      // del turno (pregunta del usuario + respuesta del agente) y elegimos un
      // dato con fuente que el usuario aún no ha visto en esta sesión. Si no hay
      // cultivo o ya se ofrecieron todos, no se adjunta nada (sin regresión).
      // La OFERTA es opt-in: la tarjeta en el chat pide confirmación antes de
      // expandir el dato. Funciones puras (detectarSlugEnTexto/elegirInsight).
      let insightProactivo = null;
      try {
        const textoTurno = `${text || ''} ${responseBody || ''}`;
        const slug = detectarSlugEnTexto(textoTurno);
        if (slug) {
          const candidato = elegirInsight(slug, insightsVistosRef.current);
          if (candidato && candidato.id) {
            insightProactivo = candidato;
            insightsVistosRef.current = [...insightsVistosRef.current, candidato.id];
          }
        }
      } catch (e) {
        // El insight es secundario: jamás debe romper la respuesta del agente.
        console.warn('[Agent] insight proactivo no disponible (continuo):', e?.message);
      }

      const assistantMessage = {
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        metadata: sourceMetadata,
        _edges: turnEdges,
        ...(insightProactivo ? { _insightProactivo: insightProactivo } : {}),
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
            ? resolvedEntities.map((/** @type {any} */ e) => e?.canonical_id || e?.id || e?.mentioned).filter(Boolean)
            : [],
          guards_fired: guarded.modified ? guarded.reasons || [] : [],
          grounded_status: (/** @type {any} */ (sourceMetadata))?.source || (/** @type {any} */ (sourceMetadata))?.grounded_status || null,
          latency_ms: Math.round(performance.now() - pipelineStartedAt),
          model: selectChatRoute(textForLLM),
          eval_rate: currentLlmStats?.eval_rate ?? null,
          first_token_ms: currentLlmStats?.first_token_ms ?? null,
          response_len: currentLlmStats?.response_len ?? null,
        },
      });
      setMessages((prev) => [...prev, assistantMessage]);

      // #5 COLA DURABLE — cerrar el registro de este turno con telemetría rica.
      // Reusamos lo YA computado por el pipeline (cero coste extra): respuesta,
      // grounding (entidades AGE resueltas + tools + RAG chunks + estado), y las
      // latencias del llmStatsRef. Marca status='done' en IndexedDB; queda como
      // evidencia para debuggear inteligencia+velocidad y confirma que la
      // pregunta NO se perdió. No-throw: si falla, el chat ya respondió.
      if (durableRequestIdRef.current != null) {
        durableFinalize({
          id: durableRequestIdRef.current,
          result: {
            response,
            latency: { t_first_token_ms: currentLlmStats?.first_token_ms ?? null },
            grounding: {
              entities: Array.isArray(resolvedEntities)
                ? resolvedEntities.map((/** @type {any} */ e) => e?.canonical_id || e?.id || e?.mentioned).filter(Boolean)
                : [],
              tools: Array.isArray(toolEvidence)
                ? toolEvidence.map((/** @type {any} */ t) => t?.tool || t?.name).filter(Boolean)
                : [],
              rag_chunks: Array.isArray(contextCorpus) ? contextCorpus.length : 0,
              nlu_route: nluRoute || durableRoute,
              grounded_status: sourceMetadata?.source || sourceMetadata?.grounded_status || 'none',
            },
            tokens_out: currentLlmStats?.response_len
              ? Math.max(1, Math.round(currentLlmStats.response_len / 4))
              : null,
          },
        }).catch(() => { /* no-op: el turno ya se mostró */ });
        durableRequestIdRef.current = null;
      }

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
          // (3-23s) a "esperar primera frase" (<2s). Sin rate hardcodeado:
          // hereda la velocidad preferida del operador (getPreferredRate).
          speakSentences(responseBody)
            .then((ok) => { if (!ok) warnIfMute(); })
            .catch(() => warnIfMute());
        } else {
          const utterance = speak(responseBody, { rate: 0.9, pitch: 1.0 });
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
          llm_response: responseBody,
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
        // #5 COLA DURABLE en interrupción:
        //   - timeout/abort → el sistema reintenta SOLO. Dejamos el registro en
        //     'queued' (enqueueRequest nunca lo movió de ahí) para que
        //     drainPending lo reanude headless al volver / al re-montar. Por eso
        //     NO lo marcamos failed: re-queue implícito = cero pérdida.
        //   - cancel → el operador eligió parar; NO auto-reintentamos. Cerramos
        //     el registro como failed para que no se reanude por la espalda.
        if (e.interruptReason === 'cancel' && durableRequestIdRef.current != null) {
          durableFail({ id: durableRequestIdRef.current, error: 'cancelado por el operador' })
            .catch(() => {});
          durableRequestIdRef.current = null;
        }
        // (timeout/abort: dejamos durableRequestIdRef.current intacto en IDB como
        // 'queued'; solo soltamos la ref local en el finally.)
      } else {
        // NUNCA e.message crudo al banner ("Failed to fetch", stacktraces):
        // mensajeErrorCampesino respeta frases ya curadas y traduce lo técnico.
        setError(mensajeErrorCampesino(e, 'No pude con esa pregunta. Intente de nuevo, o pregunte de otra forma.'));
        // Error NO-interrupción (HTTP 5xx, sesión, etc.): marcar failed. El
        // prompt queda intacto en IDB; la cola durable NO lo reintenta (no es
        // recuperable solo con reintentar), pero NO se pierde el dato.
        if (durableRequestIdRef.current != null) {
          durableFail({ id: durableRequestIdRef.current, error: e })
            .catch(() => {});
          durableRequestIdRef.current = null;
        }
      }
    } finally {
      setState(STATE_IDLE);
      setStreamingContent('');
      streamingContentRef.current = '';
      cancelReasonRef.current = null;
      // Soltar la ref local del turno (el estado durable ya quedó en IDB:
      // 'done' si finalizó, 'queued' si timeout/abort → auto-reanuda, 'failed'
      // si cancel/error no-interrupción).
      durableRequestIdRef.current = null;
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

  // AGENTE GUIADO: descartar la oferta de insight proactivo de un turno ("Ahora
  // no"). ChatHistory pasa la clave del mensaje (id o índice de render). Quitamos
  // el flag _insightProactivo de ese mensaje para que la tarjeta desaparezca sin
  // tocar el resto de la conversación.
  const handleDismissInsight = useCallback((key) => {
    setMessages((prev) =>
      prev.map((m, i) =>
        (m.id != null ? m.id === key : i === key) && m._insightProactivo
          ? (() => { const { _insightProactivo, ...rest } = m; void _insightProactivo; return rest; })()
          : m,
      ),
    );
  }, []);

  const handleSubmit = async (text, { fromVoice = false, suppressUserBubble = false, visionContext = null, forcedIntent = null } = {}) => {
    if (!text || !text.trim()) return;
    const trimmed = text.trim();

    // DEEP RESEARCH (A6/A7): path LIVE del job async del sidecar, gateado por
    // VITE_DEEP_RESEARCH_ENABLED + online. B14: mientras la feature no esté
    // servible en prod, 'deep' es kind:'stub' en el manifiesto, así que
    // isDeepResearchIntent('deep') es false y este branch NO se dispara vía chip
    // — la pregunta cae al stub honesto de abajo.
    // El branch se conserva intacto: reactivar es volver 'deep' a kind:'deep' en
    // agentCapabilities.js cuando el backend esté live (sin tocar este flujo).
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

    // CHIPS DE MODO — STUB (A3): solo los chips sin backend van por aquí.
    // No routeamos a un tool fantasma ni gastamos una inferencia del LLM:
    // pintamos la pregunta del usuario + una respuesta honesta "aún no
    // disponible" y salimos.
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

    // «CHAGRA ENSEÑA A USAR CHAGRA» (ayuda groundeada) — solo texto libre (sin
    // chip, sin foto). Si el usuario pregunta CÓMO usar una función, QUÉ puede
    // hacer Chagra o DÓNDE ve algo, respondemos DESDE el manifiesto de ayuda
    // (determinístico, sin LLM): nunca inventa una función que no existe y de
    // paso evita el misroute meta→get_species → «el catálogo no tiene esa
    // especie». Adjuntamos la acción de deep-link para el botón «Abrir …».
    if (!forcedIntent && !visionContext && !suppressUserBubble) {
      const meta = detectMetaAyudaIntent(trimmed);
      if (meta.isMeta) {
        const resp = buildAyudaResponse(meta);
        if (resp && resp.content) {
          const userMessage = { role: 'user', content: trimmed, timestamp: Date.now() };
          const assistantMessage = {
            role: 'assistant',
            content: resp.content,
            timestamp: Date.now(),
            ...(resp.ayudaAction ? { _ayudaAction: resp.ayudaAction } : {}),
          };
          setMessages((prev) => [...prev, userMessage, assistantMessage]);
          try {
            await addTurn(operatorId, { role: 'user', content: trimmed });
            await addTurn(operatorId, { role: 'assistant', content: resp.content });
          } catch (e) {
            console.warn('[Agent] ayuda addTurn failed (continuo):', e?.message);
          }
          setActiveIntent(null);
          return;
        }
      }
    }

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
        setError('No alcancé a escucharte. Intenta grabar de nuevo.');
        return;
      }
      const { blob } = result;
      setState(STATE_THINKING);
      // Fase de voz: transcripción Whisper antes de entrar al pipeline de
      // texto (que setea sus propias fases al arrancar).
      setThinkingPhase('transcribiendo');

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

  // Pick de una rama de la MANO (AgentRedMenu) en la conversación. Routing
  // ÚNICO compartido con el home (mapCapabilityPick): `ask` → pregunta directa,
  // `nav` → navegar a otra vista, `photo` → abrir la cámara. soon/down/
  // unavailable ya los bloquea AgentRedMenu antes de llegar acá.
  const handleManoPick = (cap) => {
    const acted = mapCapabilityPick(cap, {
      onAsk: (prompt) => {
        if (!prompt) return;
        setActiveIntent(null);
        setAlertContextBanner(null);
        handleSubmit(prompt);
      },
      onNav: (view) => {
        if (!view) return;
        try { agentSounds.start(); } catch { /* sonido opcional */ }
        if (onNavigate) onNavigate(view);
      },
      onPhoto: () => cameraInputAgentRef.current?.click(),
    });
    // Tras cualquier acción (o no-op de capacidad por lanzar) cerramos la mano.
    if (acted) setSheetOpen(false);
  };

  // Deep-link de una tarjeta de AYUDA («Abrir …» / «Preguntar: …»): navega a la
  // vista con el MISMO mecanismo de la mano (onNavigate → HASH_VIEW_ROUTES) o,
  // para capacidades tipo `ask`, siembra la pregunta insignia en el chat.
  const handleAyudaAction = (action) => {
    if (!action) return;
    if (action.tipo === 'nav' && action.view) {
      try { agentSounds.start(); } catch { /* sonido opcional */ }
      if (onNavigate) onNavigate(action.view);
    } else if (action.tipo === 'ask' && action.prompt) {
      handleSubmit(action.prompt);
    }
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
  // V3: la def completa alimenta también el disparador de la mochila (que
  // muestra emoji + etiqueta del modo activo).
  const activeChipDef = activeIntent
    ? (CHIP_DEFS.find((c) => c.intent === activeIntent) || null)
    : null;
  const activePlaceholder = activeChipDef?.placeholder || 'Escribe tu pregunta...';

  // PIEL POR TEMA del botón enviar (Fase 2 de temas). Con la flag ON y el botón
  // habilitado (hay texto/adjunto y no se está grabando ni hay cola), aplicamos
  // `.agent-send-accent` para que themes.css lo pinte con el acento del tema
  // activo (teal/ocre/verde), igual que AgentHero. Con la flag OFF (prod) queda
  // EXACTO como hoy: el gradiente teal→cian fijo del compositor.
  const enviarHabilitado =
    !((!inputText.trim() && !agentAttachment) || state === STATE_RECORDING || queuePending.length >= 1);
  const agentSendAccent = fincaVivaHomePerfilActivo() && enviarHabilitado;

  // REINVENCIÓN "organismo que conversa": el estado del agente DIRIGE la escena
  // viva de fondo (respira / anillos que contraen al escuchar / doble latido al
  // pensar / ondas que emanan al hablar). Una sola fuente de verdad para el
  // fondo Y el nameplate del header — el organismo y la palabra laten juntos.
  const presenceState =
    state === STATE_RECORDING ? 'listening'
      : state === STATE_THINKING ? 'thinking'
        : isVoicePlaying ? 'speaking'
          : 'idle';
  // biopunk/biopunk2 comparten piel base (sin data-theme); `auto` se resuelve a
  // nature/biopunk2 con la MISMA regla del home (resolveAutoTheme). La escena se
  // elige con el tema EFECTIVO — así el organismo del agente y la escena del home
  // hablan el mismo idioma visual.
  const sceneTheme = resolveAutoTheme(theme);

  return (
    <div className={`h-[100dvh] flex flex-col overflow-hidden relative text-white ${entranceClassRef.current}`}>
      {/* ORGANISMO QUE CONVERSA — el fondo del chat es un mundo vivo por tema que
          respira y reacciona al estado del agente. Reemplaza al rectángulo plano
          con velo (`.agent-scrim`): cubre la foto del body con su propio
          gradiente opaco, y los mensajes van sobre superficies opacas (.v3-card)
          legibles al sol. Respeta prefers-reduced-motion (estado quieto digno). */}
      <AgentLivingScene theme={sceneTheme} state={presenceState} />
      {/* B1: animación de entrada (fade+rise). Respeta prefers-reduced-motion. */}
      <style>{AGENT_ENTRANCE_CSS}{AGENT_COMPOSITOR_CSS}{AGENT_V3_CSS}</style>

      {/* ── Header estilo ScreenShell (2026-06-08): superficie OPACA por token
          (.agent-bar-surface) + acciones globales. Antes bg-slate-900/50 dejaba
          pasar la foto detrás del título y los íconos (fix legibilidad 2026-06-15). ── */}
      {/* Bug visual Vi3 (auditoría IA 2026-07-08): en 320px los 6 controles de
          44px + gaps + padding sumaban más que el viewport → el título se
          encimaba con los íconos y el avatar pisaba el texto; en 412px el
          subtítulo se clipaba sin gracia. Fix: padding/gap compactos bajo
          400px, botón Home oculto bajo 420px (Volver sigue presente; QA temas
          2026-07-09: en 390px el Home dejaba el título en "Chag…"), avatar
          shrink-0 y subtítulo con truncate (elipsis, nunca encimado). */}
      <header className="px-2 min-[400px]:px-4 py-3 flex items-center gap-1 min-[400px]:gap-2 border-b border-slate-800 agent-bar-surface shrink-0">
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
          className="max-[419px]:hidden p-3 rounded-full bg-slate-800 hover:bg-emerald-700/40 hover:text-emerald-200 active:bg-emerald-700/60 transition-all text-emerald-400 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          aria-label="Volver al inicio"
          title="Inicio"
        >
          <Home size={20} />
        </button>
        {/* Avatar + título. 2026-07-16: iba directo a la foto del colibrí
            saltándose el wrapper — ahora respeta la preferencia (default
            Angelita, "jubila el colibrí" — operador). */}
        <ChagraAgentAvatar
          state={state === STATE_RECORDING ? 'listening' : (state === STATE_THINKING || isVoicePlaying) ? 'thinking' : 'idle'}
          size={52}
          onDoubleClick={async () => {
            if (isSpeaking() || ttsEnabled) {
              stop(); setTtsEnabled(false); agentSounds.cancel(); return;
            }
            setTtsEnabled(true);
            const ok = await replayLast({ useKokoro: kokoroReady });
            if (ok) agentSounds.chime();
          }}
          ariaLabel="Chagra IA — doble click silencia/reactiva voz"
          className="shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-white leading-tight truncate">Chagra IA</h1>
          {/* Theme-aware (2026-06-10): clases Tailwind (van por --c-*) en vez
              de hex inline que ignoraba los temas. + estado "hablando". */}
          <p className={`text-[10px] font-semibold uppercase tracking-wider leading-tight truncate ${
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
          aria-label={ttsEnabled ? 'Silenciar voz' : 'Activar voz'}
          aria-pressed={ttsEnabled}
        >
          {ttsEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
        </button>
        {/* Ayuda (overhaul ayuda 2026-07): el AgentScreen es inmersivo (sin
            TopBar), así que el "?" global no existía aquí — el campesino que
            se pierde EN el chat no tenía puerta al Manual. Mismo mecanismo de
            navegación global que el botón Home (chagra:nav → App.jsx). */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('chagra:nav', { detail: 'ayuda' }))}
          className="p-2.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500/35 text-amber-300 min-h-[44px] min-w-[44px] flex items-center justify-center transition-all"
          title="Manual de uso"
          aria-label="Abrir el manual de uso"
          data-testid="agent-help-btn"
        >
          <HelpCircle size={16} strokeWidth={2.5} />
        </button>
        <div className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-full text-[10px] ${
          isOnline ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'
        }`}>
          {isOnline ? <Wifi size={11} /> : <WifiOff size={11} />}
          {isOnline ? 'Con señal' : 'Sin señal'}
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
          en GPU M6000). Spinner CSS con animación spin de Tailwind.
          Bug visual Vi1 (auditoría IA 2026-07-08): además del status, el
          banner SOLO vive mientras el chat está vacío — al primer mensaje
          (el agente ya demostró estar respondiendo) desaparece, aunque el
          warm-up siga en vuelo. Antes quedaba pegado sobre la conversación
          entera dando sensación de "cargando eternamente". */}
      {(ollamaWarmStatus === 'warming' || ollamaWarmStatus === 'unknown') && messages.length === 0 && (
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
        thinkingPhase={thinkingPhase}
        onConsentNeeded={handleFeedbackConsentNeeded}
        onRetryOrphan={handleRetryOrphan}
        onCancelDeepResearch={handleCancelDeepResearch}
        onDismissInsight={handleDismissInsight}
        onAyudaAction={handleAyudaAction}
        proactiveGreeting={proactiveGreeting}
        onBack={onBack}
      />

      {/* Error */}
      {error && (
        <div className="px-4 py-2 mx-4 mb-2 rounded-lg bg-red-900/30 border border-red-800/50">
          <p className="text-xs text-red-300">{error}</p>
        </div>
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
            className="tap-target shrink-0 p-1.5 rounded-md hover:bg-white/10 text-slate-400"
            aria-label="Cerrar contexto de alerta"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Mano de Chagra — trigger prominente en pantalla vacía para abrir la
          red de capacidades (única fuente, igual que el home). Operador 2026-06-18:
          el acceso a capacidades es SOLO por este botón o el ícono del tema en
          el compositor, nunca por chips de texto. */}
      {/* Bug visual Vi5 (auditoría IA 2026-07-08): el CTA quedaba casi
          invisible (crema sobre crema). Causa doble: (1) el wrapper NO
          escapaba del velo `.agent-scrim` (absolute inset-0, crema ~0.94 en
          temas claros) que pintaba ENCIMA — mismo bug ya corregido en el
          empty-state y el compositor con `relative z-10`; (2) el fondo
          `bg-emerald-700/45` translúcido sobre crema dejaba el texto claro
          sin contraste. Ahora: z-10 + acento sólido `bg-emerald-600 text-white`
          — el par exacto de la EXCEPCIÓN de themes.css ("sobre un botón de
          acento sólido el blanco sigue siendo lo correcto"): en los temas
          claros text-white vira a tinta café salvo sobre bg-emerald-500/600,
          donde se mantiene #fff sobre el verde oscuro del tema (AA). */}
      {messages.length === 0 && (
        <div className="relative z-10 px-4 pb-1 pt-1 shrink-0">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-emerald-400/60 bg-emerald-600 text-white text-sm font-semibold shadow-lg shadow-emerald-950/40 active:scale-[.98] transition-transform"
            aria-label="Abrir la mano de Chagra"
            data-testid="agent-mano-trigger"
          >
            <span className="w-[20px] h-[20px] shrink-0 flex items-center justify-center" aria-hidden="true">
              <ManoChagraGlyph size={20} />
            </span>
            Toca la mano de Chagra para ver todo lo que puede hacer
          </button>
        </div>
      )}

      {/* ── Compositor pill — paridad completa AgentHero (2026-06-08).
          Superficie OPACA por token (.agent-bar-surface) para legibilidad sobre
          la foto de fondo (fix 2026-06-15). ── */}
      <div className="relative z-10 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] pt-2 border-t border-slate-800/60 agent-bar-surface shrink-0">

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
              className="tap-target p-2 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300"
              aria-label="Quitar foto"
            >
              <X size={15} />
            </button>
          </div>
        )}
        {agentPickError && (
          <p className="text-xs text-red-400 mb-2 px-1">{agentPickError}</p>
        )}

        {/* Tip de primera vez (feat/onboarding-ayuda): cómo pedir diagnóstico
            con foto. Apunta al botón 📷 real del compositor de abajo;
            descartable y no se repite (contextTips). Variante 'subtle' = una
            línea discreta, NO tarjeta (operador 2026-07-08: el aviso grande
            gritaba encima del compositor). */}
        {state !== STATE_RECORDING && !agentAttachment && (
          <ContextTip
            id="foto-diagnostico"
            variant="subtle"
            emoji="📷"
            title="¿Una mata enferma? Mándeme una foto"
            className="mb-1.5"
          >
            ¿Una mata enferma? Toque la cámara aquí abajo y mándeme la foto.
          </ContextTip>
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

        {/* V3: la bandeja de ~11-13 chips (ChipsToolbar) ya NO se pinta inline
            aquí — ahogaba el chat en móvil. Vive dentro de LA MOCHILA
            (bottom-sheet de más abajo) y se abre desde el disparador "Temas"
            del compositor. Con la mochila cerrada el chat tiene el alto
            completo. Misma data y ruteo — cero cambios de lógica. */}

        {/* Pill — unified with AgentHero (as-bar CSS tokens) */}
        <div
          className={[
            'as-bar',
            state === STATE_RECORDING ? 'is-recording' : '',
            composerPhase === 'sending' ? 'as-shimmer as-sending' : '',
          ].join(' ')}
        >
          {/* V3 — Etiqueta del MODO ACTIVO sobre el input (ancho completo, no
              se trunca): dice de qué tema va a responder Chagra. Tocarla
              reabre la mochila; la "x" limpia el modo con un toque (mismo
              setActiveIntent — cero mecanismo nuevo). */}
          {activeChipDef && state !== STATE_RECORDING && (
            <div className="v3-modo-tagrow">
              <button
                type="button"
                onClick={() => setMochilaOpen(true)}
                aria-label={`Modo activo: ${activeChipDef.label}. Cambiar tema`}
                data-testid="agent-modo-tag"
                className="v3-modo-tag"
              >
                <span aria-hidden="true">{activeChipDef.emoji}</span>
                <span className="v3-modo-tag-txt">{activeChipDef.label}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveIntent(null)}
                aria-label={`Quitar el modo ${activeChipDef.label}`}
                data-testid="agent-modo-clear"
                className="v3-modo-clear"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Fila 1: textarea o waveform de grabación */}
          {state === STATE_RECORDING ? (
            <div className="flex items-center gap-3 px-3 py-3 min-h-[52px]">
              {/* Onda de voz animada (pulido voice-first 2026-07): reemplaza al
                  punto rojo estático. Barras que laten en rose — el operador VE
                  que lo estamos oyendo. CSS en AGENT_COMPOSITOR_CSS (.as-rec-*),
                  con fallback quieto bajo prefers-reduced-motion. */}
              <span className="as-rec-wave text-rose-400 shrink-0" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className="as-rec-bar" style={{ animationDelay: `${i * 0.13}s` }} />
                ))}
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
              aria-label="Escriba su mensaje para Chagra"
              data-testid="agent-input"
              className="w-full bg-transparent resize-none px-3 py-3 text-sm text-white placeholder-slate-500 focus:outline-none leading-snug"
              style={{ minHeight: '44px', maxHeight: '140px' }}
            />
          )}

          {/* Fila 2: Ⓐ | 📷 | spacer | 🎤 | Enviar */}
          <div className="flex items-center gap-2 px-1 pb-1 pt-0.5">
            {/* Botón Ⓐ — abre la MANO de Chagra (AgentRedMenu). Este botón ES la
                raíz geométrica de la red (anchorRef): la mano brota de él, igual
                que en el home. El GLIFO del botón es el ÍCONO DEL TEMA (no la
                mano): paridad con home/TopBar y AgentHero — el acceso a
                capacidades entra por el ícono del tema en el compositor
                (operador 2026-06-18). `key={theme}` remonta el SVG al cambiar de
                tema para que la "forja" de la Ⓐ biopunk vuelva a dibujarse. */}
            <button
              ref={aButtonRef}
              type="button"
              onClick={() => setSheetOpen((o) => !o)}
              disabled={state === STATE_RECORDING}
              aria-label="Abrir la mano de Chagra"
              aria-expanded={sheetOpen}
              className={['as-iconbtn as-tool', sheetOpen ? 'is-open' : ''].join(' ')}
            >
              <span key={theme} className="w-[20px] h-[20px] flex items-center justify-center" aria-hidden="true">
                {iconForTheme(theme)}
              </span>
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

            {/* V3 — Disparador de LA MOCHILA de temas. Colapsa la bandeja de
                ~11-13 chips en un solo control (mandato del operador tras
                rechazarla 3 veces). Etiqueta constante "Temas" (el modo activo
                se muestra COMPLETO en la etiqueta sobre el input — aquí solo
                se tiñe con el acento para no truncarse en la fila angosta). */}
            <button
              type="button"
              onClick={() => setMochilaOpen(true)}
              disabled={state === STATE_RECORDING}
              aria-label={activeChipDef
                ? `Modo activo: ${activeChipDef.label}. Abrir los temas del agente`
                : 'Temas del agente'}
              aria-haspopup="dialog"
              aria-expanded={mochilaOpen}
              data-testid="agent-modos-trigger"
              className={['v3-modo', activeChipDef ? 'is-active' : ''].join(' ')}
            >
              <Sprout size={17} strokeWidth={2.2} aria-hidden="true" />
              <span className="v3-modo-txt">Temas</span>
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
              className={[
                'as-send',
                // PIEL POR TEMA del botón enviar (Fase 2). Con la flag ON y el
                // botón activo, toma `.agent-send-accent` → themes.css lo pinta
                // con el acento del tema (teal/ocre/verde), igual que AgentHero,
                // en vez del gradiente teal→cian fijo. Con OFF queda como hoy.
                agentSendAccent ? 'agent-send-accent' : '',
              ].filter(Boolean).join(' ')}
              style={{
                background:
                  (!inputText.trim() && !agentAttachment) || state === STATE_RECORDING || queuePending.length >= 1
                    ? 'rgba(51,65,85,0.8)'
                    // Con `agent-send-accent` activo, el color lo pone themes.css
                    // (background-color !important del acento del tema); aquí no
                    // forzamos el gradiente para no taparlo.
                    : agentSendAccent ? undefined : 'linear-gradient(135deg,#10b981 0%,#0891b2 100%)',
                boxShadow:
                  (!inputText.trim() && !agentAttachment) || state === STATE_RECORDING || queuePending.length >= 1
                    ? 'none'
                    : '0 0 18px rgba(16,185,129,0.5)',
              }}
            >
              <ChagraAgentAvatar
                size={46}
                state={state === STATE_THINKING ? 'thinking' : 'idle'}
                ariaLabel="Enviar al agente"
              />
            </button>
          </div>
        </div>

        {/* Hint educativo bajo el pill — RETIRADO (tarea #58): el operador pidió
            quitar los chips/líneas de sugerencia que ensucian la pantalla del
            agente. El acceso a capacidades queda por la mano de Chagra (botón
            Ⓐ del compositor + botón de la pantalla vacía). */}

        {/* ── V3 · LA MOCHILA DE TEMAS ────────────────────────────────────────
            Colapsa la bandeja de ~11-13 chips de modo (ChipsToolbar) que
            ahogaba el chat. Misma data y ruteo; solo cambia el contenedor: un
            bottom-sheet con scroll que se cierra al elegir un modo, al tocar
            afuera o con Escape. El dobladillo lleva LA COSTURA — la misma
            puntada que firma las respuestas respaldadas por el catálogo. */}
        {mochilaOpen && (
          <div
            className="v3-mochila"
            role="dialog"
            aria-modal="true"
            aria-label="Temas del agente"
            data-testid="agent-modos-sheet"
            onKeyDown={(e) => { if (e.key === 'Escape') setMochilaOpen(false); }}
          >
            <button
              type="button"
              className="v3-mochila-scrim"
              aria-label="Cerrar los temas del agente"
              onClick={() => setMochilaOpen(false)}
            />
            <div className="v3-mochila-panel">
              <div className="v3-mochila-hem" aria-hidden="true">
                <span className="v3-mochila-grab" />
                <span className="v3-mochila-stitch" />
              </div>
              <div className="v3-mochila-head">
                <div className="v3-mochila-titwrap">
                  <h2>¿Sobre qué hablamos?</h2>
                  <p>Toca un tema y Chagra va directo al grano, sin rodeos.</p>
                </div>
                <button
                  type="button"
                  className="v3-mochila-close"
                  onClick={() => setMochilaOpen(false)}
                  aria-label="Cerrar"
                  /* Al abrir, el foco entra al diálogo (cerrar) → Escape y
                     lectores de pantalla operan DENTRO de la mochila. */
                  autoFocus
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
              <div className="v3-mochila-body">
                <ChipsToolbar
                  activeIntent={activeIntent}
                  hasAttachment={Boolean(agentAttachment)}
                  disabled={state === STATE_RECORDING || queuePending.length >= 1}
                  isPro={isPro}
                  chipDefs={profileChipDefs}
                  onSelectIntent={(intent) => {
                    setActiveIntent((current) => (current === intent ? null : intent));
                    setMochilaOpen(false);
                  }}
                />
              </div>
            </div>
          </div>
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
                // UX PACIENTE (#5): estados visibles NO alarmantes. NUNCA
                // pedimos "toca de nuevo" — la pregunta está guardada y, si se
                // corta, se reintenta sola. Aun el caso lento ofrece SOLO
                // Cancelar (acción voluntaria), nunca insinúa que se perdió.
                // La fase visible (thinkingPhase) reemplaza el "Pensando"
                // genérico para que la espera muestre avance real.
                const faseLabel = MSG.agente.fases[thinkingPhase] || null;
                if (showSlowWarning) {
                  return 'Sigo pensando — esto puede tardar en el campo. Tu pregunta está guardada.';
                }
                // ETA visible. Si remainingMs es null o el item recién arrancó
                // sin haber medido aún, caemos a "Pensando…".
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
                    // Sin alarma: tranquiliza que la pregunta sigue en proceso.
                    return `Tardando un poco (${Math.floor(elapsed / 1000)}s) — sigo en eso, no se perdió.`;
                  }
                  if (stretching) {
                    return `Casi listo… (${Math.floor(elapsed / 1000)}s)`;
                  }
                  return `${faseLabel || 'Pensando tu respuesta'}… ~${secsLeft}s`;
                }
                return `${faseLabel || 'Pensando'}… (puede tardar en el campo)`;
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
                <p className="text-xs text-slate-300 leading-snug flex-1">
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
                  className="tap-target text-sm text-slate-400 hover:text-slate-200 shrink-0 leading-none px-1"
                  data-testid="dismiss-tip"
                >
                  ×
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={handleCancelLLM}
              className="tap-target text-xs px-4 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 transition-all"
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
              className="tap-target text-amber-400 hover:text-amber-200 text-sm leading-none"
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

      {/* La MANO de Chagra (Ⓐ) — MISMA red orgánica que el home (AgentRedMenu),
          NO menús de texto (operador: "en el agente no se ve la mano, se ven
          los menús en texto"). Una sola fuente: AgentManoOverlay + el mismo
          CAPABILITY_MANIFEST. */}
      <AgentManoOverlay
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onPick={handleManoPick}
        anchorRef={aButtonRef}
        disabled={state === STATE_RECORDING}
      />

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
