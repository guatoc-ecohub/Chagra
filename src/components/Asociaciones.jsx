import { useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, Leaf, Network, Sprout } from 'lucide-react';
import arquetipos from '../data/asociaciones-arquetipos.json';
import comparativas from '../data/asociaciones-comparativa.json';
import {
  buildAsociacionesView,
  findCultivoInItems,
  getCultivosFromPlants,
  selectCultivoInicial,
} from '../services/asociacionesFilter';
import useAssetStore from '../store/useAssetStore';

const plotPositions = [
  { left: '50%', top: '14%' },
  { left: '23%', top: '52%' },
  { left: '77%', top: '52%' },
  { left: '50%', top: '78%' },
];

function CultivoNode({ cultivo, index, selected }) {
  const pos = plotPositions[index % plotPositions.length];
  return (
    <div
      className={`absolute grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 text-center shadow-sm ${
        selected
          ? 'border-emerald-950 bg-emerald-700 text-white'
          : 'border-emerald-200 bg-white text-emerald-950'
      }`}
      style={pos}
    >
      <span className="px-1 text-[11px] font-black leading-tight">{cultivo.nombre}</span>
    </div>
  );
}

function PolycultureDiagram({ item, cultivoSeleccionado }) {
  const selected = cultivoSeleccionado || '';
  return (
    <div className="relative min-h-56 overflow-hidden rounded-lg border border-emerald-200 bg-[linear-gradient(90deg,rgba(16,185,129,.09)_1px,transparent_1px),linear-gradient(rgba(16,185,129,.09)_1px,transparent_1px)] bg-[size:28px_28px] p-3">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M50 14 L23 52 L50 78 L77 52 Z" fill="none" stroke="#047857" strokeWidth="1.8" strokeDasharray="4 3" />
        <path d="M23 52 H77" fill="none" stroke="#65a30d" strokeWidth="1.8" />
        <path d="M50 14 V78" fill="none" stroke="#65a30d" strokeWidth="1.8" />
      </svg>
      <div className="absolute left-3 top-3 rounded-md bg-white/90 px-2 py-1 text-[11px] font-black uppercase text-emerald-900 shadow-sm">
        Diagrama de siembra
      </div>
      {(item.cultivos || []).map((cultivo, index) => (
        <CultivoNode
          key={cultivo.id}
          cultivo={cultivo}
          index={index}
          selected={cultivo.id === selected || cultivo.nombre === selected}
        />
      ))}
      <div className="absolute bottom-3 left-3 right-3 rounded-md bg-white/90 px-3 py-2 text-xs font-semibold leading-snug text-slate-700 shadow-sm">
        Estratos: {(item.cultivos || []).map((cultivo) => `${cultivo.nombre} (${cultivo.estrato})`).join(', ')}.
      </div>
    </div>
  );
}

function Metricas({ metricas, comparativa }) {
  if (!metricas.length) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
        Este arquetipo aún no tiene cifras en asociaciones-comparativa.json.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {metricas.map((metrica) => (
        <div key={metrica} className="rounded-lg border border-lime-200 bg-lime-50 px-3 py-2">
          <p className="text-sm font-black leading-tight text-lime-950">{metrica}</p>
        </div>
      ))}
      {comparativa?.confianza && (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <p className="text-sm font-black leading-tight text-slate-800">confianza {comparativa.confianza}</p>
        </div>
      )}
    </div>
  );
}

