/*
 * hoja — el generador de LÁMINA FOLIAR. El corazón del motor.
 *
 * La hoja es el carácter diagnóstico más usado por el campesino: es lo que
 * mira primero, y es donde aparece casi toda enfermedad. Por eso acá NADA es
 * decorativo — forma, nervadura, borde y filotaxia son parámetros con nombre
 * botánico y salen dibujados como son:
 *
 *   - un borde ASERRADO tiene diente de verdad (geometría), no una línea
 *     ondulada que lo insinúe;
 *   - la nervadura BROQUIDÓDROMA del café hace los BUCLES que la definen
 *     (las venas se unen entre sí antes de llegar al borde) — es la firma de
 *     la Rubiaceae y por eso el café se reconoce sin leer el rótulo;
 *   - la nervadura PARALELA del maíz corre de base a punta sin ramificar, y
 *     por eso la hoja de gramínea "se rasga a lo largo de esas venas" (el
 *     corpus lo dice; el dibujo lo obedece);
 *   - una hoja PALMATILOBADA (yuca) se construye con un contorno único que
 *     rodea los lóbulos y baja hasta el seno, no con hojitas superpuestas.
 *
 * Convención: la hoja nace en (0,0) y crece hacia +X; el ancho se reparte en
 * ±Y. Quien la coloca, la rota (ver `trazo.js`).
 */
import { entre, tembleque } from '../nucleo/rng.js';
import { suave, quebrado, espejar, lerp, sujeta, vena } from '../nucleo/trazo.js';

/* ------------------------------------------------------------------ */
/* PERFILES — media lámina: (t) → ancho relativo 0..1.                 */
/* t es la posición sobre el nervio, 0 = base, 1 = punta.              */
/* Cada perfil es una forma botánica con nombre, no un gusto.          */
/* ------------------------------------------------------------------ */
const PERFILES = {
  /* elíptica: el óvalo simétrico, ancho máximo al medio (café, aguacate) */
  eliptica: (t) => Math.sin(Math.PI * t) ** 0.72,
  /* ovada: ancho abajo, se afila arriba (frijol, ulluco) */
  ovada: (t) => Math.sin(Math.PI * t ** 1.32) ** 0.68,
  /* obovada: al revés, ancho arriba */
  obovada: (t) => Math.sin(Math.PI * t ** 0.72) ** 0.68,
  /* lanceolada: larga y angosta, ancho máximo en el tercio bajo */
  lanceolada: (t) => Math.sin(Math.PI * t ** 1.5) ** 0.62,
  /* oblonga: lados casi paralelos, punta y base redondeadas (cacao, plátano) */
  oblonga: (t) => sujeta(Math.sin(Math.PI * t) * 2.05, 0, 1) ** 0.8,
  /* acuminada: elíptica con la punta estirada en pico de goteo (trópico) */
  acuminada: (t) => Math.sin(Math.PI * Math.min(t * 1.1, 1) ** 1.15) ** 0.8,
  /* acorazonada/cordada: ancho en el tercio bajo, base con dos lóbulos */
  acorazonada: (t) => Math.sin(Math.PI * (0.22 + t * 0.78) ** 1.9) ** 0.6,
  /* reniforme: más ancha que larga, seno basal profundo (ahuyama) */
  reniforme: (t) => Math.sin(Math.PI * (0.3 + t * 0.7) ** 2.1) ** 0.5,
  /* lineal: la cinta de la gramínea, ancho casi constante (maíz, caña) */
  lineal: (t) => sujeta(Math.sin(Math.PI * t ** 0.45) * 1.5, 0, 1) ** 1.6,
  /* espatulada: angosta abajo, redonda arriba */
  espatulada: (t) => Math.sin(Math.PI * t ** 0.55) ** 1.1,
};

/* Las formas que llevan lóbulos basales (el corazón de la hoja cordada). */
const CON_LOBULO_BASAL = { acorazonada: 0.16, reniforme: 0.3 };

