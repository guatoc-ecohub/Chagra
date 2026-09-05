/*
 * olor.geom — la cochera, la cama, la fosa, la cerca y los cuerpos.
 *
 * El escenario del problema. Todo en METROS (1 unidad = 1 m) y eso no es un
 * detalle técnico: es la pieza. Si la gallina no mide lo que mide una gallina,
 * el argumento —que ella respira un aire y el dueño respira otro, en el mismo
 * cuarto— se cae. Las alturas viven en `aireCargado.ALTURAS` y acá se obedecen.
 *
 * Qué hay:
 *   · Piso          — losa con PENDIENTE hacia un canal. La pendiente es el
 *                     personaje silencioso: es lo que separa el sólido del
 *                     líquido, y separarlos es media solución.
 *   · Cama          — el colchón de material seco. Su espesor lo manda el
 *                     carbono; su superficie es irregular porque la pisan.
 *   · Estructura    — media agua de finca: muros bajos, postes, techo a un
 *                     agua con CABALLETE ABIERTO arriba (por ahí se fuga el
 *                     oro y por ahí entra el remedio).
 *   · Bebedero      — el foco. "Una de las causas más comunes de mal olor
 *                     localizado (...) aunque el resto de la cama esté seca."
 *   · Fosa          — el hueco donde se sienta el que calla.
 *   · Cerca         — el lindero. Del otro lado hay una casa con gente.
 *   · Bulto         — la cascarilla arrimada contra el poste. El remedio ya
 *                     está ahí, apoyado. Nadie le ha dicho para qué sirve.
 *   · Cuerpos       — gallina, cerdo, persona: siluetas planas a escala real.
 *
 * Los cuerpos son SILUETAS, no personajes. Decisión de arte deliberada: los
 * bichos rubber-hose de Chagra son actores con nombre y carisma, y acá un actor
 * carismático robaría la escena — el protagonista es el aire. Estas son figuras
 * de referencia, como las de un plano de arquitectura: están para decir "a esta
 * altura hay una cabeza viva". Planas, oscuras, calladas.
 *
 * TÉCNICA (calcada de floraParamo/sucesion): cada pieza se FUSIONA en UNA
 * geometría con el color horneado en vertexColors → una draw-call. Cero assets,
 * todo procedural, corre headless.
 *
 * Solo mallas y datos: nada de WebGL ni de r3f acá.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../bosque/entQuenua.geom.js';
import { mezclar, TIERRAS, CORTEZAS, NEUTROS, ACENTOS, NIEBLAS, PALETA, AGUAS } from '../paleta/index.js';

/* ------------------------------------------------------------------ */
/* COLORES — derivados de la paleta madre, ni un hex suelto.           */
/* ------------------------------------------------------------------ */

/*
 * LA DECISIÓN DE ARTE DE TODA LA PIEZA está en dos líneas de acá abajo.
 *
 * El amoníaco NO se pinta de verde tóxico. El humito verde de caricatura es
 * mentira dos veces: el amoníaco es incoloro, y "verde tóxico" le dice al
 * campesino "eso es veneno, sáquelo" — cuando lo que hay que decirle es "eso
 * es SUYO, no lo deje ir".
 *
 * Se pinta DORADO. El color del grano de maíz, del abono, de la cosecha:
 *   `nitrogeno: ACENTOS.maizGrano` — el mismo amarillo del grano en la mazorca.
 * Porque eso es literalmente lo que se está volando. Cuando el campesino ve
 * subir el oro por el caballete, no está viendo un gas: está viendo lo que
 * pagó en el bulto de concentrado saliéndose por el techo. Duele porque es
 * bonito y se va.
 *
 * Lo desagradable no lo pone el color del gas, lo pone el VELO: un turbio
 * amarillo-sucio, desaturado, sin nada de brillo, que se acuesta sobre la cama
 * y se come el color de todo lo que hay detrás. Ahí está la incomodidad —
 * no en un tono asqueroso, sino en un aire que ensucia lo que toca.
 */
