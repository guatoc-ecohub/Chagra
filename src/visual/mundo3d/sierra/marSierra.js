/*
 * marSierra — EL MAR CARIBE (y las lagunas de páramo) de la vista global de la
 * Sierra: la superficie de agua del MUNDO COSTERO, traída y hecha ESCALABLE.
 *
 * ORIGEN: `~/demos/mundo-costero/costero/Mar.js` (825 líneas; a su vez robo de
 * Imperios `Agua.js`). Se conserva su arquitectura entera:
 *  · trenes de Gerstner de UNA tabla, mismos números en JS y en GLSL;
 *  · campo del lecho precalculado (DataTexture RGBA8 512²): R profundidad
 *    firmada, G SDF a la orilla (8SSEDT tal cual), B exposición al oleaje,
 *    A ancho de rompiente por pendiente del lecho — leído POR PÍXEL;
 *  · fragment completo: normal Gerstner analítica + capas de rizado, absorción
 *    Beer-Lambert por canal + dispersión, cáusticas worley, espuma de orilla
 *    (por SDF) y de rompiente (por cresta real), GGX + senda del sol + chispeo;
 *  · reflexión por `cieloAprox()` (radiancia lineal HDR; ACES al final), la
 *    MISMA función del domo (`aireSierra.js`): reflejo y fondo casan.
 *
 * LO QUE CAMBIA, y por qué (el problema de ESCALA del encargo):
 *  El costero está en metros para un ojo a 8 m del agua. La Sierra es 1 u =
 *  1 155 m con el ojo a 7,6 km de altura: una ola de 34 m mide 1,8 px. Lo que
 *  SÍ se ve desde esa altura es lo que la superficie hace bien: la banda
 *  turquesa de la plataforma, el hilo blanco de la rompiente siguiendo la
 *  costa, el chispeo del sol sobre el oleaje y la bruma que funde mar y cielo.
 *  Así que:
 *   1. TODO el shader trabaja en «metros equivalentes»: m_eq = u · mpu / escala.
 *      Con `escala = 1` es el costero exacto. Con `escala = 10` (la Sierra) el
 *      mar es el mismo mar VISTO A LA DÉCIMA PARTE: olas de 393 m, rompiente de
 *      60-300 m, banda somera de ~400 m. 🔴 Es UNA exageración cartográfica
 *      declarada (una niña de 11 años tiene que ver la rompiente desde el
 *      avión; tensión verdad ↔ pedagogía, escrita en el informe). No hay
 *      otro número de arte escondido: es ese factor y nada más.
 *   2. Los vértices NO se desplazan (el oleaje es subpíxel): la malla es un
 *      plano barato; el Gerstner vive en el fragment para la NORMAL y la
 *      rompiente. El tiempo avanza a 1/√escala (dispersión: una ola 10× más
 *      larga corre √10× más rápido en m reales, luego √10× MÁS LENTA en m_eq).
 *   3. La bruma de horizonte del costero (mix por distancia en lineal) se
 *      reemplaza por la BRUMA POR ALTURA de `aireSierra.js`, aplicada en el
 *      mismo sitio y con el mismo color sRGB que en el terreno: un solo aire.
 *   4. CALIDAD por tier (el freno real es el fill-rate del Mali-G78):
 *        2 = alto : todo (6 trenes en el fragment, 4 capas de rizado, cáusticas,
 *                   chispeo, espuma de orilla + rompiente) — ~14 lecturas de textura.
 *        1 = medio: 3 trenes, 2 capas, sin cáusticas ni chispeo — ~6 lecturas.
 *        0 = bajo : sin Gerstner en el fragment (normal de UNA capa), sin
 *                   cáusticas/chispeo/rompiente; queda absorción por profundidad,
 *                   fresnel del cielo, la línea de espuma por SDF — 3 lecturas.
 *
 * COSTO (declarado, no certificado): el mar cubre ≈15 % del cuadro en la
 * cámara del establishing shot; es UN draw call (dos con la laguna). En la
 * Quadro no se mide (vsync). En el Pixel 6 Pro se mide con `pixel-fps.py`
 * (ver informe). Sin `document` (jsdom) las texturas caen a 2×2 neutras: nunca
 * tumba la Sierra.
 */
import * as THREE from 'three';
import { GLSL_CIELO, GLSL_BRUMA_ALTURA, hexSRGB } from './aireSierra.js';

/* ═══════════════════════ CONSTANTES CPU⇄GPU (en m_eq) ═══════════════════════ */

export const GRAVEDAD = 9.81;
const FACTOR_VELOCIDAD = 0.66;   // mar costero (Imperios: 0.62, lago)
const AMP_MAR = 1.28;            // ganancia de mar abierto sobre el set base

export const TRENES = Object.freeze([
  { dx:  0.94, dz:  0.34, longitud: 34.0, amplitud: 0.295, q: 1.00 },
  { dx:  0.71, dz: -0.70, longitud: 19.0, amplitud: 0.175, q: 0.90 },
  { dx: -0.42, dz:  0.91, longitud: 11.5, amplitud: 0.112, q: 0.80 },
  { dx:  0.99, dz: -0.14, longitud:  7.2, amplitud: 0.068, q: 0.70 },
  { dx: -0.86, dz: -0.51, longitud:  4.3, amplitud: 0.038, q: 0.50 },
  { dx:  0.30, dz:  0.95, longitud:  2.6, amplitud: 0.022, q: 0.40 },
]);

/** La tabla de olas con k, velocidad y w derivados (dispersión de aguas profundas). */
export function crearOlas(trenes = TRENES, { factorVelocidad = FACTOR_VELOCIDAD, ganancia = AMP_MAR } = {}) {
  return Object.freeze(trenes.map((t) => {
    const inv = 1 / Math.hypot(t.dx, t.dz);
    const k = (Math.PI * 2) / t.longitud;
    const c = Math.sqrt(GRAVEDAD / k) * factorVelocidad;
    return Object.freeze({
      dx: t.dx * inv, dz: t.dz * inv,
      longitud: t.longitud, amplitud: t.amplitud * ganancia, q: t.q,
      k, velocidad: c, w: k * c,
    });
  }));
}
export const OLAS = crearOlas();

const PROF_MIN = -4, PROF_MAX = 12;   // m_eq
const SDF_MIN = -14, SDF_MAX = 26;    // m_eq
const ANCHO_ESPUMA_MAX = 6.0;         // m_eq: playa oceánica tendida
const PROF_ATENUACION = 3.0;
const DENS_DISP = 1.85;
const OCLUSION_LECHO = 0.88;

