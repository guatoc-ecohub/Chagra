/*
 * MundoCafe3D — el SISTEMA CAFETERO AGROECOLÓGICO: café bajo sombra y su beneficio.
 *
 * No es una plantación a pleno sol: es un CAFETAL BAJO SOMBRA contado en 3D. Los
 * árboles de sombra (guamo, nogal cafetero) tienden un techo de hojas sobre los
 * cafetos; esa sombra baja la temperatura, guarda la humedad, alimenta el suelo
 * con hojarasca y hace madurar el grano DESPACIO — y grano que madura despacio es
 * grano de taza más dulce. La escena existe para que se entienda —sin una sola
 * cifra— por qué el café de sombra vale, y qué le pasa al fruto después de la mata:
 * el BENEFICIO (despulpado → lavado → secado en marquesina), del cerezo a la taza.
 *
 * DIRECCIÓN DE ARTE (todo dentro del framework, nada inventado por fuera):
 *   - La atmósfera es la MISMA hora dorada del valle: preset `CIELOS_HORA.dorada`
 *     (espejo exacto de `ATMOSFERA` / atmosferaMadre). Entrar al cafetal se siente
 *     como acercarse dentro del mismo atardecer, no como abrir otra app.
 *   - Los materiales salen de `PALETA` (atmosferaMadre) entintados hacia la niebla
 *     dorada con `mezclar` — la ley de coherencia del framework. El verde hondo del
 *     cafeto, el rojo de la cereza madura y la madera del beneficio conviven bajo
 *     el mismo sol sin romper la paleta común.
 *   - El polen a contraluz y las mariposas son el kit `ParticulasAmbientales`, sin
 *     tocar: mismo presupuesto por tier.
 *
 * EL SISTEMA (low-poly, cada pieza con propósito didáctico):
 *   - Cafetos      : el cultivo. Arbusto columnar de hoja oscura y lustrosa con
 *     cerezas rojas (maduras) y verdes (por madurar). Campo instanciado (2 draw
 *     calls) + las cerezas como un tercer InstancedMesh; un cafeto protagonista
 *     con detalle al frente.
 *   - Árbol sombra : guamo/nogal cafetero. Tronco alto y copa ancha que tiende
 *     sombra sobre las matas; bajo cada copa, dapples de luz colada entre hojas.
 *   - Beneficio    : la estación húmeda. Despulpadora de madera y tolva, tanques
 *     de lavado con agua que espeja el cielo, y la marquesina — la cama elevada
 *     bajo techo translúcido donde el café pergamino se seca al sol.
 *   - Recolección  : canastos de mimbre llenos de cereza roja y un recolector con
 *     sombrero junto a las matas (presencia campesina, sin movimiento).
 *   - Modo beneficio: el botón didáctico enciende el camino del grano — halos
 *     sobre despulpadora, tanques y marquesina, unidos por un hilo de ámbar. La
 *     copia explica el paso a paso.
 *
 * RENDIMIENTO: cafetos/cerezas/dapples instanciados (pocos draw calls), materiales
 * Lambert sin shadow-map, agua estática con brillo aditivo. Presupuestos por
 * `perfilDeTier`; `reducedMotion` congela el mecerse de las copas, el hilo del
 * beneficio y el temblor del agua y pasa el frameloop a demanda. Gama baja cae al
 * 2D digno antes de montar esto.
 *
 * Ruta mockup: #/mockups/mundo-cafe-3d (la cablea App.jsx aparte; aquí no se toca).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { CIELOS_HORA } from '../visual/mundo3d/cielosHoraData.js';
import { PALETA, mezclar } from '../visual/mundo3d/atmosferaMadre.js';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';
import { ParticulasAmbientales } from '../visual/mundo3d/ParticulasAmbientales.jsx';
import { crearRng } from '../visual/mundo3d/particulasData.js';

/* La hora dorada canónica (espejo de ATMOSFERA): única fuente de la atmósfera. */
const DORADA = CIELOS_HORA.dorada;

/* La paleta del framework entintada hacia la niebla dorada del cafetal. El café
   de sombra es verde hondo y tierra roja andina; se le da apenas el tinte cálido
   de la hora para que el ojo lea "el mismo atardecer", conservando su identidad. */
