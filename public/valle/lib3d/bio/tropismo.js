/**
 * tropismo.js — movimientos VIVOS de planta (tropismos + nastias) para lib3d.
 *
 * Fuente: propio (Chagra), 2026-08-03. Sin dependencia externa de código —
 * solo `three` (importmap bare). Determinista: todo el estado deriva del
 * tiempo/hora y de semillas; ninguna función usa `Math.random()`.
 *
 * QUÉ ES (biología → técnica barata, sin física pesada):
 *  · Heliotropismo   — la cabeza de la flor SIGUE al sol a lo largo del día
 *                      (girasol joven, Helianthus). Técnica: orientar un pivote
 *                      rígido (quaternion) hacia la dirección de la luz de la
 *                      escena. CPU-side, 1 quaternion/planta, costo ~cero.
 *  · Fototropismo    — el TALLO se dobla suave hacia la luz (crecimiento
 *                      asimétrico por auxinas). Técnica: inclinar el pivote del
 *                      tallo hacia la proyección horizontal de la luz, con un
 *                      tope de ángulo. Rígido, CPU-side.
 *  · Nictinastia     — hojas que se PLIEGAN de noche y abren de día (fríjol y
 *                      leguminosas: pulvinus pierde turgencia → bisagra). Técnica:
 *                      un factor apertura∈[0,1] por hora del día que rota las
 *                      "bisagras" (pulvini) registradas. Suave, anticipa el
 *                      amanecer/anochecer con smoothstep.
 *  · Tigmonastia     — hojas que se CIERRAN al TACTO/proximidad (Mimosa pudica,
 *                      dormidera). Técnica: impulso de cierre (0→1) al recibir
 *                      un toque, con relajación exponencial de vuelta. Se compone
 *                      con la nictinastia (toma el MÁXIMO de los dos cierres).
 *  · Tigmotropismo   — zarcillo que se ENROSCA al trepar (gulupa, Passiflora,
 *                      enredaderas). Técnica: hélice procedural cuyo parámetro
 *                      de enroscado t∈[0,1] crece al detectar/tener soporte;
 *                      genera la curva de la espiral (con "perversión" opcional,
 *                      el cambio de mano real del zarcillo). Geometría regenerada.
 *
 * COMPONE CON EL VIENTO, NO LO REEMPLAZA:
 *  Estos movimientos son rotaciones RÍGIDAS de pivotes (Object3D) o regeneración
 *  de una curva — operan en el grafo de escena / geometría, ANTES del sway de
 *  viento por-vértice (ez-tree `uTime`, Procedural Forest sway-por-hoja, etc.).
 *  El viento sigue meciendo las hojas dentro del pivote ya plegado/orientado.
 *  Convención: registrás pivotes (THREE.Object3D o THREE.Group) y este módulo
 *  solo escribe su `.quaternion`/`.rotation`/`.scale` — nunca toca materiales
 *  ni shaders del viento.
 *
 * ENTRADAS DE ESCENA (lib3d):
 *  · Dirección del sol → `terreno/atmosphere.js` devuelve `{ sun, dir }`
 *    (`sun` = THREE.Vector3 dirección; `dir` = DirectionalLight). Pasás `sun`.
 *  · Hora del día → un factor [0..24) o [0..1); ver `factorDia()`. El ciclo
 *    día/noche del valle (atmosphere/clima/noche) provee la hora.
 *
 * EXPORTS:
 *   crearHeliotropo(pivote, opts)      → controlador cabeza-al-sol / tallo-a-la-luz
 *   crearNictinastia(opts)             → controlador de plegado día/noche + tacto
 *   crearTigmotropismo(opts)           → zarcillo que teje su hélice al trepar
 *   MotorTropismo                      → agrupa varios controladores, un update(ctx)
 *   factorDia(hora)                    → [0..1] día(1)/noche(0) con transiciones
 *   curvaZarcillo(...)                 → utilidad pura: puntos de la hélice
 */

import * as THREE from 'three';
import { clamp, smoothstep, lerp } from '../core/RNG.js';

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _q = new THREE.Quaternion();
const _qA = new THREE.Quaternion();
const _qB = new THREE.Quaternion();
const _m = new THREE.Matrix4();

/**
 * factorDia(hora) — apertura por hora del día ∈ [0,1] (1 = pleno día abierta,
 * 0 = plena noche plegada). `hora` en [0,24) (o [0,1) → se escala a 24).
 * Transiciones suaves ANTICIPADAS: la planta empieza a plegar antes del ocaso y
 * a abrir antes del alba (el reloj circadiano anticipa, no reacciona). Determinista.
 *
 *  amanece: alba0→alba1 (sube 0→1)   ·   anochece: ocaso0→ocaso1 (baja 1→0)
 */
