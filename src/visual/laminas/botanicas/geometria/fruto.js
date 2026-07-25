/*
 * fruto — el ÓRGANO COSECHADO, y sobre todo su CORTE.
 *
 * El corte es la mitad de una lámina botánica y la razón de que la lámina
 * enseñe algo que la foto no enseña: la foto muestra la cáscara; el corte
 * muestra por qué el cultivo es lo que es. Y en el caso de esta librería, el
 * corte es también la prueba de una tesis que sostiene media colección:
 *
 *   - el TUBÉRCULO de la papa tiene OJOS (yemas de tallo) y una médula
 *     estrellada: es un TALLO. Por eso rebrota y por eso se siembra a pedazos.
 *   - la RAÍZ TUBEROSA de la yuca tiene un CORDÓN FIBROSO en el eje y no
 *     tiene ojos: es una RAÍZ. Por eso NO rebrota y se siembra de estaca.
 *
 * Puestos uno al lado del otro en la misma colección, esos dos cortes
 * explican solos por qué dos matas que "dan un bulto bajo tierra" se siembran
 * y se manejan al revés. Eso es lo que hace un cuaderno de campo.
 *
 * Convención: el corte se centra en (0,0). Devuelven datos, no JSX.
 */
import { entre, tembleque } from '../nucleo/rng.js';
import { suave, lerp } from '../nucleo/trazo.js';
import { borron } from '../nucleo/trama.js';

/** Contorno orgánico redondeado: ningún fruto es una elipse de compás. */
function contorno(rng, rx, ry, irregular = 0.06, lados = 22) {
  const pts = [];
  for (let i = 0; i < lados; i += 1) {
    const a = (i / lados) * Math.PI * 2;
    pts.push([
      Math.cos(a) * rx * (1 + tembleque(rng, irregular)),
      Math.sin(a) * ry * (1 + tembleque(rng, irregular)),
    ]);
  }
  return pts;
}

/** TUBÉRCULO en corte — papa, papa criolla, ulluco. Con OJOS. */
export function tuberculo(rng, op = {}) {
  const { rx = 46, ry = 32, ojos = 5 } = op;
  const piel = contorno(rng, rx, ry, 0.07, 26);
  /* la peridermis (la piel) es una banda delgada, la corteza una banda ancha,
     y la médula el corazón acuoso: tres anillos, no un relleno */
  const corteza = contorno(rng, rx * 0.86, ry * 0.82, 0.05, 24);
  /* la médula del tubérculo es ESTRELLADA: se ramifica hacia cada ojo, porque
     cada ojo es una yema y la médula la alimenta. Ese es el dibujo que prueba
     que el tubérculo es un tallo. */
  const medulaPts = [];
  const n = 40;
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const brazo = Math.abs(Math.cos(a * (ojos / 2))) ** 1.6;
    const rr = lerp(0.3, 0.66, brazo);
    medulaPts.push([Math.cos(a) * rx * rr, Math.sin(a) * ry * rr]);
  }
  const ojales = [];
  for (let i = 0; i < ojos; i += 1) {
    /* los ojos NO se reparten parejo: se apretujan hacia el extremo apical
       (el opuesto al ombligo del estolón). Otro detalle que delata el tallo. */
    const t = i / Math.max(ojos - 1, 1);
    const a = lerp(-1.15, 1.15, t) + tembleque(rng, 0.12);
    ojales.push({
      x: Math.cos(a) * rx * 0.92,
      y: Math.sin(a) * ry * 0.9,
      rot: (a * 180) / Math.PI,
      r: entre(rng, 2.2, 3.2),
    });
  }
  return {
    tipo: 'tuberculo',
    piel: suave(piel, true, 0.5),
    corteza: suave(corteza, true, 0.5),
    medula: suave(medulaPts, true, 0.5),
    ojos: ojales,
    /* el ombligo: la cicatriz por donde colgaba del estolón */
    ombligo: { x: -rx * 0.94, y: 0, r: 2.4 },
    caja: { x: -rx, y: -ry, w: rx * 2, h: ry * 2 },
  };
}

