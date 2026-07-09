/**
 * FrutalesScreen — mundo "Frutales de la finca con vida" (photo-forward).
 *
 * Contrato cubierto:
 *   - El selector muestra los frutales de la finca campesina (cítricos,
 *     aguacate, mango, guayaba, mora, lulo, tomate de árbol, papaya) y escoger
 *     uno cambia la ficha.
 *   - Cada ficha tiene sus secciones: propagación, siembra/distancias,
 *     luz+agua+piso térmico, plagas (grafo), poda, cosecha/poscosecha.
 *   - Plagas: manejo agroecológico + guard anti-receta química (sin dosis de
 *     veneno) + dosis de abono marcada como "dato en camino".
 *   - Avisos especiales: cuarentena HLB en cítricos, virus PRSV en papaya.
 *   - Puentes: onBack; enlaces a biopreparados, sanidad y agente.
 *   - Créditos de fotos con atribución (cumplimiento CC).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import FrutalesScreen from './FrutalesScreen';
import { CREDITOS_FOTOS_FRUTALES, FRUTALES } from '../../data/frutalesFinca';

afterEach(() => cleanup());

const escoger = (id) => fireEvent.click(screen.getByTestId(`frutal-tile-${id}`));

describe('FrutalesScreen — selector y portada', () => {
  it('muestra todos los frutales de la finca en el selector', () => {
    render(<FrutalesScreen onBack={() => {}} onNavigate={() => {}} />);
    expect(screen.getByTestId('frutales-screen')).toBeTruthy();
    for (const id of ['citricos', 'aguacate', 'mango', 'guayaba', 'mora', 'lulo', 'tomate_arbol', 'papaya']) {
      expect(screen.getByTestId(`frutal-tile-${id}`)).toBeTruthy();
    }
  });

  it('arranca mostrando la ficha del primer frutal (cítricos)', () => {
    render(<FrutalesScreen onBack={() => {}} />);
    expect(screen.getByTestId('frutal-ficha-citricos')).toBeTruthy();
  });

  it('el botón volver llama onBack', () => {
    const onBack = vi.fn();
    render(<FrutalesScreen onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onBack).toHaveBeenCalled();
  });
});

describe('FrutalesScreen — escoger un frutal cambia la ficha', () => {
  it('al escoger mango, muestra su ficha y no la de cítricos', () => {
    render(<FrutalesScreen onBack={() => {}} />);
    escoger('mango');
    expect(screen.getByTestId('frutal-ficha-mango')).toBeTruthy();
    expect(screen.queryByTestId('frutal-ficha-citricos')).toBeNull();
  });
});

describe('FrutalesScreen — la ficha trae todas las secciones de cultivo', () => {
  it('aguacate: propagación, siembra, clima, plagas, poda y cosecha', () => {
    render(<FrutalesScreen onBack={() => {}} />);
    escoger('aguacate');
    const ficha = screen.getByTestId('frutal-ficha-aguacate');
    for (const sec of ['ficha-propagacion', 'ficha-siembra', 'ficha-clima', 'ficha-plagas', 'ficha-poda', 'ficha-cosecha']) {
      expect(within(ficha).getByTestId(sec)).toBeTruthy();
    }
  });
});

describe('FrutalesScreen — plagas groundeadas del grafo, sin veneno', () => {
  it('cítricos muestra minador y mosca de la fruta con manejo biológico', () => {
    render(<FrutalesScreen onBack={() => {}} />);
    const plagas = screen.getByTestId('ficha-plagas');
    expect(within(plagas).getByTestId('plaga-minador')).toBeTruthy();
    expect(within(plagas).getByTestId('plaga-mosca-fruta')).toBeTruthy();
    // el manejo es biológico (biocontroles del grafo), no dosis de veneno
    expect(within(plagas).getAllByText(/Manejo sin veneno/i).length).toBeGreaterThan(0);
  });

  it('la dosis de abono NO se inventa: se marca como dato en camino', () => {
    render(<FrutalesScreen onBack={() => {}} />);
    const ficha = screen.getByTestId('frutal-ficha-citricos');
    expect(within(ficha).getByTestId('slot-grounded-pendiente')).toBeTruthy();
  });

  it('el guard anti-receta química está presente en el mundo', () => {
    render(<FrutalesScreen onBack={() => {}} />);
    const nota = screen.getByTestId('frutales-nota-sin-quimicos');
    expect(nota.textContent).toMatch(/no encontrará dosis de veneno/i);
  });
});

describe('FrutalesScreen — avisos de sanidad especiales', () => {
  it('cítricos advierte del HLB / dragón amarillo como enfermedad de reporte', () => {
    render(<FrutalesScreen onBack={() => {}} />);
    const aviso = screen.getByTestId('frutal-cuarentena');
    expect(aviso.textContent).toMatch(/HLB|drag[oó]n amarillo/i);
    expect(aviso.textContent).toMatch(/ICA/);
  });

  it('papaya advierte del virus del anillo (PRSV)', () => {
    render(<FrutalesScreen onBack={() => {}} />);
    escoger('papaya');
    const aviso = screen.getByTestId('frutal-virus');
    expect(aviso.textContent).toMatch(/virus|anillo|PRSV/i);
  });
});

describe('FrutalesScreen — puentes y créditos', () => {
  it('enlaza a biopreparados y a "mi mata está enferma"', () => {
    const onNavigate = vi.fn();
    render(<FrutalesScreen onBack={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('frutales-ir-biopreparados'));
    expect(onNavigate).toHaveBeenCalledWith('biopreparados', { back: 'dashboard' });
    fireEvent.click(screen.getByTestId('frutales-ir-sanidad'));
    expect(onNavigate).toHaveBeenCalledWith('sanidad_sintoma');
  });

  it('el agente queda presente en el pie con un prompt del frutal', () => {
    const onNavigate = vi.fn();
    render(<FrutalesScreen onBack={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('frutales-preguntar-agente'));
    expect(onNavigate).toHaveBeenCalledWith('agente', expect.objectContaining({
      prefilledPrompt: expect.stringMatching(/cuido mi/i),
    }));
  });

  it('las fotos traen atribución (cumplimiento CC): autor, licencia y fuente Commons', () => {
    expect(CREDITOS_FOTOS_FRUTALES.length).toBeGreaterThanOrEqual(8);
    for (const cr of CREDITOS_FOTOS_FRUTALES) {
      expect(cr.autor).toBeTruthy();
      expect(cr.licencia).toBeTruthy();
      expect(cr.fuenteUrl).toMatch(/^https?:\/\/([a-z0-9-]+\.)*wikimedia\.org\//);
    }
  });

  it('cada frutal del manifiesto tiene foto, plagas y ciclo groundeado', () => {
    for (const f of FRUTALES) {
      expect(f.foto).toBeTruthy();
      expect(Array.isArray(f.plagas) && f.plagas.length).toBeGreaterThan(0);
      expect(f.cosecha.fuente).toBeTruthy();
      // cada plaga trae al menos un biocontrol (arista CONTROLS del grafo)
      for (const p of f.plagas) {
        expect(p.biocontrol.length).toBeGreaterThan(0);
      }
    }
  });
});
