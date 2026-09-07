import { MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import {
  crearNieblaDeAltura,
  crearNubesVolumetricas,
} from '../../lib3d/fx/nubesVolumetricas.js';

function snapshotLayer(seed) {
  const layer = crearNubesVolumetricas({ count: 4, seed, pixelRatio: 1 });
  return {
    positions: [...layer.points.geometry.getAttribute('position').array],
    sizes: [...layer.points.geometry.getAttribute('aSize').array],
    seeds: [...layer.points.geometry.getAttribute('aSeed').array],
  };
}

describe('nubes volumétricas portables', () => {
  it('siembra billboards deterministas en una sola nube de puntos', () => {
    const a = snapshotLayer(33);
    const b = snapshotLayer(33);
    const c = snapshotLayer(34);

    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect(a.positions).toHaveLength(12);
  });

  it('actualiza viento e intensidad sin recrear geometría', () => {
    const layer = crearNubesVolumetricas({ count: 2, densidad: 0.3 });
    const geometry = layer.points.geometry;

    expect(layer.update(1.25)).toBeCloseTo(1.25);
    expect(layer.uniforms.uTime.value).toBeCloseTo(1.25);
    layer.setIntensity(2).setWind(-0.4, 0.2);

    expect(layer.uniforms.uDensity.value).toBe(1);
    expect(layer.uniforms.uWind.value.x).toBeCloseTo(-0.4);
    expect(layer.points.geometry).toBe(geometry);
    layer.dispose();
    expect(layer.group.children).toHaveLength(0);
  });
});

describe('niebla de altura', () => {
  it('inyecta y puede retirar el parche de material built-in', () => {
    const material = new MeshStandardMaterial({ color: '#6e897d' });
    const fog = crearNieblaDeAltura({ alturaBase: 2, alturaMax: 12, densidad: 0.6 });
    const original = material.onBeforeCompile;
    const remove = fog.applyTo(material);
    const shader = {
      uniforms: {},
      vertexShader: '#include <common>\n#include <project_vertex>',
      fragmentShader: '#include <common>\n#include <opaque_fragment>',
    };

    material.onBeforeCompile(shader, {});

    expect(shader.uniforms.uHeightFogBase).toBe(fog.uniforms.uHeightFogBase);
    expect(shader.vertexShader).toContain('vHeightFogWorldY');
    expect(shader.fragmentShader).toContain('heightFogAmount');
    expect(fog.alturaBase).toBe(2);
    expect(fog.alturaMax).toBe(12);

    remove();
    expect(material.onBeforeCompile).toBe(original);
    material.dispose();
  });
});