/** RAÍZ TUBEROSA en corte — yuca, arracacha. Con CORDÓN FIBROSO, sin ojos. */
export function raizTuberosaCorte(rng, op = {}) {
  const { rx = 26, ry = 44 } = op;
  const piel = contorno(rng, rx, ry, 0.05, 24);
  /* la yuca pela en dos capas: la peridermis parda finita y la corteza blanca
     gruesa que se desprende entera cuando está fresca. Se dibujan las dos. */
  const peridermis = suave(piel, true, 0.5);
  const corteza = suave(contorno(rng, rx * 0.9, ry * 0.93, 0.04, 22), true, 0.5);
  const pulpa = suave(contorno(rng, rx * 0.76, ry * 0.86, 0.04, 22), true, 0.5);
  /* EL CORDÓN: el haz fibroso del eje. Es lo que uno saca al partir la yuca
     cocida, y es la prueba de que esto es una raíz y no un tallo. */
  const cordon = `M0 ${(-ry * 0.86).toFixed(1)} L0 ${(ry * 0.86).toFixed(1)}`;
  /* radios del xilema: la raíz reparte hacia afuera desde el eje */
  let radios = '';
  for (let i = 0; i < 14; i += 1) {
    const a = (i / 14) * Math.PI * 2;
    radios += `M0 0 L${(Math.cos(a) * rx * 0.72).toFixed(1)} ${(Math.sin(a) * ry * 0.8).toFixed(1)}`;
  }
  return {
    tipo: 'raizTuberosa',
    peridermis,
    corteza,
    pulpa,
    cordon,
    radios,
    caja: { x: -rx, y: -ry, w: rx * 2, h: ry * 2 },
  };
}

/** BAYA en corte — tomate, tomate de árbol, uchuva, curuba. Lóculos con
 *  semillas en gel. `loculos` y `gel` cambian la especie. */
export function baya(rng, op = {}) {
  const { rx = 34, ry = 30, loculos = 3, semillasPorLoculo = 7, ovoide = false } = op;
  const pts = ovoide
    ? contorno(rng, rx, ry, 0.04, 24).map(([x, y]) => [x * (1 + (y / ry) * 0.13), y])
    : contorno(rng, rx, ry, 0.05, 24);
  const piel = suave(pts, true, 0.5);
  const pared = suave(contorno(rng, rx * 0.88, ry * 0.88, 0.03, 22), true, 0.5);
  /* los lóculos: las cámaras del gel. La placenta las separa y sube del eje */
  const camaras = [];
  const semillas = [];
  for (let i = 0; i < loculos; i += 1) {
    const a = (i / loculos) * Math.PI * 2 - Math.PI / 2;
    const cx = Math.cos(a) * rx * 0.4;
    const cy = Math.sin(a) * ry * 0.4;
    camaras.push({ d: suave(borron(rng, cx, cy, Math.min(rx, ry) * 0.34, 0.2, 13), true, 0.5), cx, cy });
    for (let k = 0; k < semillasPorLoculo; k += 1) {
      const aa = (k / semillasPorLoculo) * Math.PI * 2 + tembleque(rng, 0.4);
      const rr = Math.min(rx, ry) * entre(rng, 0.1, 0.26);
      semillas.push({
        x: cx + Math.cos(aa) * rr,
        y: cy + Math.sin(aa) * rr * 0.9,
        rx: Math.min(rx, ry) * 0.075,
        ry: Math.min(rx, ry) * 0.055,
        rot: entre(rng, 0, 180),
      });
    }
  }
  /* la placenta: el eje central del que cuelga todo */
  let placenta = '';
  for (let i = 0; i < loculos; i += 1) {
    const a = (i / loculos) * Math.PI * 2 - Math.PI / 2 + Math.PI / loculos;
    placenta += `M0 0 L${(Math.cos(a) * rx * 0.8).toFixed(1)} ${(Math.sin(a) * ry * 0.8).toFixed(1)}`;
  }
  return {
    tipo: 'baya',
    piel,
    pared,
    camaras,
    semillas,
    placenta,
    caja: { x: -rx, y: -ry, w: rx * 2, h: ry * 2 },
  };
}

