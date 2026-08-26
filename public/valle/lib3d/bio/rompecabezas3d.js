/**
 * rompecabezas3d.js — motor REUSABLE de rompecabezas 3D "arma-la-cosa".
 *
 * Genérico a propósito: no sabe nada de células ni de plantas. Recibe una lista
 * de PIEZAS (cada una un THREE.Object3D + su pose objetivo) y resuelve:
 *   - drag 3D real de piezas sueltas, delegado a lib3d/controls/DragControls.js
 *     (three.js core, MIT) — no reinventa raycasting/plano-de-arrastre a mano.
 *   - snapping magnético propio (~30 líneas, ver `_evaluarSnap`) enganchado a los
 *     eventos 'drag'/'dragend' de DragControls: cuando la pieza sostenida entra en
 *     su radioSnap se resalta (feedback) y al soltar, si sigue dentro, se encaja.
 *   - animación de encaje (anime.js si está disponible, si no un tween lineal propio)
 *   - callback onPiezaColocada(pieza) → quien llama muestra la ficha educativa
 *   - callback onPiezaCerca(pieza|null) → quien llama puede mostrar/ocultar un label
 *     CSS2D "esta va aquí" sobre el hueco de destino mientras se arrastra cerca
 *   - progreso (piezasColocadas/total) + callback onCompleto()
 *
 * Mañana sirve para armar CUALQUIER cosa 3D: célula hoy, motor/flor/lo que sea
 * mañana — el llamador solo define las piezas y sus sitios.
 *
 * Uso mínimo:
 *   const puzzle = new Rompecabezas3D({ renderer, camera, scene });
 *   puzzle.agregarPieza({ id:'nucleo', mesh, posSuelta:new Vector3(...), posDestino:new Vector3(0,0,0),
 *                          rotDestino:new Euler(0,0,0), radioSnap:0.9, ficha:{...} });
 *   puzzle.iniciar();
 *   // en el loop de render:
 *   puzzle.tick(dt);
 */

import * as THREE from 'three';
import { DragControls } from 'three/addons/controls/DragControls.js';

// anime.js es opcional: si el módulo global lo expuso, lo usamos para el "pop" de encaje.
let animeMod = null;
try {
  animeMod = await import('../vendor/anime.esm.js');
} catch (e) {
  animeMod = null;
}

export class Pieza {
  constructor(cfg) {
    this.id = cfg.id;
    this.mesh = cfg.mesh;                     // THREE.Object3D (Group) — la pieza visual completa
    // pickHelper: mesh invisible HERMANO de `mesh` en la escena (mismo espacio mundial, sin
    // padre) que es lo que se le pasa realmente a DragControls. Ver celula.js:crearPiezas para
    // el porqué (DragControls con raycast recursivo movería un sub-mesh interno del Group, no
    // el Group completo, si se le pasara `mesh` directo). Si el llamador no provee uno (piezas
    // de un puzzle futuro con un solo mesh sin hijos), se usa `mesh` mismo como su propio proxy.
    this.pickHelper = cfg.pickHelper || cfg.mesh;
    this.posSuelta = cfg.posSuelta.clone();
    this.posDestino = cfg.posDestino.clone();
    this.rotDestino = cfg.rotDestino ? cfg.rotDestino.clone() : new THREE.Euler(0, 0, 0);
    this.radioSnap = cfg.radioSnap ?? 0.8;
    this.ficha = cfg.ficha || null;           // { titulo, funcion, agro, color }
    this.colocada = false;
    this.sostenida = false;
    this.mesh.position.copy(this.posSuelta);
    this.pickHelper.position.copy(this.posSuelta);
    this.mesh.userData.piezaId = this.id;
    this.pickHelper.userData.piezaId = this.id;
  }

  distanciaADestino() {
    return this.mesh.position.distanceTo(this.posDestino);
  }
}

