/**
 * VoiceSelector — la voz de Chagra (rediseño de mínima fricción, 2026-07-09).
 *
 * El operador quiere que el campesino elija la voz OYENDO, con el mínimo de
 * pasos y sin jerga. Antes había un dropdown + una lista "comparar" + un botón
 * "Guardar" aparte + un slider: demasiados pasos y vocabulario técnico
 * ("catálogo upstream", "acento neutro hispano").
 *
 * Rediseño:
 *   - Una tarjeta GRANDE por voz. UN TOQUE hace dos cosas a la vez: pone esa
 *     voz como la de Chagra (persiste de una, sin botón Guardar) y la
 *     REPRODUCE para que el usuario la oiga. La última que toca queda puesta.
 *   - La voz puesta se marca con un check y "Puesta". Cero jerga.
 *   - Velocidad opcional en 3 botones grandes (Despacio / Normal / Rápido),
 *     no un slider fino.
 *
 * Las voces vienen de KOKORO_VOICES (curadas por el oído del operador). La
 * reproducción usa speakKokoro, que ahora prefiere kokoro SIEMPRE y nunca
 * salta a la voz robótica del navegador (ver ttsService: consistencia de voz).
 */
import React, { useState } from 'react';
import { Volume2, Play, Check } from 'lucide-react';
import {
  speakKokoro,
  stop as stopTTS,
  getPreferredVoice,
  setPreferredVoice,
  getPreferredRate,
  setPreferredRate,
  KOKORO_VOICES,
} from '../../services/ttsService';

const SAMPLE_TEXT =
  'Buenas, soy Chagra. Cuénteme qué le pasa a su matica y le ayudo.';

// Velocidad en 3 pasos claros (mapean al rango soportado por ttsService).
const SPEEDS = [
  { id: 'slow', label: 'Despacio', rate: 0.85 },
  { id: 'normal', label: 'Normal', rate: 1.0 },
  { id: 'fast', label: 'Rápido', rate: 1.1 },
];

function speedIdFromRate(rate) {
  // El más cercano gana (defensivo ante valores viejos como 0.9).
  let best = SPEEDS[1];
  let bestDelta = Infinity;
  for (const s of SPEEDS) {
    const d = Math.abs(s.rate - rate);
    if (d < bestDelta) { bestDelta = d; best = s; }
  }
  return best.id;
}

export default function VoiceSelector() {
  const [selectedVoice, setSelectedVoice] = useState(() => getPreferredVoice());
  const [speedId, setSpeedId] = useState(() => speedIdFromRate(getPreferredRate()));
  const [playingVoice, setPlayingVoice] = useState(null);

  const currentRate = SPEEDS.find((s) => s.id === speedId)?.rate ?? 1.0;

  // UN toque: elige la voz (persiste de una) + la reproduce para oírla.
  const handleChooseAndPlay = async (voiceId) => {
    stopTTS();
    setSelectedVoice(voiceId);
    setPreferredVoice(voiceId); // persiste inmediato — sin botón "Guardar"
    setPlayingVoice(voiceId);
    try {
      await speakKokoro(SAMPLE_TEXT, { voice: voiceId, rate: currentRate });
    } catch (_) {
      // speakKokoro nunca lanza hasta aquí (maneja su propio fallback); si
      // pasara, no rompemos la UI.
    } finally {
      setPlayingVoice(null);
    }
  };

  const handleSpeed = (speed) => {
    setSpeedId(speed.id);
    setPreferredRate(speed.rate);
  };

  return (
    <div
      className="space-y-4 bg-slate-900/40 border border-slate-800 rounded-2xl p-5"
      data-testid="voice-selector"
    >
      <div className="flex items-center gap-2 px-1">
        <Volume2 size={18} className="text-violet-400" />
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          La voz de Chagra
        </h3>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed px-1">
        Toque una voz para escucharla. La que toque queda puesta.
      </p>

      {/* Tarjetas grandes de voz — un toque elige y reproduce. */}
      <div className="flex flex-col gap-3">
        {KOKORO_VOICES.map((voice) => {
          const isSelected = voice.id === selectedVoice;
          const isPlaying = playingVoice === voice.id;
          return (
            <button
              key={voice.id}
              type="button"
              onClick={() => handleChooseAndPlay(voice.id)}
              disabled={playingVoice !== null && !isPlaying}
              data-testid={`voice-option-${voice.id}`}
              aria-pressed={isSelected}
              aria-label={`Voz ${voice.label}. ${isSelected ? 'Puesta. ' : ''}Tocar para escuchar y poner.`}
              className={`w-full text-left rounded-2xl p-4 border transition-all flex items-center gap-4 min-h-[72px] active:scale-[0.99] motion-reduce:active:scale-100 disabled:opacity-50 ${
                isSelected
                  ? 'bg-violet-900/30 border-violet-600/60'
                  : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800'
              }`}
            >
              {/* Círculo de reproducir — señal grande y clara de "tocar = oír". */}
              <span
                className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border ${
                  isSelected
                    ? 'bg-violet-600/40 border-violet-500/60'
                    : 'bg-slate-900/60 border-slate-700'
                }`}
                aria-hidden="true"
              >
                <Play
                  size={22}
                  className={isPlaying ? 'text-violet-300 animate-pulse' : 'text-violet-300'}
                />
              </span>

              <span className="flex flex-col flex-1 min-w-0">
                <span className="text-base font-bold text-white leading-tight">
                  {voice.label}
                </span>
                <span className="text-xs text-slate-400 leading-snug mt-0.5">
                  {isPlaying ? 'Escuchando…' : voice.description}
                </span>
              </span>

              {isSelected && (
                <span
                  className="flex items-center gap-1 text-[11px] font-bold text-violet-300 shrink-0"
                  data-testid={`voice-puesta-${voice.id}`}
                >
                  <Check size={16} aria-hidden="true" /> Puesta
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Velocidad — opcional, 3 botones grandes en vez de un slider fino. */}
      <div className="space-y-2 pt-1">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide px-1">
          Qué tan rápido habla
        </span>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Velocidad de la voz">
          {SPEEDS.map((speed) => {
            const active = speed.id === speedId;
            return (
              <button
                key={speed.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => handleSpeed(speed)}
                data-testid={`voice-speed-${speed.id}`}
                className={`p-3 rounded-xl text-sm font-bold transition-colors min-h-[48px] border ${
                  active
                    ? 'bg-violet-900/30 border-violet-600/60 text-violet-200'
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {speed.label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-slate-500 text-center leading-relaxed">
        Lo que elija se guarda solo, en su teléfono.
      </p>
    </div>
  );
}
