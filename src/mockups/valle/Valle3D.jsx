/*
 * Valle3D — la ESCENA 3D del mockup "El valle de mi finca".
 *
 * React-Three-Fiber sobre WebGL 2 (la línea base del DR §2). Se carga PEREZOSO
 * (React.lazy en EntradaValle3D) para no inflar el bundle base: el chunk de
 * three/fiber/drei solo baja cuando el equipo SÍ tiene WebGL y entra a la ruta.
 *
 * Todo es GEOMETRÍA PROCEDURAL (cero GLTF/HDR remotos) → offline-first y
 * liviano. Estética "acuarela cálida" (Alba/Sorolla del DR), no neón frío.
 * Solo se anima transform/opacity-equivalentes (rotación/posición/escala) por
 * useFrame; `reducedMotion` congela el vaivén a un fotograma digno.
 *
 * Los 4 sí-o-sí viven en el espacio:
 *   · MUNDOS  → landmarks navegables (MundoLugar) con etiqueta accesible.
 *   · ALERTA  → Beacon pulsante anclado sobre el mundo 'suelo' (la cosa del día).
 *   · COMPAÑERO → Angelita, la abeja (visual-lib) es el avatar-jugador: vuela
 *                por el valle y ENTRA al mundo que se toca; su ánimo/energía
 *                reflejan la salud real de la finca.
 *   · CLIMA   → luz/niebla/estrellas de la escena salen del estado `clima`.
 */
/* Nota: las props de three (position, args, intensity, castShadow, etc.) son
   válidas en el reconciliador de R3F, no en el DOM — el config de ESLint del
   repo no activa react/no-unknown-property, así que no requieren disable. */
import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Float, Stars, OrbitControls, AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';
import { AbejaAngelita } from '../../visual/creatures/AbejaAngelita.jsx';
import { MUNDOS_VALLE, MUNDO_VALLE_BY_ID, COSA_DEL_DIA, CLIMAS } from './valleData';

/* Altura del terreno por (x,z): un valle suave con ladera al fondo (+z) donde
   suben las terrazas del café. Determinista → los landmarks se posan encima. */
function alturaTerreno(x, z) {
  const ladera = Math.max(0, (z + 2) * 0.16);
  const ondul = Math.sin(x * 0.5) * 0.08 + Math.cos(z * 0.4) * 0.06;
  const cauce = -0.28 * Math.exp(-((x - 0.6) ** 2) / 5) * Math.exp(-((z + 1) ** 2) / 40);
  return ladera + ondul + cauce;
}

/* ── El suelo del valle: malla ondulada de bajo poligonaje, color tierra-verde
      que se aclara al fondo (perspectiva aérea). ── */
function Terreno({ colorBase }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(30, 30, 48, 48);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, alturaTerreno(x, z));
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial color={colorBase} flatShading roughness={1} metalness={0} />
    </mesh>
  );
}

/* ── La cordillera de páramo al fondo: conos pálidos (perspectiva aérea). ── */
function Cordillera({ color }) {
  const picos = useMemo(
    () => [
      { x: -8, z: -12, h: 7, r: 5 },
      { x: -2, z: -14, h: 9, r: 6 },
      { x: 5, z: -12.5, h: 7.5, r: 5.2 },
      { x: 11, z: -13, h: 6, r: 4.5 },
    ],
    [],
  );
  return (
    <group>
      {picos.map((p, i) => (
        <mesh key={i} position={[p.x, p.h / 2 - 0.5, p.z]}>
          <coneGeometry args={[p.r, p.h, 5]} />
          <meshStandardMaterial color={color} flatShading roughness={1} opacity={0.9} transparent />
        </mesh>
      ))}
    </group>
  );
}

/* ── La quebrada: una cinta de agua que serpentea por el cauce. ── */
function Quebrada({ color, viva }) {
  const ref = useRef(null);
  useFrame((state) => {
    if (viva && ref.current) {
      ref.current.material.opacity = 0.72 + Math.sin(state.clock.elapsedTime * 2) * 0.06;
    }
  });
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-6, 0, -6),
      new THREE.Vector3(-2, 0, -3),
      new THREE.Vector3(0.6, 0, -1.4),
      new THREE.Vector3(1.4, 0, 2),
      new THREE.Vector3(3, 0, 6),
    ]);
    const g = new THREE.TubeGeometry(curve, 60, 0.42, 6, false);
    return g;
  }, []);
  return (
    <mesh geometry={geo} position={[0, 0.02, 0]}>
      <meshStandardMaterial
        ref={ref}
        color={color}
        transparent
        opacity={0.78}
        roughness={0.25}
        metalness={0.35}
      />
    </mesh>
  );
}

