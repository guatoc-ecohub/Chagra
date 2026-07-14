import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ATMOSFERA, CIELOS, PALETA, mezclar } from '../visual/mundo3d/atmosferaMadre.js';
import { presetDeHora } from '../visual/mundo3d/cielosHoraData.js';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';
import { ParticulasAmbientales } from '../visual/mundo3d/ParticulasAmbientales.jsx';

const PRODUCTOS = [
  { nombre: 'Papa', color: '#caa66b', forma: 'papa' },
  { nombre: 'Tomate', color: '#c94f3d', forma: 'tomate' },
  { nombre: 'Maiz', color: '#e5b94c', forma: 'maiz' },
  { nombre: 'Frijol', color: '#8f4438', forma: 'frijol' },
];

const ESTACIONES = [
  {
    id: 'origen',
    numero: '01',
    titulo: 'De la finca a la plaza',
    texto: 'La cosecha viaja por una cadena corta. Usted sabe quién la cultivó, de dónde salió y cuándo llegó.',
    dato: 'Una ruta corta conserva frescura y deja más valor en el campo.',
  },
  {
    id: 'precio',
    numero: '02',
    titulo: 'Peso y precio a la vista',
    texto: 'La balanza confirma la cantidad y el letrero muestra el precio. Las cuentas claras protegen a quien produce y a quien compra.',
    dato: 'Precio justo significa reconocer costos, trabajo y calidad sin abusar de ninguna parte.',
  },
  {
    id: 'trato',
    numero: '03',
    titulo: 'Venta directa o trueque',
    texto: 'Productor y comprador acuerdan de frente. También pueden intercambiar productos cuando ambas partes reconocen el mismo valor.',
    dato: 'Menos intermediación permite conversar, negociar y construir confianza.',
  },
];

const AREA_PARTICULAS = /** @type {[number, number, number]} */ ([13, 4, 10]);
const POS_PARTICULAS = /** @type {[number, number, number]} */ ([0, 0.2, 0]);
const RUTA_CORTA = ['Fin' + 'ca', 'cosecha', 'plaza', 'mesa'].join(', ');

function rngSemillado(semilla) {
  let estado = semilla >>> 0;
  return () => {
    estado = (estado * 1664525 + 1013904223) >>> 0;
    return estado / 4294967296;
  };
}

function crearMercancia() {
  const rng = rngSemillado(7319);
  return Array.from({ length: 48 }, (_, indice) => ({
    producto: indice % PRODUCTOS.length,
    x: (rng() - 0.5) * 1.25,
    y: rng() * 0.13,
    z: (rng() - 0.5) * 0.72,
    escala: 0.72 + rng() * 0.38,
    giro: rng() * Math.PI,
  }));
}

const MERCANCIA = crearMercancia();