/* ------------------------------------------------------------------ */
/* BORDES — el diente. `fase` 0..1 dentro del período del diente.      */
/* Devuelve el desplazamiento por la normal, en unidades de amplitud.  */
/* ------------------------------------------------------------------ */
const BORDES = {
  entero: null, // sin diente: el contorno va liso (suave)
  ondulado: (f) => Math.sin(f * Math.PI * 2) * 0.4,
  sinuado: (f) => Math.sin(f * Math.PI * 2) * 1,
  /* aserrado: diente asimétrico INCLINADO HACIA LA PUNTA (así es el diente
     real: sube despacio y cae a pico). Mora, arracacha, tomate. */
  aserrado: (f) => (f < 0.78 ? (f / 0.78) * 1 : 1 - (f - 0.78) / 0.22),
  /* dentado: diente simétrico, perpendicular al borde */
  dentado: (f) => 1 - Math.abs(f - 0.5) * 2,
  /* crenado: festón redondeado, sin pico (ahuyama) */
  crenado: (f) => Math.sin(f * Math.PI) ** 0.6,
};
/* Los bordes que NO se suavizan: si se suavizan, dejan de ser diente. */
const BORDE_ANGULOSO = new Set(['aserrado', 'dentado']);

/* ------------------------------------------------------------------ */
/* Media lámina simple → polilínea de la mitad superior (base→punta).  */
/* ------------------------------------------------------------------ */
function mediaLamina(forma, borde, len, ancho, rng, op = {}) {
  const perfil = PERFILES[forma] || PERFILES.eliptica;
  const anguloso = BORDE_ANGULOSO.has(borde);
  const paso = anguloso ? 1.6 : 3.2; // el diente exige muestreo denso
  const n = Math.max(14, Math.round(len / paso));
  const dientes = op.dientes ?? Math.max(5, Math.round(len / 11));
  const amp = op.ampDiente ?? sujeta(ancho * 0.055, 1.1, 4.2);
  const fBorde = BORDES[borde];
  const pts = [];

  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    let w = perfil(sujeta(t, 0, 1)) * ancho;
    if (fBorde) {
      /* El diente se apaga en la base y en la punta: ninguna hoja real tiene
         dientes en el ápice mismo ni en la inserción del pecíolo. */
      const apaga = Math.sin(Math.PI * sujeta(t, 0, 1)) ** 0.5;
      const fase = (t * dientes) % 1;
      w += fBorde(fase) * amp * apaga;
    }
    /* tembleque mínimo: ninguna hoja es una fórmula perfecta, pero la lámina
       científica tampoco tiembla — 0.25 es el límite de la dignidad */
    pts.push([t * len, -(w + tembleque(rng, 0.25))]);
  }

  /* Lóbulo basal: la hoja acorazonada NO nace en el pecíolo, se extiende por
     DETRÁS de él y deja el seno (la muesca del corazón) al frente. */
  const lob = CON_LOBULO_BASAL[forma];
  if (lob) {
    const w0 = perfil(0) * ancho;
    const atras = len * lob;
    const arranque = pts[0];
    const lobulo = [
      [-atras * 0.45, -w0 * 0.95],
      [-atras, -w0 * 0.5],
      [-atras * 0.82, -w0 * 0.12],
      [len * 0.045, 0], // el fondo del seno: acá muere el pecíolo
    ];
    return { pts: [...lobulo.reverse(), arranque, ...pts.slice(1)], seno: len * 0.045 };
  }
  return { pts: [[0, 0], ...pts.slice(1)], seno: 0 };
}

