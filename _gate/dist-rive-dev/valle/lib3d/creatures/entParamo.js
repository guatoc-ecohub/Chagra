// ── entParamo.js — EL ENT DEL PÁRAMO: el guardián del frailejonal ────────────
//
// Un frailejón (Espeletia) viejísimo que se enderezó y despertó. NO es un
// monstruo: es PAISAJE QUE DESPIERTA. Anciano, lento, de peso. Lo que tiene que
// dar es QUIETUD IMPONENTE — que no se pueda ignorar, no que ataque.
//
// (v14 — F23) EL GESTO CAMBIA DE DOCTRINA: serio, medio bravo, imponente
// (operador: "está bien que nos mire mal, no triste; que imponga, no que dé
// risa"). Y la TÉCNICA de los rasgos también: 13 versiones de cara
// pintada/tallada nunca alcanzaron a los 3 Ents-referente (ceiba.js,
// construirEntRoble, construirEntAliso) — v14 adopta SU molde de primitivas
// (pozo + ceja-caja + globo + iris chico 2:1 + nariz-cono + boca-torus
// CERRADA) sobre la corteza tallada, que queda de fondo. Los párpados de
// casquete (leían como esclerótica de muñeco) y la boca-hueco se van.
//
// DE DÓNDE SALE (esto no se dibujó de cero):
//  · El CARÁCTER viene del Ent 2D de la PWA (`EntFrailejon.jsx`): rostro sabio
//    tallado en la corteza — cuencas hundidas, cejas de cornisa SERENAS (no
//    bravas), cresta nasal entre los ojos, la boca en la hendidura que sonríe
//    apenas, faldita de hojas muertas, raíces que se asientan, balanceo lento.
//  · La ANATOMÍA 3D parte del frailejón-Ent de la rama `wip/paramo-vivo`
//    (`paramo-vivo-arte-frailejon.js`): hoja lanceolada con quilla, roseta por
//    capas, necromasa en anillos, mirada con damping alto. Se conserva su idea
//    y se supera en tres puntos donde fallaba: la cara era primitivas PEGADAS
//    (caja/toro/cono) en vez de corteza TALLADA, las hojas se contaban, y no
//    había pubescencia.
//  · Las PROPORCIONES respetan el frailejón ya aprobado 8/10 del proyecto
//    (`lib3d/flora/frailejonFabrica.js`, Espeletia grandiflora 3,45 m): el Ent
//    es la MISMA planta a ~3× — se lee como el abuelo del frailejonal, no como
//    otra especie.
//  · La doctrina de MASA es la de `lib3d/flora/FollajeMasa.js` (gate Humboldt):
//    si se pueden contar las hojas, está mal. De ahí se reusa la fusión que
//    preserva normales.
//
// REGLAS VISUALES QUE ESTE ARCHIVO OBEDECE
//  · Cero low-poly de color plano: normales suaves, color por vértice, textura
//    pintada. Nada de facetas grandes ni de "hojitas" contables.
//  · La PUBESCENCIA es la firma del frailejón (los pelos que lo aíslan del
//    frío): va en tres capas — pelo pintado en la hoja, fleco de pelo en el
//    borde de cada hoja, y un halo de pelusa alrededor de la roseta que a
//    contraluz enciende. Si no se ve peludo, no es frailejón.
//  · Lámina naturalista ilustrada, NO fotorrealismo: roughness 1, metalness 0,
//    un emissive bajo que hace de translucidez de hoja. Sin PBR brillante.
//  · Verde dominante. El plateado es verde-grisáceo, no blanco. El amarillo de
//    los capítulos es ACENTO, cuatro toques y nada más.
//  · Silueta: la roseta abre MUCHO más ancha que el fuste y la corona externa
//    CAE por debajo de la horizontal → paraguas/melena, jamás una columna con
//    punta. Es un chequeo de silueta deliberado, no una casualidad.
//
// PORTABILIDAD: recibe THREE como primer argumento (misma convención que
// FollajeMasa y que los módulos de vehículos), así el mismo archivo sirve al
// juego de karts y a los mundos del valle aunque tengan importmaps distintos.
// Determinista por semilla: dos cargas dan el mismo Ent y el gate compara.
//
// NO cablea nada: es una fábrica pura. Quien lo quiera en un mundo lo añade.

import { fusionarPreservando } from '../flora/FollajeMasa.js';

// ── PRNG determinista ────────────────────────────────────────────────────────
function prng(semilla) {
  let a = semilla >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ruido de valor 2D + fbm (para la corteza y las manchas de liquen)
function hash2(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, oct = 4) {
  let s = 0, amp = 1, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) { s += amp * vnoise(x * f, y * f); norm += amp; amp *= 0.5; f *= 2.03; }
  return s / norm;
}

const sat = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

// Escala del rostro sobre el canon del Ent 2D. A 1,0 la cara quedaba correcta
// pero PEQUEÑA para un fuste de Ent: se leía como un nudo con ojos en vez de
// como un rostro. Todo el rostro (relieve, pintura, ojos, párpados y la ventana
// de la necromasa) sale de aquí para que no se descuadren entre sí.
const ESC_CARA = 1.15;
const suave = (x) => { const k = sat(x); return k * k * (3 - 2 * k); };

// ═════════════════════════════════════════════════════════════════════════════
//  PALETA — plata-salvia sobre corteza ancestral. Marrón plano PROHIBIDO: toda
//  superficie lleva al menos dos tonos y ruido, si no lee como plástico.
// ═════════════════════════════════════════════════════════════════════════════
const C = {
  corteza: '#6d5335',
  cortezaClara: '#9a7d55',
  cortezaSeca: '#a8845a',
  cortezaOscura: '#33220f',
  grieta: '#1e1207',
  necroAlta: '#b08d5e',
  necroMedia: '#8f7049',
  necroBaja: '#6f5537',
  necroVieja: '#57422b',
  sage: '#9aa888',
  plata: '#bcc6ac',
  cogollo: '#dde4cc',
  pelo: '#e4ead6',
  vena: '#cfd8bd',
  hojaSombra: '#66765c',
  flor: '#dcbc42',
  florClara: '#f0dc86',
  florCentro: '#8f6a18',
  musgo: '#65834a',
  musgoClaro: '#8fa863',
  liquen: '#b6c0a2',
  // (v13) el ámbar baja a rescoldo: el '#d79b38' + emissive alto daba ojo de
  // caricatura que BRILLA. Un ojo antiguo es brasa bajo ceniza, no linterna.
  ambar: '#a4762a',
  ambarHondo: '#5c390e',
  ojo: '#170f06',
};

// ═════════════════════════════════════════════════════════════════════════════
//  TEXTURAS PROCEDURALES (canvas, deterministas — cero binarios en el repo)
// ═════════════════════════════════════════════════════════════════════════════

// Lienzo de PELO, dos sabores. Es el alma de la pubescencia.
//  · borde  (por defecto): mechones que nacen de v=0 y se abren hacia v=1, con
//    una costra opaca en la raíz. Va pegado al filo de cada hoja: el canto
//    poligonal desaparece y queda una orilla peluda.
//  · radial (`radial:true`): un mechón suelto que se apaga en TODOS los bordes.
//    Va en el halo. La costra de raíz aquí está PROHIBIDA — en un card suelto
//    esa banda opaca se ve como una esquirla blanca triangular (pasó en v1).
function texturaPelo(THREE, opts = {}) {
  const tam = opts.tam ?? 256;
  const radial = opts.radial === true;
  const n = opts.pelos ?? (radial ? 460 : 760);
  const rn = prng(opts.semilla ?? 4021);
  const cv = document.createElement('canvas');
  cv.width = cv.height = tam;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, tam, tam);
  ctx.lineCap = 'round';
  const R = tam / 2;
  for (let i = 0; i < n; i++) {
    let x0, y0, ang, largo;
    if (radial) {
      const a = rn() * Math.PI * 2;
      const d = R * 0.30 * Math.pow(rn(), 0.6);
      x0 = R + Math.cos(a) * d; y0 = R + Math.sin(a) * d;
      ang = a + (rn() - 0.5) * 0.9;
      largo = R * (0.30 + Math.pow(rn(), 1.5) * 0.62);
    } else {
      x0 = rn() * tam;
      y0 = tam * (0.97 + rn() * 0.05);
      ang = -Math.PI / 2 + (rn() - 0.5) * 1.15;
      largo = tam * (0.22 + Math.pow(rn(), 1.7) * 0.62);
    }
    const curva = (rn() - 0.5) * 0.8;
    const x1 = x0 + Math.cos(ang) * largo * 0.55 + curva * largo * 0.28;
    const y1 = y0 + Math.sin(ang) * largo * 0.55;
    const x2 = x0 + Math.cos(ang + curva) * largo;
    const y2 = y0 + Math.sin(ang + curva) * largo;
    const claro = rn();
    const gr = ctx.createLinearGradient(x0, y0, x2, y2);
    // el pelo del frailejón NO es blanco: es plata verdosa. Blanco puro fue el
    // otro error de v1 — encendía como nieve y se comía el verde dominante.
    const tono = claro < 0.55 ? '206,215,190' : claro < 0.86 ? '176,190,160' : '228,235,214';
    gr.addColorStop(0, `rgba(${tono},${radial ? 0.82 : 0.95})`);
    gr.addColorStop(0.5, `rgba(${tono},0.55)`);
    gr.addColorStop(1, `rgba(${tono},0)`);
    ctx.strokeStyle = gr;
    ctx.lineWidth = 0.6 + rn() * (radial ? 1.2 : 1.6);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(x1, y1, x2, y2);
    ctx.stroke();
  }
  if (!radial) {
    // costra densa SOLO en la raíz del fleco (queda tapada por la hoja)
    const base = ctx.createLinearGradient(0, tam, 0, tam * 0.86);
    base.addColorStop(0, 'rgba(196,208,178,0.95)');
    base.addColorStop(1, 'rgba(196,208,178,0)');
    ctx.fillStyle = base;
    ctx.fillRect(0, tam * 0.86, tam, tam * 0.14);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = opts.aniso ?? 4;
  return tex;
}

// Lienzo de la HOJA VIVA: verde-salvia con miles de pelos finos peinados a lo
// largo. En primer plano la hoja se lee aterciopelada; de lejos, plateada.
function texturaHojaPubescente(THREE, opts = {}) {
  const tam = opts.tam ?? 256;
  const rn = prng(opts.semilla ?? 913);
  const cv = document.createElement('canvas');
  cv.width = cv.height = tam;
  const ctx = cv.getContext('2d');
  const g = ctx.createLinearGradient(0, tam, 0, 0);
  g.addColorStop(0, C.hojaSombra);
  g.addColorStop(0.45, C.sage);
  g.addColorStop(1, C.plata);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, tam, tam);
  // nervadura central (u ≈ 0.5) apenas insinuada
  const nerv = ctx.createLinearGradient(tam * 0.42, 0, tam * 0.58, 0);
  nerv.addColorStop(0, 'rgba(207,216,189,0)');
  nerv.addColorStop(0.5, 'rgba(215,224,198,0.55)');
  nerv.addColorStop(1, 'rgba(207,216,189,0)');
  ctx.fillStyle = nerv;
  ctx.fillRect(tam * 0.42, 0, tam * 0.16, tam);
  // pelos peinados hacia la punta
  ctx.lineCap = 'round';
  for (let i = 0; i < 2600; i++) {
    const x = rn() * tam, y = rn() * tam;
    const largo = tam * (0.012 + rn() * 0.055);
    const desv = (x / tam - 0.5) * 0.85 + (rn() - 0.5) * 0.35;
    const a = 0.22 + rn() * 0.5;
    ctx.strokeStyle = rn() < 0.7
      ? `rgba(226,233,212,${a.toFixed(3)})`
      : `rgba(160,176,146,${(a * 0.8).toFixed(3)})`;
    ctx.lineWidth = 0.5 + rn() * 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + desv * largo, y - largo);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = opts.aniso ?? 4;
  return tex;
}

