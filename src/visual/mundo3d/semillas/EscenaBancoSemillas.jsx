/*
 * EscenaBancoSemillas — el MUNDO "Banco de Semillas Criollas": la autonomía
 * que cabe en un frasco, en 3D real y con el máximo cuidado visual.
 *
 * Un rincón de guardado campesino a la hora dorada: la TROJA contra la pared
 * encalada carga el MOSAICO — trece frascos, trece herencias: maíces de la
 * cordillera, fríjoles de mil pintas, papas de colores. De la viga cuelgan
 * CALABAZOS curados; en el piso, el costal de fique, la vasija de chamba y el
 * frasco con su capa de CENIZA — y el GORGOJO rondando por fuera, que no
 * puede entrar. Al sol, el parche con la MATA MADRE marcada viva con su cinta
 * de cochinilla (la semilla se escoge mata, no grano). Y la semilla VIAJA:
 * del frasco criollo al surco y DE VUELTA (la que se puede volver a sembrar),
 * y entre dos canastos de vecinos (el trueque: la semilla circula, no se
 * acumula). La bolsa certificada también está, digna, sin burla: saber la
 * diferencia es la autonomía, no el sermón.
 *
 * Toda la geometría es procedural (cero CDN/imágenes) y vive en
 * `bancoSemillas.geom.js` (puro, testeable); los textos y variedades en
 * `semillasData.js` (three-free). Paleta/luz/materiales: LA CASA (paleta/,
 * GUIA.md): ni un hex suelto, LuzMadre, recetas madre, cielo `tierra`.
 *
 * Tier-safe: 'alto' pleno (copetes densos, pintas del cargamanto, gorgojo,
 * flujos); 'medio' frugal; 'bajo' mínimo digno (quieto, sin flujos ni bicho).
 * Con `reducedMotion` monta QUIETO (frameloop a demanda, flujos congelados).
 *
 * Componente r3f: montar SOLO perezoso dentro de un host con altura.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  CIELOS,
  PALETA,
  TIERRAS,
  VERDES,
  ACENTOS,
  NEUTROS,
  LUCES,
  mezclar,
  mezclarCielo,
  crearMaterialMadre,
  LuzMadre,
} from '../paleta';
import { perfilDeTier } from '../deviceTier.js';
import { PERFILES_VASIJA } from '../artesaniaAndina.js';
import { VARIEDADES, TINTES_BANCO, HOTSPOTS_BANCO } from './semillasData.js';
import {
  BANCO,
  PERFIL_FRASCO,
  PERFIL_CALABAZO,
  PERFIL_COSTAL,
  puntosLathe,
  paramsDeSemillas,
  distribuirFrascos,
  semillasDelBanco,
  flujosDelBanco,
  particulasDeFlujo,
  matasDelParche,
  brotesDelSurco,
} from './bancoSemillas.geom.js';

/* CSS mínimo del lienzo (self-contained). Burbuja de hotspot en los tonos
   cálidos de la casa (tinta tibia + maíz), no el turquesa del subsuelo. */
const CSS = `
.bsem-canvas { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; transition: opacity 0.8s ease; }
.bsem-canvas--lista { opacity: 1; }
.bsem-hot { transform: translate(-50%, -120%); }
.bsem-hot__btn { display: inline-flex; align-items: center; gap: 0.34rem; max-width: 13rem; padding: 0.3rem 0.6rem; border: 0; border-radius: 999px; background: rgba(36, 26, 16, 0.84); color: #fff8ec; font: 600 0.76rem/1.1 system-ui, sans-serif; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35), inset 0 0 0 1px rgba(244, 197, 66, 0.42); cursor: pointer; -webkit-tap-highlight-color: transparent; text-align: left; }
.bsem-hot__btn:focus-visible { outline: 2px solid #f4c542; outline-offset: 2px; }
.bsem-hot__pt { width: 0.66rem; height: 0.66rem; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #fff8ec, #e2c04c 70%); box-shadow: 0 0 8px 2px rgba(226, 192, 76, 0.65); flex: 0 0 auto; }
@media (prefers-reduced-motion: reduce) { .bsem-canvas { transition: none; } }
`;

