import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Mic, MicOff, AlertTriangle, Save, RotateCcw, Ear, BrainCircuit } from 'lucide-react';
import useVoiceRecorder from '../hooks/useVoiceRecorder';
import { transcribe, queueForRetry } from '../services/voiceService';
import { extractEntities } from '../services/entityExtractor';
import { syncManager } from '../services/syncManager';
import { savePayload } from '../services/payloadService';
import { ENV } from '../config/env';
import { resolveSpeciesDefaults } from '../config/speciesDefaults';
import useAssetStore from '../store/useAssetStore';
import Sparkline from './common/Sparkline';
import AIStreamPanel from './common/AIStreamPanel';
import VoiceConfirmation from './VoiceConfirmation';
import ChagraGrowLoader from './ChagraGrowLoader';

// Ejemplo adaptativo en STATE_IDLE: usa la primera zona Y la primera planta
// del usuario si las hay. Reduce fricción al mostrar contexto reconocible
// (Miguel 2026-05-03). Fallback a ejemplo genérico si finca vacía.
const buildAdaptiveExample = ({ lands, plants }) => {
  const firstZone = lands?.find((l) => l.attributes?.name)?.attributes?.name;
  const firstPlant = plants?.find((p) => p.attributes?.name)?.attributes?.name;
  if (firstZone && firstPlant) {
    return `"sembré 5 ${firstPlant.toLowerCase()} en ${firstZone.toLowerCase()}"`;
  }
  if (firstZone) {
    return `"sembré 5 lechugas en ${firstZone.toLowerCase()}"`;
  }
  if (firstPlant) {
    return `"sembré 3 ${firstPlant.toLowerCase()} en el balcón"`;
  }
  return '"sembré 10 fresas y 20 lechugas en el invernadero 1"';
};

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

  // Ejemplo adaptativo: lee zonas + plantas del store y arma la frase
  // ejemplo con datos reales del usuario (Miguel UX 2026-05-03).
  const lands = useAssetStore((s) => s.lands);
  const plants = useAssetStore((s) => s.plants);
  const adaptiveExample = useMemo(() => buildAdaptiveExample({ lands, plants }), [lands, plants]);

  const [view, setView] = useState(STATE_IDLE);
  const [transcription, setTranscription] = useState('');
  const [entities, setEntities] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  // Id de la grabación pendiente en reproceso (null = captura en vivo normal).
  // Cuando está seteado, el pipeline completa su ciclo consumiendo el Blob
  // ya persistido y al confirmar guardado se purga de pending_voice.
  const [reprocessingId, setReprocessingId] = useState(null);
  // Texto acumulado del LLM durante la extracción (streaming NDJSON). Se
  // resetea al inicio de cada pipeline y se muestra con efecto typewriter
  // mientras el estado es STATE_EXTRACTING.
  const [liveStream, setLiveStream] = useState('');

  const refreshPendingCount = useCallback(async () => {
    try {
      const list = await syncManager.getPendingVoiceRecordings();
      setPendingCount(list.length);
    } catch (_) { /* noop */ }
  }, []);

  // Sync inicial de pending count en montaje + cuando cambia la callback.
  // setState resultante es benigno: la próxima render no re-dispara este
  // efecto (refreshPendingCount es estable por useCallback).
  // eslint-disable-next-line react-hooks/set-state-in-effect
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
    setReprocessingId(null);
    setLiveStream('');
    setView(STATE_IDLE);
  }, [reset]);

  // Reprocesa la primera grabación encolada: reutiliza el Blob persistido y lo
  // empuja por el pipeline de transcripción + extracción. Al confirmar en la
  // pantalla de revisión, el handler de save borra el registro de pending_voice.
  const reprocessPending = useCallback(async () => {
    try {
      const list = await syncManager.getPendingVoiceRecordings();
      if (list.length === 0) {
        await refreshPendingCount();
        return;
      }
      const [rec] = list;
      setReprocessingId(rec.id);
      setView(STATE_TRANSCRIBING);
      setErrorMsg('');
      setTranscription('');
      setEntities([]);

      let text;
      try {
        text = await transcribe(rec.blob);
        setTranscription(text);
      } catch (err) {
        setErrorMsg(`No se pudo transcribir la grabación pendiente: ${err.message}. Sigue en la cola.`);
        setReprocessingId(null);
        setView(STATE_ERROR);
        return;
      }

      setView(STATE_EXTRACTING);
      setLiveStream('');
      try {
        const extracted = await extractEntities(text, {
          onToken: (_chunk, full) => setLiveStream(full),
        });
        setEntities(extracted);
        setView(STATE_REVIEW);
      } catch (err) {
        setErrorMsg(`No se pudieron extraer entidades: ${err.message}. Revisa la transcripción manualmente.`);
        setEntities([]);
        setView(STATE_REVIEW);
      }
    } catch (err) {
      setErrorMsg(`No se pudo reprocesar: ${err.message}`);
      setReprocessingId(null);
      setView(STATE_ERROR);
    }
  }, [refreshPendingCount]);

  // Descarta la primera grabación pendiente sin procesarla. Útil cuando el
  // audio quedó inutilizable (ruido, vacío, falla de hardware).
  const discardPending = useCallback(async () => {
    try {
      const list = await syncManager.getPendingVoiceRecordings();
      if (list.length === 0) return;
      await syncManager.deleteVoiceRecording(list[0].id);
      await refreshPendingCount();
    } catch (err) {
      console.warn('[VoiceCapture] Error descartando pendiente:', err.message);
    }
  }, [refreshPendingCount]);

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
    setLiveStream('');
    try {
      const extracted = await extractEntities(text, {
        onToken: (_chunk, full) => setLiveStream(full),
      });
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
  //
  // Bug fix v0.6.6: la planta inline necesita SUS PROPIAS relationships
  // location y parent (apuntando a la zona/structure resuelta), no solo el
  // log. Sin esto FarmOS rechaza el POST inline con 422 Unprocessable
  // Content y la voz queda registrada como exitosa pero sin persistir nada.
  // location/parent solo se setean si entity.location es asset--land
  // (parent es exclusivo de jerarquia land); si es asset--structure, solo
  // location se permite.
  const buildSeedingPayload = useCallback((entity) => {
    const locRef = { type: entity.location.type, id: entity.location.id };
    const isLand = entity.location.type === 'asset--land';

    // Relationships obligatorios de la planta inline:
    //   - location: zona o structure donde se siembra (siempre).
    //   - parent:   solo si la location es un land (jerarquia agronomica).
    //   - plant_type: OBLIGATORIO para FarmOS. Si el extractor cruzo con
    //                 la taxonomy (farmosTermId presente), usa ese term
    //                 existente. Si no, crea inline un taxonomy_term con
    //                 el nombre crudo del cultivo (payloadService.savePayload
    //                 resuelve inlines con POST primero y reemplaza por UUID).
    //                 Sin esto, FarmOS devuelve 422 "plant_type: Este
    //                 valor no puede ser nulo".
    const plantTypeRel = entity.farmosTermId
      ? { data: [{ type: 'taxonomy_term--plant_type', id: entity.farmosTermId }] }
      : {
          data: [{
            type: 'taxonomy_term--plant_type',
            attributes: { name: entity.canonical || entity.crop },
          }],
        };
    const inlineRels = {
      location: { data: [locRef] },
      ...(isLand ? { parent: { data: [locRef] } } : {}),
      plant_type: plantTypeRel,
    };

    const inlinePlant = {
      type: 'asset--plant',
      attributes: {
        name: entity.canonical || entity.crop,
        status: 'active',
        notes: {
          value: `Origen: registro por voz. Transcripcion: "${transcription}".`,
        },
      },
      relationships: inlineRels,
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
          },
        },
        relationships: {
          asset: { data: [inlinePlant] },
          location: { data: [locRef] },
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

    // ADR-030 Bloque A Regla 1: expandir entities individual+qty>1 en N entities
    // con qty=1 cada una. Cada entity resultante crea 1 asset+log inline (UUID
    // único). Para entities aggregate o single (qty=1), comportamiento sin cambio.
    const expandedEntities = [];
    for (const entity of confirmedEntities) {
      const defaults = entity.cropSlug ? resolveSpeciesDefaults(entity.cropSlug) : null;
      const trackingMode = defaults?.tracking_mode || 'individual';  // default conservativo
      const qty = parseInt(entity.quantity, 10) || 1;

      if (trackingMode === 'individual' && qty > 1) {
        // Expandir a N entities con qty=1 cada una, name indexado "X #1", "X #2"...
        const padLen = String(qty).length;
        for (let i = 0; i < qty; i++) {
          const indexedName = `${entity.canonical || entity.crop} #${String(i + 1).padStart(padLen, '0')}`;
          expandedEntities.push({
            ...entity,
            quantity: 1,
            canonical: indexedName,  // sobreescribe canonical para el inlinePlant.attributes.name
            _individualIndex: i + 1,
            _individualTotal: qty,
          });
        }
      } else {
        expandedEntities.push(entity);
      }
    }

    for (const entity of expandedEntities) {
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
      // Reproceso exitoso: purgar la grabación de pending_voice para que no
      // reaparezca en el banner en futuras sesiones.
      if (reprocessingId != null) {
        try {
          await syncManager.deleteVoiceRecording(reprocessingId);
        } catch (_) { /* noop */ }
        setReprocessingId(null);
        await refreshPendingCount();
      }
      const msg = errors.length > 0
        ? `${savedCount} guardada(s), ${errors.length} con error.`
        : `${savedCount} siembra${savedCount > 1 ? 's' : ''} registrada${savedCount > 1 ? 's' : ''} por voz.`;
      onSave?.(msg);
      setView(STATE_DONE);
    } else {
      setErrorMsg(`No se pudo guardar: ${errors.join('; ')}`);
      setView(STATE_ERROR);
    }
  }, [buildSeedingPayload, onSave, reprocessingId, refreshPendingCount]);

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
        <div className="bg-amber-900/20 border border-amber-800/50 rounded-xl p-3 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <AlertTriangle size={14} className="shrink-0" />
            <span>
              {pendingCount} grabación{pendingCount > 1 ? 'es' : ''} pendiente{pendingCount > 1 ? 's' : ''} de reprocesar.
            </span>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={reprocessPending}
              disabled={view === STATE_RECORDING || view === STATE_TRANSCRIBING || view === STATE_EXTRACTING || view === STATE_REVIEW || isSaving}
              className="px-3 py-1.5 bg-lime-700 hover:bg-lime-600 active:bg-lime-800 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-bold rounded-lg min-h-[32px]"
            >
              Reprocesar
            </button>
            <button
              type="button"
              onClick={discardPending}
              disabled={view === STATE_TRANSCRIBING || view === STATE_EXTRACTING || isSaving}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-300 text-xs font-bold rounded-lg min-h-[32px]"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {view === STATE_IDLE && (
        <div className="flex flex-col items-center gap-4 py-8">
          <p className="text-sm text-slate-400 text-center max-w-xs">
            Describe en voz alta lo que registraste, por ejemplo:
            <br />
            <span className="italic text-slate-300">{adaptiveExample}</span>
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
          <div className="text-lime-400">
            <ChagraGrowLoader size={64} />
          </div>
          <p className="text-sm text-slate-400">
            {view === STATE_TRANSCRIBING ? 'Transcribiendo audio…' : 'Extrayendo entidades…'}
          </p>
          {view === STATE_EXTRACTING && transcription && (
            <p className="text-xs text-slate-500 italic max-w-md text-center">"{transcription}"</p>
          )}
          {view === STATE_EXTRACTING && (
            <div className="w-full max-w-md mt-1">
              <AIStreamPanel
                text={liveStream}
                active
                label="Extrayendo entidades"
                accent="muzo"
                meta={<span className="font-mono">qwen3.5:4b</span>}
              />
            </div>
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
          <div className="text-center max-w-xs">
            <p className="text-base font-bold text-green-300">Registro guardado ✓</p>
            <p className="text-xs text-slate-400 mt-1">
              Se sincronizará con FarmOS cuando haya conexión. Mientras tanto, lo encontrás en <strong className="text-slate-200">Bitácora → Pendientes</strong>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={resetAll}
              className="px-6 py-3 min-h-[44px] bg-lime-700 hover:bg-lime-600 rounded-xl font-bold flex items-center gap-2"
            >
              <Mic size={18} /> Nueva grabación
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'historial' } }))}
              className="px-6 py-3 min-h-[44px] bg-slate-800 hover:bg-slate-700 rounded-xl font-bold flex items-center gap-2 text-slate-200"
            >
              Ver en Bitácora
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
