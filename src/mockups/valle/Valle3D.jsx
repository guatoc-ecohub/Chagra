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
 *   · MUNDOS  → landmarks navegables (MundoLugar, geometría) con etiquetas
 *               accesibles de tamaño táctil FIJO en píxeles (RotulosLugares):
 *               por foco/proximidad, con occlude y anti-colisión en pantalla.
 *   · ALERTA  → Beacon pulsante anclado sobre el mundo 'suelo' (la cosa del día).
 *   · COMPAÑERO → Angelita, la abeja (visual-lib) es el avatar-jugador: vuela
 *                por el valle y ENTRA al mundo que se toca; su ánimo/energía
 *                reflejan la salud real de la finca.
 *   · CLIMA   → luz/niebla/estrellas de la escena salen del estado `clima`.
 */
/* Nota: las props de three (position, args, intensity, castShadow, etc.) son
   válidas en el reconciliador de R3F, no en el DOM — el config de ESLint del
   repo no activa react/no-unknown-property, así que no requieren disable. */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Html, Float, Stars, OrbitControls, AdaptiveDpr, Detailed, Instances, Instance,
} from '@react-three/drei';
import * as THREE from 'three';
import { perfilDeTier } from '../../visual/mundo3d/deviceTier.js';
import CamaraDirector from '../../visual/mundo3d/escenas/CamaraDirector.jsx';
import { AbejaAngelita } from '../../visual/creatures/AbejaAngelita.jsx';
/* La CAPA DE ESTADO de Angelita (auditoría §5b): módulo puro, sin three — el
   mismo repertorio (mojada/sed/comiendo/vuelo) que usan los mundos 3D. */
import { reaccionDeFinca, ESTADO_FINCA_MUESTRA } from '../../visual/mundo3d/escenas/reaccionFinca.js';
import { Colibri } from '../../visual/creatures/Colibri.jsx';
import { Mariposa } from '../../visual/creatures/Mariposa.jsx';
import { Escarabajo } from '../../visual/creatures/Escarabajo.jsx';
import { Lombriz } from '../../visual/creatures/Lombriz.jsx';
import AnimalesDeFinca from './animales.jsx';
/* Luciérnagas de la noche: el kit instanciado que ya existe (1-3 draw calls),
   sembrado sobre la tierra baja del valle cuando la franja las trae. */
import { ParticulasAmbientales } from '../../visual/mundo3d/ParticulasAmbientales.jsx';
/* Duración canónica de la transición entre franjas (misma que CielosHora). */
import { TRANSICION } from '../../visual/mundo3d/cielosHoraData.js';
import './rotulosValle3D.css';
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
function Terreno({ nocturno, innerRef, perfil }) {
  const seg = perfil.segmentosTerreno;
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(34, 34, seg, seg);
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
  }, [nocturno, seg]);
  return (
    <mesh ref={innerRef} geometry={geo} receiveShadow={perfil.sombras}>
      {perfil.materialRico ? (
        <meshStandardMaterial vertexColors flatShading roughness={1} metalness={0} />
      ) : (
        /* Frugal: Lambert indexado — el terreno es LA superficie que llena la
           pantalla; abaratar su fragmento es el mayor ahorro por línea. */
        <meshLambertMaterial vertexColors />
      )}
    </mesh>
  );
}

/* ── La cordillera de páramo al fondo: conos pálidos que EMERGEN de la ladera
      alta (perspectiva aérea). Su base se posa sobre el terreno del páramo
      (que ya subió a ~5) y las cumbres coronan la escena. ── */
const PICOS_CORDILLERA = [
  { x: -9, z: -15.5, h: 7, r: 5, base: 4.2 },
  { x: -2, z: -17, h: 9.5, r: 6, base: 4.6 },
  { x: 6, z: -16, h: 8, r: 5.2, base: 4.2 },
  { x: 12, z: -15, h: 6, r: 4.5, base: 4.0 },
];

function Cordillera({ color, innerRef, perfil }) {
  if (!perfil.materialRico) {
    // Frugal: los 4 picos en UNA InstancedMesh (1 draw call) — un cono unidad
    // escalado por instancia. El raycast de occlude funciona igual.
    return (
      <group ref={innerRef}>
        <Instances limit={PICOS_CORDILLERA.length}>
          <coneGeometry args={[1, 1, 6]} />
          <meshLambertMaterial color={color} opacity={0.92} transparent />
          {PICOS_CORDILLERA.map((p, i) => (
            <Instance key={i} position={[p.x, p.base + p.h / 2, p.z]} scale={[p.r, p.h, p.r]} />
          ))}
        </Instances>
      </group>
    );
  }
  return (
    <group ref={innerRef}>
      {PICOS_CORDILLERA.map((p, i) => (
        <mesh key={i} position={[p.x, p.base + p.h / 2, p.z]}>
          <coneGeometry args={[p.r, p.h, 6]} />
          <meshStandardMaterial color={color} flatShading roughness={1} opacity={0.92} transparent />
        </mesh>
      ))}
    </group>
  );
}

