/* eslint-disable chagra-i18n/no-hardcoded-spanish --
 * Los textos de UI de esta pantalla de registro por voz (microcopy de estados,
 * frases-ejemplo, rótulos de botones) son strings de interfaz. Su migración a
 * src/config/messages.js es la TAREA i18n de ADR-050 (transversal a la app),
 * fuera del alcance de #23 — mismo criterio que RegistroVozConfirm.jsx, su
 * pantalla hermana. Los errores reales de ESLint siguen activos. */
import React, { useCallback, useState } from 'react';
import {
  Mic, MicOff, ChevronLeft, AlertTriangle, RotateCcw, Check, Sparkles, PencilLine,
} from 'lucide-react';
import useVoiceRecorder from '../hooks/useVoiceRecorder';
import { transcribe, queueForRetry } from '../services/voiceService';
import { classifyAndExtract } from '../services/voiceRouter';
import { buildVoicePayload } from '../services/voiceRecordPayload';
import { INTENT_META } from '../services/voiceFieldExtractor';
import { savePayload } from '../services/payloadService';
import Sparkline from './common/Sparkline';
import AIStreamPanel from './common/AIStreamPanel';
import ChagraGrowLoader from './ChagraGrowLoader';
import ContextTip from './ContextTip';
import RegistroVozConfirm from './RegistroVozConfirm';

/**
 * RegistroVozScreen — BOTÓN ÚNICO DE VOZ (#23), entrada principal de registro
 * voz-first. Consolida las 3 pantallas de voz en UN solo flujo que clasifica la
 * intención entre TODOS los tipos y extrae los campos:
 *
 *   grabar → transcribir (Whisper) → clasificar+extraer (agente grounded del
 *   sidecar, con fallback on-device offline) → CONFIRMAR (campos editables +
 *   pin GPS) → guardar el registro FarmOS estructurado.
 *
 * Es el "guardar lo que hago" de la mano radial (reemplaza "procesos por voz").
 * Didáctico: muestra frases-ejemplo y las categorías que entiende para que el
 * campesino aprenda qué puede decir. NO toca las ventanas viejas (entrada
 * manual separada, #22).
 */

const ST = {
  IDLE: 'idle',
  RECORDING: 'recording',
  TRANSCRIBING: 'transcribing',
  EXTRACTING: 'extracting',
  REVIEW: 'review',
  SAVING: 'saving',
  DONE: 'done',
  ERROR: 'error',
};

// Frases-ejemplo: cada una ancla una intención distinta para enseñar el rango.
const EXAMPLES = [
  '"aquí tengo un durazno de dos metros, está floriado"',
  '"sembré veinte cebollas largas en la era nueva"',
  '"cogí tres arrobas de mora en el lote de abajo"',
  '"le eché caldo bordelés a los tomates esta mañana"',
  '"hoy podé los duraznos y limpié la maleza"',
  '"la gulupa tiene una telaraña en las puntas"',
];

// Categorías que el flujo entiende (didáctico).
const CATEGORIES = Object.values(INTENT_META);

