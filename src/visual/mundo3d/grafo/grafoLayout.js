/**
 * grafoLayout.js — dónde se para cada nodo. La montaña, no la nube de puntos.
 *
 * LA IDEA QUE ORDENA TODO: EL EJE Y ES EL DATO
 * ────────────────────────────────────────────
 * Un grafo de conocimiento se dibuja casi siempre como una nube donde la
 * posición no significa NADA — el clásico plato de espagueti: bonito de lejos,
 * inútil de cerca, y para un campesino, insultante. Aquí la altura de un nodo
 * en la pantalla ES SU ALTURA SOBRE EL MAR. El piso térmico (Caldas, 1808) ya
 * ordena el mundo andino por temperatura; solo hay que obedecerlo.
 *
 * Consecuencia: el mapa no es una constelación abstracta, es una CORDILLERA.
 * Abajo el cálido (yuca, plátano), en la mitad el frío —papa, ulluco, oca: el
 * corazón de la chagra—, arriba el páramo y la nieve donde ya no se siembra.
 * Nadie tiene que explicar la leyenda: usted ya vivió en esa montaña.
 *
 * Y ADEMÁS LA MONTAÑA SE DIBUJA SOLA
 * ──────────────────────────────────
 * El radio de cada banda crece con cuánta vida hay en ella (√población). Como
 * el frío tiene 39 especies y el nival ninguna, la silueta que sale es ancha en
 * la mitad y puntuda arriba: un cerro. No lo dibujamos — lo dibuja el dato.
 * Si mañana el grafo aprende 30 especies de tierra caliente, la montaña
 * engorda abajo sola.
 *
 * FÍSICA: UNA VEZ, NUNCA POR CUADRO
 * ─────────────────────────────────
 * El acomodado (repulsión + resortes) corre en el montaje y se congela en un
 * arreglo de posiciones. No hay simulación viva. Por eso "sin física" en gama
 * baja es literal (0 iteraciones → espiral pura y determinista) y en gama alta
 * el costo se paga una sola vez, no 60 veces por segundo con el teléfono en la
 * mano. Determinista además: misma semilla, mismo mapa siempre — el campesino
 * vuelve mañana y su chagra está donde la dejó.
 *
 * Puro y sin three: solo aritmética.
 */

import { rngArtesania } from '../artesaniaAndina.js';
import { PISOS_ORDEN } from './grafoPaleta.js';

/** Ángulo áureo: reparte puntos en espiral sin que se alineen nunca. Es el
 *  mismo truco de la piña y del girasol — y aquí también es fitotecnia. */
const ANGULO_AUREO = Math.PI * (3 - Math.sqrt(5));

const ALTO_BANDA = 2.5; // separación vertical entre pisos, en unidades de mundo
const RADIO_BASE = 1.6; // radio mínimo de una banda (aunque esté casi vacía)
const RADIO_POR_HABITANTE = 0.72; // cuánto ensancha la banda cada mata (√)

/* La niebla del pie: dónde van las matas SIN altura declarada. No es un séptimo
   piso — es la ausencia de piso, y por eso se para APARTE y abajo del cálido,
   separada por un vacío franco. Mentir una altura sería fabricar dato; dejarla
   flotando en la niebla dice la verdad: "esto se siembra, pero el grafo todavía
   no sabe a qué altura". El hueco del conocimiento también es conocimiento. */
const Y_NIEBLA = -2.6;

/** Iteraciones de acomodado por tier. Ver cabecera: se pagan UNA vez. */
const ITERACIONES = { alto: 90, medio: 40, bajo: 0 };

/**
 * Calcula el mapa completo.
 *
 * @param {object} grafo salida de `construirGrafo`
 * @param {{ tier?: 'alto'|'medio'|'bajo', semilla?: number }} [opts]
 * @returns {{
 *   posiciones: Map<string, [number, number, number]>,
 *   bandas: Array<object>,
 *   alto: number, radioMax: number
 * }}
 */
