/* i18n (ADR-050): etiquetas user-facing en español Colombia pendientes de
 * migrar a src/config/messages.js. Misma deuda preexistente que PoscosechaScreen
 * y App.jsx; se desactiva la regla soft a nivel de archivo. */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import { useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Info, AlertTriangle, CheckCircle2, ShieldAlert,
  Warehouse, Package, FlaskConical, Bug, Sun, Snowflake, ShieldCheck, Sprout,
  Skull, Wheat, Container,
} from 'lucide-react';
import {
  PERDIDA_ALMACENAMIENTO,
  calcularPerdidaAlmacenamiento,
  DENSIDAD_LLENADO,
  calcularCapacidad,
  anchoTrojaRecomendado,
  ESTRUCTURAS,
  METODOS_TRADICIONALES,
  GUARD_BOTULISMO,
  clasificarAcidezConserva,
  CONSERVACION,
  PLAGAS_ALMACEN,
  CONTROL_PLAGAS,
  MICOTOXINAS,
  LIMITES_MICOTOXINA,
  SENALES_DESCARTE,
  MICOTOXINA_NOTA,
  VIDA_UTIL,
  GANCHO_ALMACENAMIENTO,
} from '../services/almacenamientoCalculator';

/**
 * AlmacenamientoScreen — mini-app "Almacenamiento y Conservación de Alimentos"
 * (mundo Mercado y despensa).
 *
 * EXTIENDE / absorbe la mini-app de Poscosecha: la poscosecha resuelve cosechar
 * en punto, secar el grano y transformar; este módulo profundiza en GUARDAR y
 * CONSERVAR con seguridad. Cuatro pilares:
 *   1. Almacenar   — troja / silo hermético / ferrocemento y métodos campesinos,
 *      con la CALCULADORA de pérdida evitada (el gancho) y la de capacidad.
 *   2. Conservar   — secado / salado / ahumado / fermentación, con el GUARD DE
 *      SEGURIDAD DE BOTULISMO (pH 4,6 / olla a presión), autoridad institucional.
 *   3. Plagas de almacén — Sitophilus / Prostephanus / gorgojos, con control
 *      físico sin veneno en escalera de costo.
 *   4. Micotoxinas — aflatoxinas / fumonisinas, límites y señales de descarte.
 *
 * Identidad: cuaderno de campo / Ciclo Vivo. Cálida, campesina, legible al sol.
 * CERO invención: las cifras salen de almacenamientoCalculator.js (grounded al
 * DR TRIPLE); lo que el DR marca "sin respaldo suficiente" se muestra como
 * grounded-pendiente honesto. La matemática (proporción, geometría) es exacta.
 */