function RecomendacionCard({ item, cultivoSeleccionado }) {
  const relaciones = item.relacionesCultivo.length ? item.relacionesCultivo : item.relaciones || [];
  const antagonistas = item.antagonistasCultivo.length ? item.antagonistasCultivo : item.antagonistas || [];

  return (
    <article
      aria-label={item.nombre}
      className="overflow-hidden rounded-lg border border-emerald-200 bg-white shadow-sm"
    >
      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-emerald-100 text-3xl" aria-hidden="true">
              {item.icono}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Sembrar con</p>
              <h3 className="text-xl font-black leading-tight text-slate-950">{item.nombre}</h3>
              <p className="mt-1 text-sm font-semibold leading-snug text-slate-600">
                Compañeras: {item.companeras.map((cultivo) => cultivo.nombre).join(', ') || 'sistema completo'}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-lg bg-emerald-950 p-3 text-white">
              <div className="flex items-center gap-2 text-sm font-black">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Acción recomendada
              </div>
              <p className="mt-1 text-sm leading-relaxed text-emerald-50">{item.accion}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                <Leaf className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                Por qué funciona
              </div>
              <div className="mt-2 grid gap-2">
                {relaciones.map((rel) => (
                  <div key={`${rel.origen}-${rel.destino}-${rel.beneficio}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-black text-slate-950">
                      {rel.tipo}: {rel.beneficio}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700">{rel.razon}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                <BarChart3 className="h-4 w-4 text-lime-700" aria-hidden="true" />
                Beneficio real, sin inventar cifras
              </div>
              <div className="mt-2">
                <Metricas metricas={item.metricas} comparativa={item.comparativa} />
              </div>
              {item.comparativa?.diferencia_resumen && (
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.comparativa.diferencia_resumen}</p>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm font-black text-red-900">
                <AlertTriangle className="h-4 w-4 text-red-700" aria-hidden="true" />
                Evitar
              </div>
              {antagonistas.length ? (
                <div className="mt-2 grid gap-2">
                  {antagonistas.map((ant) => (
                    <div key={`${ant.cultivo}-${ant.slug}`} className="rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-sm font-black text-red-950">
                        {ant.evitar} ({ant.tipo})
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-red-900">{ant.razon}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                  No hay antagonista curado para este cultivo en este arquetipo.
                </p>
              )}
            </div>
          </div>
        </div>

        <PolycultureDiagram item={item} cultivoSeleccionado={cultivoSeleccionado} />
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold leading-snug text-slate-600">
        Fuente: {item.fuente}
        {item.comparativa?.fuente ? `; cifras: ${item.comparativa.fuente}` : ''}
      </div>
    </article>
  );
}

export default function Asociaciones({ profile = {}, esOperador = false }) {
  const plants = useAssetStore((state) => state.plants);
  const cultivosFinca = useMemo(() => getCultivosFromPlants(plants), [plants]);
  const cultivosFincaLabel = useMemo(
    () => cultivosFinca.map((cultivo) => findCultivoInItems(arquetipos, cultivo)?.nombre || cultivo),
    [cultivosFinca]
  );
  const [cultivoManual, setCultivoManual] = useState('');
  const cultivoInicial = useMemo(
    () => selectCultivoInicial(arquetipos, profile, { esOperador, cultivosFinca }),
    [profile, esOperador, cultivosFinca]
  );
  const view = useMemo(
    () => buildAsociacionesView(arquetipos, comparativas, profile, {
      esOperador,
      cultivosFinca,
      cultivoSeleccionado: cultivoManual || cultivoInicial,
    }),
    [profile, esOperador, cultivosFinca, cultivoManual, cultivoInicial]
  );
  const selected = cultivoManual || view.cultivoSeleccionado;

  return (
    <section className="space-y-4" aria-labelledby="asociaciones-title">
      <div className="rounded-lg border border-emerald-900 bg-emerald-950 p-4 text-white sm:p-5">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-emerald-200">
          <Network className="h-4 w-4" aria-hidden="true" />
          Red práctica de cultivos
        </div>
        <h2 id="asociaciones-title" className="mt-2 text-2xl font-black leading-tight sm:text-3xl">
          Asociaciones útiles por cultivo
        </h2>
        <p className="mt-2 max-w-3xl text-base leading-relaxed text-emerald-50">
          Elige qué tienes sembrado y revisa compañeras, antagonistas, razón agronómica y cifras comparativas disponibles offline.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label htmlFor="cultivo-asociaciones" className="flex items-center gap-2 text-sm font-black text-slate-900">
          <Sprout className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          Cultivo a planear
        </label>
        <select
          id="cultivo-asociaciones"
          value={selected}
          onChange={(event) => setCultivoManual(event.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base font-bold text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-200"
        >
          {view.disponibles.map((cultivo) => (
            <option key={cultivo.id} value={cultivo.id}>
              {cultivo.nombre}
            </option>
          ))}
        </select>
        {cultivosFincaLabel.length > 0 && (
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Detectado en tu finca: {cultivosFincaLabel.slice(0, 4).join(', ')}
          </p>
        )}
      </div>

      {view.recomendaciones.length === 0 ? (
        <div className="rounded-lg border border-slate-300 bg-white p-5 text-base text-slate-700">
          No hay asociaciones curadas para este cultivo todavía.
        </div>
      ) : (
        <div className="space-y-3">
          {view.recomendaciones.map((item) => (
            <RecomendacionCard key={item.id} item={item} cultivoSeleccionado={selected} />
          ))}
        </div>
      )}
    </section>
  );
}
