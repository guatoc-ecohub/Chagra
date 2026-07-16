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
import DirectorValle from './DirectorValle.jsx';
import { AbejaAngelita } from '../../visual/creatures/AbejaAngelita.jsx';
/* La CAPA DE ESTADO de Angelita (auditoría §5b): módulo puro, sin three — el
   mismo repertorio (mojada/sed/comiendo/vuelo) que usan los mundos 3D. */
import { reaccionDeFinca, ESTADO_FINCA_MUESTRA } from '../../visual/mundo3d/escenas/reaccionFinca.js';
import { Colibri } from '../../visual/creatures/Colibri.jsx';
import { Mariposa } from '../../visual/creatures/Mariposa.jsx';
import { Escarabajo } from '../../visual/creatures/Escarabajo.jsx';
import { Lombriz } from '../../visual/creatures/Lombriz.jsx';
import AnimalesDeFinca, { MATERIAL_FINCA } from './animales.jsx';
/* Árboles POR ESPECIE (no genéricos): las mismas mallas del bosque altoandino
   (roble, aliso, gaque) que ya viven en floraParamo — cada árbol se distingue. */
import { geomRoble, geomAliso, geomGaque } from '../../visual/mundo3d/bosque/floraParamo.geom.js';
/* Luciérnagas de la noche: el kit instanciado que ya existe (1-3 draw calls),
   sembrado sobre la tierra baja del valle cuando la franja las trae. */
import { ParticulasAmbientales } from '../../visual/mundo3d/ParticulasAmbientales.jsx';
/* Duración canónica de la transición entre franjas (misma que CielosHora). */
import { TRANSICION } from '../../visual/mundo3d/cielosHoraData.js';
/* LA DIRECCIÓN del valle (capa de composición sobre valleData): la casa-ancla,
   los senderos del trajín, los patios de tierra pisada, los vecinos (los
   personajes en su casa) y la disposición COMPUESTA de los lugares. La ley
   vive como datos en visual/mundo3d/direccion; las piezas r3f, al lado. */
import {
  componerMundos,
  CASA_VALLE,
  JERARQUIA_PERSONAJES,
} from '../../visual/mundo3d/direccion/composicionValle.js';
import {
  CasaCampesina,
  PorticosPortales,
  SenderosValle,
  PatiosLugares,
  VecinosDelValle,
} from './composicionValle3D.jsx';
/* El ANCLAJE: la sombra de contacto bajo cada landmark (casa, lugares,
   árboles, matas, vecinos) — sin ella los objetos flotan sobre la loma.
   2 draw calls instanciados, textura radial pre-horneada, cero costo/frame. */
import SombrasContacto from './SombrasContacto.jsx';
import './rotulosValle3D.css';
import {
  MUNDOS_VALLE,
  COSA_DEL_DIA,
  CLIMAS,
  PISOS_TERMICOS,
  VEGETACION_PISOS,
} from './valleData';

/* ── Los mundos YA COMPUESTOS: la disposición del director encima de los
      datos crudos. valleData no se toca (otros frentes viven ahí); aquí la
      escena entera consume ESTA lista — geometría, rótulos, faro y foco. ── */
const MUNDOS_DIR = componerMundos(MUNDOS_VALLE);
const MUNDO_DIR_BY_ID = Object.fromEntries(MUNDOS_DIR.map((m) => [m.id, m]));

/* Altura del terreno por (x,z): la LADERA ANDINA. El eje z es la montaña — al
   fondo (z negativo) trepa al páramo alto, al frente (z positivo) baja a tierra
   caliente. Así el gradiente de pisos térmicos se LEE como pendiente. La subida
   usa smoothstep (curva suave, sin quiebres) + una ondulación menuda para que
   las lomas se vean redondas, no planas. Determinista → los landmarks se posan
   encima. (Rediseño 2026-07: el valle creció a 48×48 — la subida es más larga
   y un pelo más alta, la ondulación más ancha: lomas de valle grande.) */
function alturaTerreno(x, z) {
  const subida = THREE.MathUtils.smoothstep(-z, -11, 16) * 6.2;
  const ondul = Math.sin(x * 0.3) * 0.16 + Math.cos(z * 0.27 + x * 0.15) * 0.13;
  const cauce = -0.36 * Math.exp(-((x - 1.9) ** 2) / 8) * Math.exp(-((z + 1.5) ** 2) / 110);
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
/* La noche del cine es AZUL, no negra (día por noche): el suelo se enfría
   hacia un azul-luna y solo 45% — las franjas de pisos térmicos siguen
   leyéndose como bandas de altitud, apagadas pero presentes. */
const _colNoche = new THREE.Color('#2c4560');

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
  if (nocturno) out.lerp(_colNoche, 0.56);
  return out;
}

/* ── El suelo del valle: malla ondulada de bajo poligonaje, PINTADA por vértice
      según el piso térmico de cada franja (páramo frío arriba → tierra caliente
      abajo). El color sale de PISOS_TERMICOS: franjas de altitud legibles, con
      la cresta apenas más clara para dar relieve. ── */
function Terreno({ nocturno, innerRef, perfil }) {
  const seg = perfil.segmentosTerreno;
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(48, 48, seg, seg);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const colores = new Float32Array(pos.count * 3);
    const col = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = alturaTerreno(x, z);
      pos.setY(i, y);
      const subida = THREE.MathUtils.smoothstep(-z, -11, 16) * 6.2;
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
  // (Empujados al fondo del valle grande: z ≤ -21, sobre el páramo que ya
  //  subió a ~6. Más anchos y altos para coronar el cuadro nuevo.)
  { x: -13, z: -22, h: 8.5, r: 6.5, base: 5.0 },
  { x: -3, z: -24, h: 11.5, r: 7.5, base: 5.4 },
  { x: 8, z: -23, h: 9.5, r: 6.5, base: 5.0 },
  { x: 17, z: -21, h: 7, r: 5.5, base: 4.8 },
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

/* ── La quebrada: una cinta de agua que serpentea por el cauce. De noche es
      LO QUE MÁS BRILLA del suelo (el reflejo de la luna sobre el agua, la
      firma del día-por-noche): emissive tenue que además guía el ojo ladera
      abajo — el agua se vuelve el sendero luminoso del valle dormido. ── */
function Quebrada({ color, viva, perfil, nocturno = false }) {
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
      [-4.6, -11],
      [-2.2, -6.4],
      [0.6, -2.4],
      [2.2, 1.6],
      [3.4, 6.4],
      [4.6, 11.5],
    ].map(([x, z]) => new THREE.Vector3(x, alturaTerreno(x, z) + 0.06, z));
    const curve = new THREE.CatmullRomCurve3(pts);
    // Frugal: menos anillos/segmentos — la cinta se lee igual desde lejos.
    const g = new THREE.TubeGeometry(curve, rico ? 88 : 52, 0.4, rico ? 7 : 5, false);
    return g;
  }, [rico]);
  return (
    <mesh geometry={geo}>
      {rico ? (
        <meshStandardMaterial
          ref={ref}
          color={color}
          emissive={nocturno ? '#3f6f9e' : '#000000'}
          emissiveIntensity={nocturno ? 0.42 : 0}
          transparent
          opacity={0.78}
          roughness={0.25}
          metalness={0.35}
        />
      ) : (
        <meshLambertMaterial
          ref={ref}
          color={color}
          emissive={nocturno ? '#3f6f9e' : '#000000'}
          emissiveIntensity={nocturno ? 0.42 : 0}
          transparent
          opacity={0.78}
        />
      )}
    </mesh>
  );
}

