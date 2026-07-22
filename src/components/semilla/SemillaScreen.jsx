/* i18n (ADR-050): etiquetas user-facing en español Colombia pendientes de
 * migrar a src/config/messages.js. Misma deuda preexistente que SaludSueloScreen
 * y App.jsx; se desactiva la regla soft a nivel de archivo. */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import { useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, ArrowRight, Sprout, Snowflake,
  Archive, FlaskConical, Bug, Calculator, CheckCircle2, AlertTriangle,
  Info, Percent, Users, ShieldCheck,
} from 'lucide-react';
import {
  CULTIVOS_SEMILLA, SISTEMAS_REPRODUCTIVOS, evaluarSeleccion, ROGUING_PCT,
  clasificarConservacion, RECALCITRANTES, factorVidaHarrington,
  reglaSumaHarrington, aceiteAntigorgojo, porcentajeGerminacion,
  interpretarGerminacion, ajusteDensidad, UMBRAL_GERMINACION,
} from '../../services/semillaCalculator';

/**
 * SemillaScreen — mini-app "Semilla" (soberanía de semilla), mundo Cultivos.
 *
 * Identidad: cuaderno de campo. Cálida, campesina, legible al sol. 4 temas vía
 * variables de tema (rgb(var(--t-accent-rgb))), micro-animaciones que respetan
 * prefers-reduced-motion. Solo visual + calculadoras DETERMINISTAS.
 *
 * Tres pilares (grounding DR-SEMILLA 2026-07-04):
 *   1. SELECCIONAR — de plantas sanas/típicas, roguing antes de floración;
 *      calculadora de nº mínimo de plantas madre por sistema reproductivo.
 *   2. GUARDAR — la rama decisiva ORTODOXA vs RECALCITRANTE (nunca "seca y
 *      guarda" a cacao/café/aguacate) + reglas de Harrington + anti-gorgojo.
 *   3. GERMINAR — prueba casera (rag-doll) + calculadora de ajuste de densidad
 *      de siembra por % de viabilidad.
 *
 * CERO invención: el copy es estructura; las cifras finas salen del grounding
 * verificado y de las calculadoras deterministas de semillaCalculator.js. Lo que
 * depende de zona/cultivo y no está anclado se marca grounded-pendiente.
 */

const COLOR_MAP = {
  emerald: { text: 'text-emerald-300', border: 'border-emerald-700/50', bg: 'bg-emerald-950/30', dot: 'bg-emerald-400' },
  lime: { text: 'text-lime-300', border: 'border-lime-700/50', bg: 'bg-lime-950/30', dot: 'bg-lime-400' },
  amber: { text: 'text-amber-300', border: 'border-amber-700/50', bg: 'bg-amber-950/30', dot: 'bg-amber-400' },
  rose: { text: 'text-rose-300', border: 'border-rose-700/50', bg: 'bg-rose-950/30', dot: 'bg-rose-400' },
  slate: { text: 'text-slate-300', border: 'border-slate-700/50', bg: 'bg-slate-900/50', dot: 'bg-slate-500' },
};

