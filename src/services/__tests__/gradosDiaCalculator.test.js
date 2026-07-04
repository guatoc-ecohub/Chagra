/**
 * gradosDiaCalculator — cálculo DETERMINISTA de grados-día. El contrato: los
 * números salen del método modificado del promedio (grounding R30) y la etapa
 * de la fenología en DÍAS (grounded), nunca inventados.
 */
import { describe, test, expect } from 'vitest';
import {
    CULTIVOS_GDD,
    CULTIVO_GDD_BY_ID,
    PISOS_TERMICOS,
    REGIMENES_LLUVIA,
    gddDia,
    gddAcumulado,
    diasTranscurridos,
    estimarEtapa,
    compararRitmo,
} from '../gradosDiaCalculator';

describe('gddDia — método modificado del promedio', () => {
    test('maíz en tierra fría (Tb=10): clampa la mínima a 10', () => {
        // tmin 7 < Tb 10 → 10; (10+19)/2 - 10 = 4.5
        expect(gddDia(7, 19, 10, 30)).toBe(4.5);
    });

    test('maíz en tierra templada acumula más calor por día', () => {
        // (15+26)/2 - 10 = 10.5
        expect(gddDia(15, 26, 10, 30)).toBe(10.5);
    });

    test('clampa la máxima a la temperatura tope To', () => {
        // tmax 35 > To 30 → 30; (20+30)/2 - 10 = 15
        expect(gddDia(20, 35, 10, 30)).toBe(15);
    });

    test('día por debajo de la base → 0 grados-día (nunca negativo)', () => {
        expect(gddDia(2, 8, 10, 30)).toBe(0);
    });

    test('sin To (null) no aplica tope superior', () => {
        // papa Tb=5, sin cap: (7+25)/2 - 5 = 11
        expect(gddDia(7, 25, 5, null)).toBe(11);
    });

    test('entradas no numéricas → 0 (robustez)', () => {
        expect(gddDia(NaN, 20, 10, 30)).toBe(0);
        expect(gddDia(10, undefined, 10, 30)).toBe(0);
    });
});

describe('gddAcumulado — acumulación por N días a ritmo constante', () => {
    test('maíz frío por 10 días = 45 °D', () => {
        expect(gddAcumulado(7, 19, 10, 30, 10)).toBe(45);
    });
    test('días negativos o cero → 0', () => {
        expect(gddAcumulado(15, 26, 10, 30, 0)).toBe(0);
        expect(gddAcumulado(15, 26, 10, 30, -5)).toBe(0);
    });
    test('trunca días fraccionarios', () => {
        expect(gddAcumulado(15, 26, 10, 30, 3.9)).toBe(31.5); // 10.5*3
    });
});

describe('diasTranscurridos', () => {
    test('cuenta días enteros entre dos fechas', () => {
        expect(diasTranscurridos('2026-01-01', '2026-01-11')).toBe(10);
    });
    test('futuro o fecha inválida → 0', () => {
        expect(diasTranscurridos('2026-02-01', '2026-01-01')).toBe(0);
        expect(diasTranscurridos('no-es-fecha', '2026-01-01')).toBe(0);
    });
});

describe('estimarEtapa — por fenología en días (grounded)', () => {
    test('maíz recién sembrado: siembra → próxima emergencia', () => {
        const e = estimarEtapa('maiz', 0);
        expect(e.actual.id).toBe('siembra');
        expect(e.proxima.id).toBe('emergencia');
        expect(e.diasParaProxima).toBe(8);
    });

    test('maíz a los 50 días va en crecimiento, sigue floración', () => {
        const e = estimarEtapa('maiz', 50);
        expect(e.actual.id).toBe('vegetativo');
        expect(e.proxima.id).toBe('floracion');
        expect(e.diasParaProxima).toBe(10);
    });

    test('pasado el último hito no hay próxima etapa', () => {
        const e = estimarEtapa('maiz', 200);
        expect(e.actual.id).toBe('grano_seco');
        expect(e.proxima).toBeNull();
        expect(e.diasParaProxima).toBeNull();
    });

    test('papa a los 90 días va en tuberización', () => {
        const e = estimarEtapa('papa', 90);
        expect(e.actual.id).toBe('tuberizacion');
    });

    test('cultivo manual (sin fenología) → null honesto', () => {
        expect(estimarEtapa('manual', 30)).toBeNull();
    });
});

describe('compararRitmo — evidencia de "tarda más en tierra fría"', () => {
    test('maíz: templado junta más °D/día que frío (factor > 1)', () => {
        const r = compararRitmo('maiz', 'templado', 'frio');
        expect(r.calido).toBe(10.5);
        expect(r.frio).toBe(4.5);
        expect(r.factor).toBeGreaterThan(1);
    });
    test('ids desconocidos → null', () => {
        expect(compararRitmo('maiz', 'x', 'frio')).toBeNull();
    });
});

describe('datos groundeados — integridad del set', () => {
    test('maíz y papa traen Tb y fuente citada', () => {
        expect(CULTIVO_GDD_BY_ID.maiz.tb).toBe(10);
        expect(CULTIVO_GDD_BY_ID.maiz.to).toBe(30);
        expect(CULTIVO_GDD_BY_ID.maiz.fuente).toMatch(/R30/);
        expect(CULTIVO_GDD_BY_ID.papa.tb).toBe(5);
        expect(CULTIVO_GDD_BY_ID.papa.fuente).toMatch(/R31/);
    });
    test('todo cultivo tiene id, nombre y Tb numérica', () => {
        for (const c of CULTIVOS_GDD) {
            expect(typeof c.id).toBe('string');
            expect(typeof c.nombre).toBe('string');
            expect(Number.isFinite(c.tb)).toBe(true);
        }
    });
    test('los pisos térmicos y regímenes existen para la orientación', () => {
        expect(PISOS_TERMICOS.length).toBeGreaterThanOrEqual(4);
        expect(REGIMENES_LLUVIA.map((r) => r.id)).toEqual(['bimodal', 'unimodal']);
    });
});
