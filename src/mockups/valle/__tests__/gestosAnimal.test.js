import { describe, expect, it } from 'vitest';
import { GESTOS } from '../gestosAnimal.js';

function grupo() {
  return {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
  };
}

describe('GESTOS animales', () => {
  it('hace que el cerdo baje el hocico al activarse', () => {
    const cabeza = grupo();

    GESTOS.hocica(cabeza, Math.PI / (2 * 1.1), 0);

    expect(cabeza.rotation.z).toBeCloseTo(-0.35);
  });

  it('mantiene al lechon cerca de la posicion que sigue', () => {
    const lechon = grupo();
    const cerdaPos = [-1.55, 0, 0.35];
    const desplazamiento = [0.35, 0, 0.27];
    const origen = cerdaPos.map((valor, indice) => valor + desplazamiento[indice]);

    GESTOS.sigueCerda(lechon, 1.3, 0.8, cerdaPos, desplazamiento, -0.4);

    expect(lechon.position.x).toBeGreaterThan(origen[0] - 0.1);
    expect(lechon.position.x).toBeLessThan(origen[0] + 0.1);
    expect(lechon.position.y).toBe(origen[1]);
    expect(lechon.position.z).toBeGreaterThan(origen[2] - 0.05);
    expect(lechon.position.z).toBeLessThan(origen[2] + 0.05);
    expect(lechon.rotation.y).not.toBe(-0.4);
  });
});