/* Material madre memoizado + liberado (patrón GUIA.md §2). */
function useMaterialMadre(nombre, perfil, extra) {
  const mat = useMemo(
    () => crearMaterialMadre(nombre, perfil, extra),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nombre, perfil],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  return mat;
}

/* Sombra de contacto rubber-hose: la elipse tibia que asienta la pieza. */
function SombraContacto({ pos, r = 0.3, opacidad = 0.2 }) {
  return (
    <mesh position={[pos[0], 0.012, pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[r, 14]} />
      <meshBasicMaterial color={LUCES.sombra} transparent opacity={opacidad} depthWrite={false} />
    </mesh>
  );
}

/* ── LA TROJA: pared encalada, piso de tierra, parales, tablas y viga. ── */
function Troja({ perfil }) {
  const matCal = useMaterialMadre('cal', perfil);
  const matTabla = useMaterialMadre('madera', perfil, { color: PALETA.maderaClara });
  const matParal = useMaterialMadre('madera', perfil, { color: PALETA.maderaOscura });
  const matPiso = useMaterialMadre('tierra', perfil, { color: TIERRAS.camino });
  const { pared, piso, estante, viga } = BANCO;
  const altoParal = estante.tablas[2] + 0.22;
  return (
    <group>
      {/* el piso de tierra pisada */}
      <mesh position={[0, -0.02, 0.6]} material={matPiso}>
        <boxGeometry args={[piso.ancho, 0.04, piso.fondo]} />
      </mesh>
      {/* la pared encalada */}
      <mesh position={[0, pared.alto / 2, pared.z - 0.07]} material={matCal}>
        <boxGeometry args={[pared.ancho, pared.alto, 0.14]} />
      </mesh>
      {/* el zócalo de tierra que toda pared de tapia luce */}
      <mesh position={[0, 0.14, pared.z + 0.005]} material={matPiso}>
        <boxGeometry args={[pared.ancho, 0.28, 0.02]} />
      </mesh>
      {/* los dos parales */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[estante.x + (s * estante.ancho) / 2, altoParal / 2, estante.z]} material={matParal}>
          <cylinderGeometry args={[0.045, 0.055, altoParal, 7]} />
        </mesh>
      ))}
      {/* las tres tablas */}
      {estante.tablas.map((y) => (
        <mesh key={y} position={[estante.x, y - estante.grosorTabla / 2, estante.z]} material={matTabla}>
          <boxGeometry args={[estante.ancho + 0.18, estante.grosorTabla, estante.fondoTabla]} />
        </mesh>
      ))}
      {/* la viga de colgar */}
      <mesh position={[0, viga.y, viga.z]} material={matParal}>
        <boxGeometry args={[viga.largo, 0.09, 0.09]} />
      </mesh>
      <SombraContacto pos={[estante.x, 0, estante.z + 0.1]} r={1.7} opacidad={0.14} />
    </group>
  );
}

/* ── UN FRASCO: vidrio lathe + la masa de semillas adentro + tapa/ceniza. ── */
function Frasco({ pos, alto, radio, rotY = 0, color, matVidrio, seg, conCorcho = true, conCeniza = false }) {
  const relleno = useMemo(() => new THREE.Color(color).multiplyScalar(0.86), [color]);
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      {/* la masa de semillas (el color de la herencia, leído de lejos) */}
      <mesh position={[0, alto * 0.28, 0]}>
        <cylinderGeometry args={[radio * 0.68, radio * 0.6, alto * 0.52, seg]} />
        <meshLambertMaterial color={relleno} flatShading />
      </mesh>
      {/* la capa de ceniza que guarda (solo el frasco curado) */}
      {conCeniza && (
        <mesh position={[0, alto * 0.575, 0]}>
          <cylinderGeometry args={[radio * 0.66, radio * 0.68, 0.035, seg]} />
          <meshLambertMaterial color={TINTES_BANCO.ceniza} />
        </mesh>
      )}
      {/* el vidrio */}
      <mesh material={matVidrio} renderOrder={2}>
        <latheGeometry args={[puntosLathe(PERFIL_FRASCO, alto, radio), seg]} />
      </mesh>
      {/* el corcho / la tapa de totumo */}
      {conCorcho && (
        <mesh position={[0, alto + 0.018, 0]}>
          <cylinderGeometry args={[radio * 0.5, radio * 0.44, 0.05, seg]} />
          <meshLambertMaterial color={TINTES_BANCO.corcho} flatShading />
        </mesh>
      )}
    </group>
  );
}

