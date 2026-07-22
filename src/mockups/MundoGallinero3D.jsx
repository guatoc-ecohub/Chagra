import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { AdaptiveDpr, OrbitControls } from '@react-three/drei';
import { ATMOSFERA, CIELOS, PALETA, mezclar, mezclarCielo } from '../visual/mundo3d/atmosferaMadre.js';
import { CIELOS_HORA } from '../visual/mundo3d/cielosHoraData.js';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';
import { ParticulasAmbientales } from '../visual/mundo3d/ParticulasAmbientales.jsx';

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
const GALLINAS = [
  { dx: -1.0, dz: -0.4, rot: 0.1 },
  { dx: -0.1, dz: 0.4, rot: 1.7 },
  { dx: 0.7, dz: -0.6, rot: 3.2 },
  { dx: -0.5, dz: -1.2, rot: 4.5 },
  { dx: 0.9, dz: 0.6, rot: 5.6 },
  { dx: -1.3, dz: 0.4, rot: 0.8 },
  { dx: 0.2, dz: -1.1, rot: 2.5 },
  { dx: 1.3, dz: -0.2, rot: 3.8 },
];
const CULTIVOS = Array.from({ length: 18 }, (_, i) => ({
  x: 2.8 + (i % 6) * 0.55,
  z: 1.45 + Math.floor(i / 6) * 0.65,
  escala: 0.78 + ((i * 37) % 17) / 50,
}));
const POSTES = [-6.1, -2.1, 2.1, 6.1];

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

function Gallina({ objetivo, indice, reducedMotion }) {
  const grupo = useRef(null);
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
      grupo.current.rotation.y = objetivo[2];
      grupo.current.position.y = 0.2;
    } else {
      const avance = Math.min(1, delta * 1.3);
      actual.current[0] += (objetivo[0] - actual.current[0]) * avance;
      actual.current[1] += (objetivo[1] - actual.current[1]) * avance;
      grupo.current.rotation.y = objetivo[2] + Math.sin(t * 0.35) * 0.45;
      grupo.current.position.y = 0.2 + Math.max(0, Math.sin(t * 2.2)) * 0.025;
    }
    grupo.current.position.x = actual.current[0];
    grupo.current.position.z = actual.current[1];
  });
  const clara = indice % 3 === 0;
  const cuerpo = clara ? '#d9c5a1' : indice % 2 ? '#9a5431' : '#b86a38';
  return (
    <group ref={grupo} name={`gallina-${indice}`} position={[objetivo[0], 0.2, objetivo[1]]} rotation={[0, objetivo[2], 0]}>
      <mesh scale={[0.38, 0.3, 0.52]}>
        <sphereGeometry args={[0.55, 7, 5]} />
        <meshLambertMaterial color={cuerpo} flatShading />
      </mesh>
      <mesh position={[0, 0.22, -0.3]}>
        <sphereGeometry args={[0.2, 7, 5]} />
        <meshLambertMaterial color={cuerpo} flatShading />
      </mesh>
      <mesh position={[0, 0.28, -0.49]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.07, 0.18, 4]} />
        <meshLambertMaterial color={PALETA.ambar} />
      </mesh>
      <mesh position={[0, 0.43, -0.31]}>
        <coneGeometry args={[0.07, 0.14, 5]} />
        <meshLambertMaterial color="#b7432f" />
      </mesh>
      <mesh position={[0, 0.04, 0.46]} rotation={[Math.PI / 2.6, 0, 0]}>
        <coneGeometry args={[0.22, 0.45, 5]} />
        <meshLambertMaterial color={cuerpo} />
      </mesh>
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
      {CULTIVOS.map((p) => (
        <group key={`${p.x}-${p.z}`} position={[p.x, 0.38, p.z]} scale={p.escala}>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.025, 0.035, 0.42, 5]} />
            <meshLambertMaterial color={PALETA.follajeOscuro} />
          </mesh>
          <mesh position={[-0.1, 0.35, 0]} rotation={[0, 0, -0.55]}>
            <sphereGeometry args={[0.13, 6, 4]} />
            <meshLambertMaterial color={PALETA.follajeClaro} flatShading />
          </mesh>
          <mesh position={[0.1, 0.43, 0]} rotation={[0, 0, 0.55]}>
            <sphereGeometry args={[0.13, 6, 4]} />
            <meshLambertMaterial color={PALETA.follaje} flatShading />
          </mesh>
        </group>
      ))}
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

function Escena({ tier, reducedMotion, paso }) {
  const cantidad = tier === 'alto' ? 8 : tier === 'medio' ? 6 : 4;
  /* La parcela activa según el paso elegido en el DOM: de aquí sale a dónde
     caminan las gallinas y a dónde se traslada el tractor. Antes `paso`
     nunca llegaba hasta acá. */
  const activa = useMemo(() => PARCELAS.find((p) => p.id === paso) ?? PARCELAS[0], [paso]);
  return (
    <>
      <color attach="background" args={[CIELO.fondo]} />
      <fog attach="fog" args={[CIELO.niebla, 13, 31]} />
      <hemisphereLight args={[DORADA.cielo, DORADA.suelo, 1.05]} />
      <ambientLight color={DORADA.luz} intensity={0.28} />
      <directionalLight color={ATMOSFERA.luz} intensity={1.15} position={/** @type {[number, number, number]} */ (DORADA.solPos)} />
      <directionalLight color={ATMOSFERA.relleno} intensity={0.22} position={[-6, 5, -3]} />
      <Terreno pasoActivo={activa.id} />
      <Cerca />
      <TractorGallinas objetivo={[activa.x, activa.z]} reducedMotion={reducedMotion} />
      <Ponedero />
      <Huerto />
      <FlechasCiclo />
      {GALLINAS.slice(0, cantidad).map((g, i) => (
        <Gallina key={i} indice={i} reducedMotion={reducedMotion} objetivo={[activa.x + g.dx, activa.z + g.dz, g.rot]} />
      ))}
      <ParticulasAmbientales tipo="polen" tier={tier} reducedMotion={reducedMotion} area={[12, 2.5, 8]} semilla={712} />
      <OrbitControls makeDefault enablePan={false} minDistance={7} maxDistance={19} minPolarAngle={0.48} maxPolarAngle={1.3} target={[0, 0.5, 0]} autoRotate={!reducedMotion} autoRotateSpeed={0.18} />
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
@media(max-width:640px){.mgall-ui{padding:.7rem}.mgall-ciclo{width:min(16rem,72vw)}.mgall-ciclo small{display:none}.mgall-ciclo button[aria-pressed="true"] small{display:block}.mgall-pie{font-size:.69rem}}
@media(prefers-reduced-motion:reduce){.mgall-canvas{transition:none}}
`;

export default function MundoGallinero3D({ onBack }) {
  const [listo, setListo] = useState(false);
  const [paso, setPaso] = useState('pastoreo');
  const [{ tier, reducedMotion }] = useState(decidirTier);
  const perfil = useMemo(() => perfilDeTier(tier), [tier]);
  return (
    <section className="mgall-root" data-tier={tier} aria-label="Mundo del gallinero con pastoreo rotativo">
      <style>{CSS}</style>
      <Canvas className="mgall-canvas" data-lista={listo} dpr={perfil.dpr} frameloop={reducedMotion ? 'demand' : 'always'} gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }} camera={{ position: [11, 8.5, 12], fov: 43 }} onCreated={() => setListo(true)}>
        <Escena tier={tier} reducedMotion={reducedMotion} paso={paso} />
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
