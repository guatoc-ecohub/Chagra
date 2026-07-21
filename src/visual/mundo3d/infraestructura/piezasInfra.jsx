/*
 * piezasInfra — las PIEZAS low-poly de la infraestructura de la finca.
 *
 * Un componente R3F por FORMA de construcción (invernadero, galpón, tanque…).
 * Cada uno recibe el MISMO contrato y devuelve un `<group>` centrado en el origen
 * con la base en y=0, listo para caer dentro de cualquier escena (EscenaBase3D) o
 * de la vitrina. Nada de GLTF ni texturas: primitivas + `meshLambertMaterial`
 * con `flatShading` (el look claymation del framework) y la PALETA madre. El
 * plástico y la malla son el único material translúcido (opacidad baja).
 *
 * CONTRATO uniforme (idéntico para las 10 piezas):
 *   { dims: { largo, ancho, alto } (metros), params, frugal, reducedMotion, vida }
 *
 *   · `largo` corre por X, `ancho` por Z, `alto` por Y. Footprint centrado.
 *   · `frugal` (device-tier medio/bajo) baja segmentos y suelta detalle fino;
 *     también apaga la neblina y adelgaza los efectos de vida.
 *   · `reducedMotion` → sin animación de llenado (estado final directo). Las
 *     piezas neutras siguen siendo estáticas por construcción.
 *   · `vida` — el estado FUNCIONAL derivado del dato real (derivarVidaInfra en
 *     infraestructuraData.js). null → pieza NEUTRA idéntica al catálogo de
 *     siempre (anti-fabricación). Con vida: el invernadero enseña su microclima
 *     (aire cálido, neblina, matas adelantadas, refugio en El Niño), el almacén
 *     se llena tras la cosecha (costales y huacales) y galpón/establo/gallinero
 *     se ocupan según los animales reales (foco encendido, paja, siluetas).
 *
 * El mapeo id→componente (PIEZAS_INFRA) lo consume `Infraestructura.jsx`; el
 * catálogo de datos (infraestructuraData.js) es three-free y solo guarda la
 * CLAVE de render, no el componente — misma disciplina que arquetipos/mundoData.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PALETA } from '../atmosferaMadre.js';

/**
 * @typedef {Object} ParamsInfra
 * @property {number} [arcos]
 * @property {string} [plastico]
 * @property {boolean} [puerta]
 * @property {number} [pared]
 * @property {string} [sombra]
 * @property {number} [mesas]
 * @property {string} [malla]
 * @property {number} [refugio]
 * @property {string} [cortina]
 * @property {string} [techo]
 * @property {boolean} [comedero]
 * @property {number} [plazas]
 * @property {boolean} [porton]
 * @property {number} [modulos]
 * @property {string} [madera]
 * @property {string} [material]
 * @property {boolean} [tapa]
 * @property {boolean} [tuberia]
 * @property {string} [grano]
 * @property {boolean} [camas]
 */

/* Colores locales de obra que no viven en la PALETA madre (translúcidos y
   herrajes propios de la infraestructura). Grises CÁLIDOS, jamás neutros. */
const OBRA = {
  plastico: '#dfeef2', // el plástico de invernadero (se pinta translúcido)
  malla: '#b9c2b0', // la malla/polisombra galvanizada, verde-gris
  zinc: PALETA.lamina, // la teja de zinc
  concreto: PALETA.concreto, // el piso firme, la placa
  guadua: '#b39a5e', // la caña/guadua clara de la estructura campesina
};

/* Material de PLÁSTICO/MALLA translúcido: opacidad baja, doble cara y sin
   escribir profundidad (evita el sorteo feo entre paños). Reusado por todo lo
   que sea cubierta de plástico o paño de malla. */
function matTranslucido(color, opacidad = 0.32) {
  return (
    <meshLambertMaterial
      color={color}
      transparent
      opacity={opacidad}
      depthWrite={false}
      side={THREE.DoubleSide}
      flatShading
    />
  );
}

/* Un poste vertical (guadua/madera/tubo): el ladrillo estructural de casi todo. */
function Poste({ pos, alto, r = 0.06, color = PALETA.madera, seg = 5 }) {
  return (
    <mesh position={[pos[0], alto / 2, pos[2]]}>
      <cylinderGeometry args={[r, r * 1.15, alto, seg]} />
      <meshLambertMaterial color={color} flatShading />
    </mesh>
  );
}

/* Una placa/piso firme fino centrado (concreto): posa la construcción. */
function Placa({ largo, ancho, color = OBRA.concreto, alto = 0.08 }) {
  return (
    <mesh position={[0, alto / 2, 0]}>
      <boxGeometry args={[largo, alto, ancho]} />
      <meshLambertMaterial color={color} flatShading />
    </mesh>
  );
}

/* ── LOS LADRILLOS DE VIDA (efectos funcionales, low-poly) ───────────────────
   Piecitas que las formas montan SOLO cuando `vida` trae dato real. Colores
   locales del mismo espíritu de OBRA: cálidos, jamás neutros. */
const VIDA_COLOR = {
  aireCalido: '#f2b46a', // el tinte del microclima del invernadero
  neblina: '#f7f3e8', // condensación/neblina interior (blanco cálido)
  foco: '#ffd98a', // el bombillo campesino prendido (material unlit)
  paja: '#cbb26a', // cama de paja del corral ocupado
  costal: '#d8c9a5', // el costal de fique de la cosecha
  costalOscuro: '#c9b487', // su hermano más curtido
  pastoSeco: '#b8a35f', // el pasto resecado de afuera cuando aprieta El Niño
  plumaCafe: '#c98d4f', // gallina colorada (la clara usa PALETA.cal)
};

/* Un foco encendido: esfera unlit (meshBasicMaterial = siempre brilla) + halo
   translúcido. La señal campesina de "aquí hay alguien": luz en el corral. */
function FocoCalido({ pos, r = 0.09 }) {
  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[r, 8, 6]} />
        <meshBasicMaterial color={VIDA_COLOR.foco} />
      </mesh>
      <mesh>
        <sphereGeometry args={[r * 2.6, 8, 6]} />
        <meshBasicMaterial color={VIDA_COLOR.foco} transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* Un montoncito de paja (esfera achatada): cama del animal presente. */
function Paja({ pos, s = 1 }) {
  return (
    <mesh position={pos} scale={[s, s * 0.35, s * 0.8]}>
      <sphereGeometry args={[0.35, 7, 5]} />
      <meshLambertMaterial color={VIDA_COLOR.paja} flatShading />
    </mesh>
  );
}

