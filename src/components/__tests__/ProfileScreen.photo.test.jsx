/**
 * ProfileScreen.photo.test.jsx — subida de foto de perfil del operador
 * (feature recuperada 2026-06-15).
 *
 * Verifica que la pestaña Perfil:
 *   - muestra el botón "Agregar foto" y el placeholder (ícono) cuando no hay foto,
 *   - al elegir un archivo, llama operatorPhotoService.setOperatorPhotoFromFile
 *     y renderiza la imagen resultante,
 *   - ofrece "Quitar foto" que llama removeOperatorPhotoLocal.
 *
 * El servicio se mockea: aquí probamos el cableado de la UI, no el canvas/red
 * (eso lo cubre operatorPhotoService.test.js).
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';

const setOperatorPhotoFromFile = vi.fn();
const removeOperatorPhotoLocal = vi.fn();
let mockPhoto = '';

vi.mock('../../services/operatorPhotoService', () => ({
  getOperatorPhoto: () => mockPhoto,
  setOperatorPhotoFromFile: (...a) => setOperatorPhotoFromFile(...a),
  removeOperatorPhotoLocal: (...a) => removeOperatorPhotoLocal(...a),
}));

import ProfileScreen from '../ProfileScreen';

describe('ProfileScreen — foto de perfil', () => {
  beforeEach(() => {
    localStorage.clear();
    mockPhoto = '';
    setOperatorPhotoFromFile.mockReset();
    removeOperatorPhotoLocal.mockReset();
  });

  test('sin foto muestra el botón "Agregar foto" (placeholder)', () => {
    render(<ProfileScreen onBack={() => {}} onHome={() => {}} />);
    const btn = screen.getByTestId('profile-photo-button');
    expect(btn).toHaveAttribute('aria-label', 'Agregar foto de perfil');
    expect(screen.queryByTestId('profile-photo-img')).toBeNull();
  });

  // BUG 3 (operador 2026-06-15): el input NO debe forzar la cámara. Sin el
  // atributo `capture`, el SO ofrece cámara + galería/archivos. `accept` sigue
  // restringido a imágenes.
  test('el input de foto NO tiene `capture` (ofrece cámara + galería)', () => {
    render(<ProfileScreen onBack={() => {}} onHome={() => {}} />);
    const input = screen.getByTestId('profile-photo-input');
    expect(input).not.toHaveAttribute('capture');
    expect(input).toHaveAttribute('accept', 'image/*');
    expect(input).toHaveAttribute('type', 'file');
  });

  test('al elegir un archivo de imagen llama al servicio y renderiza la foto', async () => {
    const dataUrl = 'data:image/jpeg;base64,ZZZ';
    setOperatorPhotoFromFile.mockResolvedValue(dataUrl);

    render(<ProfileScreen onBack={() => {}} onHome={() => {}} />);
    const input = screen.getByTestId('profile-photo-input');
    const file = new File([new Uint8Array(4)], 'yo.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(setOperatorPhotoFromFile).toHaveBeenCalledTimes(1));
    expect(setOperatorPhotoFromFile).toHaveBeenCalledWith(file);

    const img = await screen.findByTestId('profile-photo-img');
    expect(img).toHaveAttribute('src', dataUrl);
    // Tras tener foto, el botón pasa a "Cambiar foto".
    expect(screen.getByTestId('profile-photo-button')).toHaveAttribute('aria-label', 'Cambiar foto de perfil');
  });

  test('rechaza un archivo que no es imagen sin llamar al servicio', async () => {
    render(<ProfileScreen onBack={() => {}} onHome={() => {}} />);
    const input = screen.getByTestId('profile-photo-input');
    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/no parece una imagen/i),
    );
    expect(setOperatorPhotoFromFile).not.toHaveBeenCalled();
  });

  test('con foto existente ofrece "Quitar foto" que llama al servicio', () => {
    mockPhoto = 'data:image/jpeg;base64,EXISTE';
    render(<ProfileScreen onBack={() => {}} onHome={() => {}} />);
    expect(screen.getByTestId('profile-photo-img')).toBeInTheDocument();

    const quitar = screen.getByRole('button', { name: /quitar foto/i });
    fireEvent.click(quitar);
    expect(removeOperatorPhotoLocal).toHaveBeenCalledTimes(1);
    // Tras quitar, el placeholder vuelve.
    expect(screen.queryByTestId('profile-photo-img')).toBeNull();
  });
});
