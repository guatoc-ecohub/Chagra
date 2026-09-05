/**
 * agroMeteoService.test.js — BUG-DIA-UTC-20260904.
 *
 * Reproduce y cierra el defecto reportado por Fable durante la dirección de
 * arte del clima: `fetchAgroMeteo().today` se elegía comparando la fecha ISO
 * del reloj del sistema EN UTC (`new Date().toISOString().slice(0,10)`)
 * contra fechas locales de la finca que Open-Meteo devuelve con
 * `timezone=auto`. Colombia es UTC-5: a las 19:00 hora local el reloj del
 * sistema YA marca el día siguiente en UTC, así que desde las 19:00 hasta
 * medianoche la app leía el pronóstico de MAÑANA como si fuera "hoy" — justo
 * la ventana en la que se avisa una helada (que ocurre de madrugada, 03-09h,
 * y el aviso tiene que darse la noche anterior).
 *
 * El fix usa el offset real que Open-Meteo entrega en la respuesta
 * (`utc_offset_seconds`), NUNCA una constante -5 escrita a mano.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const LOC = { lat: 4.6, lng: -74.1, elevation: 2600 }; // piso frío, altiplano

const BOGOTA_UTC_OFFSET_SECONDS = -5 * 60 * 60; // UTC-5, tal como lo reportaría Open-Meteo

/**
 * Payload sintético de Open-Meteo con `timezone=auto` + `past_days=1`:
 * fechas del `daily`/`hourly` en calendario LOCAL de la finca (naive, sin
 * sufijo de zona), tal como la API las entrega de verdad.
 *
 * days: array de 4 fechas ISO consecutivas (ayer, HOY-finca, mañana, pasado),
 * cada una con un temp_max distintivo para poder probar CUÁL día se leyó.
 */
function buildRawOpenMeteo(days) {
    const hourlyTime = [];
    const hourlyTemp = [];
    const hourlyRh = [];
    const hourlyCloud = [];
    days.forEach(({ date }, dayIdx) => {
        for (let h = 0; h < 24; h += 1) {
            hourlyTime.push(`${date}T${String(h).padStart(2, '0')}:00`);
            hourlyTemp.push(10 + dayIdx); // valor distintivo por día
            hourlyRh.push(80);
            hourlyCloud.push(50);
        }
    });
    return {
        elevation: LOC.elevation,
        timezone: 'America/Bogota',
        utc_offset_seconds: BOGOTA_UTC_OFFSET_SECONDS,
        current: {
            temperature_2m: 12, relative_humidity_2m: 85, apparent_temperature: 11,
            is_day: 0, precipitation: 0, weathercode: 3, cloud_cover: 90, wind_speed_10m: 5,
        },
        daily: {
            time: days.map((d) => d.date),
            weathercode: days.map(() => 3),
            temperature_2m_max: days.map((d) => d.temp_max),
            temperature_2m_min: days.map((d) => d.temp_max - 8),
            apparent_temperature_max: days.map((d) => d.temp_max),
            precipitation_sum: days.map(() => 0),
            precipitation_probability_max: days.map(() => 10),
            et0_fao_evapotranspiration: days.map(() => 3),
            uv_index_max: days.map(() => 8),
            shortwave_radiation_sum: days.map(() => 15),
            sunshine_duration: days.map(() => 30000),
            windspeed_10m_max: days.map(() => 10),
            windgusts_10m_max: days.map(() => 20),
            winddirection_10m_dominant: days.map(() => 90),
        },
        hourly: {
            time: hourlyTime,
            temperature_2m: hourlyTemp,
            relative_humidity_2m: hourlyRh,
            dew_point_2m: hourlyTemp,
            precipitation: hourlyTime.map(() => 0),
            cloud_cover: hourlyCloud,
            uv_index: hourlyTime.map(() => 5),
            weathercode: hourlyTime.map(() => 3),
            is_day: hourlyTime.map(() => 1),
            soil_moisture_0_to_1cm: hourlyTime.map(() => 0.3),
            soil_moisture_1_to_3cm: hourlyTime.map(() => 0.3),
            soil_moisture_3_9cm: hourlyTime.map(() => 0.3),
        },
    };
}