/* Silueta de gallina: cuerpo achatado + cabecita. Presencia, no retrato. */
function SiluetaGallina({ pos, rot = 0, color = PALETA.cal }) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.12, 0]} scale={[1, 0.85, 0.8]}>
        <sphereGeometry args={[0.14, 7, 5]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0.12, 0.24, 0]}>
        <sphereGeometry args={[0.06, 6, 5]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
    </group>
  );
}

/* Silueta de res: bloque de cuerpo + cabeza al comedero + patas insinuadas. */
function SiluetaRes({ pos, rot = 0, color = PALETA.tierraClara }) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[1.15, 0.62, 0.5]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0, 0.52, 0.42]}>
        <boxGeometry args={[0.3, 0.34, 0.3]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
      {[-0.35, 0.35].map((dx) => (
        <mesh key={dx} position={[dx, 0.21, 0]}>
          <boxGeometry args={[0.16, 0.42, 0.4]} />
          <meshLambertMaterial color={color} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/* Un costal de cosecha amarrado: panza + ñudo. */
function Saco({ pos, color = VIDA_COLOR.costal }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.3, 0]} scale={[1, 1.15, 1]}>
        <sphereGeometry args={[0.26, 7, 6]} />
        <meshLambertMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <sphereGeometry args={[0.08, 6, 5]} />
        <meshLambertMaterial color={PALETA.maderaClara} flatShading />
      </mesh>
    </group>
  );
}

/* Un huacal (guacal) de madera con lo cosechado asomando. */
function Huacal({ pos, rot = 0 }) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[0.55, 0.36, 0.38]} />
        <meshLambertMaterial color={PALETA.maderaClara} flatShading />
      </mesh>
      <mesh position={[0, 0.38, 0]}>
        <boxGeometry args={[0.45, 0.08, 0.3]} />
        <meshLambertMaterial color={PALETA.follajeClaro} flatShading />
      </mesh>
    </group>
  );
}

/* Las matas ADELANTADAS del microclima: conitos más crecidos que las plántulas
   del vivero, en fila sobre las camas. Solo se montan con saludFinca REAL. */
function MatasAdelantadas({ L, zs, frugal }) {
  const cols = frugal ? 4 : Math.max(4, Math.round(L / 1.6));
  const xs = Array.from({ length: cols }, (_, i) => (-L / 2 + (i + 0.5) * (L / cols)) * 0.92);
  return zs.map((z, zi) =>
    xs.map((x, i) => (
      <mesh key={`${zi}:${i}`} position={[x, 0.41, z]}>
        <coneGeometry args={[0.1, 0.34, 5]} />
        <meshLambertMaterial
          color={(i + zi) % 2 ? PALETA.follajeClaro : PALETA.follaje}
          flatShading
        />
      </mesh>
    )),
  );
}

/* La COSECHA GUARDADA del almacén: costales arrumados y huacales junto al
   portón. Cantidad FIJA y modesta (la cosecha reciente trae cultivo, no
   kilos: presencia honesta, no volumen inventado). `fx` re-escala el arrume
   para bodegas más cortas que el default. */
function CosechaGuardada({ L, W, frugal, reducedMotion }) {
  const fx = Math.min(1, L / 8);
  const puestos = frugal
    ? [
        [-1.35, 0, 0.5],
        [-1.9, 0, 0.62],
        [-1.6, 0, 1.02],
      ]
    : [
        [-1.35, 0, 0.5],
        [-1.9, 0, 0.62],
        [-1.6, 0, 1.02],
        [-1.62, 0.52, 0.72],
        [1.7, 0, 0.55],
      ];
  const contenido = (
    <group position={[0, 0, W / 2]}>
      {puestos.map(([x, y, z], i) => (
        <Saco
          key={i}
          pos={[x * fx, y, z]}
          color={i % 2 ? VIDA_COLOR.costalOscuro : VIDA_COLOR.costal}
        />
      ))}
      {!frugal && (
        <>
          <Huacal pos={[1.15 * fx, 0, 1.0]} rot={0.3} />
          <Huacal pos={[1.35 * fx, 0, 0.45]} rot={-0.15} />
        </>
      )}
    </group>
  );
  // reducedMotion (o tier frugal): estado final directo, sin animación de llenado.
  if (reducedMotion || frugal) return contenido;
  return <GrupoBrota>{contenido}</GrupoBrota>;
}

/* Brote de llenado (rubber-hose): escala con overshoot al montar. Se usa SOLO
   cuando hay motion permitido; con reducedMotion el contenido va directo. */
function GrupoBrota({ children }) {
  const ref = useRef(null);
  const inicio = useRef(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    if (inicio.current == null) inicio.current = clock.elapsedTime;
    const t = Math.min(1, (clock.elapsedTime - inicio.current) / 0.9);
    // ease-out-back: llega, se pasa tantico y asienta (squash & settle).
    const c1 = 1.70158;
    const c3 = c1 + 1;
    const s = t >= 1 ? 1 : Math.max(0.001, 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2));
    g.scale.setScalar(s);
  });
  return (
    <group ref={ref} scale={[0.001, 0.001, 0.001]}>
      {children}
    </group>
  );
}

// ─── 1. INVERNADERO TÚNEL (macrotúnel) ──────────────────────────────────────
// Media caña de plástico sobre la cama de siembra. La cubierta es un medio
// cilindro (dome arriba, base en y=0), estirado en Y para respetar `alto` cuando
// no es exactamente el radio. Arcos de guadua/tubo cada tanto + tapas de plástico
// en los extremos + camas de tierra adentro.
/**
 * @param {Object} props
 * @param {{ largo: number, ancho: number, alto: number }} props.dims
 * @param {ParamsInfra} [props.params]
 * @param {boolean} [props.frugal=false]
 * @param {Object|null} [props.vida=null]
 */
