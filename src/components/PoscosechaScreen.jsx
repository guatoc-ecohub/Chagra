/* i18n (ADR-050): etiquetas user-facing en español Colombia pendientes de
 * migrar a src/config/messages.js. Misma deuda preexistente que SaludSueloScreen
 * y App.jsx; se desactiva la regla soft a nivel de archivo. */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import { useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, ArrowRight, Info, AlertTriangle, CheckCircle2,
  Scissors, Warehouse, FlaskConical, Sun, Snowflake, Droplets, Wind,
  Sprout, Wheat, ShieldCheck,
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
} from '../services/poscosechaCalculator';

/**
 * PoscosechaScreen — mini-app "Poscosecha y Despensa" (mundo Mercado y despensa).
 *
 * Identidad: cuaderno de campo / Ciclo Vivo. Cálida, campesina, legible al sol.
 *
 * Gancho: el país pierde ~1 de cada 3 productos entre la mata y la venta, y la
 * mayor parte se evita SIN plata. Tres pilares:
 *   1. Cosechar en punto — índices de madurez (aguacate Hass por materia seca).
 *   2. Guardar bien        — curado (2 recetas OPUESTAS), daño por frío, y la
 *      CALCULADORA de secado de grano a humedad segura (determinista).
 *   3. Transformar          — deshidratados, mermeladas, harinas, panela, queso,
 *      café — cada uno con su punto crítico de inocuidad.
 *
 * CERO invención: las cifras salen de poscosechaCalculator.js (grounded al DR
 * nacional/internacional); los slots no cerrados se marcan grounded-pendiente.
 * La matemática del secado es balance de masa exacto.
 */

/* ── Ilustración SVG propia: canasta con sol, gotas de agua que se van y grano ── */
function DespensaIlustracion() {
  return (
    <svg
      viewBox="0 0 240 150"
      role="img"
      aria-label="Ilustración de una canasta de cosecha bajo el sol, con la humedad saliendo del grano"
      className="w-full h-auto"
    >
      {/* Fondo cálido */}
      <rect x="0" y="0" width="240" height="150" rx="6" fill="rgb(var(--t-accent-rgb) / 0.08)" />
      {/* Sol que "respira" */}
      <circle cx="204" cy="26" r="12" fill="#f4b83c" className="pc-sun" />
      <g stroke="#f4b83c" strokeWidth="2" strokeLinecap="round" className="pc-sun">
        <path d="M204 6 V0" /><path d="M226 26 H232" /><path d="M219 11 L223 7" />
      </g>
      {/* Repisa / mesa */}
      <rect x="16" y="118" width="208" height="7" rx="3" fill="#7a5a3c" />
      {/* Canasta */}
      <path d="M54 92 H150 L140 120 H64 Z" fill="#b9822f" />
      <path d="M54 92 H150" stroke="#8a5f22" strokeWidth="3" />
      <g stroke="#8a5f22" strokeWidth="1.6" opacity="0.6">
        <path d="M74 92 L70 120" /><path d="M96 92 L94 120" /><path d="M118 92 L118 120" /><path d="M138 92 L142 120" />
      </g>
      {/* Frutos en la canasta */}
      <circle cx="78" cy="88" r="10" fill="#5a9e4a" />
      <circle cx="100" cy="86" r="11" fill="#d06a3a" />
      <circle cx="122" cy="88" r="10" fill="#e0b03a" />
      {/* Gotas de humedad que se van (secado) */}
      <g fill="rgb(70 130 180 / 0.85)" className="pc-drops">
        <path d="M40 70 q-4 6 0 9 q4 -3 0 -9 Z" />
        <path d="M168 62 q-4 6 0 9 q4 -3 0 -9 Z" />
        <path d="M150 78 q-3 5 0 7 q3 -2 0 -7 Z" />
      </g>
      {/* Granos secos guardados abajo */}
      <g fill="#c9a04a">
        <ellipse cx="182" cy="112" rx="4" ry="3" />
        <ellipse cx="192" cy="114" rx="4" ry="3" />
        <ellipse cx="187" cy="108" rx="4" ry="3" />
      </g>
    </svg>
  );
}

