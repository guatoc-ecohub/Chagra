import { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { CIELOS_HORA } from '../visual/mundo3d/cielosHoraData.js';
import { PALETA } from '../visual/mundo3d/atmosferaMadre.js';
import { CatalogoInfra3D } from '../visual/mundo3d/infraestructura/CatalogoInfra3D.jsx';

const DORADA = CIELOS_HORA.dorada;

const NOMBRES_INFRA = {
  invernaderoTunel: 'Invernadero tipo túnel',
  gallineroCampo: 'Gallinero a campo abierto',
  galpon: 'Galpón avícola cerrado',
  establo: 'Establo para ganado',
  almacenBodega: 'Almacén o bodega de insumos',
  trojaSecado: 'Troja tradicional de secado',
  tanqueReservorio: 'Tanque reservorio de agua',
  compostera: 'Compostera de tres módulos',
};

const DEFAULTS = {
  invernaderoTunel: { largo: 12, ancho: 6, alto: 3.0, tinte: '#dfeef2', seed: 42 },
  gallineroCampo: { largo: 8, ancho: 5, alto: 2.2, tinte: '#7a5a38', seed: 12 },
  galpon: { largo: 16, ancho: 8, alto: 3.2, tinte: '#ea8a24', seed: 88 },
  establo: { largo: 10, ancho: 6, alto: 3.5, tinte: '#a98a5c', seed: 7 },
  almacenBodega: { largo: 8, ancho: 6, alto: 4.0, tinte: '#efe7d8', seed: 512 },
  trojaSecado: { largo: 4, ancho: 3, alto: 2.8, tinte: '#7a5a38', seed: 73 },
  tanqueReservorio: { largo: 4, ancho: 4, alto: 2.5, tinte: '#9a8b74', seed: 99 },
  compostera: { largo: 4.5, ancho: 1.6, alto: 1.2, tinte: '#7a5a38', seed: 44 },
};

/* eslint-disable chagra-i18n/no-hardcoded-spanish -- mockup UI labels */
const COLORES_PRESET = [
  { nombre: 'Guadua / Madera', hex: '#7a5a38' },
  { nombre: 'Encalado / Blanco', hex: '#efe7d8' },
  { nombre: 'Naranja Finca', hex: '#ea8a24' },
  { nombre: 'Hojarasca / Paja', hex: '#c9b487' },
  { nombre: 'Piedra / Gris', hex: '#9a8b74' },
  { nombre: 'Plástico Claro', hex: '#dfeef2' },
];
/* eslint-enable chagra-i18n/no-hardcoded-spanish */

function EscenaDemo({ tipo, dims, tinte, seed, frugal }) {
  const ComponentePieza = CatalogoInfra3D[tipo];

  return (
    <>
      {/* Iluminación de Hora Dorada Canónica */}
      <hemisphereLight
        intensity={DORADA.hemisferio}
        color={DORADA.cielo}
        groundColor={DORADA.suelo}
      />
      <ambientLight intensity={DORADA.ambiente} color={DORADA.luz} />
      <directionalLight
        position={/** @type {[number, number, number]} */ (DORADA.solPos)}
        intensity={DORADA.sol}
        color={DORADA.luz}
      />
      <directionalLight
        position={[-6, 4, -7]}
        intensity={DORADA.rellenoInt}
        color={DORADA.relleno}
      />

      {/* Parcela de Terreno */}
      <group position={[0, -0.01, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[25, 25]} />
          <meshLambertMaterial color="#8a6b4a" flatShading />
        </mesh>
        {/* Pasto decorativo central */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
          <planeGeometry args={[16, 16]} />
          <meshLambertMaterial color={PALETA.follaje} flatShading />
        </mesh>
      </group>

      {/* Renderizado de la pieza seleccionada */}
      {ComponentePieza && (
        <ComponentePieza dims={dims} tinte={tinte} seed={seed} frugal={frugal} />
      )}
    </>
  );
}

const CSS_DEMO = `
.demo-root {
  position: relative;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  min-height: 480px;
  overflow: hidden;
  background: ${DORADA.fondo};
  color: #3e260e;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.demo-canvas {
  position: absolute;
  inset: 0;
}
.demo-sidebar {
  position: absolute;
  top: 1rem;
  left: 1rem;
  width: 22rem;
  max-height: calc(100vh - 2rem);
  background: rgba(255, 251, 242, 0.88);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(74, 52, 24, 0.18);
  border-radius: 1rem;
  padding: 1.5rem;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  box-shadow: 0 10px 30px rgba(74, 52, 24, 0.15);
  overflow-y: auto;
}
.demo-title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: #4a3418;
  border-bottom: 2px solid rgba(74, 52, 24, 0.1);
  padding-bottom: 0.5rem;
}
.demo-title small {
  display: block;
  font-size: 0.8rem;
  font-weight: 500;
  color: #7a5a38;
  margin-top: 0.2rem;
}
.demo-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.demo-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #4a3418;
}
.demo-select, .demo-input {
  appearance: none;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(74, 52, 24, 0.3);
  border-radius: 0.5rem;
  padding: 0.5rem 0.8rem;
  font-size: 0.9rem;
  color: #4a3418;
  outline: none;
  transition: all 0.2s ease;
}
.demo-select:focus, .demo-input:focus {
  border-color: #aa5533;
  box-shadow: 0 0 0 2px rgba(170, 85, 51, 0.2);
}
.demo-slider-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.demo-slider {
  flex: 1;
  accent-color: #aa5533;
}
.demo-value {
  font-size: 0.85rem;
  font-weight: 700;
  color: #7a5a38;
  min-width: 2.5rem;
  text-align: right;
}
.demo-color-presets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
}
.demo-color-btn {
  border: 1px solid rgba(74, 52, 24, 0.25);
  border-radius: 0.4rem;
  padding: 0.4rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  background: white;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
}
.demo-color-btn:hover {
  background: #fdf6e2;
  border-color: #7a5a38;
}
.demo-color-btn.active {
  background: #ffe8b0;
  border-color: #4a3418;
  font-weight: 600;
}
.demo-color-dot {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 50%;
  border: 1px solid rgba(0,0,0,0.15);
}
.demo-checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #4a3418;
  cursor: pointer;
}
.demo-checkbox {
  width: 1.1rem;
  height: 1.1rem;
  accent-color: #aa5533;
  cursor: pointer;
}
.demo-instructions {
  font-size: 0.75rem;
  line-height: 1.4;
  color: #7a5a38;
  background: rgba(74, 52, 24, 0.05);
  padding: 0.6rem 0.8rem;
  border-radius: 0.5rem;
  border-left: 3px solid #aa5533;
}
@media (max-width: 768px) {
  .demo-sidebar {
    width: auto;
    position: absolute;
    inset: auto 1rem 1rem 1rem;
    max-height: 40vh;
  }
}
`;

export default function CatalogoInfraDemo() {
  const [tipo, setTipo] = useState('invernaderoTunel');
  
  // Set controls based on selected piece's default values
  const [largo, setLargo] = useState(DEFAULTS.invernaderoTunel.largo);
  const [ancho, setAncho] = useState(DEFAULTS.invernaderoTunel.ancho);
  const [alto, setAlto] = useState(DEFAULTS.invernaderoTunel.alto);
  const [tinte, setTinte] = useState(DEFAULTS.invernaderoTunel.tinte);
  const [seed, setSeed] = useState(DEFAULTS.invernaderoTunel.seed);

  const [autoRotar, setAutoRotar] = useState(true);
  /* Retrato (teléfono en vertical): a 12 metros con el fov de escritorio, el
     pasillo horizontal era de ~4.7 m y un invernadero de 15 m se miraba desde
     ADENTRO de sus arcos. En retrato la cámara retrocede y sube: la pieza
     entera, con aire, como en la vitrina. */
  const retrato = useMemo(
    () => typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(max-aspect-ratio: 19/20)').matches,
    [],
  );
  const [frugal, setFrugal] = useState(false);

  // Sync controls when piece type changes
  const handleTipoChange = (nuevoTipo) => {
    setTipo(nuevoTipo);
    const val = DEFAULTS[nuevoTipo];
    if (val) {
      setLargo(val.largo);
      setAncho(val.ancho);
      setAlto(val.alto);
      setTinte(val.tinte);
      setSeed(val.seed);
    }
  };

  const dims = useMemo(() => ({ largo, ancho, alto }), [largo, ancho, alto]);

  return (
    <section className="demo-root">
      <style>{CSS_DEMO}</style>

      {/* 3D Canvas */}
      <Canvas
        className="demo-canvas"
        camera={retrato ? { position: [0, 9, 21], fov: 50 } : { position: [0, 6, 12], fov: 45 }}
        gl={{ antialias: !frugal, powerPreference: 'high-performance' }}
        frameloop="always" // Required for damping and auto-rotation
      >
        <EscenaDemo
          tipo={tipo}
          dims={dims}
          tinte={tinte}
          seed={seed}
          frugal={frugal}
        />
        <OrbitControls
          makeDefault
          enablePan={true}
          enableZoom={true}
          minDistance={3}
          maxDistance={25}
          target={[0, 1, 0]}
          enableDamping
          dampingFactor={0.05}
          autoRotate={autoRotar}
          autoRotateSpeed={0.5}
        />
        <AdaptiveDpr pixelated />
      </Canvas>

      {/* Floating Control Panel */}
      <div className="demo-sidebar">
        <h2 className="demo-title">
          Infraestructura 3D
          <small>Modelos procedurales y paramétricos de Chagra</small>
        </h2>

        {/* Selector de pieza */}
        <div className="demo-group">
          <label className="demo-label" htmlFor="tipo-pieza">
            Seleccione la infraestructura:
          </label>
          <select
            id="tipo-pieza"
            className="demo-select"
            value={tipo}
            onChange={(e) => handleTipoChange(e.target.value)}
          >
            {Object.entries(NOMBRES_INFRA).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Sliders paramétricos */}
        <div className="demo-group">
          <label className="demo-label" htmlFor="largo-slider">
            Largo del espacio:
          </label>
          <div className="demo-slider-container">
            <input
              id="largo-slider"
              className="demo-slider"
              type="range"
              min="2"
              max="20"
              step="0.5"
              value={largo}
              onChange={(e) => setLargo(parseFloat(e.target.value))}
            />
            <span className="demo-value">{largo} m</span>
          </div>
        </div>

        <div className="demo-group">
          <label className="demo-label" htmlFor="ancho-slider">
            Ancho del espacio:
          </label>
          <div className="demo-slider-container">
            <input
              id="ancho-slider"
              className="demo-slider"
              type="range"
              min="2"
              max="12"
              step="0.5"
              value={ancho}
              onChange={(e) => setAncho(parseFloat(e.target.value))}
            />
            <span className="demo-value">{ancho} m</span>
          </div>
        </div>

        <div className="demo-group">
          <label className="demo-label" htmlFor="alto-slider">
            Alto de la cumbrera:
          </label>
          <div className="demo-slider-container">
            <input
              id="alto-slider"
              className="demo-slider"
              type="range"
              min="1"
              max="6"
              step="0.1"
              value={alto}
              onChange={(e) => setAlto(parseFloat(e.target.value))}
            />
            <span className="demo-value">{alto} m</span>
          </div>
        </div>

        {/* Selector de tinte */}
        <div className="demo-group">
          <label className="demo-label">Color / Tinte predominante:</label>
          <div className="demo-color-presets">
            {COLORES_PRESET.map((c) => (
              <button
                key={c.hex}
                type="button"
                className={`demo-color-btn${tinte === c.hex ? ' active' : ''}`}
                onClick={() => setTinte(c.hex)}
              >
                <span className="demo-color-dot" style={{ backgroundColor: c.hex }} />
                {c.nombre.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Semilla de variación */}
        <div className="demo-group">
          <label className="demo-label" htmlFor="semilla-input">
            Semilla de variación (PRNG):
          </label>
          <div className="demo-slider-container">
            <input
              id="semilla-input"
              className="demo-slider"
              type="range"
              min="1"
              max="200"
              step="1"
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value))}
            />
            <span className="demo-value">#{seed}</span>
          </div>
        </div>

        {/* Toggles */}
        <div className="demo-group">
          <label className="demo-checkbox-label">
            <input
              type="checkbox"
              className="demo-checkbox"
              checked={autoRotar}
              onChange={(e) => setAutoRotar(e.target.checked)}
            />
            Rotar vista automáticamente
          </label>
        </div>

        <div className="demo-group">
          <label className="demo-checkbox-label">
            <input
              type="checkbox"
              className="demo-checkbox"
              checked={frugal}
              onChange={(e) => setFrugal(e.target.checked)}
            />
            Simular modo frugal (dispositivos lentos)
          </label>
        </div>

        <div className="demo-instructions">
          Use un dedo o el mouse para rotar la visualización tridimensional. Pellizque o use la rueda para hacer zoom.
        </div>
      </div>
    </section>
  );
}
