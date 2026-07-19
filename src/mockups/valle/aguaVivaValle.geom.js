/*
 * aguaVivaValle.geom — EL AGUA VIVA DEL VALLE, como geometría pura (cero react).
 *
 * La finca no "tiene" agua: la RECIBE. Nace en la microcuenca del páramo
 * (los frailejones peinan la niebla, la turbera la guarda), baja en un hilo
 * por la ladera hasta la quebrada, y de la quebrada el campesino la REPARTE
 * por gravedad: una toma rústica, una acequia madre, compuertas de tablón
 * donde el agua se decide, y ramales que llegan a las eras, al invernadero,
 * a la huerta y al reservorio. Ni una bomba, ni un aspersor: tablas, piedras
 * y pendiente — el riego campesino andino.
 *
 * Este módulo escribe el TRAZADO (datos puros, [x,z]) y fabrica las mallas:
 *   · cintas de lecho (tierra mojada) y de agua (lámina) posadas SOBRE el
 *     terreno vía `alturaDe` — el mismo contrato de los demás AoE del valle;
 *   · pozas y reservorio (fan de círculo, centro hondo → orilla clara);
 *   · lo estático de la mano campesina: compuertas de tablón, piedras de
 *     toma y juncos de orilla — TODO fusionado en UNA geometría;
 *   · los datos de FLECOS (destellos de espuma que viajan por las curvas:
 *     el agua se ve CORRER) y de ONDAS (anillos que respiran en las pozas).
 *
 * LA TRAMPA de mergeGeometries (heredada con sangre de floraParamo/piezasAgua):
 * mezclar indexadas y no-indexadas devuelve null EN SILENCIO y la pieza no se
 * dibuja. Por eso: desindexar todo y TRONAR si falla.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  AGUAS,
  TIERRAS,
  VERDES,
  NEUTROS,
  PALETA,
  mezclar,
} from '../../visual/mundo3d/paleta/index.js';

/* ── Paleta local: todo DERIVADO de la madre (ni un hex suelto). ── */
export const COLORES_AGUA = {
  lamina: new THREE.Color(AGUAS.viva), // la acequia corriendo
  honda: new THREE.Color(AGUAS.lagunaHonda), // el centro de la poza
  orilla: new THREE.Color(mezclar(AGUAS.viva, AGUAS.lagunaOrilla, 0.55)), // el borde somero
  espuma: new THREE.Color(AGUAS.espuma), // flecos y ondas
  lechoMojado: new THREE.Color(mezclar(TIERRAS.siembra, NEUTROS.tinta, 0.3)), // tierra oscura de canal
  lechoOrilla: new THREE.Color(mezclar(TIERRAS.camino, TIERRAS.siembra, 0.5)), // el borde pisado
  tablon: new THREE.Color(PALETA.madera), // compuerta curtida
  tablonClaro: new THREE.Color(mezclar(PALETA.madera, NEUTROS.cal, 0.22)), // la testa del poste
  piedra: new THREE.Color(TIERRAS.piedra),
  junco: new THREE.Color(mezclar(VERDES.templado, TIERRAS.pajonal, 0.3)),
  turbera: new THREE.Color(mezclar(TIERRAS.turba, VERDES.frio, 0.25)), // el ojo de agua del páramo
};

/* La noche del valle es AZUL (día por noche): mismo apagado del Terreno. */
const COL_NOCHE = new THREE.Color('#2c4560');
const nocturnar = (c, nocturno) => (nocturno ? c.clone().lerp(COL_NOCHE, 0.45) : c);

/* ── EL TRAZADO (datos puros, [x, z]; la y la posa el terreno) ─────────────
   Verificado contra la composición del valle (composicionValle.js) y las
   zonas ocupadas: no cruza la quebrada (waypoints Valle3D: [-3.4,-7.2] →
   [3.6,8]), no pisa la casa (-0.9,2.6), ni patios, ni el cafetal (z≥1.6,
   cx 5.2), ni el bosque (x≥3 en el monte). El hilo del páramo serpentea
   ENTRE los frailejones (z≤-5.2): ellos SON la fábrica del agua. */
