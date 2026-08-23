// ── elementos.js — LOS MUNDOS SON SUS ELEMENTOS, VIVIENDO EN EL PAISAJE ─────
//
// Orden del operador (2026-07-26), y es un cambio de raíz:
//   «En el valle anterior LOS ANIMALES Y LA BIOFÁBRICA HACEN PARTE DEL PAISAJE,
//    igual Dante y Oliver, que andan por toda la finca. El espacio del valle no
//    se está aprovechando bien, y la solución para que los mundos parezcan lo
//    que son es INTEGRARLOS EN EL PAISAJE CON SUS ELEMENTOS. Aplica para todos
//    los principales, de manera prioritaria.»
//
// O sea: un mundo NO es un mojón con etiqueta. **Un mundo ES sus elementos.**
//   · animales  = las vacas y las ovejas pastando en el corral, no un poste
//   · abono     = la BIOFÁBRICA construida ahí: pilas, canecas, biodigestor
//   · plantas   = los bancales con sus surcos y el invernadero
//   · agua      = la bocatoma, el tanque y la acequia bajando
//   · bosque    = los TRES ESTRATOS parados en la ladera
//   · vender    = los puestos de la plaza con sus toldos
//   · finca     = la era y el mirador desde donde se ve todo
//   · páramo    = los frailejones en el labio, encima de La Chorrera
// Y se reconocen de lejos PORQUE SE VE LO QUE SON — no porque tengan letrero.
//
// ── DE DÓNDE SALE EL PATRÓN ────────────────────────────────────────────────
// Del valle anterior (`chagra/src/mockups/valle/HatoMovil.jsx`), estudiado, NO
// copiado: los dos stacks no comparten código (allá React + R3F + three 0.180
// con un banco de geometría realista horneada; acá three r160 vendorizado, sin
// build, y el valle es low-poly). Lo que SE TRADUJO es el patrón:
//   · ruta por polilínea con longitud de arco (`prepararRuta`/`puntoEnRuta`);
//   · **trote atado a la distancia recorrida** — cero patinaje, que es la
//     razón por la que allá se ve que caminan de verdad;
//   · rumbo suavizado por el ángulo corto (`giroCorto`);
//   · las dos razas se distinguen POR SILUETA, no por color: Oliver dálmata
//     alto y casi cuadrado, Dante beagle bajito, alargado y orejón;
//   · presupuesto de dibujo declarado y respetado.
//
// ── PRESUPUESTO DE DIBUJO ──────────────────────────────────────────────────
// Cada mundo se FUSIONA en UNA malla (vertex colors) → 1 draw call por mundo.
// El hato va en InstancedMesh (1 por especie). Los dos perros son los únicos
// que pagan más porque son los que se mueven: cuerpo + 4 patas + cola.
// ⚠️ `mergeGeometries` devuelve **null EN SILENCIO** si mezclás indexadas con
// no-indexadas — el clásico de esta casa. Aquí SIEMPRE se desindexa antes.
import * as THREE from 'three';
import { height } from './terrain.js';
import { armarPerroRealista } from './perros-realistas.js';
import { crearCampesinoV } from './lib3d/creatures/campesinosV.js';

