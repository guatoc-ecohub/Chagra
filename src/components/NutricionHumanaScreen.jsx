/* i18n (ADR-050): etiquetas user-facing en español Colombia pendientes de
 * migrar a src/config/messages.js. Misma deuda preexistente que PoscosechaScreen
 * y SaludSueloScreen; se desactiva la regla soft a nivel de archivo. */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronDown, Flame, Dumbbell, Droplet, Eye,
  Info, BookOpen, ExternalLink, Utensils,
} from 'lucide-react';

/**
 * NutricionHumanaScreen — mini-app "La comida que alimenta" (mundo Mercado y
 * despensa). Muestra QUÉ TE DA COMER cada cultivo de la finca: su aporte
 * nutricional por 100 g, de forma didáctica para campesino.
 *
 * FUENTE ÚNICA de las cifras: grafo de conocimiento `chagra_kg` (nodos
 * AporteNutricional → Species vía TIENE_APORTE_NUTRICIONAL), exportado a
 * `public/nutricion-humana.json` porque la PWA no consulta el grafo en vivo.
 * Los números salen del ICBF — Tabla de Composición de Alimentos Colombianos
 * (TCAC) 2015. CERO invención: donde el ICBF no reporta un valor, se dice
 * explícito ("el ICBF no lo reporta"), nunca se rellena.
 *
 * Legibilidad al sol + WCAG: TODO el texto usa tokens theme-aware (slate/
 * emerald/amber, remapeados a CSS-vars por tema en tailwind.config.js, y
 * `text-white` que themes.css convierte en tinta oscura en los temas claros).
 * Los colores vivos rose/violet/sky (NO remapeados) se usan SOLO como grafismo
 * (relleno de barras, íconos -500 que pasan contraste sobre blanco, puntos),
 * nunca como texto sobre superficie clara. Las barras crecen con una animación
 * sutil que se apaga con prefers-reduced-motion.
 */

/* ── Identidad visual FIJA de los 4 nutrientes (mismo color/ícono en todas las
 *    tarjetas para que se aprendan a ojo). `bar` = relleno (grafismo); `icon` =
 *    -500 (pasa contraste sobre blanco Y se ve sobre oscuro); `borde` para el
 *    chip de la estrella. El TEXTO de la etiqueta NO se pinta con estos colores
 *    (usa slate, siempre legible). ─────────────────────────────────────────── */
const NUTRIENTES = [
  {
    key: 'energia_kcal', Icon: Flame, etiqueta: 'Energía', unidad: 'kcal',
    folk: 'Fuerza para trabajar el día entero.',
    bar: 'bg-amber-400', icon: 'text-amber-500', borde: 'border-amber-500/60',
  },
  {
    key: 'proteina_g', Icon: Dumbbell, etiqueta: 'Proteína', unidad: 'g',
    folk: 'Forma músculo y sangre; hace crecer a los pelaos.',
    bar: 'bg-emerald-400', icon: 'text-emerald-500', borde: 'border-emerald-500/60',
  },
  {
    key: 'hierro_mg', Icon: Droplet, etiqueta: 'Hierro', unidad: 'mg',
    folk: 'Hace sangre buena; espanta el cansancio y la anemia.',
    bar: 'bg-rose-400', icon: 'text-rose-500', borde: 'border-rose-500/60',
  },
  {
    key: 'vitamina_a_er', Icon: Eye, etiqueta: 'Vitamina A', unidad: 'ER',
    folk: 'Cuida los ojos, la piel y las defensas.',
    bar: 'bg-violet-400', icon: 'text-violet-500', borde: 'border-violet-500/60',
  },
];
const NUTRIENTE_BY_KEY = Object.fromEntries(NUTRIENTES.map((n) => [n.key, n]));

/* La estrella de cada alimento → texto del gancho ("qué te da comer esto"). */
const ESTRELLA_LABEL = {
  energia_kcal: 'Da mucha energía',
  proteina_g: 'Rico en proteína',
  hierro_mg: 'Rico en hierro',
  vitamina_a_er: 'Cargado de vitamina A',
};

/* Estilo por grupo pedagógico. El TÍTULO va en slate (siempre legible); el
 * color del grupo se comunica con el punto, el emoji, el borde y un velo muy
 * sutil. Clases LITERALES (Tailwind JIT no ve strings construidos). */
