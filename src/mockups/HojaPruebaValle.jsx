/*
 * HojaPruebaValle — EL PATRÓN ORO de la ley visual del valle.
 *
 * La hoja de prueba que pide AUDITORIA-VALLE.md (corrección 1.1): una roca,
 * un árbol, una casa, una persona, un animal y un portal — más el agua —
 * bajo las cinco franjas del día, construidos SOLO con la ley:
 *
 *   · 16 muestras aprobadas (direccion/paletaValle.js), cero hex suelto.
 *   · UNA familia de shader: rampa de tres bandas (materialValle.js),
 *     flatShading prohibido, agua única transparencia, Basic solo emisivos.
 *   · Borde binario: paisaje sin contorno; persona, perro y portal con
 *     casco de tinta de ~1.5 px de pantalla.
 *   · Luz de la ley: colores y sol del preset aprobado (CIELOS_HORA), con
 *     el relleno DESACOPLADO de la clave (auditoría 4.1) para que las tres
 *     bandas existan en todas las horas.
 *   · Escala 1 u = 1 m: persona 1,70, puerta 2,05, cumbrera 3,4, perro 0,59
 *     (el ancla de Oliver).
 *
 * Es una vara de medir, no un mundo: ningún activo entra al valle si al
 * ponerlo junto a esta hoja rompe las bandas o el borde. Franja por URL:
 *   #/mockups/hoja-prueba-valle?ciclo=6.2   → amanecer
 *   ?ciclo=12 → mediodía · ?ciclo=16 → tarde · ?ciclo=18.1 → crepúsculo
 *   ?ciclo=22 → noche   (sin parámetro: la hora real del dispositivo)
 *
 * NO toca Valle3D ni composicionValle3D (T2 vive allá): escena autónoma.
 */
