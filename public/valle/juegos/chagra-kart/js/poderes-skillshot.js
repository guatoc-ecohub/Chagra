// ── poderes-skillshot.js — apuntado, hielo, rayo y haz ──────────────────────
// Las cuatro piezas "skillshot" de los poderes. Técnicas portadas de
// LinearAbiltyCastingThreeJS (c) achrefelouafi — licencia MIT —
// https://github.com/achrefelouafi/LinearAbiltyCastingThreeJS
// (three ^0.185 → r160 WebGL2, GLSL ES 1.00, sin texturas ni assets externos).
// El vocabulario visual es el de la casa: crema de papel, tinta, miel, ocre —
// dibujo animado, no neón.
//
// Qué hay acá y de dónde viene cada truco:
//
//  · FLECHA — el telegraph lineal (AimIndicator): UNA quad en el piso cuyo
//    fragment remapea UV a METROS desde el que castea. La silueta es una sola
//    SDF (unión redondeada de caja + triángulo exacto de iq), así el asta mide
//    lo mismo tire a 3 m o a 15 m. Chevrons con la fase sesgada por |x|:
//    bandas planas → puntas de flecha.
//  · CÍRCULO — el AoE medido (ZoneIndicator): anillo SDF en metros con borde
//    de grosor constante, labio interno duro (la línea contra la que se mide)
//    y snap outCubic × bump que sobrepasa el radio y se asienta.
//  · HIELO — frente de fractura que corre (FrostField: uCongela arrastrado
//    fuera de redondez por dedos angulares, placas voronoi con rebordes) +
//    campo de cristales facetados que brotan del piso (tinte de espesor por
//    ndv, fractura ridged en espacio MUNDO, escarcha fbm en espacio LOCAL,
//    glint rasante, flash de nacimiento por instancia).
//  · RAYO — el kinked bolt: UNA escalera instanciada de quads en espacio
//    parámetro; cada vértice lleva solo (t, lado) y el vertex shader lo vuelve
//    posición mundo cada frame. Kinks = octavas de value noise interpolado
//    LINEALMENTE (a propósito: smoothstep redondea, y las esquinas son lo que
//    lo hace leerse rayo). Dos relojes: restrike (re-snap de forma) + crawl.
//    Dos pasadas (halo ancho + núcleo caliente) = 2 draw calls. Lección
//    "burn": la quemadura del piso muestrea el ruido EN EL PLANO con lookup
//    warpeada, nunca en atan() (radios iguales = radios rectos).
//  · HAZ — el tubo paramétrico: cada vértice lleva (t, vuelta) y el tubo se
//    dibuja TRES veces con pesos opuestos — halo (solo rim), vaina (rim-
//    weighted: se lee hueca), núcleo (axis-weighted: brilla donde la vista
//    recorre el barril). Rim afuera + eje adentro = integral de volumen
//    barata. El 4º beat: charge (orbe) → travel → burn → fade.
//
// Patrón de datos "no dimensions on CPU" (robado entero): los records del
// hielo guardan SOLO fracciones unitless (avance, lateral, jitters −1..1);
// cada metro/segundo se resuelve contra AJUSTES dentro del tick. Tunear
// AJUSTES en vivo re-forma un campo ya plantado, sin recrear nada.
//
// Reglas de la casa que este archivo respeta:
//  · TODO se construye una vez al boot y se recicla (tomar/soltar con dueño,
//    como el embudo de Angelita). Castear no aloca ni crea materiales.
//  · Cero luces (añadir PointLights recompila todos los materiales).
//  · Sin `precision` a mano en ningún shader: un uniform compartido entre
//    etapas con precisiones distintas NO linkea en NVIDIA y three solo lo
//    cuenta por console.error (memoria shader-precision-uniforme-cruzada).

// ── AJUSTES — cada dimensión vive acá, el tick la lee cada frame ────────────
export const AJUSTES = {
  flecha: {
    inicio: 2.3,        // hueco entre el kart y la cola del asta, m (el kart
                        // mide ~2.2 de largo: con menos, el asta pisa el capó)
    anchoAsta: 0.46,    // MEDIO ancho del asta, m
    largoCabeza: 2.3,   // m
    anchoCabeza: 1.45,  // medio ancho de la punta, m
    redondeo: 0.14,     // radio de la unión SDF, m
    borde: 0.09,        // grosor de la línea de tinta, m
    relleno: 0.42,
    chevrones: 0.55,    // frecuencia (bandas por metro)
    desplaza: 2.6,      // velocidad de los chevrones, m/s
    roseta: 1.05,       // radio del glifo en el impacto, m
    alturaPiso: 0.08,
    revelar: 0.35,      // s del barrido de revelado
  },
  circulo: {
    radio: 8,           // EL radio real del barrido de la mariquita (main.js
                        // filtra hazards a 8 m): el círculo mide, no adorna
    borde: 0.34,        // grosor de la banda, m (constante a cualquier radio)
    sesgo: 0.35,        // cuánto del borde queda AFUERA del radio nominal
    labio: 0.06,        // línea dura del labio interno, m
    ticks: 20,
    largoTick: 0.5,
    snap: 1.16,         // sobrepaso del radio al abrir (1 = sin snap)
    abrir: 0.5,         // s del snap-out
    alturaPiso: 0.07,
  },
  hielo: {
    radioCampo: 3.4,    // radio del frente de escarcha alrededor del rival, m
    congelar: 0.7,      // s que tarda el frente en llegar al borde
    agujas: 10,         // cristales esbeltos
    esquirlas: 6,       // pedruscos de tobillo
    altoAguja: 1.8, varAlto: 0.45,        // m, y jitter ±fracción — a 12 m de
    radioAguja: 0.5, varRadio: 0.35,      // cámara, 1.35 m se perdía en la niebla
    altoEsquirla: 0.6, radioEsquirla: 0.55,
    tumbo: 0.28,        // cuánto se tumban hacia afuera
    crecer: 0.26,       // s que tarda un cristal en brotar
    brote: 0.32,        // s del flash de nacimiento (largo, deja palos blancos)
  },
  rayo: {
    alcance: 9,         // el impacto, m adelante del kart
    cielo: 11,          // de qué altura baja, m
    golpe: 0.13,        // s que tarda el frente en clavarse
    filamentos: 7,
    abanico: 0.85, abanicoCerca: 0.06, torsion: 0.4,
    kink: 0.5,          // amplitud de los quiebres, m
    kinkPorMetro: 0.8,  // quiebres por metro
    caida: 0.55,        // falloff por octava
    crawl: 2.6, restrike: 12, // los dos relojes
    pliegue: 0.14, converge: 0.9,
    ancho: 0.10, anchoPunta: 0.55, nucleo: 2.0,
    parpadeo: 0.3, parpadeoVel: 26, destelloFil: 0.5,
    anchoHalo: 7, opHalo: 0.30,
    quemaduraRadio: 3.0, // la marca ramificada del piso, m
  },
  haz: {
    largo: 9.5,         // dónde aterriza la columna, m adelante del kart —
                        // corta: a más distancia la pendiente de la pista
                        // entierra o cuelga el pie de la columna
    // la boca ALTA y adelante: con la cámara pegada atrás del kart, un haz
    // horizontal se ve de punta (una bola, no columna — pasó en el gate).
    // Desde arriba-adelante la columna cruza el cuadro en diagonal
    bocaAdelante: 2.8,  // m adelante del kart
    bocaAlto: 5.4,      // m sobre la pista; el orbe SUBE hasta acá al cargar
    carga: 0.7,         // s del orbe (el 4º beat: wind-up)
    viaje: 0.35,        // s del frente boca→impacto
    radio: 0.55, radioCerca: 0.22, curvaRadio: 0.7,
    flare: 0.9, flareAncho: 0.2,   // el cono al aterrizar
    latido: 0.06, latidoVel: 1.7,  // el tubo respira, no salchichea
    vaiven: 0.09,       // deriva suave del eje (un haz que se quiebra es rayo)
    vetas: 0.85, vetaEscala: 4.5, vetaFlujo: 5.5,
    vainaAncho: 1.6, opVaina: 0.5,
    haloAncho: 2.6, opHalo: 0.3,
    orbe: 0.55,         // radio del orbe de carga, m
    orbeTurbulencia: 0.24,
  },
};

