/*
 * nacederoParamo.geom — EL NACEDERO: el páramo dibujado como lo que es, una
 * FÁBRICA DE AGUA.
 *
 * La idea del cuadro
 * ──────────────────
 * No es una ladera con frailejones encima. Es el sitio EXACTO donde nace el
 * agua: un ANFITEATRO que la quebrada le ha ido comiendo a la turbera. La
 * cabecera de un nacedero de páramo es una herradura de paredes negras abierta
 * hacia el valle, y uno se para adentro. Eso da, en un solo cuadro, las dos
 * miradas que a esta casa le funcionan:
 *
 *   · HUMBOLDT — la pared del anfiteatro ES la lámina científica. El agua
 *     cortó el suelo y dejó el perfil a la vista: el colchón vivo de raíces
 *     arriba, la TURBA NEGRA (dos metros de esponja), la turba parda, LA LÍNEA
 *     DE AGUA donde la turba se topa con la ceniza volcánica que no deja
 *     pasar, y abajo la ceniza ocre y el saprolito. No hay que inventarse una
 *     vista de rayos X: el paisaje ya está cortado.
 *   · JACKSON — uno está ADENTRO. Las dos alas de la pared se abren a lado y
 *     lado, la testera cierra el fondo, la cornisa de turba vuela sobre el
 *     vacío con las raíces colgando, los frailejones se asoman al filo contra
 *     el cielo y detrás se apilan las cordilleras. Y por la portilla, adelante,
 *     el mundo se acaba: la meseta se despeña y el agua se va hecha hilo a la
 *     niebla, que es donde están las fincas.
 *
 * Lo que el dibujo tiene que CONTAR (y por eso está dibujado así):
 *   1. la niebla llega y se enreda en el frailejonal del filo;
 *   2. la hoja peluda del frailejón la vuelve gota;
 *   3. la gota entra a la turba, que es una toalla mojada de dos metros;
 *   4. el agua camina por dentro y SALE por la línea de contacto — por eso los
 *      hilos de agua brotan todos a la misma altura de la pared, no de arriba;
 *   5. se junta en la poza, se va por el cauce y se despeña al valle.
 *
 * Aquí viven SOLO los datos y las mallas (cero WebGL, cero React). El campo de
 * alturas se entrega con la forma de `SueloRico` para que el suelo detallado de
 * la casa (`<SueloRico>`) se monte encima sin adaptadores.
 *
 * Reglas de la casa que se respetan: paleta madre (ni un hex suelto sin
 * pariente), `fusionarSeguro` como única fusión (el `mergeGeometries → null`
 * silencioso truena), color horneado en vertexColors → una draw-call por banco.
 */
import * as THREE from 'three';
import { fusionarSeguro, poner, apuntar, pintarPlano, rng } from '../bosque/sombreadoVegetal.js';
import { fbmSuelo } from '../terreno/sueloRico.geom.js';
import {
  VERDES, TIERRAS, CORTEZAS, AGUAS, NIEBLAS, ACENTOS, NEUTROS, EJE_TERMICO,
} from '../paleta/paletaMadre.js';

const ss = (v, a, b) => THREE.MathUtils.smoothstep(v, a, b);
const clamp = THREE.MathUtils.clamp;

/** Fusión de la casa, sin uv (las primitivas las traen y romperían la paridad). */
function fusionar(partes, etiqueta, preservarNormales = false) {
  const limpias = partes.filter(Boolean).map((g) => {
    g.deleteAttribute('uv');
    g.deleteAttribute('uv1');
    g.deleteAttribute('uv2');
    return g;
  });
  return fusionarSeguro(limpias, etiqueta, { preservarNormales });
}

/* ══════════════════════════════════════════════════════════════════════════
   1. LA MEDIDA DEL SITIO
   ══════════════════════════════════════════════════════════════════════════ */

/*
 * Unidad = metro. Las cotas no son gusto: un frailejón adulto de esta casa mide
 * ~2 m, y contra él se calibró todo. La pared deja a la vista unos 6 m de perfil
 * —tres frailejones apilados— en una herradura de 18 m de boca: esa proporción
 * (1 de alto por 3 de ancho) es la que hace que el sitio se sienta anfiteatro y
 * no hueco, sin exagerarle un metro a la turbera.
 */
export const NACEDERO = {
  tam: 78, // lado del terreno (la meseta entera del cuadro)
  seed: 313,
  meseta: 6.7, // cota media de la planicie de páramo
  piso: 0.0, // cota del piso del anfiteatro
  radioFilo: 8.9, // radio medio de la herradura
  ruidoFilo: 1.75, // cuánto se desdibuja el filo (nadie corta con compás)
  anchoTalud: 2.9, // en planta, lo que tarda la pared en llegar a la meseta
  canal: { z0: 5.0, ancho0: 2.6, ancho1: 1.5, z1: 26 }, // la portilla y el cauce
  poza: { x: 0.1, z: -1.4, radio: 5.1, hondo: 1.15 },
  borde: 23, // z donde la meseta se despeña al valle
  respaldo: 9.5, // cuánto sube la loma que cierra por detrás
};

/*
 * LOS HORIZONTES DEL SUELO — la lámina.
 * Profundidades en metros bajo el filo. Es un perfil de turbera de páramo
 * (histosol sobre cenizas volcánicas): materia orgánica negra encima, ceniza
 * ocre debajo. La línea de agua está donde tiene que estar: en el contacto
 * entre la turba que empapa y la ceniza que no deja pasar.
 */
export const HORIZONTES = [
  { hasta: 0.50, col: '#5d7038', nombre: 'colchón vivo' }, // raíz y musgo trenzados
  /* La turba viene en DOS: arriba la fibrosa (se le ven las raíces de las que
     está hecha, más clara) y debajo la sáprica, ya deshecha y casi negra. Son
     dos horizontes de verdad y además parten en dos el único manchón oscuro
     del perfil — que de una sola pieza se leía como un borrón.
     Los valores van SUBIDOS a propósito: la mitad alta del perfil es la zona
     con más carga pedagógica del cuadro y estaba siendo la más oscura — un
     horizonte que no se ve no enseña nada. "Casi negra" es RELATIVO a sus
     vecinos, no negro absoluto. */
  { hasta: 1.70, col: '#8f744a', nombre: 'turba fibrosa' },
  { hasta: 3.00, col: '#5f4a31', nombre: 'turba sáprica' }, // la esponja honda
  { hasta: 4.45, col: '#9d7c50', nombre: 'turba parda' },
  { hasta: 4.98, col: '#31251a', nombre: 'la línea de agua' }, // contacto empapado
  { hasta: 6.90, col: '#cfb078', nombre: 'ceniza volcánica' },
  { hasta: 99, col: '#e0d3ae', nombre: 'saprolito' },
];

/** La cota (bajo el filo) donde el agua sale: el contacto turba/ceniza. */
export const COTA_MANANTIAL = 4.72;

/* La paleta del suelo, en el formato que consume `geomSueloRico`. El truco:
   `roca` NO es roca — es la TURBA EXPUESTA. Como el suelo de la casa pinta de
   `roca` todo lo empinado, el anfiteatro entero se hornea de turba solo. */
export const PALETA_TURBERA = {
  base: '#5c6f43', // colchón de musgo y macolla
  pastoVivo: '#758c4e', // el verde vivo de la macolla al sol
  humedo: '#3f5738', // la vega mojada del fondo del anfiteatro
  seco: '#9d9660', // la paja dorada del filo, batida por el viento (pariente: TIERRAS.pajonal)
  hojarasca: '#7e8150', // en páramo no hay hojarasca: es paja tumbada, verdosa
  tierraSenda: '#9a8560',
  tierraHumeda: '#4e5236',
  roca: '#6b5539', // ← turba expuesta (toda la pendiente fuerte)
  rocaClara: '#8f7a52',
  liquen: VERDES.paramoLiquen,
  raiz: CORTEZAS.raicilla,
  paja: '#a2925a',
  pajaVerde: '#77854c',
  flor: '#e9e4cb',
  florMiel: ACENTOS.frailejonFlor,
};

/* ══════════════════════════════════════════════════════════════════════════
   2. EL CAMPO DE ALTURAS — la meseta comida por el nacedero
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Crea el sitio. Devuelve las FUNCIONES del terreno (con la forma de
 * `SueloRico`, para montarle encima el suelo detallado de la casa) más lo que
 * necesitan la pared y el agua: `mesetaDe`, `distHueco`, `radioFilo`, `enCanal`.
 * @param {Partial<typeof NACEDERO>} [opciones]
 */
