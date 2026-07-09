/**
 * MundosDeMiFinca — entrada Pro "El espíritu de su finca" (GATE por capability).
 *
 * El avatar-espíritu (#/espiritu, EspirituProScreen) estaba HUÉRFANO: montado y
 * sirviendo pero sin NINGUNA entrada visible en la UI (la lección de
 * features-ui-huerfanas-sin-cablear). Este test congela el cableado:
 *   1. SIN módulo Pro registrado → cero rastro (ni botón muerto ni teaser).
 *   2. CON módulo Pro (capability avatar-espiritu) → la banda aparece y su
 *      click navega a la vista real 'espiritu_pro' (case de App.jsx, alias
 *      hash #/espiritu).
 *   3. Registro TARDÍO (loadProModules es async) → la banda aparece sola,
 *      sin remontar el componente.
 */
import React from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, afterEach } from 'vitest';

import MundosDeMiFinca from '../MundosDeMiFinca';
import { registry } from '../../../core/moduleRegistry';

const MODULO_FAKE = {
  id: 'avatar-espiritu-pro',
  version: '0.0.0-test',
  capabilities: ['avatar-espiritu'],
  mount: async () => ({ default: () => null }),
};

afterEach(() => {
  registry.unregister(MODULO_FAKE.id);
  cleanup();
});

describe('Entrada Pro — El espíritu de su finca', () => {
  test('sin módulo Pro registrado NO se renderiza (cero rastro)', () => {
    render(<MundosDeMiFinca onNavigate={vi.fn()} />);
    expect(screen.queryByTestId('entrada-espiritu')).not.toBeInTheDocument();
    expect(screen.queryByText(/espíritu de su finca/i)).not.toBeInTheDocument();
  });

  test('con capability avatar-espiritu aparece y navega a espiritu_pro', () => {
    registry.register(MODULO_FAKE);
    const onNavigate = vi.fn();
    render(<MundosDeMiFinca onNavigate={onNavigate} />);

    const entrada = screen.getByTestId('entrada-espiritu');
    expect(entrada).toBeInTheDocument();
    expect(entrada).toHaveTextContent(/el espíritu de su finca/i);
    // Sello honesto: la banda declara que es del plan Pro.
    expect(entrada).toHaveTextContent(/pro/i);

    fireEvent.click(entrada);
    expect(onNavigate).toHaveBeenCalledWith('espiritu_pro');
  });

  test('registro TARDÍO del módulo (async) hace aparecer la banda sin remontar', () => {
    render(<MundosDeMiFinca onNavigate={vi.fn()} />);
    expect(screen.queryByTestId('entrada-espiritu')).not.toBeInTheDocument();

    // loadProModules corre después del primer render: simular el aterrizaje.
    act(() => {
      registry.register(MODULO_FAKE);
    });
    expect(screen.getByTestId('entrada-espiritu')).toBeInTheDocument();

    // Y si el módulo se va (unregister), la banda desaparece — sin botón muerto.
    act(() => {
      registry.unregister(MODULO_FAKE.id);
    });
    expect(screen.queryByTestId('entrada-espiritu')).not.toBeInTheDocument();
  });

  test('la vista destino espiritu_pro existe en el router real (App.jsx)', async () => {
    // Anti-huérfano en la otra dirección: la entrada no puede apuntar a una
    // vista fantasma. Mismo criterio que el test de reachability.
    // @types/node no está instalado en el repo (gap conocido, mismo criterio y
    // comentario que MundosDeMiFinca.reachability.test.jsx): tsc no resuelve
    // los specifiers "node:*", pero vitest/node sí. Irreducible sin sumar la
    // dependencia @types/node al repo entero.
    // @ts-expect-error TS2591 — ver comentario arriba.
    const fs = await import('node:fs');
    // @ts-expect-error TS2591 — ver comentario arriba.
    const path = await import('node:path');
    // @ts-expect-error TS2591 — ver comentario arriba.
    const { fileURLToPath } = await import('node:url');
    const __dir = path.dirname(fileURLToPath(import.meta.url));
    const appSrc = fs.readFileSync(path.resolve(__dir, '../../../App.jsx'), 'utf8');
    expect(appSrc).toMatch(/case 'espiritu_pro':/);
    expect(appSrc).toMatch(/espiritu: 'espiritu_pro'/);
  });
});
