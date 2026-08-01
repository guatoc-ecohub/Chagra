import { BarChart3, FlaskConical, Leaf, ShieldCheck, Sprout, TrendingUp } from 'lucide-react';
import asociaciones from '../../data/asociaciones-comparativa.json';

const confidenceStyles = {
  alta: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  media: 'bg-amber-100 text-amber-950 border-amber-300',
  baja: 'bg-rose-100 text-rose-950 border-rose-300',
};

function formatNumber(value) {
  if (value === null || value === undefined) return null;
  if (Number.isInteger(value)) return String(value);
  return value.toLocaleString('es-CO', { maximumFractionDigits: 2 });
}

function formatRange(min, max, suffix = '') {
  if (min === null || min === undefined || max === null || max === undefined) return null;
  return `${formatNumber(min)} a ${formatNumber(max)}${suffix}`;
}

function lerText(ler) {
  if (!ler) return 'Sin dato LER comparable';
  if (ler.valor_aprox) return `Aprox. ${formatNumber(ler.valor_aprox)} LER`;
  if (ler.valor) {
    return ler.error
      ? `${formatNumber(ler.valor)} LER +/- ${formatNumber(ler.error)}`
      : `${formatNumber(ler.valor)} LER`;
  }
  return formatRange(ler.min, ler.max, ' LER') || 'Sin dato LER comparable';
}

function nitrogenText(item) {
  const poli = item.policultivo || {};
  if (poli.N_fijado_kg_ha) return `${formatNumber(poli.N_fijado_kg_ha)} kg N/ha`;
  if (typeof poli.N_fijado_pct === 'number') return `${formatNumber(poli.N_fijado_pct)}% de N fijado`;
  if (poli.N_fijado_pct) {
    return formatRange(poli.N_fijado_pct.min, poli.N_fijado_pct.max, '% de N fijado');
  }
  const sustitucion = poli.ahorro_insumos;
  if (sustitucion?.fertilizacion_N_sustituible_kg_ha_max !== undefined) {
    return formatRange(
      sustitucion.fertilizacion_N_sustituible_kg_ha_min,
      sustitucion.fertilizacion_N_sustituible_kg_ha_max,
      ' kg N/ha sustituibles',
    );
  }
  return 'Sin dato directo';
}

function inputSavingsText(ahorro) {
  if (!ahorro) return 'Sin ahorro cuantificado';
  if (ahorro.arvenses_reduccion_pct_min !== undefined) {
    return formatRange(
      ahorro.arvenses_reduccion_pct_min,
      ahorro.arvenses_reduccion_pct_max,
      '% menos arvenses',
    );
  }
  if (ahorro.N_sintesis_reduccion_pct_min !== undefined) {
    return formatRange(
      ahorro.N_sintesis_reduccion_pct_min,
      ahorro.N_sintesis_reduccion_pct_max,
      '% menos N de sintesis',
    );
  }
  if (ahorro.fertilizacion_N_sustituible_kg_ha_max !== undefined) {
    return formatRange(
      ahorro.fertilizacion_N_sustituible_kg_ha_min,
      ahorro.fertilizacion_N_sustituible_kg_ha_max,
      ' kg N/ha sustituibles',
    );
  }
  return 'Ahorro sin formato disponible';
}

function pestControlText(control) {
  if (!control) return 'Sin dato de plaga';
  if (typeof control === 'number') return `${formatNumber(control)}% menos plaga`;
  if (control.infestacion_reduccion_pct_min !== undefined) {
    return formatRange(
      control.infestacion_reduccion_pct_min,
      control.infestacion_reduccion_pct_max,
      '% menos infestacion',
    );
  }
  return 'Control reportado';
}

function extraIndicator(item) {
  const otros = item.policultivo?.otros_indicadores;
  if (!otros) return null;
  if (otros.productividad_total_sistema_factor) {
    return `${formatNumber(otros.productividad_total_sistema_factor)}x productividad total del sistema`;
  }
  if (otros.carbono_biomasa_mg_C_ha) {
    return `${formatNumber(otros.carbono_biomasa_mg_C_ha)} Mg C/ha en biomasa`;
  }
  if (otros.ganancia_t_ha) return `+${formatNumber(otros.ganancia_t_ha)} t/ha reportadas`;
  return null;
}

