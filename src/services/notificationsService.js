/**
 * notificationsService — agregador de alertas del campesino.
 *
 * Cervezas-test 2026-05-28: incluye seed de demo "🥶 Helada -2°C esta noche"
 * que se activa via localStorage flag `chagra:demo:seed-helada` para impacto
 * en piloto. Quitar post-demo.
 *
 * Severidad:
 *   - critical (rojo, pulsa): bloquea operación — heladas, sequía severa
 *   - warning (ámbar): atención requerida — tareas vencidas, riego bajo
 *   - info (azul): contextual — calendario siembra, update disponible
 */

import { REGIONAL_CLIMATE_ALERTS } from './agentService';

const STORAGE_DISMISSED = 'chagra:notifications:dismissed:v1';
const STORAGE_DEMO_SEED = 'chagra:demo:seed-helada';

function readDismissedIds() {
    try {
        const raw = localStorage.getItem(STORAGE_DISMISSED);
        if (!raw) return new Set();
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return new Set();
        return new Set(parsed);
    } catch {
        return new Set();
    }
}

function writeDismissedIds(idsSet) {
    try {
        localStorage.setItem(STORAGE_DISMISSED, JSON.stringify(Array.from(idsSet)));
    } catch {
        // ignore quota
    }
}

export function dismissNotification(id) {
    const set = readDismissedIds();
    set.add(id);
    writeDismissedIds(set);
    window.dispatchEvent(new CustomEvent('chagra:notifications-dismissed', { detail: id }));
}

export function clearDismissed() {
    writeDismissedIds(new Set());
    window.dispatchEvent(new CustomEvent('chagra:notifications-dismissed', { detail: null }));
}

/**
 * Activa o desactiva el seed demo de helada crítica. Útil para el
 * cervezas-test del piloto.
 */
export function setDemoSeedHelada(enabled) {
    try {
        if (enabled) localStorage.setItem(STORAGE_DEMO_SEED, '1');
        else localStorage.removeItem(STORAGE_DEMO_SEED);
        window.dispatchEvent(new CustomEvent('chagra:notifications-dismissed', { detail: 'demo-toggle' }));
    } catch { /* ignore */ }
}

export function isDemoSeedHeladaActive() {
    try {
        // Acepta ?demo=helada en la URL como activador efímero — útil para
        // mostrar la alerta a un usuario en vivo sin tocarle el localStorage
        // a mano. Si el query param está presente, también se persiste para
        // sobrevivir reloads del SW.
        if (typeof window !== 'undefined' && window.location?.search) {
            const params = new URLSearchParams(window.location.search);
            if (params.get('demo') === 'helada') {
                try { localStorage.setItem(STORAGE_DEMO_SEED, '1'); } catch { /* ignore */ }
                return true;
            }
            if (params.get('demo') === 'off') {
                try { localStorage.removeItem(STORAGE_DEMO_SEED); } catch { /* ignore */ }
                return false;
            }
        }
        return localStorage.getItem(STORAGE_DEMO_SEED) === '1';
    }
    catch { return false; }
}

/**
 * Sources opcional: { plants, tasks, failedTxCount, hasUpdate, onboardingComplete, bioculturalZone, calendarMonth, iotAlerts }
 */
