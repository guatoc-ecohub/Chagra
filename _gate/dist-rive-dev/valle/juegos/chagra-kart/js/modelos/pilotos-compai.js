// ── pilotos-compai.js — los cinco compai del valle que faltaban en el Kart ──
//
// Oso, zarigüeya, luciérnaga y los dos chivitos: los cinco pilotos que el
// roster ofrecía y que caían al cuerpo de Angelita recoloreado (F19). Mismo
// patrón que pilotos-beneficos.js: aquí vive SOLO la geometría de especie y
// sus rasgos; la maquinaria de pose (mangueras bezier, agarres del volante,
// cara continua) es la de pilotos-manejando.js y NO se duplica.
//
// La identidad NO se inventa aquí: cada personaje ya está dibujado y aprobado
// en compai/laminas/{oso,zariguya,luciernaga,chivito-punk,chivito-normal}.png,
// y tres traen además su ficha de identidad como datos en el repo de la PWA
// (osoBastonIdentidad, zariguyaIdentidad, luciernagaIdentidad). Las paletas de
// abajo están calcadas de esas fuentes, no elegidas de memoria.
//
// El roster muestra a los pilotos DE ESPALDAS (y la cámara de carrera también
// los persigue): cada silueta carga su firma donde esa cámara la ve — la cola
// desnuda y las crías al lomo de la zarigüeya, la linterna encendida de la
// luciérnaga, la cresta del chivito, la mole oscura del oso.

import { crearAla, crearAntena, matAla, texturasAlas } from './pilotos-beneficos.js';
// F25: los acentos de identidad (hocico, linterna, barba, cresta punk…) salen
// de la MISMA piel que pinta al compai en el valle (compai/rigs/* resuelto por
// build-piel-kart.mjs), no de hexes copiados de memoria.
import { PIEL_RIGS } from './piel-rigs.js';

// ── rasgos: los escalares que lee el constructor genérico ───────────────────
// Mismo contrato que RASGOS_BENEFICOS: torso/craneo/hombroX/rBrazo/rPierna/
// escalaRel/ojo. `cola` es el único campo nuevo y lo consume el bloque de cola
// que ya existía (perros y jaguar): datos nuevos, maquinaria vieja.

