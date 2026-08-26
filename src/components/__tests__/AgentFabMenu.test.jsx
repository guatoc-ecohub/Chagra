/**
 * AgentFabMenu.test.jsx — el menú compacto del FAB (R4,
 * `ops/COMPAI-MENU-DISENO-2026-08-25.md` §1.2): Ver / Escuchar / Enviar una
 * foto / Callar hoy·🔔 (un solo toggle).
 *
 * Español de Colombia (usted), sin voseo.
 */
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import AgentFabMenu from '../AgentFabMenu';

afterEach(cleanup);

const noop = () => {};

describe('AgentFabMenu', () => {
  it('no renderiza nada si abierto=false', () => {
    render(
      <AgentFabMenu
        abierto={false}
        onVer={noop}
        onEscuchar={noop}
        onFoto={noop}
        onAlternarSilencio={noop}
        onCerrar={noop}
      />,
    );
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('muestra las cuatro opciones cuando abierto=true', () => {
    render(
      <AgentFabMenu
        abierto
        onVer={noop}
        onEscuchar={noop}
        onFoto={noop}
        onAlternarSilencio={noop}
        onCerrar={noop}
      />,
    );
    expect(screen.getByRole('menuitem', { name: /^Ver$/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Escuchar/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Enviar una foto/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Que se quede callada hoy/i })).toBeInTheDocument();
  });

  it('"Ver" llama a onVer', () => {
    const onVer = vi.fn();
    render(
      <AgentFabMenu abierto onVer={onVer} onEscuchar={noop} onFoto={noop} onAlternarSilencio={noop} onCerrar={noop} />,
    );
    fireEvent.click(screen.getByRole('menuitem', { name: /^Ver$/i }));
    expect(onVer).toHaveBeenCalledTimes(1);
  });

  it('"Escuchar" llama a onEscuchar', () => {
    const onEscuchar = vi.fn();
    render(
      <AgentFabMenu abierto onVer={noop} onEscuchar={onEscuchar} onFoto={noop} onAlternarSilencio={noop} onCerrar={noop} />,
    );
    fireEvent.click(screen.getByRole('menuitem', { name: /Escuchar/i }));
    expect(onEscuchar).toHaveBeenCalledTimes(1);
  });

  it('"Enviar una foto" llama a onFoto', () => {
    const onFoto = vi.fn();
    render(
      <AgentFabMenu abierto onVer={noop} onEscuchar={noop} onFoto={onFoto} onAlternarSilencio={noop} onCerrar={noop} />,
    );
    fireEvent.click(screen.getByRole('menuitem', { name: /Enviar una foto/i }));
    expect(onFoto).toHaveBeenCalledTimes(1);
  });

  it('silenciado=false: ofrece "Que se quede callada hoy" y llama a onAlternarSilencio', () => {
    const onAlternarSilencio = vi.fn();
    render(
      <AgentFabMenu
        abierto
        onVer={noop}
        onEscuchar={noop}
        onFoto={noop}
        silenciado={false}
        onAlternarSilencio={onAlternarSilencio}
        onCerrar={noop}
      />,
    );
    fireEvent.click(screen.getByRole('menuitem', { name: /Que se quede callada hoy/i }));
    expect(onAlternarSilencio).toHaveBeenCalledTimes(1);
  });

  it('silenciado=true: el MISMO ítem ofrece "Reactivar los avisos"', () => {
    render(
      <AgentFabMenu
        abierto
        onVer={noop}
        onEscuchar={noop}
        onFoto={noop}
        silenciado
        onAlternarSilencio={noop}
        onCerrar={noop}
      />,
    );
    expect(screen.getByRole('menuitem', { name: /Reactivar los avisos/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Que se quede callada hoy/i })).not.toBeInTheDocument();
  });

  it('Escape llama a onCerrar', () => {
    const onCerrar = vi.fn();
    render(
      <AgentFabMenu abierto onVer={noop} onEscuchar={noop} onFoto={noop} onAlternarSilencio={noop} onCerrar={onCerrar} />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it('click en el backdrop (fuera del menú) llama a onCerrar', () => {
    const onCerrar = vi.fn();
    render(
      <AgentFabMenu abierto onVer={noop} onEscuchar={noop} onFoto={noop} onAlternarSilencio={noop} onCerrar={onCerrar} />,
    );
    const backdrop = document.querySelector('[aria-hidden="true"][style*="position: fixed"]');
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop);
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it('el primer ítem ("Ver") recibe el foco al abrir', () => {
    render(
      <AgentFabMenu abierto onVer={noop} onEscuchar={noop} onFoto={noop} onAlternarSilencio={noop} onCerrar={noop} />,
    );
    expect(screen.getByRole('menuitem', { name: /^Ver$/i })).toHaveFocus();
  });
});
