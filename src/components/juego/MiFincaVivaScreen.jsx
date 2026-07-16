import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Volume2, VolumeX, Trophy, Sprout, Crosshair, Mountain, Scale } from 'lucide-react';
import { ScreenShell } from '../common/ScreenShell';
import FincaWorldScene from './FincaWorldScene';
import CriaturaCollection from './CriaturaCollection';
import MisionCard from './MisionCard';
import LevelUpCelebration from './LevelUpCelebration';
import './juego-finca.css';

import { listFarmProcesses, getFarmEvents } from '../../db/farmProcessCache';
import { getProfile } from '../../services/userProfileService';
import {
  buildFincaGameState,
  detectLevelUp,
  narrarFinca,
} from '../../services/fincaGameService';
import {
  getGameState,
  setLastLevel,
  markMissionDone,
  getMisionesHechasSet,
} from '../../services/fincaGameStateService';
import { agentSounds, isSoundEnabled, setSoundEnabled } from '../../services/agentSoundService';
import { speak, stop as stopSpeak, isSupported as ttsSupported } from '../../services/ttsService';
import { recordGameStart, recordGameComplete } from '../../services/usageTelemetryService';
import { fvhSkinClass } from '../../config/fvhSkin';

/**
 * MiFincaVivaScreen — el JUEGO "Mi Finca Viva" para Julieta (y toda niña).
 *
 * Una capa lúdica ENCIMA del motor de evolución de finca: la finca es un mundo
 * vivo que florece a medida que los indicadores REALES suben (fincaEvolution
 * Service vía fincaGameService). No reemplaza la pantalla seria
 * "Cómo evoluciona tu finca" — es un modo alegre y accesible para una niña.
 *
 * Mecánicas (todas derivadas de datos reales, cero fabricación):
 *   - Mundo que crece (FincaWorldScene) por nivel Gliessman 0-4.
 *   - Criaturas coleccionables (CriaturaCollection) que aparecen con la
 *     biodiversidad real.
 *   - Misiones (MisionCard) ligadas a acciones reales + fichas GUATOC.
 *   - Insignias por hitos reales.
 *   - Celebración (LevelUpCelebration) + sonido + audio (TTS) al subir.
 *
 * Accesible para una niña que lee poco: botones grandes (min 44-56px), textos
 * cortos, AUDIO en todo (TTS kokoro/Web Speech), colores vivos, alto contraste.
 * Offline-first: lee la cache local de procesos; sin datos → invita a sembrar.
 *
 * @param {Object} props
 * @param {Function} [props.onBack]
 * @param {Function} [props.onHome]
 * @param {Function} [props.onNavigate]
 */
