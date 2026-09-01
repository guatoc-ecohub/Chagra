// ── SwellGLSL.js — el swell GRANDE, compartido GPU↔CPU ──────────────────────
// El FFT de ABYSSAL vive en texturas GPU: no hay forma barata de preguntarle
// "¿qué altura hay bajo el bote?" sin readPixels (prohibido por spec). La
// solución es la misma que ABYSSAL usa para sus tsunamis (Director.eventHeight
// espejando solitonProfile): las 2-3 olas GRANDES son ANALÍTICAS (Gerstner de
// baja frecuencia) y se evalúan con la MISMA fórmula en el vertex shader del
// mar y en WaveSampler.js (CPU). Fase idéntica garantizada: lo que el ojo ve
// levantar el agua es exactamente lo que las sondas del bote sienten. El FFT
// queda para el detalle fino (chop, espuma, brillo) que el bote IGNORA — y ese
// filtrado es además la primera línea del anti-mareo: el bote solo se mece con
// el swell lento, nunca con el picoteo de alta frecuencia.
//
// ── ANTI-MAREO (regla dura del operador): olas de baja frecuencia y amplitud
// moderada. Períodos 6.4 / 4.9 / 3.7 s; pendiente máxima total ~7°, que la
// física además atenúa 50% antes de llegar al casco.

const G = 9.80665;

// Olas canónicas: dirección (rad), longitud de onda (m), amplitud (m).
// Direcciones cercanas entre sí = mar ordenado (swell), no confusión de tormenta.
const OLAS = [
  { dir: 0.44, L: 64, A: 0.42 },
  { dir: 0.96, L: 38, A: 0.22 },
  { dir: -0.09, L: 21, A: 0.10 },
];

// factor de "chop" horizontal (Q·A·k << 1 para que la inversión CPU sea válida)
const Q_CHOP = 0.38;

function empacar(ola) {
  const k = (2 * Math.PI) / ola.L;
  return {
    dirX: Math.cos(ola.dir),
    dirZ: Math.sin(ola.dir),
    k,
    A: ola.A,
    omega: Math.sqrt(G * k), // dispersión de aguas profundas
  };
}

export const SWELL_OLAS = OLAS.map(empacar);

/**
 * Crea el juego de uniforms del swell. Un solo objeto compartido entre el
 * shader del mar y el WaveSampler CPU: escalar uSwellAmp (modo "mar calmo")
 * cambia AMBOS a la vez, sin poder desincronizarse.
 */
export function crearSwellUniforms(THREE) {
  const w = SWELL_OLAS;
  return {
    uSwell0: { value: new THREE.Vector4(w[0].dirX, w[0].dirZ, w[0].k, w[0].A) },
    uSwell1: { value: new THREE.Vector4(w[1].dirX, w[1].dirZ, w[1].k, w[1].A) },
    uSwell2: { value: new THREE.Vector4(w[2].dirX, w[2].dirZ, w[2].k, w[2].A) },
    uSwellOmega: { value: new THREE.Vector3(w[0].omega, w[1].omega, w[2].omega) },
    uSwellQ: { value: Q_CHOP },
    uSwellT: { value: 0 },
    uSwellAmp: { value: 1.0 },
  };
}

// Bloque GLSL: MISMA matemática que WaveSampler.js. Si tocás esto, tocá el otro.
export const SWELL_GLSL = /* glsl */ `
uniform vec4 uSwell0;   // dirX, dirZ, k, A
uniform vec4 uSwell1;
uniform vec4 uSwell2;
uniform vec3 uSwellOmega;
uniform float uSwellQ;
uniform float uSwellT;
uniform float uSwellAmp;

vec3 swellUna(vec4 w, float om, vec2 p) {
  float ph = w.z * dot(w.xy, p) - om * uSwellT;
  float s = sin(ph), c = cos(ph);
  float qa = uSwellQ * w.w;
  return vec3(-w.x * qa * s, w.w * c, -w.y * qa * s);
}

vec3 swellDisplace(vec2 p) {
  vec3 d = swellUna(uSwell0, uSwellOmega.x, p)
         + swellUna(uSwell1, uSwellOmega.y, p)
         + swellUna(uSwell2, uSwellOmega.z, p);
  return d * uSwellAmp;
}

vec2 swellSlopeUna(vec4 w, float om, vec2 p) {
  float ph = w.z * dot(w.xy, p) - om * uSwellT;
  float s = sin(ph);
  return -w.xy * (w.w * w.z * s);
}

// pendiente dY/dx, dY/dz — para la normal del sombreado
vec2 swellSlope(vec2 p) {
  vec2 g = swellSlopeUna(uSwell0, uSwellOmega.x, p)
         + swellSlopeUna(uSwell1, uSwellOmega.y, p)
         + swellSlopeUna(uSwell2, uSwellOmega.z, p);
  return g * uSwellAmp;
}
`;
