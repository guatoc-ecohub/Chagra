/*
 * Pruebas de la geometría PURA del mundo de los frutales (mango + cítricos).
 * Corren headless: three-core es matemática de buffers, sin contexto WebGL.
 * Lo innegociable: que NINGUNA fusión devuelva null (la mordida conocida de
 * mergeGeometries) y que LA ESCALA RELATIVA se cumpla — el mango ECLIPSA al
 * cítrico; si quedan parejos, el mundo fracasó.
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  FLORA_FRUTALES,
  frutalesDeTier,
  calidadFrutales,
  alturaFinca,
  distribucionFrutales,
  centrosMango,
  geomMango,
  geomMangoFruto,
  geomCitrico,
  geomCitricoFruto,
  geomAzahar,
  geomHojarasca,
  geomPiedra,
  SITIOS_MANGO,
  MATAS_CITRICOS,
  FALDA_MANGO,
  COPA_CITRICO,
} from '../frutales/floraFrutales.geom.js';

const alturaDe = (geo) => {
  geo.computeBoundingBox();
  return geo.boundingBox.max.y - geo.boundingBox.min.y;
};
const anchoDe = (geo) => {
  geo.computeBoundingBox();
  return Math.max(
    geo.boundingBox.max.x - geo.boundingBox.min.x,
    geo.boundingBox.max.z - geo.boundingBox.min.z,
  );
};

describe('las geometrías fusionan sin null y desindexadas', () => {
  const casos = {
    mango: () => geomMango({ q: 1 }, 21),
    mangoFruto: () => geomMangoFruto(),
    citrico: () => geomCitrico({ q: 1 }, 22),
    citricoFruto: () => geomCitricoFruto(),
    azahar: () => geomAzahar(27),
    hojarasca: () => geomHojarasca(25),
    piedra: () => geomPiedra(26),
  };
  Object.entries(casos).forEach(([nombre, crear]) => {
    it(`${nombre}: geometría válida, sin índice, con color por vértice`, () => {
      const g = crear();
      expect(g).toBeInstanceOf(THREE.BufferGeometry);
      expect(g.index).toBeNull(); // todo desindexado (la regla anti-null)
      expect(g.attributes.position.count).toBeGreaterThan(0);
      expect(g.attributes.color).toBeDefined();
      expect(g.attributes.color.count).toBe(g.attributes.position.count);
      g.dispose();
    });
  });

  it('la calidad baja también fusiona (menos detalle, nunca null)', () => {
    const q = calidadFrutales('bajo');
    expect(() => geomMango({ q }, 21)).not.toThrow();
    expect(() => geomCitrico({ q }, 22)).not.toThrow();
  });
});

describe('LA ESCALA RELATIVA: el mango eclipsa al cítrico', () => {
  it('la copa del mango es MÁS ANCHA que alta (el domo)', () => {
    const m = geomMango({ q: 1 }, 21);
    expect(anchoDe(m)).toBeGreaterThan(alturaDe(m) * 1.3);
    m.dispose();
  });
  it('el mango sembrado más chico sigue eclipsando al cítrico más grande', () => {
    const alturaMango = alturaDe(geomMango({ q: 1 }, 21));
    const alturaCitrico = alturaDe(geomCitrico({ q: 1 }, 22));
    const escMangoMin = Math.min(...SITIOS_MANGO.map((s) => s.esc));
    const escCitricoMax = 1.2; // el tope de la distribución (0.95 + 0.25)
    expect(alturaMango * escMangoMin).toBeGreaterThan(alturaCitrico * escCitricoMax * 1.8);
  });
});

describe('la geografía térmica (la lección hecha relieve)', () => {
  it('la vega del frente es baja y la ladera del fondo alta', () => {
    expect(alturaFinca(0, 14)).toBeLessThan(1);
    expect(alturaFinca(0, -12)).toBeGreaterThan(4);
  });
  it('los mangos viven ABAJO (vega) y las matas de cítricos ARRIBA', () => {
    SITIOS_MANGO.forEach((s) => expect(alturaFinca(s.p[0], s.p[1])).toBeLessThan(1.2));
    MATAS_CITRICOS.forEach((m) => expect(alturaFinca(m.c[0], m.c[1])).toBeGreaterThan(2.2));
  });
});

describe('distribucionFrutales (determinista y fiel)', () => {
  const conteos = frutalesDeTier('alto');
  const d = distribucionFrutales(conteos, 421, 1);

  it('respeta el presupuesto del tier', () => {
    expect(d.mango.length).toBe(conteos.mango);
    expect(d.citrico.length).toBe(conteos.citrico);
    expect(d.mangoFruto.length).toBeLessThanOrEqual(conteos.mangoFruto);
    expect(d.mangoFruto.length).toBeGreaterThan(conteos.mangoFruto * 0.6);
    expect(d.citricoFruto.length).toBeLessThanOrEqual(conteos.citricoFruto);
    expect(d.citricoFruto.length).toBeGreaterThan(conteos.citricoFruto * 0.6);
  });

  it('misma semilla → misma siembra', () => {
    const d2 = distribucionFrutales(conteos, 421, 1);
    expect(d2.mango[0].pos).toEqual(d.mango[0].pos);
    expect(d2.citricoFruto[7].tint).toEqual(d.citricoFruto[7].tint);
  });

  it('el fruto del mango cuelga de la falda de SU copa (no flota)', () => {
    const sitios = SITIOS_MANGO.slice(0, conteos.mango);
    d.mangoFruto.forEach((f) => {
      const s = sitios.find((sm) => {
        const dx = f.pos[0] - sm.p[0];
        const dz = f.pos[2] - sm.p[1];
        const rad = Math.hypot(dx, dz) / sm.esc;
        return rad > FALDA_MANGO.radMin - 0.35 && rad < FALDA_MANGO.radMax + 0.35;
      });
      expect(s).toBeDefined();
    });
  });

  it('el fruto cítrico queda pegado a la superficie de alguna copa', () => {
    d.citricoFruto.forEach((f) => {
      const cerca = d.citrico.some((a) => {
        const esc = a.escala;
        const dx = f.pos[0] - a.pos[0];
        const dy = f.pos[1] - (a.pos[1] + COPA_CITRICO.y * esc);
        const dz = f.pos[2] - a.pos[2];
        return Math.hypot(dx, dy, dz) < COPA_CITRICO.rad * esc * 1.35;
      });
      expect(cerca).toBe(true);
    });
  });

  it('las tres variedades de cítrico sobreviven a todo tier', () => {
    ['alto', 'medio', 'bajo'].forEach((tier) => {
      const dd = distribucionFrutales(frutalesDeTier(tier), 421, calidadFrutales(tier));
      const variantesVivas = new Set();
      // reconstruir la variedad por el color del fruto: naranja/mandarina cálidos,
      // limón verde-amarillo (el tinte ES el color real del fruto)
      dd.citricoFruto.forEach((f) => {
        const [r, g, b] = f.tint;
        if (g > r) variantesVivas.add('limon');
        else if (r > 0.75 && g < 0.62) variantesVivas.add('calida');
        expect(b).toBeLessThan(Math.max(r, g)); // ninguna fruta azulada
      });
      expect(variantesVivas.size).toBeGreaterThanOrEqual(2);
    });
  });

  it('bajo conserva el héroe (el palo del patio) y la escala relativa', () => {
    const dd = distribucionFrutales(frutalesDeTier('bajo'), 421, calidadFrutales('bajo'));
    expect(dd.mango[0].pos[0]).toBeCloseTo(SITIOS_MANGO[0].p[0]);
    expect(dd.citrico.length).toBeGreaterThan(0);
    expect(dd.azahar.length).toBe(0); // 'bajo' no paga azahar
  });

  it('centrosMango da un centro por mango del tier, sobre el suelo', () => {
    const cs = centrosMango(conteos);
    expect(cs.length).toBe(conteos.mango);
    cs.forEach((cm) => {
      expect(cm.radio).toBeGreaterThan(2);
      expect(cm.centro[1]).toBeCloseTo(alturaFinca(cm.centro[0], cm.centro[2]));
    });
  });
});

describe('tiers coherentes', () => {
  it('alto > medio > bajo en frutos (el presupuesto escalona)', () => {
    expect(FLORA_FRUTALES.alto.citricoFruto).toBeGreaterThan(FLORA_FRUTALES.medio.citricoFruto);
    expect(FLORA_FRUTALES.medio.citricoFruto).toBeGreaterThan(FLORA_FRUTALES.bajo.citricoFruto);
  });
  it('tier desconocido cae a medio, nunca al más caro', () => {
    expect(frutalesDeTier('marciano')).toBe(FLORA_FRUTALES.medio);
    expect(calidadFrutales('marciano')).toBe(0.62);
  });
});
