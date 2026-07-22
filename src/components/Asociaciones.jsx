import { useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, Leaf, Network, Sprout, TrendingUp, Layers, Sparkles, Users, Zap, Shield } from 'lucide-react';
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

function CultivoNode({ cultivo, index, selected, isCompanera }) {
  const pos = plotPositions[index % plotPositions.length];
  const isSelected = cultivo.id === selected || cultivo.nombre === selected;

  return (
    <div
      className={`absolute grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 text-center shadow-sm transition-all duration-300 ${
        isSelected
          ? 'border-emerald-950 bg-emerald-700 text-white scale-110 z-10'
          : isCompanera
          ? 'border-lime-400 bg-lime-50 text-lime-900'
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
  const companeras = (item.companeras || []).map(c => c.id || c.nombre);

  return (
    <div className="relative min-h-64 overflow-hidden rounded-xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-lime-50 p-4 shadow-lg">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id="grid-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(16,185,129,0.1)" />
            <stop offset="100%" stopColor="rgba(132,204,22,0.1)" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#grid-gradient)" />
        <path d="M50 14 L23 52 L50 78 L77 52 Z" fill="none" stroke="#047857" strokeWidth="2" strokeDasharray="5 4" opacity="0.6" />
        <path d="M23 52 H77" fill="none" stroke="#65a30d" strokeWidth="2" opacity="0.4" />
        <path d="M50 14 V78" fill="none" stroke="#65a30d" strokeWidth="2" opacity="0.4" />
      </svg>

      {/* Leyenda mejorada */}
      <div className="absolute left-3 top-3 rounded-lg bg-white/95 px-3 py-2 shadow-md border border-emerald-200">
        <div className="flex items-center gap-2 mb-1">
          <Network className="h-4 w-4 text-emerald-700" />
          <span className="text-xs font-black uppercase text-emerald-900">Diagrama de siembra</span>
        </div>
        <div className="flex gap-3 text-[10px] font-semibold">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-700"></div>
            <span>Tu cultivo</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-lime-400"></div>
            <span>Compañeros</span>
          </div>
        </div>
      </div>

      {/* Nodos de cultivo */}
      {(item.cultivos || []).map((cultivo, index) => (
        <CultivoNode
          key={cultivo.id}
          cultivo={cultivo}
          index={index}
          selected={selected}
          isCompanera={companeras.includes(cultivo.id) || companeras.includes(cultivo.nombre)}
        />
      ))}

      {/* Información de estratos mejorada */}
      <div className="absolute bottom-3 left-3 right-3 rounded-lg bg-white/95 px-4 py-3 shadow-md border border-emerald-200">
        <div className="flex items-center gap-2 mb-2">
          <Layers className="h-4 w-4 text-emerald-700" />
          <span className="text-xs font-black uppercase text-emerald-900">Estratos del sistema</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs font-semibold leading-snug text-slate-700">
          {(item.cultivos || []).map((cultivo) => (
            <div key={cultivo.id} className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              <span>{cultivo.nombre} ({cultivo.estrato})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Indicador de LER si está disponible */}
      {item.comparativa?.policultivo?.LER && (
        <div className="absolute top-3 right-3 rounded-lg bg-gradient-to-br from-lime-500 to-lime-600 px-3 py-2 shadow-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-white" />
            <div>
              <div className="text-[10px] font-bold text-lime-50 uppercase">LER</div>
              <div className="text-sm font-black text-white">
                {item.comparativa.policultivo.LER.valor_aprox ||
                 item.comparativa.policultivo.LER.valor ||
                 `${item.comparativa.policultivo.LER.min}-${item.comparativa.policultivo.LER.max}`}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metricas({ metricas, comparativa }) {
  if (!metricas.length) {
    return (
      <div className="rounded-lg border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100 p-4 text-sm font-semibold text-amber-900 shadow-md">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Datos en investigación</p>
            <p className="mt-1 text-sm leading-relaxed">Este arquetipo aún no tiene cifras verificadas en asociaciones-comparativa.json. Próximamente añadiremos métricas reales.</p>
          </div>
        </div>
      </div>
    );
  }

  // Agrupar métricas por categoría para mejor visualización
  const metricasPrincipales = metricas.slice(0, 3);
  const metricasSecundarias = metricas.slice(3);

  return (
    <div className="space-y-3">
      {/* Métricas principales destacadas */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {metricasPrincipales.map((metrica, index) => (
          <div
            key={metrica}
            className={`rounded-lg border-2 px-4 py-3 shadow-sm transition-all hover:shadow-md ${
              index === 0
                ? 'border-lime-400 bg-gradient-to-br from-lime-50 to-lime-100'
                : index === 1
                ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-emerald-100'
                : 'border-teal-400 bg-gradient-to-br from-teal-50 to-teal-100'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {index === 0 && <TrendingUp className="h-4 w-4 text-lime-700" />}
              {index === 1 && <Sparkles className="h-4 w-4 text-emerald-700" />}
              {index === 2 && <Shield className="h-4 w-4 text-teal-700" />}
              <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
                {index === 0 ? 'Rendimiento' : index === 1 ? 'Nutrición' : 'Protección'}
              </p>
            </div>
            <p className="text-sm font-black leading-tight text-slate-900">{metrica}</p>
          </div>
        ))}
      </div>

      {/* Métricas secundarias */}
      {metricasSecundarias.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {metricasSecundarias.map((metrica) => (
            <div key={metrica} className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <p className="text-sm font-semibold leading-tight text-slate-800">{metrica}</p>
            </div>
          ))}
        </div>
      )}

      {/* Indicador de confianza */}
      {comparativa?.confianza && (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2">
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${
              comparativa.confianza === 'alta' ? 'bg-green-600' :
              comparativa.confianza === 'media' ? 'bg-amber-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm font-bold text-slate-700">
              Confianza científica: <span className="uppercase">{comparativa.confianza}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function RecomendacionCard({ item, cultivoSeleccionado }) {
  const relaciones = item.relacionesCultivo.length ? item.relacionesCultivo : item.relaciones || [];
  const antagonistas = item.antagonistasCultivo.length ? item.antagonistasCultivo : item.antagonistas || [];
  const hasLER = item.comparativa?.policultivo?.LER;

  return (
    <article
      aria-label={item.nombre}
      className="overflow-hidden rounded-xl border-2 border-emerald-200 bg-white shadow-lg hover:shadow-xl transition-shadow"
    >
      {/* Header más impactante */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-3 sm:px-5">
        <div className="flex items-start gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-white/20 text-4xl backdrop-blur-sm" aria-hidden="true">
            {item.icono}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-black uppercase tracking-wider text-emerald-100">Sistema recomendado</p>
              {hasLER && (
                <span className="rounded-full bg-lime-400 px-2 py-0.5 text-xs font-black text-lime-900">
                  Alto rendimiento
                </span>
              )}
            </div>
            <h3 className="text-xl sm:text-2xl font-black leading-tight text-white">{item.nombre}</h3>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          {/* Compañeros destacados */}
          <div className="rounded-lg border-2 border-lime-200 bg-gradient-to-r from-lime-50 to-emerald-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-lime-700" />
              <h4 className="text-sm font-black uppercase text-slate-800">Compañeros ideales</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {(item.companeras || []).map((cultivo) => (
                <span
                  key={cultivo.id}
                  className="inline-flex items-center gap-1 rounded-full bg-lime-100 px-3 py-1 text-sm font-bold text-lime-900 border border-lime-300"
                >
                  <span className="text-lime-600">🌱</span>
                  {cultivo.nombre}
                </span>
              ))}
              {(!item.companeras || item.companeras.length === 0) && (
                <span className="text-sm font-semibold text-slate-600">Sistema completo integrado</span>
              )}
            </div>
          </div>

          {/* Acción recomendada más destacada */}
          <div className="rounded-lg bg-gradient-to-br from-emerald-800 to-emerald-900 p-4 text-white shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase text-emerald-200">Plan de acción</p>
                <p className="text-xs font-semibold text-emerald-100">Implementación práctica</p>
              </div>
            </div>
            <p className="text-base leading-relaxed font-medium text-emerald-50">{item.accion}</p>
          </div>

          {/* Por qué funciona - Rediseñado */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Leaf className="h-5 w-5 text-emerald-700" />
              <h4 className="text-sm font-black uppercase text-slate-800">Por qué funciona</h4>
            </div>
            <div className="space-y-2">
              {relaciones.map((rel, index) => (
                <div
                  key={`${rel.origen}-${rel.destino}-${rel.beneficio}`}
                  className={`rounded-lg border-l-4 p-3 shadow-sm transition-all hover:shadow-md ${
                    index === 0
                      ? 'border-l-emerald-500 bg-emerald-50'
                      : index === 1
                      ? 'border-l-lime-500 bg-lime-50'
                      : 'border-l-teal-500 bg-teal-50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black ${
                      index === 0 ? 'bg-emerald-600 text-white' :
                      index === 1 ? 'bg-lime-500 text-white' : 'bg-teal-600 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-950">
                        {rel.beneficio}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-700">{rel.razon}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Beneficio real con cifras */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-5 w-5 text-lime-700" />
              <h4 className="text-sm font-black uppercase text-slate-800">Beneficio comprobado</h4>
            </div>
            <div className="mt-2">
              <Metricas metricas={item.metricas} comparativa={item.comparativa} />
            </div>
            {item.comparativa?.diferencia_resumen && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm leading-relaxed text-slate-700 font-medium">{item.comparativa.diferencia_resumen}</p>
              </div>
            )}
          </div>

          {/* Evitar - Alerta clara */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-red-700" />
              <h4 className="text-sm font-black uppercase text-red-900">Evitar estas combinaciones</h4>
            </div>
            {antagonistas.length ? (
              <div className="space-y-2">
                {antagonistas.map((ant) => (
                  <div
                    key={`${ant.cultivo}-${ant.slug}`}
                    className="rounded-lg border-2 border-red-200 bg-gradient-to-r from-red-50 to-red-100 p-3 shadow-sm"
                  >
                    <div className="flex items-start gap-2">
                      <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-red-600 text-white">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-red-950">
                          {ant.evitar}
                        </p>
                        <p className="mt-1 text-xs font-bold uppercase text-red-700">{ant.tipo}</p>
                        <p className="mt-1 text-sm leading-relaxed text-red-900">{ant.razon}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="text-sm font-semibold text-green-900">
                    No hay antagonistas conocidos para este cultivo en este sistema.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Diagrama visual en el lado derecho */}
        <PolycultureDiagram item={item} cultivoSeleccionado={cultivoSeleccionado} />
      </div>

      {/* Footer con fuentes */}
      <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-1 text-xs font-semibold leading-snug text-slate-600">
          <div className="flex items-start gap-2">
            <span className="font-bold text-slate-700">📚 Fuente:</span>
            <span>{item.fuente}</span>
          </div>
          {item.comparativa?.fuente && (
            <div className="flex items-start gap-2">
              <span className="font-bold text-slate-700">📊 Cifras:</span>
              <span>{item.comparativa.fuente}</span>
            </div>
          )}
        </div>
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

  // Detectar cultivos de la finca para selección automática
  const cultivosFincaPrincipales = cultivosFincaLabel.slice(0, 4);
  const tieneCultivosFinca = cultivosFincaPrincipales.length > 0;

  return (
    <section className="space-y-4 sm:space-y-6" aria-labelledby="asociaciones-title">
      {/* Header más impactante y orientado a la acción */}
      <div className="rounded-xl border-2 border-emerald-900 bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 p-4 text-white shadow-xl sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-700">
            <Network className="h-7 w-7 text-emerald-100" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-200">
              <span className="rounded-full bg-emerald-600 px-2 py-1">Offline</span>
              <span className="rounded-full bg-lime-600 px-2 py-1">Datos reales</span>
            </div>
            <h2 id="asociaciones-title" className="mt-1 text-2xl sm:text-3xl font-black leading-tight">
              Asociaciones inteligentes
            </h2>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-start gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-700">
              <Users className="h-5 w-5 text-emerald-100" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-200 uppercase">Compañeros ideales</p>
              <p className="text-sm font-semibold text-emerald-50">Saber qué sembrar junto</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-600">
              <AlertTriangle className="h-5 w-5 text-red-100" />
            </div>
            <div>
              <p className="text-xs font-bold text-red-200 uppercase">Evitar combinaciones</p>
              <p className="text-sm font-semibold text-emerald-50">Antagonistas conocidos</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-lime-600">
              <BarChart3 className="h-5 w-5 text-lime-100" />
            </div>
            <div>
              <p className="text-xs font-bold text-lime-200 uppercase">Beneficios reales</p>
              <p className="text-sm font-semibold text-emerald-50">LER, fijación N, ahorro</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal-600">
              <Sparkles className="h-5 w-5 text-teal-100" />
            </div>
            <div>
              <p className="text-xs font-bold text-teal-200 uppercase">Plan de acción</p>
              <p className="text-sm font-semibold text-emerald-50">Instrucciones prácticas</p>
            </div>
          </div>
        </div>

        <p className="mt-4 max-w-3xl text-base leading-relaxed text-emerald-50 border-t border-emerald-700 pt-4">
          <strong>Elige tu cultivo</strong> y descubre qué sembrar con él, qué evitar, por qué funciona y cuánto puedes ganar.
          Todo basado en <strong>investigación real</strong>, no en promesas.
        </p>
      </div>

      {/* Selector de cultivo mejorado */}
      <div className="rounded-xl border-2 border-slate-200 bg-white p-4 shadow-lg sm:p-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <label htmlFor="cultivo-asociaciones" className="flex items-center gap-2 text-sm font-black text-slate-900 mb-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100">
                <Sprout className="h-5 w-5 text-emerald-700" />
              </div>
              <span>¿Qué cultivo quieres planear?</span>
            </label>
            <select
              id="cultivo-asociaciones"
              value={selected}
              onChange={(event) => setCultivoManual(event.target.value)}
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base font-bold text-slate-950 outline-none transition-all hover:border-emerald-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-200"
            >
              {view.disponibles.map((cultivo) => (
                <option key={cultivo.id} value={cultivo.id}>
                  {cultivo.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Indicador de cultivos de la finca */}
          {tieneCultivosFinca && (
            <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-3 sm:text-right">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase text-emerald-700">Detectado en tu finca</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {cultivosFincaPrincipales.map((cultivo) => (
                  <span
                    key={cultivo}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-200 px-2 py-1 text-xs font-bold text-emerald-900"
                  >
                    <span className="text-emerald-700">🌱</span>
                    {cultivo}
                  </span>
                ))}
              </div>
              <p className="mt-1 text-xs font-semibold text-emerald-700">
                {selected && cultivosFinca.some((slug) => {
                  // cultivosFinca son slugs crudos (zea_mays); `selected` es id/nombre (maiz).
                  // Resolver slug→cultivo igual que el resto del componente para que el match funcione.
                  const c = findCultivoInItems(arquetipos, slug);
                  return slug === selected || c?.id === selected || c?.nombre === selected;
                }) ? '¡Ya tienes este cultivo!' : 'Selecciona uno para ver recomendaciones'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Estado vacío mejorado */}
      {view.recomendaciones.length === 0 ? (
        <div className="rounded-xl border-2 border-slate-300 bg-white p-6 text-center shadow-lg">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-slate-100 mx-auto mb-4">
            <Leaf className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">Sin asociaciones disponibles</h3>
          <p className="text-base text-slate-700 leading-relaxed">
            Aún no tenemos asociaciones curadas para <strong>{view.cultivo?.nombre || selected}</strong>.
            Estamos trabajando en agregar más cultivos con bases científicas.
          </p>
          <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-900 border border-emerald-200">
            💡 Prueba con maíz, café, cacao, frutales u hortalizas
          </div>
        </div>
      ) : (
        <>
          {/* Contador de resultados */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-700">
              <span className="bg-emerald-600 text-white px-2 py-1 rounded-full text-xs">
                {view.recomendaciones.length}
              </span>
              {' '}sistemas recomendados para <strong>{view.cultivo?.nombre || selected}</strong>
            </p>
          </div>

          {/* Lista de recomendaciones */}
          <div className="space-y-4">
            {view.recomendaciones.map((item, index) => (
              <div key={item.id} className="relative">
                {index === 0 && (
                  <div className="absolute -top-2 -left-2 z-10">
                    <div className="bg-lime-500 text-white px-3 py-1 rounded-full text-xs font-black uppercase shadow-lg flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Mejor opción
                    </div>
                  </div>
                )}
                <RecomendacionCard item={item} cultivoSeleccionado={selected} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Footer informativo */}
      <div className="rounded-lg border border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 p-4 text-center">
        <p className="text-xs font-semibold text-slate-600 mb-1">
          📚 Todos los datos están basados en investigación agronómica publicada y experiencia de campo en Colombia.
        </p>
        <p className="text-xs font-semibold text-slate-500">
          Funciona sin conexión • Actualizado regularmente • Contribuciones bienvenidas
        </p>
      </div>
    </section>
  );
}
