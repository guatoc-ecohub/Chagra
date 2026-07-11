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
import { Colibri } from '../../visual/creatures/Colibri.jsx';
import { Mariposa } from '../../visual/creatures/Mariposa.jsx';
import { Escarabajo } from '../../visual/creatures/Escarabajo.jsx';
import { Lombriz } from '../../visual/creatures/Lombriz.jsx';
import AnimalesDeFinca from './animales.jsx';
import {
  MUNDOS_VALLE,
  MUNDO_VALLE_BY_ID,
  COSA_DEL_DIA,
  CLIMAS,
  PISOS_TERMICOS,
  VEGETACION_PISOS,
} from './valleData';

/* Altura del terreno por (x,z): la LADERA ANDINA. El eje z es la montaña — al
   fondo (z negativo) trepa al páramo alto, al frente (z positivo) baja a tierra
   caliente. Así el gradiente de pisos térmicos se LEE como pendiente. La subida
   usa smoothstep (curva suave, sin quiebres) + una ondulación menuda para que
   las lomas se vean redondas, no planas. Determinista → los landmarks se posan
   encima. */
function alturaTerreno(x, z) {
  const subida = THREE.MathUtils.smoothstep(-z, -8, 11) * 5.4;
  const ondul = Math.sin(x * 0.42) * 0.14 + Math.cos(z * 0.36 + x * 0.2) * 0.12;
  const cauce = -0.32 * Math.exp(-((x - 1.2) ** 2) / 6) * Math.exp(-((z + 1) ** 2) / 55);
  return subida + ondul + cauce;
}

/* Color del suelo a una altura z: interpola entre los colores de los pisos
   térmicos por el centro de cada franja (perspectiva de altura + cambio de
   vegetación por piso). `alto` mezcla hacia la cresta para dar relieve. De
   noche todo se apaga hacia el azul. Layout por datos: sale de PISOS_TERMICOS. */
const _centrosPiso = PISOS_TERMICOS.map((p) => ({
  c: (p.z0 + p.z1) / 2,
  color: new THREE.Color(p.color),
  cresta: new THREE.Color(p.cresta),
}));
const _colNoche = new THREE.Color('#1f3a2c');

function colorSueloEnZ(z, alto, nocturno, out) {
  // Buscar los dos centros de piso que rodean a z e interpolar.
  let lo = _centrosPiso[0];
  let hi = _centrosPiso[_centrosPiso.length - 1];
  for (let i = 0; i < _centrosPiso.length - 1; i++) {
    const a = _centrosPiso[i];
    const b = _centrosPiso[i + 1];
    // Los centros bajan de z (cálido, +z) a páramo (-z); ordenados descendente.
    if (z <= a.c && z >= b.c) {
      lo = a;
      hi = b;
      break;
    }
  }
  const span = lo.c - hi.c || 1;
  const t = THREE.MathUtils.clamp((lo.c - z) / span, 0, 1);
  out.copy(lo.color).lerp(hi.color, t);
  // Relieve: las crestas más claras; los vallecitos, el color base.
  out.lerp(lo.cresta.clone().lerp(hi.cresta, t), THREE.MathUtils.clamp(alto, 0, 1) * 0.35);
  if (nocturno) out.lerp(_colNoche, 0.62);
  return out;
}

/* ── El suelo del valle: malla ondulada de bajo poligonaje, PINTADA por vértice
      según el piso térmico de cada franja (páramo frío arriba → tierra caliente
      abajo). El color sale de PISOS_TERMICOS: franjas de altitud legibles, con
      la cresta apenas más clara para dar relieve. ── */
function Terreno({ nocturno }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(34, 34, 56, 56);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const colores = new Float32Array(pos.count * 3);
    const col = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = alturaTerreno(x, z);
      pos.setY(i, y);
      const subida = THREE.MathUtils.smoothstep(-z, -8, 11) * 5.4;
      const alto = THREE.MathUtils.clamp((y - subida + 0.3) / 0.6, 0, 1);
      colorSueloEnZ(z, alto, nocturno, col);
      colores[i * 3] = col.r;
      colores[i * 3 + 1] = col.g;
      colores[i * 3 + 2] = col.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colores, 3));
    g.computeVertexNormals();
    return g;
  }, [nocturno]);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial vertexColors flatShading roughness={1} metalness={0} />
    </mesh>
  );
}

