// ── cortezaParallax.js — relieve de CORTEZA con parallax (Sylva s40) ─────────
//
// Port de la corteza procedural de Sylva (github.com/Token-Gremlin/realistic-forest
// — MIT License, Copyright (c) 2026 Token Gremlin; notice completo al pie).
// Sylva (`src/veg/treeMaterials.js`, `barkHeight` + `barkSurface`) NO hace
// parallax: construye un campo de altura procedural en coordenadas (alrededor,
// a lo largo) en metros — ridged estirado 6× en el eje del grano, cruces fbm,
// grano fino y surcos de escala métrica — y de ahí saca la normal por
// diferencias finitas, oscurece el albedo en las fisuras y hornea oclusión.
// Este módulo porta ESE campo y le SUMA lo que el brief pide: un offset de
// parallax (marcha por capas + refinamiento lineal, estilo POM) sobre el
// mismo campo, para que la corteza gane relieve real cuando la cámara está
// cerca. Diferencias deliberadas respecto a Sylva (declaradas):
//   · El ruido es SÓLIDO 3D en espacio objeto (grano comprimido en Y = eje del
//     fuste) en vez de 2D sobre uv: la geometría del valle no tiene uv útiles
//     (piezas fusionadas por vértice) y una param cilíndrica tendría costura.
//     Los surcos, que sí son periódicos alrededor del eje, usan una frecuencia
//     ENTERA por vuelta (round(17.6·R)/R) → sin costura.
//   · Marcha de parallax sobre una versión MACRO del campo (2 octavas + surco)
//     y sombreado con el campo completo (4+3 octavas): coste acotado en Mali.
//   · Ángulos rasantes: el estiramiento del offset se acota (1/max(v·n, 0,22))
//     y el relieve se apaga suave por debajo de v·n≈0,28 y por distancia
//     (uCortezaD.xy): sin desgarros, a costa de aplanar en el rasante extremo.
//   · Especie: solo el perfil "ridge" (roble/ceiba); ni papel (abedul) ni
//     madera desnuda de Sylva.
// Sylva s07 (capa de SUPERFICIE de `barkSurface`, sumada 2026-09-02): dos tonos
// por fbm (`mix(A, B, tone·0.75 + 0.25·fissure)`), grietas oscuras (ya en s40),
// musgo abajo y en la cara de sombra (`lowness · (0.35 + 0.65·lee)`, máscara fbm,
// `eco.r` de Sylva → dial `cortezaMusgo`), liquen gris-verde en la cara que mira
// arriba (`smoothstep(0.55, 0.92, fbm)·(0.25 + 0.75·up)`), fundido por LOD. Los
// colores base salen del color por vértice del valle (Sylva usa uBarkA/uBarkB);
// altura del tronco = bbox del mesh (registrarBaseline). Humedad real / cara
// norte por datos del mundo = s44.
// Se aplica con onBeforeCompile a un MeshStandardMaterial con vertexColors:
// modo 0 deja el material EXACTO al baseline (el gate compara contra eso),
// modo 1 = solo bump (fiel a Sylva), modo 2 = parallax + bump.
// Limitaciones: mallas NO instanciadas (usa modelViewMatrix) y escala uniforme.
// Hook para el gate: window.__corteza = { activa, modo, params, set(modo), ajustar({...}) }.

