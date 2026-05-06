import React, { useEffect, useState } from 'react';
import { Sprout, AlertTriangle, Users, Beaker, Mountain, BookOpen, Loader2 } from 'lucide-react';

const FREQ_BADGE = {
  muy_comun: { label: 'Muy común', cls: 'bg-rose-900/40 text-rose-300 border-rose-800/60' },
  comun: { label: 'Común', cls: 'bg-amber-900/40 text-amber-300 border-amber-800/60' },
  ocasional: { label: 'Ocasional', cls: 'bg-slate-800 text-slate-400 border-slate-700' },
};

const ZONE_LABEL = {
  calido: '🌴 Cálido (<1200 msnm)',
  templado: '🌳 Templado (1200-2200 msnm)',
  frio: '🌲 Frío (2200-2800 msnm)',
  paramo: '🏔️ Páramo (>2800 msnm)',
};

const DIFFICULTY_BADGE = {
  starter: { label: 'Starter · cultivo escuela', cls: 'bg-emerald-900/40 text-emerald-300 border-emerald-800/60' },
  starter_premium: { label: 'Starter Premium · requiere precisión', cls: 'bg-emerald-900/40 text-emerald-200 border-emerald-700/60' },
  intermediate: { label: 'Intermediate · tutorado obligatorio', cls: 'bg-amber-900/40 text-amber-200 border-amber-700/60' },
  advanced: { label: 'Advanced · perenne / injerto', cls: 'bg-orange-900/40 text-orange-200 border-orange-700/60' },
};

/**
 * CycleContentRenderer — Lazy loader + renderer del corpus curado por especie.
 *
 * Lee `/public/cycle-content/<slug>.json` (consolidado DR-034 3/3 LLMs +
 * curación pendiente Guatoc / Agrosavia / Cenicafé).
 *
 * Datos vienen del DR-034 cerrado 2026-05-06 (ADR-032). NO mezclar con
 * folclore/biodinámica — política ADR-033 Opción C estricta.
 */
