/**
 * ErrorBoundary.test.jsx — cobertura del ErrorBoundary con mensaje amable para campesinos.
 *
 * Task #6131: Envolver cada pantalla top-level en un ErrorBoundary con fallback amable
 * para campesino ("algo fallo, tus datos de la finca estan a salvo") + boton recargar.
 *
 * Casos cubiertos:
 *   1. Renderiza hijos normalmente cuando no hay error
 *   2. Captura errores lanzados en componentes hijos
 *   3. Muestra mensaje amable "Algo falló" + "Tus datos de la finca están a salvo"
 *   4. Preserva datos locales (localStorage) tras el error
 *   5. Botón "Recargar Chagra" está presente
 *   6. Botón "Intentar de nuevo" resetea el boundary
 *   7. Detalle técnico se muestra en <details> si hay message
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';
import { MSG } from '../config/messages.js';

// Componente mock que lanza error
const ThrowError = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Error de prueba en componente hijo');
  }
  return <div>Hijo renderizado correctamente</div>;
};

// Wrapper para capturar errores de consola
const consoleError = console.error;

beforeEach(() => {
  console.error = vi.fn();
  // Limpiar localStorage entre tests
  globalThis.localStorage.clear();
});

// Restaurar console.error después de todos los tests
afterEach(() => {
  console.error = consoleError;
});

describe('ErrorBoundary', () => {
  it('renderiza hijos normalmente cuando no hay error', () => {
    render(
      <ErrorBoundary>
        <div>Contenido normal</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Contenido normal')).toBeInTheDocument();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('captura errores lanzados en componentes hijos', async () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.queryByText('Hijo renderizado correctamente')).not.toBeInTheDocument();
    });

    expect(console.error).toHaveBeenCalledWith(
      '[ErrorBoundary] Error capturado:',
      expect.any(Error)
    );
  });

  it('muestra mensaje amable "Algo falló" + "Tus datos de la finca están a salvo"', async () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText(MSG.ALGO_FALLO)).toBeInTheDocument();
    });
  });

  it('preserva datos locales (localStorage) tras el error', async () => {
    // Simular datos de la finca en localStorage
    globalThis.localStorage.setItem('chagra:plants', '[{"id": 1, "name": "Café"}]');
    globalThis.localStorage.setItem('chagra:tasks', '[{"id": 1, "title": "Sembrar"}]');

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText(MSG.ALGO_FALLO)).toBeInTheDocument();
    });

    // Verificar que los datos locales siguen intactos
    expect(globalThis.localStorage.getItem('chagra:plants')).toBe('[{"id": 1, "name": "Café"}]');
    expect(globalThis.localStorage.getItem('chagra:tasks')).toBe('[{"id": 1, "title": "Sembrar"}]');
  });

  it('botón "Recargar Chagra" está presente', async () => {
    // Mock window.location.reload
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { reload: reloadMock },
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    await waitFor(() => {
      const reloadButton = screen.getByText('Recargar Chagra');
      expect(reloadButton).toBeInTheDocument();
      expect(reloadButton.tagName).toBe('BUTTON');
    });
  });

  it('botón "Recargar Chagra" llama a window.location.reload', async () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { reload: reloadMock },
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    await waitFor(() => {
      const reloadButton = screen.getByText('Recargar Chagra');
      reloadButton.click();
    });

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('botón "Intentar de nuevo" resetea el boundary y re-renderiza hijos', async () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Esperar a que se muestre el error
    await waitFor(() => {
      expect(screen.getByText(MSG.ALGO_FALLO)).toBeInTheDocument();
    });

    // Click en "Intentar de nuevo"
    const retryButton = screen.getByText(MSG.INTENTAR_DE_NUEVO);
    retryButton.click();

    // Rerender con shouldThrow=false
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    // Ahora debería mostrarse el hijo normalmente
    await waitFor(() => {
      expect(screen.getByText('Hijo renderizado correctamente')).toBeInTheDocument();
      expect(screen.queryByText(MSG.ALGO_FALLO)).not.toBeInTheDocument();
    });
  });

  it('muestra detalle técnico en <details> si hay error message', async () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText('Detalle técnico (para depuración)')).toBeInTheDocument();
    });

    // Verificar que el mensaje de error está presente
    const errorDetails = screen.getByText(/Error de prueba en componente hijo/);
    expect(errorDetails).toBeInTheDocument();
  });

  it('NO muestra detalle técnico si no hay error message', async () => {
    // Custom error sin message
    const ThrowNoMessage = () => {
      throw new Error(); // Error vacío sin message
    };

    render(
      <ErrorBoundary>
        <ThrowNoMessage />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText(MSG.ALGO_FALLO)).toBeInTheDocument();
    });

    // No debería mostrar detalles
    expect(screen.queryByText('Detalle técnico (para depuración)')).not.toBeInTheDocument();
  });
});