const GLSL_SYLVA_RUIDO = /* glsl */ `
// Sylva src/shaders/lib.js (MIT) — simplex 3D (Ashima/McEwan), fbm y ridged.
vec3 czMod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 czMod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 czPermute(vec4 x){ return czMod289(((x*34.0)+1.0)*x); }
vec4 czTaylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float czSnoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = czMod289(i);
  vec4 p = czPermute( czPermute( czPermute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = czTaylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}
const mat3 CZ_M3 = mat3( 0.00, 0.80, 0.60, -0.80, 0.36, -0.48, -0.60, -0.48, 0.64 );
// hashing entero de Sylva (lib.js GLSL_HASH) y worley llevado a 3D (Sylva: worley2 en uv)
uint czUhash(uint x){ x^=x>>16u; x*=0x7feb352du; x^=x>>15u; x*=0x846ca68bu; x^=x>>16u; return x; }
uint czUhash3(uvec3 v){ return czUhash(v.x ^ czUhash(v.y + 0x9e3779b9u) ^ czUhash(v.z + 0x85ebca6bu)); }
float czUhashf(uint x){ return float(czUhash(x)) * (1.0/4294967296.0); }
vec3 czHash33(vec3 p){
  uvec3 q = uvec3(ivec3(floor(p)) + 8388608);
  uint h = czUhash3(q);
  return vec3(czUhashf(h), czUhashf(h ^ 0x68bc21ebu), czUhashf(h ^ 0x2c1b3c6du));
}
// devuelve (dist. 1ª celda, dist. 2ª celda, id) y el punto de la celda más cercana (gradiente analítico)
vec3 czWorley3(vec3 p, float jitter, out vec3 c1){
  vec3 ip = floor(p), fp = p - ip;
  float f1 = 8.0, f2 = 8.0, id = 0.0; c1 = ip;
  for(int k=-1;k<=1;k++) for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    vec3 g = vec3(float(i), float(j), float(k));
    vec3 o = czHash33(ip + g);
    vec3 c = g + (0.5 + jitter*(o-0.5));
    vec3 r = c - fp;
    float d = dot(r,r);
    if(d < f1){ f2 = f1; f1 = d; id = o.z; c1 = ip + c; }
    else if(d < f2){ f2 = d; }
  }
  return vec3(sqrt(f1), sqrt(f2), id);
}
float czFbm(vec3 p, int oct, float lac, float gain){
  float a = 0.5, s = 0.0, n = 0.0;
  for(int i=0;i<10;i++){ if(i>=oct) break; s += a*czSnoise(p); n += a; p = CZ_M3*p*lac; a *= gain; }
  return s / max(n, 1e-5);
}
// ridged multifractal — crestas de corteza (Sylva)
float czRidged(vec3 p, int oct, float lac, float gain){
  float a = 0.5, s = 0.0, n = 0.0, prev = 1.0;
  for(int i=0;i<10;i++){ if(i>=oct) break;
    float r = 1.0 - abs(czSnoise(p));
    r *= r;
    s += a * r * prev; prev = r; n += a;
    p = CZ_M3*p*lac; a *= gain;
  }
  return s / max(n, 1e-5);
}
`;

