/*
 * sueloComparado.geom — la GEOMETRÍA del MISMO SUELO EN DOS ESTADOS: la red
 * micorrízica encendida y la red apagada bajo fumigación repetida.
 *
 * Funciones PURAS y testeables (three-core, corre headless — cero contexto GL,
 * cero azar por frame, cero assets externos). El componente r3f
 * (`EscenaSueloComparado.jsx`) le pone luz, material aditivo y tiempo.
 *
 * ── EL ARGUMENTO QUE DIBUJA (y por qué este, y no otro) ─────────────────────
 * Al campesino el argumento moral no le sirve: el glifosato es barato, es
 * efectivo y se lo vendieron. El argumento que SÍ le sirve es de su propio
 * bolsillo: le está apagando el suelo que le da de comer, y un suelo apagado lo
 * vuelve dependiente del bulto.
 *
 * La pieza NO es un panfleto. No hay calaveras, no hay rojo de catástrofe, no
 * hay muerte gótica. El lado apagado no es horror: es SILENCIO. Tierra pálida,
 * quieta, sin olor. Así lo dice el propio corpus — "un suelo sin ningún olor
 * particular puede indicar poca vida biológica". La ausencia asusta más que la
 * calavera, y además es verdad.
 *
 * ── LO QUE ESTA PIEZA AFIRMA (todo con fuente en el corpus de Chagra) ───────
 *   La red y el intercambio (teacher-micorrizas):
 *     [19] "La planta le paga al hongo con azúcares que ella misma fabrica con
 *          la luz del sol... A cambio, el hongo usa sus hilos finísimos para
 *          buscar FÓSFORO y AGUA en rincones del suelo donde la raíz sola nunca
 *          llegaría." → los pulsos: carbono BAJA, fósforo/agua SUBEN.
 *     [25] el hongo también aporta "micronutrientes como el ZINC y el COBRE".
 *          (OJO: zinc y cobre. NO manganeso, NO hierro — ver abajo.)
 *     [20] el azúcar que la mata entrega "no es un regalo que la debilite: es
 *          una inversión".
 *   El daño (teacher-micorrizas + dpo-frontera-agroecologica):
 *     [36] arar de más "corta físicamente esos hilos finísimos del hongo que
 *          tardan MESES en reconstruirse" → los hilos rotos, con hueco.
 *     [45] los herbicidas "eliminan de golpe muchas raíces vivas que
 *          alimentaban a la red". El mismo corpus se frena ahí: "algunos
 *          componentes activos han mostrado efectos negativos sobre
 *          microorganismos del suelo en distintos estudios. NO LE PUEDO DAR UNA
 *          CIFRA EXACTA." Ese freno es parte del material.
 *     [40] el hongo "necesita una raíz viva para sobrevivir" → suelo pelado = la
 *          red "se muere de hambre por falta de raíces que alimentar".
 *   dpo-frontera-agroecologica (la voz buena, el `chosen`):
 *     [0]  el glifosato "mata la raíz y también se lleva la vida del suelo que
 *          usted necesita para el potrero de después: hongos, lombriz, todo".
 *     [2]  "mata microorganismos del suelo y contamina agua si hay quebrada
 *          cerca".
 *     [18] "deja el suelo más pobre en vida microbiana, y con suelo pobre usted
 *          termina DEPENDIENDO DE COMPRAR CADA VEZ MÁS INSUMO" → el círculo.
 *     [16] el kikuyo "se riega por RIZOMA, y el químico solo lo quema por
 *          encima; a las semanas rebrota de la raíz que quedó viva" → el
 *          círculo vicioso REAL, que es rebrote, no resistencia.
 *   La trampa del fósforo (LA pieza central del argumento):
 *     [21] las micorrizas "liberan sustancias que ayudan a SOLTAR el fósforo que
 *          está 'pegado' a partículas de arcilla o hierro".
 *     [30] "en suelos ácidos como muchos de ladera andina, [el fósforo] se pega
 *          al hierro y al aluminio".
 *     [32] sin red, "la planta queda más vulnerable, dependiendo del insumo
 *          comprado en vez de la relación natural del suelo. AHÍ ESTÁ LA
 *          TRAMPA."
 *          → Por eso el fósforo del lado apagado se dibuja PRESENTE PERO QUIETO,
 *            pegado a su partícula. Está ahí. La mata no lo alcanza. Es el
 *            argumento entero en un solo gesto visual.
 *   Las señales que el campesino puede ver con una pala (teacher-micorrizas):
 *     [100] "huela un puñado de tierra húmeda... busque LOMBRICES al cavar,
 *           fíjese si hay raíces finas blancas con textura algodonosa... y vea
 *           si el suelo se rompe en GRUMOS en vez de ser polvo suelto".
 *     [102] "si al cavar no aparece ninguna [lombriz]... es una alerta".
 *     [105] los grumos son "pequeñas migas de pan húmedas que no se deshacen
 *           fácil al tocarlas" → agregados vs polvo.
 *     [22]  los hilos del hongo llegan "a poros muy pequeños del suelo donde
 *           queda agua atrapada después de que la superficie ya se secó".
 *   La esperanza (y no es blandita — es la parte mejor documentada):
 *     [49] "La micorriza puede recuperarse si cambia el manejo... puede tomar
 *          VARIAS TEMPORADAS, pero EL SUELO TIENE MEMORIA BIOLÓGICA y con buenas
 *          prácticas sostenidas LA RED VUELVE A TEJERSE, sobre todo si cerca hay
 *          un rastrojo o bosque que sirva de FUENTE DE ESPORAS."
 *     [65] el "BANCO DE ESPORAS que ya existe en su propia región".
 *     [80] la asimetría: "mucho más rápido de perder que de ganar".
 *          → Y por eso el frente AVANZA rápido y RETROCEDE lento. La asimetría
 *            no es un gusto de animación: es el dato.
 *     [82] "la naturaleza sabe reconstruirse si uno deja de interrumpirla".
 *
 * ── LO QUE ESTA PIEZA *NO* AFIRMA (regla dura — no la rompás) ───────────────
 * Si mañana alguien quiere "mejorar" esto agregando lo de abajo: NO. Está fuera
 * a propósito, y cada exclusión tiene su razón.
 *
 *   1. NADA sobre glifosato y cáncer o salud humana. Esta pieza va del SUELO,
 *      donde la evidencia es clara y el argumento es del propio interés del
 *      campesino. La salud humana está en disputa real (IARC lo llama
 *      probablemente cancerígeno; Bayer apartó ~US$10.900M por demandas; una
 *      corte anuló la evaluación de la EPA) — y una disputa no se dibuja como
 *      hecho. Además no hace falta: el argumento del suelo es más fuerte
 *      PRECISAMENTE porque no necesita asustar a nadie.
 *   2. NADA de quelación de micronutrientes, ni manganeso, ni AMPA, ni ruta del
 *      shikimato. Se verificó por grep sobre los 20 .jsonl del corpus: CERO
 *      coincidencias. No están. No se inventan. (El corpus sí da zinc y cobre
 *      como aportes del hongo, y hierro/aluminio como lo que PEGA el fósforo —
 *      eso es lo que se dibuja, y es mejor argumento que la quelación.)
 *   3. NADA de "resistencia de malezas". CERO hits en el corpus. Lo que sí hay
 *      es el REBROTE del rizoma del kikuyo [16], que es otra cosa y es honesto.
 *      El círculo vicioso se dibuja con eso.
 *   4. NINGUNA cifra de dosis como si fuera dato de la casa. Las cifras que
 *      existen ("3-4 litros por hectárea", "en ocho días ve el potrero limpio",
 *      "repita cada tres o cuatro semanas") viven TODAS en el campo `rejected`
 *      del DPO: son la voz que el corpus RECHAZA. Si aparecen, aparecen marcadas
 *      como la voz del bulto — nunca en boca de la pieza.
 *   5. NADA de calaveras, rojo de alarma, insectos muertos, goteo tóxico verde
 *      fosforescente. La paleta madre es explícita: el rojo es cochinilla y café
 *      cereza, "nunca rojo catástrofe de UI".
 *   6. NADA de absolutismo. El corpus mismo [17] concede: "en una invasión muy
 *      agresiva... un uso puntual y muy focalizado puede ser la única salida
 *      real, y no se lo voy a negar solo por principio. Pero eso es la
 *      excepción... Lo que no hacemos acá es recetarlo como rutina de
 *      calendario." Esa concesión VA en la pieza. Un arte que no concede nada no
 *      lo creen, y con razón.
 *
 * ── EL MODELO ──────────────────────────────────────────────────────────────
 * UN solo suelo, visto como vitrina de acuario (la cámara bajo tierra). No hay
 * dos escenas ni una línea divisoria dura: hay un CAMPO DE SALUD continuo
 * `saludEn(x, frente)` que va de 1 (red encendida) a 0 (red apagada) a lo largo
 * del eje X. Cada elemento —hilo, nodo, pulso, lombriz, grumo, poro— lee su
 * propia salud de su posición y se dibuja en consecuencia.
 *
 * Mover `frente` es toda la narrativa: hacia la izquierda, el suelo se apaga;
 * hacia la derecha, la red vuelve a tejerse desde el banco de esporas. Un solo
 * número cuenta la historia entera, en los dos sentidos, con la asimetría de
 * velocidad que manda el corpus.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* PRNG determinista: el mismo suelo en cada carga, en cada equipo, en cada
   test. Nada de Math.random (un suelo que cambia de forma al recargar no es un
   suelo, es un salvapantallas). */
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* smoothstep: la transición de la casa. El suelo no tiene bordes duros. */
const suave = (t) => t * t * (3 - 2 * t);
const mezcla = (a, b, t) => a + (b - a) * t;