/* ── Ilustración SVG propia: "de la semilla a la mata" sobre papel de cuaderno ── */
function SemillaIlustracion() {
  return (
    <svg
      viewBox="0 0 240 150"
      role="img"
      aria-label="Ilustración de una semilla germinando: raíz, brote y hojas, con semillas guardadas"
      className="w-full h-auto"
    >
      {/* Papel de cuaderno */}
      <rect x="0" y="0" width="240" height="150" rx="8" fill="rgb(var(--t-accent-rgb) / 0.06)" />
      <g stroke="rgb(var(--t-accent-rgb) / 0.18)" strokeWidth="1">
        <line x1="0" y1="46" x2="240" y2="46" />
        <line x1="0" y1="78" x2="240" y2="78" />
        <line x1="0" y1="110" x2="240" y2="110" />
      </g>
      {/* Tierra */}
      <path d="M0 110 H240 V150 H0 Z" fill="#5a4327" />
      <path d="M0 110 H240 V120 Q120 114 0 120 Z" fill="#6b4f2e" />
      {/* Sol */}
      <circle cx="212" cy="26" r="10" fill="#f4c14b" className="sm-sun" />
      {/* Semilla que germina en el centro: raíz baja, brote sube */}
      <g className="sm-sprout">
        {/* Raíz principal + laterales */}
        <g stroke="#d9b98a" strokeWidth="2.2" strokeLinecap="round" fill="none">
          <path d="M96 116 V138" />
          <path d="M96 124 Q84 128 78 138" />
          <path d="M96 128 Q108 132 114 140" />
        </g>
        {/* Tallo */}
        <path d="M96 116 V70" stroke="#3f7d3f" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        {/* Cotiledones / hojas */}
        <path d="M96 84 Q78 76 70 86 Q82 92 96 88 Z" fill="#4e9a4e" />
        <path d="M96 78 Q114 68 124 78 Q112 86 96 82 Z" fill="#3f7d3f" />
        {/* Cascarilla de la semilla en la base */}
        <ellipse cx="96" cy="114" rx="7" ry="4.5" fill="#c9a06a" transform="rotate(-18 96 114)" />
      </g>
      {/* Semillas guardadas (frasco a la izquierda) */}
      <g className="sm-seeds">
        <ellipse cx="34" cy="96" rx="4.5" ry="3" fill="#caa26a" />
        <ellipse cx="46" cy="100" rx="4.5" ry="3" fill="#b98a4f" />
        <ellipse cx="30" cy="103" rx="4.5" ry="3" fill="#d8b57e" />
        <ellipse cx="42" cy="90" rx="4" ry="2.6" fill="#c9a06a" />
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
export default function SemillaScreen({ onBack, onNavigate }) {
  const [pilar, setPilar] = useState('hub'); // hub | seleccionar | guardar | germinar

  const volver = () => {
    if (pilar === 'hub') { onBack?.(); return; }
    setPilar('hub');
  };

  const subtitulo =
    pilar === 'hub' ? 'Su semilla, su autonomía. De la selección al guardado.'
    : pilar === 'seleccionar' ? 'Seleccionar la semilla'
    : pilar === 'guardar' ? 'Guardar la semilla'
    : 'Probar la germinación';

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
          <h1 className="text-lg font-bold leading-tight text-white">Semilla</h1>
          <p className="text-xs text-slate-400 leading-tight">{subtitulo}</p>
        </div>
      </header>

      <div className="px-4 pb-10">
        {pilar === 'hub' && <Hub onIr={setPilar} onNavigate={onNavigate} />}
        {pilar === 'seleccionar' && <PilarSeleccionar />}
        {pilar === 'guardar' && <PilarGuardar />}
        {pilar === 'germinar' && <PilarGerminar onNavigate={onNavigate} />}
      </div>
    </div>
  );
}

/* ─────────────────────────────────── Hub ─────────────────────────────────── */
function Hub({ onIr, onNavigate }) {
  const pilares = [
    { key: 'seleccionar', icon: Sprout, titulo: 'Seleccionar', desc: 'De cuáles plantas sacar semilla y cuántas plantas madre necesita.', accent: 'emerald' },
    { key: 'guardar', icon: Archive, titulo: 'Guardar', desc: '¿Se seca y se guarda, o se siembra fresca? Cómo darle el doble de vida.', accent: 'amber' },
    { key: 'germinar', icon: Percent, titulo: 'Probar germinación', desc: 'La prueba casera y cuánta semilla poner según cuántas nacen.', accent: 'lime' },
  ];
  return (
    <div className="flex flex-col gap-4">
      {/* Marco: soberanía de semilla */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="p-4 pb-3">
          <SemillaIlustracion />
        </div>
        <div className="px-4 pb-4">
          <p className="text-[13px] uppercase tracking-wide font-bold text-slate-400">Soberanía de semilla</p>
          <p className="mt-1 text-[15px] text-slate-100 leading-snug">
            <span className="font-bold">"Quien guarda su semilla, guarda su autonomía."</span>
          </p>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Guardar semilla criolla es un derecho campesino y el corazón del fitomejoramiento propio.
            Aquí lo hacemos bien: <span className="font-semibold text-slate-100">seleccionar</span> de las
            mejores plantas, <span className="font-semibold text-slate-100">guardar</span> según la especie
            y <span className="font-semibold text-slate-100">probar</span> que la semilla nazca.
          </p>
        </div>
      </section>

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
                <span className="text-[11px] font-bold text-slate-500">Paso {i + 1}</span>
                <span className="block text-[15px] font-bold text-white leading-tight">{p.titulo}</span>
                <span className="block text-sm text-slate-300 mt-0.5 leading-snug">{p.desc}</span>
              </span>
              <ChevronRight size={20} className="text-slate-500 shrink-0 mt-2" />
            </button>
          );
        })}
      </div>

      {/* Nota de soberanía / derecho a guardar (grounding legal DR) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
        <div className="flex items-start gap-2.5">
          <ShieldCheck size={18} className="shrink-0 mt-0.5" style={{ color: 'rgb(var(--t-accent-rgb))' }} />
          <p className="text-xs text-slate-400 leading-relaxed">
            Guardar, usar e intercambiar semilla propia es un derecho reconocido (Tratado de Semillas de la
            FAO, art. 9; Sentencia T-247 de 2023 sobre maíz nativo). La norma del ICA (Res. 15141 de 2024)
            regula solo la semilla <em>certificada de mejoramiento</em>, no la criolla ni el grano de consumo.
            {onNavigate ? ' Pregúntele al agente por su caso.' : ''}
          </p>
        </div>
        {onNavigate ? (
          <button
            type="button"
            onClick={() => onNavigate('agente', { prompt: '¿Puedo guardar e intercambiar mi propia semilla criolla?' })}
            className="mt-2.5 w-full text-left rounded-xl border border-slate-700/60 bg-slate-800/40 p-3 flex items-center gap-3 hover:border-slate-600 transition-colors motion-reduce:transition-none"
          >
            <Users size={18} className="shrink-0" style={{ color: 'rgb(var(--t-accent-rgb))' }} />
            <span className="flex-1 text-sm font-bold text-slate-100 leading-tight">Custodios, casas de semilla y su derecho</span>
            <ChevronRight size={18} className="text-slate-500 shrink-0" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ───────────────────── Pilar 1 — Seleccionar la semilla ───────────────────── */
const REGLAS_SELECCION = [
  { icon: Sprout, titulo: 'Plantas sanas, vigorosas y típicas', texto: 'Escoja las que se ven sanas, fuertes y con las características propias de la variedad. Buena producción, sin plagas ni enfermedades.' },
  { icon: CheckCircle2, titulo: 'Marque en pie, antes de cosechar', texto: 'A la madurez fisiológica se ve la sanidad de toda la planta. Marque las escogidas con cinta, cabuya o pintura de color.' },
  { icon: ArrowRight, titulo: 'Del centro del lote, no de los bordes', texto: 'En el centro la planta compite de verdad y hay menos cruce con el cultivo del vecino.' },
  { icon: AlertTriangle, titulo: 'Depure las atípicas ANTES de la floración', texto: 'Saque las plantas "fuera de tipo", débiles o enfermas antes de que suelten polen: así no pasan sus genes. Se llama roguing.' },
];

function PilarSeleccionar() {
  const [cultivoId, setCultivoId] = useState('maiz');
  const [plantas, setPlantas] = useState('');

  const disp = plantas === '' ? null : Math.max(0, Number.parseInt(plantas, 10) || 0);
  const cultivo = CULTIVOS_SEMILLA.find((c) => c.id === cultivoId);
  const resultado = useMemo(
    () => (disp == null ? null : evaluarSeleccion(cultivoId, disp)),
    [cultivoId, disp],
  );
  const nivelColor = resultado
    ? (resultado.nivel === 'ok' ? COLOR_MAP.emerald : resultado.nivel === 'justo' ? COLOR_MAP.amber : COLOR_MAP.rose)
    : COLOR_MAP.slate;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-300 leading-relaxed">
        La selección es el corazón de la semilla propia: de qué plantas sacarla decide si la variedad
        se conserva —o mejora— año tras año.
      </p>

      {/* Reglas de oro */}
      <div className="flex flex-col gap-3">
        {REGLAS_SELECCION.map((r) => {
          const Icono = r.icon;
          return (
            <div key={r.titulo} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgb(var(--t-accent-rgb) / 0.18)' }}>
                <Icono size={20} style={{ color: 'rgb(var(--t-accent-rgb))' }} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-100">{r.titulo}</h3>
                <p className="text-sm text-slate-300 mt-0.5 leading-snug">{r.texto}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Calculadora: nº mínimo de plantas madre */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Calculator size={18} style={{ color: 'rgb(var(--t-accent-rgb))' }} />
          <h3 className="text-[15px] font-bold text-white">¿Cuántas plantas madre necesita?</h3>
        </div>
        <p className="text-sm text-slate-300 leading-snug">
          Con pocas plantas la variedad pierde vigor por endogamia. El mínimo depende de si el cultivo
          se cruza (necesita muchas) o se autopoliniza (le bastan pocas).
        </p>

        {/* Selección de cultivo */}
        <div className="flex flex-wrap gap-2">
          {CULTIVOS_SEMILLA.map((c) => {
            const activo = c.id === cultivoId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCultivoId(c.id)}
                aria-pressed={activo}
                className={`min-h-[40px] px-3 rounded-full border text-sm font-semibold transition-colors ${activo ? 'border-transparent text-white' : 'bg-slate-800 border-slate-700 text-slate-200 hover:border-slate-500'}`}
                style={activo ? { backgroundColor: 'rgb(var(--t-accent-rgb) / 0.25)', boxShadow: 'inset 0 0 0 2px rgb(var(--t-accent-rgb))' } : undefined}
              >
                {c.nombre}
              </button>
            );
          })}
        </div>

        {/* Sistema del cultivo elegido */}
        {cultivo ? (
          <p className="text-xs text-slate-400">
            <span className="font-semibold text-slate-300">{SISTEMAS_REPRODUCTIVOS[cultivo.sistema].label}.</span>{' '}
            {SISTEMAS_REPRODUCTIVOS[cultivo.sistema].resumen}
            {cultivo.nota ? ` (${cultivo.nota})` : ''}
          </p>
        ) : null}

        {/* Entrada de plantas disponibles */}
        <div>
          <label className="block text-xs uppercase tracking-wide font-bold text-slate-400 mb-1">¿Cuántas plantas buenas tiene en el lote?</label>
          <input
            type="text"
            inputMode="numeric"
            value={plantas}
            onChange={(e) => setPlantas(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="ej. 120"
            aria-label="Plantas buenas disponibles en el lote"
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-500"
          />
        </div>

        {/* Resultado */}
        {resultado ? (
          <div className={`rounded-xl border ${nivelColor.border} ${nivelColor.bg} p-3`}>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${nivelColor.dot}`} aria-hidden="true" />
              <p className={`text-sm font-bold ${nivelColor.text}`}>
                {resultado.nivel === 'ok' ? 'Alcanza de sobra' : resultado.nivel === 'justo' ? 'Alcanza, pero justo' : 'No alcanza'}
              </p>
            </div>
            <p className="mt-2 text-sm text-slate-200 leading-relaxed">
              Para <span className="font-semibold">{resultado.cultivo.nombre}</span> guarde semilla de al menos{' '}
              <span className="font-black text-white">{resultado.min}</span> plantas
              {resultado.optimo > resultado.min ? <> (lo óptimo son <span className="font-bold text-white">{resultado.optimo}</span>)</> : null}.
            </p>
            <p className="mt-1.5 text-sm text-slate-300 leading-relaxed">
              Antes de la floración, depure de <span className="font-semibold text-slate-100">{resultado.roguing.min} a {resultado.roguing.max}</span> plantas
              atípicas ({ROGUING_PCT.min}–{ROGUING_PCT.max} %). Le quedarían{' '}
              <span className="font-bold text-white">{resultado.disponiblesTrasRoguing}</span> para semilla.
            </p>
            {!resultado.suficiente ? (
              <p className="mt-1.5 text-sm text-rose-200 leading-relaxed">
                Le faltan <span className="font-bold">{resultado.faltan}</span> plantas. Siembre más el próximo ciclo,
                o guarde semilla de varios años e intercambie con otros custodios para no perder diversidad.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-2">Escriba cuántas plantas tiene para ver si alcanzan.</p>
        )}
      </section>

      <p className="text-xs text-slate-500 leading-relaxed">
        <Info size={13} className="inline mr-1 -mt-0.5" />
        Cifras de Grupo Semillas, SwissAid y AGROSAVIA. Los mínimos por cultivo y la distancia de
        aislamiento fina para no cruzar variedades cambian por región y viento (dato pendiente de anclar por zona).
      </p>
    </div>
  );
}

/* Campo numérico reutilizable (a nivel de módulo: identidad estable, sin
 * remontar el input ni perder el foco al escribir). */
function CampoNum({ label, value, set, sufijo }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wide font-bold text-slate-400 mb-1">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="text" inputMode="decimal" value={value}
          onChange={(e) => set(e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))}
          aria-label={label}
          className="w-full min-w-0 rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-2 text-sm text-white focus:outline-none focus:border-slate-500"
        />
        <span className="text-xs text-slate-400 shrink-0">{sufijo}</span>
      </div>
    </div>
  );
}

/* ─────────────────────── Pilar 2 — Guardar la semilla ─────────────────────── */
function PilarGuardar() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-300 leading-relaxed">
        Antes de guardar, la pregunta que lo decide todo: <span className="font-semibold text-slate-100">¿esta semilla
        se puede secar y guardar, o hay que sembrarla fresca?</span> Equivocarse aquí mata la semilla.
      </p>

      <RamaConservacion />
      <HarringtonCalc />
      <AntigorgojoCalc />

      <p className="text-xs text-slate-500 leading-relaxed">
        <Info size={13} className="inline mr-1 -mt-0.5" />
        Guías de FAO (humedad, reglas de Harrington, control de gorgojo), Red de Semillas Libres y AGROSAVIA.
        El comportamiento exacto de cada especie tropical se marca grounded-pendiente por especie.
      </p>
    </div>
  );
}

/* Rama decisiva: ortodoxa vs recalcitrante */
function RamaConservacion() {
  const [nombre, setNombre] = useState('');
  const clas = useMemo(() => (nombre.trim() ? clasificarConservacion(nombre) : null), [nombre]);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <FlaskConical size={18} style={{ color: 'rgb(var(--t-accent-rgb))' }} />
        <h3 className="text-[15px] font-bold text-white">¿Se seca o se siembra fresca?</h3>
      </div>

      <input
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Escriba la semilla: fríjol, cacao, tomate…"
        aria-label="Nombre de la semilla a clasificar"
        className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-500"
      />

      {/* Atajo con las recalcitrantes conocidas */}
      <div className="flex flex-wrap gap-1.5">
        {RECALCITRANTES.slice(0, 6).map((r) => (
          <button
            key={r.nombre}
            type="button"
            onClick={() => setNombre(r.nombre)}
            className="min-h-[34px] px-2.5 rounded-full border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200 hover:border-slate-500 transition-colors"
          >
            {r.nombre}
          </button>
        ))}
      </div>

      {clas ? (
        clas.tipo === 'recalcitrante' ? (
          <div className="rounded-xl border border-rose-700/60 bg-rose-950/30 p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-rose-300 shrink-0" />
              <p className="text-sm font-bold text-rose-200">Recalcitrante — NO la seque</p>
            </div>
            <p className="mt-2 text-sm text-rose-100/90 leading-relaxed">
              {clas.nombre} muere si se seca como el fríjol. Vive solo días o semanas: <span className="font-semibold">siémbrela
              fresca</span>, apenas la saque del fruto, o manténgala como planta viva. No la guarde en frasco ni en la nevera.
              {clas.nota ? <span className="block mt-1 text-rose-200/70 text-xs">Ojo: {clas.nota}.</span> : null}
            </p>
          </div>
        ) : clas.tipo === 'ortodoxa' ? (
          <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-300 shrink-0" />
              <p className="text-sm font-bold text-emerald-200">Ortodoxa — se seca y se guarda</p>
            </div>
            <p className="mt-2 text-sm text-emerald-100/90 leading-relaxed">
              {clas.nombre} tolera secarse. Séquela <span className="font-semibold">a la sombra</span> (nunca al sol
              directo ni sobre cemento), de ~15 % a ~5 % de humedad, en 2–3 semanas. Guárdela bien seca (4–8 % de humedad)
              en frasco de vidrio, vasija de barro o envase hermético, en sitio fresco y oscuro.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-3">
            <p className="text-sm text-slate-200 leading-relaxed">
              No tengo esta semilla clasificada. Regla honesta: granos, legumbres y la mayoría de hortalizas son
              <span className="font-semibold text-slate-100"> ortodoxas</span> (se secan). Muchos árboles y frutales
              tropicales (cacao, café, aguacate, guanábana) son <span className="font-semibold text-slate-100">recalcitrantes</span>
              {' '}(se siembran frescos). Ante la duda, siembre una parte fresca y guarde otra seca para comparar, o pregunte al agente.
            </p>
          </div>
        )
      ) : (
        <p className="text-sm text-slate-400 text-center py-1">Escriba una semilla para saber cómo tratarla.</p>
      )}
    </section>
  );
}

/* Calculadora de Harrington: el doble de vida */
function HarringtonCalc() {
  const [hDesde, setHDesde] = useState('12');
  const [hHasta, setHHasta] = useState('8');
  const [tDesde, setTDesde] = useState('25');
  const [tHasta, setTHasta] = useState('10');

  const num = (s) => Number.parseFloat(String(s).replace(',', '.'));
  const listo = [hDesde, hHasta, tDesde, tHasta].every((s) => s !== '' && Number.isFinite(num(s)));
  const r = useMemo(
    () => (listo ? factorVidaHarrington({ humedadDesde: num(hDesde), humedadHasta: num(hHasta), tempDesde: num(tDesde), tempHasta: num(tHasta) }) : null),
    [hDesde, hHasta, tDesde, tHasta, listo],
  );
  const suma = useMemo(
    () => (tHasta !== '' && hHasta !== '' && Number.isFinite(num(tHasta)) ? reglaSumaHarrington(num(tHasta), num(hHasta)) : null),
    [tHasta, hHasta],
  );

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Snowflake size={18} style={{ color: 'rgb(var(--t-accent-rgb))' }} />
        <h3 className="text-[15px] font-bold text-white">El doble de vida: más seca y más fría</h3>
      </div>
      <p className="text-sm text-slate-300 leading-snug">
        Regla de Harrington: la semilla vive el <span className="font-semibold text-slate-100">doble</span> por cada
        1 % menos de humedad, y otro tanto por cada 5 °C menos. Compare cómo la guarda hoy con cómo podría guardarla.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-2.5 flex flex-col gap-2">
          <p className="text-xs font-bold text-slate-400">Como la guarda hoy</p>
          <CampoNum label="Humedad (hoy)" value={hDesde} set={setHDesde} sufijo="%" />
          <CampoNum label="Temperatura (hoy)" value={tDesde} set={setTDesde} sufijo="°C" />
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-2.5 flex flex-col gap-2">
          <p className="text-xs font-bold text-slate-400">Cómo podría guardarla</p>
          <CampoNum label="Humedad (mejor)" value={hHasta} set={setHHasta} sufijo="%" />
          <CampoNum label="Temperatura (mejor)" value={tHasta} set={setTHasta} sufijo="°C" />
        </div>
      </div>

      {r ? (
        <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-3">
          <p className="text-xs uppercase tracking-wide font-bold text-slate-400">Le rinde</p>
          <p className="text-3xl font-black text-white mt-0.5 leading-none">
            × {r.factor}
            <span className="text-sm font-bold text-slate-300"> más tiempo</span>
          </p>
          <p className="text-xs text-emerald-200/80 mt-1">
            × {r.factorHumedad} por secarla + × {r.factorTemp} por enfriarla (se multiplican).
          </p>
          {suma ? (
            <p className={`mt-2 text-xs ${suma.cumple ? 'text-emerald-200/80' : 'text-amber-200/90'}`}>
              Regla del 100: {suma.tempF} °F + humedad relativa = {suma.suma}.{' '}
              {suma.cumple ? 'Por debajo de 100: buen sitio.' : 'Pasa de 100: busque un sitio más seco o fresco.'}
            </p>
          ) : null}
          {r.avisos.map((a) => (
            <p key={a} className="mt-2 text-xs text-amber-200/90 leading-snug">
              <AlertTriangle size={12} className="inline mr-1 -mt-0.5" />{a}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400 text-center py-1">Complete las cuatro casillas para ver cuánto le rinde.</p>
      )}
    </section>
  );
}

/* Calculadora anti-gorgojo con aceite */
function AntigorgojoCalc() {
  const [kg, setKg] = useState('');
  const dosis = kg === '' ? null : aceiteAntigorgojo(Number.parseFloat(kg.replace(',', '.')) || 0);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Bug size={18} style={{ color: 'rgb(var(--t-accent-rgb))' }} />
        <h3 className="text-[15px] font-bold text-white">Que no le entre el gorgojo</h3>
      </div>
      <p className="text-sm text-slate-300 leading-snug">
        Sin químicos: un poquito de aceite vegetal cubre el grano y asfixia al gorgojo. También sirven
        ceniza o arena (1 parte por 4 de grano) y congelar la semilla 3–5 días para matar huevos.
      </p>
      <div>
        <label className="block text-xs uppercase tracking-wide font-bold text-slate-400 mb-1">¿Cuántos kilos de grano va a guardar?</label>
        <div className="flex items-center gap-1.5">
          <input
            type="text" inputMode="decimal" value={kg}
            onChange={(e) => setKg(e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))}
            placeholder="ej. 10"
            aria-label="Kilos de grano a guardar"
            className="w-full min-w-0 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-500"
          />
          <span className="text-xs text-slate-400 shrink-0">kg</span>
        </div>
      </div>
      {dosis ? (
        <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-3">
          <p className="text-sm text-emerald-100">
            Use entre <span className="font-black text-white">{dosis.min}</span> y{' '}
            <span className="font-black text-white">{dosis.max}</span> ml de aceite (2–7 ml por kg).
            Revuelva bien. Protege {dosis.meses} meses.
          </p>
        </div>
      ) : null}
    </section>
  );
}

/* ─────────────────────── Pilar 3 — Probar germinación ─────────────────────── */
function PilarGerminar({ onNavigate }) {
  const [germinadas, setGerminadas] = useState('');
  const [total, setTotal] = useState('100');

  const g = germinadas === '' ? null : Math.max(0, Number.parseInt(germinadas, 10) || 0);
  const t = total === '' ? null : Math.max(0, Number.parseInt(total, 10) || 0);
  const pct = g != null && t != null ? porcentajeGerminacion(g, t) : null;
  const interp = pct != null ? interpretarGerminacion(pct) : null;
  const c = interp ? COLOR_MAP[interp.color] : COLOR_MAP.slate;
  const densidad = pct != null && pct > 0 && pct < UMBRAL_GERMINACION.buena ? ajusteDensidad(pct) : null;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-300 leading-relaxed">
        Antes de sembrar todo un lote, pruebe si su semilla nace. Es la prueba casera de germinación
        (la "rag-doll"), la misma que enseñan AGROSAVIA y el SENA.
      </p>

      {/* Guía de la prueba */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="text-[15px] font-bold text-white mb-2">Cómo se hace</h3>
        <ol className="flex flex-col gap-2 text-sm text-slate-300">
          {[
            'Cuente 100 semillas al azar del lote (en 10 hileras de a 10).',
            'Póngalas sobre papel o periódico húmedo y enróllelo.',
            'Meta el rollo en una bolsa plástica, en sitio cálido y a la sombra.',
            'Revise que siga húmedo y cuente las que nacen entre 3 y 10 días.',
          ].map((paso, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[11px] font-black text-white" style={{ backgroundColor: 'rgb(var(--t-accent-rgb) / 0.30)' }}>{i + 1}</span>
              <span className="leading-snug">{paso}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Calculadora */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Percent size={18} style={{ color: 'rgb(var(--t-accent-rgb))' }} />
          <h3 className="text-[15px] font-bold text-white">Saque el porcentaje</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase tracking-wide font-bold text-slate-400 mb-1">Nacieron</label>
            <input
              type="text" inputMode="numeric" value={germinadas}
              onChange={(e) => setGerminadas(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="ej. 78"
              aria-label="Semillas que nacieron"
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide font-bold text-slate-400 mb-1">De un total de</label>
            <input
              type="text" inputMode="numeric" value={total}
              onChange={(e) => setTotal(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="100"
              aria-label="Total de semillas puestas a prueba"
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-500"
            />
          </div>
        </div>

        {pct != null && interp ? (
          <div className={`rounded-xl border ${c.border} ${c.bg} p-3`}>
            <p className="text-4xl font-black text-white leading-none">{pct}<span className="text-lg text-slate-300">%</span></p>
            <p className={`mt-1 text-sm font-bold ${c.text}`}>{interp.label}</p>
            <p className="mt-1 text-sm text-slate-200 leading-snug">{interp.accion}</p>
            {densidad ? (
              <div className="mt-2 pt-2 border-t border-slate-700/50 text-sm text-slate-200 leading-relaxed">
                Para compensar, siembre <span className="font-black text-white">× {densidad.factor}</span> la semilla de costumbre.
                <span className="block text-xs text-slate-400 mt-0.5">Valor cultural = pureza × germinación / 100 = {densidad.valorCultural} (pureza asumida 100 %).</span>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-1">Escriba cuántas nacieron para ver el resultado.</p>
        )}

        <p className="text-xs text-slate-500 leading-snug">
          Guía: ≥ {UMBRAL_GERMINACION.buena} % buena · {UMBRAL_GERMINACION.descartar}–{UMBRAL_GERMINACION.buena - 1} % siembre más tupido · &lt; {UMBRAL_GERMINACION.descartar} % descarte el lote.
        </p>
      </section>

      {/* Puente al módulo Semilleros existente (no lo reimplementa) */}
      {onNavigate ? (
        <button
          type="button"
          onClick={() => onNavigate('germinacion')}
          className="w-full text-left rounded-xl border border-slate-700/60 bg-slate-800/40 p-3 flex items-center gap-3 hover:border-slate-600 transition-colors motion-reduce:transition-none"
        >
          <Sprout size={20} className="shrink-0" style={{ color: 'rgb(var(--t-accent-rgb))' }} />
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-slate-100 leading-tight">Registrar la prueba en Semilleros</span>
            <span className="block text-xs text-slate-400 leading-snug">Guarde el resultado y compárelo con otras pruebas.</span>
          </span>
          <ChevronRight size={18} className="text-slate-500 shrink-0" />
        </button>
      ) : null}
    </div>
  );
}
