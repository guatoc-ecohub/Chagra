#!/usr/bin/env node
/**
 * arena-visual.mjs — mide cuál juez de visión sirve de verdad para el gate.
 *
 * El diseño del test es lo que importa: cada capacidad se prueba con un par de
 * capturas donde la respuesta correcta es OPUESTA (la misma escena en encuadre
 * ancho y en móvil, donde el móvil se come el contenido). Un juez complaciente
 * que responda SI a todo saca 50% y queda expuesto; sin el par negativo sacaría
 * 100% sin ver nada.
 *
 * Esto ataca el mismo sesgo que ya nos mordió en el bench de texto: un modelo
 * mudo puntuaba 0% de contaminación. Ahí contamos las vacías; acá emparejamos
 * cada positivo con su negativo.
 *
 * Uso:
 *   gpu-lock arena-visual -- node scripts/arena-visual.mjs
 *   node scripts/arena-visual.mjs --modelos gemma4:e4b,qwen2.5vl:7b
 *
 * La GPU de alpha admite UNA medición a la vez: SIEMPRE bajo gpu-lock.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const ALPHA = process.env.ALPHA_HOST || 'alpha';
const CAPS = '/home/kortux/Workspace/chagra/ops/capturas/mundos-muertos-2026-07-21';
const SALIDA = '/home/kortux/Workspace/chagra/data/arena-visual';

const MODELOS = (argVal('--modelos') || 'gemma4:e4b,qwen2.5vl:7b,gemma4:e2b').split(',');

/**
 * Verdad de campo. Sale del diagnóstico visual leído en el código, no de mirar
 * la imagen a ojo: por eso cada caso lleva `porque`.
 */
const CASOS = [
  // ── Par 1: el trapiche. Ancho lo muestra, móvil se lo come ──────────────
  { img: 'botica-cana-ancho-1280-etiquetas.png', pregunta: 'se ve un trapiche de cana (molino con techo de paja)?', verdad: true,
    porque: 'el trapiche esta en escena y visible en encuadre ancho' },
  { img: 'botica-cana-movil-390.png', pregunta: 'se ve un trapiche de cana (molino con techo de paja)?', verdad: false,
    porque: 'en 390x844 el encuadre deja dos tercios de pasto vacio: el trapiche queda fuera' },

  // ── Par 2: el cañal. Mismo corte ────────────────────────────────────────
  { img: 'botica-cana-ancho-1280-etiquetas.png', pregunta: 'se ve un cultivo de cana de azucar (plantas altas de tallo largo)?', verdad: true,
    porque: 'el canal existe en la escena, aunque este dibujado como pino' },
  { img: 'botica-cana-movil-390.png', pregunta: 'se ve un cultivo de cana de azucar (plantas altas de tallo largo)?', verdad: false,
    porque: 'fuera de cuadro en movil' },

  // ── Trampa de complacencia: nadie dibujó personas en ninguna ────────────
  { img: 'botica-cana-ancho-1280-etiquetas.png', pregunta: 'se ve alguna persona o figura humana?', verdad: false,
    porque: 'la copia habla del panelero pero no hay ni una figura humana dibujada' },
  { img: 'gallinero-ancho-1280.png', pregunta: 'se ve alguna persona o figura humana?', verdad: false,
    porque: 'el gallinero no tiene figuras humanas' },

  // ── Gallinero: presencia real vs ausencia real ──────────────────────────
  { img: 'gallinero-ancho-1280.png', pregunta: 'se ven gallinas?', verdad: true,
    porque: 'hay 8 gallinas, todas apinadas en la parcela 1' },
  { img: 'gallinero-ancho-1280.png', pregunta: 'se ve un tractor o maquinaria agricola?', verdad: true,
    porque: 'el tractor esta en escena, clavado en posicion fija' },
  { img: 'abejas-movil-390.png', pregunta: 'se ven gallinas?', verdad: false,
    porque: 'es el mundo de abejas: no hay ninguna gallina' },

  // ── Abejas: lo que hay y lo que la copia promete pero no está ───────────
  { img: 'abejas-movil-390.png', pregunta: 'se ven abejas volando?', verdad: true,
    porque: '9 angelitas orbitando anclas fijas' },
  { img: 'abejas-movil-390.png', pregunta: 'se ve alguna abeja posada SOBRE una flor?', verdad: false,
    porque: 'el hallazgo central del diagnostico: orbitan anclas en el aire, ninguna se posa' },
  { img: 'abejas-movil-390.png', pregunta: 'se ve un tractor o maquinaria agricola?', verdad: false,
    porque: 'no hay maquinaria en el mundo de abejas' },
];