export function InvernaderoTunel({ dims, params = {}, frugal = false, vida = null }) {
  const { largo: L, ancho: W, alto: H } = dims;
  const r = W / 2;
  const escY = H / r; // estira la media caña para llegar a `alto`
  const segArco = frugal ? 10 : 18;
  const nArcos = frugal ? Math.max(2, Math.round((params.arcos ?? 6) / 2)) : (params.arcos ?? 6);
  const plastico = params.plastico || OBRA.plastico;

  // El microclima REAL (vida): aire cálido adentro, condensación y matas
  // adelantadas. Sin vida → invernadero neutro del catálogo (anti-fabricación).
  const vivo = !!vida?.microclima?.activo;
  const matas = !!vida?.microclima?.matas;
  const refugio = !!vida?.microclima?.refugio;

  const arcosX = useMemo(
    () => Array.from({ length: nArcos }, (_, i) => -L / 2 + (i + 0.5) * (L / nArcos)),
    [nArcos, L],
  );
  const camasZ = [-W * 0.22, W * 0.22];

  return (
    <group>
      {/* camas de siembra adentro (dos lomos de tierra); en frugal solo
          aparecen si hay matas reales que sostener */}
      {(!frugal || matas) &&
        camasZ.map((z, i) => (
          <mesh key={i} position={[0, 0.12, z]}>
            <boxGeometry args={[L * 0.92, 0.24, W * 0.3]} />
            <meshLambertMaterial color={PALETA.tierra} flatShading />
          </mesh>
        ))}

      {/* matas adelantadas por el microclima (solo con saludFinca real) */}
      {matas && <MatasAdelantadas L={L} zs={camasZ} frugal={frugal} />}

      {/* neblina/condensación interior (tier alto): el aire húmedo que se ve */}
      {vivo &&
        !frugal &&
        [-L / 4, 0, L / 4].map((x, i) => (
          <mesh
            key={`nb${i}`}
            position={[x, H * 0.55, (i - 1) * W * 0.12]}
            scale={[1.3, 0.4, 0.9]}
          >
            <sphereGeometry args={[W * 0.16, 7, 5]} />
            {matTranslucido(VIDA_COLOR.neblina, 0.16)}
          </mesh>
        ))}

      {/* la cubierta de plástico (media caña) + arcos, estirados a `alto` */}
      <group scale={[1, escY, 1]}>
        {/* piel de plástico */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r, r, L, segArco, 1, true, 0, Math.PI]} />
          {matTranslucido(plastico, 0.3)}
        </mesh>
        {/* el aire CÁLIDO del microclima: media caña interior tibia. En El
            Niño se acentúa: el invernadero se lee como refugio */}
        {vivo && (
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[r * 0.9, r * 0.9, L * 0.96, segArco, 1, true, 0, Math.PI]} />
            {matTranslucido(VIDA_COLOR.aireCalido, refugio ? 0.16 : 0.1)}
          </mesh>
        )}
        {/* arcos estructurales (medio toro que sube de z=-r a z=+r) */}
        {arcosX.map((x, i) => (
          <mesh key={i} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[r, 0.05, 5, segArco, Math.PI]} />
            <meshLambertMaterial color={OBRA.guadua} flatShading />
          </mesh>
        ))}
        {/* tapas de plástico en los dos extremos (medio disco) */}
        {[-L / 2, L / 2].map((x, i) => (
          <mesh key={i} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <circleGeometry args={[r, segArco, 0, Math.PI]} />
            {matTranslucido(plastico, 0.22)}
          </mesh>
        ))}
      </group>

      {/* la puerta (marco oscuro) en la tapa frontal */}
      {params.puerta !== false && (
        <mesh position={[L / 2 + 0.01, H * 0.32, 0]}>
          <boxGeometry args={[0.04, H * 0.6, Math.min(1, W * 0.28)]} />
          <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
        </mesh>
      )}

      {/* refugio en El Niño: afuera de la puerta el pasto está resecado —
          el contraste hace legible el microclima fresco de adentro */}
      {refugio &&
        [-0.6, 0.55].map((dz, i) => (
          <mesh key={`rs${i}`} position={[L / 2 + 0.9 + i * 0.35, 0.03, dz]}>
            <boxGeometry args={[1.0, 0.05, 0.55]} />
            <meshLambertMaterial color={VIDA_COLOR.pastoSeco} flatShading />
          </mesh>
        ))}
    </group>
  );
}

// ─── 2. INVERNADERO CAPILLA (dos aguas) ─────────────────────────────────────
// Paredes rectas hasta `pared` y techo a dos aguas hasta `alto` (cumbrera).
// Postes en las esquinas y a media luz, paños de plástico en las paredes, dos
// faldones de techo y la viga de cumbrera.
/**
 * @param {Object} props
 * @param {{ largo: number, ancho: number, alto: number }} props.dims
 * @param {ParamsInfra} [props.params]
 * @param {boolean} [props.frugal=false]
 * @param {Object|null} [props.vida=null]
 */
export function InvernaderoCapilla({ dims, params = {}, frugal = false, vida = null }) {
  const { largo: L, ancho: W, alto: H } = dims;
  const p = Math.min(params.pared ?? 2.5, H - 0.4); // altura de pared (alero)
  const plastico = params.plastico || OBRA.plastico;
  const subeTecho = H - p; // lo que sube el techo desde el alero a la cumbrera
  const faldon = Math.hypot(W / 2, subeTecho); // largo del faldón inclinado
  const ang = Math.atan2(subeTecho, W / 2); // pendiente del agua

  const postesX = frugal ? [-L / 2, L / 2] : [-L / 2, 0, L / 2];

  // Microclima real (vida): mismo repertorio del túnel (ver InvernaderoTunel).
  const vivo = !!vida?.microclima?.activo;
  const matas = !!vida?.microclima?.matas;
  const refugio = !!vida?.microclima?.refugio;
  const camasZ = [-W * 0.22, W * 0.22];

  return (
    <group>
      {/* postes de esquina y de media luz */}
      {postesX.map((x) =>
        [-W / 2, W / 2].map((z) => (
          <Poste key={`${x}:${z}`} pos={[x, 0, z]} alto={p} r={0.07} color={OBRA.guadua} />
        )),
      )}

      {/* con matas REALES, la capilla enseña sus camas y las matas adelantadas */}
      {matas &&
        camasZ.map((z, i) => (
          <mesh key={`ca${i}`} position={[0, 0.12, z]}>
            <boxGeometry args={[L * 0.9, 0.24, W * 0.28]} />
            <meshLambertMaterial color={PALETA.tierra} flatShading />
          </mesh>
        ))}
      {matas && <MatasAdelantadas L={L} zs={camasZ} frugal={frugal} />}

      {/* el aire cálido del microclima (volumen tibio interior) */}
      {vivo && (
        <mesh position={[0, p / 2, 0]}>
          <boxGeometry args={[L * 0.96, p * 0.96, W * 0.96]} />
          {matTranslucido(VIDA_COLOR.aireCalido, refugio ? 0.14 : 0.09)}
        </mesh>
      )}

      {/* condensación bajo el alero (tier alto) */}
      {vivo &&
        !frugal &&
        [-L / 4, 0, L / 4].map((x, i) => (
          <mesh
            key={`nb${i}`}
            position={[x, p * 0.85, (i - 1) * W * 0.1]}
            scale={[1.3, 0.4, 0.9]}
          >
            <sphereGeometry args={[W * 0.14, 7, 5]} />
            {matTranslucido(VIDA_COLOR.neblina, 0.15)}
          </mesh>
        ))}

      {/* refugio en El Niño: pasto resecado afuera del frente */}
      {refugio &&
        [-0.7, 0.6].map((dz, i) => (
          <mesh key={`rs${i}`} position={[L / 2 + 0.9 + i * 0.35, 0.03, dz]}>
            <boxGeometry args={[1.0, 0.05, 0.55]} />
            <meshLambertMaterial color={VIDA_COLOR.pastoSeco} flatShading />
          </mesh>
        ))}

      {/* paños de plástico de las cuatro paredes (hasta el alero) */}
      {/* laterales largos */}
      {[-W / 2, W / 2].map((z, i) => (
        <mesh key={`lat${i}`} position={[0, p / 2, z]}>
          <boxGeometry args={[L, p, 0.02]} />
          {matTranslucido(plastico, 0.26)}
        </mesh>
      ))}
      {/* frentes cortos (con hueco de puerta insinuado por ser más translúcido) */}
      {[-L / 2, L / 2].map((x, i) => (
        <mesh key={`fr${i}`} position={[x, p / 2, 0]}>
          <boxGeometry args={[0.02, p, W]} />
          {matTranslucido(plastico, 0.2)}
        </mesh>
      ))}

      {/* viga de cumbrera */}
      <mesh position={[0, H, 0]}>
        <boxGeometry args={[L, 0.08, 0.08]} />
        <meshLambertMaterial color={PALETA.madera} flatShading />
      </mesh>

      {/* dos faldones de techo a dos aguas (pendiente `ang` desde el alero) */}
      {[1, -1].map((s) => (
        <mesh
          key={s}
          position={[0, p + subeTecho / 2, (s * W) / 4]}
          rotation={[s * ang, 0, 0]}
        >
          <boxGeometry args={[L, 0.03, faldon]} />
          {matTranslucido(plastico, 0.3)}
        </mesh>
      ))}

      {/* triángulos de los frentes (cerchas de cumbrera) */}
      {[-L / 2, L / 2].map((x, i) => (
        <mesh key={`ce${i}`} position={[x, p, 0]}>
          <cylinderGeometry args={[0.05, 0.05, subeTecho, 4]} />
          <meshLambertMaterial color={OBRA.guadua} flatShading />
        </mesh>
      ))}
    </group>
  );
}