export function calcularLayout(grafo, { tier = 'alto', semilla = 1808 } = {}) {
  const posiciones = new Map();
  const bandas = [];
  if (!grafo || !grafo.nodos.length) return { posiciones, bandas, alto: 1, radioMax: 1 };

  const rnd = rngArtesania(semilla); // 1808: el año de la Memoria de Caldas
  const pisosPorId = new Map(grafo.pisos.map((p) => [p.id, p]));

  // ── 1. Las bandas: una por piso declarado, de abajo hacia arriba ─────────
  /* Se recorre PISOS_ORDEN (no el orden del JSON) para que el cálido quede
     abajo pase lo que pase. Las bandas vacías (superpáramo, nival) se dibujan
     igual: que no crezca nada a 4.700 m no es un hueco del dato, es el dato.
     Un mapa que las escondiera estaría borrando la mitad de la lección. */
  const especiesPorPiso = new Map();
  for (const id of [...PISOS_ORDEN, 'sin_piso']) especiesPorPiso.set(id, []);
  for (const n of grafo.nodos) {
    if (n.tipo !== 'especie') continue;
    const lista = especiesPorPiso.get(n.piso) || especiesPorPiso.get('sin_piso');
    lista.push(n);
  }

  PISOS_ORDEN.forEach((pisoId, i) => {
    const info = pisosPorId.get(pisoId);
    const habitantes = especiesPorPiso.get(pisoId) || [];
    const radio = RADIO_BASE + Math.sqrt(habitantes.length) * RADIO_POR_HABITANTE;
    bandas.push({
      id: pisoId,
      y: i * ALTO_BANDA,
      radio,
      poblacion: habitantes.length,
      nombre: info?.nombre || pisoId,
      altitud: info?.altitud || null,
      temperatura: info?.temperatura || null,
      vegetacion: info?.vegetacion || '',
      cultivable: info?.cultivable !== false,
      notas: info?.notas || '',
      niebla: false,
    });
  });

  const sinPiso = especiesPorPiso.get('sin_piso') || [];
  if (sinPiso.length) {
    bandas.push({
      id: 'sin_piso',
      y: Y_NIEBLA,
      radio: RADIO_BASE + Math.sqrt(sinPiso.length) * RADIO_POR_HABITANTE,
      poblacion: sinPiso.length,
      nombre: 'Sin altura declarada',
      altitud: null,
      temperatura: null,
      vegetacion: '',
      cultivable: true,
      notas: 'El grafo describe estas matas pero todavía no dice a qué piso térmico pertenecen.',
      niebla: true,
    });
  }

  const bandaPorId = new Map(bandas.map((b) => [b.id, b]));

  // ── 2. Las matas: espiral áurea dentro de su banda ───────────────────────
  /* La espiral reparte parejo sin rejilla (una rejilla se vería a máquina) y es
     determinista. El jitter mínimo le quita la perfección de software: esto es
     rubber-hose, la mano tiembla un poquito. */
  for (const [pisoId, habitantes] of especiesPorPiso.entries()) {
    const banda = bandaPorId.get(pisoId);
    if (!banda || !habitantes.length) continue;

    /* La más conectada primero → queda cerca del eje. El centro de cada piso lo
       ocupa lo que más se relaciona: la papa manda en el frío, y se nota. */
    const orden = [...habitantes].sort((a, b) => (b.grado - a.grado) || a.id.localeCompare(b.id));

    orden.forEach((n, i) => {
      const t = habitantes.length === 1 ? 0 : Math.sqrt(i / habitantes.length);
      const r = t * banda.radio;
      const ang = i * ANGULO_AUREO + (rnd() - 0.5) * 0.12;
      posiciones.set(n.id, [
        Math.cos(ang) * r + (rnd() - 0.5) * 0.1,
        banda.y + (rnd() - 0.5) * 0.34, // grosor de la banda: no es una lámina
        Math.sin(ang) * r + (rnd() - 0.5) * 0.1,
      ]);
    });
  }

  // ── 3. Los que no tienen altura propia: viven donde vive lo que tocan ────
  /* Una plaga no vive a 2.400 m: vive donde vive su hospedero. Un biopreparado
     tampoco. Así que su altura es el PROMEDIO de las matas que tocan, y su
     lugar es afuera del cerro, en órbita — para que las matas se queden con el
     centro, que es el sujeto del mapa, y el anillo exterior no le tape nada.
     Emergente y honesto: si una plaga ataca papa y mora, se posa entre las dos. */
  const noMatas = grafo.nodos.filter((n) => n.tipo !== 'especie');
  const pendientes = [];

  for (const n of noMatas) {
    const vecinos = [...(grafo.vecinos.get(n.id) || [])];
    const anclas = vecinos.map((v) => posiciones.get(v)).filter(Boolean);
    if (!anclas.length) {
      /* Toca solo a otros sin-ancla (aliado → plaga → sin matas visibles tras el
         recorte). Se resuelve en la segunda pasada. */
      pendientes.push(n);
      continue;
    }
    posiciones.set(n.id, orbita(anclas, n, rnd));
  }

  // Segunda pasada: ahora sus vecinos ya se pararon en algún lado.
  for (const n of pendientes) {
    const vecinos = [...(grafo.vecinos.get(n.id) || [])];
    const anclas = vecinos.map((v) => posiciones.get(v)).filter(Boolean);
    posiciones.set(n.id, anclas.length ? orbita(anclas, n, rnd) : [
      Math.cos(rnd() * Math.PI * 2) * 9,
      ALTO_BANDA * 2,
      Math.sin(rnd() * Math.PI * 2) * 9,
    ]);
  }

  // ── 4. Acomodado: que nada se monte encima de nada ───────────────────────
  const iters = ITERACIONES[tier] ?? ITERACIONES.medio;
  if (iters > 0) acomodar(grafo, posiciones, bandaPorId, iters);

  // ── 5. Medidas del mapa (para encuadrar la cámara y el suelo) ────────────
  let radioMax = 1;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const [x, y, z] of posiciones.values()) {
    radioMax = Math.max(radioMax, Math.hypot(x, z));
    yMin = Math.min(yMin, y);
    yMax = Math.max(yMax, y);
  }

  return { posiciones, bandas, alto: yMax - yMin, radioMax, yMin, yMax };
}

