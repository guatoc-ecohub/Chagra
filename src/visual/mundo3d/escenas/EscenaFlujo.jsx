/*
 * EscenaFlujo — ARQUETIPO `flujo`: el CAMINO del agua (gravedad y pendiente).
 *
 * El agua se entiende por dónde BAJA: nacimiento → quebrada → toma → riego.
 * Una cinta-tubo que desciende por una curva (la pendiente ES la lección), un
 * tanque que la recibe, y — si el mundo los declara en `params.hitos` — los
 * HITOS del recorrido, todos por DATOS y anclados a la curva por su fracción t:
 *
 *   · ronda    { tramo:[t0,t1], arboles }  franja de monte que protege el nacimiento
 *   · riesgo   { t, lado }                 punto de CUIDADO (ámbar, didáctico — no alarma)
 *   · bocatoma { t }                       la cajilla que toma el agua
 *   · cultivo  { pos:[x,y,z], surcos }     la huerta regada, con su canalito desde el tanque
 *
 * Sin `hitos` el diorama clásico sigue idéntico (nacimiento + cinta + tanque).
 * Todo primitivas low-poly (`MeshLambert`/`MeshBasic`), sin sombras, sin GLTF.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import EscenaBase3D from './EscenaBase3D.jsx';
import { Fauna } from './FaunaEscena.jsx';
import { faunaDeMundo } from '../faunaFuncional.js';
import { CIELOS, PALETA } from '../atmosferaMadre.js';

/* La fauna funcional del agua (POLINIZADORES de ribera y huerta regada) vive en
   faunaFuncional.js; aquí solo se siembra según el mundo y el device-tier. */

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
        <meshLambertMaterial color={PALETA.madera} flatShading />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <coneGeometry args={[0.28, 0.5, 7]} />
        <meshLambertMaterial color={PALETA.follajeOscuro} flatShading />
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
        <meshLambertMaterial color={PALETA.concreto} flatShading />
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
        <meshLambertMaterial color={PALETA.lamina} flatShading />
      </mesh>
      <mesh position={[0.28, 0.3, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.6, 5]} />
        <meshLambertMaterial color={PALETA.madera} />
      </mesh>
      <mesh position={[0.28, 0.62, 0]}>
        <boxGeometry args={[0.3, 0.2, 0.04]} />
        <meshLambertMaterial color={PALETA.ambar} flatShading />
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
          <meshLambertMaterial color={PALETA.tierra} flatShading />
        </mesh>
        {surcosArr.map((i) => (
          <mesh key={i} position={[0, 0.17, -0.42 + (0.84 * i) / Math.max(1, surcos - 1)]}>
            <boxGeometry args={[1.3, 0.1, 0.14]} />
            <meshLambertMaterial color={PALETA.follaje} flatShading />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Diorama({ params, tinte, reducedMotion, fauna }) {
  const color = params?.agua || (tinte && tinte[0]) || '#3f8fb0';
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
        <meshLambertMaterial color={PALETA.piedra} flatShading />
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
      {/* la vida que vive del agua: polinizadores de ribera y huerta regada */}
      <Fauna items={fauna} reducedMotion={reducedMotion} />
    </group>
  );
}

export default function EscenaFlujo(props) {
  const cielo = CIELOS.agua;
  const fauna = faunaDeMundo(props.mundoId, { tier: props.tier });
  return (
    <EscenaBase3D {...props} cielo={cielo} entrada={{ ...props.entrada, centro: [0, 0.9, 0.3] }}>
      <Diorama params={props.params} tinte={props.tinte} reducedMotion={props.reducedMotion} fauna={fauna} />
    </EscenaBase3D>
  );
}
