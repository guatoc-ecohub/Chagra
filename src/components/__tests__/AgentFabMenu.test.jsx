/**
 * AgentFabMenu.test.jsx — el menú flotante del TOQUE CORTO sobre el
 * personaje (#66/#70, 2026-07-30): "Hablar", "Enviar foto",
 * "Que se quede callado hoy" (#107).
 *
 * Español de Colombia (usted), sin voseo.
 */
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import AgentFabMenu from '../AgentFabMenu';

afterEach(cleanup);

describe('AgentFabMenu', () => {
  it('no renderiza nada si abierto=false', () => {
    render(
      <AgentFabMenu
        abierto={false}
        onEscuchar={() => {}}
        onHablar={() => {}}
        onFoto={() => {}}
        onFotos={() => {}}
        onHoyNo={() => {}}
        onCerrar={() => {}}
      />,
    );
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('muestra las tres opciones cuando abierto=true', () => {
    render(
      <AgentFabMenu
        abierto
        onEscuchar={() => {}}
        onHablar={() => {}}
        onFoto={() => {}}
        onFotos={() => {}}
        onHoyNo={() => {}}
        onCerrar={() => {}}
      />,
    );
    expect(screen.getByRole('menuitem', { name: /Hablar/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Enviar una foto/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Que se quede callado hoy/i })).toBeInTheDocument();
  });

  it('"Hablar" llama a onHablar', () => {
    const onHablar = vi.fn();
    render(
      <AgentFabMenu
        abierto
        onEscuchar={() => {}}
        onHablar={onHablar}
        onFoto={() => {}}
        onFotos={() => {}}
        onHoyNo={() => {}}
        onCerrar={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('menuitem', { name: /Hablar/i }));
    expect(onHablar).toHaveBeenCalledTimes(1);
  });

  it('"Enviar foto" llama a onFoto', () => {
    const onFoto = vi.fn();
    render(
      <AgentFabMenu
        abierto
        onEscuchar={() => {}}
        onHablar={() => {}}
        onFoto={onFoto}
        onFotos={() => {}}
        onHoyNo={() => {}}
        onCerrar={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('menuitem', { name: /Enviar una foto/i }));
    expect(onFoto).toHaveBeenCalledTimes(1);
  });

  it('"Que se quede callado hoy" llama a onHoyNo', () => {
    const onHoyNo = vi.fn();
    render(
      <AgentFabMenu
        abierto
        onEscuchar={() => {}}
        onHablar={() => {}}
        onFoto={() => {}}
        onFotos={() => {}}
        onHoyNo={onHoyNo}
        onCerrar={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('menuitem', { name: /Que se quede callado hoy/i }));
    expect(onHoyNo).toHaveBeenCalledTimes(1);
  });

  it('Escape llama a onCerrar', () => {
    const onCerrar = vi.fn();
    render(
      <AgentFabMenu
        abierto
        onEscuchar={() => {}}
        onHablar={() => {}}
        onFoto={() => {}}
        onFotos={() => {}}
        onHoyNo={() => {}}
        onCerrar={onCerrar}
      />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it('click en el backdrop (fuera del menú) llama a onCerrar', () => {
    const onCerrar = vi.fn();
    render(
      <AgentFabMenu
        abierto
        onEscuchar={() => {}}
        onHablar={() => {}}
        onFoto={() => {}}
        onFotos={() => {}}
        onHoyNo={() => {}}
        onCerrar={onCerrar}
      />,
    );
    // El backdrop es el único elemento aria-hidden con position:fixed inset:0.
    const backdrop = document.querySelector('[aria-hidden="true"][style*="position: fixed"]');
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop);
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });
});
