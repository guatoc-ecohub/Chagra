/*
 * texturasOlor — las dos texturas de la pieza, dibujadas en runtime.
 *
 * Cero assets (regla de la casa: todo procedural, corre headless y no pesa un
 * byte en el bundle). Son dos, y son opuestas a propósito:
 *
 *   · `texturaAire`  — manchas SIN borde. El aire cargado no tiene silueta,
 *                      tiene densidad. Si tuviera contorno reconocible sería
 *                      una nube de dibujo animado, que es justo lo que esta
 *                      pieza no quiere ser.
 *   · `texturaMota`  — un grano de luz con centro duro. El nitrógeno SÍ es una
 *                      cosa: es materia, es grano, se puede contar. Por eso
 *                      tiene núcleo y el aire no.
 *
 * Esa diferencia —lo que se cuenta contra lo que solo se sufre— es la pieza.
 */
import * as THREE from 'three';

/**
 * El ruido del aire sucio: tres octavas de manchones suaves, con los bordes
 * desvanecidos para que el estrato no termine nunca en un rectángulo.
 *
 * @param {number} [semilla]
 * @returns {THREE.CanvasTexture}
 */
export function texturaAire(semilla = 1) {
  const s = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');

  ctx.fillStyle = 'rgba(255,255,255,0)';
  ctx.fillRect(0, 0, s, s);

  let sd = semilla >>> 0 || 1;
  const r = () => {
    sd = (sd * 1664525 + 1013904223) >>> 0;
    return sd / 4294967296;
  };

  /* Manchones grandes, medianos y grano: densidad, no forma. */
  const octavas = [
    { n: 9, rad: 95, a: 0.5 },
    { n: 22, rad: 46, a: 0.3 },
    { n: 54, rad: 20, a: 0.16 },
  ];
  ctx.globalCompositeOperation = 'lighter';
  octavas.forEach(({ n, rad, a }) => {
    for (let i = 0; i < n; i++) {
      const x = r() * s;
      const y = r() * s;
      const rr = rad * (0.55 + r() * 0.9);
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(0.55, `rgba(255,255,255,${a * 0.4})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  /* El estrato se desvanece hacia afuera: el aire no tiene canto. */
  ctx.globalCompositeOperation = 'destination-in';
  const b = ctx.createRadialGradient(s / 2, s / 2, s * 0.18, s / 2, s / 2, s * 0.5);
  b.addColorStop(0, 'rgba(255,255,255,1)');
  b.addColorStop(0.7, 'rgba(255,255,255,0.75)');
  b.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = b;
  ctx.fillRect(0, 0, s, s);

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * El grano de oro: un punto suave con núcleo. Es materia, no vaho.
 * @returns {THREE.CanvasTexture}
 */
export function texturaMota() {
  const s = 64;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.75)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
