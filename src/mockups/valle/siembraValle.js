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

/* ──────────────────────────────────────────────────────────────────────────
 * SIEMBRA ECOLÓGICA (rediseño 2026-07-20, auditoría visual del valle §5.1)
 *
 * La siembra vieja repartía matas con aleatoriedad pura dentro de la elipse:
 * el bosque se leía como "scatter" — 836 instancias con vecino más cercano
 * medio de 0.141 u (14 cm entre árboles adultos si 1 u = 1 m), un bloque
 * continuo sin claros ni jerarquía. Un monte de verdad agrupa por SUCESIÓN,
 * AGUA, LUZ, BORDE y MANEJO. Las funciones de abajo siembran con esos
 * criterios, manteniendo el mismo contrato de item y la determinación por
 * semilla:
 *
 *   · DISTANCIA MÍNIMA POR PORTE (1 u = 1 m; la finca real está comprimida a
 *     diorama, así que los radios conservan la JERARQUÍA del monte, no sus
 *     metros absolutos): emergente 1.6 · dosel 1.3–1.4 · medio 1.15 ·
 *     sotobosque 0.45. Las copas del dosel se ROZAN (dosel cerrado con
 *     individuos legibles); un tronco adulto jamás queda a 14 cm de otro.
 *   · NICHO por especie: pioneras al borde y alrededor de claros (yarumo),
 *     riparias junto al cauce (aliso), núcleo maduro en rodales (roble,
 *     encenillo), borde interior (gaque).
 *   · SOTOBOSQUE BAJO DOSEL: el matorral crece facilitado por la copa de un
 *     árbol (anillo 0.7–1.9 m del fuste) con una fracción libre en claros y
 *     bordes (regeneración).
 *   · CLAROS de tres tipos: manejo, corredor ripario y borde de regeneración
 *     (los define cada lote en su archivo).
 * ────────────────────────────────────────────────────────────────────────── */

/* La polilínea del cauce de la quebrada del valle (la misma que dibuja el
   agua del host): la afinidad riparia se mide contra ella. */
export const CAUCE_VALLE = [
  [-3.4, -7.2], [-1.2, -4.2], [0.8, -1.4], [1.6, 1.8], [2.6, 5.4], [3.6, 8],
];

