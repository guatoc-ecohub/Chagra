import React, { useState } from 'react';
import { X, Skull, AlertTriangle } from 'lucide-react';

/**
 * PlantCemeteryModal — Workflow para marcar planta como muerta + capturar
 * razón + mostrar lección aprendida.
 *
 * Coherente con dirección educativa Chagra (memoria
 * project_chagra_educational_dimension): "fracaso como currículo". El
 * objetivo NO es esconder o estigmatizar la planta muerta, sino tratarla
 * como dato curatorial — el operador aprende de la pérdida.
 *
 * Workflow:
 * 1. Operador en AssetDetailView de planta activa → tap "Marcar como muerta"
 * 2. Modal pide razón (8 opciones predefinidas + libre)
 * 3. Confirm → emite onConfirm(reason, freeText)
 * 4. Padre ejecuta updateAsset(status='dead') + log--task [PLANT_LOST]
 *
 * Cada razón viene con lección inline para que el operador NO se vaya
 * solo con "perdí mi planta", sino con "perdí mi planta y entendí por qué".
 *
 * Curación preliminar — validar con DR-034 (ciclo de especies). Algunas
 * razones aplican a especies específicas y deben refinarse por piso térmico.
 *
 * Props:
 *   - plantName: string
 *   - onClose: callback cerrar sin marcar
 *   - onConfirm: fn(reason, freeText) — confirma death + persiste
 */

const REASONS = [
  {
    id: 'overwatering',
    label: 'Riego excesivo',
    lesson: 'Las raíces se pudren cuando el sustrato queda saturado por horas. La regla agroecológica: regar profundo pero menos frecuente. Antes de regar, mete el dedo 3 cm en el sustrato — si está húmedo, espera.',
  },
  {
    id: 'underwatering',
    label: 'Riego insuficiente / sequedad',
    lesson: 'Hojas secas en bordes y caída de flores son señales tempranas. En piso térmico cálido y suelos sueltos puede requerir riego diario; en frío con sustrato denso, cada 3-4 días. Observa la planta antes de programar.',
  },
  {
    id: 'pest_disease',
    label: 'Plaga o enfermedad sin tratar a tiempo',
    lesson: 'Toda plaga tiene una ventana de 3-7 días donde es controlable con biopreparados (sulfocálcico, ajo-ají, microorganismos). Después se vuelve sistémica. La observación semanal es prevención.',
  },
  {
    id: 'wrong_soil',
    label: 'Sustrato incorrecto (acidez/compactación)',
    lesson: 'Cada especie tolera un rango de pH y textura. Compactación bloquea oxígeno radicular en 2 semanas. Test casero: si el agua tarda más de 30s en infiltrar, el suelo está compactado — incorpora compost + romper con horca.',
  },
  {
    id: 'temperature',
    label: 'Temperatura inadecuada (heladas / calor extremo)',
    lesson: 'Helada nocturna mata hojas en una sola noche bajo 0°C. Calor sostenido >35°C colapsa fotosíntesis. Conoce el rango de tu especie y protege con mulch + tela antihelada cuando el pronóstico lo exija.',
  },
  {
    id: 'light',
    label: 'Luz insuficiente o excesiva',
    lesson: 'Plantas de sol pleno en sombra se estiran (etiolación) y mueren débiles. Sombra obligatoria en pleno sol queman las hojas. El catálogo Chagra indica radiación óptima por especie — respétala desde la siembra.',
  },
  {
    id: 'transplant_shock',
    label: 'Trasplante mal hecho',
    lesson: 'Raíces desnudas más de 30 minutos al sol matan la planta. Trasplanta al atardecer, con sustrato húmedo, sin romper el cepellón. Riega abundante el primer día y sombrea 3 días.',
  },
  {
    id: 'unknown',
    label: 'No sé / quiero revisar después',
    lesson: 'No saber la causa también es dato. Saca foto del estado final, anota síntomas observados, y cuando vuelvas a sembrar la misma especie revisa esta entrada. La curva de aprendizaje agroecológica es de meses, no días.',
  },
];

export default function PlantCemeteryModal({ plantName, onClose, onConfirm }) {
  const [selectedReason, setSelectedReason] = useState(null);
  const [freeText, setFreeText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!selectedReason || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm(selectedReason, freeText);
    } catch (err) {
      console.error('[PlantCemeteryModal] onConfirm failed:', err);
      setSubmitting(false);
    }
  };

  const reasonObj = REASONS.find((r) => r.id === selectedReason);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="w-full max-w-lg bg-slate-950 border border-slate-700 rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <header className="p-4 bg-gradient-to-r from-slate-900 to-slate-950 border-b border-slate-800 flex items-start gap-3 shrink-0">
          <Skull size={22} className="text-slate-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-200">Cementerio: {plantName}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Aprender de la pérdida. Sin juicio — la agricultura agroecológica se construye también desde lo que no funcionó.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 hover:bg-slate-800 rounded text-slate-400 shrink-0"
          >
            <X size={18} />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">
            ¿Qué crees que pasó?
          </p>
          <div className="space-y-2">
            {REASONS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedReason(r.id)}
                className={`w-full p-3 rounded-xl border text-left transition-all min-h-[48px] ${
                  selectedReason === r.id
                    ? 'bg-amber-900/30 border-amber-700 text-amber-200'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span className="text-sm font-bold">{r.label}</span>
              </button>
            ))}
          </div>

          {/* Lección inline cuando hay razón seleccionada */}
          {reasonObj && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-900/15 border border-emerald-800/40 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-emerald-400" />
                <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
                  Lección aprendida
                </span>
              </div>
              <p className="text-xs text-emerald-200 leading-relaxed">
                {reasonObj.lesson}
              </p>
            </div>
          )}

          {/* Campo libre para detalle */}
          {selectedReason && (
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">
                Notas adicionales (opcional)
              </label>
              <textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                rows="2"
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-200 outline-none focus:border-amber-700"
                placeholder="Síntomas observados, momento del ciclo, contexto climático..."
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="p-3 border-t border-slate-800 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm min-h-[48px]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedReason || submitting}
            className="flex-1 p-3 rounded-xl bg-amber-700 hover:bg-amber-600 active:bg-amber-800 text-white font-bold text-sm min-h-[48px] disabled:bg-slate-800 disabled:text-slate-600"
          >
            {submitting ? 'Guardando…' : 'Mover al cementerio'}
          </button>
        </footer>
      </div>
    </div>
  );
}
