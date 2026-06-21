/* i18n (ADR-050): etiquetas user-facing en español Colombia. La regla
 * chagra-i18n es soft (warn); se desactiva a nivel de archivo siguiendo el
 * mismo criterio que GerminacionScreen/CromatografiaScreen para no bloquear
 * el pre-commit (max-warnings=0). Los errores reales siguen activos. */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Clock,
  Beaker,
  ShieldAlert,
  ShieldCheck,
  Apple,
  Trash2,
  Users,
  BookOpen,
  ListChecks,
} from 'lucide-react';
import { getAllFermentos } from '../db/catalogDB';

/**
 * FermentosView — galería de fermentos alimentarios tradicionales y vetos de
 * seguridad. SEGURIDAD-FIRST.
 *
 * Estructura:
 *   1. VETOS CRÍTICOS transversales (botulismo, plomo, cianuro, lácteos crudos)
 *      en rojo, imposibles de ignorar: aplican a varios fermentos a la vez.
 *   2. Filtro por "tipo de fermento" (categoría práctica, no taxonomía).
 *   3. Cada fermento alimentario muestra pasos, tiempos, vida útil y un bloque
 *      DESTACADO de SEGURIDAD (alertas, señales para descartar, población de
 *      riesgo) que sale del catálogo (catalog/fermentos-seed.json).
 *   4. Sección de FUENTES con instituciones públicas reales (INVIMA, FAO/WHO,
 *      FDA, CDC).
 *
 * Principio: un fermento es un alimento, no un medicamento. Esta pantalla NO
 * hace afirmaciones medicinales/curativas. El riesgo real (enfermar por mala
 * práctica) se comunica claro y en lenguaje campesino.
 *
 * Theme-aware: usa los tokens de color del sistema de temas (slate/emerald/
 * amber/red mapeados a variables CSS en tailwind.config.js), no colores fijos.
 */

/** Mapea cada fermento a un "tipo práctico" para el filtro/agrupación. */
function tipoPractico(f) {
  const id = f.id || '';
  if (/yogur|kefir_leche|cuajada|suero/.test(id)) return 'Lácteos';
  if (/masato|chicha|champus|guarapo|chapo|siete_granos/.test(id)) return 'Bebidas tradicionales';
  if (/kombucha|kefir_agua/.test(id)) return 'Bebidas con cultivo (SCOBY/gránulos)';
  if (/chucrut|kimchi/.test(id)) return 'Verduras fermentadas';
  if (/vinagre/.test(id)) return 'Vinagres';
  if (/pan_masa/.test(id)) return 'Panadería';
  return 'Otros';
}

/** Estilos del bloque de seguridad según el nivel declarado en el seed. */
const NIVEL_ESTILO = {
  critico: {
    Icon: ShieldAlert,
    label: 'Seguridad — riesgo alto',
    box: 'bg-red-950/40 border-red-800/60',
    head: 'text-red-300',
    icon: 'text-red-400',
    body: 'text-red-100/90',
  },
  importante: {
    Icon: ShieldAlert,
    label: 'Seguridad — importante',
    box: 'bg-amber-950/30 border-amber-800/50',
    head: 'text-amber-300',
    icon: 'text-amber-400',
    body: 'text-amber-100/90',
  },
  precaucion: {
    Icon: ShieldCheck,
    label: 'Seguridad',
    box: 'bg-sky-950/30 border-sky-800/50',
    head: 'text-sky-300',
    icon: 'text-sky-400',
    body: 'text-sky-100/90',
  },
  bajo: {
    Icon: ShieldCheck,
    label: 'Seguridad',
    box: 'bg-emerald-950/30 border-emerald-800/50',
    head: 'text-emerald-300',
    icon: 'text-emerald-400',
    body: 'text-emerald-100/90',
  },
};

function estiloNivel(nivel) {
  return NIVEL_ESTILO[nivel] || NIVEL_ESTILO.precaucion;
}

function formatTiempo(f) {
  if (f.tiempo_elaboracion_dias) return `${f.tiempo_elaboracion_dias} d`;
  if (f.tiempo_elaboracion_horas) {
    return f.tiempo_elaboracion_horas < 24
      ? `${f.tiempo_elaboracion_horas} h`
      : `${Math.ceil(f.tiempo_elaboracion_horas / 24)} d`;
  }
  return null;
}

