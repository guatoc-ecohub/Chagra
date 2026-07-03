import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Ban, BarChart3, CheckCircle2, Layers, Leaf, Network, Shield, Sparkles, Sprout, TrendingUp, Users, Zap } from 'lucide-react';
import arquetipos from '../data/asociaciones-arquetipos.json';
import comparativas from '../data/asociaciones-comparativa.json';
import {
  buildAsociacionesView,
  findCultivoInItems,
  getCultivosFromPlants,
  selectCultivoInicial,
} from '../services/asociacionesFilter';
import useAssetStore from '../store/useAssetStore';
import { getSpeciesVisual, SPECIES_TONE_CLASSES } from '../utils/speciesVisual';

/*
 * Asociaciones — pasada VISUAL (2026-07). La lógica (filtros, métricas,
 * selección de cultivo) no se toca: vive en services/asociacionesFilter.
 *
 * Sistema visual alineado con el Directorio de especies y SpeciesFicha:
 *   - Superficies oscuras slate-900/950 con acentos tonales (emerald =
 *     compañeras, rose = antagonistas, lime = beneficios medidos) — la
 *     pantalla ya vive dentro del shell oscuro de la app.
 *   - Emoji POR ESPECIE (utils/speciesVisual): a golpe de vista se distingue
 *     🌽 de 🫘 de 🎃 — clave para leer la milpa sin leer texto.
 *   - Relaciones como FLUJO visual: [quién] → beneficio → [a quién].
 *   - Radios/sombras/táctil desde tokens globales (styles/tokens.css) vía
 *     valores arbitrarios con fallback byte-idéntico.
 *   - Todo movimiento va tras `motion-safe:` (prefers-reduced-motion).
 */

const SOMBRA_1 = 'shadow-[var(--sombra-1,0_1px_2px_rgb(8_30_22/0.18))]';
const SOMBRA_2 = 'shadow-[var(--sombra-2,0_6px_18px_rgb(8_30_22/0.22))]';

/* Etiquetas humanas para los tipos de relación del grafo (presentación pura). */
const TIPO_LABELS = {
  ANTAGONIST_OF: 'antagonista',
  ASOCIA_CON: 'asociación',
  COMPATIBLE_WITH: 'compatible',
};

function tipoLabel(tipo) {
  return TIPO_LABELS[String(tipo || '').toUpperCase()] || String(tipo || '').toLowerCase();
}

/**
 * Visual (emoji + tono) de un cultivo del arquetipo {id, slug, nombre}.
 * El slug científico (zea_mays) le da el match fuerte a speciesVisual.
 */
function cultivoVisual(cultivo) {
  if (!cultivo || typeof cultivo !== 'object') return getSpeciesVisual(null);
  return getSpeciesVisual({ comun: cultivo.nombre, id: cultivo.slug || cultivo.id });
}

/**
 * Chip de cultivo con su emoji — la unidad visual básica de la pantalla.
 * tone="species" usa el tono propio de la especie; "rose" fuerza la piel de
 * antagonista (lo que NO se siembra junto).
 */
