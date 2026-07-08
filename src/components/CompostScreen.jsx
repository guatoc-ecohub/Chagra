/* i18n (ADR-050): el copy user-facing va en español Colombia (voz campesina
 * paisa), pendiente de migrar a src/config/messages.js — misma deuda
 * preexistente que AguaScreen / PoscosechaScreen / EstiercolScreen. */
import React, { useState } from 'react';
import {
  Recycle, Layers, RefreshCw, ThermometerSun, Sprout, Leaf, Droplets, Wind,
  Flame, ShieldCheck, AlertTriangle, CheckCircle2, Camera, ExternalLink,
  ChevronRight, ArrowRight, Info, Worm,
} from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';
import './compost/compost.css';

/**
 * CompostScreen — "El compost, paso a paso" (entrada del mundo Estiércol y
 * compost). Hermana visual de AguaScreen: MISMO patrón "photo-forward" (foto
 * real de licencia abierta + scrim fijo + crédito + fallback a ícono), MISMO
 * cuaderno de campo. NO inventa un motor nuevo.
 *
 * La idea: el estiércol crudo quema la mata y apesta; compostado se vuelve la
 * mejor tierra de la finca — gratis. La pantalla lleva de la mano por la receta
 * en 5 pasos, con la seña para saber cuándo pasar al siguiente:
 *   1. Recoger   → juntar el estiércol y los restos.
 *   2. Mezclar   → capas de "café" (carbono) y "verde" (nitrógeno): la regla C:N.
 *   3. Voltear   → darle aire y agua para que caliente.
 *   4. Madurar   → esperar a que huela a tierra de monte.
 *   5. Aplicar   → repartirlo en la era o al pie de la mata.
 *
 * 2ª PASADA VISUAL (compost/compost.css): hero con Ken Burns lento, entrada
 * escalonada (anim-brota de motion.css), conector punteado que fluye entre los
 * pasos, "PilaViva" (SVG firma: el sánduche C:N dibujado con la regla real,
 * respirando con vapor y termómetro), llama que parpadea en el diagnóstico,
 * lombriz que ondula y foco accesible. Solo transform/opacity; TODO se apaga
 * con prefers-reduced-motion. Cero imágenes nuevas (bundle al tope).
 *
 * Grounding honesto: las cantidades van como REGLA DEL OJO (rangos de práctica
 * estándar de compostaje), no como cifra citada de una fuente puntual. Las
 * dosis exactas por cultivo se remiten al agente / al técnico, igual que en las
 * demás pantallas del mundo. Las fotos son CC de Wikimedia Commons (crédito
 * abajo, licencia abierta).
 */

/* ── Fotos reales (licencia abierta) — patrón "photo-forward" idéntico a Agua ──
 * Carpeta pública /estiercol-compost. El scrim oscuro es FIJO (no lo vira el
 * remapeo de temas claros) para que el texto encima quede legible al sol. */
