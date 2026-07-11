/*
 * EscenaFlujo — ARQUETIPO `flujo`: un PROCESO que baja por gravedad y agua.
 *
 * El arquetipo gold-standard del mundo del agua (nacimiento → quebrada → toma →
 * riego). Una cinta-tubo que desciende por una curva (la pendiente ES la
 * lección), un tanque que la recibe, y — si el mundo los declara en
 * `params.hitos` — los HITOS del recorrido, todos por DATOS y anclados a la
 * curva por su fracción t:
 *
 *   · ronda    { tramo:[t0,t1], arboles }  franja de monte / árboles de sombra
 *   · riesgo   { t, lado }                 punto de CUIDADO (ámbar, didáctico — no alarma)
 *   · bocatoma { t }                       la cajilla que toma / la despulpadora
 *   · cultivo  { pos:[x,y,z], surcos }     la huerta o el cafetal en surcos
 *   · cerezas  { tramo:[t0,t1], n }        (café) las cerezas maduras en los cafetos
 *   · taza     { pos:[x,y,z] }             (café) el final feliz: de la cereza a la taza
 *   · fauna    [{ tipo, pos, escala }]     criaturas de la librería (colibrí, mariposa)
 *
 * El MISMO arquetipo sirve al agua (el recorrido de la quebrada) y al café (el
 * beneficio húmedo: cereza → despulpado → fermento → lavado → secado → taza,
 * verdad agronómica de gravedad + agua). Un mundo lo reparametriza con datos:
 * `params.cielo` tiñe el ambiente y `params.flujo` el color de lo que baja
 * (agua azul o miel-café). Sin esos datos, el mundo del agua queda idéntico.
 *
 * Todo primitivas low-poly (`MeshLambert`/`MeshBasic`), sin sombras, sin GLTF.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import EscenaBase3D from './EscenaBase3D.jsx';
import { Colibri } from '../../creatures/Colibri.jsx';
import { Mariposa } from '../../creatures/Mariposa.jsx';

const CURVA_DEFAULT = [
  [-1.8, 2.2, 0.4], [-0.9, 1.4, 0.1], [0, 0.7, -0.2], [0.7, 0.1, 0.1], [1.4, -0.2, 0.5],
];

function Cinta({ curva3, color, reducedMotion }) {
  const ref = useRef(null);
  useFrame((state) => {
    if (reducedMotion || !ref.current) return;
    ref.current.material.opacity = 0.72 + Math.sin(state.clock.elapsedTime * 2) * 0.08;
  });
  const geo = useMemo(() => new THREE.TubeGeometry(curva3, 48, 0.16, 6, false), [curva3]);
  return (
    <mesh geometry={geo}>
      <meshLambertMaterial ref={ref} color={color} transparent opacity={0.78} />
    </mesh>
  );
}

/* Gotas que VIAJAN por la curva: el recorrido se ve, no se adivina. Con
   reduced-motion quedan quietas en su fracción t (escena digna, no muerta). */