// Lienzo de NECROMASA: greñas de hoja muerta que cuelgan desde v=1 hacia abajo.
// Rompe la silueta de la falda para que no se lean púas contables.
function texturaNecromasa(THREE, opts = {}) {
  const tam = opts.tam ?? 256;
  const rn = prng(opts.semilla ?? 7717);
  const cv = document.createElement('canvas');
  cv.width = cv.height = tam;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, tam, tam);
  ctx.lineCap = 'round';
  // HOJAS muertas anchas, no pelos: en v2 las tiras eran finas y la falda leía
  // como pelambre de animal. La necromasa son PALAS caídas y apelmazadas.
  const tonos = ['150,118,80', '124,97,64', '96,74,48', '74,57,38', '172,142,101'];
  for (let i = 0; i < 40; i++) {
    const x0 = rn() * tam;
    const largo = tam * (0.42 + Math.pow(rn(), 1.2) * 0.58);
    const desv = (rn() - 0.5) * tam * 0.13;
    const tono = tonos[(rn() * tonos.length) | 0];
    // pocas y ANCHAS. Con muchas y finas (v3) el card entero leía como pelambre
    // de animal: la proporción de la pala manda más que el color.
    const ancho = tam * (0.12 + rn() * 0.20);
    const gr = ctx.createLinearGradient(0, 0, 0, largo);
    gr.addColorStop(0, `rgba(${tono},0.97)`);
    gr.addColorStop(0.72, `rgba(${tono},0.86)`);
    gr.addColorStop(1, `rgba(${tono},0)`);
    ctx.fillStyle = gr;
    // pala: se abre, se afina y termina en punta rota
    ctx.beginPath();
    ctx.moveTo(x0 - ancho * 0.22, 0);
    ctx.quadraticCurveTo(x0 - ancho * 0.62, largo * 0.42, x0 + desv - ancho * 0.10, largo);
    ctx.quadraticCurveTo(x0 + desv + ancho * 0.10, largo, x0 + desv + ancho * 0.14, largo * 0.94);
    ctx.quadraticCurveTo(x0 + ancho * 0.60, largo * 0.42, x0 + ancho * 0.22, 0);
    ctx.closePath();
    ctx.fill();
    // quilla clara: da vuelta de hoja, no de mechón
    ctx.strokeStyle = `rgba(198,170,126,${(0.16 + rn() * 0.26).toFixed(3)})`;
    ctx.lineWidth = 1 + rn() * 1.8;
    ctx.beginPath();
    ctx.moveTo(x0, largo * 0.04);
    ctx.quadraticCurveTo(x0 + desv * 0.5, largo * 0.5, x0 + desv, largo * 0.9);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(132,103,68,0.94)';
  ctx.fillRect(0, 0, tam, tam * 0.16);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = opts.aniso ?? 4;
  return tex;
}

