/*
 * MundoMicrofauna3D — el MUNDO TOCABLE de la micro-fauna del suelo: una vitrina
 * inmersiva donde el usuario EXPLORA con el dedo la vida diminuta que sostiene la
 * huerta. Toca un ser vivo —la lombriz, el colémbolo, el ácaro, la red de
 * micorrizas, las bacterias o el nematodo benéfico— y la cámara SE ACERCA a él y
 * le cuenta su oficio: descomponer, airear, nutrir, el "internet del bosque".
 *
 * No re-escribe la micro-fauna: REUTILIZA `DioramaMicrofaunaSuelo` (el corte de
 * suelo vivo del framework) como escenario, y encima le monta una capa TOCABLE:
 *   - un marcador con halo rubber-hose (Cuphead andino: redondo, cálido, que
 *     respira) sobre cada organismo, con una esfera-objetivo generosa para el
 *     dedo;
 *   - un NEMATODO benéfico nuevo (gusanito translúcido, propio de este archivo —
 *     no está en el diorama), para completar el elenco del suelo;
 *   - un "riel" de cámara que, al seleccionar, encuadra al ser vivo y, al volver,
 *     regresa a la vista general;
 *   - encima, en el DOM: los nombres flotantes (píldoras grandes, fáciles de
 *     tocar), una ficha con el oficio en "usted" cordial y una fila de fichas
 *     para elegir por teclado o táctil en cualquier equipo.
 *
 * FRUGAL POR CONTRATO (DR §6, igual que el resto del framework): SOLO
 * `meshLambert`/`meshBasic`, sin sombras; halos y objetivos son esferas simples;
 * el nematodo es una cadena corta de esferas. Se degrada por `tier` (el diorama y
 * las partículas ya lo hacen) y con `reducedMotion` NO corre animación: el
 * frameloop pasa a demanda, la escena queda quieta y la cámara SALTA al foco (sin
 * viaje) para respetar la preferencia de calma.
 *
 * NO edita nada que importa: `DioramaMicrofaunaSuelo`, `ParticulasAmbientales` y
 * `atmosferaMadre` se consumen tal cual. La ruta la cablea Opus en App.jsx (este
 * archivo NO toca App.jsx).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, AdaptiveDpr } from '@react-three/drei';
import { ATMOSFERA } from '../visual/mundo3d/atmosferaMadre.js';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';
import { DioramaMicrofaunaSuelo } from '../visual/mundo3d/MicrofaunaSuelo.jsx';
import { ParticulasAmbientales } from '../visual/mundo3d/ParticulasAmbientales.jsx';

/* ── EL ELENCO DEL SUELO ──────────────────────────────────────────────────────
 * Cada ser vivo con su ancla (dónde vive en el corte, a su PROFUNDIDAD real:
 * superficie, hojarasca, tierra negra o subsuelo), su color de halo y la copia
 * educativa en "usted" cordial colombiano. El diorama de fondo pone muchos
 * bichitos en movimiento; estos seis son los "personajes" curados que se tocan.
 * Datos de módulo (no se exportan): así el archivo solo exporta el componente
 * (react-refresh/only-export-components). */
