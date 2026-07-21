/*
 * DemoAtmosferaViva — la viñeta AISLADA del día-vivo (QA/arte, no producto).
 *
 * Una finca mínima de juguete (pasto, tres árboles, la casita con su ventana,
 * charcos cuando llueve) vestida COMPLETA por <AtmosferaViva/>: sirve para
 * recorrer el arco del día con un deslizador, alternar lluvia/seca y verificar
 * a ojo que la madrugada es madrugada y que el "invierno" colombiano es verde.
 *
 * NO está cableada a ninguna ruta (contrato A4: demo aislada propia). Quien
 * quiera verla la monta donde guste:
 *   import DemoAtmosferaViva from '.../atmosfera/DemoAtmosferaViva.jsx';
 *   <DemoAtmosferaViva />
 * En modo "reloj real" respeta además los overrides de URL del sistema
 * (?ciclo=demo día-acelerado, ?ciclo=17.5, ?temporada=lluvia).
 *
 * La viñeta demuestra el CONTRATO de consumo completo:
 *   - <AtmosferaViva/> dentro del Canvas = cielo+luces+niebla+estrellas.
 *   - useAtmosferaViva en el padre = la paleta para VESTIR el mundo
 *     (preset.pasto tiñe suelo y copas; extras.ventanas enciende la casa;
 *     extras.charcos posa el agua del camino).
 */
import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { decidirTier, perfilDeTier } from '../deviceTier.js';
import { PALETA } from '../atmosferaMadre.js';
import AtmosferaViva from './AtmosferaViva.jsx';
import useAtmosferaViva from './useAtmosferaViva.js';

/* ---------- la finca de juguete (geometría fija, materiales vivos) ---------- */

function Arbol({ posicion, escala = 1, pasto }) {
  return (
    <group position={posicion} scale={escala}>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.09, 0.13, 0.9, 5]} />
        <meshLambertMaterial color={PALETA.madera} />
      </mesh>
      <mesh position={[0, 1.35, 0]}>
        <coneGeometry args={[0.65, 1.5, 6]} />
        <meshLambertMaterial color={pasto} />
      </mesh>
    </group>
  );
}

function Casita({ ventanas }) {
  return (
    <group position={[0, 0, 0]}>
      {/* paredes encaladas */}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[1.7, 1.1, 1.3]} />
        <meshLambertMaterial color={PALETA.cal} />
      </mesh>
      {/* techo a cuatro aguas (pirámide) */}
      <mesh position={[0, 1.42, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.45, 0.75, 4]} />
        <meshLambertMaterial color={PALETA.maderaOscura} />
      </mesh>
      {/* puerta */}
      <mesh position={[-0.42, 0.4, 0.66]}>
        <planeGeometry args={[0.34, 0.8]} />
        <meshLambertMaterial color={PALETA.maderaOscura} />
      </mesh>
      {/* LA VENTANA: se enciende con extras.ventanas (noche y madrugada) */}
      <mesh position={[0.38, 0.62, 0.66]}>
        <planeGeometry args={[0.42, 0.42]} />
        <meshLambertMaterial
          color="#241a10"
          emissive="#ffcf7a"
          emissiveIntensity={1.6 * ventanas}
        />
      </mesh>
    </group>
  );
}

function Charco({ posicion, escala, opacidad, color }) {
  return (
    <mesh position={posicion} rotation={[-Math.PI / 2, 0, 0]} scale={[escala, escala * 0.6, 1]}>
      <circleGeometry args={[0.5, 10]} />
      <meshBasicMaterial color={color} transparent opacity={opacidad} depthWrite={false} />
    </mesh>
  );
}

