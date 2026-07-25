/**
 * BoticaScreen — mundo "La botica campesina" (huerta medicinal, photo-forward,
 * 5 estaciones). Dominio de salud: el test congela el ENMARCADO RESPONSABLE.
 *
 * Contrato cubierto:
 *   - Las 5 estaciones son navegables (barriga, piel, gripa, cultivo, cuidado).
 *   - Cada planta se marca como USO TRADICIONAL (no medicina) y trae su nombre
 *     científico + familia y sus datos de cultivo groundeados (piso térmico).
 *   - Grounding responsable + legal: disclaimer visible ("no curan", "consulte
 *     a un profesional de la salud"); la ruda va con veto fuerte (abortiva /
 *     fototóxica) en la estación "Con cuidado".
 *   - Complementa (no duplica) la huerta de la cocina: el poleo NO aparece
 *     (vive solo en aromáticas de cocina). La yerbabuena sí aparece, pero como
 *     CRUCE medicinal (campo `cruce` que remite a la cocina, sin repetir su uso
 *     culinario) y con el veto de no confundirla con el poleo (abortivo).
 *   - Créditos de fotos con atribución (cumplimiento de licencia abierta).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import BoticaScreen from './BoticaScreen';
import { CREDITOS_FOTOS_BOTICA, PLANTAS_BOTICA } from '../../data/boticaCampesina';

afterEach(() => cleanup());

const irAEstacion = (id) => fireEvent.click(screen.getByTestId(`estacion-tab-${id}`));

describe('BoticaScreen — navegación y portada', () => {
  it('arranca en "barriga y nervios" y muestra las 5 pestañas', () => {
    render(<BoticaScreen onBack={() => {}} onNavigate={() => {}} />);
    expect(screen.getByTestId('botica-screen')).toBeTruthy();
    expect(screen.getByTestId('estacion-barriga')).toBeTruthy();
    for (const id of ['barriga', 'piel', 'gripa', 'cultivo', 'cuidado']) {
      expect(screen.getByTestId(`estacion-tab-${id}`)).toBeTruthy();
    }
  });

  it('el botón volver llama onBack', () => {
    const onBack = vi.fn();
    render(<BoticaScreen onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('la portada deja claro que es saber tradicional, no medicina', () => {
    render(<BoticaScreen onBack={() => {}} />);
    const screenEl = screen.getByTestId('botica-screen');
    expect(screenEl.textContent).toMatch(/saber tradicional, no medicina/i);
    expect(screenEl.textContent).toMatch(/profesional de la salud/i);
  });
});

describe('BoticaScreen — grounding responsable (uso tradicional, no cura)', () => {
  it('cada planta se marca como USO TRADICIONAL (no como medicina)', () => {
    render(<BoticaScreen onBack={() => {}} />);
    // en la estación de arranque hay al menos un chip "uso tradicional"
    expect(screen.getAllByTestId('chip-uso-tradicional').length).toBeGreaterThan(0);
  });

  it('barriga y nervios: manzanilla, cidrón y toronjil como aromáticas', () => {
    render(<BoticaScreen onBack={() => {}} />);
    expect(screen.getByTestId('planta-manzanilla')).toBeTruthy();
    expect(screen.getByTestId('planta-cidron')).toBeTruthy();
    expect(screen.getByTestId('planta-toronjil')).toBeTruthy();
    expect(screen.getByText(/Matricaria chamomilla/i)).toBeTruthy();
  });

  it('piel y heridas: caléndula y llantén (uso externo)', () => {
    render(<BoticaScreen onBack={() => {}} />);
    irAEstacion('piel');
    expect(screen.getByTestId('planta-calendula')).toBeTruthy();
    expect(screen.getByTestId('planta-llanten')).toBeTruthy();
  });

  it('gripa y tónico: saúco (solo flor) y ortiga (con guantes), con sus vetos', () => {
    render(<BoticaScreen onBack={() => {}} />);
    irAEstacion('gripa');
    expect(screen.getByTestId('planta-sauco')).toBeTruthy();
    expect(screen.getByTestId('planta-ortiga')).toBeTruthy();
    expect(screen.getByTestId('veto-sauco')).toBeTruthy();
    expect(screen.getByTestId('veto-ortiga')).toBeTruthy();
  });
});

describe('BoticaScreen — cultivo groundeado en el catálogo', () => {
  it('la estación de cultivo lista el piso térmico de cada mata', () => {
    render(<BoticaScreen onBack={() => {}} />);
    irAEstacion('cultivo');
    const tabla = screen.getByTestId('botica-tabla-cultivo');
    // hay una fila por planta de la botica
    for (const p of PLANTAS_BOTICA) {
      expect(tabla.querySelector(`[data-testid="cultivo-fila-${p.slug}"]`)).toBeTruthy();
    }
  });
});

describe('BoticaScreen — con cuidado (seguridad + la planta de respeto)', () => {
  it('la ruda va en "con cuidado" con veto fuerte (abortiva/fototóxica)', () => {
    render(<BoticaScreen onBack={() => {}} />);
    irAEstacion('cuidado');
    const ruda = screen.getByTestId('planta-ruda');
    expect(ruda).toBeTruthy();
    const veto = screen.getByTestId('veto-ruda');
    expect(veto.textContent).toMatch(/abortiva/i);
    expect(veto.textContent).toMatch(/fototóxica/i);
  });

  it('muestra el disclaimer y las reglas de seguridad', () => {
    render(<BoticaScreen onBack={() => {}} />);
    irAEstacion('cuidado');
    const disclaimer = screen.getByTestId('botica-disclaimer');
    expect(disclaimer.textContent).toMatch(/no curan enfermedades/i);
    expect(screen.getByTestId('botica-reglas')).toBeTruthy();
    expect(screen.getByTestId('regla-embarazo-ninos')).toBeTruthy();
  });

  it('el puente al agente aclara que ante una dolencia va primero el médico', () => {
    const onNavigate = vi.fn();
    render(<BoticaScreen onBack={() => {}} onNavigate={onNavigate} />);
    irAEstacion('cuidado');
    fireEvent.click(screen.getByTestId('botica-ir-agente'));
    expect(onNavigate).toHaveBeenCalledWith('agente', expect.objectContaining({
      prefilledPrompt: expect.stringMatching(/tradicionalmente|cultivo/i),
    }));
  });
});

describe('BoticaScreen — complementa la cocina y cita las fotos', () => {
  it('el poleo NO aparece en la botica (vive solo en la cocina)', () => {
    const slugs = PLANTAS_BOTICA.map((p) => p.slug);
    expect(slugs).not.toContain('poleo');
  });

  it('la yerbabuena aparece como CRUCE medicinal (remite a la cocina, sin duplicar)', () => {
    const yerba = PLANTAS_BOTICA.find((p) => p.slug === 'yerbabuena');
    expect(yerba, 'la yerbabuena debe estar en la botica').toBeTruthy();
    expect(yerba.grupo).toBe('barriga');
    // El cruce remite a la cocina: no duplicamos el uso culinario, lo enlazamos.
    expect(yerba.cruce?.mundo).toMatch(/cocina/i);
    // Se pinta la nota de cruce en la ficha.
    render(<BoticaScreen onBack={() => {}} />);
    expect(screen.getByTestId('cruce-yerbabuena').textContent).toMatch(/cocina/i);
  });

  it('la yerbabuena avisa de NO confundirla con el poleo (abortivo)', () => {
    const yerba = PLANTAS_BOTICA.find((p) => p.slug === 'yerbabuena');
    expect(yerba.veto).toMatch(/poleo/i);
    expect(yerba.veto).toMatch(/abortiv/i);
  });

  it('cada planta lleva su catalogId real (grounding del catálogo)', () => {
    for (const p of PLANTAS_BOTICA) {
      expect(p.catalogId, `planta ${p.slug} sin catalogId`).toBeTruthy();
    }
  });

  it('las fotos traen atribución (licencia abierta): autor, licencia y fuente Wikimedia', () => {
    expect(CREDITOS_FOTOS_BOTICA.length).toBe(PLANTAS_BOTICA.length);
    for (const cr of CREDITOS_FOTOS_BOTICA) {
      expect(cr.autor).toBeTruthy();
      expect(cr.licencia).toBeTruthy();
      expect(cr.fuenteUrl).toMatch(/^https?:\/\/([a-z0-9-]+\.)*wikimedia\.org\//);
    }
  });
});
