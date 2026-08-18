// ── piloto-lamina.js — el piloto es la LÁMINA, y la lámina ESTÁ VIVA ────────
//
// Por qué existe. El jaguar 3D no se parece a la lámina del operador, y
// redibujarlo tampoco funcionó. La hipótesis que se prueba aquí es otra: **no
// dibujar nada**. Se monta el recorte RGBA de la propia lámina del operador
// como plano orientado a cámara en el asiento del kart. Se parece porque ES la
// referencia.
//
// La primera versión probó que la VÍA sirve (60 fps, 685 draw calls contra 802
// del piloto 3D, una malla contra 57) y falló en lo otro: era una CALCOMANÍA.
// Cara inmóvil, cuerpo rígido, y una imagen que ignoraba la luz del valle.
// Esta versión ataca eso, y todo lo que hace es **mover el arte, nunca
// redibujarlo**: cada píxel que se dibuja en pantalla sale del PNG del
// operador. Lo único que se calcula aquí son MÁSCARAS DE ALFA (qué parte de la
// lámina pertenece a qué capa) y TRANSFORMACIONES (dónde va cada capa este
// cuadro). No hay un solo píxel nuevo de color.
//
// ── EL BUG QUE HABÍA DEBAJO ─────────────────────────────────────────────────
// El billboard NUNCA funcionó. La v1 colgaba `onBeforeRender` de un Object3D
// pelado, y three sólo invoca ese callback para objetos que entran a la lista
// de render: `projectObject()` filtra por `isMesh || isLine || isPoints ||
// isSprite` (vendor/three.module.js:29679) y `renderObject()` es el único que
// llama `object.onBeforeRender` (:29956). Un Object3D sin geometría no entra
// nunca. O sea: el plano jamás giró hacia la cámara, iba atornillado al chasis
// y en cuanto el kart no apuntaba a la cámara se veía **de canto**: una hoja
// plana. Aquí el callback vive en las MALLAS, que sí se dibujan.
//
// ── LAS CAPAS: DE DÓNDE SALE EL VOLUMEN ─────────────────────────────────────
// Un dibujo solo no tiene volumen; tres pedazos del mismo dibujo que se mueven
// con desfase, sí. La lámina se parte en CUERPO / CABEZA / BRAZO recortando por
// alfa sobre canvas, con bordes difuminados, y cada pedazo cuelga de su propio
// nudo (cuello, hombro). El truco fino está en cómo se reparte el alfa:
//
//   · La capa de encima (cabeza, brazo) se DESVANECE en el borde del corte.
//   · El cuerpo de abajo NO se desvanece: se borra con corte duro sólo donde la
//     capa de encima ya es ≥93% opaca, y queda ENTERO en toda la franja de
//     disolución.
//
// Ese detalle es la diferencia entre que funcione y que no. Si las dos capas se
// desvanecieran a la vez (el reparto "obvio", alfa_a + alfa_b = 1), el
// compuesto por encima daría cobertura 1−αa·αb: en el medio de la franja da
// 0.75 y aparece una **banda translúcida** cruzando el cuello. Con el cuerpo
// opaco debajo la cobertura es 1 siempre, en reposo el resultado es idéntico
// píxel a píxel al PNG original (verificado: error máximo de alfa = 0), y
// cuando la cabeza se mueve lo que pasa en la franja es una disolución suave
// sobre el cuello quieto, no un desgarro.
//
// ── EL PARPADEO ─────────────────────────────────────────────────────────────
// Es lo primero que nombró el operador: "la cara está absolutamente inmóvil".
// Con un solo dibujo se puede parpadear sin dibujar nada: el párpado es un
// óvalo de PELO DE LA PROPIA FRENTE del jaguar (parche x 148..206, y 2..36 del
// PNG, el pelo limpio entre las orejas) puesto sobre cada ojo y recortado por
// la silueta real de la cabeza. Baja desde arriba, tapa el ojo, sube. Son los
// píxeles del operador movidos de sitio — que es exactamente lo que autoriza la
// línea roja del día: trocear para animar sí, redibujar no.
//
// ── QUE PERTENEZCA A LA ESCENA ──────────────────────────────────────────────
// La v1 tenía `toneMapped: false`: la lámina se dibujaba con su brillo de
// archivo mientras TODO el resto del valle pasa por ACES y por una exposición
// que baja de noche (`1.05 − oscuridad*0.16` en main.js). Una imagen que ignora
// la iluminación se ve pegada por más que se mueva. Aquí:
//   · `toneMapped: true` + `fog: true` → la niebla y la hora la alcanzan.
//   · el color del material se TIÑE con las luces reales de la escena, leídas
//     de la propia escena en tiempo de render (no hardcodeadas: si el entorno
//     cambia el sol, la lámina cambia con él).
//   · oclusión de contacto en la cintura por COLORES DE VÉRTICE: la parte que
//     entra en la cabina se oscurece. Sin draw call extra y sin tocar el PNG.
//
// Activación: SOLO con `?piloto2d=…`. Sin el parámetro este módulo no monta
// nada y el juego se comporta exactamente como antes.
//   ?piloto2d=1        → busto en capas, vivo (lo que se propone)
//   ?piloto2d=plano    → la v1: UNA sola lámina rígida. Es el CONTROL de esta
//                        entrega: mismo recorte, mismo tamaño, sin vida.
//   ?piloto2d=entero   → la lámina completa, sin recortar en la cintura
//   ?piloto2d=jaguar,dante → limitar a ciertos pilotos (por defecto: jaguar)

const CARPETA = new URL('../../../compai/laminas/', import.meta.url).href;