/* ── Materiales/paletas de cada landmark de mundo, por `tipo`. ── */
function LandmarkGeom({ tipo, tinte }) {
  const [fuerte, suave] = tinte;
  switch (tipo) {
    case 'milpa': // maíz: cañas altas con penacho
      return (
        <group>
          {[-0.5, 0, 0.5, -0.25, 0.25].map((dx, i) => (
            <group key={i} position={[dx, 0, (i % 2) * 0.4 - 0.2]}>
              <mesh position={[0, 0.7, 0]} castShadow>
                <cylinderGeometry args={[0.05, 0.08, 1.4, 5]} />
                <meshStandardMaterial color={fuerte} flatShading />
              </mesh>
              <mesh position={[0, 1.45, 0]}>
                <coneGeometry args={[0.12, 0.4, 5]} />
                <meshStandardMaterial color="#e7c96b" flatShading />
              </mesh>
            </group>
          ))}
        </group>
      );
    case 'cafetal': // arbustos redondos en hilera
      return (
        <group>
          {[-0.6, -0.2, 0.2, 0.6].map((dx, i) => (
            <mesh key={i} position={[dx, 0.32, (i % 2) * 0.4]} castShadow>
              <icosahedronGeometry args={[0.34, 0]} />
              <meshStandardMaterial color={fuerte} flatShading roughness={1} />
            </mesh>
          ))}
        </group>
      );
    case 'era': // eras aradas con surcos (semillero)
      return (
        <group>
          {[-0.35, 0, 0.35].map((dz, i) => (
            <mesh key={i} position={[0, 0.08, dz]} castShadow receiveShadow>
              <boxGeometry args={[1.3, 0.16, 0.22]} />
              <meshStandardMaterial color="#5a3d28" flatShading roughness={1} />
            </mesh>
          ))}
          {[-0.35, 0, 0.35].map((dz, i) => (
            <mesh key={`b${i}`} position={[0, 0.24, dz]}>
              <boxGeometry args={[1.2, 0.06, 0.14]} />
              <meshStandardMaterial color={suave} flatShading />
            </mesh>
          ))}
        </group>
      );
    case 'quebrada': // nacimiento: charca + juncos
      return (
        <group>
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.55, 0.6, 0.12, 16]} />
            <meshStandardMaterial color="#3a7fa0" transparent opacity={0.85} metalness={0.4} roughness={0.2} />
          </mesh>
          {[-0.3, 0.1, 0.4].map((dx, i) => (
            <mesh key={i} position={[dx, 0.4, 0.2]}>
              <cylinderGeometry args={[0.03, 0.03, 0.7, 4]} />
              <meshStandardMaterial color="#4e7d3f" flatShading />
            </mesh>
          ))}
        </group>
      );
    case 'corral': // casita + cerca
      return (
        <group>
          <mesh position={[0, 0.35, 0]} castShadow>
            <boxGeometry args={[0.9, 0.7, 0.8]} />
            <meshStandardMaterial color={suave} flatShading />
          </mesh>
          <mesh position={[0, 0.85, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[0.72, 0.5, 4]} />
            <meshStandardMaterial color={fuerte} flatShading />
          </mesh>
          {[-0.9, -0.5, 0.9, 1.3].map((dx, i) => (
            <mesh key={i} position={[dx, 0.2, 0.9]}>
              <boxGeometry args={[0.06, 0.4, 0.06]} />
              <meshStandardMaterial color="#8a6a44" flatShading />
            </mesh>
          ))}
        </group>
      );
    case 'huerta': // camas elevadas de la huerta
      return (
        <group>
          {[-0.4, 0.4].map((dx, i) => (
            <group key={i} position={[dx, 0, 0]}>
              <mesh position={[0, 0.12, 0]} castShadow>
                <boxGeometry args={[0.6, 0.24, 1]} />
                <meshStandardMaterial color="#6b4a30" flatShading />
              </mesh>
              <mesh position={[0, 0.32, 0]}>
                <boxGeometry args={[0.5, 0.18, 0.9]} />
                <meshStandardMaterial color={fuerte} flatShading />
              </mesh>
            </group>
          ))}
        </group>
      );
    case 'bosque': // arboleda: troncos + copas
      return (
        <group>
          {[
            [-0.5, 0, 0.9],
            [0.4, 0.2, 1.15],
            [0, -0.4, 0.8],
          ].map(([dx, dz, h], i) => (
            <group key={i} position={[dx, 0, dz]}>
              <mesh position={[0, h * 0.35, 0]} castShadow>
                <cylinderGeometry args={[0.09, 0.12, h * 0.7, 6]} />
                <meshStandardMaterial color="#6b4a2e" flatShading />
              </mesh>
              <mesh position={[0, h * 0.8, 0]} castShadow>
                <coneGeometry args={[0.5, h * 0.9, 7]} />
                <meshStandardMaterial color={fuerte} flatShading roughness={1} />
              </mesh>
            </group>
          ))}
        </group>
      );
    case 'veleta': // poste con veleta que gira con el viento
      return <Veleta color={fuerte} />;
    default:
      return (
        <mesh position={[0, 0.3, 0]}>
          <icosahedronGeometry args={[0.4, 0]} />
          <meshStandardMaterial color={fuerte} flatShading />
        </mesh>
      );
  }
}