/** DRUPA DEL CAFÉ en corte — LA lámina del café. Pulpa, mucílago (la baba),
 *  pergamino, y los DOS GRANOS CARA A CARA con su surco. Cada capa tiene el
 *  nombre que usa el beneficio: despulpado quita la pulpa, el lavado quita la
 *  baba, el trillado quita el pergamino. La lámina es el mapa del proceso. */
export function drupaCafe(rng, op = {}) {
  const { r = 34 } = op;
  const piel = suave(contorno(rng, r, r * 0.94, 0.03, 22), true, 0.5);
  const pulpa = suave(contorno(rng, r * 0.9, r * 0.85, 0.03, 20), true, 0.5);
  const mucilago = suave(contorno(rng, r * 0.78, r * 0.73, 0.02, 20), true, 0.5);
  /* los dos granos: cada uno un semicírculo con la cara PLANA enfrentada al
     otro y el SURCO en esa cara. Ese surco es donde se agarra el pergamino. */
  const grano = (s) => {
    const pts = [];
    for (let i = 0; i <= 16; i += 1) {
      const a = -Math.PI / 2 + (i / 16) * Math.PI;
      pts.push([s * Math.cos(a) * r * 0.62 * 0.92 + s * r * 0.06, Math.sin(a) * r * 0.66]);
    }
    /* la cara plana con el surco hacia adentro */
    pts.push([s * r * 0.1, r * 0.5]);
    pts.push([s * r * 0.16, 0]);
    pts.push([s * r * 0.1, -r * 0.5]);
    return suave(pts, true, 0.45);
  };
  return {
    tipo: 'drupaCafe',
    piel,
    pulpa,
    mucilago,
    granos: [grano(-1), grano(1)],
    pergaminos: [
      suave(contorno(rng, r * 0.36, r * 0.7, 0.02, 18), true, 0.5),
      suave(contorno(rng, r * 0.36, r * 0.7, 0.02, 18), true, 0.5),
    ],
    surco: [`M${(-r * 0.13).toFixed(1)} ${(-r * 0.5).toFixed(1)} Q${(-r * 0.22).toFixed(1)} 0 ${(-r * 0.13).toFixed(1)} ${(r * 0.5).toFixed(1)}`,
      `M${(r * 0.13).toFixed(1)} ${(-r * 0.5).toFixed(1)} Q${(r * 0.22).toFixed(1)} 0 ${(r * 0.13).toFixed(1)} ${(r * 0.5).toFixed(1)}`],
    caja: { x: -r, y: -r, w: r * 2, h: r * 2 },
  };
}

/** DRUPA DEL AGUACATE en corte — la semilla ocupa medio fruto. */
export function drupaAguacate(rng, op = {}) {
  const { rx = 30, ry = 42 } = op;
  /* piriforme: cuello arriba, panza abajo */
  const pts = contorno(rng, rx, ry, 0.03, 24).map(([x, y]) => [x * lerp(0.62, 1.06, (y + ry) / (ry * 2)), y]);
  return {
    tipo: 'drupaAguacate',
    piel: suave(pts, true, 0.5),
    pulpa: suave(pts.map(([x, y]) => [x * 0.9, y * 0.92]), true, 0.5),
    semilla: suave(contorno(rng, rx * 0.52, rx * 0.54, 0.03, 18).map(([x, y]) => [x, y + ry * 0.24]), true, 0.5),
    /* la semilla trae sus dos cotiledones y su tegumento papeloso */
    tegumento: suave(contorno(rng, rx * 0.46, rx * 0.48, 0.02, 16).map(([x, y]) => [x, y + ry * 0.24]), true, 0.5),
    hendidura: `M0 ${(ry * 0.24 - rx * 0.46).toFixed(1)} L0 ${(ry * 0.24 + rx * 0.46).toFixed(1)}`,
    caja: { x: -rx, y: -ry, w: rx * 2, h: ry * 2 },
  };
}

