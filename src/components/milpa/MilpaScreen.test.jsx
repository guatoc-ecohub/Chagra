/**
 * MilpaScreen.test.jsx — módulo "La milpa: maíz, fríjol y calabaza".
 *
 * Cubre:
 *   1. Render base: portada + las 3 secciones navegables (arranca en "juntas").
 *   2. Sección "Las tres juntas": las 3 hermanas y los roles groundeados
 *      (el fríjol fija nitrógeno vía Rhizobium; la cita al grafo).
 *   3. Sección "Sembrarla": variedades campesinas grounded (Capio, Bola Roja) y
 *      la honestidad de las distancias ("orientadoras" + dato en camino).
 *   4. Sección "Cuidarla": control biológico del grafo (Bt, Trichoderma) sin
 *      dosis químicas, y el aporte nutricional ICBF (maíz+fríjol proteína).
 *   5. Puente al agente (onNavigate).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MilpaScreen from './MilpaScreen.jsx';

describe('MilpaScreen — render base', () => {
  it('monta la pantalla con la portada y las 3 secciones', () => {
    render(<MilpaScreen onBack={() => {}} />);
    expect(screen.getByTestId('milpa-screen')).toBeInTheDocument();
    expect(screen.getByTestId('milpa-tab-juntas')).toBeInTheDocument();
    expect(screen.getByTestId('milpa-tab-sembrar')).toBeInTheDocument();
    expect(screen.getByTestId('milpa-tab-cuidar')).toBeInTheDocument();
    // Arranca en "Las tres juntas".
    expect(screen.getByTestId('milpa-juntas')).toBeInTheDocument();
  });
});

describe('MilpaScreen — Las tres juntas (la asociación)', () => {
  it('muestra las 3 hermanas y el diagrama de la asociación', () => {
    render(<MilpaScreen onBack={() => {}} />);
    expect(screen.getByTestId('hermana-maiz')).toHaveTextContent(/Maíz/);
    expect(screen.getByTestId('hermana-frijol')).toHaveTextContent(/Fríjol/);
    expect(screen.getByTestId('hermana-calabaza')).toHaveTextContent(/Calabaza/);
    expect(screen.getByTestId('milpa-diagrama')).toBeInTheDocument();
  });

  it('el rol del fríjol groundea la fijación de nitrógeno en el Rhizobium del grafo', () => {
    render(<MilpaScreen onBack={() => {}} />);
    const rolN = screen.getByTestId('rol-nitrogeno');
    expect(rolN).toHaveTextContent(/nitrógeno/i);
    expect(rolN).toHaveTextContent(/Rhizobium/);
    // La cita al grafo respalda la afirmación (no es invento).
    expect(rolN).toHaveTextContent(/Grafo Chagra/i);
  });

  it('el rol del maíz cita la compatibilidad del grafo (COMPATIBLE_WITH)', () => {
    render(<MilpaScreen onBack={() => {}} />);
    expect(screen.getByTestId('rol-soporte')).toHaveTextContent(/COMPATIBLE_WITH/);
  });
});

describe('MilpaScreen — Sembrarla (variedades + arreglo)', () => {
  it('muestra variedades campesinas colombianas groundeadas', () => {
    render(<MilpaScreen onBack={() => {}} />);
    fireEvent.click(screen.getByTestId('milpa-tab-sembrar'));
    expect(screen.getByTestId('milpa-sembrar')).toBeInTheDocument();
    // Variedades reales del catálogo de Chagra (fichas de ciclo).
    expect(screen.getByTestId('variedad-zea_mays_capio')).toHaveTextContent(/Capio/);
    expect(screen.getByTestId('variedad-phaseolus_vulgaris_bola_roja')).toHaveTextContent(/Bola Roja/);
    expect(screen.getByTestId('variedad-cucurbita_moschata')).toHaveTextContent(/Ahuyama/);
  });

  it('las distancias se presentan como orientadoras, con el dato fino en camino', () => {
    render(<MilpaScreen onBack={() => {}} />);
    fireEvent.click(screen.getByTestId('milpa-tab-sembrar'));
    const dist = screen.getByTestId('milpa-distancias');
    expect(dist).toHaveTextContent(/orientadoras/i);
    // Honestidad grounded: el dato fino por zona aún no está.
    expect(dist).toHaveTextContent(/en camino/i);
  });

  it('el arreglo espacial pone el maíz primero (tutor) y el fríjol después', () => {
    render(<MilpaScreen onBack={() => {}} />);
    fireEvent.click(screen.getByTestId('milpa-tab-sembrar'));
    expect(screen.getByTestId('paso-maiz-primero')).toHaveTextContent(/Primero el maíz/i);
    expect(screen.getByTestId('paso-frijol-despues')).toHaveTextContent(/fríjol/i);
  });
});

describe('MilpaScreen — Cuidarla (control biológico + nutrición)', () => {
  it('controla las plagas con biológicos del grafo, sin dosis químicas', () => {
    render(<MilpaScreen onBack={() => {}} />);
    fireEvent.click(screen.getByTestId('milpa-tab-cuidar'));
    // Cogollero del maíz controlado con Bt / Trichogramma (control biológico).
    const cog = screen.getByTestId('plaga-cogollero');
    expect(cog).toHaveTextContent(/cogollero/i);
    expect(cog).toHaveTextContent(/Bt/);
    // Antracnosis del fríjol con Trichoderma.
    expect(screen.getByTestId('plaga-antracnosis')).toHaveTextContent(/Trichoderma/);
  });

  it('muestra el aporte nutricional ICBF: maíz + fríjol = proteína', () => {
    render(<MilpaScreen onBack={() => {}} />);
    fireEvent.click(screen.getByTestId('milpa-tab-cuidar'));
    const nutri = screen.getByTestId('milpa-nutricion');
    expect(nutri).toHaveTextContent(/proteína completa/i);
    // Cifras ICBF grounded (TCAC 2015).
    expect(screen.getByTestId('nutri-frijol')).toHaveTextContent('20.4');
    expect(screen.getByTestId('nutri-maiz')).toHaveTextContent('363');
    expect(nutri).toHaveTextContent(/ICBF/);
  });
});

describe('MilpaScreen — puente al agente', () => {
  it('navega al agente con la pregunta prellenada', () => {
    const onNavigate = vi.fn();
    render(<MilpaScreen onBack={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('milpa-tab-cuidar'));
    fireEvent.click(screen.getByTestId('milpa-preguntar-agente'));
    expect(onNavigate).toHaveBeenCalledWith('agente', expect.objectContaining({
      prefilledPrompt: expect.stringMatching(/milpa/i),
    }));
  });
});
