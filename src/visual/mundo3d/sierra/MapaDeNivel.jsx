import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { BANDAS_SIERRA, altitudFincaValida, bandaDeMsnm } from '../pisosTermicos.js';
import { NIEVE, muestreadorFacetas, contornoNivel, geometriaCinta, texturaCinta } from './nieveSierra.js';
import { alturaSierra, ANCHO, FONDO, COSTA_Z, yDeMsnm } from './sierraRelieve.js';

const LINEA_HIELO = BANDAS_SIERRA.find((b) => b.id === 'superparamo')?.tope ?? 4.15;

/**
 * Curvas compartidas por portada y llegada, sobre las facetas del terreno.
 * @param {{segmentos:number, msnm?:number|null, soloFinca?:boolean, rotuloFinca?:import('react').ReactNode}} props
 */
export default function MapaDeNivel({ segmentos, msnm, soloFinca = false, rotuloFinca = null }) {
  const capas = useMemo(() => {
    const hF = muestreadorFacetas(alturaSierra, { ancho: ANCHO, fondo: FONDO, segX: segmentos, segZ: segmentos });
    const region = { x0: -ANCHO / 2 + 0.2, x1: ANCHO / 2 - 0.2, z0: COSTA_Z - 1.2, z1: FONDO / 2 - 0.2, paso: 0.08 };
    const msnmValido = altitudFincaValida(msnm);
    const out = [];
    if (!soloFinca) BANDAS_SIERRA.forEach((b) => {
      if (!Number.isFinite(b.tope)) return;
      const lineas = contornoNivel(alturaSierra, b.tope, region);
      if (!lineas.length) return;
      const esHielo = b.id === 'superparamo';
      out.push({
        key: b.id,
        geo: geometriaCinta(lineas, hF, { ancho: esHielo ? 0.06 : 0.03 }),
        color: esHielo ? NIEVE.ambar : NIEVE.tinta,
        opacidad: esHielo ? 0.92 : 0.34,
        ancla: esHielo ? lineas.flat().reduce((m, q) => (q[0] < m[0] ? q : m)) : null,   // el punto más oriental (screen-right): lejos de las etiquetas de banda, que van al occidente
      });
    });
    /* P1 — la curva de la cota REAL de la finca. Solo con altitud confirmada. */
    if (msnmValido) {
      const y = yDeMsnm(msnmValido);
      const lineas = contornoNivel(alturaSierra, y, region);
      if (lineas.length) {
        const banda = bandaDeMsnm(msnmValido);
        const color = banda?.color ?? NIEVE.tinta;
        const puntos = lineas.flat();
        const ancla = puntos.reduce((m, q) => (q[0] < m[0] ? q : m), puntos[0]);
        out.push({
          key: 'finca',
          geo: geometriaCinta(lineas, hF, { ancho: 0.045 }),
          color,
          opacidad: 0.88,
          ancla,
          esFinca: true,
          cotaMsnm: msnmValido,
          yCota: y,
        });
      }
    }
    return out;
  }, [segmentos, msnm, soloFinca]);
  useEffect(() => () => capas.forEach((c) => c.geo.dispose()), [capas]);
  const tex = texturaCinta();
  return (
    <group name="mapa-de-nivel">
      {capas.map((c) => (
        <mesh key={c.key} name={c.esFinca ? "curva-cota-finca" : c.key} geometry={c.geo}>
          <meshBasicMaterial
            map={tex} alphaMap={tex} color={c.color} transparent opacity={c.opacidad}
            depthWrite={false} side={THREE.DoubleSide} toneMapped={false}
            polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2}
          />
        </mesh>
      ))}
      {capas.filter((c) => c.ancla && c.key === 'superparamo').map((c) => (
        <group key={`${c.key}-rotulo`} position={[c.ancla[0], LINEA_HIELO + 0.22, c.ancla[1]]}>{/* +0,22: con la cámara nueva, a +0,06 el rótulo rozaba el de «Nival» */}
          <Html center distanceFactor={13} zIndexRange={[28, 8]} style={{ pointerEvents: 'none' }}>
            <div className="vsierra-hielo" aria-hidden="true">Hasta aquí llegaba el hielo · 4.800 m</div>
          </Html>
        </group>
      ))}
      {capas.filter((c) => c.esFinca).map((c) => (
        <group key="finca-rotulo" position={[c.ancla[0], c.yCota + 0.2, c.ancla[1]]}>
          <Html center distanceFactor={13} zIndexRange={[28, 8]} style={{ pointerEvents: 'none' }}>
            {rotuloFinca || <div className="vsierra-finca" style={{ '--finca': c.color }} aria-hidden="true">
              {c.cotaMsnm.toLocaleString('es-CO')} m · a la altura de su finca
            </div>}
          </Html>
        </group>
      ))}
    </group>
  );
}

