import { AnimationClip, Bone, BoxGeometry, Mesh, MeshStandardMaterial, NumberKeyframeTrack, Object3D } from 'three';
import { RiggedActor } from '../../lib3d/personajes/rig-animado-3d/RiggedActor.js';

function actorFixture() {
  const model = new Bone();
  model.add(new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial()));
  const idle = new AnimationClip('idle', 1, [new NumberKeyframeTrack('.position[y]', [0, 1], [0, 0.2])]);
  const attack = new AnimationClip('attack', 0.5, [new NumberKeyframeTrack('.position[x]', [0, 0.5], [0, 1])]);
  return { model, idle, attack };
}

describe('RiggedActor', () => {
  it('avanza mixer, conserva root motion y expone ataques', () => {
    const { model, idle, attack } = actorFixture();
    const actor = new RiggedActor(model, { clips: { idle, attack } });
    expect(actor.hasAnimations).toBe(true);
    expect(actor.hasClip('idle')).toBe(true);
    expect(actor.playAttack(1).impact).toBeCloseTo(0.42);
    actor.update(0.25, 0.25);
    expect(model.position.x).toBeCloseTo(0);
    actor.setDissolve(0.5);
    expect(actor.dissolveLevel).toBe(0.5);
  });

  it('instala clips tardíos y ofrece fallback procedural sin mixer', () => {
    const { model, idle, attack } = actorFixture();
    const actor = new RiggedActor(model, { clips: { idle } });
    actor.installClip('attack', attack);
    expect(actor.hasClip('attack')).toBe(true);
    const fallback = new RiggedActor(new Object3D(), { phase: 0.5 });
    fallback.update(1 / 60, 1);
    expect(Number.isFinite(fallback.runtime.position.y)).toBe(true);
  });
});