/*
 * PALETA. Hermana de la de `micorrizas.geom.js` (mismo mundo, mismo idioma
 * bioluminiscente) pero DECLARADA LOCAL a propósito: la rama `capas-suelo-b2`
 * está reescribiendo ese módulo ahora mismo, y esta pieza no puede romperse
 * cuando aquella aterrice. Los tonos de tierra/raíz salen de la paleta madre
 * (`../paleta`): TIERRAS.cacao, TIERRAS.turba, CORTEZAS.raicilla.
 *
 * La regla de color de la pieza, y es toda la dirección de arte:
 *   VIVO   = luz fría de luciérnaga (turquesa) + el ámbar del mineral que sube.
 *   APAGADO= no es negro ni rojo: es PÁLIDO Y SECO. El color se va, no se
 *            ensucia. Un suelo apagado no grita — se calla.
 */
export const PALETA = {
  /* la tierra (de la paleta madre, oscurecida para la vitrina) */
  tierra: new THREE.Color('#120c09'), // fondo hondo, cálido casi negro
  tierraAlta: new THREE.Color('#241811'), // cerca de la superficie
  tierraSeca: new THREE.Color('#6b5a48'), // el lado apagado: pálido, polvoso

  /* la red encendida */
  micelio: new THREE.Color('#37d6b0'), // hifa: turquesa de hongo
  micelioTenue: new THREE.Color('#1c6f63'), // hifa lejana
  puente: new THREE.Color('#7ef0c8'), // el hilo que cruza de mata a mata
  nodo: new THREE.Color('#9df5da'), // unión del micelio
  arbusculo: new THREE.Color('#ffd27a'), // punta de raíz: sitio de intercambio

  /* la red apagada — el mismo hilo, sin luz. No muerto: APAGADO. */
  micelioMuerto: new THREE.Color('#4a4237'), // hifa rota, color de ceniza tibia
  trazaFantasma: new THREE.Color('#2e2a23'), // por donde la red PASABA (ver nota)

  /* los pulsos: el intercambio hablando por color */
  fosforo: new THREE.Color('#ffc766'), // mineral que SUBE a la mata
  agua: new THREE.Color('#8fd4ff'), // agua que SUBE
  carbono: new THREE.Color('#8ef06a'), // azúcar que BAJA al hongo
  zinc: new THREE.Color('#cfe3f0'), // zinc/cobre [25]: el aporte menor

  /* la trampa: el fósforo que SÍ está, pegado al hierro y la arcilla [21][30] */
  fosforoPegado: new THREE.Color('#8a6b3c'), // ámbar apagado: presente, inalcanzable
  particulaHierro: new THREE.Color('#7a4a38'), // la partícula que lo agarra

  /* la vida que se ve con una pala [100] */
  lombriz: new THREE.Color('#d9a08a'), // la lombriz rosada del suelo vivo
  tunelVacio: new THREE.Color('#3a3129'), // su túnel, cuando ya no está
  grumo: new THREE.Color('#5a3d28'), // = TIERRAS.turba: la miga de pan húmeda
  polvo: new THREE.Color('#9a8b74'), // = TIERRAS.piedra: polvo suelto
  gotaAgua: new THREE.Color('#6fb8d8'), // el agua en el poro

  /* la esperanza, y no se apaga nunca */
  espora: new THREE.Color('#d8b6f0'), // perla malva: el banco de esporas [65]

  /* arriba */
  raiz: new THREE.Color('#c8a878'), // raíz viva
  raizFina: new THREE.Color('#f0e4cc'), // la raicilla blanca algodonosa [100]
  tallo: new THREE.Color('#5f8a3a'), // = VERDES.trabajo
  hojarasca: new THREE.Color('#8a6a44'), // = TIERRAS.camino: la cobertura
};

