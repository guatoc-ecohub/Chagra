// ── Agua definitiva del valle ───────────────────────────────────────────────
// La entrada `agua-quebrada-chorrera.html` es la referencia visual aprobada:
// `lib3d/fx/aguaParamo.js` dibuja la quebrada y la chorrera sin física.
// Este adaptador sólo le entrega la geografía real del valle y excava la malla
// anfitriona; la apariencia vive en el módulo canónico, no aquí.
import * as THREE from 'three';
import { height } from './terrain.js';
import { facePos, pathX, T_NACE } from './cliff.js';
import {
  crearQuebrada,
  crearChorrera,
  crearHelechosRibera,
} from './lib3d/fx/aguaParamo.js';
import { crearBrumaVolumetrica } from './lib3d/fx/brumaVolumetrica.js';

const PIE_T = 0.12;

function excavarQuebrada(scene, quebrada) {
  const prof = quebrada?.profundidadEn;
  if (!prof) return;

  let terreno = null;
  scene.traverse((o) => {
    if (!terreno && o.isMesh && o.geometry?.attributes?.position
        && o.geometry.attributes.position.count > 50000) terreno = o;
  });
  if (!terreno) return;

  const pos = terreno.geometry.attributes.position;
  const arr = pos.array;
  for (let i = 0; i < arr.length; i += 3) {
    const x = arr[i], z = arr[i + 2];
    // La quebrada corre aguas abajo de La Chorrera; este margen evita revisar
    // la malla completa y deja intactas las otras laderas del valle.
    if (z < -900 || z > 360 || x < -190 || x > 190) continue;
    const zanja = prof(x, z);
    if (zanja > 0.001) arr[i + 1] -= zanja;
  }
  pos.needsUpdate = true;
  terreno.geometry.computeVertexNormals();
}

function materialesDe(grupo) {
  const mats = [];
  grupo.traverse((o) => {
    const material = o.material;
    if (Array.isArray(material)) {
      for (const m of material) if (m && !mats.includes(m)) mats.push(m);
    } else if (material && !mats.includes(material)) mats.push(material);
  });
  return mats;
}

export function makeWaterfalls(scene, { seed = 20260811 } = {}) {
  const sol = new THREE.Vector3(0.62, 0.15, 0.60).normalize();
  const topX = pathX(T_NACE);
  const bottomX = pathX(PIE_T);
  const top = facePos(topX, T_NACE);
  const bottom = facePos(bottomX, PIE_T);
  const alto = top.y - bottom.y;
  const perfil = (t) => {
    const tc = PIE_T + (T_NACE - PIE_T) * t;
    const x = pathX(tc);
    const p = facePos(x, tc);
    return { x, z: p.z - bottom.z };
  };

  // Una sola caída, con tres repisas y pozo, como en la entrada definitiva.
  const chorrera = crearChorrera(THREE, {
    alto,
    ancho: 3.4,
    saltos: 3,
    deriva: 0,
    caraEn: perfil,
    pozo: 5.2,
    gotas: 26,
    calidad: 'alta',
    seed: seed + 3,
    solDir: sol,
  });
  chorrera.grupo.position.set(0, bottom.y, bottom.z);
  scene.add(chorrera.grupo);

  // El curso continúa desde el pie de la caída hacia el valle. Los puntos
  // son XZ del anfitrión; la altura y la zanja las resuelve aguaParamo.
  const quebradaPuntos = [
    { x: bottomX, z: bottom.z + 10 },
    { x: bottomX + 12, z: bottom.z + 62 },
    { x: bottomX - 8, z: bottom.z + 145 },
    { x: bottomX + 18, z: bottom.z + 245 },
    { x: bottomX - 10, z: bottom.z + 360 },
    { x: bottomX + 5, z: bottom.z + 500 },
  ];
  const quebrada = crearQuebrada(THREE, {
    puntos: quebradaPuntos,
    alturaEn: (x, z) => height(x, z),
    ancho: 3.5,
    hundir: 0.7,
    piedras: 20,
    chispas: 60,
    seed: seed + 7,
    solDir: sol,
    muestras: 170,
  });
  scene.add(quebrada.grupo);
  excavarQuebrada(scene, quebrada);

  const helechos = crearHelechosRibera(THREE, {
    puntos: quebradaPuntos,
    alturaEn: (x, z) => height(x, z),
    n: 28,
    seed: 977,
    aparte: 9,
  });
  scene.add(helechos.grupo);

  const anclas = chorrera.anclasBruma.map((a) => ({
    x: a.x,
    y: bottom.y + a.y - 0.5,
    z: bottom.z + a.z,
  }));
  const bruma = crearBrumaVolumetrica(THREE, {
    puntos: anclas,
    jirones: 56,
    haces: 0,
    seed: seed + 47,
    dispersion: 3.0,
    solDir: sol,
    color: 0xe6efec,
    intensidad: 1,
    cerca: [8, 24],
    lejos: [260, 620],
  });
  scene.add(bruma.grupo);

  let ultimoT = null;
  return {
    update(t) {
      const dt = ultimoT == null ? 0 : Math.max(0, Math.min(0.05, t - ultimoT));
      ultimoT = t;
      quebrada.tick(dt);
      chorrera.tick(dt);
      bruma.tick(dt);
      // El reloj global de viento ya avanza una vez por frame en main.js.
    },
    mats: materialesDe(chorrera.grupo),
    quebrada,
    chorrera,
    helechos,
    bruma,
  };
}