/**
 * Coloca un nodo sin altura propia: a la altura promedio de lo que toca, y
 * empujado hacia afuera del eje en la dirección en que están sus vecinos.
 */
function orbita(anclas, nodo, rnd) {
  let sx = 0; let sy = 0; let sz = 0;
  for (const [x, y, z] of anclas) { sx += x; sy += y; sz += z; }
  const n = anclas.length;
  const cx = sx / n; const cy = sy / n; const cz = sz / n;

  const dist = Math.hypot(cx, cz) || 0.0001;
  /* Cuánto se aparta del cerro. El aliado se va más lejos que la plaga, y la
     plaga más lejos que el remedio: así las cadenas aliado → plaga → mata
     apuntan todas hacia adentro, como radios de una rueda, y se leen sin
     cruzarse entre ellas. */
  const empuje = nodo.tipo === 'controlador' ? 4.4 : nodo.tipo === 'plaga' ? 2.6 : 1.9;
  const ux = cx / dist; const uz = cz / dist;
  const ang = rnd() * Math.PI * 2;

  return [
    cx + ux * empuje + Math.cos(ang) * 0.5,
    cy + (rnd() - 0.5) * 0.7,
    cz + uz * empuje + Math.sin(ang) * 0.5,
  ];
}

/**
 * Repulsión dentro de la banda + resortes en las aristas. Corre N veces y se
 * congela. Las matas NO pueden abandonar su altura (eso es dato, no estética):
 * solo se acomodan en el plano de su piso. Los demás sí flotan un poco.
 *
 * TODO ESTO CORRE SOBRE ARREGLOS PLANOS, NO SOBRE MAPS
 * ────────────────────────────────────────────────────
 * La versión legible de este bucle (Maps con id de string, un `[x,y,z]` por
 * nodo) tardaba 1,3 SEGUNDOS con el grafo completo — en un teléfono de gama
 * baja eso es el aparato congelado varios segundos al abrir la vista, o sea
 * justo lo que esta pieza prometió no hacer. Cambiar las claves de string por
 * índices enteros y los objetos por `Float64Array` lo bajó ~20×. El bucle
 * caliente se ve más feo a propósito; el borde del módulo sigue siendo limpio
 * (entra un Map, sale un Map) y la fealdad no se escapa de esta función.
 */