const GLSL_PARS_FRAG = /* glsl */ `
uniform float uCortezaModo;   // 0 apagado (baseline exacto) · 1 bump (Sylva) · 2 parallax + bump
uniform vec4  uCortezaP;      // x ridge · y escala · z relieve (m) · w pasos de marcha
uniform vec4  uCortezaQ;      // x bump · y radio de referencia (m) · z semilla · w oclusión (0..1)
uniform vec4  uCortezaD;      // x d0 · y d1 (fundido del parallax por distancia, u) · z tinte (0..1) · w rugosidad (0..1)
uniform vec4  uCortezaE;      // x placas (0..1, Sylva uBarkParams.w) · y anisotropía del grano (Sylva 0,17 = 6×) · z gradiente barato (dFdx, 1 evaluación) · w y0 del tronco (piso del bbox, m)
uniform vec4  uCortezaS;      // s07: x dos tonos (0..1) · y musgo (0..1, proxy de humedad = eco.r de Sylva) · z liquen (0..1) · w altura del tronco (m, bbox)
uniform vec4  uCortezaN;      // s07: xyz cara de sombra/sotavento en espacio objeto (Sylva: −z) · w fracción del tronco con musgo (Sylva 0,30)
varying vec3 vCortezaPos;     // posición en espacio objeto (m)
varying mat3 vCortezaR;       // rotación objeto→vista (columnas normalizadas)
${GLSL_SYLVA_RUIDO}
// Sylva barkHeight: p = (around*3.1, along*0.72)/scale; aquí en 3D con el grano en Y.
vec3 czQ(vec3 p){ return vec3(p.x * 3.1, p.y * 0.72, p.z * 3.1) / max(uCortezaP.y, 0.05) + uCortezaQ.z; }
// surcos de escala métrica alrededor del eje: frecuencia ENTERA por vuelta → sin costura
float czSurco(vec3 p){
  float R = max(uCortezaQ.y, 0.3);
  float sc = max(uCortezaP.y, 0.05);                  // la escala también agranda los surcos (Sylva los deja métricos: fustes de 0,3–0,5 m)
  float kf = max(1.0, floor(17.6 * R / sc + 0.5)) / R;
  float around = atan(p.z, p.x) * R;
  float s = 0.5 + 0.5 * sin(around * kf
    + czFbm(vec3(p.x * 1.4, p.y * 0.07, p.z * 1.4) / sc + 9.0, 2, 2.1, 0.5) * 2.2);
  return pow(abs(s * 2.0 - 1.0), 0.58);
}
// campo MACRO para la marcha del parallax (0 = fondo de fisura, 1 = cresta)
// placas escamosas (Sylva: worley estirado ~2,8× a lo largo del grano). Devuelve el aporte a h y
// su GRADIENTE ANALÍTICO en espacio objeto (una sola evaluación de worley por fragmento: las 27
// celdas × 3 muestras eran el mayor costo del shader).
// Sylva suma además un escalón aleatorio por celda (fract(id)*0.18): en un fuste de 2,6 m ese
// salto sale como línea discontinua de 1 px en cada borde de celda (medido en el gate oblicua).
// Se omite: la placa queda como campo continuo (distancia al centro de celda).
float czPlacas(vec3 p, float placas, out vec3 gradObj){
  gradObj = vec3(0.0);
  if (placas < 0.01) return 0.0;
  float sc = max(uCortezaP.y, 0.05);
  vec3 S = vec3(3.1 * 0.85, 0.72 * 0.30, 3.1 * 0.85) / sc;
  vec3 q = p * S + uCortezaQ.z + 3.7;
  vec3 c1; vec3 w = czWorley3(q, 1.0, c1);
  float t = clamp((w.x - 0.05) / 0.37, 0.0, 1.0);
  float plate = t * t * (3.0 - 2.0 * t);                 // smoothstep(0.05, 0.42, F1)
  float dplate = 6.0 * t * (1.0 - t) / 0.37;             // d plate / d F1
  vec3 dF1 = (q - c1) / max(w.x, 1e-4);                  // d F1 / d q
  gradObj = -0.55 * placas * dplate * (dF1 * S);         // d h / d p (dq/dp = S, diagonal)
  return (1.0 - plate) * 0.55 * placas;
}
// campo MACRO para la marcha del parallax (0 = fondo, 1 = cresta): ridged 2 oct + surco; las
// placas son anchas y suaves, no entran en la marcha (costo).
float czMacro(vec3 p){
  vec3 q = czQ(p);
  float r1 = czRidged(vec3(q.x, q.y * uCortezaE.y, q.z), 2, 2.13, 0.52);
  return clamp((r1 + czSurco(p) * 0.64) / 1.64, 0.0, 1.0);
}
// campo BASE (Sylva barkHeight sin placas/papel/grano fino), en unidades de ridge. El grano fino
// de Sylva (fbm ×9, 3 oct) a esta escala es ruido sub-píxel: se omite (9 snoise menos por fragmento).
float czAlturaBase(vec3 p, out float fisura){
  vec3 q = czQ(p);
  float an = uCortezaE.y;
  float r1 = czRidged(vec3(q.x, q.y * an, q.z), 4, 2.13, 0.52);
  float r2 = czRidged(vec3(q.x * 2.7, q.y * an * 2.47, q.z * 2.7) + 7.0, 3, 2.2, 0.5);
  float f = r1 * 0.68 + r2 * 0.32;
  fisura = smoothstep(0.28, 0.86, f);
  float ridge = uCortezaP.x;
  float h = f * ridge;
  // cruces: las grietas se interrumpen a lo largo del grano
  float cruce = czFbm(vec3(q.x * 0.8, q.y * 1.35, q.z * 0.8) + 21.0, 3, 2.1, 0.5) * 0.5 + 0.5;
  h *= mix(0.55, 1.15, cruce);
  float surco = czSurco(p);
  h += surco * 0.64 * ridge;
  fisura = max(fisura, smoothstep(0.32, 0.86, surco));
  // corteza más delgada en fustes finos (Sylva: radius*6)
  h *= mix(0.35, 1.0, clamp(uCortezaQ.y * 6.0, 0.0, 1.0));
  return h;
}
`;