// ── GLSL compartido del módulo (ES 1.00, three r160) ────────────────────────
const RUIDO3 = /* glsl */`
  float hash11(float p){
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
  }
  float hash13(vec3 p3){
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
  }
  float vnoise3(vec3 p){
    vec3 i = floor(p), f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    float a = mix(hash13(i), hash13(i + vec3(1,0,0)), u.x);
    float b = mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), u.x);
    float c = mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), u.x);
    float d = mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), u.x);
    return mix(mix(a, b, u.y), mix(c, d, u.y), u.z);
  }
  float fbm3(vec3 p){
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) {
      v += a * vnoise3(p);
      p = p * 2.03 + vec3(17.3, 5.1, 9.7);
      a *= 0.5;
    }
    return v;
  }
  float ridged3(vec3 p){
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * (1.0 - abs(vnoise3(p) * 2.0 - 1.0));
      p *= 2.06;
      a *= 0.5;
    }
    return v;
  }
  vec2 voronoi2(vec2 p){
    vec2 n = floor(p), f = fract(p);
    float md = 8.0; float id = 0.0;
    for (int j = -1; j <= 1; j++)
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      float h = hash11(dot(n + g, vec2(7.13, 113.17)));
      vec2 o = vec2(h, hash11(h * 91.7));
      vec2 r = g + o - f;
      float d = dot(r, r);
      if (d < md) { md = d; id = hash11(dot(n + g, vec2(31.7, 57.1))); }
    }
    return vec2(sqrt(md), id);
  }
`;

const SDF2 = /* glsl */`
  float sdBox(vec2 p, vec2 b){
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  }
  // triángulo exacto de iq: la cabeza es una cuña ancha y plana donde una
  // intersección de semiplanos deja esquinas visibles
  float sdTriangle(vec2 p, vec2 p0, vec2 p1, vec2 p2){
    vec2 e0 = p1 - p0, e1 = p2 - p1, e2 = p0 - p2;
    vec2 v0 = p - p0, v1 = p - p1, v2 = p - p2;
    vec2 pq0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
    vec2 pq1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
    vec2 pq2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
    float s = sign(e0.x * e2.y - e0.y * e2.x);
    vec2 d = min(min(vec2(dot(pq0, pq0), s * (v0.x * e0.y - v0.y * e0.x)),
                     vec2(dot(pq1, pq1), s * (v1.x * e1.y - v1.y * e1.x))),
                     vec2(dot(pq2, pq2), s * (v2.x * e2.y - v2.y * e2.x)));
    return -sqrt(d.x) * sign(d.y);
  }
`;