export function atenuacionOla(profundidad) {
  const t = Math.min(Math.max((profundidad - 0.05) / (PROF_ATENUACION - 0.05), 0), 1);
  return t * t * (3 - 2 * t);
}

/** Desplazamiento vertical de Gerstner (m_eq). Espejo exacto del GLSL. */
export function alturaOlas(x, z, t, atenuacion = 1, olas = OLAS) {
  let y = 0;
  for (let i = 0; i < olas.length; i++) {
    const o = olas[i];
    y += o.amplitud * atenuacion * Math.sin(o.k * (o.dx * x + o.dz * z) + o.w * t);
  }
  return y;
}

/* Perfil "playa" del costero: fondo de arena clara ⇒ caribe. */
export const PERFIL_PLAYA = {
  absorcion: [0.40, 0.16, 0.10], somera: 0x9ce6d8, profunda: 0x2585c0,
  fondoClaro: 0x96865e, fondoOscuro: 0x6d6343, espuma: 0xfbf8ee,
};

/* Perfil "laguna de páramo": agua fría de turba, oscura y quieta — espejo. */
export const PERFIL_PARAMO = {
  absorcion: [0.55, 0.30, 0.20], somera: 0x6fa89c, profunda: 0x16324a,
  fondoClaro: 0x5f5a44, fondoOscuro: 0x2e3226, espuma: 0xeef2f0,
};

/* ═══════════════════════ GLSL ═══════════════════════ */

const num = (v) => {
  const s = Number(v).toPrecision(9);
  return /[.e]/.test(s) ? s : `${s}.0`;
};

function glslGerstner(olas) {
  return /* glsl */`
void olasGerstner(vec2 p, float t, float att, out vec3 desp, out vec3 nor) {
  desp = vec3(0.0);
  vec3 tx = vec3(1.0, 0.0, 0.0);
  vec3 tz = vec3(0.0, 0.0, 1.0);
  float f, s, c, a, ka;
${olas.map((o) => `  f = ${num(o.k)} * dot(vec2(${num(o.dx)}, ${num(o.dz)}), p) + ${num(o.w)} * t;
  s = sin(f); c = cos(f); a = ${num(o.amplitud)} * att; ka = ${num(o.k)} * a;
  desp += vec3(${num(o.q)} * a * ${num(o.dx)} * c, a * s, ${num(o.q)} * a * ${num(o.dz)} * c);
  tx += vec3(-${num(o.q)} * ka * ${num(o.dx * o.dx)} * s, ka * ${num(o.dx)} * c, -${num(o.q)} * ka * ${num(o.dx * o.dz)} * s);
  tz += vec3(-${num(o.q)} * ka * ${num(o.dx * o.dz)} * s, ka * ${num(o.dz)} * c, -${num(o.q)} * ka * ${num(o.dz * o.dz)} * s);`).join('\n')}
  nor = normalize(cross(tz, tx));
}
`;
}

const GLSL_DECOD = /* glsl */`
float atenuacionOla(float prof) { return smoothstep(0.05, ${num(PROF_ATENUACION)}, prof); }
float decodProf(float r) { return r * ${num(PROF_MAX - PROF_MIN)} + ${num(PROF_MIN)}; }
float decodSdf(float g)  { return g * ${num(SDF_MAX - SDF_MIN)} + ${num(SDF_MIN)}; }
float decodAncho(float a) { return a * ${num(ANCHO_ESPUMA_MAX)}; }
`;

const VERTEX = /* glsl */`
varying vec3 vPosMundo;
varying vec2 vBase;
varying float vDist;
void main() {
  vec3 base = (modelMatrix * vec4(position, 1.0)).xyz;
  vBase = base.xz;
  vPosMundo = base;
  vec4 mvPosition = viewMatrix * vec4(base, 1.0);
  vDist = -mvPosition.z;
  gl_Position = projectionMatrix * mvPosition;
}
`;

/**
 * El fragment, generado por CALIDAD (0/1/2). Todo en m_eq (`pm`, `dm`), salvo
 * las lecturas del campo (uv en unidades de mundo).
 */
