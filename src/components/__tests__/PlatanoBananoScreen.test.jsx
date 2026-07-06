/**
 * PlatanoBananoScreen — mini-app "Plátano y banano" (mundo Cultivos y semillas).
 *
 * Contrato cubierto:
 *   - Hub: el gancho ("La mata que nunca se acaba") + los cuatro pilares navegables.
 *   - Pilar Variedades y la mata: aparecen variedades campesinas (Hartón,
 *     Dominico, banano/guineo) y la sucesión madre-hijo-nieto con el deshije.
 *   - Pilar Siembra y compañía: la calculadora de densidad (geometría exacta)
 *     produce matas/ha; aparece el asocio con café/cacao y el hambre de potasio.
 *   - Pilar Sigatoka y picudo: reconocer + manejo agroecológico; el biocontrol
 *     del picudo (Beauveria) sin dosis inventada → "Dato en camino".
 *   - Pilar Cosecha y aprovechamiento: el punto de corte y el puente al mundo del
 *     estiércol/abono (enlaza a la vista 'estiercol').
 *   - onBack desde el hub; volver desde un pilar regresa al hub sin llamar onBack.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import PlatanoBananoScreen from '../PlatanoBananoScreen';

afterEach(() => cleanup());

// El nombre accesible de un pilar es "Título" + descripción pegados; anclamos al
// inicio para no chocar con otros botones que mencionen la misma palabra.
const irA = (nombre) => fireEvent.click(screen.getByRole('button', { name: nombre }));

describe('PlatanoBananoScreen — hub', () => {
  it('muestra el gancho y los cuatro pilares', () => {
    render(<PlatanoBananoScreen onBack={() => {}} onNavigate={() => {}} />);
    expect(screen.getByText(/La mata que nunca se acaba/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Variedades y la mata/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Siembra y compañía/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Sigatoka y picudo/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Cosecha y aprovechamiento/i })).toBeTruthy();
  });

  it('botón volver llama onBack desde el hub', () => {
    const onBack = vi.fn();
    render(<PlatanoBananoScreen onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: /Volver/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it('enlaza al mundo del abono (estiércol) para cerrar el ciclo del pseudotallo', () => {
    const onNavigate = vi.fn();
    render(<PlatanoBananoScreen onBack={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /Del corral al abono/i }));
    expect(onNavigate).toHaveBeenCalledWith('estiercol');
  });

  it('enlaza al diagnóstico de sanidad existente (no reimplementa el motor)', () => {
    const onNavigate = vi.fn();
    render(<PlatanoBananoScreen onBack={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /Mi mata está enferma/i }));
    expect(onNavigate).toHaveBeenCalledWith('sanidad_sintoma');
  });
});

describe('PlatanoBananoScreen — pilar Variedades y la mata', () => {
  it('muestra variedades campesinas y la sucesión madre-hijo-nieto', () => {
    render(<PlatanoBananoScreen onBack={() => {}} />);
    irA(/^Variedades y la mata/i);
    expect(screen.getAllByText(/Hartón/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Dominico hartón/i)).toBeTruthy();
    expect(screen.getByText(/Banano \/ guineo criollo/i)).toBeTruthy();
    // La sucesión: los tres roles
    expect(screen.getByText(/^Madre$/i)).toBeTruthy();
    expect(screen.getByText(/^Hijo$/i)).toBeTruthy();
    expect(screen.getByText(/^Nieto$/i)).toBeTruthy();
    // El deshije (aparece en el título y en el cuerpo)
    expect(screen.getAllByText(/El deshije/i).length).toBeGreaterThan(0);
  });
});

describe('PlatanoBananoScreen — pilar Siembra (calculadora determinista)', () => {
  it('la calculadora de densidad calcula matas por hectárea (geometría exacta)', () => {
    render(<PlatanoBananoScreen onBack={() => {}} />);
    irA(/^Siembra y compañía/i);
    // 3 × 3 m por defecto → 10.000 ÷ 9 = 1.111 matas/ha
    expect(screen.getByText(/matas \/ ha/i)).toBeTruthy();
    expect(screen.getByText('1.111')).toBeTruthy();
    // Cambiar a 4 × 4 m → 10.000 ÷ 16 = 625 matas/ha
    fireEvent.change(screen.getByLabelText(/Distancia entre matas en metros/i), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText(/Distancia entre surcos en metros/i), { target: { value: '4' } });
    expect(screen.getByText('625')).toBeTruthy();
  });

  it('muestra el asocio con café/cacao y el hambre de potasio', () => {
    render(<PlatanoBananoScreen onBack={() => {}} />);
    irA(/^Siembra y compañía/i);
    expect(screen.getByText(/hambre de potasio/i)).toBeTruthy();
    expect(screen.getByText(/^Café$/i)).toBeTruthy();
    expect(screen.getByText(/^Cacao$/i)).toBeTruthy();
  });
});

describe('PlatanoBananoScreen — pilar Sigatoka y picudo', () => {
  it('presenta las dos amenazas con su nombre científico', () => {
    render(<PlatanoBananoScreen onBack={() => {}} />);
    irA(/^Sigatoka y picudo/i);
    expect(screen.getByText(/Mycosphaerella fijiensis/i)).toBeTruthy();
    expect(screen.getByText(/Cosmopolites sordidus/i)).toBeTruthy();
  });

  it('el biocontrol del picudo (Beauveria) sin dosis va como dato en camino', () => {
    render(<PlatanoBananoScreen onBack={() => {}} />);
    irA(/^Sigatoka y picudo/i);
    expect(screen.getAllByText(/Beauveria bassiana/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Dato en camino/i).length).toBeGreaterThan(0);
  });
});

describe('PlatanoBananoScreen — pilar Cosecha y aprovechamiento', () => {
  it('muestra el punto de corte y el aprovechamiento del pseudotallo', () => {
    render(<PlatanoBananoScreen onBack={() => {}} />);
    irA(/^Cosecha y aprovechamiento/i);
    expect(screen.getByText(/El punto de corte/i)).toBeTruthy();
    expect(screen.getByText(/Pseudotallo picado = abono/i)).toBeTruthy();
  });
});

describe('PlatanoBananoScreen — navegación', () => {
  it('vuelve al hub con el botón volver desde un pilar (sin llamar onBack)', () => {
    const onBack = vi.fn();
    render(<PlatanoBananoScreen onBack={onBack} />);
    irA(/^Sigatoka y picudo/i);
    fireEvent.click(screen.getByRole('button', { name: /Volver/i }));
    expect(within(document.body).getByText(/La mata que nunca se acaba/i)).toBeTruthy();
    expect(onBack).not.toHaveBeenCalled();
  });
});