/* ------------------------------------------------------------------ */
/* Lámina PALMATILOBADA — un solo contorno que rodea todos los lóbulos */
/* y baja hasta el seno entre cada par. Yuca (5-7 lóbulos profundos),  */
/* ahuyama (5 someros), curuba (3 = *tripartita*).                     */
/* ------------------------------------------------------------------ */
function laminaPalmada(len, ancho, rng, op = {}) {
  const n = op.lobulos ?? 5;
  const abre = op.abertura ?? 150; // grados totales del abanico
  const seno = op.seno ?? 0.3; // 0 = hendida hasta el pecíolo, 1 = sin lóbulo
  const borde = op.borde ?? 'entero';
  const fBorde = BORDES[borde];
  const pts = [];
  const medio = (n - 1) / 2;
  const rSeno = len * seno;

  const lobulo = (k) => {
    /* Los lóbulos laterales son más cortos que el central: sin esa merma la
       hoja palmada se ve como una estrella de juguete, no como una hoja. */
    const dist = Math.abs(k - medio) / Math.max(medio, 1);
    const largo = len * lerp(1, 0.58, dist ** 1.3);
    const ang = ((k - medio) / Math.max(medio, 1)) * (abre / 2);
    return { largo, ang: (ang * Math.PI) / 180 };
  };

  for (let k = 0; k < n; k += 1) {
    const { largo, ang } = lobulo(k);
    const anchoLob = ancho * (op.anchoLobulo ?? 0.36);
    const m = Math.max(9, Math.round(largo / 3));
    const lado = [];
    /* sube por un canto del lóbulo y baja por el otro */
    for (let s = -1; s <= 1; s += 2) {
      for (let i = 0; i <= m; i += 1) {
        const t = s < 0 ? i / m : 1 - i / m;
        let w = PERFILES.lanceolada(sujeta(t, 0, 1)) * anchoLob;
        if (fBorde) {
          const fase = (t * Math.max(3, Math.round(largo / 13))) % 1;
          w += fBorde(fase) * anchoLob * 0.12 * Math.sin(Math.PI * t) ** 0.5;
        }
        const x = t * largo;
        const y = s * (w + tembleque(rng, 0.2));
        /* rota el lóbulo a su ángulo del abanico */
        lado.push([x * Math.cos(ang) - y * Math.sin(ang), x * Math.sin(ang) + y * Math.cos(ang)]);
      }
    }
    /* el seno: el punto donde el contorno vuelve hacia el pecíolo entre dos
       lóbulos vecinos. Es lo que hace que la hoja sea hendida y no estrellada */
    if (k < n - 1) {
      const sig = lobulo(k + 1);
      const aSeno = (ang + sig.ang) / 2;
      lado.push([Math.cos(aSeno) * rSeno, Math.sin(aSeno) * rSeno]);
    }
    pts.push(...lado);
  }
  return { pts, seno: 0, palmada: true, lobulos: n, abertura: abre };
}

