/**
 * ez-tree — Tree (generador procedural, núcleo).
 *
 * Fuente: dgreenheck/ez-tree (github.com/dgreenheck/ez-tree), MIT License.
 * Copyright (c) 2024 Daniel Greenheck. Puerto three r167 → r160 para
 * ~/demos/lib3d (vendor sin build, importmap `three` bare).
 *
 * Adaptado de r167 → r160:
 *  - Imports relativos con extensión `.js` explícita (el import bare del
 *    original — `./rng`, `./branch` sin extensión — no resuelve bajo
 *    importmap sin bundler; r160 vendor exige el sufijo).
 *  - `#createBarkMaterial` / `#createLeafMaterial`: el original ramifica en
 *    `bark.textured` / `leaves.map` para aplicar mapas de textura (color/ao/
 *    normal/roughness). Chagra usa look ilustrado plano (Humboldt, NO foto-
 *    realista) y `options.js` en este vendor fija `textured:false` y
 *    `map:null` siempre — se eliminó la rama de aplicación de texturas
 *    (dead code en nuestro uso) y quedó el material MeshStandardMaterial
 *    liso con flatShading opcional. Si a futuro se quiere textura, restaurar
 *    desde el original (misma lógica, sólo se recortó aquí).
 *  - Resto del algoritmo (crecimiento del esqueleto, mallado, LOD, trellis,
 *    shader de viento) sin cambios: Group/LOD/Vector3/Euler/Quaternion/
 *    BufferGeometry/BufferAttribute/MeshStandardMaterial/ShaderChunk son
 *    API idéntica en r160 y r167.
 *  - `mergeGeometries` NO hace falta: Tree ya mantiene branches/leaves como
 *    dos meshes separados (igual que pide el brief), así que no se importó
 *    BufferGeometryUtils ni se necesitó el shim manual que usa ArbolFabrica.js.
 */
import * as THREE from 'three';
import RNG from './rng.js';
import { Branch } from './branch.js';
import { Billboard, TreeType } from './enums.js';
import TreeOptions from './options.js';
import { Trellis } from './trellis.js';

export class Tree extends THREE.Group {
  /**
   * @type {RNG}
   */
  rng;

  /**
   * @type {TreeOptions}
   */
  options;

  /**
   * @type {Branch[]}
   */
  branchQueue = [];

  /**
   * @param {TreeOptions} params
   */
  constructor(options = new TreeOptions()) {
    super();
    this.name = 'Tree';
    this.branchesMesh = new THREE.Mesh();
    this.leavesMesh = new THREE.Mesh();
    this.trellisMesh = null;
    this.lod = null;
    this.skeleton = null;
    this.add(this.branchesMesh);
    this.add(this.leavesMesh);
    this.options = options;
  }

  update(elapsedTime) {
    const leafShader = this.leavesMesh.material.userData.shader;
    if (leafShader) {
      leafShader.uniforms.uTime.value = elapsedTime;
    }
  }

  /**
   * Loads a tree from JSON (plain object matching TreeOptions shape)
   * @param {TreeOptions} json
   */
  loadFromJson(json) {
    this.options.copy(json);
    this.generate();
  }

  /**
   * @typedef {Object} LODDetail
   * @property {number} [sectionStride=1] Sample every Nth section ring; the
   *   first and last rings are always kept so branch endpoints stay put
   * @property {number} [segmentFactor=1] Radial segment multiplier;
   *   segments = max(3, round(segmentCount * segmentFactor))
   * @property {number} [leafStride=1] Keep every Nth leaf
   * @property {number} [leafScale=1] Size multiplier for the kept leaves,
   *   typically 1/sqrt(kept fraction) to preserve canopy coverage
   * @property {string} [billboard] Billboard mode override for this level
   *   ('single' or 'double'); defaults to options.leaves.billboard
   */

  /**
   * @typedef {Object} LODLevel
   * @property {number} distance Camera distance at which this level activates
   * @property {number} [hysteresis] Switch hysteresis as a fraction of distance
   * @property {LODDetail} [detail] Meshing detail for this level
   */

