/*
 * directorValle — pruebas de la LÓGICA PURA de la cámara de director del valle.
 *
 * Se ejercita con una PerspectiveCamera real de three (solo matemática, sin
 * WebGL) y un stub de OrbitControls ({ target, update }). El corazón de la
 * suite es la GARANTÍA DURA: en modo 'fijo' (reduced-motion / tier bajo / flag
 * apagado) el director NO mueve la cámara ni un ápice.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import {
  modoDirector,
  crearDirector,
  pasoDirector,
  dispararBeat,
  anticiparEntrada,
  acelerarPresentacion,
  reclamarPresentacion,
  _resetPresentaciones,
  waypointsPresentacion,
  aplicarPoseInicial,
  easeViaje,
  SLUG_ENT,
  PRESENTACION_S,
  BEAT_COOLDOWN_S,
} from '../directorValle.js';

/** @type {[number, number, number]} */
const REPOSO = [10.5, 9, 13.5];
/** @type {[number, number, number]} */
const MIRA = [0, 1.6, 1.4];
const FOV = 40;

function nuevaCamara() {
  const cam = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  cam.position.set(...REPOSO);
  cam.lookAt(new THREE.Vector3(...MIRA));
  cam.updateMatrixWorld();
  return cam;
}

function nuevoControls(target = MIRA) {
  return { target: new THREE.Vector3(...target), update: () => {} };
}

/** Corre n frames del director a dt fijo, refrescando la matriz de la cámara. */
function correr(st, ctx, n, dt = 1 / 60) {
  let ultimo = false;
  for (let i = 0; i < n; i += 1) {
    ultimo = pasoDirector(st, { ...ctx, t: i * dt }, dt);
    ctx.camara.updateMatrixWorld();
  }
  return ultimo;
}

beforeEach(() => {
  _resetPresentaciones();
});

describe('modoDirector — gating por tier y calma', () => {
  test('tier alto y activo → cine', () => {
    expect(modoDirector({ activo: true, tier: 'alto', reducedMotion: false })).toBe('cine');
  });
  test('tier medio → sobrio', () => {
    expect(modoDirector({ tier: 'medio' })).toBe('sobrio');
  });
  test('tier bajo → fijo (regla dura)', () => {
    expect(modoDirector({ tier: 'bajo' })).toBe('fijo');
  });
  test('prefers-reduced-motion → fijo aunque el equipo sea alto', () => {
    expect(modoDirector({ tier: 'alto', reducedMotion: true })).toBe('fijo');
  });
  test('flag apagado (activo=false) → fijo', () => {
    expect(modoDirector({ activo: false, tier: 'alto' })).toBe('fijo');
  });
});

describe('modo fijo — el director NO mueve la cámara', () => {
  test('cámara y target quedan EXACTOS tras muchos frames, con avatar y beat pendientes', () => {
    const st = crearDirector({ modo: 'fijo', reposo: REPOSO, mira: MIRA, fov: FOV, presentar: true });
    expect(st.fase).toBe('gameplay'); // fijo nunca presenta
    const cam = nuevaCamara();
    const controls = nuevoControls();
    const posCam0 = cam.position.clone();
    const focal0 = cam.getFocalLength();
    const target0 = controls.target.clone();

    // Aunque el host pida beats y haya avatar moviéndose: en fijo, nada.
    st.beatPendiente = { tipo: 'fauna', lado: 'izq' };
    anticiparEntrada(st);
    const avatarPos = new THREE.Vector3(3, 4, 2);
    const conduce = correr(
      st,
      { camara: cam, controls, foco: new THREE.Vector3(...MIRA), avatarPos, entrando: false },
      120,
    );

    expect(conduce).toBe(false);
    expect(cam.position.distanceTo(posCam0)).toBe(0);
    expect(controls.target.distanceTo(target0)).toBe(0);
    expect(cam.getFocalLength()).toBe(focal0);
  });
});

