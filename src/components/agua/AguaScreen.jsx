import React, { useMemo, useState } from 'react';
import {
  CloudRain, Droplets, Sprout, Calculator, TriangleAlert, Sun,
  ShieldCheck, Users, Hourglass, Milk, ChevronRight,
} from 'lucide-react';
import { ScreenShell } from '../common/ScreenShell';
import CaminoDelAgua from './CaminoDelAgua';
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
  DOSIS_POTABILIZACION,
  RONDA_PROTECCION,
  CASO_NACIMIENTO,
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

      {/* Potabilidad — dosis groundeadas (EPA / OMS / EAWAG) */}
      <div className="rounded-2xl border border-sky-700/40 bg-slate-900/60 p-4 space-y-2">
        <p className="flex items-center gap-2 text-sm font-black text-sky-300 uppercase tracking-wide">
          <Milk size={16} aria-hidden="true" /> Para tomar: trátela siempre
        </p>
        <p className="text-xs leading-snug text-slate-200">
          Deje asentar el agua turbia y pásela por tela limpia (el cloro y el sol pierden
          fuerza en agua turbia). Luego, elija una:
        </p>
        <ul className="space-y-1.5" data-testid="agua-dosis-potabilizacion">
          <li className="text-xs leading-snug text-slate-200 flex gap-2">
            <span aria-hidden="true" className="text-sky-400 font-bold">•</span>
            <span>
              <strong className="text-sky-200">Hervir:</strong> {DOSIS_POTABILIZACION.hervorMinutos} minuto
              a nivel del mar, {DOSIS_POTABILIZACION.hervorMinutosSobre1000m} minutos por encima de los
              1.000 metros (en alto el agua hierve más frío).
            </span>
          </li>
          <li className="text-xs leading-snug text-slate-200 flex gap-2">
            <span aria-hidden="true" className="text-sky-400 font-bold">•</span>
            <span>
              <strong className="text-sky-200">Cloro:</strong> {DOSIS_POTABILIZACION.cloroGotasPorLitro} gotas
              de cloro doméstico (al {DOSIS_POTABILIZACION.cloroConcentracionPct} %) por litro, revuelva y
              espere {DOSIS_POTABILIZACION.cloroEsperaMin} minutos. Doble la dosis si está turbia, con color o muy fría.
            </span>
          </li>
          <li className="text-xs leading-snug text-slate-200 flex gap-2">
            <span aria-hidden="true" className="text-sky-400 font-bold">•</span>
            <span>
              <strong className="text-sky-200">Sol (SODIS):</strong> botella plástica transparente de máximo 2 litros,
              {' '}{DOSIS_POTABILIZACION.sodisHorasSol} horas al sol despejado ({DOSIS_POTABILIZACION.sodisDiasSiNublado} días
              si está muy nublado). Solo si el agua está clara (turbiedad baja).
            </span>
          </li>
        </ul>
        <p className="text-[10px] leading-snug text-slate-500">
          Fuentes: EPA (cloro), OMS/EPA (hervido), EAWAG-Banco Mundial (SODIS).
          Si huele a químico o viene de potrero fumigado, ni hervida — consígala de otra fuente.
        </p>
        <div className="rounded-xl border border-rose-700/40 bg-rose-950/30 p-3">
          <p className="flex items-center gap-2 text-xs font-black text-rose-300 uppercase tracking-wide mb-1.5">
            <TriangleAlert size={14} aria-hidden="true" /> No la use si ve esto
          </p>
          <ul className="space-y-1">
            {SENALES_ALERTA_AGUA.map((s) => (
              <li key={s} className="text-xs leading-snug text-slate-200 flex gap-1.5">
                <span aria-hidden="true" className="text-rose-400">•</span>{s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* CASO INSIGNIA */}
      <div className="rounded-2xl border border-emerald-700/50 bg-emerald-950/30 p-4 space-y-3" data-testid="caso-nacimiento">
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
