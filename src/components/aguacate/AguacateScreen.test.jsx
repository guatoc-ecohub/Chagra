/**
 * AguacateScreen — mundo "El aguacate" (photo-forward, 5 estaciones).
 *
 * Contrato cubierto:
 *   - Las 5 estaciones son navegables (variedad+siembra, suelo+agua, plagas,
 *     flor+polinización, cosecha) y cada una muestra su contenido groundeado.
 *   - Variedad y siembra: pisos térmicos + Hass marcado como tipo floral A +
 *     el injerto sobre patrón + densidad como "dato en camino".
 *   - Suelo y agua: el drenaje contra la pudrición + compatibles del grafo
 *     (maní forrajero) + el antagonista (eucalipto).
 *   - Plagas: la pudrición de raíz destacada + guard anti-receta química +
 *     biopreparados groundeados; enlaces a biopreparados y "mi mata enferma".
 *   - Flor: los dos tipos A/B + enlace al mundo de abejas.
 *   - Cosecha: el punto de corte + % materia seca como "dato en camino".
 *   - Puentes: onBack; agente con prompt de aguacate.
 *   - Créditos de fotos con atribución (cumplimiento CC).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import AguacateScreen from './AguacateScreen';
import { CREDITOS_FOTOS_AGUACATE, MALES_AGUACATE } from '../../data/aguacateFinca';

afterEach(() => cleanup());

const irAEstacion = (id) => fireEvent.click(screen.getByTestId(`estacion-tab-${id}`));

describe('AguacateScreen — navegación y portada', () => {
  it('arranca en variedad y siembra y muestra las 5 pestañas', () => {
    render(<AguacateScreen onBack={() => {}} onNavigate={() => {}} />);
    expect(screen.getByTestId('aguacate-screen')).toBeTruthy();
    expect(screen.getByTestId('estacion-siembra')).toBeTruthy();
    for (const id of ['siembra', 'suelo', 'sanidad', 'flor', 'cosecha']) {
      expect(screen.getByTestId(`estacion-tab-${id}`)).toBeTruthy();
    }
  });

  it('el botón volver llama onBack', () => {
    const onBack = vi.fn();
    render(<AguacateScreen onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onBack).toHaveBeenCalled();
  });
});

describe('AguacateScreen — variedad y siembra (piso térmico + injerto)', () => {
  it('muestra los pisos térmicos, marca Hass como tipo floral A y muestra el injerto', () => {
    render(<AguacateScreen onBack={() => {}} />);
    expect(screen.getByTestId('piso-alto')).toBeTruthy();
    expect(screen.getByTestId('piso-medio')).toBeTruthy();
    expect(screen.getByTestId('piso-calido')).toBeTruthy();
    // Hass = tipo floral A (dato firme)
    const hass = screen.getByTestId('variedad-hass');
    expect(hass.querySelector('[data-testid="tipo-floral-A"]')).toBeTruthy();
    // injerto sobre patrón
    expect(screen.getByTestId('aguacate-injerto')).toBeTruthy();
  });

  it('la densidad de siembra no se inventa: se marca como dato en camino', () => {
    render(<AguacateScreen onBack={() => {}} />);
    const siembra = screen.getByTestId('aguacate-siembra');
    expect(siembra.querySelector('[data-testid="slot-grounded-pendiente"]')).toBeTruthy();
  });
});

describe('AguacateScreen — suelo y agua (drenaje + asocio del grafo)', () => {
  it('muestra el drenaje, un compatible del grafo y el antagonista, con enlace al suelo', () => {
    const onNavigate = vi.fn();
    render(<AguacateScreen onBack={() => {}} onNavigate={onNavigate} />);
    irAEstacion('suelo');
    expect(screen.getByTestId('suelo-drenaje')).toBeTruthy();
    // compatible_with del grafo (maní forrajero) + antagonist_of (eucalipto)
    expect(screen.getByTestId('compatible-mani-forrajero')).toBeTruthy();
    expect(screen.getByTestId('aguacate-antagonista')).toBeTruthy();
    fireEvent.click(screen.getByTestId('aguacate-ir-suelo'));
    expect(onNavigate).toHaveBeenCalledWith('salud_suelo');
  });
});

describe('AguacateScreen — plagas (grafo) sin recetas químicas', () => {
  it('destaca la pudrición de raíz, muestra el guard anti-receta y enlaza sanidad', () => {
    const onNavigate = vi.fn();
    render(<AguacateScreen onBack={() => {}} onNavigate={onNavigate} />);
    irAEstacion('sanidad');
    expect(screen.getByTestId('mal-pudricion-raiz')).toBeTruthy();
    const nota = screen.getByTestId('aguacate-nota-sin-quimicos');
    expect(nota.textContent).toMatch(/no encontrará dosis de veneno/i);
    fireEvent.click(screen.getByTestId('aguacate-ir-biopreparados'));
    expect(onNavigate).toHaveBeenCalledWith('biopreparados', { back: 'dashboard' });
    fireEvent.click(screen.getByTestId('aguacate-ir-sanidad'));
    expect(onNavigate).toHaveBeenCalledWith('sanidad_sintoma');
  });

  it('toda plaga mostrada trae su trazo al grafo (plagaGrafo)', () => {
    for (const m of MALES_AGUACATE) {
      expect(typeof m.plagaGrafo === 'string' && m.plagaGrafo.length > 0).toBe(true);
      expect(Array.isArray(m.biocontrol) && m.biocontrol.length > 0).toBe(true);
    }
  });
});

describe('AguacateScreen — flor y polinización (tipo A/B + abejas)', () => {
  it('muestra los dos tipos florales y enlaza al mundo de abejas', () => {
    const onNavigate = vi.fn();
    render(<AguacateScreen onBack={() => {}} onNavigate={onNavigate} />);
    irAEstacion('flor');
    expect(screen.getByTestId('tipo-floral-card-A')).toBeTruthy();
    expect(screen.getByTestId('tipo-floral-card-B')).toBeTruthy();
    fireEvent.click(screen.getByTestId('aguacate-ir-abejas'));
    expect(onNavigate).toHaveBeenCalledWith('animales_abejas');
  });
});

describe('AguacateScreen — cosecha y poscosecha', () => {
  it('muestra el punto de corte y el % de materia seca como dato en camino', () => {
    render(<AguacateScreen onBack={() => {}} />);
    irAEstacion('cosecha');
    const punto = screen.getByTestId('aguacate-punto');
    expect(punto.textContent).toMatch(/materia seca/i);
    expect(punto.querySelector('[data-testid="slot-grounded-pendiente"]')).toBeTruthy();
    expect(screen.getByTestId('aguacate-corte')).toBeTruthy();
  });
});

describe('AguacateScreen — puente al agente y créditos de fotos', () => {
  it('el agente queda presente en el pie con prompt de aguacate', () => {
    const onNavigate = vi.fn();
    render(<AguacateScreen onBack={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('aguacate-preguntar-agente'));
    expect(onNavigate).toHaveBeenCalledWith('agente', expect.objectContaining({
      prefilledPrompt: expect.stringMatching(/aguacate/i),
    }));
  });

  it('las fotos traen atribución (cumplimiento CC): todas con autor, licencia y fuente', () => {
    expect(CREDITOS_FOTOS_AGUACATE.length).toBeGreaterThanOrEqual(4);
    for (const cr of CREDITOS_FOTOS_AGUACATE) {
      expect(cr.autor).toBeTruthy();
      expect(cr.licencia).toBeTruthy();
      expect(cr.fuenteUrl).toMatch(/^https?:\/\/([a-z0-9-]+\.)*wikimedia\.org\//);
    }
  });
});