export const TRAZADO_AGUA = {
  /* 1. EL HILO DEL PÁRAMO: nace en el ojo de agua de la turbera, arriba,
        y baja por la ladera hasta ENTREGARLE a la quebrada en su nacimiento
        ([-3.4,-7.2] — el punto alto del cauce de Valle3D). */
  hiloParamo: {
    puntos: [[-4.7, -10.2], [-4.25, -9.15], [-3.75, -8.1], [-3.4, -7.2]],
    ancho: 0.1,
  },

  /* 2. LA ACEQUIA MADRE: sale de la TOMA occidental de la quebrada (el mismo
        punto a donde llega el sendero 'agua' — "el viaje del balde") y baja
        por gravedad, bordeando la casa con aire (≥1.4u), hasta el repartidor. */
  madre: {
    puntos: [[1.3, 0.75], [1.02, 1.75], [0.62, 2.85], [0.18, 3.85]],
    ancho: 0.17,
  },

  /* 3. RAMAL DE LAS ERAS: del repartidor R1 a las camas de cultivo
        ('suelo' en [-2.3,5.5]); remata en su poza al pie del patio. */
  ramalEras: {
    puntos: [[0.18, 3.85], [-0.75, 4.5], [-1.5, 5.0], [-1.85, 5.2]],
    ancho: 0.13,
  },

  /* 4. RAMAL DEL INVERNADERO: bifurca en la compuerta R2 y llega al
        semillero ([-0.6,6.6]) — la matica se riega donde se cría. */
  ramalInvernadero: {
    puntos: [[-0.75, 4.5], [-0.82, 5.4], [-0.75, 6.1]],
    ancho: 0.11,
  },

  /* 5. RAMAL BAJO: del repartidor R1 al RESERVORIO de tierra caliente —
        el agua guardada para el verano (y el charco donde bebe el hato). */
  ramalBajo: {
    puntos: [[0.18, 3.85], [0.35, 4.9], [0.62, 5.9], [1.0, 6.7]],
    ancho: 0.13,
  },

  /* 6. RAMAL DE LA HUERTA: toma ORIENTAL, cortica — la huerta ('sanidad'
        en [3.4,4.4]) queda del otro lado de la quebrada y toma por su banda,
        como se hace: cada lote con su bocatoma, nada cruza el cauce. */
  ramalHuerta: {
    puntos: [[2.42, 3.55], [2.85, 3.9], [3.1, 4.15]],
    ancho: 0.12,
  },
};

/* Las POZAS: donde el agua descansa y ONDULA. El reservorio es el grande. */
export const POZAS_AGUA = [
  { id: 'nacimiento', x: -4.7, z: -10.2, r: 0.42, turbera: true },
  { id: 'eras', x: -1.85, z: 5.2, r: 0.24 },
  { id: 'invernadero', x: -0.75, z: 6.1, r: 0.2 },
  { id: 'huerta', x: 3.1, z: 4.15, r: 0.24 },
  { id: 'reservorio', x: 1.05, z: 6.95, r: 0.62, reservorio: true },
];

/* Las COMPUERTAS rústicas: dos postes y un tablón atravesado, donde el agua
   se decide. rotY = perpendicular al flujo en ese punto. */
export const COMPUERTAS_AGUA = [
  { id: 'tomaMadre', x: 1.3, z: 0.75, rotY: -0.27, piedras: 3 },
  { id: 'repartidorR1', x: 0.18, z: 3.85, rotY: -0.96, piedras: 0 },
  { id: 'repartidorR2', x: -0.75, z: 4.5, rotY: -0.08, piedras: 0 },
  { id: 'tomaHuerta', x: 2.42, z: 3.55, rotY: 0.89, piedras: 2 },
];

/* Alturas sobre el terreno (evitan z-fighting con suelo/quebrada/senderos). */
export const LIFT = {
  lecho: 0.032,
  agua: 0.055,
  pozaLecho: 0.028,
  pozaAgua: 0.05,
  ondas: 0.062,
  flecos: 0.075,
};

/* ── utilitarios ───────────────────────────────────────────────────────── */

/** RNG determinista (mulberry32): el valle es EL MISMO valle en cada visita. */
export function rngAgua(semilla) {
  let a = semilla >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fusiona partes en UNA geometría, desindexando; si falla, TRUENA. */
function fusionar(partes, quien) {
  const buenas = partes.filter(Boolean).map((g) => (g.index ? g.toNonIndexed() : g));
  const geo = mergeGeometries(buenas, false);
  if (!geo) throw new Error(`aguaVivaValle: la fusión falló en '${quien}'`);
  buenas.forEach((g) => g.dispose());
  return geo;
}

/** Pinta una geometría entera de un color (para fusionar con vertex colors). */
function pintar(geo, color) {
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = color.r;
    arr[i * 3 + 1] = color.g;
    arr[i * 3 + 2] = color.b;
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3));
  return geo;
}

