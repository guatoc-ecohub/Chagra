import React, { useMemo, useState } from 'react';
import {
  CloudRain, Droplets, Sprout, Calculator, TriangleAlert, Sun,
  ShieldCheck, Users, Hourglass, Milk, ChevronRight,
  Skull, PiggyBank, Biohazard, FlaskConical, Fuel, Beef, Trash2,
  Baby, Activity, ShieldAlert, Ruler, Landmark, HeartPulse,
  Flame, Filter, Camera, ExternalLink, HelpCircle,
} from 'lucide-react';
import { ScreenShell } from '../common/ScreenShell';
import PedagogicalBlock from '../common/PedagogicalBlock';
import CaminoDelAgua from './CaminoDelAgua';
import DistanciasFinca from './DistanciasFinca';
import {
  litrosLluviaCaptables,
  canecasEquivalentes,
  porcentajeTanque,
  etcDiaria,
  litrosRiegoDia,
  COEF_ESCORRENTIA_TECHO_DEFAULT,
  LITROS_POR_CANECA_55GAL,
} from '../../services/aguaCalculos';
import {
  PILARES_AGUA,
  PASOS_COSECHA,
  ETO_POR_PISO_TERMICO,
  KC_CULTIVOS,
  SISTEMAS_RIEGO,
  PRACTICAS_AHORRO,
  USOS_DEL_AGUA,
  SENALES_ALERTA_AGUA,
  RONDA_PROTECCION,
  CASO_NACIMIENTO,
  RIESGOS_CONTAMINACION,
  ENFERMEDADES_AGUA,
  DISTANCIAS_SEGURIDAD,
  IRCA_RURAL,
  METODOS_POTABILIZACION,
  FOTO_BASE_AGUA,
  CREDITOS_FOTOS_AGUA,
} from '../../data/aguaFinca';
import { getEnsoPhase, getEnsoLabel } from '../../services/ensoService';
import './agua.css';

/**
 * AguaScreen — módulo "Agua de la finca": manejo del agua para el campesino.
 *
 * Tres pilares (cuaderno de campo, un solo camino visual):
 *   1. Cosechar la lluvia — calculadora determinista techo × lluvia → litros.
 *   2. Regar con medida  — ETc = ETo × Kc (fórmula FAO); Kc/ETo reales son
 *      slots grounded-pendiente (src/data/aguaFinca.js), NO se inventan.
 *   3. Cuidar el agua    — calidad/potabilidad + proteger el nacimiento, con
 *      el caso insignia "se me seca el nacimiento en verano". Se conecta con
 *      el ciclo ENSO que Chagra ya sigue (ensoService) — no se re-implementa.
 *
 * Toda cifra dura pendiente de grounding se pinta como "dato en camino"
 * (SlotPendiente), nunca como número inventado.
 */

const fmt = (n) => Number(n).toLocaleString('es-CO');

/** Chip honesto para cifras aún sin grounding: promete el dato, no lo inventa. */
function SlotPendiente({ children = null }) {
  return (
    <span
      data-testid="slot-grounded-pendiente"
      className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-300"
    >
      <Hourglass size={11} aria-hidden="true" />
      {children || 'Dato en camino'}
    </span>
  );
}

/** Campo numérico grande, legible al sol, con etiqueta arriba y unidad al lado. */
function CampoNumero({ id, label, unidad, value, onChange, placeholder, hint = '' }) {
  return (
    <label htmlFor={id} className="block">
      <span className="block text-xs font-bold uppercase tracking-wide text-slate-300 mb-1">{label}</span>
      <span className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 focus-within:border-cyan-500">
        <input
          id={id}
          data-testid={id}
          type="number"
          inputMode="decimal"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-lg font-black text-white outline-none placeholder:text-slate-600"
        />
        <span className="shrink-0 text-sm font-bold text-slate-400">{unidad}</span>
      </span>
      {hint && <span className="block mt-1 text-[11px] leading-snug text-slate-400">{hint}</span>}
    </label>
  );
}

/* ── Fotos reales (licencia abierta) — patrón "photo-forward" ─────────────
 * Igual que el módulo Suelo: foto real de Wikimedia Commons + crédito visible +
 * fallback a ícono si no carga. El scrim oscuro es FIJO (no lo vira el remapeo
 * de temas claros) para que el texto encima quede legible al sol. */
const creditoDe = (slug) => CREDITOS_FOTOS_AGUA.find((c) => c.slug === slug)?.autor || '';

/**
 * FotoAgua — imagen a sangre con scrim inferior fijo, crédito de autor en la
 * esquina y fallback a un ícono. `children` va SOBRE la foto (títulos, stats).
 */
