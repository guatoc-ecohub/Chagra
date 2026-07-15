/*
 * flor — los arquetipos florales, por FAMILIA botánica.
 *
 * La flor es el órgano que define la familia, y la familia predice casi todo
 * lo demás (con qué rota, qué plaga comparte, si necesita polinizador). Por
 * eso las flores de esta librería no son "florcitas": son la estructura de su
 * familia, y una lámina que las dibuje bien enseña parentesco sin decirlo.
 *
 *   SOLANÁCEA (papa, tomate, uchuva, tomate de árbol): corola rotácea de 5
 *   lóbulos soldados + el CONO DE ANTERAS amarillo en el centro (las anteras
 *   se tocan y forman un tubo del que el polen sale por poros — por eso el
 *   abejorro las hace vibrar). Ese cono es la firma de la familia entera.
 *
 *   PAPILIONÁCEA (frijol, haba, arveja): ESTANDARTE arriba, dos ALAS a los
 *   lados, y la QUILLA abajo escondiendo sexo — la flor de mariposa. La misma
 *   familia que pone los nódulos en la raíz: la lámina las relaciona.
 *
 *   RUBIÁCEA (café): 5 pétalos blancos soldados en tubo, en GLOMÉRULOS sobre
 *   la axila. Florece de golpe tras el déficit hídrico + lluvia (el corpus es
 *   explícito: NO es la lluvia sola).
 *
 *   CUCURBITÁCEA (ahuyama): MONOICA — macho y hembra separadas en la misma
 *   mata. La hembra trae el OVARIO ÍNFERO ya visible (una ahuyamita bajo la
 *   flor); el macho va en pedúnculo largo y desnudo. Es lo que hay que ver
 *   para entender por qué "botó la flor y no cargó".
 *
 *   POÁCEA (maíz, caña): sin pétalos. Panícula masculina arriba (la espiga /
 *   el penacho) y, en el maíz, la mazorca femenina en la axila con sus
 *   ESTIGMAS (los cabellos): cada cabello es UN grano. El campesino que sabe
 *   esto entiende por qué la mazorca sale desgranada.
 *
 * Convención: la flor mira hacia arriba (-Y) y se centra en (0,0).
 */
import { entre, tembleque } from '../nucleo/rng.js';
import { suave, lerp } from '../nucleo/trazo.js';

/** Corola de n lóbulos soldados (rotácea): un contorno ondulado continuo, NO
 *  n pétalos sueltos. La diferencia se ve y es real. */
function corolaRotacea(rng, r, lobulos = 5, hendidura = 0.42) {
  const pts = [];
  const n = lobulos * 14;
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    /* el radio oscila: máximo en el centro del lóbulo, mínimo en el seno */
    const onda = Math.cos(a * lobulos + Math.PI / 2);
    const rr = r * (1 - hendidura / 2 + (onda * hendidura) / 2) * (1 + tembleque(rng, 0.02));
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  return suave(pts, true, 0.5);
}

/** Pétalos sueltos (rosácea: mora; rubiácea: café). */
function petalosSueltos(rng, r, n = 5, ancho = 0.62) {
  const ps = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * 360 - 90 + tembleque(rng, 3);
    ps.push({ rot: a, rx: r * ancho * 0.5, ry: r * 0.5, cy: -r * 0.5 });
  }
  return ps;
}

/** SOLANÁCEA — la rotácea con cono de anteras. */
export function florSolanacea(rng, op = {}) {
  const { r = 14, lobulos = 5, reflexo = false } = op;
  return {
    tipo: 'solanacea',
    corola: corolaRotacea(rng, r, lobulos, reflexo ? 0.62 : 0.4),
    /* El cono: las anteras pegadas una contra otra formando un tubo. Se dibuja
       como n husos apretados, no como un círculo amarillo. */
    anteras: Array.from({ length: 5 }, (_, i) => ({
      rot: (i / 5) * 360 + tembleque(rng, 4),
      largo: r * (reflexo ? 0.58 : 0.4),
      ancho: r * 0.11,
    })),
    conoR: r * 0.16,
    estilo: r * (reflexo ? 0.66 : 0.46), // el estilo asoma por la punta del cono
    caliz: Array.from({ length: 5 }, (_, i) => ({ rot: (i / 5) * 360 + 36, largo: r * 0.7 })),
    r,
  };
}

/** PAPILIONÁCEA — estandarte, alas, quilla. Vista de perfil, que es como se
 *  entiende: de frente la quilla no se ve y se pierde el sentido. */