/* ── TODAS las semillas visibles: UN InstancedMesh (color por instancia). ── */
function SemillasInstanciadas({ items }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.SphereGeometry(1, 7, 5), []);
  const mat = useMemo(() => new THREE.MeshLambertMaterial({ color: '#ffffff' }), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const eu = new THREE.Euler();
    for (let i = 0; i < items.length; i += 1) {
      const s = items[i];
      q.setFromEuler(eu.set(0, s.rotY, 0));
      m.compose(s.pos, q, s.escala);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, s.color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [items]);
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  if (!items.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, items.length]} frustumCulled={false} />;
}

/* ── Las PINTAS del cargamanto (tier alto): motas sobre el grano moteado. ── */
function PintasInstanciadas({ items }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.SphereGeometry(1, 5, 4), []);
  const mat = useMemo(() => new THREE.MeshLambertMaterial({ color: '#ffffff' }), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    for (let i = 0; i < items.length; i += 1) {
      const p = items[i];
      s.setScalar(p.escala);
      m.compose(p.pos, q, s);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, p.color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [items]);
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  if (!items.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, items.length]} frustumCulled={false} />;
}

/* ── Los CALABAZOS curados, colgados de la viga con su fique. Se mecen
      apenas (solo si el movimiento está permitido): aire de casa viva. ── */
