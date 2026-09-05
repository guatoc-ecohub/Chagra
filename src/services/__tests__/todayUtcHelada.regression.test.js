/**
 * todayUtcHelada.regression.test.js — BUG TODAY-UTC-HELADA-20260905.
 *
 * Reproducción CON RELOJ FALSEADO (obligatorio antes de tocar código):
 *   reloj = 2026-09-05T23:30:00-05:00  (= 04:30 UTC del 2026-09-06).
 *
 * El defecto: varios consumidores del forecast diario resuelven el "hoy" con
 * la zona horaria del RUNTIME (`now.getFullYear()/getMonth()/getDate()`), que
 * no es ni la zona de la finca ni UTC de forma garantizada. Colombia es UTC-5
 * (fijo, sin horario de verano): entre las 19:00 y medianoche hora local el
 * reloj en UTC ya marca el día siguiente, así que con el runtime en UTC el
 * resolvedor elige la fila de MAÑANA como "hoy" — justo la ventana en la que
 * se avisa una helada (que ocurre de madrugada y el aviso debe darse la noche
 * anterior).
 *
 * Este archivo se corre con `TZ=UTC` para exponer el defecto de forma
 * determinista (el runtime NO es la zona de la finca); tras el fix debe pasar
 * igual bajo `TZ=UTC` y `TZ=America/Bogota`, porque el día pasa a resolverse
 * en el calendario de la FINCA (UTC-5), no en el del navegador ni en UTC.
 */

import { describe, it, expect } from 'vitest';

import { deriveCondicion } from '../atmosphereService.js';
import { ejeClima } from '../vitalidadEspirituService.js';
import { fincaDateISO, FINCA_UTC_OFFSET_SECONDS } from '../../utils/farmDate.js';

/**
 * Snapshot sidecar con `forecast_7d` en calendario LOCAL de la finca
 * (fechas naive, tal como las emite el proveedor con timezone=auto):
 * día 0 = HOY-finca (2026-09-05) con lluvia franca; día 1 = mañana (06) seco.
 * Cada día lleva señales DISTINTIVAS para poder aserar CUÁL fila se leyó.
 */
const DIAS_FINCA = [
    { date: '2026-09-05', temp_min_c: 3, temp_max_c: 16, precip_mm: 15 }, // HOY finca → 'lluvia'
    { date: '2026-09-06', temp_min_c: -2, temp_max_c: 14, precip_mm: 0 },  // mañana → helada / 'despejado'
    { date: '2026-09-07', temp_min_c: 4, temp_max_c: 15, precip_mm: 0 },
    { date: '2026-09-08', temp_min_c: 5, temp_max_c: 16, precip_mm: 0 },
    { date: '2026-09-09', temp_min_c: 6, temp_max_c: 17, precip_mm: 0 },
    { date: '2026-09-10', temp_min_c: 7, temp_max_c: 18, precip_mm: 0 },
    { date: '2026-09-11', temp_min_c: 8, temp_max_c: 19, precip_mm: 0 },
];

function snapshotConForecast(forecast_7d = DIAS_FINCA) {
    return { openmeteo: { available: true, forecast_7d } };
}

/** Instante Colombia `2026-09-05T23:30:00-05:00` == `2026-09-06T04:30:00Z`. */
const NOCHE_COT = new Date('2026-09-06T04:30:00Z');

describe('BUG TODAY-UTC-HELADA-20260905 — el "hoy" se resuelve en la zona de la FINCA, no en UTC ni en el runtime', () => {
    it('REPRO: a las 23:30 hora Colombia (04:30 UTC del día siguiente), deriveCondicion lee MAÑANA (06) como hoy — con el reloj falseado el test es el sujeto', () => {
        const cond = deriveCondicion({ snapshot: snapshotConForecast(), now: NOCHE_COT });
        // HOY-finca (05) tiene 15 mm → 'lluvia'. Si el código resuelve el día
        // en UTC/runtime devuelve la fila del 06 (0 mm) → 'despejado' = MAÑANA.
        expect(cond).toBe('lluvia');
    });

    it('REPRO: a las 23:30 hora Colombia, ejeClima reporta la lluvia de HOY-finca (05), no la de mañana (06)', () => {
        const slot = ejeClima({ climaSnapshot: snapshotConForecast(), now: NOCHE_COT });
        // Con el bug, el slot diría "0 mm hoy" (mañana seca leída como hoy).
        expect(slot?.texto).toContain('15 mm hoy');
    });

    it('regresión: el día elegido es el MISMO a las 18:59 y a las 20:01 hora Colombia (cruce de las 19:00 = medianoche UTC)', () => {
        // 18:59 COT del 05 == 23:59Z del 05 (un minuto ANTES del cruce UTC).
        const antes = deriveCondicion({ snapshot: snapshotConForecast(), now: new Date('2026-09-05T23:59:00Z') });
        // 20:01 COT del 05 == 01:01Z del 06 (un minuto DESPUÉS del cruce).
        const despues = deriveCondicion({ snapshot: snapshotConForecast(), now: new Date('2026-09-06T01:01:00Z') });

        // El cielo de HOY no puede cambiar por el cruce de medianoche UTC:
        // ambas deben leer la fila del 05-finca (lluvia franca).
        expect(despues).toBe('lluvia');
        expect(despues).toBe(antes);
    });

    it('cubre la ventana completa 19:00-23:59 Colombia sin leer mañana', () => {
        const instantes = [
            new Date('2026-09-06T00:00:00Z'), // 19:00 COT
            new Date('2026-09-06T01:30:00Z'), // 20:30 COT
            new Date('2026-09-06T03:00:00Z'), // 22:00 COT
            new Date('2026-09-06T04:59:00Z'), // 23:59 COT
        ];
        for (const now of instantes) {
            expect(deriveCondicion({ snapshot: snapshotConForecast(), now })).toBe('lluvia');
        }
    });
});

describe('fincaDateISO — "hoy" en el calendario de la FINCA, independiente de la zona del runtime', () => {
    it('a las 23:30 hora Colombia (04:30Z del día siguiente) la fecha de la finca es el día 05, no el 06 que marca UTC', () => {
        expect(fincaDateISO(new Date('2026-09-06T04:30:00Z'))).toBe('2026-09-05');
    });

    it('el cruce de medianoche UTC (19:00 Colombia) no cambia el día de la finca', () => {
        // 18:59 COT == 23:59Z (día UTC 05); 20:01 COT == 01:01Z (día UTC 06).
        // Para la finca ambos siguen siendo el día 05.
        expect(fincaDateISO(new Date('2026-09-05T23:59:00Z'))).toBe('2026-09-05');
        expect(fincaDateISO(new Date('2026-09-06T01:01:00Z'))).toBe('2026-09-05');
    });

    it('respeta el offset explícito del proveedor cuando se pasa (espejo de agroMeteoService)', () => {
        // UTC-5 fijo: el mismo instante con offset 0 da el día 06 (UTC crudo).
        expect(fincaDateISO(new Date('2026-09-06T04:30:00Z'), FINCA_UTC_OFFSET_SECONDS)).toBe('2026-09-05');
        expect(fincaDateISO(new Date('2026-09-06T04:30:00Z'), 0)).toBe('2026-09-06');
    });
});
