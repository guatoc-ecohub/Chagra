import { describe, it, expect } from 'vitest';
import {
  SEVERITY_TRIGGER_CASE_BRIDGE,
  shouldTriggerCaseBridge,
  CASE_BRIDGE_HEALTH_SCORE_THRESHOLD,
  healthScoreToCaseSeverity,
} from '../caseBridge';

// Audit 070.6 satélites — reglas compartidas del bridge severity →
// case_study. La regla de severity replica la del flujo principal
// (ObservationScreen); el umbral de salud foliar alimenta los satélites
// (AssetTimeline revisión IA, EvidenceCapture diagnóstico IA).

describe('shouldTriggerCaseBridge', () => {
  it('dispara con high y critical (mismo set que el flujo principal)', () => {
    expect(shouldTriggerCaseBridge('high')).toBe(true);
    expect(shouldTriggerCaseBridge('critical')).toBe(true);
  });

  it('NO dispara con severidades menores ni valores ausentes', () => {
    expect(shouldTriggerCaseBridge('low')).toBe(false);
    expect(shouldTriggerCaseBridge('info')).toBe(false);
    expect(shouldTriggerCaseBridge('medium')).toBe(false);
    expect(shouldTriggerCaseBridge(undefined)).toBe(false);
    expect(shouldTriggerCaseBridge(null)).toBe(false);
  });

  it('el set exportado coincide con la regla documentada', () => {
    expect(SEVERITY_TRIGGER_CASE_BRIDGE).toEqual(new Set(['high', 'critical']));
  });
});

describe('healthScoreToCaseSeverity', () => {
  it('score < 50 mapea a severity high', () => {
    expect(healthScoreToCaseSeverity(30)).toBe('high');
    expect(healthScoreToCaseSeverity(0)).toBe('high');
    expect(healthScoreToCaseSeverity(49.9)).toBe('high');
  });

  it('score >= 50 retorna null (planta suficientemente sana, sin bridge)', () => {
    expect(healthScoreToCaseSeverity(50)).toBeNull();
    expect(healthScoreToCaseSeverity(80)).toBeNull();
    expect(healthScoreToCaseSeverity(100)).toBeNull();
  });

  it('entradas no numéricas retornan null (fallback seguro)', () => {
    expect(healthScoreToCaseSeverity(undefined)).toBeNull();
    expect(healthScoreToCaseSeverity(null)).toBeNull();
    expect(healthScoreToCaseSeverity(NaN)).toBeNull();
  });

  it('el umbral exportado es 50 (coherente con la UI: verde desde 60)', () => {
    expect(CASE_BRIDGE_HEALTH_SCORE_THRESHOLD).toBe(50);
  });
});
