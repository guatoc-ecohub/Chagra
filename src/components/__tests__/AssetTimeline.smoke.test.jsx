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
  // AssetTimeline también consume GroupedVirtuoso (queue/036 — agrupado por mes).
  // Mock equivalente: itera grupos y renderiza items por grupo, limitado a 60
  // visibles para que la prueba "1000 logs sin bloquear" siga siendo barata.
  GroupedVirtuoso: ({ groupCounts = [], groupContent, itemContent, data, components }) => {
    const elements = [];
    let itemIdx = 0;
    groupCounts.forEach((count, groupIdx) => {
      if (groupContent) elements.push(<div key={`g-${groupIdx}`}>{groupContent(groupIdx)}</div>);
      for (let i = 0; i < count && elements.length < 60; i++) {
        // itemContent del componente real recibe (index, log) o (index, groupIndex, item)
        // dependiendo de la API; AssetTimeline usa `renderLog = (index, log) => ...`.
        // Pasamos el log desde data[] si está definido.
        const log = Array.isArray(data) ? data[itemIdx] : undefined;
        elements.push(<div key={`i-${itemIdx}`}>{itemContent ? itemContent(itemIdx, log) : null}</div>);
        itemIdx++;
      }
    });
    // Footer (canLoadMoreMonths → botón) lo añade GroupedVirtuoso via components prop.
    const Footer = components?.Footer;
    if (Footer) elements.push(<Footer key="footer" />);
    return <div>{elements}</div>;
  },
}));

describe('AssetTimeline smoke', () => {
  it('renderiza timeline con 1000 logs sin bloquear', () => {
    render(<AssetTimeline assetId="asset-1" />);
    expect(screen.getByText('Línea de tiempo')).toBeTruthy();
    expect(screen.getByText('Evento 1')).toBeTruthy();
    // Botón actual del component (queue/036 timeline): "CARGAR MESES ANTERIORES".
    // Si AssetTimeline renderea < 2 meses con menos data, canLoadMoreMonths puede
    // ser false → no hay botón. El smoke test prioriza "no bloquea con 1000 logs",
    // así que tolerar ambos: existencia del botón ó indicador de fin de timeline.
    const loadMoreBtn = screen.queryByRole('button', { name: /cargar meses/i });
    const finRayos = screen.queryByText(/sin más eventos|fin de timeline/i);
    expect(loadMoreBtn || finRayos).toBeTruthy();
  });
});
