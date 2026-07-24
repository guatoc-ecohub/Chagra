import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdaptiveDpr, Html, OrbitControls } from '@react-three/drei';
import { ATMOSFERA, CIELOS, PALETA, mezclar, mezclarCielo } from '../visual/mundo3d/atmosferaMadre.js';
import { ACENTOS, VERDES, TIERRAS } from '../visual/mundo3d/paleta/paletaMadre.js';
import { CIELOS_HORA } from '../visual/mundo3d/cielosHoraData.js';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';
import { ParticulasAmbientales } from '../visual/mundo3d/ParticulasAmbientales.jsx';
import { Gallina as GallinaCriolla } from '../visual/creatures/Gallina.jsx';

const CIELO = mezclarCielo(CIELOS.corral);
const DORADA = CIELOS_HORA.dorada;
const PARCELAS = [
  { id: 'pastoreo', nombre: '1. Pastoreo', detalle: 'Las gallinas comen hierba e insectos.', x: -4.2, z: -1.8, color: '#6f963f' },
  { id: 'traslado', nombre: '2. Traslado', detalle: 'El tractor se mueve antes de desnudar el suelo.', x: 0, z: -1.8, color: '#8da84c' },
  { id: 'descanso', nombre: '3. Descanso', detalle: 'La parcela reposa, absorbe el abono y se regenera.', x: 4.2, z: -1.8, color: '#a7b85e' },
  { id: 'huerto', nombre: '4. Huerto aliado', detalle: 'Después del descanso, las gallinas ayudan con plagas y fertilidad.', x: 4.2, z: 2.6, color: '#557f39' },
];
/* Posiciones RELATIVAS al centro de la parcela activa (no absolutas): así
   las 8 gallinas se reparten a donde esté `paso` en vez de vivir siempre en
   la parcela 1. Conserva el mismo patrón de dispersión que tenían las
   coordenadas originales (todas caían dentro de una sola parcela). */
/* Anillo alrededor del tractor (que va al CENTRO de la parcela activa): la
   dispersión anterior (radios 1.3–1.8 pero billboards grandes) apilaba las 7
   gallinas en una sola mancha que TAPABA el tractor entero — el protagonista
   de "el gallinero que camina" quedaba escondido tras su propia parvada.
   Radios estirados al borde de la parcela + tallas menores (abajo). */
const GALLINAS = [
  { dx: -1.7, dz: -0.6, rot: 0.1 },
  { dx: -0.35, dz: 1.55, rot: 1.7 },
  { dx: 1.4, dz: -1.15, rot: 3.2 },
  { dx: -1.05, dz: -1.6, rot: 4.5 },
  { dx: 1.7, dz: 1.05, rot: 5.6 },
  { dx: -1.8, dz: 0.9, rot: 0.8 },
  { dx: 0.45, dz: -1.7, rot: 2.5 },
  { dx: 1.85, dz: -0.1, rot: 3.8 },
];
/* Matas del huerto: antes eran 18 CLONES (misma escala visual, mismo verde,
   mismo giro). Cada mata rompe ahora en escala, tono, giro (ángulo áureo:
   nunca dos vecinas igual) y un ladeo leve — determinista, sin Math.random. */
const CULTIVOS = Array.from({ length: 18 }, (_, i) => ({
  x: 2.8 + (i % 6) * 0.55 + (((i * 31) % 7) - 3) / 38,
  z: 1.45 + Math.floor(i / 6) * 0.65 + (((i * 17) % 5) - 2) / 40,
  escala: 0.62 + ((i * 37) % 17) / 34,
  giro: (i * 2.39996) % (Math.PI * 2),
  ladeo: (((i * 29) % 9) - 4) / 34,
  tono: (i * 53) % 3,
  fruto: i % 6 === 2,
}));
const POSTES = [-6.1, -2.1, 2.1, 6.1];
const VISTAS_PASO = {
  pastoreo: { posicion: [-9.4, 5.2, 7.2], mira: [-4.2, 0.55, -1.8] },
  traslado: { posicion: [7.4, 4.7, 8.2], mira: [0, 0.7, -1.8] },
  descanso: { posicion: [10.2, 5.1, 5.8], mira: [4.2, 0.5, -1.8] },
  huerto: { posicion: [8.4, 4.2, 10.2], mira: [4.2, 0.7, 2.6] },
};

