import React from 'react';
import {
  Hexagon, Flower2, ShieldAlert, Recycle, Info, Droplets,
  Sprout, Leaf, AlertTriangle, ArrowRight, CheckCircle2, Home as HomeIcon,
  MessageCircleQuestion,
} from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';
import FuentesAnimal from './common/FuentesAnimal';
import ChecklistManejo from './common/ChecklistManejo';
import graphStats from '../data/graph-stats-snapshot.json';

/**
 * AbejasScreen — mundo/pantalla "Abejas y polinización" (vertical del mundo
 * Animales, ruta `animales_abejas`).
 *
 * Enfoque PHOTO-FORWARD, al estilo de AguaScreen/EstiercolScreen: cada bloque
 * entra por una foto real con licencia Creative Commons y su atribución, y
 * baja a acción campesina concreta. Voz en usted (registro campesino del app).
 *
 * Qué cubre (encargo del operador):
 *   1. Por qué el polinizador es vital — cuánto rinde MÁS un cultivo polinizado.
 *   2. Abejas nativas SIN aguijón (meliponas — angelita) vs la abeja de miel.
 *   3. Cómo hacer la finca amiga de polinizadores (flores todo el año, no
 *      fumigar en floración, agua, refugios).
 *   4. Meliponicultura básica (criar abeja nativa: miel medicinal + polinización).
 *   5. Amenazas (agroquímicos, pérdida de hábitat) y qué hacer.
 *
 * CERO invención de datos de especie: la comparación angelita/Apis se ancla en
 * animal-diagnostics.json (FEDEABEJA, ICA); el conteo de relaciones de
 * polinización sale del grafo (graph-stats-snapshot.json → aristas POLINIZA);
 * las cifras globales se atribuyen a FAO/IPBES; lo numérico por cultivo que aún
 * no está anclado se marca "dato en camino" en vez de inventarse.
 *
 * Fotos CC en public/abejas/ (+ creditos.json con la atribución canónica). Las
 * credenciales se replican aquí embebidas para renderizar el pie sin fetch.
 */

/* ── Atribución de cada foto (espejo de public/abejas/creditos.json) ──
 * Se guarda embebida para pintar el pie de foto sin pedir el JSON en runtime,
 * igual que la convención estática de public/poscosecha/creditos.json. */
const CREDITOS = {
  'polinizacion-cultivo': {
    file: 'polinizacion-cultivo.jpg', autor: 'Anita Martinz', licencia: 'CC BY 2.0',
    licenciaUrl: 'https://creativecommons.org/licenses/by/2.0',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Apis_mellifera_on_Prunus_flower.jpg',
    fuente: 'Wikimedia Commons',
  },
  angelita: {
    file: 'angelita.jpg', autor: 'Carlos Eduardo Joos', licencia: 'CC BY 2.0',
    licenciaUrl: 'https://creativecommons.org/licenses/by/2.0',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Tetragonisca_angustula_(Jata%C3%AD)_(51680100828).jpg',
    fuente: 'Wikimedia Commons',
  },
  'meliponario-entrada': {
    file: 'meliponario-entrada.jpg', autor: 'Sintropepe', licencia: 'CC BY-SA 4.0',
    licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Tetragonisca_angustula_nest_entrance.jpg',
    fuente: 'Wikimedia Commons',
  },
  'abeja-de-miel': {
    file: 'abeja-de-miel.jpg', autor: 'Ivar Leidus', licencia: 'CC BY-SA 4.0',
    licenciaUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Apis_mellifera_-_Brassica_napus_-_Valingu.jpg',
    fuente: 'Wikimedia Commons',
  },
  'flores-polinizador': {
    file: 'flores-polinizador.jpg', autor: 'David Wright', licencia: 'CC BY 2.0',
    licenciaUrl: 'https://creativecommons.org/licenses/by/2.0',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Cornflowers_(Centaurea_cyanus)_with_pollinating_Bumblebee.jpg',
    fuente: 'Wikimedia Commons',
  },
};

// Relaciones de polinización registradas en el grafo de conocimiento Chagra.
// Sale de datos, no de la memoria del modelo: si el grafo crece, el número sube.
const POLINIZA_EDGES = graphStats?.aristas_por_tipo?.POLINIZA ?? 0;

/**
 * Foto — imagen CC con su pie de atribución (autor · fuente · licencia).
 * Los enlaces abren en pestaña nueva con rel="noopener noreferrer".
 */
