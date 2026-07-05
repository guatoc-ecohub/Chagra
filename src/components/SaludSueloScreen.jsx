/* i18n (ADR-050): etiquetas user-facing en español Colombia pendientes de
 * migrar a src/config/messages.js. Misma deuda preexistente que SoilDiagnosticScreen
 * y App.jsx; se desactiva la regla soft a nivel de archivo. */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import { useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Sprout, Layers, Recycle, Calculator,
  FlaskConical, AlertTriangle, CheckCircle2, Info, Leaf, Worm, Gauge,
  Beaker, ArrowRight, Wheat, Bug, Flame, Ban, Umbrella, Salad,
  ExternalLink, Camera,
} from 'lucide-react';
import {
  calcularCICE,
  calcularSaturacionAluminio,
  interpretarSaturacionAl,
  calcularDosisCal,
  guardasEncalado,
  FUENTES_CAL,
  SATURACION_AL_OBJETIVO_DEFAULT,
} from '../services/encaladoCalculator';
import {
  HORIZONTES, HABITANTES, CICLO_ETAPAS, CUIDADOS_VIDA, CREDITOS_FOTOS, FOTO_BASE,
} from '../data/vidaSuelo';

/**
 * SaludSueloScreen — mini-app "Cuaderno del Suelo" (módulo Salud del Suelo).
 *
 * Identidad: cuaderno de campo / Ciclo Vivo. Cálida, campesina, legible al sol.
 *
 * Tres pilares + caso insignia ("mi tierra está cansada / ácida"):
 *   1. ¿Cómo está mi suelo?  — leer/interpretar un análisis (pH, MO, N-P-K, Al)
 *      + PUENTE a la cromatografía existente (route 'cromatografia') y al
 *      diagnóstico sin laboratorio (route 'suelo').
 *   2. Corregir la acidez    — calculadora de encalado DETERMINISTA
 *      (saturación de Al → dosis de cal; factores exactos = grounded-pendiente).
 *   3. Mejorar el suelo       — materia orgánica, coberturas, abonos verdes,
 *      micorrizas (PUENTE al grafo vía Mundo Subsuelo / agente / directorio).
 *
 * Coherencia (NO duplica): la cromatografía y el diagnóstico folk YA existen;
 * esta pantalla los ENLAZA, no los reimplementa. Las micorrizas viven en el
 * grafo (AGE) y se exponen por Mundo Subsuelo / agente; aquí se enlazan.
 *
 * CERO invención: el copy es estructura; las cifras finas de dosis salen de la
 * calculadora determinista, y sus factores de zona están marcados como
 * GROUNDED-PENDIENTE en encaladoCalculator.js.
 */

/* ── Ilustración SVG propia: perfil de suelo vivo (raíz + horizontes + fauna) ── */
function PerfilSueloIlustracion() {
  return (
    <svg
      viewBox="0 0 240 150"
      role="img"
      aria-label="Ilustración de un perfil de suelo vivo con raíz, lombriz y hongos"
      className="w-full h-auto"
    >
      {/* Cielo / aire */}
      <rect x="0" y="0" width="240" height="34" rx="6" fill="rgb(var(--t-accent-rgb) / 0.10)" />
      {/* Horizonte A — materia orgánica (oscuro) */}
      <path d="M0 34 H240 V70 Q120 62 0 70 Z" fill="#4b3a2a" />
      {/* Horizonte B — mineral (más claro) */}
      <path d="M0 70 Q120 62 240 70 V112 Q120 106 0 112 Z" fill="#7a5a3c" />
      {/* Horizonte C — roca madre */}
      <path d="M0 112 Q120 106 240 112 V150 H0 Z" fill="#8a6f52" />
      {/* Planta */}
      <g stroke="#3f7d3f" strokeWidth="2.4" strokeLinecap="round" fill="none">
        <path d="M120 34 V14" />
        <path d="M120 22 Q110 14 102 18" />
        <path d="M120 26 Q130 18 138 22" />
      </g>
      {/* Raíz principal + laterales (con leve animación de crecimiento) */}
      <g stroke="#d9b98a" strokeWidth="2" strokeLinecap="round" fill="none" className="ss-root">
        <path d="M120 34 V120" />
        <path d="M120 58 Q100 66 88 82" />
        <path d="M120 74 Q140 82 152 96" />
        <path d="M120 96 Q104 102 96 116" />
      </g>
      {/* Red de micorrizas (puntos difusos alrededor de la raíz) */}
      <g fill="rgb(var(--t-accent-rgb) / 0.85)" className="ss-myco">
        <circle cx="96" cy="80" r="2" />
        <circle cx="150" cy="94" r="2" />
        <circle cx="100" cy="112" r="2" />
        <circle cx="134" cy="70" r="1.6" />
        <circle cx="84" cy="96" r="1.6" />
      </g>
      {/* Lombriz */}
      <path d="M40 92 q8 -8 16 0 q8 8 16 0" fill="none" stroke="#c56b6b" strokeWidth="3.4" strokeLinecap="round" />
      {/* Sol */}
      <circle cx="210" cy="18" r="9" fill="#f4c14b" className="ss-sun" />
    </svg>
  );
}

