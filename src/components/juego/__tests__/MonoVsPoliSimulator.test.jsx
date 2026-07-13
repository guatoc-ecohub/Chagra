import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MonoVsPoliSimulator from '../MonoVsPoliSimulator';
import asociaciones from '../../../data/asociaciones-comparativa.json';

describe('MonoVsPoliSimulator', () => {
  it('renderiza las asociaciones del archivo de datos con comparacion lado a lado', () => {
    render(<MonoVsPoliSimulator />);

    expect(screen.getByTestId('mono-vs-poli-simulator')).toBeInTheDocument();
    expect(screen.getByText('Compare cifras reales antes de sembrar')).toBeInTheDocument();

    const milpa = screen.getByTestId('asociacion-milpa-maiz-frijol-ahuyama');
    expect(within(milpa).getByText('Milpa maiz-frijol-ahuyama')).toBeInTheDocument();
    expect(within(milpa).getAllByText('Monocultivo').length).toBeGreaterThan(0);
    expect(within(milpa).getAllByText('Policultivo').length).toBeGreaterThan(0);
    expect(within(milpa).getByText('Aprox. 2 LER')).toBeInTheDocument();
    expect(within(milpa).getByText('12 a 60% de N fijado')).toBeInTheDocument();
    expect(within(milpa).getByText('24 a 55% menos arvenses')).toBeInTheDocument();
    expect(within(milpa).getByText('23% menos plaga')).toBeInTheDocument();
    expect(within(milpa).getByText(/La milpa usa mejor la tierra/)).toBeInTheDocument();
    expect(within(milpa).getByText('Confianza alta')).toBeInTheDocument();
    expect(within(milpa).getByText(/DOI 10.1093\/aob\/mcu191/)).toBeInTheDocument();
  });

  it('muestra indicadores alternos cuando no hay LER directo', () => {
    render(<MonoVsPoliSimulator />);

    const cafe = screen.getByTestId('asociacion-cafe-sombrio-guamo');
    expect(within(cafe).getByText('Cafe con sombrio de guamo')).toBeInTheDocument();
    expect(within(cafe).getByText('Sin dato LER comparable')).toBeInTheDocument();
    expect(within(cafe).getByText('168 kg N/ha')).toBeInTheDocument();
    expect(within(cafe).getByText('118 Mg C/ha en biomasa')).toBeInTheDocument();
    expect(within(cafe).getByText('Confianza media')).toBeInTheDocument();
  });

  it('acepta datos inyectados para probar un caso pequeno y estable', () => {
    const data = [
      {
        id: 'prueba',
        asociacion: 'Prueba maiz leguminosa',
        cultivos: ['maiz', 'frijol'],
        monocultivo: {
          rendimiento_rel: 1,
          insumos: 'Base simple.',
        },
        policultivo: {
          LER: { valor: 1.25 },
          N_fijado_kg_ha: null,
          N_fijado_pct: 40,
          ahorro_insumos: {
            N_sintesis_reduccion_pct_min: 10,
            N_sintesis_reduccion_pct_max: 20,
          },
          control_plaga_pct: {
            infestacion_reduccion_pct_min: 5,
            infestacion_reduccion_pct_max: 15,
          },
        },
        diferencia_resumen: 'Sirve para comparar sin inventar datos.',
        fuente: 'Fuente de prueba',
        confianza: 'alta',
      },
    ];

    render(<MonoVsPoliSimulator data={/** @type {any} */ (data)} />);

    const card = screen.getByTestId('asociacion-prueba');
    expect(within(card).getByText('1,25 LER')).toBeInTheDocument();
    expect(within(card).getByText('40% de N fijado')).toBeInTheDocument();
    expect(within(card).getByText('10 a 20% menos N de sintesis')).toBeInTheDocument();
    expect(within(card).getByText('5 a 15% menos infestacion')).toBeInTheDocument();
  });
});

// ── Validación del shape del dataset por defecto ──────────────────

describe('MonoVsPoliSimulator — dataset de asociaciones-comparativa.json', () => {
  it('cada item tiene los campos obligatorios sin undefined', () => {
    expect(asociaciones.length).toBeGreaterThan(0);
    for (const item of asociaciones) {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('asociacion');
      expect(item).toHaveProperty('cultivos');
      expect(item).toHaveProperty('monocultivo');
      expect(item).toHaveProperty('policultivo');
      expect(item).toHaveProperty('diferencia_resumen');
      expect(item).toHaveProperty('fuente');
      expect(item).toHaveProperty('confianza');

      expect(Array.isArray(item.cultivos)).toBe(true);
      expect(item.cultivos.length).toBeGreaterThan(0);
      expect(['alta', 'media', 'baja']).toContain(item.confianza);
      expect(typeof item.fuente).toBe('string');
      expect(item.fuente.length).toBeGreaterThan(0);
    }
  });

  it('cada item tiene id único', () => {
    const ids = asociaciones.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('los ids de cultivos no tienen undefined', () => {
    for (const item of asociaciones) {
      for (const cultivo of item.cultivos) {
        expect(typeof cultivo).toBe('string');
        expect(cultivo.length).toBeGreaterThan(0);
      }
    }
  });
});
