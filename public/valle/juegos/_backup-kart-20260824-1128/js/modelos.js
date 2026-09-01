// ── modelos.js — builders de vehículos (chiva detallada + variantes) ─────────
// Sin estados de juego: solo geometría. `construirModeloVehiculo(THREE, veh)`
// devuelve { grupo, ruedas, ruedasF, chasis, alturaPiso, actualizar(dt, s) }.
import { crearChiva } from './modelos/chiva.js';
import { crearLoboGris } from './modelos/lobo-gris.js';
import { crearEscarabajoRojo } from './modelos/escarabajo-rojo.js';
import { crearBlanco } from './modelos/blanco.js';
import { crearCarretilla as crearCarretillaNueva } from './modelos/carretilla.js';
import { crearMoto250 } from './modelos/moto250.js';
import { crearCamion } from './modelos/camion.js';
import { crearPatineta } from './modelos/patineta.js';
import { montarPilotoManejando, aplicarPose } from './modelos/pilotos-manejando.js';
// F25: el DEFAULT es el cuerpo RIGADO (montarPilotoManejando). La lámina PNG
// quedó como opt-in explícito detrás de `?piloto2d=…` — sin el parámetro
// modoLamina() devuelve null y la bifurcación de abajo ni se entera. El
// "apagado" vive en el default de modoLamina(), no en este llamador.
import { modoLamina, tieneLamina, montarPilotoLamina, ASOMO_POR_VEHICULO } from './piloto-lamina.js';
import { montarPilotoTrazado, tienePilotoTrazado } from './modelos/pilotos-trazado.js';
// La orientación de fábrica mira +X (la física mueve x+=cos(hdg), z+=sin(hdg));
// `actualizar` aplica heading/roll/pitch, giro de ruedas y dirección. Pura
// THREE: importable por importmap como `three`.

const M = (THREE, color, rough = 0.85, metal = 0.05) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });

function rueda(THREE, radio = 0.42, ancho = 0.34, color = 0x1c1c1e) {
  const g = new THREE.Group();
  const llanta = new THREE.Mesh(new THREE.CylinderGeometry(radio, radio, ancho, 20), M(THREE, color, 0.95));
  llanta.rotation.x = Math.PI / 2;
  const rin = new THREE.Mesh(new THREE.CylinderGeometry(radio * 0.55, radio * 0.55, ancho + 0.02, 12), M(THREE, 0xb8b8bc, 0.35, 0.6));
  rin.rotation.x = Math.PI / 2;
  g.add(llanta, rin);
  return g;
}

function arcoRueda(THREE, radio = 0.42, ancho = 0.06, color = 0x4a4038) {
  const arco = new THREE.Mesh(
    new THREE.TorusGeometry(radio + 0.08, ancho, 8, 14, Math.PI),
    M(THREE, color, 0.88)
  );
  arco.rotation.z = Math.PI / 2;
  return arco;
}

function luzBloque(THREE, color = 0xfff1c5, rough = 0.2, metal = 0.08) {
  return M(THREE, color, rough, metal);
}

function crearVolante(THREE, color = 0x2a2a30) {
  const g = new THREE.Group();
  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.03, 8, 16), M(THREE, color, 0.55, 0.2));
  aro.rotation.y = Math.PI / 2;
  g.add(aro);
  const centro = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8), M(THREE, 0x7d7d86, 0.42, 0.4));
  centro.rotation.z = Math.PI / 2;
  g.add(centro);
  for (const ang of [0, Math.PI * 0.66, Math.PI * 1.33]) {
    const radio = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.03, 0.03), M(THREE, color, 0.5, 0.15));
    radio.rotation.z = ang;
    g.add(radio);
  }
  return g;
}

function crearPilotoCanino(THREE, opts = {}) {
  const tipo = opts.tipo ?? 'dante';
  const modo = opts.modo ?? 'cabina';
  const escala = opts.escala ?? 1;
  const g = new THREE.Group();
  const partes = {};
  const esDante = tipo === 'dante';
  const cuerpo = M(THREE, esDante ? 0xcaa46b : 0xf2efea, 0.92);
  const crema = M(THREE, esDante ? 0xf2ead6 : 0xf7f4ed, 0.84);
  const sombra = M(THREE, esDante ? 0x7c5532 : 0x101114, 0.95);
  const mancha = M(THREE, esDante ? 0xb37a43 : 0x1b1b1e, 0.96);

  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.44, 12, 10), cuerpo);
  torso.scale.set(1.25, 0.86, 0.96);
  torso.position.set(0, 0.62, 0);
  g.add(torso);
  partes.torso = torso;

  const pecho = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), crema);
  pecho.scale.set(1.06, 0.82, 0.88);
  pecho.position.set(0.12, 0.56, 0);
  g.add(pecho);
  partes.pecho = pecho;

  const cabeza = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), cuerpo);
  skull.scale.set(1.16, 0.98, 0.98);
  cabeza.add(skull);
  const hocico = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.4, 8), crema);
  hocico.rotation.z = Math.PI / 2;
  hocico.position.set(0.28, -0.02, 0);
  cabeza.add(hocico);
  const nariz = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), sombra);
  nariz.position.set(0.48, -0.04, 0);
  cabeza.add(nariz);
  const antifaz = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), esDante ? crema : mancha);
  antifaz.scale.set(1.0, 0.68, 0.92);
  antifaz.position.set(0.02, 0.1, -0.08);
  cabeza.add(antifaz);
  const ojoGeo = new THREE.SphereGeometry(0.04, 8, 6);
  for (const lado of [-1, 1]) {
    const ojo = new THREE.Mesh(ojoGeo, M(THREE, 0x5b391f, 0.9));
    ojo.position.set(0.08, 0.08, lado * 0.12);
    cabeza.add(ojo);
  }
  for (const lado of [-1, 1]) {
    const oreja = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.68, 6), cuerpo);
    oreja.position.set(-0.08, 0.2, lado * 0.24);
    oreja.rotation.z = lado * 0.72;
    oreja.rotation.x = lado * 0.08;
    cabeza.add(oreja);
  }
  if (esDante) {
    const escarcha = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), M(THREE, 0xe8decf, 0.9));
    escarcha.scale.set(1.32, 0.76, 0.96);
    escarcha.position.set(0.0, 0.0, 0);
    cabeza.add(escarcha);
    const baba = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.98, 5), M(THREE, 0xe8ffd8, 0.24));
    baba.position.set(0.24, -0.34, 0.02);
    baba.rotation.z = 0.2;
    cabeza.add(baba);
    partes.baba = baba;
  } else {
    const parche = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mancha);
    parche.scale.set(0.96, 0.74, 0.82);
    parche.position.set(0.1, 0.2, -0.16);
    cabeza.add(parche);
  }
  cabeza.position.set(0.14, 1.0, 0);
  cabeza.rotation.y = Math.PI / 2;
  g.add(cabeza);
  partes.cabeza = cabeza;

  const patas = [];
  const pos = modo === 'cabina'
    ? [[-0.34, 0.2, -0.22], [-0.34, 0.2, 0.22], [0.3, 0.18, -0.2], [0.3, 0.18, 0.2]]
    : [[-0.4, 0.18, -0.24], [-0.4, 0.18, 0.24], [0.34, 0.16, -0.2], [0.34, 0.16, 0.2]];
  for (let i = 0; i < pos.length; i++) {
    const [x, y, z] = pos[i];
    const p = new THREE.Group();
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.72, 6), i < 2 ? cuerpo : esDante ? crema : cuerpo);
    upper.rotation.z = i < 2 ? 0.12 : -0.08;
    upper.position.y = -0.18;
    p.add(upper);
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.64, 6), i < 2 ? crema : cuerpo);
    lower.position.y = -0.52;
    lower.rotation.z = i < 2 ? 0.02 : -0.05;
    p.add(lower);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), sombra);
    paw.position.y = -0.82;
    p.add(paw);
    p.position.set(x, y, z);
    g.add(p);
    patas.push(p);
  }
  partes.patas = patas;

  const cola = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.46, 6), cuerpo);
  cola.position.set(-0.36, 0.34, 0);
  cola.rotation.z = -0.78;
  g.add(cola);
  partes.cola = cola;

  g.scale.setScalar(escala);
  g.userData = { tipo, modo, partes };
  return { grupo: g, partes, tipo, modo, escala };
}