// Va tras <normal_fragment_begin>: ahí existe `normal` (vista, plana si FLAT_SHADED).
const GLSL_MAIN_NORMAL = /* glsl */ `
float cortezaH0 = 0.0, cortezaFis = 0.0, cortezaOcc = 1.0, cortezaTono = 1.0;
// s07: mezcla de dos tonos (0..1), cantidad de musgo y liquen (0..1) y sus colores (lineales)
float cortezaMezcla = 0.5, cortezaMusgo = 0.0, cortezaLiquen = 0.0;
vec3 cortezaMusgoCol = vec3(0.0), cortezaLiqCol = vec3(0.0);
if (uCortezaModo > 0.5) {
  mat3 Rt = transpose(vCortezaR);
  vec3 Nobj = normalize(Rt * normal);
  vec3 Vobj = normalize(Rt * normalize(vViewPosition));
  vec3 dpx = dFdx(vCortezaPos), dpy = dFdy(vCortezaPos);
  float lodPx = length(vec2(length(dpx), length(dpy)));      // metros por píxel (Sylva lodPx)
  float dist = length(vViewPosition);
  // marco tangente: el grano vive en el ruido, así que el marco es libre
  vec3 up = abs(Nobj.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 T = normalize(cross(up, Nobj)); vec3 B = cross(Nobj, T);
  vec3 ps = vCortezaPos;
  float vz = max(dot(Vobj, Nobj), 0.0);
  // parallax: se funde por distancia y se apaga en el rasante extremo (sin desgarros)
  float kPar = (1.0 - smoothstep(uCortezaD.x, uCortezaD.y, dist)) * smoothstep(0.02, 0.28, vz);
  if (uCortezaModo > 1.5 && kPar > 0.001) {
    int NP = int(uCortezaP.w + 0.5);
    float relieve = uCortezaP.z * kPar;
    vec3 Vt = Vobj - Nobj * vz;                                // componente tangencial de la vista
    vec3 paso = -Vt * (relieve / float(NP)) / max(vz, 0.22);   // estiramiento acotado en rasantes
    float dCapa = 1.0 / float(NP), capa = 0.0;
    float prof = 1.0 - czMacro(ps);
    for (int i = 0; i < 8; i++) {
      if (i >= NP || capa >= prof) break;
      ps += paso; capa += dCapa;
      prof = 1.0 - czMacro(ps);
    }
    // refinamiento: intersección lineal entre la última capa por encima y esta
    vec3 psPrev = ps - paso; float capaPrev = capa - dCapa;
    float profPrev = 1.0 - czMacro(psPrev);
    float dAqui = prof - capa, dAntes = profPrev - capaPrev;
    float w = clamp(dAntes / max(dAntes - dAqui, 1e-4), 0.0, 1.0);
    ps = mix(psPrev, ps, w);
  }
  float e = max(0.0035, lodPx * 0.5);
  float hB0 = czAlturaBase(ps, cortezaFis);
  vec3 gP; float hP = czPlacas(ps, uCortezaE.x, gP);
  cortezaH0 = hB0 + hP;
  vec2 grad;
  if (uCortezaE.z > 0.5) {
    // gradiente BARATO: una sola evaluación del campo; ∇h en el plano (dpx, dpy) a partir de las
    // derivadas de pantalla (normal constante por quad de 2×2 px; halo de 1 px en la silueta)
    float dhx = dFdx(hB0), dhy = dFdy(hB0);
    float a11 = dot(dpx, dpx), a12 = dot(dpx, dpy), a22 = dot(dpy, dpy);
    float det = max(a11 * a22 - a12 * a12, 1e-12);
    vec3 gB = ((a22 * dhx - a12 * dhy) * dpx + (-a12 * dhx + a11 * dhy) * dpy) / det;
    grad = vec2(dot(gB + gP, T), dot(gB + gP, B));
  } else {
    float fx, fy;
    float hx = czAlturaBase(ps + T * e, fx);
    float hy = czAlturaBase(ps + B * e, fy);
    grad = vec2(hx - hB0, hy - hB0) / e + vec2(dot(gP, T), dot(gP, B));
  }
  float detFade = clamp(1.0 - lodPx * 1.55, 0.22, 1.0);
  vec3 nObj = normalize(Nobj - (T * grad.x + B * grad.y) * 0.085 * detFade * uCortezaQ.x);
  normal = normalize(vCortezaR * nObj);
  float hn = cortezaH0 / max(uCortezaP.x, 0.2);
  // fisuras en sombra y madera más oscura; deriva lenta para que el fuste no sea un solo marrón
  float tono = mix(0.34, 1.10, smoothstep(0.0, 0.55, hn));
  float drift = czFbm(vec3(ps.x * 0.55, ps.y * 0.045, ps.z * 0.55) / max(uCortezaP.y, 0.05) + uCortezaQ.z * 5.0, 2, 2.1, 0.5) * 0.5 + 0.5;
  tono *= 0.84 + 0.28 * drift;
  cortezaTono = mix(1.0, tono, uCortezaD.z);
  cortezaOcc = mix(1.0, mix(0.50, 1.0, smoothstep(0.05, 0.6, hn)), uCortezaQ.w);

  // ── s07: superficie (Sylva barkSurface 148–201) ─────────────────────────────
  // dos tonos: fbm en metros (Sylva uv·(1.3, 0.11) + rnd·17); aquí en 3D con el grano en Y.
  // La semilla ya está mapeada a [11, 100): ×0,17 la deja ≤ 17 (no romper la precisión).
  float toneS = czFbm(vec3(ps.x * 1.3, ps.y * 0.11, ps.z * 1.3) + uCortezaQ.z * 0.17, 3, 2.1, 0.5) * 0.5 + 0.5;
  cortezaMezcla = toneS * 0.75 + 0.25 * cortezaFis;
  // altura normalizada en el tronco (Sylva heightNorm); y0/altura vienen del bbox del mesh
  float hN = clamp((ps.y - uCortezaE.w) / max(uCortezaS.w, 0.1), 0.0, 1.0);
  float lowness = 1.0 - smoothstep(0.0, max(uCortezaN.w, 0.01), hN);
  float lee = clamp(dot(nObj, normalize(uCortezaN.xyz)) * 0.5 + 0.5, 0.0, 1.0);   // Sylva northFacing
  float upS = clamp(nObj.y * 0.5 + 0.5, 0.0, 1.0);                                // Sylva upFacing
  // musgo: húmedo, a la sombra, bajo en el tronco, a sotavento (eco.r de Sylva → dial)
  float musgo = smoothstep(0.30, 0.85, uCortezaS.y) * lowness * (0.35 + 0.65 * lee);
  if (musgo > 0.001) {
    musgo *= smoothstep(0.28, 0.72, czFbm(vec3(ps.x * 0.28, ps.y * 0.10, ps.z * 0.28) + uCortezaQ.z * 0.11, 3, 2.1, 0.5) * 0.5 + 0.5);
    musgo *= 1.0 - cortezaFis * 0.18;
    musgo = clamp(musgo * 1.75, 0.0, 1.0);
  }
  if (musgo > 0.01) {
    // con el gradiente barato (táctil) el color del musgo va plano: 3 snoise menos
    float mv = uCortezaE.z > 0.5 ? 0.5 : czFbm(vec3(ps.x * 6.5, ps.y * 3.0, ps.z * 6.5), 3, 2.1, 0.5) * 0.5 + 0.5;
    cortezaMusgoCol = mix(vec3(0.030, 0.062, 0.022), vec3(0.062, 0.108, 0.036), mv);
    cortezaOcc = mix(cortezaOcc, cortezaOcc * 0.85, musgo);
  }
  cortezaMusgo = musgo;
  // liquen: manchas de ~0,5 m en la cara que mira arriba; se funden por LOD (a 40 u son sub-píxel)
  float liqFade = clamp(1.0 - lodPx * 1.55, 0.0, 1.0);
  float liquen = uCortezaS.z * liqFade * (0.25 + 0.75 * upS) * (1.0 - musgo * 0.8);
  if (liquen > 0.001) {
    liquen *= smoothstep(0.55, 0.92, czFbm(vec3(ps.x * 2.2, ps.y * 1.1, ps.z * 2.2) + 77.0 + uCortezaQ.z * 0.07, 4, 2.1, 0.5) * 0.5 + 0.5);
    // Sylva: gris-verde (0.145..0.195); tira un tercio hacia el liquen de la paleta madre del valle (#9aa86a lineal)
    cortezaLiqCol = mix(mix(vec3(0.145, 0.150, 0.118), vec3(0.195, 0.192, 0.150), toneS), vec3(0.32, 0.39, 0.14), 0.33);
  }
  cortezaLiquen = liquen;
}
`;

