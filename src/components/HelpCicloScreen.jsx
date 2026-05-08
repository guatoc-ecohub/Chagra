import React from 'react';
import { ArrowLeft, ChevronRight, Clock } from 'lucide-react';
import HelpCycleSection from './HelpCycleSection.jsx';

/**
 * Sub-vista del Manual: Aprende sembrando. Wrapper del HelpCycleSection
 * (accordion por especie ya rediseñado en PR #201) + filosofía + meta-info.
 */
export default function HelpCicloScreen({ onBackToHome }) {
  return (
    <div className="h-full w-full flex flex-col">
      {/* Sub-header con back to home del Manual */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2 shrink-0 border-b border-slate-800/60 bg-slate-950/60">
        <button
          type="button"
          onClick={onBackToHome}
          aria-label="Volver al Manual"
          className="p-2 -ml-2 rounded-lg active:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center"
        >
          <ArrowLeft size={20} className="text-pink-400" />
        </button>
        <p className="text-xs uppercase tracking-wider text-pink-400/80 font-bold">Manual</p>
        <ChevronRight size={14} className="text-slate-600" />
        <p className="text-xs font-bold text-pink-200">Aprende sembrando</p>
      </div>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full pb-12 flex flex-col gap-4">
        <p className="text-sm text-slate-300 leading-relaxed">
          Punto de partida educativo para empezar desde cero. No solo cómo usar Chagra: cómo cultivar.
          Toca cada especie para abrir su corpus consolidado y, si quieres, hazle una pregunta por voz a la IA.
        </p>

        {/* Accordion principal por especie (PR #201) */}
        <HelpCycleSection />

        <div className="rounded-xl bg-emerald-900/15 border border-emerald-800/40 p-4">
          <p className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold mb-2">Cada ciclo cubre</p>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-5 leading-relaxed">
            <li><strong>Preparación de tierra</strong>: matera (mezcla recomendada) vs campo abierto (descompactación + biopreparados)</li>
            <li><strong>Germinación + propagación</strong>: semilla, esqueje, acodo, división, injerto (según especie)</li>
            <li><strong>Hitos del ciclo</strong>: día por día, criterio observable + acción clave</li>
            <li><strong>Razones comunes de fracaso</strong>: top 5 con prevención agroecológica + frecuencia esperada</li>
            <li><strong>Compañeros validados</strong> y antagonistas: qué NO sembrar cerca</li>
            <li><strong>Biopreparados</strong>: bocashi, biol, caldo sulfocálcico, M-5, Trichoderma</li>
            <li><strong>Rangos conservadores de cosecha</strong>: anti-overpromise vs literatura comercial</li>
          </ul>
        </div>

        <div className="rounded-xl bg-amber-900/15 border border-amber-800/40 p-4 flex items-start gap-2">
          <Clock size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-100 leading-relaxed">
            <strong className="text-amber-300">Filosofía:</strong> no prometemos éxito instantáneo. Sembrar es un proceso de meses-años. Documentamos también lo que NO funcionó para que cada operador aprenda de la pérdida sin estigma. El cementerio de plantas es currículo, no fracaso.
          </p>
        </div>

        <p className="text-[10px] text-slate-600 italic mt-2 leading-relaxed">
          Corpus consolidado DR-034 (Claude web + Gemini DR + DeepSeek V3, convergencia 3/3) + plan curación humana presencial 4h por especie advanced (aguacate → café → tomate). Datos calibrados anti-overpromise, rangos agroecológicos colombianos. NO hidroponía.
        </p>
      </main>
    </div>
  );
}
