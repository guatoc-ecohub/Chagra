/*
 * siembraValle — el TALLER de siembra compartido de los lotes densos del valle.
 *
 * Los tres lotes de vegetación densa del valle (bosque de niebla, cafetal
 * agroforestal, frailejonal del páramo) siembran igual: matas por especie en
 * parches elípticos, con borde suave, claros respetados, escala que ralea hacia
 * el borde, tinte por instancia y partición LOD por profundidad. Todo eso vive
 * AQUÍ una sola vez para que los tres lotes se comporten idéntico y tier-safe:
 * cada especie es UN InstancedMesh (una draw-call por banco por más matas que
 * haya). Cero WebGL nuevo: solo cálculo de posiciones y color por instancia.
 *
 * Determinista (semilla fija) → misma composición en cada carga.
 *
 * SOLO cálculo (sin JSX): el InstancedMesh compartido vive en BancoValle.jsx.
 */
import * as THREE from 'three';

/* RNG determinista (mulberry32): misma siembra en cada carga. */
export function rngDe(semilla) {
  let a = semilla >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ¿(x,z) cae dentro de algún parche? Devuelve 0..1: 1 en el núcleo, baja
   hacia 0 en el borde (borde SUAVE del lote: raleado, no muralla). */
export function nucleoZona(x, z, zona) {
  let mejor = 0;
  for (let i = 0; i < zona.length; i++) {
    const p = zona[i];
    const dx = (x - p.cx) / p.rx;
    const dz = (z - p.cz) / p.rz;
    const d = dx * dx + dz * dz; // 0 centro → 1 borde elipse
    const n = 1 - THREE.MathUtils.smoothstep(d, 0.5, 1);
    if (n > mejor) mejor = n;
  }
  return mejor;
}

export function enClaro(x, z, claros) {
  for (let i = 0; i < claros.length; i++) {
    const c = claros[i];
    const dx = x - c.x;
    const dz = z - c.z;
    if (dx * dx + dz * dz < c.r * c.r) return true;
  }
  return false;
}

/* Caja envolvente de la zona (para el muestreo por rechazo). */
export function cajaDe(zona) {
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (const p of zona) {
    x0 = Math.min(x0, p.cx - p.rx);
    x1 = Math.max(x1, p.cx + p.rx);
    z0 = Math.min(z0, p.cz - p.rz);
    z1 = Math.max(z1, p.cz + p.rz);
  }
  return { x0, x1, z0, z1 };
}

/*
 * Siembra n matas en la zona (rechazo + borde suave + claros + espaciado).
 * Cada item: { pos:[x,y,z], rotY, escala, tint:[r,g,b], lejos, tiltX, tiltZ }.
 *  - `esp`: distancia mínima entre matas del banco (0 = sin chequeo, sotobosque).
 *  - `emergentes`: prob. de que una mata del núcleo asome (×1.28) sobre el dosel.
 *  - `lean`: ladeo por instancia en radianes (cada mata cabecea distinto →
 *    la colonia no se lee clonada; pivote en la base). Útil en el frailejonal.
 *  - `zLod`: al fondo de esta z la mata se marca `lejos` (banda LOD lejana).
 */
export function sembrarLote(n, zona, claros, alturaDe, r, opts = {}) {
  const {
    escMin = 0.3, escMax = 0.58, esp = 0, hundir = 0.05,
    emergentes = 0, lean = 0, zLod = -Infinity,
  } = opts;
  const caja = cajaDe(zona);
  const items = [];
  const maxIntentos = n * 30;
  for (let i = 0; i < maxIntentos && items.length < n; i++) {
    const x = caja.x0 + r() * (caja.x1 - caja.x0);
    const z = caja.z0 + r() * (caja.z1 - caja.z0);
    const nucleo = nucleoZona(x, z, zona);
    if (nucleo <= 0.02 || r() > nucleo * 0.92 + 0.08) continue;
    if (enClaro(x, z, claros)) continue;
    if (esp > 0) {
      let choca = false;
      for (let j = 0; j < items.length; j++) {
        const dx = items[j].pos[0] - x;
        const dz = items[j].pos[2] - z;
        if (dx * dx + dz * dz < esp * esp) {
          choca = true;
          break;
        }
      }
      if (choca) continue;
    }
    let escala = THREE.MathUtils.lerp(escMin, escMax, (0.35 + 0.65 * nucleo) * (0.55 + r() * 0.45));
    if (emergentes > 0 && r() < emergentes && nucleo > 0.6) escala *= 1.28;
    const y = (alturaDe ? alturaDe(x, z) : 0) - hundir * escala;
    const it = { pos: [x, y, z], rotY: r() * Math.PI * 2, escala, lejos: z < zLod, tint: [1, 1, 1] };
    if (lean > 0) {
      it.tiltX = (r() - 0.5) * 2 * lean;
      it.tiltZ = (r() - 0.5) * 2 * lean;
    }
    items.push(it);
  }
  return items;
}

/*
 * Tinte por instancia: variación individual + PERSPECTIVA AÉREA (lo hondo del
 * lote se enfría hacia un color de fondo) + noche (multiplicador frío).
 *  - `frio`: cuánto enfría al fondo (0 = plano; 0.5 = bosque de niebla).
 *  - `nieblaRGB`: color al que tiende el fondo (azul-niebla por defecto).
 *  - `nocheRGB`: multiplicador nocturno.
 */
const AZUL_NIEBLA = [0.78, 0.85, 1.0];
const AZUL_NOCHE = [0.5, 0.62, 0.88];
export function tintarLote(items, r, nocturno, caja, opts = {}) {
  const { frio = 0.5, nieblaRGB = AZUL_NIEBLA, nocheRGB = AZUL_NOCHE, brilloVar = 0.2 } = opts;
  const spanZ = Math.max(0.001, caja.z1 - caja.z0);
  for (const it of items) {
    const brillo = 0.86 + r() * brilloVar;
    const hondura = THREE.MathUtils.clamp((caja.z1 - it.pos[2]) / spanZ, 0, 1);
    const f = hondura * hondura * frio;
    let tR = brillo * (1 - f) + nieblaRGB[0] * f;
    let tG = brillo * (1 - f) + nieblaRGB[1] * f;
    let tB = brillo * (1 - f) + nieblaRGB[2] * f;
    if (nocturno) {
      tR *= nocheRGB[0];
      tG *= nocheRGB[1];
      tB *= nocheRGB[2];
    }
    it.tint = [tR, tG, tB];
  }
  return items;
}
