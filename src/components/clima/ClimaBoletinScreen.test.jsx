/**
 * ClimaBoletinScreen.test.jsx — La Página del Tiempo (rediseño 3 horizontes).
 *
 * Cubre el contrato que NO puede regresar con el rediseño:
 *   1. Render base: cielo ENSO + los 3 HORIZONTES navegables (Hoy / 7–16d / El Niño).
 *   2. Hoy sin ubicación: degrada honesto (SlotPendiente), no inventa números.
 *   3. El Niño: fase EN VIVO de ensoService (default Neutral, fuente base) y su
 *      reflejo real al fijar El Niño (no reimplementa el motor).
 *   4. El Niño: regla insignia por fase + lectura regional (familia correcta) +
 *      boletines IDEAM/MTA/Fenalce + checklist + anti-alucinación (SlotPendiente).
 *   5. Puente al agente (onNavigate).
 *
 * La red (snapshot ENSO + Open-Meteo) se mockea a `null`: la pantalla debe
 * funcionar offline-first sin inventar datos.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ClimaBoletinScreen from './ClimaBoletinScreen.jsx';
import { setEnsoPhase, clearEnsoPhase } from '../../services/ensoService.js';

// Perfil andino (Boyacá) → región 'andina' para la lectura regional.
vi.mock('../../services/userProfileService', async (importActual) => {
  const actual = await importActual();
  return { ...actual, getProfile: () => ({ departamento: 'boyacá' }) };
});

// Red apagada: sin ubicación resoluble ni fetch — la UI degrada honesta.
vi.mock('../../services/climaService', async (importActual) => {
  const actual = await importActual();
  return { ...actual, fetchClimaSnapshot: vi.fn(async () => null) };
});
vi.mock('../../services/agroMeteoService', async (importActual) => {
  const actual = await importActual();
  return { ...actual, fetchAgroMeteo: vi.fn(async () => null), fetchNormales: vi.fn(async () => null) };
});

const gotoElNino = () => fireEvent.click(screen.getByTestId('horizonte-tab-estacional'));

beforeEach(() => {
  cleanup();
  clearEnsoPhase();
  try { localStorage.clear(); } catch { /* jsdom */ }
});

describe('La página del tiempo — render base', () => {
  it('monta con el cielo ENSO y los 3 horizontes', () => {
    render(<ClimaBoletinScreen onBack={() => {}} />);
    expect(screen.getByTestId('clima-boletin-screen')).toBeInTheDocument();
    expect(screen.getByTestId('cielo-enso')).toBeInTheDocument();
    expect(screen.getByTestId('horizonte-tab-hoy')).toBeInTheDocument();
    expect(screen.getByTestId('horizonte-tab-semana')).toBeInTheDocument();
    expect(screen.getByTestId('horizonte-tab-estacional')).toBeInTheDocument();
    expect(screen.getByTestId('horizonte-hoy')).toBeInTheDocument();
  });
});

describe('La página del tiempo — Hoy degrada honesto sin datos', () => {
  it('sin ubicación no inventa números: muestra SlotPendiente', async () => {
    render(<ClimaBoletinScreen onBack={() => {}} />);
    // Tras resolver la red (mock → null), Hoy degrada al estado honesto sin datos.
    const slots = await screen.findAllByTestId('slot-grounded-pendiente');
    expect(slots.length).toBeGreaterThanOrEqual(1);
  });
});

describe('La página del tiempo — El Niño lee la fase ENSO en vivo', () => {
  it('sin override muestra Neutral y la fuente honesta (valor base)', () => {
    render(<ClimaBoletinScreen onBack={() => {}} />);
    gotoElNino();
    expect(screen.getByTestId('clima-fase-label')).toHaveTextContent('Neutral');
    expect(screen.getByTestId('clima-fuente-fase')).toHaveTextContent(/base|conexión/i);
    expect(screen.getByTestId('cielo-enso')).toHaveAttribute('data-family', 'neutral');
  });

  it('refleja la fase cuando el operador fija El Niño (no la inventa)', () => {
    setEnsoPhase('el_nino');
    render(<ClimaBoletinScreen onBack={() => {}} />);
    gotoElNino();
    expect(screen.getByTestId('clima-fase-label')).toHaveTextContent('El Niño');
    expect(screen.getByTestId('clima-fuente-fase')).toHaveTextContent(/mano/i);
    expect(screen.getByTestId('cielo-enso')).toHaveAttribute('data-family', 'nino');
  });
});

describe('La página del tiempo — regla accionable y lectura regional', () => {
  it('con El Niño da la regla insignia: material PRECOZ', () => {
    setEnsoPhase('el_nino');
    render(<ClimaBoletinScreen onBack={() => {}} />);
    gotoElNino();
    expect(screen.getByTestId('clima-regla-insignia')).toHaveTextContent(/PRECOZ/i);
  });

  it('con La Niña la regla apunta al EXCESO de agua', () => {
    setEnsoPhase('la_nina');
    render(<ClimaBoletinScreen onBack={() => {}} />);
    gotoElNino();
    expect(screen.getByTestId('clima-regla-insignia')).toHaveTextContent(/EXCESO de agua/i);
  });

  it('bajo El Niño y perfil andino muestra el impacto regional del Niño', () => {
    setEnsoPhase('el_nino');
    render(<ClimaBoletinScreen onBack={() => {}} />);
    gotoElNino();
    expect(screen.getByTestId('clima-region-linea')).toHaveTextContent(/El Niño en los Andes/i);
  });
});

describe('La página del tiempo — El Niño remite y prepara', () => {
  it('lista boletines IDEAM, MTA (regional andina), Fenalce y el checklist', () => {
    render(<ClimaBoletinScreen onBack={() => {}} />);
    gotoElNino();
    expect(screen.getByTestId('boletin-agrometeorologico')).toBeInTheDocument();
    expect(screen.getByTestId('boletin-agroclimatico')).toBeInTheDocument();
    expect(screen.getByTestId('boletin-enso')).toBeInTheDocument();
    expect(screen.getByTestId('clima-mta')).toBeInTheDocument();
    expect(screen.getByTestId('clima-mta-regional')).toHaveTextContent(/Andina/i);
    expect(screen.getByTestId('clima-fenalce')).toBeInTheDocument();
    expect(screen.getByTestId('clima-checklist')).toBeInTheDocument();
  });

  it('la cifra ENSO que caduca se pinta como dato en camino', () => {
    render(<ClimaBoletinScreen onBack={() => {}} />);
    gotoElNino();
    expect(screen.getByTestId('clima-elnino-2027')).toBeInTheDocument();
    expect(screen.getAllByTestId('slot-grounded-pendiente').length).toBeGreaterThanOrEqual(1);
  });
});

describe('La página del tiempo — puente al agente', () => {
  it('navega al agente con la pregunta prellenada', () => {
    const onNavigate = vi.fn();
    render(<ClimaBoletinScreen onBack={() => {}} onNavigate={onNavigate} />);
    gotoElNino();
    fireEvent.click(screen.getByTestId('clima-preguntar-agente'));
    expect(onNavigate).toHaveBeenCalledWith('agente', expect.objectContaining({
      prefilledPrompt: expect.stringMatching(/sembrar|clima/i),
    }));
  });
});
