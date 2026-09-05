/**
 * caseBridge.js — reglas compartidas del bridge severity → case_study
 * (audit 070.6 + satélites).
 *
 * Flujo principal (ObservationScreen): tras guardar una observación con
 * severity high/critical se abre CaseLinkModal para vincular el log a un
 * caso de estudio. Este módulo centraliza esa regla para que los flujos
 * satélite (AssetTimeline revisión IA, EvidenceCapture diagnóstico IA)
 * usen la MISMA constante en vez de duplicarla.
 *
 * Umbral de salud foliar: el diagnóstico IA produce un score 0-100 donde
 * más alto = más sano (EvidenceCapture pinta verde a partir de 60). Una
 * planta con score < 50 se considera en problema y el bridge se ofrece
 * con severity 'high'. No existe (aún) señal que justifique el tier
 * 'critical' en estos flujos derivados: si aparece, se ajusta aquí (punto único).
 */

export const SEVERITY_TRIGGER_CASE_BRIDGE = new Set(['high', 'critical']);

/** ¿Esta severity dispara el CaseLinkModal post-save? */
export const shouldTriggerCaseBridge = (severity) =>
  SEVERITY_TRIGGER_CASE_BRIDGE.has(severity);

/** Score de salud foliar por debajo del cual se ofrece el bridge (0-100). */
export const CASE_BRIDGE_HEALTH_SCORE_THRESHOLD = 50;

/**
 * Mapea el score de salud del diagnóstico IA (0-100, más alto = más sano)
 * a la severity del bridge. Retorna null cuando la planta está
 * suficientemente sana y NO debe ofrecerse el bridge.
 *
 * @param {number} score - score 0-100 del diagnóstico (analyzeFoliage).
 * @returns {'high'|null}
 */
export const healthScoreToCaseSeverity = (score) => {
  if (typeof score !== 'number' || !Number.isFinite(score)) return null;
  return score < CASE_BRIDGE_HEALTH_SCORE_THRESHOLD ? 'high' : null;
};
