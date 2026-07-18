/*
 * doselBiodiverso.geom — el DOSEL MULTIESPECIE del bosque andino/subandino
 * colombiano. La capa que convierte el claro del Ent en un BOSQUE de verdad:
 * triplica los árboles y mete VARIEDAD real —cada especie con su silueta y su
 * color inequívocos, por piso térmico— para que nada se lea a monocultivo.
 *
 * Especies (todas reales de Colombia, ordenadas por estrato del bosque):
 *
 *   DOSEL / EMERGENTES (la pared verde del fondo)
 *   · Guadua (Guadua angustifolia) — la caña brava: culmos altos anillados
 *     verde-dorados en macolla, penacho plumoso arriba. La silueta más nuestra.
 *   · Nogal cafetero (Cordia alliodora) — fuste recto y limpio, ramas en piso
 *     (verticilos) y copa clara: el árbol de sombrío y madera del cafetal.
 *   · Cedro (Cedrela odorata) — bole recto y copa ancha y aparasolada.
 *   · Yarumo (Cecropia) — fuste PÁLIDO anillado + candelabro ralo con rosetas de
 *     hojas palmadas de envés plateado: la silueta que delata el bosque andino.
 *   · Aliso (Alnus acuminata) — el árbol de agua de las cañadas: copa CÓNICA
 *     verde oscura, huso vertical que rompe las copas redondas.
 *
 *   DOSEL FLORECIDO (el color que rompe el verde)
 *   · Cámbulo / búcaro (Erythrina fusca) — copa abierta encendida en ROJO-naranja.
 *   · Gualanday (Jacaranda caucana) — nube MORADA-lila sobre fuste gris.
 *   · Siete cueros (Tibouchina lepidota) — arbolito andino de flor MAGENTA.
 *   · Chachafruto (Erythrina edulis) — flor NARANJA-salmón + vainas colgantes
 *     del fríjol de árbol comestible.
 *   · Guácimo (Guazuma ulmifolia) — copa ANCHA y baja (umbráculo), verde denso.
 *
 *   SOTOBOSQUE (la penumbra viva bajo el dosel)
 *   · Helecho arbóreo (Cyathea) — el ícono del bosque de niebla: fuste fibroso
 *     y corona de frondas arqueadas.
 *   · Heliconia / platanillo (Heliconia) — remos anchos y la bráctea ROJA.
 *
 *   EPÍFITAS (la vida colgada, la firma del bosque húmedo)
 *   · Quiche / bromelia (Tillandsia/Guzmania) — rosetas que viven SOBRE el suelo
 *     y en tocones: manchas de color en la penumbra.
 *
 * TÉCNICA (idéntica a floraParamo/queñual, tier-safe): cada especie se FUSIONA
 * en UNA geometría con color horneado (vertexColors) y se dibuja con UN
 * InstancedMesh → una draw-call por banco por más matas que haya. Todo pasa por
 * el TALLER compartido `sombreadoVegetal` (fusionarSeguro es la única fusión;
 * copas = masa de hojas con huecos y normales radiales, nada de icosaedros
 * literales). Cero assets: procedural y determinista, corre headless.
 *
 * El componente r3f (`DoselBiodiverso.jsx`) instancia, ubica sobre el relieve
 * (alturaDe) y le pone luz. Aquí viven SOLO los datos y las mallas.
 */
import * as THREE from 'three';
import {
  rng,
  fusionarSeguro,
  poner,
  apuntar,
  pintarPlano,
  pintarPorVertice,
  hornearFollaje,
  hornearCorteza,
  tuboOrganico,
  taperTronco,
  taperLineal,
  curvaTronco,
  sembrarFollaje,
  matojoNube,
} from './sombreadoVegetal.js';

/* -------------------------------------------------------------------------- */
/*  Presupuesto por tier (instancias, no draw-calls)                           */
/* -------------------------------------------------------------------------- */

/*
 * 'alto' arma un bosque andino DENSO de tres estratos —una pared de dosel
 * multiespecie que cierra el fondo—; 'medio' lo raciona; 'bajo' deja lo justo
 * para que AÚN lea "bosque variado" (unos emergentes, algo de color, unos
 * helechos). Junto al queñual y la FloraParamo, esto TRIPLICA los árboles y
 * multiplica la variedad hasta trece especies reales colombianas.
 */
export const DOSEL_TIER = {
  alto: {
    guadua: 15, nogal: 11, cedro: 9, yarumo: 10, aliso: 9, guacimo: 8,
    cambulo: 7, gualanday: 7, sieteCueros: 11, chachafruto: 6,
    helecho: 26, heliconia: 26, quiche: 36,
  },
  medio: {
    guadua: 8, nogal: 6, cedro: 5, yarumo: 5, aliso: 4, guacimo: 4,
    cambulo: 3, gualanday: 3, sieteCueros: 5, chachafruto: 3,
    helecho: 13, heliconia: 13, quiche: 18,
  },
  bajo: {
    guadua: 4, nogal: 3, cedro: 2, yarumo: 2, aliso: 2, guacimo: 1,
    cambulo: 1, gualanday: 1, sieteCueros: 2, chachafruto: 1,
    helecho: 5, heliconia: 5, quiche: 7,
  },
};
export const doselDeTier = (tier) => DOSEL_TIER[tier] || DOSEL_TIER.medio;

export const CALIDAD_DOSEL = { alto: 1, medio: 0.62, bajo: 0.42 };
export const calidadDosel = (tier) => CALIDAD_DOSEL[tier] ?? CALIDAD_DOSEL.medio;

/* -------------------------------------------------------------------------- */
/*  Paleta (colores horneados en vertexColors)                                 */
/* -------------------------------------------------------------------------- */

