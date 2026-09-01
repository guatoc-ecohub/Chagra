// ── pilotos-trazado.js — puente del SVG trazado-riggeado al kart ────────────
// El motor de personajes es Three.js y el arte fuente es SVG. Este adaptador
// conserva el SVG completo (calco + clip-regiones) dentro de una textura
// transparente, montada en la misma ancla y con el mismo contrato de pose que
// el piloto 3D. El dibujo no se vuelve a pintar ni se reduce a una paleta.

import { PIEL_TRAZADOS } from './piel-rigs.js';

const CONFIG = {
  jaguar: { alto: 0.73 },
  oso: { alto: 0.78 },
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function tienePilotoTrazado(tipo) {
  return !!CONFIG[tipo] && !!PIEL_TRAZADOS?.[tipo]?.svg;
}

function anclaDe(THREE, veh) {
  const ud = veh.userData ?? {};
  const ancla = ud.anclaPiloto;
  if (ancla?.isObject3D) return { padre: ancla, escala: ancla.userData?.escala ?? 0.75 };
  if (ancla?.pos) {
    const padre = new THREE.Object3D();
    padre.position.copy(ancla.pos);
    padre.rotation.y = ancla.rotY ?? Math.PI / 2;
    (ud.chasis ?? veh).add(padre);
    return { padre, escala: ancla.escala ?? 0.75 };
  }
  return { padre: ud.chasis ?? veh, escala: 0.75 };
}

function texturaSVG(THREE, svg, onReady) {
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    // WebGL/ANGLE rechaza algunas SVGImageElement complejas (clipPath + use)
    // en texSubImage2D aunque Chromium sí pueda mostrarlas en una <img>.
    // Rasterizar aquí conserva el SVG como fuente y sube a GPU un canvas
    // ordinario, el mismo camino que ya usa piloto-lamina.js.
    const ratio = (img.naturalWidth || 1) / (img.naturalHeight || 1);
    const ancho = 1536;
    const alto = Math.max(1, Math.round(ancho / ratio));
    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;
    canvas.getContext('2d').drawImage(img, 0, 0, ancho, alto);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace ?? texture.colorSpace;
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    onReady(texture);
  };
  img.onerror = (error) => {
    URL.revokeObjectURL(url);
    console.warn('[pilotos-trazado] no cargó el SVG trazado:', error?.message ?? error);
  };
  img.src = url;
}

/**
 * Monta el fotograma compuesto del rig trazado como un piloto del kart.
 * Devuelve el mismo mínimo contrato que consume modelos.js: grupo + actualizar.
 */
