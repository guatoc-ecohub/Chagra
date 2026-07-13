import React from 'react';
// @ts-nocheck
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Audit 070.5 + 070.6 — tests del selector plant opcional y el bridge
// case_study en severidad high/critical.

// Mock del store de assets — los lands/plants vienen del Zustand store.
// Inyectamos shape mínimo: 2 lands, 2 plants (una bajo el land seleccionado).
const mockState = {
  lands: [
    { id: 'land-1', attributes: { name: 'Invernadero David' } },
    { id: 'land-2', attributes: { name: 'Era 4' } },
  ],
  plants: [
    {
      id: 'plant-1',
      attributes: { name: 'Tomate Cherry #1', species_slug: 'solanum_lycopersicum_cerasiforme' },
      relationships: { parent: { data: [{ type: 'asset--land', id: 'land-1' }] } },
    },
    {
      id: 'plant-2',
      attributes: { name: 'Lechuga Era 4', species_slug: 'lactuca_sativa' },
      relationships: { location: { data: [{ type: 'asset--land', id: 'land-2' }] } },
    },
  ],
};

vi.mock('../../store/useAssetStore', () => ({
  default: (selector) => selector(mockState),
}));

// Mock syncManager.saveTransaction → resolve sin tocar IDB real.
const saveTransactionMock = vi.fn().mockResolvedValue({ id: 'tx-stub' });
vi.mock('../../services/syncManager', () => ({
  syncManager: {
    saveTransaction: (...args) => saveTransactionMock(...args),
  },
}));

// Mock crypto.randomUUID si jsdom no lo trae estable. Solo override mínimo.
if (typeof globalThis.crypto?.randomUUID !== 'function') {
  globalThis.crypto = /** @type {any} */ ({
    ...(globalThis.crypto || {}),
    randomUUID: () => 'uuid-test-stub',
  });
}

// L1.5 — mock ragRetriever.retrieve para no tocar el corpus real durante los
// tests unitarios. Default empty; se sobrescribe per-test cuando hace falta.
const ragRetrieveMock = vi.fn().mockResolvedValue([]);
vi.mock('../../services/ragRetriever', () => ({
  retrieve: (...args) => ragRetrieveMock(...args),
}));

import ObservationScreen from '../ObservationScreen';
import { getParentLandIdFromAsset } from '../../utils/assetRelationships';
import { useCaseStudyStore } from '../../store/useCaseStudyStore';

const resetCaseStore = () => {
  useCaseStudyStore.setState({ cases: [] });
  if (typeof localStorage !== 'undefined') localStorage.removeItem('chagra:case-study');
};

describe('getParentLandIdFromAsset (helper exportado)', () => {
  it('resuelve parent.data como array', () => {
    expect(
      getParentLandIdFromAsset({
        relationships: { parent: { data: [{ type: 'asset--land', id: 'land-1' }] } },
      })
    ).toBe('land-1');
  });

  it('cae a location.data cuando no hay parent', () => {
    expect(
      getParentLandIdFromAsset({
        relationships: { location: { data: { type: 'asset--land', id: 'land-9' } } },
      })
    ).toBe('land-9');
  });

  it('retorna null si no hay relaciones', () => {
    expect(getParentLandIdFromAsset({})).toBeNull();
    expect(getParentLandIdFromAsset(null)).toBeNull();
  });
});

