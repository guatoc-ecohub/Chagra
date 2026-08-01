/* i18n (ADR-050): etiquetas user-facing en español Colombia pendientes de
 * migrar a src/config/messages.js. Misma deuda preexistente que
 * AlmacenamientoScreen / PoscosechaScreen / App.jsx; se desactiva la regla soft
 * a nivel de archivo. */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import { useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Info, Sprout, Leaf, Bug, Recycle,
  Copy, RefreshCw, ShieldCheck, Ruler, Scissors, Trees, Wheat, Camera,
  Droplets, CheckCircle2,
} from 'lucide-react';
import {
  GANCHO_PLATANO,
  TRES_VERDADES,
  VARIEDADES,
  SUCESION,
  DESHIJE,
  SIEMBRA,
  DISTANCIAS_REFERENCIA,
  calcularDensidadSiembra,
  ASOCIACION,
  NUTRICION_K,
  SIGATOKA,
  PICUDO,
  COSECHA,
  APROVECHAMIENTO,
} from '../services/platanoBananoData';

/**
 * PlatanoBananoScreen — mini-app "Plátano y banano" (mundo Cultivos y semillas).
 *
 * El pancoger clave del campesino colombiano, con vida y foto-forward al estilo
 * de AguaScreen / AlmacenamientoScreen. Cuatro pilares:
 *   1. Variedades y la mata — hartón, dominico, cachaco, topocho, banano/guineo,
 *      la anatomía de hierba gigante (pseudotallo) y la sucesión madre-hijo-nieto
 *      con el deshije.
 *   2. Siembra y compañía   — colino/cormo, hoyo y distancias (con calculadora de
 *      densidad, geometría exacta), sombra y asocio con café/cacao, y el hambre
 *      de potasio.
 *   3. Sigatoka y picudo    — reconocer las dos amenazas clave y su manejo
 *      AGROECOLÓGICO. Cero recetas químicas con dosis inventadas.
 *   4. Cosecha y aprovechamiento — el punto de corte y cómo el pseudotallo y la
 *      hoja vuelven a la tierra (enlaza al mundo del estiércol/compost).
 *
 * CERO invención: todo sale del catálogo/grafo (cycle-content musa_paradisiaca,
 * grafo-relations, sanidadData) vía src/services/platanoBananoData.js. Lo que no
 * tiene respaldo se muestra como "Dato en camino". Fotos reales con licencia CC
 * (autor + licencia + fuente SIEMPRE visibles, ver /public/platano-banano/creditos.json).
 *
 * @param {Object} props
 * @param {() => void} props.onBack
 * @param {(view: string, data?: any) => void} [props.onNavigate]
 */

/* ── Créditos de foto: fuente única en el componente; espejo de
 *    /public/platano-banano/creditos.json. Requisito CC-BY: autor + licencia +
 *    enlace a la fuente, siempre visibles. ──────────────────────────────────── */
const FOTOS = {
  'platanera-mata': { autor: 'Ssemmanda will', licencia: 'CC BY-SA 4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Banana_Plantation_01.jpg', alt: 'Mata de plátano creciendo en el campo, con su pseudotallo verde y hojas grandes.' },
  'racimo-verde': { autor: 'NiferO', licencia: 'CC BY-SA 4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Freshly_Harvested_Green_Banana_and_plantain.jpg', alt: 'Racimo de plátano y banano verde recién cosechado, tipo hartón.' },
  'banano-maduro': { autor: 'Kellychard kariuki', licencia: 'CC BY-SA 4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Ripe_bananas.jpg', alt: 'Mano de banano maduro, de color amarillo, listo para comer.' },
  'colino-siembra': { autor: 'Paul The Writer', licencia: 'CC0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Young_Plantain_Sucker_Growth.jpg', alt: 'Colino o hijuelo de plátano, material para la siembra, brotando junto a la mata.' },
  'mata-sistema-hijos': { autor: 'Otuo-Akyampong Boakye', licencia: 'CC BY-SA 4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Plantain_with_suckers.jpg', alt: 'Mata de plátano con sus hijos o colinos alrededor de la base: madre, hija y nieta.' },
  'cafe-sombra': { autor: 'Kateregga1', licencia: 'CC BY-SA 4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Coffee_and_banana_plantation_in_Uganda.jpg', alt: 'Plátano dando sombra a un cultivo de café, en sistema agroforestal.' },
  'sigatoka-hoja': { autor: 'Plant pests and diseases', licencia: 'CC0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Banana-_Black_leaf_streak_(Black_sigatoka).jpg', alt: 'Hoja de banano con manchas y rayas negras: síntoma de la sigatoka negra.' },
  'picudo-cosmopolites': { autor: 'Obsidian Soul', licencia: 'CC0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Cosmopolites_sordidus,_banana_weevil_(Mindanao,_Philippines)_03.jpg', alt: 'Picudo negro del plátano (Cosmopolites sordidus): el escarabajo adulto de trompa curva.' },
  'pseudotallo-hoja': { autor: 'Louiesemendez', licencia: 'CC BY-SA 4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Banana_leaf_wrapping_of_Suman_Balinghoy.jpg', alt: 'Hoja de plátano usada para envolver comida, como se hace en el campo.' },
};

