// ── obstaculos-mar.js — obstáculos JUGABLES del circuito marino ──────────────
// El brief lo dice sin vueltas: la versión del mar cargaba pero tenía CERO
// obstáculos — no había reto. Este módulo pone reto de verdad:
//   · ROCAS DE MAREA dentro del corredor (arte real de mar-biodiversidad, nada
//     low-poly): estáticas, hay que esquivarlas o comerse el golpe.
//   · TRONCOS A LA DERIVA cruzados en la vía: bobean con la MISMA ola visual
//     (olaAltura) y se pueden SALTAR — el apex del salto (≈2.3 m) supera el
//     corte de colisión por altura (1.6 m), así que el botón de salto pasa a
//     ser una herramienta de esquive real, con la física que ya existía.
// La colisión NO se inventa aquí: los obstáculos entran como cuerpos ESTÁTICOS
// al mismo resolverTodos() de colision.js (SAT + impulsos) que ya resuelve
// kart-contra-kart — mismo feedback (VFX de golpe, sfx, sacudón) sin una línea
// nueva de física. Los rivales también chocan con ellos y su resorte de carril
// los recupera: esquivar mejor que la IA es parte del juego.
// Determinista por seed (el gate compara capturas).

import { geoRocaMarina, materialRoca, fusionarConColor } from './mar-biodiversidad.js';
import { olaAltura } from './mar/mar-capa.js';