  /**
   * Default levels for generateLODs(). LOD1 is roughly 40% of the full
   * triangle count, LOD2 roughly 20%.
   * @type {LODLevel[]}
   */
  static defaultLODLevels = [
    { distance: 0, detail: {} },
    {
      distance: 100,
      hysteresis: 0.05,
      detail: {
        sectionStride: 3,
        segmentFactor: 0.75,
        leafStride: 2,
        leafScale: 1.25,
      },
    },
    {
      distance: 250,
      hysteresis: 0.05,
      detail: {
        sectionStride: 6,
        segmentFactor: 0.4,
        leafStride: 2,
        leafScale: 1.3,
        billboard: Billboard.Single,
      },
    },
  ];

  /**
   * Generate a new tree
   */
  generate() {
    this.#clearLOD();
    this.#generateSkeleton();

    const buffers = this.#meshSkeleton();
    this.branches = buffers.branches;
    this.leaves = buffers.leaves;

    this.createBranchesGeometry();
    this.createLeavesGeometry();
    this.createTrellis();
  }

  /**
   * Generates the tree as a set of levels of detail hosted in a THREE.LOD
   * object inside this group.
   * @param {LODLevel[]} levels Level descriptors, in any order
   */
  generateLODs(levels = Tree.defaultLODLevels) {
    this.#clearLOD();
    this.#generateSkeleton();

    const barkMaterial = this.#createBarkMaterial();
    const leafMaterial = this.#createLeafMaterial();

    this.lod = new THREE.LOD();
    this.lod.name = 'TreeLOD';

    const ordered = [...levels].sort(
      (a, b) => (a.distance ?? 0) - (b.distance ?? 0),
    );

    ordered.forEach((level, index) => {
      const buffers = this.#meshSkeleton(level.detail ?? {});

      let branchesMesh, leavesMesh;
      if (index === 0) {
        this.branches = buffers.branches;
        this.leaves = buffers.leaves;
        branchesMesh = this.branchesMesh;
        leavesMesh = this.leavesMesh;
        branchesMesh.geometry.dispose();
        branchesMesh.material.dispose();
        leavesMesh.geometry.dispose();
        leavesMesh.material.dispose();
      } else {
        branchesMesh = new THREE.Mesh();
        leavesMesh = new THREE.Mesh();
      }

      branchesMesh.geometry = this.#buildBufferGeometry(buffers.branches);
      branchesMesh.material = barkMaterial;
      leavesMesh.geometry = this.#buildBufferGeometry(buffers.leaves);
      leavesMesh.material = leafMaterial;

      for (const mesh of [branchesMesh, leavesMesh]) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }

      const group = new THREE.Group();
      group.add(branchesMesh, leavesMesh);
      this.lod.addLevel(group, level.distance ?? 0, level.hysteresis ?? 0);
    });