/* ── La cordillera de páramo al fondo: conos pálidos que EMERGEN de la ladera
      alta (perspectiva aérea). Su base se posa sobre el terreno del páramo
      (que ya subió a ~5) y las cumbres coronan la escena. ── */
function Cordillera({ color }) {
  const picos = useMemo(
    () => [
      { x: -9, z: -15.5, h: 7, r: 5, base: 4.2 },
      { x: -2, z: -17, h: 9.5, r: 6, base: 4.6 },
      { x: 6, z: -16, h: 8, r: 5.2, base: 4.2 },
      { x: 12, z: -15, h: 6, r: 4.5, base: 4.0 },
    ],
    [],
  );
  return (
    <group>
      {picos.map((p, i) => (
        <mesh key={i} position={[p.x, p.base + p.h / 2, p.z]}>
          <coneGeometry args={[p.r, p.h, 6]} />
          <meshStandardMaterial color={color} flatShading roughness={1} opacity={0.92} transparent />
        </mesh>
      ))}
    </group>
  );
}

/* ── La quebrada: una cinta de agua que serpentea por el cauce. ── */
function Quebrada({ color, viva }) {
  const ref = useRef(null);
  useFrame((state) => {
    // `ref` apunta al material (no al mesh): animar su opacidad directamente.
    if (viva && ref.current) {
      ref.current.opacity = 0.72 + Math.sin(state.clock.elapsedTime * 2) * 0.06;
    }
  });
  const geo = useMemo(() => {
    // Nace arriba (páramo) y BAJA por la ladera hasta la tierra caliente:
    // cada punto se posa sobre el terreno (+un pelo) para leer la pendiente.
    const pts = [
      [-3.4, -7.2],
      [-1.2, -4.2],
      [0.8, -1.4],
      [1.6, 1.8],
      [2.6, 5.4],
      [3.6, 8],
    ].map(([x, z]) => new THREE.Vector3(x, alturaTerreno(x, z) + 0.06, z));
    const curve = new THREE.CatmullRomCurve3(pts);
    const g = new THREE.TubeGeometry(curve, 80, 0.34, 7, false);
    return g;
  }, []);
  return (
    <mesh geometry={geo}>
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

/* ── Materiales/paletas de cada landmark de mundo, por `tipo`. Formas
      redondeadas (cilindros, conos, esferas) — pocas piezas por lugar para
      dejar aire. ── */
function LandmarkGeom({ tipo, tinte, reducedMotion }) {
  const [fuerte, suave] = tinte;
  switch (tipo) {
    case 'milpa': // maíz: cañas altas con penacho + hojas
      return (
        <group>
          {[-0.42, 0.05, 0.42].map((dx, i) => (
            <group key={i} position={[dx, 0, (i % 2) * 0.36 - 0.18]}>
              <mesh position={[0, 0.7, 0]} castShadow>
                <cylinderGeometry args={[0.05, 0.08, 1.4, 6]} />
                <meshStandardMaterial color={fuerte} flatShading roughness={1} />
              </mesh>
              {/* hojas: conos aplanados que salen de la caña */}
              <mesh position={[0.16, 0.9, 0]} rotation={[0, 0, -0.7]} scale={[1, 1, 0.3]}>
                <coneGeometry args={[0.12, 0.5, 4]} />
                <meshStandardMaterial color={suave} flatShading roughness={1} />
              </mesh>
              <mesh position={[-0.16, 0.62, 0]} rotation={[0, Math.PI, -0.7]} scale={[1, 1, 0.3]}>
                <coneGeometry args={[0.12, 0.5, 4]} />
                <meshStandardMaterial color={suave} flatShading roughness={1} />
              </mesh>
              <mesh position={[0, 1.5, 0]}>
                <coneGeometry args={[0.08, 0.42, 6]} />
                <meshStandardMaterial color="#e7c96b" flatShading />
              </mesh>
            </group>
          ))}
        </group>
      );
    case 'cafetal': // arbustos redondos con frutos, en la ladera
      return (
        <group>
          {[-0.5, 0.1, 0.55].map((dx, i) => (
            <group key={i} position={[dx, 0, (i % 2) * 0.42]}>
              <mesh position={[0, 0.16, 0]}>
                <cylinderGeometry args={[0.05, 0.07, 0.32, 6]} />
                <meshStandardMaterial color="#6b4a2e" flatShading />
              </mesh>
              <mesh position={[0, 0.44, 0]} castShadow>
                <sphereGeometry args={[0.32, 10, 9]} />
                <meshStandardMaterial color={fuerte} flatShading roughness={1} />
              </mesh>
            </group>
          ))}
        </group>
      );
    case 'era': // eras del semillero: camellones redondeados (lomos de tierra)
      return (
        <group>
          {[-0.42, 0, 0.42].map((dz, i) => (
            <group key={i} position={[0, 0, dz]}>
              {/* camellón: cilindro tumbado con puntas de esfera */}
              <mesh position={[0, 0.1, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
                <capsuleGeometry args={[0.14, 1.1, 4, 8]} />
                <meshStandardMaterial color="#6b4630" flatShading roughness={1} />
              </mesh>
              {/* brotes verdes del semillero */}
              {[-0.35, 0, 0.35].map((bx, j) => (
                <mesh key={j} position={[bx, 0.26, 0]}>
                  <coneGeometry args={[0.07, 0.2, 5]} />
                  <meshStandardMaterial color={suave} flatShading />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      );
    case 'quebrada': // nacimiento: charca redonda + juncos
      return (
        <group>
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.55, 0.62, 0.12, 20]} />
            <meshStandardMaterial color="#3a7fa0" transparent opacity={0.85} metalness={0.4} roughness={0.2} />
          </mesh>
          {[-0.28, 0.12, 0.4].map((dx, i) => (
            <mesh key={i} position={[dx, 0.4, 0.2]} rotation={[0.12, 0, 0.08]}>
              <cylinderGeometry args={[0.025, 0.03, 0.7, 5]} />
              <meshStandardMaterial color="#4e7d3f" flatShading />
            </mesh>
          ))}
        </group>
      );
    case 'animales': // los animales de la finca (reemplaza la vieja casita)
      return <AnimalesDeFinca reducedMotion={reducedMotion} />;
    case 'huerta': // camas de la huerta: lomos redondeados con matas
      return (
        <group>
          {[-0.42, 0.42].map((dx, i) => (
            <group key={i} position={[dx, 0, 0]}>
              <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <capsuleGeometry args={[0.16, 0.7, 4, 8]} />
                <meshStandardMaterial color="#6b4a30" flatShading roughness={1} />
              </mesh>
              {[-0.28, 0, 0.28].map((dz, j) => (
                <mesh key={j} position={[0, 0.3, dz]} castShadow>
                  <sphereGeometry args={[0.16, 9, 8]} />
                  <meshStandardMaterial color={fuerte} flatShading roughness={1} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      );
    case 'bosque': // arboleda: troncos + copas cónicas Y esféricas mezcladas
      return (
        <group>
          {[
            [-0.5, 0, 0.95, 'cono'],
            [0.45, 0.2, 1.2, 'esfera'],
            [0.05, -0.45, 0.85, 'cono'],
          ].map(([dx, dz, h, forma], i) => (
            <group key={i} position={[Number(dx), 0, Number(dz)]}>
              <mesh position={[0, Number(h) * 0.35, 0]} castShadow>
                <cylinderGeometry args={[0.08, 0.12, Number(h) * 0.7, 6]} />
                <meshStandardMaterial color="#6b4a2e" flatShading />
              </mesh>
              {forma === 'cono' ? (
                <mesh position={[0, Number(h) * 0.85, 0]} castShadow>
                  <coneGeometry args={[0.46, Number(h) * 0.95, 8]} />
                  <meshStandardMaterial color={fuerte} flatShading roughness={1} />
                </mesh>
              ) : (
                <group position={[0, Number(h) * 0.85, 0]}>
                  <mesh castShadow>
                    <sphereGeometry args={[0.42, 10, 9]} />
                    <meshStandardMaterial color={fuerte} flatShading roughness={1} />
                  </mesh>
                  <mesh position={[0.22, 0.18, 0.1]} castShadow>
                    <sphereGeometry args={[0.26, 9, 8]} />
                    <meshStandardMaterial color={suave} flatShading roughness={1} />
                  </mesh>
                </group>
              )}
            </group>
          ))}
        </group>
      );
    case 'veleta': // poste con veleta que gira con el viento
      return <Veleta color={fuerte} reducedMotion={reducedMotion} />;
    default:
      return (
        <mesh position={[0, 0.3, 0]}>
          <icosahedronGeometry args={[0.4, 0]} />
          <meshStandardMaterial color={fuerte} flatShading />
        </mesh>
      );
  }
}

/* ── Matas de un piso térmico (frailejón, papa, café, plátano): pocas, a los
      lados, para que se lea el cambio de vegetación por altura sin amontonar. ── */
function MataDePiso({ tipo, nocturno }) {
  switch (tipo) {
    case 'frailejon': // roseta plateada sobre tronco (Espeletia del páramo)
      return (
        <group>
          <mesh position={[0, 0.45, 0]} castShadow>
            <cylinderGeometry args={[0.11, 0.14, 0.9, 7]} />
            <meshStandardMaterial color={nocturno ? '#3a4038' : '#6e6a52'} flatShading roughness={1} />
          </mesh>
          {/* roseta: cono achatado plateado */}
          <mesh position={[0, 0.98, 0]} scale={[1, 0.5, 1]} castShadow>
            <coneGeometry args={[0.34, 0.5, 8]} />
            <meshStandardMaterial color={nocturno ? '#4a5b52' : '#9fb59a'} flatShading roughness={1} />
          </mesh>
        </group>
      );
    case 'papa': // matas bajas y redondas (surco de papa del clima frío)
      return (
        <group>
          {[-0.28, 0.06, 0.32].map((dx, i) => (
            <mesh key={i} position={[dx, 0.14, (i % 2) * 0.22]} scale={[1, 0.7, 1]} castShadow>
              <icosahedronGeometry args={[0.22, 0]} />
              <meshStandardMaterial color={nocturno ? '#2f5240' : '#3f7d52'} flatShading roughness={1} />
            </mesh>
          ))}
        </group>
      );
    case 'cafe': // arbusto de café suelto del clima medio
      return (
        <group>
          <mesh position={[0, 0.14, 0]}>
            <cylinderGeometry args={[0.05, 0.06, 0.28, 6]} />
            <meshStandardMaterial color="#6b4a2e" flatShading />
          </mesh>
          <mesh position={[0, 0.4, 0]} castShadow>
            <sphereGeometry args={[0.3, 10, 9]} />
            <meshStandardMaterial color={nocturno ? '#254a30' : '#3f7d3a'} flatShading roughness={1} />
          </mesh>
        </group>
      );
    case 'platano': // mata de plátano: pseudotallo + hojas grandes colgantes
    default:
      return (
        <group>
          <mesh position={[0, 0.55, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.14, 1.1, 7]} />
            <meshStandardMaterial color={nocturno ? '#3a5030' : '#7a9a55'} flatShading roughness={1} />
          </mesh>
          {[0, 1, 2, 3, 4].map((k) => (
            <mesh
              key={k}
              position={[0, 1.05, 0]}
              rotation={[0, (k / 5) * Math.PI * 2, -0.9]}
              scale={[1, 1, 0.28]}
              castShadow
            >
              <coneGeometry args={[0.24, 1.0, 4]} />
              <meshStandardMaterial color={nocturno ? '#2f5236' : '#4f9a44'} flatShading roughness={1} />
            </mesh>
          ))}
        </group>
      );
  }
}

/* Siembra las matas de muestra de cada piso sobre el terreno (posadas en su y).
   Layout por datos: recorre VEGETACION_PISOS. */
function VegetacionPisos({ nocturno }) {
  return (
    <group>
      {VEGETACION_PISOS.map((v, i) => {
        const [x, z] = v.pos;
        const y = alturaTerreno(x, z);
        return (
          <group key={i} position={[x, y, z]}>
            <MataDePiso tipo={v.tipo} nocturno={nocturno} />
          </group>
        );
      })}
    </group>
  );
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
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 0.7, 6]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
        <mesh position={[0.42, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.1, 0.28, 6]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
        {/* contrapeso redondo en la cola */}
        <mesh position={[-0.4, 0, 0]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
      </group>
    </group>
  );
}

/* ── Vida del valle: criaturas REUSADAS de src/visual/creatures (SVG livianos
      como billboards <Html>, igual que Angelita), sembradas con criterio
      ecológico — el colibrí en las flores de la huerta, las mariposas sobre la
      milpa, el escarabajo en la hojarasca del bosque, la lombriz asomada en las
      eras. Pocas y bien puestas: el valle se siente vivo, no amontonado. Son
      decorativas (aria-hidden) y no capturan toques. ── */
const CRIATURAS_VALLE = [
  { crt: 'mariposa', x: -4.0, z: 2.0, dy: 2.0, size: 30, factor: 8 },
  { crt: 'mariposa', x: -4.8, z: 2.9, dy: 1.5, size: 24, factor: 8 },
  { crt: 'colibri', x: 3.6, z: 4.4, dy: 1.9, size: 34, factor: 8 },
  { crt: 'escarabajo', x: 4.7, z: -2.9, dy: 0.5, size: 28, factor: 7 },
  { crt: 'lombriz', x: -1.0, z: 5.2, dy: 0.28, size: 26, factor: 6.5 },
];

function CriaturaSvg({ tipo, size, animated }) {
  if (tipo === 'colibri') return <Colibri size={size} animated={animated} />;
  if (tipo === 'mariposa') return <Mariposa size={size} animated={animated} />;
  if (tipo === 'escarabajo') return <Escarabajo size={size} animated={animated} />;
  return <Lombriz size={size} animated={animated} />;
}

function CriaturasValle({ reducedMotion }) {
  return (
    <group>
      {CRIATURAS_VALLE.map((c, i) => {
        const y = alturaTerreno(c.x, c.z) + c.dy;
        return (
          <group key={i} position={[c.x, y, c.z]}>
            <Html center distanceFactor={c.factor} zIndexRange={[8, 0]} pointerEvents="none">
              <div className="valle-critter" aria-hidden="true">
                <CriaturaSvg tipo={c.crt} size={c.size} animated={!reducedMotion} />
              </div>
            </Html>
          </group>
        );
      })}
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
        <LandmarkGeom tipo={mundo.tipo} tinte={mundo.tinte} reducedMotion={reducedMotion} />
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
      const deseada = entrando ? 9 : 18; // acercarse al entrar, abrir al volver (más aire)
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
      minDistance={7}
      maxDistance={28}
      minPolarAngle={0.45}
      maxPolarAngle={1.18}
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
    // Sin foco, la cámara encuadra el corazón del valle (algo hacia el frente,
    // regla de tercios) para dar aire y leer la ladera que sube al fondo.
    if (!m) return new THREE.Vector3(0, 1.0, 1.4);
    const y = alturaTerreno(m.pos[0], m.pos[2]);
    return new THREE.Vector3(m.pos[0], y, m.pos[2]);
  }, [focoId]);
  const autoOrbit = !reducedMotion && !focoId;
  const entrando = !!focoId;
  const nocturno = clima === 'noche';

  return (
    <>
      <color attach="background" args={[c.cielo[1]]} />
      <fog attach="fog" args={[c.niebla, 12, c.nieblaLejos + 8]} />
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

      <Terreno nocturno={nocturno} />
      <Cordillera color={nocturno ? '#3a4a63' : c.niebla} />
      <Quebrada color={nocturno ? '#2a4a6a' : '#5fb2c9'} viva={c.lluviaViva} />
      <VegetacionPisos nocturno={nocturno} />

      {MUNDOS_VALLE.map((m) => (
        <MundoLugar
          key={m.id}
          mundo={m}
          activo={focoId === m.id}
          onEntrar={onEntrar}
          reducedMotion={reducedMotion}
        />
      ))}

      <CriaturasValle reducedMotion={reducedMotion} />
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
      camera={{ position: [10.5, 9, 13.5], fov: 40 }}
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
