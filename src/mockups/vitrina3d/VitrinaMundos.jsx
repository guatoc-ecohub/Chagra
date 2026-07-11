/*
 * VitrinaMundos — vitrina/galería de los MUNDOS 3D del valle (ruta pública
 * #/mockups/vitrina-mundos, sin auth). La hermana de la vitrina de criaturas
 * (#/mockups/vitrina-3d) y la de infraestructura (#/mockups/vitrina-infra),
 * pero para los MUNDOS del framework `src/visual/mundo3d`: el valle, el café,
 * la sanidad, el mercado, los animales, el semillero y el clima.
 *
 * Cada tarjeta previsualiza un mundo EN SU DIORAMA, encuadrado con la fotografía
 * curada de `camaraDioramas.js` (posición/target/fov propios por mundo), y trae
 * un botón «Entrar» que abre el mundo a pantalla completa con el host real
 * `<Mundo>` (hotspots tocables, abeja Angelita, caída digna a 2D). Nada se
 * reimplementa: se IMPORTA el framework tal cual (escenas + resolverEncuadre +
 * MUNDO + resolverMundo), sin editarlo.
 *
 * PERF — a lo sumo UN contexto WebGL vivo a la vez: solo la tarjeta ACTIVA monta
 * su diorama (las demás muestran un afiche con el tinte del mundo); y mientras el
 * modo «Entrar» a pantalla completa está abierto, las previsualizaciones no se
 * montan. Controles globales de detalle (device-tier) y de movimiento reducido,
 * como en las vitrinas hermanas. En equipo humilde la previsualización cae a la
 * ficha 2D digna del mundo (device-tiering real del framework).
 *
 * Estética: cuaderno de laboratorio andino. Crema tibia, tinta profunda, verde
 * páramo y el dorado de la hora dorada. Móvil-first (320px), autocontenido (cero
 * CDN/imágenes externas). Español de Colombia, en «usted».
 */
import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import Mundo, { permite3D } from '../../visual/mundo3d/index.js';
import { MUNDO } from '../../visual/mundo3d/mundoData.js';
import { resolverEncuadre } from '../../visual/mundo3d/camaraDioramas.js';
import { tinteDeMundo, tituloDeMundo, emojiDeMundo } from '../../visual/mundo3d/resolverMundo.js';
import './VitrinaMundos.css';

// Importadores PEREZOSOS de las escenas 3D (chunk `vendor-three`): el mapa se
// arma UNA vez a nivel de módulo, así cada componente tiene identidad estable
// (no se crea en el render → sin `react-hooks/static-components`). El import()
// solo dispara al montar la tarjeta activa.
const ESCENAS = {
  valle: lazy(() => import('../../visual/mundo3d/escenas/EscenaValle.jsx')),
  cafe: lazy(() => import('../../visual/mundo3d/escenas/EscenaCafe.jsx')),
  sanidad: lazy(() => import('../../visual/mundo3d/escenas/EscenaSanidad.jsx')),
  mercado: lazy(() => import('../../visual/mundo3d/escenas/EscenaMercado.jsx')),
  recinto: lazy(() => import('../../visual/mundo3d/escenas/EscenaRecinto.jsx')),
  semillero: lazy(() => import('../../visual/mundo3d/escenas/EscenaSemillero.jsx')),
  boveda: lazy(() => import('../../visual/mundo3d/escenas/EscenaBoveda.jsx')),
};

// Los siete mundos del valle con fotografía de diorama curada (ENCUADRES de
// camaraDioramas.js), en el orden en que se recorren. La copia es de ESTE
// archivo (una línea por mundo); el nombre/emoji/tinte se resuelven del
// framework para no duplicarlos (valle no vive en el manifiesto: lo rotulamos).
const MUNDOS = [
  { id: 'valle', texto: 'El valle entero como maqueta viva: cada lugar es un mundo al que puede entrar.' },
  { id: 'cafe', texto: 'El cafetal bajo sombra: la cereza que se vuelve pergamino y oro, la roya y el beneficio.' },
  { id: 'sanidad', texto: 'La huerta-clínica: trampas de color, biocontrol y enemigos naturales, sin veneno.' },
  { id: 'mercado', texto: 'El mercado campesino: la cadena corta del campo a la mesa, con precio justo.' },
  { id: 'animales', texto: 'El corral y su ciclo cerrado del abono: del animal a la tierra y de vuelta.' },
  { id: 'semillero', texto: 'El semillero: germinar, repicar y endurecer la matica bajo el túnel protegido.' },
  { id: 'clima', texto: 'La bóveda del cielo andino: la hora del día, las dos lluvias y el páramo que hace agua.' },
];

