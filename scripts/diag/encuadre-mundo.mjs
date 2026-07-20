/*
 * encuadre-mundo — ¿QUÉ SE VE de verdad por la cámara de un mundo 3D?
 *
 * Medir la geometría NO es ver la escena. Un mundo puede tener las plantas del
 * tamaño correcto, la distribución correcta y el relieve correcto, y aun así
 * entregar un encuadre donde el sujeto no aparece porque la cámara quedó
 * enterrada en la ladera y el 60% del cuadro es loma vacía. Eso ya pasó, con
 * números "correctos" de respaldo.
 *
 * Este script traza RAYOS por la retícula del encuadre real (la misma posición,
 * la misma mirada y el mismo fov que monta la escena) contra la MISMA función
 * de altura del terreno, y reporta el reparto del cuadro: cuánto es cielo,
 * cuánto suelo, y a qué distancia cae cada golpe. Con eso se sabe si el sujeto
 * está en cuadro y en qué tercio, sin GPU y sin captura.
 *
 * No reemplaza mirar la foto — la reemplaza CUANDO NO HAY foto todavía, y
 * atrapa el desastre antes de gastar un deploy en descubrirlo.
 *
 * Uso:  node scripts/diag/encuadre-mundo.mjs yuca
 *       node scripts/diag/encuadre-mundo.mjs quinua
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../..');

/* Los mundos que este diagnóstico sabe mirar. Cada uno declara de dónde saca su
   función de altura, su cámara y cuál es el SUJETO que no puede faltar. */
const MUNDOS = {
  /* El PAPAL es la línea base: un mundo ya aprobado y desplegado. Sirve para
     calibrar qué reparto de cuadro se considera bueno en esta casa, en vez de
     inventarse umbrales de la nada. Su cámara no declara constante CAMARA, así
     que va escrita aquí tal como la monta EscenaPapaVivo. */
  papa: {
    modulo: 'src/visual/mundo3d/papa/floraPapa.geom.js',
    altura: 'alturaLadera',
    camaraFija: { pos: [2, 5.4, 15.5], mira: [0, 3.8, -3], fov: 46 },
    sujeto: { nombre: 'el claro de la cosecha', clave: 'SITIO_COSECHA' },
    altoCultivo: 0.45, // la mata de papa es bajita y aporcada
  },
  yuca: {
    modulo: 'src/visual/mundo3d/yuca/floraYuca.geom.js',
    altura: 'alturaYucal',
    sujeto: { nombre: 'el claro del arranque', clave: 'SITIO_ARRANQUE' },
    altoCultivo: 2.3, // la mata de yuca adulta
  },
  quinua: {
    modulo: 'src/visual/mundo3d/quinua/floraQuinua.geom.js',
    altura: 'alturaQuinual',
    sujeto: { nombre: 'la era de la trilla', clave: 'SITIO_TRILLA' },
    altoCultivo: 1.6, // la mata de quinua con su panoja
  },
  /* Los FRUTALES no son un lote continuo: son un HUERTO — copas sueltas, y de
     dos tamaños que no se parecen en nada. Medirlo con `dentroLote * altoCultivo`
     mentiría en las dos direcciones (rellenaría el claro entre palos y aplanaría
     el mango contra el cítrico). Va con dosel propio, armado de la MISMA siembra
     que la escena dibuja, y separado POR CAPA: la lección de este mundo es que
     el mango eclipse al cítrico, y eso hay que poder contarlo en píxeles. */
  frutales: {
    modulo: 'src/visual/mundo3d/frutales/floraFrutales.geom.js',
    altura: 'alturaFinca',
    /* El sujeto de este mundo no es un claro en el suelo sino un ÁRBOL de 10 m
       de copa: los rayos le pegan en la cara del domo, a 4–5 m del tronco, así
       que hay que preguntarle por su radio real y no por el del claro. */
    sujeto: { nombre: 'el palo de mango del patio', punto: [-4.2, 8.6], radio: 5.3 },
    doselHuerto: true,
  },
};

/*
 * El dosel de un HUERTO: la altura de copa en cada punto, sacada de la siembra
 * real del mundo (`distribucionFrutales` con el tier alto, la misma semilla).
 * Cada copa es un domo achatado, no una caja: en el borde baja hasta la falda,
 * que es donde de verdad termina la silueta.
 *
 * Las proporciones salen de leer `geomMango` y `geomCitrico`, no de suponer.
 *
 * OJO — la copa es un ELIPSOIDE HUECO POR DEBAJO, no una columna maciza desde
 * el suelo. Un palo de mango tiene 2,6 m de aire entre la sombra y la falda de
 * la copa: por ahí se ve el huerto de arriba, y ese hueco es justamente lo que
 * hace que la lección se lea. Modelarlo macizo infla el «cultivo en cuadro» y
 * vuelve a caer en el pecado que este script existe para evitar — dar un número
 * cómodo en vez de mirar. De ahí que el dosel devuelva `base` además de `alto`.
 *
 * Mango: centro local y=3.05, semialto 1.35, radio 3.1 → copa de 1.7 a 4.4 de
 * alto. Con la escala de sitio (1.2–1.7) el héroe da ~7,5 m de alto por ~10,5 m
 * de ancho. Cítrico: centro y=1.20, semialto 0.72, radio 1.0.
 */