const TINTE = DORADA.niebla;
const P = {
  tierra: mezclar('#7a4a2c', TINTE, 0.24), // tierra roja de ladera cafetera
  tierraSeca: mezclar('#9a6c40', TINTE, 0.26), // camino, calvas entre surcos
  hojarasca: mezclar('#8a6a3c', TINTE, 0.3), // mantillo bajo la sombra
  pasto: mezclar(PALETA.follaje, TINTE, 0.26), // arvenses, cobertura viva
  cafetoHoja: mezclar('#2f6b39', TINTE, 0.22), // hoja de café: verde oscuro lustroso
  cafetoHojaSol: mezclar('#4c8a45', TINTE, 0.24), // la cara de la hoja que da al sol
  brote: mezclar('#8fae53', TINTE, 0.24), // cogollo tierno, hoja nueva
  cerezaRoja: mezclar('#c8382a', TINTE, 0.12), // cereza madura (lista para coger)
  cerezaVerde: mezclar('#6f9a3f', TINTE, 0.2), // cereza por madurar
  sombraTronco: mezclar(PALETA.madera, TINTE, 0.22), // tronco de guamo/nogal
  sombraCopa: mezclar('#4f7d3a', TINTE, 0.34), // copa ancha del árbol de sombra
  sombraCopaSol: mezclar('#6f9a48', TINTE, 0.3), // la corona iluminada
  madera: mezclar(PALETA.madera, TINTE, 0.2), // estructura del beneficio
  maderaClara: mezclar(PALETA.maderaClara, TINTE, 0.22), // tolva, listones
  concreto: mezclar(PALETA.concreto, TINTE, 0.3), // tanques de lavado
  metal: mezclar('#a1462c', TINTE, 0.24), // tambor de la despulpadora (rojo óxido)
  agua: mezclar('#5aa6b4', DORADA.cielo, 0.34), // el agua que espeja el cielo dorado
  pergamino: mezclar('#d8c095', TINTE, 0.2), // café pergamino secándose
  canasto: mezclar('#a9713c', TINTE, 0.2), // mimbre del canasto
  tela: mezclar('#c8b48c', TINTE, 0.16), // ruana/costal del recolector
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
/* Ruido determinista (hash de senos): mismo cafetal siempre, sin Math.random. */
function ruido(wx, wz) {
  return (
    Math.sin(wx * 0.8 + wz * 0.6) * 0.5 +
    Math.sin(wx * 1.9 - wz * 1.4 + 2.3) * 0.3 +
    Math.sin(wx * 3.1 + wz * 2.7 + 5.1) * 0.2
  );
}

/* La geografía del cafetal: una LADERA que sube hacia el fondo (donde está el
   cultivo, curvas a nivel) y se aplana al frente-derecha en una TERRAZA donde
   vive el beneficio. El café siempre en ladera; el beneficio siempre en llano. */
const ANCHO = 34;
const FONDO = 32;
function alturaCafe(wx, wz) {
  const sub = smoothstep(3, -14, wz); // 0 al frente (llano), 1 al fondo (la loma)
  let h = 0.15;
  h += sub * 3.7; // la ladera cafetera sube hacia atrás
  h += ruido(wx * 0.5, wz * 0.5) * 0.3 * (0.35 + sub); // ondulación, más arriba
  return h;
}
const yEn = (wx, wz) => alturaCafe(wx, wz);

/* Los árboles de sombra: dispersos entre y sobre los surcos del cultivo. Posición
   fija (dependen solo de la geografía determinista) → constantes de módulo. */
const ARBOLES_SOMBRA = [
  { pos: [-9, yEn(-9, -6), -6], esc: 1.1, giro: 0.4 },
  { pos: [-1.5, yEn(-1.5, -9.5), -9.5], esc: 1.25, giro: 1.1 },
  { pos: [7.5, yEn(7.5, -7), -7], esc: 1.15, giro: 2.0 },
  { pos: [11, yEn(11, -3.5), -3.5], esc: 0.95, giro: 0.7 },
  { pos: [-11, yEn(-11, -11), -11], esc: 1.05, giro: 1.6 },
  { pos: [3, yEn(3, -12), -12], esc: 1.2, giro: 0.2 },
];
const CENTROS_SOMBRA = ARBOLES_SOMBRA.map((a) => a.pos);

/* Las estaciones del beneficio, sobre la terraza llana del frente-derecha, y el
   hilo de ámbar que las une (despulpado → lavado → secado). Todo determinista. */
const POS_DESPULP = [6.5, yEn(6.5, 4.2), 4.2];
const POS_TANQUES = [4.2, yEn(4.2, 7.2), 7.2];
const POS_MARQ = [9.5, yEn(9.5, 8), 8];
const HILO_PUNTOS = [
  [POS_DESPULP[0], POS_DESPULP[1] + 1.3, POS_DESPULP[2]],
  [(POS_DESPULP[0] + POS_TANQUES[0]) / 2, POS_DESPULP[1] + 1.7, (POS_DESPULP[2] + POS_TANQUES[2]) / 2],
  [POS_TANQUES[0], POS_TANQUES[1] + 1.0, POS_TANQUES[2]],
  [(POS_TANQUES[0] + POS_MARQ[0]) / 2, POS_TANQUES[1] + 1.7, (POS_TANQUES[2] + POS_MARQ[2]) / 2],
  [POS_MARQ[0], POS_MARQ[1] + 1.4, POS_MARQ[2]],
];

/* Malla del cafetal con colores por vértice: tierra roja y hojarasca en la
   ladera del cultivo, cobertura viva verde en las calles, camino seco al frente. */
function construirTerreno(seg, plano) {
  const nx = seg + 1, nz = seg + 1;
  const pos = new Float32Array(nx * nz * 3);
  const col = new Float32Array(nx * nz * 3);
  const cTierra = new THREE.Color(P.tierra);
  const cSeca = new THREE.Color(P.tierraSeca);
  const cHojar = new THREE.Color(P.hojarasca);
  const cPasto = new THREE.Color(P.pasto);
  const c = new THREE.Color();
  let p = 0;
  for (let iz = 0; iz < nz; iz++) {
    const wz = -FONDO / 2 + (FONDO * iz) / seg;
    for (let ix = 0; ix < nx; ix++) {
      const wx = -ANCHO / 2 + (ANCHO * ix) / seg;
      const y = alturaCafe(wx, wz);
      pos[p] = wx; pos[p + 1] = y; pos[p + 2] = wz;
      // ladera del cultivo (fondo) → cobertura viva y hojarasca; llano (frente) → seco
      const enLoma = smoothstep(1.5, -6, wz);
      c.lerpColors(cSeca, cPasto, enLoma * (0.5 + 0.5 * smoothstep(-0.6, 0.9, ruido(wx, wz))));
      c.lerp(cHojar, enLoma * 0.35); // mantillo bajo la sombra
      c.lerp(cTierra, smoothstep(-0.2, 0.8, ruido(wx * 1.3, wz * 1.1)) * enLoma * 0.4);
      col[p] = c.r; col[p + 1] = c.g; col[p + 2] = c.b;
      p += 3;
    }
  }
  const idx = [];
  for (let iz = 0; iz < seg; iz++) {
    for (let ix = 0; ix < seg; ix++) {
      const a = iz * nx + ix, b = a + 1, d = a + nx, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  }
  let geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  if (plano) geo = geo.toNonIndexed();
  geo.computeVertexNormals();
  return geo;
}

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

/* El sol bajo del atardecer: un disco tibio con halo, del lado del solPos.
   No ilumina (de eso se encargan las luces); es el ancla visual de la hora. */
function SolBajo() {
  return (
    <group position={[11, 8, -15]}>
      <mesh>
        <circleGeometry args={[1.7, 40]} />
        <meshBasicMaterial color="#fff0cf" transparent opacity={0.95} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.05]}>
        <circleGeometry args={[3.1, 40]} />
        <meshBasicMaterial color={DORADA.luz} transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.1]}>
        <circleGeometry args={[5.4, 40]} />
        <meshBasicMaterial color={DORADA.cielo} transparent opacity={0.13} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ── Cafeto protagonista: el detalle que enseña la planta. Tallo leñoso, ramas
      en pisos horizontales (el porte del café), hoja oscura lustrosa y cerezas
      rojas y verdes arracimadas en las ramas. Al frente, para leerlo de cerca. ── */