/* ── La arboleda POR ESPECIE del landmark 'bosque': roble andino (copa ancha
      oscura), aliso (cónico de tronco claro) y gaque (domo bajo lustroso) —
      cada árbol se distingue, nada de conos genéricos. Las mallas son las de
      floraParamo (color horneado por vértice, 1 draw call por árbol); escala
      ~0.5 para el diorama. `q` baja el detalle en perfil frugal. ── */
const SITIOS_ARBOLEDA = [
  // (El monte del portal "toda mi finca" se espesó: 5 árboles, 3 especies —
  //  dosel multiespecie, no un parche de conos.)
  { geom: geomRoble, args: [-0.6, 0, 0.15], esc: 0.55, rot: 0.8, seed: 91 },
  { geom: geomAliso, args: [0.5, 0, -0.4], esc: 0.5, rot: 2.1, seed: 92 },
  { geom: geomGaque, args: [0.2, 0, 0.6], esc: 0.55, rot: 4.4, seed: 93 },
  { geom: geomRoble, args: [0.85, 0, 0.45], esc: 0.42, rot: 3.3, seed: 94 },
  { geom: geomAliso, args: [-0.35, 0, -0.7], esc: 0.44, rot: 5.2, seed: 95 },
];

function ArboledaEspecies({ q }) {
  const arboles = useMemo(
    () => SITIOS_ARBOLEDA.map((s) => ({ ...s, geo: s.geom({ q }, s.seed) })),
    [q],
  );
  return (
    <group>
      {arboles.map((a, i) => (
        <mesh
          key={i}
          geometry={a.geo}
          material={MATERIAL_FINCA}
          position={/** @type {[number, number, number]} */ (a.args)}
          rotation={[0, a.rot, 0]}
          scale={a.esc}
          castShadow
        />
      ))}
    </group>
  );
}

/* ── Materiales/paletas de cada landmark de mundo, por `tipo`. Formas
      redondeadas (cilindros, conos, esferas) — pocas piezas por lugar para
      dejar aire. La arboleda va por especie (mallas de floraParamo); `q` baja
      el detalle geométrico en perfil frugal. ── */