describe('establishing — barrido que asienta en la pose jugable', () => {
  test('cine: arranca lejos, CONDUCE, y aterriza EXACTO en el reposo → gameplay', () => {
    const st = crearDirector({ modo: 'cine', reposo: REPOSO, mira: MIRA, fov: FOV, presentar: true });
    expect(st.fase).toBe('presenta');
    const cam = nuevaCamara();
    const controls = nuevoControls();
    const ctx = { camara: cam, controls, foco: new THREE.Vector3(...MIRA), avatarPos: null, entrando: false };

    // Primer frame: el barrido toma el control y salta al inicio de la curva
    // (bien lejos del reposo) — el director conduce.
    const conduce0 = pasoDirector(st, { ...ctx, t: 0 }, 1 / 60);
    cam.updateMatrixWorld();
    expect(conduce0).toBe(true);
    expect(cam.position.distanceTo(new THREE.Vector3(...REPOSO))).toBeGreaterThan(5);

    // Corre el barrido completo (6 s) + el asentamiento con margen.
    correr(st, ctx, Math.ceil((PRESENTACION_S.cine + 4) * 60));
    expect(st.fase).toBe('gameplay');
    expect(cam.position.distanceTo(new THREE.Vector3(...REPOSO))).toBeLessThan(0.02);
    // El target aterriza en la mira jugable salvo la RESPIRACIÓN del encuadre
    // (vaivén aditivo ~centímetros, igual que el CamaraDirector clásico).
    expect(controls.target.distanceTo(new THREE.Vector3(...MIRA))).toBeLessThan(0.12);
    expect(cam.getFocalLength()).toBeCloseTo(nuevaCamara().getFocalLength(), 1);
  });

  test('aplicarPoseInicial clava el arranque del barrido antes del primer frame', () => {
    const st = crearDirector({ modo: 'cine', reposo: REPOSO, mira: MIRA, fov: FOV, presentar: true });
    const cam = nuevaCamara();
    // Antes: la cámara está en el reposo (la del Canvas).
    expect(cam.position.distanceTo(new THREE.Vector3(...REPOSO))).toBeLessThan(0.001);
    aplicarPoseInicial(st, cam);
    // Después: saltó al primer punto del barrido (lejos del reposo), sin frames.
    expect(cam.position.distanceTo(new THREE.Vector3(...REPOSO))).toBeGreaterThan(5);
    expect(st.pres.arranco).toBe(true);
  });

  test('aplicarPoseInicial en modo fijo (sin presentación) no toca la cámara', () => {
    const st = crearDirector({ modo: 'fijo', reposo: REPOSO, mira: MIRA, fov: FOV, presentar: true });
    const cam = nuevaCamara();
    const pos0 = cam.position.clone();
    aplicarPoseInicial(st, cam);
    expect(cam.position.distanceTo(pos0)).toBe(0);
  });

  test('el barrido no repite dos veces por sesión (una-vez-por-clave)', () => {
    expect(reclamarPresentacion('valle')).toBe(true);
    expect(reclamarPresentacion('valle')).toBe(false);
    const st = crearDirector({
      modo: 'cine', reposo: REPOSO, mira: MIRA, fov: FOV,
      presentar: reclamarPresentacion('valle'),
    });
    expect(st.fase).toBe('gameplay'); // ya presentada: entra directo a jugar
  });

  test('el toque del usuario ACELERA la presentación (no la teletransporta)', () => {
    const st = crearDirector({ modo: 'cine', reposo: REPOSO, mira: MIRA, fov: FOV, presentar: true });
    const cam = nuevaCamara();
    const controls = nuevoControls();
    const ctx = { camara: cam, controls, foco: new THREE.Vector3(...MIRA), avatarPos: null, entrando: false };
    pasoDirector(st, { ...ctx, t: 0 }, 1 / 60);
    acelerarPresentacion(st);
    expect(st.pres.p).toBeGreaterThan(0.8);
    // Tras acelerar, el resto del barrido remata rápido y el resorte asienta.
    correr(st, ctx, 400);
    expect(st.fase).toBe('gameplay');
  });
});

describe('follow — la cámara se inclina hacia el avatar (con lead), acotado', () => {
  test('un avatar desplazado empuja el target un pelo, dentro del tope', () => {
    const st = crearDirector({ modo: 'cine', reposo: REPOSO, mira: MIRA, fov: FOV, presentar: false });
    expect(st.fase).toBe('gameplay');
    const cam = nuevaCamara();
    const controls = nuevoControls();
    const target0 = controls.target.clone();
    const foco = new THREE.Vector3(...MIRA);
    const avatarPos = new THREE.Vector3(MIRA[0] + 4, MIRA[1] + 1, MIRA[2] + 3);
    correr(st, { camara: cam, controls, foco, avatarPos, entrando: false }, 90);

    const desvio = controls.target.distanceTo(target0);
    expect(desvio).toBeGreaterThan(0.02); // sí sigue
    expect(desvio).toBeLessThan(1.4); // pero es un lean, no una persecución
  });

  test('entrando a un mundo, el follow del avatar se suelta (manda el foco)', () => {
    const st = crearDirector({ modo: 'cine', reposo: REPOSO, mira: MIRA, fov: FOV, presentar: false });
    const cam = nuevaCamara();
    const controls = nuevoControls();
    const target0 = controls.target.clone();
    const foco = new THREE.Vector3(...MIRA);
    const avatarPos = new THREE.Vector3(MIRA[0] + 5, MIRA[1], MIRA[2] + 5);
    correr(st, { camara: cam, controls, foco, avatarPos, entrando: true }, 90);
    // Solo queda la respiración mínima del encuadre (amplitud ~centímetros).
    expect(controls.target.distanceTo(target0)).toBeLessThan(0.12);
  });
});

