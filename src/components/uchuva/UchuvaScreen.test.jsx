/**
 * UchuvaScreen — mundo "La uchuva" (Physalis peruviana, photo-forward, 6
 * estaciones del ciclo).
 *
 * Contrato cubierto:
 *   - Las 6 estaciones son navegables (clima, siembra, tutorado, males,
 *     cosecha, poscosecha) y cada una muestra su contenido groundeado.
 *   - Clima: piso térmico FRÍO (1.800–2.800 msnm) + contraste didáctico con
 *     mango/cítricos (tierra caliente).
 *   - Siembra: la distancia NO se inventa (dato en camino / SlotPendiente).
 *   - Males: 4 males con nombre científico (pulgón, polilla, minador,
 *     Fusarium) + guard anti-receta química (sin dosis de veneno) + nota de
 *     trazabilidad de la etiqueta del grafo para el Fusarium.
 *   - Cosecha: rendimiento groundeado + el grado de color por destino = dato
 *     en camino.
 *   - Poscosecha: enlace al mundo de poscosecha.
 *   - Puentes: onBack; enlaces a biopreparados, sanidad_sintoma, poscosecha, agente.
 *   - Créditos de fotos con atribución (cumplimiento CC).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import UchuvaScreen from './UchuvaScreen';
import { CREDITOS_FOTOS_UCHUVA } from '../../data/uchuvaFinca';

afterEach(() => cleanup());

const irAEstacion = (id) => fireEvent.click(screen.getByTestId(`estacion-tab-${id}`));

describe('UchuvaScreen — navegación y portada', () => {
  it('arranca en la estación de clima y muestra las 6 pestañas', () => {
    render(<UchuvaScreen onBack={() => {}} onNavigate={() => {}} />);
    expect(screen.getByTestId('uchuva-screen')).toBeTruthy();
    expect(screen.getByTestId('estacion-clima')).toBeTruthy();
    for (const id of ['clima', 'siembra', 'tutorado', 'males', 'cosecha', 'poscosecha']) {
      expect(screen.getByTestId(`estacion-tab-${id}`)).toBeTruthy();
    }
  });

  it('el botón volver llama onBack', () => {
    const onBack = vi.fn();
    render(<UchuvaScreen onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onBack).toHaveBeenCalled();
  });
});

describe('UchuvaScreen — clima frío de altura (grounded AGROSAVIA/POWO)', () => {
  it('muestra el piso térmico frío y el contraste con mango/cítricos', () => {
    render(<UchuvaScreen onBack={() => {}} />);
    const clima = screen.getByTestId('estacion-clima');
    expect(within(clima).getByTestId('uchuva-clima-datos')).toBeTruthy();
    expect(clima.textContent).toMatch(/1\.800.*2\.800/);
    const contraste = within(clima).getByTestId('uchuva-contraste');
    expect(contraste.textContent.toLowerCase()).toContain('mango');
  });
});

describe('UchuvaScreen — siembra y tutorado', () => {
  it('la distancia de siembra no se inventa: se marca como dato en camino', () => {
    render(<UchuvaScreen onBack={() => {}} />);
    irAEstacion('siembra');
    const siembra = screen.getByTestId('estacion-siembra');
    expect(siembra.querySelector('[data-testid="slot-grounded-pendiente"]')).toBeTruthy();
  });

  it('el tutorado tiene sistemas (en V, espaldera, colgado)', () => {
    render(<UchuvaScreen onBack={() => {}} />);
    irAEstacion('tutorado');
    const sistemas = screen.getByTestId('uchuva-sistemas-tutorado');
    for (const id of ['en-v', 'espaldera', 'colgado']) {
      expect(sistemas.querySelector(`[data-testid="tutorado-${id}"]`)).toBeTruthy();
    }
  });
});

describe('UchuvaScreen — plagas y males (grounded grafo + AGROSAVIA)', () => {
  it('muestra los 4 males con nombre científico y guard anti-receta', () => {
    render(<UchuvaScreen onBack={() => {}} />);
    irAEstacion('males');
    for (const id of ['pulgon', 'polilla', 'minador', 'fusarium']) {
      expect(screen.getByTestId(`mal-${id}`)).toBeTruthy();
    }
    // guard: no hay dosis de veneno inventadas
    expect(screen.getByTestId('uchuva-nota-sin-recetas')).toBeTruthy();
    // trazabilidad de la etiqueta del grafo para el Fusarium
    expect(screen.getByTestId('uchuva-nota-fusarium')).toBeTruthy();
  });

  it('el Fusarium se nombra como marchitez vascular (no "Mal de Panamá") en el copy', () => {
    render(<UchuvaScreen onBack={() => {}} />);
    irAEstacion('males');
    const fus = screen.getByTestId('mal-fusarium');
    expect(fus.textContent.toLowerCase()).toContain('marchitez');
    expect(fus.textContent).toContain('Fusarium oxysporum');
  });

  it('los puentes de sanidad navegan (biopreparados, sanidad)', () => {
    const onNavigate = vi.fn();
    render(<UchuvaScreen onBack={() => {}} onNavigate={onNavigate} />);
    irAEstacion('males');
    fireEvent.click(screen.getByTestId('uchuva-ir-biopreparados'));
    expect(onNavigate).toHaveBeenCalledWith('biopreparados', { back: 'dashboard' });
    fireEvent.click(screen.getByTestId('uchuva-ir-sanidad'));
    expect(onNavigate).toHaveBeenCalledWith('sanidad_sintoma');
  });
});

describe('UchuvaScreen — cosecha y poscosecha', () => {
  it('la cosecha muestra rendimiento y el grado de color por destino = dato en camino', () => {
    render(<UchuvaScreen onBack={() => {}} />);
    irAEstacion('cosecha');
    const cosecha = screen.getByTestId('estacion-cosecha');
    expect(cosecha.textContent).toMatch(/18.*25\s*t\/ha/);
    const punto = within(cosecha).getByTestId('uchuva-punto-color');
    expect(punto.querySelector('[data-testid="slot-grounded-pendiente"]')).toBeTruthy();
  });

  it('la poscosecha enlaza al mundo de poscosecha', () => {
    const onNavigate = vi.fn();
    render(<UchuvaScreen onBack={() => {}} onNavigate={onNavigate} />);
    irAEstacion('poscosecha');
    fireEvent.click(screen.getByTestId('uchuva-ir-poscosecha'));
    expect(onNavigate).toHaveBeenCalledWith('poscosecha');
  });
});

describe('UchuvaScreen — puente al agente y créditos', () => {
  it('el CTA del agente pasa un prompt precargado', () => {
    const onNavigate = vi.fn();
    render(<UchuvaScreen onBack={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('uchuva-preguntar-agente'));
    expect(onNavigate).toHaveBeenCalledWith('agente', expect.objectContaining({
      prefilledPrompt: expect.stringContaining('uchuva'),
    }));
  });

  it('cada crédito de foto tiene autor, licencia y URL de Wikimedia', () => {
    expect(CREDITOS_FOTOS_UCHUVA.length).toBeGreaterThan(0);
    for (const cr of CREDITOS_FOTOS_UCHUVA) {
      expect(cr.autor).toBeTruthy();
      expect(cr.licencia).toBeTruthy();
      expect(cr.fuenteUrl).toMatch(/commons\.wikimedia\.org/);
    }
  });
});
