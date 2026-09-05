/*
 * biodigestor.geom — LA MANGA POR DENTRO: la geometría del biodigestor tubular
 * de polietileno ("tipo salchicha"), el modelo más común del campo colombiano,
 * EN CORTE. Funciones puras (three-core, headless).
 *
 * ── POR QUÉ ESTE MODELO Y NO OTRO ──────────────────────────────────────────
 * "El modelo más usado en Colombia —el tubular tipo salchicha de polietileno—
 * nació pensado justo para el pequeño y mediano productor, porque es barato y
 * se puede armar uno mismo." Es el más barato de todos los tipos que existen.
 * Dibujar aquí un tanque de concreto de granja grande sería mentir sobre a
 * quién le hablamos.
 *
 * ── EL CORTE ───────────────────────────────────────────────────────────────
 * Todo se construye como un DIBUJO TÉCNICO EN 3D: cada pieza es una sección
 * transversal extruida a lo largo del eje X, y TODO está cortado en el plano
 * z=0 — justo el plano donde está la cámara. Se conserva la mitad de atrás
 * (z<0) y se bota la de adelante. Resultado: uno mira la manga como si le
 * hubieran pasado un serrucho a lo largo, y ve el lodo, el gas y las burbujas
 * de verdad, no una insinuación.
 *
 * ── LA FÍSICA QUE HAY QUE RESPETAR (y que casi nadie dibuja bien) ──────────
 *
 *   1. LA MANGA NO ESTÁ LLENA. El lodo ocupa ~3/4 y el gas se acumula en el
 *      cuarto de arriba: esa es LA CAMPANA. Por eso `NIVEL` está calculado
 *      —no puesto a ojo— para que el área de lodo dé ~75% del círculo.
 *
 *   2. LA MANGA SE SELLA CON AGUA, NO CON TAPAS. Las bocas de los dos tubos
 *      quedan POR DEBAJO del nivel del lodo: el propio líquido es el tapón que
 *      impide que el gas se salga por ahí. Por eso `entrada` y `salida` mueren
 *      bajo el nivel. Si un dibujo muestra los tubos al aire, el biodigestor
 *      de ese dibujo no funcionaría.
 *
 *   3. EL LABIO DE LA SALIDA MANDA EL NIVEL. Vasos comunicantes: el lodo se
 *      queda exactamente a la altura del labio por donde rebosa el biol. Por
 *      eso `SALIDA.labioY === NIVEL`. No es un detalle: es lo que hace que
 *      cargar por un lado saque biol por el otro, todos los días.
 *
 *   4. SIN AIRE. La fermentación es ANAEROBIA. Aquí no hay ventilación, no hay
 *      rejilla, no hay respiradero. Solo la manguera del gas — y su sello.
 *
 * ── SEGURIDAD (el biogás es inflamable: no se dibuja bonito, se dibuja bien) ─
 * La `VALVULA` de este módulo es el sello de agua real del campo: la manguera
 * muere sumergida en un frasco con agua. Si la presión sube de más, el gas
 * burbujea por el agua y se escapa — la manga no revienta. Es la pieza más
 * barata y más importante de toda la instalación, y por eso está modelada.
 * "Nunca revise fugas con fósforo o encendedor, use agua con jabón."
 *
 * ── HONESTIDAD ─────────────────────────────────────────────────────────────
 * La manga lleva su PARCHE (esto se pincha y se remienda), la zanja lleva su
 * barro y su cama de arena (si no, un objeto filoso se la lleva), y los
 * amarres de neumático están a la vista. Esto no es un folleto: es una obra
 * que costó plata, pala y trabajo.
 */
import * as THREE from 'three';
import {
  PALETA_ESTIERCOL,
  torcerConLaMano,
  recortarEnCorte,
  amarreGeom,
  rng,
} from './estiercol.geom.js';

/* ------------------------------------------------------------------ */
/* LAS MEDIDAS — la manga y su zanja.                                   */
/* ------------------------------------------------------------------ */

/*
 * El suelo de la finca es y=0. La manga va SEMIENTERRADA: la panza en la
 * zanja y la campana de gas asomando — así se ve en el campo, y así se
 * entiende de una que hay una parte llena y una parte con gas.
 */
