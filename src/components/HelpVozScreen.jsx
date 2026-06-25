import React from 'react';
import { ArrowLeft, Mic, Ear, BrainCircuit, CheckCircle2, ChevronRight } from 'lucide-react';

/**
 * Sub-vista del Manual: cómo usar la voz. Híbrido tutorial + CTA "Probar
 * voz ahora" que navega al módulo voz real (P5: tutoriales con CTA directo).
 * Tono "tú" cercano (P1).
 */
export default function HelpVozScreen({ onBackToHome, onNavigate }) {
  const goVoz = () => {
    if (typeof onNavigate === 'function') onNavigate('voz');
  };

  const steps = [
    {
      n: 1,
      icon: Mic,
      title: 'Toca el botón micrófono',
      body: 'Está abajo a la izquierda, siempre visible. Lo encuentras en cualquier pantalla menos cuando ya estás dentro del módulo de voz.',
    },
    {
      n: 2,
      icon: Ear,
      title: 'Habla natural',
      body: 'No tienes que hablar como robot. Di lo que sembraste como si le contaras a un amigo: "sembré 5 tomates en el invernadero" o "puse 30 lechugas en la cama uno".',
    },
    {
      n: 3,
      icon: BrainCircuit,
      title: 'Chagra entiende y pregunta',
      body: 'Tu voz se convierte en texto y Chagra identifica qué sembraste, dónde y cuántos. Si algo no quedó claro te muestra una pantalla para que confirmes o corrijas antes de guardar.',
    },
    {
      n: 4,
      icon: CheckCircle2,
      title: 'Confirma y listo',
      body: 'Si todo está bien, toca confirmar. El registro va a tu finca. Si era una siembra, además te llega una sugerencia de plan de alimentación para esa planta.',
    },
  ];

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
          <ArrowLeft size={20} className="text-emerald-400" />
        </button>
        <p className="text-xs uppercase tracking-wider text-emerald-400/80 font-bold">Manual</p>
        <ChevronRight size={14} className="text-slate-600" />
        <p className="text-xs font-bold text-emerald-200">Cómo usar la voz</p>
      </div>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full pb-12 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-700/40 border border-emerald-500/50">
            <Mic size={26} className="text-emerald-300" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-black text-emerald-100 leading-tight">Habla y registra</h2>
            <p className="text-sm text-slate-300 leading-relaxed mt-1">
              La voz es la forma más rápida de registrar tu finca cuando tienes manos sucias o estás caminando entre matas.
            </p>
          </div>
        </div>

        {/* CTA principal arriba — operador puede saltar al módulo directo */}
        <button
          type="button"
          onClick={goVoz}
          className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 active:scale-[0.99] transition-all p-5 text-left flex items-center gap-3 min-h-[80px] shadow-lg border border-emerald-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        >
          <span className="shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/15 border border-white/30">
            <Mic size={24} className="text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-black text-white leading-tight">Prueba la voz ahora</p>
            <p className="text-xs text-emerald-100/90 mt-0.5">Si quieres saltarte el tutorial y ver cómo funciona</p>
          </div>
          <ChevronRight size={22} className="shrink-0 text-white" />
        </button>

        {/* Steps */}
        <div className="flex flex-col gap-2 mt-2">
          <p className="text-[11px] uppercase tracking-wider text-emerald-400/80 font-bold">Cómo funciona, paso a paso</p>
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.n} className="rounded-xl bg-slate-900/70 border border-slate-800 p-4 flex gap-3">
                <span className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-900/40 border border-emerald-700/50">
                  <Icon size={20} className="text-emerald-300" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-emerald-100 leading-tight">
                    <span className="text-emerald-400 font-black mr-1.5">{s.n}.</span>
                    {s.title}
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed mt-1">{s.body}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Qué puedes registrar por voz — los tipos del registro unificado */}
        <div className="rounded-xl bg-slate-900/70 border border-emerald-800/40 p-4 mt-2">
          <p className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold mb-2">Con la voz puedes registrar</p>
          <ul className="text-sm text-slate-200 space-y-1.5 leading-relaxed">
            <li>🌱 <strong className="text-emerald-200">Sembrar</strong> — lo que pusiste en tierra.</li>
            <li>🍎 <strong className="text-emerald-200">Cosechar</strong> — cuánto recogiste.</li>
            <li>🧪 <strong className="text-emerald-200">Insumo</strong> — qué abono o biopreparado aplicaste.</li>
            <li>🔧 <strong className="text-emerald-200">Mantenimiento</strong> — poda, deshierbe, riego.</li>
            <li>👀 <strong className="text-emerald-200">Observación</strong> — lo que viste en campo (una plaga, una flor, un daño).</li>
          </ul>
        </div>

        {/* Ejemplos */}
        <div className="rounded-xl bg-emerald-950/60 border border-emerald-800/40 p-4 mt-2">
          <p className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold mb-2">Ejemplos que entiende bien</p>
          <ul className="text-sm text-slate-200 space-y-1.5 leading-relaxed">
            <li>&ldquo;Sembré 5 tomates en el invernadero&rdquo;</li>
            <li>&ldquo;Planté 100 cafés en la parcela tres&rdquo;</li>
            <li>&ldquo;Puse 10 fresas y 30 lechugas en la cama uno&rdquo; <span className="text-emerald-400/70 text-[11px]">(multi-especie OK)</span></li>
            <li>&ldquo;Coseché 3 kilos de gulupas&rdquo;</li>
            <li>&ldquo;Apliqué bocashi a la mata de tomate de ayer&rdquo;</li>
            <li>&ldquo;Podé el aguacate y vi una broca en el café&rdquo;</li>
          </ul>
        </div>

        {/* Cantidad importa — concepto load-bearing */}
        <div className="rounded-xl bg-slate-900/70 border border-amber-700/40 p-4">
          <p className="text-[11px] uppercase tracking-wider text-amber-400 font-bold mb-2">Por qué la cantidad importa</p>
          <p className="text-sm text-slate-200 leading-relaxed">
            <strong className="text-emerald-200">1 café = 1 planta individual</strong> con su hoja de vida y cosechas. <strong className="text-emerald-200">100 cafés = 100 plantas individuales</strong>. <strong className="text-amber-200">50 lechugas = 1 cama agregada con qty 50</strong>: las hortalizas viven en grupo. Chagra decide el modo según la especie, pero puedes cambiarlo en la pantalla de revisión.
          </p>
        </div>

        {/* Sin red */}
        <p className="text-xs text-slate-500 italic mt-2 leading-relaxed">
          ¿Sin red en campo? Puedes grabar igual: la app guarda tu audio y lo transcribe en cuanto vuelves a tener señal (la transcripción usa el servidor). Lo que registras nunca se pierde.
        </p>

        {/* CTA bottom secundaria — backup si scrolleó hasta abajo */}
        <button
          type="button"
          onClick={goVoz}
          className="mt-4 rounded-xl bg-emerald-700/30 hover:bg-emerald-600/40 active:bg-emerald-700/50 border border-emerald-600/50 transition-colors p-3 text-center font-bold text-emerald-200 min-h-[48px]"
        >
          <Mic size={16} className="inline mr-1.5" /> Probar voz
        </button>
      </main>
    </div>
  );
}
