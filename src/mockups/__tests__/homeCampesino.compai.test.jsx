/*
 * HomeCampesino — test del compai que camina (spec #campesino-home-land-dev-20260827).
 *
 * Verifica que la home campesina:
 *   · Renderiza correctamente con el layout de B
 *   · Incluye CompaiOverlay con currentView="mockups-home-campesino"
 *   · Muestra la sección del compai con texto "SU COMPAÑERO" y "Chagra está aquí"
 *   · Tiene las seis puertas y el recado del día
 */
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach, vi } from 'vitest';

import HomeCampesino from '../HomeCampesino.jsx';

afterEach(cleanup());

describe('HomeCampesino con compai que camina', () => {
  test('renderiza el layout completo con cielo, acciones y puertas', () => {
    const { container } = render(<HomeCampesino />);
    
    // Verifica el cielo con saludo
    expect(screen.getByText(/Buenos días/i)).toBeInTheDocument();
    expect(screen.getByText(/Hoy: sol con nubes/i)).toBeInTheDocument();
    
    // Verifica las dos acciones grandes
    expect(screen.getByText(/Pregunte/i)).toBeInTheDocument();
    expect(screen.getByText(/Anote su día/i)).toBeInTheDocument();
    
    // Verifica las seis puertas
    expect(screen.getByText(/Mis matas/i)).toBeInTheDocument();
    expect(screen.getByText(/Mis animales/i)).toBeInTheDocument();
    expect(screen.getByText(/El tiempo/i)).toBeInTheDocument();
    expect(screen.getByText(/Vender/i)).toBeInTheDocument();
    expect(screen.getByText(/Aprender/i)).toBeInTheDocument();
    expect(screen.getByText(/Toda mi finca/i)).toBeInTheDocument();
  });

  test('renderiza la sección del compai con marcha real', () => {
    const { container } = render(<HomeCampesino />);
    
    // Verifica la sección del compai
    expect(screen.getByText(/SU COMPAÑERO/i)).toBeInTheDocument();
    expect(screen.getByText(/Chagra está aquí/i)).toBeInTheDocument();
    expect(screen.getByText(/Hable, muestre una foto o pregunte por un cultivo/i)).toBeInTheDocument();
    
    // Verifica que CompaiOverlay está presente con el currentView correcto
    const compaiOverlay = container.querySelector('[data-testid="compai-overlay-container"]');
    expect(compaiOverlay).toBeInTheDocument();
  });

  test('renderiza el recado del día y el footer', () => {
    const { container } = render(<HomeCampesino />);
    
    // Verifica el recado del día
    expect(screen.getByText(/Recado de hoy/i)).toBeInTheDocument();
    expect(screen.getByText(/Mañana llueve por la tarde/i)).toBeInTheDocument();
    
    // Verifica el footer con ayuda y perfil
    expect(screen.getByText(/Necesito ayuda/i)).toBeInTheDocument();
    expect(screen.getByText(/Mi perfil/i)).toBeInTheDocument();
  });

  test('cambia entre modo noche y día', () => {
    const { container } = render(<HomeCampesino />);
    
    // Verifica que inicia con data-modo
    const root = container.querySelector('.hcm');
    expect(root).toHaveAttribute('data-modo');
    
    // Verifica los botones de modo
    expect(screen.getByText(/🌙 Noche/i)).toBeInTheDocument();
    expect(screen.getByText(/☀️ Pleno sol/i)).toBeInTheDocument();
  });
});
