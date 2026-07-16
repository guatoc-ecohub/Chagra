/*
 * faunaAcuatica — la VIDA del mundo del agua (peces, aves de ribera, libélulas
 * y ranas de quebrada), low-poly y por PISO TÉRMICO real.
 *
 * Regla dura de biodiversidad: especies REALES colombianas, con nombre
 * científico, ubicadas por su piso térmico. Este mundo es una quebrada-finca
 * ANDINA que baja del nacimiento (loma, frío) a la vega (templado); su
 * reservorio hace las veces de estanque de piscicultura de aguas frías. Por eso
 * el elenco es del gradiente FRÍO↔TEMPLADO, nunca peces de tierra caliente.
 *
 * GROUNDING (DR fauna-acuatica-y-riberea-…-b158c9b7, gemini grounded — AUNAP,
 * Instituto Humboldt, U.D.C.A., WWF Colombia, GBIF; el gemelo glm se descartó
 * por alucinar filas repetidas). Cada especie lleva su nota visual del DR.
 *
 * ESTILO: mismos materiales que MundoAgua3D (MeshLambert/Basic, sin shadow-map),
 * PALETA madre para los cuerpos y el mismo azul con permiso (PALETA.agua) del
 * espejo de agua del valle. Todo respeta `reducedMotion` (se congela quieto) y
 * el presupuesto por `tier` lo decide quien monta (cuenta de individuos).
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { PALETA } from '../atmosferaMadre.js';
import { FAUNA_AGUA_ESPECIES } from './faunaAcuatica.data.js';

/* Hash determinista [0,1) a partir de un índice — el cardumen se ve orgánico
   pero es SIEMPRE el mismo (cero Math.random → cachea limpio, igual que el
   terreno). */
const jitter = (i, s) => {
  const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

/* ── UN PEZ: cuerpo fusiforme + cola que aletea, sumergido ─────────────────── */
function Pez({ posicionar, fase, velocidad, escala, especie, reducedMotion }) {
  const g = useRef(null);
  const cola = useRef(null);
  useFrame((st) => {
    if (!g.current) return;
    const reloj = reducedMotion ? 4.2 + fase * 3.1 : st.clock.elapsedTime;
    const info = posicionar(fase + reloj * velocidad);
    g.current.position.set(info.x, info.y, info.z);
    const wig = reducedMotion ? 0 : Math.sin(reloj * 5.5 + fase * 11);
    g.current.rotation.y = info.yaw + wig * 0.08; // serpenteo del cuerpo
    if (cola.current) cola.current.rotation.y = wig * 0.7; // la cola aletea
  });
  return (
    <group ref={g} scale={escala}>
      {/* cuerpo fusiforme (elipsoide alargado sobre +Z, la marcha del pez) */}
      <mesh scale={[0.42, 0.5, 1]}>
        <sphereGeometry args={[0.5, 8, 6]} />
        <meshLambertMaterial color={especie.cuerpo} flatShading emissive={especie.cuerpo} emissiveIntensity={0.1} />
      </mesh>
      {/* vientre más claro (contraluz del agua) */}
      <mesh position={[0, -0.12, 0.02]} scale={[0.34, 0.3, 0.86]}>
        <sphereGeometry args={[0.5, 8, 5]} />
        <meshLambertMaterial color={especie.vientre} flatShading />
      </mesh>
      {/* franja lateral iridiscente (solo la trucha) */}
      {especie.franja ? (
        <mesh position={[0, 0.02, 0.0]} scale={[0.44, 0.1, 0.9]}>
          <sphereGeometry args={[0.5, 8, 4]} />
          <meshBasicMaterial color={especie.franja} transparent opacity={0.85} />
        </mesh>
      ) : null}
      {/* aleta dorsal */}
      <mesh position={[0, 0.2, 0.02]} rotation={[0.25, 0, 0]}>
        <coneGeometry args={[0.09, 0.2, 3]} />
        <meshLambertMaterial color={especie.aleta} flatShading />
      </mesh>
      {/* cola: sub-grupo anclado detrás (−Z) que aletea de lado a lado */}
      <group ref={cola} position={[0, 0, -0.48]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.32]}>
          <coneGeometry args={[0.2, 0.36, 4]} />
          <meshLambertMaterial color={especie.aleta} flatShading />
        </mesh>
      </group>
    </group>
  );
}

/* ── CARDUMEN: N peces de una especie. Dos hábitats:
      · modo="estanque": giran despacio bajo el espejo del reservorio.
      · modo="quebrada": remontan la corriente drapeados sobre el lecho. ── */
