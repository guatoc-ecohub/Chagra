// ═══════════════════════════════════════════════════════════════════════════
//  PÁRAMO VIVO — ARTE · EL ELENCO
//  ---------------------------------------------------------------------------
//  · QUEÑUA-ANCIANO (Polylepis): el otro maestro, silueta DISTINTA al frailejón
//    (nudosa, retorcida, del límite arbóreo, corteza rojiza en láminas de papel,
//    copa baja forrada de musgo que peina la niebla). Es «el vecino» — el único
//    otro protagonista del piso del usuario.
//  · CHIVITO (Oxypogon guerinii): el «rey de los páramos», colibrí de cresta y
//    BARBA blanca, que se alimenta del néctar del frailejón — su vida late al
//    ritmo de la floración (mayo–sep). Revolotea en las flores del Ent.
//  · COMPAI sentado, LIBRETA en mano: anota la lección y se queda PENSANDO. El
//    aprendiz humilde, espejo del usuario. Ese gesto ES la pedagogía. + Angelita.
// ═══════════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { P, lambert } from './paramo-vivo-arte-mundo.js';
import { crearCopaMasa } from './lib3d/flora/FollajeMasa.js';
import { aplicarVientoMundo } from './lib3d/flora/vientoMundos.js';

const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;

// ═══════════════════════════════════════════════════════════════════════════
//  LA QUEÑUA-ANCIANO (Polylepis) — tronco retorcido continuo + papel rojizo
// ═══════════════════════════════════════════════════════════════════════════
export function buildQuenuaAnciano(rng) {
  const g = new THREE.Group();
  const troncoM = lambert(P.quenuaTronco), laminaM = lambert(P.quenuaLamina, { side: THREE.DoubleSide });
  const copaG = new THREE.Group();
  // Masa de follaje: conserva los seis centros, radios y escalas de la silueta
  // de arte; cambia la faceta por núcleo suave + cards densos.
  const cCopaBaja = new THREE.Color(P.quenuaHoja);
  const cCopaAlta = new THREE.Color(P.quenuaHoja2);
  const tmpCopa = new THREE.Color();
  const gradCopa = (x, y, z) => {
    const t = Math.max(0, Math.min(1, (y - 3.0) / 2.3));
    return tmpCopa.copy(cCopaBaja).lerp(cCopaAlta, t * 0.85 + (Math.sin(x * 1.7 + z * 0.9) * 0.5 + 0.5) * 0.15);
  };
  const VIENTO_COPA = { amplitud: 0.055, piso: 0.35, velocidad: 1.0 };
  // tronco retorcido: cada tramo nace donde acabó el anterior (sin huecos)
  let prev = new THREE.Vector3(0, 0, 0);
  const tramos = [
    { dx: 0.0, dz: 0.0, r0: 0.6, r1: 0.48, h: 2.2, tx: -0.16, tz: 0.07 },
    { dx: 0.34, dz: 0.12, r0: 0.48, r1: 0.34, h: 1.9, tx: -0.34, tz: -0.14 },
    { dx: 0.66, dz: -0.05, r0: 0.34, r1: 0.24, h: 1.6, tx: -0.12, tz: 0.2 },
  ];
  for (const tr of tramos) {
    const c = new THREE.CylinderGeometry(tr.r1, tr.r0, tr.h, 6); c.translate(0, tr.h / 2, 0);
    const m = new THREE.Mesh(c, troncoM);
    m.position.copy(prev).add(new THREE.Vector3(tr.dx, 0, tr.dz));
    m.rotation.set(tr.tz, 0, tr.tx);
    const nEsc = 7 + rng.int(0, 3);
    for (let i = 0; i < nEsc; i++) {
      const fy = rng.float(0, 1), yy = fy * tr.h, rad = (tr.r0 + (tr.r1 - tr.r0) * fy) - 0.02, ang = rng.float(0, Math.PI * 2);
      const esc = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 3, 1, true), laminaM);
      esc.position.set(Math.cos(ang) * rad, yy, Math.sin(ang) * rad);
      esc.rotation.set(Math.PI * 0.86, ang, 0.5 + rng.float(0, 0.3));
      m.add(esc);
    }
    g.add(m);
    prev = m.position.clone().add(new THREE.Vector3(tr.dx * 0.5, tr.h * 0.96, tr.dz * 0.5));
  }
  // copa baja y ancha, lóbulos separados a dos verdes (contraste, no una bola)
  const masa = crearCopaMasa(THREE, {
    esferas: [
      { c: [1.7, 4.7, 0.2], r: 2.1, esc: [1.3, 0.6, 1.2] },
      { c: [3.25, 4.15, -0.6], r: 1.3, esc: [1.1, 0.58, 1.1] },
      { c: [0.1, 5.0, -0.3], r: 0.95, esc: [1.1, 0.55, 1.1] },
      { c: [-0.1, 3.95, 0.85], r: 1.6, esc: [1.12, 0.58, 1.12] },
      { c: [2.7, 3.7, 0.9], r: 1.2, esc: [1.1, 0.55, 1.1] },
      { c: [1.1, 3.8, -0.9], r: 0.9, esc: [1.05, 0.5, 1.05] },
    ],
    gradiente: gradCopa,
    seed: 20260813,
    brillo: 0.14, cobertura: 1.5, tamCard: 0.95, maxCards: 560, modulacion: 0.42,
    nucleoOpts: { segs: [14, 10], encoger: 0.86, rugosidad: 0.3, sombra: 0.58 },
    texOpts: { oscuro: hex(P.quenuaHoja), medio: hex(P.quenuaHoja), claro: hex(P.quenuaHoja2), hojas: 420, alargue: 2.0 },
    viento: VIENTO_COPA,
    sombra: VIENTO_COPA,
  });
  // Aplicación explícita a núcleo Y cards: ambos deben ondular con el mismo
  // reloj y con el mismo eje de peso local Y, no sólo las tarjetas.
  aplicarVientoMundo(masa.matNucleo, VIENTO_COPA);
  aplicarVientoMundo(masa.matCards, VIENTO_COPA);
  masa.grupo.children.forEach((m) => { m.castShadow = true; });
  copaG.add(masa.grupo);
  g.add(copaG);
  // musgo/líquenes (peina la niebla): cojines base + motas en copa
  const musgoM = lambert(P.musgo), musgoM2 = lambert(P.musgoClaro);
  for (let i = 0; i < 9; i++) {
    const a = rng.float(0, Math.PI * 2), yy = 0.2 + rng.float(0, 1.8);
    const cl = new THREE.Mesh(new THREE.SphereGeometry(0.24 + rng.float(0, 0.18), 6, 4), rng.bool() ? musgoM : musgoM2);
    cl.position.set(Math.cos(a) * 0.4, yy, Math.sin(a) * 0.4); cl.scale.y = 0.6; g.add(cl);
  }
  for (let i = 0; i < 6; i++) {
    const a = rng.float(0, Math.PI * 2), r = 1.4 + rng.float(0, 1.8);
    const cl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42 + rng.float(0, 0.3), 0), musgoM);
    cl.position.set(Math.cos(a) * r, 3.7 + rng.float(0, 1.3), Math.sin(a) * r); g.add(cl);
  }
  const update = (t) => { copaG.rotation.z = Math.sin(t * 0.3 + 2) * 0.02; copaG.rotation.x = Math.cos(t * 0.22) * 0.014; };
  return { group: g, update };
}

