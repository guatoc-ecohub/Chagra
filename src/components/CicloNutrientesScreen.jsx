import React from 'react';
import {
  Recycle, PawPrint, Bird, Beef, Beaker, Sprout, ChevronRight,
  ArrowDown, FlaskConical, Droplets, Mountain, Info, Trees,
} from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';

/**
 * CicloNutrientesScreen — el CICLO CERRADO de nutrientes de la finca, VISIBLE.
 *
 * Responde a la pregunta del operador: "no sé cómo se integra el abono que se
 * produce en cerdos y gallinas al ciclo de alimentación de plantas". Lo muestra
 * encadenando tres eslabones reales:
 *
 *   ANIMAL (estiércol) → BIOPREPARADO (transformación) → PLAN DE ALIMENTACIÓN
 *
 * NADA está inventado. Las asociaciones salen de datos que ya viven en el repo:
 *
 *   - Eslabón 1 (estiércol por animal) y eslabón 1→2 (qué biopreparado alimenta
 *     cada estiércol) están groundeados en las pantallas existentes
 *     (AnimalesScreen, GallinasScreen, VacasScreen) y en
 *     catalog/biopreparados-seed.json:
 *       · bocashi    → ingredientes incluyen "gallinaza"          (gallinas)
 *       · biol       → "estiércol fresco (vaca/cabra)"            (vacas)
 *       · supermagro → "estiércol vaca"                           (vacas)
 *       · biol/supermagro/compost también reciben porcinaza        (cerdos)
 *
 *   - Eslabón 2→3 (en qué paso del plan entra cada biopreparado) está
 *     groundeado en src/data/feedingPlanGeneric.js: el bocashi es el abono de
 *     FONDO al trasplante/surco (offset 0); el biol va FOLIAR en crecimiento;
 *     el supermagro va FOLIAR en floración/cuaje y en llenado de tubérculo.
 *
 *   - Lo que el abono propio NO reemplaza: la cal dolomítica y la roca fosfórica
 *     del paso 0 de suelo (soilSteps en feedingPlanGeneric.js) son ENMIENDAS
 *     MINERALES — no se producen con animales. También se aclara que los
 *     sulfatos del supermagro son un insumo mineral comprado aparte del
 *     estiércol.
 */

/* ── Eslabón 1: ANIMALES y el estiércol que aportan ──
 * Asociaciones tomadas TEXTUALMENTE de AnimalesScreen / GallinasScreen /
 * VacasScreen. Las abejas NO dan abono (polinizan): se mencionan aparte para no
 * dejar el módulo animal incompleto, sin sobre-afirmar que aportan estiércol. */
const ANIMALES = [
  {
    id: 'gallinas',
    Icon: Bird,
    emoji: '🐔',
    nombre: 'Gallinas',
    estiercol: 'Gallinaza',
    detalle: 'Recójala seca de la cama profunda. Compóstela o madúrela antes de usarla (fresca quema las matas).',
    alimenta: 'Bocashi',
    text: 'text-amber-200',
    border: 'border-amber-600/40',
    bg: 'bg-amber-900/20',
    chip: 'bg-amber-500/20 text-amber-200 border-amber-500/40',
  },
  {
    id: 'vacas',
    Icon: Beef,
    emoji: '🐄',
    nombre: 'Vacas',
    estiercol: 'Boñiga (bovinaza)',
    detalle: 'El estiércol clásico del biol (el biol tradicional de Restrepo se hace con boñiga de vaca). Madúrela antes de aplicarla.',
    alimenta: 'Biol, bocashi y compost',
    text: 'text-orange-200',
    border: 'border-orange-600/40',
    bg: 'bg-orange-900/20',
    chip: 'bg-orange-500/20 text-orange-200 border-orange-500/40',
  },
  {
    id: 'cerdos',
    Icon: PawPrint,
    emoji: '🐖',
    nombre: 'Cerdos',
    estiercol: 'Porcinaza',
    detalle: 'La porcinaza y el estiércol del lote entran al biol, el supermagro y el compost. Madúrela siempre antes de usar.',
    alimenta: 'Biol, supermagro y compost',
    text: 'text-pink-200',
    border: 'border-pink-600/40',
    bg: 'bg-pink-900/20',
    chip: 'bg-pink-500/20 text-pink-200 border-pink-500/40',
  },
];