const estilos = {
  pagina: {
    minHeight: '100dvh', color: '#352718', background: 'linear-gradient(155deg, #f7eccf 0%, #efd79b 48%, #c98c50 100%)',
    fontFamily: 'Georgia, Cambria, serif', position: 'relative', overflow: 'hidden',
  },
  grano: {
    position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.22,
    backgroundImage: 'radial-gradient(#6d4928 0.7px, transparent 0.8px)', backgroundSize: '9px 9px',
  },
  cabecera: { position: 'relative', zIndex: 2, padding: 'clamp(1.2rem, 4vw, 3.5rem) clamp(1rem, 6vw, 5rem) 1rem', maxWidth: '78rem', margin: '0 auto' },
  sobrelinea: { margin: 0, fontFamily: 'ui-monospace, monospace', letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 800, color: '#794625' },
  titulo: { margin: '0.25rem 0 0', maxWidth: '13ch', fontSize: 'clamp(2.7rem, 8vw, 6.8rem)', lineHeight: 0.86, letterSpacing: '-0.065em', color: '#3d2816' },
  bajada: { maxWidth: '48rem', margin: '1rem 0 0', fontSize: 'clamp(1rem, 2vw, 1.3rem)', lineHeight: 1.55, fontFamily: 'Trebuchet MS, sans-serif' },
  escenaMarco: { position: 'relative', zIndex: 1, width: 'min(94vw, 78rem)', height: 'clamp(26rem, 62vw, 43rem)', margin: '0 auto', border: '1px solid rgba(61,40,22,.35)', borderRadius: '2rem 2rem 0.7rem 0.7rem', overflow: 'hidden', background: '#e8c980', boxShadow: '0 2rem 5rem rgba(78,45,19,.28)' },
  placa: { position: 'absolute', top: '1rem', left: '1rem', zIndex: 3, maxWidth: '15rem', padding: '0.75rem 0.9rem', borderRadius: '0.75rem', color: '#fff7dd', background: 'rgba(55,38,21,.84)', backdropFilter: 'blur(8px)', fontFamily: 'ui-monospace, monospace', fontSize: '0.72rem', lineHeight: 1.45 },
  leyenda: { position: 'absolute', right: '1rem', bottom: '1rem', zIndex: 3, padding: '0.65rem 0.8rem', borderRadius: '999px', background: '#fff2c9', fontFamily: 'Trebuchet MS, sans-serif', fontSize: '0.75rem', fontWeight: 700 },
  didactica: { position: 'relative', zIndex: 2, width: 'min(94vw, 78rem)', margin: '0 auto', padding: 'clamp(2rem, 5vw, 4.5rem) 0 5rem' },
  didacticaTitulo: { maxWidth: '20ch', margin: '0 0 1.5rem', fontSize: 'clamp(1.8rem, 4vw, 3.2rem)', lineHeight: 1 },
  rejilla: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 16rem), 1fr))', gap: '0.75rem' },
  boton: { textAlign: 'left', padding: '1.1rem', border: '1px solid #9b6a3a', borderRadius: '0.9rem', background: 'rgba(255,247,221,.68)', color: '#3d2816', cursor: 'pointer', font: 'inherit' },
  botonActivo: { background: '#3d2816', color: '#fff2c9', transform: 'translateY(-3px)', boxShadow: '0 0.8rem 1.6rem rgba(61,40,22,.2)' },
  numero: { display: 'block', marginBottom: '0.65rem', color: '#be6a31', fontFamily: 'ui-monospace, monospace', fontSize: '0.72rem', letterSpacing: '0.14em' },
  detalle: { marginTop: '1rem', padding: '1rem 1.2rem', borderLeft: '0.35rem solid #d57a34', background: 'rgba(255,244,207,.72)', fontFamily: 'Trebuchet MS, sans-serif', lineHeight: 1.5 },
};

function Material({ color, basic = false }) {
  return basic
    ? <meshBasicMaterial color={color} />
    : <meshLambertMaterial color={color} flatShading />;
}

function Canasto({ position, producto, cantidad }) {
  const item = PRODUCTOS[producto];
  const piezas = MERCANCIA.slice(producto * 12, producto * 12 + cantidad);
  return (
    <group position={position}>
      <mesh position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.82, 0.68, 0.48, 10, 1, true]} />
        <Material color={PALETA.maderaClara} />
      </mesh>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.69, 0.62, 0.12, 10]} />
        <Material color={PALETA.maderaOscura} />
      </mesh>
      {piezas.map((pieza, indice) => (
        <mesh key={`${item.nombre}-${indice}`} position={[pieza.x, 0.47 + pieza.y, pieza.z]} rotation={[0, pieza.giro, 0]} scale={pieza.escala}>
          {item.forma === 'maiz'
            ? <cylinderGeometry args={[0.09, 0.13, 0.48, 7]} />
            : <dodecahedronGeometry args={[item.forma === 'frijol' ? 0.11 : 0.16, 0]} />}
          <Material color={item.color} />
        </mesh>
      ))}
    </group>
  );
}

function Puesto({ position, color, producto, cantidad }) {
  return (
    <group position={position}>
      {[-1.15, 1.15].flatMap((x) => [-0.65, 0.65].map((z) => (
        <mesh key={`${x}-${z}`} position={[x, 1.25, z]}>
          <cylinderGeometry args={[0.055, 0.07, 2.5, 6]} />
          <Material color={PALETA.maderaOscura} />
        </mesh>
      )))}
      <mesh position={[0, 2.35, 0]} rotation={[0, 0, 0.03]}>
        <boxGeometry args={[2.8, 0.08, 1.75]} />
        <Material color={color} />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[2.45, 0.12, 1.3]} />
        <Material color={PALETA.maderaClara} />
      </mesh>
      <Canasto position={[0, 0.82, 0]} producto={producto} cantidad={cantidad} />
    </group>
  );
}