const ORGANISMOS = [
  {
    id: 'colembolo',
    emoji: '✨',
    nombre: 'Colémbolo',
    oficio: 'El saltarín que recicla',
    texto:
      'Diminuto y saltarín: bajo la panza guarda un resorte con el que brinca lejos del peligro. Mastica hongos y hojarasca en pedacitos cada vez más pequeños y así apura la descomposición, para que otros terminen de convertirla en tierra buena.',
    anchor: [-1.5, 1.05, 1.15],
    color: '#b7a9ef',
    fase: 0.0,
    halo: 0.22,
    hit: 0.4,
    pinY: 0.42,
  },
  {
    id: 'acaro',
    emoji: '🕷️',
    nombre: 'Ácaro del suelo',
    oficio: 'El vigilante de ocho patas',
    texto:
      'Con sus ocho paticas recorre la hojarasca cazando y desmenuzando. Controla las plaguitas pequeñas y reparte la materia orgánica por todo el suelo. Casi nadie lo ve, pero es un guardián que trabaja sin descanso.',
    anchor: [-0.7, 0.9, 1.2],
    color: '#d76a52',
    fase: 0.9,
    halo: 0.24,
    hit: 0.42,
    pinY: 0.44,
  },
  {
    id: 'lombriz',
    emoji: '🪱',
    nombre: 'Lombriz de tierra',
    oficio: 'La ingeniera del suelo',
    texto:
      'Se come la tierra y las hojas viejas y las devuelve convertidas en abono negro y fértil. Al abrir sus túneles deja entrar el aire y el agua: cada lombriz es un arado vivo que nunca descansa. Donde hay lombrices, el suelo está sano.',
    anchor: [0.35, 0.15, 1.22],
    color: '#e8a58f',
    fase: 1.7,
    halo: 0.34,
    hit: 0.55,
    pinY: 0.48,
  },
  {
    id: 'nematodo',
    emoji: '〰️',
    nombre: 'Nematodo benéfico',
    oficio: 'El aliado casi invisible',
    texto:
      'Un gusanito transparente, más fino que un pelo. Los buenos se comen bacterias y hongos y, al hacerlo, liberan nutrientes para las raíces; otros persiguen larvas de plagas bajo tierra. Tan pequeño que no se ve, y tan útil para la huerta.',
    anchor: [1.5, 0.35, 1.15],
    color: '#bfe6d8',
    fase: 2.4,
    halo: 0.26,
    hit: 0.46,
    pinY: 0.44,
  },
  {
    id: 'micorrizas',
    emoji: '🍄',
    nombre: 'Micorrizas',
    oficio: 'El internet del bosque',
    texto:
      'Son hilos de hongo (hifas) que se enredan con las raíces y se extienden como una red dorada bajo tierra. Le llevan agua y minerales a la planta y, a cambio, reciben su azúcar. Por esta red las plantas hasta se avisan y se comparten alimento entre vecinas.',
    anchor: [-0.35, -0.45, 0.7],
    color: '#ffd27a',
    fase: 3.1,
    halo: 0.4,
    hit: 0.6,
    pinY: 0.42,
  },
  {
    id: 'bacterias',
    emoji: '🦠',
    nombre: 'Bacterias',
    oficio: 'Las cocineras invisibles',
    texto:
      'Son tan pequeñas que millones caben en una cucharada de tierra. Transforman la materia muerta en alimento que la planta sí puede comer, y algunas capturan el nitrógeno del aire para abonar el suelo. Sin ellas, nada volvería a nacer.',
    anchor: [0.95, -0.5, 0.75],
    color: '#ffdf9a',
    fase: 3.8,
    halo: 0.36,
    hit: 0.55,
    pinY: 0.4,
  },
];

/* La vista general: el encuadre de reposo (el mismo aire cálido del diorama). */
const VISTA_GENERAL = { pos: /** @type {[number, number, number]} */ ([3.6, 2.4, 5.6]), target: [0, 0.1, 0.5] };

/* El encuadre para acercarse a un ser vivo: la cámara se sitúa al frente y un
   poco arriba de su ancla, mirándolo de cerca. */
function vistaDe(org) {
  if (!org) return VISTA_GENERAL;
  const [x, y, z] = org.anchor;
  return {
    pos: [x * 0.45 + 1.25, y + 1.0, z + 2.25],
    target: [x, y + 0.02, z],
  };
}

/* ── NEMATODO benéfico (nuevo, propio de este archivo) ────────────────────────
 * Rubber-hose translúcido: cadena corta de esferas en curva suave, ojos grandes,
 * ondula despacio como nadando en la película de agua del suelo. Con
 * reducedMotion queda en su pose (sin ondular). */