/*
 * Volumen del suelo (metros-escena). Superficie en y=0; abajo negativo. Ancho y
 * de poca profundidad en Z: una vitrina de acuario de tierra. El eje X es el eje
 * del argumento — izquierda vivo, derecha apagado.
 */
export const SUELO = { ancho: 9.2, hondo: 5.0, z0: 0.85, zAtras: -1.4 };

/* Los extremos del eje X, con nombre (para cámara, hotspots y tests). */
export const LADOS = {
  vivo: -SUELO.ancho / 2 + 1.2,
  apagado: SUELO.ancho / 2 - 1.2,
};

/*
 * PARÁMETROS por tier (tier-safe). El "wow" vive en 'alto'; 'medio' es frugal;
 * 'bajo' es el mínimo digno — se lee la red y se lee el contraste, que es lo
 * único que esta pieza NO puede perder. En gama baja el argumento sigue
 * entrando: menos hilos, sin pulsos, pero el fósforo pegado y la lombriz que
 * falta se ven igual. Esa es la prioridad de degradación.
 */
export const PARAMS_TIER = {
  alto: {
    matas: 5, nodosLibres: 26, pulsos: 140, tubK: 18, tubM: 6, radioHilo: 0.016,
    vecinos: 2, radialRaiz: 7, lombrices: 5, grumos: 120, poros: 46,
    fosforoPegado: 34, esporas: 16, motas: 90, hojarasca: 40,
  },
  medio: {
    matas: 4, nodosLibres: 16, pulsos: 58, tubK: 12, tubM: 5, radioHilo: 0.015,
    vecinos: 2, radialRaiz: 6, lombrices: 3, grumos: 60, poros: 24,
    fosforoPegado: 20, esporas: 10, motas: 40, hojarasca: 20,
  },
  bajo: {
    matas: 3, nodosLibres: 9, pulsos: 0, tubK: 7, tubM: 4, radioHilo: 0.015,
    vecinos: 1, radialRaiz: 5, lombrices: 2, grumos: 26, poros: 0,
    fosforoPegado: 12, esporas: 6, motas: 0, hojarasca: 0,
  },
};

/** Parámetros para un tier (desconocido → 'medio'). */
export const paramsDeTier = (tier) => PARAMS_TIER[tier] || PARAMS_TIER.medio;

/* ── EL CAMPO DE SALUD ─────────────────────────────────────────────────────
 * El corazón del modelo. `frente` es la X donde la red se está apagando;
 * `borrosidad` es qué tan difusa es esa transición (nunca 0: en el suelo real no
 * hay una raya pintada).
 *
 * salud = 1 → red encendida, intercambio corriendo.
 * salud = 0 → red apagada, el mineral quieto, la mata comiendo del bulto.
 */
/**
 * Salud de la red en la coordenada `x`.
 * @param {number} x  coordenada del eje del argumento
 * @param {number} frente  X del frente de avance
 * @param {number} [borrosidad]  ancho de la transición (media anchura)
 * @returns {number} 1 (vivo) → 0 (apagado)
 */
export function saludEn(x, frente, borrosidad = 1.25) {
  const b = Math.max(borrosidad, 1e-3);
  const t = THREE.MathUtils.clamp((x - frente + b) / (2 * b), 0, 1);
  return 1 - suave(t);
}

/* ── LAS MATAS Y SUS RAÍCES ────────────────────────────────────────────────
 * Las matas están a lo largo del eje: las mismas plantas, el mismo suelo. Ojo
 * con la trampa narrativa: las matas del lado apagado NO se dibujan muertas. El
 * campesino fumiga y la mata sigue ahí, verde, viva. Ese es el punto —
 * exactamente por eso no ve el problema. Lo que cambia bajo tierra es la
 * RAICILLA FINA ALGODONOSA [100] y la red que la alimentaba.
 */
/**
 * Sistema de raíces de las matas, a lo ancho del suelo.
 * @param {ReturnType<typeof paramsDeTier>} params
 * @param {number} [seed]
 * @returns {{ matas: Array, puntas: Array }}
 */
export function sistemaRaices(params, seed = 20260714) {
  const r = rng(seed);
  const matas = [];
  const puntas = [];
  const n = params.matas;
  for (let i = 0; i < n; i++) {
    /* repartidas a lo ancho, con un jitter que las saca de la grilla */
    const x = mezcla(-SUELO.ancho / 2 + 1.0, SUELO.ancho / 2 - 1.0, n === 1 ? 0.5 : i / (n - 1))
      + (r() - 0.5) * 0.45;
    const z = mezcla(SUELO.zAtras + 0.4, SUELO.z0 - 0.3, r());
    const mata = { id: i, base: new THREE.Vector3(x, 0, z), ramas: [], puntas: [] };

    /* el eje principal baja y se abre */
    const hondo = mezcla(SUELO.hondo * 0.42, SUELO.hondo * 0.72, r());
    for (let k = 0; k < params.radialRaiz; k++) {
      const ang = (k / params.radialRaiz) * Math.PI * 2 + r() * 0.5;
      const largo = hondo * mezcla(0.45, 1.0, r());
      const abre = mezcla(0.35, 1.05, r());
      const pts = [];
      const pasos = 5;
      for (let s = 0; s <= pasos; s++) {
        const t = s / pasos;
        pts.push(new THREE.Vector3(
          x + Math.cos(ang) * abre * t * mezcla(0.8, 1.2, r()),
          -largo * suave(t),
          z + Math.sin(ang) * abre * t * 0.55,
        ));
      }
      const curva = new THREE.CatmullRomCurve3(pts);
      const punta = pts[pts.length - 1].clone();
      mata.ramas.push({ curva, grosor: mezcla(0.6, 1.0, r()) });
      mata.puntas.push(punta);
      /* las puntas son los ARBÚSCULOS: donde de verdad ocurre el intercambio */
      puntas.push({ pos: punta, mata: i });
    }
    matas.push(mata);
  }
  return { matas, puntas };
}

