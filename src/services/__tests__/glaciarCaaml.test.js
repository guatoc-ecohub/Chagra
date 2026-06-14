/**
 * glaciarCaaml.test.js — tests unitarios para exportación CAAML v6 de reportes glaciar.
 *
 * Verifica:
 * - toCaamlXml() genera XML válido con namespace CAAML v6
 * - Mapeo correcto de durezas Chagra → CAAML (F, 4F, 1F, P, K, H1, H2 → F/1+1F/1F/P/K/I)
 * - Mapeo correcto de tipos de superficie Chagra → CAAML grainType
 * - Parseo de profundidades (rangos '0–10 cm' → depthTop 0)
 * - Escape XML de caracteres especiales (guía con &, <, etc.)
 * - Múltiples capas ordenadas correctamente
 * - Fallback cuando no hay capas (layer default)
 * - downloadCaaml() dispara descarga (verificación de mock)
 */
/* global global */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { toCaamlXml, downloadCaaml } from '../glaciarCaaml';

// Mock de DOM para test de download
const mockLink = {
  href: '',
  download: '',
  style: { display: '' },
  click: vi.fn(),
};

global.URL = {
  createObjectURL: vi.fn(() => 'blob:mock-url'),
  revokeObjectURL: vi.fn(),
};

global.document = {
  createElement: vi.fn(() => mockLink),
  body: {
    appendChild: vi.fn(),
    removeChild: vi.fn(),
  },
};