function crearPilotoJaguar(THREE, opts = {}) {
  const tipo = opts.tipo ?? 'jaguar';
  const modo = opts.modo ?? 'cabina';
  const escala = opts.escala ?? 1;
  const g = new THREE.Group();
  const partes = {};
  const pardo = M(THREE, 0x5a4028, 0.94);
  const crema = M(THREE, 0xe7d6b4, 0.8);
  const negro = M(THREE, 0x17171d, 0.95);
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), pardo);
  torso.scale.set(1.18, 0.86, 0.96);
  torso.position.set(0, 0.62, 0);
  g.add(torso);
  partes.torso = torso;
  const cabeza = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), pardo);
  skull.scale.set(1.08, 0.98, 0.96);
  cabeza.add(skull);
  const hocico = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.32, 8), crema);
  hocico.rotation.z = Math.PI / 2;
  hocico.position.set(0.24, -0.02, 0);
  cabeza.add(hocico);
  const nariz = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), negro);
  nariz.position.set(0.42, -0.03, 0);
  cabeza.add(nariz);
  for (const lado of [-1, 1]) {
    const oreja = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 5), pardo);
    oreja.position.set(-0.02, 0.25, lado * 0.16);
    oreja.rotation.z = lado * 0.42;
    cabeza.add(oreja);
  }
  const parche = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), negro);
  parche.scale.set(1.0, 0.78, 0.9);
  parche.position.set(0.06, 0.08, -0.16);
  cabeza.add(parche);
  cabeza.position.set(0.1, 0.98, 0);
  cabeza.rotation.y = Math.PI / 2;
  g.add(cabeza);
  partes.cabeza = cabeza;
  const cola = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.46, 6), pardo);
  cola.position.set(-0.36, 0.34, 0);
  cola.rotation.z = -0.82;
  g.add(cola);
  const patas = [];
  for (const [x, y, z] of [[-0.32, 0.2, -0.2], [-0.32, 0.2, 0.2], [0.28, 0.18, -0.18], [0.28, 0.18, 0.18]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.72, 6), pardo);
    p.position.set(x, y, z);
    g.add(p);
    patas.push(p);
  }
  partes.patas = patas;
  g.scale.setScalar(escala);
  g.userData = { tipo, modo, partes };
  return { grupo: g, partes, tipo, modo, escala };
}

function crearPiloto(THREE, opts = {}) {
  const tipo = opts.tipo ?? 'angelita';
  const modo = opts.modo ?? 'cabina';
  const escala = opts.escala ?? 1;
  if (tipo === 'dante' || tipo === 'oliver') return crearPilotoCanino(THREE, opts);
  if (tipo === 'jaguar') return crearPilotoJaguar(THREE, opts);
  const g = new THREE.Group();
  const partes = {};

  const piel = M(THREE, 0xf0cfad, 0.72);
  const pielOsc = M(THREE, 0xc78f69, 0.8);
  const negro = M(THREE, 0x17171d, 0.95);
  const blanco = M(THREE, 0xf7f6ef, 0.75);
  const amarillo = M(THREE, 0xedc431, 0.82);
  const amarilloOsc = M(THREE, 0xa3731f, 0.9);

  const torsoH = modo === 'expuesto' ? 0.66 : 0.56;
  const torsoR = modo === 'expuesto' ? 0.19 : 0.17;
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(torsoR * 0.9, torsoR, torsoH, 10), tipo === 'angelita' ? amarillo : piel,);
  torso.position.y = 0.58;
  torso.rotation.z = modo === 'expuesto' ? -0.07 : 0.02;
  g.add(torso);
  partes.torso = torso;

  if (tipo === 'angelita') {
    const franja1 = new THREE.Mesh(new THREE.TorusGeometry(torsoR * 0.9, 0.03, 8, 12), negro);
    franja1.rotation.x = Math.PI / 2;
    franja1.position.y = 0.47;
    g.add(franja1);
    const franja2 = franja1.clone();
    franja2.position.y = 0.61;
    g.add(franja2);
    const alas = new THREE.Group();
    const alaMat = new THREE.MeshStandardMaterial({
      color: 0xf8fdff,
      transparent: true,
      opacity: 0.44,
      roughness: 0.15,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });
    for (const lado of [-1, 1]) {
      const ala = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.18), alaMat);
      ala.position.set(-0.02, 0.72, lado * 0.19);
      ala.rotation.y = lado * 0.55;
      ala.rotation.z = lado * 0.18;
      alas.add(ala);
    }
    alas.position.y = 0.1;
    g.add(alas);
    partes.alas = alas;

    for (const lado of [-1, 1]) {
      const antena = new THREE.Group();
      const varilla = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.24, 6), negro);
      varilla.position.y = 0.12;
      varilla.rotation.z = lado * 0.42;
      antena.add(varilla);
      const punta = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), amarilloOsc);
      punta.position.set(lado * 0.06, 0.24, 0.02);
      antena.add(punta);
      antena.position.set(0.1, 1.18, lado * 0.08);
      g.add(antena);
    }
  } else {
    const pecho = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), piel);
    pecho.scale.set(1.12, 0.92, 0.92);
    pecho.position.set(0, 0.62, 0);
    g.add(pecho);
    partes.pecho = pecho;
  }

  const cabeza = new THREE.Group();
  const cr = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), tipo === 'angelita' ? blanco : piel);
  cabeza.add(cr);
  const ojoGeo = new THREE.SphereGeometry(0.045, 8, 6);
  for (const lado of [-1, 1]) {
    const ojo = new THREE.Mesh(ojoGeo, negro);
    ojo.position.set(lado * 0.08, 0.04, 0.15);
    cabeza.add(ojo);
    const brillo = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 4), blanco);
    brillo.position.set(lado * 0.095, 0.055, 0.185);
    cabeza.add(brillo);
  }
  if (tipo === 'angelita') {
    const meJilla = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), M(THREE, 0xffd2a8, 0.82));
    meJilla.position.set(-0.02, -0.02, 0.17);
    cabeza.add(meJilla);
    const boca = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), negro);
    boca.position.set(0.0, -0.06, 0.18);
    cabeza.add(boca);
  } else {
    const boca = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.02), pielOsc);
    boca.position.set(0.0, -0.05, 0.18);
    cabeza.add(boca);
  }
  cabeza.position.y = 1.1;
  g.add(cabeza);
  partes.cabeza = cabeza;

  const brazoGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.42, 8);
  const piernaGeo = new THREE.CylinderGeometry(0.055, 0.07, 0.48, 8);
  const manoGeo = new THREE.SphereGeometry(0.065, 8, 6);
  const pieGeo = new THREE.SphereGeometry(0.06, 8, 6);
  const brazoM = tipo === 'angelita' ? amarillo : piel;
  const piernaM = tipo === 'angelita' ? amarilloOsc : pielOsc;

  function crearBrazo(lado, y, x, z, pose = 0) {
    const b = new THREE.Group();
    const upper = new THREE.Mesh(brazoGeo, brazoM);
    upper.rotation.z = lado * (0.85 + pose);
    upper.position.y = -0.14;
    b.add(upper);
    const fore = new THREE.Mesh(brazoGeo, brazoM);
    fore.scale.set(0.95, 0.95, 0.95);
    fore.position.y = -0.33;
    fore.rotation.z = lado * (0.2 + pose * 0.35);
    b.add(fore);
    const hand = new THREE.Mesh(manoGeo, blanco);
    hand.position.set(lado * 0.06, -0.52, 0.03);
    b.add(hand);
    b.position.set(x, y, z);
    g.add(b);
    return b;
  }

  function crearPierna(lado, y, x, z, pose = 0) {
    const p = new THREE.Group();
    const thigh = new THREE.Mesh(piernaGeo, piernaM);
    thigh.rotation.z = lado * (0.22 + pose * 0.15);
    thigh.position.y = -0.18;
    p.add(thigh);
    const shin = new THREE.Mesh(piernaGeo, piernaM);
    shin.scale.set(0.9, 0.9, 0.9);
    shin.position.y = -0.42;
    shin.rotation.z = lado * (0.08 + pose * 0.12);
    p.add(shin);
    const foot = new THREE.Mesh(pieGeo, tipo === 'angelita' ? negro : negro);
    foot.position.set(lado * 0.05, -0.64, 0.04);
    p.add(foot);
    p.position.set(x, y, z);
    g.add(p);
    return p;
  }

  const poseA = modo === 'expuesto' ? 0.16 : 0.0;
  partes.brazoL = crearBrazo(-1, 0.75, -0.06, 0.1, poseA);
  partes.brazoR = crearBrazo(1, 0.75, 0.06, 0.1, poseA);
  partes.piernaL = crearPierna(-1, 0.22, -0.1, modo === 'cabina' ? -0.02 : 0.04, poseA);
  partes.piernaR = crearPierna(1, 0.22, 0.1, modo === 'cabina' ? -0.02 : 0.04, poseA);

  g.scale.setScalar(escala);
  g.userData = { tipo, modo, partes };
  return { grupo: g, partes, tipo, modo, escala };
}

