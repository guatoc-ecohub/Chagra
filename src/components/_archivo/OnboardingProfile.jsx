/**
 * Archivado en 2026-07-22 porque el flujo extendido quedo reemplazado por
 * OnboardingCondensado. Las preguntas diferidas siguen disponibles en Perfil.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish -- archivo historico sin uso. */
import React, { useMemo, useState } from 'react';
import {
  Sprout,
  ChevronRight,
  ChevronLeft,
  SkipForward,
  Check,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  getApplicableQuestions,
  getProfile,
  saveProfile,
  markProfileDone,
  markProfileSkipped,
} from '../../services/userProfileService';
import { PISO_TERMICO_INFO } from '../../services/locationService';

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
 * Español colombiano (usted, SIN voseo argentino).
 *
 * Props:
 *   - onComplete(profile): llamado al terminar o saltar todo.
 *   - onClose():           opcional, cierre/atrás global.
 *   - onExplorarEjemplo(): opcional, SKIP rico → sembrar la finca de ejemplo y
 *                          entrar al home ya poblado (demo público). Si no se
 *                          pasa, el botón no se muestra.
 */
/**
 * Ancla VISUAL por pregunta (refinamiento tarea #16, baja alfabetización):
 * cada pregunta abre con un emoji grande + una "miga" de categoría en palabras
 * llanas. La usuaria sabe DE QUÉ le están preguntando antes de leer una letra.
 * Solo presentación: no toca PROFILE_QUESTIONS ni lo que se guarda.
 */
const CATEGORY_META = {
  identidad: { label: 'Sobre usted', emoji: '👋' },
  finca: { label: 'Su tierra', emoji: '🏡' },
  experiencia: { label: 'Su experiencia', emoji: '🌱' },
  objetivos: { label: 'Sus metas', emoji: '🎯' },
  preferencias: { label: 'A su gusto', emoji: '💬' },
};

const QUESTION_EMOJI = {
  nombre: '👋',
  region: '🗺️',
  vocacion: '🧑‍🌾',
  rol: '🌾',
  finca_tipo: '🏡',
  finca_hectareas: '📏',
  finca_altitud: '🏔️',
  invernadero_tiene: '🏠',
  invernadero_forma: '📐',
  invernadero_tamano: '📏',
  composicion: '🌽',
  cultivos_actuales: '🌱',
  animales: '🐄',
  gallinas_manejo: '🐔',
  restauracion_objetivo: '🌳',
  anios_cultivando: '🗓️',
  manejo: '🍃',
  problemas: '🐛',
  objetivo: '🎯',
  cultivos_interes: '✨',
  nivel_respuestas: '💬',
  notif_clima: '🌦️',
  estrato: '🏙️',
  espacio_urbano: '🪟',
  riego: '💧',
};

/**
 * Emoji por OPCIÓN para las preguntas cuyos labels no lo traen ya (varias del
 * catálogo sí: rol, composición, animales...). Ícono legible junto a cada
 * botón = escoger sin leer. Solo presentación.
 */
const OPTION_EMOJI = {
  vocacion: { campesino: '🧑‍🌾', urbano: '🏙️', tecnico: '🔬', curioso: '🌱' },
  finca_tipo: { rural: '⛰️', balcon: '🪟', terraza: '🏠', invernadero: '🏕️' },
  finca_hectareas: { menos_1: '🌱', '1_5': '🌿', '5_20': '🌳', mas_20: '🌲' },
  gallinas_manejo: { libres: '🌾', galpon: '🏠', corral: '🚧', mixto: '🔄' },
  anios_cultivando: { apenas: '🌱', menos_5: '🌿', '5_15': '🌳', toda_vida: '🌲' },
  manejo: { organico: '🍃', convencional: '🧪', mixto: '⚖️', transicion: '🔄' },
  problemas: { plagas: '🐛', enfermedades: '🍂', clima: '🌦️', suelo: '🪨', malezas: '🌿', mercado: '🧺' },
  objetivo: { producir_mas: '🧺', reducir_quimicos: '🍃', aprender: '📖', registrar: '📝', biodiversidad: '🦋', vender: '🤝' },
  nivel_respuestas: { simple: '💬', detallado: '📖', maestro: '🎓' },
  notif_clima: { si: '🔔', no: '🔕' },
  estrato: { '1_2': '🏘️', '3_4': '🏙️', '5_6': '🌆' },
  espacio_urbano: { materas: '🪴', balcon_lleno: '🪟', terraza_grande: '🏠' },
  riego: { lluvia: '🌧️', manguera: '🚿', goteo: '💧', acequia: '⛲' },
};

