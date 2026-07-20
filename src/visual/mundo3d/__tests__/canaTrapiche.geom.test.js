/*
 * Las cosas del mundo de la caña que NO se ven leyendo el código y que, si se
 * rompen, no dan ningún error: la escena simplemente queda mal y nadie se
 * entera hasta que alguien la mira.
 *
 * Cuatro familias de chequeo:
 *
 *   1. Que las mallas se FUSIONEN. `mergeGeometries` devuelve null en silencio
 *      al mezclar geometrías indexadas con no-indexadas, y la pieza deja de
 *      dibujarse sin una línea en consola. Ya mordió tres veces en este repo.
 *   2. Que la CAÑA SIGA SIENDO ALTA. Es la premisa del mundo entero: si una
 *      cepa deja de pasarle por encima a una persona, dejó de ser un cañaveral.
 *   3. Que el PASILLO DEL PASO 1 esté tupido y despejado. Es el plano que
 *      sostiene la lección: la cámara se mete a caminar entre surcos y tiene
 *      que haber caña cerrada a lado y lado, pero ninguna cepa encima del eje.
 *      El surco ONDULA, así que una x fija se sale de la calle a los pocos
 *      metros — por eso el pasillo se calcula, no se escribe a mano.
 *   4. Que los CINCO ENCUADRES sean navegables: dentro de los límites de
 *      distancia y de ángulo que OrbitControls impone, y sobre el suelo. Un
 *      encuadre fuera de rango no falla: se endereza solo y se pierde el plano.
 */
import { describe, it, expect } from 'vitest';
import {
  ANCHO,
  FONDO,
  alturaVega,
  enLaEra,
  enZonaCerca,
  pasilloCanaveral,
  canaDeTier,
  calidadCana,
  mallasDeTier,
  sembrarCanaveral,
  geomMataCana,
  geomPenachoCana,
  geomHojarascaCana,
  geomPiedraCana,
  geomMatojoCana,
  geomMuroCanaveral,
  VARIEDADES,
  Y_ERA,
  enTrapiche,
} from '../cana/floraCana.geom.js';
import {
  ENRAMADA,
  PAILAS,
  CELDAS_GAVERA,
  geomEsqueletoEnramada,
  geomTechoEnramada,
  geomMolienda,
  geomCanoaGuarapo,
  geomHornilla,
  geomPailas,
  geomArrumeCana,
  geomMoldeo,
  geomUtiles,
  geomBagazo,
} from '../cana/trapiche.geom.js';
import { PASOS, LIMITES, OJOS } from '../cana/leccionCana.js';

const ATRIBUTOS = 'color,normal,position,uv';
const atributosDe = (g) => Object.keys(g.attributes).sort().join(',');
const triangulos = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;

/* El mundo a calidad plena, una sola vez (construirlo es lo caro del test). */
const TIER = 'alto';
const q = calidadCana(TIER);
const mallas = mallasDeTier(TIER);
const cepas = mallas.map((m) => geomMataCana(m.v, { q, detalle: m.detalle }, 101));
const siembra = sembrarCanaveral(
  canaDeTier(TIER),
  mallas,
  cepas.map((c) => c.topes),
  907,
);
const matas = siembra.matas.flat();

describe('cañaveral — las mallas se fusionan de verdad', () => {
  it('cada pieza de la cepa sale con los mismos atributos (o el merge da null y no se dibuja)', () => {
    for (const c of cepas) {
      for (const pieza of [c.tallos, c.hojas, c.chala]) {
        expect(pieza).toBeTruthy();
        expect(atributosDe(pieza)).toBe(ATRIBUTOS);
        expect(triangulos(pieza)).toBeGreaterThan(0);
      }
    }
  });

  it('las piezas sueltas del lote también', () => {
    for (const g of [
      geomPenachoCana(q, 41),
      geomHojarascaCana(),
      geomPiedraCana(),
      geomMatojoCana(),
      geomMuroCanaveral({ largo: 40, alto: 4 }),
    ]) {
      expect(atributosDe(g)).toBe(ATRIBUTOS);
      expect(triangulos(g)).toBeGreaterThan(0);
    }
  });

  it('todas las piezas del trapiche también', () => {
    for (const g of [
      geomEsqueletoEnramada({ q }),
      geomTechoEnramada({ q }),
      geomMolienda({ q }),
      geomCanoaGuarapo(),
      geomHornilla({ q }),
      geomPailas({ q }),
      geomArrumeCana({ q }),
      geomMoldeo({ q }),
      geomUtiles({ q }),
      geomBagazo({ radio: 1, alto: 0.6, estado: 'humedo', q }),
    ]) {
      expect(atributosDe(g)).toBe(ATRIBUTOS);
      expect(triangulos(g)).toBeGreaterThan(0);
    }
  });
});