function rand(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// tronco a la deriva: cilindro con corteza por vértice + muñones de rama.
// Suave (12 lados, sin flatShading) — un tronco mojado, no un prisma.
function geoTronco(THREE, seed = 1) {
  const rn = rand(seed * 2861 + 3);
  const largo = 3.4;
  const geos = [];
  const cuerpo = new THREE.CylinderGeometry(0.26, 0.31, largo, 12, 4);
  cuerpo.rotateZ(Math.PI / 2);                 // eje largo en X (marco local)
  geos.push(cuerpo);
  for (let b = 0; b < 3; b++) {
    const munon = new THREE.CylinderGeometry(0.06, 0.10, 0.35 + rn() * 0.3, 8);
    const ang = rn() * Math.PI * 2;
    munon.rotateX(ang);
    munon.translate((rn() - 0.5) * largo * 0.7, Math.sin(ang) * 0.28, Math.cos(ang) * 0.28);
    geos.push(munon);
  }
  // corteza: pardo con vetas más claras hacia los extremos. Vía THREE.Color
  // (setHex convierte sRGB→lineal): escribir floats crudos en el atributo los
  // dejaba en lineal y el tronco salía beige pálido, no madera mojada.
  const cCorteza = new THREE.Color(0x4a3826);
  const cClara = new THREE.Color(0x7a5f42);
  const _c = new THREE.Color();
  for (const g of geos) {
    const p = g.attributes.position;
    const col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const t = Math.abs(p.getX(i)) / (largo / 2);
      const veta = (Math.sin(p.getX(i) * 9 + seed) * 0.5 + 0.5) * 0.25;
      _c.copy(cCorteza).lerp(cClara, t * 0.4 + veta);
      col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  return fusionarConColor(THREE, geos);   // expande indexadas por su cuenta
}

export function crearObstaculosMar(THREE, pista, cfg = {}) {
  const { W, ZON, n } = pista;
  const rn = rand(cfg.seed ?? 20260830);
  const grupo = new THREE.Group();

  // ── colocación determinista ────────────────────────────────────────────────
  // Franjas de f repartidas por la vuelta, esquivando la meta (f<0.03) y las
  // cajas de ítem (f=(i+0.35)/N_CAJAS). El lat deja SIEMPRE línea de carrera:
  // el obstáculo ocupa un lado (0.22–0.55 del semiancho), nunca el centro
  // entero — esquivar es leer la pista, no adivinar.
  const F_CAJAS = [];
  for (let i = 0; i < 10; i++) F_CAJAS.push((i + 0.35) / 10);
  const lejosDeCajas = (f) => F_CAJAS.every((fc) => {
    const d = Math.abs(f - fc);
    return Math.min(d, 1 - d) > 0.022;
  });

  const lista = [];
  const slots = [
    // f aproximado, tipo (r=roca, t=tronco)
    [0.045, 'r'], [0.095, 'r'], [0.145, 't'], [0.205, 'r'], [0.262, 'r'],
    [0.335, 't'], [0.392, 'r'], [0.465, 'r'], [0.522, 't'], [0.585, 'r'],
    [0.648, 'r'], [0.715, 't'], [0.782, 'r'], [0.845, 'r'], [0.905, 't'], [0.955, 'r'],
  ];
  for (const [fBase, tipo] of slots) {
    let f = fBase + (rn() - 0.5) * 0.012;
    if (!lejosDeCajas(f)) f = fBase + 0.028;
    if (f < 0.03 || f > 0.975) continue;
    const i = Math.floor(((f % 1) + 1) % 1 * n) % n;
    const lado = lista.length % 2 ? 1 : -1;
    const p = pista.puntoEn(f);
    const info = pista.infoLocal(p.x, p.z);
    const nx = Math.sin(info.hdg), nz = -Math.cos(info.hdg);
    if (tipo === 'r') {
      const lat = (0.26 + rn() * 0.26) * W[i] * lado;
      const esc = 0.95 + rn() * 0.75;
      lista.push({
        tipo: 'roca', x: p.x + nx * lat, z: p.z + nz * lat,
        hdg: rn() * Math.PI * 2, esc,
        hl: esc * 0.78, hw: esc * 0.7,
      });
    } else {
      // tronco: cruzado a la vía (± un poco), del lado contrario al último
      const lat = (0.05 + rn() * 0.24) * W[i] * lado;
      lista.push({
        tipo: 'tronco', x: p.x + nx * lat, z: p.z + nz * lat,
        hdg: info.hdg + Math.PI / 2 + (rn() - 0.5) * 0.7,
        esc: 1, hl: 1.75, hw: 0.42,
        fase: rn() * Math.PI * 2,
      });
    }
  }

  // ── visuales ───────────────────────────────────────────────────────────────
  const rocasL = lista.filter((o) => o.tipo === 'roca');
  const troncosL = lista.filter((o) => o.tipo === 'tronco');
  const _m = new THREE.Matrix4();
  const _p = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler();
  const _s = new THREE.Vector3();

  const imRoca = new THREE.InstancedMesh(geoRocaMarina(THREE, 53), materialRoca(THREE), Math.max(1, rocasL.length));
  imRoca.frustumCulled = false;
  rocasL.forEach((o, idx) => {
    _p.set(o.x, -0.26 * o.esc + 0.14, o.z);
    _q.setFromEuler(_e.set(0, o.hdg, 0));
    _s.set(o.esc, o.esc * 0.9, o.esc * 0.86);
    _m.compose(_p, _q, _s);
    imRoca.setMatrixAt(idx, _m);
  });
  imRoca.count = rocasL.length;
  imRoca.instanceMatrix.needsUpdate = true;
  grupo.add(imRoca);

  const imTronco = new THREE.InstancedMesh(
    geoTronco(THREE, 7),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0.0 }),
    Math.max(1, troncosL.length),
  );
  imTronco.frustumCulled = false;
  imTronco.count = troncosL.length;
  grupo.add(imTronco);

  // ── cuerpos estáticos para colision.js (uno por obstáculo, reusados) ──────
  const cuerposEstaticos = lista.map((o, idx) => ({
    id: `obs-${o.tipo}-${idx}`, tipo: 'obstaculo', estatico: true,
    x: o.x, z: o.z, y: 0, hdg: o.hdg,
    vx: 0, vz: 0, masa: 4000, hl: o.hl, hw: o.hw,
  }));

  function actualizar() {
    // los troncos bobean con la misma ola visual (la colisión sigue en y=0:
    // saltás POR ENCIMA gracias al corte de 1.6 m que ya tiene resolverTodos)
    troncosL.forEach((o, idx) => {
      const y = olaAltura(o.x, o.z) + 0.06;
      _p.set(o.x, y, o.z);
      _q.setFromEuler(_e.set(Math.sin(o.fase + y * 2.1) * 0.05, o.hdg, Math.cos(o.fase - y * 1.7) * 0.06));
      _s.set(1, 1, 1);
      _m.compose(_p, _q, _s);
      imTronco.setMatrixAt(idx, _m);
    });
    if (troncosL.length) imTronco.instanceMatrix.needsUpdate = true;
  }
  actualizar();

  return {
    grupo,
    lista,
    cuerpos: () => cuerposEstaticos,
    actualizar,
  };
}