/** VAINA — frijol, haba, arveja. Valvas, sutura y granos adentro. */
export function vaina(rng, op = {}) {
  const { largo = 90, ancho = 13, granos = 5, curva = 0.16, gordo = false } = op;
  const arriba = [];
  const abajo = [];
  for (let i = 0; i <= 20; i += 1) {
    const t = i / 20;
    const x = t * largo;
    const comba = Math.sin(Math.PI * t) * largo * curva;
    /* la vaina se abulta donde hay grano: el perfil ondula con los granos */
    const bulto = gordo ? Math.abs(Math.sin(t * Math.PI * granos)) * ancho * 0.22 : 0;
    const w = ancho * Math.sin(Math.PI * Math.min(t * 1.12, 1)) ** 0.35 + bulto;
    arriba.push([x, -w - comba * 0.3]);
    abajo.push([x, w - comba * 0.3]);
  }
  const semillas = [];
  for (let i = 0; i < granos; i += 1) {
    const t = 0.14 + (i / Math.max(granos - 1, 1)) * 0.72;
    const x = t * largo;
    const comba = Math.sin(Math.PI * t) * largo * curva;
    semillas.push({
      x,
      y: -comba * 0.3 + tembleque(rng, 0.6),
      rx: ancho * (gordo ? 0.66 : 0.5),
      ry: ancho * (gordo ? 0.5 : 0.44),
      rot: tembleque(rng, 14),
    });
  }
  return {
    tipo: 'vaina',
    valva: suave([...arriba, ...abajo.reverse()], true, 0.5),
    /* la sutura ventral: por acá abre la vaina cuando se desgrana */
    sutura: suave(abajo, false, 0.5),
    semillas,
    /* el pico: la vaina termina en punta, no redonda */
    pico: `M${(largo * 0.99).toFixed(1)} 0 l${(largo * 0.06).toFixed(1)} ${(-ancho * 0.3).toFixed(1)}`,
    caja: { x: 0, y: -ancho * 1.6, w: largo * 1.06, h: ancho * 3.2 },
  };
}

/** MAZORCA DEL MAÍZ — la tusa con sus hileras. `hileras` es PAR siempre (el
 *  maíz tiene 8-12-16-18 hileras, nunca impar: cada espiguilla trae dos
 *  flores). Ese es un dato duro que la lámina respeta. */
export function mazorcaMaiz(rng, op = {}) {
  const { largo = 100, ancho = 26, hileras = 10, morado = false } = op;
  const perfil = [];
  for (let i = 0; i <= 18; i += 1) {
    const t = i / 18;
    perfil.push([t * largo, -ancho * Math.sin(Math.PI * Math.min(t * 1.25, 1)) ** 0.28]);
  }
  const granos = [];
  const porHilera = Math.round(largo / (ancho * 0.34));
  for (let h = 0; h < hileras / 2; h += 1) {
    /* sólo se ven las hileras del frente; las de atrás quedan ocultas: el
       dibujo respeta que una mazorca es un cilindro, no un plano */
    const off = (h / (hileras / 2 - 1 || 1)) * 2 - 1;
    for (let k = 0; k < porHilera; k += 1) {
      const t = 0.05 + (k / porHilera) * 0.9;
      const w = ancho * Math.sin(Math.PI * Math.min(t * 1.25, 1)) ** 0.28;
      granos.push({
        x: t * largo + (h % 2) * (largo / porHilera) * 0.5,
        y: off * w * 0.86,
        /* el grano del maíz es un DIENTE: ancho arriba, cuña abajo */
        rx: (largo / porHilera) * 0.52,
        ry: w * (0.9 / (hileras / 2)) * 1.5,
        borde: Math.abs(off) > 0.75,
      });
    }
  }
  return {
    tipo: 'mazorca',
    tusa: suave([...perfil, ...perfil.map(([x, y]) => [x, -y]).reverse()], true, 0.5),
    granos,
    morado,
    /* los estigmas: LOS CABELLOS. Cada cabello es un grano — si no lo
       polinizan, ese grano no sale y la mazorca queda "desgranada". */
    barbas: Array.from({ length: 16 }, (_, i) => {
      const s = (i / 16) * 2 - 1;
      return `M${largo.toFixed(1)} ${(s * ancho * 0.5).toFixed(1)} q${(largo * 0.16).toFixed(1)} ${(s * 10 - 6).toFixed(1)} ${(largo * 0.3).toFixed(1)} ${(s * 18 + tembleque(rng, 6)).toFixed(1)}`;
    }),
    caja: { x: 0, y: -ancho, w: largo * 1.3, h: ancho * 2 },
  };
}

