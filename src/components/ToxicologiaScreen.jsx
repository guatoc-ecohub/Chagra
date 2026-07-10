/* i18n (ADR-050): etiquetas user-facing en español Colombia pendientes de
 * migrar a src/config/messages.js. La regla chagra-i18n es soft (warn); se
 * desactiva a nivel de archivo para no bloquear el pre-commit (mismo criterio
 * que App.jsx y los demás screens). Los errores reales siguen activos. */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronLeft, FlaskConical, Sprout, Skull, ShieldAlert, ShieldCheck,
  HardHat, AlertTriangle, Microscope, Scale, RotateCcw, CheckCircle2,
  Info, HelpCircle,
} from 'lucide-react';
import { getAllBiopreparados } from '../db/catalogDB';
import { fichasToxicologicas } from '../services/toxicologiaInsumos';
import {
  PREGUNTAS_RIESGO_SUELO,
  CONTAMINANTE_LABEL,
  FUENTES_TOX_SUELO,
  evaluarRiesgoSuelo,
} from '../data/toxicologia-suelo';

/**
 * ToxicologiaScreen — Módulo de TOXICOLOGÍA (contenido sensible de seguridad).
 *
 * Dos partes en una sola pantalla con pestañas:
 *   A) INSUMOS/biopreparados — ficha de toxicidad real (del catálogo): nivel,
 *      EPI requerido, restricción legal (Res. ICA 698/2011) y dosis/precaución
 *      segura. Caso crítico: caldo bordelés (cobre) y sulfocálcico (azufre).
 *   B) SUELO — cuestionario de RIESGO de contaminantes edáficos (metales
 *      pesados, plaguicidas, salinidad, aluminio tóxico). Da nivel CUALITATIVO
 *      + recomendación de laboratorio + medidas agroecológicas. Complementa la
 *      cromatografía: la cromatografía muestra la VIDA del suelo, esta evaluación
 *      alerta de TÓXICOS.
 *
 * ANTI-ALUCINACIÓN: ningún valor, dosis o toxicidad se inventa. Todo sale del
 * catálogo o, para el suelo, es cualitativo con remisión a "laboratorio/norma".
 */

/* ── Colores por nivel (estáticos para que el JIT de Tailwind los genere) ── */
const NIVEL_BOX = {
  red: 'bg-red-950/60 border-red-700/60 text-red-200',
  amber: 'bg-amber-950/50 border-amber-700/50 text-amber-200',
  emerald: 'bg-emerald-950/60 border-emerald-700/60 text-emerald-200',
  slate: 'bg-slate-800/70 border-slate-600 text-slate-200',
};
const NIVEL_DOT = {
  red: 'text-red-400',
  amber: 'text-amber-400',
  emerald: 'text-emerald-400',
  slate: 'text-slate-400',
};