export const COLORES = {
  /* — el gas — */

  /* El velo del amoníaco: la niebla dorada de la casa, revolcada en pajonal y
     apagada contra el zinc. Queda un amarillo turbio de orina vieja que no
     pertenece a ninguna hora del día — y esa es la idea: es aire que sobra. */
  velo: mezclar(mezclar(NIEBLAS.dorada, TIERRAS.pajonal, 0.62), NEUTROS.lamina, 0.44),
  /* El corazón del estrato, contra la cama: más sucio todavía. */
  veloHondo: mezclar(mezclar(TIERRAS.pajonal, NEUTROS.lamina, 0.5), TIERRAS.turba, 0.3),

  /* EL ORO. El nitrógeno. Lo que se va o se queda. */
  nitrogeno: ACENTOS.maizGrano, // en el aire: el grano de la mazorca, fugándose
  nitrogenoCama: ACENTOS.ambar, // ya sentado en la cama: el mismo oro, más hondo
  nitrogenoFuga: mezclar(ACENTOS.maizGrano, NIEBLAS.lechosa, 0.35), // arriba, al perderse

  /* El que calla. Pardo violáceo muerto: ni brilla ni sube ni avisa. El
     índigo del mortiño ahogado en la tierra más honda — un color que el ojo
     resbala, y ese resbalón ES el peligro. */
  sulfhidrico: mezclar(TIERRAS.cacao, ACENTOS.indigo, 0.46),

  /* — la materia — */
  lodo: mezclar(TIERRAS.cacao, NEUTROS.tinta, 0.38), // el barro de la manguera
  charco: mezclar(mezclar(TIERRAS.cacao, AGUAS.viva, 0.25), NEUTROS.tinta, 0.2),
  camaSeca: mezclar(TIERRAS.vega, TIERRAS.camino, 0.34), // cascarilla, aserrín
  camaSecaClara: mezclar(TIERRAS.vega, NIEBLAS.lechosa, 0.4), // la viruta al sol
  camaSucia: mezclar(TIERRAS.turba, NEUTROS.tinta, 0.28), // la cama vencida
  estiercol: mezclar(TIERRAS.turba, TIERRAS.cacao, 0.5),

  /* — la obra — */
  piso: NEUTROS.concreto,
  pisoMojado: mezclar(NEUTROS.concreto, TIERRAS.cacao, 0.5),
  muro: mezclar(NEUTROS.cal, TIERRAS.vega, 0.3),
  poste: CORTEZAS.roble,
  madera: PALETA.madera,
  techo: NEUTROS.lamina,
  techoSol: mezclar(NEUTROS.lamina, NIEBLAS.dorada, 0.28),

  /* — los cuerpos: tinta, siempre. Son sombras con altura, no personajes. — */
  cuerpo: NEUTROS.tinta,
  mosca: NEUTROS.tinta,

  /* — el otro lado de la cerca — */
  casaVecino: mezclar(NEUTROS.cal, NIEBLAS.dorada, 0.3),
  tejaVecino: mezclar(CORTEZAS.sieteCueros, NEUTROS.lamina, 0.35),
};

/* ------------------------------------------------------------------ */
/* La cochera — medidas.                                               */
/* ------------------------------------------------------------------ */

export const COCHERA = {
  ancho: 6.2, // x
  fondo: 4.0, // z
  muro: 1.05, // altura del muro bajo: el cerdo no salta, el aire sí sale
  aleroBajo: 2.35, // el techo a un agua, lado bajo
  aleroAlto: 3.05, // lado alto
  canalX: -2.6, // el canal corre pegado al muro bajo
  fosaX: -4.3, // la fosa, afuera, en el punto más bajo
  cercaZ: 4.9, // el lindero del vecino
};

/* ------------------------------------------------------------------ */
/* Utilidades de horneado (patrón de la casa).                         */
/* ------------------------------------------------------------------ */