describe('cañaveral — la escala es la premisa del mundo', () => {
  it('una cepa le pasa MUY por encima a una persona (1,7 m)', () => {
    for (const c of cepas) expect(c.alto).toBeGreaterThan(1.7 * 2);
  });

  it('ni la cepa más chica del lote baja de 2,6 m', () => {
    const menor = Math.min(...cepas.map((c) => c.alto)) * Math.min(...matas.map((m) => m.escala));
    expect(menor).toBeGreaterThan(2.6);
  });

  it('sirve caña de las cuatro variedades y ninguna repite tinte', () => {
    expect(VARIEDADES).toHaveLength(4);
    const tintes = new Set(VARIEDADES.map((v) => v.tinte.join(',')));
    expect(tintes.size).toBe(4);
    // los pesos reparten el lote completo
    const suma = VARIEDADES.reduce((a, v) => a + v.peso, 0);
    expect(suma).toBeCloseTo(1, 5);
  });
});

describe('cañaveral — la siembra', () => {
  it('no siembra una sola mata dentro de la era del trapiche', () => {
    expect(matas.filter((m) => enLaEra(m.pos[0], m.pos[2]))).toHaveLength(0);
  });

  it('cada mata se para SOBRE el terreno, no flotando ni enterrada', () => {
    for (const m of matas) {
      expect(m.pos[1]).toBeCloseTo(alturaVega(m.pos[0], m.pos[2]), 6);
    }
  });

  it('todo cae dentro del terreno construido', () => {
    for (const m of matas) {
      expect(Math.abs(m.pos[0])).toBeLessThan(ANCHO / 2);
      expect(Math.abs(m.pos[2])).toBeLessThan(FONDO / 2);
    }
  });

  it('cada penacho cuelga de una punta de tallo con su ancla en el pie de la cepa', () => {
    expect(siembra.penacho.length).toBeGreaterThan(10);
    for (const p of siembra.penacho) {
      // sin `ancla`/`brazo` el güin se queda flotando cuando la caña se mece
      expect(p.ancla).toBeTruthy();
      expect(p.brazo).toBeTruthy();
      expect(p.pos[1]).toBeGreaterThan(p.ancla[1] + 2.4); // va allá arriba
    }
  });

  it('hoja y chala acompañan a cada tallo: una cepa nunca queda pelada', () => {
    for (let i = 0; i < mallas.length; i++) {
      expect(siembra.hojas[i]).toHaveLength(siembra.matas[i].length);
      expect(siembra.chala[i]).toHaveLength(siembra.matas[i].length);
    }
  });

  it('la gama baja sigue siendo un cañaveral, solo que frugal', () => {
    const mb = mallasDeTier('bajo');
    const cb = mb.map((m) => geomMataCana(m.v, { q: calidadCana('bajo'), detalle: m.detalle }, 101));
    const sb = sembrarCanaveral(canaDeTier('bajo'), mb, cb.map((c) => c.topes), 907);
    expect(sb.matas.flat().length).toBeGreaterThan(20);
    expect(cb[0].alto).toBeGreaterThan(1.7 * 2);
  });
});

describe('el pasillo del paso 1 — el plano que sostiene el mundo', () => {
  it('el eje del pasillo SIGUE al surco, que ondula (no es una x fija)', () => {
    const ejes = [-6, 0, 6.5].map((z) => pasilloCanaveral(z));
    // si fuera una x fija la cámara se saldría de la calle a los pocos metros
    expect(Math.max(...ejes) - Math.min(...ejes)).toBeGreaterThan(0.8);
  });

  it('hay caña cerrada a lado y lado en todo el recorrido', () => {
    for (const z of [6.5, 3, 0, -3, -6]) {
      const cx = pasilloCanaveral(z);
      const flanco = matas.filter(
        (m) => Math.abs(m.pos[2] - z) < 2 && Math.abs(m.pos[0] - cx) < 2.2,
      );
      expect(flanco.length).toBeGreaterThanOrEqual(6);
    }
  });

  it('pero ninguna cepa se para ENCIMA del eje (la cámara no atraviesa una mata)', () => {
    for (const z of [6.5, 3, 0, -3, -6]) {
      const cx = pasilloCanaveral(z);
      const encima = matas.filter((m) => Math.hypot(m.pos[0] - cx, m.pos[2] - z) < 0.5);
      expect(encima).toHaveLength(0);
    }
  });

  it('el pasillo cae en la zona de calidad CERCA (ahí sí se le ven los nudos)', () => {
    for (const z of [6, 0, -6]) expect(enZonaCerca(pasilloCanaveral(z), z)).toBe(true);
  });
});

