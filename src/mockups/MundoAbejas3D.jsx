/*
 * MundoAbejas3D: diorama standalone sobre polinizacion, miel y conservacion.
 * Todo es procedural, local y determinista. Las abejas nativas sin aguijon
 * comparten el paisaje con colmenas Langstroth, sin confundir sus viviendas.
 */
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { AdaptiveDpr, OrbitControls } from '@react-three/drei';
import { ATMOSFERA, PALETA, mezclar } from '../visual/mundo3d/atmosferaMadre.js';
import { CIELOS_HORA } from '../visual/mundo3d/cielosHoraData.js';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';
import { ParticulasAmbientales } from '../visual/mundo3d/ParticulasAmbientales.jsx';

const DORADA = CIELOS_HORA.dorada;
const COLORES = {
  pasto: mezclar(PALETA.pasto || '#789447', DORADA.luz, 0.16),
  tierra: mezclar(PALETA.tierra || '#795438', DORADA.luz, 0.12),
  madera: PALETA.madera || '#895a31',
  maderaClara: mezclar(PALETA.madera || '#895a31', '#f1c56b', 0.42),
  hoja: PALETA.follaje || '#55783e',
  miel: '#f3a91d',
  cera: '#f4cf62',
  blanco: '#f8efd9',
};

const ABEJAS = [
  [-3.7, 2.15, 1.8, 0.1], [-2.7, 1.65, 2.9, 1.4], [-1.7, 2.4, 1.25, 2.3],
  [0.4, 2.2, 2.7, 3.1], [1.8, 1.55, 1.6, 4.4], [3.2, 2.35, 2.35, 5.2],
  [4.1, 1.8, 0.7, 0.8], [-0.2, 1.45, -0.7, 2.8], [2.4, 2.65, -1.3, 4.9],
];
const FLORES = [
  [-4.8, 0.45, 2.5, '#f6bf3c'], [-4.1, 0.4, 3.4, '#fff1bb'],
  [-3.3, 0.5, 2.7, '#d780a5'], [-2.5, 0.42, 3.5, '#f6bf3c'],
  [-1.8, 0.48, 2.4, '#fff1bb'], [0.2, 0.44, 3.6, '#d780a5'],
  [1.2, 0.52, 3.0, '#f6bf3c'], [2.2, 0.4, 3.7, '#fff1bb'],
  [3.1, 0.48, 2.8, '#d780a5'], [4.0, 0.45, 3.5, '#f6bf3c'],
  [4.8, 0.5, 2.6, '#fff1bb'], [5.2, 0.42, 1.8, '#d780a5'],
];
const TARJETAS = [
  {
    id: 'polinizacion', numero: '01', titulo: 'Polinizacion que da fruto',
    texto: 'Al visitar una flor, la abeja lleva polen a la siguiente. Ese viaje ayuda a que muchas plantas formen frutos y semillas.',
  },
  {
    id: 'miel', numero: '02', titulo: 'Miel, cera y cuidado',
    texto: 'Las abejas transforman nectar y guardan miel en panales de cera. Una cosecha responsable deja alimento suficiente para la colonia.',
  },
  {
    id: 'nativas', numero: '03', titulo: 'Meliponas nativas',
    texto: 'Las abejas sin aguijon viven en cajas distintas y producen poca miel valiosa. Conservar flores y sitios de anidacion protege su diversidad.',
  },
];

function Flor({ posicion, color }) {
  return (
    <group position={posicion}>
      <mesh position={[0, -0.24, 0]}><cylinderGeometry args={[0.035, 0.05, 0.55, 6]} /><meshLambertMaterial color={COLORES.hoja} /></mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[Math.cos(i * 1.256) * 0.13, 0, Math.sin(i * 1.256) * 0.13]} rotation={[-Math.PI / 2, 0, i * 1.256]}>
          <circleGeometry args={[0.12, 7]} /><meshLambertMaterial color={color} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, 0.025, 0]}><sphereGeometry args={[0.075, 8, 6]} /><meshLambertMaterial color="#7b4b20" /></mesh>
    </group>
  );
}

