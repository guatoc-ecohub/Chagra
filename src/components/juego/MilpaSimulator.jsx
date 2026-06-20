/*
 * i18n: este subjuego se sirve solo en español Colombia (tú/usted). El nombre
 * "La Milpa" y los textos para niños conviven en el componente; la migración a
 * messages.js (ADR-050) está fuera de alcance de esta PR.
 */
import { useCallback, useMemo, useState } from 'react';
import { ScreenShell } from '../common/ScreenShell';
import { Sprout, RotateCcw, Volume2, VolumeX, Sparkles, Trophy, Target, Leaf } from 'lucide-react';

import {
  CULTIVOS_INFO,
  CULTIVO_POR_ID,
  RELACIONES,
  CIFRAS_SISTEMAS,
  NUM_PARCELAS,
  NUM_TEMPORADAS,
  LOGROS,
} from './milpaData';
import {
  crearParcela,
  crearJuego,
  sembrarEnParcela,
  esAsociacionCompleta,
  diversidadParcela,
  saludParcela,
  nitrogenoFijado,
  coberturaSuelo,
  sombraParcela,
  controlPlaga,
  haySoporteFisico,
  identificarAsociacion,
  aplicarEvento,
  resumenFinca,
  EVENTOS,
  SALUD_MAX,
  ASOCIACIONES,
  avanzarTemporada,
  verificarLogros,
} from '../../services/milpaGameEngine';
import { agentSounds, isSoundEnabled, setSoundEnabled } from '../../services/agentSoundService';
import { speak, stop as stopSpeak, isSupported as ttsSupported } from '../../services/ttsService';

import './milpa.css';

/** Acentos por color de cultivo (estética Chagra). */
const ACENTO = {
  amber: 'bg-amber-400 text-amber-950 ring-amber-300',
  emerald: 'bg-emerald-400 text-emerald-950 ring-emerald-300',
  orange: 'bg-orange-400 text-orange-950 ring-orange-300',
  brown: 'bg-amber-600 text-amber-950 ring-amber-500',
  green: 'bg-green-400 text-green-950 ring-green-300',
  yellow: 'bg-yellow-400 text-yellow-950 ring-yellow-300',
  rose: 'bg-rose-400 text-rose-950 ring-rose-300',
  lime: 'bg-lime-400 text-lime-950 ring-lime-300',
  purple: 'bg-purple-400 text-purple-950 ring-purple-300',
};

/** Color de la barra de salud según el valor (rojo → ámbar → verde). */
function colorSalud(salud) {
  if (salud >= 80) return 'from-emerald-500 via-lime-400 to-emerald-400';
  if (salud >= 60) return 'from-lime-500 to-yellow-400';
  if (salud >= 40) return 'from-amber-500 to-orange-400';
  return 'from-rose-500 to-red-400';
}

/** Tarjeta de una parcela con sus cultivos sembrados y su salud. */
function ParcelaCard({ parcela, salud, seleccionada, onSelect, mostrarTipo }) {
  const d = diversidadParcela(parcela);
  const tipoAsoc = identificarAsociacion(parcela);
  const asocInfo = tipoAsoc ? ASOCIACIONES[tipoAsoc.toUpperCase()] : null;
  const cultivos = parcela.cultivos
    .map((id) => CULTIVO_POR_ID[id])
    .filter(Boolean);

  return (
    <button
      type="button"
      data-testid={`milpa-parcela-${parcela.id}`}
      onClick={() => onSelect(parcela.id)}
      aria-pressed={seleccionada}
      aria-label={`Parcela ${parcela.id}, ${d} cultivos`}
      className={[
        'relative flex min-h-[120px] flex-col items-center justify-center gap-1 rounded-3xl border-2 p-3 transition active:scale-[0.98]',
        seleccionada
          ? 'border-lime-300 bg-emerald-800/60 ring-2 ring-lime-300'
          : 'border-emerald-800/50 bg-emerald-950/40 hover:border-emerald-600/60',
      ].join(' ')}
    >
      {asocInfo && (
        <span className="milpa-badge-pop absolute -top-2 -right-2 rounded-full bg-lime-400 px-2 py-0.5 text-[10px] font-black text-emerald-950 shadow">
          {asocInfo.icono}
        </span>
      )}
      {d === 0 ? (
        <span className="text-3xl opacity-40" aria-hidden="true">🟫</span>
      ) : (
        <span className="flex gap-0.5 text-3xl" aria-hidden="true">
          {cultivos.map((c) => (
            <span key={c.id} className="milpa-brota">{c.emoji}</span>
          ))}
        </span>
      )}
      <span className="text-[11px] font-bold text-emerald-200">
        {d === 0 ? 'Tierra lista' : tipoAsoc ? asocInfo.nombre : `${d} cultivos`}
      </span>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-900/60">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${colorSalud(salud)} transition-all duration-500`}
          style={{ width: `${Math.max(salud, d > 0 ? 6 : 0)}%` }}
        />
      </div>
      {mostrarTipo && tipoAsoc && (
        <span className="mt-1 text-[9px] font-bold text-lime-300">
          {asocInfo.nombre}
        </span>
      )}
    </button>
  );
}