/** Hornea un color en los vértices y devuelve la misma geometría. */
function pintar(geo, color, variacion = 0, r = null) {
  const c = new THREE.Color(color);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  const pos = geo.attributes.position;
  for (let i = 0; i < n; i++) {
    let cr = c.r;
    let cg = c.g;
    let cb = c.b;
    if (variacion > 0) {
      /* Variación por ALTURA del vértice, no aleatoria pura: así la cama se ve
         más clara arriba (donde le da la luz y está la viruta fresca) y más
         oscura abajo. Le da volumen sin costar una sola luz. */
      const t = 1 + (pos.getY(i) * 0.5 + (r ? r() - 0.5 : 0)) * variacion;
      cr *= t;
      cg *= t;
      cb *= t;
    }
    arr[i * 3] = cr;
    arr[i * 3 + 1] = cg;
    arr[i * 3 + 2] = cb;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

/** Caja pintada, ubicada y rotada. */
function caja(w, h, d, color, [x, y, z], rot = null, variacion = 0, r = null) {
  const g = new THREE.BoxGeometry(w, h, d);
  pintar(g, color, variacion, r);
  if (rot) g.rotateZ(rot);
  g.translate(x, y, z);
  return g;
}

/** Fusiona descartando nulos (mergeGeometries se cae con un solo hueco). */
function fusionar(lista) {
  const buenas = lista.filter(Boolean);
  if (!buenas.length) return null;
  const g = mergeGeometries(buenas, false);
  buenas.forEach((b) => b.dispose());
  return g;
}

/* ------------------------------------------------------------------ */
/* EL PISO — la pendiente que separa el sólido del líquido.            */
/* ------------------------------------------------------------------ */

/*
 * "Un piso liso sin pendiente hace que el líquido se quede empozado (...) y eso
 *  favorece la fermentación anaeróbica y el olor a huevo podrido."
 *
 * La losa cae suavemente hacia el canal. Es la pieza más aburrida de la escena
 * y la que más trabaja: si el orín escurre solo, el sólido se queda seco arriba
 * y se puede recoger con pala; si no, se revuelven y se pudren juntos. La obra
 * que evita el problema no se ve — por eso hay que dibujarla.
 */
export function geomPiso() {
  const { ancho, fondo, canalX } = COCHERA;
  const segX = 24;
  const segZ = 16;
  const g = new THREE.PlaneGeometry(ancho, fondo, segX, segZ);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    /* Caída suave hacia el canal (unos pocos centímetros por metro: la
       pendiente "suave" del maestro, que él se negó a poner en porcentaje). */
    const caida = (x - ancho / 2) * -0.022;
    /* El canal: una vaguada angosta pegada al muro bajo. */
    const d = Math.abs(x - canalX);
    const canal = d < 0.28 ? -0.09 * Math.cos((d / 0.28) * Math.PI * 0.5) : 0;
    pos.setY(i, caida + canal);
  }
  g.computeVertexNormals();
  pintar(g, COLORES.piso, 0.06, rng(7));
  return g;
}

/* ------------------------------------------------------------------ */
/* LA CAMA — el colchón que decide todo.                               */
/* ------------------------------------------------------------------ */

/*
 * Dos geometrías, la MISMA huella: la cama vencida (delgada, apelmazada,
 * brillante de humedad) y la cama profunda (gruesa, mullida, con relieve de
 * material suelto). La escena las cruza con el deslizador. Que sean el mismo
 * pedazo de piso es todo el argumento del antes/después: no es otra finca ni
 * otro dueño con más plata — es la misma cochera el mes entrante.
 *
 * "Mientras esté seca y suelta, controla el olor; en cuanto se compacta y moja,
 *  hay que voltearla o renovarla."
 *
 * El espesor lo dice el maestro sin números: "una capa de varios centímetros y
 * seguir agregando (...) hasta lograr un colchón grueso". Así que la vencida es
 * una lámina pegada al piso y la buena es un colchón que se nota al pisarlo.
 */
function camaBase(espesor, rugosidad, semilla) {
  const { ancho, fondo } = COCHERA;
  const g = new THREE.PlaneGeometry(ancho - 0.5, fondo - 0.4, 30, 20);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  const r = rng(semilla);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    /* Relieve de material suelto: ondas cruzadas + grano. La cama buena tiene
       textura porque está SUELTA; la vencida es un piso pegado. */
    const onda = Math.sin(x * 1.7 + z * 0.9) * 0.5 + Math.sin(z * 2.3 - x * 1.1) * 0.5;
    /* Hundido donde pisan y se echan (el centro-derecha, junto al comedero). */
    const huella = Math.exp(-((x - 1.1) ** 2 + (z - 0.2) ** 2) * 0.35) * 0.45;
    pos.setY(i, espesor * (1 - huella) + onda * rugosidad + (r() - 0.5) * rugosidad * 0.8);
  }
  g.computeVertexNormals();
  return g;
}

/** La cama vencida: lámina apelmazada, oscura, mojada. */
export function geomCamaSucia() {
  const g = camaBase(0.045, 0.012, 21);
  pintar(g, COLORES.camaSucia, 0.5, rng(22));
  return g;
}