    this.add(this.lod);
    this.createTrellis();
  }

  /**
   * Builds branch and leaf geometry at the given detail level without
   * modifying the tree's own meshes.
   * @param {LODDetail} detail
   * @returns {{ branches: THREE.BufferGeometry, leaves: THREE.BufferGeometry }}
   */
  createGeometry(detail = {}) {
    if (!this.skeleton) {
      this.#generateSkeleton();
    }
    const buffers = this.#meshSkeleton(detail);
    return {
      branches: this.#buildBufferGeometry(buffers.branches),
      leaves: this.#buildBufferGeometry(buffers.leaves),
    };
  }

  /**
   * Tears down any LOD state and restores the flat branches/leaves meshes.
   */
  #clearLOD() {
    if (!this.lod) return;

    this.lod.levels.forEach((level) => {
      for (const mesh of level.object.children) {
        if (mesh === this.branchesMesh || mesh === this.leavesMesh) continue;
        mesh.geometry.dispose();
      }
    });

    this.remove(this.lod);
    this.lod = null;
    this.add(this.branchesMesh, this.leavesMesh);
  }

  /**
   * Grows the tree skeleton: the section frames of every branch and the
   * placement of every leaf.
   */
  #generateSkeleton() {
    this.skeleton = {
      branches: [],
      leaves: [],
    };

    this.rng = new RNG(this.options.seed);

    this.branchQueue.push(
      new Branch(
        new THREE.Vector3(),
        new THREE.Euler(),
        this.options.branch.length[0],
        this.options.branch.radius[0],
        0,
        this.options.branch.sections[0],
        this.options.branch.segments[0],
      ),
    );

    while (this.branchQueue.length > 0) {
      const branch = this.branchQueue.shift();
      this.#growBranch(branch);
    }
  }

  /**
   * Meshes the current skeleton into geometry buffers at the given detail.
   * @param {LODDetail} detail
   */
  #meshSkeleton(detail = {}) {
    const sectionStride = Math.max(1, Math.floor(detail.sectionStride ?? 1));
    const segmentFactor = detail.segmentFactor ?? 1;
    const leafStride = Math.max(1, Math.floor(detail.leafStride ?? 1));
    const leafScale = detail.leafScale ?? 1;
    const billboard = detail.billboard ?? this.options.leaves.billboard;

    const branches = {
      verts: [],
      normals: [],
      indices: [],
      uvs: [],
      windFactor: []
    };

    const leaves = {
      verts: [],
      normals: [],
      indices: [],
      uvs: [],
    };

    for (const skeletonBranch of this.skeleton.branches) {
      this.#meshBranch(branches, skeletonBranch, sectionStride, segmentFactor);
    }

    for (let i = 0; i < this.skeleton.leaves.length; i += leafStride) {
      this.#meshLeaf(leaves, this.skeleton.leaves[i], leafScale, billboard);
    }

    return { branches, leaves };
  }

  /**
   * Grows a branch's skeleton, queueing child branches and recording leaf
   * placements.
   * @param {Branch} branch
   * @returns
   */
  #growBranch(branch) {
    let sectionOrientation = branch.orientation.clone();
    let sectionOrigin = branch.origin.clone();
    let sectionLength =
      branch.length /
      branch.sectionCount /
      (this.options.type === 'Deciduous' ? this.options.branch.levels - 1 : 1);

    let sections = [];

    for (let i = 0; i <= branch.sectionCount; i++) {
      let sectionRadius = branch.radius;

      if (
        i === branch.sectionCount &&
        branch.level === this.options.branch.levels
      ) {
        sectionRadius = 0.001;
      } else if (this.options.type === TreeType.Deciduous) {
        sectionRadius *=
          1 - this.options.branch.taper[branch.level] * (i / branch.sectionCount);
      } else if (this.options.type === TreeType.Evergreen) {
        sectionRadius *= 1 - (i / branch.sectionCount);
      }

      sections.push({
        origin: sectionOrigin.clone(),
        orientation: sectionOrientation.clone(),
        radius: sectionRadius,
      });

      sectionOrigin.add(
        new THREE.Vector3(0, sectionLength, 0).applyEuler(sectionOrientation),
      );

      const gnarliness =
        Math.max(1, 1 / Math.sqrt(sectionRadius)) *
        this.options.branch.gnarliness[branch.level];

      sectionOrientation.x += this.rng.random(gnarliness, -gnarliness);
      sectionOrientation.z += this.rng.random(gnarliness, -gnarliness);

      const qSection = new THREE.Quaternion().setFromEuler(sectionOrientation);

      const qTwist = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        this.options.branch.twist[branch.level],
      );

      qSection.multiply(qTwist);

      const sectionUp = new THREE.Vector3(0, 1, 0).applyQuaternion(qSection);
      const target = new THREE.Vector3()
        .copy(this.options.branch.force.direction)
        .normalize();
      const axis = new THREE.Vector3().crossVectors(sectionUp, target);
      const sinFull = axis.length();
      if (sinFull > 1e-6) {
        axis.divideScalar(sinFull);
        const fullAngle = Math.atan2(sinFull, sectionUp.dot(target));
        const step = this.options.branch.force.strength / sectionRadius;
        const clamped = Math.max(-fullAngle, Math.min(fullAngle, step));
        qSection.premultiply(
          new THREE.Quaternion().setFromAxisAngle(axis, clamped),
        );
      }

      if (this.options.trellis.enabled) {
        const trellisResult = this.calculateTrellisForce(sectionOrigin, sectionRadius);
        if (trellisResult) {
          const qTrellis = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            trellisResult.direction,
          );
          qSection.rotateTowards(qTrellis, trellisResult.strength);
        }
      }

      sectionOrientation.setFromQuaternion(qSection);
    }

    this.skeleton.branches.push({
      sections,
      segmentCount: branch.segmentCount,
      baseRadius: branch.radius,
    });

    if (this.options.type === 'deciduous') {
      const lastSection = sections[sections.length - 1];

      if (branch.level < this.options.branch.levels) {
        this.branchQueue.push(
          new Branch(
            lastSection.origin,
            lastSection.orientation,
            this.options.branch.length[branch.level + 1],
            lastSection.radius,
            branch.level + 1,
            branch.sectionCount,
            branch.segmentCount,
          ),
        );
      } else {
        this.#recordLeaf(lastSection.origin, lastSection.orientation);
      }
    }

    if (branch.level === this.options.branch.levels) {
      this.generateLeaves(sections);
    } else if (branch.level < this.options.branch.levels) {
      this.generateChildBranches(
        this.options.branch.children[branch.level],
        branch.level + 1,
        sections);
    }
  }

  /**
   * Generate branches from a parent branch
   * @param {number} count The number of child branches to generate
   * @param {number} level The level of the child branches
   * @param {{
   *  origin: THREE.Vector3,
   *  orientation: THREE.Euler,
   *  radius: number
   * }[]} sections The parent branch's sections
   * @returns
   */
  generateChildBranches(count, level, sections) {
    const radialOffset = this.rng.random();
    const startMin = this.options.branch.start[level];
    const heightStep = (1.0 - startMin) / count;
    const angleSlots = this.shuffledIndices(count);

    for (let i = 0; i < count; i++) {
      let childBranchStart = startMin + (i + this.rng.random()) * heightStep;

      const sectionIndex = Math.floor(childBranchStart * (sections.length - 1));
      let sectionA, sectionB;
      sectionA = sections[sectionIndex];
      if (sectionIndex === sections.length - 1) {
        sectionB = sectionA;
      } else {
        sectionB = sections[sectionIndex + 1];
      }

      const alpha =
        (childBranchStart - sectionIndex / (sections.length - 1)) /
        (1 / (sections.length - 1));

      const childBranchOrigin = new THREE.Vector3().lerpVectors(
        sectionA.origin,
        sectionB.origin,
        alpha,
      );

      const childBranchRadius =
        this.options.branch.radius[level] *
        ((1 - alpha) * sectionA.radius + alpha * sectionB.radius);

      const qA = new THREE.Quaternion().setFromEuler(sectionA.orientation);
      const qB = new THREE.Quaternion().setFromEuler(sectionB.orientation);
      const parentOrientation = new THREE.Euler().setFromQuaternion(
        qB.slerp(qA, alpha),
      );

      const radialJitter = this.rng.random(0.5, -0.5);
      const radialAngle = 2.0 * Math.PI * (radialOffset + (angleSlots[i] + radialJitter) / count);
      const q1 = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        this.options.branch.angle[level] / (180 / Math.PI),
      );
      const q2 = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        radialAngle,
      );
      const q3 = new THREE.Quaternion().setFromEuler(parentOrientation);

      const childBranchOrientation = new THREE.Euler().setFromQuaternion(
        q3.multiply(q2.multiply(q1)),
      );

      let childBranchLength =
        this.options.branch.length[level] *
        (this.options.type === TreeType.Evergreen
          ? 1.0 - childBranchStart
          : 1.0);

      this.branchQueue.push(
        new Branch(
          childBranchOrigin,
          childBranchOrientation,
          childBranchLength,
          childBranchRadius,
          level,
          this.options.branch.sections[level],
          this.options.branch.segments[level],
        ),
      );
    }
  }

  /**
  * Logic for spawning leaves from a parent branch's section
  * @param {{
  *  origin: THREE.Vector3,
  *  orientation: THREE.Euler,
  *  radius: number
  * }[]} sections The parent branch's sections
  * @returns
  */
  generateLeaves(sections) {
    const radialOffset = this.rng.random();
    const count = this.options.leaves.count;
    const startMin = this.options.leaves.start;
    const heightStep = (1.0 - startMin) / count;
    const angleSlots = this.shuffledIndices(count);

    for (let i = 0; i < count; i++) {
      let leafStart = startMin + (i + this.rng.random()) * heightStep;

      const sectionIndex = Math.floor(leafStart * (sections.length - 1));
      let sectionA, sectionB;
      sectionA = sections[sectionIndex];
      if (sectionIndex === sections.length - 1) {
        sectionB = sectionA;
      } else {
        sectionB = sections[sectionIndex + 1];
      }

      const alpha =
        (leafStart - sectionIndex / (sections.length - 1)) /
        (1 / (sections.length - 1));

      const leafOrigin = new THREE.Vector3().lerpVectors(
        sectionA.origin,
        sectionB.origin,
        alpha,
      );

      const qA = new THREE.Quaternion().setFromEuler(sectionA.orientation);
      const qB = new THREE.Quaternion().setFromEuler(sectionB.orientation);
      const parentOrientation = new THREE.Euler().setFromQuaternion(
        qB.slerp(qA, alpha),
      );

      const radialJitter = this.rng.random(0.5, -0.5);
      const radialAngle = 2.0 * Math.PI * (radialOffset + (angleSlots[i] + radialJitter) / count);
      const q1 = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        this.options.leaves.angle / (180 / Math.PI),
      );
      const q2 = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        radialAngle,
      );
      const q3 = new THREE.Quaternion().setFromEuler(parentOrientation);

      const leafOrientation = new THREE.Euler().setFromQuaternion(
        q3.multiply(q2.multiply(q1)),
      );

      this.#recordLeaf(leafOrigin, leafOrientation);
    }
  }

  /**
  * Records a leaf placement in the skeleton. The size variance is sampled
  * here so the meshing passes stay RNG-free.
  * @param {THREE.Vector3} origin The starting point of the leaf
  * @param {THREE.Euler} orientation The orientation of the leaf
  */
  #recordLeaf(origin, orientation) {
    const size =
      this.options.leaves.size *
      (1 +
        this.rng.random(
          this.options.leaves.sizeVariance,
          -this.options.leaves.sizeVariance,
        ));

    this.skeleton.leaves.push({
      origin: origin.clone(),
      orientation: orientation.clone(),
      size,
    });
  }

  /**
  * Emits the quad geometry for one skeleton leaf into the buffers
  * @param {{verts: number[], normals: number[], indices: number[], uvs: number[]}} buffers
  * @param {{origin: THREE.Vector3, orientation: THREE.Euler, size: number}} leaf
  * @param {number} scale Size multiplier for this detail level
  * @param {string} billboard Billboard mode for this detail level
  */
  #meshLeaf(buffers, leaf, scale, billboard) {
    let i = buffers.verts.length / 3;

    const { origin, orientation } = leaf;

    const leafSize = leaf.size * scale;

    const W = leafSize;
    const L = leafSize;

    const createLeaf = (rotation) => {
      const v = [
        new THREE.Vector3(-W / 2, L, 0),
        new THREE.Vector3(-W / 2, 0, 0),
        new THREE.Vector3(W / 2, 0, 0),
        new THREE.Vector3(W / 2, L, 0),
      ].map((v) =>
        v
          .applyEuler(new THREE.Euler(0, rotation, 0))
          .applyEuler(orientation)
          .add(origin),
      );

      buffers.verts.push(
        v[0].x, v[0].y, v[0].z,
        v[1].x, v[1].y, v[1].z,
        v[2].x, v[2].y, v[2].z,
        v[3].x, v[3].y, v[3].z,
      );

      const n = new THREE.Vector3(0, 0, 1).applyEuler(orientation);

      const roundedNormals = this.options.leaves.roundedNormals;
      let n1 = roundedNormals ? new THREE.Vector3().copy(n).add(v[0]).sub(origin).normalize() : n;
      let n2 = roundedNormals ? new THREE.Vector3().copy(n).add(v[1]).sub(origin).normalize() : n;
      let n3 = roundedNormals ? new THREE.Vector3().copy(n).add(v[2]).sub(origin).normalize() : n;
      let n4 = roundedNormals ? new THREE.Vector3().copy(n).add(v[3]).sub(origin).normalize() : n;

      buffers.normals.push(
        n1.x, n1.y, n1.z,
        n2.x, n2.y, n2.z,
        n3.x, n3.y, n3.z,
        n4.x, n4.y, n4.z,
      );
      buffers.uvs.push(0, 1, 0, 0, 1, 0, 1, 1);
      buffers.indices.push(i, i + 1, i + 2, i, i + 2, i + 3);
      i += 4;
    };

    createLeaf(0);
    if (billboard === Billboard.Double) {
      createLeaf(Math.PI / 2);
    }
  }

  /**
   * Fisher-Yates shuffle of [0..count-1] using the tree's RNG so results stay
   * seed-reproducible.
   * @param {number} count
   * @returns {number[]}
   */
  shuffledIndices(count) {
    const arr = Array.from({ length: count }, (_, k) => k);
    for (let k = count - 1; k > 0; k--) {
      const r = Math.floor(this.rng.random() * (k + 1));
      [arr[k], arr[r]] = [arr[r], arr[k]];
    }
    return arr;
  }

  /**
   * Emits the ring geometry and indices for one skeleton branch
   * @param {{verts: number[], normals: number[], indices: number[], uvs: number[]}} buffers
   * @param {{sections: {origin: THREE.Vector3, orientation: THREE.Euler, radius: number}[], segmentCount: number, baseRadius: number}} skeletonBranch
   * @param {number} sectionStride Sample every Nth section ring
   * @param {number} segmentFactor Radial segment multiplier
   */
  #meshBranch(buffers, skeletonBranch, sectionStride, segmentFactor) {
    const { sections, segmentCount, baseRadius } = skeletonBranch;

    const segments = Math.max(3, Math.round(segmentCount * segmentFactor));

    const wrapsX = Math.max(
      1,
      Math.round(baseRadius * this.options.bark.textureScale.x),
    );

    const sampled = [];
    for (let i = 0; i < sections.length; i += sectionStride) {
      sampled.push(sections[i]);
    }
    if ((sections.length - 1) % sectionStride !== 0) {
      sampled.push(sections[sections.length - 1]);
    }

    const indexOffset = buffers.verts.length / 3;

    for (let k = 0; k < sampled.length; k++) {
      const section = sampled[k];

      let first;
      for (let j = 0; j < segments; j++) {
        let angle = (2.0 * Math.PI * j) / segments;

        const vertex = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle))
          .multiplyScalar(section.radius)
          .applyEuler(section.orientation)
          .add(section.origin);

        const normal = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle))
          .applyEuler(section.orientation)
          .normalize();

        const uv = new THREE.Vector2(
          (j / segments) * wrapsX,
          (k % 2 === 0) ? 0 : 1,
        );

        buffers.verts.push(...Object.values(vertex));
        buffers.normals.push(...Object.values(normal));
        buffers.uvs.push(...Object.values(uv));

        if (j === 0) {
          first = { vertex, normal, uv };
        }
      }

      buffers.verts.push(...Object.values(first.vertex));
      buffers.normals.push(...Object.values(first.normal));
      buffers.uvs.push(wrapsX, first.uv.y);
    }

    let v1, v2, v3, v4;
    const N = segments + 1;
    for (let i = 0; i < sampled.length - 1; i++) {
      for (let j = 0; j < segments; j++) {
        v1 = indexOffset + i * N + j;
        v2 = indexOffset + i * N + (j + 1);
        v3 = v1 + N;
        v4 = v2 + N;
        buffers.indices.push(v1, v3, v2, v2, v3, v4);
      }
    }
  }

  /**
   * Builds a BufferGeometry from raw attribute buffers
   * @param {{verts: number[], normals: number[], indices: number[], uvs: number[]}} buffers
   * @returns {THREE.BufferGeometry}
   */
  #buildBufferGeometry(buffers) {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(buffers.verts), 3),
    );
    g.setAttribute(
      'normal',
      new THREE.BufferAttribute(new Float32Array(buffers.normals), 3),
    );
    g.setAttribute(
      'uv',
      new THREE.BufferAttribute(new Float32Array(buffers.uvs), 2),
    );
    g.setIndex(
      new THREE.BufferAttribute(new Uint16Array(buffers.indices), 1),
    );
    g.computeBoundingSphere();
    return g;
  }

  /**
   * Creates the bark material from the current options. Chagra vendor:
   * SIEMPRE plano (color liso) — este vendor no aplica mapas de textura
   * (ver cabecera del archivo). El original ramificaba en `bark.textured`
   * para asignar color/ao/normal/roughness maps; se recortó porque
   * `options.js` fija `textured:false` siempre en este vendor.
   * @returns {THREE.MeshStandardMaterial}
   */
  #createBarkMaterial() {
    return new THREE.MeshStandardMaterial({
      name: 'branches',
      flatShading: this.options.bark.flatShading,
      color: new THREE.Color(this.options.bark.tint),
      metalness: 0.0,
      roughness: 1.0,
    });
  }

  /**
   * Generates the geometry for the branches
   */
  createBranchesGeometry() {
    this.branchesMesh.geometry.dispose();
    this.branchesMesh.geometry = this.#buildBufferGeometry(this.branches);
    this.branchesMesh.material.dispose();
    this.branchesMesh.material = this.#createBarkMaterial();
    this.branchesMesh.castShadow = true;
    this.branchesMesh.receiveShadow = true;
  }

  /**
   * Creates the leaf material, including the wind sway vertex shader, from
   * the current options. Chagra vendor: `leaves.map` es siempre null →
   * hoja = quad tintado plano (sin textura de hoja foto). El shader de
   * viento (simplex noise + sway) se conserva íntegro: es geometría/anim,
   * no depende de texturas.
   * @returns {THREE.MeshStandardMaterial}
   */
  #createLeafMaterial() {
    const mat = new THREE.MeshStandardMaterial({
      name: 'leaves',
      map: this.options.leaves.map ?? null,
      color: new THREE.Color(this.options.leaves.tint),
      side: THREE.DoubleSide,
      alphaTest: this.options.leaves.alphaTest,
      metalness: 0.0,
      roughness: 1.0,
      dithering: true
    });

    // Add custom shader code for branch swaying
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uWindStrength = { value: new THREE.Vector3(0.5, 0, 0.5) };
      shader.uniforms.uWindFrequency = { value: 0.5 };
      shader.uniforms.uWindScale = { value: 70 };
      shader.uniforms.uCustomNormals = { value: this.options.leaves.roundedNormals };

      shader.vertexShader = `
        uniform float uTime;
        uniform vec3 uWindStrength;
        uniform float uWindFrequency;
        uniform float uWindScale;
        ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace(
        `void main() {`,
        `
        // GLSL Simplex Noise 3D
        // Source: https://github.com/ashima/webgl-noise

        vec3 mod289(vec3 x) {
            return x - floor(x * (1.0 / 289.0)) * 289.0;
        }

        vec4 mod289(vec4 x) {
            return x - floor(x * (1.0 / 289.0)) * 289.0;
        }

        vec4 permute(vec4 x) {
            return mod289(((x*34.0)+1.0)*x);
        }

        vec4 taylorInvSqrt(vec4 r) {
            return 1.79284291400159 - 0.85373472095314 * r;
        }

        vec3 fade(vec3 t) {
            return t*t*t*(t*(t*6.0-15.0)+10.0);
        }

        // Classic Simplex Noise 3D
        float simplex3(vec3 v) {
            const vec2  C = vec2(1.0/6.0, 1.0/3.0);
            const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

            // First corner
            vec3 i  = floor(v + dot(v, C.yyy) );
            vec3 x0 = v - i + dot(i, C.xxx);

            // Other corners
            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min( g.xyz, l.zxy );
            vec3 i2 = max( g.xyz, l.zxy );

            //  x0 = x0 - 0. + 0.0 * C
            vec3 x1 = x0 - i1 + C.xxx;
            vec3 x2 = x0 - i2 + C.yyy; // 2.0 * C.x = 1/3 = C.y
            vec3 x3 = x0 - D.yyy;      // -1.0 + 3.0 * C.x = -0.5

            // Permutations
            i = mod289(i);
            vec4 p = permute( permute( permute(
                        i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                      + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                      + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

            // Gradients: 7x7 points over a square, mapped onto an octahedron.
            // The ring size 17*17 = 289 is close to the mapping's singularity.
            float n_ = 0.142857142857; // 1.0/7.0
            vec3  ns = n_ * D.wyz - D.xzx;

            vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

            vec4 x = x_ *ns.x + ns.yyyy;
            vec4 y = y_ *ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);

            vec4 b0 = vec4( x.xy, y.xy );
            vec4 b1 = vec4( x.zw, y.zw );

            vec4 s0 = floor(b0)*2.0 + 1.0;
            vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));

            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
            vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

            vec3 g0 = vec3(a0.xy,h.x);
            vec3 g1 = vec3(a0.zw,h.y);
            vec3 g2 = vec3(a1.xy,h.z);
            vec3 g3 = vec3(a1.zw,h.w);

            // Normalise gradients
            vec4 norm = taylorInvSqrt(vec4(dot(g0,g0), dot(g1,g1), dot(g2,g2), dot(g3,g3)));
            g0 *= norm.x;
            g1 *= norm.y;
            g2 *= norm.z;
            g3 *= norm.w;

            // Mix contributions from the four corners
            vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
            m = m * m;
            return 42.0 * dot( m*m, vec4( dot(g0,x0), dot(g1,x1),
                                          dot(g2,x2), dot(g3,x3) ) );
        }

        void main() {`,
      );

      shader.vertexShader = shader.vertexShader.replace(
        `#include <project_vertex>`,
        `
        vec4 mvPosition = vec4(transformed, 1.0);

        float windOffset = 2.0 * 3.14 * simplex3(mvPosition.xyz / uWindScale);
        vec3 windSway = uv.y * uWindStrength * (
          0.5 * sin(uTime * uWindFrequency + windOffset) +
          0.3 * sin(2.0 * uTime * uWindFrequency + 1.3 * windOffset) +
          0.2 * sin(5.0 * uTime * uWindFrequency + 1.5 * windOffset)
        );
        mvPosition.xyz += windSway;

        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;
        `
      );

      // Skip the backface normal flip in normal_fragment_begin when using custom normals
      shader.fragmentShader = `uniform bool uCustomNormals;\n` + shader.fragmentShader.replace(
        '#include <normal_fragment_begin>',
        THREE.ShaderChunk.normal_fragment_begin.replace(
          'normal *= faceDirection;',
          'if (!uCustomNormals) { normal *= faceDirection; }'
        )
      );

      Object.defineProperty(mat.userData, 'shader', {
        value: shader,
        configurable: true,
        enumerable: false,
      });
    };

    return mat;
  }

  /**
   * Generates the geometry for the leaves
   */
  createLeavesGeometry() {
    this.leavesMesh.geometry.dispose();
    this.leavesMesh.geometry = this.#buildBufferGeometry(this.leaves);
    this.leavesMesh.material.dispose();
    this.leavesMesh.material = this.#createLeafMaterial();
    this.leavesMesh.castShadow = true;
    this.leavesMesh.receiveShadow = true;
  }

  /**
   * Create or update the trellis geometry
   */
  createTrellis() {
    if (this.trellisMesh) {
      this.remove(this.trellisMesh);
      this.trellisMesh.dispose();
      this.trellisMesh = null;
    }

    if (this.options.trellis.enabled && this.options.trellis.visible) {
      this.trellisMesh = new Trellis(this.options.trellis);
      this.trellisMesh.generate();
      this.add(this.trellisMesh);
    }
  }

  /**
   * Find the nearest point on the trellis grid to a given position
   * @param {THREE.Vector3} position
   * @returns {THREE.Vector3}
   */
  getNearestTrellisPoint(position) {
    const t = this.options.trellis;
    const trellisX = t.position.x;
    const trellisY = t.position.y;
    const trellisZ = t.position.z;

    const minX = trellisX - t.width / 2;
    const maxX = trellisX + t.width / 2;
    const minY = trellisY;
    const maxY = trellisY + t.height;

    const clampedX = Math.max(minX, Math.min(maxX, position.x));
    const clampedY = Math.max(minY, Math.min(maxY, position.y));

    const nearestHLineY = Math.round((clampedY - minY) / t.spacing) * t.spacing + minY;
    const finalHLineY = Math.max(minY, Math.min(maxY, nearestHLineY));

    const nearestVLineX = Math.round((clampedX - minX) / t.spacing) * t.spacing + minX;
    const finalVLineX = Math.max(minX, Math.min(maxX, nearestVLineX));

    const pointOnHLine = new THREE.Vector3(clampedX, finalHLineY, trellisZ);
    const pointOnVLine = new THREE.Vector3(finalVLineX, clampedY, trellisZ);

    const distH = position.distanceTo(pointOnHLine);
    const distV = position.distanceTo(pointOnVLine);

    return distH < distV ? pointOnHLine : pointOnVLine;
  }

  /**
   * Calculate the force vector toward the nearest trellis point
   * @param {THREE.Vector3} position Current section position
   * @param {number} radius Current section radius
   * @returns {{ direction: THREE.Vector3, strength: number } | null}
   */
  calculateTrellisForce(position, radius) {
    const trellis = this.options.trellis;
    const nearestPoint = this.getNearestTrellisPoint(position);

    const distance = position.distanceTo(nearestPoint);

    if (distance > trellis.force.maxDistance) return null;
    if (distance < 0.001) return null;

    const direction = new THREE.Vector3()
      .subVectors(nearestPoint, position)
      .normalize();

    const distanceFactor = 1 - Math.pow(
      distance / trellis.force.maxDistance,
      trellis.force.falloff,
    );
    const strength = trellis.force.strength * distanceFactor / radius;

    return { direction, strength };
  }

  get vertexCount() {
    return (this.branches.verts.length + this.leaves.verts.length) / 3;
  }

  get triangleCount() {
    return (this.branches.indices.length + this.leaves.indices.length) / 3;
  }
}