function animarPiloto(piloto, veh, s) {
  if (!piloto) return;
  const giro = Math.max(-1, Math.min(1, s._yaw?.girar ?? 0));
  const drift = s.drift?.act ? s.drift.dir : 0;
  const velN = Math.min(1, Math.abs(s.vel) / Math.max(1, veh.velMax));
  const salto = s.onGround ? 0 : 0.16;
  const pose = piloto.modo === 'expuesto' ? 1 : 0;
  const skate = piloto.modo === 'skate';
  piloto.grupo.rotation.z = (pose ? -0.12 : -0.06) - giro * 0.18 - drift * 0.08 + (s.turbo ? 0.05 : 0);
  piloto.grupo.rotation.x = salto - s.pitch * 1.8;
  if (skate) {
    piloto.grupo.rotation.z = -0.16 - giro * 0.26 - drift * 0.06 + (s.turbo ? 0.05 : 0);
    piloto.grupo.rotation.x = 0.1 + salto - s.pitch * 1.4;
  }
  if (piloto.partes.torso) piloto.partes.torso.rotation.z = giro * 0.08 - drift * 0.03;
  if (piloto.partes.pecho) piloto.partes.pecho.rotation.z = giro * 0.06;
  if (piloto.partes.cabeza) {
    piloto.partes.cabeza.rotation.z = giro * 0.2 + drift * 0.04;
    piloto.partes.cabeza.rotation.x = -velN * 0.12 + salto * 0.25;
  }
  if (piloto.partes.brazoL) piloto.partes.brazoL.rotation.z = skate ? -1.4 - giro * 0.08 : (-0.92 - giro * 0.18 - pose * 0.1);
  if (piloto.partes.brazoR) piloto.partes.brazoR.rotation.z = skate ? 1.4 - giro * 0.08 : (0.92 - giro * 0.18 + pose * 0.1);
  if (piloto.partes.piernaL) piloto.partes.piernaL.rotation.z = -0.06 + Math.sin(performance.now() * 0.01 + piloto.escala) * 0.04;
  if (piloto.partes.piernaR) piloto.partes.piernaR.rotation.z = 0.06 + Math.cos(performance.now() * 0.01 + piloto.escala) * 0.04;
  if (skate && piloto.partes.cabeza) {
    piloto.partes.cabeza.rotation.x = -0.18 + salto * 0.28;
  }
  if (piloto.partes.alas) {
    const flap = Math.sin(performance.now() * 0.035 + piloto.escala * 9) * 0.34 + velN * 0.05 + (s.turbo ? 0.12 : 0);
    for (const ala of piloto.partes.alas.children) {
      const lado = ala.position.z > 0 ? 1 : -1;
      ala.rotation.y = lado * (0.55 + flap);
      ala.rotation.z = lado * 0.18 + Math.sin(performance.now() * 0.02 + lado) * 0.01;
    }
  }
}

function construirChiva(THREE, veh) {
  const grupo = new THREE.Group();
  const chasis = new THREE.Group();
  grupo.add(chasis);

  const rojo = M(THREE, veh.color, 0.78);
  const madera = M(THREE, veh.color2, 0.9);
  const maderaOsc = M(THREE, 0x6d5334, 0.95);
  const metal = M(THREE, 0x8b8b92, 0.42, 0.72);
  const cromado = M(THREE, 0xd0d4da, 0.18, 0.9);
  const vidrio = M(THREE, 0xa9c8da, 0.18, 0.5);
  const azul = M(THREE, 0x2e79b8, 0.62);
  const amarillo = M(THREE, 0xf0c842, 0.62);
  const negro = M(THREE, 0x17171c, 0.96);

  const piso = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.3, 1.98), rojo);
  piso.position.set(0.0, 0.38, 0);
  chasis.add(piso);

  const frente = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.98, 1.82), rojo);
  frente.position.set(1.55, 0.96, 0);
  chasis.add(frente);
  const capot = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.42, 1.82), rojo);
  capot.position.set(1.98, 0.76, 0);
  chasis.add(capot);
  const cabina = new THREE.Mesh(new THREE.BoxGeometry(1.28, 1.0, 1.76), rojo);
  cabina.position.set(1.02, 1.12, 0);
  chasis.add(cabina);
  const cajaInterior = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.78, 1.5), M(THREE, 0x2d2419, 0.98));
  cajaInterior.position.set(-0.56, 1.02, 0);
  chasis.add(cajaInterior);
  const paranteFrente = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 1.74), maderaOsc);
  paranteFrente.position.set(0.34, 1.16, 0);
  chasis.add(paranteFrente);
  const paranteTrasero = paranteFrente.clone();
  paranteTrasero.position.set(-1.52, 1.08, 0);
  chasis.add(paranteTrasero);
  for (const lado of [-1, 1]) {
    const lateralBase = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.1, 0.12), maderaOsc);
    lateralBase.position.set(-0.48, 0.78, lado * 0.94);
    chasis.add(lateralBase);
    const liston1 = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.12, 0.16), lado < 0 ? amarillo : azul);
    liston1.position.set(-0.48, 1.05, lado * 0.94);
    chasis.add(liston1);
    const liston2 = liston1.clone();
    liston2.position.y += 0.26;
    chasis.add(liston2);
    const liston3 = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.12, 0.16), lado < 0 ? rojo : madera);
    liston3.position.set(-0.48, 1.3, lado * 0.94);
    chasis.add(liston3);
    const marcoVentana = new THREE.Group();
    const marcoH = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 0.07), maderaOsc);
    marcoH.position.set(0, 0.24, 0);
    marcoVentana.add(marcoH);
    const marcoH2 = marcoH.clone();
    marcoH2.position.y = -0.24;
    marcoVentana.add(marcoH2);
    const marcoV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.07), maderaOsc);
    marcoV.position.set(-0.98, 0, 0);
    marcoVentana.add(marcoV);
    const marcoV2 = marcoV.clone();
    marcoV2.position.x = 0.98;
    marcoVentana.add(marcoV2);
    const marcoV3 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.38, 0.07), maderaOsc);
    marcoV3.position.set(0.06, 0.0, 0);
    marcoVentana.add(marcoV3);
    const fondo = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.38, 0.06), M(THREE, 0x211912, 0.98));
    fondo.position.set(0, 0, -0.02);
    marcoVentana.add(fondo);
    marcoVentana.position.set(-0.5, 1.18, lado * 0.95);
    chasis.add(marcoVentana);
  }

  const parabrisas = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.88, 1.66), vidrio);
  parabrisas.position.set(1.72, 1.2, 0);
  parabrisas.rotation.z = -0.4;
  chasis.add(parabrisas);

  const techo = new THREE.Mesh(new THREE.BoxGeometry(2.68, 0.1, 1.96), madera);
  techo.position.set(-0.1, 1.68, 0);
  chasis.add(techo);
  const barandal = new THREE.Mesh(new THREE.BoxGeometry(2.92, 0.06, 2.06), metal);
  barandal.position.set(-0.1, 1.82, 0);
  chasis.add(barandal);
  for (const x of [-1.02, -0.18, 0.7, 1.5]) {
    const poste = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.36, 0.08), metal);
    poste.position.set(x, 1.99, 0.97);
    chasis.add(poste);
    const poste2 = poste.clone();
    poste2.position.z = -0.97;
    chasis.add(poste2);
  }

  const bultos = [
    [0x8a6f3c, -0.9, 0.28],
    [0x6b5a3a, -0.18, -0.2],
    [0x9c7a3e, 0.58, 0.34],
    [0xb59762, 0.18, -0.06],
  ];
  for (let i = 0; i < bultos.length; i++) {
    const [col, x, z] = bultos[i];
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.52, 0.78), M(THREE, col, 0.9));
    b.position.set(x, 2.03, z);
    b.rotation.y = i * 0.35;
    chasis.add(b);
  }
  const canasto = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.42, 7), M(THREE, 0x9a7b45, 0.86));
  canasto.rotation.z = Math.PI / 2;
  canasto.position.set(-0.95, 2.02, -0.38);
  chasis.add(canasto);
  const cuerdaA = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.3, 5), M(THREE, 0x6b4b2e, 0.95));
  cuerdaA.rotation.z = 0.12;
  cuerdaA.position.set(-0.16, 2.11, 0.48);
  chasis.add(cuerdaA);
  const cuerdaB = cuerdaA.clone();
  cuerdaB.position.z = -0.48;
  chasis.add(cuerdaB);
  const gallina = new THREE.Group();
  const gBody = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), M(THREE, 0xf0ede4, 0.92));
  gBody.scale.set(1.2, 0.9, 1);
  gallina.add(gBody);
  const gHead = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), M(THREE, 0xf3f0e9, 0.92));
  gHead.position.set(0.14, 0.05, 0);
  gallina.add(gHead);
  const pico = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 5), M(THREE, 0xe0b12b, 0.9));
  pico.rotation.z = -Math.PI / 2;
  pico.position.set(0.19, 0.04, 0);
  gallina.add(pico);
  gallina.position.set(-1.0, 2.16, 0.1);
  gallina.rotation.y = -0.5;
  gallina.scale.setScalar(0.8);
  chasis.add(gallina);

  const defensa = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.28, 1.94), cromado);
  defensa.position.set(1.98, 0.34, 0);
  chasis.add(defensa);
  const defensa2 = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 1.88), cromado);
  defensa2.position.set(1.78, 0.48, 0);
  chasis.add(defensa2);
  for (const lado of [-1, 1]) {
    const faro = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), luzBloque(THREE, 0xfff3c4, 0.18, 0.08));
    faro.position.set(1.88, 0.88, lado * 0.64);
    chasis.add(faro);
    const luzTras = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), luzBloque(THREE, lado > 0 ? 0xff5b4d : 0xff6f52, 0.22, 0.08));
    luzTras.position.set(-2.06, 0.72, lado * 0.68);
    chasis.add(luzTras);
  }
  const ruta = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.7), M(THREE, 0xede0a0, 0.55));
  ruta.position.set(1.88, 1.48, 0);
  chasis.add(ruta);
  const escalera = new THREE.Group();
  const ladoL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.82, 0.06), metal);
  ladoL.position.set(-2.06, 1.08, 0.27);
  escalera.add(ladoL);
  const ladoL2 = ladoL.clone();
  ladoL2.position.z = -0.27;
  escalera.add(ladoL2);
  for (const y of [0.82, 1.0, 1.18, 1.36]) {
    const pel = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.08), metal);
    pel.position.set(-2.06, y, 0);
    escalera.add(pel);
  }
  escalera.position.y = -0.02;
  chasis.add(escalera);

  const radio = 0.44, ancho = 0.32;
  const ruedas = [], ruedasF = [];
  const posR = [
    { x: 1.18, z: 0.93, f: true },
    { x: 1.18, z: -0.93, f: true },
    { x: -1.16, z: 0.93, f: false },
    { x: -1.16, z: -0.93, f: false },
  ];
  for (const p of posR) {
    const r = rueda(THREE, radio, ancho);
    r.position.set(p.x, radio, p.z);
    chasis.add(r);
    ruedas.push(r);
    if (p.f) ruedasF.push(r);
    const arco = arcoRueda(THREE, radio, 0.05, 0x5f4e3d);
    arco.position.set(p.x, radio + 0.34, p.z);
    arco.rotation.y = Math.PI / 2;
    chasis.add(arco);
  }

  const volante = crearVolante(THREE, 0x2d2d32);
  volante.position.set(0.76, 1.12, 0);
  volante.rotation.z = Math.PI / 2;
  chasis.add(volante);
  const piloto = crearPiloto(THREE, { tipo: veh.piloto ?? 'angelita', modo: 'cabina', escala: 0.82 });
  piloto.grupo.position.set(0.24, 0.98, 0);
  piloto.grupo.rotation.y = Math.PI / 2;
  piloto.grupo.scale.setScalar(0.96);
  chasis.add(piloto.grupo);

  return { grupo, ruedas, ruedasF, chasis, alturaPiso: 0.62, radioRueda: radio, piloto, volante };
}

