/*
 * sembrado — EL PLANO DE LA FINCA, en datos puros.
 *
 * Este mundo no es un jardín bonito: es una FINCA con decisiones tomadas, y el
 * plano mismo enseña. Lo que hay y por qué está donde está:
 *
 *   EL RINCÓN DE MONTE (al fondo)   — el pedazo que no se tocó. Ahí ANIDAN los
 *     polinizadores silvestres y ahí hay flor todo el año: el guamo que abre de
 *     noche para el murciélago, la flor roja del colibrí, la gruesa del
 *     escarabajo. No es tierra desperdiciada: es la fábrica de bichos que
 *     después trabajan gratis en el cultivo. Sin monte, este mundo se vacía.
 *   EL MELIPONARIO (izquierda)      — bajo sombra parcial, con su platón de agua.
 *   LA HUERTA (centro-frente)       — flores moradas con guías de néctar.
 *   EL MARACUYÁ (centro)            — el emparrado. El que más depende.
 *   LA AHUYAMA (derecha-frente)     — flor macho y flor hembra: alguien tiene que
 *     cruzar el polen o no hay fruto.
 *   EL CAFÉ (izquierda-fondo)       — bajo sombrío. Se poliniza solo; mejora con
 *     visita.
 *   EL MAIZAL (derecha-fondo)       — EL CONTRAPESO. Bloque cerrado, sin una sola
 *     flor de cartel. Nadie lo visita nunca y aun así da mazorca: es de VIENTO.
 *   LA CERCA VIVA FLORIDA (bordes)  — caléndula, girasol, capuchina. El CORREDOR:
 *     conecta el monte con el cultivo y da de comer cuando el cultivo no florece.
 *     Es la medida más barata y de mayor impacto que existe.
 *
 * Todo determinista (`rng` con semilla): la misma finca en cada carga. Cero
 * three, cero react → puro dato, testeable headless.
 */
import { SINDROMES, CULTIVOS, tierDe, rng } from './polinizadoresIdentidad.js';

/* El tamaño del diorama (metros-escena). La cámara vive alrededor de esto. */
export const FINCA = { radio: 7.2, frente: 3.4, fondo: -5.2 };

/*
 * LAS ZONAS. Cada una declara qué siembra, dónde y con qué síndrome. `cultivo`
 * amarra la flor a la mata que cobra el servicio: sin ese amarre, una visita
 * sería un adorno; con él, es COSECHA.
 *
 *   peso → cuánta de la flor total del mundo va a esta zona
 */
export const ZONAS = [
  {
    id: 'monte',
    nombre: 'El rincón de monte',
    centro: [-1.6, 0, -4.6],
    ancho: 7.4,
    hondo: 2.2,
    cultivo: null, // no se cosecha: se cosecha DESPUÉS, en todo lo demás
    siembra: [
      { sindrome: 'tubular_rojo', planta: 'fucsia-monte', peso: 0.34 },
      { sindrome: 'nocturna_pale', planta: 'guamo', peso: 0.3 },
      { sindrome: 'robusta_olor', planta: 'flor-monte', peso: 0.2 },
      { sindrome: 'plana_racimo', planta: 'margarita-monte', peso: 0.16 },
    ],
    peso: 0.3,
    anidan: true, // de acá SALEN los silvestres (y acá se refugian)
  },
  {
    id: 'huerta',
    nombre: 'La huerta',
    centro: [-1.5, 0, 1.9],
    ancho: 2.6,
    hondo: 1.5,
    cultivo: null,
    siembra: [
      { sindrome: 'guia_uv', planta: 'huerta-morada', peso: 0.6 },
      { sindrome: 'plana_racimo', planta: 'margarita-huerta', peso: 0.4 },
    ],
    peso: 0.16,
  },
  {
    id: 'maracuya',
    nombre: 'El maracuyá',
    centro: [1.1, 0, -0.5],
    ancho: 1.9,
    hondo: 0.5,
    cultivo: 'maracuya',
    siembra: [{ sindrome: 'pasiflora', planta: 'maracuya', peso: 1 }],
    peso: 0.13,
    altura: 1.36, // van colgadas de la guía del emparrado
  },
  {
    id: 'ahuyama',
    nombre: 'La ahuyama',
    centro: [3.4, 0, 1.7],
    ancho: 2.2,
    hondo: 1.4,
    cultivo: 'ahuyama',
    // La mitad macho y la mitad hembra: el cruce entre las dos ES el cultivo.
    siembra: [
      { sindrome: 'cartel_amarillo', planta: 'ahuyama', geom: 'cartel_amarillo', peso: 0.55, sexo: 'macho' },
      { sindrome: 'cartel_amarillo', planta: 'ahuyama', geom: 'cartel_hembra', peso: 0.45, sexo: 'hembra' },
    ],
    peso: 0.14,
  },
  {
    id: 'cafe',
    nombre: 'El cafetal',
    centro: [-4.3, 0, -1.7],
    ancho: 2.2,
    hondo: 2.4,
    cultivo: 'cafe',
    siembra: [{ sindrome: 'guia_uv', planta: 'cafe', peso: 1 }],
    peso: 0.1,
    altura: 0.62, // a la altura de las ramas del arbusto
  },
  {
    id: 'borde',
    nombre: 'La cerca viva florida',
    centro: [0, 0, 2.9],
    ancho: 9.6,
    hondo: 0.7,
    cultivo: null,
    siembra: [{ sindrome: 'melifera_borde', planta: 'calendula', peso: 1 }],
    peso: 0.17,
    corredor: true, // el camino por el que los bichos entran al cultivo
  },
  /*
   * EL MAIZAL NO SIEMBRA NI UNA FLOR. No es un olvido: es la tesis por
   * ausencia. Está en el plano para que se vea que existe y que produce — y
   * para que se note que ningún hilo lo toca nunca.
   */
  {
    id: 'maizal',
    nombre: 'El maizal',
    centro: [4.2, 0, -2.9],
    ancho: 2.8,
    hondo: 2.3,
    cultivo: 'maiz',
    siembra: [],
    peso: 0,
    viento: true,
  },
];