/* ------------------------------------------------------------------ */
/* NERVADURA — cuatro sistemas reales.                                 */
/* ------------------------------------------------------------------ */
function nervios(tipo, forma, len, ancho, rng, extra = {}) {
  const perfil = PERFILES[forma] || PERFILES.eliptica;
  const d = { principal: '', secundario: '', terciario: '' };

  if (tipo === 'paralela') {
    /* Gramínea: el nervio central grueso y las venas corriendo de base a
       punta SIN ramificar. Por acá se rasga la hoja. */
    d.principal = `M0 0 L${len.toFixed(1)} 0`;
    const k = extra.venas ?? 7;
    for (let i = 1; i <= k; i += 1) {
      for (const s of [-1, 1]) {
        const f = i / (k + 1);
        const p = [];
        for (let j = 0; j <= 12; j += 1) {
          const t = 0.03 + (j / 12) * 0.94;
          p.push([t * len, s * perfil(t) * ancho * f * 0.94]);
        }
        d.secundario += suave(p);
      }
    }
    return d;
  }

  if (tipo === 'palmada') {
    /* Palmada: los nervios primarios salen TODOS del pecíolo, uno por lóbulo */
    const n = extra.lobulos ?? 5;
    const abre = extra.abertura ?? 150;
    const medio = (n - 1) / 2;
    for (let k = 0; k < n; k += 1) {
      const dist = Math.abs(k - medio) / Math.max(medio, 1);
      const largo = len * lerp(1, 0.58, dist ** 1.3) * 0.9;
      const ang = (((k - medio) / Math.max(medio, 1)) * (abre / 2) * Math.PI) / 180;
      const ex = Math.cos(ang) * largo;
      const ey = Math.sin(ang) * largo;
      d.principal += `M0 0 L${ex.toFixed(1)} ${ey.toFixed(1)}`;
      for (let i = 1; i <= 3; i += 1) {
        const t = i / 4;
        const bx = ex * t;
        const by = ey * t;
        const rama = largo * 0.17 * (1 - t * 0.5);
        for (const s of [-1, 1]) {
          const a2 = ang + s * 0.85;
          d.terciario += `M${bx.toFixed(1)} ${by.toFixed(1)} L${(bx + Math.cos(a2) * rama).toFixed(1)} ${(by + Math.sin(a2) * rama).toFixed(1)}`;
        }
      }
    }
    return d;
  }

  /* pinnada y broquidódroma comparten el nervio central + venas al borde */
  d.principal = `M0 0 L${len.toFixed(1)} 0`;
  const k = extra.venas ?? Math.max(4, Math.round(len / 15));
  const t0 = 0.12;
  const t1 = 0.86;
  const alcance = tipo === 'broquidodroma' ? 0.72 : 0.94;
  const puntas = [];

  for (let i = 0; i < k; i += 1) {
    const t = lerp(t0, t1, i / Math.max(k - 1, 1));
    for (const s of [-1, 1]) {
      const ox = t * len;
      const w = perfil(t) * ancho * alcance;
      /* la vena no sale perpendicular: sale inclinada HACIA LA PUNTA, y la
         inclinación se cierra a medida que sube (así es en la hoja real) */
      const avance = lerp(0.42, 0.2, t) * len * 0.32;
      const dx = ox + avance;
      const dy = s * w;
      d.secundario += vena([ox, 0], [Math.min(dx, len * 0.97), dy], 0.22 * s * -1);
      puntas.push({ t, s, x: Math.min(dx, len * 0.97), y: dy });
    }
  }

  if (tipo === 'broquidodroma') {
    /* LA FIRMA DEL CAFÉ: cada vena se curva y se UNE con la siguiente antes
       del borde, formando una cadena de arcos (bucles) paralela al margen.
       Sin esto, un cafeto es una planta genérica cualquiera. */
    for (const s of [-1, 1]) {
      const lado = puntas.filter((p) => p.s === s).sort((a, b) => a.t - b.t);
      for (let i = 0; i < lado.length - 1; i += 1) {
        const a = lado[i];
        const b = lado[i + 1];
        const cx = lerp(a.x, b.x, 0.5) + Math.abs(b.y - a.y) * 0.42;
        const cy = lerp(a.y, b.y, 0.5) * 1.12;
        d.terciario += `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
      }
    }
  } else {
    /* pinnada: venillas de tercer orden entre las secundarias */
    for (let i = 0; i < puntas.length; i += 2) {
      const p = puntas[i];
      if (!p || rng() > 0.7) continue;
      const bx = lerp(p.t * len, p.x, 0.45);
      const by = lerp(0, p.y, 0.45);
      d.terciario += `M${bx.toFixed(1)} ${by.toFixed(1)} L${(bx + len * 0.05).toFixed(1)} ${(by + p.y * 0.22).toFixed(1)}`;
    }
  }
  return d;
}

/* ------------------------------------------------------------------ */
/* API — una hoja completa, lista para pintar.                         */
/* ------------------------------------------------------------------ */
/**
 * @param {Object} spec
 * @param {string} spec.forma      clave de PERFILES, o 'palmatilobada'
 * @param {string} spec.borde      clave de BORDES
 * @param {string} spec.nervadura  'pinnada'|'broquidodroma'|'paralela'|'palmada'
 * @param {number} spec.len        largo del nervio central
 * @param {number} spec.ancho      SEMI-ancho máximo de la lámina
 * @param {Function} spec.rng      generador determinista
 * @returns {{d, contorno, nervios, caja, seno, palmada}}
 */
export function hoja(spec) {
  const { forma, borde = 'entero', nervadura = 'pinnada', len, ancho, rng } = spec;
  const palmada = forma === 'palmatilobada';

  const media = palmada
    ? laminaPalmada(len, ancho, rng, spec)
    : mediaLamina(forma, borde, len, ancho, rng, spec);

  const contorno = palmada ? media.pts : [...media.pts, ...espejar(media.pts.slice(0, -1))];
  const anguloso = palmada ? false : BORDE_ANGULOSO.has(borde);
  const d = anguloso ? quebrado(contorno, true) : suave(contorno, true, palmada ? 0.4 : 0.5);

  const nerv = nervios(palmada ? 'palmada' : nervadura, palmada ? 'lanceolada' : forma, len, ancho, rng, {
    ...spec,
    lobulos: media.lobulos,
    abertura: media.abertura,
  });

  /* caja: la usa el puntillismo y el recorte. Se calcula del contorno real,
     no del perfil teórico, porque el diente y el lóbulo se salen. */
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of contorno) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const caja = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };

  return { d, contorno, nervios: nerv, caja, seno: media.seno, palmada };
}

/* ------------------------------------------------------------------ */
/* HOJAS COMPUESTAS — el otro gran carácter diagnóstico.               */
/* Devuelven una lista de foliolos ya colocados (cada uno con su       */
/* transform), y el raquis que los une.                                */
/* ------------------------------------------------------------------ */
/**
 * @param {string} tipo 'trifoliolada' | 'imparipinnada' | 'paripinnada'
 * @returns {{foliolos: Array, raquis: string, zarcillo: string|null, caja}}
 */
export function hojaCompuesta(spec) {
  const { tipo, len, rng } = spec;
  const foliolos = [];
  let raquis = '';
  let zarcillo = null;

  if (tipo === 'trifoliolada') {
    /* Frijol y mora: tres foliolos, el terminal peciolulado y más grande,
       los dos laterales asimétricos y casi sentados. */
    const peciolo = len * 0.38;
    raquis = `M0 0 L${peciolo.toFixed(1)} 0`;
    const fol = { forma: spec.formaFoliolo ?? 'ovada', borde: spec.borde, nervadura: 'pinnada', rng };
    foliolos.push({
      ...hoja({ ...fol, len: len * 0.62, ancho: len * 0.62 * (spec.esbeltez ?? 0.34) }),
      x: peciolo + len * 0.06,
      y: 0,
      rot: 0,
      terminal: true,
    });
    for (const s of [-1, 1]) {
      foliolos.push({
        ...hoja({ ...fol, len: len * 0.5, ancho: len * 0.5 * (spec.esbeltez ?? 0.34) * 1.06, rng }),
        x: peciolo,
        y: 0,
        rot: s * 58,
        terminal: false,
      });
    }
    raquis += `M${peciolo.toFixed(1)} 0 l${(len * 0.06).toFixed(1)} 0`;
  } else {
    /* Pinnadas: papa/tomate (imparipinnada, foliolos desiguales), arracacha
       (pinnada de Apiaceae), arveja y haba (paripinnadas). */
    const pares = spec.pares ?? 3;
    const largoRaquis = len;
    raquis = `M0 0 L${largoRaquis.toFixed(1)} 0`;
    const base = spec.baseFoliolo ?? 0.3;
    for (let i = 0; i < pares; i += 1) {
      const t = 0.22 + (i / Math.max(pares - 1, 1)) * 0.66;
      /* los foliolos de abajo son más chicos: la hoja pinnada real crece
         hacia la punta */
      const esc = lerp(0.72, 1.05, i / Math.max(pares - 1, 1));
      const lf = largoRaquis * base * esc;
      for (const s of [-1, 1]) {
        foliolos.push({
          ...hoja({
            forma: spec.formaFoliolo ?? 'eliptica',
            borde: spec.borde ?? 'entero',
            nervadura: 'pinnada',
            len: lf,
            ancho: lf * (spec.esbeltez ?? 0.36),
            rng,
          }),
          x: t * largoRaquis,
          y: 0,
          rot: s * (spec.anguloFoliolo ?? 62),
          terminal: false,
        });
      }
      /* imparipinnada de Solanaceae: foliolillos INTERCALADOS entre los pares
         grandes. Es lo que hace inconfundible la hoja de papa y de tomate. */
      if (tipo === 'imparipinnada' && spec.intercalares && i < pares - 1) {
        const tm = t + 0.66 / Math.max(pares - 1, 1) / 2;
        for (const s of [-1, 1]) {
          const lm = lf * 0.36;
          foliolos.push({
            ...hoja({ forma: 'ovada', borde: spec.borde ?? 'entero', nervadura: 'pinnada', len: lm, ancho: lm * 0.42, rng }),
            x: tm * largoRaquis,
            y: 0,
            rot: s * 68,
            terminal: false,
          });
        }
      }
    }
    if (tipo === 'imparipinnada') {
      const lt = largoRaquis * base * 1.18;
      foliolos.push({
        ...hoja({
          forma: spec.formaFoliolo ?? 'eliptica',
          borde: spec.borde ?? 'entero',
          nervadura: 'pinnada',
          len: lt,
          ancho: lt * (spec.esbeltez ?? 0.36),
          rng,
        }),
        x: largoRaquis,
        y: 0,
        rot: 0,
        terminal: true,
      });
    }
    if (tipo === 'paripinnada' && spec.zarcillo) {
      /* Arveja: la hoja NO termina en foliolo, termina en ZARCILLO ramificado
         — ese es su modo de trepar y su diferencia con el haba, que no lo
         tiene. Dibujarlas iguales sería mentir sobre cómo se siembran. */
      let z = `M${largoRaquis.toFixed(1)} 0 q${(len * 0.1).toFixed(1)} ${(-len * 0.08).toFixed(1)} ${(len * 0.19).toFixed(1)} ${(-len * 0.03).toFixed(1)}`;
      for (const s of [-1, 1]) {
        const bx = largoRaquis + len * 0.19;
        const by = -len * 0.03;
        z += `M${bx.toFixed(1)} ${by.toFixed(1)} q${(len * 0.09).toFixed(1)} ${(s * len * 0.07).toFixed(1)} ${(len * 0.16).toFixed(1)} ${(s * len * 0.02).toFixed(1)}`;
        /* el rulo del extremo: el zarcillo que ya se agarró de la vara */
        const rx = bx + len * 0.16;
        const ry = by + s * len * 0.02;
        z += `M${rx.toFixed(1)} ${ry.toFixed(1)} a${(len * 0.035).toFixed(1)} ${(len * 0.035).toFixed(1)} 0 1 ${s > 0 ? 1 : 0} ${(len * 0.02).toFixed(1)} ${(s * len * 0.06).toFixed(1)}`;
      }
      zarcillo = z;
    }
  }

  const caja = { x: -len * 0.1, y: -len * 0.55, w: len * 1.35, h: len * 1.1 };
  return { foliolos, raquis, zarcillo, caja };
}

/** Estípulas: la hojita de la base del pecíolo. En haba y arveja son GRANDES
 *  y diagnósticas (en la arveja, más grandes que los propios foliolos). */
export function estipula(len, rng) {
  return hoja({ forma: 'ovada', borde: 'dentado', nervadura: 'pinnada', len, ancho: len * 0.5, rng });
}

export { PERFILES, BORDES };