export const RASGOS_COMPAI = {
  oso: {
    // Tremarctos ornatus: el más grande del elenco — mole de hombros, patas
    // gruesas, cráneo ancho de hocico corto (el domo alto leería peluche)
    escalaRel: 1.06,
    torso: [1.34, 1.02, 1.12],
    hombroX: 0.27,
    craneo: [1.16, 1.0, 1.0],
    rBrazo: [0.075, 0.06], rPierna: [0.09, 0.074],
    // la ceja va BAJA, montada sobre el aro crema del anteojo: a la altura de
    // siempre flotaría sobre pelaje casi negro y desaparecería (lección de la
    // avispita: el detalle oscuro necesita fondo claro)
    ojo: { x: 0.085, y: 0.055, z: 0.152, cejaW: 0.066, cejaDY: 0.056, cejaDZ: 0.02 },
  },
  zariguya: {
    // Didelphis: cuerpo en pera, patas finas, cráneo que se estira en la cuña
    // del hocico. Ojos GRANDES y oscuros de animal de noche.
    escalaRel: 0.97,
    torso: [1.06, 1.0, 0.95],
    hombroX: 0.215,
    craneo: [0.95, 0.92, 1.05],
    rBrazo: [0.045, 0.035], rPierna: [0.056, 0.045],
    // LA COLA DESNUDA: piel rosada-parda, no pelo. Es firma de forma — una
    // zarigüeya sin esa cola es una rata gorda. Larga y fina, bien distinta
    // de la del jaguar (corta y gruesa) y la de los perros.
    cola: { color: 0xd9b4a4, r0: 0.034, r1: 0.012, largo: 1.22, rough: 0.62 },
    ojo: { x: 0.08, y: 0.06, z: 0.148, r: 0.058, rPupila: 0.03, cejaDY: 0.06, cejaDZ: 0.012 },
  },
  luciernaga: {
    // Lampyridae: bicho compacto de élitros blandos. Los ojos van BAJOS,
    // asomando bajo la visera del pronoto.
    escalaRel: 0.92,
    torso: [0.95, 0.98, 0.86],
    hombroX: 0.19,
    craneo: [1.02, 0.9, 0.96],
    rBrazo: [0.04, 0.03], rPierna: [0.05, 0.04],
    ojo: { x: 0.082, y: 0.035, z: 0.15, r: 0.058, rPupila: 0.026, cejaDY: 0.05, cejaDZ: 0.012 },
  },
  chivito: {
    // Oxypogon guerinii, el chivito de los páramos: colibrí compacto de pico
    // CORTO (el más corto de los colibríes — nada de aguja), ojos grandes de
    // caricatura sobre la cara clara.
    escalaRel: 0.9,
    torso: [0.94, 0.96, 0.9],
    hombroX: 0.19,
    craneo: [1.02, 0.98, 1.0],
    rBrazo: [0.04, 0.031], rPierna: [0.044, 0.035],
    ojo: { x: 0.082, y: 0.06, z: 0.14, r: 0.062, rPupila: 0.027, cejaDY: 0.062, cejaDZ: 0.028 },
  },
};
// F25: el punk es un ESTADO del mismo chivito (F24), no otro pájaro — misma
// anatomía, mismos rasgos. El id sigue existiendo porque el roster lo ofrece
// (con su poder propio), pero el cuerpo es EL cuerpo del chivito.
RASGOS_COMPAI['chivito-punk'] = RASGOS_COMPAI.chivito;

export function esCompai(tipo) {
  return Object.prototype.hasOwnProperty.call(RASGOS_COMPAI, tipo);
}

// ── El Oso · Tremarctos ornatus ─────────────────────────────────────────────
// Paleta y marcas calcadas de osoBastonIdentidad.js (F18, referencia aprobada):
// pelaje café-negro cálido, ANTEOJOS crema ASIMÉTRICOS (el izquierdo cierra
// completo, el derecho se abre por abajo y derrama al hocico — patrón único
// por individuo, como en el animal real), hocico corto claro y la media luna
// crema del pecho. El bastón florecido es del compai caminante de la PWA; el
// piloto va con las manos en el volante, como todo el elenco.

