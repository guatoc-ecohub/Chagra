/**
 * CanaScreen — mundo "La caña y la panela" (photo-forward, 5 estaciones del
 * ciclo panelero). Cultura panelera colombiana.
 *
 * Contrato cubierto:
 *   - Las 5 estaciones son navegables (la caña, siembra y manejo, plagas, corte,
 *     la panela) y cada una muestra su contenido groundeado.
 *   - Variedades paneleras del catálogo (RD 75-11, CC 85-92…) con su aptitud, y
 *     la recomendación por zona marcada como "dato en camino" (no se inventa).
 *   - Plagas: barrenador (Diatraea) con control biológico Cotesia/Trichogramma
 *     (relaciones CONTROLS del grafo), carbón y roya; guard anti-receta química.
 *   - Corte: el punto de la caña y moler pronto.
 *   - La panela: el proceso en orden (trapiche→clarificación→…→moldeo) + las
 *     buenas prácticas SIN clarol/hidrosulfito (INVIMA) + bagazo hacia el compost.
 *   - Puentes: onBack; enlaces a salud_suelo, defensores, sanidad, compost, agente.
 *   - Créditos de fotos con atribución (cumplimiento CC).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import CanaScreen from './CanaScreen';
import { CREDITOS_FOTOS_CANA } from '../../data/canaFinca';

afterEach(() => cleanup());

const irAEstacion = (id) => fireEvent.click(screen.getByTestId(`estacion-tab-${id}`));

describe('CanaScreen — navegación y portada', () => {
  it('arranca en la estación de la caña y muestra las 5 pestañas', () => {
    render(<CanaScreen onBack={() => {}} onNavigate={() => {}} />);
    expect(screen.getByTestId('cana-screen')).toBeTruthy();
    expect(screen.getByTestId('estacion-cana')).toBeTruthy();
    for (const id of ['cana', 'siembra', 'males', 'corte', 'panela']) {
      expect(screen.getByTestId(`estacion-tab-${id}`)).toBeTruthy();
    }
  });

  it('el botón volver llama onBack', () => {
    const onBack = vi.fn();
    render(<CanaScreen onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onBack).toHaveBeenCalled();
  });
});

describe('CanaScreen — variedades paneleras (grounded Cenicaña/AGROSAVIA)', () => {
  it('muestra variedades del catálogo y no inventa la recomendación por zona', () => {
    render(<CanaScreen onBack={() => {}} />);
    const varsec = screen.getByTestId('cana-variedades');
    expect(varsec.querySelector('[data-testid="variedad-rd75-11"]')).toBeTruthy();
    expect(varsec.querySelector('[data-testid="variedad-cc85-92"]')).toBeTruthy();
    // La recomendación por zona NO se inventa: chip "dato en camino".
    expect(varsec.querySelector('[data-testid="slot-grounded-pendiente"]')).toBeTruthy();
  });
});

describe('CanaScreen — siembra por estaca en ladera', () => {
  it('explica la estaca/esqueje y enlaza al cuaderno del suelo', () => {
    const onNavigate = vi.fn();
    render(<CanaScreen onBack={() => {}} onNavigate={onNavigate} />);
    irAEstacion('siembra');
    expect(screen.getByTestId('siembra-semilla')).toBeTruthy();
    // la distancia de siembra no se inventa
    expect(screen.getByTestId('estacion-siembra').querySelector('[data-testid="slot-grounded-pendiente"]')).toBeTruthy();
    fireEvent.click(screen.getByTestId('cana-ir-suelo'));
    expect(onNavigate).toHaveBeenCalledWith('salud_suelo');
  });
});

describe('CanaScreen — plagas: barrenador con control biológico (grafo)', () => {
  it('muestra el barrenador (Diatraea) con Cotesia y Trichogramma y el guard anti-receta', () => {
    render(<CanaScreen onBack={() => {}} />);
    irAEstacion('males');
    expect(screen.getByTestId('mal-barrenador')).toBeTruthy();
    expect(screen.getAllByText(/Diatraea/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cotesia flavipes/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Trichogramma/i).length).toBeGreaterThan(0);
    // carbón y roya también presentes
    expect(screen.getByTestId('mal-carbon')).toBeTruthy();
    expect(screen.getByTestId('mal-roya')).toBeTruthy();
    // Guard: nada de dosis de veneno.
    const nota = screen.getByTestId('cana-nota-sin-recetas');
    expect(nota.textContent).toMatch(/no encontrará dosis de veneno/i);
  });

  it('enlaza a defensores y a "mi mata está enferma"', () => {
    const onNavigate = vi.fn();
    render(<CanaScreen onBack={() => {}} onNavigate={onNavigate} />);
    irAEstacion('males');
    fireEvent.click(screen.getByTestId('cana-ir-defensores'));
    expect(onNavigate).toHaveBeenCalledWith('defensores');
    fireEvent.click(screen.getByTestId('cana-ir-sanidad'));
    expect(onNavigate).toHaveBeenCalledWith('sanidad_sintoma');
  });
});

describe('CanaScreen — corte', () => {
  it('muestra el punto de la caña y el aviso de moler pronto', () => {
    render(<CanaScreen onBack={() => {}} />);
    irAEstacion('corte');
    expect(screen.getByTestId('cana-corte-datos')).toBeTruthy();
    expect(screen.getByTestId('corte-corte')).toBeTruthy();
  });
});

describe('CanaScreen — la panela: proceso, inocuidad y cierre de ciclo', () => {
  it('muestra el proceso en orden y las buenas prácticas SIN clarol (INVIMA)', () => {
    render(<CanaScreen onBack={() => {}} />);
    irAEstacion('panela');
    for (const id of ['molienda', 'clarificacion', 'evaporacion', 'punteo', 'moldeo']) {
      expect(screen.getByTestId(`panela-${id}`)).toBeTruthy();
    }
    // La clarificación cita balso/cadillo (aglutinantes naturales)
    expect(screen.getByTestId('panela-clarificacion').textContent).toMatch(/balso|cadillo/i);
    // Inocuidad: panela sin clarol/hidrosulfito
    const bpm = screen.getByTestId('cana-bpm');
    expect(bpm.textContent).toMatch(/clarol|hidrosulfito/i);
  });

  it('el bagazo cierra ciclo hacia el mundo del compost y cita las fuentes', () => {
    const onNavigate = vi.fn();
    render(<CanaScreen onBack={() => {}} onNavigate={onNavigate} />);
    irAEstacion('panela');
    // la temperatura de punteo se atribuye (rango de referencia), no receta exacta
    expect(screen.getByTestId('cana-panela-fuente').textContent).toMatch(/AGROSAVIA|FEDEPANELA/i);
    fireEvent.click(screen.getByTestId('cana-ir-compost'));
    expect(onNavigate).toHaveBeenCalledWith('compost');
  });
});

describe('CanaScreen — puente al agente y créditos de fotos', () => {
  it('el agente queda presente en el pie con prompt de caña/panela', () => {
    const onNavigate = vi.fn();
    render(<CanaScreen onBack={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('cana-preguntar-agente'));
    expect(onNavigate).toHaveBeenCalledWith('agente', expect.objectContaining({
      prefilledPrompt: expect.stringMatching(/barrenador|panela/i),
    }));
  });

  it('las fotos traen atribución (cumplimiento CC): todas con autor, licencia y fuente', () => {
    expect(CREDITOS_FOTOS_CANA.length).toBeGreaterThanOrEqual(6);
    for (const cr of CREDITOS_FOTOS_CANA) {
      expect(cr.autor).toBeTruthy();
      expect(cr.licencia).toBeTruthy();
      expect(cr.fuenteUrl).toMatch(/^https?:\/\/([a-z0-9-]+\.)*wikimedia\.org\//);
    }
  });
});
