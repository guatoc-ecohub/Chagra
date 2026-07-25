/*
 * raiz — los SISTEMAS RADICALES, dibujados como son.
 *
 * En casi toda ilustración de cultivo la raíz es una greña decorativa: cuatro
 * garabatos bajo la línea del suelo, iguales para la papa que para el frijol.
 * Acá no. La raíz es el órgano que decide cómo se siembra, cómo se aporca,
 * cuánto aguanta la sequía y por dónde entra la enfermedad — y el campesino
 * que abre un hoyo VE esto. Si la lámina miente acá, no sirve para nada.
 *
 * La distinción que sostiene media lámina de esta librería:
 *
 *   PIVOTANTE (frijol, café, tomate de árbol): un eje que manda y se hunde,
 *   con laterales subordinadas. Aguanta sequía porque busca hondo.
 *
 *   FASCICULADA (maíz, cebolla, papa): NO hay eje. Un manojo de raíces
 *   iguales que sale de la base. Explora arriba, se seca primero.
 *
 *   TUBEROSA VERDADERA (yuca, arracacha): la RAÍZ misma se engruesa. Se ve
 *   que el engrosamiento es continuo con la raíz, sin cordón que lo cuelgue.
 *
 *   ESTOLÓN + TUBÉRCULO (papa, ulluco): el tubérculo NO es raíz — es un
 *   TALLO subterráneo engrosado, colgado de un estolón que sale del tallo, y
 *   las raíces verdaderas son las fasciculadas de al lado. Por eso la papa
 *   tiene OJOS (yemas de tallo) y la yuca no. Por eso se aporca la papa y no
 *   la yuca. Esta lámina lo dibuja con el estolón visible, a propósito.
 *   (Aclaración anatómica de botánica general: el corpus del repo dice
 *   "tubérculo" sin explicar la diferencia — pero dibujarla mal induciría al
 *   error, así que se dibuja bien.)
 *
 *   CORMO/RIZOMA (plátano): tallo subterráneo macizo, del que salen los
 *   hijuelos. El plátano NO es árbol: lo que parece tronco es pseudotallo de
 *   vainas de hoja enrolladas, y lo que manda está abajo.
 *
 *   SUPERFICIAL (aguacate): cabellera extendida y somera, que se ahoga con el
 *   encharcamiento. Dibujarla honda sería recomendar mal el drenaje.
 *
 * Convención: el cuello de la raíz está en (0,0) y la raíz baja hacia +Y.
 */
import { entre, tembleque, enteroEntre } from '../nucleo/rng.js';
import { suave, lerp, sujeta } from '../nucleo/trazo.js';

/** Una raicilla que se afina: polilínea + grosor decreciente. Devuelve el
 *  `d` de un path relleno (no una línea), porque una raíz tiene CUERPO. */
function raicilla(rng, x0, y0, ang, largo, grosor, curva = 0.5) {
  const n = 10;
  const eje = [];
  let a = ang;
  let x = x0;
  let y = y0;
  for (let i = 0; i <= n; i += 1) {
    eje.push([x, y]);
    a += tembleque(rng, curva * 0.34);
    const paso = largo / n;
    x += Math.cos(a) * paso;
    y += Math.sin(a) * paso;
  }
  /* engorda el eje: lado y contralado con el grosor que se afina a la punta */
  const izq = [];
  const der = [];
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const g = grosor * (1 - t) ** 0.8;
    const p = eje[i];
    const q = eje[Math.min(i + 1, n)];
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const m = Math.hypot(dx, dy) || 1;
    izq.push([p[0] - (dy / m) * g, p[1] + (dx / m) * g]);
    der.push([p[0] + (dy / m) * g, p[1] - (dx / m) * g]);
  }
  return { d: suave([...izq, ...der.reverse()], true, 0.5), eje };
}

