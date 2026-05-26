/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FeedbackConsentModal from '../FeedbackConsentModal';
import * as feedbackService from '../../services/feedbackService';

// Mock del feedbackService
vi.mock('../../services/feedbackService', () => ({
  saveConsent: vi.fn(),
}));

describe('FeedbackConsentModal', () => {
  const mockOnAccept = vi.fn();
  const mockOnDecline = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no debe renderizar nada si isOpen es false', () => {
    render(
      <FeedbackConsentModal
        isOpen={false}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
      />
    );

    expect(screen.queryByText('Mejorar Chagra')).not.toBeInTheDocument();
  });

  it('debe renderizar el modal si isOpen es true', () => {
    render(
      <FeedbackConsentModal
        isOpen={true}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
      />
    );

    expect(screen.getByText('Mejorar Chagra')).toBeInTheDocument();
    expect(screen.getByText(/Aceptas que guardemos tu solicitud/)).toBeInTheDocument();
  });

  it('debe llamar saveConsent con true al aceptar', async () => {
    
    render(
      <FeedbackConsentModal
        isOpen={true}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
      />
    );

    const acceptButton = screen.getByText('Acepto');
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(feedbackService.saveConsent).toHaveBeenCalledWith(true);
    });
  });

  it('debe llamar onAccept después de guardar consentimiento', async () => {
    vi.mocked(feedbackService.saveConsent).mockImplementation(() => {});
    
    render(
      <FeedbackConsentModal
        isOpen={true}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
      />
    );

    const acceptButton = screen.getByText('Acepto');
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(mockOnAccept).toHaveBeenCalledTimes(1);
    });
  });

  it('debe llamar saveConsent con false al rechazar', async () => {
    
    render(
      <FeedbackConsentModal
        isOpen={true}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
      />
    );

    const declineButton = screen.getByText('No, gracias');
    fireEvent.click(declineButton);

    await waitFor(() => {
      expect(feedbackService.saveConsent).toHaveBeenCalledWith(false);
    });
  });

  it('debe llamar onDecline después de rechazar', async () => {
    vi.mocked(feedbackService.saveConsent).mockImplementation(() => {});
    
    render(
      <FeedbackConsentModal
        isOpen={true}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
      />
    );

    const declineButton = screen.getByText('No, gracias');
    fireEvent.click(declineButton);

    await waitFor(() => {
      expect(mockOnDecline).toHaveBeenCalledTimes(1);
    });
  });

  it('debe cerrar al hacer clic en el backdrop', async () => {
    vi.mocked(feedbackService.saveConsent).mockImplementation(() => {});

    render(
      <FeedbackConsentModal
        isOpen={true}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
      />
    );

    // El backdrop es el elemento con className "absolute inset-0 bg-black/60"
    const backdrop = document.querySelector('.absolute.inset-0');
    fireEvent.click(backdrop);

    await waitFor(() => {
      expect(feedbackService.saveConsent).toHaveBeenCalledWith(false);
      expect(mockOnDecline).toHaveBeenCalledTimes(1);
    });
  });

  it('debe mostrar la lista de qué incluye el consentimiento', () => {
    render(
      <FeedbackConsentModal
        isOpen={true}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
      />
    );

    expect(screen.getByText(/Tu pregunta y la respuesta del agente/)).toBeInTheDocument();
    expect(screen.getByText(/Tu evaluación \(👍 o 👎\)/)).toBeInTheDocument();
    expect(screen.getByText(/Comentario opcional si es 👎/)).toBeInTheDocument();
  });

  it('debe mostrar el texto de aclaración sobre cuando aplica el consentimiento', () => {
    render(
      <FeedbackConsentModal
        isOpen={true}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
      />
    );

    expect(screen.getByText(/Este consentimiento solo aplica cuando das feedback/)).toBeInTheDocument();
  });
});
