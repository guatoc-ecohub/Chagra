/* i18n (ADR-050): etiquetas user-facing en español Colombia pendientes de migrar
 * a src/config/messages.js. Misma deuda preexistente que HortalizasScreen y
 * App.jsx; se desactiva la regla soft a nivel de archivo. */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import { useState } from 'react';
import {
  ChevronLeft, Sprout, Sun, Droplets, Mountain, Bug, ShieldCheck,
  Leaf, Ban, Scissors, Package, Info, FlaskConical, ArrowRight, Users,
  Shovel, Camera, Utensils, ExternalLink,
} from 'lucide-react';
import { TUBERCULOS, getTuberculo, tieneDato, DATO_EN_CAMINO, FUENTES_INSTITUCIONALES } from '../services/tuberculosData';
import { LaminaSiembra, LaminaAporque } from '../visual/laminas';

/**
 * TuberculosScreen — mini-app "Tubérculos y raíces" (mundo Cultivos y semillas).
 *
 * El pancoger de raíz de la finca colombiana: papa y papa criolla, yuca,
 * arracacha, ñame, batata (camote) y los tubérculos de altura oca/hibia,
 * cubio/mashua y ulluco/chugua. Cada uno abre una ficha didáctica de CULTIVO:
 * cómo se siembra (casi ninguno de semilla — tubérculo-semilla, esqueje/estaca o
 * colino), luz/agua/piso térmico, aporque, vecinas, plagas y su manejo
 * agroecológico, cosecha y conservación/curado.
 *
 * GROUNDING: vecinas + plagas + manejo salen del grafo chagra_kg
 * (public/grafo-relations.json, congelado en src/services/tuberculosData.js). La
 * ficha de cultivo (siembra, distancias, aporque, curado) es conocimiento
 * estándar del pancoger andino (SENA/Agrosavia/ICA/FAO). Donde el grafo no tiene
 * el dato, se muestra "dato en camino" — CERO invención, y NUNCA dosis químicas
 * (solo biocontroladores y biopreparados por nombre; las recetas viven en el
 * mundo Biopreparados).
 *
 * Identidad: cuaderno de campo, hermana photo-forward de HortalizasScreen. Foto
 * real por tubérculo con crédito CC visible (ver /public/tuberculos/creditos.json,
 * espejado abajo); si la foto falta, cae a un ícono.
 */

/* ── Créditos de foto (espejo de /public/tuberculos/creditos.json). Requisito de
 *    las licencias CC-BY: autor + licencia + enlace a la fuente, siempre visibles. */
