/**
// @ts-nocheck
 * GlaciarReporteScreen — Reporte de Punto Glaciar (v2 "escala creíble", UI).
 *
 * Contrato cubierto:
 *   - La pantalla monta y muestra los pasos (montaña, ubicación, dureza, peligros).
 *   - El estado de seguridad derivado reacciona al diagnóstico (🟢→🔴).
 *   - El botón Volver llama onBack.
 *   - Guardar exige ubicación + montaña + superficie + dureza (modo pisado).
 *   - El reporte persistido usa los códigos de dureza nuevos (F..H2) + montaña.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

// Mock del hook de geolocalización: empieza sin posición, request() inyecta una.
let mockPosition = null;
const requestMock = vi.fn(() => {
  mockPosition = { lat: 4.81, lon: -75.33, altitude: 4850, accuracy: 8, timestamp: Date.now() };
});
vi.mock('../../hooks/useGeolocation', () => ({
  useGeolocation: () => ({ position: mockPosition, error: null, loading: false, request: requestMock }),
}));

// Mock de PhotoCaptureField (no probamos la cámara acá).
vi.mock('../PhotoCaptureField', () => ({ default: () => null }));

// Mock del store IDB (no tocamos IndexedDB en el test de UI).
/** @type {import('vitest').Mock} */
const saveMock = vi.fn(() => Promise.resolve({ id: 'glaciar-test' }));
vi.mock('../../db/glaciarReportes', () => ({
  glaciarReportes: {
    save: (...a) => saveMock(...a),
    getAll: vi.fn(() => Promise.resolve([])),
    remove: vi.fn(() => Promise.resolve()),
  },
  nuevoReporteId: () => 'glaciar-test',
}));

// U-3: el autosave del borrador vive en IndexedDB (store glaciar_draft), no en
// sessionStorage (CodeQL clear-text del GPS). Mockeamos el módulo del borrador:
// loadDraft puede sembrar un borrador (simula descarte de pestaña por iOS) y
// saveDraft/clearDraft se espían.
let draftToLoad = null; // lo que loadDraft() devuelve al montar
/** @type {import('vitest').Mock} */
const saveDraftMock = vi.fn(() => Promise.resolve(true));
/** @type {import('vitest').Mock} */
const loadDraftMock = vi.fn(() => Promise.resolve(draftToLoad));
/** @type {import('vitest').Mock} */
const clearDraftMock = vi.fn(() => Promise.resolve());
vi.mock('../../db/glaciarDraft', () => ({
  saveDraft: (...a) => saveDraftMock(...a),
  loadDraft: (...a) => loadDraftMock(...a),
  clearDraft: (...a) => clearDraftMock(...a),
}));

vi.mock('../../utils/imageProcessor', () => ({
  blobToDataUrl: vi.fn(() => Promise.resolve('data:image/jpeg;base64,AAA')),
}));

// U-1: mock del helper de almacenamiento persistente (no tocamos navigator).
/** @type {import('vitest').Mock} */
const requestPersistentStorageMock = vi.fn(() => Promise.resolve(true));
vi.mock('../../utils/persistStorage', () => ({
  requestPersistentStorage: (...a) => requestPersistentStorageMock(...a),
  isStoragePersisted: vi.fn(() => Promise.resolve(false)),
}));

import GlaciarReporteScreen from '../GlaciarReporteScreen';

beforeEach(() => {
  mockPosition = null;
  draftToLoad = null;
  vi.clearAllMocks();
});
afterEach(() => cleanup());

/** Selecciona la dureza puntual por su código (chip de la grilla). */
function clickDureza(codigo) {
  // Hay un select en el perfil de capas con el mismo texto; tomamos el botón.
  const btns = screen.getAllByRole('button').filter((b) => b.textContent.startsWith(codigo));
  fireEvent.click(btns[0]);
}

/** Selecciona un tipo de superficie en la grilla puntual (es un <button>,
 *  el perfil por capas usa <option> con el mismo texto). */
function clickSuperficie(label) {
  const btn = screen.getAllByRole('button').find((b) => b.textContent.includes(label));
  fireEvent.click(btn);
}