export function Cardumen({
  modo = 'estanque',
  centro = [0, 0, 0],
  radio = 1,
  superficieY = 0,
  curva = null,
  altura = null,
  especieId = 'trucha',
  cuantas = 6,
  reducedMotion = false,
}) {
  const especie = FAUNA_AGUA_ESPECIES[especieId];
  const peces = useMemo(() => {
    const arr = [];
    const tmp = { p: new THREE.Vector3(), t: new THREE.Vector3() };
    for (let i = 0; i < cuantas; i++) {
      const a = jitter(i, 1), b = jitter(i, 2), c = jitter(i, 3);
      const escala = especie.grupo === 'pez'
        ? (especie.comun === 'Capitán de la sabana' ? 0.5 : 0.42) * (0.8 + a * 0.5)
        : 0.4;
      let posicionar;
      if (modo === 'estanque') {
        // anillo dentro del espejo; los bentónicos (capitán) pegados al fondo.
        // La columna de agua del reservorio es somera (~0.3): el cardumen nada
        // JUSTO bajo la lámina para verse, y el capitán roza el lecho.
        const rr = radio * (0.35 + b * 0.5);
        const prof = especie.bentonico ? 0.2 + c * 0.05 : 0.05 + c * 0.13;
        const sentido = i % 2 === 0 ? 1 : -1;
        posicionar = (u) => {
          const ang = u * Math.PI * 2 * sentido + a * 6.283;
          const x = centro[0] + Math.cos(ang) * rr;
          const z = centro[2] + Math.sin(ang) * rr;
          const y = superficieY - prof + Math.sin(u * 6.283 + a * 9) * 0.03;
          const yaw = Math.atan2(-Math.sin(ang) * sentido, Math.cos(ang) * sentido);
          return { x, y, z, yaw };
        };
      } else {
        // a lo largo de la quebrada, a un costado del hilo de agua
        const lado = i % 2 === 0 ? 1 : -1;
        const off = (0.05 + b * 0.14) * lado;
        const prof = 0.02 + c * 0.05; // apenas bajo la lámina (agua somera)
        posicionar = (u) => {
          const tt = ((u % 1) + 1) % 1;
          curva.getPointAt(tt, tmp.p);
          curva.getTangentAt(tt, tmp.t);
          const px = -tmp.t.z, pz = tmp.t.x;
          const L = Math.hypot(px, pz) || 1;
          const x = tmp.p.x + (px / L) * off;
          const z = tmp.p.z + (pz / L) * off;
          const y = (altura ? altura(x, z) : tmp.p.y) + prof;
          const yaw = Math.atan2(tmp.t.x, tmp.t.z);
          return { x, y, z, yaw };
        };
      }
      arr.push({
        key: i,
        fase: a,
        velocidad: (modo === 'estanque' ? 0.02 : 0.03) * (0.7 + b * 0.6),
        escala,
        posicionar,
      });
    }
    return arr;
  }, [modo, centro, radio, superficieY, curva, altura, cuantas, especie]);

  return (
    <group>
      {peces.map((p) => (
        <Pez
          key={p.key}
          posicionar={p.posicionar}
          fase={p.fase}
          velocidad={p.velocidad}
          escala={p.escala}
          especie={especie}
          reducedMotion={reducedMotion}
        />
      ))}
    </group>
  );
}

/* ── GARZA REAL (Ardea alba) — depredador tope, bioindicador. Blanca, pico
      amarillo, patas negras; quieta al acecho en la orilla, con leve vaivén de
      cuello. Piso: cálido→frío (humedales y reservorios andinos). ── */
export function Garza({ pos, rot = 0, reducedMotion = false }) {
  const cuello = useRef(null);
  useFrame((st) => {
    if (reducedMotion || !cuello.current) return;
    cuello.current.rotation.x = -0.5 + Math.sin(st.clock.elapsedTime * 0.5) * 0.16;
  });
  const B = '#f3f0e6'; // blanco cálido
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {/* patas negras */}
      {[-0.07, 0.07].map((dx, i) => (
        <mesh key={i} position={[dx, 0.34, 0]}>
          <cylinderGeometry args={[0.016, 0.016, 0.68, 5]} />
          <meshLambertMaterial color="#33322c" />
        </mesh>
      ))}
      {/* cuerpo ovoide inclinado */}
      <mesh position={[0, 0.78, -0.02]} rotation={[0.3, 0, 0]} scale={[0.36, 0.4, 0.6]}>
        <sphereGeometry args={[0.5, 9, 7]} />
        <meshLambertMaterial color={B} flatShading />
      </mesh>
      {/* cuello + cabeza + pico (sub-grupo que se mece) */}
      <group ref={cuello} position={[0, 0.92, 0.05]} rotation={[-0.5, 0, 0]}>
        <mesh position={[0, 0.22, 0.03]}>
          <cylinderGeometry args={[0.03, 0.045, 0.5, 6]} />
          <meshLambertMaterial color={B} />
        </mesh>
        <mesh position={[0, 0.47, 0.05]}>
          <sphereGeometry args={[0.075, 8, 6]} />
          <meshLambertMaterial color={B} flatShading />
        </mesh>
        {/* pico amarillo, largo y puntiagudo */}
        <mesh position={[0, 0.5, 0.2]} rotation={[1.25, 0, 0]}>
          <coneGeometry args={[0.03, 0.28, 5]} />
          <meshLambertMaterial color="#e6b23a" flatShading />
        </mesh>
      </group>
    </group>
  );
}

