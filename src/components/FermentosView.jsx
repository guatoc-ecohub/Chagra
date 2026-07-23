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
  Camera,
  Hourglass,
  Refrigerator,
} from 'lucide-react';
import { getAllFermentos } from '../db/catalogDB';
import PedagogicalText from './common/PedagogicalText';
import { getFermentoFoto, getFotoPorArchivo, FOTO_PORTADA_ARCHIVO } from '../data/fermentoFotos';

/**
 * FermentosView — mini-app de fermentos alimentarios tradicionales y vetos de
 * seguridad. SEGURIDAD-FIRST, pero VIVA: cada fermento entra por su foto
 * apetitosa, su texto se lee estructurado (PedagogicalText) y su bloque de
 * seguridad es el ancla visual, nunca un muro.
 *
 * Estructura:
 *   1. Portada con foto (fermentación en frascos) + recordatorio de inocuidad.
 *   2. VETOS CRÍTICOS transversales (botulismo, plomo, cianuro, lácteos crudos)
 *      en rojo, imposibles de ignorar: aplican a varios fermentos a la vez.
 *   3. Filtro por "tipo de fermento" (categoría práctica, no taxonomía).
 *   4. Tarjeta por fermento: foto/tarjetón por tipo, descripción legible, pasos,
 *      y un bloque DESTACADO de SEGURIDAD (alertas, señales para descartar,
 *      población de riesgo) que sale del catálogo (catalog/fermentos-seed.json).
 *   5. Sección de FUENTES con instituciones públicas reales (INVIMA, FAO/WHO,
 *      FDA, CDC).
 *
 * Principio: un fermento es un alimento, no un medicamento. Esta pantalla NO
 * hace afirmaciones medicinales/curativas. El riesgo real (enfermar por mala
 * práctica) se comunica claro y en lenguaje campesino.
 *
 * Fotos: CC de `catalog/fotos/` con crédito visible (respeta BY / BY-SA). Ver
 * src/data/fermentoFotos.js.
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

/**
 * Identidad visual (emoji + gradiente de tierra) por tipo práctico. Sirve de
 * "tarjetón" cuando el fermento no tiene foto propia, y de acento cuando sí.
 */
const TIPO_ESTILO = {
  'Lácteos': { emoji: '🥛', grad: 'from-amber-500/30 to-orange-700/30', ring: 'ring-amber-500/20' },
  'Bebidas tradicionales': { emoji: '🍯', grad: 'from-fuchsia-500/25 to-violet-700/30', ring: 'ring-fuchsia-500/20' },
  'Bebidas con cultivo (SCOBY/gránulos)': { emoji: '🍵', grad: 'from-teal-500/25 to-cyan-700/30', ring: 'ring-teal-500/20' },
  'Verduras fermentadas': { emoji: '🥬', grad: 'from-lime-500/25 to-emerald-700/30', ring: 'ring-lime-500/20' },
  'Vinagres': { emoji: '🍶', grad: 'from-rose-500/25 to-red-800/30', ring: 'ring-rose-500/20' },
  'Panadería': { emoji: '🍞', grad: 'from-amber-500/30 to-yellow-700/25', ring: 'ring-amber-500/20' },
  'Otros': { emoji: '🫙', grad: 'from-slate-500/25 to-slate-700/30', ring: 'ring-slate-500/20' },
};