function construirMoto(THREE, veh) {
  const grupo = new THREE.Group();
  const chasis = new THREE.Group();
  grupo.add(chasis);
  const color = M(THREE, veh.color, 0.82);
  const negro = M(THREE, 0x19191d, 0.92);
  const metal = M(THREE, 0x9ca0a6, 0.36, 0.7);
  const gris = M(THREE, veh.color2, 0.78);

  const cuadro = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.26, 0.18), negro);
  cuadro.position.set(-0.06, 0.5, 0);
  cuadro.rotation.z = -0.08;
  chasis.add(cuadro);
  const tanque = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.58, 10), color);
  tanque.rotation.x = Math.PI / 2;
  tanque.position.set(0.34, 0.77, 0);
  chasis.add(tanque);
  const motor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.28), gris);
  motor.position.set(0.12, 0.52, 0);
  chasis.add(motor);
  const guardaf = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.54), color);
  guardaf.position.set(0.92, 0.63, 0);
  guardaf.rotation.z = 0.15;
  chasis.add(guardaf);
  const guardar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.46), color);
  guardar.position.set(-0.98, 0.48, 0);
  guardar.rotation.z = -0.12;
  chasis.add(guardar);
  const sillin = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.12, 0.36), negro);
  sillin.position.set(-0.12, 0.7, 0);
  chasis.add(sillin);
  const escape = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.9, 8), metal);
  escape.rotation.z = -0.8;
  escape.position.set(-0.32, 0.48, -0.24);
  chasis.add(escape);
  const parrilla = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.07, 0.34), metal);
  parrilla.position.set(-0.72, 0.9, 0);
  chasis.add(parrilla);
  const costal = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.34), M(THREE, 0x8d7a53, 0.95));
  costal.position.set(-0.74, 1.04, 0.03);
  costal.rotation.z = 0.14;
  chasis.add(costal);
  const manillar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.82), metal);
  manillar.position.set(0.84, 1.02, 0);
  chasis.add(manillar);
  const puño = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), negro);
  puño.position.set(1.15, 1.02, 0);
  chasis.add(puño);
  const faro = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), luzBloque(THREE, 0xfff3ca, 0.18, 0.08));
  faro.position.set(1.24, 0.92, 0);
  chasis.add(faro);
  const cola = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.16), luzBloque(THREE, 0xff5b4d, 0.22, 0.08));
  cola.position.set(-1.22, 0.58, 0);
  chasis.add(cola);

  const radio = 0.4, ancho = 0.12;
  const ruedas = [], ruedasF = [];
  for (const p of [{ x: 0.95, f: true }, { x: -1.0, f: false }]) {
    const r = rueda(THREE, radio, ancho);
    r.position.set(p.x, radio, 0);
    chasis.add(r);
    ruedas.push(r);
    if (p.f) ruedasF.push(r);
    const arco = arcoRueda(THREE, radio, 0.03, 0x333338);
    arco.position.set(p.x, radio + 0.24, 0);
    arco.rotation.y = Math.PI / 2;
    chasis.add(arco);
  }

  const piloto = crearPiloto(THREE, { tipo: veh.piloto ?? 'angelita', modo: 'expuesto', escala: 0.7 });
  piloto.grupo.position.set(-0.08, 0.76, 0);
  piloto.grupo.rotation.y = Math.PI / 2;
  piloto.grupo.scale.setScalar(0.92);
  chasis.add(piloto.grupo);

  return { grupo, ruedas, ruedasF, chasis, alturaPiso: 0.52, radioRueda: radio, piloto };
}