export function factorDia(hora, {
  alba0 = 5.0, alba1 = 7.0, ocaso0 = 17.5, ocaso1 = 19.5,
} = {}) {
  let h = hora;
  if (h <= 1.0 && h >= 0) h = h * 24;     // acepta [0,1) además de [0,24)
  h = ((h % 24) + 24) % 24;
  if (h < alba0 || h >= ocaso1) return 0; // noche cerrada
  if (h >= alba1 && h < ocaso0) return 1; // pleno día
  if (h < alba1) return smoothstep(alba0, alba1, h);      // amaneciendo
  return 1 - smoothstep(ocaso0, ocaso1, h);               // anocheciendo
}

/**
 * crearHeliotropo(pivote, opts) — orienta un pivote rígido hacia la luz.
 *
 * Dos modos (elegí con `modo`):
 *   'cabeza' (default) — HELIOTROPISMO: el eje `eje` del pivote (la cara de la
 *      flor) apunta directo a la dirección del sol. Girasol joven diaheliotrópico.
 *      Si `madura:true`, deja de seguir y encara al `este` fijo (girasol maduro
 *      real: la inflorescencia madura mira al ESTE geográfico) — se mezcla con
 *      `madurez∈[0,1]`.
 *   'tallo' — FOTOTROPISMO: el pivote se INCLINA hacia la luz hasta `maxAng`
 *      radianes (doblado suave del tallo por auxinas), sin girar del todo.
 *
 * @param {THREE.Object3D} pivote  nodo cuyo quaternion se escribirá.
 * @param {object} opts
 *   modo:'cabeza'|'tallo'  eje: Vector3 base de la flor (default +Y)
 *   este: Vector3 dirección "geográfica este" para flor madura (default +X)
 *   maxAng: tope de inclinación en 'tallo' (rad, default 0.5 ≈ 28°)
 *   suavizado: 0..1 lerp por frame hacia la meta (default 0.08) — inercia botánica
 *   madura:bool  madurez:0..1
 * @returns { update(sunDir, dt?), setMadurez(m), pivote }
 */
export function crearHeliotropo(pivote, opts = {}) {
  const {
    modo = 'cabeza',
    eje = new THREE.Vector3(0, 1, 0),
    este = new THREE.Vector3(1, 0, 0),
    maxAng = 0.5,
    suavizado = 0.08,
  } = opts;
  let madura = !!opts.madura;
  let madurez = opts.madurez ?? (madura ? 1 : 0);
  const ejeN = eje.clone().normalize();
  const esteN = este.clone().normalize();
  // quaternion base del pivote (para no acumular deriva)
  const qBase = pivote.quaternion.clone();

  function metaCabeza(sunDir, out) {
    // objetivo joven: eje→sol. objetivo maduro: eje→este. mezcla por madurez.
    _v.copy(sunDir).normalize();
    _qA.setFromUnitVectors(ejeN, _v);
    if (madurez > 0) {
      _qB.setFromUnitVectors(ejeN, esteN);
      out.copy(_qA).slerp(_qB, clamp(madurez, 0, 1));
    } else out.copy(_qA);
    return out;
  }

  function metaTallo(sunDir, out) {
    // proyección horizontal de la luz → dirección de inclinación; ángulo tope
    _v.copy(sunDir); _v.y = 0;
    if (_v.lengthSq() < 1e-6) { out.identity(); return out; }
    _v.normalize();
    // elevación de la luz → cuánto se dobla: sol bajo = luz muy lateral = más
    // doblado; sol alto = casi recto. Mapear elevación [0..1] a [maxAng..0].
    const elev = clamp(sunDir.clone().normalize().y, 0, 1);
    const ang = maxAng * (1 - elev);
    // eje de rotación = perpendicular horizontal a la dirección de la luz
    _v2.crossVectors(_up, _v).normalize();
    out.setFromAxisAngle(_v2, ang);
    return out;
  }

  function update(sunDir, dt = 1) {
    const meta = _q;
    if (modo === 'tallo') metaTallo(sunDir, meta);
    else metaCabeza(sunDir, meta);
    // aplicar sobre la orientación base del pivote
    _qB.copy(qBase).multiply(meta);
    // lerp suave (inercia): la flor no salta, sigue con retraso
    const t = clamp(suavizado * (dt * 60), 0, 1);
    pivote.quaternion.slerp(_qB, t);
  }

  return {
    pivote, modo,
    setMadurez(m) { madurez = clamp(m, 0, 1); madura = madurez > 0; },
    update,
  };
}

/**
 * Registro de una BISAGRA de pliegue (pulvinus): un pivote que rota entre su
 * pose ABIERTA (quaternion base) y una pose PLEGADA (base · rot(eje, angulo)).
 */