const PB = {
  // Guadua — caña verde-dorada anillada
  guaduaCana: '#9caf57',
  guaduaCanaSol: '#c4c968',
  guaduaNudo: '#6f7d3c',
  guaduaHojaBase: '#3c5a34',
  guaduaHojaSol: '#78994c',
  guaduaHojaLuz: '#c6d585',

  // Nogal cafetero — fuste claro, copa fresca
  nogalTronco: '#8a7f68',
  nogalGrieta: '#5c5240',
  nogalCresta: '#a89a7e',
  nogalHoja: '#3f5a37',
  nogalHojaSol: '#6f9150',
  nogalHojaLuz: '#bccf80',
  nogalFlor: '#e6e3cf', // panículas blanco-crema

  // Cedro — bole recto, copa ancha
  cedroTronco: '#736150',
  cedroGrieta: '#463a2c',
  cedroCresta: '#8f7a62',
  cedroHoja: '#40563a',
  cedroHojaSol: '#688a4c',
  cedroHojaLuz: '#aec27a',

  // Cámbulo — copa encendida ROJO-naranja
  cambuloTronco: '#7c6a54',
  cambuloGrieta: '#4d4030',
  cambuloCresta: '#98846a',
  cambuloHoja: '#41603d',
  cambuloHojaSol: '#6a9150',
  cambuloHojaLuz: '#b6cd7c',
  cambuloFlor: '#d94a2b', // rojo-bermellón
  cambuloFlor2: '#e8722f', // naranja de borde

  // Gualanday — nube MORADA-lila
  gualandayTronco: '#8c8577',
  gualandayGrieta: '#5f594c',
  gualandayCresta: '#a49c8c',
  gualandayHoja: '#4b6144',
  gualandayHojaSol: '#6f8c56',
  gualandayFlor: '#7a5ab0', // lila-morado
  gualandayFlor2: '#9a7fce', // lila claro

  // Siete cueros — flor MAGENTA
  sieteTronco: '#6f5a48',
  sieteGrieta: '#463628',
  sieteCresta: '#8a725c',
  sieteHoja: '#3c5636',
  sieteHojaSol: '#5f8148',
  sieteHojaLuz: '#a6bf74',
  sieteFlor: '#b0348a', // magenta-violeta
  sieteFlor2: '#cf5fa9',

  // Helecho arbóreo — fuste fibroso + frondas
  helechoTronco: '#5a4a38',
  helechoTronco2: '#463a2b',
  helechoFronda: '#3f5e35',
  helechoFrondaSol: '#6f9448',
  helechoFrondaLuz: '#bcd082',

  // Heliconia — remos + bráctea roja
  heliconiaHoja: '#3f6238',
  heliconiaHojaSol: '#63924a',
  heliconiaHojaLuz: '#b2cd7a',
  heliconiaBractea: '#d63f2c', // bráctea roja
  heliconiaBractea2: '#e8a52f', // punta amarilla

  // Quiche / bromelia — rosetas epífitas de color
  quicheHoja: '#5a7b45',
  quicheHojaSol: '#83a656',
  quicheCentro: '#c34a3a', // el corazón encendido (rojo/coral)
  quicheCentro2: '#dc7a3f',

  // Yarumo (Cecropia) — fuste PÁLIDO anillado + hoja palmada de envés plateado
  yarumoTronco: '#b7b3a4',
  yarumoTroncoLuz: '#d2cebf',
  yarumoAnillo: '#8d8877',
  yarumoHoja: '#496b3f',
  yarumoHojaLuz: '#c4ccb0', // el envés blanco-plateado que voltea el viento

  // Aliso (Alnus acuminata) — árbol de agua, copa CÓNICA verde oscura
  alisoTronco: '#7f7360',
  alisoGrieta: '#514736',
  alisoCresta: '#9a8c74',
  alisoHoja: '#33502f',
  alisoHojaSol: '#557a3e',
  alisoHojaLuz: '#93b46a',

  // Guácimo (Guazuma ulmifolia) — copa ANCHA y baja (umbráculo)
  guacimoTronco: '#877459',
  guacimoGrieta: '#544632',
  guacimoCresta: '#a08a6c',
  guacimoHoja: '#43602f',
  guacimoHojaSol: '#6b8f46',
  guacimoHojaLuz: '#b0c778',

  // Chachafruto (Erythrina edulis) — flor NARANJA-salmón + vaina colgante
  chachaTronco: '#7a6a52',
  chachaGrieta: '#4b3d2c',
  chachaCresta: '#95816a',
  chachaHoja: '#45613c',
  chachaHojaSol: '#6d9150',
  chachaHojaLuz: '#b6cd7c',
  chachaFlor: '#e2632a', // naranja-salmón
  chachaFlor2: '#f0913f',
  chachaVaina: '#6a7d3c', // la vaina verde del fruto comestible
};

/* -------------------------------------------------------------------------- */
/*  Utilidades locales (compactas, autocontenidas)                             */
/* -------------------------------------------------------------------------- */

const pintar = pintarPlano;
const fusionar = (partes, etiqueta = 'dosel') =>
  fusionarSeguro(partes, etiqueta, { preservarNormales: true });

function variar(base, r, amt = 0.06) {
  const c = new THREE.Color(base);
  c.multiplyScalar(1 + (r() - 0.5) * amt * 2);
  return c;
}

/* Tronco orgánico horneado (curva + tubo cónico arrugado + corteza). */
function troncoHorneado(
  { H, r0, r1, inclina = 0.08, sinuoso = 0.08, giro = 0, arruga = 0.14, raigon = 0.42, q = 1, corteza, hastaLiquen = 0.4, liquen = '#9aa86a' },
  seed,
) {
  const curva = curvaTronco({ altura: H, inclina, sinuoso, giro }, seed);
  const geo = tuboOrganico(curva, {
    tubular: Math.max(8, Math.round(15 * q)),
    radial: Math.max(6, Math.round(8 * q)),
    taper: taperTronco(r0, r1, raigon),
    arruga,
    semilla: seed * 3.1,
  });
  hornearCorteza(geo, {
    grieta: corteza.grieta,
    cuerpo: corteza.cuerpo,
    cresta: corteza.cresta,
    liquen,
    escalaGrano: corteza.escalaGrano ?? 4.2,
    hastaLiquen,
  });
  return { geo, curva };
}

/* Copa-masa: la técnica del queñual (matojos-nube con huecos + horneado). */
function copaMasa(lobulos, o) {
  const { base, sol, luz, q = 1, seed = 1, achatado = 0.76, huecos = 0.42, mordida = 0.36, ao = 0.63, manchas = 0.14, densidad = 10 } = o;
  const copas = [];
  for (let i = 0; i < lobulos.length; i++) {
    const lb = lobulos[i];
    const puntos = sembrarFollaje({
      centro: lb.c,
      radio: lb.radio,
      achatado,
      n: Math.max(4, Math.round(densidad * q * lb.radio)),
      semilla: seed * 13 + i * 3,
      huecos,
      mordida,
      distMin: 0.3 * lb.radio,
    });
    const matojos = puntos.map((p, k) => {
      const m = matojoNube((0.27 + 0.16 * p.esc) * lb.radio, seed * 17 + i * 5 + k, 0.5);
      poner(m, p.pos, p.giro, [1, 0.82, 1]);
      return m;
    });
    if (!matojos.length) {
      const m = matojoNube(lb.radio * 0.7, seed * 17 + i * 5, 0.5);
      poner(m, lb.c, [0, 0, 0], [1, 0.82, 1]);
      matojos.push(m);
    }
    const copa = fusionar(matojos, 'copa-masa');
    hornearFollaje(copa, { base, sol, luz, centro: lb.c, radio: lb.radio * 1.2, ao, manchas });
    copas.push(copa);
  }
  return copas;
}

/* Puñado de FLOR: matojos-nube pequeños teñidos plano (rojo/morado/magenta),
   sembrados en la piel de la copa para que el color asome sobre el verde. */
