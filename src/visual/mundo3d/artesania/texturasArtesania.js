/*
 * texturasArtesania — la SUPERFICIE del taller, generada en runtime.
 *
 * Cuatro texturas procedurales (canvas diminuto, cero assets, cero red) que
 * convierten un plano o un lathe genérico en material de oficio:
 *
 *   tejido — trama y urdimbre en tela llana: el fondo de ruana/mochila.
 *   guarda — la banda tejida con rombos y zigzag (los acentos del telar).
 *   fique  — el tejido diagonal grueso del costal de cabuya.
 *   chamba — la loza negra ahumada y bruñida: manchas de fuego y brillo a paño.
 *
 * DECISIONES DE ARTE QUE SON DECISIONES TÉCNICAS:
 *   · Canvases de 64–128 px con NearestFilter en lo tejido: el píxel grande y
 *     firme LEE como hilo grueso (y es la textura más barata posible). La
 *     chamba en cambio se filtra suave: el barro bruñido no tiene grano.
 *   · Todo determinista (`rngArtesania` con seed): el mismo costal siempre.
 *   · CACHÉ por clave: mil canastos comparten UNA textura. `liberarTexturas
 *     Artesania()` para teardown de la escena que las montó.
 *
 * Tier-safe: son mapas de color sobre Lambert/Standard — funcionan igual en
 * gama baja (Lambert los usa) y no existe versión "rica" que descargar.
 */
import * as THREE from 'three';
import { rngArtesania } from '../artesaniaAndina.js';
import { NEUTROS } from '../paleta/paletaMadre.js';
import { FIBRAS, GUARDA_ACENTOS } from './tramaAndina.js';

const cache = new Map();

function conCache(clave, crear) {
  if (cache.has(clave)) return cache.get(clave);
  /* SSR / tests sin DOM: sin canvas no hay textura (los materiales degradan
     a color plano, que ya es el color correcto de la fibra). */
  if (typeof document === 'undefined') return null;
  const tex = crear();
  cache.set(clave, tex);
  return tex;
}

/** Libera TODAS las texturas del taller (teardown de la escena madre). */
export function liberarTexturasArtesania() {
  for (const tex of cache.values()) tex.dispose();
  cache.clear();
}

function lienzo(ancho, alto) {
  const cv = document.createElement('canvas');
  cv.width = ancho;
  cv.height = alto;
  return cv;
}

function texturizar(cv, { pixelada = true, repetir = [1, 1] } = {}) {
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  if (pixelada) {
    tex.magFilter = THREE.NearestFilter; // el píxel ES el hilo
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
  }
  tex.repeat.set(repetir[0], repetir[1]);
  return tex;
}

/* ------------------------------------------------------------------ */
/* TEJIDO — tela llana: urdimbre clara, trama en sombra, y la costura  */
/* de cada cruce marcada apenas. El damero desfasado es EXACTAMENTE    */
/* cómo se ve una tela llana de cerca — no hace falta más.             */
/* ------------------------------------------------------------------ */
export function texturaTejido({
  base = FIBRAS.lanaCruda,
  casillas = 8,
  s = 64,
  seed = 7,
  repetir = [1, 1],
} = {}) {
  const clave = `tejido|${base}|${casillas}|${s}|${seed}|${repetir}`;
  return conCache(clave, () => {
    const cv = lienzo(s, s);
    const ctx = cv.getContext('2d');
    const r = rngArtesania(seed);
    const c = s / casillas;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < casillas; i += 1) {
      for (let j = 0; j < casillas; j += 1) {
        const encima = (i + j) % 2 === 0; // ¿pasa por encima este cruce?
        const vida = (r() - 0.5) * 0.06; // hilo teñido a mano: nunca parejo
        ctx.fillStyle = encima
          ? `rgba(255, 248, 236, ${0.1 + vida})` // NEUTROS.hueso al aire
          : `rgba(36, 26, 16, ${0.12 + vida})`; // NEUTROS.tinta en sombra
        ctx.fillRect(i * c, j * c, c, c);
        /* la rayita del hilo que se hunde bajo el cruce */
        ctx.fillStyle = 'rgba(36, 26, 16, 0.14)';
        if (encima) ctx.fillRect(i * c, j * c + c - 1, c, 1);
        else ctx.fillRect(i * c + c - 1, j * c, 1, c);
      }
    }
    return texturizar(cv, { repetir });
  });
}