function CamaraPaso({ paso, controls, reducedMotion }) {
  const { camera } = useThree();
  const viaje = useRef(null);
  const pasoAnterior = useRef(paso);

  useEffect(() => {
    if (paso === pasoAnterior.current) return;
    pasoAnterior.current = paso;
    const vista = VISTAS_PASO[paso];
    const control = controls.current;
    if (!vista || !control) return;
    viaje.current = {
      progreso: 0,
      duracion: reducedMotion ? 0.001 : 1.1,
      desdePosicion: camera.position.clone(),
      haciaPosicion: new THREE.Vector3(...vista.posicion),
      desdeMira: control.target.clone(),
      haciaMira: new THREE.Vector3(...vista.mira),
    };
  }, [camera, controls, paso, reducedMotion]);

  useFrame((_, delta) => {
    const estado = viaje.current;
    const control = controls.current;
    if (!estado || !control) return;
    estado.progreso = Math.min(1, estado.progreso + delta / estado.duracion);
    const t = estado.progreso;
    const suave = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
    camera.position.lerpVectors(estado.desdePosicion, estado.haciaPosicion, suave);
    control.target.lerpVectors(estado.desdeMira, estado.haciaMira, suave);
    control.update();
    if (estado.progreso === 1) viaje.current = null;
  });

  return null;
}

/* LOMAS del horizonte: la vereda que faltaba para que la losa no flotara en
   crema. Anillo completo (la cámara auto-rota 360°) en dos planos de
   perspectiva aérea: las cercanas con el verde de trabajo, las lejanas ya
   comidas por la niebla dorada. Todo de la paleta madre, cero hex nuevo. */
const LOMAS = Array.from({ length: 12 }, (_, i) => {
  const ang = (i / 12) * Math.PI * 2 + (i % 3) * 0.19;
  const lejos = i % 2 === 1;
  const dist = lejos ? 27 + ((i * 7) % 5) : 19 + ((i * 5) % 4);
  return {
    x: Math.cos(ang) * dist,
    z: Math.sin(ang) * dist,
    r: (lejos ? 9.5 : 6.5) + ((i * 13) % 5),
    alto: 0.3 + ((i * 11) % 4) / 16,
    /* Mezclas subidas (0.4→0.62 / 0.16→0.3): con las anteriores la loma
       lejana salía como montículo de barro pardo comiéndose el tercio alto
       del cuadro; con más niebla encima sí se lee perspectiva aérea. */
    color: lejos
      ? mezclar(VERDES.templado, CIELO.niebla, 0.62)
      : mezclar(VERDES.trabajo, CIELO.niebla, 0.3),
  };
});
/* Arbolitos de vereda sobre la sabana (escala y respiro entre la losa y las
   lomas): matas de monte sueltas, ninguna igual a la otra. */
const ARBOLES_VEREDA = [
  { x: -11.5, z: -8, e: 1.25 }, { x: 13, z: -6.5, e: 0.95 }, { x: 10.5, z: 8.5, e: 1.4 },
  { x: -12.5, z: 6.5, e: 1.05 }, { x: 3, z: -11.5, e: 1.5 }, { x: -5, z: 11.6, e: 0.85 },
  { x: 15.5, z: 2.5, e: 1.2 },
];