function Calabazos({ seg, reducedMotion }) {
  const ref = useRef(null);
  useFrame((st) => {
    const g = ref.current;
    if (!g || reducedMotion) return;
    const t = st.clock.elapsedTime;
    for (let i = 0; i < g.children.length; i += 1) {
      g.children[i].rotation.z = Math.sin(t * 0.5 + i * 1.7) * 0.022;
    }
  });
  const { viga, calabazos } = BANCO;
  return (
    <group ref={ref}>
      {calabazos.map((c, i) => {
        const radio = c.alto * 0.42;
        return (
          /* el pivote es el punto de amarre en la viga: el vaivén es péndulo */
          <group key={c.x} position={[c.x, viga.y - 0.04, viga.z]}>
            <mesh position={[0, -c.cuelga / 2, 0]}>
              <cylinderGeometry args={[0.008, 0.008, c.cuelga, 5]} />
              <meshLambertMaterial color={TINTES_BANCO.fique} />
            </mesh>
            <group position={[0, -c.cuelga - c.alto, 0]}>
              <mesh>
                <latheGeometry args={[puntosLathe(PERFIL_CALABAZO, c.alto, radio), seg]} />
                <meshLambertMaterial color={TINTES_BANCO.calabazo} flatShading={i !== 1} />
              </mesh>
              {/* el nudo de fique en el cuello */}
              <mesh position={[0, c.alto * 0.92, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[c.alto * 0.1, 0.014, 5, 8]} />
                <meshLambertMaterial color={TINTES_BANCO.fique} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
}

/* ── El COSTAL de fique: panzudo, amarrado, con sus franjas tejidas. ── */
function CostalFique({ seg }) {
  const { pos, alto } = BANCO.costal;
  const radio = alto * 0.55;
  return (
    <group position={pos}>
      <mesh>
        <latheGeometry args={[puntosLathe(PERFIL_COSTAL, alto, radio), seg]} />
        <meshLambertMaterial color={TINTES_BANCO.fique} flatShading />
      </mesh>
      {/* las franjas del tejido (el ritmo del textil, a cucharadas) */}
      {[
        { y: 0.3, k: 0.985, color: ACENTOS.indigo },
        { y: 0.46, k: 0.94, color: ACENTOS.cochinilla },
      ].map((f) => (
        <mesh key={f.y} position={[0, alto * f.y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radio * f.k * 0.97, 0.013, 5, seg]} />
          <meshLambertMaterial color={f.color} />
        </mesh>
      ))}
      {/* el amarre de la boca */}
      <mesh position={[0, alto * 0.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radio * 0.24, 0.018, 5, 8]} />
        <meshLambertMaterial color={NEUTROS.tinta} />
      </mesh>
      <SombraContacto pos={[0, 0, 0]} r={radio * 1.15} />
    </group>
  );
}

/* ── La VASIJA DE CHAMBA: barro negro brillado (guarda fresca la semilla).
      En tier alto es Standard con brillo de bruñido; frugal, Lambert. ── */
function VasijaChamba({ perfil, seg }) {
  const { pos, alto } = BANCO.chamba;
  const mat = useMemo(
    () => (perfil.materialRico
      ? new THREE.MeshStandardMaterial({ color: TINTES_BANCO.chamba, roughness: 0.38, metalness: 0.06 })
      : new THREE.MeshLambertMaterial({ color: TINTES_BANCO.chamba })),
    [perfil],
  );
  useLayoutEffect(() => () => mat.dispose(), [mat]);
  return (
    <group position={pos}>
      <mesh material={mat}>
        <latheGeometry args={[puntosLathe(PERFILES_VASIJA.cantaro, alto, alto * 0.5), seg]} />
      </mesh>
      <SombraContacto pos={[0, 0, 0]} r={alto * 0.42} />
    </group>
  );
}

/* ── Un CANASTO de rollo: tronco de cono + los aros del enrollado. ── */
function Canasto({ pos, seg }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.16, 0.115, 0.18, seg, 1, true]} />
        <meshLambertMaterial color={PALETA.maderaClara} flatShading side={THREE.DoubleSide} />
      </mesh>
      {/* el fondo del canasto (para que no se vea hueco) */}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.115, seg]} />
        <meshLambertMaterial color={PALETA.maderaClara} />
      </mesh>
      {/* los rollos del tejido: aros que suben */}
      {[0.05, 0.12, 0.18].map((y, i) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.118 + i * 0.02, 0.014, 5, seg]} />
          <meshLambertMaterial color={PALETA.madera} />
        </mesh>
      ))}
      <SombraContacto pos={[0, 0, 0]} r={0.2} />
    </group>
  );
}

/* ── El PARCHE de la MATA MADRE: la mejor mata se escoge VIVA, en el lote,
      y se marca con la cinta ANTES de cosechar. Ese gesto es todo. ── */