export const ZONA_POR_ID = Object.fromEntries(ZONAS.map((z) => [z.id, z]));

/*
 * SIEMBRA LAS FLORES del mundo entero. Devuelve un arreglo plano donde cada flor
 * sabe quién es, dónde está, de qué mata cobra y si está abierta a esta hora.
 *
 * OJO con `planta` — no es lo mismo que `sindrome`, y la diferencia es la verdad
 * del mundo: el café y la flor morada de la huerta comparten síndrome (las dos
 * llaman a la abeja con morado y guías de néctar), pero son plantas DISTINTAS.
 * El polen de una en la otra no hace absolutamente nada. Solo cuenta el polen que
 * viaja entre flores de la MISMA planta, y por eso el telar teje por `planta`, no
 * por `sindrome`. Sin esta distinción la red sería un adorno bonito y mentiroso.
 *
 * @param {'alto'|'medio'|'bajo'} tier
 * @param {number} [seed]
 * @returns {Array<{i:number, geom:string, sindrome:string, planta:string,
 *   zona:string, cultivo:string|null, sexo:string|null,
 *   pos:[number,number,number], rotY:number, escala:number}>}
 */
export function sembrarFlores(tier, seed = 909) {
  const r = rng(seed);
  const total = tierDe(tier).flores;
  const flores = [];
  let i = 0;

  for (const z of ZONAS) {
    if (!z.siembra.length || z.peso <= 0) continue;
    const nZona = Math.max(1, Math.round(total * z.peso));
    for (const s of z.siembra) {
      const n = Math.max(1, Math.round(nZona * s.peso));
      for (let k = 0; k < n; k++) {
        const dx = (r() - 0.5) * z.ancho;
        const dz = (r() - 0.5) * z.hondo;
        // La altura: unas flores viven arriba (el emparrado, el árbol del monte)
        // y otras a ras. Cada síndrome tiene su estrato — y eso también es
        // biología: distintas alturas de flor = distintos polinizadores.
        const S = SINDROMES[s.sindrome];
        let y = z.altura ?? 0;
        if (!z.altura && S) {
          if (S.altura === 'alta') y = 1.5 + r() * 0.9; // en el árbol
          else if (S.altura === 'media') y = 0.25 + r() * 0.3;
        }
        flores.push({
          i: i++,
          geom: s.geom || s.sindrome,
          sindrome: s.sindrome,
          planta: s.planta, // la ESPECIE: el polen solo cuenta entre iguales
          zona: z.id,
          cultivo: z.cultivo,
          sexo: s.sexo || null,
          pos: [z.centro[0] + dx, y, z.centro[2] + dz],
          rotY: r() * Math.PI * 2,
          escala: 0.85 + r() * 0.35,
        });
      }
    }
  }
  return flores;
}

/** Agrupa las flores por clave de geometría (una draw-call por grupo). */
export function agruparPorGeom(flores) {
  const g = {};
  for (const f of flores) {
    (g[f.geom] ||= []).push(f);
  }
  return g;
}

/*
 * LAS MATAS: dónde va cada planta. El maizal va en BLOQUE cerrado (así se
 * siembra el maíz de verdad: en bloque, para que el viento reparta el polen
 * entre vecinas — su "polinizador" es la geometría de la siembra).
 */
