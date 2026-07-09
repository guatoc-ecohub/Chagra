/* i18n (ADR-050): etiquetas user-facing en español Colombia pendientes de
 * migrar a src/config/messages.js. La regla chagra-i18n es soft (warn); se
 * desactiva a nivel de archivo para no bloquear el pre-commit con deuda
 * preexistente (mismo criterio que App.jsx). Los errores reales siguen activos. */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import { useCallback, useMemo, useState } from 'react';
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import {
  ChevronLeft, Mic, MicOff, AlertTriangle, CheckCircle2, XCircle,
  Clock3, Lock, RotateCcw, MessageCircle, Beaker, Skull,
} from 'lucide-react';
import SOIL_DATA from '../data/soil-diagnostics.json';
import { diagnosticarSuelo, guardarDiagnosticoSuelo } from '../services/soilDiagnostic';
import useVoiceRecorder from '../hooks/useVoiceRecorder';
import { transcribe } from '../services/voiceService';
import ContextTip from './ContextTip';

/**
 * SoilDiagnosticScreen — diagnóstico de suelo GUIADO sin laboratorio
 * (DR-SUELOS-1). Pensado para baja alfabetización: íconos concretos,
 * pasos numerados grandes, colores del tema y cero texto innecesario.
 *
 * Flujo: el campesino describe su tierra (voz/texto) o toca síntomas con
 * íconos → diagnosticarSuelo() detecta problemas → la UI sugiere la PRUEBA
 * CASERA apropiada (como_se_hace en pasos numerados, con su CONFIABILIDAD
 * visible) → el campesino reporta el resultado → enmienda con dosis y
 * PRECAUCIÓN del catálogo (cero invención, todo de soil-diagnostics.json).
 *
 * Anti-pseudociencia (inviolable):
 *   - Cada prueba muestra su confiabilidad (alta/media/baja) con puntos.
 *   - Las pruebas `mito` (vinagre/bicarbonato) SIEMPRE se muestran con el
 *     aviso "NO sirve para decidir, es un mito" — nunca como válidas.
 *   - Enmiendas dependientes de pH (cal, ceniza, roca fosfórica) quedan
 *     BLOQUEADAS hasta que la prueba confirme; guardas (NO sobre-encalar)
 *     visibles.
 */

/* ── Chips de síntomas (íconos UI; las frases vienen de senales_voz) ── */
const SENAL_CHIPS = [
  { key: 'se_empoza', icon: '💧', label: 'Se empoza el agua' },
  { key: 'dura_como_piedra', icon: '🪨', label: 'Dura como piedra' },
  { key: 'queda_barro', icon: '🥾', label: 'Queda puro barro' },
  { key: 'pura_greda_chiclosa', icon: '🧱', label: 'Pura greda chiclosa' },
  { key: 'tierra_amarilla_pegajosa', icon: '🟡', label: 'Amarilla y pegajosa' },
  { key: 'tierra_colorada', icon: '🟠', label: 'Tierra colorada' },
  { key: 'se_lava_cuando_llueve', icon: '🌧️', label: 'Se lava con la lluvia' },
  { key: 'no_amarra', icon: '🏖️', label: 'No amarra el agua' },
  { key: 'tierra_cansada_no_da', icon: '🥀', label: 'Cansada, ya no da' },
  { key: 'sale_helecho', icon: '🌿', label: 'Sale helecho marranero' },
  { key: 'lama_musgo', icon: '🟢', label: 'Le sale lama o musgo' },
  { key: 'negra_y_sueltica', icon: '✨', label: 'Negra y sueltica' },
];

const CULTIVO_CHIPS = [
  { key: 'cafe', icon: '☕', label: 'Café' },
  { key: 'maiz', icon: '🌽', label: 'Maíz' },
  { key: 'frijol', icon: '🫘', label: 'Fríjol' },
  { key: 'papa', icon: '🥔', label: 'Papa' },
  { key: 'aguacate', icon: '🥑', label: 'Aguacate' },
  { key: 'tomate', icon: '🍅', label: 'Tomate' },
];

