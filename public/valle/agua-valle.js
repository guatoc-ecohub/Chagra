// ── Agua definitiva del valle ───────────────────────────────────────────────
// La entrada `agua-quebrada-chorrera.html` es la referencia visual aprobada:
// `lib3d/fx/aguaParamo.js` dibuja la quebrada y la chorrera sin física.
// Este adaptador sólo le entrega la geografía real del valle y excava la malla
// anfitriona; la apariencia vive en el módulo canónico, no aquí.
import * as THREE from 'three';
import { height } from './terrain.js';
import { facePos, pathX, T_NACE } from './cliff.js';
import {
  crearQuebrada,
  crearChorrera,
  crearHelechosRibera,
} from './lib3d/fx/aguaParamo.js';
import { crearBrumaVolumetrica } from './lib3d/fx/brumaVolumetrica.js';

const PIE_T = 0.12;

// ── EL POZO CRISTALINO (la MEJOR agua que teníamos y que nunca se había
// puesto en ESTA cascada): cáusticas tipo navis — dos redes refractadas,
// móviles pero suaves — más ondas concéntricas del golpe y espuma viva.
// Extraído VERBATIM del pozo canónico de `waterfalls.js` (el mismo que el kart
// reusa), para no reinventarlo. Un plano horizontal + shader: barato, sin física.
const POZO_VERT = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const POZO_FRAG = /* glsl */`
  uniform float uTime;
  varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
               mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
  }
  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p) * 2.0;
    vec2 foco = vec2(0.0, 0.30);            // el golpe del velo, contra la pared
    float df = length(p - foco) * 2.0;
    // agua cristalina: honda y verde-azul en el golpe, clara hacia la orilla
    vec3 col = mix(vec3(0.07, 0.17, 0.16), vec3(0.20, 0.34, 0.30), smoothstep(0.15, 1.0, r));
    // ondas concéntricas que nacen en el golpe y mueren en la orilla
    float rip = sin(df * 20.0 - uTime * 2.4) * 0.5 + 0.5;
    col += vec3(0.10, 0.12, 0.12) * rip * exp(-df * 1.8);
    // cáusticas tipo navis: dos redes refractadas, móviles pero suaves, para
    // que cada poza lea como agua y no como una mancha plana de color.
    float ca1 = noise(p * 15.0 + vec2(uTime * 0.35, -uTime * 0.22));
    float ca2 = noise(p * 27.0 + vec2(-uTime * 0.18, uTime * 0.31));
    float caust = smoothstep(0.60, 0.86, ca1 * 0.62 + ca2 * 0.38) * (1.0 - smoothstep(0.72, 1.0, r));
    col += vec3(0.20, 0.35, 0.30) * caust * 0.42;
    // ESPUMA: mancha blanca VIVA del impacto + motas que derivan girando
    float nf = noise(vec2(df * 5.0 - uTime * 0.7, atan(p.y - foco.y, p.x - foco.x) * 1.6 + uTime * 0.15));
    float foam = smoothstep(0.62, 0.10, df) * (0.50 + 0.50 * nf);
    foam = max(foam, smoothstep(0.80, 0.97, rip) * exp(-df * 1.4) * 0.55);
    col = mix(col, vec3(1.02, 1.02, 0.98), clamp(foam, 0.0, 1.0));
    float alpha = (1.0 - smoothstep(0.80, 1.0, r)) * 0.92;
    gl_FragColor = vec4(col, alpha);
  }
`;

function excavarQuebrada(scene, quebrada) {
  const prof = quebrada?.profundidadEn;
  if (!prof) return;

  let terreno = null;
  scene.traverse((o) => {
    if (!terreno && o.isMesh && o.geometry?.attributes?.position
        && o.geometry.attributes.position.count > 50000) terreno = o;
  });
  if (!terreno) return;

  const pos = terreno.geometry.attributes.position;
  const arr = pos.array;
  for (let i = 0; i < arr.length; i += 3) {
    const x = arr[i], z = arr[i + 2];
    // La quebrada corre aguas abajo de La Chorrera; este margen evita revisar
    // la malla completa y deja intactas las otras laderas del valle.
    if (z < -900 || z > 360 || x < -190 || x > 190) continue;
    const zanja = prof(x, z);
    if (zanja > 0.001) arr[i + 1] -= zanja;
  }
  pos.needsUpdate = true;
  terreno.geometry.computeVertexNormals();
}

function materialesDe(grupo) {
  const mats = [];
  grupo.traverse((o) => {
    const material = o.material;
    if (Array.isArray(material)) {
      for (const m of material) if (m && !mats.includes(m)) mats.push(m);
    } else if (material && !mats.includes(material)) mats.push(material);
  });
  return mats;
}