/** La cama profunda: colchón grueso, suelto, claro. */
export function geomCamaBuena() {
  const g = camaBase(0.28, 0.055, 21);
  pintar(g, COLORES.camaSeca, 0.85, rng(23));
  return g;
}

/* ------------------------------------------------------------------ */
/* LA ESTRUCTURA — media agua con caballete abierto.                   */
/* ------------------------------------------------------------------ */

/*
 * "Un techo a un agua con caballete abierto o rejilla arriba deja salir el aire
 *  caliente cargado de amoníaco (...) mientras entra aire fresco por los lados."
 *
 * La estructura ES el diagnóstico. El muro bajo y el caballete abierto no son
 * estilo de finca: son la ventilación cruzada dibujada. Y el caballete tiene un
 * doble filo que la escena aprovecha: por esa misma boca por donde entra el
 * remedio (el aire), se fuga el oro. Cuando el manejo es malo, el caballete es
 * la herida por donde la finca se desangra en dorado.
 */
export function geomEstructura() {
  const { ancho, fondo, muro, aleroBajo, aleroAlto } = COCHERA;
  const p = [];
  const hx = ancho / 2;
  const hz = fondo / 2;

  /* Muros bajos: tres lados. El frente queda abierto (por ahí miramos). */
  p.push(caja(0.12, muro, fondo, COLORES.muro, [-hx, muro / 2, 0], null, 0.12, rng(31)));
  p.push(caja(0.12, muro, fondo, COLORES.muro, [hx, muro / 2, 0], null, 0.12, rng(32)));
  p.push(caja(ancho, muro, 0.12, COLORES.muro, [0, muro / 2, -hz], null, 0.12, rng(33)));

  /* Postes: hasta el techo, en las cuatro esquinas y dos intermedios. */
  const postes = [
    [-hx, -hz, aleroBajo],
    [-hx, hz, aleroBajo],
    [hx, -hz, aleroAlto],
    [hx, hz, aleroAlto],
    [0, -hz, (aleroBajo + aleroAlto) / 2],
    [0, hz, (aleroBajo + aleroAlto) / 2],
  ];
  postes.forEach(([x, z, h], i) => {
    p.push(caja(0.14, h, 0.14, COLORES.poste, [x, h / 2, z], null, 0.18, rng(40 + i)));
  });

  /* Vigas del alero. */
  p.push(caja(ancho + 0.3, 0.1, 0.12, COLORES.madera, [0, aleroBajo, -hz], null, 0.1, rng(50)));
  p.push(caja(0.12, 0.1, fondo, COLORES.madera, [-hx, aleroBajo, 0], null, 0.1, rng(51)));
  p.push(caja(0.12, 0.1, fondo, COLORES.madera, [hx, aleroAlto, 0], null, 0.1, rng(52)));

  /*
   * El techo: dos faldones a un agua que NO se tocan arriba. Ese espacio entre
   * ellos es el caballete abierto — la boca por donde respira la cochera. Está
   * dibujado como un hueco, no como una pieza: lo importante es el vacío.
   */
  const inclina = Math.atan2(aleroAlto - aleroBajo, ancho);
  const largo = Math.hypot(ancho, aleroAlto - aleroBajo);
  const faldon = new THREE.BoxGeometry(largo * 0.52, 0.05, fondo + 0.5);
  pintar(faldon, COLORES.techoSol, 0.08, rng(60));
  faldon.rotateZ(inclina);
  faldon.translate(-ancho * 0.26, (aleroBajo + aleroAlto) / 2 - 0.16, 0);
  p.push(faldon);

  const faldon2 = new THREE.BoxGeometry(largo * 0.42, 0.05, fondo + 0.5);
  pintar(faldon2, COLORES.techo, 0.08, rng(61));
  faldon2.rotateZ(inclina);
  faldon2.translate(ancho * 0.29, (aleroBajo + aleroAlto) / 2 + 0.28, 0);
  p.push(faldon2);

  return fusionar(p);
}

/* ------------------------------------------------------------------ */
/* EL BEBEDERO — el foco localizado.                                   */
/* ------------------------------------------------------------------ */

/*
 * "Esa zona mojada alrededor del bebedero se vuelve un foco de fermentación
 *  anaeróbica y amoníaco, además de criadero de moscas, AUNQUE EL RESTO DE LA
 *  CAMA ESTÉ SECA."
 *
 * Por eso el bebedero está aquí y por eso el charco y las moscas nacen justo en
 * este punto y no repartidos parejo. El olor tiene domicilio.
 */
