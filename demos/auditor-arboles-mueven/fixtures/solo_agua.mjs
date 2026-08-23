import * as THREE from 'three';

export function crearOlas(agua) {
  const geo = agua.geometry;
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const baseY = pos.getY(i);
    const ola = Math.sin(pos.getX(i) * 0.6 + baseY) * Math.cos(pos.getZ(i) * 0.4);
    pos.setY(i, baseY + ola * 0.2);
  }
}

export function animarOlas(agua, clock) {
  const t = clock.getElapsedTime();
  const pos = agua.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = Math.sin(pos.getX(i) * 0.8 + t) * 0.15;
    pos.setY(i, pos.getY(i) + y);
  }
}
