/**
 * celula.js — geometría procedural + fichas educativas de la célula vegetal.
 * Cero binarios: todo esferas/cápsulas/toros deformados con ruido + CanvasTexture.
 * Determinista (RNG sembrado de lib3d/core/RNG.js).
 *
 * Exporta:
 *   construirEscenaCelula(RNG) -> { contenedor, piso, radioCelula }
 *       contenedor: THREE.Group vacío con la pared+membrana+citoplasma+"huecos" marcados
 *   crearPiezas(RNG) -> [{ id, mesh, posDestino, rotDestino, radioSnap, ficha }, ...]
 *       cada pieza ya tiene geometría propia, lista para que rompecabezas3d.js la gobierne.
 */

import * as THREE from 'three';
import { Ruido } from '../core/RNG.js';
import { Brush, Evaluator, SUBTRACTION } from '../geom/three-bvh-csg.js';

// ---------- paleta ilustrada Humboldt (saturada, plana, NO fotorrealista) ----------
const PALETA = {
  pared: 0xd9c48a,        // celulosa, ocre cálido
  membrana: 0xf2e6b8,
  citoplasma: 0xcdeccb,   // verde muy pálido translúcido
  nucleo: 0x6a4fb0,       // violeta
  nucleolo: 0x3d2c73,
  cloroplasto: 0x2f8f4e,
  tilacoide: 0x1c5c30,
  vacuola: 0x8fd6e8,      // celeste agua
  mitocondria: 0xc7523c,  // rojo terracota
  re: 0xe0a63f,           // retículo, ámbar
  golgi: 0xd97fb0,        // rosa
  ribosoma: 0x3a3a3a,
  citoesqueleto: 0x9a8360,
};

/** Textura de ruido orgánico generada 100% en código (canvas), sin archivos. */
function texturaOrganica(rng, colorBase, colorDetalle, size = 128) {
  const cnv = document.createElement('canvas');
  cnv.width = cnv.height = size;
  const ctx = cnv.getContext('2d');
  const ruido = new Ruido(rng.int(0, 999999));
  const img = ctx.createImageData(size, size);
  const cb = new THREE.Color(colorBase), cd = new THREE.Color(colorDetalle);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = (ruido.fbm(x / 18, y / 18, 4) + 1) / 2;
      const c = cb.clone().lerp(cd, n * 0.6);
      const i = (y * size + x) * 4;
      img.data[i] = c.r * 255; img.data[i + 1] = c.g * 255; img.data[i + 2] = c.b * 255; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cnv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Deforma una BufferGeometry de esfera con fbm para dar look "orgánico, no perfecto". */
function deformarOrganico(geo, ruido, amplitud = 0.08, escala = 2.2, semillaOffset = 0) {
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = ruido.fbm(v.x * escala + semillaOffset, v.y * escala + semillaOffset, 3, 2.0, 0.55) * 0.5
      + ruido.fbm(v.z * escala - semillaOffset, v.x * escala, 3) * 0.5;
    v.addScaledVector(v.clone().normalize(), n * amplitud);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function crearResaltadoMesh(mesh, colorBase) {
  // Wrapper para exponer setResaltado(bool) — usado por rompecabezas3d.js como feedback de "cerca del sitio"
  const emisivoOriginal = new THREE.Color(0x000000);
  mesh.traverse((o) => {
    if (o.isMesh && o.material && 'emissive' in o.material) {
      o.userData._matBase = o.material;
    }
  });
  mesh.userData.setResaltado = (activo) => {
    mesh.traverse((o) => {
      if (o.isMesh && o.material && 'emissive' in o.material) {
        o.material.emissive.set(activo ? 0xfff4b0 : 0x000000);
        o.material.emissiveIntensity = activo ? 0.9 : 0;
      }
    });
  };
}

// ============================================================
// ESCENA BASE: pared celular + membrana + citoplasma (el "tablero" del puzzle)
// ============================================================
export function construirEscenaCelula(rng) {
  const ruido = new Ruido(rng.int(0, 999999));
  const contenedor = new THREE.Group();
  contenedor.name = 'celula-base';
  const R = 5.2; // radio aproximado de la célula

  // Pared celular: caja redondeada translúcida (rasgo vegetal vs animal) — la "caja del puzzle"
  const geoPared = new THREE.BoxGeometry(R * 1.9, R * 1.5, R * 1.9, 6, 6, 6);
  deformarOrganico(geoPared, ruido, 0.12, 0.35, 11);
  const matPared = new THREE.MeshStandardMaterial({
    color: PALETA.pared, transparent: true, opacity: 0.16,
    roughness: 0.9, metalness: 0.0, side: THREE.DoubleSide, depthWrite: false,
  });
  const pared = new THREE.Mesh(geoPared, matPared);
  pared.name = 'pared-celular';
  contenedor.add(pared);

  // líneas de la pared (aristas) para que se lea como celda prismática, no esfera blob
  const wire = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(R * 1.9, R * 1.5, R * 1.9)),
    new THREE.LineBasicMaterial({ color: 0xb89a4e, transparent: true, opacity: 0.35 })
  );
  contenedor.add(wire);

  // Membrana plasmática: capa interior, un poco más chica
  const geoMembrana = new THREE.SphereGeometry(R * 0.92, 32, 24);
  deformarOrganico(geoMembrana, ruido, 0.1, 0.4, 47);
  const matMembrana = new THREE.MeshStandardMaterial({
    color: PALETA.membrana, transparent: true, opacity: 0.10,
    roughness: 0.6, side: THREE.DoubleSide, depthWrite: false,
  });
  contenedor.add(new THREE.Mesh(geoMembrana, matMembrana));

  // Citoplasma: relleno sutil con textura de ruido (da sensación de medio acuoso)
  const texCito = texturaOrganica(rng, 0xdcf5d8, 0xb8e8ba, 96);
  const geoCito = new THREE.SphereGeometry(R * 0.86, 24, 18);
  const matCito = new THREE.MeshStandardMaterial({
    color: PALETA.citoplasma, map: texCito, transparent: true, opacity: 0.14,
    roughness: 1.0, depthWrite: false,
  });
  contenedor.add(new THREE.Mesh(geoCito, matCito));

  return { contenedor, radioCelula: R, ruido };
}