const FOTO_BASE_COMPOST = '/estiercol-compost';
const CREDITOS_FOTOS_COMPOST = [
  { slug: 'hero', autor: 'Alandislands', lic: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Compost_heap_at_a_farmstead_i.jpg' },
  { slug: 'recoleccion', autor: 'DS Pugh', lic: 'CC BY-SA 2.0', url: 'https://commons.wikimedia.org/wiki/File:Manure_heap_north_of_Kexby_-_geograph.org.uk_-_8029333.jpg' },
  { slug: 'mezcla', autor: 'SuSanA Secretariat', lic: 'CC BY 2.0', url: 'https://commons.wikimedia.org/wiki/File:Compost_heaps_in_the_school_garden_(3110374120).jpg' },
  { slug: 'volteo', autor: 'SB Johnny', lic: 'CC BY-SA 3.0', url: 'https://commons.wikimedia.org/wiki/File:Flipping_hot_compost_pile_811.JPG' },
  { slug: 'madurez', autor: 'cogdogblog', lic: 'CC0', url: 'https://commons.wikimedia.org/wiki/File:Harvesting_Black_Gold_(2215617366).jpg' },
  { slug: 'aplicacion', autor: 'Red58bill', lic: 'Dominio público', url: 'https://commons.wikimedia.org/wiki/File:Compost.mulch.jpg' },
  { slug: 'lombriz', autor: 'Gordon Joly', lic: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Compost_with_worms.jpg' },
];
const creditoDe = (slug) => CREDITOS_FOTOS_COMPOST.find((c) => c.slug === slug)?.autor || '';

/**
 * PilaViva — SVG decorativo firma de la 2ª pasada: el sánduche de la pila
 * DIBUJADO con la regla real (capas café anchas, capas verde delgadas),
 * respirando al ritmo de la finca, con vapor y termómetro vivos (compost.css).
 * Cero bytes de imagen: puro SVG inline. Decorativo → aria-hidden; el texto
 * de la sección lleva el contenido.
 */
function PilaViva() {
  return (
    <figure className="my-3">
      <svg
        viewBox="0 0 260 150"
        className="w-full max-w-sm mx-auto block"
        aria-hidden="true"
        focusable="false"
      >
        {/* suelo */}
        <line x1="18" y1="133" x2="242" y2="133" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
        {/* la pila respira (origen abajo, solo transform) */}
        <g className="compost-pila">
          {/* capa café ancha (base) */}
          <path d="M40 132 L220 132 L208 114 L52 114 Z" fill="#92400e" opacity="0.75" />
          {/* capa verde delgada */}
          <path d="M52 114 L208 114 L200 106 L60 106 Z" fill="#059669" opacity="0.85" />
          {/* capa café ancha */}
          <path d="M60 106 L200 106 L188 88 L72 88 Z" fill="#b45309" opacity="0.7" />
          {/* capa verde delgada */}
          <path d="M72 88 L188 88 L180 80 L80 80 Z" fill="#10b981" opacity="0.85" />
          {/* copete café (tapa) */}
          <path d="M80 80 L180 80 Q130 52 80 80 Z" fill="#a16207" opacity="0.8" />
          {/* pajitas sueltas: textura de tamo */}
          <g stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round" opacity="0.4">
            <line x1="70" y1="124" x2="80" y2="120" />
            <line x1="150" y1="126" x2="162" y2="123" />
            <line x1="100" y1="97" x2="112" y2="94" />
            <line x1="165" y1="99" x2="175" y2="95" />
            <line x1="115" y1="70" x2="127" y2="66" />
          </g>
        </g>
        {/* vapor: la pila está caliente por dentro */}
        <g stroke="#e2e8f0" strokeWidth="2" fill="none" strokeLinecap="round">
          <path className="compost-vapor" d="M112 56 q-3 -6 0 -11 q3 -5 0 -10" />
          <path className="compost-vapor compost-vapor--b" d="M131 50 q-3 -6 0 -11 q3 -5 0 -10" />
          <path className="compost-vapor compost-vapor--c" d="M150 56 q-3 -6 0 -11 q3 -5 0 -10" />
        </g>
        {/* termómetro de finca: el mercurio late con la pila */}
        <g>
          <rect x="231" y="56" width="10" height="58" rx="5" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
          <rect className="compost-mercurio" x="234" y="60" width="4" height="50" rx="2" fill="#fb7185" />
          <circle cx="236" cy="121" r="8" fill="#fb7185" stroke="#64748b" strokeWidth="1.5" />
          <g stroke="#64748b" strokeWidth="1.2" strokeLinecap="round">
            <line x1="243" y1="66" x2="247" y2="66" />
            <line x1="243" y1="82" x2="247" y2="82" />
            <line x1="243" y1="98" x2="247" y2="98" />
          </g>
        </g>
      </svg>
      <figcaption className="text-center text-xs text-slate-400 leading-snug">
        La pila por dentro: capas anchas de café, capas delgadas de verde — y calientica.
      </figcaption>
    </figure>
  );
}

/**
 * FotoCompost — imagen a sangre con scrim inferior fijo, crédito de autor en la
 * esquina y fallback a un ícono. `children` va SOBRE la foto (títulos, badges).
 */
function FotoCompost({ slug, alt, ratio = 'aspect-[16/10]', rounded = '', Fallback = Recycle, children = null }) {
  const [ok, setOk] = useState(true);
  const credito = creditoDe(slug);
  const IconoFallback = Fallback;
  return (
    <div className={`relative overflow-hidden bg-slate-950 ${ratio} ${rounded}`}>
      {ok ? (
        <img
          src={`${FOTO_BASE_COMPOST}/${slug}.jpg`}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setOk(false)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
          <IconoFallback size={38} className="text-slate-700" />
        </div>
      )}
      {/* scrim fijo para legibilidad del texto/crédito sobre cualquier foto */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/5" aria-hidden="true" />
      {children}
      {credito && (
        <span className="absolute bottom-1 right-1.5 rounded bg-black/55 px-1 py-0.5 text-[9px] leading-none text-white/75">
          Foto: {credito}
        </span>
      )}
    </div>
  );
}

/* ── Datos de la pantalla (copy campesino, sin cifras citadas como fuente) ── */

/** La receta en 5 pasos — cada uno con su foto y su "seña" para saber que ya. */
const PASOS = [
  {
    n: 1,
    slug: 'recoleccion',
    Icon: Layers,
    kicker: 'Recoger',
    titulo: 'Junte lo que la finca ya bota',
    texto: 'Recoja la boñiga, la gallinaza, la porquinaza, la cama del corral y los restos de la cocina y la desyerba. Amontónelo en un rincón con sombra, cerquita del agua y lejos del pozo. Nada de eso es basura: es el arranque del abono.',
    sena: 'Junte un montón del tamaño de una cama de una plaza — más chiquito no calienta.',
    Fallback: Layers,
  },
  {
    n: 2,
    slug: 'mezcla',
    Icon: Leaf,
    kicker: 'Mezclar (la regla C:N)',
    titulo: 'Capas de "café" y "verde"',
    texto: 'Arme la pila por capas, como un sánduche: una de material café y seco (paja, tamo, hoja seca, aserrín, cascarilla) y encimita una delgada de material verde y húmedo (estiércol fresco, monte cortado, restos de cocina). Más o menos dos o tres partes de café por una de verde.',
    sena: 'Si al armarla queda solo verde, va a apestar; si queda solo café, no calienta. El sánduche parejo es la clave.',
    Fallback: Leaf,
  },
  {
    n: 3,
    slug: 'volteo',
    Icon: RefreshCw,
    kicker: 'Voltear y regar',
    titulo: 'Déle aire y agua: ahí calienta',
    texto: 'A los pocos días la pila calienta sola — esa es la vida trabajando. Voltéela cada 8 a 15 días para que el aire entre y todo se cocine parejo. Manténgala húmeda como esponja escurrida: que apenas gotee al apretarla, ni encharcada ni seca.',
    sena: 'Meta la mano (o un machete) al centro: si sale caliente y con vapor, va bien. Si se enfrió, es hora de voltear.',
    Fallback: ThermometerSun,
  },
  {
    n: 4,
    slug: 'madurez',
    Icon: ThermometerSun,
    kicker: 'Madurar',
    titulo: 'Espere a que huela a monte',
    texto: 'Cuando deja de calentar aunque la voltee, se pone oscura y desmenuzada, y ya no reconoce lo que echó, el compost está maduro. Por lo general entre dos y cuatro meses, según el clima: en tierra caliente es más ligero, en páramo se demora.',
    sena: 'La prueba: huele a tierra de monte fresca (no a podrido) y se desmorona en la mano como café molido. Eso es el oro negro.',
    Fallback: Sprout,
  },
  {
    n: 5,
    slug: 'aplicacion',
    Icon: Sprout,
    kicker: 'Aplicar',
    titulo: 'De vuelta a la tierra',
    texto: 'Riegue el compost maduro en la era antes de sembrar, o al pie de la mata como una manta delgada, y tápelo con un poquito de hojarasca para que no se seque al sol. Alimenta la tierra despacio y la vuelve esponja que guarda el agua.',
    sena: 'Un puñado generoso por mata o una capa de dos o tres dedos en la era rinde harto. La dosis fina por cultivo, pregúntesela al agente.',
    Fallback: Sprout,
  },
];

/** Materiales locales para la regla del café y el verde (C:N). */
const MATERIALES = {
  cafe: {
    titulo: 'Café — lo seco (carbono)',
    sub: 'Da estructura y aire. Es la mayor parte.',
    lista: ['Paja y tamo de trigo o cebada', 'Hoja seca y hojarasca', 'Cascarilla de arroz o café', 'Aserrín y viruta (sin tratar)', 'Tusa y caña picada', 'Cartón y papel sin tinta brillante'],
    Icon: Leaf,
  },
  verde: {
    titulo: 'Verde — lo húmedo (nitrógeno)',
    sub: 'Es la comida de los bichos. Va poquito.',
    lista: ['Estiércol fresco (boñiga, gallinaza)', 'Monte y desyerba recién cortada', 'Restos de cocina (cáscaras, sobras vegetales)', 'Pulpa de café', 'Suero de leche (poquito)', 'Estopa de frijol o arveja verde'],
    Icon: Droplets,
  },
};

/** Diagnóstico rápido: la pila avisa cuando algo va mal. */
const SENALES = [
  {
    Icon: Wind,
    sintoma: 'Huele a podrido o a orines',
    causa: 'Falta aire o hay mucho verde y agua.',
    arreglo: 'Voltéela y métale material café seco (paja, aserrín). El olfeo se va en un par de días.',
    tono: 'rose',
  },
  {
    Icon: Flame,
    anim: 'compost-llama',
    sintoma: 'No calienta ni con volteo',
    causa: 'Está seca, muy pequeña o le falta verde.',
    arreglo: 'Riéguela hasta esponja escurrida, agrándela y súmele estiércol o monte verde.',
    tono: 'amber',
  },
  {
    Icon: Droplets,
    sintoma: 'Sale mazamorra y escurre agua',
    causa: 'Se pasó de agua o de lluvia encima.',
    arreglo: 'Destápela al sol un rato, mézclele café seco y tápela para que la lluvia no le caiga directo.',
    tono: 'sky',
  },
];

/** Estiércoles: cada animal da uno distinto (honesto, sin cifras inventadas). */
const ESTIERCOLES = [
  { animal: 'Gallinaza', nota: 'La más "caliente" y fuerte. Cruda quema la mata: hay que compostarla o secarla bien antes.' },
  { animal: 'Porquinaza', nota: 'Rica pero muy húmeda y puede traer patógenos: compóstela caliente, nunca cruda en hoja que se come.' },
  { animal: 'Boñiga (bovino)', nota: 'La más suave y noble. Buena base para la pila; igual mejora compostada.' },
  { animal: 'Caballaza y conejaza', nota: 'Livianas y con harta paja: prenden rápido la pila y calientan bien.' },
];

const TONOS = {
  rose: { border: 'border-rose-700/50', bg: 'bg-rose-950/25', text: 'text-rose-300', chip: 'bg-rose-500/20 text-rose-200' },
  amber: { border: 'border-amber-700/50', bg: 'bg-amber-950/25', text: 'text-amber-300', chip: 'bg-amber-500/20 text-amber-200' },
  sky: { border: 'border-sky-700/50', bg: 'bg-sky-950/25', text: 'text-sky-300', chip: 'bg-sky-500/20 text-sky-200' },
};

/* ═══════════════════════════════ Componente ═══════════════════════════════ */
/**
 * @param {Object} props
 * @param {() => void} [props.onBack]     volver al mundo Estiércol y compost.
 * @param {() => void} [props.onHome]     volver al inicio.
 * @param {(view: string, data?: any) => void} [props.onNavigate]
 */
export default function CompostScreen({ onBack, onHome, onNavigate }) {
  return (
    <ScreenShell title="El compost, paso a paso" icon={Recycle} onBack={onBack} onHome={onHome}>
      <div className="compost-screen max-w-2xl mx-auto px-4 pt-4 pb-10 flex flex-col gap-5">

        {/* Hero photo-forward — Ken Burns lento sobre la MISMA foto (compost.css) */}
        <section
          className="compost-hero anim-brota rounded-2xl border border-lime-800/40 overflow-hidden bg-slate-900/60"
          style={{ '--i': 0 }}
        >
          <FotoCompost
            slug="hero"
            alt="Pila de compost en una finca, con capas de estiércol y monte sobre el pasto"
            ratio="aspect-[16/9]"
            Fallback={Recycle}
          >
            <div className="absolute inset-0 flex flex-col justify-end p-4 pb-5">
              <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-lime-200">
                <Recycle size={14} aria-hidden="true" /> Nada se pierde en la finca
              </p>
              <h2 className="mt-0.5 text-2xl sm:text-3xl font-black text-white leading-none drop-shadow-lg">
                Del corral a la tierra negra
              </h2>
            </div>
          </FotoCompost>
        </section>

        {/* Gancho corto — por qué compostar */}
        <p className="anim-brota text-[15px] leading-relaxed text-slate-200" style={{ '--i': 1 }}>
          El estiércol crudo <span className="font-semibold text-white">quema la mata y apesta</span>. Pero dejándolo
          madurar con un poco de maña se vuelve el <span className="font-semibold text-lime-300">mejor abono de la finca</span> —
          y no cuesta un peso. Aquí va la receta, con la seña para saber cuándo pasar al siguiente paso.
        </p>

        {/* ── La receta en 5 pasos (photo-forward) ── */}
        <section aria-labelledby="compost-receta">
          <h2 id="compost-receta" className="flex items-center gap-2 text-base font-black text-slate-100 mb-3">
            <Sprout size={18} className="text-lime-300" aria-hidden="true" /> La receta en 5 pasos
          </h2>
          <ol className="flex flex-col">
            {PASOS.map((p, idx) => (
              <li key={p.n} className="flex flex-col">
                {/* Conector punteado que "escurre" hacia el paso siguiente (compost.css) */}
                {p.n > 1 && (
                  <div className="flex justify-center py-0.5" aria-hidden="true">
                    <svg width="10" height="26" viewBox="0 0 10 26" className="text-lime-500/60" focusable="false">
                      <line x1="5" y1="1" x2="5" y2="25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="compost-flujo" />
                    </svg>
                  </div>
                )}
                <article
                  className="compost-paso anim-brota rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden"
                  style={{ '--i': idx + 2 }}
                >
                  <FotoCompost slug={p.slug} alt={`Paso ${p.n}: ${p.titulo}`} ratio="aspect-[16/9]" Fallback={p.Fallback}>
                    <div className="absolute inset-0 flex items-end p-3">
                      <span className="flex items-center gap-2">
                        <span className="grid place-items-center w-9 h-9 rounded-full bg-lime-500 text-slate-950 text-lg font-black shrink-0 shadow-lg shadow-lime-500/25 ring-2 ring-lime-200/40">
                          {p.n}
                        </span>
                        <span className="flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-lime-200">
                          <p.Icon size={13} aria-hidden="true" /> {p.kicker}
                        </span>
                      </span>
                    </div>
                  </FotoCompost>
                  <div className="p-4">
                    <h3 className="text-base font-black text-white leading-tight">{p.titulo}</h3>
                    <p className="mt-1.5 text-sm text-slate-300 leading-relaxed">{p.texto}</p>
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-lime-800/40 border-l-2 border-l-lime-400/80 bg-lime-950/25 p-2.5">
                      <CheckCircle2 size={16} className="text-lime-300 shrink-0 mt-0.5" aria-hidden="true" />
                      <p className="text-[13px] leading-snug text-lime-100/90">
                        <span className="font-bold text-lime-200">La seña: </span>{p.sena}
                      </p>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ol>
        </section>

        {/* ── La regla del café y el verde (C:N) ── */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="flex items-center gap-2 text-base font-black text-slate-100">
            <Layers size={18} className="text-amber-300" aria-hidden="true" /> La regla del café y el verde
          </h2>
          <p className="mt-1.5 text-sm text-slate-300 leading-relaxed">
            Los técnicos le dicen "relación carbono–nitrógeno". En campesino: mezcle harto{' '}
            <span className="font-semibold text-amber-200">café y seco</span> con poquito{' '}
            <span className="font-semibold text-emerald-200">verde y húmedo</span>. Ese equilibrio es el que hace
            que caliente sin apestar.
          </p>
          <PilaViva />
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[MATERIALES.cafe, MATERIALES.verde].map((m, i) => {
              const Icono = m.Icon;
              const esCafe = i === 0;
              return (
                <div
                  key={m.titulo}
                  className={`rounded-xl border p-3 ${esCafe ? 'border-amber-800/40 bg-amber-950/20' : 'border-emerald-800/40 bg-emerald-950/20'}`}
                >
                  <h3 className={`flex items-center gap-1.5 text-sm font-black ${esCafe ? 'text-amber-200' : 'text-emerald-200'}`}>
                    <Icono size={15} aria-hidden="true" /> {m.titulo}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400 leading-snug">{m.sub}</p>
                  <ul className="mt-2 flex flex-col gap-1">
                    {m.lista.map((x) => (
                      <li key={x} className="flex items-start gap-1.5 text-[13px] text-slate-300 leading-snug">
                        <span className={`mt-1.5 h-1 w-1 rounded-full shrink-0 ${esCafe ? 'bg-amber-400' : 'bg-emerald-400'}`} aria-hidden="true" />
                        {x}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[13px] text-slate-400 leading-snug">
            <Info size={13} className="inline mr-1 -mt-0.5 text-slate-500" aria-hidden="true" />
            Regla del ojo: <span className="text-slate-200 font-semibold">dos o tres puños de café por uno de verde</span>. No es
            matemática de laboratorio; la pila le avisa si se pasó.
          </p>
        </section>

        {/* ── Cuando la pila avisa que algo va mal ── */}
        <section aria-labelledby="compost-senales">
          <h2 id="compost-senales" className="flex items-center gap-2 text-base font-black text-slate-100 mb-3">
            <AlertTriangle size={18} className="text-amber-300" aria-hidden="true" /> Cuando la pila reclama
          </h2>
          <div className="flex flex-col gap-3">
            {SENALES.map((s) => {
              const t = TONOS[s.tono];
              const Icono = s.Icon;
              return (
                <div key={s.sintoma} className={`rounded-2xl border ${t.border} ${t.bg} p-4`}>
                  <h3 className={`flex items-center gap-2.5 text-sm font-black ${t.text}`}>
                    <span className={`grid place-items-center w-8 h-8 rounded-lg shrink-0 ${t.chip}`}>
                      <Icono size={16} className={s.anim || ''} aria-hidden="true" />
                    </span>
                    {s.sintoma}
                  </h3>
                  <p className="mt-1 text-[13px] text-slate-400 leading-snug">
                    <span className="font-semibold text-slate-300">Por qué: </span>{s.causa}
                  </p>
                  <p className="mt-1.5 text-sm text-slate-200 leading-snug">
                    <span className="font-bold text-slate-100">Arréglelo: </span>{s.arreglo}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Cada estiércol es distinto ── */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="flex items-center gap-2 text-base font-black text-slate-100">
            <Recycle size={18} className="text-lime-300" aria-hidden="true" /> Cada estiércol es distinto
          </h2>
          <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ESTIERCOLES.map((e) => (
              <li key={e.animal} className="rounded-xl border border-slate-700/50 border-l-2 border-l-lime-600/50 bg-slate-800/30 p-3">
                <p className="text-sm font-bold text-slate-100">{e.animal}</p>
                <p className="text-[13px] text-slate-300 leading-snug mt-0.5">{e.nota}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Lombricompost (bonus, photo-forward) ── */}
        <section className="rounded-2xl border border-fuchsia-800/40 bg-fuchsia-950/15 overflow-hidden">
          <FotoCompost
            slug="lombriz"
            alt="Lombrices rojas trabajando el compost entre restos orgánicos"
            ratio="aspect-[16/10]"
            Fallback={Worm}
          >
            <div className="absolute inset-0 flex flex-col justify-end p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-fuchsia-200">
                <Worm size={14} className="compost-lombriz" aria-hidden="true" /> Con ayudantes
              </p>
              <h2 className="text-lg font-black text-white leading-tight drop-shadow">El lombricompost, el más fino</h2>
            </div>
          </FotoCompost>
          <div className="p-4">
            <p className="text-sm text-slate-300 leading-relaxed">
              La lombriz roja californiana se come el material y lo saca hecho <span className="font-semibold text-fuchsia-200">humus</span>,
              el abono más suave y concentrado. Déle sombra y humedad, y aliméntela con material ya medio compostado (no
              caliente). Ojo: poquito cítrico, cebolla o ají, que no les gusta.
            </p>
          </div>
        </section>

        {/* ── Ojo con la salud (seguridad honesta) ── */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="flex items-center gap-2 text-base font-black text-slate-100">
            <ShieldCheck size={18} className="text-emerald-300" aria-hidden="true" /> Ojo con la salud
          </h2>
          <ul className="mt-2 flex flex-col gap-2 text-sm text-slate-300 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="mt-2 h-1 w-1 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
              <span className="min-w-0">El calor de la pila (bien volteada) mata los patógenos. Por eso <span className="font-semibold text-slate-100">no se aplica estiércol crudo</span> a lo que se come en hoja cruda.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-2 h-1 w-1 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
              <span className="min-w-0">Arme la pila lejos y aguas abajo del pozo o la quebrada, para que el escurrido no llegue al agua.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-2 h-1 w-1 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
              <span className="min-w-0">Lávese bien las manos después de manejar estiércol fresco.</span>
            </li>
          </ul>
        </section>

        {/* ── Puentes al mundo (agente + biodigestor/olores) ── */}
        {onNavigate ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3">
            <p className="text-xs uppercase tracking-wide font-bold text-slate-400 mb-2">También en este mundo</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => onNavigate('estiercol')}
                className="compost-puente anim-press w-full text-left rounded-xl border border-slate-700/60 bg-slate-800/40 p-3 flex items-center gap-3 hover:border-lime-700/60 hover:bg-slate-800/70 transition-colors motion-reduce:transition-none"
              >
                <Flame size={20} className="shrink-0 text-lime-300" aria-hidden="true" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-slate-100 leading-tight">Del corral al abono</span>
                  <span className="block text-xs text-slate-400 leading-snug">Quítele el olor a la gallinaza, sáquele gas con el biodigestor y saque cuentas.</span>
                </span>
                <ChevronRight size={18} className="compost-puente-flecha text-slate-500 shrink-0" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('agente', { prompt: '¿Cómo hago compost con el estiércol de mis animales y cuánto le echo a cada mata?' })}
                className="compost-puente anim-press w-full text-left rounded-xl border border-slate-700/60 bg-slate-800/40 p-3 flex items-center gap-3 hover:border-lime-700/60 hover:bg-slate-800/70 transition-colors motion-reduce:transition-none"
              >
                <Sprout size={20} className="shrink-0 text-lime-300" aria-hidden="true" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-slate-100 leading-tight">Pregúntele a Chagra</span>
                  <span className="block text-xs text-slate-400 leading-snug">La dosis fina de compost para su cultivo y su clima.</span>
                </span>
                <ArrowRight size={18} className="compost-puente-flecha text-slate-500 shrink-0" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : null}

        {/* Créditos de las fotos — cumplimiento de licencia abierta */}
        <CreditosFotos />
      </div>
    </ScreenShell>
  );
}

/** Créditos de las fotos — cumplimiento de licencia abierta (patrón Agua/Suelo). */
function CreditosFotos() {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3" data-testid="compost-creditos-fotos">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="w-full flex items-center gap-2 text-left"
      >
        <Camera size={15} className="text-slate-400 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-xs font-bold text-slate-300">Créditos de las fotos (licencia abierta)</span>
        <ChevronRight size={16} className={`text-slate-500 transition-transform ${abierto ? 'rotate-90' : ''}`} aria-hidden="true" />
      </button>
      {abierto && (
        <ul className="mt-2.5 pt-2.5 border-t border-slate-700/60 flex flex-col gap-1.5">
          {CREDITOS_FOTOS_COMPOST.map((cr) => (
            <li key={cr.slug} className="text-[11px] leading-snug text-slate-400">
              <a
                href={cr.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-slate-200 hover:text-white underline decoration-slate-600 underline-offset-2 inline-flex items-center gap-0.5"
              >
                {cr.slug}<ExternalLink size={10} className="inline shrink-0" aria-hidden="true" />
              </a>
              <span className="text-slate-500"> — {cr.autor} · {cr.lic} · Wikimedia Commons</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