function Terreno({ pasoActivo }) {
  return (
    <>
      <mesh position={[0, -0.2, 0]}>
        <boxGeometry args={[14, 0.35, 9]} />
        <meshLambertMaterial color={PALETA.tierraClara} />
      </mesh>
      {PARCELAS.map((p) => {
        const activa = p.id === pasoActivo;
        /* La parcela activa se distingue por estado (no solo por su hex fijo
           de rol): se aclara hacia PALETA.cal y se levanta un poco. Nada de
           geometría nueva, solo el color/alto que ya existían reaccionando
           al paso elegido. */
        const color = activa ? mezclar(p.color, PALETA.cal, 0.45) : p.color;
        return (
          <mesh key={p.id} name={`parcela-${p.id}`} position={[p.x, activa ? 0.05 : 0.01, p.z]}>
            <boxGeometry args={[3.75, 0.18, 3.8]} />
            <meshLambertMaterial color={color} flatShading />
          </mesh>
        );
      })}
      <mesh position={[-2.1, 0.02, 2.6]}>
        <boxGeometry args={[3.75, 0.18, 3.8]} />
        <meshLambertMaterial color={mezclar(PALETA.tierra, PALETA.follaje, 0.18)} />
      </mesh>
    </>
  );
}

/* La VEREDA que sostiene la maqueta: sabana de pasto + anillo de lomas con
   perspectiva aérea + arbolitos sueltos. Antes la losa flotaba sobre crema
   plano y se leía como diorama de feria escolar; ahora el gallinero es un
   potrero DE un paisaje. Colores de la paleta madre; la niebla dorada de la
   atmósfera se come las lomas lejanas (aérea, no lechosa). */
