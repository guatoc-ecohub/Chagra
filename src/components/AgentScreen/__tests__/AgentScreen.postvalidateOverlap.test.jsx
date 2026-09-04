import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { streamOpenAI } from '../../../services/openaiStream';
import {
  isSidecarEnabled,
  planNlu,
  callTool,
  resolveEntities,
  fermentoPrefilter,
  biopreparadoGrounding,
  pisoTermicoGuard,
  confusionEspecieGuard,
  pestVsDiseaseGuard,
  toxicSafetyGuard,
  companionSpeciesGuard,
  postValidate,
} from '../../../services/sidecarClient';
import { getPestIndex, getPestSynonyms } from '../../../services/grafoRelations';
import {
  detectCrossCropContamination,
  gateSourceMetadataByAffects,
} from '../../../services/affectsGate';
import {
  addTurn,
  computeSourceMetadata,
  mergePostValidateMetadata,
} from '../../../services/conversationMemory';
import { applyOutputGuards } from '../../../services/outputGuards';

/**
 * Tests de regresión del SOLAPADO post-validate ↔ affects-gate (task
 * #2852-latencia-p1, re-hecho sobre dev 2026-09-03).
 *
 * Contrato que este archivo fija:
 *  1. La promesa del post-validate (ida y vuelta de red al MCP) se DISPARA
 *     ANTES del affects-gate, sin await → su latencia de red se solapa con el
 *     trabajo local del gate. Si alguien vuelve a la versión EN SERIE
 *     (gate await → post-validate await), el test 1 falla porque
 *     `postValidate` se llamaría DESPUÉS de `getPestIndex`.
 *  2. El ORDEN DEL MERGE sobre sourceMetadata se preserva EXACTO: primero el
 *     gate (grounded→false + cross_crop), DESPUÉS el post-validate
 *     (hallucinated_names/suspect_names). Si el merge se invierte, el test 2
 *     falla porque el base del merge del post-validate NO traería el sello
 *     del gate.
 *  3. Graceful total: post-validate que rechaza NO bloquea el turno ni rompe
 *     el sello (test 3), y offline no dispara la llamada de red (test 4).
 *
 * Patrón de mocks: hereda del scaffold de AgentScreen.chipsToolbar.test.jsx
 * (AgentScreen completo con ~25 servicios stubbeados). Orden de llamadas
 * observado con un log compartido `ordenLlamadas` — determinista, sin
 * depender de timings de wall-clock.
 */

/**
 * @param {any} state
 */
function createStoreHook(state) {
  /**
   * @param {any} selector
   */
  const hook = (selector) => (typeof selector === 'function' ? selector(state) : state);
  hook.getState = () => state;
  /**
   * @param {any} patch
   */
  hook.setState = (patch) => Object.assign(state, patch);
  return hook;
}

function buildMockChipDefs() {
  return [
    {
      intent: 'biopreparado',
      label: 'Biopreparado',
      emoji: '🧪',
      placeholder: 'Escribe para que plaga o planta quieres el biopreparado',
    },
  ];
}

const mockChipDefs = buildMockChipDefs();

vi.mock('../../../services/chipIntentRouter', () => ({
  CHIP_INTENTS: { deep: 'deep' },
  CHIP_DEFS: buildMockChipDefs(),
  planForcedIntent: vi.fn(),
  isStubIntent: vi.fn(() => false),
  isDeepResearchIntent: vi.fn(() => false),
}));

vi.mock('../../../services/profileChipSelector', () => ({
  selectChipDefs: vi.fn(() => mockChipDefs),
}));

vi.mock('../../../services/deepResearchClient', () => ({
  isDeepResearchEnabled: vi.fn(() => false),
  submitDeepResearch: vi.fn(),
  pollDeepResearch: vi.fn(),
}));

vi.mock('../../../services/tierService', () => ({
  getCurrentTier: vi.fn(() => 'free'),
}));

vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'nature' }),
}));