/** Cabellera: raicillas hijas colgadas de un eje. Recursiva y sobria. */
function cabellera(rng, eje, op = {}) {
  const { desde = 0.18, hasta = 0.95, cuantas = 9, largo = 18, grosor = 0.8, abre = 1.05, nivel = 1 } = op;
  let d = '';
  for (let i = 0; i < cuantas; i += 1) {
    const t = lerp(desde, hasta, i / Math.max(cuantas - 1, 1)) + tembleque(rng, 0.03);
    const idx = sujeta(Math.round(t * (eje.length - 1)), 0, eje.length - 1);
    const [x, y] = eje[idx];
    const s = i % 2 === 0 ? -1 : 1;
    /* la lateral sale hacia abajo y afuera, nunca horizontal: la gravedad
       también manda bajo tierra */
    const ang = Math.PI / 2 + s * (abre + tembleque(rng, 0.3));
    const l = largo * entre(rng, 0.6, 1.15) * (1 - t * 0.45);
    const hija = raicilla(rng, x, y, ang, l, grosor, 0.7);
    d += hija.d;
    if (nivel > 0 && l > 9) {
      d += cabellera(rng, hija.eje, {
        desde: 0.35,
        hasta: 0.9,
        cuantas: enteroEntre(rng, 2, 3),
        largo: l * 0.42,
        grosor: grosor * 0.5,
        abre: 0.8,
        nivel: nivel - 1,
      });
    }
  }
  return d;
}

/* ------------------------------------------------------------------ */
/* LOS SISTEMAS                                                        */
/* ------------------------------------------------------------------ */

/** PIVOTANTE: un eje que manda. `nodulos` para las leguminosas. */
function pivotante(rng, op = {}) {
  const { hondo = 90, grosor = 3.4, nodulos = false } = op;
  const eje = raicilla(rng, 0, 0, Math.PI / 2, hondo, grosor, 0.28);
  let d = eje.d;
  d += cabellera(rng, eje.eje, { cuantas: 10, largo: hondo * 0.3, grosor: grosor * 0.3, abre: 1.0 });
  const extra = { pivote: eje.eje };
  if (nodulos) {
    /* Nódulos de Rhizobium: el corpus es explícito y es un dato de manejo,
       no un adorno — ROSADOS por dentro = fijación activa; grises = fallida.
       El campesino los raja con la uña para saber si su frijol está fijando. */
    const bolas = [];
    for (let i = 0; i < 14; i += 1) {
      const t = entre(rng, 0.12, 0.8);
      const idx = sujeta(Math.round(t * (eje.eje.length - 1)), 0, eje.eje.length - 1);
      const [x, y] = eje.eje[idx];
      bolas.push({
        x: x + tembleque(rng, hondo * 0.16),
        y: y + tembleque(rng, 4),
        r: entre(rng, 1.5, 2.9),
      });
    }
    extra.nodulos = bolas;
  }
  return { d, ...extra };
}

/** FASCICULADA: el manojo. No hay jefe. */
function fasciculada(rng, op = {}) {
  const { cuantas = 13, largo = 62, grosor = 1.5, abre = 1.15 } = op;
  let d = '';
  for (let i = 0; i < cuantas; i += 1) {
    const f = (i / Math.max(cuantas - 1, 1)) * 2 - 1; // -1..1
    const ang = Math.PI / 2 + f * abre + tembleque(rng, 0.12);
    const l = largo * entre(rng, 0.72, 1.1) * (1 - Math.abs(f) * 0.24);
    const r = raicilla(rng, tembleque(rng, 2.5), tembleque(rng, 1.5), ang, l, grosor, 0.5);
    d += r.d;
    d += cabellera(rng, r.eje, { cuantas: 4, largo: l * 0.24, grosor: grosor * 0.34, abre: 0.9, nivel: 0 });
  }
  return { d };
}

/** TUBEROSA VERDADERA: la raíz ENGRUESA. Sin cordón: el engrosamiento es
 *  continuo con la raíz (yuca, arracacha). Ese detalle es el diagnóstico. */