/** Botón para sembrar/quitar un cultivo en la parcela activa. */
function CultivoButton({ cultivo, activo, onToggle, deshabilitado }) {
  return (
    <button
      type="button"
      data-testid={`milpa-sembrar-${cultivo.id}`}
      onClick={() => onToggle(cultivo.id)}
      aria-pressed={activo}
      disabled={deshabilitado}
      className={[
        'flex min-h-[72px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 ring-2 transition active:scale-95',
        activo ? ACENTO[cultivo.color] : 'bg-emerald-950/50 text-emerald-200 ring-emerald-800/50 hover:bg-emerald-900/60',
        deshabilitado ? 'opacity-40 cursor-not-allowed' : '',
      ].join(' ')}
    >
      <span className="text-2xl" aria-hidden="true">{cultivo.emoji}</span>
      <span className="text-[11px] font-black leading-tight">{cultivo.nombre}</span>
      {activo && (
        <span className="text-[9px] font-bold text-emerald-900/60">✓</span>
      )}
    </button>
  );
}

/**
 * MilpaSimulator — el subjuego JUGABLE de asociaciones agroecológicas.
 *
 * Flujo en fases múltiples, mobile-first y táctil:
 *   1. SELECCIÓN: el jugador elige qué tipo de asociación quiere practicar.
 *   2. SIEMBRA: toca parcelas y siembra cultivos. Ve en vivo cómo la salud
 *      sube al asociar (fijación de N, soporte, cobertura, sombra).
 *   3. TEMPORADA: llega un evento real (sequía, plaga, etc.) y golpea. La
 *      diversidad amortigua (resiliencia real).
 *   4. RESULTADO: compara rendimiento vs monocultivo con cifras reales.
 *   5. TEMPORADAS MÚLTIPLES: repite el ciclo y acumula logros.
 *
 * Lógica pura en milpaGameEngine; aquí solo se orquesta la UI. Offline-safe:
 * sin red, sin canvas pesado, rinde en gama baja. Estética Chagra.
 *
 * @param {Object} props
 * @param {Function} [props.onBack]
 * @param {Function} [props.onHome]
 */
