// ── criaturas/bastonFrailejon.js — EL FRAILEJÓN COMO BASTÓN DEL OSO ─────────
//
// El oso andino del bestiario lleva el frailejón (Espeletia) como bastón. No es
// un palo con una bola verde: es LA MISMA planta del páramo, recortada a escala
// de bastón. Se REÚSA el arte canónico del frailejón (`paramo-vivo-arte-frailejon.js`):
// la misma hoja lanceolada con quilla, la misma roseta en capas y la misma
// paleta (plata-salvia, pajiza cálida) del frailejonal aprobado.
//
// Un bastón-frailejón real: el tronco columnar es el CAUDEX (forrado de sus
// hojas muertas marcescentes en espiral — necromasa), y arriba la roseta de
// hojas peludas es la EMPUÑADURA. Los capítulos amarillos son la firma de la
// especie.
//
// Unidades: METROS, la punta en y=0, el bastón crece sobre +Y. Se orienta y se
// ancla en la pata del oso desde `oso.js`.

import * as THREE from 'three';
import { hojaLanceoladaGeo, rosetaGeo, capituloMesh } from '../../../paramo-vivo-arte-frailejon.js';
import { P, lambert, concat } from '../../../paramo-vivo-arte-mundo.js';

export function construirBastonFrailejon({ alto = 1.16 } = {}) {
  const g = new THREE.Group();
  g.name = 'baston-frailejon';

  const R_TOP = 0.030, R_BASE = 0.046;

  // materiales de la MISMA paleta del frailejonal (paramo-vivo-arte-mundo)
  const matFuste = lambert(P.frailSeca2);                            // caudex pajizo
  const matNecro = lambert(P.frailSeca, { side: THREE.DoubleSide }); // hojas muertas
  const matRoseta = lambert(P.frailSage, { side: THREE.DoubleSide }); // roseta plata-salvia
  const matCogollo = lambert(P.frailCogollo);                        // cogollo casi blanco

  // ── FUSTE COLUMNAR: el caudex de Espeletia, delgado como un bastón ────────
  const fuste = new THREE.Mesh(new THREE.CylinderGeometry(R_TOP, R_BASE, alto, 10), matFuste);
  fuste.position.y = alto / 2;
  g.add(fuste);

  // ── NECROMASA: hojas muertas colgando EN ESPIRAL por todo el fuste ───────
  // Misma receta que `troncoGeo` del frailejón canónico: cada anillo se corre
  // de ángulo (a * 0.55), así las hojas secas quedan "pegadas en espiral".
  const necro = [];
  const anillos = 11;
  for (let a = 0; a < anillos; a++) {
    const t = a / (anillos - 1);
    const yy = 0.055 + t * (alto - 0.13);
    const rad = (R_BASE + (R_TOP - R_BASE) * t) + 0.016;
    const n = a % 2 ? 7 : 8;
    for (let j = 0; j < n; j++) {
      const ang = (j / n) * Math.PI * 2 + a * 0.55;   // la espiral
      const hoja = hojaLanceoladaGeo(0.16, 0.062, 0.03);
      hoja.rotateX(Math.PI);                           // punta hacia abajo (colgando)
      hoja.rotateZ(0.38);                              // se abre hacia afuera
      hoja.rotateY(ang);
      hoja.translate(Math.cos(ang) * rad, yy, Math.sin(ang) * rad);
      necro.push(hoja);
    }
  }
  g.add(new THREE.Mesh(concat(...necro), matNecro));

  // ── ROSETA ARRIBA: la empuñadura de hojas peludas (misma geometría canónica) ──
  const roseta = new THREE.Group();
  roseta.position.y = alto - 0.02;
  roseta.add(new THREE.Mesh(rosetaGeo(0, 0.30), matRoseta));
  const cogollo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.046, 1), matCogollo);
  cogollo.position.y = 0.075;                          // el cogollo velloso del centro
  roseta.add(cogollo);
  g.add(roseta);

  // ── CAPÍTULOS AMARILLOS: 2 flores sobre tallos cortos por encima de la roseta ──
  const flores = new THREE.Group();
  const matTallo = lambert(0x9aa06a);
  for (const [dx, dy, dz, rr] of [
    [0.13, 0.10, 0.05, 0.052],
    [-0.10, 0.16, -0.05, 0.044],
  ]) {
    const tallo = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.009, 0.20, 5), matTallo);
    tallo.position.set(dx, alto + 0.03 + dy, dz);
    tallo.rotation.z = dx * 0.7;
    flores.add(tallo);
    const cap = capituloMesh(rr);
    cap.position.set(dx * 1.15, alto + 0.13 + dy, dz * 1.15);
    cap.rotation.set(0.45, dx * 4, 0.2);
    flores.add(cap);
  }
  g.add(flores);

  g.userData.alto = alto;
  return { group: g, roseta, flores };
}
