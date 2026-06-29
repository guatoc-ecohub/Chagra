import React from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────
// La flag VITE_FINCA_VIVA_HOME_PERFIL gobierna el shell F2. La mockeamos con un
// let mutable para probar ON (dev) y OFF (prod) en el MISMO archivo.
let flagOn = false;
vi.mock('../../../config/fincaVivaHomeFlag', () => ({
  fincaVivaHomePerfilActivo: () => flagOn,
}));

// useTheme: controla el tema activo para verificar que el shell F2 elige el
// ícono de marca del tema (THEME_ICON) correcto. Devuelve un objeto estable.
let activeTheme = 'biopunk';
vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: activeTheme, setTheme: vi.fn() }),
}));

// NotificationsBell es un componente pesado (stores, clima, sync). Lo stubbeamos
// para aislar el SHELL: el stub solo refleja la prop `variant` que el shell le
// pasa, así verificamos el cableado F2 sin montar el subsistema de notificaciones.
vi.mock('../../NotificationsBell', () => ({
  default: ({ variant }) => (
    <div data-testid="notif-bell" data-variant={variant || 'actual'} />
  ),
}));

// THEME_ICON: stub identificable por tema para aseverar el ícono de marca.
vi.mock('../../dashboard/themeIcon', () => ({
  iconForTheme: (theme) => <svg data-testid={`brand-icon-${theme}`} />,
}));

import { ScreenShell } from '../ScreenShell';

function renderShell(extra = {}) {
  return render(
    <ScreenShell title="Biodiversidad" onBack={vi.fn()} {...extra}>
      <div data-testid="contenido">contenido</div>
    </ScreenShell>,
  );
}

beforeEach(() => {
  flagOn = false;
  activeTheme = 'biopunk';
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-luz');
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ScreenShell — gate de la flag VITE_FINCA_VIVA_HOME_PERFIL', () => {
  test('flag OFF (prod): conserva el shell legacy, SIN la disposición F2', () => {
    flagOn = false;
    renderShell();
    // El shell F2 NO debe montarse → prod intacto.
    expect(screen.queryByTestId('screen-shell-f2')).not.toBeInTheDocument();
    // El contenido y el título siguen presentes (comportamiento sin cambios).
    expect(screen.getByTestId('contenido')).toBeInTheDocument();
    expect(screen.getByText('Biodiversidad')).toBeInTheDocument();
    // La campana legacy NO lleva variante F2.
    expect(screen.getByTestId('notif-bell')).toHaveAttribute('data-variant', 'actual');
  });

  test('flag ON (dev): adopta la disposición F2 y mantiene el contenido', () => {
    flagOn = true;
    renderShell();
    expect(screen.getByTestId('screen-shell-f2')).toBeInTheDocument();
    expect(screen.getByTestId('contenido')).toBeInTheDocument();
    expect(screen.getByText('Biodiversidad')).toBeInTheDocument();
  });
});

describe('ScreenShell F2 — piel del tema activo', () => {
  test('aplica el ícono de marca del agente del tema biopunk', () => {
    flagOn = true;
    activeTheme = 'biopunk';
    renderShell();
    expect(screen.getByTestId('brand-icon-biopunk')).toBeInTheDocument();
  });

  test('aplica el ícono de marca del agente del tema nature', () => {
    flagOn = true;
    activeTheme = 'nature';
    renderShell();
    expect(screen.getByTestId('brand-icon-nature')).toBeInTheDocument();
  });

  test('aplica el ícono de marca del agente del tema minimalista', () => {
    flagOn = true;
    activeTheme = 'minimalista';
    renderShell();
    expect(screen.getByTestId('brand-icon-minimalista')).toBeInTheDocument();
  });

  test('monta la campana en variante F2 (campana redonda del demo, ux-audit P1-3)', () => {
    flagOn = true;
    renderShell();
    expect(screen.getByTestId('notif-bell')).toHaveAttribute('data-variant', 'f2');
  });

  test('el lienzo principal usa la clase de piel del tema (no slate fijo)', () => {
    flagOn = true;
    const { container } = renderShell();
    const main = container.querySelector('main.screen-shell-f2-main');
    expect(main).toBeInTheDocument();
    // El scrim sale de la indirección --c-*; NO debe quedar el bg-slate-950/55
    // fijo del shell legacy (esa es la causa raíz de P2-1 cards slate oscuras).
    expect(main.className).not.toMatch(/bg-slate-950/);
  });
});

describe('ScreenShell F2 — cableado de navegación (paridad con legacy)', () => {
  test('onBack se invoca al pulsar Volver', () => {
    flagOn = true;
    const onBack = vi.fn();
    renderShell({ onBack });
    fireEvent.click(screen.getByLabelText('Volver'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test('Ayuda dispara el evento global chagra:nav → help', () => {
    flagOn = true;
    const spy = vi.fn();
    window.addEventListener('chagra:nav', spy);
    renderShell();
    fireEvent.click(screen.getByLabelText('Manual de uso: cómo usar Chagra'));
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0].detail).toBe('help');
    window.removeEventListener('chagra:nav', spy);
  });

  test('onHome se respeta cuando se pasa explícito (sino, default dashboard)', () => {
    flagOn = true;
    const onHome = vi.fn();
    renderShell({ onHome });
    fireEvent.click(screen.getByLabelText('Inicio'));
    expect(onHome).toHaveBeenCalledTimes(1);
  });
});