export const MANGA = {
  radio: 0.82,
  largo: 4.4,
  centroY: -0.3, // el eje: bajo tierra (la panza en la zanja, la campana afuera)
  espesor: 0.035, // el canto del polietileno que se ve en el corte
};

/*
 * EL NIVEL DEL LODO, calculado y no inventado. Para un círculo, la fracción de
 * área bajo la altura h (con t = h/radio) es:
 *
 *     f(t) = 0.5 + (asin(t) + t·√(1-t²)) / π
 *
 * Con t = 0.4 → f ≈ 0.748. O sea: el lodo ocupa ~3/4 y el gas ~1/4, que es la
 * proporción de trabajo de una manga tubular. Dejarlo a ojo es lo que produce
 * los dibujos donde el biodigestor está lleno hasta el tope (y entonces no
 * tendría dónde acumular el gas).
 */
export const T_NIVEL = 0.4;
export const NIVEL = MANGA.centroY + T_NIVEL * MANGA.radio; // ≈ +0.03: casi a ras de suelo

/** La fracción de área ocupada por el lodo (la fórmula de arriba, exportada
 *  para que un test la verifique en vez de creerle al comentario). */
export function fraccionLodo(t = T_NIVEL) {
  return 0.5 + (Math.asin(t) + t * Math.sqrt(1 - t * t)) / Math.PI;
}

/* La zanja: cavada A MANO, más ancha arriba que abajo (así se sostiene la
   pared de tierra y así queda cuando se cava con pala, nunca a escuadra). */
export const ZANJA = {
  fondoY: -1.14, // la manga se apoya aquí (centroY - radio = -1.12: descansa)
  medioAnchoArriba: 1.26,
  medioAnchoFondo: 0.98,
  tierraHasta: 2.9, // hasta dónde se ve el bloque de tierra en el corte
  tierraFondo: -1.55,
};

/* Los dos tubos. Fíjese en las `bocaY`: las DOS mueren bajo NIVEL. Ese es el
   sello de agua que hace hermética la manga (ver cabecera §2). */
export const ENTRADA = {
  x: -MANGA.largo / 2 - 0.16,
  radio: 0.13,
  bocaY: -0.46, // BAJO el nivel: sellada por el propio lodo
  topeY: 0.86, // arriba, afuera: aquí se vacía el balde todos los días
  inclina: 0.42, // rad: se carga por gravedad, no a presión
};

export const SALIDA = {
  x: MANGA.largo / 2 + 0.16,
  radio: 0.13,
  bocaY: -0.5, // BAJO el nivel: sellada
  labioY: NIVEL, // vasos comunicantes: el labio MANDA el nivel del lodo
  inclina: 0.34,
};

/* La toma de gas: un niple atravesando el lomo de la manga, arriba del todo,
   donde se junta el biogás. Va corrido hacia un extremo, no al medio, porque
   la manguera tiene que salir de la zanja sin cruzarse con nadie. */
export const TOMA_GAS = { x: -1.0, y: MANGA.centroY + MANGA.radio, radio: 0.055 };

/* El sello de agua: el frasco donde muere la manguera. La pieza más barata y
   más importante (ver cabecera §Seguridad). `sumergido` es cuánto entra la
   manguera al agua: eso —y nada más— es lo que fija la presión máxima. */
export const VALVULA = {
  pos: [-2.75, 0, 2.0],
  radio: 0.17,
  alto: 0.44,
  aguaY: 0.3,
  sumergido: 0.12,
};

/* La cocina, en coordenadas LOCALES del biodigestor (el grupo ya está puesto
   en su sitio). Va PEGADA a la manga a propósito: el tramo de manguera tiene
   que ser corto y revisable. Y al aire libre — el punto de consumo del biogás
   va ventilado, nunca en un cuarto cerrado sin salida de aire. */
export const COCINA = { pos: [-2.15, 0, 3.25], alto: 0.82 };

/* ------------------------------------------------------------------ */
/* EL RÉGIMEN TÉRMICO — "en tierra fría rinde menos".                   */
/* ------------------------------------------------------------------ */

