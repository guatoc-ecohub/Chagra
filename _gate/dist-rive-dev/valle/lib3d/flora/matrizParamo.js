// ── matrizParamo.js — la MATRIZ del páramo: pajonal, chusque, turbera y roca ──
//
// DIAGNÓSTICO que origina este módulo: el frailejón está aprobado (8/10) pero
// FLOTA, porque hoy el páramo son frailejones sobre nada. Un páramo real no es
// un jardín de frailejones: es una MATRIZ de pajonal de la que el frailejón
// SOBRESALE, con parches de turbera en las depresiones, matorrales de chusque
// en los bordes y bloques de arenisca encostrados de líquenes. El frailejón es
// el emergente; esto es el mar del que emerge.
//
// Las cuatro piezas y su verdad ecológica:
//   1. PAJONAL (Calamagrostis effusa) — macollas densas; verdes en la base,
//      secas-doradas en las PUNTAS (el dorado es acento, nunca el tono base).
//      Es la matriz: cubre todo. Se resuelve con quickGrass.js (la técnica de
//      la casa, pala curva en el vertex shader) en un anillo de detalle + un
//      manto de IMPOSTORES de macolla para el resto, que se erosiona por
//      distancia (nunca hay dos representaciones de la misma mata a la vez).
//   2. CHUSQUE (Chusquea tessellata) — bambú andino: cañas delgadas y masa de
//      hoja lanceolada. Forma MATORRALES CERRADOS en los bordes, no manchas
//      sueltas; por eso se siembra por manchones y no por scatter uniforme.
//   3. TURBERA (Sphagnum spp.) — colchón esponjoso saturado: la fábrica de
//      agua del páramo. Cojines MULLIDOS (domo esculpido con ruido, silueta
//      grumosa y pelusa corta encima), verdes con acento herrumbre
//      (S. magellanicum), en las depresiones húmedas, con espejos de agua
//      encharcada entre cojín y cojín.
//   4. ROCA CON LÍQUENES — bloques de arenisca con costras liquénicas. El
//      liquen es el ORGANISMO PIONERO: va sobre la roca DESNUDA, no sobre
//      tierra. Por eso la costra vive en la textura de la piedra y el pajonal
//      se excluye del pie del bloque (halo de roca pelada).
//
// REGLA DURA respetada: follaje = MASA. Ni una hoja contable. El pajonal es una
// masa que ondula (briznas de shader + impostor de macolla), no briznas
// contables; el chusque es masa de hoja lanceolada texturizada; el musgo es un
// colchón con pelusa, no un plano verde. Verde dominante; dorado, herrumbre y
// naranja de liquen SOLO como acento. Lámina naturalista, no fotorrealismo.
//
// ── PRESUPUESTO MEDIDO (gate headed, Quadro M6000, pixelRatio 2, 1280×800) ───
// Costo AISLADO del módulo sobre 120×120 m = 14.400 m² a `calidad: 'alta'`
// (mismo encuadre con y sin matriz, frailejones ocultos para no contaminar):
//     suelo solo ......  11.250 tris ·  1 draw call · 0,92 ms/frame
//     + la matriz .....  283.988 tris · 38 draw calls · 1,41 ms/frame
//     → la matriz cuesta ~272.700 tris · 37 draw calls · +0,50 ms/frame
// Escalones de calidad en el mismo encuadre (tris · draw calls · ms):
//     alta 279k·39·1,42 | media 223k·37·1,35 | baja 194k·36·1,33
//     solo-impostor 167k·30·1,07   (sin briznas reales — carril móvil)
// Barrido de ÁREA a 60 FPS sostenidos (pixelRatio 2, vista a ras del pajonal):
//     3.600 m² ... 176k tris · 4,52 ms       102.400 m² ... 1,25 M · 2,91 ms
//    14.400 m² ... 307k tris · 2,64 ms       230.400 m² ... 2,06 M · 4,63 ms
//    40.000 m² ... 526k tris · 2,21 ms       640.000 m² ... 3,45 M · 7,60 ms
// → 60 FPS hasta 640.000 m² (64 ha) con 750.706 macollas, gastando 7,6 ms de
//   los 16,7 del cuadro. El pajonal es casi independiente del área (super-tiles
//   + corte por distancia); lo que todavía crece con ella son las capas
//   dispersas (roca / cojines / cañas), que van en un InstancedMesh global.
//
// PRESUPUESTO (lo que más fácil tumba los FPS son las matrices de vegetación):
//   · TODO va en InstancedMesh. Draw calls fijos, no proporcionales al conteo.
//   · El pajonal se parte en TILES: cada tile es UN InstancedMesh de briznas
//     reales, con frustum culling de three (InstancedMesh calcula su esfera a
//     partir de las instancias) + culling por distancia. Fuera del anillo de
//     detalle manda el manto de impostores, que es UN solo draw call para toda
//     el área por grande que sea.
//   · La transición detalle↔impostor es por EROSIÓN DE ALFA en el fragment
//     (el umbral sube al acercarse): la macolla-cartel se deshilacha en vez de
//     desaparecer de golpe, y todo sigue siendo OPACO (sin sorting, sin
//     transparencia, sin depth peeling).
//
// Convención de lib3d/flora: `import * as THREE from 'three'` (bare specifier
// resuelto por importmap), igual que quickGrass.js / frailejonFabrica.js /
// vientoMundos.js. El valle y el kart mapean "three" al MISMO vendor, así que
// el módulo sirve en los dos sin tocar nada.
//
// El módulo NO se cablea solo a ningún mundo: el que llama le pasa el área, la
// altura del terreno y qué zonas están vetadas, y decide dónde colgar el grupo.
//
// API:
//   crearMatrizParamo(opts) → {
//     grupo,                       // THREE.Group para colgar donde sea
//     actualizar(camara, dt),      // 1×/frame: anillo de detalle + reloj
//     clarosParaEmergentes(n),     // huecos reservados donde plantar frailejones
//     stats(),                     // conteos por pieza
//     dispose(),
//   }
//
// opts:
//   area          {x0,x1,z0,z1}  extensión en metros (def 120×120)
//   alturaEn      (x,z)=>y       altura del terreno (def 0)
//   libre         (x,z)=>bool    false = zona vetada (pista, agua, camino)
//   densidad      macollas/m²    (def 0.85)
//   calidad       'alta'|'media'|'baja'|'solo-impostor'
//   emergentes    int            claros reservados para frailejones (def 28)
//   seed          int
//   luzDir        THREE.Vector3  dirección del sol (para el lambert barato)
//   ambiente      0..1
//   niebla        {color, cerca, lejos, fuerza}  fundido con la bruma del mundo
//   tile          m              lado del tile de pajonal (def 10)
//   radioDetalle  m              radio del anillo de briznas reales (def 30)

import * as THREE from 'three';
import { crearParchePasto } from './quickGrass.js';
import { uniformesVientoMundo } from './vientoMundos.js';
import { texturaFollaje } from './FollajeMasa.js';