function Horizonte() {
  return (
    <group name="horizonte">
      {/* sabana de pasto cálido bajo la losa */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.42, 0]}>
        <circleGeometry args={[48, 30]} />
        <meshLambertMaterial color={mezclar(VERDES.calido, TIERRAS.vega, 0.34)} />
      </mesh>
      {/* el camino de tierra que llega al gallinero (continuidad con la finca) */}
      <mesh rotation={[-Math.PI / 2, 0, 0.35]} position={[-8.5, -0.4, 6.5]}>
        <planeGeometry args={[2.1, 16, 1, 1]} />
        <meshLambertMaterial color={TIERRAS.camino} />
      </mesh>
      {LOMAS.map((l, i) => (
        <mesh key={i} position={[l.x, -0.5, l.z]} scale={[1, l.alto, 0.82]}>
          <sphereGeometry args={[l.r, 8, 5]} />
          <meshLambertMaterial color={l.color} flatShading />
        </mesh>
      ))}
      {ARBOLES_VEREDA.map((a, i) => (
        <group key={i} position={[a.x, -0.42, a.z]} scale={a.e}>
          <mesh position={[0, 0.55, 0]}>
            <cylinderGeometry args={[0.09, 0.14, 1.1, 5]} />
            <meshLambertMaterial color={PALETA.maderaOscura} />
          </mesh>
          <mesh position={[0, 1.35, 0]}>
            <sphereGeometry args={[0.85, 7, 5]} />
            <meshLambertMaterial color={mezclar(VERDES.monte, CIELO.niebla, 0.14)} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Cerca() {
  const lineas = [-4.05, 0.05, 4.35];
  return (
    <group>
      {POSTES.flatMap((x) => [-3.85, 0.25, 4.55].map((z) => (
        <mesh key={`${x}-${z}`} position={[x, 0.48, z]}>
          <cylinderGeometry args={[0.055, 0.075, 1.15, 6]} />
          <meshLambertMaterial color={PALETA.maderaOscura} />
        </mesh>
      )))}
      {lineas.map((x) => (
        <mesh key={x} position={[x, 0.55, 0.25]}>
          <boxGeometry args={[0.025, 0.025, 8.15]} />
          <meshBasicMaterial color={PALETA.lamina} />
        </mesh>
      ))}
      {[-3.75, 0.25, 4.45].map((z) => (
        <mesh key={z} position={[0, 0.55, z]}>
          <boxGeometry args={[12.2, 0.025, 0.025]} />
          <meshBasicMaterial color={PALETA.lamina} />
        </mesh>
      ))}
    </group>
  );
}

/* Sombra suave bajo cada gallina (el billboard no proyecta sombra 3D). */
const ESTILO_GALLINA = {
  filter: 'drop-shadow(0 2px 3px rgba(71, 49, 20, 0.32))',
  pointerEvents: 'none',
  transition: 'transform .25s ease',
};

/* La gallina RUBBER-HOSE de la casa (SVG de creatures/) como billboard <Html>
   — el mismo patrón de AbejaDelEnjambre en MundoAbejas3D y de los vecinos del
   Bosque Vivo. NADA de esferas y conos procedurales: la fauna de Chagra se
   dibuja, no se extruye. El lerp hacia `objetivo` (el cableado del paso) se
   conserva tal cual; encima va el arte: mientras camina va en pose 'anda'
   (cabeceo de gallina + paso alternado) y al llegar picotea. Mira hacia donde
   va (flip del SVG por el rumbo real, con histéresis para no parpadear). */
function Gallina({ objetivo, indice, reducedMotion, tier }) {
  const grupo = useRef(null);
  const capa = useRef(/** @type {HTMLDivElement|null} */ (null));
  const mirando = useRef(1);
  const andando = useRef(false);
  /* `actual` guarda la posición viva de la gallina; `objetivo` es a donde
     debe llegar según el paso elegido. Cada frame camina un poco hacia allá
     en vez de teletransportarse — el prop declarativo de abajo ya la deja en
     el punto correcto en cuanto cambia `paso` (para quien no anima frames),
     y aquí se suaviza el tránsito cuando sí hay animación. */
  const actual = useRef([objetivo[0], objetivo[1]]);
  useFrame(({ clock }, delta) => {
    if (!grupo.current) return;
    const t = clock.elapsedTime * 1.8 + indice;
    if (reducedMotion) {
      actual.current[0] = objetivo[0];
      actual.current[1] = objetivo[1];
      grupo.current.position.y = 0;
    } else {
      const dx = objetivo[0] - actual.current[0];
      const dz = objetivo[1] - actual.current[1];
      const lejos = Math.hypot(dx, dz);
      const avance = Math.min(1, delta * 1.3);
      actual.current[0] += dx * avance;
      actual.current[1] += dz * avance;
      /* Estado de marcha → pose del SVG vía dataset (cero re-renders):
         caminando cabecea y da pasos; llegada, picotea el pasto. */
      const anda = lejos > 0.22;
      if (capa.current && anda !== andando.current) {
        andando.current = anda;
        capa.current.dataset.marcha = anda ? 'anda' : 'picotea';
      }
      /* brinquitos cortos SOLO en marcha (el trotecito de gallina) */
      grupo.current.position.y = anda ? Math.abs(Math.sin(t * 4.6)) * 0.06 : 0;
      /* flip por rumbo real, con histéresis */
      const dir = dx < -0.05 ? -1 : dx > 0.05 ? 1 : mirando.current;
      if (dir !== mirando.current && capa.current) {
        mirando.current = dir;
        /* el SVG mira a la IZQUIERDA (−x): rumbo +x = espejo */
        capa.current.style.transform = dir > 0 ? 'scaleX(-1)' : '';
      }
    }
    grupo.current.position.x = actual.current[0];
    grupo.current.position.z = actual.current[1];
  });
  /* Dos plumajes + tres tallas: parvada criolla, no clonada. Talla bajada
     (52–62 → 40–48): con la anterior cada billboard medía ~1.2 unidades de
     mundo y entre 7 se montaban en una pila de calcomanías; a esta talla cada
     gallina se lee sola y el tractor respira detrás. */
  const clara = indice % 3 === 0;
  const talla = 40 + ((indice * 7) % 3) * 4;
  return (
    <group ref={grupo} name={`gallina-${indice}`} position={[objetivo[0], 0, objetivo[1]]}>
      {/* sombra de contacto en el pasto (ancla la parada) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.115, 0]}>
        <circleGeometry args={[0.3, 12]} />
        <meshBasicMaterial color={ATMOSFERA.sombra} transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <Html center distanceFactor={10} position={[0, 0.62, 0]} zIndexRange={[4, 0]} pointerEvents="none">
        <div ref={capa} aria-hidden="true" data-parvada="gallina" data-marcha="picotea" style={ESTILO_GALLINA}>
          <GallinaCriolla
            size={talla}
            plumaje={clara ? 'clara' : 'colorada'}
            pose={reducedMotion ? 'reposo' : 'picotea'}
            compas={-((indice * 0.53) % 2.9)}
            animated={!reducedMotion}
            tier={tier}
          />
        </div>
      </Html>
    </group>
  );
}

function TractorGallinas({ objetivo, reducedMotion }) {
  const grupo = useRef(null);
  const actual = useRef([objetivo[0], objetivo[1]]);
  useFrame((_state, delta) => {
    if (!grupo.current) return;
    if (reducedMotion) {
      actual.current[0] = objetivo[0];
      actual.current[1] = objetivo[1];
    } else {
      const avance = Math.min(1, delta * 0.9);
      actual.current[0] += (objetivo[0] - actual.current[0]) * avance;
      actual.current[1] += (objetivo[1] - actual.current[1]) * avance;
    }
    grupo.current.position.x = actual.current[0];
    grupo.current.position.z = actual.current[1];
  });
  return (
    <group ref={grupo} name="tractor-gallinas" position={[objetivo[0], 0.25, objetivo[1]]}>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[2.5, 1.05, 1.8]} />
        <meshLambertMaterial color={PALETA.maderaClara} transparent opacity={0.35} />
      </mesh>
      {[-1.15, 1.15].flatMap((x) => [-0.75, 0.75].map((z) => (
        <mesh key={`${x}-${z}`} position={[x, 0.62, z]}>
          <boxGeometry args={[0.1, 1.25, 0.1]} />
          <meshLambertMaterial color={PALETA.maderaOscura} />
        </mesh>
      )))}
      <mesh position={[0, 1.33, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[1.65, 0.65, 4]} />
        <meshLambertMaterial color="#b86b3d" flatShading />
      </mesh>
      {[-0.9, 0.9].map((x) => (
        <mesh key={x} position={[x, 0.2, 0.95]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.25, 0.06, 6, 10]} />
          <meshLambertMaterial color={PALETA.maderaOscura} />
        </mesh>
      ))}
      <mesh position={[0, 0.34, 0.89]}>
        <boxGeometry args={[0.9, 0.62, 0.08]} />
        <meshLambertMaterial color={PALETA.follajeOscuro} />
      </mesh>
    </group>
  );
}

function Ponedero() {
  return (
    <group position={[-2.15, 0.2, 2.7]}>
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[2.25, 1.35, 1.55]} />
        <meshLambertMaterial color={PALETA.maderaClara} />
      </mesh>
      <mesh position={[0, 1.52, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[1.35, 1.35, 1.85]} />
        <meshLambertMaterial color="#9b5937" />
      </mesh>
      <mesh position={[0, 0.72, 0.79]}>
        <boxGeometry args={[1.35, 0.72, 0.08]} />
        <meshBasicMaterial color="#372a1d" />
      </mesh>
      {[-0.38, 0, 0.38].map((x) => (
        <mesh key={x} position={[x, 0.43, 0.88]} scale={[0.8, 1, 0.7]}>
          <sphereGeometry args={[0.14, 8, 6]} />
          <meshLambertMaterial color={PALETA.cal} />
        </mesh>
      ))}
      <mesh position={[1.45, 0.22, 0]}>
        <cylinderGeometry args={[0.34, 0.26, 0.38, 10]} />
        <meshLambertMaterial color={PALETA.lamina} />
      </mesh>
      <mesh position={[1.45, 0.48, 0]}>
        <cylinderGeometry args={[0.12, 0.22, 0.42, 10]} />
        <meshLambertMaterial color={PALETA.ambar} />
      </mesh>
    </group>
  );
}

function Huerto() {
  return (
    <group>
      {[1.55, 2.2, 2.85, 3.5].map((z) => (
        <mesh key={z} position={[4.2, 0.18, z]}>
          <boxGeometry args={[3.15, 0.28, 0.42]} />
          <meshLambertMaterial color={PALETA.tierra} />
        </mesh>
      ))}
      {CULTIVOS.map((p) => {
        /* Tres familias de verde por mata (brote/trabajo/monte) para que el
           surco se lea como huerta viva y no como 18 copias del mismo arbolito. */
        const copaA = p.tono === 0 ? VERDES.brote : p.tono === 1 ? VERDES.trabajo : mezclar(VERDES.monte, VERDES.trabajo, 0.4);
        const copaB = p.tono === 0 ? VERDES.trabajo : p.tono === 1 ? VERDES.brote : VERDES.monte;
        return (
          <group key={`${p.x}-${p.z}`} position={[p.x, 0.38, p.z]} scale={p.escala} rotation={[0, p.giro, p.ladeo]}>
            <mesh position={[0, 0.2, 0]}>
              <cylinderGeometry args={[0.025, 0.035, 0.42, 5]} />
              <meshLambertMaterial color={PALETA.follajeOscuro} />
            </mesh>
            <mesh position={[-0.1, 0.35, 0]} rotation={[0, 0, -0.55]}>
              <sphereGeometry args={[0.12 + (p.tono === 2 ? 0.05 : 0), 6, 4]} />
              <meshLambertMaterial color={copaA} flatShading />
            </mesh>
            <mesh position={[0.1, 0.43, 0]} rotation={[0, 0, 0.55]}>
              <sphereGeometry args={[0.13, 6, 4]} />
              <meshLambertMaterial color={copaB} flatShading />
            </mesh>
            {/* una que otra mata con su tomate madurando (acento a cucharadas) */}
            {p.fruto && (
              <mesh position={[0.05, 0.28, 0.1]}>
                <sphereGeometry args={[0.05, 6, 4]} />
                <meshLambertMaterial color={ACENTOS.cafeCereza} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

function FlechasCiclo() {
  return PARCELAS.map((p, i) => {
    const siguiente = PARCELAS[(i + 1) % PARCELAS.length];
    const dx = siguiente.x - p.x;
    const dz = siguiente.z - p.z;
    const largo = Math.hypot(dx, dz);
    return (
      <group key={p.id} position={[p.x + dx / 2, 0.37, p.z + dz / 2]} rotation={[0, Math.atan2(dx, dz), 0]}>
        <mesh>
          <boxGeometry args={[0.08, 0.04, Math.max(0.5, largo - 3.2)]} />
          <meshBasicMaterial color={PALETA.ambar} />
        </mesh>
        <mesh position={[0, 0, Math.max(0.28, largo / 2 - 1.55)]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.16, 0.35, 5]} />
          <meshBasicMaterial color={PALETA.ambar} />
        </mesh>
      </group>
    );
  });
}

function Escena({ tier, reducedMotion, paso, vertical }) {
  const cantidad = tier === 'alto' ? 8 : tier === 'medio' ? 6 : 4;
  /* La parcela activa según el paso elegido en el DOM: de aquí sale a dónde
     caminan las gallinas y a dónde se traslada el tractor. Antes `paso`
     nunca llegaba hasta acá. */
  const activa = useMemo(() => PARCELAS.find((p) => p.id === paso) ?? PARCELAS[0], [paso]);
  const controls = useRef(null);
  return (
    <>
      <color attach="background" args={[CIELO.fondo]} />
      {/* niebla más honda que antes (13→31): ahora hay lomas que comer con
          perspectiva aérea en vez de cortar la losa contra el vacío */}
      <fog attach="fog" args={[CIELO.niebla, 15, 44]} />
      <hemisphereLight args={[DORADA.cielo, DORADA.suelo, 1.05]} />
      <ambientLight color={DORADA.luz} intensity={0.28} />
      <directionalLight color={ATMOSFERA.luz} intensity={1.15} position={/** @type {[number, number, number]} */ (DORADA.solPos)} />
      <directionalLight color={ATMOSFERA.relleno} intensity={0.22} position={[-6, 5, -3]} />
      <Horizonte />
      <Terreno pasoActivo={activa.id} />
      <Cerca />
      <TractorGallinas objetivo={[activa.x, activa.z]} reducedMotion={reducedMotion} />
      <Ponedero />
      <Huerto />
      <FlechasCiclo />
      {GALLINAS.slice(0, cantidad).map((g, i) => (
        <Gallina key={i} indice={i} tier={tier} reducedMotion={reducedMotion} objetivo={[activa.x + g.dx, activa.z + g.dz, g.rot]} />
      ))}
      <ParticulasAmbientales tipo="polen" tier={tier} reducedMotion={reducedMotion} area={[12, 2.5, 8]} semilla={712} />
      {/* Encuadre por orientación: en retrato la cámara sube y se aleja para
          que la losa ENTERA quepa, y el target baja para dejarle a la banda
          inferior (panel del ciclo) aire sin tapar la parvada. */}
      <OrbitControls ref={controls} makeDefault enablePan={false} minDistance={7} maxDistance={vertical ? 26 : 19} minPolarAngle={0.48} maxPolarAngle={1.3} target={vertical ? [0, -0.8, 0] : [0, 0.5, 0]} autoRotate={!reducedMotion} autoRotateSpeed={0.18} />
      <CamaraPaso paso={paso} controls={controls} reducedMotion={reducedMotion} />
      <AdaptiveDpr pixelated />
    </>
  );
}

const CSS = `
.mgall-root{position:relative;width:100%;height:100vh;min-height:420px;overflow:hidden;background:${CIELO.fondo};color:#302719;font-family:Georgia,'Times New Roman',serif}
.mgall-canvas{position:absolute!important;inset:0;opacity:0;transition:opacity .6s ease}.mgall-canvas[data-lista="true"]{opacity:1}
.mgall-ui{position:absolute;inset:0;pointer-events:none;display:flex;flex-direction:column;justify-content:space-between;padding:clamp(.8rem,2vw,1.5rem)}
.mgall-cabecera{max-width:34rem;text-shadow:0 1px 5px rgba(255,244,210,.9)}.mgall-kicker{margin:0 0 .3rem;font:700 .68rem/1.2 ui-sans-serif,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#68542d}.mgall-titulo{margin:0;font-size:clamp(1.55rem,4vw,2.7rem);line-height:.95}.mgall-bajada{margin:.55rem 0 0;max-width:28rem;font:600 clamp(.76rem,1.7vw,.92rem)/1.4 ui-sans-serif,sans-serif;color:#4d432c}
.mgall-ciclo{pointer-events:auto;align-self:flex-start;display:grid;gap:.34rem;width:min(19rem,72vw);margin:0;padding:.48rem;list-style:none;border:1px solid rgba(89,72,38,.2);border-radius:1rem;background:rgba(255,248,222,.78);backdrop-filter:blur(5px);box-shadow:0 8px 24px rgba(67,49,24,.13)}
.mgall-ciclo button{width:100%;border:0;border-radius:.7rem;padding:.43rem .58rem;text-align:left;background:transparent;color:#453921;font:700 .77rem/1.2 ui-sans-serif,sans-serif;cursor:pointer}.mgall-ciclo button:hover,.mgall-ciclo button[aria-pressed="true"]{background:rgba(111,150,63,.2)}.mgall-ciclo small{display:block;margin-top:.17rem;font-weight:500;line-height:1.3;opacity:.82}
.mgall-pie{align-self:center;max-width:42rem;margin:0;text-align:center;padding:.5rem .85rem;border-radius:.8rem;background:rgba(46,39,24,.72);color:#fff8dc;font:600 .76rem/1.4 ui-sans-serif,sans-serif;box-shadow:0 5px 18px rgba(45,33,15,.15)}
.mgall-volver{pointer-events:auto;position:absolute;right:1rem;top:1rem;border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:.48rem .8rem;background:rgba(49,43,27,.65);color:#fff8dc;font:700 .76rem/1 ui-sans-serif,sans-serif;cursor:pointer}
/* Móvil (el cuadro objetivo de Chagra): la cabecera se compacta y el panel del
   ciclo baja a la BANDA INFERIOR en 2×2 — antes flotaba al centro-izquierda y
   tapaba a las gallinas. El detalle del paso ya lo cuenta el pie, así que los
   <small> se ocultan y los 4 botones caben en dos filas sin tocar la escena. */
@media(max-width:640px){.mgall-ui{padding:.7rem;justify-content:flex-start}.mgall-cabecera{max-width:100%}.mgall-titulo{font-size:1.45rem}.mgall-bajada{max-width:22rem;font-size:.72rem}.mgall-ciclo{margin-top:auto;width:100%;grid-template-columns:repeat(2,1fr);gap:.3rem;padding:.4rem}.mgall-ciclo button{padding:.42rem .5rem;font-size:.72rem}.mgall-ciclo small{display:none}.mgall-pie{align-self:stretch;max-width:none;margin-top:.45rem;font-size:.69rem;padding:.42rem .6rem}}
@media(prefers-reduced-motion:reduce){.mgall-canvas{transition:none}}
`;

export default function MundoGallinero3D({ onBack }) {
  const [listo, setListo] = useState(false);
  const [paso, setPaso] = useState('pastoreo');
  const [{ tier, reducedMotion }] = useState(decidirTier);
  /* Retrato (el móvil 390×844, el objetivo de Chagra): cámara más alta y
     lejana para que la losa entera entre en cuadro. Se decide al montar,
     como el tier (girar el teléfono re-monta rutas, no hace falta listener). */
  const [vertical] = useState(() => typeof window !== 'undefined' && window.innerHeight > window.innerWidth * 1.15);
  const perfil = useMemo(() => perfilDeTier(tier), [tier]);
  return (
    <section className="mgall-root" data-tier={tier} aria-label="Mundo del gallinero con pastoreo rotativo">
      <style>{CSS}</style>
      <Canvas className="mgall-canvas" data-lista={listo} data-paso={paso} dpr={perfil.dpr} frameloop={reducedMotion ? 'demand' : 'always'} gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }} camera={vertical ? { position: [13.5, 12.5, 16], fov: 47 } : { position: [11, 8.5, 12], fov: 43 }} onCreated={() => setListo(true)}>
        <Escena tier={tier} reducedMotion={reducedMotion} paso={paso} vertical={vertical} />
      </Canvas>
      <div className="mgall-ui">
        <header className="mgall-cabecera">
          <p className="mgall-kicker">Avicultura agroecologica</p>
          <h1 className="mgall-titulo">El gallinero que camina</h1>
          <p className="mgall-bajada">Mueva el refugio, deje descansar el pasto y convierta cada recorrido en alimento, control de plagas y abono.</p>
        </header>
        <ol className="mgall-ciclo" aria-label="Ciclo del pastoreo rotativo">
          {PARCELAS.map((p) => (
            <li key={p.id}><button type="button" aria-pressed={paso === p.id} onClick={() => setPaso(p.id)}>{p.nombre}<small>{p.detalle}</small></button></li>
          ))}
        </ol>
        <p className="mgall-pie" role="status">{PARCELAS.find((p) => p.id === paso)?.detalle} Así usted evita el sobrepastoreo y devuelve vida al suelo.</p>
      </div>
      {onBack ? <button type="button" className="mgall-volver" onClick={onBack}>Volver</button> : null}
    </section>
  );
}