// Lienzo de CORTEZA: vetas verticales, grietas hondas y motas de liquen.
function texturaCorteza(THREE, opts = {}) {
  const w = opts.tam ?? 256, h = (opts.tam ?? 256) * 2;
  const rn = prng(opts.semilla ?? 5501);
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  // El mapa va CLARO a propósito: el color de la corteza lo pone el color por
  // vértice (que además lleva el modelado del rostro). Si el mapa también trae
  // el marrón oscuro, se multiplican los dos y el rostro rinde negro (v5).
  ctx.fillStyle = '#b09070';
  ctx.fillRect(0, 0, w, h);
  // placas: manchas anchas de tono, primero — sin esto la corteza lee PELO.
  // (v11) MÁS placas pero MÁS suaves: con alpha alto y pocas, al quitar el
  // rayado anular quedaron leyendo como lunares de leopardo. El mapa es PAPEL
  // TONAL: el carácter de grieta ahora lo pone el color por vértice de la
  // geometría, que sí sabe respetar el rostro.
  for (let i = 0; i < 190; i++) {
    const x = rn() * w, y = rn() * h;
    ctx.fillStyle = rn() < 0.5
      ? `rgba(133,107,72,${(0.07 + rn() * 0.15).toFixed(3)})`
      : `rgba(45,30,15,${(0.06 + rn() * 0.13).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, w * (0.06 + rn() * 0.16), h * (0.014 + rn() * 0.05), (rn() - 0.5) * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // grietas verticales: pocas, suaves y cortas — insinúan, no dibujan. Con 210
  // trazos a alpha 0,7 el frente del fuste (que vive bajo la sombra de la
  // roseta) quedaba sembrado de pelos negros sueltos.
  for (let i = 0; i < 120; i++) {
    const x = rn() * w;
    const y0 = rn() * h;
    const largo = h * (0.02 + rn() * 0.12);
    const claro = rn() < 0.38;
    ctx.strokeStyle = claro
      ? `rgba(158,128,88,${(0.10 + rn() * 0.20).toFixed(3)})`
      : `rgba(24,14,6,${(0.10 + rn() * 0.26).toFixed(3)})`;
    ctx.lineWidth = 1.0 + rn() * 3.0;
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.bezierCurveTo(x + (rn() - 0.5) * 7, y0 + largo * 0.4, x + (rn() - 0.5) * 7, y0 + largo * 0.7, x + (rn() - 0.5) * 5, y0 + largo);
    ctx.stroke();
  }
  // cicatrices ANULARES: cada anillo es una roseta que murió y se cayó. Son la
  // marca de edad del frailejón y lo que hace que el fuste no lea como pelambre.
  // (v11) PERO no pueden ser 46 rayas continuas de lado a lado: tapizaban el
  // fuste de bandas horizontales regulares y el tronco leía CARTÓN CORRUGADO.
  // Peor: la boca del rostro es exactamente una línea horizontal más, y el
  // rayado la enterraba. Ahora son menos, van en TROZOS con huecos, y cada
  // trozo varía en grosor y fuerza: marcas de edad, no pauta de fábrica.
  for (let i = 0; i < 16; i++) {
    const y = rn() * h;
    const trozos = 2 + Math.floor(rn() * 3);
    for (let s = 0; s < trozos; s++) {
      const x0 = rn() * w;
      const largo = w * (0.09 + rn() * 0.20);
      ctx.strokeStyle = `rgba(20,12,5,${(0.10 + rn() * 0.20).toFixed(3)})`;
      ctx.lineWidth = 0.8 + rn() * 2.2;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      for (let x = x0; x <= x0 + largo; x += largo / 5) {
        ctx.lineTo(x, y + Math.sin(x * 0.09 + i) * (1.2 + rn() * 2.0));
      }
      ctx.stroke();
      if (rn() < 0.5) {
        ctx.strokeStyle = `rgba(160,132,92,${(0.07 + rn() * 0.12).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(x0, y + 3);
        for (let x = x0; x <= x0 + largo; x += largo / 5) ctx.lineTo(x, y + 3 + Math.sin(x * 0.09 + i) * 1.8);
        ctx.stroke();
      }
    }
  }
  // motas de liquen: verde-gris pálido, es lo que dice "esto lleva siglos aquí"
  for (let i = 0; i < 240; i++) {
    const x = rn() * w, y = rn() * h, r = 1.5 + rn() * 7;
    ctx.fillStyle = rn() < 0.6
      ? `rgba(182,192,162,${(0.12 + rn() * 0.34).toFixed(3)})`
      : `rgba(120,148,92,${(0.10 + rn() * 0.28).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.5 + rn() * 0.8), rn() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = opts.aniso ?? 8;
  return tex;
}

// Lienzo de MUSGO: cojín de motitas con alpha ralo hacia el borde.
function texturaMusgo(THREE, opts = {}) {
  const tam = opts.tam ?? 128;
  const rn = prng(opts.semilla ?? 331);
  const cv = document.createElement('canvas');
  cv.width = cv.height = tam;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, tam, tam);
  const R = tam / 2;
  for (let i = 0; i < 520; i++) {
    const a = rn() * Math.PI * 2;
    const d = R * Math.pow(rn(), 0.5);
    const x = R + Math.cos(a) * d, y = R + Math.sin(a) * d;
    const caida = 1 - d / R;
    const claro = rn();
    ctx.fillStyle = claro < 0.5
      ? `rgba(101,131,74,${(caida * 0.9).toFixed(3)})`
      : claro < 0.85
        ? `rgba(143,168,99,${(caida * 0.8).toFixed(3)})`
        : `rgba(182,192,162,${(caida * 0.6).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 1 + rn() * 3.2, 1 + rn() * 2.4, rn() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ═════════════════════════════════════════════════════════════════════════════
//  HOJA LANCEOLADA — la pala del frailejón, con canal y punta que cae.
//  Malla indexada (normales SUAVES: nada de facetas) + color por vértice
//  (base en sombra → punta plateada) + UV para el pelo pintado.
//  Sale con la base en el origen, creciendo hacia +Y, con la cara cóncava
//  mirando a -Z (que después de rotarla queda mirando arriba).
// ═════════════════════════════════════════════════════════════════════════════
function hojaGeo(THREE, opts = {}) {
  const len = opts.len ?? 1;
  const wid = opts.wid ?? 0.34;
  const nSec = opts.secciones ?? 9;
  const nLat = opts.lateral ?? 5;
  const canal = opts.canal ?? 0.20;
  const arco = opts.arco ?? 0.18;
  const torsion = opts.torsion ?? 0;
  const cBase = new THREE.Color(opts.base ?? C.hojaSombra);
  const cPunta = new THREE.Color(opts.punta ?? C.plata);
  const cBorde = new THREE.Color(opts.borde ?? C.hojaSombra);

  const pos = new Float32Array(nSec * nLat * 3);
  const uv = new Float32Array(nSec * nLat * 2);
  const col = new Float32Array(nSec * nLat * 3);
  const idx = [];
  const tmp = new THREE.Color();

  for (let i = 0; i < nSec; i++) {
    const t = i / (nSec - 1);
    // perfil lanceolado: base angosta, panza al tercio, punta aguda
    const medioAncho = wid * 0.5 * (0.30 + 0.70 * Math.sin(Math.PI * Math.pow(t, 0.55))) * (1 - Math.pow(t, 3.2));
    const zArco = arco * len * t * t;                       // la punta cae
    const giro = torsion * t;
    for (let j = 0; j < nLat; j++) {
      const s = (j / (nLat - 1)) * 2 - 1;                    // -1 borde izq · +1 borde der
      const x0 = s * medioAncho;
      const zCanal = canal * wid * (1 - s * s) * Math.pow(Math.sin(Math.PI * (0.08 + 0.92 * t)), 0.6);
      const y0 = t * len;
      const z0 = zArco + zCanal;
      // torsión suave alrededor del eje de la hoja
      const cs = Math.cos(giro), sn = Math.sin(giro);
      const k = i * nLat + j;
      pos[k * 3] = x0 * cs - z0 * sn;
      pos[k * 3 + 1] = y0;
      pos[k * 3 + 2] = x0 * sn + z0 * cs;
      uv[k * 2] = (s + 1) * 0.5;
      uv[k * 2 + 1] = t;
      tmp.copy(cBase).lerp(cPunta, Math.pow(t, 0.72));
      tmp.lerp(cBorde, Math.pow(Math.abs(s), 3.0) * 0.5);
      col[k * 3] = tmp.r; col[k * 3 + 1] = tmp.g; col[k * 3 + 2] = tmp.b;
    }
  }
  for (let i = 0; i < nSec - 1; i++) {
    for (let j = 0; j < nLat - 1; j++) {
      const a = i * nLat + j, b = a + 1, c = a + nLat, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();   // indexada → suaves
  return g;
}

// FLECO DE PELO del borde de la hoja: dos tiras que nacen del filo y salen
// hacia afuera. Sin esto la hoja termina en un canto poligonal y el frailejón
// se ve pelado, que fue el rechazo histórico del páramo.
function flecoGeo(THREE, hoja, largoPelo, nSec, nLat) {
  const P = hoja.attributes.position;
  const pos = [], uv = [], col = [];
  const A = new THREE.Vector3(), B = new THREE.Vector3(), Cn = new THREE.Vector3();
  const dir = new THREE.Vector3(), eje = new THREE.Vector3();
  const blanco = [1, 1, 1];
  const empujar = (v, u, w) => { pos.push(v.x, v.y, v.z); uv.push(u, w); col.push(blanco[0], blanco[1], blanco[2]); };

  for (const lado of [0, nLat - 1]) {
    const signo = lado === 0 ? -1 : 1;
    for (let i = 0; i < nSec - 1; i++) {
      const k0 = i * nLat + lado, k1 = (i + 1) * nLat + lado;
      A.set(P.getX(k0), P.getY(k0), P.getZ(k0));
      B.set(P.getX(k1), P.getY(k1), P.getZ(k1));
      // hacia adentro para saber hacia dónde es "afuera"
      const kIn = i * nLat + (lado === 0 ? 1 : nLat - 2);
      Cn.set(P.getX(kIn), P.getY(kIn), P.getZ(kIn));
      dir.copy(A).sub(Cn);
      if (dir.lengthSq() < 1e-9) dir.set(signo, 0, 0);
      dir.normalize();
      eje.copy(B).sub(A);
      const t0 = i / (nSec - 1), t1 = (i + 1) / (nSec - 1);
      // el pelo es más largo en el tercio medio y se apaga en la punta
      const l0 = largoPelo * (0.45 + 0.55 * Math.sin(Math.PI * t0)) * (1 - Math.pow(t0, 2.4));
      const l1 = largoPelo * (0.45 + 0.55 * Math.sin(Math.PI * t1)) * (1 - Math.pow(t1, 2.4));
      const a1 = A.clone(), b1 = B.clone();
      const a2 = A.clone().addScaledVector(dir, l0).addScaledVector(eje, 0.18);
      const b2 = B.clone().addScaledVector(dir, l1).addScaledVector(eje, 0.18);
      empujar(a1, t0, 0); empujar(b1, t1, 0); empujar(a2, t0, 1);
      empujar(b1, t1, 0); empujar(b2, t1, 1); empujar(a2, t0, 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
  g.computeVertexNormals();
  return g;
}

// Coloca una hoja: azimut `a` (0 = al frente, +Z), inclinación `tilt` desde la
// horizontal (negativa = cae), radio de arranque `rad`, altura `y`.
function ponerHoja(geo, a, tilt, rad, y, escala = 1) {
  if (escala !== 1) geo.scale(escala, escala, escala);
  geo.rotateX(Math.PI / 2 - tilt);
  geo.rotateY(a);
  geo.translate(Math.sin(a) * rad, y, Math.cos(a) * rad);
  return geo;
}

// ═════════════════════════════════════════════════════════════════════════════
//  MUESTREO NO UNIFORME — concentra vértices donde está el rostro. Sin esto,
//  para que la cara tuviera resolución habría que subdividir TODO el fuste y
//  el Ent costaría el triple por nada.
// ═════════════════════════════════════════════════════════════════════════════
function muestreo(n, densidad) {
  const w = new Array(n);
  let total = 0;
  // OJO: `densidad` es densidad de VÉRTICES, así que el paso es su INVERSA.
  // Sumando la densidad directa (v1–v10) pasaba lo contrario de lo buscado: el
  // rostro quedaba con el paso MÁS GRANDE de todo el fuste y era la zona peor
  // muestreada. La boca (17 cm) caía entre dos anillos de vértices y no existía;
  // las cejas quedaban en dos picos crudos. Tres pasadas de arte persiguiendo
  // un problema de muestreo. La sonda del gate (`?sonda=1`) lo cazó con n=0.
  for (let i = 0; i < n; i++) { w[i] = 1 / densidad((i + 0.5) / n); total += w[i]; }
  const out = new Array(n + 1);
  out[0] = 0;
  let acc = 0;
  for (let i = 0; i < n; i++) { acc += w[i] / total; out[i + 1] = acc; }
  out[n] = 1;
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════
//  EL ROSTRO — RELIEVE, no primitivas pegadas.
//  Devuelve cuánto se hunde o sale la corteza en (arco horizontal sx, altura
//  relativa sy), ambos en metros respecto al centro de la cara.
//  Sigue el rostro del Ent 2D: cuencas hondas, cornisas SERENAS, cresta nasal,
//  pómulos, y la boca como una grieta que sonríe apenas. Anciano sabio, NO
//  gruñón: las cejas suben por fuera, no bajan por dentro.
// ═════════════════════════════════════════════════════════════════════════════
function relieveCara(sx, sy) {
  const bulto = (dx, dy, rx, ry) => {
    const q = Math.sqrt((dx / rx) * (dx / rx) + (dy / ry) * (dy / ry));
    return suave(1 - q);
  };
  let d = 0;
  const ax = Math.abs(sx);

  // frente ancha y baja
  d += 0.085 * bulto(sx, sy - 1.02, 0.86, 0.52);

  // CEJAS: (v13) viseras BAJAS, pesadas y casi horizontales, el extremo externo
  // levemente caído. La curva de v12 subía 0,09 hacia afuera: ceja levantada =
  // gesto amable/sorprendido, y el gate del operador lo leyó "chistoso". Bárbol
  // lleva la cornisa ENCIMA del ojo, como cornisa de peñasco: sombra, no saludo.
  const yCeja = 0.58 + 0.02 * (ax / 0.5) - 0.075 * Math.pow(ax / 0.5, 2);
  d += 0.30 * bulto(ax - 0.44, sy - yCeja, 0.62, 0.26);
  // ENTRECEJO (v13): dos surcos verticales entre las cejas — el ceño del que
  // lleva siglos pensando. Poca hondura: gravedad, no rabia.
  d -= 0.060 * suave(1 - Math.abs(ax - 0.115) / 0.085) * suave(1 - Math.abs(sy - 0.72) / 0.26);

  // CUENCAS: hondas de verdad — la sombra dentro del hueco es lo que hace la
  // mirada. Óvalo un poco más alto que ancho, como en la lámina 2D.
  d -= 0.335 * bulto(ax - 0.42, sy - 0.28, 0.315, 0.335);
  // canal lagrimal hacia la nariz (evita que la cuenca quede de muñeco)
  d -= 0.075 * bulto(ax - 0.20, sy - 0.16, 0.16, 0.22);

  // CRESTA NASAL: baja del entrecejo y se ensancha
  const anchoNariz = 0.130 + 0.110 * suave((0.62 - sy) / 0.95);
  d += 0.215 * bulto(sx, sy - 0.10, anchoNariz, 0.48);
  // aletas
  d += 0.055 * bulto(ax - 0.155, sy + 0.30, 0.10, 0.09);

  // PÓMULOS: dos planos anchos que sostienen la cara
  d += 0.105 * bulto(ax - 0.60, sy + 0.10, 0.34, 0.40);

  // BOCA: (v13) el tajo deja de sonreír. Las comisuras de v12 subían 0,14 y a
  // media distancia la cara era un emoji sobre un tronco (gate del operador:
  // "demasiado chistosa"). Ahora la grieta corre casi recta con las puntas
  // apenas CAÍDAS: solemne, ancestral — grave sin ser brava.
  // (v14) el tajo hondo se vuelve PLIEGUE somero: la boca ahora es geometría
  // propia (torus-hendidura CERRADA, la fórmula probada de roble/aliso/ceiba).
  // El óvalo negro abierto que dejaba el tajo era la mitad del "triste/cortado"
  // que rechazó el operador — la grieta queda de fondo, no de boca.
  const yBoca = -0.62 - 0.035 * Math.pow(sat(ax / 0.62), 2);
  const anchoBoca = suave(1 - Math.abs(sx) / 0.78);
  d -= 0.150 * anchoBoca * suave(1 - Math.abs(sy - yBoca) / 0.085);
  d += 0.125 * anchoBoca * bulto(0, sy - (yBoca + 0.165), 1, 0.11);    // labio de arriba
  d += 0.140 * anchoBoca * bulto(0, sy - (yBoca - 0.175), 1, 0.12);    // labio de abajo
  // mentón
  d += 0.105 * bulto(sx, sy + 1.14, 0.46, 0.28);

  // ARRUGAS: tres surcos en la frente y dos patas de gallo. Poca profundidad,
  // pero son lo que separa "tronco con cara" de "cara ANCIANA".
  for (let i = 0; i < 3; i++) {
    const yy = 1.02 + i * 0.20;
    const anchoF = 0.74 - i * 0.10;
    d -= 0.045 * suave(1 - Math.abs(sx) / anchoF) * suave(1 - Math.abs(sy - yy - 0.05 * Math.cos(sx * 2.4)) / 0.045);
  }
  for (let i = 0; i < 2; i++) {
    const dx = ax - (0.74 + i * 0.10);
    d -= 0.038 * suave(1 - Math.abs(dx) / 0.16) * suave(1 - Math.abs(sy - (0.30 - i * 0.20)) / 0.13);
  }

  // Envolvente: fuera del óvalo, la corteza vuelve a ser corteza. La curva va
  // PLANA adentro y sólo cae en el borde. Con un smoothstep sobre (1-q) crudo
  // (v7-v9) la ceja quedaba al 34% de su fuerza y la boca al 65% — los rasgos
  // estaban en el código y no se veían en pantalla. Costó tres pasadas.
  const q = Math.sqrt((sx / 1.02) * (sx / 1.02) + (sy / 1.56) * (sy / 1.56));
  return d * suave((1 - q) / 0.32);
}

// ═════════════════════════════════════════════════════════════════════════════
//  LA PIEL DIBUJADA del rostro. Devuelve `luz` ∈ [-1, 1]: negativo = tinta,
//  positivo = realce. Se pinta ENCIMA del relieve.
//
//  Por qué existe esta función: el relieve solo no basta. Sobre un cilindro,
//  de frente y con luz difusa, una cornisa de 30 cm no produce casi contraste y
//  el rostro se pierde (pasó de la v3 a la v7, tres pasadas). El Ent 2D del que
//  parte esto resuelve la cara con TINTA — cejas, cuenca y boca son trazo. La
//  doctrina del proyecto es esa: huesos reales, piel DIBUJADA. Así que la
//  sombra bajo la cornisa y el surco de la boca se pintan, no se esperan de la
//  iluminación.
// ═════════════════════════════════════════════════════════════════════════════
function pinturaCara(sx, sy) {
  const bulto = (dx, dy, rx, ry) => {
    const q = Math.sqrt((dx / rx) * (dx / rx) + (dy / ry) * (dy / ry));
    return suave(1 - q);
  };
  let luz = 0;
  const ax = Math.abs(sx);

  // CEJAS: canto iluminado arriba + la sombra que la cornisa ARROJA debajo.
  // Esa sombra pintada es el 80% de lo que hace leer una ceja.
  // (v13) misma curva baja y pesada que el relieve; la sombra arrojada se
  // ensancha — el ojo tiene que vivir DEBAJO de una cornisa, no al aire.
  const yCeja = 0.58 + 0.02 * (ax / 0.5) - 0.075 * Math.pow(ax / 0.5, 2);
  luz += 0.78 * bulto(ax - 0.44, sy - (yCeja + 0.12), 0.56, 0.13);
  luz -= 1.00 * bulto(ax - 0.44, sy - (yCeja - 0.19), 0.58, 0.23);
  // ENTRECEJO (v13): la tinta del ceño acompaña a los surcos del relieve
  luz -= 0.42 * suave(1 - Math.abs(ax - 0.115) / 0.075) * suave(1 - Math.abs(sy - 0.72) / 0.24);

  // CUENCAS: (v12) la tinta deja de ser un ANILLO. El piso emissive de la
  // corteza no se multiplica por el color de vértice: en la sombra de la roseta
  // un anillo de tinta se lava a UN solo valor oscuro y el ojo lee agujero
  // troquelado (v11, medido en la captura). Además el hueco tallado ya se pinta
  // solo — rel<0 lerp a grieta en fusteGeo. Queda lo que un párpado real da:
  // sombra arrojada ARRIBA del globo y un asiento suave que lo abraza abajo.
  luz -= 0.58 * bulto(ax - 0.42, sy - 0.46, 0.28, 0.15);
  luz -= 0.26 * bulto(ax - 0.42, sy - 0.24, 0.23, 0.22);

  // NARIZ: crestón claro y los dos flancos en sombra — más contraste: es el
  // rasgo que sostiene la cara entre los ojos y la boca.
  luz += 0.72 * bulto(sx, sy - 0.12, 0.135, 0.44);
  luz -= 0.62 * bulto(ax - 0.26, sy - 0.06, 0.14, 0.40);

  // BOCA: el surco va en tinta llena, con el labio de abajo realzado.
  // (v13) misma curva grave (casi recta, puntas caídas) que el relieve.
  const yBoca = -0.62 - 0.035 * Math.pow(sat(ax / 0.62), 2);
  const anchoBoca = suave(1 - Math.abs(sx) / 0.78);
  // (v12) la tinta del tajo se queda (ayuda con luz directa) pero el NEGRO de
  // la boca ya no depende de ella: lo pone una malla propia dentro del tajo,
  // porque el piso emissive lava cualquier tinta en sombra (medido: la sonda
  // daba pintura=-0.90 en el vértice y la captura mostraba corteza plana).
  // Lo que sí lee bajo el emissive es el REALCE: los cantos suben.
  // (v14) la tinta del tajo baja a MEDIA sombra: el negro de la boca ya no es
  // un hueco pintado — es el torus-hendidura cerrado. La tinta queda de
  // oclusión bajo el labio, no de boca abierta.
  luz -= 0.48 * anchoBoca * suave(1 - Math.abs(sy - yBoca) / 0.10);    // sombra del pliegue
  luz += 0.68 * anchoBoca * bulto(0, sy - (yBoca + 0.175), 1, 0.10);   // canto del labio de arriba
  luz += 0.62 * anchoBoca * bulto(0, sy - (yBoca - 0.185), 1, 0.11);   // canto del labio de abajo

  // pómulos y mentón: realce suave que sostiene el volumen
  luz += 0.26 * bulto(ax - 0.60, sy + 0.10, 0.32, 0.38);
  luz += 0.20 * bulto(sx, sy + 1.14, 0.44, 0.26);

  // arrugas de la frente y patas de gallo
  for (let i = 0; i < 3; i++) {
    const yy = 1.02 + i * 0.20;
    luz -= 0.50 * suave(1 - Math.abs(sx) / (0.74 - i * 0.10))
      * suave(1 - Math.abs(sy - yy - 0.05 * Math.cos(sx * 2.4)) / 0.038);
  }
  for (let i = 0; i < 2; i++) {
    luz -= 0.42 * suave(1 - Math.abs(ax - (0.74 + i * 0.10)) / 0.14)
      * suave(1 - Math.abs(sy - (0.30 - i * 0.20)) / 0.11);
  }

  const q = Math.sqrt((sx / 1.02) * (sx / 1.02) + (sy / 1.56) * (sy / 1.56));
  return Math.max(-1, Math.min(1, luz)) * suave((1 - q) / 0.32);
}

// ═════════════════════════════════════════════════════════════════════════════
//  LA SOMBRA DE LA BOCA — una cinta que tapiza el interior del tajo.
//  ⛔ (v14) ARCHIVADA — nadie la llama. La boca cerrada ahora es un
//  torus-hendidura (fórmula roble/aliso/ceiba, ver crearEntParamo): esta cinta
//  era el interior del óvalo ABIERTO que el operador leyó "triste/cortado".
//  Se conserva como historia del porqué (el piso emissive lavaba la tinta).
//
//  Por qué existe (v12, medido): el tajo SÍ estaba — relieve -0,46 m y tinta
//  -0,90 en el vértice, la sonda lo confirmó — y en pantalla había corteza
//  plana. El mecanismo: matCorteza lleva un piso emissive global (emissiveMap
//  × 0,085) que NO se multiplica por el color de vértice; en la sombra de la
//  roseta ese piso les pone a la tinta de la boca y a la mejilla EL MISMO
//  valor y el contraste muere. Los ojos nunca tuvieron ese problema porque su
//  negro es GEOMETRÍA (el globo), no tinta. La boca ahora hace lo mismo: una
//  malla propia, sin emissive, siempre más oscura que cualquier corteza — se
//  lee a 1 m y a 10 m, con el sol donde esté.
//  Sigue la MISMA curva que relieveCara/pinturaCara (yBoca, anchoBoca) y se
//  asienta 2 cm por encima del piso tallado del tajo: los labios la enmarcan,
//  no es una calcomanía flotando.
// ═════════════════════════════════════════════════════════════════════════════
function bocaSombraGeo(THREE, perfil, alto, caraY) {
  const nS = 30, nV = 5;
  const pos = new Float32Array(nS * nV * 3);
  const col = new Float32Array(nS * nV * 3);
  const idx = [];
  const cCentro = new THREE.Color('#0c0702');
  const cBorde = new THREE.Color('#3a2612');
  const tmp = new THREE.Color();
  for (let i = 0; i < nS; i++) {
    const t = i / (nS - 1);
    const sx = (t * 2 - 1) * 0.70;                                     // unidades de rostro
    const yB = -0.62 - 0.035 * Math.pow(sat(Math.abs(sx) / 0.62), 2);  // (v13) grave, sin sonrisa
    const ancho = suave(1 - Math.abs(sx) / 0.78);
    const medioAlto = 0.026 + 0.062 * ancho;                           // se afina en las comisuras
    for (let j = 0; j < nV; j++) {
      const s = (j / (nV - 1)) * 2 - 1;
      const sy = yB + s * medioAlto;
      const y = caraY + sy * ESC_CARA;
      const r0 = perfil(y / alto);
      const rel = relieveCara(sx, sy) * 1.38 * ESC_CARA;
      // 2 cm por encima del piso del tajo, un pelo más hundida en los bordes
      const rr = r0 + rel + 0.020 - Math.abs(s) * 0.008;
      const a = (sx * ESC_CARA) / r0;
      const k = (i * nV + j) * 3;
      pos[k] = Math.sin(a) * rr; pos[k + 1] = y; pos[k + 2] = Math.cos(a) * rr;
      tmp.copy(cCentro).lerp(cBorde, Math.pow(Math.abs(s), 1.7) * 0.85 + Math.pow(Math.abs(sx) / 0.70, 3.0) * 0.35);
      col[k] = tmp.r; col[k + 1] = tmp.g; col[k + 2] = tmp.b;
    }
  }
  for (let i = 0; i < nS - 1; i++) {
    for (let j = 0; j < nV - 1; j++) {
      const a = i * nV + j, b = a + 1, c = a + nV, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ═════════════════════════════════════════════════════════════════════════════
//  EL FUSTE — columna esculpida con el rostro dentro de la corteza.
// ═════════════════════════════════════════════════════════════════════════════
function fusteGeo(THREE, cfg) {
  const { alto, caraY, radial, altura } = cfg;
  const rn = prng(cfg.semilla ?? 99);
  const ruidoOff = rn() * 40;

  // el rostro va al frente: azimut 0 → +Z. Densidad ×2,6 ahí.
  const us = muestreo(radial, (u) => {
    const a = u * Math.PI * 2;
    const d = Math.min(Math.abs(a), Math.PI * 2 - Math.abs(a));
    return 1 + 1.9 * Math.exp(-(d / 0.62) * (d / 0.62));
  });
  const vs = muestreo(altura, (v) => 1 + 2.0 * Math.exp(-Math.pow((v - caraY / alto) / 0.115, 2)));

  const perfil = (v) => {
    // pie acampanado → fuste que apenas adelgaza → hombros bajo la roseta
    const pie = 0.30 * Math.exp(-Math.pow(v / 0.075, 1.6));
    const hombro = 0.10 * Math.exp(-Math.pow((v - 0.80) / 0.13, 2));
    return 0.86 + pie + hombro - 0.090 * v;
  };

  const NX = us.length, NY = vs.length;
  const nv = NX * NY;
  const pos = new Float32Array(nv * 3);
  const uv = new Float32Array(nv * 2);
  const col = new Float32Array(nv * 3);
  const idx = [];
  const base = new THREE.Color(C.corteza);
  const clara = new THREE.Color(C.cortezaClara);
  const oscura = new THREE.Color(C.grieta);
  const musgo = new THREE.Color(C.musgo);
  const tmp = new THREE.Color();

  for (let iy = 0; iy < NY; iy++) {
    const v = vs[iy];
    const y = v * alto;
    const r0 = perfil(v);
    for (let ix = 0; ix < NX; ix++) {
      const u = us[ix];
      const a = u * Math.PI * 2;
      const aFirmado = a > Math.PI ? a - Math.PI * 2 : a;

      // el rostro. Se calcula PRIMERO porque el ruido de corteza hay que
      // apagarlo donde está la cara: si compiten, el rostro se pierde entre
      // las vetas y el Ent queda con cara de nada (falla de v1).
      const sx = aFirmado * r0;
      const envCara = suave((1 - Math.sqrt((sx / (1.14 * ESC_CARA)) * (sx / (1.14 * ESC_CARA))
        + ((y - caraY) / (1.78 * ESC_CARA)) * ((y - caraY) / (1.78 * ESC_CARA)))) / 0.34);
      const dCara = relieveCara(sx / ESC_CARA, (y - caraY) / ESC_CARA) * 1.38 * ESC_CARA;

      // vetas verticales + grietas hondas (amortiguadas sobre el rostro)
      const kRuido = 1 - 0.90 * envCara;
      const veta = fbm(a * 2.6 + ruidoOff, y * 0.95, 4) - 0.5;
      const finas = fbm(a * 9.5, y * 3.4 + ruidoOff, 3) - 0.5;
      // (v11) el surco era UN seno de frecuencia fija: 11 canales verticales
      // idénticos de pie a copa — tablones contables, la mitad del "cartón".
      // Ahora son dos familias desfasadas y la profundidad RESPIRA con fbm: la
      // grieta aparece, se hunde y se pierde, como corteza vieja de verdad.
      const s1 = Math.pow(Math.abs(Math.sin(a * 3.1 + fbm(a * 1.4, y * 0.55, 2) * 5.0)), 6.0);
      const s2 = Math.pow(Math.abs(Math.sin(a * 7.3 + 1.7 + fbm(a * 2.2, y * 0.31, 2) * 4.2)), 4.0);
      const vive = 0.30 + 0.70 * fbm(a * 1.1 + 9.3, y * 0.42, 2);
      const surco = (s1 * 0.65 + s2 * 0.35) * vive;
      let r = r0 + (veta * 0.075 + finas * 0.028 - surco * 0.066) * kRuido + dCara;

      pos[(iy * NX + ix) * 3] = Math.sin(a) * r;
      pos[(iy * NX + ix) * 3 + 1] = y;
      pos[(iy * NX + ix) * 3 + 2] = Math.cos(a) * r;
      uv[(iy * NX + ix) * 2] = u * 3;
      uv[(iy * NX + ix) * 2 + 1] = v * 2.4;

      // color: lo hundido se ensombrece, lo saliente se aclara; musgo en el pie
      const rel = r - r0;
      tmp.copy(base);
      // (v11) más respuesta: el mapa se suavizó a papel tonal, así que la
      // grieta y el canto los dibuja ESTE contraste, que en el rostro va
      // amortiguado por kRuido y no ensucia los rasgos.
      if (rel < 0) tmp.lerp(oscura, Math.min(0.92, -rel * 2.9));
      else tmp.lerp(clara, Math.min(0.68, rel * 1.8));
      const mancha = fbm(a * 3.1 + 17, y * 1.7 + 5, 3);
      if (mancha > 0.60) tmp.lerp(musgo, (mancha - 0.60) * 1.0 * (1 - suave((v - 0.10) / 0.55)));
      tmp.multiplyScalar(0.80 + 0.30 * suave(v * 1.6));
      // LUZ PINTADA sobre el rostro. La roseta le hace sombra al fuste siempre
      // (es física correcta) y el rostro rendía NEGRO: se perdía el personaje.
      // En una lámina ilustrada la luz se PINTA, no se calcula.
      // OJO: tiene que ser MULTIPLICACIÓN pura. Con un lerp hacia el tono claro
      // (v5) subía el piso de todo por igual y se comían el surco de la boca y
      // la sombra bajo las cejas: la cara quedaba plana y luminosa. Multiplicar
      // conserva la RAZÓN entre lo hundido y lo saliente, que es el modelado.
      if (envCara > 0) {
        tmp.multiplyScalar(1 + envCara * 1.75);
        const luz = pinturaCara(sx / ESC_CARA, (y - caraY) / ESC_CARA);
        if (luz < 0) tmp.lerp(oscura, -luz * 0.82);
        else if (luz > 0) tmp.lerp(clara, luz * 0.70);
      }
      col[(iy * NX + ix) * 3] = tmp.r;
      col[(iy * NX + ix) * 3 + 1] = tmp.g;
      col[(iy * NX + ix) * 3 + 2] = tmp.b;
    }
  }
  for (let iy = 0; iy < NY - 1; iy++) {
    for (let ix = 0; ix < NX - 1; ix++) {
      const a = iy * NX + ix, b = a + 1, c = a + NX, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { geo: g, perfil };
}

// ═════════════════════════════════════════════════════════════════════════════
//  RAÍCES — el Ent se ASIENTA, no se apoya. Tubos cónicos que se hunden en la
//  turba y la levantan un poco. Es la mitad del peso de la silueta.
// ═════════════════════════════════════════════════════════════════════════════
function raizGeo(THREE, rn, angulo, largo, grosor) {
  const pasos = 9, lados = 7;
  const pos = [], col = [], uv = [], idx = [];
  const base = new THREE.Color(C.cortezaOscura);
  const punta = new THREE.Color(C.corteza);
  const tmp = new THREE.Color();
  const desvio = (rn() - 0.5) * 0.55;
  const pts = [];
  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos;
    const rr = largo * t;
    const a = angulo + desvio * t * t;
    pts.push(new THREE.Vector3(Math.sin(a) * rr, 0.72 * (1 - t) * (1 - t) - 0.16 * t, Math.cos(a) * rr));
  }
  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos;
    const r = grosor * (1 - t * 0.86) * (0.85 + 0.3 * Math.sin(t * 7));
    const p = pts[i];
    const sig = pts[Math.min(pasos, i + 1)], ant = pts[Math.max(0, i - 1)];
    const eje = new THREE.Vector3().subVectors(sig, ant).normalize();
    const lateral = new THREE.Vector3(-eje.z, 0, eje.x).normalize();
    const arriba = new THREE.Vector3().crossVectors(eje, lateral).normalize();
    tmp.copy(base).lerp(punta, t * 0.7);
    for (let j = 0; j < lados; j++) {
      const ang = (j / lados) * Math.PI * 2;
      const ondulacion = 1 + 0.16 * Math.sin(ang * 3 + t * 6);
      const x = p.x + (lateral.x * Math.cos(ang) + arriba.x * Math.sin(ang)) * r * ondulacion;
      const y = p.y + (lateral.y * Math.cos(ang) + arriba.y * Math.sin(ang)) * r * ondulacion;
      const z = p.z + (lateral.z * Math.cos(ang) + arriba.z * Math.sin(ang)) * r * ondulacion;
      pos.push(x, y, z);
      uv.push(j / lados * 1.4, t * 1.6);
      col.push(tmp.r, tmp.g, tmp.b);
    }
  }
  for (let i = 0; i < pasos; i++) {
    for (let j = 0; j < lados; j++) {
      const j2 = (j + 1) % lados;
      const a = i * lados + j, b = i * lados + j2, c = (i + 1) * lados + j, d = (i + 1) * lados + j2;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ═════════════════════════════════════════════════════════════════════════════
//  CAPÍTULO — la flor del frailejón. Lígulas amarillas en cuenco + disco pardo.
//  ACENTO, no protagonista: verde dominante manda.
// ═════════════════════════════════════════════════════════════════════════════
function capituloGeo(THREE, r, rn) {
  const partes = [];
  const nLig = 15;
  for (let i = 0; i < nLig; i++) {
    const a = (i / nLig) * Math.PI * 2 + rn() * 0.12;
    const lig = hojaGeo(THREE, {
      len: r * 1.25, wid: r * 0.40, secciones: 4, lateral: 3, canal: 0.14, arco: 0.16,
      base: C.flor, punta: C.florClara, borde: C.florCentro,
    });
    ponerHoja(lig, a, 0.16 + rn() * 0.16, r * 0.30, 0);
    partes.push(lig);
  }
  const disco = new THREE.SphereGeometry(r * 0.44, 12, 8);
  disco.scale(1, 0.48, 1);
  const cd = new THREE.Color(C.florCentro);
  const nd = disco.attributes.position.count;
  const cArr = new Float32Array(nd * 3);
  for (let i = 0; i < nd; i++) { cArr[i * 3] = cd.r; cArr[i * 3 + 1] = cd.g; cArr[i * 3 + 2] = cd.b; }
  disco.setAttribute('color', new THREE.BufferAttribute(cArr, 3));
  partes.push(disco);
  return partes;
}

// ═════════════════════════════════════════════════════════════════════════════
//  CARDS sueltos (halo de pelusa, greñas de necromasa, cojines de musgo).
//  Quads orientados hacia afuera con jitter; el alpha de la textura hace el
//  resto. Sale una sola geometría fusionada = un draw call.
// ═════════════════════════════════════════════════════════════════════════════
function cardsGeo(THREE, muestras, rn, opts = {}) {
  const jitter = opts.jitter ?? 0.42;
  const P = [], N = [], UV = [], COL = [];
  const q = new THREE.Quaternion(), rollQ = new THREE.Quaternion();
  const zEje = new THREE.Vector3(0, 0, 1);
  const dir = new THREE.Vector3(), ejeRoll = new THREE.Vector3();
  const esq = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const gauss = () => (rn() + rn() + rn()) - 1.5;

  for (const m of muestras) {
    dir.set(m.n[0] + gauss() * jitter, m.n[1] + gauss() * jitter * 0.6, m.n[2] + gauss() * jitter);
    if (dir.lengthSq() < 1e-5) dir.set(0, 1, 0);
    dir.normalize();
    q.setFromUnitVectors(zEje, dir);
    if (opts.rodar !== false) {
      ejeRoll.copy(dir);
      rollQ.setFromAxisAngle(ejeRoll, rn() * Math.PI * 2);
      q.premultiply(rollQ);
    } else {
      // sin roll: el card conserva "arriba" (para greñas que cuelgan)
      ejeRoll.copy(dir);
      rollQ.setFromAxisAngle(ejeRoll, (rn() - 0.5) * 0.5);
      q.premultiply(rollQ);
    }
    const w = m.w * 0.5, h = m.h * 0.5;
    // el pivote va en el borde superior cuando el card cuelga
    const dy = opts.colgar ? -h : 0;
    esq[0].set(-w, -h + dy, 0); esq[1].set(w, -h + dy, 0); esq[2].set(w, h + dy, 0); esq[3].set(-w, h + dy, 0);
    for (const v of esq) { v.applyQuaternion(q); v.x += m.p[0]; v.y += m.p[1]; v.z += m.p[2]; }
    const espejo = rn() < 0.5;
    const orden = [0, 1, 2, 0, 2, 3];
    const uvs = [[espejo ? 1 : 0, 0], [espejo ? 0 : 1, 0], [espejo ? 0 : 1, 1], [espejo ? 1 : 0, 1]];
    const c = m.c ?? [1, 1, 1];
    for (let k = 0; k < 6; k++) {
      const iV = orden[k], v = esq[iV];
      P.push(v.x, v.y, v.z);
      N.push(dir.x, dir.y, dir.z);
      UV.push(uvs[iV][0], uvs[iV][1]);
      COL.push(c[0], c[1], c[2]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(N), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(UV), 2));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(COL), 3));
  g.computeBoundingSphere();
  return g;
}

// ═════════════════════════════════════════════════════════════════════════════
//  LA ROSETA — la melena plateada.
//
//  v1 salió PALMERA y hubo que rehacerla. Las dos causas, anotadas para que no
//  se repitan: (a) la corona externa caía por debajo de la horizontal, y una
//  roseta que cae es una palma — el frailejón apunta ARRIBA, como alcachofa;
//  (b) las palas eran anchas y largas (2,6:1) y se contaban una por una.
//  El frailejón aprobado 8/10 del proyecto tiene hoja de ~5:1 y roseta de
//  diámetro ≈ 0,47 × la altura de la planta. Aquí se respeta esa proporción y
//  se compensa la finura con CANTIDAD: 7 coronas, 253 palas que se solapan.
//  La corona externa queda casi horizontal con la punta caída (arco alto): ese
//  collar volado es lo que abre la silueta y evita la columna con punta.
const CORONAS = [
  { n: 66, len: 2.16, wid: 0.60, rad: 0.66, tilt: 0.30, y: 0.00, arco: 0.46 },
  { n: 58, len: 2.06, wid: 0.56, rad: 0.55, tilt: 0.58, y: 0.22, arco: 0.36 },
  { n: 49, len: 1.92, wid: 0.52, rad: 0.45, tilt: 0.84, y: 0.44, arco: 0.28 },
  { n: 40, len: 1.70, wid: 0.48, rad: 0.36, tilt: 1.06, y: 0.64, arco: 0.20 },
  { n: 31, len: 1.38, wid: 0.42, rad: 0.26, tilt: 1.24, y: 0.82, arco: 0.14 },
  { n: 22, len: 1.04, wid: 0.35, rad: 0.17, tilt: 1.40, y: 0.97, arco: 0.09 },
  { n: 14, len: 0.67, wid: 0.27, rad: 0.07, tilt: 1.52, y: 1.08, arco: 0.05 },
];

// ═════════════════════════════════════════════════════════════════════════════
//  FÁBRICA
// ═════════════════════════════════════════════════════════════════════════════
export function crearEntParamo(THREE, opts = {}) {
  const rn = prng(opts.semilla ?? 20260806);
  const detalle = opts.detalle ?? 'alto';          // 'alto' | 'medio'
  const k = detalle === 'medio' ? 0.55 : 1;
  const ALTO = opts.alto ?? 8.6;                   // fuste; con la roseta ≈ 10,4 m
  const CARA_Y = ALTO * 0.615;
  const aniso = opts.anisotropia ?? 8;

  const grupo = new THREE.Group();
  grupo.name = 'ent-paramo';

  // ── texturas ───────────────────────────────────────────────────────────────
  const texCorteza = texturaCorteza(THREE, { semilla: 5501, aniso });
  const texHoja = texturaHojaPubescente(THREE, { semilla: 913, aniso });
  const texPelo = texturaPelo(THREE, { semilla: 4021, aniso });
  const texPeloSuelto = texturaPelo(THREE, { semilla: 6143, aniso, radial: true });
  const texNecro = texturaNecromasa(THREE, { semilla: 7717, aniso });
  const texMusgo = texturaMusgo(THREE, { semilla: 331 });

  // ── materiales (lámina ilustrada: roughness 1, metalness 0, sin PBR) ───────
  const matCorteza = new THREE.MeshStandardMaterial({
    map: texCorteza, vertexColors: true, roughness: 1, metalness: 0,
    // piso de luz: la corteza vive bajo la sombra de su propia roseta y sin
    // esto rinde negra plana en cuanto el sol no la toca de frente.
    // (v11) sube de 0,05: al calmar el mapa el frente quedaba en lodo pardo y
    // el rostro no despegaba de su propia sombra.
    emissive: new THREE.Color(0xffffff), emissiveMap: texCorteza, emissiveIntensity: 0.085,
  });
  const matHoja = new THREE.MeshStandardMaterial({
    map: texHoja, vertexColors: true, roughness: 1, metalness: 0, side: THREE.DoubleSide,
    // translucidez de hoja: sin esto, la panza de la roseta a contraluz rinde negra
    emissive: new THREE.Color(0xffffff), emissiveMap: texHoja, emissiveIntensity: 0.16,
  });
  // el pelo es lo que ENCIENDE a contraluz: ahí está la firma del frailejón.
  // Pero el emissive alto lo volvía nieve y se comía el verde dominante (v1),
  // así que va bajo y el brillo lo pone la luz rasante, no el material.
  const matPelo = new THREE.MeshStandardMaterial({
    map: texPelo, alphaMap: texPelo, transparent: true, alphaTest: 0.05, depthWrite: false,
    side: THREE.DoubleSide, roughness: 1, metalness: 0, vertexColors: true,
    emissive: new THREE.Color(0xffffff), emissiveMap: texPelo, emissiveIntensity: 0.24,
  });
  const matPeloHalo = new THREE.MeshStandardMaterial({
    map: texPeloSuelto, alphaMap: texPeloSuelto, transparent: true, alphaTest: 0.04,
    depthWrite: false, side: THREE.DoubleSide, roughness: 1, metalness: 0, vertexColors: true,
    emissive: new THREE.Color(0xffffff), emissiveMap: texPeloSuelto, emissiveIntensity: 0.20,
  });
  const matNecro = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 1, metalness: 0, side: THREE.DoubleSide,
  });
  // greñas y musgo van en RECORTE DURO (alphaTest alto, depthWrite, sin
  // transparencia): apiladas en semitransparente se lavaban unas con otras y la
  // falda quedaba con un halo gris de pelambre en la silueta.
  const matGrenas = new THREE.MeshStandardMaterial({
    map: texNecro, alphaMap: texNecro, alphaTest: 0.45,
    side: THREE.DoubleSide, roughness: 1, metalness: 0, vertexColors: true,
  });
  const matMusgo = new THREE.MeshStandardMaterial({
    map: texMusgo, alphaMap: texMusgo, alphaTest: 0.40,
    side: THREE.DoubleSide, roughness: 1, metalness: 0, vertexColors: true,
  });
  const matFlor = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.95, metalness: 0, side: THREE.DoubleSide,
    // a contraluz los capítulos rendían negros; el amarillo del frailejón es
    // acento y tiene que leerse aunque el sol venga por detrás
    emissive: new THREE.Color(C.flor), emissiveIntensity: 0.30,
  });
  // (v12) el globo deja de ser negro-vacío: pardo cálido oscuro, para que el
  // anillo alrededor del ámbar lea "madera en sombra" y no "hueco troquelado".
  // La pupila sí es casi negra — su contraste es CONTRA EL ÁMBAR, no contra
  // otro negro, y eso es lo que da dirección de mirada.
  const matGlobo = new THREE.MeshStandardMaterial({ color: '#31200e', roughness: 1, metalness: 0 });
  // (v14) el pozo de la cuenca: más oscuro que el globo — es la sombra del
  // hueco, el escalón que hace leer el ojo HUNDIDO y no pegado a la corteza.
  const matPozo = new THREE.MeshStandardMaterial({ color: '#150c04', roughness: 1, metalness: 0 });
  const matPupila = new THREE.MeshStandardMaterial({ color: C.ojo, roughness: 1, metalness: 0 });
  const matIris = new THREE.MeshStandardMaterial({
    color: C.ambar, roughness: 0.9, metalness: 0,
    emissive: new THREE.Color(C.ambarHondo), emissiveIntensity: 0.35,
  });

  // ── FUSTE + RAÍCES (una sola malla de corteza) ─────────────────────────────
  const { geo: geoFuste, perfil } = fusteGeo(THREE, {
    alto: ALTO, caraY: CARA_Y, semilla: 99,
    radial: detalle === 'medio' ? 62 : 104,
    altura: detalle === 'medio' ? 70 : 120,
  });
  const piezasCorteza = [geoFuste];
  const nRaices = detalle === 'medio' ? 5 : 8;
  for (let i = 0; i < nRaices; i++) {
    const a = (i / nRaices) * Math.PI * 2 + rn() * 0.34;
    piezasCorteza.push(raizGeo(THREE, rn, a, 1.5 + rn() * 1.5, 0.24 + rn() * 0.13));
  }
  const mallaCorteza = new THREE.Mesh(fusionarPreservando(THREE, piezasCorteza), matCorteza);
  mallaCorteza.name = 'corteza';
  mallaCorteza.castShadow = true;
  mallaCorteza.receiveShadow = true;
  grupo.add(mallaCorteza);

  // ── LOS RASGOS (v14): la fórmula geométrica de roble/aliso/ceiba ──────────
  // Trece versiones de cara pintada nunca alcanzaron a los 3 Ents-referente
  // (construirEntRoble/construirEntAliso/ceiba.js): sus rasgos son PRIMITIVAS
  // con volumen real — cuenca-esfera + ceja-caja + globo + iris CHICO (2:1) +
  // nariz-cono + boca-torus CERRADA — y por eso leen ancestrales y no muñeco.
  // v14 adopta ese molde encima de la corteza tallada (que queda de fondo).
  // Gesto objetivo (operador): SERIO, medio bravo, imponente — ceño de visera
  // caído hacia el entrecejo, boca firme casi recta. Ni tristeza ni sonrisa.
  const matMaderaCara = new THREE.MeshStandardMaterial({
    map: texCorteza, color: '#7a5c3a', roughness: 1, metalness: 0,
  });
  const matBocaCerrada = new THREE.MeshStandardMaterial({ color: '#241708', roughness: 1, metalness: 0 });

  // BOCA: hendidura CERRADA, casi recta, puntas apenas caídas (6 cm en 1,25 m
  // de ancho). Torus de radio GRANDE y arco corto: curva suave sin aplastar el
  // tubo (un torus chico escalado en Y deja el tubo como cinta plana).
  {
    const R_BOCA = 3.26, MEDIO_ARCO = 0.193, TUBO = 0.062;
    const yBocaMundo = CARA_Y - 0.62 * ESC_CARA;
    const rBoca = perfil(yBocaMundo / ALTO);
    const boca = new THREE.Mesh(new THREE.TorusGeometry(R_BOCA, TUBO, 6, 26, MEDIO_ARCO * 2), matBocaCerrada);
    // el arco nace en θ=0 (+X): girarlo π/2−α lo centra arriba (∩ suave)
    boca.rotation.z = Math.PI / 2 - MEDIO_ARCO;
    boca.position.set(0, yBocaMundo - R_BOCA, rBoca + 0.16);
    boca.name = 'boca';
    grupo.add(boca);
  }

  // NARIZ: el cono-puente entre los ojos (mismo molde que los 3 referentes),
  // medio hundido en la cresta nasal tallada para que nazca de la corteza.
  {
    // larga como en el roble (allí mide ~la mitad de la cara): corta leía como
    // pico de búho entre los ojos, no como puente que sostiene el rostro.
    const yNariz = CARA_Y + 0.06;
    const rNariz = perfil(yNariz / ALTO);
    const nariz = new THREE.Mesh(new THREE.ConeGeometry(0.17 * ESC_CARA, 0.95 * ESC_CARA, 5), matMaderaCara);
    nariz.rotation.x = Math.PI;
    nariz.position.set(0, yNariz, rNariz + 0.22);
    nariz.name = 'nariz';
    grupo.add(nariz);
  }

  // ── LOS OJOS dentro de las cuencas ────────────────────────────────────────
  // Van en grupos propios porque son lo ÚNICO que se mueve para seguirte: el
  // Ent no gira la cabeza (es corteza), te sigue con la mirada. Eso es lo que
  // da la quietud imponente en vez de un muñeco que voltea.
  // (v14) los PÁRPADOS de casquete se van: con textura de corteza clara leían
  // como ESCLERÓTICA gigante alrededor del ámbar — el "anillo claro de muñeco"
  // de la captura F21. El molde referente no los usa: la cuenca-esfera oscura y
  // la ceja-caja ponen la sombra, y el parpadeo lo hace el iris (scale.y),
  // igual que en construirEntRoble. Menos piezas, cero anillos.
  const rCara = perfil(CARA_Y / ALTO);
  const ojos = [];
  for (const signo of [-1, 1]) {
    const ax = 0.42 * ESC_CARA * signo;
    const ang = ax / rCara;
    // (v13) el ojo se HUNDE en la cuenca (antes el globo sobresalía de la cara:
    // ojo saltón de muñeco). La cuenca tallada mide ~0,53 m de hondo: hay
    // sitio — a 0,22 el globo queda por delante de la pared tallada (−0,46 vs
    // −0,53) y el conjunto ojo+párpados deja de asomar como binóculo.
    const cx = Math.sin(ang) * (rCara - 0.22);
    const cz = Math.cos(ang) * (rCara - 0.22);
    const cy = CARA_Y + 0.28 * ESC_CARA;

    const nido = new THREE.Group();
    nido.position.set(cx, cy, cz);
    // (v13) la montura se APLANA: con el ángulo crudo del cilindro (0,59 rad)
    // cada cuenca miraba 34° hacia afuera y la mirada, para centrarse, pedía
    // más yaw del que el clamp permitía — los dos iris quedaban CLAVADOS en el
    // tope, convergiendo: el ojo bizco de la captura. Un rostro tallado aplana
    // sus cuencas al frente; 0,35 del arco basta para que el iris alcance el
    // centro sin salirse del casquete visible.
    nido.rotation.y = ang * 0.35;

    // el POZO: la cuenca-esfera oscura del molde referente, hundida en la
    // cuenca tallada de la corteza — el hueco se lee hondo aunque la luz
    // difusa aplane el relieve.
    const pozo = new THREE.Mesh(new THREE.SphereGeometry(0.26 * ESC_CARA, 14, 10), matPozo);
    pozo.position.z = -0.12 * ESC_CARA;
    pozo.scale.set(1.15, 1.25, 0.7);
    nido.add(pozo);

    // la CEJA-CAJA: visera pesada con el extremo INTERNO caído al entrecejo —
    // el ceño serio. En el molde referente rotation.z = signo·0,18 ya baja el
    // canto interno; aquí sube a 0,24: reproche digno, no saludo.
    const ceja = new THREE.Mesh(new THREE.BoxGeometry(0.68 * ESC_CARA, 0.16 * ESC_CARA, 0.30 * ESC_CARA), matMaderaCara);
    ceja.position.set(0.02 * ESC_CARA * signo, 0.205 * ESC_CARA, 0.12 * ESC_CARA);
    ceja.rotation.z = signo * 0.24;
    ceja.rotation.x = 0.22;   // la visera se vuelca sobre el ojo: encapota, no saluda
    nido.add(ceja);

    // el GLOBO oscuro y el IRIS CHICO (proporción globo:iris ≈ 2:1 — la del
    // molde referente; a 1:1 el ojo era plato de muñeco, medido en F21).
    const globo = new THREE.Mesh(new THREE.SphereGeometry(0.19 * ESC_CARA, 20, 14), matGlobo);
    nido.add(globo);
    const R_IRIS = 0.095 * ESC_CARA;
    const Z_IRIS = 0.20 * ESC_CARA;
    const iris = new THREE.Mesh(new THREE.SphereGeometry(R_IRIS, 18, 14), matIris);
    iris.position.set(0, 0, Z_IRIS);
    nido.add(iris);

    // pupila y brillo van COLGADOS del iris: sueltos se quedaban quietos
    // mientras el iris seguía a la cámara y le salía un mordisco negro al ojo.
    // El centro de la pupila va a sqrt(Ri²−rp²): casquete A RAS del ámbar.
    const R_PUP = 0.050 * ESC_CARA;
    const pupila = new THREE.Mesh(new THREE.SphereGeometry(R_PUP, 14, 10), matPupila);
    pupila.position.set(0, 0, Math.sqrt(R_IRIS * R_IRIS - R_PUP * R_PUP));
    pupila.scale.set(1, 1, 0.45);
    iris.add(pupila);

    // el brillo vive EN la superficie (mitad afuera), arriba-afuera del iris.
    // (v13) chico y apagado: una chispa de vida, no el destello de caricatura.
    const brillo = new THREE.Mesh(new THREE.SphereGeometry(0.011 * ESC_CARA, 8, 6), new THREE.MeshBasicMaterial({ color: 0xdfd3b4 }));
    brillo.position.set(-0.036 * ESC_CARA * signo, 0.040 * ESC_CARA, 0.082 * ESC_CARA);
    iris.add(brillo);

    grupo.add(nido);
    ojos.push({ nido, iris });
  }

  // ── LA FALDA DE NECROMASA ─────────────────────────────────────────────────
  // Las hojas muertas marcescentes: el abrigo térmico real del frailejón. Va
  // desde el pie hasta bajo la roseta y deja una VENTANA en el rostro — la
  // necromasa se abrió y por ahí mira el Ent.
  const yFalda0 = 0.42, yFalda1 = ALTO - 0.25;
  const anillos = detalle === 'medio' ? 19 : 34;
  const porAnillo = detalle === 'medio' ? 27 : 44;
  const ventana = (a, y) => {
    // hueco del rostro: la necromasa se abrió y por ahí mira el Ent.
    // OJO: `a` viene acumulando el desfase de anillo y se pasa de 2π — hay que
    // envolverlo ANTES de firmarlo. Sin esto la ventana se abre en ángulos al
    // azar y la cara queda tapada (bug de v2, costó una pasada entera).
    const env = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const aFirmado = env > Math.PI ? env - Math.PI * 2 : env;
    // ancho de la ventana ≈ ancho del ROSTRO (±1,18 m de arco). Con ±0,76 m
    // (v5) la necromasa tapaba cejas y pómulos y la cara perdía los bordes.
    // (v14) la ventana ENCOGE: con 1,40/3,40 el claro era un panel pelado de
    // medio fuste — el "corte rarísimo" que el operador leyó como tronco
    // rebanado. La falda vuelve a arrimarse a la cara sin taparla (el test de
    // ancla+punta de abajo sigue protegiendo cejas y boca).
    const dx = Math.abs(aFirmado) / 1.28;
    // MUY asimétrica hacia arriba: una hoja anclada por encima de la cara CUELGA
    // y se la tapa igual. Lo que hay que despejar no es la altura del rostro,
    // es todo lo que pueda caer sobre él.
    const dy = (y - CARA_Y) / (y > CARA_Y ? 2.60 : 2.05);
    return Math.sqrt(dx * dx + dy * dy) < 1;
  };
  const hojasFalda = [];
  const muestrasGrenas = [];
  const cNecro = [new THREE.Color(C.necroVieja), new THREE.Color(C.necroBaja),
    new THREE.Color(C.necroMedia), new THREE.Color(C.necroAlta)];
  for (let ai = 0; ai < anillos; ai++) {
    const t = ai / (anillos - 1);
    const y = yFalda0 + t * (yFalda1 - yFalda0);
    const r0 = perfil(y / ALTO);
    // más viejas y grises abajo, más ocres arriba
    const tono = cNecro[0].clone().lerp(cNecro[1], suave(t * 2.1))
      .lerp(cNecro[2], suave((t - 0.3) * 1.8)).lerp(cNecro[3], suave((t - 0.66) * 2.4));
    for (let j = 0; j < porAnillo; j++) {
      const a = (j / porAnillo) * Math.PI * 2 + ai * 0.31 + rn() * 0.10;
      // la falda tiene que ser GORDA: el abrigo de necromasa de un frailejón
      // viejo es más ancho que su fuste. Se escalona en tres radios para que
      // haga bulto y no se vea el tronco entre púa y púa.
      const capa = ai % 3;
      // el pie de la falda se deshilacha: si termina en corte recto, lee como
      // falda de disfraz y no como necromasa que se pudre contra la turba.
      const kPie = 0.42 + 0.58 * suave(t * 5.0);
      // Palas CORTAS. En v3 medían casi 2 m y a un metro de distancia cada una
      // se veía como un tablón: eso es exactamente "se cuentan las hojas". La
      // masa la tienen que hacer muchas chicas superpuestas, no pocas grandes.
      const largo = kPie * (0.78 + 0.42 * Math.sin(Math.PI * (0.25 + 0.75 * t))) * (0.78 + rn() * 0.46);
      // La hoja CUELGA: tapa el rostro si su ancla o su punta caen en la
      // ventana. Probar sólo el ancla (v4) dejaba palas cruzadas sobre la cara.
      if (ventana(a, y) || ventana(a, y - largo * 0.95)) continue;
      const tono2 = tono.clone().lerp(new THREE.Color(C.grieta), rn() * 0.26);
      const hoja = hojaGeo(THREE, {
        len: largo, wid: largo * 0.42, secciones: 4, lateral: 3,
        canal: 0.28, arco: 0.34 + rn() * 0.26, torsion: (rn() - 0.5) * 0.8,
        base: '#' + tono2.clone().multiplyScalar(0.70).getHexString(),
        punta: '#' + tono2.getHexString(),
        borde: '#' + tono2.clone().multiplyScalar(0.58).getHexString(),
      });
      ponerHoja(hoja, a, -0.72 - capa * 0.22 - rn() * 0.40, r0 + 0.05 + capa * 0.22 + rn() * 0.07, y + 0.06);
      hojasFalda.push(hoja);

      // greñas: cards colgantes que borran el filo de las hojas. Sin esto la
      // falda lee como una corona de púas contables, no como abrigo.
      // los cards son 2 triángulos: la masa sale barata por aquí, no subiendo
      // el conteo de palas geométricas.
      const nGrenas = rn() < 0.55 ? 3 : 2;
      for (let gi = 0; gi < nGrenas; gi++) {
        const rr = r0 + 0.26 + rn() * 0.42;
        const yy = y + 0.18 + rn() * 0.16;
        const hh = 0.95 + rn() * 0.95;
        if (ventana(a, yy) || ventana(a, yy - hh * 0.9)) continue;   // ancla Y punta
        muestrasGrenas.push({
          p: [Math.sin(a) * rr, yy, Math.cos(a) * rr],
          n: [Math.sin(a), 0.22, Math.cos(a)],
          w: 0.80 + rn() * 0.70,
          h: hh,
          c: [0.80 + rn() * 0.32, 0.76 + rn() * 0.30, 0.70 + rn() * 0.28],
        });
      }
    }
  }
  const mallaFalda = new THREE.Mesh(fusionarPreservando(THREE, hojasFalda), matNecro);
  mallaFalda.name = 'falda';
  mallaFalda.castShadow = true;
  grupo.add(mallaFalda);
  const mallaGrenas = new THREE.Mesh(cardsGeo(THREE, muestrasGrenas, rn, { jitter: 0.22, rodar: false, colgar: true }), matGrenas);
  mallaGrenas.name = 'grenas';
  grupo.add(mallaGrenas);

  // ── LA ROSETA (melena plateada) + su PELUSA ───────────────────────────────
  const roseta = new THREE.Group();
  roseta.name = 'roseta';
  roseta.position.y = ALTO - 0.12;
  const hojasRoseta = [];
  const flecos = [];
  const escCorona = detalle === 'medio' ? 0.62 : 1;
  for (const c of CORONAS) {
    const n = Math.max(6, Math.round(c.n * (detalle === 'medio' ? 0.62 : 1)));
    for (let j = 0; j < n; j++) {
      // jitter de casi un paso completo: en filas perfectas la roseta lee como
      // rehilete y se cuentan las hojas — que es justo lo prohibido.
      const a = (j / n) * Math.PI * 2 + c.y * 5.1 + (rn() - 0.5) * (Math.PI * 2 / n) * 0.9;
      const jl = 0.80 + rn() * 0.36;
      const nSec = 9, nLat = 5;
      const hoja = hojaGeo(THREE, {
        len: c.len * jl, wid: c.wid * (0.9 + rn() * 0.2), secciones: nSec, lateral: nLat,
        canal: 0.22, arco: c.arco + rn() * 0.06, torsion: (rn() - 0.5) * 0.34,
        base: C.hojaSombra, punta: rn() < 0.3 ? C.cogollo : C.plata, borde: '#7d8c72',
      });
      // el fleco se calcula SOBRE la hoja ya construida (comparte la curva)
      const fleco = flecoGeo(THREE, hoja, c.wid * 0.115, nSec, nLat);
      const tilt = c.tilt + (rn() - 0.5) * 0.16;
      ponerHoja(hoja, a, tilt, c.rad, c.y * escCorona, escCorona);
      ponerHoja(fleco, a, tilt, c.rad, c.y * escCorona, escCorona);
      hojasRoseta.push(hoja);
      flecos.push(fleco);
    }
  }
  // NÚCLEO de la roseta: un domo opaco en sombra bajo las palas. Sin él se ve
  // el cielo entre hoja y hoja y la corona se lee como rehilete de piezas
  // contables — misma doctrina que el núcleo de las copas de follaje-masa.
  const nucleo = new THREE.SphereGeometry(1.02, 22, 14);
  nucleo.scale(1, 0.62, 1);
  {
    const P = nucleo.attributes.position;
    const cN = new THREE.Color('#55654c');
    const cNb = new THREE.Color('#39472f');
    const arr = new Float32Array(P.count * 3);
    const tmpN = new THREE.Color();
    for (let i = 0; i < P.count; i++) {
      const yy = P.getY(i);
      // esculpido con ruido para que no lea como bola de plastilina asomando
      const v = new THREE.Vector3(P.getX(i), yy, P.getZ(i));
      const d = v.length() || 1;
      const k = 1 + (fbm(v.x / d * 2.4 + 9, v.z / d * 2.4 - v.y / d * 1.4, 3) - 0.5) * 0.34;
      v.multiplyScalar(k);
      P.setXYZ(i, v.x, v.y, v.z);
      tmpN.copy(cNb).lerp(cN, suave((v.y + 0.6) / 1.2));
      arr[i * 3] = tmpN.r; arr[i * 3 + 1] = tmpN.g; arr[i * 3 + 2] = tmpN.b;
    }
    nucleo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    nucleo.computeVertexNormals();
    nucleo.translate(0, 0.40, 0);
  }
  hojasRoseta.push(nucleo);
  const mallaRoseta = new THREE.Mesh(fusionarPreservando(THREE, hojasRoseta), matHoja);
  mallaRoseta.name = 'roseta-hojas';
  mallaRoseta.castShadow = true;
  roseta.add(mallaRoseta);
  const mallaFleco = new THREE.Mesh(fusionarPreservando(THREE, flecos), matPelo);
  mallaFleco.name = 'roseta-pelusa';
  roseta.add(mallaFleco);

  // halo de pelusa: mechones sueltos sembrados sobre la cáscara de la roseta.
  // De lejos ESO es la pubescencia. En v1 eran 300 cards grandes y blancos y
  // se leían como esquirlas de vidrio: la corrección es muchos, chicos y del
  // color de la hoja, no del color de la nieve.
  const muestrasHalo = [];
  const nHalo = detalle === 'medio' ? 300 : 820;
  for (let i = 0; i < nHalo; i++) {
    const a = rn() * Math.PI * 2;
    const t = Math.pow(rn(), 0.62);
    // sigue la forma de la roseta: ancha abajo, empinada arriba
    // llega HASTA la punta de las palas (2,7 m) y un poco más: si el halo se
    // queda corto, a contraluz el borde de la roseta vuelve a ser una sierra de
    // hojas contables por mucha pelusa que haya adentro.
    const rr = 0.35 + t * 2.55;
    const yy = 0.86 - Math.pow(t, 1.5) * 0.92 + (rn() - 0.5) * 0.22;
    muestrasHalo.push({
      p: [Math.sin(a) * rr, yy, Math.cos(a) * rr],
      n: [Math.sin(a) * 0.75, 0.62 - t * 0.75, Math.cos(a) * 0.75],
      w: 0.22 + rn() * 0.30,
      h: 0.20 + rn() * 0.28,
      c: [0.74 + rn() * 0.20, 0.79 + rn() * 0.18, 0.66 + rn() * 0.20],
    });
  }
  const mallaHalo = new THREE.Mesh(cardsGeo(THREE, muestrasHalo, rn, { jitter: 0.55 }), matPeloHalo);
  mallaHalo.name = 'roseta-halo';
  roseta.add(mallaHalo);
  grupo.add(roseta);

  // ── LA VARA FLORAL — acento amarillo, cuatro capítulos y ya ────────────────
  const vara = new THREE.Group();
  vara.name = 'vara';
  vara.position.y = ALTO - 0.12;
  const piezasFlor = [];
  // La vara sale del costado de la roseta y se inclina: además de ser lo que
  // hace Espeletia de verdad, ROMPE EL EJE vertical de la silueta — chequeo
  // deliberado contra siluetas involuntariamente obscenas.
  const tallo = new THREE.CylinderGeometry(0.06, 0.10, 2.0, 7, 1);
  tallo.translate(0, 1.0, 0);
  const ct = new THREE.Color('#93a06c');
  const nt = tallo.attributes.position.count;
  const at = new Float32Array(nt * 3);
  for (let i = 0; i < nt; i++) { at[i * 3] = ct.r; at[i * 3 + 1] = ct.g; at[i * 3 + 2] = ct.b; }
  tallo.setAttribute('color', new THREE.BufferAttribute(at, 3));
  tallo.rotateZ(-0.52);
  tallo.translate(0.38, 0.30, 0.48);
  piezasFlor.push(tallo);
  const anclaFlor = [1.05, 1.30, 0.48];
  for (const off of [[0, 0, 0], [0.42, -0.34, -0.26], [-0.28, -0.50, 0.32], [0.18, 0.30, 0.20], [0.54, 0.06, 0.34], [-0.14, -0.20, -0.36]]) {
    for (const p of capituloGeo(THREE, 0.40, rn)) {
      p.translate(anclaFlor[0] + off[0], anclaFlor[1] + off[1], anclaFlor[2] + off[2]);
      piezasFlor.push(p);
    }
  }
  const mallaFlor = new THREE.Mesh(fusionarPreservando(THREE, piezasFlor), matFlor);
  mallaFlor.name = 'flores';
  vara.add(mallaFlor);
  grupo.add(vara);

  // ── MUSGO Y LÍQUENES en el pie y en las raíces ────────────────────────────
  const muestrasMusgo = [];
  const nMusgo = detalle === 'medio' ? 90 : 220;
  for (let i = 0; i < nMusgo; i++) {
    const a = rn() * Math.PI * 2;
    const t = Math.pow(rn(), 2.1);
    const y = 0.05 + t * (ALTO * 0.32);
    const r0 = perfil(y / ALTO) + 0.05;
    const enRaiz = rn() < 0.3 && y < 0.6;
    const rr = enRaiz ? r0 + rn() * 1.9 : r0;
    muestrasMusgo.push({
      p: [Math.sin(a) * rr, enRaiz ? 0.12 + rn() * 0.3 : y, Math.cos(a) * rr],
      n: enRaiz ? [0.25 * Math.sin(a), 1, 0.25 * Math.cos(a)] : [Math.sin(a), 0.22, Math.cos(a)],
      w: 0.28 + rn() * 0.62,
      h: 0.24 + rn() * 0.55,
      c: [0.85 + rn() * 0.3, 0.9 + rn() * 0.25, 0.8 + rn() * 0.3],
    });
  }
  const mallaMusgo = new THREE.Mesh(cardsGeo(THREE, muestrasMusgo, rn, { jitter: 0.55 }), matMusgo);
  mallaMusgo.name = 'musgo';
  grupo.add(mallaMusgo);

  // ═══════════════════════════════════════════════════════════════════════════
  //  ESTADO Y VIDA
  // ═══════════════════════════════════════════════════════════════════════════
  // salud: reverdece o se apaga. 1 = guardián en pie (lo que quiere el Kart).
  let salud = opts.salud ?? 1;
  const plataViva = new THREE.Color(C.plata);
  const plataApagada = new THREE.Color('#8b8f7c');
  const ambarVivo = new THREE.Color(C.ambar);
  const ambarApagado = new THREE.Color('#6b5a3c');
  function setSalud(v) {
    salud = Math.max(0, Math.min(1, v));
    matHoja.color.copy(plataApagada).lerp(plataViva, salud);
    matHoja.emissiveIntensity = 0.06 + salud * 0.14;
    matPelo.emissiveIntensity = 0.08 + salud * 0.18;
    matPeloHalo.emissiveIntensity = 0.06 + salud * 0.16;
    matIris.color.copy(ambarApagado).lerp(ambarVivo, salud);
    // (v14) sube del rescoldo v13 (0,40) al 0,5 de los 3 referentes: bajo la
    // ceja-caja y con iris CHICO el ámbar aguanta más luz sin volverse linterna
    // — apagado del todo era la otra mitad del "triste".
    matIris.emissiveIntensity = 0.22 + salud * 0.28;
    mallaFlor.visible = salud > 0.35;
    mallaHalo.visible = salud > 0.12;
  }
  setSalud(salud);

  // inclinación: 0 = quieto; 1 = se inclina hacia el frente (el gesto con el que
  // apartaría un kart del frailejonal). Se deja EXPUESTO pero sin cablear: el
  // páramo es gate humano, quien lo integre decide cuándo se usa.
  let inclinacion = 0, inclinacionSuave = 0;
  const setInclinacion = (v) => { inclinacion = Math.max(0, Math.min(1, v)); };

  const mirada = new THREE.Vector3();
  const objetivoOjo = new THREE.Quaternion(), matLook = new THREE.Matrix4();
  const posOjo = new THREE.Vector3();
  const euler = new THREE.Euler();

  // ANIMACIÓN. La lentitud ES el personaje: dos frecuencias incomensurables
  // para que nunca se lea metrónomo, damping altísimo en la mirada, parpadeo
  // rarísimo. Nada aquí pasa de 0,4 rad/s.
  function actualizar(t, camara) {
    const mecido = Math.sin(t * 0.21) * 0.017 + Math.sin(t * 0.083 + 1.3) * 0.011;
    inclinacionSuave += (inclinacion - inclinacionSuave) * 0.012;

    grupo.rotation.z = mecido * 0.30;
    grupo.rotation.x = Math.cos(t * 0.163) * 0.006 + inclinacionSuave * 0.10;

    // la roseta llega TARDE al balanceo: inercia de masa vieja
    roseta.rotation.z = mecido * 1.35 + Math.sin(t * 0.21 - 0.9) * 0.010;
    roseta.rotation.x = Math.cos(t * 0.163 - 0.8) * 0.014 + inclinacionSuave * 0.16;
    vara.rotation.z = mecido * 1.9;
    vara.rotation.x = Math.cos(t * 0.163 - 1.2) * 0.02;
    mallaGrenas.rotation.z = mecido * 0.35;

    // respiración: el fuste crece un pelo. No se ve; se SIENTE.
    const resp = 1 + Math.sin(t * 0.19) * 0.0035;
    mallaCorteza.scale.set(1, resp, 1);

    // parpadeo ancestral: mucho abierto, un pestañeo corto y lento. (v14) sin
    // párpados de casquete (leían como esclerótica): el iris se entorna con
    // scale.y, igual que en construirEntRoble — mismo reloj, mismos desfases.
    for (let i = 0; i < ojos.length; i++) {
      const fase = (t * 0.5 + i * 0.06) % 5.5;
      const cerrado = fase > 5.16 ? 1 - Math.abs(fase - 5.33) / 0.17 : 0;
      const kc = Math.max(0, Math.min(1, cerrado));
      ojos[i].iris.scale.y = 1 - kc * 0.88;
    }

    // LA MIRADA TE SIGUE, la cabeza NO. Ojos acotados y con damping durísimo.
    // (v13) clamps a la MITAD: con ±0,44 y la montura cruda del cilindro los
    // dos iris vivían clavados en el tope, convergiendo — el ojo bizco de la
    // captura. Con la cuenca aplanada (0,35 del arco) el centro queda al
    // alcance y el recorrido corto da mirada serena, no de muñeco que sigue.
    if (camara) {
      for (const o of ojos) {
        o.nido.getWorldPosition(posOjo);
        mirada.copy(camara.position).sub(posOjo);
        const yaw = Math.max(-0.26, Math.min(0.26, Math.atan2(mirada.x, mirada.z) - o.nido.rotation.y));
        const pitch = Math.max(-0.15, Math.min(0.15, -Math.atan2(mirada.y, Math.hypot(mirada.x, mirada.z))));
        euler.set(pitch, yaw, 0);
        matLook.makeRotationFromEuler(euler);
        objetivoOjo.setFromRotationMatrix(matLook);
        o.iris.quaternion.slerp(objetivoOjo, 0.035);
        // (v12) el z de reposo era 0,155 FIJO y pisaba el 0,185·ESC estático:
        // al primer frame el iris se hundía 6 cm en el globo y el anillo negro
        // crecía. Ahora el runtime respeta la posición de fábrica (v13: 0,145·ESC).
        // (v14) el z de reposo sigue la montura nueva (0,20·ESC, iris asomando
        // del globo del molde referente), no el 0,145 de los ojos viejos.
        o.iris.position.set(
          Math.sin(yaw) * 0.048,
          Math.sin(pitch) * 0.040,
          0.20 * ESC_CARA - Math.abs(yaw) * 0.02
        );
      }
    }
    // latido casi imperceptible y LENTO (el de v12 a 0,44 rad/s era ojo de
    // dibujo animado). (v14) techo 0,5 — el nivel de los 3 referentes.
    matIris.emissiveIntensity = (0.22 + salud * 0.28) * (0.96 + Math.sin(t * 0.16) * 0.05);
  }

  grupo.userData = {
    alto: ALTO,
    altoTotal: ALTO + 1.55 * escCorona,
    radioTronco: perfil(0.5),
    caraY: CARA_Y,
    escCara: ESC_CARA,
    frente: new THREE.Vector3(0, 0, 1),
    actualizar,
    setSalud,
    setInclinacion,
    salud: () => salud,
    materiales: { matCorteza, matHoja, matPelo, matPeloHalo, matNecro, matGrenas, matMusgo, matFlor, matIris },
    liberar() {
      grupo.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
      for (const tex of [texCorteza, texHoja, texPelo, texPeloSuelto, texNecro, texMusgo]) tex.dispose();
    },
  };

  if (opts.escala && opts.escala !== 1) grupo.scale.setScalar(opts.escala);
  return grupo;
}

// Sonda del rostro: devuelve el relieve (metros) y la pintura (-1..1) en un
// punto de la cara, en coordenadas de rostro (arco horizontal, altura relativa
// al centro), ambas en metros. Existe para poder MEDIR la cara sin navegador —
// dos pasadas se perdieron discutiendo si un rasgo estaba mal esculpido o mal
// iluminado, cuando bastaba imprimir el número.
export function sondaRostro(sx, sy) {
  return { relieve: relieveCara(sx, sy) * 1.38 * ESC_CARA, pintura: pinturaCara(sx, sy), escala: ESC_CARA };
}

// Cuenta triángulos reales (instancias incluidas). Misma cuenta que usan los
// otros gates del juego, para que los números se puedan comparar entre módulos.
export function medirEnt(objeto) {
  let tris = 0, mallas = 0;
  objeto.traverse((o) => {
    if (o.isMesh && o.geometry) {
      mallas++;
      const g = o.geometry;
      const caras = (g.index ? g.index.count : g.attributes.position.count) / 3;
      tris += caras * (o.isInstancedMesh ? o.count : 1);
    }
  });
  return { triangulos: Math.round(tris), mallas };
}

export default crearEntParamo;