function floresEnCopa(lobulos, o) {
  const { colorA, colorB, q = 1, seed = 5, densidad = 5, escala = 0.5 } = o;
  const r = rng(seed * 2.7);
  const partes = [];
  for (let i = 0; i < lobulos.length; i++) {
    const lb = lobulos[i];
    const puntos = sembrarFollaje({
      centro: lb.c,
      radio: lb.radio * 0.98,
      achatado: 0.7,
      n: Math.max(2, Math.round(densidad * q * lb.radio)),
      semilla: seed * 19 + i * 7,
      huecos: 0.2,
      mordida: 0.3,
      distMin: 0.42 * lb.radio,
    });
    for (const p of puntos) {
      const m = matojoNube(escala * (0.22 + 0.14 * p.esc) * lb.radio, seed * 23 + i * 11, 0.42);
      poner(m, [p.pos[0], p.pos[1] + lb.radio * 0.12, p.pos[2]], p.giro, [1, 0.85, 1]);
      partes.push(pintar(m, r() > 0.5 ? variar(colorA, r, 0.12) : variar(colorB, r, 0.12)));
    }
  }
  return partes;
}

/* Una hoja lanceolada carnosa (elipsoide) que nace en su base y se orienta. */
function hojaLanza(ancho, largo, grosor, wSeg = 5, hSeg = 3) {
  const g = new THREE.SphereGeometry(1, wSeg, hSeg);
  poner(g, [0, largo / 2, 0], [0, 0, 0], [ancho, largo / 2, grosor]);
  return g;
}

/* -------------------------------------------------------------------------- */
/*  GUADUA (Guadua angustifolia) — la caña brava, la firma de Colombia         */
/* -------------------------------------------------------------------------- */

/*
 * Una MACOLLA de guadua: varios culmos altos, rectos y anillados (nudos) que
 * abren apenas en abanico, verde-dorados, rematados en un penacho de hoja fina.
 * Cero copa-globo: la guadua es vertical y plumosa. Un banco = una macolla.
 */
export function geomGuadua({ q = 1 } = {}, seed = 2) {
  const r = rng(seed);
  const partes = [];
  const nCulmos = Math.max(3, Math.round(6 * q));
  for (let c = 0; c < nCulmos; c++) {
    const H = 3.6 + r() * 2.6;
    const giro = r() * Math.PI * 2;
    const rad = 0.15 + r() * 0.55; // separación en la macolla
    const off = [Math.cos(giro) * rad, 0, Math.sin(giro) * rad];
    const curva = curvaTronco({ altura: H, inclina: 0.04 + r() * 0.06, sinuoso: 0.03, giro }, seed + c);
    const culmo = tuboOrganico(curva, {
      tubular: Math.max(9, Math.round(16 * q)),
      radial: Math.max(5, Math.round(6 * q)),
      taper: taperLineal(0.075 + r() * 0.02, 0.03),
      arruga: 0.05,
      semilla: seed + c * 2,
    });
    poner(culmo, off);
    // Color de la caña: verde-dorado con NUDOS oscuros marcados por bandas Y.
    const cana = new THREE.Color(PB.guaduaCana);
    const canaSol = new THREE.Color(PB.guaduaCanaSol);
    const nudo = new THREE.Color(PB.guaduaNudo);
    const tmp = new THREE.Color();
    pintarPorVertice(culmo, (x, y) => {
      const t = Math.min(1, Math.max(0, y / H));
      tmp.copy(cana).lerp(canaSol, t * 0.7);
      // nudos: anillos oscuros cada ~0.55 de altura
      const band = Math.abs(((y / 0.55) % 1) - 0.5);
      if (band > 0.42) tmp.lerp(nudo, (band - 0.42) / 0.08 * 0.8);
      return tmp;
    });
    partes.push(culmo);

    // Penacho de hoja fina en el tercio superior (conos planos apuntando afuera).
    const punta = curva.getPointAt(1);
    const nHoja = Math.max(3, Math.round(6 * q));
    for (let i = 0; i < nHoja; i++) {
      const t = 0.62 + r() * 0.35;
      const p = curva.getPointAt(t);
      const ang = r() * Math.PI * 2;
      const largo = 0.45 + r() * 0.4;
      const hoja = new THREE.ConeGeometry(0.06, largo, 4, 1);
      apuntar(
        hoja,
        [off[0] + p.x + Math.cos(ang) * 0.12, p.y + 0.05, off[2] + p.z + Math.sin(ang) * 0.12],
        [Math.cos(ang) * 0.8, 0.5 + r() * 0.5, Math.sin(ang) * 0.8],
        [1, 1, 0.5],
      );
      const cc = new THREE.Color(PB.guaduaHojaBase).lerp(new THREE.Color(PB.guaduaHojaSol), r());
      partes.push(pintar(hoja, cc));
    }
    // remate plumoso en la punta
    const pen = new THREE.ConeGeometry(0.16, 0.5 + r() * 0.3, 5, 1);
    apuntar(pen, [off[0] + punta.x, punta.y + 0.2, off[2] + punta.z], [0.1, 1, 0.1], [1, 1, 0.6]);
    partes.push(pintar(pen, variar(PB.guaduaHojaLuz, r, 0.1)));
  }
  return fusionar(partes, 'guadua');
}

/* -------------------------------------------------------------------------- */
/*  NOGAL CAFETERO (Cordia alliodora) — sombrío y madera del cafetal           */
/* -------------------------------------------------------------------------- */

/*
 * Fuste RECTO y limpio, ramas en pisos (verticilos), copa clara y aireada con
 * panículas blanco-crema. El árbol alto y ordenado del sombrío de café.
 */
export function geomNogal({ q = 1 } = {}, seed = 3) {
  const r = rng(seed);
  const partes = [];
  const H = 4.2 + r() * 0.8;
  const { geo, curva } = troncoHorneado(
    { H, r0: 0.16, r1: 0.06, inclina: 0.03, sinuoso: 0.05, giro: r() * 6, arruga: 0.1, raigon: 0.4, q, hastaLiquen: 0.5,
      corteza: { grieta: PB.nogalGrieta, cuerpo: PB.nogalTronco, cresta: PB.nogalCresta, escalaGrano: 3.6 } },
    seed + 1,
  );
  partes.push(geo);
  const top = curva.getPointAt(1);

  // Ramas en dos pisos (verticilos) que abren la copa.
  const lobs = [{ c: [top.x, top.y + 0.5, top.z], radio: 0.82 }];
  for (let piso = 0; piso < 2; piso++) {
    const yr = H - 0.9 - piso * 0.85;
    const p = curva.getPointAt(Math.max(0, (yr / H)));
    const nR = Math.max(3, Math.round((4 - piso) * q));
    for (let i = 0; i < nR; i++) {
      const ang = (i / nR) * Math.PI * 2 + piso * 0.7 + r() * 0.3;
      const largo = 0.85 + r() * 0.35;
      const rama = new THREE.CylinderGeometry(0.03, 0.055, largo, 5, 1);
      apuntar(rama, [p.x + Math.cos(ang) * 0.2, p.y + 0.1, p.z + Math.sin(ang) * 0.2], [Math.cos(ang), 0.35, Math.sin(ang)]);
      partes.push(pintar(rama, PB.nogalCresta));
      lobs.push({ c: [Math.cos(ang) * (largo + 0.2), yr + 0.35 + r() * 0.3, Math.sin(ang) * (largo + 0.2)], radio: 0.5 + r() * 0.28 });
    }
  }
  copaMasa(lobs, { base: PB.nogalHoja, sol: PB.nogalHojaSol, luz: PB.nogalHojaLuz, q, seed: seed + 7, achatado: 0.72, huecos: 0.5, mordida: 0.42, ao: 0.6 }).forEach((cc) => partes.push(cc));

  // Panículas crema salpicadas (flor del nogal).
  if (q > 0.5) {
    for (const lb of lobs) {
      const nF = Math.max(1, Math.round(3 * q));
      for (let i = 0; i < nF; i++) {
        const ang = r() * Math.PI * 2;
        const rr = lb.radio * (0.5 + r() * 0.5);
        const puff = matojoNube(0.1 + r() * 0.06, seed * 31 + i, 0.4);
        poner(puff, [lb.c[0] + Math.cos(ang) * rr, lb.c[1] + lb.radio * 0.2, lb.c[2] + Math.sin(ang) * rr]);
        partes.push(pintar(puff, variar(PB.nogalFlor, r, 0.06)));
      }
    }
  }
  return fusionar(partes, 'nogal');
}

