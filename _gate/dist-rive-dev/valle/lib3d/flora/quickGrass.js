// ── quickGrass.js — pasto de MASA (pala curva multi-segmento en el VERTEX SHADER)
// ─────────────────────────────────────────────────────────────────────────────
// Vendorización del patrón **Quick_Grass** (simondevyoutube/Quick_Grass, MIT),
// que a su vez es la técnica de gramínea de Ghost of Tsushima (GDC "Procedural
// Grass in Ghost of Tsushima", Eric Wohllaib): cada brizna NO es un modelo, es
// un QUAD de N segmentos verticales cuya silueta se construye ENTERAMENTE en el
// vertex shader —
//   · el ancho se AFINA hacia la punta (pala, no palito),
//   · la brizna se DOBLA (curva de pandeo) con un hash por-brizna (lean),
//   · el viento la mece con una onda que crece hacia la punta (base clavada),
//   · orientación / altura / tono varían por-brizna vía hash (nada de clones).
// Resultado: MASA de gramínea que se mece — no ConeGeometry, no cartelitos, no
// low-poly contable. A distancia lee como manto de pasto; de cerca, briznas.
//
// Compatibilidad: three r160, WebGL clásico (NO WebGPU/TSL). Cero binarios: la
// geometría base (un quad de N segmentos, replicado B veces por parche) se
// genera en JS; toda la forma/curva/viento vive en GLSL vía ShaderMaterial.
// Un parche = 1 InstancedMesh = 1 draw call, con miles de briznas dentro.
//
// Viento COMPARTIDO: usa el mismo reloj global `uTiempoVM` de vientoMundos.js
// (por referencia), así el pasto se mece con la MISMA ráfaga que menea las
// copas de los árboles. Si nadie más avanza ese reloj (p.ej. el valle principal
// tiene su propio loop y no llama tickVientoMundos), este módulo lo auto-avanza
// con un rAF idempotente para que el pasto NUNCA quede clavado (= pasto muerto).
//
// VIENTO COHERENTE + BACKLIGHT (A3, 2026-08-11): modo opcional `vientoCoherente`
// adaptado de three-stylized (Steve245270533, MIT; vía cortiz2894/
// stylized-components, MIT — cadena de licencia verificada). Tres robos:
//   · la onda del viento viaja por el MUNDO (fase = posición mundial de la mata,
//     misma dirección/frecuencia/turbulencia que las copas vía uDirVM/uFrecVM/
//     uTurbVM de vientoMundos) y se PROYECTA sobre los ejes de la instancia —
//     sin la proyección, cada brizna (giro Y aleatorio + escala no uniforme) se
//     mueve para su lado y el campo tiembla como estática;
//   · difuso ANTI-SHIMMER aplanado al vector up — con la normal real cada cinta
//     agarra un valor distinto y el campo titila al mover la cámara;
//   · BACKLIGHT de 3 factores (viewToSun × edgeOn × thinTip) = subsurface
//     scattering aproximado sin costo real, con dirección de sol propia
//     (uSolDir) como el aplicarBacklight de FollajeMasa.
// El bloque getShadow/shadowIntensity del original es r185 y NO compila en r160:
// no se porta (este pasto no proyecta sombra y el valle no tiene shadow map).
// El modo legacy (sin `vientoCoherente`) queda INTACTO: el pajonal del páramo
// (matrizParamo) tiene gate humano cerrado y calibración propia — no se toca.
//
// API:
//   crearParchePasto(scene, opts) → { mesh, dispose }
//     opts.puntos     [{x,y,z}]  centros de macolla (dónde nace cada mata)
//     opts.densidad   int        briznas por punto (def 8) → mata, no palito suelto
//     opts.densidadEn fn(pt, pi) briznas POR PUNTO (sobrescribe `densidad` cuando
//                                viene): ralea la mata en los puntos donde el
//                                terreno pide menos pasto (suelo pelado).
//                                El total se calcula como la SUMA, no count*densidad.
//     opts.radio      m          dispersión de las briznas alrededor del punto (def 0.55)
//     opts.altura     [min,max]  alto de brizna en metros (def [0.28, 0.6])
//     opts.ancho      m          ancho de brizna en la base (def 0.035)
//     opts.segmentos  int        segmentos verticales del quad (def 5) → curva suave
//     opts.colorBase  hex/str    verde base del pasto
//     opts.colorPunta hex/str    tono de la punta (más claro/seco) — degradado base→punta
//     opts.tinteJitter 0..1      variación de tono por-brizna (def 0.12)
//     opts.viento     0..1       intensidad de meneo (def 1.0)
//     opts.combado    0..1       cuánto se dobla la brizna en reposo (def 0.35)
//     opts.name       string     nombre del mesh (para poder apagarlo desde otro módulo)
//     ── modo coherente (A3; sin estas opts el shader legacy no cambia) ──
//     opts.vientoCoherente bool  onda MUNDO proyectada a ejes de instancia (def false)
//     opts.vientoAmp  m          amplitud del meneo EN METROS de mundo en la punta
//                                (def 0.12) — independiente del ancho de brizna
//                                (el legacy escala el arco por `ancho`, ver nota
//                                de calibración en matrizParamo.js)
//     opts.vientoVel  rad/s      velocidad de la onda primaria (def 1.2)
//     opts.backlight  0..1       fuerza del backlight 3-factores (def 0 = apagado)
//     opts.backlightColor hex    color del sol a través de la hoja (def colorPunta)
//     opts.backlightDir [x,y,z]  dirección MUNDO hacia el sol (def uLuzDir)
//     opts.semilla    int        baraja determinista del parche (def 0 = layout actual)
//     opts.cobertura  obj        raleo por máscara: { muestra(pt,pi)→0..1,
//                                umbral (def 0), potencia (def 1) } — `umbral` NO
//                                es corte binario: lo que queda se REMAPEA a 0..1
//                                con ((v−u)/(1−u))^potencia y multiplica la
//                                densidad del punto (caminos = raleo suave)
//
import * as THREE from 'three';
import { uniformesVientoMundo, asegurarRelojViento } from './vientoMundos.js';