function Veleta({ color, reducedMotion = false }) {
  const ref = useRef(null);
  useFrame((state) => {
    if (ref.current && !reducedMotion) ref.current.rotation.y = state.clock.elapsedTime * 0.4;
  });
  return (
    <group>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 1.1, 6]} />
        <meshStandardMaterial color="#7c6a4c" flatShading />
      </mesh>
      <group ref={ref} position={[0, 1.15, 0]}>
        <mesh>
          <boxGeometry args={[0.7, 0.06, 0.06]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
        <mesh position={[0.42, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.14, 0.3, 4]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
      </group>
    </group>
  );
}

/* ── Un mundo como LUGAR navegable: su geometría + una etiqueta accesible que,
      al tocarse, viaja hasta él (la cámara) y lo selecciona. ── */
function MundoLugar({ mundo, activo, onEntrar, reducedMotion }) {
  const y = alturaTerreno(mundo.pos[0], mundo.pos[2]);
  return (
    <group position={[mundo.pos[0], y, mundo.pos[2]]} scale={mundo.escala}>
      {mundo.tipo === 'veleta' ? (
        <Veleta color={mundo.tinte[0]} reducedMotion={reducedMotion} />
      ) : (
        <LandmarkGeom tipo={mundo.tipo} tinte={mundo.tinte} />
      )}
      <Html center distanceFactor={11} position={[0, 1.7, 0]} zIndexRange={[20, 0]}>
        <button
          type="button"
          className={`valle-poi${activo ? ' valle-poi--activo' : ''}`}
          style={{ '--poi-tinte': mundo.tinte[0] }}
          onClick={(e) => {
            e.stopPropagation();
            onEntrar(mundo.id);
          }}
          aria-label={`Viajar al mundo ${mundo.titulo}. ${mundo.lema}`}
        >
          <span className="valle-poi__emoji" aria-hidden="true">{mundo.emoji}</span>
          <span className="valle-poi__txt">{mundo.titulo}</span>
        </button>
      </Html>
    </group>
  );
}

/* ── La cosa del día: un faro pulsante anclado sobre su mundo. Un SOLO destello.
      Toca la señal → onAlerta() (el agente lo dice y ofrece LA acción). ── */
