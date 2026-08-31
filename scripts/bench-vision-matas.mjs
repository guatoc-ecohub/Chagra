#!/usr/bin/env node
/**
 * bench-vision-matas — ¿QUÉ MODELO LEE MEJOR LA FOTO DE UNA MATA?
 *
 * El operador no quiere decidir el carril de visión por tamaño de modelo sino
 * **por resultado sobre el caso que de verdad importa**: la foto que un
 * campesino le manda al compAI de su matica, mata enferma incluida.
 *
 * ═══ LO QUE ESTE ARNÉS HACE BIEN, Y POR QUÉ (léase antes de tocar nada) ═══
 *
 * 1. **PRESENCIA EMPAREJADA CON AUSENCIA.** Mitad enfermas, mitad sanas, en
 *    número IGUAL. Si sólo se muestran matas enfermas, un modelo que conteste
 *    siempre "está enferma" saca 100% sin haber mirado la foto. Ese fue el
 *    error que invalidó un bench anterior de la casa.
 *
 * 2. **SÓLO FOTOS DONDE HAY UNA PLANTA QUE JUZGAR.** Del set de plagas del
 *    repo se DESCARTARON los retratos de insecto en fondo neutro (el
 *    escarabajo de laboratorio, la mosca blanca, las orugas) y las estructuras
 *    fúngicas sueltas: preguntar "¿esta planta está sana?" sobre la foto de un
 *    escarabajo en fondo blanco es una pregunta mal formada, y la respuesta no
 *    mide nada. Del lado sano se descartó la poscosecha (tomates en montón,
 *    cilantro en un plato, zanahorias arrancadas): tampoco hay mata.
 *    Las etiquetas se verificaron MIRANDO cada foto, no leyendo su nombre.
 *
 * 3. **`think:false` NO ALCANZA — hay que pagarle el presupuesto al pensar.**
 *    Primera corrida de este bench: `qwen3-vl:4b` sacó 4/11 con DOCE
 *    respuestas vacías, y casi lo declaro peor. Era un bug de ESTE arnés:
 *    el modelo **ignora `think:false`** y emite su bloque `<think>` igual, así
 *    que con `num_predict: 90` el razonamiento se comía el presupuesto entero
 *    (`done_reason: "length"`, `content: ""`). Con presupuesto amplio (700) contesta perfecto y NADIE queda truncado.
 *    Regla: presupuesto amplio e IGUAL para todos, y las vacías se cuentan
 *    aparte y NUNCA como acierto. Antes de culpar a un modelo, mírese el
 *    `done_reason` y el campo `thinking`.
 *
 * 4. **EL JUEZ NO ES UN MODELO LOCAL.** Es regla dura de la casa. Aquí no hay
 *    juez de fidelidad: se compara la PRIMERA PALABRA contra la etiqueta con
 *    un match determinista. La lectura cualitativa la hace una persona (o un
 *    modelo no-local) sobre el volcado que deja este script.
 *
 * 5. **SE REPORTA DESGLOSADO, NUNCA UN PROMEDIO.** Un promedio esconde
 *    exactamente lo que interesa: un modelo puede tener 100% en enfermas y 0%
 *    en sanas — o sea, decir siempre "enferma" — y promediar 50%.
 *
 * Uso:
 *   node scripts/bench-vision-matas.mjs [--host http://alpha:11434] [--repes 1]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '..');
const args = process.argv.slice(2);
const val = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
const HOST = val('--host', 'http://alpha:11434');
const REPES = Number(val('--repes', '1'));
const MODELOS = val('--modelos', 'qwen3.5:4b,qwen3-vl:4b').split(',');

/* ── EL SET, EMPAREJADO 11/11 Y VERIFICADO A OJO ────────────────────────── */
const ENFERMAS = [
  ['alternaria_solani', 'public/plaga-images/alternaria_solani.jpg', 'hoja con lesiones necróticas anilladas'],
  ['capnodium_negrilla', 'public/plaga-images/capnodium_negrilla.jpg', 'follaje cubierto de fumagina negra'],
  ['cercospora_coffeicola', 'public/plaga-images/cercospora_coffeicola.jpg', 'hoja de café con mancha de ojo de gallo'],
  ['colletotrichum_lindemuthianum', 'public/plaga-images/colletotrichum_lindemuthianum.jpg', 'vainas de fríjol con antracnosis'],
  ['hemileia_vastatrix', 'public/plaga-images/hemileia_vastatrix.jpg', 'hoja de café con roya anaranjada'],
  ['hypothenemus_hampei', 'public/plaga-images/hypothenemus_hampei.jpg', 'fruto de café perforado por broca'],
  ['meloidogyne', 'public/plaga-images/meloidogyne.jpg', 'raíces con agallas de nematodo'],
  ['mycosphaerella_fijiensis', 'public/plaga-images/mycosphaerella_fijiensis.jpg', 'hoja de plátano con rayas de sigatoka'],
  ['phytophthora_infestans', 'public/plaga-images/phytophthora_infestans.jpg', 'tomate con tizón tardío'],
  ['tecia_solanivora', 'public/plaga-images/tecia_solanivora.jpg', 'papa con galerías de polilla'],
  ['ustilago_maydis', 'public/plaga-images/ustilago_maydis.jpg', 'maíz con agallas de carbón'],
];
const SANAS = [
  ['aguacate_arbol', 'public/aguacate/arbol.jpg', 'aguacate cargado, follaje limpio'],
  ['cacao_mazorca', 'public/cacao/mazorca.jpg', 'mazorcas de cacao sanas'],
  ['cafe_almacigo', 'public/cafe/almacigo.jpg', 'almácigo de café'],
  ['cafe_cereza', 'public/cafe/cereza.jpg', 'cerezas de café maduras'],
  ['cafe_flor', 'public/cafe/flor.jpg', 'cafetal en flor'],
  ['frutales_limon', 'public/frutales/limon.jpg', 'limones en rama'],
  ['frutales_lulo', 'public/frutales/lulo.jpg', 'follaje de lulo'],
  ['frutales_mora', 'public/frutales/mora.jpg', 'follaje de mora'],
  ['hortalizas_acelga', 'public/hortalizas/acelga.jpg', 'acelga de tallos de colores'],
  ['hortalizas_repollo', 'public/hortalizas/repollo.jpg', 'repollos en cama'],
  ['platanera_mata', 'public/platano-banano/platanera-mata.jpg', 'colino de plátano recién sembrado'],
];

