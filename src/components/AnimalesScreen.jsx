import React from 'react';
import { PawPrint, ChevronRight, Recycle } from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';
import FotoAnimal from './animales/FotoAnimal';

/**
 * AnimalesScreen — pantalla raíz del MÓDULO ANIMALES de la finca integrada,
 * enfocada en la CRÍA CAMPESINA del pequeño productor.
 *
 * Hub "photo-forward" (mismo patrón visual del módulo Agua/Suelo): cada vertical
 * es una tarjeta con foto real de licencia abierta (crédito visible), su copy de
 * campesino y el aporte al ciclo cerrado. Arranca por las especies de cría más
 * accesibles (gallinas, cerdos, conejos, cabras/ovejas) y remata con vacas y
 * abejas. La idea central es el CICLO CERRADO: el animal alimenta a la planta
 * (estiércol → compost/bocashi → suelo → planta) o, las abejas, la poliniza.
 *
 *   - Gallinas    → pantalla animales_gallinas (ponedoras/engorde).
 *   - Cerdos      → REUTILIZA el seguimiento porcino existente (ruta
 *                   'seguimiento_cerdos', motor FarmProcess). NO se duplica.
 *   - Conejos     → pantalla nueva (animales_conejos).
 *   - Cabras/ovejas → pantalla nueva (animales_caprinos).
 *   - Vacas       → pantalla animales_vacas (enlaza a silvopastoreo).
 *   - Abejas      → pantalla animales_abejas.
 *
 * Datos sanitarios/reproductivos verificables (ICA, AGROSAVIA, Fenavi,
 * FEDEABEJA, CIPAV; ver src/data/animal-diagnostics.json). El ciclo cerrado está
 * groundeado contra catalog/biopreparados-seed.json (bocashi lleva gallinaza).
 */

// Cada vertical: id de ruta, foto (public/animales), emoji, copy y la identidad
// de color del acento (la cinta superior de la tarjeta).
const VERTICALES = [
  {
    id: 'gallinas',
    route: 'animales_gallinas',
    foto: 'gallinas',
    emoji: '🐔',
    titulo: 'Gallinas y aves de corral',
    subtitulo: 'Ponedoras, engorde, sanidad y huevos',
    aporte: 'Gallinaza para el bocashi',
    bar: 'from-amber-400 to-yellow-300',
  },
  {
    id: 'cerdos',
    route: 'seguimiento_cerdos',
    foto: 'cerdos',
    emoji: '🐖',
    titulo: 'Cerdos',
    subtitulo: 'Manejo porcino y cama profunda',
    aporte: 'Porquinaza para biol y compost',
    bar: 'from-pink-400 to-rose-300',
  },
  {
    id: 'conejos',
    route: 'animales_conejos',
    foto: 'conejos',
    emoji: '🐇',
    titulo: 'Conejos',
    subtitulo: 'Poco espacio, forraje y carne magra',
    aporte: 'Conejaza, abono que no quema',
    bar: 'from-stone-300 to-slate-300',
  },
  {
    id: 'caprinos',
    route: 'animales_caprinos',
    foto: 'cabras',
    emoji: '🐐',
    titulo: 'Cabras y ovejas',
    subtitulo: 'Leche, carne, lana y ramoneo',
    aporte: 'Majada seca para el compost',
    bar: 'from-orange-300 to-amber-300',
  },
  {
    id: 'vacas',
    route: 'animales_vacas',
    foto: 'vacas',
    emoji: '🐄',
    titulo: 'Vacas y ganado',
    subtitulo: 'Leche, carne, sanidad y silvopastoreo',
    aporte: 'Boñiga para el biol y el bocashi',
    bar: 'from-orange-400 to-amber-300',
  },
  {
    id: 'abejas',
    route: 'animales_abejas',
    foto: 'abejas',
    emoji: '🐝',
    titulo: 'Abejas y apicultura',
    subtitulo: 'Colmenas, miel, cera y sanidad',
    aporte: 'Polinización de sus cultivos',
    bar: 'from-yellow-300 to-amber-300',
  },
];

/**
 * VerticalCard — tarjeta photo-forward de un vertical animal: foto real de
 * fondo con scrim, chip de emoji, copy y aporte al ciclo, todo sobre la foto.
 */