const fmt = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export default function RegistroVozScreen({ onBack, onSave, onManual = null }) {
  const { audioLevel, amplitudeHistory, durationMs, start, stop, reset, error: recorderError, hardLimitMs } = useVoiceRecorder();

  const [view, setView] = useState(ST.IDLE);
  const [transcription, setTranscription] = useState('');
  const [record, setRecord] = useState(null);
  const [liveStream, setLiveStream] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [recordedAtMs, setRecordedAtMs] = useState(null);
  const [savedKind, setSavedKind] = useState('');
  const [savedOffline, setSavedOffline] = useState(false);

  const resetAll = useCallback(() => {
    reset();
    setTranscription('');
    setRecord(null);
    setLiveStream('');
    setErrorMsg('');
    setRecordedAtMs(null);
    setView(ST.IDLE);
  }, [reset]);

  const runPipeline = useCallback(async (blob, durMs) => {
    setView(ST.TRANSCRIBING);
    setErrorMsg('');
    let text;
    try {
      text = await transcribe(blob);
      setTranscription(text);
    } catch (err) {
      try { await queueForRetry(blob, { reason: `transcribe: ${err.message}`, durationMs: durMs }); } catch (_) { /* noop */ }
      setErrorMsg(`No se pudo transcribir: ${err.message}. El audio quedó guardado para reintentar.`);
      setView(ST.ERROR);
      return;
    }

    setView(ST.EXTRACTING);
    setLiveStream('');
    try {
      const now = (recordedAtMs || Date.now());
      const rec = await classifyAndExtract(text, {
        now,
        onToken: (_chunk, full) => setLiveStream(full),
      });
      setRecord(rec);
      setView(ST.REVIEW);
    } catch (err) {
      // El router degrada solo a on-device; si igual falla, ofrece reintentar.
      setErrorMsg(`No pude entender lo que dijo: ${err.message}. Intente de nuevo.`);
      setView(ST.ERROR);
    }
  }, [recordedAtMs]);

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
      setErrorMsg('La grabación quedó vacía. Intente de nuevo.');
      setView(ST.ERROR);
      return;
    }
    setRecordedAtMs(Date.now() - result.durationMs);
    await runPipeline(result.blob, result.durationMs);
  }, [stop, runPipeline]);

  const handleConfirm = useCallback(async (edited, ctx) => {
    setView(ST.SAVING);
    try {
      const { saveType, payload } = buildVoicePayload(edited, ctx);
      const result = await savePayload(saveType, payload);
      const offline = !result.success || (result.message || '').toLowerCase().includes('local');
      if (result.success || offline) {
        setSavedKind(INTENT_META[edited.intent]?.label || 'Registro');
        setSavedOffline(offline);
        onSave?.(`${INTENT_META[edited.intent]?.label || 'Registro'} guardado por voz.`);
        setView(ST.DONE);
      } else {
        setErrorMsg(result.message || 'No se pudo guardar.');
        setView(ST.ERROR);
      }
    } catch (err) {
      setErrorMsg(`No se pudo guardar: ${err.message}`);
      setView(ST.ERROR);
    }
  }, [onSave]);

  const remainingMs = Math.max(0, (hardLimitMs || 30000) - durationMs);

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col" data-testid="registro-voz">
      <header className="flex items-center gap-2 px-4 pt-[calc(14px+env(safe-area-inset-top))] pb-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver"
          className="w-11 h-11 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <Mic size={18} className="text-lime-400 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate">Registrar hablando</h1>
            <p className="text-xs text-slate-400 leading-tight">Cuénteme qué hizo o qué vio y yo lo guardo.</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {view === ST.IDLE && (
          <div className="flex flex-col items-center gap-5 px-4 py-6">
            <ContextTip id="voz-unica-natural" emoji="🎤" title="Hable natural, como a un amigo" className="w-full max-w-md">
              No tiene que hablar como robot. Diga lo que pasó en la finca; le muestro lo que entendí para que confirme o corrija antes de guardar.
            </ContextTip>

            {/* Botón principal de grabación: halo que respira (solo motion-safe)
                para invitar a tocar sin gritar. El halo es decorativo. */}
            <div className="relative flex items-center justify-center">
              <span
                aria-hidden="true"
                className="absolute w-40 h-40 rounded-full bg-lime-500/15 motion-safe:animate-ping"
                style={{ animationDuration: '2.8s' }}
              />
              <span aria-hidden="true" className="absolute w-40 h-40 rounded-full border border-lime-500/25" />
              <button
                onClick={handleStart}
                className="relative w-32 h-32 rounded-full bg-lime-700 hover:bg-lime-600 active:bg-lime-800 active:scale-95 transition-transform motion-reduce:transition-none flex items-center justify-center shadow-lg shadow-lime-900/50 focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-400/60"
                aria-label="Iniciar grabación"
              >
                <Mic size={56} className="text-white" aria-hidden="true" />
              </button>
            </div>
            <p className="text-sm text-slate-400 font-medium">Toque el botón y hable (máx. 30 s)</p>

            {/* Respaldo manual del flujo unificado (#23): para quien no quiere o
                no puede usar la voz, un solo formulario adaptativo. Solo se
                muestra si el contenedor pasó onManual (flujo unificado). */}
            {onManual && (
              <button
                type="button"
                onClick={onManual}
                className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[48px] rounded-xl bg-slate-800/70 hover:bg-slate-700 border border-slate-700 text-base font-semibold text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
                data-testid="registro-manual-cta"
              >
                <PencilLine size={18} className="text-lime-400" aria-hidden="true" /> O escríbalo a mano
              </button>
            )}

            <div className="w-full max-w-md">
              <p className="text-xs uppercase font-bold text-slate-400 tracking-wide mb-2 flex items-center gap-1.5">
                <Sparkles size={13} className="text-lime-400" aria-hidden="true" /> Por ejemplo, puede decir:
              </p>
              <ul className="flex flex-col gap-1.5">
                {EXAMPLES.map((ex) => (
                  <li key={ex} className="text-sm text-slate-300 italic bg-slate-900/50 border border-slate-800 border-l-2 border-l-lime-600/50 rounded-lg px-3 py-2 leading-snug">
                    {ex}
                  </li>
                ))}
              </ul>
            </div>

            <div className="w-full max-w-md">
              <p className="text-xs uppercase font-bold text-slate-400 tracking-wide mb-2">Entiendo y guardo:</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <span key={c.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-900/60 border border-slate-800 text-slate-300">
                    <span aria-hidden="true">{c.icon}</span> {c.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === ST.RECORDING && (
          <div className="flex flex-col items-center gap-4 py-8 px-4" aria-live="polite">
            <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-950/60 border border-red-800/60 text-sm font-bold text-red-300">
              <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-red-500 motion-safe:animate-pulse" />
              Escuchando… hable ahora
            </p>
            <Sparkline values={amplitudeHistory} color="#f87171" width={240} height={48} showLastValue={false} />
            <div className="tabular-nums text-4xl font-mono text-red-400">
              {fmt(durationMs)} <span className="text-slate-500 text-base">/ {fmt(hardLimitMs || 30000)}</span>
            </div>
            <div className="relative flex items-center justify-center">
              <span
                aria-hidden="true"
                className="absolute w-40 h-40 rounded-full bg-red-500/15 motion-safe:animate-ping"
                style={{ animationDuration: '1.6s' }}
              />
              <button
                onClick={handleStop}
                className="relative w-32 h-32 rounded-full bg-red-600 hover:bg-red-500 active:bg-red-700 active:scale-95 transition-transform motion-reduce:transition-none flex items-center justify-center shadow-lg shadow-red-900/50 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-400/60"
                aria-label="Detener grabación"
              >
                <MicOff size={56} className="text-white" aria-hidden="true" />
              </button>
            </div>
            <p className="text-sm text-slate-400 font-medium">Toque para terminar y guardar</p>
            <p className="text-xs text-slate-500">Nivel: {Math.round((audioLevel || 0) * 100)}%</p>
            {remainingMs < 5000 && (
              <p className="text-sm font-bold text-amber-300 bg-amber-950/50 border border-amber-800/60 rounded-full px-4 py-1.5">
                Se detendrá en {Math.ceil(remainingMs / 1000)} s
              </p>
            )}
          </div>
        )}

        {(view === ST.TRANSCRIBING || view === ST.EXTRACTING) && (
          <div className="flex flex-col items-center gap-4 py-14 px-4" aria-live="polite">
            <div className="text-lime-400"><ChagraGrowLoader size={64} /></div>
            <p className="text-base font-semibold text-slate-200">
              {view === ST.TRANSCRIBING ? 'Anotando lo que dijo…' : 'Organizando el registro…'}
            </p>
            {/* Progreso en dos pasos: anotar → organizar. Sin porcentajes falsos. */}
            <div className="flex items-center gap-2" aria-hidden="true">
              <span className={`w-2 h-2 rounded-full ${view === ST.TRANSCRIBING ? 'bg-lime-400 motion-safe:animate-pulse' : 'bg-lime-600'}`} />
              <span className={`w-2 h-2 rounded-full ${view === ST.EXTRACTING ? 'bg-lime-400 motion-safe:animate-pulse' : 'bg-slate-700'}`} />
            </div>
            <p className="text-xs text-slate-500">Un momento, no cierre la aplicación.</p>
            {view === ST.EXTRACTING && transcription && (
              <p className="text-sm text-slate-400 italic max-w-md text-center leading-snug">"{transcription}"</p>
            )}
            {view === ST.EXTRACTING && liveStream && (
              <div className="w-full max-w-md mt-1">
                <AIStreamPanel text={liveStream} active label="Clasificando" accent="muzo" />
              </div>
            )}
          </div>
        )}

        {(view === ST.REVIEW || view === ST.SAVING) && record && (
          <RegistroVozConfirm
            record={record}
            onConfirm={handleConfirm}
            onCancel={resetAll}
            isSaving={view === ST.SAVING}
          />
        )}

        {view === ST.ERROR && (
          <div className="flex flex-col items-center gap-4 py-10 px-4" aria-live="polite">
            <div className="w-20 h-20 rounded-full bg-amber-950/60 border border-amber-800/60 flex items-center justify-center">
              <AlertTriangle size={40} className="text-amber-400" aria-hidden="true" />
            </div>
            <div className="text-center max-w-sm">
              <p className="text-base font-bold text-amber-200">No se pudo completar</p>
              <p className="text-sm text-amber-200/80 mt-1 leading-snug">{errorMsg || recorderError || 'Error desconocido'}</p>
            </div>
            <button onClick={resetAll} className="px-6 py-3.5 min-h-[52px] bg-lime-700 hover:bg-lime-600 rounded-xl font-bold text-base flex items-center gap-2 shadow-lg shadow-lime-900/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300">
              <RotateCcw size={18} aria-hidden="true" /> Intentar de nuevo
            </button>
          </div>
        )}

        {view === ST.DONE && (
          <div className="flex flex-col items-center gap-4 py-12 px-4" aria-live="polite">
            <div className="w-20 h-20 rounded-full bg-green-950/60 border border-green-800/60 flex items-center justify-center">
              <Check size={40} className="text-green-400" aria-hidden="true" />
            </div>
            <div className="text-center max-w-xs">
              <p className="text-lg font-bold text-green-300">{savedKind} guardado ✓</p>
              <p className="text-sm text-slate-400 mt-1.5 leading-snug">
                {savedOffline
                  ? <>Quedó guardado en su <strong className="text-slate-200">Cuaderno de campo</strong> y se sincronizará con FarmOS cuando haya conexión.</>
                  : <>Sincronizado con FarmOS.</>}
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5 justify-center">
              <button onClick={resetAll} className="px-6 py-3.5 min-h-[52px] bg-lime-700 hover:bg-lime-600 rounded-xl font-bold text-base flex items-center gap-2 shadow-lg shadow-lime-900/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300">
                <Mic size={18} aria-hidden="true" /> Registrar otra cosa
              </button>
              <button onClick={onBack} className="px-6 py-3.5 min-h-[52px] bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-base text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                Volver
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
