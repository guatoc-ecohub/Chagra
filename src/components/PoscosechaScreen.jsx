/* i18n (ADR-050): etiquetas user-facing en español Colombia pendientes de
 * migrar a src/config/messages.js. Misma deuda preexistente que SaludSueloScreen
 * y App.jsx; se desactiva la regla soft a nivel de archivo. */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import { useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Info, AlertTriangle, CheckCircle2,
  Scissors, Warehouse, FlaskConical, Sun, Snowflake, Droplets, Wind,
  Sprout, ShieldCheck, Bug, Skull, Thermometer, Camera,
} from 'lucide-react';
import {
  GRANOS,
  calcularSecadoGrano,
  evaluarMateriaSecaAguacate,
  AGUACATE_MS_MINIMO_NORMA,
  CURADO,
  DANIO_POR_FRIO,
  TRANSFORMACIONES,
  PERDIDA_PAIS,
  INDICES_MADUREZ,
  PLAGAS_ALMACEN,
  MICOTOXINAS,
  MICOTOXINAS_ADVERTENCIA,
  CADENA_FRIO,
  CAMARA_EVAPORATIVA_VIDA,
  CAMARA_EVAPORATIVA_NOTA,
  CAMARA_EVAPORATIVA_FUENTE,
} from '../services/poscosechaCalculator';

/**
 * PoscosechaScreen — mini-app "Poscosecha y Despensa" (mundo Mercado y despensa).
 *
 * Identidad: cuaderno de campo con FOTOS REALES de dominio abierto (Wikimedia
 * Commons, CC/dominio público), cálida, campesina y legible al sol.
 *
 * Gancho: Colombia pierde ~1 de cada 3 productos entre la mata y la venta, y la
 * mayor parte se evita SIN plata. Cuatro pilares, cada uno con su foto:
 *   1. Cosechar en punto — índices de madurez (aguacate por materia seca, uchuva
 *      por capacho, climatéricos firmes).
 *   2. Enfriar y curar    — cadena de frío casera (cámara evaporativa / olla de
 *      barro), daño por frío en tropicales y las dos recetas OPUESTAS de curado.
 *   3. Secar y guardar    — calculadora determinista de secado de grano, plagas
 *      de bodega (control físico) y MICOTOXINAS (peligro de salud bien avisado).
 *   4. Transformar         — deshidratados, mermeladas, harinas, panela, queso,
 *      café — cada uno con su punto crítico de inocuidad.
 *
 * CERO invención: cifras y textos salen de poscosechaCalculator.js (grounded al
 * DR nacional/internacional 2026-07-04). La matemática del secado es balance de
 * masa exacto. Las fotos citan autor + licencia + fuente (ver
 * /public/poscosecha/creditos.json).
 *
 * Accesibilidad / sol: TODO el texto usa tokens theme-aware; los créditos de
 * foto van sobre una franja opaca (bg-slate-950/82) para pasar contraste sobre
 * cualquier imagen. Las transiciones se apagan con prefers-reduced-motion.
 */

/* ── Créditos de foto (fuente única en el componente; espejo de
 *    /public/poscosecha/creditos.json). Requisito de las licencias CC-BY:
 *    autor + licencia + enlace a la fuente, siempre visibles. ──────────────── */
const FOTOS = {
  'cosecha-aguacate': { autor: 'Kekiwiyi', licencia: 'CC BY-SA 4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Avocado_harvest_01.jpg', alt: 'Mano sosteniendo aguacates verdes recién cosechados.' },
  'cosecha-uchuva': { autor: 'Ivar Leidus', licencia: 'CC BY-SA 4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Physalis_peruviana_calix_open_close-up.jpg', alt: 'Uchuva con el capacho (cáliz) abierto mostrando el fruto naranja.' },
  'cosecha-platano': { autor: 'Henry Doe', licencia: 'CC0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Green_Plantains_(Unsplash).jpg', alt: 'Racimo de plátanos verdes, firmes.' },
  'secado-maiz': { autor: 'Cut angles', licencia: 'CC BY-SA 4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Maize_drying.jpg', alt: 'Grano de maíz secándose al sol.' },
  'secado-cafe': { autor: 'JPDAFT', licencia: 'CC0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:%22Helda%22_for_drying_coffee_in_Colombia.jpg', alt: 'Café en pergamino secándose al sol en un patio de una finca colombiana.' },
  'plaga-gorgojo': { autor: 'Natasha Wright, Bugwood.org', licencia: 'CC BY 3.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Maize_Weevil_-_Sitophilus_zeamais.jpg', alt: 'Gorgojo del maíz (Sitophilus zeamais) visto de cerca.' },
  'moho-maiz': { autor: 'UIUC', licencia: 'CC BY-SA 3.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Corn_mold.jpg', alt: 'Mazorca de maíz con moho: donde crece el hongo de la aflatoxina.' },
  'diatomeas': { autor: 'SprocketRocket', licencia: 'CC0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Diatomaceous_Earth.jpg', alt: 'Tierra de diatomeas: polvo mineral blanco para control físico de plagas.' },
  'frio-olla': { autor: 'Peter Rinker', licencia: 'CC BY-SA 3.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Tonkrugk%C3%BChler,_Clay_pot_cooler,_Canari_Frigo.JPG', alt: 'Olla de barro con verduras frescas: nevera evaporativa sin electricidad.' },
  'curado-yuca': { autor: 'Denis kasozi', licencia: 'CC BY-SA 4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Harvested_cassava_roots_03.jpg', alt: 'Raíces de yuca recién cosechadas listas para curar.' },
};