function construirOso(THREE, ctx) {
  const { THREEmat, pal, pecho, cabeza, partes } = ctx;
  const piel = PIEL_RIGS.oso.extras;
  const mPelo = THREEmat(pal.cuerpo, 0.92);
  const mCrema = THREEmat(pal.cuerpo2, 0.85);
  const mHocico = THREEmat(piel.hocico, 0.85);
  const mTrufa = THREEmat(pal.detalle, 0.55);
  const mOrejaIn = THREEmat(piel.orejaIn, 0.9);

  // golilla: la mole de cuello y hombros que funde la cabeza con el cuerpo —
  // sin ella el oso es un muñeco con cabeza suelta, no un plantígrado
  const golilla = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 7), mPelo);
  golilla.scale.set(1.3, 0.75, 1.05);
  golilla.position.set(0, 0.48, -0.01);
  pecho.add(golilla);

  // panza de oso: el volumen bajo que hace la pera del cuerpo
  const panza = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), mPelo);
  panza.scale.set(1.1, 1.0, 0.95);
  panza.position.set(0, 0.12, 0.05);
  pecho.add(panza);

  // LA MEDIA LUNA del pecho: el babero pectoral real de la especie, colgado
  // como creciente (media torus con la boca hacia arriba), apenas saliendo
  // del pelaje para que no lea sticker
  const luna = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.03, 6, 10, Math.PI), mCrema);
  luna.rotation.z = Math.PI;
  luna.rotation.x = -0.15;
  luna.scale.set(1.2, 1.05, 0.35);
  luna.position.set(0, 0.36, 0.215);
  pecho.add(luna);

  // orejas redondas ARRIBA del cráneo ancho (las del jaguar van a las
  // esquinas; las del oso coronan — es media diferencia de silueta)
  for (const lado of [-1, 1]) {
    const oreja = new THREE.Group();
    oreja.position.set(lado * 0.115, 0.185, -0.01);
    const carne = new THREE.Mesh(new THREE.SphereGeometry(0.06, 7, 5), mPelo);
    carne.scale.set(1.0, 1.0, 0.5);
    oreja.add(carne);
    const dentro = new THREE.Mesh(new THREE.SphereGeometry(0.036, 6, 4), mOrejaIn);
    dentro.scale.set(0.85, 0.85, 0.3);
    dentro.position.set(0, 0.008, 0.028);
    oreja.add(dentro);
    oreja.userData = { restZ: lado * 0.22, restX: 0, lado, largo: 0.2 };
    oreja.rotation.z = oreja.userData.restZ;
    cabeza.add(oreja);
    partes.orejas.push(oreja);
  }

  // LOS ANTEOJOS, asimétricos como manda la ficha: aro izquierdo completo,
  // aro derecho abierto por abajo, con el derrame crema que baja al hocico
  const aroIzq = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.018, 5, 12), mCrema);
  aroIzq.position.set(0.085, 0.055, 0.148);
  aroIzq.rotation.y = 0.28;
  aroIzq.scale.set(1, 1, 0.5);
  cabeza.add(aroIzq);
  const aroDer = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.018, 5, 12, Math.PI * 1.45), mCrema);
  aroDer.position.set(-0.085, 0.055, 0.148);
  aroDer.rotation.y = -0.28;
  aroDer.rotation.z = 0.95; // el hueco del aro queda abajo-adentro
  aroDer.scale.set(1, 1, 0.5);
  cabeza.add(aroDer);
  const derrame = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 4), mCrema);
  derrame.scale.set(1.0, 1.5, 0.4);
  derrame.position.set(-0.052, -0.01, 0.158);
  derrame.rotation.z = -0.35;
  cabeza.add(derrame);

  // hocico CORTO y claro con la trufa oscura: el tercio de cara que separa
  // al oso andino del perro (jeta larga) y del peluche (sin hocico)
  const hocico = new THREE.Mesh(new THREE.SphereGeometry(0.085, 9, 7), mHocico);
  hocico.scale.set(1.15, 0.85, 0.9);
  hocico.position.set(0, -0.075, 0.13);
  cabeza.add(hocico);
  const trufa = new THREE.Mesh(new THREE.SphereGeometry(0.037, 7, 5), mTrufa);
  trufa.scale.set(1.25, 0.8, 0.8);
  trufa.position.set(0, -0.035, 0.208);
  cabeza.add(trufa);

  // la boca vive sobre el hocico crema: tinta oscura sobre fondo claro
  return { bocaBase: new THREE.Vector3(0, -0.118, 0.178) };
}

// ── La Zarigüeya · Didelphis marsupialis ────────────────────────────────────
// Paleta calcada de zariguyaIdentidad.js: pelaje ceniza, CARA PÁLIDA con
// antifaz oscuro, orejas y cola DESNUDAS de piel rosada. Y las CRÍAS AL LOMO:
// la ficha las declara firma de forma (humilde, trabajadora, madre) — y viajan
// justo donde la cámara de persecución y el roster de espaldas las ven.

