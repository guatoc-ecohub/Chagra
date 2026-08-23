/**
 * agroIndices.test.js — los motores de índice deterministas de la Página del
 * Tiempo. Grounded + puros → se testean sin red. Blindan el anti-alucinación:
 * los números salen de la fórmula/umbral citado, no de la nada.
 */
import { describe, it, expect } from 'vitest';
import {
    vpdKpa, etcMm, balanceHidricoDia, presionEnfermedad, anomalia,
    parseCultivos, kcDeCultivo, amplitudTermica, leerUv, MODELOS_ENFERMEDAD,
} from './agroIndices.js';

describe('VPD', () => {
    it('a 25 °C y 50 % HR da ~1.58 kPa (referencia agrometeorológica)', () => {
        const v = vpdKpa(25, 50);
        expect(v).toBeGreaterThan(1.5);
        expect(v).toBeLessThan(1.65);
    });
    it('a 100 % HR el VPD es 0 (aire saturado)', () => {
        expect(vpdKpa(20, 100)).toBe(0);
    });
    it('sin dato → null (no inventa)', () => {
        expect(vpdKpa(null, 50)).toBeNull();
        expect(vpdKpa(20, undefined)).toBeNull();
    });
});

describe('ETc y balance hídrico', () => {
    it('ETc = ETo × Kc', () => {
        expect(etcMm(4, 1.15)).toBe(4.6);
    });
    it('balance marca RIEGO cuando la demanda supera la lluvia', () => {
        const b = balanceHidricoDia(0, 5);
        expect(b.estado).toBe('riego');
        expect(b.faltaMm).toBe(5);
    });
    it('balance marca CUBIERTO cuando llueve lo suficiente', () => {
        expect(balanceHidricoDia(6, 4).estado).toBe('cubierto');
    });
    it('balance marca EXCESO con lluvia torrencial', () => {
        expect(balanceHidricoDia(30, 4).estado).toBe('exceso');
    });
});

describe('Semáforo de enfermedad (grounded)', () => {
    it('roya del café: T ideal (22 °C) + hoja mojada larga → ROJO', () => {
        const r = presionEnfermedad('roya_cafe', { tempMedia: 22, horasMojado: 8 });
        expect(r.nivel).toBe('rojo');
        expect(r.modelo.fuente).toMatch(/Cenicafé/);
    });
    it('roya del café: clima seco (0 h mojado) → VERDE', () => {
        expect(presionEnfermedad('roya_cafe', { tempMedia: 22, horasMojado: 0 }).nivel).toBe('verde');
    });
    it('roya del café: fuera de rango térmico (35 °C) → VERDE', () => {
        expect(presionEnfermedad('roya_cafe', { tempMedia: 35, horasMojado: 12 }).nivel).toBe('verde');
    });
    it('gota de la papa: fresco (15 °C) + mojado largo → ROJO', () => {
        expect(presionEnfermedad('gota_papa', { tempMedia: 15, horasMojado: 12 }).nivel).toBe('rojo');
    });
    it('cada modelo declara su fuente y confianza', () => {
        for (const m of Object.values(MODELOS_ENFERMEDAD)) {
            expect(m.fuente).toBeTruthy();
            expect(['alta', 'media', 'baja']).toContain(m.confianza);
        }
    });
});

describe('Anomalía (hoy vs. lo normal)', () => {
    it('describe más caliente y más seco', () => {
        const a = anomalia(21, 1, { temp_media_normal: 18, precip_dia_normal: 4, source: 'ERA5' });
        expect(a.tempDelta).toBe(3);
        expect(a.frases.join(' ')).toMatch(/sobre lo normal/);
        expect(a.precipPctDelta).toBeLessThan(0); // más seco
    });
    it('sin normales → null (no inventa la anomalía)', () => {
        expect(anomalia(21, 1, null)).toBeNull();
    });
});

describe('parseCultivos (texto libre del perfil → fichas)', () => {
    it('mapea sinónimos campesinos a fichas con Kc', () => {
        const { cultivos } = parseCultivos('Café, papa y maíz');
        const keys = cultivos.map((c) => c.key);
        expect(keys).toContain('cafe');
        expect(keys).toContain('papa');
        expect(keys).toContain('maiz');
        expect(kcDeCultivo(cultivos.find((c) => c.key === 'papa'))).toBe(1.15);
    });
    it('lo que no reconoce va a sinFicha (no inventa una ficha)', () => {
        const { cultivos, sinFicha } = parseCultivos('quinua exótica');
        expect(cultivos.length).toBe(0);
        expect(sinFicha.length).toBeGreaterThanOrEqual(1);
    });
    it('café tiene su enfermedad clima-dependiente (roya)', () => {
        const { cultivos } = parseCultivos('cafe');
        expect(cultivos[0].enfermedades).toContain('roya_cafe');
    });
});

describe('Índices auxiliares', () => {
    it('amplitud térmica = máx − mín', () => {
        expect(amplitudTermica(24, 8)).toBe(16);
    });
    it('UV extremo se marca como tal', () => {
        expect(leerUv(12).nivel).toBe('extremo');
        expect(leerUv(2).nivel).toBe('bajo');
    });
});
