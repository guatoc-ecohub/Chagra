/*
 * vegetacionRibera — la VEGETACIÓN REAL de quebrada andina que reemplaza al
 * árbol genérico de ribera del mundo del agua.
 *
 * Tres especies del bosque de galería / ronda hídrica colombiana (todas de
 * clima frío→templado, coherentes con esta quebrada-finca):
 *
 *   · Aliso        (Alnus acuminata)      — fija nitrógeno, PROTEGE nacimientos
 *                                            y estabiliza taludes; el árbol de
 *                                            ronda hídrica por excelencia.
 *   · Sauce        (Salix humboldtiana)   — ramas colgantes sobre el agua;
 *                                            sujeta la orilla.
 *   · Guadua       (Guadua angustifolia)  — el bambú nativo: macolla de culmos
 *                                            anillados a la vera de la quebrada,
 *                                            gran retenedor de suelo y agua.
 *
 * GROUNDING: agroforestería/silvopastoril andino y ronda hídrica — Alnus
 * acuminata y Guadua angustifolia son especies canónicas de ribera en los Andes
 * colombianos (Instituto Humboldt / Agrosavia; DR agua-manejo-nacional-colombia
 * y agroforesteria-y-silvopastoril-andino). Reemplaza el cono genérico anterior.
 *
 * ESTILO: low-poly MeshLambert, PALETA madre; determinista (cero Math.random).
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { PALETA } from '../atmosferaMadre.js';

const jitter = (i, s) => {
  const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

/* ── ALISO (Alnus acuminata): tronco gris pardo, copa redondeada en verde de
      trabajo. El guardián del agua. ── */
export function Aliso({ pos, esc = 1, rot = 0 }) {
  return (
    <group position={pos} scale={esc} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.07, 0.11, 1.1, 6]} />
        <meshLambertMaterial color="#7c7360" flatShading />
      </mesh>
      <mesh position={[0, 1.32, 0]}>
        <icosahedronGeometry args={[0.62, 0]} />
        <meshLambertMaterial color={PALETA.follaje} flatShading />
      </mesh>
      <mesh position={[0.32, 1.02, 0.12]}>
        <icosahedronGeometry args={[0.4, 0]} />
        <meshLambertMaterial color={PALETA.follajeOscuro} flatShading />
      </mesh>
      <mesh position={[-0.28, 1.14, -0.15]}>
        <icosahedronGeometry args={[0.44, 0]} />
        <meshLambertMaterial color={PALETA.follaje} flatShading />
      </mesh>
    </group>
  );
}

/* ── SAUCE (Salix humboldtiana): esbelto, con cortinas de ramas colgantes que
      rozan el agua (verde claro plateado). ── */
