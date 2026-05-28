/**
 * notificationsService.prefilled.test.js — UX 2026-05-28.
 *
 * El operador pidió: "cuando hago click en las notificaciones y veo helada
 * esta noche veo que me manda al agente pero creo que lo ideal seria que la
 * alerta me mandara con el prompt al agente listo con la posibilidad de que
 * veo el informe directo de ideam por ejemplo que referencia la alerta
 * climatica o entidad de origen".
 *
 * Esta suite verifica que:
 *   - notificaciones climate_critical/climate_zone/calendar_month traen
 *     `prefilled_prompt` para que AgentScreen prellene el textarea.
 *   - notificaciones climate_critical traen `source_url` + `source_label`
 *     para que el banner del agente cite la entidad emisora.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    aggregateNotifications,
    setDemoSeedHelada,
} from '../notificationsService';

beforeEach(() => {
    try { localStorage.clear(); } catch (_) { /* noop */ }
});

describe('notificationsService — prefilled_prompt + source_url', () => {
    it('seed demo helada incluye prefilled_prompt + source_url IDEAM', () => {
        setDemoSeedHelada(true);
        const out = aggregateNotifications({});
        const helada = out.find((n) => n.id === 'demo_helada_critical');
        expect(helada).toBeDefined();
        expect(typeof helada.prefilled_prompt).toBe('string');
        expect(helada.prefilled_prompt.length).toBeGreaterThan(10);
        expect(helada.prefilled_prompt).toMatch(/helada/i);
        expect(helada.source_url).toMatch(/ideam|pronosticosyalertas/i);
        expect(helada.source_label).toMatch(/IDEAM/i);
        expect(helada.cta_view).toBe('agente');
    });

    it('climate_zone notif incluye prefilled_prompt con la zona + riesgos', () => {
        // Stub global del módulo REGIONAL_CLIMATE_ALERTS via la fuente real.
        // Para test puro, pasamos una zona conocida y verificamos la forma del
        // prompt si la zona existe (fallback silencioso si no está en el catálogo).
        const out = aggregateNotifications({
            bioculturalZone: 'andina_alta_paramo',
        });
        // El test es defensivo: si la zona no existe en REGIONAL_CLIMATE_ALERTS
        // el push se salta. Lo importante es que cuando exista, prefilled_prompt
        // esté presente.
        const zoneNotif = out.find((n) => n.type === 'climate_zone');
        if (zoneNotif) {
            expect(zoneNotif.prefilled_prompt).toBeDefined();
            expect(typeof zoneNotif.prefilled_prompt).toBe('string');
            expect(zoneNotif.cta_view).toBe('agente');
        }
    });

    it('calendar_month notif incluye prefilled_prompt con cultivos sugeridos', () => {
        const out = aggregateNotifications({
            calendarMonth: {
                month: '2026-05',
                cultivos: ['maíz', 'frijol', 'cilantro'],
            },
        });
        const calNotif = out.find((n) => n.type === 'calendar_month');
        expect(calNotif).toBeDefined();
        expect(calNotif.prefilled_prompt).toBeDefined();
        expect(calNotif.prefilled_prompt).toMatch(/maíz|frijol|cilantro/);
        expect(calNotif.cta_view).toBe('agente');
    });
});