export class Rompecabezas3D {
  /**
   * @param {Object} o
   * @param {THREE.WebGLRenderer} o.renderer
   * @param {THREE.PerspectiveCamera} o.camera
   * @param {THREE.Scene} o.scene
   * @param {HTMLElement} [o.dom] - elemento que escucha eventos (default renderer.domElement)
   * @param {Function} [o.onPiezaColocada] - (pieza) => void
   * @param {Function} [o.onPiezaLevantada] - (pieza) => void
   * @param {Function} [o.onCompleto] - () => void
   * @param {Function} [o.onProgreso] - (colocadas, total) => void
   * @param {Function} [o.onArrastreInicio] - () => void — el llamador debe pausar OrbitControls aquí
   * @param {Function} [o.onArrastreFin] - () => void — el llamador debe reanudar OrbitControls aquí
   * @param {Function} [o.onPiezaCerca] - (pieza|null) => void — pieza sostenida entró/salió del radioSnap
   *                                        (el llamador engancha aquí el label CSS2D "esta va aquí")
   */
  constructor(o) {
    this.renderer = o.renderer;
    this.camera = o.camera;
    this.scene = o.scene;
    this.dom = o.dom || o.renderer.domElement;
    this.onPiezaColocada = o.onPiezaColocada || (() => {});
    this.onPiezaLevantada = o.onPiezaLevantada || (() => {});
    this.onCompleto = o.onCompleto || (() => {});
    this.onProgreso = o.onProgreso || (() => {});
    this.onArrastreInicio = o.onArrastreInicio || (() => {});
    this.onArrastreFin = o.onArrastreFin || (() => {});
    this.onPiezaCerca = o.onPiezaCerca || (() => {});

    /** @type {Pieza[]} */
    this.piezas = [];
    this.habilitado = true;     // false = modo "explorar", puzzle pausado
    this._porPickHelper = new Map(); // pickHelper -> Pieza (DragControls opera sobre pickHelper, ver Pieza)
    this._activa = null;        // Pieza sostenida ahora mismo
    this._cerca = false;        // ¿la pieza activa está dentro de su radioSnap ahora mismo?

    // ---------- DragControls real (lib3d/controls/DragControls.js, three.js core MIT) ----------
    // Gobierna el drag 3D (raycasting + plano-de-arrastre perpendicular a cámara) — el motor
    // del puzzle NO reimplementa esa parte, solo escucha sus eventos y les agrega snapping.
    this._drag = new DragControls([], this.camera, this.dom);
    this._drag.transformGroup = false;
    this._drag.addEventListener('dragstart', (ev) => this._onDragStart(ev));
    this._drag.addEventListener('drag', (ev) => this._onDrag(ev));
    this._drag.addEventListener('dragend', (ev) => this._onDragEnd(ev));
  }

  agregarPieza(cfg) {
    const p = new Pieza(cfg);
    this.piezas.push(p);
    this._porPickHelper.set(p.pickHelper, p);
    return p;
  }

  get total() { return this.piezas.length; }
  get colocadas() { return this.piezas.filter(p => p.colocada).length; }
  get completo() { return this.total > 0 && this.colocadas === this.total; }

  iniciar() {
    // fuerza cada pieza a su posición suelta (por si se llama iniciar() de nuevo = reset)
    for (const p of this.piezas) {
      p.colocada = false;
      p.mesh.position.copy(p.posSuelta);
      p.mesh.rotation.set(
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 1.2
      );
      p.mesh.visible = true;
      p.pickHelper.position.copy(p.posSuelta); // el proxy de arrastre vuelve a viajar junto al mesh
      p.pickHelper.visible = true;
    }
    this._sincronizarObjetosArrastrables();
    this.onProgreso(this.colocadas, this.total);
  }

  setHabilitado(v) {
    this.habilitado = v;
    this._drag.enabled = v;
    if (!v && this._activa) this._activa = null;
  }

  /** DragControls solo debe poder agarrar piezas SUELTAS (no las ya colocadas). */
  _sincronizarObjetosArrastrables() {
    const objetos = this.piezas.filter(p => !p.colocada && p.mesh.visible).map(p => p.pickHelper);
    this._drag.getObjects().length = 0;
    this._drag.getObjects().push(...objetos);
  }

  // ---------- handlers de DragControls (operan sobre pickHelper, ver clase Pieza) ----------
  _onDragStart(ev) {
    if (!this.habilitado) return;
    const pieza = this._porPickHelper.get(ev.object);
    if (!pieza) return;
    this._activa = pieza;
    this._cerca = false;
    pieza.sostenida = true;
    this.onPiezaLevantada(pieza);
    this.onArrastreInicio();
  }

  _onDrag(ev) {
    if (!this._activa) return;
    // DragControls movió el pickHelper (proxy hermano, world-space) — reflejar esa posición
    // en el mesh visual real de la pieza, que es lo que efectivamente se ve/anima/snapea.
    this._activa.mesh.position.copy(this._activa.pickHelper.position);
    // --- snapping magnético (propio, ~15 líneas): mientras se arrastra, si la pieza entra
    // al radio de su sitio, la "atrae" suavemente hacia el destino exacto (magnetismo, no
    // teletransporte) y dispara feedback (resaltado + label CSS2D vía onPiezaCerca). ---
    this._evaluarSnap(this._activa);
  }

