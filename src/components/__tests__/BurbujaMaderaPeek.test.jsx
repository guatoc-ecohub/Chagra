/**
 * BurbujaMaderaPeek.test.jsx — el asomo (peek) de madera del compai
 * (decisión del operador 2026-08-27): el toque muestra el último aviso con
 * tres controles claros Ver / Escuchar / Callar, y "Más opciones" cuando el
 * FAB lo permite.
 *
 * Español de Colombia (usted), sin voseo.
 */
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import BurbujaMaderaPeek from '../BurbujaMaderaPeek';

afterEach(cleanup);

const noop = () => {};

describe('BurbujaMaderaPeek', () => {
  it('asoma el último aviso y los tres controles', () => {
    render(
      <BurbujaMaderaPeek
        mensaje="En su zona se espera lluvia mañana en la tarde."
        onVer={noop}
        onEscuchar={noop}
        onCallar={noop}
        onCerrar={noop}
      />,
    );
    expect(screen.getByTestId('compai-fab-peek')).toBeInTheDocument();
    // El texto lo escribe Typewriter (varios spans: molde/tinta/sr) → getAllByText.
    expect(
      screen.getAllByText('En su zona se espera lluvia mañana en la tarde.').length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Ver el mensaje completo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Escuchar este aviso en voz alta/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Que se quede callado/i })).toBeInTheDocument();
  });

  it('invoca cada control', () => {
    const onVer = vi.fn();
    const onEscuchar = vi.fn();
    const onCallar = vi.fn();
    render(
      <BurbujaMaderaPeek
        mensaje="Revise la helada de esta noche."
        onVer={onVer}
        onEscuchar={onEscuchar}
        onCallar={onCallar}
        onCerrar={noop}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Ver el mensaje completo/i }));
    fireEvent.click(screen.getByRole('button', { name: /Escuchar este aviso en voz alta/i }));
    fireEvent.click(screen.getByRole('button', { name: /Que se quede callado/i }));
    expect(onVer).toHaveBeenCalledTimes(1);
    expect(onEscuchar).toHaveBeenCalledTimes(1);
    expect(onCallar).toHaveBeenCalledTimes(1);
  });

  it('"Más opciones" solo aparece cuando el FAB pasa onMas, y lo invoca', () => {
    const onMas = vi.fn();
    const { rerender } = render(
      <BurbujaMaderaPeek mensaje="hola" onVer={noop} onEscuchar={noop} onCallar={noop} onCerrar={noop} />,
    );
    expect(screen.queryByRole('button', { name: /Más opciones/i })).toBeNull();
    rerender(
      <BurbujaMaderaPeek mensaje="hola" onVer={noop} onEscuchar={noop} onCallar={noop} onMas={onMas} onCerrar={noop} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Más opciones/i }));
    expect(onMas).toHaveBeenCalledTimes(1);
  });

  it('Callar refleja el estado ya silenciado', () => {
    render(
      <BurbujaMaderaPeek mensaje="hola" silenciado onVer={noop} onEscuchar={noop} onCallar={noop} onCerrar={noop} />,
    );
    const callar = screen.getByRole('button', { name: /Ya está en silencio/i });
    expect(callar).toHaveAttribute('aria-pressed', 'true');
  });

  it('Escape descarta el asomo (onCerrar)', () => {
    const onCerrar = vi.fn();
    render(
      <BurbujaMaderaPeek mensaje="hola" onVer={noop} onEscuchar={noop} onCallar={noop} onCerrar={onCerrar} />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it('sin mensaje muestra una línea amable (nunca queda vacío)', () => {
    render(
      <BurbujaMaderaPeek mensaje="" onVer={noop} onEscuchar={noop} onCallar={noop} onCerrar={noop} />,
    );
    expect(screen.getAllByText(/Estoy con usted/i).length).toBeGreaterThan(0);
  });
});