// Va antes de <emissivemap_fragment>: ahí `diffuseColor` ya lleva el color por vértice.
// Modo 0 no entra al bloque → baseline EXACTO (el gate compara contra MAT_VEG).
const GLSL_MAIN_COLOR = /* glsl */ `
if (uCortezaModo > 0.5) {
  vec3 base = diffuseColor.rgb;
  // Sylva: alb = mix(uBarkA, uBarkB, tone·0.75 + 0.25·fissure). Sin uBarkA/B: A = más oscuro y frío,
  // B = más claro y cálido, ambos alrededor del color por vértice (media ≈ ×0,98: no mueve la exposición)
  float k = uCortezaS.x;
  vec3 cA = base * mix(vec3(1.0), vec3(0.80, 0.80, 0.84), k);
  vec3 cB = base * mix(vec3(1.0), vec3(1.22, 1.16, 1.06), k);
  base = mix(cA, cB, cortezaMezcla);
  base *= cortezaTono;                                        // fisuras en sombra + deriva (s40)
  base = mix(base, cortezaMusgoCol, cortezaMusgo * 0.92);     // Sylva
  base = mix(base, cortezaLiqCol, cortezaLiquen * 0.42);      // Sylva
  diffuseColor.rgb = base;
}`;

const GLSL_PARS_VERT = /* glsl */ `
varying vec3 vCortezaPos;
varying mat3 vCortezaR;
`;
const GLSL_MAIN_VERT = /* glsl */ `
vCortezaPos = transformed;
{
  mat3 Rmv = mat3(modelViewMatrix);
  float s2 = max(dot(Rmv[0], Rmv[0]), 1e-8);
  vCortezaR = Rmv / sqrt(s2);
}
`;