const COLOR_MAP = {
  emerald: { text: 'text-emerald-300', border: 'border-emerald-700/50', bg: 'bg-emerald-950/30', dot: 'bg-emerald-400' },
  lime: { text: 'text-lime-300', border: 'border-lime-700/50', bg: 'bg-lime-950/30', dot: 'bg-lime-400' },
  amber: { text: 'text-amber-300', border: 'border-amber-700/50', bg: 'bg-amber-950/30', dot: 'bg-amber-400' },
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
  const [pilar, setPilar] = useState('hub'); // hub | cosecha | guardar | transformar

  const volver = () => {
    if (pilar === 'hub') { onBack?.(); return; }
    setPilar('hub');
  };

  const subtitulo = pilar === 'hub' ? 'Cosechar en punto, guardar bien y transformar.'
    : pilar === 'cosecha' ? 'Cosechar en el punto'
    : pilar === 'guardar' ? 'Guardar sin que se dañe'
    : 'Transformar el excedente';

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
          <h1 className="text-lg font-bold leading-tight text-white">Poscosecha y Despensa</h1>
          <p className="text-xs text-slate-400 leading-tight">{subtitulo}</p>
        </div>
      </header>

      <div className="px-4 pb-10">
        {pilar === 'hub' && <Hub onIr={setPilar} onNavigate={onNavigate} />}
        {pilar === 'cosecha' && <PilarCosecha />}
        {pilar === 'guardar' && <PilarGuardar onNavigate={onNavigate} />}
        {pilar === 'transformar' && <PilarTransformar onNavigate={onNavigate} />}
      </div>
    </div>
  );
}

/* ─────────────────────────────────── Hub ─────────────────────────────────── */
function Hub({ onIr, onNavigate }) {
  const pilares = [
    { key: 'cosecha', icon: Scissors, titulo: 'Cosechar en punto', desc: 'Cada cultivo tiene su seña. El aguacate se cosecha por materia seca, no en la mata.', accent: 'emerald' },
    { key: 'guardar', icon: Warehouse, titulo: 'Guardar bien', desc: 'Curado, frío casero y la calculadora de secado de grano a humedad segura.', accent: 'amber' },
    { key: 'transformar', icon: FlaskConical, titulo: 'Transformar', desc: 'Deshidratados, mermeladas, harinas, panela, queso y café — con su punto crítico.', accent: 'lime' },
  ];
  return (
    <div className="flex flex-col gap-4">
      {/* Gancho — la magnitud del problema */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="p-4 pb-3">
          <DespensaIlustracion />
        </div>
        <div className="px-4 pb-4">
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
                <span className="text-[11px] font-bold text-slate-500">Paso {i + 1}</span>
                <span className="block text-[15px] font-bold text-white leading-tight">{p.titulo}</span>
                <span className="block text-sm text-slate-300 mt-0.5 leading-snug">{p.desc}</span>
              </span>
              <ChevronRight size={20} className="text-slate-500 shrink-0 mt-2" />
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

      {/* Aguacate Hass — índice por materia seca (calculadora insignia) */}
      <section className="rounded-2xl border border-emerald-800/40 bg-emerald-950/20 p-4">
        <div className="flex items-center gap-2">
          <Sprout size={20} className="text-emerald-300 shrink-0" />
          <h3 className="text-[15px] font-bold text-emerald-200">Aguacate Hass: por materia seca</h3>
        </div>
        <p className="text-sm text-emerald-100/90 mt-2 leading-relaxed">
          El aguacate <span className="font-semibold">no madura en la planta</span>: se cosecha fisiológicamente maduro
          y ablanda después. La seña no es el color, es el <span className="font-semibold">contenido de materia seca</span>.
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
        <p className="mt-2 text-[11px] text-slate-500">Fuente: AGROSAVIA; norma de exportación · confianza alta.</p>
      </section>

      {/* Otros cultivos — reglas cualitativas honestas */}
      <div className="flex flex-col gap-3">
        <RegistroCosecha
          titulo="Uchuva"
          texto="El punto se lee por el color del capacho (cáliz) y del fruto. La variedad andina llega a ~14,5 °Brix, buenos para consumo y guardado."
          fuente="AGROSAVIA · confianza media-alta"
        />
        <RegistroCosecha
          titulo="Climatéricos (banano, plátano, mango, tomate, papaya)"
          texto="Se cosechan fisiológicamente maduros pero FIRMES y maduran después. Para consumo local puede esperar más color; para transporte largo, coséchelos más verdes."
          fuente="FAO · confianza alta"
        />
      </div>

      <p className="text-xs text-slate-500 leading-relaxed">
        <Info size={13} className="inline mr-1 -mt-0.5" />
        Los índices por cultivo (color exacto, Brix, días desde floración) están pendientes de anclar a la ficha
        primaria de cada especie (dato en camino). Para su cultivo, consulte al agente o a su técnico.
      </p>
    </div>
  );
}

function RegistroCosecha({ titulo, texto, fuente }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
        <Wheat size={16} style={{ color: 'rgb(var(--t-accent-rgb))' }} />
        {titulo}
      </h3>
      <p className="text-sm text-slate-300 mt-1 leading-snug">{texto}</p>
      <p className="mt-1.5 text-[11px] text-slate-500">Fuente: {fuente}.</p>
    </div>
  );
}