/*
 * "Las bacterias trabajan más rápido con más calor: en clima frío las mismas
 * bacterias trabajan más lento y el estiércol necesita quedarse MUCHOS más
 * días adentro para producir la misma cantidad de gas."
 *
 * OJO CON LOS NÚMEROS: el corpus se niega a dar cifras exactas de retención
 * (dependen del diseño y del sitio), así que aquí NO se inventa ninguna. Lo
 * que se modela es la RELACIÓN, que sí es firme y sí es lo que hay que
 * entender: en frío hay menos burbujas, más lentas, y el mismo estiércol se
 * queda mucho más tiempo adentro. La escena lo dice con burbujas, no con un
 * número falso.
 *
 * Y la respuesta del campo al frío también se modela: `invernadero` — tapar la
 * zanja con plástico para ganarle unos grados. "En tierra fría conviene poner
 * el biodigestor donde le dé sol directo, o incluso taparlo con un invernadero
 * plástico sencillo."
 */
export const CLIMAS = {
  calido: {
    id: 'calido',
    etiqueta: 'tierra caliente',
    burbujas: 1, // ritmo pleno
    velocidad: 1,
    invernadero: false, // aquí estorba: recalienta el plástico
    nota: 'En caliente las bacterias trabajan rápido: el gas sale parejo y el estiércol se queda pocos días adentro. Aquí conviene sombra parcial, para que el sol no le queme la manga.',
  },
  frio: {
    id: 'frio',
    etiqueta: 'tierra fría',
    burbujas: 0.38, // MENOS gas: se ve
    velocidad: 0.55, // y más lento: se ve
    invernadero: true, // la respuesta: ganarle grados al páramo
    nota: 'En tierra fría rinde menos: las mismas bacterias trabajan lentas y el estiércol tiene que quedarse muchos más días adentro para dar el mismo gas. Por eso acá se le pone el invernadero encima y se le busca el sol.',
  },
};

/* ------------------------------------------------------------------ */
/* LAS SECCIONES — el corte, en el plano z=0.                           */
/* ------------------------------------------------------------------ */

/*
 * Convención (léala una vez y todo lo de abajo se entiende):
 *
 *   Una `THREE.Shape` se dibuja en su plano (u, v) y se extruye hacia +w.
 *   `aEjeX()` la acuesta: w → +X (el largo de la manga), u → −Z (el fondo,
 *   lejos de la cámara) y v → +Y (la altura, sin tocar).
 *
 *   Por eso TODA sección se dibuja con u ∈ [0, algo] (solo la mitad de atrás)
 *   y su cara u=0 cae exacta en z=0: ESA es la cara del corte, la que mira la
 *   cámara. No hay que recortar nada después: la pieza nace cortada.
 */
function aEjeX(geo, largo) {
  geo.rotateY(Math.PI / 2); // w → +X, u → −Z
  geo.translate(-largo / 2, 0, 0); // centrada en el origen
  return geo;
}

function extruir(shape, largo) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: largo,
    bevelEnabled: false,
    curveSegments: 14,
  });
  return aEjeX(geo, largo);
}

/**
 * EL LODO en corte: el segmento circular bajo `NIVEL`, mitad de atrás. Su cara
 * plana en z=0 es lo que uno ve: la masa fermentando, con su superficie quieta.
 */
export function lodoGeom({ largo = MANGA.largo } = {}) {
  const r = MANGA.radio;
  const cy = MANGA.centroY;
  const theta = Math.asin((NIVEL - cy) / r); // donde la superficie corta el círculo
  const s = new THREE.Shape();
  s.moveTo(0, cy - r); // el fondo de la manga
  s.absarc(0, cy, r, -Math.PI / 2, theta, false); // la panza, por atrás
  s.lineTo(0, NIVEL); // la superficie del lodo: plana y quieta
  s.closePath();
  return extruir(s, largo);
}

/**
 * LA CAMPANA DE GAS en corte: el casquete sobre `NIVEL`. Es el cuarto de arriba
 * de la manga — el que la gente no dibuja y es justo donde vive el biogás.
 */
export function campanaGeom({ largo = MANGA.largo } = {}) {
  const r = MANGA.radio;
  const cy = MANGA.centroY;
  const theta = Math.asin((NIVEL - cy) / r);
  const s = new THREE.Shape();
  s.moveTo(0, NIVEL);
  s.lineTo(r * Math.cos(theta), NIVEL); // la superficie, desde el eje hacia atrás
  s.absarc(0, cy, r, theta, Math.PI / 2, false); // el lomo de la manga
  s.closePath();
  return extruir(s, largo);
}