function LandmarkGeom({ tipo, tinte, reducedMotion, q = 1 }) {
  const [fuerte, suave] = tinte;
  switch (tipo) {
    case 'milpa': // LA PARCELA VIVA (estilo granja de Age of Empires, en modo
      // milpa): la tierra labrada como base, y encima las TRES HERMANAS
      // juntas — maíz (caña con penacho), fríjol (bejuco enroscado a la
      // caña) y calabaza (frutos naranjas con su hoja ancha tapando el
      // suelo). Se lee POLICULTIVO de un vistazo: nada de hileras clonadas.
      return (
        <group>
          {/* la tierra labrada de la parcela (la "granja" que se lee de lejos) */}
          <mesh position={[0, 0.045, 0]} receiveShadow>
            <boxGeometry args={[2.1, 0.09, 1.7]} />
            <meshStandardMaterial color="#5f4429" flatShading roughness={1} />
          </mesh>
          {/* surcos suaves (dos lomos que cruzan la parcela) */}
          {[-0.45, 0.35].map((dz, i) => (
            <mesh key={i} position={[0, 0.09, dz]} rotation={[0, 0, Math.PI / 2]}>
              <capsuleGeometry args={[0.06, 1.85, 3, 6]} />
              <meshStandardMaterial color="#6b4e30" flatShading roughness={1} />
            </mesh>
          ))}
          {/* el maíz con su fríjol trepado (quincunce, alturas variadas) */}
          {[
            [-0.75, -0.5, 1.35], [-0.1, -0.25, 1.5], [0.6, -0.55, 1.25],
            [-0.45, 0.25, 1.45], [0.3, 0.4, 1.3],
          ].map(([dx, dz, h], i) => (
            <group key={i} position={[dx, 0.08, dz]}>
              <mesh position={[0, h / 2, 0]} castShadow>
                <cylinderGeometry args={[0.045, 0.075, h, 6]} />
                <meshStandardMaterial color={fuerte} flatShading roughness={1} />
              </mesh>
              {/* hojas de la caña */}
              <mesh position={[0.15, h * 0.62, 0]} rotation={[0, 0, -0.7]} scale={[1, 1, 0.3]}>
                <coneGeometry args={[0.11, 0.46, 4]} />
                <meshStandardMaterial color={suave} flatShading roughness={1} />
              </mesh>
              <mesh position={[-0.15, h * 0.44, 0]} rotation={[0, Math.PI, -0.7]} scale={[1, 1, 0.3]}>
                <coneGeometry args={[0.11, 0.46, 4]} />
                <meshStandardMaterial color={suave} flatShading roughness={1} />
              </mesh>
              {/* el penacho */}
              <mesh position={[0, h + 0.16, 0]}>
                <coneGeometry args={[0.07, 0.36, 6]} />
                <meshStandardMaterial color="#e7c96b" flatShading />
              </mesh>
              {/* el FRÍJOL enroscado a la caña (dos vueltas del bejuco) */}
              <mesh position={[0, h * 0.3, 0]} rotation={[Math.PI / 2.3, 0, 0.2]}>
                <torusGeometry args={[0.1, 0.028, 5, 10]} />
                <meshStandardMaterial color="#2f6b34" flatShading roughness={1} />
              </mesh>
              <mesh position={[0.02, h * 0.55, 0]} rotation={[Math.PI / 1.9, 0, -0.3]}>
                <torusGeometry args={[0.09, 0.026, 5, 10]} />
                <meshStandardMaterial color="#2f6b34" flatShading roughness={1} />
              </mesh>
            </group>
          ))}
          {/* las CALABAZAS tapando el suelo entre matas (fruto + hoja ancha) */}
          {[[-0.55, 0.75], [0.15, 0.85], [0.75, 0.1], [-0.85, 0.05]].map(([dx, dz], i) => (
            <group key={i} position={[dx, 0.09, dz]}>
              <mesh position={[0, 0.09, 0]} scale={[1, 0.72, 1]} castShadow>
                <sphereGeometry args={[0.14, 9, 7]} />
                <meshStandardMaterial color="#d98e2b" flatShading roughness={1} />
              </mesh>
              <mesh position={[0, 0.16, 0]}>
                <cylinderGeometry args={[0.018, 0.025, 0.07, 5]} />
                <meshStandardMaterial color="#4f7a3a" flatShading />
              </mesh>
              {/* la hoja ancha que cubre el suelo */}
              <mesh position={[0.18, 0.06, 0.1]} rotation={[-Math.PI / 2.2, 0, 0.6]} scale={[1, 1, 0.5]}>
                <circleGeometry args={[0.16, 7]} />
                <meshStandardMaterial color={suave} flatShading roughness={1} side={2} />
              </mesh>
            </group>
          ))}
        </group>
      );
    case 'cafetal': // café CON SOMBRÍO (policultivo, no hilera): los arbustos
      // cargados de cereza roja DEBAJO de su guamo de sombra y con una mata
      // de plátano al lado — el trío clásico del cafetal campesino.
      return (
        <group>
          {/* el GUAMO de sombrío: tronco alto + copa ancha y plana encima */}
          <group position={[-0.15, 0, -0.1]}>
            <mesh position={[0, 0.8, 0]} castShadow>
              <cylinderGeometry args={[0.07, 0.1, 1.6, 6]} />
              <meshStandardMaterial color="#6b4a2e" flatShading roughness={1} />
            </mesh>
            <mesh position={[0, 1.7, 0]} scale={[1, 0.34, 1]} castShadow>
              <sphereGeometry args={[1.05, 10, 8]} />
              <meshStandardMaterial color="#3f7a38" flatShading roughness={1} />
            </mesh>
          </group>
          {/* la mata de plátano acompañante (pseudotallo + hojas colgantes) */}
          <group position={[0.85, 0, -0.45]}>
            <mesh position={[0, 0.5, 0]} castShadow>
              <cylinderGeometry args={[0.08, 0.12, 1.0, 7]} />
              <meshStandardMaterial color="#7a9a55" flatShading roughness={1} />
            </mesh>
            {[0, 1, 2, 3].map((k) => (
              <mesh
                key={k}
                position={[0, 0.95, 0]}
                rotation={[0, (k / 4) * Math.PI * 2 + 0.4, -0.9]}
                scale={[1, 1, 0.28]}
                castShadow
              >
                <coneGeometry args={[0.2, 0.85, 4]} />
                <meshStandardMaterial color="#4f9a44" flatShading roughness={1} />
              </mesh>
            ))}
          </group>
          {/* los arbustos de café bajo la sombra, con su cereza roja */}
          {[[-0.6, 0.35], [0.05, 0.15], [0.5, 0.55], [-0.2, 0.7]].map(([dx, dz], i) => (
            <group key={i} position={[dx, 0, dz]}>
              <mesh position={[0, 0.16, 0]}>
                <cylinderGeometry args={[0.05, 0.07, 0.32, 6]} />
                <meshStandardMaterial color="#6b4a2e" flatShading />
              </mesh>
              <mesh position={[0, 0.44, 0]} castShadow>
                <sphereGeometry args={[0.3, 10, 9]} />
                <meshStandardMaterial color={fuerte} flatShading roughness={1} />
              </mesh>
              {/* la cereza madura que pinta el arbusto */}
              {[[0.16, 0.5, 0.16], [-0.14, 0.42, 0.18], [0.05, 0.6, -0.2]].map(([bx, by, bz], j) => (
                <mesh key={j} position={[bx, by, bz]}>
                  <sphereGeometry args={[0.035, 6, 5]} />
                  <meshBasicMaterial color="#c9392e" />
                </mesh>
              ))}
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
      return <AnimalesDeFinca reducedMotion={reducedMotion} q={q} />;
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
    case 'bosque': // arboleda POR ESPECIE: roble andino + aliso + gaque
      return <ArboledaEspecies q={q} />;
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
    case 'invernadero': // el MICRO-MUNDO del semillero: un invernadero de
      // verdad — arcos de madera, el plástico traslúcido que brilla al sol,
      // la puerta abierta y las mesas de germinación adentro. Se destaca
      // como pieza propia del valle: la fábrica de la matica.
      return (
        <group>
          {/* los arcos del túnel (medio-toroide de pie), en tono madera */}
          {[-0.65, -0.22, 0.22, 0.65].map((dz, i) => (
            <mesh key={i} position={[0, 0, dz]}>
              <torusGeometry args={[0.62, 0.03, 6, 18, Math.PI]} />
              <meshStandardMaterial color="#8a6a44" flatShading roughness={1} />
            </mesh>
          ))}
          {/* la cumbrera que amarra los arcos */}
          <mesh position={[0, 0.62, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 1.5, 5]} />
            <meshStandardMaterial color="#8a6a44" flatShading roughness={1} />
          </mesh>
          {/* EL PLÁSTICO: la piel traslúcida que hace invernadero (brilla
              apenas — de lejos se lee el blanco lechoso característico) */}
          <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.63, 0.63, 1.44, 16, 1, true, Math.PI, Math.PI]} />
            <meshStandardMaterial
              color="#eef7f2"
              emissive="#dff0e8"
              emissiveIntensity={0.12}
              transparent
              opacity={0.34}
              side={2}
              roughness={0.6}
            />
          </mesh>
          {/* el testero trasero cerrado y el delantero con PUERTA abierta */}
          <mesh position={[0, 0, -0.72]}>
            <circleGeometry args={[0.62, 16, 0, Math.PI]} />
            <meshStandardMaterial color="#eef7f2" transparent opacity={0.3} side={2} roughness={0.6} />
          </mesh>
          <mesh position={[-0.3, 0, 0.72]}>
            <circleGeometry args={[0.62, 16, Math.PI / 2, Math.PI / 2]} />
            <meshStandardMaterial color="#eef7f2" transparent opacity={0.3} side={2} roughness={0.6} />
          </mesh>
          {/* las DOS mesas de germinación con sus brotecitos en fila viva */}
          {[-0.26, 0.26].map((dx, i) => (
            <group key={i} position={[dx, 0, 0]}>
              <mesh position={[0, 0.18, 0]}>
                <boxGeometry args={[0.34, 0.05, 1.2]} />
                <meshStandardMaterial color="#5a4326" flatShading roughness={1} />
              </mesh>
              {[-0.42, -0.14, 0.14, 0.42].map((bz, j) => (
                <mesh key={j} position={[(j % 2) * 0.1 - 0.05, 0.27, bz]}>
                  <coneGeometry args={[0.05, 0.15, 5]} />
                  <meshStandardMaterial color={fuerte} flatShading roughness={1} />
                </mesh>
              ))}
            </group>
          ))}
          {/* el barril de agua junto a la puerta (el riego del vivero) */}
          <mesh position={[0.62, 0.14, 0.78]} castShadow>
            <cylinderGeometry args={[0.11, 0.12, 0.28, 9]} />
            <meshStandardMaterial color={suave} flatShading roughness={1} />
          </mesh>
        </group>
      );
    case 'compost': // LA BIOFÁBRICA: la pila de compost con apariencia de tal
      // — el cajón de madera en U, la pila humeante por capas (estiércol
      // abajo, material fresco, la capa de paja encima) y la horqueta
      // clavada. El ciclo estiércol→abono, legible.
      return (
        <group>
          {/* el cajón de madera en U que contiene la pila */}
          {[
            { p: [0, 0.16, -0.5], s: [1.15, 0.32, 0.08] },
            { p: [-0.56, 0.16, -0.05], s: [0.08, 0.32, 0.95], r: 0 },
            { p: [0.56, 0.16, -0.05], s: [0.08, 0.32, 0.95], r: 0 },
          ].map((w, i) => (
            <mesh key={i} position={/** @type {any} */ (w.p)} castShadow>
              <boxGeometry args={/** @type {any} */ (w.s)} />
              <meshStandardMaterial color="#7a5a38" flatShading roughness={1} />
            </mesh>
          ))}
          {/* la PILA por capas: estiércol oscuro, compost pardo, paja clara */}
          <mesh position={[0, 0.14, -0.05]} scale={[1, 0.5, 0.9]} castShadow>
            <sphereGeometry args={[0.48, 10, 8]} />
            <meshStandardMaterial color="#3d2b1a" flatShading roughness={1} />
          </mesh>
          <mesh position={[0, 0.28, -0.05]} scale={[0.82, 0.45, 0.72]}>
            <sphereGeometry args={[0.48, 10, 8]} />
            <meshStandardMaterial color="#5f4429" flatShading roughness={1} />
          </mesh>
          <mesh position={[0, 0.4, -0.05]} scale={[0.6, 0.35, 0.52]}>
            <sphereGeometry args={[0.48, 9, 7]} />
            <meshStandardMaterial color="#c9a55a" flatShading roughness={1} />
          </mesh>
          {/* el vaho tibio de la pila trabajando (dos motas traslúcidas) */}
          <mesh position={[0.08, 0.68, -0.05]}>
            <sphereGeometry args={[0.09, 7, 6]} />
            <meshBasicMaterial color="#f2efe4" transparent opacity={0.32} depthWrite={false} />
          </mesh>
          <mesh position={[-0.06, 0.84, 0.02]}>
            <sphereGeometry args={[0.06, 7, 6]} />
            <meshBasicMaterial color="#f2efe4" transparent opacity={0.22} depthWrite={false} />
          </mesh>
          {/* la horqueta clavada en la pila (aquí se trabaja) */}
          <mesh position={[0.42, 0.42, 0.32]} rotation={[0.5, 0, -0.35]}>
            <cylinderGeometry args={[0.022, 0.026, 0.8, 5]} />
            <meshStandardMaterial color="#8a6a44" flatShading roughness={1} />
          </mesh>
          {/* la carretilla del viaje potrero→pila (cajón + rueda) */}
          <group position={[-0.55, 0, 0.55]} rotation={[0, 0.8, 0]}>
            <mesh position={[0, 0.18, 0]} castShadow>
              <boxGeometry args={[0.34, 0.14, 0.22]} />
              <meshStandardMaterial color={fuerte} flatShading roughness={1} />
            </mesh>
            <mesh position={[0.16, 0.09, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.08, 0.08, 0.04, 10]} />
              <meshStandardMaterial color="#4a3a2a" flatShading roughness={1} />
            </mesh>
          </group>
        </group>
      );
    case 'saber': // el KIOSCO DEL SABER (portal Aprender): el tablero bajo su
      // techito de paja, la banca de tronco y el libro abierto — la escuelita
      // de vereda donde la finca enseña y se juega.
      return (
        <group>
          {/* los dos parales y el techito de paja a un agua */}
          {[-0.5, 0.5].map((dx, i) => (
            <mesh key={i} position={[dx, 0.55, -0.15]} castShadow>
              <cylinderGeometry args={[0.04, 0.05, 1.1, 6]} />
              <meshStandardMaterial color="#8a6a44" flatShading roughness={1} />
            </mesh>
          ))}
          <mesh position={[0, 1.14, -0.05]} rotation={[0.28, 0, 0]} castShadow>
            <boxGeometry args={[1.3, 0.07, 0.75]} />
            <meshStandardMaterial color="#c9a55a" flatShading roughness={1} />
          </mesh>
          {/* EL TABLERO verde de escuela, colgado entre los parales */}
          <mesh position={[0, 0.62, -0.14]}>
            <boxGeometry args={[0.86, 0.5, 0.05]} />
            <meshStandardMaterial color="#2e5941" flatShading roughness={1} />
          </mesh>
          {/* las tres rayitas de tiza del tablero (la lección de hoy) */}
          {[0.74, 0.62, 0.5].map((y, i) => (
            <mesh key={i} position={[i * 0.06 - 0.1, y, -0.11]}>
              <boxGeometry args={[0.42 - i * 0.1, 0.022, 0.01]} />
              <meshBasicMaterial color="#f2efe4" />
            </mesh>
          ))}
          {/* la banca de tronco donde se sienta el que aprende */}
          <mesh position={[0.05, 0.12, 0.55]} rotation={[0, 0.2, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.09, 0.09, 0.9, 8]} />
            <meshStandardMaterial color="#7a5a38" flatShading roughness={1} />
          </mesh>
          {/* el libro abierto sobre la banca (dos tapitas en V) */}
          <group position={[0.15, 0.24, 0.55]} rotation={[0, -0.4, 0]}>
            <mesh position={[-0.06, 0, 0]} rotation={[0, 0, 0.5]}>
              <boxGeometry args={[0.14, 0.015, 0.18]} />
              <meshStandardMaterial color="#f2efe4" flatShading />
            </mesh>
            <mesh position={[0.06, 0, 0]} rotation={[0, 0, -0.5]}>
              <boxGeometry args={[0.14, 0.015, 0.18]} />
              <meshStandardMaterial color="#f2efe4" flatShading />
            </mesh>
          </group>
        </group>
      );
    case 'hongos': // el suelo vivo: hongos que asoman (el fruto del micelio), con
      // un halo de red bajo la tierra. Toque para BAJAR al mundo subterráneo.
      return (
        <group>
          {[[-0.3, 0.1, 0.44], [0.16, -0.22, 0.54], [0.42, 0.26, 0.36], [-0.04, 0.42, 0.3]].map(([x, z, h], i) => (
            <group key={i} position={[x, 0, z]}>
              {/* pie del hongo, pálido */}
              <mesh position={[0, h * 0.5, 0]} castShadow>
                <cylinderGeometry args={[0.05, 0.075, h, 7]} />
                <meshStandardMaterial color="#e8e0cf" flatShading roughness={1} />
              </mesh>
              {/* sombrero que brilla apenas (bioluminiscencia del suelo) */}
              <mesh position={[0, h + 0.02, 0]} castShadow>
                <sphereGeometry args={[0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color={fuerte} emissive={fuerte} emissiveIntensity={0.35} flatShading roughness={0.8} />
              </mesh>
              {/* laminillas claras bajo el sombrero */}
              <mesh position={[0, h - 0.015, 0]}>
                <cylinderGeometry args={[0.16, 0.06, 0.03, 10]} />
                <meshStandardMaterial color={suave} emissive={suave} emissiveIntensity={0.4} />
              </mesh>
            </group>
          ))}
          {/* el anillo de micelio asomando en la tierra (la red que baja) */}
          <mesh position={[0, 0.02, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.5, 0.64, 22]} />
            <meshStandardMaterial color={fuerte} emissive={fuerte} emissiveIntensity={0.3} transparent opacity={0.45} side={2} roughness={1} />
          </mesh>
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
  // (posiciones al día con el VALLE GRANDE: las mariposas sobre la milpa,
  //  el colibrí en la huerta de la casa, el escarabajo en la hojarasca del
  //  monte, la lombriz asomada en las eras — cada bicho en su nicho.)
  { crt: 'mariposa', x: -7.6, z: -0.4, dy: 2.2, size: 30, factor: 8 },
  { crt: 'mariposa', x: -9.2, z: 1.8, dy: 1.7, size: 24, factor: 8 },
  { crt: 'colibri', x: 2.3, z: 4.6, dy: 1.9, size: 34, factor: 8 },
  { crt: 'escarabajo', x: 6.4, z: -3.6, dy: 0.5, size: 28, factor: 7 },
  { crt: 'lombriz', x: -3.0, z: 6.2, dy: 0.28, size: 26, factor: 6.5 },
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

/* ── Un mundo como LUGAR navegable: su geometría — y TOCABLE (dirección del
      valle): tocar la milpa, el corral o la charca entra al mundo igual que su
      rótulo. El lugar ES el botón; el rótulo lo nombra. El cursor lo dice en
      desktop; en el teléfono lo dicen el patio de tierra y el sendero que
      llegan hasta él. Su etiqueta táctil sigue en <RotulosLugares/> (piso en
      píxeles + foco/proximidad + anti-colisión). En perfil frugal el detalle
      completo SOLO se dibuja de cerca (<Detailed>): la panorámica de arranque
      —el peor momento— queda en siluetas baratas. ── */
function MundoLugar({ mundo, reducedMotion, perfil, onEntrar = null }) {
  const y = alturaTerreno(mundo.pos[0], mundo.pos[2]);
  const detalle = mundo.tipo === 'veleta' ? (
    <Veleta color={mundo.tinte[0]} reducedMotion={reducedMotion} />
  ) : (
    <LandmarkGeom
      tipo={mundo.tipo}
      tinte={mundo.tinte}
      reducedMotion={reducedMotion}
      q={perfil.materialRico ? 1 : 0.55}
    />
  );
  return (
    <group
      position={[mundo.pos[0], y, mundo.pos[2]]}
      scale={mundo.escala}
      onClick={
        onEntrar
          ? (e) => {
              e.stopPropagation();
              onEntrar(mundo.id);
            }
          : undefined
      }
      onPointerOver={
        onEntrar
          ? (e) => {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
            }
          : undefined
      }
      onPointerOut={
        onEntrar
          ? () => {
              document.body.style.cursor = '';
            }
          : undefined
      }
    >
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
    const a = MUNDO_DIR_BY_ID[COSA_DEL_DIA.anclaMundo];
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
  const ancla = MUNDO_DIR_BY_ID[COSA_DEL_DIA.anclaMundo];
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

/* ── El COMPAÑERO-JUGADOR: Angelita, la abeja — UNA SOLA, la del valle.
      Rediseño 2026-07 (§6): POSICIÓN DE CALMA — al reposo ya no husmea
      errática por el valle: flota serena sobre el corredor de la casa (el
      corazón del cuadro), con un vaivén mínimo de respiración. Es MÁS
      GRANDE (se veía diminuta) y BRILLA con su luz propia: invita a tocarla
      — tocarla es hablarle a la finca (`onTocar`). Cuando se toca un mundo
      (`entrando`), vuela y se acerca al lugar, y la cámara la acompaña. Su
      ánimo/energía (salud real de la finca) tiñen su color y su vuelo. ── */
const CALMA_ABEJA = {
  // Al frente-derecha del corredor, sobre el patio de la casa (no encima del
  // techo): Angelita ES la anfitriona de la casa-puerta.
  x: CASA_VALLE.pos[0] + 1.9,
  z: CASA_VALLE.pos[1] + 2.1,
};

function CompaneroAbeja({ foco, entrando, animo, energia, reducedMotion, estadoFinca = null, hayAlerta = false, posRef = null, conLuz = false, onTocar = null }) {
  const ref = useRef(null);
  const caraRef = useRef(null);
  const prevX = useRef(foco.x);
  const yCalma = useMemo(() => alturaTerreno(CALMA_ABEJA.x, CALMA_ABEJA.z), []);
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
    // POSICIÓN DE CALMA (§6): al reposo Angelita ya no ronda el valle en un
    // círculo errático — flota SERENA sobre el corredor de la casa con una
    // deriva mínima y lenta (respiración, no husmeo). Al entrar a un mundo
    // sí vuela y se posa junto al lugar.
    const vagarX = reducedMotion || entrando ? 0 : Math.sin(t * 0.28) * 0.28 * mVagar;
    const vagarZ = reducedMotion || entrando ? 0 : Math.cos(t * 0.22) * 0.2 * mVagar;
    const alto = (entrando ? 1.05 : 2.5) * mAltura;
    const dest = entrando
      ? new THREE.Vector3(
          foco.x + 0.55 + tembleque,
          foco.y + alto + bob + tembleque * 0.5,
          foco.z + 0.7,
        )
      : new THREE.Vector3(
          CALMA_ABEJA.x + vagarX + tembleque,
          yCalma + alto + bob + tembleque * 0.5,
          CALMA_ABEJA.z + vagarZ,
        );
    ref.current.position.lerp(dest, (entrando ? 0.05 : 0.035) * mVel);
    // Comparte su posición viva para que la cámara de director la SIGA (follow
    // con lead): copia dentro del Vector3 compartido (mutación por método sobre
    // un local — no reasigna el prop, como CamaraViajera con controls.current).
    const destinoPos = posRef ? posRef.current : null;
    if (destinoPos) destinoPos.copy(ref.current.position);
    if (caraRef.current) {
      const vx = ref.current.position.x - prevX.current;
      if (Math.abs(vx) > 0.0015) caraRef.current.style.transform = `scaleX(${vx < 0 ? -1 : 1})`;
      prevX.current = ref.current.position.x;
    }
  });
  // MÁS GRANDE (§6): el px base sube de 44 a la banda de JERARQUIA (58-76) —
  // en el valle grande la guía se veía diminuta.
  const [pxMin, pxMax] = JERARQUIA_PERSONAJES.protagonistaPx;
  const size = pxMin + Math.round(energiaReal * (pxMax - pxMin));
  const luz = JERARQUIA_PERSONAJES.luzProtagonista;
  return (
    <group ref={ref} position={[CALMA_ABEJA.x, yCalma + 2.5, CALMA_ABEJA.z]}>
      {/* JERARQUÍA: Angelita es la ÚNICA con luz propia — su calidez baña el
          terreno bajo su vuelo y el ojo la encuentra primero, sobre todo al
          atardecer y de noche. Solo donde el perfil ya paga luces extra. */}
      {conLuz && (
        <pointLight
          color={luz.color}
          intensity={luz.intensidad}
          distance={luz.alcance}
          position={[0, -0.2, 0]}
        />
      )}
      <Html center distanceFactor={15} zIndexRange={[40, 10]}>
        {/* TOCABLE (§6): Angelita brilla e invita — tocarla es hablarle a la
            finca (el host abre el agente). Botón real por accesibilidad. */}
        <button
          type="button"
          className="valle-abeja valle-abeja--toque"
          aria-label="Hable con Angelita, la guía de su finca"
          onClick={
            onTocar
              ? (e) => {
                  e.stopPropagation();
                  onTocar();
                }
              : undefined
          }
        >
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
        </button>
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
function CamaraViajera({ foco, focoKey, controls, autoOrbit, aplanando = false, kReposo = 1, miraInicial = null }) {
  const trans = useRef(0);
  const prevKey = useRef(focoKey);
  const entrando = focoKey !== 'valle';
  /* LA CÁMARA ES DEL USUARIO DESDE QUE LA TOCA: la deriva de reposo
     (autoRotate) es bienvenida mientras nadie maneja, pero girar el valle
     BAJO el dedo que está apuntando a un lugar era el "difícil de manejar a
     ratos" — el chip se corría del toque. El primer gesto de órbita apaga la
     deriva por el resto de la sesión del valle. */
  const [tomada, setTomada] = useState(false);
  useFrame(() => {
    if (!controls.current || aplanando) return;
    const c = controls.current;
    if (focoKey !== prevKey.current) {
      trans.current = 1; // arrancó una nueva "entrada": acompañar el zoom
      prevKey.current = focoKey;
    }
    /* ASIMETRÍA DEL VIAJE (dirección): ENTRAR es decidido (el toque pide ir
       ya); VOLVER es una exhalación — más lento, el valle se abre con calma y
       llegar a casa se siente distinto a salir de ella. */
    const k = entrando ? 0.07 : 0.042;
    c.target.lerp(new THREE.Vector3(foco.x, foco.y + 0.6, foco.z), k);
    if (trans.current > 0) {
      const cam = c.object;
      const dir = cam.position.clone().sub(c.target);
      // Acercarse al entrar; al volver, abrir hasta el reposo del ASPECTO
      // real (kReposo): en un teléfono parado el valle respira más lejos.
      // (Distancias del valle GRANDE: entrar a 10.5, reposo a ~25.)
      const deseada = entrando ? 10.5 : 25 * kReposo;
      dir.setLength(THREE.MathUtils.lerp(dir.length(), deseada, k));
      cam.position.copy(c.target.clone().add(dir));
      trans.current = Math.max(0, trans.current - (entrando ? 0.012 : 0.009));
    }
    c.update();
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableZoom
      /* El target ARRANCA en la mira de reposo (no en el origen): el primer
         fotograma ya es el encuadre de autor — clave en reduced-motion
         (frameloop demand), donde el lerp por frame gatea. */
      target={miraInicial || undefined}
      minDistance={8}
      /* El techo de zoom respeta el reposo del aspecto: si la pose vertical
         vive más lejos, el clamp no pelea contra ella (antes, en teléfono,
         el reposo caía FUERA del techo y los controles daban tirones). */
      maxDistance={Math.max(38, Math.ceil(27 * kReposo) + 5)}
      minPolarAngle={0.45}
      maxPolarAngle={1.18}
      autoRotate={autoOrbit && !entrando && !tomada}
      /* Deriva de reposo APENAS perceptible (~0.7°/s): a 0.35 el valle giraba
         ~2°/s y en un minuto la composición de autor ya no estaba en pantalla
         — y el chip apuntado se corría del dedo. La vida la ponen los bichos
         y la atmósfera, no el tiovivo. */
      autoRotateSpeed={0.12}
      enableDamping
      dampingFactor={0.08}
      onStart={tomada ? undefined : () => setTomada(true)}
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
    // El valle grande pide más aire antes de la niebla (antes +8): que la
    // cordillera nueva (z≤-21) se lea, no se coma.
    nieblaLejos: c.nieblaLejos + 18,
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
        <fog ref={fogRef} attach="fog" args={[ini.niebla, 16, ini.nieblaLejos + 18]} />
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

/* ── LA LUNA DEL VALLE: el disco de plata que AUTORIZA la luz nocturna ──────
      La noche del cine tiene autora: la direccional fría sale de aquí
      (CLIMAS.noche.sol apunta desde -x,-z) y verla en el cielo hace legible
      el contraluz. Discos meshBasic (5 planos transparentes, cero luces
      extra): corre en TODOS los tiers. Se orienta a la cámara con lookAt
      (~2 veces/s alcanza — la luna está lejos y el orbit es lento). ── */
/* La LUNA SALIENDO tras el filo del páramo (izquierda-fondo, baja sobre el
   horizonte): la pose de reposo pica 23° hacia abajo, así que el único cielo
   del cuadro es la franja rasante sobre la silueta de la ladera — ahí vive
   la luna, como se ve una luna que apenas sale. Verificado contra el terreno:
   el rayo cámara→luna libra la loma (y=6.9 sobre 1.5 en x=-10; 6.2 sobre 3.1
   en el borde x=-17) y la cordillera queda lejos (z≤-15). */
const POS_LUNA = /** @type {[number, number, number]} */ ([-28, 4.6, -11]);

function LunaValle({ reducedMotion }) {
  const ref = useRef(null);
  const tick = useRef(0);
  useFrame(({ camera }) => {
    if (!ref.current) return;
    if (tick.current++ % 30 !== 0 && !reducedMotion) return;
    ref.current.lookAt(camera.position);
  });
  return (
    <group ref={ref} position={POS_LUNA} scale={1.1}>
      <mesh>
        <circleGeometry args={[1.15, 36]} />
        <meshBasicMaterial color="#f2f0e2" transparent opacity={0.98} depthWrite={false} fog={false} />
      </mesh>
      {/* mares: sombras suaves que hacen luna, no plato */}
      <mesh position={[-0.3, 0.26, 0.01]}>
        <circleGeometry args={[0.3, 18]} />
        <meshBasicMaterial color="#d4d2c2" transparent opacity={0.5} depthWrite={false} fog={false} />
      </mesh>
      <mesh position={[0.34, -0.28, 0.01]}>
        <circleGeometry args={[0.19, 16]} />
        <meshBasicMaterial color="#d9d7c6" transparent opacity={0.45} depthWrite={false} fog={false} />
      </mesh>
      {/* halo doble: el velo húmedo del páramo alrededor de la luna */}
      <mesh position={[0, 0, -0.05]}>
        <circleGeometry args={[2.1, 36]} />
        <meshBasicMaterial color="#b3cdf0" transparent opacity={0.18} depthWrite={false} fog={false} />
      </mesh>
      <mesh position={[0, 0, -0.1]}>
        <circleGeometry args={[3.6, 36]} />
        <meshBasicMaterial color="#3d5178" transparent opacity={0.12} depthWrite={false} fog={false} />
      </mesh>
    </group>
  );
}

/* Caja de las luciérnagas: la tierra baja del frente del valle (referencia
   ESTABLE — ParticulasAmbientales re-siembra si la caja cambia). */
const AREA_LUCIERNAGAS = /** @type {[number, number, number]} */ ([26, 2.6, 10]);

/* La pose de cámara del valle: UNA fuente para el Canvas y para el establishing
   shot de la CámaraDirector (así el dolly aterriza EXACTO donde siempre).
   REDISEÑO 2026-07: la cámara RETROCEDIÓ con el valle grande (48×48) — el
   cuadro respira, los lugares regados caben todos y nada queda apeñuscado. */
const CAMARA_VALLE = { position: /** @type {[number, number, number]} */ ([15.2, 13.4, 19.6]), fov: 40 };
/* El target de reposo del valle: el corazón del mapa, al que CamaraViajera
   lleva el target sin foco ((0,1.4,2.0) + 0.6 en y). El establishing del
   DirectorValle aterriza EXACTO aquí para no dar ningún salto al soltar. */
const MIRA_VALLE = [0.3, 1.8, 2.6];

/* El REPOSO CONSCIENTE DEL ASPECTO (dirección de cámara): el fov de three es
   VERTICAL — en un teléfono parado (aspecto ~0.46) los 40° dejan un fov
   horizontal de ~19° y la composición entera (lugares en x ∈ [-7.5, 7.5], el
   oso en el borde del monte) queda FUERA del cuadro: medio valle existía y
   nadie lo veía (la misma clase de fallo que los árboles tras el macizo de la
   sierra).

   EL PLANO VERTICAL ES OTRO PLANO (no el mismo, más lejos): retroceder a lo
   ancho regalaba el 40% del cuadro al cielo vacío y apeñuscaba la finca abajo
   — los rótulos colisionaban todos y la anti-colisión escondía la mayoría (el
   "difícil de manejar" del operador). En vertical la cámara SUBE y PICA: la
   ladera entera (tierra caliente → páramo, 16 u de fondo) corre a lo LARGO de
   la pantalla, los lugares se separan en vertical y cada rótulo respira. La
   mira baja y avanza (la finca al centro, el cielo de remate arriba).
   En landscape (aspecto ≥ 0.9) la pose aprobada queda EXACTA. */
function poseValleParaAspecto(aspect) {
  if (!aspect || aspect >= 0.9) {
    return { position: CAMARA_VALLE.position, fov: CAMARA_VALLE.fov, k: 1, mira: MIRA_VALLE };
  }
  const cuanVertical = Math.min(1, (0.9 - aspect) / 0.44); // 0 en 0.9 → 1 en ~0.46
  // El PLANO PICADO del teléfono parado (misma acimut de la pose aprobada,
  // polar ~40°): la cámara sube y pica para que la ladera del valle GRANDE
  // corra a lo largo de la pantalla y los lugares respiren en vertical.
  const PICADO = { position: [13, 26, 21], fov: 58, mira: [-0.6, 0.8, 3.6] };
  const lerp = (a, b) => a + (b - a) * cuanVertical;
  const position = /** @type {[number, number, number]} */ (
    CAMARA_VALLE.position.map((v, i) => lerp(v, PICADO.position[i]))
  );
  const mira = /** @type {[number, number, number]} */ (
    MIRA_VALLE.map((v, i) => lerp(v, PICADO.mira[i]))
  );
  const fov = Math.round(lerp(CAMARA_VALLE.fov, PICADO.fov));
  // k = razón de distancia (cámara→mira) contra la pose landscape: gobierna
  // el zoom de reposo de CamaraViajera y el techo de los controles.
  const dist = (p, m) => Math.hypot(p[0] - m[0], p[1] - m[1], p[2] - m[2]);
  const k = dist(position, mira) / dist(CAMARA_VALLE.position, MIRA_VALLE);
  return { position, fov, k, mira };
}

/* ── Contenido de la escena (dentro del Canvas). ── */
function Escena({ clima, focoId, animo, energia, onEntrar, onAlerta, onCasa = null, onAngelita = null, reducedMotion, perfil, tier = 'alto', estadoFinca = null, hayAlerta = false, aplanando = false, camaraDirector = false, beatsRef = null, portada = false, pose = null }) {
  /* La pose de reposo (aspecto-consciente, viene del host del Canvas). */
  const poseReposo = pose || { position: CAMARA_VALLE.position, fov: CAMARA_VALLE.fov, k: 1, mira: MIRA_VALLE };
  const miraReposo = poseReposo.mira || MIRA_VALLE;
  const controls = useRef(null);
  /* La cámara de director (FASE 4, flag `camaraDirector`) se monta DESPUÉS de
     CamaraViajera y gana por orden de frame durante su barrido. `avatarRef`
     recibe la posición viva de Angelita (Vector3 estable) para el follow. */
  const avatarRef = useRef(new THREE.Vector3());
  // Occluders de los rótulos: solo terreno + cordillera (raycast barato y es
  // exactamente lo que las etiquetas no deben atravesar).
  const terrenoRef = useRef(null);
  const cordilleraRef = useRef(null);
  const occluders = useMemo(() => [terrenoRef, cordilleraRef], []);
  const c = CLIMAS[clima];
  const foco = useMemo(() => {
    const m = focoId ? MUNDO_DIR_BY_ID[focoId] : null;
    // Sin foco, la cámara encuadra el corazón del valle (algo hacia el frente,
    // regla de tercios) — la mira de reposo es ASPECTO-CONSCIENTE: en vertical
    // baja y avanza hacia la finca (CamaraViajera le suma 0.6 en y).
    if (!m) return new THREE.Vector3(miraReposo[0], miraReposo[1] - 0.6, miraReposo[2]);
    const y = alturaTerreno(m.pos[0], m.pos[2]);
    return new THREE.Vector3(m.pos[0], y, m.pos[2]);
  }, [focoId, miraReposo]);
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
          tier={/** @type {"bajo"|"alto"|"medio"} */ (tier)}
          reducedMotion={reducedMotion}
          area={AREA_LUCIERNAGAS}
          position={[0, 0.35, 3.6]}
          semilla={11}
        />
      )}

      {/* La LUNA: la autora de la luz nocturna. Verla ancla el contraluz. */}
      {nocturno && <LunaValle reducedMotion={reducedMotion} />}

      <Terreno nocturno={nocturno} innerRef={terrenoRef} perfil={perfil} />
      <Cordillera color={nocturno ? '#48598a' : c.niebla} innerRef={cordilleraRef} perfil={perfil} />
      <Quebrada
        color={nocturno ? '#7fb3d9' : '#5fb2c9'}
        viva={c.lluviaViva}
        perfil={perfil}
        nocturno={nocturno}
      />
      <VegetacionPisos nocturno={nocturno} perfil={perfil} />

      {/* LA DIRECCIÓN DEL CUADRO: la casa-PUERTA donde descansa el ojo (su
          puerta iluminada abre el mapa de los mundos), los senderos de tierra
          pisada que nacen de ella (el rastro del uso diario), los PÓRTICOS de
          los 6 portales (la puerta legible de cada patio) y los patios bajo
          cada lugar navegable (afordancia sin UI). */}
      <CasaCampesina
        alturaDe={alturaTerreno}
        perfil={perfil}
        nocturno={nocturno}
        reducedMotion={reducedMotion}
        onPuerta={portada ? null : onCasa}
      />
      <SenderosValle alturaDe={alturaTerreno} perfil={perfil} />
      <PorticosPortales
        mundos={MUNDOS_DIR}
        alturaDe={alturaTerreno}
        perfil={perfil}
        nocturno={nocturno}
        onEntrar={portada ? null : onEntrar}
      />
      {/* EL PESO DE LAS COSAS: la sombra de contacto que planta cada objeto
          en su loma. Separa la profundidad sin mover nada — la casa, los
          hitos y las matas dejan de flotar. De noche se atenúa, no se va. */}
      <SombrasContacto
        mundos={MUNDOS_DIR}
        alturaDe={alturaTerreno}
        nocturno={nocturno}
        franja={clima}
      />
      {!portada && (
        <PatiosLugares mundos={MUNDOS_DIR} alturaDe={alturaTerreno} nocturno={nocturno} />
      )}

      {MUNDOS_DIR.map((m) => (
        <MundoLugar
          key={m.id}
          mundo={m}
          reducedMotion={reducedMotion}
          perfil={perfil}
          onEntrar={portada ? null : onEntrar}
        />
      ))}

      {/* Los VECINOS del valle (el oso, el borugo, el jaguar…): los personajes
          en su casa, con presencia digna — acompañan a Angelita sin pelearle
          el primer plano. Billboards DOM baratos: viven en TODOS los tiers
          (el operador no debería necesitar GPU rica para conocer al oso);
          la franja horaria decide quién está afuera. */}
      <VecinosDelValle
        alturaDe={alturaTerreno}
        reducedMotion={reducedMotion}
        franja={clima}
      />
      {/* MODO PORTADA (la cara de prod.chagra.app): el valle es ATMÓSFERA de
          la entrada — sin rótulos que compitan con el formulario ni faro que
          pida un toque que aún no puede darse. La vida (criaturas, Angelita,
          ciclo del día) se queda: la finca espera, no está muerta. */}
      {!portada && (
        <RotulosLugares
          mundos={MUNDOS_DIR}
          focoId={focoId}
          onEntrar={onEntrar}
          occluders={occluders}
        />
      )}

      <CriaturasValle reducedMotion={reducedMotion} cupo={perfil.criaturas} />
      {!portada && (
        <Beacon onAlerta={onAlerta} reducedMotion={reducedMotion} conLuz={perfil.luzBeacon} />
      )}
      <CompaneroAbeja
        foco={foco}
        entrando={entrando}
        animo={animo}
        energia={energia}
        estadoFinca={estadoFinca}
        hayAlerta={hayAlerta}
        reducedMotion={reducedMotion}
        posRef={camaraDirector ? avatarRef : null}
        conLuz={perfil.luzBeacon}
        onTocar={portada ? null : onAngelita}
      />

      <CamaraViajera
        foco={foco}
        focoKey={focoId || 'valle'}
        controls={controls}
        autoOrbit={autoOrbit}
        aplanando={aplanando}
        kReposo={poseReposo.k}
        miraInicial={miraReposo}
      />
      {/* La CÁMARA DE DIRECTOR (FASE 4). Con el flag `camaraDirector`:
          DirectorValle (establishing + follow + beats), montado DESPUÉS de
          CamaraViajera para ganar por orden de frame durante el barrido. Sin
          flag: la CamaraDirector clásica intacta (establishing + respiro). Gama
          baja o reduced-motion: ambas caen a cámara simple (inerte). */}
      {camaraDirector ? (
        <DirectorValle
          controls={controls}
          reposo={poseReposo.position}
          mira={miraReposo}
          fov={poseReposo.fov}
          foco={foco}
          avatarRef={avatarRef}
          beatsRef={beatsRef}
          entrando={entrando}
          aplanando={aplanando}
          activa
          tier={tier}
          reducedMotion={reducedMotion}
          unaVezClave="valle"
        />
      ) : (
        <CamaraDirector
          controls={controls}
          reposo={poseReposo.position}
          /* En portada la llegada es más lenta y amplia (contemplar, no operar)
             y NO consume la clave 'valle': al cruzar la tranquera, el home aún
             estrena su propio establishing — llegar dos veces se siente bien. */
          duracion={portada ? 3.6 : 2.4}
          amplio={portada ? 1.42 : 1.3}
          respiro={0.05}
          activa={!reducedMotion && tier !== 'bajo'}
          unaVezClave={portada ? 'portada' : 'valle'}
        />
      )}
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
  /* LA CASA ES LA PUERTA (§2): tocar la puerta iluminada de la casa llama
     aquí — el host abre el mapa de los 6 portales. */
  onCasa = null,
  /* ANGELITA INVITA (§6): tocar a la abeja central llama aquí — el host
     abre la conversación con el agente. */
  onAngelita = null,
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
  /* FASE 4 — cámara de director (establishing + follow + beats). Detrás de un
     flag para no tocar la cámara actual: off = comportamiento clásico. Va
     gateada por tier/reduced-motion adentro (tier bajo o calma = cámara fija). */
  camaraDirector = false,
  /* Buzón de beats coreografiados (fauna/Ent/alerta): el host (EscenaValle)
     empuja aquí `{ tipo, lado, slug, magico }` y el director lo consume. */
  beatsRef = null,
  /* MODO PORTADA (entrada/login 3D-first de prod.chagra.app): el mismo valle
     vivo pero como paisaje que ESPERA — sin rótulos de mundos ni faro del día,
     con una llegada de cámara más lenta. La UI de la entrada vive en el host. */
  portada = false,
}) {
  const [listo, setListo] = useState(false);
  /* El PERFIL DE RENDER del tier (DR-3D-PERF-GAMABAJA): 'alto' conserva este
     look intacto; 'medio'/'bajo' degradan sombras, DPR, antialias, densidad e
     instancian lo repetido. El default 'alto' preserva a los hosts viejos. */
  const perfil = useMemo(() => perfilDeTier(tier), [tier]);
  /* La pose de reposo según el ASPECTO del equipo (una vez por montaje: girar
     el teléfono re-monta rutas enteras en la práctica; no vale un resize
     listener que mueva la cámara bajo los dedos del usuario). */
  const pose = useMemo(
    () =>
      poseValleParaAspecto(
        typeof window !== 'undefined' && window.innerHeight > 0
          ? window.innerWidth / window.innerHeight
          : 1,
      ),
    [],
  );
  return (
    <Canvas
      className={`valle-canvas${listo ? ' valle-canvas--listo' : ''}`}
      shadows={perfil.sombras}
      dpr={perfil.dpr}
      gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
      camera={/** @type {any} */ ({ position: pose.position, fov: pose.fov })}
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
          onCasa={onCasa}
          onAngelita={onAngelita}
          reducedMotion={reducedMotion}
          perfil={perfil}
          tier={tier}
          aplanando={aplanando}
          camaraDirector={camaraDirector}
          beatsRef={beatsRef}
          portada={portada}
          pose={pose}
        />
      </Suspense>
    </Canvas>
  );
}