const PRUEBA_ICON = {
  textura_frasco: '🫙', textura_cinta: '✋', ph_tiras: '🧪', ph_repollo: '🥬',
  vinagre_bicarbonato: '🚫', infiltracion_hoyo: '🕳️', varilla_penetracion: '📏',
  terron_agua: '💦', calicata_simple: '⛏️', test_mostaza: '🪱',
};

/* Confiabilidad → etiqueta honesta + puntos (3 = confiable, 0 = mito). */
const CONFIABILIDAD_META = {
  alta: { label: 'Confiable', dots: 3, text: 'text-emerald-300', dot: 'bg-emerald-400' },
  media_alta: { label: 'Confiable con cuidado', dots: 2, text: 'text-lime-300', dot: 'bg-lime-400' },
  media: { label: 'Orienta, no decide', dots: 2, text: 'text-amber-300', dot: 'bg-amber-400' },
  baja: { label: 'Solo da una pista', dots: 1, text: 'text-orange-300', dot: 'bg-orange-400' },
  mito: { label: 'MITO — NO sirve para decidir', dots: 0, text: 'text-red-300', dot: 'bg-red-500' },
};

const PROBLEMA_LABEL = {
  arcilla: 'Mucha arcilla', arcilla_pesada: 'Arcilla muy pesada',
  acidez: 'Tierra ácida', acidez_potencial: 'Posible acidez',
  acidez_posible: 'Posible acidez', acidez_leve: 'Acidez leve',
  mal_drenaje: 'Mal drenaje', encharcamiento: 'Encharcamiento',
  napa_alta: 'Agua muy cerca de la superficie', oxido_hierro: 'Óxido de hierro',
  baja_materia_organica: 'Poca materia orgánica', deficit_nutrientes: 'Faltan nutrientes',
  agotamiento: 'Tierra agotada', compactacion: 'Tierra compactada (apretada)',
  compactacion_fisica: 'Tierra compactada (apretada)',
  compactacion_encharcamiento: 'Compactada y encharcada',
  pedregosidad: 'Muchas piedras', erosion: 'La tierra se está yendo (erosión)',
  arenoso: 'Muy arenosa', baja_retencion: 'No guarda el agua',
  humedad_alta: 'Mucha humedad', degradacion: 'Tierra maltratada',
  deficit_fosforo_acido: 'Le falta fósforo', sodico: 'Suelo salado (sódico)',
  suelo_vivo: 'Suelo vivo y sano', fertilidad_nitrogeno: 'Buena fertilidad',
};
const problemaLabel = (p) => PROBLEMA_LABEL[p] || p.replace(/_/g, ' ');

/* Enmiendas que dependen de pH confirmado (guarda: solo si pH<5.5). */
const PH_GATED = new Set(['cal_dolomitica', 'ceniza_madera', 'roca_fosforica']);

const MITO_INDICADORES = SOIL_DATA.indicadores.filter((i) => i.confiabilidad === 'mito');

function ConfiabilidadBadge({ nivel }) {
  const meta = CONFIABILIDAD_META[nivel] || CONFIABILIDAD_META.media;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${meta.text}`}>
      <span className="inline-flex gap-0.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full ${i < meta.dots ? meta.dot : 'bg-slate-700'}`}
          />
        ))}
      </span>
      {meta.label}
    </span>
  );
}

/** Aviso rojo de mito — nunca presentar la prueba como válida. */
function MitoAviso({ detalle }) {
  return (
    <div className="bg-red-950/60 border border-red-700/60 rounded-xl p-3 flex gap-2.5">
      <span className="text-xl shrink-0" aria-hidden="true">🚫</span>
      <div className="text-sm text-red-200">
        <p className="font-bold">Esta prueba NO sirve para decidir, es un mito.</p>
        {detalle ? <p className="mt-1 text-red-200/90">{detalle}</p> : null}
      </div>
    </div>
  );
}

