import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Mic, MicOff, Send, Sparkles, Wifi, WifiOff, Volume2, VolumeX } from 'lucide-react';
import useVoiceRecorder from '../../hooks/useVoiceRecorder';
import { transcribe } from '../../services/voiceService';
import { addTurn, getFullHistory, getContextString } from '../../services/conversationMemory';
import { retrieve } from '../../services/ragRetriever';
import { parseIntent, formatIntentDescription } from '../../services/agentIntentParser';
import { streamOpenAI } from '../../services/openaiStream';
import { buildLLMRequest } from '../../services/llmRouter';
import { speak, speakKokoro, stop, init as initTTS, isSupported, isKokoroAvailable } from '../../services/ttsService';
import { executeAction, setActionGateCallback } from '../../services/actionExecutor';
import ChatHistory from './ChatHistory';
import SuggestedActions from './SuggestedActions';
import ActionConfirmModal from '../ActionConfirmModal';
import ChagraAgentAvatar from '../ChagraAgentAvatar';
import { agentSounds } from '../../services/agentSoundService';
import usePrefsStore from '../../store/usePrefsStore';
import useAssetStore from '../../store/useAssetStore';
import useFincaActiveStore from '../../services/fincaActiveStore';

// 2026-05-16: migrado a llmRouter (Multi-LLM por tarea). AgentScreen usa
// `chat` route → gemma3:4b 15 t/s con keep_alive=5m (hot model). Bench
// completo en Chagra-strategy/ops/bench-llamacpp-puro-2026-05-16.md.
// Para NLU/tools usar llmRouter('nlu') → qwen2.5-coder:7b.

const STATE_IDLE = 'idle';
const STATE_RECORDING = 'recording';
const STATE_THINKING = 'thinking';