/* ── LOS NODOS LIBRES DEL MICELIO ──────────────────────────────────────────
 * Uniones del micelio lejos de las raíces: la red no es solo "pelito en la
 * raíz", es un tejido que ocupa el suelo entero [78] ("es más bien la capa que
 * conecta a todas las demás entre sí").
 */
/**
 * Nodos de micelio repartidos por el volumen del suelo.
 * @returns {Array<{pos: THREE.Vector3, mata: null, tipo: string}>}
 */
export function nodosLibres(params, seed = 991) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < params.nodosLibres; i++) {
    out.push({
      pos: new THREE.Vector3(
        mezcla(-SUELO.ancho / 2 + 0.5, SUELO.ancho / 2 - 0.5, r()),
        -mezcla(0.35, SUELO.hondo * 0.85, r()),
        mezcla(SUELO.zAtras + 0.3, SUELO.z0 - 0.2, r()),
      ),
      mata: null,
      tipo: 'nodo',
    });
  }
  return out;
}

/* ── LA RED ────────────────────────────────────────────────────────────────
 * Grafo: cada nodo se enlaza a sus vecinos más cercanos. Un hilo que une nodos
 * de matas DISTINTAS es un PUENTE: ahí se lee el reparto (por qué el maíz, el
 * fríjol y la ahuyama se ayudan por debajo, y por qué el árbol grande alimenta
 * a la matica de su sombra [3]).
 */
/*
 * LOS PUENTES NO SALEN SOLOS. HAY QUE TEJERLOS A MANO.
 *
 * Esto se me fue completo y lo cazó el chequeo headless: CERO puentes en los
 * tres tiers. La red se veía preciosa y no cruzaba de una mata a otra ni una
 * vez — o sea, faltaba justo lo único que esta escena existe para mostrar.
 *
 * El motivo, obvio en retrospectiva: el vecino más cercano de una punta de raíz
 * del maíz es SIEMPRE otra punta del maíz. Están todas en la misma mata, a
 * centímetros. Un grafo de "los k vecinos más cercanos" jamás va a saltar los
 * dos metros que hay hasta el fríjol. El puente es exactamente la conexión que
 * la cercanía NO produce — por eso hay que pedirla explícita.
 *
 * Y es la falla más cara posible: no truena, no se ve rara. Simplemente el
 * "wood-wide web" no conectaba nada y la pieza entera argumentaba en falso, en
 * silencio. Como las matas de `sucesion.geom.js` que se caían sin avisar.
 *
 * Se tejen entre matas VECINAS en el eje (no todas contra todas: eso sería una
 * maraña y además falso — la red es un tejido local, no un cableado de central
 * telefónica), uniendo el par de puntas más cercano de cada par de matas.
 */
function tejerPuentes(nodos, hilos, matas, params, vistos) {
  const porMata = new Map();
  nodos.forEach((n, i) => {
    if (n.mata === null) return;
    if (!porMata.has(n.mata)) porMata.set(n.mata, []);
    porMata.get(n.mata).push(i);
  });
  /* de izquierda a derecha: cada mata se une con la siguiente */
  const orden = [...matas].sort((a, b) => a.base.x - b.base.x).map((m) => m.id);
  const cuantos = params.vecinos >= 2 ? 2 : 1;

  for (let k = 0; k + 1 < orden.length; k++) {
    const A = porMata.get(orden[k]) || [];
    const B = porMata.get(orden[k + 1]) || [];
    const pares = [];
    for (const i of A) for (const j of B) pares.push({ i, j, d: nodos[i].pos.distanceTo(nodos[j].pos) });
    pares.sort((x, y) => x.d - y.d);
    let puestos = 0;
    for (const p of pares) {
      if (puestos >= cuantos) break;
      const clave = p.i < p.j ? `${p.i}-${p.j}` : `${p.j}-${p.i}`;
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      hilos.push({ a: p.i, b: p.j, puente: true, largo: p.d });
      puestos++;
    }
  }
  return hilos;
}

/**
 * Construye el grafo de la red: puntas de raíz + nodos libres, enlazados por
 * cercanía, MÁS los puentes explícitos entre matas vecinas (ver arriba: sin eso
 * la red no cruza nunca y la escena miente).
 * @returns {{ nodos: Array, hilos: Array }}
 */
export function construirRed(puntas, libres, params, matas = []) {
  const nodos = [
    ...puntas.map((p) => ({ pos: p.pos, mata: p.mata, tipo: 'raiz' })),
    ...libres,
  ];
  const hilos = [];
  const vistos = new Set();
  for (let i = 0; i < nodos.length; i++) {
    /* los vecinos más cercanos de i */
    const cerca = nodos
      .map((n, j) => ({ j, d: nodos[i].pos.distanceTo(n.pos) }))
      .filter((c) => c.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, params.vecinos);
    for (const c of cerca) {
      const clave = i < c.j ? `${i}-${c.j}` : `${c.j}-${i}`;
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      const a = nodos[i];
      const b = nodos[c.j];
      /* por cercanía esto casi nunca es puente; se marca igual por si acaso */
      const puente = a.mata !== null && b.mata !== null && a.mata !== b.mata;
      hilos.push({ a: i, b: c.j, puente, largo: c.d });
    }
  }
  tejerPuentes(nodos, hilos, matas, params, vistos);
  return { nodos, hilos };
}

/**
 * La curva de un hilo: nunca recto. Una hifa busca, no traza.
 * El pandeo sale del PRNG por índice → determinista y estable entre frames.
 */
export function curvaHilo(pa, pb, idx) {
  const r = rng(idx * 7919 + 13);
  const med = pa.clone().add(pb).multiplyScalar(0.5);
  const d = pb.clone().sub(pa).length();
  med.x += (r() - 0.5) * d * 0.35;
  med.y += (r() - 0.5) * d * 0.3;
  med.z += (r() - 0.5) * d * 0.3;
  return new THREE.CatmullRomCurve3([pa.clone(), med, pb.clone()]);
}

/* ── LA GEOMETRÍA DE LA RED: UN SOLO DRAW-CALL ─────────────────────────────
 * Toda la red (viva, rota y fantasma) en UNA malla fundida con color por
 * vértice. El estado de cada hilo NO es un material distinto: es color.
 *
 * EL GESTO CENTRAL DE LA PIEZA — cómo se rompe un hilo:
 * Un hilo con salud baja no se borra de golpe (eso sería un interruptor, y el
 * suelo no tiene interruptor). Se FRAGMENTA: se le abren HUECOS, y lo que queda
 * pierde la luz. El corpus [36] dice "corta físicamente esos hilos finísimos" —
 * y eso es literal, así que el corte se dibuja literal.
 *
 * La TRAZA FANTASMA: donde el hilo estaba, queda un rastro apenas visible. Es un
 * recurso de ARTE, no una afirmación biológica — no digo que quede un fideo
 * muerto en el suelo. Dice dos cosas a la vez: aquí HABÍA red (el campesino
 * perdió algo que no sabía que tenía), y aquí PUEDE volver (la traza es el molde
 * por donde se re-teje [49]). Sin la traza, el lado apagado sería un vacío y no
 * se leería la pérdida — se leería "acá nunca hubo nada", que es justo la
 * mentira que la pieza combate.
 */