// ═════════════════════════════════════════════════════════════════════════════
//  Ruido y azar deterministas (mismas formas que el resto de lib3d)
// ═════════════════════════════════════════════════════════════════════════════
function prngMP(semilla) {
  let a = semilla >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashMP(x, z) {
  const h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

function vnoiseMP(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hashMP(xi, zi), b = hashMP(xi + 1, zi), c = hashMP(xi, zi + 1), d = hashMP(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbmMP(x, z, oct = 4) {
  let s = 0, amp = 1, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) { s += amp * vnoiseMP(x * f, z * f); norm += amp; amp *= 0.5; f *= 2.03; }
  return s / norm;
}

// ═════════════════════════════════════════════════════════════════════════════
//  PALETA — verde dominante. El dorado del pajonal seco, la herrumbre del
//  Sphagnum y el naranja del liquen son ACENTOS medidos, no el tono base.
// ═════════════════════════════════════════════════════════════════════════════
export const PALETA_PARAMO = Object.freeze({
  // pajonal: base húmeda oscura → medio oliva → punta seca dorada
  pajonalBase: '#33512a',
  pajonalMedio: '#54722f',
  pajonalPunta: '#94874a',
  // chusque: verde más frío y saturado que el pajonal (bambú, no gramínea seca)
  chusqueHoja: '#2f5127',
  chusqueHojaClara: '#6d8f3a',
  chusqueCana: '#8b9455',
  // turbera: verde musgo dominante + herrumbre de S. magellanicum como acento
  musgoVerde: '#4d7536',
  musgoClaro: '#8aa74a',
  musgoHerrumbre: '#8d4d30',
  agua: '#1d2b25',
  // roca de arenisca + costras liquénicas
  roca: '#7c7568',
  rocaClara: '#9c9482',
  rocaOscura: '#4b473e',
  liquenMapa: '#98a349',   // Rhizocarpon geographicum (amarillo-verdoso)
  liquenGris: '#b5b8a8',   // Stereocaulon / Lecanora
  liquenNaranja: '#a9702f', // Caloplaca / Xanthoria — el más escaso
});

// El reparto detalle↔impostor es LA decisión de presupuesto de este módulo.
// Primer intento (radio de detalle 30 m, 18 briznas por macolla, pala de 4.8 cm):
// FALLÓ el gate — con el impostor borrado hasta los 26 m, el anillo cercano
// quedaba con briznas ANCHAS y CONTABLES sobre suelo pelado. La masa NO la
// pueden dar las briznas: cada una cuesta triángulos y nunca alcanzan.
// La masa la da la CARTA DE MACOLLA (150 briznas dibujadas en textura, 6 tris);
// las briznas reales solo tienen que ganarle a la carta en los primeros metros.
// De ahí: muchas briznas MUY finas en un radio CORTO, y la carta entrando ya a
// los ~2.5 m. Sale más barato Y se lee como masa.
const CALIDADES = {
  alta: { briznas: 42, segs: 3, radioDetalle: 13, pelusa: 20 },
  media: { briznas: 26, segs: 3, radioDetalle: 10, pelusa: 14 },
  baja: { briznas: 14, segs: 3, radioDetalle: 7, pelusa: 8 },
  'solo-impostor': { briznas: 0, segs: 3, radioDetalle: 0, pelusa: 0 },
};

// ═════════════════════════════════════════════════════════════════════════════
//  TEXTURA DE MACOLLA (atlas 2×2 de 4 variantes) — el impostor del pajonal.
//  Cada tile es un ABANICO de briznas curvas que nacen del mismo punto: verde
//  oscuro abajo, dorado en la punta. Se dibuja con cintas (dos curvas
//  cuadráticas) que se afinan, nunca con líneas rectas: a esta resolución cada
//  brizna mide 2-3 px y el conjunto lee como masa, no como palitos.
// ═════════════════════════════════════════════════════════════════════════════
function texturaMacolla(seed = 5, tam = 256) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = tam * 2;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  for (let v = 0; v < 4; v++) {
    const c = v % 2, r = (v / 2) | 0;
    pintarMacolla(ctx, c * tam, r * tam, tam, tam, seed * 977 + v * 131);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  return tex;
}

function pintarMacolla(ctx, ox, oy, W, H, seed) {
  const rn = prngMP(seed);
  const baseX = ox + W * 0.5;
  const baseY = oy + H * 0.985;

  // NO va mancha oscura al pie: en el primer gate esa elipse se leía como un
  // AGUJERO negro bajo cada mata (la carta es vertical, la elipse quedaba de
  // canto). La masa del pie la dan las briznas cortas, que son muchas.
  const N = 210;
  for (let i = 0; i < N; i++) {
    const rr = rn();
    // abanico: la mayoría casi vertical, unas cuantas muy abiertas (mata real)
    const lado = (rn() < 0.5 ? -1 : 1) * Math.pow(rn(), 0.65);
    const apertura = lado * (0.16 + rn() * 0.72);
    // un tercio son briznas CORTAS del pie: llenan la base y evitan que la mata
    // se vea como un ramo de flores atado (todo del mismo largo)
    const largo = rn() < 0.34 ? H * (0.12 + rr * 0.26) : H * (0.42 + rr * 0.55);
    const tipX = baseX + apertura * W * 0.47;
    const tipY = baseY - largo;
    // el control tira hacia arriba y hacia afuera → la brizna se ARQUEA
    const ctrlX = baseX + apertura * W * 0.16;
    const ctrlY = baseY - largo * (0.62 + rn() * 0.2);
    const w = W * (0.0075 + rn() * 0.0085);
    const x0 = baseX + (rn() - 0.5) * W * 0.10;

    const g = ctx.createLinearGradient(x0, baseY, tipX, tipY);
    // ~1 de cada 7 briznas es MARCESCENTE (seca entera): así el dorado es una
    // trama repartida y no una línea de puntas pintadas todas iguales.
    if (rn() < 0.085) {
      g.addColorStop(0, '#6b6034');
      g.addColorStop(0.5, '#8f7f42');
      g.addColorStop(1, '#b6a45a');
    } else {
      // verde húmedo abajo → oliva → dorado seco SOLO en el último tramo
      g.addColorStop(0, '#2c4622');
      g.addColorStop(0.32, PALETA_PARAMO.pajonalBase);
      g.addColorStop(0.72, PALETA_PARAMO.pajonalMedio);
      // el dorado no es uniforme: unas puntas secas, otras aún verdes
      g.addColorStop(1, rn() < 0.40 ? PALETA_PARAMO.pajonalPunta : '#77913a');
    }

    ctx.save();
    ctx.globalAlpha = 0.80 + rn() * 0.20;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0 - w, baseY);
    ctx.quadraticCurveTo(ctrlX - w * 0.55, ctrlY, tipX, tipY);
    ctx.quadraticCurveTo(ctrlX + w * 0.55, ctrlY, x0 + w, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  TEXTURA DEL MANTO RASANTE — vista CENITAL del entremata: hojarasca de
//  pajonal caída, briznas cortas en todas las direcciones, musguito y rosetitas.
//  Sin esta capa el páramo se lee como macollas PLANTADAS sobre tierra pelada
//  (primer gate): en el páramo real entre mata y mata no hay suelo desnudo,
//  hay hojarasca y vegetación rasante. Borde de alfa irregular para que las
//  parcelas no se lean como baldosas.
// ═════════════════════════════════════════════════════════════════════════════
function texturaMantoRasante(seed = 8, tam = 256) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = tam;
  const ctx = cv.getContext('2d');
  const rn = prngMP(seed * 6151 + 29);
  const C = tam / 2;

  // máscara de alcance: radio perturbado (mancha orgánica, no cuadro)
  const s0 = rn() * 50;
  const alcance = (a) => C * (0.74 + 0.30 * fbmMP(Math.cos(a) * 2.2 + s0, Math.sin(a) * 2.2 + s0 * 1.4, 3));

  // hojarasca: trazos tumbados, tonos secos y verdes apagados
  const trazo = (x, y, largo, ang, w, col, alfa) => {
    ctx.save();
    ctx.globalAlpha = alfa;
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + Math.cos(ang + 0.4) * largo * 0.55, y + Math.sin(ang + 0.4) * largo * 0.55,
      x + Math.cos(ang) * largo, y + Math.sin(ang) * largo
    );
    ctx.stroke();
    ctx.restore();
  };

  for (let i = 0; i < 1250; i++) {
    const a = rn() * Math.PI * 2;
    const rr = Math.pow(rn(), 0.55) * alcance(a);
    const x = C + Math.cos(a) * rr, y = C + Math.sin(a) * rr;
    const borde = rr / alcance(a);
    const t = rn();
    const col = t < 0.30 ? '#2b4322'
      : t < 0.58 ? PALETA_PARAMO.pajonalBase
        : t < 0.80 ? '#5c6b30'
          : t < 0.93 ? '#8a7c44'                 // hojarasca seca
            : PALETA_PARAMO.pajonalPunta;
    trazo(x, y, tam * (0.03 + rn() * 0.10), rn() * Math.PI * 2,
      tam * (0.006 + rn() * 0.011), col, (0.55 + rn() * 0.45) * (1 - borde * borde * 0.92));
  }
  // musguito y rosetitas rasantes (verde dominante, acento mínimo)
  for (let i = 0; i < 260; i++) {
    const a = rn() * Math.PI * 2;
    const rr = Math.pow(rn(), 0.6) * alcance(a) * 0.92;
    const x = C + Math.cos(a) * rr, y = C + Math.sin(a) * rr;
    ctx.save();
    ctx.globalAlpha = 0.4 + rn() * 0.45;
    ctx.fillStyle = rn() < 0.82 ? '#41652c' : '#6f8a3a';
    ctx.beginPath();
    ctx.arc(x, y, tam * (0.006 + rn() * 0.016), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

// ═════════════════════════════════════════════════════════════════════════════
//  TEXTURA DEL COLCHÓN DE TURBERA — vista CENITAL del tapiz de Sphagnum entre
//  cojín y cojín. En una turbera real NO hay barro desnudo: hay colchón
//  saturado. Sin esta capa el parche se leía como cojines posados sobre un
//  lodazal seco (gate 2). Alfa con borde deshilachado para que el tapiz muera
//  contra el pajonal sin dejar canto de baldosa.
// ═════════════════════════════════════════════════════════════════════════════
function texturaColchonMusgo(seed = 12, tam = 256) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = tam;
  const ctx = cv.getContext('2d');
  const rn = prngMP(seed * 3571 + 41);
  const C = tam / 2;
  const s0 = rn() * 60;
  const alcance = (a) => C * (0.70 + 0.34 * fbmMP(Math.cos(a) * 2.6 + s0, Math.sin(a) * 2.6 + s0 * 1.2, 4));

  for (let i = 0; i < 3400; i++) {
    const a = rn() * Math.PI * 2;
    const A = alcance(a);
    const rr = Math.pow(rn(), 0.5) * A;
    const x = C + Math.cos(a) * rr, y = C + Math.sin(a) * rr;
    const borde = rr / A;
    const t = rn();
    const col = t < 0.46 ? PALETA_PARAMO.musgoVerde
      : t < 0.80 ? PALETA_PARAMO.musgoClaro
        : t < 0.92 ? '#5f7a34'
          : t < 0.985 ? '#7d5b39'
            : PALETA_PARAMO.musgoHerrumbre;
    const r = tam * (0.006 + rn() * 0.011);
    ctx.save();
    // el borde se DESHILACHA (alfa cae con el cuadrado) → sin canto de baldosa
    ctx.globalAlpha = (0.55 + rn() * 0.45) * (1 - borde * borde * 0.92);
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(0.8, r * 0.45);
    ctx.lineCap = 'round';
    const g = 5 + ((rn() * 2) | 0);
    const a0 = rn() * Math.PI * 2;
    for (let k = 0; k < g; k++) {
      const ang = a0 + (k / g) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r);
      ctx.stroke();
    }
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

// quad HORIZONTAL con pivote al centro — la baldosa del manto rasante
function geoQuadRasante() {
  const g = new THREE.PlaneGeometry(1, 1, 1, 1);
  g.rotateX(-Math.PI / 2);
  g.computeBoundingSphere();
  return g;
}

// ═════════════════════════════════════════════════════════════════════════════
//  TEXTURA DE MUSGO — capitula de Sphagnum: rosetitas diminutas y apretadas.
//  Tileable (se dibuja envuelta en los 4 bordes) para poder repetir sobre el
//  cojín sin costura visible.
// ═════════════════════════════════════════════════════════════════════════════
function texturaMusgo(seed = 3, tam = 256) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = tam;
  const ctx = cv.getContext('2d');
  const rn = prngMP(seed * 4409 + 17);
  ctx.fillStyle = '#3f6130';
  ctx.fillRect(0, 0, tam, tam);

  const roseta = (x, y, r, col, alfa) => {
    ctx.save();
    ctx.globalAlpha = alfa;
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(0.8, r * 0.42);
    ctx.lineCap = 'round';
    const g = 5 + ((rn() * 2) | 0);
    const a0 = rn() * Math.PI * 2;
    for (let k = 0; k < g; k++) {
      const a = a0 + (k / g) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      ctx.stroke();
    }
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  for (let i = 0; i < 4400; i++) {
    const x = rn() * tam, y = rn() * tam;
    const t = rn();
    // verde dominante (78%); herrumbre de S. magellanicum como acento (22%)
    // el herrumbre FUERTE lo pone el instanceColor por cojín (zonas enteras de
    // S. magellanicum). En la textura va poco: si no, sale confeti rojo.
    const col = t < 0.44 ? PALETA_PARAMO.musgoVerde
      : t < 0.82 ? PALETA_PARAMO.musgoClaro
        : t < 0.93 ? '#5f7a34'
          : t < 0.985 ? '#7d5b39'
            : PALETA_PARAMO.musgoHerrumbre;
    const r = tam * (0.0045 + rn() * 0.0075);
    const alfa = 0.55 + rn() * 0.45;
    roseta(x, y, r, col, alfa);
    // copias envueltas → sin costura al repetir
    for (const [dx, dy] of [[-tam, 0], [tam, 0], [0, -tam], [0, tam]]) {
      if (x + dx > -tam * 0.1 && x + dx < tam * 1.1 && y + dy > -tam * 0.1 && y + dy < tam * 1.1) {
        roseta(x + dx, y + dy, r, col, alfa);
      }
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 3.5);
  return tex;
}

// ═════════════════════════════════════════════════════════════════════════════
//  TEXTURA DE ROCA CON LÍQUENES — arenisca veteada + costras crustosas.
//  El liquen se pinta ENCIMA de la roca (es pionero sobre roca desnuda) con
//  borde lobulado irregular y areolas internas; nunca como manchas circulares
//  lisas ni como color plano.
// ═════════════════════════════════════════════════════════════════════════════
function texturaLiquen(seed = 9, tam = 1024) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = tam;
  const ctx = cv.getContext('2d');
  const rn = prngMP(seed * 7717 + 5);

  // ── arenisca: base + vetas sedimentarias + grano ──
  ctx.fillStyle = PALETA_PARAMO.roca;
  ctx.fillRect(0, 0, tam, tam);
  // vetas MUY suaves: en el primer gate salían como bandas pintadas a brocha
  for (let y = 0; y < tam; y += 2) {
    const n = fbmMP(y * 0.006 + seed, seed * 0.5, 4);
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = n > 0.5 ? PALETA_PARAMO.rocaClara : PALETA_PARAMO.rocaOscura;
    ctx.fillRect(0, y, tam, 2);
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 14000; i++) {
    const x = rn() * tam, y = rn() * tam;
    ctx.globalAlpha = 0.10 + rn() * 0.22;
    ctx.fillStyle = rn() < 0.5 ? PALETA_PARAMO.rocaOscura : PALETA_PARAMO.rocaClara;
    ctx.fillRect(x, y, 1 + rn() * 2, 1 + rn() * 2);
  }
  // fisuras
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#4a463e';
  for (let i = 0; i < 7; i++) {
    ctx.lineWidth = 1 + rn() * 2.4;
    ctx.beginPath();
    let x = rn() * tam, y = rn() * tam;
    ctx.moveTo(x, y);
    for (let k = 0; k < 9; k++) {
      x += (rn() - 0.5) * tam * 0.20;
      y += (rn() - 0.4) * tam * 0.16;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // ── costras liquénicas: talo con radio perturbado por fbm (borde lobulado) ──
  const costra = (cx, cy, R, col, tipo) => {
    const s = rn() * 100;
    const radio = (a) => R * (0.44 + 1.05 * fbmMP(Math.cos(a) * 3.1 + s, Math.sin(a) * 3.1 + s * 1.3, 4));
    ctx.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.17) {
      const r = radio(a);
      const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
      if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.save();
    // el talo NO es opaco: deja ver el grano de la roca por debajo. Con alfa
    // alta salían pegatinas de colores planos (primer gate).
    ctx.globalAlpha = 0.52 + rn() * 0.26;
    ctx.fillStyle = col;
    ctx.fill();
    // borde: prototalo oscuro (la orla negra del Rhizocarpon es su firma),
    // FINO — con 2.6 px sobre 512 el contorno leía a dibujo animado
    ctx.globalAlpha = tipo === 'mapa' ? 0.55 : 0.28;
    ctx.strokeStyle = tipo === 'mapa' ? '#242619' : '#6b6656';
    ctx.lineWidth = tipo === 'mapa' ? 1.5 : 1.0;
    ctx.stroke();
    ctx.restore();
    // areolas / apotecios interiores: el talo no es plano
    ctx.save();
    ctx.clip();
    const nA = tipo === 'mapa' ? 90 : 60;
    for (let k = 0; k < nA; k++) {
      const a = rn() * Math.PI * 2, rr = Math.sqrt(rn()) * R * 0.95;
      const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
      ctx.globalAlpha = 0.14 + rn() * 0.26;
      ctx.fillStyle = tipo === 'mapa' ? '#20241a' : (rn() < 0.5 ? '#8f8a78' : '#dcdcd0');
      ctx.beginPath();
      ctx.arc(px, py, R * (0.03 + rn() * 0.09), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  // ESCALA: una costra crustosa real mide de 1 a 8 cm. Sobre un bloque de ~1.5 m
  // eso son manchas CHICAS y MUCHAS, no cuatro lamparones. El primer gate salió
  // con costras de 20 cm y leía a payaso.
  const receta = [
    ['gris', PALETA_PARAMO.liquenGris, 46],
    ['mapa', PALETA_PARAMO.liquenMapa, 38],
    ['gris', '#a8ac9c', 30],
    ['mapa', '#8b9a46', 16],
    ['naranja', PALETA_PARAMO.liquenNaranja, 7],   // el acento, contado
  ];
  // el liquen COLONIZA por focos: se siembran núcleos y las costras crecen
  // alrededor. Repartidas al azar salían lunares de lunar de tablero.
  const focos = [];
  for (let i = 0; i < 14; i++) focos.push([rn() * tam, rn() * tam]);
  for (const [tipo, col, n] of receta) {
    for (let i = 0; i < n; i++) {
      const f = focos[(rn() * focos.length) | 0];
      const a = rn() * Math.PI * 2, rr = Math.pow(rn(), 0.7) * tam * 0.19;
      costra(f[0] + Math.cos(a) * rr, f[1] + Math.sin(a) * rr,
        tam * (0.008 + Math.pow(rn(), 1.8) * 0.034), col, tipo);
    }
  }
  // capa leprosa: liquen pulverulento gris-verdoso repartido por toda la cara.
  // Es lo que evita que entre costra y costra la roca se vea recién lavada.
  for (let i = 0; i < 9000; i++) {
    const x = rn() * tam, y = rn() * tam;
    const d = fbmMP(x * 0.013 + seed * 2, y * 0.013 - seed, 3);
    if (d < 0.44) continue;
    ctx.globalAlpha = 0.05 + rn() * 0.16;
    ctx.fillStyle = rn() < 0.62 ? '#8d9578' : '#a9ae96';
    ctx.beginPath();
    ctx.arc(x, y, tam * (0.0012 + rn() * 0.0035), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  // la UV de caja da 0..1 por cara: repetir achica la costra respecto al bloque
  tex.repeat.set(1.8, 1.8);
  return tex;
}

// ═════════════════════════════════════════════════════════════════════════════
//  CARTAS CRUZADAS (impostor de masa) — 3 quads a 0°/60°/120° fusionados en UNA
//  geometría con el pivote en la BASE, para que la escala crezca hacia arriba.
//  Sirve al manto de pajonal y a la masa de hoja del chusque: un draw call cada
//  uno, volumen desde cualquier ángulo.
// ═════════════════════════════════════════════════════════════════════════════
function geoCartasCruzadas(planos = 3) {
  const pos = [], uv = [], idx = [];
  let base = 0;
  for (let p = 0; p < planos; p++) {
    const a = (p / planos) * Math.PI;
    const ca = Math.cos(a), sa = Math.sin(a);
    // quad de -0.5..0.5 en X, 0..1 en Y (pivote abajo)
    const esquinas = [[-0.5, 0], [0.5, 0], [0.5, 1], [-0.5, 1]];
    for (const [ex, ey] of esquinas) {
      pos.push(ex * ca, ey, ex * sa);
      uv.push(ex + 0.5, ey);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    base += 4;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

// Shader compartido por los mantos de cartas. Opaco (discard, sin blending):
// nada de ordenar por frame. El umbral de alfa SUBE al acercarse (uFade=1), así
// la macolla-cartel se EROSIONA y cede el lugar a las briznas reales del anillo
// de detalle en vez de desaparecer de golpe.
const VERT_CARTAS = /* glsl */`
  attribute vec3 aVar;      // (u0, v0, tamaño de tile del atlas)
  uniform float uTiempoVM, uFuerzaVM, uViento, uCorte;
  varying vec2 vUv;
  varying float vDist, vAlt;
  varying vec3 vTint;
  void main() {
    vec3 p = position;
    float hf = clamp(p.y, 0.0, 1.0);
    vec4 wp4 = modelMatrix * instanceMatrix * vec4(p, 1.0);
    vec3 wp = wp4.xyz;
    float fase = wp.x * 0.17 + wp.z * 0.13;
    float onda = sin(uTiempoVM * 1.45 + fase) + 0.42 * sin(uTiempoVM * 2.87 + fase * 1.7);
    float alto = length(instanceMatrix[1].xyz);
    float sway = uViento * uFuerzaVM * onda * hf * hf * 0.10 * alto;
    wp.x += sway;
    wp.z += sway * 0.5;
    vec4 mv = viewMatrix * vec4(wp, 1.0);
    vDist = -mv.z;
    // CORTE DURO por distancia: más allá de uCorte la niebla ya lo pintó todo
    // del color del aire, así que la carta se colapsa a un punto fuera de
    // pantalla (cero rasterizado). Esto es lo que hace que el páramo pueda ser
    // ENORME: el costo de relleno queda acotado por un disco alrededor de la
    // cámara, no por el área sembrada.
    if (vDist > uCorte) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    vAlt = hf;
    vUv = aVar.xy + uv * aVar.z;
    #ifdef USE_INSTANCING_COLOR
      vTint = instanceColor;
    #else
      vTint = vec3(1.0);
    #endif
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG_CARTAS = /* glsl */`
  precision mediump float;
  uniform sampler2D uMapa;
  uniform float uUmbral, uFade, uCerca, uLejos, uAOmin;
  uniform float uFadeLejos, uCorteA, uCorteB;
  uniform float uAmbiente, uNieblaCerca, uNieblaLejos, uNieblaFuerza, uNieblaDens;
  uniform vec3 uNiebla;
  varying vec2 vUv;
  varying float vDist, vAlt;
  varying vec3 vTint;
  void main() {
    vec4 t = texture2D(uMapa, vUv);
    // erosión por CERCANÍA: k1=0 pegado a la cámara (todo se descarta),
    // k1=1 lejos → la carta manda. Es como el manto cede a la brizna real.
    float k1 = mix(1.0, smoothstep(uCerca, uLejos, vDist), uFade);
    // erosión por LEJANÍA: la capa rasante es HORIZONTAL; de canto y a lo lejos
    // miles de baldosas se apilan en una franja de pocos píxeles y pintan una
    // BANDA lisa en el horizonte (detectado en el gate). Como a esa distancia
    // el suelo ya no se ve —lo tapan las macollas—, la baldosa se disuelve.
    float k2 = mix(1.0, 1.0 - smoothstep(uCorteA, uCorteB, vDist), uFadeLejos);
    float umbral = mix(0.98, uUmbral, min(k1, k2));
    if (t.a < umbral) discard;
    vec3 c = t.rgb * vTint;
    // AO barato: la base de la mata queda en sombra propia. El manto rasante
    // es horizontal (vAlt=0) y pide uAOmin alto para no salir negro.
    c *= mix(uAOmin, 1.06, smoothstep(0.0, 0.55, vAlt));
    c *= uAmbiente;
    // con densidad>0 se usa la MISMA curva que THREE.FogExp2 del mundo: si el
    // suelo y las cartas no se apagan igual, la matriz se despega del terreno.
    float f = uNieblaDens > 0.0
      ? 1.0 - exp(-uNieblaDens * uNieblaDens * vDist * vDist)
      : clamp((vDist - uNieblaCerca) / max(uNieblaLejos - uNieblaCerca, 1.0), 0.0, 1.0);
    c = mix(c, uNiebla, f * uNieblaFuerza);
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`;

function materialCartas(tex, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMapa: { value: tex },
      uTiempoVM: uniformesVientoMundo.uTiempoVM,   // reloj global, por referencia
      uFuerzaVM: uniformesVientoMundo.uFuerzaVM,
      uViento: { value: opts.viento ?? 1.0 },
      uUmbral: { value: opts.umbral ?? 0.34 },
      uFade: { value: opts.fade ? 1 : 0 },
      uCerca: { value: opts.cerca ?? 12 },
      uLejos: { value: opts.lejos ?? 26 },
      uCorte: { value: opts.corte ?? 220 },
      uAOmin: { value: opts.aoMin ?? 0.62 },
      uFadeLejos: { value: opts.fadeLejos ? 1 : 0 },
      uCorteA: { value: opts.corteA ?? 22 },
      uCorteB: { value: opts.corteB ?? 40 },
      uAmbiente: { value: opts.ambiente ?? 1.0 },
      uNiebla: { value: new THREE.Color(opts.niebla?.color ?? 0xc3d2cd) },
      uNieblaCerca: { value: opts.niebla?.cerca ?? 70 },
      uNieblaLejos: { value: opts.niebla?.lejos ?? 260 },
      uNieblaDens: { value: opts.niebla?.densidad ?? 0 },
      uNieblaFuerza: { value: opts.niebla?.fuerza ?? 0.75 },
    },
    vertexShader: VERT_CARTAS,
    fragmentShader: FRAG_CARTAS,
    side: THREE.DoubleSide,
  });
}

// ═════════════════════════════════════════════════════════════════════════════
//  Ocupación: rejilla de exclusión. El pajonal no crece dentro de la roca ni
//  encima del cojín de turbera ni en el claro reservado al frailejón.
// ═════════════════════════════════════════════════════════════════════════════
function crearOcupacion(area, celda = 1.0) {
  const w = Math.max(1, Math.ceil((area.x1 - area.x0) / celda));
  const h = Math.max(1, Math.ceil((area.z1 - area.z0) / celda));
  // cada celda guarda el radio² de exclusión más grande y su centro
  const cx = new Float32Array(w * h);
  const cz = new Float32Array(w * h);
  const cr = new Float32Array(w * h);
  const ix = (x) => Math.min(w - 1, Math.max(0, Math.floor((x - area.x0) / celda)));
  const iz = (z) => Math.min(h - 1, Math.max(0, Math.floor((z - area.z0) / celda)));
  return {
    marcar(x, z, r) {
      const r0 = Math.max(0, Math.ceil(r / celda));
      const gx = ix(x), gz = iz(z);
      for (let a = -r0; a <= r0; a++) {
        for (let b = -r0; b <= r0; b++) {
          const px = gx + a, pz = gz + b;
          if (px < 0 || pz < 0 || px >= w || pz >= h) continue;
          const k = pz * w + px;
          if (r > cr[k]) { cr[k] = r; cx[k] = x; cz[k] = z; }
        }
      }
    },
    ocupado(x, z, r = 0) {
      const gx = ix(x), gz = iz(z);
      const alcance = Math.ceil((r + 2.5) / celda);
      for (let a = -alcance; a <= alcance; a++) {
        for (let b = -alcance; b <= alcance; b++) {
          const px = gx + a, pz = gz + b;
          if (px < 0 || pz < 0 || px >= w || pz >= h) continue;
          const k = pz * w + px;
          if (cr[k] <= 0) continue;
          const dx = x - cx[k], dz = z - cz[k];
          const rr = cr[k] + r;
          if (dx * dx + dz * dz < rr * rr) return true;
        }
      }
      return false;
    },
  };
}

// ═════════════════════════════════════════════════════════════════════════════
//  GEOMETRÍAS: cojín de turbera y bloque de arenisca
// ═════════════════════════════════════════════════════════════════════════════
// Cojín: esfera achatada, base plana asentada, radio perturbado en dos octavas
// (grumos grandes + mullido fino) y normales SUAVES — nada de facetas. La
// silueta tiene que ser irregular: un cojín, no una bola.
function geoCojinMusgo(seed = 4) {
  const g = new THREE.SphereGeometry(1, 12, 8);
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y0 = P.getY(i), z = P.getZ(i);
    const n1 = fbmMP(x * 2.1 + seed, z * 2.1 - seed, 3);
    const n2 = fbmMP(x * 8.3 - seed * 0.7, z * 8.3 + seed * 1.3, 2);
    const r = 1 + (n1 - 0.5) * 0.40 + (n2 - 0.5) * 0.16;
    // el primer gate salió PANQUECHE: aplastar a 0.52 dejaba discos, no cojines.
    // Sphagnum forma domos casi hemisféricos.
    let y = y0 * 0.86 + 0.13;
    if (y < 0.015) y = 0.015;                       // base plana: se asienta
    y *= 0.88 + (n1 - 0.5) * 0.55;                  // lomos y hondonadas
    P.setXYZ(i, x * r, y, z * r);
  }
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

// Bloque de arenisca: caja subdividida empujada a una superelipsoide (cantos
// redondeados por intemperismo) más ruido. UVs de caja intactas → la costra de
// liquen cae bien en cada cara.
function geoBloqueArenisca(seed = 2) {
  const g = new THREE.BoxGeometry(1, 1, 1, 3, 3, 3);
  const P = g.attributes.position;
  const e = 4.2;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i) * 2, y = P.getY(i) * 2, z = P.getZ(i) * 2;
    const d = Math.pow(
      Math.pow(Math.abs(x), e) + Math.pow(Math.abs(y), e) + Math.pow(Math.abs(z), e),
      1 / e
    ) || 1;
    const k = 0.5 / d;
    let nx = x * k, ny = y * k, nz = z * k;
    const n = fbmMP(nx * 3.4 + seed, nz * 3.4 - seed * 0.6, 3);
    const n2 = fbmMP(ny * 6.1 - seed, nx * 6.1 + seed, 2);
    const rr = 1 + (n - 0.5) * 0.46 + (n2 - 0.5) * 0.20;
    P.setXYZ(i, nx * rr, ny * rr, nz * rr);
  }
  g.computeVertexNormals();
  const col = new Float32Array(P.count * 3);
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    // el pie del bloque está húmedo y en sombra propia; la cumbre, lavada
    const alto = THREE.MathUtils.clamp((y + 0.5) / 1.0, 0, 1);
    const base = 0.58 + alto * 0.52;
    const mancha = 0.86 + fbmMP(x * 5.1 + seed * 3, z * 5.1 - seed, 3) * 0.34;
    const v = base * mancha;
    col[i * 3] = v; col[i * 3 + 1] = v * 0.99; col[i * 3 + 2] = v * 0.95;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeBoundingSphere();
  return g;
}

// Caña de chusque: cilindro afinado con color por vértice (nudos más pálidos).
function geoCanaChusque() {
  const g = new THREE.CylinderGeometry(0.009, 0.016, 1, 5, 2, true);
  g.translate(0, 0.5, 0);
  const P = g.attributes.position;
  const col = new Float32Array(P.count * 3);
  const base = new THREE.Color(PALETA_PARAMO.chusqueCana);
  const nudo = new THREE.Color('#c9c98d');
  const c = new THREE.Color();
  for (let i = 0; i < P.count; i++) {
    const y = P.getY(i);
    const t = Math.abs(Math.sin(y * 11.0));
    c.copy(base).lerp(nudo, t > 0.94 ? 0.7 : 0.0);
    c.multiplyScalar(0.72 + y * 0.42);   // más clara hacia la punta
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeBoundingSphere();
  return g;
}

// ═════════════════════════════════════════════════════════════════════════════
//  FÁBRICA
// ═════════════════════════════════════════════════════════════════════════════
export function crearMatrizParamo(opts = {}) {
  const area = opts.area ?? { x0: -60, x1: 60, z0: -60, z1: 60 };
  const alturaEn = opts.alturaEn ?? (() => 0);
  const libre = opts.libre ?? (() => true);
  const seed = opts.seed ?? 20260807;
  const cal = CALIDADES[opts.calidad] ?? CALIDADES.alta;
  const densidad = opts.densidad ?? 1.15;
  const tam = opts.tile ?? 6;
  const radioDetalle = opts.radioDetalle ?? cal.radioDetalle;
  const nEmergentes = opts.emergentes ?? 28;
  const ambiente = opts.ambiente ?? 1.0;
  const niebla = opts.niebla ?? { color: 0xc3d2cd, cerca: 70, lejos: 260, fuerza: 0.75 };
  const luzDir = (opts.luzDir ?? new THREE.Vector3(0.42, 0.82, 0.38)).clone().normalize();

  const anchoX = area.x1 - area.x0;
  const anchoZ = area.z1 - area.z0;
  const m2 = anchoX * anchoZ;
  const rn = prngMP(seed);

  const grupo = new THREE.Group();
  grupo.name = 'matriz-paramo';
  const ocupacion = crearOcupacion(area, 1.0);
  const desechables = [];

  // campos de terreno derivados: humedad (turbera) y pedregal (roca)
  const humedadEn = opts.humedadEn ?? ((x, z) => fbmMP(x * 0.031 + 11.3, z * 0.031 - 4.7, 4));
  const pedregalEn = opts.pedregalEn ?? ((x, z) => fbmMP(x * 0.047 - 21.9, z * 0.047 + 8.1, 3));
  const pendienteEn = (x, z) => {
    const d = 1.2;
    const dx = alturaEn(x + d, z) - alturaEn(x - d, z);
    const dz = alturaEn(x, z + d) - alturaEn(x, z - d);
    return Math.sqrt(dx * dx + dz * dz) / (2 * d);
  };

  const dentro = (x, z) => x > area.x0 + 0.5 && x < area.x1 - 0.5 && z > area.z0 + 0.5 && z < area.z1 - 0.5;

  // ───────────────────────────────────────────────────────────────────────────
  //  1) CLAROS PARA EMERGENTES — se reservan PRIMERO para que el frailejón
  //     quede metido en un hueco real de la matriz (la enagua roza las macollas
  //     de al lado) en vez de plantado encima del pasto.
  // ───────────────────────────────────────────────────────────────────────────
  const claros = [];
  for (let intento = 0; intento < nEmergentes * 60 && claros.length < nEmergentes; intento++) {
    const x = area.x0 + rn() * anchoX;
    const z = area.z0 + rn() * anchoZ;
    if (!dentro(x, z) || !libre(x, z)) continue;
    if (humedadEn(x, z) > 0.66) continue;                 // el frailejón no vive en el charco
    if (ocupacion.ocupado(x, z, 2.6)) continue;
    ocupacion.marcar(x, z, 0.62);                          // el hueco de la roseta
    claros.push({ x, z, y: alturaEn(x, z) });
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  2) ROCA CON LÍQUENES — bloques donde el pedregal aflora y la pendiente
  //     sube. El liquen es PIONERO: vive en la textura de la piedra, y alrededor
  //     del bloque queda un halo de roca pelada (el pajonal se excluye).
  // ───────────────────────────────────────────────────────────────────────────
  const rocas = [];
  const objetivoRocas = Math.round(m2 / 260);
  for (let intento = 0; intento < objetivoRocas * 40 && rocas.length < objetivoRocas; intento++) {
    const x = area.x0 + rn() * anchoX;
    const z = area.z0 + rn() * anchoZ;
    if (!dentro(x, z) || !libre(x, z)) continue;
    const p = pedregalEn(x, z) + pendienteEn(x, z) * 0.9;
    if (p < 0.52) continue;
    if (humedadEn(x, z) > 0.70) continue;
    const s = 0.45 + rn() * 1.35;                          // bloques chicos y algún peñasco
    if (ocupacion.ocupado(x, z, s * 0.9)) continue;
    ocupacion.marcar(x, z, s * 0.78);                      // halo de roca pelada
    rocas.push({
      x, z, y: alturaEn(x, z),
      sx: s * (0.85 + rn() * 0.5),
      sy: s * (0.48 + rn() * 0.42),
      sz: s * (0.85 + rn() * 0.5),
      rx: (rn() - 0.5) * 0.34, ry: rn() * Math.PI * 2, rz: (rn() - 0.5) * 0.34,
      tint: 0.82 + rn() * 0.34,
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  3) TURBERA — cojines de Sphagnum en las depresiones húmedas, por PARCHES
  //     (un colchón, no cojines sueltos), con espejos de agua encharcada entre
  //     ellos: el páramo es fábrica de agua y eso se tiene que ver.
  // ───────────────────────────────────────────────────────────────────────────
  const cojines = [];
  const espejos = [];
  const colchon = [];   // baldosas cenitales de tapiz de Sphagnum
  const objetivoCojines = Math.round(m2 / 100);
  for (let intento = 0; intento < objetivoCojines * 30 && cojines.length < objetivoCojines; intento++) {
    const x = area.x0 + rn() * anchoX;
    const z = area.z0 + rn() * anchoZ;
    if (!dentro(x, z) || !libre(x, z)) continue;
    const hum = humedadEn(x, z);
    if (hum < 0.60) continue;                              // solo la depresión saturada
    if (pendienteEn(x, z) > 0.22) continue;                // el agua no se queda en la ladera
    const r = 0.32 + rn() * 0.58;
    if (ocupacion.ocupado(x, z, r * 0.30)) continue;
    ocupacion.marcar(x, z, r * 0.58);
    const herrumbre = rn() < 0.26 ? 0.55 + rn() * 0.45 : rn() * 0.16;  // acento medido
    cojines.push({
      x, z, y: alturaEn(x, z) - 0.02,
      r, alto: r * (0.62 + rn() * 0.34),
      ry: rn() * Math.PI * 2,
      herrumbre,
    });
    // el tapiz desborda el cojín: 2-3 baldosas alrededor de cada uno
    colchon.push({ x, z, y: alturaEn(x, z), r: r * (1.9 + rn() * 1.5), g: rn() * 6.28 });
    if (rn() < 0.62) {
      const a2 = rn() * Math.PI * 2, d2 = r * (1.1 + rn() * 1.6);
      const cx2 = x + Math.cos(a2) * d2, cz2 = z + Math.sin(a2) * d2;
      colchon.push({ x: cx2, z: cz2, y: alturaEn(cx2, cz2), r: r * (1.7 + rn() * 1.4), g: rn() * 6.28 });
    }
    if (rn() < 0.52) {
      espejos.push({ x: x + (rn() - 0.5) * 2.0, z: z + (rn() - 0.5) * 2.0, r: 0.34 + rn() * 0.9 });
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  4) CHUSQUE — matorral CERRADO. Se siembran manchones (no scatter suelto)
  //     y se cargan hacia el borde del área y hacia las vaguadas, que es donde
  //     el chusquesal real cierra el paso.
  // ───────────────────────────────────────────────────────────────────────────
  const canas = [];
  const hojarasca = [];
  const nManchones = Math.max(3, Math.round(m2 / 2400));
  for (let mi = 0; mi < nManchones; mi++) {
    // centro cargado al borde: |u| cerca de 1
    const bordeX = rn() < 0.5 ? -1 : 1;
    const u = bordeX * (0.62 + rn() * 0.36);
    const v = (rn() * 2 - 1) * (0.55 + rn() * 0.42);
    const cxm = (area.x0 + area.x1) / 2 + u * anchoX * 0.5;
    const czm = (area.z0 + area.z1) / 2 + v * anchoZ * 0.5;
    const radioM = 3.2 + rn() * 4.6;
    const nCanas = 70 + ((rn() * 90) | 0);
    for (let i = 0; i < nCanas; i++) {
      // denso en el centro del manchón → borde cerrado, no manchas ralas
      const a = rn() * Math.PI * 2;
      const rr = Math.pow(rn(), 0.55) * radioM;
      const x = cxm + Math.cos(a) * rr;
      const z = czm + Math.sin(a) * rr;
      if (!dentro(x, z) || !libre(x, z)) continue;
      if (ocupacion.ocupado(x, z, 0.05)) continue;
      const alto = 1.35 + rn() * 1.25;
      canas.push({
        x, z, y: alturaEn(x, z),
        alto,
        inclina: (rn() - 0.5) * 0.42,
        giro: rn() * Math.PI * 2,
        follaje: 0.55 + rn() * 0.5,
      });
    }
    ocupacion.marcar(cxm, czm, radioM * 0.45);   // el pajonal ralea, no desaparece
    // hojarasca del suelo del matorral: en un chusquesal el piso es caña caída
    // y hoja seca, NUNCA barro limpio (se vio pelado en el gate).
    const nHoj = Math.round(radioM * radioM * 0.55);
    for (let h = 0; h < nHoj; h++) {
      const ah = rn() * Math.PI * 2;
      const rh = Math.sqrt(rn()) * radioM * 1.1;
      const hx = cxm + Math.cos(ah) * rh, hz = czm + Math.sin(ah) * rh;
      if (!dentro(hx, hz) || !libre(hx, hz)) continue;
      hojarasca.push({ x: hx, z: hz, y: alturaEn(hx, hz), r: 0.9 + rn() * 1.5, g: rn() * 6.28 });
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  //  5) PAJONAL — la MATRIZ. Todo lo que quedó libre. Rejilla jitterada
  //     (Poisson barato) para que no se lea el patrón.
  // ───────────────────────────────────────────────────────────────────────────
  const paso = 1 / Math.sqrt(densidad);
  const cols = Math.max(1, Math.floor(anchoX / paso));
  const filas = Math.max(1, Math.floor(anchoZ / paso));
  const macollas = [];
  for (let gz = 0; gz < filas; gz++) {
    for (let gx = 0; gx < cols; gx++) {
      const x = area.x0 + (gx + 0.5 + (rn() - 0.5) * 0.92) * paso;
      const z = area.z0 + (gz + 0.5 + (rn() - 0.5) * 0.92) * paso;
      if (!dentro(x, z) || !libre(x, z)) continue;
      if (ocupacion.ocupado(x, z, 0.10)) continue;
      const hum = humedadEn(x, z);
      // en el borde de la turbera el pajonal RALEA (no hay corte de cuchillo)
      if (hum > 0.58 && rn() < (hum - 0.58) * 4.2) continue;
      const vigor = 0.82 + fbmMP(x * 0.12 + 3.1, z * 0.12 - 7.7, 3) * 0.5;
      macollas.push({
        x, z, y: alturaEn(x, z),
        alto: (0.52 + rn() * 0.46) * vigor,
        ancho: (0.42 + rn() * 0.34) * vigor,
        giro: rn() * Math.PI * 2,
        variante: (rn() * 4) | 0,
        tint: 0.86 + rn() * 0.30,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CONSTRUCCIÓN — de aquí para abajo, todo es InstancedMesh
  // ═══════════════════════════════════════════════════════════════════════════
  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler();
  const _p = new THREE.Vector3();
  const _s = new THREE.Vector3();
  const YAX = new THREE.Vector3(0, 1, 0);

  // ── 5a) MANTO DE IMPOSTORES + MANTO RASANTE, por SUPER-TILES ──────────────
  // Primer diseño: UN InstancedMesh para toda el área (2 draw calls fijos). El
  // relleno ya quedaba acotado por `uCorte` (la carta se colapsa más allá del
  // alcance de la niebla), y por eso el barrido de área daba 60 FPS hasta 23 ha.
  // PERO los triángulos ENVIADOS sí escalaban con el área: 3,78 M a 480×480 m,
  // porque el vertex shader corre igual para las cartas que después se tiran.
  // Arreglo: partir los dos mantos en super-tiles con `frustumCulled = true`.
  // three calcula la esfera envolvente del InstancedMesh a partir de sus
  // instancias, así que el culling es correcto y el costo pasa a depender del
  // DISCO VISIBLE, no del tamaño del páramo. Todos los super-tiles comparten
  // material y textura: mismo estado de dibujo, solo cambia el buffer.
  const texMacolla = texturaMacolla(seed);
  const texRasante = texturaMantoRasante(seed + 19);
  const matManto = materialCartas(texMacolla, {
    viento: 0.9, umbral: 0.30, fade: true,
    // la carta entra MUY pronto: a ~2.5 m ya aporta masa, a ~6.5 m manda.
    // Solo se borra donde la brizna real la puede reemplazar con ventaja.
    cerca: Math.max(1.8, radioDetalle * 0.19),
    lejos: Math.max(4.5, radioDetalle * 0.50),
    corte: opts.corte ?? 200,
    ambiente, niebla,
  });
  const rasanteA = opts.rasanteCerca ?? 24;
  const rasanteB = opts.rasanteLejos ?? 42;
  const matRasante = materialCartas(texRasante, {
    viento: 0, umbral: 0.40, fade: false, aoMin: 0.96,
    fadeLejos: true, corteA: rasanteA, corteB: rasanteB,
    corte: rasanteB + 3,                    // colapso duro: cero relleno detrás
    ambiente, niebla,
  });

  const SUPER = opts.tileManto ?? 32;
  const capas = [];                          // super-tiles del pajonal
  {
    const nsx = Math.max(1, Math.ceil(anchoX / SUPER));
    const cubos = new Map();
    for (const mm of macollas) {
      const gx = Math.min(nsx - 1, Math.max(0, Math.floor((mm.x - area.x0) / SUPER)));
      const gz = Math.max(0, Math.floor((mm.z - area.z0) / SUPER));
      const k = gz * nsx + gx;
      let l = cubos.get(k);
      if (!l) { l = []; cubos.set(k, l); }
      l.push(mm);
    }
    const grupoManto = new THREE.Group();
    grupoManto.name = 'paramo-pajonal-manto';
    const grupoRas = new THREE.Group();
    grupoRas.name = 'paramo-pajonal-rasante';
    grupo.add(grupoManto, grupoRas);

    for (const [k, lista] of cubos) {
      const gx = k % nsx, gz = (k / nsx) | 0;
      const cxS = area.x0 + (gx + 0.5) * SUPER;
      const czS = area.z0 + (gz + 0.5) * SUPER;
      const n = lista.length;

      // ── cartas verticales de macolla ──
      const geoM = geoCartasCruzadas(3);
      const varM = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
      geoM.setAttribute('aVar', varM);
      const mallaM = new THREE.InstancedMesh(geoM, matManto, n);
      mallaM.name = `pajonal-manto-${gx}-${gz}`;
      mallaM.castShadow = false;
      mallaM.receiveShadow = false;
      mallaM.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);

      // ── baldosas cenitales de hojarasca ──
      const geoR = geoQuadRasante();
      const varR = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
      geoR.setAttribute('aVar', varR);
      const mallaR = new THREE.InstancedMesh(geoR, matRasante, n);
      mallaR.name = `pajonal-rasante-${gx}-${gz}`;
      mallaR.castShadow = false;
      mallaR.receiveShadow = true;
      mallaR.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);

      const avM = varM.array, icM = mallaM.instanceColor.array;
      const avR = varR.array, icR = mallaR.instanceColor.array;
      for (let i = 0; i < n; i++) {
        const mm = lista[i];
        // proporción de macolla REAL: más alta que ancha (0.6-1.2 m de alto por
        // 0.5-0.9 de ancho). Achatada leía como matorral, no como macolla.
        _q.setFromAxisAngle(YAX, mm.giro);
        _p.set(mm.x, mm.y, mm.z);
        _s.set(mm.ancho * 1.95, mm.alto * 1.42, mm.ancho * 1.95);
        _m.compose(_p, _q, _s);
        mallaM.setMatrixAt(i, _m);
        const c = mm.variante % 2, r = (mm.variante / 2) | 0;
        avM[i * 3] = c * 0.5; avM[i * 3 + 1] = r * 0.5; avM[i * 3 + 2] = 0.5;
        icM[i * 3] = mm.tint * 0.98; icM[i * 3 + 1] = mm.tint * 1.02; icM[i * 3 + 2] = mm.tint * 0.90;

        _q.setFromAxisAngle(YAX, mm.giro * 1.7 + 0.9);
        _p.set(mm.x, mm.y + 0.035, mm.z);
        const w = mm.ancho * 2.0;          // desborda la mata: solapa con la vecina
        _s.set(w, 1, w);
        _m.compose(_p, _q, _s);
        mallaR.setMatrixAt(i, _m);
        avR[i * 3] = 0; avR[i * 3 + 1] = 0; avR[i * 3 + 2] = 1;
        const t = mm.tint * 0.94;
        icR[i * 3] = t; icR[i * 3 + 1] = t * 1.03; icR[i * 3 + 2] = t * 0.88;
      }
      mallaM.instanceMatrix.needsUpdate = true;
      mallaM.instanceColor.needsUpdate = true;
      varM.needsUpdate = true;
      mallaR.instanceMatrix.needsUpdate = true;
      mallaR.instanceColor.needsUpdate = true;
      varR.needsUpdate = true;

      grupoManto.add(mallaM);
      grupoRas.add(mallaR);
      capas.push({ cx: cxS, cz: czS, manto: mallaM, rasante: mallaR });
    }
  }

  // ── 5b) anillo de detalle: briznas REALES por tile (quickGrass de la casa) ──
  // Un tile = un InstancedMesh = un draw call, con frustum culling de three
  // (InstancedMesh calcula su esfera envolvente a partir de las instancias) y
  // culling extra por distancia. Se pre-construyen todos para no tener tirones
  // al cruzar de tile; solo se prende el puñado que está cerca y en cámara.
  const tiles = [];
  if (cal.briznas > 0 && macollas.length) {
    const nx = Math.max(1, Math.ceil(anchoX / tam));
    const nz = Math.max(1, Math.ceil(anchoZ / tam));
    const cubos = new Map();
    for (const mm of macollas) {
      const gx = Math.min(nx - 1, Math.max(0, Math.floor((mm.x - area.x0) / tam)));
      const gz = Math.min(nz - 1, Math.max(0, Math.floor((mm.z - area.z0) / tam)));
      const k = gz * nx + gx;
      let lista = cubos.get(k);
      if (!lista) { lista = []; cubos.set(k, lista); }
      lista.push(mm);
    }
    const grupoDetalle = new THREE.Group();
    grupoDetalle.name = 'paramo-pajonal-detalle';
    grupo.add(grupoDetalle);
    for (const [k, lista] of cubos) {
      const gx = k % nx, gz = (k / nx) | 0;
      const cxT = area.x0 + (gx + 0.5) * tam;
      const czT = area.z0 + (gz + 0.5) * tam;
      // altura media de las macollas del tile → densidad de brizna proporcional
      const puntos = lista.map((mm) => ({ x: mm.x, y: mm.y, z: mm.z }));
      const parche = crearParchePasto(grupoDetalle, {
        puntos,
        densidad: cal.briznas,
        radio: 0.26,                       // MACOLLA apretada, no césped disperso
        altura: [0.40, 1.00],
        // Calamagrostis effusa: lámina fina. Con la pala ancha del primer
        // intento se podían CONTAR las briznas; con 1.3 cm salían ALAMBRES
        // rectos de un píxel (segundo gate). 1.9 cm + combado alto = pala.
        ancho: 0.019,
        segmentos: cal.segs,
        colorBase: PALETA_PARAMO.pajonalBase,
        colorPunta: PALETA_PARAMO.pajonalPunta,
        tinteJitter: 0.20,
        // OJO (hallazgo del gate): quickGrass compone la instancia con
        // `scale = (ancho, alto, ancho)` y el combado/viento viven en la Z
        // LOCAL — o sea que el arco se escala por el ANCHO de la brizna, no por
        // su alto. Con pala de 1.9 cm, un combado de 0.8 da 1.5 cm de curva en
        // una brizna de 1 m: briznas RECTAS que leen como alambres (se vio en el
        // gate). Los valores altos de acá NO son exageración: compensan ese
        // escalado. 8.0 × 0.019 ≈ 19 cm de arco, que es lo que hace Calamagrostis.
        viento: 5.0,
        combado: 8.0,
        name: `pajonal-tile-${gx}-${gz}`,
      });
      if (!parche.mesh) continue;
      parche.mesh.visible = false;
      tiles.push({ cx: cxT, cz: czT, parche });
      desechables.push(parche);
    }
  }

  // ── 6) CHUSQUE: cañas (1 draw call) + masa de hoja lanceolada (1 draw call) ─
  let cañasMesh = null, hojaMesh = null, texHoja = null;
  if (canas.length) {
    const geoCana = geoCanaChusque();
    const matCana = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.86, metalness: 0.0, flatShading: false,
    });
    cañasMesh = new THREE.InstancedMesh(geoCana, matCana, canas.length);
    cañasMesh.name = 'paramo-chusque-canas';
    cañasMesh.castShadow = false;   // ver nota de sombras (coste x2)
    cañasMesh.receiveShadow = true;
    for (let i = 0; i < canas.length; i++) {
      const c = canas[i];
      _e.set(c.inclina * Math.cos(c.giro), c.giro, c.inclina * Math.sin(c.giro));
      _q.setFromEuler(_e);
      _p.set(c.x, c.y, c.z);
      _s.set(1, c.alto, 1);
      _m.compose(_p, _q, _s);
      cañasMesh.setMatrixAt(i, _m);
    }
    cañasMesh.instanceMatrix.needsUpdate = true;
    grupo.add(cañasMesh);

    // masa de hoja. PRIMER GATE: dos cartas por caña APILADAS en vertical (t=0.40
    // y t=0.72) hacían torres — el chusquesal leía como una hilera de cipreses
    // podados. Chusquea tessellata no hace columnas: hace un colchón CERRADO y
    // de copa plana del que asoman las cañas. Ahora va UNA carta ancha por cada
    // ~3 cañas, corrida en XZ, para que la masa se cierre en HORIZONTAL.
    texHoja = texturaFollaje(THREE, {
      seed: seed + 41, tam: 512,
      oscuro: '#27441f', medio: PALETA_PARAMO.chusqueHoja, claro: PALETA_PARAMO.chusqueHojaClara,
      hojas: 1700, alargue: 3.4,
    });
    const geoHoja = geoCartasCruzadas(3);
    const conHoja = canas.filter((_, i) => i % 2 === 0);
    const nHoja = Math.max(1, conHoja.length);
    const varHoja = new THREE.InstancedBufferAttribute(new Float32Array(nHoja * 3), 3);
    geoHoja.setAttribute('aVar', varHoja);
    const matHoja = materialCartas(texHoja, {
      viento: 0.75, umbral: 0.42, fade: false, ambiente, niebla,
    });
    hojaMesh = new THREE.InstancedMesh(geoHoja, matHoja, nHoja);
    hojaMesh.name = 'paramo-chusque-hoja';
    hojaMesh.frustumCulled = false;
    hojaMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(nHoja * 3), 3);
    {
      const av = varHoja.array, ic = hojaMesh.instanceColor.array;
      for (let k = 0; k < conHoja.length; k++) {
        const c = conHoja[k];
        const t = 0.56 + ((k * 37) % 23) / 90;              // 0.56–0.81 del alto
        const desvio = 0.55 + ((k * 53) % 17) / 24;
        const dx = Math.sin(c.giro * 2.3) * desvio;
        const dz = Math.cos(c.giro * 2.3) * desvio;
        _q.setFromAxisAngle(YAX, c.giro * 1.9);
        _p.set(c.x + dx, c.y + c.alto * t, c.z + dz);
        // MÁS ANCHA QUE ALTA: así el colchón cierra de lado y queda copa plana
        const s = c.follaje * 1.20;
        _s.set(s * 1.50, s * 0.88, s * 1.50);
        _m.compose(_p, _q, _s);
        hojaMesh.setMatrixAt(k, _m);
        av[k * 3] = 0; av[k * 3 + 1] = 0; av[k * 3 + 2] = 1;
        const tt = 0.86 + ((k * 7) % 11) / 26;
        ic[k * 3] = tt * 0.96; ic[k * 3 + 1] = tt * 1.06; ic[k * 3 + 2] = tt * 0.84;
      }
      hojaMesh.instanceMatrix.needsUpdate = true;
      hojaMesh.instanceColor.needsUpdate = true;
      varHoja.needsUpdate = true;
    }
    grupo.add(hojaMesh);
  }

  // hojarasca del piso del chusquesal — 1 draw call, misma textura y material
  // que el manto rasante del pajonal (mismo estado de dibujo, cero coste extra
  // de material). Es lo que impide que el matorral flote sobre barro limpio.
  let hojarascaMesh = null;
  if (hojarasca.length) {
    const geoH = geoQuadRasante();
    const varH = new THREE.InstancedBufferAttribute(new Float32Array(hojarasca.length * 3), 3);
    geoH.setAttribute('aVar', varH);
    hojarascaMesh = new THREE.InstancedMesh(geoH, matRasante, hojarasca.length);
    hojarascaMesh.name = 'paramo-chusque-hojarasca';
    hojarascaMesh.castShadow = false;
    hojarascaMesh.receiveShadow = true;
    hojarascaMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(hojarasca.length * 3), 3);
    {
      const av = varH.array, ic = hojarascaMesh.instanceColor.array;
      for (let i = 0; i < hojarasca.length; i++) {
        const h = hojarasca[i];
        _q.setFromAxisAngle(YAX, h.g);
        _p.set(h.x, h.y + 0.03, h.z);
        _s.set(h.r, 1, h.r);
        _m.compose(_p, _q, _s);
        hojarascaMesh.setMatrixAt(i, _m);
        av[i * 3] = 0; av[i * 3 + 1] = 0; av[i * 3 + 2] = 1;
        // más seca y apagada que la del pajonal: bajo el matorral entra poca luz
        const t = 0.72 + ((i * 13) % 9) / 42;
        ic[i * 3] = t * 1.02; ic[i * 3 + 1] = t * 0.98; ic[i * 3 + 2] = t * 0.80;
      }
      hojarascaMesh.instanceMatrix.needsUpdate = true;
      hojarascaMesh.instanceColor.needsUpdate = true;
      varH.needsUpdate = true;
    }
    grupo.add(hojarascaMesh);
  }

  // ── 7) TURBERA: cojines (1) + pelusa (1) + espejos de agua (1) ─────────────
  let cojinMesh = null, aguaMesh = null, pelusa = null, texMusgo = null;
  let colchonMesh = null, texColchon = null;
  if (colchon.length) {
    texColchon = texturaColchonMusgo(seed + 23);
    const geoC = geoQuadRasante();
    const varC = new THREE.InstancedBufferAttribute(new Float32Array(colchon.length * 3), 3);
    geoC.setAttribute('aVar', varC);
    const matC = materialCartas(texColchon, {
      viento: 0, umbral: 0.36, fade: false, aoMin: 0.98,
      corte: opts.corte ?? 200, ambiente, niebla,
    });
    colchonMesh = new THREE.InstancedMesh(geoC, matC, colchon.length);
    colchonMesh.name = 'paramo-turbera-colchon';
    colchonMesh.frustumCulled = false;
    colchonMesh.receiveShadow = true;
    colchonMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(colchon.length * 3), 3);
    {
      const av = varC.array, ic = colchonMesh.instanceColor.array;
      for (let i = 0; i < colchon.length; i++) {
        const c = colchon[i];
        _q.setFromAxisAngle(YAX, c.g);
        _p.set(c.x, c.y + 0.03, c.z);
        _s.set(c.r, 1, c.r);
        _m.compose(_p, _q, _s);
        colchonMesh.setMatrixAt(i, _m);
        av[i * 3] = 0; av[i * 3 + 1] = 0; av[i * 3 + 2] = 1;
        const t = 0.92 + ((i * 11) % 9) / 40;
        ic[i * 3] = t * 0.96; ic[i * 3 + 1] = t * 1.04; ic[i * 3 + 2] = t * 0.86;
      }
      colchonMesh.instanceMatrix.needsUpdate = true;
      colchonMesh.instanceColor.needsUpdate = true;
      varC.needsUpdate = true;
    }
    grupo.add(colchonMesh);
  }
  if (cojines.length) {
    texMusgo = texturaMusgo(seed + 7);
    const geoCojin = geoCojinMusgo(seed % 13);
    const matCojin = new THREE.MeshStandardMaterial({
      map: texMusgo, roughness: 0.94, metalness: 0.0,
    });
    cojinMesh = new THREE.InstancedMesh(geoCojin, matCojin, cojines.length);
    cojinMesh.name = 'paramo-turbera-cojines';
    cojinMesh.castShadow = false;   // ver nota de sombras (coste x2)
    cojinMesh.receiveShadow = true;
    cojinMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cojines.length * 3), 3);
    const verde = new THREE.Color(PALETA_PARAMO.musgoVerde);
    const rust = new THREE.Color(PALETA_PARAMO.musgoHerrumbre);
    const cc = new THREE.Color();
    {
      const ic = cojinMesh.instanceColor.array;
      for (let i = 0; i < cojines.length; i++) {
        const c = cojines[i];
        _q.setFromAxisAngle(YAX, c.ry);
        _p.set(c.x, c.y, c.z);
        _s.set(c.r, c.alto, c.r * (0.86 + (i % 5) * 0.06));
        _m.compose(_p, _q, _s);
        cojinMesh.setMatrixAt(i, _m);
        // el instanceColor multiplica el mapa: verde dominante, herrumbre acento
        cc.copy(verde).lerp(rust, c.herrumbre);
        const b = 1.35;   // el mapa ya trae el tono; esto lo modula sin apagarlo
        ic[i * 3] = cc.r * b + 0.42; ic[i * 3 + 1] = cc.g * b + 0.42; ic[i * 3 + 2] = cc.b * b + 0.42;
      }
      cojinMesh.instanceMatrix.needsUpdate = true;
      cojinMesh.instanceColor.needsUpdate = true;
    }
    grupo.add(cojinMesh);

    // pelusa: brizna cortísima sobre el lomo del cojín — rompe la silueta del
    // domo para que lea MULLIDO y no plástico. Misma técnica de la casa.
    if (cal.pelusa > 0) {
      const puntos = [];
      for (const c of cojines) {
        const rp = prngMP((c.x * 73 + c.z * 131 + seed) >>> 0);
        for (let i = 0; i < cal.pelusa; i++) {
          const a = rp() * Math.PI * 2;
          const rr = Math.sqrt(rp()) * c.r * 1.04;   // desborda: rompe el canto
          // altura aproximada del domo en ese radio (elipsoide achatado)
          const h = c.alto * Math.sqrt(Math.max(0, 1 - (rr / c.r) * (rr / c.r))) * 0.92;
          puntos.push({ x: c.x + Math.cos(a) * rr, y: c.y + h, z: c.z + Math.sin(a) * rr });
        }
      }
      pelusa = crearParchePasto(grupo, {
        puntos,
        densidad: 1,
        radio: 0.035,
        altura: [0.035, 0.10],
        ancho: 0.010,
        segmentos: 3,
        colorBase: '#3d6129',
        colorPunta: PALETA_PARAMO.musgoClaro,
        tinteJitter: 0.24,
        viento: 0.22,
        combado: 0.7,
        name: 'paramo-turbera-pelusa',
      });
      if (pelusa.mesh) { pelusa.mesh.frustumCulled = true; desechables.push(pelusa); }
    }
  }
  if (espejos.length) {
    const geoAgua = new THREE.CircleGeometry(1, 14);
    geoAgua.rotateX(-Math.PI / 2);
    const matAgua = new THREE.MeshStandardMaterial({
      // sin envMap, un color casi negro se ve NEGRO. El charco de turbera se
      // lee por lo que refleja: el cielo gris-verdoso del páramo.
      color: new THREE.Color('#5c6f70'),
      roughness: 0.11, metalness: 0.0,
      transparent: true, opacity: 0.88,
    });
    aguaMesh = new THREE.InstancedMesh(geoAgua, matAgua, espejos.length);
    aguaMesh.name = 'paramo-turbera-agua';
    aguaMesh.receiveShadow = true;
    for (let i = 0; i < espejos.length; i++) {
      const e = espejos[i];
      _q.setFromAxisAngle(YAX, i * 0.7);
      _p.set(e.x, alturaEn(e.x, e.z) + 0.012, e.z);
      _s.set(e.r, 1, e.r * 0.82);
      _m.compose(_p, _q, _s);
      aguaMesh.setMatrixAt(i, _m);
    }
    aguaMesh.instanceMatrix.needsUpdate = true;
    grupo.add(aguaMesh);
  }

  // ── 8) ROCA CON LÍQUENES: 1 draw call ─────────────────────────────────────
  let rocaMesh = null, texRoca = null;
  if (rocas.length) {
    texRoca = texturaLiquen(seed + 3);
    const geoRoca = geoBloqueArenisca(seed % 7);
    const matRoca = new THREE.MeshStandardMaterial({
      map: texRoca, roughness: 0.93, metalness: 0.0, vertexColors: true,
    });
    rocaMesh = new THREE.InstancedMesh(geoRoca, matRoca, rocas.length);
    rocaMesh.name = 'paramo-roca-liquen';
    rocaMesh.castShadow = true;
    rocaMesh.receiveShadow = true;
    rocaMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(rocas.length * 3), 3);
    const ic = rocaMesh.instanceColor.array;
    for (let i = 0; i < rocas.length; i++) {
      const r = rocas[i];
      _e.set(r.rx, r.ry, r.rz);
      _q.setFromEuler(_e);
      // el bloque se entierra un poco: aflora, no está posado como una pelota
      _p.set(r.x, r.y + r.sy * 0.34, r.z);
      _s.set(r.sx, r.sy, r.sz);
      _m.compose(_p, _q, _s);
      rocaMesh.setMatrixAt(i, _m);
      ic[i * 3] = r.tint; ic[i * 3 + 1] = r.tint * 0.99; ic[i * 3 + 2] = r.tint * 0.95;
    }
    rocaMesh.instanceMatrix.needsUpdate = true;
    rocaMesh.instanceColor.needsUpdate = true;
    grupo.add(rocaMesh);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CICLO: solo prende/apaga tiles de detalle. Cero escritura de matrices por
  //  frame (la transición al impostor la hace el shader por distancia).
  // ═══════════════════════════════════════════════════════════════════════════
  const r2 = radioDetalle * radioDetalle;
  const corteManto = (opts.corte ?? 200) + SUPER;
  const corteRas = rasanteB + SUPER;
  const r2Manto = corteManto * corteManto;
  const r2Ras = corteRas * corteRas;
  function actualizar(camara) {
    if (!camara) return;
    const cx = camara.position.x, cz = camara.position.z;
    // super-tiles: el frustum lo hace three; acá solo se apaga lo que ya cayó
    // fuera del alcance de la niebla (el shader lo colapsaría igual, pero así
    // ni se envían sus vértices).
    for (let i = 0; i < capas.length; i++) {
      const c = capas[i];
      const dx = c.cx - cx, dz = c.cz - cz;
      const d2 = dx * dx + dz * dz;
      c.manto.visible = d2 < r2Manto;
      c.rasante.visible = d2 < r2Ras;
    }
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      const dx = t.cx - cx, dz = t.cz - cz;
      // radio del tile sumado: el tile entra completo antes de que se note
      t.parche.mesh.visible = (dx * dx + dz * dz) < r2 + tam * tam;
    }
  }

  function clarosParaEmergentes(n = claros.length) {
    return claros.slice(0, Math.max(0, n)).map((c) => ({ ...c }));
  }

  function stats() {
    return {
      m2,
      macollas: macollas.length,
      densidadReal: +(macollas.length / m2).toFixed(3),
      tilesDetalle: tiles.length,
      tilesVisibles: tiles.reduce((a, t) => a + (t.parche.mesh.visible ? 1 : 0), 0),
      superTiles: capas.length,
      superTilesVivos: capas.reduce((a, c) => a + (c.manto.visible ? 1 : 0), 0),
      briznasPorTile: tiles.length ? cal.briznas * Math.round(macollas.length / tiles.length) : 0,
      canasChusque: canas.length,
      hojarascaChusque: hojarasca.length,
      cojinesTurbera: cojines.length,
      colchonTurbera: colchon.length,
      espejosAgua: espejos.length,
      rocas: rocas.length,
      claros: claros.length,
      radioDetalle,
    };
  }

  function dispose() {
    for (const d of desechables) d.dispose();
    for (const c of capas) {
      c.manto.geometry.dispose();
      c.rasante.geometry.dispose();
    }
    matManto.dispose();
    matRasante.dispose();
    for (const o of [cañasMesh, hojaMesh, hojarascaMesh, colchonMesh, cojinMesh, aguaMesh, rocaMesh]) {
      if (!o) continue;
      o.geometry.dispose();
      o.material.dispose();
      grupo.remove(o);
    }
    for (const t of [texMacolla, texRasante, texHoja, texMusgo, texColchon, texRoca]) if (t) t.dispose();
  }

  // la luz del lambert barato de las cartas la fija el que llama (el material
  // real de cojines/rocas usa las luces de la escena)
  grupo.userData.luzDir = luzDir;
  grupo.userData.paleta = PALETA_PARAMO;

  return { grupo, actualizar, clarosParaEmergentes, stats, dispose };
}
