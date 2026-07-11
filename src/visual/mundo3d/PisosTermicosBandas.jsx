/*
 * PisosTermicosBandas — OVERLAY r3f de los pisos térmicos sobre la Sierra.
 *
 * NO dibuja la montaña (esa es la `VistaGlobalSierra`, otra pieza): dibuja las
 * BANDAS de piso térmico como un aura de contorno translúcida que envuelve la
 * silueta por altitud. Se COMPONE con la montaña por PROPS (nunca la edita): la
 * montaña le pasa su escala (`alturaCumbre`, `radioBase`, `radioCumbre`, `centro`)
 * y la banda se coloca en la altura real de cada piso (metros → fracción de la
 * cumbre, ver `pisosTermicos.js`). Con los defaults también luce sola en vitrina.
 *
 * QUÉ HACE, fiel al encargo (SIERRA-NEVADA-VISTA-GLOBAL):
 *   · Cada piso es una banda RESALTABLE y NAVEGABLE (clic o botón → onSeleccionPiso).
 *   · Resalta el piso del USUARIO ("usted está aquí"): más opaca + filo de acento
 *     + respiración sutil (si hay movimiento permitido).
 *   · Los pisos NO compatibles quedan VISIBLES pero ATENUADOS —"existe, explórelo,
 *     no es de su piso"—: honestidad, jamás ocultarlos.
 *   · Anti-fabricación: sin `pisoUsuario` NINGUNO se resalta (todos neutros).
 *
 * OFFLINE-FIRST: etiquetas por `<Html>` DOM (fuente de la página, sin red); geometría
 * low-poly (cilindros abiertos), `meshBasicMaterial` translúcido sin luces ni sombras
 * (capa de guía, no de terreno). El nº de segmentos se recorta por device-tier.
 *
 * ── CABLEO (lo hace la montaña; este archivo no toca App.jsx/escenas) ──────────
 *
 *   import PisosTermicosBandas from './visual/mundo3d/PisosTermicosBandas.jsx';
 *   // DENTRO del <Canvas> de la Sierra, como hijo de la escena:
 *   <PisosTermicosBandas
 *     pisoUsuario={fincaViva.pisoTermico}   // id | metros | { altitud } | null
 *     tier={tier}
 *     reducedMotion={reducedMotion}
 *     alturaCumbre={5} radioBase={4} radioCumbre={0.35} centro={[0, 0, 0]}
 *     onSeleccionPiso={(piso) => entrarAPiso(piso)}
 *   />
 */
import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  compatibilidadPiso,
  altitudAFraccion,
  CUMBRE_SIERRA_M,
  ESTADO_PISO,
} from './pisosTermicos.js';
import { permite3D, perfilDeTier } from './deviceTier.js';

const lerp = (a, b, t) => a + (b - a) * t;

/* Opacidad base de la banda por estado de compatibilidad: el suyo manda, los
   otros quedan tenues pero presentes (honestidad: se ven, se exploran). */
const OPACIDAD = {
  [ESTADO_PISO.SUYO]: 0.42,
  [ESTADO_PISO.COLINDANTE]: 0.24,
  [ESTADO_PISO.OTRO]: 0.12,
  [ESTADO_PISO.NEUTRO]: 0.18,
};

/* La frase honesta que acompaña a cada piso según su relación con el del usuario. */
const NOTA_ESTADO = {
  [ESTADO_PISO.SUYO]: 'Usted está aquí',
  [ESTADO_PISO.COLINDANTE]: 'Colinda con el suyo',
  [ESTADO_PISO.OTRO]: 'Explórelo — no es de su piso',
  [ESTADO_PISO.NEUTRO]: '',
};

/**
 * Una banda de piso: cilindro abierto (aro de contorno) a la altura del rango,
 * navegable (clic o botón). Refs SOLO se tocan dentro de `useFrame` (nunca en
 * render). El aro de acento y la respiración solo se encienden para el piso del
 * usuario y con movimiento permitido.
 */