/** La curva 3D de un trazado: cada waypoint posado sobre el terreno. */
export function curvaDeTrazado(trazado, alturaDe, lift) {
  const pts = trazado.puntos.map(
    ([x, z]) => new THREE.Vector3(x, alturaDe(x, z) + lift, z),
  );
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.35);
}

/*
 * Una CINTA posada sobre el terreno a lo largo de una curva [x,z]: en cada
 * muestra se toma la tangente, se abre medio ancho a cada lado y CADA borde
 * consulta `alturaDe` — la cinta abraza la ladera en vez de flotar. Triángulos
 * no indexados con color por vértice (centro → borde), listos para fusionar.
 */
function cintaGeom(trazado, alturaDe, lift, colorCentro, colorBorde, paso = 5) {
  const curva = curvaDeTrazado(trazado, alturaDe, lift);
  const largo = curva.getLength();
  const n = Math.max(8, Math.round(largo * paso));
  const half = trazado.ancho / 2;

  /* tres cordones: borde izquierdo / CENTRO / borde derecho — el color
     centro→borde se degrada limpio (el canal se lee hondo en la mitad). */
  const izq = [];
  const cen = [];
  const der = [];
  const p = new THREE.Vector3();
  const t = new THREE.Vector3();
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    curva.getPoint(u, p);
    curva.getTangent(u, t);
    const nx = -t.z;
    const nz = t.x;
    const inv = 1 / (Math.hypot(nx, nz) || 1);
    const lx = p.x + nx * inv * half;
    const lz = p.z + nz * inv * half;
    const rx = p.x - nx * inv * half;
    const rz = p.z - nz * inv * half;
    izq.push([lx, alturaDe(lx, lz) + lift, lz]);
    cen.push([p.x, alturaDe(p.x, p.z) + lift, p.z]);
    der.push([rx, alturaDe(rx, rz) + lift, rz]);
  }

  const pos = [];
  const col = [];
  const meterVert = (v, c) => {
    pos.push(v[0], v[1], v[2]);
    col.push(c.r, c.g, c.b);
  };
  const franja = (a, ca, b, cb) => {
    for (let i = 0; i < n; i++) {
      meterVert(a[i], ca);
      meterVert(b[i], cb);
      meterVert(a[i + 1], ca);
      meterVert(b[i], cb);
      meterVert(b[i + 1], cb);
      meterVert(a[i + 1], ca);
    }
  };
  franja(izq, colorBorde, cen, colorCentro);
  franja(cen, colorCentro, der, colorBorde);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

/** El NIVEL de una poza: el terreno más bajo de su borde — la lámina plana
    se posa ahí; ladera abajo toca la orilla, ladera arriba se hunde en el
    barranquito. La poza se lee CAVADA en la pendiente, no flotando. */
export function nivelPoza(pz, alturaDe, radioExtra = 0, segs = 12) {
  let nivel = alturaDe(pz.x, pz.z);
  const r = pz.r + radioExtra;
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    nivel = Math.min(nivel, alturaDe(pz.x + Math.cos(a) * r, pz.z + Math.sin(a) * r));
  }
  return nivel;
}

