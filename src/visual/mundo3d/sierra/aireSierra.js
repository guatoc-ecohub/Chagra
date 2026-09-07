/*
 * aireSierra — EL AIRE de la vista global de la Sierra: el cielo como función
 * (compartida por el domo y por el reflejo del mar), la bruma por ALTURA
 * (perspectiva aérea con física) y la conversión de los colores de dirección
 * de arte a radiancia lineal HDR.
 *
 * Traído del mundo costero (`~/demos/mundo-costero/costero.js` + `Mar.js`):
 * allí el domo y el agua usan el MISMO `cieloAprox()` en radiancia lineal, y el
 * tone mapping ACES los baja juntos al final — por eso el reflejo y el fondo
 * casan. Aquí se conserva ese contrato, con dos diferencias declaradas:
 *
 *  1. LOS COLORES DEL CIELO NO SE REINVENTAN. `ATMOSFERA_SIERRA.fondo/cenit`
 *     (luzSierra.js) fueron afinados EN PANTALLA (ΔE nieve/cielo medido) con el
 *     domo sin tonemapping. Para que el domo HDR reproduzca EXACTAMENTE esos
 *     píxeles, `radianciaParaPantalla()` invierte numéricamente el ACES de three
 *     (`inversaACES`): la radiancia lineal que, tonemapeada, devuelve el sRGB
 *     pedido. Nada cambia a la vista; cambia que ahora el mar puede reflejarlo.
 *
 *  2. LA BRUMA TIENE ALTURA. A 40 km de un macizo tropical, el aire húmedo vive
 *     ABAJO: bajo la inversión de los alisios (~1,5-2 km) hay vapor y bruma; por
 *     encima el aire es seco y transparente. La cámara (6,6 u ≈ 7,6 km) mira la
 *     costa a través de toda la capa y la cumbre casi sin aire en medio. Un
 *     `FogExp2` uniforme lava la cumbre tanto como la playa: al revés de lo que
 *     pasa. `brumaAltura()` integra ρ(y) = ρ₀·e^(−y/H) a lo largo del rayo
 *     (forma cerrada; Quilez «better fog»). Costo: dos `exp` por fragmento.
 *
 * El climatólogo pone los números: ρ₀ y H son juicio de arte sobre un hecho
 * (la capa húmeda de los alisios); no están certificados. El operador juzga.
 */
import * as THREE from 'three';
import { ATMOSFERA_SIERRA, SOL_SIERRA } from './luzSierra.js';

/* ═══════════════════ la bruma por altura (unidades de mundo) ═══════════════════ */

export const BRUMA_SIERRA = {
  /** densidad al nivel del mar, por unidad de mundo (1 u = 1 155 m) */
  densidad: 0.14,
  /** altura de escala de la capa húmeda, en u (1,5 u ≈ 1,7 km: la inversión de los alisios) */
  alturaEscala: 1.5,
  /** el color del aire = el horizonte del domo (sRGB de pantalla) */
  color: ATMOSFERA_SIERRA.niebla,
};

/**
 * GLSL: fracción de bruma entre la cámara y un punto, para una atmósfera con
 * densidad ρ(y) = d0·exp(−y/H). Forma cerrada del ∫ρ dt sobre el rayo.
 */
export const GLSL_BRUMA_ALTURA = /* glsl */`
float brumaAltura(vec3 pCam, vec3 pMundo, float d0, float H) {
  vec3 dir = pMundo - pCam;
  float dist = length(dir);
  float dy = dir.y;
  float k = abs(dy) > 1e-3
    ? H * (exp(-pCam.y / H) - exp(-pMundo.y / H)) / dy
    : exp(-pCam.y / H);
  return 1.0 - exp(-d0 * dist * max(k, 0.0));
}
`;

/**
 * Fabrica el `onBeforeCompile` que cambia la niebla de three por la bruma por
 * altura en un material estándar (Lambert/Basic con `fog: true`). Se aplica
 * DONDE three aplica la suya (`fog_fragment`, tras el tonemapping y el cambio
 * de espacio de color), mezclando hacia el color sRGB de pantalla: así el
 * terreno, la nieve inyectada, las nubes y el mar se disuelven en el MISMO
 * píxel del horizonte. Crear UNA vez a nivel de módulo (identidad estable).
 */