function fragmentPorCalidad(calidad, olas, trenesFragment = 6) {
  const gerstner = calidad >= 1;
  const olasFrag = olas.slice(0, Math.min(trenesFragment, calidad >= 2 ? 6 : 3));
  const capas = calidad >= 2 ? 4 : calidad === 1 ? 2 : 1;
  const causticas = calidad >= 2;
  const chispa = calidad >= 2;
  const rompiente = calidad >= 1;
  return /* glsl */`
uniform sampler2D uCampo, uOndas, uCausticas;
uniform float uTiempo, uMapaTam, uProfExterior, uMetros, uEscalaOla, uZAguaFuera, uEscalaRizo, uChispa;
uniform vec2 uMapaMin;
uniform vec3 uDirSol, uColorSol, uColorCenit, uColorHorizonte, uAmbiente;
uniform vec3 uAbsorcion, uDispSomera, uDispProfunda, uFondoClaro, uFondoOscuro, uColorEspuma;
uniform float uRugosidad, uCausticaFuerza, uTurbiedad, uFuerzaDetalle, uEspumaFuerza;
uniform float uBrumaD0, uBrumaH, uRugDistancia, uGrano, uSuavizarN, uCabrillas, uDebug, uEscalaRompe;
uniform vec3 uColorBruma;

varying vec3 vPosMundo;
varying vec2 vBase;
varying float vDist;

${gerstner ? glslGerstner(olasFrag) : ''}
${GLSL_DECOD}
${GLSL_CIELO}
${GLSL_BRUMA_ALTURA}

// grano PROCEDURAL del chispeo (sin textura: a esta escala el value-noise
// minificado enseña su celosía por los mipmaps — medido al 300 %)
// (Hoskins) vale para entradas ENTERAS: el hash clásico fract(p·123.34) sobre
// celdas enteras da ~50 valores y sale en FILAS (medido al 300 %, v6-v7)
float hash21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

void main() {
  vec2 uv = (vBase - uMapaMin) / uMapaTam;
  vec2 pm = vBase * uMetros;      // metros equivalentes
  float dm = vDist * uMetros;

  // ── PROFUNDIDAD DEL AGUA, POR PÍXEL ───────────────────────────────────────
  vec4 campoP = texture2D(uCampo, clamp(uv, 0.0, 1.0));
  vec2 fueraP = max(abs(uv - 0.5) - 0.5, 0.0);
  float bordeP = smoothstep(0.0, 0.075, max(fueraP.x, fueraP.y));
  // Fuera del mapa detallado: agua solo al NORTE de uZAguaFuera (el Caribe sigue
  // al este y al oeste del macizo; al sur hay tierra, no un mar que lo rodee).
  float profExt = vBase.y < uZAguaFuera ? uProfExterior : -2.0;
  float profP = mix(decodProf(campoP.r), profExt, bordeP);
  if (profP < -0.9) discard;
  float att = atenuacionOla(profP) * uEscalaOla;
  float calma = smoothstep(0.20, 2.4, profP);

  // ── NORMAL: Gerstner analítico + capas de rizado ──────────────────────────
  vec3 desp = vec3(0.0);
  vec3 N = vec3(0.0, 1.0, 0.0);
  ${gerstner ? 'olasGerstner(pm, uTiempo, att, desp, N);' : ''}
  // A escala de avión los trenes de Gerstner (3-38 px, pendientes hasta 23°)
  // alternaban reflejo de cielo y agua honda facet a facet: una CELOSÍA en el
  // fresnel (medido al 300 %). Un mar real tiene espectro continuo; la
  // distribución de pendientes la modela la rugosidad GGX. uSuavizarN = 0 →
  // costero exacto. desp (la rompiente) no se toca.
  N = normalize(mix(N, vec3(0.0, 1.0, 0.0), uSuavizarN));

  float fadeMedio  = 1.0 - smoothstep(240.0, 760.0, dm);
  float fadeFino   = 1.0 - smoothstep(45.0, 200.0, dm);
  float fadeChispa = 1.0 - smoothstep(80.0, 420.0, dm);
  vec2 pr = pm * uEscalaRizo;   // el grano del rizado, en píxeles de ESTA cámara
  vec4 o1 = texture2D(uOndas, pr * 0.062 + vec2( 0.019,  0.012) * uTiempo);
  ${capas >= 2 ? 'vec4 o2 = texture2D(uOndas, pr * 0.145 + vec2(-0.016,  0.025) * uTiempo);' : 'vec4 o2 = vec4(0.5, 0.5, 0.5, 0.5);'}
  ${capas >= 3 ? 'vec4 o3 = texture2D(uOndas, pr * 0.330 + vec2( 0.043, -0.034) * uTiempo);' : 'vec4 o3 = vec4(0.5, 0.5, 0.5, 0.5);'}
  ${capas >= 4 ? 'vec4 o4 = texture2D(uOndas, pr * 0.620 + vec2(-0.071,  0.058) * uTiempo);' : 'vec4 o4 = vec4(0.5, 0.5, 0.5, 0.5);'}
  vec4 oL = texture2D(uOndas, pr * 0.011 + vec2( 0.0022, 0.0016) * uTiempo);
  float racha = mix(0.55, 1.55, oL.a);

  vec2 rizo = ((o1.rg - 0.5)
             + (o2.rg - 0.5) * 0.95 * fadeMedio
             + (o3.rg - 0.5) * 0.70 * fadeFino) * 2.0;
  N = normalize(N + vec3(rizo.x, 0.0, rizo.y) * uFuerzaDetalle * racha
                    * mix(0.40, 1.0, att) * mix(0.15, 1.0, calma));

  vec3 V = normalize(cameraPosition - vPosMundo);
  vec3 L = uDirSol;
  float solSobreHorizonte = smoothstep(-0.06, 0.10, L.y);

  // ── FRESNEL ensanchado por microfacetas ───────────────────────────────────
  float ndv = max(dot(N, V), 0.0);
  float fresnelLiso  = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);
  float fresnelAncho = 0.09 + 0.91 * pow(1.0 - ndv, 2.4);
  float fresnel = clamp(mix(fresnelLiso, fresnelAncho, 0.55), 0.03, 0.90);
  fresnel *= mix(0.55, 1.0, calma);

  // ── reflexión: cielo procedural (el mismo del domo) ──────────────────────
  vec3 R = reflect(-V, N);
  vec3 reflejo = cieloAprox(R, uDirSol, uColorSol, uColorCenit, uColorHorizonte);

  // ── REFRACCIÓN: la vista del lecho se desvía con la normal ────────────────
  float profVista = max(profP, 0.0);
  vec2 uvRef = uv + N.xz * (1.25 * min(profVista, 4.0) / (uMapaTam * uMetros));
  vec4 campoR = texture2D(uCampo, clamp(uvRef, 0.0, 1.0));
  vec2 fuera = max(abs(uvRef - 0.5) - 0.5, 0.0);
  float borde = smoothstep(0.0, 0.075, max(fuera.x, fuera.y));
  float profR = max(mix(decodProf(campoR.r), profExt, borde), 0.0);
  float sdfR = mix(decodSdf(campoR.g), ${num(SDF_MAX)}, borde);
  float anchoRompiente = mix(decodAncho(campoR.a), 1.6, borde);
  float fetchCuerpo = mix(campoR.b, 1.0, borde);

  float sed = o1.b;
  float mezclaLecho = clamp((0.25 + sed * 0.60) * 0.55
                          + smoothstep(0.6, 6.0, profR) * 0.45, 0.0, 1.0);
  vec3 fondo = mix(uFondoClaro, uFondoOscuro, mezclaLecho);

  ${causticas ? `
  vec2 pf = pr + N.xz * min(profVista, 5.0);
  float c1 = texture2D(uCausticas, pf * 0.085 + vec2( 0.013, 0.009) * uTiempo).r;
  float c2 = texture2D(uCausticas, pf * 0.131 + vec2(-0.008, 0.015) * uTiempo).g;
  float caustica = c1 * c2 * exp(-profR * 0.28) * solSobreHorizonte * uCausticaFuerza;
  fondo *= 1.0 + min(caustica * 3.0, 0.95);` : ''}
  vec3 luzFondo = min(uAmbiente * 0.55 + uColorSol * 0.55 * solSobreHorizonte, vec3(1.05));
  fondo *= luzFondo;

  // ── GRADIENTE DE PROFUNDIDAD: absorción por canal + dispersión escalar ────
  float tHondo = 1.0 - exp(-profR * 0.62);
  vec3 disp = mix(uDispSomera, uDispProfunda, tHondo);
  vec3 T = exp(-uAbsorcion * uTurbiedad * (profR * 2.1 + 0.30));
  float sat = 1.0 - exp(-profR * ${num(DENS_DISP)} * uTurbiedad);
  vec3 luzAgua = uAmbiente * 0.55 + uColorSol * 0.40 * solSobreHorizonte;
  float velaLecho = 1.0 - sat * ${num(OCLUSION_LECHO)};
  vec3 refraccion = fondo * T * velaLecho + disp * sat * luzAgua;

  // ── ESPUMA: swash de orilla (por SDF) + rompiente (por cresta real) ───────
  float energiaOla = mix(0.62, 1.15, att) * mix(0.78, 1.22, oL.a);
  float energia = energiaOla * mix(0.30, 1.0, fetchCuerpo);
  float fase = uTiempo * 0.95 - dot(vec2(${num(OLAS[0].dx)}, ${num(OLAS[0].dz)}), pm) * 0.085;
  float lamido = sin(fase + oL.b * 6.2831853) * 0.5 + 0.5;
  float alcance = anchoRompiente * mix(0.30, 1.10, lamido) * energia;
  float jitter = ((o2.b - 0.5) * 0.65 + (o3.b - 0.5) * 0.35) * anchoRompiente * 1.10;
  float d = sdfR - alcance - jitter;

  float espOrilla = 1.0 - smoothstep(-anchoRompiente * 0.12, anchoRompiente * 0.50, d);
  espOrilla *= mix(0.55, 1.0, o2.b);
  ${causticas ? `
  float encaje = texture2D(uCausticas, pr * 0.105 + N.xz * 0.03).b;
  espOrilla *= mix(0.62, 1.0, smoothstep(0.12, 0.62, encaje));` : ''}
  float retiro = anchoRompiente * mix(0.15, 0.85, 1.0 - lamido) * energia;
  espOrilla = max(espOrilla, (1.0 - smoothstep(0.0, 0.9, abs(sdfR - retiro))) * 0.72 * o3.b);
  espOrilla = max(espOrilla, (1.0 - smoothstep(0.0, 0.7, sdfR)) * mix(0.62, 0.9, o2.b));
  espOrilla *= 1.0 - smoothstep(anchoRompiente * 1.3, anchoRompiente * 3.0, sdfR);
  espOrilla *= smoothstep(-0.05, 0.18, profP);

  float rompe = 0.0;
  ${rompiente ? `
  float crestaRel = desp.y / max(att * 0.62, 0.20);
  rompe = smoothstep(0.50, 0.86, crestaRel);
  // La VENTANA DE ROTURA (0,35-6,5 m_eq de fondo: la ola rompe donde el fondo es
  // ~1,3× su altura) NO se exagera con la escala: con ×10 eran 4-75 m REALES —
  // un «surf» de 1,5 km y cada cresta Gerstner pintada de espuma: la celosía
  // blanca de 13 px medida al 300 % (v1-v9). uEscalaRompe = 1 → costero exacto.
  // (1 - smoothstep(a, b)) y no smoothstep(b, a): con edge0 > edge1 es indefinido.
  rompe *= (1.0 - smoothstep(2.4 * uEscalaRompe, 6.5 * uEscalaRompe, profP)) * smoothstep(0.35 * uEscalaRompe, 1.15 * uEscalaRompe, profP);
  rompe *= mix(0.45, 1.0, o3.b) * mix(0.7, 1.0, racha);` : ''}

  float espuma = max(espOrilla, rompe * 0.92);
  espuma *= uEspumaFuerza * mix(0.06, 1.0, fetchCuerpo) * clamp(energiaOla, 0.30, 1.15);
  espuma = clamp(espuma, 0.0, 1.0);

  // ── ESPECULAR: GGX + senda del sol (+ chispeo granulado) ──────────────────
  vec3 H = normalize(L + V);
  float rug = clamp(uRugosidad * mix(0.85, 1.35, racha) + dm * uRugDistancia, 0.03, 0.32);
  float a2 = rug * rug * rug * rug;
  float ndh = max(dot(N, H), 0.0);
  float den = ndh * ndh * (a2 - 1.0) + 1.0;
  float ggx = a2 / (3.14159265 * den * den + 1e-5);
  float brillo = min(ggx * fresnel, 90.0);
  if (uGrano > 0.0) {
    // celdas de ~2 px que titilan: el brillo del sol se rompe en chispas DONDE la
    // física lo pone (el lóbulo GGX), no en toda la lámina
    float grano = hash21(floor(pr * uGrano) + vec2(floor(uTiempo * 5.0) * 0.37));
    brillo *= mix(0.45, 1.9, smoothstep(0.25, 0.95, grano));
  }
  float rl = max(dot(R, L), 0.0);
  float senda = pow(rl, 26.0) * 0.26 + pow(rl, 3.0) * 0.022;
  senda *= mix(1.0, 1.45, 1.0 - smoothstep(0.28, 0.78, L.y));

  float chispa = 0.0;
  ${chispa ? `
  vec2 capilar = ((o4.rg - 0.5) * 1.35 + (o3.rg - 0.5) * 0.55) * 2.0;
  vec3 Nch = normalize(N + vec3(capilar.x, 0.0, capilar.y)
                           * uFuerzaDetalle * 1.20 * fadeChispa * racha * mix(0.30, 1.0, calma));
  float expChispa = mix(150.0, 34.0, smoothstep(25.0, 300.0, dm));
  float ndhC = max(dot(Nch, H), 0.0);
  float mascaraChispa = smoothstep(0.42, 0.86, o4.b * (0.55 + 0.85 * o3.a));
  chispa = pow(ndhC, expChispa) * mascaraChispa * mix(0.65, 1.45, racha) * fadeChispa;
  chispa *= mix(0.35, 1.0, clamp(fresnel * 4.0, 0.0, 1.0));
  chispa *= mix(0.40, 1.0, fetchCuerpo);
  chispa *= mix(0.10, 1.0, calma);` : ''}
  float brilloOrilla = mix(0.22, 1.0, calma);

  vec3 especular = uColorSol * ((brillo * 0.34 + senda) * brilloOrilla + chispa * 2.2 * uChispa) * solSobreHorizonte;

  vec3 color = mix(refraccion, reflejo, fresnel);
  color += especular;
  float cresta = smoothstep(0.12, 0.46, desp.y) * att;
  float contraluz = pow(max(-dot(V, L) * 0.5 + 0.5, 0.0), 3.0);
  color += uDispSomera * uColorSol * (cresta * contraluz * 0.40 * solSobreHorizonte);
  vec3 luzEspuma = uAmbiente * 0.75 + uColorSol * 0.42 * solSobreHorizonte;
  luzEspuma = min(luzEspuma, vec3(1.12));
  color = mix(color, uColorEspuma * luzEspuma, espuma);
  if (uCabrillas > 0.0) {
    // CABRILLAS: con alisios de 15-25 nudos el mar abierto rompe en borregos de
    // espuma dispersos (cobertura uCabrillas, ~2-3 %), que desde el avión son
    // motas blancas de segundos. Más en mar abierto (fetch), casi ninguna al abrigo.
    float cel = hash21(floor(pr * uGrano * 0.55) + floor(uTiempo * 1.3) * vec2(0.37, 0.71));
    float cabrilla = smoothstep(1.0 - uCabrillas, 1.0 - uCabrillas * 0.45, cel * mix(0.75, 1.0, oL.a))
                   * fetchCuerpo * smoothstep(1.5, 4.0, profP);
    color = mix(color, uColorEspuma * luzEspuma, cabrilla * 0.8);
  }

  // ── ALFA por profundidad, per-píxel, con orilla que respira ───────────────
  float rizoOrilla = ((o3.b - 0.5) * 0.055 + (o2.b - 0.5) * 0.035) * fadeFino;
  float alfa = smoothstep(0.025, 2.30, profP + rizoOrilla);
  float lumBrillo = dot(especular, vec3(0.2126, 0.7152, 0.0722));
  alfa = max(alfa, clamp(lumBrillo * 0.85, 0.0, 1.0));
  alfa = clamp(max(alfa, max(fresnel * 0.85, espuma * 0.96)), 0.0, 1.0);
  alfa *= smoothstep(-0.75, -0.08, profP);
  if (alfa < 0.006) discard;

  gl_FragColor = vec4(color, alfa);
  // DEPURACIÓN del gate (?marDebug=1|2): términos a canales, sin tonemapping
  if (uDebug > 0.5 && uDebug < 1.5) { gl_FragColor = vec4(espuma, clamp(cresta * contraluz * 4.0, 0.0, 1.0), clamp(brillo, 0.0, 1.0), 1.0); return; }
  if (uDebug > 1.5 && uDebug < 2.5) { gl_FragColor = vec4(fresnel, clamp(length(reflejo) * 0.5, 0.0, 1.0), clamp(length(refraccion) * 0.5, 0.0, 1.0), 1.0); return; }
  if (uDebug > 2.5 && uDebug < 3.5) { gl_FragColor = vec4(clamp(profP / 12.0, 0.0, 1.0), clamp(sdfR / 26.0, 0.0, 1.0), clamp(anchoRompiente / 6.0, 0.0, 1.0), 1.0); return; }
  if (uDebug > 3.5) { gl_FragColor = vec4(espOrilla, rompe, lamido, 1.0); return; }

  #include <tonemapping_fragment>
  #include <colorspace_fragment>

  // ── BRUMA POR ALTURA (aireSierra): en espacio de salida, como el terreno ──
  float fb = brumaAltura(cameraPosition, vPosMundo, uBrumaD0, uBrumaH);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uColorBruma, fb);
}
`;
}

