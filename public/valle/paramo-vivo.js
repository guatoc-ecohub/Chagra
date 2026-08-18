// ═══════════════════════════════════════════════════════════════════════════
//  PÁRAMO VIVO — el mundo insignia (bloque-import autónomo, `?mundo=paramo-vivo`)
//  ---------------------------------------------------------------------------
//  El páramo andino VIVO: un frailejón-Ent monumental y una queñua-anciana
//  enseñan el agua, el suelo, la microbiología y las micorrizas; el chivito se
//  alimenta de las flores del Ent; Compai escucha y ANOTA en su libreta; y la
//  cámara puede DESCENDER, sin corte, de la copa a la raíz, a las micorrizas y
//  a la célula (Powers of Ten). Diorama propio, ilustrado tipo Humboldt.
//
//  Contrato (BUILD-PARAMO-VIVO.md): expone
//    montarMundoParamoVivo(scene, THREE, ctx) → { actores, anclas, arrancar, update }
//  Fable escribe SOLO este archivo + `paramo-vivo-arte-*.js`. Las lecciones/voces/
//  gating las cablea `paramo-vivo-lecciones.js` (otro agente) vía wireLecciones —
//  aquí se IMPORTA y se llama con falla suave si aún no existe.
// ═══════════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import {
  P, makeRNG, col, lambert, H, CLARO, muestrear,
  construirTerreno, construirCielo, construirTelon, construirNieblas,
  construirRayos, construirMotas, construirRocas,
} from './paramo-vivo-arte-mundo.js';
import { buildFrailejonEnt, frailejonUnitGeos, haloPelusaMat } from './paramo-vivo-arte-frailejon.js';
import { buildQuenuaAnciano, buildChivito, buildCompai, buildAbeja } from './paramo-vivo-arte-elenco.js';
import { construirDescenso } from './paramo-vivo-arte-descenso.js';