/* ─────────────────── Pilar 2 — Guardar bien ─────────────────── */
function PilarGuardar({ onNavigate }) {
  return (
    <div className="flex flex-col gap-5">
      {/* 2a. Calculadora de secado de grano (determinista) */}
      <CalculadoraSecado />

      {/* 2b. Curado — dos recetas OPUESTAS */}
      <section>
        <h2 className="text-sm uppercase tracking-wide font-bold text-slate-400 mb-2 flex items-center gap-2">
          <Droplets size={15} /> Curado: dos recetas opuestas
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed mb-3">
          Curar es dejar que la cosecha <span className="font-semibold text-slate-100">cicatrice las heridas</span> antes de
          guardarla. Pero la receta es <span className="font-semibold text-slate-100">opuesta</span> según el producto: no las confunda.
        </p>
        <div className="grid grid-cols-1 gap-3">
          <CuradoCard data={CURADO.raices} icon={Droplets} accent="emerald" />
          <CuradoCard data={CURADO.bulbos} icon={Wind} accent="amber" />
        </div>
      </section>

      {/* 2c. Daño por frío */}
      <section className="rounded-2xl border border-sky-800/40 bg-sky-950/20 p-4">
        <div className="flex items-center gap-2">
          <Snowflake size={18} className="text-sky-300 shrink-0" />
          <h3 className="text-[15px] font-bold text-sky-200">Ojo con el frío en los tropicales</h3>
        </div>
        <p className="text-sm text-sky-100/90 mt-2 leading-relaxed">
          Muchos productos tropicales se dañan por frío por debajo de 10–13 °C: se manchan y no maduran.
          <span className="font-semibold"> No los meta a la nevera.</span>
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {DANIO_POR_FRIO.map((d) => (
            <li key={d.producto} className="flex items-start gap-2 text-sm text-sky-100/90">
              <span className="text-sky-400 shrink-0 mt-0.5" aria-hidden="true">•</span>
              <span className="leading-snug"><span className="font-semibold">{d.producto}:</span> {d.nota}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 2d. Grano hermético — sin química */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <ShieldCheck size={16} style={{ color: 'rgb(var(--t-accent-rgb))' }} />
          El silo hermético mata el gorgojo sin veneno
        </h3>
        <p className="text-sm text-slate-300 mt-1 leading-snug">
          Grano seco (12–13 %) en recipiente limpio y BIEN tapado: el aire se acaba y las plagas mueren sin químico.
          En bodega abierta se pierde más del 5 % al año; con silo hermético, casi nada.
        </p>
        <p className="mt-1.5 text-[11px] text-slate-500">Fuente: FAO / SciELO · confianza media-alta.</p>
      </section>

      {/* 2e. Puente al módulo profundo de almacenamiento (extiende esta sección) */}
      {onNavigate ? (
        <PuenteBoton
          icon={Warehouse}
          titulo="Almacenamiento y conservación a fondo"
          sub="Troja y silo con calculadoras, plagas de almacén, micotoxinas y el guard de botulismo."
          onClick={() => onNavigate('almacenamiento')}
        />
      ) : null}
    </div>
  );
}

function CuradoCard({ data, icon, accent }) {
  const Icon = icon;
  const c = COLOR_MAP[accent];
  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-4`}>
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
    <section className="rounded-2xl border border-amber-800/40 bg-amber-950/20 p-4">
      <div className="flex items-center gap-2">
        <Sun size={20} className="text-amber-300 shrink-0" />
        <h3 className="text-[15px] font-bold text-amber-200">Calculadora de secado de grano</h3>
      </div>
      <p className="text-sm text-amber-100/90 mt-2 leading-relaxed">
        Grano que se guarda húmedo se pierde por moho. Le decimos cuánta agua debe sacar para llegar a la humedad segura
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
    </section>
  );
}

/* ─────────────────── Pilar 3 — Transformar ─────────────────── */
function PilarTransformar({ onNavigate }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-300 leading-relaxed">
        El excedente que se iba a perder puede volverse producto vendible que dura meses. Cada línea tiene
        <span className="font-semibold text-slate-100"> un punto crítico de inocuidad</span> — casi siempre calor, limpieza y empaque sellado.
      </p>

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
            <p className="mt-1.5 text-[11px] text-slate-500">Fuente: {t.fuente} · confianza {t.confianza}.</p>
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
        <p className="mt-2 text-[11px] text-slate-500">Fuente: INVIMA / MinSalud · confianza alta.</p>
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
