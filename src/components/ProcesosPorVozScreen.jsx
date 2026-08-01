import { useCallback, useMemo, useState } from 'react';
import { Mic, MicOff, AlertTriangle, RotateCcw, Check, ChevronLeft } from 'lucide-react';
import useVoiceRecorder from '../hooks/useVoiceRecorder';
import { transcribe } from '../services/voiceService';
import { extractEntities } from '../services/entityExtractor';
import { enrichEntitiesWithRag } from '../services/voiceRagEnricher';
import { buildDraftsFromVoice } from '../services/voiceToDraft';
import { useFarmProcessConfirm } from '../hooks/useFarmProcessConfirm';
import FarmProcessConfirmCard from './FarmProcessConfirmCard';
import useAssetStore from '../store/useAssetStore';
import ChagraGrowLoader from './ChagraGrowLoader';

/**
 * ProcesosPorVozScreen — "Procesos por voz": describe en voz alta una labor
 * (siembra/proceso) y Chagra arma un CICLO PRODUCTIVO (FarmProcess) que tú
 * confirmas y queda registrado localmente.
 *
 * Cablea el subsistema FarmProcess (PR #1370, ADR-047/050) que estaba "oscuro"
 * (mergeado sin conectar). Reusa el MISMO pipeline de voz que VoiceCapture
 * (transcribe → extractEntities → enrichEntitiesWithRag) y, en vez de registrar
 * una planta, construye drafts (voiceToDraft) → tarjeta de confirmación editable
 * (FarmProcessConfirmCard, gate humano) → useFarmProcessConfirm → createFarmProcess
 * (escritura atómica local en IndexedDB farm_processes). Offline-first.
 */
const ST = {
  IDLE: 'idle',
  RECORDING: 'recording',
  TRANSCRIBING: 'transcribing',
  EXTRACTING: 'extracting',
  REVIEW: 'review',
  DONE: 'done',
  ERROR: 'error',
};