// alto: ALTO TOTAL del plano en metros de mundo con la escala de piloto de
//   referencia (0.75). Medido contra la caja del piloto 3D en escena viva.
// centroX: la masa opaca de la lámina no está en el centro del PNG (el brazo
//   del lápiz la corre a la izquierda). Fracción del ancho a compensar.
// capas: la anatomía MEDIDA sobre el alfa del PNG (ver _gate/anatomia-lamina).
//   Sin este bloque el piloto cae al modo plano — no se inventan cortes.
export const LAMINAS = {
  jaguar: {
    // Lámina aprobada nueva: reemplaza a jaguar-actuando.png sin borrar el
    // arte anterior, por si otro carril todavía lo referencia.
    archivo: 'jaguar-natural.png',
    ancho: 705,
    altoPx: 394,
    recorteV: 0.60,
    // La pose es horizontal; este alto mantiene la masa del jaguar dentro
    // del vano abierto en vez de convertirla en una franja que tapa el kart.
    alto: 0.54,
    hundido: 0.10,
    centroX: 0,
  },
  // Lámina aprobada de gesto del mismo jaguar. Se registra aparte para que
  // las sondas puedan inspeccionar ambas aprobadas; el piloto jugable `jaguar`
  // usa la vista natural de arriba.
  'jaguar-gesto': {
    archivo: 'jaguar-gesto.png',
    ancho: 569,
    altoPx: 661,
    recorteV: 0.60,
    alto: 0.78,
    hundido: 0.10,
    centroX: 0,
  },
  oso: {
    archivo: 'oso.png',
    ancho: 611,
    altoPx: 629,
    recorteV: 0.60,
    alto: 0.78,
    hundido: 0.10,
    // El bastón y las flores extienden la caja hacia la derecha; se compensa
    // la masa hacia el centro del asiento sin tocar la lámina.
    centroX: 0.08,
  },
  zariguya: {
    archivo: 'zariguya.png',
    ancho: 481,
    altoPx: 444,
    recorteV: 0.60,
    alto: 0.65,
    hundido: 0.10,
    centroX: 0,
  },
  // Dante NO tiene lámina: la entrada que había aquí apuntaba a
  // `chivito-actuando.png` y con el default viejo de modoLamina() eso montaba
  // AL CHIVITO cuando elegías al beagle (medido en F25, captura
  // _gate/F25-kart-antes-dante-carrera-a.png). Dante y Oliver van SIEMPRE con
  // su cuerpo de perro rigado de pilotos-manejando.js; si algún día llega una
  // lámina del beagle, se registra acá con su archivo propio.
  // Angelita: lámina de cuerpo entero aprobada (414x493). La cara de 96x114
  // queda como referencia histórica pero ya no se consume desde aquí.
  angelita: { archivo: 'angelita.png', ancho: 414, altoPx: 493, recorteV: 0.60, alto: 0.78, hundido: 0.10, centroX: 0 },
  luciernaga: {
    archivo: 'luciernaga.png',
    ancho: 367,
    altoPx: 507,
    recorteV: 0.60,
    alto: 0.78,
    hundido: 0.10,
    // La masa visible está corrida a la derecha (centroRel.x=0.074), similar
    // al oso con su bastón. Se compensa sin tocar la lámina.
    centroX: 0.08,
  },
  'chivito-punk': {
    archivo: 'chivito-punk.png',
    ancho: 397,
    altoPx: 654,
    recorteV: 0.60,
    alto: 0.78,
    hundido: 0.10,
    centroX: 0,
  },
  chivito: {
    archivo: 'chivito-normal.png',
    ancho: 387,
    altoPx: 652,
    recorteV: 0.60,
    alto: 0.78,
    hundido: 0.10,
    centroX: 0,
  },
};

// Las anclas de los modelos describen el asiento para el piloto 3D. La
// lámina, en cambio, necesita asomar por encima de la chapa para que la cámara
// de persecución la lea como conductor y no como textura oculta en la cabina.
// Son offsets del piloto, no del carro: el look de las carrocerías queda
// intacto. El lobo se desplaza hacia la ventana trasera y el resto sale apenas
// por el vano o el parabrisas, según su silueta.
export const ASOMO_POR_VEHICULO = {
  // Las cuatro aprobadas tienen más masa vertical que la lámina anterior: con
  // 0.46 la baranda de la chiva tapaba torso y manos, y el recorte se leía como
  // una cara pegada al respaldo. Este y deja cabeza + pecho sobre el vano.
  chiva: { x: 0.05, y: 0.82 },
  // El SUV es el jeep cerrado del roster: asoma solo la parte alta, pero no
  // debe quedar como una franja flotando sobre el techo.
  suv: { x: -0.18, y: 0.58 },
  pickup: { x: -0.06, y: 0.26 },
  volqueta: { x: 0.02, y: 0.26 },
  coupe: { x: -0.04, y: 0.20 },
  carretilla: { x: 0.00, y: 0.02 },
  moto: { x: 0.00, y: 0.05 },
  skate: { x: 0.00, y: 0.03 },
};

// LO QUE ESTA ENTREGA NO RESUELVE Y HAY QUE SABER:
//   · El billboard mira SIEMPRE a la cámara y la cámara va detrás: el jaguar se
//     ve de frente, o sea "mirando hacia atrás". Con UNA sola vista de la lámina
//     no hay arreglo de código posible — hace falta un segundo recorte de
//     espaldas, que es arte del operador. No se persigue aquí.
//   · Vehículo CON TECHO: el busto atraviesa la chapa. Las cifras están
//     calibradas para vehículo abierto (La Carretilla).
//   · NO agarra el volante. Las manos del piloto 3D se muestrean de la malla del
//     carro; una lámina no tiene manos que mover. El jaguar ya tiene los dos
//     guantes puestos y a la altura del busto la lectura es "va agarrado".