function MataMaiz({ mata, reducedMotion }) {
  const cintaRef = useRef(null);
  useFrame((st) => {
    const c = cintaRef.current;
    if (!c || reducedMotion) return;
    const t = st.clock.elapsedTime;
    c.rotation.y = Math.sin(t * 1.3) * 0.3;
    c.rotation.x = Math.sin(t * 0.9 + 1) * 0.12;
  });
  const verde = mata.madre ? VERDES.trabajo : mezclar(VERDES.trabajo, TIERRAS.pajonal, 0.35);
  const hojas = mata.madre ? 4 : 3;
  return (
    <group position={[mata.x, 0, mata.z]} rotation={[0, 0, mata.lean]}>
      {/* la caña */}
      <mesh position={[0, mata.alto / 2, 0]}>
        <cylinderGeometry args={[0.02, 0.034, mata.alto, 6]} />
        <meshLambertMaterial color={verde} />
      </mesh>
      {/* las hojas: cintas que salen y caen */}
      {Array.from({ length: hojas }, (_, i) => {
        const a = (i / hojas) * Math.PI * 2 + (mata.madre ? 0.4 : 0);
        const hy = mata.alto * (0.35 + 0.16 * i);
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.09, hy, Math.sin(a) * 0.09]}
            rotation={[Math.sin(a) * 1.1, -a, Math.cos(a) * 1.1]}
          >
            <coneGeometry args={[0.035, mata.alto * 0.55, 4]} />
            <meshLambertMaterial color={verde} flatShading />
          </mesh>
        );
      })}
      {/* la espiga */}
      <mesh position={[0, mata.alto + 0.06, 0]}>
        <coneGeometry args={[0.025, 0.16, 5]} />
        <meshLambertMaterial color={mezclar(verde, ACENTOS.maizGrano, 0.55)} flatShading />
      </mesh>
      {mata.madre && (
        <>
          {/* la mazorca que carga parejo */}
          <group position={[0.055, mata.alto * 0.52, 0.02]} rotation={[0, 0, -0.35]}>
            <mesh scale={[0.045, 0.1, 0.045]}>
              <sphereGeometry args={[1, 7, 6]} />
              <meshLambertMaterial color={ACENTOS.maizGrano} flatShading />
            </mesh>
            <mesh position={[0, -0.05, 0]} rotation={[0, 0, 0.25]}>
              <coneGeometry args={[0.035, 0.12, 4]} />
              <meshLambertMaterial color={verde} flatShading />
            </mesh>
          </group>
          {/* LA CINTA: el nudo y las dos colas que el viento mueve */}
          <group position={[0, mata.alto * 0.68, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.032, 0.011, 5, 8]} />
              <meshLambertMaterial color={TINTES_BANCO.cinta} />
            </mesh>
            <group ref={cintaRef}>
              {[-0.2, 0.55].map((rz) => (
                <mesh key={rz} position={[0.035, -0.055, 0]} rotation={[0, 0, rz]}>
                  <boxGeometry args={[0.022, 0.11, 0.006]} />
                  <meshLambertMaterial color={TINTES_BANCO.cinta} side={THREE.DoubleSide} />
                </mesh>
              ))}
            </group>
          </group>
        </>
      )}
    </group>
  );
}

function ParcheMataMadre({ matas, reducedMotion }) {
  const { pos, radio } = BANCO.parche;
  return (
    <group>
      <mesh position={[pos[0], 0.028, pos[2]]}>
        <cylinderGeometry args={[radio, radio * 1.06, 0.06, 12]} />
        <meshLambertMaterial color={TIERRAS.siembra} flatShading />
      </mesh>
      {matas.map((m) => (
        <MataMaiz key={`${m.x}-${m.z}`} mata={m} reducedMotion={reducedMotion} />
      ))}
      <SombraContacto pos={pos} r={radio * 1.05} opacidad={0.12} />
    </group>
  );
}

/* ── El GORGOJO: el enemigo del guardado, rubber-hose y chiquito. Ronda el
      frasco curado con ceniza, se arrima, no puede entrar, y sigue rondando.
      Sin terror: es la comedia del bicho que se quedó por fuera. ── */