/* ── Foto real con crédito CC visible. La franja de crédito es opaca para
 *    legibilidad al sol y contraste sobre cualquier imagen; ícono de respaldo
 *    si la imagen no carga. ──────────────────────────────────────────────── */
function Foto({ slug, ratio = 'aspect-[16/10]', className = '', objectPos = 'object-center', FallbackIcon = Leaf }) {
  const c = FOTOS[slug];
  const [ok, setOk] = useState(true);
  if (!c) return null;
  return (
    <figure className={`relative overflow-hidden rounded-xl border border-slate-800 bg-slate-800 ${className}`}>
      {ok ? (
        <img
          src={`/platano-banano/${slug}.jpg`}
          alt={c.alt}
          loading="lazy"
          onError={() => setOk(false)}
          className={`w-full ${ratio} object-cover ${objectPos}`}
        />
      ) : (
        <div className={`w-full ${ratio} flex items-center justify-center bg-slate-800`}>
          <FallbackIcon size={40} className="text-slate-600" aria-hidden="true" />
        </div>
      )}
      <figcaption className="absolute inset-x-0 bottom-0 bg-slate-950/82 px-2 py-1 backdrop-blur-sm">
        <a
          href={c.fuenteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 truncate text-[9px] text-slate-300 underline decoration-slate-600 underline-offset-2"
          title={`${c.autor} · ${c.licencia} · Wikimedia Commons`}
        >
          <Camera size={9} className="shrink-0" aria-hidden="true" />
          <span className="truncate">Foto: {c.autor} · {c.licencia} · Wikimedia</span>
        </a>
      </figcaption>
    </figure>
  );
}

/* ── Ilustración SVG propia: la mata como sistema madre-hijo-nieto. Theme-aware
 *    (usa --t-accent-rgb); el sol "respira" (pb-sun, se apaga con
 *    prefers-reduced-motion). ─────────────────────────────────────────────── */
function MataIlustracion() {
  return (
    <svg
      viewBox="0 0 240 150"
      role="img"
      aria-label="Ilustración de la mata de plátano: la madre grande con su hijo y su nieto al lado, la sucesión que renueva la mata"
      className="w-full h-auto"
    >
      <rect x="0" y="0" width="240" height="150" rx="6" fill="rgb(var(--t-accent-rgb) / 0.08)" />
      {/* Sol */}
      <circle cx="210" cy="26" r="11" fill="#f4b83c" className="pb-sun" />
      <g stroke="#f4b83c" strokeWidth="2" strokeLinecap="round" className="pb-sun">
        <path d="M210 8 V2" /><path d="M230 26 H236" /><path d="M224 12 L228 8" />
      </g>
      {/* Suelo */}
      <rect x="8" y="130" width="224" height="12" rx="3" fill="#6d5236" />
      <path d="M8 130 h224" stroke="#8a6b45" strokeWidth="1.5" />
      {/* Madre (grande, con racimo) */}
      <g>
        <rect x="60" y="52" width="16" height="80" rx="7" fill="#7fae55" />
        <rect x="60" y="52" width="16" height="80" rx="7" fill="none" stroke="#5f8a3e" strokeWidth="1.5" />
        {/* hojas (se mecen con el viento; se apagan con reduced-motion) */}
        <g className="pb-hojas">
          <path d="M68 56 Q40 40 24 52 Q46 54 68 66 Z" fill="#6fa049" />
          <path d="M68 56 Q96 40 112 52 Q90 54 68 66 Z" fill="#7fae55" />
          <path d="M68 60 Q42 66 30 84 Q56 72 68 74 Z" fill="#6fa049" />
          <path d="M68 60 Q94 66 106 84 Q80 72 68 74 Z" fill="#7fae55" />
        </g>
        {/* racimo */}
        <g fill="#cf9a2f">
          <path d="M74 96 q10 2 9 12 q-9 -1 -10 -8 Z" />
          <path d="M75 104 q10 2 9 12 q-9 -1 -10 -8 Z" />
        </g>
        <circle cx="86" cy="122" r="4" fill="#7a4a8a" />
      </g>
      {/* Hijo (mediano) */}
      <g>
        <rect x="96" y="80" width="11" height="52" rx="5" fill="#8fbb60" />
        <g className="pb-hojas pb-hojas-2">
          <path d="M101 84 Q84 74 74 84 Q90 86 101 92 Z" fill="#7fae55" />
          <path d="M101 84 Q118 74 128 84 Q112 86 101 92 Z" fill="#8fbb60" />
        </g>
      </g>
      {/* Nieto (pequeño) */}
      <g>
        <rect x="118" y="104" width="8" height="28" rx="4" fill="#9ac96b" />
        <g className="pb-hojas pb-hojas-3">
          <path d="M122 106 Q110 100 104 106 Q116 108 122 112 Z" fill="#9ac96b" />
          <path d="M122 106 Q134 100 140 106 Q128 108 122 112 Z" fill="#a7d178" />
        </g>
      </g>
      {/* Escudo agroecológico (sin veneno) */}
      <g transform="translate(30 58)">
        <path d="M0 0 L16 -5 L32 0 L32 16 Q32 30 16 37 Q0 30 0 16 Z" fill="rgb(var(--t-accent-rgb) / 0.9)" />
        <path d="M10 16 l4 5 l9 -11" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/* Clases LITERALES por acento (Tailwind JIT no ve strings construidos).
 * rail = barra de acento de las tarjetas; chip = medallón del ícono;
 * hover = borde vivo al pasar el dedo/mouse; borderL = acento lateral. */
const COLOR_MAP = {
  emerald: { text: 'text-emerald-300', border: 'border-emerald-700/50', bg: 'bg-emerald-950/30', rail: 'bg-emerald-400/80', chip: 'bg-emerald-400/15 border-emerald-500/40', hover: 'hover:border-emerald-500/80', borderL: 'border-l-emerald-400/60' },
  lime: { text: 'text-lime-300', border: 'border-lime-700/50', bg: 'bg-lime-950/30', rail: 'bg-lime-400/80', chip: 'bg-lime-400/15 border-lime-500/40', hover: 'hover:border-lime-500/80', borderL: 'border-l-lime-400/60' },
  amber: { text: 'text-amber-300', border: 'border-amber-700/50', bg: 'bg-amber-950/30', rail: 'bg-amber-400/80', chip: 'bg-amber-400/15 border-amber-500/40', hover: 'hover:border-amber-500/80', borderL: 'border-l-amber-400/60' },
  sky: { text: 'text-sky-300', border: 'border-sky-700/50', bg: 'bg-sky-950/30', rail: 'bg-sky-400/80', chip: 'bg-sky-400/15 border-sky-500/40', hover: 'hover:border-sky-500/80', borderL: 'border-l-sky-400/60' },
  rose: { text: 'text-rose-300', border: 'border-rose-700/50', bg: 'bg-rose-950/30', rail: 'bg-rose-400/80', chip: 'bg-rose-400/15 border-rose-500/40', hover: 'hover:border-rose-500/80', borderL: 'border-l-rose-400/60' },
  slate: { text: 'text-slate-300', border: 'border-slate-700/50', bg: 'bg-slate-900/50', rail: 'bg-slate-400/80', chip: 'bg-slate-400/15 border-slate-500/40', hover: 'hover:border-slate-500/80', borderL: 'border-l-slate-400/60' },
};

const cleanNum = (raw) => raw.replace(',', '.').replace(/[^0-9.]/g, '');
const VERDAD_ICON = { sprout: Sprout, copy: Copy, refresh: RefreshCw };
const APROV_ICON = { recycle: Recycle, leaf: Leaf, sprout: Sprout };

/* ═══════════════════════════════ Componente ═══════════════════════════════ */
export default function PlatanoBananoScreen({ onBack, onNavigate }) {
  const [pilar, setPilar] = useState('hub'); // hub | variedades | siembra | amenazas | cosecha

  const volver = () => {
    if (pilar === 'hub') { onBack?.(); return; }
    setPilar('hub');
  };

  const subtitulo = pilar === 'hub' ? 'El pancoger que nunca falta en la finca.'
    : pilar === 'variedades' ? 'Variedades y la mata como sistema'
    : pilar === 'siembra' ? 'Siembra, sombra y compañía'
    : pilar === 'amenazas' ? 'Sigatoka y picudo: reconocer y manejar'
    : 'Cosecha y aprovechamiento';

  return (
    <div className="min-h-[100dvh] text-white">
      <header className="flex items-center gap-2.5 px-4 pt-[calc(14px+env(safe-area-inset-top))] pb-2">
        <button
          type="button"
          onClick={volver}
          aria-label="Volver"
          className="pb-focus w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center shrink-0 transition-colors motion-reduce:transition-none"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="pb-display text-xl font-bold leading-tight text-white">Plátano y banano</h1>
          <p className="text-xs text-slate-400 leading-tight truncate">{subtitulo}</p>
        </div>
      </header>

      {/* key={pilar}: re-monta el contenedor y dispara la transición pb-view */}
      <div key={pilar} className="pb-view px-4 pb-10">
        {pilar === 'hub' && <Hub onIr={setPilar} onNavigate={onNavigate} />}
        {pilar === 'variedades' && <PilarVariedades />}
        {pilar === 'siembra' && <PilarSiembra />}
        {pilar === 'amenazas' && <PilarAmenazas onNavigate={onNavigate} />}
        {pilar === 'cosecha' && <PilarCosecha onNavigate={onNavigate} />}
      </div>
    </div>
  );
}

/* ─────────────────────────────────── Hub ─────────────────────────────────── */
function Hub({ onIr, onNavigate }) {
  const pilares = [
    { key: 'variedades', icon: Sprout, foto: 'banano-maduro', titulo: 'Variedades y la mata', desc: 'Hartón, dominico, cachaco, topocho y banano. Y por qué la mata es una hierba gigante que se renueva sola.', accent: 'lime' },
    { key: 'siembra', icon: Ruler, foto: 'colino-siembra', titulo: 'Siembra y compañía', desc: 'Colino o cormo, hoyo y distancias (con calculadora), sombra para el café y el cacao, y el hambre de potasio.', accent: 'emerald' },
    { key: 'amenazas', icon: Bug, foto: 'sigatoka-hoja', titulo: 'Sigatoka y picudo', desc: 'Las dos amenazas clave: cómo reconocerlas y manejarlas sin veneno.', accent: 'rose' },
    { key: 'cosecha', icon: Recycle, foto: 'pseudotallo-hoja', titulo: 'Cosecha y aprovechamiento', desc: 'El punto de corte, y cómo el pseudotallo y la hoja vuelven a la tierra como abono.', accent: 'amber' },
  ];
  const heroCred = FOTOS['cafe-sombra'];
  return (
    <div className="flex flex-col gap-4">
      {/* Gancho — la postal del platanal: el platanal verde y frondoso de hero
          (cafe-sombra es la foto más viva del set), título sobre la foto y
          crédito CC siempre visible (píldora arriba) */}
      <section className="pb-rise rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden" style={{ '--pb-d': '0ms' }}>
        <div className="relative overflow-hidden border-b border-slate-800">
          <img
            src="/platano-banano/cafe-sombra.jpg"
            alt={heroCred.alt}
            className="pb-hero-img w-full aspect-[4/3] sm:aspect-[16/9] object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-slate-950/10" aria-hidden="true" />
          <a
            href={heroCred.fuenteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="pb-focus absolute top-2 right-2 flex items-center gap-1 rounded-full bg-slate-950/70 px-2 py-1 text-[9px] text-slate-300 backdrop-blur-sm"
            title={`${heroCred.autor} · ${heroCred.licencia} · Wikimedia Commons`}
          >
            <Camera size={9} className="shrink-0" aria-hidden="true" />
            <span>Foto: {heroCred.autor} · {heroCred.licencia}</span>
          </a>
          <div className="absolute inset-x-0 bottom-0 px-4 pb-3.5">
            <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-lime-300/90">El pancoger de la finca</p>
            <p className="pb-display mt-0.5 text-2xl font-bold text-white leading-tight [text-shadow:0_1px_10px_rgb(2_6_23/0.7)]">
              {GANCHO_PLATANO.titulo}
            </p>
          </div>
        </div>
        <div className="px-4 pt-3 pb-4">
          <p className="text-sm text-slate-200 leading-relaxed">{GANCHO_PLATANO.cuerpo}</p>
          <p className="mt-2 text-[11px] text-slate-500">Fuente: {GANCHO_PLATANO.fuente} · confianza {GANCHO_PLATANO.confianza}.</p>
        </div>
      </section>

      {/* Las tres verdades de la mata — legibles de un vistazo */}
      <div className="grid grid-cols-3 gap-2">
        {TRES_VERDADES.map((v, i) => {
          const c = COLOR_MAP[v.accent];
          const Icon = VERDAD_ICON[v.icon] || Sprout;
          return (
            <div key={v.titulo} className={`pb-rise rounded-xl border ${c.border} ${c.bg} p-2.5 text-center`} style={{ '--pb-d': `${90 + i * 70}ms` }}>
              <span className={`mx-auto w-9 h-9 rounded-full border ${c.chip} flex items-center justify-center`}>
                <Icon size={18} className={c.text} aria-hidden="true" />
              </span>
              <p className="pb-display mt-1.5 text-sm font-bold text-white leading-tight">{v.titulo}</p>
              <p className="mt-0.5 text-[11px] text-slate-300 leading-snug">{v.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Cuatro pilares, cada uno con su foto real y su riel de acento */}
      <div className="flex flex-col gap-3">
        {pilares.map((p, i) => {
          const c = COLOR_MAP[p.accent];
          const Icono = p.icon;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onIr(p.key)}
              className={`pb-rise pb-card pb-focus relative text-left rounded-2xl border ${c.border} ${c.hover} ${c.bg} p-3 pl-4 flex items-center gap-3`}
              style={{ '--pb-d': `${320 + i * 80}ms` }}
            >
              <span className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${c.rail}`} aria-hidden="true" />
              <span className="pb-thumb relative w-[72px] h-[72px] rounded-xl overflow-hidden shrink-0 border border-slate-800">
                <img src={`/platano-banano/${p.foto}.jpg`} alt="" aria-hidden="true" loading="lazy" className="w-full h-full object-cover" />
                <span className="absolute inset-0 flex items-center justify-center bg-slate-950/40">
                  <Icono size={20} className="text-white drop-shadow" />
                </span>
              </span>
              <span className="flex-1 min-w-0">
                <span className="pb-display block text-base font-bold text-white leading-tight">{p.titulo}</span>
                <span className="block text-[13px] text-slate-300 mt-0.5 leading-snug">{p.desc}</span>
              </span>
              <ChevronRight size={20} className={`pb-chev shrink-0 ${c.text}`} />
            </button>
          );
        })}
      </div>

      {/* Puentes honestos: enlaza a lo que ya existe en Chagra */}
      {onNavigate ? (
        <div className="pb-rise rounded-xl border border-slate-800 bg-slate-900/50 p-3" style={{ '--pb-d': '640ms' }}>
          <p className="text-xs uppercase tracking-[0.14em] font-bold text-slate-400 mb-2">También en Chagra</p>
          <div className="flex flex-col gap-2">
            <PuenteBoton
              icon={Bug}
              titulo="Mi mata está enferma"
              sub="Diga qué le ve ('rayas', 'se cae') y sepa qué es y cómo manejarla sin veneno."
              onClick={() => onNavigate('sanidad_sintoma')}
            />
            <PuenteBoton
              icon={Recycle}
              titulo="Del corral al abono"
              sub="Junte el pseudotallo picado con el estiércol y sáquele abono para el mismo platanal."
              onClick={() => onNavigate('estiercol')}
            />
            <PuenteBoton
              icon={Sprout}
              titulo="Pregúntele al agente"
              sub="Cómo sembrar, deshijar o manejar la sigatoka en su clima."
              onClick={() => onNavigate('agente', { prompt: '¿Cómo siembro y cuido mi platanal para que dé buen racimo?' })}
            />
          </div>
        </div>
      ) : null}

      <CreditosFotos />
    </div>
  );
}

function PuenteBoton({ icon, titulo, sub, onClick }) {
  const Icon = icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="pb-card pb-focus w-full text-left rounded-xl border border-slate-700/60 bg-slate-800/40 p-3 flex items-center gap-3 hover:border-slate-500"
    >
      <span
        className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center border"
        style={{ color: 'rgb(var(--t-accent-rgb))', backgroundColor: 'rgb(var(--t-accent-rgb) / 0.12)', borderColor: 'rgb(var(--t-accent-rgb) / 0.35)' }}
      >
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold text-slate-100 leading-tight">{titulo}</span>
        <span className="block text-xs text-slate-400 leading-snug">{sub}</span>
      </span>
      <ChevronRight size={18} className="pb-chev text-slate-400 shrink-0" />
    </button>
  );
}

/* Créditos de las fotos (todas licencia abierta), colapsable al pie. */
function CreditosFotos() {
  return (
    <details className="pb-rise rounded-xl border border-slate-800 bg-slate-900/40 p-3" style={{ '--pb-d': '720ms' }}>
      <summary className="pb-focus text-xs font-bold text-slate-300 cursor-pointer flex items-center gap-1.5 rounded">
        <Camera size={13} aria-hidden="true" /> Créditos de las fotos (licencia abierta)
      </summary>
      <ul className="mt-2 flex flex-col gap-1.5">
        {Object.entries(FOTOS).map(([slug, c]) => (
          <li key={slug} className="text-[11px] text-slate-400 leading-snug">
            <a href={c.fuenteUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-slate-600 underline-offset-2">
              {c.autor} · {c.licencia}
            </a>{' '}· Wikimedia Commons
          </li>
        ))}
      </ul>
    </details>
  );
}

/* ─────────────────── Pilar 1 — Variedades y la mata ─────────────────── */
function PilarVariedades() {
  return (
    <div className="flex flex-col gap-5">
      {/* Firma del módulo: la mata como sistema (SVG madre-hijo-nieto) */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="p-4 pb-2"><MataIlustracion /></div>
        <p className="px-4 pb-4 text-sm text-slate-300 leading-relaxed">
          El plátano es una <span className="font-semibold text-slate-100">hierba gigante</span>, no un árbol: el
          "tronco" es un <span className="font-semibold text-slate-100">pseudotallo</span> de hojas enrolladas. Y la mata
          es un sistema: la madre, su hijo y su nieto se van relevando en el mismo sitio.
        </p>
      </section>

      {/* Variedades */}
      <section>
        <h2 className="text-xs uppercase tracking-[0.14em] font-bold text-slate-400 mb-2 flex items-center gap-2">
          <Sprout size={15} /> Las variedades de la finca
        </h2>
        <div className="flex flex-col gap-3">
          {VARIEDADES.map((v) => (
            <article key={v.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
              <Foto slug={v.foto} ratio="aspect-[16/9]" className="rounded-none border-0 border-b border-slate-800" />
              <div className="p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="pb-display text-base font-bold text-slate-100">{v.nombre}</h3>
                  <span className="text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">{v.grupo}</span>
                </div>
                <p className="text-sm text-slate-300 mt-1.5 leading-snug"><span className="font-semibold text-slate-100">Dónde:</span> {v.donde}</p>
                <p className="text-sm text-slate-300 mt-1 leading-snug">{v.como}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* La sucesión madre-hijo-nieto */}
      <section>
        <h2 className="text-xs uppercase tracking-[0.14em] font-bold text-slate-400 mb-2 flex items-center gap-2">
          <RefreshCw size={15} /> La mata como sistema: madre, hijo, nieto
        </h2>
        <Foto slug="mata-sistema-hijos" ratio="aspect-[16/10]" className="mb-3" objectPos="object-center" />
        <div className="grid grid-cols-3 gap-2">
          {SUCESION.map((s, i) => (
            <div key={s.rol} className="relative rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-2.5 text-center">
              {/* la generación decrece: la madre grande, el nieto pequeño */}
              <div className={i === 0 ? 'text-3xl' : i === 1 ? 'text-2xl' : 'text-xl'} aria-hidden="true">{s.emoji}</div>
              <p className="pb-display mt-1 text-sm font-bold text-emerald-200">{s.rol}</p>
              <p className="mt-0.5 text-[11px] text-emerald-100/80 leading-snug">{s.desc}</p>
              {i < SUCESION.length - 1 ? (
                <ChevronRight size={14} className="absolute top-1/2 -right-[11px] -translate-y-1/2 text-emerald-500/70 z-10" aria-hidden="true" />
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {/* El deshije */}
      <section className="rounded-2xl border border-lime-800/40 bg-lime-950/20 p-4">
        <div className="flex items-center gap-2">
          <Scissors size={18} className="text-lime-300 shrink-0" />
          <h3 className="pb-display text-base font-bold text-lime-200">El deshije: {DESHIJE.regla.toLowerCase()}</h3>
        </div>
        <p className="text-sm text-lime-100/90 mt-2 leading-relaxed">{DESHIJE.cuerpo}</p>
        <ul className="mt-3 flex flex-col gap-1.5 text-sm text-lime-100/90">
          {DESHIJE.pasos.map((p) => (
            <li key={p} className="flex items-start gap-2"><span className="text-lime-400 mt-0.5" aria-hidden="true">•</span><span className="leading-snug">{p}</span></li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-lime-200/70">Fuente: {DESHIJE.fuente} · confianza {DESHIJE.confianza}.</p>
      </section>
    </div>
  );
}

/* ─────────────────── Pilar 2 — Siembra y compañía ─────────────────── */
function PilarSiembra() {
  return (
    <div className="flex flex-col gap-5">
      {/* Material de siembra */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <Foto slug="colino-siembra" ratio="aspect-[16/9]" className="rounded-none border-0 border-b border-slate-800" />
        <div className="p-4">
          <h2 className="pb-display text-base font-bold text-slate-100 flex items-center gap-2"><Sprout size={16} /> Con qué se siembra</h2>
          <div className="mt-2 flex flex-col gap-2.5">
            {SIEMBRA.material.map((m) => (
              <div key={m.id} className="rounded-lg bg-slate-800/40 border border-slate-700/50 p-2.5">
                <p className="text-sm font-bold text-slate-100">{m.titulo}</p>
                <p className="text-sm text-slate-300 mt-0.5 leading-snug">{m.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg bg-slate-800/40 border border-slate-700/50 p-2.5">
            <p className="text-sm text-slate-200 leading-snug"><span className="font-bold">El hoyo:</span> {SIEMBRA.hoyo}</p>
          </div>
          <div className="mt-2 rounded-lg border border-amber-800/40 bg-amber-950/20 p-2.5 flex items-start gap-2">
            <ShieldCheck size={15} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-100/90 leading-snug"><span className="font-bold">Sanidad desde el colino:</span> {SIEMBRA.sanidad}</p>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Fuente: {SIEMBRA.fuente} · confianza {SIEMBRA.confianza}.</p>
        </div>
      </section>

      {/* Calculadora de densidad + distancias */}
      <CalculadoraDensidad />

      {/* Sombra y asociación */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <Foto slug="cafe-sombra" ratio="aspect-[16/9]" className="rounded-none border-0 border-b border-slate-800" FallbackIcon={Trees} />
        <div className="p-4">
          <h2 className="pb-display text-base font-bold text-slate-100 flex items-center gap-2"><Trees size={16} /> El paraguas de la finca</h2>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">{ASOCIACION.intro}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {ASOCIACION.companeras.map((co) => (
              <div key={co.nombre} className="rounded-lg border border-slate-700/50 bg-slate-800/40 p-2.5">
                <p className="text-sm font-bold text-slate-100"><span aria-hidden="true">{co.emoji}</span> {co.nombre}</p>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{co.desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-2.5 text-[11px] text-slate-500">Fuente: {ASOCIACION.fuente} · confianza {ASOCIACION.confianza}.</p>
        </div>
      </section>

      {/* Nutrición: potasio */}
      <section className="rounded-2xl border border-amber-800/40 bg-amber-950/20 p-4">
        <div className="flex items-center gap-2">
          <Droplets size={18} className="text-amber-300 shrink-0" />
          <h3 className="pb-display text-base font-bold text-amber-200">{NUTRICION_K.titulo}</h3>
        </div>
        <p className="text-sm text-amber-100/90 mt-2 leading-relaxed">{NUTRICION_K.cuerpo}</p>
        <div className="mt-3 flex flex-col gap-2">
          {NUTRICION_K.fuentesAgro.map((f) => (
            <div key={f.nombre} className="rounded-lg border border-amber-800/30 bg-amber-950/10 p-2.5">
              <p className="text-sm font-bold text-amber-100">{f.nombre}</p>
              <p className="text-[11px] text-amber-100/80 mt-0.5 leading-snug">{f.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-2.5 rounded-lg border border-amber-800/40 bg-amber-950/20 p-2.5 flex items-start gap-2">
          <Info size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-100/90 leading-snug">{NUTRICION_K.nota}</p>
        </div>
        <p className="mt-2 text-[11px] text-amber-200/70">Fuente: {NUTRICION_K.fuente} · confianza {NUTRICION_K.confianza}.</p>
      </section>
    </div>
  );
}

function CalculadoraDensidad() {
  const [dp, setDp] = useState('3');
  const [ds, setDs] = useState('3');
  const res = useMemo(() => calcularDensidadSiembra(dp, ds), [dp, ds]);

  return (
    <section className="rounded-2xl border border-emerald-800/40 bg-emerald-950/20 p-4">
      <div className="flex items-center gap-2">
        <Ruler size={20} className="text-emerald-300 shrink-0" />
        <h3 className="pb-display text-base font-bold text-emerald-200">¿Cuántas matas caben en una hectárea?</h3>
      </div>
      <p className="text-sm text-emerald-100/90 mt-2 leading-relaxed">
        Escriba la distancia entre matas y entre surcos. Le decimos cuántas matas le caben en una hectárea (10.000 m²).
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="pb-dp" className="block text-xs uppercase tracking-wide font-bold text-emerald-200/80 mb-1">Entre matas (m)</label>
          <input
            id="pb-dp"
            type="text"
            inputMode="decimal"
            value={dp}
            onChange={(e) => setDp(cleanNum(e.target.value))}
            placeholder="ej. 3"
            aria-label="Distancia entre matas en metros"
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-2 text-sm text-white placeholder:text-slate-500 transition-colors motion-reduce:transition-none focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
          />
        </div>
        <div>
          <label htmlFor="pb-ds" className="block text-xs uppercase tracking-wide font-bold text-emerald-200/80 mb-1">Entre surcos (m)</label>
          <input
            id="pb-ds"
            type="text"
            inputMode="decimal"
            value={ds}
            onChange={(e) => setDs(cleanNum(e.target.value))}
            placeholder="ej. 3"
            aria-label="Distancia entre surcos en metros"
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-2 text-sm text-white placeholder:text-slate-500 transition-colors motion-reduce:transition-none focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
          />
        </div>
      </div>

      {res ? (
        <div className="mt-3 rounded-xl border border-emerald-700/50 bg-emerald-950/40 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-300 shrink-0" />
            <p className="text-sm font-bold text-emerald-200">Le caben aproximadamente</p>
          </div>
          {/* key={matasPorHa}: el número "aterriza" cada vez que cambia */}
          <p className="pb-display text-4xl font-black text-white mt-2 leading-none tabular-nums">
            <span key={res.matasPorHa} className="pb-pop">{res.matasPorHa.toLocaleString('es-CO')}</span>
            <span className="text-lg font-bold text-slate-300"> matas / ha</span>
          </p>
          <p className="text-xs text-emerald-100/80 mt-2">Cada mata ocupa {res.area} m². Cálculo exacto: 10.000 ÷ ({dp} × {ds}).</p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-emerald-100/70 text-center py-2">Escriba las dos distancias para calcular.</p>
      )}

      {/* Distancias de referencia grounded; la activa se marca con el acento */}
      <div className="mt-3 flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.14em] font-bold text-emerald-200/70">Distancias de referencia</p>
        {DISTANCIAS_REFERENCIA.map((d) => {
          const activa = Number(dp) === d.entrePlantas && Number(ds) === d.entreSurcos;
          return (
            <button
              key={d.etiqueta}
              type="button"
              aria-pressed={activa}
              onClick={() => { setDp(String(d.entrePlantas)); setDs(String(d.entreSurcos)); }}
              className={`pb-card pb-focus w-full text-left rounded-lg border p-2.5 flex items-center gap-2.5 ${activa ? 'border-emerald-500/70 bg-emerald-900/40' : 'border-emerald-800/30 bg-emerald-950/10 hover:border-emerald-700/60'}`}
            >
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-emerald-100">{d.etiqueta}</span>
                <span className="block text-[11px] text-emerald-100/70 mt-0.5 leading-snug">{d.nota}</span>
              </span>
              {activa ? <CheckCircle2 size={16} className="text-emerald-300 shrink-0" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-emerald-200/70">Distancias grounded a Agrosavia (3×3 a 4×4 m según variedad). La geometría es exacta.</p>
    </section>
  );
}

/* ─────────────────── Pilar 3 — Sigatoka y picudo ─────────────────── */
function PilarAmenazas({ onNavigate }) {
  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
        <p className="text-sm text-slate-300 leading-relaxed">
          Dos amenazas se llevan la mayoría de los platanales: la <span className="font-semibold text-slate-100">sigatoka</span> ataca la hoja
          y le baja el racimo; el <span className="font-semibold text-slate-100">picudo</span> ataca el cormo y tumba la mata. A las dos se les
          hace frente <span className="font-semibold text-slate-100">sin veneno</span>: reconocerlas a tiempo y manejar bien la mata.
        </p>
      </section>

      <AmenazaCard data={SIGATOKA} accent="amber" />
      <AmenazaCard data={PICUDO} accent="rose" />

      {onNavigate ? (
        <PuenteBoton
          icon={Bug}
          titulo="Diagnostique su mata"
          sub="Diga el síntoma que le ve y el motor de sanidad le dice qué es y cómo manejarlo."
          onClick={() => onNavigate('sanidad_sintoma')}
        />
      ) : null}
    </div>
  );
}

function AmenazaCard({ data, accent }) {
  const c = COLOR_MAP[accent] || COLOR_MAP.rose;
  return (
    <section className={`relative rounded-2xl border ${c.border} bg-slate-900/60 overflow-hidden`}>
      {/* riel de acento: el color de la amenaza acompaña toda la tarjeta */}
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${c.rail} z-10`} aria-hidden="true" />
      <Foto slug={data.foto} ratio="aspect-[16/9]" className="rounded-none border-0 border-b border-slate-800" FallbackIcon={Bug} />
      <div className="p-4 pl-5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`w-8 h-8 rounded-full border ${c.chip} flex items-center justify-center shrink-0`}>
            <Bug size={15} className={c.text} aria-hidden="true" />
          </span>
          <h3 className="pb-display text-base font-bold text-white">{data.nombre}</h3>
          <span className={`text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded-full bg-slate-800 ${c.text} border border-slate-700`}>{data.tipo}</span>
        </div>
        <p className="text-xs italic text-slate-400 mt-1">{data.cientifico}</p>

        <p className="mt-3 text-xs uppercase tracking-[0.14em] font-bold text-slate-400">Cómo reconocerla</p>
        <ul className="mt-1.5 flex flex-col gap-1.5">
          {data.reconocer.map((r) => (
            <li key={r} className="flex items-start gap-2 text-sm text-slate-300"><span className={`${c.text} mt-0.5 font-bold`} aria-hidden="true">✓</span><span className="leading-snug">{r}</span></li>
          ))}
        </ul>

        <p className="mt-3 text-xs uppercase tracking-[0.14em] font-bold text-slate-400">Manejo agroecológico</p>
        <div className="mt-1.5 flex flex-col gap-2">
          {data.manejo.map((m) => (
            <div key={m.titulo} className={`rounded-lg border border-slate-700/50 border-l-2 ${c.borderL} bg-slate-800/40 p-2.5`}>
              <p className="text-sm font-bold text-slate-100">{m.titulo}</p>
              <p className="text-[13px] text-slate-300 mt-0.5 leading-snug">{m.desc}</p>
            </div>
          ))}
        </div>

        {/* Biocontrol groundeado al grafo — sin dosis inventadas */}
        <div className="mt-3 rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-2.5 flex items-start gap-2">
          <ShieldCheck size={15} className="text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-[13px] text-emerald-100/90 leading-snug">{data.biocontrol}</p>
        </div>
        {data.biocontrolPendiente ? (
          <div className="mt-2 rounded-lg border border-amber-800/40 bg-amber-950/20 p-2.5 flex items-start gap-2">
            <Info size={15} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-100/90 leading-snug"><span className="font-bold">Dato en camino:</span> {data.biocontrolPendiente}</p>
          </div>
        ) : null}

        <p className="mt-2 text-[11px] text-slate-500">Fuente: {data.fuente} · confianza {data.confianza}.</p>
      </div>
    </section>
  );
}

/* ─────────────────── Pilar 4 — Cosecha y aprovechamiento ─────────────────── */
function PilarCosecha({ onNavigate }) {
  return (
    <div className="flex flex-col gap-5">
      {/* El punto de corte */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <Foto slug="racimo-verde" ratio="aspect-[16/9]" className="rounded-none border-0 border-b border-slate-800" FallbackIcon={Wheat} />
        <div className="p-4">
          <h2 className="pb-display text-base font-bold text-slate-100 flex items-center gap-2"><Wheat size={16} /> {COSECHA.titulo}</h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {COSECHA.senales.map((s) => (
              <li key={s} className="flex items-start gap-2 text-sm text-slate-300"><span className="text-emerald-400 mt-0.5" aria-hidden="true">•</span><span className="leading-snug">{s}</span></li>
            ))}
          </ul>
          <div className="mt-3 rounded-lg bg-slate-800/40 border border-slate-700/50 p-2.5">
            <p className="text-sm text-slate-200 leading-snug"><span className="font-bold">Después de cortar:</span> {COSECHA.tras}</p>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Fuente: {COSECHA.fuente} · confianza {COSECHA.confianza}.</p>
        </div>
      </section>

      {/* Aprovechamiento del pseudotallo y la hoja */}
      <section>
        <h2 className="text-xs uppercase tracking-[0.14em] font-bold text-slate-400 mb-2 flex items-center gap-2">
          <Recycle size={15} /> Nada se bota: el pseudotallo y la hoja
        </h2>
        <Foto slug="pseudotallo-hoja" ratio="aspect-[16/10]" className="mb-3" FallbackIcon={Leaf} />
        <div className="flex flex-col gap-3">
          {APROVECHAMIENTO.map((a) => {
            const Icon = APROV_ICON[a.icon] || Recycle;
            return (
              <article key={a.id} className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-3">
                <div className="flex items-center gap-2">
                  <Icon size={16} className="text-emerald-300 shrink-0" />
                  <h3 className="text-sm font-bold text-emerald-100">{a.titulo}</h3>
                </div>
                <p className="text-sm text-emerald-100/85 mt-1 leading-snug">{a.desc}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Puente al mundo del estiércol/compost — cerrar el ciclo del potasio */}
      {onNavigate ? (
        <div className="flex flex-col gap-2">
          <PuenteBoton
            icon={Recycle}
            titulo="Del corral al abono"
            sub="Lleve el pseudotallo picado a la compostera con el estiércol: vuelve al platanal como abono rico en potasio."
            onClick={() => onNavigate('estiercol')}
          />
          <PuenteBoton
            icon={Wheat}
            titulo="Poscosecha y despensa"
            sub="Cómo madurar, guardar y transformar el plátano y el banano sin que se dañe."
            onClick={() => onNavigate('poscosecha')}
          />
        </div>
      ) : null}
    </div>
  );
}
