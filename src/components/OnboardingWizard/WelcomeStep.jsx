import React from 'react';

const ESCALA_OPTS = [
  {
    id: 'apartment',
    label: '1 a 10 plantas',
    sub: 'Balcón o apartamento',
    tipo_espacio: 'apartment',
    emoji: '🏠',
    accent: 'border-emerald-500 active:bg-emerald-900/30',
  },
  {
    id: 'small_farm',
    label: '10 a 100 plantas',
    sub: 'Huerto kecil',
    tipo_espacio: 'small_farm',
    emoji: '🌱',
    accent: 'border-lime-500 active:bg-lime-900/30',
  },
  {
    id: 'farm',
    label: '100 a 1000 plantas',
    sub: 'Finca pequeña',
    tipo_espacio: 'farm',
    emoji: '🌿',
    accent: 'border-green-500 active:bg-green-900/30',
  },
  {
    id: 'commercial',
    label: '1000 a 10000 plantas',
    sub: 'Producción comercial',
    tipo_espacio: 'commercial',
    emoji: '🌳',
    accent: 'border-teal-500 active:bg-teal-900/30',
  },
];

export default function WelcomeStep({ data, onUpdate }) {
  const handleSelect = (opt) => {
    onUpdate({
      escala: opt.id,
      tipo_espacio: opt.tipo_espacio,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-white">Bienvenido a Chagra</h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          Antes de empezar, necesitamos conocer tu escala de cultivo para
          ajustar las recomendaciones del catálogo.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Selecciona la escala de tu cultivo
        </p>
        {ESCALA_OPTS.map((opt) => {
          const selected = data.escala === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelect(opt)}
              className={`w-full p-4 rounded-xl border-2 bg-slate-900 flex items-center gap-4 min-h-[72px] transition-all ${opt.accent} ${
                selected ? 'border-2' : 'border-slate-800'
              }`}
              aria-pressed={selected}
            >
              <span className="text-3xl shrink-0" aria-hidden="true">{opt.emoji}</span>
              <div className="flex flex-col items-start">
                <span className="text-base font-black text-white">{opt.label}</span>
                <span className="text-xs text-slate-500">{opt.sub}</span>
              </div>
            </button>
          );
        })}
      </div>

      {data.escala && (
        <div className="p-3 rounded-xl bg-emerald-900/20 border border-emerald-800/40">
          <p className="text-xs text-emerald-400 font-bold">
            Escala: {data.tipo_espacio}
          </p>
        </div>
      )}
    </div>
  );
}