/* -------------------------------------------------------------------------- */
/*  CEDRO (Cedrela odorata) — bole recto, copa ancha aparasolada               */
/* -------------------------------------------------------------------------- */

export function geomCedro({ q = 1 } = {}, seed = 4) {
  const r = rng(seed);
  const partes = [];
  const H = 3.6 + r() * 0.7;
  const { geo, curva } = troncoHorneado(
    { H, r0: 0.2, r1: 0.08, inclina: 0.04, sinuoso: 0.06, giro: r() * 6, arruga: 0.16, raigon: 0.55, q, hastaLiquen: 0.6,
      corteza: { grieta: PB.cedroGrieta, cuerpo: PB.cedroTronco, cresta: PB.cedroCresta, escalaGrano: 4.6 } },
    seed + 1,
  );
  partes.push(geo);
  const top = curva.getPointAt(1);

  // Copa ANCHA aparasolada: domo aplanado + lóbulos horizontales.
  const lobs = [{ c: [top.x, top.y + 0.35, top.z], radio: 1.05 }];
  const nL = Math.max(4, Math.round(6 * q));
  for (let i = 0; i < nL; i++) {
    const ang = (i / nL) * Math.PI * 2 + r() * 0.5;
    const rad = 0.85 + r() * 0.5;
    const rama = new THREE.CylinderGeometry(0.04, 0.07, rad + 0.2, 5, 1);
    apuntar(rama, [top.x + Math.cos(ang) * 0.2, H - 0.4, top.z + Math.sin(ang) * 0.2], [Math.cos(ang), 0.18, Math.sin(ang)]);
    partes.push(pintar(rama, PB.cedroCresta));
    lobs.push({ c: [Math.cos(ang) * rad, H + 0.0 + r() * 0.4, Math.sin(ang) * rad], radio: 0.62 + r() * 0.3 });
  }
  copaMasa(lobs, { base: PB.cedroHoja, sol: PB.cedroHojaSol, luz: PB.cedroHojaLuz, q, seed: seed + 9, achatado: 0.62, huecos: 0.46, mordida: 0.4, ao: 0.64 }).forEach((cc) => partes.push(cc));
  return fusionar(partes, 'cedro');
}

/* -------------------------------------------------------------------------- */
/*  CÁMBULO (Erythrina) — la copa encendida en ROJO-naranja                     */
/* -------------------------------------------------------------------------- */

export function geomCambulo({ q = 1 } = {}, seed = 5) {
  const r = rng(seed);
  const partes = [];
  const H = 3.0 + r() * 0.6;
  const { geo, curva } = troncoHorneado(
    { H, r0: 0.18, r1: 0.08, inclina: 0.09, sinuoso: 0.12, giro: r() * 6, arruga: 0.16, raigon: 0.45, q,
      corteza: { grieta: PB.cambuloGrieta, cuerpo: PB.cambuloTronco, cresta: PB.cambuloCresta, escalaGrano: 4.2 } },
    seed + 1,
  );
  partes.push(geo);
  const top = curva.getPointAt(1);
  // Copa ABIERTA (ramas que suben-abren) + flores rojas.
  const lobs = [{ c: [top.x, top.y + 0.4, top.z], radio: 0.78 }];
  const nL = Math.max(3, Math.round(5 * q));
  for (let i = 0; i < nL; i++) {
    const ang = (i / nL) * Math.PI * 2 + r() * 0.5;
    const rad = 0.7 + r() * 0.5;
    const rama = new THREE.CylinderGeometry(0.035, 0.06, rad + 0.3, 5, 1);
    apuntar(rama, [top.x + Math.cos(ang) * 0.15, H - 0.5, top.z + Math.sin(ang) * 0.15], [Math.cos(ang), 0.7, Math.sin(ang)]);
    partes.push(pintar(rama, PB.cambuloCresta));
    lobs.push({ c: [Math.cos(ang) * rad, H + 0.3 + r() * 0.4, Math.sin(ang) * rad], radio: 0.5 + r() * 0.26 });
  }
  copaMasa(lobs, { base: PB.cambuloHoja, sol: PB.cambuloHojaSol, luz: PB.cambuloHojaLuz, q, seed: seed + 7, achatado: 0.72, huecos: 0.5, mordida: 0.44, ao: 0.6 }).forEach((cc) => partes.push(cc));
  floresEnCopa(lobs, { colorA: PB.cambuloFlor, colorB: PB.cambuloFlor2, q, seed: seed + 3, densidad: 6, escala: 0.55 }).forEach((f) => partes.push(f));
  return fusionar(partes, 'cambulo');
}

/* -------------------------------------------------------------------------- */
/*  GUALANDAY (Jacaranda) — la nube MORADA-lila                                 */
/* -------------------------------------------------------------------------- */

export function geomGualanday({ q = 1 } = {}, seed = 6) {
  const r = rng(seed);
  const partes = [];
  const H = 3.2 + r() * 0.6;
  const { geo, curva } = troncoHorneado(
    { H, r0: 0.15, r1: 0.06, inclina: 0.06, sinuoso: 0.09, giro: r() * 6, arruga: 0.1, raigon: 0.4, q, hastaLiquen: 0.5,
      corteza: { grieta: PB.gualandayGrieta, cuerpo: PB.gualandayTronco, cresta: PB.gualandayCresta, escalaGrano: 3.4 } },
    seed + 1,
  );
  partes.push(geo);
  const top = curva.getPointAt(1);
  const lobs = [{ c: [top.x, top.y + 0.45, top.z], radio: 0.85 }];
  const nL = Math.max(3, Math.round(5 * q));
  for (let i = 0; i < nL; i++) {
    const ang = (i / nL) * Math.PI * 2 + r() * 0.6;
    const rad = 0.65 + r() * 0.45;
    lobs.push({ c: [Math.cos(ang) * rad, H + 0.15 + r() * 0.5, Math.sin(ang) * rad], radio: 0.52 + r() * 0.28 });
  }
  // La copa lleva MENOS verde y MÁS flor (Jacaranda florece casi sin hoja).
  copaMasa(lobs, { base: PB.gualandayHoja, sol: PB.gualandayHojaSol, luz: PB.gualandayFlor2, q, seed: seed + 7, achatado: 0.74, huecos: 0.56, mordida: 0.44, ao: 0.58 }).forEach((cc) => partes.push(cc));
  floresEnCopa(lobs, { colorA: PB.gualandayFlor, colorB: PB.gualandayFlor2, q, seed: seed + 4, densidad: 8, escala: 0.66 }).forEach((f) => partes.push(f));
  return fusionar(partes, 'gualanday');
}