describe('glaciarCaaml — exportación CAAML v6', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('toCaamlXml() — estructura básica', () => {
    it('genera XML con namespace CAAML v6 y cabecera válida', () => {
      const reporte = {
        id: 'glaciar-test-1',
        guia: 'Pedro Pérez',
        montana: 'cocuy_ritacuba',
        fechaISO: '2026-06-14T10:30:00Z',
        lat: 4.8,
        lng: -75.3,
        altitud: 4800,
        capas: [],
      };
      
      const xml = toCaamlXml(reporte);
      
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('xmlns:caaml="http://caaml.org/Schemas/SnowProfileIACS/v6"');
      expect(xml).toContain('xmlns:gml="http://www.opengis.net/gml"');
      expect(xml).toMatch(/<caaml:SnowProfile[^>]*>/);
      expect(xml).toContain('</caaml:SnowProfile>');
    });

    it('incluye meta datos con fecha, observador y comentario', () => {
      const reporte = {
        id: 'glaciar-test-2',
        guia: 'María González',
        montana: 'huila',
        fechaISO: '2026-06-14T14:00:00Z',
        puntoId: 'RITACUBA-FRENTE-01',
        lat: 2.5,
        lng: -76.5,
        altitud: 5000,
        capas: [],
      };
      
      const xml = toCaamlXml(reporte);
      
      expect(xml).toContain('<caaml:metaData>');
      expect(xml).toContain('<caaml:dateTimeString>2026-06-14T14:00:00Z</caaml:dateTimeString>');
      expect(xml).toContain('<caaml:name>María González</caaml:name>');
      expect(xml).toContain('Punto ID: RITACUBA-FRENTE-01');
      expect(xml).toContain('Montaña: huila');
      expect(xml).toContain('</caaml:metaData>');
    });

    it('incluye ubicación con coordenadas GML', () => {
      const reporte = {
        guia: 'Juan',
        lat: 4.8,
        lng: -75.3,
        altitud: 4800,
        puntoId: 'TEST-01',
        capas: [],
      };
      
      const xml = toCaamlXml(reporte);
      
      expect(xml).toContain('<caaml:location>');
      expect(xml).toContain('<caaml:obsPoint>');
      expect(xml).toContain('<gml:pos>4.8 -75.3 4800</gml:pos>');
      expect(xml).toContain('</caaml:location>');
    });
  });

  describe('toCaamlXml() — mapeo de durezas', () => {
    it('mapea dureza F → F (Fist)', () => {
      const reporte = {
        guia: 'Test',
        lat: 0,
        lng: 0,
        capas: [{ profundidad: '0–10 cm', tipoSuperficie: 'nieve_fresca', dureza: 'F' }],
      };
      
      const xml = toCaamlXml(reporte);
      expect(xml).toContain('<caaml:hardnessCode>F</caaml:hardnessCode>');
    });

    it('mapea dureza 4F → 1+1F (Two Fingers)', () => {
      const reporte = {
        guia: 'Test',
        lat: 0,
        lng: 0,
        capas: [{ profundidad: '0–10 cm', tipoSuperficie: 'firn_neve', dureza: '4F' }],
      };
      
      const xml = toCaamlXml(reporte);
      expect(xml).toContain('<caaml:hardnessCode>1+1F</caaml:hardnessCode>');
    });

    it('mapea dureza 1F → 1F (One Finger)', () => {
      const reporte = {
        guia: 'Test',
        lat: 0,
        lng: 0,
        capas: [{ profundidad: '10–20 cm', tipoSuperficie: 'firn_neve', dureza: '1F' }],
      };
      
      const xml = toCaamlXml(reporte);
      expect(xml).toContain('<caaml:hardnessCode>1F</caaml:hardnessCode>');
    });

    it('mapea dureza P → P (Pencil)', () => {
      const reporte = {
        guia: 'Test',
        lat: 0,
        lng: 0,
        capas: [{ profundidad: '20–40 cm', tipoSuperficie: 'firn_neve', dureza: 'P' }],
      };
      
      const xml = toCaamlXml(reporte);
      expect(xml).toContain('<caaml:hardnessCode>P</caaml:hardnessCode>');
    });

    it('mapea dureza K → K (Knife)', () => {
      const reporte = {
        guia: 'Test',
        lat: 0,
        lng: 0,
        capas: [{ profundidad: '40–60 cm', tipoSuperficie: 'hielo_glaciar_azul', dureza: 'K' }],
      };
      
      const xml = toCaamlXml(reporte);
      expect(xml).toContain('<caaml:hardnessCode>K</caaml:hardnessCode>');
    });

    it('mapea dureza H1 → I (Ice)', () => {
      const reporte = {
        guia: 'Test',
        lat: 0,
        lng: 0,
        capas: [{ profundidad: '60–80 cm', tipoSuperficie: 'hielo_glaciar_azul', dureza: 'H1' }],
      };
      
      const xml = toCaamlXml(reporte);
      expect(xml).toContain('<caaml:hardnessCode>I</caaml:hardnessCode>');
    });

    it('mapea dureza H2 → I (Ice, no distingue entre hielo blando/duro)', () => {
      const reporte = {
        guia: 'Test',
        lat: 0,
        lng: 0,
        capas: [{ profundidad: '80–100 cm', tipoSuperficie: 'hielo_glaciar_azul', dureza: 'H2' }],
      };
      
      const xml = toCaamlXml(reporte);
      expect(xml).toContain('<caaml:hardnessCode>I</caaml:hardnessCode>');
    });

    it('hace fallback a F para dureza desconocida', () => {
      const reporte = {
        guia: 'Test',
        lat: 0,
        lng: 0,
        capas: [{ profundidad: '0–10 cm', tipoSuperficie: 'nieve_fresca', dureza: 'DESCONOCIDO' }],
      };
      
      const xml = toCaamlXml(reporte);
      expect(xml).toContain('<caaml:hardnessCode>F</caaml:hardnessCode>');
    });
  });

  describe('toCaamlXml() — mapeo de tipos de superficie', () => {
    it('mapea nieve_fresca → PP (Precipitation Particles)', () => {
      const reporte = {
        guia: 'Test',
        lat: 0,
        lng: 0,
        capas: [{ profundidad: '0–10 cm', tipoSuperficie: 'nieve_fresca', dureza: 'F' }],
      };
      
      const xml = toCaamlXml(reporte);
      expect(xml).toContain('<caaml:primaryType>PP</caaml:primaryType>');
    });

    it('mapea firn_neve → RG (Rounded Grains)', () => {
      const reporte = {
        guia: 'Test',
        lat: 0,
        lng: 0,
        capas: [{ profundidad: '10–40 cm', tipoSuperficie: 'firn_neve', dureza: 'P' }],
      };
      
      const xml = toCaamlXml(reporte);
      expect(xml).toContain('<caaml:primaryType>RG</caaml:primaryType>');
    });

    it('mapea hielo_glaciar_azul → IF (Ice Formations)', () => {
      const reporte = {
        guia: 'Test',
        lat: 0,
        lng: 0,
        capas: [{ profundidad: '40–60 cm', tipoSuperficie: 'hielo_glaciar_azul', dureza: 'H1' }],
      };
      
      const xml = toCaamlXml(reporte);
      expect(xml).toContain('<caaml:primaryType>IF</caaml:primaryType>');
    });

    it('mapea hielo_podrido → IF (Ice Formations)', () => {
      const reporte = {
        guia: 'Test',
        lat: 0,
        lng: 0,
        capas: [{ profundidad: '0–20 cm', tipoSuperficie: 'hielo_podrido', dureza: '4F' }],
      };
      
      const xml = toCaamlXml(reporte);
      expect(xml).toContain('<caaml:primaryType>IF</caaml:primaryType>');
    });

    it('mapea penitentes → FC (Faceted Crystals)', () => {
      const reporte = {
        guia: 'Test',
        lat: 0,
        lng: 0,
        capas: [{ profundidad: '0–30 cm', tipoSuperficie: 'penitentes', dureza: '1F' }],
      };
      
      const xml = toCaamlXml(reporte);
      expect(xml).toContain('<caaml:primaryType>FC</caaml:primaryType>');
    });

    it('mapea hielo_cubierto_detritos → IF (Ice Formations)', () => {
      const reporte = {
        guia: 'Test',
        lat: 0,
        lng: 0,
        capas: [{ profundidad: '50–70 cm', tipoSuperficie: 'hielo_cubierto_detritos', dureza: 'K' }],
      };
      
      const xml = toCaamlXml(reporte);
      expect(xml).toContain('<caaml:primaryType>IF</caaml:primaryType>');
    });

    it('mapea hielo_sobreimpuesto → MF (Melt Freeze Crust)', () => {
      const reporte = {
        guia: 'Test',
        lat: 0,
        lng: 0,
        capas: [{ profundidad: '0–15 cm', tipoSuperficie: 'hielo_sobreimpuesto', dureza: 'K' }],
      };
      
      const xml = toCaamlXml(reporte);
      expect(xml).toContain('<caaml:primaryType>MF</caaml:primaryType>');
    });

    it('hace fallback a RG para tipo desconocido', () => {
      const reporte = {
        guia: 'Test',
        lat: 0,
        lng: 0,
        capas: [{ profundidad: '0–10 cm', tipoSuperficie: 'DESCONOCIDO', dureza: 'F' }],
      };
      
      const xml = toCaamlXml(reporte);
      expect(xml).toContain('<caaml:primaryType>RG</caaml:primaryType>');
    });
  });

  describe('toCaamlXml() — parseo de profundidades', () => {
    it('parsea rango con guion corto "0–10 cm" → depthTop 0', () => {
      const reporte = {
        guia: 'Test',
        lat: 0,
        lng: 0,
        capas: [{ profundidad: '0–10 cm', tipoSuperficie: 'nieve_fresca', dureza: 'F' }],
      };
      
      const xml = toCaamlXml(reporte);
      expect(xml).toContain('<caaml:depthTop uom="cm">0</caaml:depthTop>');
    });

    it('parsea rango con guion largo "10–40 cm" → depthTop 10', () => {
      const reporte = {
        guia: 'Test',
        lat: 0,
        lng: 0,
        capas: [{ profundidad: '10–40 cm', tipoSuperficie: 'firn_neve', dureza: 'P' }],
      };
      
      const xml = toCaamlXml(reporte);
      expect(xml).toContain('<caaml:depthTop uom="cm">10</caaml:depthTop>');
    });

    it('parsea rango con guion estándar "20-50 cm" → depthTop 20', () => {
      const reporte = {
        guia: 'Test',
        lat: 0,
        lng: 0,
        capas: [{ profundidad: '20-50 cm', tipoSuperficie: 'firn_neve', dureza: 'P' }],
      };
      
      const xml = toCaamlXml(reporte);
      expect(xml).toContain('<caaml:depthTop uom="cm">20</caaml:depthTop>');
    });

    it('parsea valor simple "5 cm" → depthTop 5', () => {
      const reporte = {
        guia: 'Test',
        lat: 0,
        lng: 0,
        capas: [{ profundidad: '5 cm', tipoSuperficie: 'nieve_fresca', dureza: 'F' }],
      };
      
      const xml = toCaamlXml(reporte);
      expect(xml).toContain('<caaml:depthTop uom="cm">5</caaml:depthTop>');
    });

    it('parsea valor simple sin unidad "12" → depthTop 12', () => {
      const reporte = {
        guia: 'Test',
        lat: 0,
        lng: 0,
        capas: [{ profundidad: '12', tipoSuperficie: 'firn_neve', dureza: '4F' }],
      };
      
      const xml = toCaamlXml(reporte);
      expect(xml).toContain('<caaml:depthTop uom="cm">12</caaml:depthTop>');
    });

    it('fallback a 0 si no puede parsear profundidad', () => {
      const reporte = {
        guia: 'Test',
        lat: 0,
        lng: 0,
        capas: [{ profundidad: 'profundo', tipoSuperficie: 'firn_neve', dureza: 'P' }],
      };
      
      const xml = toCaamlXml(reporte);
      expect(xml).toContain('<caaml:depthTop uom="cm">0</caaml:depthTop>');
    });
  });

  describe('toCaamlXml() — escape XML', () => {
    it('escapa caracteres especiales en nombre de guía', () => {
      const reporte = {
        guia: 'O\'Connor & Partners <guides>',
        lat: 0,
        lng: 0,
        capas: [],
      };
      
      const xml = toCaamlXml(reporte);
      expect(xml).toContain('<caaml:name>O&apos;Connor &amp; Partners &lt;guides&gt;</caaml:name>');
    });

    it('escapa caracteres especiales en notas', () => {
      const reporte = {
        guia: 'Test',
        lat: 0,
        lng: 0,
        capas: [],
        notas: 'Condición crítica: grietas >1m & riesgo <alto>',
      };
      
      const xml = toCaamlXml(reporte);
      expect(xml).toContain('Condición crítica: grietas &gt;1m &amp; riesgo &lt;alto&gt;');
    });

    it('escapa caracteres especiales en montañaLibre', () => {
      const reporte = {
        guia: 'Test',
        lat: 0,
        lng: 0,
        montanaLibre: 'Cerro <Norte> & Sur',
        capas: [],
      };
      
      const xml = toCaamlXml(reporte);
      expect(xml).toContain('Cerro &lt;Norte&gt; &amp; Sur');
    });
  });

  describe('toCaamlXml() — múltiples capas', () => {
    it('genera múltiples elementos <caaml:layer> con diferentes profundidades', () => {
      const reporte = {
        guia: 'Test',
        lat: 0,
        lng: 0,
        capas: [
          { profundidad: '0–10 cm', tipoSuperficie: 'nieve_fresca', dureza: 'F' },
          { profundidad: '10–30 cm', tipoSuperficie: 'firn_neve', dureza: '4F' },
          { profundidad: '30–60 cm', tipoSuperficie: 'firn_neve', dureza: 'P' },
          { profundidad: '60–90 cm', tipoSuperficie: 'hielo_glaciar_azul', dureza: 'K' },
        ],
      };
      
      const xml = toCaamlXml(reporte);
      
      // Verificar que hay 4 capas
      const layerMatches = xml.match(/<caaml:layer>/g);
      expect(layerMatches).toHaveLength(4);
      
      // Verificar que cada capa tiene su depthTop
      expect(xml).toContain('<caaml:depthTop uom="cm">0</caaml:depthTop>');
      expect(xml).toContain('<caaml:depthTop uom="cm">10</caaml:depthTop>');
      expect(xml).toContain('<caaml:depthTop uom="cm">30</caaml:depthTop>');
      expect(xml).toContain('<caaml:depthTop uom="cm">60</caaml:depthTop>');
    });

    it('mantiene orden de capas (superficie → profundo)', () => {
      const reporte = {
        guia: 'Test',
        lat: 0,
        lng: 0,
        capas: [
          { profundidad: '0–10 cm', tipoSuperficie: 'nieve_fresca', dureza: 'F' },
          { profundidad: '10–20 cm', tipoSuperficie: 'firn_neve', dureza: '4F' },
          { profundidad: '20–40 cm', tipoSuperficie: 'hielo_glaciar_azul', dureza: 'H1' },
        ],
      };
      
      const xml = toCaamlXml(reporte);
      
      // Verificar orden: F antes que 4F antes que I
      const fIndex = xml.indexOf('<caaml:hardnessCode>F</caaml:hardnessCode>');
      const fourFIndex = xml.indexOf('<caaml:hardnessCode>1+1F</caaml:hardnessCode>');
      const iceIndex = xml.indexOf('<caaml:hardnessCode>I</caaml:hardnessCode>');
      
      expect(fIndex).toBeLessThan(fourFIndex);
      expect(fourFIndex).toBeLessThan(iceIndex);
    });
  });

  describe('toCaamlXml() — casos borde', () => {
    it('genera layer default cuando no hay capas', () => {
      const reporte = {
        guia: 'Test',
        lat: 0,
        lng: 0,
        capas: [],
      };
      
      const xml = toCaamlXml(reporte);
      
      // Debe haber al menos un layer
      expect(xml).toContain('<caaml:layer>');
      expect(xml).toContain('<caaml:hardnessCode>F</caaml:hardnessCode>');
      expect(xml).toContain('<caaml:primaryType>PP</caaml:primaryType>');
    });

    it('genera layer default cuando capas es undefined', () => {
      const reporte = {
        guia: 'Test',
        lat: 0,
        lng: 0,
        // capas no está definido
      };
      
      const xml = toCaamlXml(reporte);
      
      expect(xml).toContain('<caaml:layer>');
      expect(xml).toContain('<caaml:hardnessCode>F</caaml:hardnessCode>');
    });

    it('lanza error cuando reporte es null', () => {
      expect(() => toCaamlXml(null)).toThrow('Reporte glaciar requerido');
    });

    it('lanza error cuando reporte es undefined', () => {
      expect(() => toCaamlXml(undefined)).toThrow('Reporte glaciar requerido');
    });

    it('incluye campos custom de condiciones ambientales', () => {
      const reporte = {
        guia: 'Test',
        lat: 0,
        lng: 0,
        tempSuperficie: -2,
        tempAmbiente: -5,
        cielo: 'despejado',
        viento: 'moderado',
        notas: 'Buenas condiciones para ascenso',
        capas: [],
      };
      
      const xml = toCaamlXml(reporte);
      
      expect(xml).toContain('<caaml:custom>');
      expect(xml).toContain('<caaml:airTemp>-5°C</caaml:airTemp>');
      expect(xml).toContain('<caaml:snowTemp>-2°C</caaml:snowTemp>');
      expect(xml).toContain('<caaml:skyCondition>despejado</caaml:skyCondition>');
      expect(xml).toContain('<caaml:wind>moderado</caaml:wind>');
      expect(xml).toContain('<caaml:notes>Buenas condiciones para ascenso</caaml:notes>');
    });
  });

  describe('toCaamlXml() — validación XML bien formado', () => {
    it('genera XML que se puede parsear sin errores (basic check)', () => {
      const reporte = {
        id: 'glaciar-parse-test',
        guia: 'Parse Test',
        fechaISO: '2026-06-14T12:00:00Z',
        lat: 4.8,
        lng: -75.3,
        altitud: 4800,
        puntoId: 'PARSE-01',
        capas: [
          { profundidad: '0–10 cm', tipoSuperficie: 'nieve_fresca', dureza: 'F' },
          { profundidad: '10–30 cm', tipoSuperficie: 'firn_neve', dureza: 'P' },
        ],
      };
      
      const xml = toCaamlXml(reporte);
      
      // Verificar estructura básica de XML bien formado
      expect(xml).toMatch(/^<\?xml/);
      expect(xml).toContain('<caaml:SnowProfile');
      expect(xml.match(/<caaml:layer>/g)).toHaveLength(2);
      expect(xml.match(/<\/caaml:layer>/g)).toHaveLength(2);
      
      // Verificar balance de etiquetas principales
      const openTags = (xml.match(/<caaml:\w+/g) || []).length;
      const closeTags = (xml.match(/<\/caaml:\w+/g) || []).length;
      expect(openTags).toBeGreaterThan(0);
      expect(closeTags).toBeGreaterThan(0);
    });
  });

  describe('downloadCaaml() — trigger de descarga', () => {
    it('crea Blob y dispara descarga con filename default', () => {
      const xml = '<?xml version="1.0"?><test></test>';
      
      downloadCaaml(xml);
      
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'application/xml;charset=utf-8;',
        })
      );
      
      const link = global.document.createElement();
      expect(link.href).toBe('blob:mock-url');
      expect(link.download).toMatch(/^chagra_glaciar_\d{4}-\d{2}-\d{2}\.xml$/);
      expect(link.click).toHaveBeenCalled();
    });

    it('usa filename custom si se proporciona', () => {
      const xml = '<?xml version="1.0"?><test></test>';
      const customFilename = 'perfil_glaciar_cocuy.xml';
      
      downloadCaaml(xml, customFilename);
      
      const link = global.document.createElement();
      expect(link.download).toBe(customFilename);
    });

    it('limpia URL y remueve link después del click', async () => {
      const xml = '<?xml version="1.0"?><test></test>';

      downloadCaaml(xml);

      // Esperar un poco para que el setTimeout se ejecute
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(global.document.body.appendChild).toHaveBeenCalled();
      expect(global.document.body.removeChild).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });
  });
});