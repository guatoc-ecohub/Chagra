/*
 * BloomSutil — el velo luminoso de la hora dorada, SOLO para el tier alto.
 *
 * Un UnrealBloomPass discreto (parámetros en atmosferaMadre.BLOOM: umbral alto,
 * fuerza baja) que hace florecer apenas los brillos francos — el sol en el
 * agua, el ámbar de una señal, la cal al mediodía — sin volver neón el
 * claymation. Coherencia valle↔mundo: un solo bloom, una sola receta, la luz
 * se lee del mismo atardecer en todas las escenas.
 *
 * CONTRATO DE COSTO (DR-3D-PERF-GAMABAJA): este archivo es un chunk LAZY que
 * EscenaBase3D solo importa con `tier === 'alto' && !reducedMotion` — medio y
 * bajo ni lo descargan. Aquí dentro no hay gate propio: quien monta, paga.
 * Cero dependencias nuevas: EffectComposer/UnrealBloomPass/OutputPass vienen
 * de `three/addons` (ya en el árbol de three).
 *
 * El `useFrame` con prioridad 1 TOMA el render (r3f apaga su render automático
 * cuando alguien renderiza con prioridad > 0): la escena pasa por el composer
 * (render → bloom → OutputPass, que repone tone mapping + sRGB del gl). El
 * tamaño y el pixel-ratio se siguen en caliente porque AdaptiveDpr los mueve
 * durante el regress.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BLOOM } from '../atmosferaMadre.js';

export default function BloomSutil() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const prAnterior = useRef(0);

  const composer = useMemo(() => {
    const comp = new EffectComposer(gl);
    comp.addPass(new RenderPass(scene, camera));
    // La resolución real la pone el efecto de resize de abajo (recrear el
    // composer por cada resize tiraría los render targets); aquí un stub.
    comp.addPass(new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      BLOOM.fuerza,
      BLOOM.radio,
      BLOOM.umbral,
    ));
    // OutputPass al final: repone el tone mapping + la conversión sRGB que el
    // composer se salta (sin él, la hora dorada sale lavada y lineal).
    comp.addPass(new OutputPass());
    return comp;
  }, [gl, scene, camera]);

  // Resize vivo (viewport/orientación). Aparte del dispose: cambiar de tamaño
  // NO debe soltar los render targets, solo redimensionarlos.
  useEffect(() => {
    composer.setSize(size.width, size.height);
  }, [composer, size]);

  // Al desmontar (o recrear por gl/scene/camera): soltar los render targets.
  // El render automático de r3f vuelve solo — el useFrame prioridad 1 muere
  // con el mount.
  useEffect(() => () => composer.dispose(), [composer]);

  useFrame(() => {
    // AdaptiveDpr baja/sube el DPR durante el regress: seguirlo en caliente,
    // si no el bloom queda borroso (o carísimo) tras cada gesto de órbita.
    const pr = gl.getPixelRatio();
    if (pr !== prAnterior.current) {
      prAnterior.current = pr;
      composer.setPixelRatio(pr);
      composer.setSize(size.width, size.height);
    }
    composer.render();
  }, 1);

  return null;
}