import { useEffect, useMemo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { decidirTier, perfilDeTier } from '../visual/mundo3d/deviceTier.js';
import useCicloDia from '../visual/mundo3d/useCicloDia.js';
import { presetDeHora } from '../visual/mundo3d/cielosHoraData.js';
import {
  COLORES_MADRE,
  MUESTRAS,
  ACENTOS,
  grosorContornoMundo,
} from '../visual/mundo3d/direccion/paletaValle.js';
import {
  crearMaterialValle,
  crearMaterialEmisivo,
  crearMaterialContorno,
  crearMaterialTinta,
  crearMaterialSombraContacto,
  intensidadesDeLey,
} from '../visual/mundo3d/direccion/materialValle.js';

/* Las cinco franjas oficiales de la auditoría, como accesos directos. */
const FRANJAS_HOJA = [
  { id: 'amanecer', rotulo: 'Amanecer', hora: 6.2 },
  { id: 'mediodia', rotulo: 'Mediodía', hora: 12 },
  { id: 'tarde', rotulo: 'Tarde', hora: 16 },
  { id: 'atardecer', rotulo: 'Crepúsculo', hora: 18.1 },
  { id: 'noche', rotulo: 'Noche', hora: 22 },
];

const FOV = 40;
const CAMARA = [0, 2.6, 9.8];

/* Geometrías por clave — cada pieza se declara una vez y el casco de
   contorno reutiliza la MISMA declaración (tinta, BackSide, escala). */
function Geo({ tipo, args }) {
  switch (tipo) {
    case 'caja':
      return <boxGeometry args={args} />;
    case 'cil':
      return <cylinderGeometry args={args} />;
    case 'esf':
      return <sphereGeometry args={args} />;
    case 'ico':
      return <icosahedronGeometry args={args} />;
    case 'dod':
      return <dodecahedronGeometry args={args} />;
    case 'cono':
      return <coneGeometry args={args} />;
    case 'toro':
      return <torusGeometry args={args} />;
    case 'circ':
      return <circleGeometry args={args} />;
    case 'plano':
      return <planeGeometry args={args} />;
    default:
      return null;
  }
}

/*
 * Una pieza de la hoja: malla + (si es habitante/interactivo) su casco
 * invertido de tinta. `radio` es el radio aproximado de la pieza: el casco
 * escala (radio + grosor) / radio para que el filo mida ~1.5 px en pantalla.
 */
function Pieza({ tipo, args, pos, rot, mat, casco, matCasco, g, radio = 0.2 }) {
  const factor = casco ? (radio + g) / radio : 1;
  return (
    <group position={pos} rotation={rot}>
      <mesh material={mat}>
        <Geo tipo={tipo} args={args} />
      </mesh>
      {casco ? (
        <mesh material={matCasco} scale={factor} renderOrder={-1}>
          <Geo tipo={tipo} args={args} />
        </mesh>
      ) : null}
    </group>
  );
}

/* Sombra de contacto: el ÚNICO dispositivo de sombra de la hoja (disco
   radial con el tinte de sombra de la franja — auditoría 4.1). */
function SombraContacto({ pos, radio, mat }) {
  return (
    <mesh material={mat} position={[pos[0], 0.011, pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[radio, 20]} />
    </mesh>
  );
}

/* Un árbol de la ley: tronco corteza suave + tres masas de copa. */
function Arbol({ pos, escala = 1, matTronco, matCopa }) {
  return (
    <group position={pos} scale={escala}>
      <Pieza tipo="cil" args={[0.16, 0.24, 2.3, 9]} pos={[0, 1.15, 0]} mat={matTronco} />
      <Pieza tipo="ico" args={[1.15, 0]} pos={[0, 3.05, 0]} mat={matCopa} />
      <Pieza tipo="ico" args={[0.85, 0]} pos={[0.75, 2.55, 0.25]} mat={matCopa} />
      <Pieza tipo="ico" args={[0.7, 0]} pos={[-0.7, 2.5, -0.2]} mat={matCopa} />
    </group>
  );
}

function EscenaHoja({ preset, franja, mats }) {
  const altoPx = useThree((s) => s.size.height);
  /* el grosor de tinta, calibrado a la distancia del plano de autor */
  const g = grosorContornoMundo(9, FOV, altoPx);
  const luces = useMemo(() => intensidadesDeLey(preset, franja), [preset, franja]);
  const contraPos = useMemo(
    () => [-preset.solPos[0], preset.solPos[1] * 0.5 + 2, -preset.solPos[2]],
    [preset],
  );
  const casco = { casco: true, matCasco: mats.contorno, g };

  return (
    <>
      <color attach="background" args={[preset.fondo]} />
      <fog attach="fog" args={[preset.niebla, preset.nieblaCerca, preset.nieblaLejos]} />

      {/* LA LUZ DE LA LEY: preset aprobado + relleno desacoplado de la clave */}
      <hemisphereLight args={[preset.cielo, preset.suelo, luces.hemisferio]} />
      <ambientLight color={preset.niebla} intensity={luces.ambiente} />
      <directionalLight position={preset.solPos} color={preset.luz} intensity={luces.clave} />
      <directionalLight position={contraPos} color={preset.relleno} intensity={luces.contra} />

      {/* ── PAISAJE (sin contorno) ─────────────────────────────────── */}
      {/* el suelo: pasto con un sendero y una era labrada */}
      <Pieza tipo="circ" args={[60, 40]} pos={[0, 0, 0]} rot={[-Math.PI / 2, 0, 0]} mat={mats.pasto} />
      <Pieza
        tipo="plano"
        args={[1.7, 14]}
        pos={[0.6, 0.01, 3]}
        rot={[-Math.PI / 2, 0, 0.06]}
        mat={mats.camino}
      />
      <Pieza
        tipo="plano"
        args={[2.6, 1.9]}
        pos={[-4.7, 0.01, 2.8]}
        rot={[-Math.PI / 2, 0, -0.15]}
        mat={mats.tierraLabrada}
      />

      {/* la roca (paisaje: la luz la modela en tres bandas, sin borde) */}
      <Pieza tipo="dod" args={[0.85, 0]} pos={[-5.4, 0.55, 0.4]} rot={[0.3, 0.5, 0.1]} mat={mats.roca} />
      <Pieza tipo="dod" args={[0.38, 0]} pos={[-4.5, 0.26, 1.1]} rot={[0.8, 0.2, 0.4]} mat={mats.piedra} />

      {/* el árbol cercano y la fila del fondo (follajeLejos: la muestra fría) */}
      <Arbol pos={[-3.1, 0, -1]} matTronco={mats.corteza} matCopa={mats.follajeCerca} />
      <Arbol pos={[-7.5, 0, -15]} escala={0.9} matTronco={mats.corteza} matCopa={mats.follajeLejos} />
      <Arbol pos={[-5.2, 0, -17]} escala={1.1} matTronco={mats.corteza} matCopa={mats.follajeLejos} />
      <Arbol pos={[6.4, 0, -16]} escala={0.95} matTronco={mats.corteza} matCopa={mats.follajeLejos} />

      {/* las colinas del fondo: solo silueta y muestra fría */}
      <Pieza tipo="cono" args={[8, 10, 7]} pos={[-14, 4.6, -30]} mat={mats.follajeLejos} />
      <Pieza tipo="cono" args={[10, 13, 7]} pos={[-3, 6, -34]} mat={mats.follajeLejos} />
      <Pieza tipo="cono" args={[7, 9, 7]} pos={[8, 4.1, -30]} mat={mats.follajeLejos} />
      <Pieza tipo="cono" args={[11, 14, 7]} pos={[18, 6.5, -36]} mat={mats.follajeLejos} />

      {/* LA CASA CANÓNICA a escala de ley: zócalo, encalado, teja, carpintería.
          Puerta 2,05 · alero 2,5 · cumbrera 3,4. SIN tejaSombra: la banda la hace. */}
      <group position={[1.4, 0, -1.8]} rotation={[0, -0.22, 0]}>
        <Pieza tipo="caja" args={[3.7, 0.5, 3.1]} pos={[0, 0.25, 0]} mat={mats.zocalo} />
        <Pieza tipo="caja" args={[3.6, 2.0, 3.0]} pos={[0, 1.5, 0]} mat={mats.encalado} />
        {/* el hastial: prisma triangular encalado hasta la cumbrera */}
        <Pieza
          tipo="cil"
          args={[1.04, 1.04, 2.9, 3, 1]}
          pos={[0, 2.62, 0]}
          rot={[-Math.PI / 2, 0, 0]}
          mat={mats.encalado}
        />
        {/* los dos faldones de teja, con alero */}
        <Pieza tipo="caja" args={[2.35, 0.09, 3.5]} pos={[-0.95, 3.0, 0]} rot={[0, 0, 0.72]} mat={mats.teja} />
        <Pieza tipo="caja" args={[2.35, 0.09, 3.5]} pos={[0.95, 3.0, 0]} rot={[0, 0, -0.72]} mat={mats.teja} />
        <Pieza tipo="caja" args={[0.18, 0.12, 3.55]} pos={[0, 3.42, 0]} mat={mats.madera} />
        {/* puerta a 2,05 y ventana que espera */}
        <Pieza tipo="caja" args={[0.95, 2.05, 0.08]} pos={[-0.7, 1.02, 1.53]} mat={mats.carpinteria} />
        <Pieza tipo="caja" args={[0.75, 0.75, 0.08]} pos={[0.95, 1.55, 1.53]} mat={mats.ventana} />
      </group>

      {/* el agua: la única transparencia de la ley */}
      <Pieza tipo="circ" args={[1.35, 26]} pos={[5.7, 0.02, 1.4]} rot={[-Math.PI / 2, 0, 0]} mat={mats.agua} />

      {/* ── HABITANTES (contorno tinta ~1.5 px) ────────────────────── */}
      {/* la persona: 1,70 m — ruana, sombrero y una sola cucharada de acento */}
      <group position={[-1.5, 0, 0.9]} rotation={[0, 0.25, 0]}>
        <Pieza tipo="cil" args={[0.14, 0.17, 0.8, 10]} pos={[0, 0.4, 0]} mat={mats.tierraLabrada} radio={0.4} {...casco} />
        <Pieza tipo="cil" args={[0.37, 0.21, 0.64, 12]} pos={[0, 1.08, 0]} mat={mats.carpinteria} radio={0.37} {...casco} />
        <Pieza tipo="toro" args={[0.31, 0.032, 8, 18]} pos={[0, 0.92, 0]} rot={[Math.PI / 2, 0, 0]} mat={mats.acento} radio={0.34} />
        <Pieza tipo="esf" args={[0.17, 12, 10]} pos={[0, 1.5, 0]} mat={mats.piel} radio={0.17} {...casco} />
        <Pieza tipo="cil" args={[0.31, 0.31, 0.035, 14]} pos={[0, 1.62, 0]} mat={mats.encalado} radio={0.31} {...casco} />
        <Pieza tipo="cil" args={[0.15, 0.17, 0.15, 12]} pos={[0, 1.7, 0]} mat={mats.encalado} radio={0.17} {...casco} />
      </group>

      {/* el perro: 0,59 m — el ancla de Oliver, intocable */}
      <group position={[-0.2, 0, 1.7]} rotation={[0, -0.5, 0]}>
        <Pieza tipo="cil" args={[0.125, 0.125, 0.34, 10]} pos={[0, 0.33, 0]} rot={[0, 0, Math.PI / 2]} mat={mats.camino} radio={0.2} {...casco} />
        <Pieza tipo="esf" args={[0.125, 10, 8]} pos={[0.19, 0.33, 0]} mat={mats.camino} radio={0.125} {...casco} />
        <Pieza tipo="esf" args={[0.125, 10, 8]} pos={[-0.19, 0.33, 0]} mat={mats.camino} radio={0.125} {...casco} />
        <Pieza tipo="esf" args={[0.115, 10, 8]} pos={[0.3, 0.47, 0]} mat={mats.camino} radio={0.115} {...casco} />
        <Pieza tipo="cono" args={[0.04, 0.1, 6]} pos={[0.27, 0.585, 0.05]} rot={[0.15, 0, 0]} mat={mats.corteza} radio={0.05} {...casco} />
        <Pieza tipo="cono" args={[0.04, 0.1, 6]} pos={[0.27, 0.585, -0.05]} rot={[-0.15, 0, 0]} mat={mats.corteza} radio={0.05} {...casco} />
        <Pieza tipo="cil" args={[0.035, 0.045, 0.22, 8]} pos={[0.13, 0.11, 0.07]} mat={mats.camino} radio={0.1} {...casco} />
        <Pieza tipo="cil" args={[0.035, 0.045, 0.22, 8]} pos={[0.13, 0.11, -0.07]} mat={mats.camino} radio={0.1} {...casco} />
        <Pieza tipo="cil" args={[0.035, 0.045, 0.22, 8]} pos={[-0.13, 0.11, 0.07]} mat={mats.camino} radio={0.1} {...casco} />
        <Pieza tipo="cil" args={[0.035, 0.045, 0.22, 8]} pos={[-0.13, 0.11, -0.07]} mat={mats.camino} radio={0.1} {...casco} />
        <Pieza tipo="cil" args={[0.02, 0.035, 0.24, 8]} pos={[-0.33, 0.45, 0]} rot={[0, 0, 0.9]} mat={mats.camino} radio={0.09} {...casco} />
      </group>

      {/* ── INTERACTIVO (contorno tinta): el portal ventana-viva ───── */}
      <group position={[4.2, 0, -1]} rotation={[0, -0.35, 0]}>
        <Pieza tipo="cil" args={[0.09, 0.11, 2.1, 9]} pos={[-0.95, 1.05, 0]} mat={mats.madera} radio={0.11} {...casco} />
        <Pieza tipo="cil" args={[0.09, 0.11, 2.1, 9]} pos={[0.95, 1.05, 0]} mat={mats.madera} radio={0.11} {...casco} />
        <Pieza tipo="ico" args={[0.4, 0]} pos={[-0.9, 2.2, 0]} mat={mats.follajeCerca} radio={0.4} {...casco} />
        <Pieza tipo="ico" args={[0.45, 0]} pos={[-0.45, 2.55, 0]} mat={mats.follajeCerca} radio={0.45} {...casco} />
        <Pieza tipo="ico" args={[0.48, 0]} pos={[0.1, 2.68, 0]} mat={mats.follajeCerca} radio={0.48} {...casco} />
        <Pieza tipo="ico" args={[0.45, 0]} pos={[0.6, 2.5, 0]} mat={mats.follajeCerca} radio={0.45} {...casco} />
        <Pieza tipo="ico" args={[0.38, 0]} pos={[0.95, 2.15, 0]} mat={mats.follajeCerca} radio={0.38} {...casco} />
        {/* el corazón emisivo con su anillo de tinta (el filo del interactivo) */}
        <Pieza tipo="circ" args={[0.72, 26]} pos={[0, 1.45, 0]} mat={mats.portal} />
        <mesh material={mats.tintaFrente} position={[0, 1.45, 0]}>
          <torusGeometry args={[0.73, Math.max(g, 0.008), 8, 40]} />
        </mesh>
      </group>

      {/* la luna emisiva, solo cuando la franja la motiva */}
      {franja === 'noche' ? (
        <Pieza tipo="esf" args={[1.5, 16, 12]} pos={[-22, 20, -30]} mat={mats.luna} />
      ) : null}

      {/* sombras de contacto: un solo lenguaje para toda la hoja */}
      <SombraContacto pos={[-5.4, 0, 0.4]} radio={0.95} mat={mats.sombra} />
      <SombraContacto pos={[-3.1, 0, -1]} radio={1.15} mat={mats.sombra} />
      <SombraContacto pos={[-1.5, 0, 0.9]} radio={0.42} mat={mats.sombra} />
      <SombraContacto pos={[-0.2, 0, 1.7]} radio={0.4} mat={mats.sombra} />
      <SombraContacto pos={[1.4, 0, -1.8]} radio={2.5} mat={mats.sombra} />
      <SombraContacto pos={[4.2, 0, -1]} radio={1.15} mat={mats.sombra} />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom
        minDistance={5}
        maxDistance={16}
        target={[0.2, 1.3, 0]}
        minPolarAngle={0.5}
        maxPolarAngle={1.62}
        minAzimuthAngle={-0.9}
        maxAzimuthAngle={0.9}
        enableDamping
        dampingFactor={0.08}
      />
      <AdaptiveDpr pixelated />
    </>
  );
}

/** El mockup standalone: #/mockups/hoja-prueba-valle (franja con ?ciclo=). */
export default function HojaPruebaValle() {
  const [listo, setListo] = useState(false);
  const { tier, reducedMotion } = useMemo(() => decidirTier(), []);
  const perfil = perfilDeTier(tier);
  const { franja, hora } = useCicloDia({ reducedMotion });
  const preset = presetDeHora(franja);

  /* Los materiales de la ley: una sola creación, liberación al desmontar.
     Todo lo físico sale de crearMaterialValle; el acento es la única
     cucharada (cochinilla) y la tinta solo existe como borde. */
  const mats = useMemo(() => {
    const m = {};
    for (const nombre of Object.keys(MUESTRAS)) m[nombre] = crearMaterialValle(nombre);
    m.acento = crearMaterialValle('zocalo', { color: ACENTOS.cochinilla });
    m.ventana = crearMaterialEmisivo('ventana');
    m.portal = crearMaterialEmisivo('portal');
    m.luna = crearMaterialEmisivo('luna');
    m.contorno = crearMaterialContorno();
    m.tintaFrente = crearMaterialTinta();
    return m;
  }, []);
  /* la sombra de contacto sigue el tinte de sombra de la franja */
  const matsHora = useMemo(
    () => ({ ...mats, sombra: crearMaterialSombraContacto(preset.sombra) }),
    [mats, preset],
  );
  useEffect(() => {
    return () => {
      Object.values(mats).forEach((x) => x.dispose());
    };
  }, [mats]);
  useEffect(() => {
    const { sombra } = matsHora;
    return () => sombra.dispose();
  }, [matsHora]);

  const irAFranja = (h) => {
    const base = window.location.hash.split('?')[0] || '#/mockups/hoja-prueba-valle';
    window.location.hash = `${base}?ciclo=${h}`;
    window.location.reload();
  };

  return (
    <section
      style={{ position: 'fixed', inset: 0, background: preset.fondo }}
      data-tier={tier}
      data-franja={franja}
      aria-label="Hoja de prueba de la ley visual del valle"
    >
      <style>{CSS_HOJA}</style>
      <Canvas
        className={`hpv-canvas${listo ? ' hpv-canvas--lista' : ''}`}
        dpr={perfil.dpr}
        gl={{ antialias: perfil.antialias, powerPreference: 'high-performance' }}
        camera={{ position: CAMARA, fov: FOV }}
        frameloop="demand"
        onCreated={({ gl }) => {
          gl.setClearColor(preset.fondo);
          setListo(true);
        }}
      >
        <EscenaHoja preset={preset} franja={franja} mats={matsHora} />
      </Canvas>

      <div className="hpv-chrome">
        <h2 className="hpv-titulo">
          La hoja de prueba del valle
          <small>
            Roca, árbol, persona, perro, casa, portal y agua bajo una sola ley: 16 muestras,
            tres bandas de luz y borde de tinta solo para habitantes e interactivos. Si un
            activo nuevo desentona aquí, no entra al valle.
          </small>
        </h2>
        <nav className="hpv-franjas" aria-label="Franja del día">
          {FRANJAS_HOJA.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`hpv-franja${franja === f.id ? ' hpv-franja--activa' : ''}`}
              onClick={() => irAFranja(f.hora)}
            >
              {f.rotulo}
            </button>
          ))}
          <span className="hpv-hora">{hora.toFixed(1)} h</span>
        </nav>
      </div>

      <footer className="hpv-paleta" aria-label="Las dieciséis muestras aprobadas">
        {Object.entries(COLORES_MADRE).map(([nombre, hex]) => (
          <span key={nombre} className="hpv-chip hpv-chip--madre" style={{ background: hex }}>
            {nombre}
          </span>
        ))}
        <span className="hpv-sep" aria-hidden="true" />
        {Object.entries(MUESTRAS).map(([nombre, m]) => (
          <span key={nombre} className="hpv-chip" style={{ background: m.hex }} title={m.uso}>
            {nombre}
          </span>
        ))}
      </footer>
    </section>
  );
}

