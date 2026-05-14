import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Mic, MicOff, Send, Sparkles, Wifi, WifiOff, Volume2, VolumeX } from 'lucide-react';
import useVoiceRecorder from '../../hooks/useVoiceRecorder';
import { transcribe } from '../../services/voiceService';
import { addTurn, getFullHistory, getContextString } from '../../services/conversationMemory';
import { retrieve } from '../../services/ragRetriever';
import { parseIntent, formatIntentDescription } from '../../services/agentIntentParser';
import { streamOpenAI } from '../../services/openaiStream';
import { speak, speakKokoro, stop, init as initTTS, isSupported, isKokoroAvailable } from '../../services/ttsService';
import ChatHistory from './ChatHistory';
import SuggestedActions from './SuggestedActions';
import ActionConfirmModal from '../ActionConfirmModal';
import usePrefsStore from '../../store/usePrefsStore';
import useAssetStore from '../../store/useAssetStore';

// Ollama OpenAI-compatible en /api/ollama/v1/chat/completions (proxy Nginx
// alpha → 127.0.0.1:11434). Migrado de regreso a Ollama+gemma3:4b según
// bench empírico 2026-05-14 — gemma3:4b winner (14.9 t/s, 3.3 GB RAM, Tier A
// papa criolla/oca/cubio) vs OLMoE/Qwen 2.5/Qwen 3 que fallaron en
// CPU Ryzen 4600G UMA (gibberish / 3.2 t/s / no-Tier-A). ADR-040 retiene
// llama.cpp+Qwen como track futuro GBNF function calling Fase 1.
const LLM_URL = '/api/ollama/v1/chat/completions';

const STATE_IDLE = 'idle';
const STATE_RECORDING = 'recording';
const STATE_THINKING = 'thinking';

export default function AgentScreen({ onBack }) {
  const operatorId = usePrefsStore((s) => s.operatorId) || 'default-operator';
  const plants = useAssetStore((s) => s.plants);

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

  const { durationMs, start: startRecord, stop: stopRecord, reset: resetRecord } = useVoiceRecorder();
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingContent]);

  const loadHistory = useCallback(async () => {
    try {
      const history = await getFullHistory(operatorId, 50);
      setMessages(history);
    } catch (e) {
      console.warn('[Agent] Failed to load history:', e);
    }
  }, [operatorId]);

  useEffect(() => {
    initTTS();
    isKokoroAvailable().then(setKokoroReady);
    loadHistory();
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      stop();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadHistory]);

  const getSystemPrompt = useCallback(() => {
    const plantNames = plants?.map((p) => p.attributes?.name).filter(Boolean).join(', ') || 'ninguna';
    return `Eres un asistente agroecológico en Colombia. El usuario tiene estas plantas: ${plantNames}. Responde en español, sé helpful y específico. Si no sabes algo, dilo honestamente.`;
  }, [plants]);

  const handleActionApprove = async (params) => {
    const { intent } = actionModal;
    const addLog = useAssetStore.getState().addLog;

    if (intent && intent.toolName === 'crear_log' && addLog) {
      const assetId = params.asset_id || plants?.[0]?.id;
      if (assetId) {
        await addLog(assetId, {
          type: intent.logType,
          attributes: {
            notes: params.notes || formatIntentDescription(intent),
            timestamp: new Date().toISOString(),
            ...(params.quantity && params.unit && { quantity: { value: params.quantity, unit: params.unit } }),
          },
          relationships: {
            asset: { data: { type: 'asset', id: assetId } },
          },
        });

        const successMsg = {
          role: 'assistant',
          content: `Listo. He registrado la ${intent.logType.replace('log--', '')} en tu bitácora.`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, successMsg]);
      }
    }

    setActionModal({ isOpen: false, intent: null, llmResponse: '' });
  };

  const handleActionReject = () => {
    setActionModal({ isOpen: false, intent: null, llmResponse: '' });
  };

  const handleActionEdit = async (params) => {
    await handleActionApprove(params);
  };

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

    try {
      return await streamOpenAI(
        LLM_URL,
        {
          model: 'gemma3:4b',
          messages,
          temperature: 0.7,
          max_tokens: 512,
        },
        (_chunk, fullText) => setStreamingContent(fullText),
      );
    } catch (e) {
      if (e.name === 'AbortError') {
        throw new Error('Tiempo agotado, conexion lenta');
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
    }
  };

  const handleSubmit = async (text) => {
    if (!text.trim() || state !== STATE_IDLE) return;

    const userMessage = {
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setStreamingContent('');
    setState(STATE_THINKING);
    setError('');

    try {
      await addTurn(operatorId, { role: 'user', content: text.trim() });

      const contextMemory = await getContextString(operatorId, 10);
      const contextCorpus = await retrieve(text, 3);

      const response = await callLLM(text, contextMemory, contextCorpus);

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

      if (intent && intent.toolName === 'crear_log') {
        setActionModal({
          isOpen: true,
          intent,
          llmResponse: response,
        });
        setState(STATE_IDLE);
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
          handleSubmit(text);
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
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-slate-800 bg-slate-900/80 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 rounded-lg active:bg-slate-800"
        >
          <ArrowLeft size={20} className="text-amber-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles size={18} className="text-violet-400" />
            Asistente IA
          </h1>
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
          <p className="text-center text-xs text-violet-400 mt-2">
            Pensando...
          </p>
        )}
      </div>

      <div ref={chatEndRef} />

      {/* Action Confirmation Modal */}
      <ActionConfirmModal
        isOpen={actionModal.isOpen}
        toolName={actionModal.intent?.toolName || ''}
        description={actionModal.intent ? formatIntentDescription(actionModal.intent) : ''}
        parameters={actionModal.intent?.parameters || {}}
        intent={actionModal.intent}
        llm_response={actionModal.llmResponse}
        onApprove={handleActionApprove}
        onReject={handleActionReject}
        onEdit={handleActionEdit}
      />
    </div>
  );
}