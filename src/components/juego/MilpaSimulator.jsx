/*
 * i18n: este subjuego se sirve solo en español Colombia (tú/usted). El nombre
 * "La Milpa" y los textos para niños conviven en el componente; la migración a
 * messages.js (ADR-050) está fuera de alcance de esta PR.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScreenShell } from '../common/ScreenShell';
import { Sprout, RotateCcw, Volume2, VolumeX, Sparkles, Trophy, Target } from 'lucide-react';

import {
  CULTIVOS_INFO,
  CULTIVO_POR_ID,
  CULTIVO_NARRATIVAS,
  OCUPACION_CULTIVO,
  RELACIONES,
  CIFRAS_SISTEMAS,
  NUM_PARCELAS,
  NUM_TEMPORADAS,
  LOGROS,
  SLOTS_POR_PARCELA,
} from './milpaData';
import {
  crearJuego,
  sembrarEnParcela,
  espaciosUsadosParcela,
  cabeCultivoEnParcela,
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
  SALUD_MAX,
  ASOCIACIONES,
  avanzarTemporada,
  verificarLogros,
  describirAsociacionCompleta,
  elegirEventosPosibles,
  generarConsejo,
  verificarSuperoCampesinoVecino,
} from '../../services/milpaGameEngine';
import { agentSounds, isSoundEnabled, setSoundEnabled } from '../../services/agentSoundService';
import { speak, stop as stopSpeak, isSupported as ttsSupported } from '../../services/ttsService';
import { recordGameStart, recordGameComplete } from '../../services/usageTelemetryService';

// FUSIÓN MILPA (audit juegos 2026-07-16): "La milpa: las tres hermanas" (mockup
// SVG pulido, antes URL-only #/mockups/juego-la-milpa) se pliega DENTRO de este
// simulador como su "modo ilustrado". Una sola entrada en el hub → el simulador
// hondo (5 sistemas, LER/N/carbono) con un botón para el juego bonito de intro.
// No se reescribe ninguna mecánica: es cableado/composición.
import JuegoLaMilpa from '../../mockups/JuegoLaMilpa';

import { Crisopa } from '../../visual/creatures/Crisopa.jsx';
import { Trichogramma } from '../../visual/creatures/Trichogramma.jsx';
import { Sirfido } from '../../visual/creatures/Sirfido.jsx';

import './milpa.css';

/**
 * Los aliados naturales que llegan SOLOS cuando la finca tiene variedad: la
 * crisopa y el sírfido se comen los áfidos, la avispita Trichogramma parasita
 * los huevos de las plagas. Es control biológico REAL — un policultivo diverso
 * les da flores y refugio, y ellos hacen la vigilancia gratis. Puro visual y
 * educativo; no toca la mecánica del simulador.
 */
const ALIADOS_BIOLOGICOS = [
  { Criatura: Sirfido, nombre: 'Sírfido', hace: 'come áfidos y poliniza' },
  { Criatura: Crisopa, nombre: 'Crisopa', hace: 'caza mosca blanca y pulgón' },
  { Criatura: Trichogramma, nombre: 'Avispita', hace: 'ataca el huevo de la plaga' },
];

