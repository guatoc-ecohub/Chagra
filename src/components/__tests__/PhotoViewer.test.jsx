import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PhotoViewer from '../PhotoViewer';

describe('PhotoViewer', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'fullscreenElement', {
      writable: true,
      configurable: true,
      value: null,
    });
    document.documentElement.requestFullscreen = vi.fn().mockResolvedValue();
    document.exitFullscreen = vi.fn().mockResolvedValue();
  });

  afterEach(() => {
    delete document.documentElement.requestFullscreen;
    delete document.exitFullscreen;
  });

  it('renderiza imagen con botón de cinema mode', () => {
    render(<PhotoViewer src="test.jpg" alt="Test" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', 'test.jpg');
    expect(screen.getByLabelText('Modo presentación')).toBeInTheDocument();
  });

  it('toggle cinema mode abre overlay con foto', () => {
    render(<PhotoViewer src="test.jpg" alt="Test" />);
    fireEvent.click(screen.getByLabelText('Modo presentación'));
    expect(screen.getByLabelText('Salir de modo presentación')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', 'test.jpg');
  });

  it('botón close en overlay cierra cinema mode', () => {
    render(<PhotoViewer src="test.jpg" alt="Test" />);
    fireEvent.click(screen.getByLabelText('Modo presentación'));
    expect(screen.getByLabelText('Salir de modo presentación')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Salir de modo presentación'));
    expect(screen.queryByLabelText('Salir de modo presentación')).not.toBeInTheDocument();
  });
});
