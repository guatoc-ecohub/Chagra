/*
 * EscenaInvernaderoVivo — el MICRO-MUNDO del INVERNADERO campesino: un lugar
 * donde SE ENTRA, no una postal.
 *
 * Un túnel de guadua y plástico plantado en un claro de la finca, con la
 * puerta mirando al espectador. La cámara LLEGA por el caminito (CamaraDirector,
 * dolly de establishing) y el usuario ENTRA de verdad: el orbit tiene su target
 * ADENTRO del túnel y deja acercarse hasta quedar entre las camas — recorrer el
 * pasillo es hacer zoom por el vano de la puerta.
 *
 * Adentro el aire se siente: el plástico vela la luz (material translúcido,
 * DoubleSide), el VAHO flota en capas bajas que derivan despacio, y la
 * CONDENSACIÓN GOTEA del techo — gotas que caen del arco al sustrato, el ciclo
 * del agua en chiquito que todo invernadero fabrica. Los brotes de la mesa de
 * almácigo RESPIRAN (FloraInvernadero). La atmósfera es la del kit compartido
 * (familia `corral`): el invernadero amanece, dora y anochece CON el valle.
 *
 * Todo procedural (cero CDN/GLTF/imágenes). Tier-safe vía `perfilDeTier`:
 * 'alto' con sombras + vaho + goteo; 'medio' frugal (goteo corto, sin vaho);
 * 'bajo' mínimo y QUIETO. Con `reducedMotion` monta quieto (frameloop demand):
 * fotograma digno, cero vibración.
 *
 * `foco` (opcional): un punto [x,y,z] que el paso didáctico del host señala
 * con un anillo que respira. Importa three/@react-three → montar SOLO perezosa.
 */
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { perfilDeTier } from '../deviceTier.js';
import { Fauna } from '../escenas/FaunaEscena.jsx';
import FloraInvernadero from './FloraInvernadero.jsx';
import {
  ANCHO,
  FONDO,
  INV,
  alturaInvernadero,
  invernaderoDeTier,
  geomEstructura,
  geomPlastico,
  geomCamas,
  geomRiego,
} from './invernadero.geom.js';
import {
  AtmosferaMundo,
  DomoCielo,
  useAtmosferaMundo,
  useGradienteBandas,
  construirTerreno,
  ruidoTerreno,
  smoothstep,
  CamaraDirector,
} from '../kit/index.js';
import { mezclar, VERDES, TIERRAS, NIEBLAS, LUCES } from '../paleta/index.js';

/* La identidad del lugar dentro de la familia del valle: `corral` (patio de
   trabajo de la finca). El 60% restante lo pone la HORA. */
const FAMILIA_INVERNADERO = 'corral';

/* Escala de la escena para el kit (cámara↔centro ~10). */
const RADIO_INVERNADERO = 10;

/* El frustum de sombra a medida del claro. */
const SOMBRA_INVERNADERO = { left: -10, right: 10, top: 12, bottom: -6, far: 36 };

/* El claro de la finca: pasto afuera, y ADENTRO el piso de tierra húmeda del
   túnel con su pasillo pisado — el suelo cuenta dónde empieza el microclima. */
function construirClaro(seg, plano) {
  const cPasto = new THREE.Color(VERDES.brote);
  const cPasto2 = new THREE.Color(VERDES.calido);
  const cHumedo = new THREE.Color(mezclar(TIERRAS.turba, TIERRAS.mantilloSombra, 0.5));
  const cPasillo = new THREE.Color(mezclar(TIERRAS.camino, TIERRAS.turba, 0.45));
  const cCamino = new THREE.Color(mezclar(TIERRAS.camino, TIERRAS.vega, 0.35));
  return construirTerreno({
    ancho: ANCHO,
    fondo: FONDO,
    seg,
    plano,
    altura: alturaInvernadero,
    pintar: (wx, wz, alt, c) => {
      c.lerpColors(cPasto, cPasto2, 0.5 + 0.5 * ruidoTerreno(wx * 0.8, wz * 0.7));
      // ADENTRO del túnel: tierra oscura y húmeda (el microclima en el suelo)
      const dentro =
        smoothstep(INV.radio + 0.5, INV.radio - 0.3, Math.abs(wx)) *
        smoothstep(INV.largo / 2 + 0.7, INV.largo / 2 - 0.4, Math.abs(wz));
      c.lerp(cHumedo, dentro * 0.92);
      // el pasillo central pisado, de la puerta al fondo
      c.lerp(cPasillo, dentro * smoothstep(0.75, 0.3, Math.abs(wx)) * 0.85);
      // el caminito que llega a la puerta desde el frente
      const enCamino =
        smoothstep(0.95, 0.25, Math.abs(wx - Math.sin(wz * 0.35) * 0.7)) *
        smoothstep(INV.largo / 2 - 0.5, INV.largo / 2 + 2, wz);
      c.lerp(cCamino, enCamino * 0.8);
    },
  });
}

