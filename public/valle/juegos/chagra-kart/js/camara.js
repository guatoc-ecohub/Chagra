// ── camara.js — chase cam suavizada detrás del kart ─────────────────────────
// Sigue al vehículo por detrás (contra el vector de velocidad, que durante el
// derrape NO coincide con la carrocería: s.velHdg). Amortiguación exponencial,
// FOV que sube con la velocidad y el turbo, inclinación de cámara en derrape y
// traqueteo acumulado (trauma) por impacto/derrape/turbo. Ajustada para no
// perforar el terreno: la cámara nunca baja de `yMin` sobre el suelo.
import * as THREE from 'three';

const RAD = Math.PI / 180;

// Dos encuadres, y el modo se puede cambiar EN CALIENTE. Antes eran tres
// constantes fijadas al arrancar a partir de `cfg.movil`; girar el aparato no
// las revisaba nunca, así que un teléfono que arrancaba en retrato conservaba el
// encuadre de retrato en apaisado y al revés.
const ENCUADRE = {
  amplio: { fov: 62, dist: 9.2, alto: 4.0 },    // escritorio y tablet
  compacto: { fov: 70, dist: 8.2, alto: 3.6 },  // pantalla de teléfono
};

export function crearCamara(THREE, camara, cfg = {}) {
  let compacto = !!(cfg.compacto ?? cfg.movil);
  let meta = compacto ? ENCUADRE.compacto : ENCUADRE.amplio;
  // Movimiento reducido: apaga la sacudida por trauma (traqueteo de impacto).
  // Es lo único vestibular que hace esta cámara; el seguimiento y el FOV con
  // velocidad son la mecánica del kart y se conservan.
  let reduced = false;
  const cam = {
    dist: meta.dist,           // metros detrás
    alto: meta.alto,           // metros arriba
    baseFov: meta.fov,         // encuadre de reposo (viaja hacia `meta.fov`)
    lookAltura: 1.5,
    fov: meta.fov,
    trauma: 0,
    roll: 0,
    _pos: new THREE.Vector3(),
    _look: new THREE.Vector3(),
  };

  // posición suave previa (inicializada en el primer frame)
  let curPos = null;
  let aspectoAnt = camara.aspect;
  const _fwd = new THREE.Vector3();
  const _shake = new THREE.Vector3();

  function sacudir(mag) {
    if (reduced) return;
    cam.trauma = Math.min(1, cam.trauma + mag);
  }

  function setReducedMotion(v) { reduced = !!v; }

  /**
   * Cambia de encuadre sin cortar: `actualizar` interpola los tres números.
   * @returns {boolean} true si el modo cambió de verdad.
   */
  function setModo(nuevoCompacto) {
    const c = !!nuevoCompacto;
    if (c === compacto) return false;
    compacto = c;
    meta = c ? ENCUADRE.compacto : ENCUADRE.amplio;
    return true;
  }

  // ── LA CONTINUIDAD AL ROTAR ───────────────────────────────────────────────
  // El tirón que reportó el operador NO era la cámara moviéndose: la posición de
  // la cámara no salta al rotar (medido 2026-08-08: 0,47 m/cuadro en reposo y
  // 0,46 m/cuadro durante la rotación, o sea nada). Lo que saltaba era el campo
  // de visión HORIZONTAL, 80,28° EN UN SOLO CUADRO contra 0,02°/cuadro en reposo
  // — 4.000 veces más. Causa: `redimensionar()` cambiaba `camara.aspect` y dejaba
  // el FOV vertical clavado, y hFov = 2·atan(tan(vFov/2)·aspect). Con el aspecto
  // pasando de 0,45 a 2,22 al girar, el mundo se hacía cinco veces más ancho de
  // golpe. Eso es «se mueve el juego horrible».
  //
  // El arreglo no es esconder el cambio: es repartirlo en el tiempo. En el cuadro
  // del cambio se calcula el FOV vertical que CONSERVA EXACTAMENTE el horizontal
  // que se estaba viendo, y esa diferencia se guarda como una CORRECCIÓN que
  // decae con reloj propio. Importa que sea propio: si se dejaba que el suavizado
  // normal absorbiera el hueco, el primer cuadro después de rotar es largo (37 ms
  // medidos: reasignar los buffers del renderer cuesta) y se comía de un saque el
  // 14 % del salto — 11,4° de golpe. Con la corrección aparte y el dt acotado, el
  // primer cuadro no se mueve nada y el zoom sale parejo.
  let corrFov = 0;
  function reencuadrar() {
    const nuevo = camara.aspect;
    if (!(nuevo > 0) || !(aspectoAnt > 0)) { aspectoAnt = nuevo; return false; }
    // Cambios minúsculos (la barra de direcciones del móvil que se esconde) no
    // merecen transitorio: compensarlos sería un temblor permanente de FOV.
    if (Math.abs(nuevo - aspectoAnt) / aspectoAnt < 0.02) { aspectoAnt = nuevo; return false; }
    const hAntes = 2 * Math.atan(Math.tan((cam.fov * RAD) / 2) * aspectoAnt);
    aspectoAnt = nuevo;
    const vCont = Math.max(15, Math.min(140, (2 * Math.atan(Math.tan(hAntes / 2) / nuevo)) / RAD));
    corrFov = vCont - fovBase();   // el hueco entero, a repartir
    cam.fov = vCont;               // y en ESTE cuadro no se mueve nada
    camara.fov = cam.fov;
    camara.updateProjectionMatrix();
    return true;
  }

  // En retrato, con el FOV vertical fijo en 70° y aspecto 0,45, quedan 36°
  // HORIZONTALES: un túnel en el que no se ve entrar la curva (medido en la
  // captura de retrato). Solo en modo compacto se ensancha lo justo para ver el
  // camino. El escritorio no pasa por aquí nunca: su ventana siempre es más ancha
  // que alta, y con aspecto ≥ 1 esto devuelve el FOV base sin tocarlo.
  const H_MIN_RETRATO = 52 * RAD;
  function fovBase() {
    const a = camara.aspect;
    if (!compacto || !(a > 0) || a >= 1) return cam.baseFov;
    const vNec = (2 * Math.atan(Math.tan(H_MIN_RETRATO / 2) / a)) / RAD;
    return Math.min(96, Math.max(cam.baseFov, vNec));
  }

  function actualizar(dt, s, opts = {}) {
    // el encuadre viaja hacia su meta: cambiar de modo es un desplazamiento
    // suave, nunca un corte. Con dt normal (16 ms) tarda ~1 s en llegar.
    // El dt va acotado: el cuadro de la rotación es largo y sin tope se comería
    // media transición justo en el instante que se quiere suave.
    const dtSuave = Math.min(dt, 1 / 30);
    const kMeta = 1 - Math.exp(-3 * dtSuave);
    cam.dist += (meta.dist - cam.dist) * kMeta;
    cam.alto += (meta.alto - cam.alto) * kMeta;
    cam.baseFov += (meta.fov - cam.baseFov) * kMeta;
    corrFov *= Math.exp(-2.2 * dtSuave);
    if (Math.abs(corrFov) < 0.05) corrFov = 0;

    // detrás del vector de velocidad (no de la carrocería)
    const h = s.velHdg ?? s.hdg;
    _fwd.set(Math.cos(h), 0, Math.sin(h));

    const objetivo = _fwd.clone().multiplyScalar(-cam.dist);
    objetivo.y = cam.alto;
    const destino = new THREE.Vector3(s.x + objetivo.x, s.y + objetivo.y, s.z + objetivo.z);

    // desvío lateral durante el derrape: la cámara cede hacia el patín
    if (s.drift?.act) {
      const lado = _fwd.clone().cross(new THREE.Vector3(0, 1, 0)).multiplyScalar(-s.drift.dir * 0.9);
      destino.add(lado);
    }

    // amortiguación exponencial
    const k = 1 - Math.exp(-(opts.rigidez ?? 5.2) * dt);
    if (!curPos) curPos = destino.clone();
    else curPos.lerp(destino, k);

    // no perforar terreno: la cámara nunca baja de un metro sobre el carro
    curPos.y = Math.max(curPos.y, s.y + 0.8);

    // traqueteo por trauma (decae 3.5/s)
    cam.trauma = Math.max(0, cam.trauma - dt * 3.5);
    const t2 = cam.trauma * cam.trauma;
    _shake.set(
      (Math.random() - 0.5) * 2 * t2 * 0.35,
      (Math.random() - 0.5) * 2 * t2 * 0.35,
      0,
    );
    camara.position.copy(curPos).add(_shake);

    // mira hacia un punto adelante del carro (sobre el vector de velocidad)
    const lookAhead = 6 + Math.abs(s.vel) * 0.35;
    cam._look.set(
      s.x + Math.cos(h) * lookAhead,
      s.y + cam.lookAltura,
      s.z + Math.sin(h) * lookAhead,
    );
    camara.lookAt(cam._look);

    // FOV: base + velocidad (arriba de ~60% del tope) + turbo
    const velRatio = Math.min(1, Math.abs(s.vel) / 30);
    const fovObjetivo = fovBase() + corrFov
      + Math.max(0, velRatio - 0.6) * 8
      + (s.turbo ? 5 + s.turbo.nivel * 2.5 : 0)
      + (s.drift?.act ? 3 : 0);
    cam.fov += (fovObjetivo - cam.fov) * (1 - Math.exp(-4 * dtSuave));
    camara.fov = cam.fov;
    camara.updateProjectionMatrix();

    // inclinación (roll): derrape y giro fuerte — se aplica DESPUÉS de lookAt
    // (que resetea el roll), así la suma es aditiva y suave.
    const giro = s._yaw ? s._yaw.girar : 0;
    const rollObj = -giro * 0.05 - (s.drift?.act ? s.drift.dir * 0.05 : 0);
    cam.roll += (rollObj - cam.roll) * (1 - Math.exp(-6 * dt));
    camara.rotateZ(cam.roll);
  }

  return { actualizar, sacudir, cam, setModo, setReducedMotion, reencuadrar };
}
