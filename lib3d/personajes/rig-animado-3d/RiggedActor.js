/*
 * Runtime reusable de rig/animación para criaturas y guías.
 *
 * Patrón destilado de rork-medieval-chess (MIT). Se conserva el contrato
 * mixer-driven del STEAL y se excluye la lógica específica de ajedrez, GLB y
 * carga de assets. El consumidor inyecta el modelo y los clips compatibles.
 */
import * as THREE from 'three';
import { createDissolveUniforms, installDissolve } from './dissolve.js';

export class RiggedActor {
  constructor(model, opts = {}) {
    this.container = new THREE.Group();
    this.runtime = new THREE.Group();
    this.visual = new THREE.Group();
    this.container.add(this.runtime);
    this.runtime.add(this.visual);
    this.visual.add(model);
    this.majestic = opts.majestic === true;
    this.phase = opts.phase ?? 0;
    this.mixer = null;
    this.actions = new Map();
    this.activeOneShot = null;
    this.loopClip = null;
    this.idleWanted = opts.idle !== false;
    this.idleLooping = false;
    this.slain = false;
    this.lockRootMotion = true;
    this.rootBone = null;
    this.rootRest = new THREE.Vector3();
    this.strikeTilt = 0;
    this.meshes = [];
    this.dissolveAmount = 0;
    this.dissolveUniforms = createDissolveUniforms({
      span: opts.dissolveSpan ?? [0, 2],
      ember: opts.dissolveEmber ?? 0xffa060,
    });
    model.traverse((node) => {
      if (!node.isMesh) return;
      this.meshes.push(node);
      if (node.material?.isMeshStandardMaterial) installDissolve(node.material, this.dissolveUniforms, 0.85);
    });
    this.setupAnimations(model, opts.clips ?? {});
  }

  get object() { return this.container; }
  get hasAnimations() { return this.mixer !== null; }
  hasClip(name) { return this.actions.has(name); }

  setupAnimations(model, clips) {
    let rigged = false;
    model.traverse((node) => {
      if (node.isBone) {
        rigged = true;
        if (!this.rootBone) {
          this.rootBone = node;
          this.rootRest.copy(node.position);
        }
      }
      if (node.isSkinnedMesh) {
        rigged = true;
        node.frustumCulled = false;
      }
    });
    const entries = Object.entries(clips).filter(([, clip]) => clip);
    if (!rigged && entries.length === 0) return;
    this.mixer = new THREE.AnimationMixer(model);
    for (const [name, clip] of entries) this.addAction(name, clip);
    this.mixer.addEventListener('finished', ({ action }) => {
      if (this.activeOneShot === 'attack' && action === this.actions.get('attack')) this.playIdle(0.2);
    });
    if (this.idleWanted) this.playIdle(0);
  }

  addAction(name, clip) {
    if (!this.mixer || this.actions.has(name)) return false;
    const action = this.mixer.clipAction(clip);
    action.enabled = true;
    this.actions.set(name, action);
    return true;
  }

  installClip(name, clip) {
    if (!this.addAction(name, clip)) return;
    if (name === 'idle' && this.idleWanted && !this.slain && !this.activeOneShot && !this.loopClip) this.playIdle(0.35);
  }

  playIdle(fade = 0.3) {
    const action = this.actions.get('idle');
    if (!action || !this.mixer || this.slain) return false;
    for (const [key, other] of this.actions) if (key !== 'idle') other.fadeOut(fade);
    action.reset().setLoop(THREE.LoopRepeat, Infinity).setEffectiveTimeScale(1).setEffectiveWeight(1);
    action.clampWhenFinished = false;
    if (fade > 0) action.fadeIn(fade);
    action.play();
    this.activeOneShot = null;
    this.loopClip = null;
    this.idleLooping = true;
    this.lockRootMotion = true;
    return true;
  }

  startLoop(name, stepRate = 2) {
    const action = this.actions.get(name);
    if (!action || !this.mixer || this.slain) return false;
    const clip = action.getClip();
    const timeScale = THREE.MathUtils.clamp(stepRate * 0.5 * clip.duration, 0.4, 2.8);
    for (const [key, other] of this.actions) if (key !== name) other.fadeOut(0.16);
    action.reset().setLoop(THREE.LoopRepeat, Infinity).setEffectiveTimeScale(timeScale).setEffectiveWeight(1);
    action.clampWhenFinished = false;
    action.paused = false;
    action.fadeIn(0.14).play();
    this.activeOneShot = null;
    this.idleLooping = false;
    this.loopClip = name;
    this.lockRootMotion = true;
    return true;
  }

  playOneShot(name, seconds) {
    const action = this.actions.get(name);
    if (!action || !this.mixer) return 0;
    const clip = action.getClip();
    const target = seconds ?? clip.duration;
    const scale = clip.duration > 0 ? clip.duration / target : 1;
    for (const [key, other] of this.actions) if (key !== name) other.fadeOut(0.1);
    action.reset().setLoop(THREE.LoopOnce, 1).setEffectiveTimeScale(scale).setEffectiveWeight(1);
    action.clampWhenFinished = true;
    action.paused = false;
    action.fadeIn(0.08).play();
    this.activeOneShot = name;
    this.idleLooping = false;
    this.loopClip = null;
    this.lockRootMotion = name !== 'death';
    return target;
  }

  playAttack(seconds) {
    const duration = this.playOneShot('attack', seconds ?? (this.majestic ? 1.5 : 0.95));
    return { duration, impact: duration * (this.majestic ? 0.56 : 0.42) };
  }

  playDeath(seconds) {
    this.slain = true;
    this.loopClip = null;
    return this.playOneShot('death', seconds ?? (this.majestic ? 1.15 : 0.85));
  }

  setStrikeTilt(tilt) { this.strikeTilt = tilt; }

  setDissolve(amount) {
    const value = THREE.MathUtils.clamp(amount, 0, 1);
    this.dissolveAmount = value;
    this.dissolveUniforms.uDissolve.value = value;
    const solid = value <= 0.02;
    for (const mesh of this.meshes) mesh.castShadow = solid;
  }

  get dissolveLevel() { return this.dissolveAmount; }

  resetPose() {
    this.slain = false;
    this.setDissolve(0);
    this.strikeTilt = 0;
    this.visual.scale.setScalar(1);
    this.runtime.position.set(0, 0, 0);
    this.runtime.rotation.set(0, 0, 0);
    if (!this.mixer) return;
    for (const action of this.actions.values()) action.stop();
    this.activeOneShot = null;
    this.loopClip = null;
    this.playIdle(0);
  }

  update(delta, elapsed = 0) {
    if (this.mixer) {
      this.mixer.update(delta);
      if (this.rootBone && this.lockRootMotion) {
        this.rootBone.position.x = this.rootRest.x;
        this.rootBone.position.z = this.rootRest.z;
      }
      this.runtime.rotation.z = 0;
      this.runtime.rotation.x = this.strikeTilt;
      return;
    }
    const amplitude = this.majestic ? 0.45 : 1;
    const breath = Math.sin(elapsed * (this.majestic ? 0.7 : 1.15) + this.phase);
    const sway = Math.sin(elapsed * (this.majestic ? 0.42 : 0.7) + this.phase * 1.7);
    this.runtime.position.y += (breath * 0.006 * amplitude - this.runtime.position.y) * Math.min(1, delta * 9);
    this.runtime.rotation.z = sway * 0.012 * amplitude;
    this.runtime.rotation.x = breath * 0.008 * amplitude + this.strikeTilt;
  }

  dispose() {
    this.mixer?.stopAllAction();
    this.container.removeFromParent();
  }
}
