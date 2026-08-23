// ── clipmap.js — anillos LOD para un heightfield finito ─────────────────────
// La retícula vive en coordenadas de mundo y se construye una vez. Cada anillo
// conserva la forma del heightfield, pero duplica el paso hacia afuera: el
// terreno cercano sigue leyendo a resolución de producción y el horizonte no
// paga el mismo número de triángulos. No depende de React ni de un editor.

function dentro(x, z, pista) {
  return x >= pista.x0 && x <= pista.x1 && z >= pista.z0 && z <= pista.z1;
}

function crearAnillo(THREE, pista, centro, nivel, colorEn) {
  const paso = nivel.paso;
  const xMin = Math.max(pista.x0, centro.x - nivel.radioExterior);
  const xMax = Math.min(pista.x1, centro.x + nivel.radioExterior);
  const zMin = Math.max(pista.z0, centro.z - nivel.radioExterior);
  const zMax = Math.min(pista.z1, centro.z + nivel.radioExterior);
  const ix0 = Math.floor((xMin - pista.x0) / paso);
  const ix1 = Math.ceil((xMax - pista.x0) / paso);
  const iz0 = Math.floor((zMin - pista.z0) / paso);
  const iz1 = Math.ceil((zMax - pista.z0) / paso);
  const nx = ix1 - ix0 + 1;
  const nz = iz1 - iz0 + 1;

  const posiciones = new Float32Array(nx * nz * 3);
  const colores = new Float32Array(nx * nz * 3);
  const uvs = new Float32Array(nx * nz * 2);
  const color = [0, 0, 0];
  const vertice = (i, j) => j * nx + i;

  for (let j = 0; j < nz; j++) {
    const z = pista.z0 + (iz0 + j) * paso;
    for (let i = 0; i < nx; i++) {
      const x = pista.x0 + (ix0 + i) * paso;
      const k = vertice(i, j);
      const y = pista.alturaMundo(x, z);
      colorEn(x, z, y, color);
      posiciones[k * 3] = x;
      posiciones[k * 3 + 1] = y;
      posiciones[k * 3 + 2] = z;
      colores[k * 3] = color[0];
      colores[k * 3 + 1] = color[1];
      colores[k * 3 + 2] = color[2];
      // La repetición espacial la fija el material, igual que en el plano
      // original; acá solo normalizamos las coordenadas de cada mundo.
      uvs[k * 2] = (x - pista.x0) / Math.max(1, pista.x1 - pista.x0);
      uvs[k * 2 + 1] = (z - pista.z0) / Math.max(1, pista.z1 - pista.z0);
    }
  }

  const indices = [];
  const dentroAnillo = (x, z) => {
    const d = Math.max(Math.abs(x - centro.x), Math.abs(z - centro.z));
    return d > nivel.radioInterior && d <= nivel.radioExterior + paso;
  };
  for (let j = 0; j < nz - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const x0 = pista.x0 + (ix0 + i) * paso;
      const z0 = pista.z0 + (iz0 + j) * paso;
      const x1 = x0 + paso;
      const z1 = z0 + paso;
      if (!dentro(x0, z0, pista) || !dentro(x1, z0, pista)
        || !dentro(x0, z1, pista) || !dentro(x1, z1, pista)) continue;
      if (!dentroAnillo((x0 + x1) * 0.5, (z0 + z1) * 0.5)) continue;
      const a = vertice(i, j), b = vertice(i + 1, j);
      const c = vertice(i, j + 1), d = vertice(i + 1, j + 1);
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colores, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();

  const mesh = new THREE.Mesh(geo, nivel.material);
  mesh.name = `terreno-clipmap-l${nivel.indice}`;
  mesh.receiveShadow = true;
  mesh.userData = {
    lod: nivel.indice,
    paso,
    radioInterior: nivel.radioInterior,
    radioExterior: nivel.radioExterior,
    vertices: posiciones.length / 3,
    triangulos: indices.length / 3,
  };
  return mesh;
}

function combinarAnillos(THREE, anillos, material) {
  const vertices = anillos.reduce((n, mesh) => n + mesh.geometry.attributes.position.count, 0);
  const indicesN = anillos.reduce((n, mesh) => n + mesh.geometry.index.count, 0);
  const posiciones = new Float32Array(vertices * 3);
  const normales = new Float32Array(vertices * 3);
  const colores = new Float32Array(vertices * 3);
  const uvs = new Float32Array(vertices * 2);
  const indices = new Uint32Array(indicesN);
  let vertexOffset = 0;
  let indexOffset = 0;
  for (const mesh of anillos) {
    const geo = mesh.geometry;
    const n = geo.attributes.position.count;
    posiciones.set(geo.attributes.position.array, vertexOffset * 3);
    normales.set(geo.attributes.normal.array, vertexOffset * 3);
    colores.set(geo.attributes.color.array, vertexOffset * 3);
    uvs.set(geo.attributes.uv.array, vertexOffset * 2);
    const src = geo.index.array;
    for (let i = 0; i < src.length; i++) indices[indexOffset + i] = src[i] + vertexOffset;
    vertexOffset += n;
    indexOffset += src.length;
    geo.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normales, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colores, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'terreno-clipmap';
  mesh.receiveShadow = true;
  mesh.userData = {
    vertices,
    triangulos: indicesN / 3,
    drawCalls: 1,
    niveles: anillos.map((item) => ({ ...item.userData })),
  };
  return mesh;
}

/**
 * Construye un heightfield por anillos de resolución creciente.
 *
 * `colorEn(x, z, y, outRGB)` debe escribir RGB lineal 0..1 en `outRGB`.
 * `centro` es estable a propósito: el clipmap cubre todo el mundo finito y
 * no rehornea geometría durante la carrera.
 */
export function crearTerrenoClipmap(THREE, pista, opciones = {}) {
  const grupo = new THREE.Group();
  grupo.name = opciones.nombre ?? 'terreno-clipmap';
  const centro = opciones.centro ?? {
    x: (pista.x0 + pista.x1) * 0.5,
    z: (pista.z0 + pista.z1) * 0.5,
  };
  const niveles = opciones.niveles ?? [
    { paso: pista.paso, radioInterior: 0, radioExterior: 96 },
    { paso: pista.paso * 2, radioInterior: 96, radioExterior: 192 },
    { paso: pista.paso * 4, radioInterior: 192, radioExterior: 336 },
  ];
  const colorEn = opciones.colorEn ?? ((_x, _z, _y, out) => {
    out[0] = 0.42; out[1] = 0.5; out[2] = 0.3;
  });
  const anillos = [];
  for (let i = 0; i < niveles.length; i++) {
    const nivel = {
      ...niveles[i],
      indice: i,
      material: opciones.material,
    };
    if (!nivel.material) throw new Error('crearTerrenoClipmap necesita material');
    anillos.push(crearAnillo(THREE, pista, centro, nivel, colorEn));
  }
  grupo.add(combinarAnillos(THREE, anillos, opciones.material));
  grupo.userData = {
    tipo: 'clipmap-heightfield',
    centro: { ...centro },
    niveles: grupo.children[0].userData.niveles,
  };
  return grupo;
}