function construirCamioneta(THREE, veh, volqueta = false) {
  const grupo = new THREE.Group();
  const chasis = new THREE.Group();
  grupo.add(chasis);
  const color = M(THREE, veh.color, 0.82);
  const color2 = M(THREE, veh.color2, 0.9);
  const color3 = M(THREE, veh.color3 ?? veh.color2, 0.84);
  const vidrio = M(THREE, 0xa8c6da, 0.16, 0.5);
  const metal = M(THREE, 0x6f7378, 0.36, 0.7);
  const negro = M(THREE, 0x17171d, 0.95);

  const piso = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.38, 1.86), volqueta ? color2 : color);
  piso.position.set(0.02, 0.48, 0);
  chasis.add(piso);

  let piloto = null;
  let volante = null;

  if (volqueta) {
    const cabina = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 1.76), color);
    cabina.position.set(1.7, 1.12, 0);
    chasis.add(cabina);
    const capot = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 1.78), color3);
    capot.position.set(1.95, 0.95, 0);
    chasis.add(capot);
    const parabrisas = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.68, 1.58), vidrio);
    parabrisas.position.set(1.33, 1.26, 0);
    parabrisas.rotation.z = 0.1;
    chasis.add(parabrisas);
    const caja = new THREE.Mesh(new THREE.BoxGeometry(2.28, 1.05, 1.78), color2);
    caja.position.set(-0.42, 1.22, 0);
    caja.rotation.z = 0.08;
    chasis.add(caja);
    const estacas = new THREE.Group();
    for (const x of [-1.38, -0.55, 0.3, 1.14]) {
      const est = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), M(THREE, 0x7f5e34, 0.95));
      est.position.set(x, 1.45, 0.86);
      estacas.add(est);
      const est2 = est.clone();
      est2.position.z = -0.86;
      estacas.add(est2);
    }
    chasis.add(estacas);
    const tablon = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.12, 0.16), M(THREE, 0x7b5d39, 0.94));
    tablon.position.set(-0.5, 0.9, 0.88);
    chasis.add(tablon);
    const tablon2 = tablon.clone();
    tablon2.position.z = -0.88;
    chasis.add(tablon2);
    const lazo = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.03, 6, 10), M(THREE, 0xcaa96a, 0.7));
    lazo.rotation.x = Math.PI / 2;
    lazo.position.set(-0.2, 1.68, 0);
    chasis.add(lazo);
    const bulto = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.5), M(THREE, 0xa38a62, 0.92));
    bulto.position.set(-0.75, 1.56, 0);
    bulto.rotation.y = 0.2;
    chasis.add(bulto);
    piloto = crearPiloto(THREE, { tipo: veh.piloto ?? 'angelita', modo: 'cabina', escala: 0.8 });
    piloto.grupo.position.set(1.3, 1.0, 0);
    piloto.grupo.rotation.y = Math.PI / 2;
    chasis.add(piloto.grupo);
    volante = crearVolante(THREE);
    volante.position.set(1.42, 1.18, 0);
    volante.rotation.z = Math.PI / 2;
    chasis.add(volante);
  } else {
    const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(2.88, 0.92, 1.82), color);
    cuerpo.position.set(0.1, 1.05, 0);
    chasis.add(cuerpo);
    const nariz = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.72, 1.78), color3);
    nariz.position.set(1.55, 0.9, 0);
    chasis.add(nariz);
    const cabina = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.96, 1.74), color);
    cabina.position.set(1.0, 1.12, 0);
    chasis.add(cabina);
    const parabrisas = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.76, 1.64), vidrio);
    parabrisas.position.set(1.22, 1.28, 0);
    parabrisas.rotation.z = -0.18;
    chasis.add(parabrisas);
    const techo = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.14, 1.76), color2);
    techo.position.set(0.86, 1.62, 0);
    chasis.add(techo);
    const rielA = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 1.82), metal);
    rielA.position.set(0.55, 1.86, 0.94);
    chasis.add(rielA);
    const rielB = rielA.clone();
    rielB.position.z = -0.94;
    chasis.add(rielB);
    const baranda = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 0.06), metal);
    baranda.position.set(0.86, 1.94, 0.96);
    chasis.add(baranda);
    const baranda2 = baranda.clone();
    baranda2.position.z = -0.96;
    chasis.add(baranda2);
    const paquete = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.5, 0.6), M(THREE, 0x9a8159, 0.95));
    paquete.position.set(-0.45, 1.52, 0);
    chasis.add(paquete);
    for (const lado of [-1, 1]) {
      const faro = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), M(THREE, 0xfaf0c8, 0.22, 0.08));
      faro.position.set(1.98, 0.94, lado * 0.6);
      chasis.add(faro);
    }
    piloto = crearPiloto(THREE, { tipo: veh.piloto ?? 'angelita', modo: 'cabina', escala: 0.78 });
    piloto.grupo.position.set(1.0, 1.02, 0);
    piloto.grupo.rotation.y = Math.PI / 2;
    chasis.add(piloto.grupo);
    volante = crearVolante(THREE);
    volante.position.set(1.28, 1.18, 0);
    volante.rotation.z = Math.PI / 2;
    chasis.add(volante);
  }

  const radio = 0.47, ancho = 0.36;
  const ruedas = [], ruedasF = [];
  const base = [
    { x: 1.42, z: 0.94, f: true },
    { x: 1.42, z: -0.94, f: true },
    { x: -1.42, z: 0.94, f: false },
    { x: -1.42, z: -0.94, f: false },
  ];
  for (const p of base) {
    const r = rueda(THREE, radio, ancho);
    r.position.set(p.x, radio, p.z);
    chasis.add(r);
    ruedas.push(r);
    if (p.f) ruedasF.push(r);
    const arco = arcoRueda(THREE, radio, 0.05, volqueta ? 0x5f4e3d : 0x4e5360);
    arco.position.set(p.x, radio + 0.34, p.z);
    arco.rotation.y = Math.PI / 2;
    chasis.add(arco);
  }

  const faroL = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), luzBloque(THREE, 0xffefc4, 0.2, 0.08));
  faroL.position.set(2.1, volqueta ? 1.02 : 1.0, 0.62);
  chasis.add(faroL);
  const faroR = faroL.clone();
  faroR.position.z = -0.62;
  chasis.add(faroR);
  const luzTrasL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.18), luzBloque(THREE, 0xff5b4d, 0.22, 0.08));
  luzTrasL.position.set(-2.02, volqueta ? 1.14 : 0.92, 0.7);
  chasis.add(luzTrasL);
  const luzTrasR = luzTrasL.clone();
  luzTrasR.position.z = -0.7;
  chasis.add(luzTrasR);
  const defensaFrontal = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.26, 1.86), metal);
  defensaFrontal.position.set(2.06, 0.44, 0);
  chasis.add(defensaFrontal);
  const defensaTrasera = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 1.74), metal);
  defensaTrasera.position.set(-2.08, volqueta ? 0.98 : 0.82, 0);
  chasis.add(defensaTrasera);

  if (!volqueta) {
    const spare = new THREE.Group();
    const aro = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.18, 14), M(THREE, 0x1c1c1e, 0.95));
    aro.rotation.x = Math.PI / 2;
    spare.add(aro);
    const rin = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.2, 10), M(THREE, 0xb7b7bb, 0.34, 0.6));
    rin.rotation.x = Math.PI / 2;
    spare.add(rin);
    spare.position.set(-1.72, 0.92, -0.02);
    spare.rotation.z = Math.PI / 2;
    chasis.add(spare);
  }

  return { grupo, ruedas, ruedasF, chasis, alturaPiso: volqueta ? 0.62 : 0.6, radioRueda: radio, piloto, volante };
}

