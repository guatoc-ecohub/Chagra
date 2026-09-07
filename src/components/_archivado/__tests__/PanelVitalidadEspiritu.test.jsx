/**
 * PanelVitalidadEspiritu — el panel del mockup avatar-biopunk pinta el modelo
 * groundeado: medidor circular, badge de especies vivas, 4 barras con ícono y
 * 3 contadores. Los slots sin dato real muestran "—" (dato en camino).
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PanelVitalidadEspiritu from '../PanelVitalidadEspiritu';
import { buildVitalidadEspiritu } from '../../../services/vitalidadEspirituService';
import { buildFincaScene } from '../../../services/fincaSceneService';

const NOW = new Date('2026-07-09T10:00:00-05:00');

const procesos = () => [
  {
    process_id: 'p-cafe',
    attributes: {
      process_type: 'sowing', status: 'active', current_stage: 'flowering',
      subject_slug: 'coffea_arabica', subject_label: 'Café',
      created_at: new Date('2025-11-10').getTime(),
    },
  },
  {
    process_id: 'p-maiz',
    attributes: {
      process_type: 'sowing', status: 'active', current_stage: 'harvest',
      subject_slug: 'zea_mays', subject_label: 'Maíz',
      created_at: new Date('2026-07-02').getTime(),
    },
  },
];

const modeloSembrado = () => buildVitalidadEspiritu({
  scene: buildFincaScene({ processes: procesos(), plantAssetsCount: 0 }),
  processes: procesos(),
  plants: [],
  climaSnapshot: {
    openmeteo: { available: true, forecast_7d: [{ date: '2026-07-09', precip_mm: 5 }] },
  },
  condicion: 'nublado',
  harvestSummary: {
    totalHarvests: 5,
    dateRange: { firstMs: new Date('2025-10-05').getTime(), lastMs: NOW.getTime() },
    trend: { series: [{ period: '2026-07', harvestCount: 3 }] },
  },
  now: NOW,
});

describe('PanelVitalidadEspiritu', () => {
  it('sin modelo no renderiza nada', () => {
    const { container } = render(<PanelVitalidadEspiritu modelo={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('finca sembrada: medidor, badge, 4 barras y 3 contadores con datos reales', () => {
    const modelo = modeloSembrado();
    render(<PanelVitalidadEspiritu modelo={modelo} />);

    const panel = screen.getByTestId('panel-vitalidad-espiritu');
    expect(panel).toBeInTheDocument();
    expect(panel.textContent).toContain('VITALIDAD DEL ESPÍRITU');

    // Medidor circular con el número REAL de vitalidad (buildFincaScene).
    const vital = screen.getByTestId('pve-vitalidad');
    expect(vital.getAttribute('data-estado')).toBe('ok');
    expect(vital.textContent).toContain(String(modelo.vitalidad.valor));

    // Badge de especies vivas (café + maíz = 2).
    const vivas = screen.getByTestId('pve-especies-vivas');
    expect(vivas.textContent).toContain('2');
    expect(vivas.textContent).toContain('ESPECIES VIVAS');

    // 4 barras con su ícono, en el orden del mockup.
    const ejes = panel.querySelectorAll('.pve-eje');
    expect(ejes).toHaveLength(4);
    expect([...ejes].map((e) => e.getAttribute('data-eje')))
      .toEqual(['clima', 'suelo', 'biodiversidad', 'energia']);
    expect(panel.textContent).toContain('💧');
    expect(panel.textContent).toContain('🪱');
    expect(panel.textContent).toContain('🦋');
    expect(panel.textContent).toContain('🔥');

    // 3 contadores con el dato real.
    expect(screen.getByTestId('pve-conteo-especies').textContent).toContain('2');
    expect(screen.getByTestId('pve-conteo-cosechas').textContent).toContain('5');
    expect(screen.getByTestId('pve-conteo-anillos').textContent)
      .toContain('anillos del frailejón');
    expect(screen.getByTestId('pve-conteo-anillos').getAttribute('data-estado')).toBe('ok');

    // El suelo no tiene diagnóstico persistido → slot pendiente ("—") + nota.
    const suelo = panel.querySelector('[data-eje="suelo"]');
    expect(suelo.getAttribute('data-estado')).toBe('pendiente');
    expect(suelo.textContent).toContain('—');
    expect(screen.getByTestId('pve-nota-pendiente').textContent).toContain('dato en camino');

    // Trazabilidad: la fuente viaja en el title de cada slot.
    expect(vital.getAttribute('title')).toBeTruthy();
    expect(suelo.getAttribute('title')).toContain('DR-SUELOS-1');
  });

  it('finca vacía: todos los slots en "—" y nota de dato en camino (cero inventos)', () => {
    const modelo = buildVitalidadEspiritu({
      scene: buildFincaScene({ processes: [], plantAssetsCount: 0 }),
      now: NOW,
    });
    render(<PanelVitalidadEspiritu modelo={modelo} />);
    const panel = screen.getByTestId('panel-vitalidad-espiritu');

    expect(screen.getByTestId('pve-vitalidad').getAttribute('data-estado')).toBe('pendiente');
    for (const eje of panel.querySelectorAll('.pve-eje')) {
      expect(eje.getAttribute('data-estado')).toBe('pendiente');
      expect(eje.querySelector('.pve-eje-fill')).toBeNull(); // riel vacío, sin barra fabricada
    }
    expect(screen.getByTestId('pve-conteo-cosechas').textContent).toContain('—');
    expect(screen.getByTestId('pve-nota-pendiente')).toBeInTheDocument();
    // Ningún dígito inventado en los contadores.
    expect(screen.getByTestId('pve-conteo-especies').querySelector('b').textContent).toBe('—');
  });
});