function Foto({ slug, alt, height = 'h-52 sm:h-64', className = '' }) {
  const c = CREDITOS[slug];
  if (!c) return null;
  return (
    <figure className={`overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/40 ${className}`}>
      <img
        src={`/abejas/${c.file}`}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`w-full ${height} object-cover`}
      />
      <figcaption className="px-3 py-1.5 text-[10px] leading-snug text-slate-400/90 bg-slate-950/50">
        Foto: {c.autor} ·{' '}
        <a href={c.fuenteUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-200">{c.fuente}</a>
        {' · '}
        <a href={c.licenciaUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-200">{c.licencia}</a>
      </figcaption>
    </figure>
  );
}

/** Chip honesto para lo numérico que todavía no está anclado a la fuente. */
function DatoEnCamino({ children }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200 align-middle">
      <Info size={11} aria-hidden="true" /> {children}
    </span>
  );
}

/** Tarjeta de sección con color propio (mismo patrón que las otras verticales). */
function SeccionCard({ Icon, color, titulo, children, testid = undefined }) {
  return (
    <section data-testid={testid} className={`rounded-2xl border ${color.border} ${color.bg} p-4`}>
      <h2 className={`flex items-center gap-2 text-base font-bold ${color.text}`}>
        {Icon && <Icon size={18} aria-hidden="true" />}
        {titulo}
      </h2>
      <div className="mt-2 text-sm text-slate-200/90 leading-relaxed space-y-2">
        {children}
      </div>
    </section>
  );
}

// Cultivos de finca colombiana cuyo cuaje/rinde mejora con polinizadores.
// Cualitativo a propósito: el % exacto por cultivo se marca "dato en camino".
const CULTIVOS_BENEFICIADOS = [
  'Curuba', 'Mora', 'Gulupa', 'Lulo', 'Maracuyá',
  'Ahuyama', 'Pepino', 'Fríjol', 'Tomate de árbol', 'Aguacate',
];

/**
 * Comparación abeja nativa vs abeja de miel. Anclada en animal-diagnostics.json
 * (id "apicola": Tetragonisca angustula = angelita, melipona nativa SIN aguijón;
 * Apis mellifera = volumen de miel). Fuente: FEDEABEJA, ICA.
 */
const COMPARACION = [
  { rasgo: 'Aguijón', angelita: 'No tiene: no pica. Segura cerca de la casa y de los niños.', apis: 'Sí; la africanizada es defensiva. Pide traje y cuidado.' },
  { rasgo: 'De dónde es', angelita: 'Nativa de Colombia (abeja de la tierra).', apis: 'Introducida (llegó de fuera).' },
  { rasgo: 'Miel', angelita: 'Poca, más líquida, de uso medicinal tradicional.', apis: 'Bastante y espesa: la de vender por arrobas.' },
  { rasgo: 'Servicio a la finca', angelita: 'Poliniza y conserva biodiversidad nativa.', apis: 'Poliniza y da miel y cera.' },
];

// Amenazas reales para los polinizadores + qué puede hacer usted en la finca.
const AMENAZAS = [
  {
    titulo: 'Agroquímicos',
    riesgo: 'Los insecticidas matan abejas. El peor golpe es fumigar con las flores abiertas: la obrera lleva el veneno a la colmena.',
    accion: 'No fumigue en floración. Prefiera biopreparados y control biológico. Deje franjas y horas sin fumigar (temprano o al atardecer, cuando la abeja no está en la flor).',
  },
  {
    titulo: 'Pérdida de hábitat',
    riesgo: 'Tumbar el monte y el monocultivo dejan a las abejas sin comida ni dónde anidar. Sin flores y sin huecos, la colonia se va o se muere.',
    accion: 'Deje rincones de monte, cercas vivas y árboles en flor. Conserve troncos y palos huecos donde anidan las nativas.',
  },
  {
    titulo: 'Hambruna en época seca',
    riesgo: 'Cuando no hay nada en flor, la colmena pasa hambre y se debilita.',
    accion: 'Siembre para que haya flor todo el año (escalonado) y déjeles reservas de miel; no coseche de más.',
  },
];

/**
 * @param {Object} props
 * @param {() => void} [props.onBack]
 * @param {() => void} [props.onHome]
 * @param {(view: string, data?: any) => void} [props.onNavigate]
 */
