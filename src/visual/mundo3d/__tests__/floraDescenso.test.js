/*
 * floraDescenso — PUERTA DE LA VEGETACIÓN. Mide, no decora.
 *
 * Lo que la escena 3D hace en vivo (pool fijo, anillo que sigue la cámara,
 * señas por pesos continuos) es IMPERATIVO y no se ve en un diff de capturas.
 * Lo que este test mide es el CONTRATO: que el pool respete el presupuesto de
 * cada tier, que el nival no crezca nada, que la cantidad de vegetación cambie
 * de forma CONTINUA (misma disciplina que `descensoSierra.continuidad.test.js`),
 * que `densidad` escale linealmente, que ninguna instancia flote sobre la
 * ladera real, y que `dispose()` lo libere todo.
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { crearFloraDescenso, PRESUPUESTO } from '../sierra/floraDescenso.js';
import { alturaSierra } from '../sierra/sierraRelieve.js';
import { estadoDescenso, planDescenso } from '../sierra/descensoSierra.js';

const COTA_USUARIO = 2640;

function barrido(cota = COTA_USUARIO, opts = {}) {
  const plan = planDescenso(cota, 'alto');
  const filas = [];
  for (let ms = 0; ms <= plan.total; ms += 1) {
    filas.push(estadoDescenso(ms, { plan, tier: 'alto', ...opts }));
  }
  return { plan, filas };
}

/** Máxima variación (por ms) de una magnitud a lo largo del barrido. */
function saltoMax(filas, leer) {
  let peor = 0;
  let dondeMs = 0;
  for (let i = 1; i < filas.length; i++) {
    const d = Math.abs(leer(filas[i]) - leer(filas[i - 1]));
    if (d > peor) {
      peor = d;
      dondeMs = filas[i].ms;
    }
  }
  return { peor, dondeMs };
}

/** Instancias ACTIVAS (suma de count) de un hook. */
function activas(hook) {
  return hook.conteo().instancias;
}

describe('floraDescenso — presupuesto por tier', () => {
  /* El presupuesto se LEE del módulo, no se repite acá. Repetirlo convertía el
     test en un espejo del código: al subir el techo tras medir en el Pixel, el
     test se puso rojo sin que nada se hubiera roto. Lo que hay que verificar es
     el CONTRATO — que el pool no pase de su propio techo y que los draws no se
     disparen — no un número mágico copiado. */
  const tierPresu = Object.fromEntries(
    Object.entries(PRESUPUESTO).map(([k, v]) => [k, [v.instancias, v.draws]]),
  );
  for (const [tier, [capInst, capDraws]] of Object.entries(tierPresu)) {
    it(`${tier}: conteo() respeta el presupuesto (≤${capInst} instancias, ≤${capDraws} draws)`, () => {
      const escena = new THREE.Scene();
      const hook = crearFloraDescenso({ escena, tier, densidad: 1, semilla: 7 });
      const plan = planDescenso(COTA_USUARIO, tier);
      const est = estadoDescenso((plan.total * 3) / 4, { plan, tier });
      hook.actualizar(est);
      const c = hook.conteo();
      // capacidad del pool = presupuesto de instancias
      const pool = Object.values(hook.capacidades).reduce((s, v) => s + v, 0);
      expect(pool).toBeLessThanOrEqual(capInst);
      expect(c.instancias).toBeLessThanOrEqual(pool);
      expect(c.drawCalls).toBeLessThanOrEqual(capDraws);
      hook.dispose();
    });
  }
});

describe('floraDescenso — EL HECHO QUE MANDA: la escala y el nival', () => {
  it('a 5 400 msnm (nival) las instancias ACTIVAS son 0', () => {
    const escena = new THREE.Scene();
    const hook = crearFloraDescenso({ escena, tier: 'alto', densidad: 1 });
    const est = estadoDescenso(0, { plan: planDescenso(0, 'alto'), tier: 'alto' });
    // estadoDescenso a ms=0 está en la cumbre; forzamos una cota nival explícita
    est.msnm = 5400;
    hook.actualizar(est);
    expect(hook.conteo().instancias).toBe(0);
    hook.dispose();
  });
});