/* ── La quebrada: una cinta de agua que serpentea por el cauce. ── */
function Quebrada({ color, viva, perfil }) {
  const ref = useRef(null);
  useFrame((state) => {
    // `ref` apunta al material (no al mesh): animar su opacidad directamente.
    if (viva && ref.current) {
      ref.current.opacity = 0.72 + Math.sin(state.clock.elapsedTime * 2) * 0.06;
    }
  });
  const rico = perfil.materialRico;
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
    // Frugal: menos anillos/segmentos — la cinta se lee igual desde lejos.
    const g = new THREE.TubeGeometry(curve, rico ? 80 : 48, 0.34, rico ? 7 : 5, false);
    return g;
  }, [rico]);
  return (
    <mesh geometry={geo}>
      {rico ? (
        <meshStandardMaterial
          ref={ref}
          color={color}
          transparent
          opacity={0.78}
          roughness={0.25}
          metalness={0.35}
        />
      ) : (
        <meshLambertMaterial ref={ref} color={color} transparent opacity={0.78} />
      )}
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
    case 'mercado': // puesto de mercado campesino: toldo a dos aguas + mesa + canasto
      return (
        <group>
          {/* las patas y la mesa del puesto */}
          {[[-0.32, 0.22], [0.32, 0.22], [-0.32, -0.22], [0.32, -0.22]].map(([x, z], i) => (
            <mesh key={i} position={[x, 0.24, z]} castShadow>
              <cylinderGeometry args={[0.03, 0.035, 0.48, 5]} />
              <meshStandardMaterial color="#7a5a38" flatShading roughness={1} />
            </mesh>
          ))}
          <mesh position={[0, 0.49, 0]} castShadow>
            <boxGeometry args={[0.82, 0.06, 0.56]} />
            <meshStandardMaterial color="#a9814f" flatShading roughness={1} />
          </mesh>
          {/* el toldo a dos aguas (cono de 4 lados) */}
          <mesh position={[0, 0.92, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[0.66, 0.34, 4]} />
            <meshStandardMaterial color={fuerte} flatShading roughness={1} />
          </mesh>
          {/* un canasto con producto sobre la mesa */}
          <mesh position={[0.12, 0.6, 0.08]}>
            <cylinderGeometry args={[0.13, 0.1, 0.14, 9]} />
            <meshStandardMaterial color="#a9773f" flatShading roughness={1} />
          </mesh>
          {[[0, 0.7, 0.08], [0.08, 0.68, 0.13], [-0.05, 0.68, 0.04]].map(([x, y, z], i) => (
            <mesh key={i} position={[x, y, z]}>
              <sphereGeometry args={[0.055, 7, 6]} />
              <meshStandardMaterial color={suave} flatShading roughness={1} />
            </mesh>
          ))}
        </group>
      );
    case 'veleta': // poste con veleta que gira con el viento
      return <Veleta color={fuerte} reducedMotion={reducedMotion} />;
    case 'semillero': // túnel de media-sombra del vivero: arcos + techo traslúcido + bandeja
      return (
        <group>
          {/* los arcos del túnel (medio-toroide de pie), en tono madera */}
          {[-0.42, 0, 0.42].map((dz, i) => (
            <mesh key={i} position={[0, 0, dz]}>
              <torusGeometry args={[0.5, 0.028, 6, 18, Math.PI]} />
              <meshStandardMaterial color="#8a6a44" flatShading roughness={1} />
            </mesh>
          ))}
          {/* el techo de media-sombra (traslúcido) que cubre los arcos */}
          <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 1.0, 16, 1, true, Math.PI, Math.PI]} />
            <meshStandardMaterial color={suave} transparent opacity={0.4} side={2} roughness={1} />
          </mesh>
          {/* la bandeja germinadora adentro, con sus brotecitos */}
          <mesh position={[0, 0.12, 0]}>
            <boxGeometry args={[0.5, 0.08, 0.6]} />
            <meshStandardMaterial color="#5a4326" flatShading roughness={1} />
          </mesh>
          {[[-0.14, -0.18], [0.02, 0], [0.16, 0.2], [-0.06, 0.22], [0.1, -0.2]].map(([bx, bz], i) => (
            <mesh key={i} position={[bx, 0.24, bz]}>
              <coneGeometry args={[0.045, 0.16, 5]} />
              <meshStandardMaterial color={fuerte} flatShading roughness={1} />
            </mesh>
          ))}
        </group>
      );
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

/* ── SILUETAS instanciadas de las matas (perfil frugal, DR FIX 2): cada mata
      se reduce a tronco (cilindro unidad) + copa (cono o bola unidad), TODAS
      dibujadas en 3 InstancedMesh (3 draw calls en vez de ~28 mallas). El
      color va por instancia (material blanco multiplicado). ── */
const SILUETAS_MATA = {
  frailejon: {
    tronco: { s: [0.13, 0.9, 0.13], y: 0.45, dia: '#6e6a52', noche: '#3a4038' },
    copa: { forma: 'cono', s: [0.34, 0.25, 0.34], y: 0.98, dia: '#9fb59a', noche: '#4a5b52' },
  },
  papa: {
    copa: { forma: 'bola', s: [0.32, 0.2, 0.32], y: 0.16, dia: '#3f7d52', noche: '#2f5240' },
  },
  cafe: {
    tronco: { s: [0.055, 0.28, 0.055], y: 0.14, dia: '#6b4a2e', noche: '#6b4a2e' },
    copa: { forma: 'bola', s: [0.3, 0.3, 0.3], y: 0.4, dia: '#3f7d3a', noche: '#254a30' },
  },
  platano: {
    tronco: { s: [0.12, 1.1, 0.12], y: 0.55, dia: '#7a9a55', noche: '#3a5030' },
    copa: { forma: 'cono', s: [0.55, 0.8, 0.55], y: 1.25, dia: '#4f9a44', noche: '#2f5236' },
  },
};