function _bisagra(pivote, { eje = new THREE.Vector3(1, 0, 0), angulo = Math.PI * 0.5, escalaMin = 1 } = {}) {
  return {
    pivote,
    qAbierta: pivote.quaternion.clone(),
    eje: eje.clone().normalize(),
    angulo,
    escalaMin,
    escalaAbierta: pivote.scale.clone(),
  };
}

/**
 * crearNictinastia(opts) — plegado de hojas por hora del día (nictinastia) que
 * ADEMÁS se cierra al tacto/proximidad (tigmonastia, Mimosa pudica).
 *
 * Registrás bisagras (pulvini) con `agregarHoja(pivote, {eje, angulo})`. Cada
 * frame `update({hora, dt})` calcula cierre = max(cierreNoche, cierreTacto) y
 * rota cada bisagra de su pose abierta a la plegada.
 *
 *   cierreNoche = 1 - factorDia(hora)          (leguminosas: fríjol de noche)
 *   cierreTacto: sube a 1 al `tocar()` y RELAJA exponencial (τ = relajacion s)
 *
 * @param {object} opts
 *   relajacion: segundos de vuelta a abierto tras el toque (default 6)
 *   velCierre: 1/s de plegado por hora (default 4 — el pliegue circadiano es lento)
 *   velTacto: 1/s de plegado por tacto (default 18 — la dormidera cierra en <1s)
 *   umbralTacto: distancia (u) a la que la proximidad dispara el cierre (opcional)
 * @returns { agregarHoja, tocar(fuerza?), update({hora,dt,tocador?}), get cierre() }
 */
export function crearNictinastia(opts = {}) {
  const {
    relajacion = 6.0,
    velCierre = 4.0,
    velTacto = 18.0,
    umbralTacto = 0,
  } = opts;
  const bisagras = [];
  let cierreNoche = 0;   // objetivo circadiano [0..1]
  let cierreNocheS = 0;  // suavizado
  let cierreTacto = 0;   // impulso de tacto [0..1]

  function agregarHoja(pivote, cfg) { const b = _bisagra(pivote, cfg); bisagras.push(b); return b; }

  function tocar(fuerza = 1) { cierreTacto = clamp(Math.max(cierreTacto, fuerza), 0, 1); }

  function aplicar(cierre) {
    for (const b of bisagras) {
      _q.setFromAxisAngle(b.eje, b.angulo * cierre);
      b.pivote.quaternion.copy(b.qAbierta).multiply(_q);
      if (b.escalaMin < 1) {
        const s = lerp(1, b.escalaMin, cierre);
        b.pivote.scale.set(b.escalaAbierta.x * s, b.escalaAbierta.y, b.escalaAbierta.z * s);
      }
    }
  }

  function update({ hora = 12, dt = 1 / 60, tocador = null } = {}) {
    // 1. objetivo circadiano
    cierreNoche = 1 - factorDia(hora);
    cierreNocheS += (cierreNoche - cierreNocheS) * clamp(velCierre * dt, 0, 1);
    // 2. proximidad opcional: si pasás un punto `tocador` (Vector3) y hay umbral,
    //    dispara el tacto de las bisagras cercanas (dormidera reacciona al roce).
    if (tocador && umbralTacto > 0) {
      for (const b of bisagras) {
        b.pivote.getWorldPosition(_v);
        if (_v.distanceTo(tocador) < umbralTacto) { tocar(1); break; }
      }
    }
    // 3. relajación exponencial del tacto de vuelta a abierto
    if (cierreTacto > 0) {
      const k = Math.exp(-dt / Math.max(1e-3, relajacion));
      // subida instantánea ya ocurrió en tocar(); acá solo baja
      cierreTacto *= k;
      if (cierreTacto < 1e-3) cierreTacto = 0;
    }
    const cierre = Math.max(cierreNocheS, cierreTacto);
    aplicar(cierre);
    return cierre;
  }

  return {
    agregarHoja, tocar, update,
    get cierreNoche() { return cierreNocheS; },
    get cierreTacto() { return cierreTacto; },
  };
}

/**
 * curvaZarcillo(largo, radio, vueltas, coil, perversion, segmentos) — utilidad
 * PURA (determinista): puntos de un zarcillo que va de recto a enroscado.
 *
 *  coil ∈ [0,1]: 0 = recto (buscando soporte), 1 = totalmente enroscado.
 *  perversion: si true, la hélice invierte el sentido de giro a la mitad (el
 *    zarcillo real forma dos hélices de mano opuesta unidas por una "perversión").
 *
 * @returns {THREE.Vector3[]} puntos de la línea central del zarcillo.
 */