function NematodoBenefico({ base, reducedMotion }) {
  const segs = useRef([]);
  const puntos = useMemo(() => {
    const n = 9;
    return Array.from({ length: n }, (_, i) => {
      const u = i / (n - 1);
      return {
        x: -0.34 + u * 0.68,
        y: Math.sin(u * Math.PI * 1.6) * 0.08,
        r: 0.03 + 0.018 * Math.sin(u * Math.PI) + (i === 0 ? 0.012 : 0),
      };
    });
  }, []);
  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime * 3.0;
    for (let i = 0; i < segs.current.length; i++) {
      const g = segs.current[i];
      if (!g) continue;
      g.position.y = puntos[i].y + Math.sin(t - i * 0.6) * 0.03;
      g.position.z = Math.cos(t - i * 0.6) * 0.02;
    }
  });
  return (
    <group position={base} rotation={[0, -0.5, 0]}>
      {puntos.map((p, i) => (
        <group key={i} ref={(el) => { segs.current[i] = el; }} position={[p.x, p.y, 0]}>
          <mesh>
            <sphereGeometry args={[p.r, 8, 8]} />
            <meshLambertMaterial color="#cfeee0" transparent opacity={0.72} flatShading />
          </mesh>
          {i === 0 && (
            <>
              <mesh position={[0.02, 0.03, p.r * 0.7]}>
                <sphereGeometry args={[0.016, 8, 8]} />
                <meshBasicMaterial color="#fbf6ec" />
              </mesh>
              <mesh position={[-0.03, 0.03, p.r * 0.66]}>
                <sphereGeometry args={[0.016, 8, 8]} />
                <meshBasicMaterial color="#fbf6ec" />
              </mesh>
              <mesh position={[0.02, 0.035, p.r * 0.82]}>
                <sphereGeometry args={[0.008, 6, 6]} />
                <meshBasicMaterial color="#241a12" />
              </mesh>
              <mesh position={[-0.03, 0.035, p.r * 0.78]}>
                <sphereGeometry args={[0.008, 6, 6]} />
                <meshBasicMaterial color="#241a12" />
              </mesh>
            </>
          )}
        </group>
      ))}
    </group>
  );
}

/* ── MARCADOR tocable ─────────────────────────────────────────────────────────
 * Halo rubber-hose que respira (más brillante si está resaltado o seleccionado)
 * + una esfera-objetivo invisible y generosa para el dedo. El pulso vive en
 * useFrame (nunca lee `.current` en render). */