/* ── Eslabón 2: BIOPREPARADOS que transforman el estiércol ──
 * Ingredientes copiados de catalog/biopreparados-seed.json (no inventados).
 * `forma` = sólido al suelo vs líquido foliar/riego. `pasoPlan` = en qué paso
 * del plan de alimentación entra (feedingPlanGeneric.js). */
const BIOPREPARADOS = [
  {
    id: 'bocashi',
    Icon: FlaskConical,
    emoji: '🟤',
    nombre: 'Bocashi',
    forma: 'Sólido — abono de fondo al suelo',
    deQuien: 'Lleva gallinaza (gallinas)',
    pasoPlan: 'Va al hoyo o surco en el TRASPLANTE / la siembra (paso de fondo, día 0). Es la base de todos los planes: hoja, fruto, tubérculo, grano y cereal.',
    text: 'text-amber-200',
    border: 'border-amber-700/50',
    bg: 'bg-amber-900/25',
  },
  {
    id: 'biol',
    Icon: Droplets,
    emoji: '💧',
    nombre: 'Biol',
    forma: 'Líquido — foliar o al pie',
    deQuien: 'Lleva estiércol fresco de vaca/cabra (vacas) y porcinaza (cerdos)',
    pasoPlan: 'Va FOLIAR en pleno CRECIMIENTO, cuando la planta más pide nitrógeno: hortaliza de hoja (~día 15), fruto/flor (~día 20), tubérculo (~día 25) y cereal cuando echa tallos. En leguminosas NO se usa (ellas fijan su propio nitrógeno).',
    text: 'text-lime-200',
    border: 'border-lime-700/50',
    bg: 'bg-lime-900/25',
  },
  {
    id: 'supermagro',
    Icon: Droplets,
    emoji: '🧪',
    nombre: 'Supermagro',
    forma: 'Líquido — foliar',
    deQuien: 'Lleva estiércol de vaca (vacas) y porcinaza (cerdos) + sulfatos minerales comprados',
    pasoPlan: 'Va FOLIAR en FLORACIÓN y CUAJE (fruto/flor ~día 45) y en el LLENADO del tubérculo (~día 60): aporta el potasio y los micronutrientes que pide la flor, el fruto y el tubérculo.',
    text: 'text-emerald-200',
    border: 'border-emerald-700/50',
    bg: 'bg-emerald-900/25',
  },
];

/* ── Eslabón 3: dónde entra cada biopreparado en el PLAN DE ALIMENTACIÓN ──
 * Pasos tomados de las plantillas de feedingPlanGeneric.js (offset_days). */
const PASOS_PLAN = [
  {
    momento: 'Antes de sembrar — preparar el suelo',
    insumo: 'Cal dolomítica + roca fosfórica',
    propio: false,
    nota: 'Enmiendas MINERALES, según análisis de suelo. NO salen de los animales: hay que comprarlas. La cal corrige la acidez y aporta calcio/magnesio; la roca fosfórica aporta fósforo.',
  },
  {
    momento: 'Al sembrar / trasplantar (día 0)',
    insumo: 'Bocashi al hoyo o surco',
    propio: true,
    nota: 'Abono de FONDO. Aquí entra la gallinaza de sus gallinas convertida en bocashi.',
  },
  {
    momento: 'Mientras crece (≈día 15–25)',
    insumo: 'Biol foliar o al pie',
    propio: true,
    nota: 'Refuerzo de nitrógeno en vegetativo. Aquí entra la boñiga de las vacas y la porcinaza de los cerdos, fermentadas en biol.',
  },
  {
    momento: 'En floración, cuaje y llenado (≈día 45–60)',
    insumo: 'Supermagro foliar',
    propio: true,
    nota: 'Potasio y micronutrientes para la flor y el fruto. El estiércol es de la finca; los sulfatos minerales sí se compran aparte.',
  },
  {
    momento: 'Mantenimiento (en producción)',
    insumo: 'Té de compost',
    propio: true,
    nota: 'Microbios para sostener la planta. Sale de su compost (estiércol maduro de cualquier animal de la finca).',
  },
];

/* ════════════════════════════════════════════════════════════════════ */