const COPAS = {
  mango: { cy: 3.05, hy: 1.35, rad: 3.1 },
  'cítrico': { cy: 1.2, hy: 0.72, rad: 1.0 },
};

function doselDeHuerto(geom) {
  const conteos = geom.frutalesDeTier('alto');
  const dist = geom.distribucionFrutales(conteos, 421, 1);
  const arma = (capa) => (a) => {
    const f = COPAS[capa];
    return {
      x: a.pos[0], z: a.pos[2], capa,
      cy: f.cy * a.escala, hy: f.hy * a.escala, rad: f.rad * a.escala,
    };
  };
  const copas = [
    ...dist.mango.map(arma('mango')),
    ...dist.citrico.map(arma('cítrico')),
  ];
  return (x, z) => {
    let alto = 0;
    let base = 0;
    let capa = null;
    for (const c of copas) {
      const dx = x - c.x;
      const dz = z - c.z;
      const d2 = (dx * dx + dz * dz) / (c.rad * c.rad);
      if (d2 >= 1) continue;
      const semi = c.hy * Math.sqrt(1 - d2); // el elipsoide se adelgaza hacia el borde
      if (c.cy + semi > alto) {
        alto = c.cy + semi;
        base = c.cy - semi;
        capa = c.capa;
      }
    }
    return { alto, base, capa };
  };
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruz = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (v) => {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
};

/*
 * Marcha por el rayo hasta que toque el mundo. Paso fino cerca (donde está el
 * sujeto) y grueso lejos: exacto donde importa, barato donde no.
 *
 * OJO — golpea contra el TERRENO MÁS EL DOSEL DEL CULTIVO, no contra el terreno
 * pelado. Es la diferencia entre medir bien y engañarse: una yuca mide 2,3 m y
 * una quinua 1,6 m, así que lo que de verdad llena el cuadro de esos mundos es
 * la planta, no el suelo bajo la planta. Midiendo solo terreno, un quinual
 * denso "ocupaba 8,6% del cuadro" — y lo que ocupa 8,6% es el barro entre las
 * matas, que es justo lo que no se ve.
 */
function golpear(origen, dir, altura, dosel, maxDist = 90) {
  let t = 0.2;
  while (t < maxDist) {
    const p = [origen[0] + dir[0] * t, origen[1] + dir[1] * t, origen[2] + dir[2] * t];
    // fuera del heightfield: se acabó el mundo, es cielo/telón
    if (Math.abs(p[0]) > 20 || p[2] < -19 || p[2] > 19) return null;
    const suelo = altura(p[0], p[2]);
    /* el dosel puede responder un número (lote continuo: yuca, quinua, papa) o
       `{alto, capa}` (huerto de copas sueltas, donde importa CUÁL copa) */
    const d = dosel(p[0], p[2]);
    if (typeof d === 'number') {
      /* LOTE CONTINUO (papa, yuca, quinua): la mata tapa desde el suelo. Esta
         rama queda EXACTAMENTE como se calibró la línea base de la casa — no se
         toca, o se corre el metro con el que se mide todo lo demás. */
      if (p[1] <= suelo + d) {
        return { t, punto: p, altura: suelo, enCultivo: d > 0.01, capa: null };
      }
    } else {
      /* HUERTO: la copa deja pasar por debajo de su falda, y por ese hueco es
         que se ve la ladera de arriba. */
      const enCopa = d.alto > 0.01 && p[1] <= suelo + d.alto && p[1] >= suelo + d.base;
      if (p[1] <= suelo || enCopa) {
        return { t, punto: p, altura: suelo, enCultivo: enCopa, capa: enCopa ? d.capa : null };
      }
    }
    t += t < 18 ? 0.16 : 0.55;
  }
  return null;
}

async function main() {
  const cual = process.argv[2] || 'yuca';
  const def = MUNDOS[cual];
  if (!def) {
    console.error(`mundo desconocido: ${cual}. Conozco: ${Object.keys(MUNDOS).join(', ')}`);
    process.exit(2);
  }

  const geom = await import(resolve(RAIZ, def.modulo));
  const altura = geom[def.altura];
  /* La cámara sale del PROPIO módulo del mundo (constante CAMARA, que vive
     junto a la geografía): así este diagnóstico no puede quedar desfasado de lo
     que la escena monta de verdad. El papal, que es anterior a esa convención,
     la trae escrita a mano aquí arriba. */
  const cam = def.camaraFija || { ...geom.CAMARA, pos: geom.CAMARA.reposo, mira: geom.CAMARA.mirada };
  if (!cam || !cam.pos) throw new Error(`el módulo de «${cual}» no exporta CAMARA`);
  const sujeto = def.sujeto.punto || geom[def.sujeto.clave];
  /* 2.55 m es el radio del CLARO con que se calibraron papa/yuca/quinua; un
     sujeto con cuerpo (un árbol) declara el suyo. */
  const radioSujeto = def.sujeto.radio || Math.sqrt(6.5);
  /* El dosel: cuánto levanta el cultivo sobre el suelo en cada punto del lote.
     Se apoya en el `dentroLote` del propio mundo, así que respeta los claros
     (la era, el patio, el sitio de cosecha) sin duplicar esa lógica aquí. */
  const alto = def.altoCultivo || 0;
  const dosel = def.doselHuerto
    ? doselDeHuerto(geom)
    : (x, z) => (geom.dentroLote && alto ? geom.dentroLote(x, z) * alto : 0);

  const adelante = norm(sub(cam.mira, cam.pos));
  const derecha = norm(cruz(adelante, [0, 1, 0]));
  const arriba = cruz(derecha, adelante);

  // retícula del encuadre (móvil-first: 9:16 es el caso apretado, pero el
  // lienzo real es más ancho; se mide 3:2, que es el que se fotografía)
  const COLS = 48;
  const FILAS = 30;
  const aspecto = 3 / 2;
  const mediaV = Math.tan((cam.fov * Math.PI) / 180 / 2);
  const mediaH = mediaV * aspecto;

  let cielo = 0;
  let suelo = 0;
  const porTercio = [0, 0, 0]; // golpes por tercio vertical del cuadro
  /* Y el mismo reparto contando SOLO TERRENO. La diferencia no es cosmética:
     terreno en el tercio alto es la cámara enterrada mirando contra la loma
     (el desastre que este script existe para atrapar), pero COPA en el tercio
     alto es un palo de mango pasándote por encima — que es precisamente lo que
     un mundo de frutales quiere. Medirlos juntos confunde la enfermedad con la
     cura; el papal nunca lo delató porque no tiene nada alto sembrado. */
  const porTercioSuelo = [0, 0, 0];
  let enLote = 0; // rayos que caen sobre el cultivo sembrado
  const porCapa = {}; // en un huerto: qué copa se llevó cada rayo
  let masCerca = Infinity;
  let masLejos = 0;
  let sumaDist = 0;

  // ¿en qué parte del cuadro cae el SUJETO?
  let sujetoFila = null;
  let sujetoCol = null;

  for (let f = 0; f < FILAS; f++) {
    for (let cN = 0; cN < COLS; cN++) {
      const sx = ((cN + 0.5) / COLS) * 2 - 1;
      const sy = 1 - ((f + 0.5) / FILAS) * 2;
      const dir = norm([
        adelante[0] + derecha[0] * sx * mediaH + arriba[0] * sy * mediaV,
        adelante[1] + derecha[1] * sx * mediaH + arriba[1] * sy * mediaV,
        adelante[2] + derecha[2] * sx * mediaH + arriba[2] * sy * mediaV,
      ]);
      const g = golpear(cam.pos, dir, altura, dosel);
      if (!g) {
        cielo += 1;
        continue;
      }
      suelo += 1;
      const tercio = Math.min(2, Math.floor((f / FILAS) * 3));
      porTercio[tercio] += 1;
      if (!g.enCultivo) porTercioSuelo[tercio] += 1;
      masCerca = Math.min(masCerca, g.t);
      masLejos = Math.max(masLejos, g.t);
      sumaDist += g.t;

      // ¿este rayo cayó encima del sujeto?
      const dx = g.punto[0] - sujeto[0];
      const dz = g.punto[2] - sujeto[1];
      if (dx * dx + dz * dz < radioSujeto * radioSujeto) {
        if (sujetoFila === null) sujetoFila = f;
        sujetoCol = cN;
      }

      // ¿y cayó sobre el CULTIVO? En un mundo cuyo entregable es la planta
      // misma (el campo de color de la quinua), esto importa más que dónde cae
      // tal o cual rincón: mide si el cultivo llena el cuadro.
      if (g.enCultivo) enLote += 1;
      if (g.capa) porCapa[g.capa] = (porCapa[g.capa] || 0) + 1;
    }
  }

  const total = COLS * FILAS;
  const pct = (n) => `${((n / total) * 100).toFixed(1)}%`;

  console.log(`\n═══ ENCUADRE DE «${cual}» ═══`);
  console.log(
    `cámara ${cam.pos.map((v) => v.toFixed(1)).join(', ')} → mira ${cam.mira
      .map((v) => v.toFixed(1))
      .join(', ')}  ·  fov ${cam.fov}°  ·  3:2`,
  );
  console.log(`\n  cielo/telón : ${pct(cielo)}`);
  console.log(`  terreno     : ${pct(suelo)}`);
  console.log(
    `  reparto vertical del cuadro — tercio alto ${pct(porTercio[0])} · medio ${pct(
      porTercio[1],
    )} · bajo ${pct(porTercio[2])}`,
  );
  if (porTercio[0] !== porTercioSuelo[0]) {
    console.log(
      `  de eso, TERRENO pelado — tercio alto ${pct(porTercioSuelo[0])} (lo que delata la cámara enterrada)`,
    );
  }
  if (suelo > 0) {
    console.log(
      `  distancia   : más cerca ${masCerca.toFixed(1)} m · promedio ${(sumaDist / suelo).toFixed(
        1,
      )} m · más lejos ${masLejos.toFixed(1)} m`,
    );
  }

  console.log(`  sobre el CULTIVO sembrado: ${pct(enLote)} del cuadro`);

  /* En un huerto, el reparto ENTRE copas es la lección misma: si el mundo
     enseña que el mango es el gigante de abajo y el cítrico el chico de arriba,
     eso tiene que verse en el reparto del cuadro, no solo en el modelo. */
  const capas = Object.keys(porCapa);
  if (capas.length) {
    console.log(
      `  reparto por copa — ${capas
        .sort((a, b) => porCapa[b] - porCapa[a])
        .map((k) => `${k} ${pct(porCapa[k])}`)
        .join(' · ')}`,
    );
    if (porCapa['mango'] && porCapa['cítrico']) {
      const razon = porCapa['mango'] / porCapa['cítrico'];
      console.log(
        `  el mango ocupa ${razon.toFixed(1)}× el cuadro del cítrico  ${
          razon >= 2 ? '✓ la escala se SIENTE' : '✗ no eclipsa: la lección no llega'
        }`,
      );
    }
  }

  console.log(`\n  SUJETO — ${def.sujeto.nombre}:`);
  if (sujetoFila === null) {
    console.log('  ✗ NO APARECE EN CUADRO. La cámara no lo está mirando.');
  } else {
    const tercioV = ['alto', 'medio', 'bajo'][Math.min(2, Math.floor((sujetoFila / FILAS) * 3))];
    const tercioH = ['izquierda', 'centro', 'derecha'][
      Math.min(2, Math.floor((sujetoCol / COLS) * 3))
    ];
    console.log(`  ✓ en cuadro, tercio ${tercioV} · ${tercioH}`);
  }

  /* Los avisos que este diagnóstico existe para dar. */
  /* Los umbrales NO son inventados: salen de medir el papal, que es un mundo ya
     aprobado y desplegado (`node scripts/diag/encuadre-mundo.mjs papa`):
       cielo 32.8% · terreno 67.2% · tercio alto 0.6% · más cerca 10.4 m
     Es decir, la casa compone en plano general de diorama —el tercio alto casi
     libre de terreno y el sujeto abajo—, NO en primer plano cercano. Un umbral
     de "falta primer plano" en 6 m marcaba en rojo hasta al propio papal. */
  const avisos = [];
  if (cielo / total < 0.12) avisos.push('casi no hay cielo: el cuadro se siente tapiado');
  if (cielo / total > 0.55) avisos.push('demasiado cielo: el mundo queda vacío abajo');
  /* Sobre TERRENO pelado, no sobre copa: un mango que te tapa el cielo es la
     escena bien compuesta, una loma que te lo tapa es la cámara enterrada. */
  if (porTercioSuelo[0] / total > 0.1) {
    avisos.push(
      'el tercio ALTO tiene TERRENO encima del umbral de la casa (papal: 0.6%): la cámara está enterrada, mirando contra la loma',
    );
  }
  if (suelo > 0 && masCerca > 14) {
    avisos.push('nada cerca de la cámara: la escena se ve lejana incluso para el estilo de la casa');
  }
  if (sujetoFila === null) avisos.push('EL SUJETO NO ESTÁ EN CUADRO — esto es un bloqueante');
  if (enLote / total < 0.12) {
    avisos.push('el cultivo sembrado ocupa muy poco cuadro: se está fotografiando el paisaje, no el cultivo');
  }

  if (avisos.length) {
    console.log('\n  ⚠ avisos:');
    avisos.forEach((a) => console.log(`    · ${a}`));
  } else {
    console.log('\n  ✓ sin avisos de encuadre');
  }
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
