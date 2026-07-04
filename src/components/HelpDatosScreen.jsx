import React from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Wifi,
  CloudUpload,
  Smartphone,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Bot,
} from 'lucide-react';
import { IlusDatos, IlusRegistro } from './help/HelpIllustrations.jsx';

/**
 * HelpDatosScreen — Sub-vista del Manual: "¿Dónde se guardan mis datos?".
 *
 * Principio editorial (mismo que task #123, decisión del operador):
 *   CERO hype. 100% verdades auditables. Lo tiene que entender un campesino
 *   colombiano y un niño de 11 años. Español colombiano tú/usted, sin
 *   dialecto rioplatense.
 *
 * Por qué existe:
 *   La pregunta más común y más confusa de la primera semana de piloto fue
 *   "¿por qué veo cosas distintas en el celular y en el computador?". La
 *   respuesta real (datos locales primero, sincronización al iniciar sesión)
 *   nunca estaba escrita en palabras simples. Esta pantalla lo explica con
 *   la metáfora del cuaderno de campo.
 *
 * Arquitectura real que se explica aquí (verificada):
 *   - Todo se guarda primero en el dispositivo (IndexedDB) → funciona offline.
 *   - Con internet + sesión iniciada, los apuntes suben al servidor central.
 *   - Cada dispositivo es su propio cuaderno hasta que inicias sesión en él.
 *   - Si el servidor falla, los datos locales NO se borran (se guardan aparte).
 *   - El chat con la IA NO se sincroniza entre dispositivos (privado por diseño).
 *
 * NO duplica "Sobre el agente Chagra" (task #123): para el detalle de la IA
 * y su privacidad, esta pantalla enlaza a esa sección con un CTA.
 *
 * Integrada como sub-vista 'datos' en HelpManual.jsx (router interno).
 */
