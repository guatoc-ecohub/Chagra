/*
 * descensoSierra — LA COREOGRAFÍA del descenso por la Sierra, como DATO puro
 * (cero three, cero React, cero DOM). Es el corazón del PASO 3 del diseño
 * `DISENO-TRANSICION-CLIMAS-20260902.md` y lo que hace la puerta verificable.
 *
 * LA DECISIÓN DE ARQUITECTURA, y por qué: la puerta del Paso 3 es
 * «continuidad end-to-end, sin saltos de luz ni de niebla entre bandas».
 * Un descenso hecho de siete presets por banda NO puede pasar esa puerta —
 * cambiar de preset ES el salto. Así que acá **ninguna magnitud óptica se
 * decide por banda**: todas son funciones CONTINUAS de la altitud (msnm), la
 * misma entrada física que usa `cieloSylva.js`. Las bandas solo deciden QUÉ
 * módulos se montan, y su pertenencia también es continua (pesos que suman 1),
 * así que tampoco ahí hay conmutación dura. La continuidad no se inspecciona
 * a ojo: es una propiedad de construcción, y el test la mide.
 *
 * EL EFECTO CENTRAL: `cieloMsnm` recorre 5 775 → la cota del usuario. Alimenta
 * el `msnm` de `cieloSylva.js`, que no es un degradado sino scattering
 * integrado a escala planetaria con la altitud como entrada. Al bajar, la
 * columna de aire sobre la cámara CRECE: el cielo pasa de casi violeta (poca
 * atmósfera encima) a azul pleno y luego a blanquecino. Eso es física, no
 * paleta — y es la respuesta visible a «¿por qué hace más frío arriba?».
 *
 * LA CORRECCIÓN DEL CLIMATÓLOGO (§7.2, no negociable): El Niño NO es «más sol
 * y más calor» en todas partes. En el piso frío el cielo despejado dispara el
 * enfriamiento radiativo nocturno y produce MÁS heladas. Acá eso se traduce en
 * que bajo El Niño la franja de niebla SUBE y se ADELGAZA (el bosque de niebla
 * quedándose sin niebla), no en «más sol bonito». La línea de consejo por piso
 * vive en `aterrizajeDescenso.js`.
 *
 * ORDEN: por ALTITUD, no por hora ni temporada — es la única verdad física, y
 * es la lección.
 */
import { PISOS_TERMICOS_SIERRA } from '../pisosTermicos.js';
import { CUMBRE_M, clamp, smoothstep, yDeMsnm, wzDeAltura } from './sierraRelieve.js';

/* ─────────────────────── reloj: duración y política ─────────────────────── */

/** Decisión del operador (PASO 0, cerrado): 4 200 ms en tier alto. */
export const DURACION_DESCENSO_MS = { alto: 4200, medio: 2800, bajo: 1400 };
/** Reduced-motion colapsa a un corte (mismo valor que el kit y la transición). */
export const DURACION_REDUCIDA_MS = 160;
/** El frenazo final: la cámara para en la cota del usuario (§4.3, Jackson). */
export const MS_FRENO = 400;
/** Llave de «ya lo vio»: el descenso corre UNA vez (decisión del operador). */
export const LLAVE_VISTO = 'chagra:descenso-sierra:visto';

export function duracionDescenso(tier = 'alto', reducedMotion = false) {
  if (reducedMotion) return DURACION_REDUCIDA_MS;
  return DURACION_DESCENSO_MS[tier] ?? DURACION_DESCENSO_MS.medio;
}

/* ───────────────── el ritmo por banda (§4.2, tier alto) ─────────────────── */
/* Milisegundos que el diseño le da a cada banda cuando el viaje llega hasta la
   costa. Se usan como PESOS relativos: si el usuario vive a 2 640 m el viaje no
   atraviesa las bandas de abajo, y los pesos de las que sí se atraviesan se
   reescalan para llenar el tiempo disponible. Así el ritmo del diseño se
   conserva y el frenazo sigue cayendo en la cota del usuario. */
const PESO_MS_BANDA = {
  nival: 500,
  superparamo: 600,
  paramo: 800,
  frio: 800,
  templado: 600,
  calido_seco: 500,
  playa: 300,
};

/** Las bandas de la tabla canónica, de la cima al mar, con su peso temporal. */
export const BANDAS_DESCENSO = PISOS_TERMICOS_SIERRA.map((b) => ({
  id: b.id,
  nombre: b.nombre,
  nombreTransicion: b.nombreTransicion,
  piso: b.piso,
  minMsnm: b.minMsnm,
  maxMsnm: b.maxMsnm,
  color: b.color,
  pesoMs: PESO_MS_BANDA[b.id] ?? 500,
}));