function AdvertenciaItem({ texto }) {
  const esMito = texto.startsWith('MITO');
  const esAlerta = texto.startsWith('ALERTA');
  const rojo = esMito || esAlerta;
  return (
    <li
      className={`flex gap-2.5 rounded-xl p-3 text-sm border ${
        rojo
          ? 'bg-red-950/60 border-red-700/60 text-red-200'
          : 'bg-amber-950/50 border-amber-700/50 text-amber-200'
      }`}
    >
      <AlertTriangle size={18} className={`shrink-0 mt-0.5 ${rojo ? 'text-red-400' : 'text-amber-400'}`} />
      <span>{texto}</span>
    </li>
  );
}

export default function SoilDiagnosticScreen({ onBack, onNavigate }) {
  // paso: sintomas → diagnostico → prueba → resultado
  const [paso, setPaso] = useState('sintomas');
  const [texto, setTexto] = useState('');
  const [chips, setChips] = useState(() => new Set());
  const [cultivo, setCultivo] = useState(null);
  const [diag, setDiag] = useState(null);
  const [pruebaId, setPruebaId] = useState(null);
  const [confirmacion, setConfirmacion] = useState(null); // confirmado | descartado | pendiente
  const [sinMatch, setSinMatch] = useState(false);
  const [recording, setRecording] = useState(false);
  const [vozError, setVozError] = useState('');
  const { start, stop, reset } = useVoiceRecorder();

  const toggleChip = useCallback((key) => {
    setChips((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const descripcion = useMemo(() => [
    texto.trim(),
    ...Array.from(chips).map((k) => k.replace(/_/g, ' ')),
    cultivo || '',
  ].filter(Boolean).join('. '), [texto, chips, cultivo]);

  const mirarTierra = useCallback(() => {
    if (!descripcion) return;
    const d = diagnosticarSuelo(descripcion);
    if (d.sin_datos) {
      setSinMatch(true);
      return;
    }
    setSinMatch(false);
    setDiag(d);
    // Persistir el diagnóstico REAL: el home (panel de vitalidad, eje 🪱)
    // lo lee con getDiagnosticoSueloGuardado — deja de decir "dato en camino".
    guardarDiagnosticoSuelo(d);
    setPaso('diagnostico');
  }, [descripcion]);

  const reiniciar = useCallback(() => {
    setPaso('sintomas');
    setTexto('');
    setChips(new Set());
    setCultivo(null);
    setDiag(null);
    setPruebaId(null);
    setConfirmacion(null);
    setSinMatch(false);
  }, []);

  // Voz: grabar → transcribir → agregar al texto. Degrada amable si falla.
  const toggleVoz = useCallback(async () => {
    setVozError('');
    if (!recording) {
      try {
        await start();
        setRecording(true);
      } catch (err) {
        setVozError(err?.message || 'No se pudo grabar. Escribe o toca los síntomas.');
      }
      return;
    }
    setRecording(false);
    try {
      const result = await stop();
      if (result?.blob?.size > 0) {
        const t = await transcribe(result.blob);
        if (t) setTexto((prev) => (prev ? `${prev}. ${t}` : t));
      }
    } catch {
      setVozError('No entendí el audio. Escribe o toca los síntomas.');
    } finally {
      reset();
    }
  }, [recording, start, stop, reset]);

  const pruebaActiva = useMemo(
    () => SOIL_DATA.indicadores.find((i) => i.id === pruebaId) || null,
    [pruebaId],
  );

  const problemasVisibles = useMemo(
    () => (diag ? diag.problemas.filter((p) => p !== 'ninguno') : []),
    [diag],
  );
  const tierraSana = diag && !diag.sin_datos
    && problemasVisibles.length === 0 && diag.advertencias.length === 0;
  // MITO/ALERTA se muestran de una en el diagnóstico; las GUARDA acompañan
  // a las enmiendas en el resultado.
  const avisosDiagnostico = useMemo(
    () => (diag ? diag.advertencias.filter((a) => !a.startsWith('GUARDA')) : []),
    [diag],
  );
  const guardas = useMemo(
    () => (diag ? diag.advertencias.filter((a) => a.startsWith('GUARDA')) : []),
    [diag],
  );

  const volverPaso = useCallback(() => {
    if (paso === 'resultado') { setConfirmacion(null); setPaso(pruebaId ? 'prueba' : 'diagnostico'); return; }
    if (paso === 'prueba') { setPruebaId(null); setPaso('diagnostico'); return; }
    if (paso === 'diagnostico') { setPaso('sintomas'); return; }
    onBack?.();
  }, [paso, pruebaId, onBack]);

  const Header = (
    <header className="flex items-center gap-2 px-4 pt-[calc(14px+env(safe-area-inset-top))] pb-2">
      <button
        type="button"
        onClick={volverPaso}
        aria-label="Volver"
        className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center shrink-0"
      >
        <ChevronLeft size={20} />
      </button>
      <div>
        <h1 className="text-lg font-bold leading-tight text-white">Mi suelo</h1>
        <p className="text-xs text-slate-400 leading-tight">Pruebas caseras honestas, sin laboratorio.</p>
      </div>
    </header>
  );

  /* ════════ Paso 1 — síntomas ════════ */
  if (paso === 'sintomas') {
    return (
      <div className="min-h-[100dvh] text-white">
        {Header}
        <div className="px-4 pb-10 flex flex-col gap-4">
          <p className="text-sm text-slate-300">
            <span aria-hidden="true">👇 </span>Toca lo que le pasa a tu tierra, o cuéntamelo con tu voz.
          </p>

          {/* Puente a Toxicología de suelo: este diagnóstico (y la cromatografía)
              miran la VIDA del suelo; la toxicología alerta de TÓXICOS. Son
              complementarias. Solo si App.jsx pasó onNavigate. */}
          {onNavigate ? (
            <button
              type="button"
              onClick={() => onNavigate('toxicologia', { tab: 'suelo' })}
              className="rounded-xl border border-amber-700/50 bg-amber-950/30 p-3 flex items-center gap-2.5 text-left hover:border-amber-600 transition-colors"
            >
              <Skull size={20} className="shrink-0 text-amber-400" />
              <span className="text-sm text-amber-100 flex-1">
                <span className="font-bold">¿Sospechas tóxicos en tu tierra?</span> Metales pesados,
                plaguicidas o salinidad. Evalúa el riesgo aquí.
              </span>
              <ChevronLeft size={18} className="shrink-0 text-amber-400 rotate-180" />
            </button>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            {SENAL_CHIPS.map((c) => {
              const activo = chips.has(c.key);
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => toggleChip(c.key)}
                  aria-pressed={activo}
                  className={`min-h-[56px] rounded-xl border p-2.5 flex items-center gap-2 text-left text-sm font-semibold transition-colors motion-reduce:transition-none ${
                    activo
                      ? 'border-transparent text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-600'
                  }`}
                  style={activo ? {
                    backgroundColor: 'rgb(var(--t-accent-rgb) / 0.25)',
                    boxShadow: 'inset 0 0 0 2px rgb(var(--t-accent-rgb))',
                  } : undefined}
                >
                  <span className="text-2xl shrink-0" aria-hidden="true">{c.icon}</span>
                  <span className="leading-tight">{c.label}</span>
                </button>
              );
            })}
          </div>

          <div>
            <p className="text-xs uppercase font-bold text-slate-400 tracking-wide mb-1.5">
              ¿Qué cultivo tienes o quieres ahí? <span className="normal-case font-normal">(opcional)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {CULTIVO_CHIPS.map((c) => {
                const activo = cultivo === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCultivo(activo ? null : c.key)}
                    aria-pressed={activo}
                    className={`min-h-[44px] px-3 rounded-full border flex items-center gap-1.5 text-sm font-semibold transition-colors motion-reduce:transition-none ${
                      activo ? 'border-transparent text-white' : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-600'
                    }`}
                    style={activo ? {
                      backgroundColor: 'rgb(var(--t-accent-rgb) / 0.25)',
                      boxShadow: 'inset 0 0 0 2px rgb(var(--t-accent-rgb))',
                    } : undefined}
                  >
                    <span aria-hidden="true">{c.icon}</span>{c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 items-stretch">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={2}
              aria-label="Describe tu tierra"
              placeholder="Cuéntame de tu tierra: ej. «cuando llueve se empoza el agua»"
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-slate-500"
            />
            <button
              type="button"
              onClick={toggleVoz}
              aria-label={recording ? 'Detener grabación' : 'Hablar'}
              className={`w-14 rounded-xl flex items-center justify-center shrink-0 ${
                recording
                  ? 'bg-red-700 animate-pulse motion-reduce:animate-none'
                  : 'bg-slate-800 hover:bg-slate-700'
              }`}
            >
              {recording ? <MicOff size={22} /> : <Mic size={22} />}
            </button>
          </div>
          {vozError ? <p className="text-xs text-amber-300">{vozError}</p> : null}

          {sinMatch ? (
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 flex gap-2.5 text-sm text-slate-200">
              <span className="text-xl shrink-0" aria-hidden="true">🤔</span>
              <p>
                No encontré señales claras — cuéntame más de tu tierra.
                Por ejemplo: «cuando llueve se empoza el agua» o «está dura como piedra».
                También puedes tocar los síntomas de arriba.
              </p>
            </div>
          ) : null}

          {onNavigate ? (
            <button
              type="button"
              onClick={() => onNavigate('cromatografia')}
              className="min-h-[48px] rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 flex items-center justify-center gap-2"
            >
              <Beaker size={16} /> Cromatografia de suelo (Pfeiffer)
            </button>
          ) : null}

          <button
            type="button"
            onClick={mirarTierra}
            disabled={!descripcion}
            className="min-h-[52px] rounded-xl font-bold text-base flex items-center justify-center gap-2 text-white disabled:opacity-40"
            style={{ backgroundColor: 'rgb(var(--t-accent-rgb))' }}
          >
            <span aria-hidden="true">🔍</span> Mirar mi tierra
          </button>
        </div>
      </div>
    );
  }

  /* ════════ Paso 2 — diagnóstico preliminar + pruebas sugeridas ════════ */
  if (paso === 'diagnostico') {
    return (
      <div className="min-h-[100dvh] text-white">
        {Header}
        <div className="px-4 pb-10 flex flex-col gap-4">
          {tierraSana ? (
            <div className="bg-emerald-950/60 border border-emerald-700/60 rounded-xl p-4 flex gap-3 text-emerald-200">
              <span className="text-2xl shrink-0" aria-hidden="true">🌱</span>
              <div className="text-sm">
                <p className="font-bold">¡Tu tierra se ve sana!</p>
                <p className="mt-1">Sigue cuidándola con materia orgánica y cobertura. No necesitas enmiendas por ahora.</p>
              </div>
            </div>
          ) : (
            <>
              <section>
                <h2 className="text-sm font-bold text-slate-200 mb-2">
                  <span aria-hidden="true">👀 </span>Esto veo en tu tierra
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {problemasVisibles.map((p) => (
                    <li key={p} className="bg-slate-900 border border-slate-700 rounded-full px-3 py-1.5 text-sm text-slate-100">
                      {problemaLabel(p)}
                    </li>
                  ))}
                </ul>
              </section>

              {diag.suelo ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm">
                  <p className="font-bold text-slate-100">
                    <span aria-hidden="true">🏔️ </span>{diag.suelo.nombre}
                  </p>
                  <p className="text-slate-300 mt-1">{diag.suelo.recomendacion}</p>
                </div>
              ) : null}

              {avisosDiagnostico.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {avisosDiagnostico.map((a) => <AdvertenciaItem key={a} texto={a} />)}
                </ul>
              ) : null}

              {diag.pruebas.length > 0 ? (
                <section>
                  {/* Tip de primera vez: cómo leer la confiabilidad (reusa la
                      semántica de CONFIABILIDAD_META, presentada en el momento
                      de uso — feat/onboarding-ayuda). */}
                  <ContextTip
                    id="diagnostico-confianza"
                    emoji="🟢"
                    title="Mire los puntos de confianza"
                    className="mb-3"
                  >
                    Tres puntos verdes = prueba confiable. Un punto = solo da una
                    pista. Si dice MITO, esa prueba no sirve para decidir.
                  </ContextTip>
                  <h2 className="text-sm font-bold text-slate-200 mb-2">
                    <span aria-hidden="true">🧰 </span>Confírmalo con esta prueba casera
                  </h2>
                  <ul className="flex flex-col gap-2">
                    {diag.pruebas.map((p) => (
                      <li key={p.id}>
          {onNavigate ? (
            <button
              type="button"
              onClick={() => onNavigate('cromatografia')}
              className="min-h-[48px] rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 flex items-center justify-center gap-2"
            >
              <Beaker size={16} /> Cromatografia de suelo (Pfeiffer)
            </button>
          ) : null}

          <button
                          type="button"
                          onClick={() => { setPruebaId(p.id); setPaso('prueba'); }}
                          className="w-full text-left bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl p-3 flex items-center gap-3"
                        >
                          <span className="text-3xl shrink-0" aria-hidden="true">{PRUEBA_ICON[p.id] || '🧰'}</span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-bold text-slate-100">{p.nombre}</span>
                            <ConfiabilidadBadge nivel={p.confiabilidad} />
                          </span>
                          <ChevronLeft size={18} className="text-slate-600 rotate-180 shrink-0" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {/* Honestidad: los mitos SIEMPRE visibles, nunca como prueba válida */}
              <section>
                <h2 className="text-sm font-bold text-red-300 mb-2">
                  <span aria-hidden="true">🚫 </span>Ojo: pruebas que NO sirven
                </h2>
                <ul className="flex flex-col gap-2">
                  {MITO_INDICADORES.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => { setPruebaId(m.id); setPaso('prueba'); }}
                        className="w-full text-left bg-red-950/40 border border-red-800/50 hover:border-red-600/60 rounded-xl p-3 flex items-center gap-3"
                      >
                        <span className="text-3xl shrink-0" aria-hidden="true">{PRUEBA_ICON[m.id] || '🚫'}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-bold text-red-100">{m.nombre}</span>
                          <span className="block text-xs text-red-300 font-bold">
                            NO sirve para decidir — es un mito. Toca para ver por qué.
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>

              {(diag.enmiendas.length > 0) ? (
                <button
                  type="button"
                  onClick={() => { setPruebaId(null); setConfirmacion('pendiente'); setPaso('resultado'); }}
                  className="min-h-[48px] rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-100"
                >
                  Ver recomendaciones (mejor haz la prueba primero)
                </button>
              ) : null}
            </>
          )}

          <button
            type="button"
            onClick={reiniciar}
            className="min-h-[44px] rounded-xl text-sm font-bold text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-600 flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} /> Empezar de nuevo
          </button>
          <p className="text-2xs text-slate-500">{diag.fuente}</p>
        </div>
      </div>
    );
  }

  /* ════════ Paso 3 — la prueba casera, paso a paso ════════ */
  if (paso === 'prueba' && pruebaActiva) {
    const esMito = pruebaActiva.confiabilidad === 'mito';
    return (
      <div className="min-h-[100dvh] text-white">
        {Header}
        <div className="px-4 pb-10 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl" aria-hidden="true">{PRUEBA_ICON[pruebaActiva.id] || '🧰'}</span>
            <div>
              <h2 className="text-base font-bold text-slate-100 leading-tight">{pruebaActiva.nombre}</h2>
              <p className="text-xs text-slate-400">{pruebaActiva.que_mide}</p>
              <ConfiabilidadBadge nivel={pruebaActiva.confiabilidad} />
            </div>
          </div>

          {esMito ? <MitoAviso detalle={pruebaActiva.advertencia} /> : null}

          <ol className={`flex flex-col gap-2.5 ${esMito ? 'opacity-50' : ''}`}>
            {pruebaActiva.como_se_hace.map((pasoTxt, i) => (
              <li key={pasoTxt} className="flex gap-3 items-start bg-slate-900 border border-slate-800 rounded-xl p-3">
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shrink-0"
                  style={{ backgroundColor: 'rgb(var(--t-accent-rgb))' }}
                >
                  {i + 1}
                </span>
                <span className="text-sm text-slate-200 pt-1">{pasoTxt}</span>
              </li>
            ))}
          </ol>

          {!esMito && pruebaActiva.advertencia ? (
            <ul><AdvertenciaItem texto={pruebaActiva.advertencia} /></ul>
          ) : null}

          {esMito ? (
            <button
              type="button"
              onClick={() => { setPruebaId(null); setPaso('diagnostico'); }}
              className="min-h-[52px] rounded-xl font-bold text-base text-white"
              style={{ backgroundColor: 'rgb(var(--t-accent-rgb))' }}
            >
              Entendido, usar una prueba que sí sirva
            </button>
          ) : (
            <section>
              <h3 className="text-sm font-bold text-slate-200 mb-2">¿Qué te dio la prueba?</h3>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => { setConfirmacion('confirmado'); setPaso('resultado'); }}
                  className="min-h-[52px] rounded-xl font-bold text-sm bg-emerald-900/60 border border-emerald-700/60 hover:border-emerald-500 text-emerald-100 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} /> Sí, se confirmó el problema
                </button>
                <button
                  type="button"
                  onClick={() => { setConfirmacion('descartado'); setPaso('resultado'); }}
                  className="min-h-[52px] rounded-xl font-bold text-sm bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-100 flex items-center justify-center gap-2"
                >
                  <XCircle size={18} /> No, salió bien
                </button>
                <button
                  type="button"
                  onClick={() => { setConfirmacion('pendiente'); setPaso('resultado'); }}
                  className="min-h-[44px] rounded-xl text-sm font-bold text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-600 flex items-center justify-center gap-2"
                >
                  <Clock3 size={16} /> Aún no he hecho la prueba
                </button>
              </div>
            </section>
          )}
          <p className="text-2xs text-slate-500">Fuente: {pruebaActiva.fuente}</p>
        </div>
      </div>
    );
  }

  /* ════════ Paso 4 — resultado: enmiendas con dosis + precaución ════════ */
  if (paso === 'resultado' && diag) {
    if (confirmacion === 'descartado') {
      return (
        <div className="min-h-[100dvh] text-white">
          {Header}
          <div className="px-4 pb-10 flex flex-col gap-4">
            <div className="bg-emerald-950/60 border border-emerald-700/60 rounded-xl p-4 flex gap-3 text-emerald-200">
              <span className="text-2xl shrink-0" aria-hidden="true">✅</span>
              <div className="text-sm">
                <p className="font-bold">¡Buena noticia! La prueba no confirmó el problema.</p>
                <p className="mt-1">
                  Por ahora no necesitas aplicar enmiendas para esto. Aplicar cal o
                  abonos «por si acaso» puede dañar la tierra.
                </p>
              </div>
            </div>
            {onNavigate ? (
              <button
                type="button"
                onClick={() => onNavigate('agente')}
                className="min-h-[48px] rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-100 flex items-center justify-center gap-2"
              >
                <MessageCircle size={16} /> Pregúntale a Chagra otra duda
              </button>
            ) : null}
            <button
              type="button"
              onClick={reiniciar}
              className="min-h-[44px] rounded-xl text-sm font-bold text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-600 flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} /> Empezar de nuevo
            </button>
          </div>
        </div>
      );
    }

    const pendiente = confirmacion !== 'confirmado';
    const hayBloqueadas = pendiente && diag.enmiendas.some((e) => PH_GATED.has(e.id));
    return (
      <div className="min-h-[100dvh] text-white">
        {Header}
        <div className="px-4 pb-10 flex flex-col gap-4">
          <h2 className="text-sm font-bold text-slate-200">
            <span aria-hidden="true">🌿 </span>Lo que tu tierra necesita
          </h2>

          {avisosDiagnostico.filter((a) => a.startsWith('ALERTA')).map((a) => (
            <ul key={a}><AdvertenciaItem texto={a} /></ul>
          ))}

          <ul className="flex flex-col gap-3">
            {diag.enmiendas.map((e) => {
              const bloqueada = pendiente && PH_GATED.has(e.id);
              return (
                <li key={e.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
                  <p className="text-sm font-bold text-slate-100">{e.nombre}</p>
                  <p className="text-xs text-slate-400">Para: {problemaLabel(e.problema_que_corrige)}</p>
                  {bloqueada ? (
                    <div className="bg-slate-800/80 border border-slate-600 rounded-lg p-3 flex gap-2.5 text-sm text-slate-200">
                      <Lock size={18} className="shrink-0 mt-0.5 text-slate-300" />
                      <span>
                        Primero haz la prueba de pH. Esta enmienda solo se aplica
                        con el pH confirmado — aplicarla a ciegas puede dañar tu tierra.
                      </span>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-slate-200">
                        <span aria-hidden="true">🥄 </span>
                        <span className="font-bold">Dosis:</span> {e.dosis_orientativa}
                      </p>
                      <div className="bg-amber-950/50 border border-amber-700/50 rounded-lg p-2.5 flex gap-2 text-sm text-amber-200">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-400" />
                        <span><span className="font-bold">Cuidado:</span> {e.precaucion}</span>
                      </div>
                      <p className="text-2xs text-slate-500">Fuente: {e.fuente}</p>
                    </>
                  )}
                </li>
              );
            })}
          </ul>

          {hayBloqueadas && guardas.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {guardas.map((g) => <AdvertenciaItem key={g} texto={g} />)}
            </ul>
          ) : null}

          {onNavigate ? (
            <button
              type="button"
              onClick={() => onNavigate('agente')}
              className="min-h-[48px] rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-100 flex items-center justify-center gap-2"
            >
              <MessageCircle size={16} /> Pregúntale a Chagra sobre tu suelo
            </button>
          ) : null}
          <button
            type="button"
            onClick={reiniciar}
            className="min-h-[44px] rounded-xl text-sm font-bold text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-600 flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} /> Empezar de nuevo
          </button>
          <p className="text-2xs text-slate-500">{diag.fuente}</p>
        </div>
      </div>
    );
  }

  // Estado imposible → degradar al inicio, nunca crash.
  return (
    <div className="min-h-[100dvh] text-white">
      {Header}
      <div className="px-4 py-8 flex flex-col items-center gap-3">
        <p className="text-sm text-slate-300">Volvamos a empezar con tu tierra.</p>
        <button
          type="button"
          onClick={reiniciar}
          className="min-h-[44px] px-5 rounded-xl text-sm font-bold bg-slate-800 hover:bg-slate-700 flex items-center gap-2"
        >
          <RotateCcw size={16} /> Empezar de nuevo
        </button>
      </div>
    </div>
  );
}