/* ── Indicadores del análisis (pilar 1). Umbrales GROUNDED a valores GENERALES
 *    del DR de suelo (deepresearch/2026-07-03-suelo-salud-nacional-CO.md §1):
 *      - pH: óptimo general 5,5–7,0; neutro 6,6–7,3; alcalino >7,5 (USDA/IGAC,
 *        confianza alta).
 *      - P (Bray II) y K: cortes de la interpretación Cenicafé para café —
 *        <10 ppm P y <0,2 cmol/kg K = bajo (confianza media-alta, clima
 *        frío-medio andino).
 *    Los cortes FINOS por cultivo/región siguen GROUNDED-PENDIENTE — el DR ADVIERTE
 *    explícitamente que los umbrales de MO de Cenicafé (8–16 %) NO se pueden pasar
 *    a clima cálido, por eso la MO se deja en un rango general conservador. ── */
const INDICADORES_ANALISIS = [
  {
    key: 'ph', label: 'pH (acidez)', icon: Gauge, unidad: '', ejemplo: '5.4',
    ayuda: 'Menos de 5.5 = tierra ácida (muchos cultivos sufren). 5.5–7.0 es el rango óptimo para la mayoría (USDA).',
    // GROUNDED (DR suelo §1.1, USDA/IGAC): óptimo 5,5–7,0; alcalino >7,5.
    // Corte fino por cultivo (café/papa/aguacate) sigue pendiente.
    interpreta: (v) => v == null ? null
      : v < 5.5 ? { txt: 'Ácida — conviene revisar encalado', color: 'amber' }
      : v <= 7.3 ? { txt: 'En buen rango', color: 'emerald' }
      : { txt: 'Alcalina — puede trabar hierro y zinc', color: 'lime' },
  },
  {
    key: 'mo', label: 'Materia orgánica', icon: Leaf, unidad: '%', ejemplo: '3.2',
    ayuda: 'Es la "comida" de la vida del suelo. Más materia orgánica = tierra más viva, más esponja, más retención.',
    // GROUNDED-PENDIENTE (a propósito): el DR ADVIERTE que los umbrales de MO
    // varían fuerte por clima (Cenicafé 8–16 % es de clima frío; en cálido un
    // 5 % ya es "muy alto"). Se usa un rango general conservador, no el andino.
    interpreta: (v) => v == null ? null
      : v < 2 ? { txt: 'Baja — la tierra puede estar cansada', color: 'amber' }
      : v <= 5 ? { txt: 'Aceptable', color: 'emerald' }
      : { txt: 'Alta — suelo con buena reserva', color: 'emerald' },
  },
  {
    key: 'p', label: 'Fósforo (P)', icon: Sprout, unidad: 'ppm', ejemplo: '12',
    ayuda: 'Clave para raíces y floración. En suelos ácidos el aluminio y el hierro lo "traban": ahí las micorrizas ayudan mucho.',
    // GROUNDED (DR suelo §1.1, Cenicafé Bray II, clima frío-medio): <10 ppm bajo,
    // 10–20 medio, >20 alto. Corte por método (Olsen) y suelo sigue pendiente.
    interpreta: (v) => v == null ? null
      : v < 10 ? { txt: 'Bajo', color: 'amber' } : { txt: 'Suficiente o alto', color: 'emerald' },
  },
  {
    key: 'k', label: 'Potasio (K)', icon: Wheat, unidad: 'cmol/kg', ejemplo: '0.3',
    ayuda: 'Da vigor, resistencia y calidad al fruto. Se pierde fácil en tierras arenosas.',
    // GROUNDED (DR suelo §1.1, Cenicafé, clima frío-medio): <0,2 bajo, 0,2–0,4
    // medio, >0,4 alto. Corte fino por cultivo sigue pendiente.
    interpreta: (v) => v == null ? null
      : v < 0.2 ? { txt: 'Bajo', color: 'amber' } : { txt: 'Adecuado', color: 'emerald' },
  },
  {
    key: 'al_sat', label: 'Saturación de aluminio', icon: AlertTriangle, unidad: '%', ejemplo: '35',
    ayuda: 'El aluminio libre quema las raíces. Este número decide si hace falta cal. Se calcula solo en la pestaña "Corregir la acidez".',
    interpreta: (v) => {
      const info = interpretarSaturacionAl(v == null ? null : v);
      return v == null ? null : { txt: info.label, color: info.color };
    },
  },
];

const COLOR_MAP = {
  emerald: { text: 'text-emerald-300', border: 'border-emerald-700/50', bg: 'bg-emerald-950/30', dot: 'bg-emerald-400' },
  lime: { text: 'text-lime-300', border: 'border-lime-700/50', bg: 'bg-lime-950/30', dot: 'bg-lime-400' },
  amber: { text: 'text-amber-300', border: 'border-amber-700/50', bg: 'bg-amber-950/30', dot: 'bg-amber-400' },
  rose: { text: 'text-rose-300', border: 'border-rose-700/50', bg: 'bg-rose-950/30', dot: 'bg-rose-400' },
  slate: { text: 'text-slate-300', border: 'border-slate-700/50', bg: 'bg-slate-900/50', dot: 'bg-slate-500' },
};

/* ── Prácticas para mejorar el suelo (pilar 3). Estructura + copy; las dosis
 *    finas se remiten al agente/directorio (grounded). ── */