function Card({ children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4 ${className}`}>
      {children}
    </section>
  );
}

/** Flecha vertical entre eslabones (encadena las tres tarjetas). */
function FlechaEslabon({ label }) {
  return (
    <div className="flex flex-col items-center py-1 select-none" aria-hidden="true">
      <ArrowDown size={22} className="text-emerald-400" />
      {label ? (
        <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300/80">
          {label}
        </span>
      ) : null}
    </div>
  );
}

export default function CicloNutrientesScreen({ onBack, onHome, onNavigate }) {
  const go = onNavigate || (() => {});
  return (
    <ScreenShell title="Ciclo de nutrientes" icon={Recycle} onBack={onBack} onHome={onHome}>
      <div className="px-4 pt-4 pb-10 max-w-2xl mx-auto space-y-4">
        {/* Intro — la idea en campesino. */}
        <p className="text-sm text-slate-300 leading-relaxed">
          En una finca agroecológica nada se bota. Lo que sale de sus animales
          vuelve a la tierra como comida para las plantas. Aquí ve el camino
          completo, eslabón por eslabón: el estiércol del animal se transforma en
          biopreparado y ese abono entra en el plan de alimentación de sus
          cultivos.
        </p>

        {/* Resumen del flujo en una cinta. */}
        <div className="rounded-2xl border border-emerald-700/40 bg-emerald-900/20 p-3.5">
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold">
            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/40">Animal (estiércol)</span>
            <ChevronRight size={16} className="text-emerald-300" aria-hidden="true" />
            <span className="px-2.5 py-1 rounded-full bg-lime-500/20 text-lime-200 border border-lime-500/40">Biopreparado</span>
            <ChevronRight size={16} className="text-emerald-300" aria-hidden="true" />
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/40">Plan de las plantas</span>
          </div>
        </div>

        {/* ─────────── ESLABÓN 1: ANIMALES ─────────── */}
        <Card className="border-amber-700/40">
          <h2 className="flex items-center gap-2 text-base font-bold text-amber-200">
            <PawPrint size={18} aria-hidden="true" />
            1. Sus animales y su estiércol
          </h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Cada animal deja un abono distinto. Recójalo y madúrelo antes de
            usarlo (el estiércol fresco quema las matas).
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {ANIMALES.map((a) => {
              const { Icon } = a;
              return (
                <li key={a.id} className={`rounded-xl border ${a.border} ${a.bg} p-3`}>
                  <div className="flex items-start gap-3">
                    <span className="relative grid place-items-center shrink-0 w-11 h-11 rounded-xl bg-black/30 text-2xl select-none">
                      {a.emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-bold text-white leading-tight">
                        <Icon size={14} className={a.text} aria-hidden="true" />
                        {a.nombre}
                        <ChevronRight size={13} className="text-slate-500" aria-hidden="true" />
                        <span className={a.text}>{a.estiercol}</span>
                      </p>
                      <p className="mt-1 text-xs text-slate-300/90 leading-snug">{a.detalle}</p>
                      <p className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold ${a.text}`}>
                        <Recycle size={12} aria-hidden="true" />
                        Alimenta: {a.alimenta}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 flex items-start gap-2 text-[11px] text-slate-500">
            <Info size={13} className="shrink-0 mt-0.5" aria-hidden="true" />
            Las abejas no dan abono, pero polinizan sus cultivos y mejoran el
            cuaje y la cosecha — también cierran ciclo, por otro lado.
          </p>
        </Card>

        <FlechaEslabon label="se fermenta en" />

        {/* ─────────── ESLABÓN 2: BIOPREPARADOS ─────────── */}
        <Card className="border-lime-700/40">
          <h2 className="flex items-center gap-2 text-base font-bold text-lime-200">
            <Beaker size={18} aria-hidden="true" />
            2. El estiércol se vuelve biopreparado
          </h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            El estiércol no se echa crudo. Se fermenta y se vuelve abono que la
            planta sí aprovecha: unos sólidos para el suelo, otros líquidos para
            rociar (foliar) o regar al pie.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {BIOPREPARADOS.map((b) => {
              const { Icon } = b;
              return (
                <li key={b.id} className={`rounded-xl border ${b.border} ${b.bg} p-3`}>
                  <div className="flex items-start gap-3">
                    <span className="relative grid place-items-center shrink-0 w-11 h-11 rounded-xl bg-black/30 text-2xl select-none">
                      {b.emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-bold text-white leading-tight">
                        <Icon size={14} className={b.text} aria-hidden="true" />
                        {b.nombre}
                      </p>
                      <p className={`mt-0.5 text-[11px] font-bold ${b.text}`}>{b.forma}</p>
                      <p className="mt-1 text-xs text-slate-300/90 leading-snug">{b.deQuien}</p>
                      <p className="mt-1.5 text-xs text-slate-200/90 leading-snug">
                        <span className="font-bold text-white">En el plan:</span> {b.pasoPlan}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => go('fermentos')}
            className="mt-3 w-full min-h-[44px] rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center gap-2"
          >
            <Beaker size={16} aria-hidden="true" /> Ver recetas de biopreparados
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </Card>

        <FlechaEslabon label="entra en el plan de" />

        {/* ─────────── ESLABÓN 3: PLAN DE ALIMENTACIÓN ─────────── */}
        <Card className="border-emerald-700/40">
          <h2 className="flex items-center gap-2 text-base font-bold text-emerald-200">
            <Sprout size={18} aria-hidden="true" />
            3. El abono entra en el plan de las plantas
          </h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            En el plan de alimentación de cada cultivo, su propio abono ocupa los
            pasos clave. Estos son los momentos y qué entra en cada uno:
          </p>
          <ol className="mt-3 flex flex-col gap-2">
            {PASOS_PLAN.map((p, i) => (
              <li
                key={p.momento}
                className={`rounded-xl border p-3 ${
                  p.propio
                    ? 'border-emerald-700/50 bg-emerald-900/20'
                    : 'border-stone-600/50 bg-stone-800/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0 ${
                    p.propio ? 'bg-emerald-600' : 'bg-stone-600'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white leading-tight">{p.momento}</p>
                    <p className={`mt-0.5 inline-flex items-center gap-1.5 text-xs font-bold ${
                      p.propio ? 'text-emerald-200' : 'text-stone-300'
                    }`}>
                      {p.propio
                        ? <><Recycle size={12} aria-hidden="true" /> {p.insumo} — abono de su finca</>
                        : <><Mountain size={12} aria-hidden="true" /> {p.insumo} — mineral comprado</>}
                    </p>
                    <p className="mt-1 text-xs text-slate-300/90 leading-snug">{p.nota}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        {/* Lo que el abono propio NO reemplaza — destacado, sin sobre-afirmar. */}
        <div className="rounded-2xl border border-stone-500/50 bg-stone-800/30 p-3.5 flex gap-3">
          <Mountain size={20} className="shrink-0 text-stone-300 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-stone-100/90 leading-relaxed">
            <span className="font-bold text-stone-200">Ojo:</span> no todo sale de
            los animales. La <span className="font-bold">cal dolomítica</span> y la
            {' '}<span className="font-bold">roca fosfórica</span> del primer paso
            (corregir acidez y aportar fósforo) son enmiendas MINERALES que toca
            comprar — no se producen con estiércol. Y los sulfatos del supermagro
            también son un insumo mineral aparte. El abono de la finca cubre el
            grueso de la nutrición, pero estos minerales se aportan según el
            análisis de suelo.
          </p>
        </div>

        {/* Cierre — invitar a registrar abono y enlazar a las pantallas. */}
        <div className="rounded-2xl border border-emerald-700/40 bg-emerald-900/20 p-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-emerald-200">
            <Trees size={18} aria-hidden="true" />
            Cierre el círculo en su finca
          </h2>
          <p className="mt-2 text-sm text-emerald-100/90 leading-relaxed">
            Lleve la cuenta del estiércol que producen sus animales y de los
            biopreparados que prepara: así sabe cuánto abono propio tiene para
            el plan de sus cultivos y cuánto se ahorra en abonos comprados.
          </p>
          <button
            type="button"
            onClick={() => go('animales')}
            className="mt-3 w-full min-h-[48px] rounded-xl font-bold text-sm bg-emerald-700 hover:bg-emerald-600 text-white flex items-center justify-center gap-2"
          >
            <PawPrint size={18} aria-hidden="true" /> Ir a Animales
            <ChevronRight size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => go('activos')}
            className="mt-2 w-full min-h-[44px] rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center gap-2"
          >
            <Sprout size={16} aria-hidden="true" /> Ver mis plantas y su plan
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>

        <p className="text-[11px] text-slate-500 pt-1 flex items-start gap-1.5">
          <Info size={12} className="shrink-0 mt-0.5" aria-hidden="true" />
          Asociaciones estiércol → biopreparado tomadas del catálogo de
          biopreparados de Chagra (catalog/biopreparados-seed.json): el bocashi
          lleva gallinaza, el biol y el supermagro llevan estiércol de vaca. Los
          momentos del plan salen de las plantillas de nutrición por tipo de
          cultivo. La cal y la roca fosfórica son enmiendas minerales, no abono
          animal.
        </p>
      </div>
    </ScreenShell>
  );
}
