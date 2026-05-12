import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Mic, MicOff, Send, Sparkles, Wifi, WifiOff } from 'lucide-react';
import useVoiceRecorder from '../../hooks/useVoiceRecorder';
import { transcribe } from '../../services/voiceService';
import { addTurn, getFullHistory, getContextString } from '../../services/conversationMemory';
import { retrieve } from '../../services/ragRetriever';
import { parseIntent, formatIntentDescription } from '../../services/agentIntentParser';
import ChatHistory from './ChatHistory';
import SuggestedActions from './SuggestedActions';
import ActionConfirmModal from '../ActionConfirmModal';
import usePrefsStore from '../../store/usePrefsStore';
import useAssetStore from '../../store/useAssetStore';

const OLLAMA_URL = '/api/ollama/api/chat';

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

  const { durationMs, start: startRecord, stop: stopRecord, reset: resetRecord } = useVoiceRecorder();
  const chatEndRef = useRef(null);

  const loadHistory = useCallback(async () => {
    try {
      const history = await getFullHistory(operatorId, 50);
      setMessages(history);
    } catch (e) {
      console.warn('[Agent] Failed to load history:', e);
    }
  }, [operatorId]);

  useEffect(() => {
    loadHistory();
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
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

    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen3.5:4b',
        messages,
        stream: true,
      }),
    });

    if (!response.ok) throw new Error('LLM no disponible');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              fullContent += data.content;
              setStreamingContent(fullContent);
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }

    return fullContent;
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
      setError('No pude conectarme al asistente. Intenta de nuevo.');
    } finally {
      setState(STATE_IDLE);
      setStreamingContent('');
    }
  };

  const handleVoiceRecord = async () => {
    if (state === STATE_RECORDING) {
      const blob = stopRecord();
      setState(STATE_THINKING);

      try {
        const text = await transcribe(blob);
        if (text) {
          handleSubmit(text);
        } else {
          setState(STATE_IDLE);
          setError('No entendí el audio. Prueba de nuevo.');
        }
} catch (_e) {
        setState(STATE_IDLE);
        setError('Error al transcribir. Habla más claro.');
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