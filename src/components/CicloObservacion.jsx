import { useCallback, useState } from 'react';
import { Mic, MicOff, NotebookPen, Check } from 'lucide-react';
import useVoiceRecorder from '../hooks/useVoiceRecorder';
import { transcribe } from '../services/voiceService';
import { registerObservation } from '../services/observationService';
import { registerVoiceObservation } from '../services/voiceObservationService';
import { suggestStageFromText } from '../services/stageSuggestionService';
import { confirmStage } from '../services/stageConfirmationService';

const STAGE_LABELS = {
  sowing: 'Siembra', emergence: 'Brotó', vegetative: 'Creciendo',
  flowering: 'Floración', fruiting: 'Frutos', harvest_window: 'Cosecha', closed: 'Terminado',
};
const baseStage = (c) => String(c || '').replace(/_confirmed$/, '');

/**
 * CicloObservacion — anotar una observación de campo en un ciclo (FarmProcess),
 * por texto o por voz. Cablea el track de observaciones del subsistema
 * FarmProcess (PR #1370, ADR-050) que estaba "oscuro": observationService
 * (texto) + voiceObservationService (voz) → recordFarmEvent (evento del ciclo
 * en IndexedDB). ADITIVO: NO reemplaza el ObservationScreen general (que sigue
 * registrando contra FarmOS); esto ata la nota al ciclo.
 */
export default function CicloObservacion({ processId, processHint, currentStage, onSaved }) {
  const { durationMs, start, stop, reset, error: recorderError } = useVoiceRecorder();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [suggestion, setSuggestion] = useState(null);

  const flashSaved = useCallback((msg) => {
    setSavedMsg(msg);
    setText('');
    onSaved?.();
    setTimeout(() => setSavedMsg(''), 2500);
  }, [onSaved]);

  // Sugiere una etapa fenológica a partir del texto observado; solo si difiere
  // de la etapa actual del ciclo. No cambia nada — espera confirmación humana.
  const maybeSuggestStage = useCallback((observed) => {
    try {
      const s = suggestStageFromText(observed);
      if (s && s.suggestedStage && s.suggestedStage !== baseStage(currentStage)) {
        setSuggestion(s);
      }
    } catch { /* heurística opcional */ }
  }, [currentStage]);

  const confirmSuggested = useCallback(async () => {
    if (!suggestion) return;
    try {
      await confirmStage({ processId, newStage: suggestion.suggestedStage, actor: 'operator', reason: 'sugerida por observación', confidence: suggestion.confidence });
      setSuggestion(null);
      onSaved?.();
    } catch (err) { setErrorMsg(`No se pudo confirmar la etapa: ${err.message}`); }
  }, [suggestion, processId, onSaved]);

  const saveText = useCallback(async () => {
    const t = text.trim();
    if (!t || saving) return;
    setSaving(true);
    setErrorMsg('');
    try {
      await registerObservation({ processId, processHint, text: t, actor: 'operator', source: 'text', evidence: null, extraPayload: null });
      maybeSuggestStage(t);
      flashSaved('Observación guardada.');
    } catch (err) {
      setErrorMsg(`No se pudo guardar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }, [text, saving, processId, processHint, flashSaved, maybeSuggestStage]);

  const toggleVoice = useCallback(async () => {
    if (saving) return;
    if (!recording) {
      setErrorMsg('');
      try {
        await start();
        setRecording(true);
      } catch (err) {
        setErrorMsg(err.message || 'No se pudo grabar');
      }
      return;
    }
    // detener + transcribir + registrar como observación de voz
    setRecording(false);
    setSaving(true);
    try {
      const result = await stop();
      if (!result || !result.blob || result.blob.size === 0) {
        setErrorMsg('Grabación vacía.');
        return;
      }
      const transcription = await transcribe(result.blob);
      await registerVoiceObservation({ processId, processHint, transcription, actor: 'operator' });
      maybeSuggestStage(transcription);
      flashSaved('Observación de voz guardada.');
    } catch (err) {
      setErrorMsg(`No se pudo guardar la voz: ${err.message}`);
    } finally {
      reset();
      setSaving(false);
    }
  }, [recording, saving, start, stop, reset, processId, processHint, flashSaved, maybeSuggestStage]);

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <NotebookPen size={14} className="text-lime-400" />
        <span className="text-2xs uppercase font-bold text-slate-400 tracking-wide">Anotar observación</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="¿Qué viste en el cultivo? (ej. aparecieron pulgones en las hojas nuevas)"
        aria-label="Observación de campo"
        disabled={saving || recording}
        className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-lime-700 resize-none"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleVoice}
          disabled={saving && !recording}
          aria-label={recording ? 'Detener y guardar observación de voz' : 'Anotar observación por voz'}
          className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center ${
            recording ? 'bg-red-600 hover:bg-red-500 animate-pulse' : 'bg-slate-800 hover:bg-slate-700'
          }`}
        >
          {recording ? <MicOff size={18} className="text-white" /> : <Mic size={18} className="text-slate-200" />}
        </button>
        {recording ? (
          <span className="flex-1 text-sm text-red-400 tabular-nums">Grabando… {Math.floor((durationMs || 0) / 1000)}s</span>
        ) : (
          <button
            type="button"
            onClick={saveText}
            disabled={!text.trim() || saving}
            className="flex-1 px-4 py-2.5 min-h-[44px] bg-lime-700 hover:bg-lime-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-bold text-sm"
          >
            {saving ? 'Guardando…' : 'Guardar nota'}
          </button>
        )}
      </div>
      {savedMsg && (
        <p className="text-xs text-green-400 flex items-center gap-1"><Check size={12} /> {savedMsg}</p>
      )}
      {suggestion && (
        <div className="mt-1 bg-lime-900/20 border border-lime-800/50 rounded-lg p-2.5 flex items-center gap-2">
          <span className="flex-1 text-xs text-lime-200">
            Por lo que anotaste, parece etapa <strong>{STAGE_LABELS[suggestion.suggestedStage] || suggestion.suggestedStage}</strong>. ¿La confirmas?
          </span>
          <button type="button" onClick={confirmSuggested} className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-lime-700 hover:bg-lime-600 text-white shrink-0">Sí</button>
          <button type="button" onClick={() => setSuggestion(null)} className="text-xs font-bold px-2 py-1.5 rounded-lg bg-slate-800 text-slate-300 shrink-0">No</button>
        </div>
      )}
      {(errorMsg || recorderError) && <p className="text-xs text-amber-400">{errorMsg || recorderError}</p>}
    </section>
  );
}
