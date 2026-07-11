/*
 * Mundo3D — la ESCENA-MUNDO genérica, elegida por DATOS (DR §4.3).
 *
 * Lee `MUNDO_3D[mundoId]`, elige el ARQUETIPO por `escena` de un registro
 * CERRADO (`ESCENAS`) y lo monta dentro de un <Canvas> frugal. No tiene lógica
 * de negocio: solo cablea datos → arquetipo. Sumar un mundo SÍ-3D que reusa un
 * arquetipo NO toca este archivo: solo se añade una entrada en `mundo3dData`.
 * Se toca `ESCENAS` SOLO cuando aparece una metáfora espacial nueva.
 *
 * Presupuesto de rendimiento (DR §6): sin sombras, DPR≤1.5 (≤1.25 en tier medio),
 * AdaptiveDpr, `frameloop='demand'` si reducedMotion, materiales Lambert/Basic.
 * El chunk de three/fiber/drei baja PEREZOSO (lo importa el host con React.lazy).
 */
import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, OrbitControls } from '@react-three/drei';
import { EscenaCutaway } from './escenas/EscenaCutaway.jsx';
import { MUNDO_3D } from './mundo3dData';

/* Registro CERRADO de arquetipos. Solo `cutaway` está construido (el prototipo);
   flujo/recinto/estratos se añaden aquí cuando se construyan (una sola vez). */
const ESCENAS = {
  cutaway: EscenaCutaway,
};

export default function Mundo3D({
  mundoId,
  tier = 'alto',
  reducedMotion = false,
  clima = 'soleado',
  vida01 = 0.5,
  onHotspot,
}) {
  const d = MUNDO_3D[mundoId];
  const Escena = d && d.escena ? ESCENAS[d.escena] : null;

  // Altura del corte (para encuadrar la cámara) y distancia desde `entrada.zoom`.
  const { camPos, target } = useMemo(() => {
    const capas = d?.params?.capas || [];
    const alto = capas.reduce((s, c) => s + (c.alto || 0), 0) || 2.8;
    const dist = d?.entrada?.zoom || 6.5;
    /** @type {[number, number, number]} */
    const camPosT = [0, alto * 0.7, dist];
    /** @type {[number, number, number]} */
    const targetT = [0, alto * 0.5, 0];
    return { camPos: camPosT, target: targetT };
  }, [d]);

  // escena===null (o arquetipo aún no construido) → el host cae al 2D.
  if (!Escena) return null;

  const rm = reducedMotion || tier === 'bajo';
  const dprMax = tier === 'medio' ? 1.25 : 1.5;

  return (
    <Canvas
      className="mundo3d-canvas"
      dpr={[1, dprMax]}
      gl={{ antialias: tier !== 'medio', powerPreference: 'high-performance' }}
      camera={{ position: camPos, fov: 42 }}
      frameloop={rm ? 'demand' : 'always'}
    >
      <Suspense fallback={null}>
        <Escena
          params={d.params}
          hotspots={d.hotspots}
          entrada={d.entrada}
          clima={clima}
          vida01={vida01}
          reducedMotion={rm}
          onHotspot={onHotspot}
        />
        <OrbitControls
          makeDefault
          target={target}
          enablePan={false}
          enableZoom
          minDistance={4}
          maxDistance={12}
          minPolarAngle={0.35}
          maxPolarAngle={1.3}
          enableDamping
          dampingFactor={0.08}
        />
        <AdaptiveDpr pixelated />
      </Suspense>
    </Canvas>
  );
}
