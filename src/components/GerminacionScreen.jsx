/* i18n (ADR-050): etiquetas user-facing en español Colombia. La regla
 * chagra-i18n es soft (warn); se desactiva a nivel de archivo siguiendo el
 * mismo criterio que SoilDiagnosticScreen/CromatografiaScreen para no bloquear
 * el pre-commit (max-warnings=0). Los errores reales siguen activos. */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import { useCallback, useMemo, useState } from 'react';
import {
  Sprout, Beaker, ClipboardList, Plus, Trash2, ChevronRight, ChevronLeft,
  Droplets, CalendarDays, CheckCircle2, AlertTriangle, XCircle, Info,
  Percent, BookOpen, Trees, Lightbulb, Camera,
} from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';
import { formatColombiaDate } from '../utils/colombiaDate';
import { listGerminationReferences, getGerminationReference } from '../services/germinationReference';
import './germinacion-vivo.css';

/**
 * GerminacionScreen — MÓDULO GERMINACIÓN de la finca.
 *
 * Dos cosas, en lenguaje campesino y sin inventar nada:
 *   1. GUÍA de la prueba de germinación casera (método estándar real): poner N
 *      semillas en papel o algodón húmedo, en bolsa o plato, en sitio cálido;
 *      contar las que germinan a los X días según la especie; sacar el % .
 *   2. REGISTRO: formulario (especie, fecha, nº puestas, nº germinadas, días,
 *      sustrato) → calcula el % de germinación → guarda historial en
 *      localStorage. Permite varias pruebas por especie y compararlas.
 *
 * Conexión con el ciclo: el módulo invita a hacer la prueba ANTES de sembrar
 * (CTA "Registrar mi siembra" si App.jsx pasa onNavigate). Los días de
 * referencia salen de las plantillas fenológicas reales (stage `emergence`,
 * con su fuente Agrosavia/FAO) vía germinationReference — NUNCA se inventan; si
 * no hay dato, se dice "varía por especie y temperatura".
 *
 * Interpretación del % (regla estándar de calidad de semilla, AGROSAVIA / FAO
 * seed testing): >80% excelente · 60-80% aceptable (sembrar más densa) · <60%
 * baja (descartar el lote o sembrar muy densa).
 *
 * Fuentes: plantillas fenológicas del repo (Agrosavia, FAO) para los días;
 * método de prueba de germinación en papel/algodón = práctica estándar de
 * análisis de semillas (ISTA / FAO seed testing), enseñada por AGROSAVIA y el
 * SENA para semilla criolla.
 *
 * 2ª PASADA VISUAL (germinacion-vivo.css): hero photo-forward con foto real
 * ya embarcada en dist (/bienvenida/manos-siembra.jpg, CC BY-SA 4.0) + CTA
 * final sobre /milpa/milpaviva.jpg (CC BY 2.0) — 0 bytes de assets nuevos.
 * Entradas escalonadas, semáforo del % con chips grandes, micro-animaciones
 * transform/opacity y prefers-reduced-motion. Contenido y fuentes INTACTOS.
 */

const STORAGE_KEY = 'chagra:germinacion:v1';

/* ── Persistencia local (mismo patrón que CromatografiaScreen) ── */
function loadPruebas() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function savePruebas(pruebas) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruebas));
  } catch {
    /* almacenamiento lleno o bloqueado: degradamos sin romper la UI */
  }
}

/** Fecha de hoy en formato ISO (zona Colombia). Llamada solo en inicializadores
 *  perezosos de useState (no en render) para no violar la pureza de hooks. */
function hoyIso() {
  return formatColombiaDate(Date.now(), 'iso-date');
}

/* ── Lógica del % de germinación e interpretación ── */

/**
 * % de germinación = germinadas / puestas × 100, redondeado.
 * Devuelve null si los datos no son válidos (puestas <= 0 o germinadas > puestas).
 */
function calcularPorcentaje(puestas, germinadas) {
  const p = Number(puestas);
  const g = Number(germinadas);
  if (!Number.isFinite(p) || !Number.isFinite(g)) return null;
  if (p <= 0 || g < 0 || g > p) return null;
  return Math.round((g / p) * 100);
}

