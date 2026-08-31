/*
 * PastoVivoValle — capa de mechones instanciados para el mapa del valle.
 *
 * Técnica integrada del estudio de gráficos: geometría cruzada, atributos por
 * instancia, color por parche y viento rooted. La raíz de cada mechón queda
 * clavada al terreno; solo la parte alta se inclina. Todo es local, determinista
 * y compatible con WebGL del valle, sin GLTF, CDN ni estado de finca.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { crearGeometriaPasto, PRESUPUESTO_PASTO, sembrarPasto } from './pastoVivoValle.js';

const COLOR_DIA = {
  raiz: new THREE.Color('#3f743b'),
  punta: new THREE.Color('#b4c95e'),
  raizB: new THREE.Color('#537f36'),
  puntaB: new THREE.Color('#e1d56a'),
};

function crearMaterialPasto() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uNight: { value: 0 },
      uWindStrength: { value: 0.14 },
      uWindSpeed: { value: 1.35 },
      uGroundMap: { value: null },
      uUseGroundMap: { value: 0 },
      uRootColor: { value: COLOR_DIA.raiz.clone() },
      uTipColor: { value: COLOR_DIA.punta.clone() },
      uRootColorB: { value: COLOR_DIA.raizB.clone() },
      uTipColorB: { value: COLOR_DIA.puntaB.clone() },
    },
    side: THREE.DoubleSide,
    fog: true,
    vertexShader: `
      precision highp float;
      attribute vec2 aOrigin;
      attribute float aSeed;
      uniform float uTime;
      uniform float uWindStrength;
      uniform float uWindSpeed;
      varying vec2 vWorldXZ;
      varying float vBladeT;
      varying float vSeed;
      varying vec3 vWorldPosition;
      #include <fog_pars_vertex>

      void main() {
        float bladeT = clamp(position.y, 0.0, 1.0);
        float phase = dot(aOrigin, vec2(0.11, 0.08)) + aSeed * 6.2831853;
        float gust = sin(uTime * uWindSpeed + phase) * 0.58
          + sin(uTime * uWindSpeed * 0.47 + phase * 1.7) * 0.42;
        float rooted = pow(bladeT, 1.65);
        vec2 wind = vec2(0.84, 0.54) * gust * uWindStrength * rooted;
        vec3 local = position;
        local.xz += wind;
        vec4 world = modelMatrix * instanceMatrix * vec4(local, 1.0);
        vWorldPosition = world.xyz;
        vWorldXZ = world.xz;
        vBladeT = bladeT;
        vSeed = aSeed;
        gl_Position = projectionMatrix * viewMatrix * world;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uNight;
      uniform sampler2D uGroundMap;
      uniform float uUseGroundMap;
      uniform vec3 uRootColor;
      uniform vec3 uTipColor;
      uniform vec3 uRootColorB;
      uniform vec3 uTipColorB;
      varying vec2 vWorldXZ;
      varying float vBladeT;
      varying float vSeed;
      varying vec3 vWorldPosition;
      #include <fog_pars_fragment>
      #include <tonemapping_pars_fragment>
      #include <colorspace_pars_fragment>

      float hash21(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      void main() {
        float patch = hash21(floor(vWorldXZ * 0.72));
        float variation = hash21(vec2(vSeed + 11.7, vSeed * 3.1));
        vec3 a = mix(uRootColor, uTipColor, pow(vBladeT, 1.25));
        vec3 b = mix(uRootColorB, uTipColorB, pow(vBladeT, 1.25));
        vec3 color = mix(a, b, smoothstep(0.26, 0.82, patch) * 0.72);
        color *= mix(0.86, 1.12, variation);
        if (uUseGroundMap > 0.5) {
          vec2 uv = fract(vWorldXZ * 0.055 + 0.5);
          color *= mix(vec3(0.92), texture2D(uGroundMap, uv).rgb, 0.2);
        }
        color = mix(color, color * vec3(0.42, 0.58, 0.72), uNight * 0.68);
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
}

function prepararInstancias(mesh, items) {
  const origins = new Float32Array(items.length * 2);
  const seeds = new Float32Array(items.length);
  const dummy = new THREE.Object3D();

  items.forEach((item, index) => {
    origins[index * 2] = item.x;
    origins[index * 2 + 1] = item.z;
    seeds[index] = item.semilla;
    dummy.position.set(item.x, item.y, item.z);
    dummy.rotation.set(0, item.yaw, 0);
    dummy.scale.set(item.escala, item.escala * item.altura, item.escala);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });

  mesh.geometry.setAttribute('aOrigin', new THREE.InstancedBufferAttribute(origins, 2));
  mesh.geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  mesh.instanceMatrix.needsUpdate = true;
}

export default function PastoVivoValle({ alturaDe, tier = 'medio', reducedMotion = false, nocturno = false }) {
  const meshRef = useRef(null);
  const material = useMemo(() => crearMaterialPasto(), []);
  const materialRef = useRef(material);
  const items = useMemo(
    () => sembrarPasto({
      count: PRESUPUESTO_PASTO[tier] || PRESUPUESTO_PASTO.medio,
      area: 30,
      alturaDe,
      seed: 7331,
    }),
    [alturaDe, tier],
  );
  const geometry = useMemo(() => crearGeometriaPasto(), []);

  useEffect(() => {
    if (!meshRef.current) return undefined;
    prepararInstancias(meshRef.current, items);
    return undefined;
  }, [items]);

  useEffect(() => {
    materialRef.current.uniforms.uNight.value = nocturno ? 1 : 0;
  }, [nocturno]);

  useEffect(() => {
    const texture = new THREE.TextureLoader().load('/valle/pasto-vivo.svg', (loaded) => {
      loaded.wrapS = THREE.RepeatWrapping;
      loaded.wrapT = THREE.RepeatWrapping;
      loaded.colorSpace = THREE.SRGBColorSpace;
      materialRef.current.uniforms.uGroundMap.value = loaded;
      materialRef.current.uniforms.uUseGroundMap.value = 1;
    });
    return () => texture.dispose();
  }, []);

  useFrame((state) => {
    if (!reducedMotion) materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, items.length]}
      frustumCulled={false}
      castShadow={tier === 'alto'}
      receiveShadow={false}
    />
  );
}
