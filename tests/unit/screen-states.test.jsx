/**
 * screen-states.test.jsx — Tests de estados de carga / vacio / error.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScreenLoadingStatus from '../../src/components/common/ScreenLoadingStatus.jsx';

describe('ScreenLoadingStatus — loading/empty/error', () => {
  it('muestra spinner cuando isLoading=true', () => {
    render(<ScreenLoadingStatus isLoading />);
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('muestra estado vacio cuando isEmpty=true', () => {
    render(<ScreenLoadingStatus isEmpty emptyTitle="Sin datos" emptyDescription="No hay registros todavia." />);
    expect(screen.getByText('Sin datos')).toBeInTheDocument();
    expect(screen.getByText('No hay registros todavia.')).toBeInTheDocument();
  });

  it('muestra icono PackageOpen en estado vacio', () => {
    const { container } = render(<ScreenLoadingStatus isEmpty emptyTitle="Vacio" />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('muestra mensaje de error cuando hasError=true', () => {
    render(<ScreenLoadingStatus hasError errorMessage="Fallo la conexion al servidor." />);
    expect(screen.getByText('Algo fallo')).toBeInTheDocument();
    expect(screen.getByText('Fallo la conexion al servidor.')).toBeInTheDocument();
  });

  it('muestra icono AlertTriangle en error', () => {
    const { container } = render(<ScreenLoadingStatus hasError errorMessage="Error." />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('muestra boton reintentar con onRetry', () => {
    render(<ScreenLoadingStatus hasError errorMessage="Error." onRetry={() => {}} />);
    expect(screen.getByText('Intentar de nuevo')).toBeInTheDocument();
  });

  it('NO muestra boton reintentar sin onRetry', () => {
    render(<ScreenLoadingStatus hasError errorMessage="Error." />);
    expect(screen.queryByText('Intentar de nuevo')).not.toBeInTheDocument();
  });

  it('retorna null sin estado activo', () => {
    const { container } = render(<ScreenLoadingStatus />);
    expect(container.firstChild).toBeNull();
  });
});

describe('Pantallas — exports verificados', () => {
  it('WorkerDashboard', async () => {
    const m = await import('../../src/components/WorkerDashboard.jsx');
    expect(typeof m.WorkerDashboard).toBe('function');
  });
  it('InventoryAuditDashboard', async () => {
    const m = await import('../../src/components/InventoryAuditDashboard.jsx');
    expect(typeof m.default).toBe('function');
  });
  it('CaseStudyScreen', async () => {
    const m = await import('../../src/components/CaseStudyScreen.jsx');
    expect(typeof m.default).toBe('function');
  });
  it('ExtensionistaScreen', async () => {
    const m = await import('../../src/components/ExtensionistaScreen.jsx');
    expect(typeof m.default).toBe('function');
  });
});