/** Una POZA: fan de círculo, lámina PLANA al nivel del borde más bajo. */
function pozaGeom(pz, alturaDe, lift, radioExtra, colorCentro, colorOrilla) {
  const segs = pz.r > 0.4 ? 16 : 11;
  const r = pz.r + radioExtra;
  const cy = nivelPoza(pz, alturaDe, radioExtra, segs) + lift;
  const rim = [];
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    rim.push([pz.x + Math.cos(a) * r, cy, pz.z + Math.sin(a) * r]);
  }
  const pos = [];
  const col = [];
  for (let i = 0; i < segs; i++) {
    pos.push(pz.x, cy, pz.z);
    col.push(colorCentro.r, colorCentro.g, colorCentro.b);
    pos.push(rim[i + 1][0], rim[i + 1][1], rim[i + 1][2]);
    col.push(colorOrilla.r, colorOrilla.g, colorOrilla.b);
    pos.push(rim[i][0], rim[i][1], rim[i][2]);
    col.push(colorOrilla.r, colorOrilla.g, colorOrilla.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

/* ── LAS MALLAS GRANDES (una geometría por material = draw calls contados) ── */

/**
 * El LECHO de todo el sistema: cintas de tierra mojada (más anchas que el
 * agua) + el plato de cada poza. UNA geometría.
 * @param {(x:number,z:number)=>number} alturaDe
 * @param {boolean} nocturno
 */
export function lechosGeom(alturaDe, nocturno) {
  const cMojado = nocturnar(COLORES_AGUA.lechoMojado, nocturno);
  const cOrilla = nocturnar(COLORES_AGUA.lechoOrilla, nocturno);
  const cTurba = nocturnar(COLORES_AGUA.turbera, nocturno);
  const partes = Object.values(TRAZADO_AGUA).map((tr) =>
    cintaGeom(
      { ...tr, ancho: tr.ancho + 0.09 },
      alturaDe,
      LIFT.lecho,
      cMojado,
      cOrilla,
    ),
  );
  POZAS_AGUA.forEach((pz) => {
    partes.push(
      pozaGeom(pz, alturaDe, LIFT.pozaLecho, 0.1, pz.turbera ? cTurba : cMojado, cOrilla),
    );
  });
  return fusionar(partes, 'lechos');
}

/**
 * El AGUA de todo el sistema: la lámina de cada cinta + cada poza.
 * UNA geometría (material transparente, comparte el pulso de opacidad).
 */
export function aguasGeom(alturaDe, nocturno) {
  const cLamina = nocturnar(COLORES_AGUA.lamina, nocturno);
  const cHonda = nocturnar(COLORES_AGUA.honda, nocturno);
  const cOrilla = nocturnar(COLORES_AGUA.orilla, nocturno);
  const partes = Object.values(TRAZADO_AGUA).map((tr) =>
    cintaGeom(tr, alturaDe, LIFT.agua, cLamina, cOrilla),
  );
  POZAS_AGUA.forEach((pz) => {
    partes.push(pozaGeom(pz, alturaDe, LIFT.pozaAgua, 0, cHonda, cOrilla));
  });
  return fusionar(partes, 'aguas');
}

/**
 * LO ESTÁTICO de la mano campesina: compuertas de tablón, piedras de toma y
 * juncos de orilla. TODO fusionado en una sola geometría con vertex colors.
 */
export function estaticosGeom(alturaDe, nocturno) {
  const r = rngAgua(4217);
  const cTablon = nocturnar(COLORES_AGUA.tablon, nocturno);
  const cTesta = nocturnar(COLORES_AGUA.tablonClaro, nocturno);
  const cPiedra = nocturnar(COLORES_AGUA.piedra, nocturno);
  const cJunco = nocturnar(COLORES_AGUA.junco, nocturno);
  const partes = [];

  /* compuertas: dos postes clavados y el tablón atravesado (medio alzado:
     la compuerta VIVE abierta — el agua está pasando) */
  COMPUERTAS_AGUA.forEach((cp) => {
    const y = alturaDe(cp.x, cp.z);
    const sep = 0.17;
    for (const lado of [-1, 1]) {
      const px = cp.x + Math.cos(cp.rotY) * sep * lado;
      const pz = cp.z - Math.sin(cp.rotY) * sep * lado;
      const poste = new THREE.BoxGeometry(0.05, 0.36, 0.05);
      poste.translate(px, alturaDe(px, pz) + 0.18, pz);
      partes.push(pintar(poste, cTablon));
      const testa = new THREE.BoxGeometry(0.06, 0.03, 0.06);
      testa.translate(px, alturaDe(px, pz) + 0.37, pz);
      partes.push(pintar(testa, cTesta));
    }
    const tablon = new THREE.BoxGeometry(0.3, 0.13, 0.035);
    tablon.rotateY(cp.rotY);
    tablon.translate(cp.x, y + 0.2, cp.z); // medio alzado: pasa el agua
    partes.push(pintar(tablon, cTesta));

    for (let i = 0; i < cp.piedras; i++) {
      const a = r() * Math.PI * 2;
      const d = 0.16 + r() * 0.14;
      const px = cp.x + Math.cos(a) * d;
      const pz = cp.z + Math.sin(a) * d;
      const piedra = new THREE.IcosahedronGeometry(0.05 + r() * 0.04, 0);
      piedra.scale(1, 0.62, 1);
      piedra.rotateY(r() * Math.PI);
      piedra.translate(px, alturaDe(px, pz) + 0.03, pz);
      partes.push(pintar(piedra, cPiedra));
    }
  });

  /* juncos de orilla: matas de 4 briznas cónicas (forma permitida del mundo
     del agua: brizna fina, jamás cono-sobre-palito) en el reservorio y el
     nacimiento — el agua quieta cría su vegetación. */
  const juncosEn = [];
  POZAS_AGUA.forEach((pz) => {
    const cuantos = pz.reservorio ? 5 : pz.turbera ? 3 : pz.r > 0.22 ? 1 : 0;
    for (let i = 0; i < cuantos; i++) {
      const a = r() * Math.PI * 2;
      const d = pz.r + 0.1 + r() * 0.08;
      juncosEn.push([pz.x + Math.cos(a) * d, pz.z + Math.sin(a) * d]);
    }
  });
  juncosEn.forEach(([jx, jz]) => {
    const y = alturaDe(jx, jz);
    for (let i = 0; i < 4; i++) {
      const alto = 0.24 + r() * 0.16;
      const brizna = new THREE.ConeGeometry(0.02, alto, 3, 1);
      brizna.translate(0, alto / 2, 0);
      brizna.rotateZ(0.12 + r() * 0.3);
      brizna.rotateY((i / 4) * Math.PI * 2 + r() * 0.8);
      brizna.translate(jx + (r() - 0.5) * 0.04, y, jz + (r() - 0.5) * 0.04);
      partes.push(pintar(brizna, cJunco.clone().multiplyScalar(0.85 + r() * 0.3)));
    }
  });

  return fusionar(partes, 'estaticos');
}

/* ── LOS DATOS VIVOS (lo que el componente anima) ─────────────────────────── */

/**
 * Los FLECOS: destellos de espuma repartidos por TODAS las curvas, con
 * cupo proporcional al largo de cada una. El componente los hace viajar
 * (fase que corre por la curva) — el agua se VE correr.
 * @param {(x:number,z:number)=>number} alturaDe
 * @param {number} total  presupuesto por tier
 */
export function flecosData(alturaDe, total) {
  const curvas = Object.entries(TRAZADO_AGUA).map(([id, tr]) => {
    const curva = curvaDeTrazado(tr, alturaDe, LIFT.flecos);
    return { id, curva, largo: curva.getLength(), ancho: tr.ancho };
  });
  const largoTotal = curvas.reduce((s, c) => s + c.largo, 0);
  const r = rngAgua(907);
  const flecos = [];
  curvas.forEach((c) => {
    const cupo = Math.max(2, Math.round((c.largo / largoTotal) * total));
    for (let i = 0; i < cupo; i++) {
      flecos.push({
        curva: c.curva,
        t0: r(),
        /* deriva lateral fija y menuda: dentro de la lámina, sin tangentes por frame */
        dx: (r() - 0.5) * c.ancho * 0.5,
        dz: (r() - 0.5) * c.ancho * 0.5,
        tam: 0.016 + r() * 0.014,
        vel: 0.05 + r() * 0.045,
      });
    }
  });
  return flecos;
}

/**
 * Las ONDAS: anillos concéntricos que respiran en cada poza (el reservorio
 * lleva 3, las pozas 2, el nacimiento 1 — nace, no chapotea).
 */
export function ondasData(alturaDe, soloReservorio) {
  const r = rngAgua(311);
  const ondas = [];
  POZAS_AGUA.forEach((pz) => {
    if (soloReservorio && !pz.reservorio) return;
    const cuantas = pz.reservorio ? 3 : pz.turbera ? 1 : 2;
    for (let i = 0; i < cuantas; i++) {
      ondas.push({
        x: pz.x,
        y: nivelPoza(pz, alturaDe) + LIFT.ondas, // al ras de la lámina, no del terreno
        z: pz.z,
        rMax: pz.r * 0.82,
        fase: r(),
      });
    }
  });
  return ondas;
}