export function montarPilotoTrazado(THREE, veh, { tipo } = {}) {
  if (!tienePilotoTrazado(tipo)) return null;
  const cfg = CONFIG[tipo];
  const fuente = PIEL_TRAZADOS[tipo].svg;
  const { padre, escala: escalaAncla } = anclaDe(THREE, veh);
  const escalaRel = escalaAncla / 0.75;

  // Las cajas de los dos SVG ya vienen con viewBox de lámina. La textura queda
  // en un plano vertical y el callback vive en el Mesh, porque Three no llama
  // onBeforeRender a un Object3D desnudo.
  const mView = fuente.match(/viewBox="([^"]+)"/);
  const vb = (mView?.[1] ?? '0 0 1 1').trim().split(/\s+/).map(Number);
  const ratio = (vb[2] || 1) / (vb[3] || 1);
  const alto = cfg.alto * escalaRel;
  const ancho = alto * ratio;
  const pivote = new THREE.Object3D();
  pivote.name = `pilotoTrazado-${tipo}`;
  const raiz = new THREE.Object3D();
  raiz.name = `pilotoTrazado-raiz-${tipo}`;
  const busto = new THREE.Object3D();
  busto.name = `pilotoTrazado-busto-${tipo}`;
  pivote.add(raiz);
  raiz.add(busto);
  padre.add(pivote);

  const asomo = { chiva: { x: 0.05, y: 0.82 }, carretilla: { x: 0, y: 0.02 },
    moto: { x: 0, y: 0.05 }, skate: { x: 0, y: 0.03 }, suv: { x: -0.18, y: 0.58 },
    pickup: { x: -0.06, y: 0.26 }, volqueta: { x: 0.02, y: 0.26 }, coupe: { x: -0.04, y: 0.20 } };
  const ajuste = asomo[veh.userData?.id] ?? { x: 0, y: 0.22 };
  pivote.position.set(ajuste.x, ajuste.y, 0);
  busto.position.set(0, alto * 0.5 - 0.06 * escalaRel, 0);

  const geo = new THREE.PlaneGeometry(ancho, alto, 1, 6);
  const mat = new THREE.MeshBasicMaterial({
    transparent: true, alphaTest: 0.22, depthWrite: true,
    side: THREE.DoubleSide, forceSinglePass: true, fog: true, toneMapped: true,
  });
  const malla = new THREE.Mesh(geo, mat);
  malla.name = `pilotoTrazado-malla-${tipo}`;
  malla.renderOrder = 2;
  busto.add(malla);

  // Sombra de contacto: el SVG conserva los detalles de la lámina, esta
  // elipse evita que el piloto parezca un recorte flotando sobre el vehículo.
  const sombra = new THREE.Mesh(
    new THREE.CircleGeometry(ancho * 0.36, 20),
    new THREE.MeshBasicMaterial({ color: 0x0a0806, transparent: true, opacity: 0.34, depthWrite: false, fog: true }),
  );
  sombra.rotation.x = -Math.PI / 2;
  sombra.position.set(0, -alto * 0.5 + 0.02, 0);
  sombra.renderOrder = 1;
  padre.add(sombra);

  const world = new THREE.Vector3();
  const cameraWorld = new THREE.Vector3();
  const inherited = new THREE.Quaternion();
  const facing = new THREE.Quaternion();
  const yAxis = new THREE.Vector3(0, 1, 0);
  let frame = -1;
  malla.onBeforeRender = (renderer, scene, camera) => {
    const current = renderer.info.render.frame;
    if (current === frame) return;
    frame = current;
    pivote.getWorldPosition(world);
    camera.getWorldPosition(cameraWorld);
    facing.setFromAxisAngle(yAxis, Math.atan2(cameraWorld.x - world.x, cameraWorld.z - world.z));
    if (pivote.parent) {
      pivote.parent.getWorldQuaternion(inherited);
      pivote.quaternion.copy(inherited.invert()).multiply(facing);
    } else pivote.quaternion.copy(facing);
    pivote.updateMatrixWorld(true);
  };

  texturaSVG(THREE, fuente, (texture) => {
    mat.map = texture;
    mat.needsUpdate = true;
    malla.visible = true;
    pivote.userData.trazadoListo = true;
  });

  const E = { tPrev: -1, inclina: 0, hunde: 0, rebote: 0 };
  const actualizar = (pose = {}) => {
    const t = pose.t ?? performance.now() / 1000;
    const dt = E.tPrev < 0 ? 1 / 60 : clamp(t - E.tPrev, 1 / 240, 0.05);
    E.tPrev = t;
    const giro = clamp(pose.giro ?? 0, -1, 1);
    const turbo = clamp(pose.turbo ?? 0, 0, 1);
    const salto = clamp(pose.salto ?? 0, 0, 1);
    const vel = clamp(pose.velocidad ?? 0, 0, 1);
    E.inclina += (giro * 0.30 - E.inclina) * (1 - Math.exp(-dt * 10));
    E.hunde += (turbo * 0.055 - salto * 0.045 - E.hunde) * (1 - Math.exp(-dt * 10));
    const respira = Math.sin(t * (2.2 + vel * 0.8)) * 0.008;
    raiz.rotation.z = E.inclina;
    raiz.scale.set(1 + E.hunde * 0.45, 1 - E.hunde * 0.7, 1);
    busto.position.y = alto * 0.5 - 0.06 * escalaRel + respira - E.hunde * escalaRel;
    sombra.material.opacity = clamp(0.34 - salto * 0.20, 0.08, 0.38);
    sombra.scale.setScalar(1 + E.hunde * 0.8);
  };

  malla.visible = false;
  actualizar({ t: performance.now() / 1000 });
  const api = { grupo: pivote, malla, material: mat, actualizar, tipo, esTrazado: true, sombra };
  pivote.userData.trazado = api;
  if (typeof location !== 'undefined' && location.search.includes('debug')) {
    globalThis.__trazadosKart ??= [];
    globalThis.__trazadosKart.push({ tipo, pivote, malla, mat });
  }
  return api;
}