function Gorgojo({ reducedMotion }) {
  const ref = useRef(null);
  const fc = BANCO.frascoCeniza;
  useFrame((st) => {
    const g = ref.current;
    if (!g) return;
    const t = reducedMotion ? 1.2 : st.clock.elapsedTime;
    const ang = t * 0.42;
    /* se arrima y se retira tres veces por vuelta (huele, no alcanza) */
    const cerca = 0.5 + 0.5 * Math.sin(ang * 3);
    const rad = fc.radio + 0.3 - cerca * 0.13;
    g.position.set(fc.pos[0] + Math.cos(ang) * rad, 0.045, fc.pos[2] + Math.sin(ang) * rad);
    g.rotation.y = -ang - Math.PI / 2 + (reducedMotion ? 0 : Math.sin(t * 7) * 0.12 * cerca);
    if (!reducedMotion) {
      const paso = 1 + Math.abs(Math.sin(t * 8)) * 0.06;
      g.scale.set(1, paso, 1); // el trotecito
    }
  });
  const tinte = TINTES_BANCO.gorgojo;
  return (
    <group ref={ref} scale={1}>
      {/* cuerpo y cabeza */}
      <mesh scale={[0.05, 0.042, 0.062]}>
        <sphereGeometry args={[1, 7, 6]} />
        <meshLambertMaterial color={tinte} flatShading />
      </mesh>
      <mesh position={[0, 0.012, 0.062]} scale={[0.026, 0.024, 0.028]}>
        <sphereGeometry args={[1, 6, 5]} />
        <meshLambertMaterial color={tinte} />
      </mesh>
      {/* el pico de gorgojo (su firma) con terminal redonda rubber-hose */}
      <mesh position={[0, 0.004, 0.1]} rotation={[Math.PI / 2 - 0.35, 0, 0]}>
        <cylinderGeometry args={[0.005, 0.007, 0.05, 5]} />
        <meshLambertMaterial color={tinte} />
      </mesh>
      <mesh position={[0, -0.004, 0.122]}>
        <sphereGeometry args={[0.009, 5, 4]} />
        <meshLambertMaterial color={tinte} />
      </mesh>
      {/* ojos de hueso (la mirada golosa) */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.016, 0.03, 0.07]}>
          <sphereGeometry args={[0.008, 5, 4]} />
          <meshLambertMaterial color={NEUTROS.hueso} />
        </mesh>
      ))}
      {/* antenas con bolita (terminales redondas SIEMPRE) */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.014, 0.03, 0.085]} rotation={[0.5, 0, s * 0.7]}>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.0035, 0.0035, 0.04, 4]} />
            <meshLambertMaterial color={tinte} />
          </mesh>
          <mesh position={[0, 0.045, 0]}>
            <sphereGeometry args={[0.008, 5, 4]} />
            <meshLambertMaterial color={tinte} />
          </mesh>
        </group>
      ))}
      {/* paticas: seis muñones de trote */}
      {[-1, 1].map((s) => (
        [0.03, 0, -0.03].map((z) => (
          <mesh key={`${s}-${z}`} position={[s * 0.042, -0.03, z]} rotation={[0, 0, s * 0.5]}>
            <cylinderGeometry args={[0.006, 0.006, 0.03, 4]} />
            <meshLambertMaterial color={tinte} />
          </mesh>
        ))
      ))}
    </group>
  );
}

/* ── Un FLUJO de semillas viajando por su curva (InstancedMesh chiquito).
      Con reducedMotion las semillas quedan quietas, repartidas a lo largo:
      el camino se LEE aunque nada se mueva. ── */
