// ── condorParamo.js — EL CÓNDOR DE LOS ANDES (Vultur gryphus) ────────────────
//
// «El señor del viento. Casi no aletea: planea las térmicas, y verlo cruzar el
//  cielo es saber que el páramo está sano.» (copy del CondorCielo3D de la PWA)
//
// DE DÓNDE SALE (no se dibujó de cero):
//  · El COMPORTAMIENTO viene de los dos modos que ya pasaron gate en la PWA
//    (CondorBillboard: `orbita` cerca + `cruce` lejano) y del mockup
//    MundoParamo3D.jsx (órbita lenta vel≈0.12, ala abisagrada, bob térmico).
//    Los assets de allá son billboards pixel-art minificados del build React:
//    NO se copian — este módulo es geometría nativa del lenguaje del valle
//    (Lambert flatShading, primitivas con silueta, cero PBR).
//  · La SILUETA es la del animal real, que es lo que lo hace inconfundible a
//    contraluz: envergadura ~3 m (2,7-3,3 real), COLLAR BLANCO al cuello,
//    PANEL ALAR BLANCO por ENCIMA (macho — solo se ve al ladearse: FrontSide),
//    primarias abiertas en DEDOS con las puntas alzadas, cola en cuña.
//  · Vuelo: planeo. El aleteo es rarísimo (flex lento de bisagra), el cuerpo
//    se BANQUEA hacia el centro del giro y la térmica lo sube y baja despacio.
//
// PORTABILIDAD: fábrica pura, recibe THREE (misma convención que entParamo y
// FollajeMasa). Determinista: cero Math.random. NO cablea nada — quien lo
// quiera en un mundo lo añade y llama grupo.userData.actualizar(t).

const C = {
  plumaNegra: '#211c17',     // el negro-pardo del manto
  plumaParda: '#302921',     // panza/hombros en sombra
  collar: '#f0ece0',         // la gola de plumón blanco
  panelAlar: '#d8d6cc',      // las secundarias blancas del macho (vista dorsal)
  cabeza: '#b08268',         // piel desnuda rosada-parda
  pico: '#e2d8c4',           // pico ganchudo claro
  cresta: '#7c3f30',         // la carúncula del macho
};

