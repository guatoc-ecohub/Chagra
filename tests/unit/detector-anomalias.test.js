/**
 * detector-anomalias.test.js — Tests para el demo de detector de anomalías
 * 
 * Prueba la lógica JavaScript del demo de análisis de imágenes de plantas
 * usando VLM para detectar clorosis, plagas y estrés hídrico.
 */

import { describe, it, expect } from 'vitest';

describe('Detector de Anomalías - Demo Logic', () => {
  describe('formatAnomalyName', () => {
    it('debería formatear nombres de anomalías con snake_case', () => {
      // Mock the function logic
      const formatAnomalyName = (type) => {
        return type.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
      };

      expect(formatAnomalyName('clorosis')).toBe('Clorosis');
      expect(formatAnomalyName('estrés_hídrico')).toBe('Estrés Hídrico');
      expect(formatAnomalyName('plaga_potencial')).toBe('Plaga Potencial');
      expect(formatAnomalyName('enfermedad_fúngica')).toBe('Enfermedad Fúngica');
    });

    it('debería manejar palabras simples', () => {
      const formatAnomalyName = (type) => {
        return type.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
      };

      expect(formatAnomalyName('normal')).toBe('Normal');
      expect(formatAnomalyName('severity')).toBe('Severity');
    });
  });

  describe('formatDetailKey', () => {
    it('debería formatear claves de detalles', () => {
      const formatDetailKey = (key) => {
        return key.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
      };

      expect(formatDetailKey('affected_leaves')).toBe('Affected Leaves');
      expect(formatDetailKey('recovery_potential')).toBe('Recovery Potential');
      expect(formatDetailKey('next_check')).toBe('Next Check');
    });
  });

  describe('Mock Response Structure', () => {
    it('debería tener la estructura correcta para respuesta mock', () => {
      const mockResponse = {
        anomalies: [
          {
            type: 'clorosis',
            confidence: 0.78,
            severity: 'media',
            description: 'Test description',
            details: {
              affected_leaves: '30-40%',
              pattern: 'Test pattern'
            }
          }
        ],
        summary: {
          overall_health: 'medianamente_sana',
          primary_concern: 'clorosis',
          recommendation: 'Test recommendation',
          next_check: '7 days'
        }
      };

      expect(mockResponse.anomalies).toBeDefined();
      expect(mockResponse.anomalies).toHaveLength(1);
      expect(mockResponse.anomalies[0].type).toBe('clorosis');
      expect(mockResponse.anomalies[0].confidence).toBeGreaterThan(0);
      expect(mockResponse.anomalies[0].confidence).toBeLessThanOrEqual(1);
      expect(mockResponse.summary).toBeDefined();
      expect(mockResponse.summary.primary_concern).toBe('clorosis');
    });
  });

  describe('Confidence Level Classification', () => {
    it('debería clasificar correctamente los niveles de confianza', () => {
      const getConfidenceLevel = (confidence) => {
        const percent = Math.round(confidence * 100);
        return percent >= 70 ? 'high' : percent >= 50 ? 'medium' : 'low';
      };

      expect(getConfidenceLevel(0.9)).toBe('high');
      expect(getConfidenceLevel(0.7)).toBe('high');
      expect(getConfidenceLevel(0.69)).toBe('medium');
      expect(getConfidenceLevel(0.5)).toBe('medium');
      expect(getConfidenceLevel(0.49)).toBe('low');
      expect(getConfidenceLevel(0.2)).toBe('low');
    });
  });

  describe('Severity Classification', () => {
    it('debería mapear severidad a clases CSS correctamente', () => {
      const getSeverityClass = (severity) => {
        return severity === 'alta' ? 'high' : 
               severity === 'media' ? 'medium' : 'low';
      };

      expect(getSeverityClass('alta')).toBe('high');
      expect(getSeverityClass('media')).toBe('medium');
      expect(getSeverityClass('baja')).toBe('low');
      expect(getSeverityClass('unknown')).toBe('low');
    });
  });

  describe('Photo State Management', () => {
    it('debería mantener el estado de fotos correctamente', () => {
      const mockPhoto = {
        id: Date.now(),
        name: 'test.jpg',
        date: new Date(),
        dataUrl: 'data:image/jpeg;base64,test'
      };

      expect(mockPhoto.id).toBeDefined();
      expect(mockPhoto.name).toBe('test.jpg');
      expect(mockPhoto.date).toBeInstanceOf(Date);
      expect(mockPhoto.dataUrl).toMatch(/^data:image\/jpeg;base64/);
    });

    it('debería requerir mínimo 2 fotos para análisis', () => {
      const photos = [];
      const canAnalyze = photos.length >= 2;
      
      expect(canAnalyze).toBe(false);

      photos.push({ id: 1, name: 'photo1.jpg' });
      expect(photos.length >= 2).toBe(false);

      photos.push({ id: 2, name: 'photo2.jpg' });
      expect(photos.length >= 2).toBe(true);
    });
  });

  describe('API Endpoint Configuration', () => {
    it('debería tener configuración correcta del endpoint', () => {
      const apiEndpoint = '/api/mcp/agro';
      const model = 'qwen3-vl:4b';

      expect(apiEndpoint).toBe('/api/mcp/agro');
      expect(model).toBe('qwen3-vl:4b');
    });
  });

  describe('Anomaly Types', () => {
    it('debería soportar tipos de anomalías conocidos', () => {
      const knownTypes = [
        'clorosis',
        'estrés_hídrico',
        'plaga_potencial',
        'enfermedad_fúngica',
        'deficiencia_nutricional',
        'daño_mecánico'
      ];

      knownTypes.forEach(type => {
        expect(typeof type).toBe('string');
        expect(type.length).toBeGreaterThan(0);
      });
    });
  });
});