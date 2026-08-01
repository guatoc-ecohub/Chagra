import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Globe, Zap } from 'lucide-react';
import usePrefsStore from '../store/usePrefsStore';
import { listAvailableRegions } from '../services/regionalismsService';

/**
 * HelpRegionSelector — Selector de tono regional para la IA de voz.
 *
 * Integrado dentro de HelpHomeScreen como sección colapsable bajo los
 * 4 botones grandes (no como 5to botón, queue/055 spec).
 *
 * Estados:
 *   intensity 0 = off (no overlay)
 *   intensity 1 = sutil (solo cierre regional)
 *   intensity 2 = full (saludo + cierre regional)
 *
 * Anti-apropiación: región amazónica muestra banner de respeto a saberes propios.
 */
/** @param {{ onNavigateToDemo?: () => void }} props */
export default function HelpRegionSelector({ onNavigateToDemo }) {
  const [open, setOpen] = useState(false);
  const voiceRegion = usePrefsStore((s) => s.voiceRegion);
  const voiceRegionIntensity = usePrefsStore((s) => s.voiceRegionIntensity);
  const setVoiceRegion = usePrefsStore((s) => s.setVoiceRegion);
  const setVoiceRegionIntensity = usePrefsStore((s) => s.setVoiceRegionIntensity);

  const regions = listAvailableRegions();
  const selectedRegion = regions.find((r) => r.slug === voiceRegion) || null;
  const showApropiacionNote = voiceRegion === 'amazonica';

  /** @type {any} */
  const regionData = selectedRegion;
  const regionSaludos = /** @type {string[]|undefined} */ (regionData?.saludos);
  const regionCierres = /** @type {string[]|undefined} */ (regionData?.cierres);

  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full p-3 flex items-center gap-2 text-left hover:bg-slate-800/40 transition-colors"
        aria-expanded={open}
        aria-label="Selector de tono regional"
      >
        <Globe size={16} className="text-sky-400 shrink-0" />
        <span className="text-xs font-bold text-slate-300">Tono regional IA</span>
        {selectedRegion ? (
          <span className="text-[11px] text-slate-500 ml-1">· {selectedRegion.label}</span>
        ) : (
          <span className="text-[11px] text-slate-600 ml-1">· automático</span>
        )}
        {open ? (
          <ChevronUp size={14} className="text-slate-500 ml-auto shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-slate-500 ml-auto shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-slate-800/60 pt-3 space-y-4">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Elige el tono regional para las respuestas de la IA de voz agroecológica. El default es sutil
            (solo cierre) para que no se sienta forzado.
          </p>

          {/* Selector de región */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              Región
            </label>
            <select
              value={voiceRegion}
              onChange={(e) => setVoiceRegion(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-600"
            >
              <option value="auto">Automático (por ubicación)</option>
              {regions.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Slider de intensidad */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
              <Zap size={10} /> Intensidad
            </label>
            <div className="flex gap-2">
              {[0, 1, 2].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setVoiceRegionIntensity(val)}
                  className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-colors ${voiceRegionIntensity === val
                      ? 'bg-sky-700 text-white border border-sky-500'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                    }`}
                >
                  {val === 0 ? 'Off' : val === 1 ? 'Sutil' : 'Full'}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-slate-600 px-1">
              <span>sin regionalismo</span>
              <span>saludo + cierre</span>
            </div>
          </div>

          {/* Preview del tono */}
          {voiceRegionIntensity > 0 && selectedRegion && (
            <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-3">
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Preview</p>
              <p className="text-xs text-slate-300 leading-relaxed">
                {voiceRegionIntensity === 2 && regionSaludos?.[0]
                  ? `${regionSaludos[0]}\n\n`
                  : ''}
                Tu respuesta técnica de la IA aparece aquí.
                {voiceRegionIntensity >= 1 && regionCierres?.[0]
                  ? `\n\n${regionCierres[0]}`
                  : ''}
              </p>
            </div>
          )}

          {/* Banner anti-apropiación amazónica */}
          {showApropiacionNote && (
            <div className="rounded-xl bg-amber-900/20 border border-amber-700/40 p-3">
              <p className="text-[11px] text-amber-200 leading-relaxed">
                Las comunidades amazónicas tienen voces propias muy diversas. Esta IA usa registro
                castellano suave reconociendo sus propias voces como saber irreductible.
              </p>
            </div>
          )}

          {/* CTA híbrida */}
          {onNavigateToDemo && voiceRegionIntensity > 0 && (
            <button
              type="button"
              onClick={onNavigateToDemo}
              className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold active:scale-[0.98] transition-all"
            >
              Probar la voz con este tono · pregunta libre IA
            </button>
          )}
        </div>
      )}
    </div>
  );
}