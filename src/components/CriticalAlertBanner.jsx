import { useState, useEffect, useMemo, useCallback } from 'react';
import { AlertTriangle, X, ChevronRight } from 'lucide-react';
import { aggregateNotifications, dismissNotification } from '../services/notificationsService';
import useAlertStore from '../store/useAlertStore';

/**
 * CriticalAlertBanner — banner global que SURFACEA las alertas críticas sin
 * que el operador tenga que abrir la campana de notificaciones (#315).
 *
 * Bug que arregla: una alerta ambiental grave (p.ej. helada nocturna −2 °C)
 * solo vivía como badge dentro del NotificationsBell. Si el operador no
 * abría la campana, NUNCA la veía — justo cuando más importaba (proteger
 * cultivos antes de la helada). Este banner aparece fijo arriba, rojo y
 * pulsante, imposible de ignorar, en cualquier pantalla.
 *
 * Fuentes de criticalidad (unifica los dos canales que existían dispersos):
 *   1. notificationsService.aggregateNotifications() severity 'critical'
 *      (helada demo-seed, sync >5, tareas vencidas >3).
 *   2. useAlertStore severity 'danger' (motor de alertas sensor/clima).
 *
 * Dismiss es por-sesión y por-id: descartás la helada de hoy y no vuelve a
 * molestar en esta sesión, pero una alerta crítica NUEVA (otro id) sí
 * reaparece. No se persiste cross-sesión a propósito: si mañana hay otra
 * helada, debe volver a gritar.
 */

const SESSION_DISMISS_KEY = 'chagra:critical-banner:dismissed';

function readDismissed() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SESSION_DISMISS_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function persistDismissed(set) {
  try {
    sessionStorage.setItem(SESSION_DISMISS_KEY, JSON.stringify([...set]));
  } catch {
    /* sessionStorage no disponible — degradar silencioso */
  }
}

/** @param {{ onNavigate?: (view: string) => void }} props */
export default function CriticalAlertBanner({ onNavigate }) {
  const [tick, setTick] = useState(0);
  const [dismissed, setDismissed] = useState(() => readDismissed());
  // Suscripción reactiva al motor de alertas (severity 'danger').
  const storeAlerts = useAlertStore((s) => s.activeAlerts);

  // Re-evaluar el canal de notificaciones (no es un store React) ante los
  // eventos que pueden crear/limpiar una crítica, y al volver a la pestaña.
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    const events = ['alertTriggered', 'alertCleared', 'notificationDismissed', 'focus', 'storage'];
    events.forEach((e) => window.addEventListener(e, bump));
    return () => events.forEach((e) => window.removeEventListener(e, bump));
  }, []);

  const criticals = useMemo(() => {
    // Canal 1 — notificaciones agregadas. Pasamos onboardingComplete/hasUpdate
    // para suprimir las no-críticas; igual filtramos por severity 'critical'.
    let notifs = [];
    try {
      notifs = aggregateNotifications({ onboardingComplete: true, hasUpdate: false })
        .filter((n) => n.severity === 'critical');
    } catch {
      notifs = [];
    }
    // Canal 2 — motor de alertas (severity 'danger') → shape de notificación.
    const danger = (storeAlerts || [])
      .filter((a) => a && a.severity === 'danger')
      .map((a) => ({
        id: `alert_${a.type || a.id || 'danger'}`,
        type: a.type || 'sensor_critical',
        severity: 'critical',
        title: a.title || a.label || 'Alerta crítica',
        body: a.message || a.body || a.detail || '',
        cta_view: 'agente',
        cta_label: 'Preguntar al agente',
        prefilled_prompt: a.prefilled_prompt || null,
        source_label: a.source_label || a.source || 'Motor de alertas Chagra',
      }));
    return [...notifs, ...danger].filter((n) => n && !dismissed.has(n.id));
    // tick fuerza re-lectura del canal de notificaciones (no-reactivo) ante
    // eventos; es una dependencia intencional aunque no se use en el cuerpo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeAlerts, dismissed, tick]);

  const top = criticals[0];

  const handleDismiss = useCallback(() => {
    if (!top) return;
    const next = new Set(dismissed);
    next.add(top.id);
    setDismissed(next);
    persistDismissed(next);
    // Las del canal de notificaciones se marcan también en su servicio
    // (las del motor de alertas 'alert_*' y demo 'demo_*' solo por-sesión).
    if (top.id && !top.id.startsWith('alert_') && !top.id.startsWith('demo_')) {
      try {
        dismissNotification(top.id);
      } catch {
        /* no-op */
      }
    }
  }, [top, dismissed]);

  const handleCta = useCallback(() => {
    if (!top) return;
    if (top.prefilled_prompt) {
      try {
        sessionStorage.setItem('chagra:agent:prefilled', top.prefilled_prompt);
      } catch {
        /* no-op */
      }
    }
    if (typeof onNavigate === 'function') onNavigate(top.cta_view || 'agente');
  }, [top, onNavigate]);

  if (!top) return null;

  const extraCount = criticals.length - 1;

  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="critical-alert-banner"
      className="fixed top-0 inset-x-0 z-[120] bg-gradient-to-r from-red-950/95 via-red-900/95 to-red-950/95 border-b-2 border-red-400 backdrop-blur-sm shadow-lg shadow-red-900/50"
    >
      {/* Fondo rojo oscuro FIJO (no theme-aware a propósito): una crítica se ve
          igual de alarmante en biopunk y en los temas claros; el texto claro
          sobre rojo profundo mantiene contraste AA en todos. */}
      <div className="max-w-2xl mx-auto px-3 py-2.5 flex items-start gap-3">
        <span className="relative flex h-6 w-6 shrink-0 items-center justify-center mt-0.5">
          <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-red-500/60" />
          <AlertTriangle size={20} className="relative text-red-100" />
        </span>
        <button
          type="button"
          onClick={handleCta}
          className="flex-1 text-left min-w-0"
          aria-label={`${top.title}. ${top.cta_label || 'Ver detalle'}`}
        >
          <p className="text-sm font-black text-white leading-tight">{top.title}</p>
          {top.body && (
            <p className="text-xs text-red-100/90 mt-0.5 line-clamp-2">{top.body}</p>
          )}
          <span className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 rounded-full bg-red-500/25 border border-red-300/40 text-2xs font-bold text-red-50 uppercase tracking-wide">
            {top.cta_label || 'Ver detalle'}
            <ChevronRight size={12} />
          </span>
          {extraCount > 0 && (
            <span className="ml-2 text-2xs font-semibold text-red-200/90">+{extraCount} más crítica{extraCount === 1 ? '' : 's'}</span>
          )}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Descartar alerta"
          data-testid="critical-alert-dismiss"
          className="shrink-0 p-1.5 rounded-lg text-red-300 hover:text-white hover:bg-red-800/50 transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