export function curvaZarcillo(largo = 1, radio = 0.12, vueltas = 3, coil = 0, perversion = true, segmentos = 40) {
  const pts = [];
  const c = clamp(coil, 0, 1);
  const angTot = vueltas * Math.PI * 2 * c;
  const r = radio * c;                       // radio crece con el enroscado
  const paso = largo / segmentos;            // el zarcillo no cambia de largo
  // al enroscar, el eje se acorta (la hélice comprime): altura efectiva
  const alturaEfectiva = largo * (1 - 0.75 * c);
  for (let i = 0; i <= segmentos; i++) {
    const u = i / segmentos;                 // 0..1 a lo largo del zarcillo
    let ang = angTot * u;
    // perversión: invertir el signo del giro pasada la mitad
    if (perversion && u > 0.5) ang = angTot * 0.5 - angTot * (u - 0.5);
    const y = alturaEfectiva * u;
    pts.push(new THREE.Vector3(Math.cos(ang) * r, y, Math.sin(ang) * r));
  }
  // dejar el zarcillo recto cuando coil≈0 (evita colapsar todos los puntos)
  if (c < 1e-4) for (let i = 0; i <= segmentos; i++) pts[i].set(0, paso * i, 0);
  return pts;
}

/**
 * crearTigmotropismo(opts) — zarcillo que se enrosca al trepar (gulupa/Passiflora).
 *
 * Construye un `THREE.Line` (o Tube si pasás `tubo:true`) que representa el
 * zarcillo. Cada `update({dt, soporte?})` avanza/retrocede el enroscado:
 *   · sin soporte → coil relaja lento hacia `coilReposo` (sigue buscando, casi recto)
 *   · con soporte (bool o punto cercano) → coil sube hacia 1 (enrosca al trepar)
 * La geometría se regenera solo cuando el coil cambia (barato; ~40 verts).
 *
 * @param {object} opts
 *   largo, radio, vueltas, segmentos: forma de la hélice
 *   velEnrosque: 1/s hacia enroscado con soporte (default 0.6)
 *   velRelaja:   1/s de vuelta sin soporte (default 0.15)
 *   perversion:  bool (default true)
 *   coilReposo:  coil en reposo sin soporte (default 0.05)
 *   color, tubo, radioTubo
 * @returns { objeto3D, update({dt, soporte}), get coil() }
 */
export function crearTigmotropismo(opts = {}) {
  const {
    largo = 1, radio = 0.12, vueltas = 3, segmentos = 40,
    velEnrosque = 0.6, velRelaja = 0.15, perversion = true, coilReposo = 0.05,
    color = 0x4a7c3a, tubo = false, radioTubo = 0.02,
  } = opts;
  let coil = coilReposo;
  let coilPrev = -1;
  let objeto3D;
  let geom;

  function build() {
    const pts = curvaZarcillo(largo, radio, vueltas, coil, perversion, segmentos);
    if (tubo) {
      const curve = new THREE.CatmullRomCurve3(pts);
      const g = new THREE.TubeGeometry(curve, segmentos, radioTubo, 6, false);
      if (!objeto3D) {
        objeto3D = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0 }));
      } else { objeto3D.geometry.dispose(); objeto3D.geometry = g; }
      geom = g;
    } else {
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      if (!objeto3D) {
        objeto3D = new THREE.Line(g, new THREE.LineBasicMaterial({ color }));
      } else { objeto3D.geometry.dispose(); objeto3D.geometry = g; }
      geom = g;
    }
  }
  build();

  function update({ dt = 1 / 60, soporte = false } = {}) {
    // soporte puede ser bool o Vector3 (punto). Cualquier verdad => enrosca.
    const hay = !!soporte;
    const meta = hay ? 1 : coilReposo;
    const vel = hay ? velEnrosque : velRelaja;
    coil += (meta - coil) * clamp(vel * dt, 0, 1);
    coil = clamp(coil, 0, 1);
    if (Math.abs(coil - coilPrev) > 1e-3) { build(); coilPrev = coil; }
    return coil;
  }

  return {
    get objeto3D() { return objeto3D; },
    get coil() { return coil; },
    get geometry() { return geom; },
    update,
  };
}

/**
 * MotorTropismo — agrupa varios controladores y los actualiza con UN contexto.
 * El consumidor lo llama cada frame con { sunDir, hora, dt, tocador?, soporte? }.
 * Cada controlador toma lo que necesita del contexto; el motor no acopla nada.
 */
export class MotorTropismo {
  constructor() { this.helios = []; this.nastias = []; this.zarcillos = []; }
  addHeliotropo(h) { this.helios.push(h); return h; }
  addNictinastia(n) { this.nastias.push(n); return n; }
  addTigmotropismo(z) { this.zarcillos.push(z); return z; }
  update(ctx = {}) {
    const { sunDir, hora = 12, dt = 1 / 60, tocador = null, soporte = false } = ctx;
    if (sunDir) for (const h of this.helios) h.update(sunDir, dt);
    for (const n of this.nastias) n.update({ hora, dt, tocador });
    for (const z of this.zarcillos) z.update({ dt, soporte });
  }
}