/* ── MARTÍN PESCADOR (Chloroceryle amazona) — dorso verde brillante, vientre
      blanco, cresta desordenada y pico recto. Posado en una vara sobre el agua.
      Piso: templado. Bioindicador de presa/ecosistema ribereño sano. ── */
export function MartinPescador({ pos, rot = 0, reducedMotion = false }) {
  const cabeza = useRef(null);
  useFrame((st) => {
    if (reducedMotion || !cabeza.current) return;
    cabeza.current.rotation.y = Math.sin(st.clock.elapsedTime * 0.8) * 0.4; // otea el agua
  });
  const V = '#2f5d43'; // verde dorso
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {/* la vara donde se posa (asomando del agua) */}
      <mesh position={[0, -0.12, 0]} rotation={[0.18, 0, 0.1]}>
        <cylinderGeometry args={[0.02, 0.025, 0.7, 5]} />
        <meshLambertMaterial color={PALETA.maderaOscura} />
      </mesh>
      {/* cuerpo compacto */}
      <mesh position={[0, 0.22, 0]} rotation={[0.5, 0, 0]} scale={[0.3, 0.32, 0.5]}>
        <sphereGeometry args={[0.5, 9, 7]} />
        <meshLambertMaterial color={V} flatShading />
      </mesh>
      {/* vientre blanco */}
      <mesh position={[0, 0.16, 0.09]} scale={[0.2, 0.2, 0.26]}>
        <sphereGeometry args={[0.5, 8, 6]} />
        <meshLambertMaterial color="#efe9db" flatShading />
      </mesh>
      {/* cabeza + cresta + pico (sub-grupo que otea) */}
      <group ref={cabeza} position={[0, 0.34, 0.12]}>
        <mesh>
          <sphereGeometry args={[0.11, 9, 7]} />
          <meshLambertMaterial color={V} flatShading />
        </mesh>
        <mesh position={[0, 0.09, -0.03]} rotation={[-0.3, 0, 0]}>
          <coneGeometry args={[0.06, 0.12, 4]} />
          <meshLambertMaterial color={V} flatShading />
        </mesh>
        {/* pico recto y largo, negro */}
        <mesh position={[0, 0, 0.14]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.022, 0.22, 5]} />
          <meshLambertMaterial color="#26251f" flatShading />
        </mesh>
      </group>
    </group>
  );
}

/* ── MIRLA DE AGUA (Cinclus leucocephalus) — el ave de los torrentes: cuerpo
      pizarra, cabeza y pecho blancos. Se posa en una piedra a media corriente y
      "cabecea" (dipper). Piso: frío (ríos y quebradas de montaña). ── */
export function MirlaDeAgua({ pos, rot = 0, reducedMotion = false }) {
  const ave = useRef(null);
  useFrame((st) => {
    if (reducedMotion || !ave.current) return;
    ave.current.position.y = 0.16 + Math.abs(Math.sin(st.clock.elapsedTime * 2.2)) * 0.05; // el cabeceo
  });
  const O = '#4a4f52'; // pizarra
  const W = '#ece7db';
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {/* la piedra del torrente */}
      <mesh position={[0, 0.05, 0]}>
        <dodecahedronGeometry args={[0.16, 0]} />
        <meshLambertMaterial color={PALETA.piedra} flatShading />
      </mesh>
      <group ref={ave} position={[0, 0.16, 0]}>
        <mesh rotation={[0.3, 0, 0]} scale={[0.24, 0.26, 0.4]}>
          <sphereGeometry args={[0.5, 9, 7]} />
          <meshLambertMaterial color={O} flatShading />
        </mesh>
        {/* cabeza y pecho blancos */}
        <mesh position={[0, 0.13, 0.06]} scale={[0.16, 0.16, 0.18]}>
          <sphereGeometry args={[0.5, 8, 6]} />
          <meshLambertMaterial color={W} flatShading />
        </mesh>
        {/* colita alzada */}
        <mesh position={[0, 0.05, -0.14]} rotation={[-0.7, 0, 0]}>
          <coneGeometry args={[0.05, 0.14, 4]} />
          <meshLambertMaterial color={O} flatShading />
        </mesh>
      </group>
    </group>
  );
}

