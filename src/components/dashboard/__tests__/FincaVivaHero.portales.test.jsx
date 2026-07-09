import React from 'react';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Home F2 "Finca Viva" — LAS 6 PUERTAS del hero (usabilidad campesina #5,
// fold del mockup #/mockups/home-campesino) deben llevar a SU destino, que YA
// existe en App.jsx:
//   · Mis matas     → 'mundo_cultivos' (portada del mundo Cultivos).
//   · Mis animales  → 'mundo' + { mundo: 'animales' } (gate por perfil).
//   · El tiempo     → 'hoy_finca'.
//   · Vender        → 'mercado'.
//   · Aprender      → 'aprende'.
//   · Toda mi finca → onTodaMiFinca (revela LOS MUNDOS en la hoja de abajo);
//                     sin callback, scroll directo al ancla #bloque-mundos.
// Y el resto del shell F2 (chip de ubicación, pastilla de ayuda, pastilla de
// perfil) debe navegar a su ruta, sin botones muertos.

// La escena lee la finca de farmProcessCache y el store; mockeamos a "vacía"
// para un render determinista (no necesitamos datos reales para probar el ruteo).
vi.mock('../../../db/farmProcessCache', () => ({ listFarmProcesses: vi.fn(async () => []) }));
vi.mock('../../../store/useAssetStore', () => ({
  default: (selector) => selector({ plants: [], lands: [], materials: [], isHydrated: true }),
}));
vi.mock('../../../services/userProfileService', () => ({
  getProfile: () => ({ rol: 'campesino' }),
  hasManualModuleVisibility: () => false,
}));
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

const puertaLabel = (el) => el.getAttribute('aria-label')?.split(':')[0];

afterEach(() => cleanup());
beforeEach(() => vi.clearAllMocks());

describe('FincaVivaHero — las 6 puertas llevan a su destino correcto', () => {
  function renderHero(extra = {}) {
    const onNavigate = vi.fn();
    const onOpenAgent = vi.fn();
    const onTodaMiFinca = vi.fn();
    render(
      <FincaVivaHero
        onNavigate={onNavigate}
        onOpenAgent={onOpenAgent}
        onTodaMiFinca={onTodaMiFinca}
        {...extra}
      />,
    );
    return { onNavigate, onOpenAgent, onTodaMiFinca };
  }

  const getPuerta = (nombre) => {
    const nav = screen.getByTestId('finca-viva-puertas');
    return within(nav)
      .getAllByRole('button')
      .find((b) => puertaLabel(b) === nombre);
  };

  test('se renderizan las 6 puertas, de 1-2 palabras', () => {
    renderHero();
    const nav = screen.getByTestId('finca-viva-puertas');
    const puertas = within(nav).getAllByRole('button');
    expect(puertas).toHaveLength(6);
    expect(puertas.map(puertaLabel)).toEqual([
      'Mis matas', 'Mis animales', 'El tiempo', 'Vender', 'Aprender', 'Toda mi finca',
    ]);
  });

  test('"Mis matas" abre la portada del mundo Cultivos', () => {
    const { onNavigate } = renderHero();
    fireEvent.click(getPuerta('Mis matas'));
    expect(onNavigate).toHaveBeenCalledWith('mundo_cultivos');
  });

  test('"Mis animales" abre el mundo Animales', () => {
    const { onNavigate } = renderHero();
    fireEvent.click(getPuerta('Mis animales'));
    expect(onNavigate).toHaveBeenCalledWith('mundo', { mundo: 'animales' });
  });

  test('"El tiempo" abre su día en la finca (hoy_finca)', () => {
    const { onNavigate } = renderHero();
    fireEvent.click(getPuerta('El tiempo'));
    expect(onNavigate).toHaveBeenCalledWith('hoy_finca');
  });

  test('"Vender" abre el mercado', () => {
    const { onNavigate } = renderHero();
    fireEvent.click(getPuerta('Vender'));
    expect(onNavigate).toHaveBeenCalledWith('mercado');
  });

  test('"Aprender" abre las lecciones (aprende)', () => {
    const { onNavigate } = renderHero();
    fireEvent.click(getPuerta('Aprender'));
    expect(onNavigate).toHaveBeenCalledWith('aprende');
  });

  test('"Toda mi finca" revela LOS MUNDOS (onTodaMiFinca), no navega a otra vista', () => {
    const { onNavigate, onTodaMiFinca } = renderHero();
    fireEvent.click(getPuerta('Toda mi finca'));
    expect(onTodaMiFinca).toHaveBeenCalledTimes(1);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  test('sin onTodaMiFinca, "Toda mi finca" hace scroll al ancla #bloque-mundos', () => {
    const onNavigate = vi.fn();
    const seccion = document.createElement('div');
    seccion.id = 'bloque-mundos';
    seccion.scrollIntoView = vi.fn();
    document.body.appendChild(seccion);

    render(<FincaVivaHero onNavigate={onNavigate} onOpenAgent={vi.fn()} />);
    fireEvent.click(getPuerta('Toda mi finca'));

    expect(seccion.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(onNavigate).not.toHaveBeenCalled();
    document.body.removeChild(seccion);
  });

  test('el botón dominante "Pregunte" (compositor) abre el agente', () => {
    const { onNavigate, onOpenAgent } = renderHero();
    fireEvent.click(screen.getByTestId('finca-viva-agent-fab'));
    expect(onOpenAgent).toHaveBeenCalledTimes(1);
    expect(onNavigate).not.toHaveBeenCalled();
  });
});

describe('FincaVivaHero — Escuchar (🔊) y Pleno sol (☀️)', () => {
  test('el botón Escuchar existe y lee la pantalla con el TTS propio (kokoro)', async () => {
    const onNavigate = vi.fn();
    render(<FincaVivaHero onNavigate={onNavigate} onOpenAgent={vi.fn()} />);
    const btn = screen.getByTestId('fvh-escuchar');
    expect(btn).toBeInTheDocument();
    // El TTS se importa perezoso al primer toque; aquí basta con que el toque
    // no reviente sin backend de audio (jsdom sin speechSynthesis).
    fireEvent.click(btn);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  test('el toggle Pleno sol alterna la variante de alto contraste (data-plenosol)', () => {
    render(<FincaVivaHero onNavigate={vi.fn()} onOpenAgent={vi.fn()} />);
    const hero = screen.getByTestId('finca-viva-hero');
    const toggle = screen.getByTestId('fvh-pleno-sol');
    const antes = hero.getAttribute('data-plenosol');
    fireEvent.click(toggle);
    const despues = hero.getAttribute('data-plenosol');
    expect(despues).not.toBe(antes);
    // Alterna de vuelta (override manual persistido, no se queda pegado).
    fireEvent.click(toggle);
    expect(hero.getAttribute('data-plenosol')).toBe(antes);
  });
});

describe('FincaVivaHero — barra superior sin botones muertos', () => {
  test('la pastilla de Ayuda navega a la vista ayuda (no era un botón muerto)', () => {
    const onNavigate = vi.fn();
    render(<FincaVivaHero onNavigate={onNavigate} onOpenAgent={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ayuda' }));
    expect(onNavigate).toHaveBeenCalledWith('ayuda');
  });

  test('la pastilla de Perfil navega a la vista perfil', () => {
    const onNavigate = vi.fn();
    render(<FincaVivaHero onNavigate={onNavigate} onOpenAgent={vi.fn()} />);
    // feedback operador #2: el acceso a PERFIL debe existir junto al "?".
    fireEvent.click(screen.getByRole('button', { name: 'Mi perfil' }));
    expect(onNavigate).toHaveBeenCalledWith('perfil');
  });

  test('el botón de Perfil está presente en el topbar junto al de Ayuda (no se pierde)', () => {
    render(<FincaVivaHero onNavigate={vi.fn()} onOpenAgent={vi.fn()} />);
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
    render(<FincaVivaHero onNavigate={onNavigate} onOpenAgent={onOpenAgent} />);
    // La A de marca ES el botón del agente (en biopunk la A de la mano de
    // Chagra invoca al agente), NO el perfil — son botones distintos.
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