// ═══════════════════════════════════════════════════════════════════════════
//  EL CHIVITO (Oxypogon guerinii) — cresta + barba blanca, revolotea en la flor
// ═══════════════════════════════════════════════════════════════════════════
export function buildChivito(rng) {
  const g = new THREE.Group();
  const verde = lambert(0x2f7d55), verdeIri = lambert(0x3fae7a), blanco = lambert(0xf4f6f0), negro = lambert(0x241d16);
  // cuerpo ovoide iridiscente
  const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), verde); cuerpo.scale.set(1, 0.9, 1.5); g.add(cuerpo);
  // cabeza + CRESTA puntuda (la firma del helmetcrest)
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), verdeIri); cabeza.position.set(0, 0.06, 0.2); g.add(cabeza);
  const cresta = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.24, 5), blanco); cresta.position.set(0, 0.2, 0.2); cresta.rotation.x = -0.2; g.add(cresta);
  // pico largo y fino
  const pico = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.014, 0.34, 5), negro); pico.position.set(0, 0.05, 0.42); pico.rotation.x = Math.PI / 2; g.add(pico);
  // BARBA blanca colgando del cuello al pecho (gorjera del chivito)
  const barba = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.42, 6), blanco); barba.position.set(0, -0.1, 0.24); barba.rotation.x = -0.3; barba.scale.set(1, 1, 0.4); g.add(barba);
  // cola corta bifurcada
  const cola = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 4), verde); cola.position.set(0, 0, -0.24); cola.rotation.x = -Math.PI / 2 - 0.2; g.add(cola);
  // alas: dos planos que aletean rápido
  const alaGeo = new THREE.PlaneGeometry(0.4, 0.14); alaGeo.translate(0.2, 0, 0);
  const alaMat = new THREE.MeshLambertMaterial({ color: 0x6a4a3a, transparent: true, opacity: 0.72, side: THREE.DoubleSide, flatShading: true });
  const alaI = new THREE.Mesh(alaGeo, alaMat); alaI.position.set(-0.05, 0.04, 0);
  const alaD = new THREE.Mesh(alaGeo, alaMat); alaD.position.set(0.05, 0.04, 0); alaD.rotation.y = Math.PI;
  g.add(alaI, alaD);
  g.scale.setScalar(1.0);
  // órbita en ocho alrededor de la flor + aleteo
  const update = (t) => {
    const a = t * 0.9;
    g.position.set(Math.sin(a) * 0.9, Math.sin(a * 2) * 0.35 + 0.1, Math.cos(a) * 0.6);
    g.rotation.y = -a + Math.PI;
    g.position.y += Math.sin(t * 6) * 0.03;
    const flap = Math.sin(t * 42) * 0.9;
    alaI.rotation.z = flap; alaD.rotation.z = -flap;
  };
  return { group: g, update };
}