export default function AbejasScreen({ onBack, onHome, onNavigate }) {
  const preguntarAgente = (prefilledPrompt) => {
    if (onNavigate) onNavigate('agente', { prefilledPrompt });
  };

  return (
    <ScreenShell title="Abejas y polinización" icon={Hexagon} onBack={onBack} onHome={onHome}>
      <div className="px-4 pt-4 pb-10 max-w-2xl mx-auto space-y-5" data-testid="abejas-screen">

        {/* ── HERO: por qué el polinizador es vital ── */}
        <section data-testid="abejas-hero" className="space-y-3">
          <Foto
            slug="polinizacion-cultivo"
            alt="Una abeja de miel poliniza la flor de un frutal"
            height="h-56 sm:h-72"
          />
          <div>
            <h2 className="text-xl font-black text-white leading-tight">Sin polinizadores no hay cosecha</h2>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              La abeja le da miel y cera, pero su mayor aporte es invisible: al ir de
              flor en flor lleva el polen y <span className="font-bold text-white">mejora el cuaje, el
              tamaño y el número de frutos</span>. Cuidar a los polinizadores es cuidar la
              cosecha de toda su finca.
            </p>
          </div>

          {/* Cifras grandes — todas con fuente citada (FAO/IPBES y grafo Chagra) */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-amber-600/40 bg-amber-900/20 p-3 text-center">
              <p className="text-2xl font-black text-amber-200 leading-none">75%</p>
              <p className="mt-1 text-[11px] text-amber-100/80 leading-snug">de los cultivos de comida del mundo rinden mejor con polinización animal</p>
            </div>
            <div className="rounded-xl border border-lime-600/40 bg-lime-900/20 p-3 text-center">
              <p className="text-2xl font-black text-lime-200 leading-none">35%</p>
              <p className="mt-1 text-[11px] text-lime-100/80 leading-snug">del volumen de alimento del mundo depende de polinizadores</p>
            </div>
            <div className="rounded-xl border border-fuchsia-600/40 bg-fuchsia-900/20 p-3 text-center">
              <p className="text-2xl font-black text-fuchsia-200 leading-none">{POLINIZA_EDGES}</p>
              <p className="mt-1 text-[11px] text-fuchsia-100/80 leading-snug">relaciones de polinización en el catálogo de Chagra</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Fuente: FAO / IPBES (cifras globales) · grafo de conocimiento Chagra (relaciones POLINIZA).
          </p>
        </section>

        {/* ── 1. Por qué le conviene: rinde más ── */}
        <SeccionCard
          testid="abejas-por-que"
          Icon={Sprout}
          color={{ border: 'border-emerald-700/40', bg: 'bg-emerald-900/20', text: 'text-emerald-200' }}
          titulo="Por qué le conviene: rinde más"
        >
          <p>
            En muchos cultivos, más visitas de abejas se traducen en más frutos y de
            mejor tamaño. Estos de finca colombiana se benefician fuerte:
          </p>
          <ul className="flex flex-wrap gap-1.5 my-1">
            {CULTIVOS_BENEFICIADOS.map((c) => (
              <li key={c} className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-100 text-xs font-semibold">
                {c}
              </li>
            ))}
          </ul>
          <p>
            El <span className="font-bold">café</span> se autopoliniza, pero con abejas cerca cuaja y rinde más.
          </p>
          <p className="text-xs text-slate-300/80">
            El aumento exacto por cultivo (en %) todavía lo estamos anclando a la ficha de
            cada especie. {' '}<DatoEnCamino>dato en camino</DatoEnCamino>
          </p>
          <p className="text-[11px] text-slate-500">Fuente: FAO / IPBES · confianza alta para el principio; el % por cultivo, en camino.</p>
        </SeccionCard>

        {/* ── 2. Nativas sin aguijón (angelita) vs abeja de miel ── */}
        <section data-testid="abejas-comparacion" className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-yellow-200">
            <Hexagon size={18} aria-hidden="true" />
            Dos abejas, dos oficios
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Foto slug="angelita" alt="Abeja angelita (Tetragonisca angustula), nativa y sin aguijón" height="h-36 sm:h-44" />
              <p className="mt-1.5 text-center text-xs font-bold text-lime-200">Angelita</p>
              <p className="text-center text-[10px] text-slate-400 italic">Tetragonisca angustula</p>
            </div>
            <div>
              <Foto slug="abeja-de-miel" alt="Abeja de miel (Apis mellifera) sobre una flor" height="h-36 sm:h-44" />
              <p className="mt-1.5 text-center text-xs font-bold text-amber-200">Abeja de miel</p>
              <p className="text-center text-[10px] text-slate-400 italic">Apis mellifera</p>
            </div>
          </div>

          {/* Comparación anclada a animal-diagnostics.json (FEDEABEJA, ICA) */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 divide-y divide-slate-800">
            {COMPARACION.map((f) => (
              <div key={f.rasgo} className="p-3">
                <p className="text-xs uppercase tracking-wide font-bold text-slate-400">{f.rasgo}</p>
                <div className="mt-1.5 grid grid-cols-2 gap-2 text-xs">
                  <p className="text-lime-100/90 leading-snug"><span className="font-bold text-lime-200">Angelita:</span> {f.angelita}</p>
                  <p className="text-amber-100/90 leading-snug"><span className="font-bold text-amber-200">Abeja de miel:</span> {f.apis}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="flex items-start gap-2 rounded-xl border border-rose-700/40 bg-rose-900/20 p-3 text-sm text-rose-100">
            <ShieldAlert size={18} className="mt-0.5 shrink-0 text-rose-300" aria-hidden="true" />
            <span>
              <span className="font-bold">Cuide a las nativas:</span> la abeja de miel (Apis) saquea las
              colmenas de angelitas. Mantenga separados el apiario de Apis y el meliponario de nativas.
            </span>
          </p>
          <p className="text-[11px] text-slate-500">Fuente: FEDEABEJA, ICA (animal-diagnostics.json).</p>
        </section>

        {/* ── 3. Una finca amiga de los polinizadores ── */}
        <section data-testid="abejas-finca-amiga" className="space-y-3">
          <Foto
            slug="flores-polinizador"
            alt="Flores de campo con un abejorro polinizando"
            height="h-48 sm:h-60"
          />
          <SeccionCard
            Icon={Flower2}
            color={{ border: 'border-fuchsia-700/40', bg: 'bg-fuchsia-900/20', text: 'text-fuchsia-200' }}
            titulo="Haga su finca amiga de los polinizadores"
          >
            <p>Cuatro cosas sencillas cambian la vida de sus abejas:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Flower2 size={16} className="mt-0.5 shrink-0 text-fuchsia-300" aria-hidden="true" />
                <span><span className="font-bold">Flores todo el año.</span> Siembre escalonado y deje florecer arvenses, cercas vivas y árboles. Que nunca falte flor.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-300" aria-hidden="true" />
                <span><span className="font-bold">No fumigue en floración.</span> Con las flores abiertas, el veneno cae directo sobre sus polinizadoras.</span>
              </li>
              <li className="flex items-start gap-2">
                <Droplets size={16} className="mt-0.5 shrink-0 text-sky-300" aria-hidden="true" />
                <span><span className="font-bold">Agua limpia y segura.</span> Un bebedero con piedritas o corcho para que se paren y no se ahoguen.</span>
              </li>
              <li className="flex items-start gap-2">
                <Leaf size={16} className="mt-0.5 shrink-0 text-lime-300" aria-hidden="true" />
                <span><span className="font-bold">Refugios.</span> Deje troncos y palos huecos, muros de barro y rincones de monte: ahí anidan las nativas.</span>
              </li>
            </ul>
          </SeccionCard>
        </section>

        {/* ── 4. Meliponicultura básica ── */}
        <section data-testid="abejas-meliponicultura" className="space-y-3">
          <Foto
            slug="meliponario-entrada"
            alt="Entrada de tubo de cera de un nido de abeja angelita (meliponario)"
            height="h-48 sm:h-60"
          />
          <SeccionCard
            Icon={HomeIcon}
            color={{ border: 'border-lime-600/50', bg: 'bg-lime-900/25', text: 'text-lime-200' }}
            titulo="Meliponicultura: criar la abeja nativa"
          >
            <p>
              La <span className="font-bold">meliponicultura</span> es criar abejas nativas sin aguijón
              (como la angelita) en cajas o troncos, para su <span className="font-bold">miel medicinal</span> y
              para <span className="font-bold">polinizar</span>. Como no pican, son ideales cerca de la casa y con niños.
            </p>
            <ul className="space-y-1.5">
              <li>• <span className="font-bold">La colonia:</span> parta de una caja o tronco sano. No saquee nidos del monte sin manejo: mata la colonia y a la especie.</li>
              <li>• <span className="font-bold">El puesto:</span> a la sombra, protegido de la lluvia y del sol fuerte, lejos del apiario de Apis.</li>
              <li>• <span className="font-bold">La entrada:</span> las nativas hacen un tubito de cera en la piquera; por ahí las reconoce (como en la foto).</li>
              <li>• <span className="font-bold">La miel:</span> se guarda en potecitos de cerumen, es más líquida. Coseche limpio y solo el excedente; deje reservas.</li>
              <li>• <span className="font-bold">Multiplicar:</span> divida colonias fuertes en vez de sacar del monte.</li>
            </ul>
            <p className="text-xs text-slate-300/80">
              Empiece con acompañamiento de un meliponicultor con experiencia o de su técnico.
            </p>
            <p className="text-[11px] text-slate-500">Fuente: FEDEABEJA, ICA y saber campesino.</p>
          </SeccionCard>
        </section>

        {/* ── 5. Amenazas y qué hacer ── */}
        <SeccionCard
          testid="abejas-amenazas"
          Icon={AlertTriangle}
          color={{ border: 'border-rose-700/40', bg: 'bg-rose-900/20', text: 'text-rose-200' }}
          titulo="Lo que las amenaza (y qué hacer)"
        >
          <div className="space-y-3">
            {AMENAZAS.map((a) => (
              <div key={a.titulo} className="rounded-xl border border-slate-700/50 bg-black/20 p-3">
                <p className="text-sm font-bold text-rose-100">{a.titulo}</p>
                <p className="mt-1 text-xs text-slate-300/90 leading-snug">{a.riesgo}</p>
                <p className="mt-2 flex items-start gap-1.5 text-xs text-lime-100 leading-snug">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-lime-300" aria-hidden="true" />
                  <span><span className="font-bold">Qué hacer:</span> {a.accion}</span>
                </p>
              </div>
            ))}
          </div>
        </SeccionCard>

        {/* ── Aporte al ciclo: polinización, NO abono ── */}
        <SeccionCard
          Icon={Recycle}
          color={{ border: 'border-lime-600/50', bg: 'bg-lime-900/25', text: 'text-lime-200' }}
          titulo="Su aporte al ciclo de la finca"
        >
          <p>
            A diferencia de gallinas y cerdos, las abejas <span className="font-bold">no dan abono</span>. Su
            aporte al ciclo es la <span className="font-bold">polinización</span>: más flores visitadas, más frutos y mejor cosecha.
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold my-1">
            <span className="px-2.5 py-1 rounded-full bg-yellow-500/20 text-yellow-200 border border-yellow-500/40">Abejas</span>
            <ArrowRight size={14} aria-hidden="true" className="text-lime-300" />
            <span className="px-2.5 py-1 rounded-full bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-500/40">Polinización</span>
            <ArrowRight size={14} aria-hidden="true" className="text-lime-300" />
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/40">Más cosecha</span>
          </div>
          <p className="text-xs text-slate-300/80">
            En campesino: si cuida sus abejas, sus matas cuajan más y usted cosecha más. Son
            trabajadoras gratis de su finca.
          </p>
        </SeccionCard>

        {/* ── Chequeo interactivo (local, sin backend) ── */}
        <ChecklistManejo
          titulo="Chequeo amigo de polinizadores"
          color={{ border: 'border-amber-700/40', bg: 'bg-amber-900/20', text: 'text-amber-200' }}
          items={[
            'Hay flores disponibles en la finca todo el año.',
            'No fumigo con las flores abiertas.',
            'Tengo agua limpia y segura para las abejas.',
            'Dejo rincones de monte, cercas vivas y troncos huecos.',
            'Mantengo separados el apiario de Apis y el meliponario de nativas.',
            'Cosecho solo el excedente de miel y les dejo reservas.',
          ]}
        />

        {/* ── Puente al agente ── */}
        {onNavigate && (
          <button
            type="button"
            data-testid="abejas-preguntar-agente"
            onClick={() => preguntarAgente('¿Qué poliniza mi cultivo y cómo hago mi finca amiga de las abejas?')}
            className="w-full text-left rounded-2xl border border-sky-700/50 bg-sky-900/20 p-4 flex items-center gap-3 hover:border-sky-500/70 transition-colors motion-reduce:transition-none active:scale-[0.99]"
          >
            <MessageCircleQuestion size={22} className="shrink-0 text-sky-300" aria-hidden="true" />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-sky-100 leading-tight">Pregúntele al agente</span>
              <span className="block text-xs text-sky-200/80 leading-snug">Qué poliniza su cultivo, cuántas colmenas necesita o cómo empezar con angelitas.</span>
            </span>
            <ArrowRight size={18} className="shrink-0 text-sky-400" aria-hidden="true" />
          </button>
        )}

        {/* ── Fuentes / Saber más ── */}
        <FuentesAnimal
          claves={['fao', 'ica', 'agrosavia', 'sena']}
          nota="Para criar abejas o resolver un problema de la colmena, apóyese en un apicultor o meliponicultor con experiencia o en el ICA. Esta guía no reemplaza la asistencia profesional."
        />
      </div>
    </ScreenShell>
  );
}