// ── utilidades ──────────────────────────────────────────────────────────────
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// Una entrada por archivo: la imagen se descarga UNA vez y las capas se
// hornean UNA vez, aunque haya varios karts con el mismo piloto.
const _capas = new Map();

function lienzo(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/**
 * Hornea las capas a partir del PNG. Todo el color sale de `img`; aquí sólo se
 * decide QUÉ ALFA lleva cada capa.
 *
 * Devuelve canvases del MISMO tamaño que el PNG, así las tres capas comparten
 * geometría y UV y no hay que hacer cuentas de encuadre por capa.
 */
function hornear(img, cfg) {
  const W = img.naturalWidth || cfg.ancho;
  const H = img.naturalHeight || cfg.altoPx;
  const cap = cfg.capas;

  const base = lienzo(W, H);
  const bctx = base.getContext('2d', { willReadFrequently: true });
  bctx.drawImage(img, 0, 0);
  const src = bctx.getImageData(0, 0, W, H);
  const sd = src.data;

  const [cA, cB] = cap.cuello;
  const br = cap.brazo;
  const mCabeza = (x, y) => 1 - ss(cA, cB, y);
  const mBrazo = (x, y) => {
    const u = br.nx * (x - br.px) + br.ny * (y - br.py);
    const perp = 1 - ss(br.u0, br.u1, u);
    const gy = ss(br.yEntra[0], br.yEntra[1], y) * (1 - ss(br.ySale[0], br.ySale[1], y));
    return clamp(perp * gy * (1 - mCabeza(x, y)), 0, 1);
  };
  const an = cap.ancaDer;
  const mAnca = an ? (x, y) => 1 - ss(an.x[0], an.x[1], x) * ss(an.y[0], an.y[1], y) : () => 1;
  // El cuerpo se borra SÓLO donde la capa de encima ya tapa del todo. Ver la
  // nota de arriba: es lo que evita la banda translúcida en el cuello.
  const mCuerpo = (x, y) => clamp(
    (1 - ss(0.93, 1.0, mCabeza(x, y))) * (1 - ss(0.93, 1.0, mBrazo(x, y))) * mAnca(x, y), 0, 1);

  const pintar = (mascara) => {
    const cv = lienzo(W, H);
    const g = cv.getContext('2d');
    const im = g.createImageData(W, H);
    const d = im.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const a = sd[i + 3];
        if (!a) { d[i + 3] = 0; continue; }
        d[i] = sd[i]; d[i + 1] = sd[i + 1]; d[i + 2] = sd[i + 2];
        d[i + 3] = a * mascara(x, y);
      }
    }
    g.putImageData(im, 0, 0);
    return cv;
  };

  // ── párpados: pelo de la frente del propio jaguar sobre cada ojo ──────────
  const [fx0, fy0, fx1, fy1] = cap.frente;
  const fw = fx1 - fx0, fh = fy1 - fy0;
  const parpados = cap.ojos.map((o) => {
    const w = Math.ceil(o.rx * 2) + 2;
    const h = Math.ceil(o.ry * 2) + 2;
    const x0 = Math.round(o.cx - o.rx) - 1;
    const y0 = Math.round(o.cy - o.ry) - 1;
    const cv = lienzo(w, h);
    const g = cv.getContext('2d');
    const im = g.createImageData(w, h);
    const d = im.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const u = x / (w - 1), v = y / (h - 1);
        const su = o.espejo ? 1 - u : u;
        const sx = Math.round(fx0 + su * (fw - 1));
        const sy = Math.round(fy0 + v * (fh - 1));
        const j = (sy * W + sx) * 4;
        // alfa de la CABEZA en el píxel de destino: recorta el párpado a la
        // silueta real, así nunca asoma pelo por fuera de la cara.
        const k = ((y0 + y) * W + (x0 + x)) * 4;
        const aDest = (x0 + x >= 0 && x0 + x < W && y0 + y >= 0 && y0 + y < H) ? sd[k + 3] : 0;
        const nx = (x - (w - 1) / 2) / o.rx, ny = (y - (h - 1) / 2) / o.ry;
        const elipse = 1 - ss(0.80, 1.02, Math.hypot(nx, ny));
        d[i] = sd[j]; d[i + 1] = sd[j + 1]; d[i + 2] = sd[j + 2];
        d[i + 3] = aDest * elipse;
      }
    }
    g.putImageData(im, 0, 0);
    return { cv, cx: o.cx, cy: o.cy, w, h, x0, y0 };
  });

  return { W, H, cuerpo: pintar(mCuerpo), cabeza: pintar(mCabeza), brazo: pintar(mBrazo), parpados, plano: base };
}

function cargarCapas(cfg) {
  let p = _capas.get(cfg.archivo);
  if (p) return p;
  p = new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => { try { res(hornear(img, cfg)); } catch (e) { rej(e); } };
    img.onerror = () => rej(new Error(`no cargó ${cfg.archivo}`));
    img.src = CARPETA + cfg.archivo;
  });
  _capas.set(cfg.archivo, p);
  return p;
}

function textura(THREE, cv, recorteV) {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace ?? t.colorSpace;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = 8;
  if (recorteV != null) { t.repeat.set(1, recorteV); t.offset.set(0, 1 - recorteV); }
  t.needsUpdate = true;
  return t;
}

/**
 * Lee el parámetro de la URL. Devuelve null si la prueba está apagada.
 *
 * F25: el apagado es el DEFAULT. Sin `?piloto2d=` esta función devuelve null y
 * el juego monta el cuerpo RIGADO de pilotos-manejando; la lámina es opt-in
 * explícito. (Antes de F25 el default venía invertido: sin parámetro devolvía
 * un objeto truthy y los 8 aprobados montaban recorte PNG — el rig de F19
 * nunca corría. El docstring decía esto mismo y el código lo desmentía.)
 * @returns {{ entero: boolean, plano: boolean, pilotos: Set<string>|null } | null}
 */