/**
 * Ejemplos TOCABLES para las preguntas de texto ("mucho ejemplo, poco
 * texto"): un toque llena el campo — la usuaria no tiene que redactar. En las
 * preguntas de lista (cultivos) los toques se van sumando con coma.
 */
const EXAMPLE_CHIPS = {
  region: { values: ['Choachí', 'Fómeque', 'Cauca', 'Boyacá'], append: false },
  cultivos_actuales: { values: ['Café', 'Plátano', 'Tomate', 'Mora', 'Maíz'], append: true },
  cultivos_interes: { values: ['Aguacate', 'Cacao', 'Uchuva', 'Hortalizas'], append: true },
  invernadero_tamano: { values: ['6 x 10 metros', 'Uno pequeño', 'Media hectárea'], append: false },
};

export default function OnboardingProfile({
  onComplete,
  onClose = undefined,
  onExplorarEjemplo = undefined,
  // Inyectadas por el shell de prod (barrido de controles 2026-07-15): prod
  // no pasa onComplete/onClose/onExplorarEjemplo (props específicas del shell
  // viejo) → "Listo", "Saltar todo", la X de cierre y el SKIP rico eran taps
  // muertos: terminabas el onboarding y la pantalla no iba a ningún lado.
  onNavigate = undefined,
  onBack = undefined,
}) {
  // Fallbacks con la MISMA semántica del shell viejo (App.jsx):
  //   onComplete → confirmar ubicación y seguir al home
  //   onClose    → atrás
  //   onExplorarEjemplo → sembrar finca de ejemplo y entrar al home
  const completar = onComplete ?? (onNavigate
    ? () => onNavigate('ubicacion-detectada', { next: 'dashboard' })
    : undefined);
  const cerrar = onClose ?? onBack;
  const explorarEjemploFallback = onNavigate
    ? async () => {
      try {
        const { seedExampleFinca } = await import('../../services/demoFincaEjemplo');
        await seedExampleFinca();
      } catch (err) {
        console.error('[OnboardingProfile] No se pudo sembrar la finca de ejemplo:', err);
      }
      onNavigate('dashboard');
    }
    : undefined;
  const explorarEjemploCb = onExplorarEjemplo ?? explorarEjemploFallback;
  const [answers, setAnswers] = useState(() => getProfile());
  const [index, setIndex] = useState(0);
  const [sembrando, setSembrando] = useState(false);

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
    else if (cerrar) cerrar();
  };

  const skipQuestion = () => {
    goNext();
  };

  const finish = () => {
    markProfileDone();
    const profile = getProfile();
    if (completar) completar(profile);
  };

  const skipAll = () => {
    markProfileSkipped();
    const profile = getProfile();
    if (completar) completar(profile);
  };

  // SKIP rico: marcar el perfil como saltado, sembrar la finca de ejemplo y
  // entrar al home ya poblado. Guard anti-doble-toque mientras siembra.
  const explorarEjemplo = async () => {
    if (sembrando) return;
    setSembrando(true);
    markProfileSkipped();
    try {
      await explorarEjemploCb?.();
    } finally {
      setSembrando(false);
    }
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
              Conozcamos su cultivo
            </h1>
            <p className="text-xs text-slate-400">
              Pregunta {Math.min(index + 1, total)} de {total}
              {progress >= 75 && (
                <span className="text-amber-300 font-medium"> · ¡Ya casi termina!</span>
              )}
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

        {/* Progress bar — más gruesa y con gradiente cálido: el avance se VE
            sin leer el contador (baja alfabetización). */}
        <div
          className="h-2 w-full rounded-full bg-slate-800 overflow-hidden"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-lime-400 transition-all duration-500 ease-out"
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
          onChangeOther={setAnswer}
          extraAnswers={answers}
          onAdvanceSingle={goNext}
        />
      </div>

      {/* Footer nav */}
      <div className="sticky bottom-0 bg-slate-950/95 backdrop-blur border-t border-slate-800 px-4 py-3">
        {/* SKIP rico: explorar con la finca de ejemplo ya poblada (demo público).
            No pide llenar nada — entra a una finca completa (multi-piso, con
            historial y problemas reales). */}
        {typeof explorarEjemploCb === 'function' && (
          <div className="max-w-xl mx-auto mb-2.5">
            <button
              type="button"
              onClick={explorarEjemplo}
              disabled={sembrando}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-700/60 bg-emerald-900/20 text-emerald-200 hover:bg-emerald-900/40 font-medium transition-colors disabled:opacity-60"
              data-testid="onboarding-explorar-ejemplo"
            >
              <Sparkles size={17} />
              {sembrando ? 'Preparando su finca…' : 'Explorar con finca de ejemplo'}
            </button>
          </div>
        )}
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-1 px-3 py-3 min-h-[48px] rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={18} /> Atrás
          </button>

          <button
            type="button"
            onClick={skipQuestion}
            className="px-2 py-3 min-h-[48px] text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2"
          >
            Saltar pregunta
          </button>

          <div className="flex-1" />

          <button
            type="button"
            onClick={goNext}
            className="inline-flex items-center gap-1.5 px-6 py-3 min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-base font-bold shadow-lg shadow-emerald-900/40 transition-all"
          >
            {index >= total - 1 ? (
              <>
                <Check size={19} /> Terminar
              </>
            ) : (
              <>
                Siguiente <ChevronRight size={19} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Quick-pick visual de piso térmico para la pregunta de altitud (baja
 * alfabetización): si el campesino no sabe los msnm, escoge el clima de su
 * tierra con un botón grande (emoji + nombre + rango). Cero fabricación:
 * guarda SOLO `piso_termico` declarado — la altitud numérica real la
 * resuelve y confirma LocationDetectedScreen (GPS/Open-Elevation) después.
 */
function PisoTermicoQuickPick({ selected, onPick }) {
  const pisos = Object.values(PISO_TERMICO_INFO);
  return (
    <div className="mt-4">
      <p className="text-sm text-slate-300 font-medium">
        ¿No sabe los metros? Escoja el clima de su tierra:
      </p>
      <div className="grid grid-cols-2 gap-2.5 mt-2.5">
        {pisos.map((p) => {
          const isSel = selected === p.slug;
          return (
            <button
              key={p.slug}
              type="button"
              onClick={() => onPick(p.slug)}
              aria-pressed={isSel}
              className={`flex flex-col items-center justify-center gap-1 p-3 min-h-[88px] rounded-xl border transition-colors ${
                isSel
                  ? 'bg-emerald-900/30 border-emerald-600 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-600'
              }`}
            >
              <span className="text-3xl" aria-hidden="true">{p.emoji}</span>
              <span className="text-sm font-bold capitalize">{p.label}</span>
              <span className="text-[11px] text-slate-500">{p.rango}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-500 mt-2 leading-relaxed">
        Después afinamos la altura exacta con la ubicación de su finca.
      </p>
    </div>
  );
}

/**
 * Renderiza una pregunta según su `type`.
 *
 * `onChangeOther(id, value)` permite que una pregunta guarde una clave
 * adicional del perfil (ej: la pregunta de altitud guarda `piso_termico`
 * cuando el usuario escoge el clima en vez de escribir msnm).
 */
function QuestionView({ question, value, onChange, onChangeOther, extraAnswers, onAdvanceSingle }) {
  const { type, title, help, options, placeholder, unit } = question;
  const catMeta = CATEGORY_META[question.category] || CATEGORY_META.identidad;
  const emoji = QUESTION_EMOJI[question.id] || catMeta.emoji;
  const optionEmoji = OPTION_EMOJI[question.id] || {};
  const chips = EXAMPLE_CHIPS[question.id];

  // Un toque en un ejemplo llena el campo. En preguntas de lista (cultivos)
  // los toques se suman con coma; repetir el toque no duplica.
  const pickExample = (ejemplo) => {
    if (!chips?.append || !value) {
      onChange(ejemplo);
      return;
    }
    const partes = String(value).split(',').map((s) => s.trim()).filter(Boolean);
    if (partes.some((p) => p.toLowerCase() === ejemplo.toLowerCase())) return;
    onChange([...partes, ejemplo].join(', '));
  };

  return (
    <div className="py-4 anim-brota">
      {/* Ancla visual: emoji grande + miga de categoría. La usuaria ubica el
          tema de la pregunta de un vistazo, antes de leer. */}
      <div className="flex items-center gap-3.5">
        <div
          className="w-16 h-16 shrink-0 rounded-2xl bg-emerald-900/30 border border-emerald-700/40 flex items-center justify-center text-4xl leading-none"
          aria-hidden="true"
        >
          {emoji}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-widest font-bold text-emerald-400/90">
            {catMeta.label}
          </p>
          <h2 className="text-xl font-bold text-white leading-snug mt-0.5">{title}</h2>
        </div>
      </div>
      {help && <p className="text-sm text-slate-400 mt-2.5 leading-relaxed">{help}</p>}

      <div className="mt-5 space-y-2.5">
        {type === 'text' && (
          <>
            <input
              type="text"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              autoFocus
              className="w-full px-4 py-3.5 text-base rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
            />
            {chips && (
              <div className="flex flex-wrap items-center gap-2 pt-1 anim-brota" style={{ '--i': 1 }}>
                <span className="text-xs text-slate-500">Toque un ejemplo:</span>
                {chips.values.map((ej) => (
                  <button
                    key={ej}
                    type="button"
                    onClick={() => pickExample(ej)}
                    className="px-3 py-1.5 rounded-full text-sm bg-slate-900 border border-slate-700 text-slate-300 hover:border-emerald-600 hover:text-emerald-200 active:scale-95 transition-all"
                  >
                    {ej}
                  </button>
                ))}
              </div>
            )}
          </>
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
              className="w-full px-4 py-3.5 text-base rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
            />
            {unit && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">
                {unit}
              </span>
            )}
          </div>
        )}

        {/* Piso térmico visual — solo en la pregunta de altitud. */}
        {question.id === 'finca_altitud' && typeof onChangeOther === 'function' && (
          <PisoTermicoQuickPick
            selected={extraAnswers?.piso_termico}
            onPick={(slug) => onChangeOther('piso_termico', slug)}
          />
        )}

        {type === 'single' &&
          options.map((opt, i) => {
            const selected = value === opt.value;
            const optEmoji = optionEmoji[opt.value];
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
                className={`anim-brota w-full text-left px-4 py-3.5 min-h-[52px] rounded-xl border transition-all active:scale-[0.99] flex items-center justify-between gap-2 ${
                  selected
                    ? 'bg-emerald-900/40 border-emerald-500 ring-1 ring-emerald-500/40 text-white'
                    : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500'
                }`}
                style={{ '--i': i + 1 }}
              >
                <span className="flex items-center gap-2.5 text-[15px]">
                  {optEmoji && (
                    <span className="text-xl leading-none shrink-0" aria-hidden="true">{optEmoji}</span>
                  )}
                  <span>{opt.label}</span>
                </span>
                {selected && <Check size={18} className="text-emerald-400 shrink-0" />}
              </button>
            );
          })}

        {type === 'multi' &&
          options.map((opt, i) => {
            const arr = Array.isArray(value) ? value : [];
            const selected = arr.includes(opt.value);
            const optEmoji = optionEmoji[opt.value];
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
                className={`anim-brota w-full text-left px-4 py-3.5 min-h-[52px] rounded-xl border transition-all active:scale-[0.99] flex items-center justify-between gap-2 ${
                  selected
                    ? 'bg-emerald-900/40 border-emerald-500 ring-1 ring-emerald-500/40 text-white'
                    : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500'
                }`}
                style={{ '--i': i + 1 }}
              >
                <span className="flex items-center gap-2.5 text-[15px]">
                  {optEmoji && (
                    <span className="text-xl leading-none shrink-0" aria-hidden="true">{optEmoji}</span>
                  )}
                  <span>{opt.label}</span>
                </span>
                <span
                  className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                    selected ? 'bg-emerald-600 border-emerald-600' : 'border-slate-600'
                  }`}
                >
                  {selected && <Check size={15} className="text-white" />}
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