function Beacon({ onAlerta, reducedMotion }) {
  const ancla = MUNDO_VALLE_BY_ID[COSA_DEL_DIA.anclaMundo];
  const luz = useRef(null);
  const halo = useRef(null);
  useFrame((state) => {
    if (reducedMotion) return;
    const p = (Math.sin(state.clock.elapsedTime * 1.6) + 1) / 2;
    if (luz.current) luz.current.intensity = 1.4 + p * 2.6;
    if (halo.current) {
      const s = 1 + p * 0.5;
      halo.current.scale.set(s, s, s);
      halo.current.material.opacity = 0.5 - p * 0.35;
    }
  });
  if (!ancla) return null;
  const y = alturaTerreno(ancla.pos[0], ancla.pos[2]);
  return (
    <group position={[ancla.pos[0], y, ancla.pos[2]]}>
      <pointLight ref={luz} position={[0, 1.6, 0]} color="#ffd28a" intensity={2.2} distance={7} />
      <Float speed={reducedMotion ? 0 : 2} floatIntensity={reducedMotion ? 0 : 0.6} rotationIntensity={0}>
        <mesh position={[0, 1.7, 0]}>
          <octahedronGeometry args={[0.26, 0]} />
          <meshStandardMaterial color="#ffd88f" emissive="#ffb24d" emissiveIntensity={1.4} flatShading />
        </mesh>
        <mesh ref={halo} position={[0, 1.7, 0]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial color="#ffcf87" transparent opacity={0.4} />
        </mesh>
      </Float>
      <Html center distanceFactor={10} position={[0, 2.7, 0]} zIndexRange={[30, 0]}>
        <button
          type="button"
          className="valle-alerta"
          onClick={(e) => {
            e.stopPropagation();
            onAlerta();
          }}
          aria-label={`Alerta del día: ${COSA_DEL_DIA.titulo}. ${COSA_DEL_DIA.detalle}`}
        >
          <span className="valle-alerta__icono" aria-hidden="true">⚠️</span>
          <span className="valle-alerta__txt">{COSA_DEL_DIA.titulo}</span>
        </button>
      </Html>
    </group>
  );
}

/* ── El COMPAÑERO-JUGADOR: Angelita, la abeja. Es el avatar que vuela por el
      valle. Al reposo, ronda sobre el valle con vaivén vivo; cuando se toca un
      mundo (`entrando`), BAJA y se acerca al lugar — "entra" al mundo, y la
      cámara la acompaña. Su ánimo/energía (salud real de la finca) tiñen su
      color, su aura y qué tan vivo es su vuelo. Mira hacia donde viaja. ── */
function CompaneroAbeja({ foco, entrando, animo, energia, reducedMotion }) {
  const ref = useRef(null);
  const caraRef = useRef(null);
  const prevX = useRef(foco.x);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const brio = 0.35 + 0.65 * energia; // la energía anima el vuelo
    const bob = reducedMotion ? 0 : Math.sin(t * (1.6 + brio)) * (0.1 + 0.16 * brio);
    // Al reposo deriva en un círculo calmo; al entrar se posa junto al lugar.
    const vagarX = reducedMotion || entrando ? 0 : Math.sin(t * 0.55) * 0.9;
    const vagarZ = reducedMotion || entrando ? 0 : Math.cos(t * 0.55) * 0.6;
    const dest = new THREE.Vector3(
      foco.x + (entrando ? 0.55 : 0.4 + vagarX),
      foco.y + (entrando ? 1.05 : 2.3) + bob,
      foco.z + (entrando ? 0.7 : 0.6 + vagarZ),
    );
    ref.current.position.lerp(dest, entrando ? 0.05 : 0.045);
    if (caraRef.current) {
      const vx = ref.current.position.x - prevX.current;
      if (Math.abs(vx) > 0.0015) caraRef.current.style.transform = `scaleX(${vx < 0 ? -1 : 1})`;
      prevX.current = ref.current.position.x;
    }
  });
  const size = 44 + Math.round(energia * 14);
  return (
    <group ref={ref} position={[foco.x + 0.4, foco.y + 2.3, foco.z + 0.6]}>
      <Html center distanceFactor={9} zIndexRange={[40, 10]}>
        <div className="valle-abeja" aria-hidden="true">
          <div ref={caraRef} className="valle-abeja__cara">
            <AbejaAngelita size={size} animo={animo} energia={energia} animated={!reducedMotion} />
          </div>
        </div>
      </Html>
    </group>
  );
}

/* ── Cámara: viaja suavemente hacia el foco (target) cuando cambia de mundo Y
      HACE ZOOM hacia el lugar — la sensación de ENTRAR con la abeja, no un modal
      plano. El acercamiento solo se fuerza durante la transición (una vez llega,
      suelta el control para que el usuario siga haciendo zoom a mano). ── */
