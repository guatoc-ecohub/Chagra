/*
 * ArtesaniaAndinaDemo — la VITRINA del lenguaje de forma "artesanía andina" en 3D.
 *
 * FASE 4 del audit game-dev: los objetos 3D dejaban de verse genéricos cuando
 * la SILUETA tiene carácter. Esta demo lo prueba en vivo — un altar/repisa bajo
 * la hora dorada con cinco piezas revolucionadas desde los perfiles curados del
 * módulo `artesaniaAndina.js` (vasija, mojón, telar, terraza, tótem), y un
 * ANTES/DESPUÉS que despoja cada pieza a su cilindro crudo para que se vea, sin
 * una palabra, qué aporta el hombro marcado, la cintura y la base ancha.
 *
 * DIRECCIÓN DE ARTE (todo del framework, nada inventado por fuera):
 *   - Atmósfera: la MISMA hora dorada del valle (preset `CIELOS_HORA.dorada`,
 *     espejo de `ATMOSFERA`). Entrar aquí se siente como acercarse dentro del
 *     mismo atardecer, no como abrir otra app.
 *   - Forma: los perfiles [r,y] de `artesaniaAndina.js` mapeados a `Vector2`
 *     para `LatheGeometry`. La MISMA tabla que dibuja la silueta 2D — la pieza
 *     nunca diverge entre dimensiones. Facetado low-poly a propósito.
 *   - Color: los tintes naturales de `PALETA_ANDINA` (terracota, maíz, cochinilla,
 *     páramo, roca), entintados apenas hacia la niebla dorada con `mezclar`.
 *
 * RENDIMIENTO (DR §6): solo `meshLambert`/`meshBasic`, sin shadow-map, geometría
 * procedural, PRNG determinista (cero `Math.random` en render). Presupuestos por
 * `perfilDeTier`; `reducedMotion` congela el giro y pasa el frameloop a demanda
 * (la pieza queda presente pero quieta; el toque la re-orienta de un salto).
 *
 * Ruta mockup: #/mockups/artesania-andina (la cablea Opus en App.jsx, sin auth).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { CIELOS_HORA } from '../visual/mundo3d/cielosHoraData.js';
import { PALETA, mezclar } from '../visual/mundo3d/atmosferaMadre.js';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';
import {
  SILUETA_NOMBRES,
  SILUETA_INFO,
  SEGMENTOS_SILUETA,
  puntosSilueta,
  tinteDeSilueta,
} from '../visual/mundo3d/artesaniaAndina.js';

/* La hora dorada canónica (espejo de ATMOSFERA): única fuente de la atmósfera. */
const DORADA = CIELOS_HORA.dorada;

/* Maderas del altar, del framework, apenas entintadas hacia la niebla dorada
   para que el ojo lea "el mismo atardecer" que en los demás mundos. */
const MADERA = mezclar(PALETA.madera, DORADA.niebla, 0.18);
const MADERA_OSCURA = mezclar(PALETA.maderaOscura, DORADA.niebla, 0.15);
const PANO = mezclar('#ece0c7', DORADA.niebla, 0.25); // el paño crudo del altar

/* Cada silueta entintada una pizca hacia la hora dorada: identidad del tinte
   natural intacta, pero bañada por el mismo sol bajo. Memo por nombre implícito
   (constante de módulo, se calcula una vez). */
const TINTE_PIEZA = Object.fromEntries(
  SILUETA_NOMBRES.map((n) => [n, mezclar(tinteDeSilueta(n), DORADA.niebla, 0.14)]),
);

/* El reparto del altar: las cinco piezas, su alto y su sitio en la repisa. Alturas
   dispares a propósito (ritmo, no fila de soldados). */
const PIEZAS = SILUETA_NOMBRES.map((nombre, i) => ({
  nombre,
  alto: [1.28, 1.02, 1.2, 1.12, 1.42][i] ?? 1.2,
  x: -3 + i * 1.5,
}));

/* Las luces de la hora dorada del kit: hemisferio cálido, ambiente suave, el sol
   bajo como direccional principal y un relleno frío opuesto (cielo abierto). */
function LucesDoradas() {
  return (
    <>
      <hemisphereLight intensity={DORADA.hemisferio} color={DORADA.cielo} groundColor={DORADA.suelo} />
      <ambientLight intensity={DORADA.ambiente} color={DORADA.luz} />
      <directionalLight position={/** @type {[number, number, number]} */ (DORADA.solPos)} intensity={DORADA.sol} color={DORADA.luz} />
      <directionalLight position={[-6, 4, -7]} intensity={DORADA.rellenoInt} color={DORADA.relleno} />
    </>
  );
}

/* El sol bajo del atardecer: disco tibio con halo, del lado del solPos. No
   ilumina (de eso se encargan las luces); es el ancla visual de la hora. */
