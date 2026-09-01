// ── ent-frailejon.js — guardián 3D que rescata karts descarriados ───────────
// La silueta es la misma fábrica de frailejones del valle. Este módulo solo
// agrega la lectura de personaje del Ent: cara, brazos, burbuja y estrellas.
// La frase se inyecta desde la configuración de carrera para que el guiño
// opcional no quede fijado en el juego comercial.
import { buildFrailejon } from '../../../../lib3d/flora/frailejonFabrica.js';

const FRASE_COMERCIAL = 'YOU SHALL NOT PASS!';

function material(THREE, color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.78,
    metalness: opts.metalness ?? 0.02,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    depthWrite: opts.depthWrite ?? true,
  });
}

function crearBurbuja(THREE, frase) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,249,219,0.98)';
  ctx.strokeStyle = '#2b2116';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.roundRect(8, 8, canvas.width - 16, 148, 28);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(108, 150);
  ctx.lineTo(72, 188);
  ctx.lineTo(176, 154);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2b2116';
  ctx.font = '900 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const palabras = String(frase || FRASE_COMERCIAL).trim().split(/\s+/);
  const lineas = [];
  let linea = '';
  for (const palabra of palabras) {
    const candidata = linea ? `${linea} ${palabra}` : palabra;
    if (ctx.measureText(candidata).width > 670 && linea) {
      lineas.push(linea);
      linea = palabra;
    } else {
      linea = candidata;
    }
  }
  if (linea) lineas.push(linea);
  const visibles = lineas.slice(0, 2);
  visibles.forEach((texto, i) => ctx.fillText(texto, canvas.width / 2, 61 + i * 42));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  }));
  sprite.scale.set(4.8, 1.2, 1);
  sprite.position.set(0, 4.25, -0.1);
  return sprite;
}

function crearEstrellas(THREE) {
  const grupo = new THREE.Group();
  const mat = material(THREE, 0xffe46b, {
    emissive: 0xffa800,
    emissiveIntensity: 0.65,
    roughness: 0.38,
  });
  const posiciones = [
    [-1.25, 3.12, 0.05], [-0.58, 3.58, 0.16], [0.14, 3.18, 0.08],
    [0.85, 3.55, 0.1], [1.45, 3.06, 0.02],
  ];
  for (const [x, y, z] of posiciones) {
    const estrella = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), mat);
    estrella.position.set(x, y, z);
    grupo.add(estrella);
  }
  return grupo;
}

