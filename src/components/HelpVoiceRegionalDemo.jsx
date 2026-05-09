import React from 'react';
import { ArrowLeft, Globe } from 'lucide-react';
import HelpVoiceQuestion from './HelpVoiceQuestion';
import usePrefsStore from '../store/usePrefsStore';
import { listAvailableRegions } from '../services/regionalismsService';

export default function HelpVoiceRegionalDemo({ onBackToHome }) {
    const voiceRegion = usePrefsStore((s) => s.voiceRegion);
    const intensity = usePrefsStore((s) => s.voiceRegionIntensity);
    const setVoiceRegion = usePrefsStore((s) => s.setVoiceRegion);
    const setVoiceRegionIntensity = usePrefsStore((s) => s.setVoiceRegionIntensity);
    const regions = listAvailableRegions();
    const selected = regions.find((r) => r.slug === voiceRegion);

    return (
        <div className="h-full w-full flex flex-col">
            {/* Sub-header */}
            <div className="px-4 pt-3 pb-2 flex items-center gap-2 shrink-0 border-b border-slate-800/60 bg-slate-950/60">
                <button onClick={onBackToHome} aria-label="Volver al Manual" className="p-2 -ml-2 rounded-lg active:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center">
                    <ArrowLeft size={20} className="text-violet-400" />
                </button>
                <p className="text-xs uppercase tracking-wider text-violet-400/80 font-bold">Manual</p>
                {/* breadcrumb */}
                <span className="text-slate-600">·</span>
                <p className="text-xs font-bold text-violet-200">Probar voz regional</p>
            </div>

            <main className="flex-1 p-4 max-w-2xl mx-auto w-full overflow-y-auto">
                {/* Heading + región actual */}
                <div className="rounded-xl bg-violet-900/20 border border-violet-700/40 p-4 mb-4">
                    <p className="text-[11px] uppercase tracking-wider text-violet-400 font-bold mb-1">
                        <Globe size={10} className="inline mr-1" /> Modo activo
                    </p>
                    <p className="text-base font-bold text-violet-100">
                        {selected ? selected.label : 'Automático (Cundiboyacense por defecto)'}
                        <span className="text-violet-300 ml-2 text-sm font-normal">
                            · {intensity === 0 ? 'sin regionalismo' : intensity === 1 ? 'sutil (cierre)' : 'full (saludo + cierre)'}
                        </span>
                    </p>
                </div>

                {/* Selector inline compacto (region + intensity) */}
                <div className="rounded-xl bg-slate-900/60 border border-slate-700/50 p-3 mb-4 space-y-2">
                    <select value={voiceRegion} onChange={(e) => setVoiceRegion(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200">
                        <option value="auto">Automático (por ubicación)</option>
                        {regions.map((r) => (<option key={r.slug} value={r.slug}>{r.label}</option>))}
                    </select>
                    <div className="flex gap-2">
                        {[0, 1, 2].map((val) => (
                            <button key={val} onClick={() => setVoiceRegionIntensity(val)} className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${intensity === val ? 'bg-violet-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                                {val === 0 ? 'Off' : val === 1 ? 'Sutil' : 'Full'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Hint pa' el operador */}
                <p className="text-[11px] text-slate-400 italic mb-4 leading-relaxed">
                    Hazle una pregunta libre a la IA agroecológica (ej. "¿cuándo siembro tomate en clima frío?", "¿qué es bocashi?", "¿cómo cuido la lechuga?"). La respuesta vendrá envuelta con el saludo y cierre del tono regional que escogiste.
                </p>

                {/* HelpVoiceQuestion sin speciesSlug = pregunta libre */}
                <HelpVoiceQuestion />
            </main>
        </div>
    );
}