export function florPapilionacea(rng, op = {}) {
  const { r = 12, mancha = false } = op;
  const estandarte = suave(
    [
      [0, 0],
      [-r * 0.62, -r * 0.5],
      [-r * 0.72, -r * 1.02],
      [-r * 0.2, -r * 1.24],
      [r * 0.42, -r * 1.06],
      [r * 0.5, -r * 0.44],
      [r * 0.12, -r * 0.04],
    ],
    true,
    0.55,
  );
  const ala = suave(
    [
      [0, 0],
      [r * 0.5, -r * 0.2],
      [r * 1.02, -r * 0.12],
      [r * 1.14, r * 0.24],
      [r * 0.6, r * 0.42],
      [r * 0.06, r * 0.24],
    ],
    true,
    0.55,
  );
  const quilla = suave(
    [
      [r * 0.06, r * 0.1],
      [r * 0.62, r * 0.18],
      [r * 1.04, r * 0.5],
      [r * 0.72, r * 0.74],
      [r * 0.1, r * 0.56],
    ],
    true,
    0.55,
  );
  return {
    tipo: 'papilionacea',
    estandarte,
    ala,
    quilla,
    /* Haba: la MANCHA NEGRA en el ala es diagnóstica — se reconoce el habal
       en flor desde el otro lado del lote por esa mancha. */
    mancha: mancha ? { cx: r * 0.66, cy: r * 0.12, rx: r * 0.24, ry: r * 0.17 } : null,
    caliz: suave(
      [
        [-r * 0.1, -r * 0.06],
        [-r * 0.44, r * 0.16],
        [-r * 0.28, r * 0.5],
        [r * 0.14, r * 0.36],
      ],
      true,
      0.5,
    ),
    r,
  };
}

/** RUBIÁCEA — el café: pétalos blancos soldados en tubo, en glomérulo. */
export function florRubiacea(rng, op = {}) {
  const { r = 11 } = op;
  return {
    tipo: 'rubiacea',
    petalos: petalosSueltos(rng, r, 5, 0.52),
    tubo: { largo: r * 0.8, ancho: r * 0.17 },
    anteras: Array.from({ length: 5 }, (_, i) => ({ rot: (i / 5) * 360 + 36, largo: r * 0.62 })),
    estilo: r * 0.78,
    r,
  };
}

/** ROSÁCEA — la mora: 5 pétalos blancos, muchos estambres. */
export function florRosacea(rng, op = {}) {
  const { r = 11 } = op;
  return {
    tipo: 'rosacea',
    petalos: petalosSueltos(rng, r, 5, 0.86),
    estambres: Array.from({ length: 22 }, (_, i) => ({
      rot: (i / 22) * 360 + tembleque(rng, 6),
      largo: r * entre(rng, 0.22, 0.36),
    })),
    r,
  };
}

/** CUCURBITÁCEA — monoica: devuelve LAS DOS, macho y hembra. */
export function florCucurbitacea(rng, op = {}) {
  const { r = 16 } = op;
  const corola = corolaRotacea(rng, r, 5, 0.34);
  return {
    tipo: 'cucurbitacea',
    macho: { corola, pedunculo: r * 2.2, anteras: r * 0.3 },
    /* la hembra ya trae la ahuyamita: el ovario ÍNFERO, debajo de la corola */
    hembra: { corola, ovario: { rx: r * 0.62, ry: r * 0.5, cy: r * 1.15 }, estigma: r * 0.26 },
    r,
  };
}

/** SOLANÁCEA CAMPANULADA — la uchuva: campana amarilla con MÁCULAS moradas
 *  en la garganta (la guía de néctar que ve el polinizador). */
export function florCampanulada(rng, op = {}) {
  const { r = 11 } = op;
  return {
    tipo: 'campanulada',
    corola: corolaRotacea(rng, r, 5, 0.3),
    maculas: Array.from({ length: 5 }, (_, i) => ({
      rot: (i / 5) * 360 + 36,
      d: r * 0.38,
      rx: r * 0.15,
      ry: r * 0.2,
    })),
    anteras: Array.from({ length: 5 }, (_, i) => ({ rot: (i / 5) * 360, largo: r * 0.34 })),
    r,
  };
}

/** PASIFLORÁCEA — la curuba: TUBO LARGO colgante, rosado. El tubo es largo
 *  porque la poliniza el colibrí: la forma cuenta quién la visita. */
export function florPasiflora(rng, op = {}) {
  const { r = 12, tubo = 42 } = op;
  return {
    tipo: 'pasiflora',
    tubo: { largo: tubo, ancho: r * 0.3 },
    petalos: petalosSueltos(rng, r, 5, 0.6),
    sepalos: petalosSueltos(rng, r * 1.05, 5, 0.5).map((p) => ({ ...p, rot: p.rot + 36 })),
    corona: Array.from({ length: 26 }, (_, i) => ({ rot: (i / 26) * 360, largo: r * 0.2 })),
    columna: r * 0.7,
    r,
  };
}

/** APIÁCEA — la arracacha: UMBELA COMPUESTA (umbelitas sobre radios). Igual
 *  que zanahoria, apio y perejil: la lámina delata el parentesco. */