function construirZariguya(THREE, ctx) {
  const { THREEmat, pal, pecho, cabeza, partes, mBlanco } = ctx;
  const piel = PIEL_RIGS.zariguya.extras;
  const mPelo = THREEmat(pal.cuerpo, 0.94);
  const mPanza = THREEmat(pal.cuerpo2, 0.9);
  const mLomo = THREEmat(piel.lomo, 0.95);
  const mAntifaz = THREEmat(pal.detalle, 0.92);
  const mRosaPiel = THREEmat(piel.rosaPiel, 0.75);
  const mTrufa = THREEmat(piel.trufa, 0.6);
  const mCria = THREEmat(piel.cria, 0.94);

  // panza de lanilla clara (asoma bajo el pelaje de guardia)
  const panza = new THREE.Mesh(new THREE.SphereGeometry(0.145, 9, 7), mPanza);
  panza.scale.set(1.05, 1.2, 0.65);
  panza.position.set(0, 0.24, 0.12);
  pecho.add(panza);

  // el dorso un tono más hondo: donde van las crías
  const lomo = new THREE.Mesh(new THREE.SphereGeometry(0.16, 9, 7), mLomo);
  lomo.scale.set(1.05, 1.05, 0.55);
  lomo.position.set(0, 0.3, -0.12);
  pecho.add(lomo);

  // LAS CRÍAS: tres bultitos agarrados al lomo, cada una con su carita clara
  // y sus orejitas. Son la firma que ninguna silueta genérica puede copiar.
  for (const [cx, cy, cz, rot] of [
    [0.09, 0.42, -0.14, 0.4],
    [-0.1, 0.3, -0.16, -0.3],
    [0.0, 0.16, -0.17, 0.1],
  ]) {
    const cria = new THREE.Group();
    cria.position.set(cx, cy, cz);
    cria.rotation.z = rot;
    const cuerpito = new THREE.Mesh(new THREE.SphereGeometry(0.052, 7, 5), mCria);
    cuerpito.scale.set(1, 1.15, 0.9);
    cria.add(cuerpito);
    const carita = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), mPanza);
    carita.position.set(0, 0.048, -0.02);
    cria.add(carita);
    for (const lado of [-1, 1]) {
      const orejita = new THREE.Mesh(new THREE.SphereGeometry(0.016, 5, 3), mAntifaz);
      orejita.scale.set(0.9, 1.1, 0.4);
      orejita.position.set(lado * 0.026, 0.082, -0.02);
      cria.add(orejita);
    }
    pecho.add(cria);
  }

  // antifaz: la banda oscura que cruza cada ojo sobre la cara pálida
  for (const lado of [-1, 1]) {
    const parche = new THREE.Mesh(new THREE.SphereGeometry(0.055, 7, 5), mAntifaz);
    parche.scale.set(1.15, 1.3, 0.55);
    parche.position.set(lado * 0.08, 0.065, 0.14);
    cabeza.add(parche);
  }

  // la CUÑA del hocico: más larga que el radio del cráneo (firma de la ficha),
  // rematada en la trufa rosada
  const cuna = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.24, 8), mPanza);
  cuna.rotation.x = Math.PI / 2 + 0.08;
  cuna.position.set(0, -0.05, 0.2);
  cabeza.add(cuna);
  const trufa = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 4), mTrufa);
  trufa.position.set(0, -0.026, 0.315);
  cabeza.add(trufa);

  // bigotes: ningún trompudo nocturno se lee sin vibrisas
  for (const lado of [-1, 1]) {
    for (const [dy, ang] of [[0.01, 0.2], [-0.012, -0.08]]) {
      const bigote = new THREE.Mesh(new THREE.CylinderGeometry(0.0026, 0.001, 0.13, 3), mBlanco);
      bigote.position.set(lado * 0.062, -0.05 + dy, 0.235);
      bigote.rotation.z = lado * (Math.PI / 2 - 0.14);
      bigote.rotation.y = -lado * (0.5 + ang);
      cabeza.add(bigote);
    }
  }

  // orejas GRANDES, redondas y desnudas: pabellón oscuro, interior rosado.
  // Flamean con la velocidad (largo alto): son de piel, no de cartón.
  for (const lado of [-1, 1]) {
    const oreja = new THREE.Group();
    oreja.position.set(lado * 0.135, 0.155, -0.02);
    const pabellon = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), THREEmat(piel.pabellon, 0.88));
    pabellon.scale.set(0.95, 1.05, 0.35);
    pabellon.position.y = 0.03;
    oreja.add(pabellon);
    const dentro = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), mRosaPiel);
    dentro.scale.set(0.8, 0.92, 0.3);
    dentro.position.set(0, 0.028, 0.024);
    oreja.add(dentro);
    oreja.userData = { restZ: lado * 0.5, restX: 0.05, lado, largo: 0.55 };
    oreja.rotation.z = oreja.userData.restZ;
    cabeza.add(oreja);
    partes.orejas.push(oreja);
  }

  void mPelo;
  return { bocaBase: new THREE.Vector3(0, -0.098, 0.262) };
}