function Marcador({ org, seleccionado, resaltado, reducedMotion, onSeleccion, onHover }) {
  const halo = useRef(null);
  useFrame((state) => {
    if (reducedMotion || !halo.current) return;
    const t = state.clock.elapsedTime;
    const base = seleccionado ? 0.42 : resaltado ? 0.34 : 0.2;
    const pulso = 0.5 + 0.5 * Math.sin(t * 2.2 + org.fase);
    halo.current.material.opacity = base + pulso * (seleccionado ? 0.16 : 0.1);
    halo.current.scale.setScalar(1 + pulso * (seleccionado ? 0.12 : 0.06));
  });
  const opBase = seleccionado ? 0.42 : resaltado ? 0.32 : 0.18;
  return (
    <group position={org.anchor}>
      <mesh ref={halo}>
        <sphereGeometry args={[org.halo, 16, 16]} />
        <meshBasicMaterial
          color={org.color}
          transparent
          opacity={opBase}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh
        onPointerDown={(e) => { e.stopPropagation(); onSeleccion(org.id); }}
        onPointerOver={(e) => { e.stopPropagation(); onHover(org.id); }}
        onPointerOut={() => onHover(null)}
      >
        <sphereGeometry args={[org.hit, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ── RIEL DE CÁMARA ───────────────────────────────────────────────────────────
 * Lleva la cámara (y el objetivo de OrbitControls) al encuadre pedido. Como
 * OrbitControls.update() reconstruye la posición a partir de (posición−objetivo)
 * y NO hay deltas de usuario ni autoRotate durante el foco, fijar ambos y llamar
 * update() es estable (no pelea con el rig). En reducedMotion salta de una;
 * `invalidate()` mantiene vivo el frameloop-a-demanda mientras dura el viaje. */
function CameraRig({ vista, reducedMotion }) {
  const controls = /** @type {import('three/examples/jsm/controls/OrbitControls.js').OrbitControls|null} */ (useThree((s) => s.controls));
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const destino = useMemo(
    () => ({
      pos: new THREE.Vector3(...vista.pos),
      target: new THREE.Vector3(...vista.target),
    }),
    [vista],
  );
  const activo = useRef(true);
  useEffect(() => {
    activo.current = true;
    invalidate();
  }, [destino, invalidate]);
  useFrame(() => {
    if (!activo.current || !controls) return;
    const a = reducedMotion ? 1 : 0.09;
    camera.position.lerp(destino.pos, a);
    controls.target.lerp(destino.target, a);
    controls.update();
    const cerca =
      camera.position.distanceTo(destino.pos) < 0.02 &&
      controls.target.distanceTo(destino.target) < 0.02;
    if (reducedMotion || cerca) {
      camera.position.copy(destino.pos);
      controls.target.copy(destino.target);
      controls.update();
      activo.current = false;
    } else {
      invalidate();
    }
  });
  return null;
}

/* ── La escena 3D (dentro del Canvas) ─────────────────────────────────────────*/
function EscenaMicro({ tier, reducedMotion, focus, hover, onSeleccion, onHover }) {
  return (
    <>
      <color attach="background" args={[ATMOSFERA.fondo]} />
      <hemisphereLight intensity={1.0} color={ATMOSFERA.cielo} groundColor={ATMOSFERA.suelo} />
      <ambientLight intensity={0.45} color="#fff2d6" />
      <directionalLight position={[3, 5, 4]} intensity={0.5} color={ATMOSFERA.luz} />

      {/* el corte de suelo vivo del framework, reutilizado (sus nombres OFF: los
          ponemos nosotros, tocables) */}
      <DioramaMicrofaunaSuelo
        tier={tier}
        reducedMotion={reducedMotion}
        vida={0.92}
        mostrarNombres={false}
      />

      {/* el elenco tocable */}
      <NematodoBenefico base={[1.5, 0.35, 1.15]} reducedMotion={reducedMotion} />
      {ORGANISMOS.map((org) => (
        <Marcador
          key={org.id}
          org={org}
          seleccionado={focus === org.id}
          resaltado={hover === org.id}
          reducedMotion={reducedMotion}
          onSeleccion={onSeleccion}
          onHover={onHover}
        />
      ))}

      {/* nombres flotantes: píldoras grandes para el dedo (solo en vista general,
          para no tapar el acercamiento) */}
      {focus === null &&
        ORGANISMOS.map((org) => (
          <Html
            key={org.id}
            position={[org.anchor[0], org.anchor[1] + org.pinY, org.anchor[2]]}
            center
            zIndexRange={[16, 0]}
          >
            <button
              type="button"
              className={`mm-pin${hover === org.id ? ' mm-pin--hot' : ''}`}
              onClick={() => onSeleccion(org.id)}
              onPointerOver={() => onHover(org.id)}
              onPointerOut={() => onHover(null)}
            >
              <span className="mm-pin__emoji" aria-hidden="true">{org.emoji}</span>
              <span className="mm-pin__txt">{org.nombre}</span>
            </button>
          </Html>
        ))}

      {/* el aire del suelo: polvo dorado en suspensión (kit del framework) */}
      <ParticulasAmbientales
        tipo="polvo"
        tier={tier}
        reducedMotion={reducedMotion}
        position={[0, 0.4, 1.0]}
        area={[4.4, 2.4, 2.2]}
        semilla={31}
      />
    </>
  );
}

/* Estilos de ESTA vitrina (chrome DOM sobre el Canvas). Paleta cálida andina,
   "usted" cordial; legible en claro y oscuro. */
const CSS_MICRO = `
.mm-root { position: relative; width: 100%; height: 100dvh; min-height: 340px; overflow: hidden; background: ${ATMOSFERA.fondo}; touch-action: none; }
.mm-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.9s ease; }
.mm-canvas--lista { opacity: 1; }
.mm-vineta { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.5s ease; background: radial-gradient(120% 90% at 50% 42%, rgba(28,18,8,0) 46%, rgba(28,18,8,0.34) 100%); }
.mm-vineta--on { opacity: 1; }
.mm-chrome { position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; }
.mm-titulo { margin: 0; padding: 0.9rem 1rem 0; color: #3a2a15; text-shadow: 0 1px 8px rgba(255,244,214,0.72); font: 700 1.2rem/1.2 system-ui, sans-serif; letter-spacing: 0.01em; }
.mm-titulo small { display: block; font: 500 0.82rem/1.35 system-ui, sans-serif; opacity: 0.84; margin-top: 0.15rem; }
.mm-abajo { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; padding: 0 0.75rem 0.85rem; }
.mm-card { pointer-events: auto; margin: 0; max-width: 34rem; width: 100%; text-align: left; padding: 0.7rem 0.95rem 0.85rem; border-radius: 0.9rem; background: rgba(46,32,16,0.82); backdrop-filter: blur(4px); color: #fbf3e2; box-shadow: 0 6px 22px rgba(28,18,8,0.4); border: 1px solid rgba(255,214,138,0.28); }
.mm-card__head { display: flex; align-items: center; gap: 0.55rem; margin-bottom: 0.3rem; }
.mm-card__emoji { font-size: 1.7rem; line-height: 1; filter: drop-shadow(0 1px 3px rgba(0,0,0,0.4)); }
.mm-card__nombre { margin: 0; font: 800 1.08rem/1.1 system-ui, sans-serif; color: #ffe9c2; }
.mm-card__oficio { margin: 0.08rem 0 0; font: 600 0.82rem/1.15 system-ui, sans-serif; color: #ffd27a; }
.mm-card__texto { margin: 0.2rem 0 0.6rem; font: 500 0.86rem/1.5 system-ui, sans-serif; color: #f4e6cf; }
.mm-volver { appearance: none; border: 1px solid rgba(255,214,138,0.45); border-radius: 999px; padding: 0.4rem 0.95rem; background: rgba(255,247,228,0.14); color: #ffe9c2; font: 700 0.8rem/1.1 system-ui, sans-serif; cursor: pointer; transition: background 0.2s ease, border-color 0.2s ease; }
.mm-volver:hover, .mm-volver:focus-visible { background: rgba(255,247,228,0.26); border-color: rgba(255,214,138,0.8); outline: none; }
.mm-chips { pointer-events: auto; display: flex; flex-wrap: wrap; justify-content: center; gap: 0.4rem; max-width: 40rem; }
.mm-chip { display: inline-flex; align-items: center; gap: 0.32rem; appearance: none; border: 1px solid rgba(58,42,21,0.35); border-radius: 999px; padding: 0.34rem 0.7rem; background: rgba(255,247,228,0.86); color: #533a17; font: 600 0.78rem/1.1 system-ui, sans-serif; cursor: pointer; backdrop-filter: blur(3px); transition: background 0.18s ease, border-color 0.18s ease, transform 0.12s ease; }
.mm-chip:hover, .mm-chip:focus-visible { background: rgba(255,255,255,0.96); border-color: rgba(58,42,21,0.6); outline: none; transform: translateY(-1px); }
.mm-chip--activo { background: #4a2f1a; color: #ffe9c2; border-color: rgba(255,214,138,0.7); }
.mm-chip__emoji { font-size: 1rem; line-height: 1; }
.mm-pin { display: inline-flex; align-items: center; gap: 0.28em; white-space: nowrap; pointer-events: auto; appearance: none; padding: 0.2em 0.62em; border-radius: 999px; font: 700 13px/1.1 system-ui, sans-serif; color: #4a2f1a; background: rgba(255,249,234,0.94); border: 1.5px solid rgba(122,84,46,0.4); box-shadow: 0 2px 8px rgba(74,47,26,0.22); cursor: pointer; user-select: none; transition: transform 0.12s ease, background 0.18s ease, border-color 0.18s ease; }
.mm-pin:hover, .mm-pin--hot, .mm-pin:focus-visible { transform: translateY(-2px) scale(1.04); background: #fff; border-color: rgba(122,84,46,0.7); outline: none; }
.mm-pin__emoji { font-size: 1.12em; line-height: 1; }
@media (prefers-color-scheme: dark) {
  .mm-titulo { color: #f4e6cf; text-shadow: 0 1px 10px rgba(0,0,0,0.5); }
  .mm-chip { background: rgba(58,40,24,0.9); color: #f4e6cf; border-color: rgba(255,214,138,0.35); }
  .mm-chip:hover, .mm-chip:focus-visible { background: rgba(74,52,30,0.98); }
  .mm-pin { color: #f4e6cf; background: rgba(58,40,24,0.92); border-color: rgba(255,214,138,0.4); }
  .mm-pin:hover, .mm-pin--hot, .mm-pin:focus-visible { background: rgba(74,52,30,1); }
}
@media (prefers-reduced-motion: reduce) {
  .mm-canvas, .mm-vineta, .mm-pin, .mm-chip, .mm-volver { transition: none; }
}
`;

const COPY_INTRO =
  'Bajo sus pies hay una ciudad diminuta y llena de vida. Toque cualquiera de estos seres —o su nombre— para acercarse y conocer qué hace por el suelo, por la planta y por usted.';

/**
 * MundoMicrofauna3D — el mundo tocable de la micro-fauna del suelo, con su propio
 * `<Canvas>`. Sin lógica de negocio: es una vitrina educativa. El `tier` y la
 * preferencia de calma se detectan aquí (mockup standalone), igual que sus pares.
 * La ruta la cablea Opus en App.jsx (este archivo NO lo toca).
 */
export default function MundoMicrofauna3D() {
  const [listo, setListo] = useState(false);
  const [focus, setFocus] = useState(null); // id del organismo enfocado, o null
  const [hover, setHover] = useState(null);
  const { tier, reducedMotion } = useMemo(() => decidirTier(), []);
  const perfil = perfilDeTier(tier);

  const orgSel = useMemo(() => ORGANISMOS.find((o) => o.id === focus) || null, [focus]);
  const vista = useMemo(() => vistaDe(orgSel), [orgSel]);

  return (
    <section
      className="mm-root"
      data-tier={tier}
      aria-label="El mundo tocable de la micro-fauna del suelo: toque cada ser vivo para conocer su oficio"
    >
      <style>{CSS_MICRO}</style>
      <Canvas
        className={`mm-canvas${listo ? ' mm-canvas--lista' : ''}`}
        dpr={perfil.dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={{ position: VISTA_GENERAL.pos, fov: 42 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        <EscenaMicro
          tier={tier}
          reducedMotion={reducedMotion}
          focus={focus}
          hover={hover}
          onSeleccion={setFocus}
          onHover={setHover}
        />
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom
          minDistance={2.2}
          maxDistance={9}
          minPolarAngle={0.35}
          maxPolarAngle={1.46}
          enableDamping
          dampingFactor={0.09}
          autoRotate={!reducedMotion && focus === null}
          autoRotateSpeed={0.24}
        />
        <CameraRig vista={vista} reducedMotion={reducedMotion} />
        <AdaptiveDpr pixelated />
      </Canvas>

      <div className={`mm-vineta${focus ? ' mm-vineta--on' : ''}`} aria-hidden="true" />

      <div className="mm-chrome">
        <h2 className="mm-titulo">
          El mundo tocable del suelo
          <small>Toque cada ser vivo y descubra su oficio en la vida de la huerta</small>
        </h2>

        <div className="mm-abajo">
          {orgSel ? (
            <article className="mm-card" role="status" aria-live="polite">
              <div className="mm-card__head">
                <span className="mm-card__emoji" aria-hidden="true">{orgSel.emoji}</span>
                <div>
                  <h3 className="mm-card__nombre">{orgSel.nombre}</h3>
                  <p className="mm-card__oficio">{orgSel.oficio}</p>
                </div>
              </div>
              <p className="mm-card__texto">{orgSel.texto}</p>
              <button type="button" className="mm-volver" onClick={() => setFocus(null)}>
                Volver a la vista general
              </button>
            </article>
          ) : (
            <article className="mm-card" role="status">
              <p className="mm-card__texto" style={{ margin: 0 }}>{COPY_INTRO}</p>
            </article>
          )}

          <div className="mm-chips" role="group" aria-label="Elegir un ser vivo del suelo">
            {ORGANISMOS.map((org) => (
              <button
                key={org.id}
                type="button"
                className={`mm-chip${focus === org.id ? ' mm-chip--activo' : ''}`}
                aria-pressed={focus === org.id}
                onClick={() => setFocus((v) => (v === org.id ? null : org.id))}
                onPointerOver={() => setHover(org.id)}
                onPointerOut={() => setHover(null)}
              >
                <span className="mm-chip__emoji" aria-hidden="true">{org.emoji}</span>
                {org.nombre}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