/** MAZORCA DEL CACAO en corte — semillas en el mucílago blanco, sobre la
 *  placenta central. Lo que se fermenta 5-7 días son ESAS semillas con su
 *  baba: sin baba no hay fermentación y sin fermentación no hay chocolate. */
export function mazorcaCacao(rng, op = {}) {
  const { rx = 30, ry = 48, surcos = 10 } = op;
  const pts = [];
  for (let i = 0; i < 30; i += 1) {
    const a = (i / 30) * Math.PI * 2;
    /* los surcos longitudinales de la cáscara */
    const rr = 1 + Math.cos(a * (surcos / 2)) * 0.05;
    pts.push([Math.cos(a) * rx * rr, Math.sin(a) * ry * (1 + tembleque(rng, 0.02))]);
  }
  const semillas = [];
  for (let i = 0; i < 16; i += 1) {
    const t = (i + 0.5) / 16;
    const s = i % 2 === 0 ? -1 : 1;
    semillas.push({
      x: s * rx * entre(rng, 0.14, 0.4),
      y: lerp(-ry * 0.68, ry * 0.68, t) + tembleque(rng, 2),
      rx: rx * 0.2,
      ry: ry * 0.07,
      rot: s * entre(rng, 8, 26),
    });
  }
  return {
    tipo: 'mazorcaCacao',
    cascara: suave(pts, true, 0.5),
    interior: suave(pts.map(([x, y]) => [x * 0.82, y * 0.88]), true, 0.5),
    mucilago: suave(contorno(rng, rx * 0.62, ry * 0.78, 0.05, 20), true, 0.5),
    semillas,
    placenta: `M0 ${(-ry * 0.78).toFixed(1)} L0 ${(ry * 0.78).toFixed(1)}`,
    caja: { x: -rx, y: -ry, w: rx * 2, h: ry * 2 },
  };
}

/** DEDO DE PLÁTANO + su corte TRANSVERSAL, que es TRILOBADO — la firma de la
 *  Musaceae: tres carpelos. Nadie que haya partido un plátano lo olvida. */
