/**
 * MontanaMundosCampesino — smoke: la v4 campesina (la versión elegida por la
 * auditoría visual 2026-07-10) monta sin crashear en jsdom con sus puertas
 * principales vivas. La cinematografía fina (parallax, viaje, llegada) se
 * valida en vivo; aquí solo el contrato de montaje y navegación básica.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import MontanaMundosCampesino from '../MontanaMundosCampesino';

afterEach(() => cleanup());

describe('MontanaMundosCampesino — smoke (v4 campesina)', () => {
  it('monta sin crash: viewport, cédula de la finca, voz y zoom presentes', () => {
    render(<MontanaMundosCampesino />);
    expect(screen.getByTestId('mm2-viewport')).toBeInTheDocument();
    expect(screen.getByTestId('mm4-cedula')).toBeInTheDocument();
    expect(screen.getByTestId('mm4-voz')).toBeInTheDocument();
    expect(screen.getByTestId('mm2-zoom-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('mm4-resalte')).toBeInTheDocument();
  });

  it('los mundos están montados, incluido "La cosecha" en el troje (restaurado)', () => {
    render(<MontanaMundosCampesino />);
    expect(screen.getByTestId('mm2-mundo-cosecha')).toBeInTheDocument();
    expect(screen.getByTestId('mm2-mundo-papa')).toBeInTheDocument();
    expect(screen.getByTestId('mm2-mundo-corral')).toBeInTheDocument();
    expect(screen.getByTestId('mm2-mundo-casa')).toBeInTheDocument();
  });

  it('el zoom alterna a la montaña completa y el mensaje-bandera está', () => {
    render(<MontanaMundosCampesino />);
    fireEvent.click(screen.getByTestId('mm2-zoom-toggle'));
    expect(screen.getByText('⭐ SU FINCA ESTÁ AQUÍ')).toBeInTheDocument();
    expect(screen.getByTestId('mm2-zoom-toggle').textContent).toContain('Volver a mi finca');
  });

  it('tocar un mundo de su piso muestra el aviso honesto del mockup', () => {
    render(<MontanaMundosCampesino />);
    fireEvent.click(screen.getByTestId('mm2-mundo-papa'));
    expect(screen.getByTestId('mm2-aviso')).toBeInTheDocument();
  });
});
