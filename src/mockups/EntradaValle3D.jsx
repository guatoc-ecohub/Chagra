/*
 * MOCKUP "El valle de mi finca" — ruta #/mockups/entrada-3d.
 *
 * LA ENTRADA DEFINITIVA, dirección #2 (sin límites) del DR
 * DR-ENTRADA-DEFINITIVA-2026-07-10.md: un DIORAMA 3D ISOMÉTRICO del valle real
 * de la finca, navegable, donde los 4 sí-o-sí de Chagra viven en el ESPACIO —
 * no un menú, sino un lugar. "Bruno Simon, pero es su finca y sí sirve":
 * spatial UI grounded con PROPÓSITO, no wow vacío.
 *
 * LOS 4 SÍ-O-SÍ, ANCLADOS EN EL VALLE
 *   1. ALERTA / qué-hacer-hoy → un SOLO faro que brilla sobre el lugar donde
 *      toca (el semillero). Tocarlo: el agente lo dice en voz y ofrece LA acción.
 *   2. LOS MUNDOS → cada mundo (fuente real mundosFinca.js) es un LUGAR del
 *      valle al que se VIAJA: la cámara vuela hasta él y se abre su panel.
 *   3. AGENTE / VOZ → el colibrí (visual-lib) es un compañero presente que
 *      flota sobre el foco y NARRA por voz (Web Speech API) al pasar.
 *   4. ESTADO / CLIMA → el estado real (por la hora de la vereda) tiñe todo:
 *      luz, niebla, cielo y estrellas de la escena 3D + grade DOM de effects.
 *
 * STACK (DR §2): React-Three-Fiber sobre WebGL 2 (línea base). La escena 3D se
 * carga PEREZOSO y en su propio chunk (no infla el bundle base). WebGPU sería
 * mejora opcional (nunca requisito). Si NO hay WebGL → degrada LIMPIO a una
 * entrada digna en SVG+CSS (Valle2DFallback), con los mismos 4 sí-o-sí.
 * Offline-first: cero GLTF/HDR/fuentes remotas, todo procedural.
 *
 * Copy de muestra en español Colombia (usted); si se productiza, migra a
 * messages.js (ADR-050).
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../visual/effects/effects.css';
import './entradaValle3D.css';
import {
  MUNDO_VALLE_BY_ID,
  COSA_DEL_DIA,
  CLIMAS,
  ORDEN_CLIMA,
  climaPorHora,
  NARRACION,
} from './valle/valleData';
import Valle2DFallback from './valle/Valle2DFallback';

// La escena 3D pesada (three/fiber/drei) en su PROPIO chunk perezoso.
const Valle3D = lazy(() => import('./valle/Valle3D'));

/** ¿El equipo soporta WebGL? (línea base del render 3D). */
function soportaWebGL() {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

export default function EntradaValle3D({ onBack }) {
  const [clima, setClima] = useState(() => climaPorHora());
  const [focoId, setFocoId] = useState(null);
  const [panel, setPanel] = useState(null); // null | 'alerta' | <mundoId>
  const [voz, setVoz] = useState(true);
  const [webgl] = useState(() => soportaWebGL());

  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  // ── Voz (Web Speech API): el agente DICE. Se calla si el equipo no la trae
  //    o si el usuario apaga la voz. Prefiere una voz en español.
  const hablar = useCallback(
    (texto) => {
      if (!voz || typeof window === 'undefined' || !window.speechSynthesis) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(texto);
        u.lang = 'es-CO';
        u.rate = 0.98;
        u.pitch = 1;
        const esVoz = window.speechSynthesis
          .getVoices()
          .find((v) => v.lang && v.lang.toLowerCase().startsWith('es'));
        if (esVoz) u.voice = esVoz;
        window.speechSynthesis.speak(u);
      } catch {
        /* la voz es un plus, nunca bloquea */
      }
    },
    [voz],
  );

  useEffect(
    () => () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    },
    [],
  );

  // Saludo del compañero al entrar (una sola vez).
  const saludado = useRef(false);
  useEffect(() => {
    if (saludado.current) return;
    saludado.current = true;
    const t = setTimeout(() => hablar(NARRACION.bienvenida), 900);
    return () => clearTimeout(t);
  }, [hablar]);

  const entrarMundo = useCallback(
    (id) => {
      setFocoId(id);
      setPanel(id);
      hablar(NARRACION[id] || MUNDO_VALLE_BY_ID[id]?.lema || '');
    },
    [hablar],
  );

  const abrirAlerta = useCallback(() => {
    setFocoId(COSA_DEL_DIA.anclaMundo);
    setPanel('alerta');
    hablar(COSA_DEL_DIA.vozTexto);
  }, [hablar]);

  const volverAlValle = useCallback(() => {
    setFocoId(null);
    setPanel(null);
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  const mundoPanel = panel && panel !== 'alerta' ? MUNDO_VALLE_BY_ID[panel] : null;

  return (
    <div className="valle-root" data-clima={clima}>
      {/* fondo/atmósfera 3D o su degradación 2D */}
      <div className="valle-escena">
        {webgl ? (
          <Suspense fallback={<CargandoValle clima={clima} />}>
            <Valle3D
              clima={clima}
              focoId={focoId}
              onEntrar={entrarMundo}
              onAlerta={abrirAlerta}
              reducedMotion={reducedMotion}
            />
          </Suspense>
        ) : (
          <Valle2DFallback clima={clima} onEntrar={entrarMundo} onAlerta={abrirAlerta} />
        )}
      </div>

      {/* ── Encabezado: el nombre del lugar + el selector de clima (estado) ── */}
      <header className="valle-header">
        <button type="button" className="valle-back" onClick={() => onBack?.()} aria-label="Volver">
          ‹ Volver
        </button>
        <div className="valle-titulo">
          <span className="valle-titulo__eyebrow">Su finca, hoy</span>
          <h1>El valle de mi finca</h1>
        </div>
        <div className="valle-clima" role="group" aria-label="Estado del clima de la vereda">
          {ORDEN_CLIMA.map((k) => (
            <button
              key={k}
              type="button"
              className={`valle-clima__chip${clima === k ? ' valle-clima__chip--on' : ''}`}
              aria-pressed={clima === k}
              onClick={() => setClima(k)}
            >
              {CLIMAS[k].etiqueta}
            </button>
          ))}
        </div>
      </header>

      {/* ── Sin WebGL: aviso sobrio de que se ve la versión dibujada ── */}
      {!webgl && (
        <p className="valle-degradado" role="status">
          Su equipo ve la versión dibujada del valle. La finca sigue completa.
        </p>
      )}

      {/* ── Panel de la ALERTA (la cosa del día): UNA acción clara ── */}
      {panel === 'alerta' && (
        <aside className="valle-panel valle-panel--alerta" aria-live="polite">
          <button type="button" className="valle-panel__x" onClick={volverAlValle} aria-label="Cerrar">×</button>
          <span className="valle-panel__tag">⚠️ Lo del día</span>
          <h2>{COSA_DEL_DIA.titulo}</h2>
          <p>{COSA_DEL_DIA.detalle}</p>
          <div className="valle-panel__acciones">
            <button type="button" className="valle-cta">{COSA_DEL_DIA.accion.etiqueta}</button>
            <button type="button" className="valle-ghost" onClick={() => hablar(COSA_DEL_DIA.vozTexto)}>
              🔊 Escuchar
            </button>
          </div>
        </aside>
      )}

      {/* ── Panel de un MUNDO (lugar al que se viajó) ── */}
      {mundoPanel && (
        <aside className="valle-panel valle-panel--mundo" aria-live="polite" style={{ '--m-tinte': mundoPanel.tinte[0] }}>
          <button type="button" className="valle-panel__x" onClick={volverAlValle} aria-label="Cerrar">×</button>
          <span className="valle-panel__tag">
            <span aria-hidden="true">{mundoPanel.emoji}</span> Mundo
          </span>
          <h2>{mundoPanel.titulo}</h2>
          <p>{mundoPanel.lema}</p>
          <div className="valle-panel__acciones">
            <button type="button" className="valle-cta">Entrar a este mundo</button>
            <button type="button" className="valle-ghost" onClick={() => hablar(NARRACION[mundoPanel.id] || mundoPanel.lema)}>
              🔊 Escuchar
            </button>
          </div>
        </aside>
      )}

      {/* ── Barra del AGENTE: el compañero presente + voz + volver al valle ── */}
      <footer className="valle-agente">
        <button type="button" className="valle-agente__pregunte" aria-label="Pregúntele a Chagra">
          <span className="valle-agente__punto" aria-hidden="true" />
          Pregúntele a su finca…
        </button>
        <div className="valle-agente__ctrls">
          {focoId && (
            <button type="button" className="valle-agente__btn" onClick={volverAlValle}>
              Ver todo el valle
            </button>
          )}
          <button
            type="button"
            className={`valle-agente__btn valle-agente__voz${voz ? ' on' : ''}`}
            aria-pressed={voz}
            onClick={() => {
              const n = !voz;
              setVoz(n);
              if (!n && typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
            }}
          >
            {voz ? '🔊 Voz' : '🔇 Voz'}
          </button>
        </div>
      </footer>
    </div>
  );
}

/* Placeholder mientras baja el chunk 3D: el cielo del clima + un latido. */
function CargandoValle({ clima }) {
  const c = CLIMAS[clima];
  return (
    <div
      className="valle-cargando"
      style={{ background: `linear-gradient(180deg, ${c.cielo[0]}, ${c.cielo[1]})` }}
    >
      <div className="valle-cargando__pulso" />
      <p>Levantando su finca…</p>
    </div>
  );
}
