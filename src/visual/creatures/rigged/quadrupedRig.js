import * as THREE from 'three';
import { RiggedActor } from '../../../../lib3d/personajes/rig-animado-3d/RiggedActor.js';

const WALK_TIMES = [0, 0.25, 0.5, 0.75, 1];
const IDLE_TIMES = [0, 0.6, 1.2, 1.8, 2.4];

function makeBone(name, parent, x, y, z = 0) {
  const bone = new THREE.Bone();
  bone.name = name;
  bone.position.set(x, y, z);
  parent?.add(bone);
  return bone;
}

function skinGeometry(geometry, boneIndex) {
  const vertexCount = geometry.attributes.position.count;
  const indices = new Uint16Array(vertexCount * 4);
  const weights = new Float32Array(vertexCount * 4);
  for (let i = 0; i < vertexCount; i += 1) {
    indices[i * 4] = boneIndex;
    weights[i * 4] = 1;
  }
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
  return geometry;
}

function addSkinnedBox(model, skeleton, name, size, center, boneIndex, material) {
  const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
  geometry.translate(center[0], center[1], center[2]);
  skinGeometry(geometry, boneIndex);
  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.bind(skeleton);
  model.add(mesh);
  return mesh;
}

function addSkinnedSphere(model, skeleton, name, radius, center, scale, boneIndex, material) {
  const geometry = new THREE.SphereGeometry(radius, 16, 10);
  geometry.scale(scale[0], scale[1], scale[2]);
  geometry.translate(center[0], center[1], center[2]);
  skinGeometry(geometry, boneIndex);
  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.bind(skeleton);
  model.add(mesh);
  return mesh;
}