// ═══════════════════════════════════════════════════════════════════════════
//  COMPAI sentado con la LIBRETA — anota y se queda pensando (la pedagogía)
// ═══════════════════════════════════════════════════════════════════════════
export function buildCompai(rng) {
  const g = new THREE.Group();
  const poncho = lambert(0xb5462f), piel = lambert(0xc98d5a), sombrero = lambert(0xe8d8a8), pantalon = lambert(0x3b4a55), libretaM = lambert(0xf3ecd6), lapizM = lambert(0x6b4a2a);
  // piernas cruzadas (sentado): dos cilindros bajos horizontales
  for (const sx of [-1, 1]) {
    const muslo = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.6, 6), pantalon);
    muslo.position.set(sx * 0.18, 0.14, 0.18); muslo.rotation.z = Math.PI / 2; muslo.rotation.y = sx * 0.5; g.add(muslo);
  }
  // torso con poncho (tronco-cono)
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 0.7, 8), poncho); torso.position.set(0, 0.55, 0); g.add(torso);
  // cabeza + sombrero de ala ancha (campesino andino)
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), piel); cabeza.position.set(0, 1.02, 0.02); g.add(cabeza);
  const copaS = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.16, 10), sombrero); copaS.position.set(0, 1.16, 0.02); g.add(copaS);
  const alaS = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 14), sombrero); alaS.position.set(0, 1.09, 0.02); g.add(alaS);
  // la LIBRETA sostenida en la mano izquierda, apoyada en la rodilla
  const libreta = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.26), libretaM); libreta.position.set(-0.12, 0.5, 0.34); libreta.rotation.x = -0.5; g.add(libreta);
  // brazo izquierdo sosteniendo la libreta
  const brazoI = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.5, 6), poncho); brazoI.position.set(-0.28, 0.6, 0.16); brazoI.rotation.z = 0.7; brazoI.rotation.x = -0.5; g.add(brazoI);
  // brazo derecho = el que ESCRIBE (pivote en el hombro), con el lápiz
  const brazoDG = new THREE.Group(); brazoDG.position.set(0.24, 0.78, 0.08);
  const brazoD = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.46, 6), poncho); brazoD.position.set(0.02, -0.18, 0.12); brazoD.rotation.x = -0.9; brazoDG.add(brazoD);
  const mano = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), piel); mano.position.set(0.02, -0.34, 0.28); brazoDG.add(mano);
  const lapiz = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.18, 5), lapizM); lapiz.position.set(0.02, -0.36, 0.32); lapiz.rotation.x = -0.7; brazoDG.add(lapiz);
  g.add(brazoDG);

  // GESTO: escribe unos segundos (mano oscila sobre la libreta) → PAUSA y mira
  // arriba pensando (cabeza se inclina) → repite. Ese ciclo es la lección.
  const update = (t) => {
    const ciclo = t % 7;
    if (ciclo < 4.2) {
      // escribiendo: pequeñas oscilaciones de la muñeca/brazo sobre el papel
      brazoDG.rotation.z = Math.sin(t * 7) * 0.12;
      brazoDG.rotation.x = Math.sin(t * 5) * 0.06;
      cabeza.rotation.x = 0.35;                 // mira la libreta
      copaS.rotation.x = 0.35; alaS.rotation.x = 0.35;
    } else {
      // pensando: la mano se detiene, la cabeza sube despacio hacia el Ent
      const k = Math.min((ciclo - 4.2) / 1.2, 1);
      brazoDG.rotation.z *= (1 - k * 0.2);
      cabeza.rotation.x = 0.35 - k * 0.6;        // levanta la mirada
      copaS.rotation.x = 0.35 - k * 0.6; alaS.rotation.x = 0.35 - k * 0.6;
    }
    // respiración leve del torso
    torso.scale.y = 1 + Math.sin(t * 1.6) * 0.02;
  };
  return { group: g, update };
}