// ============================================================
// ORGANELOS — cada builder devuelve un THREE.Group centrado en origen local
// ============================================================

// Evaluator CSG compartido (three-bvh-csg) — reutilizado por todos los organelos que tallan hueco real.
const evaluadorCSG = new Evaluator();

/**
 * Envoltura nuclear con cavidad real tallada por CSG (three-bvh-csg): Brush esfera-sólida
 * MENOS Brush esfera-interior-descentrada (SUBTRACTION) = cáscara de espesor variable con
 * un hueco genuino donde se aloja el nucléolo — no una capa de opacidad fingiendo profundidad.
 * Esto es lo que justifica traer CSG al puzzle: la forma de la PIEZA (no solo su textura)
 * queda determinada por la resta booleana.
 */
function envolturaNuclearCSG(ruido) {
  const geoExt = new THREE.SphereGeometry(1.05, 28, 20);
  deformarOrganico(geoExt, ruido, 0.06, 0.9, 3);
  const brushExt = new Brush(geoExt);
  brushExt.updateMatrixWorld();

  // esfera interior descentrada: define dónde queda la cavidad (y por tanto el espesor
  // asimétrico de la envoltura — más delgada del lado del nucléolo, más gruesa del opuesto).
  const geoInt = new THREE.SphereGeometry(0.86, 20, 16);
  const brushInt = new Brush(geoInt);
  brushInt.position.set(0.22, 0.12, 0.08);
  brushInt.updateMatrixWorld();

  const resultado = evaluadorCSG.evaluate(brushExt, brushInt, SUBTRACTION);
  resultado.geometry.computeVertexNormals();
  resultado.material = new THREE.MeshStandardMaterial({
    color: PALETA.nucleo, roughness: 0.55, transparent: true, opacity: 0.85,
    emissive: 0x000000, side: THREE.DoubleSide,
  });
  return resultado;
}

function organeloNucleo(rng, ruido) {
  const g = new THREE.Group();
  const esfera = envolturaNuclearCSG(ruido);
  g.add(esfera);
  // nucléolo: esfera densa interior, alojada exactamente en la cavidad tallada por CSG arriba
  const nucleolo = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 14, 10),
    new THREE.MeshStandardMaterial({ color: PALETA.nucleolo, roughness: 0.4 })
  );
  nucleolo.position.set(0.25, 0.15, 0.1);
  g.add(nucleolo);
  // envoltura nuclear con poros (anillos finos)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const poro = new THREE.Mesh(
      new THREE.TorusGeometry(0.05, 0.012, 6, 10),
      new THREE.MeshStandardMaterial({ color: 0x2a1f52 })
    );
    poro.position.set(Math.cos(a) * 1.03, Math.sin(a * 1.7) * 0.5, Math.sin(a) * 1.03);
    poro.lookAt(0, poro.position.y, 0);
    g.add(poro);
  }
  return g;
}