/**
 * LA MANGA (la pared de polietileno): media caña, la mitad de atrás. Abierta
 * hacia la cámara — hay que montarla con `side: DoubleSide` para ver la cara
 * interior del plástico, que es media escena.
 *
 * `torcerConLaMano` le quita la perfección de fábrica: una manga cargada está
 * pandeada, nunca es un tubo de catálogo.
 */
export function mangaGeom({ largo = MANGA.largo, seg = 20 } = {}) {
  const geo = new THREE.CylinderGeometry(
    MANGA.radio,
    MANGA.radio,
    largo,
    seg,
    3,
    true, // sin tapas: los extremos se amarran, no se tapan
    Math.PI / 2, // ── solo la mitad de atrás (z<0): el resto se lo llevó el corte
    Math.PI,
  );
  geo.rotateZ(Math.PI / 2); // el eje del cilindro → +X
  geo.translate(0, MANGA.centroY, 0);
  torcerConLaMano(geo, { amplitud: 0.022, seed: 17 });
  return recortarEnCorte(geo); // el pandeo no puede asomar delante del corte
}

/**
 * EL CANTO del corte: las dos líneas donde el serrucho pasó por el plástico
 * (el lomo y la panza, en z=0). Un dibujo técnico marca el material cortado
 * con línea gruesa; aquí es geometría de verdad, con su espesor.
 * @returns {{ geo: THREE.BufferGeometry, y: number }[]}
 */
export function cantosManga({ largo = MANGA.largo } = {}) {
  return [MANGA.centroY + MANGA.radio, MANGA.centroY - MANGA.radio].map((y, i) => ({
    geo: new THREE.BoxGeometry(largo, MANGA.espesor, MANGA.espesor * 1.6),
    y,
    key: i,
  }));
}

/**
 * LA ZANJA en corte: el bloque de tierra con el hueco cavado. El polígono
 * rodea el vacío — por eso la tierra que se ve bajo la manga y a su lado es
 * una sola pieza, como en la realidad.
 *
 * Las paredes salen inclinadas (más ancha arriba) porque así se sostiene la
 * tierra y así queda una zanja cavada con pala. Una zanja a escuadra es una
 * zanja de render.
 */
export function zanjaGeom({ largo = MANGA.largo + 1.5 } = {}) {
  const z = ZANJA;
  const s = new THREE.Shape();
  s.moveTo(0, z.tierraFondo);
  s.lineTo(z.tierraHasta, z.tierraFondo);
  s.lineTo(z.tierraHasta, 0); // la superficie del potrero
  s.lineTo(z.medioAnchoArriba, 0); // el borde de la zanja
  s.lineTo(z.medioAnchoFondo, z.fondoY); // la pared, inclinada
  s.lineTo(0, z.fondoY); // el fondo
  s.closePath();
  const geo = extruir(s, largo);
  torcerConLaMano(geo, { amplitud: 0.028, seed: 23 });
  return recortarEnCorte(geo); // la tierra no se sale por delante de la sección
}

/**
 * LA CAMA de la zanja: arena o paja bajo la manga. No es decoración — es lo
 * que impide que una piedra o un palo le abran un hueco al polietileno. Sin
 * esto, la manga dura meses en vez de años.
 */
export function camaZanjaGeom({ largo = MANGA.largo + 0.4 } = {}) {
  const s = new THREE.Shape();
  s.moveTo(0, ZANJA.fondoY);
  s.lineTo(ZANJA.medioAnchoFondo * 0.96, ZANJA.fondoY);
  s.lineTo(ZANJA.medioAnchoFondo * 0.92, ZANJA.fondoY + 0.09);
  s.lineTo(0, ZANJA.fondoY + 0.11);
  s.closePath();
  return extruir(s, largo);
}

/**
 * EL INVERNADERO: el arco de plástico sobre la zanja para ganarle grados al
 * frío. Cortado igual que todo (solo el cuarto de atrás y arriba del suelo).
 */