/* EL VAHO: capas bajas de niebla tibia que derivan despacio entre las camas.
   Discos aditivos casi transparentes — humedad, no humo. Solo gama alta;
   con reducedMotion quedan quietos (presencia sin vaivén). */
function VahoHumedad({ n, reducedMotion }) {
  const grupo = useRef(null);
  const capas = useMemo(() => {
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({
        x: -1.6 + (i % 3) * 1.6,
        y: 0.55 + (i % 2) * 0.5 + i * 0.08,
        z: -4.6 + i * 2.1,
        r: 1.5 + (i % 3) * 0.6,
        fase: i * 1.7,
        op: 0.05 + (i % 2) * 0.025,
      });
    }
    return out;
  }, [n]);

  useFrame(({ clock }) => {
    const g = grupo.current;
    if (reducedMotion || !g) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < g.children.length; i++) {
      const m = g.children[i];
      const d = capas[i];
      m.position.x = d.x + 0.35 * Math.sin(t * 0.11 + d.fase);
      m.position.z = d.z + 0.28 * Math.cos(t * 0.09 + d.fase * 1.3);
      m.material.opacity = d.op * (0.6 + 0.4 * Math.sin(t * 0.23 + d.fase));
    }
  });

  if (!n) return null;
  return (
    <group ref={grupo}>
      {capas.map((d, i) => (
        <mesh key={i} position={[d.x, d.y, d.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[d.r, 12]} />
          <meshBasicMaterial
            color={NIEBLAS.lechosa}
            transparent
            opacity={d.op}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/* LA CONDENSACIÓN QUE GOTEA: gotas que caen del arco del techo al sustrato,
   en bucle determinista. Un InstancedMesh chiquito (≤10 esferas estiradas);
   con reducedMotion no se monta (el vaho quieto ya cuenta la humedad). */
function GoteoCondensacion({ n, reducedMotion }) {
  const ref = useRef(null);
  const gotas = useMemo(() => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const x = -2.4 + (i * 4.8) / Math.max(1, n - 1) + ((i * 7) % 3) * 0.22 - 0.22;
      const z = -5.6 + ((i * 3.7) % 11);
      const dxr = Math.min(Math.abs(x), INV.radio - 0.05);
      const yTecho = INV.arranque + INV.aplaste * Math.sqrt(INV.radio * INV.radio - dxr * dxr) - 0.08;
      out.push({ x, z, yTecho, caida: yTecho - 0.45, vel: 0.9 + (i % 3) * 0.28, fase: i * 0.61 });
    }
    return out;
  }, [n]);
  const util = useMemo(() => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), s: new THREE.Vector3() }), []);

  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    const { m, p, s } = util;
    for (let i = 0; i < gotas.length; i++) {
      const d = gotas[i];
      const frac = (t * d.vel + d.fase) % 1.6; // cuelga un momento y cae
      const cayendo = Math.max(0, frac - 0.6);
      const y = d.yTecho - d.caida * cayendo;
      p.set(d.x, y, d.z);
      s.set(0.6, cayendo > 0 ? 1.6 : 0.7, 0.6); // la gota se estira al caer
      m.compose(p, IDENTIDAD_Q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!n || reducedMotion) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]} frustumCulled={false}>
      <sphereGeometry args={[0.022, 5, 4]} />
      <meshBasicMaterial color={NIEBLAS.lechosa} transparent opacity={0.55} depthWrite={false} />
    </instancedMesh>
  );
}
const IDENTIDAD_Q = new THREE.Quaternion();

