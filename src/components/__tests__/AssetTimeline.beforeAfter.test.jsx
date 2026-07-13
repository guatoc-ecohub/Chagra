import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AssetTimeline from '../AssetTimeline';

// Dos logs [PHOTO_ATTACHMENT] (formato real de useAssetStore.attachPhotoToLog) en
// timestamps distintos: la más vieja y la más nueva deben alimentar el slider
// BeforeAfterPhoto (comparación de evolución de la planta).
const photoLogOld = {
  id: 'log-photo-old',
  type: 'log--task',
  timestamp: 1700000000, // más vieja
  attributes: {
    name: 'Foto adjunta a evento',
    notes: {
      value: [
        '[PHOTO_ATTACHMENT]',
        'target_log_id: log-seeding-1',
        'photo_ref: 101',
        'attached_at: 2023-11-14T00:00:00.000Z',
      ].join('\n'),
    },
  },
  relationships: {},
};

const photoLogNew = {
  id: 'log-photo-new',
  type: 'log--task',
  timestamp: 1760000000, // más reciente
  attributes: {
    name: 'Foto adjunta a evento',
    notes: {
      value: [
        '[PHOTO_ATTACHMENT]',
        'target_log_id: log-seeding-2',
        'photo_ref: 202',
        'attached_at: 2025-10-09T00:00:00.000Z',
      ].join('\n'),
    },
  },
  relationships: {},
};

vi.mock('../../store/useLogStore', () => {
  // AssetTimeline en modo DEV inyecta 1000 logs sintéticos vía
  // useLogStore.setState() cuando logs.length < 100 (stress test de la
  // virtualización) — el mock necesita exponer `.setState` como el store real
  // de zustand para no romper ese efecto con pocos logs de fixture.
  const useLogStore = (selector) => selector({
    logsByAsset: {
      'asset-1': [photoLogNew, photoLogOld],
      'asset-single-photo': [photoLogOld],
    },
    isSyncing: false,
    loadLogsForAsset: vi.fn(),
  });
  useLogStore.setState = vi.fn();
  return { useLogStore };
});

// Resuelve URLs distintas según el photoId pedido, simulando el hook real
// (usePhotoUrl) que envuelve photoService.getPhotoById.
vi.mock('../../hooks/usePhotoUrl', () => ({
  usePhotoUrl: ({ photoId } = /** @type {any} */ ({})) => {
    if (photoId === 101) return { loading: false, url: 'blob://foto-vieja', source: 'specific' };
    if (photoId === 202) return { loading: false, url: 'blob://foto-nueva', source: 'specific' };
    return { loading: false, url: null, source: 'missing' };
  },
}));

vi.mock('../../services/payloadService', () => ({
  savePayload: vi.fn(),
}));

vi.mock('../../utils/aiInferenceParser', () => ({
  parseAiInference: () => null,
  parseAiReview: () => null,
}));

vi.mock('react-virtuoso', () => ({
  GroupedVirtuoso: ({ groupCounts = [], groupContent, itemContent, data, components }) => {
    const elements = [];
    let itemIdx = 0;
    groupCounts.forEach((count, groupIdx) => {
      if (groupContent) elements.push(<div key={`g-${groupIdx}`}>{groupContent(groupIdx)}</div>);
      for (let i = 0; i < count; i++) {
        const log = Array.isArray(data) ? data[itemIdx] : undefined;
        elements.push(<div key={`i-${itemIdx}`}>{itemContent ? itemContent(itemIdx, log) : null}</div>);
        itemIdx++;
      }
    });
    const Footer = components?.Footer;
    if (Footer) elements.push(<Footer key="footer" />);
    return <div>{elements}</div>;
  },
}));

describe('AssetTimeline — comparación antes/después (BeforeAfterPhoto)', () => {
  it('renderiza el slider antes/después usando la foto más vieja y la más nueva del activo', () => {
    render(<AssetTimeline assetId="asset-1" />);

    expect(screen.getByTestId('asset-timeline-before-after')).toBeTruthy();
    expect(screen.getByText('Evolución de la planta')).toBeTruthy();
    // BeforeAfterPhoto renderiza el hint "Desliza para comparar" cuando ambas
    // fotos (before/after) resuelven con URL.
    expect(screen.getByText('Desliza para comparar')).toBeTruthy();
  });

  it('no renderiza la comparación si solo hay una foto adjunta', () => {
    render(<AssetTimeline assetId="asset-single-photo" />);
    expect(screen.queryByTestId('asset-timeline-before-after')).toBeNull();
  });
});