function argVal(flag, def = null) {
  const i = process.argv.indexOf(flag);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

/** Manda la imagen a ollama en alpha (loopback-only) por ssh. */
function preguntar(modelo, imgPath, pregunta) {
  const py = `
import base64,json,urllib.request,time
b=base64.b64encode(open(${JSON.stringify(imgPath)},'rb').read()).decode()
p=${JSON.stringify(`Responda con una sola palabra, SI o NO, y nada mas. Pregunta: ${pregunta}`)}
t=time.time()
try:
    req=urllib.request.Request('http://localhost:11434/api/generate',
      data=json.dumps({'model':${JSON.stringify(modelo)},'prompt':p,'images':[b],
                       'stream':False,'think':False,'options':{'temperature':0}}).encode(),
      headers={'Content-Type':'application/json'})
    r=json.loads(urllib.request.urlopen(req,timeout=420).read())
    print(json.dumps({'ok':True,'resp':(r.get('response') or '').strip(),
                      'lat':round(time.time()-t,1),'done':r.get('done_reason')}))
except Exception as e:
    print(json.dumps({'ok':False,'err':str(e)[:120],'lat':round(time.time()-t,1)}))
`;
  try {
    // El script va por STDIN, no como `-c <script>`: ssh une sus argumentos y se
    // los entrega al shell remoto, que interpreta los paréntesis de Python antes
    // de que Python los vea ("error de sintaxis cerca de `('"). Con `python3 -`
    // el código no pasa nunca por el shell y no hay nada que escapar.
    const out = execFileSync('ssh', [ALPHA, 'python3', '-'], {
      input: py, encoding: 'utf-8', timeout: 460_000, maxBuffer: 1 << 20,
    });
    return JSON.parse(out.trim().split('\n').pop());
  } catch (e) {
    return { ok: false, err: String(e.message).slice(0, 120), lat: 0 };
  }
}

/** SI/NO del texto libre. `null` = no se pudo leer una respuesta -> cuenta como vacía. */
function interpretar(txt) {
  if (!txt) return null;
  const t = txt.toLowerCase().replace(/[^a-záéíóúñ ]/g, ' ');
  const si = /\b(si|sí|yes)\b/.test(t);
  const no = /\b(no|not)\b/.test(t);
  if (si && !no) return true;
  if (no && !si) return false;
  return null; // ambigua o vacía: NO se le regala el punto
}

async function main() {
  console.log(`[arena] ${CASOS.length} casos × ${MODELOS.length} modelos — ollama en ${ALPHA}`);
  console.log('[arena] cada capacidad va emparejada con su caso NEGATIVO: un juez');
  console.log('[arena] complaciente que diga SI a todo saca 50%, no 100%.\n');

  // Copiar las capturas a alpha una sola vez.
  for (const c of new Set(CASOS.map((c) => c.img))) {
    const src = join(CAPS, c);
    if (!existsSync(src)) { console.error(`  falta la captura: ${src}`); process.exit(1); }
    execFileSync('scp', ['-q', src, `${ALPHA}:/tmp/arena-${c}`]);
  }
  console.log(`[arena] ${new Set(CASOS.map((c) => c.img)).size} capturas copiadas a ${ALPHA}\n`);

  const filas = [];
  for (const modelo of MODELOS) {
    let ok = 0, vacias = 0, sies = 0, latTotal = 0, fallos = 0;
    console.log(`── ${modelo} ──`);
    for (const caso of CASOS) {
      const r = preguntar(modelo, `/tmp/arena-${caso.img}`, caso.pregunta);
      if (!r.ok) { fallos++; console.log(`   FALLO  ${caso.img.slice(0, 22)} — ${r.err}`); continue; }
      const dijo = interpretar(r.resp);
      const acerto = dijo !== null && dijo === caso.verdad;
      if (dijo === null) vacias++; else if (dijo) sies++;
      if (acerto) ok++;
      latTotal += r.lat;
      filas.push({ modelo, ...caso, respuesta: r.resp, interpretado: dijo, acerto, lat: r.lat });
      console.log(`   ${acerto ? '✅' : dijo === null ? '⬜' : '❌'} ${String(caso.verdad).padEnd(5)} ` +
                  `${caso.pregunta.slice(0, 46).padEnd(46)} → ${String(r.resp).slice(0, 18).padEnd(18)} ${r.lat}s`);
    }
    const n = CASOS.length - fallos;
    const pct = n ? Math.round((ok / n) * 100) : 0;
    // Un juez que responde SI a todo acierta solo los positivos: hay que verlo.
    const sesgo = n ? Math.round((sies / n) * 100) : 0;
    console.log(`   ── ${modelo}: ${pct}% acierto (${ok}/${n}) · ${vacias} ambiguas · ` +
                `${sesgo}% dijo SI · ${n ? (latTotal / n).toFixed(1) : 0}s promedio\n`);
  }

  execFileSync('mkdir', ['-p', SALIDA]);
  const out = join(SALIDA, 'resultados.jsonl');
  writeFileSync(out, filas.map((f) => JSON.stringify(f)).join('\n') + '\n');
  console.log(`[arena] escrito: ${out}`);

  console.log('\n════════ RESUMEN ════════');
  for (const m of MODELOS) {
    const f = filas.filter((x) => x.modelo === m);
    if (!f.length) { console.log(`  ${m.padEnd(16)} sin datos`); continue; }
    const ok = f.filter((x) => x.acerto).length;
    const pos = f.filter((x) => x.verdad), neg = f.filter((x) => !x.verdad);
    const okPos = pos.filter((x) => x.acerto).length, okNeg = neg.filter((x) => x.acerto).length;
    console.log(`  ${m.padEnd(16)} ${Math.round((ok / f.length) * 100)}% global · ` +
                `presencia ${okPos}/${pos.length} · AUSENCIA ${okNeg}/${neg.length} · ` +
                `${(f.reduce((a, x) => a + x.lat, 0) / f.length).toFixed(1)}s`);
  }
  console.log('\n  La columna que decide es AUSENCIA: detectar que algo NO está es lo');
  console.log('  que un gate visual necesita y lo que un modelo complaciente falla.');
}

main().catch((e) => { console.error(e); process.exit(1); });