export function dedoPlatano(rng, op = {}) {
  const { largo = 90, ancho = 15 } = op;
  const arriba = [];
  const abajo = [];
  for (let i = 0; i <= 20; i += 1) {
    const t = i / 20;
    const comba = Math.sin(Math.PI * t) * largo * 0.2;
    const w = ancho * Math.sin(Math.PI * Math.min(t * 1.16, 1)) ** 0.22;
    arriba.push([t * largo, -w - comba]);
    abajo.push([t * largo, w - comba]);
  }
  /* el corte transversal: tres lóbulos redondeados, no un círculo */
  const tri = [];
  for (let i = 0; i < 36; i += 1) {
    const a = (i / 36) * Math.PI * 2;
    const rr = ancho * (0.86 + Math.cos(a * 3) * 0.14);
    tri.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  let carpelos = '';
  for (let i = 0; i < 3; i += 1) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    carpelos += `M0 0 L${(Math.cos(a) * ancho * 0.72).toFixed(1)} ${(Math.sin(a) * ancho * 0.72).toFixed(1)}`;
  }
  return {
    tipo: 'platano',
    dedo: suave([...arriba, ...abajo.reverse()], true, 0.5),
    aristas: [suave(arriba.map(([x, y]) => [x, y + ancho * 0.5]), false, 0.5)],
    transversal: { d: suave(tri, true, 0.5), carpelos, r: ancho },
    caja: { x: 0, y: -ancho * 2.4, w: largo, h: ancho * 3.4 },
  };
}

/** POLIDRUPA — la mora: un fruto AGREGADO, un montón de drupéolas, cada una
 *  con su semillita. Por eso la mora es rasposa en la lengua y por eso se
 *  magulla: no tiene una cáscara, tiene cien. */
export function polidrupa(rng, op = {}) {
  const { rx = 22, ry = 28, drupeolas = 22 } = op;
  const bolitas = [];
  for (let i = 0; i < drupeolas; i += 1) {
    const t = (i + 0.5) / drupeolas;
    const a = i * 2.399963;
    const rr = Math.sqrt(t) * 0.86;
    bolitas.push({
      x: Math.cos(a) * rx * rr,
      y: Math.sin(a) * ry * rr - ry * 0.06,
      r: lerp(rx * 0.22, rx * 0.14, rr),
    });
  }
  return {
    tipo: 'polidrupa',
    contorno: suave(contorno(rng, rx, ry, 0.06, 20), true, 0.5),
    drupeolas: bolitas,
    /* el receptáculo: en la mora se queda EN LA MATA al cosechar (a
       diferencia de la frambuesa, que sale hueca). Detalle de campo. */
    receptaculo: `M0 ${(ry * 0.9).toFixed(1)} L0 ${(-ry * 0.2).toFixed(1)}`,
    caja: { x: -rx, y: -ry, w: rx * 2, h: ry * 2 },
  };
}

/** TALLO DE CAÑA — nudos y entrenudos + corte transversal. El azúcar está en
 *  el parénquima del entrenudo; los haces se ven como puntos regados (típico
 *  de monocotiledónea: NO hacen anillos como el tronco de un árbol). */
export function tallloCana(rng, op = {}) {
  const { largo = 130, ancho = 18, nudos = 6 } = op;
  const anillos = [];
  for (let i = 1; i <= nudos; i += 1) {
    const y = -(i / (nudos + 1)) * largo;
    anillos.push({ y, alto: ancho * 0.11 });
  }
  const haces = [];
  for (let i = 0; i < 30; i += 1) {
    const t = (i + 0.5) / 30;
    const a = i * 2.399963;
    const rr = Math.sqrt(t) * ancho * 0.8;
    haces.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr, r: entre(rng, 0.7, 1.3) });
  }
  return {
    tipo: 'cana',
    tallo: { x: -ancho, y: -largo, w: ancho * 2, h: largo },
    anillos,
    /* la yema: en cada nudo hay UNA. De ahí rebrota la soca y de ahí se saca
       la semilla vegetativa. */
    yemas: anillos.map((a, i) => ({ y: a.y, s: i % 2 === 0 ? -1 : 1, r: ancho * 0.24 })),
    transversal: { r: ancho, haces },
    caja: { x: -ancho, y: -largo, w: ancho * 2, h: largo },
  };
}

/** HOJA TUBULAR EN CORTE — cebolla larga. HUECA. El corpus lo dice
 *  ("hoja tubular hueca") y es el carácter que la separa de la cabezona:
 *  *fistulosum* significa, justamente, "hecha un tubo". */