export function makeWaterfalls(scene, { seed = 20260811 } = {}) {
  const sol = new THREE.Vector3(0.62, 0.15, 0.60).normalize();
  const topX = pathX(T_NACE);
  const bottomX = pathX(PIE_T);
  const top = facePos(topX, T_NACE);
  const bottom = facePos(bottomX, PIE_T);
  const alto = top.y - bottom.y;
  // ── El perfil de la pared REAL, invertido por ALTURA (como la referencia
  // aprobada `agua-quebrada-chorrera.html`). `crearChorrera` baja la caída con
  // y = alto·t LINEAL, así que caraEn(t) tiene que devolver DÓNDE está el
  // escarpe a esa altura — no el punto de la ruta al parámetro t. Sin esta
  // inversión el agua se despegaba del relieve en el tramo bajo (suave) y
  // quedaba TENDIDA sobre el valle en un rampón de ~48° en vez de abrazar el
  // escarpe: la «cascada descuadrada» que reportó el operador. Se muestrea el
  // terreno real por facePos/pathX y se interpola por altura.
  const PERFIL = [];
  for (let i = 0; i <= 180; i++) {
    const tc = PIE_T + (T_NACE - PIE_T) * (i / 180);
    const x = pathX(tc);
    const p = facePos(x, tc);
    PERFIL.push({ x, z: p.z - bottom.z, y: p.y });   // y = altura MUNDO del escarpe
  }
  const perfil = (t) => {
    const yw = bottom.y + alto * t;                  // altura MUNDO del agua a ese t
    let i = 0;
    while (i < PERFIL.length - 1 && PERFIL[i + 1].y < yw) i++;
    const a = PERFIL[i];
    const b = PERFIL[Math.min(i + 1, PERFIL.length - 1)];
    const f = a.y >= b.y ? 0 : Math.min(1, Math.max(0, (yw - a.y) / (b.y - a.y)));
    // el agua corre APENAS por delante de la roca (evita z-fighting con el
    // relieve excavado) — igual que el +0,35 de la referencia
    return { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f + 0.6 };
  };

  // Una sola caída, con tres repisas y pozo, como en la entrada definitiva.
  const chorrera = crearChorrera(THREE, {
    alto,
    ancho: 5.0,      // el «hilo fino» leía como un rasguño; La Chorrera es una
                     // caída con cuerpo — más lámina para que se lea como agua
    saltos: 3,
    deriva: 0,
    caraEn: perfil,
    pozo: 6.4,       // olla más ancha, a juego con el pozo cristalino de abajo
    gotas: 42,       // más cortina de gotas: presencia y bruma de contacto
    calidad: 'alta',
    seed: seed + 3,
    solDir: sol,
  });
  chorrera.grupo.position.set(0, bottom.y, bottom.z);
  scene.add(chorrera.grupo);

  // El pozo cristalino de cáusticas navis, posado en el pie REAL de la caída
  // (donde el velo golpea la olla). Horizontal, apenas por encima del relieve.
  const pieBase = facePos(pathX(PIE_T), PIE_T);
  const poolGeo = new THREE.CircleGeometry(1, 28);
  poolGeo.rotateX(-Math.PI / 2);                // uv.y=1 → -z (el golpe, contra la pared)
  const poolMat = new THREE.ShaderMaterial({
    vertexShader: POZO_VERT, fragmentShader: POZO_FRAG,
    uniforms: { uTime: { value: 0 } },
    transparent: true, depthWrite: false,
  });
  const pozoCristalino = new THREE.Mesh(poolGeo, poolMat);
  pozoCristalino.name = 'chorrera-pozo-cristalino';
  pozoCristalino.scale.set(7.2, 1, 5.6);        // a la escala del pozo de aguaParamo (~5.2)
  pozoCristalino.position.set(pieBase.x, pieBase.y + 0.12, pieBase.z + 5.0);
  pozoCristalino.renderOrder = 3;
  scene.add(pozoCristalino);

  // El curso continúa desde el pie de la caída hacia el valle. Los puntos
  // son XZ del anfitrión; la altura y la zanja las resuelve aguaParamo.
  const quebradaPuntos = [
    { x: bottomX, z: bottom.z + 10 },
    { x: bottomX + 12, z: bottom.z + 62 },
    { x: bottomX - 8, z: bottom.z + 145 },
    { x: bottomX + 18, z: bottom.z + 245 },
    { x: bottomX - 10, z: bottom.z + 360 },
    { x: bottomX + 5, z: bottom.z + 500 },
  ];
  const quebrada = crearQuebrada(THREE, {
    puntos: quebradaPuntos,
    alturaEn: (x, z) => height(x, z),
    ancho: 3.5,
    hundir: 0.7,
    piedras: 20,
    chispas: 60,
    seed: seed + 7,
    solDir: sol,
    muestras: 170,
  });
  scene.add(quebrada.grupo);
  excavarQuebrada(scene, quebrada);

  const helechos = crearHelechosRibera(THREE, {
    puntos: quebradaPuntos,
    alturaEn: (x, z) => height(x, z),
    n: 28,
    seed: 977,
    aparte: 9,
  });
  scene.add(helechos.grupo);

  const anclas = chorrera.anclasBruma.map((a) => ({
    x: a.x,
    y: bottom.y + a.y - 0.5,
    z: bottom.z + a.z,
  }));
  const bruma = crearBrumaVolumetrica(THREE, {
    puntos: anclas,
    jirones: 56,
    haces: 0,
    seed: seed + 47,
    dispersion: 3.0,
    solDir: sol,
    color: 0xe6efec,
    intensidad: 1,
    cerca: [8, 24],
    lejos: [260, 620],
  });
  scene.add(bruma.grupo);

  let ultimoT = null;
  return {
    update(t) {
      const dt = ultimoT == null ? 0 : Math.max(0, Math.min(0.05, t - ultimoT));
      ultimoT = t;
      quebrada.tick(dt);
      chorrera.tick(dt);
      bruma.tick(dt);
      poolMat.uniforms.uTime.value = t;   // cáusticas navis del pozo cristalino
      // El reloj global de viento ya avanza una vez por frame en main.js.
    },
    mats: materialesDe(chorrera.grupo),
    quebrada,
    chorrera,
    pozoCristalino,
    helechos,
    bruma,
  };
}
