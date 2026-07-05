/* i18n (ADR-050): etiquetas user-facing en español Colombia pendientes de
 * migrar a src/config/messages.js. Misma deuda preexistente que
 * NutricionHumanaScreen / PoscosechaScreen; se desactiva la regla soft aquí. */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronDown, Store, Sprout, HandCoins, Factory, ShieldCheck,
  Info, ExternalLink, TrendingUp, Landmark, Loader2, MessageCircle, X,
} from 'lucide-react';
import { getPrecioSipsa } from '../services/sidecarClient';

/**
 * MercadoDespensaScreen — mini-app "Mercado y despensa" (mundo del mismo
 * nombre). Responde tres preguntas del campesino que ya cosechó:
 *   1. ¿Por dónde vendo?      → los 6 canales de comercialización + la compra
 *                               pública ACFC (Ley 2046) como OPORTUNIDAD.
 *   2. ¿Cómo le agrego valor? → los 4 productos con valor agregado + su marco
 *                               sanitario real (INVIMA).
 *   3. ¿A cómo está hoy?      → precio EN VIVO por cultivo vía get_precio_sipsa
 *                               (SIPSA/DANE). CERO precios hardcodeados: si no
 *                               hay dato en vivo, se dice claro y se remite a la
 *                               fuente oficial. Nunca se inventa un número.
 *
 * FUENTE de los HECHOS (canales, requisitos, marco INVIMA, aristas): grafo de
 * conocimiento `chagra_kg`, exportado a `public/mercado-despensa.json` porque la
 * PWA no consulta el grafo en vivo (mismo patrón que nutricion-humana.json).
 *
 * Legibilidad al sol + WCAG: superficies opacas (slate-900/950), texto en
 * slate-100/white (tinta oscura en temas claros vía themes.css). Los colores
 * vivos por canal (emerald/violet/amber/…) se usan SOLO como grafismo (punto,
 * borde, velo), nunca como texto sobre superficie clara. Animaciones sutiles,
 * todas apagadas con prefers-reduced-motion.
 */

/* Íconos por tipo de canal (lucide, decorativos). */
const CANAL_ICON = {
  canal_venta_directa_finca: HandCoins,
  canal_mercado_campesino: Store,
  canal_agroferia_institucional: Store,
  canal_compra_publica_acfc: Landmark,
  canal_agroindustria_cliente_formal: Factory,
  canal_central_mayorista_sipsa: TrendingUp,
};

/* Paleta por tono — clases LITERALES (Tailwind JIT no ve strings construidos).
 * `dot`/`ring`/`soft` = grafismo; el texto siempre va en slate, legible. */
const TONO = {
  emerald: { dot: 'bg-emerald-400', ring: 'border-emerald-500/40', soft: 'bg-emerald-500/10', icon: 'text-emerald-400' },
  lime: { dot: 'bg-lime-400', ring: 'border-lime-500/40', soft: 'bg-lime-500/10', icon: 'text-lime-400' },
  amber: { dot: 'bg-amber-400', ring: 'border-amber-500/40', soft: 'bg-amber-500/10', icon: 'text-amber-400' },
  violet: { dot: 'bg-violet-400', ring: 'border-violet-500/50', soft: 'bg-violet-500/10', icon: 'text-violet-400' },
  sky: { dot: 'bg-sky-400', ring: 'border-sky-500/40', soft: 'bg-sky-500/10', icon: 'text-sky-400' },
  slate: { dot: 'bg-slate-400', ring: 'border-slate-600', soft: 'bg-slate-500/10', icon: 'text-slate-300' },
};

/* Estilo del badge de riesgo sanitario (valor agregado). */
const RIESGO_ESTILO = {
  bajo: { label: 'Trámite bajo', chip: 'border-emerald-500/60 text-emerald-300', dot: 'bg-emerald-400' },
  'bajo-medio': { label: 'Trámite bajo-medio', chip: 'border-lime-500/60 text-lime-300', dot: 'bg-lime-400' },
  medio: { label: 'Trámite medio', chip: 'border-amber-500/60 text-amber-300', dot: 'bg-amber-400' },
  alto: { label: 'Trámite alto', chip: 'border-rose-500/60 text-rose-300', dot: 'bg-rose-400' },
};

/* COP entero es-CO: 4600 → "4.600". */
function formatCop(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return Math.round(n).toLocaleString('es-CO');
}