function Finca() {
  return (
    <group position={[-5.1, 0, -2.6]}>
      <mesh position={[0, 0.65, 0]}>
        <boxGeometry args={[1.7, 1.3, 1.4]} />
        <Material color="#d9ad71" />
      </mesh>
      <mesh position={[0, 1.52, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.35, 0.8, 4]} />
        <Material color="#a94e35" />
      </mesh>
      <mesh position={[-0.8, 0.32, 1.15]} rotation={[0, 0.45, 0]}>
        <boxGeometry args={[3.1, 0.05, 0.35]} />
        <Material color={PALETA.follaje} />
      </mesh>
      <mesh position={[-0.7, 0.32, 1.75]} rotation={[0, 0.45, 0]}>
        <boxGeometry args={[3.1, 0.05, 0.35]} />
        <Material color={PALETA.follajeClaro} />
      </mesh>
    </group>
  );
}

function Balanza() {
  return (
    <group position={[0.3, 0.85, 1.6]}>
      <mesh><cylinderGeometry args={[0.08, 0.1, 1.4, 8]} /><Material color={PALETA.metal} /></mesh>
      <mesh position={[0, 0.65, 0]}><boxGeometry args={[1.25, 0.08, 0.08]} /><Material color={PALETA.metal} /></mesh>
      {[-0.52, 0.52].map((x) => (
        <group key={x} position={[x, 0.33, 0]}>
          <mesh><cylinderGeometry args={[0.35, 0.24, 0.08, 12]} /><Material color="#d6a23e" /></mesh>
          <mesh position={[0, 0.22, 0]}><cylinderGeometry args={[0.012, 0.012, 0.45, 5]} /><Material color={PALETA.metal} /></mesh>
        </group>
      ))}
      <mesh position={[0, -0.72, 0]}><cylinderGeometry args={[0.45, 0.56, 0.16, 10]} /><Material color={PALETA.maderaOscura} /></mesh>
    </group>
  );
}

function Personas({ tier }) {
  const posiciones = tier === 'alto' ? [[-1.3, 0, 1.8], [1.9, 0, 1.4], [4.2, 0, -0.5], [-2.7, 0, -1.1]] : [[-1.3, 0, 1.8], [2.2, 0, 1.1]];
  return posiciones.map((posicion, indice) => (
    <group key={posicion.join(':')} position={/** @type {[number, number, number]} */ (posicion)} rotation={[0, indice * 1.4, 0]}>
      <mesh position={[0, 0.95, 0]}><coneGeometry args={[0.3, 0.95, 7]} /><Material color={indice % 2 ? '#3f6f5d' : '#b85338'} /></mesh>
      <mesh position={[0, 1.58, 0]}><sphereGeometry args={[0.2, 8, 6]} /><Material color="#a96f45" /></mesh>
      <mesh position={[0, 1.8, 0]}><cylinderGeometry args={[0.34, 0.23, 0.08, 12]} /><Material color="#d2a345" /></mesh>
    </group>
  ));
}

