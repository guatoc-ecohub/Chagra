// ── pilotos-beneficos.js — los pilotos vivos del Kart ───────────────────────
//
// Crisopa, avispita de la broca y mariquita: tres pilotos más para el elenco.
// Después entraron tres más — momificador, murciélago y morpho — con el mismo
// patrón: geometría de especie aquí, maquinaria de pose en pilotos-manejando.js.
// Aquí vive SOLO la geometría de especie y la ficha. La maquinaria de pose
// (mangueras bezier, agarres muestreados del volante, cara continua) es la de
// pilotos-manejando.js y NO se duplica: este módulo se engancha desde allá.
//
// El dato duro no sale de la cabeza del que modela: sale del grafo de
// conocimiento del proyecto (nodos con label BeneficialOrganism). El campo
// `modoAccion` de cada ficha es TEXTUAL del grafo, y el poder de juego se
// deriva de él — no al revés. Por eso los tres poderes son distintos entre sí:
// un depredador generalista no puede tener la misma mecánica que un
// parasitoide que entra al grano, ni que un especialista de una sola presa.
//
// Ninguno de los tres poderes es un veneno. Cero agroquímicos de síntesis como
// ítem: el juego no puede contradecir lo que el proyecto enseña.

// ── fichas: lo que dice el grafo + el poder que de ahí se deriva ────────────

export const FICHAS_BENEFICOS = {
  crisopa: {
    nodo: 'chrysoperla_externa',
    cientifico: 'Chrysoperla externa',
    comun: 'Crisopa neotropical',
    tipoBio: 'depredador',
    modoAccion: 'Depredador de áfidos, mosca blanca y huevos de lepidópteros',
    poder: {
      id: 'ojo-de-encaje',
      alcance: 'area',
      titulo: 'Ojo de encaje',
      efecto: 'Barre en un radio alrededor del kart: limpia de un tirón las plagas '
        + 'chupadoras de la pista y no necesita puntería.',
      porQue: 'Es un depredador GENERALISTA: come áfidos, mosca blanca y huevos. '
        + 'Come de todo un poco, así que su poder es de área y no apunta a nadie.',
    },
  },
  avispita: {
    nodo: 'cephalonomia_stephanoderis',
    cientifico: 'Cephalonomia stephanoderis',
    comun: 'Avispa parasitoide de la broca',
    tipoBio: 'parasitoide',
    modoAccion: 'Parasita estados de la broca del café dentro del grano',
    poder: {
      id: 'entra-al-grano',
      alcance: 'dirigido',
      titulo: 'Entra al grano',
      efecto: 'El ÚNICO poder dirigido del juego: se engancha a un solo rival y lo '
        + 'persigue hasta alcanzarlo. Atraviesa el escudo, porque entra por dentro.',
      porQue: 'Es un PARASITOIDE, no un depredador: no barre un área, busca un '
        + 'hospedero y entra al grano a buscarlo. Un objetivo a la vez.',
    },
  },
  mariquita: {
    nodo: 'cryptolaemus_montrouzieri',
    cientifico: 'Cryptolaemus montrouzieri',
    comun: 'Mariquita destructora de cochinillas',
    tipoBio: 'depredador',
    modoAccion: 'Coccinélido especializado en cochinillas harinosas',
    poder: {
      id: 'come-harina',
      alcance: 'especialista',
      titulo: 'Come harina',
      efecto: 'No sirve contra todo: sirve contra UNA cosa y ahí es imbatible. '
        + 'Devora las manchas de cera y melaza que hacen patinar y deja el tramo '
        + 'limpio para el que venga atrás.',
      porQue: 'Es un ESPECIALISTA de cochinillas harinosas — las del polvo blanco '
        + 'ceroso. Poder angosto y perfecto, no comodín.',
    },
  },
  momificador: {
    nodo: 'aphidius_colemani',
    cientifico: 'Aphidius colemani',
    comun: 'Avispa parasitoide de pulgones',
    tipoBio: 'parasitoide',
    // TEXTUAL del nodo BeneficialOrganism (fuente ICA, confianza alta)
    modoAccion: 'Parasita áfidos (Myzus, Aphis), forma momias',
    // el mismo bicho aparece además como control no-colombiano, con la tasa medida
    modoAccion2: 'momificacion 43.2% (A.gossypii); max 25C; 0.25-4/m2',
    poder: {
      id: 'momia',
      alcance: 'al de adelante',
      titulo: 'Momia',
      efecto: 'Congela al rival de adelante por un instante: se pone tieso y '
        + 'dorado como el pulgón parasitado, y arranca de nuevo solo.',
      porQue: 'La momia NO es una muerte por veneno: el áfido parasitado se '
        + 'hincha, se endurece y se vuelve dorado — deja de moverse porque está '
        + 'ocupado, no envenenado. Por eso el poder FRENA, no elimina.',
    },
  },
  murcielago: {
    nodo: 'glossophaga_soricina',
    cientifico: 'Glossophaga soricina',
    comun: 'Murciélago lengüilargo nectarívoro',
    tipoBio: 'polinizador nocturno',
    // El nodo Animal del grafo NO trae `modo_accion`: lo que está documentado
    // son sus aristas POLINIZA. El modo de acción se lee de ahí y se dice tal
    // cual, sin inventarle atributos que el grafo no tiene.
    modoAccion: 'POLINIZA (aristas del grafo): Anacardium occidentale (marañón), '
      + 'Pouteria sapota (zapote), Musa × paradisiaca (plátano), '
      + 'Hylocereus undatus (pitahaya)',
    poder: {
      id: 'cae-la-noche',
      alcance: 'la pista entera',
      titulo: 'Cae la noche',
      efecto: 'Oscurece la pista para los demás. A él no le pasa nada: es su hora.',
      porQue: 'Es el ÚNICO polinizador nocturno del elenco. La pitahaya que '
        + 'poliniza (Hylocereus undatus) abre la flor de noche y la cierra al '
        + 'amanecer: sin este murciélago esa flor no tiene quién la visite. El '
        + 'poder no daña a nadie — mueve el mundo a la hora en que él trabaja.',
    },
  },
  morpho: {
    nodo: 'morpho_menelaus',
    cientifico: 'Morpho menelaus',
    comun: 'Morpho azul',
    tipoBio: 'polinizador diurno',
    // Igual que el murciélago: el nodo Animal no trae `modo_accion`, solo la
    // arista. Se transcribe la arista, no una ecología de memoria.
    modoAccion: 'POLINIZA (arista del grafo): Annona muricata (guanábana)',
    poder: {
      id: 'destello-azul',
      alcance: 'hacia atrás',
      titulo: 'Destello azul',
      efecto: 'Encandila a los que vienen atrás. Es el único poder que mira para '
        + 'atrás: no ataca al que persigue, lo deslumbra y se le pierde.',
      porQue: 'El azul de Morpho no es pigmento: es una lámina delgada sobre la '
        + 'escama que refracta la luz. Por eso destella y se apaga con el ángulo, '
        + 'y por eso al cerrar el ala aparece el envés café con ocelos y el bicho '
        + 'desaparece. Destello y desaparición es literalmente su defensa. Luz, '
        + 'no tóxico.',
    },
  },
  beauveria: {
    nodo: 'beauveria_bassiana',
    cientifico: 'Beauveria bassiana',
    comun: 'Hongo entomopatógeno (beauveria)',
    tipoBio: 'microbiano',
    // TEXTUAL del nodo BeneficialOrganism (fuente Cenicafé, autoridad
    // institucional, confianza alta — verificado contra el grafo AGE 2026-08-07)
    modoAccion: 'Hongo que parasita y mata insectos (broca, picudos, chupadores)',
    // las aristas CONTROLS del grafo que definen al personaje: la primera es
    // la broca del café, y por eso la broca colonizada es su marca visible
    modoAccion2: 'CONTROLS (grafo): Hypothenemus hampei (broca del café), '
      + 'Bemisia tabaci, Leucoptera coffeella, Aphis gossypii, Premnotrypes vorax…',
    poder: {
      id: 'esporas',
      alcance: 'estela',
      titulo: 'Esporas',
      efecto: 'Suelta una nube blanca en la estela: al que la cruza se le pegan '
        + 'las esporas y lo FRENAN DE A POCO — nunca de golpe, nunca lo saca.',
      porQue: 'La infección por contacto no es un rayo: la espora se pega a la '
        + 'cutícula, germina y tarda días en vencer al insecto. Por eso el poder '
        + 'es GRADUAL — la ficha del garaje ya lo decía («frena de a poco») y la '
        + 'mecánica obedece a la biología, no al revés. No es veneno: es un '
        + 'hongo vivo, y en el campo real es el estándar de Cenicafé contra la '
        + 'broca.',
    },
  },
};

// ── paleta ──────────────────────────────────────────────────────────────────
// La identidad de especie manda sobre la caricatura: la mariquita va
// NARANJA-Y-NEGRA aunque el imaginario común pida la roja de siete puntos.

export const PALETA_BENEFICOS = {
  crisopa: { cuerpo: 0x8fbf4f, cuerpo2: 0xd2e79b, cabeza: 0x9ccb5c, detalle: 0x3d5c1f },
  // detalle NO puede ser negro puro en la avispita: la ceja y la boca viven
  // sobre una cabeza negra y desaparecerían. Gris violáceo, que sí lee.
  avispita: { cuerpo: 0x232227, cuerpo2: 0x35333a, cabeza: 0x1c1b20, detalle: 0x554d59 },
  // cuerpo = las patas y el pronoto (leonados en el bicho real); el tronco va
  // aparte en `matTorso`, negro, porque ahí manda el élitro
  mariquita: { cuerpo: 0xd9721b, cuerpo2: 0xf0a044, cabeza: 0xdd7d22, detalle: 0x141318 },
  // Aphidius colemani: patas y antenas ÁMBAR, mesosoma y cabeza casi negros.
  // `cuerpo2` aquí no es un segundo tono del bicho: es el DORADO DE LA MOMIA,
  // que es la marca del personaje. detalle gris cálido, no negro: sobre cabeza
  // oscura un detalle negro desaparece (lección ya pagada con la avispita).
  momificador: { cuerpo: 0xa8762f, cuerpo2: 0xd8a63e, cabeza: 0x2a2118, detalle: 0x6d5c48 },
  // Glossophaga soricina: pardo canela, vientre más claro. NO gris-morado de
  // Halloween — el swatch del menú (0x5b4a66) va por otro lado y quedó anotado.
  murcielago: { cuerpo: 0x7c5636, cuerpo2: 0xb08a5e, cabeza: 0x7c5636, detalle: 0x33231a },
  // Morpho menelaus: el CUERPO es oscuro y peludo, no azul. El azul vive en el
  // ala y no es un color de paleta — es un material que responde a la luz.
  // Un azul en `pal` sería justo el error: azul plano no es Morpho.
  morpho: { cuerpo: 0x3a3542, cuerpo2: 0x6f5a3e, cabeza: 0x35303d, detalle: 0x625b70 },
  // Beauveria bassiana: BLANCO HUESO con respiro verdillo — el MISMO par
  // cromático del power-up de Angelita Bros (#f2fbe9 / #eafbe2 y esporas
  // rgba(226,255,214)), para que el hongo del kart y el del plataformero sean
  // el mismo ser y no dos ideas. `detalle` gris-verde oscuro: sobre una cara
  // blanca un detalle claro desaparece (lección pagada dos veces ya).
  beauveria: { cuerpo: 0xf2fbe9, cuerpo2: 0xdfead0, cabeza: 0xf4f9ec, detalle: 0x5c6b4e },
};

// El azul estructural en un solo lugar, para que nadie lo copie a mano.
export const AZUL_MORPHO = { ala: 0x2f6ad6, torax: 0x2c5fc8, envés: 0x6d5335 };

// ── rasgos: los escalares que lee el constructor genérico ───────────────────
// (lo que en pilotos-manejando.js eran ternarios `esJaguar ? … : …`)

