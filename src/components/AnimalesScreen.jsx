import React from 'react';
import { PawPrint, Bird, Hexagon, Beef, ChevronRight, Recycle } from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';

/**
 * AnimalesScreen — pantalla raíz del MÓDULO ANIMALES de la finca integrada.
 *
 * Sub-botones (cards) hacia cada vertical animal, con el mismo lenguaje visual
 * del resto de la app (cards glassmorphism con cinta de acento, halo del icono
 * y copy de campesino). La idea central es el CICLO CERRADO: el animal aporta a
 * la nutrición de las plantas (estiércol → biopreparado → suelo → planta) o,
 * en el caso de las abejas, a la polinización de los cultivos.
 *
 *   - Cerdos     → REUTILIZA el seguimiento porcino existente (ruta
 *                  'seguimiento_cerdos', motor FarmProcess). NO se duplica.
 *   - Gallinas   → pantalla nueva (animales_gallinas).
 *   - Vacas      → pantalla nueva (animales_vacas). Enlaza al proceso de
 *                  seguimiento de silvopastoreo existente. NO se duplica.
 *   - Abejas     → pantalla nueva (animales_abejas).
 *
 * Datos sanitarios y de manejo verificables (ICA, AGROSAVIA, Fenavi,
 * FEDEABEJA, CIPAV). El ciclo cerrado está groundeado contra
 * catalog/biopreparados-seed.json: el bocashi lleva gallinaza y el biol /
 * supermagro / compost llevan estiércol.
 */

// Cada vertical: id de ruta, icono, copy y la identidad de color del acento.
// Reusa el lenguaje visual de FincaCards (gradiente + cinta + halo).
const VERTICALES = [
  {
    id: 'cerdos',
    route: 'seguimiento_cerdos',
    Icon: PawPrint,
    emoji: '🐖',
    titulo: 'Cerdos',
    subtitulo: 'Manejo porcino y seguimiento del lote',
    aporte: 'Porcinaza para biol, supermagro y compost',
    accent: 'from-pink-600/25 to-rose-500/10',
    border: 'border-pink-600/40',
    bar: 'from-pink-400 to-rose-300',
    halo: 'bg-pink-400/20',
    iconColor: 'text-pink-300',
  },
  {
    id: 'gallinas',
    route: 'animales_gallinas',
    Icon: Bird,
    emoji: '🐔',
    titulo: 'Gallinas y aves de corral',
    subtitulo: 'Ponedoras, engorde, sanidad y huevos',
    aporte: 'Gallinaza para el bocashi',
    accent: 'from-amber-600/25 to-yellow-500/10',
    border: 'border-amber-600/40',
    bar: 'from-amber-400 to-yellow-300',
    halo: 'bg-amber-400/20',
    iconColor: 'text-amber-300',
  },
  {
    id: 'vacas',
    route: 'animales_vacas',
    Icon: Beef,
    emoji: '🐄',
    titulo: 'Vacas y ganado',
    subtitulo: 'Leche, carne, sanidad y silvopastoreo',
    aporte: 'Boñiga para el biol y el bocashi',
    accent: 'from-orange-600/25 to-amber-500/10',
    border: 'border-orange-600/40',
    bar: 'from-orange-400 to-amber-300',
    halo: 'bg-orange-400/20',
    iconColor: 'text-orange-300',
  },
  {
    id: 'abejas',
    route: 'animales_abejas',
    Icon: Hexagon,
    emoji: '🐝',
    titulo: 'Abejas y apicultura',
    subtitulo: 'Colmenas, miel, cera y sanidad',
    aporte: 'Polinización de tus cultivos',
    accent: 'from-yellow-500/25 to-amber-400/10',
    border: 'border-yellow-600/40',
    bar: 'from-yellow-300 to-amber-300',
    halo: 'bg-yellow-400/20',
    iconColor: 'text-yellow-300',
  },
];