function acomodar(grafo, posiciones, bandaPorId, iters) {
  const ids = [...posiciones.keys()];
  const n = ids.length;
  const indice = new Map(ids.map((id, i) => [id, i]));

  // Posiciones y fuerzas planas: [x0,y0,z0, x1,y1,z1, ...]
  const pos = new Float64Array(n * 3);
  const fz = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) {
    const p = posiciones.get(ids[i]);
    pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2];
  }

  /* Ley de cada nodo, precocinada: si es mata, su altura y su orilla son
     obligatorias; si no, flota libre. -1 = sin banda (flota). */
  const esMata = new Uint8Array(n);
  const bandaY = new Float64Array(n);
  const bandaR = new Float64Array(n);

  /* Se agrupa por banda y se repele SOLO dentro del grupo. Además de ser
     O(Σ b²) en vez de O(n²) —barato de verdad en un teléfono—, es lo correcto:
     dos matas de pisos distintos jamás se estorban en pantalla, ya las separa
     la altura. */
  const grupos = new Map();
  for (let i = 0; i < n; i++) {
    const nodo = grafo.porId.get(ids[i]);
    const clave = nodo?.tipo === 'especie' ? `piso:${nodo.piso}` : `tipo:${nodo?.tipo}`;
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(i);
    if (nodo?.tipo === 'especie') {
      const banda = bandaPorId.get(nodo.piso);
      if (banda) { esMata[i] = 1; bandaY[i] = banda.y; bandaR[i] = banda.radio * 1.12; }
    }
  }
  const gruposArr = [...grupos.values()].map((g) => Int32Array.from(g));

  // Aristas como pares de índices + su largo de reposo.
  const m = grafo.aristas.length;
  const arA = new Int32Array(m);
  const arB = new Int32Array(m);
  const arLargo = new Float64Array(m);
  let mm = 0;
  for (const ar of grafo.aristas) {
    const a = indice.get(ar.de); const b = indice.get(ar.a);
    if (a === undefined || b === undefined) continue;
    arA[mm] = a; arB[mm] = b;
    arLargo[mm] = ar.tipo === 'compatible' ? 1.5 : 2.4;
    mm++;
  }

  const MIN = 0.62; // distancia mínima cómoda entre centros
  const MIN2 = MIN * MIN;

  for (let it = 0; it < iters; it++) {
    const enfria = 1 - it / iters; // recocido: empieza suelto, termina firme
    fz.fill(0);

    // Repulsión intra-grupo
    for (let g = 0; g < gruposArr.length; g++) {
      const grupo = gruposArr[g];
      for (let i = 0; i < grupo.length; i++) {
        const ia = grupo[i] * 3;
        for (let j = i + 1; j < grupo.length; j++) {
          const ib = grupo[j] * 3;
          let dx = pos[ia] - pos[ib];
          let dy = pos[ia + 1] - pos[ib + 1];
          let dz = pos[ia + 2] - pos[ib + 2];
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 > MIN2 || d2 === 0) continue;
          const d = Math.sqrt(d2);
          const emp = ((MIN - d) / MIN) * 0.5 * enfria;
          dx = (dx / d) * emp; dy = (dy / d) * emp; dz = (dz / d) * emp;
          fz[ia] += dx; fz[ia + 1] += dy; fz[ia + 2] += dz;
          fz[ib] -= dx; fz[ib + 1] -= dy; fz[ib + 2] -= dz;
        }
      }
    }

    // Resortes: lo que se relaciona se junta (pero no se abraza)
    for (let e = 0; e < mm; e++) {
      const ia = arA[e] * 3; const ib = arB[e] * 3;
      const dx = pos[ib] - pos[ia];
      const dy = pos[ib + 1] - pos[ia + 1];
      const dz = pos[ib + 2] - pos[ia + 2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.0001;
      const largo = arLargo[e];
      if (d < largo) continue;
      const k = Math.min((d - largo) * 0.04, 0.3) * enfria / d;
      fz[ia] += dx * k; fz[ia + 1] += dy * k; fz[ia + 2] += dz * k;
      fz[ib] -= dx * k; fz[ib + 1] -= dy * k; fz[ib + 2] -= dz * k;
    }

    // Aplicar, respetando la ley: la altura de una mata es sagrada
    for (let i = 0; i < n; i++) {
      const i3 = i * 3;
      pos[i3] += fz[i3];
      pos[i3 + 2] += fz[i3 + 2];

      if (esMata[i]) {
        // Se le permite respirar dentro del grosor de su piso, nada más.
        let dy = pos[i3 + 1] + fz[i3 + 1] - bandaY[i];
        if (dy > 0.34) dy = 0.34; else if (dy < -0.34) dy = -0.34;
        pos[i3 + 1] = bandaY[i] + dy;
        // Y tampoco se sale del borde de su banda: el piso tiene orilla.
        const r = Math.hypot(pos[i3], pos[i3 + 2]);
        if (r > bandaR[i]) {
          const k = bandaR[i] / r;
          pos[i3] *= k; pos[i3 + 2] *= k;
        }
      } else {
        pos[i3 + 1] += fz[i3 + 1];
      }
    }
  }

  // Devolver al Map que espera el resto del módulo.
  for (let i = 0; i < n; i++) {
    const p = posiciones.get(ids[i]);
    p[0] = pos[i * 3]; p[1] = pos[i * 3 + 1]; p[2] = pos[i * 3 + 2];
  }
}