/*
 * POR QUÉ ESTA GEOMETRÍA NO SABE DÓNDE ESTÁ EL FRENTE
 *
 * El frente se MUEVE (esa es la narrativa), y reconstruir ~100 tubos por frame
 * en un teléfono de gama baja no es una opción: es la diferencia entre una pieza
 * que se ve y una que el campesino cierra a los tres segundos.
 *
 * Entonces la malla se construye UNA VEZ, a radio pleno y sin cortes, y lleva
 * horneado lo que el shader necesita para decidir por sí mismo, por vértice:
 *   aCentro — el punto de la línea central (para colapsar el anillo y hacer el
 *             hueco: si el anillo entero se va al centro, el triángulo queda de
 *             área cero y no se dibuja. Ese es el truco del corte: sale gratis y
 *             no necesita `discard`, que en gama baja se paga caro).
 *   aT      — el parámetro a lo largo del hilo (para la onda de los huecos).
 *   aFase   — la fase del hilo (para que no se piquen todos igual).
 *   aPuente — 1 si el hilo cruza de una mata a otra.
 *
 * Con eso, mover el frente cuesta UN uniform (`uFrente`). Cero rebuilds, cero
 * basura por frame, un solo draw-call para toda la red — viva, rota y fantasma.
 *
 * El módulo sigue puro y headless: emite números, no GLSL. El shader vive en el
 * .jsx, que es donde va el look. `saludEn()` de acá y el `smoothstep` de allá
 * calculan LO MISMO a propósito (ver la nota en el shader): así el test en Node
 * y el pixel en pantalla no se pueden contradecir.
 */
/**
 * Malla fundida de la red completa, con los atributos que el shader necesita
 * para apagarla y prenderla solo.
 * @param {Array} nodos
 * @param {Array} hilos
 * @param {ReturnType<typeof paramsDeTier>} params
 * @returns {{ geo: THREE.BufferGeometry, curvas: Array }}
 */
export function geometriaRed(nodos, hilos, params) {
  const pos = [];
  const centro = [];
  const ts = [];
  const fases = [];
  const puentes = [];
  const idx = [];
  const curvas = [];
  const K = params.tubK;
  const M = params.tubM;
  let base = 0;

  for (let h = 0; h < hilos.length; h++) {
    const hilo = hilos[h];
    const curva = curvaHilo(nodos[hilo.a].pos, nodos[hilo.b].pos, h);
    curvas.push(curva);

    /* la fase del picado, determinista por hilo: sin esto todos los hilos se
       romperían con el mismo ritmo y se vería una reja, no un tejido */
    const faseHueco = rng(h * 104729 + 7)();
    const rVivo = params.radioHilo * (hilo.puente ? 1.25 : 1);
    const pts = curva.getPoints(K);

    for (let i = 0; i <= K; i++) {
      const t = i / K;
      const tang = curva.getTangent(t);
      const up = Math.abs(tang.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      const n1 = new THREE.Vector3().crossVectors(tang, up).normalize();
      const n2 = new THREE.Vector3().crossVectors(tang, n1).normalize();
      for (let j = 0; j < M; j++) {
        const a = (j / M) * Math.PI * 2;
        const off = n1.clone().multiplyScalar(Math.cos(a) * rVivo)
          .add(n2.clone().multiplyScalar(Math.sin(a) * rVivo));
        pos.push(pts[i].x + off.x, pts[i].y + off.y, pts[i].z + off.z);
        centro.push(pts[i].x, pts[i].y, pts[i].z);
        ts.push(t);
        fases.push(faseHueco);
        puentes.push(hilo.puente ? 1 : 0);
      }
    }
    for (let i = 0; i < K; i++) {
      for (let j = 0; j < M; j++) {
        const a = base + i * M + j;
        const b = base + i * M + ((j + 1) % M);
        const d = base + (i + 1) * M + j;
        const e = base + (i + 1) * M + ((j + 1) % M);
        idx.push(a, d, b, b, d, e);
      }
    }
    base += (K + 1) * M;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aCentro', new THREE.Float32BufferAttribute(centro, 3));
  geo.setAttribute('aT', new THREE.Float32BufferAttribute(ts, 1));
  geo.setAttribute('aFase', new THREE.Float32BufferAttribute(fases, 1));
  geo.setAttribute('aPuente', new THREE.Float32BufferAttribute(puentes, 1));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return { geo, curvas };
}

/* ── LOS PULSOS: EL INTERCAMBIO HABLANDO ───────────────────────────────────
 * Por los hilos vivos corren los nutrientes. El color dice el sentido, y el
 * sentido ES el argumento [19]:
 *   carbono (verde)  BAJA  — el azúcar que la mata paga con luz de sol.
 *   fósforo (ámbar)  SUBE  — el mineral que la raíz sola no alcanzaba.
 *   agua    (azul)   SUBE  — de los poros chiquitos que ya se secaron arriba [22].
 *   zinc    (pálido) SUBE  — el aporte menor pero real [25].
 *
 * EL GESTO: en un hilo apagado el pulso NO llega. Y no desaparece de golpe —
 * FRENA. Se va poniendo lento a medida que entra en la zona apagada, se achica,
 * y se queda quieto contra el corte. El ojo lee un atasco, no un apagón.
 *
 * Eso importa: el intercambio no se "reduce" un 30%, se INTERRUMPE. Y del lado
 * de la mata el azúcar sigue saliendo (la mata no sabe que el hilo está roto:
 * sigue pagando). Un pulso verde bajando hacia un hilo cortado, que se frena y
 * se apaga sin que nada vuelva, es la imagen más honesta que tiene esta pieza —
 * la mata pagando por un servicio que ya no existe.
 *
 * Por eso el pulso se integra por frame contra el frente VIVO, en vez de
 * repartirse por una salud congelada al construir.
 *
 * Estos datos son INMUTABLES: `t0` es solo el arranque. El avance lo lleva la
 * escena en su propio estado — así estos pulsos se pueden reusar, testear o
 * pintar dos veces sin arrastrar el `t` de una animación ajena.
 */
/**
 * Pulsos repartidos por los hilos (datos inmutables; el avance lo lleva quien
 * los anima, arrancando en `t0`).
 * @returns {Array<{hilo:number, t0:number, vel:number, tipo:string, sube:boolean}>}
 */
export function pulsosDeRed(hilos, params, seed = 4242) {
  if (!params.pulsos || !hilos.length) return [];
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < params.pulsos; i++) {
    const h = Math.min(hilos.length - 1, Math.floor(r() * hilos.length));
    const dado = r();
    /* más mineral subiendo que azúcar bajando: así es el trato, le sale
       ganancioso a la mata [20] */
    const sube = dado > 0.42;
    const tipo = sube
      ? (dado > 0.82 ? 'agua' : dado > 0.74 ? 'zinc' : 'fosforo')
      : 'carbono';
    const t0 = r();
    out.push({ hilo: h, t0, vel: mezcla(0.16, 0.42, r()), tipo, sube });
  }
  return out;
}

/** El color de un pulso por tipo. */
export const colorPulso = (tipo) => PALETA[tipo] || PALETA.fosforo;

/* ── LA TRAMPA: EL FÓSFORO QUE SÍ ESTÁ, PEGADO ─────────────────────────────
 * El argumento más fuerte de toda la pieza, y el que más cuesta dibujar bien.
 *
 * En suelo de ladera andina el fósforo se pega al hierro y al aluminio [30]. La
 * micorriza es la que lo SUELTA [21]. Apagá la red y el fósforo no se va a
 * ninguna parte: SIGUE AHÍ, pegado a su partícula, a centímetros de la raíz, y
 * la mata no lo alcanza. Entonces toca comprarlo en bulto. Y como se sigue
 * pegando, toca comprar más. "Ahí está la trampa" [32].
 *
 * Cómo se dibuja: motas de ámbar APAGADO pegadas a partículas de hierro. En el
 * lado vivo, esas motas se sueltan y se van por la red (se vuelven pulso). En el
 * lado apagado están QUIETAS. La quietud es el mensaje: no es que falte comida,
 * es que se cortó el que la traía. Un campesino que ve esto entiende en dos
 * segundos por qué el bulto no lo saca del hueco — lo mete más adentro.
 */
/**
 * Motas de fósforo pegado a partículas de hierro/arcilla.
 * @returns {Array<{pos:THREE.Vector3, esc:number, semilla:number}>}
 */
export function fosforoPegado(params, seed = 3131) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < params.fosforoPegado; i++) {
    out.push({
      pos: new THREE.Vector3(
        mezcla(-SUELO.ancho / 2 + 0.4, SUELO.ancho / 2 - 0.4, r()),
        -mezcla(0.3, SUELO.hondo * 0.8, r()),
        mezcla(SUELO.zAtras + 0.25, SUELO.z0 - 0.15, r()),
      ),
      esc: mezcla(0.7, 1.35, r()),
      semilla: r(),
    });
  }
  return out;
}

