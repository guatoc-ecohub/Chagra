/*
 * relieveImagen — heightfield pequeño a partir de píxeles de una imagen.
 *
 * Es una adaptación deliberadamente acotada del patrón image-to-geometry:
 * una sola vista no permite reconstruir un objeto completo, pero sí puede
 * aportar un relieve visual barato para una lámina o un suelo educativo.
 * three-core puro, sin red, canvas ni estado de aplicación.
 */
import * as THREE from 'three';

const MAX_SEGMENTS = 256;

function finitePositive(value, name) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${name} debe ser un número positivo`);
  }
  return value;
}

function integerInRange(value, fallback, name) {
  const candidate = value == null ? fallback : Number(value);
  if (!Number.isInteger(candidate) || candidate < 1 || candidate > MAX_SEGMENTS) {
    throw new RangeError(`${name} debe ser un entero entre 1 y ${MAX_SEGMENTS}`);
  }
  return candidate;
}

function validateImageData(data, width, height) {
  if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1) {
    throw new RangeError('width y height deben ser enteros positivos');
  }
  if (!data || data.length < width * height * 4) {
    throw new RangeError('data no contiene los cuatro canales RGBA de la imagen');
  }
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

/**
 * Lee un pixel RGBA y lo convierte a luminancia normalizada.
 *
 * @param {ArrayLike<number>} data
 * @param {number} width
 * @param {number} height
 * @param {number} x coordenada de pixel
 * @param {number} y coordenada de pixel
 * @param {{ invert?: boolean, alphaMode?: 'ignore'|'mask', contrast?: number }} [options]
 * @returns {number} valor entre 0 y 1
 */
export function luminanciaPixel(data, width, height, x, y, options = {}) {
  validateImageData(data, width, height);
  const px = Math.min(width - 1, Math.max(0, Math.round(x)));
  const py = Math.min(height - 1, Math.max(0, Math.round(y)));
  const offset = (py * width + px) * 4;
  let value = (
    data[offset] * 0.2126
    + data[offset + 1] * 0.7152
    + data[offset + 2] * 0.0722
  ) / 255;
  if (options.alphaMode === 'mask') value *= (data[offset + 3] ?? 255) / 255;
  if (options.invert) value = 1 - value;
  const contrast = options.contrast == null ? 1 : Number(options.contrast);
  if (!Number.isFinite(contrast) || contrast <= 0) throw new RangeError('contrast debe ser positivo');
  return clamp01((value - 0.5) * contrast + 0.5);
}

/**
 * Construye una malla horizontal XZ con la luminancia de la imagen como altura Y.
 * La imagen también puede usarse como textura sobre la misma malla.
 *
 * @param {object} options
 * @param {ArrayLike<number>} options.data RGBA en orden fila a fila
 * @param {number} options.width ancho de la imagen en píxeles
 * @param {number} options.height alto de la imagen en píxeles
 * @param {number} [options.ancho=2.4] extensión X de la malla
 * @param {number} [options.fondo=1.8] extensión Z de la malla
 * @param {number} [options.segmentsX=32] segmentos X
 * @param {number} [options.segmentsZ=24] segmentos Z
 * @param {number} [options.base=0] altura base
 * @param {number} [options.profundidad=0.16] amplitud del relieve
 * @param {boolean} [options.invert=false] invierte claro y oscuro
 * @param {'ignore'|'mask'} [options.alphaMode='ignore'] cómo tratar alpha
 * @param {number} [options.contrast=1] contraste aplicado al relieve
 * @returns {THREE.BufferGeometry}
 */
export function crearGeometriaRelieveImagen({
  data,
  width,
  height,
  ancho = 2.4,
  fondo = 1.8,
  segmentsX = 32,
  segmentsZ = 24,
  base = 0,
  profundidad = 0.16,
  invert = false,
  alphaMode = 'ignore',
  contrast = 1,
}) {
  validateImageData(data, width, height);
  finitePositive(ancho, 'ancho');
  finitePositive(fondo, 'fondo');
  if (!Number.isFinite(base) || !Number.isFinite(profundidad) || profundidad < 0) {
    throw new RangeError('base debe ser finita y profundidad no puede ser negativa');
  }
  if (alphaMode !== 'ignore' && alphaMode !== 'mask') {
    throw new RangeError("alphaMode debe ser 'ignore' o 'mask'");
  }
  const sx = integerInRange(segmentsX, 32, 'segmentsX');
  const sz = integerInRange(segmentsZ, 24, 'segmentsZ');
  const verticesX = sx + 1;
  const verticesZ = sz + 1;
  const positions = new Float32Array(verticesX * verticesZ * 3);
  const uvs = new Float32Array(verticesX * verticesZ * 2);
  let positionOffset = 0;
  let uvOffset = 0;

  for (let iz = 0; iz < verticesZ; iz += 1) {
    const v = iz / sz;
    const imageY = v * (height - 1);
    for (let ix = 0; ix < verticesX; ix += 1) {
      const u = ix / sx;
      const value = luminanciaPixel(data, width, height, u * (width - 1), imageY, {
        invert,
        alphaMode,
        contrast,
      });
      positions[positionOffset] = -ancho / 2 + u * ancho;
      positions[positionOffset + 1] = base + value * profundidad;
      positions[positionOffset + 2] = -fondo / 2 + v * fondo;
      positionOffset += 3;
      uvs[uvOffset] = u;
      uvs[uvOffset + 1] = 1 - v;
      uvOffset += 2;
    }
  }

  const indices = [];
  for (let iz = 0; iz < sz; iz += 1) {
    for (let ix = 0; ix < sx; ix += 1) {
      const a = iz * verticesX + ix;
      const b = a + 1;
      const d = a + verticesX;
      const e = d + 1;
      indices.push(a, d, b, b, d, e);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