function FlujoSemillas({ flujo, particulas, reducedMotion }) {
  const ref = useRef(null);
  const geo = useMemo(() => new THREE.SphereGeometry(0.026, 6, 5), []);
  const mat = useMemo(() => new THREE.MeshLambertMaterial({ color: flujo.color }), [flujo.color]);
  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3() }),
    [],
  );
  useLayoutEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  const escribir = (time) => {
    const mesh = ref.current;
    if (!mesh) return;
    const { m, q, s, p } = tmp;
    for (let i = 0; i < particulas.length; i += 1) {
      const pa = particulas[i];
      let t = reducedMotion ? pa.t0 : pa.t0 + time * pa.vel;
      t -= Math.floor(t);
      flujo.curva.getPoint(t, p);
      /* nace del origen, vuela y se ENTREGA en el destino */
      s.setScalar(pa.tam * (0.4 + Math.sin(t * Math.PI) * 0.7));
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => { escribir(0); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [particulas, flujo]);
  useFrame((st) => { if (!reducedMotion) escribir(st.clock.elapsedTime); });
  if (!particulas.length) return null;
  return <instancedMesh ref={ref} args={[geo, mat, particulas.length]} frustumCulled={false} />;
}

/* ── El SURCO con sus brotes (la criolla nace) y la BOLSA certificada al
      lado — digna, sin burla: la diferencia se muestra, no se sermonea. ── */
function SurcoYBolsa({ brotes, perfil }) {
  const matTierra = useMaterialMadre('tierra', perfil);
  const { surco, bolsa } = BANCO;
  return (
    <group>
      <mesh position={[surco.pos[0], 0.05, surco.pos[2]]} rotation={[0, 0.5, 0]} material={matTierra}>
        <boxGeometry args={[surco.largo, 0.1, surco.ancho]} />
      </mesh>
      {brotes.map((b) => (
        <group key={`${b.x}`} position={[b.x, 0.1, b.z]} rotation={[0, b.rot, 0]}>
          {[-0.5, 0.5].map((rz) => (
            <mesh key={rz} position={[rz * 0.02, b.alto / 2, 0]} rotation={[0, 0, rz]}>
              <coneGeometry args={[0.014, b.alto, 4]} />
              <meshLambertMaterial color={VERDES.brote} flatShading />
            </mesh>
          ))}
        </group>
      ))}
      {/* la bolsa de semilla certificada: existe, sirve a veces, y de ella
          no se guarda semilla — eso es todo lo que la escena dice */}
      <group position={bolsa.pos} rotation={[0, -0.4, 0.05]}>
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[0.17, 0.3, 0.09]} />
          <meshLambertMaterial color={TINTES_BANCO.bolsa} />
        </mesh>
        <mesh position={[0, 0.19, 0]}>
          <boxGeometry args={[0.175, 0.07, 0.095]} />
          <meshLambertMaterial color={PALETA.ambar} />
        </mesh>
        <mesh position={[0, 0.305, 0]} rotation={[0, 0, 0.1]}>
          <boxGeometry args={[0.16, 0.02, 0.06]} />
          <meshLambertMaterial color={TINTES_BANCO.bolsa} />
        </mesh>
        <SombraContacto pos={[0, 0, 0]} r={0.13} />
      </group>
    </group>
  );
}

/* Un hotspot 3D → burbuja tocable anclada en el mundo (contrato del host). */
function Hotspot({ pos, label, onClick }) {
  return (
    <Html position={pos} center zIndexRange={[30, 10]} className="bsem-hot">
      <button type="button" className="bsem-hot__btn" onClick={onClick} aria-label={label}>
        <span className="bsem-hot__pt" aria-hidden="true" />
        <span>{label}</span>
      </button>
    </Html>
  );
}