function construirSuv(THREE, veh) {
  const grupo = new THREE.Group();
  const chasis = new THREE.Group();
  grupo.add(chasis);
  const cuerpo = M(THREE, veh.color, 0.84);
  const vidrio = M(THREE, 0xadd0e1, 0.16, 0.45);
  const metal = M(THREE, veh.color3 ?? 0x848a94, 0.34, 0.65);
  const negro = M(THREE, 0x17171b, 0.95);

  const piso = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.34, 1.84), cuerpo);
  piso.position.set(0.0, 0.46, 0);
  chasis.add(piso);
  const carro = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.9, 1.8), cuerpo);
  carro.position.set(-0.08, 1.05, 0);
  chasis.add(carro);
  const morro = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.58, 1.78), cuerpo);
  morro.position.set(1.28, 0.92, 0);
  chasis.add(morro);
  const frente = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.54, 1.6), metal);
  frente.position.set(1.85, 0.94, 0);
  chasis.add(frente);
  const parabrisas = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.72, 1.66), vidrio);
  parabrisas.position.set(0.92, 1.18, 0);
  parabrisas.rotation.z = -0.14;
  chasis.add(parabrisas);
  const luneta = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.56, 1.56), vidrio);
  luneta.position.set(-0.9, 1.12, 0);
  luneta.rotation.z = 0.12;
  chasis.add(luneta);
  const techo = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.1, 1.78), cuerpo);
  techo.position.set(-0.02, 1.62, 0);
  chasis.add(techo);
  const riel1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 1.82), metal);
  riel1.position.set(-0.4, 1.84, 0.94);
  chasis.add(riel1);
  const riel2 = riel1.clone();
  riel2.position.z = -0.94;
  chasis.add(riel2);
  const tira = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.06, 0.06), metal);
  tira.position.set(-0.02, 1.92, 0.96);
  chasis.add(tira);
  const tira2 = tira.clone();
  tira2.position.z = -0.96;
  chasis.add(tira2);
  const luces = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 1.52), M(THREE, 0xdce8ef, 0.28, 0.12));
  luces.position.set(1.92, 1.02, 0);
  chasis.add(luces);
  const parrilla = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.3, 1.34), cuerpo);
  parrilla.position.set(2.0, 0.84, 0);
  chasis.add(parrilla);

  for (const lado of [-1, 1]) {
    const arco = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.16, 12), metal);
    arco.rotation.z = Math.PI / 2;
    arco.position.set(1.02, 0.74, lado * 0.94);
    chasis.add(arco);
    const arco2 = arco.clone();
    arco2.position.x = -1.0;
    chasis.add(arco2);
  }

  const radio = 0.48, ancho = 0.35;
  const ruedas = [], ruedasF = [];
  for (const p of [{ x: 1.0, z: 0.92, f: true }, { x: 1.0, z: -0.92, f: true }, { x: -1.0, z: 0.92, f: false }, { x: -1.0, z: -0.92, f: false }]) {
    const r = rueda(THREE, radio, ancho, 0x1d1d20);
    r.position.set(p.x, radio, p.z);
    chasis.add(r);
    ruedas.push(r);
    if (p.f) ruedasF.push(r);
    const arco = arcoRueda(THREE, radio, 0.05, 0x4d5660);
    arco.position.set(p.x, radio + 0.34, p.z);
    arco.rotation.y = Math.PI / 2;
    chasis.add(arco);
  }
  const luzDel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 1.38), luzBloque(THREE, 0xffeec0, 0.22, 0.08));
  luzDel.position.set(2.02, 1.0, 0);
  chasis.add(luzDel);
  const luzTras = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 1.34), luzBloque(THREE, 0xff5d50, 0.24, 0.08));
  luzTras.position.set(-1.94, 1.0, 0);
  chasis.add(luzTras);

  const piloto = crearPiloto(THREE, { tipo: veh.piloto ?? 'angelita', modo: 'cabina', escala: 0.74 });
  piloto.grupo.position.set(0.18, 1.0, 0);
  piloto.grupo.rotation.y = Math.PI / 2;
  chasis.add(piloto.grupo);
  const volante = crearVolante(THREE, 0x31313a);
  volante.position.set(0.58, 1.12, 0);
  volante.rotation.z = Math.PI / 2;
  chasis.add(volante);

  return { grupo, ruedas, ruedasF, chasis, alturaPiso: 0.6, radioRueda: radio, piloto, volante };
}

function construirCoupe(THREE, veh) {
  const grupo = new THREE.Group();
  const chasis = new THREE.Group();
  grupo.add(chasis);
  const cuerpo = M(THREE, veh.color, 0.74);
  const metal = M(THREE, veh.color3 ?? 0x6b717a, 0.32, 0.72);
  const vidrio = M(THREE, 0xd1e4ef, 0.14, 0.42);
  const negro = M(THREE, 0x131316, 0.95);

  const piso = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.28, 1.76), cuerpo);
  piso.position.set(0.05, 0.38, 0);
  chasis.add(piso);
  const capot = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.34, 1.7), cuerpo);
  capot.position.set(1.25, 0.7, 0);
  chasis.add(capot);
  const cabina = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.78, 1.66), cuerpo);
  cabina.position.set(-0.1, 0.98, 0);
  cabina.rotation.z = -0.08;
  chasis.add(cabina);
  const techo = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 1.62), cuerpo);
  techo.position.set(-0.12, 1.42, 0);
  chasis.add(techo);
  const parabrisas = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.74, 1.54), vidrio);
  parabrisas.position.set(0.58, 1.1, 0);
  parabrisas.rotation.z = -0.26;
  chasis.add(parabrisas);
  const luneta = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.52, 1.5), vidrio);
  luneta.position.set(-0.86, 1.02, 0);
  luneta.rotation.z = 0.22;
  chasis.add(luneta);
  const faros = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 1.46), M(THREE, 0xf5f0d8, 0.24, 0.08));
  faros.position.set(1.84, 0.82, 0);
  chasis.add(faros);
  const parrilla = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 1.28), metal);
  parrilla.position.set(1.92, 0.65, 0);
  chasis.add(parrilla);
  const difusor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 1.52), metal);
  difusor.position.set(-1.48, 0.43, 0);
  chasis.add(difusor);
  const escape1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.36, 8), negro);
  escape1.rotation.z = Math.PI / 2;
  escape1.position.set(-1.52, 0.31, 0.28);
  chasis.add(escape1);
  const escape2 = escape1.clone();
  escape2.position.z = -0.28;
  chasis.add(escape2);

  const radio = 0.43, ancho = 0.31;
  const ruedas = [], ruedasF = [];
  for (const p of [{ x: 1.08, z: 0.88, f: true }, { x: 1.08, z: -0.88, f: true }, { x: -1.08, z: 0.88, f: false }, { x: -1.08, z: -0.88, f: false }]) {
    const r = rueda(THREE, radio, ancho, 0x1c1c20);
    r.position.set(p.x, radio, p.z);
    chasis.add(r);
    ruedas.push(r);
    if (p.f) ruedasF.push(r);
    const arco = arcoRueda(THREE, radio, 0.05, 0x51515a);
    arco.position.set(p.x, radio + 0.31, p.z);
    arco.rotation.y = Math.PI / 2;
    chasis.add(arco);
  }
  const luzFrente = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 1.38), luzBloque(THREE, 0xf6efc4, 0.2, 0.08));
  luzFrente.position.set(1.9, 0.84, 0);
  chasis.add(luzFrente);
  const luzAtras = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 1.34), luzBloque(THREE, 0xff5b4d, 0.22, 0.08));
  luzAtras.position.set(-1.52, 0.46, 0);
  chasis.add(luzAtras);
  const defDel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 1.5), metal);
  defDel.position.set(1.9, 0.54, 0);
  chasis.add(defDel);
  const defTras = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 1.42), metal);
  defTras.position.set(-1.58, 0.48, 0);
  chasis.add(defTras);

  const piloto = crearPiloto(THREE, { tipo: veh.piloto ?? 'angelita', modo: 'cabina', escala: 0.74 });
  piloto.grupo.position.set(-0.12, 0.86, 0);
  piloto.grupo.rotation.y = Math.PI / 2;
  chasis.add(piloto.grupo);
  const volante = crearVolante(THREE, 0x2b2b30);
  volante.position.set(0.02, 1.05, 0);
  volante.rotation.z = Math.PI / 2;
  chasis.add(volante);

  return { grupo, ruedas, ruedasF, chasis, alturaPiso: 0.48, radioRueda: radio, piloto, volante };
}