// Defaults fijados por barrido en el gate (2026-09-02, Ent R=2,6 m, cámaras cerca/oblicua):
// Sylva puro (ridge 1, escala 1, aniso 0,17, sin placas, bump 1) da ~50 estrías por vuelta =
// pelo, no corteza. Con placas dominantes, grano 2,2× (aniso 0,45), bump 0,7 y tinte 0,85 la
// corteza lee como placas fisuradas sin las líneas de celda. El juicio de arte es del operador.
export const CORTEZA_DEFAULTS = Object.freeze({
  modo: 2, ridge: 0.6, escala: 1.0, relieve: 0.10, pasos: 6, bump: 0.7,
  oclusion: 1.0, tinte: 0.85, rugosidad: 1.0, dist: [18, 45], radio: 2.6, semilla: 0,
  placas: 1.0, aniso: 0.45, barato: 0,
  // s07 (superficie): dos tonos · musgo (proxy de humedad, Sylva eco.r) · liquen · fracción del tronco con musgo · cara de sombra
  tonos: 0.6, musgo: 0.7, liquen: 1.0, musgoAlto: 0.30, dirLee: [0, 0, -1],
});

// `?corteza=1` enciende (modo por defecto = parallax); `?corteza=0` o ausente → null (baseline).
// Diales: cortezaModo (0/1/2) · cortezaRidge · cortezaEscala · cortezaRelieve (m) ·
// cortezaPasos (≤8) · cortezaBump · cortezaOcl · cortezaTinte · cortezaD0 · cortezaD1 ·
// cortezaPlacas (0..1) · cortezaAniso (0,17 = Sylva 6×; 0,45 ≈ 2,2×) · cortezaBarato (1 = gradiente por dFdx, default táctil).
// s07: cortezaTonos · cortezaMusgo · cortezaLiquen (0..1) · cortezaMusgoAlto (fracción) · cortezaSup=0 (los tres a 0 = s40 puro).
export function leerParamsCorteza(search = (typeof location !== 'undefined' ? location.search : '')) {
  const q = new URLSearchParams(search);
  if (!q.has('corteza')) return null;
  const v = q.get('corteza');
  if (v === '0' || v === 'off' || v === 'no') return null;
  const num = (k, d) => { const x = parseFloat(q.get(k)); return Number.isFinite(x) ? x : d; };
  const tactil = typeof matchMedia === 'function' && matchMedia('(pointer:coarse)').matches;
  const sup = !['0', 'off', 'no'].includes(q.get('cortezaSup'));   // s07 encendido dentro de ?corteza=1
  return {
    modo: Math.max(0, Math.min(2, Math.round(num('cortezaModo', CORTEZA_DEFAULTS.modo)))),
    ridge: num('cortezaRidge', CORTEZA_DEFAULTS.ridge),
    escala: q.has('cortezaEscala') ? num('cortezaEscala', CORTEZA_DEFAULTS.escala) : undefined,
    relieve: num('cortezaRelieve', CORTEZA_DEFAULTS.relieve),
    pasos: Math.max(1, Math.min(8, Math.round(num('cortezaPasos', tactil ? 4 : CORTEZA_DEFAULTS.pasos)))),
    bump: num('cortezaBump', CORTEZA_DEFAULTS.bump),
    oclusion: num('cortezaOcl', CORTEZA_DEFAULTS.oclusion),
    tinte: num('cortezaTinte', CORTEZA_DEFAULTS.tinte),
    rugosidad: CORTEZA_DEFAULTS.rugosidad,
    placas: num('cortezaPlacas', CORTEZA_DEFAULTS.placas),
    aniso: num('cortezaAniso', CORTEZA_DEFAULTS.aniso),
    barato: num('cortezaBarato', tactil ? 1 : CORTEZA_DEFAULTS.barato),
    dist: [num('cortezaD0', tactil ? 12 : CORTEZA_DEFAULTS.dist[0]), num('cortezaD1', tactil ? 30 : CORTEZA_DEFAULTS.dist[1])],
    tonos: sup ? num('cortezaTonos', CORTEZA_DEFAULTS.tonos) : 0,
    musgo: sup ? num('cortezaMusgo', CORTEZA_DEFAULTS.musgo) : 0,
    liquen: sup ? num('cortezaLiquen', CORTEZA_DEFAULTS.liquen) : 0,
    musgoAlto: num('cortezaMusgoAlto', CORTEZA_DEFAULTS.musgoAlto),
    tactil,
  };
}