export function florUmbela(rng, op = {}) {
  const { r = 26, radios = 9, compuesta = true } = op;
  const brazos = [];
  for (let i = 0; i < radios; i += 1) {
    const a = (i / radios) * Math.PI * 2;
    /* la umbela es plana arriba: los radios de afuera son más largos */
    const l = r * entre(rng, 0.86, 1);
    brazos.push({
      x: Math.cos(a) * l,
      y: Math.sin(a) * l * 0.42 - r * 0.42,
      flores: compuesta
        ? Array.from({ length: 7 }, (_, k) => ({
            a: (k / 7) * Math.PI * 2,
            rr: r * 0.16,
          }))
        : null,
    });
  }
  return { tipo: 'umbela', brazos, r };
}

/** AMARILIDÁCEA — la cebolla larga: umbela GLOBOSA sobre escapo hueco. */
export function florGlobosa(rng, op = {}) {
  const { r = 15 } = op;
  const flores = [];
  for (let i = 0; i < 40; i += 1) {
    /* reparto casi-uniforme sobre el disco (Fibonacci): una umbela globosa no
       es un círculo relleno al azar, es una esfera apretada */
    const t = (i + 0.5) / 40;
    const a = i * 2.399963;
    const rr = Math.sqrt(t) * r;
    flores.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr * 0.9, r: entre(rng, 1.2, 1.9) });
  }
  return { tipo: 'globosa', flores, r };
}

/** POÁCEA — la panícula del maíz (la espiga macho / el penacho) y la de la
 *  caña. Sin pétalos: sólo raquis, ramas y anteras colgando del viento. */
export function paniculaPoacea(rng, op = {}) {
  const { alto = 60, ramas = 7, plumosa = false } = op;
  const eje = `M0 0 L0 ${-alto}`;
  const brazos = [];
  for (let i = 0; i < ramas; i += 1) {
    const t = i / Math.max(ramas - 1, 1);
    const y = -alto * (0.18 + t * 0.72);
    const s = i % 2 === 0 ? -1 : 1;
    const l = alto * lerp(0.42, 0.16, t) * entre(rng, 0.85, 1.15);
    brazos.push({
      d: `M0 ${y.toFixed(1)} q${(s * l * 0.5).toFixed(1)} ${(-l * 0.24).toFixed(1)} ${(s * l).toFixed(1)} ${(-l * 0.62).toFixed(1)}`,
      s,
      y,
      l,
      /* las anteras colgantes: el maíz suelta el polen al viento desde acá */
      anteras: plumosa
        ? null
        : Array.from({ length: 5 }, (_, k) => ({ t: 0.3 + (k / 5) * 0.66, largo: alto * 0.05 })),
    });
  }
  return { tipo: 'panicula', eje, brazos, alto, plumosa };
}

/** LAURÁCEA — el aguacate: flor chica verdoso-amarilla. Su gracia no es la
 *  forma sino la DICOGAMIA: tipo A y tipo B abren a horas distintas para no
 *  autopolinizarse. Por eso se siembran mezclados. */
export function florLauracea(rng, op = {}) {
  const { r = 8 } = op;
  return {
    tipo: 'lauracea',
    tepalos: petalosSueltos(rng, r, 6, 0.72),
    estambres: Array.from({ length: 9 }, (_, i) => ({ rot: (i / 9) * 360, largo: r * 0.42 })),
    r,
  };
}

/** MALVÁCEA CAULIFLORA — el cacao: flor diminuta, DIRECTAMENTE SOBRE EL
 *  TRONCO. La caulifloría no es rareza: es lo que hay que ver para no podar
 *  donde carga. */
export function florCacao(rng, op = {}) {
  const { r = 7 } = op;
  return {
    tipo: 'cauliflora',
    petalos: petalosSueltos(rng, r, 5, 0.44),
    sepalos: petalosSueltos(rng, r * 1.15, 5, 0.36).map((p) => ({ ...p, rot: p.rot + 36 })),
    /* los pétalos del cacao tienen capucha + lígula: por eso sólo la poliniza
       un jején diminuto (Forcipomyia), no la abeja */
    capucha: r * 0.3,
    r,
  };
}

/** MUSÁCEA — la bellota/chira del plátano: la bráctea morada y las manos.
 *  Aunque el plátano de cultivo es triploide estéril y no da semilla, la
 *  inflorescencia manda: por ella entra el moko que llevan los insectos. */
export function inflorescenciaMusa(rng, op = {}) {
  const { largo = 40 } = op;
  const bractea = suave(
    [
      [0, 0],
      [-largo * 0.28, largo * 0.3],
      [-largo * 0.2, largo * 0.78],
      [0, largo],
      [largo * 0.2, largo * 0.74],
      [largo * 0.3, largo * 0.26],
    ],
    true,
    0.5,
  );
  return { tipo: 'musa', bractea, largo };
}

export const FLORES = {
  solanacea: florSolanacea,
  papilionacea: florPapilionacea,
  rubiacea: florRubiacea,
  rosacea: florRosacea,
  cucurbitacea: florCucurbitacea,
  campanulada: florCampanulada,
  pasiflora: florPasiflora,
  umbela: florUmbela,
  globosa: florGlobosa,
  panicula: paniculaPoacea,
  lauracea: florLauracea,
  cauliflora: florCacao,
  musa: inflorescenciaMusa,
};