/* -------------------------------------------------------------------------- */
/*  SIETE CUEROS (Tibouchina lepidota) — arbolito andino de flor MAGENTA        */
/* -------------------------------------------------------------------------- */

export function geomSieteCueros({ q = 1 } = {}, seed = 7) {
  const r = rng(seed);
  const partes = [];
  const H = 2.1 + r() * 0.5;
  const { geo, curva } = troncoHorneado(
    { H, r0: 0.1, r1: 0.045, inclina: 0.12, sinuoso: 0.14, giro: r() * 6, arruga: 0.18, raigon: 0.35, q, hastaLiquen: 0.7, liquen: PB.sieteCresta,
      corteza: { grieta: PB.sieteGrieta, cuerpo: PB.sieteTronco, cresta: PB.sieteCresta, escalaGrano: 4.8 } },
    seed + 1,
  );
  partes.push(geo);
  const top = curva.getPointAt(1);
  const lobs = [{ c: [top.x, top.y + 0.3, top.z], radio: 0.6 }];
  const nL = Math.max(2, Math.round(3 * q));
  for (let i = 0; i < nL; i++) {
    const ang = (i / nL) * Math.PI * 2 + r() * 0.7;
    const rad = 0.4 + r() * 0.35;
    lobs.push({ c: [Math.cos(ang) * rad, H + 0.05 + r() * 0.35, Math.sin(ang) * rad], radio: 0.4 + r() * 0.22 });
  }
  copaMasa(lobs, { base: PB.sieteHoja, sol: PB.sieteHojaSol, luz: PB.sieteHojaLuz, q, seed: seed + 7, achatado: 0.78, huecos: 0.44, mordida: 0.4, ao: 0.62 }).forEach((cc) => partes.push(cc));
  floresEnCopa(lobs, { colorA: PB.sieteFlor, colorB: PB.sieteFlor2, q, seed: seed + 5, densidad: 7, escala: 0.5 }).forEach((f) => partes.push(f));
  return fusionar(partes, 'siete-cueros');
}

/* -------------------------------------------------------------------------- */
/*  HELECHO ARBÓREO (Cyathea) — el ícono del sotobosque de niebla               */
/* -------------------------------------------------------------------------- */

/*
 * Fuste fibroso esbelto rematado por una CORONA de frondas arqueadas (planos
 * alargados que caen en abanico). La silueta más de bosque de niebla que hay.
 */
export function geomHelecho({ q = 1 } = {}, seed = 8) {
  const r = rng(seed);
  const partes = [];
  const H = 1.5 + r() * 0.9;
  // Fuste fibroso: cilindro cónico arrugado, oscuro.
  const curva = curvaTronco({ altura: H, inclina: 0.05, sinuoso: 0.06, giro: r() * 6 }, seed + 1);
  const fuste = tuboOrganico(curva, {
    tubular: Math.max(7, Math.round(12 * q)),
    radial: Math.max(5, Math.round(6 * q)),
    taper: taperLineal(0.08, 0.05),
    arruga: 0.22,
    semilla: seed * 3,
  });
  const tmp = new THREE.Color();
  const t1 = new THREE.Color(PB.helechoTronco);
  const t2 = new THREE.Color(PB.helechoTronco2);
  pintarPorVertice(fuste, (x, y, z) => tmp.copy(t1).lerp(t2, (Math.sin(x * 9 + z * 9 + y * 3) * 0.5 + 0.5) * 0.7));
  partes.push(fuste);

  // Corona de frondas: planos largos que arquean hacia afuera-abajo.
  const top = curva.getPointAt(1);
  const nF = Math.max(5, Math.round(9 * q));
  for (let i = 0; i < nF; i++) {
    const ang = (i / nF) * Math.PI * 2 + r() * 0.3;
    const largo = 0.9 + r() * 0.6;
    const fronda = new THREE.ConeGeometry(0.14, largo, 4, 1);
    // arquea: apunta hacia afuera y algo arriba, luego cae (leve inclinación)
    apuntar(
      fronda,
      [top.x + Math.cos(ang) * largo * 0.35, top.y + 0.12 + r() * 0.06, top.z + Math.sin(ang) * largo * 0.35],
      [Math.cos(ang) * 0.9, 0.35 - r() * 0.3, Math.sin(ang) * 0.9],
      [1, 1, 0.28],
    );
    const cc = new THREE.Color(PB.helechoFronda).lerp(new THREE.Color(PB.helechoFrondaSol), r());
    partes.push(pintar(fronda, cc));
  }
  // cogollo tierno (crozier) más claro en el centro
  const cogollo = matojoNube(0.16 + r() * 0.06, seed * 5, 0.4);
  poner(cogollo, [top.x, top.y + 0.14, top.z]);
  partes.push(pintar(cogollo, PB.helechoFrondaLuz));
  return fusionar(partes, 'helecho');
}

/* -------------------------------------------------------------------------- */
/*  HELICONIA / PLATANILLO — remos anchos + bráctea ROJA                         */
/* -------------------------------------------------------------------------- */

export function geomHeliconia({ q = 1 } = {}, seed = 9) {
  const r = rng(seed);
  const partes = [];
  const nHojas = Math.max(3, Math.round(5 * q));
  // Remos: planos anchos alargados que salen de la base y se abren.
  for (let i = 0; i < nHojas; i++) {
    const ang = (i / nHojas) * Math.PI * 2 + r() * 0.4;
    const H = 0.9 + r() * 0.7;
    const remo = hojaLanza(0.16, H, 0.03, 5, 2);
    apuntar(
      remo,
      [Math.cos(ang) * 0.06, 0.05, Math.sin(ang) * 0.06],
      [Math.cos(ang) * 0.5, 1, Math.sin(ang) * 0.5],
      [1, 1, 0.2],
    );
    const cc = new THREE.Color(PB.heliconiaHoja).lerp(new THREE.Color(PB.heliconiaHojaSol), r());
    partes.push(pintar(remo, cc));
  }
  // La inflorescencia: zig-zag de brácteas rojas con punta amarilla.
  const nB = Math.max(2, Math.round(4 * q));
  const tallo = new THREE.CylinderGeometry(0.02, 0.03, 0.5, 5, 1);
  poner(tallo, [0.04, 0.3, 0], [0, 0, 0.15]);
  partes.push(pintar(tallo, PB.heliconiaHojaSol));
  for (let i = 0; i < nB; i++) {
    const y = 0.35 + i * 0.14;
    const lado = i % 2 === 0 ? 1 : -1;
    const bract = new THREE.ConeGeometry(0.06, 0.28, 4, 1);
    apuntar(bract, [0.04 + lado * 0.05, y, lado * 0.03], [lado * 0.8, 0.4, 0.2], [1, 1, 0.5]);
    partes.push(pintar(bract, i === nB - 1 ? PB.heliconiaBractea2 : variar(PB.heliconiaBractea, r, 0.08)));
  }
  return fusionar(partes, 'heliconia');
}

