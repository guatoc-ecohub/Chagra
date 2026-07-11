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
 *   { dims: { largo, ancho, alto } (metros), params, frugal, reducedMotion }
 *
 *   · `largo` corre por X, `ancho` por Z, `alto` por Y. Footprint centrado.
 *   · `frugal` (device-tier medio/bajo) baja segmentos y suelta detalle fino.
 *   · las piezas son ESTÁTICAS (sin useFrame) → reduced-motion seguro por
 *     construcción; el flag viaja por si una pieza futura quiere latir.
 *
 * El mapeo id→componente (PIEZAS_INFRA) lo consume `Infraestructura.jsx`; el
 * catálogo de datos (infraestructuraData.js) es three-free y solo guarda la
 * CLAVE de render, no el componente — misma disciplina que arquetipos/mundoData.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { PALETA } from '../atmosferaMadre.js';

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

// ─── 1. INVERNADERO TÚNEL (macrotúnel) ──────────────────────────────────────
// Media caña de plástico sobre la cama de siembra. La cubierta es un medio
// cilindro (dome arriba, base en y=0), estirado en Y para respetar `alto` cuando
// no es exactamente el radio. Arcos de guadua/tubo cada tanto + tapas de plástico
// en los extremos + camas de tierra adentro.
export function InvernaderoTunel({ dims, params = {}, frugal = false }) {
  const { largo: L, ancho: W, alto: H } = dims;
  const r = W / 2;
  const escY = H / r; // estira la media caña para llegar a `alto`
  const segArco = frugal ? 10 : 18;
  const nArcos = frugal ? Math.max(2, Math.round((params.arcos ?? 6) / 2)) : (params.arcos ?? 6);
  const plastico = params.plastico || OBRA.plastico;

  const arcosX = useMemo(
    () => Array.from({ length: nArcos }, (_, i) => -L / 2 + (i + 0.5) * (L / nArcos)),
    [nArcos, L],
  );
  const camasZ = [-W * 0.22, W * 0.22];

  return (
    <group>
      {/* camas de siembra adentro (dos lomos de tierra) */}
      {!frugal &&
        camasZ.map((z, i) => (
          <mesh key={i} position={[0, 0.12, z]}>
            <boxGeometry args={[L * 0.92, 0.24, W * 0.3]} />
            <meshLambertMaterial color={PALETA.tierra} flatShading />
          </mesh>
        ))}

      {/* la cubierta de plástico (media caña) + arcos, estirados a `alto` */}
      <group scale={[1, escY, 1]}>
        {/* piel de plástico */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r, r, L, segArco, 1, true, 0, Math.PI]} />
          {matTranslucido(plastico, 0.3)}
        </mesh>
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
    </group>
  );
}

// ─── 2. INVERNADERO CAPILLA (dos aguas) ─────────────────────────────────────
// Paredes rectas hasta `pared` y techo a dos aguas hasta `alto` (cumbrera).
// Postes en las esquinas y a media luz, paños de plástico en las paredes, dos
// faldones de techo y la viga de cumbrera.
export function InvernaderoCapilla({ dims, params = {}, frugal = false }) {
  const { largo: L, ancho: W, alto: H } = dims;
  const p = Math.min(params.pared ?? 2.5, H - 0.4); // altura de pared (alero)
  const plastico = params.plastico || OBRA.plastico;
  const subeTecho = H - p; // lo que sube el techo desde el alero a la cumbrera
  const faldon = Math.hypot(W / 2, subeTecho); // largo del faldón inclinado
  const ang = Math.atan2(subeTecho, W / 2); // pendiente del agua

  const postesX = frugal ? [-L / 2, L / 2] : [-L / 2, 0, L / 2];

  return (
    <group>
      {/* postes de esquina y de media luz */}
      {postesX.map((x) =>
        [-W / 2, W / 2].map((z) => (
          <Poste key={`${x}:${z}`} pos={[x, 0, z]} alto={p} r={0.07} color={OBRA.guadua} />
        )),
      )}

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
export function GallineroCampo({ dims, params = {}, frugal = false }) {
  const { largo: L, ancho: W, alto: H } = dims;
  const malla = params.malla || OBRA.malla;
  const rf = Math.min(params.refugio ?? 3, Math.min(L, W) - 0.5); // lado del refugio
  const hR = Math.min(2, H); // alto del refugio

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
    </group>
  );
}

// ─── 5. GALPÓN AVÍCOLA (cerrado) ────────────────────────────────────────────
// Nave larga y baja: zócalo bajo, cortinas laterales enrollables (bandas de
// color), techo a dos aguas de zinc con alero, y muros de frente/fondo.
export function Galpon({ dims, params = {}, frugal = false }) {
  const { largo: L, ancho: W, alto: H } = dims;
  const cortina = params.cortina || '#c9b487';
  const techo = params.techo || OBRA.zinc;
  const zocalo = Math.min(0.6, H * 0.2);
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
    </group>
  );
}

// ─── 6. ESTABLO DE BOVINOS ──────────────────────────────────────────────────
// Cobertizo de lados abiertos: piso firme, postes, pared de tablas atrás, techo
// a un agua de zinc y comedero corrido al frente.
export function Establo({ dims, params = {}, frugal = false }) {
  const { largo: L, ancho: W, alto: H } = dims;
  const techo = params.techo || OBRA.zinc;
  const hFrente = H;
  const hFondo = H - Math.min(0.8, W * 0.14); // techo a un agua (cae hacia el fondo)
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
    </group>
  );
}

// ─── 7. ALMACÉN / BODEGA ────────────────────────────────────────────────────
// Construcción cerrada: placa, cuatro muros, techo a dos aguas de zinc, portón
// grande y una ventanita.
export function AlmacenBodega({ dims, params = {}, frugal = false }) {
  const { largo: L, ancho: W, alto: H } = dims;
  const pared = params.pared || '#e3d7bf';
  const techo = params.techo || OBRA.zinc;
  const muro = H * 0.72; // alto de muro (el resto es el frontón del techo)
  const subeTecho = H - muro;
  const faldon = Math.hypot(W / 2 + 0.25, subeTecho);
  const ang = Math.atan2(subeTecho, W / 2 + 0.25);

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
      {/* portón grande al frente */}
      {params.porton !== false && (
        <mesh position={[0, muro * 0.42, W / 2 + 0.02]}>
          <boxGeometry args={[Math.min(2.4, L * 0.4), muro * 0.82, 0.06]} />
          <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
        </mesh>
      )}
      {/* ventanita */}
      {!frugal && (
        <mesh position={[L * 0.3, muro * 0.62, W / 2 + 0.02]}>
          <boxGeometry args={[0.7, 0.6, 0.05]} />
          <meshLambertMaterial color={PALETA.agua} flatShading />
        </mesh>
      )}
    </group>
  );
}

// ─── 8. COMPOSTERA ──────────────────────────────────────────────────────────
// Módulos de tablas (guadua/madera) con montones de compost en distinto punto de
// madurez: fresco (verdoso), medio (café) y hecho (tierra negra).
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