export const RASGOS_BENEFICOS = {
  crisopa: {
    escalaRel: 0.94,          // insecto: chico y expresivo, no pesado
    torso: [0.86, 1.06, 0.78], // cuerpo esbelto de neuróptero
    hombroX: 0.185,
    craneo: [1.0, 0.94, 0.9],
    rBrazo: [0.040, 0.030], rPierna: [0.052, 0.041],
    // ojos GRANDES y dorados: el carácter que le da el nombre al género
    ojo: {
      x: 0.088, y: 0.055, z: 0.142, r: 0.066, rPupila: 0.026,
      cejaDY: 0.072, cejaDZ: -0.028, cejaW: 0.062, cejaH: 0.016,
    },
  },
  avispita: {
    escalaRel: 0.84,          // la más chiquita del elenco: 2 mm de bicho real
    torso: [0.84, 0.92, 0.80],
    hombroX: 0.175,
    craneo: [1.58, 0.98, 0.7], // cabeza GRANDE y aplanada: la firma del bethylido
    rBrazo: [0.036, 0.027], rPierna: [0.047, 0.037],
    ojo: {
      x: 0.105, y: 0.045, z: 0.116, r: 0.049, rPupila: 0.023,
      cejaDY: 0.068, cejaDZ: -0.012, cejaW: 0.054, cejaH: 0.015,
    },
  },
  mariquita: {
    escalaRel: 0.90,
    torso: [1.02, 0.86, 0.92], // coccinélido: compacto y abombado
    hombroX: 0.20,
    craneo: [0.96, 0.86, 0.94], // cabeza chica, metida bajo el pronoto
    rBrazo: [0.046, 0.035], rPierna: [0.058, 0.046],
    // el tronco es ÉLITRO, no pronoto: va negro y lustrado aunque las patas,
    // la cabeza y el escudo sean naranjas
    matTorso: { color: 0x18171c, rough: 0.2, metal: 0.2 },
    ojo: {
      x: 0.075, y: 0.048, z: 0.148, r: 0.052, rPupila: 0.023,
      cejaDY: 0.074, cejaDZ: -0.008, cejaW: 0.058, cejaH: 0.016,
    },
  },
  momificador: {
    // carga una momia al hombro: no puede ir tan chiquito como la avispita
    escalaRel: 0.87,
    torso: [0.80, 1.00, 0.76],  // mesosoma esbelto de bracónido
    hombroX: 0.172,
    // cabeza REDONDA, no la placa aplanada del betílido: son dos avispas
    // distintas y la cabeza es lo que las separa de un vistazo
    craneo: [1.06, 0.92, 0.86],
    rBrazo: [0.034, 0.026], rPierna: [0.045, 0.035],
    matTorso: { color: 0x2a2118, rough: 0.30, metal: 0.14 },
    ojo: {
      x: 0.092, y: 0.050, z: 0.128, r: 0.058, rPupila: 0.024,
      cejaDY: 0.070, cejaDZ: -0.014, cejaW: 0.056, cejaH: 0.015,
    },
  },
  murcielago: {
    escalaRel: 0.98,           // mamífero: el más grande de los bichos
    torso: [1.00, 1.02, 0.90],
    hombroX: 0.205,
    // el cráneo va LARGO EN Z: el rostro alargado del nectarívoro empieza en el
    // hueso, no en un hocico pegado encima. Es lo que lo separa del insectívoro
    // de cara chata que todo el mundo dibuja cuando dice «murciélago».
    // angosto además de largo: redondo salía cachorro de oso, no murciélago
    craneo: [0.86, 0.92, 1.20],
    rBrazo: [0.050, 0.038], rPierna: [0.058, 0.045],
    // la ceja va PEGADA al ojo: a la altura de siempre quedaba flotando sobre
    // el pelaje como una barra suelta
    ojo: {
      x: 0.078, y: 0.062, z: 0.155, r: 0.050, rPupila: 0.026,
      cejaDY: 0.056, cejaDZ: 0.014, cejaW: 0.058, cejaH: 0.014,
    },
  },
  morpho: {
    escalaRel: 0.92,
    torso: [0.80, 0.98, 0.80],
    hombroX: 0.178,
    craneo: [1.00, 0.94, 0.92],
    rBrazo: [0.034, 0.026], rPierna: [0.046, 0.036],
    matTorso: { color: 0x2c2833, rough: 0.95, metal: 0.0 },  // tórax peludo, mate
    // ojos COMPUESTOS: enormes y casi tocándose. En un lepidóptero el ojo se
    // come la cabeza; con ojos chicos lee escarabajo.
    ojo: {
      x: 0.098, y: 0.045, z: 0.120, r: 0.078, rPupila: 0.030,
      cejaDY: 0.086, cejaDZ: -0.030, cejaW: 0.060, cejaH: 0.014,
    },
  },
  beauveria: {
    // el hongo es MULLIDO: no tiene esqueleto, tiene fieltro. Torso ancho y
    // blando, cráneo redondo — la silueta es de cojín, no de bicho.
    escalaRel: 0.93,
    torso: [1.08, 0.96, 0.98],
    hombroX: 0.20,
    craneo: [1.08, 0.98, 1.0],
    rBrazo: [0.048, 0.038], rPierna: [0.058, 0.046],
    // fieltro: rugosidad al tope, cero metal. El blanco del micelio es MATE —
    // un blanco satinado leería porcelana y la porcelana no coloniza a nadie.
    matTorso: { color: 0xf2fbe9, rough: 0.98, metal: 0.0 },
    ojo: {
      x: 0.082, y: 0.048, z: 0.15, r: 0.058, rPupila: 0.026,
      cejaDY: 0.074, cejaDZ: -0.012, cejaW: 0.06, cejaH: 0.016,
    },
  },
};

export function esBenefico(tipo) {
  return Object.prototype.hasOwnProperty.call(PALETA_BENEFICOS, tipo);
}

// ── alas en TEXTURA, no en geometría ───────────────────────────────────────
// El ala de una crisopa es un encaje de venas y venillas. En geometría ese
// patrón costaría cientos de triángulos; en un canvas cuesta CERO y encima la
// silueta del ala también sale del alfa: cada ala es un plano de 2 triángulos.

function lienzo(px, py) {
  const c = document.createElement('canvas');
  c.width = px;
  c.height = py;
  return { c, ctx: c.getContext('2d') };
}