function organeloCloroplasto(rng, ruido, escala = 1) {
  const g = new THREE.Group();
  // cápsula verde (elipsoide alargado — forma característica de lente)
  const geo = new THREE.SphereGeometry(1, 20, 14);
  geo.scale(1.35, 0.7, 0.85);
  deformarOrganico(geo, ruido, 0.05, 1.2, 71);
  const mat = new THREE.MeshStandardMaterial({ color: PALETA.cloroplasto, roughness: 0.5 });
  const cuerpo = new THREE.Mesh(geo, mat);
  cuerpo.scale.setScalar(escala);
  g.add(cuerpo);
  // tilacoides insinuados: pilas de discos finos apilados (grana)
  const matTila = new THREE.MeshStandardMaterial({ color: PALETA.tilacoide, roughness: 0.4 });
  for (let pila = 0; pila < 4; pila++) {
    const px = (rng.float(-0.7, 0.7)) * escala;
    const pz = (rng.float(-0.4, 0.4)) * escala;
    const nDiscos = rng.int(3, 5);
    for (let d = 0; d < nDiscos; d++) {
      const disco = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09 * escala, 0.09 * escala, 0.02 * escala, 10),
        matTila
      );
      disco.position.set(px, (-0.25 + d * 0.045) * escala, pz);
      g.add(disco);
    }
  }
  return g;
}

function organeloVacuola(rng, ruido) {
  const geo = new THREE.SphereGeometry(1.7, 22, 16);
  deformarOrganico(geo, ruido, 0.08, 0.6, 91);
  // MeshStandardMaterial transparente en vez de MeshPhysicalMaterial+transmission: sin un
  // environment map (PMREM) en la escena, `transmission` renderiza como blanco sobreexpuesto
  // (y con bloom encima, peor) en vez de vidrio celeste — look producto/estudio plano, no
  // fotorrealista, así que opacity simple da el resultado deseado con menos riesgo.
  const mat = new THREE.MeshStandardMaterial({
    color: PALETA.vacuola, transparent: true, opacity: 0.42,
    roughness: 0.35, metalness: 0.0, depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  const g = new THREE.Group();
  g.add(mesh);
  return g;
}

function organeloMitocondria(rng, ruido) {
  const g = new THREE.Group();
  const geo = new THREE.CapsuleGeometry(0.32, 0.7, 8, 14);
  deformarOrganico(geo, ruido, 0.03, 1.8, 123);
  const mat = new THREE.MeshStandardMaterial({ color: PALETA.mitocondria, roughness: 0.55 });
  const cuerpo = new THREE.Mesh(geo, mat);
  cuerpo.rotation.z = Math.PI / 2;
  g.add(cuerpo);
  // crestas internas (líneas onduladas) sugeridas con toroides finos aplanados
  const matCresta = new THREE.MeshStandardMaterial({ color: 0x8a2f20, roughness: 0.5 });
  for (let i = -2; i <= 2; i++) {
    const cresta = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 6, 12), matCresta);
    cresta.position.x = i * 0.18;
    cresta.rotation.y = Math.PI / 2;
    cresta.scale.set(1, 1.3, 1);
    g.add(cresta);
  }
  return g;
}

function organeloReticulo(rng, ruido) {
  // retículo endoplásmico: tubo curvo plegado (CatmullRom) — láminas conectadas al núcleo
  const g = new THREE.Group();
  const pts = [];
  const rngLocal = rng;
  let p = new THREE.Vector3(0, 0, 0);
  for (let i = 0; i < 10; i++) {
    p = p.clone().add(new THREE.Vector3(rngLocal.float(-0.3, 0.3), rngLocal.float(0.15, 0.3), rngLocal.float(-0.3, 0.3)));
    pts.push(p.clone());
  }
  const curva = new THREE.CatmullRomCurve3(pts);
  const geo = new THREE.TubeGeometry(curva, 64, 0.09, 8, false);
  const mat = new THREE.MeshStandardMaterial({ color: PALETA.re, roughness: 0.5 });
  g.add(new THREE.Mesh(geo, mat));
  // ribosomas adosados (puntitos oscuros) — RE rugoso
  const geoRibo = new THREE.SphereGeometry(0.045, 6, 5);
  const matRibo = new THREE.MeshStandardMaterial({ color: PALETA.ribosoma });
  for (let i = 0; i < 22; i++) {
    const t = i / 22;
    const pt = curva.getPointAt(t);
    const ribo = new THREE.Mesh(geoRibo, matRibo);
    ribo.position.copy(pt).add(new THREE.Vector3(rngLocal.float(-0.1, 0.1), rngLocal.float(-0.1, 0.1), rngLocal.float(-0.1, 0.1)));
    g.add(ribo);
  }
  return g;
}

