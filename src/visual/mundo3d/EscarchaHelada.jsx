/*
 * EscarchaHelada — la ESCARCHA DE HELADA RADIATIVA al amanecer, montable sobre
 * cualquier escena-mundo 3D.
 *
 * EL FENÓMENO (honesto, agroclimático real): en las noches DESPEJADAS de piso
 * frío/páramo, el suelo y las hojas irradian su calor al cielo abierto y se
 * enfrían POR DEBAJO de la temperatura del aire (enfriamiento radiativo). El
 * vapor se deposita como escarcha blanca. El aire frío es más denso y se ACUMULA
 * en las hondonadas: por eso la helada pega más fuerte en las partes bajas, y por
 * eso quema los cultivos de piso frío (papa, habas, arveja) justo al amanecer.
 * NO hay niebla: la noche despejada es la condición del fenómeno.
 *
 * LO QUE DIBUJA, en capas:
 *   1. Manto de escarcha — un blanqueo del suelo sesgado hacia el centro/bajo,
 *      guiño a que el aire frío se empoza en la hondonada.
 *   2. Cristales de hielo low-poly (octaedros instanciados) que se FORMAN
 *      escalonados del centro hacia afuera (la escarcha "crece" al enfriar).
 *   3. Destellos que la primera luz del amanecer arranca a los cristales.
 *   4. Una etiqueta educativa opcional que nombra el riesgo de helada.
 *
 * CÓMO SE MONTA (Opus lo cablea): es un componente R3F puro; va como CHILD dentro
 * del <Canvas> de una escena, junto al diorama —p.ej. dentro de EscenaBase3D—:
 *     <EscenaBase3D {...props}>
 *       <MiDiorama />
 *       <EscarchaHelada intensidad={0.8} tier={tier} reducedMotion={rm} />
 *     </EscenaBase3D>
 * Se posa sobre el plano `altura` (y del suelo de la escena) y cubre un disco de
 * radio `area`. NO toca luces ni cámara: solo añade geometría frugal encima.
 *
 * FRUGALIDAD (DR §6): sin sombras, sin post-proceso; MeshLambert/MeshBasic con
 * flatShading; los cristales en UN InstancedMesh; los destellos en UN Points.
 * Se degrada por `tier` (bajo = escarcha simple, sin destellos) y respeta
 * `reducedMotion` (estado final directo, sin animación de formación ni titileo).
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import './EscarchaHelada.css';

/* Presupuesto de geometría por tier. `bajo` es la "escarcha simple" del prompt:
   pocos cristales, un solo manto, sin destellos. */
const CONF = {
  alto: { cristales: 44, chispas: 130, mantoDoble: true },
  medio: { cristales: 24, chispas: 60, mantoDoble: true },
  bajo: { cristales: 10, chispas: 0, mantoDoble: false },
};

/* Paleta de hielo al alba: blanco muy frío con vena azul. */
const COLOR_MANTO = '#eef6ff';
const COLOR_CRISTAL = '#eaf3ff';
const EMISIVO_CRISTAL = '#31507a';

/* PRNG determinista (LCG) — mismo truco que EscenaEstratos: siembra reproducible
   sin dependencias. */
function hacerAzar(semilla) {
  let s = (semilla >>> 0) || 1;
  return () => {
    s = (s * 1103515245 + 12345) >>> 0;
    return s / 4294967296;
  };
}

const suavizar = (x) => x * x * (3 - 2 * x); // smoothstep 0..1

/* Textura de copo: un punto redondo suave (degradado radial). Sin ella los
   destellos serían cuadrados. Cliente-only; en SSR devuelve null. */
