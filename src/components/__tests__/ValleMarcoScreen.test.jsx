import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, test, vi } from 'vitest';
import ValleMarcoScreen from '../ValleMarcoScreen.jsx';

describe('ValleMarcoScreen', () => {
  test('monta el documento canónico sin mezclar el Three del mockup', () => {
    localStorage.setItem('compai:companero', 'oso-baston');
    render(<ValleMarcoScreen onExit={vi.fn()} />);

    expect(screen.getByTitle('Valle 3D de Guatoc')).toHaveAttribute(
      'src',
      '/valle/index.html?compai=oso-baston',
    );
  });

  test('volver a mi finca llama al dashboard caller', () => {
    const onExit = vi.fn();
    render(<ValleMarcoScreen onExit={onExit} />);
    fireEvent.click(screen.getByTestId('valle-marco-salir'));
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
