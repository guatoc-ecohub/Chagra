import React from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach, vi } from 'vitest';

import HiloVidaVista from '../HiloVidaVista.jsx';
import {
  fraseCielo,
  fraseAngelita,
  frasePendientes,
  componerHilo,
} from '../_hiloVida.js';

afterEach(() => cleanup());

describe('HiloVidaVista — composición de la prosa (puras)', () => {
  test('sin dato de cielo → lo neutro, nunca clima inventado', () => {
    expect(fraseCielo(undefined)).toMatch(/tranquila en el valle/);
    expect(fraseCielo({ luz: 'martes' })).toMatch(/tranquila en el valle/);
  });

  test('cielo real → luz + condición del vocabulario del framework', () => {
    expect(fraseCielo({ luz: 'amanecer', condicion: 'soleado' }))
      .toBe('Su finca amanece bajo un cielo despejado.');
    expect(fraseCielo({ luz: 'noche', condicion: 'lluvia' }))
      .toBe('Es de noche en su finca mientras cae la lluvia.');
    // condición desconocida → solo la luz (sin fabricar)
    expect(fraseCielo({ luz: 'dia' })).toBe('El día avanza sobre su finca.');
  });

  test('Angelita: ánimo real + lugar; energía baja añade la nota', () => {
    expect(fraseAngelita('sereno', 0.8, 'el cafetal'))
      .toBe('La abeja Angelita ronda el cafetal con calma.');
    expect(fraseAngelita('sediento', 0.2)).toMatch(/guardando energía/);
    expect(fraseAngelita('descansa', 0.1)).not.toMatch(/guardando energía/);
    // ánimo desconocido cae a sereno
    expect(fraseAngelita('zzz', 1)).toMatch(/con calma/);
  });

  test('pendientes: undefined omite; [] dice paz; 1 y N narran', () => {
    expect(frasePendientes(undefined)).toBeNull();
    expect(frasePendientes([])).toBe('Por ahora no hay pendientes que atender.');
    expect(frasePendientes([{ tema: 'sanidad' }]))
      .toBe('Hay algo que atender en sanidad.');
    expect(frasePendientes([{ tema: 'sanidad' }, { tema: 'riego' }]))
      .toBe('Hay 2 asuntos que esperan su mirada: sanidad y riego.');
  });

  test('el hilo completo mantiene el orden cielo → abeja → pendientes', () => {
    const frases = componerHilo({
      cielo: { luz: 'amanecer', condicion: 'soleado' },
      animo: 'sereno',
      energia: 0.8,
      lugar: 'el cafetal',
      pendientes: [{ tema: 'sanidad' }],
    });
    expect(frases).toHaveLength(3);
    expect(frases[0]).toMatch(/amanece/);
    expect(frases[1]).toMatch(/Angelita/);
    expect(frases[2]).toMatch(/sanidad/);
  });
});

describe('HiloVidaVista — accesibilidad y acciones', () => {
  test('la narración vive en una región aria-live cortés y atómica', () => {
    const { container } = render(<HiloVidaVista cielo="" lugar="" pendientes={[]} onIrA={() => {}} />);
    const texto = container.querySelector('[aria-live="polite"]');
    expect(texto).toBeInTheDocument();
    expect(texto).toHaveAttribute('aria-atomic', 'true');
    // sin props: describe lo neutro, no inventa
    expect(texto.textContent).toMatch(/tranquila en el valle/);
  });

  test('pendiente con view + onIrA → botón real que re-rutea', () => {
    const onIrA = vi.fn();
    const { getByRole } = render(
      <HiloVidaVista
        cielo=""
        lugar=""
        pendientes={[{ id: 'a1', tema: 'sanidad', view: 'sanidad' }]}
        onIrA={onIrA}
      />,
    );
    const boton = getByRole('button', { name: /Atender sanidad/ });
    fireEvent.click(boton);
    expect(onIrA).toHaveBeenCalledWith('sanidad', expect.objectContaining({ id: 'a1' }));
  });

  test('sin onIrA no hay botones (la capa es solo narrativa)', () => {
    // #2349 hizo accionables los pendientes cuando existe el callback. Esta
    // variante valida el contrato complementario omitiendo la prop.
    const { queryByRole } = render(
      <HiloVidaVista cielo="" lugar="" pendientes={[{ tema: 'riego', view: 'agua' }]} />,
    );
    expect(queryByRole('button')).toBeNull();
  });

  test('reducedMotion marca el data-attr que apaga el pulso', () => {
    const { container } = render(<HiloVidaVista cielo="" lugar="" pendientes={[]} onIrA={() => {}} reducedMotion />);
    expect(container.querySelector('.hilo-vida')).toHaveAttribute('data-reduced', 'true');
  });
});