/**
 * Interpretación campesina del % según la regla estándar de calidad de semilla.
 * @param {number} pct
 */
function interpretar(pct) {
  if (pct >= 80) {
    return {
      nivel: 'excelente',
      titulo: 'Semilla excelente',
      detalle: 'Más de 80% germinó. Es semilla buena: siémbrala con confianza, a la densidad normal.',
      Icon: CheckCircle2,
      text: 'text-emerald-200',
      border: 'border-emerald-600/50',
      bg: 'bg-emerald-900/30',
      dot: 'bg-emerald-400',
    };
  }
  if (pct >= 60) {
    return {
      nivel: 'aceptable',
      titulo: 'Semilla aceptable',
      detalle: 'Entre 60% y 80% germinó. Sirve, pero siembra MÁS DENSA (más semillas por hueco o por surco) para que te salga el número de plantas que necesitas.',
      Icon: AlertTriangle,
      text: 'text-amber-200',
      border: 'border-amber-600/50',
      bg: 'bg-amber-900/25',
      dot: 'bg-amber-400',
    };
  }
  return {
    nivel: 'baja',
    titulo: 'Germinación baja',
    detalle: 'Menos de 60% germinó. Lo mejor es DESCARTAR ese lote (no botes plata sembrando semilla casi muerta). Si igual lo vas a usar, siembra MUY DENSA y consigue semilla nueva.',
    Icon: XCircle,
    text: 'text-rose-200',
    border: 'border-rose-600/50',
    bg: 'bg-rose-900/25',
    dot: 'bg-rose-400',
  };
}

/* ── Sustratos / condiciones del método estándar (no inventados) ── */
const SUSTRATOS = [
  { id: 'papel', label: 'Papel de cocina húmedo', emoji: '🧻' },
  { id: 'algodon', label: 'Algodón húmedo', emoji: '☁️' },
  { id: 'servilleta_bolsa', label: 'Servilleta en bolsa', emoji: '🛍️' },
  { id: 'plato', label: 'Plato tapado', emoji: '🍽️' },
];
const sustratoLabel = (id) => SUSTRATOS.find((s) => s.id === id)?.label || id || '—';

/* ── Pasos de la prueba casera (método estándar, papel/algodón húmedo) ── */
const PASOS_PRUEBA = [
  'Cuenta un número redondo de semillas del MISMO lote: 10 o, mejor, 25 (entre más semillas, más confiable la cuenta).',
  'Humedece un papel de cocina o algodón. Que quede mojado pero sin charco (no las ahogues).',
  'Acomoda las semillas separadas sobre el papel. Tápalas con otra capa húmeda, enrolla o ponlas en un plato.',
  'Mete todo en una bolsa plástica o tapa el plato, para que no se seque. Déjalo en un sitio cálido y a la sombra (ni al sol fuerte ni en la nevera).',
  'Revisa cada día que siga húmedo. Si se seca, rocía un poquito de agua.',
  'A los días que toca según la especie, cuenta cuántas semillas botaron raíz o brotaron. Esas son las germinadas.',
  'Saca la cuenta: germinadas dividido entre las que pusiste, por 100. Ese es tu % de germinación. Anótalo aquí abajo.',
];

/* ── Fotos reales (licencia abierta) — REUSO de /bienvenida y /milpa ──────
 * 2ª pasada visual: mismas fotos que ya embarca dist (0 bytes nuevos),
 * patrón "photo-forward" foto + scrim fijo + crédito visible enlazado.
 * Licencias auditadas en public/bienvenida/creditos.json y
 * public/milpa/_meta.json. */
const FOTOS = {
  hero: {
    src: '/bienvenida/manos-siembra.jpg',
    alt: 'Manos campesinas acomodando una plántula recién germinada en la tierra',
    autor: 'Robbieross123',
    licencia: 'CC BY-SA 4.0',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Plant_a_Sapling_for_Better_Future.jpg',
  },
  siembra: {
    src: '/milpa/milpaviva.jpg',
    alt: 'Campesino caminando entre matas de maíz recién germinadas en su lote',
    autor: 'Feria de Productores',
    licencia: 'CC BY 2.0',
    fuenteUrl: 'https://commons.wikimedia.org/wiki/File:Milpa_llena_de_vida.jpg',
  },
};