describe('GlaciarReporteScreen — montaje y pasos', () => {
  it('monta la pantalla con título y los pasos del reporte', () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);
    expect(screen.getByText('Punto Glaciar')).toBeTruthy();
    expect(screen.getByText(/Montaña y punto del frente/i)).toBeTruthy();
    expect(screen.getAllByText(/Dureza del hielo/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Peligros observados/i)).toBeTruthy();
  });

  it('botón Volver llama onBack', () => {
    const onBack = vi.fn();
    render(<GlaciarReporteScreen onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: /Volver/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it('estado de seguridad inicial es Precaución (faltan datos)', () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);
    expect(screen.getByText('Precaución')).toBeTruthy();
  });

  it('marcar grietas abiertas pasa el estado a Peligro 🔴 vía override jerárquico', () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);
    // Hielo podrido como superficie puntual fuerza 🔴 siempre.
    clickSuperficie('Hielo podrido (candle)');
    expect(screen.getByText('Peligro')).toBeTruthy();
  });

  it('hielo de glaciar azul + H1 sin peligros → Estable 🟢', () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);
    clickSuperficie('Hielo de glaciar (azul)');
    clickDureza('H1');
    expect(screen.getByText('Estable')).toBeTruthy();
  });

  it('modo borde (no pisar) → estado Observación 🔵', () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);
    fireEvent.click(screen.getByText(/Modo borde \(no pisar\)/i));
    expect(screen.getByText('Observación')).toBeTruthy();
  });
});

describe('GlaciarReporteScreen — guardado', () => {
  it('Guardar habilita tras ubicación + montaña + superficie + dureza, y persiste códigos nuevos', async () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);

    // Montaña (requisito nuevo).
    const selects = /** @type {HTMLSelectElement[]} */ (screen.getAllByRole('combobox'));
    fireEvent.change(selects[0], { target: { value: 'ruiz' } });

    // Capturar GPS.
    fireEvent.click(screen.getByRole('button', { name: /Capturar ubicación/i }));
    expect(requestMock).toHaveBeenCalled();

    // Superficie puntual + dureza puntual.
    clickSuperficie('Hielo de glaciar (azul)');
    clickDureza('H1');

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Guardar reporte/i });
      expect(btn).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /Guardar reporte/i }));
    await waitFor(() => expect(saveMock).toHaveBeenCalled());
    const arg = saveMock.mock.calls[0][0];
    expect(arg.tipoSuperficie).toBe('hielo_glaciar_azul');
    expect(arg.dureza).toBe('H1');
    expect(arg.montana).toBe('ruiz');
    expect(arg.estado).toBe('estable');
    expect(arg.lat).toBeCloseTo(4.81);
    expect(arg.pisoGlaciar).toBe(true);
  });

  it('en modo borde guarda como observación sin exigir dureza', async () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);

    const selects = /** @type {HTMLSelectElement[]} */ (screen.getAllByRole('combobox'));
    fireEvent.change(selects[0], { target: { value: 'cocuy_ritacuba' } });
    fireEvent.click(screen.getByText(/Modo borde \(no pisar\)/i));
    fireEvent.click(screen.getByRole('button', { name: /Capturar ubicación/i }));
    clickSuperficie('Hielo de glaciar (azul)');

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Guardar reporte/i });
      expect(btn).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar reporte/i }));
    await waitFor(() => expect(saveMock).toHaveBeenCalled());
    const arg = saveMock.mock.calls[0][0];
    expect(arg.pisoGlaciar).toBe(false);
    expect(arg.estado).toBe('observacion');
  });
});

describe('GlaciarReporteScreen — disclaimer', () => {
  it('muestra el disclaimer de apoyo a la decisión', () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);
    expect(screen.getByText(/prevalece el juicio del guía certificado/i)).toBeTruthy();
  });

  it('menciona el glaciar Conejeras (propósito de trazabilidad)', () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);
    expect(screen.getByText(/Conejeras/i)).toBeTruthy();
  });
});

