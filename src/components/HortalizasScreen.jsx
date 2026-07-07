/* i18n (ADR-050): etiquetas user-facing en español Colombia pendientes de migrar
 * a src/config/messages.js. Misma deuda preexistente que AlmacenamientoScreen y
 * App.jsx; se desactiva la regla soft a nivel de archivo. */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import { useState } from 'react';
import {
  ChevronLeft, Sprout, Sun, Droplets, Mountain, Bug, ShieldCheck,
  Leaf, Ban, Scissors, Package, Camera, Info, FlaskConical, ArrowRight, Users,
} from 'lucide-react';
import { HORTALIZAS, getHortaliza, tieneDato, DATO_EN_CAMINO } from '../services/hortalizasData';

/**
 * HortalizasScreen — mini-app "Hortalizas de la huerta" (mundo Cultivos y semillas).
 *
 * La comida diaria de la casa campesina: tomate, cebolla larga y de bulbo,
 * zanahoria, repollo, lechuga, cilantro, remolacha y acelga. Cada hortaliza abre
 * una ficha didáctica de CULTIVO: siembra (directa/semillero + distancias),
 * luz/agua/piso térmico, vecinas buenas y malas, plagas y su manejo agroecológico,
 * cosecha y conservación.
 *
 * GROUNDING: vecinas + plagas + manejo salen del grafo chagra_kg
 * (public/grafo-relations.json), los días a cosecha de las plantillas de
 * fenología (Agrosavia/ICA/FAO), y la ficha de cultivo de la huerta casera
 * (SENA/Agrosavia/ICA). Donde el grafo no tiene el dato, se muestra "dato en
 * camino" — CERO invención, y NUNCA dosis químicas (solo biocontroladores y
 * biopreparados por nombre; las recetas viven en el mundo Biopreparados).
 *
 * Identidad: cuaderno de campo / Ciclo Vivo. Photo-forward con foto real por
 * hortaliza (autor + licencia CC + fuente SIEMPRE visibles, ver
 * /public/hortalizas/creditos.json).
 */

/* ── Créditos de foto (espejo de /public/hortalizas/creditos.json). Requisito de
 *    las licencias CC-BY: autor + licencia + enlace a la fuente, siempre visibles. */
const FOTOS = {
  'tomate': { autor: 'Jubair Bin Iqbal', licencia: 'CC BY-SA 4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Bangladeshi_Tomato.jpg', alt: 'Tomates chontos maduros recién cosechados.' },
  'cebolla-larga': { autor: 'Kolforn', licencia: 'CC BY-SA 4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:-2021-11-06_Harvest_of_Scallions_(spring_onions),_Trimingham,_Norfolk.JPG', alt: 'Manojo de cebolla larga con bulbo blanco y tallo verde.' },
  'cebolla-bulbo': { autor: 'Acabashi', licencia: 'CC BY-SA 4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Common_onion_harvested_at_Goodnestone_Park_Kent_England.jpg', alt: 'Canasta de cebollas de bulbo cosechadas para curar.' },
  'zanahoria': { autor: 'woodleywonderworks', licencia: 'CC BY 2.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Carrot_harvest.jpg', alt: 'Hilera de zanahorias recién arrancadas con su follaje.' },
  'repollo': { autor: 'Dinesh Valke', licencia: 'CC BY-SA 2.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Brassica_oleracea_var._capitata_(4170722993).jpg', alt: 'Cabeza de repollo formándose en la era.' },
  'lechuga': { autor: 'Basile Morin', licencia: 'CC BY-SA 4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Green_lettuce_in_a_kitchen_garden.jpg', alt: 'Cama de lechuga verde en una huerta casera.' },
  'cilantro': { autor: 'SarKaLay', licencia: 'CC BY-SA 4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Coriandrum_Leaf.jpg', alt: 'Hojas frescas de cilantro recién cortadas.' },
  'remolacha': { autor: 'W.carter', licencia: 'CC BY-SA 4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Beetroots_in_a_basket.jpg', alt: 'Canasta de remolachas rojas cosechadas.' },
  'acelga': { autor: 'Alex from Ithaca, NY', licencia: 'CC BY 2.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Swiss_Chard_Rainbow.jpg', alt: 'Manojos de acelga de pencas de colores.' },
};

/* Foto real con crédito CC visible. La franja de crédito es opaca para leerse al
 * sol y contrastar sobre cualquier imagen. */