/* ────────────────── la cota de destino (dónde se frena) ─────────────────── */

/** Sin ubicación confirmada: se para en la banda templada, la modal andina. */
export const COTA_SIN_UBICACION = 1500;
/** Nunca se frena pegado a la cumbre: mínimo de viaje para que se lea descenso. */
const COTA_MAX_DESTINO = 4200;

/**
 * Resuelve dónde frena el viaje. NUNCA inventa: sin dato, devuelve la cota
 * modal andina y `conUbicacion: false`, y quien pinte debe decirlo.
 */
export function cotaDestino(msnmUsuario) {
  // `Number(null)` es 0, NO «nivel del mar confirmado». Sin este guardia, un
  // usuario sin ubicación aterrizaba en la playa con `conUbicacion: true` y el
  // producto le habría contado el clima de una cota que nunca dio. Es el mismo
  // error que el helper `num()` de `cieloSylva.js` documenta al pie de la letra.
  if (msnmUsuario === null || msnmUsuario === undefined || msnmUsuario === '') {
    return { cota: COTA_SIN_UBICACION, conUbicacion: false };
  }
  const m = Number(msnmUsuario);
  if (!Number.isFinite(m) || m < 0 || m > CUMBRE_M) {
    return { cota: COTA_SIN_UBICACION, conUbicacion: false };
  }
  return { cota: clamp(m, 0, COTA_MAX_DESTINO), conUbicacion: true };
}

/* ──────────────────────── la curva de altitud ───────────────────────────── */

/**
 * Construye el plan del viaje: los tramos de altitud que se atraviesan y el
 * reparto de tiempo entre ellos. Monótono y sin huecos por construcción.
 */
export function planDescenso(cota = COTA_SIN_UBICACION, tier = 'alto', reducedMotion = false) {
  const total = duracionDescenso(tier, reducedMotion);
  const freno = Math.min(MS_FRENO, Math.round(total * 0.14));
  const destino = clamp(cota, 0, COTA_MAX_DESTINO);

  const tramos = [];
  for (const b of BANDAS_DESCENSO) {
    const arriba = Math.min(b.maxMsnm, CUMBRE_M);
    const abajo = Math.max(b.minMsnm, destino);
    if (abajo >= arriba) continue; // banda por debajo del destino: no se recorre
    const fraccion = (arriba - abajo) / (b.maxMsnm - b.minMsnm);
    tramos.push({ banda: b, desde: arriba, hasta: abajo, peso: b.pesoMs * fraccion });
  }
  if (tramos.length === 0) {
    tramos.push({ banda: BANDAS_DESCENSO[0], desde: CUMBRE_M, hasta: destino, peso: 1 });
  }
  const sumaPeso = tramos.reduce((s, t) => s + t.peso, 0) || 1;
  let acumulado = 0;
  for (const t of tramos) {
    t.msInicio = acumulado;
    acumulado += (t.peso / sumaPeso) * total;
    t.msFin = acumulado;
  }
  tramos[tramos.length - 1].msFin = total; // cierra exacto, sin residuo de coma flotante
  return { total, freno, destino, tramos };
}

/*
 * Ease global del viaje, aplicado UNA sola vez sobre TODO el recorrido.
 *
 * Por qué una sola: la primera versión tenía ease por tramo (la cámara se
 * paraba siete veces: el descenso latía) y además un frenazo como fase aparte
 * con su propio ease-out. La medición lo delató — el viaje llegaba al frenazo
 * con velocidad ~0 y el frenazo arrancaba a 1,8 m/ms: un TIRÓN de 1,79 m justo
 * antes de aterrizar, el salto más grande de todo el descenso. Con un solo
 * ease-in-out la curva es C1: arranca quieta sobre el casquete (§4.2, banda 1),
 * toma velocidad, y DESACELERA hasta parar en la cota del usuario. El frenazo
 * no es una fase pegada al final: es el final de la curva. Y es lo que vende la
 * escala (§3.2, Jackson: se vende con el frenazo, no con la caída).
 */