const registro = [];
const paresBaseline = [];   // [meshParche, meshBase] para el control del gate en la MISMA carga
function hook() {
  if (typeof window === 'undefined') return null;
  if (!window.__corteza) {
    window.__corteza = {
      activa: true, modo: null, params: null, materiales: 0,
      // A/B pareado en la MISMA carga: 0 = baseline exacto · 1 = bump · 2 = parallax
      set(modo) { for (const m of registro) m.userData.corteza.uniforms.uCortezaModo.value = modo; this.modo = modo; return modo; },
      // control del gate: muestra el mesh gemelo con el material SIN parche (baseline compilado) y oculta el parcheado
      baseline(on) { for (const [mp, mb] of paresBaseline) { mp.visible = !on; mb.visible = !!on; } this.baselineActiva = !!on; return paresBaseline.length; },
      baselineActiva: false,
      // máscara del gate: oculta ambos meshes (parche y gemelo) → lo que cambia respecto a A es EXACTAMENTE la corteza
      // s07: superficie (dos tonos + musgo + liquen) ON con defaults / OFF = s40 puro; devuelve el estado
      superficie(on) {
        const o = on ? { tonos: CORTEZA_DEFAULTS.tonos, musgo: CORTEZA_DEFAULTS.musgo, liquen: CORTEZA_DEFAULTS.liquen } : { tonos: 0, musgo: 0, liquen: 0 };
        this.ajustar(o); return { ...o, materiales: registro.length };
      },
      ocultar(on) { for (const [mp, mb] of paresBaseline) { if (on) { mp.visible = false; mb.visible = false; } else { mp.visible = !this.baselineActiva; mb.visible = !!this.baselineActiva; } } return paresBaseline.length; },
      ajustar(o = {}) {
        for (const m of registro) {
          const u = m.userData.corteza.uniforms;
          if (o.ridge != null) u.uCortezaP.value.x = o.ridge;
          if (o.escala != null) u.uCortezaP.value.y = o.escala;
          if (o.relieve != null) u.uCortezaP.value.z = o.relieve;
          if (o.pasos != null) u.uCortezaP.value.w = o.pasos;
          if (o.bump != null) u.uCortezaQ.value.x = o.bump;
          if (o.oclusion != null) u.uCortezaQ.value.w = o.oclusion;
          if (o.tinte != null) u.uCortezaD.value.z = o.tinte;
          if (o.dist) { u.uCortezaD.value.x = o.dist[0]; u.uCortezaD.value.y = o.dist[1]; }
          if (o.placas != null) u.uCortezaE.value.x = o.placas;
          if (o.aniso != null) u.uCortezaE.value.y = o.aniso;
          if (o.barato != null) u.uCortezaE.value.z = o.barato;
          if (o.tonos != null) u.uCortezaS.value.x = o.tonos;
          if (o.musgo != null) u.uCortezaS.value.y = o.musgo;
          if (o.liquen != null) u.uCortezaS.value.z = o.liquen;
          if (o.musgoAlto != null) u.uCortezaN.value.w = o.musgoAlto;
          if (o.dirLee) { u.uCortezaN.value.x = o.dirLee[0]; u.uCortezaN.value.y = o.dirLee[1]; u.uCortezaN.value.z = o.dirLee[2]; }
        }
        Object.assign(this.params || {}, o);
      },
    };
  }
  return window.__corteza;
}

