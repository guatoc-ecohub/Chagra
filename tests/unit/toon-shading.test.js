import {
  BackSide,
  BoxGeometry,
  DataTexture,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
} from 'three';
import {
  createGradientMap,
  createToonMaterial,
  createToonOutline,
} from '../../lib3d/fx/toonShading.js';

describe('toon shading del valle', () => {
  it('crea un mapa de bandas nearest para MeshToonMaterial', () => {
    const gradient = createGradientMap([0.8, 0.2, 0.5]);

    expect(gradient).toBeInstanceOf(DataTexture);
    expect(gradient.image.width).toBe(3);
    expect(gradient.magFilter).toBe(NearestFilter);
    expect(gradient.minFilter).toBe(NearestFilter);
    expect(Array.from(gradient.image.data.filter((_, index) => index % 4 === 0)))
      .toEqual([51, 128, 204]);
  });

  it('instancia un MeshToonMaterial con rim light configurable', () => {
    const material = createToonMaterial({
      color: 0xc98291,
      rim: { color: 0xffd8e3, strength: 0.5, power: 3 },
    });
    const shader = {
      uniforms: {},
      fragmentShader: `uniform float opacity;
vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;`,
    };

    expect(material).toBeInstanceOf(MeshToonMaterial);
    expect(material.gradientMap).toBeInstanceOf(DataTexture);
    material.onBeforeCompile(shader);
    expect(shader.uniforms.toonRimStrength.value).toBe(0.5);
    expect(shader.uniforms.toonRimPower.value).toBe(3);
    expect(shader.fragmentShader).toContain('toonRimColor');
    expect(shader.fragmentShader).toContain('toonRimFacing');
  });

  it('añade un outline back-face reutilizando la geometría de la malla', () => {
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), createToonMaterial({ rim: false }));
    const outline = createToonOutline(mesh, { thickness: 0.04 });

    expect(outline).toBeInstanceOf(Mesh);
    expect(outline.geometry).toBe(mesh.geometry);
    expect(outline.material).toBeInstanceOf(MeshBasicMaterial);
    expect(outline.material.side).toBe(BackSide);
    expect(outline.scale.x).toBeCloseTo(1.04);
    expect(mesh.children).toContain(outline);
  });
});