function rng(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// perfil de media anchura del ala, 0..1 a lo largo: angosta en la base, ancha
// al tercio final, punta redondeada
function perfilAla(u) {
  return (0.30 + 0.70 * Math.sin(Math.PI * u ** 0.8)) * (1 - u ** 7);
}

function siluetaAla(ctx, W, H) {
  const N = 44;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = u * W;
    const y = H * 0.52 - perfilAla(u) * H * 0.5;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  for (let i = N; i >= 0; i--) {
    const u = i / N;
    ctx.lineTo(u * W, H * 0.52 + perfilAla(u) * H * 0.46);
  }
  ctx.closePath();
}

// venación: longitudinales onduladas + un enrejado de venillas transversales.
// Ese enrejado ES el encaje que le da el nombre a la familia (Chrysopidae).
function venar(ctx, W, H, semilla, opts) {
  const rnd = rng(semilla);
  const { vena, nLong, nCruz, grosor, hastaU } = opts;
  ctx.strokeStyle = vena;
  ctx.lineCap = 'round';
  const yDe = (k, u) => {
    const t = k / (nLong - 1) - 0.5;
    return H * 0.52 + t * perfilAla(u) * H * 0.9 + Math.sin(u * 7 + k) * H * 0.012;
  };
  ctx.lineWidth = grosor;
  for (let k = 0; k < nLong; k++) {
    ctx.beginPath();
    for (let i = 0; i <= 30; i++) {
      const u = i / 30;
      if (u > hastaU) break;
      const x = u * W;
      const y = yDe(k, u);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.lineWidth = grosor * 0.72;
  for (let k = 0; k < nLong - 1; k++) {
    for (let j = 0; j < nCruz; j++) {
      const u = (j + 0.5 + (k % 2) * 0.4) / nCruz * hastaU;
      const x = u * W + (rnd() - 0.5) * W * 0.012;
      ctx.beginPath();
      ctx.moveTo(x, yDe(k, u));
      ctx.lineTo(x + (rnd() - 0.5) * W * 0.02, yDe(k + 1, u));
      ctx.stroke();
    }
  }
  // costa: el borde de ataque va más grueso y más oscuro en todo bicho volador
  ctx.lineWidth = grosor * 1.9;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    const x = u * W;
    const y = H * 0.52 - perfilAla(u) * H * 0.48;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

// pterostigma: la mancha engrosada y opaca sobre el borde de ataque, a media
// ala. En los bracónidos es carácter diagnóstico — un ala hialina sin estigma
// se lee como ala de mosca.
function estigmar(ctx, W, H, color) {
  const u0 = 0.42;
  const u1 = 0.62;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(u0 * W, H * 0.52 - perfilAla(u0) * H * 0.48);
  ctx.lineTo(u1 * W, H * 0.52 - perfilAla(u1) * H * 0.48);
  ctx.lineTo(u1 * W * 0.985, H * 0.52 - perfilAla(u1) * H * 0.30);
  ctx.lineTo(u0 * W * 1.02, H * 0.52 - perfilAla(u0) * H * 0.28);
  ctx.closePath();
  ctx.fill();
}

function pintarAla(px, py, membrana, opts) {
  const { c, ctx } = lienzo(px, py);
  ctx.clearRect(0, 0, px, py);
  siluetaAla(ctx, px, py);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = membrana;
  ctx.fillRect(0, 0, px, py);
  venar(ctx, px, py, opts.semilla, opts);
  if (opts.estigma) estigmar(ctx, px, py, opts.estigma);
  ctx.restore();
  return c;
}

function comoTextura(THREE, canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let _alas = null;

// tres mapas de ala, generados una vez y compartidos por todos los pilotos
export function texturasAlas(THREE) {
  if (_alas !== null) return _alas;
  if (typeof document === 'undefined') { _alas = false; return _alas; }
  try {
    _alas = {
      // crisopa: encaje denso hasta la punta, verde tierno translúcido.
      // La membrana no puede ser tan transparente que solo se vean las venas:
      // el brief pide alas VERDES translúcidas, no un alambrado.
      crisopa: comoTextura(THREE, pintarAla(256, 96, 'rgba(186,228,132,0.46)', {
        vena: 'rgba(74,112,40,0.86)', nLong: 8, nCruz: 13, grosor: 1.7, hastaU: 0.985, semilla: 0x51a7,
      })),
      // bethylido: venación REDUCIDA — solo el tercio basal la tiene, y ahumada
      avispita: comoTextura(THREE, pintarAla(192, 84, 'rgba(150,138,126,0.34)', {
        vena: 'rgba(58,50,44,0.80)', nLong: 4, nCruz: 3, grosor: 2.1, hastaU: 0.42, semilla: 0x2c19,
      })),
      // ala membranosa del coccinélido: vive plegada bajo el élitro, casi no se ve
      mariquita: comoTextura(THREE, pintarAla(192, 84, 'rgba(120,120,132,0.34)', {
        vena: 'rgba(40,40,48,0.72)', nLong: 3, nCruz: 4, grosor: 2.0, hastaU: 0.7, semilla: 0x7d33,
      })),
      // bracónido: ala HIALINA de verdad (casi vidrio), venación reducida al
      // tercio basal y PTEROSTIGMA oscuro sobre la costa. El estigma es la
      // diferencia entre «avispa» y «mosquita».
      momificador: comoTextura(THREE, pintarAla(224, 92, 'rgba(226,228,232,0.22)', {
        vena: 'rgba(72,60,44,0.72)', nLong: 5, nCruz: 4, grosor: 1.6, hastaU: 0.5,
        semilla: 0x9f41, estigma: 'rgba(58,44,28,0.88)',
      })),
    };
  } catch {
    _alas = false;
  }
  return _alas;
}

export function matAla(THREE, tex, tinte) {
  if (!tex) {
    return new THREE.MeshStandardMaterial({
      color: tinte, transparent: true, opacity: 0.4, side: THREE.DoubleSide,
      roughness: 0.25, metalness: 0.02, depthWrite: false,
    });
  }
  return new THREE.MeshStandardMaterial({
    map: tex, transparent: true, side: THREE.DoubleSide,
    roughness: 0.22, metalness: 0.02, depthWrite: false, alphaTest: 0.01,
  });
}

// ── siluetas que no son de insecto ─────────────────────────────────────────
// Misma regla que el resto: la silueta sale del ALFA de la textura, así que un
// ala de murciélago con borde festoneado y un ala de mariposa con ápice
// falcado siguen costando 2 triángulos cada una. La forma es gratis; lo caro
// sería dibujarla con geometría.

function siluetaDe(ctx, W, H, sup, inf) {
  const N = 52;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    ctx.lineTo(u * W, H * 0.52 - sup(u) * H * 0.5);
  }
  for (let i = N; i >= 0; i--) {
    const u = i / N;
    ctx.lineTo(u * W, H * 0.52 + inf(u) * H * 0.46);
  }
  ctx.closePath();
}

// Murciélago: el borde de ataque es el brazo + el dedo II, casi recto. El de
// fuga va FESTONEADO entre los dedos III, IV y V — la membrana cuelga entre
// hueso y hueso. Ese festón es lo que separa una silueta de murciélago de una
// de pájaro; sin él queda un ala de cuervo.
const supMurci = (u) => (0.34 + 0.66 * Math.sin(Math.PI * u ** 0.5)) * (1 - u ** 10);
const infMurci = (u) => Math.max(0.03,
  (0.30 + 0.70 * Math.sin(Math.PI * u ** 0.9)) - 0.24 * Math.sin(Math.PI * 3 * u) ** 2)
  * (1 - u ** 10);

function pintarAlaMurcielago(px, py) {
  const { c, ctx } = lienzo(px, py);
  ctx.clearRect(0, 0, px, py);
  siluetaDe(ctx, px, py, supMurci, infMurci);
  ctx.save();
  ctx.clip();
  // membrana: parda y MUY translúcida. La luz pasa por el ala de un
  // murciélago; una membrana opaca la vuelve capa de vampiro. Va clara además
  // por una razón de dibujo: los huesos tienen que recortarse OSCUROS encima,
  // y en el primer intento membrana y hueso eran del mismo pardo — el ala
  // quedaba como una tabla lisa y el personaje se perdía.
  const g = ctx.createLinearGradient(0, 0, px, 0);
  g.addColorStop(0, 'rgba(148,110,84,0.68)');
  g.addColorStop(0.55, 'rgba(176,136,106,0.46)');
  g.addColorStop(1, 'rgba(198,160,128,0.34)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, px, py);

  // los HUESOS DE LOS DEDOS: cuatro varillas que abanican desde la muñeca al
  // borde. Es LO que dice «murciélago» — sin ellas la silueta es un ala de
  // cuervo. Van oscuras y gruesas: es el esqueleto visto por transparencia.
  const munecaX = px * 0.13;
  const munecaY = py * 0.5;
  const destinos = [[1.0, 0], [0.66, 1], [0.34, 1], [0.06, 1]];
  ctx.lineCap = 'round';
  for (const [u, haciaFuga] of destinos) {
    const y = haciaFuga
      ? py * 0.52 + infMurci(u) * py * 0.44
      : py * 0.52 - supMurci(u) * py * 0.46;
    ctx.strokeStyle = 'rgba(48,31,21,0.94)';
    ctx.lineWidth = py * 0.075 * (1 - u * 0.42);
    ctx.beginPath();
    ctx.moveTo(munecaX, munecaY);
    ctx.quadraticCurveTo(u * px * 0.55, munecaY + (y - munecaY) * 0.3, u * px, y);
    ctx.stroke();
  }
  // húmero + antebrazo: el tramo grueso de la base a la muñeca
  ctx.strokeStyle = 'rgba(42,27,18,0.96)';
  ctx.lineWidth = py * 0.12;
  ctx.beginPath();
  ctx.moveTo(0, py * 0.48);
  ctx.lineTo(munecaX, munecaY);
  ctx.stroke();
  // pulgar con garra: el ganchito libre en el codo del ala, con el que trepa
  // la flor. Chiquito, pero es el detalle que remata la mano-ala.
  ctx.lineWidth = py * 0.045;
  ctx.beginPath();
  ctx.moveTo(munecaX, munecaY);
  ctx.quadraticCurveTo(munecaX + px * 0.02, py * 0.22, munecaX + px * 0.055, py * 0.14);
  ctx.stroke();
  // vasos: la red fina de la membrana, apenas insinuada
  const rnd = rng(0x4b19);
  ctx.strokeStyle = 'rgba(96,62,44,0.4)';
  ctx.lineWidth = 1.3;
  for (let k = 0; k < 26; k++) {
    const u = 0.18 + rnd() * 0.74;
    const y0 = py * 0.52 - supMurci(u) * py * 0.4;
    ctx.beginPath();
    ctx.moveTo(munecaX + rnd() * px * 0.1, munecaY + (rnd() - 0.5) * py * 0.2);
    ctx.lineTo(u * px, y0 + rnd() * py * 0.7);
    ctx.stroke();
  }
  ctx.restore();
  return c;
}

// Mariposa: el ala anterior es triangular con la costa recta y el ápice caído;
// la posterior es redonda y corta. Dos perfiles, un mismo pintor.
const PERFIL_MARIPOSA = {
  delantera: {
    sup: (u) => (0.56 + 0.44 * u ** 0.5) * (1 - u ** 14),
    inf: (u) => (0.24 + 0.86 * Math.sin(Math.PI * 0.5 * u ** 0.8)) * (1 - u ** 10),
  },
  trasera: {
    sup: (u) => (0.50 + 0.50 * Math.sin(Math.PI * u ** 0.7)) * (1 - u ** 8),
    inf: (u) => (0.46 + 0.54 * Math.sin(Math.PI * u ** 0.62)) * (1 - u ** 8),
  },
};

// ── el ala de Morpho son DOS materiales, no uno ────────────────────────────
// Es el hallazgo que salvó este piloto. El campo azul y el borde negro no son
// dos colores del mismo material: son dos físicas distintas. El azul es
// ESTRUCTURAL (lámina delgada sobre escama lisa: refleja, destella, cambia con
// el ángulo). El negro es PIGMENTO (melanina, escama rugosa: absorbe y no
// devuelve nada). Pintados como un solo material iridiscente, el borde «negro»
// salía VERDE — y con razón: una lámina delgada sobre un sustrato oscuro es
// justo la receta de la burbuja de jabón. El negro no se apagaba porque
// físicamente no podía apagarse.
//
// La solución es la del fenómeno, no un parche de color: un segundo mapa que
// dice, píxel por píxel, cuánta iridiscencia / rugosidad / metalness hay. three
// lee esos tres canales por separado — R=iridescenceMap, G=roughnessMap,
// B=metalnessMap — así que los tres caben en UNA textura. Donde hay escama
// azul: R alto, G bajo, B medio. Donde hay melanina: R=0, G=1, B=0. El borde
// vuelve a ser negro de verdad y el azul sigue destellando.

// paletas gemelas: mismo dibujo, una en color y otra en propiedades
const MORPHO_COLOR = {
  campo: ['#17307f', '#2f6ad6', '#4b95ee', '#20489f'],
  escamaClara: 'rgba(150,205,255,0.16)',
  escamaOscura: 'rgba(12,28,86,0.18)',
  vena: 'rgba(11,25,74,0.5)',
  borde: '#0a0a12',
  mota: 'rgba(238,242,250,0.92)',
};
const MORPHO_DATOS = {
  // R=0.75 iridiscencia · G=0.14 liso · B=0.40 semimetálico.
  // La iridiscencia va en 0.75 y no en 1: a full, en ángulo rasante —donde
  // Fresnel manda— el tinte de la lámina se comía el azul de base y el ala
  // entera viraba a verde. A 0.75 el azul del mapa sostiene la identidad y la
  // lámina modula encima: sigue destellando y sigue siendo Morpho.
  campo: ['rgb(190,36,102)', 'rgb(190,36,102)', 'rgb(190,36,102)', 'rgb(190,36,102)'],
  // las estrías modulan SOLO la rugosidad: eso rompe el especular en filas,
  // que es lo que hace la escama de verdad, sin ensuciar el color
  escamaClara: 'rgba(190,10,102,0.5)',
  escamaOscura: 'rgba(190,70,102,0.5)',
  vena: 'rgba(150,150,60,0.55)',
  // R=0 sin iridiscencia · G=0.95 rugoso · B=0 nada de metal → negro de verdad
  borde: 'rgb(0,242,0)',
  mota: 'rgb(0,242,0)',
};

function pintarMorphoDorso(px, py, tipo, P) {
  const { sup, inf } = PERFIL_MARIPOSA[tipo];
  const { c, ctx } = lienzo(px, py);
  ctx.clearRect(0, 0, px, py);
  siluetaDe(ctx, px, py, sup, inf);
  ctx.save();
  ctx.clip();
  const g = ctx.createLinearGradient(0, py, px, 0);
  g.addColorStop(0, P.campo[0]);
  g.addColorStop(0.34, P.campo[1]);
  g.addColorStop(0.62, P.campo[2]);
  g.addColorStop(1, P.campo[3]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, px, py);

  // filas de escamas: trazos cortos, tenues. Cortos a propósito — largos se
  // leían como rayones verticales sobre el ala.
  const rnd = rng(0x33c7);
  ctx.lineCap = 'butt';
  for (let k = 0; k < 160; k++) {
    const u = rnd();
    const x = u * px;
    const yTop = py * 0.52 - sup(u) * py * 0.5;
    const yBot = py * 0.52 + inf(u) * py * 0.46;
    const y = yTop + rnd() * (yBot - yTop);
    ctx.strokeStyle = rnd() > 0.5 ? P.escamaClara : P.escamaOscura;
    ctx.lineWidth = py * 0.016;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + px * 0.014, y + py * 0.006);
    ctx.stroke();
  }
  // venas: radiales desde la base
  ctx.strokeStyle = P.vena;
  for (let k = 0; k < 6; k++) {
    const t = (k + 0.5) / 6;
    ctx.lineWidth = py * 0.012;
    ctx.beginPath();
    ctx.moveTo(0, py * 0.5);
    for (let i = 1; i <= 16; i++) {
      const u = i / 16;
      const yTop = py * 0.52 - sup(u) * py * 0.5;
      const yBot = py * 0.52 + inf(u) * py * 0.46;
      ctx.lineTo(u * px, yTop + t * (yBot - yTop));
    }
    ctx.stroke();
  }
  // borde: se consigue trazando la propia silueta GRUESO con el clip puesto,
  // así solo entra hacia adentro y el filo queda limpio
  ctx.strokeStyle = P.borde;
  ctx.lineJoin = 'round';
  ctx.lineWidth = py * (tipo === 'delantera' ? 0.20 : 0.15);
  siluetaDe(ctx, px, py, sup, inf);
  ctx.stroke();
  if (tipo === 'delantera') {
    // ápice: en M. menelaus el negro se ensancha en la punta y lleva una fila
    // de puntitos blancos. Es el detalle que lo saca de «mariposa azul» genérica.
    ctx.fillStyle = P.borde;
    ctx.beginPath();
    ctx.moveTo(px * 0.84, 0);
    ctx.lineTo(px, 0);
    ctx.lineTo(px, py);
    ctx.lineTo(px * 0.93, py);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = P.mota;
    for (let k = 0; k < 4; k++) {
      const u = 0.885 + k * 0.028;
      const yTop = py * 0.52 - sup(u) * py * 0.44;
      ctx.beginPath();
      ctx.arc(u * px, yTop + py * 0.12 + k * py * 0.06, py * 0.024, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  return c;
}

// Envés: café con OCELOS. Se pinta espejado en X porque el plano del envés va
// rotado 180° sobre Y — sin espejar, la base del ala aterrizaría en la punta.
function pintarMorphoEnves(px, py, tipo) {
  const { sup, inf } = PERFIL_MARIPOSA[tipo];
  const { c, ctx } = lienzo(px, py);
  ctx.clearRect(0, 0, px, py);
  ctx.save();
  ctx.translate(px, 0);
  ctx.scale(-1, 1);
  siluetaDe(ctx, px, py, sup, inf);
  ctx.save();
  ctx.clip();
  // café OSCURO de hoja seca. El primer intento salió beige claro y el envés
  // dejaba de ser camuflaje: si el revés no es más apagado que el dorso, no hay
  // «destello y desaparición», que es la mitad del personaje.
  // La luz de escena es fuerte y un café «oscuro en el canvas» sale beige en
  // pantalla: hubo que bajarlo dos veces hasta que el envés quedó de verdad
  // más apagado que el dorso.
  const g = ctx.createLinearGradient(0, 0, px, py);
  g.addColorStop(0, '#241b11');
  g.addColorStop(0.5, '#3f3122');
  g.addColorStop(1, '#2b2116');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, px, py);
  // jaspeado: bandas onduladas, la librea críptica de la hoja seca
  const rnd = rng(0x8e22);
  for (let k = 0; k < 9; k++) {
    ctx.strokeStyle = k % 2 ? 'rgba(28,20,12,0.5)' : 'rgba(126,106,80,0.28)';
    ctx.lineWidth = py * (0.03 + rnd() * 0.05);
    const base = rnd() * py;
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const u = i / 20;
      ctx.lineTo(u * px, base + Math.sin(u * 6 + k) * py * 0.09);
    }
    ctx.stroke();
  }
  // ocelos: anillo pálido, anillo negro, centro oscuro y una chispa blanca.
  // Sin la chispa el ocelo no lee como ojo, y el ocelo ES el envés de Morpho.
  const ocelos = tipo === 'delantera'
    ? [[0.52, 0.30], [0.68, 0.36], [0.83, 0.42]]
    : [[0.40, 0.62], [0.58, 0.66], [0.75, 0.62], [0.88, 0.55]];
  for (const [u, v] of ocelos) {
    const yTop = py * 0.52 - sup(u) * py * 0.5;
    const yBot = py * 0.52 + inf(u) * py * 0.46;
    const x = u * px;
    const y = yTop + v * (yBot - yTop);
    const r = py * 0.15;
    for (const [rr, col] of [[r, '#8f7a58'], [r * 0.78, '#0c0804'], [r * 0.5, '#2a1d0c']]) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#f2eee2';
    ctx.beginPath();
    ctx.arc(x - r * 0.16, y - r * 0.16, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
  return c;
}

// Un mapa de PROPIEDADES no es una imagen: es un dato. Si se marca como sRGB,
// el motor le aplica la curva de gamma y los números salen corridos — la
// rugosidad y el metalness quedarían mal sin que se note por qué.
function comoDatos(THREE, canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  if (THREE.NoColorSpace !== undefined) tex.colorSpace = THREE.NoColorSpace;
  else if (THREE.LinearSRGBColorSpace !== undefined) tex.colorSpace = THREE.LinearSRGBColorSpace;
  return tex;
}

// ── piel de la momia ───────────────────────────────────────────────────────
// Una momia de áfido NO es una bolita lisa: es un cuerpo reseco, segmentado y
// arrugado, con el brillo apagado del papel. En liso salía huevo de Pascua. Los
// anillos de segmento y las arrugas van en textura porque en geometría
// costarían cientos de triángulos y aquí cuestan cero.
function pintarMomia(px, py) {
  const { c, ctx } = lienzo(px, py);
  const g = ctx.createLinearGradient(0, 0, 0, py);
  g.addColorStop(0, '#b7862c');
  g.addColorStop(0.45, '#e0b04a');
  g.addColorStop(1, '#9c6f24');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, px, py);
  // anillos de segmento: MUY suaves. En el primer intento iban marcados y
  // regulares y la momia salió barril de madera — duelas y todo. El bicho
  // reseco tiene segmentos, pero difusos: manda la piel arrugada, no el aro.
  const rnd = rng(0x6ac3);
  ctx.lineCap = 'round';
  for (let k = 1; k < 7; k++) {
    const y = (k / 7) * py + (rnd() - 0.5) * py * 0.03;
    ctx.strokeStyle = 'rgba(120,82,22,0.17)';
    ctx.lineWidth = py * 0.05;
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) ctx.lineTo((i / 24) * px, y + Math.sin(i * 0.7 + k) * py * 0.02);
    ctx.stroke();
  }
  // arrugas y manchas del secado: aquí está el carácter. Son las que dicen
  // «esto se deshidrató» en vez de «esto es un huevo pintado».
  for (let k = 0; k < 110; k++) {
    const x = rnd() * px;
    const y = rnd() * py;
    ctx.strokeStyle = rnd() > 0.45 ? 'rgba(112,74,18,0.30)' : 'rgba(255,232,170,0.26)';
    ctx.lineWidth = 1 + rnd() * 2.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + (rnd() - 0.5) * px * 0.07, y + py * 0.03,
      x + (rnd() - 0.5) * px * 0.06, y + py * 0.075);
    ctx.stroke();
  }
  // manchones del secado desparejo
  for (let k = 0; k < 16; k++) {
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(140,96,28,0.18)' : 'rgba(248,214,140,0.16)';
    ctx.beginPath();
    ctx.ellipse(rnd() * px, rnd() * py, px * (0.03 + rnd() * 0.05), py * (0.04 + rnd() * 0.07),
      rnd() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

let _pielMomia = null;

function texturaMomia(THREE) {
  if (_pielMomia !== null) return _pielMomia;
  if (typeof document === 'undefined') { _pielMomia = false; return _pielMomia; }
  try {
    _pielMomia = comoTextura(THREE, pintarMomia(128, 96));
  } catch {
    _pielMomia = false;
  }
  return _pielMomia;
}

let _alasEsp = null;

export function texturasAlasEspeciales(THREE) {
  if (_alasEsp !== null) return _alasEsp;
  if (typeof document === 'undefined') { _alasEsp = false; return _alasEsp; }
  try {
    _alasEsp = {
      murcielago: comoTextura(THREE, pintarAlaMurcielago(288, 128)),
      morphoDelanteraDorso: comoTextura(THREE, pintarMorphoDorso(320, 208, 'delantera', MORPHO_COLOR)),
      morphoDelanteraProps: comoDatos(THREE, pintarMorphoDorso(320, 208, 'delantera', MORPHO_DATOS)),
      morphoDelanteraEnves: comoTextura(THREE, pintarMorphoEnves(320, 208, 'delantera')),
      morphoTraseraDorso: comoTextura(THREE, pintarMorphoDorso(256, 208, 'trasera', MORPHO_COLOR)),
      morphoTraseraProps: comoDatos(THREE, pintarMorphoDorso(256, 208, 'trasera', MORPHO_DATOS)),
      morphoTraseraEnves: comoTextura(THREE, pintarMorphoEnves(256, 208, 'trasera')),
    };
  } catch {
    _alasEsp = false;
  }
  return _alasEsp;
}

// ── cielo pintado: sin esto la Morpho no destella ──────────────────────────
// Un material metálico o iridiscente no inventa brillo: REFLEJA algo. Sin
// envMap, metalness alto se ve gris muerto y el azul queda plano — que es
// exactamente el error que hay que evitar aquí. Es la misma lámina de cielo que
// usa la chiva para el cromo, en versión bosque: dosel arriba, hojarasca abajo,
// horizonte claro al medio. Ese horizonte es el que barre el ala al girar y
// produce el destello.

let _cielo = null;

function cieloDeBosque(THREE) {
  if (_cielo !== null) return _cielo;
  if (typeof document === 'undefined') { _cielo = false; return _cielo; }
  try {
    const cara = (tipo) => {
      const { c, ctx } = lienzo(64, 64);
      if (tipo === 1) {
        const g = ctx.createRadialGradient(32, 32, 3, 32, 32, 46);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(1, '#a6cbe0');
        ctx.fillStyle = g;
      } else if (tipo === -1) {
        const g = ctx.createRadialGradient(32, 32, 3, 32, 32, 46);
        g.addColorStop(0, '#6b6055');
        g.addColorStop(1, '#3a342e');
        ctx.fillStyle = g;
      } else {
        // El suelo va PARDO NEUTRO, no verde de dosel. Esto costó una tarde:
        // el ala de la Morpho se iba a verde en ángulo rasante y el sospechoso
        // obvio era la iridiscencia. No era. En ángulo rasante manda Fresnel y
        // el ala está REFLEJANDO el cielo — y el cielo lo había pintado yo,
        // verde bosque. El instrumento mentía antes que el sujeto. Con un
        // horizonte neutro el reflejo no aporta color y el azul sobrevive.
        const g = ctx.createLinearGradient(0, 0, 0, 64);
        g.addColorStop(0, '#9dc5de');
        g.addColorStop(0.42, '#eaf3f8');
        g.addColorStop(0.54, '#9a8f80');
        g.addColorStop(1, '#4a443c');
        ctx.fillStyle = g;
      }
      ctx.fillRect(0, 0, 64, 64);
      return c;
    };
    const ct = new THREE.CubeTexture([cara(0), cara(0), cara(1), cara(-1), cara(0), cara(0)]);
    if (THREE.SRGBColorSpace) ct.colorSpace = THREE.SRGBColorSpace;
    ct.needsUpdate = true;
    _cielo = ct;
  } catch {
    _cielo = false;
  }
  return _cielo;
}

// Material del ala dorsal de Morpho. `iridescence` de three NO es un tinte
// falso: modela una lámina delgada sobre la superficie, que es literalmente lo
// que tiene la escama de Morpho (multicapa de quitina que interfiere la luz).
// El grosor de esa lámina decide el color, y por eso el azul se corre a
// violeta y a cian según el ángulo. Es el fenómeno, no una imitación.
export function materialIridiscente(THREE, tex, color, props) {
  const cielo = cieloDeBosque(THREE);
  // con mapa de propiedades los escalares pasan a ser TOPES: three multiplica
  // canal × escalar, así que van en 1.0 y el mapa decide dónde hay qué. Sin
  // mapa (el lomo del bicho, que es azul entero) mandan los escalares.
  const base = {
    map: tex || null,
    color: tex ? 0xffffff : (color ?? AZUL_MORPHO.ala),
    side: THREE.FrontSide,
    alphaTest: tex ? 0.5 : 0,
    roughness: props ? 1.0 : 0.16,
    metalness: props ? 1.0 : 0.42,
    roughnessMap: props || null,
    metalnessMap: props || null,
    envMap: cielo || null,
    envMapIntensity: 1.55,
  };
  if (THREE.MeshPhysicalMaterial) {
    try {
      return new THREE.MeshPhysicalMaterial({
        ...base,
        iridescence: 1.0,
        iridescenceMap: props || null,
        iridescenceIOR: 1.85,
        // Sin mapa de espesor, three usa el TOPE del rango como grosor de la
        // lámina, y el grosor decide el color. El número no se tanteó: para
        // índice ~1.85, el máximo de reflexión cae en λ = 2·n·d/m. Con d=520 el
        // segundo orden daba 641 nm (rojo) y el tercero 481, y en ángulo rasante
        // el ala se iba a verde-amarillo — parecía escarabajo. Con d=240 el
        // segundo orden cae en ~444 nm, azul-violeta, y el barrido angular corre
        // hacia el violeta en vez de hacia el verde. Que es lo que hace Morpho.
        iridescenceThicknessRange: [100, 240],
        clearcoat: 0.6,
        clearcoatRoughness: 0.12,
      });
    } catch { /* three viejo: cae al standard de abajo */ }
  }
  return new THREE.MeshStandardMaterial({ ...base, metalness: props ? 1.0 : 0.62 });
}

// un ala = pivote (lo barre aplicarPose) → orientador fijo → plano de 2 tris.
// El pivote NO lleva el ángulo de reposo: ese va en el orientador, porque
// aplicarPose multiplica rotation.y por el lado y eso espeja mal un reposo
// asimétrico. Así el barrido queda simétrico y la pose de reposo, libre.
//
// El reposo se declara como DIRECCIÓN del eje del ala, no como tres ángulos
// de Euler. Espejar Euler no espeja la dirección —negando los ángulos el ala
// izquierda terminaba apuntando al mismo costado que la derecha y se metía
// dentro del cuerpo—; espejar un vector sí, y es una sola multiplicación.
// `roll` gira la membrana sobre su propio eje: es lo que arma el tejadillo.
const _EJE_ALA = { x: 1, y: 0, z: 0 };

// (exportadas: pilotos-compai.js arma sus alas y antenas con estos mismos
// ayudantes — reusar la maquinaria, no fotocopiarla)
export function crearAla(THREE, material, largo, ancho, lado, base, dir, roll, ud) {
  const pivote = new THREE.Group();
  pivote.position.set(base[0] * lado, base[1], base[2]);
  const orientador = new THREE.Group();
  const eje = new THREE.Vector3(_EJE_ALA.x, _EJE_ALA.y, _EJE_ALA.z);
  const hacia = new THREE.Vector3(dir[0] * lado, dir[1], dir[2]).normalize();
  orientador.quaternion.setFromUnitVectors(eje, hacia);
  orientador.rotateX(roll * lado);
  const plano = new THREE.Mesh(new THREE.PlaneGeometry(largo, ancho), material);
  plano.position.x = largo * 0.5;
  plano.userData.sinSombra = true;
  orientador.add(plano);
  pivote.add(orientador);
  pivote.userData = { lado, restY: 0, amp: 0.28, ...ud };
  return pivote;
}

// Ala de DOS CARAS. En un insecto de membrana da igual por dónde se mire; en
// Morpho no: arriba va el azul estructural y abajo el café con ocelos, y el
// bicho existe justamente en el contraste entre las dos. Un solo plano
// DoubleSide mostraría el azul por detrás y mataría la mitad del personaje.
// Son dos planos separados por 2 mm: 4 triángulos por ala, no 2. El envés va
// rotado 180° sobre Y (por eso su textura se pinta espejada en X).
function crearAlaMariposa(THREE, matDorso, matEnves, largo, ancho, lado, base, dir, roll, ud) {
  const pivote = new THREE.Group();
  pivote.position.set(base[0] * lado, base[1], base[2]);
  const orientador = new THREE.Group();
  const eje = new THREE.Vector3(_EJE_ALA.x, _EJE_ALA.y, _EJE_ALA.z);
  const hacia = new THREE.Vector3(dir[0] * lado, dir[1], dir[2]).normalize();
  orientador.quaternion.setFromUnitVectors(eje, hacia);
  orientador.rotateX(roll * lado);
  const geo = new THREE.PlaneGeometry(largo, ancho);
  const dorso = new THREE.Mesh(geo, matDorso);
  dorso.position.set(largo * 0.5, 0, 0.0018);
  dorso.userData.sinSombra = true;
  orientador.add(dorso);
  const enves = new THREE.Mesh(geo, matEnves);
  enves.position.set(largo * 0.5, 0, -0.0018);
  enves.rotation.y = Math.PI;
  enves.userData.sinSombra = true;
  orientador.add(enves);
  pivote.add(orientador);
  pivote.userData = { lado, restY: 0, amp: 0.28, ...ud };
  return pivote;
}

// antena de dos tramos: un tramo recto se lee como palito, dos se leen como
// antena. El acodo (geniculada) es diagnóstico en las avispas.
export function crearAntena(THREE, mVar, mPunta, tramos, ud) {
  const raiz = new THREE.Group();
  let padre = raiz;
  for (const [r0, r1, largo, ang] of tramos) {
    const seg = new THREE.Group();
    seg.rotation.x = ang;
    const varilla = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, largo, 5, 1, true), mVar);
    varilla.position.y = largo * 0.5;
    seg.add(varilla);
    padre.add(seg);
    padre = new THREE.Group();
    padre.position.y = largo;
    seg.add(padre);
  }
  if (mPunta) {
    const punta = new THREE.Mesh(new THREE.SphereGeometry(mPunta.r, 6, 4), mPunta.material);
    punta.scale.set(1, 1.35, 1);
    padre.add(punta);
  }
  raiz.userData = ud;
  raiz.rotation.z = ud.restZ;
  return raiz;
}

// ── constructores por especie ───────────────────────────────────────────────
// Reciben el contexto del constructor genérico y devuelven { bocaBase }.

function construirCrisopa(THREE, ctx) {
  const { THREEmat, pal, pecho, cabeza, partes, mBlanco, mNegro } = ctx;
  const mCuerpo = THREEmat(pal.cuerpo, 0.72);
  const mClaro = THREEmat(pal.cuerpo2, 0.7);
  const mOscuro = THREEmat(pal.detalle, 0.8);

  // protórax angosto: el cuello largo del neuróptero, entre cabeza y tórax
  const protorax = new THREE.Mesh(new THREE.SphereGeometry(0.115, 8, 6), mClaro);
  protorax.scale.set(1.0, 0.72, 1.05);
  protorax.position.set(0, 0.53, 0.01);
  pecho.add(protorax);

  // abdomen largo y afinado, echado hacia atrás
  const abdomen = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.2, 3, 8), mCuerpo);
  abdomen.rotation.x = 1.15;
  abdomen.scale.set(1, 1, 0.92);
  abdomen.position.set(0, 0.16, -0.16);
  pecho.add(abdomen);
  // banda dorsal más clara: el verde de la crisopa no es plano, tiene una raya
  const raya = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.2, 2, 5), mClaro);
  raya.rotation.x = 1.15;
  raya.position.set(0, 0.235, -0.22);
  pecho.add(raya);

  // ── las cuatro alas en tejadillo: LA silueta de la crisopa ────────────────
  // Van GRANDES (más largas que el cuerpo, como en el bicho) y bastante
  // abiertas hacia el costado: si se cierran sobre el dorso desaparecen de
  // frente, y de frente es como se ve al piloto en carrera.
  const tex = texturasAlas(THREE);
  const mAla = matAla(THREE, tex && tex.crisopa, 0xc4e896);
  const alas = new THREE.Group();
  alas.position.set(0, 0.47, -0.08);
  for (const lado of [-1, 1]) {
    // anterior: la grande, más alta y más tendida
    alas.add(crearAla(THREE, mAla, 0.8, 0.33, lado,
      [0.09, 0.1, 0], [0.74, 0.30, -0.60], 0.6, { amp: 0.26 }));
    // posterior: algo menor, por debajo, cerrando el tejadillo
    alas.add(crearAla(THREE, mAla, 0.66, 0.28, lado,
      [0.07, -0.02, -0.03], [0.70, 0.02, -0.72], 0.3, { amp: 0.2 }));
  }
  pecho.add(alas);
  partes.extras.alas = alas;

  // ── cabeza: los ojos dorados metálicos son la firma ──────────────────────
  // (el material del ojo se resuelve en el constructor genérico)
  const mejilla = new THREE.Mesh(new THREE.SphereGeometry(0.055, 7, 5), mClaro);
  mejilla.scale.set(1, 0.9, 0.6);
  mejilla.position.set(0, -0.055, 0.13);
  cabeza.add(mejilla);

  // palpos: dos ganchitos junto a la boca, mandíbulas masticadoras
  for (const lado of [-1, 1]) {
    const palpo = new THREE.Mesh(new THREE.ConeGeometry(0.017, 0.06, 5), mOscuro);
    palpo.position.set(lado * 0.052, -0.115, 0.135);
    palpo.rotation.set(0.7, 0, lado * 0.3);
    cabeza.add(palpo);
  }

  // antenas filiformes LARGAS: más largas que la cabeza, finitas, tendidas
  // hacia adelante en reposo y peinadas hacia atrás por el viento
  for (const lado of [-1, 1]) {
    const antena = crearAntena(THREE, mClaro, { r: 0.017, material: mOscuro }, [
      [0.012, 0.009, 0.26, 0], [0.009, 0.006, 0.24, 0.4],
    ], { restZ: -lado * 0.26, restX: -0.78, lado, largo: 0.85 });
    antena.position.set(lado * 0.055, 0.14, 0.085);
    cabeza.add(antena);
    partes.orejas.push(antena);
  }

  void mBlanco; void mNegro;
  return { bocaBase: new THREE.Vector3(0, -0.088, 0.15) };
}

function construirAvispita(THREE, ctx) {
  const { THREEmat, pal, pecho, cabeza, partes, mBlanco } = ctx;
  const mCuerpo = THREEmat(pal.cuerpo, 0.30, 0.12);   // quitina negra: brilla
  const mOscuro = THREEmat(pal.detalle, 0.34, 0.1);
  const mAmbar = THREEmat(0xa8702f, 0.55);
  const mCara = THREEmat(pal.cuerpo2, 0.34, 0.1);

  // cintura de avispa: pecíolo angosto entre tórax y gáster. Sin esa cintura
  // no es una avispa, es un escarabajo negro.
  const peciolo = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.055, 0.1, 6), mOscuro);
  peciolo.rotation.x = 0.9;
  peciolo.position.set(0, 0.13, -0.08);
  pecho.add(peciolo);

  // gáster oval y aplanado, echado atrás
  const gaster = new THREE.Mesh(new THREE.SphereGeometry(0.135, 9, 7), mCuerpo);
  gaster.scale.set(0.92, 1.15, 0.8);
  gaster.rotation.x = 1.0;
  gaster.position.set(0, 0.05, -0.19);
  pecho.add(gaster);

  // alas cortas y ahumadas, PLEGADAS PLANAS sobre el dorso (los bethylidos no
  // las llevan en tejadillo). Desde el frente casi no se ven: es correcto.
  const tex = texturasAlas(THREE);
  const mAla = matAla(THREE, tex && tex.avispita, 0xb9b0a6);
  const alas = new THREE.Group();
  alas.position.set(0, 0.44, -0.11);
  for (const lado of [-1, 1]) {
    alas.add(crearAla(THREE, mAla, 0.42, 0.16, lado, [0.05, 0, 0],
      [0.3, 0.05, -0.95], 0.12, { amp: 0.16 }));
  }
  pecho.add(alas);
  partes.extras.alas = alas;

  // ── cabeza grande y aplanada ─────────────────────────────────────────────
  // el cráneo ya viene escalado ancho por RASGOS; aquí van las genas que le
  // cuadran las esquinas y el collar occipital que la separa del tórax.
  // La cabeza desproporcionada es LO que hay que ver: es lo que la distingue
  // de cualquier otra avispita y lo que le deja roer el grano por dentro.
  for (const lado of [-1, 1]) {
    const gena = new THREE.Mesh(new THREE.SphereGeometry(0.082, 6, 5), mCuerpo);
    gena.scale.set(0.8, 1.05, 0.6);
    gena.position.set(lado * 0.215, -0.025, 0.0);
    cabeza.add(gena);
    // vértice: las esquinas de arriba, que le dan el corte cuadrado
    const vertice = new THREE.Mesh(new THREE.SphereGeometry(0.062, 6, 5), mCuerpo);
    vertice.scale.set(0.85, 0.7, 0.6);
    vertice.position.set(lado * 0.185, 0.105, -0.01);
    cabeza.add(vertice);
  }
  const collar = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 5), mCara);
  collar.scale.set(1.1, 0.5, 0.9);
  collar.position.set(0, -0.15, -0.03);
  cabeza.add(collar);

  // clípeo + MANDÍBULAS: con estas abre el grano de café. Son su herramienta,
  // tienen que verse.
  // el clípeo va OSCURO: con el gris de la ceja leía como hocico, y un
  // insecto con hocico deja de ser insecto
  const clipeo = new THREE.Mesh(new THREE.SphereGeometry(0.062, 7, 5), mCara);
  clipeo.scale.set(1.3, 0.7, 0.7);
  clipeo.position.set(0, -0.075, 0.11);
  cabeza.add(clipeo);
  for (const lado of [-1, 1]) {
    const mandibula = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.085, 5), mAmbar);
    mandibula.position.set(lado * 0.045, -0.135, 0.115);
    mandibula.rotation.set(0.95, 0, lado * 0.62);
    cabeza.add(mandibula);
  }

  // antenas GENICULADAS: escapo largo, acodo, funículo corto con maza.
  // El codo es diagnóstico de avispa; una antena recta la volvería escarabajo.
  for (const lado of [-1, 1]) {
    const antena = crearAntena(THREE, mAmbar, { r: 0.026, material: mAmbar }, [
      [0.018, 0.015, 0.19, 0], [0.016, 0.013, 0.13, 1.15],
    ], { restZ: -lado * 0.5, restX: -0.5, lado, largo: 0.6 });
    antena.position.set(lado * 0.075, 0.1, 0.075);
    cabeza.add(antena);
    partes.orejas.push(antena);
  }

  void mBlanco;
  return { bocaBase: new THREE.Vector3(0, -0.105, 0.125) };
}

