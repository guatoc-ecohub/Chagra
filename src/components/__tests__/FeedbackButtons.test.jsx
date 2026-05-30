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
        edges: [],
      });
    });
  });

  it('A-15 (#248): forwardea los edges del mensaje al payload de feedback', async () => {
    vi.mocked(feedbackService.hasConsent).mockReturnValue(true);
    vi.mocked(feedbackService.sendFeedback).mockResolvedValue(true);

    const edges = [
      { species_id: 'coffea_arabica', edge_type: 'COMPATIBLE_WITH', target_id: 'inga_edulis' },
    ];
    render(<FeedbackButtons {...defaultProps} edges={edges} />);

    fireEvent.click(screen.getByTitle('Esta respuesta fue útil'));

    await waitFor(() => {
      expect(feedbackService.sendFeedback).toHaveBeenCalledWith(
        expect.objectContaining({ edges }),
      );
    });
  });

  // UX-8 (#288) 2026-05-27: ambos pulgares envían en 1-click. El comentario
  // es opt-in tras enviar — se abre con "Agregar detalle", no al pulsar 👎.
  it('debe ofrecer caja de comentario opt-in tras enviar feedback (thumbs down)', async () => {
    vi.mocked(feedbackService.hasConsent).mockReturnValue(true);
    vi.mocked(feedbackService.sendFeedback).mockResolvedValue(true);

    render(<FeedbackButtons {...defaultProps} />);

    const thumbsDownButton = screen.getByTitle('Esta respuesta necesita mejorar');
    fireEvent.click(thumbsDownButton);

    // El 👎 envía de inmediato; aparece el agradecimiento + "Agregar detalle".
    const addDetailButton = await screen.findByText('Agregar detalle');
    fireEvent.click(addDetailButton);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/Cuéntanos qué falta o está incorrecto/)
      ).toBeInTheDocument();
    });
  });

  it('debe enriquecer el feedback con comentario opt-in', async () => {
    vi.mocked(feedbackService.hasConsent).mockReturnValue(true);
    vi.mocked(feedbackService.sendFeedback).mockResolvedValue(true);

    render(<FeedbackButtons {...defaultProps} />);

    // Click en thumbs down → envía 1-click.
    const thumbsDownButton = screen.getByTitle('Esta respuesta necesita mejorar');
    fireEvent.click(thumbsDownButton);

    // Abrir la caja opt-in.
    const addDetailButton = await screen.findByText('Agregar detalle');
    fireEvent.click(addDetailButton);

    const textarea = await screen.findByPlaceholderText(
      /Cuéntanos qué falta o está incorrecto/
    );
    fireEvent.change(textarea, { target: { value: 'Falta información sobre el riego' } });

    // Click en enviar (reenvía enriquecido con el comentario).
    const sendButton = screen.getByText('Enviar');
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(feedbackService.sendFeedback).toHaveBeenCalledWith({
        prompt: '¿Qué es el café?',
        response: 'El café es una planta...',
        thumb: 'down',
        comment: 'Falta información sobre el riego',
        edges: [],
      });
    });
  });

  it('debe cerrar la caja de comentario al hacer clic en Listo', async () => {
    vi.mocked(feedbackService.hasConsent).mockReturnValue(true);
    vi.mocked(feedbackService.sendFeedback).mockResolvedValue(true);

    render(<FeedbackButtons {...defaultProps} />);

    // Click en thumbs down → envía 1-click.
    const thumbsDownButton = screen.getByTitle('Esta respuesta necesita mejorar');
    fireEvent.click(thumbsDownButton);

    // Abrir la caja opt-in.
    const addDetailButton = await screen.findByText('Agregar detalle');
    fireEvent.click(addDetailButton);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(/Cuéntanos qué falta o está incorrecto/)
      ).toBeInTheDocument();
    });

    // Click en Listo (cierra la caja).
    const doneButton = screen.getByText('Listo');
    fireEvent.click(doneButton);

    await waitFor(() => {
      expect(
        screen.queryByPlaceholderText(/Cuéntanos qué falta o está incorrecto/)
      ).not.toBeInTheDocument();
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
