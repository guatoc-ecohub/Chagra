import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FincaEvolutionCard from '../FincaEvolutionCard';

describe('FincaEvolutionCard', () => {
  beforeEach(() => {
    // Limpiar cualquier estado previo
    vi.clearAllMocks();
  });

  it('muestra el título "Cómo evoluciona tu finca"', () => {
    render(<FincaEvolutionCard processes={[]} />);
    expect(screen.getByText('Cómo evoluciona tu finca')).toBeTruthy();
  });

  it('maneja todos los scores null sin romper (sin datos aun)', () => {
    render(<FincaEvolutionCard processes={[]} observations={[]} />);
    
    // Debería mostrar las barras con "sin datos aun"
    expect(screen.getAllByText('sin datos aun').length).toBe(5);
    
    // El nivel Gliessman debería ser "0. Convencional (monocultivo)"
    expect(screen.getByText(/0\. Convencional/)).toBeTruthy();
  });

  it('muestra scores cuando hay datos de procesos', () => {
    const processesWithHarvests = [
      {
        process_id: 'p1',
        process_type: 'sowing',
        status: 'active',
        current_stage: 'vegetative',
        subject_slug: 'caffea_arabica',
        events: [
          {
            event_type: 'harvest_confirmed',
            payload: { quantity: 100 }
          }
        ]
      },
      {
        process_id: 'p2',
        process_type: 'sowing',
        status: 'active',
        current_stage: 'flowering',
        subject_slug: 'theobroma_cacao',
        events: [
          {
            event_type: 'harvest_confirmed',
            payload: { quantity: 50 }
          }
        ]
      }
    ];

    render(<FincaEvolutionCard processes={processesWithHarvests} />);
    
    // Debería mostrar el título
    expect(screen.getByText('Cómo evoluciona tu finca')).toBeTruthy();
    
    // Debería mostrar algún score numérico (no todos "sin datos aun")
    const sinDatosTexts = screen.getAllByText('sin datos aun');
    expect(sinDatosTexts.length).toBeLessThan(5);
  });

  it('muestra el nivel Gliessman correcto', () => {
    render(<FincaEvolutionCard processes={[]} />);
    
    // Nivel Gliessman 0 es el default sin datos
    expect(screen.getByText(/0\. Convencional \(monocultivo\)/)).toBeTruthy();
  });

  it('renderiza todas las barras MESMIS', () => {
    render(<FincaEvolutionCard processes={[]} />);
    
    // Verificar que las etiquetas MESMIS estén presentes
    expect(screen.getByText('Productividad')).toBeTruthy();
    expect(screen.getByText('Estabilidad y resiliencia')).toBeTruthy();
    expect(screen.getByText('Adaptabilidad')).toBeTruthy();
    expect(screen.getByText('Equidad')).toBeTruthy();
    expect(screen.getByText('Autodependencia')).toBeTruthy();
  });

  it('muestra el texto informativo sobre los indicadores', () => {
    render(<FincaEvolutionCard processes={[]} />);
    
    expect(screen.getByText(/Estos indicadores miden qué tan sano está tu sistema productivo/)).toBeTruthy();
  });

  it('no rompe con observations vacío', () => {
    render(<FincaEvolutionCard processes={[]} observations={[]} />);
    
    expect(screen.getByText('Cómo evoluciona tu finca')).toBeTruthy();
    expect(screen.getByText(/0\. Convencional/)).toBeTruthy();
  });

  it('maneja onNavigate opcional sin errores', () => {
    const onNavigate = vi.fn();
    render(<FincaEvolutionCard processes={[]} onNavigate={onNavigate} />);
    
    // El botón de "¿Qué es esto?" debería llamar onNavigate
    const queEsButton = screen.getByLabelText('Ver más sobre evolución de finca');
    queEsButton.click();
    
    expect(onNavigate).toHaveBeenCalledWith('evolucion');
  });
});