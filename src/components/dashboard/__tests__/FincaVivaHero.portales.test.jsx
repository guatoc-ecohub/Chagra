import React from 'react';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Home F2 "Finca Viva" — los 4 portales del hero deben llevar a SU destino:
//   · Mi finca  → la GESTIÓN de la finca (registros/acciones), NO el juego.
//                 (bug: iba a onNavigate('juego'), igual que el portal "Jugar".)
//   · Aprender  → la vista 'aprende'.
//   · Jugar     → la vista 'juego' (ese SÍ es el juego).
//   · Pregúntele a Chagra → abre el agente (onOpenAgent).
// Y el resto del shell F2 (chip de ubicación, pastilla de ayuda, pastilla de
// perfil) debe navegar a su ruta, sin botones muertos.

// La escena lee la finca de farmProcessCache y el store; mockeamos a "vacía"
// para un render determinista (no necesitamos datos reales para probar el ruteo).
vi.mock('../../../db/farmProcessCache', () => ({ listFarmProcesses: vi.fn(async () => []) }));
vi.mock('../../../store/useAssetStore', () => ({
  default: (selector) => selector({ plants: [], lands: [], materials: [], isHydrated: true }),
}));
vi.mock('../../../services/userProfileService', () => ({ getProfile: () => ({ rol: 'campesino' }) }));
vi.mock('../../../config/glaciarAccess', () => ({
  tieneAccesoGlaciarActual: () => false,
  esOperadorActual: () => false,
}));
// La campana real arrastra media app (stores + climaService + notificaciones);
// aquí solo probamos el RUTEO del header, así que va un stub con el mismo rol
// accesible que la de verdad.
vi.mock('../../NotificationsBell', () => ({
  default: () => <button type="button" aria-label="Notificaciones" data-testid="bell-stub" />,
}));

import FincaVivaHero from '../FincaVivaHero';

const portalLabel = (el) => el.getAttribute('aria-label')?.split(':')[0];

afterEach(() => cleanup());
beforeEach(() => vi.clearAllMocks());