export const BEBEDERO = { x: -1.5, z: 1.15, r: 0.34 };

export function geomBebedero() {
  const p = [];
  const t = new THREE.CylinderGeometry(BEBEDERO.r, BEBEDERO.r * 0.86, 0.24, 12);
  pintar(t, COLORES.techo, 0.1, rng(70));
  t.translate(BEBEDERO.x, 0.12, BEBEDERO.z);
  p.push(t);
  /* El agua adentro, rebosada (por eso hay charco). */
  const a = new THREE.CylinderGeometry(BEBEDERO.r * 0.9, BEBEDERO.r * 0.9, 0.02, 12);
  pintar(a, AGUAS.viva, 0);
  a.translate(BEBEDERO.x, 0.235, BEBEDERO.z);
  p.push(a);
  return fusionar(p);
}

/** El charco: la mancha que rebosa del bebedero. Aparece con la humedad. */
export function geomCharco() {
  const g = new THREE.CircleGeometry(1.15, 22);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  const r = rng(75);
  /* Borde irregular: el agua no hace círculos. */
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const d = Math.hypot(x, z);
    if (d > 0.01) {
      const f = 1 + Math.sin(Math.atan2(z, x) * 3.7) * 0.16 + (r() - 0.5) * 0.1;
      pos.setX(i, x * f);
      pos.setZ(i, z * f);
    }
  }
  pintar(g, COLORES.charco, 0);
  g.translate(BEBEDERO.x, 0.012, BEBEDERO.z);
  return g;
}

/* ------------------------------------------------------------------ */
/* LA FOSA — el hueco donde se sienta el que calla.                    */
/* ------------------------------------------------------------------ */

/*
 * "Es más pesado que el aire, así que se acumula en pozos, fosas y espacios
 *  bajos cerrados."
 *
 * La fosa está AFUERA de la cochera, en el punto más bajo, donde el canal
 * entrega. Es un hueco en la tierra con un brocal de piedra. Nada más. Su
 * quietud es el punto: mientras el amoníaco monta un espectáculo dorado adentro,
 * acá afuera no pasa nada visible — y esto es lo que mata.
 */
export function geomFosa() {
  const p = [];
  const { fosaX } = COCHERA;
  const z = 1.2;
  /* Brocal: cuatro piedras largas alrededor del hueco. */
  const b = [
    [0.98, 0.16, 0.12, 0, 0.9],
    [0.98, 0.16, 0.12, 0, -0.9],
    [0.12, 0.16, 1.8, 0.55, 0],
    [0.12, 0.16, 1.8, -0.55, 0],
  ];
  b.forEach(([w, h, d, dx, dz], i) => {
    p.push(caja(w, h, d, TIERRAS.piedra, [fosaX + dx, 0.02, z + dz], null, 0.14, rng(80 + i)));
  });
  /* Las paredes del hueco: un cajón hundido, oscuro. */
  const hueco = new THREE.BoxGeometry(1.05, 0.9, 1.85);
  pintar(hueco, mezclar(TIERRAS.piedra, NEUTROS.tinta, 0.55), 0.2, rng(85));
  hueco.translate(fosaX, -0.45, z);
  p.push(hueco);
  return fusionar(p);
}

/** La superficie del líquido en la fosa: quieta, opaca, sin reflejo. */
export function geomFosaLiquido() {
  const g = new THREE.PlaneGeometry(0.95, 1.72);
  g.rotateX(-Math.PI / 2);
  pintar(g, COLORES.lodo, 0);
  g.translate(COCHERA.fosaX, -0.16, 1.2);
  return g;
}

/* ------------------------------------------------------------------ */
/* LA CERCA Y EL VECINO — el conflicto tiene dirección.                */
/* ------------------------------------------------------------------ */

/*
 * "El olor no es solo un capricho del vecino, es una señal de que algo en el
 *  manejo se puede mejorar. (...) Muchas veces el conflicto crece más por
 *  sentirse ignorado que por el olor mismo."
 *
 * La casa del vecino está ahí, cerca, con su ventana. No es paisaje de relleno:
 * es la razón por la que esto no es un asunto privado. El aire no respeta el
 * lindero — pero la cerca sí lo dibuja, y por eso hay que verla.
 */
