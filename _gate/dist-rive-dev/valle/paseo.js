// ── paseo.js — LOS GUÍAS CONDUCEN LA CÁMARA ────────────────────────────────
//
// Orden del operador (2026-07-27), y es la respuesta a «en la cámara que queda
// marcada después de entrar NO PASA NADA»:
//
//   «No veo a Dante y Oliver. Junto con el compAI **guían la cámara** en el
//    Valle de Guatoc. Los perros andan por toda la finca y el compAI husmea los
//    mundos: entre los tres hay movimiento permanente y natural que el usuario
//    puede seguir en vez de quedarse mirando un cuadro quieto.»
//
// O sea: **la llegada no es un punto final**. El aterrizaje cierra en la
// panorámica, y a los 10 s sin que el usuario toque nada, uno de los tres
// guías se lleva la cámara con él. No es un tour guiado con paradas y
// letreros: es acompañar a alguien que ya estaba andando.
//
// ── LOS CUATRO CRITERIOS DEL OPERADOR, Y CÓMO SE CUMPLEN ────────────────────
//
// 1. «Suave y OPCIONAL: cualquier interacción recupera el control de
//    inmediato.» → `cortar()` se engancha a pointerdown/wheel/keydown/touch en
//    captura, corre ANTES que cualquier otro manejador, y devuelve el control
//    **donde está la cámara en ese instante** — sin volar de regreso, sin
//    snap. El usuario nunca pelea contra la cámara. Y el paseo no vuelve a
//    arrancar hasta que pasen otros 10 s de quietud.
//
// 2. «Nunca mareador: es acompañar, no arrastrar. Movimientos largos y
//    lentos.» → cero cortes: la cámara se PERSIGUE a sí misma con amortiguación
//    crítica (`SUAVE`), nunca salta al puesto nuevo. La entrada al paseo dura
//    `ENTRADA_S` segundos con smootherstep, y una vez enganchada la cámara
//    corrige a `SUAVE` por frame, que a 60 fps es una constante de tiempo de
//    ~1,2 s. El encuadre respira con un vaivén lento (`RESPIRO_S`) para que no
//    se lea como un raíl de tren.
//
// 3. «No debe repetirse igual.» → el guía se elige con `elegirSinRepetir` del
//    núcleo compartido (`compai/gestos.js`) — el MISMO azar ponderado que hace
//    que el compAI no se rasque dos veces seguidas. No es azar nuevo: es el de
//    la casa. Además el ángulo de escolta, la distancia y la duración del turno
//    salen sorteados dentro de un rango, así que dos paseos nunca son iguales.
//
// 4. «Que enseñe de paso: si la cámara sigue a un perro que cruza del corral al
//    bosque, el usuario aprende dónde queda cada cosa sin que nadie se lo
//    explique.» → el paseo **no narra**. Ni un letrero, ni un toast. La
//    lección es que la cámara pasa por encima del corral, de la biofábrica y
//    de la huerta siguiendo a un perro que ya iba para allá. El texto sobraría:
//    es exactamente el «sin que nadie se lo explique».
//
// ── POR QUÉ ES UN MÓDULO APARTE ────────────────────────────────────────────
// `main.js`, `portales.js` y `marco.js` llevan trabajo de varios agentes
// mezclado. Todo el comportamiento vive aquí y `main.js` sólo lo enchufa con
// una línea en el bucle. Si mañana hay que apagarlo, se apaga en un sitio.

import * as THREE from 'three';
import { elegirSinRepetir } from './compai/gestos.js';

const QUIETO_MS = 10000;   // 🔴 los 10 s del operador, ni más ni menos
const ENTRADA_S = 5.0;     // lo que tarda la cámara en engancharse al guía
const SUAVE = 0.014;       // amortiguación por frame ≈ 1,2 s de constante
const RESPIRO_S = 17;      // el vaivén lento del encuadre (no es un raíl)
const TURNO_S = [19, 27];  // cuánto acompaña a cada guía antes de cambiar

// Cómo se planta la cámara detrás de cada guía. Un perro se mira desde más
// cerca y más bajo (va por el suelo, cruzando potreros); el compAI se mira
// desde más lejos y más alto porque lo que enseña NO es él sino el mundo que
// está husmeando — si la cámara se le pega, tapa la lección.
const ESCOLTA = {
  // ⚠️ el alto bajó de 34-52 a 24-38 tras mirar `p5-paseo.png`: con la cámara
  // alta el perro se leía como una cajita vista desde arriba en un potrero
  // vacío. A esta altura la escolta va casi de perfil y detrás entra el
  // PAISAJE — que es lo que enseña.
  perro:  { dist: [96, 140], alto: [24, 38], lado: [-0.5, 0.5], mira: 6 },
  compai: { dist: [130, 190], alto: [52, 78], lado: [-0.6, 0.6], mira: 10 },
};