function MetricCard({ icon, label, mono, poli, emphasis }) {
  const MetricIcon = icon;

  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-stone-700">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-lime-100 text-lime-800">
          <MetricIcon size={18} aria-hidden="true" />
        </span>
        <h4 className="text-sm font-black leading-tight">{label}</h4>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-stone-100 p-2">
          <p className="text-[0.68rem] font-bold uppercase tracking-wide text-stone-500">Monocultivo</p>
          <p className="mt-1 text-sm font-extrabold leading-tight text-stone-900">{mono}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-2 ring-1 ring-emerald-200">
          <p className="text-[0.68rem] font-bold uppercase tracking-wide text-emerald-700">Policultivo</p>
          <p className="mt-1 text-sm font-extrabold leading-tight text-emerald-950">{poli}</p>
        </div>
      </div>
      {emphasis && <p className="mt-2 text-xs font-semibold text-lime-900">{emphasis}</p>}
    </article>
  );
}

function AssociationPanel({ item }) {
  const confidenceClass = confidenceStyles[item.confianza] || confidenceStyles.media;
  const extra = extraIndicator(item);

  return (
    <section
      data-testid={`asociacion-${item.id}`}
      className="overflow-hidden rounded-[1.75rem] border border-lime-200 bg-stone-50 shadow-[0_20px_60px_rgba(63,72,47,0.14)]"
    >
      <div className="bg-[linear-gradient(135deg,#193a2f,#386641_52%,#a7c957)] p-4 text-white sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-lime-100">Simulador de decision</p>
            <h3 className="mt-1 text-2xl font-black leading-tight">{item.asociacion}</h3>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${confidenceClass}`}>
            Confianza {item.confianza}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {item.cultivos.map((cultivo) => (
            <span key={cultivo} className="rounded-full bg-white/16 px-3 py-1 text-sm font-bold text-white ring-1 ring-white/25">
              {cultivo}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-5">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-stone-200 text-stone-800">
              <BarChart3 size={19} aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-stone-500">Escenario</p>
              <h4 className="text-lg font-black text-stone-950">Monocultivo</h4>
            </div>
          </div>
          <p className="text-sm font-semibold leading-relaxed text-stone-700">{item.monocultivo.insumos}</p>
          <p className="mt-3 rounded-xl bg-stone-100 p-3 text-sm font-black text-stone-900">
            Rendimiento base: {item.monocultivo.rendimiento_rel ? `${item.monocultivo.rendimiento_rel}x` : 'linea base'}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-700 text-white">
              <Leaf size={19} aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Escenario</p>
              <h4 className="text-lg font-black text-emerald-950">Policultivo</h4>
            </div>
          </div>
          <p className="text-sm font-semibold leading-relaxed text-emerald-950">{item.diferencia_resumen}</p>
          {extra && <p className="mt-3 rounded-xl bg-white/80 p-3 text-sm font-black text-emerald-950">{extra}</p>}
        </div>
      </div>

      <div className="grid gap-3 px-3 pb-3 sm:grid-cols-2 lg:grid-cols-4 sm:px-5 sm:pb-5">
        <MetricCard
          icon={TrendingUp}
          label="Rendimiento y LER"
          mono="1x base"
          poli={lerText(item.policultivo.LER)}
          emphasis="LER mayor que 1 indica mejor uso de tierra."
        />
        <MetricCard
          icon={Sprout}
          label="Nitrogeno fijado"
          mono="Depende del manejo"
          poli={nitrogenText(item)}
          emphasis=""
        />
        <MetricCard
          icon={FlaskConical}
          label="Ahorro de insumos"
          mono="Compra completa"
          poli={inputSavingsText(item.policultivo.ahorro_insumos)}
          emphasis=""
        />
        <MetricCard
          icon={ShieldCheck}
          label="Control de plaga"
          mono="Mayor presion"
          poli={pestControlText(item.policultivo.control_plaga_pct)}
          emphasis=""
        />
      </div>

      <details className="border-t border-lime-200 bg-white px-4 py-3 text-sm text-stone-700 sm:px-5">
        <summary className="cursor-pointer font-black text-stone-900">Fuente usada</summary>
        <p className="mt-2 break-words leading-relaxed">{item.fuente}</p>
      </details>
    </section>
  );
}

export default function MonoVsPoliSimulator({ data = asociaciones }) {
  return (
    <div data-testid="mono-vs-poli-simulator" className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-4 sm:px-5">
      <header className="rounded-[1.75rem] border border-lime-200 bg-[#f7f3e8] p-4 shadow-sm sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-800">Juego monocultivo vs policultivo</p>
        <h2 className="mt-2 text-3xl font-black leading-tight text-stone-950 sm:text-4xl">
          Compare cifras reales antes de sembrar
        </h2>
        <p className="mt-3 max-w-3xl text-base font-semibold leading-relaxed text-stone-700">
          Cada tarjeta pone el monocultivo y el policultivo lado a lado, con rendimiento, nitrogeno,
          ahorro de insumos, control de plaga, frase campesina, fuente y confianza.
        </p>
      </header>

      <div className="flex flex-col gap-5">
        {data.map((item) => (
          <AssociationPanel key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