/* ── ETIQUETAS EN DISPUTA — la parte incómoda y necesaria ─────────────────
   Al leer los errores se descubrió que MI etiquetado estaba mal en al menos
   una foto: en `aguacate/arbol.jpg` los frutos tienen lesiones negras
   claramente visibles a resolución completa. Yo la había marcado SANA
   mirando una miniatura de 260 px, y por eso el bench le contaba un FALSO
   POSITIVO al modelo que la había leído BIEN.

   Es el sesgo clásico: quien arma el set decide quién gana. Se marcan como
   disputadas y el resumen se da DOS VECES — con y sin ellas — para que sea
   el operador quien adjudique, no yo.
     · aguacate_arbol     → mi 'SANA' estaba MAL (lesiones negras en frutos)
     · hortalizas_repollo → hojas amarillas y agujeros REALES; ¿senescencia
                            normal o problema sanitario? discutible
     · frutales_lulo      → daño de hoja menor; el modelo sobre-alarma, pero
                            los agujeritos existen
   No se borran del set: borrarlas sería esconder el problema. */
const DISPUTADAS = new Set(['aguacate_arbol', 'hortalizas_repollo', 'frutales_lulo']);

/* Pregunta NEUTRA: nombra las dos salidas en el mismo orden para todos y no
   insinúa cuál se espera. Pide una sola palabra primero para poder puntuar
   sin juez, y la razón después para poder leerla a mano. */
const PROMPT = [
  'Mire la foto de esta planta de una finca campesina.',
  '¿Tiene algún problema sanitario visible (plaga o enfermedad)?',
  'Responda EXACTAMENTE así, en dos líneas:',
  'Línea 1: una sola palabra, SANA o ENFERMA.',
  'Línea 2: una frase corta con lo que ve.',
].join(' ');

const b64 = (rel) => readFileSync(resolve(RAIZ, rel)).toString('base64');