export function tuboCebolla(rng, op = {}) {
  const { r = 20 } = op;
  return {
    tipo: 'tubo',
    fuera: suave(contorno(rng, r, r, 0.02, 20), true, 0.5),
    dentro: suave(contorno(rng, r * 0.62, r * 0.62, 0.03, 18), true, 0.5),
    caja: { x: -r, y: -r, w: r * 2, h: r * 2 },
  };
}

/** AHUYAMA en corte — la cavidad seminal y la carne gruesa. */
export function cucurbita(rng, op = {}) {
  const { rx = 46, ry = 38, gajos = 8, cuello = false } = op;
  const pts = [];
  for (let i = 0; i < 34; i += 1) {
    const a = (i / 34) * Math.PI * 2;
    const gajo = 1 + Math.cos(a * gajos) * 0.045;
    let x = Math.cos(a) * rx * gajo;
    let y = Math.sin(a) * ry * gajo;
    /* C. moschata: el cuello largo. C. maxima: la panza redonda. */
    if (cuello && y < 0) x *= lerp(1, 0.42, (-y / ry) ** 1.5);
    pts.push([x, y]);
  }
  const semillas = [];
  for (let i = 0; i < 14; i += 1) {
    const a = (i / 14) * Math.PI * 2 + tembleque(rng, 0.2);
    const rr = entre(rng, 0.3, 0.62);
    semillas.push({
      x: Math.cos(a) * rx * 0.44 * rr * 1.6,
      y: Math.sin(a) * ry * 0.44 * rr * 1.6 + ry * 0.1,
      rx: rx * 0.075,
      ry: rx * 0.05,
      rot: (a * 180) / Math.PI + 90,
    });
  }
  return {
    tipo: 'cucurbita',
    cascara: suave(pts, true, 0.5),
    carne: suave(pts.map(([x, y]) => [x * 0.9, y * 0.9]), true, 0.5),
    cavidad: suave(borron(rng, 0, ry * 0.1, Math.min(rx, ry) * 0.5, 0.16, 15), true, 0.5),
    semillas,
    caja: { x: -rx, y: -ry, w: rx * 2, h: ry * 2 },
  };
}

/** UCHUVA — la baya en su CÁLIZ PAPIRÁCEO (el farolillo). El cáliz es el
 *  empaque que la naturaleza le puso: por eso viaja a Europa sin refrigerar y
 *  por eso Colombia es el primer exportador. Se dibuja translúcido. */
export function farolillo(rng, op = {}) {
  const { r = 22 } = op;
  const pts = [];
  for (let i = 0; i < 26; i += 1) {
    const a = (i / 26) * Math.PI * 2 - Math.PI / 2;
    /* el cáliz tiene 5 costillas y se afila abajo, como un farol de papel */
    const costilla = 1 + Math.cos(a * 5) * 0.09;
    const afila = a > 0 ? lerp(1, 0.5, Math.sin(a)) : 1;
    pts.push([Math.cos(a) * r * 1.24 * costilla * afila, Math.sin(a) * r * 1.5 * costilla]);
  }
  let costillas = '';
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    costillas += `M0 ${(-r * 1.5).toFixed(1)} Q${(Math.cos(a) * r * 1.3).toFixed(1)} 0 0 ${(r * 0.75).toFixed(1)}`;
  }
  return {
    tipo: 'farolillo',
    caliz: suave(pts, true, 0.5),
    costillas,
    baya: { r: r * 0.82, cy: r * 0.06 },
    caja: { x: -r * 1.4, y: -r * 1.6, w: r * 2.8, h: r * 3.2 },
  };
}

export const FRUTOS = {
  tuberculo,
  raizTuberosa: raizTuberosaCorte,
  baya,
  drupaCafe,
  drupaAguacate,
  vaina,
  mazorca: mazorcaMaiz,
  mazorcaCacao,
  platano: dedoPlatano,
  polidrupa,
  cana: tallloCana,
  tubo: tuboCebolla,
  cucurbita,
  farolillo,
};
