import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
    {
      intent: 'clima',
      label: 'Clima',
      emoji: '🌤️',
      placeholder: 'Pregunta por la lluvia o el clima de tu zona',
    },
    {
      intent: 'plaga',
      label: 'Plaga',
      emoji: '🐛',
      placeholder: 'Escribe la plaga o describe el dano que ves',
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

vi.mock('../../../services/ragRetriever', () => ({
  retrieve: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../../services/agentIntentParser', () => ({
  parseIntent: vi.fn(() => null),
  formatIntentDescription: vi.fn(() => ''),
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
  companionSpeciesGuard: vi.fn(),
  postValidate: vi.fn(),
  getClimaIdeam: vi.fn(),
  isToolAllowed: vi.fn(() => false),
}));

vi.mock('../../../services/skyConditionService', () => ({
  summarizeSkyForGrounding: vi.fn(() => null),
}));

vi.mock('../../../services/promptAssembler', () => ({
  assembleSystemContent: vi.fn(() => ({ content: 'mock-system' })),
  TOP_N_RAG: 5,
}));

vi.mock('../../../services/outputGuards', () => ({
  applyOutputGuards: vi.fn((text) => text),
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
  replayLast: vi.fn(() => Promise.resolve(false)),
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
  buildFrostHeatContext: vi.fn(() => ''),
  buildAssociationContext: vi.fn(() => ''),
  buildInvasiveSafetyContext: vi.fn(() => ''),
  buildCuratedFactsContext: vi.fn(() => ''),
  applyVoseoFilter: vi.fn((text) => text),
  resolveUserRegion: vi.fn(() => null),
  stripRoleLeak: vi.fn((text) => text),
  buildPriceDeclineContext: vi.fn(() => ''),
  buildPriceAnswer: vi.fn(() => ''),
  buildSuggestedEntitiesContext: vi.fn(() => ''),
  isLowConfidenceEntity: vi.fn(() => false),
  buildFallbackResponse: vi.fn(() => ''),
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

vi.mock('../../../services/grafoRelations', () => ({
  buildOfflineGroundingBlock: vi.fn(() => ''),
}));

vi.mock('../../../services/speciesResolver', () => ({
  resolveSpecies: vi.fn(() => null),
}));

vi.mock('../../ChatHistory', () => ({
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
}));

import AgentScreen from '../AgentScreen';

describe('AgentScreen - chips toolbar', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('V3: colapsa la bandeja en la mochila; el disparador la abre y elegir un modo lo fuerza, la cierra y lo muestra', async () => {
    render(<AgentScreen onBack={() => {}} onNavigate={() => {}} initialContext={null} />);

    // El disparador vive en el compositor; la mochila arranca CERRADA (el
    // chat recupera el alto completo). ChipsToolbar NO está montada aún y no
    // hay etiqueta de modo activo.
    const trigger = await screen.findByTestId('agent-modos-trigger');
    expect(trigger).toHaveTextContent('Temas');
    expect(screen.queryByTestId('chips-toolbar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agent-modo-tag')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agent-modo-clear')).not.toBeInTheDocument();

    // Abrir la mochila → la bandeja aparece con sus modos.
    fireEvent.click(trigger);
    const toolbar = await screen.findByTestId('chips-toolbar');
    expect(screen.getByTestId('agent-modos-sheet')).toBeInTheDocument();
    expect(toolbar).toHaveTextContent('Biopreparado');

    // Elegir un modo lo fuerza: cambia el placeholder del input, cierra la
    // mochila, tiñe el disparador y muestra la ETIQUETA del modo activo sobre
    // el input (el chip queda desmontado al cerrar, por eso verificamos el
    // efecto persistente, no aria-pressed).
    fireEvent.click(screen.getByRole('button', { name: /biopreparado/i }));

    await waitFor(() => {
      expect(screen.queryByTestId('chips-toolbar')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('agent-input')).toHaveAttribute(
      'placeholder',
      'Escribe para que plaga o planta quieres el biopreparado',
    );
    expect(screen.getByTestId('agent-modo-tag')).toHaveTextContent('Biopreparado');
    expect(screen.getByTestId('agent-modos-trigger').className).toMatch(/is-active/);

    // Salida rápida del modo: la "x" junto a la etiqueta lo limpia sin
    // reabrir la mochila.
    fireEvent.click(screen.getByTestId('agent-modo-clear'));
    expect(screen.queryByTestId('agent-modo-tag')).not.toBeInTheDocument();
    expect(screen.getByTestId('agent-input')).toHaveAttribute('placeholder', 'Escribe tu pregunta...');
  });
});