// ── La Luciérnaga · Lampyridae ──────────────────────────────────────────────
// Paleta calcada de luciernagaIdentidad.js (arte aprobado): élitros pardos de
// margen pálido, PRONOTO CORAL con su mancha oscura central (el escudo que
// tapa la cabeza desde arriba — la firma de la familia) y LA LINTERNA: el
// abdomen que late en amarillo-verde. La luz es el personaje; va emisiva y
// pulsa desde aplicarPose (canal extras.linterna).

function construirLuciernaga(THREE, ctx) {
  const { THREEmat, pal, pecho, pelvis, cabeza, partes } = ctx;
  const piel = PIEL_RIGS.luciernaga.extras;
  const mElitro = THREEmat(pal.cuerpo, 0.55, 0.06);
  const mMargen = THREEmat(pal.detalle, 0.6);
  // el pronoto de la piel F24 es PARDO cálido (gPronoto), no coral: el coral
  // que había venía de la ficha vieja y hacía que el mismo bicho se viera
  // distinto en el valle y en el kart
  const mPronoto = THREEmat(piel.pronoto, 0.5);
  const mMancha = THREEmat(piel.manchaPronoto, 0.6);
  const mVientre = THREEmat(pal.cuerpo2, 0.7);

  // vientre pálido asomando bajo los élitros, de frente
  const vientre = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), mVientre);
  vientre.scale.set(0.95, 1.1, 0.6);
  vientre.position.set(0, 0.24, 0.12);
  pecho.add(vientre);

  // ── el pronoto: la visera coral sobre la cabeza ──────────────────────────
  // En Lampyridae el escudo cubre la cabeza desde arriba; aquí va de gorra
  // con la mancha oscura central del patrón real. Coral sobre cuerpo pardo:
  // es lo que separa a la luciérnaga de "un cucarrón café cualquiera".
  const pronoto = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 7), mPronoto);
  pronoto.scale.set(1.35, 0.5, 1.15);
  pronoto.position.set(0, 0.14, -0.02);
  cabeza.add(pronoto);
  const mancha = new THREE.Mesh(new THREE.SphereGeometry(0.055, 7, 5), mMancha);
  mancha.scale.set(1.3, 0.35, 1.1);
  mancha.position.set(0, 0.208, -0.02);
  cabeza.add(mancha);

  // ── élitros pardos con margen pálido, plegados sobre la espalda ──────────
  // Misma mecánica que el coccinélido: cada mitad pivota sobre la sutura y el
  // turbo los abre (canal extras.elitros que aplicarPose ya mueve).
  const elitros = new THREE.Group();
  elitros.position.set(0, 0.36, -0.03);
  const arco = Math.PI * 0.8;
  for (const lado of [-1, 1]) {
    const pivote = new THREE.Group();
    pivote.scale.set(0.95, 1.35, 0.85);
    const phi0 = lado > 0 ? Math.PI * 1.5 - arco : Math.PI * 1.5;
    const domo = new THREE.Mesh(
      new THREE.SphereGeometry(0.215, 9, 5, phi0, arco, 0, Math.PI * 0.7), mElitro);
    pivote.add(domo);
    const margen = new THREE.Mesh(
      new THREE.SphereGeometry(0.215, 9, 3, phi0, arco, Math.PI * 0.7, Math.PI * 0.24), mMargen);
    pivote.add(margen);
    pivote.userData = { lado };
    elitros.add(pivote);
  }
  pecho.add(elitros);
  partes.extras.elitros = elitros;

  // alas membranosas plegadas DEBAJO: solo salen cuando el élitro se abre
  const tex = texturasAlas(THREE);
  const mAlaLu = matAla(THREE, tex && tex.mariquita, piel.alaMemb);
  const alas = new THREE.Group();
  alas.position.set(0, 0.4, -0.06);
  for (const lado of [-1, 1]) {
    alas.add(crearAla(THREE, mAlaLu, 0.58, 0.22, lado, [0.1, 0, 0],
      [0.68, 0.2, -0.72], 0.35, { amp: 0.5, oculta: true }));
  }
  pecho.add(alas);
  partes.extras.alas = alas;

  // ── LA LINTERNA: el abdomen que late ─────────────────────────────────────
  // Dos segmentos emisivos asomando bajo el borde de los élitros, hacia atrás
  // y abajo: exactamente donde la ve la cámara de persecución. El pulso no va
  // aquí — va en aplicarPose (canal extras.linterna), porque la
  // bioluminiscencia real es un destello lento, no un LED fijo.
  // la luz de la piel F24 es ÁMBAR cálido (gLinterna), no verde-lima: la
  // lima venía de la ficha vieja y era la divergencia más visible entre las
  // dos pantallas
  const mLuz = new THREE.MeshStandardMaterial({
    color: piel.linternaCuerpo, emissive: piel.linternaBrillo, emissiveIntensity: 1.1,
    roughness: 0.4, metalness: 0.0,
  });
  const linterna = new THREE.Group();
  linterna.position.set(0, 0.0, -0.13);
  const seg1 = new THREE.Mesh(new THREE.SphereGeometry(0.088, 9, 7), mLuz);
  seg1.scale.set(1.0, 0.85, 0.95);
  linterna.add(seg1);
  const seg2 = new THREE.Mesh(new THREE.SphereGeometry(0.064, 8, 6), mLuz);
  seg2.position.set(0, -0.045, -0.085);
  seg2.scale.set(0.9, 0.75, 0.9);
  linterna.add(seg2);
  pelvis.add(linterna);
  partes.extras.linterna = linterna;

  // antenas filiformes largas y oscuras, naciendo bajo el borde del pronoto
  for (const lado of [-1, 1]) {
    const antena = crearAntena(THREE, THREEmat(piel.antena, 0.7), null, [
      [0.012, 0.009, 0.11, 0.15],
      [0.009, 0.006, 0.1, 0.22],
    ], { restZ: -lado * 0.45, restX: -0.3, lado, largo: 0.5 });
    antena.position.set(lado * 0.058, 0.09, 0.1);
    cabeza.add(antena);
    partes.orejas.push(antena);
  }

  return { bocaBase: new THREE.Vector3(0, -0.085, 0.148) };
}