function construirMariquita(THREE, ctx) {
  const { THREEmat, pal, pecho, cabeza, partes } = ctx;
  const mNaranja = THREEmat(pal.cuerpo, 0.42);
  const mNaranja2 = THREEmat(pal.cuerpo2, 0.4);
  // élitro: quitina lustrada. Un negro mate lo mataría; el brillo es el bicho.
  const mElitro = THREEmat(0x131318, 0.16, 0.22);
  const mVientre = THREEmat(0x241f1c, 0.6);

  // ── pronoto: el escudo naranja sobre los hombros ─────────────────────────
  // En Cryptolaemus la cabeza y el pronoto son naranjas y los élitros negros.
  // NO es la mariquita roja de siete puntos: si sale roja, está mal.
  const pronoto = new THREE.Mesh(new THREE.SphereGeometry(0.205, 10, 6), mNaranja);
  pronoto.scale.set(1.12, 0.62, 0.98);
  pronoto.position.set(0, 0.47, 0.0);
  pecho.add(pronoto);
  const borde = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.016, 5, 12), mNaranja2);
  borde.rotation.x = Math.PI / 2;
  borde.scale.set(1.12, 0.98, 1);
  borde.position.set(0, 0.42, 0);
  pecho.add(borde);

  // ── élitros: dos medias cúpulas con el ápice naranja ─────────────────────
  // La sutura corre por la mitad del dorso; cada mitad abre sobre ese eje.
  // El arco pasa de largo el flanco y asoma por delante: si el élitro se
  // queda atrás, de frente el bicho lee NARANJA ENTERO y deja de ser
  // Cryptolaemus. El contraste naranja/negro es la especie.
  const elitros = new THREE.Group();
  // la cúpula va ALTA y corta: con el domo largo el ápice leonado caía por
  // debajo de la cadera y no lo veía nadie, y el ápice es media especie
  elitros.position.set(0, 0.33, -0.05);
  const arco = Math.PI * 0.86;
  for (const lado of [-1, 1]) {
    const pivote = new THREE.Group();
    pivote.scale.set(1.08, 1.15, 1.0);
    // el arco arranca en la sutura dorsal y da la vuelta por el flanco
    const phi0 = lado > 0 ? Math.PI * 1.5 - arco : Math.PI * 1.5;
    const negro = new THREE.Mesh(
      new THREE.SphereGeometry(0.235, 9, 5, phi0, arco, 0, Math.PI * 0.62), mElitro);
    pivote.add(negro);
    // ápice leonado: en Cryptolaemus la punta del élitro vuelve al naranja
    const apice = new THREE.Mesh(
      new THREE.SphereGeometry(0.235, 9, 3, phi0, arco, Math.PI * 0.62, Math.PI * 0.38), mNaranja);
    pivote.add(apice);
    pivote.userData = { lado };
    elitros.add(pivote);
  }
  pecho.add(elitros);
  partes.extras.elitros = elitros;

  // alas membranosas plegadas DEBAJO: solo salen cuando el élitro se abre
  const tex = texturasAlas(THREE);
  const mAla = matAla(THREE, tex && tex.mariquita, 0x9aa0ac);
  const alas = new THREE.Group();
  alas.position.set(0, 0.36, -0.08);
  for (const lado of [-1, 1]) {
    alas.add(crearAla(THREE, mAla, 0.56, 0.21, lado, [0.1, 0, 0],
      [0.66, 0.16, -0.74], 0.35, { amp: 0.5, oculta: true }));
  }
  pecho.add(alas);
  partes.extras.alas = alas;

  // el esternito, apenas asomando bajo el borde del élitro
  const vientre = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 5), mVientre);
  vientre.scale.set(0.85, 0.55, 0.5);
  vientre.position.set(0, 0.1, 0.11);
  pecho.add(vientre);

  // ── cabeza chica bajo el escudo ──────────────────────────────────────────
  const clipeo = new THREE.Mesh(new THREE.SphereGeometry(0.075, 7, 5), mNaranja2);
  clipeo.scale.set(1.15, 0.72, 0.72);
  clipeo.position.set(0, -0.075, 0.115);
  cabeza.add(clipeo);
  for (const lado of [-1, 1]) {
    const palpo = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.05, 5), THREEmat(pal.detalle, 0.7));
    palpo.position.set(lado * 0.04, -0.13, 0.115);
    palpo.rotation.set(0.55, 0, lado * 0.25);
    cabeza.add(palpo);
  }

  // antenas CORTAS y con maza: en los coccinélidos son cachitos, no látigos
  for (const lado of [-1, 1]) {
    const antena = crearAntena(THREE, THREEmat(pal.detalle, 0.6), { r: 0.028, material: mNaranja2 }, [
      [0.017, 0.015, 0.1, 0],
    ], { restZ: -lado * 0.58, restX: -0.28, lado, largo: 0.26 });
    antena.position.set(lado * 0.085, 0.115, 0.075);
    cabeza.add(antena);
    partes.orejas.push(antena);
  }

  return { bocaBase: new THREE.Vector3(0, -0.1, 0.13) };
}