function ColmenaLangstroth({ posicion }) {
  return (
    <group position={posicion}>
      <mesh position={[0, 0.28, 0]}><boxGeometry args={[1.45, 0.12, 1.05]} /><meshLambertMaterial color={COLORES.madera} /></mesh>
      <mesh position={[0, 0.75, 0]}><boxGeometry args={[1.35, 0.82, 0.95]} /><meshLambertMaterial color={COLORES.blanco} /></mesh>
      <mesh position={[0, 1.18, 0]}><boxGeometry args={[1.55, 0.12, 1.12]} /><meshLambertMaterial color="#c78a45" /></mesh>
      <mesh position={[0, 0.46, 0.49]}><boxGeometry args={[0.48, 0.08, 0.08]} /><meshBasicMaterial color="#3a2818" /></mesh>
      {[-0.55, 0.55].map((x) => <mesh key={x} position={[x, 0.12, 0]}><boxGeometry args={[0.12, 0.25, 1.1]} /><meshLambertMaterial color={COLORES.madera} /></mesh>)}
    </group>
  );
}

function CajaMelipona() {
  return (
    <group position={[3.65, 0.22, -1.7]}>
      <mesh position={[0, 0.55, 0]}><boxGeometry args={[1.15, 0.75, 0.8]} /><meshLambertMaterial color={COLORES.maderaClara} /></mesh>
      <mesh position={[0, 0.97, 0]}><boxGeometry args={[1.32, 0.1, 0.96]} /><meshLambertMaterial color={COLORES.madera} /></mesh>
      <mesh position={[0, 0.55, 0.43]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.11, 0.045, 6, 12]} /><meshLambertMaterial color="#6d3b22" /></mesh>
      <mesh position={[0, 0.55, 0.44]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.055, 0.055, 0.14, 8]} /><meshBasicMaterial color="#24170f" /></mesh>
      <mesh position={[0, 0.11, 0]}><cylinderGeometry args={[0.7, 0.8, 0.18, 8]} /><meshLambertMaterial color={COLORES.tierra} /></mesh>
    </group>
  );
}

function Panal() {
  const celdas = useMemo(() => {
    const lista = [];
    for (let fila = -2; fila <= 2; fila++) {
      for (let col = -2; col <= 2; col++) {
        if (Math.abs(fila) + Math.abs(col) < 4) lista.push([col * 0.24 + (fila % 2) * 0.12, fila * 0.205]);
      }
    }
    return lista;
  }, []);
  return (
    <group position={[0.55, 1.1, -2.4]} rotation={[0, -0.18, 0]}>
      <mesh><boxGeometry args={[1.65, 1.55, 0.12]} /><meshLambertMaterial color={COLORES.madera} /></mesh>
      {celdas.map(([x, y]) => (
        <mesh key={`${x}-${y}`} position={[x, y, 0.11]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.125, 0.125, 0.11, 6]} />
          <meshLambertMaterial color={y < 0.15 ? COLORES.miel : COLORES.cera} />
        </mesh>
      ))}
    </group>
  );
}

function Apicultor() {
  return (
    <group position={[-0.75, 0.25, -1.2]} rotation={[0, 0.22, 0]}>
      <mesh position={[0, 1.3, 0]}><capsuleGeometry args={[0.25, 0.68, 5, 8]} /><meshLambertMaterial color="#f1e8cf" /></mesh>
      <mesh position={[0, 2.0, 0]}><sphereGeometry args={[0.26, 10, 8]} /><meshLambertMaterial color="#9b663f" /></mesh>
      <mesh position={[0, 2.08, 0]}><cylinderGeometry args={[0.43, 0.3, 0.52, 12, 1, true]} /><meshBasicMaterial color="#353229" transparent opacity={0.48} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 2.36, 0]}><cylinderGeometry args={[0.42, 0.42, 0.06, 12]} /><meshLambertMaterial color={COLORES.blanco} /></mesh>
      {[-0.16, 0.16].map((x) => <mesh key={x} position={[x, 0.56, 0]}><cylinderGeometry args={[0.075, 0.09, 0.75, 7]} /><meshLambertMaterial color="#6e7d58" /></mesh>)}
    </group>
  );
}