/** Tira de los aliados de control biológico que atrae el policultivo. */
function AliadosNaturales() {
  return (
    <div
      className="rounded-3xl border border-lime-300/25 bg-emerald-950/40 p-3 milpa-fade-in"
      data-testid="milpa-aliados-naturales"
    >
      <p className="mb-2 text-center text-[11px] font-black uppercase tracking-wide text-lime-300/90">
        Cuando hay variedad, llegan solos los aliados
      </p>
      <div className="flex items-start justify-around gap-2">
        {ALIADOS_BIOLOGICOS.map(({ Criatura, nombre, hace }) => (
          <div key={nombre} className="flex flex-1 flex-col items-center gap-1 text-center">
            <Criatura size={52} title={nombre} className="milpa-brota" />
            <span className="text-[11px] font-black text-emerald-100">{nombre}</span>
            <span className="text-[9px] leading-tight text-emerald-300/80">{hace}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  const espaciosUsados = espaciosUsadosParcela(parcela);
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
      <span className="text-[10px] font-black text-lime-200">
        {espaciosUsados}/{SLOTS_POR_PARCELA} espacios
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
  const ocupacion = OCUPACION_CULTIVO[cultivo.id] ?? 1;
  return (
    <button
      type="button"
      data-testid={`milpa-sembrar-${cultivo.id}`}
      onClick={() => onToggle(cultivo.id)}
      aria-pressed={activo}
      disabled={deshabilitado}
      title={deshabilitado ? `${cultivo.nombre} no cabe en esta parcela` : `${cultivo.nombre} usa ${ocupacion} espacio(s)`}
      className={[
        'flex min-h-[72px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 ring-2 transition active:scale-95',
        activo ? ACENTO[cultivo.color] : 'bg-emerald-950/50 text-emerald-200 ring-emerald-800/50 hover:bg-emerald-900/60',
        deshabilitado ? 'opacity-40 cursor-not-allowed' : '',
      ].join(' ')}
    >
      <span className="text-2xl" aria-hidden="true">{cultivo.emoji}</span>
      <span className="text-[11px] font-black leading-tight">{cultivo.nombre}</span>
      <span className="text-[9px] font-bold opacity-80">{ocupacion} espacio(s)</span>
      {activo && (
        <span className="text-[9px] font-bold text-emerald-900/60">✓</span>
      )}
      {deshabilitado && (
        <span className="text-[9px] font-black text-amber-200">No cabe</span>
      )}
    </button>
  );
}

/**
 * MilpaSimulator: el subjuego JUGABLE de asociaciones agroecológicas.
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
  const [fase, setFase] = useState('seleccion'); // 'seleccion' | 'siembra' | 'seleccion-evento' | 'temporada' | 'resultado' | 'final'
  const [evento, setEvento] = useState(null);
  const [danos, setDanos] = useState(null);
  const [logros, setLogros] = useState([]);
  const [audioOn, setAudioOn] = useState(() => isSoundEnabled());
  const [sistemaActivo, setSistemaActivo] = useState(null);
  const [avisoSiembra, setAvisoSiembra] = useState('');
  const [celebracion, setCelebracion] = useState('');
  const [eventosPosibles, setEventosPosibles] = useState([]);
  const [consejoVisible, setConsejoVisible] = useState({});
  const [resultadosTemporadas, setResultadosTemporadas] = useState([]);
  const [medallasObtenidas, setMedallasObtenidas] = useState([]);
  // Modo de vista de la Milpa fusionada: 'simulador' (hondo, por defecto) vs
  // 'ilustrado' (el mini-juego SVG "tres hermanas"). Una sola entrada, dos caras.
  const [modoVista, setModoVista] = useState('simulador');

  // Telemetría de uso ANÓNIMA: inicio del juego al montar (una vez).
  useEffect(() => { recordGameStart('milpa'); }, []);
  // Guard para que el evento de completado se dispare una sola vez por sesión de juego.
  const completadoRef = useRef(false);
  useEffect(() => {
    if (fase === 'final' && !completadoRef.current) {
      completadoRef.current = true;
      recordGameComplete('milpa');
    }
  }, [fase]);

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
  const espaciosActivos = espaciosUsadosParcela(parcelaActiva);

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
      let textoParaHablar = '';
      setParcelas((prev) =>
        prev.map((p) => {
          if (p.id !== activa) return p;
          const antesTenia = p.cultivos.includes(cultivoId);
          const siguiente = sembrarEnParcela(p, cultivoId);

          if (siguiente.motivo === 'no cabe') {
            const info = CULTIVO_POR_ID[cultivoId];
            setAvisoSiembra(`${info?.nombre ?? 'Ese cultivo'} no cabe. Quita algo o elige otra parcela.`);
            setCelebracion('');
            try { agentSounds.error(); } catch { /* noop */ }
            return siguiente;
          }

          setAvisoSiembra('');

          const tipo = identificarAsociacion(siguiente);
          const agrego = !antesTenia && siguiente.cultivos.includes(cultivoId);
          if (agrego && tipo) {
            const mensaje = describirAsociacionCompleta(tipo);
            setCelebracion(mensaje);
            textoParaHablar = mensaje;
          } else if (antesTenia) {
            setCelebracion('');
          }

          return siguiente;
        }),
      );
      try { agentSounds.listen(); } catch { /* noop */ }
      if (textoParaHablar) {
        try { agentSounds.chime(); } catch { /* noop */ }
        hablar(textoParaHablar);
      }
    },
    [activa, hablar],
  );

  const seleccionarParcela = useCallback((id) => {
    setActiva(id);
    setAvisoSiembra('');
    setCelebracion('');
    try { agentSounds.start(); } catch { /* noop */ }
  }, []);

  const iniciarTemporada = useCallback(() => {
    // Generar 3 eventos posibles para que el jugador elija
    const eventos = elegirEventosPosibles(juego.temporadaActual, []);
    setEventosPosibles(eventos);
    setConsejoVisible({});
    setFase('seleccion-evento');
    try { agentSounds.start(); } catch { /* noop */ }
    hablar('Elige un evento para enfrentar. Cada uno presenta un desafío diferente.');
  }, [juego.temporadaActual, hablar]);

  const seleccionarEvento = useCallback((eventoSeleccionado) => {
    const nuevosDanos = {};
    parcelas.forEach((p) => {
      if (diversidadParcela(p) > 0) {
        nuevosDanos[p.id] = aplicarEvento(p, eventoSeleccionado);
      }
    });
    setEvento(eventoSeleccionado);
    setDanos(nuevosDanos);
    setFase('temporada');
    try { agentSounds.start(); } catch { /* noop */ }
    hablar(`Llegó ${eventoSeleccionado.nombre}. ${eventoSeleccionado.relacion}`);
  }, [parcelas, hablar]);

  const mostrarConsejo = useCallback((eventoId) => {
    const evento = eventosPosibles.find(e => e.id === eventoId);
    if (!evento) return;

    const consejo = generarConsejo(evento);
    setConsejoVisible(prev => ({ ...prev, [eventoId]: consejo }));
    try { agentSounds.chime(); } catch { /* noop */ }
    hablar(`${consejo.consejo} ${consejo.cultivo} puede ayudarte.`);
  }, [eventosPosibles, hablar]);

  const verResultado = useCallback(() => {
    setFase('resultado');
    try { agentSounds.chime(); } catch { /* noop */ }

    // Guardar resultado de la temporada
    const resultadoTemporada = {
      numero: juego.temporadaActual,
      resumen: { ...resumen },
      evento: evento,
    };

    setResultadosTemporadas(prev => [...prev, resultadoTemporada]);

    const msg = resumen.ventajaPct > 0
      ? `Rendiste ${resumen.ventajaPct} por ciento más que el monocultivo.`
      : 'Asocia cultivos y verás cómo rinde mejor.';
    hablar(msg);

    // Verificar si superó al campesino vecino
    const verificacion = verificarSuperoCampesinoVecino(resumen, juego.temporadaActual);
    if (verificacion.supero) {
      setMedallasObtenidas(prev => [...prev, { temporada: juego.temporadaActual, medalla: verificacion.medalla }]);
      setTimeout(() => {
        try { agentSounds.chime(); } catch { /* noop */ }
      }, 500);
    }

    // Verificar logros nuevos
    const juegoConResumen = {
      ...juego,
      parcelas,
      historicoTemporadas: [...juego.historicoTemporadas, resultadoTemporada],
    };
    const nuevosLogros = verificarLogros(juegoConResumen);
    if (nuevosLogros.length > 0) {
      setLogros((prev) => [...prev, ...nuevosLogros]);
      setTimeout(() => {
        try { agentSounds.chime(); } catch { /* noop */ }
      }, 500);
    }
  }, [resumen, hablar, juego, parcelas, evento]);

  const avanzar = useCallback(() => {
    const { juego: juegoActualizado, continua } = avanzarTemporada(juego);
    if (continua) {
      setJuego(juegoActualizado);
      setParcelas(juegoActualizado.parcelas);
      setActiva('1');
      setFase('siembra');
      setEvento(null);
      setDanos(null);
      setEventosPosibles([]);
      setConsejoVisible({});
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
    setSistemaActivo(null);
    setAvisoSiembra('');
    setCelebracion('');
    setEventosPosibles([]);
    setConsejoVisible({});
    setResultadosTemporadas([]);
    setMedallasObtenidas([]);
    try { agentSounds.listen(); } catch { /* noop */ }
  }, []);

  // Cultivos disponibles filtrados por fase de selección
  const cultivosDisponibles = useMemo(() => {
    if (!sistemaActivo) return CULTIVOS_INFO;
    const asoc = Object.values(ASOCIACIONES).find((a) => a.id === sistemaActivo);
    if (!asoc) return CULTIVOS_INFO;
    return asoc.cultivos.map((id) => CULTIVO_POR_ID[id]).filter(Boolean);
  }, [sistemaActivo]);

  // Modo ilustrado (juego SVG "las tres hermanas"). Se monta como pantalla
  // completa; su "Salir" regresa al simulador hondo. El early-return va DESPUÉS
  // de todos los hooks para no violar las reglas de hooks.
  if (modoVista === 'ilustrado') {
    return <JuegoLaMilpa onBack={() => setModoVista('simulador')} />;
  }

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
              {/* Puente a la "cara bonita" de la Milpa: el mini-juego SVG de las
                  tres hermanas (fusión audit 2026-07-16). Misma Milpa, modo
                  ilustrado para entrar jugando. */}
              <button
                type="button"
                data-testid="milpa-modo-ilustrado"
                onClick={() => setModoVista('ilustrado')}
                className="mt-3 inline-flex items-center gap-2 rounded-2xl border-2 border-lime-300/50 bg-lime-500/15 px-4 py-2.5 text-sm font-black text-lime-100 hover:bg-lime-500/25 active:scale-[0.98] transition"
              >
                <Sparkles size={18} aria-hidden="true" />
                Jugar «Las tres hermanas» (modo ilustrado)
              </button>
            </header>

            <AliadosNaturales />

            <section className="grid grid-cols-1 gap-3">
              <h3 className="text-sm font-black text-emerald-200">Sistemas</h3>
              {Object.values(ASOCIACIONES).map((asoc) => (
                <button
                  key={asoc.id}
                  type="button"
                  onClick={() => {
                    setSistemaActivo(asoc.id);
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
            <div className="mb-3 flex items-center justify-between rounded-2xl bg-emerald-900/50 px-3 py-2">
              <span className="text-xs font-black text-lime-200">
                {espaciosActivos}/{SLOTS_POR_PARCELA} espacios usados
              </span>
              <span className="text-[11px] font-bold text-emerald-300">
                Capacidad limitada
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {cultivosDisponibles.map((c) => (
                <CultivoButton
                  key={c.id}
                  cultivo={c}
                  activo={parcelaActiva.cultivos.includes(c.id)}
                  onToggle={toggleCultivo}
                  deshabilitado={
                    !parcelaActiva.cultivos.includes(c.id) &&
                    !cabeCultivoEnParcela(parcelaActiva, c.id)
                  }
                />
              ))}
            </div>

            {avisoSiembra && (
              <p className="mt-3 rounded-2xl bg-amber-400/15 p-3 text-sm font-black text-amber-100 ring-1 ring-amber-300/30">
                {avisoSiembra}
              </p>
            )}

            <SinergiaNarrada parcela={parcelaActiva} celebracion={celebracion} />

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

        {/* FASE SELECCIÓN DE EVENTO: el jugador elige cuál enfrentar */}
        {fase === 'seleccion-evento' && (
          <section
            data-testid="milpa-seleccion-evento"
            className="rounded-3xl border-2 border-amber-400/50 bg-gradient-to-br from-amber-900/40 to-emerald-950/60 p-4 milpa-fade-in"
          >
            <div className="text-center">
              <div className="text-4xl mb-2" aria-hidden="true">⚡</div>
              <h3 className="text-xl font-black text-white">¡Elige un evento para enfrentar!</h3>
              <p className="mt-2 text-sm font-medium text-amber-100">
                Cada evento presenta un desafío diferente. Elige sabiamente.
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {eventosPosibles.map((ev) => {
                const consejo = consejoVisible[ev.id];
                return (
                  <div
                    key={ev.id}
                    className="rounded-2xl bg-emerald-950/60 p-4 ring-1 ring-emerald-800/50"
                  >
                    <button
                      type="button"
                      onClick={() => seleccionarEvento(ev)}
                      className="flex w-full items-center gap-3 text-left transition hover:bg-emerald-900/30 active:scale-[0.98] rounded-xl p-2"
                    >
                      <span className="text-3xl" aria-hidden="true">{ev.emoji}</span>
                      <div className="flex-1">
                        <p className="text-sm font-black text-white">{ev.nombre}</p>
                        <p className="text-xs text-emerald-300">Daño base: {ev.dano}</p>
                      </div>
                      <span className="text-lime-300">Enfrentar →</span>
                    </button>

                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => mostrarConsejo(ev.id)}
                        className="flex min-h-[32px] items-center gap-1 rounded-xl bg-amber-400/20 px-3 py-1 text-xs font-black text-amber-200 ring-1 ring-amber-300/30 transition hover:bg-amber-400/30 active:scale-95"
                      >
                        💡 Consejo
                      </button>
                      {consejo && (
                        <div className="flex-1 rounded-xl bg-lime-400/15 p-2 text-left">
                          <p className="text-xs font-bold text-lime-200">
                            <span className="text-lime-300">{consejo.cultivo}:</span> {consejo.consejo}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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

              {/* Barras de comparación animadas */}
              <div className="mt-4 rounded-2xl bg-slate-900/60 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-200">
                  Comparación de rendimiento
                </p>
                <div className="mt-3">
                  <BarraComparacion
                    asociacion={resumen.saludTotal}
                    monocultivo={resumen.rendimientoMono}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs">
                  <span className="font-bold text-amber-200">Monocultivo: {resumen.rendimientoMono}</span>
                  <span className="font-bold text-lime-200">Asociación: {resumen.saludTotal}</span>
                </div>
              </div>
            </div>

            {/* Indicadores reales con mini-barras animadas */}
            <div className="grid grid-cols-2 gap-2" data-testid="milpa-indicadores">
              <IndicadorMini emoji="📏" valor={resumen.lerPromedio.toFixed(2)} etiqueta="LER" maxValor={3} />
              <IndicadorMini emoji="💧" valor={`${resumen.nitrogenoPromedio}%`} etiqueta="N fijado" maxValor={100} />
              <IndicadorMini emoji="🌿" valor={`−${resumen.coberturaPromedio}%`} etiqueta="Maleza" maxValor={100} />
              <IndicadorMini emoji="🌳" valor={`${resumen.sombraPromedio}%`} etiqueta="Sombra" maxValor={100} />
            </div>

            {/* Verificación del campesino vecino */}
            {(() => {
              const verificacion = verificarSuperoCampesinoVecino(resumen, juego.temporadaActual);
              if (!verificacion.supero) return null;

              return (
                <div className="rounded-3xl border-2 border-amber-400/40 bg-gradient-to-br from-amber-900/60 to-emerald-950/60 p-4 text-center milpa-resplandor">
                  <div className="text-4xl" aria-hidden="true">🏅</div>
                  <h4 className="mt-2 text-lg font-black text-white">
                    ¡Superaste al campesino vecino!
                  </h4>
                  <p className="mt-1 text-sm font-bold text-amber-200">
                    Temporada {juego.temporadaActual} • {verificacion.medalla}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-xl bg-slate-900/60 p-2">
                      <p className="font-bold text-emerald-200">LER</p>
                      <p className="text-base font-black text-lime-200">{verificacion.detalles.ler.logrado.toFixed(2)}</p>
                      <p className="text-[10px] text-emerald-400">meta: {verificacion.detalles.ler.objetivo}</p>
                    </div>
                    <div className="rounded-xl bg-slate-900/60 p-2">
                      <p className="font-bold text-emerald-200">N</p>
                      <p className="text-base font-black text-lime-200">{verificacion.detalles.n.logrado}%</p>
                      <p className="text-[10px] text-emerald-400">meta: {verificacion.detalles.n.objetivo}%</p>
                    </div>
                    <div className="rounded-xl bg-slate-900/60 p-2">
                      <p className="font-bold text-emerald-200">Cobertura</p>
                      <p className="text-base font-black text-lime-200">{verificacion.detalles.cobertura.logrado}%</p>
                      <p className="text-[10px] text-emerald-400">meta: {verificacion.detalles.cobertura.objetivo}%</p>
                    </div>
                  </div>
                </div>
              );
            })()}

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

            {/* Historial de las 3 temporadas */}
            <div className="rounded-3xl border border-emerald-800/50 bg-emerald-950/40 p-4">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-white">
                <Target size={16} className="text-lime-300" aria-hidden="true" />
                Tu progreso en las {NUM_TEMPORADAS} temporadas
              </h4>
              <div className="flex flex-col gap-2">
                {resultadosTemporadas.map((temp) => {
                  const verificacion = verificarSuperoCampesinoVecino(temp.resumen, temp.numero);
                  const medalla = medallasObtenidas.find(m => m.temporada === temp.numero);

                  return (
                    <div
                      key={temp.numero}
                      className={`rounded-2xl p-3 ring-1 ${
                        verificacion.supero
                          ? 'bg-amber-900/40 ring-amber-400/30'
                          : 'bg-emerald-900/40 ring-emerald-800/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🌾</span>
                          <p className="text-sm font-black text-white">Temporada {temp.numero}</p>
                          {medalla && (
                            <span className="text-lg" aria-hidden="true">🏅</span>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-emerald-200">
                            LER: {temp.resumen.lerPromedio.toFixed(2)}
                          </p>
                          <p className="text-xs font-bold text-emerald-200">
                            Ventaja: +{temp.resumen.ventajaPct}%
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
                        <div>
                          <p className="font-bold text-emerald-300">N: {temp.resumen.nitrogenoPromedio}%</p>
                        </div>
                        <div>
                          <p className="font-bold text-emerald-300">Cobertura: {temp.resumen.coberturaPromedio}%</p>
                        </div>
                        <div>
                          <p className="font-bold text-emerald-300">Sombra: {temp.resumen.sombraPromedio}%</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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

            {/* Medallas obtenidas */}
            {medallasObtenidas.length > 0 && (
              <div className="rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-900/40 to-emerald-950/60 p-4">
                <h4 className="mb-2 flex items-center gap-2 text-sm font-black text-white">
                  <span className="text-lg" aria-hidden="true">🏅</span>
                  Medallas del campesino vecino ({medallasObtenidas.length})
                </h4>
                <div className="flex flex-col gap-1">
                  {medallasObtenidas.map((medalla, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded-xl bg-amber-400/15 p-2"
                    >
                      <span className="text-lg" aria-hidden="true">🏅</span>
                      <p className="text-xs font-black text-amber-200">
                        Temporada {medalla.temporada}: {medalla.medalla}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

/** Narrativa viva de los cultivos sembrados y sus sinergias medibles. */
function SinergiaNarrada({ parcela, celebracion }) {
  const cultivos = parcela.cultivos
    .map((id) => CULTIVO_POR_ID[id])
    .filter(Boolean);
  const nFijado = nitrogenoFijado(parcela);
  const cobertura = coberturaSuelo(parcela);
  const sombra = sombraParcela(parcela);
  const plaga = controlPlaga(parcela);
  const soporte = haySoporteFisico(parcela);

  if (cultivos.length === 0) {
    return (
      <div
        className="mt-3 rounded-2xl bg-emerald-900/40 p-3 text-sm font-bold text-emerald-300"
        data-testid="milpa-sinergias"
      >
        Siembra una primera planta y mira qué puede aportar a sus vecinas.
      </div>
    );
  }

  return (
    <div
      className="mt-3 flex flex-col gap-2"
      data-testid="milpa-sinergias"
    >
      {cultivos.map((cultivo) => (
        <p
          key={cultivo.id}
          className="rounded-2xl bg-emerald-900/45 p-3 text-sm font-bold leading-relaxed text-emerald-100 ring-1 ring-emerald-700/40 milpa-deslizar-arriba"
        >
          {CULTIVO_NARRATIVAS[cultivo.id] ?? cultivo.ayuda}
        </p>
      ))}

      <div className="grid grid-cols-2 gap-2">
        {soporte && <SinergiaDato texto="Soporte físico" valor="activo" />}
        {nFijado > 0 && <SinergiaDato texto="N fijado" valor={`${nFijado}%`} />}
        {cobertura > 0 && <SinergiaDato texto="Maleza" valor={`-${cobertura}%`} />}
        {sombra > 0 && <SinergiaDato texto="Sombra" valor={`${sombra}%`} />}
        {plaga > 0 && <SinergiaDato texto="Plagas" valor={`-${plaga}%`} />}
      </div>

      {celebracion && (
        <p className="rounded-3xl border border-lime-300/40 bg-lime-400/15 p-4 text-center text-base font-black leading-relaxed text-lime-100 milpa-asociacion-completa">
          {celebracion}
        </p>
      )}
    </div>
  );
}

/** Indicador corto con cifra real o relación activada. */
function SinergiaDato({ texto, valor }) {
  return (
    <div className="rounded-2xl bg-slate-900/45 p-2 text-center ring-1 ring-emerald-700/40">
      <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-300">{texto}</p>
      <p className="text-sm font-black text-lime-200">{valor}</p>
    </div>
  );
}

/** Barra de comparación animada Monocultivo vs Asociación. */
function BarraComparacion({ asociacion, monocultivo }) {
  const maxValor = Math.max(asociacion, monocultivo, 1);
  const porcentajeAsociacion = (asociacion / maxValor) * 100;
  const porcentajeMonocultivo = (monocultivo / maxValor) * 100;
  const ventajaPct = monocultivo > 0 ? Math.round(((asociacion - monocultivo) / monocultivo) * 100) : 0;

  return (
    <div className="relative">
      {/* Barra monocultivo (fondo) */}
      <div className="h-12 w-full overflow-hidden rounded-xl bg-slate-800">
        <div
          className="h-full rounded-xl bg-gradient-to-r from-amber-700 via-orange-600 to-amber-500 transition-all duration-1000 ease-out"
          style={{ width: `${porcentajeMonocultivo}%` }}
        />
      </div>

      {/* Barra asociación (superpuesta) */}
      <div className="absolute top-0 left-0 h-12 w-full overflow-hidden rounded-xl">
        <div
          className="h-full rounded-xl bg-gradient-to-r from-lime-500 via-emerald-400 to-lime-300 transition-all duration-1000 ease-out milpa-brota"
          style={{ width: `${porcentajeAsociacion}%` }}
        />
      </div>

      {/* Número flotante de ventaja */}
      {ventajaPct > 0 && (
        <div className="absolute -top-6 right-0 rounded-xl bg-lime-400 px-2 py-1 text-sm font-black text-emerald-950 shadow-lg milpa-badge-pop">
          +{ventajaPct}%
        </div>
      )}
    </div>
  );
}

/** Indicador compacto con mini-barras animadas. */
function IndicadorMini({ emoji, valor, etiqueta, maxValor = 100 }) {
  const valorNumerico = typeof valor === 'number' ? valor : parseFloat(valor.replace('%', ''));
  const porcentaje = Math.min(100, Math.max(0, (valorNumerico / maxValor) * 100));

  return (
    <div className="flex flex-col items-center rounded-2xl bg-emerald-950/40 p-2 text-center ring-1 ring-emerald-800/40">
      <span className="text-xl" aria-hidden="true">{emoji}</span>
      <div className="relative mt-1 w-full">
        {/* Mini barra animada */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-lime-400 to-emerald-400 transition-all duration-700 ease-out"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
        {/* Valor superpuesto */}
        <span className="text-base font-black text-lime-200">{valor}</span>
      </div>
      <span className="text-[10px] leading-tight text-emerald-300/80">{etiqueta}</span>
    </div>
  );
}