function estiloTipo(tipo) {
  return TIPO_ESTILO[tipo] || TIPO_ESTILO['Otros'];
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

/** Crédito de foto CC — discreto pero visible (respeta BY / BY-SA). */
function CreditoFoto({ foto, className = '' }) {
  if (!foto || !foto.autor) return null;
  const texto = `${foto.autor}${foto.licencia ? ` · ${foto.licencia}` : ''}`;
  const contenido = (
    <span className="inline-flex items-center gap-1 max-w-full">
      <Camera size={9} className="shrink-0" aria-hidden="true" />
      <span className="truncate">{texto}</span>
    </span>
  );
  return (
    <div
      className={`text-[9px] leading-none text-white/70 bg-black/45 backdrop-blur-sm rounded-md px-1.5 py-1 max-w-[85%] ${className}`}
      title={foto.titulo || texto}
    >
      {foto.url_fuente ? (
        <a
          href={foto.url_fuente}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white"
        >
          {contenido}
        </a>
      ) : (
        contenido
      )}
    </div>
  );
}

/** Cabecera visual de la tarjeta: foto CC con overlay, o tarjetón por tipo. */
function CabeceraFermento({ fermento, tipo }) {
  const foto = getFermentoFoto(fermento.id);
  const est = estiloTipo(tipo);
  return (
    <div className={`relative h-36 overflow-hidden ring-1 ${est.ring}`}>
      {foto ? (
        <>
          <img
            src={foto.url}
            alt={fermento.nombre}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Velo inferior para que el emoji/crédito se lean sobre la foto. */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/15 to-transparent" />
        </>
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${est.grad} flex items-center justify-center`}>
          <span className="text-5xl drop-shadow-lg opacity-90" aria-hidden="true">
            {est.emoji}
          </span>
        </div>
      )}

      {/* Chip de tipo, arriba a la derecha. */}
      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white/95 bg-black/40 backdrop-blur-sm border border-white/10">
        <span aria-hidden="true" className="mr-1">{est.emoji}</span>
        {tipo}
      </span>

      {/* Crédito de la foto, abajo a la derecha. */}
      {foto && (
        <CreditoFoto foto={foto} className="absolute bottom-2 right-2" />
      )}
    </div>
  );
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

/** Tarjeta de un fermento alimentario. */
function TarjetaFermento({ fermento }) {
  const tipo = tipoPractico(fermento);
  const tiempo = formatTiempo(fermento);
  return (
    <article
      data-testid={`fermento-${fermento.id}`}
      className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col hover:border-slate-700 transition-colors"
    >
      <CabeceraFermento fermento={fermento} tipo={tipo} />

      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-base font-bold text-slate-100 leading-tight mb-2">
          {fermento.nombre}
        </h3>

        {fermento.descripcion && (
          <PedagogicalText texto={fermento.descripcion} tone="slate" />
        )}

        {Array.isArray(fermento.pasos) && fermento.pasos.length > 0 && (
          <div className="mt-3">
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-400/80 font-bold mb-2">
              <ListChecks size={12} aria-hidden="true" /> Cómo se hace
            </p>
            <ol className="space-y-1.5">
              {fermento.pasos.map((paso, i) => (
                <li key={i} className="flex gap-2.5 text-xs text-slate-300 leading-snug">
                  <span
                    aria-hidden="true"
                    className="shrink-0 h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold flex items-center justify-center mt-px"
                  >
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{paso}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Bloque de SEGURIDAD destacado por fermento */}
        <BloqueSeguridad seguridad={fermento.seguridad} />

        {(tiempo || fermento.vida_util_dias) && (
          <div className="flex items-center flex-wrap gap-2 mt-3 pt-3 border-t border-slate-800">
            {tiempo && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-300 bg-slate-800/60 rounded-lg px-2 py-1">
                <Hourglass size={12} className="text-emerald-400" aria-hidden="true" />
                Listo en {tiempo}
              </span>
            )}
            {fermento.vida_util_dias && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-300 bg-slate-800/60 rounded-lg px-2 py-1">
                <Refrigerator size={12} className="text-sky-400" aria-hidden="true" />
                Dura {fermento.vida_util_dias} d
              </span>
            )}
          </div>
        )}

        {Array.isArray(fermento.fuentes) && fermento.fuentes.length > 0 && (
          <p className="text-[10px] text-slate-500 mt-2 leading-snug">
            <span className="font-bold">Fuentes:</span> {fermento.fuentes.join(' · ')}
          </p>
        )}
      </div>
    </article>
  );
}

/** Tarjeta de un VETO de seguridad — el ancla roja imposible de ignorar. */
function TarjetaVeto({ veto }) {
  return (
    <article
      data-testid={`veto-${veto.id}`}
      className="bg-red-950/60 border border-red-800 rounded-xl p-4"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle size={24} className="text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
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
          <p className="text-sm text-red-200 leading-snug mb-2">{veto.descripcion}</p>
          {veto.razon_veto && (
            <div className="bg-red-950/80 rounded-lg p-3 border border-red-900/50">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1.5">
                Por qué
              </p>
              <PedagogicalText texto={veto.razon_veto} tone="slate" />
            </div>
          )}
          {veto.consecuencia_potencial && (
            <p className="text-[10px] text-red-300 mt-2 font-semibold">
              Consecuencia: {veto.consecuencia_potencial}
            </p>
          )}
        </div>
      </div>
    </article>
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

  const fotoPortada = getFotoPorArchivo(FOTO_PORTADA_ARCHIVO);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-400 text-sm">Cargando fermentos...</div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-6 max-w-3xl mx-auto">
      {/* ── PORTADA con foto CC + recordatorio de inocuidad ───────────────────── */}
      <div className="rounded-2xl overflow-hidden border border-emerald-800/50">
        <div className="relative h-40">
          {fotoPortada ? (
            <img
              src={fotoPortada.url}
              alt="Frascos de verduras en fermentación"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-700/40 to-teal-900/40" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/10" />
          <div className="absolute inset-0 p-4 flex flex-col justify-end">
            <div className="flex items-center gap-2">
              <Beaker size={22} className="text-emerald-300 shrink-0" aria-hidden="true" />
              <h1 className="text-xl font-black text-white leading-tight drop-shadow">
                Fermentos de la finca y la casa
              </h1>
            </div>
            <p className="text-xs text-emerald-100/90 mt-1 max-w-lg drop-shadow">
              Recetas tradicionales con su seguridad al lado.
            </p>
          </div>
          {fotoPortada && <CreditoFoto foto={fotoPortada} className="absolute bottom-2 right-2" />}
        </div>
        <div className="bg-emerald-950/40 px-4 py-3 text-xs text-emerald-100/85 leading-relaxed">
          Un fermento es un <strong className="text-emerald-200">alimento, no un medicamento</strong>:
          aquí no prometemos curas. Lo que sí cuida es la higiene, la acidez y la sal.
          Para venderlos o procesarlos en cantidad, rija las normas de inocuidad (INVIMA).
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
              <TarjetaVeto key={veto.id} veto={veto} />
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
            className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-2 mb-3 -mx-1 px-1"
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
            {visibles.map((fermento) => (
              <TarjetaFermento key={fermento.id} fermento={fermento} />
            ))}
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
        <p className="text-[9px] text-slate-600 mt-2 leading-snug">
          Fotos con licencia Creative Commons; crédito y licencia sobre cada
          imagen. Detalle en catalog/fotos/fotos-atribucion.json.
        </p>
      </section>
    </div>
  );
}
