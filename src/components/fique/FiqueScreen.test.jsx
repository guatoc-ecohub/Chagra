/**
 * FiqueScreen — mundo "El fique y las fibras" (photo-forward, 5 estaciones).
 *
 * Contrato cubierto:
 *   - Las 5 estaciones son navegables (planta+ladera, manejo, desfibrado, usos,
 *     bagazo+jugo) y cada una muestra su contenido groundeado.
 *   - La planta: Furcraea andina + por qué cuida la ladera (control de erosión).
 *   - Manejo: propagación por hijos/bulbillos + plagas honestas (grafo sin
 *     aristas de fique → "dato en camino", no se inventan).
 *   - Desfibrado: los pasos en orden (corte→...→hilado) + aviso de que el jugo
 *     contamina.
 *   - Usos: empaques/cabuya/artesanía + jugo bioinsumo + guard anti-receta.
 *   - Bagazo y jugo: el aviso ambiental (el jugo NO va al río) + puentes a agua
 *     y compost.
 *   - Puentes: onBack; enlaces a salud_suelo, mercado, agua, compost, agente.
 *   - Créditos de fotos con atribución (cumplimiento CC).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import FiqueScreen from './FiqueScreen';
import { CREDITOS_FOTOS_FIQUE } from '../../data/fiqueFinca';

afterEach(() => cleanup());

const irAEstacion = (id) => fireEvent.click(screen.getByTestId(`estacion-tab-${id}`));

describe('FiqueScreen — navegación y portada', () => {
  it('arranca en la estación de la planta y muestra las 5 pestañas', () => {
    render(<FiqueScreen onBack={() => {}} onNavigate={() => {}} />);
    expect(screen.getByTestId('fique-screen')).toBeTruthy();
    expect(screen.getByTestId('estacion-planta')).toBeTruthy();
    for (const id of ['planta', 'manejo', 'desfibrado', 'usos', 'aprovechar']) {
      expect(screen.getByTestId(`estacion-tab-${id}`)).toBeTruthy();
    }
  });

  it('el botón volver llama onBack', () => {
    const onBack = vi.fn();
    render(<FiqueScreen onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onBack).toHaveBeenCalled();
  });
});

describe('FiqueScreen — la planta y la ladera (grounded catálogo)', () => {
  it('muestra Furcraea andina y por qué el fique cuida la ladera (erosión)', () => {
    render(<FiqueScreen onBack={() => {}} />);
    // El nombre científico aparece en el hero y en la línea de fuente: basta con
    // que esté presente (grounded del catálogo).
    expect(screen.getAllByText(/Furcraea andina/i).length).toBeGreaterThanOrEqual(1);
    const ladera = screen.getByTestId('fique-ladera');
    expect(ladera.textContent).toMatch(/erosión/i);
    expect(screen.getByTestId('ladera-raiz')).toBeTruthy();
  });
});

describe('FiqueScreen — cría y manejo (plagas honestas, sin inventar)', () => {
  it('se propaga de hijos/bulbillos y las plagas del grafo van como dato en camino', () => {
    const onNavigate = vi.fn();
    render(<FiqueScreen onBack={() => {}} onNavigate={onNavigate} />);
    irAEstacion('manejo');
    expect(screen.getByTestId('manejo-propagacion')).toBeTruthy();
    // El grafo no tiene plagas de fique: se marca dato en camino, no se inventan.
    const sanidad = screen.getByTestId('fique-sanidad');
    expect(sanidad.querySelector('[data-testid="slot-grounded-pendiente"]')).toBeTruthy();
    fireEvent.click(screen.getByTestId('fique-ir-suelo'));
    expect(onNavigate).toHaveBeenCalledWith('salud_suelo');
  });
});

describe('FiqueScreen — el desfibrado (penca → fibra)', () => {
  it('muestra los pasos en orden e incluye el aviso de que el jugo contamina', () => {
    render(<FiqueScreen onBack={() => {}} />);
    irAEstacion('desfibrado');
    for (const id of ['corte', 'desfibrado', 'lavado', 'secado', 'hilado']) {
      expect(screen.getByTestId(`desfibrado-${id}`)).toBeTruthy();
    }
    const paso = screen.getByTestId('desfibrado-desfibrado');
    expect(paso.textContent).toMatch(/quebrada|contaminante/i);
  });
});

describe('FiqueScreen — usos y cultura (guard anti-receta)', () => {
  it('muestra empaques/cabuya/artesanía y no da dosis inventadas', () => {
    const onNavigate = vi.fn();
    render(<FiqueScreen onBack={() => {}} onNavigate={onNavigate} />);
    irAEstacion('usos');
    for (const id of ['empaques', 'cabuya', 'artesania', 'bioinsumo']) {
      expect(screen.getByTestId(`uso-${id}`)).toBeTruthy();
    }
    const nota = screen.getByTestId('fique-nota-sin-recetas');
    expect(nota.textContent).toMatch(/no encontrará dosis inventadas/i);
    fireEvent.click(screen.getByTestId('fique-ir-mercado'));
    expect(onNavigate).toHaveBeenCalledWith('mercado');
  });
});

describe('FiqueScreen — bagazo y jugo (no contaminar el agua)', () => {
  it('trae el aviso ambiental y enlaza a agua y compost', () => {
    const onNavigate = vi.fn();
    render(<FiqueScreen onBack={() => {}} onNavigate={onNavigate} />);
    irAEstacion('aprovechar');
    const aviso = screen.getByTestId('fique-aviso-agua');
    expect(aviso.textContent).toMatch(/no va al río/i);
    expect(screen.getByTestId('aprovechar-abono')).toBeTruthy();
    fireEvent.click(screen.getByTestId('fique-ir-agua'));
    expect(onNavigate).toHaveBeenCalledWith('agua');
    fireEvent.click(screen.getByTestId('fique-ir-compost'));
    expect(onNavigate).toHaveBeenCalledWith('compost');
  });
});

describe('FiqueScreen — puente al agente y créditos de fotos', () => {
  it('el agente queda presente en el pie con prompt de fique/ladera', () => {
    const onNavigate = vi.fn();
    render(<FiqueScreen onBack={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('fique-preguntar-agente'));
    expect(onNavigate).toHaveBeenCalledWith('agente', expect.objectContaining({
      prefilledPrompt: expect.stringMatching(/fique|ladera/i),
    }));
  });

  it('las fotos traen atribución (cumplimiento CC): todas con autor, licencia y fuente', () => {
    expect(CREDITOS_FOTOS_FIQUE.length).toBeGreaterThanOrEqual(4);
    for (const cr of CREDITOS_FOTOS_FIQUE) {
      expect(cr.autor).toBeTruthy();
      expect(cr.licencia).toBeTruthy();
      expect(cr.fuenteUrl).toMatch(/^https?:\/\/([a-z0-9-]+\.)*wikimedia\.org\//);
    }
  });
});