const lerp = (a, b, t) => a + (b - a) * t;
const suavizar = (k) => k * k * k * (k * (k * 6 - 15) + 10);   // smootherstep

/**
 * @param {object} o
 * @param {THREE.PerspectiveCamera} o.camera
 * @param {object} o.controls        MapControls: se apaga mientras el paseo manda
 * @param {() => Array<{nombre:string, obj:THREE.Object3D}>} o.perros
 * @param {object} o.compai          API de portales: { pos(), husmear(), soltar() }
 * @param {() => boolean} o.libre    ¿se puede pasear? (false si hay modal/onboarding)
 */
export function makePaseo({ camera, controls, perros, compai, libre }) {
  const pos = new THREE.Vector3();      // a dónde quiere ir la cámara
  const mira = new THREE.Vector3();     // a dónde quiere mirar
  const miraActual = new THREE.Vector3();
  const _v = new THREE.Vector3(), _w = new THREE.Vector3();
  const rumbo = new THREE.Vector3(0, 0, 1);   // rumbo suavizado del guía
  const ultPos = new THREE.Vector3();         // su puesto del cuadro anterior

  let ultimaMano = performance.now();
  let puedoPrevio = false;   // flanco de subida de libre(): re-arma los 10 s
  let activo = false;
  let arranque = 0;            // t del enganche (para la entrada suave)
  let finTurno = 0;
  let quien = null;            // 'Dante' | 'Oliver' | 'compai'
  let previo = null;           // para no repetir guía
  let plan = null;             // el sorteo de este turno
  let tUlt = 0;

  // ── 1. CUALQUIER INTERACCIÓN CORTA, EN EL ACTO ───────────────────────────
  // En fase de CAPTURA: corre antes que los manejadores del valle, así que el
  // primer toque ya devuelve el control aunque además abra un mundo.
  function cortar() {
    ultimaMano = performance.now();
    if (!activo) return;
    activo = false;
    quien = null; plan = null;
    if (compai && compai.soltar) compai.soltar();
    // el control vuelve DONDE ESTÁ la cámara: el target se planta sobre la
    // visual actual, así no hay tirón al primer `controls.update()`.
    camera.getWorldDirection(_v);
    controls.target.copy(camera.position).addScaledVector(_v, camera.position.distanceTo(miraActual) || 200);
    controls.enabled = true;
    controls.update();
  }
  for (const ev of ['pointerdown', 'wheel', 'keydown', 'touchstart']) {
    addEventListener(ev, cortar, { capture: true, passive: true });
  }

  // ── 2. A QUIÉN SE SIGUE ──────────────────────────────────────────────────
  // El azar de la casa: ponderado y sin repetir el anterior. El compAI pesa
  // más que cada perro por separado (es el compañero elegido por el usuario),
  // pero entre los dos perros suman casi lo mismo: los tres guían.
  function sortear() {
    const vivos = perros() || [];
    const mesa = {};
    for (const p of vivos) mesa[p.nombre] = { peso: 1 };
    if (compai && compai.pos && compai.pos()) mesa.compai = { peso: 1.6 };
    const el = elegirSinRepetir(mesa, previo);
    if (!el) return null;
    previo = el;
    const perfil = el === 'compai' ? ESCOLTA.compai : ESCOLTA.perro;
    const r = Math.random;
    return {
      quien: el,
      dist: lerp(perfil.dist[0], perfil.dist[1], r()),
      alto: lerp(perfil.alto[0], perfil.alto[1], r()),
      lado: lerp(perfil.lado[0], perfil.lado[1], r()),
      mira: perfil.mira,
      fase: r() * Math.PI * 2,            // el vaivén arranca en otro sitio
      giro: r() < 0.5 ? -1 : 1,           // y a veces al otro lado
    };
  }

  function puestoDe(nombre) {
    if (nombre === 'compai') return compai && compai.pos ? compai.pos() : null;
    const p = (perros() || []).find((x) => x.nombre === nombre);
    return p ? p.obj.position : null;
  }

  // ── 3. EL BUCLE ──────────────────────────────────────────────────────────
  function update(t) {
    const dt = Math.min(tUlt ? t - tUlt : 0.016, 0.1); tUlt = t;
    const ahora = performance.now();
    const puedo = libre ? libre() : true;

    // ── EL RELOJ ARRANCA **DESPUÉS DE LA ENTRADA**, no al cargar la página ──
    // Bug medido en la primera corrida: el paseo se disparaba en el segundo 11,
    // o sea EN EL INSTANTE en que aterrizaba el vuelo. Causa: `ultimaMano` se
    // sembraba al construir el módulo, y como durante los 11 s de entrada
    // cinematográfica el usuario no toca nada, los 10 s ya se habían cumplido
    // antes de que el valle existiera. El operador pidió «**después de la
    // entrada**, 10 segundos sin interacción» — así que el contador se re-arma
    // en el flanco de subida de `libre()`: al terminar el vuelo, y también al
    // cerrar un modal o al volver a la pestaña. Siempre 10 s de valle quieto.
    if (puedo && !puedoPrevio) ultimaMano = ahora;
    puedoPrevio = puedo;

    if (!puedo) { if (activo) cortar(); return; }

    // ¿arranca? 10 s de quietud desde la última mano del usuario
    if (!activo) {
      if (ahora - ultimaMano < QUIETO_MS) return;
      plan = sortear();
      if (!plan) return;
      quien = plan.quien;
      activo = true;
      arranque = t;
      finTurno = t + lerp(TURNO_S[0], TURNO_S[1], Math.random());
      controls.enabled = false;               // el paseo manda mientras dura
      miraActual.copy(controls.target);
      const P0 = puestoDe(quien);
      if (P0) ultPos.copy(P0);                // sin esto el primer delta es enorme
      if (quien === 'compai' && compai.husmear) compai.husmear();
    }

    const P = puestoDe(quien);
    if (!P) { cortar(); return; }             // se fue el guía: se suelta y ya

    // ── el puesto de escolta: detrás del guía, sobre su propio rumbo ───────
    // Se saca del MOVIMIENTO REAL del guía, no de un ángulo fijo: la cámara va
    // literalmente detrás de quien camina, y cuando el guía dobla, la cámara
    // dobla con él — con retardo, que es lo que hace que no maree.
    //
    // ⚠️ El primer intento sacaba el rumbo de `P − miraActual`. **Se ve en la
    // captura `p5-paseo.png` por qué está mal**: `miraActual` converge sobre el
    // guía, así que esa resta tiende a CERO y el rumbo se vuelve ruido — la
    // cámara se plantaba en cualquier lado y terminó mirando a Dante **a
    // plomo desde arriba**, como una foto de dron de un potrero vacío. El
    // rumbo se mide del desplazamiento de verdad, cuadro a cuadro, y se suaviza
    // (un perro que husmea cambia de dirección a cada paso; la cámara no puede).
    if (!rumbo.lengthSq()) rumbo.set(0, 0, 1);
    _w.copy(P).sub(ultPos); _w.y = 0;
    if (_w.lengthSq() > 1e-5) {
      _w.normalize();
      rumbo.lerp(_w, Math.min(1, dt * 1.1)).normalize();   // memoria larga: ~0,9 s
    }
    ultPos.copy(P);
    _v.copy(rumbo);
    const resp = Math.sin((t * Math.PI * 2) / RESPIRO_S + plan.fase) * plan.giro;
    // lateral = perpendicular al rumbo, con el vaivén lento encima
    const latX = -_v.z, latZ = _v.x;
    const desv = (plan.lado + resp * 0.22) * plan.dist;
    pos.set(
      P.x - _v.x * plan.dist + latX * desv,
      P.y + plan.alto + resp * plan.alto * 0.10,
      P.z - _v.z * plan.dist + latZ * desv,
    );
    // se mira un poco POR DELANTE del guía: se ve a dónde va, que es la parte
    // que enseña. Mirarle la cola no cuenta nada.
    mira.set(P.x + _v.x * plan.mira * 2.2, P.y + plan.mira, P.z + _v.z * plan.mira * 2.2);

    // ── el enganche: los primeros segundos son una transición larga ────────
    const k = Math.min((t - arranque) / ENTRADA_S, 1);
    const f = k < 1 ? lerp(SUAVE, 1, suavizar(k)) * 0.045 + SUAVE : SUAVE;
    camera.position.lerp(pos, Math.min(1, f * dt * 60));
    miraActual.lerp(mira, Math.min(1, f * dt * 60 * 1.35));
    camera.lookAt(miraActual);

    // ── el relevo: se pasa a otro guía sin cortar el movimiento ───────────
    if (t > finTurno) {
      const nuevo = sortear();
      if (nuevo) {
        plan = nuevo; quien = plan.quien;
        arranque = t;                          // otra entrada larga, no un corte
        const Pn = puestoDe(quien);
        if (Pn) ultPos.copy(Pn);
        finTurno = t + lerp(TURNO_S[0], TURNO_S[1], Math.random());
        if (compai && compai.soltar) compai.soltar();
        if (quien === 'compai' && compai.husmear) compai.husmear();
      } else {
        finTurno = t + 8;
      }
    }
  }

  return {
    update,
    cortar,
    // para el gate: saber si está paseando y a quién
    estado: () => ({ activo, quien, desde: activo ? arranque : null }),
    // el gate necesita forzarlo sin esperar 10 s reales
    forzar: () => { ultimaMano = 0; },
  };
}
