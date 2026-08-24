import * as THREE from 'three';
import { createQuadrupedActor, createQuadrupedRig } from './quadrupedRig.js';

export const OSO_RIGGED_PALETTE = {
  body: new THREE.MeshStandardMaterial({ color: '#241a13', roughness: 0.95, metalness: 0, flatShading: true }),
  bodyShadow: new THREE.MeshStandardMaterial({ color: '#14100b', roughness: 0.97, flatShading: true }),
  belly: new THREE.MeshStandardMaterial({ color: '#3b2c1e', roughness: 0.94, flatShading: true }),
  muzzle: new THREE.MeshStandardMaterial({ color: '#a9865f', roughness: 0.92, flatShading: true }),
  paw: new THREE.MeshStandardMaterial({ color: '#0f0b08', roughness: 0.96, flatShading: true }),
  nose: new THREE.MeshStandardMaterial({ color: '#0a0705', roughness: 0.62, flatShading: true }),
  eye: new THREE.MeshStandardMaterial({ color: '#0e0806', roughness: 0.42 }),
  marking: new THREE.MeshStandardMaterial({ color: '#3b2c1e', roughness: 0.95, flatShading: true }),
  antifaz: new THREE.MeshStandardMaterial({ color: '#e7d7ae', roughness: 0.9, flatShading: true }),
};

export function createOsoRiggedRig() {
  return createQuadrupedRig({
    kind: 'oso',
    palette: OSO_RIGGED_PALETTE,
    scale: 1.14,
    legThickness: 1.32,
    bodyScale: [1.08, 1.04, 1.12],
    snoutScale: 0.72,
    walkAmplitude: 0.44,
    idleBob: 0.016,
    tailAmplitude: 0.08,
    markings: 'oso',
  });
}

export function createOsoRiggedActor(opts = {}) {
  return createQuadrupedActor({
    kind: 'oso',
    palette: OSO_RIGGED_PALETTE,
    scale: 1.14,
    legThickness: 1.32,
    bodyScale: [1.08, 1.04, 1.12],
    snoutScale: 0.72,
    walkAmplitude: 0.44,
    idleBob: 0.016,
    tailAmplitude: 0.08,
    markings: 'oso',
  }, opts);
}

export default createOsoRiggedActor;
