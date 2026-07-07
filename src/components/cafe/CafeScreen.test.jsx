/**
 * CafeScreen — mundo "El café" (photo-forward, 5 estaciones del ciclo cafetero).
 *
 * Contrato cubierto:
 *   - Las 5 estaciones son navegables (variedad+siembra, sombra, broca+roya,
 *     cosecha, beneficio) y cada una muestra su contenido groundeado.
 *   - Variedades: Castillo/Colombia/Cenicafé 1 = resistentes a roya; Típica y
 *     Caturra = susceptibles (el dato que más pesa al escoger).
 *   - Broca y roya: nombres científicos + manejo agroecológico + guard
 *     anti-receta química (no hay dosis de veneno inventadas).
 *   - Cosecha: ciclo bimodal groundeado del grafo + recolección selectiva.
 *   - Beneficio: los 4 pasos en orden + la pulpa que cierra ciclo hacia el
 *     mundo del compost/estiércol.
 *   - Puentes: onBack; enlaces a salud_suelo, biopreparados, estiercol, agente.
 *   - Créditos de fotos con atribución (cumplimiento CC).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import CafeScreen from './CafeScreen';
import { CREDITOS_FOTOS_CAFE } from '../../data/cafeFinca';

afterEach(() => cleanup());

const irAEstacion = (id) => fireEvent.click(screen.getByTestId(`estacion-tab-${id}`));

describe('CafeScreen — navegación y portada', () => {
  it('arranca en la estación de variedad y siembra y muestra las 5 pestañas', () => {
    render(<CafeScreen onBack={() => {}} onNavigate={() => {}} />);
    expect(screen.getByTestId('cafe-screen')).toBeTruthy();
    expect(screen.getByTestId('estacion-siembra')).toBeTruthy();
    for (const id of ['siembra', 'sombra', 'males', 'cosecha', 'beneficio']) {
      expect(screen.getByTestId(`estacion-tab-${id}`)).toBeTruthy();
    }
  });

  it('el botón volver llama onBack', () => {
    const onBack = vi.fn();
    render(<CafeScreen onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onBack).toHaveBeenCalled();
  });
});

describe('CafeScreen — variedades y la roya (grounded Cenicafé)', () => {
  it('marca Castillo/Colombia/Cenicafé 1 como resistentes y Típica/Caturra como susceptibles', () => {
    render(<CafeScreen onBack={() => {}} />);
    // resistentes
    for (const id of ['colombia', 'castillo', 'cenicafe1']) {
      const card = screen.getByTestId(`variedad-${id}`);
      expect(card.querySelector('[data-testid="roya-resistente"]')).toBeTruthy();
    }
    // susceptibles
    for (const id of ['tipica', 'caturra']) {
      const card = screen.getByTestId(`variedad-${id}`);
      expect(card.querySelector('[data-testid="roya-susceptible"]')).toBeTruthy();
    }
  });

  it('la densidad de siembra no se inventa: se marca como dato en camino', () => {
    render(<CafeScreen onBack={() => {}} />);
    const siembra = screen.getByTestId('estacion-siembra');
    expect(siembra.querySelector('[data-testid="slot-grounded-pendiente"]')).toBeTruthy();
  });
});

describe('CafeScreen — sombra y suelo', () => {
  it('muestra la sombra/asociación del grafo (guamo, plátano) con enlace al cuaderno del suelo', () => {
    const onNavigate = vi.fn();
    render(<CafeScreen onBack={() => {}} onNavigate={onNavigate} />);
    irAEstacion('sombra');
    expect(screen.getByTestId('sombra-guamo')).toBeTruthy();
    expect(screen.getByTestId('sombra-platano')).toBeTruthy();
    fireEvent.click(screen.getByTestId('cafe-ir-suelo'));
    expect(onNavigate).toHaveBeenCalledWith('salud_suelo');
  });
});

describe('CafeScreen — broca y roya (reconocer + MIP, sin recetas químicas)', () => {
  it('muestra broca (Hypothenemus) y roya (Hemileia) con su manejo y el guard anti-receta', () => {
    render(<CafeScreen onBack={() => {}} />);
    irAEstacion('males');
    expect(screen.getByTestId('mal-broca')).toBeTruthy();
    expect(screen.getByTestId('mal-roya')).toBeTruthy();
    expect(screen.getByText(/Hypothenemus hampei/i)).toBeTruthy();
    expect(screen.getByText(/Hemileia vastatrix/i)).toBeTruthy();
    // Guard: nada de dosis de veneno.
    const nota = screen.getByTestId('cafe-nota-sin-recetas');
    expect(nota.textContent).toMatch(/no encontrará dosis de veneno/i);
  });

  it('enlaza a biopreparados y a "mi mata está enferma"', () => {
    const onNavigate = vi.fn();
    render(<CafeScreen onBack={() => {}} onNavigate={onNavigate} />);
    irAEstacion('males');
    fireEvent.click(screen.getByTestId('cafe-ir-biopreparados'));
    expect(onNavigate).toHaveBeenCalledWith('biopreparados', { back: 'dashboard' });
    fireEvent.click(screen.getByTestId('cafe-ir-sanidad'));
    expect(onNavigate).toHaveBeenCalledWith('sanidad_sintoma');
  });
});

describe('CafeScreen — flor y cosecha (ciclo bimodal del grafo)', () => {
  it('muestra los dos picos de cosecha y la recolección selectiva', () => {
    render(<CafeScreen onBack={() => {}} />);
    irAEstacion('cosecha');
    const datos = screen.getByTestId('cafe-ciclo-datos');
    expect(datos.textContent).toMatch(/abril–junio y septiembre–diciembre/i);
    expect(screen.getByTestId('cafe-recoleccion')).toBeTruthy();
  });
});

describe('CafeScreen — beneficio y cierre de ciclo', () => {
  it('muestra los 4 pasos del beneficio en orden y enlaza la pulpa al mundo del compost', () => {
    const onNavigate = vi.fn();
    render(<CafeScreen onBack={() => {}} onNavigate={onNavigate} />);
    irAEstacion('beneficio');
    for (const id of ['despulpado', 'fermentacion', 'lavado', 'secado']) {
      expect(screen.getByTestId(`beneficio-${id}`)).toBeTruthy();
    }
    // la pulpa cierra ciclo hacia el mundo estiércol/compost
    fireEvent.click(screen.getByTestId('cafe-ir-compost'));
    expect(onNavigate).toHaveBeenCalledWith('estiercol');
  });

  it('los rangos del beneficio se atribuyen a Cenicafé (no se presentan como receta exacta)', () => {
    render(<CafeScreen onBack={() => {}} />);
    irAEstacion('beneficio');
    const fuente = screen.getByTestId('cafe-beneficio-fuente');
    expect(fuente.textContent).toMatch(/Cenicafé/i);
  });
});

describe('CafeScreen — puente al agente y créditos de fotos', () => {
  it('el agente queda presente en el pie con prompt de café', () => {
    const onNavigate = vi.fn();
    render(<CafeScreen onBack={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('cafe-preguntar-agente'));
    expect(onNavigate).toHaveBeenCalledWith('agente', expect.objectContaining({
      prefilledPrompt: expect.stringMatching(/roya y la broca/i),
    }));
  });

  it('las fotos traen atribución (cumplimiento CC): todas con autor, licencia y fuente', () => {
    expect(CREDITOS_FOTOS_CAFE.length).toBeGreaterThanOrEqual(6);
    for (const cr of CREDITOS_FOTOS_CAFE) {
      expect(cr.autor).toBeTruthy();
      expect(cr.licencia).toBeTruthy();
      expect(cr.fuenteUrl).toMatch(/^https?:\/\/([a-z0-9-]+\.)*wikimedia\.org\//);
    }
  });
});