function CafetoHeroe({ pos, reducedMotion }) {
  const copa = useRef(null);
  useFrame(({ clock }) => {
    if (reducedMotion || !copa.current) return;
    copa.current.rotation.z = Math.sin(clock.elapsedTime * 0.6) * 0.03;
  });
  const ramas = useMemo(() => {
    const rng = crearRng(41);
    const lista = [];
    const pisos = 5;
    for (let i = 0; i < pisos; i++) {
      const y = 0.6 + i * 0.42;
      const n = 4 + (i % 2);
      for (let j = 0; j < n; j++) {
        const ang = (j / n) * Math.PI * 2 + i * 0.5;
        const largo = 0.7 - i * 0.07 + rng() * 0.12;
        lista.push({ y, ang, largo, cerezas: i > 0 && i < 4, rojas: rng() > 0.4 });
      }
    }
    return lista;
  }, []);
  return (
    <group position={pos}>
      {/* tallo leñoso central */}
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.07, 0.11, 2.2, 7]} />
        <meshLambertMaterial color={P.sombraTronco} flatShading />
      </mesh>
      <group ref={copa}>
        {ramas.map((r, i) => {
          const dz = Math.sin(r.ang);
          return (
            <group key={i} position={[0, r.y, 0]} rotation={[0, -r.ang, 0]}>
              {/* la rama horizontal */}
              <mesh position={[r.largo / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.018, 0.03, r.largo, 5]} />
                <meshLambertMaterial color={P.sombraTronco} flatShading />
              </mesh>
              {/* follaje de la rama: pares de hojas oscuras */}
              {[0.42, 0.68, 0.92].map((t, k) => (
                <mesh key={k} position={[r.largo * t, 0.03, 0]} scale={[0.18, 0.06, 0.11]}>
                  <sphereGeometry args={[1, 6, 5]} />
                  <meshLambertMaterial color={k === 2 ? P.brote : P.cafetoHoja} flatShading />
                </mesh>
              ))}
              {/* cerezas arracimadas contra el tallo (rojas maduras / verdes) */}
              {r.cerezas &&
                [0.36, 0.52, 0.66].map((t, k) => (
                  <mesh key={`c${k}`} position={[r.largo * t, -0.05, k % 2 ? 0.05 : -0.05]}>
                    <sphereGeometry args={[0.05, 6, 5]} />
                    <meshLambertMaterial color={r.rojas ? P.cerezaRoja : P.cerezaVerde} flatShading />
                  </mesh>
                ))}
              {/* una mancha de follaje al extremo para dar volumen */}
              <mesh position={[r.largo * 1.0, 0.02, 0]} scale={[0.16, 0.12, 0.16]}>
                <sphereGeometry args={[1, 6, 5]} />
                <meshLambertMaterial color={dz > 0 ? P.cafetoHojaSol : P.cafetoHoja} flatShading />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}

/* ── El cafetal: la colonia de matas en curvas a nivel. Un InstancedMesh de
      follaje columnar = 1 draw call para todo el arbusto; las cerezas van en un
      InstancedMesh aparte (2 draw calls). Sembrado determinista en surcos que
      siguen el contorno de la ladera, evitando la terraza del beneficio. ── */
const RENGLONES = [-1.4, -3.1, -4.8, -6.5, -8.2, -9.9, -11.6];
function sitiosCafetal(densidad) {
  const rng = crearRng(207);
  const lista = [];
  RENGLONES.forEach((z0, fila) => {
    const paso = 1.5;
    for (let wx = -ANCHO / 2 + 3; wx <= ANCHO / 2 - 3; wx += paso) {
      if (rng() > densidad) continue;
      const jitterX = (rng() - 0.5) * 0.5;
      const curva = Math.sin(wx * 0.16 + fila * 0.4) * 0.7; // la curva a nivel del surco
      const wxx = wx + jitterX;
      const wz = z0 + curva + (rng() - 0.5) * 0.3;
      const y = alturaCafe(wxx, wz);
      lista.push({
        wx: wxx, wz, y,
        esc: 0.82 + rng() * 0.4,
        giro: rng() * Math.PI * 2,
        conCereza: rng() > 0.35,
        maduro: rng(),
      });
    }
  });
  return lista;
}

function CafetalInstanciado({ densidad, nCerezas }) {
  const matas = useRef(null);
  const cerezas = useRef(null);
  const sitios = useMemo(() => sitiosCafetal(densidad), [densidad]);

  const puntosCereza = useMemo(() => {
    const rng = crearRng(613);
    const pts = [];
    const conFruto = sitios.filter((s) => s.conCereza);
    let i = 0;
    while (pts.length < nCerezas && conFruto.length > 0) {
      const s = conFruto[i % conFruto.length];
      i += 1;
      const cuantas = 2 + Math.floor(rng() * 3);
      for (let k = 0; k < cuantas && pts.length < nCerezas; k++) {
        const ang = rng() * Math.PI * 2;
        const rad = 0.28 + rng() * 0.16;
        const alt = 0.5 + rng() * 0.9 * s.esc;
        pts.push({
          x: s.wx + Math.cos(ang) * rad,
          y: s.y + alt,
          z: s.wz + Math.sin(ang) * rad,
          // más rojas (maduras) donde la mata está "madura"
          roja: rng() < 0.35 + s.maduro * 0.5,
        });
      }
      if (i > conFruto.length * 6) break;
    }
    return pts;
  }, [sitios, nCerezas]);

  useEffect(() => {
    const m = matas.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const tinte = new THREE.Color();
    const base = new THREE.Color(P.cafetoHoja);
    const sol = new THREE.Color(P.cafetoHojaSol);
    sitios.forEach((s, i) => {
      dummy.position.set(s.wx, s.y + 0.7 * s.esc, s.wz);
      dummy.rotation.set(0, s.giro, 0);
      dummy.scale.set(s.esc, s.esc * 1.25, s.esc); // porte columnar del cafeto
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      tinte.copy(base).lerp(sol, (i % 5) / 8).offsetHSL(0, 0, (i % 3) * 0.01 - 0.01);
      m.setColorAt(i, tinte);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [sitios]);

  useEffect(() => {
    const m = cerezas.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const tinte = new THREE.Color();
    const roja = new THREE.Color(P.cerezaRoja);
    const verde = new THREE.Color(P.cerezaVerde);
    puntosCereza.forEach((c, i) => {
      dummy.position.set(c.x, c.y, c.z);
      dummy.scale.setScalar(0.9 + (i % 4) * 0.06);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      tinte.copy(c.roja ? roja : verde).offsetHSL(0, 0, (i % 3) * 0.02 - 0.02);
      m.setColorAt(i, tinte);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [puntosCereza]);

  return (
    <group>
      <instancedMesh ref={matas} args={[undefined, undefined, sitios.length]} frustumCulled={false}>
        {/* icosaedro alargado: facetas que leen como una mata tupida de café */}
        <icosahedronGeometry args={[0.44, 1]} />
        <meshLambertMaterial flatShading />
      </instancedMesh>
      <instancedMesh ref={cerezas} args={[undefined, undefined, puntosCereza.length]} frustumCulled={false}>
        <sphereGeometry args={[0.06, 6, 5]} />
        <meshLambertMaterial flatShading />
      </instancedMesh>
    </group>
  );
}

/* ── Árbol de sombra (guamo / nogal cafetero): tronco alto y copa ancha y plana
      que tiende sombra sobre las matas. Es el HÉROE del café de sombra: sin él,
      el cafetal sería una plantación a pleno sol. ── */
function ArbolSombra({ pos, esc = 1, giro = 0 }) {
  return (
    <group position={pos} scale={esc} rotation={[0, giro, 0]}>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.16, 0.26, 3.0, 7]} />
        <meshLambertMaterial color={P.sombraTronco} flatShading />
      </mesh>
      {/* ramas maestras que abren la copa */}
      {[0.7, -0.7, 0.2].map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * 0.5, 2.7 + i * 0.15, Math.sin(a) * 0.5]} rotation={[0, -a, 0.7]}>
          <cylinderGeometry args={[0.06, 0.1, 1.1, 5]} />
          <meshLambertMaterial color={P.sombraTronco} flatShading />
        </mesh>
      ))}
      {/* copa ancha y baja: varias masas para un techo de hojas amplio */}
      <mesh position={[0, 3.5, 0]} scale={[1.9, 0.9, 1.9]}>
        <icosahedronGeometry args={[1.2, 1]} />
        <meshLambertMaterial color={P.sombraCopa} flatShading />
      </mesh>
      <mesh position={[1.2, 3.7, 0.3]} scale={[1.2, 0.8, 1.2]}>
        <icosahedronGeometry args={[1.0, 1]} />
        <meshLambertMaterial color={P.sombraCopaSol} flatShading />
      </mesh>
      <mesh position={[-1.1, 3.6, -0.4]} scale={[1.1, 0.8, 1.1]}>
        <icosahedronGeometry args={[1.0, 1]} />
        <meshLambertMaterial color={P.sombraCopa} flatShading />
      </mesh>
      <mesh position={[0.1, 3.9, -1.1]} scale={[1.1, 0.7, 1.1]}>
        <icosahedronGeometry args={[0.95, 1]} />
        <meshLambertMaterial color={P.sombraCopaSol} flatShading />
      </mesh>
    </group>
  );
}

/* ── Dapples de luz colada entre las hojas de sombra: discos dorados aditivos en
      el suelo bajo cada copa, que respiran apenas (el sol filtrándose). Sutiles,
      solo tier alto. reduced-motion los deja quietos (presencia sin parpadeo). ── */
function LuzColada({ centros, reducedMotion }) {
  const grupo = useRef(null);
  const manchas = useMemo(() => {
    const rng = crearRng(97);
    const lista = [];
    centros.forEach((c) => {
      const n = 4 + Math.floor(rng() * 3);
      for (let i = 0; i < n; i++) {
        const x = c[0] + (rng() - 0.5) * 3.4;
        const z = c[2] + (rng() - 0.5) * 3.4;
        lista.push({ x, y: yEn(x, z) + 0.04, z, r: 0.5 + rng() * 0.7, fase: rng() * Math.PI * 2, op: 0.08 + rng() * 0.06 });
      }
    });
    return lista;
  }, [centros]);
  useFrame(({ clock }) => {
    if (reducedMotion || !grupo.current) return;
    const t = clock.elapsedTime;
    grupo.current.children.forEach((m, i) => {
      const d = manchas[i];
      m.material.opacity = d.op * (0.6 + 0.4 * Math.sin(t * 0.8 + d.fase));
    });
  });
  return (
    <group ref={grupo}>
      {manchas.map((d, i) => (
        <mesh key={i} position={[d.x, d.y, d.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[d.r, 16]} />
          <meshBasicMaterial color={DORADA.luz} transparent opacity={d.op} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

/* ── Canasto de mimbre lleno de cereza roja: la cosecha del día. Un tronco de
      cono para la cesta + un domo de cerezas arriba. ── */
function Canasto({ pos, esc = 1 }) {
  const cerezas = useMemo(() => {
    const rng = crearRng(Math.round(pos[0] * 13 + pos[2] * 7) >>> 0 || 5);
    return Array.from({ length: 9 }, () => ({
      x: (rng() - 0.5) * 0.34,
      z: (rng() - 0.5) * 0.34,
      y: 0.02 + rng() * 0.05,
      s: 0.7 + rng() * 0.5,
    }));
  }, [pos]);
  return (
    <group position={pos} scale={esc}>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.3, 0.22, 0.44, 12, 1, true]} />
        <meshLambertMaterial color={P.canasto} flatShading side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.04, 12]} />
        <meshLambertMaterial color={mezclar(P.canasto, TINTE, 0.3)} flatShading />
      </mesh>
      {/* borde */}
      <mesh position={[0, 0.44, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.3, 0.03, 6, 14]} />
        <meshLambertMaterial color={mezclar(P.canasto, '#5a4326', 0.3)} flatShading />
      </mesh>
      {/* montón de cereza roja rebosando */}
      {cerezas.map((c, i) => (
        <mesh key={i} position={[c.x, 0.44 + c.y, c.z]} scale={c.s}>
          <sphereGeometry args={[0.06, 6, 5]} />
          <meshLambertMaterial color={P.cerezaRoja} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* ── El recolector: silueta campesina con sombrero y canasto al cinto, junto a
      las matas. Presencia sin movimiento (también en reduced-motion): da vida
      humana a la escena. Low-poly, mirando al cafetal. ── */
function Recolector({ pos, giro = 0 }) {
  return (
    <group position={pos} rotation={[0, giro, 0]}>
      {/* piernas */}
      <mesh position={[-0.1, 0.35, 0]}>
        <cylinderGeometry args={[0.07, 0.06, 0.7, 6]} />
        <meshLambertMaterial color={mezclar(P.tela, '#5a4326', 0.4)} flatShading />
      </mesh>
      <mesh position={[0.1, 0.35, 0]}>
        <cylinderGeometry args={[0.07, 0.06, 0.7, 6]} />
        <meshLambertMaterial color={mezclar(P.tela, '#5a4326', 0.4)} flatShading />
      </mesh>
      {/* torso (ruana clara) */}
      <mesh position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.16, 0.2, 0.6, 8]} />
        <meshLambertMaterial color={P.tela} flatShading />
      </mesh>
      {/* brazo hacia la mata */}
      <mesh position={[0.22, 1.0, 0.08]} rotation={[0.3, 0, -0.8]}>
        <cylinderGeometry args={[0.045, 0.05, 0.5, 6]} />
        <meshLambertMaterial color={P.tela} flatShading />
      </mesh>
      {/* cabeza */}
      <mesh position={[0, 1.36, 0]}>
        <sphereGeometry args={[0.13, 8, 6]} />
        <meshLambertMaterial color={mezclar('#8a5a3a', TINTE, 0.15)} flatShading />
      </mesh>
      {/* sombrero de paja: ala + copa */}
      <mesh position={[0, 1.46, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.28, 16]} />
        <meshLambertMaterial color={P.maderaClara} flatShading side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.52, 0]}>
        <cylinderGeometry args={[0.13, 0.15, 0.14, 12]} />
        <meshLambertMaterial color={mezclar(P.maderaClara, TINTE, 0.2)} flatShading />
      </mesh>
      {/* canasto al cinto */}
      <group position={[-0.28, 0.7, 0.1]} scale={0.8}>
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[0.16, 0.12, 0.3, 10, 1, true]} />
          <meshLambertMaterial color={P.canasto} flatShading side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.3, 0]} scale={[1, 0.4, 1]}>
          <sphereGeometry args={[0.14, 8, 5]} />
          <meshLambertMaterial color={P.cerezaRoja} flatShading />
        </mesh>
      </group>
    </group>
  );
}

/* Un halo/ring que respira sobre una estación del beneficio; en modo beneficio
   brilla más fuerte y sube apenas, señalando el paso del grano. */
function HaloEstacion({ pos, activo, color = '#ffe6b0' }) {
  const anillo = useRef(null);
  useFrame(({ clock }) => {
    if (!anillo.current) return;
    const t = clock.elapsedTime;
    const objetivo = activo ? 0.4 : 0;
    anillo.current.material.opacity = objetivo * (0.7 + 0.3 * Math.sin(t * 1.6));
    anillo.current.scale.setScalar(activo ? 1.1 + 0.05 * Math.sin(t * 1.6) : 0.9);
  });
  return (
    <mesh ref={anillo} position={pos} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.7, 1.05, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* El hilo de ámbar que une las estaciones del beneficio (despulpado → lavado →
   secado): cuentas que corren por una curva cuando el modo está encendido. */
function HiloBeneficio({ puntos, activo, reducedMotion }) {
  const grupo = useRef(null);
  const curva = useMemo(() => new THREE.CatmullRomCurve3(puntos.map((p) => new THREE.Vector3(...p))), [puntos]);
  const cuentas = useMemo(() => Array.from({ length: 10 }, (_, i) => i / 10), []);
  useFrame(({ clock }) => {
    if (!grupo.current) return;
    const t = reducedMotion ? 0.2 : (clock.elapsedTime * 0.12) % 1;
    grupo.current.visible = activo;
    if (!activo) return;
    grupo.current.children.forEach((m, i) => {
      const u = (cuentas[i] + t) % 1;
      const pt = curva.getPointAt(u);
      m.position.set(pt.x, pt.y, pt.z);
      const fade = Math.sin(u * Math.PI); // se atenúa en los extremos
      m.material.opacity = 0.85 * fade;
      m.scale.setScalar(0.6 + 0.5 * fade);
    });
  });
  return (
    <group ref={grupo} visible={false}>
      {cuentas.map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.09, 7, 6]} />
          <meshBasicMaterial color={PALETA.ambar} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

/* ── Despulpadora: la primera estación. Tolva de madera que recibe la cereza,
      tambor rojo que despulpa, manivela y salida del grano. Sobre la terraza. ── */
function Despulpadora({ pos }) {
  return (
    <group position={pos}>
      {/* patas */}
      {[[-0.5, -0.35], [0.5, -0.35], [-0.5, 0.35], [0.5, 0.35]].map((q, i) => (
        <mesh key={i} position={[q[0], 0.4, q[1]]}>
          <boxGeometry args={[0.1, 0.8, 0.1]} />
          <meshLambertMaterial color={P.madera} flatShading />
        </mesh>
      ))}
      {/* cuerpo de la máquina */}
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[1.2, 0.5, 0.8]} />
        <meshLambertMaterial color={P.maderaClara} flatShading />
      </mesh>
      {/* tolva (recibe la cereza) — tronco de pirámide abierto arriba */}
      <mesh position={[0, 1.42, 0]}>
        <cylinderGeometry args={[0.5, 0.28, 0.5, 4, 1, true]} />
        <meshLambertMaterial color={P.madera} flatShading side={THREE.DoubleSide} />
      </mesh>
      {/* tambor despulpador (rojo, sobresale por el lado) */}
      <mesh position={[0.68, 0.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.5, 16]} />
        <meshLambertMaterial color={P.metal} flatShading />
      </mesh>
      {/* manivela: rueda + brazo */}
      <mesh position={[0.96, 0.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.24, 0.03, 6, 18]} />
        <meshLambertMaterial color={mezclar(P.metal, '#2a2620', 0.4)} flatShading />
      </mesh>
      <mesh position={[0.96, 1.14, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.16, 6]} />
        <meshLambertMaterial color={P.maderaClara} flatShading />
      </mesh>
      {/* canaleta de salida del grano lavable */}
      <mesh position={[-0.55, 0.75, 0]} rotation={[0, 0, 0.35]}>
        <boxGeometry args={[0.5, 0.06, 0.4]} />
        <meshLambertMaterial color={P.madera} flatShading />
      </mesh>
      {/* un canasto con cereza esperando turno */}
      <Canasto pos={[-0.1, 1.62, 0]} esc={0.55} />
    </group>
  );
}

/* ── Tanques de lavado/fermentación: dos pilas de concreto con agua que espeja el
      cielo dorado. El grano fermenta y se lava aquí antes de secar. ── */
function Tanque({ dx, reducedMotion, fase = 0 }) {
  const agua = useRef(null);
  useFrame(({ clock }) => {
    if (reducedMotion || !agua.current) return;
    agua.current.opacity = 0.82 + 0.08 * Math.sin(clock.elapsedTime * 1.3 + fase);
  });
  return (
    <group position={[dx, 0, 0]}>
      {/* muros del tanque (caja abierta) */}
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[1.0, 0.7, 0.9]} />
        <meshLambertMaterial color={P.concreto} flatShading />
      </mesh>
      {/* la lámina de agua que espeja el cielo */}
      <mesh position={[0, 0.62, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.82, 0.72]} />
        <meshLambertMaterial ref={agua} color={P.agua} transparent opacity={0.85} />
      </mesh>
      {/* brillo del cielo sobre el agua */}
      <mesh position={[0, 0.63, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.6, 0.4]} />
        <meshBasicMaterial color={DORADA.cielo} transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

function TanquesLavado({ pos, reducedMotion }) {
  return (
    <group position={pos}>
      <Tanque dx={-0.6} reducedMotion={reducedMotion} fase={0} />
      <Tanque dx={0.6} reducedMotion={reducedMotion} fase={1.4} />
    </group>
  );
}

/* ── Marquesina: la última estación. Cama elevada donde el café pergamino se seca
      al sol, bajo un techo translúcido a dos aguas que lo protege de la lluvia
      sin quitarle el calor. El grano beige moteado se lee desde arriba. ── */
function Marquesina({ pos }) {
  const grano = useMemo(() => {
    const rng = crearRng(451);
    return Array.from({ length: 26 }, () => ({
      x: (rng() - 0.5) * 2.3,
      z: (rng() - 0.5) * 1.3,
      s: 0.6 + rng() * 0.6,
    }));
  }, []);
  return (
    <group position={pos}>
      {/* patas de la cama elevada */}
      {[[-1.2, -0.7], [1.2, -0.7], [-1.2, 0.7], [1.2, 0.7]].map((q, i) => (
        <mesh key={i} position={[q[0], 0.4, q[1]]}>
          <boxGeometry args={[0.1, 0.8, 0.1]} />
          <meshLambertMaterial color={P.madera} flatShading />
        </mesh>
      ))}
      {/* la cama (bandeja) */}
      <mesh position={[0, 0.82, 0]}>
        <boxGeometry args={[2.7, 0.08, 1.7]} />
        <meshLambertMaterial color={P.maderaClara} flatShading />
      </mesh>
      {/* el café pergamino extendido secándose */}
      <mesh position={[0, 0.87, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.5, 1.5]} />
        <meshLambertMaterial color={P.pergamino} flatShading />
      </mesh>
      {/* motas de grano para que se lea "granos" y no una tabla lisa */}
      {grano.map((g, i) => (
        <mesh key={i} position={[g.x, 0.9, g.z]} scale={g.s}>
          <boxGeometry args={[0.07, 0.03, 0.05]} />
          <meshLambertMaterial color={mezclar(P.pergamino, '#a98a5c', 0.5)} flatShading />
        </mesh>
      ))}
      {/* postes del techo */}
      {[[-1.25, -0.85], [1.25, -0.85], [-1.25, 0.85], [1.25, 0.85]].map((q, i) => (
        <mesh key={`p${i}`} position={[q[0], 1.4, q[1]]}>
          <boxGeometry args={[0.07, 1.2, 0.07]} />
          <meshLambertMaterial color={P.madera} flatShading />
        </mesh>
      ))}
      {/* techo a dos aguas translúcido (plástico de marquesina) */}
      <mesh position={[0, 2.1, -0.44]} rotation={[-0.5, 0, 0]}>
        <planeGeometry args={[2.9, 1.25]} />
        <meshBasicMaterial color="#fbf0d2" transparent opacity={0.32} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 2.1, 0.44]} rotation={[0.5, 0, 0]}>
        <planeGeometry args={[2.9, 1.25]} />
        <meshBasicMaterial color="#fbf0d2" transparent opacity={0.32} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* cumbrera */}
      <mesh position={[0, 2.32, 0]}>
        <boxGeometry args={[2.9, 0.06, 0.06]} />
        <meshLambertMaterial color={P.madera} flatShading />
      </mesh>
    </group>
  );
}

/* La escena completa (grupo r3f interno; el default la monta en su Canvas). */
function EscenaCafe({ tier, reducedMotion, beneficio }) {
  const perfil = perfilDeTier(tier);
  const geo = useMemo(
    () => construirTerreno(perfil.segmentosTerreno, perfil.flatShading),
    [perfil.segmentosTerreno, perfil.flatShading],
  );
  useEffect(() => () => geo.dispose(), [geo]);

  // presupuestos del cultivo por tier
  const densidad = tier === 'alto' ? 0.92 : 0.7;
  const nCerezas = tier === 'alto' ? 150 : 80;

  /* `color`/`fog` se adjuntan a la ESCENA: hijos directos, nunca en <group>. */
  return (
    <>
      <color attach="background" args={[DORADA.fondo]} />
      {perfil.fog && <fog attach="fog" args={[DORADA.niebla, DORADA.nieblaCerca + 3, DORADA.nieblaLejos]} />}
      <LucesDoradas />
      <SolBajo />

      <mesh geometry={geo}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
      </mesh>

      {/* el cultivo: matas + cerezas + el protagonista al frente */}
      <CafetalInstanciado densidad={densidad} nCerezas={nCerezas} />
      <CafetoHeroe pos={[-3.5, yEn(-3.5, 1.2), 1.2]} reducedMotion={reducedMotion} />

      {/* los árboles de sombra y la luz colada bajo sus copas */}
      {ARBOLES_SOMBRA.map((a, i) => (
        <ArbolSombra key={i} pos={a.pos} esc={a.esc} giro={a.giro} />
      ))}
      {tier === 'alto' && <LuzColada centros={CENTROS_SOMBRA} reducedMotion={reducedMotion} />}

      {/* recolección: el recolector y canastos con cereza */}
      <Recolector pos={[-2.2, yEn(-2.2, 1.9), 1.9]} giro={-0.6} />
      <Canasto pos={[-1.2, yEn(-1.2, 2.6), 2.6]} esc={0.95} />
      <Canasto pos={[-5.6, yEn(-5.6, 3.4), 3.4]} esc={1.05} />

      {/* el beneficio: despulpado → lavado → secado */}
      <Despulpadora pos={POS_DESPULP} />
      <TanquesLavado pos={POS_TANQUES} reducedMotion={reducedMotion} />
      <Marquesina pos={POS_MARQ} />

      {/* señalización didáctica del beneficio */}
      <HaloEstacion pos={[POS_DESPULP[0], POS_DESPULP[1] + 0.05, POS_DESPULP[2]]} activo={beneficio} />
      <HaloEstacion pos={[POS_TANQUES[0], POS_TANQUES[1] + 0.05, POS_TANQUES[2]]} activo={beneficio} />
      <HaloEstacion pos={[POS_MARQ[0], POS_MARQ[1] + 0.05, POS_MARQ[2]]} activo={beneficio} />
      <HiloBeneficio puntos={HILO_PUNTOS} activo={beneficio} reducedMotion={reducedMotion} />

      {/* el aire de la hora dorada: polen a contraluz y mariposas del cafetal */}
      <ParticulasAmbientales
        tipo="polen"
        tier={tier}
        reducedMotion={reducedMotion}
        position={[0, 1, 1]}
        semilla={23}
      />
      <ParticulasAmbientales
        tipo="mariposas"
        densidad={0.7}
        tier={tier}
        reducedMotion={reducedMotion}
        position={[-2, 1.2, -2]}
        semilla={31}
      />
    </>
  );
}

/* Estilos de ESTA escena (chrome DOM sobre el Canvas). */
const CSS_CAFE = `
.cafe3d-root { position: relative; width: 100%; height: 100dvh; min-height: 320px; overflow: hidden; background: ${DORADA.fondo}; }
.cafe3d-canvas { position: absolute; inset: 0; opacity: 0; transition: opacity 0.9s ease; }
.cafe3d-canvas--lista { opacity: 1; }
.cafe3d-chrome { position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; }
.cafe3d-titulo { margin: 0; padding: 0.9rem 1rem 0; color: #4a3418; text-shadow: 0 1px 8px rgba(255,244,214,0.7); font: 700 1.18rem/1.2 system-ui, sans-serif; letter-spacing: 0.01em; }
.cafe3d-titulo small { display: block; font: 500 0.8rem/1.3 system-ui, sans-serif; opacity: 0.82; margin-top: 0.15rem; }
.cafe3d-pie { padding: 0 1rem 0.9rem; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.6rem; }
.cafe3d-carta { margin: 0; max-width: 34rem; text-align: center; padding: 0.5rem 0.95rem; border-radius: 0.7rem; background: rgba(74,52,24,0.62); backdrop-filter: blur(3px); color: #fbf3e2; font: 500 0.8rem/1.5 system-ui, sans-serif; }
.cafe3d-boton { pointer-events: auto; appearance: none; border: 1px solid rgba(74,52,24,0.35); border-radius: 999px; padding: 0.44rem 1rem; background: rgba(255,247,228,0.82); color: #5a3f1c; font: 600 0.8rem/1.1 system-ui, sans-serif; cursor: pointer; backdrop-filter: blur(3px); transition: background 0.2s ease, border-color 0.2s ease; }
.cafe3d-boton:hover, .cafe3d-boton:focus-visible { background: rgba(255,255,255,0.95); border-color: rgba(74,52,24,0.6); outline: none; }
.cafe3d-boton[aria-pressed='true'] { background: #ffe8b0; border-color: rgba(90,63,28,0.75); color: #4a3418; }
@media (prefers-reduced-motion: reduce) { .cafe3d-canvas { transition: none; } }
`;

/* La copia didáctica: en calma, el porqué de la sombra; en modo beneficio, el
   camino del grano del cerezo a la taza. */
const COPY_CALMA =
  'Café bajo sombra: los guamos y nogales tienden un techo de hojas sobre los cafetos. La sombra guarda la humedad, cuida el suelo y madura el grano despacio — grano más dulce. Toque el botón para ver el camino del grano.';
const COPY_BENEFICIO =
  'El beneficio, del cerezo a la taza: se recoge la cereza madura (roja), se DESPULPA para sacarle la pulpa, se LAVA y fermenta en los tanques, y se SECA como pergamino en la marquesina, al sol y bajo techo. Así nace la calidad de taza.';

/**
 * MundoCafe3D — el sistema cafetero agroecológico, montable con su propio
 * `<Canvas>`. Sin lógica de negocio: es una vitrina (#/mockups/mundo-cafe-3d).
 * El tier y reduced-motion se detectan aquí (mockup standalone), igual que sus
 * pares (mismo patrón que MundoAgua3D / MundoParamo3D).
 */
export default function MundoCafe3D() {
  const [listo, setListo] = useState(false);
  const [beneficio, setBeneficio] = useState(false);
  const [{ tier, reducedMotion }] = useState(() => decidirTier());
  const perfil = perfilDeTier(tier);
  /* Retrato (teléfono en vertical): la toma de escritorio picaba sobre los
     cafetos y DECAPITABA los árboles de sombra — y este mundo existe para
     enseñar el café BAJO SOMBRA. En retrato la cámara retrocede, abre el fov
     y mira más arriba: cafetos abajo, guamos y nogales con copa completa. */
  const retrato = useMemo(
    () => typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(max-aspect-ratio: 19/20)').matches,
    [],
  );

  return (
    <section
      className="cafe3d-root"
      data-tier={tier}
      aria-label="El sistema cafetero: café bajo sombra y su beneficio, del cerezo a la taza"
    >
      <style>{CSS_CAFE}</style>
      <Canvas
        className={`cafe3d-canvas${listo ? ' cafe3d-canvas--lista' : ''}`}
        dpr={perfil.dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={retrato ? { position: [0, 4.4, 17], fov: 50 } : { position: [0, 5, 14], fov: 42 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        <EscenaCafe tier={tier} reducedMotion={reducedMotion} beneficio={beneficio} />
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom
          minDistance={7}
          maxDistance={22}
          target={retrato ? [0, 2.4, 0] : [0, 1.2, 0]}
          minPolarAngle={0.5}
          maxPolarAngle={1.45}
          minAzimuthAngle={-1.15}
          maxAzimuthAngle={1.15}
          enableDamping
          dampingFactor={0.08}
          autoRotate={!reducedMotion}
          autoRotateSpeed={0.1}
        />
        <AdaptiveDpr pixelated />
      </Canvas>

      <div className="cafe3d-chrome">
        <h2 className="cafe3d-titulo">
          El cafetal bajo sombra
          <small>Café agroecológico — cafetos, árboles de sombra y el beneficio del grano</small>
        </h2>
        <div className="cafe3d-pie">
          <button
            type="button"
            className="cafe3d-boton"
            aria-pressed={beneficio}
            onClick={() => setBeneficio((v) => !v)}
          >
            {beneficio ? 'Ver el cafetal en calma' : 'Ver el camino del grano'}
          </button>
          <p className="cafe3d-carta" role="status">
            {beneficio ? COPY_BENEFICIO : COPY_CALMA}
          </p>
        </div>
      </div>
    </section>
  );
}
