/*
 * telar — LA RED, VIVA. El servicio hecho estado.
 *
 * Aquí se teje lo que este mundo quiere que se entienda. La red de micorrizas
 * (`micorrizas.geom.js`) reparte BAJO tierra: la mata da carbono, el hongo
 * devuelve fósforo. Esta red reparte ARRIBA, en el aire, y es el mismo trato:
 * la flor paga NÉCTAR, el bicho carga POLEN y de paso lo reparte. Misma gramática
 * —nodos, hilos, trueque—, otro medio.
 *
 * Pero hay una diferencia que lo cambia todo: la red del hongo YA ESTÁ AHÍ. Esta
 * hay que TEJERLA todos los días, vuelo por vuelo, y se puede CORTAR en una tarde
 * con una bomba de espalda. Por eso aquí los hilos no se hornean: nacen, se
 * cansan y se apagan. Lo que se ve es un tejido que se sostiene solo mientras
 * haya quien lo teja.
 *
 * ── LA REGLA HONESTA ────────────────────────────────────────────────────────
 * Una visita NO es polinización. Que una abeja se pare en una flor y se tome el
 * néctar no hace fruta: hace falta que el polen VIAJE de una flor a otra. Por eso
 * el telar solo teje hilo cuando el bicho llega a una flor CON polen encima de
 * otra flor. El hilo es el viaje del polen, no el paseo del bicho.
 *
 *   hilo PUENTE  → el polen cruzó entre dos flores de la MISMA mata: eso es lo
 *                  que cuaja. Va más claro y aporta el servicio completo.
 *                  (En la ahuyama, el puente macho→hembra es EL acontecimiento:
 *                  esa bolita o se hincha o se cae, y depende de este hilo.)
 *   hilo suelto  → el polen viajó entre zonas distintas (el corredor de la cerca
 *                  viva, el monte al cultivo). No cuaja ese fruto, pero mantiene
 *                  viva la red. Aporta menos, y aporta.
 *
 * El SERVICIO de cada cultivo se acumula con los hilos y SE DESVANECE con el
 * tiempo: no es una medalla que se gana una vez. Si el enjambre se va, el
 * servicio baja solo, y con él la cosecha. Nadie tiene que explicarlo.
 *
 * Cero react, cero geometría y —a propósito— CERO THREE: esto es puro estado, y
 * three pesa. Los puntos son `{x,y,z}` planos, que es todo lo que la Bézier de
 * `RedPolinizacion` necesita leer. Así el telar viaja en el bundle base, se puede
 * exportar desde el barrel y se testea headless sin levantar un contexto GL.
 * `RedPolinizacion.jsx` lo dibuja, `EnjambrePolinizadores.jsx` lo teje y
 * `ParcelaCultivos.jsx` le cobra.
 */

/** Punto plano (lo que un hilo necesita saber de una flor: dónde está). */
const punto = () => ({ x: 0, y: 0, z: 0 });

/** Copia a `out` desde un arreglo [x,y,z] o cualquier cosa con x/y/z. */
function copiar(out, v) {
  if (Array.isArray(v)) {
    out.x = v[0]; out.y = v[1]; out.z = v[2];
  } else {
    out.x = v.x; out.y = v.y; out.z = v.z;
  }
  return out;
}