// ── El Momificador · Aphidius colemani ─────────────────────────────────────
// Grafo (BeneficialOrganism, fuente ICA): «Parasita áfidos (Myzus, Aphis),
// forma momias». La avispa mide 2 mm y de lejos es un puntito negro: LO QUE SE
// VE de este bicho en el campo es la momia — el pulgón hinchado, endurecido y
// DORADO pegado a la hoja, con un agujero redondo por donde salió la avispa.
// Por eso la momia va modelada y va grande: sin ella, este piloto es
// indistinguible de la avispita de la broca que ya está en el elenco.

function construirMomia(THREE, mat, pal) {
  const grupo = new THREE.Group();
  // El dorado de la momia NO es metal: es quitina reseca. Un dorado de joyería
  // fue justo el primer error — brillaba como huevo de Pascua y dejaba de leer
  // como bicho muerto. Va mate, con la piel arrugada en textura.
  const piel = texturaMomia(THREE);
  const mMomia = new THREE.MeshStandardMaterial({
    map: piel || null, color: piel ? 0xffffff : pal.cuerpo2,
    roughness: 0.66, metalness: 0.05,
  });
  const mMomia2 = mat(0xb8862c, 0.66, 0.04);
  const mHueco = mat(0x27180a, 0.9);

  // cuerpo: el áfido HINCHADO. Un pulgón sano es alargado; el parasitado se
  // pone globoso — esa hinchazón es la mitad del diagnóstico.
  const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), mMomia);
  cuerpo.scale.set(1.32, 1.02, 1.18);
  grupo.add(cuerpo);

  // CORNÍCULOS: el par de tubitos del dorso trasero. Son la firma de que esto
  // fue un áfido y no una semilla dorada pegada a la espalda — así que van
  // ARRIBA, asomando por encima de la curva del cuerpo. Escondidos atrás no
  // servían de nada: desde la cámara no se veían y la momia quedaba muda.
  for (const lado of [-1, 1]) {
    const corniculo = new THREE.Mesh(
      new THREE.CylinderGeometry(0.021, 0.032, 0.17, 5, 1, true), mMomia2);
    corniculo.position.set(lado * 0.145, 0.20, -0.13);
    corniculo.rotation.set(-0.35, 0, lado * 0.34);
    grupo.add(corniculo);
  }
  // cauda: la colita entre los cornículos
  const cauda = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 5), mMomia2);
  cauda.position.set(0, 0.08, -0.25);
  cauda.rotation.x = -2.35;
  grupo.add(cauda);

  // patas resecas, pegadas al cuerpo: la momia queda soldada a la hoja
  for (const lado of [-1, 1]) {
    for (const [z, ang] of [[0.14, 0.5], [-0.01, 0.1], [-0.16, -0.35]]) {
      // finas: en cono grueso leían como aletas planas colgando del costado
      const pata = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.115, 4), mMomia2);
      pata.position.set(lado * 0.30, -0.115, z);
      pata.rotation.set(ang, 0, lado * 2.3);
      grupo.add(pata);
    }
  }

  // ── el agujero de salida, con su tapa ────────────────────────────────────
  // La avispa adulta no revienta la momia: le RECORTA una tapa circular y la
  // levanta como una alcantarilla. Ese agujero limpio y redondo es el detalle
  // que hace que la momia se lea como momia y no como fruto.
  // Va en el flanco -X (la derecha del piloto), que es el costado que mira la
  // cámara del gate en 34 y en lateral.
  const hueco = new THREE.Mesh(new THREE.CircleGeometry(0.105, 10), mHueco);
  hueco.position.set(-0.30, 0.02, 0.02);
  hueco.rotation.y = -Math.PI / 2;
  grupo.add(hueco);
  const labio = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.016, 4, 10), mMomia2);
  labio.position.set(-0.30, 0.02, 0.02);
  labio.rotation.y = Math.PI / 2;
  grupo.add(labio);

  // La tapa cuelga de una bisagra vertical y se abre con el turbo. Se engancha
  // en partes.extras.elitros, que es el canal que aplicarPose ya abre con el
  // despliegue: cero código nuevo de pose para un gesto que sí es del bicho.
  //
  // Va ENTREABIERTA en reposo, y eso no es capricho: con la tapa cerrada el
  // agujero desaparecía y la momia volvía a leer como barril con tapa. El
  // agujero es la prueba de que de ahí SALIÓ una avispa — es la historia
  // entera del personaje, y tiene que verse siempre, no solo con turbo.
  // El reposo va en un grupo intermedio porque aplicarPose escribe
  // rotation.y del hijo directo: puesto ahí, lo borraría en cada cuadro.
  const bisagra = new THREE.Group();
  bisagra.position.set(-0.30, 0.02, -0.09);
  const reposo = new THREE.Group();
  reposo.rotation.y = -1.15;   // bien abierta: a 0.62 la tapa aún cubría el hueco
  const tapa = new THREE.Mesh(new THREE.CircleGeometry(0.108, 10), mMomia);
  tapa.position.set(-0.006, 0, 0.11);
  tapa.rotation.y = -Math.PI / 2;
  reposo.add(tapa);
  bisagra.add(reposo);
  bisagra.userData = { lado: 1 };
  const tapas = new THREE.Group();
  tapas.add(bisagra);
  grupo.add(tapas);

  return { grupo, tapas };
}