/* ════════════════════════════════════════════════════════════════════ */

function Card({ children, className = '', style = {} }) {
  return (
    <section
      style={style}
      className={`rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4 ${className}`}
    >
      {children}
    </section>
  );
}

/** Tarjeta de una prueba guardada en el historial. */
function PruebaCard({ prueba, onDelete }) {
  const pct = prueba.porcentaje;
  const info = interpretar(pct);
  const { Icon } = info;
  return (
    <li className={`gm-card gm-pop rounded-2xl border ${info.border} ${info.bg} p-3`}>
      <div className="flex items-start gap-3">
        <span className={`relative grid place-items-center shrink-0 w-12 h-12 rounded-xl bg-black/30 ring-1 ring-inset ${info.border.replace('border-', 'ring-')}`}>
          <span className={`text-lg font-extrabold ${info.text}`}>{pct}%</span>
          <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${info.dot}`} aria-hidden="true" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-tight truncate">{prueba.especie}</p>
          <p className={`mt-0.5 inline-flex items-center gap-1 text-xs font-bold ${info.text}`}>
            <Icon size={13} aria-hidden="true" /> {info.titulo}
          </p>
          <p className="mt-1 text-[11px] text-slate-300/90 leading-snug">
            {prueba.germinadas} de {prueba.puestas} germinaron · {prueba.dias} {prueba.dias === 1 ? 'día' : 'días'} · {sustratoLabel(prueba.sustrato)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Prueba del {formatColombiaDate(prueba.fecha, 'day-month')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDelete(prueba.id)}
          aria-label={`Borrar prueba de ${prueba.especie}`}
          className="gm-focus shrink-0 p-2 rounded-lg text-slate-500 hover:text-rose-300 hover:bg-rose-900/30 transition-colors"
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

export default function GerminacionScreen({ onBack, onHome, onNavigate }) {
  const [pruebas, setPruebas] = useState(loadPruebas);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [error, setError] = useState('');

  const referencias = useMemo(() => listGerminationReferences(), []);

  // Estado del formulario.
  const [especie, setEspecie] = useState('');
  const [slugRef, setSlugRef] = useState(''); // slug de la especie de referencia, si la eligió de la lista
  const [fecha, setFecha] = useState(hoyIso);
  const [puestas, setPuestas] = useState('25');
  const [germinadas, setGerminadas] = useState('');
  const [dias, setDias] = useState('');
  const [sustrato, setSustrato] = useState('papel');

  const refSeleccionada = useMemo(
    () => (slugRef ? getGerminationReference(slugRef) : null),
    [slugRef],
  );

  // Vista previa del % mientras el campesino llena el formulario.
  const previaPct = useMemo(
    () => calcularPorcentaje(puestas, germinadas),
    [puestas, germinadas],
  );
  const previaInfo = previaPct === null ? null : interpretar(previaPct);

  const elegirReferencia = useCallback((ref) => {
    setSlugRef(ref.slug);
    setEspecie(ref.label);
  }, []);

  const resetForm = useCallback(() => {
    setEspecie('');
    setSlugRef('');
    setFecha(hoyIso());
    setPuestas('25');
    setGerminadas('');
    setDias('');
    setSustrato('papel');
    setError('');
  }, []);

  const guardar = useCallback(() => {
    setError('');
    const nombre = especie.trim();
    if (!nombre) {
      setError('Escribe qué semilla probaste.');
      return;
    }
    const pct = calcularPorcentaje(puestas, germinadas);
    if (pct === null) {
      setError('Revisa los números: las germinadas no pueden ser más que las que pusiste, y las que pusiste deben ser más de cero.');
      return;
    }
    const nDias = Number(dias);
    if (!Number.isFinite(nDias) || nDias <= 0) {
      setError('Anota a cuántos días contaste la germinación.');
      return;
    }
    const nueva = {
      id: `germ_${Date.now()}`,
      especie: nombre,
      slugRef: slugRef || null,
      fecha: fecha || hoyIso(),
      puestas: Number(puestas),
      germinadas: Number(germinadas),
      dias: nDias,
      sustrato,
      porcentaje: pct,
      creadoEn: new Date().toISOString(),
    };
    setPruebas((prev) => {
      const next = [nueva, ...prev];
      savePruebas(next);
      return next;
    });
    resetForm();
    setMostrarForm(false);
  }, [especie, puestas, germinadas, dias, slugRef, fecha, sustrato, resetForm]);

  const borrar = useCallback((id) => {
    setPruebas((prev) => {
      const next = prev.filter((p) => p.id !== id);
      savePruebas(next);
      return next;
    });
  }, []);

  return (
    <ScreenShell title="Germinación" icon={Sprout} onBack={onBack} onHome={onHome}>
      <div className="px-4 pt-4 pb-10 max-w-2xl mx-auto space-y-4">
        {/* Hero photo-forward: manos sembrando una plántula (reuso CC, 0 bytes
            nuevos). El copy del intro es el MISMO de la 1ª pasada, ahora sobre
            la foto con scrim fijo para leerse al sol. */}
        <figure
          className="gm-hero gm-in relative overflow-hidden rounded-2xl border border-lime-800/50 bg-slate-900 m-0"
          style={{ '--gm-i': 0 }}
        >
          <img
            src={FOTOS.hero.src}
            alt={FOTOS.hero.alt}
            className="w-full aspect-[16/10] object-cover"
            decoding="async"
          />
          {/* Velo de tierra: legible al sol sin tapar la foto */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/35 to-transparent"
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 bottom-6 px-4 pb-1.5">
            <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-lime-300 [text-shadow:0_1px_6px_rgba(0,0,0,0.85)]">
              Semillas · Prueba casera
            </p>
            <p className="mt-0.5 text-[22px] font-extrabold text-white leading-tight drop-shadow">
              ¿Tu semilla está viva?
            </p>
            <p className="mt-1 max-w-md text-sm text-slate-100/95 leading-snug [text-shadow:0_1px_6px_rgba(0,0,0,0.7)]">
              Antes de sembrar, vale la pena saber si tu semilla está viva. La
              prueba de germinación es fácil, casera y te dice qué tan buena es
              tu semilla, para no botar plata ni tiempo sembrando semilla muerta.
            </p>
          </div>
          <figcaption className="absolute inset-x-0 bottom-0 bg-slate-950/82 px-2 py-1 backdrop-blur-sm">
            <a
              href={FOTOS.hero.fuenteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="gm-focus flex items-center gap-1 truncate text-[9px] text-slate-300 underline decoration-slate-600 underline-offset-2"
              title={`${FOTOS.hero.autor} · ${FOTOS.hero.licencia} · Wikimedia Commons`}
            >
              <Camera size={9} className="shrink-0" aria-hidden="true" />
              <span className="truncate">Foto: {FOTOS.hero.autor} · {FOTOS.hero.licencia} · Wikimedia</span>
            </a>
          </figcaption>
        </figure>

        {/* Tip del valor — destacado. */}
        <div className="gm-in rounded-2xl border border-lime-600/50 bg-lime-900/25 p-3.5 flex gap-3" style={{ '--gm-i': 1 }}>
          <Lightbulb size={20} className="shrink-0 text-lime-300 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-lime-100/90 leading-relaxed">
            <span className="font-bold text-lime-200">¿Por qué hacerla?</span> Si la
            semilla germina poquito, lo sabes ANTES de preparar la tierra y sembrar.
            Así no pierdes el trabajo, el abono ni la cosecha esperando matas que
            nunca van a salir.
          </p>
        </div>

        {/* GUÍA: la prueba de germinación casera, paso a paso. */}
        <Card className="gm-in gm-card" style={{ '--gm-i': 2 }}>
          <h2 className="flex items-center gap-2 text-base font-bold text-sky-200">
            <Beaker size={18} aria-hidden="true" />
            La prueba de germinación casera
          </h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Pon unas semillas en papel o algodón húmedo y mira cuántas germinan.
            Sigue estos pasos:
          </p>
          <ol className="mt-3 flex flex-col gap-2">
            {PASOS_PRUEBA.map((paso, i) => (
              <li key={paso} className="flex gap-3 items-start bg-slate-900/70 border border-slate-800 rounded-xl p-3">
                <span className="w-7 h-7 rounded-full bg-sky-600 flex items-center justify-center font-bold text-white text-sm shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm text-slate-200 leading-snug pt-0.5">{paso}</span>
              </li>
            ))}
          </ol>

          {/* La fórmula, explícita y sencilla. */}
          <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/50 p-3 flex items-center gap-2.5 text-sm">
            <Percent size={18} className="shrink-0 text-sky-300" aria-hidden="true" />
            <span className="text-slate-200">
              <span className="font-bold text-white">% de germinación</span> = germinadas ÷ puestas × 100.
              Ejemplo: 18 de 25 = <span className="font-bold text-sky-200">72%</span>.
            </span>
          </div>
        </Card>

        {/* GUÍA DE INTERPRETACIÓN del % — semáforo de la semilla, de un vistazo. */}
        <Card className="gm-in gm-card" style={{ '--gm-i': 3 }}>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-100">
            <BookOpen size={18} aria-hidden="true" />
            Cómo leer el resultado
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            <li className="flex items-start gap-3 rounded-xl border border-emerald-600/40 bg-emerald-900/20 p-3">
              <span className="shrink-0 grid place-items-center min-w-[52px] h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 font-extrabold text-xs tabular-nums" aria-hidden="true">
                +80%
              </span>
              <p className="text-sm text-emerald-100/90 pt-0.5">
                <span className="font-bold text-emerald-200">Más de 80% — Excelente.</span> Semilla
                buena. Siémbrala normal, con confianza.
              </p>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-amber-600/40 bg-amber-900/20 p-3">
              <span className="shrink-0 grid place-items-center min-w-[52px] h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 font-extrabold text-xs tabular-nums" aria-hidden="true">
                60–80
              </span>
              <p className="text-sm text-amber-100/90 pt-0.5">
                <span className="font-bold text-amber-200">60% a 80% — Aceptable.</span> Sirve,
                pero siembra más densa para alcanzar las plantas que necesitas.
              </p>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-rose-600/40 bg-rose-900/20 p-3">
              <span className="shrink-0 grid place-items-center min-w-[52px] h-9 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-200 font-extrabold text-xs tabular-nums" aria-hidden="true">
                &lt;60%
              </span>
              <p className="text-sm text-rose-100/90 pt-0.5">
                <span className="font-bold text-rose-200">Menos de 60% — Baja.</span> Mejor
                descarta el lote o siembra muy densa y consigue semilla nueva.
              </p>
            </li>
          </ul>
        </Card>

        {/* REFERENCIA de días a germinar por especie (dato real del repo). */}
        <Card className="gm-in gm-card" style={{ '--gm-i': 4 }}>
          <h2 className="flex items-center gap-2 text-base font-bold text-teal-200">
            <CalendarDays size={18} aria-hidden="true" />
            ¿A cuántos días contar?
          </h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Cada semilla tiene su tiempo. Aquí van días de referencia para algunas
            semillas comunes. <span className="font-bold text-slate-200">Varía según
            la especie y la temperatura</span>: con más calor germinan más rápido,
            con frío se demoran.
          </p>
          {referencias.length > 0 ? (
            <ul className="mt-3 divide-y divide-slate-800">
              {referencias.map((r) => (
                <li key={r.slug} className="flex items-center justify-between gap-3 py-2">
                  <button
                    type="button"
                    onClick={() => {
                      elegirReferencia(r);
                      setMostrarForm(true);
                    }}
                    className="gm-row gm-focus group flex-1 min-w-0 text-left flex items-center gap-1.5"
                    aria-label={`Usar ${r.label} en una nueva prueba`}
                  >
                    <span className="block text-sm font-semibold text-slate-100 truncate">{r.label}</span>
                    <ChevronRight
                      size={14}
                      className="shrink-0 text-teal-400 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity"
                      aria-hidden="true"
                    />
                  </button>
                  <span className="shrink-0 text-sm font-bold text-teal-200 tabular-nums">
                    {r.minDays}–{r.maxDays} días
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-400">
              No tengo días de referencia cargados ahora mismo. Cuenta según tu
              experiencia con esa semilla: varía por especie y temperatura.
            </p>
          )}
          <p className="mt-3 flex items-start gap-2 text-xs text-slate-500">
            <Info size={13} className="shrink-0 mt-0.5" aria-hidden="true" />
            Días de germinación/emergencia tomados de las fichas de fenología del
            catálogo (fuentes Agrosavia y FAO). Si tu semilla no está, cuenta
            cuando veas que botan raíz o brotan.
          </p>
        </Card>

        {/* REGISTRO: botón para abrir el formulario, o el formulario. */}
        {!mostrarForm ? (
          <button
            type="button"
            onClick={() => { resetForm(); setMostrarForm(true); }}
            className="gm-in gm-btn gm-focus w-full min-h-[52px] rounded-2xl font-bold text-base flex items-center justify-center gap-2 text-white bg-lime-700 hover:bg-lime-600 shadow-lg shadow-lime-950/40"
            style={{ '--gm-i': 5 }}
          >
            <Plus size={20} aria-hidden="true" /> Registrar una prueba
          </button>
        ) : (
          <Card className="gm-pop border-lime-700/50">
            <h2 className="flex items-center gap-2 text-base font-bold text-lime-200">
              <ClipboardList size={18} aria-hidden="true" />
              Registrar una prueba
            </h2>

            <div className="mt-3 flex flex-col gap-3">
              {/* Especie */}
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">¿Qué semilla probaste?</span>
                <input
                  type="text"
                  value={especie}
                  onChange={(e) => { setEspecie(e.target.value); setSlugRef(''); }}
                  placeholder="Ej. maíz amarillo, fríjol bola roja…"
                  className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-lime-500"
                />
              </label>

              {/* Referencia activa (si eligió de la lista) */}
              {refSeleccionada ? (
                <p className="flex items-center gap-2 text-xs text-teal-200 bg-teal-900/20 border border-teal-700/40 rounded-lg px-3 py-2">
                  <CalendarDays size={13} aria-hidden="true" />
                  Esta semilla germina, normalmente, en {refSeleccionada.minDays}–{refSeleccionada.maxDays} días.
                </p>
              ) : null}

              {/* Fecha */}
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Fecha en que montaste la prueba</span>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-lime-500"
                />
              </label>

              {/* Puestas y germinadas */}
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Semillas que pusiste</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={puestas}
                    onChange={(e) => setPuestas(e.target.value)}
                    className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-lime-500"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Cuántas germinaron</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={germinadas}
                    onChange={(e) => setGerminadas(e.target.value)}
                    className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-lime-500"
                  />
                </label>
              </div>

              {/* Días */}
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">¿A cuántos días contaste?</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={dias}
                  onChange={(e) => setDias(e.target.value)}
                  placeholder="Ej. 7"
                  className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-lime-500"
                />
              </label>

              {/* Sustrato / condición */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">¿Sobre qué las pusiste?</span>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {SUSTRATOS.map((s) => {
                    const activo = sustrato === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSustrato(s.id)}
                        aria-pressed={activo}
                        className={`min-h-[44px] px-3 rounded-full border flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                          activo
                            ? 'border-lime-500 bg-lime-600/25 text-lime-100'
                            : 'bg-slate-950 border-slate-700 text-slate-200 hover:border-slate-500'
                        }`}
                      >
                        <span aria-hidden="true">{s.emoji}</span>{s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Vista previa del % en vivo. */}
              {previaInfo ? (
                <div className={`gm-pop rounded-xl border ${previaInfo.border} ${previaInfo.bg} p-3 flex items-center gap-3`}>
                  <Droplets size={20} className={`shrink-0 ${previaInfo.text}`} aria-hidden="true" />
                  <p className="text-sm text-slate-100">
                    Te da <span className={`font-extrabold ${previaInfo.text}`}>{previaPct}% de germinación</span> —{' '}
                    <span className="font-bold">{previaInfo.titulo}</span>. {previaInfo.detalle}
                  </p>
                </div>
              ) : null}

              {error ? (
                <p className="flex items-start gap-2 text-sm text-rose-200 bg-rose-900/30 border border-rose-700/50 rounded-lg p-2.5">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-400" aria-hidden="true" />
                  {error}
                </p>
              ) : null}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setMostrarForm(false); setError(''); }}
                  className="gm-btn gm-focus flex-1 min-h-[48px] rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={guardar}
                  className="gm-btn gm-focus flex-1 min-h-[48px] rounded-xl font-bold text-sm bg-lime-700 hover:bg-lime-600 text-white flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} aria-hidden="true" /> Guardar prueba
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* HISTORIAL de pruebas — varias por especie, comparables. */}
        {pruebas.length > 0 ? (
          <section className="gm-in" style={{ '--gm-i': 6 }}>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-100 mb-2 mt-1">
              <ClipboardList size={18} aria-hidden="true" />
              Mis pruebas
            </h2>
            <ul className="flex flex-col gap-2" data-testid="germinacion-historial">
              {pruebas.map((p) => (
                <PruebaCard key={p.id} prueba={p} onDelete={borrar} />
              ))}
            </ul>
          </section>
        ) : (
          <p className="gm-in text-sm text-slate-500 text-center py-2" style={{ '--gm-i': 6 }}>
            Todavía no has registrado pruebas. Cuando hagas una, quedará guardada
            aquí para que compares lotes y especies.
          </p>
        )}

        {/* CONEXIÓN con el ciclo: invitar a sembrar después de probar.
            Photo-forward: la milpa recién germinada (reuso CC de /milpa,
            0 bytes nuevos) le pone imagen al "siguiente paso es sembrar". */}
        {onNavigate ? (
          <div
            className="gm-in gm-foto-cta relative overflow-hidden rounded-2xl border border-emerald-700/40 bg-emerald-900/20"
            style={{ '--gm-i': 7 }}
          >
            <img
              src={FOTOS.siembra.src}
              alt={FOTOS.siembra.alt}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover object-[center_35%]"
            />
            {/* Scrim fijo: legible al sol en los 4 temas */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/75 to-slate-950/35" aria-hidden="true" />
            <a
              href={FOTOS.siembra.fuenteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="gm-focus absolute top-1.5 right-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[9px] leading-none text-white/75 underline decoration-white/30 underline-offset-2"
              title={`${FOTOS.siembra.autor} · ${FOTOS.siembra.licencia} · Wikimedia Commons`}
            >
              Foto: {FOTOS.siembra.autor} · {FOTOS.siembra.licencia}
            </a>
            <div className="relative z-[1] p-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-emerald-200 [text-shadow:0_1px_6px_rgba(0,0,0,0.85)]">
                <Trees size={18} aria-hidden="true" />
                ¿Ya probaste tu semilla?
              </h2>
              <p className="mt-2 text-sm text-emerald-100/95 leading-relaxed [text-shadow:0_1px_6px_rgba(0,0,0,0.7)]">
                Si tu semilla germinó bien, el siguiente paso es sembrar y abrirle su
                ciclo en Chagra para hacerle seguimiento (etapas, labores y riesgos).
              </p>
              <button
                type="button"
                onClick={() => onNavigate('procesos')}
                className="gm-btn gm-focus mt-3 w-full min-h-[48px] rounded-xl font-bold text-sm bg-emerald-700 hover:bg-emerald-600 text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
              >
                <Sprout size={18} aria-hidden="true" /> Registrar mi siembra
                <ChevronRight size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('ciclo')}
                className="gm-btn gm-focus mt-2 w-full min-h-[44px] rounded-xl font-bold text-sm bg-slate-800/90 hover:bg-slate-700 text-slate-200 flex items-center justify-center gap-2"
              >
                Ver mis ciclos de cultivo
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : null}

        <p className="gm-in text-[11px] text-slate-500 pt-1 flex items-start gap-1.5" style={{ '--gm-i': 8 }}>
          <ChevronLeft size={12} className="shrink-0 mt-0.5 rotate-180 opacity-0" aria-hidden="true" />
          La prueba de germinación en papel/algodón es práctica estándar de
          análisis de semilla (FAO/ISTA), enseñada por AGROSAVIA y el SENA. Los
          días de referencia salen de las fichas de fenología del catálogo.
        </p>
      </div>
    </ScreenShell>
  );
}