function Foto({ slug, ratio = 'aspect-[16/10]', className = '', objectPos = 'object-center' }) {
  const c = FOTOS[slug];
  if (!c) return null;
  return (
    <figure className={`relative overflow-hidden rounded-xl border border-slate-800 bg-slate-800 ${className}`}>
      <img
        src={`/hortalizas/${slug}.jpg`}
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

/* Clases LITERALES por acento (Tailwind JIT no ve strings construidos). */
const COLOR_MAP = {
  emerald: { text: 'text-emerald-300', border: 'border-emerald-700/50', bg: 'bg-emerald-950/30', dot: 'bg-emerald-400' },
  lime: { text: 'text-lime-300', border: 'border-lime-700/50', bg: 'bg-lime-950/30', dot: 'bg-lime-400' },
  amber: { text: 'text-amber-300', border: 'border-amber-700/50', bg: 'bg-amber-950/30', dot: 'bg-amber-400' },
  rose: { text: 'text-rose-300', border: 'border-rose-700/50', bg: 'bg-rose-950/30', dot: 'bg-rose-400' },
  slate: { text: 'text-slate-300', border: 'border-slate-700/50', bg: 'bg-slate-900/50', dot: 'bg-slate-500' },
};

/* Ilustración SVG propia: la era de la huerta con su sol que respira. Theme-aware
 * (usa --t-accent-rgb); el sol se apaga con prefers-reduced-motion vía .al-sun. */
function HuertaIlustracion() {
  return (
    <svg
      viewBox="0 0 240 120"
      role="img"
      aria-label="Ilustración de una era de huerta con hortalizas al sol"
      className="w-full h-auto"
    >
      <rect x="0" y="0" width="240" height="120" rx="6" fill="rgb(var(--t-accent-rgb) / 0.08)" />
      {/* Sol */}
      <circle cx="206" cy="26" r="11" fill="#f4b83c" className="al-sun" />
      <g stroke="#f4b83c" strokeWidth="2" strokeLinecap="round" className="al-sun">
        <path d="M206 8 V2" /><path d="M226 26 H232" /><path d="M220 12 L224 8" />
      </g>
      {/* Tierra de la era */}
      <path d="M8 96 Q120 84 232 96 L232 112 Q120 104 8 112 Z" fill="#7a5a3c" />
      <rect x="8" y="106" width="224" height="8" rx="3" fill="#6b4d33" />
      {/* Surcos de hortalizas */}
      <g>
        {/* Zanahoria (follaje + raíz asomando) */}
        <g transform="translate(40 96)">
          <path d="M0 0 q-4 -18 -2 -26 M0 0 q0 -20 0 -28 M0 0 q4 -18 2 -26" fill="none" stroke="#4c8b3f" strokeWidth="2" />
          <path d="M-3 0 L3 0 L0 10 Z" fill="#e0842c" />
        </g>
        {/* Repollo/lechuga (cogollo) */}
        <g transform="translate(92 92)">
          <circle cx="0" cy="0" r="12" fill="#5a9e4a" />
          <circle cx="0" cy="0" r="7" fill="#79bd63" />
        </g>
        {/* Tomate (mata con tutor y fruto) */}
        <g transform="translate(140 96)">
          <path d="M0 0 V-30" stroke="#8a6a3c" strokeWidth="2" />
          <path d="M0 -8 q-8 -2 -12 -8 M0 -18 q8 -2 12 -8" fill="none" stroke="#4c8b3f" strokeWidth="2" />
          <circle cx="-6" cy="-12" r="4" fill="#d94f45" />
          <circle cx="5" cy="-22" r="3.4" fill="#e0665b" />
        </g>
        {/* Cebolla larga (macolla) */}
        <g transform="translate(184 96)" stroke="#5a9e4a" strokeWidth="2.4" strokeLinecap="round" fill="none">
          <path d="M0 0 V-24" /><path d="M-4 0 q-2 -14 -3 -22" /><path d="M4 0 q2 -14 3 -22" />
        </g>
      </g>
      {/* Escudo verde (manejo sin veneno) */}
      <g transform="translate(20 44)">
        <path d="M0 0 L14 -5 L28 0 L28 14 Q28 27 14 33 Q0 27 0 14 Z" fill="rgb(var(--t-accent-rgb) / 0.9)" />
        <path d="M8 14 l4 5 l8 -10" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/* ═══════════════════════════════ Componente ═══════════════════════════════ */
/**
 * @param {Object} props
 * @param {() => void} props.onBack
 * @param {(view: string, data?: any) => void} [props.onNavigate]
 */
export default function HortalizasScreen({ onBack, onNavigate }) {
  const [selId, setSelId] = useState(/** @type {string|null} */ (null));
  const sel = selId ? getHortaliza(selId) : null;

  const volver = () => {
    if (sel) { setSelId(null); return; }
    onBack?.();
  };

  return (
    <div className="min-h-[100dvh] text-white">
      <header className="flex items-center gap-2 px-4 pt-[calc(14px+env(safe-area-inset-top))] pb-2">
        <button
          type="button"
          onClick={volver}
          aria-label="Volver"
          className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center shrink-0"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold leading-tight text-white">Hortalizas de la huerta</h1>
          <p className="text-xs text-slate-400 leading-tight">
            {sel ? `${sel.nombre} · ${sel.cientifico}` : 'La comida diaria de la casa: cómo sembrarla y cuidarla.'}
          </p>
        </div>
      </header>

      <div className="px-4 pb-10">
        {sel
          ? <Ficha h={sel} onNavigate={onNavigate} />
          : <Hub onSel={setSelId} />}
      </div>
    </div>
  );
}

/* ─────────────────────────────────── Hub ─────────────────────────────────── */
function Hub({ onSel }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Gancho: la huerta como despensa de la casa */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <Foto slug="lechuga" ratio="aspect-[16/9]" className="rounded-none border-0 border-b border-slate-800" />
        <div className="px-4 pt-3 pb-4">
          <p className="text-[13px] uppercase tracking-wide font-bold text-slate-400">La huerta de la casa</p>
          <p className="mt-1 text-[15px] text-slate-100 leading-snug">
            Ocho hortalizas de la olla campesina, cada una con su ficha de cultivo:
            <span className="font-bold text-emerald-300"> siembra, agua, vecinas, plagas y cosecha</span>.
          </p>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Las buenas y malas vecinas, y las plagas con su manejo agroecológico, salen del
            grafo de la finca. Donde todavía no hay dato, se lo decimos claro — sin inventar.
          </p>
        </div>
      </section>

      {/* Grilla de hortalizas — photo-forward */}
      <div className="grid grid-cols-2 gap-3">
        {HORTALIZAS.map((h) => {
          const c = COLOR_MAP[h.accent] || COLOR_MAP.slate;
          return (
            <button
              key={h.id}
              type="button"
              data-testid={`hortaliza-${h.id}`}
              onClick={() => onSel(h.id)}
              className={`group text-left rounded-2xl border ${c.border} bg-slate-900/60 overflow-hidden hover:bg-slate-900 transition-colors`}
            >
              <Foto slug={h.foto} ratio="aspect-[4/3]" className="rounded-none border-0" />
              <div className="px-3 pt-2 pb-3">
                <p className="text-[15px] font-bold text-white leading-tight">
                  <span aria-hidden="true">{h.emoji}</span> {h.nombre}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400 leading-snug line-clamp-2">{h.resumen}</p>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed">
        Fotos con licencia Creative Commons (autor + licencia visibles). Datos de cultivo:
        huerta casera SENA / Agrosavia / ICA. Vecinas y plagas: grafo Chagra.
      </p>
    </div>
  );
}

/* ─────────────────────────── Ficha de una hortaliza ─────────────────────────── */
function Ficha({ h, onNavigate }) {
  const c = COLOR_MAP[h.accent] || COLOR_MAP.slate;
  return (
    <div className="flex flex-col gap-4">
      {/* Portada */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <Foto slug={h.foto} ratio="aspect-[16/9]" className="rounded-none border-0 border-b border-slate-800" />
        <div className="px-4 pt-3 pb-4">
          <p className="text-xl font-bold text-white leading-tight">
            <span aria-hidden="true">{h.emoji}</span> {h.nombre}
          </p>
          <p className={`mt-0.5 text-xs italic ${c.text}`}>{h.cientifico}</p>
          {h.variedades && <p className="mt-1 text-[12px] text-slate-400">Variedades: {h.variedades}</p>}
          <p className="mt-2 text-sm text-slate-200 leading-relaxed">{h.resumen}</p>
        </div>
      </section>

      {/* Siembra */}
      <Bloque icon={Sprout} accent={c} titulo="Siembra">
        <Dato etiqueta="Cómo" valor={h.siembra.metodo} />
        <Dato etiqueta="Distancia" valor={h.siembra.distancia} />
        <Dato etiqueta="Profundidad" valor={h.siembra.profundidad} />
      </Bloque>

      {/* Clima: luz / agua / piso térmico */}
      <Bloque icon={Sun} accent={c} titulo="Luz, agua y piso térmico">
        <FilaIcono icon={Sun} texto={h.clima.luz} />
        <FilaIcono icon={Droplets} texto={h.clima.agua} />
        <FilaIcono icon={Mountain} texto={h.clima.piso} />
      </Bloque>

      {/* Vecinas (grafo) */}
      <Bloque icon={Users} accent={c} titulo="Con quién se lleva">
        <Vecinas titulo="Buenas vecinas" icon={Leaf} tono="emerald" lista={h.vecinasBuenas} />
        <Vecinas titulo="Malas vecinas" icon={Ban} tono="rose" lista={h.vecinasMalas} />
        <p className="mt-1 text-[10px] text-slate-500">Fuente: {h.fuentes.relaciones}</p>
      </Bloque>

      {/* Plagas y manejo agroecológico (grafo) */}
      <Bloque icon={Bug} accent={c} titulo="Plagas y manejo sin veneno">
        {tieneDato(h.plagas) ? (
          <div className="flex flex-col gap-2">
            {h.plagas.map((p) => (
              <div key={p.nombre} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
                <p className="text-[13px] font-semibold text-slate-100 flex items-center gap-1.5">
                  <Bug size={13} className="text-rose-300 shrink-0" aria-hidden="true" /> {p.nombre}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">Lo controlan</p>
                <ul className="mt-0.5 flex flex-col gap-0.5">
                  {p.controles.map((ctrl) => (
                    <li key={ctrl} className="text-[13px] text-emerald-200 flex items-start gap-1.5">
                      <ShieldCheck size={13} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden="true" />
                      <span>{ctrl}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <SinDato />
        )}

        {tieneDato(h.biopreparados) && (
          <div className="mt-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Biopreparados que le sirven</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {h.biopreparados.map((b) => (
                <span key={b} className="text-[12px] rounded-full border border-emerald-800/60 bg-emerald-950/40 px-2 py-0.5 text-emerald-200">{b}</span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onNavigate?.('biopreparados', { back: 'dashboard' })}
              className="mt-2 inline-flex items-center gap-1 text-[13px] text-emerald-300 underline underline-offset-2"
            >
              <FlaskConical size={13} aria-hidden="true" /> Ver las recetas paso a paso
              <ArrowRight size={12} aria-hidden="true" />
            </button>
          </div>
        )}
        <p className="mt-2 text-[10px] text-slate-500 flex items-start gap-1">
          <Info size={11} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>Manejo agroecológico: controladores vivos y biopreparados. Sin dosis químicas.</span>
        </p>
      </Bloque>

      {/* Cosecha */}
      <Bloque icon={Scissors} accent={c} titulo="Cosecha">
        <p className="text-sm text-slate-200 leading-relaxed">{h.cosecha}</p>
        <p className="mt-1 text-[10px] text-slate-500">Fuente: {h.fuentes.cosecha}</p>
      </Bloque>

      {/* Conservación */}
      <Bloque icon={Package} accent={c} titulo="Conservación">
        <p className="text-sm text-slate-200 leading-relaxed">{h.conservacion}</p>
        <button
          type="button"
          onClick={() => onNavigate?.('almacenamiento')}
          className="mt-2 inline-flex items-center gap-1 text-[13px] text-sky-300 underline underline-offset-2"
        >
          <Package size={13} aria-hidden="true" /> Guardar y conservar sin que se dañe
          <ArrowRight size={12} aria-hidden="true" />
        </button>
      </Bloque>

      <p className="text-[11px] text-slate-500 leading-relaxed">
        Ficha de cultivo: {h.fuentes.cultivo} · Los datos que aún no están en el grafo
        se muestran como "dato en camino".
      </p>
    </div>
  );
}

/* ─────────────────────────────── Piezas de UI ─────────────────────────────── */
function Bloque({ icon: Icono, accent, titulo, children }) {
  return (
    <section className={`rounded-2xl border ${accent.border} ${accent.bg} px-4 pt-3 pb-4`}>
      <h2 className={`text-[13px] uppercase tracking-wide font-bold flex items-center gap-1.5 ${accent.text}`}>
        <Icono size={15} aria-hidden="true" /> {titulo}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Dato({ etiqueta, valor }) {
  return (
    <p className="text-sm text-slate-200 leading-relaxed mb-1.5 last:mb-0">
      <span className="text-[11px] uppercase tracking-wide text-slate-500 mr-1">{etiqueta}:</span>
      {valor}
    </p>
  );
}

function FilaIcono({ icon: Icono, texto }) {
  return (
    <p className="text-sm text-slate-200 leading-relaxed mb-1.5 last:mb-0 flex items-start gap-2">
      <Icono size={15} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
      <span>{texto}</span>
    </p>
  );
}

function Vecinas({ titulo, icon: Icono, tono, lista }) {
  const c = COLOR_MAP[tono] || COLOR_MAP.slate;
  return (
    <div className="mb-2 last:mb-0">
      <p className={`text-[12px] font-semibold flex items-center gap-1.5 ${c.text}`}>
        <Icono size={13} aria-hidden="true" /> {titulo}
      </p>
      {tieneDato(lista) ? (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {lista.map((v) => (
            <span key={v} className={`text-[12px] rounded-full border ${c.border} px-2 py-0.5 text-slate-200`}>{v}</span>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-[12px] text-slate-500 italic">Dato en camino.</p>
      )}
    </div>
  );
}

function SinDato() {
  return (
    <p className="text-[13px] text-slate-400 italic flex items-start gap-1.5">
      <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{DATO_EN_CAMINO}</span>
    </p>
  );
}