function construirMomificador(THREE, ctx) {
  const { THREEmat, pal, pecho, cabeza, partes, mBlanco } = ctx;
  const mAmbar = THREEmat(pal.cuerpo, 0.44, 0.06);
  const mOscuro = THREEmat(pal.cabeza, 0.32, 0.14);
  const mMedio = THREEmat(0x6a4a24, 0.42, 0.08);

  // ── mesosoma y pecíolo ───────────────────────────────────────────────────
  // El pecíolo del bracónido es LARGO y visible: el gáster va colgado atrás,
  // no pegado al tórax. Es lo que le da la cintura de avispa de manual.
  const peciolo = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.042, 0.17, 6, 1, true), mAmbar);
  peciolo.rotation.x = 1.05;
  peciolo.position.set(0, 0.16, -0.11);
  pecho.add(peciolo);

  // gáster ALARGADO y en punta, muy distinto del gáster oval del betílido
  const gaster = new THREE.Mesh(new THREE.SphereGeometry(0.125, 9, 7), mOscuro);
  gaster.scale.set(0.78, 1.55, 0.72);
  gaster.rotation.x = 1.15;
  gaster.position.set(0, 0.04, -0.27);
  pecho.add(gaster);
  // ovipositor: la aguja con la que pone el huevo DENTRO del pulgón. Es la
  // herramienta del oficio; si no se ve, el parasitoide no se lee.
  const ovipositor = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.13, 5), mMedio);
  ovipositor.position.set(0, -0.06, -0.40);
  ovipositor.rotation.x = -2.0;
  pecho.add(ovipositor);

  // ── alas hialinas con pterostigma ────────────────────────────────────────
  const tex = texturasAlas(THREE);
  const mAla = matAla(THREE, tex && tex.momificador, 0xdfe2e6);
  const alas = new THREE.Group();
  alas.position.set(0, 0.46, -0.10);
  for (const lado of [-1, 1]) {
    alas.add(crearAla(THREE, mAla, 0.62, 0.24, lado, [0.06, 0.02, 0],
      [0.52, 0.10, -0.85], 0.18, { amp: 0.2 }));
    alas.add(crearAla(THREE, mAla, 0.36, 0.15, lado, [0.05, -0.04, -0.02],
      [0.46, -0.04, -0.89], 0.1, { amp: 0.16 }));
  }
  pecho.add(alas);
  partes.extras.alas = alas;

  // ── LA MOMIA a la espalda ────────────────────────────────────────────────
  // Va alta y ANCHA a propósito: tiene que asomar por los dos costados del
  // torso para que también se vea de frente, que es como se mira al piloto en
  // carrera. Una momia escondida detrás del respaldo no sirve de nada.
  const { grupo: momia, tapas } = construirMomia(THREE, (c, r, m) => THREEmat(c, r, m), pal);
  momia.position.set(0, 0.44, -0.30);
  momia.rotation.set(-0.16, 0, 0.05);
  momia.scale.setScalar(0.95);
  pecho.add(momia);
  partes.extras.momia = momia;
  partes.extras.elitros = tapas;   // la tapa se levanta con el turbo

  // ── cabeza ───────────────────────────────────────────────────────────────
  const clipeo = new THREE.Mesh(new THREE.SphereGeometry(0.058, 7, 5), mOscuro);
  clipeo.scale.set(1.25, 0.72, 0.72);
  clipeo.position.set(0, -0.078, 0.115);
  cabeza.add(clipeo);
  for (const lado of [-1, 1]) {
    const palpo = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.055, 4), mMedio);
    palpo.position.set(lado * 0.032, -0.128, 0.108);
    palpo.rotation.set(0.75, 0, lado * 0.2);
    cabeza.add(palpo);
  }

  // ── antenas FILIFORMES y LARGUÍSIMAS ─────────────────────────────────────
  // Aquí está la otra mitad de la identidad. Aphidius lleva antenas más largas
  // que el cuerpo, rectas, sin maza y sin codo — exactamente lo contrario de
  // la avispita de la broca, que las tiene cortas, acodadas y con maza. Puestas
  // lado a lado, las antenas son lo que dice cuál es cuál.
  for (const lado of [-1, 1]) {
    const antena = crearAntena(THREE, mAmbar, null, [
      [0.013, 0.011, 0.24, 0], [0.011, 0.008, 0.22, 0.22], [0.008, 0.005, 0.19, 0.3],
    ], { restZ: -lado * 0.30, restX: -0.72, lado, largo: 0.95 });
    antena.position.set(lado * 0.062, 0.13, 0.08);
    cabeza.add(antena);
    partes.orejas.push(antena);
  }

  void mBlanco;
  return { bocaBase: new THREE.Vector3(0, -0.105, 0.128) };
}

// ── El Murciélago · Glossophaga soricina ───────────────────────────────────
// Grafo (Animal): POLINIZA marañón, zapote, plátano y pitahaya. El nodo NO
// trae modo_accion — lo que hay son esas cuatro aristas, y de ahí sale todo.
// Es un NECTARÍVORO, y un nectarívoro tiene una cara concreta: rostro largo
// para entrar en la corola, hoja nasal chica, orejas chicas y separadas, y una
// lengua que mide un tercio del animal. Nada de orejas gigantes ni colmillos:
// esos son de otro murciélago, y ese otro murciélago no poliniza nada.

function construirMurcielago(THREE, ctx) {
  const { THREEmat, pal, pecho, cabeza, partes, mBlanco } = ctx;
  const mPelo = THREEmat(pal.cuerpo, 0.92);
  const mVientre = THREEmat(pal.cuerpo2, 0.9);
  const mPiel = THREEmat(0x4a3324, 0.78);
  const mLengua = THREEmat(0xc8646a, 0.62);

  // ── torso: pelaje ────────────────────────────────────────────────────────
  const golilla = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 5), mPelo);
  golilla.scale.set(1.06, 0.6, 1.0);
  golilla.position.set(0, 0.5, 0.0);
  pecho.add(golilla);
  const vientre = new THREE.Mesh(new THREE.SphereGeometry(0.15, 7, 5), mVientre);
  vientre.scale.set(0.95, 1.2, 0.62);
  vientre.position.set(0, 0.26, 0.13);
  pecho.add(vientre);

  // ── alas: dos, membranosas, con los huesos de los dedos en la textura ────
  // Son las MANOS del animal: por eso nacen del hombro y no de la espalda como
  // en un insecto. Van semiplegadas hacia atrás, que es como las lleva un
  // murciélago posado, y siguen costando 2 triángulos cada una.
  const tex = texturasAlasEspeciales(THREE);
  const mAla = tex && tex.murcielago
    ? new THREE.MeshStandardMaterial({
      map: tex.murcielago, transparent: true, side: THREE.DoubleSide,
      roughness: 0.72, metalness: 0.02, depthWrite: false, alphaTest: 0.02,
    })
    : new THREE.MeshStandardMaterial({
      color: 0x5c4030, transparent: true, opacity: 0.72, side: THREE.DoubleSide,
      roughness: 0.72, metalness: 0.02, depthWrite: false,
    });
  const alas = new THREE.Group();
  alas.position.set(0, 0.46, -0.04);
  for (const lado of [-1, 1]) {
    alas.add(crearAla(THREE, mAla, 1.0, 0.46, lado, [0.16, 0.03, -0.02],
      [0.72, 0.44, -0.53], 0.56, { amp: 0.34 }));
  }
  pecho.add(alas);
  partes.extras.alas = alas;

  // ── el rostro largo ──────────────────────────────────────────────────────
  // El cráneo ya viene estirado en Z desde RASGOS; aquí va el rostro propiamente
  // dicho, que sale bastante más allá de los ojos.
  // Va MÁS largo de lo que pide el instinto: a media longitud el animal leía
  // como oso de peluche. El rostro tiene que salirse claramente de la cabeza —
  // es un embudo para entrar en la corola, no una cara de mamífero cualquiera.
  const rostro = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.22, 3, 7), mPelo);
  rostro.rotation.x = Math.PI / 2;
  rostro.scale.set(1.0, 1.0, 0.86);
  rostro.position.set(0, -0.045, 0.235);
  cabeza.add(rostro);
  const trufa = new THREE.Mesh(new THREE.SphereGeometry(0.043, 7, 5), mPiel);
  trufa.scale.set(1.1, 0.85, 0.8);
  trufa.position.set(0, -0.028, 0.355);
  cabeza.add(trufa);

  // HOJA NASAL: la lanceta erguida sobre la nariz. En Glossophaga es CHICA y
  // simple — es la marca de la familia (Phyllostomidae) sin caer en la lanza
  // enorme de los murciélagos de terror.
  // chica y bien erguida: más grande tapaba el hocico de frente y la cara
  // quedaba con antifaz en vez de con rostro
  const hoja = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.068, 5), mPiel);
  hoja.scale.set(1.0, 1.0, 0.32);
  hoja.position.set(0, 0.034, 0.345);
  hoja.rotation.x = -0.1;
  cabeza.add(hoja);

  // verrugas del mentón: la V de papilas bajo el labio inferior, otro carácter
  // de filostómido. Son chiquitas pero son las que le dan cara de bicho real.
  for (const lado of [-1, 1]) {
    for (const [dy, dz, r] of [[-0.088, 0.335, 0.014], [-0.104, 0.30, 0.012]]) {
      const verruga = new THREE.Mesh(new THREE.SphereGeometry(r, 4, 3), mPiel);
      verruga.position.set(lado * 0.028, dy, dz);
      cabeza.add(verruga);
    }
  }

  // ── LA LENGUA ────────────────────────────────────────────────────────────
  // Lo que hace polinizador a este animal. Mide como un tercio del cuerpo, se
  // mete en la corola sin que el bicho se pose, y la punta va erizada de
  // papilas que recogen el néctar por capilaridad. Va SIEMPRE afuera: un
  // Glossophaga con la lengua guardada es un ratón con alas.
  const lengua = new THREE.Group();
  lengua.position.set(0, -0.075, 0.335);
  let padre = lengua;
  // La curva va hacia ABAJO y bien marcada: derecha hacia adelante, la lengua
  // aterrizaba encima del volante y se leía como un tercer brazo. Colgando cae
  // libre delante del pecho y se lee por lo que es.
  const tramos = [[0.028, 0.024, 0.13, 0.34], [0.024, 0.019, 0.12, 0.30],
    [0.019, 0.013, 0.11, 0.26], [0.013, 0.009, 0.10, 0.20]];
  for (const [r0, r1, largo, ang] of tramos) {
    const seg = new THREE.Group();
    seg.rotation.x = ang;
    const tramo = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, largo, 5, 1, true), mLengua);
    tramo.position.z = largo * 0.5;
    tramo.rotation.x = Math.PI / 2;
    seg.add(tramo);
    padre.add(seg);
    padre = new THREE.Group();
    padre.position.z = largo;
    seg.add(padre);
  }
  // punta con papilas: un remate erizado, no una bolita lisa
  const punta = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.055, 5), mLengua);
  punta.rotation.x = Math.PI / 2;
  punta.position.z = 0.024;
  padre.add(punta);
  for (let k = 0; k < 5; k++) {
    const papila = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.028, 3), mLengua);
    const a = (k / 5) * Math.PI * 2;
    papila.position.set(Math.cos(a) * 0.016, Math.sin(a) * 0.016, 0.038);
    papila.rotation.set(Math.PI / 2 - 0.5, 0, a);
    padre.add(papila);
  }
  cabeza.add(lengua);
  partes.extras.lengua = lengua;   // el turbo la estira todavía más

  // ── orejas CHICAS, redondeadas y SEPARADAS ───────────────────────────────
  // Aquí se gana o se pierde el personaje. Las orejas gigantes puntiagudas son
  // de murciélago de historieta; Glossophaga las tiene cortas, redondas y bien
  // separadas una de otra, y con trago (la lengüeta de adentro).
  for (const lado of [-1, 1]) {
    const oreja = new THREE.Group();
    oreja.position.set(lado * 0.135, 0.135, -0.03);
    const pabellon = new THREE.Mesh(new THREE.SphereGeometry(0.062, 6, 4), mPelo);
    pabellon.scale.set(0.86, 1.05, 0.4);
    pabellon.position.y = 0.04;
    oreja.add(pabellon);
    const dentro = new THREE.Mesh(new THREE.SphereGeometry(0.044, 5, 3), mPiel);
    dentro.scale.set(0.82, 0.98, 0.3);
    dentro.position.set(0, 0.038, 0.022);
    oreja.add(dentro);
    const trago = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.045, 4), mPiel);
    trago.position.set(0, -0.005, 0.02);
    trago.rotation.x = -0.3;
    oreja.add(trago);
    oreja.userData = { restZ: lado * 0.42, restX: 0.06, lado, largo: 0.34 };
    oreja.rotation.z = oreja.userData.restZ;
    cabeza.add(oreja);
    partes.orejas.push(oreja);
  }

  // pulgar con garra: en el murciélago la mano es el ala, y el pulgar queda
  // libre y con uña. Es el gancho con el que trepa la flor.
  for (const lado of [-1, 1]) {
    const garra = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.06, 4), mPiel);
    garra.position.set(lado * 0.2, 0.55, 0.02);
    garra.rotation.set(-0.5, 0, lado * 0.4);
    pecho.add(garra);
  }

  void mBlanco;
  return { bocaBase: new THREE.Vector3(0, -0.075, 0.255) };
}

// ── La Morpho · Morpho menelaus ────────────────────────────────────────────
// Grafo (Animal): POLINIZA Annona muricata. El nodo tampoco trae modo_accion.
// El trabajo de arte aquí no es el dibujo del ala: es el AZUL. El azul de
// Morpho no existe como pigmento — si se muele el ala, el polvo sale café. El
// color lo produce la estructura de la escama, una multicapa que interfiere la
// luz, y por eso cambia con el ángulo y destella. Un azul plano de paleta sería
// científicamente falso Y visualmente muerto, las dos cosas a la vez.