/* ------------------------------------------------------------------ */
/* GUARDA — la banda de acentos del telar: rombos anidados al centro,  */
/* zigzag de compañía y las dos líneas de tinta que la encierran. Se   */
/* repite horizontal (cinta, correa, filo de panel, faja de mochila).  */
/* ------------------------------------------------------------------ */
export function texturaGuarda({
  fondo = FIBRAS.lanaCruda,
  acentos = GUARDA_ACENTOS,
  s = 128,
  alto = 64,
  repetir = [1, 1],
} = {}) {
  const clave = `guarda|${fondo}|${acentos.join()}|${s}|${alto}|${repetir}`;
  return conCache(clave, () => {
    const cv = lienzo(s, alto);
    const ctx = cv.getContext('2d');
    ctx.fillStyle = fondo;
    ctx.fillRect(0, 0, s, alto);

    /* las líneas de tinta que rematan la banda (regla 2: el borde se ve) */
    ctx.fillStyle = NEUTROS.tinta;
    ctx.fillRect(0, 2, s, 2);
    ctx.fillRect(0, alto - 4, s, 2);

    /* rombos anidados: acento afuera, fondo adentro, punto de tinta al centro */
    const n = 4;
    const paso = s / n;
    const cy = alto / 2;
    const rw = paso * 0.34;
    const rh = alto * 0.3;
    const rombo = (cx, w, h, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(cx, cy - h);
      ctx.lineTo(cx + w, cy);
      ctx.lineTo(cx, cy + h);
      ctx.lineTo(cx - w, cy);
      ctx.closePath();
      ctx.fill();
    };
    for (let i = 0; i < n; i += 1) {
      const cx = paso * (i + 0.5);
      rombo(cx, rw, rh, acentos[i % acentos.length]);
      rombo(cx, rw * 0.55, rh * 0.55, fondo);
      rombo(cx, rw * 0.2, rh * 0.2, NEUTROS.tinta);
    }

    /* el zigzag fino que acompaña arriba y abajo */
    ctx.strokeStyle = acentos[2 % acentos.length];
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    for (const zy of [alto * 0.16, alto * 0.84]) {
      ctx.beginPath();
      const dientes = n * 2;
      const dx = s / dientes;
      ctx.moveTo(0, zy + 2);
      for (let i = 0; i < dientes; i += 1) {
        ctx.lineTo(dx * (i + 0.5), zy - 2);
        ctx.lineTo(dx * (i + 1), zy + 2);
      }
      ctx.stroke();
    }
    return texturizar(cv, { repetir });
  });
}

/* ------------------------------------------------------------------ */
/* FIQUE — el costal: sarga diagonal gruesa, fibra que cambia de tono  */
/* cada tanto (la cabuya no viene calibrada) y uno que otro pelito.    */
/* ------------------------------------------------------------------ */
export function texturaFique({ s = 64, seed = 7, repetir = [1, 1] } = {}) {
  const clave = `fique|${s}|${seed}|${repetir}`;
  return conCache(clave, () => {
    const cv = lienzo(s, s);
    const ctx = cv.getContext('2d');
    const r = rngArtesania(seed);
    ctx.fillStyle = FIBRAS.fique;
    ctx.fillRect(0, 0, s, s);
    /* la diagonal de la sarga, en las dos direcciones (tejido cruzado).
       Se dibuja de −s a 2s para que la repetición cierre sin costura. */
    const paso = 8;
    ctx.lineWidth = 2.5;
    for (let k = -s; k < s * 2; k += paso) {
      ctx.strokeStyle = `rgba(36, 26, 16, ${0.16 + r() * 0.1})`; // hebra en sombra
      ctx.beginPath();
      ctx.moveTo(k, 0);
      ctx.lineTo(k + s, s);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 248, 236, ${0.08 + r() * 0.08})`; // hebra al sol
      ctx.beginPath();
      ctx.moveTo(k + paso / 2 + s, 0);
      ctx.lineTo(k + paso / 2, s);
      ctx.stroke();
    }
    /* los pelitos sueltos de la cabuya */
    ctx.strokeStyle = 'rgba(36, 26, 16, 0.25)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i += 1) {
      const x = r() * s;
      const y = r() * s;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (r() - 0.5) * 6, y + (r() - 0.5) * 6);
      ctx.stroke();
    }
    return texturizar(cv, { repetir });
  });
}

/* ------------------------------------------------------------------ */
/* CHAMBA — loza negra ahumada: el fondo es humo, no pintura pareja.   */
/* Manchas anchas del fuego + las pasadas verticales del bruñido con   */
/* piedra. ÚNICA textura filtrada suave: el barro pulido no tiene grano.*/
/* ------------------------------------------------------------------ */
export function texturaChamba({ s = 128, seed = 7 } = {}) {
  const clave = `chamba|${s}|${seed}`;
  return conCache(clave, () => {
    const cv = lienzo(s, s);
    const ctx = cv.getContext('2d');
    const r = rngArtesania(seed);
    ctx.fillStyle = FIBRAS.chamba;
    ctx.fillRect(0, 0, s, s);
    /* las nubes del ahumado: donde el fuego besó más suave, aclara */
    for (let i = 0; i < 7; i += 1) {
      const x = r() * s;
      const y = r() * s;
      const rad = s * (0.15 + r() * 0.22);
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, 'rgba(138, 106, 68, 0.16)'); // TIERRAS.camino en veladura
      g.addColorStop(1, 'rgba(138, 106, 68, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    }
    /* las pasadas del bruñido: verticales, finas, apenas más claras */
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 14; i += 1) {
      const x = r() * s;
      ctx.strokeStyle = `rgba(201, 181, 147, ${0.04 + r() * 0.05})`; // vega a paño
      ctx.beginPath();
      ctx.moveTo(x, -2);
      ctx.quadraticCurveTo(x + (r() - 0.5) * 6, s / 2, x, s + 2);
      ctx.stroke();
    }
    return texturizar(cv, { pixelada: false });
  });
}