function Mundo({ tier, reducedMotion, hotspots, onHotspot }) {
  const perfil = perfilDeTier(tier);
  const P = paramsDeSemillas(tier);

  /* el cielo de FAMILIA tierra, mezclado 60% hacia la madre (ley de la casa) */
  const cielo = useMemo(() => mezclarCielo(CIELOS.tierra), []);

  /* vidrio compartido por todos los frascos (un solo material) */
  const matVidrio = useMemo(
    () => new THREE.MeshLambertMaterial({
      color: TINTES_BANCO.vidrio,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    [],
  );
  useLayoutEffect(() => () => matVidrio.dispose(), [matVidrio]);

  /* datos del banco (una vez por tier) */
  const datos = useMemo(() => {
    const frascos = distribuirFrascos(VARIEDADES);
    const { semillas, pintas } = semillasDelBanco(frascos, VARIEDADES, P);
    const flujos = P.particulasFlujo > 0 ? flujosDelBanco(VARIEDADES) : [];
    const particulas = flujos.map((f, i) => particulasDeFlujo(P.particulasFlujo, 41 + i * 13));
    return { frascos, semillas, pintas, flujos, particulas, matas: matasDelParche(), brotes: brotesDelSurco() };
  }, [P]);

  const spots = hotspots || HOTSPOTS_BANCO;
  const fc = BANCO.frascoCeniza;
  const fcr = BANCO.frascoCriollo;

  return (
    <>
      <color attach="background" args={[cielo.fondo]} />
      {perfil.fog && <fog attach="fog" args={[cielo.niebla, 10, 24]} />}
      <LuzMadre cielo={CIELOS.tierra} perfil={perfil} />

      <Troja perfil={perfil} />

      {/* EL MOSAICO: cada frasco una herencia */}
      {datos.frascos.map((f) => (
        <Frasco
          key={f.variedad.id}
          pos={f.pos}
          alto={f.alto}
          radio={f.radio}
          rotY={f.rotY}
          color={f.variedad.color}
          matVidrio={matVidrio}
          seg={P.segLathe}
        />
      ))}
      <SemillasInstanciadas items={datos.semillas} />
      {P.pintas && <PintasInstanciadas items={datos.pintas} />}

      {/* el guardado: calabazos, costal, chamba */}
      <Calabazos seg={P.segLathe} reducedMotion={reducedMotion} />
      <CostalFique seg={P.segLathe} />
      <VasijaChamba perfil={perfil} seg={P.segLathe} />

      {/* el frasco curado con ceniza… y el gorgojo que se quedó por fuera */}
      <Frasco
        pos={fc.pos}
        alto={fc.alto}
        radio={fc.radio}
        color={VARIEDADES[5].color}
        matVidrio={matVidrio}
        seg={P.segLathe}
        conCorcho={false}
        conCeniza
      />
      <SombraContacto pos={fc.pos} r={fc.radio * 1.4} />
      {P.gorgojo && <Gorgojo reducedMotion={reducedMotion} />}

      {/* el ciclo criollo: el frasco que siembra y la cosecha que vuelve */}
      <Frasco
        pos={fcr.pos}
        alto={fcr.alto}
        radio={fcr.radio}
        color={VARIEDADES[0].color}
        matVidrio={matVidrio}
        seg={P.segLathe}
        conCorcho={false}
      />
      <SombraContacto pos={fcr.pos} r={fcr.radio * 1.4} />
      <SurcoYBolsa brotes={datos.brotes} perfil={perfil} />

      {/* el trueque: dos canastos de vecinos, dos variedades que se cruzan */}
      <Canasto pos={BANCO.canastoA.pos} seg={P.segLathe} />
      <Canasto pos={BANCO.canastoB.pos} seg={P.segLathe} />

      {datos.flujos.map((f, i) => (
        <FlujoSemillas key={f.id} flujo={f} particulas={datos.particulas[i]} reducedMotion={reducedMotion} />
      ))}

      {/* la mata madre, marcada VIVA en el lote */}
      <ParcheMataMadre matas={datos.matas} reducedMotion={reducedMotion} />

      {spots.map((h) => (
        <Hotspot key={h.id} pos={h.pos} label={h.label} onClick={() => onHotspot?.(h.view, h.data)} />
      ))}

      <OrbitControls
        makeDefault
        target={[0.2, 1.15, -0.7]}
        enablePan={false}
        enableZoom
        minDistance={3.2}
        maxDistance={9}
        minPolarAngle={0.55}
        maxPolarAngle={1.52}
        minAzimuthAngle={-1.05}
        maxAzimuthAngle={1.05}
        enableDamping
        dampingFactor={0.08}
      />
      <AdaptiveDpr pixelated />
    </>
  );
}

/**
 * El mundo Banco de Semillas Criollas. Montar SOLO perezoso dentro de un host
 * con altura. Acepta el contrato del framework de mundos (props extra
 * ignoradas); sin `hotspots` usa los HOTSPOTS_BANCO por defecto.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean, hotspots?: Array, onHotspot?: Function}} props
 */
export default function EscenaBancoSemillas({ tier = 'alto', reducedMotion = false, hotspots, onHotspot }) {
  const [listo, setListo] = useState(false);
  const dpr = tier === 'alto' ? [1, 1.8] : tier === 'medio' ? [1, 1.3] : 1;
  return (
    <>
      <style>{CSS}</style>
      <Canvas
        className={`bsem-canvas${listo ? ' bsem-canvas--lista' : ''}`}
        dpr={dpr}
        gl={{ antialias: tier === 'alto', powerPreference: 'high-performance' }}
        camera={{ position: [0.7, 1.9, 6.3], fov: 44 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
        onCreated={() => setListo(true)}
      >
        <Mundo tier={tier} reducedMotion={reducedMotion} hotspots={hotspots} onHotspot={onHotspot} />
      </Canvas>
    </>
  );
}