const CSS_HOJA = `
.hpv-canvas { opacity: 0; transition: opacity 0.6s ease; }
.hpv-canvas--lista { opacity: 1; }
.hpv-chrome {
  position: absolute; left: 0; right: 0; top: 0;
  padding: max(14px, env(safe-area-inset-top)) 18px 0;
  pointer-events: none;
}
.hpv-titulo {
  margin: 0; font-size: 1.12rem; font-weight: 800; color: #241a10;
  text-shadow: 0 1px 0 rgba(255,248,236,0.5);
}
.hpv-titulo small {
  display: block; margin-top: 4px; max-width: 38rem;
  font-size: 0.78rem; font-weight: 500; line-height: 1.45; color: #3a2a18;
}
.hpv-franjas {
  display: flex; gap: 6px; align-items: center; margin-top: 10px;
  pointer-events: auto; flex-wrap: wrap;
}
.hpv-franja {
  border: 1px solid rgba(36,26,16,0.35); border-radius: 999px;
  background: rgba(255,248,236,0.72); color: #241a10;
  font-size: 0.74rem; font-weight: 700; padding: 4px 11px; cursor: pointer;
}
.hpv-franja--activa { background: #241a10; color: #fff8ec; }
.hpv-hora { font-size: 0.72rem; font-weight: 600; color: #3a2a18; opacity: 0.75; }
.hpv-paleta {
  position: absolute; left: 0; right: 0; bottom: 0;
  display: flex; gap: 5px; align-items: center;
  padding: 8px 12px max(10px, env(safe-area-inset-bottom));
  overflow-x: auto; background: linear-gradient(transparent, rgba(36,26,16,0.28));
}
.hpv-chip {
  flex: 0 0 auto; border-radius: 7px; padding: 10px 8px 3px;
  min-width: 52px; font-size: 0.58rem; font-weight: 700; text-align: center;
  color: #fff8ec; text-shadow: 0 1px 2px rgba(36,26,16,0.85);
  border: 1px solid rgba(36,26,16,0.4);
}
.hpv-chip--madre { min-width: 62px; padding-top: 16px; border-width: 2px; }
.hpv-sep { flex: 0 0 1px; align-self: stretch; background: rgba(255,248,236,0.5); margin: 0 4px; }
`;