function BandaPiso({
  piso,
  geo,
  reducedMotion,
  animar,
  resaltado,
  mostrarEtiqueta,
  etiquetaDistancia,
  onSeleccionPiso,
}) {
  const matRef = useRef(null);
  const acentoRef = useRef(null);
  const [hover, setHover] = useState(false);

  const opacidadBase = OPACIDAD[piso.estado] ?? OPACIDAD[ESTADO_PISO.NEUTRO];
  const bump = (hover ? 0.12 : 0) + (resaltado ? 0.14 : 0);
  const opacidad = Math.min(0.9, opacidadBase + bump);
  const respira = animar && piso.esMio && !reducedMotion;

  useFrame((state) => {
    if (!respira) return;
    const t = state.clock.elapsedTime;
    const onda = (Math.sin(t * 1.4) + 1) * 0.5; // 0..1 lento
    if (matRef.current) matRef.current.opacity = opacidad + onda * 0.14;
    if (acentoRef.current) {
      const s = 1 + onda * 0.015;
      acentoRef.current.scale.set(s, 1, s);
    }
  });

  const seleccionar = (e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    onSeleccionPiso?.(piso);
  };

  return (
    <group position={[0, geo.centerY, 0]}>
      {/* la banda: aro de contorno translúcido, sin luz ni z-write (guía, no terreno) */}
      <mesh
        onPointerDown={seleccionar}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHover(false);
        }}
      >
        <cylinderGeometry
          args={[geo.radioTop, geo.radioBottom, geo.altura, geo.segmentos, 1, true]}
        />
        <meshBasicMaterial
          ref={matRef}
          color={piso.color}
          transparent
          opacity={opacidad}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* filo de acento en el borde alto: el "usted está aquí" del piso del usuario */}
      {(piso.esMio || resaltado) && (
        <mesh ref={acentoRef} position={[0, geo.altura / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[geo.radioTop, geo.radioTop * 0.02 + 0.012, 6, geo.segmentos]} />
          <meshBasicMaterial color={piso.color} transparent opacity={0.9} depthWrite={false} />
        </mesh>
      )}

      {/* etiqueta DOM (offline): nombre + rango + la nota honesta del estado */}
      {mostrarEtiqueta && (
        <Html
          position={[geo.radioTop, 0, 0]}
          center
          distanceFactor={etiquetaDistancia}
          zIndexRange={[24, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <button
            type="button"
            onClick={seleccionar}
            onPointerEnter={() => setHover(true)}
            onPointerLeave={() => setHover(false)}
            data-piso={piso.id}
            data-estado={piso.estado}
            style={{
              pointerEvents: 'auto',
              cursor: 'pointer',
              border: 'none',
              borderRadius: 10,
              padding: '4px 9px',
              font: '600 12px/1.15 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
              color: piso.esMio ? '#241a10' : '#3a3226',
              background: piso.esMio ? 'rgba(255,251,240,0.94)' : 'rgba(250,246,236,0.8)',
              boxShadow: piso.esMio
                ? '0 2px 8px rgba(60,44,20,0.28)'
                : '0 1px 4px rgba(60,44,20,0.16)',
              opacity: piso.estado === ESTADO_PISO.OTRO ? 0.82 : 1,
              whiteSpace: 'nowrap',
              transform: `translateX(${piso.esMio ? 6 : 2}px)`,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: 3,
                marginRight: 6,
                verticalAlign: 'baseline',
                background: piso.color,
              }}
            />
            <span style={{ fontWeight: 700 }}>{piso.nombre}</span>
            <span style={{ opacity: 0.66, fontWeight: 500 }}>
              {'  '}
              {piso.min}–{piso.max} m
            </span>
            {NOTA_ESTADO[piso.estado] ? (
              <span
                style={{
                  display: 'block',
                  marginTop: 1,
                  fontSize: 10,
                  fontWeight: piso.esMio ? 700 : 500,
                  opacity: 0.82,
                }}
              >
                {NOTA_ESTADO[piso.estado]}
              </span>
            ) : null}
          </button>
        </Html>
      )}
    </group>
  );
}

/**
 * El overlay de bandas. Se monta como hijo del `<Canvas>` de la Sierra.
 *
 * @param {object}   props
 * @param {string|number|object|null} [props.pisoUsuario]  piso del predio: id
 *        ('frio'…) | metros (1850) | { altitud|pisoTermico|… } | null → nada resaltado.
 * @param {'alto'|'medio'|'bajo'} [props.tier='alto']  device-tier (recorta segmentos/anim).
 * @param {boolean}  [props.reducedMotion=false]  apaga la respiración del piso del usuario.
 * @param {(piso:object)=>void} [props.onSeleccionPiso]  se llama al tocar una banda.
 * @param {[number,number,number]} [props.centro=[0,0,0]]  origen de la ladera en escena.
 * @param {number}   [props.alturaCumbre=5]  Y de escena en la cumbre.
 * @param {number}   [props.radioBase=4]  radio de escena al nivel del mar.
 * @param {number}   [props.radioCumbre=0.35]  radio de escena en la cumbre.
 * @param {number}   [props.holgura=1.06]  cuánto se separa la banda de la silueta (aura).
 * @param {number}   [props.cotaMaxima=CUMBRE_SIERRA_M]  metros en la cumbre (mapeo altitud→Y).
 * @param {boolean}  [props.mostrarEtiquetas=true]  etiquetas DOM por piso.
 * @param {string|null} [props.pisoActivo=null]  id de piso a resaltar por control externo (legenda/hover).
 */
export default function PisosTermicosBandas({
  pisoUsuario = null,
  tier = 'alto',
  reducedMotion = false,
  onSeleccionPiso,
  centro = [0, 0, 0],
  alturaCumbre = 5,
  radioBase = 4,
  radioCumbre = 0.35,
  holgura = 1.06,
  cotaMaxima = CUMBRE_SIERRA_M,
  mostrarEtiquetas = true,
  pisoActivo = null,
}) {
  const { pisos } = useMemo(() => compatibilidadPiso(pisoUsuario), [pisoUsuario]);

  const segmentos = useMemo(() => {
    const seg = perfilDeTier(tier)?.segmentosTerreno ?? 40;
    return Math.max(24, Math.min(48, seg));
  }, [tier]);

  // Geometría de cada banda: metros → fracción de cumbre → Y y radio de escena.
  const bandas = useMemo(() => {
    const radioA = (frac) => lerp(radioBase, radioCumbre, frac) * holgura;
    const yA = (frac) => frac * alturaCumbre;
    const alturaMinima = Math.max(0.05, alturaCumbre * 0.02);
    return pisos.map((piso) => {
      const fracMin = altitudAFraccion(piso.min, cotaMaxima);
      const fracMax = altitudAFraccion(piso.max, cotaMaxima);
      const yBottom = yA(fracMin);
      const yTop = yA(fracMax);
      const altura = Math.max(alturaMinima, yTop - yBottom);
      return {
        piso,
        geo: {
          centerY: (yBottom + yTop) / 2,
          altura,
          radioBottom: radioA(fracMin),
          radioTop: radioA(fracMax),
          segmentos,
        },
      };
    });
  }, [pisos, radioBase, radioCumbre, holgura, alturaCumbre, cotaMaxima, segmentos]);

  const animar = permite3D(tier);
  // La etiqueta escala con la montaña para que no se agigante en cumbres chicas.
  const etiquetaDistancia = Math.max(4, alturaCumbre * 1.6);

  return (
    <group position={centro} name="pisos-termicos-bandas">
      {bandas.map(({ piso, geo }) => (
        <BandaPiso
          key={piso.id}
          piso={piso}
          geo={geo}
          reducedMotion={reducedMotion}
          animar={animar}
          resaltado={pisoActivo === piso.id}
          mostrarEtiqueta={mostrarEtiquetas}
          etiquetaDistancia={etiquetaDistancia}
          onSeleccionPiso={onSeleccionPiso}
        />
      ))}
    </group>
  );
}