/* ── LAS LOMBRICES Y SUS TÚNELES ───────────────────────────────────────────
 * La señal que el campesino puede comprobar HOY con una pala, sin creerle a
 * nadie: [102] "si al cavar no aparece ninguna en un suelo que debería tenerlas,
 * es una alerta". [0] el glifosato "se lleva la vida del suelo... hongos,
 * lombriz, todo".
 *
 * El gesto: el TÚNEL SE QUEDA aunque la lombriz no. Un túnel vacío es más
 * elocuente que una lombriz muerta — no hay cadáver, hay ausencia. Y el túnel
 * vacío también dice que la casa sigue lista para cuando vuelva.
 */
/**
 * Lombrices y sus túneles, a lo ancho del suelo.
 * @returns {Array<{curva:THREE.CatmullRomCurve3, x:number, t:number, vel:number}>}
 */
export function lombricesYTuneles(params, seed = 777) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < params.lombrices; i++) {
    const x = mezcla(-SUELO.ancho / 2 + 0.8, SUELO.ancho / 2 - 0.8, r());
    const y = -mezcla(0.5, SUELO.hondo * 0.65, r());
    const z = mezcla(SUELO.zAtras + 0.4, SUELO.z0 - 0.25, r());
    /* el túnel serpentea: una lombriz no cava en línea recta */
    const pts = [];
    const largo = mezcla(0.9, 1.9, r());
    for (let s = 0; s <= 4; s++) {
      const t = s / 4;
      pts.push(new THREE.Vector3(
        x + mezcla(-largo, largo, t),
        y + Math.sin(t * Math.PI * mezcla(1.2, 2.4, r())) * 0.28,
        z + (r() - 0.5) * 0.25,
      ));
    }
    out.push({
      curva: new THREE.CatmullRomCurve3(pts),
      x,
      t: r(),
      vel: mezcla(0.05, 0.13, r()),
    });
  }
  return out;
}

/* ── LOS GRUMOS Y EL POLVO ─────────────────────────────────────────────────
 * [105] el suelo vivo se rompe en "pequeñas migas de pan húmedas que no se
 * deshacen fácil"; el apagado es "polvo suelto o un bloque duro" [100].
 *
 * Es la MISMA partícula: en el lado vivo está apretada con sus hermanas en un
 * grumo (algo las pega: la red y la materia orgánica [6] "grumitos que no se
 * caen fácil, señal de que algo está manteniendo esas partículas unidas"); en el
 * lado apagado están sueltas y dispersas. No cambia la tierra — cambia si algo
 * la está agarrando. La escena interpola posición y color por salud.
 */
/**
 * Partículas de suelo con su posición agrupada (viva) y dispersa (apagada).
 * @returns {Array<{juntos:THREE.Vector3, sueltos:THREE.Vector3, esc:number}>}
 */
export function agregados(params, seed = 5150) {
  const r = rng(seed);
  const out = [];
  const porGrumo = 5;
  const n = Math.ceil(params.grumos / porGrumo);
  for (let g = 0; g < n; g++) {
    /* el centro del grumo */
    const cx = mezcla(-SUELO.ancho / 2 + 0.4, SUELO.ancho / 2 - 0.4, r());
    const cy = -mezcla(0.25, SUELO.hondo * 0.75, r());
    const cz = mezcla(SUELO.zAtras + 0.3, SUELO.z0 - 0.2, r());
    for (let i = 0; i < porGrumo; i++) {
      /* juntos: apretados alrededor del centro (la miga) */
      const juntos = new THREE.Vector3(
        cx + (r() - 0.5) * 0.16,
        cy + (r() - 0.5) * 0.16,
        cz + (r() - 0.5) * 0.14,
      );
      /* sueltos: la misma partícula, dispersa y caída (el polvo) */
      const sueltos = new THREE.Vector3(
        cx + (r() - 0.5) * 0.72,
        cy - r() * 0.34,
        cz + (r() - 0.5) * 0.5,
      );
      out.push({ juntos, sueltos, esc: mezcla(0.6, 1.2, r()) });
    }
  }
  return out;
}