// Material de corteza: MeshStandardMaterial (vertexColors) + parche GLSL. `opts` = params de
// leerParamsCorteza + { radio, semilla, material: {...opciones extra del material} }.
export function crearMaterialCorteza(THREE, opts = {}) {
  const p = { ...CORTEZA_DEFAULTS, ...opts, dist: opts.dist || CORTEZA_DEFAULTS.dist };
  // Sylva calibra escala 1 para fustes de ~0,4 m de radio; en un fuste de 2,6 m eso da ~50
  // estrías por vuelta (pelo, no placas). Si no la fijan, la escala crece con el radio.
  if (opts.escala == null && !(opts.escalaFija)) p.escala = Math.max(1, p.radio / 0.8) * (CORTEZA_DEFAULTS.escala);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, ...(p.material || {}) });
  const uniforms = {
    uCortezaModo: { value: p.modo },
    uCortezaP: { value: new THREE.Vector4(p.ridge, p.escala, p.relieve, p.pasos) },
    // la semilla se SUMA a las coordenadas del ruido: una semilla grande (p. ej. 70701) lleva el
    // simplex a coordenadas donde el float32 ya no resuelve y sale una rejilla de puntos (medido
    // en la ceiba, gate rasante/oblicua). Se mapea a [11, 100); las semillas ≤ 100 van directas.
    uCortezaQ: { value: new THREE.Vector4(p.bump, p.radio, p.semilla <= 100 ? p.semilla : ((p.semilla * 0.6180339887) % 1) * 89 + 11, p.oclusion) },
    uCortezaD: { value: new THREE.Vector4(p.dist[0], p.dist[1], p.tinte, p.rugosidad) },
    // w = y0 del tronco; registrarBaseline lo fija (con la altura) desde el bbox del mesh
    uCortezaE: { value: new THREE.Vector4(p.placas, p.aniso, p.barato, p.y0 ?? 0) },
    // s07: altura provisional ∝ radio (Sylva: fustes ~8 radios); registrarBaseline la corrige con el bbox
    uCortezaS: { value: new THREE.Vector4(p.tonos, p.musgo, p.liquen, p.altura ?? p.radio * 8) },
    uCortezaN: { value: new THREE.Vector4(p.dirLee[0], p.dirLee[1], p.dirLee[2], p.musgoAlto) },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + GLSL_PARS_VERT)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + GLSL_MAIN_VERT);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + GLSL_PARS_FRAG)
      .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n' + GLSL_MAIN_NORMAL)
      .replace('#include <emissivemap_fragment>', GLSL_MAIN_COLOR + '\n#include <emissivemap_fragment>')
      .replace('#include <lights_physical_fragment>',
        '#include <lights_physical_fragment>\nmaterial.roughness = clamp(mix(material.roughness * mix(1.0, 1.0 - 0.15 * uCortezaD.w, cortezaFis), 0.96, cortezaMusgo), 0.0525, 1.0);')
      .replace('#include <aomap_fragment>',
        '#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= cortezaOcc;\nreflectedLight.indirectSpecular *= mix(0.35, 1.0, cortezaOcc);');
  };
  mat.customProgramCacheKey = () => 'cortezaParallax-s40-s07-v2';
  mat.userData.corteza = { uniforms, params: p };
  registro.push(mat);
  const h = hook();
  if (h) { h.modo = p.modo; h.params = { ...p }; h.materiales = registro.length; }
  return mat;
}

// Registra el par (mesh con corteza, mesh gemelo con el material original oculto) para que
// `window.__corteza.baseline(true)` muestre el baseline compilado en la misma carga.
export function registrarBaseline(meshParche, meshBase) {
  meshBase.visible = false; meshParche.visible = true;
  paresBaseline.push([meshParche, meshBase]);
  // s07: altura del tronco para `lowness` (Sylva heightNorm) = bbox en espacio objeto del mesh de corteza
  const u = meshParche.material?.userData?.corteza?.uniforms;
  const geo = meshParche.geometry;
  if (u && geo) {
    if (!geo.boundingBox) geo.computeBoundingBox();
    const bb = geo.boundingBox;
    if (bb && Number.isFinite(bb.min.y) && Number.isFinite(bb.max.y) && bb.max.y > bb.min.y) {
      u.uCortezaE.value.w = bb.min.y; u.uCortezaS.value.w = bb.max.y - bb.min.y;
      if (meshParche.material.userData.corteza.params) Object.assign(meshParche.material.userData.corteza.params, { y0: bb.min.y, altura: bb.max.y - bb.min.y });
    }
  }
  const h = hook(); if (h) h.paresBaseline = paresBaseline.length;
  return paresBaseline.length;
}

export function cortezaInstalada() { return registro.length ? { materiales: registro.length, modo: registro[0].userData.corteza.uniforms.uCortezaModo.value } : null; }

/*
MIT License

Copyright (c) 2026 Token Gremlin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