describe('ObservationScreen — audit 070.5 selector plant', () => {
  beforeEach(() => {
    saveTransactionMock.mockClear();
    resetCaseStore();
  });

  it('selector plant NO aparece si no hay land seleccionado (estado inicial)', () => {
    render(<ObservationScreen onBack={vi.fn()} onSave={vi.fn()} />);
    // Estado inicial: locationId === '' → plantsForSelectedLand === [] → selector oculto.
    expect(screen.queryByTestId('plant-selector')).toBeNull();
  });

  it('selector plant aparece si el land seleccionado tiene plants asociadas', () => {
    render(<ObservationScreen onBack={vi.fn()} onSave={vi.fn()} />);
    fireEvent.change(screen.getByDisplayValue(/Selecciona una zona/i), {
      target: { value: 'land-1' },
    });
    expect(screen.getByTestId('plant-selector')).toBeTruthy();
    expect(screen.getByText(/Tomate Cherry #1/)).toBeTruthy();
    // Lechuga (otro land) no debe aparecer en este dropdown.
    expect(screen.queryByText(/Lechuga Era 4/)).toBeNull();
  });

  it('cambiar de land resetea el plantId seleccionado', () => {
    render(<ObservationScreen onBack={vi.fn()} onSave={vi.fn()} />);
    fireEvent.change(screen.getByDisplayValue(/Selecciona una zona/i), {
      target: { value: 'land-1' },
    });
    const plantSel = /** @type {HTMLSelectElement} */ (screen.getByTestId('plant-selector'));
    fireEvent.change(plantSel, { target: { value: 'plant-1' } });
    expect(plantSel.value).toBe('plant-1');

    // Cambio a land-2 → selector apunta a plant-2 dropdown, plantId resetea.
    fireEvent.change(screen.getAllByRole('combobox').find((s) => s.getAttribute('name') === 'locationId'), {
      target: { value: 'land-2' },
    });
    const plantSel2 = /** @type {HTMLSelectElement} */ (screen.getByTestId('plant-selector'));
    expect(plantSel2.value).toBe('');
  });
});

describe('ObservationScreen — audit 070.6 bridge case_study', () => {
  beforeEach(() => {
    saveTransactionMock.mockClear();
    resetCaseStore();
  });

  it('severity low NO dispara CaseLinkModal post-save', async () => {
    const onBack = vi.fn();
    const onSave = vi.fn();
    render(<ObservationScreen onBack={onBack} onSave={onSave} />);

    fireEvent.change(screen.getByPlaceholderText(/Describe la observacion/i), {
      target: { value: 'Hojas amarillas leves en una rama' },
    });
    fireEvent.change(screen.getByDisplayValue(/Selecciona una zona/i), {
      target: { value: 'land-1' },
    });
    // Severity por defecto es 'info' — explícitamente verificamos low también.
    const severitySelect = screen.getAllByRole('combobox').find((s) => s.getAttribute('name') === 'severity');
    fireEvent.change(severitySelect, { target: { value: 'low' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Guardar Observacion/i }));
    });

    await waitFor(() => expect(saveTransactionMock).toHaveBeenCalled());
    // Modal NO debe aparecer
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('severity high SÍ dispara CaseLinkModal con logId del payload', async () => {
    const onBack = vi.fn();
    const onSave = vi.fn();
    render(<ObservationScreen onBack={onBack} onSave={onSave} />);

    fireEvent.change(screen.getByPlaceholderText(/Describe la observacion/i), {
      target: { value: 'Daño masivo en plántulas overnight' },
    });
    fireEvent.change(screen.getByDisplayValue(/Selecciona una zona/i), {
      target: { value: 'land-1' },
    });
    const severitySelect = screen.getAllByRole('combobox').find((s) => s.getAttribute('name') === 'severity');
    fireEvent.change(severitySelect, { target: { value: 'high' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Guardar Observacion/i }));
    });

    await waitFor(() =>
      expect(screen.getByRole('dialog')).toBeTruthy()
    );
    // Header del modal muestra severidad alta
    expect(screen.getByText(/Severidad alta/i)).toBeTruthy();
  });

  it('severity critical + plant seleccionada pasa speciesSlug al modal para pre-fill', async () => {
    render(<ObservationScreen onBack={vi.fn()} onSave={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/Describe la observacion/i), {
      target: { value: 'Trozador cortó 50 plántulas en una noche' },
    });
    fireEvent.change(screen.getByDisplayValue(/Selecciona una zona/i), {
      target: { value: 'land-1' },
    });
    const plantSel = screen.getByTestId('plant-selector');
    fireEvent.change(plantSel, { target: { value: 'plant-1' } });

    const severitySelect = screen.getAllByRole('combobox').find((s) => s.getAttribute('name') === 'severity');
    fireEvent.change(severitySelect, { target: { value: 'critical' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Guardar Observacion/i }));
    });

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());

    // Crear nuevo caso → debe pre-fillear species_slug=solanum_lycopersicum_cerasiforme
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Crear nuevo caso de estudio/i }));
    });

    const cases = useCaseStudyStore.getState().cases;
    expect(cases).toHaveLength(1);
    expect(cases[0].subject.species_ids).toEqual(['solanum_lycopersicum_cerasiforme']);
    expect(cases[0].problem.severity).toBe('critical');
    expect(cases[0].timeline[0].event_type).toBe('observation');
  });

  it('payload incluye relationships.asset cuando plant está seleccionada', async () => {
    render(<ObservationScreen onBack={vi.fn()} onSave={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/Describe la observacion/i), {
      target: { value: 'Hojas con manchas en planta puntual' },
    });
    fireEvent.change(screen.getByDisplayValue(/Selecciona una zona/i), {
      target: { value: 'land-1' },
    });
    fireEvent.change(screen.getByTestId('plant-selector'), {
      target: { value: 'plant-1' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Guardar Observacion/i }));
    });

    await waitFor(() => expect(saveTransactionMock).toHaveBeenCalled());
    const callArg = saveTransactionMock.mock.calls[0][0];
    const rels = callArg.payload.data.relationships;
    expect(rels.location.data[0]).toEqual({ type: 'asset--land', id: 'land-1' });
    expect(rels.asset.data[0]).toEqual({ type: 'asset--plant', id: 'plant-1' });
  });

  it('payload NO incluye relationships.asset cuando no hay plant seleccionada (compat legacy)', async () => {
    render(<ObservationScreen onBack={vi.fn()} onSave={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/Describe la observacion/i), {
      target: { value: 'Observación general del lote' },
    });
    fireEvent.change(screen.getByDisplayValue(/Selecciona una zona/i), {
      target: { value: 'land-2' },
    });
    // No seleccionamos plant (queda en '')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Guardar Observacion/i }));
    });

    await waitFor(() => expect(saveTransactionMock).toHaveBeenCalled());
    const callArg = saveTransactionMock.mock.calls[0][0];
    const rels = callArg.payload.data.relationships;
    expect(rels.location.data[0]).toEqual({ type: 'asset--land', id: 'land-2' });
    expect(rels.asset).toBeUndefined();
  });
});

