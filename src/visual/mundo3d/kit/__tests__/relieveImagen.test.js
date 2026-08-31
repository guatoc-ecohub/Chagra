import { describe, expect, it } from 'vitest';
import {
  crearGeometriaRelieveImagen,
  luminanciaPixel,
} from '../relieveImagen.js';

function imageData(rows) {
  return {
    width: rows[0].length,
    height: rows.length,
    data: Uint8ClampedArray.from(rows.flatMap((row) => row.flatMap(([r, g, b, a = 255]) => [r, g, b, a]))),
  };
}

describe('relieveImagen', () => {
  it('convierte luminancia y alpha en una altura normalizada', () => {
    const image = imageData([[[255, 255, 255, 255], [0, 0, 0, 0]]]);

    expect(luminanciaPixel(image.data, image.width, image.height, 0, 0)).toBeCloseTo(1);
    expect(luminanciaPixel(image.data, image.width, image.height, 1, 0, { alphaMode: 'mask' })).toBe(0);
  });

  it('construye una malla indexada con UV y alturas reproducibles', () => {
    const image = imageData([
      [[0, 0, 0], [255, 255, 255]],
      [[0, 0, 0], [255, 255, 255]],
    ]);
    const geometry = crearGeometriaRelieveImagen({
      ...image,
      ancho: 2,
      fondo: 1,
      profundidad: 0.4,
      segmentsX: 1,
      segmentsZ: 1,
    });
    const positions = geometry.getAttribute('position').array;

    expect(geometry.index.count).toBe(6);
    expect(geometry.getAttribute('uv').count).toBe(4);
    expect(Math.min(...positions.filter((_, index) => index % 3 === 1))).toBe(0);
    expect(Math.max(...positions.filter((_, index) => index % 3 === 1))).toBeCloseTo(0.4);
    geometry.dispose();
  });

  it('rechaza una imagen que no tiene RGBA completo', () => {
    expect(() => crearGeometriaRelieveImagen({ data: [0, 0, 0], width: 1, height: 1 })).toThrow(/RGBA/);
  });
});