function easeViaje(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/**
 * Altitud (msnm) en el instante `ms` del viaje. Continua, monótona decreciente,
 * arranca en la cumbre y termina EXACTAMENTE en la cota de destino, con
 * velocidad 0 en los dos extremos.
 */
export function msnmEnMs(ms, plan) {
  const t = clamp(ms, 0, plan.total);
  return interpolarTramos(easeViaje(t / plan.total) * plan.total, plan);
}

function interpolarTramos(t, plan) {
  const tr = plan.tramos;
  for (let i = 0; i < tr.length; i++) {
    if (t <= tr[i].msFin || i === tr.length - 1) {
      const dur = Math.max(1e-6, tr[i].msFin - tr[i].msInicio);
      const u = clamp((t - tr[i].msInicio) / dur, 0, 1);
      return tr[i].desde + (tr[i].hasta - tr[i].desde) * u;
    }
  }
  return plan.destino;
}

/* ───────────────── óptica: TODO función continua de msnm ────────────────── */

/** Fracción de columna de aire recorrida (0 en la cumbre, 1 al nivel del mar). */
export function fraccionColumna(msnm) {
  return clamp(1 - msnm / CUMBRE_M, 0, 1);
}

/**
 * La franja de condensación: dónde vive la nube. NO es una banda de color: es
 * un fenómeno con cota móvil (§6-C). Bajo El Niño SUBE y se ADELGAZA — el
 * bosque de niebla quedándose sin niebla (§7.3), que es el efecto más
 * importante del descenso bajo esa fase. Bajo La Niña baja y engorda.
 */
export function franjaCondensacion(fase = 'neutral', humedad = null) {
  let cota = 2500; // centro de la banda «bosque de niebla» (2000–3000)
  let sigma = 520;
  let amplitud = 1;
  if (fase === 'el_nino') {
    cota += 380; // menos humedad → la cota de condensación asciende
    sigma *= 0.72; // y la franja se adelgaza
    amplitud *= 0.62;
  } else if (fase === 'la_nina') {
    cota -= 260;
    sigma *= 1.18;
    amplitud *= 1.15;
  }
  if (typeof humedad === 'number' && Number.isFinite(humedad)) {
    // Humedad relativa real (0..100) del dato vivo: corrige la cota sin
    // inventarla. 70 % = neutro; más húmedo baja la nube, más seco la sube.
    cota += (70 - clamp(humedad, 0, 100)) * 6;
    amplitud *= clamp(0.55 + humedad / 120, 0.5, 1.35);
  }
  return { cota, sigma, amplitud };
}

/**
 * Estado óptico completo en una altitud. Todas las salidas son funciones
 * suaves de `msnm`: no hay conmutación por banda en ninguna de ellas.
 */
export function opticaEnMsnm(msnm, { fase = 'neutral', humedad = null } = {}) {
  const m = clamp(msnm, 0, CUMBRE_M);
  const col = fraccionColumna(m);
  const franja = franjaCondensacion(fase, humedad);

  const d = (m - franja.cota) / franja.sigma;
  const niebla = franja.amplitud * Math.exp(-d * d);

  // Rayleigh: arriba hay MENOS aire encima → cenit más profundo, casi violeta.
  const rayleigh = 0.52 + 0.86 * col;
  // Mie y turbidez: la bruma vive abajo; crece hacia el mar y con la niebla.
  const mie = 0.35 + 1.35 * col ** 1.5 + niebla * 0.55;
  const turbidez = 1.8 + 8.4 * col ** 1.6 + niebla * 2.2;
  // Ozono: la hora azul pesa más arriba, donde la capa queda por encima.
  const ozono = 1.25 - 0.45 * col;

  // Luz: dura y limpia arriba (aire fino), tamizada dentro de la nube, cálida
  // y filtrada abajo bajo el dosel.
  const luzIntensidad = clamp(1.05 - 0.42 * niebla - 0.14 * col, 0.4, 1.1);
  // Temperatura de color: 0 = blanco frío de altura, 1 = ámbar de tierra baja.
  const luzCalidez = clamp(0.12 + 0.72 * col + 0.1 * niebla, 0, 1);
  // Sombra: dura arriba, difusa dentro de la nube, media abajo.
  const sombraDureza = clamp(1 - 0.75 * niebla - 0.2 * col, 0.15, 1);

  /* Niebla de escena (densidad exponencial con la altura, forma cerrada — el
     contrato de `nieblaAltura.js`). El RANGO está anclado al de la vista
     global, que usa `fogExp2` a 0,028 y se lee bien: la primera versión iba de
     0,012 a 0,16 y a media montaña lavaba el macizo entero. Acá el techo es
     0,058 (algo más del doble de la vista global, y solo dentro de la nube). */
  const nieblaDensidad = clamp(0.010 + 0.038 * niebla + 0.010 * col, 0, 0.06);

  return {
    msnm: m,
    columna: col,
    niebla,
    nieblaDensidad,
    franja,
    rayleigh,
    mie,
    turbidez,
    ozono,
    luzIntensidad,
    luzCalidez,
    sombraDureza,
  };
}

/* ─────────────── pertenencia a banda: continua, no conmutada ────────────── */

/** Ancho del cruce entre bandas, en metros. Nada conmuta: todo cruza. */
export const CRUCE_BANDA_M = 170;

/**
 * Peso 0..1 de cada banda a una altitud dada. Los pesos suman ≈1 y varían de
 * forma continua: por eso encender los FX «por banda» no produce un salto.
 */
export function pesosBanda(msnm) {
  const m = clamp(msnm, 0, CUMBRE_M);
  const pesos = {};
  let suma = 0;
  for (const b of BANDAS_DESCENSO) {
    const dentroArriba = 1 - smoothstep(b.maxMsnm - CRUCE_BANDA_M, b.maxMsnm + CRUCE_BANDA_M, m);
    const dentroAbajo = smoothstep(b.minMsnm - CRUCE_BANDA_M, b.minMsnm + CRUCE_BANDA_M, m);
    const p = clamp(dentroArriba * dentroAbajo, 0, 1);
    pesos[b.id] = p;
    suma += p;
  }
  if (suma > 0) for (const k of Object.keys(pesos)) pesos[k] /= suma;
  return pesos;
}

/** La banda dominante (para el rótulo y el anfitrión compai). */
export function bandaDominante(msnm) {
  const pesos = pesosBanda(msnm);
  let mejor = BANDAS_DESCENSO[0];
  let mejorP = -1;
  for (const b of BANDAS_DESCENSO) {
    if (pesos[b.id] > mejorP) {
      mejorP = pesos[b.id];
      mejor = b;
    }
  }
  return { banda: mejor, peso: mejorP, pesos };
}

/* ───────────────────────── módulos por banda (§5.1) ─────────────────────── */
/* Qué FX vive en qué banda. El peso final de cada FX es la suma de los pesos
   de las bandas que lo piden — continuo, nunca 0→1 de golpe. */
const FX_POR_BANDA = {
  nival: ['cielo', 'csm', 'quarks'],
  superparamo: ['cielo', 'niebla', 'csm'],
  paramo: ['cielo', 'niebla', 'bruma', 'csm', 'godRays', 'flora'],
  frio: ['cielo', 'niebla', 'bruma', 'csm', 'godRays', 'flora', 'horizonte'],
  templado: ['cielo', 'niebla', 'csm', 'godRays', 'flora', 'mojado', 'dof'],
  calido_seco: ['cielo', 'niebla', 'csm', 'flora', 'quarks'],
  playa: ['cielo', 'niebla', 'flora'],
};

/*
 * Reparto por tier (§10.2). `horizonte` y `taa` NO aparecen en móvil: tienen
 * GL_INVALID_OPERATION 1282 y cuadro negro MEDIDOS en Mali-G78 el 2026-09-02
 * (`post/horizonteSylva.js:30`, `post/taaSylva.js:115`). Los que nunca se
 * apagan son el piso mínimo: gradeo, niebla de altura y follaje de masa —
 * lo que garantiza que el móvil vea poca densidad, JAMÁS low-poly.
 */
const TIER_PERMITE = {
  alto: ['cielo', 'niebla', 'bruma', 'csm', 'godRays', 'dof', 'mojado', 'quarks', 'flora', 'horizonte'],
  medio: ['cielo', 'niebla', 'bruma', 'csm', 'godRays', 'mojado', 'flora'],
  bajo: ['cielo', 'niebla', 'bruma', 'flora'],
};

/** Peso 0..1 de cada FX a una altitud dada, ya recortado por tier. */
export function fxEnMsnm(msnm, tier = 'alto') {
  const pesos = pesosBanda(msnm);
  const permitidos = TIER_PERMITE[tier] ?? TIER_PERMITE.medio;
  const fx = {};
  for (const nombre of permitidos) fx[nombre] = 0;
  for (const b of BANDAS_DESCENSO) {
    const p = pesos[b.id];
    if (!p) continue;
    for (const nombre of FX_POR_BANDA[b.id] ?? []) {
      if (nombre in fx) fx[nombre] += p;
    }
  }
  for (const k of Object.keys(fx)) fx[k] = clamp(fx[k], 0, 1);
  return fx;
}

/* ─────────────────────────────── la cámara ──────────────────────────────── */
/*
 * ÉPICO definido como decisiones verificables (§3.2):
 *  · frame 0 = el macizo COMPLETO, mar Y nieve en el mismo cuadro;
 *  · hero shot en la banda 4: se atraviesa el techo de nubes y el mar asoma
 *    abajo entre jirones mientras la cima queda arriba;
 *  · el frenazo, no la caída, es lo que vende la escala.
 */
const CAM_Z_ARRIBA = -13.2; // lejos al norte: cabe el macizo entero
const CAM_Z_ABAJO = -4.6; // cerca de la costa al final del transecto

export function camaraEnMsnm(msnm, optica) {
  const col = fraccionColumna(msnm);
  const yLadera = yDeMsnm(msnm);
  const z = CAM_Z_ARRIBA + (CAM_Z_ABAJO - CAM_Z_ARRIBA) * col;
  // La cámara vuela un poco por encima de la cota que narra; al principio
  // MUCHO por encima, para que quepa el macizo entero.
  const alturaVuelo = 0.55 + 1.15 * (1 - col) ** 2;
  const y = yLadera + alturaVuelo;
  const x = -1.5 + 1.1 * col; // deriva suave: la montaña no queda plana

  // El objetivo sigue la ladera a la cota actual (nunca una montaña inventada).
  const wz = wzDeAltura(yLadera, 0);
  const objetivoZ = wz == null ? 2.4 : clamp(wz, -2.5, 5.6);
  // Hero shot: dentro de la nube la mirada BAJA para que el mar entre en cuadro
  // por debajo de los jirones. Es continuo (proporcional a la niebla).
  const objetivoY = yLadera - 0.95 * (optica?.niebla ?? 0);
  const fov = 48 - 5 * (1 - col); // se cierra un poco al bajar: se clava
  return { pos: [x, y, z], objetivo: [0, objetivoY, objetivoZ], fov };
}

/* ────────────────────────── el estado completo ──────────────────────────── */

/**
 * TODO el estado del descenso en un instante. Es la única función que la
 * escena 3D consulta por cuadro: si algo salta, salta acá y el test lo ve.
 *
 * @param {number} ms      milisegundos desde el inicio del viaje
 * @param {object} opts    { plan, fase, humedad, tier }
 */
export function estadoDescenso(ms, { plan, fase = 'neutral', humedad = null, tier = 'alto' } = {}) {
  const p = plan ?? planDescenso(COTA_SIN_UBICACION, tier);
  const msnm = msnmEnMs(ms, p);
  const optica = opticaEnMsnm(msnm, { fase, humedad });
  const { banda, pesos } = bandaDominante(msnm);
  return {
    ms: clamp(ms, 0, p.total),
    progreso: clamp(ms / p.total, 0, 1),
    msnm,
    rotuloMsnm: Math.round(msnm),
    banda,
    pesos,
    optica,
    fx: fxEnMsnm(msnm, tier),
    camara: camaraEnMsnm(msnm, optica),
    frenando: ms >= p.total - p.freno,
    plan: p,
  };
}

/* ─────────────────── opt-in y política de «corre una vez» ───────────────── */
/*
 * Los 12 FX de clima siguen APAGADOS por defecto en la entrada pública: es una
 * decisión del operador, y el gate móvil (Paso 7) es la única puerta para
 * cambiar un default. Por eso el descenso 3D también entra por opt-in, con el
 * mismo patrón de query-string que ya usa el lote Sylva (`?cielo=1`, `?csm=1`).
 */
export function descenso3dPedido(search = globalThis.location?.search ?? '') {
  const q = new URLSearchParams(search);
  const v = q.get('descenso3d');
  if (v === null || v === '0' || v === 'off' || v === 'false') return false;
  return true;
}

/** ¿Ya lo vio? Corre UNA vez (decisión del operador). Nunca revienta. */
export function descensoYaVisto(storage) {
  try {
    const s = storage ?? globalThis.localStorage;
    return s?.getItem(LLAVE_VISTO) === '1';
  } catch {
    return false;
  }
}

/** Marca «ya lo vio». Silenciosa si el almacenamiento no está disponible. */
export function marcarDescensoVisto(storage) {
  try {
    const s = storage ?? globalThis.localStorage;
    s?.setItem(LLAVE_VISTO, '1');
    return true;
  } catch {
    return false;
  }
}