/* -------------------------------------------------------------------------- */
/*  QUICHE / BROMELIA (Tillandsia/Guzmania) — rosetas epífitas de color         */
/* -------------------------------------------------------------------------- */

/*
 * Roseta de hojas duras que se abren en copa, con el CORAZÓN encendido
 * (rojo/coral: la inflorescencia). Vive sobre el suelo, en tocones y horquetas.
 */
export function geomQuiche({ q = 1 } = {}, seed = 10) {
  const r = rng(seed);
  const partes = [];
  const nHojas = Math.max(6, Math.round(10 * q));
  for (let i = 0; i < nHojas; i++) {
    const ang = (i / nHojas) * Math.PI * 2 + r() * 0.2;
    const inc = 0.5 + r() * 0.35;
    const largo = 0.24 + r() * 0.14;
    const hoja = hojaLanza(0.05, largo, 0.02, 4, 2);
    apuntar(
      hoja,
      [Math.cos(ang) * 0.04, 0.02, Math.sin(ang) * 0.04],
      [Math.cos(ang) * Math.sin(inc), Math.cos(inc), Math.sin(ang) * Math.sin(inc)],
      [1, 1, 0.5],
    );
    const cc = new THREE.Color(PB.quicheHoja).lerp(new THREE.Color(PB.quicheHojaSol), r());
    partes.push(pintar(hoja, cc));
  }
  // El corazón encendido: un cono corto rojo/coral al centro.
  const centro = new THREE.ConeGeometry(0.06, 0.18, 6, 1);
  poner(centro, [0, 0.12, 0]);
  partes.push(pintar(centro, r() > 0.5 ? PB.quicheCentro : PB.quicheCentro2));
  return fusionar(partes, 'quiche');
}

/* -------------------------------------------------------------------------- */
/*  YARUMO (Cecropia) — el pionero de fuste pálido, la silueta más andina       */
/* -------------------------------------------------------------------------- */

/*
 * El árbol que delata el bosque andino de lejos: fuste RECTO, PÁLIDO (gris-
 * blancuzco) y anillado por las cicatrices de las hojas caídas, rematado en un
 * CANDELABRO ralo de pocas ramas; en cada punta, una roseta de grandes hojas
 * PALMADAS (en estrella) que voltean su envés BLANCO-plateado al viento. Poca
 * hoja, muy separada — nada de copa-globo: la firma del yarumo es el aire entre
 * sus estrellas y el tronco claro.
 */
export function geomYarumo({ q = 1 } = {}, seed = 11) {
  const r = rng(seed);
  const partes = [];
  const H = 4.4 + r() * 1.3;
  // Fuste pálido, recto y liso, con anillos oscuros (cicatrices de hoja).
  const curva = curvaTronco({ altura: H, inclina: 0.03, sinuoso: 0.04, giro: r() * 6 }, seed + 1);
  const fuste = tuboOrganico(curva, {
    tubular: Math.max(9, Math.round(16 * q)),
    radial: Math.max(6, Math.round(7 * q)),
    taper: taperTronco(0.13, 0.05, 0.35),
    arruga: 0.05,
    semilla: seed * 3,
  });
  const cuerpo = new THREE.Color(PB.yarumoTronco);
  const claro = new THREE.Color(PB.yarumoTroncoLuz);
  const anillo = new THREE.Color(PB.yarumoAnillo);
  const tmp = new THREE.Color();
  pintarPorVertice(fuste, (x, y) => {
    const t = Math.min(1, Math.max(0, y / H));
    tmp.copy(cuerpo).lerp(claro, t * 0.5);
    const band = Math.abs(((y / 0.5) % 1) - 0.5); // anillos cada ~0.5 m
    if (band > 0.44) tmp.lerp(anillo, ((band - 0.44) / 0.06) * 0.6);
    return tmp;
  });
  partes.push(fuste);

  // Candelabro: pocas ramas que suben-abren, más un ápice; cada punta lleva
  // una roseta de hojas palmadas.
  const top = curva.getPointAt(1);
  const tips = [[top.x, top.y + 0.22, top.z]];
  const nBr = Math.max(2, Math.round(3 * q));
  for (let i = 0; i < nBr; i++) {
    const ang = (i / nBr) * Math.PI * 2 + r() * 0.5;
    const largo = 0.85 + r() * 0.5;
    const dir = [Math.cos(ang) * 0.72, 1.05, Math.sin(ang) * 0.72];
    const rama = new THREE.CylinderGeometry(0.024, 0.045, largo, 5, 1);
    apuntar(rama, [top.x, top.y - 0.12, top.z], dir);
    partes.push(pintar(rama, PB.yarumoTronco));
    const nrm = Math.hypot(dir[0], dir[1], dir[2]);
    tips.push([
      top.x + (dir[0] / nrm) * largo,
      top.y - 0.12 + (dir[1] / nrm) * largo,
      top.z + (dir[2] / nrm) * largo,
    ]);
  }
  for (let ti = 0; ti < tips.length; ti++) {
    const tip = tips[ti];
    const nH = Math.max(4, Math.round(6 * q));
    for (let j = 0; j < nH; j++) {
      const a = (j / nH) * Math.PI * 2 + r();
      const rad = 0.32 + r() * 0.2;
      // Hoja palmada: cono MUY plano de 7 lados (estrella) apuntando arriba-afuera.
      const hoja = new THREE.ConeGeometry(rad, 0.06, 7, 1);
      apuntar(
        hoja,
        [tip[0] + Math.cos(a) * 0.14, tip[1] + 0.02 + r() * 0.06, tip[2] + Math.sin(a) * 0.14],
        [Math.cos(a) * 0.5, 0.86, Math.sin(a) * 0.5],
        [1, 1, 1],
      );
      // envés plateado ↔ haz verde: mezcla que da el brillo característico.
      const cc = new THREE.Color(PB.yarumoHoja).lerp(new THREE.Color(PB.yarumoHojaLuz), r() * 0.7);
      partes.push(pintar(hoja, cc));
    }
    const cogollo = matojoNube(0.11 + r() * 0.04, seed * 7 + ti, 0.4);
    poner(cogollo, [tip[0], tip[1] + 0.05, tip[2]]);
    partes.push(pintar(cogollo, PB.yarumoHojaLuz));
  }
  return fusionar(partes, 'yarumo');
}

/* -------------------------------------------------------------------------- */
/*  ALISO (Alnus acuminata) — el árbol de agua, copa CÓNICA verde oscura        */
/* -------------------------------------------------------------------------- */