describe('FincaVivaHero — los 4 portales llevan a su destino correcto', () => {
  function renderHero(extra = {}) {
    const onNavigate = vi.fn();
    const onOpenAgent = vi.fn();
    const onGestionar = vi.fn();
    render(
      <FincaVivaHero
        onNavigate={onNavigate}
        onOpenAgent={onOpenAgent}
        onGestionar={onGestionar}
        {...extra}
      />,
    );
    return { onNavigate, onOpenAgent, onGestionar };
  }

  const getPortal = (nombre) => {
    const nav = screen.getByTestId('finca-viva-portales');
    return within(nav)
      .getAllByRole('button')
      .find((b) => portalLabel(b) === nombre);
  };

  test('el portal "Mi finca" NO navega al juego', () => {
    const { onNavigate } = renderHero();
    fireEvent.click(getPortal('Mi finca'));
    expect(onNavigate).not.toHaveBeenCalledWith('juego');
  });

  test('el portal "Mi finca" abre la GESTIÓN de la finca (onGestionar), no otra vista', () => {
    const { onNavigate, onOpenAgent, onGestionar } = renderHero();
    fireEvent.click(getPortal('Mi finca'));
    expect(onGestionar).toHaveBeenCalledTimes(1);
    // No se cuela a ninguna otra ruta ni al agente.
    expect(onNavigate).not.toHaveBeenCalled();
    expect(onOpenAgent).not.toHaveBeenCalled();
  });

  test('sin onGestionar, "Mi finca" hace scroll al ancla #finca-gestion (no al juego)', () => {
    const onNavigate = vi.fn();
    const seccion = document.createElement('div');
    seccion.id = 'finca-gestion';
    seccion.scrollIntoView = vi.fn();
    document.body.appendChild(seccion);

    render(<FincaVivaHero onNavigate={onNavigate} onOpenAgent={vi.fn()} />);
    fireEvent.click(getPortal('Mi finca'));

    expect(seccion.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(onNavigate).not.toHaveBeenCalledWith('juego');
    document.body.removeChild(seccion);
  });

  test('el portal "Aprender" navega a la vista aprende', () => {
    const { onNavigate } = renderHero();
    fireEvent.click(getPortal('Aprender'));
    expect(onNavigate).toHaveBeenCalledWith('aprende');
  });

  test('el portal "Jugar" SÍ navega al juego', () => {
    const { onNavigate } = renderHero();
    fireEvent.click(getPortal('Jugar'));
    expect(onNavigate).toHaveBeenCalledWith('juego');
  });

  test('el portal "Pregúntele a Chagra" abre el agente (onOpenAgent), no navega a una vista', () => {
    const { onNavigate, onOpenAgent } = renderHero();
    fireEvent.click(getPortal('Pregúntele a Chagra'));
    expect(onOpenAgent).toHaveBeenCalledTimes(1);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  test('cada portal mapea a un destino distinto (Mi finca ≠ Jugar)', () => {
    const { onNavigate, onOpenAgent, onGestionar } = renderHero();
    fireEvent.click(getPortal('Mi finca'));
    fireEvent.click(getPortal('Jugar'));
    // Mi finca fue a la gestión; Jugar al juego. No coinciden.
    expect(onGestionar).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith('juego');
    expect(onNavigate).not.toHaveBeenCalledWith('gestionar');
    expect(onOpenAgent).not.toHaveBeenCalled();
  });
});

describe('FincaVivaHero — barra superior sin botones muertos', () => {
  test('la pastilla de Ayuda navega a la vista ayuda (no era un botón muerto)', () => {
    const onNavigate = vi.fn();
    render(<FincaVivaHero onNavigate={onNavigate} onOpenAgent={vi.fn()} onGestionar={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ayuda' }));
    expect(onNavigate).toHaveBeenCalledWith('ayuda');
  });

  test('la pastilla de Perfil navega a la vista perfil', () => {
    const onNavigate = vi.fn();
    render(<FincaVivaHero onNavigate={onNavigate} onOpenAgent={vi.fn()} onGestionar={vi.fn()} />);
    // feedback operador #2: el acceso a PERFIL debe existir junto al "?".
    fireEvent.click(screen.getByRole('button', { name: 'Mi perfil' }));
    expect(onNavigate).toHaveBeenCalledWith('perfil');
  });

  test('el botón de Perfil está presente en el topbar junto al de Ayuda (no se pierde)', () => {
    render(<FincaVivaHero onNavigate={vi.fn()} onOpenAgent={vi.fn()} onGestionar={vi.fn()} />);
    const ayuda = screen.getByRole('button', { name: 'Ayuda' });
    const perfil = screen.getByTestId('finca-viva-perfil');
    expect(perfil).toBeInTheDocument();
    expect(perfil).toHaveAttribute('aria-label', 'Mi perfil');
    // Ambos viven en la misma barra de pastillas (mismo contenedor).
    expect(ayuda.parentElement).toBe(perfil.parentElement);
  });

  test('regresión 2026-07-04: agente(A) + campana + ayuda + perfil COEXISTEN en el header', () => {
    const onNavigate = vi.fn();
    const onOpenAgent = vi.fn();
    render(<FincaVivaHero onNavigate={onNavigate} onOpenAgent={onOpenAgent} onGestionar={vi.fn()} />);
    // La A de marca ES el botón del agente (en biopunk la A invoca al agente),
    // NO el perfil — son botones distintos y ambos deben estar.
    const agenteA = screen.getByTestId('fvh-brand-agente');
    fireEvent.click(agenteA);
    expect(onOpenAgent).toHaveBeenCalledTimes(1);
    expect(onNavigate).not.toHaveBeenCalledWith('perfil');
    // Campana (F2 no monta el TopBar legacy: la campana vive aquí).
    expect(screen.getByRole('button', { name: 'Notificaciones' })).toBeInTheDocument();
    // Y el cuarteto completo, visible a la vez.
    expect(screen.getByRole('button', { name: 'Ayuda' })).toBeInTheDocument();
    expect(screen.getByTestId('finca-viva-perfil')).toBeInTheDocument();
  });
});