export function montarMundoParamoVivo(scene, THREE_in, ctx = {}) {
  const T = THREE_in || THREE;            // el contrato pasa THREE (mismo singleton por importmap)
  const { camera, controls } = ctx;
  const rng = makeRNG(20730);

  // ── APAGAR EL VALLE: este es un diorama propio. Todo lo que ya está en la
  //    escena (terreno DEM, farallón, cascada, casa, flora, luces del valle,
  //    portales) se oculta; abajo montamos nuestro páramo. Al salir, ?mundo
  //    cambia y la página recarga: no hay que restaurar nada.
  scene.children.slice().forEach((c) => { c.visible = false; });
  const raiz = new T.Group(); raiz.name = 'paramo-vivo'; scene.add(raiz);

  // ── APAGAR el chrome DOM del valle (HUD, minimapa, chips de mundos, guía,
  //    barra de edición): este mundo es a pantalla completa, sin la UI del valle.
  const estilo = document.createElement('style');
  estilo.textContent = 'body.paramo-vivo #hud,body.paramo-vivo #mmapa,body.paramo-vivo #capaLugares,'
    + 'body.paramo-vivo #guiaSel,body.paramo-vivo #guiaV,body.paramo-vivo #barraMover,'
    + 'body.paramo-vivo #ventanaM,body.paramo-vivo .marcoCarta,body.paramo-vivo #compaiFotoBtn{display:none!important}';
  document.head.appendChild(estilo);
  document.body.classList.add('paramo-vivo');

  // ── ATMÓSFERA: cielo de amanecer, bruma con luz, sol dorado rasante ─────────
  scene.background = new T.Color(0xc7d5da);   // fallback luminoso (nunca negro)
  raiz.add(construirCielo());
  scene.fog = new T.FogExp2(P.bruma, 0.0032);
  // rig de contraluz de amanecer: relleno FRONTAL (lee la cara del Ent) + luz
  // TRASERA cálida fuerte (rim/halo en la roseta y la silueta, desde el sol −z).
  const luz = new T.DirectionalLight(0xfff0cf, 1.75);
  luz.position.set(95, 150, 210); raiz.add(luz);            // frontal: ilumina la cara
  const contra = new T.DirectionalLight(0xffdba0, 1.9);
  contra.position.set(30, 150, -250); raiz.add(contra);     // trasera: rim dorado
  const relleno = new T.HemisphereLight(0xeaf1e6, 0x9a8a5c, 1.2); raiz.add(relleno);
  const ambiente = new T.AmbientLight(0xf0ead8, 0.34); raiz.add(ambiente);

  // ── EL MUNDO: terreno + telón + rocas ───────────────────────────────────────
  raiz.add(construirTerreno(rng));
  raiz.add(construirTelon(rng));
  raiz.add(construirRocas(rng));

  // ── EL FRAILEJONAL (el pueblo del páramo): ejército plateado, InstancedMesh ──
  const U = frailejonUnitGeos();
  const troncoMat = lambert(P.frailSeca2, { side: T.DoubleSide });
  const faldaMat = new T.MeshLambertMaterial({ color: 0xffffff, flatShading: true, side: T.DoubleSide });
  // vertexColors: el degradado verde→plata horneado en la pala multiplica al
  // color de instancia — corazón verde, puntas plateadas (molde F23)
  const rosetaMat = new T.MeshLambertMaterial({ color: 0xffffff, flatShading: true, side: T.DoubleSide, vertexColors: true });
  const puntos = muestrear(rng, 118, 200, { slopeMax: 0.5, sep: 4.0, evitar: [{ x: CLARO.x, z: CLARO.z, r: 15 }, { x: CLARO.x + 9, z: CLARO.z + 13, r: 4 }] });
  const troncos = new T.InstancedMesh(U.tronco, troncoMat, puntos.length);
  const faldas = new T.InstancedMesh(U.falda, faldaMat, puntos.length);
  const rosetas = new T.InstancedMesh(U.roseta, rosetaMat, puntos.length);
  const m4 = new T.Matrix4(), q = new T.Quaternion(), eje = new T.Vector3(0, 1, 0), c = new T.Color();
  const cPlata = col(P.frailPlata), cSage = col(P.frailSage), cSeca = col(P.frailSeca), cSeca2 = col(P.frailSeca2);
  const TALLAS = [0.9, 0.9, 1.2, 1.2, 1.7, 2.3];
  puntos.forEach((p, i) => {
    const sc = TALLAS[rng.int(0, TALLAS.length - 1)] * (0.9 + rng.float(0, 0.2));
    q.setFromAxisAngle(eje, rng.float(0, Math.PI * 2));
    m4.compose(new T.Vector3(p.x, p.y, p.z), q, new T.Vector3(sc, sc, sc));
    troncos.setMatrixAt(i, m4); faldas.setMatrixAt(i, m4); rosetas.setMatrixAt(i, m4);
    c.copy(cPlata).lerp(cSage, 0.3 + rng.float(0, 0.55)).offsetHSL(0, (rng.float(0, 1) - 0.5) * 0.03, (rng.float(0, 1) - 0.5) * 0.05);
    rosetas.setColorAt(i, c);
    c.copy(cSeca).lerp(cSeca2, rng.float(0, 0.6));
    faldas.setColorAt(i, c);
  });
  troncos.instanceMatrix.needsUpdate = faldas.instanceMatrix.needsUpdate = rosetas.instanceMatrix.needsUpdate = true;
  raiz.add(troncos, faldas, rosetas);
  // el HALO DE PELUSA en la corona de cada adulto (la pubescencia, firma del
  // frailejón — F23/paramo.js): misma pose que su roseta — se COPIA la matriz
  // ya compuesta (recomponerla gastaría rng() y re-barajaría la siembra).
  const halos = new T.InstancedMesh(U.halo, haloPelusaMat(), puntos.length);
  for (let hi = 0; hi < puntos.length; hi++) {
    rosetas.getMatrixAt(hi, m4);
    halos.setMatrixAt(hi, m4);
  }
  halos.instanceMatrix.needsUpdate = true;
  raiz.add(halos);
  // jóvenes: rosetas RASAS sin tronco (así crece Espeletia de verdad)
  const rasas = new T.InstancedMesh(U.rasa, rosetaMat, 80);
  const rasaPts = muestrear(rng, 80, 150, { slopeMax: 0.6, sep: 3, evitar: [{ x: CLARO.x, z: CLARO.z, r: 12 }] });
  rasaPts.forEach((p, i) => {
    const sc = 0.5 + rng.float(0, 0.7); q.setFromAxisAngle(eje, rng.float(0, Math.PI * 2));
    m4.compose(new T.Vector3(p.x, p.y, p.z), q, new T.Vector3(sc, sc, sc)); rasas.setMatrixAt(i, m4);
    c.copy(cPlata).lerp(cSage, rng.float(0, 0.4)).offsetHSL(0, 0.01, 0.03); rasas.setColorAt(i, c);
  });
  rasas.count = rasaPts.length; rasas.instanceMatrix.needsUpdate = true; raiz.add(rasas);

  // ── EL FRAILEJÓN-ENT (protagonista) en el claro, anclado ────────────────────
  const escEnt = 2.2;
  const ent = buildFrailejonEnt(rng, { escala: escEnt });
  const baseY = H(CLARO.x, CLARO.z);
  ent.group.position.set(CLARO.x, baseY, CLARO.z);
  ent.group.scale.setScalar(escEnt);
  raiz.add(ent.group);

  // ── LA QUEÑUA-ANCIANA (el vecino), silueta distinta, al lado del claro ──────
  const quenua = buildQuenuaAnciano(rng);
  const qx = CLARO.x - 16, qz = CLARO.z + 10;
  quenua.group.position.set(qx, H(qx, qz), qz);
  quenua.group.scale.setScalar(1.8);
  raiz.add(quenua.group);

  // ── EL CHIVITO en las flores del Ent (florAncla en mundo) ───────────────────
  const chivito = buildChivito(rng);
  const florW = ent.florAncla.clone().multiplyScalar(escEnt).add(new T.Vector3(CLARO.x, baseY, CLARO.z));
  const chivitoPivot = new T.Group(); chivitoPivot.position.copy(florW);
  chivitoPivot.add(chivito.group); raiz.add(chivitoPivot);

  // ── COMPAI sentado con la libreta, mirando al Ent; Angelita revolotea ───────
  const compai = buildCompai(rng);
  const px = CLARO.x + 9, pz = CLARO.z + 13;
  compai.group.position.set(px, H(px, pz), pz);
  compai.group.scale.setScalar(1.35);
  // de frente 3/4 a la cámara (se ve la LIBRETA y el lápiz); la cabeza se
  // levanta hacia el Ent en el gesto de «anotar y quedarse pensando».
  compai.group.rotation.y = 0.35;
  raiz.add(compai.group);
  const abeja = buildAbeja(rng);
  const abejaPivot = new T.Group(); abejaPivot.position.set(px, H(px, pz), pz);
  abejaPivot.add(abeja.group); raiz.add(abejaPivot);

  // ── EL DESCENSO bajo el Ent (copa→raíz→micorrizas→arbúsculo→célula) ─────────
  const descenso = construirDescenso(rng, { cx: CLARO.x, cz: CLARO.z, baseY, coronaY: ent.coronaY * escEnt });
  raiz.add(descenso.group);

  // ── ATMÓSFERA VIVA: nieblas + god-rays + motas ──────────────────────────────
  const nieblas = construirNieblas(rng); raiz.add(nieblas.group);
  const rayos = construirRayos(rng); raiz.add(rayos.group);
  const motas = construirMotas(rng); raiz.add(motas.points);

  // ── el reparto y las anclas que se devuelven / se pasan a las lecciones ─────
  const actores = { frailejon: ent, quenua, chivito, compai, abeja };
  const anclas = {
    ...descenso.anclas,
    ent: new T.Vector3(CLARO.x, baseY + ent.caraG.position.y * escEnt, CLARO.z),
    flor: florW,
    quenua: new T.Vector3(qx, H(qx, qz) + 8, qz),
    compai: new T.Vector3(px, H(px, pz) + 1, pz),
    claro: new T.Vector3(CLARO.x, baseY, CLARO.z),
    curvaDescenso: descenso.curva,
    miradasDescenso: descenso.miradas,
  };

  // ── LAS LECCIONES (otro agente): import con FALLA SUAVE ─────────────────────
  // No debe romper el mundo si el archivo aún no existe. Cuando exista, cablea
  // diálogos→gestos, lecciones→progreso (ent.setSalud) y el zoom final.
  import('./paramo-vivo-lecciones.js')
    .then((m) => { if (m && typeof m.wireLecciones === 'function') m.wireLecciones(scene, actores, T, { ...ctx, anclas, descenso, raiz }); })
    .catch(() => { /* aún no existe: el mundo funciona igual */ });

  // ── CÁMARA: el plano de establecimiento (forced perspective, Jackson) ───────
  // Cámara BAJA y cerca del pie del Ent: el usuario chiquito, el Ent subiendo
  // hasta salirse del cuadro, la queñua vecina a un lado, el ejército
  // escalonando a la bruma. El asombro se descubre.
  // presets de cámara (gate visual + arranque): `?pv=<preset>`
  const PRE = {
    hero: { pos: [CLARO.x + 13, baseY + 9, CLARO.z + 33], mira: [CLARO.x, baseY + 12.5, CLARO.z] },
    cara: { pos: [CLARO.x + 6, baseY + 13.5, CLARO.z + 15], mira: [CLARO.x, baseY + 13.5, CLARO.z] },
    compai: { pos: [CLARO.x + 15, baseY + 4.5, CLARO.z + 24], mira: [CLARO.x + 4, baseY + 3.5, CLARO.z + 6] },
    chivito: { pos: [florW.x + 5, florW.y + 0.5, florW.z + 11], mira: [florW.x, florW.y, florW.z] },
    quenua: { pos: [qx + 10, H(qx, qz) + 9, qz + 16], mira: [qx, H(qx, qz) + 7, qz] },
    descenso: { pos: [CLARO.x + 5, baseY - 12, CLARO.z + 7], mira: [CLARO.x, baseY - 15, CLARO.z] },
    celula: { pos: [CLARO.x + 7, baseY - 38, CLARO.z + 9], mira: [CLARO.x, baseY - 39, CLARO.z] },
  };
  function planoEstablecimiento() {
    if (!camera) return;
    const key = new URLSearchParams(location.search).get('pv');
    const p = PRE[key] || PRE.hero;
    camera.position.set(p.pos[0], p.pos[1], p.pos[2]);
    const mira = new T.Vector3(p.mira[0], p.mira[1], p.mira[2]);
    camera.lookAt(mira);
    if (controls) { controls.target.copy(mira); controls.minDistance = 2; controls.maxDistance = 240; controls.enabled = false; }
  }

  // ── el pulso de progreso de arranque: el Ent nace enfermo y, sin lecciones,
  //    igual RESPIRA hacia una salud media para que el gate lo vea vivo y verde
  //    a medias (la herida se lee). Las lecciones lo llevarán a pleno. ─────────
  let saludObjetivo = 0.72;
  ent.setSalud(0.35);
  // API para que las lecciones muevan el termómetro:
  actores.frailejon.reverdecerHacia = (k) => { saludObjetivo = THREE.MathUtils.clamp(k, 0, 1); };

  const arrancar = () => { planoEstablecimiento(); setTimeout(() => { if (controls) controls.enabled = true; }, 1200); };

  const update = (t, dt) => {
    // reverdecer suave hacia el objetivo (termómetro ecológico)
    const cur = ent.salud();
    if (Math.abs(cur - saludObjetivo) > 0.002) ent.setSalud(cur + (saludObjetivo - cur) * 0.02);
    // el elenco vive
    ent.update(t, camera);
    quenua.update(t);
    chivito.update(t);
    compai.update(t);
    abeja.update(t);
    nieblas.update(t, camera || { position: new T.Vector3() });
    rayos.update(t);
    motas.update(t);
    descenso.update(t);
  };

  return { actores, anclas, arrancar, update };
}