/* ═══════════════ ruidos tileables (canvas 2D, cero assets) ═══════════════ */

function ruidoValorTileable(perm, x, y, periodo) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const w = (i) => ((i % periodo) + periodo) % periodo;
  const h = (a, b) => perm[(perm[w(a) & 255] + w(b)) & 255] / 255;
  const x0 = w(xi), x1 = w(xi + 1), y0 = w(yi), y1 = w(yi + 1);
  const a = h(x0, y0), b = h(x1, y0), c = h(x0, y1), d = h(x1, y1);
  return (a + (b - a) * u) + ((c + (d - c) * u) - (a + (b - a) * u)) * v;
}

function fbmTileable(perm, x, y, periodo, octavas) {
  let suma = 0, norma = 0, amp = 1, esc = 1;
  for (let o = 0; o < octavas; o++) {
    suma += amp * ruidoValorTileable(perm, x * esc, y * esc, periodo * esc);
    norma += amp;
    amp *= 0.5; esc *= 2;
  }
  return suma / norma;
}

function worleyTileable(perm, x, y, celdas) {
  const cx = Math.floor(x), cy = Math.floor(y);
  let f1 = 4;
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const gx = cx + ox, gy = cy + oy;
      const wx = ((gx % celdas) + celdas) % celdas;
      const wy = ((gy % celdas) + celdas) % celdas;
      const h1 = perm[(perm[wx & 255] + wy) & 255] / 255;
      const h2 = perm[(perm[(wx + 71) & 255] + wy + 29) & 255] / 255;
      const px = gx + 0.15 + h1 * 0.7, py = gy + 0.15 + h2 * 0.7;
      const dx = px - x, dy = py - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < f1) f1 = d;
    }
  }
  return Math.min(f1, 1);
}