function tuberosaVerdadera(rng, op = {}) {
  const { cuantas = 4, largo = 66, gordo = 11, abre = 0.72, cuello = 3 } = op;
  const cuerpos = [];
  let d = '';
  for (let i = 0; i < cuantas; i += 1) {
    const f = (i / Math.max(cuantas - 1, 1)) * 2 - 1;
    const ang = Math.PI / 2 + f * abre + tembleque(rng, 0.1);
    const l = largo * entre(rng, 0.82, 1.12);
    /* perfil de raíz engrosada: angosta en el cuello, gorda al medio, punta
       afilada. Es un huso, no una salchicha. */
    const n = 16;
    const izq = [];
    const der = [];
    let x = tembleque(rng, 2);
    let y = 0;
    let a = ang;
    for (let j = 0; j <= n; j += 1) {
      const t = j / n;
      const g = lerp(cuello, gordo, Math.sin(Math.PI * sujeta(t * 0.92 + 0.04, 0, 1)) ** 0.72) * (1 - t * 0.1);
      izq.push([x - Math.sin(a) * -g, y + Math.cos(a) * -g]);
      der.push([x + Math.sin(a) * -g, y - Math.cos(a) * -g]);
      a += tembleque(rng, 0.05);
      x += Math.cos(a) * (l / n);
      y += Math.sin(a) * (l / n);
    }
    const cuerpo = [...izq, ...der.reverse()];
    d += suave(cuerpo, true, 0.5);
    cuerpos.push({ pts: cuerpo, punta: [x, y], ang });
  }
  /* raicillas finas sobre las engrosadas: la raíz tuberosa igual absorbe */
  for (const c of cuerpos) {
    const ejeFalso = c.pts.slice(0, 17);
    d += cabellera(rng, ejeFalso, { cuantas: 3, largo: 9, grosor: 0.45, abre: 1.2, nivel: 0 });
  }
  return { d, cuerpos };
}

/** ESTOLÓN + TUBÉRCULO: papa y ulluco. El tubérculo es TALLO, colgado de un
 *  estolón; las raíces verdaderas van aparte, fasciculadas. */