function FotoAgua({ slug, alt, ratio = 'aspect-[16/10]', rounded = '', Fallback = Droplets, children = null }) {
  const [ok, setOk] = useState(true);
  const credito = creditoDe(slug);
  const IconoFallback = Fallback;
  return (
    <div className={`relative overflow-hidden bg-slate-950 ${ratio} ${rounded}`}>
      {ok ? (
        <img
          src={`${FOTO_BASE_AGUA}/${slug}.jpg`}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setOk(false)}
          className="agua-foto absolute inset-0 w-full h-full object-cover"
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

/** Ilustración SVG propia para la cloración (evita foto de marca de lejía).
 *  Un gotero echa 2 gotas a un vaso de agua — el gesto exacto del método. */
function CloroIlustracion() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-cyan-950/70 to-slate-950" aria-hidden="true">
      <svg viewBox="0 0 160 100" className="w-4/5 h-4/5">
        {/* gotero inclinado */}
        <g className="text-slate-200">
          <rect x="30" y="14" width="14" height="30" rx="4" transform="rotate(28 37 29)" fill="currentColor" opacity="0.9" />
          <rect x="33" y="8" width="8" height="9" rx="2" transform="rotate(28 37 12)" fill="currentColor" />
        </g>
        {/* 2 gotas cayendo */}
        <g className="text-cyan-300">
          <path d="M62 40 q -4 6 0 9 q 4 -3 0 -9 z" fill="currentColor" />
          <path d="M70 52 q -4 6 0 9 q 4 -3 0 -9 z" fill="currentColor" opacity="0.85" />
        </g>
        {/* etiqueta de la dosis */}
        <text x="86" y="38" className="fill-cyan-200" fontSize="15" fontWeight="900">×2</text>
        {/* vaso con agua */}
        <g>
          <path d="M96 58 L140 58 L134 94 L102 94 Z" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-300" strokeLinejoin="round" />
          <path d="M99 74 L137 74 L134 94 L102 94 Z" fill="currentColor" className="text-cyan-400/80" />
        </g>
      </svg>
      <span className="absolute bottom-1 right-1.5 rounded bg-black/45 px-1 py-0.5 text-[9px] leading-none text-white/60">Ilustración</span>
    </div>
  );
}

/* ── PILAR 1 · Cosechar la lluvia ─────────────────────────────────────── */
function PilarLluvia() {
  const [areaTecho, setAreaTecho] = useState('');
  const [lluviaMes, setLluviaMes] = useState('');
  const [capacidad, setCapacidad] = useState('1000');

  const litros = useMemo(
    () => litrosLluviaCaptables({ areaTechoM2: areaTecho, lluviaMm: lluviaMes }),
    [areaTecho, lluviaMes],
  );
  const canecas = litros != null ? canecasEquivalentes(litros) : null;
  const nivel = litros != null ? porcentajeTanque({ litros, capacidadL: capacidad }) : null;

  return (
    <section className="agua-seccion space-y-4" data-testid="pilar-lluvia">
      {/* Hero con foto real del sistema techo→canal→tanque */}
      <div className="rounded-2xl border border-cyan-700/40 overflow-hidden bg-slate-900/60">
        <FotoAgua slug="lluvia" alt="Sistema de cosecha de lluvia: canal en el alero que baja a un tanque junto a la casa" ratio="aspect-[16/9]" Fallback={CloudRain}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-cyan-200">
              <CloudRain size={14} aria-hidden="true" /> Del cielo al tanque
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow">El techo también es una fuente de agua</h3>
          </div>
        </FotoAgua>
      </div>
      <p className="text-sm leading-relaxed text-slate-200">
        Cada aguacero que cae sobre su techo es agua que ya pagó el cielo. Con un
        canal y un tanque, ese techo se vuelve la primera fuente de agua de la
        finca — y cada caneca guardada es agua que en verano no se le saca al
        nacimiento.
      </p>

      {/* Calculadora determinista: área × lluvia × 0.8 */}
      <div className="rounded-2xl border border-cyan-700/40 bg-slate-900/60 p-4 space-y-3">
        <p className="flex items-center gap-2 text-sm font-black text-cyan-300 uppercase tracking-wide">
          <Calculator size={16} aria-hidden="true" /> Cuánta agua le cae al techo
        </p>
        <div className="grid grid-cols-2 gap-3">
          <CampoNumero
            id="agua-area-techo"
            label="Techo"
            unidad="m²"
            value={areaTecho}
            onChange={setAreaTecho}
            placeholder="60"
            hint="Largo × ancho del piso que cubre el techo."
          />
          <CampoNumero
            id="agua-lluvia-mes"
            label="Lluvia del mes"
            unidad="mm"
            value={lluviaMes}
            onChange={setLluviaMes}
            placeholder="120"
            hint="De su pluviómetro o del módulo de clima."
          />
        </div>
        <p className="text-[11px] leading-snug text-slate-400">
          El dato de lluvia típica de su municipio llegará solo al módulo{' '}
          <SlotPendiente>lluvia por zona en camino (IDEAM)</SlotPendiente>. Mientras
          tanto, digite el suyo.
        </p>

        {litros != null ? (
          <div className="flex items-center gap-4 rounded-xl border border-cyan-600/40 bg-cyan-950/40 p-3" data-testid="calc-lluvia-resultado">
            {/* tanque con nivel animado (scaleY) */}
            <svg viewBox="0 0 44 56" className="w-12 h-16 shrink-0" aria-hidden="true">
              <rect x="4" y="4" width="36" height="48" rx="6" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-400" />
              <g>
                <rect
                  x="8" y="8" width="28" height="40" rx="3"
                  fill="currentColor"
                  className="text-cyan-400/80 agua-nivel"
                  style={{ transform: `scaleY(${Math.max(nivel ?? 0, 4) / 100})` }}
                />
              </g>
            </svg>
            <div className="min-w-0">
              <p className="text-2xl font-black text-white leading-none">
                {fmt(litros)} <span className="text-base font-bold text-cyan-300">litros al mes</span>
              </p>
              <p className="mt-1 text-xs text-slate-300">
                ≈ {fmt(canecas)} canecas de 55 galones ({LITROS_POR_CANECA_55GAL} L).
                {nivel != null && Number(capacidad) > 0 && (
                  <> Su tanque de {fmt(capacidad)} L quedaría al <strong className="text-cyan-200">{nivel}%</strong>{nivel >= 100 ? ' — ¡y sobra!' : '.'}</>
                )}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                Cuenta hecha con el {Math.round(COEF_ESCORRENTIA_TECHO_DEFAULT * 100)}% de la lluvia: una parte siempre se pierde en salpique y primeras lavadas.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs italic text-slate-500" data-testid="calc-lluvia-vacia">
            Digite el techo y la lluvia para ver los litros.
          </p>
        )}

        <CampoNumero
          id="agua-capacidad-tanque"
          label="¿De cuánto es su tanque? (opcional)"
          unidad="L"
          value={capacidad}
          onChange={setCapacidad}
          placeholder="1000"
        />
      </div>

      {/* Pasos del sistema — es una secuencia real de construcción */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4">
        <p className="text-sm font-black text-slate-100 uppercase tracking-wide mb-3">Del techo al tanque, en orden</p>
        <ol className="space-y-3">
          {PASOS_COSECHA.map((paso, i) => (
            <li key={paso.id} className="flex gap-3">
              <span aria-hidden="true" className="shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-black grid place-items-center">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-100 leading-tight">{paso.titulo}</p>
                <p className="text-xs leading-snug text-slate-300 mt-0.5">{paso.detalle}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ── PILAR 2 · Regar con medida ───────────────────────────────────────── */
function PilarRiego() {
  const [eto, setEto] = useState('');
  const [kc, setKc] = useState('');
  const [area, setArea] = useState('');

  const etc = useMemo(() => etcDiaria({ etoMmDia: eto, kc }), [eto, kc]);
  const litrosDia = useMemo(
    () => (etc != null ? litrosRiegoDia({ etcMmDia: etc, areaM2: area }) : null),
    [etc, area],
  );

  return (
    <section className="agua-seccion space-y-4" data-testid="pilar-riego">
      <p className="text-sm leading-relaxed text-slate-200">
        Regar no es empapar: es darle a la mata lo que ese día transpiró y ni una
        gota más. Esa cuenta tiene nombre — <strong className="text-teal-300">ETc</strong>,
        el consumo diario del cultivo — y se saca multiplicando el clima de su zona
        (ETo) por el apetito de agua de cada cultivo (Kc).
      </p>

      <div className="rounded-2xl border border-teal-700/40 bg-slate-900/60 p-4 space-y-3">
        <p className="flex items-center gap-2 text-sm font-black text-teal-300 uppercase tracking-wide">
          <Calculator size={16} aria-hidden="true" /> La cuenta del riego
        </p>
        <div className="grid grid-cols-2 gap-3">
          <CampoNumero
            id="agua-eto"
            label="ETo de su zona"
            unidad="mm/día"
            value={eto}
            onChange={setEto}
            placeholder="—"
            hint="Cuánta agua 'pide' el clima al día."
          />
          <CampoNumero
            id="agua-kc"
            label="Kc del cultivo"
            unidad=""
            value={kc}
            onChange={setKc}
            placeholder="—"
            hint="El apetito del cultivo (entre 0.2 y 1.3)."
          />
        </div>
        <CampoNumero
          id="agua-area-riego"
          label="Área sembrada"
          unidad="m²"
          value={area}
          onChange={setArea}
          placeholder="100"
        />
        {/* ETo de referencia por piso térmico (IDEAM): toque para llenar */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-300 mb-1.5">
            ETo por piso térmico <span className="font-normal normal-case text-slate-500">(toque para usar)</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ETO_POR_PISO_TERMICO.map((e) => (
              <button
                key={e.piso}
                type="button"
                data-testid={`agua-eto-piso-${e.piso}`}
                onClick={() => setEto(String(e.etoMmDia))}
                className="inline-flex items-center gap-1.5 rounded-full border border-teal-700/50 bg-teal-950/40 px-2.5 py-1 text-xs font-bold text-slate-200 active:bg-teal-900/60"
              >
                {e.piso}
                <span className="text-teal-300">{e.etoMmDia} mm/día</span>
              </button>
            ))}
          </div>
        </div>
        <p className="text-[11px] leading-snug text-slate-400">
          ETo de referencia por piso térmico (fórmula altitud del IDEAM) y Kc por cultivo
          (FAO-56 Cuadro 12): son valores <strong className="text-slate-300">orientadores</strong> —
          ajústelos al clima y la variedad de su finca. Si tiene el dato de su estación, use ese.
        </p>

        {litrosDia != null ? (
          <div className="rounded-xl border border-teal-600/40 bg-teal-950/40 p-3" data-testid="calc-riego-resultado">
            <p className="text-2xl font-black text-white leading-none">
              {fmt(litrosDia)} <span className="text-base font-bold text-teal-300">litros al día</span>
            </p>
            <p className="mt-1 text-xs text-slate-300">
              Consumo del cultivo: <strong className="text-teal-200">{etc} mm/día</strong> (ETo × Kc) sobre {fmt(area)} m².
              Es la necesidad de la planta: según el sistema de riego, una parte se pierde por el camino.
            </p>
          </div>
        ) : (
          <p className="text-xs italic text-slate-500" data-testid="calc-riego-vacia">
            Digite ETo, Kc y área para ver los litros diarios.
          </p>
        )}

        {/* Kc por cultivo (FAO-56, etapa media): toque para llenar */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-300 mb-1.5">
            Kc por cultivo <span className="font-normal normal-case text-slate-500">(pico, toque para usar)</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {KC_CULTIVOS.map((c) => (
              <button
                key={c.slug}
                type="button"
                data-testid={`agua-kc-${c.slug}`}
                onClick={() => c.kc != null && setKc(String(c.kc))}
                disabled={c.kc == null}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950/50 px-2.5 py-1 text-xs font-bold text-slate-200 active:bg-slate-800/60 disabled:opacity-60"
              >
                {c.nombre}
                {c.kc == null ? <SlotPendiente /> : <span className="text-teal-300">{c.kc}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sistemas de riego: comparación cualitativa, sin cifras inventadas */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4 space-y-3">
        <p className="text-sm font-black text-slate-100 uppercase tracking-wide">Con qué riega, cuánto pierde</p>
        {SISTEMAS_RIEGO.map((s) => (
          <div key={s.id} className="rounded-xl border border-slate-700/50 bg-slate-950/40 p-3">
            <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-100 leading-tight">
              {s.nombre}
              <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-[11px] font-bold text-slate-300">{s.pierde}</span>
              {Array.isArray(s.coefRango) && (
                <span className="rounded-full bg-teal-500/15 border border-teal-600/40 px-2 py-0.5 text-[11px] font-bold text-teal-300">
                  {Math.round(s.coefRango[0] * 100)}–{Math.round(s.coefRango[1] * 100)}% llega a la raíz
                </span>
              )}
            </p>
            <p className="text-xs leading-snug text-slate-300 mt-1">{s.detalle}</p>
          </div>
        ))}
        <p className="text-[11px] leading-snug text-slate-400">
          Eficiencia de aplicación por sistema (goteo 90–95 %, aspersión 80–85 %, surco 70–80 %;
          el surco es el único valor primario verificado, los otros dos son rango de literatura).
          El orden no cambia: goteo rinde más que aspersión, y aspersión más que el surco.
        </p>
      </div>

      {/* Prácticas de ahorro */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4">
        <p className="text-sm font-black text-slate-100 uppercase tracking-wide mb-3">Menos sed con el mismo cielo</p>
        <ul className="space-y-3">
          {PRACTICAS_AHORRO.map((p) => (
            <li key={p.id} className="flex gap-3">
              <Sprout size={18} aria-hidden="true" className="shrink-0 text-lime-400 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-100 leading-tight">{p.titulo}</p>
                <p className="text-xs leading-snug text-slate-300 mt-0.5">{p.detalle}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── PILAR 3b · Riesgos de contaminación + salud ──────────────────────── */

/** Íconos de riesgo por clave de fuente contaminante (data-driven). */
const ICONO_RIESGO = {
  veneno: Skull,
  cochera: PiggyBank,
  letrina: Biohazard,
  agroquimico: FlaskConical,
  combustible: Fuel,
  matadero: Beef,
  basura: Trash2,
};

/** Íconos por enfermedad. */
const ICONO_ENFERMEDAD = {
  diarrea: Activity,
  bebe: Baby,
  intoxicacion: HeartPulse,
};

/** Semáforo de peligro: punto de color + etiqueta (alto = rojo, medio = ámbar). */
function SemaforoPeligro({ nivel }) {
  const alto = nivel === 'alto';
  return (
    <span
      data-testid={`semaforo-${nivel}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
        alto
          ? 'border-rose-500/50 bg-rose-500/15 text-rose-200'
          : 'border-amber-500/50 bg-amber-500/15 text-amber-200'
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block w-2 h-2 rounded-full ${alto ? 'bg-rose-400 agua-peligro-late' : 'bg-amber-400'}`}
      />
      Peligro {alto ? 'alto' : 'medio'}
    </span>
  );
}

/**
 * RiesgosSalud — la sección nueva del pilar "Cuidar el agua":
 *   A. Qué le echa veneno al agua (fuentes de contaminación + semáforo).
 *   B. Y esto es lo que enferma (enfermedades, con autoridad institucional).
 *   C. La regla de las distancias (ilustración de la finca + metros grounded).
 * Mantiene el lenguaje visual del módulo (cuaderno de campo, acentos cyan) y
 * NUNCA cita a una persona en lo safety-critical: solo instituciones.
 */
function RiesgosSalud() {
  return (
    <div className="space-y-4" data-testid="agua-riesgos-salud">
      <PedagogicalBlock
        icon={ShieldAlert}
        tone="alerta"
        lead="El agua no se ensucia sola: alguien, aguas arriba, le echó algo."
        clave="Casi todo se previene con dos cosas: distancia al agua y manejo de lo que gotea (venenos, estiércol, aguas negras)."
      >
        <p>
          La contaminación llega por dos caminos: la <strong className="text-rose-200">escorrentía</strong>{' '}
          (lo que corre por encima con el aguacero) y la{' '}
          <strong className="text-rose-200">lixiviación</strong> (lo que se filtra hacia abajo hasta el
          agua del subsuelo). Por eso lo que pase loma arriba termina en el nacimiento y en el pozo.
        </p>
      </PedagogicalBlock>

      {/* ── A · Qué contamina ── */}
      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4 space-y-3" data-testid="agua-que-contamina">
        <p className="flex items-center gap-2 text-sm font-black text-slate-100 uppercase tracking-wide">
          <TriangleAlert size={16} aria-hidden="true" className="text-rose-300" /> Qué le echa veneno al agua
        </p>
        <ul className="space-y-2.5">
          {RIESGOS_CONTAMINACION.map((r) => {
            const Icono = ICONO_RIESGO[r.icono] || TriangleAlert;
            return (
              <li key={r.id} className="rounded-xl border border-slate-700/50 bg-slate-950/40 p-3" data-testid={`riesgo-${r.id}`}>
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`shrink-0 w-9 h-9 rounded-xl grid place-items-center ${
                      r.nivel === 'alto' ? 'bg-rose-500/15 text-rose-300' : 'bg-amber-500/15 text-amber-300'
                    }`}
                  >
                    <Icono size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-100 leading-tight">
                      {r.fuente}
                      <SemaforoPeligro nivel={r.nivel} />
                    </p>
                    <p className="mt-1 text-xs leading-snug text-slate-300">{r.aporta}</p>
                    <p className="mt-1.5 text-[11px] leading-snug text-slate-400">
                      <span className="inline-flex items-center gap-1 rounded bg-slate-800/70 px-1.5 py-0.5 font-bold text-slate-300">
                        <Droplets size={10} aria-hidden="true" /> {r.via}
                      </span>{' '}
                      <span className="text-emerald-300 font-bold">Prevenir:</span> {r.prevenir}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── B · Qué enferma (autoridad institucional, nunca una persona) ── */}
      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4 space-y-3" data-testid="agua-enfermedades">
        <p className="flex items-center gap-2 text-sm font-black text-slate-100 uppercase tracking-wide">
          <HeartPulse size={16} aria-hidden="true" className="text-rose-300" /> Y esto es lo que enferma
        </p>
        {ENFERMEDADES_AGUA.map((e) => {
          const Icono = ICONO_ENFERMEDAD[e.icono] || Activity;
          return (
            <article
              key={e.id}
              data-testid={`enfermedad-${e.id}`}
              className={`rounded-xl border p-3 ${
                e.critico
                  ? 'border-rose-600/50 bg-rose-950/30'
                  : 'border-slate-700/50 bg-slate-950/40'
              }`}
            >
              <p className="flex items-start gap-2.5 text-sm font-black leading-tight text-slate-100">
                <Icono size={18} aria-hidden="true" className={`shrink-0 mt-0.5 ${e.critico ? 'text-rose-300' : 'text-slate-300'}`} />
                <span>
                  {e.nombre}
                  {e.critico && (
                    <span className="ml-2 rounded-full bg-rose-500/20 border border-rose-500/50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-rose-200 align-middle">
                      Grave
                    </span>
                  )}
                </span>
              </p>
              <dl className="mt-2 space-y-1 text-xs leading-snug">
                <div className="flex gap-1.5">
                  <dt className="shrink-0 font-bold text-slate-400">De dónde:</dt>
                  <dd className="text-slate-300">{e.causa}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="shrink-0 font-bold text-slate-400">Cómo se ve:</dt>
                  <dd className="text-slate-200">{e.senal}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="shrink-0 font-bold text-slate-400">Más riesgo:</dt>
                  <dd className="text-slate-300">{e.masRiesgo}</dd>
                </div>
              </dl>
              {/* Autoridad institucional citada — el "guard": nunca una persona */}
              <div className="mt-2 rounded-lg border border-sky-700/40 bg-sky-950/30 p-2.5">
                <p className="flex items-start gap-1.5 text-[11px] leading-snug text-sky-100">
                  <ShieldCheck size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-sky-300" />
                  <span>{e.autoridad}</span>
                </p>
                <p className="mt-1 text-[10px] leading-snug text-slate-500">Fuente: {e.fuente}</p>
              </div>
            </article>
          );
        })}
      </section>

      {/* ── C · La regla de las distancias (ilustración + metros grounded) ── */}
      <section className="rounded-2xl border border-emerald-700/40 bg-slate-900/60 p-4 space-y-3" data-testid="agua-distancias">
        <p className="flex items-center gap-2 text-sm font-black text-emerald-200 uppercase tracking-wide">
          <Ruler size={16} aria-hidden="true" /> La regla de las distancias
        </p>
        <p className="text-xs leading-snug text-slate-300">
          La misma finca, en corte: el agua en el centro, y cada cosa que la puede dañar a su
          distancia mínima. Lo verde protege; lo rojo se aleja.
        </p>

        <DistanciasFinca items={DISTANCIAS_SEGURIDAD} />

        <ul className="space-y-2">
          {DISTANCIAS_SEGURIDAD.map((d) => (
            <li key={d.id} className="flex items-start gap-2.5" data-testid={`distancia-${d.id}`}>
              <span
                aria-hidden="true"
                className={`shrink-0 mt-0.5 inline-flex items-center justify-center min-w-[52px] rounded-lg px-1.5 py-0.5 text-xs font-black ${
                  d.tipo === 'proteger'
                    ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/40'
                    : 'bg-rose-500/15 text-rose-200 border border-rose-500/40'
                }`}
              >
                {d.metros} m
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-100 leading-tight">{d.que}</span>
                <span className="block text-xs text-slate-300 leading-snug mt-0.5">{d.detalle}</span>
                <span className="block text-[10px] text-slate-500 leading-snug mt-0.5">
                  {d.norma}{d.confianza === 'media' ? ' · referencia (confianza media)' : ''}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-400">
          <Landmark size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-slate-500" />
          <span>
            La distancia exacta de un corral o porqueriza al agua todavía no tiene una cifra única en
            norma nacional{' '}<SlotPendiente>retiro de corrales en camino (ICA)</SlotPendiente>; mientras
            tanto, la regla es sencilla: lejos y aguas abajo del pozo.
          </span>
        </p>
      </section>
    </div>
  );
}

/* ── SALUD · ¿Mi agua es segura? (IRCA + señales, sobre foto real) ─────── */
function MiAguaSegura() {
  return (
    <section className="rounded-2xl border border-slate-700/60 bg-slate-900/60 overflow-hidden" data-testid="agua-es-segura">
      <FotoAgua
        slug="turbia"
        alt="Agua de quebrada turbia, revuelta y con espuma: señal de que no está para tomar sin tratar"
        ratio="aspect-[16/9]"
        Fallback={HelpCircle}
      >
        <div className="absolute inset-0 flex flex-col justify-end p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-cyan-200">
            <HeartPulse size={14} aria-hidden="true" /> Su salud
          </p>
          <h3 className="text-2xl font-black text-[#ffffff] leading-tight drop-shadow">¿Mi agua es segura?</h3>
        </div>
      </FotoAgua>

      <div className="p-4 space-y-3">
        {/* El dato que convierte "puede estar mala" en "a uno de cada tres le sale mala" */}
        <div className="flex items-center gap-3.5 rounded-xl border border-rose-600/40 bg-rose-950/30 p-3" data-testid="agua-irca">
          <p className="shrink-0 text-4xl font-black leading-none text-rose-300">{fmt(IRCA_RURAL.porcentajeRiesgo)}%</p>
          <p className="text-xs leading-snug text-slate-200">
            del agua para tomar en el <strong className="text-rose-200">campo colombiano</strong> está en riesgo alto:
            a más de uno de cada tres vecinos le sale mala. No se ve ni se huele — por eso, para tomar,{' '}
            <strong className="text-white">trátela siempre</strong>.
          </p>
        </div>

        {/* Señales de agua contaminada (antes vivían dentro del bloque de dosis) */}
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-rose-300 mb-1.5">
            <TriangleAlert size={14} aria-hidden="true" /> Ni la toque si ve esto
          </p>
          <ul className="grid gap-1.5" data-testid="agua-senales-alerta">
            {SENALES_ALERTA_AGUA.map((s) => (
              <li key={s} className="flex gap-1.5 text-xs leading-snug text-slate-200">
                <span aria-hidden="true" className="text-rose-400">•</span>{s}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[10px] leading-snug text-slate-500">
          El riesgo se mide con el IRCA (Índice de Riesgo de la Calidad del Agua para consumo humano).
          Fuente: {IRCA_RURAL.fuente}.
        </p>
      </div>
    </section>
  );
}

/* ── SALUD · Cómo potabilizar en casa (4 métodos, paso a paso con foto) ── */
const ICONO_METODO = { hervir: Flame, cloro: Droplets, sodis: Sun, bioarena: Filter };
const TONO_METODO = {
  sky: { icon: 'text-sky-300', num: 'border-sky-500/40 bg-sky-500/15 text-sky-200' },
  cyan: { icon: 'text-cyan-300', num: 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200' },
  amber: { icon: 'text-amber-300', num: 'border-amber-500/40 bg-amber-500/15 text-amber-200' },
  lime: { icon: 'text-lime-300', num: 'border-lime-500/40 bg-lime-500/15 text-lime-200' },
};

/** Tarjeta de un método de potabilización: foto/ilustración + pasos + alcance. */
function MetodoCard({ m }) {
  const Icono = ICONO_METODO[m.icono] || Droplets;
  const t = TONO_METODO[m.tono] || TONO_METODO.sky;
  return (
    <article className="rounded-2xl border border-slate-700/60 bg-slate-900/60 overflow-hidden flex flex-col" data-testid={`metodo-${m.id}`}>
      <div className="relative aspect-[16/10] bg-slate-950">
        {m.foto ? (
          <FotoAgua slug={m.foto} alt={`Potabilizar el agua en casa: ${m.titulo}`} ratio="aspect-[16/10]" Fallback={Icono} />
        ) : (
          <CloroIlustracion />
        )}
        <span className="absolute top-2 left-2 z-10 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1">
          <Icono size={15} className={t.icon} aria-hidden="true" />
          <span className="text-[13px] font-black text-[#ffffff]">{m.titulo}</span>
        </span>
      </div>

      <div className="p-3.5 flex flex-col gap-3 flex-1">
        <p className="text-sm font-bold leading-snug text-slate-100">{m.gancho}</p>
        <ol className="space-y-2">
          {m.pasos.map((p, i) => (
            <li key={i} className="flex gap-2.5">
              <span aria-hidden="true" className={`shrink-0 w-5 h-5 rounded-full border grid place-items-center text-[11px] font-black ${t.num}`}>{i + 1}</span>
              <p className="text-xs leading-snug text-slate-200">{p}</p>
            </li>
          ))}
        </ol>
        <div className="mt-auto grid gap-1.5 rounded-lg bg-slate-950/50 border border-slate-700/50 p-2.5">
          <p className="flex items-start gap-1.5 text-[11px] leading-snug text-emerald-200">
            <ShieldCheck size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-emerald-400" />{m.quita}
          </p>
          <p className="flex items-start gap-1.5 text-[11px] leading-snug text-amber-200/90">
            <TriangleAlert size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-amber-400" />{m.noQuita}
          </p>
        </div>
        <p className="text-[10px] leading-snug text-slate-500">Fuente: {m.fuente}</p>
      </div>
    </article>
  );
}

/**
 * MetodosPotabilizacion — la galería photo-forward del "para tomar, trátela".
 * Conserva el data-testid `agua-dosis-potabilizacion` y las cifras que las
 * pruebas verifican (las dosis viven en cada MetodoCard, groundeadas).
 */
function MetodosPotabilizacion() {
  return (
    <section className="rounded-2xl border border-sky-700/40 bg-slate-900/60 p-4 space-y-3" data-testid="agua-dosis-potabilizacion">
      <p className="flex items-center gap-2 text-sm font-black text-sky-300 uppercase tracking-wide">
        <Milk size={16} aria-hidden="true" /> Para tomar: trátela siempre
      </p>
      <p className="text-xs leading-snug text-slate-200">
        Cuatro maneras caseras, de la más segura a la más sencilla. Antes de cualquiera,
        deje asentar el agua turbia y pásela por una tela limpia: el cloro y el sol pierden
        fuerza en agua revuelta.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {METODOS_POTABILIZACION.map((m) => <MetodoCard key={m.id} m={m} />)}
      </div>
      <p className="text-[10px] leading-snug text-slate-500">
        Dosis groundeadas: EPA (cloro), OMS/EPA (hervido), EAWAG-SANDEC/Banco Mundial (SODIS),
        CAWST/OMS (bioarena). Si huele a químico o viene de potrero fumigado, ni hervida —
        consígala de otra fuente.
      </p>
    </section>
  );
}

/** Créditos de las fotos — cumplimiento de licencia abierta (patrón Suelo). */
function CreditosFotos() {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3" data-testid="agua-creditos-fotos">
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
          {CREDITOS_FOTOS_AGUA.map((cr) => (
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

/* ── PILAR 3 · Cuidar el agua ─────────────────────────────────────────── */
function PilarCuidar() {
  // Fase ENSO viva desde el servicio que Chagra ya tiene (no se re-implementa
  // clima aquí; solo se lee para aterrizar el consejo del caso insignia).
  const fase = getEnsoPhase();
  const faseLabel = getEnsoLabel();
  const consejoEnso = {
    el_nino: 'Fase actual: El Niño — se espera menos lluvia de lo normal. Guarde desde ya y racione temprano: este es el verano que seca nacimientos.',
    la_nina: 'Fase actual: La Niña — se espera más lluvia de lo normal. Aproveche: llene tanques, siembre la protección del nacimiento y revise canales.',
    neutral: 'Fase actual: Neutral — el año viene sin Niño ni Niña encima, pero el verano llega igual: la protección se siembra en invierno.',
  }[fase] || '';

  return (
    <section className="agua-seccion space-y-4" data-testid="pilar-cuidar">
      {/* SALUD · el gancho: ¿mi agua es segura? (foto real + IRCA + señales) */}
      <MiAguaSegura />

      <p className="text-sm leading-relaxed text-slate-200">
        El agua de la finca son dos cuidados en uno: que la que entra a la casa no
        enferme a nadie, y que el nacimiento que la da no se quede solo.
      </p>

      {/* Escalera de usos */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4 space-y-3">
        <p className="text-sm font-black text-slate-100 uppercase tracking-wide">Cada agua para lo suyo</p>
        {USOS_DEL_AGUA.map((u) => (
          <div key={u.id} className="rounded-xl border border-slate-700/50 bg-slate-950/40 p-3">
            <p className="text-sm font-bold text-slate-100 leading-tight">{u.agua}</p>
            <p className="text-xs text-slate-300 mt-1"><strong className="text-emerald-300">Sirve para:</strong> {u.sirve}</p>
            <p className="text-xs text-amber-200/90 mt-0.5"><strong>Ojo:</strong> {u.ojo}</p>
          </div>
        ))}
      </div>

      {/* SALUD · Cómo potabilizar en casa — galería photo-forward, 4 métodos */}
      <MetodosPotabilizacion />

      {/* RIESGOS DE CONTAMINACIÓN + SALUD (qué contamina, qué enferma, distancias) */}
      <RiesgosSalud />

      {/* CASO INSIGNIA · proteger la fuente (foto real de la franja de monte) */}
      <div className="rounded-2xl border border-emerald-700/50 bg-emerald-950/30 overflow-hidden" data-testid="caso-nacimiento">
        <FotoAgua slug="nacimiento" alt="Franja de monte a lado y lado de una quebrada que la protege: la ronda hídrica que cuida la fuente" ratio="aspect-[16/9]" Fallback={Sprout}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-200">
              <Sprout size={14} aria-hidden="true" /> Proteger la fuente
            </p>
            <h3 className="text-xl font-black text-[#ffffff] leading-tight drop-shadow">El monte de la orilla es lo que guarda el agua</h3>
          </div>
        </FotoAgua>

        <div className="p-4 space-y-3">
        <p className="flex items-center gap-2 text-base font-black text-emerald-200 leading-tight">
          <Droplets size={18} aria-hidden="true" className="shrink-0 text-cyan-300" />
          «{CASO_NACIMIENTO.titulo}»
        </p>
        <p className="text-xs leading-snug text-slate-200">{CASO_NACIMIENTO.resumen}</p>

        <div>
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-amber-300 mb-2">
            <Sun size={14} aria-hidden="true" /> En pleno verano (auxilio)
          </p>
          <ul className="space-y-2">
            {CASO_NACIMIENTO.enVerano.map((p) => (
              <li key={p.id} className="text-xs leading-snug text-slate-200">
                <strong className="text-slate-100">{p.titulo}.</strong> {p.detalle}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-emerald-300 mb-2">
            <CloudRain size={14} aria-hidden="true" /> En invierno se siembra la solución
          </p>
          <ul className="space-y-2">
            {CASO_NACIMIENTO.enInvierno.map((p) => (
              <li key={p.id} className="text-xs leading-snug text-slate-200">
                <strong className="text-slate-100">{p.titulo}.</strong> {p.detalle}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-sky-300 mb-2">
            <Users size={14} aria-hidden="true" /> Con los vecinos y con el clima
          </p>
          <ul className="space-y-2">
            {CASO_NACIMIENTO.comunidad.map((p) => (
              <li key={p.id} className="text-xs leading-snug text-slate-200">
                <strong className="text-slate-100">{p.titulo}.</strong> {p.detalle}
              </li>
            ))}
          </ul>
        </div>

        {/* Conexión viva con el ENSO que Chagra ya sigue */}
        <div className="rounded-xl border border-cyan-700/40 bg-slate-950/50 p-3" data-testid="enso-conexion">
          <p className="text-xs font-black uppercase tracking-wide text-cyan-300 mb-1">
            El clima que viene · {faseLabel}
          </p>
          <p className="text-xs leading-snug text-slate-200">{consejoEnso}</p>
        </div>

        {/* Franja legal: metros groundeados (Decreto 1449/1977) */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-950/40 p-3" data-testid="agua-ronda-legal">
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-slate-200 mb-1">
            <ShieldCheck size={14} aria-hidden="true" /> La ley también lo protege
          </p>
          <p className="text-xs leading-snug text-slate-300">
            La norma colombiana ordena conservar una franja de monte, como mínimo, de{' '}
            <strong className="text-emerald-300">{RONDA_PROTECCION.metrosNacimiento} metros a la redonda</strong> de
            cada nacimiento y de{' '}
            <strong className="text-emerald-300">{RONDA_PROTECCION.metrosCauce} metros a cada lado</strong> de ríos y
            quebradas. Es obligación del dueño del predio, con o sin trámite.
          </p>
          <p className="text-[10px] leading-snug text-slate-500 mt-1">
            Decreto 1449 de 1977, Art. 3 (hoy en el Decreto 1076 de 2015).
          </p>
        </div>
        </div>
      </div>
    </section>
  );
}

/* ── Pantalla principal ───────────────────────────────────────────────── */
export default function AguaScreen({ onBack, onNavigate = undefined }) {
  const [pilar, setPilar] = useState('lluvia');

  return (
    <ScreenShell title="Agua de la finca" icon={CloudRain} onBack={onBack}>
      <div className="max-w-2xl mx-auto p-4 space-y-4" data-testid="agua-screen">
        {/* Portada: el camino del agua + la nota de cuaderno */}
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4">
          <CaminoDelAgua activo={pilar} />
          <p className="mt-2 text-xs italic leading-snug text-slate-400 text-center">
            El agua hace un solo camino en la finca: cae al techo, riega el surco y
            nace en la loma. Cuidarlo completo es lo que la mantiene corriendo.
          </p>
        </div>

        {/* Navegación entre pilares */}
        <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Pilares del agua">
          {PILARES_AGUA.map((p) => {
            const activo = pilar === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={activo}
                data-testid={`pilar-tab-${p.id}`}
                onClick={() => setPilar(p.id)}
                className={`rounded-xl border px-2 py-2.5 text-center transition-colors min-h-[56px] ${
                  activo
                    ? 'agua-estacion-activa border-cyan-500/70 bg-cyan-500/15 text-cyan-200'
                    : 'border-slate-700 bg-slate-900/50 text-slate-300 active:bg-slate-800/70'
                }`}
              >
                <span className="block text-sm font-black leading-tight">{p.titulo}</span>
                <span className={`block text-[10px] leading-tight mt-0.5 ${activo ? 'text-cyan-300/90' : 'text-slate-500'}`}>
                  {p.descripcion}
                </span>
              </button>
            );
          })}
        </div>

        {pilar === 'lluvia' && <PilarLluvia />}
        {pilar === 'riego' && <PilarRiego />}
        {pilar === 'cuidar' && <PilarCuidar />}

        {/* Créditos de todas las fotos del módulo (cumplimiento licencia abierta) */}
        <CreditosFotos />

        {/* Puente al agente para lo que el módulo no alcanza */}
        {typeof onNavigate === 'function' && (
          <button
            type="button"
            data-testid="agua-preguntar-agente"
            onClick={() => onNavigate('agente', { prefilledPrompt: '¿Cómo cuido el agua de mi finca en la época seca?' })}
            className="w-full flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-3.5 text-left active:bg-slate-800/60 transition-colors"
          >
            <span aria-hidden="true" className="shrink-0 w-10 h-10 rounded-xl bg-cyan-500/15 grid place-items-center">
              <Droplets size={20} className="text-cyan-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100 leading-tight">¿Su caso es distinto?</span>
              <span className="block text-xs text-slate-400 leading-tight mt-0.5">Cuénteselo al agente: él conoce su finca y su clima.</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
          </button>
        )}
      </div>
    </ScreenShell>
  );
}
