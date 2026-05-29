import React, { useMemo, useState } from 'react';
import {
  Sprout,
  ChevronRight,
  ChevronLeft,
  SkipForward,
  Check,
  Clock,
} from 'lucide-react';
import {
  getApplicableQuestions,
  getProfile,
  saveProfile,
  markProfileDone,
  markProfileSkipped,
} from '../services/userProfileService';

/**
 * OnboardingProfile — flujo de onboarding extendido (#200).
 *
 * Hasta 18 preguntas CONDICIONALES que construyen un perfil rico del
 * usuario (identidad, finca, experiencia, objetivos, preferencias). El
 * perfil se persiste en localStorage `chagra:profile:*` y alimenta al
 * agente vía buildProfileContext (agentService).
 *
 * UX:
 *   - Progress bar arriba.
 *   - Cada pregunta es SKIPPABLE individualmente ("Saltar pregunta").
 *   - Botón global "Saltar todo" (respeta #283, usuarios sin tiempo).
 *   - Preguntas condicionales: la lista visible se recalcula tras cada
 *     respuesta (ej: si "urbano" no se preguntan hectáreas ni altitud).
 *
 * Sin breaking change: este flujo extiende el onboarding base, no lo
 * reemplaza. El piloto (OnboardingPiloto) sigue intacto.
 *
 * Español colombiano (tú/usted, SIN voseo argentino).
 *
 * Props:
 *   - onComplete(profile): llamado al terminar o saltar todo.
 *   - onClose():           opcional, cierre/atrás global.
 */
export default function OnboardingProfile({ onComplete, onClose }) {
  const [answers, setAnswers] = useState(() => getProfile());
  const [index, setIndex] = useState(0);

  // Lista de preguntas aplicables según respuestas acumuladas. Se
  // recalcula en cada render para soportar condicionales.
  const questions = useMemo(() => getApplicableQuestions(answers), [answers]);

  const total = questions.length;
  const current = questions[Math.min(index, total - 1)];
  const progress = total > 0 ? Math.round(((index) / total) * 100) : 0;

  const setAnswer = (id, value) => {
    setAnswers((prev) => {
      const next = { ...prev, [id]: value };
      saveProfile({ [id]: value });
      return next;
    });
  };

  const goNext = () => {
    // Recalcular aplicables con las respuestas más recientes (por si la
    // respuesta actual cambió qué preguntas aplican).
    const applicable = getApplicableQuestions(answers);
    if (index >= applicable.length - 1) {
      finish();
    } else {
      setIndex((i) => i + 1);
    }
  };

  const goBack = () => {
    if (index > 0) setIndex((i) => i - 1);
    else if (onClose) onClose();
  };

  const skipQuestion = () => {
    goNext();
  };

  const finish = () => {
    markProfileDone();
    const profile = getProfile();
    if (onComplete) onComplete(profile);
  };

  const skipAll = () => {
    markProfileSkipped();
    const profile = getProfile();
    if (onComplete) onComplete(profile);
  };

  if (!current) {
    // Nada que preguntar (edge case) → completar.
    return null;
  }

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col">
      {/* Header + progress */}
      <div className="px-4 pt-6 pb-3 max-w-xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-emerald-900/40 border border-emerald-700/50">
            <Sprout size={22} className="text-emerald-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white leading-tight">
              Conozcamos tu cultivo
            </h1>
            <p className="text-xs text-slate-400">
              Pregunta {Math.min(index + 1, total)} de {total}
            </p>
          </div>
          <button
            type="button"
            onClick={skipAll}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 underline underline-offset-2"
          >
            <SkipForward size={13} /> Saltar todo
          </button>
        </div>

        {/* Progress bar */}
        <div
          className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Pregunta actual */}
      <div className="flex-1 px-4 max-w-xl mx-auto w-full">
        <QuestionView
          key={current.id}
          question={current}
          value={answers[current.id]}
          onChange={(v) => setAnswer(current.id, v)}
          onAdvanceSingle={goNext}
        />
      </div>

      {/* Footer nav */}
      <div className="sticky bottom-0 bg-slate-950/95 backdrop-blur border-t border-slate-800 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={18} /> Atrás
          </button>

          <button
            type="button"
            onClick={skipQuestion}
            className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2"
          >
            Saltar pregunta
          </button>

          <div className="flex-1" />

          <button
            type="button"
            onClick={goNext}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 font-medium transition-colors"
          >
            {index >= total - 1 ? (
              <>
                <Check size={18} /> Terminar
              </>
            ) : (
              <>
                Siguiente <ChevronRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Renderiza una pregunta según su `type`.
 */
function QuestionView({ question, value, onChange, onAdvanceSingle }) {
  const { type, title, help, options, placeholder, unit } = question;

  return (
    <div className="py-4">
      <h2 className="text-xl font-bold text-white leading-snug">{title}</h2>
      {help && <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{help}</p>}

      <div className="mt-5 space-y-2.5">
        {type === 'text' && (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            autoFocus
            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
          />
        )}

        {type === 'number' && (
          <div className="relative">
            <input
              type="number"
              inputMode="numeric"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
            />
            {unit && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">
                {unit}
              </span>
            )}
          </div>
        )}

        {type === 'single' &&
          options.map((opt) => {
            const selected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  // Avance automático en preguntas de opción única para
                  // fluidez (estilo encuesta rápida). El usuario igual puede
                  // volver atrás.
                  if (onAdvanceSingle) setTimeout(onAdvanceSingle, 180);
                }}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors flex items-center justify-between gap-2 ${
                  selected
                    ? 'bg-emerald-900/30 border-emerald-600 text-white'
                    : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-600'
                }`}
              >
                <span>{opt.label}</span>
                {selected && <Check size={18} className="text-emerald-400 shrink-0" />}
              </button>
            );
          })}

        {type === 'multi' &&
          options.map((opt) => {
            const arr = Array.isArray(value) ? value : [];
            const selected = arr.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  const next = selected
                    ? arr.filter((v) => v !== opt.value)
                    : [...arr, opt.value];
                  onChange(next);
                }}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors flex items-center justify-between gap-2 ${
                  selected
                    ? 'bg-emerald-900/30 border-emerald-600 text-white'
                    : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-600'
                }`}
              >
                <span>{opt.label}</span>
                <span
                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                    selected ? 'bg-emerald-600 border-emerald-600' : 'border-slate-600'
                  }`}
                >
                  {selected && <Check size={14} className="text-white" />}
                </span>
              </button>
            );
          })}
      </div>

      {type === 'multi' && (
        <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
          <Clock size={12} /> Marca las que apliquen, o sáltala si ninguna.
        </p>
      )}
    </div>
  );
}