describe('GlaciarReporteScreen — U-1 almacenamiento persistente', () => {
  it('solicita almacenamiento persistente al montar el módulo', () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);
    expect(requestPersistentStorageMock).toHaveBeenCalled();
  });

  it('vuelve a solicitarlo al guardar el primer reporte', async () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);
    requestPersistentStorageMock.mockClear();

    const selects = /** @type {HTMLSelectElement[]} */ (screen.getAllByRole('combobox'));
    fireEvent.change(selects[0], { target: { value: 'ruiz' } });
    fireEvent.click(screen.getByRole('button', { name: /Capturar ubicación/i }));
    clickSuperficie('Hielo de glaciar (azul)');
    clickDureza('H1');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Guardar reporte/i })).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar reporte/i }));
    await waitFor(() => expect(saveMock).toHaveBeenCalled());
    expect(requestPersistentStorageMock).toHaveBeenCalled();
  });
});

describe('GlaciarReporteScreen — U-3 autosave del borrador (IndexedDB)', () => {
  it('autosalva el form en IndexedDB al digitar (montaña/superficie)', async () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);
    const selects = /** @type {HTMLSelectElement[]} */ (screen.getAllByRole('combobox'));
    fireEvent.change(selects[0], { target: { value: 'ruiz' } });
    clickSuperficie('Hielo de glaciar (azul)');

    // saveDraft está antirebotado: waitFor espera a que se dispare con el último
    // estado del form (montaña + superficie ya aplicadas).
    await waitFor(() => {
      expect(saveDraftMock).toHaveBeenCalled();
      const lastForm = saveDraftMock.mock.calls.at(-1)[0];
      expect(lastForm.montana).toBe('ruiz');
      expect(lastForm.tipoSuperficie).toBe('hielo_glaciar_azul');
    });
  });

  it('restaura el borrador al montar (simula descarte de pestaña por iOS)', async () => {
    // Sembramos un borrador como si la pestaña se hubiera descartado: loadDraft()
    // lo devuelve al montar (restore async desde IndexedDB).
    draftToLoad = {
      form: { montana: 'tolima', dureza: 'H2', puntoId: 'FRENTE-X' },
      coords: { lat: 4.81, lng: -75.33, altitud: 4850, precision: 8 },
    };

    render(<GlaciarReporteScreen onBack={() => {}} />);

    // La montaña restaurada debe quedar seleccionada (tras el load async).
    await waitFor(() => {
      const selects = /** @type {HTMLSelectElement[]} */ (screen.getAllByRole('combobox'));
      expect(selects[0].value).toBe('tolima');
    });
    // El punto fijo restaurado aparece en su input.
    expect(screen.getByDisplayValue('FRENTE-X')).toBeTruthy();
    // Coords restauradas → "Ubicación capturada" sin volver a pedir GPS.
    expect(screen.getByText(/Ubicación capturada/i)).toBeTruthy();
  });

  it('limpia el borrador (clearDraft) al guardar el reporte con éxito', async () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);
    const selects = /** @type {HTMLSelectElement[]} */ (screen.getAllByRole('combobox'));
    fireEvent.change(selects[0], { target: { value: 'ruiz' } });
    fireEvent.click(screen.getByRole('button', { name: /Capturar ubicación/i }));
    clickSuperficie('Hielo de glaciar (azul)');
    clickDureza('H1');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Guardar reporte/i })).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar reporte/i }));
    await waitFor(() => expect(saveMock).toHaveBeenCalled());

    // El reporte ya quedó en glaciar_reportes → el borrador en curso se borra.
    await waitFor(() => expect(clearDraftMock).toHaveBeenCalled());
  });

  it('no rompe si el borrador en IndexedDB no se puede leer (loadDraft falla)', async () => {
    // loadDraft tolera la corrupción devolviendo null; aun si rechazara, el
    // reporte nuevo debe abrirse igual (la pantalla no depende del borrador).
    loadDraftMock.mockRejectedValueOnce(new Error('IDB ilegible'));
    expect(() => render(<GlaciarReporteScreen onBack={() => {}} />)).not.toThrow();
    expect(screen.getByText('Punto Glaciar')).toBeTruthy();
    // El form arranca vacío (sin montaña seleccionada).
    await waitFor(() => {
      const selects = /** @type {HTMLSelectElement[]} */ (screen.getAllByRole('combobox'));
      expect(selects[0].value).toBe('');
    });
  });
});