export default function AgentScreen({ onBack }) {
  const operatorId = usePrefsStore((s) => s.operatorId) || 'default-operator';
  const plants = useAssetStore((s) => s.plants);
  // 062.6: contexto finca activa para system prompt (zona biocultural,
  // altitud, override indoor invernadero).
  const activeFincaSlug = useFincaActiveStore((s) => s.activeFincaSlug);
  const fincas = useFincaActiveStore((s) => s.fincas);
  const indoorZone = useFincaActiveStore((s) => s.indoorZone);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [state, setState] = useState(STATE_IDLE);
  const [streamingContent, setStreamingContent] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [error, setError] = useState('');
  const [actionModal, setActionModal] = useState({ isOpen: false, intent: null, llmResponse: '' });
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const ttsSupported = isSupported();
  const [kokoroReady, setKokoroReady] = useState(false);
  // Bug 2026-05-18 (Karen reportó stuck-pensando): tras 20s sin token visible,
  // mostrar mensaje "Aún pensando, toca cancelar si quieres reintentar" y
  // habilitar botón cancelar que dispara AbortController. Si pasan 30s sin
  // token, abortamos automáticamente con error visible.
  const [showSlowWarning, setShowSlowWarning] = useState(false);
  const [llmHealthy, setLlmHealthy] = useState(true);

  const { durationMs, start: startRecord, stop: stopRecord, reset: resetRecord } = useVoiceRecorder();
  const chatEndRef = useRef(null);
  // Bug 2026-05-18: ref al AbortController activo para que botón Cancelar
  // pueda abortar la inferencia LLM en curso desde fuera del callLLM scope.
  const activeControllerRef = useRef(null);
  // 057.4 integration: resolver del Promise pendiente del actionExecutor gate.
  // El callback registrado en setActionGateCallback abre el modal y retorna
  // un Promise; el resolver vive aquí para que los handlers approve/reject/
  // edit puedan resolverlo cuando el operador interactúa.
  const actionGateResolverRef = useRef(null);

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
      const history = await getFullHistory(operatorId, 50);
      setMessages(history);
    } catch (e) {
      console.warn('[Agent] Failed to load history:', e);
    }
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
      activeControllerRef.current.abort();
    }
    agentSounds.cancel();
    setState(STATE_IDLE);
    setStreamingContent('');
    setError('Cancelado. Toca de nuevo si quieres reintentar.');
  };

  useEffect(() => {
    initTTS();
    isKokoroAvailable().then(setKokoroReady);
    loadHistory();
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
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadHistory]);

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
    // chocho/Lupinus mutabilis) y gemma3:4b inventó "sistema de agricultura
    // de bajo impacto". Probado en bench: 12b inventó OTRA cosa distinta
    // (Alternaria solani). Subir parámetros no ayuda. Solución: prompt
    // agresivo con respuesta literal exigida + ejemplo + bajar temperature
    // a 0.3. Bench 2026-05-17 con esta versión devolvió la respuesta
    // EXACTA esperada (no reconozco el término) en 27 tokens / 8s.
    return `Eres Chagra IA, un asistente agroecológico colombiano. ${fincaContext}${indoorContext}El usuario tiene estas plantas agrupadas por especie con su conteo: ${plantNames}.

REGLA DE FORMATO: cuando hables de las plantas del usuario, agrupá por especie y di cuántas tiene (ej. "tienes 15 fresas, 4 caléndulas, 1 tomate cherry"). NUNCA listes los números individuales de cada planta (#01, #02, etc.) — son identificadores internos, no info útil para el operador. Habla como agrónomo experimentado, no como sistema.

REGLA CRÍTICA ANTI-ALUCINACIÓN: si un término te suena raro, no es estándar agroecológico colombiano, o no estás 100% seguro de lo que significa, responde EXACTAMENTE: "No reconozco ese término. ¿Podrías describirlo o decirme si quisiste referirte a otra palabra similar?" NUNCA inventes definiciones. Es PREFERIBLE pedir aclaración que dar información incorrecta. Si sospechas typo, sugiere la palabra correcta como PREGUNTA, no afirmación.

Responde en español colombiano (tú/usted, sin voseo argentino). Sé específico y útil cuando tengas certeza; humilde y preguntón cuando no.`;
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

  // Bug reportado 2026-05-15 + 2026-05-18 (Karen): el botón quedaba en
  // "thinking" indefinido si la red/proxy colgaba sin emitir tokens.
  // Solución v2 (2026-05-18): AbortController con timeout 30s + ref externo
  // para botón Cancelar + warning visible a los 20s ("Aún pensando…").
  // Antes era 90s silent — UX inaceptable cuando bench muestra latencia
  // típica de 5-15s (p95 22s). 30s captura el outlier raro sin congelar
  // la UI tanto. Si el operador necesita seguir esperando, ve mensaje +
  // botón Cancelar para reintentar.
  const LLM_TIMEOUT_MS = 30000;

  const callLLM = async (query, contextMemory, contextCorpus) => {
    const systemPrompt = getSystemPrompt();
    const corpusContext = contextCorpus.length > 0
      ? `\n\nInformación del corpus:\n${contextCorpus.map((c) => c.text).join('\n\n')}`
      : '';

    const messages = [
      { role: 'system', content: systemPrompt + corpusContext },
      ...(contextMemory ? [{ role: 'user', content: contextMemory }] : []),
      { role: 'user', content: query },
    ];

    const controller = new AbortController();
    activeControllerRef.current = controller;
    const timer = setTimeout(() => {
      console.warn(`[Agent] LLM timeout ${LLM_TIMEOUT_MS}ms — aborting`);
      controller.abort();
    }, LLM_TIMEOUT_MS);

    try {
      const { url, body } = buildLLMRequest('chat', messages);
      console.warn('[Agent] LLM call start', { url, queryLen: query.length });
      const result = await streamOpenAI(
        url,
        body,
        (_chunk, fullText) => setStreamingContent(fullText),
        { signal: controller.signal },
      );
      console.warn('[Agent] LLM call complete', { responseLen: result?.length || 0 });
      return result;
    } catch (e) {
      if (e.name === 'AbortError') {
        throw new Error('Tiempo agotado o cancelado. Toca de nuevo.');
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
      clearTimeout(timer);
      activeControllerRef.current = null;
    }
  };

  const handleSubmit = async (text, { fromVoice = false } = {}) => {
    if (!text.trim()) return;
    // Re-entry guard: rechaza submits concurrentes. Permitimos `fromVoice`
    // como excepción porque `handleVoiceRecord` ya seteó STATE_THINKING
    // antes de await transcribe(blob), por lo que cuando llega acá `state`
    // NO es IDLE (closure capturó STATE_RECORDING). Bug previo: el guard
    // `state !== STATE_IDLE` rechazaba la llamada → UI quedaba en pensando
    // sin disparar el LLM (race de closure + async state).
    if (!fromVoice && state !== STATE_IDLE) return;

    const userMessage = {
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setStreamingContent('');
    setState(STATE_THINKING);
    setError('');
    agentSounds.start();

    try {
      await addTurn(operatorId, { role: 'user', content: text.trim() });

      const contextMemory = await getContextString(operatorId, 10);
      const contextCorpus = await retrieve(text, 3);

      const response = await callLLM(text, contextMemory, contextCorpus);
      agentSounds.chime();

      const { intent } = parseIntent(text);

      const assistantMessage = {
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };

      await addTurn(operatorId, { role: 'assistant', content: response });
      setMessages((prev) => [...prev, assistantMessage]);

      if (ttsEnabled && response) {
        stop();
        if (kokoroReady) {
          speakKokoro(response, { rate: 0.9, pitch: 1.0 });
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
      setError(e.message || 'No pude conectarme al asistente. Intenta de nuevo.');
    } finally {
      setState(STATE_IDLE);
      setStreamingContent('');
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
    handleSubmit(inputText);
    setInputText('');
  };

  const handleSuggestion = (text) => {
    handleSubmit(text);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950">
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
        />
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-white leading-tight">Chagra IA</h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            {state === STATE_THINKING && 'pensando…'}
            {state === STATE_RECORDING && 'escuchando…'}
            {state === STATE_IDLE && 'agente agroecológico'}
          </p>
        </div>
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

      {/* Chat */}
      <ChatHistory
        messages={messages}
        streamingContent={streamingContent}
        isStreaming={state === STATE_THINKING}
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
            placeholder="Escribe tu pregunta..."
            disabled={state !== STATE_IDLE}
            className="flex-1 px-4 py-3 rounded-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || state !== STATE_IDLE}
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
            <p className={`text-center text-xs ${showSlowWarning ? 'text-amber-400' : 'text-violet-400'}`}>
              {showSlowWarning ? 'Chagra IA sigue pensando — toca Cancelar si quieres reintentar' : 'Chagra IA está pensando…'}
            </p>
            <button
              type="button"
              onClick={handleCancelLLM}
              className="text-[10px] px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition-all"
            >
              Cancelar
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
    </div>
  );
}