function CultivoChip({ cultivo, label, tone = 'species' }) {
  const visual = cultivo ? cultivoVisual(cultivo) : getSpeciesVisual({ comun: label });
  const nombre = cultivo?.nombre || label || '';
  const toneCls = tone === 'rose'
    ? 'border-rose-700/40 bg-rose-900/30 text-rose-100'
    : `${SPECIES_TONE_CLASSES[visual.tone] || SPECIES_TONE_CLASSES.emerald} text-slate-100`;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-[var(--r-pill,999px)] border px-2.5 py-1 text-sm font-bold leading-tight ${toneCls}`}>
      <span aria-hidden="true" className="leading-none">{visual.emoji}</span>
      {nombre}
    </span>
  );
}

const plotPositions = [
  { left: '50%', top: '18%' },
  { left: '22%', top: '50%' },
  { left: '78%', top: '50%' },
  { left: '50%', top: '80%' },
];

function CultivoNode({ cultivo, index, selected, isCompanera }) {
  const pos = plotPositions[index % plotPositions.length];
  const isSelected = cultivo.id === selected || cultivo.nombre === selected;
  const { emoji, tone } = cultivoVisual(cultivo);
  const toneCls = SPECIES_TONE_CLASSES[tone] || SPECIES_TONE_CLASSES.emerald;

  return (
    <div
      className={`absolute flex h-[4.5rem] w-[4.5rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-0.5 rounded-full border-2 text-center backdrop-blur-sm motion-safe:transition-transform motion-safe:duration-[var(--dur-estado,0.18s)] ${SOMBRA_1} ${
        isSelected
          ? 'z-10 scale-110 border-emerald-300 bg-emerald-700 text-white ring-2 ring-emerald-400/40'
          : isCompanera
          ? `border-2 ${toneCls} text-emerald-50`
          : 'border-slate-700 bg-slate-900/90 text-slate-200'
      }`}
      style={pos}
    >
      <span className="text-xl leading-none" aria-hidden="true">{emoji}</span>
      <span className="px-1 text-[10px] font-black leading-tight">{cultivo.nombre}</span>
    </div>
  );
}

function PolycultureDiagram({ item, cultivoSeleccionado }) {
  const selected = cultivoSeleccionado || '';
  const companeras = (item.companeras || []).map(c => c.id || c.nombre);

  return (
    <div className={`relative min-h-72 overflow-hidden rounded-[var(--r-lg,20px)] border border-emerald-800/50 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 p-4 ${SOMBRA_2}`}>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M50 18 L22 50 L50 80 L78 50 Z" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.45" />
        <path d="M22 50 H78" fill="none" stroke="#84cc16" strokeWidth="1.5" opacity="0.25" />
        <path d="M50 18 V80" fill="none" stroke="#84cc16" strokeWidth="1.5" opacity="0.25" />
      </svg>

      {/* Leyenda */}
      <div className={`absolute left-3 top-3 rounded-[var(--r-sm,12px)] border border-slate-700/70 bg-slate-900/90 px-3 py-2 backdrop-blur ${SOMBRA_1}`}>
        <div className="mb-1 flex items-center gap-2">
          <Network className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          <span className="text-xs font-black uppercase tracking-wide text-emerald-200">Diagrama de siembra</span>
        </div>
        <div className="flex gap-3 text-[10px] font-semibold text-slate-300">
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true"></span>
            <span>Su cultivo</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-lime-400" aria-hidden="true"></span>
            <span>Compañeras</span>
          </div>
        </div>
      </div>

      {/* Indicador de LER si está disponible */}
      {item.comparativa?.policultivo?.LER && (
        <div className={`absolute right-3 top-3 rounded-[var(--r-sm,12px)] bg-gradient-to-br from-lime-500 to-lime-600 px-3 py-2 ${SOMBRA_2}`}>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-white" aria-hidden="true" />
            <div>
              <div className="text-[10px] font-bold uppercase text-lime-50">LER</div>
              <div className="text-sm font-black text-white">
                {item.comparativa.policultivo.LER.valor_aprox ||
                 item.comparativa.policultivo.LER.valor ||
                 `${item.comparativa.policultivo.LER.min}-${item.comparativa.policultivo.LER.max}`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nodos de cultivo — emoji por especie, reconocibles sin leer */}
      {(item.cultivos || []).map((cultivo, index) => (
        <CultivoNode
          key={cultivo.id}
          cultivo={cultivo}
          index={index}
          selected={selected}
          isCompanera={companeras.includes(cultivo.id) || companeras.includes(cultivo.nombre)}
        />
      ))}

      {/* Estratos del sistema */}
      <div className={`absolute bottom-3 left-3 right-3 rounded-[var(--r-sm,12px)] border border-slate-700/70 bg-slate-900/90 px-4 py-3 backdrop-blur ${SOMBRA_1}`}>
        <div className="mb-2 flex items-center gap-2">
          <Layers className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          <span className="text-xs font-black uppercase tracking-wide text-emerald-200">Estratos del sistema</span>
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs font-semibold leading-snug text-slate-200">
          {(item.cultivos || []).map((cultivo) => (
            <div key={cultivo.id} className="flex items-center gap-1.5">
              <span aria-hidden="true" className="leading-none">{cultivoVisual(cultivo).emoji}</span>
              <span className="truncate">{cultivo.nombre} <span className="text-slate-400">({cultivo.estrato})</span></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metricas({ metricas, comparativa }) {
  if (!metricas.length) {
    return (
      <div className={`rounded-[var(--r-md,16px)] border border-amber-700/40 bg-amber-950/20 p-4 text-sm font-semibold text-amber-100 ${SOMBRA_1}`}>
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" aria-hidden="true" />
          <div>
            <p className="font-bold text-amber-200">Datos en investigación</p>
            <p className="mt-1 text-sm leading-relaxed text-amber-100/80">Este arquetipo aún no tiene cifras verificadas en asociaciones-comparativa.json. Próximamente añadiremos métricas reales.</p>
          </div>
        </div>
      </div>
    );
  }

  // Agrupar métricas por categoría para mejor visualización
  const metricasPrincipales = metricas.slice(0, 3);
  const metricasSecundarias = metricas.slice(3);
  const PRINCIPAL = [
    { icon: TrendingUp, label: 'Rendimiento', cls: 'border-lime-700/40 bg-lime-950/30', iconCls: 'text-lime-300', labelCls: 'text-lime-300/90' },
    { icon: Sparkles, label: 'Nutrición', cls: 'border-emerald-700/40 bg-emerald-950/30', iconCls: 'text-emerald-300', labelCls: 'text-emerald-300/90' },
    { icon: Shield, label: 'Protección', cls: 'border-teal-700/40 bg-teal-950/30', iconCls: 'text-teal-300', labelCls: 'text-teal-300/90' },
  ];

  return (
    <div className="space-y-3">
      {/* Métricas principales destacadas */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {metricasPrincipales.map((metrica, index) => {
          const p = PRINCIPAL[index] || PRINCIPAL[0];
          const PIcon = p.icon;
          return (
            <div key={metrica} className={`rounded-[var(--r-md,16px)] border px-4 py-3 ${SOMBRA_1} ${p.cls}`}>
              <div className="mb-1 flex items-center gap-2">
                <PIcon className={`h-4 w-4 ${p.iconCls}`} aria-hidden="true" />
                <p className={`text-xs font-bold uppercase tracking-wide ${p.labelCls}`}>{p.label}</p>
              </div>
              <p className="text-sm font-black leading-tight text-slate-100">{metrica}</p>
            </div>
          );
        })}
      </div>

      {/* Métricas secundarias */}
      {metricasSecundarias.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {metricasSecundarias.map((metrica) => (
            <div key={metrica} className="rounded-[var(--r-sm,12px)] border border-slate-700/50 bg-slate-800/60 px-3 py-2">
              <p className="text-sm font-semibold leading-tight text-slate-200">{metrica}</p>
            </div>
          ))}
        </div>
      )}

      {/* Indicador de confianza */}
      {comparativa?.confianza && (
        <div className="flex items-center gap-3 rounded-[var(--r-sm,12px)] border border-slate-700/50 bg-slate-900/60 px-4 py-2">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`h-3 w-3 rounded-full ${
                comparativa.confianza === 'alta' ? 'bg-emerald-500' :
                comparativa.confianza === 'media' ? 'bg-amber-400' : 'bg-rose-500'
              }`}
            ></span>
            <span className="text-sm font-bold text-slate-300">
              Confianza científica: <span className="uppercase text-slate-100">{comparativa.confianza}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Una relación como flujo visual: [origen] → beneficio → [destino].
 * El campesino lee QUIÉN ayuda a QUIÉN sin descifrar prosa; la razón queda
 * debajo como apoyo.
 */
function RelacionFlow({ rel, cultivosPorId }) {
  const origen = cultivosPorId[rel.origen];
  const destino = cultivosPorId[rel.destino];
  return (
    <div className={`rounded-[var(--r-md,16px)] border border-emerald-800/40 bg-emerald-950/20 p-3 ${SOMBRA_1}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <CultivoChip cultivo={origen} label={rel.origen} />
        <span className="inline-flex items-center gap-1 text-emerald-400" aria-hidden="true">
          <ArrowRight className="h-4 w-4" />
        </span>
        <CultivoChip cultivo={destino} label={rel.destino} />
        <span className="inline-flex items-center gap-1 rounded-[var(--r-pill,999px)] border border-emerald-600/40 bg-emerald-900/40 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-300">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          {rel.beneficio}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">{rel.razon}</p>
    </div>
  );
}

