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
  animoDeFinca,
  NARRACION,
} from './valle/valleData';
import Valle2DFallback from './valle/Valle2DFallback';
import { AbejaAngelita } from '../visual/creatures/AbejaAngelita.jsx';

// La escena 3D pesada (three/fiber/drei) en su PROPIO chunk perezoso.
const Valle3D = lazy(() => import('./valle/Valle3D'));

/**
 * DEVICE-TIERING REAL. La 3D es ASPIRACIONAL (gama media+). No basta con
 * preguntar "¿hay WebGL?": un teléfono humilde tiene WebGL pero sufre jank y
 * calor. Entonces degradamos a la 2D DIGNA también por señales de equipo débil:
 * poca RAM, pocos núcleos, ahorro de datos o preferencia de menos movimiento.
 * Devuelve { modo: '2d' | '3d', motivo } — el motivo ajusta el aviso al usuario.
 */
function decidirRender() {
  if (typeof window === 'undefined') return { modo: '2d', motivo: 'ssr' };
  /* `deviceMemory` y `connection` son APIs experimentales que la lib de tipos
     del DOM aún no declara; se tipan aquí como opcionales (sin `any`). */
  const nav =
    /** @type {Navigator & { deviceMemory?: number, connection?: { saveData?: boolean }, mozConnection?: { saveData?: boolean }, webkitConnection?: { saveData?: boolean } }} */ (
      window.navigator
    );

  // 1) WebGL es requisito DURO del render 3D.
  let webgl = false;
  try {
    const canvas = document.createElement('canvas');
    webgl = !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    webgl = false;
  }
  if (!webgl) return { modo: '2d', motivo: 'sin-webgl' };

  // 2) Equipos humildes → 2D (no los ponemos a sudar la GPU).
  const mem = nav.deviceMemory; // GiB aprox. (Chrome/Android); undefined en otros
  if (typeof mem === 'number' && mem > 0 && mem <= 3) return { modo: '2d', motivo: 'equipo' };

  const nucleos = nav.hardwareConcurrency;
  if (typeof nucleos === 'number' && nucleos > 0 && nucleos <= 4) {
    return { modo: '2d', motivo: 'equipo' };
  }

  // 3) El usuario pidió ahorrar datos o menos movimiento → respetarlo.
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  if (conn && conn.saveData) return { modo: '2d', motivo: 'ahorro' };

  const menosMov =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (menosMov) return { modo: '2d', motivo: 'calma' };

  return { modo: '3d', motivo: 'ok' };
}

/* Aviso sobrio de por qué se ve la versión dibujada (nunca "error"). */
const MENSAJE_DEGRADADO = {
  calma: 'Le mostramos el valle en calma, sin movimiento. La finca sigue completa.',
  ahorro: 'Modo ahorro de datos: le mostramos el valle dibujado. La finca sigue completa.',
  default: 'Su equipo ve la versión dibujada del valle. La finca sigue completa.',
};

export default function EntradaValle3D({ onBack }) {
  const [clima, setClima] = useState(() => climaPorHora());
  const [focoId, setFocoId] = useState(null);
  const [panel, setPanel] = useState(null); // null | 'alerta' | <mundoId>
  const [voz, setVoz] = useState(true);
  const [alertaVista, setAlertaVista] = useState(false); // ¿ya atendió lo del día?
  const [render] = useState(decidirRender);
  const usa3D = render.modo === '3d';

  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  // ── El compañero (Angelita): su ánimo/energía salen del estado REAL de la
  //    finca + el clima + si lo del día sigue sin atender. Cuidar la alerta la
  //    calma (bucle de cuidado, sin puntos ni medallas).
  const companero = useMemo(
    () => animoDeFinca(clima, { hayAlerta: !alertaVista }),
    [clima, alertaVista],
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
    setAlertaVista(true); // atender lo del día calma a la abeja
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
      {/* fondo/atmósfera 3D o su degradación 2D (según el tiering del equipo) */}
      <div className="valle-escena">
        {usa3D ? (
          <Suspense fallback={<CargandoValle clima={clima} />}>
            <Valle3D
              clima={clima}
              focoId={focoId}
              animo={companero.animo}
              energia={companero.energia}
              onEntrar={entrarMundo}
              onAlerta={abrirAlerta}
              reducedMotion={reducedMotion}
            />
          </Suspense>
        ) : (
          <Valle2DFallback
            clima={clima}
            focoId={focoId}
            animo={companero.animo}
            energia={companero.energia}
            reducedMotion={reducedMotion}
            onEntrar={entrarMundo}
            onAlerta={abrirAlerta}
          />
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

      {/* ── Modo dibujado (tiering): aviso sobrio, nunca "error" ── */}
      {!usa3D && (
        <p className="valle-degradado" role="status">
          {MENSAJE_DEGRADADO[render.motivo] || MENSAJE_DEGRADADO.default}
        </p>
      )}

      {/* ── El compañero: Angelita en una sola línea puntual (imagen-first).
              Es el ser al que se cuida; su cara refleja el ánimo real. Se
              esconde si hay un panel abierto — una cosa clara a la vez. ── */}
      {!panel && (
        <div className="valle-companero" role="status" aria-live="polite">
          <span className="valle-companero__cara" aria-hidden="true">
            <AbejaAngelita size={34} animo={companero.animo} energia={companero.energia} animated={!reducedMotion} />
          </span>
          <span className="valle-companero__txt">{companero.frase}</span>
        </div>
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