const QUAD_VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// hash determinista en JS (los cristales y records se siembran por cast)
function hashJs(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const outCubic = (t) => 1 - Math.pow(1 - t, 3);

// ── el motor ────────────────────────────────────────────────────────────────
export function crearSkillshot(THREE, paleta = {}) {
  const CREMA = paleta.crema ?? 0xf2e2b0;
  const TINTA = paleta.tinta ?? 0x211b12;
  const MIEL = paleta.miel ?? 0xf5cf54;
  const OCRE = paleta.ocre ?? 0xd18d28;

  const grupo = new THREE.Group();
  grupo.name = 'poderesSkillshot';
  let tGlobal = 0;
  let quieto = 1; // 1 = movimiento normal, 0 = reduced motion (relojes parados)

  // ── FLECHA — el telegraph lineal en el piso ───────────────────────────────
  const FLECHA_FRAG = /* glsl */`
    uniform float uTime, uQuadLargo, uQuadAncho, uQuadAtras;
    uniform float uLargo, uInicio, uAsta, uCabezaL, uCabezaA;
    uniform float uRedondeo, uBorde, uRelleno, uChevrones, uDesplaza;
    uniform float uRoseta, uRevelar, uOp;
    uniform vec3 uCol, uTinta;
    varying vec2 vUv;
    ${SDF2}
    ${RUIDO3}
    #define TAU 6.28318530718
    void main() {
      // uv → metros medidos desde el que castea; +y es hacia el objetivo
      vec2 p = vec2((vUv.x - 0.5) * uQuadAncho,
                    (1.0 - vUv.y) * uQuadLargo - uQuadAtras);
      float largo = max(uLargo, uInicio + 0.05);
      float cabL = min(uCabezaL, largo - uInicio);
      float base = largo - cabL;
      // silueta: unión redondeada de asta + cabeza
      float asta = sdBox(p - vec2(0.0, (uInicio + base) * 0.5),
                         vec2(uAsta, max(0.001, (base - uInicio) * 0.5)));
      float cabeza = sdTriangle(p, vec2(-uCabezaA, base), vec2(uCabezaA, base),
                                vec2(0.0, largo));
      float d = min(asta, cabeza) - uRedondeo;
      float aa = fwidth(d) + 0.02;
      float cuerpo = 1.0 - smoothstep(-aa, aa, d);
      float linea = 1.0 - smoothstep(uBorde, uBorde + aa, abs(d));
      // lavado interior con peso al borde (plano = calcomanía; con borde = luz)
      float hondo = clamp(-d / max(uAsta, 0.05), 0.0, 1.0);
      float lavado = pow(1.0 - hondo, 1.2);
      // chevrons: la fase sesgada por |x| vuelve las bandas puntas de flecha
      float fase = (p.y - abs(p.x) * 0.55 - uTime * uDesplaza) * uChevrones;
      float banda = pow(0.5 + 0.5 * cos(fase * TAU), 5.0);
      lavado *= mix(0.55, 1.0, banda);
      // roseta de 6 puntas clavada en el impacto (el glifo del blanco)
      vec2 q = p - vec2(0.0, largo);
      float qr = length(q);
      float qa = atan(q.y, q.x);
      float puas = smoothstep(0.84, 1.0, abs(cos(qa * 3.0))) * smoothstep(uRoseta, 0.0, qr);
      float aro = 1.0 - smoothstep(0.045, 0.09, abs(qr - uRoseta * 0.55));
      float glifo = max(puas, aro * step(qr, uRoseta));
      // barrido de revelado: el frente avanza del kart al blanco
      float frente = uRevelar * (largo + uRoseta);
      float barrido = smoothstep(frente + 0.25, frente - 0.15, p.y);
      float filo = smoothstep(0.35, 0.0, abs(p.y - frente)) * step(uRevelar, 0.999);
      float relleno = cuerpo * lavado * uRelleno;
      float lineas = max(linea, glifo);
      float alfa = clamp(relleno + lineas * 0.92 + filo * 0.5, 0.0, 1.0) * barrido * uOp;
      vec3 col = mix(uCol, uTinta, clamp(lineas * 0.88, 0.0, 1.0));
      gl_FragColor = vec4(col, alfa);
      if (gl_FragColor.a < 0.02) discard;
    }
  `;
  const flechaMat = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERT, fragmentShader: FLECHA_FRAG,
    uniforms: {
      uTime: { value: 0 }, uQuadLargo: { value: 12 }, uQuadAncho: { value: 6 },
      uQuadAtras: { value: 1 }, uLargo: { value: 8 }, uInicio: { value: 1.3 },
      uAsta: { value: 0.46 }, uCabezaL: { value: 2.3 }, uCabezaA: { value: 1.45 },
      uRedondeo: { value: 0.14 }, uBorde: { value: 0.09 }, uRelleno: { value: 0.42 },
      uChevrones: { value: 0.55 }, uDesplaza: { value: 2.6 },
      uRoseta: { value: 1.05 }, uRevelar: { value: 0 }, uOp: { value: 1 },
      uCol: { value: new THREE.Color(CREMA) },
      uTinta: { value: new THREE.Color(TINTA) },
    },
    // sin depthTest: el telegraph es UI de piso y la pista ONDULA — un quad
    // plano a la altura del kart queda enterrado bajo la primera loma (pasó
    // en el gate: flecha y círculo invisibles en cuanto la pista subía)
    transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide,
  });
  // quad unitario con +Z local hacia el blanco: orientarla es un solo yaw
  const flechaGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5);
  const flechaMesh = new THREE.Mesh(flechaGeo, flechaMat);
  flechaMesh.renderOrder = 5;
  flechaMesh.frustumCulled = false;
  flechaMesh.visible = false;
  grupo.add(flechaMesh);

  const flecha = {
    dueno: null,
    tomar(cast) { this.dueno = cast; flechaMesh.visible = true; },
    soltar(cast) {
      if (this.dueno !== cast) return;
      this.dueno = null; flechaMesh.visible = false;
    },
    // origen y objetivo VIVOS: la flecha se re-forma cada frame en metros
    set(o, obj, revelar, op) {
      const a = AJUSTES.flecha;
      const dx = obj.x - o.x, dz = obj.z - o.z;
      const dist = Math.max(a.inicio + 0.6, Math.hypot(dx, dz));
      const yaw = Math.atan2(dx, dz);
      const atras = 0.6;
      const adelante = dist + a.roseta + 0.5;
      const medioAncho = Math.max(a.anchoCabeza, a.roseta) + a.borde + a.redondeo + 0.5;
      const u = flechaMat.uniforms;
      u.uQuadLargo.value = atras + adelante;
      u.uQuadAncho.value = medioAncho * 2;
      u.uQuadAtras.value = atras;
      u.uLargo.value = dist;
      u.uInicio.value = a.inicio;
      u.uAsta.value = a.anchoAsta;
      u.uCabezaL.value = a.largoCabeza;
      u.uCabezaA.value = a.anchoCabeza;
      u.uRedondeo.value = a.redondeo;
      u.uBorde.value = a.borde;
      u.uRelleno.value = a.relleno;
      u.uChevrones.value = a.chevrones;
      u.uDesplaza.value = a.desplaza * quieto;
      u.uRoseta.value = a.roseta;
      u.uRevelar.value = revelar;
      u.uOp.value = op;
      flechaMesh.position.set(o.x - Math.sin(yaw) * atras, (o.y ?? 0) + a.alturaPiso,
        o.z - Math.cos(yaw) * atras);
      flechaMesh.rotation.set(0, yaw, 0);
      flechaMesh.scale.set(medioAncho * 2, 1, atras + adelante);
    },
  };

  // ── CÍRCULO — el AoE medido ───────────────────────────────────────────────
  const CIRCULO_FRAG = /* glsl */`
    uniform float uTime, uQuad, uRadio, uBorde, uSesgo, uLabio;
    uniform float uTicks, uLargoTick, uRevelar, uOp;
    uniform vec3 uCol, uTinta;
    varying vec2 vUv;
    ${RUIDO3}
    #define TAU 6.28318530718
    void main() {
      vec2 p = vec2(vUv.x - 0.5, 0.5 - vUv.y) * uQuad;
      float d = length(p);
      float afuera = uRadio + uBorde * uSesgo;
      float adentro = max(0.01, uRadio - uBorde * (1.0 - uSesgo));
      float aa = fwidth(d) + 0.02;
      if (d > afuera + aa * 3.0) discard;
      // la banda ES el área: crece hacia adentro para que el labio externo
      // no mienta sobre dónde termina el efecto
      float banda = smoothstep(afuera + aa, afuera - aa, d) * smoothstep(adentro - aa, adentro + aa, d);
      float labio = 1.0 - smoothstep(uLabio, uLabio + aa, abs(d - adentro));
      float interior = smoothstep(adentro + aa, adentro - aa, d);
      float radial = clamp(d / adentro, 0.0, 1.0);
      // lavado con peso al borde, TENUE: sin depthTest el interior pinta
      // encima de bermas y postes — con 0.35 era un panqueque naranja sólido
      float lavado = pow(radial, 1.5) * 0.13;
      lavado *= 0.7 + 0.3 * fbm3(vec3(p * 1.1, uTime * 0.2));
      // ticks alrededor del borde: acá lo angular SÍ es la herramienta
      float ang = atan(p.y, p.x) / TAU + 0.5;
      float faseTick = fract(ang * uTicks + uTime * 0.05);
      float tick = 1.0 - smoothstep(0.16, 0.24, faseTick);
      tick *= smoothstep(adentro - uLargoTick, adentro, d) * smoothstep(afuera, adentro, d);
      // barrido lento con cola (rota, no cuña dura)
      float faseB = fract(ang - uTime * 0.22);
      float barrido = pow(1.0 - faseB, 6.0) * smoothstep(0.0, 0.05, faseB) * 0.22 * interior;
      float relleno = interior * lavado;
      float lineas = clamp(labio * 1.2 + tick * 0.8 + barrido, 0.0, 1.0);
      float alfa = clamp(relleno + lineas * 0.85 + banda * 0.9, 0.0, 1.0) * uRevelar * uOp;
      vec3 col = mix(uCol, uTinta, clamp(labio + tick * 0.7, 0.0, 1.0) * 0.85);
      gl_FragColor = vec4(col, alfa);
      if (gl_FragColor.a < 0.02) discard;
    }
  `;
  const circuloMat = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERT, fragmentShader: CIRCULO_FRAG,
    uniforms: {
      uTime: { value: 0 }, uQuad: { value: 18 }, uRadio: { value: 8 },
      uBorde: { value: 0.34 }, uSesgo: { value: 0.35 }, uLabio: { value: 0.06 },
      uTicks: { value: 20 }, uLargoTick: { value: 0.5 },
      uRevelar: { value: 0 }, uOp: { value: 1 },
      uCol: { value: new THREE.Color(0xd9721b) },
      uTinta: { value: new THREE.Color(TINTA) },
    },
    // sin depthTest por la misma razón que la flecha: la pista ondula
    transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide,
  });
  const circuloMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), circuloMat);
  circuloMesh.renderOrder = 5;
  circuloMesh.frustumCulled = false;
  circuloMesh.visible = false;
  grupo.add(circuloMesh);

  const circulo = {
    dueno: null,
    tomar(cast) { this.dueno = cast; circuloMesh.visible = true; },
    soltar(cast) {
      if (this.dueno !== cast) return;
      this.dueno = null; circuloMesh.visible = false;
    },
    set(o, t, op) {
      const c = AJUSTES.circulo;
      // snap: crecimiento outCubic × bump que pica tarde y muere en 1 — el
      // círculo sobrepasa su radio y se asienta (lineal = elemento de UI)
      const k = Math.max(0, Math.min(1, t));
      const bump = Math.sin(Math.PI * Math.pow(k, 1.7));
      const radio = c.radio * outCubic(k) * (1 + (c.snap - 1) * bump);
      const quad = (c.radio * Math.max(1, c.snap) + c.borde + 0.6) * 2;
      const u = circuloMat.uniforms;
      u.uQuad.value = quad;
      u.uRadio.value = Math.max(0.05, radio);
      u.uBorde.value = c.borde;
      u.uSesgo.value = c.sesgo;
      u.uLabio.value = c.labio;
      u.uTicks.value = c.ticks;
      u.uLargoTick.value = c.largoTick;
      u.uRevelar.value = k;
      u.uOp.value = op;
      circuloMesh.position.set(o.x, (o.y ?? 0) + c.alturaPiso, o.z);
      circuloMesh.scale.set(quad, 1, quad);
    },
  };

  // ── HIELO — cristales que brotan + frente de escarcha en el piso ──────────
  // geometría de un cristal: prisma facetado, afilado y un poco doblado.
  // Espacio unitario (base y=0 radio 0.5, punta y=1): la instancia escala
  // huella y alto por separado y local.y se lee directo como "qué tan arriba".
  function crearCristalGeo(semilla, lados, taper, aspereza, doblez) {
    const ALTURAS = [0, 0.22, 0.5, 0.75, 0.92];
    const angDoblez = hashJs(semilla * 1.77) * Math.PI * 2;
    const dx = Math.cos(angDoblez), dz = Math.sin(angDoblez);
    const deriva = (t) => doblez * 0.5 * Math.pow(t, 1.6);
    // ángulos jittereados UNA vez y compartidos por todos los anillos: las
    // facetas suben como aristas continuas, no como un tornillo
    const angs = [];
    for (let i = 0; i < lados; i++) {
      angs.push((i / lados) * Math.PI * 2 +
        (hashJs(semilla * 3.13 + i * 7.7) - 0.5) * (Math.PI * 2 / lados) * 1.6 * aspereza);
    }
    const perfil = (t) => taper + (1 - taper) * Math.pow(1 - t, 1.15);
    const anillos = ALTURAS.map((t, ai) => {
      const r0 = perfil(t) * 0.5;
      const dv = deriva(t);
      const y = t + (hashJs(semilla * 5.9 + ai * 2.3) - 0.5) * 0.06 * aspereza * (t > 0 ? 1 : 0);
      return angs.map((a, i) => {
        // la irregularidad crece hacia la punta: redondo donde nace, roto arriba
        const w = 1 + (hashJs(semilla * 11.1 + ai * 13.7 + i * 3.9) - 0.5) * aspereza * 1.3 * (0.35 + 0.65 * t);
        const r = Math.max(0.002, r0 * w);
        return [Math.cos(a) * r + dx * dv, y, Math.sin(a) * r + dz * dv];
      });
    });
    const dvA = deriva(1);
    const apice = [dx * dvA + (hashJs(semilla * 17.3) - 0.5) * 0.09, 1,
      dz * dvA + (hashJs(semilla * 19.7) - 0.5) * 0.09];
    const pos = [];
    const mete = (p) => pos.push(p[0], p[1], p[2]);
    for (let a = 0; a < anillos.length - 1; a++) {
      const lo = anillos[a], hi = anillos[a + 1];
      for (let i = 0; i < lados; i++) {
        const j = (i + 1) % lados;
        mete(lo[i]); mete(lo[j]); mete(hi[i]);
        mete(lo[j]); mete(hi[j]); mete(hi[i]);
      }
    }
    const tope = anillos[anillos.length - 1];
    for (let i = 0; i < lados; i++) {
      const j = (i + 1) % lados;
      mete(tope[i]); mete(tope[j]); mete(apice);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    // sin índice + normales por cara: eso es lo que deja las facetas nítidas
    geo.computeVertexNormals();
    return geo;
  }

  const CRISTAL_VERT = /* glsl */`
    attribute vec3 aPos;
    attribute vec2 aDim;      // (radio xz, alto) en metros
    attribute float aGiro;
    attribute vec2 aTumbo;
    attribute float aSemilla;
    attribute float aBrote;
    varying vec3 vLocal;
    varying vec3 vMundo;
    varying vec3 vNorm;
    varying float vSemilla;
    varying float vBrote;
    void main() {
      vLocal = position;
      vSemilla = aSemilla;
      vBrote = aBrote;
      float co = cos(aGiro), si = sin(aGiro);
      mat2 rot = mat2(co, -si, si, co);
      vec3 p = position;
      p.xz = rot * p.xz;
      vec3 n = normal;
      n.xz = rot * n.xz;
      p.xz *= aDim.x;
      p.y *= aDim.y;
      // se tumban con la altura: un campo donde todos apuntan igual es césped
      p.xz += aTumbo * position.y * aDim.y;
      vec3 mundo = p + aPos;
      vMundo = mundo;
      vNorm = normalize(vec3(n.x / max(aDim.x, 0.001), n.y / max(aDim.y, 0.001), n.z / max(aDim.x, 0.001)));
      gl_Position = projectionMatrix * viewMatrix * vec4(mundo, 1.0);
    }
  `;
  const CRISTAL_FRAG = /* glsl */`
    uniform float uTime, uOp;
    uniform vec3 uColHondo, uColHielo, uColBorde, uTinta;
    varying vec3 vLocal;
    varying vec3 vMundo;
    varying vec3 vNorm;
    varying float vSemilla;
    varying float vBrote;
    ${RUIDO3}
    void main() {
      vec3 N = normalize(vNorm);
      vec3 V = normalize(cameraPosition - vMundo);
      float ndv = clamp(abs(dot(N, V)), 0.0, 1.0);
      // tinte de espesor: de frente el camino a través del cristal es más
      // largo → se oscurece; las aristas rasantes quedan pálidas. Es lo que
      // hace leer el campo como un sólido con interior
      float espesor = clamp(ndv * 1.15, 0.0, 1.0);
      // fractura en espacio MUNDO: los planos de quiebre miden lo mismo en la
      // esquirla y en la aguja — cortados del mismo bloque
      float grietas = smoothstep(0.62, 0.95, ridged3(vMundo * 3.4 + vSemilla * 37.0));
      // escarcha en espacio LOCAL: el veteado sigue el eje de cada cristal
      float veta = smoothstep(0.45, 0.9, fbm3(vLocal * 8.0 + vSemilla * 11.0) + 0.5);
      // rima acumulada donde el cristal salió del piso
      float rima = smoothstep(0.55, 0.0, vLocal.y) * (0.5 + 0.5 * fbm3(vLocal * 6.0 + vSemilla * 5.0));
      vec3 col = mix(uColHielo, uColHondo, espesor);
      col = mix(col, uColBorde, clamp(veta * 0.35 + grietas * 0.45 + rima * 0.5, 0.0, 1.0));
      // sombreado direccional de facetas: sin esto el prisma es un palo plano
      // lavado contra la niebla — con esto cada cara toma su gris y se LEE
      col *= 0.62 + 0.48 * clamp(dot(N, normalize(vec3(0.35, 0.85, 0.25))), 0.0, 1.0);
      // glint rasante: puntitos de alta frecuencia donde el hielo de verdad brilla
      float brillo = pow(clamp(vnoise3(vMundo * 22.0 + vec3(0.0, uTime * 0.7, 0.0) + vSemilla * 23.0), 0.0, 1.0), 14.0);
      col += uColBorde * brillo * smoothstep(0.5, 0.1, ndv) * 2.0;
      // flash de nacimiento: el cristal se enciende desde adentro al brotar
      col = mix(col, uColBorde, clamp(vBrote, 0.0, 1.0) * 0.85);
      // borde de tinta en la silueta: el lenguaje de dibujo de la casa
      col = mix(col, uTinta, smoothstep(0.78, 0.96, 1.0 - ndv) * 0.85);
      float alfa = (0.88 + 0.12 * (1.0 - ndv)) * uOp;
      gl_FragColor = vec4(col, alfa);
      if (gl_FragColor.a < 0.02) discard;
    }
  `;

  const MAX_CRISTALES = AJUSTES.hielo.agujas + AJUSTES.hielo.esquirlas;
  function crearCampoCristales(geoBase, n) {
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = geoBase.index;
    geo.attributes.position = geoBase.attributes.position;
    geo.attributes.normal = geoBase.attributes.normal;
    const aPos = new Float32Array(n * 3);
    const aDim = new Float32Array(n * 2);
    const aGiro = new Float32Array(n);
    const aTumbo = new Float32Array(n * 2);
    const aSemilla = new Float32Array(n);
    const aBrote = new Float32Array(n);
    geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(aPos, 3));
    geo.setAttribute('aDim', new THREE.InstancedBufferAttribute(aDim, 2));
    geo.setAttribute('aGiro', new THREE.InstancedBufferAttribute(aGiro, 1));
    geo.setAttribute('aTumbo', new THREE.InstancedBufferAttribute(aTumbo, 2));
    geo.setAttribute('aSemilla', new THREE.InstancedBufferAttribute(aSemilla, 1));
    geo.setAttribute('aBrote', new THREE.InstancedBufferAttribute(aBrote, 1));
    geo.instanceCount = n;
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    const mat = new THREE.ShaderMaterial({
      vertexShader: CRISTAL_VERT, fragmentShader: CRISTAL_FRAG,
      uniforms: {
        uTime: { value: 0 }, uOp: { value: 1 },
        // el hondo bien frío y oscuro: contra el cielo lechoso del valle un
        // cristal pálido desaparece — el contraste lo pone el interior
        uColHondo: { value: new THREE.Color(0x4f6e7e) },
        uColHielo: { value: new THREE.Color(0xd6e4e0) },
        uColBorde: { value: new THREE.Color(0xf6faf5) },
        uTinta: { value: new THREE.Color(TINTA) },
      },
      transparent: true, depthWrite: true, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 4;
    mesh.visible = false;
    grupo.add(mesh);
    return { mesh, mat, aPos, aDim, aGiro, aTumbo, aSemilla, aBrote, geo, n };
  }
  const agujasCampo = crearCampoCristales(crearCristalGeo(3.1, 6, 0.13, 0.28, 0.22), AJUSTES.hielo.agujas);
  const esquirlasCampo = crearCampoCristales(crearCristalGeo(9.7, 5, 0.24, 0.55, 0.35), AJUSTES.hielo.esquirlas);

  const ESCARCHA_FRAG = /* glsl */`
    uniform float uTime, uQuad, uRadio, uCongela, uSemilla, uOp;
    uniform vec3 uCol, uColBorde, uTinta;
    varying vec2 vUv;
    ${RUIDO3}
    #define TAU 6.28318530718
    void main() {
      vec2 p = vec2(vUv.x - 0.5, 0.5 - vUv.y) * uQuad;
      float d = length(p);
      float afuera = uRadio + 0.16;
      float aa = fwidth(d) + 0.02;
      if (d > afuera + aa * 4.0) discard;
      // el frente: arrastrado fuera de redondez por dedos angulares — la
      // escarcha no avanza en círculo, ALCANZA. (Acá lo angular es correcto:
      // esto ES una frontera.)
      vec2 rumbo = d > 1e-4 ? p / d : vec2(1.0, 0.0);
      float dedos = 0.78 + 0.3 * (vnoise3(vec3(rumbo * 3.1, uSemilla * 6.0)) * 2.0 - 1.0);
      float alcanza = uCongela * afuera * dedos;
      float helado = smoothstep(alcanza, alcanza - 0.65, d);
      if (helado < 0.004) discard;
      float interior = smoothstep(afuera, afuera - 0.4, d);
      float radial = clamp(d / max(afuera, 0.01), 0.0, 1.0);
      // placas voronoi con los rebordes claros: la rima se apila donde dos
      // placas se encuentran; el id rompe el tono de cada placa
      vec2 celda = voronoi2(p * 1.7 + uSemilla * 20.0);
      float rebordes = smoothstep(0.24, 0.02, celda.x);
      float placa = mix(0.6, 1.0, celda.y);
      // dedos de escarcha: ridged warpeado EN EL PLANO, nunca en atan()
      float warp = fbm3(vec3(p * 0.5, uSemilla)) * 0.6;
      float fil = ridged3(vec3(p * 1.5 + warp, uSemilla * 11.0 + uTime * 0.1));
      float escarcha = smoothstep(0.62, 0.92, fil) * (0.35 + 0.65 * radial);
      float lavado = interior * pow(radial, 1.3) * 0.55 * placa;
      float cuerpo = lavado + escarcha * 0.7;
      float lineas = rebordes * interior * 0.85;
      float alfa = clamp(cuerpo + lineas, 0.0, 1.0) * helado * uOp;
      vec3 col = mix(uCol, uColBorde, clamp(escarcha + rebordes, 0.0, 1.0));
      // el labio que avanza sigue congelando: se queda encendido mientras viaja
      col = mix(col, uColBorde, smoothstep(0.5, 0.0, abs(d - alcanza)) * step(uCongela, 0.985));
      col = mix(col, uTinta, rebordes * 0.35);
      gl_FragColor = vec4(col, alfa);
      if (gl_FragColor.a < 0.02) discard;
    }
  `;
  const escarchaMat = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERT, fragmentShader: ESCARCHA_FRAG,
    uniforms: {
      uTime: { value: 0 }, uQuad: { value: 8 }, uRadio: { value: 3.4 },
      uCongela: { value: 0 }, uSemilla: { value: 0 }, uOp: { value: 1 },
      uCol: { value: new THREE.Color(0xcfdcd8) },
      uColBorde: { value: new THREE.Color(0xf6faf5) },
      uTinta: { value: new THREE.Color(TINTA) },
    },
    // sin depthTest: el frente que corre es LA pieza — enterrado bajo una
    // loma de la pista (quad plano a la altura del rival) no existe
    transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide,
  });
  const escarchaMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), escarchaMat);
  escarchaMesh.renderOrder = 4;
  escarchaMesh.frustumCulled = false;
  escarchaMesh.visible = false;
  grupo.add(escarchaMesh);

  // records del campo: SOLO fracciones unitless — cada metro se resuelve
  // contra AJUSTES.hielo en el tick (tunear en vivo re-crece el campo)
  const hieloRecords = [];
  for (let i = 0; i < MAX_CRISTALES; i++) {
    hieloRecords.push({
      angulo: 0, radial: 0, alto: 0, radio: 0, giro: 0,
      tumboX: 0, tumboZ: 0, semilla: 0, tBrote: -1,
    });
  }
  const hielo = {
    dueno: null,
    centro: { x: 0, y: 0, z: 0 },
    tomar(cast, semilla) {
      this.dueno = cast;
      const rng = mulberry32(Math.floor(semilla * 1e6) || 1);
      for (const r of hieloRecords) {
        r.angulo = rng() * Math.PI * 2;
        r.radial = Math.sqrt(rng());        // parejo en área, no apiñado al centro
        r.alto = rng() * 2 - 1;
        r.radio = rng() * 2 - 1;
        r.giro = rng() * Math.PI * 2;
        r.tumboX = (rng() * 2 - 1);
        r.tumboZ = (rng() * 2 - 1);
        r.semilla = rng() * 97;
        r.tBrote = -1;
      }
      escarchaMat.uniforms.uSemilla.value = semilla % 89;
      agujasCampo.mesh.visible = true;
      esquirlasCampo.mesh.visible = true;
      escarchaMesh.visible = true;
    },
    soltar(cast) {
      if (this.dueno !== cast) return;
      this.dueno = null;
      agujasCampo.mesh.visible = false;
      esquirlasCampo.mesh.visible = false;
      escarchaMesh.visible = false;
    },
    mover(x, y, z) {
      this.centro.x = x; this.centro.y = y; this.centro.z = z;
    },
    set(congela, op) {
      const h = AJUSTES.hielo;
      const c = this.centro;
      escarchaMesh.position.set(c.x, c.y + 0.06, c.z);
      escarchaMesh.scale.setScalar((h.radioCampo + 0.6) * 2);
      const eu = escarchaMat.uniforms;
      eu.uQuad.value = (h.radioCampo + 0.6) * 2;
      eu.uRadio.value = h.radioCampo;
      eu.uCongela.value = congela;
      eu.uOp.value = op;
      const frente = congela * h.radioCampo;
      let idx = 0;
      for (const campo of [agujasCampo, esquirlasCampo]) {
        const esAguja = campo === agujasCampo;
        for (let i = 0; i < campo.n; i++, idx++) {
          const r = hieloRecords[idx];
          const dist = r.radial * h.radioCampo * 0.92;
          // el cristal brota cuando el frente de escarcha lo pisa
          if (r.tBrote < 0 && dist <= frente) r.tBrote = tGlobal;
          let k = 0, brote = 0;
          if (r.tBrote >= 0) {
            const edad = tGlobal - r.tBrote;
            k = Math.min(1, edad / Math.max(0.05, h.crecer));
            k = 1 - Math.pow(1 - k, 3); // brota rápido y se asienta
            brote = Math.max(0, 1 - edad / Math.max(0.05, h.brote));
          }
          const alto = (esAguja ? h.altoAguja : h.altoEsquirla) * (1 + r.alto * h.varAlto) * k;
          const radio = (esAguja ? h.radioAguja : h.radioEsquirla) * (1 + r.radio * h.varRadio);
          campo.aPos[i * 3] = c.x + Math.cos(r.angulo) * dist;
          campo.aPos[i * 3 + 1] = c.y;
          campo.aPos[i * 3 + 2] = c.z + Math.sin(r.angulo) * dist;
          campo.aDim[i * 2] = radio;
          campo.aDim[i * 2 + 1] = Math.max(0.001, alto);
          campo.aGiro[i] = r.giro;
          // se tumban hacia AFUERA del centro, más los del borde
          campo.aTumbo[i * 2] = Math.cos(r.angulo) * h.tumbo * r.radial + r.tumboX * 0.1;
          campo.aTumbo[i * 2 + 1] = Math.sin(r.angulo) * h.tumbo * r.radial + r.tumboZ * 0.1;
          campo.aSemilla[i] = r.semilla;
          campo.aBrote[i] = brote;
        }
        campo.mat.uniforms.uOp.value = op;
        for (const nombre of ['aPos', 'aDim', 'aGiro', 'aTumbo', 'aSemilla', 'aBrote']) {
          campo.geo.attributes[nombre].needsUpdate = true;
        }
      }
    },
  };

  // ── RAYO — el kinked bolt en vertex shader ────────────────────────────────
  function crearEscaleraGeo(nodos, filamentos) {
    const pos = new Float32Array(nodos * 2 * 3);
    for (let i = 0; i < nodos; i++) {
      const t = i / (nodos - 1);
      pos[i * 6] = t; pos[i * 6 + 1] = -1;
      pos[i * 6 + 3] = t; pos[i * 6 + 4] = 1;
    }
    const idx = new Uint16Array((nodos - 1) * 6);
    for (let i = 0; i < nodos - 1; i++) {
      const a = i * 2, o = i * 6;
      idx[o] = a; idx[o + 1] = a + 1; idx[o + 2] = a + 2;
      idx[o + 3] = a + 1; idx[o + 4] = a + 3; idx[o + 5] = a + 2;
    }
    const fil = new Float32Array(filamentos);
    for (let i = 0; i < filamentos; i++) fil[i] = i;
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aFilamento', new THREE.InstancedBufferAttribute(fil, 1));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.instanceCount = filamentos;
    // el rayo se arma en espacio mundo en el vertex: sus bounds no significan nada
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    return geo;
  }

  const RAYO_VERT = /* glsl */`
    #define PI 3.141592653589793
    #define TAU 6.283185307179586
    uniform float uTime, uSemilla, uRestrike, uCrawl;
    uniform vec3 uOrigen, uObjetivo, uLado;
    uniform float uFilamentos, uAbanico, uAbanicoCerca, uTorsion;
    uniform float uKink, uKinkEscala, uCaida, uPliegue, uConverge;
    uniform float uAncho, uAnchoPunta, uNucleo, uEscalaAncho;
    uniform float uDestelloFil, uParpadeoVel, uFundido;
    attribute float aFilamento;
    varying float vT;
    varying float vLado;
    varying float vRadial;
    varying float vDestello;
    ${RUIDO3}
    // value noise con rampa LINEAL: salida a trozos rectos, esquinas vivas.
    // smoothstep las redondearía, y las esquinas SON el rayo.
    float vlin(float x, float s) {
      float i = floor(x);
      return mix(hash11(i + s), hash11(i + 1.0 + s), x - i) * 2.0 - 1.0;
    }
    vec2 kink(float t, float s, float tramo) {
      vec2 o = vec2(0.0);
      float amp = 1.0;
      float freq = max(uKinkEscala, 0.01) * tramo; // quiebres por METRO
      float corre = uTime * uCrawl;
      for (int i = 0; i < 4; i++) {
        o.x += amp * vlin(t * freq + corre, s + 13.0 * float(i));
        o.y += amp * vlin(t * freq + corre * 1.17, s + 71.3 + 13.0 * float(i));
        amp *= uCaida;
        freq *= 2.0;
        corre *= 1.63;
      }
      return o;
    }
    vec3 puntoRayo(float t, float s, float radial, vec3 n1, vec3 n2, float tramo) {
      vec3 eje = mix(uOrigen, uObjetivo, t);
      // clavado en la mano siempre, y en el blanco tanto como uConverge pida —
      // un rayo que aterriza donde no apuntaba se lee como bug
      float pl = max(uPliegue, 0.001);
      float puntas = smoothstep(0.0, pl, t) *
        mix(1.0, smoothstep(0.0, pl, 1.0 - t), clamp(uConverge, 0.0, 1.0));
      vec2 off = kink(t, s, tramo) * uKink * puntas;
      float ang = s * TAU + (t * uTorsion + uTime * 0.6) * TAU;
      float abre = mix(uAbanicoCerca, uAbanico, pow(clamp(t, 0.0, 1.0), 1.6));
      off += vec2(cos(ang), sin(ang)) * abre * radial;
      return eje + n1 * off.x + n2 * off.y;
    }
    void main() {
      float t = position.x;
      float lado = position.y;
      vT = t;
      vLado = lado;
      vec3 delta = uObjetivo - uOrigen;
      float tramo = max(length(delta), 0.01);
      vec3 dir = delta / tramo;
      vec3 n1 = uLado - dir * dot(uLado, dir);
      n1 = length(n1) > 1e-4 ? normalize(n1) : normalize(cross(dir, vec3(0.0, 1.0, 0.0)));
      vec3 n2 = normalize(cross(dir, n1));
      // restrike: todos los filamentos re-snapean de forma N veces/s; el crawl
      // los desliza entre medio. Juntos: un rayo sostenido nunca se ve quieto
      float strike = floor(uTime * max(uRestrike, 0.01));
      float s = hash11(aFilamento * 7.13 + uSemilla + strike * 3.77) * 97.0;
      float radial = uFilamentos <= 1.0 ? 0.0 : aFilamento / (uFilamentos - 1.0);
      vRadial = radial;
      vec3 aca = puntoRayo(t, s, radial, n1, n2, tramo);
      float paso = 0.02;
      float sig = t + paso;
      float voltea = 1.0;
      if (sig > 1.0) { sig = t - paso; voltea = -1.0; }
      vec3 tang = (puntoRayo(sig, s, radial, n1, n2, tramo) - aca) * voltea;
      tang = length(tang) > 1e-5 ? normalize(tang) : dir;
      // la cinta mira a cámara: tangente × vista — grosor parejo desde
      // cualquier ángulo sin ser línea de pantalla
      vec3 aCam = normalize(cameraPosition - aca);
      vec3 binorm = cross(tang, aCam);
      float bl = length(binorm);
      binorm = bl > 1e-4 ? binorm / bl : n1;
      // parpadeo por filamento CUANTIZADO al mismo reloj: estroboscopio de
      // bulto, no shimmer independiente
      float destello = mix(1.0, hash11(floor(uTime * uParpadeoVel) + aFilamento * 3.7 + uSemilla), uDestelloFil);
      vDestello = destello;
      float medio = uAncho * uEscalaAncho;
      medio *= mix(1.0, uAnchoPunta, clamp(t, 0.0, 1.0));
      medio *= mix(uNucleo, 1.0, radial);
      medio *= destello * uFundido;
      gl_Position = projectionMatrix * viewMatrix * vec4(aca + binorm * lado * medio, 1.0);
    }
  `;
  const RAYO_FRAG = /* glsl */`
    uniform float uTime, uSemilla, uProgreso, uParpadeo, uParpadeoVel;
    uniform float uOpPasada, uFundido;
    uniform vec3 uColNucleo, uColMedio, uColBorde;
    varying float vT;
    varying float vLado;
    varying float vRadial;
    varying float vDestello;
    ${RUIDO3}
    void main() {
      // delante del frente todavía no hay rayo: se recorta, no se escala — la
      // FORMA no cambia mientras el frente viaja, solo cuánto de ella existe
      float dibujado = smoothstep(uProgreso, uProgreso - 0.08, vT);
      if (dibujado <= 0.002) discard;
      float v = clamp(abs(vLado), 0.0, 1.0);
      #ifdef RAYO_HALO
        float perfil = pow(1.0 - v, 2.2);
        vec3 col = mix(uColBorde, uColMedio, perfil);
      #else
        float perfil = pow(1.0 - v, 3.2);
        vec3 col = mix(uColMedio, uColNucleo, smoothstep(0.3, 1.0, perfil));
      #endif
      // el borde delantero es donde el aire se está rompiendo
      col += uColNucleo * smoothstep(uProgreso - 0.16, uProgreso, vT) * 1.6;
      // cuantizado, no sinusoidal: el rayo real tartamudea entre brillos
      float tiembla = 1.0 - uParpadeo * hash11(floor(uTime * uParpadeoVel) + uSemilla);
      float alfa = perfil * dibujado * tiembla * vDestello * uFundido * uOpPasada;
      alfa *= mix(1.0, 0.72, vRadial); // las ramas exteriores más tenues
      if (alfa < 0.01) discard;
      gl_FragColor = vec4(col, alfa);
    }
  `;
  function crearRayoMat(halo) {
    return new THREE.ShaderMaterial({
      defines: halo ? { RAYO_HALO: '' } : {},
      vertexShader: RAYO_VERT, fragmentShader: RAYO_FRAG,
      uniforms: {
        uTime: { value: 0 }, uSemilla: { value: 0 },
        uOrigen: { value: new THREE.Vector3() },
        uObjetivo: { value: new THREE.Vector3(0, 0, 1) },
        uLado: { value: new THREE.Vector3(1, 0, 0) },
        uRestrike: { value: 12 }, uCrawl: { value: 2.6 },
        uFilamentos: { value: 7 }, uAbanico: { value: 0.85 },
        uAbanicoCerca: { value: 0.06 }, uTorsion: { value: 0.4 },
        uKink: { value: 0.5 }, uKinkEscala: { value: 0.8 }, uCaida: { value: 0.55 },
        uPliegue: { value: 0.14 }, uConverge: { value: 0.9 },
        uAncho: { value: 0.1 }, uAnchoPunta: { value: 0.55 },
        uNucleo: { value: 2.0 }, uEscalaAncho: { value: halo ? 7 : 1 },
        uDestelloFil: { value: 0.5 }, uParpadeo: { value: 0.3 },
        uParpadeoVel: { value: 26 },
        uProgreso: { value: 0 }, uFundido: { value: 1 },
        uOpPasada: { value: halo ? 0.3 : 1 },
        uColNucleo: { value: new THREE.Color(0xfdf6dd) },
        uColMedio: { value: new THREE.Color(MIEL) },
        uColBorde: { value: new THREE.Color(OCRE) },
      },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
  }
  const rayoGeo = crearEscaleraGeo(56, AJUSTES.rayo.filamentos);
  const rayoNucleoMat = crearRayoMat(false);
  const rayoHaloMat = crearRayoMat(true);
  const rayoNucleo = new THREE.Mesh(rayoGeo, rayoNucleoMat);
  const rayoHalo = new THREE.Mesh(rayoGeo, rayoHaloMat);
  for (const m of [rayoNucleo, rayoHalo]) {
    m.frustumCulled = false;
    m.renderOrder = 7;
    m.visible = false;
    grupo.add(m);
  }

  // la quemadura ramificada del piso: ridged EN EL PLANO con lookup warpeada.
  // Muestrear en atan() da radios iguales = rayos rectos de fuego artificial.
  const QUEMADURA_FRAG = /* glsl */`
    uniform float uTime, uQuad, uRadio, uSemilla, uVida, uOp;
    uniform vec3 uCarbon, uBrasa;
    varying vec2 vUv;
    ${RUIDO3}
    void main() {
      vec2 p = vec2(vUv.x - 0.5, 0.5 - vUv.y) * uQuad;
      float d = length(p);
      if (d > uRadio) discard;
      float radial = d / max(uRadio, 0.01);
      float warp = fbm3(vec3(p * 0.55 + uSemilla, uSemilla * 3.0)) * 1.1;
      float fil = ridged3(vec3(p * 1.35 + warp, uSemilla * 11.0));
      // el umbral sube con el radio: las ramas se adelgazan y se sueltan lejos
      float rama = smoothstep(0.6 + radial * 0.28, 0.97, fil) * (1.0 - radial * radial);
      float centro = smoothstep(0.4, 0.0, d);
      float marca = clamp(rama + centro * 0.8, 0.0, 1.0);
      if (marca < 0.02) discard;
      // recién caído el rayo las ramas son brasa; después queda el carbón
      vec3 col = mix(uCarbon, uBrasa, clamp(uVida * 1.4 - radial * 0.5, 0.0, 1.0) * rama);
      float alfa = marca * (0.35 + 0.65 * uVida) * uOp;
      gl_FragColor = vec4(col, alfa);
      if (gl_FragColor.a < 0.02) discard;
    }
  `;
  const quemaduraMat = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERT, fragmentShader: QUEMADURA_FRAG,
    uniforms: {
      uTime: { value: 0 }, uQuad: { value: 6 }, uRadio: { value: 3 },
      uSemilla: { value: 0 }, uVida: { value: 1 }, uOp: { value: 1 },
      uCarbon: { value: new THREE.Color(0x2c2318) },
      uBrasa: { value: new THREE.Color(0xd98a2b) },
    },
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const quemaduraMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), quemaduraMat);
  quemaduraMesh.renderOrder = 4;
  quemaduraMesh.frustumCulled = false;
  quemaduraMesh.visible = false;
  grupo.add(quemaduraMesh);

  const rayo = {
    dueno: null,
    tomar(cast, semilla) {
      this.dueno = cast;
      for (const m of [rayoNucleoMat, rayoHaloMat]) m.uniforms.uSemilla.value = semilla % 97;
      quemaduraMat.uniforms.uSemilla.value = semilla % 89;
      rayoNucleo.visible = true;
      rayoHalo.visible = true;
    },
    soltar(cast) {
      if (this.dueno !== cast) return;
      this.dueno = null;
      rayoNucleo.visible = false;
      rayoHalo.visible = false;
      quemaduraMesh.visible = false;
    },
    set(origen, impacto, progreso, fundido) {
      const a = AJUSTES.rayo;
      for (const m of [rayoNucleoMat, rayoHaloMat]) {
        const u = m.uniforms;
        u.uOrigen.value.set(origen.x, origen.y, origen.z);
        u.uObjetivo.value.set(impacto.x, impacto.y, impacto.z);
        u.uProgreso.value = progreso;
        u.uFundido.value = fundido;
        u.uRestrike.value = a.restrike * (0.3 + 0.7 * quieto);
        u.uCrawl.value = a.crawl * quieto;
        u.uFilamentos.value = a.filamentos;
        u.uAbanico.value = a.abanico;
        u.uAbanicoCerca.value = a.abanicoCerca;
        u.uTorsion.value = a.torsion;
        u.uKink.value = a.kink;
        u.uKinkEscala.value = a.kinkPorMetro;
        u.uCaida.value = a.caida;
        u.uPliegue.value = a.pliegue;
        u.uConverge.value = a.converge;
        u.uAncho.value = a.ancho;
        u.uAnchoPunta.value = a.anchoPunta;
        u.uNucleo.value = a.nucleo;
        u.uDestelloFil.value = a.destelloFil;
        u.uParpadeo.value = a.parpadeo * quieto;
        u.uParpadeoVel.value = a.parpadeoVel;
      }
      rayoHaloMat.uniforms.uEscalaAncho.value = a.anchoHalo;
      rayoHaloMat.uniforms.uOpPasada.value = a.opHalo;
    },
    quemar(impacto, vida, op) {
      const a = AJUSTES.rayo;
      quemaduraMesh.visible = vida > 0;
      quemaduraMesh.position.set(impacto.x, impacto.y + 0.05, impacto.z);
      quemaduraMesh.scale.setScalar(a.quemaduraRadio * 2);
      const u = quemaduraMat.uniforms;
      u.uQuad.value = a.quemaduraRadio * 2;
      u.uRadio.value = a.quemaduraRadio;
      u.uVida.value = vida;
      u.uOp.value = op;
    },
  };

  // ── HAZ — el tubo paramétrico (halo / vaina / núcleo) + orbe de carga ─────
  function crearTuboGeo(nodos, lados) {
    const cols = lados + 1; // la costura duplicada: a llega a 1.0, no salta a 0
    const pos = new Float32Array(nodos * cols * 3);
    let v = 0;
    for (let i = 0; i < nodos; i++) {
      const t = i / (nodos - 1);
      for (let j = 0; j < cols; j++) {
        pos[v++] = t; pos[v++] = j / lados; pos[v++] = 0;
      }
    }
    const idx = new Uint16Array((nodos - 1) * lados * 6);
    let k = 0;
    for (let i = 0; i < nodos - 1; i++) {
      for (let j = 0; j < lados; j++) {
        const a = i * cols + j, b = a + cols;
        idx[k++] = a; idx[k++] = b; idx[k++] = a + 1;
        idx[k++] = b; idx[k++] = b + 1; idx[k++] = a + 1;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    return geo;
  }

  const HAZ_COMUN = /* glsl */`
    #define PI 3.141592653589793
    #define TAU 6.283185307179586
    uniform float uTime, uSemilla, uProgreso, uFundido, uAnchoFundido;
    uniform vec3 uOrigen, uObjetivo, uLado;
    uniform float uRadio, uRadioCerca, uCurvaRadio, uEscalaRadio;
    uniform float uFlare, uFlareAncho, uLatido, uLatidoVel, uVaiven;
    uniform float uVetas, uVetaEscala, uVetaFlujo, uOpPasada;
    uniform vec3 uColNucleo, uColMedio, uColBorde, uColHalo;
  `;
  const HAZ_VERT = /* glsl */`
    ${HAZ_COMUN}
    varying float vT;
    varying float vVuelta;
    varying float vCara;
    ${RUIDO3}
    // beamRadius y beamAxis SON la geometría: el tubo entero se posiciona
    // contra estas dos funciones, por vértice, por frame
    float radioHaz(float t) {
      float u = clamp(t, 0.0, 1.0);
      float r = mix(uRadioCerca, uRadio, pow(u, max(uCurvaRadio, 0.01)));
      r *= 1.0 + uLatido * sin((u * 2.4 - uTime * uLatidoVel) * TAU);
      r *= 1.0 + uFlare * smoothstep(1.0 - max(uFlareAncho, 0.001), 1.0, u);
      return max(r * uEscalaRadio * uAnchoFundido, 0.0001);
    }
    vec3 ejeHaz(float t, vec3 n1, vec3 n2) {
      vec3 p = mix(uOrigen, uObjetivo, t);
      // deriva SUAVE clavada en las puntas — un haz que se quiebra es rayo
      float puntas = sin(clamp(t, 0.0, 1.0) * PI);
      float dx = vnoise3(vec3(t * 0.9, uTime * 0.7, uSemilla)) * 2.0 - 1.0;
      float dy = vnoise3(vec3(t * 0.9 + 31.7, uTime * 0.7, uSemilla + 7.3)) * 2.0 - 1.0;
      return p + (n1 * dx + n2 * dy) * uVaiven * puntas;
    }
    void main() {
      vec3 delta = uObjetivo - uOrigen;
      float tramo = max(length(delta), 0.01);
      vec3 dir = delta / tramo;
      vec3 lat = uLado - dir * dot(uLado, dir);
      vec3 n1 = length(lat) > 1e-4 ? normalize(lat) : normalize(cross(dir, vec3(0.0, 1.0, 0.0)));
      vec3 n2 = normalize(cross(dir, n1));
      float t = position.x;
      float a = position.y;
      float ang = a * TAU;
      vec3 nrm = n1 * cos(ang) + n2 * sin(ang);
      vec3 aca = ejeHaz(t, n1, n2) + nrm * radioHaz(t);
      vT = t;
      vVuelta = a;
      // 1 mirando por el cañón, 0 en la silueta: los dos pesos del tubo
      // (núcleo por eje, vaina por rim) salen de este único número
      vCara = abs(dot(normalize(cameraPosition - aca), nrm));
      gl_Position = projectionMatrix * viewMatrix * vec4(aca, 1.0);
    }
  `;
  const HAZ_FRAG = /* glsl */`
    ${HAZ_COMUN}
    varying float vT;
    varying float vVuelta;
    varying float vCara;
    ${RUIDO3}
    void main() {
      // delante del frente no hay haz: recorte, no escala
      float dibujado = smoothstep(uProgreso, uProgreso - 0.06, vT);
      if (dibujado <= 0.002) discard;
      float ang = vVuelta * TAU;
      // vetas de gas corriendo por el barril, estiradas DURO a lo largo
      float flujo = ridged3(vec3(vT * uVetaEscala - uTime * uVetaFlujo,
        cos(ang) * 2.4, sin(ang) * 2.4 + uSemilla));
      float veta = smoothstep(0.62, 0.97, flujo) * uVetas;
      float cara = clamp(vCara, 0.0, 1.0);
      float porEje = pow(cara, 1.4);
      float porRim = pow(1.0 - cara, 2.2);
      vec3 col; float alfa;
      #if HAZ_PASADA == 0
        // NÚCLEO: brilla donde la vista recorre el barril — vara sólida
        col = mix(uColMedio, uColNucleo, clamp(0.35 + veta, 0.0, 1.0));
        alfa = 0.85 * mix(0.28, 1.0, porEje) + veta * 0.35;
      #elif HAZ_PASADA == 1
        // VAINA: pesada al rim — se lee hueca alrededor del núcleo
        col = mix(uColBorde, uColMedio, clamp(porRim * 0.55 + veta, 0.0, 1.0));
        col += uColNucleo * veta * 0.9;
        alfa = porRim * 0.9 + 0.15 * mix(0.12, 1.0, porEje) + veta * 0.4;
      #else
        // HALO: solo rim ancho — la atmósfera que el haz empuja
        float ancho = pow(1.0 - cara, 3.2);
        col = mix(uColHalo, uColBorde, ancho);
        alfa = ancho;
      #endif
      // la boca (donde el orbe alimenta la columna) y el frente que viaja
      float boca = smoothstep(0.1, 0.0, vT);
      col += uColNucleo * boca * 1.3;
      alfa += boca * 0.25;
      float frente = smoothstep(uProgreso - 0.12, uProgreso, vT);
      col += uColNucleo * frente * 1.5;
      alfa += frente * 0.2;
      alfa *= dibujado * uFundido * uOpPasada;
      if (alfa < 0.01) discard;
      gl_FragColor = vec4(col, alfa);
    }
  `;
  function crearHazMat(pasada) {
    return new THREE.ShaderMaterial({
      defines: { HAZ_PASADA: pasada },
      vertexShader: HAZ_VERT, fragmentShader: HAZ_FRAG,
      uniforms: {
        uTime: { value: 0 }, uSemilla: { value: 0 },
        uOrigen: { value: new THREE.Vector3() },
        uObjetivo: { value: new THREE.Vector3(0, 0, 1) },
        uLado: { value: new THREE.Vector3(1, 0, 0) },
        uProgreso: { value: 0 }, uFundido: { value: 1 }, uAnchoFundido: { value: 1 },
        uRadio: { value: 0.55 }, uRadioCerca: { value: 0.22 }, uCurvaRadio: { value: 0.7 },
        uEscalaRadio: { value: 1 }, uFlare: { value: 0.9 }, uFlareAncho: { value: 0.2 },
        uLatido: { value: 0.06 }, uLatidoVel: { value: 1.7 }, uVaiven: { value: 0.09 },
        uVetas: { value: 0.85 }, uVetaEscala: { value: 4.5 }, uVetaFlujo: { value: 5.5 },
        uOpPasada: { value: 1 },
        uColNucleo: { value: new THREE.Color(0xfdf8e2) },
        uColMedio: { value: new THREE.Color(0xf0e08a) },
        uColBorde: { value: new THREE.Color(MIEL) },
        uColHalo: { value: new THREE.Color(0x9a8a3a) },
      },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
  }
  const tuboGeo = crearTuboGeo(40, 18);
  const hazPasadas = [crearHazMat(0), crearHazMat(1), crearHazMat(2)].map((mat) => {
    const mesh = new THREE.Mesh(tuboGeo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 7;
    mesh.visible = false;
    grupo.add(mesh);
    return { mesh, mat };
  });

  // el orbe: la carga sentada en la boca antes de soltar (el 4º beat)
  const ORBE_VERT = /* glsl */`
    uniform float uTime, uSemilla, uTurbulencia;
    varying vec3 vNorm;
    varying vec3 vMundoPos;
    varying float vDesplaza;
    ${RUIDO3}
    void main() {
      vec3 np = normal * 2.2 + vec3(uSemilla * 3.1) - vec3(0.0, uTime * 0.8, 0.0);
      float n = fbm3(np) * 1.2 - 0.3;
      vDesplaza = n;
      vec4 mundo = modelMatrix * vec4(position + normal * n * uTurbulencia, 1.0);
      vMundoPos = mundo.xyz;
      vNorm = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * mundo;
    }
  `;
  const ORBE_FRAG = /* glsl */`
    uniform float uTime, uSemilla, uCarga;
    uniform vec3 uColNucleo, uColMedio, uColBorde;
    varying vec3 vNorm;
    varying vec3 vMundoPos;
    varying float vDesplaza;
    ${RUIDO3}
    void main() {
      float cara = abs(dot(normalize(cameraPosition - vMundoPos), normalize(vNorm)));
      float rim = pow(1.0 - cara, 1.8);
      float calor = clamp(vDesplaza * 0.5 + 0.5, 0.0, 1.0);
      // filamentos umbralizados DURO: una banda ancha rellena el orbe y deja
      // de leerse como energía contenida
      float fil = smoothstep(0.72, 0.96,
        ridged3(vNorm * 5.0 + vec3(0.0, uTime * 1.6, 0.0) + uSemilla));
      vec3 col = mix(uColBorde, uColMedio, calor);
      col = mix(col, uColNucleo, clamp(fil + rim * 0.35, 0.0, 1.0));
      float alfa = (0.25 + rim * 0.9 + fil * 0.7) * uCarga;
      if (alfa < 0.01) discard;
      gl_FragColor = vec4(col, alfa);
    }
  `;
  const orbeMat = new THREE.ShaderMaterial({
    vertexShader: ORBE_VERT, fragmentShader: ORBE_FRAG,
    uniforms: {
      uTime: { value: 0 }, uSemilla: { value: 0 }, uCarga: { value: 0 },
      uTurbulencia: { value: 0.24 },
      uColNucleo: { value: new THREE.Color(0xfdf8e2) },
      uColMedio: { value: new THREE.Color(0xf0e08a) },
      uColBorde: { value: new THREE.Color(MIEL) },
    },
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const orbeMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), orbeMat);
  orbeMesh.frustumCulled = false;
  orbeMesh.renderOrder = 7;
  orbeMesh.visible = false;
  grupo.add(orbeMesh);

  const haz = {
    dueno: null,
    tomar(cast, semilla) {
      this.dueno = cast;
      for (const p of hazPasadas) p.mat.uniforms.uSemilla.value = semilla % 97;
      orbeMat.uniforms.uSemilla.value = semilla % 89;
      for (const p of hazPasadas) p.mesh.visible = true;
      orbeMesh.visible = true;
    },
    soltar(cast) {
      if (this.dueno !== cast) return;
      this.dueno = null;
      for (const p of hazPasadas) p.mesh.visible = false;
      orbeMesh.visible = false;
    },
    set(boca, impacto, carga, progreso, fundido) {
      const a = AJUSTES.haz;
      const escalas = [1, a.vainaAncho, a.haloAncho];
      const ops = [1, a.opVaina, a.opHalo];
      for (const [i, p] of hazPasadas.entries()) {
        const u = p.mat.uniforms;
        u.uOrigen.value.set(boca.x, boca.y, boca.z);
        u.uObjetivo.value.set(impacto.x, impacto.y, impacto.z);
        u.uProgreso.value = progreso;
        u.uFundido.value = fundido;
        u.uAnchoFundido.value = 0.4 + 0.6 * fundido;
        u.uRadio.value = a.radio;
        u.uRadioCerca.value = a.radioCerca;
        u.uCurvaRadio.value = a.curvaRadio;
        u.uEscalaRadio.value = escalas[i];
        u.uFlare.value = a.flare;
        u.uFlareAncho.value = a.flareAncho;
        u.uLatido.value = a.latido * quieto;
        u.uLatidoVel.value = a.latidoVel;
        u.uVaiven.value = a.vaiven * (0.4 + 0.6 * quieto);
        u.uVetas.value = a.vetas;
        u.uVetaEscala.value = a.vetaEscala;
        u.uVetaFlujo.value = a.vetaFlujo * (0.25 + 0.75 * quieto);
        u.uOpPasada.value = ops[i];
      }
      orbeMesh.position.set(boca.x, boca.y, boca.z);
      orbeMesh.scale.setScalar(Math.max(0.001, a.orbe * (0.3 + 0.7 * carga)));
      orbeMat.uniforms.uCarga.value = carga * fundido;
      orbeMat.uniforms.uTurbulencia.value = a.orbeTurbulencia * (0.4 + 0.6 * quieto);
    },
  };

  // ── reloj compartido ──────────────────────────────────────────────────────
  const matsConTime = [
    flechaMat, circuloMat, escarchaMat, agujasCampo.mat, esquirlasCampo.mat,
    rayoNucleoMat, rayoHaloMat, quemaduraMat, orbeMat,
    ...hazPasadas.map((p) => p.mat),
  ];
  function tick(t, reducedMotion) {
    tGlobal = t;
    quieto = reducedMotion ? 0 : 1;
    for (const m of matsConTime) m.uniforms.uTime.value = t;
  }

  return {
    grupo, flecha, circulo, hielo, rayo, haz, tick,
    AJUSTES,
    // tripas para sondas: los meshes reales, no adivinanzas
    _interno: {
      flechaMesh, circuloMesh, escarchaMesh, agujasCampo, esquirlasCampo,
      rayoNucleo, rayoHalo, quemaduraMesh, hazPasadas, orbeMesh, hieloRecords,
    },
  };
}