/** Un antagonista como advertencia visual: [cultivo] ⊘ [evitar]. */
function AntagonistaCard({ ant, cultivosPorId }) {
  const cultivo = cultivosPorId[ant.cultivo];
  return (
    <div className={`rounded-[var(--r-md,16px)] border border-rose-800/40 bg-rose-950/20 p-3 ${SOMBRA_1}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <CultivoChip cultivo={cultivo} label={ant.cultivo} />
        <Ban className="h-4 w-4 text-rose-400" aria-hidden="true" />
        <CultivoChip
          cultivo={{ nombre: ant.evitar, slug: ant.slug, id: ant.slug }}
          tone="rose"
        />
        <span className="rounded-[var(--r-pill,999px)] border border-rose-700/40 bg-rose-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-300">
          {tipoLabel(ant.tipo)}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-rose-100/80">{ant.razon}</p>
    </div>
  );
}

function RecomendacionCard({ item, cultivoSeleccionado }) {
  const relaciones = item.relacionesCultivo.length ? item.relacionesCultivo : item.relaciones || [];
  const antagonistas = item.antagonistasCultivo.length ? item.antagonistasCultivo : item.antagonistas || [];
  const hasLER = item.comparativa?.policultivo?.LER;

  // Índice id/nombre → cultivo para resolver los extremos de cada relación
  // (presentación pura: solo mapea lo que ya viene en el arquetipo).
  const cultivosPorId = useMemo(() => {
    const map = {};
    for (const c of item.cultivos || []) {
      if (c.id) map[c.id] = c;
      if (c.nombre) map[c.nombre] = c;
    }
    return map;
  }, [item]);

  return (
    <article
      aria-label={item.nombre}
      className={`overflow-hidden rounded-[var(--r-lg,20px)] border border-slate-800 bg-slate-900 ${SOMBRA_2}`}
    >
      {/* Header del sistema */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 px-4 py-3 sm:px-5">
        <div className="flex items-start gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[var(--r-md,16px)] border border-white/10 bg-white/10 text-4xl backdrop-blur-sm" aria-hidden="true">
            {item.icono}
          </span>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <p className="text-xs font-black uppercase tracking-wider text-emerald-300">Sistema recomendado</p>
              {hasLER && (
                <span className="rounded-[var(--r-pill,999px)] bg-lime-400 px-2 py-0.5 text-xs font-black text-lime-950">
                  Alto rendimiento
                </span>
              )}
            </div>
            <h3 className="text-xl font-black leading-tight text-white sm:text-2xl">{item.nombre}</h3>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          {/* Compañeras con emoji por especie */}
          <div className={`rounded-[var(--r-md,16px)] border border-emerald-700/40 bg-emerald-950/30 p-4 ${SOMBRA_1}`}>
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-300" aria-hidden="true" />
              <h4 className="text-sm font-black uppercase tracking-wide text-emerald-200">Compañeros ideales</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {(item.companeras || []).map((cultivo) => (
                <CultivoChip key={cultivo.id} cultivo={cultivo} />
              ))}
              {(!item.companeras || item.companeras.length === 0) && (
                <span className="text-sm font-semibold text-slate-400">Sistema completo integrado</span>
              )}
            </div>
          </div>

          {/* Acción recomendada */}
          <div className={`rounded-[var(--r-md,16px)] border border-emerald-700/40 bg-gradient-to-br from-emerald-900 to-emerald-950 p-4 text-white ${SOMBRA_1}`}>
            <div className="mb-2 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-600">
                <Zap className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-emerald-300">Plan de acción</p>
                <p className="text-xs font-semibold text-emerald-200/80">Implementación práctica</p>
              </div>
            </div>
            <p className="text-base font-medium leading-relaxed text-emerald-50">{item.accion}</p>
          </div>

          {/* Por qué funciona — flujos quién ayuda a quién */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Leaf className="h-5 w-5 text-emerald-400" aria-hidden="true" />
              <h4 className="text-sm font-black uppercase tracking-wide text-slate-200">Por qué funciona</h4>
            </div>
            <div className="space-y-2">
              {relaciones.map((rel) => (
                <RelacionFlow
                  key={`${rel.origen}-${rel.destino}-${rel.beneficio}`}
                  rel={rel}
                  cultivosPorId={cultivosPorId}
                />
              ))}
            </div>
          </div>

          {/* Beneficio real con cifras */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-lime-400" aria-hidden="true" />
              <h4 className="text-sm font-black uppercase tracking-wide text-slate-200">Beneficio comprobado</h4>
            </div>
            <div className="mt-2">
              <Metricas metricas={item.metricas} comparativa={item.comparativa} />
            </div>
            {item.comparativa?.diferencia_resumen && (
              <div className="mt-3 rounded-[var(--r-sm,12px)] border border-slate-700/50 bg-slate-800/50 p-3">
                <p className="text-sm font-medium leading-relaxed text-slate-300">{item.comparativa.diferencia_resumen}</p>
              </div>
            )}
          </div>

          {/* Evitar — advertencias en piel rose (misma que la ficha) */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-400" aria-hidden="true" />
              <h4 className="text-sm font-black uppercase tracking-wide text-rose-200">Evitar estas combinaciones</h4>
            </div>
            {antagonistas.length ? (
              <div className="space-y-2">
                {antagonistas.map((ant) => (
                  <AntagonistaCard
                    key={`${ant.cultivo}-${ant.slug}`}
                    ant={ant}
                    cultivosPorId={cultivosPorId}
                  />
                ))}
              </div>
            ) : (
              <div className={`rounded-[var(--r-md,16px)] border border-emerald-700/40 bg-emerald-950/30 p-4 ${SOMBRA_1}`}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                  <p className="text-sm font-semibold text-emerald-100">
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
      <div className="border-t border-slate-800 bg-slate-950/60 px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-1 text-xs font-semibold leading-snug text-slate-400">
          <div className="flex items-start gap-2">
            <span className="font-bold text-slate-300">📚 Fuente:</span>
            <span>{item.fuente}</span>
          </div>
          {item.comparativa?.fuente && (
            <div className="flex items-start gap-2">
              <span className="font-bold text-slate-300">📊 Cifras:</span>
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
      {/* Header orientado a la acción */}
      <div className={`rounded-[var(--r-xl,24px)] border border-emerald-800/60 bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-950 p-4 text-white sm:p-6 ${SOMBRA_2}`}>
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-[var(--r-md,16px)] border border-emerald-700/60 bg-emerald-800/70">
            <Network className="h-7 w-7 text-emerald-200" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-200">
              <span className="rounded-[var(--r-pill,999px)] bg-emerald-700/80 px-2 py-1">Offline</span>
              <span className="rounded-[var(--r-pill,999px)] bg-lime-600/80 px-2 py-1">Datos reales</span>
            </div>
            <h2 id="asociaciones-title" className="mt-1 text-2xl font-black leading-tight sm:text-3xl">
              Asociaciones inteligentes
            </h2>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-start gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--r-xs,8px)] bg-emerald-700/70">
              <Users className="h-5 w-5 text-emerald-100" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-emerald-300">Compañeros ideales</p>
              <p className="text-sm font-semibold text-emerald-50">Saber qué sembrar junto</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--r-xs,8px)] bg-rose-700/70">
              <Ban className="h-5 w-5 text-rose-100" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-rose-300">Evitar combinaciones</p>
              <p className="text-sm font-semibold text-emerald-50">Antagonistas conocidos</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--r-xs,8px)] bg-lime-700/70">
              <BarChart3 className="h-5 w-5 text-lime-100" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-lime-300">Beneficios reales</p>
              <p className="text-sm font-semibold text-emerald-50">LER, fijación N, ahorro</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--r-xs,8px)] bg-teal-700/70">
              <Sparkles className="h-5 w-5 text-teal-100" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-teal-300">Plan de acción</p>
              <p className="text-sm font-semibold text-emerald-50">Instrucciones prácticas</p>
            </div>
          </div>
        </div>

        <p className="mt-4 max-w-3xl border-t border-emerald-800/60 pt-4 text-base leading-relaxed text-emerald-50">
          <strong>Elija su cultivo</strong> y descubra qué sembrar con él, qué evitar, por qué funciona y cuánto puede ganar.
          Todo basado en <strong>investigación real</strong>, no en promesas.
        </p>
      </div>

      {/* Selector de cultivo */}
      <div className={`rounded-[var(--r-lg,20px)] border border-slate-800 bg-slate-900 p-4 sm:p-5 ${SOMBRA_1}`}>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <label htmlFor="cultivo-asociaciones" className="mb-3 flex items-center gap-2 text-sm font-black text-slate-100">
              <div className="grid h-8 w-8 place-items-center rounded-[var(--r-xs,8px)] border border-emerald-700/40 bg-emerald-950/40">
                <Sprout className="h-5 w-5 text-emerald-400" aria-hidden="true" />
              </div>
              <span>¿Qué cultivo quiere planear?</span>
            </label>
            <select
              id="cultivo-asociaciones"
              value={selected}
              onChange={(event) => setCultivoManual(event.target.value)}
              className="w-full min-h-[var(--tap-min,44px)] rounded-[var(--r-md,16px)] border border-slate-700 bg-slate-950 px-4 py-3 text-[length:var(--fs-cuerpo-lg,1.15rem)] font-bold text-white outline-none motion-safe:transition-colors hover:border-emerald-600/60 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
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
            <div className="rounded-[var(--r-md,16px)] border border-emerald-700/40 bg-emerald-950/40 p-3 sm:text-right">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-emerald-300">Detectado en su finca</span>
              </div>
              <div className="flex flex-wrap gap-1 sm:justify-end">
                {cultivosFincaPrincipales.map((cultivo) => (
                  <span
                    key={cultivo}
                    className="inline-flex items-center gap-1 rounded-[var(--r-pill,999px)] border border-emerald-700/40 bg-emerald-900/50 px-2 py-1 text-xs font-bold text-emerald-100"
                  >
                    <span aria-hidden="true">{getSpeciesVisual({ comun: cultivo }).emoji}</span>
                    {cultivo}
                  </span>
                ))}
              </div>
              <p className="mt-1 text-xs font-semibold text-emerald-300/80">
                {selected && cultivosFinca.some((slug) => {
                  // cultivosFinca son slugs crudos (zea_mays); `selected` es id/nombre (maiz).
                  // Resolver slug→cultivo igual que el resto del componente para que el match funcione.
                  const c = findCultivoInItems(arquetipos, slug);
                  return slug === selected || c?.id === selected || c?.nombre === selected;
                }) ? '¡Ya tiene este cultivo!' : 'Seleccione uno para ver recomendaciones'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Estado vacío */}
      {view.recomendaciones.length === 0 ? (
        <div className={`rounded-[var(--r-lg,20px)] border border-slate-800 bg-slate-900 p-6 text-center ${SOMBRA_1}`}>
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full border border-slate-700 bg-slate-800">
            <Leaf className="h-8 w-8 text-slate-400" aria-hidden="true" />
          </div>
          <h3 className="mb-2 text-xl font-black text-slate-100">Sin asociaciones disponibles</h3>
          <p className="text-base leading-relaxed text-slate-300">
            Aún no tenemos asociaciones curadas para <strong>{view.cultivo?.nombre || selected}</strong>.
            Estamos trabajando en agregar más cultivos con bases científicas.
          </p>
          <div className="mt-4 rounded-[var(--r-md,16px)] border border-emerald-700/40 bg-emerald-950/30 p-3 text-sm font-semibold text-emerald-200">
            💡 Pruebe con maíz, café, cacao, frutales u hortalizas
          </div>
        </div>
      ) : (
        <>
          {/* Contador de resultados */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-300">
              <span className="rounded-[var(--r-pill,999px)] bg-emerald-600 px-2 py-1 text-xs text-white">
                {view.recomendaciones.length}
              </span>
              {' '}sistemas recomendados para <strong className="text-slate-100">{view.cultivo?.nombre || selected}</strong>
            </p>
          </div>

          {/* Lista de recomendaciones */}
          <div className="space-y-4">
            {view.recomendaciones.map((item, index) => (
              <div key={item.id} className="relative">
                {index === 0 && (
                  <div className="absolute -left-2 -top-2 z-10">
                    <div className={`flex items-center gap-1 rounded-[var(--r-pill,999px)] bg-lime-500 px-3 py-1 text-xs font-black uppercase text-lime-950 ${SOMBRA_2}`}>
                      <Sparkles className="h-3 w-3" aria-hidden="true" />
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
      <div className="rounded-[var(--r-md,16px)] border border-slate-800 bg-slate-900/60 p-4 text-center">
        <p className="mb-1 text-xs font-semibold text-slate-400">
          📚 Todos los datos están basados en investigación agronómica publicada y experiencia de campo en Colombia.
        </p>
        <p className="text-xs font-semibold text-slate-500">
          Funciona sin conexión • Actualizado regularmente • Contribuciones bienvenidas
        </p>
      </div>
    </section>
  );
}