export default function CycleContentRenderer({ slug, onClose }) {
  const [state, setState] = useState({ slug: null, data: null, error: null });

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${import.meta.env.BASE_URL}cycle-content/${slug}.json`, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`No se encontró el ciclo de ${slug}`);
        return r.json();
      })
      .then((j) => setState({ slug, data: j, error: null }))
      .catch((e) => { if (e.name !== 'AbortError') setState({ slug, data: null, error: e.message }); });
    return () => ctrl.abort();
  }, [slug]);

  const isLoading = state.slug !== slug;
  const data = isLoading ? null : state.data;
  const error = isLoading ? null : state.error;

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-rose-900/20 border border-rose-800/50">
        <p className="text-sm text-rose-300">{error}</p>
        <button type="button" onClick={onClose} className="mt-2 text-xs underline text-slate-400">Volver</button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 flex items-center justify-center gap-2 text-slate-400">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Cargando corpus de {slug}…</span>
      </div>
    );
  }

  const diff = DIFFICULTY_BADGE[data.difficulty] ?? { label: data.difficulty, cls: 'bg-slate-800 text-slate-300 border-slate-700' };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-emerald-300">{data.common_names?.[0] ?? data.species_slug}</h3>
            <p className="text-xs italic text-slate-500">{data.scientific_name}</p>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="text-xs text-slate-400 hover:text-slate-200 underline">Cerrar</button>
          )}
        </div>
        <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold border ${diff.cls}`}>{diff.label}</span>
        {data.tiempo_a_cosecha_dias && (
          <span className="ml-2 text-[11px] text-slate-400">
            ⏱ {data.tiempo_a_cosecha_dias.min}–{data.tiempo_a_cosecha_dias.max} días (típico {data.tiempo_a_cosecha_dias.tipico})
          </span>
        )}
      </div>

      {data.diferenciador_colombiano && (
        <Block icon={Mountain} title="Diferenciador colombiano" tone="emerald">
          <p className="text-xs text-slate-300 leading-relaxed">{data.diferenciador_colombiano}</p>
        </Block>
      )}

      {data.leccion_agroecologica && (
        <Block icon={BookOpen} title="Lección agroecológica" tone="emerald">
          <p className="text-xs text-slate-300 leading-relaxed">{data.leccion_agroecologica}</p>
        </Block>
      )}

      {data.thermal_zone_decisions && (
        <Block icon={Mountain} title="Decisiones por piso térmico" tone="slate">
          <ul className="space-y-2 text-xs">
            {Object.entries(data.thermal_zone_decisions).map(([zone, txt]) => (
              <li key={zone} className="border-l-2 border-emerald-700/60 pl-2">
                <p className="font-bold text-slate-200">{ZONE_LABEL[zone] ?? zone}</p>
                <p className="text-slate-400 leading-relaxed">{txt}</p>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {Array.isArray(data.milestones) && data.milestones.length > 0 && (
        <Block icon={Sprout} title="Hitos del ciclo" tone="emerald">
          <ol className="space-y-2 text-xs">
            {data.milestones.map((m, i) => (
              <li key={i} className="rounded-lg p-2 bg-slate-900 border border-slate-800">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-bold text-emerald-300 capitalize">{(m.fase || '').replace(/_/g, ' ')}</span>
                  <span className="text-[10px] text-slate-500">día {m.dias_relativos}</span>
                </div>
                {m.criterio_observable && <p className="text-slate-400 mt-0.5"><strong className="text-slate-300">Observe:</strong> {m.criterio_observable}</p>}
                {m.accion_clave && <p className="text-slate-400 mt-0.5"><strong className="text-slate-300">Haga:</strong> {m.accion_clave}</p>}
              </li>
            ))}
          </ol>
        </Block>
      )}

      {Array.isArray(data.failure_modes) && data.failure_modes.length > 0 && (
        <Block icon={AlertTriangle} title="Razones comunes de fracaso" tone="amber">
          <p className="text-[10px] text-slate-500 italic mb-2">Documentado para que falle menos. Cuando le pase alguno, no se sienta solo — está en el manual.</p>
          <ul className="space-y-2 text-xs">
            {data.failure_modes.map((f, i) => {
              const badge = FREQ_BADGE[f.frecuencia] ?? FREQ_BADGE.ocasional;
              return (
                <li key={i} className="rounded-lg p-2 bg-slate-900 border border-slate-800">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-bold text-amber-200">{f.razon}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] border ${badge.cls}`}>{badge.label}</span>
                  </div>
                  {f.cuando && <p className="text-[10px] text-slate-500 mt-0.5">aparece en: {f.cuando}</p>}
                  {f.sintoma && <p className="text-slate-400 mt-1"><strong className="text-slate-300">Síntoma:</strong> {f.sintoma}</p>}
                  {f.mitigacion && <p className="text-slate-400 mt-0.5"><strong className="text-slate-300">Prevención:</strong> {f.mitigacion}</p>}
                </li>
              );
            })}
          </ul>
        </Block>
      )}

      {Array.isArray(data.companions) && data.companions.length > 0 && (
        <Block icon={Users} title="Compañeros validados" tone="emerald">
          <ul className="space-y-1 text-xs">
            {data.companions.map((c, i) => (
              <li key={i}>
                <span className="font-bold text-emerald-300">{c.especie}</span>
                <span className="text-slate-400"> — {c.razon}</span>
                {c.evidencia && <span className="text-[10px] text-slate-600"> · {c.evidencia}</span>}
              </li>
            ))}
          </ul>
        </Block>
      )}

      {Array.isArray(data.antagonistas) && data.antagonistas.length > 0 && (
        <Block icon={Users} title="No los siembre cerca" tone="rose">
          <ul className="space-y-1 text-xs">
            {data.antagonistas.map((a, i) => (
              <li key={i}>
                <span className="font-bold text-rose-300">{a.especie}</span>
                <span className="text-slate-400"> — {a.razon}</span>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {Array.isArray(data.biopreparados) && data.biopreparados.length > 0 && (
        <Block icon={Beaker} title="Biopreparados" tone="emerald">
          <ul className="space-y-1 text-xs">
            {data.biopreparados.map((b, i) => (
              <li key={i}>
                <span className="font-bold text-emerald-300">{b.nombre}</span>
                <span className="text-slate-400"> — {b.uso}</span>
                {b.fuente && <span className="text-[10px] text-slate-600 italic"> · {b.fuente}</span>}
              </li>
            ))}
          </ul>
        </Block>
      )}

      {data.cosecha_estimada_kg_por_planta && (
        <Block icon={Sprout} title="Cosecha estimada (rangos conservadores)" tone="emerald">
          <RangeRenderer data={data.cosecha_estimada_kg_por_planta} />
          {data.cosecha_estimada_kg_por_planta.anti_overpromise && (
            <p className="text-[10px] text-amber-300/80 italic mt-2 leading-relaxed">⚠️ {data.cosecha_estimada_kg_por_planta.anti_overpromise}</p>
          )}
        </Block>
      )}

      {data.curacion_status && (
        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-500 italic">
          <p>Estado: <strong className="text-slate-400">{data.curacion_status}</strong></p>
          {Array.isArray(data.curacion_pendiente) && data.curacion_pendiente.length > 0 && (
            <ul className="mt-1 list-disc pl-4 space-y-0.5">
              {data.curacion_pendiente.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          )}
          {data.convergencia_dr_034 && <p className="mt-1">{data.convergencia_dr_034}</p>}
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line no-unused-vars -- Icon SE USA en JSX más abajo, eslint react-jsx detection falla con destructuring rename
function Block({ icon: Icon, title, tone, children }) {
  const ring = {
    emerald: 'border-emerald-800/40 bg-emerald-900/10',
    amber: 'border-amber-800/40 bg-amber-900/10',
    rose: 'border-rose-800/40 bg-rose-900/10',
    slate: 'border-slate-800 bg-slate-900/40',
  }[tone] ?? 'border-slate-800 bg-slate-900/40';

  return (
    <section className={`rounded-xl p-3 border ${ring}`}>
      <header className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-emerald-400" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">{title}</h4>
      </header>
      {children}
    </section>
  );
}

function RangeRenderer({ data }) {
  const entries = Object.entries(data).filter(([k]) => k !== 'anti_overpromise');
  return (
    <ul className="space-y-1 text-xs">
      {entries.map(([k, v]) => {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          if ('min' in v || 'tipico' in v || 'max' in v) {
            const parts = [];
            if (v.min != null) parts.push(`mín ${v.min}`);
            if (v.tipico != null) parts.push(`típico ${v.tipico}`);
            if (v.max != null) parts.push(`máx ${v.max}`);
            return <li key={k}><strong className="text-slate-200 capitalize">{k.replace(/_/g, ' ')}:</strong> <span className="text-slate-400">{parts.join(' · ')}</span></li>;
          }
          // Nested object (por_variedad)
          return (
            <li key={k}>
              <strong className="text-slate-200 capitalize">{k.replace(/_/g, ' ')}:</strong>
              <ul className="pl-4 mt-0.5 space-y-0.5">
                {Object.entries(v).map(([vk, vv]) => (
                  <li key={vk} className="text-slate-400 text-[11px]">
                    {vk}: {typeof vv === 'object' ? Object.entries(vv).map(([kk, vvv]) => `${kk} ${vvv}`).join(', ') : String(vv)}
                  </li>
                ))}
              </ul>
            </li>
          );
        }
        return null;
      })}
    </ul>
  );
}