function VerticalCard({ v, onNavigate }) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(v.route)}
      aria-label={`${v.titulo} — ${v.subtitulo}`}
      className={`group relative w-full text-left rounded-[var(--r-lg,20px)] overflow-hidden bg-gradient-to-br ${v.accent} backdrop-blur-xl border ${v.border} p-4 ring-2 ring-white/0 hover:ring-white/30 shadow-[var(--sombra-2,0_6px_18px_rgb(8_30_22/0.22))] motion-safe:transition-all motion-safe:duration-200 ease-out motion-safe:active:scale-[0.98] motion-safe:hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70`}
    >
      {/* Cinta de acento superior: identidad de color del vertical. */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${v.bar} opacity-70 group-hover:opacity-100 motion-safe:transition-opacity`}
      />
      <div className="flex items-center gap-3">
        {/* Icono grande sobre disco de halo tonal (mismo patrón que FincaCards). */}
        <span className="relative grid place-items-center shrink-0">
          <span
            aria-hidden="true"
            className={`absolute inset-0 -m-1 rounded-full ${v.halo} blur-md scale-110 motion-safe:group-hover:scale-125 motion-safe:transition-transform`}
          />
          <span className="relative w-12 h-12 rounded-[var(--r-sm,12px)] bg-black/30 flex items-center justify-center text-3xl select-none">
            {v.emoji}
          </span>
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-white leading-tight">{v.titulo}</h3>
          <p className="text-xs text-slate-300/80 mt-0.5 leading-tight">{v.subtitulo}</p>
          <p className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold ${v.iconColor}`}>
            <Recycle size={12} aria-hidden="true" />
            {v.aporte}
          </p>
        </div>
        <ChevronRight size={20} className="shrink-0 text-slate-400 group-hover:text-slate-200 motion-safe:transition-colors" aria-hidden="true" />
      </div>
    </button>
  );
}

export default function AnimalesScreen({ onBack, onHome, onNavigate }) {
  const go = onNavigate || (() => {});
  return (
    <ScreenShell title="Animales" icon={PawPrint} onBack={onBack} onHome={onHome}>
      <div className="px-4 pt-4 pb-10 max-w-2xl mx-auto">
        {/* Intro corta — qué es este módulo y por qué importa el ciclo cerrado. */}
        <p className="text-sm text-slate-300 leading-relaxed mb-4">
          Tus animales son parte de la finca integrada. Bien manejados, te dan
          comida y, además, alimentan tus plantas: el estiércol se convierte en
          abono y las abejas polinizan tus cultivos.
        </p>

        {/* Sub-botones de cada vertical animal. */}
        <div className="flex flex-col gap-3" data-testid="animales-verticales">
          {VERTICALES.map((v) => (
            <VerticalCard key={v.id} v={v} onNavigate={go} />
          ))}
        </div>

        {/* Explicación del CICLO CERRADO: animal → estiércol → biopreparado →
            suelo → planta. Groundeado en biopreparados-seed.json. */}
        <section className="mt-6 rounded-[var(--r-lg,20px)] border border-emerald-700/40 bg-emerald-900/20 p-4 shadow-[var(--sombra-1,0_1px_2px_rgb(8_30_22/0.18))]">
          <h2 className="flex items-center gap-2 text-base font-bold text-emerald-200">
            <Recycle size={18} aria-hidden="true" />
            El ciclo cerrado de tu finca
          </h2>
          <p className="mt-2 text-sm text-emerald-100/90 leading-relaxed">
            Nada se pierde: lo que sale de un animal entra como comida de la
            tierra. Así cierras el círculo y gastas menos en abonos comprados.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/40">Animal</span>
            <span aria-hidden="true" className="text-emerald-300">→</span>
            <span className="px-2.5 py-1 rounded-full bg-stone-500/20 text-stone-200 border border-stone-500/40">Estiércol</span>
            <span aria-hidden="true" className="text-emerald-300">→</span>
            <span className="px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-200 border border-orange-500/40">Biopreparado</span>
            <span aria-hidden="true" className="text-emerald-300">→</span>
            <span className="px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-200 border border-teal-500/40">Suelo</span>
            <span aria-hidden="true" className="text-emerald-300">→</span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/40">Planta</span>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm text-emerald-100/90 leading-relaxed">
            <li>• <span className="font-bold text-amber-200">Gallinas</span> → la gallinaza es ingrediente del <span className="font-bold">bocashi</span> (abono base).</li>
            <li>• <span className="font-bold text-orange-200">Vacas</span> → la boñiga (bovinaza) es el estiércol clásico del <span className="font-bold">biol</span> (el biol tradicional de Restrepo se hace con boñiga de vaca) y también entra al <span className="font-bold">bocashi</span>.</li>
            <li>• <span className="font-bold text-pink-200">Cerdos</span> → la porcinaza y el estiércol entran al <span className="font-bold">biol</span>, el <span className="font-bold">supermagro</span> y el <span className="font-bold">compost</span>.</li>
            <li>• <span className="font-bold text-yellow-200">Abejas</span> → no dan abono, pero polinizan tus matas y mejoran el cuaje y la cosecha.</li>
          </ul>
          <button
            type="button"
            onClick={() => go('ciclo_nutrientes')}
            className="mt-4 w-full min-h-[48px] rounded-[var(--r-md,16px)] font-bold text-sm bg-emerald-700 hover:bg-emerald-600 active:brightness-90 text-white flex items-center justify-center gap-2 motion-safe:transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
          >
            <Recycle size={16} aria-hidden="true" /> Ver ciclo de nutrientes
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </section>
      </div>
    </ScreenShell>
  );
}
