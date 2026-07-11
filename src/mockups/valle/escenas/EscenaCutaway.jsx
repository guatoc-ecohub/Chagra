/*
 * EscenaCutaway — el ARQUETIPO de escena-mundo "corte de tierra" (DR §5).
 *
 * Un bloque de suelo CORTADO que muestra sus CAPAS (hojarasca / suelo negro /
 * subsuelo) y la VIDA que de otro modo es invisible: lombrices, raíces y el
 * "internet de los hongos" (hifas). La cantidad de vida visible sigue el `score`
 * del motor existente (mundoSubsueloEngine) → el corte se PUEBLA cuando la
 * tierra revive y se despuebla cuando se cansa. "Lo invisible hecho visible".
 *
 * Contrato uniforme de arquetipo (DR §4.4):
 *   props = { params, hotspots, entrada, tinte, reducedMotion, onHotspot, onSalir }
 *   + `vida01` (0..1) y `clima` que le pasa el host/<Mundo3D>.
 * Es CONTENIDO de escena (vive dentro del <Canvas> de Mundo3D). Solo geometría
 * procedural, materiales frugales (Lambert/Basic), sin sombras (DR §6).
 */
/* Nota: las props de three (position, args, rotation, intensity, etc.) son
   válidas en el reconciliador de R3F, no en el DOM. */
import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { AbejaAngelita } from '../../../visual/creatures/AbejaAngelita.jsx';
import { useEntradaAbeja } from '../useEntradaAbeja';
import { CLIMAS } from '../valleData';

const ANCHO = 3.4; // ancho del bloque de tierra (eje x)
const PROF = 2.0; // profundidad (eje z); la cara frontal expuesta es el "corte"
const FRONT_Z = PROF / 2; // z de la cara cortada, mirando a la cámara

/** RNG determinista (mulberry32) → posiciones estables, sin parpadeo por frame. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Bandas verticales de cada capa, apiladas de arriba (hojarasca) hacia abajo. */
function calcularBandas(capas) {
  const total = capas.reduce((s, c) => s + c.alto, 0);
  let topY = total;
  return {
    total,
    bandas: capas.map((c) => {
      const y1 = topY;
      const y0 = topY - c.alto;
      topY = y0;
      return { ...c, y0, y1, centroY: (y0 + y1) / 2 };
    }),
  };
}

/** Semilleros deterministas de vida (se recortan por `vida01` → poblar/despoblar). */
function useVidaSemillas(bandas) {
  return useMemo(() => {
    const r = rng(20260710);
    const lombrices = [];
    const raices = [];
    const hifas = [];
    const pasto = [];

    bandas.forEach((b) => {
      // Lombrices: en hojarasca y suelo negro, curvadas contra la cara cortada.
      if (b.bichos.includes('lombriz')) {
        const n = b.nombre === 'suelo negro' ? 6 : 3;
        for (let i = 0; i < n; i++) {
          lombrices.push({
            x: (r() - 0.5) * (ANCHO - 0.7),
            y: b.y0 + 0.18 + r() * (b.alto - 0.36),
            rot: (r() - 0.5) * 1.4,
          });
        }
      }
      // Raíces: descienden desde arriba de la banda hacia el subsuelo.
      if (b.bichos.includes('raiz')) {
        const n = b.nombre === 'subsuelo' ? 3 : 4;
        for (let i = 0; i < n; i++) {
          raices.push({
            x: (r() - 0.5) * (ANCHO - 0.9),
            yTop: b.y1 - 0.05,
            largo: 0.45 + r() * (b.alto * 0.8),
            grosor: 0.03 + r() * 0.035,
          });
        }
      }
      // Hifas: red fina, solo en el suelo negro (donde vive el "internet").
      if (b.bichos.includes('hifa')) {
        for (let i = 0; i < 10; i++) {
          hifas.push({
            x: (r() - 0.5) * (ANCHO - 0.5),
            y: b.y0 + 0.15 + r() * (b.alto - 0.3),
            rot: (r() - 0.5) * 2.6,
            largo: 0.3 + r() * 0.5,
          });
        }
      }
    });

    // Pasto sobre la superficie: crece cuando la tierra está viva.
    for (let i = 0; i < 12; i++) {
      pasto.push({ x: (r() - 0.5) * (ANCHO - 0.4), z: (r() - 0.5) * (PROF - 0.4), alto: 0.16 + r() * 0.18 });
    }

    return { lombrices, raices, hifas, pasto };
  }, [bandas]);
}

/** Toma los primeros `round(n * vida)` elementos: poblar/despoblar suave. */
function porVida(arr, vida01) {
  const n = Math.round(arr.length * Math.max(0, Math.min(1, vida01)));
  return arr.slice(0, n);
}

