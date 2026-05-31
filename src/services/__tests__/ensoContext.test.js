import { describe, it, expect } from 'vitest';
import {
  ensoFamily,
  regionFromProfile,
  ensoRegionalLine,
  annotateAlertWithEnso,
  buildEnsoAgentLines,
  getEnsoOutlook,
  ENSO_WATCH_2026,
} from '../ensoContext';

describe('ensoContext', () => {
  describe('ensoFamily', () => {
    it('clasifica fases nino/nina/neutral', () => {
      expect(ensoFamily('nino_fuerte')).toBe('nino');
      expect(ensoFamily('nino_debil')).toBe('nino');
      expect(ensoFamily('nina_moderada')).toBe('nina');
      expect(ensoFamily('neutral')).toBe('neutral');
      expect(ensoFamily(undefined)).toBe('neutral');
      expect(ensoFamily(null)).toBe('neutral');
    });
  });

  describe('regionFromProfile', () => {
    it('infiere región por departamento', () => {
      expect(regionFromProfile({ departamento: 'La Guajira' })).toBe('caribe');
      expect(regionFromProfile({ departamento: 'Boyacá' })).toBe('andina');
      expect(regionFromProfile({ departamento: 'Amazonas' })).toBe('amazonia');
      expect(regionFromProfile({ departamento: 'Meta' })).toBe('orinoquia');
      expect(regionFromProfile({ departamento: 'Chocó' })).toBe('pacifico');
    });

    it('infiere región por texto de municipio/region', () => {
      expect(regionFromProfile({ region: 'Riohacha, La Guajira' })).toBe('caribe');
      expect(regionFromProfile({ municipio: 'Choachí, Cundinamarca' })).toBe('andina');
    });

    it('cae a piso térmico si no hay departamento', () => {
      expect(regionFromProfile({ piso_termico: 'frio' })).toBe('andina');
      expect(regionFromProfile({ piso_termico: 'paramo' })).toBe('andina');
    });

    it('devuelve null sin información', () => {
      expect(regionFromProfile({})).toBeNull();
      expect(regionFromProfile(null)).toBeNull();
    });
  });

  describe('ensoRegionalLine', () => {
    it('da la línea Niño para región conocida', () => {
      const line = ensoRegionalLine('nino_moderado', 'andina');
      expect(line).toMatch(/heladas/i);
    });
    it('da la línea de vigilancia en fase neutral', () => {
      const line = ensoRegionalLine('neutral', 'caribe');
      expect(line).toMatch(/vigilancia/i);
    });
    it('devuelve vacío sin región', () => {
      expect(ensoRegionalLine('nino_fuerte', null)).toBe('');
    });
  });

  describe('annotateAlertWithEnso', () => {
    it('anota alerta de helada incluso en fase neutral', () => {
      const alert = { type: 'HELADA', severity: 'warning' };
      const out = annotateAlertWithEnso(alert, { phase: 'neutral', region: 'andina' });
      expect(out.enso_context).toBeDefined();
      expect(out.enso_context.region).toBe('andina');
      expect(out.enso_context.source).toMatch(/NOAA/);
    });

    it('NO anota alerta no-seca en fase neutral', () => {
      const alert = { type: 'LLUVIA_TORRENCIAL', severity: 'danger' };
      const out = annotateAlertWithEnso(alert, { phase: 'neutral', region: 'caribe' });
      expect(out.enso_context).toBeUndefined();
    });

    it('anota cualquier alerta en fase Niño activa', () => {
      const alert = { type: 'OLA_CALOR', severity: 'warning' };
      const out = annotateAlertWithEnso(alert, { phase: 'nino_fuerte', region: 'caribe' });
      expect(out.enso_context).toBeDefined();
      expect(out.enso_context.family).toBe('nino');
    });

    it('no muta el objeto original', () => {
      const alert = { type: 'HELADA' };
      annotateAlertWithEnso(alert, { phase: 'nino_fuerte', region: 'andina' });
      expect(alert.enso_context).toBeUndefined();
    });
  });

  describe('buildEnsoAgentLines', () => {
    it('en neutral advierte que es vigilancia, no Niño activo', () => {
      const txt = buildEnsoAgentLines({ phase: 'neutral', region: 'andina' });
      expect(txt).toMatch(/vigilancia/i);
      expect(txt).toMatch(/NO afirmes que El Niño ya está activo/i);
    });
    it('en Niño activo da lectura regional', () => {
      const txt = buildEnsoAgentLines({ phase: 'nino_moderado', region: 'caribe' });
      expect(txt).toMatch(/sequía|hídrico/i);
    });
  });

  describe('getEnsoOutlook', () => {
    it('devuelve outlook de vigilancia en neutral con probabilidad alta', () => {
      const o = getEnsoOutlook({ phase: 'neutral', region: 'andina' });
      expect(o).not.toBeNull();
      expect(o.titulo).toMatch(/Vigilancia/i);
    });
    it('devuelve outlook El Niño en fase activa', () => {
      const o = getEnsoOutlook({ phase: 'nino_fuerte', region: 'caribe' });
      expect(o.titulo).toMatch(/El Niño/i);
    });
    it('usa el default DJF si no hay probabilities', () => {
      const o = getEnsoOutlook({ phase: 'neutral' });
      expect(o.detalle).toContain(String(ENSO_WATCH_2026.transicion_nino.DJF_2026_27));
    });
  });
});