function construirCarretilla(THREE, veh) {
  const grupo = new THREE.Group();
  const chasis = new THREE.Group();
  grupo.add(chasis);
  const metal = M(THREE, veh.color, 0.82);
  const metalOsc = M(THREE, veh.color3 ?? 0x78593d, 0.92);
  const madera = M(THREE, veh.color2, 0.9);
  const tierra = M(THREE, 0x8a673d, 0.96);
  const verde = M(THREE, 0x5e8d3d, 0.9);
  const negro = M(THREE, 0x1c1c1f, 0.95);

  const balde = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.18, 0.7), metal);
  base.position.set(0, 0.38, 0);
  balde.add(base);
  const frente = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.7), metal);
  frente.position.set(0.44, 0.56, 0);
  frente.rotation.z = -0.18;
  balde.add(frente);
  const atras = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.7), metalOsc);
  atras.position.set(-0.44, 0.58, 0);
  atras.rotation.z = 0.18;
  balde.add(atras);
  const lado1 = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.38, 0.12), metal);
  lado1.position.set(0, 0.56, 0.33);
  lado1.rotation.z = 0.06;
  balde.add(lado1);
  const lado2 = lado1.clone();
  lado2.position.z = -0.33;
  balde.add(lado2);
  const suciedad = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.28, 0.48), tierra);
  suciedad.position.set(0.04, 0.56, 0);
  balde.add(suciedad);
  const mata = new THREE.Group();
  const tallo = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.36, 6), verde);
  tallo.position.y = 0.16;
  mata.add(tallo);
  const hoja = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.05, 0.26, 5), M(THREE, 0x7ca650, 0.9));
  hoja.rotation.z = 0.8;
  hoja.position.set(0.06, 0.3, 0);
  mata.add(hoja);
  mata.position.set(0.12, 0.84, 0.04);
  balde.add(mata);
  balde.position.set(0, 0.1, 0);
  balde.rotation.z = -0.1;
  chasis.add(balde);

  const rueda = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.14, 14), negro);
  rueda.rotation.x = Math.PI / 2;
  rueda.position.set(0.82, 0.28, 0);
  chasis.add(rueda);
  const rin = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.16, 10), M(THREE, 0xbdbdbf, 0.34, 0.6));
  rin.rotation.x = Math.PI / 2;
  rin.position.set(0.82, 0.28, 0);
  chasis.add(rin);

  for (const lado of [-1, 1]) {
    const pata = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), metalOsc);
    pata.position.set(-0.5, 0.16, lado * 0.24);
    pata.rotation.z = lado * 0.14;
    chasis.add(pata);
  }
  const puntaL = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.08), madera);
  puntaL.position.set(-0.74, -0.02, 0.23);
  puntaL.rotation.z = -0.34;
  chasis.add(puntaL);
  const puntaR = puntaL.clone();
  puntaR.position.z = -0.23;
  chasis.add(puntaR);
  for (const lado of [-1, 1]) {
    const mango = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.08, 0.08), madera);
    mango.position.set(-0.96, 0.94, lado * 0.15);
    mango.rotation.z = lado * 0.08;
    chasis.add(mango);
  }

  const piloto = crearPiloto(THREE, { tipo: veh.piloto ?? 'angelita', modo: 'expuesto', escala: 0.66 });
  piloto.grupo.position.set(-0.12, 0.9, 0);
  piloto.grupo.rotation.y = Math.PI / 2;
  chasis.add(piloto.grupo);

  const ruedas = [rueda];
  const ruedasF = [rueda];
  return { grupo, ruedas, ruedasF, chasis, alturaPiso: 0.38, radioRueda: 0.3, piloto };
}

function construirSkate(THREE, veh) {
  const grupo = new THREE.Group();
  const chasis = new THREE.Group();
  grupo.add(chasis);
  const tabla = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 0.08, 0.42),
    M(THREE, veh.color, 0.78, 0.18)
  );
  tabla.position.set(0, 0.12, 0);
  tabla.rotation.z = -0.04;
  chasis.add(tabla);
  const canto = new THREE.Mesh(
    new THREE.BoxGeometry(1.36, 0.035, 0.34),
    M(THREE, veh.color2 ?? 0xb7bcc0, 0.7, 0.14)
  );
  canto.position.set(0, 0.16, 0);
  chasis.add(canto);
  const cubierta = new THREE.Mesh(
    new THREE.BoxGeometry(1.18, 0.04, 0.28),
    M(THREE, 0x23262b, 0.95, 0.04)
  );
  cubierta.position.set(0, 0.14, 0);
  chasis.add(cubierta);
  const ruedas = [];
  for (const p of [{ x: 0.5, z: 0.18 }, { x: 0.5, z: -0.18 }, { x: -0.5, z: 0.18 }, { x: -0.5, z: -0.18 }]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 10), M(THREE, 0x111116, 0.95));
    r.rotation.x = Math.PI / 2;
    r.position.set(p.x, 0.06, p.z);
    chasis.add(r);
    ruedas.push(r);
  }
  const piloto = crearPiloto(THREE, { tipo: veh.piloto ?? 'angelita', modo: 'skate', escala: 0.72 });
  piloto.grupo.position.set(0, 0.82, 0);
  piloto.grupo.rotation.y = Math.PI / 2;
  chasis.add(piloto.grupo);
  const asa = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6),
    M(THREE, 0xb8bcc1, 0.46, 0.2)
  );
  asa.position.set(0.15, 0.78, 0);
  asa.rotation.z = -0.08;
  chasis.add(asa);
  return { grupo, ruedas, ruedasF: [ruedas[0], ruedas[1]], chasis, alturaPiso: 0.08, radioRueda: 0.09, piloto };
}

// ── Vehiculos nuevos (modulos de arte) ────────────────────────────────────
// Cada factory de js/modelos/ devuelve un THREE.Group con userData
// { ruedas, ruedasF, chasis, volante, alturaPiso, radioRueda, anclaPiloto }.
// El motor espera la forma { grupo, ruedas, ... } de los constructores viejos,
// asi que se adapta aca. Los viejos quedan como respaldo: si una factory falla,
// el juego sigue con el modelo de antes en vez de quedarse sin vehiculo.
// Los imports son ESTATICOS a proposito: asi el cableado no obliga a volver
// asincrono el arranque del juego ni a tocar main.js.
const _factoriasCargadas = new Map([
  ['chiva', crearChiva],
  ['suv', crearLoboGris],
  ['pickup', crearEscarabajoRojo],
  ['coupe', crearBlanco],
  ['carretilla', crearCarretillaNueva],
  ['moto', crearMoto250],
  ['volqueta', crearCamion],
  ['skate', crearPatineta],
]);

// Adapta el Group de una factory nueva a la forma que consume el motor, y le
// monta el piloto en el ancla que el propio modelo declara.
function adaptarModeloNuevo(THREE, grupo, veh) {
  const u = grupo.userData || {};
  const chasis = u.chasis || grupo;
  const ancla = u.anclaPiloto;
  let piloto = null;
  let pilotoNuevo = null;

  // ── opt-in `?piloto2d=…`: lámina en vez de malla ──────────────────────────
  // Sólo si la URL lo pide (modoLamina() devuelve null sin parámetro). Se
  // resuelve ANTES del piloto 3D y con retorno propio, así el modo prueba no
  // paga la construcción de una malla que después descarta. Si falla, sigue de
  // largo y monta el piloto de siempre: la prueba nunca puede dejar el kart vacío.
  const _modo2d = veh.sinLamina ? null : modoLamina();
  if (_modo2d && tieneLamina(veh.piloto ?? 'angelita', _modo2d)) {
    try {
      const lamina = montarPilotoLamina(THREE, grupo, {
        tipo: veh.piloto ?? 'angelita', entero: _modo2d.entero, plano: _modo2d.plano,
      });
      if (lamina) {
        return {
          grupo,
          ruedas: u.ruedas || [],
          ruedasF: u.ruedasF || [],
          chasis,
          alturaPiso: u.alturaPiso ?? 0.6,
          radioRueda: u.radioRueda ?? 0.42,
          volante: u.volante || null,
          piloto: null,
          pilotoNuevo: null,
          pilotoLamina: lamina,
        };
      }
    } catch (e) {
      console.warn('[modelos] piloto-lamina no monto, sigo con el 3D:', e.message);
    }
  }

  // El trazado-riggeado es la piel canónica nueva de jaguar y oso. Se puede
  // apagar para comparar el cuerpo procedural viejo: `?pielTrazado=0`.
  const _tipoTrazado = veh.piloto ?? 'angelita';
  const _trazadoApagado = new URLSearchParams(location.search).get('pielTrazado') === '0';
  if (!_trazadoApagado && tienePilotoTrazado(_tipoTrazado)) {
    try {
      const trazado = montarPilotoTrazado(THREE, grupo, { tipo: _tipoTrazado });
      if (trazado) {
        return {
          grupo, ruedas: u.ruedas || [], ruedasF: u.ruedasF || [], chasis,
          alturaPiso: u.alturaPiso ?? 0.6, radioRueda: u.radioRueda ?? 0.42,
          volante: u.volante || null, piloto: null, pilotoNuevo: null,
          pilotoTrazado: trazado,
        };
      }
    } catch (e) {
      console.warn('[modelos] piloto trazado no monto, sigo con el 3D:', e.message);
    }
  }

  // Piloto NUEVO (rubber-hose que agarra el volante de verdad: las manos se
  // muestrean de la malla del vehiculo, asi que siguen al volante cuando gira).
  // Si falla, se cae al piloto viejo de abajo en vez de dejar el kart vacio.
  try {
    pilotoNuevo = montarPilotoManejando(THREE, grupo, { tipo: veh.piloto ?? 'angelita' });
  } catch (e) {
    console.warn('[modelos] piloto nuevo no monto, uso el viejo:', e.message);
    pilotoNuevo = null;
  }
  if (pilotoNuevo) {
    return {
      grupo,
      ruedas: u.ruedas || [],
      ruedasF: u.ruedasF || [],
      chasis,
      alturaPiso: u.alturaPiso ?? 0.6,
      radioRueda: u.radioRueda ?? 0.42,
      volante: u.volante || null,
      piloto: null,
      pilotoNuevo,
    };
  }

  if (ancla) {
    // Dos formas de ancla: Object3D ya colocado (los 7 vehiculos) u objeto
    // plano { pos, rotY, escala } (la chiva). Se soportan las dos.
    const esObjeto3D = typeof ancla.add === 'function';
    const datos = esObjeto3D ? (ancla.userData || {}) : ancla;
    piloto = crearPiloto(THREE, {
      tipo: veh.piloto ?? 'angelita',
      modo: datos.modo ?? 'cabina',
      escala: datos.escala ?? 0.8,
    });
    if (esObjeto3D) {
      ancla.add(piloto.grupo);
    } else {
      if (datos.pos) piloto.grupo.position.copy(datos.pos);
      piloto.grupo.rotation.y = datos.rotY ?? Math.PI / 2;
      chasis.add(piloto.grupo);
    }
  }
  return {
    grupo,
    ruedas: u.ruedas || [],
    ruedasF: u.ruedasF || [],
    chasis,
    alturaPiso: u.alturaPiso ?? 0.6,
    radioRueda: u.radioRueda ?? 0.42,
    volante: u.volante || null,
    piloto,
  };
}

