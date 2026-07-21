import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SeedingLog from '../SeedingLog';

/**
 * Tests para UX-25 (#286): operador 2026-05-27 — "en siembras el botón
 * agregar y tomar foto debe ser igual al de especies invasoras".
 *
 * Verifica que SeedingLog ahora usa PhotoCaptureField (mismo componente
 * que InvasiveObservationLog) — vs el manual inline grid que tenía
 * antes.
 */

// Mock pesado de servicios externos no relevantes al smoke.
vi.mock('../../services/payloadService', () => ({
  savePayload: vi.fn().mockResolvedValue({ success: true, message: 'ok' }),
}));
vi.mock('../../services/photoService', () => ({
  savePhoto: vi.fn(),
}));

// Mock de PhotoCaptureField para verificar que SeedingLog lo monta
// con los props correctos (sin necesidad de simular cámara real).
vi.mock('../PhotoCaptureField', () => ({
  default: (props) => (
    <div
      data-testid="photo-capture-field-stub"
      data-label={props.label}
      data-has-onphoto={typeof props.onPhoto === 'function' ? 'yes' : 'no'}
      data-has-onremove={typeof props.onRemove === 'function' ? 'yes' : 'no'}
    />
  ),
}));

describe('UX-25 — SeedingLog usa PhotoCaptureField', () => {
  it('monta PhotoCaptureField (mismo componente que invasoras)', () => {
    render(<SeedingLog onBack={() => {}} onSave={() => {}} initialData={null} />);
    expect(screen.getByTestId('photo-capture-field-stub')).toBeInTheDocument();
  });

  it('pasa onPhoto y onRemove como callbacks', () => {
    render(<SeedingLog onBack={() => {}} onSave={() => {}} initialData={null} />);
    const stub = screen.getByTestId('photo-capture-field-stub');
    expect(stub.dataset.hasOnphoto).toBe('yes');
    expect(stub.dataset.hasOnremove).toBe('yes');
  });

  it('pasa label "Foto del cultivo"', () => {
    render(<SeedingLog onBack={() => {}} onSave={() => {}} initialData={null} />);
    const stub = screen.getByTestId('photo-capture-field-stub');
    expect(stub.dataset.label).toBe('Foto del cultivo');
  });

  it('NO renderiza los antiguos botones manuales "Tomar foto" / "Subir desde galería"', () => {
    render(<SeedingLog onBack={() => {}} onSave={() => {}} initialData={null} />);
    // El botón manual antiguo tenía esos textos directos. Como ahora
    // PhotoCaptureField está stubeado, no deben aparecer en el render
    // de SeedingLog directamente.
    expect(screen.queryByText('Subir desde galería')).toBeNull();
    // El "Tomar foto" puede aparecer en otros contextos; verificamos
    // específicamente que NO hay un button con onClick directo a un
    // cameraInputRef (el patrón viejo).
    const buttons = screen.queryAllByRole('button');
    const oldStyle = buttons.find((b) =>
      b.textContent?.includes('Subir desde galería') ||
      b.querySelector('input[type="file"]'),
    );
    expect(oldStyle).toBeUndefined();
  });
});
