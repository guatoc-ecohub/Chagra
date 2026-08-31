import {
  BoxGeometry,
  DataTexture,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  RGBAFormat,
} from 'three';
import { createImpostorLOD, ImpostoresLOD } from '../../lib3d/render/impostoresLOD.js';

function textureDePrueba() {
  const texture = new DataTexture(new Uint8Array([80, 140, 70, 255]), 1, 1, RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}

describe('impostores LOD de vegetacion', () => {
  it('crea un billboard Sprite como segundo nivel y conserva el mesh original', () => {
    const mesh = new Mesh(
      new BoxGeometry(2, 6, 2),
      new MeshBasicMaterial({ color: 0x4c8a45 }),
    );
    const lod = createImpostorLOD(mesh, { texture: textureDePrueba(), switchDistance: 24 });

    expect(lod).toBeInstanceOf(ImpostoresLOD);
    expect(lod.source).toBe(mesh);
    expect(lod.impostor.isSprite).toBe(true);
    expect(lod.levels).toHaveLength(2);
    expect(lod.levels[1].distance).toBe(24);
    expect(lod.impostor.scale.y).toBeGreaterThan(lod.impostor.scale.x);
    expect(lod.impostor.visible).toBe(false);
  });

  it('cambia a impostor lejos y vuelve al mesh con hysteresis', () => {
    const mesh = new Mesh(new BoxGeometry(2, 4, 2), new MeshBasicMaterial({ color: 0x4c8a45 }));
    const lod = createImpostorLOD(mesh, {
      texture: textureDePrueba(),
      switchDistance: 10,
      hysteresis: 0.1,
    });
    const camera = new PerspectiveCamera(45, 1, 0.1, 100);

    camera.position.set(0, 2, 5);
    camera.updateMatrixWorld();
    lod.updateMatrixWorld(true);
    expect(lod.update(camera)).toBe(mesh);
    expect(lod.isUsingImpostor).toBe(false);

    camera.position.set(0, 2, 20);
    camera.updateMatrixWorld();
    expect(lod.update(camera)).toBe(lod.impostor);
    expect(mesh.visible).toBe(false);
    expect(lod.impostor.visible).toBe(true);

    camera.position.set(0, 2, 9.5);
    camera.updateMatrixWorld();
    expect(lod.update(camera)).toBe(lod.impostor);

    camera.position.set(0, 2, 8);
    camera.updateMatrixWorld();
    expect(lod.update(camera)).toBe(mesh);
    expect(mesh.visible).toBe(true);
    expect(lod.impostor.visible).toBe(false);
  });

  it('acepta una textura compartida y no la libera al disponer el LOD', () => {
    const texture = textureDePrueba();
    const mesh = new Mesh(new BoxGeometry(1, 2, 1), new MeshBasicMaterial());
    const lod = createImpostorLOD(mesh, { texture });

    expect(lod.texture).toBe(texture);
    expect(lod.ownsTexture).toBe(false);
    expect(() => lod.dispose()).not.toThrow();
    expect(texture.image).toBeDefined();
  });
});
