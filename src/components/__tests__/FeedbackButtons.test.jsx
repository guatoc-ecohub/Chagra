/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FeedbackButtons from '../FeedbackButtons';
import * as feedbackService from '../../services/feedbackService';

// Mock del feedbackService
vi.mock('../../services/feedbackService', () => ({
  sendFeedback: vi.fn(),
  hasConsent: vi.fn(),
}));

describe('FeedbackButtons', () => {
  const mockOnConsentNeeded = vi.fn();
  const mockOnFeedbackSent = vi.fn();
  const defaultProps = {
    prompt: '¿Qué es el café?',
    response: 'El café es una planta...',
    onConsentNeeded: mockOnConsentNeeded,
    onFeedbackSent: mockOnFeedbackSent,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe renderizar los botones de thumbs', () => {
    vi.mocked(feedbackService.hasConsent).mockReturnValue(true);

    render(<FeedbackButtons {...defaultProps} />);

    // Buscar botones por sus títulos
    const thumbsUpButton = screen.getByTitle('Esta respuesta fue útil');
    const thumbsDownButton = screen.getByTitle('Esta respuesta necesita mejorar');

    expect(thumbsUpButton).toBeInTheDocument();
    expect(thumbsDownButton).toBeInTheDocument();
  });

  it('debe llamar onConsentNeeded si no hay consentimiento', async () => {
    vi.mocked(feedbackService.hasConsent).mockReturnValue(false);

    render(<FeedbackButtons {...defaultProps} />);

    const thumbsUpButton = screen.getByTitle('Esta respuesta fue útil');
    fireEvent.click(thumbsUpButton);

    expect(mockOnConsentNeeded).toHaveBeenCalledTimes(1);
  });

  it('debe enviar feedback con thumb up al hacer clic', async () => {
    vi.mocked(feedbackService.hasConsent).mockReturnValue(true);
    vi.mocked(feedbackService.sendFeedback).mockResolvedValue(true);

    render(<FeedbackButtons {...defaultProps} />);

    const thumbsUpButton = screen.getByTitle('Esta respuesta fue útil');
    fireEvent.click(thumbsUpButton);

    await waitFor(() => {
      expect(feedbackService.sendFeedback).toHaveBeenCalledWith({
        prompt: '¿Qué es el café?',
        response: 'El café es una planta...',
        thumb: 'up',
        comment: null,
      });
    });
  });

  it('debe mostrar caja de comentario al hacer clic en thumbs down', async () => {
    vi.mocked(feedbackService.hasConsent).mockReturnValue(true);

    render(<FeedbackButtons {...defaultProps} />);

    const thumbsDownButton = screen.getByTitle('Esta respuesta necesita mejorar');
    fireEvent.click(thumbsDownButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Describe qué falta/)).toBeInTheDocument();
    });
  });

  it('debe enviar feedback con comentario', async () => {
    vi.mocked(feedbackService.hasConsent).mockReturnValue(true);
    vi.mocked(feedbackService.sendFeedback).mockResolvedValue(true);

    render(<FeedbackButtons {...defaultProps} />);

    // Click en thumbs down
    const thumbsDownButton = screen.getByTitle('Esta respuesta necesita mejorar');
    fireEvent.click(thumbsDownButton);

    // Esperar a que aparezca la caja de comentario
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Describe qué falta/)).toBeInTheDocument();
    });

    // Escribir comentario
    const textarea = screen.getByPlaceholderText(/Describe qué falta/);
    fireEvent.change(textarea, { target: { value: 'Falta información sobre el riego' } });

    // Click en enviar
    const sendButton = screen.getByText('Enviar');
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(feedbackService.sendFeedback).toHaveBeenCalledWith({
        prompt: '¿Qué es el café?',
        response: 'El café es una planta...',
        thumb: 'down',
        comment: 'Falta información sobre el riego',
      });
    });
  });

  it('debe cancelar comentario al hacer clic en Cancelar', async () => {
    vi.mocked(feedbackService.hasConsent).mockReturnValue(true);

    render(<FeedbackButtons {...defaultProps} />);

    // Click en thumbs down
    const thumbsDownButton = screen.getByTitle('Esta respuesta necesita mejorar');
    fireEvent.click(thumbsDownButton);

    // Esperar a que aparezca la caja de comentario
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Describe qué falta/)).toBeInTheDocument();
    });

    // Click en cancelar
    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);

    // Verificar que la caja de comentario desapareció
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/Describe qué falta/)).not.toBeInTheDocument();
    });
  });

  it('debe mostrar mensaje de gracias después de enviar feedback exitoso', async () => {
    vi.mocked(feedbackService.hasConsent).mockReturnValue(true);
    vi.mocked(feedbackService.sendFeedback).mockResolvedValue(true);

    render(<FeedbackButtons {...defaultProps} />);

    const thumbsUpButton = screen.getByTitle('Esta respuesta fue útil');
    fireEvent.click(thumbsUpButton);

    await waitFor(() => {
      expect(screen.getByText(/Gracias por tu feedback/)).toBeInTheDocument();
    });
  });

  it('no debe hacer nada si ya se envió feedback', async () => {
    vi.mocked(feedbackService.hasConsent).mockReturnValue(true);
    vi.mocked(feedbackService.sendFeedback).mockResolvedValue(true);

    render(<FeedbackButtons {...defaultProps} />);

    // Primer click
    const thumbsUpButton = screen.getByTitle('Esta respuesta fue útil');
    fireEvent.click(thumbsUpButton);

    await waitFor(() => {
      expect(feedbackService.sendFeedback).toHaveBeenCalledTimes(1);
    });

    // Segundo click (debe ignorarse)
    fireEvent.click(thumbsUpButton);

    // Verificar que no se llamó nuevamente
    expect(feedbackService.sendFeedback).toHaveBeenCalledTimes(1);
  });
});
