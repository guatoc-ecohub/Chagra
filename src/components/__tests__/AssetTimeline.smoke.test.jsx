import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AssetTimeline from '../AssetTimeline';

const mockedLogs = Array.from({ length: 1000 }, (_, i) => ({
  id: `log-${i}`,
  type: 'log--input',
  timestamp: 1760000000 - i * 86400,
  attributes: { name: `Evento ${i + 1}`, notes: { value: `Nota ${i + 1}` } },
  relationships: {},
}));

vi.mock('../../store/useLogStore', () => ({
  useLogStore: (selector) => selector({
    logsByAsset: { 'asset-1': mockedLogs },
    isSyncing: false,
    loadLogsForAsset: vi.fn(),
  }),
}));

vi.mock('../../hooks/usePhotoUrl', () => ({
  usePhotoUrl: () => ({ loading: false, url: null, source: 'none' }),
}));

vi.mock('../../services/payloadService', () => ({
  savePayload: vi.fn(),
}));

vi.mock('../../utils/aiInferenceParser', () => ({
  parseAiInference: () => null,
  parseAiReview: () => null,
}));

vi.mock('react-virtuoso', () => ({
  Virtuoso: ({ data, itemContent }) => (
    <div>{data.slice(0, 30).map((item, idx) => <div key={item.id}>{itemContent(idx, item)}</div>)}</div>
  ),
}));

describe('AssetTimeline smoke', () => {
  it('renderiza timeline con 1000 logs sin bloquear', () => {
    render(<AssetTimeline assetId="asset-1" />);
    expect(screen.getByText('Línea de tiempo')).toBeTruthy();
    expect(screen.getByText('Evento 1')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cargar más meses' })).toBeTruthy();
  });
});