// ─── 3. MEDIA-SOMBRA / VIVERO ───────────────────────────────────────────────
// Techo plano de polisombra sobre postes, paños de malla en los lados y mesas de
// propagación con bandejas de plántulas.
/**
 * @param {Object} props
 * @param {{ largo: number, ancho: number, alto: number }} props.dims
 * @param {ParamsInfra} [props.params]
 * @param {boolean} [props.frugal=false]
 */
export function MediaSombra({ dims, params = {}, frugal = false }) {
  const { largo: L, ancho: W, alto: H } = dims;
  const sombra = params.sombra || OBRA.malla;
  const nMesas = frugal ? 1 : (params.mesas ?? 2);

  const postes = [];
  for (const x of [-L / 2, 0, L / 2]) for (const z of [-W / 2, W / 2]) postes.push([x, z]);

  const mesasZ = useMemo(
    () => Array.from({ length: nMesas }, (_, i) => -W / 2 + (i + 0.7) * (W / (nMesas + 0.4))),
    [nMesas, W],
  );
  // plántulas por mesa (deterministas)
  const plantulas = useMemo(() => {
    if (frugal) return [];
    const cols = Math.max(3, Math.round(L / 1.4));
    return Array.from({ length: cols }, (_, i) => -L / 2 + (i + 0.5) * (L / cols));
  }, [L, frugal]);

  return (
    <group>
      {postes.map(([x, z]) => (
        <Poste key={`${x}:${z}`} pos={[x, 0, z]} alto={H} r={0.06} color={PALETA.madera} />
      ))}

      {/* techo plano de polisombra */}
      <mesh position={[0, H, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[L, W]} />
        {matTranslucido(sombra, 0.42)}
      </mesh>
      {/* paños de malla en los cuatro lados (media altura, aireado) */}
      {[-W / 2, W / 2].map((z, i) => (
        <mesh key={`ml${i}`} position={[0, H * 0.55, z]}>
          <planeGeometry args={[L, H * 0.9]} />
          {matTranslucido(sombra, 0.3)}
        </mesh>
      ))}

      {/* mesas de propagación con bandejas y plántulas */}
      {mesasZ.map((z, mi) => (
        <group key={mi} position={[0, 0, z]}>
          {/* patas */}
          {[-L / 2 + 0.3, L / 2 - 0.3].map((x) =>
            [-0.35, 0.35].map((dz) => (
              <Poste key={`${x}:${dz}`} pos={[x, 0, dz]} alto={0.8} r={0.03} color={PALETA.maderaOscura} seg={4} />
            )),
          )}
          {/* tablero de la mesa */}
          <mesh position={[0, 0.82, 0]}>
            <boxGeometry args={[L * 0.94, 0.05, 0.8]} />
            <meshLambertMaterial color={PALETA.maderaClara} flatShading />
          </mesh>
          {/* bandeja de germinación */}
          <mesh position={[0, 0.87, 0]}>
            <boxGeometry args={[L * 0.9, 0.05, 0.72]} />
            <meshLambertMaterial color={PALETA.tierra} flatShading />
          </mesh>
          {/* las plántulas: puntitos verdes en fila */}
          {plantulas.map((x, i) => (
            <mesh key={i} position={[x, 0.95, 0]}>
              <coneGeometry args={[0.05, 0.14, 5]} />
              <meshLambertMaterial color={PALETA.follajeClaro} flatShading />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// ─── 4. GALLINERO A CAMPO ABIERTO ───────────────────────────────────────────
// Un corral de malla (postes + paños translúcidos) con un refugio techado en una
// esquina: casita de tablas + techo a un agua + pop-hole y palo de dormir.
/**
 * @param {Object} props
 * @param {{ largo: number, ancho: number, alto: number }} props.dims
 * @param {ParamsInfra} [props.params]
 * @param {boolean} [props.frugal=false]
 * @param {Object|null} [props.vida=null]
 */
export function GallineroCampo({ dims, params = {}, frugal = false, vida = null }) {
  const { largo: L, ancho: W, alto: H } = dims;
  const malla = params.malla || OBRA.malla;
  const rf = Math.min(params.refugio ?? 3, Math.min(L, W) - 0.5); // lado del refugio
  const hR = Math.min(2, H); // alto del refugio

  // Ocupación REAL: solo hay gallinas si el inventario trae aves (vida).
  const aves = vida?.ocupacion?.aves ?? 0;
  const ocupado = aves > 0;
  const nGallinas = Math.min(aves, frugal ? 3 : 6);
  // Puntos deterministas del picoteo (fracciones del corral, lejos del refugio).
  const PICOTEO = [
    [0.15, 0.1],
    [0.3, -0.25],
    [0.05, 0.32],
    [0.35, 0.05],
    [0.2, -0.12],
    [0.42, 0.28],
  ];

  // postes del perímetro del corral
  const postes = [];
  for (const x of [-L / 2, 0, L / 2]) for (const z of [-W / 2, W / 2]) postes.push([x, z]);
  for (const z of [0]) for (const x of [-L / 2, L / 2]) postes.push([x, z]);

  const refX = -L / 2 + rf / 2; // refugio en el extremo izquierdo
  const refZ = -W / 2 + rf / 2;

  return (
    <group>
      {/* postes del corral */}
      {postes.map(([x, z], i) => (
        <Poste key={i} pos={[x, 0, z]} alto={H} r={0.05} color={PALETA.madera} seg={4} />
      ))}
      {/* paños de malla del perímetro (cuatro lados) */}
      {[-W / 2, W / 2].map((z, i) => (
        <mesh key={`mz${i}`} position={[0, H / 2, z]}>
          <planeGeometry args={[L, H]} />
          {matTranslucido(malla, 0.22)}
        </mesh>
      ))}
      {[-L / 2, L / 2].map((x, i) => (
        <mesh key={`mx${i}`} position={[x, H / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[W, H]} />
          {matTranslucido(malla, 0.22)}
        </mesh>
      ))}

      {/* el refugio en la esquina: cuerpo de tablas */}
      <group position={[refX, 0, refZ]}>
        <mesh position={[0, hR * 0.42, 0]}>
          <boxGeometry args={[rf, hR * 0.84, rf]} />
          <meshLambertMaterial color={PALETA.maderaClara} flatShading />
        </mesh>
        {/* techo a un agua (inclinado) */}
        <mesh position={[0, hR * 0.9, 0]} rotation={[0.28, 0, 0]}>
          <boxGeometry args={[rf * 1.15, 0.05, rf * 1.2]} />
          <meshLambertMaterial color={OBRA.zinc} flatShading />
        </mesh>
        {/* pop-hole (la puertita de las gallinas) */}
        <mesh position={[0, hR * 0.22, rf / 2 + 0.01]}>
          <boxGeometry args={[rf * 0.3, hR * 0.4, 0.04]} />
          <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
        </mesh>
        {/* rampita de salida */}
        <mesh position={[0, hR * 0.07, rf / 2 + 0.28]} rotation={[0.5, 0, 0]}>
          <boxGeometry args={[rf * 0.3, 0.03, 0.5]} />
          <meshLambertMaterial color={PALETA.madera} flatShading />
        </mesh>
      </group>

      {/* un comedero y un bebedero afuera (detalle) */}
      {!frugal && (
        <>
          <mesh position={[L * 0.18, 0.12, 0]}>
            <cylinderGeometry args={[0.18, 0.22, 0.24, 8]} />
            <meshLambertMaterial color={OBRA.zinc} flatShading />
          </mesh>
          <mesh position={[L * 0.28, 0.1, W * 0.2]}>
            <cylinderGeometry args={[0.14, 0.16, 0.2, 8]} />
            <meshLambertMaterial color={PALETA.agua} flatShading />
          </mesh>
        </>
      )}

      {/* OCUPACIÓN real (vida): gallinas picoteando, ventana cálida y paja.
          Sin aves en el inventario → corral quieto, tal cual el catálogo. */}
      {ocupado && (
        <mesh position={[refX + rf * 0.28, hR * 0.5, refZ + rf / 2 + 0.02]}>
          <boxGeometry args={[rf * 0.18, rf * 0.14, 0.03]} />
          <meshBasicMaterial color={VIDA_COLOR.foco} />
        </mesh>
      )}
      {ocupado && !frugal && <Paja pos={[refX, 0.05, refZ + rf / 2 + 0.7]} s={0.7} />}
      {Array.from({ length: nGallinas }, (_, i) => {
        const [fx, fz] = PICOTEO[i % PICOTEO.length];
        return (
          <SiluetaGallina
            key={`ga${i}`}
            pos={[fx * L, 0, fz * W]}
            rot={i * 0.9}
            color={i % 2 ? PALETA.cal : VIDA_COLOR.plumaCafe}
          />
        );
      })}
    </group>
  );
}

// ─── 5. GALPÓN AVÍCOLA (cerrado) ────────────────────────────────────────────
// Nave larga y baja: zócalo bajo, cortinas laterales enrollables (bandas de
// color), techo a dos aguas de zinc con alero, y muros de frente/fondo.
/**
 * @param {Object} props
 * @param {{ largo: number, ancho: number, alto: number }} props.dims
 * @param {ParamsInfra} [props.params]
 * @param {boolean} [props.frugal=false]
 * @param {Object|null} [props.vida=null]
 */
export function Galpon({ dims, params = {}, frugal = false, vida = null }) {
  const { largo: L, ancho: W, alto: H } = dims;
  const cortina = params.cortina || '#c9b487';
  const techo = params.techo || OBRA.zinc;
  const zocalo = Math.min(0.6, H * 0.2);

  // Ocupación REAL del lote (vida): aves del inventario. Sin aves → apagado.
  const aves = vida?.ocupacion?.aves ?? 0;
  const ocupado = aves > 0;
  const nAfuera = Math.min(aves, frugal ? 3 : 6);
  const cumbrera = H + Math.min(1.2, W * 0.18);
  const subeTecho = cumbrera - H;
  const faldon = Math.hypot(W / 2 + 0.3, subeTecho);
  const ang = Math.atan2(subeTecho, W / 2 + 0.3);

  return (
    <group>
      <Placa largo={L} ancho={W} />
      {/* postes */}
      {(frugal ? [-L / 2, L / 2] : [-L / 2, -L / 6, L / 6, L / 2]).map((x) =>
        [-W / 2, W / 2].map((z) => (
          <Poste key={`${x}:${z}`} pos={[x, 0, z]} alto={H} r={0.07} color={OBRA.zinc} />
        )),
      )}
      {/* zócalo bajo de bloque en los laterales */}
      {[-W / 2, W / 2].map((z, i) => (
        <mesh key={`zo${i}`} position={[0, zocalo / 2, z]}>
          <boxGeometry args={[L, zocalo, 0.12]} />
          <meshLambertMaterial color={OBRA.concreto} flatShading />
        </mesh>
      ))}
      {/* cortinas laterales (bandas de lona) */}
      {[-W / 2, W / 2].map((z, i) => (
        <mesh key={`co${i}`} position={[0, zocalo + (H - zocalo) / 2, z]}>
          <boxGeometry args={[L, H - zocalo, 0.06]} />
          <meshLambertMaterial color={cortina} flatShading />
        </mesh>
      ))}
      {/* muros de frente y fondo */}
      {[-L / 2, L / 2].map((x, i) => (
        <mesh key={`mu${i}`} position={[x, H / 2, 0]}>
          <boxGeometry args={[0.1, H, W]} />
          <meshLambertMaterial color={PALETA.cal} flatShading />
        </mesh>
      ))}
      {/* techo a dos aguas de zinc con alero */}
      <mesh position={[0, H, 0]}>
        <boxGeometry args={[L, 0.08, 0.08]} />
        <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
      </mesh>
      {[1, -1].map((s) => (
        <mesh
          key={s}
          position={[0, H + subeTecho / 2, (s * W) / 4]}
          rotation={[s * ang, 0, 0]}
        >
          <boxGeometry args={[L + 0.4, 0.05, faldon]} />
          <meshLambertMaterial color={techo} flatShading />
        </mesh>
      ))}

      {/* OCUPACIÓN real (vida): el galpón trabajando — foco prendido en el
          frente, luz que se cuela sobre las cortinas, paja y algunas aves
          estirando la pata afuera. Sin aves → nave apagada y quieta. */}
      {ocupado && <FocoCalido pos={[L / 2 + 0.15, H * 0.75, 0]} />}
      {ocupado &&
        [-W / 2, W / 2].map((z, i) => (
          <mesh
            key={`lz${i}`}
            position={[0, zocalo + (H - zocalo) * 0.86, z + (i === 0 ? -0.05 : 0.05)]}
          >
            <boxGeometry args={[L * 0.92, 0.14, 0.03]} />
            <meshBasicMaterial color={VIDA_COLOR.foco} />
          </mesh>
        ))}
      {ocupado && !frugal && <Paja pos={[L / 2 + 0.9, 0.06, W * 0.18]} s={0.9} />}
      {Array.from({ length: nAfuera }, (_, i) => (
        <SiluetaGallina
          key={`av${i}`}
          pos={[
            L / 2 + 0.8 + (i % 3) * 0.55,
            0,
            -W * 0.22 + Math.floor(i / 3) * 0.5 + (i % 2) * 0.18,
          ]}
          rot={i * 1.3}
          color={i % 2 ? VIDA_COLOR.plumaCafe : PALETA.cal}
        />
      ))}
    </group>
  );
}

// ─── 6. ESTABLO DE BOVINOS ──────────────────────────────────────────────────
// Cobertizo de lados abiertos: piso firme, postes, pared de tablas atrás, techo
// a un agua de zinc y comedero corrido al frente.
/**
 * @param {Object} props
 * @param {{ largo: number, ancho: number, alto: number }} props.dims
 * @param {ParamsInfra} [props.params]
 * @param {boolean} [props.frugal=false]
 * @param {Object|null} [props.vida=null]
 */
export function Establo({ dims, params = {}, frugal = false, vida = null }) {
  const { largo: L, ancho: W, alto: H } = dims;
  const techo = params.techo || OBRA.zinc;
  const hFrente = H;
  const hFondo = H - Math.min(0.8, W * 0.14); // techo a un agua (cae hacia el fondo)

  // Ocupación REAL (vida): bovinos + otros animales de establo del inventario.
  const oc = vida?.ocupacion;
  const reses = (oc?.bovinos ?? 0) + (oc?.otros ?? 0);
  const ocupado = reses > 0;
  const nReses = Math.min(reses, frugal ? 2 : 4);
  const faldon = Math.hypot(W, hFrente - hFondo);
  const ang = Math.atan2(hFrente - hFondo, W);

  return (
    <group>
      <Placa largo={L} ancho={W} color={OBRA.concreto} alto={0.1} />
      {/* postes del frente (altos) y del fondo (bajos) */}
      {(frugal ? [-L / 2, L / 2] : [-L / 2, 0, L / 2]).map((x) => (
        <group key={x}>
          <Poste pos={[x, 0, W / 2]} alto={hFrente} r={0.08} color={PALETA.madera} />
          <Poste pos={[x, 0, -W / 2]} alto={hFondo} r={0.08} color={PALETA.madera} />
        </group>
      ))}
      {/* pared de tablas atrás (tres listones) */}
      {[0.35, 0.6, 0.85].map((f, i) => (
        <mesh key={i} position={[0, hFondo * f, -W / 2]}>
          <boxGeometry args={[L, hFondo * 0.2, 0.05]} />
          <meshLambertMaterial color={PALETA.maderaClara} flatShading />
        </mesh>
      ))}
      {/* techo a un agua de zinc (alto al frente z=+W/2, cae hacia el fondo) */}
      <mesh position={[0, (hFrente + hFondo) / 2 + 0.08, 0]} rotation={[-ang, 0, 0]}>
        <boxGeometry args={[L + 0.3, 0.06, faldon + 0.3]} />
        <meshLambertMaterial color={techo} flatShading />
      </mesh>
      {/* comedero corrido al frente (canal en U aproximado) */}
      {params.comedero !== false && (
        <group position={[0, 0, W / 2 - 0.35]}>
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[L * 0.9, 0.1, 0.5]} />
            <meshLambertMaterial color={OBRA.concreto} flatShading />
          </mesh>
          <mesh position={[0, 0.62, 0]}>
            <boxGeometry args={[L * 0.9, 0.24, 0.14]} />
            <meshLambertMaterial color={OBRA.concreto} flatShading />
          </mesh>
          {/* pasto en el comedero */}
          {!frugal && (
            <mesh position={[0, 0.55, 0]}>
              <boxGeometry args={[L * 0.82, 0.12, 0.28]} />
              <meshLambertMaterial color={PALETA.follaje} flatShading />
            </mesh>
          )}
        </group>
      )}
      {/* divisiones de plaza (postes cortos) */}
      {!frugal &&
        params.plazas > 1 &&
        Array.from({ length: params.plazas - 1 }, (_, i) => {
          const x = -L / 2 + (i + 1) * (L / params.plazas);
          return <Poste key={i} pos={[x, 0, 0]} alto={1.1} r={0.05} color={PALETA.maderaOscura} seg={4} />;
        })}

      {/* OCUPACIÓN real (vida): reses en sus plazas mirando al comedero, foco
          prendido bajo el techo y camas de paja. Sin animales → vacío. */}
      {ocupado && <FocoCalido pos={[0, hFondo * 0.9, 0]} r={0.08} />}
      {ocupado && !frugal && (
        <>
          <Paja pos={[-L * 0.28, 0.12, -W * 0.15]} />
          <Paja pos={[L * 0.3, 0.12, -W * 0.05]} s={0.8} />
        </>
      )}
      {Array.from({ length: nReses }, (_, i) => (
        <SiluetaRes
          key={`re${i}`}
          pos={[-L / 2 + (i + 0.5) * (L / Math.max(1, nReses)), 0.1, W * 0.08]}
          rot={(i % 2 ? -1 : 1) * 0.12}
          color={[PALETA.tierraClara, PALETA.cal, PALETA.maderaOscura, PALETA.tierraClara][i % 4]}
        />
      ))}
    </group>
  );
}

// ─── 7. ALMACÉN / BODEGA ────────────────────────────────────────────────────
// Construcción cerrada: placa, cuatro muros, techo a dos aguas de zinc, portón
// grande y una ventanita.
/**
 * @param {Object} props
 * @param {{ largo: number, ancho: number, alto: number }} props.dims
 * @param {ParamsInfra} [props.params]
 * @param {boolean} [props.frugal=false]
 * @param {boolean} [props.reducedMotion=false]
 * @param {Object|null} [props.vida=null]
 */
export function AlmacenBodega({ dims, params = {}, frugal = false, reducedMotion = false, vida = null }) {
  const { largo: L, ancho: W, alto: H } = dims;
  const pared = params.pared || '#e3d7bf';
  const techo = params.techo || OBRA.zinc;
  const muro = H * 0.72; // alto de muro (el resto es el frontón del techo)
  const subeTecho = H - muro;
  const faldon = Math.hypot(W / 2 + 0.25, subeTecho);
  const ang = Math.atan2(subeTecho, W / 2 + 0.25);

  // COSECHA real (vida): con cosecha reciente el almacén se LLENA — portón
  // entreabierto y arrume de costales/huacales. Sin cosecha → bodega cerrada
  // y vacía (anti-fabricación: no hay banquete que no ocurrió).
  const cosecha = vida?.cosecha || null;
  const pw = Math.min(2.4, L * 0.4); // ancho del portón (para correrlo)

  return (
    <group>
      <Placa largo={L + 0.3} ancho={W + 0.3} />
      {/* cuatro muros */}
      {[-W / 2, W / 2].map((z, i) => (
        <mesh key={`z${i}`} position={[0, muro / 2, z]}>
          <boxGeometry args={[L, muro, 0.12]} />
          <meshLambertMaterial color={pared} flatShading />
        </mesh>
      ))}
      {[-L / 2, L / 2].map((x, i) => (
        <mesh key={`x${i}`} position={[x, muro / 2, 0]}>
          <boxGeometry args={[0.12, muro, W]} />
          <meshLambertMaterial color={pared} flatShading />
        </mesh>
      ))}
      {/* frontones triangulares (tapan el hueco del techo a dos aguas) */}
      {[-L / 2, L / 2].map((x, i) => (
        <mesh key={`ft${i}`} position={[x, muro, 0]}>
          <cylinderGeometry args={[0.06, 0.06, subeTecho, 4]} />
          <meshLambertMaterial color={pared} flatShading />
        </mesh>
      ))}
      {/* techo a dos aguas */}
      <mesh position={[0, H, 0]}>
        <boxGeometry args={[L + 0.2, 0.08, 0.08]} />
        <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
      </mesh>
      {[1, -1].map((s) => (
        <mesh
          key={s}
          position={[0, muro + subeTecho / 2, (s * W) / 4]}
          rotation={[s * ang, 0, 0]}
        >
          <boxGeometry args={[L + 0.3, 0.06, faldon]} />
          <meshLambertMaterial color={techo} flatShading />
        </mesh>
      ))}
      {/* portón grande al frente (con cosecha se corre: quedó entreabierto) */}
      {params.porton !== false && (
        <mesh position={[cosecha ? pw * 0.58 : 0, muro * 0.42, W / 2 + 0.02]}>
          <boxGeometry args={[pw, muro * 0.82, 0.06]} />
          <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
        </mesh>
      )}
      {/* el vano en penumbra que deja ver que adentro hay movimiento */}
      {cosecha && params.porton !== false && (
        <mesh position={[0, muro * 0.42, W / 2 + 0.01]}>
          <boxGeometry args={[pw * 0.9, muro * 0.8, 0.02]} />
          <meshLambertMaterial color="#2e2216" flatShading />
        </mesh>
      )}
      {/* ventanita */}
      {!frugal && (
        <mesh position={[L * 0.3, muro * 0.62, W / 2 + 0.02]}>
          <boxGeometry args={[0.7, 0.6, 0.05]} />
          <meshLambertMaterial color={PALETA.agua} flatShading />
        </mesh>
      )}

      {/* la COSECHA guardándose: arrume de costales y huacales junto al portón */}
      {cosecha && (
        <CosechaGuardada L={L} W={W} frugal={frugal} reducedMotion={reducedMotion} />
      )}
    </group>
  );
}

// ─── 8. COMPOSTERA ──────────────────────────────────────────────────────────
// Módulos de tablas (guadua/madera) con montones de compost en distinto punto de
// madurez: fresco (verdoso), medio (café) y hecho (tierra negra).
/**
 * @param {Object} props
 * @param {{ largo: number, ancho: number, alto: number }} props.dims
 * @param {ParamsInfra} [props.params]
 * @param {boolean} [props.frugal=false]
 */
export function Compostera({ dims, params = {}, frugal = false }) {
  const { largo: L, ancho: W, alto: H } = dims;
  const n = params.modulos ?? 3;
  const madera = params.madera || OBRA.guadua;
  const anchoMod = L / n;
  const estados = ['#5a6a2e', '#7a5a34', '#3a2c1c']; // fresco → medio → hecho

  const mods = useMemo(
    () => Array.from({ length: n }, (_, i) => -L / 2 + (i + 0.5) * anchoMod),
    [n, L, anchoMod],
  );

  return (
    <group>
      {mods.map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          {/* postes de la casilla */}
          {[-anchoMod / 2, anchoMod / 2].map((dx) =>
            [-W / 2, W / 2].map((z) => (
              <Poste key={`${dx}:${z}`} pos={[dx, 0, z]} alto={H} r={0.05} color={PALETA.maderaOscura} seg={4} />
            )),
          )}
          {/* tablas horizontales del fondo y los costados (tres listones) */}
          {[0.2, 0.5, 0.8].map((f, j) => (
            <group key={j}>
              <mesh position={[0, H * f, -W / 2]}>
                <boxGeometry args={[anchoMod, H * 0.22, 0.04]} />
                <meshLambertMaterial color={madera} flatShading />
              </mesh>
              {i === 0 && (
                <mesh position={[-anchoMod / 2, H * f, 0]}>
                  <boxGeometry args={[0.04, H * 0.22, W]} />
                  <meshLambertMaterial color={madera} flatShading />
                </mesh>
              )}
              <mesh position={[anchoMod / 2, H * f, 0]}>
                <boxGeometry args={[0.04, H * 0.22, W]} />
                <meshLambertMaterial color={madera} flatShading />
              </mesh>
            </group>
          ))}
          {/* el montón de compost, según su estado de madurez */}
          <mesh position={[0, H * 0.32, 0]} scale={[anchoMod * 0.42, H * 0.6, W * 0.42]}>
            <sphereGeometry args={[1, frugal ? 6 : 10, frugal ? 5 : 7, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshLambertMaterial color={estados[i % estados.length]} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── 9. TANQUE / RESERVORIO DE AGUA ─────────────────────────────────────────
// Depósito cilíndrico con base, agua adentro, tapa opcional y una tubería en L
// que entra el agua.
/**
 * @param {Object} props
 * @param {{ ancho: number, alto: number }} props.dims
 * @param {ParamsInfra} [props.params]
 * @param {boolean} [props.frugal=false]
 */
export function TanqueAgua({ dims, params = {}, frugal = false }) {
  const { ancho: W, alto: H } = dims;
  const r = W / 2;
  const material = params.material || PALETA.piedra;
  const seg = frugal ? 12 : 22;

  return (
    <group>
      {/* base anular (poyo) */}
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[r * 1.06, r * 1.12, 0.12, seg]} />
        <meshLambertMaterial color={OBRA.concreto} flatShading />
      </mesh>
      {/* pared del tanque */}
      <mesh position={[0, H / 2, 0]}>
        <cylinderGeometry args={[r, r, H, seg, 1, true]} />
        <meshLambertMaterial color={material} flatShading side={THREE.DoubleSide} />
      </mesh>
      {/* el agua adentro (disco cerca del borde) */}
      <mesh position={[0, H * 0.86, 0]}>
        <cylinderGeometry args={[r * 0.95, r * 0.95, 0.06, seg]} />
        <meshLambertMaterial color={PALETA.agua} flatShading />
      </mesh>
      {/* tapa (cono suave) */}
      {params.tapa !== false && (
        <mesh position={[0, H + 0.12, 0]}>
          <coneGeometry args={[r * 1.02, 0.28, seg]} />
          <meshLambertMaterial color={OBRA.zinc} flatShading />
        </mesh>
      )}
      {/* tubería en L que llena el tanque */}
      {params.tuberia !== false && (
        <group>
          <mesh position={[r + 0.15, H * 0.9, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.5, 6]} />
            <meshLambertMaterial color={OBRA.zinc} flatShading />
          </mesh>
          <mesh position={[r + 0.4, H * 0.9, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.06, 0.06, H * 0.9, 6]} />
            <meshLambertMaterial color={OBRA.zinc} flatShading />
          </mesh>
        </group>
      )}
    </group>
  );
}

// ─── 10. SECADERO DE CAFÉ (parabólico / marquesina) ─────────────────────────
// Túnel bajo de plástico (arco parabólico, más achatado que el invernadero)
// sobre camas elevadas donde el pergamino seca al sol. Patas + tablero + capa de
// grano + piel de plástico.
/**
 * @param {Object} props
 * @param {{ largo: number, ancho: number, alto: number }} props.dims
 * @param {ParamsInfra} [props.params]
 * @param {boolean} [props.frugal=false]
 */
export function SecaderoCafe({ dims, params = {}, frugal = false }) {
  const { largo: L, ancho: W, alto: H } = dims;
  const r = W / 2;
  const escY = H / r;
  const plastico = params.plastico || '#e8e0cf';
  const grano = params.grano || '#d4c199';
  const seg = frugal ? 10 : 18;
  const hCama = 0.7; // alto de la cama de secado

  return (
    <group>
      {/* camas elevadas: patas + tablero + capa de grano */}
      {params.camas !== false && (
        <group>
          {[-L / 2 + 0.4, 0, L / 2 - 0.4].map((x) =>
            [-W * 0.28, W * 0.28].map((z) => (
              <Poste key={`${x}:${z}`} pos={[x, 0, z]} alto={hCama} r={0.04} color={PALETA.madera} seg={4} />
            )),
          )}
          <mesh position={[0, hCama + 0.03, 0]}>
            <boxGeometry args={[L * 0.94, 0.05, W * 0.66]} />
            <meshLambertMaterial color={PALETA.maderaClara} flatShading />
          </mesh>
          {/* la capa de café en pergamino secándose */}
          <mesh position={[0, hCama + 0.08, 0]}>
            <boxGeometry args={[L * 0.9, 0.05, W * 0.6]} />
            <meshLambertMaterial color={grano} flatShading />
          </mesh>
        </group>
      )}

      {/* la piel parabólica de plástico (media caña achatada) */}
      <group position={[0, hCama, 0]} scale={[1, escY, 1]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r, r, L, seg, 1, true, 0, Math.PI]} />
          {matTranslucido(plastico, 0.28)}
        </mesh>
        {/* arcos del secadero */}
        {(frugal ? [-L / 2 + 0.5, L / 2 - 0.5] : [-L / 2 + 0.5, 0, L / 2 - 0.5]).map((x, i) => (
          <mesh key={i} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[r, 0.045, 5, seg, Math.PI]} />
            <meshLambertMaterial color={OBRA.guadua} flatShading />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* El REGISTRO render→componente. La clave la trae `INFRAESTRUCTURA[id].render`;
   `Infraestructura.jsx` la resuelve aquí. Sumar una forma nueva = una entrada.
   No es un componente (mapa de datos): el fast-refresh no aplica a esta librería. */
// eslint-disable-next-line react-refresh/only-export-components
export const PIEZAS_INFRA = {
  invernaderoTunel: InvernaderoTunel,
  invernaderoCapilla: InvernaderoCapilla,
  mediaSombra: MediaSombra,
  gallineroCampo: GallineroCampo,
  galpon: Galpon,
  establo: Establo,
  almacenBodega: AlmacenBodega,
  compostera: Compostera,
  tanqueAgua: TanqueAgua,
  secaderoCafe: SecaderoCafe,
};