/** '#rrggbb' → {r,g,b} 0..1 SIN conversión de espacio (para mezclar en espacio de salida). */
export function hexSRGB(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

export function crearInyectorBruma({ densidad, alturaEscala, color } = BRUMA_SIERRA) {
  const c = hexSRGB(color); // sRGB tal cual: la mezcla ocurre tras colorspace_fragment
  const f = (v) => v.toFixed(5);
  return function inyectarBruma(shader) {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBrumaW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBrumaW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vBrumaW;\n${GLSL_BRUMA_ALTURA}`)
      .replace('#include <fog_fragment>', `
{
  float fb = brumaAltura(cameraPosition, vBrumaW, ${f(densidad)}, ${f(alturaEscala)});
  gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(${f(c.r)}, ${f(c.g)}, ${f(c.b)}), fb);
}`);
  };
}

/* ═══════════════════ el cielo como función (radiancia lineal HDR) ═══════════════════ */

/**
 * GLSL: el cielo del costero. Horizonte→cenit por `pow(h, 0.62)` y tres lóbulos
 * de sol (disco, halo, resplandor ancho). Radiancia LINEAL: el ACES va después.
 */
export const GLSL_CIELO = /* glsl */`
vec3 cieloAprox(vec3 R, vec3 dirSol, vec3 colSol, vec3 cenit, vec3 horizonte) {
  float h = clamp(R.y, 0.0, 1.0);
  vec3 c = mix(horizonte, cenit, pow(h, 0.5));   // 0,62 en el costero; aquí el cuadro solo sube 17°
  float s = max(dot(normalize(R), dirSol), 0.0);
  c += colSol * (pow(s, 300.0) * 18.0 + pow(s, 26.0) * 0.9 + pow(s, 4.0) * 0.14);
  return c;
}
`;

/* ── Inversa numérica del ACES filmic de three (tone mapping por defecto de r3f) ──
   Copia de `ACESFilmicToneMapping` de three (r150+): exposición/0,6, matriz de
   entrada, RRT+ODT racional, matriz de salida, saturate. Se invierte por
   iteración de punto fijo multiplicativa (converge en <20 pasos a <0,3 %). */
const ACES_IN = [
  [0.59719, 0.35458, 0.04823],
  [0.07600, 0.90834, 0.01566],
  [0.02840, 0.13383, 0.83777],
];
const ACES_OUT = [
  [1.60475, -0.53108, -0.07367],
  [-0.10208, 1.10813, -0.00605],
  [-0.00327, -0.07276, 1.07602],
];
const mulM = (M, v) => [0, 1, 2].map((i) => M[i][0] * v[0] + M[i][1] * v[1] + M[i][2] * v[2]);
const rrtOdt = (v) => v.map((x) => (x * (x + 0.0245786) - 0.000090537) / (x * (0.983729 * x + 0.4329510) + 0.238081));

/** ACES filmic de three sobre un color lineal `[r,g,b]` (exposición 1). */
export function acesFilmic(lin, exposicion = 1) {
  const v = mulM(ACES_IN, lin.map((x) => (x * exposicion) / 0.6));
  return mulM(ACES_OUT, rrtOdt(v)).map((x) => Math.min(1, Math.max(0, x)));
}

/** Radiancia lineal que, pasada por el ACES, devuelve `objetivoLin` (lineal, 0..1). */
export function inversaACES(objetivoLin, exposicion = 1) {
  let L = objetivoLin.map((x) => Math.max(1e-4, x * 0.8));
  for (let i = 0; i < 24; i++) {
    const out = acesFilmic(L, exposicion);
    L = L.map((x, k) => x * Math.min(4, Math.max(0.25, objetivoLin[k] / Math.max(out[k], 1e-4))));
  }
  return L;
}

/** Color sRGB de PANTALLA → radiancia lineal HDR que lo reproduce tras el ACES. */
export function radianciaParaPantalla(hexSRGB) {
  const c = new THREE.Color(hexSRGB); // convierte a lineal (espacio de trabajo)
  const [r, g, b] = inversaACES([c.r, c.g, c.b]);
  return new THREE.Color(r, g, b);
}

/**
 * La atmósfera de la Sierra en radiancia lineal HDR, lista para el domo y el mar
 * (mismos nombres que el costero: `dirSol, colorSol, cenit, horizonte, ambiente`).
 * El horizonte y el cenit reproducen en pantalla los hex ya afinados de
 * `luzSierra.js`; el sol viaja en HDR (×2,2) como en el costero.
 */
export function atmosferaLinealSierra() {
  return {
    dirSol: new THREE.Vector3(...SOL_SIERRA).normalize(),
    colorSol: new THREE.Color(ATMOSFERA_SIERRA.luz).multiplyScalar(2.2),
    cenit: radianciaParaPantalla(ATMOSFERA_SIERRA.cenit),
    horizonte: radianciaParaPantalla(ATMOSFERA_SIERRA.fondo),
    ambiente: new THREE.Color(ATMOSFERA_SIERRA.cielo).multiplyScalar(0.62),
  };
}

/* ═══════════════════ el domo ═══════════════════ */

const DOMO_VERT = /* glsl */`
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const DOMO_FRAG = /* glsl */`
uniform vec3 uDirSol, uColorSol, uColorCenit, uColorHorizonte;
varying vec3 vDir;
${GLSL_CIELO}
void main() {
  vec3 R = normalize(vDir);
  vec3 c = cieloAprox(R, uDirSol, uColorSol, uColorCenit, uColorHorizonte);
  // bajo el horizonte el domo se apaga hacia el tono del agua honda (costero)
  c = mix(c, uColorHorizonte * 0.55, smoothstep(0.0, -0.18, R.y));
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/**
 * Material del domo (ShaderMaterial, BackSide, sin depthWrite). Un draw call;
 * el fragmento son tres `pow` y un `mix`. Comparte los uniformes de atmósfera
 * con el mar para que reflejo y fondo casen.
 */
export function crearMaterialDomo(atm = atmosferaLinealSierra()) {
  return new THREE.ShaderMaterial({
    name: 'domo-sierra',
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uDirSol: { value: atm.dirSol.clone() },
      uColorSol: { value: atm.colorSol.clone() },
      uColorCenit: { value: atm.cenit.clone() },
      uColorHorizonte: { value: atm.horizonte.clone() },
    },
    vertexShader: DOMO_VERT,
    fragmentShader: DOMO_FRAG,
  });
}
