/* eslint-disable chagra-i18n/no-hardcoded-spanish --
 * Microcopy de UI de la puerta única de registro (#23): rótulos de estados y
 * botones. Migración a src/config/messages.js = tarea i18n de ADR-050
 * (transversal), fuera de alcance — mismo criterio que sus hermanas
 * RegistroVozScreen.jsx / RegistroVozConfirm.jsx. Los errores reales de ESLint
 * siguen activos. */
import React, { useCallback, useState } from 'react';
import { ChevronLeft, PencilLine, Check, AlertTriangle, RotateCcw } from 'lucide-react';
import RegistroVozScreen from './RegistroVozScreen';
import RegistroVozConfirm from './RegistroVozConfirm';
import { INTENTS, INTENT_META } from '../services/voiceFieldExtractor';
import { buildVoicePayload } from '../services/voiceRecordPayload';
import { savePayload } from '../services/payloadService';

/**
 * RegistroUnificadoScreen — PUERTA ÚNICA de "Registrar" (#23).
 *
 * Una sola entrada visible reemplaza las ~5 sueltas (Cosechar, Abonos e
 * insumos, Labores/Mantenimiento, Semilleros, Bitácora/voces dispersas):
 *
 *   VOZ PRIMERO  → RegistroVozScreen (grabar → transcribir → clasificar+extraer
 *                  → confirmar → guardar). El camino principal y recomendado.
 *   A MANO       → un solo formulario ADAPTATIVO (RegistroVozConfirm partiendo de
 *                  un registro en blanco): un selector de tipo arriba cambia los
 *                  campos según la intención (cosecha / insumo / labor /
 *                  observación / plaga / siembra / planta).
 *
 * AMBOS caminos ESCRIBEN con la MISMA lógica ya probada: buildVoicePayload →
 * savePayload (FarmOS online, o cola offline → Cuaderno de campo). No reinventa
 * el contrato de escritura de las pantallas viejas; lo reusa. Las pantallas
 * separadas siguen vivas y accesibles internamente; solo la entrada es una.
 *
 * Va GATED tras `registroUnificadoActivo()` en el call-site (App.jsx): con la
 * flag OFF (prod) el dashboard conserva los tiles separados; con ON (dev) la
 * puerta es esta.
 *
 * Español colombiano (tú/usted), NUNCA voseo argentino.
 *
 * @param {Object} props
 * @param {Function} props.onBack - Volver al dashboard.
 * @param {Function} [props.onSave] - Toast tras guardar (showToast de App).
 */

const MODE = { VOICE: 'voice', MANUAL: 'manual', SAVING: 'saving', DONE: 'done', ERROR: 'error' };

/** Registro EN BLANCO para el camino manual: sin transcripción, source manual. */
function blankRecord(intent = INTENTS.COSECHA) {
  return {
    intent,
    secondary: null,
    confidence: 1,
    source: 'manual',
    transcription: '',
    species: [],
    speciesHint: null,
    measures: {},
    phenology: [],
    symptoms: [],
    pest: null,
    labors: [],
    input: null,
    position: { raw: '', locative: false },
    time: { raw: '', offsetDays: 0 },
    timestampMs: Date.now(),
  };
}

export default function RegistroUnificadoScreen({ onBack, onSave }) {
  const [mode, setMode] = useState(MODE.VOICE);
  const [record] = useState(() => blankRecord());
  const [errorMsg, setErrorMsg] = useState('');
  const [savedKind, setSavedKind] = useState('');
  const [savedOffline, setSavedOffline] = useState(false);

  // Guardado del camino MANUAL: misma tubería que el de voz.
  const handleManualConfirm = useCallback(async (edited, ctx) => {
    setMode(MODE.SAVING);
    setErrorMsg('');
    try {
      const { saveType, payload } = buildVoicePayload({ ...edited, source: 'manual' }, ctx);
      const result = await savePayload(saveType, payload);
      const offline = !result.success || (result.message || '').toLowerCase().includes('local');
      if (result.success || offline) {
        const label = INTENT_META[edited.intent]?.label || 'Registro';
        setSavedKind(label);
        setSavedOffline(offline);
        onSave?.(`${label} guardado.`);
        setMode(MODE.DONE);
      } else {
        setErrorMsg(result.message || 'No se pudo guardar.');
        setMode(MODE.ERROR);
      }
    } catch (err) {
      setErrorMsg(`No se pudo guardar: ${err.message}`);
      setMode(MODE.ERROR);
    }
  }, [onSave]);

  if (mode === MODE.VOICE) {
    return (
      <RegistroVozScreen
        onBack={onBack}
        onSave={onSave}
        onManual={() => setMode(MODE.MANUAL)}
      />
    );
  }

  if (mode === MODE.MANUAL || mode === MODE.SAVING) {
    return (
      <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col" data-testid="registro-unificado-manual">
        <header className="flex items-center gap-2 px-4 pt-[calc(14px+env(safe-area-inset-top))] pb-2">
          <button
            type="button"
            onClick={() => setMode(MODE.VOICE)}
            aria-label="Volver a registrar hablando"
            className="w-11 h-11 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <PencilLine size={18} className="text-lime-400 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight truncate">Registrar a mano</h1>
              <p className="text-xs text-slate-400 leading-tight">Elija qué registra y llene los campos.</p>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">
          <RegistroVozConfirm
            record={record}
            onConfirm={handleManualConfirm}
            onCancel={() => setMode(MODE.VOICE)}
            isSaving={mode === MODE.SAVING}
          />
        </div>
      </div>
    );
  }

  if (mode === MODE.ERROR) {
    return (
      <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col items-center justify-center gap-4 px-4" data-testid="registro-unificado-error" aria-live="polite">
        <div className="w-20 h-20 rounded-full bg-amber-950/60 border border-amber-800/60 flex items-center justify-center">
          <AlertTriangle size={40} className="text-amber-400" aria-hidden="true" />
        </div>
        <div className="text-center max-w-sm">
          <p className="text-base font-bold text-amber-200">No se pudo guardar</p>
          <p className="text-sm text-amber-200/80 mt-1 leading-snug">{errorMsg || 'Error desconocido'}</p>
        </div>
        <div className="flex flex-wrap gap-2.5 justify-center">
          <button onClick={() => setMode(MODE.MANUAL)} className="px-6 py-3.5 min-h-[52px] bg-lime-700 hover:bg-lime-600 rounded-xl font-bold text-base flex items-center gap-2 shadow-lg shadow-lime-900/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300">
            <RotateCcw size={18} aria-hidden="true" /> Intentar de nuevo
          </button>
          <button onClick={onBack} className="px-6 py-3.5 min-h-[52px] bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-base text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
            Volver
          </button>
        </div>
      </div>
    );
  }

  // DONE
  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col items-center justify-center gap-4 px-4" data-testid="registro-unificado-done" aria-live="polite">
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
      <div className="flex flex-wrap gap-2 justify-center">
        <button onClick={onBack} className="px-6 py-3.5 min-h-[52px] bg-lime-700 hover:bg-lime-600 rounded-xl font-bold text-base shadow-lg shadow-lime-900/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300">
          Volver a la finca
        </button>
      </div>
    </div>
  );
}