const FOTOS = {
  'hero': { autor: 'Sonqoqosqo', licencia: 'CC BY-SA 4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:BIODIVERSIDAD_DE_TUBERCULOS_ANDINOS.jpeg', alt: 'Variedad de tubérculos andinos de colores recién cosechados.' },
  'papa': { autor: 'Narek75', licencia: 'CC BY-SA 4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Potato_Harvest_in_Armenia_2456764.jpg', alt: 'Cosecha de papa recién arrancada en el surco.' },
  'papa-criolla': { autor: 'Caldobasico', licencia: 'CC BY-SA 4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Papa_criolla_1.jpg', alt: 'Papa criolla amarilla colombiana en montón.' },
  'yuca': { autor: 'Neil Palmer', licencia: 'CC BY-SA 4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:VitA_Cassava.jpg', alt: 'Raíces de yuca peladas mostrando la pulpa.' },
  'arracacha': { autor: 'Germarquezm', licencia: 'CC BY-SA 3.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Arracacia_xanthorrhiza_supermarket.jpg', alt: 'Raíces de arracacha amarilla en exhibición.' },
  'name': { autor: 'Obsidian Soul', licencia: 'CC BY-SA 3.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Dioscorea_alata_-_Purple_yam_tuber_-_Mindanao,_Philippines.jpg', alt: 'Tubérculo de ñame partido mostrando su interior.' },
  'batata': { autor: 'Jesús Eduardo Arteaga Flores', licencia: 'CC BY-SA 4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Camotes_Chicontepectl,_Veracruz.jpg', alt: 'Batatas (camotes) cosechados en montón.' },
  'oca': { autor: 'Ceseonico', licencia: 'CC BY-SA 4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Oca_(Oxalis_tuberosa).jpg', alt: 'Tubérculos de oca de colores rosados y amarillos.' },
  'cubio': { autor: 'Michael Hermann', licencia: 'CC BY-SA 4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Mashua_tuber_diversity_Peru_(Tropaeolum_tuberosum).JPG', alt: 'Diversidad de tubérculos de cubio (mashua).' },
  'ulluco': { autor: 'Carlo Brescia', licencia: 'CC BY-SA 4.0', fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Lingli,_Ullucus_tuberosus.jpg', alt: 'Tubérculos de ulluco lisos y de colores.' },
};

/* Foto real con crédito CC visible. La franja de crédito es opaca para leerse al
 * sol y contrastar sobre cualquier imagen. Si la foto no carga, cae a un ícono. */
function Foto({ slug, ratio = 'aspect-[16/10]', className = '', objectPos = 'object-center', Fallback = Sprout }) {
  const c = FOTOS[slug];
  const [ok, setOk] = useState(true);
  if (!c) return null;
  const IconoFallback = Fallback;
  return (
    <figure className={`relative overflow-hidden rounded-xl border border-slate-800 bg-slate-800 ${className}`}>
      {ok ? (
        <img
          src={`/tuberculos/${slug}.jpg`}
          alt={c.alt}
          loading="lazy"
          decoding="async"
          onError={() => setOk(false)}
          className={`w-full ${ratio} object-cover ${objectPos}`}
        />
      ) : (
        <div className={`w-full ${ratio} grid place-items-center bg-slate-900`} aria-hidden="true">
          <IconoFallback size={36} className="text-slate-700" />
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

/* Clases LITERALES por acento (Tailwind JIT no ve strings construidos). */
const COLOR_MAP = {
  emerald: { text: 'text-emerald-300', border: 'border-emerald-700/50', bg: 'bg-emerald-950/30', dot: 'bg-emerald-400' },
  lime: { text: 'text-lime-300', border: 'border-lime-700/50', bg: 'bg-lime-950/30', dot: 'bg-lime-400' },
  amber: { text: 'text-amber-300', border: 'border-amber-700/50', bg: 'bg-amber-950/30', dot: 'bg-amber-400' },
  rose: { text: 'text-rose-300', border: 'border-rose-700/50', bg: 'bg-rose-950/30', dot: 'bg-rose-400' },
  slate: { text: 'text-slate-300', border: 'border-slate-700/50', bg: 'bg-slate-900/50', dot: 'bg-slate-500' },
};

/* Las tres formas de sembrar un tubérculo (didáctico, hub). Conocimiento estándar
 * de pancoger; el detalle por cultivo va en cada ficha. */
const FORMAS_SIEMBRA = [
  { icon: Sprout, titulo: 'Tubérculo-semilla', desc: 'La papa, la criolla, la oca, el cubio y el ulluco se siembran del mismo tubérculo brotado. El ñame, de un pedazo con yema.' },
  { icon: Leaf, titulo: 'Esqueje o estaca', desc: 'La yuca sale de un trozo de tallo (estaca/cangre). La batata, de un bejuco (guía) con nudos. Nada de semilla.' },
  { icon: Shovel, titulo: 'Colino (hijuelo)', desc: 'La arracacha se siembra de los hijuelos del cuello de la mata madre, curados al sol antes de ir a tierra.' },
];

/* ═══════════════════════════════ Componente ═══════════════════════════════ */
/**
 * @param {Object} props
 * @param {() => void} props.onBack
 * @param {(view: string, data?: any) => void} [props.onNavigate]
 */
export default function TuberculosScreen({ onBack, onNavigate }) {
  const [selId, setSelId] = useState(/** @type {string|null} */ (null));
  const sel = selId ? getTuberculo(selId) : null;

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
          <h1 className="text-lg font-bold leading-tight text-white">Tubérculos y raíces</h1>
          <p className="text-xs text-slate-400 leading-tight">
            {sel ? `${sel.nombre} · ${sel.cientifico}` : 'El pancoger de raíz: cómo sembrarlo, cuidarlo y guardarlo.'}
          </p>
        </div>
      </header>

      <div className="px-4 pb-10">
        {sel
          ? <Ficha t={sel} onNavigate={onNavigate} />
          : <Hub onSel={setSelId} />}
      </div>
    </div>
  );
}

/* ─────────────────────────────────── Hub ─────────────────────────────────── */
function Hub({ onSel }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Gancho: el pancoger de raíz */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <Foto slug="hero" ratio="aspect-[16/9]" className="rounded-none border-0 border-b border-slate-800" Fallback={Sprout} />
        <div className="px-4 pt-3 pb-4">
          <p className="text-[13px] uppercase tracking-wide font-bold text-slate-400">El pancoger de raíz</p>
          <p className="mt-1 text-[15px] text-slate-100 leading-snug">
            La comida de fondo de la olla campesina, la que llena y se guarda: cada tubérculo con su ficha de cultivo —
            <span className="font-bold text-amber-300"> siembra, aporque, plagas y cosecha</span>.
          </p>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Las vecinas y las plagas con su manejo agroecológico salen del grafo de la finca. Donde todavía
            no hay dato, se lo decimos claro — sin inventar dosis ni recetas.
          </p>
        </div>
      </section>

      {/* Cómo se siembra un tubérculo (casi ninguno de semilla) */}
      <section className="rounded-2xl border border-lime-800/40 bg-lime-950/15 px-4 pt-3 pb-4">
        <h2 className="text-[13px] uppercase tracking-wide font-bold flex items-center gap-1.5 text-lime-300">
          <Sprout size={15} aria-hidden="true" /> Casi ninguno se siembra de semilla
        </h2>
        <p className="mt-1.5 text-sm text-slate-300 leading-relaxed">
          Los tubérculos y raíces se siembran de un pedazo de la misma mata. Estas son las tres formas:
        </p>
        {/* Lámina propia (SVG de cuaderno de campo): las tres formas de siembra en corte. */}
        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/40 px-2 py-2">
          <LaminaSiembra />
          <div className="mt-0.5 grid grid-cols-3 gap-1 text-center text-[10px] font-semibold text-lime-200/90">
            <span>Tubérculo-semilla</span>
            <span>Esqueje / estaca</span>
            <span>Colino</span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {FORMAS_SIEMBRA.map((f) => {
            const Icono = f.icon;
            return (
              <div key={f.titulo} className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2.5">
                <p className="text-[13px] font-bold text-lime-200 flex items-center gap-1.5">
                  <Icono size={14} className="shrink-0" aria-hidden="true" /> {f.titulo}
                </p>
                <p className="mt-1 text-[12px] text-slate-400 leading-snug">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Grilla de tubérculos — photo-forward */}
      <div className="grid grid-cols-2 gap-3">
        {TUBERCULOS.map((t) => {
          const c = COLOR_MAP[t.accent] || COLOR_MAP.slate;
          return (
            <button
              key={t.id}
              type="button"
              data-testid={`tuberculo-${t.id}`}
              onClick={() => onSel(t.id)}
              className={`group text-left rounded-2xl border ${c.border} bg-slate-900/60 overflow-hidden hover:bg-slate-900 transition-colors`}
            >
              <Foto slug={t.foto} ratio="aspect-[4/3]" className="rounded-none border-0" />
              <div className="px-3 pt-2 pb-3">
                <p className="text-[15px] font-bold text-white leading-tight">
                  <span aria-hidden="true">{t.emoji}</span> {t.nombre}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400 leading-snug line-clamp-2">{t.resumen}</p>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed">
        Fotos con licencia Creative Commons (autor + licencia visibles). Datos de cultivo:
        pancoger andino SENA / Agrosavia / ICA / FAO. Vecinas y plagas: grafo Chagra.
      </p>
    </div>
  );
}

/* ─────────────────────────── Ficha de un tubérculo ─────────────────────────── */
function Ficha({ t, onNavigate }) {
  const c = COLOR_MAP[t.accent] || COLOR_MAP.slate;
  return (
    <div className="flex flex-col gap-4">
      {/* Portada */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <Foto slug={t.foto} ratio="aspect-[16/9]" className="rounded-none border-0 border-b border-slate-800" />
        <div className="px-4 pt-3 pb-4">
          <p className="text-xl font-bold text-white leading-tight">
            <span aria-hidden="true">{t.emoji}</span> {t.nombre}
          </p>
          <p className={`mt-0.5 text-xs italic ${c.text}`}>{t.cientifico}</p>
          {t.variedades && <p className="mt-1 text-[12px] text-slate-400">Variedades: {t.variedades}</p>}
          <p className="mt-2 text-sm text-slate-200 leading-relaxed">{t.resumen}</p>
        </div>
      </section>

      {/* Siembra */}
      <Bloque icon={Sprout} accent={c} titulo="Siembra">
        <Dato etiqueta="Cómo" valor={t.siembra.metodo} />
        <Dato etiqueta="Distancia" valor={t.siembra.distancia} />
        <Dato etiqueta="Profundidad" valor={t.siembra.profundidad} />
      </Bloque>

      {/* Clima: luz / agua / piso térmico */}
      <Bloque icon={Sun} accent={c} titulo="Luz, agua y piso térmico">
        <FilaIcono icon={Sun} texto={t.clima.luz} />
        <FilaIcono icon={Droplets} texto={t.clima.agua} />
        <FilaIcono icon={Mountain} texto={t.clima.piso} />
      </Bloque>

      {/* Aporque — propio de los tubérculos */}
      <Bloque icon={Shovel} accent={c} titulo="Aporque">
        {/* Lámina propia (SVG en corte): arrimar tierra al pie tapa el cuello. */}
        <div className="mb-2.5 rounded-xl border border-slate-800 bg-slate-950/40 px-2 py-2">
          <LaminaAporque />
        </div>
        <p className="text-sm text-slate-200 leading-relaxed">{t.aporque}</p>
      </Bloque>

      {/* Vecinas (grafo) */}
      <Bloque icon={Users} accent={c} titulo="Con quién se lleva">
        <Vecinas titulo="Buenas vecinas" icon={Leaf} tono="emerald" lista={t.vecinasBuenas} />
        <Vecinas titulo="Malas vecinas" icon={Ban} tono="rose" lista={t.vecinasMalas} />
        <p className="mt-1 text-[10px] text-slate-500">Fuente: {t.fuentes.relaciones}</p>
      </Bloque>

      {/* Plagas y manejo agroecológico (grafo) */}
      <Bloque icon={Bug} accent={c} titulo="Plagas y manejo sin veneno">
        {tieneDato(t.plagas) ? (
          <div className="flex flex-col gap-2">
            {t.plagas.map((p) => (
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

        {tieneDato(t.biopreparados) && (
          <div className="mt-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Biopreparados que le sirven</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {t.biopreparados.map((b) => (
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
        <p className="text-sm text-slate-200 leading-relaxed">{t.cosecha}</p>
      </Bloque>

      {/* Usos en la cocina y la casa */}
      {t.usos && (
        <Bloque icon={Utensils} accent={c} titulo="Usos">
          <p className="text-sm text-slate-200 leading-relaxed">{t.usos}</p>
        </Bloque>
      )}

      {/* Conservación / curado */}
      <Bloque icon={Package} accent={c} titulo="Conservación y curado">
        <p className="text-sm text-slate-200 leading-relaxed">{t.conservacion}</p>
        <button
          type="button"
          onClick={() => onNavigate?.('almacenamiento')}
          className="mt-2 inline-flex items-center gap-1 text-[13px] text-sky-300 underline underline-offset-2"
        >
          <Package size={13} aria-hidden="true" /> Guardar y conservar sin que se dañe
          <ArrowRight size={12} aria-hidden="true" />
        </button>
      </Bloque>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 pt-3 pb-4">
        <p className="text-[11px] uppercase tracking-wide font-bold text-slate-400 flex items-center gap-1.5">
          <Info size={13} aria-hidden="true" /> Fuentes
        </p>
        <p className="mt-1.5 text-[11px] text-slate-500 leading-relaxed">
          Ficha de cultivo: {t.fuentes.cultivo} · Las relaciones (vecinas y plagas) salen del grafo Chagra;
          los datos que aún no están se muestran como "dato en camino".
        </p>
        <p className="mt-2 text-[11px] text-slate-500">Manejo integrado de plagas (MIP) y sanidad — instituciones de referencia:</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {FUENTES_INSTITUCIONALES.map((f) => (
            <a
              key={f.sigla}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              title={f.nombre}
              className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-[12px] text-sky-300 underline decoration-slate-600 underline-offset-2 hover:bg-slate-900"
            >
              <ExternalLink size={11} className="shrink-0" aria-hidden="true" /> {f.sigla}
            </a>
          ))}
        </div>
      </div>
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