/* "2026-06-25" → "25 de junio". Devuelve la ISO cruda si no parsea. */
function fechaCorta(iso) {
  if (typeof iso !== 'string') return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${Number(m[3])} de ${meses[Number(m[2]) - 1] || m[2]}`;
}

/* ── Ilustración SVG propia: un puesto de mercado con toldo, cajón de cosecha y
 *    el sol. Colores en CSS-var del acento para respirar con el tema. ───────── */
function PuestoIlustracion() {
  return (
    <svg viewBox="0 0 260 140" role="img"
      aria-label="Ilustración de un puesto de mercado campesino con toldo, cosecha y sol"
      className="w-full h-auto">
      <rect x="0" y="0" width="260" height="140" rx="6" fill="rgb(var(--t-accent-rgb) / 0.08)" />
      {/* Sol */}
      <circle cx="34" cy="30" r="13" fill="#f4b83c" className="md-sun" />
      <g stroke="#f4b83c" strokeWidth="2" strokeLinecap="round" className="md-sun">
        <path d="M34 8 V2" /><path d="M12 30 H5" /><path d="M18 14 L14 10" /><path d="M50 14 L54 10" />
      </g>
      {/* Toldo rayado */}
      <path d="M150 40 h96 l-8 22 h-96 z" fill="#c65b3c" />
      <path d="M166 40 l-8 22 M182 40 l-8 22 M198 40 l-8 22 M214 40 l-8 22 M230 40 l-8 22" stroke="#e9e2d2" strokeWidth="5" />
      {/* Postes + mesa */}
      <rect x="150" y="62" width="4" height="46" fill="#7a5a3c" />
      <rect x="238" y="62" width="4" height="46" fill="#7a5a3c" />
      <rect x="142" y="96" width="108" height="10" rx="3" fill="#8a6a44" />
      {/* Cajón de cosecha con productos */}
      <rect x="158" y="80" width="74" height="18" rx="3" fill="#6b4e30" />
      <circle cx="172" cy="82" r="8" fill="#e0603c" /> {/* tomate */}
      <circle cx="190" cy="80" r="9" fill="#f0a93c" /> {/* ahuyama */}
      <circle cx="209" cy="82" r="8" fill="#3f9d5a" /> {/* verde */}
      <circle cx="224" cy="83" r="7" fill="#a05fb4" /> {/* mora/uchuva */}
      {/* Costal + moneda (venta) */}
      <path d="M96 108 q-8 -28 14 -30 q22 2 14 30 z" fill="#b98a52" />
      <ellipse cx="110" cy="78" rx="14" ry="4" fill="#8a6a44" />
      <circle cx="120" cy="62" r="10" fill="#f4c430" className="md-coin" />
      <text x="120" y="66" textAnchor="middle" fontSize="11" fontWeight="700" fill="#7a5a1a">$</text>
    </svg>
  );
}

/* ── Tarjeta de un CANAL de comercialización. Tap → despliega la descripción
 *    grounded (verbatim del grafo) + tipo + confianza + fuente. ─────────────── */
function CanalCard({ canal }) {
  const [abierto, setAbierto] = useState(false);
  const t = TONO[canal.tono] || TONO.slate;
  const Icon = CANAL_ICON[canal.id] || Store;
  const esOportunidad = canal.oportunidad === true;
  return (
    <div className={`relative rounded-2xl border ${esOportunidad ? 'border-violet-500/60' : t.ring} ${t.soft} overflow-hidden`}>
      {esOportunidad && (
        <div className="absolute right-0 top-0 px-2.5 py-1 rounded-bl-xl bg-violet-500 text-white text-[10px] font-extrabold uppercase tracking-wide">
          Oportunidad
        </div>
      )}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className={`w-full text-left px-4 pb-3 flex items-start gap-3 ${esOportunidad ? 'pt-9' : 'pt-3.5'}`}
      >
        <span className={`shrink-0 mt-0.5 w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-xl`} aria-hidden="true">
          {canal.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-extrabold text-white leading-tight flex items-center gap-1.5">
            <Icon size={15} className={t.icon} aria-hidden="true" />
            {canal.titulo_corto}
          </h3>
          <p className="mt-0.5 text-[13px] text-slate-200 leading-snug">{canal.gancho}</p>
        </div>
        <ChevronDown size={18} className={`shrink-0 mt-1 text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {abierto && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-800 bg-slate-950/40 text-[12.5px] text-slate-300 flex flex-col gap-2">
          <p className="leading-snug">{canal.descripcion}</p>
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-slate-700 bg-slate-800 text-slate-200">
              <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} aria-hidden="true" />
              {canal.tipo?.replace(/_/g, ' ')}
            </span>
            {canal.confianza && (
              <span className="text-[11px] text-slate-500">Confianza del dato: {canal.confianza}</span>
            )}
          </div>
          {canal.fuente && (
            <p className="text-[11px] text-slate-500 leading-snug">
              <span className="text-slate-400">Fuente:</span> {canal.fuente}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Tarjeta de un producto con VALOR AGREGADO. Badge de riesgo sanitario. ──── */
function ValorCard({ valor }) {
  const [abierto, setAbierto] = useState(false);
  const r = RIESGO_ESTILO[valor.nivel_riesgo] || RIESGO_ESTILO.medio;
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="w-full text-left px-4 pt-3.5 pb-3 flex items-start gap-3"
      >
        <span className="shrink-0 mt-0.5 w-10 h-10 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center text-xl" aria-hidden="true">
          {valor.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[15px] font-extrabold text-white leading-tight">{valor.nombre}</h3>
            <span className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full border bg-slate-800 ${r.chip}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${r.dot}`} aria-hidden="true" />
              {r.label}
            </span>
          </div>
          <p className="mt-0.5 text-[13px] text-slate-200 leading-snug">{valor.gancho}</p>
        </div>
        <ChevronDown size={18} className={`shrink-0 mt-1 text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {abierto && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-800 bg-slate-950/40 text-[12.5px] text-slate-300 flex flex-col gap-2">
          <p className="inline-flex items-start gap-1.5 leading-snug text-slate-200">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
            <span><span className="font-semibold text-slate-100">Sanidad (INVIMA):</span> {valor.regimen}</span>
          </p>
          <p className="leading-snug">{valor.descripcion}</p>
          {valor.fuente && (
            <p className="text-[11px] text-slate-500 leading-snug">
              <span className="text-slate-400">Fuente:</span> {valor.fuente}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Chip-foto de un cultivo de la despensa (para el explorador de precios). ── */
function CultivoChip({ item, activo, onClick }) {
  const [imgOk, setImgOk] = useState(true);
  const tienePrecio = !!item.producto_sipsa;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`group relative shrink-0 w-[104px] rounded-xl overflow-hidden border text-left transition-transform active:scale-95 ${
        activo ? 'border-emerald-400 ring-2 ring-emerald-400/50' : 'border-slate-700'
      }`}
    >
      <div className="relative h-[72px] bg-slate-800">
        {item.imagen?.url && imgOk ? (
          <img
            src={item.imagen.url}
            alt={item.nombre_comun}
            loading="lazy"
            onError={() => setImgOk(false)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl" aria-hidden="true">🧺</div>
        )}
        {tienePrecio && (
          <span className="absolute bottom-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white">
            precio vivo
          </span>
        )}
      </div>
      <div className="px-2 py-1.5 bg-slate-900">
        <p className="text-[11.5px] font-bold text-slate-100 leading-tight truncate">{item.nombre_comun}</p>
      </div>
    </button>
  );
}

/* ── Panel de precio EN VIVO para el cultivo seleccionado. Llama a
 *    get_precio_sipsa; NUNCA inventa. Sin dato → decline honesto + fuente. ──── */
function PrecioVivo({ item, canalesById, onAskAgent }) {
  // Estado inicial derivado en el montaje (el componente se re-monta por
  // `key={species_id}` en el padre, así que el initializer corre por cada
  // cultivo). Evita setState síncrono dentro del efecto.
  const [estado, setEstado] = useState(() => (item?.producto_sipsa ? 'loading' : 'idle')); // idle | loading | ok | unavailable | error
  const [precio, setPrecio] = useState(null);

  useEffect(() => {
    if (!item?.producto_sipsa) return undefined;
    let vivo = true;
    getPrecioSipsa('latest_price', { producto: item.producto_sipsa })
      .then((res) => {
        if (!vivo) return;
        const p = res?.price;
        const val = p?.precio_promedio_cop_kg;
        if (res?.available === true && typeof val === 'number' && Number.isFinite(val)) {
          setPrecio({ price: p, frescura: res.frescura || null, central: res.central_abastos || p?.plaza || null });
          setEstado('ok');
        } else {
          setEstado('unavailable');
        }
      })
      .catch(() => { if (vivo) setEstado('error'); });
    return () => { vivo = false; };
  }, [item?.producto_sipsa]);

  const preguntarAgente = () => {
    if (typeof onAskAgent === 'function') {
      onAskAgent(`¿A cómo está hoy ${item.nombre_comun.toLowerCase()} en la central de abastos?`);
    }
  };

  const canalMayorista = canalesById?.canal_central_mayorista_sipsa;

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[15px] font-extrabold text-white">{item.nombre_comun}</span>
        {item.nombre_cientifico && <span className="text-[12px] italic text-slate-400">{item.nombre_cientifico}</span>}
      </div>

      {/* Canales por los que se vende (chips) */}
      {Array.isArray(item.canales) && item.canales.length > 0 && (
        <div className="mb-3">
          <p className="text-[11px] uppercase tracking-wide font-bold text-slate-400 mb-1.5">Se vende por</p>
          <div className="flex flex-wrap gap-1.5">
            {item.canales.map((cid) => {
              const c = canalesById?.[cid];
              if (!c) return null;
              return (
                <span key={cid} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-slate-700 bg-slate-800 text-slate-200">
                  <span aria-hidden="true">{c.emoji}</span> {c.titulo_corto}
                </span>
              );
            })}
          </div>
          {item.transforma_en && (
            <p className="mt-2 text-[12px] text-emerald-300 inline-flex items-center gap-1">
              <Factory size={13} aria-hidden="true" /> También se puede transformar (mire "¿Cómo le agrego valor?").
            </p>
          )}
        </div>
      )}

      {/* Precio del día */}
      <div className="pt-3 border-t border-slate-800">
        <p className="text-[11px] uppercase tracking-wide font-bold text-slate-400 mb-1.5">¿A cómo está hoy?</p>

        {!item.producto_sipsa && (
          <p className="text-[13px] text-slate-300 leading-snug">
            Este cultivo no está en el boletín de precios SIPSA/DANE, así que no podemos cotizarlo aquí.
            Pregúntale al agente por su precio o consulta la fuente oficial abajo.
          </p>
        )}

        {estado === 'loading' && (
          <p className="flex items-center gap-2 text-[13px] text-slate-300">
            <Loader2 size={15} className="animate-spin text-emerald-400" aria-hidden="true" />
            Consultando el precio del día…
          </p>
        )}

        {estado === 'ok' && precio && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/40 p-3">
            <p className="text-[13px] text-slate-200 leading-tight">
              {precio.price.producto || item.nombre_comun}
            </p>
            <p className="text-[26px] font-extrabold text-white leading-tight tabular-nums">
              ${formatCop(precio.price.precio_promedio_cop_kg)}
              <span className="text-[14px] font-bold text-slate-300"> / kg</span>
            </p>
            {precio.central && <p className="text-[12.5px] text-slate-300">en {precio.central}</p>}
            {formatCop(precio.price.precio_min_cop_kg) && formatCop(precio.price.precio_max_cop_kg)
              && precio.price.precio_min_cop_kg !== precio.price.precio_max_cop_kg && (
              <p className="text-[12px] text-slate-400 mt-0.5 tabular-nums">
                Rango del día: ${formatCop(precio.price.precio_min_cop_kg)}–${formatCop(precio.price.precio_max_cop_kg)} / kg
              </p>
            )}
            {precio.frescura?.desactualizado === true && (
              <p className="mt-1.5 text-[11.5px] text-amber-300 leading-snug">
                <Info size={12} className="inline mb-0.5 mr-1" aria-hidden="true" />
                Es el último dato disponible{typeof precio.frescura.dias_desde_dato === 'number'
                  ? ` (de hace ${precio.frescura.dias_desde_dato} día${precio.frescura.dias_desde_dato === 1 ? '' : 's'})`
                  : ''}, no el de hoy.
              </p>
            )}
            <p className="mt-2 text-[11px] text-slate-400 leading-snug border-t border-emerald-500/20 pt-1.5">
              Fuente: SIPSA/DANE{precio.price.fecha ? `, ${fechaCorta(precio.price.fecha)}` : ''}.
              Es precio mayorista de central: en su vereda puede valer distinto y, por flete e intermediación, usted recibe menos.
            </p>
          </div>
        )}

        {(estado === 'unavailable' || estado === 'error') && (
          <div className="rounded-xl bg-slate-800/60 border border-slate-700 p-3">
            <p className="text-[13px] text-slate-200 leading-snug">
              {estado === 'error'
                ? 'No pudimos conectarnos para traer el precio (revise su conexión).'
                : 'Hoy no hay un precio publicado para este producto en SIPSA/DANE.'}
              {' '}No inventamos un número: consulte el precio del día en la fuente oficial o pregúntele al agente.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {typeof onAskAgent === 'function' && (
                <button
                  type="button"
                  onClick={preguntarAgente}
                  className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-1.5 rounded-full bg-emerald-500 text-white active:scale-95 transition-transform"
                >
                  <MessageCircle size={13} aria-hidden="true" /> Preguntarle al agente
                </button>
              )}
              {canalMayorista?.fuente && (
                <span className="text-[11px] text-slate-500 self-center">SIPSA/DANE, boletín mayorista</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * @param {Object} props
 * @param {() => void} props.onBack
 * @param {(view: string, data?: any) => void} [props.onNavigate]
 */
export default function MercadoDespensaScreen({ onBack, onNavigate }) {
  const [data, setData] = useState(null);
  const [estado, setEstado] = useState('cargando'); // cargando | listo | error
  const [seleccion, setSeleccion] = useState(null); // species_id del cultivo abierto

  useEffect(() => {
    let vivo = true;
    fetch('/mercado-despensa.json')
      .then((r) => { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then((j) => { if (vivo) { setData(j); setEstado('listo'); } })
      .catch(() => { if (vivo) setEstado('error'); });
    return () => { vivo = false; };
  }, []);

  const canalesById = useMemo(() => {
    if (!data) return {};
    return Object.fromEntries(data.canales.map((c) => [c.id, c]));
  }, [data]);

  const itemSeleccionado = useMemo(() => {
    if (!data || !seleccion) return null;
    return data.despensa.find((d) => d.species_id === seleccion) || null;
  }, [data, seleccion]);

  const askAgent = useMemo(() => {
    if (typeof onNavigate !== 'function') return undefined;
    return (pregunta) => onNavigate('agente', { prefilledPrompt: pregunta });
  }, [onNavigate]);

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
            <Store size={18} aria-hidden="true" /> Mercado y despensa
          </h1>
          <p className="text-xs text-slate-400 leading-tight">¿Por dónde vendo, cómo le agrego valor y a cómo está?</p>
        </div>
      </header>

      <div className="px-4 pb-12">
        {estado === 'cargando' && (
          <div className="mt-4 flex flex-col gap-3" aria-live="polite">
            <div className="loading-skeleton-dark h-32 rounded-2xl" />
            <div className="loading-skeleton-dark h-20 rounded-2xl" />
            <div className="loading-skeleton-dark h-20 rounded-2xl" />
            <p className="text-center text-sm text-slate-400">Cargando los canales de venta…</p>
          </div>
        )}
        {estado === 'error' && (
          <p className="mt-8 text-center text-sm text-slate-100">
            No se pudo cargar la información de mercado. Intente de nuevo con conexión.
          </p>
        )}

        {estado === 'listo' && data && (
          <div className="flex flex-col gap-5">
            {/* Hero */}
            <section className="rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
              <div className="p-4 pb-2"><PuestoIlustracion /></div>
              <div className="px-4 pb-4">
                <p className="text-[13px] uppercase tracking-wide font-bold text-slate-400">Sembrar es la mitad</p>
                <p className="mt-1 text-[15px] text-slate-100 leading-snug">
                  La otra mitad es <span className="font-bold">venderlo bien</span>. Aquí ve por dónde puede vender,
                  cómo le saca más valor a su cosecha transformándola, y a cómo está el mercado hoy —
                  <span className="font-semibold"> con precios en vivo, sin inventar ni un peso</span>.
                </p>
              </div>
            </section>

            {/* ── Sección 1: ¿Por dónde vendo? ─────────────────────────────── */}
            <section>
              <SectionHead
                Icon={Sprout}
                titulo="¿Por dónde vendo?"
                sub={`${data.canales.length} caminos para sacar su cosecha. Del que más plata le deja al mayorista.`}
              />
              <div className="flex flex-col gap-2.5">
                {data.canales.map((c) => <CanalCard key={c.id} canal={c} />)}
              </div>
            </section>

            {/* ── Sección 2: ¿Cómo le agrego valor? ────────────────────────── */}
            <section>
              <SectionHead
                Icon={Factory}
                titulo="¿Cómo le agrego valor?"
                sub="Transformar la cosecha paga más. Cada producto trae su trámite sanitario real (INVIMA)."
              />
              <div className="flex flex-col gap-2.5">
                {data.valor_agregado.map((v) => <ValorCard key={v.id} valor={v} />)}
              </div>
              <p className="mt-2 inline-flex items-start gap-1.5 text-[11.5px] text-slate-400 leading-snug">
                <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                El régimen sanitario cambia según lo que produzca. Antes de vender transformado, confirme su caso con
                el INVIMA o su UMATA/ULATA. Aquí va el marco general, no un trámite personalizado.
              </p>
            </section>

            {/* ── Sección 3: ¿A cómo está? + Tu despensa ───────────────────── */}
            <section>
              <SectionHead
                Icon={HandCoins}
                titulo="¿A cómo está?"
                sub="Toque un cultivo para ver por dónde se vende y su precio del día (SIPSA/DANE en vivo)."
              />
              {/* Carrusel de cultivos */}
              <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-4 px-4 snap-x" role="list" aria-label="Cultivos de la despensa">
                {data.despensa.map((it) => (
                  <div role="listitem" key={it.species_id} className="snap-start">
                    <CultivoChip
                      item={it}
                      activo={seleccion === it.species_id}
                      onClick={() => setSeleccion((s) => (s === it.species_id ? null : it.species_id))}
                    />
                  </div>
                ))}
              </div>

              {/* Detalle del cultivo seleccionado */}
              {itemSeleccionado ? (
                <div className="mt-3 relative">
                  <button
                    type="button"
                    onClick={() => setSeleccion(null)}
                    aria-label="Cerrar detalle"
                    className="absolute -top-1 right-1 z-10 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center"
                  >
                    <X size={16} />
                  </button>
                  <PrecioVivo key={itemSeleccionado.species_id} item={itemSeleccionado} canalesById={canalesById} onAskAgent={askAgent} />
                </div>
              ) : (
                <p className="mt-2 text-[12.5px] text-slate-400 leading-snug">
                  {data.meta.despensa_con_producto_sipsa} de {data.meta.total_despensa} cultivos tienen precio en vivo
                  (marcados <span className="text-emerald-300 font-semibold">precio vivo</span>). El resto se orienta al agente.
                </p>
              )}

              {/* Nota de honestidad de precios — SIEMPRE visible */}
              <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
                <p className="text-[12px] text-slate-200 leading-snug">
                  <Info size={13} className="inline mb-0.5 mr-1 text-amber-400" aria-hidden="true" />
                  Chagra <span className="font-semibold">no fija precios ni los adivina</span>. Cuando hay dato, viene
                  del boletín oficial SIPSA/DANE en vivo; cuando no lo hay, se lo decimos claro.
                </p>
              </div>
            </section>

            {/* Footer — grounding */}
            <footer className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-[12px] text-slate-300">
              <p className="font-bold text-slate-100 mb-1">De dónde salen estos datos</p>
              <p className="leading-snug">{data.meta.origen_datos}</p>
              <p className="mt-1 leading-snug text-slate-400">{data.meta.nota_precios}</p>
              <a
                href={data.meta.fuente_precio_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-emerald-400 font-semibold underline"
              >
                <ExternalLink size={13} aria-hidden="true" /> Ver los precios oficiales SIPSA/DANE
              </a>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Encabezado de sección reutilizable. ────────────────────────────────────── */
function SectionHead(props) {
  const { titulo, sub } = props;
  const Icon = props.Icon;
  return (
    <div className="mb-2.5">
      <h2 className="text-[18px] font-extrabold text-white flex items-center gap-2 leading-tight">
        <Icon size={19} className="text-emerald-400" aria-hidden="true" /> {titulo}
      </h2>
      {sub && <p className="text-[13px] text-slate-400 leading-snug mt-0.5">{sub}</p>}
    </div>
  );
}