function Abeja({ datos, reducedMotion }) {
  const grupo = useRef(null);
  const [x, y, z, fase] = datos;
  useFrame(({ clock }) => {
    if (reducedMotion || !grupo.current) return;
    const t = clock.elapsedTime + fase;
    grupo.current.position.set(x + Math.sin(t * 1.7) * 0.28, y + Math.sin(t * 2.4) * 0.12, z + Math.cos(t * 1.7) * 0.24);
    grupo.current.rotation.y = -t * 1.7;
  });
  return (
    <group ref={grupo} position={[x, y, z]} scale={0.55}>
      <mesh rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[0.11, 0.2, 4, 7]} /><meshLambertMaterial color="#35251a" /></mesh>
      <mesh position={[0.11, 0, 0]}><sphereGeometry args={[0.11, 7, 6]} /><meshLambertMaterial color="#e2a62b" /></mesh>
      {[-0.1, 0.1].map((zAla) => <mesh key={zAla} position={[0, 0.12, zAla]} rotation={[-0.25, 0, zAla * 4]}><circleGeometry args={[0.14, 7]} /><meshBasicMaterial color="#fff8d9" transparent opacity={0.66} side={THREE.DoubleSide} /></mesh>)}
    </group>
  );
}

function Escena({ tier, reducedMotion }) {
  const perfil = perfilDeTier(tier);
  const abejas = tier === 'bajo' ? ABEJAS.slice(0, 4) : tier === 'medio' ? ABEJAS.slice(0, 7) : ABEJAS;
  return (
    <>
      <color attach="background" args={[DORADA.cielo]} />
      {perfil.fog ? <fog attach="fog" args={[DORADA.niebla, DORADA.nieblaCerca, DORADA.nieblaLejos]} /> : null}
      <hemisphereLight intensity={DORADA.hemisferio} color={DORADA.cielo} groundColor={DORADA.suelo} />
      <ambientLight intensity={ATMOSFERA.ambiente} color={DORADA.luz} />
      <directionalLight position={DORADA.solPos} intensity={DORADA.sol} color={DORADA.luz} />
      <mesh position={[0, -0.12, 0]}><cylinderGeometry args={[7.2, 6.7, 0.55, 32]} /><meshLambertMaterial color={COLORES.pasto} /></mesh>
      <mesh position={[0, 0.17, 2.9]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[11, 1.45]} /><meshLambertMaterial color={COLORES.tierra} /></mesh>
      <ColmenaLangstroth posicion={[-4.15, 0.2, -1.2]} />
      <ColmenaLangstroth posicion={[-2.45, 0.2, -1.75]} />
      <CajaMelipona />
      <Panal />
      <Apicultor />
      {FLORES.map(([x, y, z, color]) => <Flor key={`${x}-${z}`} posicion={[x, y, z]} color={color} />)}
      {abejas.map((datos) => <Abeja key={datos.join('-')} datos={datos} reducedMotion={reducedMotion} />)}
      <ParticulasAmbientales tipo="polen" tier={tier} reducedMotion={reducedMotion} area={[10, 3.5, 7]} position={[0, 0.5, 0]} />
      <OrbitControls makeDefault enablePan={false} minDistance={8.5} maxDistance={15} minPolarAngle={0.65} maxPolarAngle={1.35} target={[0, 0.8, 0]} />
      {tier === 'alto' ? <AdaptiveDpr pixelated /> : null}
    </>
  );
}

