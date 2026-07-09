/**
 * MangoScreen — mundo "El mango" (photo-forward, 5 estaciones del ciclo).
 *
 * Contrato cubierto:
 *   - Las 5 estaciones son navegables (siembra, clima, flor, males, cosecha).
 *   - Variedades: finas (Tommy/Keitt/Kent/azúcar) = injerto; hilacha = de pepa.
 *   - Piso térmico HONESTO: cálido (0–1200) sí; >1800 msnm NO va (grounding).
 *   - Densidad de siembra no inventada: dato en camino.
 *   - Floración/cuaje: la seca dispara la flor; ciclo estacional del grafo.
 *   - Plagas: antracnosis (Colletotrichum) y mosca (Anastrepha) con manejo sin
 *     veneno + guard anti-receta química; otros males del grafo.
 *   - Cosecha: en sazón + transformar → enlace a poscosecha.
 *   - Puentes: onBack; enlaces a clima_boletin, biopreparados, sanidad, agente.
 *   - Créditos de fotos con atribución (cumplimiento CC).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import MangoScreen from './MangoScreen';
import { CREDITOS_FOTOS_MANGO } from '../../data/mangoFinca';

afterEach(() => cleanup());

const irAEstacion = (id) => fireEvent.click(screen.getByTestId(`estacion-tab-${id}`));

describe('MangoScreen — navegación y portada', () => {
  it('arranca en variedad y siembra y muestra las 5 pestañas', () => {
    render(<MangoScreen onBack={() => {}} onNavigate={() => {}} />);
    expect(screen.getByTestId('mango-screen')).toBeTruthy();
    expect(screen.getByTestId('estacion-siembra')).toBeTruthy();
    for (const id of ['siembra', 'clima', 'flor', 'males', 'cosecha']) {
      expect(screen.getByTestId(`estacion-tab-${id}`)).toBeTruthy();
    }
  });

  it('el botón volver llama onBack', () => {
    const onBack = vi.fn();
    render(<MangoScreen onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onBack).toHaveBeenCalled();
  });
});

describe('MangoScreen — variedad y siembra', () => {
  it('marca las finas como injerto y la hilacha como de pepa', () => {
    render(<MangoScreen onBack={() => {}} />);
    for (const id of ['tommy', 'keitt', 'kent', 'azucar']) {
      const card = screen.getByTestId(`variedad-${id}`);
      expect(card.querySelector('[data-testid="tipo-injerto"]')).toBeTruthy();
    }
    const hilacha = screen.getByTestId('variedad-hilacha');
    expect(hilacha.querySelector('[data-testid="tipo-pepa"]')).toBeTruthy();
  });

  it('la densidad de siembra no se inventa: se marca como dato en camino', () => {
    render(<MangoScreen onBack={() => {}} />);
    const siembra = screen.getByTestId('estacion-siembra');
    expect(siembra.querySelector('[data-testid="slot-grounded-pendiente"]')).toBeTruthy();
  });
});

describe('MangoScreen — piso térmico honesto (grounding)', () => {
  it('dice que en tierra cálida sí y por encima de ~1800 msnm NO va', () => {
    const onNavigate = vi.fn();
    render(<MangoScreen onBack={() => {}} onNavigate={onNavigate} />);
    irAEstacion('clima');
    const piso = screen.getByTestId('mango-piso-termico');
    expect(piso).toBeTruthy();
    expect(screen.getByTestId('piso-calido')).toBeTruthy();
    const frio = screen.getByTestId('piso-frio');
    expect(frio.textContent).toMatch(/no va|no produce/i);
    expect(frio.textContent).toMatch(/1800/);
    // enlace al clima que viene (la seca dispara la flor)
    fireEvent.click(screen.getByTestId('mango-ir-clima'));
    expect(onNavigate).toHaveBeenCalledWith('clima_boletin');
  });

  it('muestra las buenas vecinas del grafo (mismo piso térmico)', () => {
    render(<MangoScreen onBack={() => {}} />);
    irAEstacion('clima');
    expect(screen.getByTestId('vecina-caimito')).toBeTruthy();
    expect(screen.getByTestId('vecina-hobo')).toBeTruthy();
  });
});

describe('MangoScreen — floración y cuaje (ciclo estacional del grafo)', () => {
  it('muestra la floración de la seca y el cuaje', () => {
    render(<MangoScreen onBack={() => {}} />);
    irAEstacion('flor');
    const datos = screen.getByTestId('mango-ciclo-datos');
    expect(datos.textContent).toMatch(/agosto–octubre/i);
    expect(screen.getByTestId('ciclo-cuaje')).toBeTruthy();
  });
});

describe('MangoScreen — plagas y males (sin recetas químicas)', () => {
  it('muestra antracnosis (Colletotrichum) y mosca (Anastrepha) con guard anti-receta', () => {
    render(<MangoScreen onBack={() => {}} />);
    irAEstacion('males');
    expect(screen.getByTestId('mal-antracnosis')).toBeTruthy();
    expect(screen.getByTestId('mal-mosca')).toBeTruthy();
    expect(screen.getByText(/Colletotrichum/i)).toBeTruthy();
    expect(screen.getByText(/Anastrepha/i)).toBeTruthy();
    const nota = screen.getByTestId('mango-nota-sin-quimicos');
    expect(nota.textContent).toMatch(/no encontrará dosis de veneno/i);
  });

  it('enlaza a biopreparados y a "mi mata está enferma"', () => {
    const onNavigate = vi.fn();
    render(<MangoScreen onBack={() => {}} onNavigate={onNavigate} />);
    irAEstacion('males');
    fireEvent.click(screen.getByTestId('mango-ir-biopreparados'));
    expect(onNavigate).toHaveBeenCalledWith('biopreparados', { back: 'dashboard' });
    fireEvent.click(screen.getByTestId('mango-ir-sanidad'));
    expect(onNavigate).toHaveBeenCalledWith('sanidad_sintoma');
  });
});

describe('MangoScreen — cosecha y despensa', () => {
  it('coge en sazón y enlaza a poscosecha para transformar', () => {
    const onNavigate = vi.fn();
    render(<MangoScreen onBack={() => {}} onNavigate={onNavigate} />);
    irAEstacion('cosecha');
    expect(screen.getByTestId('mango-transformar')).toBeTruthy();
    fireEvent.click(screen.getByTestId('mango-ir-poscosecha'));
    expect(onNavigate).toHaveBeenCalledWith('poscosecha');
  });
});

describe('MangoScreen — puente al agente y créditos de fotos', () => {
  it('el agente queda presente en el pie con prompt de mango', () => {
    const onNavigate = vi.fn();
    render(<MangoScreen onBack={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('mango-preguntar-agente'));
    expect(onNavigate).toHaveBeenCalledWith('agente', expect.objectContaining({
      prefilledPrompt: expect.stringMatching(/antracnosis y mosca/i),
    }));
  });

  it('las fotos traen atribución (cumplimiento CC): todas con autor, licencia y fuente', () => {
    expect(CREDITOS_FOTOS_MANGO.length).toBeGreaterThanOrEqual(5);
    for (const cr of CREDITOS_FOTOS_MANGO) {
      expect(cr.autor).toBeTruthy();
      expect(cr.licencia).toBeTruthy();
      expect(cr.fuenteUrl).toMatch(/^https?:\/\/([a-z0-9-]+\.)*wikimedia\.org\//);
    }
  });
});