/* ══════════════ transformada de distancia 8SSEDT (robada tal cual) ══════════════ */

function distanciaA(mascara, ancho, alto) {
  const n = ancho * alto;
  const INF = 1e9;
  const dx = new Int32Array(n), dy = new Int32Array(n), d2 = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    if (mascara[i]) { d2[i] = 0; dx[i] = 0; dy[i] = 0; }
    else { d2[i] = INF; dx[i] = 9999; dy[i] = 9999; }
  }
  const comparar = (i, j, ox, oy) => {
    if (d2[j] >= INF) return;
    const cx = dx[j] + ox, cy = dy[j] + oy;
    const c = cx * cx + cy * cy;
    if (c < d2[i]) { d2[i] = c; dx[i] = cx; dy[i] = cy; }
  };
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const i = y * ancho + x;
      if (x > 0) comparar(i, i - 1, 1, 0);
      if (y > 0) comparar(i, i - ancho, 0, 1);
      if (x > 0 && y > 0) comparar(i, i - ancho - 1, 1, 1);
      if (x < ancho - 1 && y > 0) comparar(i, i - ancho + 1, -1, 1);
    }
    for (let x = ancho - 2; x >= 0; x--) comparar(y * ancho + x, y * ancho + x + 1, -1, 0);
  }
  for (let y = alto - 1; y >= 0; y--) {
    for (let x = ancho - 1; x >= 0; x--) {
      const i = y * ancho + x;
      if (x < ancho - 1) comparar(i, i + 1, -1, 0);
      if (y < alto - 1) comparar(i, i + ancho, 0, -1);
      if (x < ancho - 1 && y < alto - 1) comparar(i, i + ancho + 1, -1, -1);
      if (x > 0 && y < alto - 1) comparar(i, i + ancho - 1, 1, -1);
    }
    for (let x = 1; x < ancho; x++) comparar(y * ancho + x, y * ancho + x - 1, 1, 0);
  }
  const salida = new Float32Array(n);
  for (let i = 0; i < n; i++) salida[i] = Math.sqrt(d2[i] >= INF ? 1e6 : d2[i]);
  return salida;
}

/* PRNG chico y determinista para la permutación (sin Math.random). */
function permutacion(semilla) {
  let s = (semilla >>> 0) || 1;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  return p;
}

const hayCanvas = () => typeof document !== 'undefined' && typeof document.createElement === 'function';

/* ═══════════════════════════════ SISTEMA ═══════════════════════════════ */

