import { describe, it, expect } from 'vitest';
import {
    buildPlantMeta,
    formatPlantMetaFallbackLine,
    ETAPA_FENOLOGICA_LABELS,
    ETAPA_FENOLOGICA_OPTIONS,
} from './plantMeta';

// Audit finding 070.3 (2026-05-18): el form de planta en AssetsDashboard
// expone 3 campos opcionales (fecha_germinacion, altura_cm, etapa_fenologica)
// que se persisten en attributes._chagra_plant_meta. Estos tests verifican
// que buildPlantMeta y su fallback line se comportan determinísticamente,
// sin perder datos ni inyectar objetos vacíos cuando el operador omite la
// sección colapsable.

describe('buildPlantMeta — persistencia de los 3 campos opcionales', () => {
    it('retorna null si el form no llenó ningún campo del estado de planta', () => {
        expect(buildPlantMeta(/** @type {any} */ ({ name: 'tomate' }))).toBeNull();
        expect(buildPlantMeta({})).toBeNull();
        // Strings vacíos del form (default) NO se consideran datos.
        expect(buildPlantMeta({ fechaGerminacion: '', alturaCm: '', etapaFenologica: '' })).toBeNull();
    });

    it('retorna null para input inválido (no-objeto / null)', () => {
        expect(buildPlantMeta(null)).toBeNull();
        expect(buildPlantMeta(undefined)).toBeNull();
        expect(buildPlantMeta(/** @type {any} */ ('no-es-objeto'))).toBeNull();
    });

    it('persiste fecha_germinacion cuando el operador la llenó', () => {
        const meta = buildPlantMeta({ fechaGerminacion: '2025-03-15' });
        expect(meta).toEqual({ fecha_germinacion: '2025-03-15' });
    });

    it('persiste altura_cm como int normalizado (Math.round)', () => {
        expect(buildPlantMeta({ alturaCm: '35' })).toEqual({ altura_cm: 35 });
        expect(buildPlantMeta({ alturaCm: 35 })).toEqual({ altura_cm: 35 });
        expect(buildPlantMeta({ alturaCm: '35.7' })).toEqual({ altura_cm: 36 });
        expect(buildPlantMeta({ alturaCm: '0' })).toEqual({ altura_cm: 0 });
    });

    it('descarta altura_cm inválida (no numérica o negativa)', () => {
        expect(buildPlantMeta({ alturaCm: 'abc' })).toBeNull();
        expect(buildPlantMeta({ alturaCm: '-10' })).toBeNull();
        expect(buildPlantMeta({ alturaCm: NaN })).toBeNull();
    });

    it('persiste etapa_fenologica cuando el operador la eligió', () => {
        expect(buildPlantMeta({ etapaFenologica: 'floracion' })).toEqual({ etapa_fenologica: 'floracion' });
    });

    it('combina los 3 campos cuando el operador llenó la sección completa', () => {
        const meta = buildPlantMeta(/** @type {any} */ ({
            fechaGerminacion: '2025-01-10',
            alturaCm: '120',
            etapaFenologica: 'vegetativo',
            // campos no relevantes deben ignorarse silenciosamente
            name: 'aguacate',
            plantType: 'Hass',
        }));
    });
});

describe('formatPlantMetaFallbackLine — string legible que sobrevive sync', () => {
    it('retorna null si meta es null/inválida', () => {
        expect(formatPlantMetaFallbackLine(null)).toBeNull();
        expect(formatPlantMetaFallbackLine(undefined)).toBeNull();
        expect(formatPlantMetaFallbackLine({})).toBeNull();
    });

    it('serializa los 3 campos en una sola línea con separador "·"', () => {
        const line = formatPlantMetaFallbackLine({
            fecha_germinacion: '2025-01-10',
            altura_cm: 120,
            etapa_fenologica: 'vegetativo',
        });
        expect(line).toBe('[estado-planta] siembra: 2025-01-10 · altura: 120 cm · etapa: vegetativo');
    });

    it('omite campos faltantes sin dejar separadores huérfanos', () => {
        const line = formatPlantMetaFallbackLine({ altura_cm: 50 });
        expect(line).toBe('[estado-planta] altura: 50 cm');
    });
});

describe('ETAPA_FENOLOGICA_LABELS — labels legibles para AssetDetailView', () => {
    it('cubre las 6 etapas requeridas por el audit finding 070.3', () => {
        expect(Object.keys(ETAPA_FENOLOGICA_LABELS).sort()).toEqual([
            'floracion',
            'fructificacion',
            'madurez',
            'semillero',
            'senescencia',
            'vegetativo',
        ]);
    });

    it('espejo de ETAPA_FENOLOGICA_OPTIONS — no hay drift entre value/label', () => {
        for (const opt of ETAPA_FENOLOGICA_OPTIONS) {
            expect(ETAPA_FENOLOGICA_LABELS[opt.value]).toBe(opt.label);
        }
    });
});

describe('UX-17 — copy amigable de "momento de la planta"', () => {
    // El operador pidió evitar jerga técnica para "gente del campo y niños
    // desde los 11 años". Verificamos que los labels nuevos están en lenguaje
    // accesible y los técnicos están en `technical` (sub-label tooltip).
    it('los 6 labels visibles NO usan palabras técnicas', () => {
        const technicalWords = [
            // exact match con boundary para no atrapar derivaciones legítimas.
            /\bfenolog/i,
            /\bsenescencia\b/i,
            /\bvegetativo\b/i,
            /\bfructificación\b/i,
            /\bantesis\b/i,
        ];
        for (const opt of ETAPA_FENOLOGICA_OPTIONS) {
            for (const re of technicalWords) {
                // 'semillero' es lo suficiente común (no técnica jerga) y
                // aparece entre paréntesis como aclaración → permitido.
                expect(opt.label).not.toMatch(re);
            }
        }
    });

    it('cada opción tiene un sub-label "technical" con el término agrónomo', () => {
        for (const opt of ETAPA_FENOLOGICA_OPTIONS) {
            expect(opt.technical).toBeTruthy();
            expect(typeof opt.technical).toBe('string');
        }
    });

    it('los `value` técnicos se mantienen — compat backend FarmOS', () => {
        const values = ETAPA_FENOLOGICA_OPTIONS.map((o) => o.value).sort();
        expect(values).toEqual([
            'floracion', 'fructificacion', 'madurez',
            'semillero', 'senescencia', 'vegetativo',
        ]);
    });

    it('labels mencionan acciones / estados accesibles (flores, frutos, cosechar)', () => {
        const allLabels = ETAPA_FENOLOGICA_OPTIONS.map((o) => o.label.toLowerCase()).join(' | ');
        expect(allLabels).toMatch(/flores/);
        expect(allLabels).toMatch(/frutos|semillas/);
        expect(allLabels).toMatch(/cosechar/);
        expect(allLabels).toMatch(/creciendo|nacida/);
    });
});
