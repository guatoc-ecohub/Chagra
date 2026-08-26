import { CAMPESINO_HOME_ROUTES } from '../../config/campesinoHomeRoutes';

export function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function readableAlert(alert) {
  if (!alert) return null;
  return clean(alert.message) || clean(alert.body) || clean(alert.detail) || clean(alert.title) || clean(alert.type);
}

/**
 * Elige una sola acción del día desde fuentes existentes, en orden de urgencia.
 * No crea ni persiste estado derivado.
 */
export function selectActionDay(activeAlerts = [], pendingTask = null, angelitaMessage = '') {
  const alerts = Array.isArray(activeAlerts) ? activeAlerts : [];
  const alert = [...alerts].sort(
    (a, b) => (a.severity === 'danger' ? -1 : 1) - (b.severity === 'danger' ? -1 : 1),
  )[0];
  if (alert) {
    return {
      kind: 'alerta',
      title: clean(alert.cta_label) || 'Ver el aviso',
      detail: readableAlert(alert),
      view: 'hoy_finca',
      data: { alertType: alert.type },
    };
  }
  if (pendingTask) {
    return {
      kind: 'tarea',
      title: clean(pendingTask.cta_label) || 'Continuar la labor',
      detail: clean(pendingTask.title) || clean(pendingTask.name) || clean(pendingTask.label) || clean(pendingTask.notes),
      view: 'hoy_finca',
    };
  }
  if (angelitaMessage) {
    return { kind: 'compai', title: 'Escuchar el aviso', detail: angelitaMessage, view: 'hoy_finca' };
  }
  return null;
}

export function canonicalizeCampesinoRoute(view) {
  if (view === 'mercado') return CAMPESINO_HOME_ROUTES.mercado;
  if (view === 'voz' || view === 'registro_voz') return CAMPESINO_HOME_ROUTES.voz;
  return view;
}