/* ── Ilustración SVG propia: silo hermético que protege el grano ── */
function SiloIlustracion() {
  return (
    <svg
      viewBox="0 0 240 150"
      role="img"
      aria-label="Ilustración de un silo hermético que guarda el grano seco a salvo de la plaga"
      className="w-full h-auto"
    >
      <rect x="0" y="0" width="240" height="150" rx="6" fill="rgb(var(--t-accent-rgb) / 0.08)" />
      {/* Sol */}
      <circle cx="206" cy="26" r="11" fill="#f4b83c" className="al-sun" />
      <g stroke="#f4b83c" strokeWidth="2" strokeLinecap="round" className="al-sun">
        <path d="M206 8 V2" /><path d="M226 26 H232" /><path d="M220 12 L224 8" />
      </g>
      {/* Piso */}
      <rect x="14" y="120" width="212" height="7" rx="3" fill="#7a5a3c" />
      {/* Base de piedra */}
      <rect x="70" y="112" width="86" height="10" rx="2" fill="#8a7a66" />
      {/* Cuerpo del silo metálico */}
      <rect x="76" y="44" width="74" height="70" rx="4" fill="#b7bec6" />
      <rect x="76" y="44" width="74" height="70" rx="4" fill="none" stroke="#7d8590" strokeWidth="2" />
      {/* Costillas del silo */}
      <g stroke="#9aa2ac" strokeWidth="1.4" opacity="0.8">
        <path d="M76 62 H150" /><path d="M76 80 H150" /><path d="M76 98 H150" />
      </g>
      {/* Tapa cónica obturada */}
      <path d="M70 44 L113 22 L156 44 Z" fill="#9aa2ac" stroke="#7d8590" strokeWidth="2" />
      {/* Grano seco adentro (asomando) */}
      <g fill="#d8ad4e">
        <ellipse cx="96" cy="104" rx="4" ry="3" /><ellipse cx="108" cy="106" rx="4" ry="3" />
        <ellipse cx="120" cy="104" rx="4" ry="3" /><ellipse cx="132" cy="106" rx="4" ry="3" />
      </g>
      {/* Escudo de protección (sin veneno) */}
      <g transform="translate(34 60)">
        <path d="M0 0 L18 -6 L36 0 L36 18 Q36 34 18 42 Q0 34 0 18 Z" fill="rgb(var(--t-accent-rgb) / 0.9)" />
        <path d="M11 18 l5 6 l10 -13" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

const COLOR_MAP = {
  emerald: { text: 'text-emerald-300', border: 'border-emerald-700/50', bg: 'bg-emerald-950/30', dot: 'bg-emerald-400' },
  lime: { text: 'text-lime-300', border: 'border-lime-700/50', bg: 'bg-lime-950/30', dot: 'bg-lime-400' },
  amber: { text: 'text-amber-300', border: 'border-amber-700/50', bg: 'bg-amber-950/30', dot: 'bg-amber-400' },
  sky: { text: 'text-sky-300', border: 'border-sky-700/50', bg: 'bg-sky-950/30', dot: 'bg-sky-400' },
  rose: { text: 'text-rose-300', border: 'border-rose-700/50', bg: 'bg-rose-950/30', dot: 'bg-rose-400' },
  slate: { text: 'text-slate-300', border: 'border-slate-700/50', bg: 'bg-slate-900/50', dot: 'bg-slate-500' },
};

const cleanNum = (raw) => raw.replace(',', '.').replace(/[^0-9.]/g, '');

/* ═══════════════════════════════ Componente ═══════════════════════════════ */
/**
 * @param {Object} props
 * @param {() => void} props.onBack
 * @param {(view: string, data?: any) => void} [props.onNavigate]
 */
export default function AlmacenamientoScreen({ onBack, onNavigate }) {
  const [pilar, setPilar] = useState('hub'); // hub | almacenar | conservar | plagas | micotoxinas

  const volver = () => {
    if (pilar === 'hub') { onBack?.(); return; }
    setPilar('hub');
  };

  const subtitulo = pilar === 'hub' ? 'Guarde sin que se dañe y conserve con seguridad.'
    : pilar === 'almacenar' ? 'Almacenar: troja, silo y métodos campesinos'
    : pilar === 'conservar' ? 'Conservar: secar, salar, fermentar y enlatar'
    : pilar === 'plagas' ? 'Plagas de almacén: sin veneno'
    : 'Micotoxinas: el veneno invisible';

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
          <h1 className="text-lg font-bold leading-tight text-white">Almacenamiento y Conservación</h1>
          <p className="text-xs text-slate-400 leading-tight">{subtitulo}</p>
        </div>
      </header>

      <div className="px-4 pb-10">
        {pilar === 'hub' && <Hub onIr={setPilar} onNavigate={onNavigate} />}
        {pilar === 'almacenar' && <PilarAlmacenar />}
        {pilar === 'conservar' && <PilarConservar onNavigate={onNavigate} />}
        {pilar === 'plagas' && <PilarPlagas />}
        {pilar === 'micotoxinas' && <PilarMicotoxinas onNavigate={onNavigate} />}
      </div>
    </div>
  );
}

/* ─────────────────────────────────── Hub ─────────────────────────────────── */
function Hub({ onIr, onNavigate }) {
  const pilares = [
    { key: 'almacenar', icon: Warehouse, titulo: 'Almacenar', desc: 'Troja, silo hermético y métodos campesinos. Con la calculadora de lo que salva y de cuánto le cabe.', accent: 'amber' },
    { key: 'conservar', icon: FlaskConical, titulo: 'Conservar', desc: 'Secar, salar, ahumar, fermentar y enlatar — con el umbral de seguridad del botulismo.', accent: 'rose' },
    { key: 'plagas', icon: Bug, titulo: 'Plagas de almacén', desc: 'El gorgojo y sus parientes, y cómo tumbarlos sin veneno, de lo barato a lo caro.', accent: 'lime' },
    { key: 'micotoxinas', icon: ShieldAlert, titulo: 'Micotoxinas', desc: 'Aflatoxina y fumonisina: el veneno invisible del grano guardado húmedo, y cuándo descartar.', accent: 'sky' },
  ];
  return (
    <div className="flex flex-col gap-4">
      {/* Gancho — la cifra contundente del silo */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="p-4 pb-3">
          <SiloIlustracion />
        </div>
        <div className="px-4 pb-4">
          <p className="text-[13px] uppercase tracking-wide font-bold text-slate-400">El gancho</p>
          <p className="mt-1 text-[15px] text-slate-100 leading-snug">
            Guardar el grano <span className="font-bold">hermético</span> baja la pérdida de{' '}
            <span className="font-bold text-rose-300">{GANCHO_ALMACENAMIENTO.perdidaTradicional} %</span> a{' '}
            <span className="font-bold text-emerald-300">{GANCHO_ALMACENAMIENTO.perdidaHermetico} %</span>.
          </p>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Son <span className="font-semibold text-slate-100">{GANCHO_ALMACENAMIENTO.puntosMenos} puntos menos de pérdida</span>, sin un solo gramo de veneno:
            en el silo cerrado se acaba el aire y la plaga se muere. A nivel mundial las plagas de almacén se llevan{' '}
            <span className="font-semibold text-slate-100">{GANCHO_ALMACENAMIENTO.perdidaMundialPlagas}</span> de la producción.
          </p>
          <p className="mt-2 text-[11px] text-slate-500">Fuente: {GANCHO_ALMACENAMIENTO.fuente} · confianza {GANCHO_ALMACENAMIENTO.confianza}.</p>
        </div>
      </section>

      {/* Cuatro pilares */}
      <div className="flex flex-col gap-3">
        {pilares.map((p) => {
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
                <span className="block text-[15px] font-bold text-white leading-tight">{p.titulo}</span>
                <span className="block text-sm text-slate-300 mt-0.5 leading-snug">{p.desc}</span>
              </span>
              <ChevronRight size={20} className="text-slate-500 shrink-0 mt-2" />
            </button>
          );
        })}
      </div>

      {/* Puentes honestos: absorbe/extiende la poscosecha y enlaza a lo existente */}
      {onNavigate ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
          <p className="text-xs uppercase tracking-wide font-bold text-slate-400 mb-2">También en Chagra</p>
          <div className="flex flex-col gap-2">
            <PuenteBoton
              icon={Wheat}
              titulo="Poscosecha y despensa"
              sub="Antes de guardar: cosechar en punto, secar el grano a humedad segura y transformar."
              onClick={() => onNavigate('poscosecha')}
            />
            <PuenteBoton
              icon={Package}
              titulo="Bodega de insumos"
              sub="Lo que tiene guardado y lo que se le está acabando."
              onClick={() => onNavigate('bodega')}
            />
            <PuenteBoton
              icon={Sprout}
              titulo="Pregúntele al agente"
              sub="Cómo guardar o conservar su cosecha sin que se dañe."
              onClick={() => onNavigate('agente', { prompt: '¿Cómo almaceno y conservo mi cosecha para que no se dañe?' })}
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

/* ─────────────────── Pilar 1 — Almacenar ─────────────────── */
function PilarAlmacenar() {
  return (
    <div className="flex flex-col gap-5">
      {/* Calculadora insignia — pérdida evitada (el gancho) */}
      <CalculadoraPerdida />

      {/* Calculadora de capacidad */}
      <CalculadoraCapacidad />

      {/* Estructuras */}
      <section>
        <h2 className="text-sm uppercase tracking-wide font-bold text-slate-400 mb-2 flex items-center gap-2">
          <Warehouse size={15} /> Estructuras: de la troja al silo
        </h2>
        <div className="flex flex-col gap-3">
          {ESTRUCTURAS.map((e) => (
            <article key={e.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <h3 className="text-[15px] font-bold text-slate-100">{e.titulo}</h3>
              <p className="text-sm text-slate-300 mt-1 leading-snug">{e.resumen}</p>
              <div className="mt-2 rounded-lg bg-slate-800/40 border border-slate-700/50 p-2.5">
                <p className="text-sm text-slate-200 leading-snug"><span className="font-bold">Parámetro:</span> {e.parametro}</p>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-snug">{e.ejemplo}</p>
              <p className="mt-1.5 text-[11px] text-slate-500">Fuente: {e.fuente} · confianza {e.confianza}.</p>
            </article>
          ))}
        </div>
      </section>

      {/* Métodos tradicionales de bajo costo */}
      <section>
        <h2 className="text-sm uppercase tracking-wide font-bold text-slate-400 mb-2 flex items-center gap-2">
          <ShieldCheck size={15} /> Sin plata para silo: métodos del campo
        </h2>
        <div className="flex flex-col gap-3">
          {METODOS_TRADICIONALES.map((m) => (
            <article key={m.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <h3 className="text-sm font-bold text-slate-100">{m.titulo}</h3>
              <p className="text-sm text-slate-300 mt-1 leading-snug"><span className="font-semibold text-slate-100">Cómo:</span> {m.como}</p>
              <p className="text-sm text-slate-300 mt-1 leading-snug"><span className="font-semibold text-slate-100">Por qué:</span> {m.porque}</p>
              {m.dosis ? <p className="text-sm text-slate-200 mt-1"><span className="font-semibold">Dosis:</span> {m.dosis}</p> : null}
              {m.pendiente ? <PendienteNota texto={m.pendiente} /> : null}
              <p className="mt-1.5 text-[11px] text-slate-500">Fuente: {m.fuente} · confianza {m.confianza}.</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function CalculadoraPerdida() {
  const [cantidad, setCantidad] = useState('');
  const res = useMemo(() => calcularPerdidaAlmacenamiento(cantidad), [cantidad]);

  return (
    <section className="rounded-2xl border border-amber-800/40 bg-amber-950/20 p-4">
      <div className="flex items-center gap-2">
        <Warehouse size={20} className="text-amber-300 shrink-0" />
        <h3 className="text-[15px] font-bold text-amber-200">¿Cuánto grano salva guardando hermético?</h3>
      </div>
      <p className="text-sm text-amber-100/90 mt-2 leading-relaxed">
        Escriba cuánto grano seco va a guardar. Le decimos cuánto pierde en bodega abierta y cuánto en silo hermético —
        la diferencia es lo que se salva sin veneno.
      </p>

      <label htmlFor="al-cant" className="mt-3 block text-xs uppercase tracking-wide font-bold text-amber-200/80">
        Cantidad de grano seco
      </label>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          id="al-cant"
          type="text"
          inputMode="decimal"
          value={cantidad}
          onChange={(e) => setCantidad(cleanNum(e.target.value))}
          placeholder="ej. 500"
          aria-label="Cantidad de grano seco a guardar"
          className="flex-1 min-w-0 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-500"
        />
        <span className="text-xs text-slate-400 shrink-0">kg / arrobas / bultos</span>
      </div>

      {res ? (
        <div className="mt-3 rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-300 shrink-0" />
            <p className="text-sm font-bold text-emerald-200">Guardando hermético usted salva</p>
          </div>
          <p className="text-4xl font-black text-white mt-2 leading-none">
            {res.granoSalvado}
            <span className="text-lg font-bold text-slate-300"> de grano</span>
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-rose-800/40 bg-rose-950/20 p-2.5">
              <p className="text-[11px] uppercase tracking-wide font-bold text-rose-300/80">Bodega abierta</p>
              <p className="text-sm text-rose-100 mt-0.5">pierde <span className="font-bold">{res.perdidaTradicional}</span> ({PERDIDA_ALMACENAMIENTO.tradicional.perdidaPorc} %)</p>
            </div>
            <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-2.5">
              <p className="text-[11px] uppercase tracking-wide font-bold text-emerald-300/80">Silo hermético</p>
              <p className="text-sm text-emerald-100 mt-0.5">pierde <span className="font-bold">{res.perdidaHermetico}</span> ({PERDIDA_ALMACENAMIENTO.hermetico.perdidaPorc} %)</p>
            </div>
          </div>
          <p className="text-xs text-emerald-200/90 mt-2.5 leading-snug">
            Requisito: grano seco a <span className="font-bold">≤ {PERDIDA_ALMACENAMIENTO.humedadMaxima} % de humedad</span>. Si entra húmedo, el hongo lo daña.
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-amber-100/70 text-center py-2">
          Escriba la cantidad de grano para ver cuánto salva.
        </p>
      )}

      <details className="mt-3 rounded-lg border border-amber-800/30 bg-amber-950/10 p-2.5">
        <summary className="text-xs font-bold text-amber-200/90 cursor-pointer">Cómo se calcula</summary>
        <p className="mt-1.5 text-xs text-amber-100/70 leading-relaxed">
          Proporción exacta: perdido = cantidad × tasa ÷ 100. Las tasas (16,58 % tradicional vs 3,94 % hermético)
          vienen de un ensayo controlado (SciELO México, Guanajuato), confianza alta. La cantidad sale en la misma
          unidad que usted escriba.
        </p>
      </details>
    </section>
  );
}

function CalculadoraCapacidad() {
  const [forma, setForma] = useState('silo'); // silo | troja
  const [grano, setGrano] = useState('maiz');
  const [alto, setAlto] = useState('');
  const [diametro, setDiametro] = useState('');
  const [largo, setLargo] = useState('');
  const [ancho, setAncho] = useState('');
  const [hr, setHr] = useState('');

  const res = useMemo(
    () => calcularCapacidad({ forma, grano, alto, diametro, largo, ancho }),
    [forma, grano, alto, diametro, largo, ancho],
  );
  const anchoReco = useMemo(() => anchoTrojaRecomendado(hr), [hr]);

  return (
    <section className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4">
      <div className="flex items-center gap-2">
        <Container size={20} className="shrink-0" style={{ color: 'rgb(var(--t-accent-rgb))' }} />
        <h3 className="text-[15px] font-bold text-slate-100">¿Cuánto le cabe?</h3>
      </div>
      <p className="text-sm text-slate-300 mt-2 leading-relaxed">
        Con las medidas de su troja o silo le calculamos cuántos kilos caben.
      </p>

      {/* Selector de forma */}
      <div className="mt-3 flex gap-2">
        {[{ k: 'silo', l: 'Silo (cilíndrico)' }, { k: 'troja', l: 'Troja (rectangular)' }].map((f) => {
          const activo = forma === f.k;
          return (
            <button
              key={f.k}
              type="button"
              onClick={() => setForma(f.k)}
              aria-pressed={activo}
              className={`min-h-[40px] flex-1 px-3 rounded-full border text-sm font-semibold transition-colors motion-reduce:transition-none ${
                activo ? 'border-transparent text-white' : 'bg-slate-800 border-slate-700 text-slate-200 hover:border-slate-500'
              }`}
              style={activo ? { backgroundColor: 'rgb(var(--t-accent-rgb) / 0.25)', boxShadow: 'inset 0 0 0 2px rgb(var(--t-accent-rgb))' } : undefined}
            >
              {f.l}
            </button>
          );
        })}
      </div>

      {forma === 'silo' ? (
        <>
          <p className="mt-3 text-xs uppercase tracking-wide font-bold text-slate-400 mb-1.5">¿Qué grano suelto?</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(DENSIDAD_LLENADO).map(([key, g]) => {
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
          <div className="grid grid-cols-2 gap-3 mt-3">
            <NumField id="al-diam" label="Diámetro (m)" value={diametro} onChange={setDiametro} placeholder="ej. 1" />
            <NumField id="al-alto-s" label="Altura (m)" value={alto} onChange={setAlto} placeholder="ej. 1.5" />
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <NumField id="al-largo" label="Largo (m)" value={largo} onChange={setLargo} placeholder="4" />
            <NumField id="al-anchoT" label="Ancho (m)" value={ancho} onChange={setAncho} placeholder="0.6" />
            <NumField id="al-alto-t" label="Alto (m)" value={alto} onChange={setAlto} placeholder="1.8" />
          </div>
          {/* Ancho recomendado según clima */}
          <div className="mt-3 rounded-lg border border-sky-800/40 bg-sky-950/20 p-2.5">
            <label htmlFor="al-hr" className="block text-xs uppercase tracking-wide font-bold text-sky-200/80 mb-1">
              Humedad del clima (%) — para el ancho seguro
            </label>
            <input
              id="al-hr"
              type="text"
              inputMode="decimal"
              value={hr}
              onChange={(e) => setHr(cleanNum(e.target.value))}
              placeholder="ej. 82"
              aria-label="Humedad relativa del clima en porcentaje"
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-500"
            />
            {anchoReco ? (
              <p className="mt-2 text-sm text-sky-100 leading-snug">
                Clima {anchoReco.clima}: hágala de <span className="font-bold">máximo {anchoReco.anchoCm} cm de ancho</span> para que ventile y la mazorca no se enmohezca.
              </p>
            ) : (
              <p className="mt-2 text-xs text-sky-200/70">Entre más húmedo el clima, más angosta la troja.</p>
            )}
          </div>
        </>
      )}

      {res ? (
        <div className="mt-3 rounded-xl border border-slate-700/60 bg-slate-800/40 p-3">
          <p className="text-sm text-slate-300">Le caben aproximadamente</p>
          <p className="text-3xl font-black text-white mt-1 leading-none">
            {res.capacidadKg.toLocaleString('es-CO')} <span className="text-base font-bold text-slate-300">kg</span>
          </p>
          <p className="text-xs text-slate-400 mt-1.5">
            Volumen {res.volumenM3} m³ × {res.densidad} kg/m³ ({forma === 'troja' ? 'mazorca' : 'grano suelto'}).
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-400 text-center py-2">Escriba las medidas para calcular.</p>
      )}
      <p className="mt-2 text-[11px] text-slate-500">Densidades: FAO x5050s · confianza alta. La geometría es exacta.</p>
    </section>
  );
}

function NumField({ id, label, value, onChange, placeholder }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs uppercase tracking-wide font-bold text-slate-400 mb-1">{label}</label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(cleanNum(e.target.value))}
        placeholder={placeholder}
        aria-label={label}
        className="w-full rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-500"
      />
    </div>
  );
}

function PendienteNota({ texto }) {
  return (
    <div className="mt-2 rounded-lg border border-amber-800/40 bg-amber-950/20 p-2.5 flex items-start gap-2">
      <Info size={15} className="text-amber-400 shrink-0 mt-0.5" />
      <p className="text-xs text-amber-100/90 leading-snug"><span className="font-bold">Dato en camino:</span> {texto}</p>
    </div>
  );
}

/* ─────────────────── Pilar 2 — Conservar (guard de botulismo) ─────────────────── */
function PilarConservar({ onNavigate }) {
  return (
    <div className="flex flex-col gap-5">
      {/* GUARD DE SEGURIDAD DE BOTULISMO — lo más importante del módulo */}
      <GuardBotulismo />

      {/* Métodos de conservación */}
      <section>
        <h2 className="text-sm uppercase tracking-wide font-bold text-slate-400 mb-2 flex items-center gap-2">
          <FlaskConical size={15} /> Formas de conservar
        </h2>
        <div className="flex flex-col gap-3">
          {CONSERVACION.map((m) => (
            <article key={m.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <h3 className="text-[15px] font-bold text-slate-100">{m.titulo}</h3>
              <p className="text-sm text-slate-300 mt-1 leading-snug">{m.resumen}</p>
              <div className="mt-2 rounded-lg bg-slate-800/40 border border-slate-700/50 p-2.5">
                <p className="text-sm text-slate-200 leading-snug"><span className="font-bold">Parámetro:</span> {m.parametro}</p>
              </div>
              {m.pendiente ? <PendienteNota texto={m.pendiente} /> : null}
              <p className="mt-1.5 text-[11px] text-slate-500">Fuente: {m.fuente} · confianza {m.confianza}.</p>
            </article>
          ))}
        </div>
      </section>

      {/* Puente a poscosecha: mermeladas, panela, queso, café ya viven allá */}
      {onNavigate ? (
        <PuenteBoton
          icon={Wheat}
          titulo="Mermeladas, panela, queso y café"
          sub="La transformación con su punto crítico vive en Poscosecha y despensa."
          onClick={() => onNavigate('poscosecha')}
        />
      ) : null}
    </div>
  );
}

function GuardBotulismo() {
  const [ph, setPh] = useState('');
  const res = useMemo(() => clasificarAcidezConserva(ph), [ph]);

  return (
    <section className="rounded-2xl border border-rose-700/60 bg-rose-950/25 p-4">
      <div className="flex items-center gap-2">
        <Skull size={20} className="text-rose-300 shrink-0" />
        <h3 className="text-[15px] font-bold text-rose-200">Enlatado casero: cuidado con el botulismo</h3>
      </div>
      <p className="text-sm text-rose-100/95 mt-2 leading-relaxed">
        El punto de seguridad más duro de todo el módulo. <span className="font-bold">El pH {GUARD_BOTULISMO.phLinea} es la línea de vida:</span> por
        debajo, la bacteria del botulismo no crece; por encima, sí. Esto <span className="font-semibold">no es opinión de nadie</span> — lo dicen el CDC, la USDA y el INVIMA.
      </p>

      {/* Clasificador por pH */}
      <label htmlFor="al-ph" className="mt-3 block text-xs uppercase tracking-wide font-bold text-rose-200/80">
        pH de su preparación (si lo tiene medido)
      </label>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          id="al-ph"
          type="text"
          inputMode="decimal"
          value={ph}
          onChange={(e) => setPh(cleanNum(e.target.value))}
          placeholder="ej. 4.2"
          aria-label="pH de la conserva"
          className="flex-1 min-w-0 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-slate-500"
        />
        <span className="text-xs text-slate-400 shrink-0">pH 0–14</span>
      </div>
      {res ? (
        <div className={`mt-3 rounded-xl border p-3 flex items-start gap-2.5 ${res.critico ? 'border-rose-600/70 bg-rose-950/50' : 'border-emerald-700/50 bg-emerald-950/30'}`}>
          {res.critico
            ? <AlertTriangle size={20} className="text-rose-400 shrink-0 mt-0.5" />
            : <CheckCircle2 size={20} className="text-emerald-300 shrink-0 mt-0.5" />}
          <p className={`text-sm leading-snug ${res.critico ? 'text-rose-100 font-semibold' : 'text-emerald-100'}`}>{res.mensaje}</p>
        </div>
      ) : null}

      {/* Las dos rutas, siempre visibles */}
      <div className="mt-4 grid grid-cols-1 gap-3">
        <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-3">
          <p className="text-sm font-bold text-emerald-200">{GUARD_BOTULISMO.acido.label}</p>
          <p className="text-xs text-emerald-100/80 mt-0.5">{GUARD_BOTULISMO.acido.ejemplos}</p>
          <p className="text-sm text-emerald-100 mt-1.5"><span className="font-bold">{GUARD_BOTULISMO.acido.metodo}.</span> {GUARD_BOTULISMO.acido.detalle}</p>
        </div>
        <div className="rounded-xl border border-rose-700/60 bg-rose-950/40 p-3">
          <p className="text-sm font-bold text-rose-200">{GUARD_BOTULISMO.pocoAcido.label}</p>
          <p className="text-xs text-rose-100/80 mt-0.5">{GUARD_BOTULISMO.pocoAcido.ejemplos}</p>
          <p className="text-sm text-rose-100 mt-1.5"><span className="font-bold">{GUARD_BOTULISMO.pocoAcido.metodo}.</span> {GUARD_BOTULISMO.pocoAcido.detalle}</p>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-rose-700/50 bg-rose-950/40 p-2.5 flex items-start gap-2">
        <ShieldAlert size={16} className="text-rose-300 shrink-0 mt-0.5" />
        <p className="text-sm text-rose-100 font-semibold leading-snug">{GUARD_BOTULISMO.reglaOro}</p>
      </div>
      <p className="mt-2 text-[11px] text-rose-200/70">Autoridad: {GUARD_BOTULISMO.autoridad} · confianza {GUARD_BOTULISMO.confianza}.</p>
    </section>
  );
}

/* ─────────────────── Pilar 3 — Plagas de almacén ─────────────────── */
function PilarPlagas() {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-slate-300 leading-relaxed">
        El ciclo de estas plagas es de <span className="font-semibold text-slate-100">23–40 días</span> en clima cálido: una infestación explota rápido.
        Las <span className="font-semibold text-slate-100">primarias</span> perforan el grano sano (lo peor); las <span className="font-semibold text-slate-100">secundarias</span> aprovechan el grano ya roto o la harina.
      </p>

      {/* Especies */}
      <section>
        <h2 className="text-sm uppercase tracking-wide font-bold text-slate-400 mb-2 flex items-center gap-2">
          <Bug size={15} /> Quién es quién
        </h2>
        <div className="flex flex-col gap-3">
          {PLAGAS_ALMACEN.map((p) => (
            <article key={p.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-100">{p.comun}</h3>
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${p.tipo === 'primaria' ? 'bg-rose-950/50 text-rose-300 border border-rose-800/50' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
                  {p.tipo}
                </span>
              </div>
              <p className="text-xs italic text-slate-400 mt-0.5">{p.especie}</p>
              <p className="text-sm text-slate-300 mt-1.5 leading-snug"><span className="font-semibold text-slate-100">Ataca:</span> {p.producto}</p>
              <p className="text-sm text-slate-300 mt-1 leading-snug">{p.danio}</p>
              <p className="mt-1.5 text-[11px] text-slate-500">Fuente: {p.fuente}.</p>
            </article>
          ))}
        </div>
      </section>

      {/* Control sin veneno, escalera de costo */}
      <section>
        <h2 className="text-sm uppercase tracking-wide font-bold text-slate-400 mb-2 flex items-center gap-2">
          <ShieldCheck size={15} /> Control sin veneno (primero lo barato)
        </h2>
        <div className="flex flex-col gap-3">
          {CONTROL_PLAGAS.map((c) => {
            const Icon = c.id === 'calor_solar' ? Sun : c.id === 'frio' ? Snowflake : c.id === 'hermeticidad' ? Warehouse : ShieldCheck;
            return (
              <article key={c.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Icon size={16} className="shrink-0" style={{ color: 'rgb(var(--t-accent-rgb))' }} />
                  <h3 className="text-sm font-bold text-slate-100">{c.titulo}</h3>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">{c.costo}</span>
                </div>
                <p className="text-sm text-slate-300 mt-1 leading-snug"><span className="font-semibold text-slate-100">Cómo:</span> {c.como}</p>
                <p className="text-sm text-slate-300 mt-1 leading-snug"><span className="font-semibold text-slate-100">Por qué:</span> {c.porque}</p>
                <p className="mt-1.5 text-[11px] text-slate-500">Confianza {c.confianza}.</p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* ─────────────────── Pilar 4 — Micotoxinas ─────────────────── */
function PilarMicotoxinas({ onNavigate }) {
  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border border-sky-800/40 bg-sky-950/20 p-4">
        <div className="flex items-center gap-2">
          <ShieldAlert size={18} className="text-sky-300 shrink-0" />
          <h3 className="text-[15px] font-bold text-sky-200">El veneno invisible del grano húmedo</h3>
        </div>
        <p className="text-sm text-sky-100/90 mt-2 leading-relaxed">
          El grano guardado húmedo cría hongos que producen toxinas peligrosas. La defensa #1 es <span className="font-semibold">secar a menos de 13 % y guardar seco</span>.
        </p>
      </section>

      {/* Hongos y toxinas */}
      <div className="flex flex-col gap-3">
        {MICOTOXINAS.map((m) => (
          <article key={m.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-[15px] font-bold text-slate-100">{m.titulo}</h3>
            <p className="text-xs italic text-slate-400 mt-0.5">{m.hongo}</p>
            <p className="text-sm text-slate-300 mt-1.5 leading-snug"><span className="font-semibold text-slate-100">Dónde:</span> {m.donde}</p>
            <p className="text-sm text-slate-300 mt-1 leading-snug"><span className="font-semibold text-slate-100">Defensa:</span> {m.defensa}</p>
            <p className="mt-1.5 text-[11px] text-slate-500">Fuente: {m.fuente} · confianza {m.confianza}.</p>
          </article>
        ))}
      </div>

      {/* Límites legales */}
      <section>
        <h2 className="text-sm uppercase tracking-wide font-bold text-slate-400 mb-2">Límites legales</h2>
        <div className="flex flex-col gap-3">
          {LIMITES_MICOTOXINA.map((l) => (
            <article key={l.id} className={`rounded-xl border p-3 ${l.pendiente ? 'border-amber-800/40 bg-amber-950/10' : 'border-slate-800 bg-slate-900/60'}`}>
              <h3 className="text-sm font-bold text-slate-100">{l.ambito}</h3>
              <p className="text-sm text-slate-300 mt-1 leading-snug">{l.detalle}</p>
              {l.pendiente ? (
                <PendienteNota texto="Estas cifras colombianas vienen de fuente secundaria. Falta leer el texto primario de la Resolución 4506/2013 antes de usarlas como norma dura." />
              ) : null}
              <p className="mt-1.5 text-[11px] text-slate-500">Fuente: {l.fuente} · confianza {l.confianza}.</p>
            </article>
          ))}
        </div>
      </section>

      {/* Señales de descarte */}
      <section className="rounded-2xl border border-rose-800/40 bg-rose-950/20 p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-rose-300 shrink-0" />
          <h3 className="text-[15px] font-bold text-rose-200">Si ve esto: no lo coma ni lo venda</h3>
        </div>
        <ul className="mt-3 flex flex-col gap-2">
          {SENALES_DESCARTE.map((s) => (
            <li key={s} className="flex items-start gap-2 text-sm text-rose-100/90">
              <span className="text-rose-400 shrink-0 mt-0.5" aria-hidden="true">•</span>
              <span className="leading-snug">{s}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 rounded-lg border border-rose-800/40 bg-rose-950/30 p-2.5 flex items-start gap-2">
          <Info size={15} className="text-rose-300 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-100/90 leading-snug">{MICOTOXINA_NOTA}</p>
        </div>
      </section>

      {onNavigate ? (
        <PuenteBoton
          icon={Sprout}
          titulo="Pregúntele al agente"
          sub="Si tiene dudas de un lote de maíz o maní, consúltelo antes de consumirlo o venderlo."
          onClick={() => onNavigate('agente', { prompt: '¿Cómo sé si mi maíz o maní guardado tiene aflatoxina?' })}
        />
      ) : null}

      {/* Vida útil de referencia */}
      <section>
        <h2 className="text-sm uppercase tracking-wide font-bold text-slate-400 mb-2">Vida útil de referencia</h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-800">
                <th className="p-2.5 font-bold">Producto</th>
                <th className="p-2.5 font-bold">Método</th>
                <th className="p-2.5 font-bold">Dura</th>
              </tr>
            </thead>
            <tbody>
              {VIDA_UTIL.map((v, i) => (
                <tr key={`${v.producto}-${i}`} className="border-b border-slate-800/60 last:border-0">
                  <td className="p-2.5 text-slate-200">{v.producto}</td>
                  <td className="p-2.5 text-slate-400">{v.metodo}</td>
                  <td className="p-2.5 text-slate-100 font-semibold whitespace-nowrap">{v.vida}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          <Info size={12} className="inline mr-1 -mt-0.5" />
          Es "producto × método × condición", no un número único. Fuente: DR TRIPLE §5 · confianza media.
        </p>
      </section>
    </div>
  );
}