const PRACTICAS_MEJORA = [
  {
    icon: Leaf, titulo: 'Subir la materia orgánica',
    texto: 'Compost, bocashi, humus de lombriz y dejar los residuos de la cosecha. Es la base: alimenta la vida y hace la tierra más esponja.',
  },
  {
    icon: Recycle, titulo: 'Coberturas vivas y muertas',
    texto: 'Tapar el suelo con hojarasca o plantas de cobertura. Protege de la lluvia y el sol, guarda humedad y frena la erosión.',
  },
  {
    icon: Sprout, titulo: 'Abonos verdes / leguminosas',
    texto: 'Fríjol de abono, crotalaria, canavalia. Las leguminosas fijan nitrógeno del aire con sus bacterias: abonan sin bolsa.',
  },
  {
    icon: Worm, titulo: 'Cuidar la vida del suelo',
    texto: 'Menos remoción, menos veneno. Lombrices, hongos y bacterias son los que trabajan la tierra por usted.',
  },
];

/* ═══════════════════════════════ Componente ═══════════════════════════════ */
/**
 * @param {Object} props
 * @param {() => void} props.onBack
 * @param {(view: string, data?: any) => void} [props.onNavigate]
 */
export default function SaludSueloScreen({ onBack, onNavigate }) {
  const [pilar, setPilar] = useState('hub'); // hub | analisis | acidez | mejorar

  const volver = () => {
    if (pilar === 'hub') { onBack?.(); return; }
    setPilar('hub');
  };

  const Header = (
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
        <h1 className="text-lg font-bold leading-tight text-white">Cuaderno del Suelo</h1>
        <p className="text-xs text-slate-400 leading-tight">
          {pilar === 'hub' ? 'La salud de su tierra, paso a paso.'
            : pilar === 'analisis' ? '¿Cómo está mi suelo?'
            : pilar === 'acidez' ? 'Corregir la acidez'
            : pilar === 'vida' ? 'La vida del suelo'
            : 'Mejorar el suelo'}
        </p>
      </div>
    </header>
  );

  return (
    <div className="min-h-[100dvh] text-white">
      {Header}
      <div className="px-4 pb-10">
        {pilar === 'hub' && <Hub onIr={setPilar} onNavigate={onNavigate} />}
        {pilar === 'analisis' && <PilarAnalisis onNavigate={onNavigate} onIr={setPilar} />}
        {pilar === 'acidez' && <PilarAcidez />}
        {pilar === 'vida' && <PilarVida onNavigate={onNavigate} />}
        {pilar === 'mejorar' && <PilarMejora onNavigate={onNavigate} />}
      </div>
    </div>
  );
}

