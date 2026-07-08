/**
 * AlmanaqueScreen — "Almanaque de la finca" (photo-forward): vista hermana del
 * Calendario de la finca.
 *
 * Contrato cubierto:
 *   - Las 3 secciones son navegables (El año / Pisos térmicos / La luna).
 *   - El año: temporadas de aguas y secas del régimen bimodal.
 *   - Pisos térmicos: los 4 pisos; el café en templado muestra ventana de
 *     cosecha grounded; el páramo NO lista cultivos (nota honesta).
 *   - La luna: encuadre "cultura, no receta" + las 4 fases + el puente
 *     etnolingüístico ("luna tierna").
 *   - Puentes: onBack, enlace al Calendario de la finca y al agente.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import AlmanaqueScreen from './AlmanaqueScreen';

afterEach(() => cleanup());

const irASeccion = (id) => fireEvent.click(screen.getByTestId(`alm-tab-${id}`));

describe('AlmanaqueScreen — navegación y portada', () => {
  it('monta, arranca en "El año" y muestra las 3 secciones', () => {
    render(<AlmanaqueScreen onBack={() => {}} onNavigate={() => {}} />);
    expect(screen.getByTestId('almanaque-screen')).toBeTruthy();
    expect(screen.getByTestId('alm-seccion-anio')).toBeTruthy();
    for (const id of ['anio', 'pisos', 'luna']) {
      expect(screen.getByTestId(`alm-tab-${id}`)).toBeTruthy();
    }
  });

  it('el botón volver llama onBack', () => {
    const onBack = vi.fn();
    render(<AlmanaqueScreen onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onBack).toHaveBeenCalled();
  });
});

describe('AlmanaqueScreen — el año campesino (aguas y secas)', () => {
  it('muestra temporadas de lluvia y de seca', () => {
    render(<AlmanaqueScreen onBack={() => {}} />);
    expect(screen.getByTestId('temporada-aguas1')).toBeTruthy();
    expect(screen.getByTestId('temporada-secas1')).toBeTruthy();
  });
});

describe('AlmanaqueScreen — pisos térmicos (grounded)', () => {
  it('el café en templado muestra ventana de cosecha grounded (no inventada)', () => {
    render(<AlmanaqueScreen onBack={() => {}} />);
    irASeccion('pisos');
    fireEvent.click(screen.getByTestId('piso-tab-templado'));
    // El café tiene meses firmes en perennialCycles → aparece su fila.
    expect(screen.getByTestId('cultivo-coffea_arabica')).toBeTruthy();
  });

  it('el páramo NO lista cultivos: muestra la nota honesta de conservación', () => {
    render(<AlmanaqueScreen onBack={() => {}} />);
    irASeccion('pisos');
    fireEvent.click(screen.getByTestId('piso-tab-paramo'));
    expect(screen.getByTestId('alm-piso-nota')).toBeTruthy();
    expect(screen.queryByTestId('alm-piso-cultivos')).toBeNull();
  });
});

describe('AlmanaqueScreen — la luna (saber campesino, cultura no receta)', () => {
  it('enmarca la luna como cultura no receta y expone el puente etnolingüístico', () => {
    render(<AlmanaqueScreen onBack={() => {}} />);
    irASeccion('luna');
    const caveat = screen.getByTestId('alm-luna-caveat');
    expect(caveat.textContent).toMatch(/no promete más cosecha/i);
    expect(caveat.textContent).toMatch(/cultura, no receta/i);
    // Hueco etnolingüístico: "luna tierna" explicado.
    expect(screen.getByTestId('alm-luna-habla').textContent).toMatch(/luna tierna/i);
    // Las 4 fases están presentes.
    for (const f of ['creciente', 'llena', 'menguante', 'nueva']) {
      expect(screen.getByTestId(`luna-fase-${f}`)).toBeTruthy();
    }
  });
});

describe('AlmanaqueScreen — puentes', () => {
  it('enlaza al Calendario de la finca (vista hermana) y al agente', () => {
    const onNavigate = vi.fn();
    render(<AlmanaqueScreen onBack={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('alm-ir-calendario'));
    expect(onNavigate).toHaveBeenCalledWith('calendario_finca');
    fireEvent.click(screen.getByTestId('alm-preguntar-agente'));
    expect(onNavigate).toHaveBeenCalledWith('agente', expect.objectContaining({ prefilledPrompt: expect.any(String) }));
  });
});
