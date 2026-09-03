/**
 * LOD de un mesh con impostor billboard para vegetacion distante.
 *
 * La salida es una instancia de THREE.LOD, por lo que puede agregarse a una
 * escena y dejar que el renderer la actualice automaticamente. El nivel
 * lejano es un THREE.Sprite, que se dibuja como una sola primitiva.
 *
 * Para obtener una silueta fiel, pasa `renderer` y el modulo capturara el
 * mesh en una textura. Tambien acepta `texture` o `textureFactory` para
 * compartir atlas y evitar una captura por instancia.
 */
import * as THREE from 'three';

const DEFAULTS = Object.freeze({
  switchDistance: 36,
  hysteresis: 0.12,
  textureSize: 256,
  alphaTest: 0.08,
  padding: 0.12,
});

const _size = new THREE.Vector3();
const _center = new THREE.Vector3();

function firstMaterial(mesh) {
  if (Array.isArray(mesh.material)) return mesh.material.find(Boolean) || null;
  return mesh.material || null;
}

function materialMap(mesh) {
  const material = firstMaterial(mesh);
  return material?.map?.isTexture ? material.map : null;
}

function colorBytes(mesh) {
  const material = firstMaterial(mesh);
  const color = material?.color?.isColor ? material.color : new THREE.Color(0x6f8f45);
  return new Uint8Array([
    Math.round(color.r * 255),
    Math.round(color.g * 255),
    Math.round(color.b * 255),
    255,
  ]);
}