// ── utilería ────────────────────────────────────────────────────────────────
function prng(semilla) {           // mulberry32: la escena es igual cada carga
  let a = semilla >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const _c = new THREE.Color();
function pintar(g, color) {
  const gg = g.index ? g.toNonIndexed() : g;      // ⚠️ el trap del merge
  const n = gg.attributes.position.count;
  const col = new Float32Array(n * 3);
  _c.set(color);
  for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
  gg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return gg;
}
function poner(g, [x, y, z], rot, esc) {
  if (esc) g.scale(esc[0], esc[1], esc[2]);
  if (rot) { g.rotateX(rot[0] || 0); g.rotateY(rot[1] || 0); g.rotateZ(rot[2] || 0); }
  g.translate(x, y, z);
  return g;
}
// ⚠️ `BufferGeometryUtils` NO está en el `vendor/` de este valle (se
// vendorizó three r160 a mano, sólo con controls/math/objects/postprocessing/
// shaders) — verificado: el import tiraba 404 y el módulo entero no cargaba.
// Así que la fusión va escrita aquí, y de paso se evita EL BUG CLÁSICO de
// `mergeGeometries`: mezclar indexadas con no-indexadas devuelve **null en
// silencio** y la geometría desaparece sin error. Acá TODO se desindexa antes
// y las únicas dos columnas son position y color; la normal se recalcula.
function fusion(lista, etiqueta) {
  const gs = lista.map((x) => (x.index ? x.toNonIndexed() : x));
  let n = 0;
  for (const g of gs) {
    if (!g.attributes.position) throw new Error('elementos: pieza sin position en ' + etiqueta);
    n += g.attributes.position.count;
  }
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (const g of gs) {
    const P = g.attributes.position.array, C = g.attributes.color ? g.attributes.color.array : null;
    for (let i = 0; i < g.attributes.position.count; i++) {
      pos[(o + i) * 3] = P[i * 3]; pos[(o + i) * 3 + 1] = P[i * 3 + 1]; pos[(o + i) * 3 + 2] = P[i * 3 + 2];
      if (C) { col[(o + i) * 3] = C[i * 3]; col[(o + i) * 3 + 1] = C[i * 3 + 1]; col[(o + i) * 3 + 2] = C[i * 3 + 2]; }
      else { col[(o + i) * 3] = 1; col[(o + i) * 3 + 1] = 1; col[(o + i) * 3 + 2] = 1; }
    }
    o += g.attributes.position.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeVertexNormals();
  out.computeBoundingSphere();
  return out;
}
const rumboY = (dx, dz) => Math.atan2(dx, dz);

// Igual que el plinto de `mundos.js`: un clúster grande no puede plantarse
// leyendo sólo el centro. En una ladera el centro puede estar más alto que
// uno de sus bordes y la base queda flotando. La huella se muestrea en una
// rejilla de 3×3; se usa la cota mínima para que el borde bajo toque suelo.
function sueloHuella(x, z, radioX, radioZ) {
  let mn = height(x, z);
  for (const dx of [-1, 0, 1]) {
    for (const dz of [-1, 0, 1]) {
      if (dx === 0 && dz === 0) continue;
      mn = Math.min(mn, height(x + dx * radioX, z + dz * radioZ));
    }
  }
  return mn;
}

function giroCorto(desde, hacia) {
  let d = (hacia - desde) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
function prepararRuta(pts) {
  const largos = [0];
  for (let i = 1; i < pts.length; i++) largos.push(largos[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, largos, total: largos[largos.length - 1] || 1 };
}
function puntoEnRuta(r, s) {
  const d = (s % 1) * r.total;
  let i = 1;
  while (i < r.largos.length - 1 && r.largos[i] < d) i++;
  const d0 = r.largos[i - 1], seg = (r.largos[i] - d0) || 1, t = (d - d0) / seg;
  const [x0, z0] = r.pts[i - 1], [x1, z1] = r.pts[i];
  return { x: x0 + (x1 - x0) * t, z: z0 + (z1 - z0) * t, dx: x1 - x0, dz: z1 - z0 };
}

// ── PIEZAS DE CONSTRUCCIÓN (low-poly, al tono del valle) ────────────────────
const MADERA = '#6b4a28', MADERA2 = '#8a6136', PIEDRA = '#5b6169', TECHO = '#8f3f34';
const TIERRA = '#4d3a26', HOJA = '#3f7a46', HOJA2 = '#2c5f39';

function poste(x, z, alto = 2.2, r = 0.16) {
  return poner(new THREE.CylinderGeometry(r, r * 1.2, alto, 5), [x, alto / 2, z]);
}
function cerca(cx, cz, radio, n, alto = 2.2) {
  const p = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    p.push(pintar(poste(cx + Math.cos(a) * radio, cz + Math.sin(a) * radio, alto), MADERA));
    // el travesaño hasta el siguiente poste
    const a2 = ((i + 1) / n) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * radio, z1 = cz + Math.sin(a) * radio;
    const x2 = cx + Math.cos(a2) * radio, z2 = cz + Math.sin(a2) * radio;
    const L = Math.hypot(x2 - x1, z2 - z1);
    for (const h of [alto * 0.72, alto * 0.42]) {
      const t = new THREE.BoxGeometry(L, 0.11, 0.11);
      t.rotateY(-Math.atan2(z2 - z1, x2 - x1));
      t.translate((x1 + x2) / 2, h, (z1 + z2) / 2);
      p.push(pintar(t, MADERA2));
    }
  }
  return p;
}
function techoDosAguas(x, z, w, d, altoPared, color) {
  const p = [];
  p.push(pintar(poner(new THREE.BoxGeometry(w, altoPared, d), [x, altoPared / 2, z]), MADERA));
  const t = new THREE.ConeGeometry(Math.hypot(w, d) * 0.56, altoPared * 0.85, 4);
  t.rotateY(Math.PI / 4);
  t.translate(x, altoPared + altoPared * 0.42, z);
  p.push(pintar(t, color || TECHO));
  return p;
}
function arbol(x, z, alto, radio, colHoja, colTronco) {
  const p = [];
  p.push(pintar(poner(new THREE.CylinderGeometry(radio * 0.16, radio * 0.24, alto * 0.62, 5), [x, alto * 0.31, z]), colTronco || '#4a3524'));
  p.push(pintar(poner(new THREE.IcosahedronGeometry(radio, 0), [x, alto * 0.72, z], null, [1, 0.82, 1]), colHoja));
  return p;
}

// ═══════════════════════════════════════════════════════════════════════════
//  UN CLÚSTER POR MUNDO — el mundo ES esto
// ═══════════════════════════════════════════════════════════════════════════
const CLUSTERS = {
  // EL CORRAL: cerca de varas, tranquera, comedero y bebedero. Los animales
  // los pone `hato()` aparte (van instanciados y se mueven).
  animales(cx, cz, R) {
    const p = [...cerca(0, 0, R * 0.85, 12, 2.2)];
    // la tranquera: dos postes altos y el travesaño levantado
    p.push(pintar(poste(R * 0.85, 0, 3.0, 0.2), MADERA));
    p.push(pintar(poste(R * 0.85 - 0.1, 1.6, 3.0, 0.2), MADERA));
    // comedero y saladero
    p.push(pintar(poner(new THREE.BoxGeometry(2.6, 0.5, 0.9), [-R * 0.3, 0.55, R * 0.2]), MADERA2));
    p.push(pintar(poner(new THREE.CylinderGeometry(0.9, 0.9, 0.35, 10), [R * 0.25, 0.18, -R * 0.35]), PIEDRA));
    // el gallinero, arrimado a la cerca
    p.push(...techoDosAguas(-R * 0.55, -R * 0.5, 2.4, 2.0, 1.5, '#7a5a34'));
    return p;
  },

  // LA BIOFÁBRICA: tres pilas en distinto punto de maduración, el biodigestor
  // con su bolsa, las canecas de biol y la carretilla. Es una FÁBRICA: se ve
  // que ahí se trabaja.
  abono(cx, cz, R) {
    const p = [];
    // las tres pilas (una recién armada, una caliente, una hecha humus)
    [[-R * 0.45, 0, 2.9, '#6b5a33'], [0, 0, 3.4, '#4f4127'], [R * 0.5, R * 0.15, 2.2, '#3a2d1c']].forEach(([x, z, r, col]) => {
      p.push(pintar(poner(new THREE.ConeGeometry(r, r * 0.95, 7), [x, r * 0.47, z]), col));
      // la tapa de hojarasca
      p.push(pintar(poner(new THREE.ConeGeometry(r * 0.72, r * 0.3, 7), [x, r * 0.92, z]), '#8a7a3f'));
    });
    // el biodigestor: tubo largo tumbado + su bolsa de gas
    const tubo = new THREE.CylinderGeometry(0.9, 0.9, 5.4, 8);
    tubo.rotateZ(Math.PI / 2);
    p.push(pintar(poner(tubo, [-R * 0.2, 1.0, -R * 0.6]), '#3d4a3a'));
    p.push(pintar(poner(new THREE.SphereGeometry(1.15, 8, 6), [-R * 0.2, 2.0, -R * 0.6], null, [1.6, 0.7, 1]), '#5c6b4a'));
    // las canecas del biol
    for (let i = 0; i < 3; i++) p.push(pintar(poner(new THREE.CylinderGeometry(0.52, 0.52, 1.25, 8), [R * 0.15 + i * 1.25, 0.62, -R * 0.15]), i === 1 ? '#3f6f8a' : '#2f5b70'));
    // el cobertizo donde se guarda la herramienta
    p.push(...techoDosAguas(R * 0.62, -R * 0.55, 2.2, 1.8, 1.6, '#6b5a3a'));
    return p;
  },

  // LOS BANCALES: terrazas escalonadas con sus surcos sembrados, y el
  // invernadero de arco al lado.
  plantas(cx, cz, R) {
    const p = [], r = prng(7);
    for (let b = 0; b < 4; b++) {
      const z = -R * 0.5 + b * (R * 0.36);
      const w = R * 1.5 - b * 1.1;
      p.push(pintar(poner(new THREE.BoxGeometry(w, 0.55, R * 0.28), [0, 0.3 + b * 0.42, z]), TIERRA));
      // los surcos: matas en fila
      const n = Math.max(5, Math.round(w / 1.5));
      for (let i = 0; i < n; i++) {
        const x = -w / 2 + (i + 0.5) * (w / n);
        p.push(pintar(poner(new THREE.ConeGeometry(0.36 + r() * 0.14, 0.9 + r() * 0.4, 5), [x, 0.98 + b * 0.42, z]), r() > 0.5 ? HOJA : HOJA2));
      }
    }
    // el invernadero: túnel de arcos
    for (let i = 0; i <= 5; i++) {
      const arco = new THREE.TorusGeometry(1.5, 0.09, 5, 12, Math.PI);
      arco.rotateY(Math.PI / 2);
      p.push(pintar(poner(arco, [R * 0.9, 0, -R * 0.5 + i * 0.85]), '#cfd8d4'));
    }
    return p;
  },

  // EL AGUA: la bocatoma en la quebrada, la acequia que baja, el tanque de
  // reserva y el bebedero. Es infraestructura de agua, se lee sola.
  agua(cx, cz, R) {
    const p = [];
    // el muro de la bocatoma, atravesado en el cauce
    p.push(pintar(poner(new THREE.BoxGeometry(R * 1.1, 0.9, 0.6), [0, 0.45, 0]), PIEDRA));
    // la acequia: canal de tablas bajando hacia +x (aguas abajo, medido)
    for (let i = 0; i < 7; i++) {
      const c = new THREE.BoxGeometry(2.0, 0.16, 0.75);
      c.rotateY(-0.22);
      p.push(pintar(poner(c, [1.6 + i * 1.9, 0.55 - i * 0.10, 0.5 + i * 0.42]), MADERA2));
    }
    // el tanque de reserva
    p.push(pintar(poner(new THREE.CylinderGeometry(1.7, 1.8, 2.2, 12), [R * 0.7, 1.1, R * 0.45]), '#3f6f8a'));
    p.push(pintar(poner(new THREE.CylinderGeometry(1.75, 1.75, 0.18, 12), [R * 0.7, 2.25, R * 0.45]), '#cfd8d4'));
    // el bebedero de piedra
    p.push(pintar(poner(new THREE.BoxGeometry(2.4, 0.55, 1.0), [-R * 0.55, 0.3, R * 0.4]), PIEDRA));
    return p;
  },

  // LOS TRES ESTRATOS, PARADOS EN LA LADERA. La lección ES la silueta:
  // emergentes que rompen el dosel · dosel cerrado · sotobosque al pie.
  bosque(cx, cz, R) {
    const p = [], r = prng(13);
    // 1) EMERGENTES: pocos, altos, copa angosta que asoma por encima
    for (let i = 0; i < 5; i++) {
      const a = r() * Math.PI * 2, d = r() * R * 0.8;
      p.push(...arbol(Math.cos(a) * d, Math.sin(a) * d, 15 + r() * 4, 2.4 + r() * 0.5, '#2b5c37', '#3a2c1e'));
    }
    // 2) DOSEL: muchos, misma altura — el techo continuo
    for (let i = 0; i < 16; i++) {
      const a = r() * Math.PI * 2, d = r() * R;
      p.push(...arbol(Math.cos(a) * d, Math.sin(a) * d, 8.5 + r() * 1.6, 2.9 + r() * 0.6, '#3f7a46', '#4a3524'));
    }
    // 3) SOTOBOSQUE: arbustos y helechos al pie, bajo la sombra
    for (let i = 0; i < 22; i++) {
      const a = r() * Math.PI * 2, d = r() * R * 1.05;
      p.push(pintar(poner(new THREE.IcosahedronGeometry(0.85 + r() * 0.5, 0), [Math.cos(a) * d, 0.7, Math.sin(a) * d], null, [1, 0.7, 1]), '#26522f'));
    }
    return p;
  },

  // LA PLAZA: tres puestos con sus toldos de color, la báscula y los canastos.
  vender(cx, cz, R) {
    const p = [];
    [['#d9534f', -R * 0.55], ['#e6b93f', 0], ['#4f8f4a', R * 0.55]].forEach(([col, x]) => {
      for (const [dx, dz] of [[-1.5, -1.1], [1.5, -1.1], [-1.5, 1.1], [1.5, 1.1]])
        p.push(pintar(poste(x + dx, dz, 2.6, 0.11), MADERA));
      const toldo = new THREE.BoxGeometry(3.6, 0.16, 2.7);
      toldo.rotateX(0.10);
      p.push(pintar(poner(toldo, [x, 2.7, 0]), col));
      p.push(pintar(poner(new THREE.BoxGeometry(3.1, 0.14, 1.5), [x, 1.25, 0]), MADERA2));
      // el canasto en la mesa
      p.push(pintar(poner(new THREE.CylinderGeometry(0.55, 0.42, 0.55, 8), [x, 1.6, 0]), '#a9793f'));
    });
    // la báscula al frente
    p.push(pintar(poner(new THREE.CylinderGeometry(0.16, 0.16, 2.0, 6), [0, 1.0, R * 0.6]), PIEDRA));
    p.push(pintar(poner(new THREE.BoxGeometry(2.0, 0.1, 0.14), [0, 2.0, R * 0.6]), PIEDRA));
    return p;
  },

  // LA ERA Y EL MIRADOR: el alto desde donde se ve la finca entera. Una
  // plataforma de tablas con su baranda y el banco mirando al valle.
  finca(cx, cz, R) {
    const p = [];
    p.push(pintar(poner(new THREE.CylinderGeometry(R * 0.7, R * 0.75, 0.4, 10), [0, 0.2, 0]), '#7a6a4a'));
    p.push(pintar(poner(new THREE.BoxGeometry(R * 0.9, 0.24, R * 0.7), [0, 0.55, 0]), MADERA2));
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * (0.15 + i * 0.14);
      p.push(pintar(poste(Math.cos(a) * R * 0.42, Math.sin(a) * R * 0.34, 1.3, 0.09), MADERA));
    }
    const bar = new THREE.BoxGeometry(R * 0.85, 0.1, 0.1);
    p.push(pintar(poner(bar, [0, 1.25, -R * 0.3]), MADERA2));
    // el banco, mirando al valle
    p.push(pintar(poner(new THREE.BoxGeometry(2.4, 0.14, 0.6), [0, 1.05, R * 0.18]), MADERA2));
    for (const dx of [-1.0, 1.0]) p.push(pintar(poner(new THREE.BoxGeometry(0.16, 0.5, 0.5), [dx, 0.8, R * 0.18]), MADERA));
    return p;
  },

  // EL FRAILEJONAL: el páramo se reconoce por su forma — troncos peludos con
  // la roseta arriba, salpicados por el labio de la meseta, y los pajonales.
  paramo(cx, cz, R) {
    const p = [], r = prng(29);
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * R;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      const h = 2.2 + r() * 2.0;
      p.push(pintar(poner(new THREE.CylinderGeometry(0.42, 0.55, h, 7), [x, h / 2, z]), '#6b5a45'));
      // la roseta: estrella de hojas
      for (let j = 0; j < 6; j++) {
        const b = (j / 6) * Math.PI * 2 + r() * 0.4;
        const hoja = new THREE.ConeGeometry(0.3, 1.5, 4);
        hoja.rotateZ(Math.PI / 2 - 0.5);
        hoja.rotateY(b);
        p.push(pintar(poner(hoja, [x + Math.cos(b) * 0.5, h + 0.35, z + Math.sin(b) * 0.5]), '#9fb08a'));
      }
    }
    // pajonal: matojos bajos entre los frailejones
    for (let i = 0; i < 30; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * R * 1.15;
      p.push(pintar(poner(new THREE.ConeGeometry(0.55 + r() * 0.3, 1.1 + r() * 0.5, 5), [Math.cos(a) * d, 0.6, Math.sin(a) * d]), '#8a8f5c'));
    }
    return p;
  },
};

// ── EL HATO: vacas y ovejas pastando, instanciadas ─────────────────────────
// Una malla por especie (1 draw call c/u). Se mueven despacio dentro del
// aparto y se paran a pastar — el patrón del valle anterior, en low-poly.
function geomVaca() {
  const p = [];
  p.push(pintar(poner(new THREE.BoxGeometry(2.0, 1.05, 0.95), [0, 1.15, 0]), '#e8e4dc'));
  p.push(pintar(poner(new THREE.BoxGeometry(0.72, 0.62, 0.66), [1.15, 1.35, 0]), '#2f2a26'));
  p.push(pintar(poner(new THREE.BoxGeometry(0.55, 0.5, 0.5), [-0.5, 1.4, 0.30]), '#2f2a26'));
  for (const [x, z] of [[0.7, 0.36], [0.7, -0.36], [-0.7, 0.36], [-0.7, -0.36]])
    p.push(pintar(poner(new THREE.CylinderGeometry(0.14, 0.12, 1.2, 5), [x, 0.6, z]), '#3a332c'));
  p.push(pintar(poner(new THREE.CylinderGeometry(0.06, 0.03, 0.75, 4), [-1.05, 1.25, 0]), '#3a332c'));
  return fusion(p, 'vaca');
}
function geomOveja() {
  const p = [];
  p.push(pintar(poner(new THREE.IcosahedronGeometry(0.62, 0), [0, 0.85, 0], null, [1.35, 0.95, 1]), '#efe9db'));
  p.push(pintar(poner(new THREE.SphereGeometry(0.3, 6, 5), [0.78, 0.95, 0]), '#4a4038'));
  for (const [x, z] of [[0.32, 0.24], [0.32, -0.24], [-0.34, 0.24], [-0.34, -0.24]])
    p.push(pintar(poner(new THREE.CylinderGeometry(0.08, 0.07, 0.6, 4), [x, 0.3, z]), '#4a4038'));
  return fusion(p, 'oveja');
}

// ── DANTE Y OLIVER — LOS PERROS DE LA CASA, LOS DE VERDAD ──────────────────
//
// 🔴 CORRECCIÓN del operador (2026-07-27): «vi unos perros DIFERENTES a los
// que ya estaban en el valle. **Dante y Oliver ya estaban muy avanzados**».
// Tenía razón: la ronda anterior tradujo bien el MOVIMIENTO de `HatoMovil.jsx`
// pero **modeló dos perros genéricos** en vez de traer a los que ya existen,
// aprobados y en producción. Por eso decía «no veo a Dante y Oliver»: sí veía
// perros — pero no eran ellos.
//
// La fuente es `chagra/src/visual/mundo3d/finca/fincaRealista.geom.js`
// (`geomPerroAndante`, Oliver ~930-1050 · Dante ~1116-1246), más los rigs 2D
// `Dalmata.jsx` / `Beagle.jsx`. Los dos stacks NO comparten código (allá React
// + R3F + three 0.180 con loft orgánico, pelaje horneado y AO por vértice; acá
// three r160 vendorizado, sin build, low-poly): esto es una **traducción**,
// igual que se hizo con el trote. Lo que NO se negocia es que **se reconozcan**.
//
// ── LAS SEÑAS QUE TIENEN QUE LEERSE ────────────────────────────────────────
// OLIVER · dálmata, alto y atlético, el que manda y arrea:
//   · manto BLANCO con manchas negras redondas
//   · **el PARCHE NEGRO sobre el ojo izquierdo** — su seña particular
//   · **collar ROJO** con plaquita de latón
//   · orejas NEGRAS caídas, cola de sable larga (la del helicóptero)
//   · patas largas: casi media altura es aire bajo el pecho
// DANTE · beagle viejo de 15 años, bajito y orejón, el que HUELE:
//   · tricolor: silla NEGRA arriba, flancos CANELA, bajos y pechera BLANCOS
//   · **el HOCICO ESCARCHADO** (canas de perro viejo) y cejas canela
//   · **collar VERDE** con plaquita
//   · orejas ENORMES color hígado colgando bajo la quijada — de lejos, el
//     beagle SON las orejas
//   · la bandera: cola corta erguida de punta blanca
//
// ── EL ANCLA DE ALTURA ES INTOCABLE ────────────────────────────────────────
// El contrato de escala del valle fija Oliver **0,595 u** y Dante **0,349 u**
// (`AUDITORIA-VALLE.md` §132-144, `LEY-VISUAL-VALLE.md:127`, y en
// `HojaPruebaValle.jsx:222` está escrito «el ancla de Oliver, intocable»).
// Aquí el valle corre en otra escala (K=0,6 u/m + el ×3 de AoE), así que lo
// que se conserva es la **RELACIÓN**: `alto` de Dante = 0,349/0,595 = **0,587**
// del de Oliver. Venía en 0,78, o sea Dante era demasiado alto y los dos se
// confundían de lejos. Con 0,587 la diferencia de alzada se lee sola.
const PERROS = [
  { nombre: 'Oliver', esc: 1.00, vel: 6.2, banquina: -1.6, largo: 1.00, alto: 1.00, fase: 0.8,
    raza: 'dalmata',
    manto: '#f3efe7', mancha: '#26262b', oreja: '#26262b', collar: '#a83232' },
  { nombre: 'Dante', esc: 0.80, vel: 5.1, banquina: 1.7, largo: 1.34, alto: 0.587, fase: 3.4,
    raza: 'beagle',
    manto: '#f2ecdc', silla: '#2a2622', canela: '#a5622c', oreja: '#5f3d20', collar: '#3a7d44' },
];
const LATON = '#c8963a';

function armarPerro(P) {
  const G = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  const dal = P.raza === 'dalmata';
  const L = 1.55 * P.largo;
  // Oliver va sobre zancos y Dante casi arrastra la panza: la altura del
  // pecho sobre el suelo es la mitad de la lectura de raza a distancia.
  const hPata = dal ? 0.86 : 0.40;
  const yLomo = hPata + 0.34 * P.alto;

  // ── CUERPO ──────────────────────────────────────────────────────────────
  const cuerpoP = [];
  if (dal) {
    // manto blanco + manchas negras REDONDEADAS (a esta distancia una mancha
    // cuadrada lee como parche de pintura; una esfera achatada lee como mancha)
    cuerpoP.push(pintar(poner(new THREE.BoxGeometry(L, 0.60 * P.alto, 0.60), [0, 0, 0]), P.manto));
    // el pecho hondo del dálmata
    cuerpoP.push(pintar(poner(new THREE.SphereGeometry(0.34, 7, 5), [L * 0.24, -0.05, 0], null, [1.15, 0.92, 0.98]), P.manto));
    // 🔴 T02 de la auditoría (2026-07-30): Oliver leía como MANIQUÍ BLANCO con
    // el rig expuesto. Causa medida en el retrato del gate: 4 manchas muy
    // GRUESAS (esferas al 35% de fondo) que leían como pedruscos pegados, y
    // flancos casi vacíos — el manto quedaba liso y el perro parecía sin
    // texturizar. La silla de Dante lee bien porque es una CALCOMANÍA: apenas
    // asoma 0,01-0,02 de la superficie. Se aplica la misma receta: motas
    // PLANAS (18% de fondo), muchas y de tamaño variado, repartidas
    // asimétricamente en AMBOS flancos + lomo — patrón de dálmata de verdad.
    // El centro de cada mota se calcula para asomar 0,025 fijo del cuero,
    // sea cual sea su radio.
    const zCuero = (s, r) => s * (0.325 - r * 0.18);     // flanco (z=±0.30)
    const yCuero = (r) => 0.30 * P.alto + 0.025 - r * 0.18;  // lomo (y=+0.30·alto)
    const flancos = [
      // [mx (fracción de L), my, lado ±1, r]
      [0.30, 0.10, 1, 0.17], [-0.05, -0.08, 1, 0.13], [-0.36, 0.06, 1, 0.19], [0.06, 0.16, 1, 0.10],
      [0.34, 0.02, -1, 0.14], [0.10, 0.06, -1, 0.20], [-0.22, -0.10, -1, 0.12], [-0.36, 0.12, -1, 0.15],
    ];
    for (const [mx, my, s, r] of flancos) {
      cuerpoP.push(pintar(poner(new THREE.SphereGeometry(r, 6, 5), [L * mx, my, zCuero(s, r)], null, [1, 0.85, 0.18]), P.mancha));
    }
    for (const [mx, mz, r] of [[-0.16, 0.08, 0.16], [0.26, -0.06, 0.12]]) {
      cuerpoP.push(pintar(poner(new THREE.SphereGeometry(r, 6, 5), [L * mx, yCuero(r), mz], null, [1, 0.18, 0.85]), P.mancha));
    }
  } else {
    // TRICOLOR: la lectura de Dante a distancia es la silla negra sobre canela
    cuerpoP.push(pintar(poner(new THREE.BoxGeometry(L, 0.52 * P.alto, 0.62), [0, 0, 0]), P.canela));
    // la SILLA negra: tapa el lomo de hombro a grupa
    cuerpoP.push(pintar(poner(new THREE.BoxGeometry(L * 0.74, 0.26 * P.alto, 0.64), [-L * 0.06, 0.20 * P.alto, 0]), P.silla));
    // bajos y PECHERA blancos
    cuerpoP.push(pintar(poner(new THREE.BoxGeometry(L * 0.96, 0.20 * P.alto, 0.60), [0, -0.24 * P.alto, 0]), P.manto));
    cuerpoP.push(pintar(poner(new THREE.SphereGeometry(0.27, 7, 5), [L * 0.40, -0.10, 0], null, [0.85, 1.05, 0.92]), P.manto));
  }
  const cuerpo = new THREE.Mesh(fusion(cuerpoP, 'perro-cuerpo'), mat);
  cuerpo.position.y = yLomo;
  G.add(cuerpo);

  // ── CABEZA ──────────────────────────────────────────────────────────────
  const cabP = [];
  const baseCab = dal ? P.manto : P.canela;
  cabP.push(pintar(poner(new THREE.BoxGeometry(0.52, 0.46, 0.48), [0, 0, 0]), baseCab));
  if (dal) {
    cabP.push(pintar(poner(new THREE.BoxGeometry(0.44, 0.26, 0.30), [0.42, -0.09, 0]), P.manto));
    cabP.push(pintar(poner(new THREE.SphereGeometry(0.08, 5, 4), [0.62, -0.07, 0]), '#1c1815'));   // trufa
    // 🔴 EL PARCHE sobre el ojo IZQUIERDO — la seña de Oliver. Va grande a
    // propósito: es lo único suyo que sigue legible cuando las motas del
    // manto ya se funcionaron en un gris. -z es su izquierda (mira a +x).
    cabP.push(pintar(poner(new THREE.BoxGeometry(0.30, 0.26, 0.16), [0.10, 0.09, -0.19]), P.mancha));
    // 🔴 T02: por el lado DERECHO la cabeza era una caja lisa sin cara — el
    // parche vive en el izquierdo y ojo no había NINGUNO. Un perro sin cara
    // por un costado lee como asset sin terminar. Ojo derecho pequeño y
    // oscuro, apenas asomado del cachete (media esfera, no botón saltón)…
    cabP.push(pintar(poner(new THREE.SphereGeometry(0.055, 6, 5), [0.16, 0.07, 0.235], null, [1, 1, 0.5]), '#26221e'));
    // …y una mota en el cráneo, para que la cabeza también sea dálmata
    cabP.push(pintar(poner(new THREE.SphereGeometry(0.08, 6, 5), [-0.12, 0.225, 0.06], null, [1, 0.2, 1]), P.mancha));
    // la SONRISA: boca oscura y lengüita rosa asomando
    cabP.push(pintar(poner(new THREE.BoxGeometry(0.26, 0.09, 0.22), [0.40, -0.21, 0]), '#33201f'));
    cabP.push(pintar(poner(new THREE.BoxGeometry(0.16, 0.06, 0.14), [0.48, -0.24, 0]), '#d9737f'));
  } else {
    // hocico ancho y corto, y encima EL ESCARCHADO: el velo de canas que le
    // sube de la trufa por el puente. Es lo que dice «perro viejo» sin texto.
    cabP.push(pintar(poner(new THREE.BoxGeometry(0.40, 0.26, 0.32), [0.38, -0.10, 0]), P.manto));
    cabP.push(pintar(poner(new THREE.BoxGeometry(0.30, 0.13, 0.26), [0.30, 0.02, 0]), '#e6dfcd'));
    cabP.push(pintar(poner(new THREE.SphereGeometry(0.09, 5, 4), [0.58, -0.08, 0]), '#241d18'));   // trufa
    // la lista blanca por la frente + las cejas canela (la «cara de beagle»)
    cabP.push(pintar(poner(new THREE.BoxGeometry(0.34, 0.30, 0.10), [0.08, 0.10, 0]), P.manto));
    for (const s of [1, -1]) cabP.push(pintar(poner(new THREE.BoxGeometry(0.10, 0.06, 0.09), [0.14, 0.15, s * 0.15]), '#7d4a1e'));
    // la LENGUA colgando: Dante el baboso
    cabP.push(pintar(poner(new THREE.BoxGeometry(0.13, 0.20, 0.11), [0.46, -0.28, 0]), '#d9737f'));
  }
  // ── LAS OREJAS: la mitad de la silueta ──
  // Dante 0,72 (enormes, cuelgan bajo la quijada) · Oliver 0,30 (medianas).
  const orejaL = dal ? 0.30 : 0.72;
  for (const s of [1, -1]) {
    cabP.push(pintar(poner(new THREE.BoxGeometry(dal ? 0.10 : 0.13, orejaL, dal ? 0.24 : 0.30),
      [dal ? -0.05 : 0.00, -orejaL * 0.30, s * (dal ? 0.27 : 0.29)]), P.oreja));
  }
  const cabeza = new THREE.Mesh(fusion(cabP, 'perro-cabeza'), mat);
  cabeza.position.set(L * 0.5 + 0.22, yLomo + (dal ? 0.66 : 0.34), 0);
  G.add(cabeza);

  // ── EL COLLAR con su plaquita de latón: los dos son perros CON CASA ──
  const colP = [];
  colP.push(pintar(poner(new THREE.CylinderGeometry(0.30, 0.30, 0.14, 8), [0, 0, 0], [Math.PI / 2, 0, Math.PI / 2]), P.collar));
  colP.push(pintar(poner(new THREE.BoxGeometry(0.10, 0.13, 0.07), [0.02, -0.30, 0]), LATON));
  const collar = new THREE.Mesh(fusion(colP, 'perro-collar'), mat);
  collar.position.set(L * 0.5 + 0.02, yLomo + (dal ? 0.42 : 0.20), 0);
  G.add(collar);

  // ── 4 PATAS (las que hacen el trote) ──
  // 🔴 T02: en Oliver las cuatro patas eran palos BLANCOS lisos — congeladas a
  // media zancada leían como los huesos de un rig. Un dálmata real lleva motas
  // también en las patas: se le pone una en el muslo al par diagonal (la misma
  // diagonal del trote), y con eso el palo pasa a ser pata. Cada pata pasa a
  // geometría propia (antes compartían una) para poder motearlas distinto;
  // el pivote en la cadera NO cambia — el trote gira igual.
  const patas = [];
  const gruesoPata = dal ? 0.17 : 0.21;
  [[L * 0.30, 0.24, true], [L * 0.30, -0.24, false], [-L * 0.30, 0.24, false], [-L * 0.30, -0.24, true]].forEach(([x, z, mota]) => {
    const geoPata = new THREE.BoxGeometry(gruesoPata, hPata + 0.10, gruesoPata);
    geoPata.translate(0, -(hPata + 0.10) / 2, 0);
    const piezas = [pintar(geoPata, P.manto)];
    if (dal && mota) {
      const lado = z > 0 ? 1 : -1;
      piezas.push(pintar(poner(new THREE.SphereGeometry(0.075, 5, 4), [0, -0.24, lado * (gruesoPata / 2 + 0.01)], null, [1, 1.25, 0.4]), P.mancha));
    }
    const m = new THREE.Mesh(fusion(piezas, 'perro-pata'), mat);
    m.position.set(x, yLomo - 0.06, z);
    G.add(m); patas.push(m);
  });

  // ── LA COLA ──
  // Oliver: sable LARGA (la que hace helicóptero). Dante: la BANDERA corta y
  // erguida, con la punta blanca — la que se ve entre el pasto.
  const colaP = [];
  if (dal) {
    colaP.push(pintar(poner(new THREE.CylinderGeometry(0.05, 0.09, 0.78, 5), [0, 0.39, 0]), P.manto));
    // 🔴 T02: la sable blanca lisa era otro «hueso» suelto. Punta moteada,
    // como la bandera de Dante pero en negativo: mota oscura al remate.
    colaP.push(pintar(poner(new THREE.SphereGeometry(0.075, 5, 4), [0, 0.74, 0]), P.mancha));
  } else {
    colaP.push(pintar(poner(new THREE.CylinderGeometry(0.06, 0.09, 0.40, 5), [0, 0.20, 0]), P.silla));
    colaP.push(pintar(poner(new THREE.SphereGeometry(0.10, 6, 5), [0, 0.42, 0]), P.manto));
  }
  const cola = new THREE.Mesh(fusion(colaP, 'perro-cola'), mat);
  cola.position.set(-L * 0.52, yLomo + (dal ? 0.22 : 0.28), 0);
  cola.rotation.z = dal ? -0.9 : -0.25;      // Dante la lleva casi vertical
  G.add(cola);

  // el alto REAL se MIDE, no se estima: el primer intento pasó un alto a ojo
  // (7,8 u contra 4,5 reales) y el piso angular quedó a media asta — 13 px en
  // vez de 20. Una caja envolvente no miente.
  const caja = new THREE.Box3().setFromObject(G);
  const altoNatural = caja.max.y - caja.min.y;
  // ── ARMONÍA DE ESCALA (2026-07-31) ────────────────────────────────────
  // El multiplicador ×3.0 venía de la escala AoE de las construcciones (ESC)
  // aplicado por error también a los perros: medido con Box3 en réplica
  // exacta de esta función, Oliver daba altoNatural=1,921 u × 3,0 = 5,76 u =
  // **9,6 m** — más grande que la CASA. Con perro.esc=1.00 (Oliver) el
  // multiplicador que da 0,6 m reales (K=0,6 u/m) es 0,3600/1,9210 = 0,1874.
  // Dante se sigue corrigiendo solo, más abajo, por la relación-ancla
  // 0,349/0,595 — esa lógica NO se toca.
  const MULT_PERRO = 0.1874;
  G.scale.setScalar(P.esc * MULT_PERRO);
  return { G, patas, cola, cabeza, P, escBase: P.esc * MULT_PERRO, altoNatural: altoNatural * P.esc * MULT_PERRO };
}

// ── LO VIVO NO PUEDE DESAPARECER: PISO ANGULAR ─────────────────────────────
// Es la misma regla que ya rige los escudos de los mundos (§7.2 de la bitácora
// `camara-aoe-y-auditoria`): **tamaño angular acotado con topes duros**. Un
// mojón que no se ve estorba; un perro que no se ve, sencillamente no está.
//
// Sin esto no hay arreglo posible: la panorámica del aterrizaje está a ~1.150 u
// de la finca, y ahí un perro de 4 u mide 2 px. Escalar sólo por distancia haría
// que el perro «respire» (crezca y encoja con la cámara), que es justo lo que
// se prohibió para los escudos. La salida es la misma: crece **sólo cuando ya
// no se leería**, hasta un tope, y nunca se encoge por debajo de su tamaño real.
//
// `minPx` = alto mínimo en pantalla. `maxK` = cuánto se le permite crecer sobre
// su tamaño real (tope duro: sin él, mirar desde el páramo los volvería gigantes).
// `?vivos=natural` apaga el piso: NO es una opción de producto, es una
// herramienta del gate. Sin ella retratar a Dante y Oliver es imposible —
// el piso los reescala según la distancia de cámara, así que acercarse los
// encoge y el encuadre entra en un lazo que oscila (se perdieron dos
// iteraciones enteras peleando con eso antes de ponerla).
const _PISO_APAGADO = typeof location !== 'undefined'
  && new URLSearchParams(location.search).get('vivos') === 'natural';

export function factorVisible(camera, pos, altoU, minPx, maxK, alto = 800) {
  if (_PISO_APAGADO) return 1;
  const d = camera.position.distanceTo(pos);
  const pxU = alto / (2 * d * Math.tan((camera.fov * Math.PI / 180) / 2));
  const px = altoU * pxU;
  if (px >= minPx) return 1;
  return Math.min(maxK, minPx / Math.max(px, 0.001));
}

// ── LA PAREJA DE SOMBRERO NEGRO, TRABAJANDO EN LA FINCA ────────────────────
//
// Orden del operador (2026-08-07): «que interactúen en el valle como los
// trabajadores, sincronizados según el mundo, que aparezcan casual en el valle
// de vez en cuando».
//
// Las tres palabras que mandan, y cómo se cumplen:
//
// «TRABAJADORES» → no son adorno parado. Cada mundo declara QUÉ se hace ahí
//   (`OFICIO`), y el personaje llega con la herramienta de ESE trabajo: en el
//   corral el balde de maíz, en la biofábrica el mecedor de la pila, en los
//   bancales el azadón y el canasto, en la plaza la carga al hombro. El dibujo
//   —y la faena— viven en `lib3d/creatures/campesinosV.js`; acá sólo se decide
//   DÓNDE y CUÁNDO.
//
// «SINCRONIZADOS SEGÚN EL MUNDO» → dos sincronías. (a) la faena sale del mundo
//   donde caen, nunca de una lista suelta; (b) el reloj del valle manda: con
//   `?hora=noche` NO hay nadie en la ladera. La faena es de día — eso lo sabe
//   cualquiera que haya visto una finca, y que a las 2 a.m. haya alguien
//   azadonando rompería el mundo entero.
//
// «DE VEZ EN CUANDO, CASUAL» → el sorteo va con `Math.random`, NO con el `prng`
//   determinista del resto del módulo. Es a propósito y es la diferencia entre
//   «un personaje que está siempre ahí» y «me lo encontré»: dos entradas al
//   valle no los ponen en el mismo sitio, ni al mismo tiempo, ni haciendo lo
//   mismo — y a veces sencillamente no están. Hay huecos de hasta minuto y
//   medio en que la finca está sola.
//
// Y a veces —4 de cada 10— caen JUNTOS en el mismo mundo, con oficio distinto
// cada uno: él revuelve la pila y ella carga la caneca. Ahí se lee que son
// pareja y no dos figuras sueltas que coincidieron.
//
// PRESUPUESTO: 2 billboards = 2 draw calls, sin geometría, sin sombras. El
// atlas de cada faena se hornea perezoso y se cachea; la primera aparición de
// una faena nueva paga un `Image.decode`, fuera del hilo de render.
const OFICIO = {
  animales: { el: 'atender', ella: 'recoger', r: 0.50, peso: 1.5 },
  abono: { el: 'revolver', ella: 'acomodar', r: 0.62, peso: 1.3 },
  plantas: { el: 'azadonear', ella: 'recoger', r: 0.48, peso: 1.5 },
  agua: { el: 'azadonear', ella: 'acomodar', r: 0.55, peso: 0.9 },
  vender: { el: 'acomodar', ella: 'recoger', r: 0.52, peso: 1.0 },
  bosque: { el: 'recoger', ella: 'azadonear', r: 0.34, peso: 0.7 },
  // en la era se AVIENTA el grano: el mismo barrido del mecedor de la paila
  finca: { el: 'revolver', ella: 'acomodar', r: 0.70, peso: 1.1 },
};
// 1,72 m a la escala del valle (K=0,6 u/m). Van en metros de verdad, como el
// hato y como los perros: el ×3 de AoE es de lo CONSTRUIDO, no de lo vivo.
const ALTO_CAMPESINO = 1.72 * 0.6;
const _QS = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const _ES_NOCHE = _QS.get('hora') === 'noche';
// `?campesinos=<mundo>` los planta YA en ese mundo y los deja: sin esto
// retratarlos es esperar a la lotería. `?campesinos=0` los apaga — es la
// PRUEBA DE CONTROL del gate: sin un valle idéntico sin ellos, cualquier
// número de FPS que se les cuelgue encima es una acusación sin careo.
const _CAMP = _QS.get('campesinos');
const _APAGADOS = _CAMP === '0' || _CAMP === 'no';
const _FORZADO = _APAGADOS ? null : _CAMP;

// ═══════════════════════════════════════════════════════════════════════════
export function makeElementos(scene, MUNDOS) {
  const grupo = new THREE.Group();
  grupo.name = 'mundos-elementos';
  scene.add(grupo);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });

  // ── el clúster de cada mundo, plantado en su puesto MEDIDO ──
  // Los puestos vienen de la medición sobre el DEM (msnm y pendiente en
  // `catalogo.js`): ahí es donde van los elementos, no en otro lado.
  // ── ESCALA AoE, DECLARADA ────────────────────────────────────────────────
  // A tamaño real un corral de 15 m mide 12 px desde la panorámica: se ve, no
  // se LEE. Age of Empires resuelve esto desde 1997 sobredimensionando lo
  // construido respecto al terreno, y es coherente con el norte de la casa:
  // **huesos reales, piel dibujada** — el DEM es exacto, lo que el campesino
  // construyó encima se dibuja para que se entienda. El corral queda de ~50 m
  // y la pila de compost de ~20: grandes, pero plausibles en una finca, y a
  // 1,4 km por fin se ve QUÉ es cada mundo sin leer el rótulo.
  const ESC = 3.0;
  const RADIO = { animales: 9, abono: 8, plantas: 10, agua: 9, bosque: 22, vender: 9, finca: 7, paramo: 26 };
  for (const M of MUNDOS) {
    const f = CLUSTERS[M.id];
    if (!f) continue;
    const R = RADIO[M.id] || 9;
    const piezas = f(M.x, M.z, R);
    if (!piezas.length) continue;
    const malla = new THREE.Mesh(fusion(piezas, M.id), mat);   // 1 draw call por mundo
    malla.scale.setScalar(ESC);
    // La geometría ya está fusionada y su escala AoE amplía la huella. Usa su
    // caja LOCAL para medir cuánto terreno ocupa y asienta la cara inferior
    // en la cota mínima de esa huella. Así no queda flotando cuesta abajo ni
    // depende de una altura central que no representa el soporte real.
    malla.geometry.computeBoundingBox();
    const caja = malla.geometry.boundingBox;
    const suelo = sueloHuella(
      M.x,
      M.z,
      Math.max(Math.abs(caja.min.x), Math.abs(caja.max.x)) * ESC,
      Math.max(Math.abs(caja.min.z), Math.abs(caja.max.z)) * ESC,
    );
    malla.position.set(M.x, suelo - caja.min.y * ESC, M.z);
    malla.name = 'elem-' + M.id;
    grupo.add(malla);
  }

  // ── EL HATO en el corral de los animales ──
  const corral = MUNDOS.find((m) => m.id === 'animales') || { x: 49, z: -49 };
  const rnd = prng(101);
  const bichos = [];
  function rebano(geo, n, radio, escala) {
    const m = new THREE.InstancedMesh(geo, mat, n);
    m.frustumCulled = false;
    grupo.add(m);
    geo.computeBoundingBox();
    const altoGeo = geo.boundingBox.max.y - geo.boundingBox.min.y;   // medido, no estimado
    const st = [];
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * radio;
      st.push({ x: corral.x + Math.cos(a) * d, z: corral.z + Math.sin(a) * d,
        rumbo: rnd() * Math.PI * 2, t: rnd() * 9, pasta: rnd() > 0.5, esc: escala * (0.9 + rnd() * 0.2) });
    }
    bichos.push({ m, st, radio, altoGeo });
    return m;
  }
  // ── ARMONÍA DE ESCALA (2026-07-31) ──────────────────────────────────────
  // Auditoría con Box3().setFromObject() (medido, no a ojo): con esc=2.0 una
  // vaca de acá medía 5,6-6,2 m — más grande que el jeep (5,6 m) y casi el
  // tamaño de Oliver (9,6 m con el bug de abajo). Factor recalculado para
  // que el ANIMAL, no el corral, esté en metros reales:
  //   vaca 1,5 m al lomo → esc 0,537 (bbox natural geomVaca = 1,675 u)
  //   oveja 0,75 m al lomo → esc 0,333 (bbox natural geomOveja = 1,351 u)
  // El piso angular (factorVisible, abajo) sigue encargándose de que no
  // desaparezcan de lejos — ESO no se toca, solo el tamaño base.
  rebano(geomVaca(), 5, 6.2 * ESC * 0.8, 0.537);
  rebano(geomOveja(), 9, 7.0 * ESC * 0.8, 0.333);
  const _o = new THREE.Object3D();

  // ── LA RONDA DE DANTE Y OLIVER, por toda la finca ──
  // La ruta pasa por los mundos: corral → abono → casa → quebrada → huerta →
  // plaza → vuelta. Es «toda la finca», no un mundo.
  const porId = Object.fromEntries(MUNDOS.map((m) => [m.id, m]));
  const P = (id, dx = 0, dz = 0) => [(porId[id] ? porId[id].x : 0) + dx, (porId[id] ? porId[id].z : 0) + dz];
  const RUTA = prepararRuta([
    P('animales', 8, 6), P('abono', 6, 4), [18, 16], [-8, 14], P('finca', 10, -6),
    [-70, -60], P('plantas', 8, 8), [-40, -180], P('agua', -20, 30), [150, -330],
    P('vender', -14, 10), [190, -230], [90, -120], [40, -40], P('animales', 10, -6),
  ]);
  // ── CADA PERRO LLEVA SUS DOS PIELES (orden del operador, 2026-07-30) ────
  // «La versión de perros de aquí está linda y la del valle guatoc también,
  //  quiero que ambos convivan […] cada tanto cambia a la otra». O sea: NO
  // se reemplaza una piel por otra, las DOS quedan — la low-poly de este
  // valle (`armarPerro`, ya existía) y la realista de la PWA portada en
  // `perros-realistas.js` — colgando del MISMO ancla/huesos (mismo perro,
  // misma ruta, mismo tamaño), y solo una visible a la vez. `a.G` pasa a ser
  // el CONTENEDOR de pose (posición, rumbo, piso angular); adentro viven
  // `a.valle` y `a.real`, cada uno con su propio Group ya escalado.
  const perros = PERROS.map((p) => {
    const valle = armarPerro(p);
    const G = new THREE.Group();
    G.add(valle.G);
    return { P: p, G, valle, real: null, altoNatural: valle.altoNatural };
  });
  // ── EL ANCLA DE ALZADA, IMPUESTA POR CÓDIGO ─────────────────────────────
  // `AUDITORIA-VALLE.md` §132-144 y `LEY-VISUAL-VALLE.md:127` fijan Oliver
  // **0,595 u** y Dante **0,349 u**, y `HojaPruebaValle.jsx:222` lo llama «el
  // ancla de Oliver, INTOCABLE». Este valle corre en otra escala, así que lo
  // que se conserva es la RELACIÓN 0,349/0,595 = 0,5866.
  // No se deja librada a que los parámetros de geometría den la cuenta: al
  // afinar orejas y cola la relación se fue a 0,572 sola. Se MIDE la caja
  // envolvente de cada uno y se corrige el escalado de Dante para que la
  // relación sea exacta. Así el ancla sobrevive a cualquier retoque futuro
  // del dibujo — que es lo que quiere decir «intocable». Esto NO cambia: se
  // sigue midiendo y corrigiendo sobre la piel low-poly (`a.valle`), y el
  // resultado (`altoNatural`) es el mismo número que ahora alimenta TAMBIÉN
  // a la piel realista — así el cambio de piel nunca cambia el tamaño.
  const RELACION_ANCLA = 0.349 / 0.595;
  const oliver = perros.find((a) => a.P.nombre === 'Oliver');
  const dante = perros.find((a) => a.P.nombre === 'Dante');
  if (oliver && dante && dante.valle.altoNatural > 0) {
    const corr = (oliver.valle.altoNatural * RELACION_ANCLA) / dante.valle.altoNatural;
    dante.valle.escBase *= corr;
    dante.valle.altoNatural *= corr;
    dante.valle.G.scale.setScalar(dante.valle.escBase);
    dante.altoNatural = dante.valle.altoNatural;
  }
  // La piel realista se arma DESPUÉS del ancla y calza su Box3 contra la
  // alzada ya corregida (`armarPerroRealista` la mide y escala sola) — el
  // ancla vale para las dos pieles sin re-imponerla.
  perros.forEach((a) => {
    const p = a.P;
    a.real = armarPerroRealista(p, a.altoNatural);
    a.real.G.visible = false;                   // arranca puesta la del valle
    a.G.add(a.real.G);
    grupo.add(a.G);
    a.s = p.nombre === 'Dante' ? 0.985 : 0;     // Dante entra un pelo atrás
    a.rumbo = 0; a.rec = 0;
  });

  // ── EL CAMBIO DE PIEL — los dos perros, AL TIEMPO ───────────────────────
  // Cada CAMBIO_CADA_S los DOS cambian juntos («que transicionen los dos
  // perros al tiempo»). Squash & stretch: la piel que sale se AGACHA en
  // anticipación y se enrosca hasta desaparecer; la piel nueva BROTA con
  // rebote elástico y aterriza en su tamaño exacto — vocabulario de la casa,
  // NO un corte seco.
  const CAMBIO_CADA_S = 45;
  const CAMBIO_DUR = 1.1;
  const CORTE = 0.5;                            // el instante del cambio real
  let pielActiva = 'valle';
  let tCambio = CAMBIO_CADA_S;
  let cambio = null;

  // ── LA PAREJA DE SOMBRERO NEGRO: aparecer, trabajar, irse ────────────────
  // (el porqué largo está arriba, junto a `OFICIO`)
  const ELEGIBLES = MUNDOS.filter((m) => OFICIO[m.id]);
  const gente = [];
  if (!_ES_NOCHE && !_APAGADOS && ELEGIBLES.length) {
    for (const [quien, rol] of [['campesinoV', 'el'], ['campesinaV', 'ella']]) {
      const c = crearCampesinoV(quien, ALTO_CAMPESINO);
      grupo.add(c.sprite);
      gente.push({
        c, rol, estado: 'fuera', t0: 0,
        // el primero puede salir casi enseguida; el otro se hace esperar
        dur: rol === 'el' ? 6 + Math.random() * 16 : 24 + Math.random() * 40,
        mundo: null, ultimo: null, citado: null,
        x: 0, y: 0, z: 0, rumbo: 0, giro: 0,
      });
    }
  }
  const ESPERA = [26, 96];     // el hueco en que la finca queda sola (s)
  const JORNADA = [30, 72];    // lo que dura un turno de trabajo (s)
  const BROTE_S = 0.9, IDA_S = 0.62;
  const JUNTOS = 0.4;          // 4 de cada 10 turnos caen en el mismo mundo

  function sortearMundo(evitar) {
    let tot = 0;
    for (const m of ELEGIBLES) if (m.id !== evitar) tot += OFICIO[m.id].peso;
    let r = Math.random() * tot;
    for (const m of ELEGIBLES) {
      if (m.id === evitar) continue;
      r -= OFICIO[m.id].peso;
      if (r <= 0) return m;
    }
    return ELEGIBLES[ELEGIBLES.length - 1];
  }
  // Lo planta DENTRO del clúster del mundo (radio propio de cada faena), no en
  // el mojón: un campesino parado sobre el letrero no está trabajando.
  function plantar(g, M, junto) {
    const O = OFICIO[M.id];
    const R = (RADIO[M.id] || 9) * ESC * O.r;
    if (junto) {
      // cerca, pero sin encimarse: 4 a 9 u ≈ 7 a 15 m. Más lejos y dejan de
      // leerse como dos que están en la misma faena.
      const a = Math.random() * Math.PI * 2, d = 4 + Math.random() * 5;
      g.x = junto.x + Math.cos(a) * d; g.z = junto.z + Math.sin(a) * d;
    } else {
      // ANILLO EXTERIOR, no el centro: todos los clústeres tienen su bulto en
      // el medio (la pila, la tarima de la era, el bebedero, la terraza), y
      // parado ahí el campesino queda enterrado hasta la cintura — visto en
      // `cv-el-cerca`. Trabajando alrededor del bulto se le ve entero Y se lee
      // qué está atendiendo.
      const a = Math.random() * Math.PI * 2, d = R * (0.72 + Math.random() * 0.5);
      g.x = M.x + Math.cos(a) * d; g.z = M.z + Math.sin(a) * d;
    }
    g.mundo = M.id;
    g.ultimo = M.id;
    g.cx = M.x; g.cz = M.z; g.radio = R * 1.25;
    // ⚠️ El clúster de cada mundo es una malla RÍGIDA plantada a la cota del
    // mojón (ver arriba): en ladera flota o se entierra. Si el campesino se
    // para en `height(x,z)` a secas, en `plantas` queda POR DEBAJO del bancal y
    // desaparece detrás de la terraza — pasó, está en `cv-par-03`. Se para en
    // la cota más alta de las dos: nunca se hunde en el terreno y nunca queda
    // debajo del piso de su propio mundo.
    g.piso = height(M.x, M.z);
    g.rumbo = Math.random() * Math.PI * 2;
    g.giro = 3 + Math.random() * 5;
    g.c.ponerFaena(O[g.rol]);
  }
  function entrar(g, t) {
    const M = (g.citado && porId[g.citado] && OFICIO[g.citado]) ? porId[g.citado] : sortearMundo(g.ultimo);
    const otro = gente.find((o) => o !== g);
    const junto = (g.citado && otro && otro.mundo === g.citado && otro.estado !== 'fuera')
      ? { x: otro.x, z: otro.z } : null;
    g.citado = null;
    plantar(g, M, junto);
    g.estado = 'entra'; g.t0 = t; g.dur = BROTE_S;
    // ¿se lleva a la pareja? Sólo si el otro está esperando turno.
    if (!junto && otro && otro.estado === 'fuera' && Math.random() < JUNTOS) {
      otro.citado = M.id;
      otro.t0 = t; otro.dur = 1.2 + Math.random() * 2.8;
    }
  }
  let _tAhora = 0;
  let _pendienteForzar = _FORZADO;

  function updGente(t, dt, camara, altoPantalla) {
    _tAhora = t;
    if (!gente.length) return;
    if (_pendienteForzar) { const id = _pendienteForzar; _pendienteForzar = null; forzarGente(id); }
    for (const g of gente) {
      const v = g.dur > 0 ? (t - g.t0) / g.dur : 1;
      let esc = 1, op = 1;
      switch (g.estado) {
        case 'fuera':
          g.c.sprite.visible = false;
          if (v >= 1) entrar(g, t);
          continue;
        case 'entra':
          // sin textura todavía: se re-arma el reloj para no gastar la entrada
          // dibujando un sprite vacío (la primera faena paga un decode).
          if (!g.c.listo()) { g.t0 = t; g.c.sprite.visible = false; continue; }
          // el mismo BROTE elástico del cambio de piel de los perros: pasa de
          // largo un pelo y aterriza. Vocabulario de la casa, no un corte seco.
          esc = Math.max(1 + 2.70158 * (v - 1) ** 3 + 1.70158 * (v - 1) ** 2, 0.02);
          op = Math.min(1, v * 2.4);
          if (v >= 1) { g.estado = 'trabaja'; g.t0 = t; g.dur = JORNADA[0] + Math.random() * (JORNADA[1] - JORNADA[0]); }
          break;
        case 'trabaja':
          if (v >= 1) { g.estado = 'sale'; g.t0 = t; g.dur = IDA_S; }
          break;
        case 'sale':
          esc = Math.max(1 - v * v, 0.02);
          op = Math.max(1 - v, 0);
          if (v >= 1) {
            g.estado = 'fuera'; g.t0 = t;
            g.dur = ESPERA[0] + Math.random() * (ESPERA[1] - ESPERA[0]);
            g.c.sprite.visible = false;
            continue;
          }
          break;
        default: break;
      }
      // la deriva: avanza por el surco un metro cada tanto, sin caminata — lo
      // que se mueve es la faena. Sin esto queda clavado como un poste.
      g.giro -= dt;
      if (g.giro <= 0) { g.rumbo += (Math.random() - 0.5) * 2.0; g.giro = 3 + Math.random() * 5; }
      g.x += Math.sin(g.rumbo) * 0.11 * dt;
      g.z += Math.cos(g.rumbo) * 0.11 * dt;
      // que la deriva no lo saque del mundo donde está trabajando
      if (Math.hypot(g.x - g.cx, g.z - g.cz) > g.radio) {
        g.rumbo = Math.atan2(g.cx - g.x, g.cz - g.z) + (Math.random() - 0.5) * 0.7;
        g.giro = 4;
      }
      g.y = Math.max(height(g.x, g.z), g.piso);
      const S = g.c.sprite;
      // sin textura no hay personaje: un sprite sin mapa sale CUADRADO Y BLANCO
      // en mitad de la ladera (visto en la primera corrida con `?campesinos=`,
      // que salta la entrada y no esperaba la horneada).
      if (!g.c.listo()) { S.visible = false; continue; }
      S.visible = true;
      S.position.set(g.x, g.y, g.z);
      // El MISMO piso angular de los perros, y el número sale de ELLOS. Dante y
      // Oliver piden 20 px; pero ojo, **los perros de este valle ya están
      // dibujados grandes**: Oliver mide 0,595 u = 0,99 m a la cruz, y un
      // dálmata real mide 0,60. O sea que la relación honesta persona/perro
      // sobre el suelo de este valle no es 1,7 sino ~2,9 — y con 40 px el
      // campesino salía más bajo que el perro que le pasa al lado. 58 px lo
      // pone donde el ojo lo espera. Tope ×9: desde el páramo no son torres.
      const k = camara ? factorVisible(camara, S.position, ALTO_CAMPESINO, 58, 9, altoPantalla) : 1;
      g.c.escalar(k * esc);
      S.position.y -= ALTO_CAMPESINO * k * esc * g.c.padPies;   // la suela al suelo
      S.material.opacity = op;
      g.c.update(t);
    }
  }
  function forzarGente(id) {
    if (!gente.length) return null;
    const M = (porId[id] && OFICIO[id]) ? porId[id] : sortearMundo(null);
    let junto = null;
    for (const g of gente) {
      plantar(g, M, junto);
      junto = { x: g.x, z: g.z };
      g.citado = null;
      g.estado = 'trabaja'; g.t0 = _tAhora; g.dur = 1e6;
    }
    return M.id;
  }

  const _v = new THREE.Vector3();
  let tPrev = 0;
  // `camara` llega desde main.js: sin ella el piso angular no se puede aplicar
  // (y todo lo vivo vuelve a medir 2 px desde la panorámica).
  function update(t, camara) {
    const dt = Math.min(tPrev ? t - tPrev : 0.016, 0.1); tPrev = t;
    const altoPantalla = (typeof innerHeight === 'number' && innerHeight) || 800;
    updGente(t, dt, camara, altoPantalla);

    // el hato: caminatas cortas y paradas a pastar
    for (const R of bichos) {
      for (let i = 0; i < R.st.length; i++) {
        const b = R.st[i];
        b.t -= dt;
        if (b.t <= 0) { b.pasta = !b.pasta; b.t = b.pasta ? 5 + rnd() * 7 : 3 + rnd() * 4; if (!b.pasta) b.rumbo += (rnd() - 0.5) * 2.2; }
        if (!b.pasta) {
          const v = 0.85;
          b.x += Math.sin(b.rumbo) * v * dt; b.z += Math.cos(b.rumbo) * v * dt;
          const d = Math.hypot(b.x - corral.x, b.z - corral.z);
          if (d > R.radio) b.rumbo = Math.atan2(corral.x - b.x, corral.z - b.z) + (rnd() - 0.5) * 0.6;
        }
        _o.position.set(b.x, height(b.x, b.z), b.z);
        _o.rotation.set(0, b.rumbo, b.pasta ? 0.12 : 0);   // pastando: cabeza abajo
        // el hato pide menos piso que los perros: va en manada dentro del
        // corral, y lo que se lee de lejos es el REBAÑO, no la res suelta.
        const kb = camara ? factorVisible(camara, _o.position, R.altoGeo * b.esc, 11, 2.6, altoPantalla) : 1;
        _o.scale.setScalar(b.esc * kb);
        _o.updateMatrix();
        R.m.setMatrixAt(i, _o.matrix);
      }
      R.m.instanceMatrix.needsUpdate = true;
    }

    // ── EL CAMBIO DE PIEL, los dos AL TIEMPO ──
    if (!cambio && t >= tCambio) cambio = { t0: t, solto: false };
    let uCambio = -1;
    if (cambio) {
      uCambio = (t - cambio.t0) / CAMBIO_DUR;
      if (!cambio.solto && uCambio >= CORTE) {
        // el instante del cambio: se alterna la piel de LOS DOS en el mismo
        // frame — es todo el truco (la que sale ya se enroscó casi a nada,
        // la que entra arranca del mismo tamaño chico y brota).
        cambio.solto = true;
        pielActiva = pielActiva === 'valle' ? 'real' : 'valle';
        for (const a of perros) {
          a.valle.G.visible = pielActiva === 'valle';
          a.real.G.visible = pielActiva === 'real';
        }
      }
      if (uCambio >= 1) {
        cambio = null;
        tCambio = t + CAMBIO_CADA_S;
        for (const a of perros) {
          for (const piel of [a.valle, a.real]) {
            piel.G.rotation.y = 0;
            piel.G.scale.setScalar(piel.escBase);   // aterrizó: tamaño exacto
          }
        }
      }
    }

    // los perros: rumbo suavizado y TROTE ATADO A LA DISTANCIA (cero patinaje)
    for (const a of perros) {
      const avance = a.P.vel * dt;
      a.s = (a.s + avance / RUTA.total) % 1;
      a.rec += avance;
      const q = puntoEnRuta(RUTA, a.s);
      const rr = rumboY(q.dx, q.dz);
      a.rumbo += giroCorto(a.rumbo, rr) * Math.min(1, dt * 3.4);
      // la banquina: cada uno por su lado del sendero (van juntos, no encimados)
      const nx = Math.cos(a.rumbo), nz = -Math.sin(a.rumbo);
      const x = q.x + nx * a.P.banquina, z = q.z + nz * a.P.banquina;
      a.G.position.set(x, height(x, z), z);
      a.G.rotation.y = a.rumbo - Math.PI / 2;
      // ── el piso angular: Dante y Oliver NO desaparecen ──
      // 20 px de alto mínimo. Es la mitad del escudo de un mundo (≈58 px en la
      // panorámica): se leen como dos bichos que se mueven por la finca sin
      // competir con los rótulos. Tope ×7 para que mirar desde el páramo (2 km)
      // no los vuelva dos torres. De cerca el factor es 1: perros normales.
      // El piso ahora va en `a.G` (el CONTENEDOR de pose): las dos pieles
      // cuelgan del mismo ancla, así que el mismo factor `k` las alcanza a
      // las dos por igual sin tocar su `escBase` individual.
      let k = 1;
      if (camara) k = factorVisible(camara, a.G.position, a.altoNatural, 20, 7, altoPantalla);
      a.G.scale.setScalar(k);

      // ── el ciclo de marcha, sobre LA PIEL VISIBLE de este instante ──
      // (las dos comparten la misma interfaz {patas,cola,cabeza} con pivote
      // propio, así que el mismo motor de marcha anima cualquiera de las dos)
      const piel = pielActiva === 'valle' ? a.valle : a.real;
      const zancada = 1.5 * a.P.esc;
      const f = (a.rec / zancada) * Math.PI * 2 + a.P.fase;
      const AMP = 0.55;
      piel.patas[0].rotation.z = Math.sin(f) * AMP;
      piel.patas[3].rotation.z = Math.sin(f) * AMP;
      piel.patas[1].rotation.z = Math.sin(f + Math.PI) * AMP;
      piel.patas[2].rotation.z = Math.sin(f + Math.PI) * AMP;
      a.G.position.y += Math.abs(Math.sin(f)) * 0.09 * a.P.esc;   // vaivén de paso
      // cada piel menea la cola por SU eje: la low-poly y la bandera del
      // beagle van paradas (eje x); el sable de Oliver realista cuelga
      // hacia atrás y menea de lado (eje y) — lo declara `ejeCola` del port.
      piel.cola.rotation[piel.ejeCola || 'x'] = Math.sin(f * 0.5) * 0.5;
      piel.cabeza.rotation.z = Math.sin(f * 0.5) * 0.06;

      // ── la transición linda, sobre la piel visible de ESTE instante ──
      // (antes del corte anima la que SALE; después, la que ENTRA — la otra
      // ya quedó invisible, con animar la visible alcanza)
      if (uCambio >= 0 && uCambio < 1) {
        if (uCambio < CORTE) {
          const v = uCambio / CORTE;
          // anticipación: se AGACHA (squash) mientras arranca el trompo, y
          // al final se enrosca hasta casi desaparecer.
          const agacha = Math.sin(Math.min(v * 2.2, 1) * Math.PI) * 0.30;
          const chico = v < 0.55 ? 1 : Math.max(1 - ((v - 0.55) / 0.45) ** 1.6, 0.05);
          piel.G.rotation.y = v * v * Math.PI * 5;
          piel.G.scale.set(
            piel.escBase * (1 + agacha * 0.55) * chico,
            piel.escBase * (1 - agacha) * chico,
            piel.escBase * (1 + agacha * 0.55) * chico,
          );
        } else {
          const v = (uCambio - CORTE) / (1 - CORTE);
          // el brote elástico (backOut): pasa de largo un pelo y aterriza,
          // des-girando el trompo hasta clavar el rumbo en cero.
          const c1 = 1.70158, c3 = c1 + 1;
          const brota = Math.max(1 + c3 * (v - 1) ** 3 + c1 * (v - 1) ** 2, 0.05);
          const aplasta = 1 + Math.sin(v * Math.PI * 2) * 0.18 * (1 - v);
          piel.G.rotation.y = (1 - v) * (1 - v) * -Math.PI * 3;
          piel.G.scale.set(
            piel.escBase * brota * aplasta,
            piel.escBase * brota / aplasta,
            piel.escBase * brota * aplasta,
          );
        }
      }
    }
  }

  return {
    update, grupo, perros,
    // hooks del gate: qué piel llevan puesta y forzar el cambio sin esperar
    // los 45 s reales (mismo espíritu que `paseo.forzar()` de main.js).
    piel: () => pielActiva,
    cambiarPiel: () => { tCambio = 0; },
    // la pareja de sombrero negro: mismo espíritu de hook. `forzar(mundoId)`
    // los planta ya trabajando ahí — sin esto retratarlos es esperar la lotería.
    campesinos: {
      estado: () => gente.map((g) => ({
        quien: g.c.sprite.name, estado: g.estado, mundo: g.mundo,
        faena: g.c.faena(), pos: [Math.round(g.x), Math.round(g.y), Math.round(g.z)],
      })),
      forzar: forzarGente,
    },
  };
}