export function Sauce({ pos, esc = 1, rot = 0 }) {
  const cortinas = useMemo(() => {
    const arr = [];
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = 0.34 + jitter(i, 4) * 0.14;
      arr.push({
        pos: [Math.cos(a) * r, 1.15, Math.sin(a) * r],
        largo: 0.7 + jitter(i, 5) * 0.5,
        inc: 0.12 + jitter(i, 6) * 0.12,
        rot: a,
      });
    }
    return arr;
  }, []);
  return (
    <group position={pos} scale={esc} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.6, 0]} rotation={[0, 0, 0.06]}>
        <cylinderGeometry args={[0.06, 0.1, 1.25, 6]} />
        <meshLambertMaterial color={PALETA.madera} flatShading />
      </mesh>
      {/* copa alta y las cortinas colgantes */}
      <mesh position={[0, 1.35, 0]}>
        <icosahedronGeometry args={[0.42, 0]} />
        <meshLambertMaterial color="#a8c489" flatShading />
      </mesh>
      {cortinas.map((c, i) => (
        <mesh
          key={i}
          position={/** @type {[number,number,number]} */ (c.pos)}
          rotation={[c.inc * Math.cos(c.rot), 0, -c.inc * Math.sin(c.rot)]}
        >
          <coneGeometry args={[0.08, c.largo, 4]} />
          <meshLambertMaterial color="#9dbb7c" flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* ── GUADUA (Guadua angustifolia): macolla de culmos altos y anillados, con
      leve arqueo y penachos de hoja arriba. El bambú de la quebrada. ── */
export function Guadua({ pos, esc = 1, rot = 0 }) {
  const culmos = useMemo(() => {
    const arr = [];
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = jitter(i, 8) * Math.PI * 2;
      const r = 0.06 + jitter(i, 9) * 0.22;
      const alto = 2.1 + jitter(i, 10) * 1.1;
      arr.push({
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        alto,
        inc: (jitter(i, 11) - 0.5) * 0.24, // arqueo
        dir: a,
      });
    }
    return arr;
  }, []);
  const VERDE = '#b7c06a'; // verde-amarillo del culmo
  return (
    <group position={pos} scale={esc} rotation={[0, rot, 0]}>
      {culmos.map((c, i) => {
        const nudos = Math.max(3, Math.round(c.alto / 0.45));
        return (
          <group
            key={i}
            position={[c.x, 0, c.z]}
            rotation={[c.inc * Math.cos(c.dir), 0, -c.inc * Math.sin(c.dir)]}
          >
            <mesh position={[0, c.alto / 2, 0]}>
              <cylinderGeometry args={[0.035, 0.05, c.alto, 6]} />
              <meshLambertMaterial color={VERDE} flatShading />
            </mesh>
            {/* anillos de los nudos */}
            {Array.from({ length: nudos }, (_, k) => (
              <mesh key={k} position={[0, ((k + 1) * c.alto) / (nudos + 1), 0]}>
                <torusGeometry args={[0.05, 0.014, 4, 8]} />
                <meshLambertMaterial color="#8f9a4a" flatShading />
              </mesh>
            ))}
            {/* penacho de hoja en la punta */}
            <mesh position={[0, c.alto + 0.12, 0]}>
              <coneGeometry args={[0.22, 0.5, 5]} />
              <meshLambertMaterial color={PALETA.follajeClaro} flatShading />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ── EL BOSQUE DE GALERÍA: siembra las tres especies a lo largo de la quebrada,
      alternando orillas. Determinista: la misma ribera siempre. ──
   @param {THREE.Curve} curva  la quebrada (curva 3D drapeada sobre el terreno)
   @param {(x:number,z:number)=>number} altura  altura del terreno */
export function VegetacionRibera({ curva, altura }) {
  const arboles = useMemo(() => {
    if (!curva) return [];
    const arr = [];
    const p = new THREE.Vector3();
    const t = new THREE.Vector3();
    // de aguas abajo del nacimiento hasta la salida, en ambas orillas
    const tramos = [0.22, 0.34, 0.46, 0.58, 0.7, 0.82, 0.93];
    const especies = ['aliso', 'guadua', 'sauce', 'aliso', 'guadua', 'sauce', 'aliso'];
    tramos.forEach((tt, i) => {
      curva.getPointAt(tt, p);
      curva.getTangentAt(tt, t);
      const px = -t.z, pz = t.x;
      const L = Math.hypot(px, pz) || 1;
      const lado = i % 2 === 0 ? 1 : -1;
      const dist = 0.85 + jitter(i, 12) * 0.5;
      const x = p.x + (px / L) * dist * lado;
      const z = p.z + (pz / L) * dist * lado;
      arr.push({
        key: i,
        tipo: especies[i],
        pos: [x, altura ? altura(x, z) : p.y, z],
        esc: 0.72 + jitter(i, 13) * 0.4,
        rot: jitter(i, 14) * Math.PI * 2,
      });
    });
    return arr;
  }, [curva, altura]);

  return (
    <group>
      {arboles.map((a) => {
        const props = { pos: /** @type {[number,number,number]} */ (a.pos), esc: a.esc, rot: a.rot };
        if (a.tipo === 'sauce') return <Sauce key={a.key} {...props} />;
        if (a.tipo === 'guadua') return <Guadua key={a.key} {...props} />;
        return <Aliso key={a.key} {...props} />;
      })}
    </group>
  );
}