export function construirModeloVehiculo(THREE, veh) {
  let c;
  const nueva = _factoriasCargadas.get(veh.id ?? 'chiva');
  if (nueva) {
    try {
      c = adaptarModeloNuevo(THREE, nueva(THREE, {}), veh);
    } catch (e) {
      console.warn(`[modelos] el modelo nuevo de ${veh.id} fallo, uso el viejo:`, e.message);
      c = null;
    }
  }
  if (c) { /* modelo nuevo listo */ }
  else if (veh.id === 'moto') c = construirMoto(THREE, veh);
  else if (veh.id === 'pickup') c = construirCamioneta(THREE, veh, false);
  else if (veh.id === 'volqueta') c = construirCamioneta(THREE, veh, true);
  else if (veh.id === 'suv') c = construirSuv(THREE, veh);
  else if (veh.id === 'coupe') c = construirCoupe(THREE, veh);
  else if (veh.id === 'carretilla') c = construirCarretilla(THREE, veh);
  else if (veh.id === 'skate') c = construirSkate(THREE, veh);
  else c = construirChiva(THREE, veh);

  const { grupo, ruedas, ruedasF, chasis, radioRueda } = c;

  const ruedasSet = new Set(ruedas);
  grupo.traverse((o) => {
    if (o.isMesh && !ruedasSet.has(o)) o.castShadow = true;
  });

  let angRueda = 0;
  let baseEsc = null;
  function actualizar(dt, s) {
    grupo.rotation.y = -s.hdg;
    grupo.position.set(s.x, s.y + 0.05, s.z);

    // ── squash & stretch del choque ─────────────────────────────────────────
    // Vive aquí y no en el main porque por esta función pasan TODOS los karts
    // —jugador, rivales y los proxies de red—, así que el golpe se ve igual en
    // cualquiera sin cablearlo tres veces. `s.sacudon` lo produce crearSacudon()
    // en fx-toon.js; si no viene, esto no hace nada.
    if (baseEsc === null) baseEsc = { x: grupo.scale.x, y: grupo.scale.y, z: grupo.scale.z };
    const sq = s.sacudon;
    if (sq) {
      grupo.scale.set(baseEsc.x * sq.sx, baseEsc.y * sq.sy, baseEsc.z * sq.sz);
      grupo.rotation.y = -s.hdg + sq.yaw;
    } else if (grupo.scale.x !== baseEsc.x || grupo.scale.y !== baseEsc.y) {
      grupo.scale.set(baseEsc.x, baseEsc.y, baseEsc.z);
    }
    chasis.rotation.z = -s.roll;
    chasis.rotation.x = -s.pitch;

    angRueda += (s.vel * dt) / radioRueda;
    const giroDir = s._yaw ? s._yaw.girar : 0;
    const angulo = giroDir * 0.42;
    // El grupo de rueda tiene su eje en Z (rueda() acuesta el cilindro con
    // rotation.x = PI/2) y el vehiculo mira +X: hay que girar en Z, no en X.
    // Con rotation.x la rueda se TUMBA de costado en vez de rodar — invisible
    // con llantas lisas, evidente ahora que tienen tacos. El signo es negativo
    // porque angRueda crece al avanzar y en +Z el giro positivo va hacia atras.
    // Probado con _gate/prueba-eje-rueda.html (captura prueba-eje-rueda.png).
    for (const r of ruedas) r.rotation.z = -angRueda;
    for (const r of ruedasF) r.rotation.y = angulo;
    if (c.volante) c.volante.rotation.z = Math.PI / 2 - giroDir * 0.55;
    if (c.piloto) animarPiloto(c.piloto, veh, s);
    if (c.pilotoNuevo) {
      // El piloto nuevo no se anima parte por parte: recibe la pose completa
      // como parametros continuos y el modulo resuelve manos, inclinacion y cara.
      aplicarPose(c.pilotoNuevo, {
        giro: Math.max(-1, Math.min(1, giroDir)),
        salto: s.onGround ? 0 : 1,
        turbo: s.turbo ? 1 : 0,
        velocidad: Math.min(1, Math.abs(s.vel) / Math.max(1, veh.velMax || 1)),
        // el canal `susto` es la reacción del piloto al golpe: ojos abiertos,
        // cejas arriba, boca de espanto y manos que se sueltan del volante. En
        // el lenguaje de los 30 la cara vale tanto como el impacto del fierro.
        susto: Math.max(0, Math.min(1, s.susto ?? 0)),
        drift: s.drift?.act ? s.drift.dir : 0,
        t: performance.now() / 1000,
      });
    }
    // La lámina consume el MISMO contrato de pose que el piloto 3D, más tres
    // canales que necesita para acusar el terreno. El chasis va pegado al suelo
    // (fisica.js: `s.y = ground` mientras onGround), así que `y` ES la loma: de
    // su segunda derivada sale el golpe que sacude al busto. `susto` ya existía
    // y la lámina no lo usaba — ahora es la reacción de la cara al choque.
    if (c.pilotoLamina) {
      c.pilotoLamina.actualizar({
        giro: Math.max(-1, Math.min(1, giroDir)),
        salto: s.onGround ? 0 : 1,
        turbo: s.turbo ? 1 : 0,
        velocidad: Math.min(1, Math.abs(s.vel) / Math.max(1, veh.velMax || 1)),
        susto: Math.max(0, Math.min(1, s.susto ?? 0)),
        drift: s.drift?.act ? s.drift.dir : 0,
        y: s.y,
        enSuelo: s.onGround !== false,
        aterrizo: !!s.aterrizo,
        t: performance.now() / 1000,
      });
    }
    if (c.pilotoTrazado) {
      c.pilotoTrazado.actualizar({
        giro: Math.max(-1, Math.min(1, giroDir)),
        salto: s.onGround ? 0 : 1,
        turbo: s.turbo ? 1 : 0,
        velocidad: Math.min(1, Math.abs(s.vel) / Math.max(1, veh.velMax || 1)),
        t: performance.now() / 1000,
      });
    }
  }

  c.actualizar = actualizar;
  return c;
}