export default function MiFincaVivaScreen({ onBack, onHome, onNavigate }) {
  const profile = useMemo(() => getProfile() || {}, []);
  const fincaSlug = profile.fincaSlug || profile.slug || 'default';

  // Audio on/off — comparte la preferencia con el sonido del agente, así un solo
  // toque silencia todo. Una niña puede preferir con o sin sonido.
  const [audioOn, setAudioOn] = useState(() => isSoundEnabled());

  // Procesos reales de la finca (offline-first; si IDB falla → [] honesto).
  const [processes, setProcesses] = useState([]);
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    let alive = true;
    listFarmProcesses({ status: 'active' })
      .then(async (list) => {
        const arr = Array.isArray(list) ? list : [];
        // Hidrata los eventos de cada proceso (cosechas, biopreparados,
        // observaciones) para que los indicadores que dependen de eventos
        // realmente prendan. Si falla, el proceso queda sin events (honesto).
        const conEventos = await Promise.all(
          arr.map(async (p) => {
            try {
              const events = await getFarmEvents(p.process_id);
              return { ...p, events: Array.isArray(events) ? events : [] };
            } catch {
              return { ...p, events: [] };
            }
          }),
        );
        if (alive) setProcesses(conEventos);
      })
      .catch(() => { /* IDB falló: mundo vacío honesto, nunca datos inventados */ })
      .finally(() => { if (alive) setCargando(false); });
    return () => { alive = false; };
  }, []);

  // Misiones de "aprender" marcadas a mano (persistidas por finca).
  const [misionesHechas, setMisionesHechas] = useState(() => getMisionesHechasSet(fincaSlug));

  // Estado de juego completo derivado de datos reales de la finca.
  // NOTA: buildFincaGameState() debe ser la única fuente de verdad del estado
  // de juego. Si se agregan nuevas métricas, actualizar buildFincaGameState.
  const game = useMemo(
    () => buildFincaGameState({ processes, observations: [], misionesHechas }),
    [processes, misionesHechas],
  );

  // Detección de subida de nivel vs el último nivel visto (persistido).
  // El nivel base se captura UNA vez al montar (estado lazy, legible en render):
  // comparamos el nivel real de ahora contra lo que la niña vio la última vez,
  // sin setState en efecto (evita renders en cascada). `descartada` cierra la
  // fiesta.
  const [baselineLevel] = useState(() => getGameState(fincaSlug).lastLevel);
  const [celebracionDescartada, setCelebracionDescartada] = useState(false);
  const subioNivel = !cargando && detectLevelUp(game.nivel, baselineLevel).subio;
  const celebrando = subioNivel && !celebracionDescartada;

  // Telemetría de uso ANÓNIMA: inicio del juego al montar (una vez).
  useEffect(() => { recordGameStart('mi_finca_viva'); }, []);
  // Cada subida de nivel cuenta como un "completado". Guard para no repetir
  // mientras `subioNivel` se mantenga en true en renders consecutivos.
  const subidaRegistradaRef = useRef(false);
  useEffect(() => {
    if (subioNivel && !subidaRegistradaRef.current) {
      subidaRegistradaRef.current = true;
      recordGameComplete('mi_finca_viva');
    } else if (!subioNivel) {
      subidaRegistradaRef.current = false;
    }
  }, [subioNivel]);

  // Sella el nivel actual como "visto" (la celebración no se repite al volver).
  // Persistir es sincronización con un sistema externo (localStorage): efecto OK.
  useEffect(() => {
    if (cargando) return;
    setLastLevel(fincaSlug, game.nivel);
  }, [cargando, game.nivel, fincaSlug]);

  // Narrar con TTS (si hay audio y soporte). Texto corto y alegre.
  const hablar = useCallback((texto) => {
    if (!audioOn || !texto) return;
    try {
      if (ttsSupported()) {
        speak(texto, { rate: 0.95, pitch: 1.05 });
      }
    } catch { /* TTS no disponible: el juego sigue sin audio */ }
  }, [audioOn]);

  // Al entrar (una vez cargado), saludar con audio describiendo la finca.
  useEffect(() => {
    if (cargando || celebrando) return;
    hablar(narrarFinca(game));
    // Solo el saludo inicial; no re-narra en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando]);

  const toggleAudio = useCallback(() => {
    const next = !audioOn;
    setAudioOn(next);
    setSoundEnabled(next);
    if (!next) {
      try { stopSpeak(); } catch { /* noop */ }
    } else {
      try { agentSounds.listen(); } catch { /* noop */ }
    }
  }, [audioOn]);

  const cerrarCelebracion = useCallback(() => {
    setCelebracionDescartada(true);
    try { stopSpeak(); } catch { /* noop */ }
  }, []);

  const irAccion = useCallback((nav) => {
    try { agentSounds.start(); } catch { /* noop */ }
    onNavigate?.(nav);
  }, [onNavigate]);

  const marcarMision = useCallback((id) => {
    markMissionDone(fincaSlug, id);
    setMisionesHechas(getMisionesHechasSet(fincaSlug));
    try { agentSounds.chime(); } catch { /* noop */ }
    hablar('¡Misión cumplida! Muy bien.');
  }, [fincaSlug, hablar]);

  const mundo = game.mundo;

  return (
    // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish -- nombre del juego, ES-CO; migración i18n (ADR-050) fuera de alcance.
    <ScreenShell title="Mi Finca Viva" icon={Sprout} onBack={onBack} onHome={onHome}>
      <div
        data-testid="mi-finca-viva-screen"
        className={fvhSkinClass('jp-ambiente flex flex-col gap-4 px-4 pt-3 pb-10 max-w-2xl mx-auto')}
      >
        {/* Encabezado lúdico + botón de audio grande */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="jp-tinta-suave text-xs font-bold text-emerald-300/80 uppercase tracking-widest">
              Nivel {game.nivel} de 4
            </p>
            <h2 className="jp-tinta text-2xl font-black text-white leading-tight flex items-center gap-2">
              <span aria-hidden="true">{mundo.emoji}</span>
              {mundo.nombreNino}
            </h2>
          </div>
          <button
            type="button"
            onClick={toggleAudio}
            aria-pressed={audioOn}
            aria-label={audioOn ? 'Apagar el sonido' : 'Encender el sonido'}
            className="shrink-0 min-h-[56px] min-w-[56px] rounded-2xl bg-emerald-700/60 hover:bg-emerald-600/60 active:scale-95 transition flex items-center justify-center text-white"
          >
            {audioOn ? <Volume2 size={26} /> : <VolumeX size={26} />}
          </button>
        </div>

        {/* EL MUNDO que crece — el corazón visual */}
        <FincaWorldScene stage={mundo} criaturas={game.criaturas} vacia={game.vacia} />

        {/* Mensaje del mundo + botón de escuchar */}
        <div className="jp-mfv-panel bg-emerald-950/50 border border-emerald-800/40 rounded-2xl p-4 flex items-start gap-3">
          <button
            type="button"
            onClick={() => hablar(narrarFinca(game))}
            aria-label="Escuchar cómo está tu finca"
            className="shrink-0 min-h-[48px] min-w-[48px] rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition flex items-center justify-center text-white"
          >
            <Volume2 size={22} aria-hidden="true" />
          </button>
          <div className="flex-1">
            <p className="jp-tinta text-base text-emerald-50 font-medium leading-relaxed">{mundo.mensaje}</p>
            <p className="jp-tinta-suave text-xs text-emerald-300/70 mt-1">
              Esto es de verdad: tu finca está en la etapa «{mundo.nombreReal}».
            </p>
          </div>
        </div>

        {/* Minijuego plataformero: Defensores de la Finca (control biológico) */}
        <button
          type="button"
          data-testid="entrada-defensores-finca"
          onClick={() => irAccion('defensores')}
          className="jp-mfv-entrada w-full text-left rounded-2xl p-4 bg-gradient-to-br from-teal-600/40 to-emerald-800/40 border-2 border-teal-400/40 hover:border-teal-300/60 active:scale-[0.99] transition flex items-center gap-3"
        >
          <span className="text-4xl shrink-0" aria-hidden="true">🛡️</span>
          <span className="flex-1 min-w-0">
            {/* eslint-disable-next-line chagra-i18n/no-hardcoded-spanish -- nombre del juego, ES-CO. */}
            <span className="jp-tinta block text-base font-black text-white">Defensores de la Finca</span>
            <span className="jp-tinta-suave block text-sm text-teal-100/90 leading-snug">
              Corre y salta por la finca, recoge cultivos y suelta los bichos
              buenos que controlan a las plagas. Así aprendes control biológico.
            </span>
          </span>
          <Sparkles size={22} className="text-teal-200 shrink-0" aria-hidden="true" />
        </button>

        {/* Subjuego de siembra: La Milpa (las tres hermanas, asociación real) */}
        <button
          type="button"
          data-testid="entrada-milpa"
          onClick={() => irAccion('milpa')}
          className="jp-mfv-entrada w-full text-left rounded-2xl p-4 bg-gradient-to-br from-lime-600/40 to-amber-800/40 border-2 border-lime-400/40 hover:border-lime-300/60 active:scale-[0.99] transition flex items-center gap-3"
        >
          <span className="text-4xl shrink-0" aria-hidden="true">🌽</span>
          <span className="flex-1 min-w-0">
            <span className="jp-tinta block text-base font-black text-white">La Milpa</span>
            <span className="jp-tinta-suave block text-sm text-lime-100/90 leading-snug">
              Siembra maíz, fríjol y ahuyama juntos (las tres hermanas) y mira
              cómo se ayudan y rinden más que sembrar cada uno solo.
            </span>
          </span>
          <Sparkles size={22} className="text-lime-200 shrink-0" aria-hidden="true" />
        </button>

        {/* Nivel Doom agroecologico: primera persona por el invernadero */}
        <button
          type="button"
          data-testid="entrada-doom-finca"
          onClick={() => irAccion('doom_finca')}
          className="jp-mfv-entrada w-full text-left rounded-2xl p-4 bg-gradient-to-br from-orange-600/40 to-amber-800/40 border-2 border-orange-400/40 hover:border-orange-300/60 active:scale-[0.99] transition flex items-center gap-3"
        >
          <span className="text-4xl shrink-0" aria-hidden="true">🎯</span>
          <span className="flex-1 min-w-0">
            {/* eslint-disable-next-line chagra-i18n/no-hardcoded-spanish -- nombre del juego, ES-CO. */}
            <span className="jp-tinta block text-base font-black text-white">Doom de la Finca</span>
            <span className="jp-tinta-suave block text-sm text-orange-100/90 leading-snug">
              Recorre el invernadero en primera persona, identifica las plagas y
              lanza el controlador biologico correcto. Protege tu cultivo.
            </span>
          </span>
          <Crosshair size={22} className="text-orange-200 shrink-0" aria-hidden="true" />
        </button>

        {/* Mundo Subsuelo: cartas de decisión sobre la vida del suelo (compost,
            micorrizas, lombrices vs labranza/químico). Rescatado del ux-audit
            P1-1: el componente existía pero no tenía entrada ni ruta. */}
        <button
          type="button"
          data-testid="entrada-subsuelo"
          onClick={() => irAccion('subsuelo')}
          className="jp-mfv-entrada w-full text-left rounded-2xl p-4 bg-gradient-to-br from-cyan-600/40 to-amber-800/40 border-2 border-cyan-400/40 hover:border-cyan-300/60 active:scale-[0.99] transition flex items-center gap-3"
        >
          <span className="text-4xl shrink-0" aria-hidden="true">🪱</span>
          <span className="flex-1 min-w-0">
            <span className="jp-tinta block text-base font-black text-white">Mundo Subsuelo</span>
            <span className="jp-tinta-suave block text-sm text-cyan-100/90 leading-snug">
              Baja bajo tus botas: alimenta la tierra con compost, conecta raíces
              con hongos y despierta a las lombrices. Mira cómo revive el suelo.
            </span>
          </span>
          <Sparkles size={22} className="text-cyan-200 shrink-0" aria-hidden="true" />
        </button>

        {/* Mi finca (túnel Odyssey): el cruce mágico 2D↔3D. Antes era una joya
            escondida (solo URL #/mockups/juego-mi-finca); promovido a ruta de
            primera clase y enlazado aquí (audit juegos 2026-07-16). */}
        <button
          type="button"
          data-testid="entrada-finca-odyssey"
          onClick={() => irAccion('finca_odyssey')}
          className="jp-mfv-entrada w-full text-left rounded-2xl p-4 bg-gradient-to-br from-indigo-600/40 to-emerald-800/40 border-2 border-indigo-400/40 hover:border-indigo-300/60 active:scale-[0.99] transition flex items-center gap-3"
        >
          <span className="text-4xl shrink-0" aria-hidden="true">🏔️</span>
          <span className="flex-1 min-w-0">
            <span className="jp-tinta block text-base font-black text-white">Mi finca en 3D</span>
            <span className="jp-tinta-suave block text-sm text-indigo-100/90 leading-snug">
              Entra por el túnel a tu finca en tres dimensiones y aterriza en el
              huerto para cuidar el riego, las tres hermanas y las abejitas.
            </span>
          </span>
          <Mountain size={22} className="text-indigo-200 shrink-0" aria-hidden="true" />
        </button>

        {/* Mono vs Poli: comparador de decisión (rendimiento/LER, nitrógeno,
            ahorro de insumos, control de plaga) con cifras reales y fuente.
            Rescatado de huérfano total sin ruta (audit juegos 2026-07-16). */}
        <button
          type="button"
          data-testid="entrada-mono-vs-poli"
          onClick={() => irAccion('mono_vs_poli')}
          className="jp-mfv-entrada w-full text-left rounded-2xl p-4 bg-gradient-to-br from-amber-600/40 to-emerald-800/40 border-2 border-amber-400/40 hover:border-amber-300/60 active:scale-[0.99] transition flex items-center gap-3"
        >
          <span className="text-4xl shrink-0" aria-hidden="true">⚖️</span>
          <span className="flex-1 min-w-0">
            <span className="jp-tinta block text-base font-black text-white">Uno solo o varios juntos</span>
            <span className="jp-tinta-suave block text-sm text-amber-100/90 leading-snug">
              Compara sembrar un solo cultivo contra varios juntos y mira, con
              cifras de verdad, cuánto rinde más y ahorra la asociación.
            </span>
          </span>
          <Scale size={22} className="text-amber-200 shrink-0" aria-hidden="true" />
        </button>

        {/* Barra de progreso del mundo (alegre, pero honesta: % real) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="jp-tinta text-sm font-bold text-emerald-200">Tu finca crece</span>
            <span className="jp-acento-vida text-sm font-black text-emerald-300">{game.progreso}%</span>
          </div>
          <div className="h-4 bg-slate-800/60 rounded-full overflow-hidden border border-emerald-900/40">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-lime-400 to-emerald-400 rounded-full transition-all duration-700"
              style={{ width: `${Math.max(game.progreso, game.vacia ? 0 : 4)}%` }}
              role="progressbar"
              aria-valuenow={game.progreso}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Tu finca está al ${game.progreso} por ciento`}
            />
          </div>
          {game.mundoSiguiente && !game.vacia && (
            <p className="jp-tinta-suave text-xs text-emerald-300/70 mt-1.5">
              Lo que sigue: {game.mundoSiguiente.emoji} {game.mundoSiguiente.nombreNino}
            </p>
          )}
        </div>

        {/* Estado VACÍO: invitar, nunca un mundo muerto */}
        {game.vacia ? (
          <section
            data-testid="finca-vacia-invitacion"
            className="bg-gradient-to-br from-amber-900/30 to-emerald-900/30 border-2 border-amber-400/40 rounded-3xl p-5 text-center"
          >
            <div className="text-5xl mb-2" aria-hidden="true">🌱</div>
            <h3 className="jp-tinta text-xl font-black text-white">¡Empieza tu finca!</h3>
            <p className="jp-tinta text-sm text-amber-50 mt-2 leading-relaxed">
              Tu finca está esperando. Siembra tu primera planta y mira cómo cobra
              vida: llegarán mariposas, abejas y muchas criaturas más.
            </p>
            <button
              type="button"
              onClick={() => irAccion('sembrar')}
              className="mt-4 w-full min-h-[56px] rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition text-emerald-950 font-black text-lg shadow-lg"
            >
              🌱 Sembrar mi primera planta
            </button>
          </section>
        ) : (
          <>
            {/* Misiones */}
            <section data-testid="misiones-juego" className="flex flex-col gap-3">
              <h3 className="jp-tinta text-lg font-black text-white flex items-center gap-2">
                🎯 Mis misiones
                <span className="text-sm font-bold text-emerald-300 bg-emerald-800/50 rounded-full px-3 py-0.5">
                  {game.misiones.filter((m) => m.cumplida).length} / {game.misiones.length}
                </span>
              </h3>
              {game.misiones.map((m) => (
                <MisionCard
                  key={m.id}
                  mision={m}
                  onIr={irAccion}
                  onMarcar={marcarMision}
                  destacada={game.proximaMision?.id === m.id}
                />
              ))}
            </section>
          </>
        )}

        {/* Criaturas — siempre visible (con siluetas si están bloqueadas) */}
        <CriaturaCollection
          criaturas={game.criaturas}
          vivas={game.criaturasVivas}
          total={game.criaturas.length}
          onHablar={audioOn ? hablar : undefined}
        />

        {/* Insignias ganadas */}
        {game.insigniasGanadas > 0 && (
          <section
            data-testid="insignias-juego"
            className="jp-mfv-panel bg-gradient-to-br from-amber-950/50 to-yellow-950/30 border border-amber-700/40 rounded-3xl p-4"
          >
            <h3 className="jp-tinta text-lg font-black text-white flex items-center gap-2 mb-3">
              <Trophy size={20} className="text-amber-300" aria-hidden="true" />
              Mis insignias
            </h3>
            <div className="flex flex-wrap gap-3">
              {game.insignias.filter((b) => b.ganada).map((b) => (
                <div
                  key={b.id}
                  data-testid={`insignia-${b.id}`}
                  className="jp-mfv-insignia flex flex-col items-center gap-1 bg-amber-900/30 border border-amber-500/40 rounded-2xl p-3 w-[88px]"
                  title={b.descripcion}
                >
                  <span className="text-3xl" aria-hidden="true">{b.emoji}</span>
                  <span className="text-[11px] font-bold text-amber-100 text-center leading-tight">
                    {b.nombre}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Nota honesta para acompañantes (anti-paternalismo, cariño real) */}
        <div className="flex items-start gap-2 pt-1">
          <Sparkles size={14} className="text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="jp-tinta-suave text-xs text-slate-400 leading-relaxed">
            Este juego no inventa premios: tu finca crece de verdad con el trabajo
            real. Cada planta que siembras, cada cosecha y cada cuidado sin venenos
            hace que tu mundo florezca. 🌿
          </p>
        </div>
      </div>

      {/* Celebración de subida de nivel */}
      {celebrando && (
        <LevelUpCelebration
          mundo={mundo}
          onClose={cerrarCelebracion}
          onSound={() => { try { agentSounds.chime(); } catch { /* noop */ } }}
          onNarrate={() => hablar(narrarFinca(game, { levelUp: true }))}
        />
      )}
    </ScreenShell>
  );
}