describe('la lección — los cinco encuadres son navegables', () => {
  it('son cinco pasos, en el orden del proceso', () => {
    expect(PASOS.map((p) => p.id)).toEqual([
      'canaveral',
      'molienda',
      'bagazo',
      'hornilla',
      'gaveras',
    ]);
  });

  it.each(PASOS.map((p) => [p.id, p]))(
    '«%s»: dentro de los límites de OrbitControls y sobre el suelo',
    (_id, paso) => {
      const [px, py, pz] = paso.vista.pos;
      const [mx, my, mz] = paso.vista.mira;
      const d = Math.hypot(px - mx, py - my, pz - mz);
      const polar = Math.acos((py - my) / d);
      // fuera de rango OrbitControls la reacomoda sola y se pierde el encuadre
      expect(d).toBeGreaterThanOrEqual(LIMITES.minDistancia);
      expect(d).toBeLessThanOrEqual(LIMITES.maxDistancia);
      expect(polar).toBeGreaterThan(LIMITES.minPolar);
      expect(polar).toBeLessThan(LIMITES.maxPolar);
      expect(py).toBeGreaterThan(alturaVega(px, pz) + 0.4);
    },
  );

  it('el paso 1 mira desde la altura de los ojos y la caña le pasa por encima', () => {
    const p1 = PASOS[0];
    const alturaOjos = p1.vista.pos[1] - alturaVega(p1.vista.pos[0], p1.vista.pos[2]);
    expect(alturaOjos).toBeCloseTo(OJOS, 5);
    expect(Math.max(...cepas.map((c) => c.alto))).toBeGreaterThan(alturaOjos * 2.5);
  });

  it('el paso 1 mira HACIA ARRIBA (por eso se siente alto el cañaveral)', () => {
    const p1 = PASOS[0];
    expect(p1.vista.mira[1]).toBeGreaterThan(p1.vista.pos[1]);
  });

  it('cada foco cae sobre algo del mundo, no en el aire', () => {
    for (const p of PASOS) {
      expect(Number.isFinite(p.foco[0])).toBe(true);
      expect(Number.isFinite(p.foco[1])).toBe(true);
      expect(Number.isFinite(p.foco[2])).toBe(true);
    }
  });

  it('el copy va en «usted» y sin voseo', () => {
    const todo = PASOS.map((p) => `${p.kicker} ${p.texto}`).join(' ');
    expect(todo).toMatch(/usted|métase|mire|fíjese/i);
    expect(todo).not.toMatch(/\b(tenés|querés|podés|mirá|fijate|sabés)\b/i);
  });
});

describe('el trapiche — la física del sitio', () => {
  it('la enramada es ALTA y abierta (adentro hay una hornilla prendida)', () => {
    expect(ENRAMADA.alero).toBeGreaterThan(2.5);
    expect(ENRAMADA.cumbre).toBeGreaterThan(ENRAMADA.alero + 1.5);
  });

  it('las pailas van de la más FRÍA a la del punteo, y en ese orden', () => {
    expect(PAILAS.map((p) => p.oficio)).toEqual([
      'clarificación',
      'evaporación',
      'evaporación',
      'punteo',
    ]);
    // ordenadas a lo largo de la hornilla, sin montarse una sobre otra
    for (let i = 1; i < PAILAS.length; i++) {
      expect(PAILAS[i].x).toBeGreaterThan(PAILAS[i - 1].x);
      expect(PAILAS[i].x - PAILAS[i - 1].x).toBeGreaterThan(PAILAS[i].r);
    }
  });

  it('las celdas de la gavera van dentro del molde y en fila', () => {
    expect(CELDAS_GAVERA.length).toBeGreaterThan(3);
    for (let i = 1; i < CELDAS_GAVERA.length; i++) {
      expect(CELDAS_GAVERA[i][0]).toBeGreaterThan(CELDAS_GAVERA[i - 1][0]);
      expect(CELDAS_GAVERA[i][2]).toBeCloseTo(CELDAS_GAVERA[0][2], 6);
    }
  });

  it('el trapiche se para en PLANO: la era está aplanada de verdad', () => {
    // con la hornilla en desnivel no se trabaja
    const alturas = [
      [10.5, 2],
      [8, 0],
      [13, 4],
      [10.5, -2],
    ].map(([x, z]) => alturaVega(x, z));
    for (const a of alturas) expect(Math.abs(a - Y_ERA)).toBeLessThan(0.05);
  });

  it('enTrapiche aterriza sobre el piso de la era', () => {
    expect(enTrapiche(0, 0, 0)[1]).toBeCloseTo(Y_ERA, 6);
  });

  it('ningún montón de bagazo queda enterrado bajo el piso', () => {
    for (const estado of ['humedo', 'secando', 'seco']) {
      const g = geomBagazo({ radio: 1.2, alto: 0.8, estado, q });
      g.computeBoundingBox();
      expect(g.boundingBox.min.y).toBeGreaterThan(-0.35);
      expect(g.boundingBox.max.y).toBeGreaterThan(0.3);
    }
  });
});