function Gotas({ curva3, color, reducedMotion }) {
  const refs = useRef([]);
  const bases = [0.15, 0.5, 0.85];
  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime * 0.08;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const p = curva3.getPoint((bases[i] + t) % 1);
      m.position.set(p.x, p.y + 0.06, p.z);
    });
  });
  return (
    <group>
      {bases.map((b, i) => {
        const p = curva3.getPoint(b);
        return (
          <mesh
            key={b}
            ref={(el) => { refs.current[i] = el; }}
            position={[p.x, p.y + 0.06, p.z]}
          >
            <sphereGeometry args={[0.09, 8, 6]} />
            <meshBasicMaterial color={color} transparent opacity={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

/* Un arbolito low-poly (tronco + dos conos). La ronda hídrica los siembra. */
function Arbolito({ pos, escala = 1 }) {
  return (
    <group position={pos} scale={escala}>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 0.36, 6]} />
        <meshLambertMaterial color="#7a5a38" flatShading />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <coneGeometry args={[0.28, 0.5, 7]} />
        <meshLambertMaterial color="#3f6f3a" flatShading />
      </mesh>
      <mesh position={[0, 0.78, 0]}>
        <coneGeometry args={[0.18, 0.34, 7]} />
        <meshLambertMaterial color="#4d7f42" flatShading />
      </mesh>
    </group>
  );
}

/* La RONDA hídrica: arbolitos sembrados a ambos lados del tramo alto de la
   curva. Determinista: mismo dato, mismo monte. */
function Ronda({ curva3, tramo = [0, 0.35], arboles = 5 }) {
  const puestos = useMemo(() => {
    const [t0, t1] = tramo;
    return Array.from({ length: arboles }, (_, i) => {
      const t = t0 + ((t1 - t0) * i) / Math.max(1, arboles - 1);
      const p = curva3.getPoint(t);
      const lado = i % 2 === 0 ? 1 : -1;
      return {
        key: i,
        pos: [p.x + lado * 0.42, p.y - 0.05, p.z + lado * 0.5],
        escala: 0.8 + (i % 3) * 0.18,
      };
    });
  }, [curva3, tramo, arboles]);
  return (
    <group>
      {puestos.map((a) => <Arbolito key={a.key} pos={a.pos} escala={a.escala} />)}
    </group>
  );
}

/* La BOCATOMA: la cajilla de concreto que toma el agua sobre la quebrada. */
function Bocatoma({ curva3, t = 0.68, color }) {
  const p = curva3.getPoint(t);
  return (
    <group position={[p.x, p.y, p.z]}>
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.42, 0.3, 0.42]} />
        <meshLambertMaterial color="#a8a094" flatShading />
      </mesh>
      <mesh position={[0, 0.26, 0]}>
        <boxGeometry args={[0.34, 0.06, 0.34]} />
        <meshLambertMaterial color={color} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

/* El punto de CUIDADO: un barril y una señal ámbar junto a la quebrada. Didáctico
   ("aquí se cuida el agua"), nunca catástrofe: ni rojo, ni humo, ni calavera. */
function PuntoCuidado({ curva3, t = 0.46, lado = 0.8 }) {
  const p = curva3.getPoint(t);
  return (
    <group position={[p.x + lado * 0.4, p.y - 0.02, p.z + lado]}>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.32, 10]} />
        <meshLambertMaterial color="#8b8b8b" flatShading />
      </mesh>
      <mesh position={[0.28, 0.3, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.6, 5]} />
        <meshLambertMaterial color="#7a5a38" />
      </mesh>
      <mesh position={[0.28, 0.62, 0]}>
        <boxGeometry args={[0.3, 0.2, 0.04]} />
        <meshLambertMaterial color="#d9a13b" flatShading />
      </mesh>
    </group>
  );
}

/* La HUERTA regada: la cama de tierra, sus surcos verdes y el canalito que le
   trae el agua desde el tanque — el final feliz del recorrido. */
function Cultivo({ pos = [2.3, -0.3, -0.55], surcos = 4, desde, color }) {
  const surcosArr = Array.from({ length: surcos }, (_, i) => i);
  const canal = useMemo(() => {
    if (!desde) return null;
    const a = new THREE.Vector3(desde[0], desde[1], desde[2]);
    const b = new THREE.Vector3(pos[0], pos[1] + 0.05, pos[2]);
    const medio = a.clone().lerp(b, 0.5);
    const largo = a.distanceTo(b);
    const angulo = Math.atan2(b.x - a.x, b.z - a.z);
    return { medio, largo, angulo };
  }, [desde, pos]);
  return (
    <group>
      {canal && (
        <mesh position={canal.medio} rotation={[0, canal.angulo, 0]}>
          <boxGeometry args={[0.1, 0.06, canal.largo]} />
          <meshLambertMaterial color={color} transparent opacity={0.75} />
        </mesh>
      )}
      <group position={[pos[0], pos[1], pos[2]]}>
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[1.5, 0.16, 1.1]} />
          <meshLambertMaterial color="#6b4a2e" flatShading />
        </mesh>
        {surcosArr.map((i) => (
          <mesh key={i} position={[0, 0.17, -0.42 + (0.84 * i) / Math.max(1, surcos - 1)]}>
            <boxGeometry args={[1.3, 0.1, 0.14]} />
            <meshLambertMaterial color="#5f8a3f" flatShading />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* CEREZAS de café sembradas sobre los cafetos del tramo alto (donde va la
   sombra). Determinista: mismo dato, misma cosecha. Unas verdes (biches), casi
   todas maduras (rojas) — la señal de que ya se pueden coger. */
function Cerezas({ curva3, tramo = [0.06, 0.5], n = 10 }) {
  const puestas = useMemo(() => {
    const [t0, t1] = tramo;
    return Array.from({ length: n }, (_, i) => {
      const t = t0 + ((t1 - t0) * i) / Math.max(1, n - 1);
      const p = curva3.getPoint(t);
      const lado = i % 2 === 0 ? 1 : -1;
      return {
        key: i,
        pos: [
          p.x + lado * (0.5 + (i % 3) * 0.12),
          p.y + 0.02 + (i % 2) * 0.14,
          p.z + lado * (0.55 + (i % 2) * 0.1),
        ],
        verde: i % 4 === 0,
        r: 0.07 + (i % 3) * 0.012,
      };
    });
  }, [curva3, tramo, n]);
  return (
    <group>
      {puestas.map((c) => (
        <mesh key={c.key} position={c.pos}>
          <sphereGeometry args={[c.r, 8, 6]} />
          <meshLambertMaterial color={c.verde ? '#8fae4e' : '#c0402c'} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* La TAZA al final del recorrido: el beneficio termina volviéndose café. Un
   pocillo de cerámica (cono truncado) con su asa (torus), el café adentro y su
   platico — "de la cereza a la taza". Primitivas blandas, cero cajas. */
function Taza({ pos = [1.75, -0.12, 0.55] }) {
  return (
    <group position={pos}>
      {/* el platico */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.3, 0.32, 0.05, 20]} />
        <meshLambertMaterial color="#f3ece0" flatShading />
      </mesh>
      {/* el pocillo (cono truncado) */}
      <mesh position={[0, 0.19, 0]}>
        <cylinderGeometry args={[0.22, 0.17, 0.28, 20]} />
        <meshLambertMaterial color="#f6efe4" flatShading />
      </mesh>
      {/* el café adentro */}
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.02, 20]} />
        <meshLambertMaterial color="#3f2412" />
      </mesh>
      {/* el asa */}
      <mesh position={[0.24, 0.19, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.09, 0.025, 8, 16]} />
        <meshLambertMaterial color="#f0e6d6" flatShading />
      </mesh>
    </group>
  );
}

/* FAUNA de la librería posada en la escena (colibrí que poliniza la flor del
   café, mariposa que visita). Billboards `<Html>` con las creatures reales; con
   reduced-motion se congelan (`animated=false`), escena digna, no muerta. */
function FaunaFlujo({ fauna = [], reducedMotion }) {
  return (
    <group>
      {fauna.map((f, i) => {
        const Bicho = f.tipo === 'mariposa' ? Mariposa : Colibri;
        const base = f.tipo === 'mariposa' ? 44 : 52;
        const size = Math.round(base * (f.escala || 1));
        return (
          <group key={i} position={f.pos}>
            <Html center distanceFactor={7} zIndexRange={[22, 6]}>
              <div className="mundo-fauna" aria-hidden="true" style={{ pointerEvents: 'none' }}>
                <Bicho size={size} animated={!reducedMotion} />
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

function Diorama({ params, tinte, reducedMotion }) {
  const color = params?.flujo || params?.agua || (tinte && tinte[0]) || '#3f8fb0';
  const hitos = params?.hitos;
  const curva3 = useMemo(() => {
    const pts = (params?.curva || CURVA_DEFAULT).map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    return new THREE.CatmullRomCurve3(pts);
  }, [params?.curva]);
  const inicio = curva3.getPoint(0);
  const fin = curva3.getPoint(1);
  return (
    <group>
      {/* la ladera por la que baja el agua */}
      <mesh position={[-0.4, 0.6, -0.3]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[3.6, 0.5, 2.4]} />
        <meshLambertMaterial color="#7d9a5c" flatShading />
      </mesh>
      {/* el nacimiento arriba (donde arranca la curva) */}
      <mesh position={[inicio.x, inicio.y + 0.05, inicio.z]}>
        <cylinderGeometry args={[0.34, 0.4, 0.16, 14]} />
        <meshLambertMaterial color={color} transparent opacity={0.85} />
      </mesh>
      <Cinta curva3={curva3} color={color} reducedMotion={reducedMotion} />
      <Gotas curva3={curva3} color={color} reducedMotion={reducedMotion} />
      {/* el tanque que recibe el agua (donde termina la curva) */}
      <mesh position={[fin.x + 0.1, fin.y + 0.05, fin.z]}>
        <cylinderGeometry args={[0.55, 0.6, 0.7, 18]} />
        <meshLambertMaterial color="#9a8b74" flatShading />
      </mesh>
      <mesh position={[fin.x + 0.1, fin.y + 0.25, fin.z]}>
        <cylinderGeometry args={[0.5, 0.5, 0.12, 18]} />
        <meshLambertMaterial color={color} transparent opacity={0.8} />
      </mesh>
      {/* los hitos del recorrido (por datos; opcionales) */}
      {hitos?.ronda && <Ronda curva3={curva3} tramo={hitos.ronda.tramo} arboles={hitos.ronda.arboles} />}
      {hitos?.riesgo && <PuntoCuidado curva3={curva3} t={hitos.riesgo.t} lado={hitos.riesgo.lado} />}
      {hitos?.bocatoma && <Bocatoma curva3={curva3} t={hitos.bocatoma.t} color={color} />}
      {hitos?.cultivo && (
        <Cultivo
          pos={hitos.cultivo.pos}
          surcos={hitos.cultivo.surcos}
          desde={[fin.x + 0.1, fin.y + 0.1, fin.z]}
          color={color}
        />
      )}
      {/* enriquecimientos por datos (café): cerezas, la taza y la fauna */}
      {hitos?.cerezas && <Cerezas curva3={curva3} tramo={hitos.cerezas.tramo} n={hitos.cerezas.n} />}
      {hitos?.taza && <Taza pos={hitos.taza.pos} />}
      {hitos?.fauna && <FaunaFlujo fauna={hitos.fauna} reducedMotion={reducedMotion} />}
    </group>
  );
}

export default function EscenaFlujo(props) {
  // El agua trae su cielo azulado por defecto; un mundo (p. ej. el café) puede
  // teñir el ambiente cálido/verde de montaña con `params.cielo`.
  const cielo = props.params?.cielo || {
    fondo: '#d9e8ec', cielo: '#eaf3f5', suelo: '#7f9270', intensidad: 1.1,
  };
  return (
    <EscenaBase3D {...props} cielo={cielo} entrada={{ ...props.entrada, centro: [0, 0.9, 0.3] }}>
      <Diorama params={props.params} tinte={props.tinte} reducedMotion={props.reducedMotion} />
    </EscenaBase3D>
  );
}