vi.mock('../../../hooks/useVoiceRecorder', () => ({
  default: () => ({
    durationMs: 0,
    start: vi.fn(),
    stop: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock('../../../services/voiceService', () => ({
  transcribe: vi.fn(),
  queueForRetry: vi.fn(),
}));

vi.mock('../../../services/agentOutboxService', () => ({
  claimNext: vi.fn(() => Promise.resolve(null)),
  markAnswered: vi.fn(() => Promise.resolve()),
  markError: vi.fn(() => Promise.resolve()),
  recoverStaleProcessing: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../services/agentOutboxPhoto', () => ({
  processPhotoItem: vi.fn(),
  buildPhotoUserMessage: vi.fn(),
}));

vi.mock('../../../services/agentOutboxAttachment', () => ({
  isAnalyzableImageAttachment: vi.fn(() => false),
  buildAttachmentRejection: vi.fn(() => 'No puedo leer ese archivo.'),
}));

vi.mock('../../../services/aiService', () => ({
  analyzeFoliage: vi.fn(),
}));

vi.mock('../../../services/photoService', () => ({
  captureAndCompress: vi.fn(),
}));

vi.mock('../../../services/conversationMemory', () => ({
  addTurn: vi.fn(() => Promise.resolve()),
  getFullHistory: vi.fn(() => Promise.resolve([])),
  getContextString: vi.fn(() => Promise.resolve('')),
  computeSourceMetadata: vi.fn(() => null),
  mergePostValidateMetadata: vi.fn((value) => value),
  extractGroundingBadges: vi.fn(() => []),
  deriveEvidenceSourceLink: vi.fn(() => null),
  extractEdges: vi.fn(() => []),
  clearMemory: vi.fn(() => Promise.resolve()),
  shouldStartNewSession: vi.fn(() => false),
}));

vi.mock('../../../services/conversationCaptureService', () => ({
  captureExchange: vi.fn(),
}));

vi.mock('../../../services/ragRetriever', () => ({
  retrieve: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../../services/corpusRetriever', () => ({
  retrieveCorpus: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../../services/agentIntentParser', () => ({
  parseIntent: vi.fn(() => ({ intent: null })),
  formatIntentDescription: vi.fn(() => ''),
}));

vi.mock('../../../services/agentNluFallback', () => ({
  planNluFallback: vi.fn(() => null),
  esSaludoPuro: vi.fn(() => false),
}));

vi.mock('../../../services/openaiStream', () => ({
  streamOpenAI: vi.fn(),
}));

vi.mock('../../../services/llmRouter', () => ({
  buildLLMRequest: vi.fn(() => ({ url: '/mock', body: { model: 'mock', temperature: 0, max_tokens: 32, keep_alive: '24h' } })),
  selectChatRoute: vi.fn(() => 'chat'),
}));

vi.mock('../../../services/streamChatViaSidecar', () => ({
  streamChatViaSidecar: vi.fn(),
  isAgentStreamingEnabled: vi.fn(() => false),
}));

vi.mock('../../../services/streamDeadline', () => ({
  createStreamDeadline: vi.fn(() => ({
    start: vi.fn(),
    onToken: vi.fn(),
    stop: vi.fn(),
  })),
}));

vi.mock('../../../services/sidecarClient', () => ({
  isSidecarEnabled: vi.fn(() => false),
  planNlu: vi.fn(),
  callTool: vi.fn(),
  executeToolChain: vi.fn(),
  resolveEntities: vi.fn(),
  fermentoPrefilter: vi.fn(),
  biopreparadoGrounding: vi.fn(),
  pisoTermicoGuard: vi.fn(),
  confusionEspecieGuard: vi.fn(),
  pestVsDiseaseGuard: vi.fn(),
  toxicSafetyGuard: vi.fn(),
  companionSpeciesGuard: vi.fn(),
  postValidate: vi.fn(),
  getClimaIdeam: vi.fn(),
  isToolAllowed: vi.fn(() => false),
}));

// Grafo offline: el affects-gate lee getPestIndex/getPestSynonyms — los
// controlamos para observar el ORDEN en que el gate pide sus mapas.
vi.mock('../../../services/grafoRelations', () => ({
  buildOfflineGroundingBlock: vi.fn(() => ''),
  getPestIndex: vi.fn(() => Promise.resolve({})),
  getPestSynonyms: vi.fn(() => Promise.resolve({})),
}));

// AFFECTS-GATE stubbeado completo: detectCrossCropContamination decide si el
// sello se degrada; gateSourceMetadataByAffects aplica el sello. Ambos
// graban el orden de llamadas desde cada test.
vi.mock('../../../services/affectsGate', () => ({
  extractAffectsFromEvidence: vi.fn(() => []),
  resolvePestAffects: vi.fn(() => null),
  scanTextForPestAffects: vi.fn(() => []),
  detectCrossCropContamination: vi.fn(() => ({ crossCrop: false, offending: [] })),
  gateSourceMetadataByAffects: vi.fn((metadata) => metadata),
}));

vi.mock('../../../services/skyConditionService', () => ({
  summarizeSkyForGrounding: vi.fn(() => null),
}));

vi.mock('../../../services/promptAssembler', () => ({
  assembleSystemContent: vi.fn(() => ({ content: 'mock-system' })),
  TOP_N_RAG: 5,
  TOP_N_EDGES: 12,
}));

vi.mock('../../../services/agentPromptBase', () => ({
  buildBasePrompt: vi.fn(() => 'mock-base-prompt'),
  analyzeQuery: vi.fn(() => ({ isEnum: false })),
  buildQueryAnalysisBlock: vi.fn(() => ''),
  buildCorpusVariants: vi.fn(() => ['']),
  buildResolvedEntitiesBlock: vi.fn(() => ''),
  formatToolEvidence: vi.fn(() => ''),
  truncateEdgesBlock: vi.fn((value) => value || ''),
}));

vi.mock('../../../services/outputGuards', () => ({
  applyOutputGuards: vi.fn((text) => ({ text, modified: false, reasons: [] })),
  classifyQueryIntent: vi.fn(() => 'unknown'),
}));

vi.mock('../../../services/streamGuards', () => ({
  createStreamGuard: vi.fn(() => ({
    check: vi.fn((text) => text),
  })),
}));

vi.mock('../../../services/userProfileService', () => ({
  getProfile: vi.fn(() => ({ finca_altitud: 2600 })),
  getModuleVisibility: vi.fn(() => ({})),
}));

vi.mock('../../../services/fincaActiveStore', () => ({
  default: createStoreHook({
    activeFincaSlug: 'guatoc',
    fincas: [{ slug: 'guatoc', nombre: 'Guatoc', altitud: 2600 }],
    indoorZone: null,
  }),
}));

vi.mock('../../../services/ensoContext', () => ({
  regionFromProfile: vi.fn(() => 'andina'),
  getEnsoOutlook: vi.fn(() => null),
}));

vi.mock('../../../services/proactiveGreeting', () => ({
  resolveProactiveGreeting: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../../store/useLogStore', () => ({
  default: createStoreHook({
    getPendingTasks: vi.fn(() => []),
  }),
}));

vi.mock('../../../store/usePrefsStore', () => ({
  default: createStoreHook({
    operatorId: 'operator-1',
    ttsEnabled: false,
    setTtsEnabled: vi.fn(),
  }),
}));

vi.mock('../../../store/useAssetStore', () => ({
  default: createStoreHook({
    plants: [],
  }),
}));

vi.mock('../../../store/useAgentNotificationStore', () => ({
  default: createStoreHook({
    setResponseReady: vi.fn(),
    setLastMessage: vi.fn(),
    markRead: vi.fn(),
  }),
}));

vi.mock('../../../store/useOllamaWarmStore', () => ({
  default: createStoreHook({
    status: 'warm',
  }),
}));

vi.mock('../../../store/useAgentQueueStore', () => ({
  default: createStoreHook({
    processing: null,
    pending: [],
    reset: vi.fn(),
    enqueue: vi.fn(() => ({
      status: 'started',
      item: { id: 'request-1', prompt: 'pregunta', model: 'chat', expectedEtaMs: 1000 },
    })),
    completeProcessing: vi.fn(() => null),
    updateProcessingRoute: vi.fn(),
  }),
}));

vi.mock('../../../store/useAlertStore', () => ({
  default: createStoreHook({
    activeAlerts: [],
  }),
}));

vi.mock('../../../services/climaService', () => ({
  getCachedClimaSnapshot: vi.fn(() => null),
  fetchClimaSnapshot: vi.fn(() => Promise.resolve(null)),
  resolveClimaLocation: vi.fn(() => null),
}));

vi.mock('../../../services/ttsService', () => ({
  speak: vi.fn(),
  speakSentences: vi.fn(),
  stop: vi.fn(),
  init: vi.fn(),
  isSupported: vi.fn(() => true),
  isKokoroAvailable: vi.fn(() => Promise.resolve(false)),
  replayLast: vi.fn(() => false),
  isSpeaking: vi.fn(() => false),
  onSpeakingChange: vi.fn(() => () => {}),
  isAudioPlaying: vi.fn(() => false),
  getLastSpoken: vi.fn(() => null),
}));

vi.mock('../../../services/actionExecutor', () => ({
  executeAction: vi.fn(),
  setActionGateCallback: vi.fn(),
}));

vi.mock('../../../services/tipsService', () => ({
  useRotatingTip: vi.fn(() => ({ tip: null, dismiss: vi.fn() })),
}));

vi.mock('../../../services/agentRequestQueue', () => ({
  enqueueRequest: vi.fn(() => Promise.resolve(null)),
  finalizeRequest: vi.fn(() => Promise.resolve()),
  failRequest: vi.fn(() => Promise.resolve()),
  resumePending: vi.fn(() => Promise.resolve()),
  drainPending: vi.fn(() => Promise.resolve({ processed: 0, failed: 0 })),
}));

vi.mock('../../../services/agentRequestSender', () => ({
  createAgentRequestSender: vi.fn(() => vi.fn(() => Promise.resolve({ response: '' }))),
}));

vi.mock('../../../services/agentService', () => ({
  normalizeUserInputForRegion: vi.fn((text) => text),
  buildClimaContext: vi.fn(() => ''),
  buildFincaContext: vi.fn(() => ''),
  buildViabilityContext: vi.fn(() => ''),
  generateViabilityRules: vi.fn(() => ''),
  buildFrostHeatContext: vi.fn(() => ''),
  buildAssociationContext: vi.fn(() => ''),
  buildInvasiveSafetyContext: vi.fn(() => ''),
  buildCuratedFactsContext: vi.fn(() => ''),
  applyVoseoFilter: vi.fn((text) => text),
  resolveUserRegion: vi.fn(() => null),
  stripRoleLeak: vi.fn((text) => text),
  buildPriceDeclineContext: vi.fn(() => ''),
  buildPriceAnswer: vi.fn(() => null),
  buildSuggestedEntitiesContext: vi.fn(() => ''),
  isLowConfidenceEntity: vi.fn(() => false),
  buildFallbackResponse: vi.fn((raw) => (typeof raw === 'string' ? raw : '')),
  pisoTermicoFromAltitud: vi.fn(() => null),
  groupAndLimitCultivos: vi.fn(() => []),
}));

vi.mock('../../../services/knowledgeIntentRouter', () => ({
  planKnowledgeIntent: vi.fn(() => null),
  hasSoilDiagnosticIntent: vi.fn(() => false),
  hasWaterDiagnosticIntent: vi.fn(() => false),
  hasAnimalDiagnosticIntent: vi.fn(() => false),
  hasRestauracionDiagnosticIntent: vi.fn(() => false),
  hasIncendioRiskIntent: vi.fn(() => false),
}));

vi.mock('../../../services/marketIntentRouter', () => ({
  planMarketIntent: vi.fn(() => null),
}));

vi.mock('../../../services/speciesResolver', () => ({
  resolveSpecies: vi.fn(() => null),
}));

vi.mock('../../ChatHistory', () => ({
  default: () => <div data-testid="chat-history-stub" />,
}));

vi.mock('../ChatHistory', () => ({
  default: () => <div data-testid="chat-history-stub" />,
}));

vi.mock('../../VoiceStatusStrip', () => ({
  default: () => <div data-testid="voice-status-stub" />,
}));

vi.mock('../../ContextTip', () => ({
  default: () => null,
}));

vi.mock('../../ActionConfirmModal', () => ({
  default: () => null,
}));

vi.mock('../../FeedbackConsentModal', () => ({
  default: () => null,
}));

vi.mock('../../ChagraAgentAvatar', () => ({
  default: () => <div data-testid="agent-avatar-stub" />,
}));

vi.mock('../../ChagraAgentAvatarColibriPhoto', () => ({
  default: () => <div data-testid="agent-colibri-stub" />,
}));

vi.mock('../../agent/AgentShell', () => ({
  AgentManoOverlay: () => null,
}));

vi.mock('../../agent/capabilityRouting', () => ({
  mapCapabilityPick: vi.fn(() => false),
}));

vi.mock('../../dashboard/themeIcon', () => ({
  iconForTheme: vi.fn(() => <span data-testid="theme-icon-stub" />),
}));

vi.mock('../../dashboard/ManoChagraGlyph', () => ({
  default: () => <span data-testid="mano-glyph-stub" />,
}));

vi.mock('../../../config/glaciarAccess', () => ({
  tieneAccesoGlaciarActual: vi.fn(() => false),
  esOperadorActual: vi.fn(() => false),
}));

vi.mock('../../../config/fincaVivaHomeFlag', () => ({
  fincaVivaHomePerfilActivo: vi.fn(() => false),
}));

vi.mock('../../../hooks/useInsightProactivo', () => ({
  detectarSlugEnTexto: vi.fn(() => null),
  elegirInsight: vi.fn(() => null),
  detectarInsightCatalogo: vi.fn(() => Promise.resolve(null)),
}));

import AgentScreen from '../AgentScreen';

// Log compartido del orden de llamadas entre mocks. Se llena desde las
// mockImplementation de cada test (los mocks son hoisted, por eso NO se
// referencia desde las fábricas vi.mock).
const ordenLlamadas = [];

/**
 * Deferred mínimo para dejar el post-validate EN VUELO (sin resolver) y
 * controlar el momento exacto de su resolución desde el test.
 */
function crearDiferido() {
  let res = () => {};
  let rej = () => {};
  const promise = new Promise((resolve, reject) => { res = resolve; rej = reject; });
  return { promise, resolve: res, reject: rej };
}

/**
 * Configura el flujo feliz: sidecar ON, una entidad de cultivo resuelta
 * (Theobroma cacao), respuesta del LLM sin tools. Deja el affects-gate
 * configurado para CRUZAR (cross_crop) y el post-validate grabando orden.
 *
 * @param {{ online?: boolean }} opts
 * @returns {{ resolverPostValidate: (v: any) => void, rechazarPostValidate: (e: any) => void }}
 */
function configurarFlujoBase({ online = true } = {}) {
  vi.stubGlobal('navigator', { onLine: online });
  vi.mocked(isSidecarEnabled).mockReturnValue(true);
  vi.mocked(planNlu).mockResolvedValue({
    useTool: false,
    tool: null,
    args: {},
    toolChain: null,
    // Forma completa del contrato NLU (sidecarClient.planNlu).
    latencyMs: 1,
    modelUsed: null,
    heuristicSkipped: false,
    reason: null,
    error: null,
  });
  vi.mocked(callTool).mockResolvedValue(null);
  vi.mocked(resolveEntities).mockResolvedValue({
    entities: [
      {
        mentioned: 'cacao',
        canonical_id: 'theobroma_cacao',
        kind: 'especie',
        nombre_cientifico: 'Theobroma cacao',
        confidence: 0.95,
      },
    ],
    grounding: null,
  });
  vi.mocked(fermentoPrefilter).mockResolvedValue(null);
  vi.mocked(biopreparadoGrounding).mockResolvedValue(null);
  vi.mocked(pisoTermicoGuard).mockResolvedValue(null);
  vi.mocked(confusionEspecieGuard).mockResolvedValue(null);
  vi.mocked(pestVsDiseaseGuard).mockResolvedValue(null);
  vi.mocked(toxicSafetyGuard).mockResolvedValue(null);
  vi.mocked(companionSpeciesGuard).mockResolvedValue(null);
  vi.mocked(streamOpenAI).mockResolvedValue({ fullText: 'El cacao crece bien bajo sombra de guamo.', toolCalls: null });
  vi.mocked(applyOutputGuards).mockImplementation((text) => ({ text, modified: false, reasons: [] }));

  // El turno SALE VERIFICADO (grounded: true) → el affects-gate corre.
  vi.mocked(computeSourceMetadata).mockReturnValue({ grounded: true });

  // El gate CRUZA: broca mencionada en una conversación de cacao → sello
  // degradado (grounded→false + cross_crop). Grabamos el orden.
  vi.mocked(detectCrossCropContamination).mockImplementation(() => {
    ordenLlamadas.push('detectCrossCrop');
    return { crossCrop: true, offending: [{ pest: 'Broca del café' }] };
  });
  vi.mocked(gateSourceMetadataByAffects).mockImplementation((metadata, _gateResult, _opts) => {
    ordenLlamadas.push('gateMerge');
    return { ...metadata, grounded: false, cross_crop: true };
  });

  // Mapas del grafo: resuelven al instante (trabajo local del gate).
  vi.mocked(getPestIndex).mockImplementation(() => {
    ordenLlamadas.push('getPestIndex');
    return Promise.resolve({});
  });
  vi.mocked(getPestSynonyms).mockResolvedValue({});

  // El post-validate NO resuelve solo: devuelve un diferido que el test
  // resuelve cuando quiere. Grabamos el orden AL SER INVOCADO — ese es el
  // instante del DISPARO de la llamada de red.
  let diferido = crearDiferido();
  vi.mocked(postValidate).mockImplementation(() => {
    ordenLlamadas.push('postValidate');
    diferido = crearDiferido();
    return diferido.promise;
  });

  // Merge fiel al contrato real de conversationMemory.mergePostValidateMetadata,
  // grabando el orden (instante del merge del post-validate sobre sourceMetadata).
  vi.mocked(mergePostValidateMetadata).mockImplementation((base, pv) => {
    ordenLlamadas.push('pvMerge');
    const out = { ...(base && typeof base === 'object' ? base : {}) };
    if (pv && typeof pv === 'object' && pv.age_available === true) {
      if (Array.isArray(pv.suspect) && pv.suspect.length > 0) out.suspect_names = pv.suspect;
      if (Array.isArray(pv.hallucinated) && pv.hallucinated.length > 0) out.hallucinated_names = pv.hallucinated;
    }
    return out;
  });

  return {
    resolverPostValidate: (v) => diferido.resolve(v),
    rechazarPostValidate: (e) => diferido.reject(e),
  };
}

/** Dispara un turno completo y espera el cierre del turno del asistente. */
async function enviarPreguntaYEsperarTurno(prompt) {
  render(<AgentScreen onBack={() => {}} onNavigate={() => {}} initialContext={null} />);
  fireEvent.change(screen.getByTestId('agent-input'), { target: { value: prompt } });
  fireEvent.click(screen.getByTestId('agent-submit'));
  await waitFor(() => {
    expect(addTurn).toHaveBeenCalledTimes(2);
  });
  const turnos = addTurn.mock.calls.map((c) => c[1]);
  return turnos.find((t) => t.role === 'assistant');
}

describe('AgentScreen — solapado post-validate ↔ affects-gate (latencia P1 #2852)', () => {
  beforeEach(() => {
    ordenLlamadas.length = 0;
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('dispara el post-validate ANTES del affects-gate (solapado, no en serie) y el turno cierra con ambos sellos', async () => {
    const { resolverPostValidate } = configurarFlujoBase();

    render(<AgentScreen onBack={() => {}} onNavigate={() => {}} initialContext={null} />);
    fireEvent.change(screen.getByTestId('agent-input'), {
      target: { value: '¿Qué sombra necesita el cacao si además tengo broca?' },
    });
    fireEvent.click(screen.getByTestId('agent-submit'));

    // Ambos lados quedaron INVOCADOS mientras el post-validate sigue en vuelo.
    await waitFor(() => {
      expect(postValidate).toHaveBeenCalledTimes(1);
      expect(getPestIndex).toHaveBeenCalledTimes(1);
    });

    // CONTROL CLAVE (falla si se vuelve a la versión EN SERIE): el DISPARO de
    // la llamada de red del post-validate ocurrió ANTES de que el gate pidiera
    // sus mapas del grafo. En serie el orden sería getPestIndex → postValidate.
    expect(ordenLlamadas.indexOf('postValidate')).toBeLessThan(ordenLlamadas.indexOf('getPestIndex'));

    // El post-validate leyó la respuesta FINAL (post guards/companion) con los
    // binomios esperados de resolvedEntities.
    expect(postValidate).toHaveBeenCalledWith(
      'El cacao crece bien bajo sombra de guamo.',
      ['Theobroma cacao'],
    );

    // Mientras el post-validate está en vuelo, el flujo está bloqueado en su
    // await (después del gate): el merge NO ha corrido todavía.
    expect(mergePostValidateMetadata).not.toHaveBeenCalled();
    // …pero el gate YA aplicó su sello.
    expect(gateSourceMetadataByAffects).toHaveBeenCalledTimes(1);

    // Resolvemos la red → el turno cierra.
    resolverPostValidate({
      hallucinated: ['Neolepidopteron daquila'],
      validated: ['Theobroma cacao'],
      suspect: [],
      age_available: true,
      detected_count: 1,
    });

    await waitFor(() => {
      expect(addTurn).toHaveBeenCalledTimes(2);
    });
    const turnoAsistente = addTurn.mock.calls.map((c) => c[1]).find((x) => x.role === 'assistant');

    expect(turnoAsistente).toBeDefined();
    // Ambos sellos conviven en la metadata final: el gate (cross_crop +
    // grounded:false) y el post-validate (hallucinated_names).
    expect(turnoAsistente.metadata.cross_crop).toBe(true);
    expect(turnoAsistente.metadata.grounded).toBe(false);
    expect(turnoAsistente.metadata.hallucinated_names).toEqual(['Neolepidopteron daquila']);
  });

  it('preserva el ORDEN DEL MERGE: el post-validate se aplica sobre la metadata YA sellada por el affects-gate', async () => {
    const { resolverPostValidate } = configurarFlujoBase();

    render(<AgentScreen onBack={() => {}} onNavigate={() => {}} initialContext={null} />);
    fireEvent.change(screen.getByTestId('agent-input'), {
      target: { value: '¿Qué sombra necesita el cacao con broca presente?' },
    });
    fireEvent.click(screen.getByTestId('agent-submit'));

    await waitFor(() => {
      expect(postValidate).toHaveBeenCalledTimes(1);
      expect(getPestIndex).toHaveBeenCalledTimes(1);
    });

    resolverPostValidate({
      hallucinated: ['Neolepidopteron daquila'],
      validated: [],
      suspect: ['Solanum lycopersicum'],
      age_available: true,
      detected_count: 2,
    });

    await waitFor(() => {
      expect(addTurn).toHaveBeenCalledTimes(2);
    });

    // CONTROL CLAVE (falla si el orden del merge se invierte): el BASE que el
    // merge del post-validate recibió YA traía el sello del gate. Si alguien
    // mueve el merge ANTES del gate, base.grounded sería true y no habría
    // cross_crop en el base.
    expect(mergePostValidateMetadata).toHaveBeenCalledTimes(1);
    const baseDelMerge = vi.mocked(mergePostValidateMetadata).mock.calls[0][0];
    expect(baseDelMerge.grounded).toBe(false);
    expect(baseDelMerge.cross_crop).toBe(true);

    // Y el orden global de eventos fue: disparo de red → gate → merge pv.
    expect(ordenLlamadas).toEqual(['postValidate', 'getPestIndex', 'detectCrossCrop', 'gateMerge', 'pvMerge']);
  });

  it('graceful: si el post-validate rechaza, el turno cierra con el sello del gate y sin badges de alucinación', async () => {
    configurarFlujoBase();
    // Versión que rechaza (AGE caído / timeout).
    vi.mocked(postValidate).mockImplementation(() => {
      ordenLlamadas.push('postValidate');
      return Promise.reject(new Error('AGE caído'));
    });

    const turnoAsistente = await enviarPreguntaYEsperarTurno('¿Qué sombra necesita el cacao con broca?');

    // El turno NO se bloqueó: cerró con el sello del gate…
    expect(turnoAsistente.metadata.cross_crop).toBe(true);
    expect(turnoAsistente.metadata.grounded).toBe(false);
    // …y SIN badges del post-validate (merge omitido, sin excepción).
    expect(turnoAsistente.metadata.hallucinated_names).toBeUndefined();
    expect(turnoAsistente.metadata.suspect_names).toBeUndefined();
    expect(mergePostValidateMetadata).not.toHaveBeenCalled();
    // Y el disparo siguió siendo ANTES del gate (solapado también en el fallo).
    expect(ordenLlamadas.indexOf('postValidate')).toBeLessThan(ordenLlamadas.indexOf('getPestIndex'));
  });

  it('offline: no dispara el post-validate ni el affects-gate (cero red nueva)', async () => {
    configurarFlujoBase({ online: false });

    const turnoAsistente = await enviarPreguntaYEsperarTurno('¿Qué sombra necesita el cacao?');

    expect(postValidate).not.toHaveBeenCalled();
    expect(getPestIndex).not.toHaveBeenCalled();
    expect(mergePostValidateMetadata).not.toHaveBeenCalled();
    expect(turnoAsistente).toBeDefined();
  });
});