export class MarSierra {
  /**
   * @param {object} o
   * @param {(x:number,z:number)=>number} o.alturaFn  altura del terreno (u de mundo)
   * @param {(x:number,z:number)=>number} [o.fetchFn] exposición 0..1 (1 = mar abierto)
   * @param {number} [o.tam=22]      lado del mapa detallado (u)
   * @param {number} [o.nivel=0]     nivel del agua (u)
   * @param {number} [o.margen=20]   agua de relleno hasta el horizonte (u)
   * @param {{x:number,z:number}} [o.centro] centro del mapa en mundo
   * @param {number} [o.seg=48]      segmentos de la malla (plano: no hay desplazamiento)
   * @param {number} [o.profExterior=12] profundidad fuera del mapa (m_eq)
   * @param {number} [o.escalaOla=1] 1 = mar; ~0.06 = laguna espejo
   * @param {number} [o.zAguaFuera=Infinity] fuera del mapa hay agua solo si z < esto (u)
   * @param {number} [o.escalaRizo=1] multiplica las coordenadas del rizado (grano en px de la cámara)
   * @param {number} [o.chispa=1]     ganancia del chispeo granulado
   * @param {number} [o.rugDistancia=0.0004] cuánto se ensancha el brillo del sol con la distancia (costero: 0.0004)
   * @param {number} [o.grano=0]      grano procedural del chispeo (celdas por m_eq de rizado); 0 = como el costero
   * @param {number} [o.suavizarN=0]  cuánto se suaviza la normal Gerstner (1 = solo la estadística GGX; escala de avión)
   * @param {number} [o.cabrillas=0]  cobertura de borregos de espuma en mar abierto (alisios); 0 = ninguno
   * @param {number} [o.debug=0]      solo el gate (?marDebug=): 1 espuma/cresta/brillo · 2 fresnel/reflejo/refracción · 3 prof/sdf/ancho · 4 orilla/rompe/lamido
   * @param {number} [o.escalaRompe=1] escala de la ventana de rotura (m_eq); con `escala` 10, 0,12 deja la rompiente en la orilla
   * @param {number} [o.trenesFragment=6] cuántos trenes entran a la normal del fragment (de avión, 2: mar de fondo, no celosía)
   * @param {number} [o.mpu=1155]    metros reales por unidad de mundo
   * @param {number} [o.escala=10]   exageración cartográfica declarada (1 = costero exacto)
   * @param {0|1|2} [o.calidad=2]    por tier: 2 alto · 1 medio · 0 bajo
   * @param {object} [o.perfil]      PERFIL_PLAYA | PERFIL_PARAMO
   * @param {object} [o.escalares]   { rugosidad, causticas, turbiedad, detalle, espuma }
   * @param {object} o.atmosfera     { dirSol, colorSol, cenit, horizonte, ambiente } (HDR lineal)
   * @param {{densidad:number, alturaEscala:number, color:string}} [o.bruma]  aireSierra.BRUMA_SIERRA; densidad 0 = sin bruma
   * @param {number} [o.semilla=20260905]
   * @param {number} [o.resCampo=512]
   */
  constructor(o) {
    this.tiempo = 0;
    this.tam = o.tam ?? 22;
    this.nivel = o.nivel ?? 0;
    this.margen = o.margen ?? 20;
    this.centro = o.centro ?? { x: 0, z: 0 };
    this.seg = o.seg ?? 48;
    this.profExterior = o.profExterior ?? 12;
    this.escalaOla = o.escalaOla ?? 1;
    this.mpu = o.mpu ?? 1155;
    this.escala = o.escala ?? 10;
    this.metros = this.mpu / this.escala;           // m_eq por unidad de mundo
    this.factorTiempo = 1 / Math.sqrt(this.escala); // dispersión (ver cabecera)
    this.calidad = o.calidad ?? 2;
    this.perfil = o.perfil ?? PERFIL_PLAYA;
    this.escalares = o.escalares ?? {};
    this.alturaFn = o.alturaFn;
    this.fetchFn = o.fetchFn ?? (() => 1);
    this.bruma = o.bruma ?? { densidad: 0, alturaEscala: 1, color: '#000000' };
    this.zAguaFuera = o.zAguaFuera ?? Infinity;   // fuera del mapa: agua si z < esto
    this.escalaRizo = o.escalaRizo ?? 1;
    this.chispa = o.chispa ?? 1;
    this.rugDistancia = o.rugDistancia ?? 0.0004;   // crecimiento de la rugosidad con la distancia (1/m_eq)
    this.grano = o.grano ?? 0;                      // celdas del grano procedural por m_eq de rizado (0 = sin grano)
    this.suavizarN = o.suavizarN ?? 0;              // 0 = normal Gerstner (costero); →1 estadística (GGX) a escala de avión
    this.cabrillas = o.cabrillas ?? 0;              // cobertura de borregos de espuma (0 = ninguno)
    this.debug = o.debug ?? 0;                      // solo el gate: términos a canales (1..4)
    this.escalaRompe = o.escalaRompe ?? 1;          // ventana de rotura en m_eq (1 = costero; ~1/escala si hay exageración)
    this.trenesFragment = o.trenesFragment ?? 6;    // trenes Gerstner en el fragment (de avión: 1-2 = líneas de mar de fondo, no celosía)
    this.resCampo = o.resCampo ?? 512;
    this.perm = permutacion(o.semilla ?? 20260905);

    this._construirCampo();
    this.texOndas = this._texturaOndas(256);
    this.texCausticas = this._texturaCausticas(256);
    this._construirMalla(o.atmosfera);
  }

