/*
 * etapasSucesion — LA SIEMBRA: quién nace dónde, y cuándo.
 *
 * El tiempo puro vive en `tiempoSucesion.js` (sin una sola dependencia, para que
 * la gama baja no tenga que bajarse three para leer "Año 5"). Aquí va lo que sí
 * necesita conocer la forma de la ladera: dónde se para cada mata y qué año le
 * toca nacer. La idea que sostiene todo:
 *
 *   CADA MATA LLEVA SU PROPIO AÑO DE NACIMIENTO Y SU PROPIA CURVA.
 *
 * Una sola variable (`anio`) atraviesa la ladera entera. No hay cinco escenas que
 * se intercambian: hay un continuo. El campesino arrastra el dedo y VE su ladera
 * crecer, mata por mata, sin un solo salto.
 *
 * De ahí salen tres cosas que valen más que cualquier explicación:
 *
 *   1. LA SEMILLA MANDA. El año en que nace un encenillo, un gaque, un roble o
 *      una queñua depende de qué tan LEJOS esté del árbol que sobrevivió. El
 *      bosque no aparece: se derrama desde la madre. A los 50 años los árboles
 *      grandes están cerca de ella y los chiquitos lejos, sin que nadie lo dibuje.
 *   2. LA CAUSA SE VE. Las barreras vivas crecen (año 0-3), las raíces agarran
 *      (2-11) y las cárcavas se cierran (2.5-14). Nadie tiene que decir por qué
 *      se frenó la erosión: pasa en pantalla, en ese orden.
 *   3. NADIE SE MUERE. El pasto del potrero no desaparece: lo TAPA la sombra
 *      (por eso decae junto con el dosel). Las plántulas del año 1 no se pierden:
 *      se hicieron monte. Y a los 20 el bosque vuelve a sembrar plántulas SOLO.
 *
 * Puro dato: cero WebGL, cero React. Testeable y headless.
 */
import { LADERA, ARBOL_SEMILLA, alturaLadera, enCanal } from './sucesion.geom.js';
import { rng } from '../bosque/entQuenua.geom.js';

/* -------------------------------------------------------------------------- */
/*  Presupuesto por tier                                                       */
/* -------------------------------------------------------------------------- */

/*
 * Cuántas matas de cada cosa (una draw-call por especie, pase lo que pase).
 * 'alto' es la ladera plena; 'medio' es frugal; 'bajo' deja lo MÍNIMO para que
 * aún se lea la historia entera: la cárcava, la barrera, el árbol semilla, las
 * pioneras y el bosque. La historia no se degrada — se degrada la densidad.
 */
export const SUC_TIER = {
  alto: {
    carcava: 7, barreraFilas: 3, barreraPaso: 0.9,
    pasto: 90, helecho: 24, plantula: 26, hojarasca: 18, musgo: 18, roca: 10,
    mortino: 12, romerillo: 16,
    aliso: 8, yarumo: 7, encenillo: 10, gaque: 6, roble: 7, quenua: 3,
    epifita: 14, ave: 4, niebla: 4,
  },
  medio: {
    carcava: 5, barreraFilas: 2, barreraPaso: 1.25,
    pasto: 46, helecho: 12, plantula: 13, hojarasca: 9, musgo: 9, roca: 6,
    mortino: 7, romerillo: 9,
    aliso: 5, yarumo: 4, encenillo: 6, gaque: 3, roble: 4, quenua: 2,
    epifita: 7, ave: 3, niebla: 0,
  },
  bajo: {
    carcava: 3, barreraFilas: 1, barreraPaso: 1.9,
    pasto: 18, helecho: 5, plantula: 5, hojarasca: 4, musgo: 4, roca: 3,
    mortino: 3, romerillo: 4,
    aliso: 3, yarumo: 2, encenillo: 3, gaque: 2, roble: 2, quenua: 1,
    epifita: 0, ave: 0, niebla: 0,
  },
};

/** Los conteos de un tier (desconocido → frugal, nunca el más caro). */
export const sucDeTier = (tier) => SUC_TIER[tier] || SUC_TIER.medio;

