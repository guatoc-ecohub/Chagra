// ── flotadores.js — pontones toon para TODOS los karts del mar ──────────────
// Los MISMOS carros de siempre (chiva, moto, escarabajo, camión, lobo, blanco,
// carretilla, patineta) ahora flotan: a cada modelo se le atornillan dos
// pontones laterales con puntas de proa, struts y una quilla corta, medidos
// del bounding box REAL del vehículo (no hay dos carros iguales). Estilo
// coherente con el kart: MeshStandardMaterial de color plano + flatShading,
// colores tomados de la tabla del propio vehículo (color/color2).
//
// Se cuelgan del GRUPO (no del chasis): el cuerpo se ladea en las curvas
// sobre los pontones —como una suspensión de catamarán— y la ola ladea el
// grupo entero vía modelos.js, pontones incluidos.

function std(THREE, color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color, roughness: 0.82, metalness: 0.04, flatShading: true, ...extra,
  });
}

export function agregarFlotadores(THREE, grupo, veh) {
  const caja = new THREE.Box3().setFromObject(grupo);
  const dims = new THREE.Vector3();
  caja.getSize(dims);
  const centro = new THREE.Vector3();
  caja.getCenter(centro);

  // medidas derivadas del carro real, con topes para que ninguno quede absurdo
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const largo = clamp(dims.x * 1.02, 2.4, 4.8);
  const radio = clamp(dims.z * 0.155, 0.24, 0.42);
  const sepZ = dims.z * 0.5 + radio * 1.05;
  const yPonton = 0.02 + radio * 0.28;   // centro apenas sobre el agua: calado ~60%

  const matCasco = std(THREE, veh.color2 ?? 0xf2e2b0);
  const matPunta = std(THREE, veh.color ?? 0xc0392b);

  const flot = new THREE.Group();
  flot.name = 'flotadores';

  // pontón = cápsula acostada en X + punta de proa cónica levantada
  const geoTubo = new THREE.CapsuleGeometry(radio, largo - radio * 2, 3, 9);
  const geoPunta = new THREE.ConeGeometry(radio * 0.92, radio * 2.5, 9);
  const geoStrut = new THREE.CylinderGeometry(radio * 0.28, radio * 0.34, 1, 6);
  const geoQuilla = new THREE.BoxGeometry(largo * 0.42, radio * 0.5, radio * 0.28);

  for (const lado of [-1, 1]) {
    const p = new THREE.Group();
    const tubo = new THREE.Mesh(geoTubo, matCasco);
    tubo.rotation.z = Math.PI / 2;
    p.add(tubo);

    const punta = new THREE.Mesh(geoPunta, matPunta);
    punta.rotation.z = -Math.PI / 2 + 0.30;      // nariz levantada de lancha
    punta.position.set(largo / 2 + radio * 0.55, radio * 0.55, 0);
    p.add(punta);

    // banda de color en la popa (visual de boya/lancha)
    const popa = new THREE.Mesh(new THREE.CylinderGeometry(radio * 1.06, radio * 1.06, radio * 0.7, 9), matPunta);
    popa.rotation.z = Math.PI / 2;
    popa.position.x = -largo * 0.34;
    p.add(popa);

    // dos struts inclinados hacia el casco del carro
    for (const sx of [-0.3, 0.32]) {
      const st = new THREE.Mesh(geoStrut, matPunta);
      const alto = clamp(dims.y * 0.22, 0.30, 0.55);
      st.scale.y = alto;
      st.position.set(largo * sx, radio * 0.72 + alto * 0.45, -lado * radio * 0.55);
      st.rotation.x = lado * 0.5;
      p.add(st);
    }

    // quilla corta bajo el pontón: lee como "agarra el agua" en el derrape
    const q = new THREE.Mesh(geoQuilla, matPunta);
    q.position.set(-largo * 0.05, -radio * 0.92, 0);
    p.add(q);

    p.position.set(centro.x - grupo.position.x, yPonton, lado * sepZ);
    flot.add(p);
  }

  grupo.add(flot);
  return flot;
}
