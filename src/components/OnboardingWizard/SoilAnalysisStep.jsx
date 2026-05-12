import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FlaskConical, Building2 } from 'lucide-react';

const TEXTURA_OPTS = ['arena', 'arcilla', 'limo', 'mezcla'];
const MO_OPTS = ['baja', 'media', 'alta'];

function EduCard({ title, children }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
      <h3 className="text-sm font-bold text-emerald-400">{title}</h3>
      {children}
    </div>
  );
}

function ExpandableSection({ title, icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const IconComponent = icon;
  return (
    <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full p-4 flex items-center gap-3 text-left hover:bg-slate-800/30 transition-colors"
      >
        {IconComponent && <IconComponent size={18} className="text-amber-400 shrink-0" />}
        <span className="flex-1 text-sm font-bold text-slate-200">{title}</span>
        {open ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
      </button>
      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          {children}
        </div>
      )}
    </div>
  );
}

export default function SoilAnalysisStep({ data, onUpdate }) {
  const update = (field, value) => {
    onUpdate({ ...data, [field]: value });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-black text-white">Analisis de Suelo</h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          Conocer tu suelo es la base de toda الزراعة agroecologica. Estas
          pruebas caseras te dan una lectura rapida sin laboratorio.
        </p>
      </div>

      <ExpandableSection title="Como hacer analisis de suelo casero" icon={FlaskConical} defaultOpen>
        <EduCard title="Test de pH con vinagre y bicarbonato">
          <ul className="text-xs text-slate-400 space-y-1 list-disc pl-4">
            <li>Toma dos muestras de tierra en vasos separados.</li>
            <li>A la primera agregale vinagre. Si burbujea fuerte, tu suelo es calizo (pH alto).</li>
            <li>A la segunda agregale bicarbonato + agua. Si burbujea, tu suelo es acido (pH bajo).</li>
            <li>Si ninguno reacciona, tu pH esta cerca de neutro (6.5-7).</li>
          </ul>
        </EduCard>

        <EduCard title="Test de textura: la prueba del puno">
          <ul className="text-xs text-slate-400 space-y-1 list-disc pl-4">
            <li>Mojale la tierra hasta tener un barro consistencia Plasticine.</li>
            <li>Intenta hacer un cilindro de 5 cm.</li>
            <li>Si se desmorona: suelo arenoso (drena rapido, retiene poco).</li>
            <li>Si forma cilindro pero se quiebra al doblar: suelo arcilloso (retiene agua, compacta).</li>
            <li>Si forma cilindro flexible: suelo franco (equilibrado).</li>
          </ul>
        </EduCard>

        <EduCard title="Test de materia organica (color)">
          <ul className="text-xs text-slate-400 space-y-1 list-disc pl-4">
            <li>La tierra oscura casi negra indica alta materia organica.</li>
            <li>La tierra cafe grisacea indica materia organica media.</li>
            <li>La tierra cafe clara o beige indica baja materia organica.</li>
            <li>Olor a bosque: materia organica alta y bien descompuesta.</li>
          </ul>
        </EduCard>
      </ExpandableSection>

      <ExpandableSection title="Laboratorios por zona" icon={Building2}>
        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 text-center">
          <p className="text-xs text-slate-500">
            proximamente: directorio de laboratorios de analisis de suelo
            por region Colombia.
          </p>
        </div>
      </ExpandableSection>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Registra tus resultados</h3>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">pH (0 a 14)</span>
          <input
            type="number"
            min="0"
            max="14"
            step="0.1"
            value={data.ph}
            onChange={(e) => update('ph', e.target.value)}
            placeholder="Ej: 6.5"
            className="p-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none text-white text-base min-h-[48px]"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Textura</span>
          <div className="grid grid-cols-2 gap-2">
            {TEXTURA_OPTS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => update('textura', opt)}
                className={`p-3 rounded-xl border text-sm font-bold min-h-[48px] transition-all ${
                  data.textura === opt
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Materia organica</span>
          <div className="grid grid-cols-3 gap-2">
            {MO_OPTS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => update('materia_organica', opt)}
                className={`p-3 rounded-xl border text-sm font-bold min-h-[48px] transition-all ${
                  data.materia_organica === opt
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Notas adicionales</span>
          <textarea
            value={data.notas}
            onChange={(e) => update('notas', e.target.value)}
            placeholder="Ej: olor a bosque, muchas raices superficiales..."
            rows={3}
            className="p-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none text-white text-sm resize-none"
          />
        </label>
      </div>
    </div>
  );
}