  /* ---- campo del lecho: R prof firmada · G SDF orilla · B exposición · A rompiente ---- */
  _construirCampo() {
    const res = this.resCampo;
    const tam = this.tam, nivel = this.nivel, M = this.metros;
    this.metrosPorTexel = tam / res;               // en u
    const mpt = this.metrosPorTexel;

    const x0 = this.centro.x - tam / 2, z0 = this.centro.z - tam / 2;
    const alt = new Float32Array(res * res);
    for (let j = 0; j < res; j++) {
      const z = z0 + (j + 0.5) * mpt;
      for (let i = 0; i < res; i++) {
        const x = x0 + (i + 0.5) * mpt;
        const h = this.alturaFn(x, z);
        alt[j * res + i] = Number.isFinite(h) ? h : nivel - 6 / M;
      }
    }

    const esAgua = new Uint8Array(res * res);
    const esTierra = new Uint8Array(res * res);
    for (let i = 0; i < res * res; i++) {
      if (alt[i] < nivel) esAgua[i] = 1; else esTierra[i] = 1;
    }
    const dTierra = distanciaA(esTierra, res, res);
    const dAgua = distanciaA(esAgua, res, res);

    const datos = new Uint8Array(res * res * 4);
    const prof = new Float32Array(res * res);
    const sdf = new Float32Array(res * res);
    const ancho = new Float32Array(res * res);
    const invProf = 255 / (PROF_MAX - PROF_MIN);
    const invSdf = 255 / (SDF_MAX - SDF_MIN);
    const PROF_ROMPIENTE = 0.35;

    for (let j = 0; j < res; j++) {
      const z = z0 + (j + 0.5) * mpt;
      for (let i = 0; i < res; i++) {
        const k = j * res + i;
        const x = x0 + (i + 0.5) * mpt;
        const p = (nivel - alt[k]) * M;                                     // m_eq
        const s = (esAgua[k] ? (dTierra[k] - 0.5) : -(dAgua[k] - 0.5)) * mpt * M; // m_eq
        prof[k] = p;
        sdf[k] = s;

        // Pendiente del lecho (adimensional) por diferencias centrales de ±2 texeles.
        const ix0 = Math.max(0, i - 2), ix1 = Math.min(res - 1, i + 2);
        const jy0 = Math.max(0, j - 2), jy1 = Math.min(res - 1, j + 2);
        const gx = (alt[j * res + ix1] - alt[j * res + ix0]) / ((ix1 - ix0) * mpt);
        const gz = (alt[jy1 * res + i] - alt[jy0 * res + i]) / ((jy1 - jy0) * mpt);
        const pendiente = Math.hypot(gx, gz);
        ancho[k] = Math.min(
          ANCHO_ESPUMA_MAX,
          Math.max(0.8, PROF_ROMPIENTE / Math.max(pendiente, 0.02)),
        );

        const tf = Math.min(1, Math.max(0, this.fetchFn(x, z)));

        const o4 = k * 4;
        datos[o4]     = Math.max(0, Math.min(255, Math.round((p - PROF_MIN) * invProf)));
        datos[o4 + 1] = Math.max(0, Math.min(255, Math.round((s - SDF_MIN) * invSdf)));
        datos[o4 + 2] = Math.round(tf * tf * (3 - 2 * tf) * 255);
      }
    }

    // El ancho de rompiente se suaviza a lo largo de la costa (2 pasadas 3×3).
    const tmp = new Float32Array(res * res);
    for (let pase = 0; pase < 2; pase++) {
      const src = pase === 0 ? ancho : tmp;
      const dst = pase === 0 ? tmp : ancho;
      for (let j = 0; j < res; j++) {
        const j0 = Math.max(0, j - 1) * res, j1 = j * res, j2 = Math.min(res - 1, j + 1) * res;
        for (let i = 0; i < res; i++) {
          const i0 = Math.max(0, i - 1), i2 = Math.min(res - 1, i + 1);
          dst[j1 + i] = (
            src[j0 + i0] + src[j0 + i] + src[j0 + i2] +
            src[j1 + i0] + src[j1 + i] + src[j1 + i2] +
            src[j2 + i0] + src[j2 + i] + src[j2 + i2]
          ) / 9;
        }
      }
    }
    for (let k = 0; k < res * res; k++) {
      datos[k * 4 + 3] = Math.round(Math.min(1, ancho[k] / ANCHO_ESPUMA_MAX) * 255);
    }

    this.profundidades = prof;
    this.sdfCosta = sdf;

    const tex = new THREE.DataTexture(datos, res, res, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.colorSpace = THREE.NoColorSpace;
    tex.needsUpdate = true;
    this.texCampo = tex;
  }

  /* textura neutra 2×2 para entornos sin canvas (jsdom): normal arriba, ruidos a 0,5 */
  _texturaNeutra() {
    const d = new Uint8Array(16);
    for (let i = 0; i < 4; i++) { d[i * 4] = 128; d[i * 4 + 1] = 128; d[i * 4 + 2] = 128; d[i * 4 + 3] = 128; }
    const tex = new THREE.DataTexture(d, 2, 2, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.NoColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  /* ---- RG = normal del rizado, B = ruido de espuma, A = ruido lento ---- */
  _texturaOndas(res) {
    if (!hayCanvas()) return this._texturaNeutra();
    const perm = this.perm;
    const alturas = new Float32Array(res * res);
    for (let j = 0; j < res; j++) {
      for (let i = 0; i < res; i++) {
        alturas[j * res + i] = fbmTileable(perm, (i / res) * 8, (j / res) * 8, 8, 4);
      }
    }
    const lienzo = document.createElement('canvas');
    lienzo.width = lienzo.height = res;
    const g2d = lienzo.getContext('2d');
    if (!g2d || typeof g2d.createImageData !== 'function') return this._texturaNeutra();
    const img = g2d.createImageData(res, res);
    const d = img.data;
    const esc = 3.2;
    for (let j = 0; j < res; j++) {
      for (let i = 0; i < res; i++) {
        const k = j * res + i;
        const izq = alturas[j * res + ((i - 1 + res) % res)];
        const der = alturas[j * res + ((i + 1) % res)];
        const arr = alturas[((j - 1 + res) % res) * res + i];
        const aba = alturas[((j + 1) % res) * res + i];
        let nx = (izq - der) * esc, nz = (arr - aba) * esc;
        const inv = 1 / Math.hypot(nx, nz, 1);
        nx *= inv; nz *= inv;
        const lento = fbmTileable(perm, (i / res) * 3 + 11, (j / res) * 3 + 7, 3, 3);
        const o = k * 4;
        d[o] = Math.round((nx * 0.5 + 0.5) * 255);
        d[o + 1] = Math.round((nz * 0.5 + 0.5) * 255);
        d[o + 2] = Math.round(Math.min(1, Math.max(0, alturas[k])) * 255);
        d[o + 3] = Math.round(Math.min(1, Math.max(0, lento)) * 255);
      }
    }
    g2d.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(lienzo);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.NoColorSpace;
    tex.anisotropy = 4;
    tex.generateMipmaps = true;
    return tex;
  }

  /** Worley invertido y afilado en dos escalas (R y G) para cruzarlas en el shader. */
  _texturaCausticas(res) {
    if (!hayCanvas() || this.calidad < 2) return this._texturaNeutra();
    const perm = this.perm;
    const lienzo = document.createElement('canvas');
    lienzo.width = lienzo.height = res;
    const g2d = lienzo.getContext('2d');
    if (!g2d || typeof g2d.createImageData !== 'function') return this._texturaNeutra();
    const img = g2d.createImageData(res, res);
    const d = img.data;
    const capa = (i, j, celdas, sesgo) => {
      const f1 = worleyTileable(perm, (i / res) * celdas + sesgo, (j / res) * celdas + sesgo, celdas);
      const v = 1 - Math.min(1, f1 / 0.7);
      return Math.pow(v, 2.6);
    };
    for (let j = 0; j < res; j++) {
      for (let i = 0; i < res; i++) {
        const o = (j * res + i) * 4;
        d[o] = Math.round(capa(i, j, 6, 0) * 255);
        d[o + 1] = Math.round(capa(i, j, 9, 3) * 255);
        d[o + 2] = Math.round(capa(i, j, 14, 7) * 255);
        d[o + 3] = 255;
      }
    }
    g2d.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(lienzo);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.NoColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  /* ---- reparto de vértices: densos sobre el mapa, estirados mar afuera ---- */
  _densificarHaciaElMapa(geo, lado) {
    const medio = lado * 0.5;
    const c = Math.min(0.94, (this.tam * 0.5) / medio);
    const b = Math.min(0.94, c + (1 - c) * 0.36);
    if (b <= c + 1e-4) return;
    const alfa = (c * (1 - b)) / (b * (1 - c));
    const remap = (v) => {
      const n = v / medio;
      const a = Math.abs(n);
      if (a <= b) return (c / b) * n * medio;
      const t = (a - b) / (1 - b);
      const f = c + (1 - c) * (alfa * t + (1 - alfa) * t * t);
      return Math.sign(n) * f * medio;
    };
    const pos = geo.attributes.position;
    const arr = pos.array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] = remap(arr[i]);
      arr[i + 2] = remap(arr[i + 2]);
    }
    pos.needsUpdate = true;
  }

  _construirMalla(atm) {
    const lado = this.tam + this.margen * 2;
    const seg = this.seg;
    const geo = new THREE.PlaneGeometry(lado, lado, seg, seg);
    geo.rotateX(-Math.PI / 2);
    geo.deleteAttribute('uv');
    geo.deleteAttribute('normal');
    this._densificarHaciaElMapa(geo, lado);
    geo.computeBoundingSphere();

    const perfil = this.perfil;
    const esc = this.escalares;
    const bruma = hexSRGB(this.bruma.color); // sRGB crudo: se mezcla en espacio de salida
    const uniformes = {
      uCampo: { value: this.texCampo },
      uOndas: { value: this.texOndas },
      uCausticas: { value: this.texCausticas },
      uTiempo: { value: 0 },
      uMapaTam: { value: this.tam },
      uMapaMin: { value: new THREE.Vector2(this.centro.x - this.tam / 2, this.centro.z - this.tam / 2) },
      uProfExterior: { value: this.profExterior },
      uMetros: { value: this.metros },
      uEscalaOla: { value: this.escalaOla },
      uZAguaFuera: { value: Number.isFinite(this.zAguaFuera) ? this.zAguaFuera : 1e9 },
      uEscalaRizo: { value: this.escalaRizo },
      uChispa: { value: this.chispa },
      uRugDistancia: { value: this.rugDistancia },
      uGrano: { value: this.grano },
      uSuavizarN: { value: this.suavizarN },
      uCabrillas: { value: this.cabrillas },
      uDebug: { value: this.debug },
      uEscalaRompe: { value: this.escalaRompe },
      uDirSol: { value: atm.dirSol.clone() },
      uColorSol: { value: atm.colorSol.clone() },
      uColorCenit: { value: atm.cenit.clone() },
      uColorHorizonte: { value: atm.horizonte.clone() },
      uAmbiente: { value: atm.ambiente.clone() },
      uAbsorcion: { value: new THREE.Vector3(...perfil.absorcion) },
      uDispSomera: { value: new THREE.Color(perfil.somera) },
      uDispProfunda: { value: new THREE.Color(perfil.profunda) },
      uFondoClaro: { value: new THREE.Color(perfil.fondoClaro) },
      uFondoOscuro: { value: new THREE.Color(perfil.fondoOscuro) },
      uColorEspuma: { value: new THREE.Color(perfil.espuma) },
      uRugosidad: { value: esc.rugosidad ?? 0.072 },
      uCausticaFuerza: { value: esc.causticas ?? 0.90 },
      uTurbiedad: { value: esc.turbiedad ?? 1.0 },
      uFuerzaDetalle: { value: esc.detalle ?? 1.0 },
      uEspumaFuerza: { value: esc.espuma ?? 1.0 },
      uBrumaD0: { value: this.bruma.densidad },
      uBrumaH: { value: this.bruma.alturaEscala },
      uColorBruma: { value: new THREE.Vector3(bruma.r, bruma.g, bruma.b) },
    };

    const mat = new THREE.ShaderMaterial({
      name: 'mar-sierra',
      uniforms: uniformes,
      vertexShader: VERTEX,
      fragmentShader: fragmentPorCalidad(this.calidad, OLAS, this.trenesFragment),
      transparent: true,
      depthWrite: true,
      depthTest: true,
      side: THREE.FrontSide,
    });
    this.material = mat;

    this.malla = new THREE.Mesh(geo, mat);
    this.malla.name = 'mar-sierra';
    this.malla.position.set(this.centro.x, this.nivel, this.centro.z);
    this.malla.receiveShadow = false;
    this.malla.castShadow = false;
    this.malla.renderOrder = -1;
    this.malla.frustumCulled = false;
  }

  /* ---- consultas (bilineal, igual que el shader); profundidad en m_eq ---- */
  profundidad(x, z) {
    const res = this.resCampo, mpt = this.metrosPorTexel;
    const fx = (x - this.centro.x + this.tam / 2) / mpt - 0.5;
    const fz = (z - this.centro.z + this.tam / 2) / mpt - 0.5;
    if (fx < 0 || fz < 0 || fx > res - 1 || fz > res - 1) return PROF_MAX;
    const i0 = Math.floor(fx), j0 = Math.floor(fz);
    const i1 = Math.min(res - 1, i0 + 1), j1 = Math.min(res - 1, j0 + 1);
    const tx = fx - i0, tz = fz - j0;
    const p = this.profundidades;
    const a = p[j0 * res + i0], b = p[j0 * res + i1];
    const c = p[j1 * res + i0], d = p[j1 * res + i1];
    return (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * tz;
  }

  /* ---- por frame ---- */
  cada(dt) {
    this.tiempo += dt * this.factorTiempo;
    this.material.uniforms.uTiempo.value = this.tiempo;
  }

  dispose() {
    this.malla.parent?.remove(this.malla);
    this.malla.geometry.dispose();
    this.material.dispose();
    this.texCampo.dispose();
    this.texOndas.dispose();
    this.texCausticas.dispose();
  }
}