const estilos = {
  pagina: { minHeight: '100dvh', color: '#382719', background: 'linear-gradient(150deg, #fff3cf 0%, #e9c777 48%, #9eb76d 100%)', fontFamily: 'Georgia, Cambria, serif', padding: 'clamp(16px, 4vw, 48px)' },
  cabecera: { maxWidth: 1100, margin: '0 auto 18px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 16, alignItems: 'end' },
  ceja: { margin: '0 0 5px', font: '700 0.72rem/1.2 ui-sans-serif, sans-serif', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#71451f' },
  titulo: { margin: 0, fontSize: 'clamp(2.15rem, 8vw, 5.5rem)', lineHeight: 0.88, letterSpacing: '-0.055em', maxWidth: 760 },
  sello: { width: 84, height: 84, border: '1px solid #71451f', borderRadius: '50%', display: 'grid', placeItems: 'center', textAlign: 'center', font: '700 0.68rem/1.15 ui-sans-serif, sans-serif', transform: 'rotate(7deg)' },
  escena: { position: 'relative', maxWidth: 1100, height: 'clamp(390px, 62vh, 680px)', margin: '0 auto', overflow: 'hidden', borderRadius: '28px 28px 90px 28px', border: '1px solid rgba(76, 52, 27, 0.35)', background: DORADA.cielo, boxShadow: '0 28px 65px rgba(71, 49, 20, 0.22)' },
  pista: { position: 'absolute', zIndex: 2, left: 16, bottom: 14, margin: 0, padding: '8px 12px', borderRadius: 999, color: '#fff9e8', background: 'rgba(54, 41, 24, 0.78)', font: '600 0.76rem/1.2 ui-sans-serif, sans-serif', pointerEvents: 'none' },
  tarjetas: { maxWidth: 1100, margin: '18px auto 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 },
  tarjeta: { appearance: 'none', textAlign: 'left', color: '#382719', border: '1px solid rgba(85, 55, 25, 0.3)', borderRadius: 16, background: 'rgba(255, 249, 224, 0.82)', padding: '15px 16px', cursor: 'pointer', font: 'inherit' },
  tarjetaActiva: { background: '#fff9e3', boxShadow: 'inset 0 0 0 2px #a76622' },
  numero: { display: 'block', marginBottom: 7, color: '#9b5b1d', font: '800 0.68rem/1 ui-sans-serif, sans-serif', letterSpacing: '0.12em' },
  texto: { margin: '7px 0 0', font: '0.9rem/1.42 ui-sans-serif, sans-serif' },
};

export default function MundoAbejas3D() {
  const decision = useMemo(() => decidirTier(), []);
  const [seleccion, setSeleccion] = useState('polinizacion');
  const perfil = perfilDeTier(decision.tier);
  return (
    <main style={estilos.pagina}>
      <header style={estilos.cabecera}>
        <div>
          <p style={estilos.ceja}>Chagra presenta: escuela viva</p>
          <h1 style={estilos.titulo}>Mundo de las abejas y meliponas</h1>
        </div>
        <div style={estilos.sello} aria-hidden="true">POLEN<br />MIEL<br />VIDA</div>
      </header>
      <section style={estilos.escena} aria-label="Diorama 3D de abejas, meliponas y flores meliferas">
        <Canvas
          dpr={perfil.dpr}
          frameloop={decision.reducedMotion ? 'demand' : 'always'}
          gl={{ antialias: perfil.antialias, alpha: false, powerPreference: 'high-performance' }}
          camera={{ position: [10, 7.2, 11], fov: 42, near: 0.1, far: 55 }}
        >
          <Escena tier={decision.tier} reducedMotion={decision.reducedMotion} />
        </Canvas>
        <p style={estilos.pista}>{decision.reducedMotion ? 'Vista quieta para su comodidad' : 'Arrastre para recorrer el colmenar'}</p>
      </section>
      <section style={estilos.tarjetas} aria-label="Aprenda con el colmenar">
        {TARJETAS.map((tarjeta) => {
          const activa = seleccion === tarjeta.id;
          return (
            <button key={tarjeta.id} type="button" aria-pressed={activa} style={{ ...estilos.tarjeta, ...(activa ? estilos.tarjetaActiva : {}) }} onClick={() => setSeleccion(tarjeta.id)}>
              <span style={estilos.numero}>{tarjeta.numero}</span>
              <strong>{tarjeta.titulo}</strong>
              <p style={estilos.texto}>{tarjeta.texto}</p>
            </button>
          );
        })}
      </section>
    </main>
  );
}