export function modoLamina(busqueda) {
  const s = busqueda ?? (typeof location !== 'undefined' ? location.search : '');
  const m = /[?&]piloto2d=([^&]*)/.exec(s);
  if (!m) return null;
  const v = decodeURIComponent(m[1] || '1').trim().toLowerCase();
  if (v === '0' || v === 'no' || v === 'off') return null;
  const partes = v.split(',').map((x) => x.trim()).filter(Boolean);
  const entero = partes.includes('entero');
  const plano = partes.includes('plano');
  const pilotos = partes.filter((x) => !['entero', 'plano', '1', 'si'].includes(x));
  return { entero, plano, pilotos: pilotos.length ? new Set(pilotos) : null };
}

const PILOTOS_APROBADOS = new Set(['jaguar', 'dante', 'angelita', 'oso', 'zariguya', 'luciernaga', 'chivito-punk', 'chivito']);

/** ¿Este piloto tiene lámina Y está encendido por la URL? */
export function tieneLamina(tipo, modo) {
  if (!modo || !tipo) return false;
  if (!LAMINAS[tipo]) return false;
  if (modo.pilotos) return modo.pilotos.has(tipo);
  return PILOTOS_APROBADOS.has(tipo);
}

/**
 * Monta la lámina como piloto en el asiento del vehículo.
 * Misma firma de entrada que montarPilotoManejando(THREE, veh, opts) para que
 * el cableado en modelos.js sea una sola bifurcación.
 *
 * @returns {{ grupo, malla, material, actualizar(pose), tipo, esLamina: true } | null}
 */