export default function MilpaSimulator({ onBack, onHome }) {
  const [juego, setJuego] = useState(() => crearJuego(NUM_PARCELAS, NUM_TEMPORADAS));
  const [parcelas, setParcelas] = useState(() => juego.parcelas);
  const [activa, setActiva] = useState('1');
  const [fase, setFase] = useState('seleccion'); // 'seleccion' | 'siembra' | 'temporada' | 'resultado' | 'final'
  const [evento, setEvento] = useState(null);
  const [danos, setDanos] = useState(null);
  const [logros, setLogros] = useState([]);
  const [audioOn, setAudioOn] = useState(() => isSoundEnabled());

  const parcelaActiva = useMemo(
    () => parcelas.find((p) => p.id === activa) || parcelas[0],
    [parcelas, activa],
  );

  // Salud de cada parcela: en fase resultado usa la salud tras el evento.
  const saludDe = useCallback(
    (parcela) => {
      if (danos && danos[parcela.id]) return danos[parcela.id].saludDespues;
      return saludParcela(parcela);
    },
    [danos],
  );

  const resumen = useMemo(() => resumenFinca(parcelas), [parcelas]);
  const algunaSembrada = resumen.parcelasSembradas > 0;

  const hablar = useCallback(
    (texto) => {
      if (!audioOn || !texto) return;
      try {
        if (ttsSupported()) speak(texto, { rate: 0.95, pitch: 1.05 });
      } catch { /* TTS no disponible: el juego sigue sin audio */ }
    },
    [audioOn],
  );

  const toggleAudio = useCallback(() => {
    const next = !audioOn;
    setAudioOn(next);
    setSoundEnabled(next);
    if (!next) {
      try { stopSpeak(); } catch { /* noop */ }
    }
  }, [audioOn]);

  const toggleCultivo = useCallback(
    (cultivoId) => {
      setParcelas((prev) =>
        prev.map((p) => (p.id === activa ? sembrarEnParcela(p, cultivoId) : p)),
      );
      try { agentSounds.listen(); } catch { /* noop */ }
    },
    [activa],
  );

  const seleccionarParcela = useCallback((id) => {
    setActiva(id);
    try { agentSounds.start(); } catch { /* noop */ }
  }, []);

  const iniciarTemporada = useCallback(() => {
    const indice = resumen.parcelasSembradas % EVENTOS.length;
    const ev = EVENTOS[indice];
    const nuevosDanos = {};
    parcelas.forEach((p) => {
      if (diversidadParcela(p) > 0) {
        nuevosDanos[p.id] = aplicarEvento(p, ev);
      }
    });
    setEvento(ev);
    setDanos(nuevosDanos);
    setFase('temporada');
    try { agentSounds.start(); } catch { /* noop */ }
    hablar(`Llegó ${ev.nombre}. ${ev.relacion}`);
  }, [parcelas, resumen.parcelasSembradas, hablar]);

  const verResultado = useCallback(() => {
    setFase('resultado');
    try { agentSounds.chime(); } catch { /* noop */ }
    const msg = resumen.ventajaPct > 0
      ? `Rendiste ${resumen.ventajaPct} por ciento más que el monocultivo.`
      : 'Asocia cultivos y verás cómo rinde mejor.';
    hablar(msg);

    // Verificar logros nuevos
    const juegoConResumen = {
      ...juego,
      parcelas,
      historicoTemporadas: [...juego.historicoTemporadas, { numero: juego.temporadaActual, resumen }],
    };
    const nuevosLogros = verificarLogros(juegoConResumen);
    if (nuevosLogros.length > 0) {
      setLogros((prev) => [...prev, ...nuevosLogros]);
      setTimeout(() => {
        try { agentSounds.chime(); } catch { /* noop */ }
      }, 500);
    }
  }, [resumen.ventajaPct, hablar, juego, parcelas]);

  const avanzar = useCallback(() => {
    const { juego: juegoActualizado, continua } = avanzarTemporada(juego);
    if (continua) {
      setJuego(juegoActualizado);
      setParcelas(juegoActualizado.parcelas);
      setActiva('1');
      setFase('siembra');
      setEvento(null);
      setDanos(null);
      try { agentSounds.start(); } catch { /* noop */ }
      hablar(`Temporada ${juegoActualizado.temporadaActual}. Siembra de nuevo.`);
    } else {
      setFase('final');
      try { agentSounds.chime(); } catch { /* noop */ }
      hablar('¡Completaste todas las temporadas. Muy bien.');
    }
  }, [juego, hablar]);

  const reiniciar = useCallback(() => {
    const nuevoJuego = crearJuego(NUM_PARCELAS, NUM_TEMPORADAS);
    setJuego(nuevoJuego);
    setParcelas(nuevoJuego.parcelas);
    setActiva('1');
    setFase('seleccion');
    setEvento(null);
    setDanos(null);
    setLogros([]);
    try { agentSounds.listen(); } catch { /* noop */ }
  }, []);

  // Cultivos disponibles filtrados por fase de selección
  const cultivosDisponibles = useMemo(() => {
    if (fase === 'seleccion') {
      // Mostrar cultivos de todas las asociaciones
      return CULTIVOS_INFO;
    }
    // En fase de siembra, mostrar todos los cultivos
    return CULTIVOS_INFO;
  }, [fase]);

  return (
    <ScreenShell
      title="Asociaciones"
      icon={Sprout}
      onBack={onBack}
      onHome={onHome}
      actions={
        <button
          type="button"
          onClick={toggleAudio}
          aria-pressed={audioOn}
          aria-label={audioOn ? 'Apagar el sonido' : 'Encender el sonido'}
          className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-700/60 text-white hover:bg-emerald-600/60 active:scale-95 transition"
        >
          {audioOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      }
    >
      <div
        data-testid="milpa-simulator"
        className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-12 pt-3"
      >
        {/* Indicador de temporada */}
        {juego.temporadaActual > 0 && fase !== 'final' && (
          <div className="flex items-center justify-between rounded-2xl bg-emerald-900/60 px-4 py-2">
            <span className="text-sm font-bold text-emerald-200">
              Temporada {juego.temporadaActual} de {NUM_TEMPORADAS}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: NUM_TEMPORADAS }, (_, i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full ${
                    i < juego.temporadaActual ? 'bg-lime-400' : 'bg-emerald-800'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* FASE SELECCIÓN: intro y selección de sistema */}
        {fase === 'seleccion' && (
          <>
            <header className="rounded-3xl border border-lime-300/30 bg-gradient-to-br from-emerald-900/60 to-emerald-950/60 p-4 milpa-deslizar-arriba">
              <p className="text-xs font-black uppercase tracking-widest text-lime-300">
                Asociaciones agroecológicas
              </p>
              <h2 className="mt-1 text-2xl font-black leading-tight text-white">
                ¿Qué quieres sembrar hoy?
              </h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-emerald-100">
                Las plantas se ayudan cuando crecen juntas. Elige una asociación
                y descubre cómo rinde más que sembrar cada cultivo solo.
              </p>
            </header>

            <section className="grid grid-cols-1 gap-3">
              <h3 className="text-sm font-black text-emerald-200">Sistemas</h3>
              {Object.values(ASOCIACIONES).map((asoc) => (
                <button
                  key={asoc.id}
                  type="button"
                  onClick={() => {
                    setFase('siembra');
                    hablar(asoc.nombre);
                    try { agentSounds.start(); } catch { /* noop */ }
                  }}
                  className="flex items-center gap-3 rounded-2xl border border-emerald-800/50 bg-emerald-950/40 p-4 text-left transition hover:border-emerald-600/60 active:scale-[0.98]"
                >
                  <span className="text-3xl" aria-hidden="true">{asoc.icono}</span>
                  <div className="flex-1">
                    <p className="text-sm font-black text-white">{asoc.nombre}</p>
                    <p className="text-xs text-emerald-300">
                      {asoc.cultivos.length} cultivos que se ayudan
                    </p>
                  </div>
                  <span className="text-lime-300">→</span>
                </button>
              ))}
            </section>
          </>
        )}

        {/* Tablero de parcelas */}
        {fase !== 'seleccion' && fase !== 'final' && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-black text-emerald-200">Tu finca</h3>
              <span className="text-xs font-bold text-emerald-300">
                {resumen.asociacionesCompletas} asociación(es) completa(s)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3" data-testid="milpa-tablero">
              {parcelas.map((p) => (
                <ParcelaCard
                  key={p.id}
                  parcela={p}
                  salud={saludDe(p)}
                  seleccionada={p.id === activa && fase === 'siembra'}
                  onSelect={fase === 'siembra' ? seleccionarParcela : () => {}}
                  mostrarTipo={fase === 'resultado'}
                />
              ))}
            </div>
          </section>
        )}

        {/* FASE SIEMBRA: panel para sembrar en la parcela activa */}
        {fase === 'siembra' && (
          <section
            data-testid="milpa-panel-siembra"
            className="rounded-3xl border border-emerald-800/50 bg-emerald-950/40 p-4 milpa-fade-in"
          >
            <p className="mb-2 text-sm font-bold text-emerald-100">
              Parcela {activa}: toca los cultivos para sembrarlos o quitarlos.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {cultivosDisponibles.map((c) => (
                <CultivoButton
                  key={c.id}
                  cultivo={c}
                  activo={parcelaActiva.cultivos.includes(c.id)}
                  onToggle={toggleCultivo}
                />
              ))}
            </div>

            {/* Sinergias activas en VIVO */}
            <div className="mt-3 flex flex-col gap-1.5" data-testid="milpa-sinergias">
              <SinergiaLinea
                ok={haySoporteFisico(parcelaActiva)}
                texto="Soporte físico entre cultivos 🌿"
              />
              <SinergiaLinea
                ok={nitrogenoFijado(parcelaActiva) > 0}
                texto={`Fijación de nitrógeno (${nitrogenoFijado(parcelaActiva)}%) 💧`}
              />
              <SinergiaLinea
                ok={coberturaSuelo(parcelaActiva) > 0}
                texto={`Cobertura del suelo (−${coberturaSuelo(parcelaActiva)}% maleza) 🌿`}
              />
              <SinergiaLinea
                ok={sombraParcela(parcelaActiva) > 0}
                texto={`Sombra (${sombraParcela(parcelaActiva)}% buffer climático) 🌳`}
              />
              <SinergiaLinea
                ok={controlPlaga(parcelaActiva) > 0}
                texto={`Control de plagas (${controlPlaga(parcelaActiva)}%) 🛡️`}
              />
            </div>

            <p className="mt-3 rounded-2xl bg-emerald-900/50 p-3 text-center text-sm font-black text-lime-200">
              Salud de la parcela: {saludParcela(parcelaActiva)} / {SALUD_MAX}
            </p>

            <button
              type="button"
              data-testid="milpa-iniciar-temporada"
              disabled={!algunaSembrada}
              onClick={iniciarTemporada}
              className="mt-3 min-h-[56px] w-full rounded-2xl bg-lime-400 text-lg font-black text-emerald-950 shadow-lg transition hover:bg-lime-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              ▶️ Empezar la temporada
            </button>
          </section>
        )}

        {/* FASE TEMPORADA: el evento golpea */}
        {fase === 'temporada' && evento && (
          <section
            data-testid="milpa-panel-evento"
            className="rounded-3xl border-2 border-amber-400/50 bg-gradient-to-br from-amber-900/40 to-emerald-950/60 p-4 text-center milpa-shake"
          >
            <div className="text-5xl" aria-hidden="true">{evento.emoji}</div>
            <h3 className="mt-1 text-xl font-black text-white">¡Llegó {evento.nombre}!</h3>
            <p className="mt-2 text-sm font-medium text-amber-100">{evento.relacion}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {parcelas
                .filter((p) => diversidadParcela(p) > 0)
                .map((p) => {
                  const dato = danos?.[p.id];
                  const asoc = esAsociacionCompleta(p);
                  return (
                    <div
                      key={p.id}
                      className="rounded-2xl bg-emerald-950/50 p-2 text-left ring-1 ring-emerald-800/50"
                    >
                      <p className="text-[11px] font-bold text-emerald-200">
                        Parcela {p.id} {asoc ? '🛡️' : ''}
                      </p>
                      <p className="text-sm font-black text-white">
                        −{dato?.danoAplicado ?? 0} salud
                      </p>
                      <p className="text-[11px] text-emerald-300">
                        {asoc ? 'Resistió mejor' : 'Recibió más daño'}
                      </p>
                    </div>
                  );
                })}
            </div>
            <button
              type="button"
              data-testid="milpa-ver-resultado"
              onClick={verResultado}
              className="mt-4 min-h-[56px] w-full rounded-2xl bg-lime-400 text-lg font-black text-emerald-950 shadow-lg transition hover:bg-lime-300 active:scale-[0.98]"
            >
              Ver mi cosecha 🌾
            </button>
          </section>
        )}

        {/* FASE RESULTADO: comparación + lecciones */}
        {fase === 'resultado' && (
          <section
            data-testid="milpa-panel-resultado"
            className="flex flex-col gap-3 milpa-fade-in"
          >
            <div className="rounded-3xl border-2 border-lime-300/40 bg-gradient-to-br from-emerald-800/60 to-emerald-950/60 p-4 text-center">
              <div className="text-4xl" aria-hidden="true">🌾</div>
              <h3 className="mt-1 text-xl font-black text-white">Tu cosecha</h3>
              {resumen.ventajaPct > 0 ? (
                <p className="mt-2 text-base font-bold text-lime-200">
                  Tu asociación rindió{' '}
                  <span className="text-2xl font-black text-lime-300">+{resumen.ventajaPct}%</span>{' '}
                  más que el monocultivo.
                </p>
              ) : (
                <p className="mt-2 text-sm font-bold text-amber-200">
                  Asocia cultivos y verás cómo rinde más que el monocultivo.
                </p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <ResultadoCelda etiqueta="Asociación" valor={resumen.saludTotal} acento />
                <ResultadoCelda etiqueta="Monocultivo" valor={resumen.rendimientoMono} />
              </div>
            </div>

            {/* Indicadores reales */}
            <div className="grid grid-cols-2 gap-2" data-testid="milpa-indicadores">
              <IndicadorMini emoji="📏" valor={resumen.lerPromedio.toFixed(2)} etiqueta="LER" />
              <IndicadorMini emoji="💧" valor={`${resumen.nitrogenoPromedio}%`} etiqueta="N fijado" />
              <IndicadorMini emoji="🌿" valor={`−${resumen.coberturaPromedio}%`} etiqueta="Maleza" />
              <IndicadorMini emoji="🌳" valor={`${resumen.sombraPromedio}%`} etiqueta="Sombra" />
            </div>

            {/* Logros nuevos */}
            {logros.length > 0 && (
              <div className="rounded-3xl border border-lime-300/30 bg-gradient-to-br from-lime-900/40 to-emerald-950/60 p-4">
                <h4 className="mb-2 flex items-center gap-2 text-sm font-black text-white">
                  <Trophy size={16} className="text-lime-300" aria-hidden="true" />
                  ¡Logros desbloqueados!
                </h4>
                <div className="flex flex-col gap-2">
                  {logros.slice(-3).map((logroId) => {
                    const logro = LOGROS.find((l) => l.id === logroId);
                    if (!logro) return null;
                    return (
                      <div
                        key={logro.id}
                        className="flex items-center gap-2 rounded-xl bg-lime-400/20 p-2 milpa-resplandor"
                      >
                        <span className="text-2xl" aria-hidden="true">{logro.icono}</span>
                        <div>
                          <p className="text-xs font-black text-lime-200">{logro.nombre}</p>
                          <p className="text-[10px] text-lime-300/80">{logro.descripcion}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Lecciones del sistema */}
            <div className="rounded-3xl border border-emerald-800/50 bg-emerald-950/40 p-4">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-black text-white">
                <Sparkles size={16} className="text-lime-300" aria-hidden="true" />
                Lo que aprendiste
              </h4>
              <ul className="flex flex-col gap-2">
                {RELACIONES.map((r) => (
                  <li key={r.id} className="flex items-start gap-2 text-sm text-emerald-100">
                    <span className="text-lg" aria-hidden="true">{r.emoji}</span>
                    <span>
                      <strong className="text-white">{r.titulo}.</strong> {r.detalle}
                    </span>
                  </li>
                ))}
              </ul>
              <details className="mt-3 text-xs text-emerald-300/80">
                <summary className="cursor-pointer font-bold text-emerald-200">Fuente de las cifras</summary>
                <p className="mt-1 break-words leading-relaxed">{CIFRAS_SISTEMAS.fuente}</p>
              </details>
            </div>

            {/* Botón de siguiente temporada o terminar */}
            {juego.temporadaActual < NUM_TEMPORADAS ? (
              <button
                type="button"
                onClick={avanzar}
                className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-lime-400 text-lg font-black text-emerald-950 shadow-lg transition hover:bg-lime-300 active:scale-[0.98]"
              >
                Siguiente temporada →
              </button>
            ) : (
              <button
                type="button"
                onClick={avanzar}
                className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 text-lg font-black text-amber-950 shadow-lg transition hover:bg-amber-300 active:scale-[0.98]"
              >
                Ver resumen final 🏆
              </button>
            )}
          </section>
        )}

        {/* FASE FINAL: resumen del juego completo */}
        {fase === 'final' && (
          <section className="flex flex-col gap-3 milpa-escena-entrar">
            <div className="rounded-3xl border-2 border-amber-400/40 bg-gradient-to-br from-amber-900/60 to-emerald-950/60 p-6 text-center milpa-confeti">
              <div className="text-6xl" aria-hidden="true">🏆</div>
              <h2 className="mt-2 text-2xl font-black text-white">¡Completaste el ciclo!</h2>
              <p className="mt-2 text-base font-bold text-amber-200">
                {NUM_TEMPORADAS} temporadas cultivando agroecología
              </p>
            </div>

            {/* Resumen de logros */}
            <div className="rounded-3xl border border-emerald-800/50 bg-emerald-950/40 p-4">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-white">
                <Trophy size={16} className="text-lime-300" aria-hidden="true" />
                Tus logros ({logros.length})
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {logros.length > 0 ? (
                  logros.map((logroId) => {
                    const logro = LOGROS.find((l) => l.id === logroId);
                    if (!logro) return null;
                    return (
                      <div
                        key={logro.id}
                        className="flex items-center gap-2 rounded-xl bg-emerald-900/40 p-2"
                      >
                        <span className="text-xl" aria-hidden="true">{logro.icono}</span>
                        <div>
                          <p className="text-[11px] font-black text-emerald-200">{logro.nombre}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="col-span-2 text-sm text-emerald-400">
                    Sigue practicando para desbloquear logros
                  </p>
                )}
              </div>
            </div>

            {/* Mensaje final */}
            <div className="rounded-3xl border border-lime-300/30 bg-gradient-to-br from-emerald-800/60 to-emerald-950/60 p-4">
              <p className="text-sm font-medium leading-relaxed text-emerald-100">
                Las cifras de este juego son reales: las asociaciones agroecológicas
                usan mejor la tierra, fijan nitrógeno, controlan plagas y resisten
                mejor el clima. En la vida real, campesinos colombianos cultivan
                así para producir más y mejor. 🌿
              </p>
            </div>

            <button
              type="button"
              onClick={reiniciar}
              className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 text-lg font-black text-white shadow-lg transition hover:bg-emerald-600 active:scale-[0.98]"
            >
              <RotateCcw size={20} aria-hidden="true" />
              Jugar otra vez
            </button>
          </section>
        )}

        {/* Nota educacional */}
        {fase !== 'final' && (
          <p className="px-1 text-xs leading-relaxed text-slate-400">
            Las cifras de este juego son reales: basadas en la agroecología
            colombiana. Sembrar asociado usa mejor la tierra, ahorra abono y
            resiste mejor plagas y sequías. 🌿
          </p>
        )}
      </div>
    </ScreenShell>
  );
}

/** Línea de sinergia con check/cruz. */
function SinergiaLinea({ ok, texto }) {
  return (
    <p
      className={[
        'flex items-center gap-2 text-xs font-bold',
        ok ? 'text-lime-300' : 'text-emerald-400/40',
      ].join(' ')}
    >
      <span aria-hidden="true">{ok ? '✅' : '⬜'}</span>
      {texto}
    </p>
  );
}

/** Celda de comparación. */
function ResultadoCelda({ etiqueta, valor, acento }) {
  return (
    <div
      className={[
        'rounded-2xl p-3',
        acento ? 'bg-lime-400/20 ring-1 ring-lime-300/50' : 'bg-slate-800/60',
      ].join(' ')}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-200">{etiqueta}</p>
      <p className={`mt-0.5 text-2xl font-black ${acento ? 'text-lime-300' : 'text-slate-300'}`}>
        {valor}
      </p>
    </div>
  );
}

/** Indicador compacto. */
function IndicadorMini({ emoji, valor, etiqueta }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-emerald-950/40 p-2 text-center ring-1 ring-emerald-800/40">
      <span className="text-xl" aria-hidden="true">{emoji}</span>
      <span className="text-base font-black text-lime-200">{valor}</span>
      <span className="text-[10px] leading-tight text-emerald-300/80">{etiqueta}</span>
    </div>
  );
}