function construirMorpho(THREE, ctx) {
  const { THREEmat, pal, pecho, cabeza, partes } = ctx;
  const mPelo = THREEmat(0x2c2833, 0.95);
  const mAbdomen = THREEmat(0x4a4351, 0.88);
  const mPatas = THREEmat(pal.cuerpo, 0.8);

  // ── tórax peludo con capa azul ───────────────────────────────────────────
  // El tórax de Morpho lleva escamas azules encima del pelo. Va con el MISMO
  // material iridiscente del ala: así, cuando el ala destella, el lomo destella
  // con ella y el bicho se lee entero, no como un cuerpo gris con alas prestadas.
  const torax = new THREE.Mesh(new THREE.SphereGeometry(0.185, 9, 6), mPelo);
  torax.scale.set(1.0, 0.78, 1.05);
  torax.position.set(0, 0.46, 0.0);
  pecho.add(torax);
  const capa = new THREE.Mesh(
    new THREE.SphereGeometry(0.192, 9, 5, 0, Math.PI * 2, 0, Math.PI * 0.55),
    materialIridiscente(THREE, null, AZUL_MORPHO.torax));
  capa.scale.set(1.0, 0.82, 1.05);
  capa.position.set(0, 0.46, 0.0);
  pecho.add(capa);

  // abdomen delgado y corto, metido bajo las alas
  const abdomen = new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.2, 3, 7), mAbdomen);
  abdomen.rotation.x = 1.25;
  abdomen.position.set(0, 0.14, -0.17);
  pecho.add(abdomen);

  // ── las cuatro alas ──────────────────────────────────────────────────────
  // Grandes: en Morpho el ala domina al cuerpo, y esa desproporción es la
  // silueta. Van semiabiertas en V, no plegadas: plegadas solo se vería el
  // envés café y el azul no existiría; abiertas del todo taparían al piloto.
  // La amplitud de barrido va ALTA a propósito — el barrido es lo que hace que
  // el horizonte del cielo cruce el ala y dispare el destello.
  const tex = texturasAlasEspeciales(THREE);
  const mDelDorso = materialIridiscente(THREE, tex && tex.morphoDelanteraDorso,
    null, tex && tex.morphoDelanteraProps);
  const mTraDorso = materialIridiscente(THREE, tex && tex.morphoTraseraDorso,
    null, tex && tex.morphoTraseraProps);
  const enves = (mapa) => new THREE.MeshStandardMaterial({
    map: mapa || null,
    color: mapa ? 0xffffff : AZUL_MORPHO.envés,
    side: THREE.FrontSide, roughness: 0.88, metalness: 0.0,
    alphaTest: mapa ? 0.5 : 0,
  });
  const mDelEnves = enves(tex && tex.morphoDelanteraEnves);
  const mTraEnves = enves(tex && tex.morphoTraseraEnves);

  const alas = new THREE.Group();
  alas.position.set(0, 0.47, -0.05);
  // proporción: el ala de Morpho es ANCHA. A 1.02×0.60 leía libélula — la
  // relación largo/ancho manda más que el dibujo, igual que le pasó al jaguar
  // con el tamaño de la roseta.
  for (const lado of [-1, 1]) {
    alas.add(crearAlaMariposa(THREE, mDelDorso, mDelEnves, 0.96, 0.76, lado,
      [0.07, 0.08, 0.0], [0.62, 0.66, -0.42], 0.30, { amp: 0.46 }));
    alas.add(crearAlaMariposa(THREE, mTraDorso, mTraEnves, 0.64, 0.62, lado,
      [0.06, -0.06, -0.05], [0.66, 0.20, -0.72], 0.20, { amp: 0.38 }));
  }
  pecho.add(alas);
  partes.extras.alas = alas;

  // ── cabeza ───────────────────────────────────────────────────────────────
  // Los ojos compuestos enormes ya salen de RASGOS. Aquí va el pelo de la frente
  // y las dos piezas que dicen «mariposa» y no «polilla»: la espiritrompa
  // enrollada y las antenas con maza.
  const frente = new THREE.Mesh(new THREE.SphereGeometry(0.09, 7, 5), mPelo);
  frente.scale.set(1.15, 0.7, 0.85);
  frente.position.set(0, 0.075, 0.03);
  cabeza.add(frente);

  // ESPIRITROMPA: la trompa enrollada en espiral bajo la cara. Un toro visto de
  // canto lee como espiral a un costo ridículo; y sin ella la cara podría ser
  // la de cualquier bicho.
  const trompa = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.0105, 4, 12), mAbdomen);
  trompa.rotation.y = Math.PI / 2;
  trompa.position.set(0, -0.115, 0.105);
  cabeza.add(trompa);
  const arranque = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.012, 0.07, 5, 1, true), mAbdomen);
  arranque.rotation.x = 0.5;
  arranque.position.set(0, -0.062, 0.10);
  cabeza.add(arranque);

  // palpos labiales: los dos cepillitos peludos que flanquean la trompa
  for (const lado of [-1, 1]) {
    const palpo = new THREE.Mesh(new THREE.SphereGeometry(0.032, 5, 4), mPelo);
    palpo.scale.set(0.7, 1.5, 0.9);
    palpo.position.set(lado * 0.042, -0.085, 0.125);
    palpo.rotation.z = -lado * 0.25;
    cabeza.add(palpo);
  }

  // ── antenas CON MAZA ─────────────────────────────────────────────────────
  // Es LA diferencia entre mariposa y polilla, y se decide en dos milímetros de
  // punta: maza = mariposa, pluma o filamento = polilla.
  for (const lado of [-1, 1]) {
    const antena = crearAntena(THREE, mAbdomen, { r: 0.019, material: mAbdomen }, [
      [0.009, 0.008, 0.20, 0], [0.008, 0.010, 0.16, 0.24],
    ], { restZ: -lado * 0.44, restX: -0.60, lado, largo: 0.7 });
    antena.position.set(lado * 0.058, 0.13, 0.055);
    cabeza.add(antena);
    partes.orejas.push(antena);
  }

  void mPatas;
  return { bocaBase: new THREE.Vector3(0, -0.15, 0.115) };
}

// ── La Beauveria · Beauveria bassiana ───────────────────────────────────────
// Grafo (BeneficialOrganism, fuente Cenicafé, confianza alta): «Hongo que
// parasita y mata insectos (broca, picudos, chupadores)». La primera arista
// CONTROLS es Hypothenemus hampei — LA BROCA DEL CAFÉ — y de ahí sale toda la
// identidad: el personaje es el hongo, y su marca es la broca colonizada que
// carga a la espalda, cubriéndose de blanco. Sin ese cadáver el hongo es solo
// humo blanco; con él, es el fenómeno que un cafetero SÍ ha visto en su lote
// (el bicho momificado con el fieltro brotándole entre las placas) — solo que
// no sabía que era su aliado.
//
// Tres decisiones de dibujo, y por qué:
//   1. El fieltro NUNCA es púas contables. El micelio de B. bassiana es un
//      FIELTRO — algodón apretado, no un erizo. Va en textura de lienzo
//      (manchones + hifas finísimas) sobre cojines lisos, y el borde
//      deshilachado lo ponen dos cáscaras con alfa (técnica de pelo por
//      capas), no conos uno a uno. Misma regla que hunde al follaje contable.
//   2. La paleta es LA DE ANGELITA BROS: blanco #f2fbe9 con respiro verdillo.
//      El hongo ya existe en el plataformero (bonetes blancos, esporas
//      verdosas orbitando); el del kart tiene que ser el mismo ser. La corona
//      de cojines de la cabeza es el eco 3D de esos tres bonetes dibujados.
//   3. La nube de esporas es MASA + vida: velos cruzados con textura de vaho
//      ponen el cuerpo de la nube, y unas motas en THREE.Points ponen la
//      deriva. Motas solas serían bolitas contables; velos solos serían humo
//      muerto. La nube respira sola y crece con el turbo — gradual, como la
//      infección real que justifica el poder.

// fieltro del micelio: base blanco-verdosa + manchones de densidad + hifas
// cortas en toda dirección. A distancia es grano; de cerca es pelusa.
function pintarFieltro(px, py) {
  const { c, ctx } = lienzo(px, py);
  const g = ctx.createLinearGradient(0, 0, 0, py);
  g.addColorStop(0, '#f7fdf1');
  g.addColorStop(0.55, '#f2fbe9');
  g.addColorStop(1, '#e4efd6');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, px, py);
  const rnd = rng(0xbea0);
  // manchones: donde el fieltro engorda (más blanco) y donde esporula (verdillo)
  for (let k = 0; k < 34; k++) {
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,250,0.24)' : 'rgba(188,206,158,0.26)';
    ctx.beginPath();
    ctx.ellipse(rnd() * px, rnd() * py, px * (0.05 + rnd() * 0.09),
      py * (0.04 + rnd() * 0.08), rnd() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // sombra de grieta: donde los cojines del micelio se tocan, el fieltro se
  // hunde. Sin estas venas el cojín leía globo de crema (medido en el gate).
  for (let k = 0; k < 12; k++) {
    const x = rnd() * px;
    const y = rnd() * py;
    ctx.strokeStyle = 'rgba(150,164,128,0.22)';
    ctx.lineWidth = 2 + rnd() * 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + (rnd() - 0.5) * px * 0.3, y + (rnd() - 0.5) * py * 0.3,
      x + (rnd() - 0.5) * px * 0.5, y + (rnd() - 0.5) * py * 0.5);
    ctx.stroke();
  }
  // la hifa: trazos de 2-7 px. Setecientos, para que ninguno se cuente.
  for (let k = 0; k < 700; k++) {
    const x = rnd() * px;
    const y = rnd() * py;
    const a = rnd() * Math.PI * 2;
    const L = 2 + rnd() * 5;
    ctx.strokeStyle = rnd() > 0.35 ? 'rgba(255,255,252,0.3)' : 'rgba(176,194,146,0.22)';
    ctx.lineWidth = 0.8 + rnd() * 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L);
    ctx.stroke();
  }
  return c;
}

// borde deshilachado (ALFA): fondo transparente + puntadas sueltas. Vive en
// cáscaras apenas más grandes que el cojín — rompe la silueta de globo liso
// sin dibujar una sola púa.
function pintarPelusa(px, py) {
  const { c, ctx } = lienzo(px, py);
  const rnd = rng(0xf02a);
  for (let k = 0; k < 1400; k++) {
    const x = rnd() * px;
    const y = rnd() * py;
    const a = rnd() * Math.PI * 2;
    const L = 1.5 + rnd() * 6;
    ctx.strokeStyle = `rgba(250,253,244,${(0.22 + rnd() * 0.45).toFixed(2)})`;
    ctx.lineWidth = 0.7 + rnd() * 1.0;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L);
    ctx.stroke();
  }
  return c;
}

// vaho de la nube: blobs radiales blanco/verdillo sobre fondo transparente.
// Tres velos de estos, cruzados, son el CUERPO de la nube.
function pintarVelo(px, py) {
  const { c, ctx } = lienzo(px, py);
  const rnd = rng(0x3e5a);
  // los blobs viven LEJOS del borde del lienzo (centro 0.3-0.7, radio ≤0.19):
  // un blob cortado por el borde pinta una RAYA RECTA flotando en el aire —
  // salió en la primera captura del gate y es la muerte del vaho.
  for (let k = 0; k < 24; k++) {
    const x = px * (0.3 + rnd() * 0.4);
    const y = py * (0.3 + rnd() * 0.4);
    const r = px * (0.08 + rnd() * 0.11);
    const tinte = rnd() > 0.6 ? '234,251,226' : '249,253,243';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${tinte},${(0.3 + rnd() * 0.22).toFixed(2)})`);
    g.addColorStop(1, `rgba(${tinte},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

// mota de espora para THREE.Points: un punto blando, sin borde duro
function pintarMota(px) {
  const { c, ctx } = lienzo(px, px);
  const g = ctx.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px / 2);
  g.addColorStop(0, 'rgba(248,253,240,0.95)');
  g.addColorStop(0.45, 'rgba(236,248,222,0.55)');
  g.addColorStop(1, 'rgba(226,255,214,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, px, px);
  return c;
}

let _texBeauveria = null;

function texturasBeauveria(THREE) {
  if (_texBeauveria !== null) return _texBeauveria;
  if (typeof document === 'undefined') { _texBeauveria = false; return _texBeauveria; }
  try {
    // 256 px: a 128 la hifa se licuaba en el primer plano del gate y el
    // fieltro volvía a ser crema lisa. La broca se mira DE CERCA.
    _texBeauveria = {
      fieltro: comoTextura(THREE, pintarFieltro(256, 256)),
      pelusa: comoTextura(THREE, pintarPelusa(256, 256)),
      velo: comoTextura(THREE, pintarVelo(256, 256)),
      mota: comoTextura(THREE, pintarMota(32)),
    };
  } catch {
    _texBeauveria = false;
  }
  return _texBeauveria;
}

function matFieltro(THREE, tex) {
  return new THREE.MeshStandardMaterial({
    map: tex && tex.fieltro ? tex.fieltro : null,
    color: tex && tex.fieltro ? 0xffffff : 0xf2fbe9,
    roughness: 0.98, metalness: 0.0,
  });
}

// ── LA BROCA COLONIZADA — la marca del personaje ───────────────────────────
// Hypothenemus hampei a MEDIO cubrir: la cabeza y las patas delanteras siguen
// siendo el escarabajito negro, pero el fieltro ya brotó por donde brota de
// verdad — las membranas intersegmentales: el collar entre pronoto y élitros,
// la sutura elitral y el vientre. Va a medio camino A PROPÓSITO: cubierta del
// todo sería una bola blanca (no se enseña nada) y limpia sería solo un bicho
// muerto. El «cubriéndose» es el fenómeno.
// Exportada aparte para que el gate la pueda encuadrar en primer plano.
export function construirBrocaColonizada(THREE, mat) {
  const grupo = new THREE.Group();
  grupo.name = 'brocaColonizada';
  const tex = texturasBeauveria(THREE);
  const mQuitina = mat(0x261d14, 0.5, 0.12);
  const mQuitina2 = mat(0x42311e, 0.55, 0.08);
  const mFieltro = matFieltro(THREE, tex);

  // élitros globosos: la broca es un barrilito, no un escarabajo plano.
  // Los segmentos van ALTOS (16×12): esta pieza se encuadra en primer plano
  // y a 11×8 las facetas se veían una a una (medido en el gate).
  const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.185, 16, 12), mQuitina);
  abdomen.scale.set(1.0, 0.9, 1.3);
  abdomen.position.set(0, 0.02, -0.1);
  grupo.add(abdomen);
  // sutura elitral: la línea que separa los élitros — y por donde revienta el
  // hongo. CORTA y hundida: larga asomaba la punta como barra recta entre los
  // cojines traseros (gate, pasada 3).
  const sutura = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.26, 5), mQuitina2);
  sutura.rotation.x = Math.PI / 2;
  sutura.position.set(0, 0.176, -0.02);
  grupo.add(sutura);
  // pronoto encapuchado: desde arriba a la broca no se le ve la cabeza
  const pronoto = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), mQuitina2);
  pronoto.scale.set(0.98, 0.82, 1.05);
  pronoto.position.set(0, 0.07, 0.125);
  grupo.add(pronoto);
  // la cabecita, metida abajo — TODAVÍA negra, todavía bicho
  const cabezaB = new THREE.Mesh(new THREE.SphereGeometry(0.062, 12, 9), mQuitina);
  cabezaB.position.set(0, -0.025, 0.225);
  grupo.add(cabezaB);
  // patas agarrotadas: el hongo la dejó prendida donde murió. Rígidas, en
  // garra, nada de pose viva. La base del cono va ENTERRADA en el flanco y la
  // punta sale abajo-afuera: rotation.z NEGATIVA respecto del lado — con el
  // signo al revés la pata cruzaba por debajo y asomaba por el flanco
  // contrario como astilla suelta (pagado dos veces en el gate).
  // el flanco del elipsoide a la altura de la pata queda en x≈0.134: la base
  // del cono va ADENTRO de ese radio (0.12) o la pata nace en el aire.
  // Muñones CORTOS y RECOGIDOS (el bicho murió y las patas se le encogieron)
  // y la garra va de HIJA del cono, clavada en el ápice local (0, L/2, 0):
  // calcularla aparte acumulaba el orden de Euler y quedaba flotando.
  for (const lado of [-1, 1]) {
    for (const [z, ang, L] of [[0.14, 0.35, 0.1], [0.01, 0.05, 0.11], [-0.12, -0.25, 0.1]]) {
      const pata = new THREE.Mesh(new THREE.ConeGeometry(0.018, L, 6), mQuitina2);
      // base ENTERRADA en el flanco bajo, ápice afuera-abajo (rotation.z
      // NEGATIVA respecto del lado): solo asoma el muñón con su garra
      pata.position.set(lado * 0.115, -0.1, z);
      pata.rotation.set(ang, 0, -lado * 2.55);
      const garra = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 5), mQuitina2);
      garra.position.set(0, L * 0.5, 0); // el ápice LOCAL del cono: nunca flota
      pata.add(garra);
      grupo.add(pata);
    }
  }

  // EL FIELTRO: cojines que brotan de las costuras y se van comiendo el cuerpo.
  // Traslapados hasta ser UNA masa — si se pueden contar, está mal.
  const cojines = [
    // el collar: la primera erupción, entre pronoto y élitros — y montándose
    // ya sobre la corona del pronoto, que rompe el anillo oscuro visto de atrás
    [0, 0.12, 0.03, 0.115, [1.35, 0.75, 0.85]],
    [0.09, 0.09, 0.05, 0.08, [1.1, 0.8, 0.9]],
    [-0.09, 0.095, 0.045, 0.085, [1.1, 0.78, 0.9]],
    [0.03, 0.14, 0.1, 0.075, [1.2, 0.7, 1.0]],
    // la sutura elitral reventada, del lomo hacia atrás — puente continuo
    [0, 0.16, -0.08, 0.1, [1.15, 0.7, 1.35]],
    [0.02, 0.15, -0.16, 0.09, [1.15, 0.72, 1.2]],
    [0.02, 0.14, -0.22, 0.095, [1.2, 0.75, 1.1]],
    // la masa trasera: el extremo del abdomen ya es del hongo
    [0, 0.03, -0.3, 0.125, [1.25, 1.05, 0.95]],
    [0, 0.09, -0.27, 0.1, [1.2, 0.9, 0.95]],
    [-0.07, -0.03, -0.26, 0.09, [1.1, 0.95, 1.0]],
    [0.075, -0.02, -0.27, 0.088, [1.08, 0.92, 1.0]],
    // y ya trepa por un flanco del pronoto — el frente es el siguiente
    [-0.105, 0.1, 0.14, 0.07, [1.0, 0.75, 1.05]],
  ];
  for (const [x, y, z, r, esc] of cojines) {
    const cojin = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), mFieltro);
    cojin.scale.set(esc[0], esc[1], esc[2]);
    cojin.position.set(x, y, z);
    grupo.add(cojin);
  }
  // ISLAS DE AVANCE: parches chatos de moho pegados AL élitro descubierto.
  // Son la palabra «cubriéndose»: sin manchas invadiendo lo oscuro, el blanco
  // parecía un ruff detrás del bicho y el fenómeno no se leía (gate, pasada 2).
  // Van clavadas POR MATEMÁTICA DE SUPERFICIE (punto del elipsoide + normal),
  // no a ojo: a ojo una quedó de canto en pleno élitro, como una aleta.
  const cAbd = new THREE.Vector3(0, 0.02, -0.1);
  const eAbd = new THREE.Vector3(0.185, 0.9 * 0.185, 1.3 * 0.185);
  const islas = [
    // [theta (acimut desde +Z), phi (desde el polo +Y), radio]
    [0.9, 0.85, 0.055], [-1.1, 0.75, 0.05], [2.3, 0.7, 0.045],
    [-2.5, 0.95, 0.042], [0.15, 0.55, 0.05],
  ];
  const dirIsla = new THREE.Vector3();
  for (const [th, ph, r] of islas) {
    dirIsla.set(Math.sin(ph) * Math.sin(th), Math.cos(ph), Math.sin(ph) * Math.cos(th));
    const isla = new THREE.Mesh(new THREE.SphereGeometry(r, 9, 7), mFieltro);
    isla.scale.set(1.3, 1.2, 0.42);
    isla.position.set(
      cAbd.x + dirIsla.x * eAbd.x * 0.97,
      cAbd.y + dirIsla.y * eAbd.y * 0.97,
      cAbd.z + dirIsla.z * eAbd.z * 0.97);
    // la cara chata (Z local) mira según la normal: la mancha ABRAZA la curva
    isla.lookAt(
      isla.position.x + dirIsla.x, isla.position.y + dirIsla.y, isla.position.z + dirIsla.z);
    grupo.add(isla);
  }
  // y una que ya salpicó el pronoto
  const islaP = new THREE.Mesh(new THREE.SphereGeometry(0.04, 9, 7), mFieltro);
  islaP.scale.set(1.3, 1.2, 0.42);
  islaP.position.set(-0.055, 0.13, 0.19);
  islaP.lookAt(-0.11, 0.28, 0.32);
  grupo.add(islaP);

  // las cáscaras de pelusa: el borde deshilachado de la masa blanca. Dos
  // capas con alfa — el fieltro respira, el globo liso muere.
  if (tex && tex.pelusa) {
    for (const [escala, op] of [[1.06, 0.6], [1.15, 0.3]]) {
      const mPelusa = new THREE.MeshStandardMaterial({
        map: tex.pelusa, transparent: true, opacity: op,
        depthWrite: false, roughness: 1.0, metalness: 0.0,
      });
      const cascara = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), mPelusa);
      cascara.scale.set(1.1 * escala, 0.95 * escala, 1.5 * escala);
      cascara.position.set(0, 0.06, -0.12);
      cascara.userData.sinSombra = true;
      grupo.add(cascara);
    }
  }
  return grupo;
}