export function geomCerca() {
  const p = [];
  const z = COCHERA.cercaZ;
  for (let i = 0; i < 11; i++) {
    const x = -5.5 + i * 1.1;
    const h = 1.25 + ((i * 7) % 3) * 0.04;
    p.push(caja(0.09, h, 0.09, COLORES.poste, [x, h / 2, z], null, 0.2, rng(90 + i)));
  }
  /* Tres alambres. Delgados, como debe ser: la cerca es una idea, no un muro. */
  for (let a = 0; a < 3; a++) {
    const y = 0.42 + a * 0.36;
    p.push(caja(12.1, 0.018, 0.018, NEUTROS.lamina, [-0.5, y, z], null, 0, null));
  }
  return fusionar(p);
}

/** La casa del otro lado. Con su ventana. Hay gente ahí. */
export function geomCasaVecino() {
  const p = [];
  const x = 1.6;
  const z = 9.4;
  p.push(caja(4.4, 2.5, 3.4, COLORES.casaVecino, [x, 1.25, z], null, 0.08, rng(100)));
  /* Techo a dos aguas, simple. */
  const t1 = new THREE.BoxGeometry(2.6, 0.08, 3.7);
  pintar(t1, COLORES.tejaVecino, 0.1, rng(101));
  t1.rotateZ(0.42);
  t1.translate(x - 1.1, 2.9, z);
  p.push(t1);
  const t2 = new THREE.BoxGeometry(2.6, 0.08, 3.7);
  pintar(t2, COLORES.tejaVecino, 0.1, rng(102));
  t2.rotateZ(-0.42);
  t2.translate(x + 1.1, 2.9, z);
  p.push(t2);
  /* La ventana: el detalle que la vuelve una casa habitada y no un cubo. */
  p.push(caja(0.8, 0.7, 0.06, mezclar(NEUTROS.tinta, ACENTOS.ambar, 0.25), [x - 0.9, 1.5, z - 1.72], null, 0, null));
  p.push(caja(0.7, 1.55, 0.06, mezclar(COLORES.madera, NEUTROS.tinta, 0.3), [x + 1.2, 0.78, z - 1.72], null, 0, null));
  return fusionar(p);
}

/* ------------------------------------------------------------------ */
/* EL BULTO — el remedio, arrimado contra el poste.                    */
/* ------------------------------------------------------------------ */

/*
 * "Es cualquier material seco rico en carbono: aserrín, viruta, cascarilla de
 *  arroz, cascarilla o cisco de café, tamo de trigo o cebada, hoja seca."
 *
 * El bulto de cascarilla está apoyado ahí desde el principio, en la esquina,
 * antes de que uno mueva nada. Eso es a propósito y es lo menos sermoneador que
 * encontré: la solución no es un producto que hay que ir a comprar al pueblo ni
 * un tanque de veinte millones — es el subproducto que ya está tirado en el
 * patio. El campesino no tiene la culpa de que su cochera huela: nadie le dijo
 * para qué servía ese bulto. La escena no se lo dice tampoco. Se lo muestra.
 */