/* ── LIBÉLULA (Odonata) — bioindicador de agua limpia. Cuerpo iridiscente,
      cuatro alas translúcidas; revolotea sobre la lámina. ── */
function Libelula({ ancla, fase, reducedMotion }) {
  const g = useRef(null);
  const alas = useRef(null);
  useFrame((st) => {
    if (!g.current) return;
    const t = reducedMotion ? fase * 6 : st.clock.elapsedTime;
    // vuelo errático sobre su ancla
    g.current.position.set(
      ancla[0] + Math.sin(t * 0.9 + fase * 6) * 0.5,
      ancla[1] + Math.sin(t * 1.7 + fase * 3) * 0.12,
      ancla[2] + Math.cos(t * 0.7 + fase * 5) * 0.5,
    );
    g.current.rotation.y = Math.sin(t * 0.9 + fase * 6 + Math.PI / 2) * 0.6;
    if (alas.current && !reducedMotion) alas.current.rotation.x = Math.sin(t * 30) * 0.4;
  });
  return (
    <group ref={g} position={ancla}>
      {/* abdomen delgado */}
      <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 1]}>
        <cylinderGeometry args={[0.012, 0.02, 0.34, 5]} />
        <meshBasicMaterial color="#2fa6a2" />
      </mesh>
      <mesh position={[0, 0, 0.18]}>
        <sphereGeometry args={[0.035, 7, 5]} />
        <meshBasicMaterial color="#1f7d7a" />
      </mesh>
      {/* cuatro alas translúcidas */}
      <group ref={alas} position={[0, 0.01, 0.06]}>
        {[[-1, 0.02], [1, 0.02], [-1, -0.06], [1, -0.06]].map(([lado, dz], i) => (
          <mesh key={i} position={[lado * 0.12, 0, dz]} rotation={[0, 0, lado * 0.2]} scale={[1, 1, 1]}>
            <boxGeometry args={[0.22, 0.005, 0.07]} />
            <meshBasicMaterial color="#e2f4f4" transparent opacity={0.5} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function Libelulas({ anclas = [], reducedMotion = false }) {
  return (
    <group>
      {anclas.map((a, i) => (
        <Libelula key={i} ancla={a} fase={jitter(i, 7)} reducedMotion={reducedMotion} />
      ))}
    </group>
  );
}

/* ── RANA DE QUEBRADA (Pristimantis sp.) — control de insectos, endémicas de
      los Andes. Pequeña, verde-parda, posada en una piedra de la ribera, con
      pulso del buche. Piso: templado→frío según la especie. ── */
export function RanaQuebrada({ pos, rot = 0, reducedMotion = false }) {
  const buche = useRef(null);
  useFrame((st) => {
    if (reducedMotion || !buche.current) return;
    const p = 0.9 + Math.max(0, Math.sin(st.clock.elapsedTime * 1.6)) * 0.5; // canto
    buche.current.scale.set(p, p, p);
  });
  const P = '#6f7d44';
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {/* piedrita húmeda */}
      <mesh position={[0, 0.04, 0]} scale={[1.1, 0.6, 1]}>
        <dodecahedronGeometry args={[0.16, 0]} />
        <meshLambertMaterial color={PALETA.piedra} flatShading />
      </mesh>
      {/* cuerpo rechoncho */}
      <mesh position={[0, 0.13, 0]} scale={[0.5, 0.34, 0.6]}>
        <sphereGeometry args={[0.28, 8, 6]} />
        <meshLambertMaterial color={P} flatShading />
      </mesh>
      {/* patas traseras plegadas */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.11, 0.09, -0.03]} rotation={[0, 0, s * 0.6]} scale={[0.5, 0.22, 0.4]}>
          <sphereGeometry args={[0.16, 6, 5]} />
          <meshLambertMaterial color="#5c6a38" flatShading />
        </mesh>
      ))}
      {/* buche que canta */}
      <mesh ref={buche} position={[0, 0.09, 0.11]} scale={[1, 1, 1]}>
        <sphereGeometry args={[0.06, 7, 5]} />
        <meshLambertMaterial color="#8a944e" flatShading />
      </mesh>
      {/* ojos saltones */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.07, 0.2, 0.06]}>
          <sphereGeometry args={[0.032, 6, 5]} />
          <meshLambertMaterial color="#23281a" emissive="#5a4a10" emissiveIntensity={0.2} />
        </mesh>
      ))}
    </group>
  );
}