/* ─────────────────────────────────── Hub ─────────────────────────────────── */
function Hub({ onIr, onNavigate }) {
  const pilares = [
    { key: 'analisis', icon: Gauge, titulo: '¿Cómo está mi suelo?', desc: 'Lea su análisis: pH, materia orgánica, N-P-K y aluminio, en palabras claras.', accent: 'emerald' },
    { key: 'acidez', icon: Calculator, titulo: 'Corregir la acidez', desc: 'Calculadora de cal: de la saturación de aluminio a los bultos por hectárea.', accent: 'amber' },
    { key: 'vida', icon: Worm, titulo: 'La vida del suelo', desc: 'Lombrices, hongos, micorrizas y microbios: la tierra viva, con fotos reales.', accent: 'lime' },
    { key: 'mejorar', icon: Leaf, titulo: 'Mejorar el suelo', desc: 'Materia orgánica, coberturas, abonos verdes y micorrizas para una tierra viva.', accent: 'emerald' },
  ];
  return (
    <div className="flex flex-col gap-4">
      {/* Caso insignia — el léxico campesino como entrada */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="p-4 pb-3">
          <PerfilSueloIlustracion />
        </div>
        <div className="px-4 pb-4">
          <p className="text-[13px] uppercase tracking-wide font-bold text-slate-400">Caso frecuente</p>
          <p className="mt-1 text-[15px] text-slate-100 leading-snug">
            <span className="font-bold">"Mi tierra está cansada y ácida, ya no da como antes."</span>
          </p>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Vamos por partes: primero <span className="font-semibold text-slate-100">leemos cómo está</span>,
            luego <span className="font-semibold text-slate-100">corregimos la acidez</span> si hace falta,
            y por último <span className="font-semibold text-slate-100">la volvemos a llenar de vida</span>.
          </p>
        </div>
      </section>

      {/* Tres pilares */}
      <div className="flex flex-col gap-3">
        {pilares.map((p, i) => {
          const c = COLOR_MAP[p.accent];
          const Icono = p.icon;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onIr(p.key)}
              className={`text-left rounded-2xl border ${c.border} ${c.bg} p-4 flex items-start gap-3 hover:border-opacity-100 transition-colors motion-reduce:transition-none active:scale-[0.99]`}
            >
              <span
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgb(var(--t-accent-rgb) / 0.20)' }}
              >
                <Icono size={22} className={c.text} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500">Paso {i + 1}</span>
                </span>
                <span className="block text-[15px] font-bold text-white leading-tight">{p.titulo}</span>
                <span className="block text-sm text-slate-300 mt-0.5 leading-snug">{p.desc}</span>
              </span>
              <ChevronRight size={20} className="text-slate-500 shrink-0 mt-2" />
            </button>
          );
        })}
      </div>

      {/* Puente honesto a herramientas existentes (NO duplicar) */}
      {onNavigate ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
          <p className="text-xs uppercase tracking-wide font-bold text-slate-400 mb-2">También en Chagra</p>
          <div className="flex flex-col gap-2">
            <PuenteBoton
              icon={FlaskConical}
              titulo="Cromatografía de suelo"
              sub="Vea la vida y los minerales de su tierra en colores."
              onClick={() => onNavigate('cromatografia')}
            />
            <PuenteBoton
              icon={Sprout}
              titulo="Diagnóstico sin laboratorio"
              sub="Pruebas caseras honestas si aún no tiene análisis."
              onClick={() => onNavigate('suelo')}
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

/* ───────────────────── Pilar 1 — ¿Cómo está mi suelo? ─────────────────────── */
function PilarAnalisis({ onNavigate, onIr }) {
  const [valores, setValores] = useState({ ph: '', mo: '', p: '', k: '', al_sat: '' });

  const setV = (key, raw) => {
    // Acepta coma decimal (uso local) y solo números.
    const limpio = raw.replace(',', '.').replace(/[^0-9.]/g, '');
    setValores((prev) => ({ ...prev, [key]: limpio }));
  };

  const num = (s) => (s === '' || s == null ? null : Number.parseFloat(s));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-300 leading-relaxed">
        Escriba lo que dice su análisis de suelo (el papel del laboratorio). Solo lo que tenga a mano;
        lo que no sepa, déjelo vacío. Le traducimos cada número a palabras claras.
      </p>

      <div className="flex flex-col gap-3">
        {INDICADORES_ANALISIS.map((ind) => {
          const Icono = ind.icon;
          const v = num(valores[ind.key]);
          const res = ind.interpreta(v);
          const c = res ? COLOR_MAP[res.color] : COLOR_MAP.slate;
          const bloqueado = ind.key === 'al_sat';
          return (
            <div key={ind.key} className={`rounded-xl border ${res ? c.border : 'border-slate-800'} bg-slate-900/60 p-3`}>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-100">
                <Icono size={18} style={{ color: 'rgb(var(--t-accent-rgb))' }} />
                {ind.label}
              </label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={valores[ind.key]}
                  onChange={(e) => setV(ind.key, e.target.value)}
                  disabled={bloqueado}
                  placeholder={bloqueado ? 'Se calcula en "Corregir la acidez"' : `ej. ${ind.ejemplo}`}
                  aria-label={ind.label}
                  className="flex-1 min-w-0 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-500 disabled:opacity-50"
                />
                {ind.unidad ? <span className="text-xs text-slate-400 shrink-0">{ind.unidad}</span> : null}
              </div>
              {res ? (
                <div className={`mt-2 flex items-center gap-2 text-sm ${c.text}`}>
                  <span className={`w-2 h-2 rounded-full ${c.dot}`} aria-hidden="true" />
                  <span className="font-semibold">{res.txt}</span>
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-400 leading-snug">{ind.ayuda}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Puente a la acidez si el pH salió ácido */}
      {num(valores.ph) != null && num(valores.ph) < 5.5 ? (
        <button
          type="button"
          onClick={() => onIr('acidez')}
          className="rounded-xl border border-amber-700/50 bg-amber-950/30 p-3 flex items-center gap-2.5 text-left hover:border-amber-600 transition-colors"
        >
          <Calculator size={20} className="shrink-0 text-amber-400" />
          <span className="text-sm text-amber-100 flex-1">
            <span className="font-bold">Su tierra salió ácida.</span> Calcule cuánta cal necesita.
          </span>
          <ArrowRight size={18} className="shrink-0 text-amber-400" />
        </button>
      ) : null}

      {/* Enlace a la cromatografía como lectura complementaria */}
      {onNavigate ? (
        <PuenteBoton
          icon={FlaskConical}
          titulo="Contrástelo con una cromatografía"
          sub="La foto de colores muestra la vida del suelo que los números no ven."
          onClick={() => onNavigate('cromatografia')}
        />
      ) : null}

      <p className="text-xs text-slate-500 leading-relaxed">
        <Info size={13} className="inline mr-1 -mt-0.5" />
        Los rangos son una guía general. El nivel exacto ideal cambia según su cultivo y su región
        (dato pendiente de anclar por zona). Para una recomendación fina, consulte a su técnico o al agente.
      </p>
    </div>
  );
}

/* ────────────────────── Pilar 2 — Corregir la acidez ──────────────────────── */
function PilarAcidez() {
  const [bases, setBases] = useState({ al: '', ca: '', mg: '', k: '' });
  const [fuente, setFuente] = useState(
    /** @type {'cal_dolomita'|'cal_agricola'|'cal_viva'} */ ('cal_dolomita')
  );
  const [objetivo, setObjetivo] = useState(String(SATURACION_AL_OBJETIVO_DEFAULT));
  const [hectareas, setHectareas] = useState('1');

  const setB = (key, raw) => {
    const limpio = raw.replace(',', '.').replace(/[^0-9.]/g, '');
    setBases((prev) => ({ ...prev, [key]: limpio }));
  };

  const numBases = useMemo(() => ({
    al: parseNum(bases.al), ca: parseNum(bases.ca), mg: parseNum(bases.mg), k: parseNum(bases.k),
  }), [bases]);

  const tieneMinimo = numBases.al > 0 && (numBases.ca > 0 || numBases.mg > 0);

  const resultado = useMemo(() => {
    if (!tieneMinimo) return null;
    const cice = calcularCICE(numBases);
    const satAl = calcularSaturacionAluminio(numBases);
    const obj = parseNum(objetivo) || SATURACION_AL_OBJETIVO_DEFAULT;
    const dosis = calcularDosisCal(numBases, { saturacionObjetivo: obj, fuente });
    const avisos = guardasEncalado(numBases, satAl);
    return { cice, satAl, dosis, avisos };
  }, [numBases, tieneMinimo, objetivo, fuente]);

  const ha = parseNum(hectareas) || 1;
  const interpretSat = resultado ? interpretarSaturacionAl(resultado.satAl) : null;
  const satColor = interpretSat ? COLOR_MAP[interpretSat.color] : COLOR_MAP.slate;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <div className="flex items-start gap-2.5">
          <Beaker size={20} className="shrink-0 mt-0.5" style={{ color: 'rgb(var(--t-accent-rgb))' }} />
          <p className="text-sm text-slate-300 leading-relaxed">
            Copie del análisis los cationes intercambiables en <span className="font-semibold text-slate-100">cmol(+)/kg</span> (a
            veces los llaman "meq/100 g", es lo mismo). Con eso calculamos la saturación de aluminio y la cal que necesita.
          </p>
        </div>
      </div>

      {/* Entradas de bases */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { key: 'al', label: 'Aluminio (Al)', ej: '1.8' },
          { key: 'ca', label: 'Calcio (Ca)', ej: '2.5' },
          { key: 'mg', label: 'Magnesio (Mg)', ej: '0.8' },
          { key: 'k', label: 'Potasio (K)', ej: '0.3' },
        ].map((f) => (
          <div key={f.key} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <label className="block text-sm font-bold text-slate-100 leading-tight">{f.label}</label>
            <div className="mt-1.5 flex items-center gap-1.5">
              <input
                type="text"
                inputMode="decimal"
                value={bases[f.key]}
                onChange={(e) => setB(f.key, e.target.value)}
                placeholder={`ej. ${f.ej}`}
                aria-label={f.label}
                className="w-full min-w-0 rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-500"
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-500">cmol(+)/kg</p>
          </div>
        ))}
      </div>

      {/* Fuente de cal + objetivo + hectáreas */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 flex flex-col gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide font-bold text-slate-400 mb-1.5">¿Qué cal va a usar?</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(FUENTES_CAL).map(([rawKey, info]) => {
              const key = /** @type {keyof typeof FUENTES_CAL} */ (rawKey);
              const activo = fuente === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFuente(key)}
                  aria-pressed={activo}
                  className={`min-h-[40px] px-3 rounded-full border text-sm font-semibold transition-colors ${
                    activo ? 'border-transparent text-white' : 'bg-slate-800 border-slate-700 text-slate-200 hover:border-slate-500'
                  }`}
                  style={activo ? { backgroundColor: 'rgb(var(--t-accent-rgb) / 0.25)', boxShadow: 'inset 0 0 0 2px rgb(var(--t-accent-rgb))' } : undefined}
                >
                  {info.label}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">{FUENTES_CAL[fuente].nota} (PRNT ~{FUENTES_CAL[fuente].prnt}%)</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase tracking-wide font-bold text-slate-400 mb-1">Al objetivo (%)</label>
            <input
              type="text" inputMode="decimal" value={objetivo}
              onChange={(e) => setObjetivo(e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))}
              aria-label="Saturación de aluminio objetivo"
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-2 text-sm text-white focus:outline-none focus:border-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide font-bold text-slate-400 mb-1">Hectáreas</label>
            <input
              type="text" inputMode="decimal" value={hectareas}
              onChange={(e) => setHectareas(e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))}
              aria-label="Número de hectáreas"
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-2 text-sm text-white focus:outline-none focus:border-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Resultado */}
      {!tieneMinimo ? (
        <p className="text-sm text-slate-400 text-center py-4">
          Escriba al menos el aluminio y el calcio (o magnesio) para calcular.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Saturación de Al */}
          <div className={`rounded-xl border ${satColor.border} ${satColor.bg} p-3`}>
            <p className="text-xs uppercase tracking-wide font-bold text-slate-400">Saturación de aluminio</p>
            <p className={`text-3xl font-black mt-0.5 ${satColor.text}`}>
              {resultado.satAl != null ? `${resultado.satAl.toFixed(0)}%` : '—'}
            </p>
            <p className={`text-sm font-semibold ${satColor.text}`}>{interpretSat?.label}</p>
          </div>

          {/* Dosis */}
          {resultado.dosis.necesitaCal ? (
            <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-300 shrink-0" />
                <p className="text-sm font-bold text-emerald-200">Dosis estimada de {resultado.dosis.fuente}</p>
              </div>
              <p className="text-4xl font-black text-white mt-2 leading-none">
                {resultado.dosis.dosisRealTha.toFixed(1)}
                <span className="text-lg font-bold text-slate-300"> t/ha</span>
              </p>
              <p className="text-sm text-emerald-200/90 mt-1">
                ≈ {(resultado.dosis.dosisRealTha * 20).toFixed(0)} bultos de 50 kg por hectárea
                {ha !== 1 ? ` · ${(resultado.dosis.dosisRealTha * ha).toFixed(1)} t para sus ${ha} ha` : ''}
              </p>
              <div className="mt-3 pt-3 border-t border-emerald-800/40 text-xs text-emerald-200/70 leading-relaxed">
                Equivale a {resultado.dosis.requerimientoCmol} cmol(+)/kg de CaCO₃
                ({resultado.dosis.dosisCaCO3Tha.toFixed(1)} t/ha puro, ajustado a PRNT {resultado.dosis.prnt}%).
                Fórmula de Cochrane, Salinas &amp; Sánchez (1980).
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-4 flex items-start gap-2.5">
              <CheckCircle2 size={20} className="text-emerald-300 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-100">
                <span className="font-bold">No necesita encalar.</span> La saturación de aluminio ya está
                por debajo de su objetivo. Encalar de más bloquea fósforo, zinc y boro.
              </p>
            </div>
          )}

          {/* Guardas de seguridad */}
          <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 overflow-hidden">
            <div className="flex items-center gap-2 p-3 border-b border-amber-800/30">
              <AlertTriangle size={18} className="text-amber-400 shrink-0" />
              <h3 className="text-sm font-bold text-amber-300">Antes de aplicar</h3>
            </div>
            <ul className="p-3 flex flex-col gap-2">
              {resultado.avisos.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-amber-100/90">
                  <span className="text-amber-400 shrink-0 mt-0.5" aria-hidden="true">•</span>
                  <span className="leading-snug">{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Transparencia de supuestos — honestidad grounded-pendiente */}
      <details className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
        <summary className="text-sm font-bold text-slate-200 cursor-pointer">Cómo se calcula (supuestos)</summary>
        <div className="mt-2 text-xs text-slate-400 leading-relaxed flex flex-col gap-1.5">
          <p>Saturación de Al = Al ÷ (Al + Ca + Mg + K) × 100. Es matemática exacta.</p>
          <p>Requerimiento (cmol/kg) = 1.5 × [Al − (objetivo/100) × CICE], método de Cochrane, Salinas &amp; Sánchez (1980).</p>
          <p>
            <span className="font-bold text-slate-300">Pendiente de anclar por zona</span>: la conversión a
            toneladas por hectárea usa densidad aparente y profundidad de referencia (20 cm), y el PRNT
            típico de cada cal. Los valores exactos de <em>su</em> suelo y <em>su</em> producto cambian el
            número. Trátelo como una estimación orientadora, no como receta cerrada.
          </p>
        </div>
      </details>
    </div>
  );
}

/* ═══════════════════ Pilar — La vida del suelo (foto real) ═══════════════════ */

const ICONO_ETAPA = { hojarasca: Leaf, descomponen: Worm, humus: Layers, nutrientes: Beaker, planta: Sprout };
const ICONO_CUIDADO = { fuego: Flame, veneno: Ban, cobertura: Umbrella, alimento: Salad };

/** Anillo del ciclo — motivo "reciclar" que gira muy lento (se apaga con
 *  prefers-reduced-motion vía la clase .vs-ring en index.css). */
function CicloAnillo() {
  return (
    <svg viewBox="0 0 96 96" role="img" aria-label="El ciclo de la vida del suelo gira sin parar" className="w-20 h-20 shrink-0">
      <g className="vs-ring" style={{ transformOrigin: '48px 48px' }}>
        <path d="M48 12 A36 36 0 0 1 82 62" fill="none" stroke="rgb(var(--t-accent-rgb))" strokeWidth="6" strokeLinecap="round" opacity="0.9" />
        <path d="M82 62 l-2 -13 l13 4 z" fill="rgb(var(--t-accent-rgb))" />
        <path d="M48 84 A36 36 0 0 1 14 34" fill="none" stroke="rgb(var(--t-accent-rgb))" strokeWidth="6" strokeLinecap="round" opacity="0.55" />
        <path d="M14 34 l2 13 l-13 -4 z" fill="rgb(var(--t-accent-rgb))" />
      </g>
      <circle cx="48" cy="48" r="7" fill="rgb(var(--t-accent-rgb) / 0.35)" />
    </svg>
  );
}

/** Tarjeta de un habitante del suelo, con foto real (licencia abierta). */
function HabitanteCard({ h }) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden flex flex-col">
      <div className="relative aspect-[4/3] bg-slate-950">
        {imgOk ? (
          <img
            src={`${FOTO_BASE}/${h.slug}.jpg`}
            alt={`Foto de ${h.nombre} (${h.tecnico})`}
            loading="lazy"
            decoding="async"
            onError={() => setImgOk(false)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl" aria-hidden="true">{h.emoji}</div>
        )}
        {/* Chip del nombre folk sobre la FOTO: scrim oscuro FIJO + texto blanco
         *  literal (text-[#fff] no lo vira el remapeo de temas claros de .text-white),
         *  para que quede legible sobre la imagen en cualquier tema y al sol. */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-2.5 pt-8">
          <p className="text-[15px] font-black text-[#ffffff] leading-tight drop-shadow">
            <span aria-hidden="true" className="mr-1">{h.emoji}</span>{h.nombre}
          </p>
          <p className="text-[11px] text-[#e2e8f0] leading-tight italic">{h.tecnico}</p>
        </div>
      </div>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-[13px] font-bold leading-snug" style={{ color: 'rgb(var(--t-accent-deep-rgb))' }}>
          «{h.lema}»
        </p>
        <p className="text-sm text-slate-200 leading-snug">{h.papel}</p>
        <div className="mt-auto rounded-lg bg-slate-800/80 border border-slate-700/60 p-2.5">
          <p className="text-[10px] uppercase tracking-wider font-bold mb-0.5" style={{ color: 'rgb(var(--t-accent-deep-rgb))' }}>En su finca lo ve así</p>
          <p className="text-[13px] text-slate-100 leading-snug">{h.senal}</p>
        </div>
      </div>
    </article>
  );
}

/**
 * @param {Object} props
 * @param {(view: string, data?: any) => void} [props.onNavigate]
 */
function PilarVida({ onNavigate }) {
  const [perfilOk, setPerfilOk] = useState(true);
  const [creditos, setCreditos] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      {/* Frase que engancha */}
      <section className="rounded-2xl border border-lime-800/50 bg-gradient-to-br from-lime-950/50 to-slate-900 p-4">
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 vs-pulse"
            style={{ backgroundColor: 'rgb(var(--t-accent-rgb) / 0.22)' }}>
            <Bug size={24} style={{ color: 'rgb(var(--t-accent-rgb))' }} />
          </span>
          <div>
            <p className="text-[17px] font-black text-white leading-tight">
              En un puñado de tierra sana viven más seres que personas hay en el mundo.
            </p>
            <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
              No se ven, pero son los que hacen el trabajo: sueltan el abono, guardan el agua y
              defienden a la mata. Cuidar el suelo es cuidar a esos trabajadores.
            </p>
          </div>
        </div>
      </section>

      {/* Perfil del suelo — foto real + horizontes */}
      <section aria-label="El perfil del suelo por capas">
        <h2 className="text-[15px] font-black text-white mb-2 flex items-center gap-2">
          <Layers size={18} style={{ color: 'rgb(var(--t-accent-rgb))' }} /> El suelo por capas
        </h2>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden flex flex-col sm:flex-row">
          <div className="relative sm:w-2/5 aspect-[3/4] sm:aspect-auto bg-slate-950 shrink-0">
            {perfilOk ? (
              <img
                src={`${FOTO_BASE}/perfil.jpg`}
                alt="Foto de un perfil de suelo real mostrando sus capas u horizontes, de la hojarasca a la roca madre"
                loading="lazy"
                decoding="async"
                onError={() => setPerfilOk(false)}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 p-3 flex items-center justify-center"><PerfilSueloIlustracion /></div>
            )}
          </div>
          <ol className="flex-1 divide-y divide-slate-800">
            {HORIZONTES.map((hz) => (
              <li key={hz.sigla} className="flex items-start gap-3 p-3">
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-black text-[#ffffff] border border-white/15"
                  style={{ backgroundColor: hz.color }}
                >
                  {hz.sigla}
                </span>
                <div>
                  <p className="text-sm font-bold text-white leading-tight">
                    {hz.nombre} <span className="text-[11px] font-normal text-slate-400">· {hz.tecnico}</span>
                  </p>
                  <p className="text-[13px] text-slate-300 leading-snug mt-0.5">{hz.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
          <Info size={12} className="inline mr-1 -mt-0.5" />
          Cada finca tiene su propio perfil; el grosor y el color de las capas cambian con el terreno.
        </p>
      </section>

      {/* Los habitantes — galería con fotos reales */}
      <section aria-label="Los habitantes del suelo">
        <h2 className="text-[15px] font-black text-white mb-1 flex items-center gap-2">
          <Worm size={18} style={{ color: 'rgb(var(--t-accent-rgb))' }} /> Quién vive ahí abajo
        </h2>
        <p className="text-[13px] text-slate-400 mb-3 leading-snug">
          Del más grande al invisible. Todos trabajan gratis, día y noche.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {HABITANTES.map((h) => <HabitanteCard key={h.slug} h={h} />)}
        </div>
      </section>

      {/* El ciclo — de la hojarasca al alimento y otra vez */}
      <section aria-label="El ciclo de la vida del suelo" className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center gap-3 mb-3">
          <CicloAnillo />
          <div>
            <h2 className="text-[15px] font-black text-white leading-tight">La rueda que no para</h2>
            <p className="text-[13px] text-slate-300 leading-snug mt-0.5">
              Así la vida convierte el resto en fertilidad y vuelve a empezar.
            </p>
          </div>
        </div>
        <ol className="relative flex flex-col">
          {CICLO_ETAPAS.map((e, i) => {
            const Icono = ICONO_ETAPA[e.icono] || Leaf;
            const last = i === CICLO_ETAPAS.length - 1;
            return (
              <li key={e.n} className="flex gap-3">
                <div className="flex flex-col items-center shrink-0">
                  <span className="w-9 h-9 rounded-full flex items-center justify-center border-2"
                    style={{ borderColor: 'rgb(var(--t-accent-rgb))', backgroundColor: 'rgb(var(--t-accent-rgb) / 0.15)' }}>
                    <Icono size={17} style={{ color: 'rgb(var(--t-accent-rgb))' }} />
                  </span>
                  {!last && <span className="w-0.5 flex-1 min-h-[14px]" style={{ backgroundColor: 'rgb(var(--t-accent-rgb) / 0.35)' }} />}
                </div>
                <div className={last ? 'pb-0' : 'pb-4'}>
                  <p className="text-sm font-bold text-white leading-tight">{e.n}. {e.titulo}</p>
                  <p className="text-[13px] text-slate-300 leading-snug mt-0.5">{e.texto}</p>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
          Ese nitrógeno, fósforo y potasio son los mismos números N-P-K de su análisis, en la pestaña «¿Cómo está mi suelo?».
        </p>
      </section>

      {/* Cómo proteger esta vida */}
      <section aria-label="Cómo cuidar la vida del suelo">
        <h2 className="text-[15px] font-black text-white mb-3 flex items-center gap-2">
          <Leaf size={18} style={{ color: 'rgb(var(--t-accent-rgb))' }} /> Cómo cuidar esta vida
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {CUIDADOS_VIDA.map((c) => {
            const Icono = ICONO_CUIDADO[c.icono] || Leaf;
            return (
              <div key={c.titulo} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icono size={18} style={{ color: 'rgb(var(--t-accent-rgb))' }} />
                  <h3 className="text-sm font-bold text-white leading-tight">{c.titulo}</h3>
                </div>
                <p className="text-[13px] text-slate-300 leading-snug">{c.texto}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Puentes a lo que ya existe */}
      {onNavigate ? (
        <div className="flex flex-col gap-2">
          <PuenteBoton
            icon={Worm}
            titulo="Mundo Subsuelo"
            sub="Decida y vea cómo revive el suelo con compost, hongos y lombrices."
            onClick={() => onNavigate('subsuelo')}
          />
          <PuenteBoton
            icon={FlaskConical}
            titulo="Cromatografía de suelo"
            sub="El retrato en colores de esta vida que las fotos no alcanzan a mostrar."
            onClick={() => onNavigate('cromatografia')}
          />
          <PuenteBoton
            icon={Sprout}
            titulo="Pregúntele al agente"
            sub="Qué sembrar o inocular para despertar la vida de su tierra."
            onClick={() => onNavigate('agente', { prompt: '¿Cómo despierto la vida de mi suelo (lombrices y micorrizas)?' })}
          />
        </div>
      ) : null}

      {/* Créditos de fotos — cumplimiento de licencia abierta */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
        <button
          type="button"
          onClick={() => setCreditos((v) => !v)}
          aria-expanded={creditos}
          className="w-full flex items-center gap-2 text-left"
        >
          <Camera size={15} className="text-slate-400 shrink-0" />
          <span className="text-xs font-bold text-slate-300 flex-1">Créditos de las fotos (licencia abierta)</span>
          <ChevronRight size={16} className={`text-slate-500 transition-transform ${creditos ? 'rotate-90' : ''}`} />
        </button>
        {creditos && (
          <ul className="mt-2.5 pt-2.5 border-t border-slate-800 flex flex-col gap-1.5">
            {CREDITOS_FOTOS.map((cr) => (
              <li key={cr.slug} className="text-[11px] text-slate-400 leading-snug">
                <a href={cr.url} target="_blank" rel="noopener noreferrer"
                  className="font-semibold text-slate-200 hover:text-white underline decoration-slate-600 underline-offset-2 inline-flex items-center gap-0.5">
                  {cr.slug}<ExternalLink size={10} className="inline shrink-0" />
                </a>
                <span className="text-slate-500"> — {cr.autor} · {cr.lic} · Wikimedia Commons</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Pilar 3 — Mejorar el suelo ─────────────────────── */
function PilarMejora({ onNavigate }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-300 leading-relaxed">
        Corregir la acidez es el arranque. Lo que de verdad recupera una tierra cansada es
        <span className="font-semibold text-slate-100"> devolverle vida</span>: materia orgánica, raíces
        vivas todo el año y los aliados invisibles del suelo.
      </p>

      <div className="flex flex-col gap-3">
        {PRACTICAS_MEJORA.map((p) => {
          const Icono = p.icon;
          return (
            <div key={p.titulo} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 flex items-start gap-3">
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgb(var(--t-accent-rgb) / 0.18)' }}
              >
                <Icono size={20} style={{ color: 'rgb(var(--t-accent-rgb))' }} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-100">{p.titulo}</h3>
                <p className="text-sm text-slate-300 mt-0.5 leading-snug">{p.texto}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bloque micorrizas — enlaza al grafo (Mundo Subsuelo / agente), NO reimplementa */}
      <section className="rounded-2xl border border-lime-800/40 bg-lime-950/20 p-4">
        <div className="flex items-center gap-2">
          <Layers size={20} className="text-lime-300 shrink-0" />
          <h3 className="text-[15px] font-bold text-lime-200">Micorrizas: el internet del suelo</h3>
        </div>
        <p className="text-sm text-lime-100/90 mt-2 leading-relaxed">
          Son hongos que se unen a las raíces y les extienden el alcance para buscar agua y fósforo,
          justo el que la tierra ácida traba. Cuidarlas (menos veneno, menos arado) vale más que muchas bolsas de abono.
        </p>
        {onNavigate ? (
          <div className="mt-3 flex flex-col gap-2">
            <PuenteBoton
              icon={Worm}
              titulo="Mundo Subsuelo"
              sub="Vea cómo trabajan las micorrizas y la vida del suelo, paso a paso."
              onClick={() => onNavigate('subsuelo')}
            />
            <PuenteBoton
              icon={Sprout}
              titulo="Pregúntele al agente"
              sub="Qué especies asociar, con qué inocular y cómo cuidar sus micorrizas."
              onClick={() => onNavigate('agente', { prompt: '¿Cómo cuido las micorrizas de mi suelo?' })}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}

/* util local */
function parseNum(s) {
  if (s === '' || s == null) return 0;
  const n = Number.parseFloat(String(s).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}