function Finca({ preset }) {
  return (
    <group>
      {/* el pasto de la TEMPORADA: verde hondo en lluvia, paja en seca */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <circleGeometry args={[15, 40]} />
        <meshLambertMaterial color={preset.pasto} />
      </mesh>
      {/* el camino de tierra */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.2, 0, 2.6]}>
        <planeGeometry args={[1.2, 9]} />
        <meshLambertMaterial color={PALETA.tierraClara} />
      </mesh>
      <Casita ventanas={preset.ventanas} />
      <Arbol posicion={[-3.1, 0, -2]} escala={1.2} pasto={preset.pasto} />
      <Arbol posicion={[2.6, 0, -3.4]} escala={1} pasto={preset.pasto} />
      <Arbol posicion={[4.1, 0, 1.6]} escala={0.8} pasto={preset.pasto} />
      {/* charcos del camino: solo en lluvia (reflejan el cielo de la hora) */}
      {preset.charcos > 0 && (
        <group>
          <Charco posicion={[0.1, 0.005, 3.4]} escala={1} opacidad={0.38} color={preset.cielo} />
          <Charco posicion={[0.5, 0.005, 5.2]} escala={0.7} opacidad={0.32} color={preset.cielo} />
          <Charco posicion={[-0.3, 0.005, 6.5]} escala={0.5} opacidad={0.3} color={preset.cielo} />
        </group>
      )}
    </group>
  );
}

/* ------------------------------ la demo ------------------------------ */

const PANEL = {
  position: 'absolute',
  left: 12,
  bottom: 12,
  padding: '10px 14px',
  borderRadius: 10,
  background: 'rgba(20, 16, 10, 0.72)',
  color: '#f4e9d4',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  lineHeight: 1.7,
  maxWidth: 300,
};

const BOTON = (activo) => ({
  marginRight: 6,
  padding: '3px 10px',
  borderRadius: 8,
  border: '1px solid #a98a5c',
  background: activo ? '#a98a5c' : 'transparent',
  color: activo ? '#1d150c' : '#f4e9d4',
  cursor: 'pointer',
  fontSize: 12,
});

/** Etiqueta h:mm de una hora decimal. */
const etiquetaHora = (h) =>
  `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

export default function DemoAtmosferaViva() {
  const [{ tier, reducedMotion }] = useState(() => decidirTier());
  const perfil = perfilDeTier(tier);

  /* modo: null = reloj real; número = hora fija del deslizador */
  const [horaFija, setHoraFija] = useState(/** @type {number|null} */ (null));
  const [temporada, setTemporada] = useState(
    /** @type {'lluvia'|'seca'|'auto'} */ ('auto'),
  );

  /* El MISMO momento que verá <AtmosferaViva/>, leído aquí para vestir la
     finca (pasto/ventanas/charcos) y para el panel. */
  const momento = useAtmosferaViva({ hora: horaFija, temporada, reducedMotion });
  const { preset } = momento;

  const dpr = useMemo(() => perfil.dpr, [perfil]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 420 }}>
      <Canvas
        dpr={dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={{ position: [7, 4.5, 10], fov: 42 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
      >
        <AtmosferaViva
          hora={horaFija}
          temporada={temporada}
          tier={tier}
          reducedMotion={reducedMotion}
        />
        <Finca preset={preset} />
      </Canvas>

      <div style={PANEL}>
        <div>
          <strong>{etiquetaHora(momento.hora)}</strong> · {momento.franja} · temporada{' '}
          {momento.temporada}
          {momento.demo ? ' · (demo acelerada)' : ''}
        </div>
        <input
          type="range"
          min={0}
          max={24}
          step={0.1}
          value={horaFija ?? momento.hora}
          onChange={(e) => setHoraFija(Number(e.target.value))}
          style={{ width: '100%' }}
          aria-label="Hora del día"
        />
        <div>
          <button type="button" style={BOTON(horaFija === null)} onClick={() => setHoraFija(null)}>
            reloj real
          </button>
          <button
            type="button"
            style={BOTON(temporada === 'lluvia')}
            onClick={() => setTemporada('lluvia')}
          >
            lluvia
          </button>
          <button
            type="button"
            style={BOTON(temporada === 'seca')}
            onClick={() => setTemporada('seca')}
          >
            seca
          </button>
          <button
            type="button"
            style={BOTON(temporada === 'auto')}
            onClick={() => setTemporada('auto')}
          >
            calendario
          </button>
        </div>
        <div style={{ opacity: 0.75, fontSize: 12 }}>
          rocío {preset.rocio.toFixed(2)} · ventanas {preset.ventanas.toFixed(2)} · gallo{' '}
          {preset.gallo.toFixed(2)} · calina {preset.calina.toFixed(2)}
          <br />
          charcos {preset.charcos} · polvo {preset.polvo} · tier {tier}
        </div>
      </div>
    </div>
  );
}