/* ── Foto real con crédito CC visible. La franja de crédito es opaca para
 *    legibilidad al sol y contraste sobre cualquier imagen. ────────────────── */
function Foto({ slug, ratio = 'aspect-[16/10]', className = '', objectPos = 'object-center' }) {
  const c = FOTOS[slug];
  if (!c) return null;
  return (
    <figure className={`relative overflow-hidden rounded-xl border border-slate-800 bg-slate-800 ${className}`}>
      <img
        src={`/poscosecha/${slug}.jpg`}
        alt={c.alt}
        loading="lazy"
        className={`w-full ${ratio} object-cover ${objectPos}`}
      />
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

/* Clases LITERALES por acento (Tailwind JIT no ve strings construidos). El
 * TEXTO de acento va sobre superficies oscuras; en temas claros los tokens
 * -300 se remapean a tinta legible por tailwind.config. */
const COLOR_MAP = {
  emerald: { text: 'text-emerald-300', border: 'border-emerald-700/50', bg: 'bg-emerald-950/30', dot: 'bg-emerald-400' },
  lime: { text: 'text-lime-300', border: 'border-lime-700/50', bg: 'bg-lime-950/30', dot: 'bg-lime-400' },
  amber: { text: 'text-amber-300', border: 'border-amber-700/50', bg: 'bg-amber-950/30', dot: 'bg-amber-400' },
  sky: { text: 'text-sky-300', border: 'border-sky-700/50', bg: 'bg-sky-950/30', dot: 'bg-sky-400' },
  rose: { text: 'text-rose-300', border: 'border-rose-700/50', bg: 'bg-rose-950/30', dot: 'bg-rose-400' },
  slate: { text: 'text-slate-300', border: 'border-slate-700/50', bg: 'bg-slate-900/50', dot: 'bg-slate-500' },
};

/* ═══════════════════════════════ Componente ═══════════════════════════════ */
/**
 * @param {Object} props
 * @param {() => void} props.onBack
 * @param {(view: string, data?: any) => void} [props.onNavigate]
 */
export default function PoscosechaScreen({ onBack, onNavigate }) {
  const [pilar, setPilar] = useState('hub'); // hub | cosecha | frescos | guardar | transformar

  const volver = () => {
    if (pilar === 'hub') { onBack?.(); return; }
    setPilar('hub');
  };

  const subtitulo = pilar === 'hub' ? 'Cosechar en punto, enfriar, guardar y transformar.'
    : pilar === 'cosecha' ? 'Cosechar en el punto'
    : pilar === 'frescos' ? 'Enfriar y curar los frescos'
    : pilar === 'guardar' ? 'Secar y guardar el grano'
    : 'Transformar el excedente';

  return (
    <div className="min-h-[100dvh] text-white">
      <header className="flex items-center gap-2 px-4 pt-[calc(14px+env(safe-area-inset-top))] pb-2">
        <button
          type="button"
          onClick={volver}
          aria-label="Volver"
          className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center shrink-0 transition-colors motion-reduce:transition-none"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold leading-tight text-white">Poscosecha y Despensa</h1>
          <p className="text-xs text-slate-400 leading-tight">{subtitulo}</p>
        </div>
      </header>

      <div className="px-4 pb-10">
        {pilar === 'hub' && <Hub onIr={setPilar} onNavigate={onNavigate} />}
        {pilar === 'cosecha' && <PilarCosecha />}
        {pilar === 'frescos' && <PilarFrescos />}
        {pilar === 'guardar' && <PilarGuardar />}
        {pilar === 'transformar' && <PilarTransformar onNavigate={onNavigate} />}
      </div>
    </div>
  );
}

/* ─────────────────────────────────── Hub ─────────────────────────────────── */
function Hub({ onIr, onNavigate }) {
  const pilares = [
    { key: 'cosecha', icon: Scissors, foto: 'cosecha-aguacate', titulo: 'Cosechar en punto', desc: 'Cada cultivo tiene su seña. El aguacate se cosecha por materia seca, no por color.', accent: 'emerald' },
    { key: 'frescos', icon: Snowflake, foto: 'frio-olla', titulo: 'Enfriar y curar', desc: 'Frío casero (hasta sin luz) y curado: los frescos duran semanas, no días.', accent: 'sky' },
    { key: 'guardar', icon: Warehouse, foto: 'secado-maiz', titulo: 'Secar y guardar el grano', desc: 'Calculadora de secado, plagas de bodega y el peligro de las micotoxinas.', accent: 'amber' },
    { key: 'transformar', icon: FlaskConical, foto: 'secado-cafe', titulo: 'Transformar', desc: 'Deshidratados, mermeladas, harinas, panela, queso y café — con su punto crítico.', accent: 'lime' },
  ];
  return (
    <div className="flex flex-col gap-4">
      {/* Gancho — la magnitud del problema, con foto real */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <Foto slug="secado-cafe" ratio="aspect-[16/9]" className="rounded-none border-0 border-b border-slate-800" />
        <div className="px-4 pt-3 pb-4">
          <p className="text-[13px] uppercase tracking-wide font-bold text-slate-400">El problema</p>
          <p className="mt-1 text-[15px] text-slate-100 leading-snug">
            <span className="font-bold">Colombia pierde cerca de 1 de cada 3 productos</span> entre la mata y la venta.
          </p>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Son <span className="font-semibold text-slate-100">{PERDIDA_PAIS.toneladasMt} millones de toneladas al año</span>{' '}
            ({PERDIDA_PAIS.porcentajeOferta} % de la comida del país). La mayor parte se evita{' '}
            <span className="font-semibold text-slate-100">con manejo, no con plata</span>: sombra, suavidad, limpieza y buen guardado.
          </p>
          <p className="mt-2 text-[11px] text-slate-500">Fuente: {PERDIDA_PAIS.fuente} · confianza {PERDIDA_PAIS.confianza}.</p>
        </div>
      </section>

      {/* Cuatro pilares, cada uno con miniatura */}
      <div className="flex flex-col gap-3">
        {pilares.map((p, i) => {
          const c = COLOR_MAP[p.accent];
          const Icono = p.icon;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onIr(p.key)}
              className={`text-left rounded-2xl border ${c.border} ${c.bg} p-3 flex items-center gap-3 hover:border-opacity-100 transition-colors motion-reduce:transition-none active:scale-[0.99]`}
            >
              <span className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-800">
                <img src={`/poscosecha/${p.foto}.jpg`} alt="" aria-hidden="true" loading="lazy" className="w-full h-full object-cover" />
                <span className="absolute inset-0 flex items-center justify-center bg-slate-950/35">
                  <Icono size={20} className="text-white drop-shadow" />
                </span>
              </span>
              <span className="flex-1 min-w-0">
                <span className="text-[11px] font-bold text-slate-500">Paso {i + 1}</span>
                <span className="block text-[15px] font-bold text-white leading-tight">{p.titulo}</span>
                <span className="block text-sm text-slate-300 mt-0.5 leading-snug">{p.desc}</span>
              </span>
              <ChevronRight size={20} className="text-slate-500 shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Puente honesto a herramientas existentes del mismo mundo */}
      {onNavigate ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
          <p className="text-xs uppercase tracking-wide font-bold text-slate-400 mb-2">También en Chagra</p>
          <div className="flex flex-col gap-2">
            <PuenteBoton
              icon={Warehouse}
              titulo="Bodega de insumos"
              sub="Lo que tiene guardado y lo que se le está acabando."
              onClick={() => onNavigate('bodega')}
            />
            <PuenteBoton
              icon={Sprout}
              titulo="Pregúntele al agente"
              sub="Índice de cosecha, curado o inocuidad para su cultivo."
              onClick={() => onNavigate('agente', { prompt: '¿Cuándo cosecho y cómo guardo para que no se me dañe?' })}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PuenteBoton({ icon, titulo, sub, onClick }) {
  const Icon = icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border border-slate-700/60 bg-slate-800/40 p-3 flex items-center gap-3 hover:border-slate-600 transition-colors motion-reduce:transition-none"
    >
      <Icon size={20} className="shrink-0" style={{ color: 'rgb(var(--t-accent-rgb))' }} />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold text-slate-100 leading-tight">{titulo}</span>
        <span className="block text-xs text-slate-400 leading-snug">{sub}</span>
      </span>
      <ChevronRight size={18} className="text-slate-500 shrink-0" />
    </button>
  );
}

/* Ficha de fuente/confianza compacta (reutilizada). */
function Fuente({ children }) {
  return <p className="mt-1.5 text-[11px] text-slate-500">Fuente: {children}.</p>;
}

/* Etiqueta corta tipo "gratis / físico / sin químico". */
function Tag({ children }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-100"
      style={{ backgroundColor: 'rgb(var(--t-accent-rgb) / 0.22)', boxShadow: 'inset 0 0 0 1px rgb(var(--t-accent-rgb) / 0.45)' }}
    >
      {children}
    </span>
  );
}

/* ─────────────────── Pilar 1 — Cosechar en punto ─────────────────── */
function PilarCosecha() {
  const [ms, setMs] = useState('');
  const setMsClean = (raw) => setMs(raw.replace(',', '.').replace(/[^0-9.]/g, ''));
  const res = useMemo(() => (ms === '' ? null : evaluarMateriaSecaAguacate(ms)), [ms]);
  const c = res ? COLOR_MAP[res.color] : COLOR_MAP.slate;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-300 leading-relaxed">
        El punto de cosecha se lee con los ojos (color), la mano (firmeza) y el calendario
        (días desde la flor). Cosechar en el punto es la <span className="font-semibold text-slate-100">primera defensa</span> contra la pérdida.
      </p>

      {/* Índices de madurez por cultivo — con foto */}
      <div className="flex flex-col gap-3">
        {INDICES_MADUREZ.map((cultivo) => (
          <article key={cultivo.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <Foto slug={cultivo.foto} ratio="aspect-[16/9]" className="rounded-none border-0 border-b border-slate-800" />
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[15px] font-bold text-white leading-tight">{cultivo.cultivo}</h3>
                <span className="shrink-0"><Tag>{cultivo.sena}</Tag></span>
              </div>
              <p className="text-sm text-slate-300 mt-2 leading-snug">{cultivo.texto}</p>
              <p className="mt-2 text-sm text-slate-100 leading-snug">
                <Sprout size={14} className="inline mr-1 -mt-0.5" style={{ color: 'rgb(var(--t-accent-rgb))' }} />
                {cultivo.dato}
              </p>
              <Fuente>{cultivo.fuente} · confianza {cultivo.confianza}</Fuente>
            </div>
          </article>
        ))}
      </div>

      {/* Aguacate Hass — calculadora insignia por materia seca */}
      <section className="rounded-2xl border border-emerald-800/40 bg-emerald-950/20 p-4">
        <div className="flex items-center gap-2">
          <Sprout size={20} className="text-emerald-300 shrink-0" />
          <h3 className="text-[15px] font-bold text-emerald-200">¿Ya está el aguacate? Mídalo</h3>
        </div>
        <p className="text-sm text-emerald-100/90 mt-2 leading-relaxed">
          Si mide la <span className="font-semibold">materia seca</span> (en laboratorio o con balanza y horno), aquí le decimos si ya está en punto.
        </p>
        <label htmlFor="pc-ms" className="mt-3 block text-xs uppercase tracking-wide font-bold text-emerald-200/80">
          Materia seca medida (%)
        </label>
        <div className="mt-1.5 flex items-center gap-2">
          <input
            id="pc-ms"
            type="text"
            inputMode="decimal"
            value={ms}
            onChange={(e) => setMsClean(e.target.value)}
            placeholder="ej. 22"
            aria-label="Materia seca del aguacate en porcentaje"
            className="flex-1 min-w-0 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-500"
          />
          <span className="text-xs text-slate-400 shrink-0">%</span>
        </div>
        {res ? (
          <div className={`mt-3 rounded-xl border ${c.border} ${c.bg} p-3 flex items-start gap-2`}>
            <span className={`w-2 h-2 rounded-full ${c.dot} mt-1.5 shrink-0`} aria-hidden="true" />
            <p className={`text-sm ${c.text} leading-snug`}>{res.label}</p>
          </div>
        ) : (
          <p className="mt-3 text-xs text-emerald-200/70 leading-snug">
            Norma internacional: ≥ {AGUACATE_MS_MINIMO_NORMA} %. Para Colombia se propone 23–24 % como punto de cosecha.
          </p>
        )}
        <Fuente>AGROSAVIA; norma de exportación · confianza alta</Fuente>
      </section>

      <p className="text-xs text-slate-500 leading-relaxed">
        <Info size={13} className="inline mr-1 -mt-0.5" />
        Los índices por cultivo (color exacto, Brix, días desde floración) se seguirán anclando a la ficha
        primaria de cada especie. Para su cultivo, consulte al agente o a su técnico.
      </p>
    </div>
  );
}

/* ─────────────────── Pilar 2 — Enfriar y curar ─────────────────── */
function PilarFrescos() {
  const maxDias = Math.max(...CAMARA_EVAPORATIVA_VIDA.map((v) => v.conCamara));
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-slate-300 leading-relaxed">
        Frutas y hortalizas <span className="font-semibold text-slate-100">siguen vivas y respirando</span> después de la cosecha.
        Enfriar rápido y curar bien es lo que las hace durar <span className="font-semibold text-slate-100">semanas en vez de días</span>.
      </p>

      {/* 2a. Cadena de frío casera */}
      <section>
        <h2 className="text-sm uppercase tracking-wide font-bold text-slate-400 mb-2 flex items-center gap-2">
          <Snowflake size={15} /> Cadena de frío casera
        </h2>
        <div className="flex flex-col gap-3">
          {CADENA_FRIO.map((paso) => (
            <div key={paso.id} className="rounded-2xl border border-sky-800/40 bg-sky-950/20 overflow-hidden">
              {paso.foto ? (
                <Foto slug={paso.foto} ratio="aspect-[16/9]" className="rounded-none border-0 border-b border-sky-900/50" />
              ) : null}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[15px] font-bold text-sky-200 leading-tight">{paso.titulo}</h3>
                  <span className="shrink-0"><Tag>{paso.tag}</Tag></span>
                </div>
                <p className="text-sm text-sky-100/90 mt-2 leading-snug">{paso.texto}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Vida útil comparada — cámara evaporativa vs ambiente (barras grounded) */}
        <div className="mt-3 rounded-2xl border border-sky-800/40 bg-slate-900/60 p-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Thermometer size={16} className="text-sky-300" /> Cuánto más dura en la cámara evaporativa
          </h3>
          <div className="mt-3 flex flex-col gap-2.5">
            {CAMARA_EVAPORATIVA_VIDA.map((v) => (
              <div key={v.producto}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-100">{v.producto}</span>
                  <span className="text-slate-400 tabular-nums">
                    <span className="font-bold text-sky-300">{v.conCamara} días</span> vs {v.ambiente} al aire
                  </span>
                </div>
                <div
                  className="flex flex-col gap-1"
                  role="img"
                  aria-label={`${v.producto}: ${v.conCamara} días en cámara evaporativa contra ${v.ambiente} días al ambiente`}
                >
                  <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="pc-grow h-full rounded-full bg-sky-400" style={{ width: `${Math.round((v.conCamara / maxDias) * 100)}%` }} />
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="pc-grow h-full rounded-full bg-slate-500" style={{ width: `${Math.round((v.ambiente / maxDias) * 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-300 leading-snug">
            <Info size={13} className="inline mr-1 -mt-0.5 text-sky-300" />
            {CAMARA_EVAPORATIVA_NOTA}
          </p>
          <Fuente>{CAMARA_EVAPORATIVA_FUENTE}</Fuente>
        </div>
      </section>

      {/* 2b. Ojo con el frío en los tropicales */}
      <section className="rounded-2xl border border-amber-800/40 bg-amber-950/20 p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-amber-300 shrink-0" />
          <h3 className="text-[15px] font-bold text-amber-200">No todo va a la nevera</h3>
        </div>
        <p className="text-sm text-amber-100/90 mt-2 leading-relaxed">
          Muchos tropicales se dañan por frío por debajo de 10–13 °C: se manchan y no maduran.
          <span className="font-semibold"> No los meta a la nevera.</span>
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {DANIO_POR_FRIO.map((d) => (
            <li key={d.producto} className="flex items-start gap-2 text-sm text-amber-100/90">
              <span className="text-amber-400 shrink-0 mt-0.5" aria-hidden="true">•</span>
              <span className="leading-snug"><span className="font-semibold">{d.producto}:</span> {d.nota}</span>
            </li>
          ))}
        </ul>
        <Fuente>FAO / WFLO · confianza alta</Fuente>
      </section>

      {/* 2c. Curado — dos recetas OPUESTAS */}
      <section>
        <h2 className="text-sm uppercase tracking-wide font-bold text-slate-400 mb-2 flex items-center gap-2">
          <Droplets size={15} /> Curado: dos recetas opuestas
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed mb-3">
          Curar es dejar que la cosecha <span className="font-semibold text-slate-100">cicatrice las heridas</span> antes de
          guardarla. Pero la receta es <span className="font-semibold text-slate-100">opuesta</span> según el producto: no las confunda.
        </p>
        <div className="grid grid-cols-1 gap-3">
          <CuradoCard data={CURADO.raices} icon={Droplets} accent="emerald" foto="curado-yuca" />
          <CuradoCard data={CURADO.bulbos} icon={Wind} accent="amber" />
        </div>
      </section>
    </div>
  );
}

function CuradoCard({ data, icon, accent, foto }) {
  const Icon = icon;
  const c = COLOR_MAP[accent];
  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} overflow-hidden`}>
      {foto ? <Foto slug={foto} ratio="aspect-[16/9]" className="rounded-none border-0 border-b border-slate-800/60" /> : null}
      <div className="p-4">
        <div className="flex items-center gap-2">
          <Icon size={18} className={`${c.text} shrink-0`} />
          <h3 className={`text-[15px] font-bold ${c.text}`}>{data.label}</h3>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{data.ejemplos}</p>
        <p className="mt-2 text-sm text-slate-100">
          Receta: <span className="font-bold">{data.receta}</span>
        </p>
        <p className="text-sm text-slate-300 mt-1 leading-snug">{data.porque}</p>
        <ul className="mt-3 flex flex-col gap-2">
          {data.detalle.map((d) => (
            <li key={d.cultivo} className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-2.5">
              <p className="text-sm font-bold text-slate-100">{d.cultivo}</p>
              <p className="text-sm text-slate-300 leading-snug">{d.cond}</p>
              <p className="text-xs text-slate-400 mt-1 leading-snug">{d.ojo}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ─────────────────── Pilar 3 — Secar y guardar el grano ─────────────────── */
function PilarGuardar() {
  return (
    <div className="flex flex-col gap-5">
      {/* 3a. Calculadora de secado de grano (determinista) */}
      <CalculadoraSecado />

      {/* 3b. Plagas de almacén — control físico */}
      <section>
        <h2 className="text-sm uppercase tracking-wide font-bold text-slate-400 mb-2 flex items-center gap-2">
          <Bug size={15} /> Plagas de bodega: sin veneno
        </h2>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden mb-3">
          <Foto slug="plaga-gorgojo" ratio="aspect-[16/9]" className="rounded-none border-0 border-b border-slate-800" />
          <p className="p-3 text-sm text-slate-300 leading-snug">
            El <span className="font-semibold text-slate-100">gorgojo</span>, la polilla y el escarabajo se comen el grano guardado.
            En bodega abierta se puede perder <span className="font-semibold text-slate-100">más del 5 % al año</span>; con manejo físico, casi nada.
          </p>
        </div>
        <div className="flex flex-col gap-2.5">
          {PLAGAS_ALMACEN.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
              {p.foto ? <Foto slug={p.foto} ratio="aspect-[16/9]" className="rounded-none border-0 border-b border-slate-800" /> : null}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 leading-tight">
                    <ShieldCheck size={16} className="shrink-0" style={{ color: 'rgb(var(--t-accent-rgb))' }} />
                    {p.titulo}
                  </h3>
                  <span className="shrink-0"><Tag>{p.tag}</Tag></span>
                </div>
                <p className="text-sm text-slate-300 mt-1.5 leading-snug">{p.texto}</p>
              </div>
            </div>
          ))}
        </div>
        <Fuente>FAO / PICS-Purdue; DR nacional §4 · confianza media-alta</Fuente>
      </section>

      {/* 3c. MICOTOXINAS — peligro de salud (bloque de alarma) */}
      <MicotoxinasBloque />
    </div>
  );
}

function MicotoxinasBloque() {
  return (
    <section className="rounded-2xl border-2 border-rose-700/60 bg-rose-950/25 overflow-hidden">
      <div className="p-4 pb-3 border-b border-rose-800/40">
        <div className="flex items-center gap-2">
          <Skull size={20} className="text-rose-300 shrink-0" />
          <h2 className="text-[16px] font-bold text-rose-100">El peligro invisible: micotoxinas</h2>
        </div>
        <p className="mt-2 text-sm text-rose-50 leading-relaxed font-semibold">
          {MICOTOXINAS_ADVERTENCIA}
        </p>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {MICOTOXINAS.map((m) => (
          <article key={m.id} className="rounded-xl border border-rose-800/40 bg-slate-900/60 overflow-hidden">
            {m.foto ? <Foto slug={m.foto} ratio="aspect-[16/9]" className="rounded-none border-0 border-b border-rose-900/40" /> : null}
            <div className="p-3">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h3 className="text-[15px] font-bold text-rose-100">{m.nombre}</h3>
                <span className="text-[11px] italic text-slate-400">{m.hongo}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Dónde: {m.donde}</p>
              <div className="mt-2 rounded-lg bg-rose-950/50 border border-rose-800/50 p-2.5 flex items-start gap-2">
                <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
                <p className="text-sm text-rose-50 leading-snug"><span className="font-bold">Peligro:</span> {m.peligro}</p>
              </div>
              <div className="mt-2 rounded-lg bg-emerald-950/30 border border-emerald-800/40 p-2.5 flex items-start gap-2">
                <CheckCircle2 size={15} className="text-emerald-300 shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-50 leading-snug"><span className="font-bold">Cómo evitarla:</span> {m.prevencion}</p>
              </div>
              <Fuente>{m.fuente} · confianza {m.confianza}</Fuente>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CalculadoraSecado() {
  const [grano, setGrano] = useState('maiz');
  const [peso, setPeso] = useState('');
  const [humedad, setHumedad] = useState('');

  const info = GRANOS[grano];
  const objetivo = info.humedadSegura;

  const clean = (raw) => raw.replace(',', '.').replace(/[^0-9.]/g, '');

  const res = useMemo(
    () => calcularSecadoGrano({ pesoInicial: peso, humedadInicial: humedad, humedadObjetivo: objetivo }),
    [peso, humedad, objetivo],
  );

  const humedadNum = humedad === '' ? null : Number.parseFloat(humedad.replace(',', '.'));
  const yaSeco = humedadNum != null && Number.isFinite(humedadNum) && humedadNum > 0 && humedadNum <= objetivo;

  return (
    <section className="rounded-2xl border border-amber-800/40 bg-amber-950/20 overflow-hidden">
      <Foto slug="secado-maiz" ratio="aspect-[16/9]" className="rounded-none border-0 border-b border-amber-900/50" />
      <div className="p-4">
        <div className="flex items-center gap-2">
          <Sun size={20} className="text-amber-300 shrink-0" />
          <h3 className="text-[15px] font-bold text-amber-200">Calculadora de secado de grano</h3>
        </div>
        <p className="text-sm text-amber-100/90 mt-2 leading-relaxed">
          Grano que se guarda húmedo se pierde por moho (y micotoxinas). Le decimos cuánta agua debe sacar para llegar a la humedad segura
          y cuánto le va a quedar.
        </p>

        {/* Selector de grano */}
        <p className="mt-3 text-xs uppercase tracking-wide font-bold text-amber-200/80 mb-1.5">¿Qué grano?</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(GRANOS).map(([key, g]) => {
            const activo = grano === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setGrano(key)}
                aria-pressed={activo}
                className={`min-h-[40px] px-3 rounded-full border text-sm font-semibold transition-colors motion-reduce:transition-none ${
                  activo ? 'border-transparent text-white' : 'bg-slate-800 border-slate-700 text-slate-200 hover:border-slate-500'
                }`}
                style={activo ? { backgroundColor: 'rgb(var(--t-accent-rgb) / 0.25)', boxShadow: 'inset 0 0 0 2px rgb(var(--t-accent-rgb))' } : undefined}
              >
                {g.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-amber-100/80 leading-snug">
          Humedad segura del {info.label.toLowerCase()}: <span className="font-bold">{info.humedadSeguraRango[0]}–{info.humedadSeguraRango[1]} %</span>.
          {' '}{info.nota}
        </p>

        {/* Entradas */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label htmlFor="pc-peso" className="block text-xs uppercase tracking-wide font-bold text-amber-200/80 mb-1">
              Peso mojado
            </label>
            <input
              id="pc-peso"
              type="text"
              inputMode="decimal"
              value={peso}
              onChange={(e) => setPeso(clean(e.target.value))}
              placeholder="ej. 100"
              aria-label="Peso mojado del grano"
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-500"
            />
            <p className="mt-1 text-[10px] text-slate-500">kg, arrobas o bultos</p>
          </div>
          <div>
            <label htmlFor="pc-hum" className="block text-xs uppercase tracking-wide font-bold text-amber-200/80 mb-1">
              Humedad actual (%)
            </label>
            <input
              id="pc-hum"
              type="text"
              inputMode="decimal"
              value={humedad}
              onChange={(e) => setHumedad(clean(e.target.value))}
              placeholder="ej. 22"
              aria-label="Humedad actual del grano en porcentaje"
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-500"
            />
            <p className="mt-1 text-[10px] text-slate-500">objetivo: {objetivo} %</p>
          </div>
        </div>

        {/* Resultado */}
        {res ? (
          <div className="mt-3 rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-300 shrink-0" />
              <p className="text-sm font-bold text-emerald-200">Para guardar sin moho</p>
            </div>
            <p className="text-4xl font-black text-white mt-2 leading-none">
              {res.aguaEliminada}
              <span className="text-lg font-bold text-slate-300"> de agua a sacar</span>
            </p>
            <p className="text-sm text-emerald-200/90 mt-1.5">
              Le quedan <span className="font-bold">{res.pesoFinal}</span> de grano seco al {objetivo} %
              {' '}(merma de {res.mermaPorc} % en peso; la materia seca no cambia).
            </p>
          </div>
        ) : yaSeco ? (
          <div className="mt-3 rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-3 flex items-start gap-2.5">
            <CheckCircle2 size={20} className="text-emerald-300 shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-100">
              <span className="font-bold">Ya está en punto.</span> Ese grano está igual o más seco que la humedad segura;
              puede guardarlo hermético. No lo seque de más.
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-amber-100/70 text-center py-2">
            Escriba el peso y la humedad actual (mayor que el objetivo) para calcular.
          </p>
        )}

        <details className="mt-3 rounded-lg border border-amber-800/30 bg-amber-950/10 p-2.5">
          <summary className="text-xs font-bold text-amber-200/90 cursor-pointer">Cómo se calcula</summary>
          <p className="mt-1.5 text-xs text-amber-100/70 leading-relaxed">
            Balance de masa exacto: la materia seca no cambia al secar, solo se va agua.
            Peso final = peso × (100 − humedad actual) ÷ (100 − humedad objetivo). Las humedades seguras vienen del
            deep research (FAO / Cenicafé), confianza alta.
          </p>
        </details>
      </div>
    </section>
  );
}

/* ─────────────────── Pilar 4 — Transformar ─────────────────── */
function PilarTransformar({ onNavigate }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-300 leading-relaxed">
        El excedente que se iba a perder puede volverse producto vendible que dura meses. Cada línea tiene
        <span className="font-semibold text-slate-100"> un punto crítico de inocuidad</span> — casi siempre calor, limpieza y empaque sellado.
      </p>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <Foto slug="secado-cafe" ratio="aspect-[16/9]" className="rounded-none border-0 border-b border-slate-800" />
        <p className="p-3 text-sm text-slate-300 leading-snug">
          Secar, moler, cocinar con azúcar o cuajar leche son formas de <span className="font-semibold text-slate-100">ganarle tiempo a la pérdida</span> y valor a la cosecha.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {TRANSFORMACIONES.map((t) => (
          <article
            key={t.id}
            className={`rounded-2xl border p-4 ${t.critico ? 'border-rose-700/50 bg-rose-950/20' : 'border-slate-800 bg-slate-900/60'}`}
          >
            <h3 className={`text-[15px] font-bold ${t.critico ? 'text-rose-200' : 'text-slate-100'}`}>{t.titulo}</h3>
            <p className="text-sm text-slate-300 mt-1 leading-snug">{t.resumen}</p>
            <div className={`mt-2 rounded-lg p-2.5 flex items-start gap-2 ${t.critico ? 'bg-rose-950/40 border border-rose-800/40' : 'bg-slate-800/40 border border-slate-700/50'}`}>
              <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${t.critico ? 'text-rose-400' : 'text-amber-400'}`} />
              <p className={`text-sm leading-snug ${t.critico ? 'text-rose-100 font-semibold' : 'text-slate-200'}`}>
                <span className="font-bold">Punto crítico:</span> {t.puntoCritico}
              </p>
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-snug">{t.dato}</p>
            <Fuente>{t.fuente} · confianza {t.confianza}</Fuente>
          </article>
        ))}
      </div>

      {/* Inocuidad: dos capas */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} style={{ color: 'rgb(var(--t-accent-rgb))' }} className="shrink-0" />
          <h3 className="text-[15px] font-bold text-slate-100">Inocuidad: lo gratis primero</h3>
        </div>
        <p className="text-sm text-slate-300 mt-2 leading-relaxed">
          <span className="font-semibold text-slate-100">Básico y gratis (para todos):</span> agua limpia, manos limpias,
          superficies limpias, calor donde toca y empaque sellado.
        </p>
        <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
          <span className="font-semibold text-slate-100">Formal (para vender fuera de la finca):</span> BPM
          (Resolución 2674 de 2013, INVIMA) y certificado de manipulación de alimentos. No se asuste: la inocuidad
          empieza con lo básico.
        </p>
        <Fuente>INVIMA / MinSalud · confianza alta</Fuente>
      </section>

      {onNavigate ? (
        <PuenteBoton
          icon={Sprout}
          titulo="Pregúntele al agente"
          sub="Receta, dosis de azúcar o pasos de inocuidad para su producto."
          onClick={() => onNavigate('agente', { prompt: '¿Cómo transformo mi excedente sin que se dañe?' })}
        />
      ) : null}
    </div>
  );
}
