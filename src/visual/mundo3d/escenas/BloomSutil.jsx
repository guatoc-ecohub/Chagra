/*
 * BloomSutil — el post-proceso MÍNIMO del framework de mundos (SOLO tier 'alto').
 *
 * Un solo efecto: UnrealBloomPass de `three/addons` (ya viene con `three`,
 * CERO dependencias nuevas) con threshold alto: solo brillan los emisivos y
 * las altas luces — el sol de la hora dorada, un farol de noche — nunca la
 * acuarela entera. Los parámetros por clima viven en `atmosferaMadre.js`.
 *
 * Presupuesto: tier 'medio'/'bajo' NI DESCARGAN este chunk (gate + lazy en
 * EscenaBase3D) y `reducedMotion` también lo apaga. El composer sigue el DPR
 * adaptativo de <AdaptiveDpr>, así el bloom no se paga a resolución completa
 * mientras la cámara se mueve.
 */
import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export default function BloomSutil({ strength = 0.3, radius = 0.4, threshold = 0.9 }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);

  /* El composer se crea UNA vez por trío gl/scene/camera; los parámetros y el
     tamaño se ajustan en caliente en los efectos de abajo (sin recrearlo). */
  const composer = useMemo(() => {
    const c = new EffectComposer(gl);
    c.addPass(new RenderPass(scene, camera));
    c.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0, 0, 1));
    c.addPass(new OutputPass());
    return c;
  }, [gl, scene, camera]);

  useEffect(() => {
    const bloom = composer.passes.find((p) => p instanceof UnrealBloomPass);
    if (bloom) {
      bloom.strength = strength;
      bloom.radius = radius;
      bloom.threshold = threshold;
    }
  }, [composer, strength, radius, threshold]);

  useEffect(() => {
    composer.setPixelRatio(dpr);
    composer.setSize(size.width, size.height);
  }, [composer, size.width, size.height, dpr]);

  useEffect(() => () => composer.dispose(), [composer]);

  /* Prioridad > 0: tomamos el render del frame (R3F apaga el suyo). */
  useFrame(() => composer.render(), 1);

  return null;
}
