/* i18n (ADR-050): etiquetas user-facing en español Colombia pendientes de
 * migrar a src/config/messages.js. Misma deuda preexistente que SoilDiagnosticScreen
 * y App.jsx; se desactiva la regla soft a nivel de archivo. */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import { useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Sprout, Layers, Recycle, Calculator,
  FlaskConical, AlertTriangle, CheckCircle2, Info, Leaf, Worm, Gauge,
  Beaker, ArrowRight, Wheat,
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

/* ── Indicadores del análisis (pilar 1). Umbrales = referencia general;
 *    los cortes finos por cultivo/región son GROUNDED-PENDIENTE. ── */
const INDICADORES_ANALISIS = [
  {
    key: 'ph', label: 'pH (acidez)', icon: Gauge, unidad: '', ejemplo: '5.4',
    ayuda: 'Menos de 5.5 = tierra ácida (muchos cultivos sufren). 6.0–6.8 es lo ideal para la mayoría.',
    // GROUNDED-PENDIENTE: rango óptimo exacto por cultivo (café/papa/aguacate…).
    interpreta: (v) => v == null ? null
      : v < 5.5 ? { txt: 'Ácida — conviene revisar encalado', color: 'amber' }
      : v <= 6.8 ? { txt: 'En buen rango', color: 'emerald' }
      : { txt: 'Alcalina — puede trabar hierro y zinc', color: 'lime' },
  },
  {
    key: 'mo', label: 'Materia orgánica', icon: Leaf, unidad: '%', ejemplo: '3.2',
    ayuda: 'Es la "comida" de la vida del suelo. Más materia orgánica = tierra más viva, más esponja, más retención.',
    // GROUNDED-PENDIENTE: umbral de MO adecuada varía por clima (andino alto vs cálido).
    interpreta: (v) => v == null ? null
      : v < 2 ? { txt: 'Baja — la tierra puede estar cansada', color: 'amber' }
      : v <= 5 ? { txt: 'Aceptable', color: 'emerald' }
      : { txt: 'Alta — suelo con buena reserva', color: 'emerald' },
  },
  {
    key: 'p', label: 'Fósforo (P)', icon: Sprout, unidad: 'ppm', ejemplo: '12',
    ayuda: 'Clave para raíces y floración. En suelos ácidos el aluminio y el hierro lo "traban": ahí las micorrizas ayudan mucho.',
    // GROUNDED-PENDIENTE: nivel crítico de P depende del método (Bray/Olsen) y suelo.
    interpreta: (v) => v == null ? null
      : v < 10 ? { txt: 'Bajo', color: 'amber' } : { txt: 'Suficiente o alto', color: 'emerald' },
  },
  {
    key: 'k', label: 'Potasio (K)', icon: Wheat, unidad: 'cmol/kg', ejemplo: '0.3',
    ayuda: 'Da vigor, resistencia y calidad al fruto. Se pierde fácil en tierras arenosas.',
    // GROUNDED-PENDIENTE: nivel crítico de K por cultivo.
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
    { key: 'mejorar', icon: Leaf, titulo: 'Mejorar el suelo', desc: 'Materia orgánica, coberturas, abonos verdes y micorrizas para una tierra viva.', accent: 'lime' },
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
  const [fuente, setFuente] = useState(/** @type {keyof typeof FUENTES_CAL} */ ('cal_dolomita'));
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
            {Object.entries(FUENTES_CAL).map(([key, info]) => {
              const activo = fuente === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFuente(/** @type {keyof typeof FUENTES_CAL} */ (key))}
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