describe('beats — micro reencuadres, admisión dura y restauración', () => {
  test('dispararBeat: solo en cine + gameplay, y respeta el cooldown', () => {
    const cine = crearDirector({ modo: 'cine', reposo: REPOSO, mira: MIRA, fov: FOV, presentar: false });
    expect(dispararBeat(cine, { tipo: 'fauna', lado: 'der' }, 0)).toBe(true);
    // Ya hay uno en curso: el segundo no entra.
    expect(dispararBeat(cine, { tipo: 'fauna', lado: 'izq' }, 0)).toBe(false);

    const sobrio = crearDirector({ modo: 'sobrio', reposo: REPOSO, mira: MIRA, fov: FOV, presentar: false });
    expect(dispararBeat(sobrio, { tipo: 'fauna', lado: 'der' }, 0)).toBe(false);
  });

  test('un beat de fauna hace push-in por lente y REGRESA el focal al reposo', () => {
    const st = crearDirector({ modo: 'cine', reposo: REPOSO, mira: MIRA, fov: FOV, presentar: false });
    const cam = nuevaCamara();
    const controls = nuevoControls();
    const focal0 = cam.getFocalLength();
    const ctx = { camara: cam, controls, foco: new THREE.Vector3(...MIRA), avatarPos: null, entrando: false };

    st.beatPendiente = { tipo: 'fauna', lado: 'der' };
    // A mitad del beat el focal es MÁS largo (telefoto: push-in).
    correr(st, ctx, 30);
    expect(cam.getFocalLength()).toBeGreaterThan(focal0 + 0.1);

    // Pasado el beat entero, el focal vuelve a su sitio y el beat queda quieto.
    correr(st, ctx, 400);
    expect(st.beat.fase).toBe('quieto');
    expect(cam.getFocalLength()).toBeCloseTo(focal0, 1);
  });

  test('el Ent pide un plano más LARGO que un bicho cualquiera', () => {
    const a = crearDirector({ modo: 'cine', reposo: REPOSO, mira: MIRA, fov: FOV, presentar: false });
    const b = crearDirector({ modo: 'cine', reposo: REPOSO, mira: MIRA, fov: FOV, presentar: false });
    dispararBeat(a, { tipo: 'fauna', lado: 'bosque', slug: SLUG_ENT }, 0);
    dispararBeat(b, { tipo: 'fauna', lado: 'izq' }, 0);
    expect(a.beat.sosten).toBeGreaterThan(b.beat.sosten);
  });
});

describe('anticipación de entrada — el lente se abre y suelta (solo cine)', () => {
  test('cine: abre el focal transitorio y lo restaura', () => {
    const st = crearDirector({ modo: 'cine', reposo: REPOSO, mira: MIRA, fov: FOV, presentar: false });
    const cam = nuevaCamara();
    const controls = nuevoControls();
    const focal0 = cam.getFocalLength();
    const ctx = { camara: cam, controls, foco: new THREE.Vector3(...MIRA), avatarPos: null, entrando: false };
    anticiparEntrada(st);
    correr(st, ctx, 8);
    expect(cam.getFocalLength()).toBeLessThan(focal0 - 0.05); // más abierto (gran angular)
    correr(st, ctx, 300);
    expect(cam.getFocalLength()).toBeCloseTo(focal0, 1);
  });

  test('sobrio: anticiparEntrada no hace nada', () => {
    const st = crearDirector({ modo: 'sobrio', reposo: REPOSO, mira: MIRA, fov: FOV, presentar: false });
    anticiparEntrada(st);
    expect(st.anticipo.meta).toBe(0);
  });
});

describe('utilitarios puros', () => {
  test('easeViaje es un ease-in-out en [0,1] sin sobrepasar', () => {
    expect(easeViaje(0)).toBeCloseTo(0, 6);
    expect(easeViaje(1)).toBeCloseTo(1, 6);
    expect(easeViaje(0.5)).toBeCloseTo(0.5, 6);
    for (let p = 0; p <= 1.0001; p += 0.1) {
      const e = easeViaje(p);
      expect(e).toBeGreaterThanOrEqual(-1e-9);
      expect(e).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  test('waypointsPresentacion: cine trae más planos que sobrio', () => {
    const cine = waypointsPresentacion('cine', REPOSO, MIRA);
    const sobrio = waypointsPresentacion('sobrio', REPOSO, MIRA);
    expect(cine.pos.length).toBeGreaterThan(sobrio.pos.length);
    expect(cine.pos.length).toBe(cine.mira.length);
  });

  test('BEAT_COOLDOWN_S es un respiro sensato (varios segundos)', () => {
    expect(BEAT_COOLDOWN_S).toBeGreaterThanOrEqual(4);
  });
});
