/*
 * habito — el PORTE de la mata entera y la ESCALA.
 *
 * El hábito es lo que decide el trabajo: si trepa hay que tutorar, si es
 * rastrera tapa el suelo y ahorra deshierba, si es hierba gigante no se poda
 * como árbol (aunque lo parezca), si macolla se divide en vez de sembrarse.
 * Por eso el porte no es "la forma bonita de la planta": es una instrucción.
 *
 * Y la ESCALA es la mitad del asunto. Una lámina sin escala miente por
 * omisión: el cacao y el tomate de árbol dibujados del mismo tamaño en la
 * página hacen creer que son matas parecidas, cuando uno es un árbol de 8 m
 * y el otro un arbolito de 4 años de vida. Por eso TODA lámina de esta
 * colección lleva silueta humana (1,65 m) o mano (18 cm) — nunca ninguna.
 *
 * La silueta va sobria y de perfil neutro, sin sombrero ni ruana: acá es un
 * INSTRUMENTO DE MEDIDA, no un personaje. Los personajes de Chagra viven en
 * `visual/creatures` y tienen otro oficio; meter uno acá volvería caricatura
 * una lámina científica, que es justo lo que esta colección no puede ser.
 *
 * FILOTAXIA: dónde se prende cada hoja. Es carácter diagnóstico duro y acá
 * manda sobre el dibujo — el café tiene hojas OPUESTAS y el aguacate
 * ALTERNAS, y esa sola diferencia los separa a diez metros de distancia.
 */
import { entre, tembleque } from '../nucleo/rng.js';
import { suave, lerp, sujeta } from '../nucleo/trazo.js';

/** Metros → píxeles de la lámina, con la altura de la caja de hábito dada. */
export const escalaDe = (metrosMax, altoPx) => altoPx / metrosMax;

/* ------------------------------------------------------------------ */
/* FILOTAXIA — el reparto de las hojas sobre el tallo.                 */
/* ------------------------------------------------------------------ */
/**
 * @param {string} tipo 'alterna'|'opuesta'|'disticha'|'roseta'|'verticilada'
 * @param {number} nodos cuántos nudos
 * @param {number} alto  largo del tallo en px
 * @returns {Array<{y, lado, rot, esc}>} inserciones listas para colgar hoja
 */