export default function HelpDatosScreen({ onBackToHome, onNavigate }) {
  const goAgente = () => {
    if (typeof onNavigate === 'function') onNavigate('agente');
  };

  // Índice tipo FAQ: salta a la pregunta que el usuario tiene en la cabeza.
  // Scroll suave al ancla correspondiente dentro de esta misma pantalla.
  const faqs = [
    { id: 'faq-offline', q: '¿Funciona sin internet?' },
    { id: 'faq-distinto', q: '¿Por qué veo cosas distintas en mis aparatos?' },
    { id: 'faq-perder', q: '¿Puedo perder mis datos?' },
    { id: 'faq-ia', q: '¿Y el chat con la IA?' },
  ];

  const jumpTo = (id) => {
    const el = document.getElementById(id);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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
          <ArrowLeft size={20} className="text-teal-400" />
        </button>
        <p className="text-xs uppercase tracking-wider text-teal-400/80 font-bold">Manual</p>
        <ChevronRight size={14} className="text-slate-600" />
        <p className="text-xs font-bold text-teal-200">¿Dónde se guardan mis datos?</p>
      </div>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full pb-12 flex flex-col gap-6">
        {/* Hero */}
        <div className="flex items-start gap-3">
          <span className="shrink-0 inline-flex items-center justify-center w-14 h-14 rounded-[16px_16px_16px_6px] bg-teal-700/40 border border-teal-500/50">
            <IlusDatos size={36} className="text-teal-200" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-black text-teal-100 leading-tight">
              ¿Dónde se guardan mis datos?
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed mt-1">
              Respuesta corta: primero en tu propio aparato, siempre. Aquí te
              explicamos cómo, con ejemplos del campo.
            </p>
          </div>
        </div>

        {/* Índice FAQ — salta a la pregunta que tienes en la cabeza */}
        <nav aria-label="Preguntas frecuentes sobre tus datos" className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <p className="text-[11px] uppercase tracking-wider text-teal-400/80 font-bold mb-2 px-1">
            Ve directo a tu pregunta
          </p>
          <ul className="flex flex-col gap-1.5">
            {faqs.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => jumpTo(f.id)}
                  className="w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 active:bg-slate-700 text-sm text-slate-200 font-semibold min-h-[44px]"
                >
                  <span className="flex-1">{f.q}</span>
                  <ChevronRight size={16} className="shrink-0 text-slate-500" />
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* La metáfora del cuaderno de campo */}
        <section className="rounded-xl border border-teal-900/60 bg-teal-950/30 p-4">
          <div className="flex items-start gap-3">
            <IlusRegistro size={34} className="text-teal-300 shrink-0 mt-0.5" />
            <div className="text-sm text-slate-200 leading-relaxed space-y-2">
              <p>
                Piensa en Chagra como un{' '}
                <strong className="text-teal-200">cuaderno de campo</strong> que
                llevas en el bolsillo. Apuntas lo que hiciste hoy aunque no haya
                señal: que sembraste maíz, que cosechaste, que viste una plaga.
              </p>
              <p>
                Todo eso queda guardado en tu teléfono o tu computador de una
                vez. No necesitas internet para apuntar.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ 1: ¿Funciona sin internet? */}
        <section
          id="faq-offline"
          aria-labelledby="faq-offline-title"
          className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 scroll-mt-20"
        >
          <h3
            id="faq-offline-title"
            className="text-lg font-black text-white mb-3 flex items-center gap-2"
          >
            <Wifi size={20} className="text-teal-400 shrink-0" />
            ¿Funciona sin internet?
          </h3>
          <div className="text-sm text-slate-300 leading-relaxed space-y-2">
            <p>
              <strong className="text-teal-200">Sí.</strong> Puedes usar Chagra
              en pleno potrero, sin una rayita de señal. Todo lo que apuntes se
              guarda en tu aparato al instante.
            </p>
            <p>
              Cuando vuelve el internet <strong>y</strong> has iniciado sesión
              con tu usuario, tus apuntes &ldquo;suben&rdquo; solitos al archivo
              central (el servidor). Eso sirve para dos cosas: que no se pierdan
              y que los puedas ver en otro aparato.
            </p>
            <div className="mt-2 p-3 rounded-lg bg-slate-950/50 border border-slate-800">
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-teal-300">Ejemplo:</strong> estás en la
                loma, sin señal, y anotas &ldquo;sembré maíz el lunes&rdquo;.
                Queda guardado igual. Al bajar al pueblo, donde hay internet, ese
                apunte sube al servidor sin que tengas que hacer nada.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ 2: ¿Por qué veo cosas distintas en mis aparatos? */}
        <section
          id="faq-distinto"
          aria-labelledby="faq-distinto-title"
          className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-4 scroll-mt-20"
        >
          <h3
            id="faq-distinto-title"
            className="text-lg font-black text-amber-100 mb-3 flex items-center gap-2"
          >
            <Smartphone size={20} className="text-amber-400 shrink-0" />
            ¿Por qué veo cosas distintas en mis aparatos?
          </h3>
          <div className="text-sm text-slate-300 leading-relaxed space-y-2">
            <p>
              Porque <strong className="text-amber-200">cada aparato es su
              propio cuaderno</strong> hasta que inicias sesión en los dos con el
              mismo usuario.
            </p>
            <p>
              Si abres Chagra en el celular y también en el computador, pero solo
              iniciaste sesión en uno, vas a ver cosas distintas. Cada cuaderno
              tiene sus propios apuntes hasta que los conectas con tu usuario.
            </p>
            <div className="mt-2 p-3 rounded-lg bg-slate-950/50 border border-amber-800/40">
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong className="text-amber-300">Ejemplo:</strong> anotaste que
                sembraste maíz el lunes en el celular. Para verlo también en el
                computador, inicia sesión allá con el mismo usuario. En cuanto
                haya internet, los dos cuadernos quedan iguales.
              </p>
            </div>
            <p className="text-xs text-slate-400 italic mt-1">
              Regla simple: mismo usuario en los dos aparatos = los mismos
              apuntes en los dos. Esto NO es un error, es así a propósito.
            </p>
          </div>
        </section>

        {/* FAQ 3: ¿Puedo perder mis datos? — qué SÍ / qué NO puede */}
        <section
          id="faq-perder"
          aria-labelledby="faq-perder-title"
          className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 scroll-mt-20"
        >
          <h3
            id="faq-perder-title"
            className="text-lg font-black text-white mb-3 flex items-center gap-2"
          >
            <ShieldCheck size={20} className="text-emerald-400 shrink-0" />
            ¿Puedo perder mis datos?
          </h3>

          {/* Qué SÍ puede */}
          <p className="text-[11px] uppercase tracking-wider text-emerald-400/90 font-bold mb-2">
            Lo que Chagra SÍ hace por ti
          </p>
          <ul className="space-y-2.5 text-sm text-slate-200 leading-relaxed mb-4">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 mt-1 shrink-0" aria-hidden="true" />
              <p>Guarda tus plantas, labores y cosechas <strong>sin internet</strong>, al instante.</p>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 mt-1 shrink-0" aria-hidden="true" />
              <p>Sube tus apuntes al servidor <strong>cuando hay señal</strong> y sesión iniciada, sin que hagas nada.</p>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 mt-1 shrink-0" aria-hidden="true" />
              <p>
                <strong>Nunca borra tus datos si el servidor falla.</strong> Los
                guarda aparte en tu aparato y vuelve a intentar subirlos más
                tarde.
              </p>
            </li>
          </ul>

          {/* Qué NO puede */}
          <p className="text-[11px] uppercase tracking-wider text-rose-400/90 font-bold mb-2">
            Lo que Chagra NO puede hacer
          </p>
          <ul className="space-y-2.5 text-sm text-slate-200 leading-relaxed">
            <li className="flex items-start gap-2">
              <XCircle size={16} className="text-rose-400 mt-1 shrink-0" aria-hidden="true" />
              <p>
                No puede mostrarte lo mismo en dos aparatos si{' '}
                <strong>no iniciaste sesión en los dos</strong>. Sin sesión,
                cada cuaderno va por su lado.
              </p>
            </li>
            <li className="flex items-start gap-2">
              <XCircle size={16} className="text-rose-400 mt-1 shrink-0" aria-hidden="true" />
              <p>
                No puede adivinar tu usuario. Si borras la app sin haber
                iniciado sesión nunca, esos apuntes vivían solo en ese aparato.
                Por eso vale la pena iniciar sesión: es tu respaldo.
              </p>
            </li>
          </ul>

          <div className="mt-3 p-3 rounded-lg bg-emerald-900/20 border border-emerald-800/40 flex items-start gap-2">
            <CloudUpload size={16} className="text-emerald-300 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-emerald-100 leading-relaxed">
              <strong>En cristiano:</strong> apunta tranquilo aunque no haya
              señal. Inicia sesión cuando puedas y deja que suba. Así tienes tu
              cuaderno en el bolsillo <em>y</em> una copia guardada.
            </p>
          </div>
        </section>

        {/* FAQ 4: ¿Y el chat con la IA? — conecta con task #123, no duplica */}
        <section
          id="faq-ia"
          aria-labelledby="faq-ia-title"
          className="rounded-xl border border-sky-900/60 bg-sky-950/30 p-4 scroll-mt-20"
        >
          <h3
            id="faq-ia-title"
            className="text-lg font-black text-sky-100 mb-3 flex items-center gap-2"
          >
            <Bot size={20} className="text-sky-400 shrink-0" />
            ¿Y el chat con la IA?
          </h3>
          <div className="text-sm text-slate-300 leading-relaxed space-y-2">
            <p>
              El chat con el agente es distinto a tus apuntes del campo. La
              conversación con la IA <strong className="text-sky-200">se queda
              en cada aparato</strong> y no se comparte entre ellos. Es privado.
            </p>
            <p>
              Si hablaste con la IA en el celular, esa charla{' '}
              <strong>no</strong> aparece en el computador, aunque inicies sesión
              en los dos. Tus plantas y cosechas sí se comparten; el chat no.
            </p>
          </div>
          <button
            type="button"
            onClick={goAgente}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 active:bg-sky-500/35 text-sky-200 hover:text-sky-100 border border-sky-700/50 font-bold text-sm transition-colors min-h-[44px]"
          >
            Ver qué puede y qué no puede la IA <ChevronRight size={16} />
          </button>
        </section>

        <p className="text-[11px] text-slate-600 text-center mt-2 italic leading-relaxed">
          Sin letra menuda. Si algo aquí te queda confuso, repórtalo desde el
          Manual → Cómo usar Chagra → Reportar problema.
        </p>
      </main>
    </div>
  );
}