export function aggregateNotifications(sources = {}) {
    const dismissed = readDismissedIds();
    const out = [];
    const now = Date.now();

    // 0. DEMO SEED — Helada crítica fingida (cervezas-test 2026-05-28).
    // Auto-activa si flag o si bioculturalZone es paramo (default ON para alpha demo).
    const heladaActive = isDemoSeedHeladaActive() ||
        (sources.bioculturalZone && sources.bioculturalZone.includes('paramo'));
    if (heladaActive) {
        out.push({
            id: 'demo_helada_critical',
            type: 'climate_critical',
            severity: 'critical',
            title: '🥶 Helada esta noche · −2 °C',
            body: 'Cubre cultivos sensibles antes de las 7 PM. Riesgo papas, tomate y hortalizas en zona andina alta.',
            cta_view: 'agente',
            cta_label: 'Preguntar al agente',
            // UX 2026-05-28: cuando la notificación crítica viaja al agente,
            // pasamos un prompt pre-cargado + cita de la entidad emisora para
            // que el operador no re-tipee y vea de dónde viene la alerta.
            prefilled_prompt: 'Tengo alerta de helada esta noche con mínima de −2 °C. ¿Qué debo proteger primero y cómo lo cubro? Considera papas, tomate y hortalizas en zona andina alta.',
            source_label: 'IDEAM · Pronósticos y Alertas',
            source_url: 'http://www.pronosticosyalertas.gov.co/clima/condiciones-globales',
            created_at: now,
        });
    }

    // 1. Onboarding incompleto.
    // Bug fix 2026-05-28 (operador): cta_view era 'onboarding-piloto' (el
    // formulario de invitados externos sin cuenta — "registro de mis amigos"),
    // debe ser 'onboarding-perfil' (el onboarding extendido del usuario real,
    // #200 OnboardingProfile.jsx) que es el que efectivamente completa el
    // perfil que la notif pide completar.
    if (sources.onboardingComplete === false) {
        out.push({
            id: 'onboarding_incomplete',
            type: 'onboarding_incomplete',
            severity: 'warning',
            title: 'Completa tu perfil',
            body: 'Cuéntame de tu finca y zona para darte mejor asesoría.',
            cta_view: 'onboarding-perfil',
            cta_label: 'Continuar',
            created_at: now,
        });
    }

    // 2. App update disponible
    if (sources.hasUpdate) {
        out.push({
            id: 'app_update',
            type: 'app_update',
            severity: 'info',
            title: 'Nueva versión disponible',
            body: 'Hay mejoras nuevas. Recarga para aplicarlas.',
            cta_view: null,
            cta_label: 'Recargar',
            created_at: now,
        });
    }

    // 3. Sync pending
    if (typeof sources.failedTxCount === 'number' && sources.failedTxCount > 0) {
        out.push({
            id: 'sync_pending',
            type: 'sync_pending',
            severity: sources.failedTxCount > 5 ? 'critical' : 'warning',
            title: `${sources.failedTxCount} cambio${sources.failedTxCount === 1 ? '' : 's'} sin sincronizar`,
            body: 'Hubo errores subiendo cambios al servidor. Revísalos.',
            cta_view: 'historial',
            cta_label: 'Ver',
            created_at: now,
        });
    }

    // 4. Tareas vencidas
    if (Array.isArray(sources.tasks) && sources.tasks.length > 0) {
        const overdue = sources.tasks.filter((t) => {
            if (!t.due_date) return false;
            return new Date(t.due_date).getTime() < now;
        });
        if (overdue.length > 0) {
            out.push({
                id: 'tasks_overdue',
                type: 'tasks_pending',
                severity: overdue.length > 3 ? 'critical' : 'warning',
                title: `${overdue.length} tarea${overdue.length === 1 ? '' : 's'} vencida${overdue.length === 1 ? '' : 's'}`,
                body: overdue.length === 1
                    ? `"${overdue[0].title || overdue[0].name || 'Tarea'}" pasó su fecha.`
                    : 'Tienes tareas atrasadas en tu finca.',
                cta_view: 'task_log',
                cta_label: 'Revisar',
                created_at: now,
            });
        }
    }

    // 5. Alertas climáticas regionales (estáticas)
    if (sources.bioculturalZone && REGIONAL_CLIMATE_ALERTS) {
        const zoneAlerts = REGIONAL_CLIMATE_ALERTS[sources.bioculturalZone];
        if (zoneAlerts && Array.isArray(zoneAlerts.riesgos) && zoneAlerts.riesgos.length > 0) {
            const zonaLabel = sources.bioculturalZone.replace(/_/g, ' ');
            const riesgosTop = zoneAlerts.riesgos.slice(0, 3).join(', ');
            out.push({
                id: `climate_zone_${sources.bioculturalZone}`,
                type: 'climate_zone',
                severity: 'info',
                title: `Tu zona: ${zonaLabel}`,
                body: `Riesgos típicos: ${riesgosTop}.`,
                cta_view: 'agente',
                cta_label: 'Preguntar',
                prefilled_prompt: `Mi zona es ${zonaLabel} y los riesgos típicos son: ${riesgosTop}. ¿Cómo me preparo para mi cultivo?`,
                source_label: 'IDEAM · Atlas climatológico',
                source_url: 'http://atlas.ideam.gov.co/visorAtlasClimatologico.html',
                created_at: now,
            });
        }
    }

    // 6. Calendario siembra (info)
    if (sources.calendarMonth && Array.isArray(sources.calendarMonth.cultivos) && sources.calendarMonth.cultivos.length > 0) {
        const cultivosTop = sources.calendarMonth.cultivos.slice(0, 3).join(', ');
        out.push({
            id: `calendar_month_${sources.calendarMonth.month}`,
            type: 'calendar_month',
            severity: 'info',
            title: 'Este mes puedes sembrar',
            body: `Para tu piso térmico: ${cultivosTop}…`,
            cta_view: 'agente',
            cta_label: 'Más info',
            prefilled_prompt: `Este mes podría sembrar ${cultivosTop}. ¿Cuál me recomiendas según mi finca y cómo lo arranco?`,
            created_at: now,
        });
    }

    // 7. IoT sensores con anomalía
    if (Array.isArray(sources.iotAlerts) && sources.iotAlerts.length > 0) {
        const recent = sources.iotAlerts.filter((a) => {
            const age = now - new Date(a.timestamp || a.created_at || 0).getTime();
            return age < 24 * 60 * 60 * 1000;
        });
        recent.slice(0, 3).forEach((alert, idx) => {
            out.push({
                id: `iot_${alert.id || `${alert.sensor}_${idx}`}`,
                type: 'iot_sensor',
                severity: alert.severity || 'warning',
                title: alert.title || `Alerta sensor: ${alert.sensor || 'sin nombre'}`,
                body: alert.message || alert.body || '',
                cta_view: 'mapa',
                cta_label: 'Ver sensor',
                created_at: new Date(alert.timestamp || alert.created_at || now).getTime(),
            });
        });
    }

    const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };
    return out
        .filter((n) => !dismissed.has(n.id))
        .sort((a, b) => {
            const sa = SEVERITY_ORDER[a.severity] ?? 99;
            const sb = SEVERITY_ORDER[b.severity] ?? 99;
            if (sa !== sb) return sa - sb;
            return b.created_at - a.created_at;
        });
}
