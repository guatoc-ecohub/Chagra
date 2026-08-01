import { describe, it, expect } from 'vitest';
import {
  generateRestauracionPlanPDF,
  buildRestauracionPlanFilename,
  downloadRestauracionPlanPDF,
  RESTAURACION_PDF_VERSION,
} from '../restauracionPlanPDF';

// Diagnóstico realista (forma de diagnosticarRestauracion) para el caso Ana:
// talud andino con retamo, piso frío 2000–3000.
const mockDiagnostico = {
  arreglo: {
    id: 'corredor_ripario',
    nombre: 'Corredor biologico/ripario',
    densidad: 'franjas 10-30m de ancho',
    detalle: 'Mezcla pionera-intermedia-climax. Protege quebradas y nacimientos.',
  },
  roles: null,
  especies: {
    pioneras: [
      { nombre: 'Aliso', cientifico: 'Alnus acuminata', nota: 'Aguanta altura, fijador N' },
      { nombre: 'Mortino', cientifico: 'Hesperomeles goudotiana', nota: 'Fruto silvestre' },
    ],
    intermedias: [
      { nombre: 'Encenillo', cientifico: 'Weinmannia tomentosa', nota: 'Bosque altoandino' },
      { nombre: 'Polylepis', cientifico: 'Polylepis quadrijuga', nota: 'Amenazado' },
    ],
    climax: [
      { nombre: 'Palma de cera', cientifico: 'Ceroxylon quindiuense', nota: 'Árbol nacional' },
    ],
  },
  alertas: ['GUARDA: Retamo NO se quema — el fuego estimula la germinación y rebrota.'],
  guardas: [
    'GUARDA: Pino y eucalipto NO son restauración.',
    'MITO: sembrar muchos árboles rápido = restaurar. La clave es el ORDEN sucesional.',
  ],
  sin_datos: false,
  fuente: 'DR-RESTAURACION-1 (2/3 Gemini+Meta, 2026-06-11)',
};

const mockFinca = {
  slug: 'talud-galeras',
  nombre: 'Talud ladera Galeras',
  municipio: 'Pasto',
  departamento: 'Nariño',
  altitud: 2400,
  coords: [1.2136, -77.2811],
};

describe('restauracionPlanPDF', () => {
  it('expone versión de schema', () => {
    expect(RESTAURACION_PDF_VERSION).toBe('1');
  });

  it('genera un Blob application/pdf no vacío', () => {
    const blob = generateRestauracionPlanPDF({
      diagnostico: mockDiagnostico,
      finca: mockFinca,
      operatorName: 'Ana (UNGRD)',
      operatorRole: 'Gestión del riesgo',
      objetivo: 'cortafuegos',
      descripcion: 'Talud degradado a 2400 msnm con retamo espinoso',
      piso: 'frio_2000_3000',
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(1500); // PDF real, no vacío
  });

  it('arranca con el header PDF (magic %PDF)', async () => {
    const blob = generateRestauracionPlanPDF({ diagnostico: mockDiagnostico, finca: mockFinca });
    const head = new Uint8Array(await blob.arrayBuffer()).slice(0, 5);
    const magic = String.fromCharCode(...head);
    expect(magic).toBe('%PDF-');
  });

  it('no explota con diagnóstico mínimo (sin especies, sin arreglo)', () => {
    const blob = generateRestauracionPlanPDF({
      diagnostico: { sin_datos: true, especies: null, roles: null, alertas: [], guardas: [], fuente: 'X' },
      finca: { nombre: 'Predio X' },
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(1000);
  });

  it('no explota sin planData (defaults vacíos)', () => {
    const blob = generateRestauracionPlanPDF(/** @type {any} */ (undefined));
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(800);
  });

  it('soporta fallback de roles (solo nombres comunes, sin binomios)', () => {
    const blob = generateRestauracionPlanPDF({
      diagnostico: {
        arreglo: null,
        especies: null,
        roles: { pioneras: ['aliso', 'mortino'], intermedias: ['encenillo'], climax: ['palma de cera'] },
        alertas: [],
        guardas: [],
        sin_datos: false,
        fuente: 'DR-RESTAURACION-1',
      },
      finca: { nombre: 'Predio roles', altitud: 2500 },
      piso: 'frio_2000_3000',
    });
    expect(blob.size).toBeGreaterThan(1500);
  });

  it('incluye el bloque de riesgo de incendio cuando se pasa', () => {
    const conRiesgo = generateRestauracionPlanPDF({
      diagnostico: mockDiagnostico,
      finca: mockFinca,
      riesgoIncendio: {
        nivel: 'alto',
        es_estimacion: true,
        factores: ['Estás en temporada seca andina.', 'El Niño activo seca el combustible.'],
        recomendaciones: ['NO hagas quemas agrícolas.', 'Limpia las rondas cortafuego.'],
        disclaimer: 'Esto es una ESTIMACIÓN, NO una alerta oficial.',
        fuentes: ['NOAA CPC (ONI) + IDEAM'],
      },
    });
    const sinRiesgo = generateRestauracionPlanPDF({ diagnostico: mockDiagnostico, finca: mockFinca });
    // El bloque de riesgo añade una página → PDF más grande.
    expect(conRiesgo.size).toBeGreaterThan(sinRiesgo.size);
  });

  describe('buildRestauracionPlanFilename', () => {
    it('arma slug seguro con timestamp', () => {
      const name = buildRestauracionPlanFilename(mockFinca, new Date('2026-06-15T10:30:00'));
      expect(name).toBe('plan-restauracion-chagra-talud-galeras-2026-06-15-1030.pdf');
    });

    it('cae a "predio" sin finca', () => {
      const name = buildRestauracionPlanFilename(null, new Date('2026-06-15T08:05:00'));
      expect(name).toBe('plan-restauracion-chagra-predio-2026-06-15-0805.pdf');
    });

    it('normaliza tildes y caracteres raros del nombre', () => {
      const name = buildRestauracionPlanFilename({ nombre: 'Quebrada Niñá #2' }, new Date('2026-06-15T00:00:00'));
      // ñ→n, á→a, '#' y espacios → guiones colapsados.
      expect(name).toBe('plan-restauracion-chagra-quebrada-nina-2-2026-06-15-0000.pdf');
    });
  });

  describe('downloadRestauracionPlanPDF', () => {
    it('devuelve filename + sizeBytes (jsdom tiene document → simula descarga)', async () => {
      const res = await downloadRestauracionPlanPDF({ diagnostico: mockDiagnostico, finca: mockFinca });
      expect(res.filename).toMatch(/^plan-restauracion-chagra-talud-galeras-/);
      expect(res.sizeBytes).toBeGreaterThan(1500);
    });
  });
});