const fmt = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export default function ProcesosPorVozScreen({ onBack, onSave }) {
  const { audioLevel, durationMs, start, stop, reset, error: recorderError, hardLimitMs } = useVoiceRecorder();
  const lands = useAssetStore((s) => s.lands);

  const [view, setView] = useState(ST.IDLE);
  const [transcription, setTranscription] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [idx, setIdx] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const { status, confirm, reset: resetConfirm } = useFarmProcessConfirm();
  const isSaving = status === 'saving';

  // Lotes/zonas disponibles para el selector de la tarjeta (gate humano).
  const locationOptions = useMemo(
    () =>
      (lands || [])
        .filter((l) => l?.id && l?.attributes?.name)
        .map((l) => ({
          id: l.id,
          type: l.type || 'asset--land',
          name: l.attributes.name,
          label: l.attributes.name,
        })),
    [lands],
  );

  // Resolución para buildDraftsFromVoice. La extracción ya resuelve la ubicación
  // (entity.location) y el slug (entity.cropSlug); acá solo normalizamos. Lo que
  // no quede resuelto, el campesino lo completa en la tarjeta antes de confirmar.
  const resolveLocation = useCallback((loc) => {
    if (loc && loc.id) return { id: loc.id, type: loc.type || 'asset--land', label: loc.name || loc.label };
    return null;
  }, []);

  const reseted = useCallback(() => {
    reset();
    resetConfirm();
    setTranscription('');
    setDrafts([]);
    setIdx(0);
    setErrorMsg('');
    setView(ST.IDLE);
  }, [reset, resetConfirm]);

  const runPipeline = useCallback(async (blob) => {
    setView(ST.TRANSCRIBING);
    setErrorMsg('');
    let text;
    try {
      text = await transcribe(blob);
      setTranscription(text);
    } catch (err) {
      setErrorMsg(`No se pudo transcribir: ${err.message}.`);
      setView(ST.ERROR);
      return;
    }
    setView(ST.EXTRACTING);
    try {
      const extracted = await extractEntities(text);
      const { entities: enriched } = await enrichEntitiesWithRag(extracted).catch(() => ({
        entities: extracted,
      }));
      // Mapa nombre→entidad para reusar el slug/label ya resueltos por la extracción.
      const byCrop = new Map((enriched || []).map((e) => [e.crop, e]));
      const resolveCrop = (crop) => {
        const e = byCrop.get(crop);
        return { slug: e?.cropSlug || '', label: e?.canonical || crop, variety: null };
      };
      const built = buildDraftsFromVoice({
        transcription: text,
        entities: enriched || [],
        processType: 'seeding',
        resolveLocation,
        resolveCrop,
      });
      if (!built.length) {
        setErrorMsg('No entendí ninguna siembra o proceso. Intenta de nuevo, por ejemplo: "sembré 10 fresas en el invernadero".');
        setView(ST.ERROR);
        return;
      }
      setDrafts(built);
      setIdx(0);
      setView(ST.REVIEW);
    } catch (err) {
      setErrorMsg(`No pude entender lo que dijiste: ${err.message}.`);
      setView(ST.ERROR);
    }
  }, [resolveLocation]);

  const handleStart = useCallback(async () => {
    try {
      await start();
      setView(ST.RECORDING);
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo iniciar la grabación');
      setView(ST.ERROR);
    }
  }, [start]);

  const handleStop = useCallback(async () => {
    const result = await stop();
    if (!result || !result.blob || result.blob.size === 0) {
      setErrorMsg('Grabación vacía. Intenta de nuevo.');
      setView(ST.ERROR);
      return;
    }
    await runPipeline(result.blob);
  }, [stop, runPipeline]);

  const handleConfirm = useCallback(async (editedDraft) => {
    try {
      await confirm(editedDraft);
      resetConfirm();
      const next = idx + 1;
      setSavedCount((c) => c + 1);
      if (next < drafts.length) {
        setIdx(next);
      } else {
        onSave?.('Ciclo de cultivo registrado por voz.');
        setView(ST.DONE);
      }
    } catch (err) {
      setErrorMsg(`No se pudo guardar el ciclo: ${err.message}.`);
      setView(ST.ERROR);
    }
  }, [confirm, resetConfirm, idx, drafts.length, onSave]);

  const remainingMs = Math.max(0, (hardLimitMs || 30000) - durationMs);

  return (
    <div className="min-h-[100dvh] text-white">
      <header className="flex items-center gap-2 px-4 pt-[calc(14px+env(safe-area-inset-top))] pb-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver"
          className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold leading-tight">Procesos por voz</h1>
          <p className="text-xs text-slate-400 leading-tight">Cuéntame qué sembraste y armo el ciclo del cultivo.</p>
        </div>
      </header>

      {view === ST.IDLE && (
        <div className="flex flex-col items-center gap-4 py-10 px-4">
          <p className="text-sm text-slate-400 text-center max-w-xs">
            Describe en voz alta, por ejemplo:
            <br />
            <span className="italic text-slate-300">"sembré 10 fresas en el invernadero 1"</span>
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

      {view === ST.RECORDING && (
        <div className="flex flex-col items-center gap-4 py-10 px-4">
          <div className="tabular-nums text-3xl font-mono text-red-400">
            {fmt(durationMs)} <span className="text-slate-500 text-sm">/ {fmt(hardLimitMs || 30000)}</span>
          </div>
          <button
            onClick={handleStop}
            className="w-32 h-32 rounded-full bg-red-600 hover:bg-red-500 active:bg-red-700 flex items-center justify-center shadow-lg animate-pulse"
            aria-label="Detener grabación"
          >
            <MicOff size={56} className="text-white" />
          </button>
          <p className="text-xs text-slate-500">Nivel: {Math.round((audioLevel || 0) * 100)}%</p>
          {remainingMs < 5000 && <p className="text-xs text-amber-400">Se detendrá en {Math.ceil(remainingMs / 1000)}s</p>}
        </div>
      )}

      {(view === ST.TRANSCRIBING || view === ST.EXTRACTING) && (
        <div className="flex flex-col items-center gap-4 py-14 px-4">
          <div className="text-lime-400"><ChagraGrowLoader size={64} /></div>
          <p className="text-sm text-slate-400">
            {view === ST.TRANSCRIBING ? 'Escuchando lo que dijiste…' : 'Armando el ciclo del cultivo…'}
          </p>
          {view === ST.EXTRACTING && transcription && (
            <p className="text-xs text-slate-500 italic max-w-md text-center">"{transcription}"</p>
          )}
        </div>
      )}

      {view === ST.REVIEW && drafts[idx] && (
        <div>
          {drafts.length > 1 && (
            <p className="px-4 text-xs text-slate-400">Ciclo {idx + 1} de {drafts.length}</p>
          )}
          <FarmProcessConfirmCard
            draft={drafts[idx]}
            locationOptions={locationOptions}
            isSaving={isSaving}
            onConfirm={handleConfirm}
            onCancel={reseted}
          />
        </div>
      )}

      {view === ST.ERROR && (
        <div className="flex flex-col items-center gap-4 py-10 px-4">
          <AlertTriangle size={48} className="text-amber-400" />
          <p className="text-sm text-amber-200 text-center max-w-sm">{errorMsg || recorderError || 'Error desconocido'}</p>
          <button onClick={reseted} className="px-6 py-3 min-h-[44px] bg-slate-800 hover:bg-slate-700 rounded-xl font-bold flex items-center gap-2">
            <RotateCcw size={18} /> Reintentar
          </button>
        </div>
      )}

      {view === ST.DONE && (
        <div className="flex flex-col items-center gap-4 py-10 px-4">
          <Check size={48} className="text-green-400" />
          <div className="text-center max-w-xs">
            <p className="text-base font-bold text-green-300">
              {savedCount} ciclo{savedCount > 1 ? 's' : ''} registrado{savedCount > 1 ? 's' : ''} ✓
            </p>
            <p className="text-xs text-slate-400 mt-1">Guardado en tu finca. Se sincronizará cuando haya conexión.</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <button onClick={reseted} className="px-6 py-3 min-h-[44px] bg-lime-700 hover:bg-lime-600 rounded-xl font-bold flex items-center gap-2">
              <Mic size={18} /> Otro proceso
            </button>
            <button onClick={onBack} className="px-6 py-3 min-h-[44px] bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-200">
              Volver
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