function organeloGolgi(rng, ruido) {
  // aparato de Golgi: pilas de "platos" curvos apilados y desplazados (dictiosoma)
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: PALETA.golgi, roughness: 0.5, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) {
    const curvatura = new THREE.TorusGeometry(0.38 - i * 0.02, 0.05, 6, 16, Math.PI * 1.3);
    const plato = new THREE.Mesh(curvatura, mat);
    plato.position.y = i * 0.09;
    plato.rotation.x = Math.PI / 2;
    plato.rotation.z = i * 0.08;
    g.add(plato);
  }
  return g;
}

function organeloCitoesqueleto(rng, ruido, radioCelula) {
  // microtúbulos: líneas rectas radiales tenues (sugerido, no protagonista del puzzle pero decora)
  const g = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({ color: PALETA.citoesqueleto, transparent: true, opacity: 0.25 });
  for (let i = 0; i < 14; i++) {
    const dir = new THREE.Vector3(rng.float(-1, 1), rng.float(-1, 1), rng.float(-1, 1)).normalize();
    const len = rng.float(1.5, radioCelula * 0.8);
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), dir.clone().multiplyScalar(len)]);
    g.add(new THREE.Line(geo, mat));
  }
  return g;
}

// ============================================================
// FICHAS EDUCATIVAS — biología + anclaje agro (el diferencial Chagra)
// ============================================================
const FICHAS = {
  pared: {
    titulo: 'Pared celular',
    funcion: 'Capa rígida de celulosa fuera de la membrana. Da soporte estructural y protege del estrés osmótico.',
    agro: 'Por eso la planta se sostiene erguida sin esqueleto: la presión de la vacuola contra la pared rígida es lo que la mantiene "parada". Es la razón botánica de que las plantas no necesiten huesos.',
  },
  nucleo: {
    titulo: 'Núcleo',
    funcion: 'Contiene el ADN (el manual de instrucciones de la planta) y el nucléolo, donde se fabrican los ribosomas.',
    agro: 'Cada célula de la mata lleva el mismo genoma completo — por eso un esqueje o una yema puede regenerar una planta entera: el manual está en todas partes.',
  },
  cloroplasto: {
    titulo: 'Cloroplasto',
    funcion: 'Aquí ocurre la fotosíntesis: luz + agua + CO₂ → azúcar + oxígeno. Los tilacoides (las pilas verde oscuro) son donde se captura la luz.',
    agro: 'Es la razón botánica de por qué la luz y el piso térmico mandan en el cultivo: sin luz suficiente no hay fotosíntesis, no hay azúcar, no hay crecimiento. Cultivo a la sombra equivocada = cloroplastos trabajando a media máquina.',
  },
  vacuola: {
    titulo: 'Vacuola central',
    funcion: 'Bolsa grande llena de agua y sales que ocupa la mayoría del volumen celular. Rasgo distintivo de la célula vegetal (la animal no la tiene tan grande).',
    agro: 'La presión de esta agua contra la pared celular (turgencia) es lo que mantiene la planta firme. Cuando falta agua, la vacuola se desinfla, la presión cae y la planta se marchita — el síntoma visible de sequía nace exactamente aquí.',
  },
  mitocondria: {
    titulo: 'Mitocondria',
    funcion: 'La "central energética": convierte el azúcar producido en los cloroplastos en ATP, la energía que usa la célula para todo lo demás (de día y de noche).',
    agro: 'Mientras el cloroplasto solo trabaja con luz, la mitocondria trabaja 24/7 — es la respiración celular, complementaria a la fotosíntesis.',
  },
  re: {
    titulo: 'Retículo endoplásmico',
    funcion: 'Red de membranas plegadas donde se fabrican y transportan proteínas y lípidos. Los puntitos oscuros son ribosomas (RE rugoso).',
    agro: 'Es la línea de ensamblaje interna: sin ella la célula no puede fabricar las proteínas que necesita para crecer o defenderse de una plaga.',
  },
  golgi: {
    titulo: 'Aparato de Golgi',
    funcion: 'Recibe lo fabricado en el retículo, lo empaqueta y lo envía a su destino final (incluida la pared celular).',
    agro: 'Buena parte del material que refuerza la pared celular ante un ataque de hongo pasa por aquí antes de llegar a su sitio — es la oficina de despachos de la célula.',
  },
};