// El auto-tick idempotente del reloj de viento (antes definido acá) subió a
// vientoMundos.js como `asegurarRelojViento` para que TODA la flora lo
// comparta (frailejones incluidos), no solo el pasto.

// ── geometría base: un quad de N segmentos (2·N triángulos), plano en el YZ→XY
// del espacio local de la brizna. La forma final (afinado + curva) la impone el
// vertex shader usando aParam (u a lo ancho ∈ {0,1}, v a lo alto ∈ [0,1]).
function geoBrizna(segmentos) {
  const filas = segmentos + 1;
  const pos = [];
  const param = []; // (u, v): u = lado (0 izq, 1 der), v = altura normalizada
  for (let i = 0; i < filas; i++) {
    const v = i / segmentos;
    // posición base (el shader la reescribe casi entera; damos algo razonable
    // por si el shader fallara al compilar: una tira vertical fina)
    pos.push(-0.5, v, 0, 0.5, v, 0);
    param.push(0, v, 1, v);
  }
  const idx = [];
  for (let i = 0; i < segmentos; i++) {
    const a = i * 2, b = i * 2 + 1, c = (i + 1) * 2, d = (i + 1) * 2 + 1;
    // dos triángulos por segmento (quad), doble cara la maneja el material
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aParam', new THREE.Float32BufferAttribute(param, 2));
  g.setIndex(idx);
  return g;
}

// hash barato determinista → [0,1) a partir de un entero (mezcla xorshift)
function hash01(n) {
  let h = (n | 0) ^ 0x9e3779b1;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function crearParchePasto(scene, opts = {}) {
  const {
    puntos = [],
    densidad = 8,
    densidadEn = null,
    radio = 0.55,
    altura = [0.28, 0.6],
    ancho = 0.035,
    segmentos = 5,
    colorBase = '#3f6a2c',
    colorPunta = '#8faa4f',
    tinteJitter = 0.12,
    viento = 1.0,
    combado = 0.35,
    name = 'pasto-masa',
    vientoCoherente = false,
    vientoAmp = 0.12,
    vientoVel = 1.2,
    backlight = 0,
    backlightColor = null,
    backlightDir = null,
    semilla = 0,
    cobertura = null,
  } = opts;

  if (!puntos.length) return { mesh: null, dispose() {} };
  asegurarRelojViento();

  // cobertura → factor 0..1 por punto. `umbral` remapea lo que queda a 0..1
  // (no es corte binario): fade suave hacia el camino, no borde de alfombra.
  const cobEn = cobertura && typeof cobertura.muestra === 'function'
    ? (pt, pi) => {
        const u = cobertura.umbral ?? 0;
        const p = cobertura.potencia ?? 1;
        const v = Math.min(1, Math.max(0, cobertura.muestra(pt, pi)));
        if (v <= u) return 0;
        return Math.pow((v - u) / Math.max(1e-6, 1 - u), p);
      }
    : null;
  const porPunto = puntos.map((pt, pi) => {
    const base = densidadEn ? Math.max(0, Math.round(densidadEn(pt, pi)) || 0) : densidad;
    return cobEn ? Math.max(0, Math.round(base * cobEn(pt, pi))) : base;
  });
  const total = porPunto.reduce((a, b) => a + b, 0);
  if (total === 0) return { mesh: null, dispose() {} };
  const geo = geoBrizna(segmentos);

  // atributos por-brizna (instanceados): posición (via instanceMatrix), y un
  // vec4 de hash (aBrizna): x=fase viento, y=alto (0..1 sobre rango), z=lean
  // (dirección+fuerza de combado), w=tono jitter.
  const mesh = new THREE.InstancedMesh(geo, null, total); // material abajo
  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _p = new THREE.Vector3();
  const _s = new THREE.Vector3();
  const eje = new THREE.Vector3(0, 1, 0);
  const briznaData = new Float32Array(total * 4);

  let k = 0;
  const [hMin, hMax] = altura;
  // semilla del parche mezclada al hash por-brizna: mismo `semilla` = mismo
  // parche (determinista); semilla=0 → XOR nulo = layout idéntico al histórico.
  const sMix = semilla ? (Math.imul(semilla | 0, 2654435761) | 0) : 0;
  for (let pi = 0; pi < puntos.length; pi++) {
    const pt = puntos[pi];
    const nBriznas = porPunto[pi];
    for (let b = 0; b < nBriznas; b++, k++) {
      const seed = pi * 131 + b * 17 + 1;
      const r0 = hash01((seed * 3 + 1) ^ sMix);
      const r1 = hash01((seed * 5 + 7) ^ sMix);
      const r2 = hash01((seed * 7 + 3) ^ sMix);
      const r3 = hash01((seed * 11 + 9) ^ sMix);
      const r4 = hash01((seed * 13 + 5) ^ sMix);
      // dispersión en disco alrededor del centro de la macolla
      const ang = r0 * Math.PI * 2;
      const rad = Math.sqrt(r1) * radio;
      const bx = pt.x + Math.cos(ang) * rad;
      const bz = pt.z + Math.sin(ang) * rad;
      const by = (pt.y ?? 0);
      // giro Y de la brizna (hacia dónde "mira" la pala)
      _q.setFromAxisAngle(eje, r2 * Math.PI * 2);
      const alto = hMin + r3 * (hMax - hMin);
      // escala: X = ancho de la pala en la base, Y = alto, Z se usa como espesor
      // mínimo (evita z-fight; el grosor real lo da el afinado del shader)
      _s.set(ancho, alto, ancho);
      _p.set(bx, by, bz);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(k, _m);
      // aBrizna: fase, altoNorm, lean, tono
      briznaData[k * 4 + 0] = r4;                 // fase de viento por-brizna
      briznaData[k * 4 + 1] = r3;                 // alto normalizado (0..1)
      briznaData[k * 4 + 2] = (r0 - 0.5) * 2.0;   // lean [-1,1] dirección de combado
      briznaData[k * 4 + 3] = (r1 - 0.5) * 2.0;   // tono jitter [-1,1]
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  geo.setAttribute('aBrizna', new THREE.InstancedBufferAttribute(briznaData, 4));

  // ── material: ShaderMaterial GLSL clásico (r160). Construye la pala curva en
  // el vertex shader (afinado + combado + viento) y colorea con degradado
  // base→punta + jitter + un lambert barato para que reciba la luz del sol.
  const uniforms = {
    uTiempoVM: uniformesVientoMundo.uTiempoVM,   // reloj global compartido (por ref)
    uFuerzaVM: uniformesVientoMundo.uFuerzaVM,   // ráfaga global compartida (por ref)
    uViento: { value: viento },
    uCombado: { value: combado },
    uTinte: { value: tinteJitter },
    uColBase: { value: new THREE.Color(colorBase) },
    uColPunta: { value: new THREE.Color(colorPunta) },
    uLuzDir: { value: new THREE.Vector3(0.4, 0.85, 0.35).normalize() },
    uAmbiente: { value: 0.45 },
  };
  if (vientoCoherente) {
    // dirección/frecuencia/turbulencia COMPARTIDAS por referencia con las copas
    // (vientoMundos): pasto y árboles ondulan bajo el MISMO campo de viento.
    uniforms.uDirVM = uniformesVientoMundo.uDirVM;
    uniforms.uFrecVM = uniformesVientoMundo.uFrecVM;
    uniforms.uTurbVM = uniformesVientoMundo.uTurbVM;
    uniforms.uVelPasto = { value: vientoVel };
    uniforms.uAmpPasto = { value: vientoAmp };
    uniforms.uBacklight = { value: backlight };
    uniforms.uBacklightCol = { value: new THREE.Color(backlightColor || colorPunta) };
    uniforms.uSolDir = {
      value: backlightDir
        ? new THREE.Vector3(backlightDir[0], backlightDir[1], backlightDir[2]).normalize()
        : uniforms.uLuzDir.value.clone(),
    };
  }

  // ── chunks por modo: el legacy queda IDÉNTICO (mismo string → mismo programa
  // compilado para el páramo); el coherente es el robo three-stylized (MIT).
  const declVertCoherente = /* glsl */`
    uniform vec2 uDirVM;
    uniform float uFrecVM, uTurbVM, uVelPasto, uAmpPasto;
    varying vec3 vWorldPos;`;

  const vientoLegacy = /* glsl */`
      // VIENTO: onda que crece hacia la punta (base clavada). Fase por-brizna +
      // posición de la instancia → cada mata ondula distinto pero con la MISMA
      // ráfaga global. Dos ondas co-primas = respiración (calmas y vendavales).
      vec3 oInst = instanceMatrix[3].xyz;
      float fase = aBrizna.x * 6.283 + oInst.x * 0.15 + oInst.z * 0.11;
      float t = uTiempoVM;
      float onda = sin(t * 1.6 + fase) + 0.4 * sin(t * 3.1 + fase * 1.7);
      float meneo = uViento * uFuerzaVM * onda * v * v * 0.18;

      // z local = combado en reposo + meneo del viento (ambos crecen con v²)
      float z = curva + meneo;
      // leve barrido lateral del viento también, para que no sea puro cabeceo
      x += meneo * 0.35 * sign(lean + 0.001);

      vec3 posL = vec3(x, v, z);`;

  const vientoCoherenteGLSL = /* glsl */`
      // VIENTO COHERENTE (three-stylized, MIT): la onda viaja por el MUNDO — su
      // fase es la posición MUNDIAL de la mata, con la MISMA dirección/frecuencia/
      // turbulencia que las copas (uDirVM/uFrecVM/uTurbVM por referencia), así
      // pasto y árboles ondulan bajo un solo campo de viento, no ruido por-hoja.
      vec3 oInst = instanceMatrix[3].xyz;
      vec3 mInst = (modelMatrix * vec4(oInst, 1.0)).xyz;
      vec2 dirW = normalize(uDirVM);
      vec2 perpW = vec2(-dirW.y, dirW.x);
      // detalle por-brizna PEQUEÑO sobre la fase (la mata no marcha en formación)
      float fase = aBrizna.x * 0.9;
      // dos ondas co-primas: la secundaria perpendicular a 1.7× la frecuencia y
      // 0.73× la velocidad — el patrón no se repite a la vista.
      float ondaP = sin(dot(mInst.xz, dirW) * uFrecVM + uTiempoVM * uVelPasto + fase);
      float ondaS = sin(dot(mInst.xz, perpW) * uFrecVM * 1.7 + uTiempoVM * uVelPasto * 0.73 + fase) * uTurbVM;
      vec3 vientoW = vec3(dirW.x, 0.0, dirW.y) * (ondaP + ondaS);
      // PROYECCIÓN del viento mundial a los EJES de la instancia (giro Y
      // aleatorio + escala no uniforme ancho/alto/ancho): sin esto cada brizna
      // se mueve para su lado y el campo tiembla como estática. Al transformar
      // de vuelta, el desplazamiento reproduce el viento EN METROS de mundo,
      // independiente del ancho de la brizna (el legacy escala el arco por el
      // ancho de la pala — ver la nota de calibración en matrizParamo.js).
      mat3 ejes = mat3(modelMatrix * instanceMatrix);
      vec3 vientoL = vec3(
        dot(vientoW, ejes[0]) / max(dot(ejes[0], ejes[0]), 1e-5),
        dot(vientoW, ejes[1]) / max(dot(ejes[1], ejes[1]), 1e-5),
        dot(vientoW, ejes[2]) / max(dot(ejes[2], ejes[2]), 1e-5));
      // base clavada, punta doblada: el meneo crece con v² (tipMask cuadrático)
      vec3 posL = vec3(x, v, curva) + vientoL * (uAmpPasto * uViento * uFuerzaVM * v * v);`;

  const vert = /* glsl */`
    attribute vec2 aParam;    // (u lado 0/1, v altura 0..1)
    attribute vec4 aBrizna;   // (fase, altoNorm, lean, tono)
    uniform float uTiempoVM, uFuerzaVM, uViento, uCombado;
    varying vec2 vParam;
    varying float vTono;
    varying vec3 vNormalW;${vientoCoherente ? declVertCoherente : ''}

    void main() {
      vParam = aParam;
      vTono = aBrizna.w;

      float v = aParam.y;            // 0 base → 1 punta
      float lado = aParam.x - 0.5;   // -0.5 .. 0.5

      // AFINADO: el ancho cae hacia la punta (pala lanceolada, no palito).
      // curva suave para que la punta no sea un pico agudo.
      float anchoV = (1.0 - v) * (1.0 - v * 0.35);
      float x = lado * anchoV;

      // COMBADO en reposo: la brizna se dobla hacia adelante (Z local) creciendo
      // con la altura² (rígida abajo, floja arriba). lean por-brizna da fuerza+lado.
      float lean = aBrizna.z;
      float curva = uCombado * (0.6 + abs(lean)) * v * v;

${vientoCoherente ? vientoCoherenteGLSL : vientoLegacy}

      // normal aproximada de la pala (mira +Z local, se inclina con el combado).
      // suficiente para un lambert suave; el look es ilustrado, no PBR fino.
      vec3 nL = normalize(vec3(lado * 0.3, 0.15 + curva, 1.0));

      vec4 world = modelMatrix * instanceMatrix * vec4(posL, 1.0);${vientoCoherente ? '\n      vWorldPos = world.xyz;' : ''}
      vNormalW = normalize(mat3(modelMatrix * instanceMatrix) * nL);
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `;

  const luzLegacy = /* glsl */`
      // lambert suave (dos caras: usamos abs del dot para que la cara trasera
      // no quede negra — el pasto se ve desde cualquier lado)
      vec3 N = normalize(vNormalW);
      float diff = abs(dot(N, normalize(uLuzDir)));
      float luz = uAmbiente + (1.0 - uAmbiente) * diff;
      gl_FragColor = vec4(col * luz, 1.0);`;

  const luzCoherente = /* glsl */`
      vec3 N = normalize(vNormalW);
      // ANTI-SHIMMER (three-stylized): difuso aplanado al vector UP — con la
      // normal real cada cinta agarra un valor distinto y el campo TITILA al
      // mover la cámara. Estabilidad > realismo en un look estilizado; la
      // variación de tono la ponen el degradado, el jitter y el backlight.
      float diff = 0.35 + 0.65 * max(dot(vec3(0.0, 1.0, 0.0), normalize(uLuzDir)), 0.0);
      float luz = uAmbiente + (1.0 - uAmbiente) * diff;
      vec3 colorFinal = col * luz;
      // BACKLIGHT 3 FACTORES (three-stylized): el sol se siente ATRAVESANDO la
      // hoja cuando (1) la cámara mira hacia el sol a través de ella (viewToSun),
      // (2) la hoja está de canto frente a la luz (edgeOn) y (3) la punta es más
      // delgada que la base (thinTip). Subsurface scattering aproximado, gratis.
      vec3 haciaSol = normalize(uSolDir);
      vec3 vDir = normalize(vWorldPos - cameraPosition);
      float viewToSun = pow(max(dot(vDir, haciaSol), 0.0), 2.0);
      float edgeOn = 1.0 - abs(dot(N, haciaSol));
      float thinTip = vParam.y;
      colorFinal += uBacklightCol * (viewToSun * edgeOn * thinTip) * uBacklight;
      gl_FragColor = vec4(colorFinal, 1.0);`;

  const frag = /* glsl */`
    precision mediump float;
    uniform vec3 uColBase, uColPunta, uLuzDir;
    uniform float uTinte, uAmbiente;
    varying vec2 vParam;
    varying float vTono;
    varying vec3 vNormalW;${vientoCoherente ? /* glsl */`
    uniform vec3 uBacklightCol, uSolDir;
    uniform float uBacklight;
    varying vec3 vWorldPos;` : ''}

    void main() {
      // degradado base(oscuro, húmedo) → punta(claro, seca)
      vec3 col = mix(uColBase, uColPunta, smoothstep(0.15, 1.0, vParam.y));
      // jitter de tono por-brizna (variación de mata a mata)
      col *= 1.0 + vTono * uTinte;
      // oscurecer un pelín la base para dar volumen a la mata (AO fake)
      col *= mix(0.72, 1.0, vParam.y);
${vientoCoherente ? luzCoherente : luzLegacy}
      #include <colorspace_fragment>
    }
  `;

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: vert,
    fragmentShader: frag,
    side: THREE.DoubleSide,
  });
  mesh.material = mat;
  mesh.name = name;
  mesh.castShadow = false;      // el pasto no proyecta sombras (barato + limpio)
  mesh.receiveShadow = true;
  mesh.frustumCulled = true;

  scene.add(mesh);
  return {
    mesh,
    dispose() {
      scene.remove(mesh);
      geo.dispose();
      mat.dispose();
    },
  };
}
