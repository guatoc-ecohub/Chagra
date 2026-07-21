/*
 * VitrinaCriaturas — vitrina/showcase de los componentes visuales nuevos que
 * quedaron en `src/visual/` sin cablear a una pantalla real. Ruta pública
 * #/mockups/vitrina-3d (sin auth), pensada para que el operador los vea vivos
 * y dé feedback.
 *
 * Monta —sin editarlos— las piezas nuevas, agrupadas en secciones navegables:
 *   · Criaturas rubber-hose (SVG): mariquita, abejorro, lombriz, escarabajo,
 *     abeja angelita, espíritu guardián.
 *   · Micro-fauna del suelo (3D): el diorama del suelo vivo.
 *   · Ciclo de vida (3D): la mata de sembrar a cosecha.
 *   · Clima y efectos (3D): escarcha/helada + valle en calma.
 *   · Estados y guías (DOM): hilo de vida narrado + onboarding "descubrir".
 *
 * Cada sección trae controles para variar props (device-tier, movimiento
 * reducido, estado, especie, ánimo…). Solo se monta la sección activa, así que
 * a lo sumo un Canvas de three vive a la vez (amable con la gama baja).
 *
 * Estética: cuaderno de laboratorio andino. Crema tibia, tinta profunda,
 * verde páramo. Mobile-first, autocontenido (cero enlaces/imágenes externas).
 */
import { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';

// Criaturas rubber-hose (SVG puro, sin three)
import {
  MariquitaRubber,
  AbejorroRubber,
  LombrizRubber,
  EscarabajoRubber,
} from '../../visual/creatures/FaunaRubberhose.jsx';
import { AbejaAngelita } from '../../visual/creatures/AbejaAngelita.jsx';
import { EspirituGuardian } from '../../visual/creatures/EspirituGuardian.jsx';

// Mundos 3D — traen su propio <Canvas> adentro
import MicrofaunaSuelo from '../../visual/mundo3d/MicrofaunaSuelo.jsx';
import CicloMata from '../../visual/mundo3d/CicloMata.jsx';
import ValleEnCalma from '../../visual/mundo3d/ValleEnCalma.jsx';

// Efecto 3D — es un grupo <three>, necesita un Canvas anfitrión (lo ponemos aquí)
import EscarchaHelada from '../../visual/mundo3d/EscarchaHelada.jsx';

// Capas DOM (cero three)
import HiloVidaVista from '../../visual/mundo3d/HiloVidaVista.jsx';
import OnboardingDescubrir from '../../visual/mundo3d/OnboardingDescubrir.jsx';

import './VitrinaCriaturas.css';

// ── Config de secciones (para la barra de navegación) ────────────────────────
const SECCIONES = [
  { id: 'criaturas', emoji: '🐞', label: 'Criaturas rubber-hose' },
  { id: 'microfauna', emoji: '🪱', label: 'Micro-fauna del suelo' },
  { id: 'ciclo', emoji: '🌱', label: 'Ciclo de vida' },
  { id: 'clima', emoji: '❄️', label: 'Clima y efectos' },
  { id: 'estados', emoji: '🫧', label: 'Estados y guías' },
];

const TIERS = [
  { v: 'alto', label: 'Alto' },
  { v: 'medio', label: 'Medio' },
  { v: 'bajo', label: 'Bajo' },
];

const ESTADOS_GUARDIAN = [
  { v: 'sereno', label: 'Sereno' },
  { v: 'alerta', label: 'Alerta' },
  { v: 'celebrando', label: 'Celebrando' },
];

const ESPECIES = [
  { v: 'tomate', label: 'Tomate' },
  { v: 'frijol', label: 'Fríjol' },
  { v: 'maiz', label: 'Maíz' },
  { v: 'generico', label: 'La mata' },
];

const ANIMOS_ABEJA = [
  { v: 'pleno', label: 'Pleno' },
  { v: 'sereno', label: 'Sereno' },
  { v: 'atento', label: 'Atento' },
  { v: 'sediento', label: 'Sediento' },
  { v: 'descansa', label: 'Descansa' },
];

// Paradas de ejemplo para el onboarding "descubrir" (datos ficticios de demo)
const HOTSPOTS_DEMO = [
  { id: 'huerta', label: 'La huerta', emoji: '🥬', tinte: '#3f8f4e', pista: 'Aquí crecen sus hortalizas del día a día.' },
  { id: 'agua', label: 'El nacimiento', emoji: '💧', tinte: '#2f7fb0', pista: 'El agua que nace y recorre su terreno.' },
  { id: 'bosque', label: 'El bosque', emoji: '🌳', tinte: '#2f6d43', pista: 'La sombra alta que protege el suelo.' },
];

// ── Piezas presentacionales de la vitrina ────────────────────────────────────
function Chip({ children }) {
  return <span className="vitrina__chip">{children}</span>;
}

function DemoCard({ titulo, descripcion, props: propList = [], variante, children }) {
  return (
    <article className={`vitrina__card${variante ? ` vitrina__card--${variante}` : ''}`}>
      <div className="vitrina__stage">{children}</div>
      <div className="vitrina__meta">
        <h3 className="vitrina__cardTitle">{titulo}</h3>
        {descripcion && <p className="vitrina__cardDesc">{descripcion}</p>}
        {propList.length > 0 && (
          <div className="vitrina__chips">
            {propList.map((p) => (
              <Chip key={p}>{p}</Chip>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

// Anfitrión three para el efecto de escarcha (que es un grupo, no una escena).
function EscarchaDemo({ tier, reducedMotion, intensidad }) {
  return (
    <Canvas
      className="vitrina__lienzo"
      dpr={tier === 'bajo' ? [1, 1] : [1, 1.5]}
      camera={{ position: [0, 2.6, 5.4], fov: 44 }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      gl={{ antialias: tier !== 'bajo', powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#d7e6f2']} />
      <hemisphereLight intensity={0.95} color="#eaf3ff" groundColor="#8ea4b8" />
      <directionalLight position={[3, 6, 4]} intensity={0.7} color="#ffffff" />
      <ambientLight intensity={0.4} color="#eef4ff" />
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]}>
        <circleGeometry args={[3.2, 56]} />
        <meshStandardMaterial color="#6f8a6a" roughness={0.95} />
      </mesh>
      <EscarchaHelada
        intensidad={intensidad}
        tier={tier}
        reducedMotion={reducedMotion}
        area={2.9}
        altura={0}
      />
      <OrbitControls
        makeDefault
        enablePan={false}
        target={[0, 0.2, 0]}
        minDistance={3.6}
        maxDistance={9}
        minPolarAngle={0.3}
        maxPolarAngle={1.45}
        enableDamping
        dampingFactor={0.09}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.2}
      />
      <AdaptiveDpr pixelated />
    </Canvas>
  );
}

// ── Vitrina ──────────────────────────────────────────────────────────────────
export default function VitrinaCriaturas({ onBack }) {
  const [seccion, setSeccion] = useState('criaturas');
  const [tier, setTier] = useState('alto');
  const [reducedMotion, setReducedMotion] = useState(false);

  // controles locales por sección
  const [guardianEstado, setGuardianEstado] = useState('sereno');
  const [guardianEnergia, setGuardianEnergia] = useState(1);
  const [especie, setEspecie] = useState('tomate');
  const [abejaAnimo, setAbejaAnimo] = useState('sereno');
  const [abejaMojada, setAbejaMojada] = useState(false);
  const [abejaSed, setAbejaSed] = useState(false);
  const [escarchaIntensidad, setEscarchaIntensidad] = useState(0.7);
  const [onbKey, setOnbKey] = useState(0);

  const animated = !reducedMotion;

  return (
    <div className="vitrina" data-tier={tier}>
      {/* Cabecera */}
      <header className="vitrina__head">
        <div className="vitrina__headMain">
          <button type="button" className="vitrina__back" onClick={() => onBack?.()}>
            ← Volver
          </button>
          <div>
            <h1 className="vitrina__title">Vitrina de criaturas y mundos</h1>
            <p className="vitrina__sub">
              Los componentes visuales nuevos, vivos y con controles. Toque para
              variar el detalle, el movimiento y el estado.
            </p>
          </div>
        </div>

        {/* Controles globales */}
        <div className="vitrina__controls" role="group" aria-label="Controles globales">
          <div className="vitrina__ctl">
            <span className="vitrina__ctlLabel">Detalle</span>
            <div className="vitrina__segmented">
              {TIERS.map((t) => (
                <button
                  key={t.v}
                  type="button"
                  className={`vitrina__seg${tier === t.v ? ' is-on' : ''}`}
                  onClick={() => setTier(t.v)}
                  aria-pressed={tier === t.v}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <label className="vitrina__toggle">
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => setReducedMotion(e.target.checked)}
            />
            <span>Movimiento reducido</span>
          </label>
        </div>

        {/* Navegación de secciones */}
        <nav className="vitrina__tabs" aria-label="Secciones de la vitrina">
          {SECCIONES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`vitrina__tab${seccion === s.id ? ' is-on' : ''}`}
              onClick={() => setSeccion(s.id)}
              aria-pressed={seccion === s.id}
            >
              <span aria-hidden="true">{s.emoji}</span> {s.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="vitrina__body">
        {/* ── Criaturas rubber-hose ─────────────────────────────────────── */}
        {seccion === 'criaturas' && (
          <section className="vitrina__section" aria-label="Criaturas rubber-hose">
            <div className="vitrina__grid">
              <DemoCard
                titulo="Mariquita"
                descripcion="Control natural de plagas. Squash-and-stretch al posarse."
                props={['size', 'tier', 'animated', 'look', 'mostrarRol']}
                variante="creature"
              >
                <MariquitaRubber size={108} tier={tier} animated={animated} mostrarRol className="" />
              </DemoCard>

              <DemoCard
                titulo="Abejorro"
                descripcion="Polinizador robusto de zumbido lento."
                props={['size', 'tier', 'animated', 'mostrarRol']}
                variante="creature"
              >
                <AbejorroRubber size={112} tier={tier} animated={animated} mostrarRol className="" />
              </DemoCard>

              <DemoCard
                titulo="Lombriz"
                descripcion="Airea el suelo. Cuerpo de manguera que se ondula."
                props={['size', 'tier', 'animated', 'mostrarRol']}
                variante="creature"
              >
                <LombrizRubber size={112} tier={tier} animated={animated} mostrarRol className="" />
              </DemoCard>

              <DemoCard
                titulo="Escarabajo"
                descripcion="Descompone la materia y devuelve humus al suelo."
                props={['size', 'tier', 'animated', 'mostrarRol']}
                variante="creature"
              >
                <EscarabajoRubber size={112} tier={tier} animated={animated} mostrarRol className="" />
              </DemoCard>

              <DemoCard
                titulo="Abeja angelita"
                descripcion="Meliponino local. Reacciona al ánimo, a la lluvia y a la sed."
                props={['size', 'animated', 'animo', 'energia', 'mojada', 'sed']}
                variante="creature"
              >
                <div className="vitrina__creatureWrap">
                  <AbejaAngelita
                    size={116}
                    animated={animated}
                    animo={abejaAnimo}
                    energia={0.9}
                    mojada={abejaMojada}
                    sed={abejaSed}
                  />
                </div>
                <div className="vitrina__localCtl">
                  <label className="vitrina__field">
                    <span>Ánimo</span>
                    <select value={abejaAnimo} onChange={(e) => setAbejaAnimo(e.target.value)}>
                      {ANIMOS_ABEJA.map((a) => (
                        <option key={a.v} value={a.v}>{a.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="vitrina__mini">
                    <input type="checkbox" checked={abejaMojada} onChange={(e) => setAbejaMojada(e.target.checked)} />
                    <span>Lluvia</span>
                  </label>
                  <label className="vitrina__mini">
                    <input type="checkbox" checked={abejaSed} onChange={(e) => setAbejaSed(e.target.checked)} />
                    <span>Sed</span>
                  </label>
                </div>
              </DemoCard>

              <DemoCard
                titulo="Espíritu guardián"
                descripcion="El acompañante de su finca. Su gesto cambia con el estado."
                props={['size', 'tier', 'estado', 'energia', 'reducedMotion']}
                variante="creature"
              >
                <div className="vitrina__creatureWrap">
                  <EspirituGuardian
                    size={124}
                    tier={tier}
                    animated={animated}
                    reducedMotion={reducedMotion}
                    estado={guardianEstado}
                    energia={guardianEnergia}
                  />
                </div>
                <div className="vitrina__localCtl">
                  <label className="vitrina__field">
                    <span>Estado</span>
                    <select value={guardianEstado} onChange={(e) => setGuardianEstado(e.target.value)}>
                      {ESTADOS_GUARDIAN.map((s) => (
                        <option key={s.v} value={s.v}>{s.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="vitrina__field vitrina__field--range">
                    <span>Energía</span>
                    <input
                      type="range"
                      min="0.35"
                      max="1"
                      step="0.05"
                      value={guardianEnergia}
                      onChange={(e) => setGuardianEnergia(parseFloat(e.target.value))}
                    />
                  </label>
                </div>
              </DemoCard>
            </div>
          </section>
        )}

        {/* ── Micro-fauna del suelo ─────────────────────────────────────── */}
        {seccion === 'microfauna' && (
          <section className="vitrina__section" aria-label="Micro-fauna del suelo">
            <div className="vitrina__grid vitrina__grid--wide">
              <DemoCard
                titulo="Micro-fauna del suelo"
                descripcion="El suelo está vivo: lombrices, colémbolos y raíces en un corte 3D. Arrastre para girar."
                props={['tier', 'reducedMotion', 'vida', 'mostrarNombres']}
                variante="canvas"
              >
                <div className="vitrina__lienzoWrap">
                  <Suspense fallback={<div className="vitrina__loading">Preparando el suelo vivo…</div>}>
                    <MicrofaunaSuelo
                      tier={tier}
                      reducedMotion={reducedMotion}
                      vida={0.9}
                      mostrarNombres
                    />
                  </Suspense>
                </div>
              </DemoCard>
            </div>
          </section>
        )}

        {/* ── Ciclo de vida ─────────────────────────────────────────────── */}
        {seccion === 'ciclo' && (
          <section className="vitrina__section" aria-label="Ciclo de vida de la mata">
            <div className="vitrina__sectionCtl">
              <label className="vitrina__field">
                <span>Especie</span>
                <select value={especie} onChange={(e) => setEspecie(e.target.value)}>
                  {ESPECIES.map((s) => (
                    <option key={s.v} value={s.v}>{s.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="vitrina__grid vitrina__grid--wide">
              <DemoCard
                titulo="Ciclo de la mata"
                descripcion="De sembrar a cosecha, con su barra de etapas. Toque una etapa o deje correr el time-lapse."
                props={['especie', 'tier', 'reducedMotion', 'autoplay', 'etapaInicial']}
                variante="canvas"
              >
                <div className="vitrina__lienzoWrap vitrina__lienzoWrap--tall">
                  <Suspense fallback={<div className="vitrina__loading">Preparando la mata…</div>}>
                    <CicloMata
                      key={`${especie}-${tier}`}
                      especie={especie}
                      tier={tier}
                      reducedMotion={reducedMotion}
                      autoplay={!reducedMotion}
                      onEtapa={() => {}}
                    />
                  </Suspense>
                </div>
              </DemoCard>
            </div>
          </section>
        )}

        {/* ── Clima y efectos ───────────────────────────────────────────── */}
        {seccion === 'clima' && (
          <section className="vitrina__section" aria-label="Clima y efectos">
            <div className="vitrina__grid vitrina__grid--wide">
              <DemoCard
                titulo="Escarcha / helada"
                descripcion="La escarcha del alba que se posa sobre el suelo. La intensidad regula cuánta cubre."
                props={['intensidad', 'tier', 'reducedMotion', 'area']}
                variante="canvas"
              >
                <div className="vitrina__lienzoWrap">
                  <Suspense fallback={<div className="vitrina__loading">Preparando el amanecer frío…</div>}>
                    <EscarchaDemo
                      tier={tier}
                      reducedMotion={reducedMotion}
                      intensidad={escarchaIntensidad}
                    />
                  </Suspense>
                </div>
                <div className="vitrina__localCtl">
                  <label className="vitrina__field vitrina__field--range">
                    <span>Intensidad</span>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={escarchaIntensidad}
                      onChange={(e) => setEscarchaIntensidad(parseFloat(e.target.value))}
                    />
                  </label>
                </div>
              </DemoCard>

              <DemoCard
                titulo="Valle en calma"
                descripcion="El estado de reposo: nada urgente que atender. En gama baja cae a un espejo 2D."
                props={['tier', 'reducedMotion', 'mensaje', 'detalle']}
                variante="canvas"
              >
                <div className="vitrina__lienzoWrap">
                  <Suspense fallback={<div className="vitrina__loading">Preparando el valle…</div>}>
                    <ValleEnCalma tier={/** @type {any} */ (tier)} reducedMotion={reducedMotion} />
                  </Suspense>
                </div>
              </DemoCard>
            </div>
          </section>
        )}

        {/* ── Estados y guías (DOM) ─────────────────────────────────────── */}
        {seccion === 'estados' && (
          <section className="vitrina__section" aria-label="Estados y guías">
            <div className="vitrina__grid vitrina__grid--wide">
              <DemoCard
                titulo="Hilo de vida"
                descripcion="Una capa de prosa cálida que narra en palabras lo que la escena muestra."
                props={['cielo', 'animo', 'energia', 'lugar', 'pendientes']}
                variante="dom"
              >
                <div className="vitrina__domStage">
                  <HiloVidaVista
                    cielo="despejado"
                    animo="sereno"
                    energia={0.85}
                    lugar="la huerta"
                    reducedMotion={reducedMotion}
                    pendientes={[
                      { id: 'r1', tema: 'riego', view: 'tareas' },
                      { id: 'r2', tema: 'observación de una mata', view: 'seguimiento' },
                    ]}
                    onIrA={() => {}}
                  />
                </div>
              </DemoCard>

              <DemoCard
                titulo="Onboarding: descubrir el valle"
                descripcion="El primer recorrido guiado, paso a paso, sobre la escena. Sin voz, siempre con salida amable."
                props={['hotspots', 'onListo', 'onDestacar', 'reducedMotion']}
                variante="dom"
              >
                <div className="vitrina__onbStage">
                  <div className="vitrina__onbFondo" aria-hidden="true">
                    <span className="vitrina__onbSol" />
                    <span className="vitrina__onbCerro" />
                    <span className="vitrina__onbCerro vitrina__onbCerro--2" />
                  </div>
                  <OnboardingDescubrir
                    key={onbKey}
                    hotspots={HOTSPOTS_DEMO}
                    reducedMotion={reducedMotion}
                    onListo={() => {}}
                    onDestacar={() => {}}
                  />
                </div>
                <div className="vitrina__localCtl">
                  <button
                    type="button"
                    className="vitrina__relaunch"
                    onClick={() => setOnbKey((k) => k + 1)}
                  >
                    ↻ Volver a mostrar el recorrido
                  </button>
                </div>
              </DemoCard>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