function addPart(parent, name, geometry, material, position, scale = [1, 1, 1], rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(position[0], position[1], position[2]);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addLeg({ bones, materials, parent, prefix, x, z, scale = 1, thickness = 1 }) {
  const upper = makeBone(`${prefix}Upper`, parent, x, -0.34 * scale, z);
  const lower = makeBone(`${prefix}Lower`, upper, 0, -0.58 * scale, 0);
  const paw = makeBone(`${prefix}Paw`, lower, 0.08 * scale, -0.36 * scale, 0);
  const upperGeometry = new THREE.BoxGeometry(0.28 * scale * thickness, 0.62 * scale, 0.3 * scale * thickness);
  const lowerGeometry = new THREE.BoxGeometry(0.23 * scale * thickness, 0.62 * scale, 0.26 * scale * thickness);
  const pawGeometry = new THREE.SphereGeometry(0.2 * scale * thickness, 12, 8);
  addPart(upper, `${prefix}UpperMesh`, upperGeometry, materials.body, [0, -0.3 * scale, 0]);
  addPart(lower, `${prefix}LowerMesh`, lowerGeometry, materials.bodyShadow, [0, -0.3 * scale, 0]);
  addPart(paw, `${prefix}PawMesh`, pawGeometry, materials.paw, [0.08 * scale, -0.08 * scale, 0], [1.25 * thickness, 0.62, 0.9 * thickness]);
  bones[prefix] = { upper, lower, paw };
}

function addTail({ bones, materials, pelvis, scale = 1 }) {
  const tailBase = makeBone('tailBase', pelvis, -0.76 * scale, 0.04 * scale, 0);
  const tailMid = makeBone('tailMid', tailBase, -0.43 * scale, 0.04 * scale, 0);
  const tailTip = makeBone('tailTip', tailMid, -0.38 * scale, 0.02 * scale, 0);
  const segment = (parent, name, length, radius) => addPart(
    parent,
    name,
    new THREE.CylinderGeometry(radius, radius * 1.12, length, 12),
    materials.body,
    [-length / 2, 0, 0],
    [1, 1, 1],
    [0, 0, Math.PI / 2],
  );
  segment(tailBase, 'tailBaseMesh', 0.52 * scale, 0.16 * scale);
  segment(tailMid, 'tailMidMesh', 0.46 * scale, 0.12 * scale);
  segment(tailTip, 'tailTipMesh', 0.36 * scale, 0.09 * scale);
  bones.tail = { tailBase, tailMid, tailTip };
}

function track(nodeName, property, times, values) {
  return new THREE.NumberKeyframeTrack(`${nodeName}.${property}`, times, values);
}

function makeClips({ walkAmplitude = 0.55, idleBob = 0.025, tailAmplitude = 0.18 } = {}) {
  const diagonalA = ['hindLeftUpper', 'frontRightUpper'];
  const diagonalB = ['hindRightUpper', 'frontLeftUpper'];
  const tracks = [];
  const legTrack = (name, values) => tracks.push(track(name, 'rotation[z]', WALK_TIMES, values));
  for (const name of diagonalA) legTrack(name, [walkAmplitude, 0, -walkAmplitude, 0, walkAmplitude]);
  for (const name of diagonalB) legTrack(name, [-walkAmplitude, 0, walkAmplitude, 0, -walkAmplitude]);
  for (const name of ['hindLeftLower', 'frontRightLower']) {
    legTrack(name, [-walkAmplitude * 0.45, 0.14, walkAmplitude * 0.5, 0.14, -walkAmplitude * 0.45]);
  }
  for (const name of ['hindRightLower', 'frontLeftLower']) {
    legTrack(name, [walkAmplitude * 0.5, 0.14, -walkAmplitude * 0.45, 0.14, walkAmplitude * 0.5]);
  }

  const walk = new THREE.AnimationClip('walk', 1, [
    ...tracks,
    track('spine', 'rotation[z]', WALK_TIMES, [0.03, -0.03, 0.03, -0.03, 0.03]),
    track('chest', 'rotation[z]', WALK_TIMES, [-0.025, 0.025, -0.025, 0.025, -0.025]),
    track('tailBase', 'rotation[y]', WALK_TIMES, [tailAmplitude, 0, -tailAmplitude, 0, tailAmplitude]),
    track('tailMid', 'rotation[y]', WALK_TIMES, [tailAmplitude * 0.7, 0, -tailAmplitude * 0.7, 0, tailAmplitude * 0.7]),
  ]);

  const idle = new THREE.AnimationClip('idle', 2.4, [
    track('spine', 'rotation[z]', IDLE_TIMES, [0, idleBob, 0, -idleBob, 0]),
    track('chest', 'rotation[z]', IDLE_TIMES, [0, -idleBob * 0.7, 0, idleBob * 0.7, 0]),
    track('neck', 'rotation[z]', IDLE_TIMES, [0, -0.025, 0.012, 0.025, 0]),
    track('tailBase', 'rotation[y]', IDLE_TIMES, [0.08, 0.2, 0.08, -0.12, 0.08]),
    track('tailMid', 'rotation[y]', IDLE_TIMES, [0.04, 0.12, 0.04, -0.08, 0.04]),
  ]);

  const attack = new THREE.AnimationClip('attack', 0.9, [
    track('spine', 'rotation[z]', [0, 0.38, 0.9], [0, -0.2, 0]),
    track('chest', 'rotation[z]', [0, 0.38, 0.9], [0, -0.3, 0]),
    track('head', 'rotation[z]', [0, 0.38, 0.9], [0, 0.24, 0]),
    track('frontLeftUpper', 'rotation[z]', [0, 0.38, 0.9], [0, -0.7, 0]),
    track('frontRightUpper', 'rotation[z]', [0, 0.38, 0.9], [0, -0.7, 0]),
  ]);

  const death = new THREE.AnimationClip('death', 1.15, [
    track('spine', 'rotation[z]', [0, 0.5, 1.15], [0, 0.18, 0.7]),
    track('chest', 'rotation[z]', [0, 0.5, 1.15], [0, 0.22, 0.65]),
    track('neck', 'rotation[z]', [0, 0.5, 1.15], [0, -0.16, -0.55]),
    track('frontLeftUpper', 'rotation[z]', [0, 0.5, 1.15], [0, 0.35, 0.9]),
    track('frontRightUpper', 'rotation[z]', [0, 0.5, 1.15], [0, 0.35, 0.9]),
    track('hindLeftUpper', 'rotation[z]', [0, 0.5, 1.15], [0, -0.2, -0.6]),
    track('hindRightUpper', 'rotation[z]', [0, 0.5, 1.15], [0, -0.2, -0.6]),
  ]);

  return { idle, walk, attack, death };
}

export function createQuadrupedRig({
  kind,
  palette,
  scale = 1,
  walkAmplitude = 0.55,
  idleBob = 0.025,
  tailAmplitude = 0.18,
  markings = 'plain',
  legThickness = 1,
  snoutScale = 1,
  bodyScale = [1, 1, 1],
}) {
  const materials = Object.fromEntries(
    Object.entries(palette).map(([name, material]) => [name, material.clone()]),
  );
  const model = new THREE.Group();
  model.name = `${kind}-rigged-model`;
  const bones = {};
  const root = makeBone('rigRoot', model, 0, 0.45 * scale, 0);
  bones.rigRoot = root;
  const pelvis = makeBone('pelvis', root, -0.7 * scale, 0.95 * scale, 0);
  const spine = makeBone('spine', pelvis, 0.65 * scale, 0.02 * scale, 0);
  const chest = makeBone('chest', spine, 0.6 * scale, 0.02 * scale, 0);
  const neck = makeBone('neck', chest, 0.55 * scale, 0.18 * scale, 0);
  const head = makeBone('head', neck, 0.35 * scale, 0, 0);
  const jaw = makeBone('jaw', head, 0.14 * scale, -0.16 * scale, 0);
  Object.assign(bones, { pelvis, spine, chest, neck, head, jaw });

  addLeg({ bones, materials, parent: pelvis, prefix: 'hindLeft', x: -0.35 * scale, z: 0.38 * scale, scale, thickness: legThickness });
  addLeg({ bones, materials, parent: pelvis, prefix: 'hindRight', x: -0.35 * scale, z: -0.38 * scale, scale, thickness: legThickness });
  addLeg({ bones, materials, parent: chest, prefix: 'frontLeft', x: 0.28 * scale, z: 0.38 * scale, scale, thickness: legThickness });
  addLeg({ bones, materials, parent: chest, prefix: 'frontRight', x: 0.28 * scale, z: -0.38 * scale, scale, thickness: legThickness });
  addTail({ bones, materials, pelvis, scale });

  const boneList = [];
  root.traverse((bone) => boneList.push(bone));
  const boneIndices = new Map(boneList.map((bone, index) => [bone.name, index]));
  const skeleton = new THREE.Skeleton(boneList);

  addSkinnedBox(model, skeleton, `${kind}-body`, [2.65 * scale * bodyScale[0], 0.86 * scale * bodyScale[1], 0.96 * scale * bodyScale[2]], [0, 1.38 * scale, 0], boneIndices.get('spine'), materials.body);
  addSkinnedSphere(model, skeleton, `${kind}-head`, 0.5 * scale, [1.58 * scale, 1.72 * scale, 0], [1.05, 0.9, 0.9], boneIndices.get('head'), materials.body);
  addSkinnedBox(model, skeleton, `${kind}-belly`, [1.25 * scale * bodyScale[0], 0.42 * scale, 0.985 * scale * bodyScale[2]], [0.28 * scale, 1.16 * scale, 0], boneIndices.get('spine'), materials.belly);

  const muzzle = addPart(head, `${kind}-muzzle`, new THREE.SphereGeometry(0.28 * scale, 14, 10), materials.muzzle, [0.34 * scale, -0.08 * scale, 0], [1.25 * snoutScale, 0.75, 0.82]);
  addPart(jaw, `${kind}-jaw`, new THREE.SphereGeometry(0.18 * scale, 12, 8), materials.muzzle, [0.15 * scale, -0.05 * scale, 0], [1.2, 0.72, 0.8]);
  addPart(head, `${kind}-nose`, new THREE.SphereGeometry(0.11 * scale, 12, 8), materials.nose, [0.62 * scale * snoutScale, -0.08 * scale, 0], [1.2, 0.8, 0.9]);
  for (const side of [-1, 1]) {
    addPart(head, `${kind}-eye-${side}`, new THREE.SphereGeometry(0.075 * scale, 12, 8), materials.eye, [0.26 * scale, 0.14 * scale, side * 0.36 * scale]);
    addPart(head, `${kind}-ear-${side}`, new THREE.SphereGeometry(0.22 * scale, 12, 8), materials.bodyShadow, [-0.04 * scale, 0.37 * scale, side * 0.27 * scale], [0.72, 1.35, 0.55]);
  }
  addPart(head, `${kind}-brow`, new THREE.BoxGeometry(0.36 * scale, 0.07 * scale, 0.72 * scale), materials.bodyShadow, [0.13 * scale, 0.29 * scale, 0]);

  if (markings === 'jaguar') {
    const rosettes = [
      [-0.76, 1.58, 0.5], [-0.25, 1.64, 0.52], [0.25, 1.57, 0.5],
      [-0.65, 1.25, 0.51], [-0.12, 1.23, 0.51], [0.48, 1.28, 0.5],
    ];
    for (const [x, y, z] of rosettes) {
      addPart(spine, `${kind}-rosette-${x}-${z}`, new THREE.TorusGeometry(0.11 * scale, 0.025 * scale, 6, 12), materials.marking, [x * scale + 0.05 * scale, (y - 1.42) * scale, z * scale], [1.2, 0.9, 0.35], [Math.PI / 2, 0, 0]);
      addPart(spine, `${kind}-rosette-dot-${x}-${z}`, new THREE.SphereGeometry(0.035 * scale, 8, 6), materials.marking, [x * scale + 0.05 * scale, (y - 1.42) * scale, (z + 0.012) * scale]);
    }
  } else if (markings === 'oso') {
    const maskMaterial = materials.antifaz || materials.belly;
    for (const side of [-1, 1]) {
      addPart(head, `${kind}-antifaz-${side}`, new THREE.SphereGeometry(0.17 * scale, 12, 8), maskMaterial, [0.13 * scale, 0.03 * scale, side * 0.33 * scale], [1.15, 0.72, 0.5]);
    }
    addPart(head, `${kind}-muzzle-blaze`, new THREE.SphereGeometry(0.09 * scale, 12, 8), maskMaterial, [0.5 * scale, -0.02 * scale, 0], [1.3, 0.7, 0.9]);
  } else {
    addPart(chest, `${kind}-chest-mark`, new THREE.SphereGeometry(0.4 * scale, 14, 10), materials.belly, [0.12 * scale, -0.04 * scale, 0.42 * scale], [0.9, 1.1, 0.18]);
  }

  model.updateMatrixWorld(true);
  skeleton.calculateInverses();
  return {
    model,
    bones,
    skeleton,
    clips: makeClips({ walkAmplitude, idleBob, tailAmplitude }),
    boneNames: boneList.map((bone) => bone.name),
    materials,
    muzzle,
  };
}

export function createQuadrupedActor(config, opts = {}) {
  const rig = createQuadrupedRig(config);
  const actor = new RiggedActor(rig.model, {
    ...opts,
    clips: { ...rig.clips, ...(opts.clips || {}) },
  });
  actor.rig = rig;
  actor.species = config.kind;
  return actor;
}
