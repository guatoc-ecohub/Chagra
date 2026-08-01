// @ts-nocheck
/**
// @ts-nocheck
 * ErrorFallback — boundary liviano por modulo con prop moduleName.
 *
 * Cubre:
 *   - renderiza fallback UI al capturar un error
 *   - muestra moduleName en el heading
 *   - el boton "Intentar de nuevo" resetea el estado
 *   - el mensaje de error se muestra en la seccion details
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ErrorFallback } from '../ErrorFallback';

function Falla({ mensaje }) {
  throw new Error(mensaje);
}

// Suprime el console.error esperado de los boundaries durante el test.
let consoleErrorSpy;

describe('ErrorFallback — boundary por modulo', () => {
  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
  });

  it('renderiza fallback UI cuando hasError', () => {
    render(
      <ErrorFallback moduleName="Agente">
        <Falla mensaje="Kaboom" />
      </ErrorFallback>
    );
    expect(screen.getByText(/Algo fallo en Agente/)).toBeTruthy();
  });

  it('muestra moduleName en el heading', () => {
    render(
      <ErrorFallback moduleName="Perfil">
        <Falla mensaje="Error de perfil" />
      </ErrorFallback>
    );
    expect(screen.getByText(/Algo fallo en Perfil/)).toBeTruthy();
  });

  it('el boton "Intentar de nuevo" resetea el estado', () => {
    let debeFallar = true;
    function FallaCondicional() {
      if (debeFallar) {
        throw new Error('Error condicional');
      }
      return <p>Todo bien</p>;
    }

    render(
      <ErrorFallback moduleName="Agente">
        <FallaCondicional />
      </ErrorFallback>
    );

    expect(screen.getByText(/Algo fallo en Agente/)).toBeTruthy();

    const retryButton = screen.getByText('Intentar de nuevo');
    expect(retryButton).toBeTruthy();

    // Corregimos la condicion para que no vuelva a fallar
    debeFallar = false;
    fireEvent.click(retryButton);

    // Despues del reset exitoso, se renderiza el contenido normal
    expect(screen.queryByText(/Algo fallo en Agente/)).toBeNull();
    expect(screen.getByText('Todo bien')).toBeTruthy();
  });

  it('el mensaje de error se muestra en la seccion details', () => {
    render(
      <ErrorFallback moduleName="Agente">
        <Falla mensaje="Error critico del agente" />
      </ErrorFallback>
    );
    expect(screen.getByText('Error critico del agente')).toBeTruthy();
  });
});