/** Factor de detalle geométrico por tier (igual que en floraParamo). */
export const CALIDAD_SUC = { alto: 1, medio: 0.62, bajo: 0.42 };
export const calidadSuc = (tier) => CALIDAD_SUC[tier] ?? CALIDAD_SUC.medio;

/* -------------------------------------------------------------------------- */
/*  Siembra: dónde se para cada cosa                                           */
/* -------------------------------------------------------------------------- */

/** Distancia (en el plano) al árbol que sobrevivió: de aquí sale el bosque. */
export function distanciaALaSemilla(x, z) {
  const dx = x - ARBOL_SEMILLA.x;
  const dz = z - ARBOL_SEMILLA.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function tinte(r, amt) {
  const f = 1 + (r() - 0.5) * amt;
  const h = (r() - 0.5) * amt * 0.4;
  const cl = (v) => Math.max(0.7, Math.min(1.16, v));
  return [cl(f + h), cl(f), cl(f - h * 0.6)];
}

/*
 * Riega `n` matas por la ladera y las PARA sobre el terreno (`alturaLadera`), sin
 * meterlas en el cauce ni encima del árbol semilla. `tiempo(d, r)` decide el año
 * de nacimiento de cada una, y recibe la distancia a la madre: por eso el bosque
 * puede derramarse desde ella en vez de brotar parejo como un cultivo.
 */
function sembrar(n, seed, opts = {}) {
  const r = rng(seed);
  const arr = [];
  const xMin = opts.xMin ?? LADERA.xMin + 3;
  const xMax = opts.xMax ?? LADERA.xMax - 3;
  const zMin = opts.zMin ?? LADERA.zMin + 2;
  const zMax = opts.zMax ?? LADERA.zMax - 4;
  const eMin = opts.eMin ?? 0.85;
  const eMax = opts.eMax ?? 1.2;
  let intentos = 0;

  while (arr.length < n && intentos < n * 60 + 200) {
    intentos++;
    const x = xMin + r() * (xMax - xMin);
    const z = zMin + r() * (zMax - zMin);
    if (enCanal(x, opts.margenCanal ?? 1.2)) continue; // el cauce no se siembra
    const d = distanciaALaSemilla(x, z);
    if (d < (opts.despejeSemilla ?? 0)) continue; // ni debajo de la madre

    const t = opts.tiempo(d, r);
    arr.push({
      pos: [x, alturaLadera(x, z), z],
      rotY: r() * Math.PI * 2,
      escala: eMin + r() * (eMax - eMin),
      tint: tinte(r, opts.varia ?? 0.12),
      nace: t.nace,
      madura: t.madura,
      exp: t.exp ?? 1,
      decae: t.decae ?? null,
    });
  }
  return arr;
}

/* -------------------------------------------------------------------------- */
/*  Las barreras vivas: en CURVA DE NIVEL de verdad                            */
/* -------------------------------------------------------------------------- */

/*
 * Una barrera viva mal puesta no sirve: tiene que ir atravesada a la pendiente,
 * por la curva de nivel. Así que no la dibujamos derecha — la RESOLVEMOS: para
 * cada x buscamos la z donde el terreno tiene exactamente la cota pedida
 * (bisección; la altura baja monótona con z, así que siempre hay una y una sola).
 *
 * El regalo sale gratis: al llegar a la vaguada, la curva de nivel se dobla
 * ladera arriba, igual que en el campo. Y ahí la hilera se ABRE — porque a
 * ninguna barrera se le atraviesa el cauce: por ahí es por donde el agua tiene
 * que salir.
 */
function zDeCota(x, cota) {
  let z0 = LADERA.zMin;
  let z1 = LADERA.zMax;
  for (let i = 0; i < 26; i++) {
    const zm = (z0 + z1) / 2;
    if (alturaLadera(x, zm) > cota) z0 = zm;
    else z1 = zm;
  }
  return (z0 + z1) / 2;
}

function sembrarBarreras(conteos, seed = 909) {
  const r = rng(seed);
  const arr = [];
  const filas = conteos.barreraFilas;
  const paso = conteos.barreraPaso;
  // Las cotas se toman de la ladera misma, lejos del canal (referencia limpia).
  const anclas = [-1.5, -6.5, -11.5].slice(0, filas);

  for (let f = 0; f < anclas.length; f++) {
    const cota = alturaLadera(9, anclas[f]);
    for (let x = LADERA.xMin + 4; x <= LADERA.xMax - 4; x += paso) {
      if (enCanal(x, 1.35)) continue; // el paso del agua queda libre
      const z = zDeCota(x, cota);
      if (z < LADERA.zMin + 1 || z > LADERA.zMax - 3) continue;
      arr.push({
        pos: [x, alturaLadera(x, z), z],
        // Encarada a la pendiente: la hilera mira ladera abajo.
        rotY: (r() - 0.5) * 0.25,
        escala: 0.9 + r() * 0.28,
        tint: tinte(r, 0.14),
        nace: 0.3 + r() * 0.5 + f * 0.25, // se siembra de abajo hacia arriba
        madura: 3.4 + r() * 0.8,
        exp: 0.55,
        decae: null,
      });
    }
  }
  return arr;
}

/* -------------------------------------------------------------------------- */
/*  Poblar la ladera entera                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Todas las instancias de la ladera, por especie. Determinista: la misma ladera
 * en cada carga (nadie quiere que su lote cambie de forma al recargar).
 */
export function poblarLadera(conteos, seed = 808) {
  const c = conteos;

  /* --- Las cárcavas: la herida. Van ladera abajo y se cierran solas. --- */
  const carcava = sembrar(c.carcava, seed + 1, {
    xMin: LADERA.xMin + 5, xMax: LADERA.xMax - 5,
    zMin: LADERA.zMin + 3, zMax: 4,
    eMin: 0.85, eMax: 1.5, varia: 0.1, margenCanal: 1.9,
    tiempo: (_d, r) => ({
      nace: -1, madura: 0, exp: 1,
      // Se cierra cuando las barreras frenan el agua y las raíces amarran.
      decae: [2.5 + r() * 1.2, 12 + r() * 3.5],
    }),
  });
  // Las cárcavas NO se rotan: el agua busca la pendiente, no dobla por gusto.
  for (const it of carcava) it.rotY = 0;

  /* --- Las raíces: nacen JUSTO donde está la herida, y la agarran. --- */
  const rr = rng(seed + 2);
  const raices = carcava.map((cv) => {
    // Corridas un poco respecto de la cárcava... pero la altura se vuelve a
    // preguntar en el punto nuevo. Si se heredara la de la cárcava, quedarían
    // flotando o enterradas: el terreno cae 0.3 por cada metro que uno se corre.
    const x = cv.pos[0] + (rr() - 0.5) * 0.5;
    const z = cv.pos[2] + (rr() - 0.5) * 1.6;
    return {
      pos: [x, alturaLadera(x, z), z],
      rotY: rr() * Math.PI * 2,
      escala: (0.9 + rr() * 0.5) * cv.escala,
      tint: tinte(rr, 0.1),
      nace: 2.2 + rr() * 1.5,
      madura: 11 + rr() * 3,
      exp: 0.7,
      decae: null,
    };
  });

  return {
    /* ------------------ Lo que había: el potrero ------------------ */
    // El pasto no se muere: LO TAPA la sombra (por eso decae con el dosel).
    pasto: sembrar(c.pasto, seed + 3, {
      eMin: 0.75, eMax: 1.35, varia: 0.16, zMax: LADERA.zMax - 1,
      tiempo: (_d, r) => ({
        nace: -1, madura: 0.4, exp: 0.4,
        decae: [4 + r() * 2.5, 14 + r() * 4],
      }),
    }),
    carcava,
    roca: sembrar(c.roca, seed + 4, {
      eMin: 0.7, eMax: 1.5, varia: 0.1,
      tiempo: () => ({ nace: -1, madura: 0, exp: 1 }), // la piedra siempre estuvo
    }),

    /* ------------------ Lo que hace el campesino ------------------ */
    barrera: sembrarBarreras(c, seed + 5),
    raices,

    /* ------------------ Las pioneras ------------------ */
    // El helecho entra escalonado: unos al año 1, y más a medida que hay sombra.
    helecho: sembrar(c.helecho, seed + 6, {
      xMin: LADERA.xMin + 5, xMax: LADERA.xMax - 5, zMax: 6,
      eMin: 0.8, eMax: 1.3, varia: 0.14,
      tiempo: (_d, r) => {
        const nace = 1.2 + r() * 10.5;
        return { nace, madura: nace + 4.5, exp: 0.6 };
      },
    }),
    /*
     * Dos cohortes en UNA sola malla (por eso el año de nacimiento va por
     * instancia y no por especie): las del año 1, que se van porque SE HICIERON
     * MONTE, y las que el bosque maduro siembra solo a partir del año 20. La
     * segunda cohorte es la prueba de que ya no nos necesita.
     */
    plantula: sembrar(c.plantula, seed + 7, {
      xMin: LADERA.xMin + 5, xMax: LADERA.xMax - 5, zMax: 7,
      eMin: 0.85, eMax: 1.5, varia: 0.14,
      tiempo: (_d, r) => {
        if (r() > 0.45) {
          const nace = 1 + r() * 1.2;
          return { nace, madura: nace + 2.2, exp: 0.6, decae: [5.5 + r() * 2, 10 + r() * 3] };
        }
        const nace = 19 + r() * 9;
        return { nace, madura: nace + 5, exp: 0.6 };
      },
    }),
    romerillo: sembrar(c.romerillo, seed + 8, {
      zMax: 6, eMin: 0.8, eMax: 1.25, varia: 0.14,
      tiempo: (_d, r) => {
        const nace = 0.9 + r() * 1.8;
        return { nace, madura: nace + 3.8, exp: 0.55 };
      },
    }),
    mortino: sembrar(c.mortino, seed + 9, {
      zMax: 6, eMin: 0.8, eMax: 1.2, varia: 0.12,
      tiempo: (_d, r) => {
        const nace = 1.6 + r() * 2.5;
        return { nace, madura: nace + 5.5, exp: 0.6 };
      },
    }),
    // Aliso y yarumo: las que corren. Arranque bravo (exp 0.5) y a los 12 ya están.
    aliso: sembrar(c.aliso, seed + 10, {
      zMax: 4, eMin: 0.85, eMax: 1.15, varia: 0.08, despejeSemilla: 3.2,
      tiempo: (_d, r) => {
        const nace = 1.8 + r() * 1.6;
        return { nace, madura: nace + 11, exp: 0.5 };
      },
    }),
    yarumo: sembrar(c.yarumo, seed + 11, {
      zMax: 4, eMin: 0.9, eMax: 1.15, varia: 0.06, despejeSemilla: 3.2,
      tiempo: (_d, r) => {
        const nace = 2.2 + r() * 1.8;
        return { nace, madura: nace + 12, exp: 0.5 };
      },
    }),

    /* ------------------ El bosque de verdad: se derrama desde la madre ------------------ */
    encenillo: sembrar(c.encenillo, seed + 12, {
      zMax: 4, eMin: 0.85, eMax: 1.12, varia: 0.08, despejeSemilla: 2.8,
      tiempo: (d, r) => {
        const nace = 6 + d * 0.42 + r() * 2;
        return { nace, madura: nace + 22, exp: 1 };
      },
    }),
    gaque: sembrar(c.gaque, seed + 13, {
      zMax: 4, eMin: 0.9, eMax: 1.1, varia: 0.08, despejeSemilla: 3,
      tiempo: (d, r) => {
        const nace = 8 + d * 0.42 + r() * 2.5;
        return { nace, madura: nace + 26, exp: 1 };
      },
    }),
    // El roble: el más lento de todos... y el que ya estaba (ver abajo).
    roble: [
      ...sembrar(c.roble, seed + 14, {
        zMax: 4, eMin: 0.9, eMax: 1.15, varia: 0.08, despejeSemilla: 4,
        tiempo: (d, r) => {
          const nace = 8 + d * 0.6 + r() * 2.5;
          return { nace, madura: nace + 27, exp: 1 };
        },
      }),
      /*
       * EL ÁRBOL SEMILLA. El que quedó vivo cuando tumbaron todo lo demás. Nace
       * "antes del año cero" (nace/madura negativos) → está entero desde el primer
       * cuadro y no se mueve nunca. Todo lo demás en esta ladera es hijo suyo: de
       * su distancia dependen los años de nacimiento del encenillo, el gaque, el
       * roble y la queñua. Por eso está solo en el año 0 y rodeado en el 50.
       */
      {
        pos: [
          ARBOL_SEMILLA.x,
          alturaLadera(ARBOL_SEMILLA.x, ARBOL_SEMILLA.z),
          ARBOL_SEMILLA.z,
        ],
        rotY: 0.7,
        escala: ARBOL_SEMILLA.escala,
        tint: [1, 1, 1],
        nace: -2,
        madura: -1,
        exp: 1,
        decae: null,
      },
    ],
    quenua: sembrar(c.quenua, seed + 15, {
      xMin: LADERA.xMin + 6, xMax: LADERA.xMax - 6, zMax: 2,
      eMin: 0.9, eMax: 1.25, varia: 0.08, despejeSemilla: 4,
      tiempo: (d, r) => {
        const nace = 15 + d * 0.35 + r() * 4;
        return { nace, madura: nace + 28, exp: 1 };
      },
    }),

    /* ------------------ Lo que solo llega si hubo paciencia ------------------ */
    hojarasca: sembrar(c.hojarasca, seed + 16, {
      xMin: LADERA.xMin + 5, xMax: LADERA.xMax - 5, zMax: 7,
      eMin: 0.8, eMax: 1.6, varia: 0.12,
      tiempo: (_d, r) => {
        const nace = 3 + r() * 6;
        return { nace, madura: nace + 6, exp: 0.6 };
      },
    }),
    musgo: sembrar(c.musgo, seed + 17, {
      zMax: 6, eMin: 0.7, eMax: 1.6, varia: 0.12,
      tiempo: (_d, r) => {
        const nace = 12 + r() * 7;
        return { nace, madura: nace + 8, exp: 0.7 };
      },
    }),
  };
}

/*
 * Las epífitas no se siembran en el suelo: se MONTAN en los árboles que ya
 * existen. Se cuelgan del tronco de los tardíos (encenillo, gaque, roble) y nacen
 * del año 20 en adelante — cuando ya hay dosel, sombra y humedad quieta. Nadie
 * las planta: llegan. Son el certificado de que el bosque ya es bosque.
 *
 * El detalle que las hace verdad: cada una guarda a su `huesped` (su árbol) y la
 * altura a la que va montada. Como el árbol todavía está creciendo cuando ellas
 * llegan, la epífita SUBE con él — se monta en el tronco y el tronco se la lleva
 * para arriba. Sin esto quedarían flotando en el aire esperando que el árbol las
 * alcance, que es exactamente lo que no pasa en un bosque.
 */
export function colgarEpifitas(dist, n, seed = 606) {
  if (!n) return [];
  const r = rng(seed);
  const anfitriones = [...dist.encenillo, ...dist.gaque, ...dist.roble].filter(
    (t) => t.nace < 26, // solo los que a los 50 ya son árbol hecho
  );
  if (!anfitriones.length) return [];

  const arr = [];
  for (let i = 0; i < n; i++) {
    const t = anfitriones[Math.floor(r() * anfitriones.length)];
    const ang = r() * Math.PI * 2;
    const rad = 0.22 + r() * 0.3;
    const nace = 20 + r() * 9;
    arr.push({
      // Al pie del tronco del anfitrión...
      pos: [t.pos[0] + Math.cos(ang) * rad, t.pos[1], t.pos[2] + Math.sin(ang) * rad],
      // ...y trepada hasta aquí, pero solo hasta donde el árbol haya llegado.
      alto: (1.4 + r() * 1.1) * t.escala,
      huesped: { nace: t.nace, madura: t.madura, exp: t.exp },
      rotY: ang,
      escala: (0.7 + r() * 0.5) * t.escala,
      tint: tinte(r, 0.12),
      nace,
      madura: nace + 10,
      exp: 0.7,
      decae: null,
    });
  }
  return arr;
}