function VegetacionInstanciada({ nocturno, cada }) {
  const matas = useMemo(
    () =>
      VEGETACION_PISOS.filter((_, i) => i % cada === 0).map((v) => {
        const [x, z] = v.pos;
        return { x, y: alturaTerreno(x, z), z, sil: SILUETAS_MATA[v.tipo] || SILUETAS_MATA.platano };
      }),
    [cada],
  );
  const troncos = matas.filter((m) => m.sil.tronco);
  const conos = matas.filter((m) => m.sil.copa.forma === 'cono');
  const bolas = matas.filter((m) => m.sil.copa.forma === 'bola');
  const tinte = (parte) => (nocturno ? parte.noche : parte.dia);
  return (
    <group>
      {troncos.length > 0 && (
        <Instances limit={troncos.length}>
          <cylinderGeometry args={[0.85, 1, 1, 6]} />
          <meshLambertMaterial />
          {troncos.map((m, i) => (
            <Instance
              key={i}
              position={[m.x, m.y + m.sil.tronco.y, m.z]}
              scale={m.sil.tronco.s}
              color={tinte(m.sil.tronco)}
            />
          ))}
        </Instances>
      )}
      {conos.length > 0 && (
        <Instances limit={conos.length}>
          <coneGeometry args={[1, 1, 7]} />
          <meshLambertMaterial />
          {conos.map((m, i) => (
            <Instance
              key={i}
              position={[m.x, m.y + m.sil.copa.y, m.z]}
              scale={m.sil.copa.s}
              color={tinte(m.sil.copa)}
            />
          ))}
        </Instances>
      )}
      {bolas.length > 0 && (
        <Instances limit={bolas.length}>
          <sphereGeometry args={[1, 9, 8]} />
          <meshLambertMaterial />
          {bolas.map((m, i) => (
            <Instance
              key={i}
              position={[m.x, m.y + m.sil.copa.y, m.z]}
              scale={m.sil.copa.s}
              color={tinte(m.sil.copa)}
            />
          ))}
        </Instances>
      )}
    </group>
  );
}

/* Siembra las matas de muestra de cada piso sobre el terreno (posadas en su y).
   Layout por datos: recorre VEGETACION_PISOS. En perfil frugal las matas se
   dibujan INSTANCIADAS (3 draw calls); en 'alto' conservan su detalle pleno. */