// ============================================================
// PIEZAS DEL ROMPECABEZAS — geometría + destino + ficha, listas para rompecabezas3d.js
// ============================================================
export function crearPiezas(rng, radioCelula) {
  const ruido = new Ruido(rng.int(0, 999999));
  const defs = [
    { id: 'nucleo', build: () => organeloNucleo(rng, ruido), destino: new THREE.Vector3(0.9, 0.5, 0.6), radioSnap: 1.1, ficha: FICHAS.nucleo },
    { id: 'vacuola', build: () => organeloVacuola(rng, ruido), destino: new THREE.Vector3(-1.1, -0.3, -0.7), radioSnap: 1.5, ficha: FICHAS.vacuola },
    { id: 'cloroplasto-1', build: () => organeloCloroplasto(rng, ruido, 1.0), destino: new THREE.Vector3(3.6, 2.0, 1.7), radioSnap: 1.0, ficha: FICHAS.cloroplasto },
    { id: 'cloroplasto-2', build: () => organeloCloroplasto(rng, ruido, 0.85), destino: new THREE.Vector3(-3.3, 2.3, -2.1), radioSnap: 1.0, ficha: FICHAS.cloroplasto },
    { id: 'mitocondria-1', build: () => organeloMitocondria(rng, ruido), destino: new THREE.Vector3(2.9, -1.9, -1.5), radioSnap: 0.9, ficha: FICHAS.mitocondria },
    { id: 'mitocondria-2', build: () => organeloMitocondria(rng, ruido), destino: new THREE.Vector3(-2.6, -2.2, 2.0), radioSnap: 0.9, ficha: FICHAS.mitocondria },
    { id: 're', build: () => organeloReticulo(rng, ruido), destino: new THREE.Vector3(1.6, -0.9, 2.4), radioSnap: 1.0, ficha: FICHAS.re },
    { id: 'golgi', build: () => organeloGolgi(rng, ruido), destino: new THREE.Vector3(-0.9, 1.5, 2.7), radioSnap: 0.9, ficha: FICHAS.golgi },
  ];

  const piezas = [];
  const nPiezas = defs.length;
  const radioSuelta = radioCelula * 1.55;
  defs.forEach((d, i) => {
    const mesh = d.build();
    crearResaltadoMesh(mesh, 0xffffff);
    // Proxy de picking/arrastre: cada organelo es un THREE.Group con VARIOS meshes hijos
    // (esfera+nucléolo+poros, cuerpo+crestas, discos apilados del Golgi, etc.) — DragControls
    // (three.js core) hace raycasting RECURSIVO y mueve exactamente el objeto hoja intersectado,
    // no el Group contenedor. Si le pasáramos el Group directo, DragControls terminaría moviendo
    // un sub-mesh interno (ej. un solo disco del Golgi) en vez de la pieza completa.
    // Solución: un único Mesh invisible ("pickHelper") por pieza, agregado como HERMANO del
    // grupo en la escena (no como hijo) y mantenido en la misma posición mundial — es el único
    // objeto que se le pasa a DragControls. rompecabezas3d.js sincroniza mesh.position con
    // pickHelper.position en cada evento 'drag'. Generoso (radio 0.55) para que piezas finas
    // (retículo = tubo delgado, Golgi = discos finos) sean fáciles de agarrar con el cursor.
    const pickHelper = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 8, 6),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, depthTest: false })
    );
    pickHelper.renderOrder = -1; // no debe pintar nada visible ni afectar el z-buffer
    pickHelper.userData.esPickHelperDe = d.id;
    const a = (i / nPiezas) * Math.PI * 2;
    const posSuelta = new THREE.Vector3(
      Math.cos(a) * radioSuelta,
      rng.float(-0.5, 3.2),
      Math.sin(a) * radioSuelta
    );
    piezas.push({
      id: d.id,
      mesh,
      pickHelper,
      posSuelta,
      posDestino: d.destino,
      rotDestino: new THREE.Euler(0, 0, 0),
      radioSnap: d.radioSnap,
      ficha: d.ficha,
    });
  });
  return piezas;
}

export function crearPiezaPared() {
  // la pared celular / citoesqueleto se muestran como decorado fijo del "tablero", no como pieza a encajar
  // (encajar la caja misma no tiene sentido de puzzle) — se deja fuera de crearPiezas() a propósito.
  return null;
}

export { PALETA, FICHAS };