function VerticalCard({ v, onNavigate }) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(v.route)}
      aria-label={`${v.titulo} — ${v.subtitulo}`}
      data-testid={`vertical-${v.id}`}
      className="group relative block w-full text-left rounded-2xl overflow-hidden ring-2 ring-white/0 hover:ring-white/30 shadow-lg shadow-black/20 transition-all duration-200 ease-out active:scale-[0.98] hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
    >
      <FotoAnimal slug={v.foto} alt={`${v.titulo}: ${v.subtitulo}`} ratio="aspect-[5/2]" Fallback={PawPrint}>
        {/* Cinta de acento superior: identidad de color del vertical. */}
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${v.bar} opacity-80 group-hover:opacity-100 transition-opacity`}
        />
        <ChevronRight
          size={22}
          className="absolute top-3 right-3 text-white/70 group-hover:text-white transition-colors"
          aria-hidden="true"
        />
        <div className="absolute inset-x-0 bottom-0 p-3.5">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-xl bg-black/40 backdrop-blur-sm flex items-center justify-center text-2xl select-none shrink-0">
              {v.emoji}
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-black text-white leading-tight drop-shadow">{v.titulo}</h3>
              <p className="text-xs text-white/80 leading-tight drop-shadow">{v.subtitulo}</p>
            </div>
          </div>
          <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-lime-200 drop-shadow">
            <Recycle size={12} aria-hidden="true" />
            {v.aporte}
          </p>
        </div>
      </FotoAnimal>
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
          La cría es parte de la finca integrada. Bien manejados, sus animales le
          dan comida y, además, alimentan sus plantas: el estiércol se convierte en
          abono y las abejas polinizan sus cultivos.
        </p>

        {/* Sub-botones photo-forward de cada vertical animal. */}
        <div className="flex flex-col gap-3" data-testid="animales-verticales">
          {VERTICALES.map((v) => (
            <VerticalCard key={v.id} v={v} onNavigate={go} />
          ))}
        </div>

        {/* Explicación del CICLO CERRADO: animal → estiércol → compost/bocashi →
            suelo → planta. Groundeado en biopreparados-seed.json. */}
        <section className="mt-6 rounded-2xl border border-emerald-700/40 bg-emerald-900/20 p-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-emerald-200">
            <Recycle size={18} aria-hidden="true" />
            El ciclo cerrado de su finca
          </h2>
          <p className="mt-2 text-sm text-emerald-100/90 leading-relaxed">
            Nada se pierde: lo que sale de un animal entra como comida de la
            tierra. Así cierra el círculo y gasta menos en abonos comprados.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/40">Animal</span>
            <span aria-hidden="true" className="text-emerald-300">→</span>
            <span className="px-2.5 py-1 rounded-full bg-stone-500/20 text-stone-200 border border-stone-500/40">Estiércol</span>
            <span aria-hidden="true" className="text-emerald-300">→</span>
            <span className="px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-200 border border-orange-500/40">Compost / bocashi</span>
            <span aria-hidden="true" className="text-emerald-300">→</span>
            <span className="px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-200 border border-teal-500/40">Suelo</span>
            <span aria-hidden="true" className="text-emerald-300">→</span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/40">Planta</span>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm text-emerald-100/90 leading-relaxed">
            <li>• <span className="font-bold text-amber-200">Gallinas</span> → la gallinaza es ingrediente del <span className="font-bold">bocashi</span> (abono base).</li>
            <li>• <span className="font-bold text-stone-200">Conejos</span> → la conejaza es un abono "frío" que no quema; ideal para la lombricera.</li>
            <li>• <span className="font-bold text-orange-200">Cabras y ovejas</span> → la majada (pelotitas) se recoge seca y va directo al compost.</li>
            <li>• <span className="font-bold text-orange-200">Vacas</span> → la boñiga (bovinaza) es el estiércol clásico del <span className="font-bold">biol</span> y también entra al <span className="font-bold">bocashi</span>.</li>
            <li>• <span className="font-bold text-pink-200">Cerdos</span> → la porquinaza entra al <span className="font-bold">biol</span>, el <span className="font-bold">supermagro</span> y el <span className="font-bold">compost</span>.</li>
            <li>• <span className="font-bold text-yellow-200">Abejas</span> → no dan abono, pero polinizan sus matas y mejoran el cuaje y la cosecha.</li>
          </ul>
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => go('estiercol')}
              data-testid="animales-ir-abono"
              className="w-full min-h-[48px] rounded-xl font-bold text-sm bg-lime-700 hover:bg-lime-600 text-white flex items-center justify-center gap-2"
            >
              <Recycle size={16} aria-hidden="true" /> Ir al mundo del abono
              <ChevronRight size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => go('ciclo_nutrientes')}
              className="w-full min-h-[48px] rounded-xl font-bold text-sm bg-emerald-700 hover:bg-emerald-600 text-white flex items-center justify-center gap-2"
            >
              <Recycle size={16} aria-hidden="true" /> Ver ciclo de nutrientes
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>
    </ScreenShell>
  );
}