/*
 * El árbol de las orillas y las cañadas altoandinas (fija nitrógeno, cura el
 * suelo). Fuste recto grisáceo y copa CÓNICA/aparasolada estrecha, verde muy
 * oscura — un huso vertical que contrasta con las copas redondas del resto.
 */
export function geomAliso({ q = 1 } = {}, seed = 12) {
  const r = rng(seed);
  const partes = [];
  const H = 3.8 + r() * 1.0;
  const { geo, curva } = troncoHorneado(
    { H, r0: 0.16, r1: 0.055, inclina: 0.03, sinuoso: 0.05, giro: r() * 6, arruga: 0.12, raigon: 0.4, q, hastaLiquen: 0.55, liquen: '#8f9a5e',
      corteza: { grieta: PB.alisoGrieta, cuerpo: PB.alisoTronco, cresta: PB.alisoCresta, escalaGrano: 4.0 } },
    seed + 1,
  );
  partes.push(geo);
  const top = curva.getPointAt(1);
  // Copa CÓNICA: lóbulos apilados que decrecen hacia arriba (huso/pirámide).
  const lobs = [];
  const nNiv = Math.max(3, Math.round(4 * q));
  for (let k = 0; k < nNiv; k++) {
    const t = k / nNiv;
    const y = top.y - 0.1 + t * (H * 0.62);
    const radio = 0.86 * (1 - t * 0.72) + 0.16;
    const nEn = k < nNiv - 1 ? 2 : 1;
    for (let i = 0; i < nEn; i++) {
      const ang = (i / nEn) * Math.PI * 2 + k * 0.9;
      const off = radio * 0.42;
      lobs.push({ c: [top.x + Math.cos(ang) * off, y, top.z + Math.sin(ang) * off], radio });
    }
  }
  copaMasa(lobs, { base: PB.alisoHoja, sol: PB.alisoHojaSol, luz: PB.alisoHojaLuz, q, seed: seed + 7, achatado: 0.86, huecos: 0.42, mordida: 0.42, ao: 0.64 }).forEach((cc) => partes.push(cc));
  return fusionar(partes, 'aliso');
}

/* -------------------------------------------------------------------------- */
/*  GUÁCIMO (Guazuma ulmifolia) — la copa ANCHA y baja (umbráculo de potrero)   */
/* -------------------------------------------------------------------------- */

export function geomGuacimo({ q = 1 } = {}, seed = 13) {
  const r = rng(seed);
  const partes = [];
  const H = 2.6 + r() * 0.6;
  const { geo, curva } = troncoHorneado(
    { H, r0: 0.17, r1: 0.08, inclina: 0.08, sinuoso: 0.12, giro: r() * 6, arruga: 0.16, raigon: 0.45, q,
      corteza: { grieta: PB.guacimoGrieta, cuerpo: PB.guacimoTronco, cresta: PB.guacimoCresta, escalaGrano: 4.4 } },
    seed + 1,
  );
  partes.push(geo);
  const top = curva.getPointAt(1);
  // Copa ANCHA y baja: muchos lóbulos horizontales, densos (umbráculo).
  const lobs = [{ c: [top.x, top.y + 0.2, top.z], radio: 1.0 }];
  const nL = Math.max(5, Math.round(7 * q));
  for (let i = 0; i < nL; i++) {
    const ang = (i / nL) * Math.PI * 2 + r() * 0.4;
    const rad = 0.95 + r() * 0.55;
    const rama = new THREE.CylinderGeometry(0.035, 0.06, rad + 0.2, 5, 1);
    apuntar(rama, [top.x + Math.cos(ang) * 0.15, H - 0.35, top.z + Math.sin(ang) * 0.15], [Math.cos(ang), 0.12, Math.sin(ang)]);
    partes.push(pintar(rama, PB.guacimoCresta));
    lobs.push({ c: [Math.cos(ang) * rad, H - 0.05 + r() * 0.3, Math.sin(ang) * rad], radio: 0.6 + r() * 0.28 });
  }
  copaMasa(lobs, { base: PB.guacimoHoja, sol: PB.guacimoHojaSol, luz: PB.guacimoHojaLuz, q, seed: seed + 7, achatado: 0.56, huecos: 0.44, mordida: 0.42, ao: 0.64 }).forEach((cc) => partes.push(cc));
  return fusionar(partes, 'guacimo');
}

/* -------------------------------------------------------------------------- */
/*  CHACHAFRUTO (Erythrina edulis) — flor NARANJA-salmón + vaina colgante        */
/* -------------------------------------------------------------------------- */

/*
 * El fríjol de árbol de la montaña: pariente del cámbulo, pero de flor más
 * NARANJA-salmón y —su seña— largas VAINAS colgantes con las semillas que se
 * comen. Copa abierta, mediana. Se distingue del cámbulo por el naranja y por
 * los frutos que penden bajo el follaje.
 */
export function geomChachafruto({ q = 1 } = {}, seed = 14) {
  const r = rng(seed);
  const partes = [];
  const H = 2.8 + r() * 0.6;
  const { geo, curva } = troncoHorneado(
    { H, r0: 0.15, r1: 0.07, inclina: 0.08, sinuoso: 0.12, giro: r() * 6, arruga: 0.14, raigon: 0.42, q,
      corteza: { grieta: PB.chachaGrieta, cuerpo: PB.chachaTronco, cresta: PB.chachaCresta, escalaGrano: 4.0 } },
    seed + 1,
  );
  partes.push(geo);
  const top = curva.getPointAt(1);
  const lobs = [{ c: [top.x, top.y + 0.35, top.z], radio: 0.72 }];
  const nL = Math.max(3, Math.round(5 * q));
  for (let i = 0; i < nL; i++) {
    const ang = (i / nL) * Math.PI * 2 + r() * 0.5;
    const rad = 0.62 + r() * 0.45;
    const rama = new THREE.CylinderGeometry(0.03, 0.055, rad + 0.25, 5, 1);
    apuntar(rama, [top.x + Math.cos(ang) * 0.13, H - 0.45, top.z + Math.sin(ang) * 0.13], [Math.cos(ang), 0.55, Math.sin(ang)]);
    partes.push(pintar(rama, PB.chachaCresta));
    lobs.push({ c: [Math.cos(ang) * rad, H + 0.2 + r() * 0.35, Math.sin(ang) * rad], radio: 0.46 + r() * 0.24 });
  }
  copaMasa(lobs, { base: PB.chachaHoja, sol: PB.chachaHojaSol, luz: PB.chachaHojaLuz, q, seed: seed + 7, achatado: 0.72, huecos: 0.5, mordida: 0.42, ao: 0.6 }).forEach((cc) => partes.push(cc));
  floresEnCopa(lobs, { colorA: PB.chachaFlor, colorB: PB.chachaFlor2, q, seed: seed + 3, densidad: 5, escala: 0.5 }).forEach((f) => partes.push(f));
  // Vainas colgantes (el fruto que le da el nombre): cilindros largos, verdes.
  if (q > 0.5) {
    for (const lb of lobs) {
      const nV = Math.max(1, Math.round(2 * q));
      for (let i = 0; i < nV; i++) {
        const ang = r() * Math.PI * 2;
        const rr = lb.radio * (0.4 + r() * 0.5);
        const largo = 0.5 + r() * 0.35;
        const vaina = new THREE.CylinderGeometry(0.022, 0.03, largo, 5, 1);
        poner(
          vaina,
          [lb.c[0] + Math.cos(ang) * rr, lb.c[1] - largo * 0.5 - 0.1, lb.c[2] + Math.sin(ang) * rr],
          [0, 0, r() * 0.24 - 0.12],
        );
        partes.push(pintar(vaina, variar(PB.chachaVaina, r, 0.1)));
      }
    }
  }
  return fusionar(partes, 'chachafruto');
}