function estolonTuberculo(rng, op = {}) {
  const { cuantos = 5, radio = 40, tuber = 10, alargado = 1.35 } = op;
  const fas = fasciculada(rng, { cuantas: 9, largo: 52, grosor: 1.1, abre: 1.25 });
  let estolones = '';
  const tuberculos = [];
  for (let i = 0; i < cuantos; i += 1) {
    const f = (i / Math.max(cuantos - 1, 1)) * 2 - 1;
    const ang = Math.PI / 2 + f * 1.35;
    const l = radio * entre(rng, 0.62, 1.05);
    const ex = Math.cos(ang) * l;
    const ey = Math.sin(ang) * l * 0.62 + 8;
    /* el estolón: horizontal-ish, delgado, y SE VE que es un cordón de tallo
       (no una raíz): sale del tallo, no del cuello radical */
    const cx = ex * 0.45 + tembleque(rng, 5);
    const cy = ey * 0.4 - 6;
    estolones += `M0 2 Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
    tuberculos.push({
      x: ex,
      y: ey,
      rx: tuber * entre(rng, 0.82, 1.2) * alargado,
      ry: tuber * entre(rng, 0.85, 1.15),
      rot: (ang * 180) / Math.PI - 90 + tembleque(rng, 22),
    });
  }
  return { d: fas.d, estolones, tuberculos };
}

/** CORMO / RIZOMA: el plátano. Macizo, con hijuelos. */
function cormo(rng, op = {}) {
  const { ancho = 34, alto = 26, hijuelos = 2 } = op;
  const pts = [];
  for (let i = 0; i <= 20; i += 1) {
    const a = Math.PI * (i / 20);
    pts.push([Math.cos(a) * ancho * (1 + tembleque(rng, 0.04)), alto * 0.25 + Math.sin(a) * alto]);
  }
  const cuerpo = suave([[-ancho, alto * 0.2], ...pts.reverse(), [ancho, alto * 0.2]], true, 0.5);
  const eje = [];
  for (let i = 0; i <= 10; i += 1) eje.push([lerp(-ancho * 0.8, ancho * 0.8, i / 10), alto * 0.95]);
  let raices = '';
  for (let i = 0; i < 12; i += 1) {
    const x = lerp(-ancho * 0.85, ancho * 0.85, i / 11);
    const r = raicilla(rng, x, alto * 0.9, Math.PI / 2 + tembleque(rng, 0.8), entre(rng, 26, 44), 1.2, 0.5);
    raices += r.d;
  }
  const brotes = [];
  for (let i = 0; i < hijuelos; i += 1) {
    const s = i % 2 === 0 ? -1 : 1;
    brotes.push({ x: s * ancho * entre(rng, 0.72, 0.95), y: -alto * 0.1, alto: entre(rng, 20, 34), s });
  }
  return { d: cuerpo, raices, brotes };
}

/** SUPERFICIAL: el aguacate. Ancha y somera — se ahoga si se encharca. */
function superficial(rng, op = {}) {
  const { ancho = 105, hondo = 30, cuantas = 9 } = op;
  let d = '';
  for (let i = 0; i < cuantas; i += 1) {
    const f = (i / Math.max(cuantas - 1, 1)) * 2 - 1;
    /* casi horizontales: el ángulo apenas baja. Ese es el carácter. */
    const ang = Math.PI / 2 + f * 1.42;
    const l = ancho * 0.5 * entre(rng, 0.7, 1.05);
    const r = raicilla(rng, tembleque(rng, 3), 2, ang, l, 2.2, 0.34);
    d += r.d;
    d += cabellera(rng, r.eje, { cuantas: 5, largo: hondo * 0.5, grosor: 0.5, abre: 0.55, nivel: 0 });
  }
  return { d };
}

/** MACOLLA / CEPA: cebolla larga y caña. Se multiplica de a hijuelos, y por
 *  eso se siembra por división y no por semilla. */
function macolla(rng, op = {}) {
  const { hijos = 3, largo = 44 } = op;
  const fas = fasciculada(rng, { cuantas: 12, largo, grosor: 1.1, abre: 1.3 });
  const bulbos = [];
  for (let i = 0; i < hijos; i += 1) {
    const f = (i / Math.max(hijos - 1, 1)) * 2 - 1;
    bulbos.push({ x: f * 9 + tembleque(rng, 1.4), y: -7, rx: entre(rng, 3.6, 5), ry: entre(rng, 8, 11) });
  }
  return { d: fas.d, bulbos };
}

const SISTEMAS = {
  pivotante,
  fasciculada,
  tuberosaVerdadera,
  estolonTuberculo,
  cormo,
  superficial,
  macolla,
};

/**
 * @param {string} tipo clave de SISTEMAS
 * @param {Function} rng
 * @param {Object} op parámetros del sistema
 */
export function raiz(tipo, rng, op = {}) {
  const f = SISTEMAS[tipo] || fasciculada;
  return { tipo, ...f(rng, op) };
}

/** El rótulo honesto de cada sistema: lo que la lámina DEBE decir en palabras
 *  además de dibujarlo, porque el nombre es la mitad de la enseñanza. */
export const NOMBRE_SISTEMA = {
  pivotante: 'raíz pivotante — un eje manda y se hunde',
  fasciculada: 'raíz fasciculada — manojo, sin eje que mande',
  tuberosaVerdadera: 'raíz tuberosa — la raíz misma engruesa',
  estolonTuberculo: 'tubérculo sobre estolón — es TALLO, no raíz',
  cormo: 'cormo (rizoma) — tallo subterráneo; de aquí salen los hijuelos',
  superficial: 'raíz superficial — somera; se ahoga con el encharcamiento',
  macolla: 'macolla — se divide en hijuelos; por eso no se siembra de semilla',
};

export { SISTEMAS };