export function invernaderoGeom({ largo = MANGA.largo + 1.1, radio = 1.42, seg = 16 } = {}) {
  const geo = new THREE.CylinderGeometry(
    radio,
    radio,
    largo,
    seg,
    1,
    true,
    Math.PI / 2, // ── mitad de atrás…
    Math.PI / 2, // ── …y solo lo que queda sobre el suelo: un cuarto de tubo
  );
  geo.rotateZ(Math.PI / 2);
  torcerConLaMano(geo, { amplitud: 0.03, seed: 29 });
  return recortarEnCorte(geo);
}

/**
 * EL PARCHE: el remiendo de polietileno sobre un pinchazo, pegado en el lomo.
 * Está aquí por honestidad — la manga se pincha, se parcha y sigue. Un
 * biodigestor sin parche es un biodigestor que no ha trabajado.
 */
export function parcheGeom() {
  const geo = new THREE.CylinderGeometry(
    MANGA.radio + 0.012,
    MANGA.radio + 0.012,
    0.42,
    8,
    1,
    true,
    Math.PI * 1.06, // en el lomo de atrás, donde se ve desde la cámara
    0.5,
  );
  geo.rotateZ(Math.PI / 2);
  geo.translate(1.5, MANGA.centroY, 0);
  return geo;
}

/**
 * LOS AMARRES: las tiras de neumático con que se aprieta la manga contra cada
 * tubo. Así se sella de verdad en el campo — no con bridas de ferretería. El
 * remate se ve.
 */
export function amarresGeom() {
  return [
    { geo: amarreGeom(ENTRADA.radio + 0.05, 0.038, 5), pos: [-MANGA.largo / 2 + 0.05, MANGA.centroY, 0], rot: [0, Math.PI / 2, 0] },
    { geo: amarreGeom(ENTRADA.radio + 0.05, 0.038, 6), pos: [-MANGA.largo / 2 + 0.22, MANGA.centroY, 0], rot: [0, Math.PI / 2, 0] },
    { geo: amarreGeom(SALIDA.radio + 0.05, 0.038, 7), pos: [MANGA.largo / 2 - 0.05, MANGA.centroY, 0], rot: [0, Math.PI / 2, 0] },
    { geo: amarreGeom(SALIDA.radio + 0.05, 0.038, 8), pos: [MANGA.largo / 2 - 0.22, MANGA.centroY, 0], rot: [0, Math.PI / 2, 0] },
  ];
}

/* ------------------------------------------------------------------ */
/* LAS BURBUJAS — la fermentación que se ve.                            */
/* ------------------------------------------------------------------ */

/*
 * El corazón de la escena. Suben del lodo a la campana: eso es el metano
 * naciendo. Van DETRÁS del plano del corte (z ∈ [-0.66, -0.08]) para que se
 * lean contra la pared interior de la manga y no floten por delante del corte.
 *
 * `clima` decide cuántas y qué tan rápido — así "en tierra fría rinde menos"
 * se ve en vez de leerse (ver CLIMAS).
 */
export function burbujas(params, clima = CLIMAS.calido, seed = 41) {
  const r = rng(seed);
  const cuantas = Math.max(4, Math.round(params.burbujas * clima.burbujas));
  const out = [];
  for (let i = 0; i < cuantas; i += 1) {
    const yFondo = MANGA.centroY - MANGA.radio * 0.72;
    out.push({
      x: (r() - 0.5) * MANGA.largo * 0.9,
      z: -0.08 - r() * 0.58, // detrás del corte, contra la pared del fondo
      y0: yFondo + r() * 0.18,
      fase: r(),
      vel: (0.16 + r() * 0.2) * clima.velocidad,
      escala: 0.026 + r() * 0.042,
    });
  }
  return out;
}

/** El recorrido de una burbuja: nace en el fondo y muere en la superficie del
 *  lodo (ahí entrega su gas a la campana). */
export const BURBUJA_TECHO = NIVEL - 0.02;

/* ------------------------------------------------------------------ */
/* LA MANGUERA DEL GAS — de la campana al frasco, y del frasco a la olla.
/* ------------------------------------------------------------------ */

