import * as THREE from 'three';

export const PRESUPUESTO_PASTO = {
  bajo: 180,
  medio: 520,
  alto: 1200,
};

const CLEARING = {
  camino: 0.68,
  casa: 1.25,
  cauce: 0.56,
};

export function rngPasto(seed = 1) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function distanciaACamino(x, z) {
  const eje = 0.12 * z - 0.25;
  return Math.abs(x - eje);
}

function distanciaACauce(x, z) {
  const cauce = 1.1 + 0.19 * (z + 1);
  return Math.abs(x - cauce);
}

export function despejadoParaPasto(x, z) {
  const noCasa = Math.hypot(x + 0.1, z - 1.8) > CLEARING.casa;
  const noCamino = distanciaACamino(x, z) > CLEARING.camino || z < -5 || z > 8;
  const noCauce = distanciaACauce(x, z) > CLEARING.cauce;
  return noCasa && noCamino && noCauce;
}

/**
 * Siembra determinista de mechones. El punto y queda a cargo del terreno del
 * valle, mientras que la semilla/facing viajan al shader para viento rooted.
 */
export function sembrarPasto({ count, area = 30, seed = 7331, alturaDe }) {
  const random = rngPasto(seed);
  const items = [];
  let intentos = 0;
  const maxIntentos = Math.max(count * 8, 16);

  while (items.length < count && intentos < maxIntentos) {
    intentos += 1;
    const x = random() * area - area / 2;
    const z = random() * area - area / 2;
    if (!despejadoParaPasto(x, z)) continue;
    items.push({
      x,
      y: alturaDe(x, z) + 0.015,
      z,
      yaw: random() * Math.PI * 2,
      altura: 0.72 + random() * 0.58,
      escala: 0.82 + random() * 0.34,
      semilla: random(),
    });
  }

  return items;
}

export function crearGeometriaPasto({ segmentos = 4, ancho = 0.11, alto = 1 } = {}) {
  const posiciones = [];
  const normales = [];
  const uvs = [];
  const indices = [];
  const planos = 4;

  for (let plano = 0; plano < planos; plano += 1) {
    const angulo = (plano / planos) * Math.PI;
    const cos = Math.cos(angulo);
    const sin = Math.sin(angulo);
    const normal = new THREE.Vector3(sin, 0.28, cos).normalize();
    const base = posiciones.length / 3;

    for (let segmento = 0; segmento <= segmentos; segmento += 1) {
      const t = segmento / segmentos;
      const taper = (1 - t) ** 1.25;
      const lean = t ** 1.7 * 0.12;
      const y = t * alto;
      const mitad = ancho * (0.2 + 0.8 * taper);
      for (const lado of [-1, 1]) {
        const localX = lado * mitad;
        const localZ = lean;
        posiciones.push(
          localX * cos - localZ * sin,
          y,
          localX * sin + localZ * cos,
        );
        normales.push(normal.x, normal.y, normal.z);
        uvs.push(lado < 0 ? 0 : 1, t);
      }
    }

    for (let segmento = 0; segmento < segmentos; segmento += 1) {
      const fila = base + segmento * 2;
      indices.push(fila, fila + 1, fila + 2, fila + 1, fila + 3, fila + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normales, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}