/* Distancia de (x,z) a la polilínea del cauce (segmento más cercano). */
export function distanciaACauce(x, z, cauce = CAUCE_VALLE) {
  let mejor = Infinity;
  for (let i = 0; i < cauce.length - 1; i++) {
    const [ax, az] = cauce[i];
    const [bx, bz] = cauce[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const t = THREE.MathUtils.clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
    if (d < mejor) mejor = d;
  }
  return mejor;
}

/* Pendiente local del terreno (m/m) por diferencias finitas sobre `alturaDe`. */
export function pendienteEn(x, z, alturaDe, paso = 0.5) {
  if (!alturaDe) return 0;
  const dhx = alturaDe(x + paso, z) - alturaDe(x - paso, z);
  const dhz = alturaDe(x, z + paso) - alturaDe(x, z - paso);
  return Math.hypot(dhx, dhz) / (2 * paso);
}

/* Gaussiana estándar (Box-Muller) sobre el rng compartido: determinista. */
function gauss(r) {
  const u = Math.max(r(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}

/*
 * La ARBOLEDA multiespecie: UN padrón de espaciado global con radio por porte
 * (Poisson-disc de radio variable — entre dos matas manda el radio mayor, así
 * un emergente nunca se pega a un dosel aunque sus clases difieran). La
 * colocación es INTERCALADA por rondas (una mata por especie por ronda): el
 * orden de las especies no mata de hambre a las últimas.
 *
 * Cada especie: { clave, n, escMin, escMax, esp, hundir?, zLod?, emergentes?,
 *   zona?: elipses           — zona propia (p. ej. la franja riparia del
 *                              aliso); si falta, siembra en la zona del lote,
 *   nicho?: [nucleoMin, nucleoMax]   — franja de la zona que habita (pionera
 *                                   vs. núcleo maduro),
 *   agua?: { radio, peso, minDist? } — afinidad riparia: `peso` alto solo
 *                                   acepta junto al cauce; `minDist` protege
 *                                   el agua (nada sembrado EN la quebrada),
 *   bordeClaro?: 0..1                — probabilidad de aspirar al anillo del
 *                                   borde de un claro (la pionera de verdad:
 *                                   luz del claro, no su centro),
 *   rodales?: n                      — manchas de su misma especie en el núcleo
 *                                   (centros gaussianos; el monte agrupa),
 *   pendienteMax?: m/m }             — rechaza sitios demasiado parados.
 *
 * Devuelve { [clave]: items } con el mismo formato de `sembrarLote`.
 */
export function sembrarArboleda(especies, zona, claros, alturaDe, r) {
  const puestos = []; // {x, z, esp} de TODAS las especies (padrón global)

  // Cajas y centros de rodal por especie (deterministas, un solo flujo de rng).
  const cajas = {};
  const centrales = {};
  for (const sp of especies) {
    const z = sp.zona || zona;
    cajas[sp.clave] = cajaDe(z);
    if (!sp.rodales) continue;
    const cs = [];
    const caja = cajas[sp.clave];
    let intentos = sp.rodales * 40;
    while (cs.length < sp.rodales && intentos-- > 0) {
      const x = caja.x0 + r() * (caja.x1 - caja.x0);
      const z2 = caja.z0 + r() * (caja.z1 - caja.z0);
      if (nucleoZona(x, z2, z) < 0.55) continue;
      if (enClaro(x, z2, claros)) continue;
      if (cs.some((c) => Math.hypot(c[0] - x, c[1] - z2) < 3.2)) continue;
      cs.push([x, z2]);
    }
    centrales[sp.clave] = cs;
  }

  // Un candidato por especie (un intento): anillo de claro, rodal o libre.
  const candidato = (sp) => {
    const z = sp.zona || zona;
    const caja = cajas[sp.clave];
    if (sp.bordeClaro && claros.length && r() < sp.bordeClaro) {
      const c = claros[Math.floor(r() * claros.length)];
      const a = r() * Math.PI * 2;
      const rad = c.r + 0.3 + r() * 1.3;
      return [c.x + Math.cos(a) * rad, c.z + Math.sin(a) * rad];
    }
    const cs = centrales[sp.clave];
    if (cs && cs.length && r() < 0.68) {
      const c = cs[Math.floor(r() * cs.length)];
      return [c[0] + gauss(r) * 1.5, c[1] + gauss(r) * 1.5];
    }
    return [caja.x0 + r() * (caja.x1 - caja.x0), caja.z0 + r() * (caja.z1 - caja.z0)];
  };

  const acepta = (sp, x, z2) => {
    const z = sp.zona || zona;
    const nucleo = nucleoZona(x, z2, z);
    // `bordeLibre`: la pionera coloniza el rim parejo — su nicho YA es el
    // borde; aplicarle además la puerta del borde suave lo deja vacío.
    if (nucleo <= 0.02 || (!sp.bordeLibre && r() > nucleo * 0.92 + 0.08)) return null;
    if (sp.nicho && (nucleo < sp.nicho[0] || nucleo > sp.nicho[1])) return null;
    if (enClaro(x, z2, claros)) return null;
    if (sp.agua) {
      const d = distanciaACauce(x, z2);
      if (sp.agua.minDist && d < sp.agua.minDist) return null;
      const prox = Math.exp(-((d / sp.agua.radio) ** 2));
      if (r() > (1 - sp.agua.peso) + sp.agua.peso * prox) return null;
    }
    if (sp.pendienteMax && pendienteEn(x, z2, alturaDe) > sp.pendienteMax) return null;
    return nucleo;
  };

  // Intercalado por rondas: cada especie siembra una mata por ronda hasta
  // llenar su cupo o agotar su presupuesto de intentos.
  const activas = especies.map((sp) => ({ sp, items: [], intentos: sp.n * 70 }));
  let pendientes = activas.reduce((s, a) => s + a.sp.n, 0);
  let rondas = 0;
  while (pendientes > 0 && rondas++ < 6000) {
    let vivas = 0;
    for (const a of activas) {
      if (a.items.length >= a.sp.n || a.intentos <= 0) continue;
      vivas++;
      a.intentos--;
      const [x, z2] = candidato(a.sp);
      const nucleo = acepta(a.sp, x, z2);
      if (nucleo === null) continue;
      let choca = false;
      for (let j = 0; j < puestos.length; j++) {
        const p = puestos[j];
        const dd = Math.max(p.esp, a.sp.esp);
        const ddx = p.x - x;
        const ddz = p.z - z2;
        if (ddx * ddx + ddz * ddz < dd * dd) {
          choca = true;
          break;
        }
      }
      if (choca) continue;
      let escala = THREE.MathUtils.lerp(a.sp.escMin, a.sp.escMax, (0.35 + 0.65 * nucleo) * (0.55 + r() * 0.45));
      if (a.sp.emergentes > 0 && r() < a.sp.emergentes && nucleo > 0.6) escala *= 1.28;
      const y = (alturaDe ? alturaDe(x, z2) : 0) - (a.sp.hundir ?? 0.05) * escala;
      a.items.push({
        pos: [x, y, z2],
        rotY: r() * Math.PI * 2,
        escala,
        lejos: z2 < (a.sp.zLod ?? -Infinity),
        tint: [1, 1, 1],
      });
      puestos.push({ x, z: z2, esp: a.sp.esp });
      pendientes--;
    }
    if (!vivas) break;
  }
  const out = {};
  for (const a of activas) out[a.sp.clave] = a.items;
  return out;
}

/*
 * El SOTOBOSQUE: matorral agrupado BAJO el dosel (la mata crece facilitada por
 * la copa de un árbol: sombra, hojarasca, humedad) con una fracción libre en
 * claros y bordes (la regeneración que avanza). Un solo padrón de espaciado
 * entre todas las especies del sotobosque (radio de matorral), colocación
 * intercalada por rondas para no sesgar la mezcla.
 *
 * Cada especie: { clave, n, escMin, escMax, esp, hundir?, zLod?, lean? }.
 * `dosel` = items ya puestos de la arboleda (sus posiciones son los fustes).
 */
export function sembrarSotobosque(especies, dosel, zona, claros, alturaDe, r, opts = {}) {
  const { fraccionLibre = 0.25, radioCopa = [0.7, 1.9] } = opts;
  const caja = cajaDe(zona);
  const puestos = []; // {x, z} de todo el sotobosque (padrón compartido)
  const activas = especies.map((sp) => ({ sp, items: [], intentos: sp.n * 45 }));
  let pendientes = activas.reduce((s, a) => s + a.sp.n, 0);
  let rondas = 0;
  while (pendientes > 0 && rondas++ < 6000) {
    let vivas = 0;
    for (const a of activas) {
      if (a.items.length >= a.sp.n || a.intentos <= 0) continue;
      vivas++;
      a.intentos--;
      let x;
      let z2;
      if (dosel.length && r() > fraccionLibre) {
        const t = dosel[Math.floor(r() * dosel.length)];
        const ang = r() * Math.PI * 2;
        const rad = radioCopa[0] + r() * (radioCopa[1] - radioCopa[0]);
        x = t.pos[0] + Math.cos(ang) * rad;
        z2 = t.pos[2] + Math.sin(ang) * rad;
      } else {
        x = caja.x0 + r() * (caja.x1 - caja.x0);
        z2 = caja.z0 + r() * (caja.z1 - caja.z0);
      }
      const nucleo = nucleoZona(x, z2, zona);
      if (nucleo <= 0.02) continue; // el matorral sí llega al borde del lote
      if (enClaro(x, z2, claros)) continue;
      let choca = false;
      for (let j = 0; j < puestos.length; j++) {
        const p = puestos[j];
        const ddx = p.x - x;
        const ddz = p.z - z2;
        if (ddx * ddx + ddz * ddz < a.sp.esp * a.sp.esp) {
          choca = true;
          break;
        }
      }
      if (choca) continue;
      const escala = THREE.MathUtils.lerp(a.sp.escMin, a.sp.escMax, (0.35 + 0.65 * nucleo) * (0.55 + r() * 0.45));
      const y = (alturaDe ? alturaDe(x, z2) : 0) - (a.sp.hundir ?? 0.02) * escala;
      const it = {
        pos: [x, y, z2],
        rotY: r() * Math.PI * 2,
        escala,
        lejos: z2 < (a.sp.zLod ?? -Infinity),
        tint: [1, 1, 1],
      };
      if (a.sp.lean > 0) {
        it.tiltX = (r() - 0.5) * 2 * a.sp.lean;
        it.tiltZ = (r() - 0.5) * 2 * a.sp.lean;
      }
      a.items.push(it);
      puestos.push({ x, z: z2 });
      pendientes--;
    }
    if (!vivas) break;
  }
  const out = {};
  for (const a of activas) out[a.sp.clave] = a.items;
  return out;
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
