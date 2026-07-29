/*
 * DomoCielo — el CIELO CON DOMO de la toma B (estilizada Switch/BOTW), como
 * pieza del kit para cualquier "mundo vivo".
 *
 * El fondo plano (`<color attach="background">`) cuenta la hora pero no VENDE:
 * la toma B del bosque (#2510) demostró que un domo de gradiente
 * cenit→horizonte con el glow del sol es lo que vuelve el atardecer un
 * cartel. Este componente saca ese shader (mínimo: 2 mix y un pow, corre en
 * Android barato) del take y lo alimenta con la MISMA atmósfera viva del kit
 * (`useAtmosferaMundo`): el domo amanece, dora y anochece con el valle, sin
 * tablas propias de color.
 *
 * Derivación (cero fuentes nuevas de verdad):
 *   · horizonte = atm.niebla  → el domo EMPATA con el fog que come el fondo.
 *   · cenit     = atm.cielo   → la bóveda del hemisferio de la familia.
 *   · glow      = atm.luz     → el halo alrededor del sol/luna de la franja.
 *   · dirección = atm.solPos  → el mismo arco del día del valle.
 * La FUERZA del glow sí es capa gráfica por franja (el atardecer vende, el
 * mediodía apenas insinúa): tabla GLOW_FRANJA, calcada de la toma B.
 *
 * Uso (dentro del Canvas, junto a <AtmosferaMundo>):
 *   const atm = useAtmosferaMundo({ familia, reducedMotion });
 *   <DomoCielo atm={atm} radio={60} />
 *
 * El material NO escribe depth (todo lo demás pinta encima) y va BackSide
 * (la cámara vive adentro). Importa three → solo para archivos de escena.
 */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

/* La capa gráfica por franja: cuánto vende el halo del astro (toma B). */
const GLOW_FRANJA = {
  amanecer: 0.55,
  manana: 0.3,
  mediodia: 0.22,
  tarde: 0.32,
  atardecer: 0.75,
  noche: 0.32,
};

const VERT = /* glsl */ `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const FRAG = /* glsl */ `
  varying vec3 vPos;
  uniform vec3 uCenit;
  uniform vec3 uHorizonte;
  uniform vec3 uAstro;
  uniform vec3 uSolDir;
  uniform float uGlow;
  void main() {
    vec3 dir = normalize(vPos);
    float h = clamp(dir.y, 0.0, 1.0);
    vec3 col = mix(uHorizonte, uCenit, pow(h, 0.58));
    float s = pow(max(dot(dir, normalize(uSolDir)), 0.0), 5.0);
    col += uAstro * s * uGlow;
    gl_FragColor = vec4(col, 1.0);
  }
`;

/**
 * @param {object} props
 * @param {import('./atmosfera.js').AtmosferaMundo} props.atm  la atmósfera viva
 *   resuelta (de `useAtmosferaMundo`) — el domo hereda sus colores y su sol.
 * @param {number} [props.radio=60]  radio del domo; MÁS GRANDE que el far de la
 *   niebla de la escena, para que el fog nunca lo recorte raro.
 * @param {number|null} [props.glow=null]  fuerza del halo; null → la tabla por
 *   franja de la toma B (el atardecer vende).
 */
export default function DomoCielo({ atm, radio = 60, glow = null }) {
  const meshRef = useRef(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          uCenit: { value: new THREE.Color('#6fb0dd') },
          uHorizonte: { value: new THREE.Color('#eae9c0') },
          uAstro: { value: new THREE.Color('#fff3cf') },
          uSolDir: { value: new THREE.Vector3(6, 9, 4) },
          uGlow: { value: 0.3 },
        },
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  /* La franja cambia unas pocas veces al día: escribir uniforms ahí es gratis
     (mismo contrato de snap que AtmosferaMundo — el velo Odyssey cubre a los
     mundos al entrar; dentro, la franja rara vez cruza en cámara). Escritura
     imperativa a través del REF del mesh (el patrón de la casa), en
     layout-effect: antes del primer frame pintado. */
  useLayoutEffect(() => {
    const m = meshRef.current;
    if (!m) return;
    const u = m.material.uniforms;
    /* La NOCHE apaga el domo: las familias cálidas (corral, sotobosque)
       aportan su 40% claro a la mezcla y sin esto el cielo nocturno queda
       gris-lavado. `intensidad` ya ES "cuánto baja la hora" (noche 0.55,
       día ≥0.9): se reusa como atenuador — de día no muerde (clamp a 1). */
    const kNoche = Math.min(1, 0.22 + 0.78 * atm.intensidad);
    u.uCenit.value.set(atm.cielo).multiplyScalar(kNoche);
    u.uHorizonte.value.set(atm.niebla).multiplyScalar(kNoche);
    u.uAstro.value.set(atm.luz);
    u.uSolDir.value.set(atm.solPos[0], atm.solPos[1], atm.solPos[2]);
    u.uGlow.value = glow ?? GLOW_FRANJA[atm.franja] ?? 0.3;
  }, [atm, glow]);

  return (
    <mesh ref={meshRef} material={material} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[radio, 24, 12]} />
    </mesh>
  );
}
