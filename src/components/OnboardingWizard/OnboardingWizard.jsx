import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Sprout } from 'lucide-react';
import WelcomeStep from './WelcomeStep';
import SoilAnalysisStep from './SoilAnalysisStep';
import SpeciesSelectionStep from './SpeciesSelectionStep';
import SummaryStep from './SummaryStep';

const STEPS = [
  { id: 'welcome', label: 'Bienvenida' },
  { id: 'soil', label: 'Suelo' },
  { id: 'species', label: 'Especies' },
  { id: 'summary', label: 'Resumen' },
];

const DEFAULT_STATE = {
  escala: null,
  tipo_espacio: null,
  soil: {
    ph: '',
    textura: '',
    materia_organica: '',
    notas: '',
  },
  selectedSpecies: [],
};

export default function OnboardingWizard({ onComplete, onBack }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState(DEFAULT_STATE);

  const stepId = STEPS[currentStep].id;

  const updateData = (patch) => {
    setWizardData((prev) => ({ ...prev, ...patch }));
  };

  const next = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  };

  const prev = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const canNext = () => {
    if (stepId === 'welcome') return !!(wizardData.escala && wizardData.tipo_espacio);
    if (stepId === 'soil') return true;
    if (stepId === 'species') return wizardData.selectedSpecies.length > 0;
    return true;
  };

  const renderStep = () => {
    switch (stepId) {
      case 'welcome':
        return (
          <WelcomeStep
            data={wizardData}
            onUpdate={updateData}
          />
        );
      case 'soil':
        return (
          <SoilAnalysisStep
            data={wizardData.soil}
            onUpdate={(soil) => updateData({ soil })}
          />
        );
      case 'species':
        return (
          <SpeciesSelectionStep
            data={wizardData}
            onUpdate={updateData}
          />
        );
      case 'summary':
        return (
          <SummaryStep
            data={wizardData}
            onComplete={onComplete}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-white flex flex-col overflow-hidden">
      <header className="p-4 shrink-0 bg-slate-950/95 border-b border-slate-800 flex items-center gap-3">
        <button
          type="button"
          onClick={currentStep === 0 ? onBack : prev}
          aria-label={currentStep === 0 ? 'Cerrar wizard' : 'Anterior'}
          className="p-3 bg-slate-800 rounded-full active:bg-slate-700 min-h-[48px] min-w-[48px] flex items-center justify-center"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Sprout size={22} className="text-emerald-400 shrink-0" />
          <h2 className="text-xl font-black tracking-tight truncate">Configurar Finca</h2>
        </div>
      </header>

      <div className="px-4 py-3 shrink-0 flex items-center gap-2 bg-slate-900/50 border-b border-slate-800/50">
        {STEPS.map((step, idx) => (
          <React.Fragment key={step.id}>
            <div className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                  idx < currentStep
                    ? 'bg-emerald-600 text-white'
                    : idx === currentStep
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {idx < currentStep ? '✓' : idx + 1}
              </div>
              <span className={`text-[10px] font-bold hidden sm:block ${
                idx === currentStep ? 'text-emerald-400' : idx < currentStep ? 'text-slate-400' : 'text-slate-600'
              }`}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`flex-1 h-px min-w-[12px] ${
                idx < currentStep ? 'bg-emerald-600' : 'bg-slate-800'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      <main className="flex-1 overflow-y-auto p-4 pb-6">
        {renderStep()}
      </main>

      {stepId !== 'summary' && (
        <div className="p-4 border-t border-slate-800 shrink-0 bg-slate-950/95">
          <button
            type="button"
            onClick={next}
            disabled={!canNext()}
            className={`w-full p-4 rounded-xl font-black flex items-center justify-center gap-2 min-h-[56px] transition-all ${
              canNext()
                ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            Siguiente <ArrowRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}