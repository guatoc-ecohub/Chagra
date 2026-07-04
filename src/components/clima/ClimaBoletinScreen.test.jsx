/**
 * ClimaBoletinScreen.test.jsx — módulo "El clima que viene" (traductor IDEAM/ENSO).
 *
 * Cubre:
 *   1. Render base: cielo ENSO + los 3 pilares navegables.
 *   2. ¿Qué viene?: muestra la fase ENVIVO de ensoService (default: Neutral) y
 *      la marca honesta de la fuente (sin conexión → valor base).
 *   3. Enlace real con ensoService: al fijar El Niño con setEnsoPhase, el módulo
 *      lo refleja (no reimplementa el motor).
 *   4. Qué hacer: la regla insignia por fase (El Niño → material precoz).
 *   5. Dónde mirar: remite a los boletines IDEAM + MTA + Fenalce.
 *   6. Honestidad grounded: la probabilidad que caduca queda como "dato en camino".
 *   7. Puente al agente (onNavigate).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ClimaBoletinScreen from './ClimaBoletinScreen.jsx';
import { setEnsoPhase, clearEnsoPhase } from '../../services/ensoService.js';

// Perfil con departamento andino → región 'andina' (ensoContext.regionFromProfile),
// para verificar que la lectura regional usa la FAMILIA correcta y no cae a
// neutral con el coarse 'el_nino'. Conservamos el resto del módulo real
// (climaService y otros dependen de sus otras exportaciones).
vi.mock('../../services/userProfileService', async (importActual) => {
  const actual = /** @type {typeof import('../../services/userProfileService')} */ (
    await importActual()
  );
  return { ...actual, getProfile: () => ({ departamento: 'boyacá' }) };
});

beforeEach(() => {
  cleanup();
  clearEnsoPhase();
  try { localStorage.clear(); } catch { /* jsdom */ }
});

describe('ClimaBoletinScreen — render base', () => {
  it('monta la pantalla con el cielo ENSO y los 3 pilares', () => {
    render(<ClimaBoletinScreen onBack={() => {}} />);
    expect(screen.getByTestId('clima-boletin-screen')).toBeInTheDocument();
    expect(screen.getByTestId('cielo-enso')).toBeInTheDocument();
    expect(screen.getByTestId('pilar-tab-que_viene')).toBeInTheDocument();
    expect(screen.getByTestId('pilar-tab-que_hacer')).toBeInTheDocument();
    expect(screen.getByTestId('pilar-tab-donde_mirar')).toBeInTheDocument();
    // Arranca en "¿Qué viene?"
    expect(screen.getByTestId('pilar-que-viene')).toBeInTheDocument();
  });
});

describe('ClimaBoletinScreen — ¿Qué viene? lee la fase ENSO en vivo', () => {
  it('sin override muestra fase Neutral y la fuente honesta (valor base)', () => {
    render(<ClimaBoletinScreen onBack={() => {}} />);
    expect(screen.getByTestId('clima-fase-label')).toHaveTextContent('Neutral');
    // Sin sidecar ni override → fuente "sin conexión / valor base".
    expect(screen.getByTestId('clima-fuente-fase')).toHaveTextContent(/base|conexión/i);
    // El cielo neutral dibuja sol entre nubes.
    expect(screen.getByTestId('cielo-enso')).toHaveAttribute('data-family', 'neutral');
  });

  it('refleja la fase de ensoService cuando el operador fija El Niño (no la inventa)', () => {
    setEnsoPhase('el_nino');
    render(<ClimaBoletinScreen onBack={() => {}} />);
    expect(screen.getByTestId('clima-fase-label')).toHaveTextContent('El Niño');
    expect(screen.getByTestId('clima-fuente-fase')).toHaveTextContent(/mano/i);
    expect(screen.getByTestId('cielo-enso')).toHaveAttribute('data-family', 'nino');
  });

  it('en neutral la probabilidad que caduca se pinta como dato en camino', () => {
    render(<ClimaBoletinScreen onBack={() => {}} />);
    expect(screen.getAllByTestId('slot-grounded-pendiente').length).toBeGreaterThanOrEqual(1);
  });
});

describe('ClimaBoletinScreen — Qué hacer (regla accionable por fase)', () => {
  it('con El Niño da la regla insignia: material precoz y de menor demanda hídrica', () => {
    setEnsoPhase('el_nino');
    render(<ClimaBoletinScreen onBack={() => {}} />);
    fireEvent.click(screen.getByTestId('pilar-tab-que_hacer'));
    expect(screen.getByTestId('clima-regla-insignia')).toHaveTextContent(/PRECOZ/i);
  });

  it('con La Niña la regla apunta al manejo del exceso de agua', () => {
    setEnsoPhase('la_nina');
    render(<ClimaBoletinScreen onBack={() => {}} />);
    fireEvent.click(screen.getByTestId('pilar-tab-que_hacer'));
    expect(screen.getByTestId('clima-regla-insignia')).toHaveTextContent(/EXCESO de agua/i);
  });
});

describe('ClimaBoletinScreen — lectura regional (familia ENSO correcta)', () => {
  it('bajo El Niño y perfil andino muestra el impacto regional del Niño, no la vigilancia neutral', () => {
    setEnsoPhase('el_nino');
    render(<ClimaBoletinScreen onBack={() => {}} />);
    const linea = screen.getByTestId('clima-region-linea');
    // La línea andina.nino de ensoContext ("El Niño en los Andes trae menos lluvia...").
    expect(linea).toHaveTextContent(/El Niño en los Andes/i);
  });

  it('remite a la Mesa Técnica Agroclimática de la región del perfil', () => {
    render(<ClimaBoletinScreen onBack={() => {}} />);
    fireEvent.click(screen.getByTestId('pilar-tab-donde_mirar'));
    expect(screen.getByTestId('clima-mta-regional')).toHaveTextContent(/Andina/i);
  });
});

describe('ClimaBoletinScreen — Dónde mirar (remite, no reemplaza)', () => {
  it('lista los boletines IDEAM, la MTA y Fenalce', () => {
    render(<ClimaBoletinScreen onBack={() => {}} />);
    fireEvent.click(screen.getByTestId('pilar-tab-donde_mirar'));
    expect(screen.getByTestId('boletin-agrometeorologico')).toBeInTheDocument();
    expect(screen.getByTestId('boletin-agroclimatico')).toBeInTheDocument();
    expect(screen.getByTestId('boletin-enso')).toBeInTheDocument();
    expect(screen.getByTestId('clima-mta')).toBeInTheDocument();
    expect(screen.getByTestId('clima-fenalce')).toBeInTheDocument();
  });
});

describe('ClimaBoletinScreen — puente al agente', () => {
  it('navega al agente con la pregunta prellenada', () => {
    const onNavigate = vi.fn();
    render(<ClimaBoletinScreen onBack={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('pilar-tab-que_hacer'));
    fireEvent.click(screen.getByTestId('clima-preguntar-agente'));
    expect(onNavigate).toHaveBeenCalledWith('agente', expect.objectContaining({
      prefilledPrompt: expect.stringMatching(/sembrar|clima/i),
    }));
  });
});