function VegetacionPisos({ nocturno, perfil }) {
  if (perfil.matasInstanciadas) {
    return <VegetacionInstanciada nocturno={nocturno} cada={perfil.matasCada} />;
  }
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

function CriaturasValle({ reducedMotion, cupo }) {
  // Cada criatura es un <Html> (nodo DOM con matriz CSS por frame): en frugal
  // se siembran menos; en 'bajo' ninguna (el valle vive igual con los mundos).
  if (!cupo) return null;
  return (
    <group>
      {CRIATURAS_VALLE.slice(0, cupo).map((c, i) => {
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

/* ── Proxy LOD de un landmark (perfil frugal): a distancia, el lugar es una
      silueta de UNA malla con su tinte — el rótulo con emoji ya lo nombra.
      Los tipos que suben (milpa, bosque, veleta) son cono; el resto, domo. ── */
const PROXY_CONO = new Set(['milpa', 'bosque', 'veleta']);

function ProxyLandmark({ tipo, tinte }) {
  const cono = PROXY_CONO.has(tipo);
  return (
    <mesh position={[0, cono ? 0.7 : 0.35, 0]} scale={cono ? 1 : [1, 0.55, 1]}>
      {cono ? <coneGeometry args={[0.5, 1.4, 6]} /> : <sphereGeometry args={[0.62, 8, 7]} />}
      <meshLambertMaterial color={tinte[0]} />
    </mesh>
  );
}

/* ── Un mundo como LUGAR navegable: SOLO su geometría. Su etiqueta táctil vive
      en <RotulosLugares/> (piso en píxeles + foco/proximidad + anti-colisión).
      En perfil frugal el detalle completo SOLO se dibuja de cerca (<Detailed>):
      la panorámica de arranque —el peor momento— queda en siluetas baratas. ── */
function MundoLugar({ mundo, reducedMotion, perfil }) {
  const y = alturaTerreno(mundo.pos[0], mundo.pos[2]);
  const detalle = mundo.tipo === 'veleta' ? (
    <Veleta color={mundo.tinte[0]} reducedMotion={reducedMotion} />
  ) : (
    <LandmarkGeom tipo={mundo.tipo} tinte={mundo.tinte} reducedMotion={reducedMotion} />
  );
  return (
    <group position={[mundo.pos[0], y, mundo.pos[2]]} scale={mundo.escala}>
      {perfil.lod ? (
        <Detailed distances={[0, perfil.lodDistancia]}>
          <group>{detalle}</group>
          <ProxyLandmark tipo={mundo.tipo} tinte={mundo.tinte} />
        </Detailed>
      ) : (
        detalle
      )}
    </group>
  );
}

/* ── Las etiquetas de los lugares, con juicio (SPEC-UX-01 + S6/B4 de los DRs):
 *   · SIN `distanceFactor` → tamaño en píxeles CONSTANTE: el piso táctil ≥44px
 *     NO depende de la distancia de la cámara (WCAG 2.5.5/2.5.8);
 *   · por FOCO/PROXIMIDAD: solo la etiqueta apuntada (la más cercana al centro
 *     del encuadre) o la del mundo activo muestra su nombre completo; las demás
 *     se calman a un punto-chip con su emoji y tinte — menos-pero-legible;
 *   · ANTI-COLISIÓN en pantalla: si dos rótulos se pisan, cede el más lejano
 *     del centro (data-modo='oculto'); la alerta del día siempre gana su lugar;
 *   · `occlude` contra el terreno y la cordillera: un rótulo detrás de la loma
 *     no la atraviesa (data-tapado='1').
 * Todo se escribe imperativo sobre `dataset` (cero re-render por frame); el CSS
 * de los modos vive en rotulosValle3D.css. Los botones siguen entrando a los
 * mundos en cualquiera de los dos modos visibles — la navegación no cambia. ── */
const _proj = new THREE.Vector3();

function RotulosLugares({ mundos, focoId, onEntrar, occluders }) {
  const botones = useRef({});
  const tapados = useRef({});
  const plena = useRef(null);
  const tick = useRef(0);

  // Anclas en el mundo: misma altura que tenía la etiqueta original (1.7 dentro
  // del group escalado del landmark → 1.7 × escala en coordenadas del valle).
  const anclas = useMemo(
    () =>
      mundos.map((m) => ({
        m,
        pos: new THREE.Vector3(
          m.pos[0],
          alturaTerreno(m.pos[0], m.pos[2]) + 1.7 * (m.escala || 1),
          m.pos[2],
        ),
      })),
    [mundos],
  );

  // La alerta del día (el faro) siempre se reserva su espacio en pantalla.
  const anclaAlerta = useMemo(() => {
    const a = MUNDO_VALLE_BY_ID[COSA_DEL_DIA.anclaMundo];
    if (!a) return null;
    return new THREE.Vector3(a.pos[0], alturaTerreno(a.pos[0], a.pos[2]) + 2.7, a.pos[2]);
  }, []);

  useFrame(({ camera, size }) => {
    // ~12 pasadas/s alcanzan para rótulos; corre en el PRIMER frame (importa
    // con frameloop='demand' de reduced-motion, que renderiza pocos frames).
    if (tick.current++ % 5 !== 0) return;

    const enPantalla = (v) => {
      _proj.copy(v).project(camera);
      return {
        x: (_proj.x * 0.5 + 0.5) * size.width,
        y: (0.5 - _proj.y * 0.5) * size.height,
        detras: _proj.z > 1,
      };
    };

    const pts = anclas.map(({ m, pos }) => {
      const p = enPantalla(pos);
      return {
        id: m.id,
        titulo: m.titulo || '',
        ...p,
        dc: Math.hypot(p.x - size.width / 2, p.y - size.height / 2),
        elegible: !p.detras && !tapados.current[m.id],
      };
    });

    // Foco/proximidad: manda el mundo activo; si no, la etiqueta más apuntada,
    // con histéresis (solo cambia si otra queda 20% más centrada) anti-parpadeo.
    let candidata = null;
    if (focoId && pts.some((p) => p.id === focoId)) {
      candidata = focoId;
    } else {
      const previa = pts.find((p) => p.id === plena.current && p.elegible);
      const cercana = pts.filter((p) => p.elegible).sort((a, b) => a.dc - b.dc)[0];
      candidata = previa && cercana && cercana.dc > previa.dc * 0.8 ? previa.id : (cercana?.id ?? null);
    }
    plena.current = candidata;

    // Anti-colisión: la alerta primero, la plena después, los puntos por
    // cercanía al centro; quien pisa un espacio ya tomado, cede.
    const MARGEN = 8;
    const tomados = [];
    const rectoDe = (x, y, w, h) => ({
      x0: x - w / 2 - MARGEN,
      x1: x + w / 2 + MARGEN,
      y0: y - h / 2 - MARGEN,
      y1: y + h / 2 + MARGEN,
    });
    const pisa = (r) => tomados.some((o) => r.x0 < o.x1 && r.x1 > o.x0 && r.y0 < o.y1 && r.y1 > o.y0);
    if (anclaAlerta) {
      const a = enPantalla(anclaAlerta);
      if (!a.detras) tomados.push(rectoDe(a.x, a.y, 64 + COSA_DEL_DIA.titulo.length * 9, 52));
    }
    const orden = [...pts].sort((a, b) =>
      a.id === candidata ? -1 : b.id === candidata ? 1 : a.dc - b.dc,
    );
    for (const p of orden) {
      let modo = 'oculto';
      if (p.elegible) {
        const esPlena = p.id === candidata;
        const r = esPlena
          ? rectoDe(p.x, p.y, 76 + p.titulo.length * 9, 48)
          : rectoDe(p.x, p.y, 44, 44);
        if (!pisa(r)) {
          tomados.push(r);
          modo = esPlena ? 'plena' : 'punto';
        }
      }
      const btn = botones.current[p.id];
      if (btn && btn.dataset.modo !== modo) btn.dataset.modo = modo;
    }
  });

  return anclas.map(({ m, pos }) => (
    <group key={m.id} position={pos.toArray()}>
      <Html
        center
        zIndexRange={[20, 0]}
        occlude={occluders}
        onOcclude={(tapado) => {
          tapados.current[m.id] = tapado;
          const btn = botones.current[m.id];
          if (btn) btn.dataset.tapado = tapado ? '1' : '0';
          return null;
        }}
      >
        <button
          ref={(el) => {
            botones.current[m.id] = el;
          }}
          type="button"
          data-modo={m.id === focoId ? 'plena' : 'punto'}
          className={`valle-poi v3d-poi${focoId === m.id ? ' valle-poi--activo' : ''}`}
          style={{ '--poi-tinte': m.tinte[0] }}
          onClick={(e) => {
            e.stopPropagation();
            onEntrar(m.id);
          }}
          aria-label={`Viajar al mundo ${m.titulo}. ${m.lema}`}
        >
          <span className="valle-poi__emoji" aria-hidden="true">{m.emoji}</span>
          <span className="valle-poi__txt">{m.titulo}</span>
        </button>
      </Html>
    </group>
  ));
}

/* ── La cosa del día: un faro pulsante anclado sobre su mundo. Un SOLO destello.
      Toca la señal → onAlerta() (el agente lo dice y ofrece LA acción). ── */
function Beacon({ onAlerta, reducedMotion, conLuz = true }) {
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
      {/* La pointLight extra solo donde sobra GPU: el pulso emissive+halo ya
          hace de faro sin sumar una luz por-fragmento a toda la escena. */}
      {conLuz && (
        <pointLight ref={luz} position={[0, 1.6, 0]} color="#ffd28a" intensity={2.2} distance={7} />
      )}
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
      {/* Sin distanceFactor: la alerta mantiene su tamaño táctil en píxeles. */}
      <Html center position={[0, 2.7, 0]} zIndexRange={[30, 0]}>
        <button
          type="button"
          className="valle-alerta v3d-alerta"
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
function CompaneroAbeja({ foco, entrando, animo, energia, reducedMotion, estadoFinca = null, hayAlerta = false }) {
  const ref = useRef(null);
  const caraRef = useRef(null);
  const prevX = useRef(foco.x);
  // Reacción al estado REAL de la finca (§5b): mismo repertorio que los mundos.
  // Con estadoFinca manda la reacción; sin él, el contrato viejo (animo/energia).
  const reaccion = useMemo(
    () => (estadoFinca ? reaccionDeFinca(estadoFinca, { hayAlerta }) : null),
    [estadoFinca, hayAlerta],
  );
  const animoReal = reaccion?.animo ?? animo;
  const energiaReal = reaccion?.energia ?? energia;
  const vuelo = reaccion?.vuelo;
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    // Modificadores de reaccionDeFinca: mojada pesa (baja/lenta), sed baja a
    // buscar agua, comiendo tiembla mordisqueando. Sin estado, todo queda en 1.
    const mAltura = vuelo?.altura ?? 1;
    const mVel = vuelo?.velocidad ?? 1;
    const mVagar = vuelo?.vagar ?? 1;
    const tiembla = reducedMotion ? 0 : (vuelo?.tiembla ?? 0);
    const brio = (0.35 + 0.65 * energiaReal) * mVel; // energía y clima animan el vuelo
    const bob = reducedMotion ? 0 : Math.sin(t * (1.6 + brio)) * (0.1 + 0.16 * brio);
    const tembleque = tiembla ? Math.sin(t * 13) * tiembla : 0;
    // Al reposo deriva en un círculo calmo; al entrar se posa junto al lugar.
    const vagarX = reducedMotion || entrando ? 0 : Math.sin(t * 0.55) * 0.9 * mVagar;
    const vagarZ = reducedMotion || entrando ? 0 : Math.cos(t * 0.55) * 0.6 * mVagar;
    const alto = (entrando ? 1.05 : 2.3) * mAltura;
    const dest = new THREE.Vector3(
      foco.x + (entrando ? 0.55 : 0.4 + vagarX) + tembleque,
      foco.y + alto + bob + tembleque * 0.5,
      foco.z + (entrando ? 0.7 : 0.6 + vagarZ),
    );
    ref.current.position.lerp(dest, (entrando ? 0.05 : 0.045) * mVel);
    if (caraRef.current) {
      const vx = ref.current.position.x - prevX.current;
      if (Math.abs(vx) > 0.0015) caraRef.current.style.transform = `scaleX(${vx < 0 ? -1 : 1})`;
      prevX.current = ref.current.position.x;
    }
  });
  const size = 44 + Math.round(energiaReal * 14);
  return (
    <group ref={ref} position={[foco.x + 0.4, foco.y + 2.3, foco.z + 0.6]}>
      <Html center distanceFactor={9} zIndexRange={[40, 10]}>
        <div className="valle-abeja" aria-hidden="true">
          <div ref={caraRef} className="valle-abeja__cara">
            <AbejaAngelita
              size={size}
              animo={animoReal}
              energia={energiaReal}
              mojada={reaccion?.mojada ?? false}
              sed={reaccion?.sed ?? false}
              comiendo={reaccion?.comiendo ?? false}
              animated={!reducedMotion}
            />
          </div>
        </div>
      </Html>
    </group>
  );
}

/* ── APLANE NEW DONK: el "caer dentro del mundo" del flujo vivo valle→mundo.
      Cuando `aplanando` se enciende (fase 'viajando' de la navegación), la
      cámara del valle 3D deja su órbita y hace DOLLY hacia el landmark del
      mundo destino mientras el lente se APLANA a ~22° (casi ortográfico) — el
      encuadre New Donk: el mundo destino queda de frente y el resto del valle
      3D asoma en los bordes, SIN velo plano. El overlay DOM (TransicionNewDonk)
      corre en paralelo: transparente durante el dolly, luego el destello cubre
      el intercambio de escena. El dolly dura APLANE_S (< ND_MITAD_MS) para
      cerrar antes de que el host haga el swap bajo el destello.

      Como CamaraDirector, vive junto a los OrbitControls y NO reasigna props:
      captura la pose de arranque en su primer frame activo y ESCRIBE la cámara
      solo por MÉTODOS three (lerpVectors/lookAt/setFocalLength — nunca `cam.fov=`
      ni `controls.enabled=`, que la regla react-hooks/immutability prohíbe).
      Se monta de ÚLTIMO en la escena → su useFrame corre después del orbit y de
      CamaraViajera (que además cede con early-return cuando `aplanando`), así
      tiene la última palabra sin pelear; los controles quedan habilitados como
      en el establishing de CamaraDirector. Reduced-motion: el hook de navegación
      salta la fase 'viajando', así que este componente ni se activa (corte
      directo valle→mundo). ── */
const APLANE_S = 0.95; // < ND_MITAD_MS (1.05 s): cierra antes del swap
const APLANE_FOV = 22; // grados: casi ortográfico (el aplane New Donk)
const _easeAplane = (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);

/* FOV → distancia focal por MÉTODO (setFocalLength), como TunelOdyssey: evita
   reasignar `camera.fov` (react-hooks/immutability) y refresca la projection. */
function fovAFocal(camPersp, fov) {
  return (0.5 * camPersp.getFilmHeight()) / Math.tan(THREE.MathUtils.degToRad(fov) / 2);
}

function AplaneNewDonk({ foco, aplanando }) {
  const { camera } = useThree();
  const camPersp = /** @type {import('three').PerspectiveCamera} */ (camera);
  const anim = useRef({
    activo: false,
    p: 0,
    desde: new THREE.Vector3(),
    hasta: new THREE.Vector3(),
    mira: new THREE.Vector3(),
    fovDesde: 40,
  });
  useFrame((_, delta) => {
    const a = anim.current;
    if (!aplanando) {
      a.activo = false;
      return;
    }
    if (!a.activo) {
      // Primer frame activo: capturar arranque y calcular la "boca" UNA vez.
      a.activo = true;
      a.p = 0;
      a.desde.copy(camPersp.position);
      a.fovDesde = camPersp.fov;
      // Mirar el corazón del landmark, un pelo arriba.
      a.mira.set(foco.x, foco.y + 0.8, foco.z);
      // Boca: dolly hacia el lugar desde el lado actual de la cámara, con el
      // ángulo BAJADO (caer sobre el lugar, no verlo de pájaro) a ~6.4 u.
      const dir = a.desde.clone().sub(a.mira);
      dir.y *= 0.5;
      dir.setLength(6.4);
      a.hasta.copy(a.mira).add(dir);
    }
    a.p = Math.min(1, a.p + Math.min(delta, 1 / 20) / APLANE_S);
    const k = _easeAplane(a.p);
    camPersp.position.lerpVectors(a.desde, a.hasta, k);
    camPersp.lookAt(a.mira);
    // Aplane del lente: fovDesde → 22° con curva k² (el telefoto acelera al
    // final, el mundo se "endereza" contra la cámara justo antes del destello).
    const fov = a.fovDesde + (APLANE_FOV - a.fovDesde) * (k * k);
    camPersp.setFocalLength(fovAFocal(camPersp, fov));
  });
  return null;
}

/* ── Cámara: viaja suavemente hacia el foco (target) cuando cambia de mundo Y
      HACE ZOOM hacia el lugar — la sensación de ENTRAR con la abeja, no un modal
      plano. El acercamiento solo se fuerza durante la transición (una vez llega,
      suelta el control para que el usuario siga haciendo zoom a mano). Durante
      el APLANE New Donk cede TODO el control a AplaneNewDonk (early-return): no
      mueve target ni zoom para no pelear con la caída. ── */
function CamaraViajera({ foco, focoKey, controls, autoOrbit, aplanando = false }) {
  const trans = useRef(0);
  const prevKey = useRef(focoKey);
  const entrando = focoKey !== 'valle';
  useFrame(() => {
    if (!controls.current || aplanando) return;
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

/* ── EL CICLO DIURNO VIVO: la atmósfera del valle GIRA con la franja del día ──
      Antes el fondo/niebla/luces se fijaban declarativos por `clima` y cambiar
      de piel era un CORTE. Este driver (mismo patrón que CielosHora.jsx) las
      escribe imperativamente en useFrame y AMORTIGUA cada valor hacia la piel
      nueva (~2.5 s): amanece, atardece y anochece como un giro del día, no un
      teletransporte. El sol además LLEVA su posición (`c.sol`): rasante al
      amanecer, cenital al mediodía (sombras cortas), luna desde el otro lado
      de noche — las sombras del tier alto giran gratis con él.
      Cero setState y cero alocación por frame (Color/Vector3 mutados in-place);
      los props declarativos usan la piel del PRIMER montaje, que no cambia.
      reducedMotion: snap directo al preset (frameloop 'demand' — la calma que
      pide la preferencia), la franja igual avanza con el reloj. ── */
const SOL_DEFECTO = [6, 9, 4];

function estadoAtmosfera(c) {
  return {
    fondo: new THREE.Color(c.cielo[1]),
    domo: new THREE.Color(c.cielo[0]),
    suelo: new THREE.Color(c.ambiente),
    luz: new THREE.Color(c.luz),
    niebla: new THREE.Color(c.niebla),
    solPos: new THREE.Vector3(...(c.sol || SOL_DEFECTO)),
    intensidad: c.intensidad,
    nieblaLejos: c.nieblaLejos + 8,
  };
}

function amortiguarAtmosfera(actual, objetivo, k) {
  actual.fondo.lerp(objetivo.fondo, k);
  actual.domo.lerp(objetivo.domo, k);
  actual.suelo.lerp(objetivo.suelo, k);
  actual.luz.lerp(objetivo.luz, k);
  actual.niebla.lerp(objetivo.niebla, k);
  actual.solPos.lerp(objetivo.solPos, k);
  actual.intensidad += (objetivo.intensidad - actual.intensidad) * k;
  actual.nieblaLejos += (objetivo.nieblaLejos - actual.nieblaLejos) * k;
}

function AtmosferaValle({ c, perfil, reducedMotion }) {
  const objetivo = useMemo(() => estadoAtmosfera(c), [c]);
  // La piel del primer montaje: alimenta los valores declarativos del JSX (que
  // nunca deben cambiar tras montar) — un re-render no pisa la animación.
  const [ini] = useState(() => c);
  const [actual] = useState(() => estadoAtmosfera(ini));

  const fondoRef = useRef(null);
  const fogRef = useRef(null);
  const hemiRef = useRef(null);
  const ambRef = useRef(null);
  const solRef = useRef(null);

  const pintar = (e) => {
    if (fondoRef.current) fondoRef.current.copy(e.fondo);
    if (fogRef.current) {
      fogRef.current.color.copy(e.niebla);
      fogRef.current.far = e.nieblaLejos;
    }
    if (hemiRef.current) {
      hemiRef.current.intensity = e.intensidad * 0.55;
      hemiRef.current.color.copy(e.domo);
      hemiRef.current.groundColor.copy(e.suelo);
    }
    if (ambRef.current) {
      ambRef.current.intensity = e.intensidad * 0.35;
      ambRef.current.color.copy(e.luz);
    }
    if (solRef.current) {
      solRef.current.intensity = e.intensidad;
      solRef.current.color.copy(e.luz);
      solRef.current.position.copy(e.solPos);
    }
  };

  // Calma pedida → snap: la piel nueva entra completa, sin animar.
  useEffect(() => {
    if (!reducedMotion) return;
    amortiguarAtmosfera(actual, objetivo, 1);
    pintar(actual);
  });

  // Transición viva: amortiguación exponencial estable en dt variable.
  useFrame((_, dt) => {
    if (reducedMotion) return;
    const k = 1 - Math.exp((-3 / TRANSICION.duracion) * Math.min(dt, 0.1));
    amortiguarAtmosfera(actual, objetivo, k);
    pintar(actual);
  });

  return (
    <>
      <color ref={fondoRef} attach="background" args={[ini.cielo[1]]} />
      {/* La niebla se paga por fragmento: en perfil 'bajo' se apaga. */}
      {perfil.fog && (
        <fog ref={fogRef} attach="fog" args={[ini.niebla, 12, ini.nieblaLejos + 8]} />
      )}
      <hemisphereLight
        ref={hemiRef}
        intensity={ini.intensidad * 0.55}
        color={ini.cielo[0]}
        groundColor={ini.ambiente}
      />
      <ambientLight ref={ambRef} intensity={ini.intensidad * 0.35} color={ini.luz} />
      {/* castShadow SOLO en 'alto': sin shadow-map la escena se dibuja UNA vez
          por frame, no dos (DR FIX 1 — el mayor ahorro de GPU de un golpe). */}
      <directionalLight
        ref={solRef}
        position={ini.sol || SOL_DEFECTO}
        intensity={ini.intensidad}
        color={ini.luz}
        castShadow={perfil.sombras}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={30}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
    </>
  );
}

/* Caja de las luciérnagas: la tierra baja del frente del valle (referencia
   ESTABLE — ParticulasAmbientales re-siembra si la caja cambia). */
const AREA_LUCIERNAGAS = [18, 2.4, 7];

/* La pose de cámara del valle: UNA fuente para el Canvas y para el establishing
   shot de la CámaraDirector (así el dolly aterriza EXACTO donde siempre). */
const CAMARA_VALLE = { position: [10.5, 9, 13.5], fov: 40 };

/* ── Contenido de la escena (dentro del Canvas). ── */
function Escena({ clima, focoId, animo, energia, onEntrar, onAlerta, reducedMotion, perfil, tier = 'alto', estadoFinca = null, hayAlerta = false, aplanando = false }) {
  const controls = useRef(null);
  // Occluders de los rótulos: solo terreno + cordillera (raycast barato y es
  // exactamente lo que las etiquetas no deben atravesar).
  const terrenoRef = useRef(null);
  const cordilleraRef = useRef(null);
  const occluders = useMemo(() => [terrenoRef, cordilleraRef], []);
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

  // El ciclo trae estrellas GRADUALES (0..1 del presupuesto del tier: unas
  // pocas se asoman al atardecer, todas de noche) y luciérnagas por densidad.
  const fracEstrellas = c.estrellas === true ? 1 : Number(c.estrellas) || 0;
  const luciernagas = Number(c.luciernagas) || 0;

  return (
    <>
      {/* Fondo + niebla + luces, amortiguadas hacia la franja del día. */}
      <AtmosferaValle c={c} perfil={perfil} reducedMotion={reducedMotion} />
      {fracEstrellas > 0 && perfil.estrellas > 0 && (
        <Stars
          radius={40}
          depth={20}
          count={Math.max(24, Math.round(perfil.estrellas * fracEstrellas))}
          factor={3}
          fade
          speed={reducedMotion ? 0 : 1}
        />
      )}
      {/* Luciérnagas: asoman al atardecer y llenan la noche. Kit instanciado
          (1 draw call), presupuesto por tier adentro; con reduced-motion
          quedan quietas a brillo medio — presencia sin parpadeo. */}
      {luciernagas > 0 && (
        <ParticulasAmbientales
          tipo="luciernagas"
          densidad={luciernagas}
          tier={tier}
          reducedMotion={reducedMotion}
          area={AREA_LUCIERNAGAS}
          position={[0, 0.35, 3.6]}
          semilla={11}
        />
      )}

      <Terreno nocturno={nocturno} innerRef={terrenoRef} perfil={perfil} />
      <Cordillera color={nocturno ? '#3a4a63' : c.niebla} innerRef={cordilleraRef} perfil={perfil} />
      <Quebrada color={nocturno ? '#2a4a6a' : '#5fb2c9'} viva={c.lluviaViva} perfil={perfil} />
      <VegetacionPisos nocturno={nocturno} perfil={perfil} />

      {MUNDOS_VALLE.map((m) => (
        <MundoLugar key={m.id} mundo={m} reducedMotion={reducedMotion} perfil={perfil} />
      ))}
      <RotulosLugares
        mundos={MUNDOS_VALLE}
        focoId={focoId}
        onEntrar={onEntrar}
        occluders={occluders}
      />

      <CriaturasValle reducedMotion={reducedMotion} cupo={perfil.criaturas} />
      <Beacon onAlerta={onAlerta} reducedMotion={reducedMotion} conLuz={perfil.luzBeacon} />
      <CompaneroAbeja
        foco={foco}
        entrando={entrando}
        animo={animo}
        energia={energia}
        estadoFinca={estadoFinca}
        hayAlerta={hayAlerta}
        reducedMotion={reducedMotion}
      />

      <CamaraViajera
        foco={foco}
        focoKey={focoId || 'valle'}
        controls={controls}
        autoOrbit={autoOrbit}
        aplanando={aplanando}
      />
      {/* La CÁMARA DE DIRECTOR (FASE 4): el establishing shot del mapa — dolly
          con arco desde más alto/lejos hasta la pose de siempre, UNA vez por
          sesión (volver de un mundo no lo repite). Sin `mirada`: el target ya
          lo lleva CamaraViajera; aquí solo posición + FOV. La respiración del
          encuadre es aditiva y convive con su lerp. Gama baja o reduced-motion:
          cámara simple (inerte). */}
      <CamaraDirector
        controls={controls}
        reposo={CAMARA_VALLE.position}
        duracion={2.4}
        amplio={1.3}
        respiro={0.05}
        activa={!reducedMotion && tier !== 'bajo'}
        unaVezClave="valle"
      />
      {/* El aplane New Donk del flujo vivo — montado de ÚLTIMO para tener la
          última palabra sobre la cámara mientras cae dentro del mundo. Solo
          hace algo cuando `aplanando` (fase 'viajando'); inerte el resto. */}
      <AplaneNewDonk foco={foco} aplanando={aplanando} />
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
  tier = 'alto',
  /* El estado REAL de la finca (auditoría §5b): Angelita SIEMPRE lo refleja,
     también en el mapa. Hoy MUESTRA; codex lo cabla con useFincaViva. */
  estadoFinca = ESTADO_FINCA_MUESTRA,
  hayAlerta = false,
  /* Flujo vivo valle→mundo (New Donk): mientras el host viaja a un mundo, la
     cámara del valle hace dolly + aplane hacia el landmark en vez de cortar con
     velo. El host lo enciende en la fase 'viajando'. */
  aplanando = false,
}) {
  const [listo, setListo] = useState(false);
  /* El PERFIL DE RENDER del tier (DR-3D-PERF-GAMABAJA): 'alto' conserva este
     look intacto; 'medio'/'bajo' degradan sombras, DPR, antialias, densidad e
     instancian lo repetido. El default 'alto' preserva a los hosts viejos. */
  const perfil = useMemo(() => perfilDeTier(tier), [tier]);
  return (
    <Canvas
      className={`valle-canvas${listo ? ' valle-canvas--listo' : ''}`}
      shadows={perfil.sombras}
      dpr={perfil.dpr}
      gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
      camera={CAMARA_VALLE}
      frameloop={reducedMotion ? 'demand' : 'always'}
      onCreated={() => setListo(true)}
    >
      <Suspense fallback={null}>
        <Escena
          clima={clima}
          focoId={focoId}
          animo={animo}
          energia={energia}
          estadoFinca={estadoFinca}
          hayAlerta={hayAlerta}
          onEntrar={onEntrar}
          onAlerta={onAlerta}
          reducedMotion={reducedMotion}
          perfil={perfil}
          tier={tier}
          aplanando={aplanando}
        />
      </Suspense>
    </Canvas>
  );
}