/* -------------------------------------------------------------------------- */
/*  DISTRIBUCIÓN — dónde crece cada estrato (el Ent en 0,0,0; la cámara orbita) */
/* -------------------------------------------------------------------------- */

/* El corredor de cámara (mira al Ent desde az≈0.61): los emergentes cercanos no
   se plantan de frente para no tapar al guardián. */
const AZ_CAM = 0.61;
/* xArroyo aproximado (el hilo de agua baja por el flanco derecho, x≈4.7). */
const xArroyoAprox = (z) => 4.7 + Math.sin(z * 0.24 + 1.3) * 1.5;

function tinte(r, amt) {
  const f = 1 + (r() - 0.5) * amt;
  const h = (r() - 0.5) * amt * 0.4;
  const cl = (v) => Math.max(0.72, Math.min(1.16, v));
  return [cl(f + h), cl(f), cl(f - h * 0.6)];
}

/*
 * Siembra en un anillo. `evitaFrente` deja libre el corredor de cámara (para
 * emergentes altos); `evitaAgua` no pisa el arroyo. `agrupa` da ángulo aleatorio
 * (sotobosque/epífitas = manchones); si no, reparto parejo (dosel de fondo).
 */
function sembrar(n, rMin, rMax, r, o = {}) {
  const arr = [];
  const eMin = o.eMin ?? 0.9;
  const eMax = o.eMax ?? 1.15;
  let intentos = 0;
  while (arr.length < n && intentos++ < n * 20) {
    const ang = o.agrupa
      ? r() * Math.PI * 2
      : (arr.length / Math.max(1, n)) * Math.PI * 2 + (r() - 0.5) * 0.8;
    if (o.evitaFrente) {
      const d = Math.atan2(Math.sin(ang - AZ_CAM), Math.cos(ang - AZ_CAM));
      if (Math.abs(d) < 0.42) continue; // deja el encuadre del Ent libre
    }
    const rad = rMin + (rMax - rMin) * (o.haciaAfuera ? Math.sqrt(r()) : r());
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    if (o.evitaAgua && z > -13 && Math.abs(x - xArroyoAprox(z)) < 1.3) continue;
    arr.push({
      pos: [x, 0, z],
      rotY: r() * Math.PI * 2,
      escala: eMin + r() * (eMax - eMin),
      tint: tinte(r, o.varia ?? 0.1),
    });
  }
  return arr;
}

/**
 * Todas las instancias del dosel biodiverso para unos conteos dados.
 * Estratos:
 *   · emergentes (guadua/nogal/cedro) → anillo LEJANO, reparto parejo: la pared
 *     verde del fondo que hace ver hondo el bosque;
 *   · florecidos (cámbulo/gualanday/siete cueros) → anillo medio, salpicados:
 *     el color que rompe el verde;
 *   · sotobosque (helecho/heliconia) → anillo interior-medio, agrupado;
 *   · epífitas (quiche) → cerca del claro, agrupadas al pie de los árboles.
 */
export function distribucionDosel(conteos, seed = 909) {
  const c = conteos;
  return {
    // Emergentes: pared del fondo, altos, reparto parejo, velados por niebla.
    // Anillos ANCHOS y solapados (10→27) para que el dosel se cierre denso y
    // gane profundidad — el bosque se lee como muralla de árboles, no como fila.
    guadua: sembrar(c.guadua, 10, 26, rng(seed + 1), { eMin: 0.95, eMax: 1.4, varia: 0.08, evitaFrente: true, evitaAgua: true }),
    nogal: sembrar(c.nogal, 11, 26, rng(seed + 2), { eMin: 0.95, eMax: 1.25, varia: 0.07, evitaFrente: true, evitaAgua: true }),
    cedro: sembrar(c.cedro, 12, 27, rng(seed + 3), { eMin: 0.95, eMax: 1.25, varia: 0.08, evitaFrente: true, evitaAgua: true }),
    // Yarumo: emergente pionero, disperso y alto, entra hasta el anillo medio.
    yarumo: sembrar(c.yarumo, 10, 25, rng(seed + 10), { eMin: 1.0, eMax: 1.35, varia: 0.06, evitaFrente: true, evitaAgua: true }),
    // Aliso: árbol de AGUA — se le deja pisar cerca del arroyo (sin evitaAgua).
    aliso: sembrar(c.aliso, 8, 22, rng(seed + 11), { eMin: 0.95, eMax: 1.3, varia: 0.07, evitaFrente: true }),
    // Dosel florecido y de sombra: anillo medio, salpicado (color y textura).
    guacimo: sembrar(c.guacimo, 8, 18, rng(seed + 12), { eMin: 0.9, eMax: 1.2, varia: 0.08, evitaAgua: true }),
    cambulo: sembrar(c.cambulo, 8, 18, rng(seed + 4), { eMin: 0.9, eMax: 1.2, varia: 0.08, evitaAgua: true }),
    gualanday: sembrar(c.gualanday, 8, 18, rng(seed + 5), { eMin: 0.9, eMax: 1.2, varia: 0.08, evitaAgua: true }),
    sieteCueros: sembrar(c.sieteCueros, 6, 16, rng(seed + 6), { eMin: 0.85, eMax: 1.2, varia: 0.1, agrupa: true, evitaAgua: true }),
    chachafruto: sembrar(c.chachafruto, 7, 17, rng(seed + 13), { eMin: 0.9, eMax: 1.2, varia: 0.09, evitaAgua: true }),
    // Sotobosque: interior-medio, agrupado (manchones espesos).
    helecho: sembrar(c.helecho, 4.5, 14, rng(seed + 7), { eMin: 0.8, eMax: 1.35, varia: 0.12, agrupa: true, evitaAgua: true }),
    heliconia: sembrar(c.heliconia, 4, 13, rng(seed + 8), { eMin: 0.85, eMax: 1.3, varia: 0.12, agrupa: true, evitaAgua: true }),
    // Epífitas: rosetas cerca del claro, agrupadas al pie de todo.
    quiche: sembrar(c.quiche, 3.4, 12, rng(seed + 9), { eMin: 0.8, eMax: 1.45, varia: 0.12, agrupa: true }),
  };
}
