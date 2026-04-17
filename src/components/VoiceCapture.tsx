import React, { useCallback, useEffect, useState } from 'react';
import { Mic, MicOff, Loader2, AlertTriangle, Save, RotateCcw, Ear, BrainCircuit } from 'lucide-react';
import useVoiceRecorder from '../hooks/useVoiceRecorder';
import { transcribe, queueForRetry } from '../services/voiceService';
import { extractEntities } from '../services/entityExtractor';
import { syncManager } from '../services/syncManager';
import { savePayload } from '../services/payloadService';
import { ENV } from '../config/env';
import Sparkline from './common/Sparkline';
import VoiceConfirmation from './VoiceConfirmation';

const formatDuration = (ms) => {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

const STATE_IDLE = 'idle';
const STATE_RECORDING = 'recording';
const STATE_TRANSCRIBING = 'transcribing';
const STATE_EXTRACTING = 'extracting';
const STATE_REVIEW = 'review';
const STATE_ERROR = 'error';
const STATE_DONE = 'done';

/**
 * VoiceCapture — UI principal del módulo de ingreso acústico.
 *
 * Pipeline: grabar → transcribir (Whisper) → extraer (qwen3.5:4b) → revisar
 * humano (VoiceConfirmation) → encolar en pending_transactions.
 *
 * Si transcripción o extracción fallan con error de red, ofrece encolar el
 * Blob en pending_voice_recordings para reintento posterior.
 */
export default function VoiceCapture({ onSave }) {
  const { audioLevel, amplitudeHistory, durationMs, error: recorderError, start, stop, reset, hardLimitMs } = useVoiceRecorder();

  const [view, setView] = useState(STATE_IDLE);
  const [transcription, setTranscription] = useState('');
  const [entities, setEntities] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const refreshPendingCount = useCallback(async () => {
    try {
      const list = await syncManager.getPendingVoiceRecordings();
      setPendingCount(list.length);
    } catch (_) { /* noop */ }
  }, []);

  useEffect(() => { refreshPendingCount(); }, [refreshPendingCount]);

  useEffect(() => {
    const handler = () => refreshPendingCount();
    window.addEventListener('voiceRecordingsPending', handler);
    return () => window.removeEventListener('voiceRecordingsPending', handler);
  }, [refreshPendingCount]);

  const resetAll = useCallback(() => {
    reset();
    setTranscription('');
    setEntities([]);
    setErrorMsg('');
    setView(STATE_IDLE);
  }, [reset]);

  const runPipeline = useCallback(async (blob, durMs) => {
    setView(STATE_TRANSCRIBING);
    setErrorMsg('');
    let text;
    try {
      text = await transcribe(blob);
      setTranscription(text);
    } catch (err) {
      try { await queueForRetry(blob, { reason: `transcribe: ${err.message}`, durationMs: durMs }); }
      catch (_) { /* noop */ }
      await refreshPendingCount();
      setErrorMsg(`No se pudo transcribir: ${err.message}. Audio guardado para reintento.`);
      setView(STATE_ERROR);
      return;
    }

    setView(STATE_EXTRACTING);
    try {
      const extracted = await extractEntities(text);
      setEntities(extracted);
      setView(STATE_REVIEW);
    } catch (err) {
      setErrorMsg(`No se pudieron extraer entidades: ${err.message}. Revisa la transcripción manualmente.`);
      setEntities([]);
      setView(STATE_REVIEW);
    }
  }, [refreshPendingCount]);

  const handleStart = useCallback(async () => {
    try {
      await start();
      setView(STATE_RECORDING);
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo iniciar la grabación');
      setView(STATE_ERROR);
    }
  }, [start]);

  const handleStop = useCallback(async () => {
    const result = await stop();
    if (!result || !result.blob || result.blob.size === 0) {
      setErrorMsg('Grabación vacía. Intenta de nuevo.');
      setView(STATE_ERROR);
      return;
    }
    await runPipeline(result.blob, result.durationMs);
  }, [stop, runPipeline]);

  // Construye un log--seeding identico al de SeedingLog/AssetsDashboard:
  // - Inline asset--plant en relationships.asset (payloadService crea el
  //   asset primero y reemplaza con su UUID antes de POSTear el log).
  // - quantity--standard inline (medida count, etiqueta "Plantulas").
  // - location apuntando a structure o land segun resolvio el usuario.
  // - plant_type relationship si la especie cruzo con FarmOS taxonomy.
  const buildSeedingPayload = useCallback((entity) => {
    const inlinePlant = {
      type: 'asset--plant',
      attributes: {
        name: entity.canonical || entity.crop,
        status: 'active',
        notes: {
          value: `Origen: registro por voz. Transcripcion: "${transcription}".`,
          format: 'plain_text',
        },
      },
      ...(entity.farmosTermId ? {
        relationships: {
          plant_type: {
            data: [{ type: 'taxonomy_term--plant_type', id: entity.farmosTermId }],
          },
        },
      } : {}),
    };

    return {
      data: {
        type: 'log--seeding',
        attributes: {
          name: `Siembra: ${entity.crop} (x${entity.quantity}) [voz]`,
          timestamp: Math.floor(Date.now() / 1000),
          status: 'done',
          notes: {
            value: `Registro por voz. Cantidad declarada: ${entity.quantity}. Transcripcion: "${transcription}".`,
            format: 'plain_text',
          },
        },
        relationships: {
          asset: { data: [inlinePlant] },
          location: {
            data: [{ type: entity.location.type, id: entity.location.id }],
          },
          quantity: {
            data: [{
              type: 'quantity--standard',
              attributes: {
                measure: 'count',
                value: { decimal: String(entity.quantity) },
                label: 'Plantulas',
              },
            }],
          },
        },
      },
    };
  }, [transcription]);

  const handleConfirmSave = useCallback(async (confirmedEntities) => {
    setIsSaving(true);
    let savedCount = 0;
    const errors = [];

    for (const entity of confirmedEntities) {
      try {
        const payload = buildSeedingPayload(entity);
        const result = await savePayload('seeding', payload);
        if (result.success || (result.message || '').toLowerCase().includes('local')) {
          savedCount++;
        } else {
          errors.push(`${entity.crop}: ${result.message || 'desconocido'}`);
        }
      } catch (err) {
        errors.push(`${entity.crop}: ${err.message}`);
      }
    }

    setIsSaving(false);
    if (savedCount > 0) {
      const msg = errors.length > 0
        ? `${savedCount} guardada(s), ${errors.length} con error.`
        : `${savedCount} siembra${savedCount > 1 ? 's' : ''} registrada${savedCount > 1 ? 's' : ''} por voz.`;
      onSave?.(msg);
      setView(STATE_DONE);
    } else {
      setErrorMsg(`No se pudo guardar: ${errors.join('; ')}`);
      setView(STATE_ERROR);
    }
  }, [buildSeedingPayload, onSave]);

  const recorderErr = recorderError;
  const remainingMs = Math.max(0, hardLimitMs - durationMs);

  return (
    <div className="p-4 flex flex-col gap-4 text-white">
      <div className="flex items-center justify-center gap-3 text-2xs text-slate-500 font-mono">
        <span className="inline-flex items-center gap-1" title="Modelo Speech-to-Text (Whisper)">
          <Ear size={11} className="text-slate-400" /> STT: whisper-{ENV.STT_MODEL}
        </span>
        <span className="text-slate-700">•</span>
        <span className="inline-flex items-center gap-1" title="Modelo Natural Language Understanding (Ollama)">
          <BrainCircuit size={11} className="text-slate-400" /> NLU: {ENV.NLU_MODEL}
        </span>
      </div>

      {pendingCount > 0 && (
        <div className="bg-amber-900/20 border border-amber-800/50 rounded-xl p-3 text-xs text-amber-200 flex items-center gap-2">
          <AlertTriangle size={14} />
          {pendingCount} grabación{pendingCount > 1 ? 'es' : ''} pendiente{pendingCount > 1 ? 's' : ''} de reprocesar (offline queue).
        </div>
      )}

      {view === STATE_IDLE && (
        <div className="flex flex-col items-center gap-4 py-8">
          <p className="text-sm text-slate-400 text-center max-w-xs">
            Describe en voz alta lo que registraste, por ejemplo:
            <br />
            <span className="italic text-slate-300">"sembré 10 fresas y 20 lechugas verdes en el invernadero 1"</span>
          </p>
          <button
            onClick={handleStart}
            className="w-32 h-32 rounded-full bg-lime-700 hover:bg-lime-600 active:bg-lime-800 flex items-center justify-center shadow-lg"
            aria-label="Iniciar grabación"
          >
            <Mic size={56} className="text-white" />
          </button>
          <p className="text-xs text-slate-500">Toca para grabar (máx. 30s)</p>
        </div>
      )}

      {view === STATE_RECORDING && (
        <div className="flex flex-col items-center gap-4 py-8">
          <Sparkline values={amplitudeHistory} color="#f87171" width={240} height={48} showLastValue={false} />
          <div className="tabular-nums text-3xl font-mono text-red-400">
            {formatDuration(durationMs)} <span className="text-slate-500 text-sm">/ {formatDuration(hardLimitMs)}</span>
          </div>
          <div className="w-full h-1 bg-slate-800 rounded overflow-hidden">
            <div
              className="h-full bg-red-500 transition-[width] duration-100"
              style={{ width: `${(durationMs / hardLimitMs) * 100}%` }}
            />
          </div>
          <button
            onClick={handleStop}
            className="w-32 h-32 rounded-full bg-red-600 hover:bg-red-500 active:bg-red-700 flex items-center justify-center shadow-lg animate-pulse"
            aria-label="Detener grabación"
          >
            <MicOff size={56} className="text-white" />
          </button>
          <p className="text-xs text-slate-500">Nivel: {Math.round(audioLevel * 100)}%</p>
          {remainingMs < 5000 && (
            <p className="text-xs text-amber-400">Se detendrá en {Math.ceil(remainingMs / 1000)}s</p>
          )}
        </div>
      )}

      {(view === STATE_TRANSCRIBING || view === STATE_EXTRACTING) && (
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 size={48} className="animate-spin text-lime-400" />
          <p className="text-sm text-slate-400">
            {view === STATE_TRANSCRIBING ? 'Transcribiendo audio…' : 'Extrayendo entidades…'}
          </p>
          {view === STATE_EXTRACTING && transcription && (
            <p className="text-xs text-slate-500 italic max-w-md text-center">"{transcription}"</p>
          )}
        </div>
      )}

      {view === STATE_REVIEW && (
        <VoiceConfirmation
          transcription={transcription}
          initialEntities={entities}
          onConfirm={handleConfirmSave}
          onCancel={resetAll}
          isSaving={isSaving}
        />
      )}

      {view === STATE_ERROR && (
        <div className="flex flex-col items-center gap-4 py-8">
          <AlertTriangle size={48} className="text-amber-400" />
          <p className="text-sm text-amber-200 text-center max-w-sm">{errorMsg || recorderErr || 'Error desconocido'}</p>
          <button
            onClick={resetAll}
            className="px-6 py-3 min-h-[44px] bg-slate-800 hover:bg-slate-700 rounded-xl font-bold flex items-center gap-2"
          >
            <RotateCcw size={18} /> Reintentar
          </button>
        </div>
      )}

      {view === STATE_DONE && (
        <div className="flex flex-col items-center gap-4 py-8">
          <Save size={48} className="text-green-400" />
          <p className="text-sm text-green-300 text-center">Registro guardado en la cola de sincronización.</p>
          <button
            onClick={resetAll}
            className="px-6 py-3 min-h-[44px] bg-lime-700 hover:bg-lime-600 rounded-xl font-bold flex items-center gap-2"
          >
            <Mic size={18} /> Nueva grabación
          </button>
        </div>
      )}
    </div>
  );
}