export function crearEntFrailejonRescatador(THREE, opts = {}) {
  const frase = opts.frase || FRASE_COMERCIAL;
  const grupo = new THREE.Group();
  grupo.name = 'ent-frailejon-rescatador';
  grupo.visible = false;

  // La geometría, especies y LOD vienen de la fábrica compartida de flora.
  const cuerpo = buildFrailejon('grandiflora', opts.seed ?? 20260811);
  cuerpo.name = 'EntFrailejon';
  grupo.add(cuerpo);

  const furia = new THREE.Group();
  furia.name = 'ent-furia';
  const ojoMat = material(THREE, 0xffb22e, { emissive: 0xff4b0b, emissiveIntensity: 0.8, roughness: 0.42 });
  const tinta = material(THREE, 0x24170c, { roughness: 0.95 });
  // El Ent puede ser visto desde la cámara de persecución o desde el costado.
  // Dos frentes delgados mantienen la expresión legible sin convertirla en un
  // billboard: sigue siendo la cara tallada sobre el mismo tronco.
  for (const frente of [-1, 1]) {
    for (const lado of [-1, 1]) {
      const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), ojoMat);
      ojo.position.set(lado * 0.27, 1.82, frente * 0.31);
      furia.add(ojo);
      const ceja = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.075, 0.08), tinta);
      ceja.position.set(lado * 0.27, 2.03, frente * 0.32);
      ceja.rotation.z = lado * -0.36;
      furia.add(ceja);
    }
    const bocaFrente = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.06), tinta);
    bocaFrente.position.set(0, 1.42, frente * 0.32);
    bocaFrente.rotation.z = 0.08;
    furia.add(bocaFrente);
  }
  grupo.add(furia);

  const brazos = new THREE.Group();
  const brazoMat = material(THREE, 0x64472b, { roughness: 0.92 });
  for (const lado of [-1, 1]) {
    const brazo = new THREE.Group();
    const rama = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 1.22, 7), brazoMat);
    rama.position.y = -0.56;
    brazo.add(rama);
    const mano = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), brazoMat);
    mano.position.y = -1.16;
    brazo.add(mano);
    brazo.position.set(lado * 0.76, 2.02, -0.02);
    brazo.rotation.z = lado * -0.82;
    brazos.add(brazo);
  }
  grupo.add(brazos);

  const burbuja = crearBurbuja(THREE, frase);
  grupo.add(burbuja);
  const estrellas = crearEstrellas(THREE);
  grupo.add(estrellas);

  let vivo = 0;
  let baseY = 0;
  let baseX = 0;
  let baseZ = 0;
  let patadaDir = { x: 0, z: 1 };
  let fraseActual = frase;
  let burbujaActual = burbuja;
  let objetivo = { x: 0, y: 0, z: 0 };

  function aparecer(evento = {}) {
    const destino = evento.destino || evento;
    const h = Number.isFinite(destino.hdg) ? destino.hdg : 0;
    const ladoX = -Math.sin(h);
    const ladoZ = Math.cos(h);
    grupo.position.set(
      destino.x + ladoX * 3.6 + Math.cos(h) * 0.8,
      destino.y ?? 0,
      destino.z + ladoZ * 3.6 + Math.sin(h) * 0.8,
    );
    baseX = grupo.position.x;
    baseZ = grupo.position.z;
    const dx = destino.x - baseX;
    const dz = destino.z - baseZ;
    const len = Math.hypot(dx, dz) || 1;
    patadaDir = { x: dx / len, z: dz / len };
    baseY = grupo.position.y;
    objetivo = { x: destino.x, y: (destino.y ?? 0) + 1, z: destino.z };
    grupo.rotation.y = Math.atan2(-(objetivo.x - grupo.position.x), -(objetivo.z - grupo.position.z));
    grupo.visible = true;
    vivo = 3.15;
  }

  function actualizar(dt) {
    if (!grupo.visible) return;
    vivo -= dt;
    const fase = Math.max(0, 3.15 - vivo);
    const golpe = Math.sin(fase * 24) * Math.max(0, 1 - fase * 0.9);
    // Primeros 0.34 s: el Ent se abalanza hacia el carro. La pausa posterior
    // deja la silueta, estrellas y globo legibles antes de desaparecer.
    const lunge = Math.max(0, 1 - fase / 0.32);
    const embestida = Math.sin(Math.min(1, fase / 0.32) * Math.PI) * 0.9;
    grupo.position.set(
      baseX + patadaDir.x * embestida,
      baseY + Math.sin(fase * 8) * 0.07,
      baseZ + patadaDir.z * embestida,
    );
    brazos.children.forEach((brazo, i) => {
      const lado = i === 0 ? -1 : 1;
      const swing = (i === 0 ? 1 : 0.35) * (golpe * 0.55 + lunge * 0.8);
      brazo.rotation.z = lado * (-0.82 + Math.sin(fase * 15 + i) * 0.12) + swing;
    });
    furia.rotation.z = golpe * 0.035;
    estrellas.children.forEach((estrella, i) => {
      estrella.rotation.x += dt * (2.2 + i * 0.15);
      estrella.rotation.y += dt * (1.7 + i * 0.1);
      estrella.position.y += Math.sin(fase * 9 + i) * dt * 0.12;
    });
    burbujaActual.lookAt(objetivo.x, objetivo.y + 1.1, objetivo.z);
    if (vivo <= 0) grupo.visible = false;
  }

  function setFrase(nueva) {
    if (!nueva || nueva === fraseActual) return;
    fraseActual = String(nueva);
    grupo.remove(burbujaActual);
    burbujaActual = crearBurbuja(THREE, fraseActual);
    grupo.add(burbujaActual);
  }

  return {
    grupo,
    aparecer,
    actualizar,
    setFrase,
    get visible() { return grupo.visible; },
    get frase() { return fraseActual; },
  };
}

export { FRASE_COMERCIAL };