export function sembrarMatas(tier, seed = 707) {
  const r = rng(seed);
  const bajo = tier === 'bajo';
  const matas = { maracuya: [], ahuyama: [], cafe: [], maiz: [] };

  // El emparrado del maracuyá: uno solo, protagonista.
  matas.maracuya.push({ pos: [1.1, 0, -0.5], rotY: 0, escala: 1 });

  // Las guías de ahuyama, rastreras.
  const nAh = bajo ? 2 : 3;
  for (let k = 0; k < nAh; k++) {
    matas.ahuyama.push({
      pos: [3.4 + (r() - 0.5) * 1.6, 0, 1.7 + (r() - 0.5) * 1],
      rotY: r() * Math.PI,
      escala: 0.9 + r() * 0.25,
    });
  }

  // El cafetal.
  const nCafe = bajo ? 3 : 6;
  for (let k = 0; k < nCafe; k++) {
    const fila = Math.floor(k / 2);
    matas.cafe.push({
      pos: [-4.6 + (k % 2) * 0.85 + (r() - 0.5) * 0.2, 0, -2.5 + fila * 0.85 + (r() - 0.5) * 0.2],
      rotY: r() * Math.PI * 2,
      escala: 0.9 + r() * 0.25,
    });
  }

  // EL MAIZAL en bloque: filas y surcos. La forma de la siembra es la técnica.
  const filas = bajo ? 3 : 4;
  const porFila = bajo ? 3 : 5;
  for (let f = 0; f < filas; f++) {
    for (let k = 0; k < porFila; k++) {
      matas.maiz.push({
        pos: [3.1 + k * 0.55 + (r() - 0.5) * 0.1, 0, -3.7 + f * 0.5 + (r() - 0.5) * 0.1],
        rotY: r() * Math.PI * 2,
        escala: 0.9 + r() * 0.2,
      });
    }
  }
  return matas;
}

/*
 * DÓNDE CUELGAN LOS FRUTOS de cada mata. Se siembran los SITIOS; el cuaje decide
 * cuáles se hinchan y cuáles se quedan en nada. La cosecha no se dibuja: se gana.
 */
export function sitiosDeFruto(tier, seed = 505) {
  const r = rng(seed);
  const bajo = tier === 'bajo';
  const sitios = { maracuya: [], ahuyama: [], cafe: [] };

  const nMar = bajo ? 3 : 7;
  for (let k = 0; k < nMar; k++) {
    sitios.maracuya.push({ pos: [1.1 + (r() - 0.5) * 1.5, 1.0 - r() * 0.35, -0.5 + (r() - 0.5) * 0.35] });
  }
  const nAh = bajo ? 2 : 4;
  for (let k = 0; k < nAh; k++) {
    sitios.ahuyama.push({ pos: [3.4 + (r() - 0.5) * 1.8, 0.14, 1.7 + (r() - 0.5) * 1.1] });
  }
  const nCafe = bajo ? 10 : 26;
  for (let k = 0; k < nCafe; k++) {
    const fila = Math.floor((k % 12) / 2);
    sitios.cafe.push({
      pos: [-4.6 + (k % 2) * 0.85 + (r() - 0.5) * 0.5, 0.35 + r() * 0.45, -2.5 + fila * 0.85 + (r() - 0.5) * 0.4],
    });
  }
  return sitios;
}

/*
 * EL MELIPONARIO: las cajas sobre su banco, a media sombra, y el platón de agua.
 * Va a la izquierda, cerca de la huerta: las angelitas no vuelan lejos, y entre
 * más cerca esté la caja del cultivo, más rinde. Eso también es plano de finca.
 */
export function sitioMeliponario(tier) {
  const n = tierDe(tier).cajas;
  const cajas = [];
  for (let k = 0; k < n; k++) {
    cajas.push({ pos: [-3.5 + k * 0.5, 0, 2.15], rotY: -0.25 + k * 0.12 });
  }
  return {
    cajas,
    banco: { pos: [-3.5 + (n - 1) * 0.25, 0, 2.15], largo: 0.7 + n * 0.5 },
    agua: { pos: [-2.5, 0, 2.75] },
    // El árbol que le da la sombra parcial (ni sol pleno ni rincón húmedo).
    sombrio: { pos: [-4.6, 0, 2.5] },
  };
}

/** Las flores donde un bicho puede trabajar ahora: su síndrome y la hora. */
export function floresParaBicho(flores, bichoId, momento, POL) {
  const visita = POL[bichoId]?.visita || [];
  return flores.filter(
    (f) =>
      visita.includes(f.sindrome) &&
      (momento === 'noche' ? SINDROMES[f.sindrome]?.abre === 'noche' : SINDROMES[f.sindrome]?.abre !== 'noche'),
  );
}

/** El cultivo de una zona (para amarrar la visita a la cosecha). */
export const cultivoDeZona = (zonaId) => ZONA_POR_ID[zonaId]?.cultivo || null;

/** ¿Este cultivo existe en el plano y qué dice de sí mismo? */
export const cultivoInfo = (id) => CULTIVOS[id] || null;