function NivelBadge({ color, icono, label }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-2.5 py-1 border ${NIVEL_BOX[color] || NIVEL_BOX.slate}`}>
      <span aria-hidden="true">{icono}</span>
      {label}
    </span>
  );
}

/* ════════════════════════ PARTE A — INSUMOS ════════════════════════ */
function ToxInsumos() {
  const [fichas, setFichas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(() => getAllBiopreparados())
      .then((list) => {
        if (!alive) return;
        setFichas(fichasToxicologicas(list));
        setCargando(false);
      })
      .catch(() => {
        if (!alive) return;
        setError(true);
        setCargando(false);
      });
    return () => { alive = false; };
  }, []);

  if (cargando) {
    return (
      <p className="text-sm text-slate-400 px-1 py-6 text-center">Cargando insumos del catálogo…</p>
    );
  }
  if (error || fichas.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm text-slate-300 flex gap-2.5">
        <Info size={18} className="shrink-0 mt-0.5 text-slate-400" />
        <span>No pude cargar el catálogo de insumos en este momento. Intenta de nuevo más tarde.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex gap-2.5 text-sm text-slate-300">
        <ShieldAlert size={18} className="shrink-0 mt-0.5 text-amber-400" />
        <span>
          Antes de preparar o aplicar un insumo, revise su toxicidad y el equipo de protección
          que necesita. Los datos vienen del catálogo; donde no hay dato, manéjelo con precaución.
        </span>
      </div>

      <ul className="flex flex-col gap-3">
        {fichas.map((f) => (
          <li key={f.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-3 flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-100 leading-tight">{f.nombre}</p>
                  {f.tipo ? <p className="text-2xs text-slate-500 mt-0.5 capitalize">{f.tipo}</p> : null}
                </div>
                <NivelBadge color={f.meta.color} icono={f.meta.icono} label={f.meta.label} />
              </div>

              <p className="text-xs text-slate-400">{f.meta.resumen}</p>

              {/* EPI requerido (solo el que el catálogo menciona explícitamente) */}
              {f.epi.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <p className="text-2xs uppercase font-bold text-slate-500 tracking-wide flex items-center gap-1.5">
                    <HardHat size={13} className="text-sky-400" /> Protección requerida
                  </p>
                  <ul className="flex flex-wrap gap-1.5">
                    {f.epi.map((e) => (
                      <li key={e.id} className="text-2xs font-semibold bg-sky-950/50 border border-sky-700/50 text-sky-200 rounded-full px-2 py-0.5">
                        {e.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : f.nivel !== 'sin_dato' ? (
                <p className="text-2xs text-slate-500 flex items-center gap-1.5">
                  <HardHat size={13} /> Higiene básica: guantes y lavado de manos.
                </p>
              ) : null}

              {/* Restricción legal citable (ICA) */}
              {f.restriccion_legal ? (
                <div className="bg-red-950/40 border border-red-800/50 rounded-lg p-2.5 flex gap-2 text-xs text-red-200">
                  <Scale size={15} className="shrink-0 mt-0.5 text-red-400" />
                  <span><span className="font-bold">Restricción legal:</span> {f.restriccion_legal}</span>
                </div>
              ) : null}

              {/* Precaución / toxicología textual real del catálogo */}
              {f.precaucion ? (
                <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg p-2.5 flex gap-2 text-xs text-amber-200">
                  <AlertTriangle size={15} className={`shrink-0 mt-0.5 ${NIVEL_DOT[f.meta.color]}`} />
                  <span><span className="font-bold">Precaución:</span> {f.precaucion}</span>
                </div>
              ) : (
                <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-2.5 flex gap-2 text-xs text-slate-300">
                  <HelpCircle size={15} className="shrink-0 mt-0.5 text-slate-400" />
                  <span>Sin advertencia toxicológica en el catálogo. Manéjelo con precaución y consulte a un técnico.</span>
                </div>
              )}

              {/* Dosis segura (del catálogo) */}
              {f.dosis ? (
                <p className="text-xs text-slate-300">
                  <span aria-hidden="true">🥄 </span>
                  <span className="font-bold">Dosis segura:</span> {f.dosis}
                </p>
              ) : null}

              {/* Trazabilidad */}
              {f.fuente ? <p className="text-2xs text-slate-500">Fuente: {f.fuente}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ════════════════════════ PARTE B — SUELO ════════════════════════ */
function ToxSuelo() {
  const [paso, setPaso] = useState('cuestionario'); // cuestionario | resultado
  const [respuestas, setRespuestas] = useState(() => new Set());

  const toggle = useCallback((id) => {
    setRespuestas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const resultado = useMemo(() => evaluarRiesgoSuelo(respuestas), [respuestas]);

  const reiniciar = useCallback(() => {
    setRespuestas(new Set());
    setPaso('cuestionario');
  }, []);

  if (paso === 'resultado') {
    const { nivel, contaminantes, medidas } = resultado;
    return (
      <div className="flex flex-col gap-4">
        {/* Nivel cualitativo */}
        <div className={`rounded-xl p-4 flex gap-3 border ${NIVEL_BOX[nivel.color]}`}>
          <span className="text-3xl shrink-0" aria-hidden="true">{nivel.icono}</span>
          <div className="text-sm">
            <p className="font-bold text-base">{nivel.label}</p>
            <p className="mt-1 opacity-90">{nivel.resumen}</p>
          </div>
        </div>

        {/* Contaminantes a vigilar */}
        {contaminantes.length > 0 ? (
          <div>
            <p className="text-2xs uppercase font-bold text-slate-500 tracking-wide mb-1.5">Qué vigilar</p>
            <ul className="flex flex-wrap gap-1.5">
              {contaminantes.map((c) => (
                <li key={c} className="text-2xs font-semibold bg-slate-800 border border-slate-700 text-slate-200 rounded-full px-2 py-0.5">
                  {CONTAMINANTE_LABEL[c] || c}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Recomendación de laboratorio */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex gap-2.5 text-sm text-slate-200">
          <Microscope size={18} className="shrink-0 mt-0.5 text-sky-400" />
          <div>
            <p className="font-bold text-slate-100">Laboratorio</p>
            <p className="mt-1 text-slate-300">{nivel.recomendacion_lab}</p>
          </div>
        </div>

        {/* Medidas agroecológicas */}
        {medidas.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            <p className="text-2xs uppercase font-bold text-slate-500 tracking-wide">Medidas agroecológicas</p>
            <ul className="flex flex-col gap-2.5">
              {medidas.map((m) => (
                <li key={m.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex gap-2.5">
                  <span className="text-xl shrink-0" aria-hidden="true">{m.icono}</span>
                  <div className="text-sm">
                    <p className="font-bold text-slate-100">{m.titulo}</p>
                    <p className="mt-1 text-slate-300 text-xs">{m.detalle}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Conexión con la cromatografía */}
        <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-3 flex gap-2.5 text-sm text-emerald-100">
          <Sprout size={18} className="shrink-0 mt-0.5 text-emerald-400" />
          <span>
            <span className="font-bold">Recuerde:</span> la cromatografía le muestra la VIDA de su
            suelo (microbiología, materia orgánica). Esta evaluación le alerta de los TÓXICOS.
            Son complementarias: una sana, la otra protege.
          </span>
        </div>

        <button
          type="button"
          onClick={reiniciar}
          className="min-h-[44px] rounded-xl text-sm font-bold text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-600 flex items-center justify-center gap-2"
        >
          <RotateCcw size={16} /> Empezar de nuevo
        </button>

        <p className="text-2xs text-slate-500">{FUENTES_TOX_SUELO.nota_limites}</p>
        <p className="text-2xs text-slate-600">Referencias: {FUENTES_TOX_SUELO.referencias.join(' · ')}</p>
      </div>
    );
  }

  // Paso cuestionario
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex gap-2.5 text-sm text-slate-300">
        <Info size={18} className="shrink-0 mt-0.5 text-sky-400" />
        <span>
          Los tóxicos del suelo (metales pesados, plaguicidas) NO se miden sin laboratorio.
          Responda estas preguntas y le diremos qué tan probable es que haya un problema, y qué hacer.
        </span>
      </div>

      <ul className="flex flex-col gap-2.5">
        {PREGUNTAS_RIESGO_SUELO.map((q) => {
          const activo = respuestas.has(q.id);
          return (
            <li key={q.id}>
              <button
                type="button"
                onClick={() => toggle(q.id)}
                aria-pressed={activo}
                className={`w-full text-left rounded-xl border p-3 flex gap-2.5 transition-colors motion-reduce:transition-none ${
                  activo
                    ? 'bg-amber-950/40 border-amber-600 text-amber-100'
                    : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-600'
                }`}
              >
                <span className="text-2xl shrink-0" aria-hidden="true">{q.icono}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold leading-snug">{q.texto}</span>
                  <span className="block text-2xs text-slate-400 mt-1">{q.por_que}</span>
                </span>
                <span className="shrink-0 self-center" aria-hidden="true">
                  {activo
                    ? <CheckCircle2 size={20} className="text-amber-400" />
                    : <span className="block w-5 h-5 rounded-full border-2 border-slate-600" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => setPaso('resultado')}
        className="min-h-[52px] rounded-xl font-bold text-base flex items-center justify-center gap-2 text-white"
        style={{ backgroundColor: 'rgb(var(--t-accent-rgb))' }}
      >
        <ShieldCheck size={18} /> Ver mi nivel de riesgo
      </button>
      <p className="text-2xs text-slate-500">
        Marca solo lo que aplica a tu lote. Si no marcas nada, el riesgo sale bajo.
      </p>
    </div>
  );
}

/* ════════════════════════ Pantalla contenedora ════════════════════════ */
export default function ToxicologiaScreen({ onBack, initialTab = 'insumos' }) {
  const [tab, setTab] = useState(initialTab === 'suelo' ? 'suelo' : 'insumos');

  return (
    <div className="min-h-[100dvh] text-white">
      <header className="flex items-center gap-2 px-4 pt-[calc(14px+env(safe-area-inset-top))] pb-2">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver"
            className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center shrink-0"
          >
            <ChevronLeft size={20} />
          </button>
        ) : null}
        <div className="flex items-center gap-2">
          <Skull size={22} className="text-amber-400 shrink-0" aria-hidden="true" />
          <div>
            <h1 className="text-lg font-bold leading-tight text-white">Toxicología</h1>
            <p className="text-xs text-slate-400 leading-tight">Insumos seguros y tóxicos del suelo.</p>
          </div>
        </div>
      </header>

      {/* Pestañas */}
      <div className="px-4 pt-1">
        <div role="tablist" aria-label="Toxicología" className="flex gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'insumos'}
            onClick={() => setTab('insumos')}
            className={`flex-1 min-h-[44px] rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition-colors ${
              tab === 'insumos' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <FlaskConical size={16} /> Insumos
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'suelo'}
            onClick={() => setTab('suelo')}
            className={`flex-1 min-h-[44px] rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition-colors ${
              tab === 'suelo' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Sprout size={16} /> Suelo
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 pb-12">
        {tab === 'insumos' ? <ToxInsumos /> : <ToxSuelo />}
      </div>
    </div>
  );
}