// ── El Chivito · Oxypogon guerinii ──────────────────────────────────────────
// El chivito de los páramos: colibrí de CRESTA y BARBA — el chivo que le da el
// nombre es la barba verde bajo el pico. F24 resolvió que el punk es un
// ESTADO del mismo pájaro (crestaNormal/crestaPunk en el rig SVG, alternadas
// al hablar), no otro piloto: acá el único constructor arma LAS DOS crestas
// sobre el mismo hueso y aplicarPose alterna la visible en la ventana de
// hablar/gesticular (~30% determinista).

function construirChivito(THREE, ctx) {
  const { THREEmat, pal, pecho, pelvis, cabeza, partes } = ctx;
  const piel = PIEL_RIGS.chivito.extras;
  const mPluma = THREEmat(pal.cuerpo, 0.9);
  const mAlaPluma = THREEmat(piel.ala, 0.88);
  const mCrema = THREEmat(pal.cuerpo2, 0.88);
  const mTinta = THREEmat(pal.detalle, 0.9);
  const mBarba = THREEmat(piel.barba, 0.5, 0.15); // el verde vivo casi iridiscente del gorjal
  const mPico = THREEmat(piel.pico, 0.45);
  const mMorado = THREEmat(piel.punkPunta, 0.55);

  // plumón claro del vientre
  const vientre = new THREE.Mesh(new THREE.SphereGeometry(0.14, 9, 7), mCrema);
  vientre.scale.set(1.05, 1.15, 0.7);
  vientre.position.set(0, 0.24, 0.12);
  pecho.add(vientre);

  // alas PLEGADAS sobre la espalda: el piloto agarra el volante con las manos
  // de manguera (convención de la casa), así que el ala va cerrada al flanco,
  // como la lleva un pájaro posado
  for (const lado of [-1, 1]) {
    const ala = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mAlaPluma);
    ala.scale.set(0.6, 1.6, 0.45);
    ala.position.set(lado * 0.155, 0.28, -0.11);
    ala.rotation.x = 0.3;
    ala.rotation.z = -lado * 0.18;
    pecho.add(ala);
  }

  // COLA de plumas: abanico de tres, verde al centro y claras afuera (las
  // rectrices externas del chivito real llevan blanco). De espaldas —que es
  // como el roster y la cámara lo ven— es la mitad del pájaro.
  const colaPlumas = new THREE.Group();
  colaPlumas.position.set(0, 0.02, -0.13);
  colaPlumas.rotation.x = -0.55;
  const mColaCentro = THREEmat(piel.colaCentro, 0.88);
  for (const [ang, mPl] of [[-0.38, mCrema], [0, mColaCentro], [0.38, mCrema]]) {
    const pluma = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.02, 0.24), mPl);
    pluma.position.set(Math.sin(ang) * 0.09, 0, -0.1);
    pluma.rotation.y = ang;
    colaPlumas.add(pluma);
  }
  pelvis.add(colaPlumas);

  // cara clara sobre el cráneo oscuro de la corona (misma jugada que la jeta
  // blanca del jaguar: masa clara delante, casco oscuro detrás)
  const cara = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), THREEmat(piel.cara, 0.88));
  cara.scale.set(1.05, 0.95, 0.85);
  cara.position.set(0, -0.03, 0.075);
  cabeza.add(cara);

  // listas malares: la raya oscura que cruza cada ojo (la máscara de la lámina)
  for (const lado of [-1, 1]) {
    const lista = new THREE.Mesh(new THREE.SphereGeometry(0.048, 6, 4), mTinta);
    lista.scale.set(1.25, 0.5, 0.45);
    lista.position.set(lado * 0.082, 0.048, 0.16);
    lista.rotation.z = lado * 0.35;
    cabeza.add(lista);
  }

  // PICO corto de helmetcrest (el más corto de los colibríes), apenas caído
  const pico = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.13, 7), mPico);
  pico.rotation.x = Math.PI / 2 + 0.12;
  pico.position.set(0, -0.02, 0.235);
  cabeza.add(pico);

  // LA BARBA: el chivo verde vivo que le da el nombre al pájaro. Tres mechas
  // colgando bajo el pico, la del medio más larga.
  for (const [dx, dy, h, r, rz] of [
    [0, -0.125, 0.115, 0.036, 0],
    [0.03, -0.108, 0.085, 0.026, -0.18],
    [-0.03, -0.108, 0.085, 0.026, 0.18],
  ]) {
    const mecha = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), mBarba);
    mecha.rotation.x = Math.PI - 0.22; // cuelga con la punta apenas al frente
    mecha.rotation.z = rz;
    mecha.position.set(dx, dy, 0.148);
    cabeza.add(mecha);
  }

  // LA CRESTA — las DOS caras del mismo hueso, como en el rig SVG
  // (#crestaNormal/#crestaPunk). Va en partes.orejas con `largo` NEGATIVO: la
  // fórmula del viento suma rotation.x positiva (que en una pieza erguida
  // sería hacia adelante), y el signo la voltea para que la cresta se PEINE
  // HACIA ATRÁS con la velocidad. aplicarPose alterna cuál cara es visible.
  const cresta = new THREE.Group();

  // cara quieta: plumas verde-oscuro peinadas hacia atrás, mecha clara adelante
  const crestaNormal = new THREE.Group();
  crestaNormal.name = 'crestaNormal-chivito'; // la sonda del gate la busca por nombre
  crestaNormal.position.set(0, 0.13, -0.03);
  const mPlumaCresta = THREEmat(piel.crestaPluma, 0.9);
  const mPlumaCresta2 = THREEmat(piel.crestaPluma2, 0.9);
  const mCrestaBase = THREEmat(piel.crestaBase, 0.88);
  for (const [z, h, tilt, mPl, r] of [
    [0.05, 0.16, -0.6, mCrestaBase, 0.02],
    [0.0, 0.22, -0.85, mPlumaCresta, 0.026],
    [-0.04, 0.17, -1.05, mPlumaCresta2, 0.022],
  ]) {
    const pluma = new THREE.Group();
    pluma.position.set(0, 0, z);
    pluma.rotation.x = tilt;
    const mecha = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), mPl);
    mecha.position.y = h * 0.5;
    pluma.add(mecha);
    crestaNormal.add(pluma);
  }
  cresta.add(crestaNormal);

  // cara hablando: mohicano de púas plateadas con puntas moradas
  const crestaPunk = new THREE.Group();
  crestaPunk.name = 'crestaPunk-chivito'; // la sonda del gate la busca por nombre
  crestaPunk.position.set(0, 0.12, -0.01);
  crestaPunk.visible = false;
  const mPua = THREEmat(piel.punkPua, 0.85);
  const mPua2 = THREEmat(piel.punkPua2, 0.85);
  const puas = [
    [0.08, 0.14, 0.4], [0.035, 0.18, 0.18], [-0.01, 0.2, 0],
    [-0.055, 0.18, -0.22], [-0.1, 0.15, -0.45],
  ];
  for (const [i, [z, h, tilt]] of puas.entries()) {
    const pua = new THREE.Group();
    pua.position.set(0, 0, z);
    pua.rotation.x = tilt;
    const mecha = new THREE.Mesh(new THREE.ConeGeometry(0.024, h, 5), i % 2 ? mPua2 : mPua);
    mecha.position.y = h * 0.5;
    pua.add(mecha);
    const punta = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.055, 5), mMorado);
    punta.position.y = h * 0.92 + 0.02;
    pua.add(punta);
    crestaPunk.add(pua);
  }
  cresta.add(crestaPunk);

  cresta.userData = { restZ: 0, restX: 0, lado: 1, largo: -0.26 };
  cabeza.add(cresta);
  partes.orejas.push(cresta);
  partes.extras.crestaNormal = crestaNormal;
  partes.extras.crestaPunk = crestaPunk;

  void mPluma;
  return { bocaBase: new THREE.Vector3(0, -0.062, 0.19) };
}

// ── dispatch ────────────────────────────────────────────────────────────────

const CONSTRUCTORES = {
  oso: construirOso,
  zariguya: construirZariguya,
  luciernaga: construirLuciernaga,
  chivito: construirChivito,
  // alias F24 (RIG_DE/portales/marco hicieron lo mismo en el valle): elegir
  // "chivito-punk" monta EL MISMO pájaro; el punk aflora como estado al hablar
  'chivito-punk': construirChivito,
};

// Punto de entrada único desde pilotos-manejando.js (espejo de construirBenefico).
export function construirCompai(THREE, tipo, ctx) {
  return CONSTRUCTORES[tipo](THREE, ctx);
}
