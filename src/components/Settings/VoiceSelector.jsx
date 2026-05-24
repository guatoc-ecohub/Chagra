/**
 * VoiceSelector — Task #124 (2026-05-24).
 *
 * Componente de Settings para elegir la voz Kokoro del asistente Chagra
 * y la velocidad de reproducción. Persiste preferencias en localStorage
 * vía `ttsService.setPreferredVoice` / `setPreferredRate`.
 *
 * Diseñado para integrarse dentro de ProfileScreen (sección "Voz del
 * asistente") o cualquier futura pantalla de Ajustes. Mobile-first:
 * botones grandes (min-h 48px), sin scroll horizontal, dropdown nativo
 * que respeta el selector OS en mobile.
 *
 * Contrato UX:
 *   - Dropdown con voces curadas (`KOKORO_VOICES` desde ttsService).
 *   - Botón "Probar" por voz → llama speakKokoro con frase fija.
 *   - Botón "Guardar" persiste voice + rate y flash de confirmación.
 *   - El estado del dropdown es local hasta apretar "Guardar".
 *   - Si Kokoro no está disponible, "Probar" cae al fallback speak()
 *     transparente (lo maneja speakKokoro internamente).
 */
import React, { useState, useRef } from 'react';
import { Volume2, Play, Save, Check } from 'lucide-react';
import {
  speakKokoro,
  stop as stopTTS,
  getPreferredVoice,
  setPreferredVoice,
  getPreferredRate,
  setPreferredRate,
  KOKORO_VOICES,
  DEFAULT_KOKORO_VOICE,
  KOKORO_RATE_MIN,
  KOKORO_RATE_MAX,
} from '../../services/ttsService';

const SAMPLE_TEXT =
  'Hola, soy el asistente Chagra. Probemos cómo suena mi voz en su finca.';

export default function VoiceSelector() {
  const [selectedVoice, setSelectedVoice] = useState(() => getPreferredVoice());
  const [rate, setRate] = useState(() => getPreferredRate());
  const [savedFlash, setSavedFlash] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState(null);
  const flashTimerRef = useRef(null);

  const handlePreview = async (voiceId) => {
    // Cortar cualquier audio previo (preview, agente, lo que sea) antes
    // de mandar el nuevo sample. Sin esto el operador escucha samples
    // encimados si presiona "Probar" varias veces seguidas.
    stopTTS();
    setPreviewingVoice(voiceId);
    try {
      await speakKokoro(SAMPLE_TEXT, { voice: voiceId, rate });
    } catch (_) {
      // speakKokoro ya cae a Web Speech internamente. Si falla hasta acá
      // es algo más raro; no romper la UI por un preview.
    } finally {
      setPreviewingVoice(null);
    }
  };

  const handleSave = () => {
    setPreferredVoice(selectedVoice);
    setPreferredRate(rate);
    setSavedFlash(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setSavedFlash(false), 1500);
  };

  const selectedVoiceMeta =
    KOKORO_VOICES.find((v) => v.id === selectedVoice) ||
    KOKORO_VOICES.find((v) => v.id === DEFAULT_KOKORO_VOICE);

  return (
    <div
      className="space-y-4 bg-slate-900/40 border border-slate-800 rounded-2xl p-5"
      data-testid="voice-selector"
    >
      <div className="flex items-center gap-2 px-1">
        <Volume2 size={18} className="text-violet-400" />
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          Voz del asistente
        </h3>
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed px-1">
        Elija la voz con la que Chagra IA leerá sus respuestas. Pruebe cada
        opción y guarde la que mejor le suene en su finca. Se usa Kokoro
        TTS local; el catálogo upstream tiene varias voces probadas para
        acento más neutro hispano.
      </p>

      <label className="flex flex-col gap-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
          Voz
        </span>
        <select
          value={selectedVoice}
          onChange={(e) => setSelectedVoice(e.target.value)}
          className="p-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-violet-500 outline-none text-white text-base min-h-[48px] appearance-none"
          aria-label="Seleccionar voz del asistente"
          data-testid="voice-dropdown"
        >
          {KOKORO_VOICES.map((voice) => (
            <option key={voice.id} value={voice.id}>
              {voice.label}
            </option>
          ))}
        </select>
        {selectedVoiceMeta && (
          <span className="text-[10px] text-slate-500 leading-snug px-1">
            {selectedVoiceMeta.description}
          </span>
        )}
      </label>

      {/* Botón Probar para la voz seleccionada en el dropdown */}
      <button
        type="button"
        onClick={() => handlePreview(selectedVoice)}
        disabled={previewingVoice !== null}
        className="w-full p-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-violet-400 transition-colors min-h-[48px] disabled:opacity-50"
        data-testid="voice-preview-button"
      >
        <Play size={18} />
        {previewingVoice === selectedVoice
          ? 'Reproduciendo...'
          : 'Probar esta voz'}
      </button>

      {/* Lista de previews rápidos por voz — útil para comparar A/B */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide px-1">
          Comparar voces
        </span>
        <div className="grid grid-cols-1 gap-2">
          {KOKORO_VOICES.map((voice) => (
            <button
              key={voice.id}
              type="button"
              onClick={() => handlePreview(voice.id)}
              disabled={previewingVoice !== null}
              className={`p-3 rounded-xl flex items-center justify-between gap-2 transition-colors min-h-[48px] disabled:opacity-50 ${
                voice.id === selectedVoice
                  ? 'bg-violet-900/30 border border-violet-700/50'
                  : 'bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800'
              }`}
              data-testid={`voice-row-${voice.id}`}
            >
              <span className="flex flex-col items-start text-left flex-1 min-w-0">
                <span className="text-sm font-bold text-slate-200 truncate w-full">
                  {voice.label}
                </span>
                <span className="text-[10px] text-slate-500 truncate w-full">
                  {voice.gender}
                </span>
              </span>
              <Play
                size={16}
                className={
                  previewingVoice === voice.id
                    ? 'text-violet-400 animate-pulse'
                    : 'text-slate-400'
                }
              />
            </button>
          ))}
        </div>
      </div>

      {/* Slider de velocidad */}
      <label className="flex flex-col gap-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
          Velocidad ({rate.toFixed(2)}x)
        </span>
        <input
          type="range"
          min={KOKORO_RATE_MIN}
          max={KOKORO_RATE_MAX}
          step="0.05"
          value={rate}
          onChange={(e) => setRate(Number.parseFloat(e.target.value))}
          className="w-full accent-violet-500 min-h-[24px]"
          aria-label="Velocidad de reproducción de la voz"
          data-testid="voice-rate-slider"
        />
        <div className="flex justify-between text-[10px] text-slate-500 px-1">
          <span>Más lenta ({KOKORO_RATE_MIN}x)</span>
          <span>Más rápida ({KOKORO_RATE_MAX}x)</span>
        </div>
      </label>

      <button
        type="button"
        onClick={handleSave}
        className={`w-full p-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all min-h-[48px] ${
          savedFlash
            ? 'bg-violet-600 text-white'
            : 'bg-slate-800 hover:bg-slate-700 text-violet-400'
        }`}
        data-testid="voice-save-button"
      >
        {savedFlash ? (
          <>
            <Check size={18} /> Guardado
          </>
        ) : (
          <>
            <Save size={18} /> Guardar preferencias
          </>
        )}
      </button>

      <p className="text-[10px] text-slate-500 text-center leading-relaxed">
        Las preferencias se guardan localmente en su dispositivo. La voz
        por defecto es <strong className="text-slate-400">Dora</strong>
        {' '}para no romper a operadores ya acostumbrados.
      </p>
    </div>
  );
}
