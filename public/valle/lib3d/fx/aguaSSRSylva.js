// ── Agua de pantalla y cáusticas ────────────────────────────────────────────
// Implementación original para el valle. No porta shader ni dependencia de
// terceros: conserva el contrato visual de agua (reflejo de lo que ya está en
// pantalla, refracción por olas y cáusticas en el lecho) sin sumar una pasada.

const VERT = /* glsl */`
  varying vec2 vUv;
  varying vec2 vPantalla;
  varying vec3 vMundo;
  void main() {
    vUv = uv;
    vec4 mundo = modelMatrix * vec4(position, 1.0);
    vMundo = mundo.xyz;
    vec4 clip = projectionMatrix * viewMatrix * mundo;
    vPantalla = clip.xy / max(clip.w, 0.0001) * 0.5 + 0.5;
    gl_Position = clip;
  }
`;

const FRAG = /* glsl */`
  uniform sampler2D uPantalla;
  uniform float uTiempo;
  uniform float uSSR;
  varying vec2 vUv;
  varying vec2 vPantalla;
  varying vec3 vMundo;

  float caustica(vec2 p) {
    float a = pow(1.0 - abs(sin(p.x * 7.0 + sin(p.y * 5.0) + uTiempo * 0.55)), 9.0);
    float b = pow(1.0 - abs(sin(p.y * 8.5 - sin(p.x * 4.0) - uTiempo * 0.42)), 9.0);
    float c = pow(1.0 - abs(sin((p.x + p.y) * 5.5 + uTiempo * 0.26)), 11.0);
    return max(a * b, c * 0.55);
  }
  void main() {
    vec2 p = vUv - 0.5;
    float borde = 1.0 - smoothstep(0.78, 1.0, length(p) * 2.0);
    float olaA = sin(vMundo.x * 0.48 + uTiempo * 1.25) + sin(vMundo.z * 0.39 - uTiempo * 0.92);
    float olaB = sin((vMundo.x - vMundo.z) * 0.76 + uTiempo * 1.55);
    vec2 ola = vec2(olaA, olaB) * 0.0045;

    // SSR económico: toma el framebuffer ya pintado detrás de la lámina. La
    // muestra desplazada por ola aporta refracción; la segunda muestra invierte
    // el eje vertical alrededor de la superficie y da el reflejo de pantalla.
    // Fuera de pantalla se usa el color propio del agua, nunca un borde negro.
    vec2 refrUv = clamp(vPantalla + ola, 0.002, 0.998);
    vec2 reflUv = clamp(vec2(vPantalla.x + ola.x * 2.1, 1.0 - vPantalla.y + ola.y), 0.002, 0.998);
    vec3 refraccion = texture2D(uPantalla, refrUv).rgb;
    vec3 reflejo = texture2D(uPantalla, reflUv).rgb;
    float fresnel = pow(1.0 - clamp(0.54 + olaA * 0.10, 0.0, 1.0), 3.0);
    vec3 agua = mix(vec3(0.035, 0.13, 0.14), refraccion * vec3(0.42, 0.77, 0.74), 0.52);
    agua = mix(agua, reflejo * vec3(0.72, 0.91, 0.94), (0.16 + fresnel * 0.55) * uSSR);

    float luz = caustica(vMundo.xz * 0.32 + ola * 22.0);
    agua += vec3(0.18, 0.58, 0.49) * luz * 0.72;
    float anillos = sin(length(p - vec2(0.0, 0.28)) * 62.0 - uTiempo * 3.1) * 0.5 + 0.5;
    agua += vec3(0.08, 0.18, 0.17) * anillos * exp(-length(p - vec2(0.0, 0.28)) * 5.5);
    float espuma = smoothstep(0.68, 0.98, length(p) * 2.0) * (0.35 + 0.65 * luz);
    agua = mix(agua, vec3(0.86, 0.94, 0.90), espuma * 0.56);
    gl_FragColor = vec4(agua, borde * 0.91);
  }
`;

/**
 * Lámina de agua con SSR de framebuffer. Debe dibujarse transparente, después
 * del terreno: `onBeforeRender` copia únicamente lo ya visible, por eso nunca
 * se realimenta a sí misma y tampoco necesita un render extra de la escena.
 */
export function crearAguaSSR(THREE, { geometria, intensidadSSR = 1 } = {}) {
  if (!geometria) throw new Error('crearAguaSSR: falta la geometría de la lámina');
  const pantalla = new THREE.FramebufferTexture(2, 2);
  pantalla.colorSpace = THREE.NoColorSpace;
  pantalla.minFilter = THREE.LinearFilter;
  pantalla.magFilter = THREE.LinearFilter;
  const uniforms = {
    uPantalla: { value: pantalla },
    uTiempo: { value: 0 },
    uSSR: { value: Math.max(0, Math.min(1, intensidadSSR)) },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometria, material);
  mesh.name = 'agua-ssr-causticas';
  mesh.renderOrder = 3;
  const tamano = new THREE.Vector2();
  let ancho = 2, alto = 2;
  mesh.onBeforeRender = (renderer) => {
    renderer.getDrawingBufferSize(tamano);
    const w = Math.max(2, Math.floor(tamano.x));
    const h = Math.max(2, Math.floor(tamano.y));
    if (w !== ancho || h !== alto) {
      ancho = w;
      alto = h;
      pantalla.image.width = w;
      pantalla.image.height = h;
      pantalla.needsUpdate = true;
    }
    renderer.copyFramebufferToTexture(new THREE.Vector2(0, 0), pantalla);
  };
  return {
    mesh,
    material,
    update(t) { uniforms.uTiempo.value = t; },
    dispose() { pantalla.dispose(); material.dispose(); },
    estado() { return { tecnica: 'framebuffer-ssr', intensidadSSR: uniforms.uSSR.value, ancho, alto }; },
  };
}