export function montarPilotoLamina(THREE, veh, opts = {}) {
  const tipo = opts.tipo;
  const cfg = LAMINAS[tipo];
  if (!cfg) return null;

  const ud = veh.userData ?? {};
  const ancla = ud.anclaPiloto;

  // Mismo criterio de anclaje que montarPilotoManejando: Object3D ya colocado
  // (los 7 vehículos) u objeto plano { pos, rotY, escala } (la chiva).
  let padre;
  let escalaAncla = 0.75;
  if (ancla && ancla.isObject3D) {
    padre = ancla;
    escalaAncla = ancla.userData?.escala ?? 0.75;
  } else if (ancla && ancla.pos) {
    padre = new THREE.Object3D();
    padre.position.copy(ancla.pos);
    padre.rotation.y = ancla.rotY ?? Math.PI / 2;
    (ud.chasis ?? veh).add(padre);
    escalaAncla = ancla.escala ?? 0.75;
  } else {
    padre = ud.chasis ?? veh;
  }

  const entero = !!opts.entero;
  const enCapas = !!cfg.capas && !opts.plano;
  const recorteV = entero ? 1 : cfg.recorteV;
  const escalaRel = escalaAncla / 0.75;
  const alto = (entero ? cfg.alto / cfg.recorteV : cfg.alto) * escalaRel;
  const ancho = alto * (cfg.ancho / cfg.altoPx) / recorteV;
  const hundido = (entero ? 0.02 : cfg.hundido) * escalaRel;

  // ── sombra propia en el suelo ─────────────────────────────────────────────
  // Una elipse oscura bajo el piloto: es lo que más ancla una lámina a un
  // mundo 3D. Sin ella el recorte flota; con ella el ojo acepta que hay un
  // cuerpo apoyado en algo. Va en el PADRE (no en el pivote) para que no
  // gire con el billboard: una sombra que gira delata que es plana.
  const sombraGeo = new THREE.CircleGeometry(ancho * 0.42, 20);
  sombraGeo.rotateX(-Math.PI / 2);
  const sombraMat = new THREE.MeshBasicMaterial({
    color: 0x0a0806, transparent: true, opacity: 0.38,
    depthWrite: false, fog: true, toneMapped: true,
  });
  const sombra = new THREE.Mesh(sombraGeo, sombraMat);
  sombra.name = `pilotoLamina-sombra-${tipo}`;
  sombra.renderOrder = 1;
  padre.add(sombra);
  // Alto de la ventana visible del PNG, en píxeles de origen. Con esto se pasa
  // de coordenada de PÍXEL DE LA LÁMINA a coordenada local del plano.
  const hSrc = cfg.altoPx * recorteV;
  const aLocal = (px, py) => ({
    x: (px / cfg.ancho - 0.5) * ancho,
    y: (0.5 - py / hSrc) * alto,
  });

  // ── jerarquía ─────────────────────────────────────────────────────────────
  //   pivote  (billboard de eje Y; el ángulo se resuelve por cuadro)
  //     └ raiz      inclinación de curva + squash&stretch, con pivote en la CADERA
  //         └ busto  posición del recorte + bamboleo y golpes de terreno
  //             ├ mallaCuerpo
  //             ├ nudoCabeza  (pivote en el cuello) → mallaCabeza + 2 párpados
  //             └ nudoBrazo   (pivote en el hombro) → mallaBrazo
  const pivote = new THREE.Object3D();
  pivote.name = `pilotoLamina-${tipo}`;
  const raiz = new THREE.Object3D();
  raiz.name = `pilotoLamina-raiz-${tipo}`;
  const busto = new THREE.Object3D();
  busto.name = `pilotoLamina-busto-${tipo}`;
  raiz.add(busto);
  pivote.add(raiz);
  padre.add(pivote);
  const asomo = ASOMO_POR_VEHICULO[ud.id ?? veh.userData?.id ?? ''];
  if (asomo) pivote.position.set(asomo.x, asomo.y, 0);
  busto.position.set(ancho * (cfg.centroX ?? 0), alto / 2 - hundido, 0);
  const bustoY0 = busto.position.y;
  sombra.position.set(ancho * (cfg.centroX ?? 0), -hundido + 0.005, 0);

  // Geometría compartida por las tres capas. 1×8 en vertical no es capricho:
  // los colores de vértice hacen la OCLUSIÓN DE CONTACTO (la parte que entra en
  // la cabina se oscurece) y con un solo segmento no habría dónde interpolarla.
  const geo = new THREE.PlaneGeometry(ancho, alto, 1, 8);
  {
    const pos = geo.attributes.position;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const desdeAbajo = (pos.getY(i) + alto / 2) / alto;   // 0 abajo, 1 arriba
      const k = 0.42 + 0.58 * ss(0.0, 0.30, desdeAbajo);
      col[i * 3] = k; col[i * 3 + 1] = k; col[i * 3 + 2] = k;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }

  const materiales = [];
  function material(map, opt = {}) {
    const m = new THREE.MeshBasicMaterial({
      map,
      transparent: true,
      // alphaTest además de transparent: así el plano ESCRIBE profundidad y la
      // carrocería lo recorta bien en el borde de la cabina. Sin esto el busto
      // se dibujaría encima del capó y volvería a parecer una calcomanía.
      alphaTest: 0.28,
      depthWrite: true,
      side: THREE.DoubleSide,
      // sin esto three dibuja DOS pasadas por malla (BackSide + FrontSide) y
      // los draw calls se van al doble por nada: el billboard siempre da la cara.
      forceSinglePass: true,
      vertexColors: !!opt.vertexColors,
      fog: true,
      // toneMapped TRUE, al revés que la v1. Todo el valle pasa por ACES y por
      // una exposición que baja de noche; una imagen que se salta eso se ve
      // pegada encima por más que se mueva.
      toneMapped: true,
    });
    materiales.push(m);
    return m;
  }

  const mallas = [];
  function capa(map, orden, opt) {
    const m = new THREE.Mesh(opt?.geo ?? geo, material(map, opt));
    m.castShadow = false;              // un plano que gira solo proyecta una
    m.receiveShadow = false;           // sombra rectangular que delata el truco
    m.renderOrder = orden;
    m.onBeforeRender = alRenderizar;   // el billboard vive en las MALLAS
    mallas.push(m);
    return m;
  }

  // Hasta que llegue la textura la malla NO se dibuja: un MeshBasicMaterial sin
  // mapa pasa el alphaTest y pintaría un rectángulo blanco en el asiento.
  const mallaCuerpo = capa(null, 2, { vertexColors: true });
  mallaCuerpo.name = `pilotoLamina-cuerpo-${tipo}`;
  mallaCuerpo.visible = false;
  busto.add(mallaCuerpo);

  let nudoCabeza = null, nudoBrazo = null, parpados = [];
  let listo = false;
  // posición del nudo del cuello en coordenadas del busto, precalculada: se lee
  // todos los cuadros y aLocal() devuelve objeto nuevo cada vez.
  let pcX = 0, pcY = 0;

  const cargaTex = new THREE.TextureLoader();
  cargaTex.load(CARPETA + cfg.archivo, (t) => {
    t.colorSpace = THREE.SRGBColorSpace ?? t.colorSpace;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.anisotropy = 8;
    t.repeat.set(1, recorteV); t.offset.set(0, 1 - recorteV);
    t.needsUpdate = true;
    if (!listo) {
      mallaCuerpo.material.map = t;
      mallaCuerpo.material.needsUpdate = true;
      mallaCuerpo.visible = true;
    }
  });

  if (enCapas) {
    cargarCapas(cfg).then((C) => {
      const cap = cfg.capas;
      mallaCuerpo.material.map = textura(THREE, C.cuerpo, recorteV);
      mallaCuerpo.material.needsUpdate = true;
      mallaCuerpo.visible = true;

      const pc = aLocal(cap.pivCuello[0], cap.pivCuello[1]);
      pcX = pc.x; pcY = pc.y;
      nudoCabeza = new THREE.Object3D();
      nudoCabeza.name = `pilotoLamina-cuello-${tipo}`;
      nudoCabeza.position.set(pc.x, pc.y, 0.008 * escalaRel);
      busto.add(nudoCabeza);
      const mc = capa(textura(THREE, C.cabeza, recorteV), 3, { vertexColors: true });
      mc.name = `pilotoLamina-cabeza-${tipo}`;
      mc.position.set(-pc.x, -pc.y, 0);
      nudoCabeza.add(mc);

      // párpados: cuelgan del cuello, así siguen a la cabeza en todo momento.
      // El origen de su geometría va en el BORDE DE ARRIBA para que cerrar sea
      // un escalado en y desde la ceja hacia abajo, que es como baja un párpado.
      parpados = C.parpados.map((p, i) => {
        const c0 = aLocal(p.x0, p.y0);
        const c1 = aLocal(p.x0 + p.w, p.y0 + p.h);
        const w = c1.x - c0.x, h = c0.y - c1.y;
        const g = new THREE.PlaneGeometry(w, h).translate(0, -h / 2, 0);
        const m = capa(textura(THREE, p.cv, null), 4, { geo: g });
        m.name = `pilotoLamina-parpado${i}-${tipo}`;
        m.position.set((c0.x + c1.x) / 2 - pc.x, c0.y - pc.y, 0.002 * escalaRel);
        m.scale.y = 0.0001;
        m.visible = false;
        nudoCabeza.add(m);
        return m;
      });

      const ph = aLocal(cap.brazo.piv[0], cap.brazo.piv[1]);
      nudoBrazo = new THREE.Object3D();
      nudoBrazo.name = `pilotoLamina-hombro-${tipo}`;
      nudoBrazo.position.set(ph.x, ph.y, 0.012 * escalaRel);
      busto.add(nudoBrazo);
      const mb = capa(textura(THREE, C.brazo, recorteV), 5, { vertexColors: true });
      mb.name = `pilotoLamina-brazo-${tipo}`;
      mb.position.set(-ph.x, -ph.y, 0);
      nudoBrazo.add(mb);

      listo = true;
    }).catch((e) => {
      console.warn('[piloto-lamina] no pude hornear las capas, sigo con la lámina entera:', e.message);
    });
  }

  // ── billboard + tinte de la escena, resueltos en tiempo de render ─────────
  // Va en las MALLAS (no en un Object3D pelado: ver la nota del bug arriba) y
  // es idempotente, así da igual en qué orden se dibujen las capas.
  const _pw = new THREE.Vector3();
  const _cw = new THREE.Vector3();
  const _qp = new THREE.Quaternion();
  const _qm = new THREE.Quaternion();
  const _ejeY = new THREE.Vector3(0, 1, 0);
  const _tinte = new THREE.Color(1, 1, 1);
  let selloLuz = -1;
  let selloBusca = 0;
  let ultimaPose = -1e9;

  // La lista de luces se busca UNA vez (traverse de la escena entera es caro y
  // el valle tiene miles de objetos) y después sólo se releen intensidad y
  // color, que es lo que cambia con la hora. Se rebusca de vez en cuando por si
  // el entorno agrega o quita una luz.
  let luces = null;
  function refrescarLuz(escena) {
    if (!luces) { luces = []; escena.traverse((o) => { if (o.isLight) luces.push(o); }); }
    let r = 0, g = 0, b = 0;
    for (const o of luces) {
      if (!o.visible) continue;
      const i = o.intensity ?? 0;
      if (o.isAmbientLight) { r += o.color.r * i; g += o.color.g * i; b += o.color.b * i; }
      else if (o.isHemisphereLight) {
        r += (o.color.r + (o.groundColor?.r ?? 0)) * 0.5 * i;
        g += (o.color.g + (o.groundColor?.g ?? 0)) * 0.5 * i;
        b += (o.color.b + (o.groundColor?.b ?? 0)) * 0.5 * i;
      } else if (o.isDirectionalLight) {
        // un plano orientado a cámara no tiene normal útil: la direccional
        // aporta como luz difusa promediada, no como término lambertiano.
        r += o.color.r * i * 0.55; g += o.color.g * i * 0.55; b += o.color.b * i * 0.55;
      }
    }
    // K está CALCULADO, no puesto a ojo: con el entorno de referencia del valle
    // (entorno.js — ambiente 0.55·#b9c8d8 + sol 1.8·#ffe9c8·0.55 + relleno
    // 0.4·#9fb8d0·0.55) la suma da (1.526, 1.494, 1.422), promedio 1.48. K =
    // 1/1.48 deja el tinte en 1.0 exacto ahí: o sea que a plena luz la lámina se
    // dibuja con su color de archivo y el tinte sólo entra cuando la escena se
    // aparta de la referencia. Con K = 0.62 (primer intento) el jaguar salía un
    // 8% más apagado que la lámina a pleno sol, sin razón.
    const K = 0.676;
    if (r + g + b < 1e-4) { _tinte.setRGB(1, 1, 1); } else {
      _tinte.setRGB(clamp(r * K, 0.25, 1.35), clamp(g * K, 0.25, 1.35), clamp(b * K, 0.25, 1.35));
    }
    for (const m of materiales) m.color.copy(_tinte);
  }

  let sello = -1;
  function alRenderizar(renderer, escena, camara) {
    const s = renderer.info.render.frame;
    if (s === sello) return;
    sello = s;
    pivote.getWorldPosition(_pw);
    camara.getWorldPosition(_cw);
    _qm.setFromAxisAngle(_ejeY, Math.atan2(_cw.x - _pw.x, _cw.z - _pw.z));
    // el pivote cuelga del ancla, ya rotada, dentro de un chasis que gira con el
    // kart: hay que descontar la rotación heredada para que el ángulo sea de MUNDO.
    if (pivote.parent) {
      pivote.parent.getWorldQuaternion(_qp);
      pivote.quaternion.copy(_qp.invert()).multiply(_qm);
    } else {
      pivote.quaternion.copy(_qm);
    }
    if (s - selloLuz > 20 || selloLuz < 0) {
      selloLuz = s;
      if (s - selloBusca > 900) { selloBusca = s; luces = null; }
      refrescarLuz(escena);
    }
    // En el selector 3D nadie llama actualizar(): que respire igual, si no el
    // menú enseña un cartón y la vitrina desmiente al juego.
    const ahora = performance.now() / 1000;
    if (ahora - ultimaPose > 0.4) actualizar({ t: ahora });
    pivote.updateMatrixWorld(true);
  }

  // ── estado de la animación ────────────────────────────────────────────────
  const E = {
    tPrev: -1, y: null, vy: 0,
    inclina: 0, hunde: 0,
    // resorte del busto contra el asiento (reacción al terreno y al aterrizaje)
    xRes: 0, vRes: 0, xCab: 0,
    // squash & stretch
    sq: 0, vSq: 0,
    // parpadeo (tProx < 0 = todavía sin programar; t es performance.now()/1000
    // y arranca en varios miles, así que no se puede sembrar con un absoluto)
    kParp: 0, tParp: -1, nParp: 0, tProx: -1,
    // cuántas poses llegaron del JUEGO y cuántas se inventó el propio módulo
    // para la vitrina. Si el gate ve nPose 0 sabe que está midiendo el
    // autopiloto del selector y no al piloto manejando.
    nPose: 0, nAuto: 0,
    // susto
    sustoPrev: 0, tSusto: -1e9,
  };

  // Intervalo de parpadeo DETERMINISTA: nada de Math.random. Con hash el gate
  // puede reproducir la secuencia y el "parpadea cada tanto" deja de ser fe.
  const hash = (n) => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };

  /**
   * Contrato de pose continua, el MISMO que aplicarPose() del piloto 3D:
   * giro / salto / turbo / velocidad / susto / drift / t, más tres canales que
   * la lámina necesita para acusar el terreno: y (altura del chasis), enSuelo y
   * aterrizo. Lo que no puede honrar (manos en el volante) lo ignora.
   */
  function actualizar(pose = {}) {
    const t = pose.t ?? 0;
    const dt = E.tPrev < 0 ? 1 / 60 : clamp(t - E.tPrev, 1 / 240, 0.05);
    E.tPrev = t;
    ultimaPose = performance.now() / 1000;
    if (pose.y != null) E.nPose++; else E.nAuto++;

    const giro = clamp(pose.giro ?? 0, -1, 1);
    const vel = clamp(pose.velocidad ?? 0, 0, 1);
    const turbo = clamp(pose.turbo ?? 0, 0, 1);
    const salto = clamp(pose.salto ?? 0, 0, 1);
    const drift = clamp(pose.drift ?? 0, -1, 1);
    const susto = clamp(pose.susto ?? 0, 0, 1);
    const enSuelo = pose.enSuelo !== false;

    // ── modo plano = la v1 EXACTA, para que el control sea control ───────────
    // Sin capas no hay cuello ni hombro ni párpado que mover, y dejarle igual la
    // respiración y el squash convertiría al "control" en una versión a medias:
    // el gate ya no aislaría qué aporta el troceado. Aquí se reproducen los
    // números de la v1 tal cual (inclinación 0.30/0.14, rebote sin(t·10)·0.012,
    // agachada de turbo) y nada más. Es también lo que le toca al chivito, que
    // todavía no tiene anatomía medida.
    if (!enCapas) {
      const obj = (giro * 0.30) + (drift * 0.14);
      E.inclina += (obj - E.inclina) * 0.16;
      const objH = turbo * 0.06 - salto * 0.05;
      E.hunde += (objH - E.hunde) * 0.16;
      raiz.rotation.z = E.inclina;
      busto.position.y = bustoY0 + Math.sin(t * 10) * 0.012 * vel - E.hunde * escalaRel;
      const sK = 1 + E.hunde * 1.5 - salto * 0.4;
      sombra.scale.setScalar(clamp(sK, 0.3, 1.4));
      sombra.material.opacity = clamp(0.38 - salto * 0.28, 0.06, 0.42);
      return;
    }

    // ── 1. reacción al terreno ───────────────────────────────────────────────
    // El chasis va pegado al suelo (fisica.js: `s.y = ground` mientras
    // onGround), así que cada loma le pega un empujón vertical al asiento. El
    // busto es una masa colgada de un resorte amortiguado: no sigue al asiento,
    // se atrasa y rebota. Es lo que distingue un pasajero de una calcomanía.
    let aCh = 0;
    if (pose.y != null) {
      if (E.y == null) { E.y = pose.y; }
      const vyCh = (pose.y - E.y) / dt;
      aCh = clamp((vyCh - E.vy) / dt, -260, 260);
      E.y = pose.y; E.vy = vyCh;
    }
    // K/C/ganancia NO son a ojo. Medido sobre la telemetría de una vuelta real
    // (_gate/vivo/datos.json): |aCh| del chasis da p50 3.5 · p90 14.8 · p99 137
    // · máx 438 m/s². O sea la pista es LISA casi siempre y pega fuerte de vez
    // en cuando. Con la ganancia de la primera versión (0.0075) el pico del p99
    // movía al busto 1.1 mm: invisible. Con 0.16 ese mismo golpe lo mueve ~2 cm,
    // que es lo que se desplaza un torso de verdad, y el clamp se come los
    // atropellos del máximo. ζ≈0.25 para que el rebote se vea dos o tres veces
    // en vez de morir en el primer cuadro.
    const K = 260, C = 8;             // ω≈16 rad/s (2.6 Hz), ζ≈0.25
    E.vRes += (-K * E.xRes - C * E.vRes - aCh * 0.16) * dt;
    E.xRes = clamp(E.xRes + E.vRes * dt, -0.05, 0.05);
    // la cabeza va un poco más suelta que el tronco y con retardo propio
    E.xCab += (E.xRes * 1.45 - E.xCab) * (1 - Math.exp(-dt * 13));

    // ── 2. susto: flanco de subida, no nivel ────────────────────────────────
    if (susto > E.sustoPrev + 0.12) E.tSusto = t;
    E.sustoPrev = susto;
    const es = t - E.tSusto;
    const dSusto = es >= 0 && es < 0.6 ? Math.exp(-es * 6.5) : 0;
    const sacudon = dSusto ? Math.sin(es * 46) * 0.17 * dSusto : 0;

    // ── 3. squash & stretch ─────────────────────────────────────────────────
    // sq > 0 = aplastado (aterrizaje), sq < 0 = estirado (en el aire).
    // Impulso + resorte, no una rampa: el aterrizaje tiene que PEGAR.
    if (pose.aterrizo) E.vSq += 3.4;
    const objSq = (enSuelo ? 0 : -0.055) - dSusto * 0.10 + clamp(-E.xRes * 1.2, -0.05, 0.05);
    E.vSq += (-260 * (E.sq - objSq) - 17 * E.vSq) * dt;
    E.sq = clamp(E.sq + E.vSq * dt, -0.14, 0.20);

    // ── 4. curva ────────────────────────────────────────────────────────────
    // hacia AFUERA de la curva, igual que el piloto 3D. Más marcado que la v1
    // (0.30 → 0.46): a la velocidad del kart, 17° de busto se leen como fuerza
    // centrífuga; 9° se leían como nada.
    const objetivo = (giro * 0.46) + (drift * 0.22);
    E.inclina += (objetivo - E.inclina) * (1 - Math.exp(-dt * 11));

    // ── 5. respiración y vibración ──────────────────────────────────────────
    // Dos ritmos: el pecho (lento, se acelera con la velocidad) y el motor
    // (rápido, chiquito). Un cuerpo perfectamente quieto sobre un fierro que
    // vibra lee muerto aunque todo lo demás esté bien.
    const perRespira = 2.4 - 1.3 * vel;
    const respira = Math.sin((t / perRespira) * Math.PI * 2);
    const vibra = Math.sin(t * 37) * 0.0035 * (0.25 + 0.75 * vel) * (1 + turbo * 0.6);
    const objHunde = turbo * 0.055 - salto * 0.045;
    E.hunde += (objHunde - E.hunde) * (1 - Math.exp(-dt * 11));

    // ── 6. parpadeo ─────────────────────────────────────────────────────────
    // Cierra rápido y abre más lento, como un párpado de verdad. Se suprime
    // durante el susto: los ojos van ABIERTOS cuando te acaban de embestir.
    if (E.tProx < 0) E.tProx = t + 1.1;
    if (dSusto > 0.25) { E.kParp = 0; E.tParp = -1; E.tProx = t + 0.9; }
    else {
      if (E.tParp < 0 && t >= E.tProx) { E.tParp = t; E.nParp++; }
      if (E.tParp >= 0) {
        const dp = t - E.tParp;
        const CIERRA = 0.055, QUIETO = 0.025, ABRE = 0.09;
        if (dp < CIERRA) E.kParp = dp / CIERRA;
        else if (dp < CIERRA + QUIETO) E.kParp = 1;
        else if (dp < CIERRA + QUIETO + ABRE) E.kParp = 1 - (dp - CIERRA - QUIETO) / ABRE;
        else {
          E.kParp = 0; E.tParp = -1;
          // uno de cada tres es doble: el parpadeo humano viene en rachas y una
          // cadencia perfectamente regular vuelve a leer como máquina.
          const h = hash(E.nParp);
          E.tProx = t + (h < 0.32 ? 0.16 : 1.8 + h * 2.4);
        }
      }
    }

    // ── 7. aplicar ──────────────────────────────────────────────────────────
    raiz.rotation.z = E.inclina + sacudon * 0.35;
    raiz.scale.set(1 + E.sq * 0.55, 1 - E.sq, 1);
    busto.position.y = bustoY0 + respira * 0.009 + vibra + E.xRes - E.hunde * escalaRel;
    busto.position.x = ancho * (cfg.centroX ?? 0) + E.inclina * 0.012;

    if (nudoCabeza) {
      // La cabeza NO acompaña del todo al tronco: se queda más derecha (el ojo
      // lee eso como cuello, o sea como volumen) y llega tarde a los golpes.
      nudoCabeza.rotation.z = -E.inclina * 0.34 + Math.sin(t * 0.63) * 0.014 + sacudon;
      nudoCabeza.position.y = pcY + (E.xCab - E.xRes) + dSusto * 0.028 + respira * 0.004;
      nudoCabeza.position.x = pcX - E.inclina * 0.018;
    }
    if (nudoBrazo) {
      // Ganancia BAJA a propósito (0.20, no 0.42). El brazo del lápiz sale muy
      // largo en la lámina y el codo queda tapado por el borde del balde: si el
      // hombro rota mucho, el guante se despega y parece un guante flotando al
      // lado del kart. Medido: con 0.42 el hombro barría 0.45 rad (26°).
      nudoBrazo.rotation.z = clamp(
        -E.inclina * 0.20 + clamp((E.xRes - E.xCab) * 1.6, -0.05, 0.05)
        + Math.sin(t * 1.27 + 1.1) * 0.015 + sacudon * 0.4, -0.16, 0.16);
    }
    for (const p of parpados) {
      p.visible = E.kParp > 0.02;
      p.scale.y = Math.max(0.0001, E.kParp);
    }
    const sK = 1 - E.sq * 0.6 + E.hunde * 1.2 - salto * 0.4;
    sombra.scale.setScalar(clamp(sK, 0.3, 1.4));
    sombra.material.opacity = clamp(0.38 - salto * 0.28 + E.sq * 0.15, 0.06, 0.50);
    sombra.position.x = ancho * (cfg.centroX ?? 0) + E.inclina * 0.008;
  }

  actualizar({ t: performance.now() / 1000 });

  const api = {
    grupo: pivote,
    malla: mallaCuerpo,
    material: mallaCuerpo.material,
    actualizar,
    tipo,
    esLamina: true,
    // el gate necesita poder mirar adentro sin adivinar nombres
    sombra,
    get _rig() { return { pivote, raiz, busto, nudoCabeza, nudoBrazo, parpados, mallas, sombra, E, enCapas, listo }; },
  };
  // Puente para el gate: desde la escena se llega al piloto sin tener que
  // adivinar qué kart es cuál. Cuesta una referencia y evita sondas a ciegas.
  pivote.userData.lamina = api;
  return api;
}