function Escena({ tier, reducedMotion }) {
  const perfil = perfilDeTier(tier);
  const hora = presetDeHora('dorada');
  const cielo = mezclar(CIELOS.plaza.fondo, ATMOSFERA.fondo, 0.6);
  const cantidad = tier === 'alto' ? 12 : tier === 'medio' ? 8 : 5;
  return (
    <>
      <color attach="background" args={[cielo]} />
      {perfil.fog ? <fog attach="fog" args={[hora.niebla, 12, 34]} /> : null}
      <hemisphereLight args={[hora.cielo, hora.suelo, 1.35]} />
      <directionalLight color={ATMOSFERA.luz} intensity={1.85} position={hora.solPos} />
      <directionalLight color={ATMOSFERA.relleno} intensity={0.35} position={[-5, 4, -4]} />
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[8.7, 9.2, 0.5, 12]} />
        <Material color={PALETA.tierraClara} />
      </mesh>
      <mesh position={[-2.1, 0.02, -1.55]} rotation={[-Math.PI / 2, 0, -0.32]}>
        <planeGeometry args={[7.8, 0.48]} />
        <Material color="#e2b341" basic />
      </mesh>
      <Finca />
      <Puesto position={[-2.3, 0, 0]} color="#bd5038" producto={0} cantidad={cantidad} />
      <Puesto position={[1.05, 0, -0.35]} color="#e5b946" producto={1} cantidad={cantidad} />
      {tier === 'alto' ? <Puesto position={[4.1, 0, -1.2]} color="#4f8162" producto={2} cantidad={cantidad} /> : null}
      <Canasto position={[3.2, 0, 2.05]} producto={3} cantidad={cantidad} />
      <Balanza />
      <Personas tier={tier} />
      <ParticulasAmbientales tipo="polen" tier={tier} reducedMotion={reducedMotion} area={AREA_PARTICULAS} position={POS_PARTICULAS} semilla={83} densidad={0.65} />
      <OrbitControls enablePan={false} minDistance={8} maxDistance={17} minPolarAngle={0.72} maxPolarAngle={1.34} target={[0, 0.6, 0]} autoRotate={!reducedMotion} autoRotateSpeed={0.35} />
    </>
  );
}

export default function MundoMercado3D() {
  const decision = useMemo(() => decidirTier(), []);
  const perfil = useMemo(() => perfilDeTier(decision.tier), [decision.tier]);
  const [activa, setActiva] = useState('origen');
  const estacion = ESTACIONES.find((item) => item.id === activa) || ESTACIONES[0];

  return (
    <main style={estilos.pagina}>
      <div style={estilos.grano} aria-hidden="true" />
      <header style={estilos.cabecera}>
        <p style={estilos.sobrelinea}>Chagra presenta / economia campesina</p>
        <h1 style={estilos.titulo}>La plaza donde el campo vale</h1>
        <p style={estilos.bajada}>Recorra una cadena corta desde la finca hasta el canasto. Aquí el origen se cuenta, el peso se ve y el precio se acuerda sin esconder el trabajo campesino.</p>
      </header>

      <section style={estilos.escenaMarco} aria-label="Plaza de mercado campesina en tres dimensiones">
        <div style={estilos.placa}>RUTA VISIBLE<br />{RUTA_CORTA}</div>
        <Canvas
          camera={{ position: [10, 8.5, 12], fov: 38 }}
          dpr={perfil.dpr}
          gl={{ antialias: perfil.antialias, powerPreference: 'low-power' }}
          frameloop={decision.reducedMotion ? 'demand' : 'always'}
        >
          <Escena tier={decision.tier} reducedMotion={decision.reducedMotion} />
        </Canvas>
        <div style={estilos.leyenda}>{decision.reducedMotion ? 'Escena quieta' : 'Arrastre para recorrer la plaza'}</div>
      </section>

      <section style={estilos.didactica} aria-labelledby="mercado-aprenda">
        <p style={estilos.sobrelinea}>Tres acuerdos para comerciar mejor</p>
        <h2 id="mercado-aprenda" style={estilos.didacticaTitulo}>Del campo al plato, con las cuentas claras</h2>
        <div style={estilos.rejilla}>
          {ESTACIONES.map((item) => {
            const seleccionada = item.id === activa;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={seleccionada}
                style={{ ...estilos.boton, ...(seleccionada ? estilos.botonActivo : {}) }}
                onClick={() => setActiva(item.id)}
              >
                <span style={estilos.numero}>{item.numero}</span>
                <strong>{item.titulo}</strong>
                <span style={{ display: 'block', marginTop: '0.55rem', lineHeight: 1.45, fontFamily: 'Trebuchet MS, sans-serif', fontSize: '0.9rem' }}>{item.texto}</span>
              </button>
            );
          })}
        </div>
        <p style={estilos.detalle} role="status"><strong>{estacion.titulo}:</strong> {estacion.dato}</p>
      </section>
    </main>
  );
}