const TIERS = [
  { v: 'alto', label: 'Alto' },
  { v: 'medio', label: 'Medio' },
  { v: 'bajo', label: 'Bajo' },
];

// Valle no está en el manifiesto real (mundosFinca): su rótulo va aquí.
const ROTULO_VALLE = { titulo: 'El valle', emoji: '🗺️' };

const NOOP = () => {};

function rotuloDe(id) {
  if (id === 'valle') return ROTULO_VALLE;
  return { titulo: tituloDeMundo(id), emoji: emojiDeMundo(id) };
}

// ── Previsualización de UN mundo en su diorama (o su ficha 2D en gama baja) ───
function PreviewMundo({ mundoId, tier, reducedMotion }) {
  // Gama baja: el device-tier del framework decide 2D; montamos el host `<Mundo>`
  // que resuelve el espejo 2D digno del mundo (misma lección, sin WebGL).
  if (!permite3D(tier)) {
    return (
      <div className="vmun__lienzo vmun__lienzo--2d">
        <Mundo
          mundoId={mundoId}
          tier={tier}
          reducedMotion={reducedMotion}
          onHotspot={NOOP}
          onSalir={null}
          animo="sereno"
          energia={0.9}
        />
      </div>
    );
  }

  const d = MUNDO[mundoId];
  const Escena = ESCENAS[d?.escena];
  if (!Escena) return null;

  // El encuadre de DIORAMA curado (camaraDioramas.js): posición/target/fov
  // propios del mundo → la cámara inicial (y el reposo del director) del diorama.
  const enc = resolverEncuadre(mundoId, tier);

  return (
    <div className="vmun__lienzo">
      <Suspense fallback={<div className="vmun__loading">Preparando el mundo…</div>}>
        <Escena
          mundoId={mundoId}
          params={d.params}
          hotspots={d.hotspots}
          entrada={{ ...d.entrada, centro: enc.target }}
          tinte={tinteDeMundo(mundoId)}
          tier={tier}
          reducedMotion={reducedMotion}
          camara={{ position: enc.posicion, fov: enc.fov }}
          onHotspot={NOOP}
          animo="sereno"
          energia={0.9}
        />
      </Suspense>
    </div>
  );
}

// ── Tarjeta de un mundo (afiche → previsualización viva al activarla) ─────────
function TarjetaMundo({ mundoId, texto, activo, tier, reducedMotion, onActivar, onEntrar }) {
  const { titulo, emoji } = rotuloDe(mundoId);
  const [a, b] = tinteDeMundo(mundoId);

  return (
    <article className="vmun__card" style={{ '--a': a, '--b': b }}>
      <div className="vmun__stage">
        {activo ? (
          <PreviewMundo mundoId={mundoId} tier={tier} reducedMotion={reducedMotion} />
        ) : (
          <button
            type="button"
            className="vmun__poster"
            onClick={onActivar}
            aria-label={`Previsualizar ${titulo} en 3D`}
          >
            <span className="vmun__posterEmoji" aria-hidden="true">{emoji}</span>
            <span className="vmun__posterTxt">{titulo}</span>
            <span className="vmun__posterHint">Toque para verlo en 3D</span>
          </button>
        )}
      </div>

      <div className="vmun__meta">
        <h3 className="vmun__cardTitle">
          <span aria-hidden="true">{emoji}</span> {titulo}
        </h3>
        <p className="vmun__cardDesc">{texto}</p>
        <div className="vmun__acciones">
          {!activo && (
            <button type="button" className="vmun__prev" onClick={onActivar}>
              Previsualizar
            </button>
          )}
          <button type="button" className="vmun__entrar" onClick={onEntrar}>
            Entrar ›
          </button>
        </div>
      </div>
    </article>
  );
}

