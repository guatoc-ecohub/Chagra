/*
 * climaVivoData — datos puros del CLIMA VIVO del valle (pieza A4-clima).
 *
 * Tres fenómenos montables (LluviaValle, NieblaLadera, HeladaValle) comparten
 * aquí sus presupuestos por tier, paletas y texturas-sprite procedurales.
 * Nada de three-escena: solo números, colores y canvas-texturas cacheadas.
 *
 * FRUGALIDAD: los presupuestos están calibrados para Android barato — cada
 * fenómeno completo son 2-5 draw calls y unos pocos miles de vértices como
 * MUCHO en tier alto; en `bajo` cada uno queda en 1-2 draw calls.
 */
import * as THREE from 'three';

/* PRNG determinista (LCG) — la misma familia que particulasData/EscarchaHelada:
   siembra reproducible sin dependencias. */
export function azarClima(semilla = 1) {
  let s = (semilla >>> 0) || 1;
  return () => {
    s = (s * 1103515245 + 12345) >>> 0;
    return s / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* PRESUPUESTOS POR TIER                                               */
/* ------------------------------------------------------------------ */

export const LLUVIA_TIER = {
  alto: { gotas: 620, salpicaduras: 24, charcos: 9, nubes: 8 },
  medio: { gotas: 340, salpicaduras: 12, charcos: 7, nubes: 5 },
  bajo: { gotas: 120, salpicaduras: 0, charcos: 5, nubes: 0 },
};

export const NIEBLA_TIER = {
  alto: { bancos: 22, jirones: 12 },
  medio: { bancos: 14, jirones: 7 },
  bajo: { bancos: 8, jirones: 0 },
};

export const HELADA_TIER = {
  alto: { mantos: 16, cristales: 84, destellos: 110, vahos: 4 },
  medio: { mantos: 10, cristales: 44, destellos: 54, vahos: 3 },
  bajo: { mantos: 6, cristales: 16, destellos: 0, vahos: 0 },
};

/* ------------------------------------------------------------------ */
/* PALETAS                                                             */
/* ------------------------------------------------------------------ */

export const PALETA_LLUVIA = {
  gota: '#cfe0ea', // agua a contraluz de cielo plomo
  salpicadura: '#8fb4c4', // aditivo: destello frío del rebote
  charco: '#93aebc', // el charco refleja el cielo cargado
  charcoNoche: '#5f7ea6',
  nube: '#4e5c66', // panza de nubarrón
};

export const PALETA_NIEBLA = {
  banco: '#dde6e9', // niebla de ladera, gris-leche
  bancoNoche: '#9fb2c6',
  jiron: '#b9cdd6', // aditivo: el jirón que sube del río al alba
};

export const PALETA_HELADA = {
  manto: '#eef6ff', // blanqueo de escarcha
  cristal: '#eaf3ff',
  cristalEmisivo: '#31507a', // vena azul del hielo
  destello: [0.86, 0.93, 1.0], // rgb 0..1 del titileo
  vaho: '#dbe9f4', // aliento del ganado
  luzCielo: '#cfe0f7', // hemisferio frío opcional
  luzSuelo: '#2e4468',
};

/* ------------------------------------------------------------------ */
/* GEOGRAFÍA COMPARTIDA DEL VALLE (espejo de Valle3D, solo datos)      */
/* ------------------------------------------------------------------ */

/* El cauce de la quebrada del valle — espejo de los puntos de control de
   `Quebrada` en Valle3D.jsx (nace en el páramo, -z, y baja a tierra caliente,
   +z). Lo usan las ondas de lluvia y los jirones del amanecer. Si la escena
   cambia su cauce, el host pasa el suyo por prop `cauce`. */
export const CAUCE_QUEBRADA = [
  [-3.4, -7.2],
  [-1.2, -4.2],
  [0.8, -1.4],
  [1.6, 1.8],
  [2.6, 5.4],
  [3.6, 8],
];

/* Interpola K puntos [x,z] a lo largo de un cauce poligonal (con jitter). */
export function puntosSobreCauce(cauce, k, rng, jitter = 0.5) {
  const out = [];
  const tramos = cauce.length - 1;
  for (let i = 0; i < k; i++) {
    const t = rng() * tramos;
    const s = Math.min(tramos - 1, Math.floor(t));
    const f = t - s;
    const [x0, z0] = cauce[s];
    const [x1, z1] = cauce[s + 1];
    out.push([
      x0 + (x1 - x0) * f + (rng() - 0.5) * jitter,
      z0 + (z1 - z0) * f + (rng() - 0.5) * jitter,
    ]);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* TEXTURAS-SPRITE PROCEDURALES (cacheadas a nivel de módulo, SSR-safe) */
/* ------------------------------------------------------------------ */

let _halo = null;
/** Halo radial suave — bancos de niebla, vaho, nubes, destellos. */
export function texturaHalo() {
  if (_halo) return _halo;
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  _halo = new THREE.CanvasTexture(cv);
  return _halo;
}

let _trazo = null;
/** Trazo vertical — la gota de lluvia como veta que cae (leída en pantalla,
    los Points siempre miran a cámara: el trazo vertical ES la caída). */
export function texturaTrazo() {
  if (_trazo) return _trazo;
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  cv.width = 16;
  cv.height = 64;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.75)');
  g.addColorStop(0.8, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(6, 0, 4, 64);
  _trazo = new THREE.CanvasTexture(cv);
  return _trazo;
}

export const suavizarClima = (x) => x * x * (3 - 2 * x); // smoothstep 0..1
export const clamp01 = (x) => Math.max(0, Math.min(1, x));