function crearTexturaCopo() {
  if (typeof document === 'undefined') return null;
  const s = 64;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(226,240,255,0.85)');
  g.addColorStop(1, 'rgba(226,240,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * @param {object} props
 * @param {number}  [props.intensidad=0.7]  0..1 — cuánta escarcha (opacidad del
 *   manto, tamaño de cristales y brillo de destellos). 0 = casi nada; 1 = helada
 *   fuerte.
 * @param {'alto'|'medio'|'bajo'} [props.tier='alto']  presupuesto de geometría
 *   (device-tier del framework). `bajo` = escarcha simple.
 * @param {boolean} [props.reducedMotion=false]  true → estado final directo, sin
 *   animación de formación ni titileo.
 * @param {number}  [props.area=3.2]  radio (en unidades de escena) que cubre.
 * @param {number}  [props.altura=0]  y del plano de suelo sobre el que se posa.
 * @param {[number,number,number]} [props.posicion=[0,0,0]]  desplazamiento del
 *   grupo completo (por si el suelo de la escena no está centrado).
 * @param {number}  [props.formacionSeg=5]  segundos de la formación (enfriamiento).
 * @param {number}  [props.semilla=7]  semilla del sembrado determinista.
 * @param {boolean} [props.etiqueta=true]  muestra el chip educativo del fenómeno.
 */
export default function EscarchaHelada({
  intensidad = 0.7,
  tier = 'alto',
  reducedMotion = false,
  area = 3.2,
  altura = 0,
  posicion = [0, 0, 0],
  formacionSeg = 5,
  semilla = 7,
  etiqueta = true,
}) {
  const conf = CONF[tier] || CONF.alto;
  const inten = Math.max(0, Math.min(1, intensidad));

  const cristRef = useRef(null);
  const chispaRef = useRef(null);
  const mantoRef = useRef(null);
  const mantoInRef = useRef(null);
  const progRef = useRef(reducedMotion ? 1 : 0);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const tex = useMemo(() => crearTexturaCopo(), []);
  useEffect(() => () => tex?.dispose(), [tex]);

  /* Sembrado determinista de cristales: disco sesgado al centro (r = area·u^1.3),
     con retardo de formación correlacionado al radio (el centro/bajo escarcha
     primero: allí se empoza el aire frío). */
  const cristales = useMemo(() => {
    const azar = hacerAzar(semilla);
    const n = conf.cristales;
    const out = [];
    for (let i = 0; i < n; i++) {
      const u = azar();
      const r = area * Math.pow(u, 1.3);
      const ang = azar() * Math.PI * 2;
      out.push({
        x: Math.cos(ang) * r,
        z: Math.sin(ang) * r,
        escala: 0.5 + azar() * 1.0,
        rx: azar() * Math.PI,
        ry: azar() * Math.PI,
        rz: azar() * Math.PI,
        retardo: Math.min(0.95, 0.55 * azar() + 0.45 * (r / area)),
      });
    }
    return out;
  }, [conf.cristales, area, semilla]);

  /* Sembrado de destellos: nube de puntos sobre el suelo y las puntas de las
     hojas, con fase/velocidad propias para titilar desfasados. */
  const chispas = useMemo(() => {
    const n = conf.chispas;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const fase = new Float32Array(n);
    const vel = new Float32Array(n);
    const azar = hacerAzar(semilla ^ 0x9e3779b9);
    for (let i = 0; i < n; i++) {
      const r = area * Math.pow(azar(), 1.25);
      const ang = azar() * Math.PI * 2;
      pos[i * 3] = Math.cos(ang) * r;
      pos[i * 3 + 1] = 0.03 + azar() * 0.4; // relativo a `altura` (grupo lo sube)
      pos[i * 3 + 2] = Math.sin(ang) * r;
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0;
      fase[i] = azar() * Math.PI * 2;
      vel[i] = 1.6 + azar() * 2.8;
    }
    return { n, pos, col, fase, vel };
  }, [conf.chispas, area, semilla]);

  /* Pinta TODO el estado del efecto para un progreso dado (0..1). Reutilizado por
     el bucle (formación viva) y por el layout-effect (primer fotograma / modo
     reducido con frameloop 'demand'). */
  const pintar = useCallback(
    (prog, t) => {
      const rev = suavizar(prog);
      const sizeF = 0.55 + 0.45 * inten;

      // 1) Manto de escarcha (blanqueo del suelo, más denso al centro).
      if (mantoRef.current) mantoRef.current.material.opacity = 0.3 * inten * rev;
      if (mantoInRef.current) mantoInRef.current.material.opacity = 0.22 * inten * rev;

      // 2) Cristales: cada uno crece escalonado según su retardo.
      const inst = cristRef.current;
      if (inst) {
        for (let i = 0; i < cristales.length; i++) {
          const c = cristales[i];
          const d = c.retardo * 0.6;
          const local = Math.max(0, Math.min(1, (prog - d) / (1 - d)));
          const e = 1 - (1 - local) * (1 - local); // easeOut
          const s = Math.max(0.0001, c.escala * sizeF * 0.11 * e);
          dummy.position.set(c.x, altura + s * 0.6, c.z);
          dummy.rotation.set(c.rx, c.ry, c.rz);
          dummy.scale.setScalar(s);
          dummy.updateMatrix();
          inst.setMatrixAt(i, dummy.matrix);
        }
        inst.instanceMatrix.needsUpdate = true;
      }

      // 3) Destellos: se revelan con el progreso y titilan desfasados. Con
      //    reducedMotion quedan a brillo medio, quietos.
      const pts = chispaRef.current;
      if (pts && chispas.n) {
        const attr = pts.geometry.getAttribute('color');
        for (let i = 0; i < chispas.n; i++) {
          const tit = reducedMotion
            ? 0.7
            : 0.32 + 0.68 * (0.5 + 0.5 * Math.sin(t * chispas.vel[i] + chispas.fase[i]));
          const b = tit * rev;
          attr.array[i * 3] = 0.86 * b;
          attr.array[i * 3 + 1] = 0.93 * b;
          attr.array[i * 3 + 2] = 1.0 * b;
        }
        attr.needsUpdate = true;
        pts.material.opacity = inten;
      }
    },
    [altura, chispas, cristales, dummy, inten, reducedMotion],
  );

  // Primer fotograma correcto aun con frameloop 'demand' (reducedMotion).
  useLayoutEffect(() => {
    progRef.current = reducedMotion ? 1 : 0;
    pintar(reducedMotion ? 1 : 0, 0);
  }, [pintar, reducedMotion]);

  useFrame((state, delta) => {
    if (reducedMotion) return; // estado final ya fijado por el layout-effect
    if (progRef.current < 1) {
      progRef.current = Math.min(1, progRef.current + delta / Math.max(0.5, formacionSeg));
    }
    pintar(progRef.current, state.clock.elapsedTime);
  });

  return (
    <group position={posicion}>
      {/* Manto de escarcha — disco base + disco interno (blanqueo del centro). */}
      <mesh ref={mantoRef} position={[0, altura + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <circleGeometry args={[area, 40]} />
        <meshBasicMaterial
          color={COLOR_MANTO}
          transparent
          opacity={0}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>
      {conf.mantoDoble && (
        <mesh ref={mantoInRef} position={[0, altura + 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
          <circleGeometry args={[area * 0.55, 32]} />
          <meshBasicMaterial
            color={COLOR_MANTO}
            transparent
            opacity={0}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-3}
          />
        </mesh>
      )}

      {/* Cristales de hielo low-poly, todos en un InstancedMesh. */}
      <instancedMesh ref={cristRef} args={[undefined, undefined, conf.cristales]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshLambertMaterial
          color={COLOR_CRISTAL}
          emissive={EMISIVO_CRISTAL}
          emissiveIntensity={0.28}
          flatShading
        />
      </instancedMesh>

      {/* Destellos del alba sobre los cristales (solo tiers con presupuesto). */}
      {conf.chispas > 0 && (
        <points ref={chispaRef} renderOrder={4}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" array={chispas.pos} count={chispas.n} itemSize={3} />
            <bufferAttribute attach="attributes-color" array={chispas.col} count={chispas.n} itemSize={3} />
          </bufferGeometry>
          <pointsMaterial
            size={0.11}
            map={tex || undefined}
            vertexColors
            transparent
            opacity={0}
            depthWrite={false}
            sizeAttenuation
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}

      {/* Etiqueta educativa: nombra el fenómeno y el riesgo, sin tapar la escena. */}
      {etiqueta && (
        <Html position={[0, altura + 0.95, 0]} center distanceFactor={7} zIndexRange={[20, 0]}>
          <div className="escarcha-etiqueta">
            <span className="escarcha-etiqueta__copo" aria-hidden="true">❄️</span>
            <span>
              Escarcha de helada
              <span className="escarcha-etiqueta__sub"> · amanecer despejado</span>
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}