/* ── LOS POROS Y EL AGUA ───────────────────────────────────────────────────
 * [22] los hilos del hongo llegan "a poros muy pequeños del suelo donde queda
 * agua atrapada después de que la superficie ya se secó". Suelo vivo = poros con
 * su gota. Suelo apretado y sin red = poros cerrados, sin reserva. [44] la
 * compactación "saca el aire de los poros".
 */
/**
 * Poros del suelo con su gota de agua.
 * @returns {Array<{pos:THREE.Vector3, esc:number, semilla:number}>}
 */
export function porosAgua(params, seed = 6060) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < params.poros; i++) {
    out.push({
      pos: new THREE.Vector3(
        mezcla(-SUELO.ancho / 2 + 0.4, SUELO.ancho / 2 - 0.4, r()),
        -mezcla(0.3, SUELO.hondo * 0.7, r()),
        mezcla(SUELO.zAtras + 0.3, SUELO.z0 - 0.2, r()),
      ),
      esc: mezcla(0.5, 1.1, r()),
      semilla: r(),
    });
  }
  return out;
}

/* ── EL BANCO DE ESPORAS: LA ESPERANZA, Y ES DATO ──────────────────────────
 * [65] "el banco de esporas que ya existe en su propia región". [49] "el suelo
 * tiene memoria biológica y con buenas prácticas sostenidas la red vuelve a
 * tejerse, sobre todo si cerca hay un rastrojo o bosque que sirva de fuente de
 * esporas."
 *
 * LA REGLA DURA DE ESTA PIEZA: las esporas NO se apagan nunca. Ni en el lado más
 * castigado. Son las únicas luces que cruzan el frente enteras, y esa terquedad
 * es deliberada: la pieza no termina en regaño. Si el campesino para, la red
 * vuelve a tejerse desde estas perlas.
 *
 * Honestidad: el corpus dice que el banco existe y que sirve de fuente. NO dice
 * que las esporas estén "dormidas", ni cuánto duran, ni cuántas hay. La pieza no
 * lo dice tampoco — solo las deja encendidas, que es lo que el dato aguanta.
 */
/**
 * El banco de esporas: las perlas que no se apagan.
 * @returns {Array<{pos:THREE.Vector3, esc:number, semilla:number}>}
 */
export function bancoEsporas(params, seed = 8080) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < params.esporas; i++) {
    /* sesgadas hacia el lado apagado: ahí es donde tienen que decir algo */
    const t = Math.pow(r(), 0.65);
    out.push({
      pos: new THREE.Vector3(
        mezcla(-SUELO.ancho / 2 + 0.6, SUELO.ancho / 2 - 0.6, t),
        -mezcla(0.4, SUELO.hondo * 0.8, r()),
        mezcla(SUELO.zAtras + 0.3, SUELO.z0 - 0.2, r()),
      ),
      esc: mezcla(0.8, 1.4, r()),
      semilla: r(),
    });
  }
  return out;
}

/* ── LA SUPERFICIE: COBERTURA vs SUELO PELADO ──────────────────────────────
 * [40] "El hongo necesita una raíz viva para sobrevivir... la red micorrízica se
 * muere de hambre por falta de raíces que alimentar." [50] "Lo primero y más
 * barato: dejar de dejar el suelo pelado."
 *
 * Arriba del corte: de un lado hojarasca y arvenses (la cobertura muerta que
 * ahoga la maleza y además abona [2]); del otro, tierra pelada al sol. La
 * superficie ANUNCIA lo que pasa abajo — y es lo único que el campesino ve sin
 * cavar.
 */
/**
 * Hojarasca / cobertura sobre la superficie.
 * @returns {Array<{pos:THREE.Vector3, rot:number, esc:number}>}
 */
export function hojarascaSuperficie(params, seed = 9090) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < params.hojarasca; i++) {
    out.push({
      pos: new THREE.Vector3(
        mezcla(-SUELO.ancho / 2 + 0.3, SUELO.ancho / 2 - 0.3, r()),
        0.012 + r() * 0.03,
        mezcla(SUELO.zAtras + 0.3, SUELO.z0 - 0.1, r()),
      ),
      rot: r() * Math.PI * 2,
      esc: mezcla(0.7, 1.3, r()),
    });
  }
  return out;
}

/* ── EL TUBO DE UNA RAÍZ: LO QUE *NO* CAMBIA ───────────────────────────────
 * Acá hay una decisión de arte que es la más importante de toda la pieza, y es
 * una decisión sobre lo que NO se dibuja:
 *
 * LA RAÍZ NO SE MUERE. La raíz gruesa se ve IGUAL de los dos lados del frente:
 * no cambia de color, no se marchita, no se pone gris. Es estática a propósito y
 * no depende del frente.
 *
 * ¿Por qué? Porque así es en la finca, y porque ESE ES EL PROBLEMA. El campesino
 * fumiga la maleza, su mata sigue verde, la cosecha sale, y no ve nada malo. Si
 * esta pieza dibujara la mata muriéndose, el campesino la miraría y diría "eso
 * es mentira, mis matas están bien" — y tendría razón, y perderíamos todo.
 *
 * La honestidad ACÁ es lo que nos da permiso para el resto: la mata está bien.
 * Lo que se apagó fue con quién. El daño no está en lo que se ve; está en la red
 * que la acompañaba y en el mineral que ya nadie le suelta. Por eso el daño se
 * cuenta con la red, con el fósforo quieto y con la lombriz que falta — nunca
 * con un cadáver.
 */
/**
 * Malla de una rama de raíz. NO depende del frente: la raíz vive igual en los
 * dos lados (ver la nota de arriba — es deliberado).
 * @returns {THREE.BufferGeometry}
 */