function SolBajo() {
  return (
    <group position={[7.5, 6.5, -12]}>
      <mesh>
        <circleGeometry args={[1.3, 40]} />
        <meshBasicMaterial color="#fff0cf" transparent opacity={0.95} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.05]}>
        <circleGeometry args={[2.6, 40]} />
        <meshBasicMaterial color={DORADA.luz} transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.1]}>
        <circleGeometry args={[4.4, 40]} />
        <meshBasicMaterial color={DORADA.cielo} transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ── El altar/repisa: un tablón de madera sobre dos apoyos, con su paño crudo.
      Le da a las piezas dónde asentarse (una silueta con base ancha necesita
      suelo para leerse). Todo low-poly, sin sombras. ── */
function AltarRepisa() {
  return (
    <group position={[0, -0.12, 0]}>
      {/* el paño del altar, apenas bajo las piezas */}
      <mesh position={[0, -0.02, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9.4, 3.2]} />
        <meshLambertMaterial color={PANO} />
      </mesh>
      {/* el tablón */}
      <mesh position={[0, -0.16, 0]}>
        <boxGeometry args={[9.2, 0.28, 2.6]} />
        <meshLambertMaterial color={MADERA} flatShading />
      </mesh>
      {/* borde frontal más oscuro (canto del tablón) */}
      <mesh position={[0, -0.16, 1.28]}>
        <boxGeometry args={[9.2, 0.28, 0.08]} />
        <meshLambertMaterial color={MADERA_OSCURA} flatShading />
      </mesh>
      {/* dos apoyos */}
      {[-3.6, 3.6].map((x) => (
        <mesh key={x} position={[x, -0.7, 0]}>
          <boxGeometry args={[0.5, 0.9, 1.9]} />
          <meshLambertMaterial color={MADERA_OSCURA} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* ── Una pieza revolucionada: toma el perfil curado (o su cilindro genérico si
      `generico`), lo mapea a Vector2 y arma un `LatheGeometry` facetado. La
      seleccionada gira lento; al tocar cualquiera se selecciona y se re-orienta.
      Bajo reduced-motion no gira (useFrame no corre): el toque la salta de un
      cuarto de vuelta e invalida un frame a demanda. ── */
function PiezaLathe({ nombre, alto, x, generico, seg, activa, reducedMotion, onSelect }) {
  const ref = useRef(null);
  const invalidate = useThree((s) => s.invalidate);
  const [giroSnap, setGiroSnap] = useState(0);

  const geo = useMemo(() => {
    const pts = puntosSilueta(nombre, { alto, generico }).map(([r, y]) => new THREE.Vector2(r, y));
    return new THREE.LatheGeometry(pts, seg);
  }, [nombre, alto, generico, seg]);
  useEffect(() => () => geo.dispose(), [geo]);

  // gira lento la pieza activa; las demás quedan quietas. Solo con movimiento.
  useFrame((_, dt) => {
    if (reducedMotion || !ref.current) return;
    if (activa) ref.current.rotation.y += dt * 0.55;
  });

  // reduced-motion: el toque re-orienta de un salto y pide un frame a demanda.
  useEffect(() => {
    if (!reducedMotion || !ref.current) return;
    ref.current.rotation.y = giroSnap;
    invalidate();
  }, [giroSnap, reducedMotion, invalidate]);

  return (
    <mesh
      ref={ref}
      geometry={geo}
      position={[x, 0, 0]}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect(nombre);
        if (reducedMotion) setGiroSnap((g) => g + Math.PI / 4);
      }}
    >
      <meshLambertMaterial color={TINTE_PIEZA[nombre]} flatShading />
    </mesh>
  );
}

/* La escena completa (grupo r3f interno; el default la monta en su Canvas). */
function EscenaAltar({ tier, reducedMotion, generico, sel, onSelect }) {
  const perfil = perfilDeTier(tier);
  const seg = tier === 'alto' ? SEGMENTOS_SILUETA : 8;

  /* `color`/`fog` van a la ESCENA: hijos directos, nunca dentro de un <group>. */
  return (
    <>
      <color attach="background" args={[DORADA.fondo]} />
      {perfil.fog && <fog attach="fog" args={[DORADA.niebla, 10, 30]} />}
      <LucesDoradas />
      <SolBajo />
      <AltarRepisa />
      {PIEZAS.map((p) => (
        <PiezaLathe
          key={p.nombre}
          nombre={p.nombre}
          alto={p.alto}
          x={p.x}
          generico={generico}
          seg={seg}
          activa={sel === p.nombre}
          reducedMotion={reducedMotion}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

/* Estilos de ESTA vitrina (chrome DOM sobre el Canvas). */
const CSS_ARTE = `
.arteand-root { position: relative; width: 100%; height: 100dvh; min-height: 320px; overflow: hidden; background: ${DORADA.fondo}; }
.arteand-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.9s ease; }
.arteand-canvas--lista { opacity: 1; }
.arteand-chrome { position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; }
.arteand-titulo { margin: 0; padding: 0.9rem 1rem 0; color: #4a3418; text-shadow: 0 1px 8px rgba(255,244,214,0.7); font: 700 1.18rem/1.2 system-ui, sans-serif; letter-spacing: 0.01em; }
.arteand-titulo small { display: block; font: 500 0.8rem/1.3 system-ui, sans-serif; opacity: 0.82; margin-top: 0.15rem; }
.arteand-pie { padding: 0 0.8rem 0.9rem; display: flex; flex-direction: column; align-items: center; gap: 0.55rem; }
.arteand-botones { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.45rem; }
.arteand-carta { margin: 0; max-width: 32rem; text-align: center; padding: 0.5rem 0.95rem; border-radius: 0.7rem; background: rgba(74,52,24,0.62); backdrop-filter: blur(3px); color: #fbf3e2; font: 500 0.8rem/1.5 system-ui, sans-serif; }
.arteand-boton { pointer-events: auto; appearance: none; border: 1px solid rgba(74,52,24,0.35); border-radius: 999px; padding: 0.42rem 0.9rem; background: rgba(255,247,228,0.82); color: #5a3f1c; font: 600 0.78rem/1.1 system-ui, sans-serif; cursor: pointer; backdrop-filter: blur(3px); transition: background 0.2s ease, border-color 0.2s ease; }
.arteand-boton:hover, .arteand-boton:focus-visible { background: rgba(255,255,255,0.95); border-color: rgba(74,52,24,0.6); outline: none; }
.arteand-boton[aria-pressed='true'] { background: #ffe8b0; border-color: rgba(90,63,28,0.75); color: #4a3418; }
.arteand-boton--modo { background: rgba(151,49,40,0.14); border-color: rgba(151,49,40,0.4); }
.arteand-boton--modo[aria-pressed='true'] { background: #f0c9b0; border-color: rgba(151,49,40,0.7); color: #5a2018; }
@media (prefers-reduced-motion: reduce) { .arteand-canvas { transition: none; } }
`;

/* Nombre en usted para el botón: "Ver la vasija", "Ver el mojón", … */
const rotulo = (nombre) => `Ver ${SILUETA_INFO[nombre]?.etiqueta || nombre}`;

/**
 * ArtesaniaAndinaDemo — la vitrina de siluetas andinas, montable con su propio
 * `<Canvas>`. Sin lógica de negocio: es un mockup (#/mockups/artesania-andina).
 * El tier y reduced-motion se detectan aquí (standalone), igual que sus pares.
 */
export default function ArtesaniaAndinaDemo() {
  const [listo, setListo] = useState(false);
  const [generico, setGenerico] = useState(false);
  const [sel, setSel] = useState(SILUETA_NOMBRES[0]);
  const tier = useMemo(() => decidirTier().tier, []);
  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const perfil = perfilDeTier(tier);
  const nota = SILUETA_INFO[sel]?.nota || '';

  return (
    <section
      className="arteand-root"
      data-tier={tier}
      aria-label="Artesanía andina: siluetas con carácter bajo la hora dorada"
    >
      <style>{CSS_ARTE}</style>
      <Canvas
        className={`arteand-canvas${listo ? ' arteand-canvas--lista' : ''}`}
        dpr={perfil.dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={{ position: [0, 1.5, 6.6], fov: 42 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        <EscenaAltar
          tier={tier}
          reducedMotion={reducedMotion}
          generico={generico}
          sel={sel}
          onSelect={setSel}
        />
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom
          minDistance={4}
          maxDistance={11}
          target={[0, 0.7, 0]}
          minPolarAngle={0.5}
          maxPolarAngle={1.45}
          minAzimuthAngle={-1.0}
          maxAzimuthAngle={1.0}
          enableDamping
          dampingFactor={0.08}
        />
        <AdaptiveDpr pixelated />
      </Canvas>

      <div className="arteand-chrome">
        <h2 className="arteand-titulo">
          Artesanía andina: la silueta con carácter
          <small>Base ancha, hombro marcado, cintura — lo que separa una pieza de un cilindro</small>
        </h2>
        <div className="arteand-pie">
          <div className="arteand-botones">
            {SILUETA_NOMBRES.map((n) => (
              <button
                key={n}
                type="button"
                className="arteand-boton"
                aria-pressed={sel === n}
                onClick={() => setSel(n)}
              >
                {rotulo(n)}
              </button>
            ))}
            <button
              type="button"
              className="arteand-boton arteand-boton--modo"
              aria-pressed={generico}
              onClick={() => setGenerico((v) => !v)}
            >
              {generico ? 'Ver la artesanía andina' : 'Ver la silueta genérica'}
            </button>
          </div>
          <p className="arteand-carta" role="status">
            {generico
              ? 'Antes: el cilindro crudo, sin hombro ni cintura. Toque una pieza para girarla; vuelva a la artesanía para ver qué cambia.'
              : nota}
          </p>
        </div>
      </div>
    </section>
  );
}