/**
 * El recorrido del biogás, con la manga colgando como cuelga una manguera
 * (nunca tensa). Pasa por el PUNTO BAJO —la trampa de agua, donde se junta el
 * condensado y se purga— antes de subir al sello y seguir a la cocina.
 * @returns {{ curva: THREE.CatmullRomCurve3, trampa: THREE.Vector3 }}
 */
export function recorridoGas() {
  const trampa = new THREE.Vector3(-1.85, 0.1, 1.05); // el punto bajo: aquí se purga
  const pts = [
    new THREE.Vector3(TOMA_GAS.x, TOMA_GAS.y + 0.04, -0.02),
    new THREE.Vector3(TOMA_GAS.x - 0.35, TOMA_GAS.y + 0.26, 0.34),
    new THREE.Vector3(-1.6, 0.42, 0.76),
    trampa, // ── la manguera baja: el agua se junta acá y se saca
    new THREE.Vector3(-2.3, 0.36, 1.5),
    new THREE.Vector3(VALVULA.pos[0], VALVULA.aguaY + 0.5, VALVULA.pos[2] - 0.02), // al sello
  ];
  return { curva: new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.35), trampa };
}

/** Del sello de agua a la hornilla: el tramo que de verdad cocina. */
export function recorridoCocina() {
  const pts = [
    new THREE.Vector3(VALVULA.pos[0] - 0.08, VALVULA.aguaY + 0.4, VALVULA.pos[2] + 0.06),
    new THREE.Vector3(-2.6, 0.3, 2.5),
    new THREE.Vector3(-2.4, 0.26, 2.95),
    new THREE.Vector3(COCINA.pos[0] + 0.1, COCINA.alto - 0.16, COCINA.pos[2] - 0.24),
  ];
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.4);
}

/** La manguera como tubo (aplica a los dos recorridos). */
export function mangueraGeom(curva, params) {
  return new THREE.TubeGeometry(curva, params.segTubo * 3, 0.032, 5, false);
}

/* ------------------------------------------------------------------ */
/* LA LLAMA — biogás bien quemado.                                      */
/* ------------------------------------------------------------------ */

/*
 * ARDE AZUL. No es una decisión de arte, es química: una llama de biogás bien
 * regulada es azul. La llama AMARILLA es la mal ajustada (la que tizna la olla
 * y desperdicia el gas), y por eso en este módulo NO se pinta amarilla — sería
 * enseñar el error como si fuera el objetivo.
 *
 * Tres capas, de adentro hacia afuera: el corazón pálido, el cono azul y el
 * borde que lame la olla. Bajita y pareja: una llama de biogás no es una
 * fogata. Controlada y correcta, como debe verse cualquier fuego que este
 * proyecto le muestre a alguien que lo va a copiar en su casa.
 */
export const LLAMA = {
  capas: [
    { r: 0.052, h: 0.2, color: PALETA_ESTIERCOL.llamaCorazon, opacidad: 0.95 },
    { r: 0.082, h: 0.3, color: PALETA_ESTIERCOL.llama, opacidad: 0.8 },
    { r: 0.105, h: 0.21, color: PALETA_ESTIERCOL.llamaBorde, opacidad: 0.45 },
  ],
  /* la corona de la hornilla: llamitas repartidas en círculo, como un quemador
     de verdad (no una sola lengua de fuego en el centro) */
  bocas: 7,
  radioCorona: 0.11,
};

/** Las posiciones de las llamitas de la corona del quemador. */
export function bocasLlama() {
  const out = [];
  for (let i = 0; i < LLAMA.bocas; i += 1) {
    const a = (i / LLAMA.bocas) * Math.PI * 2;
    out.push([Math.sin(a) * LLAMA.radioCorona, 0, Math.cos(a) * LLAMA.radioCorona]);
  }
  return out;
}

/** El cono de una capa de llama (lathe: la llama tiene cintura, no es un cono). */
export function llamaGeom(capa, seg = 8) {
  const pts = [
    new THREE.Vector2(0.0001, 0),
    new THREE.Vector2(capa.r * 0.9, capa.h * 0.12),
    new THREE.Vector2(capa.r, capa.h * 0.38),
    new THREE.Vector2(capa.r * 0.72, capa.h * 0.72),
    new THREE.Vector2(0.0001, capa.h),
  ];
  return new THREE.LatheGeometry(pts, seg);
}