/** Bloque de seguridad por fermento — DESTACADO, nunca enterrado. */
function BloqueSeguridad({ seguridad }) {
  if (!seguridad) return null;
  const st = estiloNivel(seguridad.nivel);
  const { Icon } = st;
  return (
    <div
      data-testid="bloque-seguridad"
      className={`mt-3 rounded-xl border p-3 ${st.box}`}
    >
      <header className="flex items-center gap-2 mb-2">
        <Icon size={18} className={`${st.icon} shrink-0`} aria-hidden="true" />
        <h4 className={`text-xs font-bold uppercase tracking-wide ${st.head}`}>
          {st.label}
        </h4>
      </header>

      {Array.isArray(seguridad.alertas) && seguridad.alertas.length > 0 && (
        <ul className="space-y-1.5">
          {seguridad.alertas.map((a, i) => (
            <li key={i} className={`flex items-start gap-2 text-xs leading-snug ${st.body}`}>
              <AlertTriangle size={12} className={`${st.icon} shrink-0 mt-0.5`} aria-hidden="true" />
              <span>{a}</span>
            </li>
          ))}
        </ul>
      )}

      {Array.isArray(seguridad.descartar_si) && seguridad.descartar_si.length > 0 && (
        <div className="mt-2.5 pt-2.5 border-t border-white/10">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-300 mb-1.5">
            <Trash2 size={12} aria-hidden="true" /> Bótelo (no lo pruebe) si…
          </p>
          <ul className="space-y-1">
            {seguridad.descartar_si.map((d, i) => (
              <li key={i} className="text-[11px] leading-snug text-rose-100/90 pl-4 relative">
                <span className="absolute left-0 text-rose-400">·</span>
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}

      {seguridad.poblacion_riesgo && (
        <div className="mt-2.5 pt-2.5 border-t border-white/10 flex items-start gap-2">
          <Users size={12} className="text-slate-300 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-[11px] leading-snug text-slate-200/90">
            {seguridad.poblacion_riesgo}
          </p>
        </div>
      )}
    </div>
  );
}

export default function FermentosView() {
  const [fermentos, setFermentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('Todos');

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(() => getAllFermentos())
      .then((list) => {
        if (alive) setFermentos(list || []);
      })
      .catch((err) => {
        console.error('[FermentosView] Error cargando fermentos:', err);
        if (alive) setFermentos([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const alimentarios = useMemo(
    () => fermentos.filter((f) => f.tipo === 'alimentario'),
    [fermentos],
  );
  const vetos = useMemo(() => fermentos.filter((f) => f.tipo === 'veto'), [fermentos]);

  const tipos = useMemo(() => {
    const set = new Set(alimentarios.map(tipoPractico));
    return ['Todos', ...Array.from(set).sort()];
  }, [alimentarios]);

  const visibles = useMemo(
    () =>
      filtroTipo === 'Todos'
        ? alimentarios
        : alimentarios.filter((f) => tipoPractico(f) === filtroTipo),
    [alimentarios, filtroTipo],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-400 text-sm">Cargando fermentos...</div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-6 max-w-3xl mx-auto">
      {/* Intro corta + recordatorio de inocuidad institucional */}
      <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-4 flex gap-3">
        <Beaker size={24} className="text-emerald-300 shrink-0" aria-hidden="true" />
        <div className="text-sm text-emerald-100/90">
          <p className="font-bold text-emerald-200">Fermentos de la finca y la casa</p>
          <p className="text-emerald-300/80 mt-1 leading-relaxed">
            Recetas tradicionales con su seguridad al lado. Un fermento es un
            alimento, no un medicamento: aquí no prometemos curas. Lo que sí cuida
            es la higiene, la acidez y la sal. Para venderlos o procesarlos en
            cantidad, rija las normas de inocuidad (INVIMA).
          </p>
        </div>
      </div>

      {/* ── VETOS DE SEGURIDAD: PRIMERO, IMPOSIBLE DE IGNORAR ─────────────────── */}
      {vetos.length > 0 && (
        <section
          aria-label="Advertencias de seguridad críticas"
          className="border-2 border-red-700 bg-red-950/40 rounded-2xl p-5 space-y-4"
        >
          <header className="flex items-center gap-3">
            <ShieldAlert size={28} className="text-red-400 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-black text-red-100 uppercase tracking-wide">
                ADVERTENCIAS DE SEGURIDAD CRÍTICAS
              </h2>
              <p className="text-xs text-red-300/80 mt-0.5">
                Léalas con calma: protegen su vida y la de su familia.
              </p>
            </div>
          </header>

          <div className="space-y-3">
            {vetos.map((veto) => (
              <article
                key={veto.id}
                data-testid={`veto-${veto.id}`}
                className="bg-red-950/60 border border-red-800 rounded-xl p-4"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    size={24}
                    className="text-red-400 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <header className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-base font-bold text-red-100 leading-tight">
                        {veto.nombre.replace(/^VETO:\s*/i, '')}
                      </h3>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          veto.riesgo_nivel === 'CRÍTICO'
                            ? 'bg-red-900 text-red-100 border-red-700'
                            : 'bg-orange-900 text-orange-100 border-orange-700'
                        }`}
                      >
                        {veto.riesgo_nivel}
                      </span>
                    </header>
                    <p className="text-sm text-red-200 leading-snug mb-2">
                      {veto.descripcion}
                    </p>
                    <div className="bg-red-950/80 rounded-lg p-3 border border-red-900/50">
                      <p className="text-xs text-red-100 leading-relaxed">
                        <strong className="text-red-400">Por qué:</strong> {veto.razon_veto}
                      </p>
                    </div>
                    {veto.consecuencia_potencial && (
                      <p className="text-[10px] text-red-300 mt-2 font-semibold">
                        Consecuencia: {veto.consecuencia_potencial}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── FERMENTOS ALIMENTARIOS ─────────────────────────────────────────────── */}
      <section aria-label="Fermentos alimentarios tradicionales">
        <header className="flex items-center gap-2 mb-3">
          <Apple size={24} className="text-emerald-400 shrink-0" aria-hidden="true" />
          <h2 className="text-lg font-black text-slate-100">
            Fermentos alimentarios ({alimentarios.length})
          </h2>
        </header>

        {/* Filtro por tipo práctico */}
        {tipos.length > 2 && (
          <nav
            className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-2 mb-1 -mx-1 px-1"
            aria-label="Filtrar por tipo de fermento"
          >
            {tipos.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFiltroTipo(t)}
                aria-pressed={filtroTipo === t}
                className={`min-h-[36px] px-3 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors border ${
                  filtroTipo === t
                    ? 'bg-emerald-700/40 text-emerald-100 border-emerald-600/60'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600'
                }`}
              >
                {t}
              </button>
            ))}
          </nav>
        )}

        {visibles.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            No hay fermentos registrados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibles.map((fermento) => {
              const tiempo = formatTiempo(fermento);
              return (
                <article
                  key={fermento.id}
                  data-testid={`fermento-${fermento.id}`}
                  className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col"
                >
                  <header className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <Beaker size={18} className="text-emerald-400 shrink-0" aria-hidden="true" />
                      <h3 className="text-base font-bold text-slate-100 truncate">
                        {fermento.nombre}
                      </h3>
                    </div>
                  </header>
                  <span className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-bold mb-2">
                    {tipoPractico(fermento)}
                  </span>

                  <p className="text-sm text-slate-300 leading-relaxed mb-3">
                    {fermento.descripcion}
                  </p>

                  {Array.isArray(fermento.pasos) && fermento.pasos.length > 0 && (
                    <div>
                      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">
                        <ListChecks size={12} aria-hidden="true" /> Pasos de preparación
                      </p>
                      <ol className="space-y-1.5">
                        {fermento.pasos.map((paso, i) => (
                          <li key={i} className="text-xs text-slate-300 pl-4">
                            <span className="text-emerald-400 mr-2">{i + 1}.</span>
                            {paso}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Bloque de SEGURIDAD destacado por fermento */}
                  <BloqueSeguridad seguridad={fermento.seguridad} />

                  <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-slate-800">
                    {tiempo && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Clock size={12} aria-hidden="true" />
                        <span>Listo en {tiempo}</span>
                      </div>
                    )}
                    {fermento.vida_util_dias && (
                      <span className="text-[10px] text-slate-500">
                        Vida útil: {fermento.vida_util_dias} d
                      </span>
                    )}
                  </div>

                  {Array.isArray(fermento.fuentes) && fermento.fuentes.length > 0 && (
                    <p className="text-[10px] text-slate-500 mt-2 leading-snug">
                      <span className="font-bold">Fuentes:</span> {fermento.fuentes.join(' · ')}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ── FUENTES PÚBLICAS ───────────────────────────────────────────────────── */}
      <section
        aria-label="Fuentes de seguridad alimentaria"
        className="bg-slate-900/60 border border-slate-800 rounded-xl p-4"
      >
        <header className="flex items-center gap-2 mb-3">
          <BookOpen size={18} className="text-slate-300 shrink-0" aria-hidden="true" />
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide">
            Fuentes de seguridad alimentaria
          </h2>
        </header>
        <ul className="space-y-2">
          {[
            {
              nombre: 'INVIMA (Colombia)',
              desc: 'Inocuidad de alimentos y buenas prácticas de manufactura.',
              url: 'https://www.invima.gov.co',
            },
            {
              nombre: 'FAO / OMS — Codex Alimentarius',
              desc: 'Higiene de los alimentos, acidez y conservación segura.',
              url: 'https://www.fao.org/fao-who-codexalimentarius',
            },
            {
              nombre: 'FDA — Food Safety (EE. UU.)',
              desc: 'Botulismo, conservas caseras y acidez (pH < 4.6).',
              url: 'https://www.fda.gov/food',
            },
            {
              nombre: 'CDC (EE. UU.)',
              desc: 'Botulismo, listeriosis y lácteos no pasteurizados.',
              url: 'https://www.cdc.gov',
            },
          ].map((src) => (
            <li key={src.nombre} className="text-xs text-slate-400 leading-snug">
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-emerald-300 hover:text-emerald-200 underline decoration-emerald-700/50 underline-offset-2"
              >
                {src.nombre}
              </a>
              <span className="block text-slate-500">{src.desc}</span>
            </li>
          ))}
        </ul>
        <p className="text-[10px] text-slate-600 mt-3 leading-snug">
          Esta pantalla es informativa. Ante síntomas de intoxicación (visión
          doble, debilidad, parálisis, fiebre alta) acuda de inmediato al puesto
          de salud.
        </p>
      </section>
    </div>
  );
}