export function crearNacedero(opciones = {}) {
  const P = { ...NACEDERO, ...opciones };
  const { seed } = P;

  /* La planicie sin excavar: lomos anchos, microrelieve de macolla, la loma que
     cierra por detrás, los flancos que encajonan el cuadro y —adelante— el filo
     del mundo, donde la meseta se despeña al valle. */
  const mesetaDe = (x, z) => {
    const lom = (fbmSuelo(x * 0.055, z * 0.055, seed, 3) - 0.5) * 2;
    const micro = (fbmSuelo(x * 0.42, z * 0.42, seed + 7, 2) - 0.5) * 2;
    let h = P.meseta + lom * 0.66 + micro * 0.14;
    h += ss(-z, 15, 33) * P.respaldo; // el respaldo del anfiteatro
    h -= ss(z, 2, 22) * 2.7; // la planicie se va tendiendo hacia el valle
    h += ss(Math.abs(x), 18, 32) * 3.6; // los flancos
    h -= ss(z, P.borde, P.borde + 5.5) * 36; // el despeñadero
    return h;
  };

  /* El ancho del cauce: la portilla por donde se escapa el agua, que se va
     angostando aguas abajo (la quebrada se encañona). */
  const anchoCanal = (z) => {
    const t = clamp((z - P.canal.z0) / (P.canal.z1 - P.canal.z0), 0, 1);
    return THREE.MathUtils.lerp(P.canal.ancho0, P.canal.ancho1, t)
      + (fbmSuelo(z * 0.3, 5, seed + 19, 2) - 0.5) * 1.1;
  };

  /** Radio del filo en un punto (con su vaivén: el filo no lo trazó un compás). */
  const radioFilo = (x, z) => {
    const n = fbmSuelo(x * 0.115 + 11, z * 0.115 - 5, seed + 31, 2) - 0.5;
    return P.radioFilo + n * 2 * P.ruidoFilo;
  };

  /** ¿El punto cae en la portilla/cauce? (ahí la herradura está rota). */
  const enCanal = (x, z) => z > 0 && Math.abs(x) < anchoCanal(z);

  /** Distancia al hueco: 0 en el filo, NEGATIVA adentro del anfiteatro. */
  const distHueco = (x, z) => {
    const dBowl = Math.hypot(x, z) - radioFilo(x, z);
    if (z <= 0) return dBowl;
    return Math.min(dBowl, Math.abs(x) - anchoCanal(z));
  };

  /* Ancho del talud en planta (varía: unas alas de la pared son más verticales
     que otras). */
  const anchoTalud = (x, z) => P.anchoTalud * (0.72 + fbmSuelo(x * 0.09, z * 0.09, seed + 43, 2) * 0.7);

  /* El cauce, como polilínea: de la poza a la portilla y de ahí al despeñadero. */
  const CAUCE = [[P.poza.x, P.poza.z], [0.7, 1.5], [-0.2, 8.5], [0.6, 15.5], [0.1, 25.5]];
  const distCauce = (x, z) => {
    let mejor = Infinity;
    for (let i = 0; i < CAUCE.length - 1; i++) {
      const [ax, az] = CAUCE[i];
      const [bx, bz] = CAUCE[i + 1];
      const dx = bx - ax;
      const dz = bz - az;
      const l2 = dx * dx + dz * dz || 1e-9;
      const t = clamp(((x - ax) * dx + (z - az) * dz) / l2, 0, 1);
      const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
      if (d < mejor) mejor = d;
    }
    return mejor;
  };

  /* El piso del anfiteatro: en bajada suave hacia la portilla, con la poza
     honda al pie de la testera y el cauce marcado. */
  const pisoDe = (x, z) => {
    let y = P.piso - Math.max(0, z) * 0.055;
    const dp = Math.hypot(x - P.poza.x, z - P.poza.z);
    const enPoza = 1 - ss(dp, P.poza.radio * 0.25, P.poza.radio);
    y -= enPoza * P.poza.hondo;
    y -= (1 - ss(distCauce(x, z), 0.5, 2.6)) * 0.34;
    // el microrelieve se calma dentro del cuenco (si no, la orilla queda dentada)
    y += (fbmSuelo(x * 0.5 + 3, z * 0.5, seed + 13, 2) - 0.5) * 0.28 * (1 - enPoza * 0.75);
    /* Aguas abajo la quebrada NO es un cañón: apenas sale del anfiteatro se
       va haciendo somera y abierta, como corre el agua sobre el páramo. Si no,
       la portilla se convierte en una hendija de ocho metros que no existe. */
    const fuera = ss(Math.hypot(x, z), P.radioFilo * 0.85, P.radioFilo * 1.7);
    if (fuera > 0 && z > 0) {
      const prof = THREE.MathUtils.lerp(4.2, 0.95, ss(z, 8, 20));
      y = THREE.MathUtils.lerp(y, mesetaDe(x, z) - prof, fuera);
    }
    return y;
  };

  /*
   * LA COTA FINAL. El perfil del tajo es `1 - t¹⁴`: el terreno se queda abajo
   * casi hasta el filo y ahí SUBE de golpe. Eso es lo que hace un barranco de
   * turba de verdad (la esponja se sostiene sola y se desploma en bloque), y
   * además deja el hombro tan corto que no le tapa la cara a la cortina.
   */
  const alturaDe = (x, z) => {
    const m = mesetaDe(x, z);
    const d = distHueco(x, z);
    if (d >= 0) return m;
    const p = pisoDe(x, z);
    if (p >= m) return m; // más allá del despeñadero no se excava nada
    const t = ss(d, -anchoTalud(x, z), 0);
    return m + (p - m) * (1 - Math.pow(t, 14));
  };

  const pendienteDe = (x, z, e = 0.4) => {
    const dx = (alturaDe(x + e, z) - alturaDe(x - e, z)) / (2 * e);
    const dz = (alturaDe(x, z + e) - alturaDe(x, z - e)) / (2 * e);
    return Math.hypot(dx, dz);
  };

  return {
    alturaDe,
    pendienteDe,
    senderoCerca: () => ({ d: Infinity, y: 0 }),
    mesetaDe,
    distHueco,
    radioFilo,
    anchoCanal,
    anchoTalud,
    enCanal,
    pisoDe,
    cauce: CAUCE,
    P,
    opts: {
      tam: P.tam,
      seed,
      amplitud: 13,
      micro: 0.14,
      claro: null,
      falda: null,
      sendero: null,
      paleta: PALETA_TURBERA,
    },
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   3. EL FILO — la polilínea de donde cuelga la pared
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Encuentra el filo por bisección sobre el campo (así la cortina cae EXACTO
 * donde el terreno se rompe: cero costuras). Devuelve tiras: la herradura
 * —partida por la portilla— y las dos orillas del cauce aguas abajo.
 * @returns {{x:number,z:number}[][]}
 */
export function filoDelNacedero(nac, { paso = 0.036, orillas = true } = {}) {
  const tiras = [];
  let actual = [];
  const n = Math.round((Math.PI * 2) / paso);
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const sx = Math.sin(a);
    const sz = Math.cos(a);
    let lo = 4;
    let hi = 20;
    for (let k = 0; k < 15; k++) {
      const mid = (lo + hi) / 2;
      if (mid - nac.radioFilo(sx * mid, sz * mid) < 0) lo = mid;
      else hi = mid;
    }
    const r = (lo + hi) / 2;
    const x = sx * r;
    const z = sz * r;
    if (nac.enCanal(x, z)) {
      if (actual.length > 3) tiras.push(actual);
      actual = [];
      continue;
    }
    actual.push({ x, z });
  }
  if (actual.length > 3) tiras.push(actual);

  /* Las orillas de la quebrada: la pared sigue aguas abajo y se hace más alta
     (el cauce ahonda) hasta perderse en el despeñadero. */
  if (orillas) {
    for (const lado of [-1, 1]) {
      const orilla = [];
      for (let z = nac.P.canal.z0 + 3.5; z < nac.P.borde - 0.6; z += 0.62) {
        // solo desde donde la orilla ya salió de la herradura
        if (Math.hypot(nac.anchoCanal(z) * lado, z) < nac.radioFilo(0, z) - 0.4) continue;
        orilla.push({ x: lado * nac.anchoCanal(z), z });
      }
      if (orilla.length > 3) tiras.push(lado < 0 ? orilla : orilla.reverse());
    }
  }
  return tiras;
}

/* ══════════════════════════════════════════════════════════════════════════
   4. LA CORTINA DE TURBA — la lámina de Humboldt, dibujada
   ══════════════════════════════════════════════════════════════════════════ */

/* Color del perfil a una profundidad dada, con los contactos ondulados (un
   horizonte de suelo no es una regla: sube y baja con la raíz y la piedra). */
function colorHorizonte(prof, s, seed, out) {
  const onda = (fbmSuelo(s * 0.42, prof * 0.9 + 30, seed + 71, 3) - 0.5) * 0.2
    + (fbmSuelo(s * 1.6, prof * 2.2, seed + 83, 2) - 0.5) * 0.08;
  const d = prof + onda;
  let i = 0;
  while (i < HORIZONTES.length - 1 && d > HORIZONTES[i].hasta) i++;
  out.set(HORIZONTES[i].col);
  // difuminado del contacto con el horizonte de arriba (los suelos se mezclan)
  if (i > 0) {
    const borde = HORIZONTES[i - 1].hasta;
    const t = ss(d, borde - 0.13, borde + 0.13);
    if (t < 1) out.lerp(new THREE.Color(HORIZONTES[i - 1].col), 1 - t);
  }
  /* LA RAYA DEL CONTACTO. En la lámina dibujada, lo que hace legible un perfil
     de suelo no es el color: es la línea. Un filete oscuro justo en el contacto
     —y la sombra que el horizonte de arriba le echa al de abajo— y los cinco
     horizontes se leen de un vistazo desde el otro lado del anfiteatro. */
  for (let k = 0; k < HORIZONTES.length - 1; k++) {
    const b = HORIZONTES[k].hasta;
    const dist = Math.abs(d - b);
    if (dist < 0.18) out.multiplyScalar(1 - (1 - dist / 0.18) * (d > b ? 0.42 : 0.2));
  }
  return out;
}

/**
 * LA PARED. Una cortina que cuelga del filo: arriba la cornisa del colchón
 * vivo VOLANDO sobre el vacío (así es como se desploma una turbera), abajo la
 * cara recostada con sus repisas y alcobas de erosión, y en toda la altura el
 * perfil del suelo horneado por profundidad. La base se entierra en el talud.
 *
 * @param {ReturnType<typeof crearNacedero>} nac
 * @param {{x:number,z:number}[][]} tiras — el filo (de `filoDelNacedero`)
 * @param {{q?:number}} [o]
 */
export function geomParedTurba(nac, tiras, { q = 1 } = {}) {
  const { seed } = nac.P;
  const nv = Math.max(9, Math.round(20 * q)); // niveles verticales (el detalle del perfil)
  const partes = [];
  const col = new THREE.Color();
  const fria = new THREE.Color('#5f7570'); // el brillo frío del agua rezumando
  const musgoFilo = new THREE.Color(VERDES.paramoMusgoClaro);

  /* Cuánto se mete la cara de la pared hacia el vacío a cada nivel. Siempre
     POSITIVO: si la cara se fuera hacia adentro del cerro quedaría enterrada. */
  const perfilCara = (v, s) => {
    const cornisa = 0.34 * (1 - ss(v, 0, 0.11)); // el colchón vivo vuela
    const cara = 0.5 * Math.pow(v, 1.06);
    /* El relieve varía sobre todo A LO LARGO del barranco (el eje `s`) y muy
       poco EN VERTICAL. No es capricho: con arruga vertical fuerte, media pared
       queda mirando al piso y se apaga, y esas franjas de sombra tapan los
       horizontes — que son la razón de ser de esta pared. Irregular en planta,
       casi plana de arriba abajo. */
    const repisa = fbmSuelo(s * 0.9, 3.1, seed + 61, 3) * 0.3;
    const alcoba = fbmSuelo(s * 0.2, 7.4, seed + 77, 2) * 0.55;
    const vida = fbmSuelo(s * 0.6, v * 2.2, seed + 91, 2) * 0.12;
    return cornisa + cara + repisa + alcoba + vida;
  };

  for (const tira of tiras) {
    const n = tira.length;
    if (n < 2) continue;
    /* REMATE DE LA TIRA. Donde la pared se acaba (la portilla, el final de una
       orilla) la cortina es una lámina sin espesor: vista de canto se lee como
       una aleta parada en la mitad del anfiteatro. Se resuelve pegándola al
       filo en los últimos puntos — ahí el terreno la entierra y la tira
       desaparece dentro del barranco en vez de quedar flotando. */
    const remate = (i) => ss(Math.min(i, n - 1 - i), 0, 7);
    const pos = new Float32Array(n * nv * 3);
    const colores = new Float32Array(n * nv * 3);
    const idx = [];
    let s = 0; // longitud de arco: la coordenada que recorre la pared

    for (let i = 0; i < n; i++) {
      const p = tira[i];
      if (i > 0) s += Math.hypot(p.x - tira[i - 1].x, p.z - tira[i - 1].z);

      /* Hacia dónde está el vacío: el gradiente del campo de distancia. */
      const e = 0.35;
      let gx = (nac.distHueco(p.x + e, p.z) - nac.distHueco(p.x - e, p.z)) / (2 * e);
      let gz = (nac.distHueco(p.x, p.z + e) - nac.distHueco(p.x, p.z - e)) / (2 * e);
      const gl = Math.hypot(gx, gz) || 1;
      gx = -gx / gl;
      gz = -gz / gl; // apunta al hueco

      const yFilo = nac.mesetaDe(p.x, p.z) + 0.08;
      // La cortina baja HASTA ENTERRARSE: se mide el terreno bajo su base.
      const dBase = perfilCara(1, s);
      const yPie = nac.alturaDe(p.x + gx * dBase, p.z + gz * dBase);
      const H = clamp(yFilo - yPie + 0.6, 3.4, 9.5);

      /* EL SOL, HORNEADO. La regla de la casa es cero rig de luz propio, así
         que la luz que le falta a la lámina se hornea aquí: el sol de LuzMadre
         entra por el hombro izquierdo-delantero (solPos [-15,29,19] → en
         planta, (-0.62, 0.79)) y la cara de la pared mira hacia (gx, gz).
         El dot da cuánto sol recibe ESTE tramo: la testera —la lámina de la
         vista 2— queda de frente y se enciende; las alas, de perfil, se
         quedan en su penumbra. Sin esto los horizontes de arriba (los de más
         carga pedagógica) eran la zona más oscura del cuadro. */
      const luzSol = clamp(gx * -0.62 + gz * 0.79, 0, 1);

      const cierre = remate(i);
      for (let j = 0; j < nv; j++) {
        const v = j / (nv - 1);
        const dentro = perfilCara(v, s) * cierre;
        const x = p.x + gx * dentro;
        const z = p.z + gz * dentro;
        const y = yFilo - v * H;
        const k = (i * nv + j) * 3;
        pos[k] = x;
        pos[k + 1] = y;
        pos[k + 2] = z;

        /* EL PERFIL, horneado. */
        const prof = v * H;
        colorHorizonte(prof, s, seed, col);
        // fibras de raíz atravesando la turba (la esponja está TEJIDA)
        const fibra = fbmSuelo(s * 3.1, prof * 6.5, seed + 97, 2);
        if (prof < 3.1 && fibra > 0.6) col.lerp(new THREE.Color(CORTEZAS.raicilla), (fibra - 0.6) * 1.9);
        // chorreras de percolación: el agua baja y mancha
        const mancha = ss(fbmSuelo(s * 1.1, prof * 0.22 + 9, seed + 101, 3), 0.56, 0.86);
        col.multiplyScalar(1 - mancha * 0.22);
        // LA LÍNEA DE AGUA: empapa una banda entera y la deja con brillo frío
        const mojado = 1 - ss(Math.abs(prof - COTA_MANANTIAL), 0.25, 1.15);
        col.lerp(fria, mojado * 0.42);
        col.multiplyScalar(1 - mojado * 0.16);
        // debajo del manantial la pared sigue húmeda (el agua escurre)
        if (prof > COTA_MANANTIAL) col.multiplyScalar(1 - ss(prof, COTA_MANANTIAL, COTA_MANANTIAL + 0.5) * 0.1);
        // el canto del filo: el musgo vivo se asoma por el borde
        if (v < 0.05) col.lerp(musgoFilo, (1 - v / 0.05) * 0.75);
        // volumen: lo que sobresale recibe luz, la alcoba se hunde en penumbra
        col.multiplyScalar(0.9 + clamp(dentro, 0, 1.3) * 0.3);
        // luz de cielo: la turba se aclara hacia el filo (arriba pega el cielo
        // abierto; al pie del talud la pared se apaga sola)
        col.multiplyScalar(1.46 - ss(v, 0.06, 1) * 0.5);
        // el sol horneado del tramo: más arriba pega más (abajo el talud y los
        // bloques le hacen sombra), y apenas entibia — no lava el perfil
        col.multiplyScalar(1 + luzSol * (0.32 - 0.14 * v));
        // grano fino, para que ningún horizonte quede de plastilina
        col.multiplyScalar(0.94 + fbmSuelo(s * 7.3, prof * 9.1, seed + 113, 2) * 0.12);

        colores[k] = col.r;
        colores[k + 1] = col.g;
        colores[k + 2] = col.b;

        if (i < n - 1 && j < nv - 1) {
          const a = i * nv + j;
          const b = a + nv;
          idx.push(a, a + 1, b + 1, a, b + 1, b);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colores, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    partes.push(geo);
  }
  return fusionar(partes, 'pared-turba', true);
}

/**
 * LAS RAÍCES DE LA CORNISA. El colchón vivo aguanta en voladizo porque está
 * tejido de raíces; cuando el barranco retrocede, quedan colgando al aire. Son
 * la firma de una turbera cortada — y de paso le dan escala a la pared.
 */
export function geomRaicesCornisa(nac, tiras, { q = 1, cada = 5 } = {}) {
  const r = rng(nac.P.seed + 5);
  const partes = [];
  const paso = Math.max(3, Math.round(cada / q));
  for (const tira of tiras) {
    for (let i = 0; i < tira.length; i += paso) {
      const p = tira[i];
      const e = 0.35;
      let gx = (nac.distHueco(p.x + e, p.z) - nac.distHueco(p.x - e, p.z)) / (2 * e);
      let gz = (nac.distHueco(p.x, p.z + e) - nac.distHueco(p.x, p.z - e)) / (2 * e);
      const gl = Math.hypot(gx, gz) || 1;
      gx = -gx / gl;
      gz = -gz / gl;
      const yFilo = nac.mesetaDe(p.x, p.z) + 0.08;
      const cuantas = 2 + Math.floor(r() * 3);
      for (let k = 0; k < cuantas; k++) {
        const dentro = 0.18 + r() * 0.5;
        const largo = 0.4 + r() * 1.25;
        const raiz = new THREE.CylinderGeometry(0.012, 0.045, largo, 4, 1);
        apuntar(
          raiz,
          [p.x + gx * dentro, yFilo - 0.12 - largo * 0.5 - r() * 0.35, p.z + gz * dentro],
          [gx * (0.25 + r() * 0.3), -1, gz * (0.25 + r() * 0.3)],
        );
        const tono = new THREE.Color(CORTEZAS.raicilla).multiplyScalar(0.75 + r() * 0.5);
        partes.push(pintarPlano(raiz, tono));
      }
    }
  }
  return partes.length ? fusionar(partes, 'raices-cornisa') : null;
}

/**
 * LOS BLOQUES CAÍDOS. Una turbera no se erosiona grano a grano: se DESPLOMA en
 * bloques, y el bloque cae con su tapa de musgo puesta. Al pie de la pared
 * quedan esos pedazos de páramo volteados, todavía verdes por encima. Son la
 * prueba de que el barranco está vivo y retrocediendo — y le dan al ojo una
 * pieza de tamaño conocido justo donde la pared se junta con el piso.
 */
export function geomBloquesTurba(nac, tiras, { q = 1, cada = 9 } = {}) {
  const r = rng(nac.P.seed + 29);
  const partes = [];
  const paso = Math.max(5, Math.round(cada / q));
  const turba = new THREE.Color(HORIZONTES[1].col).multiplyScalar(0.8);
  const parda = new THREE.Color(HORIZONTES[2].col).multiplyScalar(0.8);
  const tapa = new THREE.Color(VERDES.paramoMusgo);
  for (const tira of tiras) {
    for (let i = Math.floor(r() * paso); i < tira.length; i += paso) {
      const p = tira[i];
      const e = 0.35;
      let gx = (nac.distHueco(p.x + e, p.z) - nac.distHueco(p.x - e, p.z)) / (2 * e);
      let gz = (nac.distHueco(p.x, p.z + e) - nac.distHueco(p.x, p.z - e)) / (2 * e);
      const gl = Math.hypot(gx, gz) || 1;
      gx = -gx / gl;
      gz = -gz / gl;
      const fuera = nac.P.anchoTalud * (0.9 + r() * 0.7);
      const x = p.x + gx * fuera;
      const z = p.z + gz * fuera;
      const y = nac.alturaDe(x, z);
      const w = 0.3 + r() * 0.4;
      const h = 0.3 + r() * 0.45;
      const giro = [(r() - 0.5) * 0.7, r() * Math.PI, (r() - 0.5) * 0.7];
      const bloque = new THREE.DodecahedronGeometry(w, 0);
      poner(bloque, [x, y + h * 0.45, z], giro, [1, h / w, 0.85 + r() * 0.4]);
      partes.push(pintarPlano(bloque, (r() > 0.5 ? turba : parda).clone().multiplyScalar(0.85 + r() * 0.35)));
      // la tapa de musgo que se vino con él (a veces de canto: cayó volteado)
      const cap = new THREE.CylinderGeometry(w * 0.72, w * 0.82, 0.14, 6, 1);
      poner(cap, [x, y + h * 0.92, z], giro);
      partes.push(pintarPlano(cap, tapa.clone().multiplyScalar(0.8 + r() * 0.4)));
    }
  }
  return partes.length ? fusionar(partes, 'bloques-turba') : null;
}

/* ══════════════════════════════════════════════════════════════════════════
   5. EL AGUA — hilos, poza, quebrada y la caída al valle
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * LOS HILOS DEL MANANTIAL. Brotan TODOS a la misma altura —la línea de contacto
 * entre la turba y la ceniza— porque así es como sale el agua de una turbera:
 * no chorrea de arriba, rezuma del costado. Es el dato que el dibujo enseña sin
 * decir una palabra.
 */
export function geomHilosAgua(nac, tiras, { q = 1, cuantos = 16 } = {}) {
  const r = rng(nac.P.seed + 17);
  const partes = [];
  const espuma = new THREE.Color(AGUAS.espuma);
  const orillaC = new THREE.Color(AGUAS.lagunaOrilla);
  const honda = new THREE.Color(AGUAS.viva).lerp(new THREE.Color(AGUAS.lagunaHonda), 0.5);
  const bruma = new THREE.Color(NIEBLAS.paramo);
  const brote = new THREE.Color('#3d4a42'); // la banda mojada de la que rezuma
  const n = Math.max(5, Math.round(cuantos * q));
  // se concentran en la testera (el lado que mira a la cámara de reposo)
  const candidatos = [];
  for (const tira of tiras) {
    for (let i = 2; i < tira.length - 2; i++) candidatos.push(tira[i]);
  }
  if (!candidatos.length) return null;
  const nivelPoza = nac.alturaDe(nac.P.poza.x, nac.P.poza.z) + 0.78;
  const cc = new THREE.Color();

  /* UNA HEBRA de agua: cinta de TRES vértices por fila — el lomo claro al
     centro, las orillas frías y hundidas — así el hilo tiene VOLUMEN de agua y
     no el blanco parejo de un palito. `desvio` la va abriendo de la vertical
     (el deshilache) y `colorDe` pinta por altura. */
  const hebra = ({ camino, tx, tz, t0, t1, anchoDe, desvio, colorDe }) => {
    const seg = Math.max(3, Math.round((8 * (t1 - t0) + 2) * q));
    const filas = seg + 1;
    const pos = new Float32Array(filas * 9);
    const cols = new Float32Array(filas * 9);
    const idx = [];
    for (let i = 0; i <= seg; i++) {
      const u = i / seg;
      const t = t0 + (t1 - t0) * u;
      const [x, y, z] = camino(t);
      const off = desvio * u;
      const w = anchoDe(t);
      for (let l = 0; l < 3; l++) {
        const k = (i * 3 + l) * 3;
        const sg = l - 1; // orilla, lomo, orilla
        pos[k] = x + tx * (off + sg * w);
        pos[k + 1] = y;
        pos[k + 2] = z + tz * (off + sg * w);
        colorDe(t, l === 1, cc);
        cols[k] = cc.r;
        cols[k + 1] = cc.g;
        cols[k + 2] = cc.b;
      }
      if (i < seg) {
        const a = i * 3;
        idx.push(a, a + 1, a + 4, a, a + 4, a + 3);
        idx.push(a + 1, a + 2, a + 5, a + 1, a + 5, a + 4);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };

  for (let h = 0; h < n; h++) {
    const p = candidatos[Math.floor(r() * candidatos.length)];
    const e = 0.35;
    let gx = (nac.distHueco(p.x + e, p.z) - nac.distHueco(p.x - e, p.z)) / (2 * e);
    let gz = (nac.distHueco(p.x, p.z + e) - nac.distHueco(p.x, p.z - e)) / (2 * e);
    const gl = Math.hypot(gx, gz) || 1;
    gx = -gx / gl;
    gz = -gz / gl;
    const yFilo = nac.mesetaDe(p.x, p.z) + 0.08;
    // TODOS a la misma altura — el contacto turba/ceniza. Es la lección: no tocar.
    const yBrota = yFilo - COTA_MANANTIAL - r() * 0.16;
    const x0 = p.x + gx * (0.75 + r() * 0.35);
    const z0 = p.z + gz * (0.75 + r() * 0.35);
    const yPie = nac.alturaDe(x0 + gx * 0.5, z0 + gz * 0.5);
    const caida = Math.max(0.5, yBrota - yPie);
    const ancho = 0.045 + r() * 0.06;
    // tangente horizontal (perpendicular al gradiente) para darle ancho
    const tx = -gz;
    const tz = gx;
    const fase = h * 1.7 + r() * 2;

    /* El eje del hilo: se descuelga con un vaivén (el agua no cae a plomo por
       una pared con repisas). Encarado al vacío. */
    const camino = (t) => {
      const vaiven = Math.sin(t * 4.2 + fase) * 0.1 * t;
      return [
        x0 + gx * (t * 0.3) + tx * vaiven,
        yBrota - t * caida,
        z0 + gz * (t * 0.3) + tz * vaiven,
      ];
    };

    /* El color del agua: nace OSCURO (rezuma de la banda empapada, no está
       pegado encima), el lomo lleva la luz, las orillas el verde frío, y abajo
       el conjunto se abre y se deshace hacia la bruma del golpe. */
    const colorAgua = (t, centro, out) => {
      if (centro) out.copy(espuma).lerp(orillaC, 0.12 + t * 0.28);
      else out.copy(orillaC).lerp(honda, 0.45 + t * 0.3).multiplyScalar(0.88);
      if (t < 0.14) out.lerp(brote, (1 - t / 0.14) * 0.8);
      out.lerp(bruma, ss(t, 0.72, 1) * 0.4);
    };

    // el cuerpo: angosto al brotar, ancho al llegar (el agua se abre al caer)
    partes.push(hebra({
      camino,
      tx,
      tz,
      t0: 0,
      t1: 1,
      anchoDe: (t) => ancho * (0.65 + t * 2.5) * (1 - ss(t, 0.62, 1) * 0.3),
      desvio: 0,
      colorDe: colorAgua,
    }));
    // el deshilache: hebras que se le abren al hilo madre en la mitad baja
    for (const lado of [-1, 1]) {
      if (r() < 0.25) continue;
      const tD = 0.42 + r() * 0.2;
      partes.push(hebra({
        camino,
        tx,
        tz,
        t0: tD,
        t1: 0.97 + r() * 0.03,
        anchoDe: (t) => ancho * (0.5 + (t - tD) * 1.1),
        desvio: lado * (0.1 + r() * 0.17),
        colorDe: colorAgua,
      }));
    }

    /* EL GOLPE. Agua que cae y no hace nada no parece agua: charco oscuro
       donde pega, abanico de espuma encima, corona de gotas rebotando y un
       par de chispas a media caída. */
    const xI = x0 + gx * 0.3;
    const zI = z0 + gz * 0.3;
    const yI = nac.alturaDe(xI, zI);
    if (q > 0.5) {
      const charco = new THREE.CircleGeometry(0.34 + r() * 0.22, 9);
      poner(charco, [xI, yI + 0.025, zI], [-Math.PI / 2, 0, r() * 3], [1.25, 1, 1]);
      partes.push(pintarPlano(charco, honda.clone().lerp(orillaC, 0.35)));
      const salpica = new THREE.CircleGeometry(0.17 + r() * 0.1, 8);
      poner(salpica, [xI - gx * 0.06, yI + 0.045, zI - gz * 0.06], [-Math.PI / 2, 0, r() * 3]);
      partes.push(pintarPlano(salpica, espuma));
      const cuantasG = 3 + Math.floor(r() * 3);
      for (let g = 0; g < cuantasG; g++) {
        const gota = new THREE.IcosahedronGeometry(0.028 + r() * 0.022, 0);
        const ag = r() * Math.PI * 2;
        poner(gota, [
          xI + Math.cos(ag) * (0.12 + r() * 0.3),
          yI + 0.08 + r() * 0.34,
          zI + Math.sin(ag) * (0.12 + r() * 0.3),
        ]);
        partes.push(pintarPlano(gota, espuma));
      }
      for (let g = 0; g < 2; g++) {
        const chispa = new THREE.IcosahedronGeometry(0.02 + r() * 0.015, 0);
        const [cx, cy, cz] = camino(0.35 + r() * 0.5);
        poner(chispa, [cx + tx * (r() - 0.5) * 0.3, cy, cz + tz * (r() - 0.5) * 0.3]);
        partes.push(pintarPlano(chispa, espuma));
      }
    }

    /* EL REGATO: los hilos no mueren donde caen — se juntan. Una veta clara
       que serpentea del golpe hacia la poza y se hunde al entrar al agua.
       Solo dentro del anfiteatro (aguas abajo el hilo cae directo al cauce). */
    const dPoza = Math.hypot(xI - nac.P.poza.x, zI - nac.P.poza.z);
    if (dPoza > 1.2 && dPoza < 10) {
      const dxP = (nac.P.poza.x - xI) / dPoza;
      const dzP = (nac.P.poza.z - zI) / dPoza;
      const txR = -dzP;
      const tzR = dxP;
      const pasosR = 9;
      const pts = [];
      for (let i = 0; i <= pasosR; i++) {
        const t = i / pasosR;
        const wig = Math.sin(t * 5 + fase) * 0.22 * Math.sin(t * Math.PI);
        const x = xI + dxP * dPoza * t + txR * wig;
        const z = zI + dzP * dPoza * t + tzR * wig;
        const y = nac.alturaDe(x, z);
        pts.push({ x, y, z, t });
        if (t > 0.3 && y < nivelPoza - 0.05) break; // ya entró a la poza
      }
      if (pts.length > 2) {
        const posR = new Float32Array(pts.length * 6);
        const colR = new Float32Array(pts.length * 6);
        const idxR = [];
        for (let i = 0; i < pts.length; i++) {
          const pt = pts[i];
          const w = 0.04 + pt.t * 0.08;
          // arranca ya FRÍO (agua sobre pasto, no pintura blanca) y se hunde
          // hacia el verde hondo según se acerca a la poza
          cc.copy(espuma).lerp(orillaC, 0.55 + pt.t * 0.35).lerp(honda, pt.t * 0.25);
          for (let l = 0; l < 2; l++) {
            const k = (i * 2 + l) * 3;
            const sg = l === 0 ? -1 : 1;
            posR[k] = pt.x + txR * w * sg;
            posR[k + 1] = pt.y + 0.035;
            posR[k + 2] = pt.z + tzR * w * sg;
            colR[k] = cc.r;
            colR[k + 1] = cc.g;
            colR[k + 2] = cc.b;
          }
          if (i < pts.length - 1) {
            const a = i * 2;
            idxR.push(a, a + 1, a + 3, a, a + 3, a + 2);
          }
        }
        const regato = new THREE.BufferGeometry();
        regato.setAttribute('position', new THREE.BufferAttribute(posR, 3));
        regato.setAttribute('color', new THREE.BufferAttribute(colR, 3));
        regato.setIndex(idxR);
        regato.computeVertexNormals();
        partes.push(regato);
      }
    }
  }
  return partes.length ? fusionar(partes, 'hilos-agua', true) : null;
}

/**
 * LA POZA. El agua de todos los hilos se junta al pie de la testera. El borde
 * no se dibuja de memoria: cada rayo se estira hasta que el terreno alcanza el
 * nivel, así la orilla calza con la playa de verdad. Nada de disco espejo.
 */
export function geomPoza(nac, { lados = 30 } = {}) {
  const { poza } = nac.P;
  const nivel = nac.alturaDe(poza.x, poza.z) + 0.78;
  const centro = new THREE.Color(AGUAS.lagunaHonda)
    .lerp(new THREE.Color(AGUAS.viva), 0.3)
    .lerp(new THREE.Color(NEUTROS.tinta), 0.3);
  const orilla = new THREE.Color(AGUAS.lagunaOrilla);
  const brillo = new THREE.Color(AGUAS.espuma);
  /* DOS anillos: el hondo y la orilla. Con un solo abanico el color del centro
     se pierde en un vértice y toda la poza queda del verde pálido del borde —
     un charco de plastilina. Con el anillo intermedio el agua tiene FONDO. */
  const pos = new Float32Array((lados * 2 + 1) * 3);
  const col = new Float32Array((lados * 2 + 1) * 3);
  const idx = [];
  pos[0] = poza.x;
  pos[1] = nivel;
  pos[2] = poza.z;
  col[0] = centro.r;
  col[1] = centro.g;
  col[2] = centro.b;
  const c = new THREE.Color();
  for (let i = 0; i < lados; i++) {
    const a = (i / lados) * Math.PI * 2;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    /* Estirar hasta la orilla de verdad: el rayo avanza hasta que el terreno
       alcanza el nivel. Con tope, porque por la portilla el agua se escapa y el
       rayo se iría hasta el filo del mundo. */
    let rad = 0.6;
    const tope = poza.radio * 1.3;
    let seguidas = 0;
    for (let paso = 0; paso < 70; paso++) {
      const rr = 0.6 + paso * 0.1;
      if (rr > tope) break;
      if (nac.alturaDe(poza.x + dx * rr, poza.z + dz * rr) > nivel - 0.03) {
        // un montículo suelto no es la orilla: la orilla es tierra SEGUIDA
        seguidas++;
        if (seguidas >= 3) break;
      } else {
        seguidas = 0;
        rad = rr;
      }
    }
    // el sol pega del frente-izquierda: ahí el agua se enciende
    const luz = clamp(dx * -0.45 + dz * 0.55, 0, 1);
    // anillo HONDO (60 % del radio): el agua oscura del centro
    const kh = (1 + i) * 3;
    pos[kh] = poza.x + dx * rad * 0.62;
    pos[kh + 1] = nivel;
    pos[kh + 2] = poza.z + dz * rad * 0.62;
    c.copy(centro).lerp(brillo, luz * 0.34);
    col[kh] = c.r;
    col[kh + 1] = c.g;
    col[kh + 2] = c.b;
    // anillo de ORILLA: se aclara donde el fondo sube
    const ko = (1 + lados + i) * 3;
    pos[ko] = poza.x + dx * rad;
    pos[ko + 1] = nivel;
    pos[ko + 2] = poza.z + dz * rad;
    c.copy(centro).lerp(orilla, 0.38).lerp(brillo, luz * 0.22);
    col[ko] = c.r;
    col[ko + 1] = c.g;
    col[ko + 2] = c.b;
    const j = (i + 1) % lados;
    idx.push(0, 1 + i, 1 + j);
    idx.push(1 + i, 1 + lados + i, 1 + lados + j);
    idx.push(1 + i, 1 + lados + j, 1 + j);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/**
 * LA QUEBRADA. Sale de la poza, cruza la portilla y se va al filo del mundo.
 * Es la misma agua que abajo riega las fincas: por eso la cinta se mantiene
 * ancha y visible hasta el borde, y ahí se despeña.
 */
export function geomQuebrada(nac, { q = 1 } = {}) {
  const pasos = Math.max(24, Math.round(64 * q));
  const z0 = nac.P.poza.z + 1.4;
  const z1 = nac.P.borde - 0.4;
  const viva = new THREE.Color(AGUAS.viva).lerp(new THREE.Color(AGUAS.lagunaHonda), 0.45);
  const espuma = new THREE.Color(AGUAS.espuma);
  const partes = [];
  const pos = new Float32Array((pasos + 1) * 2 * 3);
  const col = new Float32Array((pasos + 1) * 2 * 3);
  const idx = [];
  const c = new THREE.Color();
  const ejeX = (z) => {
    // el cauce serpentea apenas
    let x = 0.2;
    for (let i = 0; i < nac.cauce.length - 1; i++) {
      const [ax, az] = nac.cauce[i];
      const [bx, bz] = nac.cauce[i + 1];
      if (z >= az && z <= bz) {
        const t = (z - az) / (bz - az || 1);
        x = ax + (bx - ax) * t;
      }
    }
    return x;
  };
  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos;
    const z = z0 + (z1 - z0) * t;
    const x = ejeX(z);
    const ancho = 0.95 - t * 0.28 + Math.sin(t * 7) * 0.12;
    const y = nac.alturaDe(x, z) + 0.08;
    // rápidos: donde el cauce cae más, el agua se blanquea
    const caida = clamp((nac.alturaDe(x, z - 0.8) - nac.alturaDe(x, z + 0.8)) * 1.6, 0, 1);
    c.copy(viva).lerp(espuma, clamp(caida * 0.8 + (i % 7 === 0 ? 0.25 : 0), 0, 0.85));
    for (let l = 0; l < 2; l++) {
      const k = (i * 2 + l) * 3;
      const sg = l === 0 ? -1 : 1;
      pos[k] = x + sg * ancho;
      pos[k + 1] = Math.min(y, nac.alturaDe(x + sg * ancho, z) + 0.14);
      pos[k + 2] = z;
      col[k] = c.r;
      col[k + 1] = c.g;
      col[k + 2] = c.b;
    }
    if (i < pasos) {
      const a = i * 2;
      idx.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }
  }
  const cinta = new THREE.BufferGeometry();
  cinta.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  cinta.setAttribute('color', new THREE.BufferAttribute(col, 3));
  cinta.setIndex(idx);
  cinta.computeVertexNormals();
  partes.push(cinta);

  /* LA CAÍDA: en el filo del mundo el agua se suelta y se deshace en la niebla
     del valle. La cinta se va aclarando hasta el color de la bruma: no se corta,
     se DISUELVE (que es lo que uno ve de verdad desde arriba). */
  const xB = ejeX(z1);
  const yB = nac.alturaDe(xB, z1) + 0.08;
  const nivelesC = 10;
  const posC = new Float32Array((nivelesC + 1) * 2 * 3);
  const colC = new Float32Array((nivelesC + 1) * 2 * 3);
  const idxC = [];
  const bruma = new THREE.Color(NIEBLAS.paramo);
  for (let i = 0; i <= nivelesC; i++) {
    const t = i / nivelesC;
    const y = yB - t * 11;
    const z = z1 + t * 2.6;
    const ancho = 0.72 + t * 0.9;
    c.copy(espuma).lerp(bruma, Math.pow(t, 0.75));
    for (let l = 0; l < 2; l++) {
      const k = (i * 2 + l) * 3;
      const sg = l === 0 ? -1 : 1;
      posC[k] = xB + sg * ancho;
      posC[k + 1] = y;
      posC[k + 2] = z;
      colC[k] = c.r;
      colC[k + 1] = c.g;
      colC[k + 2] = c.b;
    }
    if (i < nivelesC) {
      const a = i * 2;
      idxC.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }
  }
  const caida = new THREE.BufferGeometry();
  caida.setAttribute('position', new THREE.BufferAttribute(posC, 3));
  caida.setAttribute('color', new THREE.BufferAttribute(colC, 3));
  caida.setIndex(idxC);
  caida.computeVertexNormals();
  partes.push(caida);

  return fusionar(partes, 'quebrada', true);
}

/* ══════════════════════════════════════════════════════════════════════════
   6. EL FONDO — las cordilleras apiladas (la profundidad de Jackson)
   ══════════════════════════════════════════════════════════════════════════ */

/*
 * Telones de montaña, cada uno más pálido que el de adelante. La perspectiva
 * aérea va HORNEADA (mezcla hacia la bruma), no delegada al fog: así el mundo
 * se lee igual en cualquier tier y las filas no se comen entre ellas.
 * Los del frente (+Z) van MÁS BAJOS que el filo de la meseta: es lo que le dice
 * al ojo que uno está parado en el techo del agua.
 */
export function geomCordilleras({ q = 1 } = {}) {
  const bruma = new THREE.Color(NIEBLAS.paramo);
  const filas = [
    { z: -44, ancho: 150, alto: 22, base: -34, tono: EJE_TERMICO[3].color, velo: 0.42, seed: 3, dientes: 13 },
    { z: -62, ancho: 190, alto: 29, base: -34, tono: EJE_TERMICO[4].color, velo: 0.62, seed: 8, dientes: 10 },
    { z: -84, ancho: 240, alto: 35, base: -34, tono: EJE_TERMICO[5].color, velo: 0.78, seed: 12, dientes: 8 },
    /* Las de ADELANTE, ya del otro lado del abismo: se ven POR DEBAJO. */
    { z: 52, ancho: 200, alto: 26, base: -19, tono: EJE_TERMICO[2].color, velo: 0.5, seed: 21, dientes: 14 },
    { z: 76, ancho: 260, alto: 30, base: -22, tono: EJE_TERMICO[3].color, velo: 0.7, seed: 26, dientes: 11 },
  ];
  const partes = [];
  const c = new THREE.Color();
  for (const f of filas) {
    const n = Math.max(6, Math.round(f.dientes * (0.6 + q * 0.5)));
    const pos = new Float32Array((n + 1) * 2 * 3);
    const col = new Float32Array((n + 1) * 2 * 3);
    const idx = [];
    const r = rng(f.seed);
    const cumbre = new THREE.Color(f.tono);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = -f.ancho / 2 + f.ancho * t;
      // silueta: dos senos desfasados + azar → cresta de cordillera, no sierra
      const s = 0.45 + 0.3 * Math.sin(t * 7.3 + f.seed) + 0.25 * Math.sin(t * 17.1 + f.seed * 2) + (r() - 0.5) * 0.28;
      const y = f.base + f.alto * clamp(s, 0.12, 1.25) * (0.75 + 0.45 * Math.sin(t * Math.PI));
      c.copy(cumbre).lerp(bruma, f.velo);
      for (let l = 0; l < 2; l++) {
        const k = (i * 2 + l) * 3;
        pos[k] = x;
        pos[k + 1] = l === 0 ? y : f.base;
        pos[k + 2] = f.z;
        // la falda se hunde en la bruma del fondo del valle
        const cc = l === 0 ? c : c.clone().lerp(bruma, 0.55);
        col[k] = cc.r;
        col[k + 1] = cc.g;
        col[k + 2] = cc.b;
      }
      if (i < n) {
        const a = i * 2;
        idx.push(a, a + 1, a + 3, a, a + 3, a + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    partes.push(geo);
  }
  return fusionar(partes, 'cordilleras', true);
}

/* ══════════════════════════════════════════════════════════════════════════
   7. EL ROCÍO — la niebla vuelta gota sobre la roseta
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Gotas sobre las hojas peludas de un frailejón. Es el mecanismo entero del
 * páramo en un detalle de tres centímetros: la hoja atrapa la niebla y la
 * suelta al suelo. Se monta sobre las rosetas del primer plano.
 * @param {number} radio — radio de la roseta (en unidades de la mata)
 */
export function geomRocio(radio = 0.42, seed = 60, cuantas = 15) {
  const r = rng(seed);
  const partes = [];
  const agua = new THREE.Color(AGUAS.espuma);
  for (let i = 0; i < cuantas; i++) {
    const a = r() * Math.PI * 2;
    const rad = radio * (0.35 + r() * 0.75);
    const gota = new THREE.SphereGeometry(0.022 + r() * 0.026, 6, 4);
    poner(gota, [Math.cos(a) * rad, -r() * 0.12, Math.sin(a) * rad], [0, 0, 0], [1, 0.8, 1]);
    partes.push(pintarPlano(gota, agua.clone().multiplyScalar(0.9 + r() * 0.2)));
  }
  // la gota gorda que ya va de camino al suelo, colgando del borde
  const colgada = new THREE.SphereGeometry(0.05, 7, 5);
  poner(colgada, [radio * 0.9, -0.16, radio * 0.2], [0, 0, 0], [1, 1.35, 1]);
  partes.push(pintarPlano(colgada, agua));
  return fusionar(partes, 'rocio');
}

/* ══════════════════════════════════════════════════════════════════════════
   8. LA SIEMBRA — el frailejonal con TODAS sus edades
   ══════════════════════════════════════════════════════════════════════════ */

/*
 * Un frailejón sube un centímetro al año: en un frailejonal de verdad conviven
 * la roseta recién nacida a ras de suelo y el tronco de dos metros que lleva un
 * siglo ahí. Por eso la siembra NO es una especie repetida a distintas escalas:
 * son SIETE edades con silueta propia, mezcladas, y cada una con su rango de
 * tamaño. Esa es la diversidad que se pidió.
 */
export const EDADES_FRAILEJON = [
  { id: 'reci', edad: 0.14, flor: false, eMin: 0.55, eMax: 0.85, peso: 1.35 },
  { id: 'joven', edad: 0.28, flor: false, eMin: 0.7, eMax: 1.0, peso: 1.15 },
  { id: 'mozo', edad: 0.44, flor: false, eMin: 0.85, eMax: 1.15, peso: 1.0 },
  { id: 'hecho', edad: 0.6, flor: false, eMin: 0.95, eMax: 1.3, peso: 0.95 },
  { id: 'granado', edad: 0.74, flor: true, eMin: 1.0, eMax: 1.4, peso: 0.7 },
  { id: 'viejo', edad: 0.88, flor: false, eMin: 1.1, eMax: 1.5, peso: 0.6 },
  { id: 'centenario', edad: 0.99, flor: true, eMin: 1.25, eMax: 1.75, peso: 0.5 },
];

/** Cuántas matas por tier (instancias, no draw-calls: cada banco es UNA). */
export const SIEMBRA_TIER = {
  alto: { frailejones: 130, guardianes: 18, colonos: 14, mortino: 26, romerillo: 46, roca: 22, musgo: 34, arbol: 9 },
  medio: { frailejones: 68, guardianes: 11, colonos: 8, mortino: 14, romerillo: 24, roca: 12, musgo: 18, arbol: 5 },
  bajo: { frailejones: 30, guardianes: 6, colonos: 4, mortino: 6, romerillo: 10, roca: 6, musgo: 8, arbol: 3 },
};

function tinte(r, amt) {
  const f = 1 + (r() - 0.5) * amt;
  const h = (r() - 0.5) * amt * 0.4;
  const cl = (v) => clamp(v, 0.72, 1.16);
  return [cl(f + h), cl(f), cl(f - h * 0.6)];
}

/**
 * Reparte el páramo sobre el relieve. Devuelve, por banco, las instancias
 * {pos, rotY, escala, tint, tiltX, tiltZ} que consume el InstancedMesh.
 *
 * Criterio de siembra (no es azar parejo):
 *   · el FRAILEJONAL cubre la planicie y se APRIETA contra el filo, que es
 *     donde la niebla pega y donde el agua está más cerca;
 *   · los GUARDIANES se paran EN el filo y se asoman al vacío — son la silueta
 *     contra el cielo y la vara de medir de la pared;
 *   · los COLONOS son los jóvenes que ya bajaron al talud a colonizar el
 *     derrumbe (el páramo se está curando la herida);
 *   · los ÁRBOLES no suben: se quedan de siluetas allá abajo, en la ceja de
 *     monte, del lado protegido. Por encima de los 3.000 casi ninguno resiste.
 */
export function siembraNacedero(nac, tier = 'alto', filo = null) {
  const cuenta = SIEMBRA_TIER[tier] || SIEMBRA_TIER.medio;
  const r = rng(nac.P.seed + 77);
  const bancos = {};
  for (const e of EDADES_FRAILEJON) bancos[e.id] = [];

  const pesoTotal = EDADES_FRAILEJON.reduce((s, e) => s + e.peso, 0);
  const edadAlAzar = () => {
    let v = r() * pesoTotal;
    for (const e of EDADES_FRAILEJON) {
      v -= e.peso;
      if (v <= 0) return e;
    }
    return EDADES_FRAILEJON[0];
  };

  /* El sitio de la cámara de reposo, con su radio de respeto. */
  const CAMARA = { x: 0.9, z: 12.8, radio: 3.4 };
  const enCorredor = (x, z) => Math.hypot(x - CAMARA.x, z - CAMARA.z) < CAMARA.radio;

  const meter = (e, x, z, opts = {}) => {
    const esc = (opts.eMin ?? e.eMin) + r() * ((opts.eMax ?? e.eMax) - (opts.eMin ?? e.eMin));
    bancos[e.id].push({
      pos: [x, nac.alturaDe(x, z) - 0.04, z],
      rotY: r() * Math.PI * 2,
      escala: esc,
      tint: tinte(r, 0.14),
      tiltX: (r() - 0.5) * 0.3 + (opts.tiltX || 0),
      tiltZ: (r() - 0.5) * 0.3 + (opts.tiltZ || 0),
    });
  };

  /* 1. EL FRAILEJONAL de la planicie: más denso cerca del filo. */
  let puestos = 0;
  let intentos = 0;
  while (puestos < cuenta.frailejones && intentos < cuenta.frailejones * 26) {
    intentos++;
    const a = r() * Math.PI * 2;
    const rad = 9 + Math.pow(r(), 0.62) * 25;
    const x = Math.sin(a) * rad;
    const z = Math.cos(a) * rad;
    if (nac.distHueco(x, z) < 0.9) continue; // no dentro del hueco
    if (z > nac.P.borde - 1.5) continue; // ni colgando del despeñadero
    if (nac.pendienteDe(x, z) > 0.85) continue;
    if (enCorredor(x, z)) continue;
    // densidad: cae con la distancia al filo (la niebla moja el borde)
    const cerca = 1 - ss(nac.distHueco(x, z), 1, 16);
    if (r() > 0.3 + cerca * 0.7) continue;
    meter(edadAlAzar(), x, z);
    puestos++;
  }

  /* 2. LOS GUARDIANES DEL FILO: sobre el borde, asomados al vacío. */
  if (filo && filo.length) {
    const todos = filo.flat();
    for (let i = 0; i < cuenta.guardianes; i++) {
      const p = todos[Math.floor(r() * todos.length)];
      const e = 0.4;
      let gx = (nac.distHueco(p.x + e, p.z) - nac.distHueco(p.x - e, p.z)) / (2 * e);
      let gz = (nac.distHueco(p.x, p.z + e) - nac.distHueco(p.x, p.z - e)) / (2 * e);
      const gl = Math.hypot(gx, gz) || 1;
      gx /= gl;
      gz /= gl; // apunta AFUERA del hueco
      const fuera = 0.55 + r() * 1.5;
      const x = p.x + gx * fuera;
      const z = p.z + gz * fuera;
      if (enCorredor(x, z)) continue;
      const viejo = EDADES_FRAILEJON[r() > 0.45 ? 6 : 5];
      // se asoma: el cabeceo mira al vacío
      meter(viejo, x, z, {
        eMin: 1.25, eMax: 1.9,
        tiltX: -gz * (0.06 + r() * 0.13),
        tiltZ: gx * (0.06 + r() * 0.13),
      });
    }
  }

  /* 3. LOS COLONOS del talud: jóvenes curando el derrumbe. */
  let col = 0;
  let ic = 0;
  while (col < cuenta.colonos && ic < cuenta.colonos * 40) {
    ic++;
    const a = r() * Math.PI * 2;
    const rad = 5.5 + r() * 6;
    const x = Math.sin(a) * rad;
    const z = Math.cos(a) * rad;
    const d = nac.distHueco(x, z);
    if (d > -0.4 || d < -3.6) continue;
    if (nac.pendienteDe(x, z) > 1.5) continue;
    meter(EDADES_FRAILEJON[Math.floor(r() * 3)], x, z, { eMin: 0.5, eMax: 0.9 });
    col++;
  }

  /* 4. EL SOTOBOSQUE bajo y el suelo: mortiño, romerillo, roca y musgo. */
  const disperso = (n, rMin, rMax, opts) => {
    const arr = [];
    let k = 0;
    let it = 0;
    while (k < n && it < n * 30) {
      it++;
      const a = r() * Math.PI * 2;
      const rad = rMin + (rMax - rMin) * Math.sqrt(r());
      const x = Math.sin(a) * rad;
      const z = Math.cos(a) * rad;
      if (opts.dentro) {
        if (nac.distHueco(x, z) > -0.6) continue;
      } else if (nac.distHueco(x, z) < 0.6) continue;
      if (z > nac.P.borde - 1) continue;
      if (enCorredor(x, z)) continue;
      if (nac.pendienteDe(x, z) > (opts.pendMax ?? 0.9)) continue;
      arr.push({
        pos: [x, nac.alturaDe(x, z) - 0.05, z],
        rotY: r() * Math.PI * 2,
        escala: opts.eMin + r() * (opts.eMax - opts.eMin),
        tint: tinte(r, 0.14),
      });
      k++;
    }
    return arr;
  };

  const mortino = disperso(cuenta.mortino, 12, 30, { eMin: 0.75, eMax: 1.25 });
  const romerillo = [
    ...disperso(Math.round(cuenta.romerillo * 0.7), 11, 31, { eMin: 0.75, eMax: 1.35 }),
    ...disperso(Math.round(cuenta.romerillo * 0.3), 3, 10, { eMin: 0.6, eMax: 1.1, dentro: true, pendMax: 1.4 }),
  ];
  const roca = [
    ...disperso(Math.round(cuenta.roca * 0.55), 12, 30, { eMin: 0.7, eMax: 1.7 }),
    ...disperso(Math.round(cuenta.roca * 0.45), 2.5, 10, { eMin: 0.8, eMax: 2.1, dentro: true, pendMax: 1.6 }),
  ];
  const musgo = [
    ...disperso(Math.round(cuenta.musgo * 0.4), 12, 26, { eMin: 0.8, eMax: 1.7 }),
    ...disperso(Math.round(cuenta.musgo * 0.6), 2, 9.5, { eMin: 0.9, eMax: 2.2, dentro: true, pendMax: 1.5 }),
  ];

  /* 5. LA CEJA DE MONTE: los árboles se quedan ABAJO, del lado protegido, y
     solo se leen como siluetas en la niebla. Ni uno sube a la planicie. */
  const arboles = { encenillo: [], aliso: [], gaque: [] };
  const especies = ['encenillo', 'aliso', 'gaque'];
  for (let i = 0; i < cuenta.arbol; i++) {
    const sp = especies[i % 3];
    const a = (i / cuenta.arbol) * 2.1 - 1.05 + (r() - 0.5) * 0.3; // arco del respaldo
    const rad = 30 + r() * 8;
    const x = Math.sin(a + Math.PI) * rad;
    const z = Math.cos(a + Math.PI) * rad;
    arboles[sp].push({
      pos: [x, nac.alturaDe(x, z) - 0.1, z],
      rotY: r() * Math.PI * 2,
      escala: 1.1 + r() * 0.7,
      tint: tinte(r, 0.1),
    });
  }

  return { frailejones: bancos, mortino, romerillo, roca, musgo, arboles };
}

/*
 * EL PRIMER PLANO FIJO. Tres frailejones centenarios plantados a mano en las
 * orillas de la portilla, justo delante de la cámara de reposo: son el marco
 * del cuadro y la escala del anfiteatro. Fijos a propósito — el azar no
 * garantiza que caiga uno donde el cuadro lo necesita.
 */
export const PROSCENIO_NACEDERO = [
  { x: -5.4, z: 13.6, escala: 2.0, rotY: 0.7, tiltX: 0.05, tiltZ: 0.09, rocio: true },
  { x: 6.6, z: 13.2, escala: 2.2, rotY: 2.4, tiltX: 0.04, tiltZ: -0.08, rocio: true },
  { x: 9.2, z: 18.0, escala: 1.75, rotY: 4.1, tiltX: -0.05, tiltZ: 0.05, rocio: false },
  { x: -9.4, z: 18.6, escala: 1.85, rotY: 5.2, tiltX: 0.06, tiltZ: 0.04, rocio: false },
];
