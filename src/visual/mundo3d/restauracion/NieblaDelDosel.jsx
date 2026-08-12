/*
 * NieblaDelDosel — la niebla que SE QUEDA cuando hay dosel.
 *
 * En el potrero pelado la niebla pasa de largo: el sol la levanta y el viento se
 * la lleva. Cuando hay dosel, la niebla se queda enredada entre los árboles — y
 * esa humedad quieta es la que trae el musgo, las epífitas y, al final, el agua.
 *
 * Por eso aquí la niebla NO es decoración de fondo: su opacidad la manda el mismo
 * `dosel()` del que cuelga todo lo demás. Aparece porque el monte creció. Es una
 * consecuencia, no un efecto.
 *
 * Barato: unas cartas de vaho con textura de canvas (cero assets), MeshBasic, sin
 * escribir profundidad, encaradas a la cámara. Solo donde sobra GPU.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { dosel } from './tiempoSucesion.js';
import { alturaLadera } from './sucesion.geom.js';

/* Textura suave (radial) para el vaho, generada en runtime. */
function texturaVaho() {
  const s = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.5, 'rgba(240,246,246,0.35)');
  g.addColorStop(1, 'rgba(240,246,246,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * @param {{ anioRef: { current: number }, n?: number, reducedMotion?: boolean }} props
 */
export default function NieblaDelDosel({ anioRef, n = 4, reducedMotion = false }) {
  const { camera } = useThree();
  const grupo = useRef(null);
  const tex = useMemo(() => texturaVaho(), []);
  const geo = useMemo(() => new THREE.PlaneGeometry(9, 3.4), []);
  /* Un material POR carta: cada banco de niebla lleva su propia opacidad (van
     latiendo desfasados). Se crean una vez, nunca en render. */
  const mats = useMemo(
    () =>
      Array.from(
        { length: n },
        () =>
          new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            fog: false,
          }),
      ),
    [tex, n],
  );

  // Los bancos se acuestan sobre la ladera, no a una altura inventada.
  const bancos = useMemo(() => {
    const arr = [];
    for (let i = 0; i < n; i++) {
      const x = -9 + (i / Math.max(1, n - 1)) * 18 + Math.sin(i * 2.3) * 2;
      const z = -11 + (i % 3) * 5.5;
      arr.push({
        base: [x, alturaLadera(x, z) + 1.9 + (i % 2) * 0.7, z],
        fase: i * 2.1,
        amp: 1.3 + (i % 3) * 0.6,
      });
    }
    return arr;
  }, [n]);

  useLayoutEffect(
    () => () => {
      tex.dispose();
      mats.forEach((m) => m.dispose());
      geo.dispose();
    },
    [tex, mats, geo],
  );

  useFrame((state) => {
    const g = grupo.current;
    if (!g) return;
    // La niebla es HIJA del dosel: sin monte arriba, no se queda.
    const d = dosel(anioRef.current);
    const base = Math.max(0, (d - 0.35) / 0.65) * 0.2;
    g.visible = base > 0.004;
    if (!g.visible) return;

    for (let i = 0; i < g.children.length; i++) {
      const carta = /** @type {THREE.Mesh & { material: THREE.MeshBasicMaterial }} */ (g.children[i]);
      const b = bancos[i];
      if (!reducedMotion) {
        const t = state.clock.elapsedTime;
        carta.position.x = b.base[0] + Math.sin(t * 0.05 + b.fase) * b.amp;
        carta.position.y = b.base[1] + Math.sin(t * 0.08 + b.fase) * 0.15;
        carta.material.opacity = base * (0.75 + Math.sin(t * 0.1 + b.fase) * 0.25);
      } else {
        carta.material.opacity = base * 0.8;
      }
      carta.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <group ref={grupo}>
      {bancos.map((b, i) => (
        <mesh
          key={i}
          geometry={geo}
          material={mats[i]}
          position={/** @type {[number, number, number]} */ (b.base)}
        />
      ))}
    </group>
  );
}