  _onDragEnd(ev) {
    if (!this._activa) return;
    const pieza = this._activa;
    pieza.sostenida = false;
    this._activa = null;
    this.onArrastreFin();

    const d = pieza.distanciaADestino();
    if (d <= pieza.radioSnap) {
      this._encajar(pieza);
    } else if (this._cerca) {
      this._cerca = false;
      this.onPiezaCerca(null);
    }
  }

  /** Snapping magnético: atrae la pieza sostenida (mesh + su pickHelper, en sync) hacia posDestino. */
  _evaluarSnap(pieza) {
    const d = pieza.distanciaADestino();
    const radioImanado = pieza.radioSnap * 1.6; // halo de atracción, mayor que el radio de encaje real
    const dentro = d <= radioImanado;

    if (dentro) {
      // fuerza de atracción proporcional a qué tan cerca del borde del halo está (0..1),
      // más fuerte cuanto más cerca del centro — sensación de "imán", no de salto brusco.
      const fuerza = THREE.MathUtils.clamp(1 - d / radioImanado, 0, 1) * 0.35;
      pieza.mesh.position.lerp(pieza.posDestino, fuerza);
      pieza.pickHelper.position.copy(pieza.mesh.position); // el proxy sigue al mesh, no al revés, mientras imana
    }
    if (dentro !== this._cerca) {
      this._cerca = dentro;
      this.onPiezaCerca(dentro ? pieza : null);
    }
    if (pieza.mesh.userData.setResaltado) pieza.mesh.userData.setResaltado(dentro);
  }

  _encajar(pieza) {
    pieza.colocada = true;
    pieza.mesh.userData.setResaltado?.(false);
    this._cerca = false;
    this.onPiezaCerca(null);
    this._sincronizarObjetosArrastrables(); // ya no debe ser agarrable
    const posIni = pieza.mesh.position.clone();

    if (animeMod && animeMod.animate) {
      // "pop" de encaje: overshoot leve de escala + asentar en pose exacta
      const escalaOriginal = pieza.mesh.scale.x || 1;
      animeMod.animate(pieza.mesh.position, {
        x: pieza.posDestino.x, y: pieza.posDestino.y, z: pieza.posDestino.z,
        duration: 420, ease: 'outBack',
      });
      animeMod.animate(pieza.mesh.rotation, {
        x: pieza.rotDestino.x, y: pieza.rotDestino.y, z: pieza.rotDestino.z,
        duration: 420, ease: 'outQuad',
      });
      animeMod.animate(pieza.mesh.scale, {
        x: [escalaOriginal, escalaOriginal * 1.18, escalaOriginal],
        y: [escalaOriginal, escalaOriginal * 1.18, escalaOriginal],
        z: [escalaOriginal, escalaOriginal * 1.18, escalaOriginal],
        duration: 480, ease: 'outElastic(1, .6)',
      });
    } else {
      // fallback sin anime.js: tween manual simple guardado para tick()
      const rotIni = pieza.mesh.rotation.clone();
      pieza._tween = { t: 0, dur: 0.4, posIni, rotIni };
    }

    this.onPiezaColocada(pieza);
    this.onProgreso(this.colocadas, this.total);
    if (this.completo) this.onCompleto();
  }

  /** Llamar cada frame. dt en segundos. Resuelve el fallback-tween si no hay anime.js. */
  tick(dt) {
    for (const p of this.piezas) {
      if (p._tween) {
        p._tween.t += dt;
        const k = Math.min(1, p._tween.t / p._tween.dur);
        const ease = 1 - Math.pow(1 - k, 3);
        p.mesh.position.lerpVectors(p._tween.posIni, p.posDestino, ease);
        p.mesh.rotation.x = THREE.MathUtils.lerp(p._tween.rotIni.x, p.rotDestino.x, ease);
        p.mesh.rotation.y = THREE.MathUtils.lerp(p._tween.rotIni.y, p.rotDestino.y, ease);
        p.mesh.rotation.z = THREE.MathUtils.lerp(p._tween.rotIni.z, p.rotDestino.z, ease);
        p.pickHelper.position.copy(p.mesh.position); // consistencia de estado (ya no es arrastrable, pero se mantiene alineado)
        if (k >= 1) p._tween = null;
      }
    }
  }

  dispose() {
    this._drag.dispose();
  }
}
