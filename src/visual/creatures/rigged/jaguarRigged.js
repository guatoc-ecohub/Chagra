import * as THREE from 'three';
import { createQuadrupedActor, createQuadrupedRig } from './quadrupedRig.js';

export const JAGUAR_RIGGED_PALETTE = {
  body: new THREE.MeshStandardMaterial({ color: '#b87931', roughness: 0.82, metalness: 0.02, flatShading: true }),
  bodyShadow: new THREE.MeshStandardMaterial({ color: '#5c351c', roughness: 0.9, flatShading: true }),
  belly: new THREE.MeshStandardMaterial({ color: '#d8b36a', roughness: 0.88, flatShading: true }),
  muzzle: new THREE.MeshStandardMaterial({ color: '#e1bf7b', roughness: 0.9, flatShading: true }),
  paw: new THREE.MeshStandardMaterial({ color: '#342014', roughness: 0.92, flatShading: true }),
  nose: new THREE.MeshStandardMaterial({ color: '#16100d', roughness: 0.65, flatShading: true }),
  eye: new THREE.MeshStandardMaterial({ color: '#f5c85a', emissive: '#5c2f08', emissiveIntensity: 0.35, roughness: 0.35 }),
  marking: new THREE.MeshStandardMaterial({ color: '#2c170d', roughness: 0.95, flatShading: true }),
};

export function createJaguarRiggedRig() {
  return createQuadrupedRig({
    kind: 'jaguar',
    palette: JAGUAR_RIGGED_PALETTE,
    scale: 1,
    walkAmplitude: 0.62,
    idleBob: 0.02,
    tailAmplitude: 0.24,
    markings: 'jaguar',
  });
}

export function createJaguarRiggedActor(opts = {}) {
  return createQuadrupedActor({
    kind: 'jaguar',
    palette: JAGUAR_RIGGED_PALETTE,
    scale: 1,
    walkAmplitude: 0.62,
    idleBob: 0.02,
    tailAmplitude: 0.24,
    markings: 'jaguar',
  }, opts);
}

export default createJaguarRiggedActor;
