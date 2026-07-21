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
  /* La LADERA CAFETERA. El sujeto es el cafeto protagonista del camino: la mata
     que enseña qué es un cafeto. `altoCultivo` se deja FIJO entre corridas para
     que el antes/después mida la CÁMARA y la siembra, no el número que uno
     mismo acaba de mover. */
  cafe: {
    modulo: 'src/visual/mundo3d/cafetal/floraCafetal.geom.js',
    altura: 'alturaLadera',
    sujeto: { nombre: 'el cafeto protagonista del camino', clave: 'SITIO_CAFETO_HERO' },
    altoCultivo: 1.5, // la mata de café adulta bajo sombrío
  },
};

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
    const sobre = dosel(p[0], p[2]);
    if (p[1] <= suelo + sobre) {
      return { t, punto: p, altura: suelo, enCultivo: sobre > 0.01 };
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
  /* Override por bandera: un mundo puede tener MÁS DE UNA cámara que se
     fotografía (la de pantalla completa y la de la tarjeta de vitrina, que sale
     de camaraDioramas). Las dos hay que medirlas: la vitrina es la que la gente
     ve primero.  --pos x,y,z  --mira x,y,z  --fov n */
  const trio = (s) => s.split(',').map(Number);
  const fPos = process.argv.includes('--pos') ? trio(process.argv[process.argv.indexOf('--pos') + 1]) : null;
  const fMira = process.argv.includes('--mira') ? trio(process.argv[process.argv.indexOf('--mira') + 1]) : null;
  const fFov = process.argv.includes('--fov') ? Number(process.argv[process.argv.indexOf('--fov') + 1]) : null;
  if (fPos) cam.pos = fPos;
  if (fMira) cam.mira = fMira;
  if (fFov) cam.fov = fFov;
  const sujeto = geom[def.sujeto.clave];
  /* El dosel: cuánto levanta el cultivo sobre el suelo en cada punto del lote.
     Se apoya en el `dentroLote` del propio mundo, así que respeta los claros
     (la era, el patio, el sitio de cosecha) sin duplicar esa lógica aquí. */
  const alto = def.altoCultivo || 0;
  const dosel = (x, z) =>
    geom.dentroLote && alto ? geom.dentroLote(x, z) * alto : 0;

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
  const porTercio = [0, 0, 0]; // golpes de suelo por tercio vertical del cuadro
  let enLote = 0; // rayos que caen sobre el cultivo sembrado
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
      porTercio[Math.min(2, Math.floor((f / FILAS) * 3))] += 1;
      masCerca = Math.min(masCerca, g.t);
      masLejos = Math.max(masLejos, g.t);
      sumaDist += g.t;

      // ¿este rayo cayó encima del sujeto?
      const dx = g.punto[0] - sujeto[0];
      const dz = g.punto[2] - sujeto[1];
      if (dx * dx + dz * dz < 6.5) {
        if (sujetoFila === null) sujetoFila = f;
        sujetoCol = cN;
      }

      // ¿y cayó sobre el CULTIVO? En un mundo cuyo entregable es la planta
      // misma (el campo de color de la quinua), esto importa más que dónde cae
      // tal o cual rincón: mide si el cultivo llena el cuadro.
      if (g.enCultivo) enLote += 1;
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
    `  reparto vertical del terreno — tercio alto ${pct(porTercio[0])} · medio ${pct(
      porTercio[1],
    )} · bajo ${pct(porTercio[2])}`,
  );
  if (suelo > 0) {
    console.log(
      `  distancia   : más cerca ${masCerca.toFixed(1)} m · promedio ${(sumaDist / suelo).toFixed(
        1,
      )} m · más lejos ${masLejos.toFixed(1)} m`,
    );
  }

  console.log(`  sobre el CULTIVO sembrado: ${pct(enLote)} del cuadro`);

  const avisosCopa = [];

  /* ¿Hay una COPA tapando la vista? El ray-march de arriba golpea terreno más
     dosel: es CIEGO a los árboles de sombra, que no son relieve del suelo sino
     una tapa en el aire con hueco debajo. Y esa ceguera ya costó caro — un
     mundo dio "sin avisos" con la copa de un guamo sentada sobre la cámara,
     cortando media vista. Si el mundo declara sus copas, aquí se miden. */
  if (geom.copasSombrio) {
    const copas = geom.copasSombrio();
    /* Un mundo de café DE SOMBRA tiene que tener techo de hojas: contar todo el
       follaje del sombrío como "estorbo" castigaría justo lo que hace bien. Lo
       que estorba es la copa CERCA del ojo — la que ya no enmarca sino tapa. */
    const CERCA_COPA = 7;
    let tapados = 0;
    let tapadosCerca = 0;
    let masCercaCopa = Infinity;
    let culpable = null;
    for (let f = 0; f < FILAS; f++) {
      for (let cN = 0; cN < COLS; cN++) {
        const sx = ((cN + 0.5) / COLS) * 2 - 1;
        const sy = 1 - ((f + 0.5) / FILAS) * 2;
        const dir = norm([
          adelante[0] + derecha[0] * sx * mediaH + arriba[0] * sy * mediaV,
          adelante[1] + derecha[1] * sx * mediaH + arriba[1] * sy * mediaV,
          adelante[2] + derecha[2] * sx * mediaH + arriba[2] * sy * mediaV,
        ]);
        let tapa = null;
        for (const copa of copas) {
          // intersección rayo-esfera (la copa como bola en el aire)
          const oc = sub(cam.pos, copa.c);
          const b = 2 * (oc[0] * dir[0] + oc[1] * dir[1] + oc[2] * dir[2]);
          const cc = oc[0] * oc[0] + oc[1] * oc[1] + oc[2] * oc[2] - copa.r * copa.r;
          const disc = b * b - 4 * cc;
          if (disc < 0) continue;
          const t = (-b - Math.sqrt(disc)) / 2;
          if (t > 0.2 && (!tapa || t < tapa.t)) tapa = { t, copa };
        }
        if (tapa) {
          tapados += 1;
          if (tapa.t < CERCA_COPA) tapadosCerca += 1;
          if (tapa.t < masCercaCopa) {
            masCercaCopa = tapa.t;
            culpable = tapa.copa;
          }
        }
      }
    }
    console.log(
      `  bajo COPAS del sombrío: ${pct(tapados)} del cuadro ` +
        `(de eso, CERCA —a menos de ${CERCA_COPA} m—: ${pct(tapadosCerca)})`,
    );
    if (culpable) {
      console.log(
        `    la más encima: ${culpable.quien} a ${masCercaCopa.toFixed(1)} m ` +
          `(${culpable.c.map((v) => v.toFixed(1)).join(', ')})`,
      );
    }
    /* Los umbrales miran la copa CERCANA, no el techo: una copa a 10 m es el
       sombrío del cafetal (y debe estar); a menos de 5 m es una hoja en el
       lente. Más de un octavo del cuadro en follaje cercano = cámara metida
       ENTRE las copas, que fue exactamente el reclamo. */
    if (masCercaCopa < 5) {
      avisosCopa.push(
        `la copa de un ${culpable.quien} está a ${masCercaCopa.toFixed(
          1,
        )} m de la cámara: no enmarca, TAPA`,
      );
    }
    if (tapadosCerca / total > 0.125) {
      avisosCopa.push(
        `el follaje del sombrío a menos de ${CERCA_COPA} m tapa ${pct(
          tapadosCerca,
        )} del cuadro: la cámara está metida ENTRE las copas, no debajo`,
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
  const avisos = [...avisosCopa];
  if (cielo / total < 0.12) avisos.push('casi no hay cielo: el cuadro se siente tapiado');
  if (cielo / total > 0.55) avisos.push('demasiado cielo: el mundo queda vacío abajo');
  if (porTercio[0] / total > 0.1) {
    avisos.push(
      'el tercio ALTO tiene terreno encima del umbral de la casa (papal: 0.6%): la cámara está mirando contra la loma',
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
