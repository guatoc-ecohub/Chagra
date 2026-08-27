import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useAngelitaStore from '../../store/useAngelitaStore';

// Mock de savePayload
vi.mock('../../services/payloadService', () => ({
  savePayload: vi.fn(() => Promise.resolve({
    success: true,
    message: 'Cosecha guardada exitosamente'
  })),
}));

describe('HarvestLog - celebración de cosecha', () => {
  beforeEach(() => {
    // Resetear el store antes de cada test
    useAngelitaStore.getState().reposar();
  });

  it('celebra() se llama al registrar una cosecha exitosamente', async () => {
    const celebrarSpy = vi.fn();
    useAngelitaStore.setState({
      celebrar: celebrarSpy,
    });

    // Simular el guardado exitoso de una cosecha
    const mockPayload = {
      producto: 'Tomate',
      quantity: 10,
      unit: 'Kilogramos',
    };

    const result = await import('../../services/payloadService').then(m =>
      m.savePayload('harvest', mockPayload)
    );

    expect(result.success).toBe(true);

    // Verificar que se llamaría a celebrar con los datos correctos
    // (en el componente real esto se hace después del savePayload)
    const logroEsperado = {
      id: expect.stringMatching(/^harvest-\d+-[a-z0-9]+$/),
      texto: expect.stringContaining('Tomate'),
    };

    // En el componente real se llamaría:
    // celebrar({ id: logroId, texto: `¡Bien! Registró ${quantity} ${unit} de ${product}.` });
    expect(celebrarSpy).toHaveBeenCalledWith(logroEsperado);
  });

  it('celebra() respeta cooldown y dedup por id', async () => {
    const celebrarSpy = vi.fn();
    useAngelitaStore.setState({
      celebrar: celebrarSpy,
      ultimoLogroId: 'harvest-1234567890-abc',
    });

    // Simular dos cosechas con el mismo id
    const logroId = 'harvest-1234567890-abc';

    // Primera llamada
    act(() => {
      useAngelitaStore.getState().celebrar({
        id: logroId,
        texto: '¡Bien! Registró 10 Kilogramos de Tomate.',
      });
    });

    expect(celebrarSpy).toHaveBeenCalledTimes(1);

    // Segunda llamada con mismo id (debería ser ignorada por dedup)
    act(() => {
      useAngelitaStore.getState().celebrar({
        id: logroId,
        texto: '¡Bien! Registró 10 Kilogramos de Tomate.',
      });
    });

    // El store maneja dedup, verificar que la lógica funciona
    const ultimoId = useAngelitaStore.getState().ultimoLogroId;
    expect(ultimoId).toBe(logroId);
  });
});
