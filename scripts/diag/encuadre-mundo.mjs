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
    sujeto: { nombre: 'el claro de la cosecha', clave: 'SITIO_COSECHA', alto: 0.9 },
  },
  yuca: {
    modulo: 'src/visual/mundo3d/yuca/floraYuca.geom.js',
    altura: 'alturaYucal',
    camaraModulo: 'src/visual/mundo3d/yuca/EscenaYucaViva.jsx',
    sujeto: { nombre: 'el claro del arranque', clave: 'SITIO_ARRANQUE', alto: 0.9 },
  },
  quinua: {
    modulo: 'src/visual/mundo3d/quinua/floraQuinua.geom.js',
    altura: 'alturaQuinual',
    camaraModulo: 'src/visual/mundo3d/quinua/EscenaQuinuaViva.jsx',
    sujeto: { nombre: 'la era de la trilla', clave: 'SITIO_TRILLA', alto: 0.9 },
  },
};

/* La cámara se lee del propio archivo de la escena (constante CAMARA), para que
   este diagnóstico no pueda quedar desfasado de lo que la escena monta. */
async function leerCamara(rutaEscena) {
  const { readFile } = await import('node:fs/promises');
  const txt = await readFile(resolve(RAIZ, rutaEscena), 'utf8');
  const num = '(-?\\d+(?:\\.\\d+)?)';
  const trio = `\\[\\s*${num}\\s*,\\s*${num}\\s*,\\s*${num}\\s*\\]`;
  // ojo: el `[^\n]*?` (no `[^\[]*`) es a propósito — la anotación de tipo
  // `/** @type {[number, number, number]} */` trae corchetes por delante y con
  // la clase negada de corchete el match nunca llega a los números de verdad.
  const rep = txt.match(new RegExp(`reposo:[^\\n]*?${trio}`));
  const mir = txt.match(new RegExp(`mirada:[^\\n]*?${trio}`));
  const fov = txt.match(new RegExp(`fov:\\s*${num}`));
  if (!rep || !mir || !fov) {
    throw new Error(`no encontré la constante CAMARA en ${rutaEscena}`);
  }
  return {
    pos: rep.slice(1, 4).map(Number),
    mira: mir.slice(1, 4).map(Number),
    fov: Number(fov[1]),
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

/* Marcha por el rayo hasta que baje del terreno. Paso fino cerca (donde está el
   sujeto) y grueso lejos: exacto donde importa, barato donde no. */
function golpear(origen, dir, altura, maxDist = 90) {
  let t = 0.2;
  let prevArriba = true;
  while (t < maxDist) {
    const p = [origen[0] + dir[0] * t, origen[1] + dir[1] * t, origen[2] + dir[2] * t];
    // fuera del heightfield: se acabó el mundo, es cielo/telón
    if (Math.abs(p[0]) > 20 || p[2] < -19 || p[2] > 19) return null;
    const h = altura(p[0], p[2]);
    if (p[1] <= h) {
      if (prevArriba) return { t, punto: p, altura: h };
      return { t, punto: p, altura: h };
    }
    prevArriba = false;
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
  const cam = def.camaraFija || (await leerCamara(def.camaraModulo));
  const sujeto = geom[def.sujeto.clave];

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
      const g = golpear(cam.pos, dir, altura);
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
  if (porTercio[0] / total > 0.1) {
    avisos.push(
      'el tercio ALTO tiene terreno encima del umbral de la casa (papal: 0.6%): la cámara está mirando contra la loma',
    );
  }
  if (suelo > 0 && masCerca > 14) {
    avisos.push('nada cerca de la cámara: la escena se ve lejana incluso para el estilo de la casa');
  }
  if (sujetoFila === null) avisos.push('EL SUJETO NO ESTÁ EN CUADRO — esto es un bloqueante');

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