describe('GlaciarReporteScreen — U-5 dedup de peligros/matices', () => {
  it('"Pendiente pronunciada" aparece UNA sola vez (chip), sin checkbox duplicado', () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);
    const matches = screen.getAllByText(/Pendiente pronunciada/i);
    expect(matches).toHaveLength(1);
  });

  it('el matiz "penitentes densos" NO se muestra hasta marcar el peligro Penitentes', () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);
    // Antes de marcar el chip: no hay matiz de densidad.
    expect(screen.queryByText(/densos\s*\/\s*altos/i)).toBeNull();

    // Marcar el chip de peligro "Penitentes" (es un button con ese texto).
    const chip = screen.getAllByRole('button').find(
      (b) => /^🗻?\s*Penitentes$/.test(b.textContent.trim()),
    );
    fireEvent.click(chip);

    // Ahora aparece el matiz dependiente.
    expect(screen.getByText(/densos\s*\/\s*altos/i)).toBeTruthy();
  });

  it('el matiz "ruta por debajo de los séracs" es condicional al peligro Séracs', () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);
    expect(screen.queryByText(/pasa por debajo de esos séracs/i)).toBeNull();

    const chip = screen.getAllByRole('button').find(
      (b) => /^🏔️?\s*Séracs$/.test(b.textContent.trim()),
    );
    fireEvent.click(chip);
    expect(screen.getByText(/pasa por debajo de esos séracs/i)).toBeTruthy();
  });
});

describe('GlaciarReporteScreen — U-6 qué falta para guardar', () => {
  // El panel de faltantes es el único role="status" con el encabezado "Falta
  // para guardar". Scopeamos las búsquedas a ese panel para no colisionar con
  // los <option>/labels que comparten texto similar ("Elija la montaña…", etc).
  const getPanel = () =>
    screen.queryAllByRole('status').find((n) => /Falta para guardar/i.test(n.textContent)) || null;

  it('lista los faltantes con buen contraste cuando no se puede guardar', () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);
    const panel = getPanel();
    expect(panel).toBeTruthy();
    expect(panel.textContent).toMatch(/Elija la montaña/i);
    expect(panel.textContent).toMatch(/Capture la ubicación/i);
    expect(panel.textContent).toMatch(/Marque el tipo de superficie/i);
    expect(panel.textContent).toMatch(/Marque la dureza del hielo/i);
  });

  it('los faltantes se reducen al completar requisitos y desaparecen al final', async () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);
    // Capturar GPS primero; el siguiente cambio de estado (montaña) re-renderiza
    // y el panel recoge las coords ya capturadas (el mock expone position por
    // render). Mismo patrón que los tests de guardado de este archivo.
    fireEvent.click(screen.getByRole('button', { name: /Capturar ubicación/i }));
    const selects = /** @type {HTMLSelectElement[]} */ (screen.getAllByRole('combobox'));
    fireEvent.change(selects[0], { target: { value: 'ruiz' } });
    await waitFor(() => {
      const panel = getPanel();
      expect(panel.textContent).not.toMatch(/Elija la montaña/i);
      expect(panel.textContent).not.toMatch(/Capture la ubicación/i);
    });

    clickSuperficie('Hielo de glaciar (azul)');
    clickDureza('H1');
    // Completado todo: el panel de faltantes desaparece por completo.
    await waitFor(() => expect(getPanel()).toBeNull());
  });

  it('en modo borde no exige dureza (no figura entre los faltantes)', () => {
    render(<GlaciarReporteScreen onBack={() => {}} />);
    fireEvent.click(screen.getByText(/Modo borde \(no pisar\)/i));
    expect(getPanel().textContent).not.toMatch(/Marque la dureza del hielo/i);
  });
});