// ── LA NUBE DE ESPORAS — masa (velos) + vida (motas) ───────────────────────
// Exportada aparte para que el gate la pueda encuadrar sola.
export function crearNubeEsporas(THREE) {
  const grupo = new THREE.Group();
  grupo.name = 'nubeEsporas';
  const tex = texturasBeauveria(THREE);

  // los velos: tres planos cruzados con vaho — el cuerpo de la nube desde
  // cualquier ángulo, 6 triángulos en total
  if (tex && tex.velo) {
    const velos = [
      // [x, y, z, ancho, opacidad, rotY, giro]
      [0, 0.02, 0, 0.8, 0.72, 0, 0.14],
      [0.1, 0.14, -0.1, 0.62, 0.52, 1.15, -0.1],
      [-0.12, 0.08, -0.16, 0.7, 0.6, 2.2, 0.08],
      [0.02, -0.06, 0.08, 0.55, 0.45, 0.6, -0.16],
    ];
    for (const [x, y, z, w, op, rotY, giro] of velos) {
      const m = new THREE.MeshBasicMaterial({
        map: tex.velo, transparent: true, opacity: op,
        depthWrite: false, side: THREE.DoubleSide,
      });
      const velo = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.82), m);
      velo.position.set(x, y, z);
      velo.rotation.y = rotY;
      velo.userData = { op0: op, giro, sinSombra: true };
      grupo.add(velo);
    }
  }

  // las motas: la deriva viva. Ciento setenta puntos blandos DENTRO del vaho
  // — con los velos detrás son polvillo en el aire, no bolitas. El radio va
  // más apretado que los velos: mota FUERA del vaho = bolita contable.
  const N = 170;
  const rnd = rng(0xe5f0);
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    // elipsoide desparejo, más denso al centro (dos rnd sumados)
    const a = rnd() * Math.PI * 2;
    const v = Math.acos(2 * rnd() - 1);
    const rr = 0.42 * (rnd() + rnd()) * 0.5 + 0.05;
    pos[i * 3] = Math.sin(v) * Math.cos(a) * rr * 0.85;
    pos[i * 3 + 1] = Math.cos(v) * rr * 0.6 + 0.06;
    pos[i * 3 + 2] = Math.sin(v) * Math.sin(a) * rr * 0.8;
  }
  const geoMotas = new THREE.BufferGeometry();
  geoMotas.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mMotas = new THREE.PointsMaterial({
    map: tex && tex.mota ? tex.mota : null,
    color: 0xf2fbe9, size: 0.05, sizeAttenuation: true,
    transparent: true, opacity: 0.85, depthWrite: false,
  });
  const motas = new THREE.Points(geoMotas, mMotas);
  motas.userData = { op0: 0.85, sinSombra: true };
  grupo.add(motas);
  return grupo;
}

function construirBeauveria(THREE, ctx) {
  const { THREEmat, pecho, cabeza, partes } = ctx;
  const tex = texturasBeauveria(THREE);
  const mFieltro = matFieltro(THREE, tex);
  const mVerdillo = THREEmat(0xbdd3a0, 0.95, 0.0);

  // ── el cuerpo mullido ────────────────────────────────────────────────────
  // golilla de fieltro al cuello y vientre acolchado: el torso liso de la
  // maquinaria queda debajo como relleno, el fieltro texturado es lo que se ve
  const golilla = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 9), mFieltro);
  golilla.scale.set(1.14, 0.58, 1.04);
  golilla.position.set(0, 0.49, 0.0);
  pecho.add(golilla);
  const vientre = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 9), mFieltro);
  vientre.scale.set(1.02, 1.2, 0.68);
  vientre.position.set(0, 0.25, 0.12);
  pecho.add(vientre);
  const lomo = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 9), mFieltro);
  lomo.scale.set(1.05, 1.1, 0.6);
  lomo.position.set(0, 0.3, -0.11);
  pecho.add(lomo);

  // ── la corona de la cabeza: el eco de los TRES BONETES de Angelita Bros ──
  // (allá son tres capuchas blancas dibujadas con quadraticCurve; aquí son
  // tres cojines miceliales traslapados, el central más alto, más uno de
  // nuca para que la corona no termine en filo)
  const bonetes = [
    [0, 0.15, -0.01, 0.15, [1.28, 0.74, 1.12], 0],
    [0.115, 0.095, 0.015, 0.105, [1.15, 0.68, 1.0], 0.32],
    [-0.12, 0.1, -0.025, 0.11, [1.12, 0.7, 1.0], -0.28],
    [0, 0.08, -0.14, 0.1, [1.2, 0.62, 0.95], 0],
  ];
  for (const [x, y, z, r, esc, rz] of bonetes) {
    const bonete = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), mFieltro);
    bonete.scale.set(esc[0], esc[1], esc[2]);
    bonete.position.set(x, y, z);
    bonete.rotation.z = rz;
    cabeza.add(bonete);
  }
  // el ribete verdillo bajo el bonete central: la lámina esporulada que el
  // dibujo de Angelita ya trae (su elipse rgba(169,196,139,.5)). Va NOTORIO:
  // es la seña que separa «hongo esporulando» de «gorro de lana» — sin él el
  // piloto arriesga leer oveja, que fue el punto flaco de la primera captura.
  const ribete = new THREE.Mesh(new THREE.TorusGeometry(0.142, 0.022, 6, 14), mVerdillo);
  ribete.rotation.x = Math.PI / 2;
  ribete.position.set(0, 0.078, -0.01);
  cabeza.add(ribete);

  // cáscara de pelusa sobre la corona: mismo truco que en la broca — la
  // silueta de la cabeza se deshilacha, no se pincha
  if (tex && tex.pelusa) {
    const mPelusa = new THREE.MeshStandardMaterial({
      map: tex.pelusa, transparent: true, opacity: 0.55,
      depthWrite: false, roughness: 1.0, metalness: 0.0,
    });
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), mPelusa);
    halo.scale.set(1.16, 0.98, 1.06);
    halo.position.set(0, 0.06, -0.01);
    halo.userData.sinSombra = true;
    cabeza.add(halo);
  }

  // ── LA BROCA COLONIZADA a la espalda ─────────────────────────────────────
  // Más abajo que la momia del momificador: en la moto el piloto va inclinado
  // y a la altura del hombro la broca se le montaba en la cabeza (medido en
  // la primera captura). Volcada hacia atrás (-0.55) para que el collar y la
  // sutura reventada — la colonización — miren al que viene siguiendo.
  const broca = construirBrocaColonizada(THREE, THREEmat);
  broca.position.set(0, 0.4, -0.34);
  broca.rotation.set(-0.55, 0, 0.05);
  pecho.add(broca);
  partes.extras.broca = broca;
  // el parche de anclaje: el fieltro CONTINÚA del lomo del piloto a la broca.
  // Un cadáver pegado con nada leería mochila; el hongo es un solo tejido.
  const anclaje = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), mFieltro);
  anclaje.scale.set(1.35, 0.9, 0.75);
  anclaje.position.set(0, 0.33, -0.26);
  pecho.add(anclaje);

  // ── LA NUBE DE ESPORAS ───────────────────────────────────────────────────
  // Nace de la broca (de ahí esporula el hongo, no del piloto) y respira en
  // aplicarPose: deriva sola, crece con el turbo.
  const nube = crearNubeEsporas(THREE);
  nube.position.set(0, 0.62, -0.5);
  nube.userData.y0 = 0.62;
  pecho.add(nube);
  partes.extras.esporas = nube;

  return { bocaBase: new THREE.Vector3(0, -0.07, 0.165) };
}

const CONSTRUCTORES = {
  crisopa: construirCrisopa,
  avispita: construirAvispita,
  mariquita: construirMariquita,
  momificador: construirMomificador,
  murcielago: construirMurcielago,
  morpho: construirMorpho,
  beauveria: construirBeauveria,
};

// Punto de entrada único desde pilotos-manejando.js.
export function construirBenefico(THREE, tipo, ctx) {
  return CONSTRUCTORES[tipo](THREE, ctx);
}

// Material del ojo por especie. La crisopa lleva ojos DORADOS METÁLICOS —
// no es un adorno, es el carácter diagnóstico que le da el nombre al género
// (Chrysoperla: «ala de oro»). Los otros dos van con esclera clara para que la
// cara siga leyendo desde lejos sobre cuerpo oscuro.
export function materialesOjo(THREE, tipo, mat) {
  if (tipo === 'crisopa') {
    return {
      esclera: new THREE.MeshStandardMaterial({
        color: 0xe0a91c, roughness: 0.18, metalness: 0.92,
      }),
      iris: null,
    };
  }
  if (tipo === 'morpho') {
    // OJO COMPUESTO: no tiene blanco. Es una cúpula parda con sedas, y con un
    // lustre suave porque son miles de facetas devolviendo luz. Va ámbar-oliva
    // y no negro para que la pupila negra encima siga recortando: un ojo negro
    // con pupila negra es una cara sin mirada.
    return {
      esclera: new THREE.MeshStandardMaterial({
        color: 0x8f7442, roughness: 0.34, metalness: 0.45,
      }),
      iris: null,
    };
  }
  if (tipo === 'murcielago') {
    // ojo de mamífero: iris pardo cálido con blanco alrededor. Nada de rojo
    // encendido — eso es del murciélago de disfraz, no del que poliniza.
    return { esclera: mat(0xf3ece0, 0.6), iris: mat(0x4a2c14, 0.42) };
  }
  if (tipo === 'beauveria') {
    // sobre una cara BLANCA la esclera blanca desaparece: va verdillo pálido
    // de espora — el mismo tinte del aura del power-up en Angelita Bros
    // (rgba(190,255,170)) — para que la mirada recorte sin ensuciar el blanco.
    return { esclera: mat(0xcfe0ba, 0.62), iris: null };
  }
  // sobre cabeza oscura la esclera clara es lo único que sostiene la cara a
  // distancia de carrera: sin iris, para que quede blanco visible alrededor
  // de la pupila
  return { esclera: mat(0xf7f5ec, 0.58), iris: null };
}