// ── un ALA: placa trapezoidal + 6 primarias en dedo, una sola geometría ──────
// lado: +1 derecha (+X), -1 izquierda. La bisagra queda en el origen (hombro):
// el grupo padre rota en Z y el ala entera aletea/flexa sin costuras.
function alaGeo(THREE, lado) {
  const pos = [];
  const quad = (a, b, c, d) => { pos.push(...a, ...b, ...c, ...a, ...c, ...d); };
  // planta del ala (x hacia afuera, z hacia atrás = borde de fuga)
  //   hombro: cuerda -0.30..+0.26 · medio (0.78): -0.29..+0.30 · base de dedos
  //   (1.12): -0.24..+0.20 — el borde de fuga se abomba (secundarias anchas)
  const L = lado;
  quad([0 * L, 0, -0.30], [0.78 * L, 0, -0.29], [0.78 * L, 0, 0.30], [0 * L, 0, 0.26]);
  quad([0.78 * L, 0, -0.29], [1.12 * L, 0, -0.24], [1.12 * L, 0, 0.20], [0.78 * L, 0, 0.30]);
  // los DEDOS: 6 primarias que se abren en abanico hacia atrás y SUBEN en la
  // punta (la firma del planeo del cóndor a contraluz)
  const nDedos = 6;
  for (let i = 0; i < nDedos; i++) {
    const k = i / (nDedos - 1);
    const x0 = (1.06 + 0.04 * (1 - k)) * L;
    const z0 = -0.22 + k * 0.40;                  // nacen a lo largo de la punta
    const largo = 0.46 - k * 0.16;                // el dedo delantero es el más largo
    const barrido = 0.10 + k * 0.42;              // se abren hacia atrás
    const subida = 0.06 + k * 0.10;               // puntas alzadas
    const dx = Math.cos(barrido) * largo * L, dz = Math.sin(barrido) * largo;
    const w = 0.035;
    quad(
      [x0, 0, z0 - w], [x0 + dx, subida, z0 + dz - w * 0.6],
      [x0 + dx, subida, z0 + dz + w * 0.6], [x0, 0, z0 + w]
    );
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.computeVertexNormals();
  return g;
}

// el panel blanco DORSAL del macho: una lámina apenas por encima de las
// secundarias, FrontSide mirando al cielo — desde abajo el ala sigue negra
// (así es el animal real) y al banquearse el blanco RELAMPAGUEA. Ese destello
// es lo que separa "un pájaro negro" de "un cóndor".
function panelGeo(THREE, lado) {
  const L = lado;
  const pos = [
    0.06 * L, 0.012, -0.20, 0.98 * L, 0.012, -0.20, 0.98 * L, 0.012, 0.24,
    0.06 * L, 0.012, -0.20, 0.98 * L, 0.012, 0.24, 0.06 * L, 0.012, 0.20,
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.computeVertexNormals();
  return g;
}

export function crearCondorParamo(THREE, opts = {}) {
  const escala = opts.escala ?? 1;
  // vuelo: órbita elíptica (modo `orbita`) — centro, radio, velocidad angular
  const centro = opts.centro ?? { x: 0, y: 60, z: 0 };
  const radio = opts.radio ?? 50;
  const excent = opts.excentricidad ?? 0.78;   // radioZ = radio·excent (elipse)
  const vel = opts.vel ?? 0.10;                // rad/s — periodo ~63 s, sin prisa
  const fase = opts.fase ?? 0;
  const banco = opts.banco ?? 0.22;            // se ladea hacia el centro del giro

  const grupo = new THREE.Group();
  grupo.name = 'condor-paramo';
  const cuerpoG = new THREE.Group();           // el que rueda (banqueo)
  grupo.add(cuerpoG);

  const matNegro = new THREE.MeshLambertMaterial({ color: C.plumaNegra, flatShading: true, side: THREE.DoubleSide });
  const matPardo = new THREE.MeshLambertMaterial({ color: C.plumaParda, flatShading: true });
  const matPanel = new THREE.MeshLambertMaterial({ color: C.panelAlar, side: THREE.FrontSide });
  const matCollar = new THREE.MeshLambertMaterial({ color: C.collar, flatShading: true });

  // CUERPO fusiforme (adelante = +Z, como el frente del Ent)
  const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), matPardo);
  cuerpo.scale.set(1, 0.62, 2.3);
  cuerpoG.add(cuerpo);

  // COLLAR: la gola blanca justo antes de la cabeza
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.13, 9), matCollar);
  collar.rotation.x = Math.PI / 2 - 0.25;
  collar.position.set(0, 0.05, 0.46);
  cuerpoG.add(collar);

  // CABEZA pelada + pico ganchudo + carúncula (macho)
  const cabezaG = new THREE.Group();
  cabezaG.position.set(0, 0.09, 0.58);
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), new THREE.MeshLambertMaterial({ color: C.cabeza, flatShading: true }));
  cabeza.scale.set(0.85, 0.8, 1.15);
  cabezaG.add(cabeza);
  const pico = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 6), new THREE.MeshLambertMaterial({ color: C.pico, flatShading: true }));
  pico.rotation.x = Math.PI / 2 + 0.5;         // gancho hacia abajo
  pico.position.set(0, -0.005, 0.12);
  cabezaG.add(pico);
  const cresta = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.05, 0.11), new THREE.MeshLambertMaterial({ color: C.cresta, flatShading: true }));
  cresta.position.set(0, 0.075, 0.01);
  cabezaG.add(cresta);
  cuerpoG.add(cabezaG);

  // ALAS con bisagra en el hombro
  const alaIzq = new THREE.Group(), alaDer = new THREE.Group();
  alaIzq.position.set(-0.16, 0.06, 0.10);
  alaDer.position.set(0.16, 0.06, 0.10);
  alaIzq.add(new THREE.Mesh(alaGeo(THREE, -1), matNegro));
  alaIzq.add(new THREE.Mesh(panelGeo(THREE, -1), matPanel));
  alaDer.add(new THREE.Mesh(alaGeo(THREE, 1), matNegro));
  alaDer.add(new THREE.Mesh(panelGeo(THREE, 1), matPanel));
  cuerpoG.add(alaIzq, alaDer);

  // COLA en cuña
  const cola = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.52, 3), matNegro);
  cola.rotation.x = -Math.PI / 2 + 0.06;
  cola.scale.z = 0.16;
  cola.position.set(0, 0.01, -0.72);
  cuerpoG.add(cola);

  grupo.scale.setScalar(escala);

  // ── EL VUELO: planeo en térmica — la lentitud ES el personaje ─────────────
  function actualizar(t) {
    const ang = t * vel + fase;
    grupo.position.set(
      centro.x + Math.cos(ang) * radio,
      centro.y + Math.sin(t * 0.11 + fase) * 3.2,   // la térmica respira
      centro.z + Math.sin(ang) * radio * excent
    );
    // encara la tangente de la elipse (derivada real: la elipse achatada
    // desalinearía el rumbo si se usara el yaw del círculo)
    grupo.rotation.y = Math.atan2(-Math.sin(ang), Math.cos(ang) * excent);
    // banqueo al centro + un vaivén de corriente
    cuerpoG.rotation.z = banco + Math.sin(t * 0.47 + fase) * 0.07;
    cuerpoG.rotation.x = Math.sin(t * 0.31 + fase * 2) * 0.04;
    // planeo: flex mínimo de bisagra (NO aleteo) con un diedro leve
    const flex = 0.10 + Math.sin(t * 0.9 + fase) * 0.05;
    alaIzq.rotation.z = -flex;
    alaDer.rotation.z = flex;
    // la cabeza barre el suelo buscando — el gesto del buitre que patrulla
    cabezaG.rotation.y = Math.sin(t * 0.23 + fase) * 0.45;
  }

  grupo.userData = { actualizar, envergadura: 3.0 * escala };
  return grupo;
}

export default crearCondorParamo;