const GRUPO_ESTILO = {
  amber: { ring: 'border-amber-500/40', dot: 'bg-amber-400', soft: 'bg-amber-500/10' },
  emerald: { ring: 'border-emerald-500/40', dot: 'bg-emerald-400', soft: 'bg-emerald-500/10' },
  sky: { ring: 'border-sky-500/40', dot: 'bg-sky-400', soft: 'bg-sky-500/10' },
};

function formatValor(v, unidad) {
  if (v == null) return null;
  const n = Number.isInteger(v) ? v : Math.round(v * 10) / 10;
  return `${n} ${unidad}`;
}

/* ── Barra comparativa de un nutriente. El ancho es RELATIVO al máximo del
 *    dataset (comparación entre los cultivos de la despensa, etiquetada como
 *    tal). Sin dato → barra vacía punteada + "el ICBF no lo reporta". ──────── */
function BarraNutriente({ nutri, valor, maximo, animar }) {
  const { Icon, etiqueta, unidad, bar, icon } = nutri;
  const sinDato = valor == null;
  const pct = sinDato || !maximo ? 0 : Math.max(4, Math.round((valor / maximo) * 100));
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1 w-[92px] shrink-0 text-[12px] font-semibold text-slate-100">
        <Icon size={14} className={icon} aria-hidden="true" />
        {etiqueta}
      </span>
      <div
        className="relative flex-1 h-5 rounded-full bg-slate-800 overflow-hidden border border-slate-700"
        role="img"
        aria-label={sinDato ? `${etiqueta}: el ICBF no lo reporta` : `${etiqueta}: ${formatValor(valor, unidad)}`}
      >
        {sinDato ? (
          <div className="absolute inset-0 flex items-center pl-2 text-[11px] italic text-slate-400 border border-dashed border-slate-500 rounded-full">
            el ICBF no lo reporta
          </div>
        ) : (
          <div
            className={`${animar ? 'nutri-bar ' : ''}h-full rounded-full ${bar}`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
      <span className="w-[62px] shrink-0 text-right text-[12px] font-bold text-slate-100 tabular-nums">
        {sinDato ? '—' : formatValor(valor, unidad)}
      </span>
    </div>
  );
}

/* ── Tarjeta de un cultivo. Tap → despliega detalle (código ICBF, forma,
 *    datos faltantes, confianza). ──────────────────────────────────────────── */
function CultivoCard({ item, maximos, animar }) {
  const [abierto, setAbierto] = useState(false);
  const estrella = item.nutriente_estrella;
  const estrellaNutri = estrella ? NUTRIENTE_BY_KEY[estrella] : null;
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="w-full text-left px-4 pt-3 pb-2 flex items-start gap-3"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[16px] font-extrabold text-white leading-tight">{item.nombre_comun}</h3>
            {estrellaNutri && (
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border bg-slate-800 text-slate-100 ${estrellaNutri.borde}`}>
                <estrellaNutri.Icon size={12} className={estrellaNutri.icon} aria-hidden="true" />
                {ESTRELLA_LABEL[estrella]}
              </span>
            )}
          </div>
          {item.nombre_cientifico && (
            <p className="text-[12px] italic text-slate-400 leading-tight">{item.nombre_cientifico}</p>
          )}
          {item.forma && (
            <p className="text-[11px] text-slate-500 leading-tight mt-0.5">Medido: {item.forma}</p>
          )}
        </div>
        <ChevronDown
          size={18}
          className={`shrink-0 mt-1 text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {/* Gancho folk de la estrella */}
      {estrellaNutri && (
        <p className="px-4 pb-2 text-[13px] text-slate-200 leading-snug">
          <span className="font-semibold text-slate-100">Qué te da:</span> {estrellaNutri.folk}
        </p>
      )}

      {/* Barras comparativas de los 4 nutrientes */}
      <div className="px-4 pb-3 flex flex-col gap-1.5">
        {NUTRIENTES.map((nutri) => (
          <BarraNutriente
            key={nutri.key}
            nutri={nutri}
            valor={item.nutrientes[nutri.key]}
            maximo={maximos[nutri.key]}
            animar={animar}
          />
        ))}
      </div>

      {/* Detalle desplegable */}
      {abierto && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-800 bg-slate-950/40 text-[12px] text-slate-300 flex flex-col gap-1.5">
          {item.alimento_icbf && (
            <p><span className="text-slate-400">Alimento (ICBF):</span> {item.alimento_icbf}
              {item.codigo_icbf != null && <span className="text-slate-500"> · código {item.codigo_icbf}</span>}
            </p>
          )}
          {Array.isArray(item.nombres_comunes) && item.nombres_comunes.length > 0 && (
            <p><span className="text-slate-400">También le dicen:</span> {item.nombres_comunes.join(', ')}</p>
          )}
          {item.datos_faltantes.length > 0 && (
            <p className="text-slate-200">
              <Info size={12} className="inline mb-0.5 mr-1 text-amber-500" aria-hidden="true" />
              El ICBF (TCAC 2015) no reporta {item.datos_faltantes.map((k) => (NUTRIENTE_BY_KEY[k]?.etiqueta || k)).join(' ni ').toLowerCase()} para este alimento. No inventamos el dato.
            </p>
          )}
          {item.confianza && (
            <p className="text-slate-500">Confianza del dato: {item.confianza}. Valores por 100 g de porción comestible.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Ilustración SVG propia: un plato servido con el sol arriba. ─────────────── */
function PlatoIlustracion() {
  return (
    <svg
      viewBox="0 0 240 140"
      role="img"
      aria-label="Ilustración de un plato servido de comida de la finca bajo el sol"
      className="w-full h-auto"
    >
      <rect x="0" y="0" width="240" height="140" rx="6" fill="rgb(var(--t-accent-rgb) / 0.08)" />
      {/* Sol */}
      <circle cx="202" cy="28" r="13" fill="#f4b83c" className="nh-sun" />
      <g stroke="#f4b83c" strokeWidth="2" strokeLinecap="round" className="nh-sun">
        <path d="M202 6 V0" /><path d="M224 28 H231" /><path d="M218 12 L222 8" /><path d="M186 12 L182 8" />
      </g>
      {/* Mantel / mesa */}
      <rect x="14" y="112" width="212" height="8" rx="4" fill="#7a5a3c" />
      {/* Plato */}
      <ellipse cx="112" cy="104" rx="78" ry="16" fill="#5a4630" />
      <ellipse cx="112" cy="98" rx="74" ry="26" fill="#e9e2d2" />
      <ellipse cx="112" cy="96" rx="58" ry="19" fill="#d8cfb9" />
      {/* Comida — colores de los grupos */}
      <circle cx="88" cy="94" r="12" fill="#f0a93c" />{/* energético (ahuyama) */}
      <circle cx="112" cy="90" r="11" fill="#3f9d5a" />{/* proteico (verde) */}
      <circle cx="134" cy="95" r="10" fill="#e0603c" />{/* protector (tomate) */}
      <path d="M100 84 q6 -14 18 -6" stroke="#3f8f4e" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Vapor */}
      <g stroke="#cbb89a" strokeWidth="2.5" strokeLinecap="round" fill="none" className="nh-steam">
        <path d="M96 74 q-5 -8 0 -16" /><path d="M120 72 q5 -8 0 -16" />
      </g>
    </svg>
  );
}

export default function NutricionHumanaScreen({ onBack }) {
  const [data, setData] = useState(null);
  const [estado, setEstado] = useState('cargando'); // cargando | listo | error
  const [filtro, setFiltro] = useState('todos');

  // prefers-reduced-motion: sin animación de crecimiento de barras.
  const animar = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    let vivo = true;
    fetch('/nutricion-humana.json')
      .then((r) => { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then((j) => { if (vivo) { setData(j); setEstado('listo'); } })
      .catch(() => { if (vivo) setEstado('error'); });
    return () => { vivo = false; };
  }, []);

  const gruposVisibles = useMemo(() => {
    if (!data) return [];
    return data.grupos
      .filter((g) => filtro === 'todos' || g.id === filtro)
      .map((g) => ({ ...g, items: data.items.filter((it) => it.grupo === g.id) }))
      .filter((g) => g.items.length > 0);
  }, [data, filtro]);

  return (
    <div className="min-h-[100dvh] text-white">
      <header className="flex items-center gap-2 px-4 pt-[calc(14px+env(safe-area-inset-top))] pb-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver"
          className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center shrink-0"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold leading-tight text-white flex items-center gap-1.5">
            <Utensils size={18} aria-hidden="true" /> La comida que alimenta
          </h1>
          <p className="text-xs text-slate-400 leading-tight">Qué te da comer cada cultivo de tu finca</p>
        </div>
      </header>

      <div className="px-4 pb-12">
        {estado === 'cargando' && (
          <p className="mt-8 text-center text-sm text-slate-400">Cargando el aporte de tus cultivos…</p>
        )}
        {estado === 'error' && (
          <p className="mt-8 text-center text-sm text-slate-100">
            No se pudo cargar la información de nutrición. Intente de nuevo con conexión.
          </p>
        )}

        {estado === 'listo' && data && (
          <div className="flex flex-col gap-4">
            {/* Gancho + fuente */}
            <section className="rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
              <div className="p-4 pb-2"><PlatoIlustracion /></div>
              <div className="px-4 pb-4">
                <p className="text-[13px] uppercase tracking-wide font-bold text-slate-400">Cada bocado te da algo</p>
                <p className="mt-1 text-[15px] text-slate-100 leading-snug">
                  Lo que usted siembra no solo llena: <span className="font-bold">alimenta</span>. Aquí ve, por cada
                  100&nbsp;gramos, la <span className="font-semibold">fuerza</span> (energía), el
                  <span className="font-semibold"> cuerpo</span> (proteína), la <span className="font-semibold">sangre</span> (hierro)
                  y las <span className="font-semibold">defensas</span> (vitamina A) que le regala cada cultivo.
                </p>
                <p className="mt-2 inline-flex items-start gap-1.5 text-[11px] text-slate-400 leading-snug">
                  <BookOpen size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>
                    Cifras oficiales del <span className="font-semibold text-slate-200">{data.meta.fuente}</span>.
                    Las barras comparan entre los cultivos de esta despensa. Donde el ICBF no reporta un valor, lo decimos claro.
                  </span>
                </p>
              </div>
            </section>

            {/* Filtro por grupo */}
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por grupo de alimento">
              <FiltroChip activo={filtro === 'todos'} onClick={() => setFiltro('todos')} label="Todos" />
              {data.grupos.map((g) => (
                <FiltroChip
                  key={g.id}
                  activo={filtro === g.id}
                  onClick={() => setFiltro(g.id)}
                  label={`${g.emoji} ${g.titulo}`}
                />
              ))}
            </div>

            {/* Grupos + cultivos */}
            {gruposVisibles.map((g) => {
              const est = GRUPO_ESTILO[g.color] || GRUPO_ESTILO.sky;
              return (
                <section key={g.id} className={`rounded-2xl border ${est.ring} ${est.soft} overflow-hidden`}>
                  <div className="px-4 pt-3 pb-2">
                    <h2 className="text-[17px] font-extrabold flex items-center gap-2 text-slate-100">
                      <span aria-hidden="true">{g.emoji}</span> {g.titulo}
                      <span className={`w-2.5 h-2.5 rounded-full ${est.dot}`} aria-hidden="true" />
                    </h2>
                    <p className="text-[13px] text-slate-100 font-semibold leading-snug">{g.folk}</p>
                    <p className="text-[12px] text-slate-400 leading-snug">{g.cientifico}</p>
                  </div>
                  <div className="px-3 pb-3 flex flex-col gap-2.5">
                    {g.items.map((it) => (
                      <CultivoCard key={it.id} item={it} maximos={data.meta.maximos} animar={animar} />
                    ))}
                  </div>
                </section>
              );
            })}

            {/* Fuente citada — visible y con enlace */}
            <footer className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-[12px] text-slate-300">
              <p className="font-bold text-slate-100 mb-1">De dónde salen estos números</p>
              <p className="leading-snug">
                {data.meta.fuente}. Valores {data.meta.unidad}. {data.meta.total_cultivos} cultivos de la finca.
              </p>
              <p className="mt-1 leading-snug text-slate-400">{data.meta.nota_datos_faltantes}</p>
              <a
                href={data.meta.fuente_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-emerald-400 font-semibold underline"
              >
                <ExternalLink size={13} aria-hidden="true" /> Ver la tabla del ICBF
              </a>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}

function FiltroChip({ activo, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-colors ${
        activo
          ? 'bg-slate-100 text-slate-900 border-slate-100'
          : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
      }`}
    >
      {label}
    </button>
  );
}
