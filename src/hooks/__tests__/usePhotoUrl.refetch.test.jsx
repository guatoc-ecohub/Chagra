import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { usePhotoUrl } from '../usePhotoUrl';

/**
 * Tests para UX-20 (#286): bug operador 2026-05-27 — "se registra la
 * fresa ya tiene toda la información pero no veo en el índice de plantas
 * la foto a pesar de que ya la tiene".
 *
 * Verifica que el hook usePhotoUrl re-fetchea cuando recibe el evento
 * global `chagra:photo:saved` y el detail.assetId / detail.speciesSlug
 * coincide con sus params.
 */

let callCount = 0;
let mockBlobUrl = 'blob://placeholder.svg';

vi.mock('../../services/photoService', () => ({
  getPhotoUrl: vi.fn(async () => {
    callCount += 1;
    // Primera llamada → placeholder. Siguientes → blob (simula que la
    // foto recién se guardó entre la primera y la segunda invocación).
    if (callCount === 1) {
      return { url: '/placeholder-species.svg', source: 'placeholder' };
    }
    return { url: mockBlobUrl, source: 'user', revoke: () => {} };
  }),
  getPhotoById: vi.fn(),
}));

function Probe({ assetId, speciesSlug }) {
  const photo = usePhotoUrl({ assetId, speciesSlug });
  if (photo.loading) return <span data-testid="probe">loading</span>;
  return <span data-testid="probe">{photo.source}:{photo.url}</span>;
}

beforeEach(() => {
  callCount = 0;
});

describe('UX-20 — usePhotoUrl re-fetch on chagra:photo:saved', () => {
  it('re-fetchea cuando assetId matchea el evento global', async () => {
    render(<Probe assetId="asset-123" speciesSlug="" />);
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toMatch(/placeholder/));

    act(() => {
      window.dispatchEvent(new CustomEvent('chagra:photo:saved', {
        detail: { assetId: 'asset-123' },
      }));
    });

    await waitFor(() => expect(screen.getByTestId('probe').textContent).toMatch(/user:blob/));
    expect(callCount).toBe(2);
  });

  it('re-fetchea cuando speciesSlug matchea el evento global', async () => {
    render(<Probe speciesSlug="fragaria" assetId="" />);
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toMatch(/placeholder/));

    act(() => {
      window.dispatchEvent(new CustomEvent('chagra:photo:saved', {
        detail: { speciesSlug: 'fragaria' },
      }));
    });

    await waitFor(() => expect(screen.getByTestId('probe').textContent).toMatch(/user:blob/));
  });

  it('NO re-fetchea cuando el evento es de otro asset', async () => {
    render(<Probe assetId="asset-123" speciesSlug="" />);
    await waitFor(() => expect(callCount).toBeGreaterThanOrEqual(1));
    const before = callCount;

    act(() => {
      window.dispatchEvent(new CustomEvent('chagra:photo:saved', {
        detail: { assetId: 'asset-OTHER' },
      }));
    });

    // Pequeña pausa para que cualquier re-render espurio termine.
    await new Promise((r) => setTimeout(r, 30));
    expect(callCount).toBe(before);
  });

  it('NO re-fetchea cuando el evento no trae detail', async () => {
    render(<Probe assetId="asset-123" speciesSlug="" />);
    await waitFor(() => expect(callCount).toBeGreaterThanOrEqual(1));
    const before = callCount;

    act(() => {
      window.dispatchEvent(new Event('chagra:photo:saved'));
    });

    await new Promise((r) => setTimeout(r, 30));
    expect(callCount).toBe(before);
  });
});
