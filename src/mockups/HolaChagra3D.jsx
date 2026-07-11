/*
 * MOCKUP "Hola, Chagra" — el mundo 3D del wake-word. Ruta #/mockups/hola-chagra-3d.
 *
 * Chagra es voice-first: el campesino no "abre un micrófono", le HABLA a su
 * finca. Este mockup une dos piezas que ya existen en el momento exacto de
 * hablarle: el VALLE 3D (el mundo — mockups/valle, reusado de la entrada
 * definitiva 3D) y la IDENTIDAD DE LA VOZ (el IrisVoz de visual/voz — la voz
 * con forma), con la ABEJA ANGELITA (visual/creatures) como el ser del mundo
 * que despierta primero.
 *
 * EL GUION (demostración guionada, SIN micrófono real):
 *   1. reposo      → el valle respira solo; UNA cosa en pantalla: el hint
 *                    «diga: "hola, Chagra"» (tocarlo = decirlo).
 *   2. saludo      → la abeja despierta y vuela al centro; el mundo se recoge
 *                    (velo), la cámara se acerca: el valle ESCUCHA.
 *   3. escuchando  → aparece el iris (ondas hacia adentro) y la pregunta del
 *                    campesino se transcribe palabra a palabra.
 *   4. pensando    → el iris se trenza: Chagra mira los datos de la finca.
 *   5. hablando    → Chagra responde corto, en usted, con su voz real
 *                    (ttsService → Kokoro, voz Santa; si el server no está,
 *                    el momento sigue completo en silencio).
 *   6. accion      → la respuesta CAE como una acción concreta (un panel, un
 *                    botón). No un chat: una cosa clara que hacer.
 *
 * DEVICE-TIERING REAL (decidirRender): WebGL + equipo con aire → escena 3D en
 * su chunk perezoso (three no toca el bundle base); gama baja o sin WebGL →
 * la MISMA coreografía sobre el valle dibujado (Valle2DFallback, SVG+CSS) con
 * la abeja volando en DOM. El iris, los textos y la acción son DOM compartido
 * entre ambos niveles — la coreografía es UNA sola.
 *
 * Copy de muestra en español de Colombia (usted); si se productiza migra a
 * messages.js (ADR-050). reduced-motion: sin vuelos ni tipeo — fotogramas
 * dignos y tiempos cortos.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish -- mockup dev con copy de
   muestra (no UI de producto); si se productiza, el copy migra a messages.js
   (ADR-050). */
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import '../visual/effects/effects.css';
import './entradaValle3D.css';
import './holaChagra3D.css';
import IrisVoz from '../visual/voz';
import { AbejaAngelita } from '../visual/creatures/AbejaAngelita.jsx';
import Valle2DFallback from './valle/Valle2DFallback';
import { CLIMAS, climaPorHora, COSA_DEL_DIA } from './valle/valleData';
import {
  speakKokoro,
  onSpeakingChange,
  stop as pararVoz,
  DEFAULT_KOKORO_VOICE,
} from '../services/ttsService';

import { decidirRender } from './valle/decidirRender';

// La escena 3D pesada (three/fiber/drei) en su PROPIO chunk perezoso — solo
// baja si decidirRender() dice '3d' y se entra a la ruta.
const Escena3D = lazy(() => import('./valle/HolaChagraEscena3D'));

/* ── El guion (copy de muestra, atado a la cosa del día real del valle) ── */
const PREGUNTA = '¿Cómo protejo el semillero de la helada de esta noche?';
const RESPUESTA =
  'Esta madrugada puede helar en la parte alta. Cubra el semillero con costales antes de que caiga el sol; el frío quema la matica tierna.';

/* Lo que el lector de pantalla oye en cada fase (el iris es decorativo por
   contrato: el estado SIEMPRE se anuncia con texto fuera del iris). */
const ESTADO_SR = {
  reposo: 'El valle está en reposo. Toque la frase para decir: hola, Chagra.',
  saludo: 'Usted dijo: hola, Chagra. La abeja despierta y el mundo lo escucha.',
  escuchando: 'La finca lo está escuchando.',
  pensando: 'Chagra está mirando cómo está su finca.',
  hablando: `Chagra responde: ${RESPUESTA}`,
  accion: 'La respuesta quedó como una acción concreta: cubra el semillero.',
};

