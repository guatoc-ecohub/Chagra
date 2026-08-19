// Gradeo filmic robado de imperios (src/render/Renderer.js ShaderGradeoFinal) — prototipo valle 2026-08-01
import * as THREE from 'three';

export const ShaderGradeoFinal = {
  uniforms: {
    tDiffuse: { value: null },
    uTexel: { value: new THREE.Vector2(1 / 1920, 1 / 1080) },
    uSemilla: { value: 0 },
    // Gamma < 1: abre sombras y medios. Es el que sube la media del cuadro de 50 a 120.
    // 0.62 y no 0.60: cada centésima devuelve separación tonal en las altas luces,
    // que es donde el suelo y los edificios se estaban confundiendo (ver cabecera).
    uGamma: { value: 0.62 },
    // Curva S suave alrededor de 0.5. Devuelve algo del contraste que se lleva la gamma
    // sin volver a cerrar los negros (mezcla con smoothstep, monótona y sin clipeo).
    // Subida a 0.16: el pivote cae justo entre el suelo en sombra y el suelo al sol,
    // así que lo que gana es contraste SOL/SOMBRA sobre el terreno — el relieve y las
    // sombras proyectadas se leen, que es medio "foco" ganado gratis.
    uCurvaS: { value: 0.16 },
    // Levante de medios, ANTES del hombro. Compensa la media que pierde el cuadro al
    // oscurecer el albedo del terreno, sin tocar la exposición (que está medida y en
    // banda) y sin comprimir: lo que sube de la rodilla lo absorbe el hombro.
    uLevante: { value: 1.04 },
    uRodilla: { value: 0.66 },
    uHombro: { value: 0.95 },
    // La gamma comprime las razones entre canales (una razón 2 queda en 2^0.6 = 1.52),
    // o sea que desatura. Con el suelo más oscuro hace falta un poco más para que el
    // verde siga leyendo como verde y el azul de jugador siga cantando.
    uSaturacion: { value: 1.31 },
    // Viñeta MUY suave y en display: multiplica 0.87 en las esquinas, no 0.58 como antes.
    uVineta: { value: 0.13 },
    // Piso de negro: la sombra más oscura del cuadro queda en 0.082 (21/255). Es
    // aditivo, así que recupera media sin achatar ninguna diferencia de valor.
    uPiso: { value: 0.082 },
    uGanancia: { value: 0.945 },
    // Grano proporcional a la luminancia: máximo en los medios, casi nulo en negros y
    // blancos. ±0.01 en display = ±2.5/255, apenas textura de película.
    uGrano: { value: 0.020 },
    // Unsharp de cruz. La referencia tiene micro-contraste 21-23 y nosotros 16-17;
    // SMAA además come bordes, así que la nitidez va después y se lo devuelve.
    uNitidez: { value: 0.40 },
    // Balance de canal levemente cálido, como el sol de una campaña.
    uBalance: { value: new THREE.Vector3(1.015, 1.000, 0.982) },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec2 uTexel;
    uniform float uSemilla, uGamma, uCurvaS, uRodilla, uHombro;
    uniform float uSaturacion, uVineta, uPiso, uGanancia, uGrano, uNitidez;
    uniform vec3 uBalance;
    varying vec2 vUv;

    const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

    // Hash sin sin(): el clásico fract(sin(dot(p,k))*43758.5) pierde precisión con
    // coordenadas grandes y degenera en un damero diagonal visible justo donde más
    // molesta, en las sombras. Este (Hoskins) se mantiene blanco a 4K.
    float ruidoBlanco(vec2 p){
      vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
      q += dot(q, q.yzx + 33.33);
      return fract((q.x + q.y) * q.z);
    }

    // Parte puramente tonal de la curva. Se aplica también a los vecinos para que el
    // unsharp mida el contraste en el MISMO espacio en el que se va a ver: si se
    // afilara antes de la gamma, la gamma amplificaría el realce en las sombras
    // (derivada ~1.9 en oscuros) y aparecería ruido de borde en las zonas negras.
    vec3 curvaTonal(vec3 c){
      c = max(c, 0.0) * uBalance;
      c = pow(c, vec3(uGamma));
      c = mix(c, c * c * (3.0 - 2.0 * c), uCurvaS);
      vec3 e = max(c - uRodilla, 0.0);
      return min(c, vec3(uRodilla)) + e / (1.0 + e * uHombro);
    }

    void main(){
      vec3 c = curvaTonal(texture2D(tDiffuse, vUv).rgb);

      // ── NITIDEZ (unsharp de cruz, 4 taps) ──────────────────────────────────────
      vec3 prom = 0.25 * (
          curvaTonal(texture2D(tDiffuse, vUv + vec2(uTexel.x, 0.0)).rgb)
        + curvaTonal(texture2D(tDiffuse, vUv - vec2(uTexel.x, 0.0)).rgb)
        + curvaTonal(texture2D(tDiffuse, vUv + vec2(0.0, uTexel.y)).rgb)
        + curvaTonal(texture2D(tDiffuse, vUv - vec2(0.0, uTexel.y)).rgb));
      // El clamp es lo que evita los halos: por muy brutal que sea el borde (silueta
      // de un edificio contra el cielo) la corrección no puede pasar de ±0.05, así
      // que no aparece el ribete blanco de "sharpen de televisor".
      c += clamp((c - prom) * uNitidez, -0.05, 0.05);

      // ── SATURACIÓN ─────────────────────────────────────────────────────────────
      float l = dot(c, LUMA);
      c = max(mix(vec3(l), c, uSaturacion), 0.0);

      // ── VIÑETA ─────────────────────────────────────────────────────────────────
      // r2 vale 0 en el centro y 1 en la esquina; al cuadrado deja el centro intacto
      // y solo cierra el borde extremo. Va ANTES del piso para no romper el negro mínimo.
      vec2 d = vUv - 0.5;
      float r2 = dot(d, d) * 2.0;
      c *= 1.0 - uVineta * r2 * r2;

      // ── PISO DE NEGRO + GANANCIA ───────────────────────────────────────────────
      c = uPiso + c * uGanancia;

      // ── GRANO ──────────────────────────────────────────────────────────────────
      // 4*l*(1-l) es una campana: 1 en los medios, 0 en negro y en blanco puro.
      float lg = dot(c, LUMA);
      float peso = 4.0 * lg * (1.0 - lg);
      float g = ruidoBlanco(gl_FragCoord.xy + uSemilla) - 0.5;
      c += g * uGrano * peso;

      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }
  `,
};