/** Distancia entre dos puntos planos. */
function distancia(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/* Cuánto dura un hilo antes de apagarse (s). La red es un tejido que se
   mantiene: si nadie repone, se deshace sola. */
const VIDA_HILO = 13;
const VIDA_PUENTE = 20; // el que cuajó dura más: dejó fruta, dejó memoria

/* Con qué rapidez se olvida el servicio (s). Alto a propósito: la cosecha no se
   pierde por un mal rato, pero tampoco se sostiene sin trabajo. */
const TAU_SERVICIO = 26;

/* Cuánto aporta un hilo al servicio de su cultivo. Calibrado para que un
   enjambre sano llegue cerca de 1 y uno diezmado se quede corto. */
const APORTE_PUENTE = 0.16;
const APORTE_SUELTO = 0.04;

/**
 * Crea el telar del mundo.
 * @param {{capacidad?: number}} [opt] capacidad = cuántos hilos caben a la vez
 *   (viene del presupuesto por tier; en gama baja la red es más rala, pero se
 *   sigue leyendo como red).
 */
export function crearTelar({ capacidad = 90 } = {}) {
  /* Pool fijo, anillo: nada de crear/soltar objetos por frame. El GC no debe
     enterarse de que este mundo existe. */
  const hilos = Array.from({ length: capacidad }, () => ({
    activo: false,
    a: punto(),
    b: punto(),
    mid: punto(),
    edad: 0,
    vida: VIDA_HILO,
    puente: false,
    muerto: false, // cortado por veneno: se apaga a ceniza, no se desvanece
    cultivo: null,
    bicho: null,
  }));
  let cursor = 0;

  /* El servicio acumulado por cultivo (0..1) y el conteo de lo que ha pasado
     (para que la escena pueda contar la historia sin inventar números). */
  const servicio = Object.create(null);
  const cuenta = { hilos: 0, puentes: 0, cortados: 0 };

  /**
   * Teje un hilo: el polen viajó de `a` a `b`.
   * @param {{x:number,y:number,z:number}|number[]} a  la flor de donde salió el polen
   * @param {{x:number,y:number,z:number}|number[]} b  la flor a donde llegó
   * @param {{cultivo?:string|null, puente?:boolean, bicho?:string}} [opt]
   */
  function tejer(a, b, { cultivo = null, puente = false, bicho = null } = {}) {
    const h = hilos[cursor];
    cursor = (cursor + 1) % capacidad;

    copiar(h.a, a);
    copiar(h.b, b);

    /* El hilo no va en línea recta: se arquea. Un bicho no viaja con regla — y
       además el arco deja ver la red como tejido, no como telaraña de alambre.
       Cuanto más largo el viaje, más alto el arco. */
    const dist = distancia(h.a, h.b);
    h.mid.x = (h.a.x + h.b.x) * 0.5;
    h.mid.y = (h.a.y + h.b.y) * 0.5 + 0.18 + dist * 0.22;
    h.mid.z = (h.a.z + h.b.z) * 0.5;

    h.activo = true;
    h.edad = 0;
    h.vida = puente ? VIDA_PUENTE : VIDA_HILO;
    h.puente = puente;
    h.muerto = false;
    h.cultivo = cultivo;
    h.bicho = bicho;

    cuenta.hilos++;
    if (puente) cuenta.puentes++;

    if (cultivo) {
      const aporte = puente ? APORTE_PUENTE : APORTE_SUELTO;
      servicio[cultivo] = Math.min(1, (servicio[cultivo] || 0) + aporte);
    }
    return h;
  }

  /**
   * El paso del tiempo: los hilos envejecen y el servicio se desvanece.
   * @param {number} dt segundos
   */
  function paso(dt) {
    for (let i = 0; i < hilos.length; i++) {
      const h = hilos[i];
      if (!h.activo) continue;
      h.edad += dt;
      if (h.edad >= h.vida) h.activo = false;
    }
    // El olvido: exponencial, suave. Sin trabajo nuevo, la red se apaga sola.
    const k = Math.exp(-dt / TAU_SERVICIO);
    for (const c in servicio) {
      servicio[c] *= k;
      if (servicio[c] < 0.0005) servicio[c] = 0;
    }
  }

  /**
   * EL VENENO. No borra la red de un tajo: la MATA. Los hilos alcanzados se
   * quedan colgando, cenizos, y se apagan — un tejido roto se ve peor que un
   * tejido ausente, y esa es exactamente la sensación que hay que dejar.
   * @param {number} fraccion 0..1 cuánto de la red alcanza la deriva
   */
  function cortar(fraccion = 0.8) {
    for (let i = 0; i < hilos.length; i++) {
      const h = hilos[i];
      if (!h.activo || h.muerto) continue;
      if (Math.random() < fraccion) {
        h.muerto = true;
        // Le quedan unos segundos de agonía visible y se va.
        h.vida = Math.min(h.vida, h.edad + 2.6);
        cuenta.cortados++;
      }
    }
    // Y con la red se cae la cosecha: el servicio se desploma.
    for (const c in servicio) servicio[c] *= 1 - fraccion * 0.9;
  }

  /** El servicio que recibe un cultivo ahora (0..1). */
  const servicioDe = (cultivo) => servicio[cultivo] || 0;

  /** Cuántos hilos hay vivos (para el pulso de la escena y el HUD). */
  function vivos() {
    let n = 0;
    for (let i = 0; i < hilos.length; i++) if (hilos[i].activo) n++;
    return n;
  }

  /** Qué tan tejida está la red entera (0..1) — el latido del mundo. */
  const salud = () => vivos() / capacidad;

  /** Borra todo (cambio de tier / desmontaje). */
  function limpiar() {
    for (let i = 0; i < hilos.length; i++) {
      hilos[i].activo = false;
      hilos[i].muerto = false;
    }
    for (const c in servicio) delete servicio[c];
    cuenta.hilos = cuenta.puentes = cuenta.cortados = 0;
  }

  return { hilos, capacidad, tejer, paso, cortar, servicio, servicioDe, vivos, salud, cuenta, limpiar };
}

/**
 * ¿ESTE POLEN SIRVE DE ALGO?
 *
 * La regla más importante del mundo, y la que casi nadie dibuja: el polen solo
 * cuenta entre flores de LA MISMA PLANTA. Polen de café en una flor de ahuyama
 * no hace nada — se pierde. Que dos flores compartan síndrome (las dos moradas,
 * las dos con guías de néctar) no las hace la misma especie: las hace clientas
 * del mismo mensajero.
 *
 * Por eso este mundo NO teje hilo cada vez que un bicho se para en una flor. Un
 * bicho paseando no poliniza: poliniza el polen que VIAJA entre iguales. Tejer
 * por cada visita sería una red bonita y falsa.
 *
 * @param {{i:number, planta:string}} desde  la flor donde cargó el polen
 * @param {{i:number, planta:string}} hasta  la flor donde lo dejó
 */
export function polenSirve(desde, hasta) {
  if (!desde || !hasta) return false;
  return desde.planta === hasta.planta && desde.i !== hasta.i;
}

/**
 * ¿Este viaje de polen CUAJA FRUTO?
 *
 * Solo si el polen sirvió (misma planta) Y esa planta es un cultivo que cobra.
 * Y en la ahuyama hay una condición más, que es la lección entera de esa mata:
 * su flor macho y su flor hembra están SEPARADAS, así que el polen tiene que
 * hacer el viaje exacto macho→hembra. Ninguna otra combinación sirve — ni
 * macho→macho, ni hembra→hembra. Si nadie hace ese viaje, la bolita se cae.
 *
 * Los hilos sobre el monte y la cerca viva no cuajan cosecha y IGUAL se tejen:
 * ahí se están reproduciendo las plantas silvestres. Ese también es el servicio,
 * aunque no tenga precio en el mercado.
 *
 * @param {{i:number, planta:string, cultivo:string|null, sexo:string|null}} desde
 * @param {{i:number, planta:string, cultivo:string|null, sexo:string|null}} hasta
 * @returns {boolean}
 */
export function esPuente(desde, hasta) {
  if (!polenSirve(desde, hasta)) return false;
  if (!hasta.cultivo) return false;
  if (desde.sexo && hasta.sexo) return desde.sexo === 'macho' && hasta.sexo === 'hembra';
  return true;
}