// ── Pantalla completa: el mundo real (host `<Mundo>` con hotspots + abeja) ────
function MundoPantalla({ mundoId, tier, reducedMotion, onSalir }) {
  const { titulo } = rotuloDe(mundoId);
  const [pista, setPista] = useState(null);
  const pistaTimer = useRef(null);

  const alHotspot = (view) => {
    // La vitrina no navega a vistas reales: acusa a dónde LLEVARÍA ese punto,
    // buscando su rótulo en los hotspots del mundo (dato del framework).
    const h = (MUNDO[mundoId]?.hotspots || []).find((x) => x.view === view);
    setPista(h ? h.label : null);
    if (pistaTimer.current) clearTimeout(pistaTimer.current);
    pistaTimer.current = setTimeout(() => setPista(null), 3200);
  };

  return (
    <div className="vmun__full" role="dialog" aria-modal="true" aria-label={titulo}>
      <button type="button" className="vmun__salir" onClick={onSalir} aria-label="Salir del mundo">
        ✕
      </button>
      <div className="vmun__fullStage">
        <Mundo
          mundoId={mundoId}
          tier={tier}
          reducedMotion={reducedMotion}
          onHotspot={alHotspot}
          onSalir={onSalir}
          animo="sereno"
          energia={0.9}
        />
      </div>
      <p className="vmun__pista" role="status" aria-live="polite">
        {pista
          ? `Este punto lo llevaría a: ${pista}`
          : 'Toque un punto del mundo para ver a dónde lo lleva. Toque «‹ El valle» o la ✕ para volver.'}
      </p>
    </div>
  );
}

// ── La vitrina ───────────────────────────────────────────────────────────────
export default function VitrinaMundos({ onBack }) {
  const [tier, setTier] = useState('alto');
  const [reducedMotion, setReducedMotion] = useState(false);
  // Cuál tarjeta tiene el diorama vivo (a lo sumo una) y cuál mundo está abierto
  // a pantalla completa. Con `entrado` activo NO se monta ninguna previsualización.
  const [activo, setActivo] = useState('valle');
  const [entrado, setEntrado] = useState(null);

  const rotEntrado = useMemo(() => (entrado ? rotuloDe(entrado) : null), [entrado]);

  return (
    <div className="vmun" data-tier={tier}>
      <header className="vmun__head">
        <div className="vmun__headMain">
          <button type="button" className="vmun__back" onClick={() => onBack?.()}>
            ← Volver
          </button>
          <div>
            <p className="vmun__kicker">Los mundos de su valle · vitrina</p>
            <h1 className="vmun__title">Vitrina de mundos 3D</h1>
            <p className="vmun__sub">
              Previsualice cada mundo del valle en su diorama y entre a recorrerlo.
              Toque un mundo para verlo en 3D; toque «Entrar» para meterse, con la
              abeja Angelita y los puntos tocables.
            </p>
          </div>
        </div>

        <div className="vmun__controls" role="group" aria-label="Controles globales">
          <div className="vmun__ctl">
            <span className="vmun__ctlLabel">Detalle</span>
            <div className="vmun__segmented">
              {TIERS.map((t) => (
                <button
                  key={t.v}
                  type="button"
                  className={`vmun__seg${tier === t.v ? ' is-on' : ''}`}
                  onClick={() => setTier(t.v)}
                  aria-pressed={tier === t.v}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <label className="vmun__toggle">
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => setReducedMotion(e.target.checked)}
            />
            <span>Movimiento reducido</span>
          </label>
        </div>
      </header>

      <main className="vmun__body">
        <div className="vmun__grid">
          {MUNDOS.map((m) => (
            <TarjetaMundo
              key={m.id}
              mundoId={m.id}
              texto={m.texto}
              activo={!entrado && activo === m.id}
              tier={tier}
              reducedMotion={reducedMotion}
              onActivar={() => setActivo(m.id)}
              onEntrar={() => setEntrado(m.id)}
            />
          ))}
        </div>
        <p className="vmun__pie">
          Cada mundo es un lugar del valle. En equipo humilde o con «movimiento
          reducido», la previsualización cae a la ficha 2D digna del mundo: la
          misma lección, sin exigirle 3D al equipo.
        </p>
      </main>

      {entrado && (
        <MundoPantalla
          key={`${entrado}-${tier}`}
          mundoId={entrado}
          tier={tier}
          reducedMotion={reducedMotion}
          onSalir={() => setEntrado(null)}
        />
      )}

      {/* Rótulo accesible del mundo abierto (fuera de foco visual). */}
      {rotEntrado && <span className="vmun__sr">{rotEntrado.titulo}</span>}
    </div>
  );
}