function CamaraViajera({ foco, focoKey, controls, autoOrbit }) {
  const trans = useRef(0);
  const prevKey = useRef(focoKey);
  const entrando = focoKey !== 'valle';
  useFrame(() => {
    if (!controls.current) return;
    const c = controls.current;
    if (focoKey !== prevKey.current) {
      trans.current = 1; // arrancó una nueva "entrada": acompañar el zoom
      prevKey.current = focoKey;
    }
    c.target.lerp(new THREE.Vector3(foco.x, foco.y + 0.6, foco.z), 0.06);
    if (trans.current > 0) {
      const cam = c.object;
      const dir = cam.position.clone().sub(c.target);
      const deseada = entrando ? 8.5 : 15; // acercarse al entrar, abrir al volver
      dir.setLength(THREE.MathUtils.lerp(dir.length(), deseada, 0.06));
      cam.position.copy(c.target.clone().add(dir));
      trans.current = Math.max(0, trans.current - 0.012);
    }
    c.update();
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableZoom
      minDistance={6}
      maxDistance={22}
      minPolarAngle={0.5}
      maxPolarAngle={1.15}
      autoRotate={autoOrbit && !entrando}
      autoRotateSpeed={0.35}
      enableDamping
      dampingFactor={0.08}
    />
  );
}

/* ── Contenido de la escena (dentro del Canvas). ── */
function Escena({ clima, focoId, animo, energia, onEntrar, onAlerta, reducedMotion }) {
  const controls = useRef(null);
  const c = CLIMAS[clima];
  const foco = useMemo(() => {
    const m = focoId ? MUNDO_VALLE_BY_ID[focoId] : null;
    if (!m) return new THREE.Vector3(0, 0.3, 0.5);
    const y = alturaTerreno(m.pos[0], m.pos[2]);
    return new THREE.Vector3(m.pos[0], y, m.pos[2]);
  }, [focoId]);
  const autoOrbit = !reducedMotion && !focoId;
  const entrando = !!focoId;

  return (
    <>
      <color attach="background" args={[c.cielo[1]]} />
      <fog attach="fog" args={[c.niebla, 9, c.nieblaLejos]} />
      <hemisphereLight intensity={c.intensidad * 0.55} color={c.cielo[0]} groundColor={c.ambiente} />
      <ambientLight intensity={c.intensidad * 0.35} color={c.luz} />
      <directionalLight
        position={[6, 9, 4]}
        intensity={c.intensidad}
        color={c.luz}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={30}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      {c.estrellas && (
        <Stars radius={40} depth={20} count={900} factor={3} fade speed={reducedMotion ? 0 : 1} />
      )}

      <Terreno colorBase={clima === 'noche' ? '#22432f' : '#5a8a4a'} />
      <Cordillera color={clima === 'noche' ? '#3a4a63' : c.niebla} />
      <Quebrada color={clima === 'noche' ? '#2a4a6a' : '#5fb2c9'} viva={c.lluviaViva} />

      {MUNDOS_VALLE.map((m) => (
        <MundoLugar
          key={m.id}
          mundo={m}
          activo={focoId === m.id}
          onEntrar={onEntrar}
          reducedMotion={reducedMotion}
        />
      ))}

      <Beacon onAlerta={onAlerta} reducedMotion={reducedMotion} />
      <CompaneroAbeja
        foco={foco}
        entrando={entrando}
        animo={animo}
        energia={energia}
        reducedMotion={reducedMotion}
      />

      <CamaraViajera
        foco={foco}
        focoKey={focoId || 'valle'}
        controls={controls}
        autoOrbit={autoOrbit}
      />
      <AdaptiveDpr pixelated />
    </>
  );
}

export default function Valle3D({
  clima,
  focoId,
  animo = 'sereno',
  energia = 1,
  onEntrar,
  onAlerta,
  reducedMotion,
}) {
  const [listo, setListo] = useState(false);
  return (
    <Canvas
      className={`valle-canvas${listo ? ' valle-canvas--listo' : ''}`}
      shadows
      dpr={[1, 1.8]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [9, 8, 11], fov: 42 }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      onCreated={() => setListo(true)}
    >
      <Suspense fallback={null}>
        <Escena
          clima={clima}
          focoId={focoId}
          animo={animo}
          energia={energia}
          onEntrar={onEntrar}
          onAlerta={onAlerta}
          reducedMotion={reducedMotion}
        />
      </Suspense>
    </Canvas>
  );
}