export function tuboRaizGeom(curva, grosor, params) {
  const K = Math.max(6, Math.round(params.tubK * 0.6));
  const M = params.tubM;
  const pos = [];
  const col = [];
  const idx = [];
  const pts = curva.getPoints(K);
  const c = new THREE.Color();
  for (let i = 0; i <= K; i++) {
    const t = i / K;
    /* adelgaza hacia la punta; el color solo aclara con el calibre */
    const rad = 0.03 * grosor * mezcla(1, 0.35, t);
    c.copy(PALETA.raiz).lerp(PALETA.raizFina, suave(t) * 0.35);
    const tang = curva.getTangent(t);
    const up = Math.abs(tang.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const n1 = new THREE.Vector3().crossVectors(tang, up).normalize();
    const n2 = new THREE.Vector3().crossVectors(tang, n1).normalize();
    for (let j = 0; j < M; j++) {
      const a = (j / M) * Math.PI * 2;
      const off = n1.clone().multiplyScalar(Math.cos(a) * rad)
        .add(n2.clone().multiplyScalar(Math.sin(a) * rad));
      pos.push(pts[i].x + off.x, pts[i].y + off.y, pts[i].z + off.z);
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < K; i++) {
    for (let j = 0; j < M; j++) {
      const a = i * M + j;
      const b = i * M + ((j + 1) % M);
      const d = (i + 1) * M + j;
      const e = (i + 1) * M + ((j + 1) % M);
      idx.push(a, d, b, b, d, e);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/*
 * Fusiona las ramas de todas las matas en UNA geometría (un draw-call).
 *
 * LA TRAMPA, que ya nos costó caro y está documentada en `sucesion.geom.js`:
 * `mergeGeometries` exige que TODAS las partes coincidan en el indexado ("index
 * attribute exists among all geometries, or in none of them"). Si no coinciden,
 * NO tira excepción: devuelve `null` y escupe un console.error. Y como el
 * componente r3f hace `if (!geo) return null`, la malla simplemente NO SE DIBUJA
 * y nadie se entera — que es peor que un crash.
 *
 * Acá todas las partes salen de `tuboRaizGeom` (todas indexadas, mismos
 * atributos), así que hoy no debería fallar. Igual se desindexa y se TRUENA si
 * falla: el día que alguien meta una parte de otra fábrica, quiero un error, no
 * unas raíces que se esfumaron en silencio.
 */
/**
 * Malla única con todas las raíces de todas las matas.
 * @returns {THREE.BufferGeometry}
 */
export function geometriaRaices(matas, params) {
  const partes = [];
  for (const mata of matas) {
    for (const rama of mata.ramas) partes.push(tuboRaizGeom(rama.curva, rama.grosor, params));
  }
  const buenas = partes.filter(Boolean).map((g) => (g.index ? g.toNonIndexed() : g));
  if (!buenas.length) throw new Error('sueloComparado.geom: no hay raíces que fusionar');
  const geo = mergeGeometries(buenas, false);
  if (!geo) throw new Error('sueloComparado.geom: la fusión de raíces falló (partes incompatibles)');
  for (const g of buenas) g.dispose();
  return geo;
}

/* ── LA RAICILLA ALGODONOSA: LO QUE SÍ SE PIERDE ───────────────────────────
 * [100] "fíjese si hay raíces finas blancas con textura algodonosa alrededor".
 * [103] "hilos finísimos, blanquecinos, casi como telaraña, pegados a la raíz".
 *
 * El complemento exacto de la nota de arriba: si la raíz gruesa es lo que NO
 * cambia, esto es lo que SÍ. Va aparte de la raíz justamente para poder decir
 * las dos cosas a la vez sin contradecirse — la mata está entera, y sin embargo
 * perdió algo.
 *
 * Y es la señal más útil de toda la pieza porque es VERIFICABLE. El campesino no
 * tiene que creernos: cava un huequito, mira la raíz y ve si está el pelito
 * blanco o no está. Una pieza de arte que se puede comprobar con una pala vale
 * más que cien que hay que creer.
 */
/**
 * Mechones de raicilla fina sobre las ramas de raíz. Su escala la maneja la
 * escena según la salud del punto donde está cada uno.
 * @returns {Array<{pos:THREE.Vector3, esc:number, semilla:number}>}
 */
export function raicillasFinas(matas, params, seed = 1717) {
  const r = rng(seed);
  const out = [];
  const porRama = params.tubM > 4 ? 3 : 2;
  for (const mata of matas) {
    for (const rama of mata.ramas) {
      for (let i = 0; i < porRama; i++) {
        /* pegadas al tercio final de la rama: ahí es donde se agarra el hongo */
        const t = mezcla(0.42, 0.97, r());
        const p = rama.curva.getPoint(t);
        out.push({
          pos: new THREE.Vector3(
            p.x + (r() - 0.5) * 0.1,
            p.y + (r() - 0.5) * 0.1,
            p.z + (r() - 0.5) * 0.08,
          ),
          esc: mezcla(0.6, 1.25, r()),
          semilla: r(),
        });
      }
    }
  }
  return out;
}

/* ── EL FRENTE EN EL TIEMPO: LA ASIMETRÍA ES EL DATO ───────────────────────
 * [80] "mucho más rápido de perder que de ganar: un par de quemas o aradas
 * fuertes pueden borrar en poco tiempo lo que costó años construir."
 * [36] los hilos cortados "tardan MESES en reconstruirse".
 * [49] la recuperación "puede tomar VARIAS TEMPORADAS".
 * [91, teacher-agua-suelo] "subir la materia orgánica un solo punto porcentual
 *      puede tardar hasta 20 AÑOS con buen manejo".
 *
 * Por eso APAGAR es ~6x más rápido que RECUPERAR. Si las dos velocidades fueran
 * iguales, la pieza estaría mintiendo con la animación aunque el texto dijera la
 * verdad — y el ojo le cree al movimiento antes que a la letra. El que mira debe
 * SENTIR en el cuerpo que deshacer es un rato y rehacer es una vida.
 */
export const VELOCIDAD = {
  apagar: 1.0, // unidades de X por segundo: una pasada y ya
  recuperar: 0.17, // ~6x más lento: varias temporadas
};

/**
 * Avanza el frente hacia su destino con la velocidad asimétrica que manda el
 * corpus. PURA: devuelve la X nueva.
 * @param {number} frente  X actual
 * @param {number} destino  X objetivo
 * @param {number} dt  delta en segundos
 * @returns {number}
 */
export function avanzarFrente(frente, destino, dt) {
  const apagando = destino < frente; // el frente baja de X = el suelo se apaga
  const v = apagando ? VELOCIDAD.apagar : VELOCIDAD.recuperar;
  const paso = v * dt;
  const d = destino - frente;
  if (Math.abs(d) <= paso) return destino;
  return frente + Math.sign(d) * paso;
}