// ── ANGELITA (la abeja aprendiz) — revolotea junto a Compai ───────────────────
export function buildAbeja(rng) {
  const g = new THREE.Group();
  const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), lambert(0xe6b83a)); cuerpo.scale.set(1, 0.9, 1.3); g.add(cuerpo);
  for (let i = -1; i <= 1; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 5, 10), lambert(0x201810)); r.position.z = i * 0.035; r.scale.set(1, 0.9, 1); g.add(r); }
  const cara = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), lambert(0x201810)); cara.position.z = 0.09; g.add(cara);
  const alaGeo = new THREE.PlaneGeometry(0.16, 0.1); alaGeo.translate(0.08, 0, 0);
  const alaMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
  const alaI = new THREE.Mesh(alaGeo, alaMat); alaI.position.set(-0.02, 0.05, 0);
  const alaD = new THREE.Mesh(alaGeo, alaMat); alaD.position.set(0.02, 0.05, 0); alaD.rotation.y = Math.PI; g.add(alaI, alaD);
  const update = (t) => {
    g.position.set(Math.sin(t * 1.3) * 0.5, 1.4 + Math.sin(t * 2.1) * 0.25, 0.4 + Math.cos(t * 1.3) * 0.4);
    g.rotation.y = -t * 1.3;
    const flap = Math.sin(t * 50) * 1.1; alaI.rotation.z = flap; alaD.rotation.z = -flap;
  };
  return { group: g, update };
}