function solidTexture(mesh) {
  const texture = new THREE.DataTexture(colorBytes(mesh), 1, 1, THREE.RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}

function canvasFromDocument(size) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function imageDataFlipped(pixels, size) {
  const flipped = new Uint8ClampedArray(pixels.length);
  const rowLength = size * 4;
  for (let y = 0; y < size; y += 1) {
    const sourceOffset = y * rowLength;
    const targetOffset = (size - y - 1) * rowLength;
    flipped.set(pixels.subarray(sourceOffset, sourceOffset + rowLength), targetOffset);
  }
  return new ImageData(flipped, size, size);
}

/**
 * Captures a mesh from a stable orthographic front view.
 *
 * The renderer is injected deliberately. This keeps the module compatible
 * with React Three Fiber, vanilla Three.js and headless unit tests without
 * creating a second WebGL context behind the consumer's back.
 */
export function capturarMeshComoTextura(mesh, renderer, options = {}) {
  if (!renderer?.setRenderTarget || !renderer.render || !renderer.readRenderTargetPixels) return null;

  const size = Math.max(16, Math.round(options.textureSize ?? DEFAULTS.textureSize));
  const source = mesh.clone(true);
  source.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(source);
  if (bounds.isEmpty()) return null;

  bounds.getSize(_size);
  bounds.getCenter(_center);
  const span = Math.max(_size.x, _size.y, _size.z, 0.001);
  const padding = Math.max(0, Number(options.padding ?? DEFAULTS.padding));
  const extent = span * (1 + padding * 2);
  const camera = new THREE.OrthographicCamera(-extent / 2, extent / 2, extent / 2, -extent / 2, 0.01, span * 8);
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 1.5));
  const target = new THREE.WebGLRenderTarget(size, size, { depthBuffer: true, stencilBuffer: false });
  const canvas = canvasFromDocument(size);

  if (!canvas) {
    target.dispose();
    return null;
  }

  source.position.sub(_center);
  scene.add(source);
  camera.position.set(0, 0, span * 2.5);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);

  const previousTarget = renderer.getRenderTarget?.() || null;
  const previousClearColor = renderer.getClearColor?.(new THREE.Color());
  const previousClearAlpha = renderer.getClearAlpha?.();
  const pixels = new Uint8Array(size * size * 4);

  try {
    renderer.setRenderTarget(target);
    renderer.setClearColor?.(0x000000, 0);
    renderer.clear?.();
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(target, 0, 0, size, size, pixels);
  } finally {
    renderer.setRenderTarget(previousTarget);
    if (previousClearColor) renderer.setClearColor?.(previousClearColor, previousClearAlpha);
    target.dispose();
  }

  const context = canvas.getContext('2d');
  if (!context) return null;
  context.putImageData(imageDataFlipped(pixels, size), 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function resolveTexture(mesh, options) {
  const provided = options.texture ?? options.impostorTexture;
  if (provided?.isTexture) return { texture: provided, owned: false };

  const factory = options.textureFactory ?? options.createTexture;
  if (typeof factory === 'function') {
    const texture = factory(mesh, options);
    if (texture?.isTexture) return { texture, owned: false };
  }

  const captured = capturarMeshComoTextura(mesh, options.renderer, options);
  if (captured) return { texture: captured, owned: true };

  const sourceMap = materialMap(mesh);
  if (sourceMap) return { texture: sourceMap, owned: false };

  return { texture: solidTexture(mesh), owned: true };
}

function localBounds(mesh, lod) {
  mesh.updateWorldMatrix(true, false);
  lod.updateWorldMatrix(true, false);
  const worldBounds = new THREE.Box3().setFromObject(mesh);
  worldBounds.getCenter(_center);
  return {
    center: lod.worldToLocal(_center.clone()),
    size: worldBounds.getSize(new THREE.Vector3()),
  };
}

function createBillboard(mesh, lod, options, texture) {
  const { center, size } = localBounds(mesh, lod);
  const padding = Math.max(0, Number(options.padding ?? DEFAULTS.padding));
  const width = Math.max(size.x, size.z, 0.001) * (1 + padding * 2);
  const height = Math.max(size.y, width * 0.5, 0.001) * (1 + padding * 2);
  const material = new THREE.SpriteMaterial({
    map: texture,
    alphaTest: options.alphaTest ?? DEFAULTS.alphaTest,
    transparent: true,
    depthWrite: options.depthWrite ?? true,
    depthTest: options.depthTest ?? true,
    fog: options.fog ?? true,
  });
  const billboard = new THREE.Sprite(material);
  billboard.name = `${mesh.name || 'mesh'}-impostor-billboard`;
  billboard.position.copy(center);
  billboard.scale.set(width, height, 1);
  billboard.userData.impostorFor = mesh.uuid;
  return billboard;
}

/**
 * A THREE.LOD with a source mesh at level 0 and a camera-facing sprite at
 * `switchDistance` and beyond.
 */
export class ImpostoresLOD extends THREE.LOD {
  constructor(mesh, options = {}) {
    if (!mesh?.isObject3D) throw new TypeError('ImpostoresLOD requiere un mesh de Three.js');

    super();
    const config = { ...DEFAULTS, ...options };
    const { texture, owned } = resolveTexture(mesh, config);
    const billboard = createBillboard(mesh, this, config, texture);

    this.name = config.name || `${mesh.name || 'mesh'}-impostor-lod`;
    this.source = mesh;
    this.impostor = billboard;
    this.billboard = billboard;
    this.switchDistance = Math.max(0, Number(config.switchDistance));
    this.hysteresis = Math.max(0, Math.min(1, Number(config.hysteresis)));
    this.autoUpdate = config.autoUpdate !== false;
    this.texture = texture;
    this.ownsTexture = owned;

    this.addLevel(mesh, 0);
    this.addLevel(billboard, this.switchDistance, this.hysteresis);
    billboard.visible = false;
    this._impostorTextureOwned = owned;
  }

  get activeLevel() {
    return this.getCurrentLevel();
  }

  get isUsingImpostor() {
    return this.getCurrentLevel() > 0;
  }

  /** Update the level and return the selected render object. */
  update(camera) {
    super.update(camera);
    return this.levels[this.getCurrentLevel()]?.object || null;
  }

  dispose() {
    this.remove(this.impostor);
    this.impostor.material.dispose();
    if (this._impostorTextureOwned) this.texture.dispose();
  }
}

/** Create a reusable LOD wrapper around a mesh. */
export function crearImpostorLOD(mesh, options = {}) {
  return new ImpostoresLOD(mesh, options);
}

export const createImpostorLOD = crearImpostorLOD;
export const IMPOSTORES_LOD_DEFAULTS = DEFAULTS;

export default ImpostoresLOD;