export function geomBulto() {
  const p = [];
  const x = 3.4;
  const z = -1.5;
  /* El costal: un cilindro gordo, un poco vencido, con la boca abierta. */
  const s = new THREE.CylinderGeometry(0.3, 0.34, 0.72, 10, 2);
  pintar(s, mezclar(TIERRAS.vega, CORTEZAS.aliso, 0.4), 0.16, rng(110));
  s.rotateZ(0.13);
  s.translate(x, 0.36, z);
  p.push(s);
  /* La cascarilla asomando por la boca: el remedio, visible. */
  const c = new THREE.SphereGeometry(0.26, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
  pintar(c, COLORES.camaSecaClara, 0.5, rng(111));
  c.translate(x + 0.09, 0.7, z);
  p.push(c);
  /* Un puñado derramado al pie: alguien ya echó una palada alguna vez. */
  const d = new THREE.CircleGeometry(0.4, 12);
  d.rotateX(-Math.PI / 2);
  pintar(d, COLORES.camaSeca, 0.3, rng(112));
  d.translate(x - 0.35, 0.012, z + 0.3);
  p.push(d);
  return fusionar(p);
}

/** La pala, recostada en el poste. El gesto es de mano, no de máquina. */
export function geomPala() {
  const p = [];
  const x = 2.75;
  const z = -1.75;
  const cabo = new THREE.CylinderGeometry(0.028, 0.028, 1.35, 6);
  pintar(cabo, COLORES.madera, 0.12, rng(115));
  cabo.rotateZ(0.22);
  cabo.translate(x, 0.72, z);
  p.push(cabo);
  const hoja = new THREE.BoxGeometry(0.22, 0.3, 0.02);
  pintar(hoja, NEUTROS.lamina, 0.1, rng(116));
  hoja.rotateZ(0.22);
  hoja.translate(x - 0.17, 0.14, z);
  p.push(hoja);
  return fusionar(p);
}

/* ------------------------------------------------------------------ */
/* LOS CUERPOS — siluetas planas a escala real.                        */
/* ------------------------------------------------------------------ */

/*
 * Acá está el argumento de la pieza, y es de tamaños.
 *
 * La gallina tiene la cabeza a 0.26 m. El cerdo, el hocico a 0.38 m. El dueño,
 * la nariz a 1.58 m. Los tres en el mismo cuarto, respirando aires distintos:
 *
 *   "Significa que sus gallinas llevan horas respirando ese mismo amoníaco
 *    antes de que usted entrara (...) están ahí todo el día con la cabeza cerca
 *    del piso."
 *
 * No hay flecha, ni cota, ni cartel. Están parados a su altura de verdad y el
 * velo tiene un borde: se ve solo quién está adentro y quién está afuera.
 */

/** Silueta de gallina, de perfil. Alto real ≈ 0.34 m con cresta. */
function shapeGallina() {
  const s = new THREE.Shape();
  s.moveTo(-0.16, 0.0); // cola, abajo
  s.bezierCurveTo(-0.22, 0.1, -0.2, 0.2, -0.13, 0.22); // cola alzada
  s.bezierCurveTo(-0.18, 0.26, -0.14, 0.3, -0.08, 0.26); // punta de la cola
  s.bezierCurveTo(-0.02, 0.28, 0.04, 0.27, 0.07, 0.23); // lomo
  s.bezierCurveTo(0.11, 0.28, 0.13, 0.3, 0.115, 0.315); // cuello subiendo
  s.lineTo(0.1, 0.325);
  s.bezierCurveTo(0.13, 0.35, 0.15, 0.33, 0.145, 0.305); // cresta
  s.bezierCurveTo(0.175, 0.3, 0.185, 0.285, 0.17, 0.27); // cabeza
  s.lineTo(0.21, 0.25); // el pico: mirando al piso, picoteando
  s.lineTo(0.165, 0.245);
  s.bezierCurveTo(0.15, 0.22, 0.14, 0.19, 0.115, 0.16); // papada y pecho
  s.bezierCurveTo(0.14, 0.1, 0.1, 0.04, 0.04, 0.03); // pecho hasta el piso
  s.lineTo(0.03, 0.0); // pata delantera
  s.lineTo(0.015, 0.0);
  s.lineTo(0.02, 0.055);
  s.bezierCurveTo(-0.04, 0.04, -0.1, 0.03, -0.14, 0.055); // panza
  s.lineTo(-0.145, 0.0); // pata trasera
  s.lineTo(-0.16, 0.0);
  return s;
}

/** Silueta de cerdo echado, de perfil. Alto real ≈ 0.52 m. */
function shapeCerdo() {
  const s = new THREE.Shape();
  s.moveTo(-0.52, 0.0);
  s.bezierCurveTo(-0.58, 0.12, -0.55, 0.24, -0.46, 0.3); // anca
  s.bezierCurveTo(-0.3, 0.44, -0.05, 0.5, 0.16, 0.46); // lomo
  s.bezierCurveTo(0.2, 0.52, 0.26, 0.53, 0.29, 0.47); // oreja
  s.bezierCurveTo(0.36, 0.46, 0.42, 0.42, 0.46, 0.36); // frente
  s.bezierCurveTo(0.54, 0.33, 0.58, 0.3, 0.575, 0.26); // hocico
  s.bezierCurveTo(0.6, 0.24, 0.59, 0.2, 0.55, 0.19); // trompa: al ras de la cama
  s.bezierCurveTo(0.5, 0.14, 0.44, 0.1, 0.36, 0.09); // quijada
  s.lineTo(0.34, 0.0); // mano
  s.lineTo(0.26, 0.0);
  s.lineTo(0.27, 0.1);
  s.bezierCurveTo(0.1, 0.06, -0.1, 0.05, -0.28, 0.08); // panza contra la cama
  s.lineTo(-0.3, 0.0); // pata
  s.lineTo(-0.38, 0.0);
  s.lineTo(-0.37, 0.09);
  s.bezierCurveTo(-0.45, 0.08, -0.5, 0.05, -0.52, 0.0);
  return s;
}

/** Silueta de persona de pie, de perfil. Alto real ≈ 1.7 m. */
function shapePersona() {
  const s = new THREE.Shape();
  s.moveTo(-0.09, 0.0); // talón
  s.lineTo(0.11, 0.0); // pie
  s.lineTo(0.06, 0.06);
  s.bezierCurveTo(0.05, 0.4, 0.04, 0.6, 0.06, 0.86); // pierna delantera
  s.bezierCurveTo(0.12, 0.9, 0.14, 1.0, 0.13, 1.12); // cadera y torso
  s.bezierCurveTo(0.13, 1.2, 0.11, 1.3, 0.1, 1.38); // pecho
  s.bezierCurveTo(0.14, 1.4, 0.16, 1.44, 0.15, 1.48); // hombro
  s.bezierCurveTo(0.16, 1.53, 0.14, 1.56, 0.12, 1.57); // cuello
  s.bezierCurveTo(0.16, 1.6, 0.17, 1.68, 0.12, 1.72); // cara
  s.bezierCurveTo(0.06, 1.76, -0.02, 1.73, -0.03, 1.66); // nuca
  s.bezierCurveTo(-0.06, 1.62, -0.05, 1.57, -0.02, 1.55); // nuca al hombro
  s.bezierCurveTo(-0.08, 1.5, -0.1, 1.42, -0.1, 1.3); // espalda
  s.bezierCurveTo(-0.11, 1.15, -0.09, 1.0, -0.07, 0.88); // espalda baja
  s.bezierCurveTo(-0.11, 0.6, -0.12, 0.3, -0.09, 0.0); // pierna trasera
  return s;
}

/**
 * Los cuerpos, como siluetas planas encaradas al frente (billboard fijo: la
 * cámara de esta escena no da vueltas, así que no hace falta pagar el `lookAt`
 * por frame). Devuelve UNA geometría fusionada, en su posición y a su escala.
 */
export function geomCuerpos() {
  const p = [];

  const poner = (shape, [x, y, z], esc, voltear) => {
    const g = new THREE.ShapeGeometry(shape, 8);
    pintar(g, COLORES.cuerpo, 0);
    g.scale(voltear ? -esc : esc, esc, 1);
    g.translate(x, y, z);
    return g;
  };

  /* Dos gallinas picoteando la cama. La cabeza les queda DENTRO del velo. */
  p.push(poner(shapeGallina(), [0.55, 0.0, 1.5], 1.0, false));
  p.push(poner(shapeGallina(), [-0.35, 0.0, 0.55], 0.94, true));

  /* El cerdo echado: la trompa al ras del material. Es el que peor la lleva. */
  p.push(poner(shapeCerdo(), [1.55, 0.0, -0.35], 1.0, true));

  /*
   * El dueño, de pie en la boca de la cochera. Su nariz a 1.58 m: por encima
   * del velo. Le arde igual — y por eso cree que "no es para tanto". Está
   * mirando hacia adentro. No hace nada. Todavía.
   */
  p.push(poner(shapePersona(), [-2.15, 0.0, 2.5], 1.0, true));

  return fusionar(p);
}

/* ------------------------------------------------------------------ */
/* EL SUELO DE AFUERA — el patio donde todo esto pasa.                 */
/* ------------------------------------------------------------------ */

export function geomPatio() {
  const g = new THREE.PlaneGeometry(30, 30, 24, 24);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  const r = rng(120);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    /* Lomas suaves lejos de la cochera; plano donde está la obra. */
    const lejos = Math.min(1, Math.max(0, (Math.hypot(x, z) - 6) / 8));
    pos.setY(i, (Math.sin(x * 0.3) * 0.18 + Math.sin(z * 0.24) * 0.14 + (r() - 0.5) * 0.05) * lejos - 0.02);
  }
  g.computeVertexNormals();
  pintar(g, mezclar(TIERRAS.camino, TIERRAS.pajonal, 0.45), 0.18, rng(121));
  return g;
}
