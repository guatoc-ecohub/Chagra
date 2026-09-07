/**
 * BurbujaPizarraPeek.test.jsx — el asomo (peek) del compai como PIZARRA de
 * colegio (rediseño 2026-08-27 v2; reemplaza el asomo de madera desaprobado y
 * el typewriter que mareaba). El toque muestra el último aviso en tiza,
 * ESTÁTICO (aparece y se queda quieto), con tres controles claros Ver /
 * Escuchar / Callar, y "Más opciones" cuando el FAB lo permite.
 *
 * Español de Colombia (usted), sin voseo.
 */
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import BurbujaPizarraPeek from '../BurbujaPizarraPeek';

afterEach(cleanup);

const noop = () => {};

describe('BurbujaPizarraPeek', () => {
  it('asoma el último aviso y los tres controles', () => {
    render(
      <BurbujaPizarraPeek
        mensaje="En su zona se espera lluvia mañana en la tarde."
        onVer={noop}
        onEscuchar={noop}
        onCallar={noop}
        onCerrar={noop}
      />,
    );
    expect(screen.getByTestId('compai-fab-peek')).toBeInTheDocument();
    // ESTÁTICO y SIN DUPLICADO: el aviso está UNA sola vez en el DOM (no hay
    // molde/tinta del typewriter que lo repitan).
    expect(
      screen.getAllByText('En su zona se espera lluvia mañana en la tarde.'),
    ).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Ver el mensaje completo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Escuchar este aviso en voz alta/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Que se quede callado/i })).toBeInTheDocument();
  });

  it('el aviso es ESTÁTICO: texto completo de una vez, sin máquina de escribir', () => {
    const msg = 'Revise la helada de esta noche en su parcela alta.';
    const { container } = render(
      <BurbujaPizarraPeek
        mensaje={msg}
        onVer={noop}
        onEscuchar={noop}
        onCallar={noop}
        onCerrar={noop}
      />,
    );
    // No existe el primitivo Typewriter (ni su contenedor) en el asomo.
    expect(container.querySelector('.typewriter')).toBeNull();
    // El aviso está COMPLETO desde el primer render (no se revela letra a letra).
    const texto = container.querySelector('.burbuja-pizarra-peek__texto');
    expect(texto).not.toBeNull();
    expect(texto.textContent).toBe(msg);
  });

  it('invoca cada control', () => {
    const onVer = vi.fn();
    const onEscuchar = vi.fn();
    const onCallar = vi.fn();
    render(
      <BurbujaPizarraPeek
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
      <BurbujaPizarraPeek mensaje="hola" onVer={noop} onEscuchar={noop} onCallar={noop} onCerrar={noop} />,
    );
    expect(screen.queryByRole('button', { name: /Más opciones/i })).toBeNull();
    rerender(
      <BurbujaPizarraPeek mensaje="hola" onVer={noop} onEscuchar={noop} onCallar={noop} onMas={onMas} onCerrar={noop} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Más opciones/i }));
    expect(onMas).toHaveBeenCalledTimes(1);
  });

  it('Callar refleja el estado ya silenciado', () => {
    render(
      <BurbujaPizarraPeek mensaje="hola" silenciado onVer={noop} onEscuchar={noop} onCallar={noop} onCerrar={noop} />,
    );
    const callar = screen.getByRole('button', { name: /Ya está en silencio/i });
    expect(callar).toHaveAttribute('aria-pressed', 'true');
  });

  it('Escape descarta el asomo (onCerrar)', () => {
    const onCerrar = vi.fn();
    render(
      <BurbujaPizarraPeek mensaje="hola" onVer={noop} onEscuchar={noop} onCallar={noop} onCerrar={onCerrar} />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it('un toque AFUERA descarta el asomo, sin overlay que tape la app', () => {
    const onCerrar = vi.fn();
    render(
      <div>
        <button type="button" data-testid="afuera">fondo</button>
        <BurbujaPizarraPeek mensaje="hola" onVer={noop} onEscuchar={noop} onCallar={noop} onCerrar={onCerrar} />
      </div>,
    );
    // No debe existir ningún backdrop de pantalla completa.
    expect(document.querySelector('.burbuja-pizarra-peek__backdrop')).toBeNull();
    fireEvent.pointerDown(screen.getByTestId('afuera'));
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it('un toque DENTRO de la pizarra no la descarta', () => {
    const onCerrar = vi.fn();
    render(
      <BurbujaPizarraPeek mensaje="hola" onVer={noop} onEscuchar={noop} onCallar={noop} onCerrar={onCerrar} />,
    );
    fireEvent.pointerDown(screen.getByTestId('compai-fab-peek'));
    expect(onCerrar).not.toHaveBeenCalled();
  });

  it('sin mensaje muestra una línea de ayuda (nunca queda vacío ni se anuncia como tablero)', () => {
    render(
      <BurbujaPizarraPeek mensaje="" onVer={noop} onEscuchar={noop} onCallar={noop} onCerrar={noop} />,
    );
    expect(screen.getAllByText(/Estoy pendiente de su chagra/i)).toHaveLength(1);
    expect(screen.queryByText(/tablero|pizarra|madera/i)).toBeNull();
  });
});