export function EscenaCutaway({
  params,
  hotspots = [],
  clima = 'soleado',
  vida01 = 0.5,
  reducedMotion = false,
  onHotspot,
}) {
  const { total, bandas } = useMemo(() => calcularBandas(params?.capas || []), [params]);
  const vida = useVidaSemillas(bandas);

  // La abeja entra hacia el centro de la cara cortada.
  const foco = useMemo(() => ({ x: 0, y: total * 0.55, z: FRONT_Z }), [total]);
  const abejaRef = useEntradaAbeja(foco, { reducedMotion });

  const c = CLIMAS[clima] || CLIMAS.soleado;

  return (
    <>
      {/* Cielo/luz del clima (reusa la paleta del valle), sin sombras. */}
      <color attach="background" args={[c.cielo[1]]} />
      <fog attach="fog" args={[c.niebla, 8, c.nieblaLejos]} />
      <hemisphereLight intensity={c.intensidad * 0.7} color={c.cielo[0]} groundColor={c.ambiente} />
      <ambientLight intensity={c.intensidad * 0.5} color={c.luz} />
      <directionalLight position={[4, 7, 6]} intensity={c.intensidad * 0.9} color={c.luz} />

      {/* ── El bloque de tierra cortado: una franja por capa ── */}
      <group>
        {bandas.map((b) => (
          <mesh key={b.nombre} position={[0, b.centroY, 0]}>
            <boxGeometry args={[ANCHO, b.alto, PROF]} />
            <meshLambertMaterial color={b.color} />
          </mesh>
        ))}

        {/* Pasto en la superficie: crece con la vida del suelo. */}
        {porVida(vida.pasto, vida01).map((p, i) => (
          <mesh key={`g${i}`} position={[p.x, total + p.alto / 2, p.z]}>
            <coneGeometry args={[0.05, p.alto, 4]} />
            <meshLambertMaterial color="#5f9a45" />
          </mesh>
        ))}

        {/* Raíces: descienden por la cara cortada hacia el subsuelo. */}
        {porVida(vida.raices, Math.max(vida01, 0.12)).map((rz, i) => (
          <mesh
            key={`r${i}`}
            position={[rz.x, rz.yTop - rz.largo / 2, FRONT_Z - 0.04]}
          >
            <cylinderGeometry args={[rz.grosor * 0.4, rz.grosor, rz.largo, 5]} />
            <meshLambertMaterial color="#c9a36a" />
          </mesh>
        ))}

        {/* Hifas: la red fina de hongos ("internet del suelo"). */}
        {porVida(vida.hifas, vida01).map((h, i) => (
          <mesh key={`h${i}`} position={[h.x, h.y, FRONT_Z - 0.02]} rotation={[0, 0, h.rot]}>
            <cylinderGeometry args={[0.008, 0.008, h.largo, 3]} />
            <meshBasicMaterial color="#eae3cf" transparent opacity={0.75} />
          </mesh>
        ))}

        {/* Lombrices: curvadas contra el corte, salmón. */}
        {porVida(vida.lombrices, vida01).map((l, i) => (
          <mesh key={`l${i}`} position={[l.x, l.y, FRONT_Z + 0.02]} rotation={[0, 0, l.rot]}>
            <capsuleGeometry args={[0.055, 0.28, 3, 6]} />
            <meshLambertMaterial color="#d98a86" />
          </mesh>
        ))}
      </group>

      {/* ── Hotspots: billboards tocables; cada uno re-rutea a una vista 2D real ── */}
      {hotspots.map((h) => (
        <Html key={h.id} center distanceFactor={8} position={h.pos} zIndexRange={[20, 0]}>
          <button
            type="button"
            className="mundo3d-hotspot"
            onClick={(e) => {
              e.stopPropagation();
              onHotspot?.(h.view, h.data);
            }}
            aria-label={h.label}
          >
            <span className="mundo3d-hotspot__emoji" aria-hidden="true">{h.emoji}</span>
            <span className="mundo3d-hotspot__txt">{h.label}</span>
          </button>
        </Html>
      ))}

      {/* ── La abeja Angelita: baja y se posa junto al corte (hook compartido) ── */}
      <group ref={abejaRef}>
        <Html center distanceFactor={7} zIndexRange={[40, 10]}>
          <div className="mundo3d-abeja" aria-hidden="true">
            <AbejaAngelita size={54} animated={!reducedMotion} className="mundo3d-abeja__svg" />
          </div>
        </Html>
      </group>
    </>
  );
}

export default EscenaCutaway;