/* fase → estado del iris (la voz con forma). En reposo/acción, rescoldo. */
const IRIS_POR_FASE = {
  saludo: 'escuchando',
  escuchando: 'escuchando',
  pensando: 'pensando',
  hablando: 'hablando',
  accion: 'reposo',
};

function nada() {}

export default function HolaChagra3D({ onBack }) {
  const [fase, setFase] = useState('reposo');
  const [clima] = useState(() => climaPorHora());
  const [tier] = useState(() => decidirRender());
  const [nPalabras, setNPalabras] = useState(0);

  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const palabras = useMemo(() => PREGUNTA.split(' '), []);
  const despierta = fase !== 'reposo';

  /* El campesino "dice" el wake-word (mockup guionado: tocar = decir). */
  const despertar = useCallback(() => {
    setNPalabras(0);
    setFase((f) => (f === 'reposo' ? 'saludo' : f));
  }, []);

  /* Volver al reposo: el mundo se aquieta, la voz se calla. */
  const repetir = useCallback(() => {
    pararVoz();
    setNPalabras(0);
    setFase('reposo');
  }, []);

  /* Al salir de la ruta, nunca dejar voz sonando. */
  useEffect(() => () => pararVoz(), []);

  /* ── saludo → escuchando · pensando → hablando (tiempos del rito) ── */
  useEffect(() => {
    if (fase === 'saludo') {
      const t = setTimeout(() => setFase('escuchando'), reducedMotion ? 600 : 2000);
      return () => clearTimeout(t);
    }
    if (fase === 'pensando') {
      const t = setTimeout(() => setFase('hablando'), reducedMotion ? 900 : 1800);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [fase, reducedMotion]);

  /* ── escuchando: la pregunta se transcribe palabra a palabra. El estado solo
        avanza en callbacks de timers (el reset del conteo vive en despertar/
        repetir); con reduced-motion no hay tipeo — el render deriva la
        pregunta completa. ── */
  useEffect(() => {
    if (fase !== 'escuchando') return undefined;
    if (reducedMotion) {
      const t = setTimeout(() => setFase('pensando'), 1600);
      return () => clearTimeout(t);
    }
    const iv = setInterval(
      () => setNPalabras((n) => Math.min(palabras.length, n + 1)),
      180,
    );
    const t = setTimeout(() => setFase('pensando'), 700 + palabras.length * 180 + 900);
    return () => {
      clearInterval(iv);
      clearTimeout(t);
    };
  }, [fase, reducedMotion, palabras]);

  /* ── hablando: la respuesta suena con la VOZ REAL de Chagra (Kokoro, voz
        Santa — DEFAULT_KOKORO_VOICE). Si el audio arranca, la fase avanza al
        TERMINAR el audio (onSpeakingChange); si el server de voz no está
        (silencio consistente del ttsService), un respaldo por tiempo mantiene
        el momento completo. ── */
  useEffect(() => {
    if (fase !== 'hablando') return undefined;
    let hablo = false;
    const off = onSpeakingChange((sonando) => {
      if (sonando) {
        hablo = true;
        return;
      }
      if (hablo) setFase('accion');
    });
    speakKokoro(RESPUESTA, { voice: DEFAULT_KOKORO_VOICE }).catch(nada);
    const respaldo = setTimeout(
      () => setFase('accion'),
      reducedMotion ? 2600 : 6000,
    );
    return () => {
      off();
      clearTimeout(respaldo);
    };
  }, [fase, reducedMotion]);

  const irisEstado = IRIS_POR_FASE[fase] || 'reposo';
  const c = CLIMAS[clima];

  return (
    <div className="valle-root hc3d" data-clima={clima} data-fase={fase}>
      {/* ── El mundo: valle 3D (chunk perezoso) o valle dibujado (gama baja).
            Inerte durante el rito: aquí no se navega, se habla. ── */}
      <div className="valle-escena hc3d__escena" aria-hidden="true" inert>
        {tier === '3d' ? (
          <>
            <Suspense fallback={<CargandoMundo clima={clima} />}>
              <Escena3D clima={clima} despierta={despierta} reducedMotion={reducedMotion} />
            </Suspense>
            {/* el clima tiñe el momento: grade de luz de la librería de
                efectos (el tier 2D ya trae el suyo en Valle2DFallback) */}
            <div className={`hc3d__grade vfx-grade ${c.grade}`} />
          </>
        ) : (
          <div className="hc3d__escena2d">
            <Valle2DFallback clima={clima} onEntrar={nada} onAlerta={nada} />
            {/* La abeja del tier 2D: el mismo ser, volando en DOM (solo
                transform; reduced-motion la posa directo en su destino). */}
            <div className={`hc3d-abeja2d${despierta ? ' hc3d-abeja2d--centro' : ''}`}>
              <AbejaAngelita
                size={56}
                animated={!reducedMotion}
                animo={despierta ? 'pleno' : 'descansa'}
                energia={despierta ? 1 : 0.5}
              />
            </div>
          </div>
        )}
      </div>

      {/* Velo de escucha: al despertar, el mundo se recoge hacia el centro. */}
      <div className="hc3d__velo" aria-hidden="true" />

      <header className="valle-header hc3d__header">
        <button type="button" className="valle-back" onClick={() => onBack?.()} aria-label="Volver">
          ‹ Volver
        </button>
        <div className="valle-titulo">
          <span className="valle-titulo__eyebrow">El mundo que lo oye</span>
          <h1>Hola, Chagra</h1>
        </div>
      </header>

      {/* Estado anunciado en texto (el iris es decorativo por contrato). */}
      <p className="hc3d-sr" aria-live="polite">
        {ESTADO_SR[fase]}
      </p>

      {/* ── reposo: UNA cosa clara — el hint del wake-word ── */}
      {fase === 'reposo' && (
        <div className="hc3d__hint">
          <button type="button" className="hc3d__hint-btn" onClick={despertar}>
            <span className="hc3d__hint-di">Diga:</span>
            <span className="hc3d__hint-frase">«hola, Chagra»</span>
          </button>
          <p className="hc3d__hint-nota">
            Demostración guionada: toque la frase para decirla. No usa el micrófono.
          </p>
        </div>
      )}

      {/* ── el momento: el iris (la voz con forma) + lo que se dice ── */}
      {despierta && (
        <div className="hc3d__momento">
          <div className="hc3d__iris">
            <IrisVoz estado={irisEstado} size={172} />
          </div>

          {fase === 'saludo' && (
            <p className="hc3d__dicho">«hola, Chagra»</p>
          )}

          {fase === 'escuchando' && (
            <p className="hc3d__transcripcion">
              {palabras.slice(0, reducedMotion ? palabras.length : nPalabras).join(' ')}
              <span className="hc3d__cursor" aria-hidden="true" />
            </p>
          )}

          {fase === 'pensando' && (
            <p className="hc3d__estado-txt">Mirando cómo está su finca…</p>
          )}

          {fase === 'hablando' && (
            <p className="hc3d__respuesta">{RESPUESTA}</p>
          )}
        </div>
      )}

      {/* ── la respuesta cae como UNA acción concreta ── */}
      {fase === 'accion' && (
        <aside className="valle-panel valle-panel--alerta hc3d__accion" aria-live="polite">
          <span className="valle-panel__tag">Lo que sigue</span>
          <h2>Cubra el semillero hoy</h2>
          <p>{RESPUESTA}</p>
          <div className="valle-panel__acciones">
            <button type="button" className="valle-cta">{COSA_DEL_DIA.accion.etiqueta}</button>
            <button type="button" className="valle-ghost" onClick={repetir}>
              Repetir el momento
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}

/* Placeholder mientras baja el chunk 3D: el cielo del clima + un latido
   (reusa la piel .valle-cargando de la entrada 3D). */
function CargandoMundo({ clima }) {
  const c = CLIMAS[clima];
  return (
    <div
      className="valle-cargando"
      style={{ background: `linear-gradient(180deg, ${c.cielo[0]}, ${c.cielo[1]})` }}
    >
      <div className="valle-cargando__pulso" />
      <p>Despertando su finca…</p>
    </div>
  );
}