async function preguntar(modelo, imagenB64) {
  const t0 = Date.now();
  const r = await fetch(`${HOST}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: modelo,
      keep_alive: '10m',
      // think:false — sin esto varios modelos devuelven vacío y el bench miente.
      think: false,
      stream: false,
      messages: [{ role: 'user', content: PROMPT, images: [imagenB64] }],
      // 400 y no 90: qwen3-vl:4b ignora `think:false` y razona igual. Con
      // presupuesto corto devolvía cadena vacía y el bench lo castigaba por
      // un límite MÍO, no por no saber. Mismo número para todos = justo.
      options: { temperature: 0, num_predict: 700 },
    }),
  });
  const j = await r.json().catch(() => ({}));
  return {
    texto: String(j?.message?.content || '').trim(),
    // Se guardan para poder distinguir "no supo" de "no lo dejé hablar".
    pensando: String(j?.message?.thinking || '').length,
    doneReason: j?.done_reason || null,
    evalCount: j?.eval_count || 0,
    ms: Date.now() - t0,
    totalS: (j?.total_duration || 0) / 1e9,
  };
}

/** Match determinista: la etiqueta que aparezca primero en la respuesta. */
function veredicto(texto) {
  const t = String(texto || '').toUpperCase();
  if (!t.trim()) return 'VACIA';
  const iE = t.search(/ENFERM/);
  const iS = t.search(/\bSANA?\b|SALUDABLE/);
  if (iE < 0 && iS < 0) return 'ILEGIBLE';
  if (iE < 0) return 'SANA';
  if (iS < 0) return 'ENFERMA';
  return iE < iS ? 'ENFERMA' : 'SANA';
}

async function main() {
  const casos = [
    ...ENFERMAS.map(([id, ruta, que]) => ({ id, ruta, que, verdad: 'ENFERMA' })),
    ...SANAS.map(([id, ruta, que]) => ({ id, ruta, que, verdad: 'SANA' })),
  ];
  console.log(`set: ${ENFERMAS.length} enfermas + ${SANAS.length} sanas = ${casos.length} (emparejado)`);
  console.log(`modelos: ${MODELOS.join(' vs ')} · host: ${HOST} · repeticiones: ${REPES}\n`);

  const resultados = {};
  for (const modelo of MODELOS) {
    resultados[modelo] = [];
    for (const caso of casos) {
      for (let r = 0; r < REPES; r += 1) {
        let out;
        try {
          out = await preguntar(modelo, b64(caso.ruta));
        } catch (e) {
          out = { texto: '', ms: 0, totalS: 0, error: String(e) };
        }
        const dijo = veredicto(out.texto);
        resultados[modelo].push({ ...caso, dijo, acierta: dijo === caso.verdad, ...out });
        process.stdout.write(dijo === caso.verdad ? '.' : (dijo === 'VACIA' ? '·' : 'x'));
      }
    }
    process.stdout.write('\n');
  }

  console.log('\n════════ RESULTADO DESGLOSADO (nunca un promedio) ════════');
  const resumen = {};
  for (const modelo of MODELOS) {
    const filas = resultados[modelo];
    const enf = filas.filter((f) => f.verdad === 'ENFERMA');
    const san = filas.filter((f) => f.verdad === 'SANA');
    const ok = (a) => a.filter((f) => f.acierta).length;
    const vacias = filas.filter((f) => f.dijo === 'VACIA' || f.dijo === 'ILEGIBLE').length;
    const seg = filas.map((f) => f.totalS).sort((a, b) => a - b);
    const mediana = seg[Math.floor(seg.length / 2)] || 0;
    // ¿Contesta siempre lo mismo? Es LA trampa que hay que poder ver.
    const dijoEnferma = filas.filter((f) => f.dijo === 'ENFERMA').length;
    resumen[modelo] = {
      enfermas: `${ok(enf)}/${enf.length}`,
      sanas: `${ok(san)}/${san.length}`,
      vacias_o_ilegibles: vacias,
      dijo_ENFERMA_en: `${dijoEnferma}/${filas.length}`,
      mediana_s: mediana.toFixed(2),
    };
    console.log(`\n── ${modelo}`);
    console.log(`   detecta la ENFERMA (sensibilidad): ${ok(enf)}/${enf.length}`);
    console.log(`   respeta la SANA   (especificidad): ${ok(san)}/${san.length}`);
    console.log(`   vacías o ilegibles:                ${vacias}`);
    console.log(`   dijo "ENFERMA" en:                 ${dijoEnferma}/${filas.length}  ← si es ~todas, no está mirando`);
    console.log(`   latencia mediana:                  ${mediana.toFixed(2)} s`);
    const truncadas = filas.filter((f) => f.doneReason === 'length').length;
    const pensadores = filas.filter((f) => f.pensando > 0).length;
    console.log(`   truncadas por presupuesto:         ${truncadas}  ← si >0, el arnés está midiendo mal`);
    console.log(`   razonó antes de contestar en:      ${pensadores}/${filas.length} (ignora think:false)`);
  }

  console.log('\n════════ MISMO RESULTADO, SIN LAS ETIQUETAS EN DISPUTA ════════');
  console.log('(el set que queda: sólo fotos donde la etiqueta no admite discusión)');
  for (const modelo of MODELOS) {
    const lim = resultados[modelo].filter((f) => !DISPUTADAS.has(f.id));
    const enf = lim.filter((f) => f.verdad === 'ENFERMA');
    const san = lim.filter((f) => f.verdad === 'SANA');
    const ok = (a) => a.filter((f) => f.acierta).length;
    console.log(`   ${modelo.padEnd(14)} enfermas ${ok(enf)}/${enf.length} · sanas ${ok(san)}/${san.length} · TOTAL ${ok(lim)}/${lim.length}`);
  }

  console.log('\n════════ CASO POR CASO ════════');
  for (const modelo of MODELOS) {
    console.log(`\n── ${modelo}`);
    for (const f of resultados[modelo]) {
      const marca = DISPUTADAS.has(f.id) ? '?? ' : (f.acierta ? 'ok ' : '>> ');
      const linea1 = (f.texto.split('\n')[0] || '').slice(0, 60);
      console.log(`  ${marca}[${f.verdad.padEnd(7)}] ${f.id.padEnd(30)} dijo=${f.dijo.padEnd(8)} "${linea1}"`);
    }
  }

  const salida = resolve(RAIZ, 'capturas-compai/bench-vision-matas.json');
  mkdirSync(dirname(salida), { recursive: true });
  writeFileSync(salida, JSON.stringify({ prompt: PROMPT, resumen, resultados }, null, 2));
  console.log(`\nvolcado completo (para leer las razones a mano): ${salida}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