// Ayer/HOY-finca/mañana/pasado en calendario de Bogotá, con temp_max distinta
// cada día para poder aserar cuál fila realmente se leyó.
const DIAS_FINCA = [
    { date: '2026-09-03', temp_max: 21 }, // ayer (past_days=1 → índice 0)
    { date: '2026-09-04', temp_max: 22 }, // HOY-finca (índice 1)
    { date: '2026-09-05', temp_max: 23 }, // mañana — lo que UTC cree que es "hoy" desde las 19:00 COT
    { date: '2026-09-06', temp_max: 24 },
];

const importFresh = async () => {
    vi.resetModules();
    return import('../agroMeteoService.js');
};

function stubFetchOnce(raw) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => raw,
    }));
}

beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('agroMeteoService — BUG-DIA-UTC-20260904: "hoy" en zona horaria de la finca', () => {
    it('a las 20:00 hora Colombia, "today" es el día LOCAL de la finca (2026-09-04), no el UTC (2026-09-05)', async () => {
        // 20:00 hora Bogotá (UTC-5) del 2026-09-04 == 01:00 UTC del 2026-09-05.
        // Con el bug (`new Date().toISOString().slice(0,10)` en UTC), el código
        // buscaba la fila con date === '2026-09-05' → la de MAÑANA.
        vi.setSystemTime(new Date('2026-09-05T01:00:00Z'));
        stubFetchOnce(buildRawOpenMeteo(DIAS_FINCA));

        const mod = await importFresh();
        const result = await mod.fetchAgroMeteo(LOC);

        expect(result).not.toBeNull();
        // Evidencia dura: si esto fuera '2026-09-05' (temp_max 23), el defecto
        // sigue vivo — la app estaría mostrando el pronóstico de mañana como hoy.
        expect(result.today?.date).toBe('2026-09-04');
        expect(result.today?.temp_max).toBe(22);
    });

    it('regresión: el día elegido es el MISMO a las 18:59 y a las 20:01 hora Colombia (cruce de las 19:00 = medianoche UTC)', async () => {
        const raw = buildRawOpenMeteo(DIAS_FINCA);

        // 18:59 hora Bogotá del 2026-09-04 == 23:59 UTC del 2026-09-04 (un
        // minuto ANTES de que el reloj del sistema cruce a mañana en UTC).
        vi.setSystemTime(new Date('2026-09-04T23:59:00Z'));
        localStorage.clear();
        stubFetchOnce(raw);
        const modAntes = await importFresh();
        const antes = await modAntes.fetchAgroMeteo(LOC);

        // 20:01 hora Bogotá del 2026-09-04 == 01:01 UTC del 2026-09-05 (un
        // minuto DESPUÉS del cruce). Debe seguir siendo el mismo día-finca.
        vi.setSystemTime(new Date('2026-09-05T01:01:00Z'));
        localStorage.clear();
        stubFetchOnce(raw);
        const modDespues = await importFresh();
        const despues = await modDespues.fetchAgroMeteo(LOC);

        expect(antes.today?.date).toBe('2026-09-04');
        expect(despues.today?.date).toBe('2026-09-04');
        expect(despues.today?.date).toBe(antes.today?.date);
    });

    it('sin utc_offset_seconds en la respuesta (dato ausente), degrada al fallback declarado (índice 1 = hoy dado past_days=1) sin inventar un offset', async () => {
        vi.setSystemTime(new Date('2026-09-05T01:00:00Z')); // 20:00 COT
        const raw = buildRawOpenMeteo(DIAS_FINCA);
        delete raw.utc_offset_seconds;
        stubFetchOnce(raw);

        const mod = await importFresh();
        const result = await mod.fetchAgroMeteo(LOC);

        // Sin offset no se inventa: cae al fallback ya documentado en el
        // código (dailyDigest[1], el "hoy" cuando past_days=1 corre el índice
        // 0 a ayer), que en este fixture SIGUE siendo el día-finca correcto.
        expect(result.today?.date).toBe('2026-09-04');
    });
});
