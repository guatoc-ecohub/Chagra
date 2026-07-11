/*
 * MOCKUP "Mundo 3D — el suelo vivo" — ruta #/mockups/mundo3d-suelo.
 *
 * El PROTOTIPO del framework de mundos-3D (DR-MUNDOS-3D-FRAMEWORK-2026-07-10):
 * la escena-mundo `cutaway` del SUELO, la primera "capa cercana" del valle. Un
 * corte de tierra que se PUEBLA de vida (lombrices, raíces, hifas) a medida que
 * la tierra revive — "lo invisible hecho visible", el caso de libro del 3D
 * pedagógico. Reusa el motor existente (mundoSubsueloEngine) para el `score`.
 *
 * ESTE ARCHIVO ES SOLO EL HOST (la "página"): decide 3D vs lámina 2D con el
 * gate de device-tiering, narra por voz (nombra el tema primero), y RE-RUTEA
 * cada hotspot a su pantalla 2D REAL (nunca la reimplementa). La escena, los
 * arquetipos y los datos viven en src/mockups/valle/*.
 *
 * Copy de muestra en español Colombia (usted); si se productiza migra a
 * messages.js (ADR-050).
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../visual/effects/effects.css';
import './valle/mundo3d.css';
import { decidirRender } from './valle/decidirRender';
import { metaMundo, MUNDO_3D } from './valle/mundo3dData';
import { NARRACION } from './valle/valleData';
import Mundo2D from './valle/Mundo2D';
import { BASE_SOIL_LIFE } from '../components/juego/mundoSubsueloData';
import { evaluarSubsuelo } from '../services/mundoSubsueloEngine';

// La escena 3D pesada (three/fiber/drei) en su PROPIO chunk perezoso.
const Mundo3D = lazy(() => import('./valle/Mundo3D'));

export default function EntradaMundo3D({ mundoId = 'suelo', onBack, onNavigate }) {
  const meta = useMemo(() => metaMundo(mundoId), [mundoId]);
  const datos = MUNDO_3D[mundoId];

  // El gate de device-tiering decide una sola vez al montar.
  const [gate] = useState(() => decidirRender());
  const [voz, setVoz] = useState(true);

  // "Vida del suelo" (0–100) del motor existente → controla cuánta vida se ve.
  const [vidaPct, setVidaPct] = useState(BASE_SOIL_LIFE);
  const est = useMemo(() => evaluarSubsuelo(vidaPct), [vidaPct]);
  const vida01 = est.vida / 100;

  // ── Voz (Web Speech API): nombra el tema PRIMERO. Plus, nunca bloquea. ──
  const hablar = useCallback(
    (texto) => {
      if (!voz || !texto || typeof window === 'undefined' || !window.speechSynthesis) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(texto);
        u.lang = 'es-CO';
        u.rate = 0.98;
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

  // Al entrar: la voz nombra el tema (NARRACION[narra]) una sola vez.
  const saludado = useRef(false);
  useEffect(() => {
    if (saludado.current) return;
    saludado.current = true;
    const texto = NARRACION[datos?.entrada?.narra] || meta.lema;
    const t = setTimeout(() => hablar(texto), 900);
    return () => clearTimeout(t);
  }, [hablar, datos, meta.lema]);

  // Cada hotspot RE-RUTEA a su pantalla 2D real (regla de oro: no reimplementa).
  const irAHotspot = useCallback(
    (view, data) => {
      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
      if (view && onNavigate) onNavigate(view, data);
    },
    [onNavigate],
  );

  const etapaLabel = est.etapa; // 'cansado' | 'en cuidado' | 'despertando' | 'vivo'

  return (
    <div className="mundo3d-root" style={{ '--m-tinte': meta.tinte[0], '--m-tinte-suave': meta.tinte[1] }}>
      {/* fondo/atmósfera 3D o su lámina 2D digna */}
      <div className="mundo3d-escena">
        {gate.render3d ? (
          <Suspense fallback={<CargandoMundo />}>
            <Mundo3D
              mundoId={mundoId}
              tier={gate.tier}
              reducedMotion={gate.reducedMotion}
              vida01={vida01}
              onHotspot={irAHotspot}
            />
          </Suspense>
        ) : (
          <Mundo2D mundoId={mundoId} vida01={vida01} onHotspot={irAHotspot} />
        )}
      </div>

      {/* ── Encabezado: el nombre del mundo + Volver ── */}
      <header className="mundo3d-header">
        <button type="button" className="mundo3d-back" onClick={() => onBack?.()} aria-label="Volver">
          ‹ Volver
        </button>
        <div className="mundo3d-titulo">
          <span className="mundo3d-titulo__eyebrow">
            <span aria-hidden="true">{meta.emoji}</span> Su suelo, por dentro
          </span>
          <h1>{meta.titulo}</h1>
        </div>
        <button
          type="button"
          className={`mundo3d-voz${voz ? ' on' : ''}`}
          aria-pressed={voz}
          onClick={() => {
            const n = !voz;
            setVoz(n);
            if (!n && typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
          }}
        >
          {voz ? '🔊 Voz' : '🔇 Voz'}
        </button>
      </header>

      {/* ── Sin 3D: aviso sobrio de que se ve la versión dibujada ── */}
      {!gate.render3d && (
        <p className="mundo3d-degradado" role="status">
          Su equipo ve la versión dibujada del corte. El suelo sigue completo.
        </p>
      )}

      {/* ── Control: la vida del suelo (mismo concepto del juego) puebla el corte ── */}
      <aside className="mundo3d-control" aria-label="Vida del suelo">
        <div className="mundo3d-control__cab">
          <span className="mundo3d-control__lbl">Vida del suelo</span>
          <span className="mundo3d-control__etapa" data-etapa={etapaLabel}>{etapaLabel}</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={vidaPct}
          onChange={(e) => setVidaPct(Number(e.target.value))}
          aria-label="Mueva para ver cómo despierta o se cansa la vida del suelo"
        />
        <p className="mundo3d-control__ayuda">
          Al abonar, cubrir y no labrar, la tierra revive y aparece la vida bajo el suelo.
        </p>
      </aside>
    </div>
  );
}

/* Placeholder mientras baja el chunk 3D. */
function CargandoMundo() {
  return (
    <div className="mundo3d-cargando">
      <div className="mundo3d-cargando__pulso" />
      <p>Abriendo el corte de su suelo…</p>
    </div>
  );
}