// L1.5 — sugerencias RAG de tratamientos. Verifica:
//   1. Debounce ≥3s antes de invocar retrieve().
//   2. Severity info/low NO disparan retrieve.
//   3. Render condicional: solo si hay resultados con score>0.
//   4. Falla graceful: retrieve throws → sección no se renderiza.
describe('ObservationScreen — L1.5 sugerencias RAG de tratamientos', () => {
  beforeEach(() => {
    saveTransactionMock.mockClear();
    ragRetrieveMock.mockClear();
    ragRetrieveMock.mockResolvedValue([]);
    resetCaseStore();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    // Limpiar fake timers para no contaminar otros describes que asumen
    // timers reales (caso bridge usa setTimeout legítimo).
    vi.useRealTimers();
  });

  // Usamos act+advanceTimersByTimeAsync para el debounce de 3s.

  const seedDescriptionAndSeverity = (description, severity) => {
    fireEvent.change(screen.getByPlaceholderText(/Describe la observacion/i), {
      target: { value: description },
    });
    const severitySelect = screen.getAllByRole('combobox').find((s) => s.getAttribute('name') === 'severity');
    fireEvent.change(severitySelect, { target: { value: severity } });
  };

  it('NO llama retrieve antes de los 3s de debounce', async () => {
    render(<ObservationScreen onBack={vi.fn()} onSave={vi.fn()} />);
    seedDescriptionAndSeverity('Hojas con manchas oscuras tipo antracnosis', 'medium');

    // Antes del debounce: NO se invocó retrieve aún.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(ragRetrieveMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId('rag-treatment-suggestions')).toBeNull();
  });

  it('llama retrieve después de 3s con severity=medium y descripción válida', async () => {
    ragRetrieveMock.mockResolvedValue([
      { species: 'phaseolus_vulgaris', key: 'pest', text: 'Antracnosis foliar — aplicar caldo bordelés cada 7 días en follaje seco.', score: 4.2 },
      { species: 'lycopersicon_esculentum', key: 'biocontrol', text: 'Bacillus subtilis foliar previene establecimiento de Colletotrichum y otros hongos.', score: 3.1 },
    ]);

    render(<ObservationScreen onBack={vi.fn()} onSave={vi.fn()} />);
    seedDescriptionAndSeverity('Hojas con manchas oscuras tipo antracnosis', 'medium');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100);
    });

    await waitFor(() => expect(ragRetrieveMock).toHaveBeenCalledTimes(1));
    expect(ragRetrieveMock.mock.calls[0][0]).toMatch(/antracnosis/i);
    expect(ragRetrieveMock.mock.calls[0][1]).toBe(5);

    await waitFor(() =>
      expect(screen.getByTestId('rag-treatment-suggestions')).toBeTruthy()
    );
    const items = screen.getAllByTestId('rag-suggestion-item');
    expect(items.length).toBe(2);
    expect(screen.getByText(/caldo bordelés/i)).toBeTruthy();
  });

  it('severity=info NO dispara retrieve aunque pasen 3s', async () => {
    render(<ObservationScreen onBack={vi.fn()} onSave={vi.fn()} />);
    seedDescriptionAndSeverity('Observación rutinaria sin anomalías', 'info');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });
    expect(ragRetrieveMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId('rag-treatment-suggestions')).toBeNull();
  });

  it('descripción demasiado corta NO dispara retrieve aunque severity sea high', async () => {
    render(<ObservationScreen onBack={vi.fn()} onSave={vi.fn()} />);
    seedDescriptionAndSeverity('ok', 'high');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });
    expect(ragRetrieveMock).not.toHaveBeenCalled();
  });

  it('retrieve devuelve [] → sección NO se renderiza (graceful empty)', async () => {
    ragRetrieveMock.mockResolvedValue([]);
    render(<ObservationScreen onBack={vi.fn()} onSave={vi.fn()} />);
    seedDescriptionAndSeverity('Marchitez súbita en plántulas jóvenes', 'high');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100);
    });

    await waitFor(() => expect(ragRetrieveMock).toHaveBeenCalled());
    expect(screen.queryByTestId('rag-treatment-suggestions')).toBeNull();
  });

  it('retrieve lanza error → sección NO se renderiza (graceful failure)', async () => {
    ragRetrieveMock.mockRejectedValue(new Error('corpus offline'));
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<ObservationScreen onBack={vi.fn()} onSave={vi.fn()} />);
    seedDescriptionAndSeverity('Defoliación severa en cultivo de tomate', 'critical');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100);
    });

    await waitFor(() => expect(ragRetrieveMock).toHaveBeenCalled());
    expect(screen.queryByTestId('rag-treatment-suggestions')).toBeNull();
    spy.mockRestore();
  });

  it('cambios rápidos en descripción cancelan retrieve previo (debounce reset)', async () => {
    ragRetrieveMock.mockResolvedValue([
      { species: 'capsicum_annuum', key: 'pest', text: 'Pulgones en brotes tiernos — control con extracto de neem y jabón potásico.', score: 5.1 },
    ]);
    render(<ObservationScreen onBack={vi.fn()} onSave={vi.fn()} />);
    seedDescriptionAndSeverity('Manchas en hojas', 'medium');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    // Reescribimos antes de cumplirse el debounce; debe reiniciar el timer.
    fireEvent.change(screen.getByPlaceholderText(/Describe la observacion/i), {
      target: { value: 'Pulgones cubriendo brotes nuevos' },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    // Aún no debió pasar el debounce completo desde el cambio.
    expect(ragRetrieveMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    await waitFor(() => expect(ragRetrieveMock).toHaveBeenCalledTimes(1));
    expect(ragRetrieveMock.mock.calls[0][0]).toMatch(/pulgones/i);
  });

  it('passage muy largo se trunca con elipsis en el render', async () => {
    const longText = 'Lorem ipsum dolor sit amet '.repeat(40); // > 220 chars
    ragRetrieveMock.mockResolvedValue([
      { species: 'zea_mays', key: 'long_passage', text: longText, score: 2.5 },
    ]);
    render(<ObservationScreen onBack={vi.fn()} onSave={vi.fn()} />);
    seedDescriptionAndSeverity('Plagas múltiples en maíz', 'high');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100);
    });
    await waitFor(() => expect(screen.getByTestId('rag-treatment-suggestions')).toBeTruthy());
    const items = screen.getAllByTestId('rag-suggestion-item');
    expect(items[0].textContent).toMatch(/…$/);
  });
});