/* El anillo del paso didáctico: respira sobre el punto que la lección señala.
   Con reducedMotion queda quieto (presencia sin parpadeo). */
function FocoPaso({ foco, reducedMotion }) {
  const anillo = useRef(null);
  useFrame(({ clock }) => {
    const m = anillo.current;
    if (!m) return;
    if (reducedMotion) {
      m.material.opacity = 0.42;
      return;
    }
    const t = clock.elapsedTime;
    m.material.opacity = 0.3 + 0.2 * Math.sin(t * 1.8);
    m.scale.setScalar(1 + 0.06 * Math.sin(t * 1.8));
  });
  if (!foco) return null;
  return (
    <mesh ref={anillo} position={[foco[0], foco[1] + 0.1, foco[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.55, 0.78, 28]} />
      <meshBasicMaterial
        color={LUCES.candela}
        transparent
        opacity={0.4}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* La vida que ronda el invernadero: la mariposa que entra por la puerta hacia
   las matas, otra entre las camas y el colibrí que ronda la era de afuera.
   Pocas y por criterio (vida, no enjambre). */
const FAUNA_INVERNADERO = [
  { tipo: 'mariposa', base: [0.5, 1.4, 5.2], patron: 'revoloteo', size: 24, fase: 0.6, df: 9 },
  { tipo: 'mariposa', base: [-1.2, 1.1, -1.8], patron: 'revoloteo', size: 20, fase: 2.1, df: 9 },
  { tipo: 'colibri', base: [4.1, 1.4, 5.2], patron: 'revoloteo', size: 28, fase: 1.2, df: 10 },
];

function Diorama({ tier, reducedMotion, foco }) {
  const perfil = perfilDeTier(tier);
  const conteos = useMemo(() => invernaderoDeTier(tier), [tier]);

  /* La atmósfera VIVA del kit (cambia por franja horaria del valle). */
  const atm = useAtmosferaMundo({ familia: FAMILIA_INVERNADERO, reducedMotion });

  /* El gradiente de bandas (toma B): terreno y montes comparten escalones. */
  const bandas = useGradienteBandas();

  const geoClaro = useMemo(
    () => construirClaro(perfil.segmentosTerreno, perfil.flatShading),
    [perfil.segmentosTerreno, perfil.flatShading],
  );

  /* Las piezas fusionadas del lugar (una draw-call cada una). */
  const geoEstructura = useMemo(() => geomEstructura(), []);
  const geoPlastico = useMemo(() => geomPlastico(), []);
  const geoCamas = useMemo(() => geomCamas(), []);
  const geoRiego = useMemo(() => geomRiego(), []);

  /* El material del PLÁSTICO: lechoso, translúcido, con un lustre apenas —
     la luz del valle entra VELADA y el túnel se ve de afuera y de adentro. */
  const matPlastico = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: NIEBLAS.lechosa,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false,
        shininess: 70,
        specular: new THREE.Color('#fff6e2'),
      }),
    [],
  );

  /* Los montes del fondo, comidos por la niebla de la hora. */
  const montes = useMemo(
    () => ({
      cerca: mezclar(VERDES.monte, atm.niebla, 0.22),
      lejos: mezclar(VERDES.monte, atm.niebla, 0.36),
    }),
    [atm.niebla],
  );

  const fauna = useMemo(
    () => (tier === 'alto' ? FAUNA_INVERNADERO : FAUNA_INVERNADERO.slice(0, 2)),
    [tier],
  );

  const controls = useRef(null);

  return (
    <>
      {/* LA ATMÓSFERA DEL KIT: fondo, niebla, luces y estrellas de LA HORA. */}
      <AtmosferaMundo
        familia={FAMILIA_INVERNADERO}
        tier={tier}
        reducedMotion={reducedMotion}
        radio={RADIO_INVERNADERO}
        conSuelo={false}
        sombra={SOMBRA_INVERNADERO}
      />

      {/* El domo de la toma B: gradiente cenit→horizonte + glow del sol. */}
      <DomoCielo atm={atm} radio={56} />

      {/* EL CLARO por bandas: pasto afuera, tierra húmeda adentro. */}
      <mesh geometry={geoClaro} receiveShadow={perfil.sombras}>
        <meshToonMaterial vertexColors gradientMap={bandas} />
      </mesh>

      {/* los montes del fondo */}
      <mesh position={[-11, 1.6, -19]} scale={[8, 3.6, 5]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshToonMaterial color={montes.lejos} gradientMap={bandas} />
      </mesh>
      <mesh position={[8, 2.0, -21]} scale={[10, 4.6, 6]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshToonMaterial color={montes.cerca} gradientMap={bandas} />
      </mesh>

      {/* LA ESTRUCTURA: guadua, arcos, puerta verde, mesa, tutores. */}
      <mesh geometry={geoEstructura} castShadow={perfil.sombras}>
        {perfil.materialRico ? (
          <meshStandardMaterial vertexColors flatShading={perfil.flatShading} roughness={0.85} metalness={0} />
        ) : (
          <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
        )}
      </mesh>

      {/* Las CAMAS con su tierra viva + la era de afuera. */}
      <mesh geometry={geoCamas} receiveShadow={perfil.sombras}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
      </mesh>

      {/* El RIEGO: la caneca azul, la manguera madre y las líneas de goteo. */}
      <mesh geometry={geoRiego}>
        <meshLambertMaterial vertexColors flatShading={perfil.flatShading} />
      </mesh>

      {/* LA VIDA sembrada: bandejas, brotes que respiran, bolsas, tomate,
          frutos madurando y la hortaliza. */}
      <FloraInvernadero tier={tier} reducedMotion={reducedMotion} />

      {/* EL AIRE DEL TÚNEL: vaho bajo (alto) + condensación que gotea. */}
      <VahoHumedad n={conteos.vaho} reducedMotion={reducedMotion} />
      <GoteoCondensacion n={conteos.gotas} reducedMotion={reducedMotion} />

      {/* EL PLÁSTICO al final (translúcido, no escribe depth): vela lo de
          adentro visto de afuera, y de adentro vela el cielo. */}
      <mesh geometry={geoPlastico} material={matPlastico} renderOrder={4} />

      {/* la vida que ronda: mariposas y el colibrí de la era */}
      {perfil.criaturas > 0 && <Fauna items={fauna} reducedMotion={reducedMotion} />}

      {/* el anillo del paso didáctico (lo maneja el host) */}
      <FocoPaso foco={foco} reducedMotion={reducedMotion} />

      {/* ENTRAR DE VERDAD: el target del orbit vive ADENTRO del túnel y el
          zoom llega hasta el pasillo (minDistance corto) — acercarse por la
          puerta ES recorrer el invernadero. */}
      <OrbitControls
        ref={controls}
        makeDefault
        target={[0, 1.2, 0.4]}
        enablePan={false}
        enableZoom
        minDistance={1.7}
        maxDistance={17}
        minPolarAngle={0.35}
        maxPolarAngle={1.5}
        enableDamping
        dampingFactor={0.08}
      />
      {/* La LLEGADA: dolly de establishing por el caminito hacia la puerta —
          entrar se siente como llegar caminando, una vez por sesión. */}
      <CamaraDirector
        controls={controls}
        reposo={[0.4, 1.9, 9.6]}
        mirada={[0, 1.35, 0.4]}
        respiro={0.04}
        activa={!reducedMotion && tier !== 'bajo'}
        unaVezClave="mundoInvernadero"
      />
      <AdaptiveDpr pixelated />
    </>
  );
}

/**
 * El micro-mundo del invernadero campesino. Montar SOLO perezosa (lazy).
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean, foco?: number[]|null}} props
 */
export default function EscenaInvernaderoVivo({ tier = 'alto', reducedMotion = false, foco = null }) {
  const perfil = perfilDeTier(tier);
  const [listo, setListo] = useState(false);
  return (
    <Canvas
      className={`invernadero-canvas${listo ? ' invernadero-canvas--lista' : ''}`}
      dpr={perfil.dpr}
      gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
      shadows={perfil.sombras ? 'soft' : false}
      camera={{ position: [0.4, 1.9, 9.6], fov: 50 }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      onCreated={() => setListo(true)}
    >
      <Diorama tier={tier} reducedMotion={reducedMotion} foco={foco} />
    </Canvas>
  );
}
