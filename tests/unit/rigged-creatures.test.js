import { createJaguarRiggedActor } from '../../src/visual/creatures/rigged/jaguarRigged.js';
import { createOsoRiggedActor } from '../../src/visual/creatures/rigged/osoRigged.js';

describe('rigs opt-in de jaguar y oso', () => {
  it.each([
    ['jaguar', createJaguarRiggedActor],
    ['oso', createOsoRiggedActor],
  ])('construye %s con esqueleto y clips sin FBX', (species, createActor) => {
    const actor = createActor();

    expect(actor.species).toBe(species);
    expect(actor.meshes.some((mesh) => mesh.isSkinnedMesh)).toBe(true);
    expect(actor.rig.boneNames).toEqual(expect.arrayContaining([
      'rigRoot', 'pelvis', 'spine', 'chest', 'head',
      'hindLeftUpper', 'frontRightPaw', 'tailTip',
    ]));
    expect(actor.hasClip('idle')).toBe(true);
    expect(actor.hasClip('walk')).toBe(true);
    expect(actor.hasClip('attack')).toBe(true);
    expect(actor.hasClip('death')).toBe(true);
    expect(actor.rig.materials.body.onBeforeCompile).toEqual(expect.any(Function));

    actor.startLoop('walk');
    actor.update(1 / 60, 1);
    actor.playDeath();
    actor.setDissolve(0.75);
    expect(actor.dissolveLevel).toBe(0.75);
    actor.dispose();
  });

  it('no comparte uniforms de dissolve entre actores', () => {
    const jaguar = createJaguarRiggedActor();
    const oso = createOsoRiggedActor();

    jaguar.setDissolve(0.9);
    expect(jaguar.dissolveLevel).toBe(0.9);
    expect(oso.dissolveLevel).toBe(0);
    expect(jaguar.rig.materials.body).not.toBe(oso.rig.materials.body);

    jaguar.dispose();
    oso.dispose();
  });
});