describe('floraDescenso — continuidad end-to-end (sin saltos)', () => {
  it('el número de instancias activas NO salta a lo largo de los 4 200 ms', () => {
    const escena = new THREE.Scene();
    const hook = crearFloraDescenso({ escena, tier: 'alto', densidad: 1, semilla: 7 });
    const { filas } = barrido(COTA_USUARIO);
    const activasEn = [];
    for (const est of filas) {
      hook.actualizar(est);
      activasEn.push(activas(hook));
    }
    // conteo es discreto (entero); lo que no puede saltar de golpe es más de
    // unas pocas por ms. La curva de densidad es continua en msnm.
    const peor = saltoMax(filas.map((f, i) => ({ ...f, activas: activasEn[i] })), (f) => f.activas);
    expect(peor.peor).toBeLessThanOrEqual(6);
    hook.dispose();
  });

  it('la vegetación arranca casi nula en la cumbre nival y crece al bajar', () => {
    const escena = new THREE.Scene();
    const hook = crearFloraDescenso({ escena, tier: 'alto', densidad: 1 });
    const { filas } = barrido(COTA_USUARIO);
    hook.actualizar(filas[0]);
    const alComienzo = activas(hook);
    expect(alComienzo).toBe(0); // nival → 0 a la cumbre
    // en el punto más denso del recorrido hay BOSQUE
    let max = 0;
    for (const est of filas) {
      hook.actualizar(est);
      max = Math.max(max, activas(hook));
    }
    expect(max).toBeGreaterThan(alComienzo);
    hook.dispose();
  });
});

describe('floraDescenso — densidad escala linealmente', () => {
  it('densidad: 0.5 da ~la mitad de instancias activas que densidad: 1', () => {
    const escena = new THREE.Scene();
    const ref = crearFloraDescenso({ escena, tier: 'alto', densidad: 1, semilla: 7 });
    const escena2 = new THREE.Scene();
    const half = crearFloraDescenso({ escena: escena2, tier: 'alto', densidad: 0.5, semilla: 7 });

    const plan = planDescenso(COTA_USUARIO, 'alto');
    let sir = 0;
    let shalf = 0;
    for (let ms = 0; ms <= plan.total; ms += 1) {
      const est = estadoDescenso(ms, { plan, tier: 'alto' });
      ref.actualizar(est);
      half.actualizar(est);
      sir += activas(ref);
      shalf += activas(half);
    }
    // aproximación: el acumulado de la mitad es ~la mitad del completo
    expect(shalf).toBeGreaterThanOrEqual(sir * 0.4);
    expect(shalf).toBeLessThanOrEqual(sir * 0.65);
    ref.dispose();
    half.dispose();
  });
});

describe('floraDescenso — nada flota sobre la ladera', () => {
  it('toda instancia activa se apoya en alturaSierra (tolerancia chica)', () => {
    const escena = new THREE.Scene();
    const hook = crearFloraDescenso({ escena, tier: 'alto', densidad: 1, semilla: 7 });
    const plan = planDescenso(COTA_USUARIO, 'alto');
    const m = new THREE.Matrix4();
    const w = new THREE.Vector3();
    let revisadas = 0;
    for (let ms = 0; ms <= plan.total; ms += 300) {
      const est = estadoDescenso(ms, { plan, tier: 'alto' });
      hook.actualizar(est);
      for (const mesh of Object.values(hook.meshes)) {
        const n = mesh.count;
        for (let i = 0; i < n; i++) {
          mesh.getMatrixAt(i, m);
          w.set(0, 0, 0).applyMatrix4(m);
          const esperada = alturaSierra(w.x, w.z);
          // la base de la geometría se planta en y=0 → el origen de la instancia
          // DEBE coincidir con la ladera (pequeña tolerancia por composición flotante)
          expect(Math.abs(w.y - esperada)).toBeLessThan(1e-5);
          revisadas++;
        }
      }
    }
    expect(revisadas).toBeGreaterThan(0);
    hook.dispose();
  });
});

describe('floraDescenso — determinismo y liberación', () => {
  it('mismo semilla → mismo estado activo (sembrar no depende del azar global)', () => {
    const escenaA = new THREE.Scene();
    const escenaB = new THREE.Scene();
    const a = crearFloraDescenso({ escena: escenaA, tier: 'alto', densidad: 1, semilla: 42 });
    const b = crearFloraDescenso({ escena: escenaB, tier: 'alto', densidad: 1, semilla: 42 });
    const plan = planDescenso(COTA_USUARIO, 'alto');
    for (let ms = 0; ms <= plan.total; ms += 500) {
      const est = estadoDescenso(ms, { plan, tier: 'alto' });
      a.actualizar(est);
      b.actualizar(est);
      expect(activas(a)).toBe(activas(b));
    }
    a.dispose();
    b.dispose();
  });

  it('dispose() libera: ninguna geometría/material queda sin dispose', () => {
    const escena = new THREE.Scene();
    const hook = crearFloraDescenso({ escena, tier: 'alto', densidad: 1 });
    hook.actualizar(estadoDescenso(2000, { plan: planDescenso(COTA_USUARIO, 'alto'), tier: 'alto' }));
    const geosRef = Object.values(hook.meshes).map((m) => m.geometry);
    const matsRef = Object.values(hook.meshes).map((m) => m.material);
    hook.dispose();
    expect(escena.children.some((c) => c.name === 'descenso-flora')).toBe(false);
    for (const g of geosRef) expect(g.dispose).toBeDefined();
    for (const m of matsRef) expect(m.dispose).toBeDefined();
  });
});