export function filotaxia(tipo, nodos, alto, rng, op = {}) {
  const { desde = 0.08, hasta = 0.94, colgante = 0 } = op;
  const out = [];
  for (let i = 0; i < nodos; i += 1) {
    const t = lerp(desde, hasta, i / Math.max(nodos - 1, 1));
    const y = -t * alto;
    /* las hojas de abajo son más grandes y más viejas (y ahí empieza la
       Alternaria: "manchitas en HOJA VIEJA"). La escala lo respeta. */
    const esc = lerp(1.12, 0.6, t);
    /* la hoja de abajo cuelga; la de arriba se levanta buscando luz */
    const base = lerp(28, -18, t) + colgante;

    if (tipo === 'opuesta') {
      /* dos hojas por nudo, enfrentadas. Cada nudo gira 90° respecto al
         anterior (decusadas): en 2D se alterna par largo / par escorzado. */
      const escorzo = i % 2 === 0 ? 1 : 0.42;
      for (const s of [-1, 1]) {
        out.push({ y, lado: s, rot: s * base + tembleque(rng, 4), esc: esc * escorzo, nodo: i });
      }
    } else if (tipo === 'disticha' || tipo === 'disticha') {
      /* dos hileras y nada más: la gramínea. El maíz no tiene otra opción. */
      const s = i % 2 === 0 ? -1 : 1;
      out.push({ y, lado: s, rot: s * (base + 14), esc, nodo: i });
    } else if (tipo === 'roseta') {
      /* todas de la base: arracacha. No hay tallo que valga. */
      const s = i % 2 === 0 ? -1 : 1;
      const f = (i / Math.max(nodos - 1, 1)) * 2 - 1;
      out.push({ y: -alto * 0.06 * Math.abs(f), lado: s, rot: f * 62 - 90, esc: entre(rng, 0.85, 1.1), nodo: i });
    } else if (tipo === 'verticilada') {
      for (const s of [-1, 1]) {
        out.push({ y, lado: s, rot: s * base, esc, nodo: i });
        out.push({ y, lado: s, rot: s * base * 0.3, esc: esc * 0.5, nodo: i });
      }
    } else {
      /* ALTERNA: la espiral de 137,5°. En 2D se lee como izquierda-derecha
         con escorzo variable — que es exactamente como se ve de frente. */
      const giro = (i * 137.5) % 360;
      const s = giro < 180 ? -1 : 1;
      /* el escorzo sale del seno del ángulo: la hoja que apunta al lector se
         ve corta. Esto es lo que da profundidad sin sombrear nada. */
      const escorzo = sujeta(Math.abs(Math.sin((giro * Math.PI) / 180)), 0.34, 1);
      out.push({ y, lado: s, rot: s * base + tembleque(rng, 5), esc: esc * escorzo, nodo: i });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* PORTES                                                              */
/* ------------------------------------------------------------------ */

/** Tallo con temblor honesto: ninguna mata crece con escuadra. */
function tallo(rng, alto, grosorBase, grosorPunta, curva = 0.06) {
  const izq = [];
  const der = [];
  const n = 14;
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const g = lerp(grosorBase, grosorPunta, t ** 0.7);
    const x = Math.sin(t * Math.PI * 0.8) * alto * curva + tembleque(rng, 0.5);
    const y = -t * alto;
    izq.push([x - g, y]);
    der.push([x + g, y]);
  }
  return { d: suave([...izq, ...der.reverse()], true, 0.5), eje: izq.map(([x, y], i) => [x + lerp(grosorBase, grosorPunta, i / n), y]) };
}

/** HERBÁCEA ERECTA — papa, tomate, haba, uchuva, tomate de árbol joven. */
function herbacea(rng, op = {}) {
  const { alto = 200, nodos = 6, filo = 'alterna', grosor = 3.2 } = op;
  const t = tallo(rng, alto, grosor, grosor * 0.42, 0.05);
  return { tallo: t.d, eje: t.eje, hojas: filotaxia(filo, nodos, alto, rng), alto };
}

/** ARBUSTO / ARBOLITO — café, cacao joven, aguacate, mora, yuca.
 *  Tronco + ramas plagiotrópicas (las que cargan). En el café esa distinción
 *  es el manejo entero: el eje ortotrópico crece, las bandolas producen. */
function arbusto(rng, op = {}) {
  const { alto = 240, ramas = 5, filo = 'opuesta', grosor = 5, copa = 0.62 } = op;
  const t = tallo(rng, alto, grosor, grosor * 0.3, 0.03);
  const brazos = [];
  for (let i = 0; i < ramas; i += 1) {
    const f = i / Math.max(ramas - 1, 1);
    const y = -alto * lerp(0.24, 0.9, f);
    /* las ramas de abajo son más largas: la copa es un cono, no una bola */
    const l = alto * copa * lerp(1, 0.3, f ** 1.2);
    for (const s of [-1, 1]) {
      /* la bandola sale casi horizontal y se levanta en la punta */
      const ex = s * l;
      const ey = y - l * 0.16;
      brazos.push({
        d: `M0 ${y.toFixed(1)} Q${(s * l * 0.5).toFixed(1)} ${(y + l * 0.1).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`,
        s,
        y,
        l,
        hojas: filotaxia(filo, Math.max(3, Math.round(l / 26)), l, rng, { desde: 0.25 }),
        ex,
        ey,
      });
    }
  }
  return { tallo: t.d, eje: t.eje, ramas: brazos, hojas: [], alto };
}

/** HIERBA GIGANTE — el plátano. NO es árbol: el "tronco" es PSEUDOTALLO de
 *  vainas de hoja enrolladas, y por eso se corta con machete de un golpe y
 *  por eso no tiene corteza ni anillos. Las vainas se dibujan. */
function hierbaGigante(rng, op = {}) {
  const { alto = 300, hojas = 6 } = op;
  const g = alto * 0.055;
  const t = tallo(rng, alto * 0.62, g, g * 0.72, 0.01);
  /* LAS VAINAS: las líneas concéntricas del pseudotallo. Sin esto se lee como
     tronco y la lámina estaría mintiendo sobre qué es un plátano. */
  const vainas = [];
  for (let i = 1; i <= 5; i += 1) {
    const x = -g + (i / 6) * g * 2;
    vainas.push(`M${x.toFixed(1)} 0 L${(x * 0.72).toFixed(1)} ${(-alto * 0.62).toFixed(1)}`);
  }
  const pencas = [];
  for (let i = 0; i < hojas; i += 1) {
    const f = i / Math.max(hojas - 1, 1);
    const s = i % 2 === 0 ? -1 : 1;
    /* la hoja de plátano nace enrollada, se abre, y el viento la RASGA entre
       las venas — una hoja adulta rasgada NO es una hoja enferma. La lámina
       lo dice porque si no, se confunde con daño. */
    pencas.push({
      y: -alto * 0.62 + tembleque(rng, 4),
      rot: s * lerp(18, 74, f) - 90 + tembleque(rng, 6),
      esc: lerp(1, 0.66, f),
      rasgada: f > 0.35,
      s,
    });
  }
  return { tallo: t.d, eje: t.eje, vainas, pencas, alto, pseudotallo: true };
}

/** TREPADORA — curuba, arveja, frijol voluble, mora en espaldera.
 *  Se dibuja CON su tutor: sin tutor, el dibujo estaría mintiendo sobre el
 *  trabajo que exige. La curuba se asocia con aliso (que además fija N). */
function trepadora(rng, op = {}) {
  const { alto = 240, vueltas = 3.2, nodos = 7, filo = 'alterna', tutorAncho = 34 } = op;
  const pts = [];
  const n = 60;
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    /* la guía enrolla el tutor: una sinusoide que se aprieta al subir */
    const x = Math.sin(t * Math.PI * 2 * vueltas) * tutorAncho * lerp(1, 0.62, t);
    pts.push([x, -t * alto]);
  }
  const ins = [];
  for (let i = 0; i < nodos; i += 1) {
    const t = lerp(0.14, 0.94, i / Math.max(nodos - 1, 1));
    const idx = Math.round(t * n);
    const [x, y] = pts[idx];
    const s = Math.cos(t * Math.PI * 2 * vueltas) > 0 ? 1 : -1;
    ins.push({ x, y, lado: s, rot: s * 34 + tembleque(rng, 8), esc: lerp(1.05, 0.7, t), nodo: i });
  }
  return {
    guia: suave(pts, false, 0.5),
    tutor: { x: 0, alto, ancho: 3.4 },
    hojas: ins,
    alto,
    trepa: true,
  };
}

/** RASTRERA — la ahuyama. Guías largas por el suelo + zarcillos. "Cubre el
 *  suelo con sus hojas amplias y baja la evapotranspiración": eso se ve
 *  dibujándola ANCHA y BAJA, no alta. */
function rastrera(rng, op = {}) {
  const { largo = 300, nodos = 5 } = op;
  const pts = [];
  for (let i = 0; i <= 30; i += 1) {
    const t = i / 30;
    pts.push([t * largo, Math.sin(t * Math.PI * 1.6) * -largo * 0.05 + tembleque(rng, 1.5)]);
  }
  const ins = [];
  for (let i = 0; i < nodos; i += 1) {
    const t = lerp(0.1, 0.9, i / Math.max(nodos - 1, 1));
    const idx = Math.round(t * 30);
    const [x, y] = pts[idx];
    ins.push({ x, y, lado: i % 2 === 0 ? -1 : 1, rot: (i % 2 === 0 ? -1 : 1) * 74, esc: lerp(1.05, 0.72, t), nodo: i });
  }
  const zarcillos = ins.map((p) => ({
    d: `M${p.x.toFixed(1)} ${p.y.toFixed(1)} q${(largo * 0.03).toFixed(1)} ${(-largo * 0.04).toFixed(1)} ${(largo * 0.06).toFixed(1)} ${(-largo * 0.015).toFixed(1)} q${(largo * 0.02).toFixed(1)} ${(largo * 0.02).toFixed(1)} ${(largo * 0.045).toFixed(1)} 0`,
  }));
  return { guia: suave(pts, false, 0.5), hojas: ins, zarcillos, largo, alto: largo * 0.2, rastrera: true };
}

/** MACOLLA DE GRAMÍNEA — maíz y caña. Tallo con nudos + hojas dísticas que
 *  se arquean. El maíz además saca RAÍCES ZANCUDAS (fúlcreas) del primer
 *  nudo: son las que lo sostienen contra el viento y las que el aporque
 *  entierra. Por eso el maíz se aporca. */
function graminea(rng, op = {}) {
  const { alto = 260, nudos = 6, zancudas = true, grosor = 4.2 } = op;
  const t = tallo(rng, alto, grosor, grosor * 0.66, 0.02);
  const anillos = [];
  for (let i = 1; i <= nudos; i += 1) anillos.push(-(i / (nudos + 1)) * alto);
  const hojas = filotaxia('disticha', nudos, alto, rng, { desde: 0.16, hasta: 0.9 });
  const fulcreas = [];
  if (zancudas) {
    for (let i = 0; i < 6; i += 1) {
      const s = i % 2 === 0 ? -1 : 1;
      const y = -alto * (0.04 + (i % 3) * 0.035);
      fulcreas.push({
        d: `M0 ${y.toFixed(1)} Q${(s * 8).toFixed(1)} ${(y + 8).toFixed(1)} ${(s * entre(rng, 11, 17)).toFixed(1)} ${(y + entre(rng, 20, 30)).toFixed(1)}`,
        s,
      });
    }
  }
  return { tallo: t.d, eje: t.eje, anillos, hojas, fulcreas, alto };
}

/** ÁRBOL — aguacate adulto, cacao adulto. Copa con ramificación simple y
 *  digna: la lámina no dibuja cada hoja de un árbol de 8 m, dibuja la MASA
 *  de la copa y manda el detalle a su recuadro. Fingir 4.000 hojas es de
 *  aficionado; la lámina clásica resuelve la copa con silueta y textura. */
function arbol(rng, op = {}) {
  const { alto = 300, copaR = 0.42, ramas = 4, cauliflor = false } = op;
  const t = tallo(rng, alto * 0.52, alto * 0.032, alto * 0.018, 0.02);
  const brazos = [];
  for (let i = 0; i < ramas; i += 1) {
    const f = i / Math.max(ramas - 1, 1);
    const s = i % 2 === 0 ? -1 : 1;
    const y = -alto * lerp(0.34, 0.52, f);
    const l = alto * copaR * entre(rng, 0.7, 1);
    brazos.push({ d: `M0 ${y.toFixed(1)} Q${(s * l * 0.4).toFixed(1)} ${(y - l * 0.4).toFixed(1)} ${(s * l).toFixed(1)} ${(y - l * 0.72).toFixed(1)}`, s, y, l });
  }
  /* la copa: un contorno de masa, con las mordidas del follaje */
  const copa = [];
  for (let i = 0; i < 26; i += 1) {
    const a = (i / 26) * Math.PI * 2;
    const rr = alto * copaR * (1 + tembleque(rng, 0.16));
    copa.push([Math.cos(a) * rr * 1.16, -alto * 0.68 + Math.sin(a) * rr * 0.86]);
  }
  return {
    tallo: t.d,
    eje: t.eje,
    ramas: brazos,
    copa: suave(copa, true, 0.5),
    /* CAULIFLORÍA (cacao): flores y mazorcas SOBRE EL TRONCO. Se marcan los
       cojines florales, que es donde NO hay que meter el machete. */
    cojines: cauliflor
      ? Array.from({ length: 7 }, () => ({
          y: -alto * entre(rng, 0.1, 0.48),
          s: rng() > 0.5 ? 1 : -1,
          r: entre(rng, 1.6, 2.8),
        }))
      : null,
    alto,
  };
}

export const PORTES = { herbacea, arbusto, hierbaGigante, trepadora, rastrera, graminea, arbol };

export function habito(tipo, rng, op = {}) {
  const f = PORTES[tipo] || herbacea;
  return { tipo, ...f(rng, op) };
}

/* ------------------------------------------------------------------ */
/* ESCALA — el instrumento de medida.                                  */
/* ------------------------------------------------------------------ */
/** Silueta humana de perfil, 1,65 m. Sobria a propósito: es una regla, no un
 *  personaje. Devuelve el path para una altura en px dada. */
export function siluetaHumana(altoPx) {
  const u = altoPx / 165; // el canon en centímetros
  const p = (x, y) => [x * u, -y * u];
  const cuerpo = [
    p(0, 0), p(-3.5, 1), p(-4, 12), p(-3, 38), p(-4, 62), p(-2, 78),
    p(-5, 96), p(-6, 118), p(-4.5, 132), p(-5.5, 140),
    p(-4, 148), p(-4.5, 156), p(-2.5, 162), p(0, 165), p(2.5, 162),
    p(4.5, 156), p(4, 148), p(5.5, 140), p(4.5, 132), p(6, 118),
    p(5, 96), p(2, 78), p(4, 62), p(3, 38), p(4, 12), p(3.5, 1),
  ];
  return {
    d: suave(cuerpo, true, 0.45),
    /* el brazo colgando, aparte: define la escala del gesto */
    brazo: `M${(-5.5 * u).toFixed(1)} ${(-132 * u).toFixed(1)} q${(-4 * u).toFixed(1)} ${(18 * u).toFixed(1)} ${(-2.5 * u).toFixed(1)} ${(38 * u).toFixed(1)}`,
    alto: altoPx,
    metros: 1.65,
  };
}

/** Mano de referencia (18 cm de la muñeca a la punta del dedo medio): para
 *  los órganos que la silueta no puede medir — un grano, una flor, una hoja. */
export function manoReferencia(altoPx) {
  const u = altoPx / 18;
  const p = (x, y) => [x * u, -y * u];
  const palma = [
    p(0, 0), p(-4, 0.5), p(-4.6, 5), p(-4.4, 8),
    p(-4.6, 12), p(-3.9, 12.6), p(-3.2, 12.2), p(-3, 8.5),
    p(-2.4, 13.6), p(-1.5, 14.2), p(-0.7, 13.6), p(-0.9, 8.4),
    p(0.1, 14.4), p(1, 15), p(1.8, 14.3), p(1.4, 8.2),
    p(2.4, 13.2), p(3.2, 13.6), p(3.8, 12.9), p(3.2, 7.6),
    p(4.4, 9.4), p(5.2, 9.2), p(5.2, 8), p(4, 4.4), p(3.6, 0.6),
  ];
  return { d: suave(palma, true, 0.4), alto: altoPx, cm: 18 };
}

/** Barra de escala con su rótulo: la cota dura. Devuelve los datos; el rótulo
 *  lo pone quien pinta (necesita tipografía). */
export function barraEscala(pxPorMetro, metros = 1) {
  const largo = pxPorMetro * metros;
  return {
    largo,
    /* mitades alternadas negro/blanco, como toda barra de escala científica */
    mitades: [
      { x: 0, w: largo / 2, lleno: true },
      { x: largo / 2, w: largo / 2, lleno: false },
    ],
    rotulo: metros >= 1 ? `${metros} m` : `${Math.round(metros * 100)} cm`,
  };
}
